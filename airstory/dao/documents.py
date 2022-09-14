import airstory.dao


class Item(airstory.dao.AsItem):
    def __init__(self):
        self.project_id = None
        self.id = None
        self.title = None
        self.created = None
        self.type = None
        
    def get_item(self):
        item = airstory.dao.Item()
        item.keys = {
                'project_id': {'S': self.project_id},
                'id': {'S': self.id}
             }
        
        item.attributes = {
                'title': {'S': self.title},
                'created': {'N': str(self.created)}
            }
        
        #type is optional
        if self.type:
            item.attributes['type'] = {'S': self.type}
        
        return item
        
    def get_batch_item(self):
        item = self.get_item()
    
        return {'table': 'Documents', 'item': item}

class Crud(airstory.dao.Crud):
    def __init__(self, conn):
        super().__init__(conn, 'Documents')
        
    def generate_id(self):
        return 'd' + super().generate_id()
        
    def create(self, document):
        return super().create(document.get_item())
    
    async def retrieve(self, document):
        item = await super().retrieve(document.get_item())
        
        if item:
            document.project_id = item['project_id']['S']
            document.id = item['id']['S']
            document.title = item['title']['S']
            document.created = int(item['created']['N'])
            document.type = self._get_item_val(item, 'type', default='e')
        
            return document
        else:
            return None
    
    async def retrieve_all_by_project_id(self, project_id):
        response = await self.conn.query(
                TableName=self.table,
                KeyConditions={
                   'project_id': {
                        'AttributeValueList': [{
                            'S': project_id
                        }],
                       'ComparisonOperator': 'EQ'
                    }
                }
            )
        
        documents = []
        for item in response['Items']:
            document = Item()
            
            document.project_id = item['project_id']['S']
            document.id = item['id']['S']
            document.title = item['title']['S']
            document.created = int(item['created']['N'])
            document.type = self._get_item_val(item, 'type', default='e')
            
            documents.append(document)
        
        return documents
        
    def update(self, document):
        return super().update(document.get_item())
        
    def delete(self, document):
        return super().delete(document.get_item())