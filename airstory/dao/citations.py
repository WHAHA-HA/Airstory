import airstory.dao


class Item(airstory.dao.AsItem):
    def __init__(self):
        self.ref_id = None
        self.id = None
        self.page_title = None
        self.author = None
        self.url = None
        self.article_title = None
        self.publication_date = None
        
    def get_item(self):
        item = airstory.dao.Item()
        item.keys = {
                'ref_id': {'S': self.ref_id},
                'id': {'S': self.id}
             }
        
        item.attributes = {
            }
        
        #page_title is optional
        if self.page_title:
            item.attributes['page_title'] = {'S': self.page_title}
            
        #author is optional
        if self.author:
            item.attributes['author'] = {'S': self.author}
            
        #url is optional
        if self.url:
            item.attributes['url'] = {'S': self.url}
            
        #article_title is optional
        if self.article_title:
            item.attributes['article_title'] = {'S': self.article_title}
            
        #publication_date is optional
        if self.publication_date:
            item.attributes['publication_date'] = {'S': self.publication_date}
        
        return item
    
    def get_batch_item(self):
        item = self.get_item()
    
        return {'table': 'Citations', 'item': item}

class Crud(airstory.dao.Crud):
    def __init__(self, conn):
        super().__init__(conn, 'Citations')
        
    def generate_id(self):
        return 'ci' + super().generate_id()
        
    def create(self, comment):
        return super().create(comment.get_item())
    
    async def retrieve(self, comment):
        item = await super().retrieve(comment.get_item())
        
        if item:
            comment.ref_id = item['ref_id']['S']
            comment.id = item['id']['S']
            comment.page_title = self._get_item_val(item, 'page_title')
            comment.author = self._get_item_val(item, 'author')
            comment.url = self._get_item_val(item, 'url')
            comment.article_title = self._get_item_val(item, 'article_title')
            comment.publication_date = self._get_item_val(item, 'publication_date')
        
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
            comment.page_title = self._get_item_val(item, 'page_title')
            comment.author = self._get_item_val(item, 'author')
            comment.url = self._get_item_val(item, 'url')
            comment.article_title = self._get_item_val(item, 'article_title')
            comment.publication_date = self._get_item_val(item, 'publication_date')
            
            comments.append(comment)
        
        return comments
        
    def update(self, comment):
        return super().update(comment.get_item())
        
    def delete(self, comment):
        return super().delete(comment.get_item())