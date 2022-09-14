import json

from airstory.services import State
from airstory.services.handlers import comment
from airstory.utils import to_json, rest_to_handler
from airstory.utils.tornado import RequestHandler
from tornroutes import route


class Resource(RequestHandler):
    def initialize(self):
        self.comment_handler = comment.CommentHandler()
        self.comments_handler = comment.CommentsHandler()
        
    def data_received(self, chunk):
        pass

@route('/v1/comments/(.*)/comment/(.*)')
class CommentResource(Resource):
    
    async def get(self, *args):
        ref_id, comment_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.comment_handler.get(state, rest_to_handler('Comment', 'get', key={'ref_id': ref_id, 'id': comment_id}))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            #TODO: Cleanup
            json_out = to_json(response['message'])
            self.set_header('Content-Type', 'application/json')
            self.write(json_out)
                 
    async def put(self, *args):
        ref_id, comment_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        json_document = json.loads(self.get_request_body())
        
        response = await self.comment_handler.put(state, rest_to_handler('Comment', 'put', key={'ref_id': ref_id, 'id': comment_id}, message=json_document))
        
        self.set_status(response['code'])
           
    async def delete(self, *args):
        ref_id, comment_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.comment_handler.delete(state, rest_to_handler('Comment', 'delete', key={'ref_id': ref_id, 'id': comment_id}))
        
        self.set_status(response['code'])

@route('/v1/comments/(.*)')
class CommentResources(Resource):
          
    async def get(self, *args):
        ref_id = args[0]
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.comments_handler.get(state, rest_to_handler('Comments', 'get', key={'ref_id': ref_id}))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            json_out = to_json(response['message'])
            self.set_header('Content-Type', 'application/json')
            self.write(json_out)
    
    async def post(self, *args):
        ref_id = args[0]
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        json_document = json.loads(self.get_request_body())
            
        response = await self.comment_handler.post(state, rest_to_handler('Comment', 'post', key={'ref_id': ref_id}, message=json_document))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            self.set_header('Link', response['key']['id'])
        
    