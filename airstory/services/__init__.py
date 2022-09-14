class State:
    def __init__(self): 
        self.email = None
        self.user_id = None
        self.document_id = None
        self.project_id = None
        self.websocket = None
        self.in_progress = False
        self.project_permissions = None