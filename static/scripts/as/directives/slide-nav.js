
app.directive('asSlideNav', function(){
	return {
		restrict: 'A',
		scope: {
			expanded: '=asExpanded'
		},
		link: function(scope, elem, attr){
			var element = angular.element(elem);
			var slideNav = $(attr.asSlideNav);
			
			$(document).click(function(){
				if(slideNav.width() !== 50){
					slideNav.animate({width: '50px'}, {duration: 400, complete: function(){
							//slideNav.hide();
							isExtended = false;
						}
					});
				}
			});
			
			element.click(function(e){
				if(slideNav.width() === 50){
					//slideNav.show();
					slideNav.animate({width: '300px'}, {duration: 400, complete: function(){
							isExtended = true;
						}
					});

	    			e.preventDefault();
	    			e.stopPropagation();
	    			return false;
				}
			});
		}
	};
});

app.directive('asLogout', ['$http', '$cookies', function($http, $cookies){
	return {
		restrict: 'A',
		scope: {},
		link: function(scope, elem, attr){
			var element = angular.element(elem);
			
			element.click(function(){
				var userId = $cookies.get('as-id-clr');
				$http.post('/v1/users/' + userId + "/deauthenticate").then(function(response){
					self.location = '/login';
				});
			});
		}
	};
}]);