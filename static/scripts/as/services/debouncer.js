app.service('asDebouncer', function(){
	this.debounce = function( func , timeout ) {
	   var timeoutID = null;
	   timeout = timeout || 200;
	   return function () {
	      var scope = this , args = arguments;
	      clearTimeout( timeoutID );
	      timeoutID = setTimeout( function () {
	          func.apply( scope , Array.prototype.slice.call( args ) );
	      } , timeout );
	   };
	};
});