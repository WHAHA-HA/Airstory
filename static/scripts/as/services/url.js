app.service('asURL', function(){
	return new URI(self.location);
});