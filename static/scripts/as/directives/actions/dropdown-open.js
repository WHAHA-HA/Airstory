app.directive('asDropdownOpen', function(){
	return {
		restrict: 'A',
		scope: true,
		link: function(scope, element){
			element.click(function(){
				element.closest('.btn-group').addClass('open');
			});
		}
	};
});