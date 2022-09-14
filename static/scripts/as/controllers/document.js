app.controller('DocumentCtrl', ['$scope', 'asWebSocket', 'asURL', 'asUniqueId', 'asJmlOT', 'asJmlUtils', 'asCursor', 'asDiff', 'asDebouncer', 'asState', 'asRefreshComments', 'asRefreshCitations', function($scope, asWebSocket, asURL, asUniqueId, asJmlOT, asJmlUtils, asCursor, asDiff, asDebouncer, asState, asRefreshComments, asRefreshCitations){
	var documentCtrl = this;
	$scope.documentCtrl = documentCtrl;
	
	documentCtrl.requestId = asUniqueId;

	documentCtrl.saving = false;
	documentCtrl.errorAction = null;
	
	var urlSegments = asURL.segment();
	
	var projectId = urlSegments[1];
	
	var loadingDocument = false;
	
	documentCtrl.getDocument = function(document){
		if(!loadingDocument){
			loadingDocument = true;
			
			$scope.$emit('document:unloaded', '#document');
			
			if($('#document').data('wysiwyg') && !asWebSocket.reconnecting){
				$('#document').data('wysiwyg').disable();
				$('#document').sortable('disable');
				documentCtrl.message = 'Loading document...';
			}
			
			document.clazz = 'active';
			
			subscribeToDocument(document);
			
			asJmlOT.open(document.id, documentCtrl, $scope, function(){
				asWebSocket.reconnecting = false;
				
				$scope.documentsCtrl.documentId = document.id;

				$scope.$emit('document:populated');
				documentLoaded();
				
				documentCtrl.message = '';
				
				if($('#document').data('wysiwyg')){
					//$scope.documentsCtrl.documentId = json.key.id;
					
					$('#document').data('wysiwyg').composer.undoManager.position = 0;
					$('#document').data('wysiwyg').composer.undoManager.historyStr = [];
					$('#document').data('wysiwyg').composer.undoManager.historyDom = [];
					
					if($scope.siteCtrl.validatePermission($scope.projectCtrl.projectId, 4)){
						$('#document').data('wysiwyg').enable();
						$('#document').sortable('enable');
					}
					else{
						$('#document').data('wysiwyg').disable();
						$('#document').sortable('disable');
					}
				}
				
				loadingDocument = false;
			}, function(){
				loadingDocument = false;
			});
		}
	};
	
	// Start: OT operations to document
	documentCtrl.setup = function(){
		var jml = JSON.parse(JSON.stringify(asJmlOT.doc.snapshot));
		
		if(jml.length !== 0){
			var html = JsonML.toHTML(jml);
			
			$('#document').empty();
			$('#document').append(html.childNodes);
		}
		else{
			$('#document').empty();
		}
	};
	
	documentCtrl.change = function(op) {
		var doc = asJmlOT.doc;

		if(doc.snapshot && doc.snapshot.length > 0){
			start = Date.now();
			console.log('change');
			console.log(op);
	
			pstart = Date.now();
			
			console.log(doc);

			for(var x = 0; x < op.length; x++){
				var patched = asJmlUtils.patch($('#document'), doc.snapshot, op[x]);
				
				if(!patched){
					console.log('other');
					var c = JSON.parse(JSON.stringify(doc.snapshot));
					
					var html = JsonML.toHTML(c);

					var position = asCursor.getCaretPosition($('#document').get(0), op);
					
					$('#document').empty();
					$('#document').append(html.childNodes);
					
					asCursor.setCaretPos($('#document').get(0), position);
					
					break;
				}
			}
	
			end = Date.now();
			console.log('total time: ' + (end - start));
		}
		else{
			$('#document').empty();
		}
	};
	
	documentCtrl.cleanup = function(){

	};
	
	documentCtrl.patched = function(){
		asRefreshComments.process();
		asRefreshCitations.process();

		asJmlOT.scope.$apply();
		
		asRefreshComments.position();
	};
	// End: OT operations to document
	
	function processPatches(doc, patches){
		if (patches && patches.length) {
			var subPatches = patches.splice(0, 25);
			var batch = [];
			
			for (var x = 0; x < subPatches.length; x++) {
				var patch = subPatches[x];
				
				var path = patch.path; 

				if (patch.op == "replace") {
					var lastElement = path[path.length - 1];
					var value = patch.value;
					var oldValue = patch.replaces;

					if (!(value instanceof Array) && lastElement !== 0) {
						console.log('is not array');
						// TODO: Move this logic to diff
						// If we found a string, oldValue would be
						// populated and not an array.
						if (oldValue && !(oldValue instanceof Array) && !(oldValue instanceof Object)) {
							var pre = 0;

							while (pre < oldValue.length && pre < value.length && oldValue.charAt(pre) === value.charAt(pre)) {
								pre++;
							}
							var post = 0;
							while (post < oldValue.length - pre && post < value.length - pre && oldValue.charAt(oldValue.length - post - 1) === value.charAt(value.length - post - 1)) {
								post++;
							}

							var rm = oldValue.length - pre - post;
							var ins = value.length - pre - post;

							if (rm || ins) {
								if (rm) {
									console.log('set - remove');

									asJmlOT.doc.deleteTextAt(path, rm, pre, batch);
								}

								if (ins) {
									value = value.substr(pre, ins);

									console.log('set - insert');

									asJmlOT.doc.insertAt(path, pre, value, batch);
								}
							} else {
								console.log('set - replace');

								asJmlOT.doc.setAt(path, value, batch);
							}
						} else {
							console.log('set - replace');

							asJmlOT.doc.setAt(path, value, batch);
						}

					} else {
						console.log('is array');
						console.log('set - replace');

						asJmlOT.doc.setAt(path, value, batch);
					}
				} else if (patch.op == "remove") {
					var check = true;
					var partialCheck = doc;

					// Check that the element exists before removing it
					for (var u = 0; u < path.length; u++) {
						partialCheck = partialCheck[path[u]];
						if (!partialCheck) {
							check = false;
							break;
						}
					}

					if (check) {
						console.log('remove - remove');

						asJmlOT.doc.removeAt(path, batch);
					}
				} else if (patch.op == "add") {
					console.log('set - add');

					// TODO: Is this really the best thing to do?
					// Shouldnt we check that the object is empty?
					if (!isNaN(path[path.length - 1])) {
						// Ran into situation where was trying to add
						// array elements to an object. This will check
						// if it is an array or object and will change
						// the object to an array if neccessary
						// Check that the element exists before removing it
						var partial = doc;
						var pathElements = [];
						
						for (var z = 0; z < path.length; z++) {
							partial = partial[path[z]];
							pathElements.push(partial);
						}
						
						if (pathElements && pathElements.length > 0 && JsonML.isAttributes(pathElements[pathElements.length - 1])) {
							path.pop();
							asJmlOT.doc.setAt(path, [ patch.value ], batch);

							continue;
						}
					}
					var p = path.slice(0, path.length-1);
					var pos = path[path.length-1];
					
					asJmlOT.doc.insertAt(p, pos, patch.value, batch);

				} 
				else if (patch.op == 'split'){
					asJmlOT.doc.splitAt(path, patch.value, batch);
				}
				else if (patch.op == 'merge'){
					asJmlOT.doc.mergeAt(path, patch.value, batch);
				}
				else {
					console.log('unhandled');
				}
			}
			
			asJmlOT.client.applyClient(batch);
			
			processPatches(doc, patches);
		}
	}

	documentCtrl.interaction = asDebouncer.debounce(function(){
	//documentCtrl.interaction = function() {
		if(asState.syncEditEnabled && $scope.siteCtrl.validatePermission($scope.projectCtrl.projectId, 4)){
			console.log('interaction');
			var start = Date.now();

			var html = $('#document').get(0);

			var json = JsonML.fromHTML(html);
	
			var doc = JSON.parse(JSON.stringify(asJmlOT.doc.snapshot));
	
			var op = null;
			
			if (!doc) {
				asJmlOT.doc.set(json);
				
				doc = json;
			}
			
			var patches = asDiff.diff(doc, json);
			
			console.log('patches');
			console.log(patches);
	
			if (patches && patches.length) {
				documentCtrl.saved(false);
				
				if(patches.length > 1000){
					asJmlOT.doc.set(json);
				}
				else{
					processPatches(doc, patches);
				}
			}
			else if(asState.remoteChanges){
				asState.remoteChanges = false;
				
				var updatedDoc = new AsWsResource();
				
				updatedDoc.resource = 'OT';
				updatedDoc.action = 'post';
				updatedDoc.key = {'document_id': asJmlOT.id};
				updatedDoc.message = {open: true, create: false, v: asJmlOT.client.revision};
				updatedDoc.attributes = {request_id: asJmlOT.requestId};
				
				asWebSocket.send(updatedDoc);
			}
			
			var end = Date.now();
			console.log('total time: ' + (end - start));
		}
	}, 10);
	
	function subscribeToDocument(document){
		var documentSub = new AsWsResource();
		
		documentSub.resource = "Document";
		documentSub.action = "subscribe";
		documentSub.key = {"project_id": projectId, "id": document.id};
		
		asWebSocket.send(documentSub);
	}
	
	$scope.$on('document:load', function(event, document){
		if(!asWebSocket.reconnecting && asJmlOT.id === document.id){
			asJmlOT.ctrl = documentCtrl;
			asJmlOT.scope = $scope;
			
			documentCtrl.setup();
			
			$scope.$emit('document:populated');
			documentLoaded();
		}
		else if(!asWebSocket.reconnecting){
			documentCtrl.getDocument(document);
		}
		else{
			subscribeToDocument(document);
		}
	});
	
	$scope.$on('document:unload', function(){
		asJmlOT.unload();
	});
	
	$scope.$on('document:delete', function(event, document){
		$('#document').data('wysiwyg').setValue('');
	});
	
	$scope.$on('editor:interaction', function(event, editorId){
		if(editorId == 'document'){
			documentCtrl.interaction();
		}
	});
	
	$(document).on('keydown', function(e){
	    if((e.ctrlKey || e.metaKey) && e.which === 83){ // Check for the Ctrl key being pressed, and if the key = [S] (83)
	    	documentCtrl.interaction();
			
	        e.preventDefault();
	        return false;
	    }
	});
	
	$scope.$on('editor:changed', function(e, editorId){
		if(editorId == 'document'){
			documentCtrl.interaction();
		}
	});
	
	$scope.$on('editor:change-triggered', function(e, editorId){
		if(editorId == 'document'){
			documentCtrl.interaction();
		}
	});
	
	$scope.$on('editor:keyup', function(e, editorId){
		if(editorId == 'document'){
			documentCtrl.interaction();
			$scope.$apply();
		}
	});
	
	var stateSavedTimeout = null;
	
	documentCtrl.saved = function(state){
		if(state){
			if(stateSavedTimeout){
				clearTimeout(stateSavedTimeout);
			}
			
			stateSavedTimeout = setTimeout(function(){
				stateSavedTimeout = null;
				documentCtrl.saving = false;
				$scope.$apply();
			}, 300);
		}
		else{
			if(stateSavedTimeout){
				clearTimeout(stateSavedTimeout);
			}
			else{
				documentCtrl.saving = true;
				$scope.$apply();
			}
		}
	};
	
	$scope.$on('$destroy', function(){
		clearTimeout(stateSavedTimeout);
	});
	
	documentCtrl.revert = function(){
		asJmlOT.revert();
	};

	//TODO: Rework to be "hasTextNodes" and escape on the first one found
	function getTextNodesIn(node, includeWhitespaceNodes) {
	    var textNodes = [], nonWhitespaceMatcher = /\S/;

	    function getTextNodes(node) {
	    	if(node){
		        if(node.nodeType == 3){
		            if (includeWhitespaceNodes || nonWhitespaceMatcher.test(node.nodeValue)) {
		                textNodes.push(node);
		            }
		        } 
		        else {
		            for (var i = 0, len = node.childNodes.length; i < len; ++i) {
		                getTextNodes(node.childNodes[i]);
		            }
		        }
	    	}
	    }

	    getTextNodes(node);
	    return textNodes;
	}

	var checkLoadedTimeout = null;
	
	//Triggers an event when the document is loaded AND displayed
	function documentLoaded(){
		clearTimeout(checkLoadedTimeout);
		
		function checkLoaded(){
			var doc = $('#document');
			
			var texts = getTextNodesIn(doc[0]);
			
			if(doc.length && texts.length && doc.html() && doc.html() !== ''){
				$scope.$emit('document:loaded', '#document');
				isLoaded = true;
				clearTimeout(checkLoadedTimeout);
			}
			else{
				checkLoadedTimeout = setTimeout(checkLoaded, 200);
			}
		}
		
		checkLoadedTimeout = setTimeout(checkLoaded, 200);
	}
	
	function displayToolbarControls(){
		var controls = $('.visible-buttons .control, .hidden-controls .control');
		var total = 0;
		
		var hideRemaining = false;
		var isHidden = false;
		
		$('#more-controls').show();
		
		for(var x = 0; x < controls.length; x++){
			var control = controls.eq(x);

			if(control.closest('.persistant-buttons').length){
				control.appendTo('.visible-buttons');
			}
			
			if(hideRemaining){
				control.appendTo('.hidden-controls');
			}
			else if(control.position().top > 20){
				control.appendTo('.hidden-controls');
				hideRemaining = true;
				isHidden = true;
			}
		}
		
		$('#toolbar .visible-buttons .control').css('visibility', 'visible');
		
		if(!isHidden){
			$('#more-controls').hide();
		}
	}
	
	$scope.$on('splitter:resized', function(){
		displayToolbarControls();
	});
	
	$scope.$watch('documentCtrl.message', function(){
		setTimeout(function(){
			displayToolbarControls();
		});
	});
	
	$('#project').on('click', function (e) {
	    if (!$('.as-dropdown').is(e.target) && $('.as-dropdown').has(e.target).length === 0 && $('.open').has(e.target).length === 0) {
	        $('.as-dropdown').removeClass('open');
	    }
	});
	
	$('#workspace').mouseup(function(){
	    $('#document').focus();
	});
	
} ]);