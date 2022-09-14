app.controller('PasswordResetCtrl', ['$scope', '$http', '$cookies', function($scope, $http, $cookies){
	$scope.processing = false;
	
	$scope.passwordReset = function(){
		$scope.msg = '';
		$scope.processing = true;
		
		$http.post('/v1/users/' + $scope.email + '/password-reset').then(function(response){
			//TODO: Carry over params in case this is from an invite

			$scope.clazz = ['alert', 'alert-success'];
			$scope.processing = false;
			$scope.msg = "A temporary password has been created. Please check the email associated with your account.";
		}, 
		function(response){
			$scope.processing = false;
			$scope.clazz = ['alert', 'alert-danger'];
			
			if(response.status == 400 || response.status == 404){
				$scope.msg = "Account not found";
			}
			else{
				$scope.msg = "Server error, please try again later";
			}
		});
	};
}]);