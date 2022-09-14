app.directive('asMoveImage', ['$cookies', 'asWebSocket', function($cookies, asWebSocket){
	return {
		restrict: 'A',
		scope:{
			image: '=asMoveImage',
			projectId: '=asProjectId',
			requestId: '=asRequestId',
			loading: '=asLoading'
		},
		link: function(scope, element, attrs, ctrl){
			element.click(function(){
				var userId = $cookies.get('as-id-clr');

				var moveRefId = userId;
				
				if(scope.image.ref_id.indexOf('u') === 0){
					moveRefId = scope.projectId;
				}
				
				var imageCopy = new AsWsResource();
				
				imageCopy.resource = 'Image';
				imageCopy.action = 'post';
				imageCopy.key = {'ref_id': moveRefId};
				imageCopy.message = scope.image;
				imageCopy.attributes = {'reason': 'imagemove', 'request_id': scope.requestId};
				
				asWebSocket.send(imageCopy);
				
				scope.loading.clazz = ['alert', 'alert-info'];
				scope.loading.msg = 'Moving image...';
				scope.$apply();

				element.closest('.modal').modal('hide');
			});
		}
	};
}]);