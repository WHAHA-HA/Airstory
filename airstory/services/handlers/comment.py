import airstory.dao.comments
from airstory.utils import get_dynamodb_connection, publish_project_message, \
    publish_user_message, init_response, logger, permissions_map


class BaseHandler:
    def __init__(self):
        self.dynamodb = get_dynamodb_connection()
        
        self.crud = airstory.dao.comments.Crud(self.dynamodb)
    
    def _lookup_comment(self, ref_id, comment_id):
        comment = airstory.dao.comments.Item()
        
        comment.ref_id = ref_id
        comment.id = comment_id
        
        return self.crud.retrieve(comment)
        
    def _lookup_user_project(self, user_id, project_id):
        user_project = airstory.dao.user_projects.Item()
        
        user_project.user_id = user_id
        user_project.project_id = project_id
        
        return airstory.dao.user_projects.Crud(self.dynamodb).retrieve(user_project)
    
    async def _valid_user(self, user_id, ref_id, min_level=1):
        if user_id:
            ref_type = ref_id[:1]
            composite_id = ref_id.split('|')
            
            if ref_type == 'u':
                #This is a comment on a user's library note
                return composite_id[0] == user_id
            elif ref_type == 'p':
                #This is a comment on either a project note or a document
                user_project = await self._lookup_user_project(user_id, composite_id[0])
    
                if user_project and permissions_map[user_project.permissions] >= min_level:
                    return True
        
        return False

class CommentHandler(BaseHandler):
      
    async def post(self, state, json):
        key = json['key']
        item = json['message']

        response = init_response(json)
        
        try:
            is_valid_user = await self._valid_user(state.user_id, key['ref_id'], min_level=4)
            if is_valid_user:
                comment = airstory.dao.comments.Item()
                
                comment.ref_id = key['ref_id']
                comment.id = self.crud.generate_id()
                comment.created = self.crud.timestamp()
                comment.content = item['content']
                comment.user_id = state.user_id
                
                if 'link' in item:
                    comment.link = item['link']
                else:
                    comment.link = self.crud.generate_id()[1:]
                
                completed = await self.crud.create(comment)
                if completed:
                    response['code'] = 200
                    response['key']['id'] = comment.id
                    response['message'] = comment.to_dict()
                    
                    composite_id = comment.ref_id.split('|')
                    ref_type = composite_id[0][:1]
                    
                    if ref_type == 'p':
                        await publish_project_message(composite_id[0], response)
                    elif ref_type == 'u':
                        await publish_user_message(composite_id[0], response)
                else:
                    response['code'] = 500
            else:
                response['code'] = 401
        except: #IGNORE:bare-except
            logger.exception('CommentHandler:post')
            response['code'] = 500
             
        return response
      
    async def get(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['ref_id'])
            comment = await self._lookup_comment(key['ref_id'], key['id'])
            
            is_valid_user = await valid_user_future
                
            if comment:
                if is_valid_user:
                    response['code'] = 200
                    response['message'] = comment.to_dict()
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
                
        except: #IGNORE:bare-except
            logger.exception('CommentHandler:get')
            response['code'] = 500
            
        return response
                   
    async def put(self, state, json):
        key = json['key']
        item = json['message']

        response = init_response(json)
    
        try:
            valid_user_future = self._valid_user(state.user_id, key['ref_id'], min_level=4)
            comment = await self._lookup_comment(key['ref_id'], key['id'])
            
            is_valid_user = await valid_user_future
            
            if comment:
                if is_valid_user and comment.user_id == state.user_id:
                        
                    comment.content = item['content']
                    
                    completed = await self.crud.update(comment)
                    if completed:
                        response['code'] = 200
                        response['message'] = comment.to_dict()
                    
                        composite_id = comment.ref_id.split('|')
                        ref_type = composite_id[0][:1]
                        
                        if ref_type == 'p':
                            await publish_project_message(composite_id[0], response)
                        elif ref_type == 'u':
                            await publish_user_message(composite_id[0], response)
                    else:
                        response['code'] = 500     
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('CommentHandler:put')
            response['code'] = 500
        
        return response
        
    async def delete(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['ref_id'], min_level=4)
            comment = await self._lookup_comment(key['ref_id'], key['id'])
            
            is_valid_user = await valid_user_future
            
            if comment:
                if is_valid_user:
                    batch = airstory.dao.BatchWrite(self.dynamodb)
                    
                    cascade_comment = airstory.dao.cascade.Comment(self.dynamodb, batch)
                    await cascade_comment.delete(comment)
                    
                    completed = await batch.run_batch()
                    if completed:
                        response['code'] = 200
                    
                        composite_id = comment.ref_id.split('|')
                        ref_type = composite_id[0][:1]
                        
                        if ref_type == 'p':
                            await publish_project_message(composite_id[0], response)
                        elif ref_type == 'u':
                            await publish_user_message(composite_id[0], response)
                    else:
                        response['code'] = 500
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('CommentHandler:delete')
            response['code'] = 500
        
        return response
    
class CommentsHandler(BaseHandler):
    
    def _lookup_comments(self, ref_id):
        #Need to figure out pagination
        return self.crud.retrieve_all_by_ref_id(ref_id)
     
    async def get(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['ref_id'])
            comments = await self._lookup_comments(key['ref_id'])
            
            is_valid_user = await valid_user_future
                
            if comments and len(comments) > 0:
                if is_valid_user:
                    response['code'] = 200
                    
                    comment_list = []
                    for comment in comments:
                        comment_list.append(comment.to_dict())
                    
                    response['message'] = {'comments': comment_list}
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('CommentsHandler:get')
            response['code'] = 500
            
        return response