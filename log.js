function log(e){
    var f = null
    if(typeof arguments[0] == 'function'){
        f = arguments[0]
        args = []
        for(var i = 1; i < arguments.length; i++){
            args.push(arguments[i])
        }
        arguments = args
    }

    if(arguments.length > 1){
        console.log(arguments)
    }else{
        e = e || ""
        return function(args){
            //console.log(arguments[0], args)
            f && f(args)
        }
    }
}

module.exports = log
