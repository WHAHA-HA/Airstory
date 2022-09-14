app.directive('asGoToProject', function(){
	return {
		restrict: 'A',
		scope: {
			id: '=asGoToProject'
		},
		link: function(scope, element){
			element.click(function(){
				self.location = "/projects/" + scope.id;
			});
		}
	};
});