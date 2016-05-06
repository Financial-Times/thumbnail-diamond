var gulp = require('gulp');

var concat = require('gulp-concat');
var del = require('del');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');
var lambda = require('gulp-awslambda');
var path = require('path');
var sequence = require('run-sequence');
var uglify = require('gulp-uglify');
var zip = require('gulp-zip');
var install = require("gulp-install");
var paths = {};

paths.src = {};
paths.src.root = './src';
paths.src.js    = path.join(paths.src.root, '*.js');
paths.src.img   = path.join(paths.src.root, 'img', '**/*');

paths.build = {};
paths.build.root  = './build';
paths.build.js    = path.join(paths.build.root, 'index.js');
paths.build.img   = path.join(paths.build.root, 'img');

paths.dist = {};
paths.dist.root = './dist';
paths.dist.js   = path.join(paths.dist.root, 'index.js');
paths.dist.img   = path.join(paths.dist.root, 'img');

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
    Timeout: 10
};

var awsOpts = {
    profile: gutil.env.profile,
    region: 'eu-west-1'
};

gulp.task('lint:js', function() {
    return gulp.src(paths.src.js)
        .pipe(jshint())
        .pipe(jshint.reporter('unix'));
});

gulp.task('compile:clean', function() {
    if (isDev) {
        del([paths.build.root]);
    } else {
        del([paths.dist.root]);
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

gulp.task('dependencies:npm', function() {
    return gulp.src(__dirname + '/package.json')
        .pipe(gulp.dest( paths.dist.root ))
        .pipe(install({production: true}));
});

gulp.task('deploy:lambda', function() {
    return  gulp.src(paths.dist.root + '/**/*')
        .pipe(zip('archive.zip'))
        .pipe(lambda(lambdaParams, awsOpts));
});

gulp.task('deploy', function(callback) {
    sequence('deploy:lambda', callback);
});

gulp.task('dependencies', function(callback) {
    sequence('dependencies:npm', callback);
});

gulp.task('compile', function(callback) {
    sequence('compile:clean', ['compile:js', 'compile:img'], callback);
});

gulp.task('lint', ['lint:js']);

gulp.task('default', function(callback) {
    if (isDev) {
        sequence('env', 'lint', 'compile', callback);
    } else {
        sequence('env', 'lint', 'compile', 'dependencies', 'deploy', callback);
    }
});
