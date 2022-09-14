module.exports = function(grunt) {

  "use strict";

  var third_party_js = [
        "static/scripts/third-party/wysihtml-toolbar-custom.js",
        "node_modules/jquery/dist/jquery.js",
        "node_modules/angular/angular.js",
        "static/scripts/third-party/bootstrap-custom.js",
        "node_modules/angular-route/angular-route.js",
        "node_modules/angular-cookies/angular-cookies.js",
        "node_modules/urijs/src/URI.js",
        "node_modules/jquery-minicolors/jquery.minicolors.js",
        "static/scripts/third-party/sockjs.js",
		"static/scripts/third-party/jquery-ui-custom.js",
		"static/scripts/third-party/rangy-cssclassapplier.js",
		"static/scripts/third-party/rangy-selectionsaverestore.js",
		"static/scripts/third-party/uuid.js",
		"static/scripts/third-party/jquery.scrollTo.js",
		"node_modules/jquery-ui-touch-punch/jquery.ui.touch-punch.js",
		"node_modules/angular-validation-match/dist/angular-validation-match.js",
		"static/scripts/third-party/jsonml0-browser.js",
		"static/scripts/third-party/json0-browser.js",
		"static/scripts/third-party/ot-custom.js", 
		"static/scripts/third-party/jquery.cloudinary.js",
		"static/scripts/third-party/jsonml-dom.js",
		"static/scripts/third-party/jsonml-html.js",
		"static/scripts/third-party/jsonml-utils.js",
		"static/scripts/third-party/jquery.cloudinary.js",
		"node_modules/ng-tags-input/build/ng-tags-input.js",
		"node_modules/angular-ui-sortable/dist/sortable.js",
		"static/scripts/third-party/rangyinputs-jquery-src.js"
  ];
  
  var base_css = [
    "static/styles/third-party/bootstrap/bootstrap-custom.css",
    "node_modules/font-awesome/css/font-awesome.css",
    "static/styles/third-party/jquery-ui-custom.css",
    "node_modules/jquery-minicolors/jquery.minicolors.css",
    "static/styles/as/tweaks.css",
    "static/styles/as/default.css",
    "static/styles/as/as-app.css",
    "static/styles/as/as-editor.css",
	"node_modules/ng-tags-input/build/ng-tags-input.css"
  ];

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        process: function(src, filepath) {
          return src.replace(/@VERSION/g, grunt.config.get('pkg.version'));
        }
      },
	  thirdparty: {
        src: third_party_js,
        dest: 'static/scripts/third-party.js'
	  },
	  dev: {
        src: ["static/scripts/as/**/*.js", "static/scripts/as/config.js-dev"],
        dest: 'static/scripts/<%= pkg.name %>.js'
	  },
	  prod: {
        src: ["static/scripts/as/**/*.js", "static/scripts/as/config.js-prod"],
        dest: 'static/scripts/<%= pkg.name %>.js'
	  }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> (<%= grunt.template.today("yyyy-mm-dd") %>) */\n',
        sourceMap: true
      },
      thirdparty: {
        files: {
          'static/scripts/third-party.min.js': 'static/scripts/third-party.js'
        }
      },
      custom: {
        files: {
          'static/scripts/<%= pkg.name %>.min.js': 'static/scripts/<%= pkg.name %>.js'
        }
      }
    },
    postcss: {
      options: {
        processors: [
          require('autoprefixer')({browsers: 'last 3 versions'})
        ]
      },
      dist: {
        src: 'static/styles/as/**/*.css'
      }
    },
    cssmin: {
        compress: {
          files: {
              'static/styles/<%= pkg.name %>.min.css': base_css,
              'static/styles/projects.min.css': ['static/styles/as/projects.css', 'static/styles/as/drawer.css'],
              'static/styles/project.min.css': ['static/styles/as/project.css', 'static/styles/as/drawer.css'],
              'static/styles/account.min.css': ['static/styles/as/account.css', 'static/styles/as/drawer.css'],
              'static/styles/editor.min.css': ['static/styles/third-party/bootstrap/bootstrap-custom.css', 'static/styles/as/as-editor.css']
          }
        }
    },
    jshint: {
        beforeconcat: ["static/scripts/as/**/*.js", "static/scripts/as/config.js-dev", "static/scripts/as/config.js-prod"]
     },
     watch: {
    	 css: {
    		 files: ['static/styles/**/*.css', '!**/*.min.css'],
    		 tasks: ['cssmin']
    	 },
    	 scripts: {
    	     files: ['static/scripts/**/*.js', '!**/airstory.*'],
    	     tasks: ['concat:dev', 'uglify:custom']
    	 }
     },	
      copy: {
     	 main: {
     		 files: [
     		         {expand: true, src: ['**/*.py', '!airpy/**', '!dist/**'], dest: 'dist/Airstory'},
     		         {expand: true, src: ['**/*.min.js', '!node_modules/**', '!dist/**', '!airpy/**'], dest: 'dist/Airstory'},
     		         {expand: true, src: ['**/*.min.css', '!node_modules/**', '!dist/**', '!airpy/**'], dest: 'dist/Airstory'},
     		         {expand: true, src: ['**/*.html', '!node_modules/**', '!airpy/**', '!dist/**'], dest: 'dist/Airstory'},
     		         {expand: true, src: ['**/swagger.json', '**/swagger.yaml', '!node_modules/**', '!airpy/**', '!dist/**'], dest: 'dist/Airstory'},
     		         {expand: true, src: ['static/images/**', 'static/fonts/**', 'static/styles/**/*.png', '!**/src/**', '!dist/**', '!airpy/**'], dest: 'dist/Airstory'},
     		         {expand: true, src: ['requirements.txt'], dest: 'dist/Airstory'},
     		         {expand: true, src: ['client_secrets_prod.json'], dest: 'dist/Airstory'},
     		         {expand: true, src: ['static/site/**'], dest: 'dist/Airstory'}
     		        ]
     	 	}
      },
	  rename: {
		  main: {
		    files: [
		  		{src: 'dist/Airstory/client_secrets_prod.json', dest: 'dist/Airstory/client_secrets.json'},
				]
		  }
	  },
      imagemin: {
    	  dynamic: {                 
    	      files: [{
    	        expand: true,
    	        cwd: 'static/images/src/',
    	        src: ['**/*.{png,jpg,jpeg,gif,ico,svg}'],
    	        dest: 'static/images'
    	      }]
    	    }
      },
      clean: {
    	  options: {
    	      force: true
    	  },
    	  folder: ['dist/']
      }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-postcss');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-imagemin');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-rename');

  grunt.registerTask('default', ['clean', 'concat:thirdparty', 'concat:dev', 'uglify', 'postcss', 'cssmin', 'jshint', 'imagemin']);
  grunt.registerTask('lite', ['concat:dev', 'uglify:custom', 'postcss', 'cssmin']);
  grunt.registerTask('tp', ['concat:thirdparty', 'uglify:thirdparty']);

  //Create build using prod config, copy to dist folder then replace local with dev config so there is not crossover
  grunt.registerTask('prod', ['concat:thirdparty', 'concat:prod', 'uglify', 'postcss', 'cssmin', 'jshint', 'imagemin', 'clean', 'copy', 'rename']);
};