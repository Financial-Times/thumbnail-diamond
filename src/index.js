var mktemp = require('mktemp');
var http = require('http');
var fs = require('fs');
var path = require("path");
var async = require("async");
var gm = require('gm').subClass({ imageMagick: true });

//exports.handler = main(event, context, callback);

var profiles = {
    'master': { x: 2048, y: 1152, overlay: 'nooz.png' },
    'plasma': { x: 1920, y: 1080, overlay: 'nooz.png' },
    'secondary': { x: 167, y: 96, overlay: 'nooz_small.png' },
    'secondaryVideo': { x: 167, y: 96, overlay: 'nooz_small_play.png' },
    'triplet': { x: 167, y: 96, overlay: 'nooz_small.png' }
};

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

    async.parallel([
        processImage(masterImage, masterPath, 'master'),
        processImage(plasmaImage, plasmaPath, 'plasma'),
        processImage(secondaryImage, secondaryPath, 'secondary'),
        processImage(secondaryVideoImage, secondaryVideoPath, 'secondaryVideo'),
        processImage(tripletImage, tripletPath, 'triplet'),
    ]);
};

var processImage = function(source, dest, type){
    async.waterfall([
        async.apply(download, source, dest, type),
        resizeImage,
        burnInLayers,
        uploadImage
    ]);
};

var createDir = function(){
    return mktemp.createDirSync('/tmp/XXXXXXX');
};

var download = function(url, dest, type, callback) {
    console.log("Downloading " + url);
    var file = fs.createWriteStream(dest);

    http.get(url, function (res) {
        res.pipe(file, {end: 'false'});
        res.on('end', function () {
            file.end();
            console.log("Downloaded " + url + " to " + dest);
            callback(null, dest, type);
        });
    });
};

var resizeImage = function(file, type, callback){
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
                callback(null, file, type);
            });
        });
};

var burnInLayers = function(file, type, callback){
    // grab some layers from S3 and apply relevant ones
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
                callback(null, file);
            });
        });
};

var uploadImage = function(file, callback){
    console.log('Upload file');
    callback(null, file);
};

var event = {
    mediaId: 12345,
    image: {
        master: "http://www.stlucianewsonline.com/wp-content/uploads/2015/12/o-HOUSE-ON-FIRE-facebook.jpg",
        // player: "http://www.stlucianewsonline.com/wp-content/uploads/2015/12/o-HOUSE-ON-FIRE-facebook.jpg",
        // smallPlayer: "http://www.stlucianewsonline.com/wp-content/uploads/2015/12/o-HOUSE-ON-FIRE-facebook.jpg"
    }
};

main(event);
