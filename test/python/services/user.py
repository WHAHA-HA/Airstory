import bcrypt
from mock.mock import Mock
from tornado.concurrent import Future

from airstory.dao.users import Item, Crud
from airstory.utils import to_json, utf8, from_json
import airstory
from test.python import AirstoryHTTPTestCase


def get_user():
    user = Item()
    
    user.username = 'username'
    user.password = '$2b$12$3zY18B0ScA2xE322WocVzOAYcdIUIe/T/EBbJszt2.ymGJ0OpUOta'
    user.id = '1'
    user.first_name = 'first'
    user.last_name = 'last'
    
    return user

def verify_password(password, hash_pass):
    hash_pass = utf8(hash_pass)
    password = utf8(password)
    
    check = bcrypt.hashpw(password, hash_pass)
    is_valid = check == hash_pass
    
    return is_valid

class UserAuthenticateTest(AirstoryHTTPTestCase):
        
    def test_post_success(self):
        
        def mock_retrieve_by_username(_, username):
            self.assertEqual(username, 'username', 'username is incorrect')
            
            future = Future()
            future.set_result(get_user())
            
            return future
        
        Crud.retrieve_by_username = mock_retrieve_by_username
        
        response = self.fetch('/v1/users/username/authenticate', method='POST', body='password')
        
        self.assertEqual(response.code, 204, "is not a 204 response")
        self.assertTrue(response.headers['Set-Cookie'], "Doe's not contain set cookie")
        self.assertIn('as-user', response.headers['Set-Cookie'], 'Does not have as-user cookie')
        self.assertIn('as-id', response.headers['Set-Cookie'], 'Does not have as-id cookie')
        self.assertIn('as-id-clr', response.headers['Set-Cookie'], 'Does not have as-id-clr cookie')
        
    def test_post_fail_username(self):
        def mock_retrieve_by_username(_, username): #IGNORE:unused-argument
            future = Future()
            future.set_result(None)
            
            return future
        
        Crud.retrieve_by_username = mock_retrieve_by_username
        
        response = self.fetch('/v1/users/not-username/authenticate', method='POST', body='password')
        
        self.assertEqual(response.code, 404, "is not a 404 response")
        self.assertTrue(response.headers['Set-Cookie'], "Doe's not contain set cookie")
        self.assertIn('as-user', response.headers['Set-Cookie'], 'Does not have as-user cookie')
        self.assertIn('as-id', response.headers['Set-Cookie'], 'Does not have as-id cookie')
        self.assertIn('as-id-clr', response.headers['Set-Cookie'], 'Does not have as-id-clr cookie')
        
        
    def test_post_fail_password(self):
        def mock_retrieve_by_username(_, username): #IGNORE:unused-argument
            future = Future()
            future.set_result(get_user())
            
            return future
        
        Crud.retrieve_by_username = mock_retrieve_by_username
        
        response = self.fetch('/v1/users/username/authenticate', method='POST', body='not-password')
        
        self.assertEqual(response.code, 400, "is not a 400 response")
        self.assertTrue(response.headers['Set-Cookie'], "Doe's not contain set cookie")
        self.assertIn('as-user', response.headers['Set-Cookie'], 'Does not have as-user cookie')
        self.assertIn('as-id', response.headers['Set-Cookie'], 'Does not have as-id cookie')
        self.assertIn('as-id-clr', response.headers['Set-Cookie'], 'Does not have as-id-clr cookie')
        
class UserResourcesTest(AirstoryHTTPTestCase):
    
    def test_post_success(self):
        
        body = {
            "username": "username",
            "password": "password",
            "first_name": "first",
            "last_name": "last"
        }
        
        def mock_retrieve_by_username(_, username):
            self.assertEqual(username, body['username'], 'username is incorrect')
            
            future = Future()
            future.set_result(None)
            
            return future
        
        def mock_create(_, user):
            self.assertEqual(user.username, body['username'], 'username is incorrect')
            self.assertTrue(verify_password(body['password'], user.password), 'password is incorrect')
            self.assertEqual(user.first_name, body['first_name'], 'first_name is incorrect')
            self.assertEqual(user.last_name, body['last_name'], 'last_name is incorrect')
            
            future = Future()
            future.set_result(True)
            
            return future
        
        airstory.utils.publish_user_message = Mock()
        
        Crud.retrieve_by_username = mock_retrieve_by_username
        Crud.create = mock_create
        
        response = self.fetch('/v1/users', method='POST', body=to_json(body))
        
        self.assertEqual(response.code, 200, "is not a 200 response")
    
    def test_post_fail_user_exists(self):
        body = {
            "username": "username",
            "password": "password",
            "first_name": "first",
            "last_name": "last"
        }
        
        def mock_retrieve_by_username(_, username):
            self.assertEqual(username, body['username'], 'username is incorrect')
            
            future = Future()
            future.set_result(Item())
            
            return future
        
        Crud.retrieve_by_username = mock_retrieve_by_username
        
        response = self.fetch('/v1/users', method='POST', body=to_json(body))
        
        self.assertEqual(response.code, 400, "is not a 400 response")
        
class UserResourceTest(AirstoryHTTPTestCase):
    def test_get_success(self):
        user = get_user()
        
        def mock_retrieve_by_username(_, username):
            self.assertEqual(username, 'username', 'username is incorrect')
            
            future = Future()
            future.set_result(user)
            
            return future
        
        Crud.retrieve_by_username = mock_retrieve_by_username
        
        response = self.fetch('/v1/users/username', method='GET')
        
        self.assertEqual(response.code, 200, "is not a 200 response")
        
        body = from_json(response.body)
        
        self.assertEqual(body['id'], user.id, 'User id is not equal')
        self.assertEqual(body['first_name'], user.first_name, 'User first_name is not equal')
        self.assertEqual(body['last_name'], user.last_name, 'User last_name is not equal')
        self.assertEqual(body['username'], user.username, 'User username is not equal')
        self.assertNotIn('password', body, 'User password should not be here')
        
    def test_get_fail_username(self):
        def mock_retrieve_by_username(_, username): #IGNORE:unused-argument
            future = Future()
            future.set_result(None)
            
            return future
        
        Crud.retrieve_by_username = mock_retrieve_by_username
        
        response = self.fetch('/v1/users/not-username', method='GET')
        
        self.assertEqual(response.code, 404, "is not a 404 response")
    
    def test_put_success(self):
        body = {
            "username": "username",
            "password": "password",
            "first_name": "first",
            "last_name": "last"
        }
        
        def mock_retrieve_by_username(_, username):
            self.assertEqual(username, body['username'], 'username is incorrect')
            
            future = Future()
            future.set_result(get_user())
            
            return future
        
        def mock_update(_, user):
            self.assertEqual(user.username, body['username'], 'username is incorrect')
            self.assertTrue(verify_password(body['password'], user.password), 'password is incorrect')
            self.assertEqual(user.first_name, body['first_name'], 'first_name is incorrect')
            self.assertEqual(user.last_name, body['last_name'], 'last_name is incorrect')
            
            future = Future()
            future.set_result(True)
            
            return future
        
        airstory.utils.publish_user_message = Mock()
        
        Crud.retrieve_by_username = mock_retrieve_by_username
        Crud.update = mock_update
        
        headers = {
            'Cookie': self.get_auth_cookies()
        }
        
        response = self.fetch('/v1/users/username', method='PUT', body=to_json(body), headers=headers)
        
        self.assertEqual(response.code, 200, "is not a 200 response")
    
    def test_put_fail_auth(self):
        body = {
            "username": "username",
            "password": "password",
            "first_name": "first",
            "last_name": "last"
        }
        
        def mock_retrieve_by_username(_, username):
            self.assertEqual(username, body['username'], 'username is incorrect')
            
            future = Future()
            future.set_result(get_user())
            
            return future
        
        airstory.utils.publish_user_message = Mock()
        
        Crud.retrieve_by_username = mock_retrieve_by_username
        
        response = self.fetch('/v1/users/username', method='PUT', body=to_json(body))
        
        self.assertEqual(response.code, 401, "is not a 401 response")
    
    def test_put_fail_username(self):
        body = {
            "username": "username",
            "password": "password",
            "first_name": "first",
            "last_name": "last"
        }
        
        def mock_retrieve_by_username(_, username):
            self.assertEqual(username, body['username'], 'username is incorrect')
            
            future = Future()
            future.set_result(None)
            
            return future
        
        Crud.retrieve_by_username = mock_retrieve_by_username
        
        response = self.fetch('/v1/users/username', method='PUT', body=to_json(body))
        
        self.assertEqual(response.code, 404, "is not a 404 response")
    
    def test_delete_success(self):
        
        def mock_retrieve_by_username(_, username):
            self.assertEqual(username, 'username', 'username is incorrect')
            
            future = Future()
            future.set_result(get_user())
            
            return future
        
        def mock_delete(_, user):
            self.assertEqual(user.username, 'username', 'username is incorrect')
            
            future = Future()
            future.set_result(True)
            
            return future
        
        airstory.utils.publish_user_message = Mock()
        
        Crud.retrieve_by_username = mock_retrieve_by_username
        Crud.delete = mock_delete
        
        headers = {
            'Cookie': self.get_auth_cookies()
        }
        
        response = self.fetch('/v1/users/username', method='DELETE', headers=headers)
        
        self.assertEqual(response.code, 200, "is not a 200 response")
    
    def test_delete_fail_auth(self):
        def mock_retrieve_by_username(_, username): #IGNORE:unused-argument
            future = Future()
            future.set_result(get_user())
            
            return future
        
        airstory.utils.publish_user_message = Mock()
        
        Crud.retrieve_by_username = mock_retrieve_by_username
        
        response = self.fetch('/v1/users/username', method='DELETE')
        
        self.assertEqual(response.code, 401, "is not a 401 response")
    
    def test_delete_fail_username(self):
        def mock_retrieve_by_username(_, username): #IGNORE:unused-argument
            future = Future()
            future.set_result(None)
            
            return future
        
        Crud.retrieve_by_username = mock_retrieve_by_username
        
        response = self.fetch('/v1/users/username', method='DELETE')
        
        self.assertEqual(response.code, 404, "is not a 404 response")