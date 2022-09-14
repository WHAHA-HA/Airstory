app.directive('asScrollToNotes', function(){
	return {
		restrict: 'A',
		link: function(scope, element, attr){
			element.click(function(){
				self.location.hash = attr.asLoadpage;
				$('#splitter-viewport').animate({scrollLeft: $('[data-as-splitter-panel="left"]').width()}, 200);
			});
		}
	};
});