app.controller('InvitationCtrl', ['$scope', '$http', '$cookies', 'asURL', function($scope, $http, $cookies, asURL){
	var query = asURL.search(true);
	
	var projectId = query.p;
	var invitationId = query.a;
	
	$scope.msg = '';
	
	$http.get('/v1/projects/' + projectId + '/invitations/' + invitationId).then(function(response){
		$scope.activate = response.data;
	}, 
	function(response){
		if(response.status == 400 || response.status == 404){
			$scope.continue = true;
			$scope.msg = 'Invitation is no longer valid';
		}
		else{
			$scope.msg = 'Server error, please try again later';
		}
	});
	
	$scope.decline = function(){
		$scope.error400 = false;
		
		$http.delete('/v1/projects/' + projectId + '/invitations/' + invitationId).then(function(response){
			self.location = '/projects';
		}, 
		function(response){
			if(response.status == 400 || response.status == 404){
				$scope.msg = 'Could not decline invitation (it may already have been declined)';
				$scope.continue = true;
			}
			else{
				$scope.msg = 'Server error, please try again later';
			}
		});
	};
	
	$scope.add = function(){
		$scope.error400 = false;
		
		var data = {
				"project_id": projectId,
			    "invitation_id": invitationId
			};
		
		$http.post('/v1/user-projects', data).then(function(response){
			self.location = '/projects';
		}, 
		function(response){
			if(response.status == 400){
				$scope.msg = 'You are already a part of this project';
				$scope.continue = true;
			} 
			else if(response.status == 404){
				$scope.msg = 'Invitation is no longer valid';
			}
			else{
				$scope.msg = 'Server error, please try again later';
			}
		});
	};
	
	$scope.goToProjects = function(){
		self.location = '/projects';
	};
}]);