app.directive('asCardify', ['asWebSocket', 'asState', function(asWebSocket, asState){
	return {
		restrict: 'A',
		scope: {
			projectId: '=asProjectId'
		},
		link: function(scope, element){
			element.mousedown(function(){
				var sel = rangy.getSelection();

				var html = sel.toHtml();

				var selected = null;
				try {
					selected = $(html);
				} catch (err) {}

				if (selected === null || typeof selected.html() === 'undefined') {
					selected = $('<p></p>').html(html);
				}

				if (!selected.is('div')) {
					selected = selected.wrapAll('<div></div>').parent();
				}

				selected.find('.comment-range-marker').contents().unwrap();
				selected.find('.comment-range-marker').remove();
				selected.find('[data-type="comment"]').contents().unwrap();
				selected.find('[data-type="comment"]').remove();

				var note = new AsWsResource();
				
				note.resource = 'Note';
				note.action = 'post';
				note.key = {'ref_id': scope.projectId};
				note.message = {'title': '', 'content': selected.html()};
				
				asWebSocket.send(note);
				
				asState.syncEditEnabled = true;
				
				scope.$emit('control:change-triggered');
			});
		}
	};
}]);