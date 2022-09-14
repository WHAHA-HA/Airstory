app.directive('asDatePicker', function(){
	return {
		restrict: 'A',
		scope: true,
		require: 'ngModel',
		link: function(scope, element, attrs, ctrl){
			element.datepicker({dateFormat: 'yy-mm-dd'});
			
			element.change(function(){
			    scope.$apply(function() {
			    	ctrl.$setViewValue(element.val());
			    });
			});
		}
	};
});