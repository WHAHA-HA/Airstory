app.directive('asSaveComment', ['asWebSocket', 'asState', function(asWebSocket, asState){
	function save(scope){
		var comment = new AsWsResource();
		
		comment.resource = 'Comment';
		comment.action = 'post';
		comment.key = {'ref_id': scope.projectId + '|' + scope.documentId};
		comment.message = {'content': scope.comment.content};
		comment.attributes = {'request_id': scope.requestId};
		
		if(scope.commentParent && scope.commentParent.link){
			comment.message.link = scope.commentParent.link;
			scope.commentParent.reply = false;
		}
		
		if(scope.commentId){
			comment.action = 'put';
			comment.key.id = scope.commentId;
		}
		
		asWebSocket.send(comment);
		
		scope.comment.content = '';
		
		scope.$apply();
	}
	
	return {
		restrict: 'A',
		scope: {
			projectId: '=asProjectId',
			documentId: '=asDocumentId',
			commentId: '=asCommentId',
			comment: '=asSaveComment',
			commentParent: '=asCommentParent',
			requestId: '=asRequestId'
		},
		link: function(scope, element){
			element.submit(function(e){
		    	save(scope);
			});
		}
	};
}]);