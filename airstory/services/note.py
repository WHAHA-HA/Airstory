import json

from airstory.services import State
from airstory.services.handlers import note
from airstory.utils import to_json, rest_to_handler
from airstory.utils.tornado import RequestHandler
from tornroutes import route


class Resource(RequestHandler):
    def initialize(self):
        self.note_handler = note.NoteHandler()
        self.notes_handler = note.NotesHandler()
        
    def data_received(self, chunk):
        pass

@route('/v1/notes/(.*)/note/(.*)')        
class NoteResource(Resource):
      
    async def get(self, *args):
        ref_id, note_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.note_handler.get(state, rest_to_handler('Note', 'get', key={'ref_id': ref_id, 'id': note_id}))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            #TODO: Cleanup
            json_out = to_json(response['message'])
            self.set_header('Content-Type', 'application/json')
            self.write(json_out)
                
    async def put(self, *args):
        ref_id, note_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        json_document = json.loads(self.get_request_body())
        
        response = await self.note_handler.put(state, rest_to_handler('Note', 'put', key={'ref_id': ref_id, 'id': note_id}, message=json_document))
        
        self.set_status(response['code'])
           
    async def delete(self, *args):
        ref_id, note_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.note_handler.delete(state, rest_to_handler('Note', 'delete', key={'ref_id': ref_id, 'id': note_id}))
        
        self.set_status(response['code'])
 
@route('/v1/notes/(.*)')       
class NoteResources(Resource):
          
    async def get(self, *args, **kwargs):
        ref_id = args[0]
        
        start_ref_id = self.get_query_argument('ref_id', None)
        start_id = self.get_query_argument('id', None)
        
        query = None
        
        if start_ref_id and start_id:
            query = {'start_ref_id': start_ref_id, 'start_id': start_id}
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.notes_handler.get(state, rest_to_handler('Notes', 'get', key={'ref_id': ref_id}, attributes=query))
        
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
            
        response = await self.note_handler.post(state, rest_to_handler('Note', 'post', key={'ref_id': ref_id}, message=json_document))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            self.set_header('Link', response['key']['id'])
            
@route('/v1/notes')       
class NotesResources(Resource):
          
    async def get(self, **kwargs):
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.notes_handler.get(state, rest_to_handler('Notes', 'get'))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            json_out = to_json(response['message'])
            self.write(json_out)