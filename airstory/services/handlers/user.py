import hashlib

import airstory.dao.users
from airstory.utils import get_dynamodb_connection, publish_user_message, \
    init_response, logger
from airstory.utils.crypt import crypt_service


class BaseHandler:    
    def __init__(self):
        self.dynamodb = get_dynamodb_connection()
        
        self.crud = airstory.dao.users.Crud(self.dynamodb)
    
    def _lookup_user_by_id(self, user_id):
        user = airstory.dao.users.Item()
        user.id = user_id
        
        return self.crud.retrieve(user)
    
    def _lookup_user(self, email):
        return self.crud.retrieve_by_email(email)
    
class UserHandler(BaseHandler):
    
    async def post(self, state, json): #IGNORE:unused-argument
        item = json['message']

        response = init_response(json)
        
        try:
            user = await self._lookup_user(item['email'])
    
            if user is None:
                user = airstory.dao.users.Item()
                
                user.password = await crypt_service.hash(item['password'])
                user.id = self.crud.generate_id()
                user.first_name = item['first_name']
                user.last_name = item['last_name']
                user.email = item['email']
                
                email = user.email.encode('utf-8')
                user.avatar = 'https://www.gravatar.com/avatar/' + hashlib.md5(email.lower()).hexdigest()
                
                completed = await self.crud.create(user)
                if completed:
                    response['code'] = 200
                    response['message'] = user.to_dict()
                    response['key'] = {'id': user.id}
                    
                    await publish_user_message(user.id, response)
                else:
                    response['code'] = 500
            else:
                response['code'] = 400
        except: #IGNORE:bare-except
            logger.exception('UserHandler:post')
            response['code'] = 500
        
        return response
    
    async def get(self, state, json): #IGNORE:unused-argument
        key = json['key']

        response = init_response(json)
        
        try:
            if 'email' in key:
                user = await self._lookup_user(key['email'])
            else:
                user = await self._lookup_user_by_id(key['id'])
                
            #TODO: Validate that the user is logged in. If not this user, should limit what is sent
            
            if user:
                if not user.avatar:
                    email = user.email.encode('utf-8')
                    user.avatar = 'https://www.gravatar.com/avatar/' + hashlib.md5(email.lower()).hexdigest()
                    
                    await self.crud.update(user)
                
                #Although hashed, there is no reason to return the password
                #Return values based on level of auth.
                del user.password
                
                response['code'] = 200
                response['message'] = user.to_dict()
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('UserHandler:post')
            response['code'] = 500
            
        return response       
               
    async def put(self, state, json):
        key = json['key']
        item = json['message']

        response = init_response(json)
    
        try:
            user = await self._lookup_user(key['email'])
                
            if user:
                if state.user_id:
                    if user.id == state.user_id:
            
                        if 'email' in item and item['email'] != user.email:
                            new_user = await self._lookup_user(item['email'])
                            
                            if not new_user:
                                user.email = item['email']
                                
                                email = user.email.encode('utf-8')
                                user.avatar = 'https://www.gravatar.com/avatar/' + hashlib.md5(email.lower()).hexdigest()
                            else:
                                response['code'] = 400
                                
                        if 'code' not in response:
                            if 'password' in item:
                                user.password = await crypt_service.hash(item['password'])
                                
                            user.first_name = item.get('first_name', user.first_name)
                            user.last_name = item.get('last_name', user.last_name)
                            user.email = item.get('email', user.email)
                            
                            completed = await self.crud.update(user)
                            if completed:
                                response['code'] = 200
                                response['message'] = user.to_dict()
                        
                                await publish_user_message(user.id, response)
                            else:
                                response['code'] = 500
                    else:
                        response['code'] = 401
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('UserHandler:post')
            response['code'] = 500
        
        return response
         
    async def delete(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            user = await self._lookup_user(key['email'])
            
            if user:
                if state.user_id:
                    if user.id == state.user_id:
                        batch = airstory.dao.BatchWrite(self.dynamodb)
                        
                        cascadeUser = airstory.dao.cascade.User(self.dynamodb, batch)
                        await cascadeUser.delete(user)
                        
                        completed = await batch.run_batch()
                        if completed:
                            response['code'] = 200
                    
                            await publish_user_message(user.id, response)
                        else:
                            response['code'] = 500
                    else:
                        response['code'] = 401
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('UserHandler:post')
            response['code'] = 500
        
        return response
