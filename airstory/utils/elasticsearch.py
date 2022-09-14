import uuid

from tornado.concurrent import Future
from tornado.gen import coroutine

from airstory.utils import logger
from config import get_config
from tornadoes import ESConnection


class ElasticsearchService:
    elasticsearch = ESConnection(host=get_config()['es']['host'], port=get_config()['es']['port'])
    
    @coroutine    
    def delete(self, index, mtype, uid, parameters=None, callback=None):
        unique = str(uuid.uuid4())
        
        logger.info('ElasticsearchService:delete:request:' + unique)
        logger.info(index + ":" + mtype + ":" + uid)
        result = yield self.elasticsearch.delete(index, mtype, uid, parameters, callback)
        logger.info('ElasticsearchService:delete:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def put(self, index, mtype, uid, contents, parameters=None, callback=None):
        unique = str(uuid.uuid4())
        
        logger.info('ElasticsearchService:put:request:' + unique)
        logger.info(index + ":" + mtype + ":" + uid)
        result = yield self.elasticsearch.put(index, mtype, uid, contents, parameters=parameters, callback=callback)
        logger.info('ElasticsearchService:put:response:' + unique)
        logger.info(result)
        
        return result
     
    @coroutine   
    def get(self, index, mtype, uid, callback=None, parameters=None):
        unique = str(uuid.uuid4())
        
        logger.info('ElasticsearchService:get:request:' + unique)
        logger.info(index + ":" + mtype + ":" + uid)
        result = yield self.elasticsearch.get(index, mtype, uid, callback=callback, parameters=parameters)
        logger.info('ElasticsearchService:get:response:' + unique)
        logger.info(result)
        
        return result
    
    @coroutine    
    def search(self, callback=None, **kwargs):
        unique = str(uuid.uuid4())
        
        logger.info('ElasticsearchService:search:request:' + unique)
        result = yield self.elasticsearch.search(callback=callback, **kwargs)
        logger.info('ElasticsearchService:search:response:' + unique)
        logger.info(result)
        
        return result
    
    
elasticsearch_service = ElasticsearchService()