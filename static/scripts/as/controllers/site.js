app.controller('SiteCtrl', ['$scope', '$cookies', 'asWebSocket', function($scope, $cookies, asWebSocket) {

	var siteCtrl = this;
	
	siteCtrl.userId = $cookies.get('as-id-clr');
	
	siteCtrl.projects = [];
	siteCtrl.projectMap = {};
	
	asWebSocket.register('Projects', 'get', function(json){
		if(json.code == '200'){
			siteCtrl.projects = json.message.projects;
			
			for(var x = 0; x < siteCtrl.projects.length; x++){
				var project = siteCtrl.projects[x];
				
				siteCtrl.projectMap[project.id] = project;
			}
			
			$scope.$apply();
			
			$scope.$broadcast('projects:loaded');
		}
	});
	
	asWebSocket.register('UserProject', 'delete', function(json){
		if(json.code == '200'){
			for(var x = 0; x < siteCtrl.projects.length; x++){
				if(siteCtrl.projects[x].id === json.key.project_id){
					siteCtrl.projects.splice(x, 1);
					break;
				}
			}
		
			$scope.$apply();
		}
	});
	
	asWebSocket.register('Project', 'delete', function(json){
		if(json.code == '200'){
			for(var x = 0; x < siteCtrl.projects.length; x++){
				if(siteCtrl.projects[x].id === json.key.id){
					siteCtrl.projects.splice(x, 1);
					break;
				}
			}
		
			$scope.$apply();
		}
	});
	
	asWebSocket.init(function(){
		var projects = new AsWsResource();

		projects.resource = 'Projects';
		projects.action = 'get';

		asWebSocket.send(projects);
	});
	
	var permissionsMap = {
	       'view-all': 1, // Can view comments, document, images and notes, but cant add or change anything. Also cant do anything with users
	       'comment': 2, // Same as Can View, but also can add, edit or reply to comments, but can not otherwise change the document, images or notes.
	       'cards': 3, // Same as comment, but also can add and edit images and cards
	       'edit-all': 4, // Same as can add cards & images, but can also add/edit documents.
	       'admin': 5 // Same as can edit, but also can add/edit users
	    };

	siteCtrl.validatePermission = function(id, minLevel, item){
		if(id){
			if(id.startsWith('u')){
				return true;
			}
			else{
				var project = siteCtrl.projectMap[id];
				
				if(project){
					var level = permissionsMap[project.permissions];
					
					if(item){
						if(item.user_id === siteCtrl.userId && level >= minLevel){
							return true;
						}
						else if(item.state === 'locked' && level !== 5){
							return false;
						}
					}
					
					return level >= minLevel;
				}
			}
		}
		
		return false;
	};
}]);