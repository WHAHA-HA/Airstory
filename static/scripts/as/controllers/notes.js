app.controller('NotesRouterCtrl', ['$scope', '$cookies', '$sce', 'asWebSocket', 'asURL', 'asUniqueId', 'asState', 'asJmlOT', function($scope, $cookies, $sce, asWebSocket, asURL, asUniqueId, asState, asJmlOT){
	var urlSegments = asURL.segment();

	var notesCtrl = this;
	
	if($scope.projectCtrl){
		notesCtrl.type = 'project';
	}
	else{
		notesCtrl.type = 'user';
	}
	
	notesCtrl.requestId = asUniqueId;

	baseCtrl(notesCtrl, $scope, $cookies, $sce, asWebSocket, asURL, asState, asJmlOT);
}]);

app.controller('LibraryNotesCtrl', ['$scope', '$cookies', '$sce', 'asWebSocket', 'asURL', 'asUniqueId', 'asState', 'asJmlOT', function($scope, $cookies, $sce, asWebSocket, asURL, asUniqueId, asState, asJmlOT){
	var notesCtrl = this;

	notesCtrl.type = 'all';
	notesCtrl.requestId = asUniqueId;
    
	baseCtrl(notesCtrl, $scope, $cookies, $sce, asWebSocket, asURL, asState, asJmlOT);
}]);

app.controller('ArchiveNotesCtrl', ['$scope', '$cookies', '$sce', 'asWebSocket', 'asURL', 'asUniqueId', 'asState', 'asJmlOT', function($scope, $cookies, $sce, asWebSocket, asURL, asUniqueId, asState, asJmlOT){
	var notesCtrl = this;

	notesCtrl.type = 'archive';
	notesCtrl.requestId = asUniqueId;

	baseCtrl(notesCtrl, $scope, $cookies, $sce, asWebSocket, asURL, asState, asJmlOT);
}]);


app.controller('ProjectNotesCtrl', ['$scope', '$cookies', '$sce', 'asWebSocket', 'asURL', 'asUniqueId', 'asState', 'asJmlOT', function($scope, $cookies, $sce, asWebSocket, asURL, asUniqueId, asState, asJmlOT){
	var notesCtrl = this;

	notesCtrl.type = 'project';
	notesCtrl.requestId = asUniqueId;

	baseCtrl(notesCtrl, $scope, $cookies, $sce, asWebSocket, asURL, asState, asJmlOT);
}]);

app.controller('PrivateNotesCtrl', ['$scope', '$cookies', '$sce', 'asWebSocket', 'asURL', 'asUniqueId', 'asState', 'asJmlOT', function($scope, $cookies, $sce, asWebSocket, asURL, asUniqueId, asState, asJmlOT){
	var notesCtrl = this;

	notesCtrl.type = 'user';
	notesCtrl.requestId = asUniqueId;
	
	baseCtrl(notesCtrl, $scope, $cookies, $sce, asWebSocket, asURL, asState, asJmlOT);
}]);

function baseCtrl(notesCtrl, $scope, $cookies, $sce, asWebSocket, asURL, asState, asJmlOT){	
	notesCtrl.userId = $cookies.get('as-id-clr');

	notesCtrl.select = self.location.hash.substring(1);
	
	if(!notesCtrl.select){
		if($scope.projectCtrl){
			notesCtrl.select = '/notes/project';
		}
		else{
			notesCtrl.select = '/notes/user';
		}
	}
	
	$('body').removeClass('image-drawer');
	
	var urlSegments = asURL.segment();
	notesCtrl.projectId = urlSegments[1];
	
	notesCtrl.notes = [];
	notesCtrl.addnote = {};
	notesCtrl.editnote = {};
	notesCtrl.requesting = true;
    
	notesCtrl.refId = notesCtrl.projectId;
	
	//If not in a project, save all notes to private
	if(notesCtrl.type == 'archive'){
		notesCtrl.refId = null;
	}
	else if(notesCtrl.type == 'user' || !notesCtrl.projectId){
		notesCtrl.refId = notesCtrl.userId;
	}

	$('.as-set-to-body').remove();
	
	asWebSocket.register('Notes', 'get', function(json){
		if(json.code == '200'){
			var saveTransitionDuration = 0;
			var saveScrollTop = 0;
			if(asWebSocket.reconnecting){
				//if reconnecting, save scrolling position so there is no impact to the user
				saveScrollTop = $('[data-as-splitter-panel="right"]').scrollTop();
			}
			
			if(json.attributes.display_option == 'append'){
				notesCtrl.notes = notesCtrl.notes.concat(json.message.notes);
			}
			else{
				notesCtrl.notes = json.message.notes;
			}
			
			notesCtrl.nextStart = json.message.next_start;
			
			if(asWebSocket.reconnecting){
				$('[data-as-splitter-panel="right"]').scrollTop(saveScrollTop);
			}
		}
		else{
			notesCtrl.nextStart = null;
			if(json.attributes.display_option != 'append'){
				notesCtrl.notes = [];
			}
		}
		notesCtrl.requesting = false;
		
		$scope.$apply();
	});

	asWebSocket.register('Note', 'get', function(json){
		if(json.code == '200'){
			if(json.attributes.reason == 'edit-note'){
				notesCtrl.editnote = json.message;
				
				$scope.$apply();
				
				if($scope.siteCtrl.validatePermission(notesCtrl.editnote.ref_id, 3, notesCtrl.editnote)){
					$('#edit-note-content').data('wysiwyg').disable();
					$('#edit-note-content').data('wysiwyg').setValue(json.message.content);
					
					$('#edit-note-content').data('wysiwyg').enable();
					
					if(!notesCtrl.editnote.citations || notesCtrl.editnote.citations.length === 0){
						notesCtrl.editnote.citations = [{changed: true}];
						
						$scope.$apply();
					}
				}
			}
		}
	});
	
	asWebSocket.register('Note', 'batch', function(json){
		if(json.payload.length > 0 && json.payload[0].code == '200'){
			var noteResponse = json.payload[0];
			
			var content = null;
			try {
				content = $(noteResponse.message.content);
			} catch (err) {}

			if (content === null || typeof content.html() === 'undefined') {
				content = $('<p></p>').html(noteResponse.message.content);
			}
			
			if(json.payload.length > 1){
				for(var x = 1; x < json.payload.length; x++){
					var citation = json.payload[x];
					
					if($scope.citationsCtrl.citationsLoaded){
						$scope.citationsCtrl.documentcitations.push(citation.message);
					}
					
					content.find().addBack().contents().last().after($('<sup><a data-id="' + citation.key.id + '" data-ref-id="' + citation.key.ref_id + '" class="citation-ref">&Dagger;</a></sup>'));	
				}
				
				content = $('<blockquote></blockquote>').append(content);
			}
			
			content.prepend('<div class="as-editor-card-controls"><a class="merge"><i class="fa fa-check-circle"></i></a> <a class="remove"><i class="fa fa-trash"></i></a></div>');
			
			var note = $('#' + noteResponse.key.id);
			
			if(noteResponse.attributes.destination === 'e'){
				note.find('.as-editor-card-handle').html(content);
				note.attr('ref', noteResponse.key.ref_id + '|' + noteResponse.key.id);
				note.attr('card-title', noteResponse.message.title);
				
				note.removeAttr('id');
			}
			else{
				var path = [];
				asJmlOT.ctrl.findElementByTypeAndID(asJmlOT.doc.snapshot, 'DIV', noteResponse.key.id, path);
				
				var titlePath = clone(path);
				titlePath.push(1);
				titlePath.push('card-title');
				
				var batch = [];
				
				var titleOp = asJmlOT.doc.setAt(titlePath, noteResponse.message.title, batch);
				titleOp = asJmlOT.ctrl.adjust(titleOp);
				
				window.jsonml0.apply(asJmlOT.ctrl.outline, titleOp);	
				
				var idPath = clone(path);
				idPath.push(1);
				idPath.push('id');
				
				var idOp = asJmlOT.doc.removeAt(idPath, batch);
				idOp = asJmlOT.ctrl.adjust(idOp);
				
				window.jsonml0.apply(asJmlOT.ctrl.outline, idOp);	

				path.push(2);
				path.push(2);
				
				var html = $('<div>').append(content.clone()).html();
				
				var op = asJmlOT.doc.setAt(path, JsonML.fromHTMLText(html), batch);
				op = asJmlOT.ctrl.adjust(op);
				
				window.jsonml0.apply(asJmlOT.ctrl.outline, op);	
				
				asJmlOT.client.applyClient(batch);
				
				$scope.$apply();
			}
			//note.removeAttr('id');
			
			asState.syncEditEnabled = true;
				
			$('#document').trigger('change');
		}
	});

	asWebSocket.register('Note', 'post', function(json){
		if(json.code == '200'){
			//Check if the user is in the current tab (private, project or library). If so, update
			if(json.key.ref_id == notesCtrl.refId || (!json.key.ref_id.startsWith('a_') && notesCtrl.type == 'all') || (json.key.ref_id.startsWith('a_') && notesCtrl.type == 'archive')){
				if(notesCtrl.notes && notesCtrl.notes.length > 0){
					notesCtrl.notes.unshift(json.message);
				}
				else{
					notesCtrl.notes = [json.message];
				}
			}
			
			$scope.$apply();
		}
	});

	asWebSocket.register('Note', 'put', function(json){
		if(json.code == '200'){
			if(json.key.ref_id == notesCtrl.refId || (!json.key.ref_id.startsWith('a_') && notesCtrl.type == 'all') || (json.key.ref_id.startsWith('a_') && notesCtrl.type == 'archive')){
				var note = json.message;
	
				for(var x = 0; x < notesCtrl.notes.length; x++){
					if(notesCtrl.notes[x].id == note.id){
						notesCtrl.notes[x].title = note.title;
						notesCtrl.notes[x].display_content = note.display_content;
						notesCtrl.notes[x].tags = note.tags;
						notesCtrl.notes[x].citations = note.citations;
						notesCtrl.notes[x].state = note.state;
						
						break;
					}
				}
			}
			
			$scope.$apply();
		}
	});

	asWebSocket.register('Note', 'delete', function(json){
		if(json.code == '200'){
			if(json.key.ref_id == notesCtrl.refId || (!json.key.ref_id.startsWith('a_') && notesCtrl.type == 'all') || (json.key.ref_id.startsWith('a_') && notesCtrl.type == 'archive')){
				for(var x = 0; x < notesCtrl.notes.length; x++){
					if(notesCtrl.notes[x].id == json.key.id){
						notesCtrl.notes.splice(x, 1);

						$scope.$apply();
						
						break;
					}
				}
			}
		}
	});
	
	function init(){
		notesCtrl.requesting = true;
		
		var notes = new AsWsResource();

		notes.resource = 'Notes';
		notes.action = 'get';
		notes.attributes = {'type': notesCtrl.type};
		
		if(notesCtrl.type != 'all' && notesCtrl.type != 'archive'){
			notes.key = {"ref_id": notesCtrl.refId};
		}

		asWebSocket.send(notes);
	}
		
	init();
	
	function lookupNote(refId, id){
		for(var x = 0; x < notesCtrl.notes.length; x++){
			if(notesCtrl.notes[x].ref_id === refId && notesCtrl.notes[x].id === id){
				return notesCtrl.notes[x];
			}
		}
		
		return null;
	}
	
	$scope.$on('editor:drop', function(e, n){
		if(n.id.indexOf('n') === 0){
			var note = new AsWsResource();
			
			note.resource = 'Note';
			note.action = 'get';
			note.attributes = {'reason': 'editor-drop', 'destination': n.destination};
			note.key = {'ref_id': n.ref_id, 'id': n.id};

			var batch = {resource: 'Note', action: 'batch', payload: [note]};
			
			var noteInfo = lookupNote(n.ref_id, n.id);

			if(noteInfo && noteInfo.citations && noteInfo.citations.length > 0){
				var refId = notesCtrl.projectId + '|' + $scope.documentsCtrl.documentId;
				
				for(var x = 0; x < noteInfo.citations.length; x++){
					var citation = new AsWsResource();
					
					citation.resource = 'Citation';
					citation.action = 'post';
					citation.attributes = {'reason': 'editor-drop', 'request_id': notesCtrl.requestId};
					citation.key = {'ref_id': refId};
					citation.message = noteInfo.citations[x];
					
					batch.payload.push(citation);
				}
			}
			
			asWebSocket.batchSend(batch);
			
			if(n.destination === e){
				asState.syncEditEnabled = false;
			}
		}
	});
	
	notesCtrl.invalidContent = function(content){
		return $(content).data('wysiwyg').getValue() === '';
	};
	
	notesCtrl.editCitation = function(citation){
		citation.changed = !citation.changed;
	};
	
	notesCtrl.removeCitation = function(citations, citation){
		var pos = citations.indexOf(citation);
		
		if(pos !== -1){
			citations.splice(pos, 1);
		}
	};
	
	notesCtrl.trust = function(html){
		return $sce.trustAsHtml(html);
	};
	
	notesCtrl.displayLockedStatus = function(state){
		if(state === 'locked'){
			return $sce.trustAsHtml('Locked <span class="fa fa-lock"></span>');
		}
		else{
			return $sce.trustAsHtml('Unlocked  <span class="fa fa-unlock"></span>');
		}
	};
	
	notesCtrl.structureCitation = function(citation){
		var display = '';
		
		if(citation.article_title){
			if(display !== ''){
				display += ', ';
			}
			
			display += citation.article_title;
		}
		
		if(citation.page_title){
			if(display !== ''){
				display += ', ';
			}
			
			display += citation.page_title;
		}
		
		if(citation.url){
			if(display !== ''){
				display += ', ';
			}
			
			display += citation.url;
		}
		
		if(citation.author){
			if(display !== ''){
				display += ', ';
			}
			
			display += citation.author;
		}
		
		if(citation.publication_date){
			if(display !== ''){
				display += ', ';
			}
			
			display += citation.publication_date;
		}
		
		return display;
	};
}