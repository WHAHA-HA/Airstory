app.directive('asLoaddrawer', function(){
	return {
		restrict: 'A',
		scope: {
			loadpage: '@asLoaddrawer',
			isProjectsPage: '=asIsProjectsPage'
		},
		link: function(scope, element){
			element.click(function(){
				if(scope.loadpage === 'citations'){
					scope.$emit('splitter:request', '/' + scope.loadpage);
				}
				else{
					if(scope.isProjectsPage){
						scope.$emit('splitter:request', '/' + scope.loadpage + '/project');
					}
					else{
						scope.$emit('splitter:request', '/' + scope.loadpage + '/user');
					}
				}
			});
		}
	};
});