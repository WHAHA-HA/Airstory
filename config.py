
dev = {}

dev['redis'] = {'host': 'localhost', 'port': 6379, 'timeout': 5}
dev['dynamodb'] = {'region_name': 'us-east-1', 'endpoint_url': 'http://localhost:8000'}
#dev['dynamodb'] = {'region_name': 'us-east-1', 'endpoint_url': None}
dev['s3'] = {'region_name': 'us-east-1', 'endpoint_url': 'http://localhost:4567', 'bucket': 'dev-airstory-documents', 'ot-bucket': 'dev-airstory-snapshots'}
#dev['s3'] = {'region_name': 'us-east-1', 'endpoint_url': None, 'bucket': 'airstory-documents', 'ot-bucket': 'airstory-snapshots'}
dev['es'] = {'host': 'localhost', 'port': '9200'}
#dev['es'] = {'host': 'search-airstory-ag6wnbf3odgesdgzvt6ec6ys4i.us-east-1.es.amazonaws.com', 'port': '80'}
dev['app'] = {'debug': True, 'external_url': 'http://localhost:8888', 'from_email': 'support@airstory.co', 'page_size': 50}
dev['cloudinary'] = {'folder': 'dev'}
dev['cookies'] = {}
dev['cookies']['secure_httponly'] = {'httponly': True}
dev['cookies']['secure'] = {'expires_days': 30}

prod = {}

prod['redis'] = {'host': 'airstory-redis-001.tuebzn.0001.use1.cache.amazonaws.com', 'port': 6379, 'timeout': 5}
prod['dynamodb'] = {'region_name': 'us-east-1', 'endpoint_url': None}
prod['s3'] = {'region_name': 'us-east-1', 'endpoint_url': None, 'bucket': 'airstory-documents', 'ot-bucket': 'airstory-snapshots'}
prod['es'] = {'host': 'search-airstory-ag6wnbf3odgesdgzvt6ec6ys4i.us-east-1.es.amazonaws.com', 'port': '80'}
prod['app'] = {'debug': False, 'external_url': 'https://app.airstory.co', 'from_email': 'support@airstory.co', 'page_size': 50}
prod['cloudinary'] = {'folder': 'prod'}
prod['cookies'] = {}
prod['cookies']['secure_httponly'] = {'secure': True, 'httponly': True}
prod['cookies']['secure'] = {'expires_days': 30, 'secure': True}

config = {'dev': dev, 'prod': prod}

configuration = {}

def get_config():
    return configuration