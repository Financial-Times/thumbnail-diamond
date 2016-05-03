var mktemp = require('mktemp');
var http = require('http');
var fs = require('fs');
var path = require("path");
var async = require("async");

//exports.handler = main(event, context, callback);

var main = function(event, context, callback){
    var dir = createDir();

    getImages(dir, event.images);
    // resizeImages();
    // burnInLayers();
    // uploadImages();
};

var createDir = function(){
    return mktemp.createDirSync('/tmp/XXXXXXX');
};

var getImages = function(tmpdir, images){
    // wget $images -O $tmpdir/
    // Rename images to player/poster/small_player
    var posterPath = path.join(tmpdir, 'poster.png');
    var playerPath = path.join(tmpdir, 'player.png');
    var smallPlayerPath = path.join(tmpdir, 'small_player.png');

    download(images.poster, posterPath);
    download(images.player, playerPath);
    download(images.smallPlayer, smallPlayerPath);
};

var download = function(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var request = http.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(cb);
        });
    }).on('error', function(err){
        fs.unlink(dest);
        if (cb) cb(err.message);
    });
    console.log(dest);
};

var resizeImages = function(tmpdir){
    // Resize images based on name, from getImages()
};

var burnInLayers = function(tmpdir){
    // grab some layers from S3 and apply relevant ones
};

var uploadImages = function(tmpdir){
    // shove images to s3
};

var event = {
    mediaId: 12345,
    images: {
        poster: "http://www.stlucianewsonline.com/wp-content/uploads/2015/12/o-HOUSE-ON-FIRE-facebook.jpg",
        player: "http://www.stlucianewsonline.com/wp-content/uploads/2015/12/o-HOUSE-ON-FIRE-facebook.jpg",
        smallPlayer: "http://www.stlucianewsonline.com/wp-content/uploads/2015/12/o-HOUSE-ON-FIRE-facebook.jpg"
    }
};

main(event);
