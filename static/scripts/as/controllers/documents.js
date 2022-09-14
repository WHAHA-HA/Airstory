app.controller('DocumentsCtrl', ['$scope', 'asWebSocket', 'asURL', 'asUniqueId', 'asJmlOT', function($scope, asWebSocket, asURL, asUniqueId, asJmlOT){
	var documentsCtrl = this;
	
	documentsCtrl.documents = [];
	documentsCtrl.deletedocument = {};
	
	documentsCtrl.requestId = asUniqueId;
	
	var urlSegments = asURL.segment();
	
	var projectId = urlSegments[1];
	documentsCtrl.documentId = null;
	documentsCtrl.documentType = null;
	documentsCtrl.document = null;
	
	documentsCtrl.showDocumentMenu = false;
	documentsCtrl.hideHeader = false;
	
	documentsCtrl.selectImage = false;
	documentsCtrl.imgUrl = '';
	
	asWebSocket.register('ProjectDocuments', 'get', function(json){
		if(json.code == '200'){
			var documents = json.message.documents;
			
			documents.sort(function(a, b){
		        a = parseInt(a.created);
		        b = parseInt(b.created);
		        
		        return a - b;
		    });
			
			if(asWebSocket.reconnecting){
				// Backup current document list with settings
				var backup = {};
				for(var x = 0; x < documentsCtrl.documents.length; x++){
					backup[documentsCtrl.documents[x].id] = documentsCtrl.documents[x];
				}
				
				// Apply all settings to new list
				for(var y = 0; y < documents.length; y++){
					if(documents[y].id in backup){
						documents[y].action = backup[documents[y].id].action;
						documents[y].clazz = backup[documents[y].id].clazz;
						documents[y].hide = backup[documents[y].id].hide;
						
						if(documents[y].clazz == 'active'){
							documentsCtrl.getDocument(documents[y], true);
						}
					}
					else{
						documents[y].action = 'view';
					}
				}
			}
			else{
				for(var z = 0; z < documents.length; z++){
					documents[z].action = 'view';
					
					if(z >= 3){
						documents[z].hide = true;
					}
					
					if(z === 0){
						documentsCtrl.getDocument(documents[0], true);
					}
				}
			}
			
			documentsCtrl.documents = documents;
			$scope.$apply();
		}
	});
	
	
	asWebSocket.init(function(){
		var doc = new AsWsResource();

		doc.resource = 'ProjectDocuments';
		doc.action = 'get';
		doc.key = {
			'id': projectId
		};

		asWebSocket.send(doc);
	});
	
	asWebSocket.register('Document', 'put', function(json){
		if(json.code == '200'){
			var document = json.message;
			documentsCtrl.document = document;
			
			for(var x = 0; x < documentsCtrl.documents.length; x++){
				if(json.key.id == documentsCtrl.documents[x].id){
					// Save what is currently on the object
					document.action = documentsCtrl.documents[x].action;
					document.clazz = documentsCtrl.documents[x].clazz;
					
					documentsCtrl.documents[x] = document;
					
					break;
				}
			}
			
			$scope.$apply();
		}
	});
	
	asWebSocket.register('Document', 'delete', function(json){
		if(json.code == '200'){
			for(var x = 0; x < documentsCtrl.documents.length; x++){
				if(json.key.id == documentsCtrl.documents[x].id){
					documentsCtrl.documents.splice(x, 1);	
					break;
				}
			}
			
			var hasActive = false;
			for(var b = 0; b < documentsCtrl.documents.length; b++){
				if(documentsCtrl.documents[b].clazz == 'active'){
					hasActive = true;
					break;
				}
			}
			
			if(!hasActive && documentsCtrl.documents && documentsCtrl.documents.length > 0){
				$scope.$broadcast('document:delete', document);
				documentsCtrl.getDocument(documentsCtrl.documents[0], true);
			}
			else if(documentsCtrl.documents.length === 0){
				$scope.$broadcast('document:delete', document);
				$scope.$broadcast('document:unload');
				documentsCtrl.documentType = null;
			}
			
			for(var a = 0; a < documentsCtrl.documents.length; a++){
				if(!documentsCtrl.documents[a].hide && a+2 < documentsCtrl.documents.length){
					for(var y = a; y <= a + 2; y++){
						documentsCtrl.documents[y].hide = false;
					}
					a += 3;
				}
				else if(!documentsCtrl.documents[a].hide){
					var start = documentsCtrl.documents.length-3;
					
					if(start < 0){
						start = 0;
					}
					
					for(var z = start; z < documentsCtrl.documents.length; z++){
						documentsCtrl.documents[z].hide = false;
					}
					break;
				}
				else{
					documentsCtrl.documents[a].hide = true;
				}
			}
			
			$scope.$apply();
		}
	});
	
	asWebSocket.register('Document', 'post', function(json){
		if(json.code == '200'){
			var document = json.message;
			document.action = 'view';

			var documentSet = false;
			for(var x = documentsCtrl.documents.length-1; x >= 0 ; x--){
				if(documentsCtrl.documents[x].title == json.message.title && !documentsCtrl.documents[x].id){
					documentsCtrl.documents.splice(x, 1, document);
					documentSet = true;
					
					break;
				}
			}
			
			if(!documentSet){
				documentsCtrl.documents.push(document);
			}
			
			if(documentsCtrl.documents.length == 1){
				documentsCtrl.documents[0].clazz = 'active';
				
				documentsCtrl.getDocument(document, documentsCtrl.requestId === json.attributes.request_id);
			}
						
			var changed = false;
			for(var a = 0; a < documentsCtrl.documents.length; a++){
				if(!documentsCtrl.documents[a].hide && a+2 < documentsCtrl.documents.length){
					for(var y = a; y <= a + 2; y++){
						documentsCtrl.documents[y].hide = false;
					}
					a += 3;
				}
				else if(!changed && !documentsCtrl.documents[a].hide){
					var start = documentsCtrl.documents.length-3;
					
					if(start < 0){
						start = 0;
					}
					
					for(var z = start; z < documentsCtrl.documents.length; z++){
						documentsCtrl.documents[z].hide = false;
					}
					break;
				}
				else{
					documentsCtrl.documents[a].hide = true;
					changed = true;
				}
			}
			
			$scope.$apply();
		}
	});
	
	var isProcessing = false;
	
	documentsCtrl.getDocument = function(document, isMe){
		if(!isProcessing && (documentsCtrl.documentId !== document.id || asWebSocket.reconnecting)){
			isProcessing = true;
			
			if(documentsCtrl.documents){
				for(var x = 0; x < documentsCtrl.documents.length; x++){
					documentsCtrl.documents[x].clazz = '';
				}
			}
			
			if(document.id !== documentsCtrl.documentId){
				documentsCtrl.documentType = null;
			}
	
			if(!asWebSocket.reconnecting){
				$scope.$broadcast('document:unload');
			}
	
			if(!documentsCtrl.documentType){
				documentsCtrl.documentType = document.type;
			}
			documentsCtrl.document = document;
			
			setTimeout(function(){
				$scope.$broadcast('document:load', document, isMe);
				isProcessing = false;
			});
		}
	};
	
	documentsCtrl.changeType = function(){
		var document = null;
		var documentId = documentsCtrl.documentId;
		
		$scope.$broadcast('document:unloaded', '#document');
		
		if(documentsCtrl.documentType == 'o'){
			documentsCtrl.documentType = 'e';
		}
		else{
			documentsCtrl.documentType = 'o';
		}
		
		for(var x = 0; x < documentsCtrl.documents.length; x++){
			if(documentsCtrl.documents[x].id === documentId){
				document = documentsCtrl.documents[x];
				break;
			}
		}
		
		document.type = documentsCtrl.documentType;
		
		if($scope.siteCtrl.validatePermission($scope.projectCtrl.projectId, 4)){
			var doc = new AsWsResource();
			
			doc.resource = 'Document';
			doc.action = 'put';
			doc.key = {'project_id': document.project_id, 'id': document.id};
			doc.message = document.title;
			doc.attributes = {type: documentsCtrl.documentType};
			
			asWebSocket.send(doc);
		}
		
		setTimeout(function(){
			$scope.$broadcast('document:load', document, true);
		});
	};
	
	documentsCtrl.scrollRight = function(){
		var start = 0;
		var changed = false;
		
		for(var x = 0; x < documentsCtrl.documents.length; x++){
			if(!documentsCtrl.documents[x].hide && x + 3 < documentsCtrl.documents.length){
				documentsCtrl.documents[x].hide = true;
				start = x + 3;
				changed = true;
				
				break;
			}
		}
		
		if(changed){
			for(var y = start; y < documentsCtrl.documents.length; y++){
				if(documentsCtrl.documents[y].hide){
					documentsCtrl.documents[y].hide = false;
					break;
				}
			}
		}
	};
	
	documentsCtrl.scrollLeft = function(){
		var start = 0;
		var changed = false;
		
		for(var x = documentsCtrl.documents.length-1; x >= 0; x--){
			if(!documentsCtrl.documents[x].hide && x - 3 >= 0){
				documentsCtrl.documents[x].hide = true;
				start = x - 3;
				changed = true;
				
				break;
			}
		}
		
		if(changed){
			for(var y = start; y >= 0; y--){
				if(documentsCtrl.documents[y].hide){
					documentsCtrl.documents[y].hide = false;
					break;
				}
			}
		}
	};
	
	documentsCtrl.exportToGoogle = function(){
		var uri = '/google/' + documentsCtrl.document.id + '/title/' + documentsCtrl.document.title;
		
		window.open(uri, '_blank');
	};
} ]);