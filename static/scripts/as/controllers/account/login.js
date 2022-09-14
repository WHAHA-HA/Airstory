app.controller('LoginCtrl', ['$scope', '$http', '$cookies', 'asURL', function($scope, $http, $cookies, asURL){
	var userId = $cookies.get('as-id-clr');
	
	if(userId && userId !== '' && userId !== '""'){
		var q = asURL.search(true);

		if(q && q.next){
			self.location = q.next;
		}
		else{
			self.location = '/projects';
		}
	}

	$scope.login = function(){
		$scope.msg = '';
		
		$http.post('/v1/users/' + $scope.email + '/authenticate', $scope.password).then(function(response){
			var q = asURL.search(true);

			if(q && q.next){
				self.location = q.next;
			}
			else{
				self.location = '/projects';
			}
		}, 
		function(response){
			if(response.status == 400 || response.status == 404){
				$scope.msg = "Login failed, please try again";
			}
			else{
				$scope.msg = "Server error, please try again later";
			}
		});
	};
}]);
