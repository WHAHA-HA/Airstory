app.controller('LibraryImagesCtrl', ['$scope', '$cookies', '$sce', 'asWebSocket', 'asURL', 'asCloudinary', 'asUniqueId', 'asJmlOT', function($scope, $cookies, $sce, asWebSocket, asURL, asCloudinary, asUniqueId, asJmlOT){
	$('#drawer-tabs .tab').removeClass('active');
	$('#drawer-tabs .tab.library').addClass('active');
	
	var imagesCtrl = this;

	imagesCtrl.type = 'all';
	
	imagesCtrl.requestId = asUniqueId;
	
	baseImgCtrl(imagesCtrl, $scope, $cookies, $sce, asWebSocket, asURL, asCloudinary, asJmlOT);
}]);


app.controller('ProjectImagesCtrl', ['$scope', '$cookies', '$sce', 'asWebSocket', 'asURL', 'asCloudinary', 'asUniqueId', 'asJmlOT', function($scope, $cookies, $sce, asWebSocket, asURL, asCloudinary, asUniqueId, asJmlOT){
	$('#drawer-tabs .tab').removeClass('active');
	$('#drawer-tabs .tab.project').addClass('active');

	var imagesCtrl = this;

	imagesCtrl.type = 'project';
	imagesCtrl.requestId = asUniqueId;
	
	baseImgCtrl(imagesCtrl, $scope, $cookies, $sce, asWebSocket, asURL,asCloudinary, asJmlOT);
}]);

app.controller('PrivateImagesCtrl', ['$scope', '$cookies', '$sce', 'asWebSocket', 'asURL', 'asCloudinary', 'asUniqueId', 'asJmlOT', function($scope, $cookies, $sce, asWebSocket, asURL, asCloudinary, asUniqueId, asJmlOT){
	$('#drawer-tabs .tab').removeClass('active');
	$('#drawer-tabs .tab.private').addClass('active');
	
	var imagesCtrl = this;
	
	imagesCtrl.type = 'user';
	imagesCtrl.requestId = asUniqueId;
	
	baseImgCtrl(imagesCtrl, $scope, $cookies, $sce, asWebSocket, asURL, asCloudinary, asJmlOT);
}]);

function baseImgCtrl(imagesCtrl, $scope, $cookies, $sce, asWebSocket, asURL, asCloudinary, asJmlOT){	
	imagesCtrl.userId = $cookies.get('as-id-clr');
	
	imagesCtrl.select = self.location.hash.substring(1);
	
	if(!imagesCtrl.select){
		imagesCtrl.select = '/images/library';
	}
	
	if(!$('body').hasClass('image-drawer')){
		$('body').addClass('image-drawer');
	}
	
	var urlSegments = asURL.segment();
	imagesCtrl.projectId = urlSegments[1];
	
	imagesCtrl.images = [];
	imagesCtrl.image = {};
	imagesCtrl.loading = {};
	
	imagesCtrl.refId = imagesCtrl.projectId;
	
	//If not in a project, save all notes to private
	if(imagesCtrl.type == 'user' || !imagesCtrl.projectId){
		imagesCtrl.refId = imagesCtrl.userId;
	}

	$('.as-set-to-body').remove();
	
	asWebSocket.register('Images', 'get', function(json){
		if(json.code == '200'){
			var saveTransitionDuration = 0;
			var saveScrollTop = 0;
			if(asWebSocket.reconnecting){
				//if reconnecting, save scrolling position so there is no impact to the user
				saveScrollTop = $('[data-as-splitter-panel="right"]').scrollTop();
			}
			
			//Append if this is from "more notes" (pagination)
			if(json.attributes.display_option == 'append'){
				imagesCtrl.images = imagesCtrl.images.concat(json.message.images);
			}
			else{
				imagesCtrl.images = json.message.images;
			}
			
			imagesCtrl.nextStart = json.message.next_start;
			
			$scope.$apply();
			
			if(asWebSocket.reconnecting){
				$('[data-as-splitter-panel="right"]').scrollTop(saveScrollTop);
			}
		}
		else{
			imagesCtrl.nextStart = null;
			if(json.attributes.display_option != 'append'){
				imagesCtrl.images = [];
			}
			$scope.$apply();
		}
	});

	asWebSocket.register('Images', 'post', function(json){
		if(json.code == '204'){
			//Check if the user is in the current tab (private, project or library). If so, update
			if(json.key.ref_id == imagesCtrl.refId || imagesCtrl.type == 'all'){
				if(imagesCtrl.images && imagesCtrl.images.length > 0){
					for(var x = 0; x < json.message.images.length; x++){
						//Add to the beginning of the list
						imagesCtrl.images.unshift(json.message.images[x]);
					}
				}
				else{
					imagesCtrl.images = json.message.images;
				}
			}
			
			$scope.$apply();
		}
	});

	asWebSocket.register('Image', 'put', function(json){
		if(json.code == '200'){
			//Check if the user is in the current tab (private, project or library). If so, update
			if(json.key.ref_id == imagesCtrl.refId || imagesCtrl.type == 'all'){
				for(var x = 0; x < imagesCtrl.images.length; x++){
					var image = imagesCtrl.images[x];
					
					if(image.ref_id === json.key.ref_id && image.id === json.key.id){
						imagesCtrl.images[x] = json.message;
						
						break;
					}
				}
			}
			
			$scope.$apply();
		}
	});


	asWebSocket.register('Image', 'post', function(json){
		if(json.code == '200'){
			//Check if the user is in the current tab (private, project or library). If so, update
			if(json.key.ref_id == imagesCtrl.refId || imagesCtrl.type == 'all'){
				if(imagesCtrl.images && imagesCtrl.images.length > 0){
					imagesCtrl.images.unshift(json.message);
				}
				else{
					imagesCtrl.images = [json.message];
				}
			}

			if(imagesCtrl.requestId == json.attributes.request_id){
				if(json.attributes.reason === 'imagemove'){
					var image = new AsWsResource();
					
					image.resource = 'Image';
					image.action = 'delete';
					image.key = {'ref_id': json.attributes.copied_ref_id, 'id': json.attributes.copied_id};
					image.attributes = {'reason': 'imagemove', 'request_id': imagesCtrl.requestId};
					
					asWebSocket.send(image);
				}
				else{
					imagesCtrl.loading.clazz = ['alert', 'alert-success'];
					imagesCtrl.loading.msg = 'Successfully copied image';
					
					$scope.$apply();
				}
			}
			else{
				$scope.$apply();
			}
		}
	});

	asWebSocket.register('Image', 'delete', function(json){
		if(json.code == '200'){
			if(json.key.ref_id == imagesCtrl.refId || imagesCtrl.type == 'all'){
				for(var x = 0; x < imagesCtrl.images.length; x++){
					if(imagesCtrl.images[x].id == json.key.id){
						imagesCtrl.images.splice(x, 1);
						
						break;
					}
				}
			}

			if(imagesCtrl.requestId == json.attributes.request_id){
				imagesCtrl.loading.clazz = ['alert', 'alert-success'];
				imagesCtrl.loading.msg = 'Successfully moved image';
			}
			
			$scope.$apply();
		}
	});
		
	function init(){
		var images = new AsWsResource();

		images.resource = 'Images';
		images.action = 'get';
		
		if(imagesCtrl.type != 'all'){
			images.key = {"ref_id": imagesCtrl.refId};
		}

		asWebSocket.send(images);
	}
		
	init();
	
	$scope.$on('editor:drop', function(e, i){
		if(i.id.indexOf('i') === 0){
			var image = null;
			
			for(var x = 0; x < imagesCtrl.images.length; x++){
				if(imagesCtrl.images[x].id == i.id){
					image = imagesCtrl.images[x];
					break;
				}
			}
			
			var imageHtml = $('<p></p>').append($('<img />').attr('src', asCloudinary.buildUrl(image.id + '/' + image.name)));
			 
			imageHtml.prepend('<div class="as-editor-card-controls"><a class="merge"><i class="fa fa-check-circle"></i></a> <a class="remove"><i class="fa fa-trash"></i></a></div>');

			if(i.destination === 'e'){
				var imageElem = $('#' + image.id);
				imageElem.find('.as-editor-card-handle').html(imageHtml);
				imageElem.attr('ref', image.ref_id + '|' + image.id);
				if(image.caption){
					imageElem.attr('caption', image.caption);
				}
				imageElem.removeAttr('id');
				
				$('#document').trigger('change');
			}
			else{
				var path = [];
				var element = asJmlOT.ctrl.findElementByTypeAndID(asJmlOT.doc.snapshot, 'DIV', image.id, path);
				
				var batch = [];
				
				var idPath = clone(path);
				idPath.push(1);
				idPath.push('id');
				
				var idOp = asJmlOT.doc.removeAt(idPath, batch);
				idOp = asJmlOT.ctrl.adjust(idOp);
				
				window.jsonml0.apply(asJmlOT.ctrl.outline, idOp);	
				
				if(image.caption){
					var captionPath = clone(path);
					captionPath.push(1);
					captionPath.push('caption');
					
					var captionOp = asJmlOT.doc.setAt(captionPath, image.caption, batch);
					captionOp = asJmlOT.ctrl.adjust(captionOp);
					
					window.jsonml0.apply(asJmlOT.ctrl.outline, captionOp);
				}

				path.push(2);
				path.push(2);
				
				var html = $('<div>').append(imageHtml.clone()).html();
				
				var op = asJmlOT.doc.setAt(path, JsonML.fromHTMLText(html), batch);
				op = asJmlOT.ctrl.adjust(op);
				
				window.jsonml0.apply(asJmlOT.ctrl.outline, op);	
				
				asJmlOT.client.applyClient(batch);
				
				$scope.$apply();
			}
		}
	});
	
	imagesCtrl.displayLockedStatus = function(state){
		if(state === 'locked'){
			return $sce.trustAsHtml('Locked <span class="fa fa-lock"></span>');
		}
		else{
			return $sce.trustAsHtml('Unlocked  <span class="fa fa-unlock"></span>');
		}
	};
}