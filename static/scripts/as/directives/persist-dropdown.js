app.directive('asPersistDropdown', function(){
	return {
		restrict: 'A',
		scope: {},
		link: function(scope, element){
			element.click(function(e){
				e.stopPropagation();
			});
		}
	};
});