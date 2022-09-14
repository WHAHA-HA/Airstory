app.directive('asUploader', function() {
	return {
		restrict : 'A',
		scope : {
			loading: '=asLoading'
		},
		link : function(scope, element) {
			var inputFiles = element.find('input[type="file"]');

			inputFiles.change(function(e) {
				
				var fileName = '';
				if (this.files && this.files.length > 1) {
					fileName = (this.getAttribute('data-multiple-caption') || '').replace('{count}', this.files.length);
				} else {
					fileName = e.target.value.split('\\').pop();
				}
				
				scope.loading.clazz = ['alert'];

				if (fileName) {
					scope.loading.clazz.push('alert-info');
					scope.loading.msg = 'Uploading ' + fileName;
					
					scope.$apply();
				}

				var ajaxData = new FormData(element.get(0));

				$.each(this.files, function(i, file) {
					ajaxData.append($(this).attr('name'), file);
				});

				$.ajax({
					url : element.attr('action'),
					type : element.attr('method'),
					data : ajaxData,
					dataType : 'json',
					cache : false,
					contentType : false,
					processData : false,
					complete : function() {
						console.log('upload complete');
						scope.$apply();
						
						element.get(0).reset();
						inputFiles.val('');
					},
					success : function(data) {
						console.log('upload success');
						scope.loading.clazz = ['alert', 'alert-success'];
						scope.loading.msg = 'Successfully uploaded ' + fileName;
					},
					error : function(e) {
						console.log('upload error');
						console.log(e);
						scope.loading.clazz = ['alert', 'alert-danger'];
						scope.loading.msg = 'Failed to upload ' + fileName;
					}
				});
			});
		}
	};
});