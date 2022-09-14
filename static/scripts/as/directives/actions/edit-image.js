app.directive('asEditImage', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			image: '=asEditImage'
		},
		link: function(scope, element){
			element.click(function(){
				var image = new AsWsResource();
				
				image.resource = 'Image';
				image.action = 'put';
				image.key = {'ref_id': scope.image.ref_id, 'id': scope.image.id};
				image.message = scope.image;
				
				asWebSocket.send(image);
				
				element.closest('.modal').modal('hide');
			});
		}
	};
}]);