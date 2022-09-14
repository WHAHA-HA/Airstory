import re

from mock.mock import Mock
from tornado.concurrent import Future
from tornado.testing import AsyncHTTPTestCase

import config
config.configuration = config.config['dev']

from airstory.dao.users import Item, Crud
import app


def get_user():
    user = Item()
    
    user.username = 'username'
    user.password = '$2b$12$3zY18B0ScA2xE322WocVzOAYcdIUIe/T/EBbJszt2.ymGJ0OpUOta'
    user.id = '1'
    user.first_name = 'first'
    user.last_name = 'last'
    
    return user

class AirstoryHTTPTestCase(AsyncHTTPTestCase):
    cookies = None
    
    def _get_cookies(self):
        if not self.cookies:
            def mock_retrieve_by_username(_, username): #IGNORE:unused-argument
                future = Future()
                future.set_result(get_user())
                
                return future
            
            Crud.retrieve_by_username = mock_retrieve_by_username
            
            response = self.fetch('/v1/users/username/authenticate', method='POST', body='password')
            
            as_id = re.findall('as-id="(.*?)";', response.headers['Set-Cookie'])[0]
            as_id_clr = re.findall('as-id-clr=(.*?);', response.headers['Set-Cookie'])[0]
            as_user = re.findall('as-user="(.*?)";', response.headers['Set-Cookie'])[0]
            
            self.cookies = 'as-id="' + as_id + '"; as-user="' + as_user + '"; as-id-clr=' + as_id_clr + ';'
        return self.cookies
    
    def get_app(self):
        return app.application
    
    def get_auth_cookies(self):
        return self._get_cookies()