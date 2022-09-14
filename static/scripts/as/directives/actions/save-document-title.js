app.directive('asSaveDocumentTitle', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			doc: '=asSaveDocumentTitle',
			documents: '=asDocuments',
			requestId: '=asRequestId'
		},
		link: function(scope, element){
			function saveDocumentTitle(){
				var d = new AsWsResource();
				d.resource = "Document";
				
				if(scope.doc.action == 'create'){
					d.action = "post";
					d.message = {"project_id": scope.doc.project_id, "title": scope.doc.title, type: 'o'};
					d.attributes = {'request_id': scope.requestId};
				}
				else{
					d.action = "put";
					d.key = {"project_id": scope.doc.project_id, "id": scope.doc.id};
					d.message = scope.doc.title;
					//TODO: Move this to message or a different service all together
					d.attributes = {'type': scope.doc.type, 'request_id': scope.requestId};
				}
				
				scope.doc.action = 'view';
				
				asWebSocket.send(d);
			}
			
			element.submit(saveDocumentTitle);
			
			element.find('input').blur(function(){
				if(scope.doc.action == 'create'){
					//TODO: come up with a way to actually look up the document to pop
					scope.documents.pop();
					
					if(scope.documents.length > 3){
						for(var x = scope.documents.length-1; x >= 0; x--){
							if(x > scope.documents.length-4){
								scope.documents[x].hide = false;
							}
							else{
								scope.documents[x].hide = true;
							}
						}
					}
					
					scope.$apply();
				}
				else if(scope.doc.project_id && scope.doc.id){
					saveDocumentTitle();
				}
			});
		}
	};
}]);