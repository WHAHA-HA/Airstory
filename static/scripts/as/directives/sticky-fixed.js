app.directive('asStickyFixed', function() {
	return {
		restrict : 'A',
		scope: {},
		link : function(scope, elem, attr) {
			var element = angular.element(elem);
			
			var container = $(attr.asStickyFixed);
			var height = element.offset().top;
			var windowContainer = $(window);

			container.scroll(function() {
			    if(container.scrollTop() > height){
					element.addClass('sticky-fixed');
					container.addClass('sticky-fixed-container');
				}
			    else if(container.scrollTop() <= height){
			    	element.removeClass('sticky-fixed');
			    	container.removeClass('sticky-fixed-container');
				}
			});
		}
	};
});