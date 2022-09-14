app.directive('asCreateDocumentTitle', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			documents: '=asDocuments',
			projectId: '=asProjectId',
		},
		link: function(scope, element){
			element.click(function(){
				var doc = {};
				
				doc.project_id = scope.projectId;
				doc.action = 'create';
				doc.clazz = 'focus-document';
				
				if(scope.documents){
					scope.documents.push(doc);
				}
				else{
					scope.documents = [doc];
				}
				
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

				setTimeout(function(){
					$('.focus-document input').focus();
				}, 1);
			});
		}
	};
}]);