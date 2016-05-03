Thumbnail Diamond
==

![neil diamond](https://i.makeagif.com/media/5-09-2015/zzVqKI.gif)

`thumbnail-diamond` is a lambda function. It takes a payload as per:

```json
{
  "mediaId": 12345,
  "images": {
    "poster": "https://example.com/poster.png",
    "player": "https://example.com/player_img.png",
    "smallPlayer": "https://example.com/small_player_img.png"
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

It reads in burner information from some other bucket
