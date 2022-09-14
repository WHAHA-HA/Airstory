app.directive('asImageResize', ['asCloudinary', function(asCloudinary){
	return {
		restrict: 'A',
		scope: {
			imgUrl: '=asImgUrl'
		},
		link: function(scope, element){
			
			scope.$watch('imgUrl', function(){
				var seg = scope.imgUrl.split('/');
				
				if(seg && seg.length > 4){
					var name = seg.pop();
					var id = seg.pop();
					var folder = seg.pop();
					var version = seg.pop();
					var trans = seg.pop();
					
					if(trans === 'upload'){
						element.val('1');
					}
					else{
						var options = trans.split(',');
						
						for(var x = 0; x < options.length; x++){
							if(options[x].indexOf('w_') === 0){
								var width = options[x];
								
								width = width.replace('w_', '');
								
								element.val(width);
							}
						}
					}
				}
			});
			
			element.change(function(){
				var seg = scope.imgUrl.split('/');
				
				if(seg && seg.length > 3){
					var name = seg.pop();
					var id = seg.pop();
					var version = seg.pop();
					var trans = seg.pop();

					var image = null;
					
					if(element.val() == '1'){
						image = asCloudinary.buildUrl(id + '/' + name);
					}
					else{
						image = asCloudinary.buildUrl(id + '/' + name, {width: element.val(), crop: 'scale'});
					}	
					
					scope.imgUrl = image;
					scope.$apply();
					
					var ta = $('#img-url').get(0);
					ta.scrollLeft = ta.scrollWidth;
				}
			});
		}
	};
}]);