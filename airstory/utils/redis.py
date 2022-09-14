from concurrent.futures.thread import ThreadPoolExecutor
import logging
import uuid

import redis
from tornado.gen import coroutine
from tornado.process import cpu_count

from config import get_config


logger = logging.getLogger('airstory')

class RedisPipline:
    def __init__(self, pipe, executor):
        self.pipe = pipe
        self.executor = executor
     
    @coroutine    
    def watch(self, key):
        unique = str(uuid.uuid4())
        
        logger.info('RedisPipline:watch:request:' + unique)
        result = yield self.executor.submit(self.pipe.watch, key)
        logger.info('RedisPipline:watch:response:' + unique)
        logger.info(result)
        
        return result
      
    @coroutine   
    def multi(self):
        unique = str(uuid.uuid4())
        
        logger.info('RedisPipline:multi:request:' + unique)
        result = yield self.executor.submit(self.pipe.multi)
        logger.info('RedisPipline:multi:response:' + unique)
        logger.info(result)
        
        return result
        
    @coroutine 
    def execute(self):
        unique = str(uuid.uuid4())
        
        logger.info('RedisPipline:execute:request:' + unique)
        result = yield self.executor.submit(self.pipe.execute)
        logger.info('RedisPipline:execute:response:' + unique)
        logger.info(result)
        
        return result
        
    @coroutine 
    def reset(self):
        unique = str(uuid.uuid4())
        
        logger.info('RedisPipline:reset:request:' + unique)
        result = yield self.executor.submit(self.pipe.reset)
        logger.info('RedisPipline:reset:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def setnx(self, name, value):
        unique = str(uuid.uuid4())
        
        logger.info('RedisPipline:setnx:request:' + unique)
        logger.info(name + ':' + value)
        result = yield self.executor.submit(self.pipe.setnx, name, value)
        logger.info('RedisPipline:setnx:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def set(self, name, value):
        unique = str(uuid.uuid4())
        
        logger.info('RedisPipline:set:request:' + unique)
        logger.info(name + ':' + value)
        result = yield self.executor.submit(self.pipe.set, name, value)
        logger.info('RedisPipline:set:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def incr(self, name, amount=1):
        unique = str(uuid.uuid4())
        
        logger.info('RedisPipline:incr:request:' + unique)
        logger.info(name + ':' + str(amount))
        result = yield self.executor.submit(self.pipe.incr, name, amount)
        logger.info('RedisPipline:incr:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def get(self, name):
        unique = str(uuid.uuid4())
        
        logger.info('RedisPipline:get:request:' + unique)
        logger.info(name)
        result = yield self.executor.submit(self.pipe.get, name)
        logger.info('RedisPipline:get:response:' + unique)
        logger.info(result)
        
        return result

class RedisService:
    executor = ThreadPoolExecutor(max_workers=cpu_count())
    redis_client = redis.Redis(host=get_config()['redis']['host'], port=get_config()['redis']['port'], decode_responses=True, socket_timeout=get_config()['redis']['timeout'], socket_connect_timeout=get_config()['redis']['timeout'])
    
    WatchError = redis.WatchError
    
    @coroutine    
    def get(self, name):
        unique = str(uuid.uuid4())
        
        logger.info('RedisService:get:request:' + unique)
        logger.info(name)
        result = yield self.executor.submit(self.redis_client.get, name)
        logger.info('RedisService:get:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def delete(self, *name):
        unique = str(uuid.uuid4())
        
        logger.info('RedisService:delete:request:' + unique)
        logger.info(name)
        result = yield self.executor.submit(self.redis_client.delete, *name)
        logger.info('RedisService:delete:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def setnx(self, name, value):
        unique = str(uuid.uuid4())
        
        logger.info('RedisService:setnx:request:' + unique)
        logger.info(name + ':' + str(value))
        result = yield self.executor.submit(self.redis_client.setnx, name, value)
        logger.info('RedisService:setnx:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def hset(self, name, key, value):
        unique = str(uuid.uuid4())
        
        logger.info('RedisService:hset:request:' + unique)
        logger.info(name + ':' + key + ':' + str(value))
        result = yield self.executor.submit(self.redis_client.hset, name, key, value)
        logger.info('RedisService:hset:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def hget(self, name, key):
        unique = str(uuid.uuid4())
        
        logger.info('RedisService:hget:request:' + unique)
        logger.info(name + ':' + key)
        result = yield self.executor.submit(self.redis_client.hget, name, key)
        logger.info('RedisService:hget:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def set(self, name, value):
        unique = str(uuid.uuid4())
        
        logger.info('RedisService:set:request:' + unique)
        logger.info(name + ':' + str(value))
        result = yield self.executor.submit(self.redis_client.set, name, value)
        logger.info('RedisService:set:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def setex(self, name, value, time):
        unique = str(uuid.uuid4())
        
        logger.info('RedisService:setex:request:' + unique)
        logger.info(name + ':' + str(value))
        result = yield self.executor.submit(self.redis_client.setex, name, value, time)
        logger.info('RedisService:setex:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def sadd(self, name, value):
        unique = str(uuid.uuid4())
        
        logger.info('RedisService:sadd:request:' + unique)
        logger.info(name + ':' + value)
        result = yield self.executor.submit(self.redis_client.sadd, name, value)
        logger.info('RedisService:sadd:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def srem(self, name, value):
        unique = str(uuid.uuid4())
        
        logger.info('RedisService:srem:request:' + unique)
        logger.info(name + ':' + value)
        result = yield self.executor.submit(self.redis_client.srem, name, value)
        logger.info('RedisService:srem:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def smembers(self, name):
        unique = str(uuid.uuid4())
        
        logger.info('RedisService:smembers:request:' + unique)
        logger.info(name)
        result = yield self.executor.submit(self.redis_client.smembers, name)
        logger.info('RedisService:smembers:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def incr(self, name, amount=1):
        unique = str(uuid.uuid4())
        
        logger.info('RedisService:incr:request:' + unique)
        logger.info(name + ':' + str(amount))
        result = yield self.executor.submit(self.redis_client.incr, name, amount)
        logger.info('RedisService:incr:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def publish(self, channel, message):
        unique = str(uuid.uuid4())
        
        logger.info('RedisService:publish:request:' + unique)
        logger.info(channel)
        result = yield self.executor.submit(self.redis_client.publish, channel, message)
        logger.info('RedisService:publish:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine
    def pipeline(self):
        unique = str(uuid.uuid4())
        
        #TODO: find out if transaction is blocking
        logger.info('RedisService:pipeline:request:' + unique)
        result = yield self.executor.submit(self.redis_client.pipeline)
        logger.info('RedisService:pipeline:response:' + unique)
        logger.info(result)
        
        return RedisPipline(result, self.executor)
    
redis_service = RedisService()