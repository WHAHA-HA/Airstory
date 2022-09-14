app.directive('asDeleteProject', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			project: '=asDeleteProject'
		},
		link: function(scope, element){
			element.click(function(){
				var project = new AsWsResource();
				
				project.resource = 'Project';
				project.action = 'delete';
				project.key = {'id': scope.project.id};
				
				asWebSocket.send(project);
				
				element.closest('.modal').modal('hide');
			});
		}
	};
}]);