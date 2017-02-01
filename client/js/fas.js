/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _fas = {
        address: "127.0.0.1:3003",
        enabled: false,
        status: null,
        worker: new Worker("js/worker/fas.js")
    },
    
    _fas_address_input = document.getElementById("fs_fas_address"),
    
    _FAS_ENABLE = 0,
    _FAS_DISABLE = 1,
    _FAS_AUDIO_INFOS = 2,
    _FAS_GAIN_INFOS = 3,
    _FAS_FRAME = 4;

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
    _fas.worker.postMessage({
            cmd: cmd,
            arg: data.buffer
        }, [data.buffer]);
};

var _fasEnable = function () {
    _fasNotify(_FAS_ENABLE, {
            address: _fas.address,
            audio_infos: _audio_infos
        });
    
    _fas.enabled = true;
};

var _fasDisable = function () {
    _fasNotify(_FAS_DISABLE);
    
    _fas.enabled = false;
};

var _fasEnabled = function () {
    return _fas.enabled;
};

var _fasStatus = function (status) {
    var fs_fas_element = document.getElementById("fs_fas_status");
    
    if (status) {
        fs_fas_element.classList.add("fs-server-status-on");
    } else {
        fs_fas_element.classList.remove("fs-server-status-on");
    }
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
    
    _fas.worker.addEventListener('message', function (m) {
            var data = m.data;

            if (data.status === "open") {
                _fasStatus(true);
            } else if (data.status === "error") {
                _fasStatus(false);
            } else if (data.status === "close") {
                _fasStatus(false);

                _notification("Connection to native audio was lost, trying again in ~5s, make sure it is running!", 2500);
            }
        }, false);
};
