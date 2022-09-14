app.directive('asAddQueryToLink', ['asURL', function(asURL){
	return {
		restrict: 'A',
		scope: true,
		link: function(scope, element){
			element.click(function(e){
				e.preventDefault();
				e.stopPropagation();
				
				var searchString = asURL.search();
				
				if(searchString){
					self.location = element.attr('href') + searchString;
				}
				else{
					self.location = element.attr('href');
				}
				return false;
			});
		}
	};
}]);