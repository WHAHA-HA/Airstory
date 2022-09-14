app.controller('AccountCtrl', ['$scope', '$http', '$cookies', 'asURL', function($scope, $http, $cookies, asURL){
	var userId = $cookies.get('as-id-clr');
	var email = null;
	
	var query = asURL.search(true);
	
	$scope.msg = '';
	
	//TODO: If cancel is clicked, should revert fields to old values.
	
	$http.get('/v1/users/' + userId).then(function(response){
		$scope.user = response.data;
		email = $scope.user.email;
	}, 
	function(response){
		$scope.clazz = ['alert', 'alert-danger'];
		
		if(response.status == 404 || response.status == 400){
			$scope.msg = 'User not found';
		}
		else{
			$scope.msg = 'Server error, please try again later';
		}
	});
	
	$scope.updateAccount = function(){
		$scope.clazz = [];
		
		var account = {
			'email': $scope.user.email,
			'first_name': $scope.user.first_name,
			'last_name': $scope.user.last_name
		};
		
		$http.put('/v1/users/' + email, account).then(function(response){
			$scope.clazz = ['alert', 'alert-success'];
			$scope.edit = '';
			email = $scope.user.email;
			
			$scope.msg = 'Account updated!';
		}, 
		function(response){
			$scope.clazz = ['alert', 'alert-danger'];
			
			if(response.status == 404){
				$scope.msg = 'User not found';
			}
			else if(response.status == 400){
				$scope.msg = 'Email address already taken by another user';
			}
			else{
				$scope.msg = 'Server error, please try again later';
			}
		});
	};
	
	$scope.updatePassword = function(){
		$scope.clazz = [];
		
		var account = {
			'password': $scope.user.password
		};
		
		$http.put('/v1/users/' + email, account).then(function(response){
			$scope.clazz = ['alert', 'alert-success'];
			$scope.edit = '';
			
			$scope.msg = 'Password updated!';
		}, 
		function(response){
			$scope.clazz = ['alert', 'alert-danger'];
			
			if(response.status == 400 || response.status == 404){
				$scope.msg = 'User not found';
			}
			else{
				$scope.msg = 'Server error, please try again later';
			}
		});
	};
}]);