app.controller('OutlinerCtrl', ['$scope', '$sce', 'asWebSocket', 'asURL', 'asJmlOT', function($scope, $sce, asWebSocket, asURL, asJmlOT){
	var outlinerCtrl = this;
	outlinerCtrl.addItem = {item: {}, pos: 0, parentArray: []};
	
	outlinerCtrl.saving = false;
	outlinerCtrl.errorAction = null;
	outlinerCtrl.message = '';
	
	outlinerCtrl.outline = [];
	
	var urlSegments = asURL.segment();
	
	var projectId = urlSegments[1];
	
	var startPos = -1;
	var startChildren = [];
	var saveHideChildren = false;
	
	outlinerCtrl.options = {
			items: '.item',
			connectWith: '.sort',
			distance: 5,
			start: function(event, ui){
				var needle = ui.item.sortable.model;
				startPos = outlinerCtrl.outline.indexOf(needle);
				
				if(needle.ref){
					startChildren = [];
				}
				else{
					startChildren = outlinerCtrl.children(needle, startPos);
					
					if(!isObject(needle[1])){
						var op = asJmlOT.doc.insertAt([startPos+2], 1, {});
						op = outlinerCtrl.adjust(op);
						
						window.jsonml0.apply(outlinerCtrl.outline, op);
					}
					
					saveHideChildren = needle[1].hidechildren;
					needle[1].hidechildren = 'true';

					outlinerCtrl.refreshDisplay();
				}
			},
			receive: function(event, ui){
				var pos = ui.item.parent()
	              .find('.item, .card')
	              .index(ui.item);
				
				if(pos > 0){
					var prev = outlinerCtrl.getPrev(pos); //outlinerCtrl.outline[pos-1];
					
					//Adjust position based on if currently a part of a hidden element
					if(prev && prev[1].hidechildren == 'true'){
						var prevIndent = outlinerCtrl.getIndent(prev);
						
						for(var x = pos; x < outlinerCtrl.outline.length; x++){
							var indent = outlinerCtrl.getIndent(outlinerCtrl.outline[x]);
							
							pos = x;
							if(indent <= prevIndent){
								break;
							}
						}
						pos++;
					}
					
					//Adjust the position based on hidden elements (should be added after all hidden elements, but before the first visible one)
					while(outlinerCtrl.outline.length > pos && outlinerCtrl.getIndent(outlinerCtrl.outline[pos]) === 7){
						pos++;
					}
				}
				
				ui.item.sortable.dropindex = pos;
			},
			update: function(event, ui){
				if(ui.item.sortable.received){
					var needle = ui.item.sortable.model;
					var pos = ui.item.sortable.dropindex;
					
					if(pos > 0){
						var prevItem = outlinerCtrl.getPrev(pos); //outlinerCtrl.outline[pos - 1];
						var prevIndent = outlinerCtrl.getIndent(prevItem);

						outlinerCtrl.setIndent(needle, prevIndent);
						outlinerCtrl.setIndent(ui.item.sortable.moved, prevIndent);
						
						var parents = outlinerCtrl.parents(prevItem, pos-1);
						
						for(var x = 0; x < parents.length; x++){
							if(parents[x].item[1].hidechildren == 'true'){
								outlinerCtrl.setIndent(needle, outlinerCtrl.getIndent(parents[x].item));
								outlinerCtrl.setIndent(ui.item.sortable.moved, outlinerCtrl.getIndent(parents[x].item));
								break;
							}
						}
					}
					else{
						outlinerCtrl.setIndent(needle, 1);
						outlinerCtrl.setIndent(ui.item.sortable.moved, 1);
					}
					
					asJmlOT.doc.insertAt([], pos+2, needle);
					
					outlinerCtrl.refreshDisplay();
					
					setTimeout(function(){
						$('#item-' + pos).focus();
					});
				}
				else{
					var idx = ui.item.sortable.dropindex;
					
					if(idx > 0){
						var position = idx;
						var futurePos = position;
						var modified = false;
						
						if(startPos > position){
							position--;
						}
						else{
							futurePos++;
						}
						
						var prev = outlinerCtrl.outline[position];
						
						if(prev[1].hidechildren == 'true'){
							idx++;
							position++;
							prev = outlinerCtrl.outline[position];
							modified = true;
						}
						
						while(!$('#item-' + position).is(':visible') && position < outlinerCtrl.outline.length){
							idx++;
							position++;
							modified = true;
							
							if(position == outlinerCtrl.outline.length){
								break;
							}
							prev = outlinerCtrl.outline[position];
						}
						
						while(outlinerCtrl.outline.length > futurePos && outlinerCtrl.getIndent(outlinerCtrl.outline[futurePos]) === 7){
							futurePos++;
							position++;
						}
						
						if(startPos < position && modified){
							position--;
						}
						else if(startPos > position && !modified){
							position++;
						}
						
						ui.item.sortable.dropindex = position;
					}
				}
			},
			stop: function(event, ui){
				var needle = ui.item.sortable.model;
				var pos = outlinerCtrl.outline.indexOf(needle);
				var endPos = pos;
				
				if(!ui.item.sortable.received){
					var childRange = startPos + startChildren.length - 1;
					
					if(startPos !== pos){
						
						if(startPos !== -1){
							var batch = [];
							
							asJmlOT.doc.moveAt([], startPos+2, pos+2, batch);
							
							var childStartPos = startPos;
							var childPos = pos;
							
							for(var y = 1; y < startChildren.length; y++){
								if(childStartPos > childPos){
									childStartPos++;
									childPos++;
								}
								
								if(childStartPos < pos){
									pos--;
									endPos--;
								}
								
								var moveOp = asJmlOT.doc.moveAt([], childStartPos+2, childPos+2, batch);
								
								moveOp = outlinerCtrl.adjust(moveOp);
								moveOp[0].lm = childPos;
								
								window.jsonml0.apply(outlinerCtrl.outline, moveOp);
							}
							
							var startIndent = outlinerCtrl.getIndent(needle);
							
							var prev = outlinerCtrl.getPrev(pos);
							
							if(prev !== null){
								var prevIndent = outlinerCtrl.getIndent(prev);
								
								outlinerCtrl.setIndent(needle, prevIndent);
								
								var parents = outlinerCtrl.parents(prev, pos-1);
								
								//If the element before this one is hidden, find its first parent that is not hidden and set the indent to that
								for(var x = 0; x < parents.length; x++){
									if(parents[x].item[1].hidechildren == 'true'){
										outlinerCtrl.setIndent(needle, outlinerCtrl.getIndent(parents[x].item));
										break;
									}
								}
							}
							else{
								outlinerCtrl.setIndent(needle, 1);
							}

							var endIndent = outlinerCtrl.getIndent(needle);
							
							outlinerCtrl.updateIndent(needle, pos+2, endIndent, batch);

							var indentOffset = endIndent - startIndent;
							
							for(var z = 1; z < startChildren.length; z++){
								var childIndent = outlinerCtrl.getIndent(startChildren[z].item);

								pos++;
								
								if(childIndent !== 7){
									var newChildIndent = childIndent + indentOffset;
									
									outlinerCtrl.setIndent(startChildren[z].item, newChildIndent);
	
									var indentOp = outlinerCtrl.updateIndent(startChildren[z].item, pos+2, newChildIndent, batch);
									indentOp = outlinerCtrl.adjust(indentOp);
									
									window.jsonml0.apply(outlinerCtrl.outline, indentOp);
								}
							}
							
							asJmlOT.client.applyClient(batch);
						}
						else{
							if(needle[1].hidechildren == 'true'){
								needle[1].hidechildren = 'false';
							}
							asJmlOT.doc.insertAt([], pos+2, needle);
						}
					}
					
					needle[1].hidechildren = saveHideChildren;
					
					outlinerCtrl.refreshDisplay();
				}
				
				startChildren = [];
				startPos = -1;
				
				$('.ui-sortable-placeholder').remove();
				
				$('#item-' + endPos).focus();
			}
		};
	
	outlinerCtrl.removeItem = function(item){
		var pos = outlinerCtrl.outline.indexOf(item);
		
		$('#item-' + pos).prevAll('.item:visible:first').focus();
		
		var batch = [];
		
		var currentIndent = outlinerCtrl.getIndent(outlinerCtrl.outline[pos]);
		
		var ops = asJmlOT.doc.removeAt([pos+2], batch);
		ops = outlinerCtrl.adjust(ops);
		
		window.jsonml0.apply(outlinerCtrl.outline, ops);

		while(outlinerCtrl.outline.length > pos && (outlinerCtrl.getIndent(outlinerCtrl.outline[pos]) === 7 || (currentIndent < outlinerCtrl.getIndent(outlinerCtrl.outline[pos]) && outlinerCtrl.outline[pos][0] === 'DIV'))){
			var childOp = asJmlOT.doc.removeAt([pos+2], batch);
			childOp = outlinerCtrl.adjust(childOp);
			
			window.jsonml0.apply(outlinerCtrl.outline, childOp);
		}
		
		asJmlOT.client.applyClient(batch);
		
		if(!outlinerCtrl.hasDisplayable()){
			outlinerCtrl.setDefault();
		}
	};
	
	outlinerCtrl.editItem = function(item){
		var pos = outlinerCtrl.outline.indexOf(item);
		
		if(!isObject(item[1])){
			var op = asJmlOT.doc.insertAt([pos+2], 1, {});
			op = outlinerCtrl.adjust(op);
			
			window.jsonml0.apply(outlinerCtrl.outline, op);
		}
		
		outlinerCtrl.outline[pos][1].status = 'edit';
		
		setTimeout(function(){
			$('#item-' + pos).find('input').focus();
		});
	};
	
	$('#outline').keydown(function(e){
		// Stop going to previous page when hitting backspace, edgecase issues in the outliner
		if(e.keyCode == 8){
			e.stopPropagation();
			e.preventDefault();
			return false;
		}
	});
	
	outlinerCtrl.adjust = function(op){
		op = clone(op);
		op[0].p[0] -= 2;
		
		return op;
	};
	
	var H_TAGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

	outlinerCtrl.getIndent = function(item){
		var indent = 7;
		
		if(H_TAGS.indexOf(item[0]) != -1){
			indent = parseInt(item[0].slice(1, 2));
		}
		else if(item[0] === 'DIV' && item[1].class && item[1].class.indexOf('as-editor-card') != -1){
			indent = item[1]['data-as-indent'];
			
			if(!indent){
				indent = 1;
			}
			else{
				indent = parseInt(indent);
			}
		}
		
		return indent;
	};
	
	outlinerCtrl.getPrev = function(pos){
		var idx = pos;
		
		while(idx > 0){
			var prev = outlinerCtrl.outline[idx - 1];
			var indent = outlinerCtrl.getIndent(prev);
			
			if(indent !== 7){
				return prev;
			}
			
			idx--;
		}

		return null;
	};
	
	outlinerCtrl.getNext = function(pos){
		var idx = pos;
		
		while(idx < outlinerCtrl.outline.length-1){
			var next = outlinerCtrl.outline[idx + 1];
			var indent = outlinerCtrl.getIndent(next);
			
			if(indent !== 7){
				return next;
			}
			
			idx++;
		}

		return null;
	};
	
	outlinerCtrl.setIndent = function(item, indent){
		if(H_TAGS.indexOf(item[0]) != -1){
			item[0] = 'H' + indent;
		}
		else if(item[0] === 'DIV' && item[1].class && item[1].class.indexOf('as-editor-card') != -1){
			item[1]['data-as-indent'] = '' + indent;
		}
	};
	
	outlinerCtrl.updateIndent = function(item, pos, indent, batch){
		var op = null;
		
		if(H_TAGS.indexOf(item[0]) != -1){
			op = asJmlOT.doc.setAt([pos, 0], 'H' + indent, batch);
		}
		else{
			op = asJmlOT.doc.setAt([pos, 1, 'data-as-indent'], indent, batch);
		}
		
		return op;
	};
	
	outlinerCtrl.setDefault = function(){
		var batch = [];
		
		if(asJmlOT.doc.snapshot && asJmlOT.doc.snapshot.length === 0){
			asJmlOT.doc.setAt([0], 'DIV', batch);
			asJmlOT.doc.setAt([1], {}, batch);
		}
		
		var headerOp = asJmlOT.doc.insertAt([], 2, ['H1', {}, ''], batch);
		headerOp = outlinerCtrl.adjust(headerOp);
		
		window.jsonml0.apply(outlinerCtrl.outline, headerOp);
		
		asJmlOT.client.applyClient(batch);
		
		outlinerCtrl.outline[0][1].status = 'add';
		
		if(!$scope.$$phase){
			$scope.$apply();
		}
		
		setTimeout(function(){
			$('.item input').focus();
		});
	};
		
	outlinerCtrl.getDocument = function(document, isMe){
		if(!asWebSocket.reconnecting){
			outlinerCtrl.message = 'Loading document...';
			
			//TODO: Probably shouldnt have '#document' here....
			$scope.$emit('document:unloaded', '#document');
		}
		
		document.clazz = 'active';
		
		subscribeToDocument(document);
		
		asJmlOT.open(document.id, outlinerCtrl, $scope, function(){
			asWebSocket.reconnecting = false;
			
			$scope.documentsCtrl.documentId = document.id;
			
			outlinerCtrl.message = '';
			
			if($scope.siteCtrl.validatePermission($scope.projectCtrl.projectId, 4)){
				if(isMe && !outlinerCtrl.hasDisplayable(2)){
					if(outlinerCtrl.hasDisplayable() && !outlinerCtrl.outline[0][2]){
						if(outlinerCtrl.outline[0].length === 1){
							var ops = asJmlOT.doc.insertAt([2], 1, {});
							ops = outlinerCtrl.adjust(ops);
							
							window.jsonml0.apply(outlinerCtrl.outline, ops);
						}
						
						outlinerCtrl.outline[0][1].status = 'add';
					}
					else if(!outlinerCtrl.hasDisplayable()){
						outlinerCtrl.setDefault();
					}
				}

				outlinerCtrl.options.disabled = false;
			}
			else{
				outlinerCtrl.options.disabled = true;
			}

			$scope.$apply();
			
			outlinerCtrl.refreshDisplay();

			$scope.$apply();
		});
	};
	
	$scope.$on('document:load', function(event, document, isMe){
		if(!asWebSocket.reconnecting && asJmlOT.id === document.id){
			asJmlOT.ctrl = outlinerCtrl;
			asJmlOT.scope = $scope;
			
			outlinerCtrl.setup();

			if($scope.siteCtrl.validatePermission($scope.projectCtrl.projectId, 4)){
				if(isMe && !outlinerCtrl.hasDisplayable(2)){
					if(outlinerCtrl.hasDisplayable() && !outlinerCtrl.outline[0][2]){
						if(outlinerCtrl.outline[0].length === 1){
							var ops = asJmlOT.doc.insertAt([2], 1, {});
							ops = outlinerCtrl.adjust(ops);
							
							window.jsonml0.apply(outlinerCtrl.outline, ops);
						}
						
						outlinerCtrl.outline[0][1].status = 'add';
					}
					else if(!outlinerCtrl.hasDisplayable()){
						outlinerCtrl.setDefault();
					}
				}
			}
			else{
				outlinerCtrl.options.disabled = true;
			}

			$scope.$apply();
			
			outlinerCtrl.refreshDisplay();

			$scope.$apply();
		}
		else if(!asWebSocket.reconnecting){
			outlinerCtrl.getDocument(document, isMe);
		}
		else{
			subscribeToDocument(document);
		}
	});
	
	$scope.$on('document:unload', function(){
		asJmlOT.unload();
		outlinerCtrl.outline = [];
	});
	
	outlinerCtrl.children = function(item, pos){
		if(!pos){
			pos = outlinerCtrl.outline.indexOf(item);
		}
		
		var children = [{pos: pos, item: item}];
		var indent = outlinerCtrl.getIndent(item);
		
		for(var x = pos+1; x < outlinerCtrl.outline.length; x++){
			var childItem = outlinerCtrl.outline[x];
			var childIndent = outlinerCtrl.getIndent(childItem);
			
			if(indent < childIndent){
				// Once a child is found, add to array
				children.splice(children.length, 0, {pos: x, item: outlinerCtrl.outline[x]});
			}
			else if(indent >= childIndent){
				// We just hit a peer, no more children to be found
				break;
			}
		}
		
		return children;
	};
	
	outlinerCtrl.parents = function(item, pos){
		if(!pos){
			pos = outlinerCtrl.outline.indexOf(item);
		}

		var indent = outlinerCtrl.getIndent(item);
		var directPath = indent;
		var parents = [{pos: pos, item: item}];
		
		for(var x = pos-1; x >= 0; x--){
			var parentItem = outlinerCtrl.outline[x];
			var parentIndent = outlinerCtrl.getIndent(parentItem);
			
			// directPath controls the lowest parent to this child. Once a lower level is found (a parent to this child),
			// that is set as the directPath so that we don't end up checking elements that follow a different branch.
			if(directPath > parentIndent){
				// Once a parent is found, add to array and set it as the new directPath.
				parents.splice(0, 0, {pos: x, item: outlinerCtrl.outline[x]});
				directPath = parentIndent;
			}
			if(parentIndent === 1){
				// Can't go any lower, so just break out
				break;
			}
		}
		
		return parents;
	};
	
	outlinerCtrl.hasDisplayable = function(m){
		var count = 0;
		var min = 1;
		
		if(m){
			min = m;
		}
		
		for(var x = 0; x < outlinerCtrl.outline.length; x++){
			var item = outlinerCtrl.outline[x];
			if((H_TAGS.indexOf(item[0]) != -1) || (item[0] === 'DIV' && item[1].class && item[1].class.indexOf('as-editor-card') != -1)){
				count++;
			}
			
			if(count === min){
				return true;
			}
		}
		
		return false;
	};
	
	outlinerCtrl.refreshDisplay = function(){
		$('.hiddenChild').removeClass('hiddenChild');
		$('.hiddenElem').removeClass('hiddenElem');
		$('.multiImage').removeClass('multiImage');
		
		var lastIndent = 0;
		var lastTag = null;
		
		for(var x = 0; x < outlinerCtrl.outline.length; x++){
			var item = outlinerCtrl.outline[x];
			
			if(H_TAGS.indexOf(item[0]) !== -1 && item[1] && item[1].hidechildren === 'true'){ //} || (item[0] === 'DIV' && item[1].class && item[1].class.indexOf('as-editor-card') != -1)){
				var indent = outlinerCtrl.getIndent(item);
				lastIndent = indent;
				
				while(outlinerCtrl.outline.length > x+1){
					var nextIndent = outlinerCtrl.getIndent(outlinerCtrl.outline[x+1]);
					
					if(indent < nextIndent){
						x++;
						$('#item-' + x).addClass('hiddenChild');
					}
					else{
						break;
					}
				}
				
				lastTag = 'header';
			}
			else if(item[0] === 'DIV' && item[1].class && item[1].class.indexOf('as-editor-card') != -1){
				var isImage = item[1].ref && item[1].ref.indexOf('|i') != -1 && !item[1].caption;
				
				if(lastTag === 'image-card' && isImage){
					$('#item-' + x).addClass('multiImage');
				}
				
				outlinerCtrl.setIndent(item, lastIndent + 1);
				
				if(isImage && item[1].caption){
					lastTag = 'image-card-w-caption';
				}
				else if(isImage){
					lastTag = 'image-card';
				}
				else{
					lastTag = 'note-card';
				}
			}
			else if(H_TAGS.indexOf(item[0]) === -1){
				$('#item-' + x).addClass('hiddenElem');
				lastTag = 'other';
			}
			else if(H_TAGS.indexOf(item[0]) !== -1){
				lastIndent = outlinerCtrl.getIndent(item);
				lastTag = 'header';
			}
		}
	};
	
	// Start: OT operations to document
	outlinerCtrl.setup = function(){
		outlinerCtrl.outline = clone(asJmlOT.doc.snapshot).slice(2);
	};
	
	outlinerCtrl.change = function(op) {
		op = outlinerCtrl.adjust(op);
		
		if(op[0].lm !== undefined){
			op[0].lm -= 2;
		}
		
		window.jsonml0.apply(outlinerCtrl.outline, op);
	};
	
	outlinerCtrl.cleanup = function(){
		$scope.$apply();
		outlinerCtrl.refreshDisplay();
		$scope.$apply();
	};
	
	outlinerCtrl.patched = function(){
		
	};
	// End: OT operations to outliner
	
	function subscribeToDocument(document){
		var documentSub = new AsWsResource();
		
		documentSub.resource = "Document";
		documentSub.action = "subscribe";
		documentSub.key = {"project_id": projectId, "id": document.id};
		
		asWebSocket.send(documentSub);
	}
	
	var stateSavedInterval = null;
	
	outlinerCtrl.saved = function(state){
		if(state){
			if(stateSavedInterval){
				clearInterval(stateSavedInterval);
			}
			
			stateSavedInterval = setTimeout(function(){
				stateSavedInterval = null;
				outlinerCtrl.saving = false;
				$scope.$apply();
			}, 300);
		}
		else{
			if(stateSavedInterval){
				clearInterval(stateSavedInterval);
			}
			else{
				outlinerCtrl.saving = true;
				if(!$scope.$$phase) {
					$scope.$apply();
				}
			}
		}
	};
	
	outlinerCtrl.renderTitle = function(item){
		var idx = 1;
		
		if(isObject(item[1])){
			idx = 2;
		}
		
		var title = item[idx];
		
		if(isObject(item[1]) && item[1].class && item[1].class.indexOf('as-editor-card') !== -1){
			if(item[1].ref){
				var ids = item[1].ref.split('|');
				
				if(ids[1].startsWith('i')){
					var img = outlinerCtrl.findElementByTypeAndID(title, 'IMG', undefined, []);
					
					title = img[1].src;
					
					if(title.indexOf('res.cloudinary.com') != -1){
						var imgRef = title.substring(title.indexOf('/v1'));
						
						title = 'https://res.cloudinary.com/airstory/image/upload/c_scale,w_66' + imgRef;
					}
					
					title = '<img src="' + title + '" />';
					
					if(item[1].caption){
						title += '<span class="caption">' + item[1].caption + "</span>";
					}
				}
				else{
					if(item[1]['card-title']){
						title = item[1]['card-title'];
					}
					else{
						title = JsonML.toHTML(title);
						$(title).find('sup').remove();
						title = title.textContent || title.innerText || "";
					}
					
					if(title.length > 100){
						title = title.substring(0, 100).trim() + '...';
					}
				}
			}
			else{
				title = JsonML.toHTML(title);
				$(title).find('sup').remove();
				title = title.textContent || title.innerText || "";
				
				if(title.length > 100){
					title = title.substring(0, 100).trim() + '...';
				}
			}
		}
		else if(title){
			if(H_TAGS.indexOf(item[0]) != -1){
				if(isArray(title)){
					var pos = outlinerCtrl.outline.indexOf(item);
					
					title = JsonML.toHTMLText(title);
					var div = document.createElement('div');
					div.innerHTML = title;
					
					title = div.textContent || div.innerText || "";
					
					var op = asJmlOT.doc.setAt([pos+2, idx], title);
					op = outlinerCtrl.adjust(op);
					
					window.jsonml0.apply(outlinerCtrl.outline, op);
				}
				else{
					title = JsonML.toHTMLText(title);
				}
			}
			else{
				title = '';
			}
		}
		
        return $sce.trustAsHtml(title);
	};
	
	outlinerCtrl.revert = function(){
		asJmlOT.revert();
	};
	
	outlinerCtrl.caretClazz = function(item){
		if(item[1] === undefined || !item[1].class || item[1].class.indexOf('as-editor-card') === -1){
			var idx = outlinerCtrl.outline.indexOf(item);
			var clazz = null;
			
			var currentIndent = outlinerCtrl.getIndent(item);
			var children = outlinerCtrl.children(item);
			
			for(var x = 1; x < children.length; x++){
				if(outlinerCtrl.getIndent(children[x].item) !== 7){
					if(item[1].hidechildren == 'true'){
						return 'right-caret';
					}
					else{
						return 'down-caret';
					}
				}
			}
			
			return 'lite-caret';
		}
	};
	
	outlinerCtrl.expand = function(){
		var batch = [];
		
		for(var x = 0; x < outlinerCtrl.outline.length; x++){
			if(H_TAGS.indexOf(outlinerCtrl.outline[x][0]) !== -1 && outlinerCtrl.outline[x][1].hidechildren == 'true'){
				var op = asJmlOT.doc.setAt([x+2, 1, 'hidechildren'], 'false', batch);
				op = outlinerCtrl.adjust(op);
				
				window.jsonml0.apply(outlinerCtrl.outline, op);
			}
		}
		
		if(batch.length && $scope.siteCtrl.validatePermission($scope.projectCtrl.projectId, 4)){
			asJmlOT.client.applyClient(batch);
		}
		
		outlinerCtrl.refreshDisplay();
	};
	
	outlinerCtrl.collapse = function(){
		var batch = [];
		
		for(var x = 0; x < outlinerCtrl.outline.length; x++){
			var indent = outlinerCtrl.getIndent(outlinerCtrl.outline[x]);
			var next = outlinerCtrl.getNext(x);
			
			if(next !== null){
				var nextIndent = outlinerCtrl.getIndent(next);
				
				if(indent < 7 && outlinerCtrl.outline[x][1].hidechildren != 'true' && !outlinerCtrl.outline[x][1].ref && indent < nextIndent){
					if(!isObject(outlinerCtrl.outline[x][1])){
						var attrOp = asJmlOT.doc.insertAt([x+2], 1, {}, batch);
						attrOp = outlinerCtrl.adjust(attrOp);
						
						window.jsonml0.apply(outlinerCtrl.outline, attrOp);
					}
					
					var op = asJmlOT.doc.setAt([x+2, 1, 'hidechildren'], 'true', batch);
					op = outlinerCtrl.adjust(op);
					
					window.jsonml0.apply(outlinerCtrl.outline, op);
				}
			}
		}
		
		if(batch.length && $scope.siteCtrl.validatePermission($scope.projectCtrl.projectId, 4)){
			asJmlOT.client.applyClient(batch);
		}
		
		outlinerCtrl.refreshDisplay();
	};
	
	outlinerCtrl.findElementByTypeAndID = function(doc, type, id, path){
		var isAnArray = isArray(doc);
		
		var hasAttr = isAnArray && doc.length > 1 && isObject(doc[1]);
		var childStartIdx = 1;
		
		if(hasAttr){
			childStartIdx = 2;
		}
		
		if(doc[0] === type && hasAttr && doc[1].id === id){
			return doc;
		}
		 
		if(isAnArray){
			for(var y = childStartIdx; y < doc.length; y++){
				var elem = outlinerCtrl.findElementByTypeAndID(doc[y], type, id, path);
				
				if(elem !== null){
					path.unshift(y);
					
					return elem;
				}
			}
		}

		/*for(var x = 0; x < doc.length; x++){
			var isAnArray = isArray(doc[x]);
			var hasAttr = isAnArray && doc[x].length > 1 && isObject(doc[x][1]);
			var childStartIdx = 1;
			
			if(hasAttr){
				childStartIdx = 2;
			}
			
			if(doc[x][0] === type && hasAttr && doc[x][1].id === id){
				if(path){
					path.push(x);
				}
				return doc[x];
			}
			
			if(isAnArray){
				for(var y = childStartIdx; y < doc[x].length; y++){
					var elem = outlinerCtrl.findElementByTypeAndID(doc[x][y], type, id);
					
					if(elem !== null){
						path.push(y);
						
						return elem;
					}
				}
			}
		}*/
		
		return null;
	};
}]);