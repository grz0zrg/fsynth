/* jslint browser: true */

_user_name_element.addEventListener('click', function (e) {
        WUI_Dialog.open("fs_username_dialog");
    });
    
_username_input.addEventListener("change", function () {
    var user_name = this.value;

    if (user_name === null) {
        return;
    }

    if (user_name === "") {
        user_name = "Anonymous";
    }

    _user_name_element.innerHTML = user_name;

    localStorage.setItem('fs-user-name', user_name);
});

_canvas.addEventListener('contextmenu', function(ev) {
        ev.preventDefault();

        WUI_CircularMenu.create(
            {
                x: _mx,
                y: _my,

                rx: 0,
                ry: 0,

                item_width:  32,
                item_height: 32
            },
            [
                { icon: "fs-plus-icon", tooltip: "Slice!",  on_click: function () {
                        _addPlayPositionMarker(_cx, 0, false, 1, 0, true);
                    } }
            ]);

        return false;
    }, false);


_canvas.addEventListener('dblclick', function() {
    WUI_Dialog.open(_slices_dialog);
});
/*
// slow
_canvas.addEventListener('dblclick', function() {
    var child_window = null,
        screen_left = typeof window.screenLeft !== "undefined" ? window.screenLeft : screen.left,
        screen_top = typeof window.screenTop !== "undefined" ? window.screenTop : screen.top,
        dbc = _canvas.getBoundingClientRect(),
        title = "",
        child_gl;
        
    child_window = window.open("", title, [
        "toolbar=no",
        "location=no",
        "directories=no",
        "status=no",
        "menubar=no",
        "scrollbars=yes",
        "resizable=yes",
        "width=" + dbc.width,
        "height=" + dbc.height,
        "top=" + (dbc.top + screen_top),
        "left=" + (dbc.left  + screen_left)].join(','));
    
    child_window.document.open();
    child_window.document.write(['<html>',
                                     '<head>',
                                     '<title>' + title + '</title>',
                                     '</head>',
                                     '<body style="margin: 0; background-color: black">',
                                     '<canvas></canvas>',
                                     '</body>',
                                     '</html>'].join(''));
    child_window.document.close();
    
    _detached_canvas = child_window.document.body.firstElementChild;

    _detached_canvas.width = _canvas.width;
    _detached_canvas.height = _canvas.height;
    
    _detached_canvas_ctx = _detached_canvas.getContext('2d');
    
    _detached_canvas_image_data = _detached_canvas_ctx.createImageData(_canvas_width, _canvas_height);
    
    child_window.addEventListener("beforeunload", function () {
            _detached_canvas = null;
            _detached_canvas_ctx = null;
            _detached_canvas_image_data = null;
        });
});
*/

document.addEventListener('mousedown', function (e) {
    var e = e || window.event,
        
        canvas_offset = _getElementOffset(_canvas);

    _cnmx = 1. - (e.pageX - canvas_offset.left - 1) / _canvas_width;
    _cnmy = 1. - (e.pageY - canvas_offset.top) / _canvas_height;

    _mouse_btn = e.which;
});

document.getElementById("fs_select_editor_themes").addEventListener('change', function (e) {
    var theme = e.target.value;
    
    if (theme === "default") {
        theme = "seti";
    }
    
    _changeEditorTheme(theme);
});

document.getElementById("fs_import_audio_mapping").addEventListener('change', function (e) {
    var mapping_type = e.target.value;
    
    _audio_import_settings.mapping = mapping_type;
});

document.getElementById("fs_import_audio_ck_videotrack").addEventListener('change', function (e) {
    var videotrack_import = this.checked;
    
    _audio_import_settings.videotrack_import = videotrack_import;
});

document.getElementById("fs_show_quickstart").addEventListener('click', function (e) {
    WUI_Dialog.open(_quickstart_dialog);
});

document.getElementById("fs_remove_comments").addEventListener('click', function (e) {
    var input_code  = _code_editor.getValue(),
        output_code = input_code;
    
    output_code = output_code.replace(/(\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/)|(\/\/.*)/g, "");

    _code_editor.setValue(output_code);
    
    _compile();
});

document.getElementById("fs_remove_spaces").addEventListener('click', function (e) {
    var input_code  = _code_editor.getValue(),
        output_code = input_code;
    
    output_code = output_code.replace(/^\s{2,}$/gm, "");

    _code_editor.setValue(output_code);
    
    _compile();
});

document.getElementById("fs_center_all_dialogs").addEventListener('click', WUI_Dialog.centerAll);

document.addEventListener('mouseup', function (e) {
    _mouse_btn = 0;
    
    _canvasInputPaintStop();
    
    // controller
    //_hit_curr = null;
});

document.addEventListener('mousemove', function (e) {
        var e = e || window.event,
            
            canvas_offset;
    
        if (e.target === _canvas || e.target.dataset.group === "canvas") {
            canvas_offset = _getElementOffset(_canvas);

            _cx = e.pageX;
            _cy = e.pageY - canvas_offset.top;

            _cx = (_cx - canvas_offset.left - 1);

            _hover_freq = _getFrequency(_cy);

            if (_hover_freq !== null && (_cx >= 0 && _cx < _canvas_width)) {
                if (_xyf_grid) {
                    if (_haxis_infos.style.display !== "block" ||
                        _vaxis_infos.style.display !== "block") {
                        _haxis_infos.style.display = "block";
                        _vaxis_infos.style.display = "block";
                    }

                    _haxis_infos.firstElementChild.textContent = _cy;
                    _haxis_infos.lastElementChild.style.left = e.pageX + "px";
                    _haxis_infos.lastElementChild.textContent = _truncateDecimals(_hover_freq + "", 2) + "Hz";
                    _vaxis_infos.firstElementChild.textContent = _cx;

                    _haxis_infos.style.top = _cy + "px";
                    _vaxis_infos.style.left = e.pageX + "px";
                } else {
                    _xy_infos.textContent = "x " + _cx + " y " + _cy;
                    _hz_infos.textContent = " " + _truncateDecimals(_hover_freq + "", 2) + "Hz";
                }
            } else {
                if (_xyf_grid) {
                    if (_haxis_infos.style.display !== "none" ||
                        _vaxis_infos.style.display !== "none") {
                        _haxis_infos.style.display = "none";
                        _vaxis_infos.style.display = "none";
                    }
                } else {
                    _xy_infos.textContent = "";
                    _hz_infos.textContent = "";
                }
            }

            if (_mouse_btn === _LEFT_MOUSE_BTN) {
                _nmx = 1. - _cx / _canvas_width;
                _nmy = 1. - _cy / _canvas_height;
            }
        } else {
            if (_xyf_grid) {
                if (_haxis_infos.style.display !== "none" ||
                    _vaxis_infos.style.display !== "none") {
                    _haxis_infos.style.display = "none";
                    _vaxis_infos.style.display = "none";
                }
            } else {
                _xy_infos.textContent = "";
                _hz_infos.textContent = "";
            }
        }
    
        _pjsMouseMoveEvent();

        _mx = e.pageX;
        _my = e.pageY;
    
        _canvasInputPaint(e);
   });

var _onWindowResize = function () {
    _updateAllPlayPosition();
    
    _updateCodeView();
    
    _c_helper.width  = window.innerWidth;
    _c_helper.height = window.innerHeight;
};

ResizeThrottler.initialize([_onWindowResize]);

_red_curtain_element.classList.add("fs-open-red-curtain");
_red_curtain_element.addEventListener("transitionend", function () {
        _red_curtain_element.parentElement.removeChild(_red_curtain_element);
    }, false);
