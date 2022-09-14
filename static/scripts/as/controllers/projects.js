
app.controller('ProjectsCtrl', ['$scope', '$cookies', 'asWebSocket', 'asUniqueId', function($scope, $cookies, asWebSocket, asUniqueId) {
	var projectsCtrl = this;
	
	projectsCtrl.requestId = asUniqueId;
	projectsCtrl.addproject = {};
	projectsCtrl.editproject = {};
	projectsCtrl.sortBy = 'updated';
	projectsCtrl.sortReversed = true;
	projectsCtrl.showArchived = false;
	
	asWebSocket.register('User', 'auth', function(json){
		if(json.code != '200'){
			$cookies.remove('as-id-clr');
			self.location = '/login';
		}
	});
	
	asWebSocket.register('Project', 'put', function(json){
		if(json.code == '200'){
			var project = json.message;

			for(var x = 0; x < $scope.siteCtrl.projects.length; x++){
				if($scope.siteCtrl.projects[x].id == project.id){
					$scope.siteCtrl.projects[x].title = project.title;
					$scope.siteCtrl.projects[x].description = project.description;
					$scope.siteCtrl.projects[x].status = project.status;
					$scope.$apply();
					
					break;
				}
			}
		}
	});
	
	asWebSocket.register('Project', 'delete', function(json){
		if(json.code == '200'){
			for(var x = 0; x < $scope.siteCtrl.projects.length; x++){
				if($scope.siteCtrl.projects[x].id == json.key.id){
					$scope.siteCtrl.projects.splice(x, 1);

					$scope.$apply();
					
					break;
				}
			}
		}
	});
	
	projectsCtrl.setSortBy = function(){
		projectsCtrl.sortReversed = projectsCtrl.sortBy === 'updated';
	};
	
	var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
	                ];
	
	projectsCtrl.displayDeadline = function(deadline){
		if(deadline){
			d = new Date(deadline);
			
			return 'Due ' + d.getDate() + ' ' + monthNames[d.getMonth()] + ' ' + d.getFullYear();
		}
		else{
			return '';
		}
	};
	
	projectsCtrl.hasArchivedProjects = function(){
		for(var x = 0; x < $scope.siteCtrl.projects.length; x++){
			var project = $scope.siteCtrl.projects[x];
			
			if(project.status === 'archive'){
				return true;
			}
		}
		
		return false;
	};
	
	//iPhone fix - some situations where the window scrolls up. Can't scroll down when everything else is a scroll
	$(window).scroll(function(){
		$(window).scrollTop(0);
	});
}]);