var aws = require('aws-sdk');
var mktemp = require('mktemp');
var http = require('http');
var fs = require('fs');
var path = require("path");
var async = require("async");
var gm = require('gm').subClass({ imageMagick: true });

var profiles = {
    'master': { x: 2048, y: 1152 },
    'plasma': { x: 1920, y: 1080 },
    'secondary': { x: 167, y: 96 },
    'secondaryVideo': { x: 167, y: 96 }
};

var bucket = new aws.S3({params: {Bucket: 'thumbnail-diamond'}});

exports.handler = function(event, context, callback){
    var tmpdir = createDir(),
        masterPath = path.join(tmpdir, 'master.png'),
        plasmaPath = path.join(tmpdir, 'plasma.png'),
        secondaryPath = path.join(tmpdir, 'secondary.png');
        secondaryVideoPath = path.join(tmpdir, 'secondaryVideo.png');

    var masterImage = event.image.master,
        plasmaImage = masterImage,
        secondaryImage = event.image.secondary || masterImage,
        secondaryVideoImage = secondaryImage;

    async.parallel([
        processImage({id: event.mediaId, brand: event.brand, source: masterImage, dest: masterPath, type: 'master'}),
        function(){
            if (event.plasma) {
                processImage({id: event.mediaId, brand: event.brand, source: plasmaImage, dest: plasmaPath, type: 'plasma'});
            }
        },
        processImage({id: event.mediaId, brand: event.brand, source: secondaryImage, dest: secondaryPath, type: 'secondary'}),
        processImage({id: event.mediaId, brand: event.brand, source: secondaryVideoImage, dest: secondaryVideoPath, type: 'secondaryVideo'}),
    ]);

    callback(null, {
        mediaId: event.mediaId,
        baseUrl: 'https://s3-eu-west-1.amazonaws.com/thumbnail-diamond/' + event.mediaId,
        image: {
            master: '/master.png',
            plasma: '/plasma.png',
            secondary: '/secondary.png',
            secondaryVideo: '/secondaryVideo.png',
        }
    });
};

var processImage = function(imageObject){
    async.waterfall([
        async.apply(download, imageObject),
        resizeImage,
        burnInLayers,
        uploadImage
    ]);
};

var inferOverlay = function(type, brand){
    var brandNormalised = brand.toLowerCase().replace(/ /g,'');
    return brandNormalised + "-" + type + ".png";
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
        type = imageObject.type,
        brand = imageObject.brand;

    console.log('Burn in layers on ' + file);

    var overlay = inferOverlay(type, brand);
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

    console.log('Upload file ' + file);

    var fileParsed = path.parse(file);
    var params = {
        Key: id + '/' + fileParsed.base,
        Body: fs.createReadStream(file)
    };

    bucket.upload(params, function(err, data) {
        if (err) throw err;
        console.log('uploaded ' + fileParsed.base + ' to s3://thumbnail-diamond/' + params.Key);
        callback(null, imageObject);
    });
};
