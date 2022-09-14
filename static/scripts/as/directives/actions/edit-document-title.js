app.directive('asEditDocumentTitle', ['asWebSocket', function(asWebSocket){
	return {
		restrict: 'A',
		scope: {
			doc: '=asEditDocumentTitle',
			siteCtrl: '=asSiteCtrl',
			projectId: '=asProjectId'
		},
		link: function(scope, element){
			
			function edit(){
				if(scope.siteCtrl.validatePermission(scope.projectId, 4)){
					scope.doc.action = 'edit';
					scope.$apply();
					
					setTimeout(function(){
						$('#' + scope.doc.id).focus();
					}, 1);
				}
			}

			if(element.hasClass('clickable')){
				element.dblclick(edit);
			}
			else{
				element.click(edit);
			}
		}
	};
}]);