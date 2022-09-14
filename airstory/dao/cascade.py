import os.path

import airstory.dao.documents
import airstory.dao.user_projects
from airstory.utils import get_s3_connection, logger
from airstory.utils.cloudinary import cloudinary_service
from airstory.utils.elasticsearch import elasticsearch_service
from airstory.utils.redis import redis_service


class User:
    def __init__(self, conn, batch):
        self.conn = conn
        self.batch = batch
     
    async def delete(self, user):
        user_projects_crud = airstory.dao.user_projects.Crud(self.conn)
        
        self.batch.add_batch_delete(user)
        
        user_projects = await user_projects_crud.retrieve_all_by_user_id(user.id)
         
        cascade_user_project = UserProject(self.conn, self.batch)
        
        for user_project in user_projects:
            await cascade_user_project.delete(user_project)
                
        notes_crud = airstory.dao.notes.Crud(self.conn)
        
        notes = await notes_crud.retrieve_all_by_ref_id(user.id)
        
        cascade_note = Note(self.conn, self.batch)
        for note in notes:
            await cascade_note.delete(note)
        
        archived_notes = await notes_crud.retrieve_all_by_ref_id('a_' + user.id)
        
        for note in archived_notes:
            await cascade_note.delete(note)
            
        images_crud = airstory.dao.images.Crud(self.conn)
        images = await images_crud.retrieve_all_by_ref_id(user.id)
        
        cascade_image = Image(self.conn, self.batch)
        for image in images:
            await cascade_image.delete(image)
        
    
class UserProject:
    def __init__(self, conn, batch):
        self.conn = conn
        self.batch = batch
    
    async def delete(self, user_project):
        user_projects_crud = airstory.dao.user_projects.Crud(self.conn)
        project_users = await user_projects_crud.retrieve_all_by_project_id(user_project.project_id)
            
        casecade_project = Project(self.conn, self.batch)
        
        if len(project_users) == 1:
            # If this is the only user in this UserProject, delete the project as well.
            # No need to delete userProject here as Cascade.Project will cover that
             
            project = airstory.dao.projects.Item()
            project.id = user_project.project_id
            
            await casecade_project.delete(project)
        else:
            self.batch.add_batch_delete(user_project)
    
class Project:
    def __init__(self, conn, batch):
        self.conn = conn
        self.batch = batch
        
    async def delete(self, project):
        self.batch.add_batch_delete(project)
        
        #TODO: Throw exception if this fails so that we can cleanup
        logger.info('Delete project from elasticsearch')
        await elasticsearch_service.delete('airstory', 'projects', project.id)
        
        user_projects_crud = airstory.dao.user_projects.Crud(self.conn)
        user_projects = await user_projects_crud.retrieve_all_by_project_id(project.id)
        
        for user_project in user_projects:
            # Don't use Cascade.UserProject here as it will go into an infinite loop
            self.batch.add_batch_delete(user_project)
            
        documents_crud = airstory.dao.documents.Crud(self.conn)
        documents = await documents_crud.retrieve_all_by_project_id(project.id)
        
        cascade_document = Document(self.conn, self.batch)
        
        for document in documents:
            await cascade_document.delete(document)
                
        notes_crud = airstory.dao.notes.Crud(self.conn)
        
        notes = await notes_crud.retrieve_all_by_ref_id(project.id)
        
        cascade_note = Note(self.conn, self.batch)
        for note in notes:
            await cascade_note.delete(note)
            
        archived_notes = await notes_crud.retrieve_all_by_ref_id('a_' + project.id)
        
        for note in archived_notes:
            await cascade_note.delete(note)
            
        invitations_crud = airstory.dao.invitations.Crud(self.conn)
        
        invitations = await invitations_crud.retrieve_all_by_project_id(project.id)
        
        cascade_invitation = Invitation(self.conn, self.batch)
        for invitation in invitations:
            await cascade_invitation.delete(invitation)
            
        images_crud = airstory.dao.images.Crud(self.conn)
        images = await images_crud.retrieve_all_by_ref_id(project.id)
        
        cascade_image = Image(self.conn, self.batch)
        for image in images:
            await cascade_image.delete(image)
            
        await redis_service.delete(project.id)
            
class Note:
    def __init__(self, conn, batch):
        self.conn = conn
        self.batch = batch
        
    async def delete(self, note):
        note_content = airstory.dao.note_contents.Item()
        note_content.ref_id = note.ref_id
        note_content.note_id = note.id
        
        self.batch.add_batch_delete(note)
        self.batch.add_batch_delete(note_content)
        
        #TODO: Throw exception if this fails so that we can cleanup
        logger.info('Delete note from elasticsearch')
        await elasticsearch_service.delete('airstory', 'notes', note.id)
        
        comments_crud = airstory.dao.comments.Crud(self.conn)
        comments = await comments_crud.retrieve_all_by_ref_id(note.ref_id + '|' + note.id)
        
        cascade_comment = Comment(self.conn, self.batch)
        
        for comment in comments:
            await cascade_comment.delete(comment)
    
class Document:
    def __init__(self, conn, batch):
        self.conn = conn
        self.batch = batch
        self.s3conn = get_s3_connection()
        
    async def delete(self, document):
        self.batch.add_batch_delete(document)
        
        snapshots = airstory.dao.snapshots.Item()
        snapshots.id = document.id
        
        snapshots_crud = airstory.dao.snapshots.Crud(self.s3conn)
        #TODO: Throw exception if this fails, should halt batch as this can not be a part of the batch
        await snapshots_crud.delete(snapshots)
        
        ops_crud = airstory.dao.ops.Crud(self.conn)
        ops = await ops_crud.retrieve_all_by_document_id(document.id)
        
        cascade_ops = Ops(self.conn, self.batch)
        
        for op in ops:
            await cascade_ops.delete(op)
        
        await redis_service.delete(document.id + '-op-count')
        
        await redis_service.delete(document.id + '-reverts')
        
        comments_crud = airstory.dao.comments.Crud(self.conn)
        comments = await comments_crud.retrieve_all_by_ref_id(document.project_id + '|' + document.id)
        
        cascade_comment = Comment(self.conn, self.batch)
        
        for comment in comments:
            await cascade_comment.delete(comment)
            
        citations_crud = airstory.dao.citations.Crud(self.conn)
        citations = await citations_crud.retrieve_all_by_ref_id(document.project_id + '|' + document.id)
        
        cascade_citation = Citation(self.conn, self.batch)
        
        for citation in citations:
            await cascade_citation.delete(citation)
            
class Ops:
    def __init__(self, conn, batch):
        self.conn = conn
        self.batch = batch
       
    async def delete(self, op):
        self.batch.add_batch_delete(op)
            
class Comment:
    def __init__(self, conn, batch):
        self.conn = conn
        self.batch = batch
       
    async def delete(self, comment):
        self.batch.add_batch_delete(comment)
            
class Invitation:
    def __init__(self, conn, batch):
        self.conn = conn
        self.batch = batch
       
    async def delete(self, invitation):
        self.batch.add_batch_delete(invitation)
            
class Citation:
    def __init__(self, conn, batch):
        self.conn = conn
        self.batch = batch
       
    async def delete(self, citation):
        self.batch.add_batch_delete(citation)
            
class Image:
    def __init__(self, conn, batch):
        self.conn = conn
        self.batch = batch
       
    async def delete(self, image):
        fname = os.path.splitext(image.name)[0]  
        
        #TODO: Throw exception if this fails so that we can cleanup
        await cloudinary_service.destroy(image.id + '/' + fname)
        
        #TODO: Throw exception if this fails so that we can cleanup
        logger.info('Delete image from elasticsearch')
        await elasticsearch_service.delete('airstory', 'images', image.id)
    
        self.batch.add_batch_delete(image)