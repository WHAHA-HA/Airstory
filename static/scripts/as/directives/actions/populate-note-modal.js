app.directive('asPopulateNoteModal', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			note: '=asPopulateNoteModal'
		},
		link: function(scope, element){
			element.click(function(){
				var note = new AsWsResource();
				
				note.resource = 'Note';
				note.action = 'get';
				note.attributes = {'reason': 'edit-note'};
				note.key = {'ref_id': scope.note.ref_id, 'id': scope.note.id};
				
				asWebSocket.send(note);
			});
		}
	};
}]);