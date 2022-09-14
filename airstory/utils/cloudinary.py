import base64
import json
import re
import uuid

from cloudinary import CloudinaryImage, utils
import cloudinary.uploader
from cloudinary.api import Error
from cloudinary.compat import string_types, to_string
from cloudinary.poster.encode import multipart_encode
from tornado.httpclient import AsyncHTTPClient, HTTPRequest

from airstory.utils import logger
from config import get_config


async def call_api(action, params, http_headers={}, return_error=False, unsigned=False, file=None, timeout=None, **options):
    try:
        file_io = None
        if unsigned:
            params = utils.cleanup_params(params)
        else:
            params = utils.sign_request(params, options)
    
        param_list = []
        for k, v in params.items():
            if isinstance(v, list):          
                for vv in v:
                    param_list.append((k+"[]", vv))
            elif v:
                param_list.append((k, v))            
    
        api_url = utils.cloudinary_api_url(action, **options)
    
        if file:
            if not isinstance(file, string_types):
                param_list.append(("file", file))
            elif not re.match(r'ftp:|https?:|s3:|data:[^;]*;base64,([a-zA-Z0-9\/+\n=]+)$', file):
                file_io = open(file, "rb")
                param_list.append(('file', file_io))
            else:
                param_list.append(("file", file))

        datagen, headers = multipart_encode(param_list)

        datagen = b"".join(datagen)

        headers["User-Agent"] = cloudinary.get_user_agent()
        for k, v in http_headers.items():
            headers[k] = v
    
        http_request_kwargs = { 'headers': headers } 
        
        if timeout is not None:
            http_request_kwargs['connect_timeout'] = timeout
            http_request_kwargs['request_timeout'] = timeout
            
        http_request_kwargs['body'] = datagen
        http_request_kwargs['method'] = 'POST'
            
        request = HTTPRequest(api_url, **http_request_kwargs)

        code = 200
        
        #TODO: Review original cloudinary method and see if I can still use some of its exception handling
        client = AsyncHTTPClient()
        response = await client.fetch(request)
        
        try:
            result = json.loads(to_string(response.body))
        except Exception as e:
            raise Error("Error parsing server response - Got %s", e)
    
        if "error" in result:
            if return_error:
                result["error"]["http_code"] = code
            else:
                raise Error(result["error"]["message"])
    
        return result
    finally:
        if file_io: file_io.close()  

cloudinary.uploader.call_api = call_api

class CloudinaryService:
    cloudinary.config( 
      cloud_name = 'airstory', 
      api_key = '575153598828167', 
      api_secret = 'Wydji9-5leAl7GmNWECSoMs_2HU' 
    )
    
    async def upload(self, public_id, data):
        unique = str(uuid.uuid4())
        
        logger.info('CloudinaryService:upload:request:' + unique)
        logger.info(public_id)
        #result = yield self.executor.submit(cloudinary.uploader.upload, data, public_id=get_config()['cloudinary']['folder'] + '/' + public_id)
        result = await cloudinary.uploader.upload(data, public_id=get_config()['cloudinary']['folder'] + '/' + public_id, timeout=60)
        logger.info('CloudinaryService:upload:response:' + unique)
        logger.info(result)
        
        return result
    
    async def destroy(self, public_id):
        unique = str(uuid.uuid4())
        
        logger.info('CloudinaryService:destroy:request:' + unique)
        logger.info(public_id)
        #result = yield self.executor.submit(cloudinary.uploader.destroy, get_config()['cloudinary']['folder'] + '/' + public_id)
        result = await cloudinary.uploader.destroy(get_config()['cloudinary']['folder'] + '/' + public_id, timeout=60)
        logger.info('CloudinaryService:destroy:response:' + unique)
        logger.info(result)
        
        return result
    
    async def copy(self, from_public_id, to_public_id):
        unique = str(uuid.uuid4())
        logger.info('CloudinaryService:copy:request:' + unique)
        logger.info(from_public_id + ' => ' + to_public_id)
        
        img_url = CloudinaryImage(get_config()['cloudinary']['folder'] + '/' + from_public_id).build_url()
        
        http_client = AsyncHTTPClient()
        img = await http_client.fetch(img_url)
        
        b64 = base64.standard_b64encode(img.body)
        data_uri = 'data:' + img.headers['Content-Type'] + ';base64,' + b64.decode('utf-8')
        
        result = await self.upload(to_public_id, data_uri)
        logger.info('CloudinaryService:copy:response:' + unique)
        logger.info(result)
        
        return result
        

cloudinary_service = CloudinaryService()