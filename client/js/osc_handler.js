/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _osc = {
        address: "127.0.0.1:8081",
        in: false,
        out: false,
        enabled: false,
        status: null,
        worker: new Worker("dist/worker/osc.min.js"),
        inputs: [],
        queue: [],
        queue_timeout: null
    },

    _osc_address_input = document.getElementById("fs_osc_inout_address"),
    
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
            float: _audio_infos.float_data,
            base_frequency: _audio_infos.base_freq,
            octave_length: _audio_infos.h / _audio_infos.octaves,
            channels: _output_channels
        }, output_data_buffer);
};

var _oscEnable = function () {
    if (!_osc.enabled) {
        _oscNotify(_OSC_ENABLE, {
                address: _osc.address,
            });

        _osc.enabled = true;
    }
};

var _oscDisable = function () {
    if (!_osc.in && !_osc.out) {
        _oscNotify(_OSC_DISABLE);

        _osc.enabled = false;
    }
};

var _oscEnabled = function () {
    return _osc.enabled;
};

var _processOSCInputsQueue = function () {
    var i = 0,
        
        name;
    
    if (!_program) {
        clearTimeout(_osc.queue_timeout);
        _osc.queue_timeout = setTimeout(_processOSCInputsQueue, 2000);
        
        return;
    }
    
    _useProgram(_program);
    for (i = 0; i < _osc.queue.length; i += 1) {
        name = _osc.queue[i];
        
        _setUniforms(_gl, _osc.inputs[name].type, _program, name, _osc.inputs[name].data);
    }
    
    _osc.queue = [];
};

/***********************************************************
    Init.
************************************************************/

var _oscInit = function () {
    var address = localStorage.getItem("osc-address"),
        input;
    if (address !== null) {
        _osc.address = address;
    }

    _osc_address_input.value = _osc.address;
    
    _osc_address_input.addEventListener('input', function () {
            _osc.address = this.value;
        
            localStorage.setItem("osc-address", _osc.address);

            if (_oscEnabled) {
                _oscDisable();
                _oscEnable();
            }
        });

    _osc.worker.addEventListener("message", function (m) {
            var data = m.data, i;

            if (data.status === "data") {
                if (!_osc.inputs.hasOwnProperty(data.osc_input.name)) {
                    if (!data.osc_input.i) {
                        data.osc_input.i = data.osc_input.v.length;
                    }
                    
                    _osc.inputs[data.osc_input.name] = {
                        comps: undefined,
                        type: "float",
                        count: data.osc_input.i,
                        data: []
                    };
                    
                    _glsl_compilation();
                }
                
                if (data.osc_input.hasOwnProperty("i")) {
                    _osc.inputs[data.osc_input.name].data[data.osc_input.i] = data.osc_input.v;

                    for (i = 0; i < _osc.inputs[data.osc_input.name].data.length; i += 1) {
                        if (_osc.inputs[data.osc_input.name].data[i] === undefined) {
                            _osc.inputs[data.osc_input.name].data[i] = 0;
                        }
                    }

                    if (_osc.inputs[data.osc_input.name].count != _osc.inputs[data.osc_input.name].data.length) {
                        _osc.inputs[data.osc_input.name].count = _osc.inputs[data.osc_input.name].data.length;
                        _glsl_compilation();
                    }
                } else if (data.osc_input.hasOwnProperty("v")) {
                    _osc.inputs[data.osc_input.name].data = data.osc_input.v;
                }

                if (!_program) {
                    _osc.queue.push(data.osc_input.name);
                    
                    clearTimeout(_osc.queue_timeout);
                    _osc.queue_timeout = setTimeout(_processOSCInputsQueue, 2000);
                } else {
                    _useProgram(_program);
                    _setUniforms(_gl, _osc.inputs[data.osc_input.name].type, _program, data.osc_input.name, _osc.inputs[data.osc_input.name].data);
                }
            } else if (data.status === "videoData") {
                input = _fragment_input_data[Math.round(data.videoData[0])];
                if (input.type === 3) {
                    if (data.videoData[1]) {
                        input.playrate = data.videoData[1];
                        input.video_elem.playbackRate = data.videoData[1];
                    } else if (data.videoData[2]) {
                        input.videostart = data.videoData[2];
                    } else if (data.videoData[3]) {
                        input.videoend = data.videoData[3];
                    } else if (data.videoData[4]) {
                        input.video_elem.currentTime = input.video_elem.duration * data.videoData[4];
                    }
                }
            } else if (data.status === "clear") { // clear up OSC set uniforms
                _osc.inputs = [];
                _osc.queue = [];
                
                _glsl_compilation();
            } else if (data.status === "ready") {
                _notification("OSC: Connected to " + _osc.address, 2500);
            } else if (data.status === "error") {
                console.log(data.error);

                _notification("OSC: Connection error!", 2500);
            } else if (data.status === "close") {
                _notification("OSC connection lost, trying again in ~5s!", 2500);
            }
        }, false);
};
