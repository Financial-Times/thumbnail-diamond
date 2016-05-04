var mktemp = require('mktemp');
var http = require('http');
var fs = require('fs');
var path = require("path");
var async = require("async");

//exports.handler = main(event, context, callback);

var main = function(event, context, callback){
    var tmpdir = createDir(),
        posterPath = path.join(tmpdir, 'poster.png'),
        playerPath = path.join(tmpdir, 'player.png'),
        smallPlayerPath = path.join(tmpdir, 'small_player.png');

    var posterImage = event.image.poster;
    playerImage = event.image.player || posterImage;
    smallPlayerImage = event.image.smallPlayer || playerImage;

    async.parallel([
        processImage(posterImage, posterPath, 'poster'),
//        processImage(playerImage, playerPath, 'player'),
//        processImage(smallPlayerImage, smallPlayerPath, 'smallPlayer'),
    ]);
};

var processImage = function(source, dest, type){
    async.waterfall([
        async.apply(download, source, dest),
        resizeImage,
        burnInLayers,
        uploadImage
    ]);
};

var createDir = function(){
    return mktemp.createDirSync('/tmp/XXXXXXX');
};

var download = function(url, dest, callback) {
    console.log("Downloading " + url);
    var file = fs.createWriteStream(dest);
    http.get(url, function (res) {
        res.pipe(file, {end: 'false'});
        res.on('end', function () {
            file.end();
            console.log("Downloaded " + url + " to " + dest);
            callback(null, dest);
        });
    });
};

var resizeImage = function(file, callback){
    console.log('Resizing ' + file);
    callback(null, file);
};

var burnInLayers = function(file, callback){
    // grab some layers from S3 and apply relevant ones
    console.log('Burn in layers on ' + file);
    callback(null, file);
};

var uploadImage = function(file, callback){
    console.log('Upload file');
    callback(null, file);
};

var event = {
    mediaId: 12345,
    image: {
        poster: "http://www.stlucianewsonline.com/wp-content/uploads/2015/12/o-HOUSE-ON-FIRE-facebook.jpg",
        // player: "http://www.stlucianewsonline.com/wp-content/uploads/2015/12/o-HOUSE-ON-FIRE-facebook.jpg",
        // smallPlayer: "http://www.stlucianewsonline.com/wp-content/uploads/2015/12/o-HOUSE-ON-FIRE-facebook.jpg"
    }
};

main(event);
