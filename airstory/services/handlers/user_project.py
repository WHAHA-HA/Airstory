import airstory.dao.user_projects
from airstory.utils import get_dynamodb_connection, get_thread_pool, publish_user_message, \
    init_response, publish_project_message, logger, permissions_map


class BaseHandler:
    executor = get_thread_pool()
    
    def __init__(self):
        self.dynamodb = get_dynamodb_connection()
        
        self.crud = airstory.dao.user_projects.Crud(self.dynamodb)
        self.invitationCrud = airstory.dao.invitations.Crud(self.dynamodb)
        
    def _lookup_user_project(self, user_id, project_id):
        
        user_project = airstory.dao.user_projects.Item()
        
        user_project.user_id = user_id
        user_project.project_id = project_id
        
        return self.crud.retrieve(user_project)
        
    def _lookup_invitation(self, project_id, invitation_id):
        
        invitation = airstory.dao.invitations.Item()
        
        invitation.project_id = project_id
        invitation.id = invitation_id
        
        return self.invitationCrud.retrieve(invitation)
    
    async def _valid_user(self, user_id, project_id, min_level=1):
        if user_id:
            user_project = await self._lookup_user_project(user_id, project_id)
            
            if user_project and permissions_map[user_project.permissions] >= min_level:
                return True
        
        return False
    
class UserProjectHandler(BaseHandler):
    
    async def post(self, state, json):
        item = json['message']

        response = init_response(json)

        try:
            if state.user_id:
                invitation = await self._lookup_invitation(item['project_id'], item['invitation_id'])
                
                if invitation:
                    verify_user_project = await self._lookup_user_project(state.user_id, item['project_id'])
                    
                    if verify_user_project:
                        response['code'] = 400
                    else:
                        user_project = airstory.dao.user_projects.Item()
                        
                        user_project.project_id = item['project_id']
                        user_project.user_id = state.user_id
                        user_project.permissions = invitation.permissions
                        
                        batch = airstory.dao.BatchWrite(self.dynamodb)
                        
                        batch.add_batch_write(user_project)

                        cascade_invitation = airstory.dao.cascade.Invitation(self.dynamodb, batch)
                        await cascade_invitation.delete(invitation)
                        
                        completed = await batch.run_batch()
                        if completed:
                            response['code'] = 200
                            response['message'] = user_project.to_dict()
                            response['key'] = {'user_id': user_project.user_id, 'project_id': user_project.project_id}
                            
                            await publish_user_message(user_project.user_id, response)
                            await publish_project_message(user_project.project_id, response)
                        else:
                            response['code'] = 500
                else:
                    response['code'] = 400
            else:
                response['code'] = 401
                        
        except: #IGNORE:bare-except
            logger.exception('UserProjectHandler:post')
            response['code'] = 500
        
        return response
    
    async def delete(self, state, json):
        #TODO: validate that the user who adds another user has access to the project
        key = json['key']

        response = init_response(json)
        
        try:
            valid_user_future = self._valid_user(state.user_id, key['project_id'], min_level=5)
            user_project = await self._lookup_user_project(key['user_id'], key['project_id'])
                
            # Validate that the user who deletes another user has access to the project
            is_valid_user = await valid_user_future
                
            if user_project:
                if is_valid_user:
                    batch = airstory.dao.BatchWrite(self.dynamodb)
                    
                    cascade_user_project = airstory.dao.cascade.UserProject(self.dynamodb, batch)
                    await cascade_user_project.delete(user_project)
                    
                    completed = await batch.run_batch()
                    if completed:
                        response['code'] = 200
                
                        await publish_user_message(user_project.user_id, response)
                        await publish_project_message(user_project.project_id, response)
                    else:
                        response['code'] = 500
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('UserProjectHandler:delete')
            response['code'] = 500
        
        return response
    
    async def put(self, state, json):
        key = json['key']

        response = init_response(json)

        try:
            valid_user_future = self._valid_user(state.user_id, key['project_id'], min_level=5)
            user_project = await self._lookup_user_project(key['user_id'], key['project_id'])
            
            is_valid_user = await valid_user_future
                
            if user_project:
                if is_valid_user and state.user_id != key['user_id']:
                    response['code'] = 200
                    
                    user_project.permissions = json['message']['permissions']
                    
                    await self.crud.update(user_project)
                    
                    response['message'] = json['message']
                    
                    await publish_project_message(user_project.project_id, response)
                else:
                    response['code'] = 401
            else:
                response['code'] = 404
        except: #IGNORE:bare-except
            logger.exception('ProjectUsersHandler:get')
            response['code'] = 500
            
        return response