app.directive('asDeleteImage', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			image: '=asDeleteImage'
		},
		link: function(scope, element){
			element.click(function(){
				var image = new AsWsResource();
				
				image.resource = 'Image';
				image.action = 'delete';
				image.key = {'ref_id': scope.image.ref_id, 'id': scope.image.id};
				
				asWebSocket.send(image);
				
				element.closest('.modal').modal('hide');
			});
		}
	};
}]);