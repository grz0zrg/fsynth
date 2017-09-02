/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _osc = {
        address: "127.0.0.1:8081",
        enabled: false,
        status: null,
        worker: new Worker("dist/worker/osc.min.js")
    },

    //_osc_address_input = document.getElementById("fs_osc_address"),
    
    _OSC_ENABLE = 0,
    _OSC_DISABLE = 1,
    _OSC_FRAME_DATA = 2;

/***********************************************************
    Functions.
************************************************************/

var _oscNotify = function (cmd, data) {
    _osc.worker.postMessage({
            cmd: cmd,
            arg: data
        });
};

var _oscNotifyFast = function (cmd, data) {
    var output_data_buffer = [],
        i = 0;

    for (i = 0; i < data.length; i += 1) {
        output_data_buffer.push(data[i].buffer);
    }
    
    _osc.worker.postMessage({
            cmd: cmd,
            arg: output_data_buffer,
            mono: _audio_infos.monophonic,
            float: _audio_infos.float_data,
            base_frequency: _audio_infos.base_freq,
            octave_length: _audio_infos.h / _audio_infos.octaves,
            channels: _output_channels
        }, output_data_buffer);
};

var _oscEnable = function () {
    _oscNotify(_OSC_ENABLE, {
            address: _osc.address,
        });
    
    _osc.enabled = true;
};

var _oscDisable = function () {
    _oscNotify(_OSC_DISABLE);
    
    _osc.enabled = false;
};

var _oscEnabled = function () {
    return _osc.enabled;
};

/***********************************************************
    Init.
************************************************************/

var _oscInit = function () {
    var address = localStorage.getItem("osc-address");
    if (address !== null) {
        _osc.address = address;
    }

/*
    _osc_address_input.value = _osc.address;
    
    _osc_address_input.addEventListener('input', function () {
            _osc.address = this.value;
        
            localStorage.setItem("fas-address", _osc.address);
        });
*/
    _osc.worker.addEventListener("message", function (m) {
            var data = m.data;

            if (data.status === "ready") {
                _notification("OSC: Connected to " + _osc.address, 2500);
            } else if (data.status === "error") {
                _notification("OSC: Connection error!", 2500);
            } else if (data.status === "close") {
                _notification("OSC: Connection was lost, trying again in ~5s!", 2500);
            }
        }, false);
};
