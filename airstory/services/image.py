import json

from airstory.services import State
from airstory.services.handlers import image
from airstory.utils import rest_to_handler
from airstory.utils.tornado import RequestHandler
from tornroutes import route


class Resource(RequestHandler):
    def initialize(self):
        self.image_handler = image.ImageHandler()
        self.images_handler = image.ImagesHandler()
        
    def data_received(self, chunk):
        pass

@route('/v1/images/(.*)/image/(.*)')        
class ImageResource(Resource):
           
    async def delete(self, *args):
        ref_id, image_id = args
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.image_handler.delete(state, rest_to_handler('Image', 'delete', key={'ref_id': ref_id, 'id': image_id}))
        
        self.set_status(response['code'])
 
@route('/v1/images/(.*)')       
class ImageResources(Resource):
      
    async def post(self, *args):
        ref_id = args[0]
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        if 'files' in self.request.files:
            files = self.request.files['files']
        else:
            files = []
            fileinfo = {}
        
            json_image = json.loads(self.get_request_body())
            
            fileinfo['caption'] = json_image.get('caption')
            fileinfo['filename'] = json_image['filename']
            fileinfo['body'] = json_image['data']
            fileinfo['content_type'] = json_image['data'][5:json_image['data'].index('base64')]
            
            files.append(fileinfo)
            
        response = await self.images_handler.post(state, rest_to_handler('Images', 'post', key={'ref_id': ref_id}, message=files))
        
        self.set_status(response['code'])
            