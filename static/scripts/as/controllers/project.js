app.controller('ProjectCtrl', ['$scope', '$cookies', 'asWebSocket', 'asURL', function($scope, $cookies, asWebSocket, asURL) {
	
	var projectCtrl = this;
	
	var urlSegments = asURL.segment();
	
	projectCtrl.projectId = urlSegments[1];
	projectCtrl.project = {};
	
	projectCtrl.subscribed = [];
	
	function contains(haystack, needle){
		for(var x = 0; x < haystack.length; x++){
			if(haystack[x] === needle){
				return true;
			}
		}
		
		return false;
	}
	
	asWebSocket.register('Project', 'subscribe', function(json){
		if(json.code == 200){
			if(json.attributes.reason == 'joined'){
				if(!contains(projectCtrl.subscribed, json.message)){
					projectCtrl.subscribed.push(json.message);
					
					$scope.$apply();
				}
			}
			else if(json.attributes.reason == 'left'){
				for(var y = 0; y < projectCtrl.subscribed.length; y++){
					if(projectCtrl.subscribed[y] === json.message){
						projectCtrl.subscribed.splice(y, 1);
					}
				}
				
				$scope.$apply();
			}
			else{
				var subscribed = json.message;
				
				for(var x = 0; x < subscribed.length; x++){
					if(!contains(projectCtrl.subscribed, subscribed[x])){
						projectCtrl.subscribed.push(subscribed[x]);
					}
				}
			}
		}
	});
	
	asWebSocket.init(function(){
		var projectSub = new AsWsResource();
		
		projectSub.resource = "Project";
		projectSub.action = "subscribe";
		projectSub.key = {"id": projectCtrl.projectId};
		
		asWebSocket.send(projectSub);
	});
	
	asWebSocket.register('User', 'auth', function(json){
		if(json.code != '200'){
			$cookies.remove('as-id-clr');
			self.location = '/login';
		}
	});
	
	$scope.$on('projects:loaded', function(){
		for(var x = 0; x < $scope.siteCtrl.projects.length; x++){
			var project = $scope.siteCtrl.projects[x];
			
			if(project.id == projectCtrl.projectId){
				projectCtrl.project = project;
				break;
			}
		}
		
		$scope.$apply();
	});
	
	asWebSocket.register('Project', 'put', function(json){
		if(json.code == '200'){
			var project = json.message;

			if(projectCtrl.project.id == project.id){
				projectCtrl.project.title = project.title;
				projectCtrl.project.description = project.description;
				projectCtrl.project.status = project.status;
				
				$scope.$apply();
			}
		}
	});
	
	asWebSocket.register('Project', 'delete', function(json){
		if(json.code == '200'){
			self.location = '/projects';
		}
	});
	
	//iPhone fix - some situations where the window scrolls up. Can't scroll down when everything else is a scroll
	$(window).scroll(function(e){
		$(window).scrollTop(0);
	});
} ]);