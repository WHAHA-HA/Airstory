import copy

from tornado import gen

import airstory.dao.ops
import airstory.dao.snapshots
from airstory.utils import get_dynamodb_connection, get_s3_connection, to_json, \
    from_json, logger
from airstory.utils.redis import redis_service
from botocore.vendored.requests.models import CONTENT_CHUNK_SIZE


class AwsBackend:
    '''A backend that stores everything in either AWS S3 (snapshots) or DynamoDB (ops)
    '''

    def __init__(self, ottype, document_id):
        self.document_id = document_id
        self.ottype = ottype
        
        self.dynamodb = get_dynamodb_connection()
        self.s3 = get_s3_connection()
        self.ops_crud = airstory.dao.ops.Crud(self.dynamodb)
        self.snapshots_crud = airstory.dao.snapshots.Crud(self.s3)

    async def save_operation(self, user_id, version, operation):
        '''Save an operation in the database.'''
        
        operation = to_json(operation)
        count = 0
        
        while len(operation) > 0:
            op = airstory.dao.ops.Item()
            
            op.document_id = self.document_id
            op.version = version
            
            if count > 0:
                op.version = op.version + (0.001 * count)
            
            op.operation = operation[:350000]
            
            operation = operation[350000:]
            
            completed = await self.ops_crud.create(op)
            
            count += 1
            
            if not completed:
                #TODO: Delete any records that were able to be written
                break
        
        if completed:
            # Set to expire in a week
            await redis_service.setex('last-' + self.document_id + '-' + user_id, version, 604800)
        
        return completed

    async def get_operations(self, start, clean=True):
        '''Return operations in a given range.'''
        ops = await self.ops_crud.retrieve_all_after_version(self.document_id, start)
        
        if clean:
            operations = []
            version = -1
            
            for op in ops:
                if version == -1 or op.version >= version + 1:
                    op.version = int(op.version)
                    operations.append(op)
                    version = op.version
                else:
                    operations[-1].operation += op.operation
            
            return operations
        else:
            return ops

    async def get_last_version_from_user(self, user_id):
        '''Return the revision number of the last operation from a given user.'''
        last_version = await redis_service.get('last-' + self.document_id + '-' + user_id)
        
        if last_version:
            return int(last_version)
        else:
            return None
        
    async def save_snapshot(self):
        snapshot = await self.retrieve_snapshot()
            
        await self.snapshots_crud.update(snapshot)
        
    async def retrieve_snapshot(self, revert=False):
        snapshot = airstory.dao.snapshots.Item()
        snapshot.id = self.document_id
        
        await self.snapshots_crud.retrieve(snapshot)
        
        base_version = snapshot.version
        count = 1
        
        concurrent_operations = await self.get_operations(snapshot.version+1)
        for concurrent_operation in concurrent_operations:
            if base_version + count == concurrent_operation.version:
                try:
                    op = from_json(concurrent_operation.operation)
                    self.ottype.apply(snapshot.content, op)
                except Exception as e:
                    if revert:
                        
                        count = await redis_service.incr(self.document_id + '-reverts')
                        
                        remove_operations = await self.get_operations(concurrent_operation.version, False)
                        
                        for remove_operation in remove_operations:
                            await self.ops_crud.delete(remove_operation)
                        
                        break
                    else:
                        raise e
                snapshot.version = concurrent_operation.version
                count += 1
            else:
                break
            
        return snapshot
        
    async def retrieve_version(self):
        version = await self.ops_crud.retrieve_latest_version(self.document_id)
            
        return version
    
    async def create_snapshot(self, content=None):
        snapshot = airstory.dao.snapshots.Item()
        
        snapshot.id = self.document_id
        snapshot.content = content
        snapshot.version = -1
        
        if content == None:
            snapshot.content = []
            
        await self.snapshots_crud.create(snapshot)

class Server:
    '''Receives operations from clients, transforms them against all
    concurrent operations and sends them back to all clients.
    '''

    def __init__(self, backend):
        self.backend = backend

    async def receive_operation(self, user_id, version, operation):
        '''Transforms an operation coming from a client against all concurrent
        operation, applies it to the current document and returns the operation
        to send to the clients.
        '''
        
        attempts = 0
        
        while True:  
            v = version
            base_version = v
            
            last_by_user = await self.backend.get_last_version_from_user(user_id)
            if last_by_user and last_by_user >= v:
                return None, None, None
            
            count = 0
            
            op = copy.deepcopy(operation)
    
            concurrent_operations = await self.backend.get_operations(v)
            for concurrent_operation in concurrent_operations:
                if base_version + count == concurrent_operation.version:
                    op = self.backend.ottype.transform(op, from_json(concurrent_operation.operation), 'left')
                    v = concurrent_operation.version + 1
                    count += 1
                else:
                    break
                
            completed = await self.backend.save_operation(user_id, v, op)
            
            if not completed:
                logger.info('Reattempting Save Operation: ' + str(attempts))
                
                if attempts < 6:
                    attempts += 1
                    await gen.sleep(attempts * 0.5)
                    
                    continue
                else:
                    logger.info(op)
                    raise Exception('Save Operation failed, aborting')
                
            logger.info('Save Operation')
            
            break
        
        return op, v, concurrent_operations