const log = require('./log.js')
const YoutubeFiles = require('./YoutubeFiles.js')
const youtube = require('./youtube.js')

var filesDir = __dirname

const parser = require('./args-parser.js')
var args = parser.parseArgs()

var videoProgressInfo = {}

// default
var youtubeFiles = new YoutubeFiles({
    username : args['username'],
    playlist : args['playlist'],
    overwrite : args['overwrite'],
    listeners : {
        'sync-user-playlists' : (username) => console.log('syncing playlists for', username),
        'sync-playlist' : (playlist) => console.log('syncing playlist', playlist['snippet']['title']),
        'playlist-offline-files' : (videos) => console.log('already offline videos\n', videos.map(video => " - " + video).join("\n")),
        'playlist-to-download' : (videos) => console.log('to download videos\n', videos.map(video => " - " + video['snippet']['title']).join("\n")),
        'playlist-to-delete' : (videos) => console.log('deleting files', videos.join("\n - "), "\n"),
        'playlist-unable-to-download' : (videos) => console.log('to download videos\n', videos.map(video => " - " + video['snippet']['title']).join("\n")),
        'video-download-start' : (start) => console.log('starting video download', start, "\n"),
        'video-download-progress' : (progress) => {
            // print every 20%
            var videoPath = progress['info']['path']
            videoProgressInfo[videoPath] = videoProgressInfo[videoPath] || 0
            if(progress['percent'] - videoProgressInfo[videoPath] >= args['progress_interval']){
                videoProgressInfo[videoPath] = progress['percent']
                console.log('video download progress\n', '\n -', videoPath, progress['percent'] * 100, '%\n')
            }
        },
        'video-download-finish' : (end) => console.log('finished video download', end['video_name'], "\n")
    },
    directory : filesDir
})

if(args['list_playlists']){
    console.log('Playlists for channel', args['username'])
    return youtube.GetUserPlaylists(args['username'])
        .then(playlists => console.log(playlists.map(playlist => " - " + playlist['snippet']['title']).join("\n")))
}

youtubeFiles.syncPlaylists().then(function(playlists){
    console.log('Finished syncing user ' + youtubeFiles.username)
    console.log(playlists)
}, function(err){
    console.log('error', err)
})
