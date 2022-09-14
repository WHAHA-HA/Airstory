import json

import airstory.dao
from airstory.services import State
from airstory.services.handlers import ot
from airstory.utils import to_json, rest_to_handler, get_dynamodb_connection
from airstory.utils.tornado import RequestHandler
from tornroutes import route


class Resource(RequestHandler):
    def initialize(self):
        self.ot_handler = ot.OtHandler()
        self.dynamodb = get_dynamodb_connection()
        self.crud = airstory.dao.documents.Crud(self.dynamodb)
        
    def data_received(self, chunk):
        pass
 
@route('/v1/projects/(.*)/ot/(.*)')       
class OtResources(Resource):
    
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
    
    async def _valid_user(self, user_id, project_id):
        if user_id:
            user_project = await self._lookup_user_project(user_id, project_id)
            
            if user_project:
                return True
        
        return False
         
    async def post(self, *args):
        project_id, document_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        state.document_id = document_id
        
        is_valid_user = await self._valid_user(state.user_id, project_id)
        
        if is_valid_user:
            document = await self._lookup_document(project_id, document_id)
            
            if document:
                json_document = json.loads(self.get_request_body())
                
                response = await self.ot_handler.post(state, rest_to_handler('OT', 'get', key={'document_id': document_id}, message=json_document))
                
                self.set_status(response['code'])
            
                if response['code'] == 200: 
                    json_out = to_json(response['message'])
                    self.set_header('Content-Type', 'application/json')
                    self.write(json_out)
            else:
                self.set_status(404)
        else:
            self.set_status(401)
            
    async def patch(self, *args):
        project_id, document_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        state.document_id = document_id
        
        is_valid_user = await self._valid_user(state.user_id, project_id)
        
        if is_valid_user:
            document = await self._lookup_document(project_id, document_id)
            
            if document:
                json_document = json.loads(self.get_request_body())
                
                request_id = self.request.headers.get('request_id')
                
                response = await self.ot_handler.patch(state, rest_to_handler('OT', 'patch', key={'document_id': document_id}, message=json_document, attributes={'request_id': request_id}))
                
                self.set_status(response['code'])
            
                if response['code'] == 200: 
                    json_out = to_json(response['message'])
                    self.set_header('Content-Type', 'application/json')
                    self.write(json_out)
            else:
                self.set_status(404)
        else:
            self.set_status(401)
