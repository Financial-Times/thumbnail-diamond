Thumbnail Diamond
==

![neil diamond](https://i.makeagif.com/media/5-09-2015/zzVqKI.gif)

`thumbnail-diamond` is a lambda function. It takes a payload as per:

```json
{
  "mediaId": 12345,
  "plasma": false,
  "brand": "some-brand",
  "image": {
    "master": "https://example.com/poster.png",
    "secondary": "https://example.com/player_img.png"
  }
}
```

And dumps three images in an S3 bucket under the structure:

```
some-s3-bucket/
└── 12345
    ├── player.png
    ├── poster.png
    └── small_player.png
```

It reads in burner information from some other bucket.

The `image` object uses hierarchical inference to determine images to pull as per:

```javascript
    var posterImage = event.image.poster;
    playerImage = event.image.player || posterImage;
    smallPlayerImage = event.image.smallPlayer || playerImage;
```

Thus some images may be skipped.
