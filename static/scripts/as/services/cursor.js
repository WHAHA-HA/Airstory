app.service('asCursor', function() {
	// Need to take into consideration incoming operations and how they will move the cursor. Perhaps use some of the OTType logic to calculate any changes
	this.getCaretPosition = function(element, op) {
		var ie = typeof document.selection != "undefined" && document.selection.type != "Control" && true;
		var w3 = typeof window.getSelection != "undefined" && true;
		var caretOffset = 0;
		
		if (w3 && window.getSelection().rangeCount) {
			var range = window.getSelection().getRangeAt(0);
			var preCaretRange = range.cloneRange();
			preCaretRange.selectNodeContents(element);
			preCaretRange.setEnd(range.endContainer, range.endOffset);
			caretOffset = preCaretRange.toString().length;
		} else if (ie) {
			var textRange = document.selection.createRange();
			var preCaretTextRange = document.body.createTextRange();
			preCaretTextRange.expand(element);
			preCaretTextRange.setEndPoint("EndToEnd", textRange);
			caretOffset = preCaretTextRange.text.length;
		}
		return caretOffset;
	};

	this.setCaretPos = function(el, sPos) {
		var charIndex = 0, range = document.createRange();
		range.setStart(el, 0);
		range.collapse(true);
		var nodeStack = [ el ], node, foundStart = false, stop = false;

		while (!stop && (node = nodeStack.pop())) {
			if (node.nodeType == 3) {
				var nextCharIndex = charIndex + node.length;
				if (!foundStart && sPos >= charIndex && sPos <= nextCharIndex) {
					range.setStart(node, sPos - charIndex);
					foundStart = true;
				}
				if (foundStart && sPos >= charIndex && sPos <= nextCharIndex) {
					range.setEnd(node, sPos - charIndex);
					stop = true;
				}
				charIndex = nextCharIndex;
			} else {
				var i = node.childNodes.length;
				while (i--) {
					nodeStack.push(node.childNodes[i]);
				}
			}
		}
		selection = window.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	};
});