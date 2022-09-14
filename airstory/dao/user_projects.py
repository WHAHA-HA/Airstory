import airstory.dao


class Item(airstory.dao.AsItem):
    def __init__(self):
        self.user_id = None
        self.project_id = None
        self.permissions = None
        
    def get_item(self):
        item = airstory.dao.Item()
        item.keys = {
                'user_id': {'S': self.user_id},
                'project_id': {'S':self.project_id}
             }
        
        item.attributes = {}
        
        if self.permissions:
            item.attributes['permissions'] = {'S': self.permissions}
        
        return item
    
    def get_batch_item(self):
        item = self.get_item()
    
        return {'table': 'UserProjects', 'item': item}

class Crud(airstory.dao.Crud):
    def __init__(self, conn):
        super().__init__(conn, 'UserProjects')
        
    def create(self, user_project):
        return super().create(user_project.get_item())
    
    async def retrieve(self, user_project):
        item = await super().retrieve(user_project.get_item())
        
        if item:
            user_project.user_id = item['user_id']['S']
            user_project.project_id = item['project_id']['S']
            #TODO: "admin" shouldnt be the default...
            user_project.permissions = self._get_item_val(item, 'permissions', default='admin')
        
            return user_project
        else:
            return None
    
    async def retrieve_all_by_project_id(self, project_id):
        response = await self.conn.query(
                TableName=self.table,
                IndexName='ProjectUsersIndex',
                KeyConditions={
                   'project_id': {
                        'AttributeValueList': [{
                            'S': project_id
                        }],
                       'ComparisonOperator': 'EQ'
                    }
                }
            )
        
        user_projects = []
        for item in response['Items']:
            user_project = Item()
            
            user_project.project_id = item['project_id']['S']
            user_project.user_id = item['user_id']['S']
            #TODO: "admin" shouldnt be the default...
            user_project.permissions = self._get_item_val(item, 'permissions', default='admin')
            
            user_projects.append(user_project)
        
        return user_projects
     
    async def retrieve_all_by_user_id(self, user_id):
        response = await self.conn.query(
                TableName=self.table,
                KeyConditions={
                   'user_id': {
                        'AttributeValueList': [{
                            'S': user_id
                        }],
                       'ComparisonOperator': 'EQ'
                    }
                }
            )
        
        user_projects = []
        for item in response['Items']:
            user_project = Item()
            
            user_project.project_id = item['project_id']['S']
            user_project.user_id = item['user_id']['S']
            user_project.permissions = self._get_item_val(item, 'permissions', default='admin')
            
            user_projects.append(user_project)
        
        return user_projects
        
    def update(self, user_project):
        return super().update(user_project.get_item())
        
    def delete(self, user_project):
        return super().delete(user_project.get_item())