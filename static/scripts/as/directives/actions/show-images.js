app.directive('asShowImages', function(){
	return {
		restrict: 'A',
		link: function(scope, element){
			element.click(function(){
				scope.$emit('splitter:request', '/images/project');
			});
		}
	};
});