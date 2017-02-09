var SequentialPromise = function(){
    this.previousPromise = new Promise(resolve => resolve())
}
SequentialPromise.prototype = {
    ensureFunction : function(promiseOrNot){
        if(promiseOrNot && promiseOrNot['then']) return () => promiseOrNot
        return promiseOrNot
    },
    next : function(resolve, reject){
        resolve = this.ensureFunction(resolve)
        reject = this.ensureFunction(reject)
        this.previousPromise = this.previousPromise.then(resolve, reject)
    },
    last : function(){
        return this.previousPromise
    }
}

module.exports = SequentialPromise
