import airstory.dao
from airstory.utils import to_json, from_json
from config import get_config


class Item(airstory.dao.AsItem):
    def __init__(self):
        self.id = None
        self.content = None
        self.version = 0

class Crud(airstory.dao.BaseTable):
    def __init__(self, conn):
        self.conn = conn
        self.bucket = get_config()['s3']['ot-bucket']
        
    async def create(self, snapshot):
        body = to_json({'version': snapshot.version, 'content': snapshot.content})
        
        #TODO: Setup a way to check that the file doesnt already exist before writing
        response = await self.conn.put_object(ACL='private',
                                                  Bucket=self.bucket,
                                                  Key=snapshot.id,
                                                  Body=body)
        
        completed = self.check_response(response)
        
        return completed
        
    async def retrieve(self, snapshot):
        response = await self.conn.get_object(Bucket=self.bucket,
                                                Key=snapshot.id)
        if self.check_response(response):
            body = from_json(response['Body'].read().decode('utf-8'))

            snapshot.content = body['content']
            snapshot.version = body['version']
            
            return snapshot
        else:
            return None
        
    async def update(self, snapshot):
        body = to_json({'version': snapshot.version, 'content': snapshot.content})
        
        #TODO: Setup a way to check that the file exists before writing
        response = await self.conn.put_object(ACL='private',
                                                  Bucket=self.bucket,
                                                  Key=snapshot.id,
                                                  Body=body)
        
        completed = self.check_response(response)
        
        return completed
        
    async def delete(self, snapshot):
        #TODO: Setup a way to check that the file exists before deleting
        response = await self.conn.delete_object(Bucket=self.bucket,
                                                     Key=snapshot.id)
        
        completed = self.check_response(response)
        
        return completed