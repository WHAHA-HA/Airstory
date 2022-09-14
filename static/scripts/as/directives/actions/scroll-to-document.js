app.directive('asScrollToDocument', function(){
	return {
		restrict: 'A',
		link: function(scope, element){
			element.click(function(){
				$('#splitter-viewport').animate({scrollLeft: 0}, 200);
			});
		}
	};
});