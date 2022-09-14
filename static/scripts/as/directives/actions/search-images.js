app.directive('asSearchImages', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			refId: '=asSearchImages',
			type: '=asType'
		},
		link: function(scope, element){
			element.keypress(function(e){
			    if(e.which == 13) {
					var note = new AsWsResource();
					
					note.resource = 'Images';
					note.action = 'get';
					
					if(scope.type != 'all'){
						note.key = {'ref_id': scope.refId};
					}
					
					var search = element.val().replace(/"/g, '');
					
					if(search){
						search = '*' + search + '*';
					}
					
					note.attributes = {'search': search};
					
					asWebSocket.send(note);
			    }
			});
		}
	};
}]);