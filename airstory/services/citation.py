import json

from airstory.services import State
from airstory.services.handlers import citation
from airstory.utils import to_json, rest_to_handler
from airstory.utils.tornado import RequestHandler
from tornroutes import route


class Resource(RequestHandler):
    def initialize(self):
        self.citation_handler = citation.CitationHandler()
        self.citations_handler = citation.CitationsHandler()
        
    def data_received(self, chunk):
        pass

@route('/v1/citations/(.*)/citation/(.*)')
class CitationResource(Resource):
    
    async def get(self, *args):
        ref_id, citation_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.citation_handler.get(state, rest_to_handler('Citation', 'get', key={'ref_id': ref_id, 'id': citation_id}))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            #TODO: Cleanup
            json_out = to_json(response['message'])
            self.set_header('Content-Type', 'application/json')
            self.write(json_out)
                 
    async def put(self, *args):
        ref_id, citation_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        json_document = json.loads(self.get_request_body())
        
        response = await self.citation_handler.put(state, rest_to_handler('Citation', 'put', key={'ref_id': ref_id, 'id': citation_id}, message=json_document))
        
        self.set_status(response['code'])
           
    async def delete(self, *args):
        ref_id, citation_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.citation_handler.delete(state, rest_to_handler('Citation', 'delete', key={'ref_id': ref_id, 'id': citation_id}))
        
        self.set_status(response['code'])

@route('/v1/citations/(.*)')
class CitationResources(Resource):
          
    async def get(self, *args):
        ref_id = args[0]
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.citations_handler.get(state, rest_to_handler('Citation', 'get', key={'ref_id': ref_id}))
        
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
            
        response = await self.citation_handler.post(state, rest_to_handler('Citation', 'post', key={'ref_id': ref_id}, message=json_document))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            self.set_header('Link', response['key']['id'])
        
    