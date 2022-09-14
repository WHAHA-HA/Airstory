app.directive('asModal', function(){
	return {
		restrict: 'A',
		controller: ['$scope', '$element', function($scope, $element){
			$element.appendTo(document.body);
			$element.addClass('as-set-to-body');
		}]
	};
});