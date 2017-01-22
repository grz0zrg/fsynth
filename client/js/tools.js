/* jslint browser: true */


/***********************************************************
    Functions.
************************************************************/

var _saveLocalSessionSettings = function () {
    var session_name = _getSessionName();

    return function () {
        try {
            localStorage.setItem(session_name, JSON.stringify(_local_session_settings));
        } catch (e) {
            _notification("Can't save session local settings due to localStorage error. (local storage is likely full)");
        }
    };
}();

var _isPowerOf2 = function (value) {
    return (value & (value - 1)) === 0;
};

var _parseInt10 = function (value) {
    return parseInt(value, 10);
};

var _getElementOffset = function (elem) {
    var box = elem.getBoundingClientRect(),
        body = document.body,
        docEl = document.documentElement,

        scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop,
        scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft,

        clientTop = docEl.clientTop || body.clientTop || 0,
        clientLeft = docEl.clientLeft || body.clientLeft || 0,

        top  = box.top +  scrollTop - clientTop,
        left = box.left + scrollLeft - clientLeft;

    return { top: Math.round(top), left: Math.round(left), width: box.width, height: box.height };
};

// thank to Nick Knowlson - http://stackoverflow.com/questions/4912788/truncate-not-round-off-decimal-numbers-in-javascript
var _truncateDecimals = function (num, digits) {
    var numS = num.toString(),
        decPos = numS.indexOf('.'),
        substrLength = decPos == -1 ? numS.length : 1 + decPos + digits,
        trimmedResult = numS.substr(0, substrLength),
        finalResult = isNaN(trimmedResult) ? 0 : trimmedResult;

    return parseFloat(finalResult);
};

var _lZeroPad = function(str, c, length) {
    str = "" + str;

    while (str.length < length) {
        str = c + str;
    }

    return str;
};

var _setCookie = function (name, value, days) {
    var d = new Date();
    
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    
    document.cookie = name + "=" + value + ";" + ("expires=" + d.toUTCString()) + ";path=/";
};

var _getCookie = function getCookie(name) {
    var cookies,
        cookie,
        
        i = 0;
    
    name = name + "=";
    cookies = document.cookie.split(';');
    
    for(i = 0; i < cookies.length; i += 1) {
        cookie = cookies[i];
        
        while (cookie.charAt(0) == ' ') {
            cookie = cookie.substring(1);
        }
        
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length, cookie.length);
        }
    }
    
    return "";
};