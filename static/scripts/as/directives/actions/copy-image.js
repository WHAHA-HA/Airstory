app.directive('asCopyImage', ['$cookies', 'asWebSocket', function($cookies, asWebSocket){
	var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
	                ];
	return {
		restrict: 'A',
		scope:{
			image: '=asCopyImage',
			projectId: '=asProjectId',
			requestId: '=asRequestId',
			loading: '=asLoading'
		},
		link: function(scope, element){
			element.click(function(){
				var image = clone(scope.image);
				
				var userId = $cookies.get('as-id-clr');
				
				var copyRefId = userId;
				
				if(image.ref_id.indexOf('u') === 0){
					copyRefId = scope.projectId;
				}

				if(image.caption){
					image.caption = 'Copy: ' + image.caption;
				}
				else{
					var d = new Date();
					image.caption = 'Copied on ' + monthNames[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
				}
				
				var imageCopy = new AsWsResource();
				
				imageCopy.resource = 'Image';
				imageCopy.action = 'post';
				imageCopy.key = {'ref_id': copyRefId};
				imageCopy.message = image;
				imageCopy.attributes = {'reason': 'imagecopy', 'request_id': scope.requestId};
				
				asWebSocket.send(imageCopy);
				
				scope.loading.clazz = ['alert', 'alert-info'];
				scope.loading.msg = 'Copying image...';
				scope.$apply();

				element.closest('.modal').modal('hide');
			});
		}
	};
}]);