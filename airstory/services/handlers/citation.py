import airstory.dao.citations
from airstory.utils import get_dynamodb_connection, publish_project_message, \
    publish_user_message, init_response, logger, permissions_map


class BaseHandler:
    def __init__(self):
        self.dynamodb = get_dynamodb_connection()
        
        self.crud = airstory.dao.citations.Crud(self.dynamodb)
    
    def _lookup_citation(self, ref_id, citation_id):
        citation = airstory.dao.citations.Item()
        
        citation.ref_id = ref_id
        citation.id = citation_id
        
        return self.crud.retrieve(citation)
        
    def _lookup_user_project(self, user_id, project_id):
        user_project = airstory.dao.user_projects.Item()
        
        user_project.user_id = user_id
        user_project.project_id = project_id
        
        return airstory.dao.user_projects.Crud(self.dynamodb).retrieve(user_project)
    
    async def _valid_user(self, user_id, ref_id, min_level=1):
        if user_id:
            ref_type = ref_id[:1]
            composite_id = ref_id.split('|')
            
            if ref_type == 'u':
                #This is a citation on a user's library note
                return composite_id[0] == user_id
            elif ref_type == 'p':
                #This is a citation on either a project note or a document
                user_project = await self._lookup_user_project(user_id, composite_id[0])
    
                if user_project and permissions_map[user_project.permissions] >= min_level:
                    return True
        
        return False

class CitationHandler(BaseHandler):
      
    async def post(self, state, json):
        key = json['key']
        item = json['message']

        response = init_response(json)
        
        try:
            is_valid_user = await self._valid_user(state.user_id, key['ref_id'], min_level=3)
            if is_valid_user:
                citation = airstory.dao.citations.Item()
                
                citation.ref_id = key['ref_id']
                citation.id = self.crud.generate_id()
                citation.page_title = item.get('page_title')
                citation.author = item.get('author')
                citation.url = item.get('url')
                citation.article_title = item.get('article_title')
                citation.publication_date = item.get('publication_date')
                
                completed = await self.crud.create(citation)
                if completed:
                    response['code'] = 200
                    response['key']['id'] = citation.id
                    response['message'] = citation.to_dict()
                    
                    composite_id = citation.ref_id.split('|')
                    ref_type = composite_id[0][:1]
                    
                    if ref_type == 'p':
                        await publish_project_message(composite_id[0], response)
                    elif ref_type == 'u':
                        await publish_user_message(composite_id[0], response)
                else:
                    response['code'] = 500
            else:
                response['code'] = 401
        except: #IGNORE:bare-except
            logger.exception('CitationHandler:post')
            response['code'] = 500
             
        return response
      
    async def get(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['ref_id'])
            citation = await self._lookup_citation(key['ref_id'], key['id'])
            
            is_valid_user = await valid_user_future
                
            if citation:
                if is_valid_user:
                    response['code'] = 200
                    response['message'] = citation.to_dict()
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
                
        except: #IGNORE:bare-except
            logger.exception('CitationHandler:get')
            response['code'] = 500
            
        return response
                   
    async def put(self, state, json):
        key = json['key']
        item = json['message']

        response = init_response(json)
    
        try:
            valid_user_future = self._valid_user(state.user_id, key['ref_id'], min_level=3)
            citation = await self._lookup_citation(key['ref_id'], key['id'])
            
            is_valid_user = await valid_user_future
            
            if citation:
                if is_valid_user:
                        
                    citation.page_title = item.get('page_title')
                    citation.author = item.get('author')
                    citation.url = item.get('url')
                    citation.article_title = item.get('article_title')
                    citation.publication_date = item.get('publication_date')
                    
                    completed = await self.crud.update(citation)
                    if completed:
                        response['code'] = 200
                        response['message'] = citation.to_dict()
                    
                        composite_id = citation.ref_id.split('|')
                        ref_type = composite_id[0][:1]
                        
                        if ref_type == 'p':
                            await publish_project_message(composite_id[0], response)
                        elif ref_type == 'u':
                            await publish_user_message(composite_id[0], response)
                    else:
                        response['code'] = 500     
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('CitationHandler:put')
            response['code'] = 500
        
        return response
        
    async def delete(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['ref_id'], min_level=3)
            citation = await self._lookup_citation(key['ref_id'], key['id'])
            
            is_valid_user = await valid_user_future
            
            if citation:
                if is_valid_user:
                    batch = airstory.dao.BatchWrite(self.dynamodb)
                    
                    cascade_citation = airstory.dao.cascade.Citation(self.dynamodb, batch)
                    await cascade_citation.delete(citation)
                    
                    completed = await batch.run_batch()
                    if completed:
                        response['code'] = 200
                    
                        composite_id = citation.ref_id.split('|')
                        ref_type = composite_id[0][:1]
                        
                        if ref_type == 'p':
                            await publish_project_message(composite_id[0], response)
                        elif ref_type == 'u':
                            await publish_user_message(composite_id[0], response)
                    else:
                        response['code'] = 500
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('CitationHandler:delete')
            response['code'] = 500
        
        return response
    
class CitationsHandler(BaseHandler):
    
    def _lookup_citations(self, ref_id):
        return self.crud.retrieve_all_by_ref_id(ref_id)
     
    async def get(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['ref_id'])
            citations = await self._lookup_citations(key['ref_id'])
            
            is_valid_user = await valid_user_future
                
            if citations and len(citations) > 0:
                if is_valid_user:
                    response['code'] = 200
                    
                    citation_list = []
                    for citation in citations:
                        citation_list.append(citation.to_dict())
                    
                    response['message'] = {'citations': citation_list}
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('CitationsHandler:get')
            response['code'] = 500
            
        return response