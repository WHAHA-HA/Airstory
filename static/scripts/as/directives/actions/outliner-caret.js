app.directive('asOutlinerCaret', ['asJmlOT', function(asJmlOT){
	return {
		restrict: 'A',
		scope: {
			toggle: '=asToggle',
			outlinerCtrl: '=asOutlinerCtrl',
			siteCtrl: '=asSiteCtrl',
			projectId: '=asProjectId'
		},
		link: function(scope, element){
			scope.pos = scope.outlinerCtrl.outline.indexOf(scope.toggle);
			scope.path = [scope.pos+2, 1, 'hidechildren'];
			
			element.addClass('outliner-caret');
			
			element.mousedown(function(e){
				var indent = scope.outlinerCtrl.getIndent(scope.toggle);
				
				var next = scope.outlinerCtrl.getNext(scope.pos);
				if(next !== null){
					var nextIndent = scope.outlinerCtrl.getIndent(next);
					
					if(indent < nextIndent){
						var batch = [];
						
						if(!isObject(scope.toggle[1])){
							var ops = asJmlOT.doc.insertAt([scope.pos+2], 1, {}, batch);
							ops = scope.outlinerCtrl.adjust(ops);
							
							window.jsonml0.apply(scope.outlinerCtrl.outline, ops);
						}
						
						if(scope.toggle[1].hidechildren == 'true'){
							scope.toggle[1].hidechildren = 'false';
						}
						else{
							scope.toggle[1].hidechildren = 'true';
						}
						
						asJmlOT.doc.setAt(scope.path, scope.toggle[1].hidechildren, batch);
						
						if(scope.siteCtrl.validatePermission(scope.projectId, 4)){
							asJmlOT.client.applyClient(batch);
						}
						
						scope.$apply();
						
						scope.outlinerCtrl.refreshDisplay();
					}
				}
			});
		}
	};
}]);