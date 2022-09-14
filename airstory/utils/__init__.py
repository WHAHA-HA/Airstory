import codecs
from concurrent.futures.thread import ThreadPoolExecutor
import decimal
import json
import logging
import re

import redis
from tornado.escape import json_decode
from tornado.process import cpu_count
import tornadoredis.pubsub

from airstory.utils.aws import Aws
from airstory.utils.redis import redis_service
from config import get_config
from tornadoes import ESConnection


logger = logging.getLogger('airstory')

pool = ThreadPoolExecutor(max_workers=cpu_count())
subscriber = tornadoredis.pubsub.SockJSSubscriber(tornadoredis.Client(host=get_config()['redis']['host'], port=get_config()['redis']['port']))


class DecimalEncoder(json.JSONEncoder):
    def default(self, o): #IGNORE:method-hidden
        if isinstance(o, decimal.Decimal):
            if o % 1 > 0:
                return float(o)
            else:
                return int(o)
        return super().default(o)
    
def to_json(o):
    return json.dumps(o, cls=DecimalEncoder)

def from_json(j):
    return json_decode(j)

permissions_map = {
       'view-all': 1, # Can view comments, document, images and notes, but cant add or change anything. Also cant do anything with users
       'comment': 2, # Same as Can View, but also can add, edit or reply to comments, but can not otherwise change the document, images or notes.
       'cards': 3, # Same as comment, but also can add and edit images and cards
       'edit-all': 4, # Same as can add cards & images, but can also add/edit documents.
       'admin': 5 # Same as can edit, but also can add/edit users
    }
 
#TODO: Should this really be in global scope? Should the session be shared by everybody?
dynamodb = Aws(service_name='dynamodb', region_name=get_config()['dynamodb']['region_name'], endpoint_url=get_config()['dynamodb']['endpoint_url'])  
s3 = Aws(service_name='s3', region_name=get_config()['s3']['region_name'], endpoint_url=get_config()['s3']['endpoint_url'])

def get_dynamodb_connection():
    return dynamodb.get_service()

def get_s3_connection():
    return s3.get_service()

def get_thread_pool():
    return pool

def get_redis_subscriber():
    return subscriber

async def subscribe_to_project(state, json):
    if state and json:
        project_id = json['key']['id']
        
        if not state.project_id:
            get_redis_subscriber().subscribe(project_id, state.websocket)
            state.project_id = project_id
        elif state.project_id != project_id:
            await unsubscribe_to_project(state.project_id, state.websocket)
            get_redis_subscriber().subscribe(project_id, state.websocket)
            state.project_id = project_id
            
        await redis_service.sadd(project_id, state.user_id)
        
        response = init_response(json)
        response['message'] = state.user_id
        response['attributes'] = {'reason': 'joined'}
        response['code'] = 200
        
        await publish_project_message(project_id, response)
            
async def unsubscribe_to_project(state, project_id):
    #TODO: Need to broadcast the unsubscribe somehow
    get_redis_subscriber().unsubscribe(project_id, state.websocket)
    await redis_service.srem(project_id, state.user_id)
    
    state.project_permissions = None
    
    response = {'resource': 'Project', 'action': 'subscribe', 'key': {'id': project_id}, 'attributes': {'reason': 'left'}, 'message': state.user_id, 'code': 200}

    await publish_project_message(project_id, response)

async def publish_project_message(project_id, message):
    await redis_service.publish(project_id, to_json(message))
    
def subscribe_to_document(state, document_id):
    if state:
        if not state.document_id:
            get_redis_subscriber().subscribe(document_id, state.websocket)
            state.document_id = document_id
        elif state.document_id != document_id:
            get_redis_subscriber().unsubscribe(state.document_id, state.websocket)
            get_redis_subscriber().subscribe(document_id, state.websocket)
            state.document_id = document_id
    
async def publish_document_content_message(document_id, message):
    await redis_service.publish(document_id, to_json(message))
    
async def publish_user_message(user_id, message):
    await redis_service.publish(user_id, to_json(message))
    
def rest_to_handler(resource, action, message=None, key=None, attributes=None):
    return {'resource': resource, 'action': action, 'message': message, 'key': key, 'attributes': attributes}

def init_response(j):
    attributes = {}
    if j['attributes']:
        attributes = j['attributes']
        
    return {'resource': j['resource'], 'action': j['action'], 'key': j['key'], 'attributes': attributes}

def auth_response(user_id):
    return {'resource': 'User', 'action': 'auth', 'key': {'user_id': user_id}}

codec = codecs.lookup('utf-8')
    
def utf8(s):
    rv, _ = codec.encode(str(s))
    if not isinstance(rv, (str, bytes, bytearray)):
        raise TypeError('Not a string or byte codec')
    return rv