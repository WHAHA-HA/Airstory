app.directive('asModifyItem', ['asJmlOT', function(asJmlOT){
	return {
		restrict: 'A',
		scope: {
			item: '=asModifyItem',
			outlinerCtrl: '=asOutlinerCtrl'
		},
		link: function(scope, elem){
			scope.pos = scope.outlinerCtrl.outline.indexOf(scope.item) + 2;
			scope.path = [scope.pos];
			scope.statusPath = [scope.pos, 1, 'status'];
			scope.titlePath = [scope.pos, 2];
			scope.indentPath = [scope.pos, 'indent'];
			
			elem.click(function(e){
				e.stopPropagation();
			});
			
			elem.keydown(function(e){
				if(e.keyCode == 13 || e.keyCode == 27){
					var ops = null;
					var batch = [];
					var changed = false;
					
					if(elem.val() === '' && scope.outlinerCtrl.hasDisplayable(2)){
						ops = asJmlOT.doc.removeAt(scope.path, batch);
						changed = true;
					}
					else if(elem.val() !== ''){
						delete scope.item[1].status;
						changed = true;
					}
					
					if(changed){
						var newFocus = null; 
						
						//TODO: Make synchronous edit proof
						if(elem.val() === ''){
							if(scope.item[1].type == 'before'){
								newFocus = $(e.target).closest('.item');
							}
							else{
								newFocus = $(e.target).closest('.item').prevAll('.item:visible:first');	
								
								if(newFocus.length === 0){
									newFocus = $(e.target).closest('.item').nextAll('.item:visible:first');
								}
							}
						}
						else{
							newFocus = $(e.target).closest('.item');
						}
						
						if(ops){
							ops = scope.outlinerCtrl.adjust(ops);
							window.jsonml0.apply(scope.outlinerCtrl.outline, ops);
						}
						
						if(e.shiftKey){
							var newPos = scope.pos+1;
			
							var newOps = asJmlOT.doc.insertAt([], newPos, [scope.item[0], {}, ''], batch);
							newOps = scope.outlinerCtrl.adjust(newOps);
							
							window.jsonml0.apply(scope.outlinerCtrl.outline, newOps);
							
							asJmlOT.client.applyClient(batch);
							
							scope.outlinerCtrl.outline[newPos-2][1].status = 'add';
							
							scope.$apply();
							scope.outlinerCtrl.refreshDisplay();
							
							newFocus.nextAll('.item:visible:first').find('input').focus();
						}
						else{
							if(batch.length){
								asJmlOT.client.applyClient(batch);
							}
							
							scope.$apply();
							scope.outlinerCtrl.refreshDisplay();
							
							newFocus.focus();
						}
					}
					
					e.preventDefault();
					return false;
				}
				else if(e.keyCode != 9 && e.keyCode != 38 && e.keyCode != 40){
					e.stopPropagation();
				}
			});
			
			elem.keyup(function(e){
				if(e.keyCode != 9 && e.keyCode != 38 && e.keyCode != 40){
					var oldValue = asJmlOT.doc.snapshot[scope.pos][2];
					var value = scope.item[2];
					var batch = [];
					
					if(!oldValue && oldValue !== ''){
						oldValue = '';
						asJmlOT.doc.insertAt([scope.pos], 2, '', batch);
					}
					
					var pre = 0;
					
					while (pre < oldValue.length && pre < value.length && oldValue.charAt(pre) === value.charAt(pre)) {
						pre++;
					}
					var post = 0;
					while (post < oldValue.length - pre && post < value.length - pre && oldValue.charAt(oldValue.length - post - 1) === value.charAt(value.length - post - 1)) {
						post++;
					}

					var rm = oldValue.length - pre - post;
					var ins = value.length - pre - post;
					
					if (rm || ins) {
						if (rm) {
							asJmlOT.doc.deleteTextAt(scope.titlePath, rm, pre, batch);
						}

						if (ins) {
							value = value.substr(pre, ins);
							asJmlOT.doc.insertAt(scope.titlePath, pre, value, batch);
						}
						
						asJmlOT.client.applyClient(batch);
					}
				}
			});
			
			elem.mousedown(function(e){
				e.stopPropagation();
			});
			
			elem.blur(function(e){
				if(scope.item[1].status){
					var ops = null;
					var changed = false;
					
					if(elem.val() === '' && scope.outlinerCtrl.hasDisplayable(2)){
						ops = asJmlOT.doc.removeAt(scope.path);
						changed = true;
					}
					else if(elem.val() === '' && scope.outlinerCtrl.hasDisplayable()){
						//$(e.target).focus();
					}
					else if(elem.val() !== ''){
						//ops = asJmlOT.doc.removeAt(scope.statusPath);
						delete scope.item[1].status;
						changed = true;
					}
	
					if(changed){
						if(ops){
							ops = scope.outlinerCtrl.adjust(ops);
							window.jsonml0.apply(scope.outlinerCtrl.outline, ops);
						}
						
						scope.$apply();
		
						scope.outlinerCtrl.refreshDisplay();
					}
				}
			});
		}
	};
}]);