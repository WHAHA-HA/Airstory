app.directive('asEditCitation', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			citation: '=asEditCitation'
		},
		link: function(scope, element){
			element.click(function(){
				var citation = new AsWsResource();
				
				citation.resource = 'Citation';
				citation.action = 'put';
				citation.key = {'ref_id': scope.citation.ref_id, 'id': scope.citation.id};
				citation.message = scope.citation;
				
				asWebSocket.send(citation);
				
				element.closest('.modal').modal('hide');
			});
		}
	};
}]);