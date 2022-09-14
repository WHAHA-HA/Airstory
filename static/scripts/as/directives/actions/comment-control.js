app.directive('asCommentControl', ['asWebSocket', 'asState', function(asWebSocket, asState){
    return {
    	restrict: 'A',
    	scope: {
    		commentsCtrl: '=asCommentControl',
    		projectId: '=asProjectId',
    		documentId: '=asDocumentId'
    	},
    	link: function(scope, element){
    		element.mousedown(function(e){

				var applier = rangy.createClassApplier('as-range-finder', {
					applyToEditableOnly : true,
					useExistingElements: false
				});
				
				sel = rangy.getSelection();

				if(sel.isCollapsed && sel.anchorNode){
					var range = rangy.createRange();

					range.setStartBefore(sel.anchorNode.parentNode);
					range.setEndAfter(sel.anchorNode.parentNode);
			        
					sel.removeAllRanges();

					sel.addRange(range);
				}

				applier.applyToSelection();
			
				var rangeFinder = $('.as-range-finder');
				if (rangeFinder.length > 0) {
					asState.syncEditEnabled = false;

					scope.commentsCtrl.sel = $.extend(true, {}, rangy.getSelection());
					scope.commentsCtrl.savedSel = rangy.saveSelection();
					
					scope.$apply();
					
					rangeFinder.addClass('comment-range-marker');
					rangeFinder.removeClass('as-range-finder');
					
					var comment = new AsWsResource();
					
					comment.resource = 'Comment';
					comment.action = 'post';
					comment.key = {'ref_id': scope.projectId + '|' + scope.documentId};
					comment.message = {'content': ' '};
					
					comment.attributes = {'request_id': scope.commentsCtrl.requestId, 'reason': 'create-thread'};
					
					asWebSocket.send(comment);
				}
				
				$('#floating-comment').hide();

				e.stopPropagation();
				e.preventDefault();
				return false;
    		});
    	}
    };
}]);