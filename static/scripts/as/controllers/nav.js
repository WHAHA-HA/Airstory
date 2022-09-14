app.controller('NavCtrl', ['$scope', '$cookies', 'asUniqueId', 'asWebSocket', function($scope, $cookies, asUniqueId, asWebSocket){
	var navCtrl = this;
	
	navCtrl.addproject = {};
	navCtrl.requestId = asUniqueId;
	
	asWebSocket.register('Project', 'post', function(json){
		if(json.code == '200'){
			if($scope.siteCtrl.projects && $scope.siteCtrl.projects.length > 0){
				$scope.siteCtrl.projects.push(json.message);
			}
			else{
				$scope.siteCtrl.projects = [json.message];
			}
			
			$scope.$apply();

			if(json.attributes.request_id == navCtrl.requestId){
				var document = new AsWsResource();
				
				document.resource = "Document";
				document.action = "post";
				document.message = {"project_id": json.key.id, "title": "document", type: 'o'};
				
				asWebSocket.send(document);
				
				//TODO: Is this the best way to do this? Cant really wait for document response because we are not subscribed. Cant subscribe because we dont know the document id till we get the response...
				setTimeout(function(){
					self.location = '/projects/' + json.key.id;
				}, 100);
			}
		}
	});
	
	navCtrl.isLoggedOut = function(){
		return !$cookies.get('as-id-clr');
	};
}]);