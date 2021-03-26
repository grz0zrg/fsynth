/* jslint browser: true */

/* global CodeMirror, performance*/

// WUI - https://github.com/grz0zrg/wui
/*#include wui/wui.js*/

// Processing.js - http://processingjs.org/download/
/*#include processing.js/processing.min.js*/

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
/*#include codemirror/addon/display/fullscreen.js*/
/*#include codemirror/mode/glsl.js*/
/*#include codemirror/mode/javascript.js*/
/*#include codemirror/mode/clike.js*/

// showdown - https://github.com/showdownjs/showdown
/*#include showdown/showdown.min.js*/

// clipboard.js - https://github.com/zenorocha/clipboard.js
/*#include clipboard/clipboard.min.js*/

// sharedb - https://github.com/share/sharedb
/*#include sharedb/sharedb.js*/
/*#include sharedb/ot-text.js*/

// mpejs - https://github.com/WeAreROLI/mpejs
/*#include mpe.js/mpe.js*/

// https://github.com/eligrey/FileSaver.js/
/*#include filesaver/FileSaver.min.js*/

// https://anseki.github.io/leader-line/
/*#include leaderline/leader-line.min.js*/

// https://anseki.github.io/plain-overlay/
/*#include plainoverlay/plain-overlay.min.js*/

/*#include resize_throttler/resize_throttler.js*/

window.onload = function() {
    "use strict";
    
    document.body.style.overflow = "hidden";
    
var FragmentSynth = function (params) {
    "use strict";

    /***********************************************************
        Globals.
    ************************************************************/

    /*#include tools.js*/
    /*#include notification.js*/

    var _getSessionName = function () {
        var url_parts;
        
        if (params.session_name) {
            return params.session_name;
        } else {
            url_parts = window.location.pathname.split('/');
            
            return url_parts[url_parts.length - 1];
        }
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
    
    if (!window.indexedDB) {
        window.indexedDB = window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB;
        
        if (!window.indexedDB) {
            _notification("The IndexedDB API is not available, imported data will not be saved.", 10000);
        } else {
            window.indexedDB = {
                open: function () { return null; }   
            };
        }
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
    
    // check WebGL 2 support
    var test_canvas = document.createElement("canvas");
    var test_opts = {
        preserveDrawingBuffer: true,
        antialias: true,
        depth: false
    };

    if (!(test_canvas.getContext("webgl2", test_opts) || test_canvas.getContext("experimental-webgl2", test_opts))) {
        _fail("WebGL 2 is not available, please use a web browser / device with WebGL 2 support.", true);

        return;
    }

    /***********************************************************
        Fields.
    ************************************************************/

    var _motd = '<div id="fs_notify" class="fs-notify"><div class="fs-status-bar-date">27/03/2021 :</div><div class="fs-status-bar-content"><a class="fs-link" href="https://quiet.fsynth.com/d/19-fragment-2-0">Fragment 2.0 released (click for more details)</a></div></div>',
        
        _webmidi_support_msg = '<center>WebMIDI API is not enabled/supported by this browser, please use a <a class="fs-link" href="https://caniuse.com/#search=midi">compatible browser</a>.</center>',
        
        _showdown_converter = new showdown.Converter(),
        
        _fs_state = 1,
        
        _documentation_link = "https://www.fsynth.com/documentation/",

        _username = localStorage.getItem('fs-user-name'),
        _local_session_settings = localStorage.getItem(_getSessionName()),

        _current_editor_target = 0,
        
        _synth_data_array = Uint8Array,

        _red_curtain_element = document.getElementById("fs_red_curtain"),
        _user_name_element = document.getElementById("fs_user_name"),
        _username_input = document.getElementById("fs_username_input"),

        _time_infos = document.getElementById("fs_time_infos"),
        _hz_infos = document.getElementById("fs_hz_infos"),
        _xy_infos = document.getElementById("fs_xy_infos"),
        _osc_infos = document.getElementById("fs_osc_infos"),
        _poly_infos_element = document.getElementById("fs_polyphony_infos"),
        _fas_stream_load = document.getElementById("fs_fas_stream_load"),
        _fas_stream_latency = document.getElementById("fs_fas_stream_latency"),

        _synth_output_element = document.getElementById("fs_synth_output"),

        _haxis_infos = document.getElementById("fs_haxis_infos"),
        _vaxis_infos = document.getElementById("fs_vaxis_infos"),

        _canvas_container = document.getElementById("canvas_container"),
        _canvas = document.createElement("canvas"),
        
        _record_canvas = document.getElementById("fs_record_canvas"),
        _record_canvas_ctx = _record_canvas.getContext('2d'),
        _record_slice_image,
        _record_position = 0,
        _record = false,
        _record_input_count = 0,
        _record_slice_fn = [function (i, j) {
            return _data[i][j] + _osc_data[i][j] + _midi_data[i][j];
        }, function (i, j) {
            return _data[i][j];
        }, function (i, j) {
            return _osc_data[i][j];
        }, function (i, j) {
            return _midi_data[i][j];
        }],
        _record_type = 1, // record AUDIO output only by default
        _record_opts = {
            default: function (p, p2) {
                return p2;
            },
            additive: function (p, p2) {
                return p + p2;
            },
            substractive: function (p, p2) {
                return p - p2;
            },
            multiply: function (p, p2) {
                return p * p2;
            },
            f: null
        },
        
        // helper canvas
        _c_helper = document.getElementById("fs_helper_canvas"),
        _c_helper_ctx = _c_helper.getContext("2d"),
    
        // crude initial adaptation for mobiles / tablets / desktop
        _canvas_width  = (window.innerWidth < 500 ? 320 : (window.innerWidth < 800 ? 640 : (window.innerWidth < 1280 ? 800 : 1224))),
        _canvas_height = (window.innerHeight <= 640 ? 200 : 439),

        _canvas_width_m1 = _canvas_width - 1,
        _canvas_height_mul4 = _canvas_height * 4,
        
        _detached_canvas = null,
        _detached_canvas_ctx = null,
        _detached_canvas_buffer = new Uint8Array(_canvas_width * _canvas_height * 4),
        _detached_canvas_image_data = null,

        _render_width = _canvas_width,
        _render_height = _canvas_height,
        
        _feedback = {
            enabled: true,
            pframe: [],
            index: 0,
            program: null,
            texture: null
        },

        // contain all workspace code editors
        _code_editors = [
            {
                name: "main",
                container: document.getElementById("fs_code"),
                marks: [],
                editor: null,
                index: 0,
                default_value: document.getElementById("fragment-shader").text,
                sharedb: {
                    doc: null,
                    rdy: false
                },
                collaborative: true,
                outline: {
                    element: function () {
                        var detachedWindow = WUI_Dialog.getDetachedDialog(_outline_dialog);
                        if (detachedWindow) {
                            return detachedWindow.document.getElementById("fs_main_outline");
                        }
                        
                        return document.getElementById("fs_main_outline");
                    },
                    data: []
                },
                detached_windows: [],
                line_widgets: []
            },
/*
            {
                name: "buffer",
                container: document.getElementById("fs_buffer_code"),
                marks: [],
                editor: null,
                index: 1,
                default_value: document.getElementById("fragment-shader-buffer").text,
                sharedb: {
                    doc: null,
                    rdy: false
                },
                collaborative: true,
                outline: {
                    element: document.getElementById("fs_buffer_outline"),
                    data: []
                },
                detached_windows: []
            },
*/
            {
                name: "library",
                container: document.getElementById("fs_library_code"),
                marks: [],
                editor: null,
                index: 1,
                default_value: localStorage.getItem('fs-user-library') ? localStorage.getItem('fs-user-library') : "// my library",
                collaborative: false,
                outline: {
                    element: function () {
                        var detachedWindow = WUI_Dialog.getDetachedDialog(_outline_dialog);
                        if (detachedWindow) {
                            return detachedWindow.document.getElementById("fs_library_outline");
                        }
                        
                        return document.getElementById("fs_library_outline");
                    },
                    data: []
                },
                detached_windows: [],
                line_widgets: []
            },
            {
                name: "example",
                container: document.getElementById("fs_example_code"),
                marks: null,
                editor: null,
                index: 2,
                default_value: "",
                collaborative: false,
                outline: null,
                detached_windows: [],
                line_widgets: []
            }
        ],
        _current_code_editor = _code_editors[0],

        _code_editor_font_size = localStorage.getItem('fs-editor-font-size'),

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
            gutters: ["CodeMirror-linenumbers", "fs-mark"],
            styleActiveLine: true,
            scrollbarStyle: "native",
            mode: "text/x-glsl",
            extraKeys: {
                "F11": function (cm) {
                    var fullscreen = !cm.getOption("fullScreen");
                    
                    cm.setOption("fullScreen", fullscreen);
                    
                    // hide some UI stuff when fullscreen
                    var mid_panel = document.getElementById("fs_middle_panel"),
                        explorer = document.getElementById("fs_explorer"),
                        top_panel = document.getElementById("fs_top_panel"),
                        
                        i = 0;
                    
                    if (fullscreen) {
                        _current_code_editor.editor.setOption("lineNumbers", false);
                        mid_panel.style.display = "none";
                        top_panel.style.display = "none";
                        explorer.style.display = "none";
                        
                        var marks = document.getElementsByClassName("fs-mark");
                        for (i = 0; i < marks.length; i += 1) {
                            marks[i].style.display = "none";
                        }

                        var ppd = document.getElementsByClassName("play-position-triangle-vflip");
                        for (i = 0; i < ppd.length; i += 1) {
                            ppd[i].style.display = "none";
                        }

                        _canvas.style.border = "none";
                    } else {
                        _current_code_editor.editor.setOption("lineNumbers", _cm_show_linenumbers);
                        mid_panel.style.display = "";
                        top_panel.style.display = "";
                        explorer.style.display = "";

                        var marks = document.getElementsByClassName("fs-mark");
                        for (i = 0; i < marks.length; i += 1) {
                            marks[i].style.display = "";
                        }

                        var ppd = document.getElementsByClassName("play-position-triangle-vflip");
                        for (i = 0; i < ppd.length; i += 1) {
                            ppd[i].style.display = "";
                        }

                        _canvas.style.border = "";
                    }
                },
                "Esc": function (cm) {
                    if (cm.getOption("fullScreen")) {
                        cm.setOption("fullScreen", false);
                        
                        _current_code_editor.editor.setOption("lineNumbers", _cm_show_linenumbers);
                        
                        var mid_panel = document.getElementById("fs_middle_panel"),
                            explorer = document.getElementById("fs_explorer"),
                            top_panel = document.getElementById("fs_top_panel");
                        
                        mid_panel.style.display = "";
                        top_panel.style.display = "";
                        explorer.style.display = "";

                        var marks = document.getElementsByClassName("fs-mark");
                        for (i = 0; i < marks.length; i += 1) {
                            marks[i].style.display = "";
                        }

                        var ppd = document.getElementsByClassName("play-position-triangle-vflip");
                        for (i = 0; i < ppd.length; i += 1) {
                            ppd[i].style.display = "";
                        }

                        _canvas.style.border = "";
                    }
                }
            }
        },

        _show_output_channels = false,

        _audio_off = false,
        
        // this is the amount of free uniform vectors for Fragment regular uniforms and session custom uniforms
        // this is also used to assign uniform vectors automatically for polyphonic uses
        // if the GPU cannot have that much uniforms (with polyphonic uses), this will be divided by two and the polyphonic computation will be done again
        // if the GPU cannot still have that much uniforms (with polyphonic uses), there will be a polyphony limit of 16 notes, this is a safe limit for all devices nowaday
        _free_uniform_vectors = 320,
        
        // note-on/note-off related stuff (MIDI keyboard etc.)
        _keyboard = {
            data: [],
            data_components: 8,
            // polyphonic capabilities is set dynamically from MAX_FRAGMENT_UNIFORM_VECTORS parameter
            // ~221 MAX_FRAGMENT_UNIFORM_VECTORS value will be generally the default for desktop
            // this permit a polyphony of ~60 notes with 4 components for each notes and by considering the reserved uniform vectors
            // all this is limited by the MAX_FRAGMENT_UNIFORM_VECTORS parameter on the GPU taking into account the other Fragment uniform PLUS sessions uniform
            // at the time of this comment in 2017, 99.9% of desktop devices support up to 221 uniform vectors while there is a 83.9% support for up to 512 uniform vectors,
            // this amount to ~192 notes polyphony, a capability of 1024 lead to ~704 notes polyphony and so on...
            data_length: 60 * 8,
            // amount of allocated uniform vectors
            uniform_vectors: 0,
            pressed: {},
            polyphony_max: 32,
            polyphony: 0, // current polyphony
            note_lifetime: 1000 // how much time the note is kept after note-off event (for release, in ms)
        },
        
        // last note-on/note-off (MIDI)
        _pkeyboard = {
            data: [],
            data_components: 3,
        },
        
        _chn_settings = [],
        
        _webgl = {
            max_fragment_uniform_vector: -1
        },

        _compile_timer,
        _update_marks_timer,
        _save_marks_timer,

        _undock_code_editor = false,

        _xyf_grid = false,

        _glsl_error = false,

        _first_play = true,
        
        _OES_texture_float_linear = null,
        _EXT_color_buffer_float = null,
        
        // settings
        _show_globaltime = true,
        _show_oscinfos = false,
        _show_polyinfos = false,
        _cm_highlight_matches = false,
        _cm_show_linenumbers = true,
        _cm_show_inerrors = true,
        _cm_show_osderrors = true,
        _cm_advanced_scrollbar = false,
        _quickstart_on_startup = true,
        _compile_delay_ms = 100,
        
        _clipboard,

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

        _raf,

        _gl,
        _gl2 = true,
        
        _pbo = null,
        _pbo_size = 0,
        
        _read_pixels_format,

        _play_position_markers = [],

        _webgl_opts = {
                preserveDrawingBuffer: true,
                antialias: true,
                depth: false
            },

        _prev_data = [],
        _temp_data = new Uint8Array(_canvas_height_mul4),
        _data = [],
        _prev_midi_data = [],
        _midi_data = [],
        _prev_osc_data = [],
        _osc_data = [],
        _output_channels = 0,

        _analysis_canvas,
        _analysis_canvas_ctx,
        
        _analysis_canvas_tmp,
        _analysis_canvas_tmp_ctx,
        
        _analysis_log_scale = true,
        _analysis_colored = true,
        _analysis_speed = 2,
        
        _midi_out = true,
        
        _quad_vertex_buffer,
        
        _program,

        _fragment_input_data = [],

        _input_panel_element = document.getElementById("fs_input_panel"),

        _wgl_support_element = document.getElementById("fs-wgl-support"),
        _wgl_float_support_element = document.getElementById("fs-wgl-float-support"),
        _wgl_lfloat_support_element = document.getElementById("fs-wgl-lfloat-support"),
        
        _globalFrame = 0,

        _time = 0,

        _pause_time = 0,
        
        _hover_freq = null,

        _input_channel_prefix = "iInput",
        _input_video_prefix = "fvid";

    /***********************************************************
        App. Includes.
    ************************************************************/

    /*#include config.js*/
    /*#include db.js*/
    /*#include audio.js*/
    /*#include image_import.js*/
    /*#include audio_import.js*/
    /*#include file_import.js*/
    /*#include graphics.js*/
    /*#include glsl.js*/
    /*#include network.js*/
    /*#include discuss.js*/
    /*#include paint.js*/
    /*#include brushes.js*/
    /*#include canvas_input.js*/
    /*#include inputs.js*/
    /*#include editor.js*/
    /*#include transports.js*/
    /*#include export.js*/
    /*#include workspace.js*/
    /*#include file_manager.js*/
    /*#include ui.js*/
    /*#include pjs.js*/
    /*#include slices.js*/
    /*#include midi.js*/
    /*#include fas.js*/
    /*#include guide.js*/
    /*#include osc_handler.js*/

    /***********************************************************
        Functions.
    ************************************************************/

    var _initializePBO = function () {
        if (_gl2) {
            if (_pbo) {
                _gl.deleteBuffer(_pbo);  
            }

            _pbo = _gl.createBuffer();
            _gl.bindBuffer(_gl.PIXEL_PACK_BUFFER, _pbo);
            if (_gl2 && _EXT_color_buffer_float) {
                _pbo_size = 1 * _canvas.height * 4 * 4;
            } else {
                _pbo_size = 1 * _canvas.height * 4;
            }
            _gl.bufferData(_gl.PIXEL_PACK_BUFFER, _pbo_size, _gl.STATIC_READ);
            
            _gl.bindBuffer(_gl.PIXEL_PACK_BUFFER, null);
        }
    };
    
    var _saveLocalSessionSettings = function () {
        var session_name = _getSessionName();

        return function () {
            try {
                localStorage.setItem(session_name, JSON.stringify(_local_session_settings));
            } catch (e) {
                _notification("Can't save session local settings due to localStorage error. (local storage is likely full)");
            }
        };
    }();
    
    var _loadLocalSessionSettings = function () {
        // setup user last settings for this session if any
        if (_local_session_settings) {
            _local_session_settings = JSON.parse(_local_session_settings);
            if ('gain' in _local_session_settings) {
                _volume = _local_session_settings.gain;

                WUI_RangeSlider.setValue("mst_slider", _volume, true);
            }

            if ('midi_settings' in _local_session_settings) {
                _loadMIDISettings(_local_session_settings.midi_settings);
            }
            
            if ('chn_settings' in _local_session_settings) {
                _chn_settings = _local_session_settings.chn_settings;
            }
        } else {
            _local_session_settings = {
                gain: _volume,
                chn_settings: [{ osc: [], efx: [], muted: 0, output_chn: 0 }],
                markers: [],
                code_editors: []
            };

            _code_editors.forEach(function (code_editor) {
                _local_session_settings.code_editors.push({ marks: [] })
            });
        }
    };
    
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

        if (update_obj.height) {
            _canvas_height = update_obj.height;
            _canvas.height = _canvas_height;
            _canvas.style.height = _canvas_height + 'px';
            _canvas_height_mul4 = _canvas_height * 4;
            
            _record_canvas.height = _canvas_height;
            _record_slice_image = _record_canvas_ctx.createImageData(1, _canvas_height);

            _vaxis_infos.style.height = _canvas_height + "px";

            _temp_data = new _synth_data_array(_canvas_height_mul4);
            _allocateFramesData();

            _gl.viewport(0, 0, _canvas.width, _canvas.height);

            _updatePlayMarkersHeight(_canvas_height);
            
            _initializePBO();
        }

        if (update_obj.width) {
            _canvas_width = update_obj.width;
            _canvas.width = _canvas_width;
            _canvas.style.width = _canvas_width + 'px';
            
            _record_canvas.width = _canvas_width;

            _gl.viewport(0, 0, _canvas.width, _canvas.height);
            
            _initializePBO();
        }
        
        if (update_obj.width || update_obj.height) {
            _canvasInputDimensionsUpdate(update_obj.width, update_obj.height);
            _pjsDimensionsUpdate(update_obj.width, update_obj.height);
        }

        _pjsCompileAll();
        
        // detached canvas
        _detached_canvas_buffer = new Uint8Array(_canvas_width * _canvas_height * 4);
        if (_detached_canvas_ctx) {
            _detached_canvas.width = _canvas_width;
            _detached_canvas.height = _canvas_height;
            _detached_canvas_image_data = _detached_canvas_ctx.createImageData(_canvas_width, _canvas_height);
        }
        //
        
        _generateOscillatorSet(_canvas_height, base_freq, octave);

        _compile();

        _updateWorkView();

        _updateAllPlayPosition();

        _fasSendAll();

        //_fasNotify(_FAS_BANK_INFOS, _audio_infos);

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
        
        _buildMainFBO();
        
        _buildFeedback();
    };

    /***********************************************************
        Init.
    ************************************************************/

    if (localStorage.getItem("fs-show-toolbar-title") === null) {
        localStorage.setItem("fs-show-toolbar-title", true);
    }

    document.getElementById("copy_year").innerHTML = new Date().getFullYear();
    
    _record_opts.f = _record_opts.default;
    
    if (!_username) {
        _username = "Anonymous";
    }

    _user_name_element.innerHTML = _username;
    _username_input.value = _username;

    //_canvas_width = _getElementOffset(_canvas_container).width;

    _render_width = _canvas_width;

    _canvas.width  = _render_width;
    _canvas.height = _render_height;

    _canvas.style.width  = _canvas_width  + 'px';
    _canvas.style.height = _canvas_height + 'px';

    _canvas_container.appendChild(_canvas);

    /*
    _canvas_container.addEventListener("click", function () {
        var childs = _canvas_container.children;
        var i = 0;
        for (i = 0; i < childs.length; i++) {
            if (childs[i].nodeName === "CANVAS") {
                childs[i].dispatchEvent(new UIEvent('click'));
            }
        }
    });
    */
    
    _record_canvas.width = _canvas_width;
    _record_canvas.height = _canvas_height;
    
    _record_slice_image = _record_canvas_ctx.createImageData(1, _canvas_height);

    _vaxis_infos.style.height = _canvas_height + "px";

    // CodeMirror / code editors
    if (!_code_editor_theme) {
        _code_editor_theme = "seti";
    }

    _changeEditorsTheme(_code_editor_theme);

    if (!_code_editor_font_size) {
        _code_editor_font_size = "S";
    }

    _changeEditorsFontSize(_code_editor_font_size);

    var _onEditorGutterClick = function (code_editor) {
        return function (cm, n) {
            var info = cm.lineInfo(n),
                lineHandle = cm.getLineHandle(n),
    
                i = 0;
    
            if (info.gutterMarkers) {
                for (i = 0; i < code_editor.marks.length; i += 1) {
                    if (cm.getLineNumber(code_editor.marks[i]) === n) {
                        code_editor.marks.splice(i, 1);
                        break;
                    }
                }
            } else {
                code_editor.marks.push(lineHandle);
    
                _addMarkDeleteEvent(code_editor, lineHandle);
            }
    
            cm.setGutterMarker(n, "fs-mark", info.gutterMarkers ? null : _getNewMark());
    
            _saveEditorMarks(code_editor)();
    
            _updateOutline(code_editor.index);
        };
    }

    var _onEditorChanges = function (code_editor) {
        return function (instance, changes) {
            if (code_editor.collaborative) {
                _shareCodeEditorChanges(code_editor, changes);
            } else if (code_editor.index === 1) {
                localStorage.setItem("fs-user-library", code_editor.editor.getValue());
            }
        };
    };

    var _onEditorChange = function (code_editor) {
        return function (instance, change_obj) {
            clearTimeout(_compile_timer);
            _compile_timer = setTimeout(_compile, 500);

            if (code_editor.marks) {
                clearTimeout(_update_marks_timer);
                _update_marks_timer = setTimeout(_updateMarks(code_editor), 2000);
            }
        };
    };

    _code_editors.forEach(function (code_editor) {
        code_editor.editor = new CodeMirror(code_editor.container, _code_editor_settings);

        var ce_instance = code_editor.editor;

        ce_instance.setValue(code_editor.default_value);
    
        CodeMirror.on(ce_instance, 'change', _onEditorChange(code_editor));
        
        CodeMirror.on(ce_instance, 'changes', _onEditorChanges(code_editor));

        if (code_editor.marks) {
            CodeMirror.on(ce_instance, "gutterClick", _onEditorGutterClick(code_editor));
        }
    });
    
    // WebGL 2 check & init
    _gl = _canvas.getContext("webgl2", _webgl_opts) || _canvas.getContext("experimental-webgl2", _webgl_opts);
    if (_gl) {
        _gl2 = true;
        
        _wgl_support_element.innerHTML = "Supported";
        _wgl_support_element.style.color = "#00ff00";
        
        _OES_texture_float_linear = _gl.getExtension("OES_texture_float_linear");
        _EXT_color_buffer_float = _gl.getExtension("EXT_color_buffer_float");
        
        _initializePBO();
        
        if (_OES_texture_float_linear) {
            _wgl_lfloat_support_element.innerHTML = "Supported";
            _wgl_lfloat_support_element.style.color = "#00ff00";
        } else {
            _wgl_lfloat_support_element.innerHTML = "Not supported";
            _wgl_lfloat_support_element.style.color = "#ff0000";
        }
        
        if (_EXT_color_buffer_float) {
            _audio_infos.float_data = true;
            
            _synth_data_array = Float32Array;
            
            _read_pixels_format = _gl.FLOAT;
            
            _wgl_float_support_element.innerHTML = "Supported";
            _wgl_float_support_element.style.color = "#00ff00";
        } else {
            _read_pixels_format = _gl.UNSIGNED_BYTE;
            
            _wgl_float_support_element.innerHTML = "Not supported (8-bit)";
            _wgl_float_support_element.style.color = "#ff0000";
        }
    }

    if (!_gl) {
        _fail("The WebGL API is not available, please try with a WebGL ready browser.", true);

        return;
    }
    
    // compute default polyphony max based on GPU capabilities
    _webgl.max_fragment_uniform_vector = _gl.getParameter(_gl.MAX_FRAGMENT_UNIFORM_VECTORS);
    
    _keyboard.uniform_vectors = _webgl.max_fragment_uniform_vector - _free_uniform_vectors;
    
    _keyboard.data_length = _keyboard.uniform_vectors * _keyboard.data_components;
    _keyboard.polyphony_max = _keyboard.uniform_vectors;
    
    if (_keyboard.uniform_vectors <= 16) {
        _keyboard.uniform_vectors = _webgl.max_fragment_uniform_vector - (_free_uniform_vectors / 2);
        
        // still not? default to 8, all devices should be fine nowaday with 32 uniform vectors
        if (_keyboard.uniform_vectors <= 16) {
            _keyboard.data_length = 16 * _keyboard.data_components;
            _keyboard.polyphony_max = 16;
        } else {
            _keyboard.data_length = _keyboard.uniform_vectors * _keyboard.data_components;
            _keyboard.polyphony_max = _keyboard.uniform_vectors;
        }
    }
    
    _buildScreenAlignedQuad();

    _gl.viewport(0, 0, _canvas.width, _canvas.height);

    _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, true);

    _compile();

    _initWorkspace();

    _loadLocalSessionSettings();

    _loadEditorsMarks();

    _allocateFramesData();

    _fasInit();
    
    _uiInit();

    _pjsInit();
    
    _midiInit();
    
    _oscInit();

    _initNetwork();
    
    /*#include events.js*/
    
    if (localStorage.getItem('fs-audio') !== "true") {
        _fasDisable();
    }
    
    _buildFeedback();
    
    _initDb("fs" + _getSessionName());
    
    _clipboard = new Clipboard(".fs-documentation-keyword");

    _initOutline();

    //_startUXHelper(_ux_helper_quickstart_scenario);
};
    
    FragmentSynth({});
}
