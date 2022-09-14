var Diff = function(pre, rm, ins) {
	this.pre = pre;
	this.rm = rm;
	this.ins = ins;
};

app.service('asDiff', function() {
	var _this = this;
	
	this.diff = function(array1, array2) {
		var path = [];
		var d = _this._diff(path, array1, array2);

		console.log('rm: ' + d.rm);
		console.log('ins: ' + d.ins);
		console.log(path);

		var count = 0;

		var partial = array2;

		for (var x = 0; x < path.length - 1; x++) {
			partial = partial[path[x]];
		}

		var partialFrom = array1;

		for (var y = 0; y < path.length - 1; y++) {
			partialFrom = partialFrom[path[y]];
		}

		var patches = [];
		var save = path[path.length - 1];
		
		var replaceLen = d.rm > d.ins ? d.ins : d.rm;

		while (count < d.rm && count < d.ins) {
			p = path.slice(0);
			p[p.length - 1] = save + count;

			if(count > 0 || count == replaceLen - 1){
				if(equals(partialFrom[d.pre + count], partial[d.pre + count])){
					count++;
					continue;
				}
			}
			
			patches.push({
				path : p,
				op : 'replace',
				value : partial[d.pre + count],
				replaces : partialFrom[d.pre + count]
			});
			count++;
		}

		while (count < d.rm) {
			p = path.slice(0);
			p[p.length - 1] = save + count;

			patches.push({
				path : p,
				op : 'remove',
				value : partialFrom[d.pre + count]
			});
			count++;
			
			// We are losing an element, so need to take a step back;
			save--;
		}

		while (count < d.ins) {
			p = path.slice(0);
			p[p.length - 1] = save + count;

			patches.push({
				path : p,
				op : 'add',
				value : partial[d.pre + count]
			});
			count++;
		}
		
		fingerPrint(patches);

		return patches;
	};

	this._diff = function(path, array1, array2) {
		var pre = 0;
		while (pre < array1.length && pre < array2.length && equals(array1[pre], array2[pre])) {
			pre++;
		}

		var post = 0;
		while (post < array1.length - pre && post < array2.length - pre && equals(array1[array1.length - post - 1], array2[array2.length - post - 1])) {
			post++;
		}

		var rm = array1.length - pre - post;
		var ins = array2.length - pre - post;

		var d = new Diff(pre, rm, ins);
		path.push(pre);

		if (rm == 1 && ins == 1 && array1[pre] instanceof Array && array2[pre] instanceof Array) {
			d = _this._diff(path, array1[pre], array2[pre]);
		}

		return d;
	};

	function lookupString(haystack){
	    var haystackLen = haystack.length;
	    
	    if(isArray(haystack) && haystackLen > 1){
	        var start = 1;
	        
	        if(isObject(haystack[1]) && haystackLen > 2){
	            start = 2;
	        }
	            
	        for(var x = start; x < haystackLen; x++){
	            if(isArray(haystack[x])){
	            	 var needle = lookupString(haystack[x]);
	            	 
	            	 if(needle !== null){
	            		 return needle;
	            	 }
	            }
	            else{
	                return haystack[x];
	            }
	        }
	    }
	    else{
	    	return haystack;
	    }
	    
	    return null;
	}
	
	function fingerPrintAddFormatting(patches, x){
		if(patches.length > x && patches[x].op == 'replace'){
			var start = x;
			var newPatches = [];
			if(patches.length > x+1){
				if(patches[x+1].op == 'add'){
					var oldVal = patches[x].replaces;
					
					if(typeof oldVal == "string"){
						var newVal = lookupString(patches[x].value);
						
						if(oldVal.startsWith(newVal) && oldVal.length > newVal.length){
							var remainingStr = oldVal.substring(newVal.length);
							var split = {op: 'split', path: clone(patches[x].path), value: [newVal, remainingStr]};
							
							newPatches.push(split);
							
							if(isArray(patches[x].value)){
								var replace = {op: 'replace', path: patches[x].path, value: patches[x].value, replaces: patches[x].replaces};
								newPatches.push(replace);
							}
						
							for(var y = x+1; y < patches.length && patches[y].op == 'add'; y++){
								var patchStr = lookupString(patches[y].value);
								newVal += patchStr;
								
								
								if(oldVal.startsWith(newVal)){
									x = y+1;
									if(oldVal.length > newVal.length){
										remainingStr = oldVal.substring(newVal.length);
										split = {op: 'split', path: clone(patches[y].path), value: [patchStr, remainingStr]};
										
										newPatches.push(split);
										
										if(isArray(patches[y].value)){
											var midReplace = {op: 'replace', path: patches[y].path, value: patches[y].value, replaces: patchStr};
											newPatches.push(midReplace);
										}
									}
									else if(oldVal.length == newVal.length){
										if(isArray(patches[y].value)){
											var endReplace = {op: 'replace', path: patches[y].path, value: patches[y].value, replaces: patchStr};
											newPatches.push(endReplace);
										}
										break;
									}
									else{
										break;
									}
								}
								else{
									break;
								}
							}
						}
					}
					Array.prototype.splice.apply(patches, [start, x - start].concat(newPatches));
					x = start + newPatches.length;
				}
			}
		}
		return x;
	}
	
	function fingerPrintRemoveFormatting(patches, x){
		if(patches.length > x && patches[x].op == 'replace'){
			var start = x;
			var newPatches = [];
			if(patches.length > x+1){
				if(patches[x+1].op == 'remove'){
					var targetValue = patches[x].value;
					
					if(typeof targetValue == "string"){
						var newVal = lookupString(patches[x].replaces);
						var firstPatch = x;
						
						if(targetValue.startsWith(newVal) && targetValue.length > newVal.length){
						
							for(var y = x+1; y < patches.length && patches[y].op == 'remove'; y++){
								var patchStr = lookupString(patches[y].value);
								var completeStr = newVal + patchStr;

								if(targetValue.startsWith(completeStr) && targetValue.length >= completeStr.length){
									x = y+1;
									if(isArray(patches[y].value)){
										var replace = {op: 'replace', path: patches[firstPatch+1].path, value: patchStr, replaces: patches[y].value};
										newPatches.push(replace);
									}
									
									var merge = {op: 'merge', path: clone(patches[firstPatch].path), value: [newVal, patchStr]};
									newPatches.push(merge);
									
									newVal = completeStr;
								}
								else{
									break;
								}
							}
						}
					}
					Array.prototype.splice.apply(patches, [start, x - start].concat(newPatches));
					x = start + newPatches.length;
				}
			}
		}
		return x;
	}
	
	function fingerPrint(patches){
		for(var x = 0; x < patches.length; x++){
			x = fingerPrintAddFormatting(patches, x);
			x = fingerPrintRemoveFormatting(patches, x);
		}
	}
});