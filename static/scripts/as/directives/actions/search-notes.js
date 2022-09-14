app.directive('asSearchNotes', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			refId: '=asSearchNotes',
			type: '=asType'
		},
		link: function(scope, element){
			element.keypress(function(e){
			    if(e.which == 13) {
					var note = new AsWsResource();
					
					note.resource = 'Notes';
					note.action = 'get';

					if(scope.type != 'all' && scope.type != 'archive'){
						note.key = {'ref_id': scope.refId};
					}
					
					note.attributes = {'type': scope.type, 'search': element.val()};
					
					asWebSocket.send(note);
			    }
			});
		}
	};
}]);