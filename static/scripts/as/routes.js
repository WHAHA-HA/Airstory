app.config(['$routeProvider', function($routeProvider) {
    $routeProvider
        .when('/notes/user', {
            templateUrl: '/partials/notes',
            controller: 'PrivateNotesCtrl',
            controllerAs: 'notesCtrl'
        })
        .when('/notes/project', {
            templateUrl: '/partials/notes',
            controller: 'ProjectNotesCtrl',
            controllerAs: 'notesCtrl'
        })
        .when('/notes/library', {
            templateUrl: '/partials/notes',
            controller: 'LibraryNotesCtrl',
            controllerAs: 'notesCtrl'
        })
        .when('/notes/archive', {
            templateUrl: '/partials/notes',
            controller: 'ArchiveNotesCtrl',
            controllerAs: 'notesCtrl'
        })
        .when('/citations', {
            templateUrl: '/partials/citations',
            controller: 'CitationsListCtrl',
            controllerAs: 'citationsListCtrl'
        })
        .when('/images/user', {
            templateUrl: '/partials/images',
            controller: 'PrivateImagesCtrl',
            controllerAs: 'imagesCtrl'
        })
        .when('/images/project', {
            templateUrl: '/partials/images',
            controller: 'ProjectImagesCtrl',
            controllerAs: 'imagesCtrl'
        })
        .when('/images/library', {
            templateUrl: '/partials/images',
            controller: 'LibraryImagesCtrl',
            controllerAs: 'imagesCtrl'
        })
    	.otherwise({ 
            templateUrl: '/partials/notes',
            controller: 'NotesRouterCtrl',
            controllerAs: 'notesCtrl'
        });
}]);