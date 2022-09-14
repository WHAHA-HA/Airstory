app.directive('asAddNote', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			note: '=asAddNote', 
			projectId: '=asProjectId',
			userId: '=asUserId',
			refId: '=asRefId',
			requestId: '=asRequestId',
			shouldCopy: '=asShouldCopy'
		},
		link: function(scope, element){
			scope.note = {'title': '', 'content': '', 'citations': [{}]};
			
			element.click(function(){
				var tags = [];
				
				if(scope.note.tags){
					for(var x = 0; x < scope.note.tags.length; x++){
						tags.push(scope.note.tags[x].text);
					}
				}
				
				var n = angular.copy(scope.note);
				n.tags = tags;
				
				for(var y = 0; y < n.citations.length; y++){
					var citation = n.citations[y];
					var check = false;
					
					for(var key in citation){
						if(key !== 'changed' && citation[key]){
							check = true;
							break;
						}
					}
					
					if(!check){
						n.citations.splice(y, 1);
						y--;
					}
				}

				var note = new AsWsResource();
				note.resource = 'Note';
				note.action = 'post';
				note.key = {'ref_id': scope.refId};
				note.message = n;
				note.attributes = {'request_id': scope.requestId};
				
				note.message.content = $('#add-note-content').data('wysiwyg').getValue();
				
				asWebSocket.send(note);
				
				if(scope.shouldCopy){
					var copyRefId = scope.userId;
					
					if(scope.refId.indexOf('u') === 0){
						copyRefId = scope.projectId;
					}
					
					var noteCopy = new AsWsResource();
					
					noteCopy.resource = 'Note';
					noteCopy.action = 'post';
					noteCopy.key = {'ref_id': copyRefId};
					noteCopy.message = scope.note;
					noteCopy.attributes = {'reason': 'notecopy', 'request_id': scope.requestId};
					
					noteCopy.message.content = $('#add-note-content').data('wysiwyg').getValue();
					
					asWebSocket.send(noteCopy);
				}

				scope.note = {'title': '', 'content': '', 'citations': [{}]};

				$('#add-note-content').data('wysiwyg').setValue(null);

				$('#add-note-modal').modal('hide');
			});
		}
	};
}]);