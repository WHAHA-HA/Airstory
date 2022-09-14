if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position){
      position = position || 0;
      return this.substr(position, searchString.length) === searchString;
  };
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

var isObject = function(obj) {
	return (!!obj) && (obj.constructor === Object);
};

var isArray = function(obj) {
	  return Object.prototype.toString.call(obj) == '[object Array]';
};

var clone = function(o) {
	return JSON.parse(JSON.stringify(o));
};

function find(needle, haystack, path, elementPath){
	for(var x = 0; x < haystack.length; x++){
		if(haystack[x].id === needle.id){
			path.unshift(x);
			
			if(elementPath !== undefined){
				elementPath.unshift(haystack[x]);
			}
			
			return true;
		}
		else if(haystack[x].items){
			var found = find(needle, haystack[x].items, path, elementPath);
			
			if(found){
				path.unshift('items');
				path.unshift(x);
				
				if(elementPath !== undefined){
					elementPath.unshift(haystack[x].items);
					elementPath.unshift(haystack[x]);
				}
				
				return found;
			}
		}
	}
	
	return false;
}

var traverse = function(snapshot, path) {
	var container, elem, key, p, _i, _len;

	container = {
		data : snapshot
	};
	key = 'data';
	elem = container;
	for (_i = 0, _len = path.length; _i < _len; _i++) {
		p = path[_i];
		elem = elem[key];
		key = p;
		if (typeof elem === 'undefined') {
			throw new Error('bad path');
		}
	}
	return {
		elem : elem,
		key : key
	};
};

var equals = function(item1, item2) {
	if (item1 instanceof Array && item2 instanceof Array) {
		return arrayEquals(item1, item2);
	} else if (item1 instanceof Object && item2 instanceof Object) {
		return objectEquals(item1, item2);
	} else {
		return item1 === item2;
	}
};

var objectEquals = function(object1, object2) {
	// For the first loop, we only check for types
	for (var o1propName in object1) {
		if(o1propName != 'tabindex'){
			// Check for inherited methods and properties - like .equals itself
			// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty
			// Return false if the return value is different
			if (object1.hasOwnProperty(o1propName) != object2.hasOwnProperty(o1propName)) {
				return false;
			}
			// Check instance type
			else if (typeof object1[o1propName] != typeof object2[o1propName]) {
				// Different types => not equal
				return false;
			}
		}
	}
	// Now a deeper check using other objects property names
	for (var o2propName in object2) {
		if(o1propName != 'tabindex'){
			// We must check instances anyway, there may be a property that only
			// exists in object2
			// I wonder, if remembering the checked values from the first loop
			// would be faster or not
			if (object1.hasOwnProperty(o2propName) != object2.hasOwnProperty(o2propName)) {
				return false;
			} else if (typeof object1[o2propName] != typeof object2[o2propName]) {
				return false;
			}
			// If the property is inherited, do not check any more (it must be
			// equa if both objects inherit it)
			if (!object1.hasOwnProperty(o2propName))
				continue;

			// Now the detail check and recursion

			// This returns the script back to the array comparing
			if (object1[o2propName] instanceof Array && object2[o2propName] instanceof Array) {
				// recurse into the nested arrays
				if (!arrayEquals(object1[o2propName], object2[o2propName]))
					return false;
			} else if (object1[o2propName] instanceof Object && object2[o2propName] instanceof Object) {
				// recurse into another objects
				if (!objectEquals(object1[o2propName], object2[o2propName]))
					return false;
			}
			// Normal value comparison for strings and numbers
			else if (object1[o2propName] !== object2[o2propName]) {
				return false;
			}
		}
	}
	// If everything passed, let's say YES
	return true;
};

var arrayEquals = function(array1, array2) {
	// if the other array is a falsy value, return
	if (!array1 || !array2)
		return false;

	// Real quick way to see if two arrays are equal
	if (array1.length != array2.length){
		return false;
	}

	for (var i = 0, l = array1.length; i < l; i++) {
		// Check if we have nested arrays
		if (array1[i] instanceof Array && array2[i] instanceof Array) {
			// recurse into the nested arrays
			if (!arrayEquals(array1[i], array2[i])) {
				return false;
			}
		} else if (array1[i] instanceof Object && array2[i] instanceof Object) {
			// recurse into another objects
			if (!objectEquals(array1[i], array2[i]))
				return false;
		} else if (array1[i] !== array2[i]) {
			// Warning - two different object instances will never be equal:
			// {x:20} != {x:20}
			return false;
		}
	}
	return true;
};