// OSC - Should be used with an OSC relay
/*#include ../osc.js/osc-browser.js*/

var _osc = false,
    _osc_timeout = null,
    _osc_port,
    
    _osc_ready = false,

    _OSC_ENABLE = 0,
    _OSC_DISABLE = 1,
    _OSC_FRAME_DATA = 2;

var _disconnect = function () {
    if (_osc_port) {
        _osc_port.close();
    }

    clearTimeout(_osc_timeout);
};

var _connect = function (opts) {
    _osc_port = new osc.WebSocketPort({
        url: "ws://"  + opts.address,
        metadata: true
    });
    
    _osc_port.on("ready", function () {
        postMessage({
                status: "ready"
            });
        
        _osc_ready = true;
    });

    _osc_port.on("bundle", function (bundle) {
        var packets = bundle.packets,

            address,
            args,

            i = 0;

        for (i = 0; i < packets.length; i += 1) {
            address = packets[i].address;
            args = packets[i].args;

            // bundles processing here (wip)
        }
    });

    _osc_port.on("message", function (m) {
        var address = m.address,
            args = m.args,

            data = [],
            prefix = address.slice(0, 2),
            
            i;
        
        if (address === "/clear") {
            postMessage({
                    status: "clear"
                });
        } else if (address === "/video") {
            for (i = 0; i < args.length; i += 1) {
                data.push(args[i].value);
            }
            
            postMessage({
                    status: "videoData",
                    videoData: data
                });
        } else if (prefix === "/i") {
            postMessage({
                    status: "data",
                    osc_input: { name: address.slice(1, address.length), i: args[0].value, v: args[1].value }
                });
        } else if (prefix === "/a") {
            for (i = 0; i < args.length; i += 1) {
                data.push(args[i].value);
            }
            
            postMessage({
                    status: "data",
                    osc_input: { name: address.slice(1, address.length), v: data }
                });
        }
    });

    _osc_port.on("close", function () {        
        if (_osc) {
            postMessage({
                    status: "close"
                });
            
            clearTimeout(_osc_timeout);
            _osc_timeout = setTimeout(_connect, 5000, opts);
        }
        
        _osc_ready = false;
    });

    _osc_port.on("error", function (e) {
        postMessage({
                status: "error"
            });
        
        if (_osc) {
            clearTimeout(_osc_timeout);
            _osc_timeout = setTimeout(_connect, 5000, opts);
        }
        
        _osc_ready = false;
    });

    _osc_port.open();
};

var _getNoteBundle = function (i, j, c, l, r, b, a, base_freq, octave_len) {
    return {
        address: "/fragment",
        args: [
            // osc index
            {
                type: "i",
                value: i
            },
            // osc frequency
            {
                type: "d",
                value: base_freq * Math.pow(2, j / octave_len)
            },
            // osc volume l
            {
                type: "f",
                value: l
            },
            // osc volume r
            {
                type: "f",
                value: r
            },
            // osc blue value
            {
                type: "f",
                value: b
            },
            // osc alpha value
            {
                type: "f",
                value: a
            },
            // channel
            {
                type: "i",
                value: c
            }
        ]
    };
};

var _sendFrameBundle = function (data) {
    if (!_osc_ready) {
        return;
    }
    
    var i = 0,
        j = 0,
        c = 0,
        
        inv_full_brightness = 1,
        
        cdata = data.arg,
        
        h,
        
        bundle = {
                timeTag: osc.timeTag(0),
                packets: []
            };

    if (_osc) {
        if (data.float) {
            for (i = 0; i < data.channels * 2; i += 1) {
                cdata[i] = new Float32Array(cdata[i]);
            }
        } else {
            for (i = 0; i < data.channels * 2; i += 1) {
                cdata[i] = new Uint8Array(cdata[i]);
            }
            
            inv_full_brightness = 1 / 255.0;
        }
        
        h = cdata[0].length / 4;
        
        for (c = 0; c < data.channels; c += 1) {
            j = cdata[c].length / 4 - 1;
            for (i = 0; i < cdata[c].length; i += 4) {
                var r = cdata[c][i],
                    g = cdata[c][i + 1],
                    b = cdata[c][i + 2],
                    a = cdata[c][i + 3];

                if (r > 0 || g > 0) {
                    r *= inv_full_brightness;
                    g *= inv_full_brightness;
                    b *= inv_full_brightness;
                    a *= inv_full_brightness;
                    
                    bundle.packets.push(_getNoteBundle(j, h - j - 1, c, r, g, b, a, data.base_frequency, data.octave_length));
                } else {
                    var pr = cdata[c + data.channels][i],
                        pg = cdata[c + data.channels][i + 1];

                    if (pr > 0 || pg > 0) {
                        r *= inv_full_brightness;
                        g *= inv_full_brightness;
                        b *= inv_full_brightness;
                        a *= inv_full_brightness;

                        bundle.packets.push(_getNoteBundle(j, h - j - 1, c, r, g, b, a, data.base_frequency, data.octave_length));
                    }
                }

                j -= 1;
            }
        }

        _osc_port.send(bundle);
    }
};

self.onmessage = function (m) {
    "use strict";

    var data = m.data,

        cmd = data.cmd,
        arg = data.arg;

    if (cmd === _OSC_ENABLE) {
        _osc = true;

        _connect(arg);
    } else if (cmd === _OSC_DISABLE) {
        _osc = false;
        
        _disconnect();
    } else if (cmd === _OSC_FRAME_DATA) {
        _sendFrameBundle(data);
    }
};