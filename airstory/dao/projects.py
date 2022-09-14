import airstory.dao
from airstory.utils import logger, from_json
from airstory.utils.elasticsearch import elasticsearch_service


class Item(airstory.dao.AsItem):
    def __init__(self):
        self.id = None
        self.title = None
        self.description = None
        self.status = None
        self.user_id = None
        self.created = None
        self.updated = None
        self.deadline = None
        
    def get_item(self):
        item = airstory.dao.Item()
        item.keys = {
                'id': {'S': self.id}
             }
        
        item.attributes = {
                'title': {'S': self.title},
                'description': {'S': self.description}
            }
        
        #optional
        if self.status:
            item.attributes['status'] = {'S': self.status}
            
        if self.user_id:
            item.attributes['user_id'] = {'S': self.user_id}
            
        if self.created:
            item.attributes['created'] = {'N': str(self.created)}
            
        if self.updated:
            item.attributes['updated'] = {'N': str(self.updated)}
            
        if self.deadline:
            item.attributes['deadline'] = {'S': self.deadline}
        
        return item
    
    def get_batch_item(self):
        item = self.get_item()
    
        return {'table': 'Projects', 'item': item}
        

class Crud(airstory.dao.Crud):
    def __init__(self, conn):
        super().__init__(conn, 'Projects')
        
    def create(self, project):
        return super().create(project.get_item())
    
    def generate_id(self):
        return 'p' + super().generate_id()
    
    async def retrieve(self, project):
        item = await super().retrieve(project.get_item())
        
        if item:
            project.id = item['id']['S']
            project.title = item['title']['S']
            project.description = item['description']['S']
            project.status = self._get_item_val(item, 'status')
            project.user_id = self._get_item_val(item, 'user_id')
            project.created = self._get_item_val(item, 'created', item_type='N', default=0)
            project.updated = self._get_item_val(item, 'updated', item_type='N', default=0)
            project.deadline = self._get_item_val(item, 'deadline')
        
            return project
        else:
            return None
        
    def update(self, project):
        return super().update(project.get_item())
        
    def delete(self, project):
        return super().delete(project.get_item())
    
    async def search(self, ids, srch):
        id_matches = []
        for i in ids:
            id_matches.append({
                        'match_phrase': {
                            'id': i
                        }
                    })
            
        source = {
                    '_source': ['id', 'title', 'description', 'status', 'user_id', 'created', 'updated', 'deadline'],
                    'query': {
                        'bool': {
                            'must': [
                                { 'bool': {
                                    'should': id_matches,
                                    'minimum_should_match': 1
                                }   
                            }]
                        }
                        
                    }
                }
        
        if srch:
            search_query = {
                'bool': { 
                    'should': [
                            {
                                'match_phrase' : {
                                    'title': {
                                        'query': srch
                                    }
                                }
                             },
                            {
                                'match': {
                                    'description': {
                                        'query': srch
                                    }
                                }
                            },
                            {
                                'match': {
                                    'author': {
                                        'query': srch
                                    }
                                }
                            }
                    ],
                    'minimum_should_match': 1
                }
            }

            source['query']['bool']['must'].append(search_query)
            
        logger.info(source)
        
        results = await elasticsearch_service.search(index='airstory', type='projects', source=source)
        logger.info(results)
        
        body = results.buffer.read()
        logger.info(body)
        
        #TODO: check for a 200 code
        response = from_json(body)
        
        projects = []
        
        for hit in response['hits']['hits']:
            item = hit['_source']
            
            project = Item()
            
            project.id = item['id']
            project.title = item['title']
            project.description = item['description']
            project.status = item.get('status')
            project.user_id = item.get('user_id')
            project.created = int(item.get('created'))
            project.updated = int(item.get('updated'))
            project.deadline = item.get('deadline')
            
            projects.append(project)
        
        return projects