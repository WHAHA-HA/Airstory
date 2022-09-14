app.directive('asUnarchiveProject', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope:{
			project: '=asUnarchiveProject'
		},
		link: function(scope, element){
			element.click(function(){
				var project = scope.project;
				
				project.status = '';
				
				var archive = new AsWsResource();
				
				archive.resource = 'Project';
				archive.action = 'put';
				archive.key = {'id': project.id};
				archive.message = project;
				
				asWebSocket.send(archive);
				
				element.closest('.modal').modal('hide');
			});
		}
	};
}]);