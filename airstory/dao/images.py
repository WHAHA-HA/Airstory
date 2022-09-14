import airstory.dao
from airstory.utils import logger, from_json
from airstory.utils.elasticsearch import elasticsearch_service
from config import get_config


class Item(airstory.dao.AsItem):
    def __init__(self):
        self.ref_id = None
        self.id = None
        self.created = None
        self.name = None
        self.height = None
        self.width = None
        self.user_id = None
        self.caption = None
        self.state = None
        
    def get_item(self):
        item = airstory.dao.Item()
        item.keys = {
                'ref_id': {'S': self.ref_id},
                'id': {'S': self.id}
             }
        
        item.attributes = {
                'created': {'N': str(self.created)},
                'name': {'S': self.name},
                'height': {'N': str(self.height)},
                'width': {'N': str(self.width)}
            }
            
        if self.user_id:
            item.attributes['user_id'] = {'S': self.user_id}
            
        if self.caption:
            item.attributes['caption'] = {'S': self.caption}
            
        if self.state:
            item.attributes['state'] = {'S': self.state}
        
        return item
        
    def get_batch_item(self):
        item = self.get_item()
    
        return {'table': 'Images', 'item': item}

class Crud(airstory.dao.Crud):
    def __init__(self, conn):
        super().__init__(conn, 'Images')
        
    def generate_id(self):
        return 'i' + str(super().timestamp()) + super().generate_id()
        
    def create(self, image):
        return super().create(image.get_item())
    
    async def search(self, ref_ids, srch, frm=0):
        page_size = get_config()['app']['page_size']
        
        ref_id_matches = []
        for ref_id in ref_ids:
            ref_id_matches.append({
                        'match': {
                            'ref_id': ref_id
                        }
                    })
            
        source = {
                    '_source': ['ref_id', 'id', 'name', 'height', 'width', 'created', 'user_id', 'caption', 'state'],
                    'query': {
                        'bool': {
                            'must': [
                                { 'bool': {
                                    'should': ref_id_matches,
                                    'minimum_should_match': 1
                                }   
                            }]
                        }
                        
                    },
                    'size': page_size,
                    'from': frm,
                    'sort': [{'created': 'desc'}]
                }
        
        if srch:
            search_query = {
                'bool': { 
                    'should': [
                            {
                                'query_string': {
                                    'query': 'name:' + srch
                                }
                            },
                            {
                                'match_phrase' : {
                                    'caption': {
                                        'query': srch,
                                        'boost': 3
                                    }
                                }
                             }
                    ],
                    'minimum_should_match': 1
                }
            }
            source['query']['bool']['must'].append(search_query)
            
            source['sort'] = ['_score', {'created': 'desc'}]
            
        logger.info(source)
        
        results = await elasticsearch_service.search(index='airstory', type='images', source=source)
        logger.info(results)
        
        body = results.buffer.read()
        logger.info(body)
        
        #TODO: check for a 200 code
        response = from_json(body)
        
        images = []
        
        if 'hits' in response and 'hits' in response['hits']:
            for hit in response['hits']['hits']:
                item = hit['_source']
                
                image = Item()
                
                image.ref_id = item['ref_id']
                image.id = item['id']
                image.created = int(item['created'])
                image.name = item.get('name')
                image.height = int(item['height'])
                image.width = int(item['width'])
                image.user_id = item.get('user_id')
                image.caption = item.get('caption')
                image.state = item.get('state')
                
                images.append(image)
        
        next_start = None
        
        if len(images) == page_size:
            next_start = {'start': frm + page_size}
        
        #TODO: Rename callers from 'last_name' to 'next_start'
        return images, next_start
    
    async def retrieve(self, image):
        item = await super().retrieve(image.get_item())
        
        if item:
            image.ref_id = item['ref_id']['S']
            image.id = item['id']['S']
            image.created = int(item['created']['N'])
            image.name = item['name']['S']
            image.height = int(item['height']['N'])
            image.width = int(item['width']['N'])
            image.user_id = self._get_item_val(item, 'user_id')
            image.caption = self._get_item_val(item, 'caption')
            image.state = self._get_item_val(item, 'state')
        
            return image
        else:
            return None
        
    async def _all_by_ref_id(self, query):
        response = await self.conn.query(**query)
        
        images = []
        for item in response['Items']:
            image = Item()
            
            image.ref_id = item['ref_id']['S']
            image.id = item['id']['S']
            image.created = int(item['created']['N'])
            image.name = item['name']['S']
            image.height = int(item['height']['N'])
            image.width = int(item['width']['N'])
            image.user_id = self._get_item_val(item, 'user_id')
            image.caption = self._get_item_val(item, 'caption')
            image.state = self._get_item_val(item, 'state')
            
            images.append(image)
        
        last_key = None
        
        if 'LastEvaluatedKey' in response:
            last_key = {}
            
            for key, value in response['LastEvaluatedKey'].items():
                last_key[key] = value['S']
        
        return images, last_key
        
    async def retrieve_all_by_ref_id(self, ref_id):
        query = {
            'TableName': self.table,
            'KeyConditions': {
               'ref_id': {
                    'AttributeValueList': [{
                        'S': ref_id
                    }],
                   'ComparisonOperator': 'EQ'
                }
            }   
        }
        
        #TODO: If last_key is returned, loop till we have everything
        images, _ = await self._all_by_ref_id(query)
    
        return images
        
    async def paginate_all_by_ref_id(self, ref_id, attr):
        page_size = get_config()['app']['page_size']
        
        query = {
            'TableName': self.table,
            'KeyConditions': {
               'ref_id': {
                    'AttributeValueList': [{
                        'S': ref_id
                    }],
                   'ComparisonOperator': 'EQ'
                }
            },
            'ScanIndexForward': False,
            'Limit': page_size
        }
        
        if attr and 'start_ref_id' in attr and 'start_id' in attr:
            query['ExclusiveStartKey'] = {'ref_id': {'S': attr['start_ref_id']}, 'id': {'S': attr['start_id']}}
    
        response = await self._all_by_ref_id(query)
    
        return response
    
    def update(self, image):
        return super().update(image.get_item())
        
    def delete(self, image):
        return super().delete(image.get_item())