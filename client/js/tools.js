/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

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
    
	_midi_notes_map = [],
    _notes_name = [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ],
    
    _spectrum_colors = [];

/***********************************************************
    Functions.
************************************************************/

var _hzToMIDINote = function (freq) {
    return 69 + 12 * Math.log2(freq / 440);
};

var _hzFromMIDI = function (midi_note) {
    return 440 * Math.pow(2, (midi_note - 69) / 12);
};

var _getMIDIPan = function (l, r) {
    return Math.min(Math.abs(Math.round((1. - (l - r))*64)), 127);
};

var _getMIDIBend = function (f1, fn) {
    return Math.round(8192 + 4096 * 12 * Math.log2(f1 / _hzFromMIDI(fn)));
};

var _hzToOscillator = function (f, bf, o, h) {
    return (h - (Math.log(f / bf) / Math.log(2.0)) * Math.floor(h / o + 0.5));
};

var _MIDINoteName = function (midi_note) {
    return _midi_notes_map[Math.round(midi_note)];
};

var _randomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

var _random = function (min, max) {
    return Math.random() * (max - min) + min;
};

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

var _cloneObj = function (obj) {
    return JSON.parse(JSON.stringify(obj));
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

var _getFundamentalFrequency = function (data, width, height, mono) {
    var i = 0, j = 0,
        data_index = 0,
        freq = Infinity;

    for (i = height - 1; i >= 0; i -= 1) {
        for (j = 0; j < width; j += 1) {
            data_index = i * (width * 4) + j * 4;
            
            if (mono) {
                if (data[data_index + 3] > 0) {
                    freq = Math.min(freq, _getFrequency(i));
                }
            } else {
                if (((data[data_index] + data[data_index + 1]) / 2) > 0) {
                    freq = Math.min(freq, _getFrequency(i));
                }
            }
            
        }
    }
    
    return freq;
};

var _getSonogramBoundary = function (data, width, height, mono, backward) {
    var i = 0, j = 0,
        data_index = 0,

        x = width,
        
        rx = 0,
        
        f = Math.min,
        
        w_offset = 0;

    if (backward) {
        w_offset = -(width - 1);
        
        f = Math.max;
        
        x = 0;
    }

    for (i = height - 1; i >= 0; i -= 1) {
        for (j = 0; j < width; j += 1) {
            rx = Math.abs(j + w_offset);

            data_index = i * (width * 4) + rx * 4;
            
            if (mono) {
                if (data[data_index + 3] > 0) {
                    x = f(x, rx);
                    
                    break;
                }
            } else {
                if (data[data_index] > 0 || data[data_index + 1] > 0) {
                    x = f(x, rx);

                    break;
                }
            }   
        }
    }
    
    return x;
};

var _xhrContent = function (url, cb) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", url, true);
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            cb(xmlhttp.responseText);
        }
    }
    xmlhttp.send();
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

var _swapNode = function (elem1, elem2) {
    if (elem1 && elem2) {
        var P1 = elem1.parentNode,
            T1 = document.createElement("span"),
            P2,
            T2; 
        
        P1.insertBefore(T1, elem1);

        P2 = elem2.parentNode;
        T2 = document.createElement("span");
        
        P2.insertBefore(T2, elem2);

        P1.insertBefore(elem2, T1);
        P2.insertBefore(elem1, T2);

        P1.removeChild(T1);
        P2.removeChild(T2);
    }
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

var _truncateDecimals = function (num, digits) {
    var n = (+num).toFixed(digits + 1);
    return +(n.slice(0, n.length - 1));
};

var _clipboardCopy = function (e) {
    var copy_event = new ClipboardEvent("copy", { dataType: "text/plain", data: e.target.dataset.clipboard } );
    document.dispatchEvent(copy_event);
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

var _fnToImageData = function (img, done) {
    return function () {
        var tmp_canvas = document.createElement('canvas'),
            tmp_canvas_context = tmp_canvas.getContext('2d'),
        
            tmp_image_data;
        
        tmp_canvas.width  = img.naturalWidth;
        tmp_canvas.height = img.naturalHeight;

        tmp_canvas_context.drawImage(img, 0, 0, tmp_canvas.width, tmp_canvas.height);

        tmp_image_data = tmp_canvas_context.getImageData(0, 0, tmp_canvas.width, tmp_canvas.height);

        done(tmp_image_data);
    };
};

var _imageToDataURL = function (image) {
    var canvas = document.createElement("canvas"),
        ctx = canvas.getContext("2d");
    
    canvas.width = image.width;
    canvas.height = image.height;

    ctx.drawImage(image, 0, 0);

    return canvas.toDataURL("image/png");
};

var _fnCanvasToImage = function (tmp_canvas, done) {
    var image_element = document.createElement("img");
    image_element.src = tmp_canvas.toDataURL();
    image_element.width = tmp_canvas.width;
    image_element.height = tmp_canvas.height;

    image_element.onload = function () {
        image_element.onload = null;

        done(image_element);
    };
};

var _fnFlipImage = function (img, done) {
    return function () {
        var tmp_canvas = document.createElement('canvas'),
            tmp_canvas_context = tmp_canvas.getContext('2d'),
        
            tmp_image_data;
        
        tmp_canvas.width  = img.naturalWidth;
        tmp_canvas.height = img.naturalHeight;

        tmp_canvas_context.translate(0, tmp_canvas.height);
        tmp_canvas_context.scale(1, -1);
        tmp_canvas_context.drawImage(img, 0, 0, tmp_canvas.width, tmp_canvas.height);

        tmp_image_data = tmp_canvas_context.getImageData(0, 0, tmp_canvas.width, tmp_canvas.height);

        done({ canvas: tmp_canvas, image_data: tmp_image_data });
    };
};

var _truncateString = function (source, size) {
    return source.length > size ? source.slice(0, size - 1) + "…" : source;
};

var _flipImage = function (img, done) {
    _fnFlipImage(img, done)();
};

/***********************************************************
    Init.
************************************************************/

var _toolsInit = function () {
    var i = 0, index, key, octave;
    
    for (i = 0; i < 256; i += 1) {
        _spectrum_colors.push(_getColorFromPalette(i));
    }
    
    // generate notes name for MIDI to note name conversion
	for(i = 0; i < 127; i += 1) {
		index = i;
        key = _notes_name[index % 12];
        octave = ((index / 12) | 0) - 1;

		key += octave;

		_midi_notes_map[i] = key;
    }
};

_toolsInit();