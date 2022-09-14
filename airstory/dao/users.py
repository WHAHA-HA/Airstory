import airstory.dao.user_projects


class Item(airstory.dao.AsItem):
    def __init__(self):
        self.email = None
        self.password = None
        self.id = None
        self.first_name = None
        self.last_name = None
        self.avatar = None
        
    def get_item(self):
        item = airstory.dao.Item()
        item.keys = {
                'id': {'S': self.id}
             }
        
        item.attributes = {
                'password': {'S': self.password},
                'first_name': {'S': self.first_name},
                'last_name': {'S': self.last_name},
                'email': {'S': self.email}
            }
            
        if self.avatar:
            item.attributes['avatar'] = {'S': self.avatar}
        
        return item
        
    def get_batch_item(self):
        item = self.get_item()
    
        return {'table': 'Users', 'item': item}

class Crud(airstory.dao.Crud):
    def __init__(self, conn):
        super().__init__(conn, 'Users')
        
    def generate_id(self):
        return 'u' + super().generate_id()
        
    def create(self, user):
        return super().create(user.get_item())
        
    async def retrieve(self, user):
        item = await super().retrieve(user.get_item())
        
        if item:
            user.password = item['password']['S']
            user.id = item['id']['S']
            user.first_name = item['first_name']['S']
            user.last_name = item['last_name']['S']
            user.email = item['email']['S']
            user.avatar = self._get_item_val(item, 'avatar')
        
            return user
        else:
            return None
        
    async def retrieve_by_email(self, email):
        response = await self.conn.query(
                TableName=self.table,
                IndexName='UsersGSI',
                KeyConditions={
                   'email': {
                        'AttributeValueList': [{
                            'S': email
                        }],
                       'ComparisonOperator': 'EQ'
                    }
                }
            )
        
        user = None
        
        for item in response['Items']:
            user = Item()
            
            user.password = item['password']['S']
            user.id = item['id']['S']
            user.first_name = item['first_name']['S']
            user.last_name = item['last_name']['S']
            user.email = item['email']['S']
            user.avatar = self._get_item_val(item, 'avatar')
            
        return user
    
    async def retrieve_users_by_project_id(self, project_id):
        
        user_projects_crud = airstory.dao.user_projects.Crud(self.conn)
        user_projects = await user_projects_crud.retrieve_all_by_project_id(project_id)
        
        users = []
        for item in user_projects:
            
            response = await self.conn.query(
                TableName=self.table,
                IndexName='UsersGSI',
                KeyConditions={
                   'project_id': {
                        'AttributeValueList': [{
                            'S': project_id
                        }],
                       'ComparisonOperator': 'EQ'
                    }
                }
            )
            
            for user in response['Items']:
                user.password = item['password']['S']
                user.id = item['id']['S']
                user.first_name = item['first_name']['S']
                user.last_name = item['last_name']['S']
                user.email = item['email']['S']
                user.avatar = self._get_item_val(item, 'avatar')
                
                users.append(user)
        
        return users
        
    def update(self, user):
        return super().update(user.get_item())
        
    def delete(self, user):
        return super().delete(user.get_item())
