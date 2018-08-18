/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _pjs_dialog_id = "fs_pjs",
    _pjs_dialog,

    _current_pjs_input = null,
    
    _pjs_codemirror_instance,
    _pjs_codemirror_instance_detached;

/***********************************************************
    Functions.
************************************************************/

var _pjsUpdateTexture = function () {
    var fragment_input,
        i = 0;

    for (i = 0; i < _fragment_input_data.length; i += 1) {
        fragment_input = _fragment_input_data[i];
        
        if (fragment_input.type === 4) {
            _gl.bindTexture(_gl.TEXTURE_2D, fragment_input.texture);
            _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, fragment_input.canvas.width, fragment_input.canvas.height, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, fragment_input.canvas);//new Uint8Array(image_data.data));
            _gl.bindTexture(_gl.TEXTURE_2D, null);
        }
    }
};

var _pjsMouseMoveEvent = function () {
    var fragment_input,
        i = 0;

    for (i = 0; i < _fragment_input_data.length; i += 1) {
        fragment_input = _fragment_input_data[i];

        if (fragment_input.type === 4) {
            fragment_input.canvas.dispatchEvent(new Event('mousemove'));
        }
    }
};

var _pjsCodeChange = function (source_code) {
    var pjs,
        pjs_source_code = (source_code !== undefined) ? source_code : _pjs_codemirror_instance.getValue(),

        inputs_source_code = "",
        inputs_load_source_code = "",

        input_url = "",

        fragment_input,

        pjs_canvas = null, 
        pjs_gl = null,
        
        fs_pjs_size = "size(" + _canvas_width + "," + _canvas_height + "$1",

        fs_pjs_library = [
            'float baseFrequency = ' + _audio_infos.base_freq + ";",
            'float octaves = ' + _audio_infos.octaves + ";",
            'int htoy (float f) {',
            '    return (height - (log(f / baseFrequency) / log(2.0)) * floor(height / octaves + 0.5));',
            '}',
            'float yfreq (float y, float sample_rate) {',
            '   return (baseFrequency * pow(2., (height - round(y * height)) / octaves)) / sample_rate;',
            "}"
        ].join("\n"),

        pjs_error,
        
        i = 0;
    
    if (_current_pjs_input !== null) {
        for (i = 0; i < _fragment_input_data.length; i += 1) {
            fragment_input = _fragment_input_data[i];

            if (fragment_input.type === 0) {
                input_url = fragment_input.elem.title + "_str";

                inputs_source_code += "String " + input_url + " = \"" + _imageToDataURL(fragment_input.image) + "\";\n";
                inputs_load_source_code += "" + fragment_input.elem.title + " = loadImage(" + input_url + ");"
            }
        }

        pjs_source_code = pjs_source_code.replace(/size.*?\([\d\w]+.*?[\d\w]+(,*)/gm, fs_pjs_size);
        pjs_source_code = 'double globalTime = ' + _current_pjs_input.globalTime + ";\n" + fs_pjs_library + inputs_source_code + pjs_source_code.replace(/(void\s+setup\s*\(\)\s*{)/gm, "$1 " + "background(0, 0, 0, 255);" + inputs_load_source_code + "\n");


        if (_current_pjs_input.pjs) {
            pjs_canvas = _current_pjs_input.pjs.externals.canvas;

            _current_pjs_input.pjs.exit();

            if (pjs_canvas) {
                pjs_gl = pjs_canvas.getContext("webgl2", _webgl_opts) ||
                         pjs_canvas.getContext("experimental-webgl2", _webgl_opts) ||
                         pjs_canvas.getContext("webgl", _webgl_opts) ||
                         pjs_canvas.getContext("experimental-webgl", _webgl_opts);
                if (pjs_gl) {
                    if (pjs_gl.getExtension('WEBGL_lose_context')) {
                        pjs_gl.getExtension('WEBGL_lose_context').loseContext();
                    }
                }
            }

            _current_pjs_input.pjs = null;
        }

        WUI_Dialog.setStatusBarContent(_pjs_dialog, '<span class="fs-pjs-status">Successfully compiled</span<');

        try {
            _current_pjs_input.pjs = new Processing(_current_pjs_input.canvas.id, pjs_source_code);
        } catch (err) {
            pjs_error = err.name + " : " + err.message;

            if (pjs_error) {
                WUI_Dialog.setStatusBarContent(_pjs_dialog, "<span class='fs-pjs-failed'>" + pjs_error + "</span>");
            }
        }
        
        _current_pjs_input.pjs_source_code = _pjs_codemirror_instance.getValue();
        
        _current_pjs_input.db_obj.data = _pjs_codemirror_instance.getValue();

        _dbUpdateInput(_parseInt10(_current_pjs_input.elem.dataset.inputId), _current_pjs_input.db_obj);

        //_compile();
    }
};

var _pjsDimensionsUpdate = function (new_width, new_height) {
    var i = 0,
        fragment_input_data,
        input_id;

    for (i = 0; i < _fragment_input_data.length; i += 1) {
        fragment_input_data = _fragment_input_data[i];
        
        if (fragment_input_data.type === 4) {
            fragment_input_data.db_obj.width = new_width;
            fragment_input_data.db_obj.height = new_height;

            fragment_input_data.texture = _replace2DTexture({ empty: true, width: new_width, height: new_height }, fragment_input_data.texture);

            input_id = _parseInt10(fragment_input_data.elem.dataset.inputId);

            _dbUpdateInput(input_id, fragment_input_data.db_obj);

            _pjsUpdateTexture();
        }
    }
};

var _pjsCompile = function (input) {
    if (input.type === 4) {
        _current_pjs_input = input;

        _pjsCodeChange(_current_pjs_input.pjs_source_code);
    }
};

var _pjsCompileAll = function () {
    var i = 0,
        fragment_input_data;

    for (i = 0; i < _fragment_input_data.length; i += 1) {
        fragment_input_data = _fragment_input_data[i];
        
        _pjsCompile(fragment_input_data);
    }
};

var _pjsInit = function () {
    var custom_message_area = document.createElement("textarea"),

        pjs_editor_div = document.getElementById("fs_pjs_editor"),
        
        cm_element;
    
    custom_message_area.className = "fs-textarea";
    custom_message_area.style.border = "1px solid #111111";

    _pjs_dialog = WUI_Dialog.create(_pjs_dialog_id, {
        title: "Processing.js Editor",

        width: "800px",
        height: "360px",
        min_height: "80px",

        halign: "center",
        valign: "center",

        open: false,

        status_bar: true,
        detachable: true,
        draggable: true,
        resizable: true,
        minimizable: true,

        status_bar_content: "",

        on_open: function () {
            _pjs_codemirror_instance.refresh();
        },

        on_detach: function (new_window) {
            var pjs_editor_div = new_window.document.getElementById("fs_pjs_editor"),
                textarea = document.createElement("textarea"),
                cm_element;
            
            new_window.document.head.innerHTML += '<link rel="stylesheet" type="text/css" href="css/codemirror/theme/' + _code_editor_theme + '.css"/>';
            
            textarea.className = "fs-textarea";
            textarea.style.border = "1px solid #111111";
            
            pjs_editor_div.innerHTML = "";

            pjs_editor_div.appendChild(textarea);

            _pjs_codemirror_instance_detached = CodeMirror.fromTextArea(textarea, {
                mode: "text/x-java",
                styleActiveLine: true,
                lineNumbers: true,
                lineWrapping: true,
                theme: ((_code_editor_theme === null) ? "seti" : _code_editor_theme),
                matchBrackets: true,
                scrollbarStyle: "native"
            });

            cm_element = _pjs_codemirror_instance_detached.getWrapperElement();
            cm_element.style = "font-size: 12pt";

            CodeMirror.on(_pjs_codemirror_instance_detached, 'change', function () {
                _pjsCodeChange(_pjs_codemirror_instance_detached.getValue());

                _pjs_codemirror_instance.setValue(_pjs_codemirror_instance_detached.getValue());
            });

            _pjs_codemirror_instance_detached.setValue(_pjs_codemirror_instance.getValue());

            _pjs_codemirror_instance_detached.refresh();
        },
    
        header_btn: [
            {
                title: "Help",
                on_click: function () {
                    window.open(_documentation_link + "tutorials/pjs/");
                },
                class_name: "fs-help-icon"
            }
        ]
    });

    pjs_editor_div.appendChild(custom_message_area);

    _pjs_codemirror_instance = CodeMirror.fromTextArea(custom_message_area, {
        mode: "text/x-java",
        styleActiveLine: true,
        lineNumbers: true,
        lineWrapping: true,
        theme: ((_code_editor_theme === null) ? "seti" : _code_editor_theme),
        matchBrackets: true,
        scrollbarStyle: "native"
    });

    cm_element = _pjs_codemirror_instance.getWrapperElement();
    cm_element.style = "font-size: 12pt";

    CodeMirror.on(_pjs_codemirror_instance, 'change', function () {
        _pjsCodeChange();
    });

    _pjsUpdateInputs();
};

var _pjsSelectInput = function (input) {
    if (_current_pjs_input === input) {
        return;
    }

    _current_pjs_input = input;

    _pjs_codemirror_instance.setValue(input.pjs_source_code);

    _pjsUpdateInputs();

    _pjsCodeChange();
};

var _pjsChangeSourceCb = function (input) {
    return function (e) {
        var elem = e.target;

        _pjsSelectInput(input);

        if (elem.parentElement !== null) {
            elem.parentElement.childNodes.forEach(function (item) {
                item.classList.remove("fs-pjs-selected");
            });

            elem.classList.add("fs-pjs-selected");
        }
    };
};

var _pjsUpdateInputs = function () {
    var i = 0,
        pjs_editor_inputs = document.getElementById("fs_pjs_inputs"),
        fragment_input_data,

        selected_input = _current_pjs_input,
        
        input_name_div;
    
    pjs_editor_inputs.innerHTML = "";

    _current_pjs_input = null;

    for (i = 0; i < _fragment_input_data.length; i += 1) {
        fragment_input_data = _fragment_input_data[i];
        
        if (fragment_input_data.type === 4) {
            input_name_div = document.createElement("div");
            input_name_div.className = "fs-pjs-input";
            input_name_div.innerHTML = fragment_input_data.elem.title;


            if (selected_input === fragment_input_data) {
                input_name_div.classList.add("fs-pjs-selected");

                _current_pjs_input = fragment_input_data;
            }

            pjs_editor_inputs.appendChild(input_name_div);

            input_name_div.addEventListener("click", _pjsChangeSourceCb(fragment_input_data));
        }
    }
};