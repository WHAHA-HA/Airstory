app.directive('asCloudinaryImage', function(){
	return {
		restrict: 'E',
		scope: {
			image: '=image',
			maxWidth: '@',
			linked: '@'	
		},
		template: '<img />',
		replace: true,
		controller: ['$scope', '$element', 'asCloudinary', function($scope, $element, asCloudinary){
			$scope.$watch('image', function(){
				if($scope.image && $scope.image.id){
					var options = {};
					if($scope.image.width > $scope.maxWidth){
						options.width = $scope.maxWidth;
						options.crop = 'scale';
					}
					
					$element.attr('src', asCloudinary.buildUrl($scope.image.id + '/' + $scope.image.name, options));
				}
			});
			
			if($scope.linked){
				$element.click(function(){
					var seg = $(this).attr('src').split('/');
					
					var file = seg.pop();
					var folder = seg.pop();
					
					window.open(asCloudinary.buildUrl(folder + '/' + file), '_blank');
				});
			}
		}]
	};
});