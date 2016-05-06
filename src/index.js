var aws = require('aws');
var mktemp = require('mktemp');
var http = require('http');
var fs = require('fs');
var path = require("path");
var async = require("async");
var gm = require('gm').subClass({ imageMagick: true });

exports.handler = main(event, context, callback);

var profiles = {
    'master': { x: 2048, y: 1152, overlay: 'nooz.png' },
    'plasma': { x: 1920, y: 1080, overlay: 'nooz.png' },
    'secondary': { x: 167, y: 96, overlay: 'nooz_small.png' },
    'secondaryVideo': { x: 167, y: 96, overlay: 'nooz_small_play.png' },
    'triplet': { x: 167, y: 96, overlay: 'nooz_small.png' }
};

var bucket = new AWS.S3({params: {Bucket: 'thumbnail-diamond'}});

var main = function(event, context, callback){
    var tmpdir = createDir(),
        masterPath = path.join(tmpdir, 'master.png'),
        plasmaPath = path.join(tmpdir, 'plasma.png'),
        secondaryPath = path.join(tmpdir, 'secondary.png');
        secondaryVideoPath = path.join(tmpdir, 'secondaryVideo.png');
        tripletPath = path.join(tmpdir, 'triplet.png');

    var masterImage = event.image.master,
        plasmaImage = masterImage,
        secondaryImage = event.image.secondary || masterImage,
        secondaryVideoImage = secondaryImage,
        tripletImage = event.image.triplet || secondaryImage;

    var imageObject = {
        id: event.mediaId
    };

    async.parallel([
        processImage(masterImage,
                     {id: event.mediaId, source: masterImage, dest: masterPath, type: 'master'}),
        processImage(plasmaImage,
                     {id: event.mediaId, source: plasmaImage, dest: plasmaPath, type: 'plasma'}),
        processImage(secondaryImage,
                     {id: event.mediaId, source: secondaryImage, dest: secondaryPath, type: 'secondary'}),
        processImage(secondaryVideoImage,
                     {id: event.mediaId, source: secondaryVideoImage, dest: secondaryVideoPath, type: 'secondaryVideo'}),
        processImage(tripletImage,
                     {id: event.mediaId, source: tripletImage, dest: tripletPath, type: 'triplet'}),
    ]);
};

var processImage = function(imageObject){
    async.waterfall([
        async.apply(imageObject),
        resizeImage,
        burnInLayers,
        uploadImage
    ]);
};

var createDir = function(){
    return mktemp.createDirSync('/tmp/XXXXXXX');
};

var download = function(imageObject, callback) {
    var url = imageObject.source,
        dest = imageObject.dest;

    console.log("Downloading " + url);
    var file = fs.createWriteStream(dest);

    http.get(url, function (res) {
        res.pipe(file, {end: 'false'});
        res.on('end', function () {
            file.end();
            console.log("Downloaded " + url + " to " + dest);
            callback(null, imageObject);
        });
    });
};

var resizeImage = function(imageObject, callback){
    var file = imageObject.dest,
        type = imageObject.type;

    console.log('Resizing ' + file);

    var profile = profiles[ type ];
    var fileParsed = path.parse(file),
        outputFilename = [fileParsed.name, 'resized', 'png'].join('.'),
        outputPath = path.join(fileParsed.dir, outputFilename);

    gm(file)
        .resize(profile.x, profile.y, '!')
        .autoOrient()
        .write(outputPath, function (err) {
            if (err) throw err;
            fs.rename(outputPath, file, function(err){
                if (err) throw err;

                console.log('Resized ' + file);
                callback(null, imageObject);
            });
        });
};

var burnInLayers = function(imageObject, callback){
    var file = imageObject.dest,
        type = imageObject.type;

    console.log('Burn in layers on ' + file);

    var overlay = profiles[ type ].overlay;
    var fileParsed = path.parse(file),
        outputFilename = [fileParsed.name, 'overlayed', 'png'].join('.'),
        outputPath = path.join(fileParsed.dir, outputFilename);

    gm()
        .in(file)
        .in(path.join(__dirname, 'img', overlay))
        .in('-compose' ,'atop')
        .in('-composite')
        .write(outputPath, function (err) {
            if (err) throw err;
            fs.rename(outputPath, file, function(err){
                if (err) throw err;

                console.log('resized ' + file);
                callback(null, imageObject);
            });
        });
};

var uploadImage = function(imageObject, callback){
    var file = imageObject.dest,
        id = imageObject.id;

    var fileParsed = path.parse(file);

    console.log('Upload file');
    var params = {
        Key: id + '/' + fileParsed.base,
        Body: file.createReadStream(file)
    };

    bucket.upload(params, function(err, data) {
        if (err) {
            console.log('ERROR MSG: ', err);
        } else {
            console.log('Successfully uploaded data');
        }
    });
    callback(null, file);
};
