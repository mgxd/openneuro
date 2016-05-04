'use strict';

// dependencies -----------------------------------------------------------

    var gulp        = require('gulp'),
        babelify    = require('babelify'),
        browserify  = require('browserify'),
        browserSync = require('browser-sync'),
        buffer      = require('vinyl-buffer'),
        CacheBuster = require('gulp-cachebust'),
        cachebust   = new CacheBuster(),
        changed     = require('gulp-changed'),
        del         = require('del'),
        gulpif      = require('gulp-if'),
        notify      = require('gulp-notify'),
        reload      = browserSync.reload,
        sass        = require('gulp-sass'),
        source      = require('vinyl-source-stream'),
        sourcemaps  = require('gulp-sourcemaps'),
        uglify      = require('gulp-uglify'),
        watchify    = require('watchify');

// project config ---------------------------------------------------------

    var p = {
        html:       './src/index.html',
        jsx:        './src/scripts/client.jsx',
        scss:       './src/sass/**/*.scss',
        scssmain:   './src/sass/main.scss',
        assets:     './src/assets/*',
        fonts:      './src/sass/fonts/*',
        bundle:     'app.min.js',

        dist:       'dist',
        distTemp:   'dist/temp',
        distAssets: 'dist/assets',
        distFonts:  'dist/fonts',

        env:        'prod'
    };

// primary tasks ----------------------------------------------------------

    gulp.task('build', ['styles', 'buildApp'], function() {
        gulp.start(['copy']);
    });

    gulp.task('watch', [], function() {
        p.env = 'dev';
        gulp.start(['watchStyles', 'watchApp', 'styles', 'dev-copy', 'browserSync']);
    });

    gulp.task('default',['watch'], function() {
        console.log('Running"');
    });

// deployment build -------------------------------------------------------

    // clean before build
    gulp.task('clean', function(cb) {
          del(['dist/temp'], cb);
    });

    // server and sync changes
    gulp.task('browserSync', function() {
        browserSync.init({
            server: './dist',
            port: 9876
        });
    });

    // copy
    gulp.task('copy', function () {
        del(['dist/*.js', 'dist/*.map', 'dist/*.html', 'dist/*.css']).then(function () {
            gulp.src(p.html).pipe(cachebust.references()).pipe(gulp.dest(p.dist));
            gulp.src(p.assets).pipe(gulp.dest(p.distAssets));
            gulp.src(p.fonts).pipe(gulp.dest(p.distFonts));
            gulp.src('dist/temp/*').pipe(gulp.dest(p.dist)).on('end', function () {del(['dist/temp'])});
        });
    });

    // bundle js
    gulp.task('buildApp', function(cb) {
        browserify(p.jsx)
            .transform(babelify)
            .bundle()
            .pipe(source(p.bundle))
            .pipe(buffer())
            .pipe(sourcemaps.init({loadMaps: true}))
            .pipe(uglify())
            .pipe(cachebust.resources())
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest(p.distTemp))
            .on('end', cb);
    });

    // compile & minify scss
    gulp.task('styles', function() {
        return gulp.src(p.scssmain)
            .pipe(changed(p.dist))
            .pipe(sass({errLogToConsole: true}))
            .on('error', notify.onError())
            .pipe(gulpif(p.env === 'prod', cachebust.resources()))
            .pipe(gulpif(p.env === 'prod', gulp.dest(p.distTemp), gulp.dest(p.dist)))
            .pipe(reload({stream: true}));
    });

// development build ------------------------------------------------------

    // copy
    gulp.task('dev-copy', function () {
        gulp.src(p.html).pipe(gulp.dest(p.dist));
        gulp.src(p.assets).pipe(gulp.dest(p.distAssets));
        gulp.src(p.fonts).pipe(gulp.dest(p.distFonts));
    });

    // watch for js changes
    gulp.task('watchApp', function() {
        var bundler = watchify(browserify(p.jsx, watchify.args));
        function rebundle() {
            return bundler
                .bundle()
                .on('error', notify.onError())
                .pipe(source(p.bundle))
                .pipe(gulp.dest(p.dist))
                .pipe(reload({stream: true}));
        }
        bundler.transform(babelify).on('update', rebundle);
        return rebundle();
    });

    // watch styles
    gulp.task('watchStyles', function() {
        gulp.watch(p.scssmain, ['dev-styles']);
        gulp.watch(p.scss, ['dev-styles']);
    });
