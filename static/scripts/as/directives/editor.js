app.directive('asEditorTriggerChange', function() {
	return {
		restrict : 'A',
		link : function(scope, elem) {
			element = angular.element(elem);

			element.click(function() {
				scope.$emit('control:change-triggered');
			});
		}
	};
});

app.directive('asEditorControl', function() {
	return {
		restrict : 'A',
		link : function(scope, element) {
			element.click(function() {
				scope.$broadcast('editor:command');
			});
		}
	};
});

//TODO: Move somewhere more relevant
(function(wysihtml5) {
	var INLINE_ELEMENTS = "blockquote, b, big, i, small, tt, abbr, acronym, cite, code, dfn, kbd, strong, samp, var, bdo, br, q, span, sub, button, label, textarea, input, select, u, h1, h2, h3, h4, h5, h6";
	
	function clear(composer, command){
		var nodes = composer.selection.filterElements(function(element){
			if (element.nodeType === 1) {
				if($(element).closest('#document').length){
					if(element.matches(INLINE_ELEMENTS)){
						wysihtml5.dom.unwrap(element);
					} 
					else{
						element.removeAttribute('style');
						element.removeAttribute('class');
					}
				}
				element.normalize();
			}
		});
	}
	
	wysihtml5.commands.clearFormat = {
		exec: function(composer, command) {
			clear(composer, command);
		}
	};
})(wysihtml5);

/**
 * Set font family
 */
(function(wysihtml5) {
	
	wysihtml5.commands.fontFamily = {
		exec : function(composer, command, family) {
			wysihtml5.commands.formatInline.exec(composer, command, {
				styleProperty: 'font-family',
				styleValue: family,
				toggle: true
			});
		},

		state : function(composer, command, family) {
			family = family.trim().replace(/, /g, ",").replaceAll("'", '').replaceAll('"', ""); 
			var fonts = family.split(',');
			
			//var expression = '.*\\b' + fonts[0] + '\\b.*?[^\s].*?,';
			var expression = '.*' + fonts[0] + '[^\\s-].*';
			
			var familyRegEx = new RegExp(expression, 'g');
			
			return wysihtml5.commands.formatInline.state(composer, command, {
				styleProperty: 'font-family',
				styleValue: familyRegEx
			});
		}
	};
})(wysihtml5);

app.directive('asEditor', ['asDebouncer', 'asRefreshCitations', 'asRefreshComments',  'asJmlOT', 'asState', function(asDebouncer, asRefreshCitations, asRefreshComments, asJmlOT, asState){
	return {
		restrict : 'A',
		link : function(scope, element, attr) {
			scope.editor = angular.element(element);
			scope.editor.addClass('as-editor');
			scope.editor.addClass('as-connected-list');

			scope.wysiwyg = new wysihtml5.Editor(scope.editor.attr('id'), {
				toolbar: attr.asEditor,
				parserRules: wysihtml5ParserRules,
				useLineBreaks: false,
				showToolbarDialogsOnSelection: false
			});

			$('.wysihtml5-editor').attr('tabindex', -1);

			scope.editor.on('change', function() {
				scope.$emit('editor:changed', attr.id);
			});

			scope.editor.data('wysiwyg', scope.wysiwyg);

			// Editor lost focus, perhaps to change page
			scope.wysiwyg.on('blur', function() {
				scope.$emit('editor:changed', attr.id);
			});

			scope.wysiwyg.on('show:dialog', function(e) {
				if (e.command == 'insertImage') {
					var iurl = $('#img-url');
					
					scope.documentsCtrl.imgUrl = iurl.val();
					scope.$apply();
					
					var taImg = iurl.get(0);
					taImg.scrollLeft = taImg.scrollWidth; 
				}
				else if (e.command == 'createLink') {
					scope.$broadcast('editor:show-link-dialog');
				}
			});
			
			function dialogStateChanged(){
				if($('[data-wysihtml5-command="insertImage"]').hasClass('wysihtml5-command-dialog-opened') && !$('body').hasClass('image-dialog')){
					$('body').addClass('image-dialog');
				}
				else{
					$('body').removeClass('image-dialog');
				}
			}
			
			scope.wysiwyg.on('show:dialog', function(){
				dialogStateChanged();
			});
			
			scope.wysiwyg.on('save:dialog', function(){
				dialogStateChanged();
			});
			
			scope.wysiwyg.on('cancel:dialog', function(){
				dialogStateChanged();
			});

			// A new word was typed in
			scope.wysiwyg.on('newword:composer', function() {
				scope.$emit('editor:change-triggered', attr.id);
			});
			
			scope.wysiwyg.on('interaction', function() {
				scope.$emit('editor:interaction', attr.id);
			});

			var ignoreKeys = [ 0, 16, 17, 18, 20, 27, 37, 38, 39, 40, 91, 93, 112, 113, 114, 115, 116, 117, 118, 119 ];

			var debouncedDeleteKey = asDebouncer.debounce(function() {
				scope.wysiwyg.cleanUp();
			}, 500);

			scope.editor.keyup(function(e) {
				if (e.keyCode == 8) {
					//TODO: Figure out a way to add this back in without impacting performance
					debouncedDeleteKey();
				}

				if(scope.editor.children().first().length === 0){
					if(scope.editor.contents().length === 0){
						scope.editor.html('<p><br /></p>');
					}
					else{
						scope.editor.contents().wrap('<p></p>');
					}
				}
				
				if (e.which !== 0 && $.inArray(e.which, ignoreKeys) == -1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
					asState.syncEditEnabled = true;
					scope.$emit('editor:keyup', attr.id);
				}
			});
			
			element.on('click', '.as-editor-card-controls .merge', function(){
				$(this).closest('.as-editor-card-handle').contents().unwrap();
				$(this).closest('.as-editor-card').contents().unwrap();
				$(this).closest('.as-editor-card-controls').remove();
			});

			element.on('click', '.as-editor-card-controls .remove', function(){
				$(this).closest('.as-editor-card').remove();
			});
			
			//TODO: move somewhere this makes sense
			scope.editor.keydown(function(event){
				if(event.keyCode == 32 || event.keyCode == 13){
					handleComment(event);
					handleCitation(event);
				}
			});

			function handleCitation(event) {
				var caret = scope.wysiwyg.composer.selection.getSelection();
				var closest = $(caret.focusNode).closest('.citation-ref');

				if (closest.length) {
					var sup = closest.closest('sup');

					var after = $('<span>&nbsp</span>');
					sup.after(after);

					var afterRange = rangy.createRange();

					afterRange.setStartAfter(after[0]);
					afterRange.collapse(true);

					var sel = rangy.getSelection();

					sel.removeAllRanges();

					sel.addRange(afterRange);

					if (event.keyCode == 32) {
						event.preventDefault();
					}
				}
			}

			function handleComment(event) {
				var caret = scope.wysiwyg.composer.selection.getSelection();
				var closest = $(caret.focusNode).closest('[data-link]');

				if (closest.length) {
					var sel = rangy.getSelection();
					var getrange = sel.getRangeAt(0);

					var placeholder = $('<span id="as-last-check-placeholder"></span>');

					getrange.insertNode(placeholder[0]);

					var last = closest;
					var checkLast = false;

					do {
						last = last.contents().last();

						if (last.attr('id') == placeholder.attr('id')) {
							checkLast = true;
							break;
						}
					} while (last.children().length);

					if (checkLast) {
						var lastSpan = $('<span>&nbsp</span>');

						closest.after(lastSpan);

						var lastRange = rangy.createRange();

						lastRange.setStartAfter(lastSpan[0]);
						lastRange.collapse(true);

						sel.removeAllRanges();

						sel.addRange(lastRange);

						if (event.keyCode == 32) {
							event.preventDefault();
						}
					} else {
						var first = closest;
						var checkFirst = false;

						do {
							first = first.contents().first();

							if (first.attr('id') == placeholder.attr('id')) {
								checkFirst = true;
								break;
							}
						} while (first.children().length);

						if (checkFirst) {
							var firstSpan = $('<span>&nbsp</span>');

							closest.before(firstSpan);

							var firstRange = rangy.createRange();

							firstRange.setStartAfter(firstSpan[0]);
							firstRange.setEndAfter(firstSpan[0]);
							firstRange.collapse(true);

							sel.removeAllRanges();

							sel.addRange(firstRange);

							if (event.keyCode == 32) {
								event.preventDefault();
							}
						}
					}

					placeholder.remove();
				}
			}

			// One of the controls with "asEditorTriggerChange" was clicked
			scope.$on('control:change-triggered', function() {
				scope.$emit('editor:change-triggered', attr.id);
			});

			scope.wysiwyg.on('beforecommand:composer', function() {
				scope.$broadcast('editor:command');
			});

			scope.editor.sortable({
				handle : '.as-editor-card-handle',
				items : ':not(.as-editor-card-handle *, .as-editor-card-handle)',
				stop: function(event, ui) {
					asRefreshCitations.process();
					scope.documentCtrl.interaction();
					scope.$apply();
				}
			});
		}
	};
} ]);


var wysihtml5ParserRulesDefaults = {
	"blockLevelEl" : {
		"keep_styles" : {
			"textAlign" : /^((left)|(right)|(center)|(justify))$/i,
			"float" : 1
		},
		"add_style" : {
			"align" : "align_text"
		},
		"check_attributes" : {
			"id" : "any"
		}
	},

	"makeParagraph" : {
		"rename_tag" : "p",
		"one_of_type" : {
			"alignment_object" : 1
		},
		"remove_action" : "unwrap",
		"keep_styles" : {
			"textAlign" : 1,
			"float" : 1
		},
		"add_style" : {
			"align" : "align_text"
		},
		"check_attributes" : {
			"id" : "any"
		}
	}
};

var wysihtml5ParserRules = {
	/**
	 * CSS Class white-list Following CSS classes won't be removed when parsed
	 * by the wysihtml5 HTML parser If all classes should pass "any" as classes
	 * value. Ex: "classes": "any"
	 */
	"classes" : "any",

	"attributes" : {
		"data-meta" : "any"
	},

	/* blacklist of classes is only available if classes is set to any */
	"classes_blacklist" : {
		"Apple-interchange-newline" : 1,
		"MsoNormal" : 1,
		"MsoPlainText" : 1
	},

	"type_definitions" : {

		"alignment_object" : {
			"classes" : {
				"wysiwyg-text-align-center" : 1,
				"wysiwyg-text-align-justify" : 1,
				"wysiwyg-text-align-left" : 1,
				"wysiwyg-text-align-right" : 1,
				"wysiwyg-float-left" : 1,
				"wysiwyg-float-right" : 1
			},
			"styles" : {
				"float" : [ "left", "right" ],
				"text-align" : [ "left", "right", "center" ]
			}
		},
        
        "card_object": {
            "classes": {
                "as-editor-card": 1,
                "as-editor-card-handle": 1,
                "as-editor-card-controls": 1
            }
        },

		"valid_image_src" : {
			"attrs" : {
				"src" : /^[^data\:]/i
			}
		},

		"comment_object" : {
			"attrs" : {
				"data-link" : /.*/i
			}
		},

		"text_color_object" : {
			"styles" : {
				"color" : true,
				"background-color" : true
			}
		},

		"text_fontsize_object" : {
			"styles" : {
				"font-size" : true
			}
		},

		"text_fontfamily_object" : {
			"styles" : { 
				"font-family" : true
			}
		},

		"text_formatting_object" : {
			"classes" : {
				"wysiwyg-color-aqua" : 1,
				"wysiwyg-color-black" : 1,
				"wysiwyg-color-blue" : 1,
				"wysiwyg-color-fuchsia" : 1,
				"wysiwyg-color-gray" : 1,
				"wysiwyg-color-green" : 1,
				"wysiwyg-color-lime" : 1,
				"wysiwyg-color-maroon" : 1,
				"wysiwyg-color-navy" : 1,
				"wysiwyg-color-olive" : 1,
				"wysiwyg-color-purple" : 1,
				"wysiwyg-color-red" : 1,
				"wysiwyg-color-silver" : 1,
				"wysiwyg-color-teal" : 1,
				"wysiwyg-color-white" : 1,
				"wysiwyg-color-yellow" : 1,
				"wysiwyg-font-size-large" : 1,
				"wysiwyg-font-size-larger" : 1,
				"wysiwyg-font-size-medium" : 1,
				"wysiwyg-font-size-small" : 1,
				"wysiwyg-font-size-smaller" : 1,
				"wysiwyg-font-size-x-large" : 1,
				"wysiwyg-font-size-x-small" : 1,
				"wysiwyg-font-size-xx-large" : 1,
				"wysiwyg-font-size-xx-small" : 1
			}
		}
	},

	"comments" : 0, // if set allows comments to pass

	/**
	 * Tag list
	 * 
	 * The following options are available:
	 *  - add_class: converts and deletes the given HTML4 attribute (align,
	 * clear, ...) via the given method to a css class The following methods are
	 * implemented in wysihtml5.dom.parse: - align_text: converts align
	 * attribute values (right/left/center/justify) to their corresponding css
	 * class "wysiwyg-text-align-*")
	 * <p align="center">
	 * foo
	 * </p>
	 * ... becomes ...
	 * <p>
	 * class="wysiwyg-text-align-center">foo
	 * </p> - clear_br: converts clear attribute values left/right/all/both to
	 * their corresponding css class "wysiwyg-clear-*" <br clear="all">
	 * ... becomes ... <br class="wysiwyg-clear-both"> - align_img: converts
	 * align attribute values (right/left) on <img> to their corresponding css
	 * class "wysiwyg-float-*"
	 *  - remove: removes the element and its content
	 *  - unwrap removes element but leaves content
	 *  - rename_tag: renames the element to the given tag
	 *  - set_class: adds the given class to the element (note: make sure that
	 * the class is in the "classes" white list above)
	 *  - set_attributes: sets/overrides the given attributes
	 *  - check_attributes: checks the given HTML attribute via the given method -
	 * url: allows only valid urls (starting with http:// or https://) - src:
	 * allows something like "/foobar.jpg", "http://google.com", ... - href:
	 * allows something like "mailto:bert@foo.com", "http://google.com",
	 * "/foobar.jpg" - alt: strips unwanted characters. if the attribute is not
	 * set, then it gets set (to ensure valid and compatible HTML) - numbers:
	 * ensures that the attribute only contains numeric (integer) characters (no
	 * float values or units) - dimension: for with/height attributes where
	 * floating point numbrs and percentages are allowed - any: allows anything
	 * to pass
	 */
	"tags" : {
		"tr" : {
			"add_style" : {
				"align" : "align_text"
			},
			"check_attributes" : {
				"id" : "any"
			}
		},
		"strike" : {
			"unwrap" : 1
		},
		"form" : {
			"unwrap" : 1
		},
		"rt" : {
			"rename_tag" : "span"
		},
		"code" : {},
		"acronym" : {
			"rename_tag" : "span"
		},
		"br" : {
			"add_class" : {
				"clear" : "clear_br"
			}
		},
		"details" : {
			"unwrap" : 1
		},
		"h4" : wysihtml5ParserRulesDefaults.blockLevelEl,
		"em" : {
			"one_of_type" : {
				"comment_object" : 1
			},
			"check_attributes" : {
				"data-link" : "any",
				"data-type" : "any"
			}
		},
		"title" : {
			"remove" : 1
		},
		"multicol" : {
			"unwrap" : 1
		},
		"figure" : {
			"unwrap" : 1
		},
		"xmp" : {
			"unwrap" : 1
		},
		"small" : {
			"rename_tag" : "span",
			"set_class" : "wysiwyg-font-size-smaller"
		},
		"area" : {
			"remove" : 1
		},
		"time" : {
			"unwrap" : 1
		},
		"dir" : {
			"rename_tag" : "ul"
		},
		"bdi" : {
			"unwrap" : 1
		},
		"command" : {
			"unwrap" : 1
		},
		"ul" : {
			"check_attributes" : {
				"id" : "any"
			}
		},
		"progress" : {
			"rename_tag" : "span"
		},
		"dfn" : {
			"unwrap" : 1
		},
		"iframe" : {
			"check_attributes" : {
				"src" : "any",
				"width" : "any",
				"height" : "any",
				"frameborder" : "any",
				"style" : "any",
				"id" : "any"
			}
		},
		"figcaption" : {
			"unwrap" : 1
		},
		"a" : {
			"check_attributes" : {
				"href" : "href", // if you compiled master manually then
									// change this from 'url' to 'href'
				"rel" : "any",
				"target" : "any",
				"id" : "any",
				"data-ref-id" : "any",
				"data-id" : "any"
			}
		},
		"img" : {
			"one_of_type" : {
				"valid_image_src" : 1
			},
			"check_attributes" : {
				"width" : "dimension",
				"alt" : "alt",
				"src" : "src", // if you compiled master manually then change
								// this from 'url' to 'src'
				"height" : "dimension",
				"id" : "any"
			},
			"add_class" : {
				"align" : "align_img"
			}
		},
		"rb" : {
			"unwrap" : 1
		},
		"footer" : wysihtml5ParserRulesDefaults.makeParagraph,
		"noframes" : {
			"remove" : 1
		},
		"abbr" : {
			"unwrap" : 1
		},
		"u" : {},
		"bgsound" : {
			"remove" : 1
		},
		"sup" : {},
		"address" : {
			"unwrap" : 1
		},
		"basefont" : {
			"remove" : 1
		},
		"nav" : {
			"unwrap" : 1
		},
		"h1" : wysihtml5ParserRulesDefaults.blockLevelEl,
		"head" : {
			"unwrap" : 1
		},
		"tbody" : wysihtml5ParserRulesDefaults.blockLevelEl,
		"dd" : {
			"unwrap" : 1
		},
		"s" : {
			"unwrap" : 1
		},
		"li" : {},
		"td" : {
			"check_attributes" : {
				"rowspan" : "numbers",
				"colspan" : "numbers",
				"valign" : "any",
				"align" : "any",
				"id" : "any",
				"class" : "any"
			},
			"keep_styles" : {
				"backgroundColor" : 1,
				"width" : 1,
				"height" : 1
			},
			"add_style" : {
				"align" : "align_text"
			}
		},
		"object" : {
			"remove" : 1
		},

		"div" : {
			"one_of_type" : {
                "card_object": 1
			},
			"remove_action" : "rename",
			"remove_action_rename_to" : "p",
			"keep_styles" : {
				"textAlign" : 1,
				"float" : 1
			},
			"add_style" : {
				"align" : "align_text"
			},
			"check_attributes" : {
				"id" : "any",
				"contenteditable" : "any",
				"ref" : "any",
				"card-title" : "any",
				"status" : "any",
				"type" : "any",
				"caption" : "any"
			}
		},

		"option" : {
			"remove" : 1
		},
		"select" : {
			"remove" : 1
		},
		"i" : {},
		"track" : {
			"remove" : 1
		},
		"wbr" : {
			"remove" : 1
		},
		"fieldset" : {
			"unwrap" : 1
		},
		"big" : {
			"rename_tag" : "span",
			"set_class" : "wysiwyg-font-size-larger"
		},
		"button" : {
			"unwrap" : 1
		},
		"noscript" : {
			"remove" : 1
		},
		"svg" : {
			"remove" : 1
		},
		"input" : {
			"remove" : 1
		},
		"table" : {
			"keep_styles" : {
				"width" : 1,
				"textAlign" : 1,
				"float" : 1
			},
			"check_attributes" : {
				"id" : "any"
			}
		},
		"keygen" : {
			"remove" : 1
		},
		"h5" : wysihtml5ParserRulesDefaults.blockLevelEl,
		"meta" : {
			"remove" : 1
		},
		"map" : {
			"remove" : 1
		},
		"isindex" : {
			"remove" : 1
		},
		"mark" : {
			"one_of_type" : {
				"comment_object" : 1
			},
			"check_attributes" : {
				"data-link" : "any",
				"data-type" : "any"
			}
		},
		"caption" : wysihtml5ParserRulesDefaults.blockLevelEl,
		"tfoot" : wysihtml5ParserRulesDefaults.blockLevelEl,
		"base" : {
			"remove" : 1
		},
		"video" : {
			"remove" : 1
		},
		"strong" : {},
		"canvas" : {
			"remove" : 1
		},
		"output" : {
			"unwrap" : 1
		},
		"marquee" : {
			"unwrap" : 1
		},
		"b" : {},
		"q" : {
			"check_attributes" : {
				"cite" : "url",
				"id" : "any"
			}
		},
		"applet" : {
			"remove" : 1
		},
		"span" : {
			"one_of_type" : {
				"text_formatting_object" : 1,
				"text_color_object" : 1,
				"text_fontsize_object" : 1,
				"text_fontfamily_object" : 1,
				"fa_object" : 1,
				"comment_object" : 1
			},

			"keep_styles" : {
				"color" : 1,
				"fontSize" : 1,
				"fontFamily" : 1
			},
			"remove_action" : "unwrap",
			"check_attributes" : {
				"id" : "any",
				"data-link" : "any",
				"data-type" : "any"
			}
		},
		"rp" : {
			"unwrap" : 1
		},
		"spacer" : {
			"remove" : 1
		},
		"source" : {
			"remove" : 1
		},
		"aside" : wysihtml5ParserRulesDefaults.makeParagraph,
		"frame" : {
			"remove" : 1
		},
		"section" : wysihtml5ParserRulesDefaults.makeParagraph,
		"body" : {
			"unwrap" : 1
		},
		"ol" : {},
		"nobr" : {
			"unwrap" : 1
		},
		"html" : {
			"unwrap" : 1
		},
		"summary" : {
			"unwrap" : 1
		},
		"var" : {
			"unwrap" : 1
		},
		"del" : {
			"unwrap" : 1
		},
		"blockquote" : {
			"keep_styles" : {
				"textAlign" : 1,
				"float" : 1
			},
			"add_style" : {
				"align" : "align_text"
			},
			"check_attributes" : {
				"cite" : "url",
				"id" : "any"
			}
		},
		"style" : {
			"check_attributes" : {
				"type" : "any",
				"src" : "any",
				"charset" : "any"
			}
		},
		"device" : {
			"remove" : 1
		},
		"meter" : {
			"unwrap" : 1
		},
		"h3" : wysihtml5ParserRulesDefaults.blockLevelEl,
		"textarea" : {
			"unwrap" : 1
		},
		"embed" : {
			"remove" : 1
		},
		"hgroup" : {
			"unwrap" : 1
		},
		"font" : {
			"rename_tag" : "span",
			"add_class" : {
				"size" : "size_font"
			}
		},
		"tt" : {
			"unwrap" : 1
		},
		"noembed" : {
			"remove" : 1
		},
		"thead" : {
			"add_style" : {
				"align" : "align_text"
			},
			"check_attributes" : {
				"id" : "any"
			}
		},
		"blink" : {
			"unwrap" : 1
		},
		"plaintext" : {
			"unwrap" : 1
		},
		"xml" : {
			"remove" : 1
		},
		"h6" : wysihtml5ParserRulesDefaults.blockLevelEl,
		"param" : {
			"remove" : 1
		},
		"th" : {
			"check_attributes" : {
				"rowspan" : "numbers",
				"colspan" : "numbers",
				"valign" : "any",
				"align" : "any",
				"id" : "any"
			},
			"keep_styles" : {
				"backgroundColor" : 1,
				"width" : 1,
				"height" : 1
			},
			"add_style" : {
				"align" : "align_text"
			}
		},
		"legend" : {
			"unwrap" : 1
		},
		"hr" : {},
		"label" : {
			"unwrap" : 1
		},
		"dl" : {
			"unwrap" : 1
		},
		"kbd" : {
			"unwrap" : 1
		},
		"listing" : {
			"unwrap" : 1
		},
		"dt" : {
			"unwrap" : 1
		},
		"nextid" : {
			"remove" : 1
		},
		"pre" : {},
		"center" : wysihtml5ParserRulesDefaults.makeParagraph,
		"audio" : {
			"remove" : 1
		},
		"datalist" : {
			"unwrap" : 1
		},
		"samp" : {
			"unwrap" : 1
		},
		"col" : {
			"remove" : 1
		},
		"article" : wysihtml5ParserRulesDefaults.makeParagraph,
		"cite" : {},
		"link" : {
			"remove" : 1
		},
		"script" : {
			"check_attributes" : {
				"type" : "any",
				"src" : "any",
				"charset" : "any"
			}
		},
		"bdo" : {
			"unwrap" : 1
		},
		"menu" : {
			"rename_tag" : "ul"
		},
		"colgroup" : {
			"remove" : 1
		},
		"ruby" : {
			"unwrap" : 1
		},
		"h2" : wysihtml5ParserRulesDefaults.blockLevelEl,
		"ins" : {
			"unwrap" : 1
		},
		"p" : wysihtml5ParserRulesDefaults.blockLevelEl,
		"sub" : {},
		"comment" : {
			"remove" : 1
		},
		"frameset" : {
			"remove" : 1
		},
		"optgroup" : {
			"unwrap" : 1
		},
		"header" : wysihtml5ParserRulesDefaults.makeParagraph
	}
};

(function() {
	// Paste cleanup rules universal for all rules (also applied to content
	// copied from editor)
	var commonRules = wysihtml5.lang.object(wysihtml5ParserRules).clone(true);
	commonRules.comments = false;
	commonRules.selectors = {
		"a u" : "unwrap"
	};
	commonRules.tags.style = {
		"remove" : 1
	};
	commonRules.tags.script = {
		"remove" : 1
	};
	commonRules.tags.head = {
		"remove" : 1
	};

	// Paste cleanup for unindentified source
	var universalRules = wysihtml5.lang.object(commonRules).clone(true);
	universalRules.tags.div.one_of_type.alignment_object = 1;
	universalRules.tags.div.remove_action = "unwrap";
	universalRules.tags.div.check_attributes.style = false;
	universalRules.tags.div.keep_styles = {
		"textAlign" : /^((left)|(right)|(center)|(justify))$/i,
		"float" : 1
	};
	universalRules.tags.span.keep_styles = false;

	// Paste cleanup for MS Office
	// TODO: should be extended to stricter ruleset, as current set will
	// probably not cover all Office bizarreness
	var msOfficeRules = wysihtml5.lang.object(universalRules).clone(true);
	msOfficeRules.classes = {};

	window.wysihtml5ParserPasteRulesets = [ {
		condition : /<font face="Times New Roman"|class="?Mso|style="[^"]*\bmso-|style='[^'']*\bmso-|w:WordDocument|class="OutlineElement|id="?docs\-internal\-guid\-/i,
		set : msOfficeRules
	}, {
		condition : /<meta name="copied-from" content="wysihtml5">/i,
		set : commonRules
	}, {
		set : universalRules
	} ];

})();
