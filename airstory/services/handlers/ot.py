from botocore.exceptions import ClientError

from airstory.ot import AwsBackend, Server
from airstory.ot.ottypes.json import Json0
from airstory.ot.ottypes.jsonml import JsonML0
from airstory.utils import logger, init_response, \
    publish_document_content_message, from_json, permissions_map
from airstory.utils.redis import redis_service


class OtHandler:
    tracker = {}
    
    def _validate_user(self, state, min_level):
        return permissions_map[state.project_permissions] >= min_level
    
    async def post(self, state, json):
        message = json['message']
        response = init_response(json)
        
        if state.user_id and state.document_id == json['key']['document_id']:
            try:
                ot_type = JsonML0()
                
                if json['attributes'] and 'type' in json['attributes'] and json['attributes']['type'] == 'json0':
                    ot_type = Json0()
                
                backend = AwsBackend(ot_type, json['key']['document_id'])
                server = Server(backend)
                 
                #TODO: If snapshot exists, and there are operations applied to it, save the new version
                try: 
                    if 'revert' in message and message['revert'] and self._validate_user(state, 4):
                        snapshot = await server.backend.retrieve_snapshot(revert=True)
                    else:
                        snapshot = await server.backend.retrieve_snapshot()
                except ClientError:
                    snapshot = None  
                    
                revert_count = await redis_service.get(json['key']['document_id'] + '-reverts')
        
                if snapshot and (snapshot.content or snapshot.content == []):
                    # Use existing and open
                    if 'create' in message and message['create']:
                        # Page loading, need to send snapshot, version, etc
                        
                        response['code'] = 200
                        response['message'] = {'create': False, 'v': snapshot.version+1, 'snapshot': snapshot.content, 'open': True, 'reverts': revert_count}
                        
                        if 'revert' in message and message['revert']:
                            response['message']['revert'] = message['revert']
                            
                            await publish_document_content_message(json['key']['document_id'], response)
                    else:
                        # Page reconnecting, send back confirmation with requested version. Follow up with all operations since version to get up-to-date
                        # Also include the users last operation...just in case the server/connection was lost after the command was accepted but before the response was returned
                        version = message['v']
                        
                        last = await server.backend.get_last_version_from_user(json['attributes']['request_id'])
                        
                        response['code'] = 200
                        response['message'] = {'open': True, 'v': version, 'ops': [], 'last': last, 'reverts': revert_count}
                        
                        count = 0
                        
                        ops = await server.backend.get_operations(version)
                        for op in ops:
                            if version + count == op.version:
                                update = {'v': op.version, 'op': from_json(op.operation)}
                                logger.info(update)
                                
                                response['message']['ops'].append(update)
                                count += 1
                            else:
                                break
                else:
                    # Create new and open
                    await server.backend.create_snapshot()
                    
                    response['code'] = 200
                    response['message'] = {'create': True, 'open': True, 'v': 0, 'reverts': revert_count}
            except: #IGNORE:bare-except
                logger.exception('OT:post')
                response['code'] = 500
        else:
            response['code'] = 401
            
        return response
    
    async def patch(self, state, json):
        if state.in_progress:
            return None
        else:
            state.in_progress = True
            
            response = init_response(json)
                
            if state.user_id and state.document_id == json['key']['document_id'] and self._validate_user(state, 4):
                try:
                    ot_type = JsonML0()
                    
                    if json['attributes'] and 'type' in json['attributes'] and json['attributes']['type'] == 'json0':
                        ot_type = Json0()
                        
                    backend = AwsBackend(ot_type, json['key']['document_id'])
                    server = Server(backend)
                    
                    client_version = json['message']['v']
                    
                    r_op, r_version, r_ops = await server.receive_operation(json['attributes']['request_id'], client_version, json['message']['op'])
                    
                    if r_op != None:
                        server_version = r_version - 1
                         
                        # ops: previously missed operations that this user requires
                        # op: the new operation that all users require
                        response['message'] = {'ops': [], 'op': r_op, 'v': r_version}
                        
                        logger.info('Server version: ' + str(server_version))
                        logger.info('Client version: ' + str(client_version))
                
                        if server_version >= client_version:
                            count = 0
                            
                            for op in r_ops:
                                if client_version + count == op.version:
                                    update = {'v': op.version, 'op': from_json(op.operation)}
                                    logger.info(update)
                                    response['message']['ops'].append(update)
                                    
                                    count += 1
                                else:
                                    break
                                    
                            
                        response['code'] = 200
                        
                        logger.info(response['message']['op'])
                        
                        counter_name = json['key']['document_id'] + '-op-count'
                
                        count = await redis_service.incr(counter_name)
                        
                        if count % 20 == 0 or count > 20 and count % 10 == 0:
                            logger.info('Save snapshot')
                            await server.backend.save_snapshot()
                            await redis_service.set(counter_name, 0)
                    else:
                        # Duplicate request
                        response['code'] = 409
                        
                        # Get all ops including this one (which should be saved)
                        ops = await server.backend.get_operations(client_version)
                        
                        response['message'] = {'v': client_version}
                        
                        # If this op is the first and only op, then send back a message plus saying all is good. 
                        # Otherwise, dont send the op down and have the client reload
                        
                        if len(ops) == 1 and from_json(ops[0].operation) == json['message']['op']:
                            response['message']['op'] = json['message']['op']
                                
                except: #IGNORE:bare-except
                    logger.exception('OT:patch')
                    response['code'] = 500
            else:
                response['code'] = 401
                
            state.in_progress = False
            
            if response['code'] == 200:
                await publish_document_content_message(json['key']['document_id'], response)
            
            return response