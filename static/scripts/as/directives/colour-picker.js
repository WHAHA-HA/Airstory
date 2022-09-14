app.directive('asColourPicker', function() {
	return {
		restrict : 'A',
		link : function(scope, elem) {
			element = angular.element(elem);

			scope.colourPickerParent = element;
		}
	};
});

app.directive('asColourPickerControl', function() {
	var store = wysihtml5.commands.foreColorStyle.state;
	
	return {
		restrict : 'A',
		link : function(scope, element) {

			scope.colourPickerControl = element;

			element.minicolors({
				inline : true,
		        position: 'top right',
				theme : 'bootstrap',
				change : function(value, opacity) {
					$('#font-colour .fa-font').css('color', value);
					$('#font-colour .fa-font').css('border-bottom', '2px solid ' + value);
				}
			});

			// Could not find a direct way to get the colour value of the items selected in the editor, so monkey patching
			wysihtml5.commands.foreColorStyle.state = function(composer, command, color) {
				var st = store(composer, command, color);

				if (st && wysihtml5.lang.object(st).isArray()) {
					st = st[0];
				}

				if (st) {
					var colorStr = st.getAttribute("style");
					if (colorStr) {
						var rgbArr = wysihtml5.quirks.styleParser.parseColor(colorStr, "color");
						var hex = rgb2hex(rgbArr);

						$('#font-colour .fa-font').css('color', hex);
						$('#font-colour .fa-font').css('border-bottom', '2px solid ' + hex);
						element.minicolors('value', hex);
					}
				} else {
					$('#font-colour .fa-font').css('color', '#000000');
					$('#font-colour .fa-font').css('border-bottom', '2px solid #000000');
					element.minicolors('value', '#000000');
				}

				return st;
			};

			function rgb2hex(rgb) {
				if(rgb){
					return "#" + rgb[0].toString(16) + rgb[1].toString(16) + rgb[2].toString(16);
				}
				else{
					return rgb;
				}
			}
		}
	};
});

app.directive('asColourPickerSave', function() {
	return {
		restrict : 'A',
		link : function(scope, elem, attr) {
			element = angular.element(elem);

			element.mousedown(function(e) {
				$(attr.asColourPickerSave).data('wysiwyg').composer.commands.exec('foreColorStyle', scope.colourPickerControl.val());
				scope.colourPickerParent.removeClass('open');
				scope.$broadcast('control:change-triggered');

				e.stopPropagation();
				return false;
			});
		}
	};
});

app.directive('asColourPickerRemove', function() {
	return {
		restrict : 'A',
		link : function(scope, elem, attr) {
			element = angular.element(elem);

			element.mousedown(function(e) {
				$(attr.asColourPickerRemove).data('wysiwyg').composer.commands.remove('foreColorStyle');
				scope.colourPickerParent.removeClass('open');
				scope.$broadcast('control:change-triggered');

				e.stopPropagation();
				return false;
			});
		}
	};
});

app.directive('asColourPickerClose', function() {
	return {
		restrict : 'A',
		link : function(scope, elem, attr) {
			element = angular.element(elem);

			element.mousedown(function(e) {
				scope.colourPickerParent.removeClass('open');

				e.stopPropagation();
				return false;
			});
		}
	};
});