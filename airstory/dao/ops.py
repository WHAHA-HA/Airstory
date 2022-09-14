from decimal import Decimal

import airstory.dao


class Item(airstory.dao.AsItem):
    def __init__(self):
        self.document_id = None
        self.version = None
        self.operation = None
        
    def get_item(self):
        item = airstory.dao.Item()
        item.keys = {
                'document_id': {'S': self.document_id},
                'version': {'N': str(self.version)}
             }
        
        item.attributes = {
                'operation': {'S': self.operation}
            }
        
        return item
        
    def get_batch_item(self):
        item = self.get_item()
    
        return {'table': 'Ops', 'item': item}

class Crud(airstory.dao.Crud):
    def __init__(self, conn):
        super().__init__(conn, 'Ops')
        
    def create(self, op):
        return super().create(op.get_item())
    
     
    async def retrieve(self, op):
        item = await super().retrieve(op.get_item())
        
        if item:
            op.document_id = item['document_id']['S']
            op.version = Decimal(item['version']['N'])
            op.operation = item['operation']['S']
        
            return op
        else:
            return None
        
    async def _all_by_id(self, query):
        ops = []
        
        while True:
            response = await self.conn.query(**query)
            
            for item in response['Items']:
                op = Item()
                
                op.document_id = item['document_id']['S']
                op.version = Decimal(item['version']['N'])
                op.operation = item['operation']['S']
                
                ops.append(op)
                
            if 'LastEvaluatedKey' in response and response['LastEvaluatedKey']:
                query['ExclusiveStartKey'] = response['LastEvaluatedKey']
            else:
                break
        
        return ops
        
    async def retrieve_all_by_document_id(self, document_id):
        query = {
            'TableName': self.table,
            'KeyConditions': {
               'document_id': {
                    'AttributeValueList': [{
                        'S': document_id
                    }],
                   'ComparisonOperator': 'EQ'
                }
            }   
        }
        
        ops = await self._all_by_id(query)
    
        return ops
        
    async def retrieve_all_after_version(self, document_id, version):
        query = {
            'TableName': self.table,
            'KeyConditions': {
               'document_id': {
                    'AttributeValueList': [{
                        'S': document_id
                    }],
                   'ComparisonOperator': 'EQ'
                },            
               'version': {
                    'AttributeValueList': [{
                        'N': str(version)
                    }],
                   'ComparisonOperator': 'GE'
                }
            }   
        }
        
        ops = await self._all_by_id(query)
    
        return ops
    
    async def retrieve_latest_version(self, document_id):
        query = {
            'TableName': self.table,
            'KeyConditions': {
               'document_id': {
                    'AttributeValueList': [{
                        'S': document_id
                    }],
                   'ComparisonOperator': 'EQ'
                }
            },  
            'ScanIndexForward': False, 
            'Limit': 1
        }
        
        ops = await self._all_by_id(query)
    
        if ops and len(ops) == 1:
            return ops[0]
        else:
            return ops
    
    
    def update(self, op):
        return super().update(op.get_item())
        
    def delete(self, op):
        return super().delete(op.get_item())