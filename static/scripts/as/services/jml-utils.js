app.service('asJmlUtils', function(){
	var that = this;
	
	this.convertToDomPath = function(jml, jmlPath, op, domPath){
		//domPath.push(0);
		var partial = jml;

		var changeToAttr = JsonML.isAttributes(op);
		
		for(var x = 0; x < jmlPath.length; x++){
			var jp = jmlPath[x];
			
			if(jp === 0 || (x == jmlPath.length - 1 && jp === 1 && changeToAttr)){
				//skip
			}
			else{
				//TODO: verify that partial has more than 1 item in array
				var hasAttr = JsonML.isAttributes(partial[1]);
				
				//TODO: Check that the incoming change are attributes. If they arent, dont go a level up!
				if((jp === 1 && !hasAttr) || jp > 1){
					if(hasAttr){
						domPath.push(jp - 2);
					}
					else{
						domPath.push(jp - 1);
					}
				}
			}
			partial = partial[jp];
		}
	};
	
	function getCursor(dom, changePoint, adj){
		try{
			var sel = rangy.getSelection();
			if(!dom || sel.rangeCount === 0 || !sel.anchorNode || !sel.anchorOffset || !sel.focusNode || !sel.focusOffset){
				return -1;
			}
			else{
				var range = sel.getRangeAt(0);
				
				if(range.compareNode(dom) == 2){
					if(range.comparePoint(dom, changePoint) == -1){
						return range.endOffset + adj;
					}
					else{
						return range.endOffset;
					}
				}
				else{
					return -1;
				}
			}
		}
		catch(e){
			console.log('Cursor failed');
			return -1;
		}
	}
	
	function setCursor(dom, pos){
		var range = rangy.createRange();
		
		range.setStartAndEnd(dom, pos);
		
		var sel = rangy.getSelection();
		sel.setSingleRange(range);
	}
	
	function ld(dom, jml, jmlPath, op){
		var partialDom = dom;

		var domPath = [];
		that.convertToDomPath(jml, jmlPath, op.ld, domPath);
		
		for(var x = 0; x < domPath.length - 1; x++){
			partialDom = partialDom.childNodes[domPath[x]];
		}
		
		var partialChild = partialDom.childNodes[domPath[domPath.length-1]];
		
		if(op.p[op.p.length-1] === 1 && JsonML.isAttributes(op.ld)){
		    for(var y = 0; y < partialChild.attributes.length; y++){
		    	partialChild.removeAttributeNode(partialChild.attributes[y]);
		    }
		}
		else{
			partialDom.removeChild(partialChild);
		}
	}
	
	function li(dom, jml, jmlPath, op){
		var partialDom = dom;
		var partialJml = jml;
		
		var domPath = [];
		that.convertToDomPath(jml, jmlPath, op.li, domPath);
		
		for(var x = 0; x < domPath.length - 1; x++){
			partialDom = partialDom.childNodes[domPath[x]];
		}

		for(var y = 0; y < jmlPath.length; y++){
			var tempPartial = partialJml[jmlPath[y]];
			if(jmlPath[y] === 0){
				// If attributes, go up a level to use the full element as well
				// TODO: make more granular to just update the attributes (will include changes to current diff to look inside objects)
				
				jmlPath.pop();
			}
			else{
				partialJml = tempPartial;
			}
		}
		
		if(jmlPath[jmlPath.length-1] === 1 && JsonML.isAttributes(op.li)){
			var partialChildForAttr = partialDom.childNodes[domPath[domPath.length-1]];
			
			for (var key in partialJml) {
				partialChildForAttr.setAttribute(key, partialJml[key]);
			}
		} 
		else{
			var newNode = JsonML.toHTML(partialJml);
			
			if(partialDom.childNodes.length == domPath[domPath.length-1]){
				partialDom.appendChild(newNode);
			}
			else{
				var partialChild = partialDom.childNodes[domPath[domPath.length-1]];
				
				partialDom.insertBefore(newNode, partialChild);
			}
		}
	}
	
	function s(dom, jml, jmlPath, op){
		var operation = op.si ? op.si : op.sd;
		
		//Dont need the last item on the path for string operations
		jmlPath = clone(jmlPath);
		jmlPath.pop();
		
		var domPath = [];
		that.convertToDomPath(jml, jmlPath, operation, domPath);

		var partialDom = dom;
		var partialJml = jml;

		for(var y = 0; y < jmlPath.length; y++){
			partialJml = partialJml[jmlPath[y]];
		}
		
		for(var x = 0; x < domPath.length - 1; x++){
			partialDom = partialDom.childNodes[domPath[x]];
		}

		var domPos = domPath.length-1;
		
		if(domPos === -1){
			domPos = 0;
		}
		
		var partialChild = partialDom.childNodes[domPath[domPos]];
		
		newNode = JsonML.toHTML(partialJml);
		
		var adj = 0;
		
		if(op.si){
			adj += op.si.length;
		}
		
		if(op.sd){
			adj += op.sd.length * -1;
		}
		
		pos = getCursor(partialChild, jmlPath[jmlPath.length-1], adj);
		
		if(newNode){
			partialDom.replaceChild(newNode, partialChild);
		}
		else{
			partialDom.removeChild(partialChild);
		}
		
		if(pos != -1){
			setCursor(newNode, pos);
		}
	}
	
	function ss(dom, jml, jmlPath, op){
		//Dont need the last item on the path for string operations
		jmlPath = clone(jmlPath);
		var splitPoint = jmlPath.pop();
		
		var domPath = [];
		that.convertToDomPath(jml, jmlPath, op.ss, domPath);

		var partialDom = dom;
		
		for(var x = 0; x < domPath.length; x++){
			partialDom = partialDom.childNodes[domPath[x]];
		}
		
		if(partialDom.nodeValue == op.ss[0] + op.ss[1]){
			pos = getCursor(partialDom);
			
			newNode = partialDom.splitText(splitPoint);
			
			if(pos > splitPoint && pos != -1){
				pos -= splitPoint;
				setCursor(newNode, pos);
			}
		}
		else{
			throw 'Strings do not match!';
		}
	}
	
	function sm(dom, jml, jmlPath, op){
		//Dont need the last item on the path for string operations
		jmlPath = clone(jmlPath);
		jmlPath.pop();
		
		var domPath = [];
		that.convertToDomPath(jml, jmlPath, op.sm, domPath);

		var partialDom = dom;
		var partialJml = jml;

		for(var y = 0; y < jmlPath.length; y++){
			partialJml = partialJml[jmlPath[y]];
		}
		
		for(var x = 0; x < domPath.length - 1; x++){
			partialDom = partialDom.childNodes[domPath[x]];
		}
		
		var domPos = domPath.length-1;
		
		if(domPos === -1){
			domPos = 0;
		}

		var partialChild = partialDom.childNodes[domPath[domPos]];
		var removePartialChild = partialDom.childNodes[domPath[domPos]+1];

		newNode = JsonML.toHTML(partialJml);

		var pos = getCursor(partialChild);
		
		if(pos == -1){
			pos = getCursor(removePartialChild);
			
			if(pos != -1){
				pos += op.sm[0].length;
			}
		}

		console.log(partialChild);
		console.log(removePartialChild);
		console.log(newNode);
		
		if(newNode.nodeValue == partialChild.nodeValue + removePartialChild.nodeValue){
			partialDom.replaceChild(newNode, partialChild);
			partialDom.removeChild(removePartialChild);
		}
		else if(newNode.nodeValue == partialChild.nodeValue){
			// All good, no need to do anything
		}
		else{
			throw 'Strings do not match!';
		}

		if(pos != -1){
			setCursor(newNode, pos);
		}
	}
	
	this.patch = function(editor, jml, op){
		var jmlPath = op.p;
		
		try{
			jml = clone(jml);
			
			if(op.si || op.sd){
				console.log('si|sd');
				s(editor.get(0), jml, jmlPath, op);
			}
			else if(op.ss){
				console.log('ss');
				ss(editor.get(0), jml, jmlPath, op);
			}
			else if(op.sm){
				console.log('sm');
				sm(editor.get(0), jml, jmlPath, op);
			}
			else if(op.li || op.ld){
				
				if(op.ld){
					console.log('ld');
					ld(editor.get(0), jml, jmlPath, op);
				}
				
				if(op.li){
					console.log('li');
					li(editor.get(0), jml, jmlPath, op);
				}
			}
			else{
				return false;
			}
		}
		catch(err){
			console.log('There was an error!');
		    console.log(err);
		    return false;
		}
		
		return true;
	};
});