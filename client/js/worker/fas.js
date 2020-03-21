/*jslint browser: true*/
/*continue: true*/
/*global self,postMessage*/

/*
    Dedicated websocket "fas" worker, send data to the server if enabled
    https://github.com/grz0zrg/fas
*/

/***********************************************************
    Fields.
************************************************************/

var _fas = false,
    _fas_timeout,
    _fas_ws,

    _FAS_ENABLE = 0,
    _FAS_DISABLE = 1,
    _FAS_AUDIO_INFOS = 2,
    _FAS_GAIN_INFOS = 3,
    _FAS_FRAME = 4,
    _FAS_CHN_INFOS = 5,
    _FAS_ACTION = 6,
    
    _FAS_ACTION_RELOAD = 0,
    _FAS_ACTION_RETRIGGER = 1;

/***********************************************************
    Functions.
************************************************************/

var _appendBuffer = function(buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  };

var _getAudioInfosBuffer = function (audio_infos) {
    if (audio_infos.h <= 0 ||
        audio_infos.octaves <= 0 ||
        audio_infos.base_freq <= 0) {
        return;
    }

    var audio_infos_buffer = new ArrayBuffer(8 + 4 + 4 + (4 + 4) + 8),
        uint8_view = new Uint8Array(audio_infos_buffer, 0, 1),
        uint32_view = new Uint32Array(audio_infos_buffer, 8, 3),
        float64_view = new Float64Array(audio_infos_buffer, 24);

    uint8_view[0] = 0; // packet id
    uint32_view[0] = audio_infos.h;
    uint32_view[1] = audio_infos.octaves;
    uint32_view[2] = audio_infos.float_data === true ? 1 : 0;

    float64_view[0] = audio_infos.base_freq;

    return audio_infos_buffer;
};

var _getGainBuffer = function (audio_infos) {
    var gain_buffer = new ArrayBuffer(8 + 8),
        uint8_view = new Uint8Array(gain_buffer, 0, 1),
        float64_view = new Float64Array(gain_buffer, 8);

    uint8_view[0] = 2;
    float64_view[0] = audio_infos.gain;

    return gain_buffer;
};

var _sendAudioInfos = function (audio_infos) {
    if (!_fas) {
        return;
    }

    if (_fas_ws.readyState !== 1) {
        setTimeout(_sendAudioInfos, 1000, audio_infos);
        return;
    }

    try {
        _fas_ws.send(_getAudioInfosBuffer(audio_infos));
    } finally {

    }
};

var _sendGain = function (audio_infos) {
    if (!_fas) {
        return;
    }

    if (_fas_ws.readyState !== 1) {
        setTimeout(_sendGain, 1000, audio_infos);
        return;
    }

    try {
        _fas_ws.send(_getGainBuffer(audio_infos));
    } finally {

    }
};

var _sendAction = function (action) {
    if (!_fas) {
        return;
    }
    
    var action_buffer,
        uint8_view,
        uint32_view;
    
    if (action.type === _FAS_ACTION_RELOAD) {
        action_buffer = new ArrayBuffer(8 + 8);
        uint8_view = new Uint8Array(action_buffer, 0, 2);

        uint8_view[0] = 4;
        uint8_view[1] = action.type;
    } else if (action.type === _FAS_ACTION_RETRIGGER) {
        action_buffer = new ArrayBuffer(8 + 8 + 4 + 4);
        uint8_view = new Uint8Array(action_buffer, 0, 2);
        uint32_view = new Uint32Array(action_buffer, 8, 2);

        uint8_view[0] = 4;
        uint8_view[1] = action.type;
        uint32_view[0] = action.chn;
        uint32_view[1] = action.note;
    }
    
    if (_fas_ws.readyState !== 1) {
        setTimeout(_sendAction, 1000, action);
        return;
    }

    try {
        _fas_ws.send(action_buffer);
    } finally {

    }
}

var _sendChnInfos = function (chn_infos) {
    if (!_fas) {
        return;
    }

    if (_fas_ws.readyState !== 1) {
        setTimeout(_sendChnInfos, 1000, chn_infos);
        return;
    }

    var max_effects_slot = 24; // must match server limit TODO : should get it from server...
    var max_double_params = 11; // same as above

    var buffer = new ArrayBuffer(8 + 8 + (40 * chn_infos.length)),
        buffer_efx = new ArrayBuffer((max_effects_slot * (8 + (max_double_params * 8))) * chn_infos.length),
        uint8_view = new Uint8Array(buffer, 0, 1),
        uint32_view = new Uint32Array(buffer, 8, 1),
        int32_view,
        float64_view,
        i = 0, j = 0, k = 0;

    uint8_view[0] = 3;
    uint32_view[0] = chn_infos.length;

    // for all channels
    for (i = 0; i < chn_infos.length; i += 1) {
        uint8_view = new Uint32Array(buffer, 16 + i * 40, 3);
        float64_view = new Float64Array(buffer, 16 + 16 + i * 40);
        
        uint8_view[0] = 0;
        uint8_view[1] = 0;
        uint8_view[2] = 0;
        
        float64_view[0] = 0;
        float64_view[1] = 0;
        float64_view[2] = 0;

        var chn_info = chn_infos[i];
        var chn_osc_settings = chn_info.osc;
            
        if (chn_osc_settings[1]) {
            uint8_view[0] = chn_osc_settings[1];
        }
    
        if (chn_osc_settings[3]) {
            uint8_view[1] = chn_osc_settings[3];
        }

        if (chn_osc_settings[5]) {
            uint8_view[2] = chn_osc_settings[5];
        }
        
        if (chn_osc_settings[7]) {
            float64_view[0] = chn_osc_settings[7]
        }
    
        if (chn_osc_settings[9]) {
            float64_view[1] = chn_osc_settings[9];
        }
        
        if (chn_osc_settings[11]) {
            float64_view[2] = chn_osc_settings[11];
        }

        var offset = (max_effects_slot * (8 + (max_double_params * 8))) * i;

        for (j = 0; j < max_effects_slot * 3; j += 3) {
            int32_view = new Int32Array(buffer_efx, offset, 2);
            int32_view[0] = -1;

            if (chn_info.efx[j] === undefined) {
                break;
            }

            int32_view[0] = chn_info.efx[j]; // fx id
            int32_view[1] = chn_info.efx[j+1]; // mute flag
            var fx_params = chn_info.efx[j+2]; // params

            float64_view = new Float64Array(buffer_efx, offset + 8, max_double_params);
            for (k = 0; k < max_double_params; k += 1) {
                if (fx_params[k] === undefined) {
                    break;
                }

                float64_view[k] = fx_params[k];
            }

            offset += 8 + (max_double_params * 8);
        }
    }

    var result_buffer = _appendBuffer(buffer, buffer_efx);

    try {
        _fas_ws.send(result_buffer);
    } finally {

    }
};

var _sendFrame = function (frame, mono, float) {
    if (_fas_ws.readyState !== 1) {
        return;
    }
    
    var frame_data,
        fas_data,
        uint8_view,
        uint32_view,
        data_length,
        i;
    
    if (float) {
        frame_data = new Float32Array(frame[0]);
        data_length = 8 + 4 + 4 + (frame_data.length * 4 * frame.length);
    } else {
        frame_data = new Uint8Array(frame[0]);
        data_length = 8 + 4 + 4 + (frame_data.length * frame.length);
    }
    
    fas_data = new ArrayBuffer(data_length);
    uint8_view = new Uint8Array(fas_data, 0, 1);
    uint32_view = new Uint32Array(fas_data, 8, 2);
    i = 0;
    
    uint8_view[0] = 1; // packet id
    uint32_view[0] = frame.length;
    uint32_view[1] = mono === true ? 1 : 0;

    if (float) {
        for (i = 0; i < frame.length; i += 1) {
            uint8_view = new Float32Array(fas_data, 16 + frame_data.length * 4 * i, frame_data.length);

            uint8_view.set(new Float32Array(frame[i]));
        }
    } else {
        for (i = 0; i < frame.length; i += 1) {
            uint8_view = new Uint8Array(fas_data, 16 + frame_data.length * i, frame_data.length);

            uint8_view.set(new Uint8Array(frame[i]));
        }
    }

    try {
        _fas_ws.send(fas_data);
    } finally {

    }
}

var _disconnect = function () {
    if (_fas_ws) {
        _fas_ws.close(4000);
    }

    clearTimeout(_fas_timeout);
};

var _connect = function (opts) {
    _fas_ws = new WebSocket("ws://" + opts.address);
    _fas_ws.binaryType = "arraybuffer";

    _fas_ws.onopen = function () {
        postMessage({
                status: "open"
            });
    };

    _fas_ws.onerror = function (event) {
            postMessage({
                    status: "error"
                });
        };
    
    _fas_ws.onmessage = function (event) {
            var stream_load = new Float64Array(event.data);
            postMessage({
                    status: "streamload",
                    load: stream_load
                });
        };

    _fas_ws.onclose = function (event) {
            if (_fas && event.code !== 4000) {
                postMessage({
                        status: "close"
                    });

                clearTimeout(_fas_timeout);
                _fas_timeout = setTimeout(_connect, 5000, opts);
            }
        };
};

self.onmessage = function (m) {
    "use strict";

    var data = m.data,

        cmd = data.cmd,
        arg = data.arg;

    if (cmd === _FAS_ENABLE) {
        _fas = true;

        _connect(arg);
    } else if (cmd === _FAS_DISABLE) {
        _fas = false;

        _disconnect();
    } else if (cmd === _FAS_AUDIO_INFOS) {
        _sendAudioInfos(arg);
    } else if (cmd === _FAS_GAIN_INFOS) {
        _sendGain(arg);
    } else if (cmd === _FAS_FRAME) {
        _sendFrame(arg, data.mono, data.float);
    } else if (cmd === _FAS_CHN_INFOS) {
        _sendChnInfos(arg);
    } else if (cmd === _FAS_ACTION) {
        _sendAction(arg);
    }
};
