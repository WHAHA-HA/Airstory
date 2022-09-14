app.directive('asReload', function(){
	return {
		restrict: 'A',
		link: function(scope, element){
			element.click(function(){
				self.location.reload();
			});
		}
	};
});