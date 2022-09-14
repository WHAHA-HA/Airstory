import json

from airstory.services import State
from airstory.services.handlers import invitation
from airstory.utils import rest_to_handler, to_json
from airstory.utils.tornado import RequestHandler
from tornroutes import route


class Resource(RequestHandler):
    def initialize(self):
        self.invitation_handler = invitation.InvitationHandler()
        
    def data_received(self, chunk):
        pass
        
@route('/v1/projects/(.*)/invitations')
class InvitationResources(Resource):
           
    async def post(self, *args):
        project_id = args[0]
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        json_document = json.loads(self.get_request_body())
            
        response = await self.invitation_handler.post(state, rest_to_handler('Invitation', 'post', key={'project_id': project_id}, message=json_document))
        
        self.set_status(response['code'])
        
        if response['code'] == 200:
            self.set_header('Link', response['key']['id'])
     
@route('/v1/projects/(.*)/invitations/(.*)') 
class InvitationResource(Resource):
        
    async def get(self, *args):
        project_id, invitation_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.invitation_handler.get(state, rest_to_handler('Invitation', 'delete', key={'project_id': project_id, 'id': invitation_id}))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            json_out = to_json(response['message'])
            self.set_header('Content-Type', 'application/json')
            self.write(json_out)
        
    async def delete(self, *args):
        project_id, invitation_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.invitation_handler.delete(state, rest_to_handler('Invitation', 'delete', key={'project_id': project_id, 'id': invitation_id}))
        
        self.set_status(response['code'])