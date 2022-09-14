from concurrent.futures.thread import ThreadPoolExecutor
import logging
import uuid

import botocore.session
from tornado.gen import coroutine
from tornado.process import cpu_count
from botocore.config import Config


logger = logging.getLogger('airstory')


class AwsPaginate:
    def __init__(self, executor, paginator):
        self.executor = executor
        self.paginator = paginator
    
    @coroutine
    def paginate(self, **kwargs):
        unique = str(uuid.uuid4())
        
        logger.info('AwsPaginate:paginate:request:' + unique)
        result = yield self.executor.submit(self.paginator.paginate, **kwargs)
        logger.info('AwsPaginate:paginate:response:' + unique)
        
        return result

class AwsService:
    executor = ThreadPoolExecutor(max_workers=cpu_count())
    
    def __init__(self, client):
        self.client = client
    
    @coroutine    
    def get_item(self, **kwargs):
        unique = str(uuid.uuid4())
        
        logger.info('AwsService:get_item:request:' + unique)
        result = yield self.executor.submit(self.client.get_item, **kwargs)
        logger.info('AwsService:get_item:response:' + unique)
        
        return result
    
    @coroutine    
    def query(self, **kwargs):
        unique = str(uuid.uuid4())
        
        logger.info('AwsService:query:request:' + unique)
        result = yield self.executor.submit(self.client.query, **kwargs)
        logger.info('AwsService:query:response:' + unique)
        
        return result
       
    @coroutine    
    def put_item(self, **kwargs):
        unique = str(uuid.uuid4())
        
        logger.info('AwsService:put_item:request:' + unique)
        result = yield self.executor.submit(self.client.put_item, **kwargs)
        logger.info('AwsService:put_item:response:' + unique)
        
        return result
        
    @coroutine   
    def delete_item(self, **kwargs):
        unique = str(uuid.uuid4())
        
        logger.info('AwsService:delete_item:request:' + unique)
        result = yield self.executor.submit(self.client.delete_item, **kwargs)
        logger.info('AwsService:delete_item:response:' + unique)
        
        return result
       
    @coroutine    
    def put_object(self, **kwargs):
        unique = str(uuid.uuid4())
        
        logger.info('AwsService:put_object:request:' + unique)
        result = yield self.executor.submit(self.client.put_object, **kwargs)
        logger.info('AwsService:put_object:response:' + unique)
        
        return result
      
    @coroutine     
    def get_object(self, **kwargs):
        unique = str(uuid.uuid4())
        
        logger.info('AwsService:get_object:request:' + unique)
        result = yield self.executor.submit(self.client.get_object, **kwargs)
        logger.info('AwsService:get_object:response:' + unique)
        
        return result
      
    @coroutine     
    def delete_object(self, **kwargs):
        unique = str(uuid.uuid4())
        
        logger.info('AwsService:delete_object:request:' + unique)
        result = yield self.executor.submit(self.client.delete_object, **kwargs)
        logger.info('AwsService:delete_object:response:' + unique)
        
        return result
    
    @coroutine
    def batch_get_item(self, **kwargs):
        unique = str(uuid.uuid4())
        
        logger.info('AwsService:batch_get_item:request:' + unique)
        result = yield self.executor.submit(self.client.batch_get_item, **kwargs)
        logger.info('AwsService:batch_get_item:response:' + unique)
        
        return result
    
    @coroutine
    def batch_write_item(self, **kwargs):
        unique = str(uuid.uuid4())
        
        logger.info('AwsService:batch_write_item:request:' + unique)
        result = yield self.executor.submit(self.client.batch_write_item, **kwargs)
        logger.info('AwsService:batch_write_item:response:' + unique)
        
        return result
    
    def get_paginator(self, operation_name):
        paginator = self.client.get_paginator(operation_name)
        
        return AwsPaginate(self.executor, paginator)
        

class Aws:
    
    def __init__(self, service_name, region_name, endpoint_url):
        self.session = botocore.session.get_session()

        c = Config(s3={'addressing_style': 'path'})
        self.client = self.session.create_client(service_name, region_name=region_name, endpoint_url=endpoint_url, config=c)
        
    def get_service(self):
        return AwsService(self.client)