
function AsWsResource(){
	this.resource = null;
	this.action = null;
	this.attributes = null;
	this.key = null;
	this.message = null;
	
	this.toJson = function(){
		return JSON.stringify(this.toJsonStruct());
	};
	
	this.toJsonStruct = function(){
		return {
			"resource": this.resource,
			"action": this.action,
			"attributes": this.attributes,
			"key": this.key,
			"message": this.message
		};
	};
}

function AsWebSocket(url){
	var isOpen = false;
	var sock = null;
	var webSocket = this;
	var reopen = true;
	var instantReconnect = true;
	var queue = [];
	var projectSub = null;
	var documentSub = null;
	var handlers = {};
	var startup = [];
	var isWebSocket = true;
	this.reconnecting = false;
	
	$(document).ready(function(){
		connect();	
	});
	
	this.register = function(resource, action, fn){
		if(!(resource in handlers)){
			handlers[resource] = {};
		}
		handlers[resource][action] = fn;
	};
	
	this.init = function(fn){
		startup.push(fn);
		
		if(isOpen){
			fn();
		}
	};
	
	this.batchSend = function(data){
		var payload = [];
		
		for(var x = 0; x < data.payload.length; x++){
			payload.push(data.payload[x].toJsonStruct());
		}
		
		var batchMessage = JSON.stringify({resource: data.resource, action: data.action, payload: payload});

		this.rawSend(batchMessage);
	};
	
	this.send = function(data){
		var message = data.toJson();

		this.rawSend(message, data.resource === 'OT');
	};
	
	this.rawSend = function(message, isOT){
		console.log('sending:');
		console.log(message);
		
		if(sock !== null && isOpen){
			sock.send(message);
		}
		else{
			if(!isOT){
				queue.push(message);
			}
		}
	};
	
	this.close = function(){
		reopen = false;
		sock.close();
		queue = [];
		projectSub = null;
		documentSub = null;
	};
	
	function connect(){
		console.log('connecting...');
		
		// Try websocket, if that fails, fall back to others. This is so I can point fall backs to a port with sticky sessions
		if(isWebSocket){
			sock = new SockJS(url, null, {'transports': ['websocket']});
		}
		else{
			var uri = new URI(self.location);
			if(uri.protocol() == 'https'){
				uri.port(8443).pathname(url).hash(null);
			}
			else{
				uri.port(81).pathname(url).hash(null);
			}
			
			sock = new SockJS(uri.toString(), null, {'transports': ['xdr-streaming', 'xhr-streaming', 'iframe-eventsource', 'xdr-polling', 'xhr-polling']});
		}
		
		sock.onopen = function() {
			isOpen = true;
			reopen = true;
			
			for(var x = 0; x < startup.length; x++){
				startup[x]();
			}
			
			while(queue.length > 0){
				var message = queue.shift();
				sock.send(message);
			}
			
			instantReconnect = true;
		};
		
		sock.onmessage = function(e) {
			console.log('receiving:');
			console.log(e.data);
			json = JSON.parse(e.data);
			
			var resource = json.resource;
			var action = json.action;
			
			if(resource in handlers && action in handlers[resource]){
				handlers[json.resource][json.action](json);
			}
			else{
				console.log('no handler found for ' + resource + ' : ' + action);
			}
		};
		
		sock.onclose = function() {
			console.log('closing');
			// Was never opened, initial call failed
			if(!isOpen && !webSocket.reconnecting){
				isWebSocket = false;
			}
			
			if(reopen){
				if(isOpen){
					webSocket.reconnecting = true;
				}

				isOpen = false;
				
				if(instantReconnect){
					//Attempt to reconnect right away. If fails, should wait 5 seconds
					instantReconnect = false;
					connect();
				}
				else{
					setTimeout(connect, 5000);
				}
			}
			else{
				isOpen = false;
			}
		};
	}
}

app.service('asWebSocket', ['webSocketUrl', AsWebSocket]);