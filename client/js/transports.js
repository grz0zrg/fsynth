/* jslint browser: true */

var _pause = function () {
    window.cancelAnimationFrame(_raf);
    
    _stopOscillators();

    _fs_state = 1;
    
    _fasPause();
    
    _pauseWorklet();
    
    _pause_time = performance.now();

    _resetMIDIDevice();
};

var _play = function (update_global_time) {
    _fs_state = 0;

    if (_glsl_error) {
        return;
    }

    window.cancelAnimationFrame(_raf);
    _raf = window.requestAnimationFrame(_frame);

    if (update_global_time === undefined) {
        _time += (performance.now() - _pause_time);
    }

    _audio_context.resume().then(() => {
        console.log('Playback resumed successfully');
    });
    
    _playWorklet();
};

var _rewind = function () {
    _globalFrame = 0;
    
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

    _pause_time = performance.now();

    _resetMIDIDevice();
};