import airstory.dao.documents
from airstory.utils import get_dynamodb_connection, get_s3_connection, \
    publish_project_message, subscribe_to_document, \
    init_response, logger, permissions_map


class BaseHandler:
    def __init__(self):
        self.dynamodb = get_dynamodb_connection()
        
        self.s3 = get_s3_connection()
        self.citation_crud = airstory.dao.citations.Crud(self.dynamodb)
        
        self.crud = airstory.dao.documents.Crud(self.dynamodb)
    
    def _lookup_document(self, project_id, document_id):
        document = airstory.dao.documents.Item()
        
        document.project_id = project_id
        document.id = document_id
        
        return self.crud.retrieve(document)
        
    def _lookup_user_project(self, user_id, project_id):
        
        user_project = airstory.dao.user_projects.Item()
        
        user_project.user_id = user_id
        user_project.project_id = project_id
        
        return airstory.dao.user_projects.Crud(self.dynamodb).retrieve(user_project)
    
    async def _valid_user(self, user_id, project_id, min_level=1):
        if user_id:
            user_project = await self._lookup_user_project(user_id, project_id)
            
            if user_project and permissions_map[user_project.permissions] >= min_level:
                return True
        
        return False
    
class DocumentHandler(BaseHandler):
      
    async def post(self, state, json):
        #TODO: prevent duplicate entries
        item = json['message']

        response = init_response(json)
        
        try:
            is_valid_user = await self._valid_user(state.user_id, item['project_id'], min_level=4)
            if is_valid_user:
                document = airstory.dao.documents.Item()
                
                document.project_id = item['project_id']
                document.id = self.crud.generate_id()
                document.title = item['title']
                document.created = self.crud.timestamp()
                document.type = item.get('type')
                
                completed = await self.crud.create(document)
                if completed:
                    response['code'] = 200
                    response['message'] = document.to_dict()
                    response['key'] = {'project_id': document.project_id, 'id': document.id}
                    
                    await publish_project_message(item['project_id'], response)
                else:
                    response['code'] = 500
            else:
                response['code'] = 401
        except: #IGNORE:bare-except
            logger.exception('DocumentHandler:post')
            response['code'] = 500
            
        return response
      
    async def get(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['project_id'])
            document = await self._lookup_document(key['project_id'], key['id'])
            
            is_valid_user = await valid_user_future
            
            if document:
                if is_valid_user:
                    response['code'] = 200
                    response['message'] = document.to_dict()
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('DocumentHandler:get')
            response['code'] = 500
            
        return response
            
    async def put(self, state, json):
        key = json['key']
        title = json['message']

        response = init_response(json)
    
        try:
            valid_user_future = self._valid_user(state.user_id, key['project_id'], min_level=4)
            document = await self._lookup_document(key['project_id'], key['id'])
            
            is_valid_user = await valid_user_future
                
            if document:
                if is_valid_user:
                    # You can only change the title, so any different project_id will be ignored
                    document.title = title
                    
                    if 'attributes' in json and json['attributes'] and 'type' in json['attributes']:
                        document.type = json['attributes']['type']
                    
                    completed = await self.crud.update(document)
                    if completed:
                        response['code'] = 200
                        response['message'] = document.to_dict()
                        
                        await publish_project_message(document.project_id, response)
                    else:
                        response['code'] = 500     
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('DocumentHandler:put')
            response['code'] = 500
        
        return response
          
    async def delete(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['project_id'], min_level=4)
            document = await self._lookup_document(key['project_id'], key['id'])
            
            is_valid_user = await valid_user_future
                
            if document:
                if is_valid_user:
                    batch = airstory.dao.BatchWrite(self.dynamodb)
                    
                    cascade_document = airstory.dao.cascade.Document(self.dynamodb, batch)
                    await cascade_document.delete(document)
                    
                    completed = await batch.run_batch()
                    if completed:
                        response['code'] = 200
                        
                        await publish_project_message(key['project_id'], response)
                    else:
                        response['code'] = 500
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('DocumentHandler:delete')
            response['code'] = 500
            
        return response
    
    async def subscribe(self, state, json):
        key = json['key']
        document_id = key['id']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['project_id'])
            document = await self._lookup_document(key['project_id'], document_id)
            
            is_valid_user = await valid_user_future
                
            if document:
                if is_valid_user:
                    response['code'] = 200
                    subscribe_to_document(state, key['id'])
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('DocumentHandler:subscribe')
            response['code'] = 500
            
        return response
    