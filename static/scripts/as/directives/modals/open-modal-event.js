app.directive('asOpenModalEvent', function(){
	return {
		restrict: 'A',
		link: function(scope, element, attr){
			element.appendTo(document.body);
			
			scope.$on(attr.asOpenModalEvent, function(event){
				element.modal('show');
			});
		}
	};
});