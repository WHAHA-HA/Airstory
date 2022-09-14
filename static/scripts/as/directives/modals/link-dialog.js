app.directive('asLinkDialog', function(){
	return {
		restrict: 'A',
		scope: {
			editorId: '@asLinkDialog'
		},
		link: function(scope, element){
			element.find('.remove-link').click(function(){
				$(scope.editorId).data('wysiwyg').composer.commands.exec("removeLink");
				$(scope.editorId).data('wysiwyg').toolbar.commandMapping['createLink:null'].dialog.cancel();
			});
		
			element.find('.go-to-link').click(function(){
				var url = element.find('input').val();
				
				if(url && url != "http://"){
					window.open(url, '_blank');
				}
			});
			
			scope.$on('editor:show-link-dialog', function() {
				var taLink = element.find('input').get(0);
				taLink.scrollLeft = taLink.scrollWidth; 
				
				var url = element.find('input').val();
				
				if(url && url != "http://"){
					element.find('.go-to-link, .remove-link').css('display', 'inline-block');
				}
				else{
					element.find('.go-to-link, .remove-link').css('display', 'none');
				}
			});
		}
	};
});