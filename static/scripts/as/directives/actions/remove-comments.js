app.directive('asRemoveComments', ['asRefreshComments', 'asState', function(asRefreshComments, asState){
	return {
		restrict: 'A',
		scope: {
			commentsCtrl: '=asCommentsCtrl',
			link: '=asLink'
		},
		link: function(scope, element){
			element.click(function(){
				$('[data-link="' + scope.link + '"]').contents().unwrap();
				$('[data-link="' + scope.link + '"]').remove();
				
				scope.commentsCtrl.selected = null;
				
				asRefreshComments.process();
				scope.$apply();
				asRefreshComments.position();

				//scope.$emit('control:change-triggered');
				$('#document').trigger('change');
				
				$('#popup').hide();
			});
		}
	};
}]);