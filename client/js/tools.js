/* jslint browser: true */

var _fs_palette = {
        0:   [0,   0,   0],
        10:  [75,  0, 159],
        20:  [104, 0, 251],
        30:  [131, 0, 255],
        40:  [155, 18,157],
        50:  [175, 37,  0],
        60:  [191, 59,  0],
        70:  [206, 88,  0],
        80:  [223, 132, 0],
        90:  [240, 188, 0],
        100: [255, 252, 0]
    },
    
    _spectrum_colors = [];

/***********************************************************
    Functions.
************************************************************/

var _webMIDISupport = function () {
    if (navigator.requestMIDIAccess) {
        return true;
    } else {
        return false;
    }
};

var _objSwap = function (src, dst) {
    var k = null,
        
        dst_data = null;
    
    for (k in src) {
        dst_data = dst[k];
        
        dst[k] = src[k];
        src[k] = dst_data;
    }
};

var _swapArrayItem = function (arr, a, b) {
    var temp = arr[a];
    
    arr[a] = arr[b];
    arr[b] = temp;
    
    return arr;
};

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

var _rgbToHex = function (r, g, b) {
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

var _decimalToHTMLColor = function (n) {
    return ('00000' + (n | 0).toString(16)).substr(-6);
};

var _logScale = function (index, total, opt_base) {
    var base = opt_base || 2, 
        logmax = Math.log(total + 1) / Math.log(base),
        exp = logmax * index / total;
    
    return Math.round(Math.pow(base, exp) - 1);
};

var _melScale = function () {
    
};

var _degToRad = function (angle) {
    return angle * Math.PI / 180.0;
};

var _setImageSmoothing = function (ctx, state) {
    if (ctx) {
        ctx.mozImageSmoothingEnabled    = state;
        ctx.oImageSmoothingEnabled      = state;
        //ctx.webkitImageSmoothingEnabled = state;
        ctx.msImageSmoothingEnabled     = state;
        ctx.imageSmoothingEnabled       = state;
    }
};

var _barkScale = function (length, sample_rate, buffer_size) {
    var scale = new Float32Array(length),
        
        i = 0;
    
    for (i = 0; i < scale.length; i += 1) {
        scale[i] = i * sample_rate / buffer_size;
        scale[i] = 13 * Math.atan(scale[i] / 1315.8) + 3.5 * Math.atan(Math.pow((scale[i] / 7518), 2));
    }
    
    return scale;
};

var _getColorFromPalette = function (value) {
    var decimalised = 100 * value / 255,
        percent = decimalised / 100,
        floored = 10 * Math.floor(decimalised / 10),
        distFromFloor = decimalised - floored,
        distFromFloorPercentage = distFromFloor/10,
        rangeToNextColor,
        color;
    
    if (decimalised < 100){
        rangeToNextColor = [
            _fs_palette[floored + 10][0] - _fs_palette[floored + 10][0],
            _fs_palette[floored + 10][1] - _fs_palette[floored + 10][1],
            _fs_palette[floored + 10][2] - _fs_palette[floored + 10][2]
        ];
    } else {
        rangeToNextColor = [0, 0, 0];
    }

    color = [
        _fs_palette[floored][0] + distFromFloorPercentage * rangeToNextColor[0],
        _fs_palette[floored][1] + distFromFloorPercentage * rangeToNextColor[1],
        _fs_palette[floored][2] + distFromFloorPercentage * rangeToNextColor[2]
    ];

    return "rgb(" + color[0] +", "+color[1] +"," + color[2]+")";
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

var _isFireFox = function () {
    return (navigator.userAgent.toLowerCase().indexOf('firefox') > -1);
};

var _frequencyFromNoteNumber = function (note) {
    return 440 * Math.pow(2, (note - 69) / 12);
};

// ms
var _getNoteTime = function (tempo, ppb) {
    return (1.0 / ppb) * (60.0 / tempo);
};

var _lZeroPad = function (str, c, length) {
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

/***********************************************************
    Init.
************************************************************/

var _toolsInit = function () {
    var i = 0;
    
    for (i = 0; i < 256; i += 1) {
        _spectrum_colors.push(_getColorFromPalette(i));
    }
};

_toolsInit();