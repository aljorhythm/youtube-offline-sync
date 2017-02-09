const User = require('./YoutubeUser.js')
const log = require('./log.js')
const https = require('https')
const config = require('./config.js')
const request = require('request')
const ytdl = require('ytdl-core')

var API_KEY = config['API_KEY']

var youtube = {
    GetUserPlaylists : function(username){
        return new Promise(function(resolve, reject){
            let me = new User(username)
            me.getPlaylists().then(resolve, reject)
        })
    },
    GetPlaylistItems : function(playlistId, pageToken){
        return new Promise((resolve, reject) => {
            var qs = {
                part : 'snippet',
                playlistId : playlistId,
                key : config['API_KEY'],
                maxResults : 50
            }
            if(pageToken){
                qs['pageToken'] = pageToken
            }
            let options = {
                url : 'https://www.googleapis.com/youtube/v3/playlistItems',
                qs : qs
            }

            request(options, (err, response, body) => {
                if(err) return reject(err)
                if(response.statusCode != 200) return reject({"HTTP_STATUS_CODE" : response.statusCode, 'RESPONSE' : response})
                var parsedResponse = JSON.parse(body)
                var nextPageToken = parsedResponse['nextPageToken']
                var items = parsedResponse['items']
                if(nextPageToken){
                    this.GetPlaylistItems(playlistId, nextPageToken)
                        .then((nextItems)=>{
                            items = items.concat(nextItems)
                            resolve(items)
                        })
                }else{
                    return resolve(items)
                }
            })
        })
    },
    GetVideoInfo : function(url){
        return new Promise((resolve, reject) => {
            ytdl.getInfo(url, (err, info)=>{
                if(err) {
                    return reject(err)
                }
                resolve(info)
            })
        })
    },
    GetVideoFilenames : function(playlistItems){
        return new Promise((resolve, reject) => {
            var promises = []
            playlistItems.forEach((item)=>{
                promises.push(new Promise((resolve, reject) => {
                    var videoName = item['snippet']['title']
                    var videoId = item['snippet']['resourceId']['videoId']
                    var url = 'https://www.youtube.com/watch?v=' + videoId
                    item[videoName] = videoName
                    item[videoId] = videoId

                    this.GetVideoInfo(url).then((info)=>{
                        var format = info['formats'][0] // highest
                        var extension = '.' + format['container']
                        var videoFilename = videoName + extension
                        item['filename'] = videoFilename
                        resolve(item)
                    }, (err) => {
                        item['error'] = err.toString()
                        resolve(item)
                    })
                }))
            })
            Promise.all(promises).then((results)=>{
                var videos = []
                var errors = []
                results.forEach((video)=>{
                    if(video['err']){
                        errors.push(video)
                    }else{
                        videos.push(video)
                    }
                })
                resolve({
                    videos : videos,
                    error : errors
                })
            }, reject)
        })
    }
}

module.exports = youtube
