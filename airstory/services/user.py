import hashlib
import json
import random
import string

import airstory.dao.users
from airstory.services import State
from airstory.services.handlers import user
from airstory.utils import get_dynamodb_connection, rest_to_handler, logger
from airstory.utils.crypt import crypt_service
from airstory.utils.email import email_service
from airstory.utils.tornado import RequestHandler
from config import get_config
from tornroutes import route


class Resource(RequestHandler):
    def initialize(self):
        self.user_handler = user.UserHandler()
        
    def data_received(self, chunk):
        pass

@route('/v1/users/(.*)/authenticate')        
class UserAuthenticate(Resource):
    def initialize(self):
        self.dynamodb = get_dynamodb_connection()
        self.crud = airstory.dao.users.Crud(self.dynamodb)
    
    def _lookup_user(self, email):
        return self.crud.retrieve_by_email(email)
    
    async def post(self, *args):
        email = args[0]
        
        try:
            u = await self._lookup_user(email)
            
            if u:
                is_authenticated = await crypt_service.verify_hash(self.get_request_body(), u.password)
            
                if is_authenticated:
                    email = email.encode('utf-8')
                    avatar = 'https://www.gravatar.com/avatar/' + hashlib.md5(email.lower()).hexdigest()
                    
                    self.set_secure_cookie('as-user', u.email, **get_config()['cookies']['secure_httponly'])
                    self.set_secure_cookie('as-id', u.id, **get_config()['cookies']['secure_httponly'])
                    self.set_cookie('as-id-clr', u.id, **get_config()['cookies']['secure'])
                    self.set_cookie('as-avatar-clr', avatar, **get_config()['cookies']['secure'])
                    self.set_status(204)
                else:
                    self.clear_cookie('as-user')
                    self.clear_cookie('as-id')
                    self.clear_cookie('as-id-clr')
                    self.clear_cookie('as-avatar-clr')
                    self.set_status(400)
            else:
                self.clear_cookie('as-user')
                self.clear_cookie('as-id')
                self.clear_cookie('as-id-clr')
                self.clear_cookie('as-avatar-clr')
                self.set_status(404)
        except: #IGNORE:bare-except
            logger.exception('UserAuthenticate:post')
            self.set_status(500)

@route('/v1/users/(.*)/deauthenticate')        
class UserDeauthenticate(Resource):
    def initialize(self):
        self.dynamodb = get_dynamodb_connection()
        self.crud = airstory.dao.users.Crud(self.dynamodb)
    
    async def post(self, *args):
        self.clear_cookie('as-user')
        self.clear_cookie('as-id')
        self.clear_cookie('as-id-clr')
        self.set_status(204)
        

@route('/v1/users/(.*)/password-reset')        
class UserResetPassword(Resource):
    def initialize(self):
        self.dynamodb = get_dynamodb_connection()
        self.crud = airstory.dao.users.Crud(self.dynamodb)
    
    def _lookup_user(self, email):
        return self.crud.retrieve_by_email(email)
    
    async def post(self, *args):
        email = args[0]
        
        try:
            u = await self._lookup_user(email)
            
            if(u):
                temp_password = ''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(10))
                u.password = await crypt_service.hash(temp_password)
                
                completed = await self.crud.update(u)
                if completed:
                    email_body = 'Go to ' + get_config()['app']['external_url'] + '/login?next=/account and use ' + temp_password + ' as your temporary password.'
                    await email_service.send(email, 'Airstory - Password Reset', email_body)
                    self.set_status(204)
                else:
                    self.set_status(500)
            else:
                self.set_status(404)
        except: #IGNORE:bare-except
            logger.exception('UserResetPassword:post')
            self.set_status(500)

@route('/v1/users')        
class UserResources(Resource):
        
    async def post(self):
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        json_document = json.loads(self.get_request_body())
            
        response = await self.user_handler.post(state, rest_to_handler('User', 'post', message=json_document))
        
        self.set_status(response['code'])
        if response['code'] == 200:
            self.set_header('Link', response['message']['id'])
        
@route('/v1/users/(.*)')
class UserResource(Resource):
     
    async def get(self, *args):
        identifier = args[0]
        
        if '@' in identifier:
            key = {'email': identifier}
        else:
            key = {'id': identifier}
        
        response = await self.user_handler.get(None, rest_to_handler('User', 'get', key=key))
        
        self.set_status(response['code'])
        
        if response['code'] == 200: 
            self.set_header('Content-Type', 'application/json')
            self.write(response['message'])
                 
    async def put(self, *args):
        email = args[0]
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        json_document = json.loads(self.get_request_body())
        
        response = await self.user_handler.put(state, rest_to_handler('User', 'put', key={'email': email}, message=json_document))
        
        self.set_status(response['code'])
      
    async def delete(self, *args):
        email = args[0]
        
        state = State()
        state.user_id = self.get_secure_cookie('as-id')
        
        response = await self.user_handler.delete(state, rest_to_handler('User', 'delete', key={'email': email}))
        
        self.set_status(response['code'])
        
        if response['code'] == 200:
            self.set_secure_cookie('as-user', '')
            self.set_secure_cookie('as-id', '')
