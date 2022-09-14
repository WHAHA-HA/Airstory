app.directive('asDeleteNote', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		require: '^asNoteModal',
		link: function(scope, element, attrs, ctrl){
			element.click(function(){
				ctrl.deleteNote();
				ctrl.clearEditModal();
			});
		}
	};
}]);