/* jslint browser: true */

/* global CodeMirror, performance*/

// WUI - https://github.com/grz0zrg/wui
/*#include wui/wui.js*/

// CodeMirror - https://codemirror.net/
/*#include codemirror/codemirror.js*/
/*#include codemirror/addon/search/searchcursor.js*/
/*#include codemirror/addon/search/match-highlighter.js*/
/*#include codemirror/addon/search/matchesonscrollbar.js*/
/*#include codemirror/addon/edit/closebrackets.js*/
/*#include codemirror/addon/edit/matchbrackets.js*/
/*#include codemirror/addon/scroll/simplescrollbars.js*/
/*#include codemirror/addon/scroll/annotatescrollbar.js*/
/*#include codemirror/addon/selection/active-line.js*/
/*#include codemirror/codemirror_glsl.js*/

// sharedb - https://github.com/share/sharedb
/*#include sharedb/sharedb.js*/
/*#include sharedb/ot-text.js*/

/*#include resize_throttler/resize_throttler.js*/

window.onload = function() {
var FragmentSynth = new (function () {
    "use strict";

    /***********************************************************
        Globals.
    ************************************************************/

    /*#include notification.js*/

    var _getSessionName = function () {
        var url_parts = window.location.pathname.split('/');

        return url_parts[url_parts.length - 1];
    };

    window.performance = window.performance || {};
    performance.now = (function() {
      return performance.now       ||
             performance.mozNow    ||
             performance.msNow     ||
             performance.oNow      ||
             performance.webkitNow ||
             function() { return new Date().getTime(); };
    })();

    window.AudioContext = window.AudioContext || window.webkitAudioContext || false;

    window.requestAnimationFrame =  window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                                    window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame;

    if (!window.AudioContext) {
        _fail("The Web Audio API is not available, please use a Web Audio capable browser.", true);

        return;
    }

    if (!window.cancelAnimationFrame) {
        _fail("The cancelAnimationFrame function is not available, please use a web browser with cancelAnimationFrame support.", true);

        return;
    }

    if (!window.localStorage) {
        _fail("The localStorage API is not available, please use a web browser with localStorage support.", true);

        return;
    }

    if (!window.FileReader) {
        _fail("FileReader API is not available, please use a web browser with FileReader support.", true);

        return;
    }

    if (!window.Blob) {
        _fail("Blob API is not available, please use a web browser with Blob support.", true);

        return;
    }

    if (!window.File) {
        _fail("File API is not available, please use a web browser with File API support.", true);

        return;
    }

    if (typeof(Worker) === "undefined") {
        _fail("Web Workers are not available, please use a web browser with Web Workers support.", true);

        return;
    }

    /***********************************************************
        Fields.
    ************************************************************/

    var _fs_state = 1,

        _username = localStorage.getItem('fs-user-name'),
        _local_session_settings = localStorage.getItem(_getSessionName()),

        _red_curtain_element = document.getElementById("fs_red_curtain"),
        _user_name_element = document.getElementById("fs_user_name"),
        _time_infos = document.getElementById("fs_time_infos"),
        _hz_infos = document.getElementById("fs_hz_infos"),
        _xy_infos = document.getElementById("fs_xy_infos"),

        _haxis_infos = document.getElementById("fs_haxis_infos"),
        _vaxis_infos = document.getElementById("fs_vaxis_infos"),

        _canvas_container = document.getElementById("canvas_container"),
        _canvas = document.createElement("canvas"),

        _canvas_width  = 1024,
        _canvas_height = 439,//Math.round(window.innerHeight / 2) - 68,

        _canvas_width_m1 = _canvas_width - 1,
        _canvas_height_mul4 = _canvas_height * 4,

        _render_width = _canvas_width,
        _render_height = _canvas_height,

        _code_editor,
        _code_editor_element = document.getElementById("code"),
        _code_editor_theme = localStorage.getItem('fs-editor-theme'),
        _code_editor_theme_link,
        _code_editor_highlight = {
                showToken: /\w/,
                annotateScrollbar: true
            },
        _code_editor_settings = {
            value: "",
            theme: ((_code_editor_theme === null) ? "seti" : _code_editor_theme),
            matchBrackets: true,
            //autoCloseBrackets: true,
            lineNumbers: true,
            styleActiveLine: true,
            scrollbarStyle: "native",
            mode: "text/x-glsl"
        },

        _compile_timer,

        _undock_code_editor = false,

        _xyf_grid = false,

        _glsl_error = false,
        
        // settings
        _show_globaltime = false,
        _cm_highlight_matches = false,
        _cm_show_linenumbers = true,
        _cm_advanced_scrollbar = false,

        // mouse cursor over canvas
        _cx,
        _cy,

        _mx,
        _my,

        _nmx,
        _nmy,

        _cnmx,
        _cnmy,

        _mouse_btn = 0,

        _LEFT_MOUSE_BTN = 1,
        _RIGHT_MOUSE_BTN = 2,

        _fps = 60,

        _raf,

        _gl,

        _play_position_markers = [],

        _webgl_opts = {
                preserveDrawingBuffer: true
            },

        _prev_data = new Uint8Array(_canvas_height_mul4),
        _data = new Uint8Array(_canvas_height_mul4),
        _temp_data = new Uint8Array(_canvas_height_mul4),

        _midi_out_f,
        _midi_out = true,

        _quad_vertex_buffer,

        _program,

        _controls = {},

        _fragment_input_data = [],

        _input_panel_element = document.getElementById("fs_input_panel"),

        _codemirror_line_widgets = [],

        _time = 0,

        _pause_time = 0,

        _hover_freq = null,

        _input_channel_prefix = "iInput";


    /***********************************************************
        App. Includes.
    ************************************************************/

    /*#include config.js*/
    /*#include tools.js*/
    /*#include audio.js*/
    /*#include graphics.js*/
    /*#include glsl.js*/
    /*#include network.js*/
    /*#include discuss.js*/
    /*#include inputs.js*/
    /*#include editor.js*/
    /*#include transports.js*/
    /*#include ui.js*/
    /*#include fas.js*/

    /***********************************************************
        Functions.
    ************************************************************/

    var _updateScore = function (update_obj, update) {
        var prev_base_freq = _audio_infos.base_freq,
            prev_octave = _audio_infos.octaves,

            base_freq = _audio_infos.base_freq,
            octave = _audio_infos.octaves,

            prev_width = _canvas_width,
            prev_height = _canvas_height;

        if (update_obj["base_freq"] !== undefined) {
            base_freq = update_obj.base_freq;
        }

        if (update_obj["octave"] !== undefined) {
            octave = update_obj.octave;
        }

        _disableNotesProcessing();

        if (update_obj.height) {
            _canvas_height = update_obj.height;
            _canvas.height = _canvas_height;
            _canvas.style.height = _canvas_height + 'px';
            _canvas_height_mul4 = _canvas_height * 4;

            _vaxis_infos.style.height = _canvas_height + "px";

            _prev_data = new Uint8Array(_canvas_height_mul4);
            _data = new Uint8Array(_canvas_height_mul4);
            _temp_data = new Uint8Array(_canvas_height_mul4);

            _gl.viewport(0, 0, _canvas.width, _canvas.height);

            _updatePlayMarkersHeight(_canvas_height);
        }

        if (update_obj.width) {
            _canvas_width = update_obj.width;
            _canvas.width = _canvas_width;
            _canvas.style.width = _canvas_width + 'px';

            _gl.viewport(0, 0, _canvas.width, _canvas.height);
        }

        _generateOscillatorSet(_canvas_height, base_freq, octave);

        _compile();

        _updateCodeView();

        _updateAllPlayPosition();

        _fasNotify(_FAS_AUDIO_INFOS, _audio_infos);

        _enableNotesProcessing();

        WUI_RangeSlider.setValue("fs_score_width_input", _canvas_width);
        WUI_RangeSlider.setValue("fs_score_height_input", _canvas_height);
        WUI_RangeSlider.setValue("fs_score_octave_input", octave);
        WUI_RangeSlider.setValue("fs_score_base_input", base_freq);

        if (update) {
            _shareSettingsUpd([
                    prev_width, _canvas_width,
                    prev_height, _canvas_height,
                    prev_octave, octave,
                    prev_base_freq, base_freq
                ]);
        }
    };

    /***********************************************************
        Init.
    ************************************************************/
    
    _audioInit();

    if (!_username) {
        _username = "Anonymous";
    }

    _user_name_element.innerHTML = _username;

    //_canvas_width = _getElementOffset(_canvas_container).width;

    _render_width = _canvas_width;

    _canvas.width  = _render_width;
    _canvas.height = _render_height;

    _canvas.style.width  = _canvas_width  + 'px';
    _canvas.style.height = _canvas_height + 'px';

    _canvas_container.appendChild(_canvas);

    _vaxis_infos.style.height = _canvas_height + "px";

    // CodeMirror
    if (!_code_editor_theme) {
        _code_editor_theme = "seti";
    }

    _changeEditorTheme(_code_editor_theme);
    
    _code_editor = new CodeMirror(_code_editor_element, _code_editor_settings);
    _code_editor.setValue(document.getElementById("fragment-shader").text);

    CodeMirror.on(_code_editor, 'change', function (instance, change_obj) {
        clearTimeout(_compile_timer);
        _compile_timer = setTimeout(_compile, 500);
    });

    CodeMirror.on(_code_editor, 'changes', function (instance, changes) {
        _shareCodeEditorChanges(changes);
    });

    // WebGL
    _gl = _canvas.getContext("webgl", _webgl_opts) || _canvas.getContext("experimental-webgl", _webgl_opts);

    if (!_gl) {
        _fail("The WebGL API is not available, please try with a WebGL ready browser.", true);

        return;
    }

    _buildScreenAlignedQuad();

    _gl.viewport(0, 0, _canvas.width, _canvas.height);

    _compile();

    // setup user last settings for this session if any
    if (_local_session_settings) {
        _local_session_settings = JSON.parse(_local_session_settings);
        if ('gain' in _local_session_settings) {
            _volume = _local_session_settings.gain;

            WUI_RangeSlider.setValue("mst_slider", _volume, true);
        }
    } else {
        _local_session_settings = {
            gain: _volume,
        };
    }

    //_addPlayPositionMarker(_canvas_width / 4);
    //_addPlayPositionMarker(_canvas_width - _canvas_width / 4);

    _uiInit();

    _initNetwork();

    _play();
    
    /*#include events.js*/
    
    window.gb_code_editor_settings = _code_editor_settings;
    window.gb_code_editor = _code_editor;
    window.gb_code_editor_theme = _code_editor_theme;
})();
}
