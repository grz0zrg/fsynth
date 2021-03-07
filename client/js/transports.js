/* jslint browser: true */

var _pause = function () {
    if (!document.getElementById("fs_tb_pause").classList.contains("wui-toolbar-toggle-on")) {
        WUI_ToolBar.toggle(_wui_main_toolbar, 6);
    }

    window.cancelAnimationFrame(_raf);
    
    _fs_state = 1;
    
    _fasPause();
    
    _pause_time = performance.now();

    // clean playing MIDI notes
    _MIDInotesCleanup();

    // clean previous midi data (used to dectect note-on events)
    for (var i = 0; i < _output_channels; i += 1) {
        if (_prev_midi_data[i]) {
            _prev_midi_data[i].fill(0, 0);
        }
    }

    _resetMIDIDevice();

    _pjsPauseAll();
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

    try {
        // compatibility
        var ar = new Function("audio_ctx", "" +
            "audio_ctx.resume().then(() => {" +
            "    console.log('Playback resumed successfully');" +
            "});");
        
        ar(_audio_context);
    } catch (e) {
        console.log(e);
    }

    if (_first_play) {
        _pjsCompileAll();

        _first_play = false;
    }

    _pjsResumeAll();

    _fasUnpause();
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
    window.cancelAnimationFrame(_raf);

    _pause_time = performance.now();

    _resetMIDIDevice();
};