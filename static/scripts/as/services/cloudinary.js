app.service('asCloudinary', ['cloudinaryFolder', function(cloudinaryFolder){
	this.image = function(public_id, options){
		if(options){
			options.secure = true;
		}
		else{
			options = {secure: true};
		}
		
		return $.cloudinary.image(cloudinaryFolder + '/' + public_id, options);
	};
	
	this.buildUrl = function(public_id, options){
		if(options){
			options.secure = true;
		}
		else{
			options = {secure: true};
		}
		
		return $.cloudinary.url(cloudinaryFolder + '/' + public_id, options);
	};
}]);