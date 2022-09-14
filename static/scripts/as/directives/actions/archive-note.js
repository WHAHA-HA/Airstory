app.directive('asArchiveNote', ['$cookies', 'asWebSocket', function($cookies, asWebSocket){
	return {
		restrict: 'A',
		require: '^asNoteModal',
		scope:{
			note: '=asArchiveNote',
			projectId: '=asProjectId',
			requestId: '=asRequestId'
		},
		link: function(scope, element, attrs, ctrl){
			element.click(function(){
				var userId = $cookies.get('as-id-clr');

				var moveRefId = 'a_' + scope.note.ref_id;
				
				var tags = [];
				if(scope.note.tags){
					for(var x = 0; x < scope.note.tags.length; x++){
						tags.push(scope.note.tags[x].text);
					}
				}
				
				var n = angular.copy(scope.note);
				n.tags = tags;
				
				ctrl.cleanCitations(n.citations);
				
				var noteCopy = new AsWsResource();
				
				noteCopy.resource = 'Note';
				noteCopy.action = 'post';
				noteCopy.key = {'ref_id': moveRefId};
				noteCopy.message = n;
				noteCopy.attributes = {'reason': 'notecopy', 'request_id': scope.requestId};
				
				noteCopy.message.content = $('#edit-note-content').data('wysiwyg').getValue();
				
				asWebSocket.send(noteCopy);
				
				ctrl.deleteNote();
				ctrl.clearEditModal();
			});
		}
	};
}]);