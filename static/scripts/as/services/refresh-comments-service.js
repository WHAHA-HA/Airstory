function RefreshComments(){
	var refresh = this;
	
	function commentTagSensor(){
		var sel = rangy.getSelection();
		
		var comment = $(sel.focusNode).closest('[data-link]');
		
		if(comment.length){
			refresh.commentsCtrl.selected = comment;
		}
		else if(!sel.isCollapsed){
			$('.dotted-line').css('display', 'none');
		}
		else{
			$('.dotted-line').css('display', 'none');
			refresh.scope.commentsCtrl.selected = null;
		}
		
		refresh.position();
	}
	
	refresh.init = function(scope, commentsCtrl){
		refresh.commentsCtrl = commentsCtrl;
		refresh.scope = scope;
		
		$('#document').keyup(commentTagSensor);
		
		$('#document').mouseup(commentTagSensor);
		
		$('#notifications').mouseup(function(e){
			//e.stopPropagation();
		});

		$('#notifications').on('mouseup', '.notification', function(e){
			var key = $(this).attr('id').replace('not-', '');
			
			refresh.commentsCtrl.selected = $('[data-link="' + key + '"]');

			refresh.position();
			
			e.stopPropagation();
		});
	};
	
	var prevSelected = null;
	
	this.position = function(){
		if(refresh.commentsCtrl){
			if(refresh.commentsCtrl.selected === 'comment'){
				//skip
			}
			else if(refresh.commentsCtrl.selected){
				if(!prevSelected || !refresh.commentsCtrl.selected || prevSelected.get(0) !== refresh.commentsCtrl.selected.get(0)){
					$('.dotted-line').css('display', 'none');
					prevSelected = refresh.commentsCtrl.selected;
				}
				else if(!$('[data-link="' + prevSelected.attr('data-link') + '"]').length){
					$('.dotted-line').css('display', 'none');
					prevSelected = null;
				}
				
				var allComments = $('[data-link]');
				
				var link = refresh.commentsCtrl.selected;
				var key = link.attr('data-link');
				
				var notification = $('[id="not-' + key + '"]');
				
				var markerId = 'as-marker-' + uuid.v4();
				link.append('<span id="' + markerId + '"></span>');
				
				var marker = $('#' + markerId);
				
				var top = marker.position().top;
				
				marker.remove();

				notification.animate({top: top}, 200, null, drawLine);
				
				var index = -1;
				
				var prev = top + notification.height() + 80;
				
				for (var i = 0; i < refresh.commentsCtrl.comments.length; i++) { 
					var comment = refresh.commentsCtrl.comments[i];
					
					if(comment.link === key){
						index = i;
					}
					else if(index !== -1 && comment.found){
						var nextLink = $('[data-link="' + comment.link + '"]');
						var nextNotification = $('[id="not-' + comment.link + '"]');
						
						var nextTop = nextLink.position().top;
						
						if(prev > nextTop-20){
							nextTop = prev + 20;
						}
						
						nextNotification.animate({top: nextTop}, 200);
						
						prev = nextNotification.height() + nextTop;
					}
				}
				
				if(index === -1){
					defaultPosition();
					return;
				}
				
				prev = top - 80;
				
				for (var x = index-1; x >= 0; x--){
					var prevComment = refresh.commentsCtrl.comments[x];
					
					if(prevComment.found){
						var prevLink = $('[data-link="' + prevComment.link + '"]');
						var prevNotification = $('[id="not-' + prevComment.link + '"]');
						
						var prevTop = prevLink.position().top;
						
						if(prevTop + prevNotification.height() >= prev){
							prevTop = prev - prevNotification.height() - 20;
						}
						
						prevNotification.animate({top: prevTop}, 200);
						
						prev = prevTop;
					}
				}
			}
			else{
				defaultPosition();
			}
		}
	};
	
	function drawLine(){
		var key = $(this).attr('id').replace('not-', '');
		
		if(refresh.commentsCtrl.selected && refresh.commentsCtrl.commentMap[key] && refresh.commentsCtrl.commentMap[key].found){
			var l = refresh.commentsCtrl.selected;
			var n = $('#notifications');
			var dot = $('.dotted-line');
			
			var markerId = 'as-marker-' + uuid.v4();
			l.append('<span id="' + markerId + '"></span>');
			
			var marker = $('#' + markerId);
			
			var nLeft = n.position().left + 25;
			var lLeft = marker.position().left;
			
			dot.css('display', 'block');
			dot.css('left', lLeft);
			dot.css('top', l.position().top + l.height());
			dot.width((nLeft - lLeft) + 'px');
			
			marker.remove();
		}
	}
	
	function defaultPosition(){
		if(!prevSelected || !refresh.commentsCtrl.selected || prevSelected.get(0) !== refresh.commentsCtrl.selected.get(0)){
			$('.dotted-line').css('display', 'none');
			prevSelected = refresh.commentsCtrl.selected;
		}
		
		var prev = 0;

		for(var x = 0; x < refresh.commentsCtrl.comments.length; x++){
			if(refresh.commentsCtrl.comments[x].found){
				var notification = $('[id="not-' + refresh.commentsCtrl.comments[x].link + '"]');
				var link = $('[data-link="' + refresh.commentsCtrl.comments[x].link + '"]');
				
				var top = link.position().top;
				
				if(prev > top-20){
					top = prev + 20;
				}
				
				notification.animate({top: top}, 200);
				
				prev = notification.height() + top;
			}
		}
	}
	
	this.process = function(){
		if(refresh.commentsCtrl){
			var expanded = null;
	
			for(var key in refresh.commentsCtrl.commentMap){
				var dataLink = $('[data-link="' + key + '"]');
				
				if(dataLink.length){
					refresh.commentsCtrl.commentMap[key].found = true;
				}
				else{
					refresh.commentsCtrl.commentMap[key].found = false;
				}
			}
			
			var links = $('[data-link]');
			
			if(links.length){
				for (var i = 0; i < links.length; i++) { 
					var link = refresh.commentsCtrl.commentMap[links.eq(i).attr('data-link')];
					
					if(link){
						link.order = i;
					}
				}
				if(!$('#workspace').hasClass('has-comments')){
					$('#workspace').addClass('has-comments');
				}
			}
			else{
				$('#workspace').removeClass('has-comments');
			}
			
			refresh.commentsCtrl.comments.sort(function(a, b){
			    if(a.order < b.order) return -1;
			    if(a.order > b.order) return 1;
			    return 0;
			});
		}
	};
}

app.service('asRefreshComments', RefreshComments);