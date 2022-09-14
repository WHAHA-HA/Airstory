app.controller('CitationsListCtrl', ['$scope', function($scope){
	$('.as-set-to-body').remove();
}]);

app.controller('CitationsCtrl', ['$scope', 'asWebSocket', 'asRefreshCitations', 'asUniqueId', 'asState', function($scope, asWebSocket, asRefreshCitations, asUniqueId, asState){
	var citationsCtrl = this;

	$('body').removeClass('image-drawer');
	
	citationsCtrl.documentcitations = [];
	
	citationsCtrl.requestId = asUniqueId;

	citationsCtrl.citationsLoaded = false;
	var documentLoaded = false;
	var loaded = false;

	function checkDocumentDisplayCitations(){
		if(citationsCtrl.citationsLoaded){
			asRefreshCitations.init($scope, citationsCtrl);
			
			asRefreshCitations.process();
		
			if(documentLoaded && !loaded){
				loaded = true;
				for(var x = 0; x < citationsCtrl.documentcitations.length; x++){
					var citation = citationsCtrl.documentcitations[x];
					
					var ref = $('[data-id="' + citation.id + '"]');
					
					if(!ref || !ref.length || !ref.hasClass('citation-ref')){
						var deletecitation = new AsWsResource();
		
						deletecitation.resource = 'Citation';
						deletecitation.action = 'delete';
						deletecitation.key = {"ref_id": citation.ref_id, "id": citation.id};
		
						asWebSocket.send(deletecitation);
						
						citationsCtrl.documentcitations.splice(x, 1);
					}
				}
				
				$scope.$apply();
			}
		}
	}
	
	asWebSocket.register('Citations', 'get', function(json){
		if(json.code == '200' && json.attributes.reason == 'documentcitations'){
			citationsCtrl.documentcitations = json.message.citations;
			
			citationsCtrl.citationsLoaded = true;
			checkDocumentDisplayCitations();
		}
		else if(json.code == '404' && json.attributes.reason == 'documentcitations'){
			citationsCtrl.documentcitations = [];
			
			citationsCtrl.citationsLoaded = true;
			checkDocumentDisplayCitations();
		}
		
		$scope.$apply();
	});
	
	asWebSocket.register('Citation', 'post', function(json){
		if(json.code == '200'){
			if(json.attributes.reason == 'editor-drop'){
				
				if(citationsCtrl.citationsLoaded && json.attributes.request_id !== citationsCtrl.requestId){
					citationsCtrl.documentcitations.push(json.message);
				}
			}
		}
	});
	
	asWebSocket.register('Citation', 'put', function(json){
		if(json.code == '200'){
			
		}
	});
	
	asWebSocket.register('Citation', 'delete', function(json){
		if(json.code == '200'){

		}
	});
	
	$scope.$on('editor:change-triggered', function(){
		asRefreshCitations.process();
		$scope.$apply();
	});
	
	$scope.$on('document:unloaded', function(event, editorId){
		if(editorId == '#document'){
			citationsCtrl.documentcitations = [];
			loaded = false;
			documentLoaded = false;
			citationsCtrl.citationsLoaded = false;
		}
	});
	
	$scope.$on('document:loaded', function(event, editorId){
		if(editorId == '#document'){
			documentLoaded = true;
			checkDocumentDisplayCitations();
		}
	});
	
	$scope.$on('document:populated', function(){
		citationsCtrl.citationsLoaded = false;
		
    	var citations = new AsWsResource();
		
    	citations.resource = 'Citations';
    	citations.action = 'get';
    	citations.key = {'ref_id': $scope.projectCtrl.projectId + '|' + $scope.documentsCtrl.documentId};
    	citations.attributes = {'reason': 'documentcitations'};
		
		asWebSocket.send(citations);
	});
	
	citationsCtrl.visible = function(){
		var check = false;
			
		for(var x = 0; x < citationsCtrl.documentcitations.length; x++){
			if(citationsCtrl.documentcitations[x].clazz !== 'hide'){
				check = true;
				break;
			}
		}
		
		if(!check && self.location.hash === '#/citations'){
			$scope.$broadcast('splitter:request', '#notes-handle');
			self.location.hash = '/notes/project';
		}
		
		return check;
	};
}]);