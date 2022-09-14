import json

from airstory.services import State
from airstory.services.handlers import document
from airstory.utils import rest_to_handler
from airstory.utils.tornado import RequestHandler
from tornroutes import route


class Resource(RequestHandler):
    def initialize(self):
        self.document_handler = document.DocumentHandler()
        
    def data_received(self, chunk):
        pass

@route('/v1/documents')
class DocumentResources(Resource):
      
    async def post(self):
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        json_document = json.loads(self.get_request_body())
            
        response = await self.document_handler.post(state, rest_to_handler('Document', 'post', message=json_document))
        
        self.set_status(response['code'])
        if response['code'] == 200:
            self.set_header('Link', response['key']['id'])
 
@route('/v1/projects/(.*)/documents/(.*)')       
class DocumentResource(Resource):
      
    async def get(self, *args):
        project_id, document_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.document_handler.get(state, rest_to_handler('Document', 'get', key={'project_id': project_id, 'id': document_id}))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            self.set_header('Content-Type', 'application/json')
            self.write(response['message'])
           
    async def delete(self, *args):
        project_id, document_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.document_handler.delete(state, rest_to_handler('Document', 'delete', key={'project_id': project_id, 'id': document_id}))
        
        self.set_status(response['code'])
 
@route('/v1/projects/(.*)/documents/(.*)/title')       
class DocumentTitleResource(Resource):
       
    async def put(self, *args):
        project_id, document_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.document_handler.put(state, rest_to_handler('Document', 'put', key={'project_id': project_id, 'id': document_id}, message=self.get_request_body()))
        
        self.set_status(response['code'])

        