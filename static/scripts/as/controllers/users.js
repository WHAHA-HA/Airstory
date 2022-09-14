app.controller('UsersCtrl', ['$scope', '$cookies', 'asWebSocket', function($scope, $cookies, asWebSocket) {
	var usersCtrl = this;
	
	usersCtrl.userId = $cookies.get('as-id-clr');
	
	usersCtrl.users = [];
	usersCtrl.userLookup = {};
	usersCtrl.clazzes = {};
	
	asWebSocket.init(function(){
		var projectUsers = new AsWsResource();
		
		projectUsers.resource = 'ProjectUsers';
		projectUsers.action = 'get';
		projectUsers.key = {
			'id': $scope.projectCtrl.projectId
		};
		
		asWebSocket.send(projectUsers);
	});
	
	asWebSocket.register('UserProject', 'post', function(json){
		if(json.code == '200'){
			var projectUsers = new AsWsResource();
			
			projectUsers.resource = 'ProjectUsers';
			projectUsers.action = 'get';
			projectUsers.key = {
				'id': $scope.projectCtrl.projectId
			};
			
			asWebSocket.send(projectUsers);
		}
	});
	
	asWebSocket.register('ProjectUsers', 'get', function(json){
		if(json.code == '200'){
			usersCtrl.users = json.message.users;
			usersCtrl.userLookup = {};
			usersCtrl.clazzes = {};
			
			for(var y = 0; y < usersCtrl.users.length; y++){
				usersCtrl.userLookup[json.message.users[y].id] = usersCtrl.users[y];
				usersCtrl.users[y].originalPermissions = usersCtrl.users[y].permissions;
			}
			
			$scope.$apply();
		}
	});
	
	asWebSocket.register('UserProject', 'delete', function(json){
		if(json.code == '200'){
			var userId = $cookies.get('as-id-clr');
			
			if(json.key.user_id == userId){
				self.location = '/projects';
			}
			else{
				delete usersCtrl.userLookup[json.key.user_id];
				
				for(var x = 0; x < usersCtrl.users.length; x++){
					if(usersCtrl.users[x].id == json.key.user_id){
						usersCtrl.users.splice(x, 1);
					}
				}
				
				$scope.$apply();
			}
		}
	});
	
	usersCtrl.populateInvitation = function(){
		var userId = $cookies.get('as-id-clr');
		var thisUser = usersCtrl.userLookup[userId];
		
		usersCtrl.invitation = {
				'message': 'Join us, it\'s bliss!',
				'full_name': thisUser.first_name + ' ' + thisUser.last_name,
				'project_name': $scope.projectCtrl.project.title,
				'permissions': 'edit-all'
		};
	};
	
	usersCtrl.addUserToProject = function(){
		var invitation = new AsWsResource();
		
		invitation.resource = 'Invitation';
		invitation.action = 'post';
		invitation.key = {'project_id': $scope.projectCtrl.project.id};
		invitation.message = usersCtrl.invitation;
		
		asWebSocket.send(invitation);

		$('#add-user-modal').modal('hide');
	};

	usersCtrl.selectedUsers = [];
	
	usersCtrl.toggleUserSelection = function(user){
		var idx = usersCtrl.selectedUsers.indexOf(user);

		if (idx > -1) {
			usersCtrl.selectedUsers.splice(idx, 1);
		} 
		else {
			usersCtrl.selectedUsers.push(user);
		}
	};
	
	usersCtrl.userExists = function(user) {
        return usersCtrl.selectedUsers.indexOf(user) > -1;
    };
    
    usersCtrl.removeUsers = function(){
    	for(var x = 0; x < usersCtrl.selectedUsers.length; x++){
	    	var userProject = new AsWsResource();
			
	    	userProject.resource = 'UserProject';
	    	userProject.action = 'delete';
	    	userProject.key = {'project_id': $scope.projectCtrl.project.id, 'user_id': usersCtrl.selectedUsers[x].id};
			
			asWebSocket.send(userProject);
    	}
    	
    	usersCtrl.selectedUsers = [];
    	
		$('#confirm-users-modal').modal('hide');
    };

    usersCtrl.hideManageUserModal = function () {
        $('#manage-user-modal').modal('hide');
    };
    
	asWebSocket.register('Invitations', 'get', function(json){
		if(json.code == '200'){
			usersCtrl.invitations = json.message.invitations;
			
			$scope.$apply();
		}
		else if(json.code == 404){
			usersCtrl.invitations = [];
			
			$scope.$apply();
		}
	});
    
	usersCtrl.populateInvitations = function(){
    	var invitations = new AsWsResource();
		
    	invitations.resource = 'Invitations';
    	invitations.action = 'get';
    	invitations.key = {'project_id': $scope.projectCtrl.project.id};
		
		asWebSocket.send(invitations);
    };
    
    usersCtrl.selectedInvitations = [];
	
    usersCtrl.toggleInvitationSelection = function(invitation){
		var idx = usersCtrl.selectedInvitations.indexOf(invitation);

		if (idx > -1) {
			usersCtrl.selectedInvitations.splice(idx, 1);
		} 
		else {
			usersCtrl.selectedInvitations.push(invitation);
		}
	};
	
    usersCtrl.invitationExists = function(invitation) {
        return usersCtrl.selectedInvitations.indexOf(invitation) > -1;
    };
    
	asWebSocket.register('Invitation', 'delete', function(json){
		if(json.code == '200'){
			for(var x = 0; x < usersCtrl.invitations.length; x++){
				if(usersCtrl.invitations[x].id == json.key.id){
					usersCtrl.invitations.splice(x, 1);
				}
			}
			
			$scope.$apply();
		}
	});
    
	asWebSocket.register('UserProject', 'put', function(json){
		if(json.code == '200'){
			if(json.key.user_id === usersCtrl.userId){
				for(var x = 0; x < $scope.siteCtrl.projects.length; x++){
					if($scope.siteCtrl.projects[x].id === json.key.project_id){
						$scope.siteCtrl.projects[x].permissions = json.message.permissions;
						break;
					}
				}
			}
			
			$scope.$apply();
		}
	});
    
    usersCtrl.removeInvitations = function(){
    	for(var x = 0; x < usersCtrl.selectedInvitations.length; x++){
	    	var invitation = new AsWsResource();
			
	    	invitation.resource = 'Invitation';
	    	invitation.action = 'delete';
	    	invitation.key = {'project_id': $scope.projectCtrl.project.id, 'id': usersCtrl.selectedInvitations[x].id};
			
			asWebSocket.send(invitation);
    	}
    	
    	usersCtrl.selectedInvitations = [];
    	
		$('#confirm-invitations-modal').modal('hide');
    };


    // accepts the action command and returns user friendly message.
    // it will be used in User Management Dropdownbox
    usersCtrl.getPermissionsString = function(permissions) {
        if ('view-all' === permissions ) {
            return 'Can View';
        }
        else if ('comment' === permissions ) {
            return 'Can Comment';
        }
        else if ('cards' === permissions ) {
            return 'Can add cards & images';
        }
        else if ('edit-all' === permissions ) {
            return 'Can edit';
        }
        else if ('admin' === permissions ) {
            return 'Make an administrator';
        }
    };

    // update permissions for users which has a action defined
    usersCtrl.updatePermissions = function(){

        for(var x = 0; x < usersCtrl.users.length; x++){
        	var user = usersCtrl.users[x];

            var userProject = new AsWsResource();
            if (user.permissions && user.originalPermissions !== user.permissions) {
                userProject.resource = 'UserProject';
                userProject.action = 'put';
                userProject.key = {'project_id': $scope.projectCtrl.project.id, 'user_id': user.id};

                userProject.message = {};

                userProject.message.project_id = $scope.projectCtrl.project.id;
                userProject.message.user_id = user.id;
                userProject.message.permissions = user.permissions;
                
                asWebSocket.send(userProject);
                
                user.originalPermissions = user.permissions;
            }
        }

        $('#manage-user-modal').modal('hide');
    };

    // fires when user select 'remove user' in dropdown box, hides the current moal
    // shows the confirmation dialog box modal
    usersCtrl.removeUser = function(user) {
        usersCtrl.selectedUsers = [user];
        usersCtrl.hideManageUserModal();
        $('#confirm-users-modal').modal('show');
    };


    // fires when user select 'remove user' in dropdown box for pending invitation.
    //  hides the current modal and shows the confirmation invitation box modal
    usersCtrl.removeInvitation = function(invitation) {
        usersCtrl.selectedInvitations = [invitation];
        usersCtrl.hideManageUserModal();
        $('#confirm-invitations-modal').modal('show');
    };

}]);