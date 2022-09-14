app.directive('asCommentSelection', function(){
	return {
		restrict: 'A',
		link: function(scope, element){
			var applier = rangy.createClassApplier('as-range-finder', {
				applyToEditableOnly : true,
				useExistingElements : false
			});
			
			element.blur(function(){
				$('#floating-comment').fadeOut();
			});
			
			function commentSelection(e){
				var sel = rangy.getSelection();
				if (scope.siteCtrl.validatePermission(scope.projectCtrl.projectId, 4) && !sel.isCollapsed && (!$(sel.focusNode).closest('[data-link]').length || !$(sel.anchorNode).closest('[data-link]').length)) {
					var save = rangy.saveSelection();
					applier.applyToSelection();
					var range = $('.as-range-finder');
					
					var notifications = $('.notification');
					var lookupNotifications = [];
					
					for(var x = 0; x < notifications.length; x++){
						var notification = notifications.eq(x);
						
						lookupNotifications.push({top: notification.position().top, height: notification.height(), item: notification});
					}
					
					lookupNotifications.sort(function(a, b){
					    if(a.top < b.top) return -1;
					    if(a.top > b.top) return 1;
					    return 0;
					});
					
					var floatingComment = $('#floating-comment');
					
					var top = (range.position().top-5);
					
					floatingComment.css('top', top + 'px');
					
					floatingComment.fadeIn();
					
			    	range.contents().unwrap();
			    	rangy.restoreSelection(save);
			    	
					$('.dotted-line').css('display', 'none');

					scope.commentsCtrl.selected = null;
				}
				else{
					$('#floating-comment').fadeOut();
				}
			} 
			
			element.keyup(commentSelection);
			element.mouseup(commentSelection);
			element.focus(function(){
				setTimeout(function(){
					commentSelection();
				});
			});
		}
	};
});