import airstory.dao


class Item(airstory.dao.AsItem):
    def __init__(self):
        self.ref_id = None
        self.id = None
        self.created = None
        self.content = None
        self.user_id = None
        self.link = None
        
    def get_item(self):
        item = airstory.dao.Item()
        item.keys = {
                'ref_id': {'S': self.ref_id},
                'id': {'S': self.id}
             }
        
        item.attributes = {
                'created': {'N': str(self.created)},
                'content': {'S': self.content},
                'user_id': {'S': self.user_id},
                'link': {'S': self.link}
            }
        
        return item
    
    def get_batch_item(self):
        item = self.get_item()
    
        return {'table': 'Comments', 'item': item}

class Crud(airstory.dao.Crud):
    def __init__(self, conn):
        super().__init__(conn, 'Comments')
        
    def generate_id(self):
        return 'co' + super().generate_id()
        
    def create(self, comment):
        return super().create(comment.get_item())
    
    async def retrieve(self, comment):
        item = await super().retrieve(comment.get_item())
        
        if item:
            comment.ref_id = item['ref_id']['S']
            comment.id = item['id']['S']
            comment.created = int(item['created']['N'])
            comment.content = item['content']['S']
            comment.user_id = item['user_id']['S']
            comment.link = item['link']['S']
        
            return comment
        else:
            return None
    
    async def retrieve_all_by_ref_id(self, ref_id):
        response = await self.conn.query(
                TableName=self.table,
                KeyConditions={
                   'ref_id': {
                        'AttributeValueList': [{
                            'S': ref_id
                        }],
                       'ComparisonOperator': 'EQ'
                    }
                }
            )
        
        comments = []
        for item in response['Items']:
            comment = Item()
            
            comment.ref_id = item['ref_id']['S']
            comment.id = item['id']['S']
            comment.created = int(item['created']['N'])
            comment.content = item['content']['S']
            comment.user_id = item['user_id']['S']
            comment.link = item['link']['S']
            
            comments.append(comment)
        
        return comments
        
    def update(self, comment):
        return super().update(comment.get_item())
        
    def delete(self, comment):
        return super().delete(comment.get_item())