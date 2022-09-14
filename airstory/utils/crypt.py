import bcrypt
from tornado.gen import coroutine

from airstory.utils import get_thread_pool, utf8


class CryptService:
    executor = get_thread_pool()
    
    @coroutine
    def hash(self, val):
        #Intentionally computationally intensive, so making async so tornado is not blocked
        hash_val = yield self.executor.submit(bcrypt.hashpw, val.encode('utf-8'), bcrypt.gensalt())
        
        return hash_val.decode('utf-8')
    
    @coroutine  
    def verify_hash(self, val, hash_val):
        #Intentionally computationally intensive, so making async so tornado is not blocked
        hash_val = utf8(hash_val)
        val = utf8(val)
        
        check = yield self.executor.submit(bcrypt.hashpw, val, hash_val)
        is_valid = check == hash_val
        
        return is_valid
    
crypt_service = CryptService()