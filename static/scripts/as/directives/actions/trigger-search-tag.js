app.directive('asTriggerSearchTag', function(){
	return{
		restrict: 'A',
		scope: {
			search: '@asTriggerSearchTag'
		},
		link: function(scope, element){
			element.click(function(){
				var search = $(scope.search);
				search.val(element.html());
				
				var e = jQuery.Event("keypress");
				e.which = 13;
				e.keyCode = 13;
				search.trigger(e);
				
				e.preventDefault();
				e.stopPropagation();
				return false;
			});
		}
	};
});