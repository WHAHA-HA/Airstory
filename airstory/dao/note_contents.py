import airstory.dao


class Item(airstory.dao.AsItem):
    def __init__(self):
        self.ref_id = None
        self.note_id = None
        self.content = None
        
    def get_item(self):
        item = airstory.dao.Item()
        item.keys = {
                'ref_id': {'S': self.ref_id},
                'note_id': {'S': self.note_id}
             }
        
        item.attributes = {
                'content': {'S': self.content}
            }
        
        return item
    
    def get_batch_item(self):
        item = self.get_item()
    
        return {'table': 'NoteContents', 'item': item}

class Crud(airstory.dao.Crud):
    def __init__(self, conn):
        super().__init__(conn, 'NoteContents')
        
    def create(self, note_content):
        return super().create(note_content.get_item())
       
    async def retrieve(self, note_content):
        item = await super().retrieve(note_content.get_item())
        
        if item:
            note_content.ref_id = item['ref_id']['S']
            note_content.note_id = item['note_id']['S']
            note_content.content = item['content']['S']
        
            return note_content
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
        
        note_contents = []
        for item in response['Items']:
            note_content = Item()
            
            note_content.ref_id = item['ref_id']['S']
            note_content.note_id = item['note_id']['S']
            note_content.content = item['content']['S']
            
            note_contents.append(note_content)
        
        return note_contents
        
    def update(self, note_content):
        return super().update(note_content.get_item())
        
    def delete(self, note_content):
        return super().delete(note_content.get_item())