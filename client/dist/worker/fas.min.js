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
    _FAS_BANK_INFOS = 2,
    _FAS_SYNTH_INFOS = 3,
    _FAS_FRAME = 4,
    _FAS_CHN_INFOS = 5,
    _FAS_CHN_FX_INFOS = 6,
    _FAS_ACTION = 7,
    _FAS_INSTRUMENT_INFOS = 8,

    _FAS_ACTION_RELOAD = 0,
    _FAS_ACTION_RETRIGGER = 1,
    _FAS_ACTION_FAUST_GENS_RELOAD = 2,
    _FAS_ACTION_FAUST_EFFS_RELOAD = 3,
    _FAS_ACTION_PAUSE = 4,
    _FAS_ACTION_PLAY = 5,
    _FAS_ACTION_WAVES_RELOAD = 6,
    _FAS_ACTION_IMPULSES_RELOAD = 7,
    
    _fas_chn_settings_queue = [];

/***********************************************************
    Functions.
************************************************************/

var _appendBuffer = function(buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  };

var _getBankInfosBuffer = function (bank_infos) {
    if (bank_infos.h <= 0 ||
        bank_infos.octaves <= 0 ||
        bank_infos.base_freq <= 0) {
        return;
    }

    var bank_infos_buffer = new ArrayBuffer(8 + 4 + 4 + (4 + 4) + 8),
        uint8_view = new Uint8Array(bank_infos_buffer, 0, 1),
        uint32_view = new Uint32Array(bank_infos_buffer, 8, 3),
        float64_view = new Float64Array(bank_infos_buffer, 24);

    uint8_view[0] = 0; // packet id
    uint32_view[0] = bank_infos.h;
    uint32_view[1] = bank_infos.octaves;
    uint32_view[2] = bank_infos.float_data === true ? 1 : 0;

    float64_view[0] = bank_infos.base_freq;

    return bank_infos_buffer;
};

var _getSynthInfosBuffer = function (synth_infos) {
    var synth_infos_buffer = new ArrayBuffer(8 + 8 + 8),
        uint8_view = new Uint8Array(synth_infos_buffer, 0, 1),
        uint32_view = new Uint8Array(synth_infos_buffer, 8, 1),
        float64_view = new Float64Array(synth_infos_buffer, 16, 1);

    uint8_view[0] = 2;
    uint32_view[0] = synth_infos.target;
    float64_view[0] = synth_infos.value;

    return synth_infos_buffer;
};

var _sendBankInfos = function (bank_infos) {
    if (!_fas) {
        return;
    }

    if (_fas_ws.readyState !== 1) {
        setTimeout(_sendBankInfos, 1000, bank_infos);
        return;
    }

    try {
        _fas_ws.send(_getBankInfosBuffer(bank_infos));
    } finally {

    }
};

var _sendSynthInfos = function (synth_infos) {
    if (!_fas) {
        return;
    }

    if (_fas_ws.readyState !== 1) {
        setTimeout(_sendSynthInfos, 1000, synth_infos);
        return;
    }

    try {
        _fas_ws.send(_getSynthInfosBuffer(synth_infos));
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
    
    if (action.type === _FAS_ACTION_RELOAD || 
        action.type === _FAS_ACTION_FAUST_GENS_RELOAD || 
        action.type === _FAS_ACTION_FAUST_EFFS_RELOAD ||
        action.type === _FAS_ACTION_PAUSE ||
        action.type === _FAS_ACTION_PLAY ||
        action.type === _FAS_ACTION_WAVES_RELOAD ||
        action.type === _FAS_ACTION_IMPULSES_RELOAD) {
        action_buffer = new ArrayBuffer(8);
        uint8_view = new Uint8Array(action_buffer, 0, 2);

        uint8_view[0] = 5;
        uint8_view[1] = action.type;
    } else if (action.type === _FAS_ACTION_RETRIGGER) {
        action_buffer = new ArrayBuffer(8 + 4 + 4);
        uint8_view = new Uint8Array(action_buffer, 0, 2);
        uint32_view = new Uint32Array(action_buffer, 8, 2);

        uint8_view[0] = 5;
        uint8_view[1] = action.type;
        uint32_view[0] = action.instrument;
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

var _doChnInfos = function (_doChnInfos) {
    var queue = _fas_chn_settings_queue.slice();

    var i = 0;
    for (i = 0; i < queue.length; i += 1) {
        _fas_chn_settings_queue.splice(i, 1);

        _sendChnInfos(queue[i]);
    }
};

var _sendInstrInfos = function (instr_infos) {
    if (!_fas) {
        return;
    }

    if (_fas_ws.readyState !== 1) {
        //_fas_chn_settings_queue.push(chn_infos);

        setTimeout(_sendInstrInfos, 1000, instr_infos);
        return;
    }

    var buffer = new ArrayBuffer(8 + 8 + 8);
    var uint8_view = new Uint8Array(buffer, 0, 1);
    var uint32_view = new Uint32Array(buffer, 8, 2);
    var float64_view = new Float64Array(buffer, 16, 1);

    uint8_view[0] = 6;
    uint32_view[0] = instr_infos.instrument;
    uint32_view[1] = instr_infos.target;
    float64_view[0] = instr_infos.value;

    try {
        _fas_ws.send(buffer);
    } finally {

    }
};

var _sendChnInfos = function (chn_infos) {
    if (!_fas) {
        return;
    }

    if (_fas_ws.readyState !== 1) {
        //_fas_chn_settings_queue.push(chn_infos);

        setTimeout(_sendChnInfos, 1000, chn_infos);
        return;
    }

    var buffer = new ArrayBuffer(8 + 8 + 8);
    var uint8_view = new Uint8Array(buffer, 0, 1);
    var uint32_view = new Uint32Array(buffer, 8, 2);
    var float64_view = new Float64Array(buffer, 16, 1);

    uint8_view[0] = 3;
    uint32_view[0] = chn_infos.chn;
    uint32_view[1] = chn_infos.target;
    float64_view[0] = chn_infos.value;

    try {
        _fas_ws.send(buffer);
    } finally {

    }
};

var _sendChnFxInfos = function (chn_fx_infos) {
    if (!_fas) {
        return;
    }

    if (_fas_ws.readyState !== 1) {
        //_fas_chn_settings_queue.push(chn_infos);

        setTimeout(_sendChnFxInfos, 1000, chn_fx_infos);
        return;
    }

    var buffer = new ArrayBuffer(8 + 8 + 8 + 8);
    var uint8_view = new Uint8Array(buffer, 0, 1);
    var uint32_view = new Uint32Array(buffer, 8, 3);
    var float64_view = new Float64Array(buffer, 24, 1);

    uint8_view[0] = 4;
    uint32_view[0] = chn_fx_infos.chn;
    uint32_view[1] = chn_fx_infos.slot;
    uint32_view[2] = chn_fx_infos.target;
    float64_view[0] = chn_fx_infos.value;

    try {
        _fas_ws.send(buffer);
    } finally {

    }
};

var _sendFrame = function (frame, float) {
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
    uint32_view = new Uint32Array(fas_data, 8, 1);
    i = 0;
    
    uint8_view[0] = 1; // packet id
    uint32_view[0] = frame.length;

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
            var data = new Int32Array(event.data);
            var datad = new Float64Array(event.data, 2);
            if (data[0] === 0) {
                postMessage({
                        status: "streaminfos",
                        load: data[1],
                        latency: datad[0]
                    });
            }
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
    } else if (cmd === _FAS_BANK_INFOS) {
        _sendBankInfos(arg);
    } else if (cmd === _FAS_SYNTH_INFOS) {
        _sendSynthInfos(arg);
    } else if (cmd === _FAS_FRAME) {
        _sendFrame(arg, data.float);
    } else if (cmd === _FAS_CHN_INFOS) {
        _sendChnInfos(arg);
    } else if (cmd === _FAS_CHN_FX_INFOS) {
        _sendChnFxInfos(arg);
    } else if (cmd === _FAS_ACTION) {
        _sendAction(arg);
    } else if (cmd === _FAS_INSTRUMENT_INFOS) {
        _sendInstrInfos(arg);
    }
};
