app.directive('asAddCitation', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			citations: '=asTo'
		},
		link: function(scope, element){
			element.click(function(){
				if(!scope.citations){
					scope.citations = [];
				}
				
				scope.citations.push({'changed': true});
				
				scope.$apply();
			});
		}
	};
}]);