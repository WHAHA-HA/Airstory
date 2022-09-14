from bs4 import BeautifulSoup

import airstory.dao.note_contents
import airstory.dao.notes
from airstory.utils import get_dynamodb_connection, \
    publish_user_message, init_response, logger, permissions_map
from airstory.utils.elasticsearch import elasticsearch_service


def cleanup_html(html):
    soup = BeautifulSoup(html, 'html.parser')
    
    text = soup.get_text()
    
    #TODO: make this configurable
    if len(text) > 250:
        text = text[0:250] + '...'
        
    return text

class BaseHandler:
    def __init__(self):
        self.dynamodb = get_dynamodb_connection()
        
        self.crud = airstory.dao.notes.Crud(self.dynamodb)
        self.content_crud = airstory.dao.note_contents.Crud(self.dynamodb)
        self.citation_crud = airstory.dao.citations.Crud(self.dynamodb)
        self.user_crud = airstory.dao.users.Crud(self.dynamodb)
        
        self.users = {}
    
    def _lookup_note(self, ref_id, note_id):
        note = airstory.dao.notes.Item()
        
        note.ref_id = ref_id
        note.id = note_id
        
        return self.crud.retrieve(note)
    
    async def _lookup_user(self, user_id, users=None):
        if not user_id:
            user = airstory.dao.users.Item()
            
            user.avatar = 'https://www.gravatar.com/avatar/1'
            user.first_name = 'Unknown'
            
            return user
        elif users != None and user_id in users:
            return users[user_id]
        else: 
            user = airstory.dao.users.Item()
            
            user.id = user_id
            
            user = await self.user_crud.retrieve(user)
            
            if user:
                if users != None:
                    users[user_id] = user
            else:
                user = airstory.dao.users.Item()
                
                user.avatar = 'https://www.gravatar.com/avatar/1'
                user.first_name = 'Unknown'
            
            return user
    
    def _lookup_content(self, ref_id, note_id):
        #TODO: Should this be a batch call?
        
        note_content = airstory.dao.note_contents.Item()
        
        note_content.ref_id = ref_id
        note_content.note_id = note_id
        
        return self.content_crud.retrieve(note_content)
        
    def _lookup_user_project(self, user_id, project_id):
        
        user_project = airstory.dao.user_projects.Item()
        
        user_project.user_id = user_id
        user_project.project_id = project_id
        
        return airstory.dao.user_projects.Crud(self.dynamodb).retrieve(user_project)
        
    def _lookup_users(self, project_id):
        return airstory.dao.user_projects.Crud(self.dynamodb).retrieve_all_by_project_id(project_id)
    
    async def _valid_user(self, user_id, ref_id, min_level=1, note=None):
        if user_id:
            if ref_id.startswith('a_'):
                ref_id = ref_id[2:]
            
            if user_id == ref_id:
                return True
            else:
                user_project = await self._lookup_user_project(user_id, ref_id)
    
                if user_project:
                    level = permissions_map[user_project.permissions]
                    
                    if note:
                        if note.user_id == user_id and level >= min_level:
                            return True
                        elif note.state == 'locked' and level != 5:
                            return False
                    
                    return level >= min_level
        
        return False

class NoteHandler(BaseHandler):
      
    async def post(self, state, json):
        key = json['key']
        item = json['message']

        response = init_response(json)
        
        try:
            is_valid_user = await self._valid_user(state.user_id, key['ref_id'], min_level=3)
            if is_valid_user:
                batch = airstory.dao.BatchWrite(self.dynamodb)
                    
                note = airstory.dao.notes.Item()
                
                note.ref_id = key['ref_id']
                note.id = self.crud.generate_id()
                note.title = item['title']
                note.created = self.crud.timestamp()
                note.tags = item.get('tags')
                #TODO: figure out display content logic
                note.display_content = cleanup_html(item['content'])
                note.citations = item.get('citations')
                note.user_id = state.user_id
                note.state = item.get('state')
                
                batch.add_batch_write(note)
                
                note_content = airstory.dao.note_contents.Item()
                
                note_content.ref_id = key['ref_id']
                note_content.note_id = note.id
                note_content.content = item['content']
                
                batch.add_batch_write(note_content)
                
                search_note = note.to_dict()
                search_note['content'] = note_content.content
                
                es_result = await elasticsearch_service.put('airstory', 'notes', note.id, search_note)
                es_success = es_result.code == 201
                
                if es_success:
                    completed = await batch.run_batch()
                    
                    if completed:
                        response['code'] = 200
                        response['key']['id'] = note.id
                        response['message'] = note.to_dict()
                        response['message']['content'] = note_content.content
                        
                        user = await self._lookup_user(note.user_id)
                        
                        response['message']['avatar'] = user.avatar
                        response['message']['first_name'] = user.first_name
                        response['message']['last_name'] = user.last_name
                        
                        ref_id = note.ref_id
                        
                        if ref_id.startswith('a_'):
                            ref_id = ref_id[2:]
                    
                        ref_type = ref_id[:1]
                        
                        if ref_type == 'p':
                            user_projects = await self._lookup_users(ref_id)
                            for user in user_projects:
                                await publish_user_message(user.user_id, response)
                        elif ref_type == 'u':
                            await publish_user_message(ref_id, response)
                    else:
                        await elasticsearch_service.delete('airstory', 'notes', note.id)
                        response['code'] = 500
                else:
                    response['code'] = 500
            else:
                response['code'] = 401
        except: #IGNORE:bare-except
            logger.exception('NoteHandler:post')
            response['code'] = 500
            
        return response
       
    async def get(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['ref_id'])
            note_future = self._lookup_note(key['ref_id'], key['id'])
            note_content = await self._lookup_content(key['ref_id'], key['id'])
            
            note = await note_future
            is_valid_user = await valid_user_future
            
            if not note:
                es_result = await elasticsearch_service.get('airstory', 'notes', key['id'])
                
                if es_result['found']:
                    batch = airstory.dao.BatchWrite(self.dynamodb)
                    
                    search_note = es_result['_source']
                
                    note = airstory.dao.notes.Item()
                    
                    note.ref_id = search_note['ref_id']
                    note.id = search_note['id']
                    note.created = search_note['created']
                    note.title = search_note['title']
                    note.display_content = search_note['display_content']
                    note.tags = search_note['tags']
                    note.citations = search_note['citations']
                    note.user_id = search_note['user_id']
                    note.state = search_note.get('state')
                    
                    batch.add_batch_write(note)
                
                    note_content = airstory.dao.note_contents.Item()
                    
                    note_content.ref_id = search_note['ref_id']
                    note_content.note_id = search_note['id']
                    note_content.content = search_note['content']
                    
                    batch.add_batch_write(note_content)
                    
                    completed = await batch.run_batch()
                    if not completed:
                        note = None
                        note_content = None
            
            if note:
                if is_valid_user:
                    response['code'] = 200
                    response['message'] = note.to_dict()
                    response['message']['content'] = note_content.content
                    
                    user = await self._lookup_user(note.user_id)
                        
                    response['message']['avatar'] = user.avatar
                    response['message']['first_name'] = user.first_name
                    response['message']['last_name'] = user.last_name
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('NoteHandler:get')
            response['code'] = 500
            
        return response
              
    async def put(self, state, json):
        key = json['key']
        item = json['message']

        response = init_response(json)
    
        try:
            note_future = self._lookup_note(key['ref_id'], key['id'])
            note_content = await self._lookup_content(key['ref_id'], key['id'])
            
            note = await note_future
            
            is_valid_user = await self._valid_user(state.user_id, key['ref_id'], min_level=3, note=note)
            
            if note:
                if is_valid_user:
                    batch = airstory.dao.BatchWrite(self.dynamodb)
                        
                    note.title = item['title']
                    #TODO: figure out display content logic
                    note.display_content = cleanup_html(item['content'])
                    note.tags = item.get('tags')
                    note.citations = item.get('citations')
                    note.state = item.get('state')
                    
                    batch.add_batch_write(note)
                    
                    note_content.content = item['content']
                    
                    batch.add_batch_write(note_content)
                    
                    search_note = note.to_dict()
                    search_note['content'] = note_content.content
                    
                    es_result = await elasticsearch_service.put('airstory', 'notes', note.id, search_note)
                    es_success = es_result.code == 200 or es_result.code == 201
                    logger.info(es_result)
                    
                    if es_success:
                        #TODO: if this fails, must undo what was done in elasticsearch
                        completed = await batch.run_batch()
                        if completed:
                            response['code'] = 200
                            response['message'] = note.to_dict()
                            response['message']['content'] = note_content.content
                            
                            user = await self._lookup_user(note.user_id)
                                
                            response['message']['avatar'] = user.avatar
                            response['message']['first_name'] = user.first_name
                            response['message']['last_name'] = user.last_name
                            
                            ref_id = note.ref_id
                            
                            if ref_id.startswith('a_'):
                                ref_id = ref_id[2:]
                        
                            ref_type = ref_id[:1]
                            
                            if ref_type == 'p':
                                user_projects = await self._lookup_users(ref_id)
                                for user in user_projects:
                                    await publish_user_message(user.user_id, response)
                            elif ref_type == 'u':
                                await publish_user_message(ref_id, response)
                        else:
                            response['code'] = 500 
                    else:
                        response['code'] = 500     
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('NoteHandler:put')
            response['code'] = 500
        
        return response
        
    async def delete(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            note = await self._lookup_note(key['ref_id'], key['id'])
            
            is_valid_user = await self._valid_user(state.user_id, key['ref_id'], min_level=3, note=note)
            
            if note:
                if is_valid_user:
                    batch = airstory.dao.BatchWrite(self.dynamodb)
                    cascade_note = airstory.dao.cascade.Note(self.dynamodb, batch)
                    await cascade_note.delete(note)
                    
                    completed = await batch.run_batch()
                    if completed:
                        response['code'] = 200
                        
                        ref_id = note.ref_id
                        
                        if ref_id.startswith('a_'):
                            ref_id = ref_id[2:]
                    
                        ref_type = ref_id[:1]
                        
                        if ref_type == 'p':
                            user_projects = await self._lookup_users(ref_id)
                            for user in user_projects:
                                await publish_user_message(user.user_id, response)
                        elif ref_type == 'u':
                            await publish_user_message(ref_id, response)
                    else:
                        response['code'] = 500
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('NoteHandler:delete')
            response['code'] = 500
        
        return response
    
class NotesHandler(BaseHandler):
    
    def _lookup_notes(self, ref_id, attr):
        if attr and 'search' in attr and attr['search']:
            start = 0
            
            if 'start' in attr:
                start = attr['start']
                
            return self.crud.search([ref_id], attr['search'], start)
        else:
            #Need to figure out pagination
            return self.crud.paginate_all_by_ref_id(ref_id, attr)
      
    async def get(self, state, json):
        key = json['key']
        attr = json['attributes']

        response = init_response(json)
        
        try:
            if key:
                valid_user_future = self._valid_user(state.user_id, key['ref_id'])
                notes, next_start = await self._lookup_notes(key['ref_id'], attr)
                
                is_valid_user = await valid_user_future
                    
                if notes:
                    if is_valid_user:
                        response['code'] = 200
                        
                        users = {}
                        note_list = []
                        
                        for note in notes:
                            note_item = note.to_dict()
                            
                            user = await self._lookup_user(note.user_id, users)
                                
                            note_item['avatar'] = user.avatar
                            note_item['first_name'] = user.first_name
                            note_item['last_name'] = user.last_name
                        
                            note_list.append(note_item)
                            
                        response['message'] = {}
                        response['message']['notes'] = note_list
                        response['message']['next_start'] = next_start
                    else:
                        response['code'] = 401
                else:
                    response['code'] = 404
            else:
                if state.user_id:
                    prefix = ''
                    
                    if 'type' in attr and attr['type'] == 'archive':
                        prefix = 'a_'
                    
                    ref_ids = []
                    #TODO: Move to batch
                    ref_ids.append(prefix + state.user_id)
                    
                    user_projects = await airstory.dao.user_projects.Crud(self.dynamodb).retrieve_all_by_user_id(state.user_id)
                    for user_project in user_projects:
                        ref_ids.append(prefix + user_project.project_id)
                        
                    search = None
                    start = 0
                    
                    if attr:
                        search = attr.get('search')
                        start = attr.get('start', 0)
                        
                    notes, next_start = await self.crud.search(ref_ids, search, start) 
                        
                    if notes:
                        response['code'] = 200
                    
                        users = {}
                        note_list = []
                        
                        for note in notes:
                            note_item = note.to_dict()
                            
                            user = await self._lookup_user(note.user_id, users)
                                
                            note_item['avatar'] = user.avatar
                            note_item['first_name'] = user.first_name
                            note_item['last_name'] = user.last_name
                        
                            note_list.append(note_item)
                            
                        response['message'] = {}
                        response['message']['notes'] = note_list
                        response['message']['next_start'] = next_start
                    else:
                        response['code'] = 404
                else:
                    response['code'] = 401
                    
        except: #IGNORE:bare-except
            logger.exception('NotesHandler:get')
            response['code'] = 500
            
        return response