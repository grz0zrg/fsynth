/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _fas = {
        address: "127.0.0.1:3003",
        enabled: false,
        status: null,
        worker: new Worker("dist/worker/fas.min.js")
    },
    
    _fas_address_input = document.getElementById("fs_fas_address"),
    
    _FAS_ENABLE = 0,
    _FAS_DISABLE = 1,
    _FAS_AUDIO_INFOS = 2,
    _FAS_GAIN_INFOS = 3,
    _FAS_FRAME = 4,
    _FAS_CHN_INFOS = 5,
    _FAS_CHN_FX_INFOS = 6,
    _FAS_ACTION = 7;

/***********************************************************
    Functions.
************************************************************/

var _fasNotify = function (cmd, data) {
    _fas.worker.postMessage({
            cmd: cmd,
            arg: data
        });
};

var _fasNotifyFast = function (cmd, data) {
    var output_data_buffer = [],
        i = 0;
    
    for (i = 0; i < data.length; i += 1) {
        output_data_buffer.push(data[i].buffer);
    }
    
    _fas.worker.postMessage({
            cmd: cmd,
            arg: output_data_buffer,
            mono: _audio_infos.monophonic,
            float: _audio_infos.float_data
        }, output_data_buffer);
};

var _fasPause = function () {
    if (!_fas.enabled) {
        return;
    }
    
    var data = [],
        
        i = 0;
    
    for (i = 0; i < _output_channels; i += 1) {
        data.push(new _synth_data_array(_canvas_height_mul4));
    }
    
    _fasNotifyFast(_FAS_FRAME, data);  
};

var _fasEnable = function () {
    _fasNotify(_FAS_ENABLE, {
            address: _fas.address,
            //audio_infos: _audio_infos,
            //chn_settings: _chn_settings
        });
    
    _fas.enabled = true;
    
    _disconnectWorklet();
};

var _fasDisable = function () {
    _fasNotify(_FAS_DISABLE);
    
    _fas_stream_load.textContent = "";
    
    _fas.enabled = false;
    
    _connectWorklet();
};

var _fasEnabled = function () {
    return _fas.enabled;
};

var _fasStatus = function (status) {
    var fs_fas_element = document.getElementById("fs_fas_status");
    
    if (status) {
        fs_fas_element.classList.add("fs-server-status-on");
        
        _disconnectWorklet();
    } else {
        fs_fas_element.classList.remove("fs-server-status-on");
        
        _connectWorklet();
    }
    
    _fas.status = status;
}

/***********************************************************
    Init.
************************************************************/

var _fasInit = function () {
    var address = localStorage.getItem("fas-address");
    if (address !== null) {
        _fas.address = address;
    }
    
    _fas_address_input.value = _fas.address;
    
    _fas_address_input.addEventListener('input', function () {
            _fas.address = this.value;
        
            localStorage.setItem("fas-address", _fas.address);
        });
    
    _fas.worker.addEventListener("message", function (m) {
            var data = m.data;

            if (data.status === "open") {
                _stopOscillators(); // TODO: move this somewhere else...

                _fasStatus(true);

                _fasNotify(_FAS_AUDIO_INFOS, _audio_infos);
                _fasNotify(_FAS_GAIN_INFOS, _audio_infos);

                var i = 0, j = 0, k = 0;
                for (i = 0; i < _chn_settings.length; i += 1) {
                    for (j = 0; j < _chn_settings[i].osc.length; j += 2) {
                        var value = _chn_settings[i].osc[j + 1];
                        _fasNotify(_FAS_CHN_INFOS, { target: _chn_settings[i].osc[j], chn: i, value: value });
                    }

                    var slot_index = 0;
                    for (j = 0; j < _chn_settings[i].efx.length; j += 3) {
                        _fasNotify(_FAS_CHN_FX_INFOS, { chn: i, slot: slot_index, target: 0, value: _chn_settings[i].efx[j] });
                        _fasNotify(_FAS_CHN_FX_INFOS, { chn: i, slot: slot_index, target: 1, value: _chn_settings[i].efx[j + 1] });

                        var fx_settings = _chn_settings[i].efx[j + 2];
                        for (k = 0; k < fx_settings.length; k += 1) {
                            _fasNotify(_FAS_CHN_FX_INFOS, { chn: i, slot: slot_index, target: 2 + k, value: fx_settings[k] });
                        }

                        slot_index += 1;
                    }
                    _fasNotify(_FAS_CHN_FX_INFOS, { chn: i, slot: slot_index, target: 0, value: -1 });
                }
            } else if (data.status === "streamload") {
                _fas_stream_load.textContent = data.load + "%";
            } else if (data.status === "error") {
                _fasStatus(false);

                _fas_stream_load.textContent = "";
            } else if (data.status === "close") {
                _fasStatus(false);
                
                _fas_stream_load.textContent = "";

                _notification("Connection to native audio was lost, trying again in ~5s, make sure it is running!", 2500);
            }
        }, false);
};
