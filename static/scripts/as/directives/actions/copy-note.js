app.directive('asCopyNote', ['$cookies', 'asWebSocket', function($cookies, asWebSocket){
	var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
	                ];
	
	return {
		restrict: 'A',
		require: '^asNoteModal',
		scope:{
			note: '=asCopyNote',
			projectId: '=asProjectId',
			requestId: '=asRequestId'
		},
		link: function(scope, element, attrs, ctrl){
			element.click(function(){
				var userId = $cookies.get('as-id-clr');
				
				ctrl.editNote();
				
				var copyRefId = userId;
				
				if(scope.note.ref_id.indexOf('u') === 0){
					copyRefId = scope.projectId;
				}
				
				var tags = [];
				if(scope.note.tags){
					for(var x = 0; x < scope.note.tags.length; x++){
						tags.push(scope.note.tags[x].text);
					}
				}
				
				var n = angular.copy(scope.note);
				n.tags = tags;
				
				if(n.title){
					n.title = 'Copy: ' + n.title;
				}
				else{
					var d = new Date();
					n.title = 'Copied on ' + monthNames[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
				}
				
				ctrl.cleanCitations(n.citations);
				
				var noteCopy = new AsWsResource();
				
				noteCopy.resource = 'Note';
				noteCopy.action = 'post';
				noteCopy.key = {'ref_id': copyRefId};
				noteCopy.message = n;
				noteCopy.attributes = {'reason': 'notecopy', 'request_id': scope.requestId};
				
				noteCopy.message.content = $('#edit-note-content').data('wysiwyg').getValue();
				
				asWebSocket.send(noteCopy);
				
				ctrl.clearEditModal();
			});
		}
	};
}]);