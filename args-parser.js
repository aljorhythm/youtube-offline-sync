const ArgumentParser = require('argparse').ArgumentParser;
var parser = new ArgumentParser({
    version: '0.0.1',
    addHelp : true,
    description: 'Argparse example'
});
parser.addArgument(
    [ '-u', '--username' ],
    {
        help: 'youtube username eg. pentatonixvevo',
        required: true
    }
)
parser.addArgument(
    [ '-p', '--playlist' ],
    {
        help: 'name of playlist to sync'
    }
)
parser.addArgument(
    [ '-lp', '--list-playlists' ],
    {
        help : 'list playlist names',
        action : 'storeTrue'
    }
)
parser.addArgument(
    [ '-o', '--overwrite' ],
    {
        help : 'overwrite existing files',
        action : 'storeTrue'
    }
)
parser.addArgument(
    [ '-pi', '--progress-interval' ],
    {
        help : 'percentage between 0 and 1 to show progress after every interval. default is 0.3',
        defaultValue : 0.3
    }
)
module.exports = parser
