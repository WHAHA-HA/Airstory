import airstory.dao
from airstory.utils import from_json, logger
from airstory.utils.elasticsearch import elasticsearch_service
from config import get_config


class Item(airstory.dao.AsItem):
    def __init__(self):
        self.ref_id = None
        self.id = None
        self.created = None
        self.title = None
        self.display_content = None
        self.tags = []
        self.citations = []
        self.user_id = None
        self.state = None
        
    def get_item(self):
        item = airstory.dao.Item()
        item.keys = {
                'ref_id': {'S': self.ref_id},
                'id': {'S': self.id}
             }
        
        item.attributes = {
                'created': {'N': str(self.created)},
                'display_content': {'S': self.display_content}
            }
        
        #optional
        if self.title:
            item.attributes['title'] = {'S': self.title}
            
        if self.tags:
            item.attributes['tags'] = {'SS': self.tags}
            
        if self.user_id:
            item.attributes['user_id'] = {'S': self.user_id}
            
        if self.state:
            item.attributes['state'] = {'S': self.state}
            
        if self.citations:
            citations = []
            
            for citation in self.citations:
                c = {}
                
                if 'page_title' in citation and citation['page_title']:
                    c['page_title'] = {'S': citation['page_title']}
                    
                if 'author' in citation and citation['author']:
                    c['author'] = {'S': citation['author']}
                    
                if 'url' in citation and citation['url']:
                    c['url'] = {'S': citation['url']}
                    
                if 'article_title' in citation and citation['article_title']:
                    c['article_title'] = {'S': citation['article_title']}
                    
                if 'publication_date' in citation and citation['publication_date']:
                    c['publication_date'] = {'S': citation['publication_date']}
                
                citations.append({'M': c})
                
            item.attributes['citations'] = {'L': citations}
        
        return item
        
    def get_batch_item(self):
        item = self.get_item()
    
        return {'table': 'Notes', 'item': item}

class Crud(airstory.dao.Crud):
    def __init__(self, conn):
        super().__init__(conn, 'Notes')
        
    def generate_id(self):
        return 'n' + str(super().timestamp()) + super().generate_id()
        
    def create(self, note):
        return super().create(note.get_item())
    
    async def search(self, ref_ids, srch, frm=0):
        page_size = get_config()['app']['page_size']
        
        ref_id_matches = []
        for ref_id in ref_ids:
            ref_id_matches.append({
                        'match_phrase': {
                            'ref_id': ref_id
                        }
                    })
            
        source = {
                    '_source': ['ref_id', 'id', 'title', 'display_content', 'created', 'tags', 'citations', 'user_id', 'state'],
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
                                'match_phrase' : {
                                    'tags': {
                                        'query': srch,
                                        'boost': 3
                                    }
                                }
                             },
                            {
                                'match': {
                                    'title': {
                                        'query': srch,
                                        'boost': 2
                                    }
                                }
                            },
                            {
                                'match' : {
                                    'content': {
                                        'query': srch,
                                        'boost': 1
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
        
        results = await elasticsearch_service.search(index='airstory', type='notes', source=source)
        logger.info(results)
        
        body = results.buffer.read()
        logger.info(body)
        
        #TODO: check for a 200 code
        response = from_json(body)
        
        notes = []
        
        for hit in response['hits']['hits']:
            item = hit['_source']
            
            note = Item()
            
            note.ref_id = item['ref_id']
            note.id = item['id']
            note.created = int(item['created'])
            note.title = item.get('title')
            note.display_content = item['display_content']
            note.tags = item.get('tags')
            note.citations = item.get('citations')
            note.user_id = item.get('user_id')
            note.state = item.get('state')
            
            notes.append(note)
        
        next_start = None
        
        if len(notes) == page_size:
            next_start = {'start': frm + page_size}
        
        #TODO: Rename callers from 'last_name' to 'next_start'
        return notes, next_start
     
    async def retrieve(self, note):
        item = await super().retrieve(note.get_item())
        
        if item:
            note.ref_id = item['ref_id']['S']
            note.id = item['id']['S']
            note.created = int(item['created']['N'])
            note.title = self._get_item_val(item, 'title')
            note.display_content = item['display_content']['S']
            note.tags = self._get_item_val(item, 'tags', 'SS')
            note.citations = []
            note.user_id = self._get_item_val(item, 'user_id')
            note.state = self._get_item_val(item, 'state')
            
            citations = self._get_item_val(item, 'citations', 'L')
            
            if citations:
                for citation in citations:
                    c = citation['M']
                    
                    item = {}
                    
                    if 'page_title' in c:
                        item['page_title'] = c['page_title']['S']
                        
                    if 'author' in c:
                        item['author'] = c['author']['S']
                        
                    if 'url' in c:
                        item['url'] = c['url']['S']
                        
                    if 'article_title' in c:
                        item['article_title'] = c['article_title']['S']
                        
                    if 'publication_date' in c:
                        item['publication_date'] = c['publication_date']['S']
                        
                    note.citations.append(item)
        
            return note
        else:
            return None
        
    async def _all_by_ref_id(self, query):
        response = await self.conn.query(**query)
        
        notes = []
        for item in response['Items']:
            note = Item()
            
            note.ref_id = item['ref_id']['S']
            note.id = item['id']['S']
            note.created = int(item['created']['N'])
            note.title = self._get_item_val(item, 'title')
            note.display_content = item['display_content']['S']
            note.tags = self._get_item_val(item, 'tags', 'SS')
            note.citations = []
            note.user_id = self._get_item_val(item, 'user_id')
            note.state = self._get_item_val(item, 'state')
            
            citations = self._get_item_val(item, 'citations', 'L')
            
            if citations:
                for citation in citations:
                    c = citation['M']
                    
                    item = {}
                    
                    if 'page_title' in c:
                        item['page_title'] = c['page_title']['S']
                        
                    if 'author' in c:
                        item['author'] = c['author']['S']
                        
                    if 'url' in c:
                        item['url'] = c['url']['S']
                        
                    if 'article_title' in c:
                        item['article_title'] = c['article_title']['S']
                        
                    if 'publication_date' in c:
                        item['publication_date'] = c['publication_date']['S']
                        
                    note.citations.append(item)
            
            notes.append(note)
        
        last_key = None
        
        if 'LastEvaluatedKey' in response:
            last_key = {}
            
            for key, value in response['LastEvaluatedKey'].items():
                last_key[key] = value['S']
        
        return notes, last_key
        
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
        notes, _ = await self._all_by_ref_id(query)
    
        return notes
        
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
    
    def update(self, note):
        return super().update(note.get_item())
        
    def delete(self, note):
        return super().delete(note.get_item())