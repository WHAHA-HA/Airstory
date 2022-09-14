app.service('asJmlOT', ['asCursor', 'asWebSocket', 'asUniqueId', 'asState', function(asCursor, asWebSocket, asUniqueId, asState) {
	var asJmlOT = this;

	asJmlOT.unload = function(){
		asJmlOT.doc = null;
		asJmlOT.client = null;
		asJmlOT.ctrl = null;
		asJmlOT.requestId = asUniqueId;
		asJmlOT.id = null;
		asJmlOT.reverts = null;
		asJmlOT.scope = null;
		asJmlOT.timeout = null;
	};
	
	asJmlOT.unload();

	var Doc = function(snapshot){
		this.snapshot = snapshot;
	};

	Doc.prototype = {
		setAt : function(path, value, batch) {
			var ref = traverse(this.snapshot, path);
			var elem = clone(ref.elem);
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
				window.jsonml0.apply(asJmlOT.doc.snapshot, [op]);
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
				window.jsonml0.apply(asJmlOT.doc.snapshot, [op]);
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
				window.jsonml0.apply(asJmlOT.doc.snapshot, [op]);
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
				window.jsonml0.apply(asJmlOT.doc.snapshot, [op]);
				batch.push(op);
			}
			else{
				applyClient([op]);
			}
			
			return [op];
		},
		splitAt : function(path, val, batch){
			var op = {
				p : path.concat(val[0].length),
				ss : val
			};

			if(batch){
				window.jsonml0.apply(asJmlOT.doc.snapshot, [op]);
				batch.push(op);
			}
			else{
				applyClient([op]);
			}
			
			return [op];
		},
		mergeAt : function(path, val, batch){
			var op = {
				p : path.concat(val[0].length),
				sm : val
			};

			if(batch){
				window.jsonml0.apply(asJmlOT.doc.snapshot, [op]);
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
				window.jsonml0.apply(asJmlOT.doc.snapshot, [op]);
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

	// If there is an error, do nothing...chances are, more changes are coming
	JsonML.onerror = function() {};
	
	function applyClient(op){
		window.jsonml0.apply(asJmlOT.doc.snapshot, op);
		asJmlOT.client.applyClient(op);
	}
	
	asJmlOT.open = function(id, ctrl, scope, success, failure) {
		if(id != asJmlOT.id){
			asJmlOT.ctrl = ctrl;
			asJmlOT.scope = scope;
			asJmlOT.doc = null;
			asJmlOT.id = id;
		}
		
		asWebSocket.register('OT', 'post', function(json){
			if(json.code == 200){
				// Open document
				
				if(json.message.create){
					asJmlOT.client = new ot.Client(json.message.v, window.jsonml0);
					asJmlOT.doc = new Doc([]);
					asJmlOT.ctrl.setup();
					
					asJmlOT.reverts = json.message.reverts;
				}
				else if(json.message.create === undefined){
					if(asJmlOT.reverts !== json.message.reverts){
						clearTimeout(asJmlOT.timeout);
						
						// While disconnected, somebody did a revert. Need to get the newest version.
						asJmlOT.ctrl.message = 'Your document is out of date, please';
						asJmlOT.ctrl.errorAction = 'reload';
					
						asJmlOT.scope.$apply();
						
						return;
					}
					else if(json.message.last === asJmlOT.client.revision){
						if(json.message.ops.length === 1){
							if(!asJmlOT.client.state.buffer){
								asJmlOT.ctrl.saved(true);
							}
							asJmlOT.client.serverAck();
						}
						else{
							asJmlOT.ctrl.message = 'Your document is out of date, please';
							asJmlOT.ctrl.errorAction = 'reload';
							clearTimeout(asJmlOT.timeout);
							
							asJmlOT.scope.$apply();
							
							return;
						}
					}
					else{
						for(var x = 0; x < json.message.ops.length; x++){
							var op = json.message.ops[x];
							console.log('current: ' + asJmlOT.client.revision + " - recieved: " + op.v);
							
							if(asJmlOT.client.revision == op.v){
								asJmlOT.client.applyServer(op.op);
							}
							else{
								console.log('OT - Wrong version');
							}
						}
						
						asJmlOT.client.serverReconnect();
					}
				}
				else if(json.message.create === false){
					if(json.message.revert){
						// Changing the requestId so that last revision by user doesn't force a reload
						asJmlOT.requestId = uuid.v4();
					}
					asJmlOT.client = new ot.Client(json.message.v, window.jsonml0);
					asJmlOT.doc = new Doc(json.message.snapshot);
					asJmlOT.ctrl.setup();
					
					asJmlOT.reverts = json.message.reverts;
				}
				
				asJmlOT.client.sendOperation = function(revision, operation){
					asJmlOT.ctrl.saved(false);
					console.log(revision + ' - ' + JSON.stringify(operation));
					
					if(asJmlOT.timeout){
						clearTimeout(asJmlOT.timeout);
					}

					var op = new AsWsResource();
					
					op.resource = 'OT';
					op.action = 'patch';
					op.key = {'document_id': asJmlOT.id};
					op.attributes = {request_id: asJmlOT.requestId};
					op.message = {v: revision, op: operation};
					
					asWebSocket.send(op);
					
					asJmlOT.timeout = setTimeout(function(){
						asJmlOT.client.serverReconnect();
					}, 10000);
				};
				
				asJmlOT.client.applyOperation = function(operation){
					console.log(JSON.stringify(operation));

					//window.jsonml0.apply(asJmlOT.doc.snapshot, operation);
					window.jsonml0.incrementalApply(asJmlOT.doc.snapshot, operation, function(smallOp){
						asJmlOT.ctrl.change(smallOp);
					});
					
					asJmlOT.ctrl.cleanup();
				};
				
				asJmlOT.ctrl.errorAction = null;
				
				if(success){
					success();
				}
			}
			else if(json.code == 500){
				asJmlOT.ctrl.errorAction = 'revert';
				asJmlOT.scope.$apply();
				
				if(failure){
					failure();
				}
			}
			else if(json.code == 401){
				asJmlOT.ctrl.message = 'Unauthorized. Go back to projects or try to';
				asJmlOT.ctrl.errorAction = 'reload';
				asJmlOT.scope.$apply();
				
				if(failure){
					failure();
				}
			}
		});
		
		asWebSocket.register('OT', 'patch', function(json){
			//TODO: Call open if anything other than 200 is returned
			if(json.code == 200){
				if(asState.syncEditEnabled){
					if(asJmlOT.client && asJmlOT.client.revision <= json.message.v){
						// Apply operation
						if(json.attributes && json.attributes.request_id == asJmlOT.requestId){
							for(var x = 0; x < json.message.ops.length; x++){
								var op = json.message.ops[x];
		
								console.log('current: ' + asJmlOT.client.revision + " - recieved: " + op.v);
								
								if(asJmlOT.client.revision == op.v){
									asJmlOT.client.applyServer(op.op);
								}
								else{
									console.log('OT - Wrong version');
								}
							}
							
							asJmlOT.ctrl.saved(true);

							clearTimeout(asJmlOT.timeout);
							
							asJmlOT.client.serverAck();
						}
						else{
							console.log('current: ' + asJmlOT.client.revision + " - recieved: " + json.message.v);
							
							if(asJmlOT.client.revision == json.message.v){
								asJmlOT.client.applyServer(json.message.op);
							}
							else{
								console.log('OT - Wrong version');
		
								var doc = new AsWsResource();
								
								doc.resource = 'OT';
								doc.action = 'post';
								doc.key = {'document_id': id};
								doc.message = {open: true, create: false, v: asJmlOT.client.revision};
								doc.attributes = {request_id: asJmlOT.requestId};
								
								asWebSocket.send(doc);
							}
						}
						asJmlOT.ctrl.patched();
					}
				}
				else{
					asState.remoteChanges = true;
				}
			}
			else if(json.code == 500){
				asJmlOT.ctrl.message = 'There was an error attempting to save one of your most recent changes, please';
				asJmlOT.ctrl.errorAction = 'reload';
				asJmlOT.scope.$apply();
			}
			else if(json.code == 409){
				if(asJmlOT.client.revision == json.message.v){
					if(json.message.op){
						asJmlOT.ctrl.saved(true);
						clearTimeout(asJmlOT.timeout);
						asJmlOT.client.serverAck();
					}
					else{
						asJmlOT.ctrl.message = 'Your document is out of date, please';
						asJmlOT.ctrl.errorAction = 'reload';
						clearTimeout(asJmlOT.timeout);
					}
					
					asJmlOT.scope.$apply();
				}
			}
			else if(json.code == 401){
				asJmlOT.ctrl.message = 'Unauthorized. Go back to projects or try to';
				asJmlOT.ctrl.errorAction = 'reload';
				asJmlOT.scope.$apply();
			}
		});
		
		asWebSocket.register('Document', 'subscribe', function(json){
			if(json.code == 200){
				var doc = new AsWsResource();
				
				doc.resource = 'OT';
				doc.action = 'post';
				doc.key = {'document_id': asJmlOT.id};
				doc.message = {open: true, create: true};
				doc.attributes = {request_id: asJmlOT.requestId};
				
				if(asJmlOT.doc && asJmlOT.doc.snapshot && asJmlOT.client){
					doc.message.create = false;
					doc.message.v = asJmlOT.client.revision;
				}
				
				asWebSocket.send(doc);
			}
		});
	};
	
	asJmlOT.revert = function(){
		var doc = new AsWsResource();
		
		doc.resource = 'OT';
		doc.action = 'post';
		doc.key = {'document_id': asJmlOT.id};
		doc.message = {open: true, create: true, revert: true};
		doc.attributes = {request_id: asJmlOT.requestId};
		
		asWebSocket.send(doc);
	};

} ]);