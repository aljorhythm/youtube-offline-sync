const youtube = require('./youtube.js')
const SequentialPromise = require('./SequentialPromise.js')
const glob = require('glob')
const fs = require('fs')
const ytdl = require('ytdl-core')
const path = require('path')

var YoutubeFiles = function(options){
    this.username = options['username']
    this.verbose = options['verbose']
    this.fast = options['fast'] // in certain places dispatching too many jobs causes errors, by default do one by one
    this.playlist = options['playlist']
    this.listeners = options['listeners'] || {}
    this.overwrite = options['overwrite']
    this.directory = options['filesDir'] || __dirname + '/' + this.username
    fs.mkdir(this.directory, ()=>{}) // (async) this assumes any call dependent on channel directory to exist will do so after the directory has been created
}

YoutubeFiles.prototype = {
    shout : function(event, message){
        if(this.listeners[event])
            this.listeners[event](message)
    },
    filterPlaylists : function(playlists){
        return new Promise((resolve, reject)=>{
            if(this.playlist){
                playlists = playlists.filter(playlist => this.playlist == playlist['snippet']['title'])
            }
            resolve(playlists)
        })
    },
    syncPlaylists : function(){
        return new Promise((syncPlaylistResolver, syncPlaylistRejector)=>{
            var playlistsResults = {}
            this.shout('sync-user-playlists', this.username)
            youtube.GetUserPlaylists(this.username)
                .then(playlists => this.filterPlaylists(playlists), syncPlaylistRejector)
                .then(playlists => {
                        var seqPromise = new SequentialPromise()
                        playlists.forEach(playlist => seqPromise.next(()=>{
                            var playlistName = playlist['snippet']['title']
                            return this.syncPlaylist(playlist)
                                        .then(results => Promise.resolve(playlistsResults[playlistName] = results))
                        }))
                        return seqPromise.last()
                    })
                .then(() => syncPlaylistResolver(playlistsResults), syncPlaylistRejector)
        })
    },
    syncPlaylist : function(playlist){
        return new Promise((resolve, reject) => {
            this.shout('sync-playlist', playlist)
            var playlistName = playlist['snippet']['title']
            var playlistDir = this.directory + '/' + playlistName
            var playlistId = playlist['id']
            youtube.GetPlaylistItems(playlistId)
                .then(playlistItems => new Promise(
                            (resolve, reject) => fs.mkdir(playlistDir, () => resolve(playlistItems))
                        )
                    , reject)
                .then(playlistItems => youtube.GetVideoFilenames(playlistItems), reject)
                .then(videosInfo =>{
                        this.getOfflinePlaylistVideoFilenames(playlist).then(offlineFilenames =>{
                            var downloadedFiles = []
                            var onlineVideoFilenames = []
                            var errorVideos = []
                            var toDownloadVideos = this.overwrite ? videosInfo['videos'] : videosInfo['videos'].filter(
                                videoInfo => {
                                    if(videoInfo['error']){
                                        errorVideos.push(videoInfo)
                                        return false
                                    }
                                    var videoFilename = this.sanitizeVideoFilename(videoInfo['filename'])
                                    onlineVideoFilenames.push(videoFilename)
                                    var notFound = offlineFilenames.indexOf(videoFilename) < 0 // file not found, to download
                                    downloadedFiles.push(videoFilename)
                                    return notFound
                                }
                            )
                            var toDeleteVideos = offlineFilenames.filter(offlineFilename => onlineVideoFilenames.indexOf(offlineFilename) < 0)
                            this.shout('playlist-to-download', toDownloadVideos)
                            this.shout('playlist-offline-files', downloadedFiles)
                            this.shout('playlist-to-delete', toDeleteVideos)
                            this.shout('playlist-unable-to-download', errorVideos)
                            // TODO delete files not in playlist
                            this.downloadVideos(playlistDir, toDownloadVideos)
                                .then((downloadVideosResult)=>resolve({'download_videos_results' : downloadVideosResult}))
                        }, reject)
                    }, err => reject({method : 'syncPlaylist', playlist : playlistName, err: err}))
        })
    },
    sanitizeVideoFilename : function(filename){
        console.log(filename)
        filename.replace("/", "-")
        filename.replace(/^[\w.-]+$/gi, "-")
        return filename
    },
    getOfflinePlaylistVideoFilenames : function(playlist){
        return new Promise((resolve, reject)=>{
            glob(this.directory + "/" + playlist['snippet']['title'] + "/*", (err, files)=>{
                if(err) return reject(err)
                return resolve(files.map(file => path.basename(file)))
            })
        })
    },
    downloadVideos : function(directory, items){
        return new Promise((resolve, reject)=>{
            if(this.fast){
                var promises = []
                items.forEach(item =>{
                    promises.push(this.downloadVideo(directory, item))
                })
                Promise.all(promises).then(resolve, reject)
            }else{
                var sp = new SequentialPromise()
                var itemResults = []
                items.forEach(item => sp.next(() => this.downloadVideo(directory, item)
                                                            .then(result => itemResults.push(result), result => itemResults.push(result))))
                sp.next(() => resolve(itemResults), reject)
            }
        })
    },
    downloadVideo : function(directory, item){
        return new Promise((resolve, reject) => {
            var videoId = item['snippet']['resourceId']['videoId']
            var url = 'https://www.youtube.com/watch?v=' + videoId
            var filename = item['filename']
            var path = directory + '/' + filename
            var writer = fs.createWriteStream(path)
            var downloadedStatus = {
               'video_name' : filename,
               url : url,
               path : path
            }
            writer.on('finish', () => {
                downloadedStatus['status'] = 'DOWNLOADED'
                this.shout('video-download-finish', downloadedStatus)
                resolve(downloadedStatus)
            })
            writer.on('error', (err)=>{
                downloadedStatus['status'] = 'ERROR'
                downloadedStatus['error'] = err
                reject(downloadedStatus)
            })
            writer.on('pipe', () => {
                this.shout('video-download-start', path)
            })
            var stream = ytdl(url, {
                quality : 'highest'
            })
            stream.on('error', err => {
                downloadedStatus['status'] = 'ERROR'
                downloadedStatus['error'] = err
                reject(downloadedStatus)
            })
            stream.on('response', res => {
                var totalSize = res.headers['content-length']
                var dataRead = 0
                res.on('data', data =>{
                    dataRead += data.length
                    var percent = dataRead / totalSize
                    this.shout('video-download-progress', {
                        'info' : downloadedStatus,
                        'percent' : percent
                    })
                })
            })
            stream.pipe(writer)
        })
    }
}

module.exports = YoutubeFiles
