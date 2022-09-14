import base64
import os.path

import airstory.dao.images
from airstory.utils import get_dynamodb_connection, \
    publish_user_message, init_response, logger, permissions_map
from airstory.utils.cloudinary import cloudinary_service
from airstory.utils.elasticsearch import elasticsearch_service


class BaseHandler:
    def __init__(self):
        self.dynamodb = get_dynamodb_connection()
        self.crud = airstory.dao.images.Crud(self.dynamodb)
        self.user_crud = airstory.dao.users.Crud(self.dynamodb)
        
        self.users = {}
        
    def _lookup_user_project(self, user_id, project_id):
        
        user_project = airstory.dao.user_projects.Item()
        
        user_project.user_id = user_id
        user_project.project_id = project_id
        
        return airstory.dao.user_projects.Crud(self.dynamodb).retrieve(user_project)
    
    def _lookup_image(self, ref_id, image_id):
        image = airstory.dao.images.Item()
        
        image.ref_id = ref_id
        image.id = image_id
        
        return self.crud.retrieve(image)
    
    async def _lookup_user(self, user_id, users=None):
        if not user_id:
            user = airstory.dao.users.Item()
            
            user.avatar = 'https://www.gravatar.com/avatar/1'
            user.first_name = 'Unknown'
            
            return user
        elif users != None and user_id in users:
            return users[user_id]
        else: 
            user = airstory.dao.users.Item()
            
            user.id = user_id
            
            user = await self.user_crud.retrieve(user)
            
            if user:
                if users != None:
                    users[user_id] = user
            else:
                user = airstory.dao.users.Item()
                
                user.avatar = 'https://www.gravatar.com/avatar/1'
                user.first_name = 'Unknown'
            
            return user
        
    def _lookup_users(self, project_id):
        return airstory.dao.user_projects.Crud(self.dynamodb).retrieve_all_by_project_id(project_id)

    async def _valid_user(self, user_id, ref_id, min_level=1, image=None):
        if user_id:
            if user_id == ref_id:
                return True
            else:
                user_project = await self._lookup_user_project(user_id, ref_id)
    
                if user_project:
                    level = permissions_map[user_project.permissions]
                    
                    if image:
                        if image.user_id == user_id and level >= min_level:
                            return True
                        elif image.state == 'locked' and level != 5:
                            return False
                    
                    return level >= min_level
        
        return False

class ImageHandler(BaseHandler): 
    async def delete(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            image = await self._lookup_image(key['ref_id'], key['id'])
            
            is_valid_user = await self._valid_user(state.user_id, key['ref_id'], min_level=3, image=image)
            
            if image:
                if is_valid_user:
                    batch = airstory.dao.BatchWrite(self.dynamodb)
                    
                    cascade_image = airstory.dao.cascade.Image(self.dynamodb, batch)
                    await cascade_image.delete(image)
                    
                    completed = await batch.run_batch()
                    if completed:
                        response['code'] = 200
                    
                        ref_type = image.ref_id[:1]
                        
                        if ref_type == 'p':
                            user_projects = await self._lookup_users(image.ref_id)
                            for user in user_projects:
                                await publish_user_message(user.user_id, response)
                        elif ref_type == 'u':
                            await publish_user_message(image.ref_id, response)
                    else:
                        response['code'] = 500
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('ImageHandler:delete')
            response['code'] = 500
        
        return response
    
    async def post(self, state, json):
        key = json['key']
        item = json['message']

        response = init_response(json)
        
        try:
            is_valid_user = await self._valid_user(state.user_id, key['ref_id'], min_level=3)
            if is_valid_user:
                unique_id = self.crud.generate_id()
                    
                fname = os.path.splitext(item['name'])[0]       
                cname = unique_id + '/' + fname    
                
                uploaded_info = await cloudinary_service.copy(item['id'] + '/' + fname, cname) 
                
                image = airstory.dao.images.Item()
            
                image.ref_id = key['ref_id']
                image.id = unique_id
                image.name = item['name']
                image.created = self.crud.timestamp()
                image.height = uploaded_info['height']
                image.width = uploaded_info['width']
                image.user_id = state.user_id
                image.caption = item.get('caption')
                image.state = item.get('state')
                
                es_result = await elasticsearch_service.put('airstory', 'images', image.id, image.to_dict())
                es_success = es_result.code == 201
                
                if es_success:
                    #TODO: if this fails, delete entry in cloudinary
                    completed = await self.crud.create(image)
                    if completed:
                        response['code'] = 200
                        response['key']['id'] = image.id
                        response['message'] = image.to_dict()
                        response['attributes']['copied_ref_id'] = item['ref_id']
                        response['attributes']['copied_id'] = item['id']
                        
                        user = await self._lookup_user(image.user_id)
                            
                        response['message']['avatar'] = user.avatar
                        response['message']['first_name'] = user.first_name
                        response['message']['last_name'] = user.last_name
                        
                        ref_type = image.ref_id[:1]
                        
                        if ref_type == 'p':
                            user_projects = await self._lookup_users(image.ref_id)
                            for user in user_projects:
                                await publish_user_message(user.user_id, response)
                        elif ref_type == 'u':
                            await publish_user_message(image.ref_id, response)
                    else:
                        await elasticsearch_service.delete('airstory', 'images', image.id)
                        response['code'] = 500
                else:
                    response['code'] = 500
            else:
                response['code'] = 401
        except: #IGNORE:bare-except
            logger.exception('ImageHandler:post')
            response['code'] = 500
            
        return response
    
    async def put(self, state, json):
        key = json['key']
        item = json['message']

        response = init_response(json)
    
        try:
            image = await self._lookup_image(key['ref_id'], key['id'])
            is_valid_user = await self._valid_user(state.user_id, key['ref_id'], min_level=3, image=image)
            
            if image:
                if is_valid_user:
                    image.caption = item['caption']
                    image.state = item['state']
                    
                    es_result = await elasticsearch_service.put('airstory', 'images', image.id, image.to_dict())
                    es_success = es_result.code == 200 or es_result.code == 201
                    
                    if es_success:
                        #TODO: if this fails, must undo what was done in elasticsearch
                        completed = await self.crud.update(image)
                        if completed:
                            response['code'] = 200
                            response['message'] = image.to_dict()
                            
                            user = await self._lookup_user(image.user_id)
                                
                            response['message']['avatar'] = user.avatar
                            response['message']['first_name'] = user.first_name
                            response['message']['last_name'] = user.last_name
                            
                            ref_type = image.ref_id[:1]
                            
                            if ref_type == 'p':
                                user_projects = await self._lookup_users(image.ref_id)
                                for user in user_projects:
                                    await publish_user_message(user.user_id, response)
                            elif ref_type == 'u':
                                await publish_user_message(image.ref_id, response)
                        else:
                            response['code'] = 500 
                    else:
                        response['code'] = 500     
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('ImageHandler:put')
            response['code'] = 500
        
        return response
    
class ImagesHandler(BaseHandler):
    def _lookup_images(self, ref_id, attr):
        if attr and 'search' in attr and attr['search']:
            start = 0
            
            if 'start' in attr:
                start = attr['start']
                
            return self.crud.search([ref_id], attr['search'], start)
        else:
            #Need to figure out pagination
            return self.crud.paginate_all_by_ref_id(ref_id, attr)
      
    async def get(self, state, json):
        key = json['key']
        attr = json['attributes']

        response = init_response(json)
        
        try:
            if key:
                valid_user_future = self._valid_user(state.user_id, key['ref_id'])
                images, next_start = await self._lookup_images(key['ref_id'], attr)
                
                is_valid_user = await valid_user_future
                    
                if images:
                    if is_valid_user:
                        response['code'] = 200
                        
                        users = {}
                        image_list = []
                        
                        for image in images:
                            image_item = image.to_dict()
                    
                            user = await self._lookup_user(image.user_id, users)
                                
                            image_item['avatar'] = user.avatar
                            image_item['first_name'] = user.first_name
                            image_item['last_name'] = user.last_name
                                    
                            image_list.append(image_item)
                            
                        response['message'] = {}
                        response['message']['images'] = image_list
                        response['message']['next_start'] = next_start
                    else:
                        response['code'] = 401
                else:
                    response['code'] = 404
            else:
                if state.user_id:
                    ref_ids = []
                    #TODO: Move to batch
                    ref_ids.append(state.user_id)
                    
                    user_projects = await airstory.dao.user_projects.Crud(self.dynamodb).retrieve_all_by_user_id(state.user_id)
                    for user_project in user_projects:
                        ref_ids.append(user_project.project_id)
                        
                    search = None
                    start = 0
                    
                    if attr:
                        search = attr.get('search')
                        start = attr.get('start', 0)
                        
                    images, next_start = await self.crud.search(ref_ids, search, start) 
                        
                    if images:
                        response['code'] = 200
                    
                        users = {}
                        image_list = []
                        
                        for image in images:
                            image_item = image.to_dict()
                    
                            user = await self._lookup_user(image.user_id, users)
                                
                            image_item['avatar'] = user.avatar
                            image_item['first_name'] = user.first_name
                            image_item['last_name'] = user.last_name
                                    
                            image_list.append(image_item)
                            
                        response['message'] = {}
                        response['message']['images'] = image_list
                        response['message']['next_start'] = next_start
                    else:
                        response['code'] = 404
                else:
                    response['code'] = 401
                    
        except: #IGNORE:bare-except
            logger.exception('ImagesHandler:get')
            response['code'] = 500
            
        return response
    
    async def post(self, state, json):
        key = json['key']
        files = json['message']

        response = init_response(json)
        
        try:
            is_valid_user = await self._valid_user(state.user_id, key['ref_id'], min_level=3)
            if is_valid_user:
                
                users = {}
                images = []
                
                batch = airstory.dao.BatchWrite(self.dynamodb)
                
                for fileinfo in files: 
                    unique_id = self.crud.generate_id()
                    
                    fname = os.path.splitext(fileinfo['filename'])[0]       
                    cname = unique_id + '/' + fname    
                    
                    body = fileinfo['body']
                    
                    if isinstance(body, str) and body.startswith('data:image/png;base64'):
                        data_uri = body
                    else:
                        b64 = base64.standard_b64encode(body)
                        data_uri = 'data:' + fileinfo['content_type'] + ';base64,' + b64.decode('utf-8')
                    
                    uploaded_info = await cloudinary_service.upload(cname, data_uri) 
                    
                    image = airstory.dao.images.Item()
                
                    image.ref_id = key['ref_id']
                    image.id = unique_id
                    image.name = fileinfo['filename']
                    image.created = self.crud.timestamp()
                    image.height = uploaded_info['height']
                    image.width = uploaded_info['width']
                    image.user_id = state.user_id
                    image.caption = uploaded_info.get('caption')
                    image.state = uploaded_info.get('state')
                    
                    if 'caption' in fileinfo:
                        image.caption = fileinfo['caption']
                    
                    batch.add_batch_write(image)
                    
                    es_result = await elasticsearch_service.put('airstory', 'images', image.id, image.to_dict())
                    es_success = es_result.code == 201
                    
                    if not es_success:
                        raise Exception('Saving image to ES failed')
                    
                    image_item = image.to_dict()
                    
                    user = await self._lookup_user(image.user_id, users)
                        
                    image_item['avatar'] = user.avatar
                    image_item['first_name'] = user.first_name
                    image_item['last_name'] = user.last_name
            
                    images.append(image_item)
                          
                #TODO: Delete images if this fails
                completed = await batch.run_batch()
                if completed:
                    response['code'] = 204
                    response['message'] = {'images': images}
                    
                    ref_type = image.ref_id[:1]
                    
                    if ref_type == 'p':
                        user_projects = await self._lookup_users(image.ref_id)
                        for user in user_projects:
                            await publish_user_message(user.user_id, response)
                    elif ref_type == 'u':
                        await publish_user_message(image.ref_id, response)
                else:
                    response['code'] = 500
            else:
                response['code'] = 401
        except: #IGNORE:bare-except
            logger.exception('ImagesHandler:post')
            response['code'] = 500
            
        return response
    