import tornado


class RequestHandler(tornado.web.RequestHandler):

    def get_secure_cookie(self, name, value=None, max_age_days=31, min_version=None):
        value = super().get_secure_cookie(name, value, max_age_days, min_version)
        
        if value:
            value = value.decode('utf-8')
            
        return value
    
    def get_request_body(self):
        return self.request.body.decode('utf-8')
    
    def data_received(self, chunk):
        pass
