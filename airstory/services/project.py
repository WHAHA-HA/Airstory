import json

from airstory.services import State
from airstory.services.handlers import project
from airstory.utils import to_json, rest_to_handler
from airstory.utils.tornado import RequestHandler
from tornroutes import route


class Resource(RequestHandler):
    def initialize(self):
        self.project_handler = project.ProjectHandler()
        self.projects_handler = project.ProjectsHandler()
        self.project_users_handler = project.ProjectUsersHandler()
        self.project_documents_handler = project.ProjectDocumentsHandler()
        
    def data_received(self, chunk):
        pass
 
@route('/v1/projects/(.*)/users')       
class ProjectUsersResources(Resource):
         
    async def get(self, *args):
        project_id = args[0]
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.project_users_handler.get(state, rest_to_handler('ProjectUsers', 'get', key={'id': project_id}))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            json_out = to_json(response['message'])
            self.set_header('Content-Type', 'application/json')
            self.write(json_out)
      
@route('/v1/projects/(.*)/documents')         
class ProjectDocumentsResources(Resource):
           
    async def get(self, *args):
        project_id = args[0]
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.project_documents_handler.get(state, rest_to_handler('ProjectDocuments', 'get', key={'id': project_id}))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            json_out = to_json(response['message'])
            self.set_header('Content-Type', 'application/json')
            self.write(json_out)
      
@route('/v1/projects')      
class ProjectResources(Resource):
     
    async def post(self):
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        json_document = json.loads(self.get_request_body())
            
        response = await self.project_handler.post(state, rest_to_handler('Project', 'post', message=json_document))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            self.set_header('Link', response['message']['id'])
            
    async def get(self):
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.projects_handler.get(state, rest_to_handler('ProjectDocuments', 'get'))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            json_out = to_json(response['message'])
            self.set_header('Content-Type', 'application/json')
            self.write(json_out)
     
@route('/v1/projects/(.*)')   
class ProjectResource(Resource):
      
    async def get(self, *args):
        project_id = args[0]
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.project_handler.get(state, rest_to_handler('Project', 'get', key={'id': project_id}))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            self.set_header('Content-Type', 'application/json')
            self.write(response['message'])
                   
    async def put(self, *args):
        project_id = args[0]
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        json_document = json.loads(self.get_request_body())
        
        response = await self.project_handler.put(state, rest_to_handler('Project', 'put', key={'id': project_id}, message=json_document))
        
        self.set_status(response['code'])
           
    async def delete(self, *args):
        project_id = args[0]
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.project_handler.delete(state, rest_to_handler('Project', 'delete', key={'id': project_id}))
        
        self.set_status(response['code'])