var gulp = require('gulp');

var concat = require('gulp-concat');
var del = require('del');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');
var lambda = require('gulp-awslambda');
var path = require('path');
var sequence = require('run-sequence');
var uglify = require('gulp-uglify');

var paths = {};

paths.src = {};
paths.src.root = './src';
paths.src.js    = path.join(paths.src.root, '*.js');
paths.src.img   = path.join(paths.src.root, 'img', '**/*');

paths.build = {};
paths.build.root  = './build';
paths.build.js    = path.join(paths.build.root, 'index.js');
paths.build.img   = path.join(paths.build.root, 'img', '**/*');

paths.dist = {};
paths.dist.root = './dist';
paths.dist.js   = path.join(paths.dist.root, 'index.js');
paths.src.img   = path.join(paths.dist.root, 'img', '**/*');

var isDev = gutil.env.dev;

gulp.task('env', function() {
    if (isDev) {
        gutil.log(gutil.colors.cyan('Development Env'));
    } else {
        gutil.log(gutil.colors.magenta('Production Env'));
    }
});

var lambdaParams = {
    FunctionName: 'thumbnail',
    MemorySize: 128,
    Role: gutil.env.arn,
    Timeout: 5
};

var awsOpts = {
    profile: isDev ? 'dev' : 'prod',
    region: 'eu-west-1'
};

gulp.task('lint:js', function() {
    return gulp.src(paths.src.js)
        .pipe(jshint())
        .pipe(jshint.reporter('unix'));
});

gulp.task('compile:clean', function(callback) {
    if (isDev) {
        del([paths.build.root], callback);
    } else {
        del([paths.dist.root], callback);
    }
});

gulp.task('compile:js', function() {
    // We're writing plain old JS so this is a little simple
    return gulp.src([ paths.src.js
                    ])
        .pipe(concat('index.js'))
        .pipe(gulp.dest(isDev ? paths.build.root : paths.dist.root))
});

gulp.task('compile:img', function() {
    return gulp.src([ paths.src.img
                    ])
        .pipe(gulp.dest(isDev ? paths.build.img : paths.dist.img))
});


gulp.task('deploy:lambda', function(callback) {
    return  gulp.src(paths.dist.js)
            .pipe(zip('archive.zip'))
            .pipe(lambda(lambdaParams, awsOpts))
//            .pipe(gulp.dest('.'));
});

gulp.task('deploy', function(callback) {
    sequence('deploy:lambda', callback);
});

gulp.task('compile', function(callback) {
    sequence('compile:clean', ['compile:js', 'compile:img'], callback);
});

gulp.task('lint', ['lint:js']);

gulp.task('default', function(callback) {
    if (isDev) {
        sequence('env', 'lint', 'compile', callback);
    } else {
        sequence('env', 'lint', 'compile', 'deploy', callback);
    }
});
