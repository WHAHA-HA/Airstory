app.directive('asSelectImage', ['asCloudinary', function(asCloudinary){
	return {
		restrict: 'A',
		scope: {
			image: '=asSelectImage',
			imgUrl: '=asImgUrl'
		},
		link: function(scope, element){
			element.click(function(){
				var imgUrl = $('#img-url');
				
				if(imgUrl && imgUrl.length){
					scope.imgUrl = asCloudinary.buildUrl(scope.image.id + '/' + scope.image.name);
					scope.$apply();
					
					imgUrl.val(scope.imgUrl);
					
					var ta = imgUrl.get(0);
					ta.scrollLeft = ta.scrollWidth;
					
					$('[data-as-image-resize]').val('1');
				}
			});
		}
	};
}]);