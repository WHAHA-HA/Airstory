app.directive('asEditProject', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			project: '=asEditProject'
		},
		link: function(scope, element){
			element.click(function(){
				var project = new AsWsResource();
				
				project.resource = 'Project';
				project.action = 'put';
				project.key = {'id': scope.project.id};
				project.message = scope.project;
				
				asWebSocket.send(project);

				element.closest('.modal').modal('hide');
			});
		}
	};
}]);