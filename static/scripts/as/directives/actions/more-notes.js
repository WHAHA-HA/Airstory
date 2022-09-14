app.directive('asMoreNotes', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			nextStart: '=asNextStart',
			type: '=asType',
			refId: '=asRefId',
			search: '=asSearch'
		},
		link: function(scope, element){
			element.click(function(){
				if(scope.nextStart){
					var notes = new AsWsResource();
	
					notes.resource = 'Notes';
					notes.action = 'get';
					
					if(scope.type != 'all'){
						notes.key = {"ref_id": scope.refId};
					}
					
					if(scope.search || (scope.nextStart && scope.nextStart.start)){
						notes.attributes = {"start": scope.nextStart.start, 'display_option': 'append', 'search': scope.search};
					}
					else{
						notes.attributes = {"start_ref_id": scope.nextStart.ref_id, "start_id": scope.nextStart.id, 'display_option': 'append'};
					}
	
					asWebSocket.send(notes);
				}
			});
		}
	};
}]);