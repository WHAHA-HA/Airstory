app.directive('asArchiveProject', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope:{
			project: '=asArchiveProject'
		},
		link: function(scope, element){
			element.click(function(){
				var project = scope.project;
				
				project.status = 'archive';
				
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