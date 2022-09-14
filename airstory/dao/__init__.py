import time
import uuid

from botocore.exceptions import ClientError
from tornado import gen

from airstory.utils import logger


class Item:
    def __init__(self):
        self.keys = None
        self.attributes = None
        
class AsItem:
    def to_dict(self):
        return self.__dict__
    
class BaseTable:
    def generate_id(self):
        return str(uuid.uuid4())
    
    def timestamp(self):
        return int(time.time())
        
    def check_response(self, response):
        return response['ResponseMetadata']['HTTPStatusCode'] == 200 or response['ResponseMetadata']['HTTPStatusCode'] == 204

class Crud(BaseTable):
    
    def __init__(self, conn, table_name):
        self.conn = conn
        self.table = table_name
        
    def _get_item_val(self, item, key, item_type='S', default=None):
        if key in item:
            if item_type == 'N':
                return int(item[key][item_type])
            else:
                return item[key][item_type]
        else:
            return default
    
    async def create(self, item):
        citem = item.keys.copy()
        citem.update(item.attributes)
        
        expected = {}
        
        for key in item.keys:
            expected[key] = {'Exists': False}
        
        try:
            response = await self.conn.put_item(
               TableName=self.table,
               Item=citem,
               Expected=expected
            )
        
            completed = self.check_response(response)
        except ClientError:
            logger.exception('Crud:create')
            completed = False
        
        return completed
    
    async def retrieve(self, item):
        item = await self.conn.get_item(                                  
            TableName=self.table,
            Key=item.keys
        )
        
        if 'Item' in item:
            response = item['Item']
        else:
            response = None
            
        return response
        
    async def update(self, item):
        citem = item.keys.copy()
        citem.update(item.attributes)

        expected = {}
        
        for key in item.keys:
            expected[key] = {'Value': item.keys[key]}
        
        try:
            response = await self.conn.put_item(
               TableName=self.table,
               Item=citem,
               Expected=expected
            )
            
            completed = self.check_response(response)
        except ClientError:
            logger.exception('Crud:update')
            completed = False
        
        return completed
    
    async def delete(self, item):
        response = await self.conn.delete_item(
            TableName=self.table,
            Key=item.keys
        )
        
        return self.check_response(response)
    
class BatchRead:
    def __init__(self, conn):
        #TODO: Must be configurable!
        self.dynamodb = conn
        self.batch_read = []
         
    def add_batch_read(self, item):
        self.batch_read.append(item.get_batch_item())
        
    async def run_batch(self):
        responses = []

        while len(self.batch_read) > 0:
            request_items = {}
            for _ in range(25):
                if len(self.batch_read) > 0:
                    table_item = self.batch_read.pop()
                    
                    if table_item['table'] not in request_items:
                        request_items[table_item['table']] = {'Keys': [table_item['item'].keys]}
                    else:
                        request_items[table_item['table']]['Keys'].append(table_item['item'].keys)
                else:
                    break
            
            if len(request_items) > 0:
                try:
                    response = await self.dynamodb.batch_get_item(RequestItems=request_items)
                except: #IGNORE:bare-except
                    logger.exception('BatchRead:run_batch')
                    return None
                
                if response['ResponseMetadata']['HTTPStatusCode'] != 200:
                    return None
                else:
                    responses += response['Responses'][table_item['table']]
            else:
                return None
        
        logger.info(responses)
        return responses

class BatchWrite:   
    def __init__(self, conn):
        #TODO: Must be configurable!
        self.dynamodb = conn
        
        #TODO: Should I be using tornado's queue?
        self.batch_write = []
        self.batch_delete = []
         
    def add_batch_write(self, item):
        self.batch_write.append(item.get_batch_item())
        
    def add_batch_delete(self, item):
        self.batch_delete.append(item.get_batch_item())
        
    async def run_batch(self):
        while len(self.batch_write) > 0 or len(self.batch_delete) > 0:
            request_items = {}
            for _ in range(25):
                if len(self.batch_write) > 0:
                    #When writing, start at the beginning of list as it will be the most significant
                    table_item = self.batch_write.pop(0)
                    
                    item = table_item['item'].keys.copy()
                    item.update(table_item['item'].attributes)
                    
                    request = {'PutRequest': {'Item': item}}
                        
                elif len(self.batch_delete) > 0:
                    #When deleting, start at the end of the list as it will be least significant
                    table_item = self.batch_delete.pop()
                    
                    request = {'DeleteRequest': {'Key': table_item['item'].keys}}
                else:
                    break
                
                if table_item['table'] in request_items:
                    request_items[table_item['table']].append(request)
                else:
                    request_items[table_item['table']] = [request]
            
            try:
                logger.info(request_items)
                response = await self.dynamodb.batch_write_item(RequestItems=request_items)
                logger.info(response)
            except: #IGNORE:bare-except
                logger.exception('BatchWrite:run_batch: Writing objects')
                return False
            
            if response['ResponseMetadata']['HTTPStatusCode'] != 200:
                return False
            
            try:
                unprocessed_items = response['UnprocessedItems']
                #TODO: Use exponential back off
                while unprocessed_items and len(unprocessed_items) > 0:
                    await gen.sleep(5)
                    logger.info(unprocessed_items)
                    response = await self.dynamodb.batch_write_item(RequestItems=unprocessed_items)
                    logger.info(response)
                    unprocessed_items = response['UnprocessedItems']
            except: #IGNORE:bare-except
                logger.exception('BatchWrite:run_batch: Writing unprocessed objects')
                return False
            
        return True