app.controller('CommentsCtrl', ['$scope', '$templateCache', '$compile', 'asWebSocket', 'asRefreshComments', 'asUniqueId', 'asState', function($scope, $templateCache, $compile, asWebSocket, asRefreshComments, asUniqueId, asState){
	//rangy.init();
	
	var commentsCtrl = this;
	
	commentsCtrl.comments = [];
	commentsCtrl.commentMap = {};
	commentsCtrl.selected = null;
	commentsCtrl.isNarrow = false;

	commentsCtrl.requestId = asUniqueId;
	
	var commentsLoaded = false;
	var documentLoaded = false;
	var loaded = false;
	
	function displayPopup(icon, callback){
		$('#popup').fadeOut();
		
    	var notification = icon.parent();
    	var key = notification.attr('id').replace('not-', '');
    	
    	$scope.parent = commentsCtrl.commentMap[key];
    	var template = angular.copy($templateCache.get('notification.html'));
    	var element = angular.element(template);
    	
    	var content = $compile(element)($scope);
    	
		setTimeout(function(){
	    	$scope.$apply(function(){
	    		var popup = $('#popup');
	    		
	    		popup.html(element);
	    		
	    		popup.css('top', notification.position().top);
	    		popup.css('left', $('#notifications').position().left - 215);
	    		
	    		if(callback){
	    			callback();
	    		}

	    		popup.fadeIn();
	    		
	    		popup.find('textarea').focus();
	    	});

	    	if(commentsCtrl.isNarrow){
		    	if($scope.parent.reply === -1){
		    		$('#nd-' + key + ' .body form').css('visibility', 'visible');
		    	}
		    	else if($scope.parent.reply === 1){
		    		$('#nd-' + key + ' .reply').css('visibility', 'visible');
		    	}

	    		for(var x = 0; x < $scope.parent.items.length; x++){
	    			var comment = $scope.parent.items[x];
	    			
	    			if(!comment.edit && comment.expand){
			    		$('#nd-' + key + ' .expanded').css('visibility', 'visible');
	    			}
	    		}
	    	}
		}, 300);
	}
	
	$('body').on('click', '.is-narrow .notification .icon', function(){
		var icon = $(this);
		
		displayPopup(icon);
	});
	
	$('#popup').mouseup(function(e){
		e.stopPropagation();
	});
	
	$('body').mouseup(function(){
		$('#popup').fadeOut();
	});
	
	function setNarrow(left){
		if(left < 900){
			commentsCtrl.isNarrow = true;
		}
		else{
			commentsCtrl.isNarrow = false;
		}
		
		$scope.$apply();
		
		$('#popup').fadeOut();
	}
	
	$scope.$on('splitter:resized', function(event, left, right){
		setNarrow(left);
	});
	
	$scope.$on('document:loaded', function(event, id){
		if(id === '#document'){
			setNarrow($('#project').width());
		}
	});
	
	function checkDocumentDisplayComments(){
		if(commentsLoaded && documentLoaded && !loaded){
			loaded = true;
			
			for(var key in commentsCtrl.commentMap){
				var dataLink = $('[data-link="' + key + '"]');
				if(!dataLink.length){
					//Doesn't exist in document so delete
					for(var x = 0; x < commentsCtrl.commentMap[key].items.length; x++){
						commentsCtrl.del(commentsCtrl.commentMap[key].items[x]);
					}
				}
			}
			asRefreshComments.init($scope, commentsCtrl);
			asRefreshComments.process();
			$scope.$apply();
			
			asRefreshComments.position();
		}
	}
	
	asWebSocket.register('Comments', 'get', function(json){
		commentsCtrl.comments = [];
		commentsCtrl.commentMap = {};
		
		if(json.code == '200'){
			//commentsCtrl.comments = json.message.comments;
			
			for(var x = 0; x < json.message.comments.length; x++){
				var c = json.message.comments[x];
				
				if(!commentsCtrl.commentMap[c.link]){
					commentsCtrl.commentMap[c.link] = {'link': c.link, 'items': [], 'found': false};
				}
				commentsCtrl.commentMap[c.link].items.push(c);
			}
			
			for(var key in commentsCtrl.commentMap){
				commentsCtrl.comments.push(commentsCtrl.commentMap[key]);
			}
			
			commentsLoaded = true;
			checkDocumentDisplayComments();
		}
		else if(json.code == 404){
			commentsLoaded = true;
			checkDocumentDisplayComments();
		}
		$scope.$apply();
	});
	
	$scope.$on('document:unloaded', function(event, editorId){
		if(editorId == '#document'){
			commentsCtrl.comments = [];
			commentsCtrl.commentMap = {};
			commentsCtrl.commentPositions = {};
			loaded = false;
			documentLoaded = false;
		}
	});
	
	$scope.$on('document:loaded', function(event, editorId){
		if(editorId == '#document'){
			documentLoaded = true;
			checkDocumentDisplayComments();
		}
	});
	
	$scope.$on('document:populated', function(){
		commentsLoaded = false;
		
    	var comments = new AsWsResource();
		
		comments.resource = 'Comments';
		comments.action = 'get';
		comments.key = {'ref_id': $scope.projectCtrl.projectId + '|' + $scope.documentsCtrl.documentId};
		
		asWebSocket.send(comments);
	});
	
	asWebSocket.register('Comment', 'post', function(json){
		if(json.code == '200'){
			if(json.attributes.request_id === commentsCtrl.requestId){
				//Have to use the 'em' tag for comments or else execCommand clears out the attributes
		    	var applier = rangy.createClassApplier(json.message.user_id, {
					useExistingElements: false,
					elementTagName: 'em',
					elementAttributes: {'data-link': json.message.link, 'data-type': 'comment'}
				});
		    	
		    	if(commentsCtrl.savedSel){
			    	rangy.restoreSelection(commentsCtrl.savedSel);
					applier.applyToSelection();
		    	}
				
				$('.comment-range-marker').contents().unwrap();
			}
			
			var c = json.message;
			
			if(!commentsCtrl.comments){
				commentsCtrl.comments = [];
			}
			
			if(!commentsCtrl.commentMap){
				commentsCtrl.commentMap = {};
			}
			
			if(!commentsCtrl.commentMap[c.link]){
				commentsCtrl.commentMap[c.link] = {'link': c.link, 'items': [], 'found': false};
				commentsCtrl.comments.push(commentsCtrl.commentMap[c.link]);
			}
			
			commentsCtrl.commentMap[c.link].items.push(c);

			if(json.attributes.request_id === commentsCtrl.requestId){
				if(json.attributes.reason === 'create-thread'){
					var comments = commentsCtrl.commentMap[c.link].items;
					
					for(var x = 0; x < comments.length; x++){
						if(comments[x].id === json.key.id){
							comments[x].edit = true;
							break;
						}
					}
					commentsCtrl.commentMap[c.link].reply = -1;
					c.content = '';
					
					commentsCtrl.commentMap[c.link].status = 'create';
				}
			}
			
			asRefreshComments.process();
			
			$scope.$apply();
			
			if(json.attributes.request_id === commentsCtrl.requestId){
				$('#nd-' + c.link + ' .body form').css('visibility', 'visible');
				commentsCtrl.selected = $('[data-link="' + c.link + '"]');
				
				asState.syncEditEnabled = true;
				//TODO: fix this hack (should not reference #document here
				$scope.$broadcast('editor:changed', 'document');
				
				$('#nd-' + c.link + ' .body textarea').focus();
			}

			asRefreshComments.position();
			
			if(json.attributes.request_id === commentsCtrl.requestId){
				if(commentsCtrl.isNarrow){
					setTimeout(function(){
						var icon = $('#not-' + c.link).find('.icon');
						
						displayPopup(icon, function(){
							$('#nd-' + c.link + ' .body form').css('visibility', 'visible');
						});
					}, 210);
				}
			}
		}
	});
	
	asWebSocket.register('Comment', 'put', function(json){
		if(json.code == '200'){
			var comments = commentsCtrl.commentMap[json.message.link].items;
			
			var expandAndFadeInExpanded = function(){
				$('.expanded').hide();
				$('.expanded').css('visibility', 'visible');
				$('.expanded').fadeIn(200);
			};
			
			for(var x = 0; x < comments.length; x++){
				if(comments[x].id === json.message.id){
					comments[x].content = json.message.content;
					comments[x].edit = false;
					comments[x].status = null;
					commentsCtrl.commentMap[json.message.link].reply = 0;

					$scope.$apply();

					asRefreshComments.position();
					
					if(comments[x].expand){
						setTimeout(expandAndFadeInExpanded, 210);
					}
					
					break;
				}
			}
		}
	});
	
	asWebSocket.register('Comment', 'delete', function(json){
		if(json.code == '200'){
			var comment = null;
			
			for(var x = 0; x < commentsCtrl.comments.length; x++){
				for(var y = 0; y < commentsCtrl.comments[x].items.length; y++){
					if(commentsCtrl.comments[x].items[y].id === json.key.id){
						comment = commentsCtrl.comments[x].items[y];
						break;
					}
				}
				
				if(comment){
					break;
				}
			}
			
			if(comment){
				$('[data-link="' + comment.link + '"]').contents().unwrap();
				$('[data-link="' + comment.link + '"]').remove();
				
				asRefreshComments.process();
				
				$scope.$apply();
				
				asRefreshComments.position();
				
				$scope.$broadcast('control:change-triggered');
			}
		}
	});
	
	commentsCtrl.cancel = function(parent, comment){
		if(parent.status === 'create' && !comment.content.trim()){
			commentsCtrl.del(comment);
			$('#popup').hide();
		}
		else{
			comment.edit = false;
			comment.content = comment.backup;
			
			parent.reply = 0;
			
			setTimeout(function(){
				asRefreshComments.position();
				
				if(comment.expand){
					setTimeout(function(){
						$('.expanded').hide();
						$('.expanded').css('visibility', 'visible');
						$('.expanded').fadeIn(200);
					}, 210);
				}
			});
		}
	};
	
	commentsCtrl.del = function(c){
		var comment = new AsWsResource();
		
    	comment.resource = 'Comment';
    	comment.action = 'delete';
    	comment.key = {'ref_id': c.ref_id, 'id': c.id};
		
		asWebSocket.send(comment);
		
		commentsCtrl.selected = null;
	};
	
	commentsCtrl.toggleReply = function(comment){
		if(comment.reply){
			comment.reply = 0;
			$('#nd-' + comment.link + ' .reply').fadeOut(200, function(){
				$('#nd-' + comment.link + ' .reply').css('visibility', 'hidden');

				setTimeout(function(){
					asRefreshComments.position();
				});
			});
		}
		else{
			comment.reply = 1;
			
			setTimeout(function(){
				asRefreshComments.position();
				
				setTimeout(function(){
					$('#nd-' +  comment.link + ' .reply').hide();
					$('#nd-' +  comment.link + ' .reply').css('visibility', 'visible');
					$('#nd-' +  comment.link + ' .reply').fadeIn(200, function(){
						$('#nd-' +  comment.link + ' .reply textarea').focus();
					});
				}, 210);
			});
		}
	};
	
	commentsCtrl.toggleExpand = function(comment){
		if(comment.expand){
			comment.expand = false;
			$('.expanded').fadeOut(200, function(){
				$('.expanded').css('visibility', 'hidden');

				setTimeout(function(){
					asRefreshComments.position();
				});
			});
		}
		else{
			comment.expand = true;
			
			setTimeout(function(){
				asRefreshComments.position();
				
				setTimeout(function(){
					$('.expanded').hide();
					$('.expanded').css('visibility', 'visible');
					$('.expanded').fadeIn(200);
				}, 210);
			});
		}
	};
	
	commentsCtrl.edit = function(parent){
		var comment = parent.items[parent.items.length-1];
		
		comment.edit = true;
		comment.backup = comment.content;
		
		parent.reply = -1;
		
		setTimeout(function(){
			asRefreshComments.position();
			
			setTimeout(function(){
				$('#nd-' + comment.link + ' .body form').hide();
				$('#nd-' + comment.link + ' .body form').css('visibility', 'visible');
				$('#nd-' + comment.link + ' .body form').fadeIn(200, function(){
					$('#nd-' + comment.link + ' .body textarea').focus();
				});
			}, 210);
		});
	};
	
	commentsCtrl.canEdit = function(parent){
		var comment = parent.items[parent.items.length-1];
		
		return $scope.usersCtrl.userId === comment.user_id;
	};
	
	commentsCtrl.timeSince = function(date){
	    var seconds = Math.floor((new Date() / 1000) - date);

	    var interval = Math.floor(seconds / 31536000);
	    
	    if (interval === 1) {
	        return 'last year';
	    }
	    if (interval > 1) {
	        return interval + ' years ago';
	    }
	    interval = Math.floor(seconds / 2592000);
	    if (interval === 1) {
	        return 'last month';
	    }
	    if (interval > 1) {
	        return interval + ' months ago';
	    }
	    interval = Math.floor(seconds / 86400);
	    if (interval === 1) {
	        return 'yesterday';
	    }
	    if (interval > 1) {
	        return interval + ' days ago';
	    }
	    interval = Math.floor(seconds / 3600);
	    if (interval === 1) {
	        return interval + ' hour ago';
	    }
	    if (interval > 1) {
	        return interval + ' hours ago';
	    }
	    interval = Math.floor(seconds / 60);
	    if (interval === 1) {
	        return interval + ' minute ago';
	    }
	    if (interval > 1) {
	        return interval + ' minutes ago';
	    }
	    if(seconds < 10){
	    	return 'just now';
	    }
	    return Math.floor(seconds) + ' seconds ago';
	};
}]);