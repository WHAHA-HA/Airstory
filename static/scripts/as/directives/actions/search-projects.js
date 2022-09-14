app.directive('asSearchProjects', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: true,
		link: function(scope, element){
			element.keypress(function(e){
			    if(e.which == 13) {
					var project = new AsWsResource();
					
					project.resource = 'Projects';
					project.action = 'get';
					
					project.attributes = {'search': element.val()};
					
					asWebSocket.send(project);
			    }
			});
		}
	};
}]);