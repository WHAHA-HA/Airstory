app.directive('asNoteModal', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			editnote: '=asNoteModal',
			requestId: '=asRequestId'
		},
		controller: ['$scope', '$element', function($scope, $element){
			$element.appendTo(document.body);
			$element.addClass('as-set-to-body');
			
			this.deleteNote = function(){
				var note = new AsWsResource();
				
				note.resource = 'Note';
				note.action = 'delete';
				note.key = {'ref_id': $scope.editnote.ref_id, 'id': $scope.editnote.id};
				
				asWebSocket.send(note);
			};
			
			this.clearEditModal = function(){
				delete $scope.editnote;

				if($('#edit-note-content').data('wysiwyg')){
					$('#edit-note-content').data('wysiwyg').setValue('');
				}

				$('#edit-note-modal').modal('hide');
			};
			
			this.cleanCitations = function(citations){
				for(var y = 0; y < citations.length; y++){
					var citation = citations[y];
					var check = false;
					
					for(var key in citation){
						if(key !== 'changed' && citation[key]){
							check = true;
							break;
						}
					}
					
					if(!check){
						citations.splice(y, 1);
						y--;
					}
				}
			};
			
			this.editNote = function(){
				var tags = [];
				if($scope.editnote.tags){
					for(var x = 0; x < $scope.editnote.tags.length; x++){
						tags.push($scope.editnote.tags[x].text);
					}
				}
				
				var n = angular.copy($scope.editnote);
				n.tags = tags;
				
				this.cleanCitations(n.citations);
				
				var note = new AsWsResource();
				
				note.resource = 'Note';
				note.action = 'put';
				note.key = {'ref_id': $scope.editnote.ref_id, 'id': $scope.editnote.id};
				note.message = n;
				note.attributes = {'request_id': $scope.requestId};
				
				note.message.content = $('#edit-note-content').data('wysiwyg').getValue();
				
				asWebSocket.send(note);
			};
		}]
	};
}]);