from concurrent.futures.thread import ThreadPoolExecutor
import uuid

from tornado.gen import coroutine
from tornado.process import cpu_count

from airstory.utils import logger
from pydrive.drive import GoogleDrive


class GoogleService:
    executor = ThreadPoolExecutor(max_workers=cpu_count())
    
    @coroutine    
    def upload(self, gauth, title, body):
        unique = str(uuid.uuid4())
        
        logger.info('GoogleService:delete:upload:' + unique)
        
        drive = GoogleDrive(gauth)
        file = drive.CreateFile({'title': title, 'mimeType':'text/html'})
        file.SetContentString(body)
        result = yield self.executor.submit(file.Upload, {'convert': True})
        
        logger.info('ElasticsearchService:delete:response:' + unique)
        
        return file
    
    
    
google_service = GoogleService()