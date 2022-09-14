from tornado import gen
from tornado.web import decode_signed_value

from airstory.services import State
from airstory.services.handlers import document, project, comment, note, user, \
    invitation, user_project, citation, image, ot
from airstory.utils import get_redis_subscriber, to_json, from_json, auth_response, \
    logger, unsubscribe_to_project
import sockjs.tornado  # @UnresolvedImport


handlers = {
    'OT': ot.OtHandler(),
    'Document': document.DocumentHandler(),
    'Project': project.ProjectHandler(),
    'Projects': project.ProjectsHandler(),
    'ProjectUsers': project.ProjectUsersHandler(),
    'ProjectDocuments': project.ProjectDocumentsHandler(),
    'Comment': comment.CommentHandler(),
    'Comments': comment.CommentsHandler(),
    'Citation': citation.CitationHandler(),
    'Citations': citation.CitationsHandler(),
    'Note': note.NoteHandler(),
    'Notes': note.NotesHandler(),
    'User': user.UserHandler(),
    'Invitation': invitation.InvitationHandler(),
    'UserProject': user_project.UserProjectHandler(),
    'Invitations': invitation.InvitationsHandler(),
    'Image': image.ImageHandler(),
    'Images': image.ImagesHandler()
}

class MessageHandler(sockjs.tornado.SockJSConnection):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        self.state = State()
        
    def on_open(self, info):
        self.state.websocket = self
        
        self.state.email = None
        self.state.user_id = None
        
        if 'as-user' in info.cookies and 'as-id' in info.cookies:
            self.state.email = decode_signed_value('4661d8dc-7552-4bca-ad3b-38c752e2d88d', 'as-user', info.cookies['as-user'].value)
            self.state.user_id = decode_signed_value('4661d8dc-7552-4bca-ad3b-38c752e2d88d', 'as-id', info.cookies['as-id'].value)
        
            if self.state.email:
                self.state.email = self.state.email.decode('utf-8')
                
            if self.state.user_id:
                self.state.user_id = self.state.user_id.decode('utf-8')
            
        self.state.document_id = None
        self.state.project_id = None
        
        response = auth_response(self.state.user_id)
        
        #TODO: Return something more meaningful that the client can actually action
        if self.state.email and self.state.user_id:
            # Subscribe to their own user_id for updates to things like added to projects, added note to library from another 
            get_redis_subscriber().subscribe(self.state.user_id, self)
        
            response['code'] = 200
        else:
            response['code'] = 401
            
        self.send(to_json(response))
            
    @gen.coroutine
    def on_message(self, message):
        if self.state.email and self.state.user_id:
            json = from_json(message)
            
            batch_response = {'payload': []}
            
            if json['action'] == 'batch':
                payload = json
                is_batch = True
                
                batch_response['resource'] = json['resource']
                batch_response['action'] = json['action']
            else:
                payload = {'payload': [json]}
                is_batch = False
            
            for item in payload['payload']:
                handler = handlers[item['resource']]
                
                if handler:
                    if item['action'] == 'get':
                        response = yield handler.get(self.state, item)
                    elif item['action'] == 'post':
                        response = yield handler.post(self.state, item)
                    elif item['action'] == 'put':
                        response = yield handler.put(self.state, item)
                    elif item['action'] == 'patch':
                        response = yield handler.patch(self.state, item)
                    elif item['action'] == 'delete':
                        response = yield handler.delete(self.state, item)
                    elif item['action'] == 'subscribe':
                        response = yield handler.subscribe(self.state, item)
                    else:
                        response = {
                            'code': 400
                        } 
                        
                    batch_response['payload'].append(response)
                else:
                    batch_response = [{
                        'code': 400
                    }]
        else:
            batch_response = [{
                'code': 401
            }]
        
        # Errors won't be broadcasted, so need to send failure response to this user only
        # Also, get requests do not beed to be broadcast
        if is_batch:
            logger.debug('WebSocket:response')
            logger.debug(batch_response)
            body = to_json(batch_response)
            self.send(body)
        else:
            for item in batch_response['payload']:
                if item and (item['code'] != 200 or item['action'] == 'get' or item['action'] == 'subscribe' or (item['action'] == 'post' and not 'revert' in item['message'] and item['resource'] == 'OT')):
                    logger.debug('WebSocket:response')
                    logger.debug(item)
                    body = to_json(item)
                    self.send(body)

    @gen.coroutine
    def on_close(self):
        get_redis_subscriber().unsubscribe(self.state.user_id, self)
        
        if self.state.document_id and get_redis_subscriber().subscribers[self.state.document_id][self]:
            get_redis_subscriber().unsubscribe(self.state.document_id, self)
            
        if self.state.project_id and get_redis_subscriber().subscribers[self.state.project_id][self]:
            yield unsubscribe_to_project(self.state, self.state.project_id)