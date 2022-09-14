
app.directive('asCards', function() {
	return {
		restrict: 'A',
		link: function(scope, element) {
			var cards = angular.element(element);
			cards.addClass('as-connected-list');

			cards.sortable({
				connectWith: '.as-editor, .sort',
				cursor: 'move',
				delay: 150,
				helper: function(event, el){
					var clone = $('<div id="clone" class="as-card tilt">' + el.html() + '</div>');
					
					cards.append(clone);
					clone.hide();
					
			        setTimeout(function(){
			        	clone.appendTo('[data-as-splitter]'); 
			        	clone.show();
			        },1);
			        return clone;
				},
				//forceHelperSize: true,
				//forcePlaceholderSize: true,
				scroll: true,
				scrollSensitivity: 100,
				change: function(event, ui) {
					//TODO: disable editor sortable so that we can not drop cards in it
				},
				start: function(event, ui) {
					var id = uuid.v4();
					var title = ui.item.find('h3').html();
					var desc = ui.item.find('.body').html();
					var refId = ui.item.attr('data-as-ref-id');
					var cardId = ui.item.attr('data-as-id');
					
					if(!title){
						title = desc;
					}
					
					/*if(cardId.startsWith('i')){
						title = ui.item.find('.body').find('img').attr('src');
						
						//https://res.cloudinary.com/airstory/image/upload/c_scale,w_178/v1/dev/i1467060089564c279e-fab4-47c0-aa47-57978955240d/vOiN0dw.jpg
						if(title.indexOf('res.cloudinary.com') != -1){
							var imgRef = title.substring(title.indexOf('/v1'));
							
							title = 'https://res.cloudinary.com/airstory/image/upload' + imgRef;
						}
					}*/
					
					var item = ['DIV', {'class': 'as-editor-card', 'ref': refId + '|' + cardId, 'id': cardId, 'contenteditable': false}, ['DIV', {'class': 'as-editor-card-handle'}, ['P', ['IMG', {'src': '/static/images/spinner.gif'}]]]];
					
					ui.item.sortable = {
						isCanceled: function(){
							return false;
						},
						model: item,
						moved: item
					};
				},
				stop: function(event, ui) {
					var id = ui.item.attr('data-as-id');
					var refId = ui.item.attr('data-as-ref-id');
					
					if (ui.item.closest('.as-connected-list').hasClass('as-editor')) {
						ui.item.before('<div id="' + id + '" class="as-editor-card" contenteditable="false"><div class="as-editor-card-handle"><img src="/static/images/spinner.gif" /></div></div>');
						cards.sortable('cancel');
						
						scope.$emit('editor:drop', {'ref_id': refId, 'id': id, 'destination': 'e'});
					} 
					else if(ui.item.closest('.sort').length){
						cards.sortable('cancel');
						
						scope.$emit('editor:drop', {'ref_id': refId, 'id': id, 'destination': 'o'});
					}
				}
			});
		}
	};
});