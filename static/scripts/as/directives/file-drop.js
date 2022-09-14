app.directive('asFileDrop', function() {
	return {
		restrict : 'A',
		scope : {
			loading: '=asLoading'
		},
		link : function(scope, element) {
			element.on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
				e.preventDefault();
				e.stopPropagation();
			}).on('dragover dragenter', function() {
				element.addClass('is-dragover');
			}).on('dragleave dragend drop', function() {
				element.removeClass('is-dragover');
			}).on('drop', function(e) {
				var droppedFiles = e.originalEvent.dataTransfer.files;

				e.preventDefault();
			
				//TODO: Merge logic from here and uploader.js
				scope.loading.clazz = ['alert', 'alert-info'];
				scope.loading.msg = 'Uploading...';
				
				scope.$apply();

				var form = $('[data-as-uploader]');
				var inputFiles = form.find('input[type="file"]');
				var rawForm = form.get(0);

				// Clear out just in case files were previously populated to uploader
				rawForm.reset();
				inputFiles.val('');

				var ajaxData = new FormData(form.get(0));

				if (droppedFiles) {
					$.each(droppedFiles, function(i, file) {
						ajaxData.append(inputFiles.attr('name'), file);
					});
				}

				$.ajax({
					url : form.attr('action'),
					type : form.attr('method'),
					data : ajaxData,
					dataType : 'json',
					cache : false,
					contentType : false,
					processData : false,
					complete : function() {
						console.log('upload complete');
						scope.$apply();
					},
					success : function(data) {
						console.log('upload success');
						scope.loading.clazz = ['alert', 'alert-success'];
						scope.loading.msg = 'Successfully uploaded image(s)';
					},
					error : function(e) {
						console.log('upload error');
						console.log(e);
						scope.loading.clazz = ['alert', 'alert-danger'];
						scope.loading.msg = 'Failed to upload image(s)';
					}
				});
			});
		}
	};
});