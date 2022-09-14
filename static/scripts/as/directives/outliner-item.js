app.directive('asOutlinerItem', ['asJmlOT', function(asJmlOT){
	return {
		restrict: 'A',
		scope: {
			item: '=asOutlinerItem',
			outlinerCtrl: '=asOutlinerCtrl',
			siteCtrl: '=asSiteCtrl',
			projectId: '=asProjectId'
		},
		link: function(scope, elem){
			elem.addClass('item');

			scope.pos = scope.outlinerCtrl.outline.indexOf(scope.item) + 2;
			scope.path = [scope.pos];
			scope.statusPath = [scope.pos, 1, 'status'];
			scope.indentPath = [scope.pos, 0];
			scope.hidePath = [scope.pos, 1, 'hidechildren'];
			
			var H_TAGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
			
			elem.mousedown(function(e){
				$(this).focus();
			});
			
			function up(that, e){
				$(that).prevAll('.item:visible:first').focus();
			}
			
			function down(that, e){
				$(that).nextAll('.item:visible:first').focus();
			}
			
			function enter(that, e){
				var newPos = scope.pos;
				var type = 'before';
				
				if(!e.shiftKey){
					newPos++;
					type = 'after';
					
					if(scope.item[1].hidechildren == 'true'){
						var children = scope.outlinerCtrl.children(scope.item, scope.pos-2);
						newPos = children[children.length-1].pos + 2 + 1;
					}
					
					while(newPos-2 < scope.outlinerCtrl.outline.length && scope.outlinerCtrl.getIndent(scope.outlinerCtrl.outline[newPos-2]) === 7){
						newPos++;
					}
				}
				
				var indent = scope.outlinerCtrl.getIndent(scope.item);

				var ops = asJmlOT.doc.insertAt([], newPos, ['H' + indent, {}, '']);
				ops = scope.outlinerCtrl.adjust(ops);
				
				window.jsonml0.apply(scope.outlinerCtrl.outline, ops);
				
				scope.outlinerCtrl.outline[newPos-2][1].status = 'add';				
				scope.outlinerCtrl.outline[newPos-2][1].type = type;
				
				scope.$apply();

				scope.outlinerCtrl.refreshDisplay();
				
				//TODO: Make synchronous edit proof, perhaps more like the del() focus selector...
				$('.modify').find('input').focus();
			}
			
			function del(that, e){
				$(that).prevAll('.item:visible:first').focus();
				
				var batch = [];
				
				var currentIndent = scope.outlinerCtrl.getIndent(scope.outlinerCtrl.outline[scope.pos-2]);

				var deleteOp = asJmlOT.doc.removeAt(scope.path, batch);
				deleteOp = scope.outlinerCtrl.adjust(deleteOp);
				
				window.jsonml0.apply(scope.outlinerCtrl.outline, deleteOp);
				
				while(scope.outlinerCtrl.outline.length > scope.pos-2 && (scope.outlinerCtrl.getIndent(scope.outlinerCtrl.outline[scope.pos-2]) === 7 || (currentIndent < scope.outlinerCtrl.getIndent(scope.outlinerCtrl.outline[scope.pos-2]) && scope.outlinerCtrl.outline[scope.pos-2][0] === 'DIV'))){
					var childOp = asJmlOT.doc.removeAt([scope.pos], batch);
					childOp = scope.outlinerCtrl.adjust(childOp);
					
					window.jsonml0.apply(scope.outlinerCtrl.outline, childOp);
				}
				
				asJmlOT.client.applyClient(batch);
					
				if(!scope.outlinerCtrl.hasDisplayable()){
					scope.outlinerCtrl.setDefault();
				}

				if(!scope.$$phase){
					scope.$apply();
				}
				
				scope.outlinerCtrl.refreshDisplay();
			}
			
			function space(that, e){
				if(!scope.item[1] || !scope.item[1].ref){
					if(!isObject(scope.item[1])){
						var op = asJmlOT.doc.insertAt([scope.pos], 1, {});
						op = scope.outlinerCtrl.adjust(op);
						
						window.jsonml0.apply(scope.outlinerCtrl.outline, op);
					}
					
					scope.item[1].status = 'edit';
					
					scope.$apply();
					
					var input = $(e.target).find('input');
					
					if(!input.length){
						input = $(e.target).closest('.item').find('input');
					}
					
					input.focus();
				}
			}
			
			function indent(that, e){
				if(H_TAGS.indexOf(scope.item[0]) != -1){
					var batch = [];
					var indent = scope.outlinerCtrl.getIndent(scope.item);
					
					if(indent < 5){
						var indentOps = scope.outlinerCtrl.updateIndent(scope.item, scope.pos, indent+1, batch);
						indentOps = scope.outlinerCtrl.adjust(indentOps);
						
						window.jsonml0.apply(scope.outlinerCtrl.outline, indentOps);
					}
					
					if(scope.item[1].hidechildren == 'true'){
						var ops = asJmlOT.doc.setAt(scope.hidePath, false, batch);
						ops = scope.outlinerCtrl.adjust(ops);
						
						window.jsonml0.apply(scope.outlinerCtrl.outline, ops);
					}
					
					// If parent items are hiding their children, this indented element will 'disappear' (be hidden as well). 
					// It is better to show the parents children then to cause confusion that elements are lost
					var parents = scope.outlinerCtrl.parents(scope.item, scope.pos-2);
					
					for(var x = 0; x < parents.length; x++){
						if(parents[x].item[1].hidechildren == 'true'){
							// show children
							parents[x].item[1].hidechildren = 'false';
							asJmlOT.doc.setAt([parents[x].pos+2, 1, 'hidechildren'], 'false', batch);
						}
					}
					
					if(batch.length){
						asJmlOT.client.applyClient(batch);
					}
	
					scope.outlinerCtrl.refreshDisplay();
					
					scope.$apply();
				}
			}
			
			function outdent(that, e){
				if(H_TAGS.indexOf(scope.item[0]) != -1){
					var batch = [];
					var indent = scope.outlinerCtrl.getIndent(scope.item);
					
					if(indent > 1){
						var ops = scope.outlinerCtrl.updateIndent(scope.item, scope.pos, indent-1, batch);
						ops = scope.outlinerCtrl.adjust(ops);
						
						window.jsonml0.apply(scope.outlinerCtrl.outline, ops);
					}
					
					if(scope.item[1].hidechildren == 'true'){
						var opsHide = asJmlOT.doc.setAt(scope.hidePath, false, batch);
						opsHide = scope.outlinerCtrl.adjust(opsHide);
						
						window.jsonml0.apply(scope.outlinerCtrl.outline, opsHide);
					}
	
					if(batch.length){
						asJmlOT.client.applyClient(batch);
					}
	
					scope.outlinerCtrl.refreshDisplay();
					
					scope.$apply();
				}
			}
			
			elem.dblclick(function(e){
				if(scope.siteCtrl.validatePermission(scope.projectId, 4)){
					space(this, e);
				}
			});

			elem.keydown(function(e){
				if(scope.siteCtrl.validatePermission(scope.projectId, 4)){
					if(e.keyCode == '38'){
						up(this, e);
					}
					else if(e.keyCode == '40'){
						down(this, e);
					}
					else if(e.keyCode == '13'){
						enter(this, e);
					}
					else if(e.keyCode == '8'){
						del(this, e);
					}
					else if(e.keyCode == '32'){
						space(this, e);
					}
					else if(e.keyCode == '9'){
						if(e.shiftKey){
							outdent(this, e);
						}
						else{
							indent(this, e);
						}
						
						if(scope.item.status == 'add'){
							$('#' + scope.item.id).find('input').focus();
						}
					}
				}

				e.stopPropagation();
				e.preventDefault();
				return false;
			});
		}
	};
}]);