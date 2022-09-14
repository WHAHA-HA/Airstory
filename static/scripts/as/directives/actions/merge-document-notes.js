app.directive('asMergeDocumentNotes', function(){
	return {
		restrict: 'A',
		scope: true,
		link: function(scope, element){
			element.click(function(){
				$('.as-editor-card-handle').contents().unwrap();
				$('.as-editor-card').contents().unwrap();
				$('.as-editor-card-controls').remove();
			});
		}
	};
});