app.directive('asDeleteDocument', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			doc: '=asDeleteDocument',
			documentId: '=asDocumentId'
		},
		link: function(scope, element){
			element.click(function(){
				var d = new AsWsResource();
				
				d.resource = "Document";
				d.action = "delete";
				d.key = {"project_id": scope.doc.project_id, "id": scope.doc.id};
				
				asWebSocket.send(d);
				
				if(scope.documentId == document.id){
					$('#document').data('wysiwyg').setValue('');
				}
			});
		}
	};
}]);