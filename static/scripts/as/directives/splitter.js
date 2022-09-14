app.directive('asSplitter', [ 'splitterLeftPanelMinWidth', 'splitterRightPanelMinWidth', 'asRefreshComments', 'asDebouncer', function(leftMinWidth, rightMinWidth, asRefreshComments, asDebouncer) {
	return {
		restrict: 'A',
		controller: ['$scope', '$element', function($scope, $element) {
			var splitter = $element;
			
			var leftPanel = null;
			var rightPanel = null;
			
			var selected = false;
			var expanded = true;
			var position = 0;
			var right = 0;

			var leftPanelWidth = 0;
			var rightPanelWidth = 0;
			
			var tab = null;
			
			this.setLeftPanel = function(element) {
				leftPanel = element;
			};

			this.setRightPanel = function(element) {
				rightPanel = element;
			};
			
			var tabs = null;
			
			this.setHandle = function(element){
				tabs = element;
				
				tabs.mousedown(function(e){
					selected = true;
					position = e.pageX;
					right = parseInt(tabs.css('right'));
					leftPanelWidth = leftPanel.width();
					rightPanelWidth = rightPanel.width();
					
					return false;
				});
			};
			
			$scope.$on('splitter:request', function(event, id){
				tabs.show();
				
				right = parseInt(tabs.css('right'));
				leftPanelWidth = leftPanel.width();
				rightPanelWidth = rightPanel.width();

				self.location.hash = '#' + id;
				
				if(!rightPanel.is(":visible")){
					rightPanel.show();
					rightPanel.animate({width: rightMinWidth + 'px'}, 500);
					leftPanel.animate({width: (leftPanel.width() - rightMinWidth) + 'px'}, {duration: 500, progress: function(){
							$scope.$broadcast('splitter:resized', leftPanel.width(), rightPanel.width());
						},
						complete: function(){
							asRefreshComments.process();
							$scope.$apply();
							asRefreshComments.position();
						}
					});
					tabs.animate({right: rightMinWidth + 'px'}, 500);
					
					expanded = true;
				}
			});
			
			$scope.$on('splitter:close', function(){
				var width = $(document).width() - 50;
				
				leftPanel.animate({width: width + 'px'}, {duration: 500, progress: function(){
						$scope.$broadcast('splitter:resized', leftPanel.width(), rightPanel.width());
					},
					complete: function(){
						asRefreshComments.process();
						$scope.$apply();
						asRefreshComments.position();
					}
				});
				
				rightPanel.animate({width: '0px'}, {duration: 500, complete: function(){
						rightPanel.hide();
					}
				});
				
				tabs.animate({right: '0px'},{duration: 500, complete: function(){
						tabs.hide();
					}
				});
				expanded = false;
			});
			
			$(document).mouseup(function(e){
				if(selected){
					asRefreshComments.process();
					$scope.$apply();
					asRefreshComments.position();
				}
				
				selected = false;
				position = 0;
			});
			
			$(document).mousemove(function(e){
				if(expanded && selected){
					var difference = position - e.pageX;
					var newLeftPanelWidth = leftPanelWidth - difference;
					var newRightPanelWidth = rightPanelWidth + difference;
					var newRight = right + difference;
					var docWidth = $(document).width() - 56;
					
					if(newLeftPanelWidth >= leftMinWidth && newRightPanelWidth >= rightMinWidth && newRight >= 0){
						tabs.css("right", newRight);
						leftPanel.width(newLeftPanelWidth);
						rightPanel.width(newRightPanelWidth);
					}
					else if(newRightPanelWidth < rightMinWidth && newRight >= 0){
						rightPanel.width(rightMinWidth);
						leftPanel.width(docWidth-rightMinWidth);
						tabs.css("right", rightMinWidth);
					}
					else if(newLeftPanelWidth < leftMinWidth){
						tabs.css("right", (docWidth - leftMinWidth));
						leftPanel.width(leftMinWidth);
						rightPanel.width((docWidth - leftMinWidth));
					}

					$scope.$broadcast('splitter:resized', leftPanel.width(), rightPanel.width());
				}
			});
			
			var debounced = asDebouncer.debounce(function(){
				asRefreshComments.process();
				$scope.$apply();
				asRefreshComments.position();
			}, 500);
			
			var isFullSize = false;
			
			$(window).resize(function(){
				var docWidth = $(document).width() - 50;
				
				if(expanded && !isFullSize){
					leftPanelWidth = leftPanel.width();
					rightPanelWidth = rightPanel.width();
					
					var newLeftPanelWidth = docWidth-rightPanelWidth;
					
					if(newLeftPanelWidth < leftMinWidth){
						tabs.css("right", (docWidth - leftMinWidth));
						leftPanel.width(leftMinWidth);
						rightPanel.width((docWidth - leftMinWidth));
					}
					else{
						leftPanel.width(newLeftPanelWidth);
					}
				}
				else{
					leftPanel.width(docWidth);
				}

				$scope.$broadcast('splitter:resized', leftPanel.width(), rightPanel.width());
				//debouncedEvent();
				
				debounced();
			});
			
			var saveRightWidth = 0;
			var saveTabsPoition = 0;
			
			$scope.$on('splitter:fullsize', function(){
				if(isFullSize){
					var docWidth = $(document).width() - 50;
					
					leftPanel.width(docWidth-saveRightWidth);
					
					tabs.animate({right: saveTabsPoition}, {duration: 500, complete: function(){
							tabs.show();
						}
					});
					
					rightPanel.animate({width: saveRightWidth + 'px'}, 500);
					isFullSize = false;
					
					debounced();
				}
				else{
					saveRightWidth = rightPanel.width();
					
					var width = $(document).width();
					width -= 50;
				
					rightPanel.animate({width: width + 'px'}, 500);
					
					saveTabsPoition = tabs.css('right');
					
					tabs.hide();
					
					isFullSize = true;
				}
			});
		}]
	};
}]);

app.directive('asSplitterPanel', function() {
	return {
		restrict : 'A',
		require : '^asSplitter',
		link : function(scope, elem, attrs, control) {
			if (attrs.asSplitterPanel == 'left') {
				control.setLeftPanel(elem);
			} else {
				control.setRightPanel(elem);
			}
		}
	};
});

app.directive('asSplitterHandle', function() {
	return {
		restrict : 'AC',
		require : '^asSplitter',
		link : function(scope, elem, attrs, control) {
			elem.addClass('as-splitter-handle');
			control.setHandle(elem);
		}
	};
});

app.directive('asSplitterFullSize', function() {
	return {
		restrict : 'A',
		require : '^asSplitter',
		link : function(scope, elem) {
			var element = angular.element(elem);
			
			element.click(function(){
				scope.$emit('splitter:fullsize');
			});
		}
	};
});

app.directive('asSplitterClose', function() {
	return {
		restrict : 'A',
		require : '^asSplitter',
		link : function(scope, elem) {
			var element = angular.element(elem);
			
			element.click(function(){
				scope.$emit('splitter:close');
			});
		}
	};
});
