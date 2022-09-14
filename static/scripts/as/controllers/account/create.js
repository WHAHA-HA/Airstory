app.controller('CreateCtrl', ['$scope', '$http', '$cookies', 'asURL', 'asUniqueId', function($scope, $http, $cookies, asURL, asUniqueId){
	$scope.msg = '';
	$scope.processing = false;

	var goTo = "/projects";

	$scope.createAccount = function() {
		$scope.processing = true;
		$http.post('/v1/users', $scope.user).then(function(response) {
			var q = asURL.search(true);

			if (q && q.next) {
				goTo = q.next;
			}

			auth();
		}, function(response) {
			$scope.processing = false;
			if (response.status == 400) {
				$scope.msg = 'This email address has already been used';
			} else {
				$scope.msg = 'Server error, please try again later';
			}
		});
	};

	function auth() {
		$http.post('/v1/users/' + $scope.user.email + '/authenticate', $scope.user.password).then(function(response) {
			createProject();
		}, function(response) {
			var q = asURL.search();

			if (q) {
				self.location = '/login' + q;
			} else {
				self.location = '/login';
			}
		});
	}

	function createProject() {
		var project = {
			'title' : 'Sample Project',
			'description' : 'Use this sample project to play around with Airstory. Click on this project to start work on a document. Feel free to delete at any time, it won\'t hurt our feelings...much...'
		};

		$http.post('/v1/projects', project).then(function(response) {
			var projectId = response.headers('Link');
			createDocument(projectId);
		}, function(response) {
			self.location = goTo;
		});
	}

	function createDocument(projectId) {
		var document = {
			'project_id' : projectId,
			'title' : 'document'
		};

		$http.post('/v1/documents', document).then(function(response) {
			var documentId = response.headers('Link');
			createOT(projectId, documentId);
		}, function(response) {
			self.location = goTo;
		});
	}

	function createOT(projectId, documentId) {
		var create = {
			'open' : true,
			'create' : true
		};
		$http.post('/v1/projects/' + projectId + '/ot/' + documentId, create).then(function(response) {
			updateDocument(projectId, documentId);
		}, function(response) {
			self.location = goTo;
		});

	}

	function updateDocument(projectId, documentId) {
		var ops = {
			'op' : [ {
				'p' : [ 0 ],
				'li' : 'DIV'
			}, {
				'p' : [ 1 ],
				'li' : [ 'P', 'Type in here as you would any other document. Click on the "tab" to the right to see your notes.' ]
			}, {
				'p' : [ 2 ],
				'li' : [ 'P', 'Create multiple documents in this project by clicking the "+" button below' ]
			} ],
			'v' : 0
		};

		var req = {
			method : 'PATCH',
			url : '/v1/projects/' + projectId + '/ot/' + documentId,
			headers : {
				'request_id' : asUniqueId
			},
			data : ops
		};

		$http(req).then(function(response) {
			createNote(projectId);
		}, function(response) {
			self.location = goTo;
		});

	}

	function createNote(projectId) {
		var note = {
			'title' : 'Sample Project Note',
			'content' : 'This is a project note. It is visible to everybody who is a part of your project. Drag this note around and drop it into a document. Go ahead, we know you want to!'
		};

		$http.post('/v1/notes/' + projectId, note).then(function(response) {
			var note = {
				'title' : 'Sample Private Note',
				'content' : 'This is a private note. Only you can see this note. Shhhhh, it\'s our little secret.'
			};

			var userId = $cookies.get('as-id-clr');

			$http.post('/v1/notes/' + userId, note).then(function(response) {
				self.location = goTo;
			}, function(response) {
				self.location = goTo;
			});
		}, function(response) {
			self.location = goTo;
		});
	}
} ]);