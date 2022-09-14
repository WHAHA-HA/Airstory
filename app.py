#import tornado.platform.asyncio
#tornado.platform.asyncio.AsyncIOMainLoop().install()

import logging
import os
import sys
import config

#TODO: Move everything below this to another module to keep things clean
if __name__ == '__main__':
    arguments = sys.argv[1:]
    port = arguments[0] if arguments else '8888'
    env = arguments[1] if arguments and len(arguments) > 1 and config.config[arguments[1]] else 'dev'
    
    if env == 'prod':
        logging.basicConfig(filename='/var/log/airstory/airstory.log', level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    else:
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    logger = logging.getLogger('airstory')
    logger.info('Loading ' + env + ' config')
    
    config.configuration = config.config[env]
    
import tornado.httpserver
import tornado.ioloop
from tornado.web import authenticated
import tornado.web

from airstory.utils.google import google_service
from airstory.utils import get_dynamodb_connection
from config import get_config
from airstory.services import user, project, document, note, comment, user_project, invitation, citation, image, ot #IGNORE:unused-import #@UnusedImport
from airstory.services.websocket import MessageHandler
import airstory.dao
from airstory.ot import AwsBackend, Server
from airstory.ot.ottypes.jsonml import JsonML0
import sockjs.tornado #@UnresolvedImport
from tornroutes import route, generic_route, authed_generic_route, \
    route_redirect
from jsonml import JsonML
from pydrive.auth import GoogleAuth

class BaseHandler(tornado.web.RequestHandler):
    def get_current_user(self):
        as_id = self.get_cookie('as-id')
        
        if not as_id:
            self.clear_cookie('as-user')
            self.clear_cookie('as-id')
            self.clear_cookie('as-id-clr')
            
        return as_id
    
    def data_received(self, chunk):
        pass

@route('/health')
class HealthHandler(BaseHandler):
    def get(self):
        self.write('ok')

@route('/projects/(.*)')
class ProjectHtmlHandler(BaseHandler):
    @authenticated
    def get(self, *args):
        project_id = args[0]
        
        self.set_header('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0')
        self.set_header('Pragma', 'no-cache')
        self.render('project.html', project_id=project_id)

@route('/google/(.*)/title/(.*)')
class AuthHandler(BaseHandler):
    @authenticated
    def get(self, *args):
        document_id, title = args
        
        gauth = GoogleAuth()
        
        redirect = gauth.GetAuthUrl(state=document_id + "|" + title)
        
        self.redirect(redirect)
    
@route('/export')
class ExportHandler(BaseHandler):
    @authenticated
    async def get(self, *args):
        #TODO: fix this/clean up! Should be in a handler/rest object instead of here...
        state = self.get_argument('state', '')
        
        document_id = state[:state.index('|')] 
        title = state[state.index('|')+1:] 
        
        backend = AwsBackend(JsonML0(), document_id)
        server = Server(backend)
        
        snapshot = await server.backend.retrieve_snapshot()
        
        if len(snapshot.content) > 1 and isinstance(snapshot.content[1], dict):
            del snapshot.content[1]
        
        html = []
        
        html.append('<html><head>')
        html.append('<link href="https://fonts.googleapis.com/css?family=Alegreya|Amatic+SC|Bree+Serif|Merriweather|Permanent+Marker|Pinyon+Script|Playfair+Display|Roboto|Roboto+Mono|Ultra|Varela+Round" rel="stylesheet">')
        html.append('<link rel="stylesheet" href="' + get_config()['app']['external_url'] + '/static/styles/editor.min.css">')
        html.append('</head><body>')
        html.append(JsonML.to_html(snapshot.content))
        html.append('</body></html>')
        
        html_str = ''.join(html)
        
        gauth = GoogleAuth()
        gauth.Auth(self.get_argument('code', None))
        
        file = await google_service.upload(gauth, title, html_str)
        
        self.set_header('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0')
        self.set_header('Pragma', 'no-cache')
        self.redirect(file.metadata['alternateLink'])
        
@route('/chrome-plugin')
class ChromePluginHtmlHandler(tornado.web.RequestHandler):
    async def get(self, *args):
        as_id = self.get_secure_cookie('as-id')
        
        self.set_header('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0')
        self.set_header('Pragma', 'no-cache')
        
        if as_id: 
            as_id = as_id.decode('utf-8')
            
            dynamodb = get_dynamodb_connection()
            batch_read = airstory.dao.BatchRead(dynamodb)
            
            user_projects = await airstory.dao.user_projects.Crud(dynamodb).retrieve_all_by_user_id(as_id)
        
            for up in user_projects:
                p = airstory.dao.projects.Item()
                p.id = up.project_id
                
                batch_read.add_batch_read(p)
                
            projects = await batch_read.run_batch()
            
            project_list = []
            
            p = airstory.dao.projects.Item()
            p.id = as_id
            p.title = 'Private'
            p.description = ''
            
            project_list.append(p)
            
            if projects:
                for proj in projects:
                    p = airstory.dao.projects.Item()
                    p.id = proj['id']['S']
                    p.title = proj['title']['S']
                    p.description = proj['description']['S']
                    
                    project_list.append(p)
            
            self.set_header('Page', 'controls')
            self.render('chrome-plugin/controls.html', projects=project_list)
        else:
            self.set_header('Page', 'login')
            self.render('chrome-plugin/login.html')
    
    def data_received(self, chunk):
        pass
        
generic_route('/partials/wait', 'partials/wait.html')
generic_route('/partials/notes', 'partials/notes.html')
generic_route('/partials/citations', 'partials/citations.html')
generic_route('/partials/images', 'partials/images.html')
generic_route('/login', 'login.html')
generic_route('/create', 'create.html')
generic_route('/forgot', 'forgot.html')
generic_route('/v1/swagger.json', 'swagger/swagger.json')
generic_route('/v1/swagger.yaml', 'swagger/swagger.yaml')
        
authed_generic_route('/projects', 'projects.html', BaseHandler)
authed_generic_route('/invitation', 'invitation.html', BaseHandler)
authed_generic_route('/downloads', 'downloads.html', BaseHandler)
authed_generic_route('/account', 'account.html', BaseHandler)

route_redirect('/', 'http://www.airstory.co/r-app-airstory')

settings = {
    'debug': get_config()['app']['debug'], 
    'static_path': os.path.join(os.path.dirname(__file__), 'static'),
    'cookie_secret': '4661d8dc-7552-4bca-ad3b-38c752e2d88d',
    'login_url': '/login',
    'template_path': os.path.join(os.path.dirname(__file__), 'templates/'),
    'xheaders': True
}

application = tornado.web.Application(route.get_routes()
                                       + sockjs.tornado.SockJSRouter(MessageHandler, '/websocket').urls
                                       , **settings)
        
if __name__ == '__main__':
    server = tornado.httpserver.HTTPServer(application)
    server.listen(port)
    logging.info('App is running at 0.0.0.0:' + port + '\n'
          'Quit the app with CONTROL-C')
    tornado.ioloop.IOLoop.instance().start()