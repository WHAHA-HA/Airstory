app.directive('asAddProject', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			requestId: '=asRequestId',
			project: '=asAddProject'
		},
		link: function(scope, element){
			element.click(function(){
				var project = new AsWsResource();
				
				project.resource = 'Project';
				project.action = 'post';
				project.message = scope.project;
				project.attributes = {'request_id': scope.requestId};
				
				asWebSocket.send(project);
				
				element.closest('.modal').modal('hide');

				delete scope.project;
				scope.$apply();
			});
		}
	};
}]);