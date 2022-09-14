app.directive('asDeleteDocumentConfirm', function(){
	return {
		restrict: 'A',
		scope: {
			doc: '=asFrom',
			set: '=asSet',
			documents: '=asDocuments'
		},
		link: function(scope, element){
			element.click(function(){
				if(scope.doc.project_id && scope.doc.id){
					scope.set = scope.doc;
					scope.$apply();
					scope.$emit('document:delete:request');
				}
				else{
					//TODO: come up with a way to actually look up the document to pop
					scope.documents.pop();
				}
			});
		}
	};
});