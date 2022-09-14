app.service('asJsonOT', [ 'asDebouncer', 'asWebSocket', 'asUniqueId', function(asDebouncer, asWebSocket, asUniqueId) {
	var asJsonOT = this;

	asJsonOT.unload = function(){
		asJsonOT.doc = null;
		asJsonOT.client = null;
		asJsonOT.requestId = asUniqueId;
		asJsonOT.id = null;
		asJsonOT.reverts = null;
		asJsonOT.scope = null;
		asJsonOT.timeout = null;
	};
	
	asJsonOT.unload();

	var Doc = function(snapshot){
		this.snapshot = snapshot;
	};

	Doc.prototype = {
		setAt : function(path, value, batch) {
			var ref = traverse(this.snapshot, path);
			var elem = ref.elem;
			var key = ref.key;
			
			var op = {
				p : path
			};
			if (elem.constructor === Array) {
				op.li = value;
				if (typeof elem[key] !== 'undefined') {
					op.ld = elem[key];
				}
			} else if (typeof elem === 'object') {
				op.oi = value;
				if (typeof elem[key] !== 'undefined') {
					op.od = elem[key];
				}
			} else {
				throw new Error('bad path');
			}

			if(batch){
				window.jsonml0.apply(asJsonOT.doc.snapshot, [op]);
				batch.push(op);
			}
			else{
				applyClient([op]);
			}
			
			return [op];
		},
		insertAt : function(path, pos, value, batch) {
			var ref = traverse(this.snapshot, path);
			var elem = ref.elem;
			var key = ref.key;
			
			var op = {
				p : path.concat(pos)
			};
			if (elem[key].constructor === Array) {
				op.li = value;
			} else if (typeof elem[key] === 'string') {
				op.si = value;
			}

			if(batch){
				window.jsonml0.apply(asJsonOT.doc.snapshot, [op]);
				batch.push(op);
			}
			else{
				applyClient([op]);
			}
			
			return [op];
		},
	    moveAt: function(path, from, to, batch) {
	        var op = {
	            p: path.concat(from),
	            lm: to
	          };

			if(batch){
				window.jsonml0.apply(asJsonOT.doc.snapshot, [op]);
				batch.push(op);
			}
			else{
				applyClient([op]);
			}
			
			return [op];
	    },
		deleteTextAt : function(path, length, pos, batch) {
			var ref = traverse(this.snapshot, path);
			var elem = ref.elem;
			var key = ref.key;
			
			var op = {
				p : path.concat(pos),
				sd : elem[key].slice(pos, pos + length)
			};

			if(batch){
				window.jsonml0.apply(asJsonOT.doc.snapshot, [op]);
				batch.push(op);
			}
			else{
				applyClient([op]);
			}
			
			return [op];
		},
		removeAt : function(path, batch) {
			var ref = traverse(this.snapshot, path);
			var elem = ref.elem;
			var key = ref.key;
			
			if (typeof elem[key] === 'undefined') {
				throw new Error('no element at that path');
			}
			
			var op = {
				p : path
			};
			
			if (elem.constructor === Array) {
				op.ld = elem[key];
			} else if (typeof elem === 'object') {
				op.od = elem[key];
			} else {
				throw new Error('bad path');
			}

			if(batch){
				window.jsonml0.apply(asJsonOT.doc.snapshot, [op]);
				batch.push(op);
			}
			else{
				applyClient([op]);
			}
			
			return [op];
		},
		set : function(value, batch) {
			return this.setAt([], value, batch);
		}
	};
	
	function applyClient(op){
		window.json0.apply(asJsonOT.doc.snapshot, op);
		asJsonOT.client.applyClient(op);
	}
	
	asJsonOT.open = function(id, scope, success, failure) {
		if(id != asJsonOT.id){
			asJsonOT.scope = scope;
			asJsonOT.doc = null;
			asJsonOT.id = id;
		}
		
		asWebSocket.register('OT', 'post', function(json){
			if(json.code == 200){
				// Open document
				
				if(json.message.create){
					asJsonOT.client = new ot.Client(json.message.v, window.json0);
					asJsonOT.doc = new Doc([]);
					asJsonOT.init();
					
					asJsonOT.reverts = json.message.reverts;
				}
				else if(json.message.create === undefined){
					if(asJsonOT.reverts !== json.message.reverts){
						clearTimeout(asJsonOT.timeout);
						
						// While disconnected, somebody did a revert. Need to get the newest version.
						asJsonOT.scope.outlinerCtrl.message = 'Your document is out of date, please';
						asJsonOT.scope.outlinerCtrl.errorAction = 'reload';
					
						asJsonOT.scope.$apply();
						
						return;
					}
					else if(json.message.last === asJsonOT.client.revision){
						if(json.message.ops.length === 1){
							if(!asJsonOT.client.state.buffer){
								asJsonOT.scope.outlinerCtrl.saved(true);
							}
							asJsonOT.client.serverAck();
						}
						else{
							asJsonOT.scope.outlinerCtrl.message = 'Your document is out of date, please';
							asJsonOT.scope.outlinerCtrl.errorAction = 'reload';
							clearTimeout(asJsonOT.timeout);
							
							asJsonOT.scope.$apply();
							
							return;
						}
					}
					else{
						for(var x = 0; x < json.message.ops.length; x++){
							var op = json.message.ops[x];
							console.log('current: ' + asJsonOT.client.revision + " - recieved: " + op.v);
							
							if(asJsonOT.client.revision == op.v){
								asJsonOT.client.applyServer(op.op);
							}
							else{
								console.log('OT - Wrong version');
							}
						}
						
						asJsonOT.client.serverReconnect();
					}
				}
				else if(json.message.create === false){
					if(json.message.revert){
						// Changing the requestId so that last revision by user doesn't force a reload
						asJsonOT.requestId = uuid.v4();
					}
					
					asJsonOT.client = new ot.Client(json.message.v, window.json0);
					asJsonOT.doc = new Doc(json.message.snapshot);
					asJsonOT.init();
					
					asJsonOT.reverts = json.message.reverts;
				}
				
				asJsonOT.client.sendOperation = function(revision, operation){
					asJsonOT.scope.outlinerCtrl.saved(false);
					console.log(revision + ' - ' + JSON.stringify(operation));
					
					if(asJsonOT.timeout){
						clearTimeout(asJsonOT.timeout);
					}

					var op = new AsWsResource();
					
					op.resource = 'OT';
					op.action = 'patch';
					op.key = {'document_id': asJsonOT.id};
					op.attributes = {request_id: asJsonOT.requestId, type: 'json0'};
					op.message = {v: revision, op: operation};
					
					asWebSocket.send(op);
					
					asJsonOT.timeout = setTimeout(function(){
						asJsonOT.client.serverReconnect();
					}, 10000);
				};
				
				asJsonOT.client.applyOperation = function(operation){
					console.log(JSON.stringify(operation));

					window.json0.incrementalApply(asJsonOT.doc.snapshot, operation, function(smallOp){
						asJsonOT.scope.$apply();
						asJsonOT.change(smallOp);
					});
				};

				asJsonOT.scope.outlinerCtrl.errorAction = null;
				
				if(success){
					success();
				}
			}
			else if(json.code == 500){
				asJsonOT.scope.outlinerCtrl.errorAction = 'revert';
				asJsonOT.scope.$apply();
				
				if(failure){
					failure();
				}
			}
			else if(json.code == 401){
				asJsonOT.scope.outlinerCtrl.message = 'Unauthorized. Go back to projects or try to';
				asJsonOT.scope.outlinerCtrl.errorAction = 'reload';
				asJsonOT.scope.$apply();
				
				if(failure){
					failure();
				}
			}
		});
		
		asWebSocket.register('OT', 'patch', function(json){
			//TODO: Call open if anything other than 200 is returned
			if(json.code == 200){
				if(asJsonOT.client && asJsonOT.client.revision <= json.message.v){
					// Apply operation
					if(json.attributes && json.attributes.request_id == asJsonOT.requestId){
						for(var x = 0; x < json.message.ops.length; x++){
							var op = json.message.ops[x];
	
							console.log('current: ' + asJsonOT.client.revision + " - recieved: " + op.v);
							
							if(asJsonOT.client.revision == op.v){
								asJsonOT.client.applyServer(op.op);
							}
							else{
								console.log('OT - Wrong version');
							}
						}
						
						asJsonOT.scope.outlinerCtrl.saved(true);

						clearTimeout(asJsonOT.timeout);
						
						asJsonOT.client.serverAck();
					}
					else{
						console.log('current: ' + asJsonOT.client.revision + " - recieved: " + json.message.v);
						
						if(asJsonOT.client.revision == json.message.v){
							asJsonOT.client.applyServer(json.message.op);
						}
						else{
							console.log('OT - Wrong version');
	
							var doc = new AsWsResource();
							
							doc.resource = 'OT';
							doc.action = 'post';
							doc.key = {'document_id': id};
							doc.message = {open: true, create: false, v: asJsonOT.client.revision};
							doc.attributes = {type: 'json0', request_id: asJsonOT.requestId};
							
							asWebSocket.send(doc);
						}
					}

					asJsonOT.scope.$apply();
				}
			}
			else if(json.code == 500){
				asJsonOT.scope.outlinerCtrl.message = 'There was an error attempting to save one of your most recent changes, please';
				asJsonOT.scope.outlinerCtrl.errorAction = 'reload';
				asJsonOT.scope.$apply();
			}
			else if(json.code == 409){
				if(asJsonOT.client.revision == json.message.v){
					if(json.message.op){
						asJsonOT.scope.outlinerCtrl.saved(true);
						clearTimeout(asJsonOT.timeout);
						asJsonOT.client.serverAck();
					}
					else{
						asJsonOT.scope.outlinerCtrl.message = 'Your document is out of date, please';
						asJsonOT.scope.outlinerCtrl.errorAction = 'reload';
						clearTimeout(asJsonOT.timeout);
					}
					
					asJsonOT.scope.$apply();
				}
			}
			else if(json.code == 401){
				asJsonOT.scope.outlinerCtrl.message = 'Unauthorized. Go back to projects or try to';
				asJsonOT.scope.outlinerCtrl.errorAction = 'reload';
				asJsonOT.scope.$apply();
			}
		});
		
		asWebSocket.register('Document', 'subscribe', function(json){
			if(json.code == 200){
				var doc = new AsWsResource();
				
				doc.resource = 'OT';
				doc.action = 'post';
				doc.key = {'document_id': asJsonOT.id};
				doc.message = {open: true, create: true};
				doc.attributes = {type: 'json0', request_id: asJsonOT.requestId};
				
				if(asJsonOT.doc && asJsonOT.doc.snapshot && asJsonOT.client){
					doc.message.create = false;
					doc.message.v = asJsonOT.client.revision;
				}
				
				asWebSocket.send(doc);
			}
		});
	};
	
	asJsonOT.init = function(){
		asJsonOT.scope.outlinerCtrl.outline = clone(asJsonOT.doc.snapshot);
	};
	
	asJsonOT.revert = function(){
		var doc = new AsWsResource();
		
		doc.resource = 'OT';
		doc.action = 'post';
		doc.key = {'document_id': asJsonOT.id};
		doc.message = {open: true, create: true, revert: true};
		doc.attributes = {type: 'json0', request_id: asJsonOT.requestId};
		
		asWebSocket.send(doc);
	};

	asJsonOT.change = function(ops) {
		for(var x = 0; x < ops.length; x++){
			var op = ops[x];
			
			var sel = null;
			var pos = -1;
			var id = null;
		
			if(op.si !== void 0 || op.sd !== void 0){
				var path = clone(op.p);
				pos = path.pop();
				
				var stringRef = traverse(asJsonOT.doc.snapshot, path);
				
				id = stringRef.elem.id;
				var input = $('#' + id).find('input');
				
				sel = input.getSelection();
				
				if(sel.start == input.val().length){
					sel = null;
				}
			}
			
			var focus = $('.item:focus');
			var focusPos = focus.index();
			var focusId = -1;
			var focusInput = $('input:focus');
			var focusSel = null;
			
			
			if(focusPos !== -1){
				focusId = asJsonOT.scope.outlinerCtrl.outline[focusPos].id;
			}
			else if(focusInput.length > 0){
				focusSel = focusInput.getSelection();
				focusPos = focusInput.closest('.item').index();
				
				focusId = asJsonOT.scope.outlinerCtrl.outline[focusPos].id;
			}
			
			window.json0.apply(asJsonOT.scope.outlinerCtrl.outline, [op]);
			asJsonOT.scope.$apply();

			if(focusSel !== null){
				$('#' + focusId).find('input').focus();
				$('#' + focusId).find('input').setSelection(focusSel.start, focusSel.end);
			}
			else if(focusId !== -1){
				$('#' + focusId).focus();
			}
			
			if(op.si === void 0 && op.sd === void 0){
				asJsonOT.scope.outlinerCtrl.refreshDisplay();
			}
			
			if(sel !== null){
				var count = op.si !== void 0 ? op.si.length : op.sd.length * -1;
				
				if(pos < sel.start){
					sel.start += count;
				}
				
				if(pos < sel.end){
					sel.end += count;
				}
				
				$('#' + id).find('input').setSelection(sel.start, sel.end);
			}
		}
	};
} ]);