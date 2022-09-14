import hashlib

import airstory.dao.cascade
import airstory.dao.projects
import airstory.dao.user_projects
from airstory.utils import get_dynamodb_connection, \
    subscribe_to_project, init_response, publish_user_message, logger, \
    permissions_map
from airstory.utils.elasticsearch import elasticsearch_service
from airstory.utils.redis import redis_service


class BaseHandler:
    def __init__(self):
        self.dynamodb = get_dynamodb_connection()
        
        self.crud = airstory.dao.projects.Crud(self.dynamodb)
        self.user_crud = airstory.dao.users.Crud(self.dynamodb)
    
    def _lookup_project(self, project_id):
        project = airstory.dao.projects.Item()
        
        project.id = project_id
        return self.crud.retrieve(project)
    
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
            
    def _lookup_user_project(self, user_id, project_id):
        
        user_project = airstory.dao.user_projects.Item()
        
        user_project.user_id = user_id
        user_project.project_id = project_id
        
        return airstory.dao.user_projects.Crud(self.dynamodb).retrieve(user_project)
    
    async def _valid_user(self, user_id, project_id, min_level=1):
        if user_id:
            user_project = await self._lookup_user_project(user_id, project_id)
            
            if user_project and permissions_map[user_project.permissions] >= min_level:
                return user_project
        
        return False
    
class ProjectsHandler(BaseHandler):
    def _lookup_user_projects(self, user_id):
        return airstory.dao.user_projects.Crud(self.dynamodb).retrieve_all_by_user_id(user_id)
    
    async def get(self, state, json):
        response = init_response(json)
        attr = json['attributes']
        
        try:
            if state.user_id:
                user_projects = await self._lookup_user_projects(state.user_id)
                
                user_permissions = {}
                ids = []
                
                batch_read = airstory.dao.BatchRead(self.dynamodb)
        
                for user_project in user_projects:
                    ids.append(user_project.project_id)
                    user_permissions[user_project.project_id] = user_project.permissions
                    
                    #TODO: The following lines are here to populate elastic search for users who created projects before that was setup. To be removed at a later date.
                    project = airstory.dao.projects.Item()
                    project.id = user_project.project_id
                    
                    batch_read.add_batch_read(project)
                    
                search = None
                    
                if attr:
                    search = attr.get('search')
                    
                projects = await self.crud.search(ids, search) 
                
                users = {}
                
                if not search and len(projects) != len(user_projects):
                    db_projects = await batch_read.run_batch()
                    projects = []
                    
                    for project in db_projects:
                        p = airstory.dao.projects.Item()
                        
                        p.id = project['id']['S']
                        p.title = project['title']['S']
                        p.description = project['description']['S']
                        p.status = self.crud._get_item_val(project, 'status')
                        p.user_id = self.crud._get_item_val(project, 'user_id')
                        p.created = self.crud._get_item_val(project, 'created', item_type='N', default=0)
                        p.updated = self.crud._get_item_val(project, 'updated', item_type='N', default=0)
                        p.deadline = self.crud._get_item_val(project, 'deadline')
                        
                        projects.append(p)
                        
                        search_project = p.to_dict()
                        
                        if p.user_id:
                            user = await self._lookup_user(p.user_id, users)
                            search_project['author'] = user.first_name + ' ' + user.last_name
                        
                        await elasticsearch_service.put('airstory', 'projects', p.id, search_project)
                
                project_list = []
                
                if projects:
                    for project in projects:
                        project_item = project.to_dict()
                        
                        user = await self._lookup_user(project.user_id, users)
                        
                        project_item['avatar'] = user.avatar
                        project_item['first_name'] = user.first_name
                        project_item['last_name'] = user.last_name
                        
                        project_item['permissions'] = user_permissions[project.id]
                        
                        project_list.append(project_item)
                
                response['code'] = 200
                response['message'] = {'projects': project_list}
            else:
                response['code'] = 401
        except: #IGNORE:bare-except
            logger.exception('ProjectsHandler:get')
            response['code'] = 500
        
        return response

class ProjectHandler(BaseHandler):
    
    async def post(self, state, json):
        #TODO: prevent duplicate entries
        item = json['message']

        response = init_response(json)
        
        try:
            if state.user_id:
                batch_write = airstory.dao.BatchWrite(self.dynamodb)
                
                project = airstory.dao.projects.Item()
                
                project.title = item['title']
                project.description = item['description']
                project.id = self.crud.generate_id()
                project.created = self.crud.timestamp()
                project.updated = self.crud.timestamp()
                project.user_id = state.user_id
                project.deadline = item.get('deadline')
                
                batch_write.add_batch_write(project)
                
                user_project = airstory.dao.user_projects.Item()
                
                user_project.user_id = state.user_id
                user_project.project_id = project.id
                user_project.permissions = 'admin'
                
                batch_write.add_batch_write(user_project)
                  
                user = await self._lookup_user(project.user_id)
                
                search_project = project.to_dict()
                
                search_project['author'] = user.first_name + ' ' + user.last_name
                
                es_result = await elasticsearch_service.put('airstory', 'projects', project.id, search_project)
                es_success = es_result.code == 201
                
                if es_success:
                    completed = await batch_write.run_batch()
                    if completed:
                        response['message'] = project.to_dict()
                        response['code'] = 200
                        response['key'] = {'id': project.id}
                        
                        response['message']['avatar'] = user.avatar
                        response['message']['first_name'] = user.first_name
                        response['message']['last_name'] = user.last_name
                        
                        await publish_user_message(state.user_id, response)
                    else:
                        response['code'] = 500 
                else:
                    response['code'] = 500
            else:
                response['code'] = 401
        except: #IGNORE:bare-except
            logger.exception('ProjectHandler:post')
            response['code'] = 500
            
        return response
    
    async def get(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['id'])
            project = await self._lookup_project(key['id'])
            
            is_valid_user = await valid_user_future
                
            if project:
                if is_valid_user:
                    project.updated = self.crud.timestamp()
                    completed = await self.crud.update(project)
                    
                    if completed:
                        response['code'] = 200
                        response['message'] = project.to_dict()
                        
                        user = await self._lookup_user(project.user_id)
                            
                        response['message']['avatar'] = user.avatar
                        response['message']['first_name'] = user.first_name
                        response['message']['last_name'] = user.last_name
                    else:
                        response['code'] = 500 
                        
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('ProjectHandler:get')
            response['code'] = 500
        
        return response
              
    async def put(self, state, json):
        key = json['key']
        item = json['message']

        response = init_response(json)
    
        try:
            valid_user_future = self._valid_user(state.user_id, key['id'], min_level=5)
            project = await self._lookup_project(key['id'])
            
            is_valid_user = await valid_user_future
                
            if project:
                if is_valid_user:
                    project.title = item['title']
                    project.description = item['description']
                    project.updated = self.crud.timestamp()
                    project.deadline = item.get('deadline')
                    
                    if project.status != 'delete':
                        project.status = item.get('status')
                    
                    search_project = project.to_dict()
                    
                    es_result = await elasticsearch_service.put('airstory', 'projects', project.id, search_project)
                    es_success = es_result.code == 200 or es_result.code == 201
                    
                    if es_success:
                        completed = await self.crud.update(project)
                        if completed:
                            response['code'] = 200
                            response['message'] = project.to_dict()
                            
                            user = await self._lookup_user(project.user_id)
                                
                            response['message']['avatar'] = user.avatar
                            response['message']['first_name'] = user.first_name
                            response['message']['last_name'] = user.last_name
    
                            user_projects = await airstory.dao.user_projects.Crud(self.dynamodb).retrieve_all_by_project_id(project.id)
                            
                            for user_project in user_projects:
                                await publish_user_message(user_project.user_id, response)
                        else:
                            response['code'] = 500 
                    else:
                        response['code'] = 500 
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('ProjectHandler:put')
            response['code'] = 500
        
        return response
     
    async def delete(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['id'], min_level=5)
            project = await self._lookup_project(key['id'])
            
            is_valid_user = await valid_user_future
                
            if project:
                if is_valid_user:
                    project.status = 'delete'
        
                    es_result = await elasticsearch_service.put('airstory', 'projects', project.id, project.to_dict())
                    es_success = es_result.code == 200 or es_result.code == 201
                    
                    completed = await self.crud.update(project)
                    
                    if completed and es_success:
                        user_projects = await airstory.dao.user_projects.Crud(self.dynamodb).retrieve_all_by_project_id(project.id)
                            
                        update_response = init_response(json)
                        update_response['action'] = 'put'
                        update_response['code'] = 200
                        update_response['message'] = project.to_dict()
                        
                        for user_project in user_projects:
                            await publish_user_message(user_project.user_id, update_response)
                        
                        batch_write = airstory.dao.BatchWrite(self.dynamodb)
                        
                        cascade_project = airstory.dao.cascade.Project(self.dynamodb, batch_write)
                        await cascade_project.delete(project)
                        
                        completed = await batch_write.run_batch()
                        if completed:
                            response['code'] = 200
    
                            for user_project in user_projects:
                                await publish_user_message(user_project.user_id, response)
                        else:
                            response['code'] = 500
                    else:
                        response['code'] = 500
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('ProjectHandler:delete')
            response['code'] = 500
        
        return response
    
    async def subscribe(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['id'])
            project = await self._lookup_project(key['id'])
            
            is_valid_user = await valid_user_future
                
            if project:
                if is_valid_user:
                    state.project_permissions = is_valid_user.permissions
                    
                    project.updated = self.crud.timestamp()
                    await self.crud.update(project)
                    
                    response['code'] = 200
                    await subscribe_to_project(state, json)
                    
                    members = await redis_service.smembers(key['id'])
                    
                    if members:
                        response['message'] = list(members)
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('ProjectHandler:subscribe')
            response['code'] = 500
            
        return response
    
class ProjectUsersHandler(BaseHandler):
    
    async def _lookup_users(self, project_id):
        user_projects_crud = airstory.dao.user_projects.Crud(self.dynamodb)
        user_projects = await user_projects_crud.retrieve_all_by_project_id(project_id)
        
        users = []
        user_permissions = {}
        
        batch_read = airstory.dao.BatchRead(self.dynamodb)
        
        for item in user_projects:
            user = airstory.dao.users.Item()
            user.id = item.user_id
            
            user_permissions[item.user_id] = item.permissions
            
            batch_read.add_batch_read(user)
            
        responses = await batch_read.run_batch()
        
        if responses:
            for item in responses:
                user = airstory.dao.users.Item()
                
                user.id = item['id']['S']
                user.email = item['email']['S']
                user.password = item['password']['S']
                user.first_name = item['first_name']['S']
                user.last_name = item['last_name']['S']
                user.permissions = user_permissions.get(user.id, 'admin')
                user.avatar = self.crud._get_item_val(item, 'avatar')
                
                users.append(user)
 
        return users
    
    async def get(self, state, json):
        key = json['key']

        response = init_response(json)

        try:
            valid_user_future = self._valid_user(state.user_id, key['id'])
            users = await self._lookup_users(key['id'])
            
            is_valid_user = await valid_user_future
                
            if users and len(users) > 0:
                if is_valid_user:
                    response['code'] = 200
                    
                    userList = []
                    for user in users:
                        if not user.avatar:
                            email = user.email.encode('utf-8')
                            user.avatar = 'https://www.gravatar.com/avatar/' + hashlib.md5(email.lower()).hexdigest()
                            
                            users_crud = airstory.dao.users.Crud(self.dynamodb)
                            await users_crud.update(user)
                            
                        #No need to send password, even if it is hashed
                        del user.password
                        userList.append(user.to_dict())
                    
                    response['message'] = {'users': userList}
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('ProjectUsersHandler:get')
            response['code'] = 500
            
        return response
    
class ProjectDocumentsHandler(BaseHandler):
    
    def _lookup_documents(self, project_id):
        documents_crud = airstory.dao.documents.Crud(self.dynamodb)

        return documents_crud.retrieve_all_by_project_id(project_id)
     
    async def get(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['id'])
            documents = await self._lookup_documents(key['id'])
            
            is_valid_user = await valid_user_future
                
            if documents and len(documents) > 0:
                if is_valid_user:
                    response['code'] = 200
                    
                    document_list = []
                    for document in documents:
                        document_list.append(document.to_dict())
                    
                    response['message'] = {'documents': document_list}
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('ProjectDocumentsHandler:get')
            response['code'] = 500
            
        return response