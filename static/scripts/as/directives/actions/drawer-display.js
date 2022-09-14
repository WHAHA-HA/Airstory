app.directive('asDrawerDisplay', function(){
	return {
		restrict: 'A',
		scope: {
			r: '=asDrawerDisplay'
		},
		link: function(scope, element){
			element.change(function(){
				self.location.hash = scope.r;
			});
		}
	};
});