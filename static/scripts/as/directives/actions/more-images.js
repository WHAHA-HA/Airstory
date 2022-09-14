app.directive('asMoreImages', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			nextStart: '=asNextStart',
			type: '=asType',
			refId: '=asRefId',
			search: '=asSearch'
		},
		link: function(scope, element){
			element.click(function(){
				if(scope.nextStart){
					var images = new AsWsResource();
	
					//TODO: merge with more-notes.js
					images.resource = 'Images';
					images.action = 'get';
					
					if(scope.type != 'all'){
						images.key = {"ref_id": scope.refId};
					}
					
					if(scope.search || (scope.nextStart && scope.nextStart.start)){
						images.attributes = {"start": scope.nextStart.start, 'display_option': 'append', 'search': scope.search};
					}
					else{
						images.attributes = {"start_ref_id": scope.nextStart.ref_id, "start_id": scope.nextStart.id, 'display_option': 'append'};
					}
	
					asWebSocket.send(images);
				}
			});
		}
	};
}]);