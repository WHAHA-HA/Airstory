import airstory.dao.invitations
import airstory.dao.user_projects
from airstory.utils import get_dynamodb_connection, get_thread_pool, \
    init_response, publish_project_message, logger, permissions_map
from airstory.utils.email import email_service
from config import get_config


class BaseHandler:
    executor = get_thread_pool()
    
    def __init__(self):
        self.dynamodb = get_dynamodb_connection()
        
        self.crud = airstory.dao.invitations.Crud(self.dynamodb)
        self.userProjectCrud = airstory.dao.user_projects.Crud(self.dynamodb)
        
    def _lookup_invitation(self, project_id, invitation_id):
        
        invitation = airstory.dao.invitations.Item()
        
        invitation.project_id = project_id
        invitation.id = invitation_id
        
        return self.crud.retrieve(invitation)
        
    def _lookup_user_project(self, user_id, project_id):
        
        user_project = airstory.dao.user_projects.Item()
        
        user_project.user_id = user_id
        user_project.project_id = project_id
        
        return self.userProjectCrud.retrieve(user_project)
    
    async def _valid_user(self, user_id, project_id, min_level=1):
        if user_id:
            user_project = await self._lookup_user_project(user_id, project_id)
            
            if user_project and permissions_map[user_project.permissions] >= min_level:
                return True
        
        return False
    
class InvitationHandler(BaseHandler):
    
    async def post(self, state, json):
        item = json['message']
        key = json['key']

        response = init_response(json)

        try:
            # Validate that the user who adds another user has access to the project
            is_valid_user = await self._valid_user(state.user_id, key['project_id'], min_level=5)
            
            if is_valid_user:
                invitation = airstory.dao.invitations.Item()
                
                invitation.id = self.crud.generate_id()
                invitation.project_id = key['project_id']
                invitation.project_name = item['project_name']
                invitation.full_name = item['full_name']
                invitation.email = item['email']
                invitation.created = self.crud.timestamp()
                invitation.permissions = item['permissions']
                
                completed = await self.crud.create(invitation)
                
                if completed:
                    #TODO: should we save 'message' to the database?
                    email_body = get_config()['app']['external_url'] + '/invitation?p=' + invitation.project_id + '&a=' + invitation.id + '\n\n' + item['message']
                    
                    await email_service.send(item['email'], 'Airstory', email_body)
                    
                    response['code'] = 200
                    response['message'] = invitation.to_dict()
                    response['key'] = {'project_id': invitation.project_id, 'id': invitation.id}
                    
                    await publish_project_message(invitation.project_id, response)
                else:
                    response['code'] = 500
            else:
                response['code'] = 401
        except: #IGNORE:bare-except
            logger.exception('InvitationHandler:post')
            response['code'] = 500
        
        return response
    
    async def get(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            invitation = await self._lookup_invitation(key['project_id'], key['id'])
                
            if invitation:   
                if state.user_id:
                    response['message'] = invitation.to_dict()
                    response['code'] = 200
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('InvitationHandler:get')
            response['code'] = 500
        
        return response
    
    async def delete(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            invitation = await self._lookup_invitation(key['project_id'], key['id'])
                
            if invitation:   
                # Validate that the user who deletes this invitation has access to the project
                is_valid_user = await self._valid_user(state.user_id, invitation.project_id)
                if is_valid_user:
                    batch = airstory.dao.BatchWrite(self.dynamodb)
                    
                    cascade_invitation = airstory.dao.cascade.Invitation(self.dynamodb, batch)
                    await cascade_invitation.delete(invitation)
                    
                    completed = await batch.run_batch()
                    if completed:
                        response['code'] = 200
                
                        await publish_project_message(invitation.project_id, response)
                    else:
                        response['code'] = 500
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('InvitationHandler:delete')
            response['code'] = 500
        
        return response
    
class InvitationsHandler(BaseHandler): 
        
    def _lookup_invitations(self, project_id):
        return self.crud.retrieve_all_by_project_id(project_id)
    
    async def get(self, state, json):
        key = json['key']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['project_id'], min_level=5)
            invitations = await self._lookup_invitations(key['project_id'])
            
            is_valid_user = await valid_user_future
                
            if invitations:   
                if is_valid_user:
                    response['code'] = 200
                    
                    invitation_list = []
                    for invitation in invitations:
                        invitation_list.append(invitation.to_dict())
                    
                    response['message'] = {'invitations': invitation_list}
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('InvitationsHandler:get')
            response['code'] = 500
        
        return response