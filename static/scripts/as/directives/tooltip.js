app.directive('asTooltip', ['$compile', function($compile){
	return {
		restrict: 'A',
		link: function(scope, element, attrs){
			setTimeout(function(){
				if(element.attr('title')){
					element.tooltip({delay: { 'show': 800, 'hide': 100 }, placement: 'bottom'});
				}
			});
			
			element.mouseover(function(){
				if((!element.attr('title') && element.attr('data-as-title')) || (element.attr('data-as-title') && element.attr('title') !== element.attr('data-as-title'))){
					var title = element.attr('data-as-title');
					element.attr('title', title);
					
					if(title && title.length >= 10){
						element.tooltip({delay: { 'show': 800, 'hide': 100 }, placement: 'auto', title: element.attr('data-as-title')});
						element.tooltip('toggle');
					}
				}
			});
		}
	};
}]);