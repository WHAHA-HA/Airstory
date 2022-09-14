
app.directive('asShowCitationInDocument', function(){
	return {
		restrict: 'A',
		scope: {
			citation: '=asShowCitationInDocument'
		},
		link: function(scope, element){
			element.click(function(){
				var documentCitation = $('.citation-ref[data-id="' + scope.citation.id + '"]');
				
				if(documentCitation.length){
				    $('#project').scrollTo(documentCitation);
				}
			});
		}
	};
});