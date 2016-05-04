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


    async.waterfall([
        async.apply(download, event.images.poster, posterPath),
        async.apply(download, event.images.player, playerPath),
        async.apply(download, event.images.smallPlayer, smallPlayerPath),
        function(callback){
            callback(null, tmpdir);
        },
        resizeImages,
        burnInLayers,
        uploadImages
    ]);
};

var createDir = function(){
    return mktemp.createDirSync('/tmp/XXXXXXX');
};

var download = function(url, dest, callback) {
    var file = fs.createWriteStream(dest);
    http.get(url, function (res) {
        res.pipe(file, {end: 'false'});
        res.on('end', function () {
            file.end();
            console.log("Downloaded " + url + " to " + dest);
            callback();
        });
    });
};

var resizeImages = function(tmpdir, callback){
    console.log('Resize');
    callback(null, tmpdir);
};

var burnInLayers = function(tmpdir, callback){
    // grab some layers from S3 and apply relevant ones
    console.log('Burn in layers');
    callback(null, tmpdir);
};

var uploadImages = function(tmpdir, callback){
    console.log('Upload images');
    callback(null, tmpdir);
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
