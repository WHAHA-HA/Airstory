app.directive('asPopulateAndOpen', ['$parse', function($parse){
	return {
		restrict: 'A',
		scope: {
			from: '=asFrom',
			set: '=asSet',
			target: '@'
		},
		link: function(scope, element){
			element.click(function(e){
				scope.set = scope.from;
				
				$(scope.target).modal('show');
				
				scope.$apply();
				
				e.preventDefault();
				e.stopPropagation();
				return false;
			});
		}
	};
}]);