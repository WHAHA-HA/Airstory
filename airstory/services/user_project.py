import json

from airstory.services import State
from airstory.services.handlers import user_project
from airstory.utils import rest_to_handler
from airstory.utils.tornado import RequestHandler
from tornroutes import route


class Resource(RequestHandler):
    def initialize(self):
        self.user_project_handler = user_project.UserProjectHandler()
        
    def data_received(self, chunk):
        pass
        
@route('/v1/user-projects')
class UserProjectResources(Resource):
           
    async def post(self):
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        json_document = json.loads(self.get_request_body())
            
        response = await self.user_project_handler.post(state, rest_to_handler('UserProject', 'post', message=json_document))
        
        self.set_status(response['code'])
     
@route('/v1/projects/(.*)/users/(.*)')   
class UserProjectResource(Resource):
        
    async def delete(self, *args):
        project_id, u_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.user_project_handler.delete(state, rest_to_handler('UserProject', 'delete', key={'user_id': u_id, 'project_id': project_id}))
        
        self.set_status(response['code'])