import airstory.dao


class Item(airstory.dao.AsItem):
    def __init__(self):
        self.id = None
        self.project_id = None
        self.project_name = None
        self.full_name = None
        self.email = None
        self.created = None
        self.permissions = None
        
    def get_item(self):
        item = airstory.dao.Item()
        item.keys = {
                'project_id': {'S': self.project_id},
                'id': {'S': self.id}
             }
        
        item.attributes = {
                'project_name': {'S': self.project_name},
                'full_name': {'S': self.full_name},
                'email': {'S': self.email},
                'created': {'N': str(self.created)}
            }
        
        if self.permissions:
            item.attributes['permissions'] = {'S': self.permissions}
        
        return item
    
    def get_batch_item(self):
        item = self.get_item()
    
        return {'table': 'Invitations', 'item': item}

class Crud(airstory.dao.Crud):
    def __init__(self, conn):
        super().__init__(conn, 'Invitations')
        
    def create(self, invitation):
        return super().create(invitation.get_item())
    
    async def retrieve(self, invitation):
        item = await super().retrieve(invitation.get_item())
        
        if item:
            invitation.id = item['id']['S']
            invitation.project_id = item['project_id']['S']
            invitation.project_name = item['project_name']['S']
            invitation.full_name = item['full_name']['S']
            invitation.email = item['email']['S']
            invitation.created = int(item['created']['N'])
            invitation.permissions = self._get_item_val(item, 'permissions', default='view-all')
        
            return invitation
        else:
            return None
        
    async def retrieve_all_by_project_id(self, project_id):
        response = await self.conn.query(
                TableName=self.table,
                KeyConditions={
                   'project_id': {
                        'AttributeValueList': [{
                            'S': project_id
                        }],
                       'ComparisonOperator': 'EQ'
                    }
                }
            )
        
        invitations = []
        for item in response['Items']:
            invitation = Item()
            
            invitation.id = item['id']['S']
            invitation.project_id = item['project_id']['S']
            invitation.project_name = item['project_name']['S']
            invitation.full_name = item['full_name']['S']
            invitation.email = item['email']['S']
            invitation.created = int(item['created']['N'])
            invitation.permissions = self._get_item_val(item, 'permissions', default='view-all')
            
            invitations.append(invitation)
        
        return invitations
        
    def update(self, invitation):
        return super().update(invitation.get_item())
        
    def delete(self, invitation):
        return super().delete(invitation.get_item())