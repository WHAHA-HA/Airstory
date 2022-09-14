app.service('asRefreshCitations', function(){
	var refresh = this;
	var timeout = null;
	
	refresh.citationsCtrl = null;
	
	this.init = function(scope, citationsCtrl){
		refresh.citationsCtrl = citationsCtrl;
		
		$('#document').on('mousedown', '.citation-ref', function(e){
			var documentcitations = refresh.citationsCtrl.documentcitations;
			var citationsPopulated = self.location.hash.indexOf('/citations') != -1;
			
			scope.$broadcast('splitter:request', '#citations-handle');
			
			self.location.hash = '/citations';
			
			var id = $(this).attr('data-id');
			var activeCitation = null;
			
			for(var x = 0; x < documentcitations.length; x++){
				if(documentcitations[x].clazz !== 'hide'){
					delete documentcitations[x].clazz;
				}
			}
			
			for(var y = 0; y < documentcitations.length; y++){
				if(documentcitations[y].id == id){
					documentcitations[y].clazz = 'active';
					activeCitation = documentcitations[y];
				}
			}
			
			scope.$apply();
			
			if(activeCitation){
				if(citationsPopulated){
					$('[data-as-splitter-panel="right"]').scrollTo($('#citations .card[data-as-id="' + activeCitation.id + '"]'));
				}
				else{
					setTimeout(function(){
						$('[data-as-splitter-panel="right"]').scrollTo($('#citations .card[data-as-id="' + activeCitation.id + '"]'));
					}, 200);
				}
			}
			
			clearTimeout(timeout);
			
			timeout = setTimeout(function(){
				delete activeCitation.clazz;
				scope.$apply();
			}, 5000);
			
			e.preventDefault();
			e.stopPropagation();
			return false;
		});
	};
	
	this.process = function(){
		if(refresh.citationsCtrl){
			var documentcitations = refresh.citationsCtrl.documentcitations;
			
			for(var x = 0; x < documentcitations.length; x++){
				documentcitations[x].clazz = 'hide';
			}
			
			var position = 0;
			
			$('#document').find('.citation-ref').each(function(index){
				var id = $(this).attr('data-id');
				var found = false;
				
				for(var x = 0; x < documentcitations.length; x++){
					if(id === documentcitations[x].id){
						found = true;
						
						if(documentcitations[x].clazz !== 'hide'){
							$(this).html(documentcitations[x].position);
							break;
						}
						else{
							position++;
							$(this).html(position);
							
							documentcitations[x].position = position;
							documentcitations[x].clazz = '';
							break;
						}
					}
				}
				
				if(!found){
					$(this).remove();
				}
			});
		}
	};
});