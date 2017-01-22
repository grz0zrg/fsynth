/* jslint browser: true */

/* global */

var ResizeThrottler = new (function() {
    /***********************************************************
        Private section.
        
        Fields.
    ************************************************************/
    var _callback_arr = [],
        
        _throttling_speed = 1000 / 8, // 8 fps by default
        
        _resize_timeout = null;
        
    
    /***********************************************************
        Private section.
        
        Functions.
    ************************************************************/
    var _throttler = function () {
        if (_resize_timeout === null) {
            _resize_timeout = setTimeout(function() {
                _resize_timeout = null;
                _callback_arr.forEach(function (func) { func(); });
            }, _throttling_speed);
        }
    };
    
    var _add = function (callback) {
        _callback_arr.push(callback);
    };
    
    /***********************************************************
        Public section.
        
        Functions.
    ************************************************************/
    this.initialize = function (callback_arr) {
        window.addEventListener("resize", _throttler, false);
        
        callback_arr.forEach(function (func) { _add(func); func(); });
    };
    
    this.add = function (callback) {
        _add(callback);
    };
})();