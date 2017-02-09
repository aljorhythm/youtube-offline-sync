const log = require('./log.js')
const https = require('https')
const config = require('./config.js')
const request = require('request')
var API_KEY = config['API_KEY']

var User = function(username){
    this.username = username
}

User.prototype = {
    getChannels : function(){
        return new Promise((resolve, reject) => {
            let options = {
                url : 'https://www.googleapis.com/youtube/v3/channels',
                qs : {
                    part : 'snippet',
                    forUsername : this.username,
                    key : config['API_KEY']
                }
            }

            request(options, function(err, response, body) {
                if(err) return reject(err)
                if(response.statusCode != 200) return reject({"HTTP_STATUS_CODE" : response.statusCode, 'RESPONSE' : response})
                return resolve(JSON.parse(body)['items'])
            })
        })
    },
    getChannelID : function(){
        return new Promise((resolve, reject)=>{
            this.getChannels().then((items)=>{
                if(items.length > 0) return resolve(items[0]['id'])
                return reject("NO_CHANNEL_FOUND")
            }, reject)
        })
    },
    getPlaylists : function(){
        return new Promise((resolve, reject)=>{
            this.getChannelID().then((channelId)=>{
                let options = {
                    url : 'https://www.googleapis.com/youtube/v3/playlists',
                    qs : {
                        part : 'snippet,ContentDetails',
                        channelId : channelId,
                        key : API_KEY,
                        maxResults : 50
                    }
                }
                request(options, function(err, response, body) {
                    if(err) return reject(err)
                    if(response.statusCode != 200) return reject({"HTTP_STATUS_CODE" : response.statusCode, 'RESPONSE' : response})
                    return resolve(JSON.parse(body)['items'])
                })
            }, reject)
        })
    }
}

module.exports = User
