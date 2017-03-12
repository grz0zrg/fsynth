/* jslint browser: true */


var _pause = function () {
    window.cancelAnimationFrame(_raf);

    _stopOscillators();
    _disconnectScriptNode();

    _fs_state = 1;

    //if (_glsl_error) {
    //    return;
    //}

    _pause_time = performance.now();
};

var _play = function (update_global_time) {
    _fs_state = 0;

    if (_glsl_error) {
        return;
    }

    if (!_fasEnabled() && _osc_mode === _FS_WAVETABLE) {
        _connectScriptNode();
    }

    window.cancelAnimationFrame(_raf);
    _raf = window.requestAnimationFrame(_frame);

    if (update_global_time === undefined) {
        _time += (performance.now() - _pause_time);
    }
    
};

var _rewind = function () {
    if (_fs_state === 0 && _glsl_error === false) {
        _time = performance.now();
    } else {
        _time = 0;
        _pause_time = 0;
        
        if (_show_globaltime) {
            _time_infos.innerHTML = parseInt(_time, 10);
        }
    }
};

var _stop = function () {
    _stopOscillators();
    
    window.cancelAnimationFrame(_raf);

    _disconnectScriptNode();

    _pause_time = performance.now();

    //_fs_state = 1;

    //_rewind();
};