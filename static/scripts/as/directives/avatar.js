app.directive('asAvatar', ['$cookies', function($cookies){
	return {
		restrict: 'A',
		link: function(scope, element){
			var avatarUrl = $cookies.getObject('as-avatar-clr');
			
			if(avatarUrl){
				element.attr('src', avatarUrl + '?d=mm&s=28');
			}
			else{
				element.attr('src', 'https://www.gravatar.com/avatar/1?d=mm&s=28');
			}
		}
	};
}]);