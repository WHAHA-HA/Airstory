app.directive('asClearField', function(){
	return {
		restrict: 'A',
		scope: {
			field: '@asClearField'
		},
		link: function(scope, element){
			element.click(function(){
				var field = $(scope.field);
				field.val('');
				
				var e = jQuery.Event("keypress");
				e.which = 13;
				e.keyCode = 13;
				field.trigger(e);
			});
		}
	};
});