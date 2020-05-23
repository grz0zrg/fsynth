/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _workspace_code_elem = document.getElementById("fs_code_target");

/***********************************************************
    Functions.
************************************************************/

var _clearCodeMirrorWidgets = function () {
    var i = 0, j = 0;

    for (j = 0; j < _code_editors.length; j += 1) {
        for (i = 0; i < _code_editors[j].line_widgets.length; i += 1) {
            _code_editors[j].editor.removeLineWidget(_code_editors[j].line_widgets[i]);
        }

        _code_editors[j].line_widgets = [];
    }
};

var _parseCompileOutput = function (output) {
    var regex = /ERROR: \d+:(\d+): (.*)/g,

        msg_container,
        msg_icon,

        concerned_editor = null,

        line = 0,
        
        result = [],

        m;

    _clearCodeMirrorWidgets();

    while ((m = regex.exec(output)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        line = parseInt(m[1], 10);

        msg_container = document.createElement("div");
        msg_icon = msg_container.appendChild(document.createElement("div"));
        msg_icon.className = "fs-error-icon";
        msg_container.appendChild(document.createTextNode(m[2]));
        msg_container.className = "fs-compile-error";

        line -= 1;
        
        if (_gl2) {
            line = line - 1;
        }

        if (line >= 1 && line <= _code_editors[1].editor.lineCount()) {
            concerned_editor = _code_editors[1]; // library
        } else {
            line -= _code_editors[1].editor.lineCount();

            concerned_editor = _code_editors[0]; // main
        }
        
        result.push({ target: concerned_editor.name, line: line, msg: m[2]});

        if (_cm_show_inerrors || _current_code_editor.editor.getOption("fullScreen")) {
            concerned_editor.line_widgets.push(concerned_editor.editor.addLineWidget(line - 1, msg_container, { coverGutter: false, noHScroll: true }));
        }
    }
    
    return result;
};

var _changeEditorsTheme = function (theme) {
    if (_code_editor_theme_link) {
        document.getElementsByTagName('head')[0].removeChild(_code_editor_theme_link);
    }

    _code_editor_theme_link = document.createElement('link');

    _code_editor_theme_link.onload = function(){
        var i = 0;
        for (i = 0; i < _code_editors.length; i += 1) {
            _code_editors[i].editor.setOption("theme", theme);
        }

        _pjs_codemirror_instance.setOption("theme", theme);
        _midi_codemirror_instance.setOption("theme", theme);
    };
    _code_editor_theme_link.rel = "stylesheet";
    _code_editor_theme_link.media = "all";
    _code_editor_theme_link.href = "css/codemirror/theme/" + theme + ".css";

    document.getElementsByTagName('head')[0].appendChild(_code_editor_theme_link);

    localStorage.setItem('fs-editor-theme', theme);

    _code_editor_theme = theme;
};

var _detachCodeEditor = function () {
    // cm code will use these settings to setup its code editor
    window.gb_code_editor_settings = _code_editor_settings;
    window.gb_code_editor = _current_code_editor.editor;
    window.gb_code_editor_theme = _code_editor_theme;

    var detached_window = window.open("", "_blank", [
            "toolbar=yes",
            "location=no",
            "directories=no",
            "status=no",
            "menubar=no",
            "scrollbars=yes",
            "resizable=yes",
            "width=" + screen.width,
            "height=" + screen.height,
            "top=0",
            "left=0"].join(','));
    
    detached_window.document.write([
        '<!DOCTYPE html>',
        '<html>',
            '<head>',
                '<title>Fragment - ' + _current_code_editor.name,
                '</title>',
                '<meta charset="utf-8">',
                '<meta http-equiv="content-type" content="text/html; charset=utf-8">',
                '<link rel="stylesheet" type="text/css" href="dist/cm.min.css"/>',
                '<script type="text/javascript" src="dist/cm.min.js" defer></script>',
                '<link rel="stylesheet" type="text/css" href="css/codemirror/theme/' + _code_editor_theme + '.css"/>',
            '</head>',
            '<body>',
                '<div class="fs-editor" style="width: 100%; height: 100%"></div>',
            '</body>',
        '</html>'].join(''));
    detached_window.document.close();

    _current_code_editor.detached_windows.push(detached_window);

    // detached windows cleanup
    var i = 0, j = 0;
    for (i = 0; i < _code_editors.length; i += 1) {
        var new_detached_windows = [];
        
        var detached_windows = _code_editors[i].detached_windows;
        for (j = 0; j < detached_windows.length; j += 1) {
            if (detached_windows[j] && !detached_windows[j].closed) {
                new_detached_windows.push(detached_windows[j]);
            }
        }

        _code_editors[i].detached_windows = new_detached_windows;
    }
};

var _getNewMark = function () {
    var mark = document.createElement("div");
    mark.classList.add("fs-mark");
    mark.innerHTML = "*";
    
    return mark;
};

var _findMark = function (code_editor, line) {
    var i = 0;
    for (i = 0; i < code_editor.marks.length; i += 1) {
        if (code_editor.editor.getLineNumber(code_editor.marks[i]) === line) {
            return true;
        }
    }

    return false;
};

var _deleteMark = function (code_editor, line) {
    var i = 0;
    for (i = 0; i < code_editor.marks.length; i += 1) {
        if (code_editor.editor.getLineNumber(code_editor.marks[i]) === line) {
            code_editor.marks.splice(i, 1);
            break;
        }
    }

    clearTimeout(_save_marks_timer);
    _save_marks_timer = setTimeout(_saveEditorMarks(code_editor), 5000);

    _updateOutline(code_editor.index);
};

var _addMarkDeleteEvent = function (code_editor, lineHandle) {
    CodeMirror.on(lineHandle, 'delete', function () {
        _deleteMark(code_editor, code_editor.editor.getLineNumber(lineHandle));
    });
};

var _loadEditorsMarks = function (editor) {
    var line = 0, 
        i = 0;
    
    if (_local_session_settings) {
        if ('code_editors' in _local_session_settings) {
            for (i = 0; i < _local_session_settings.code_editors.length; i += 1) {
                var saved_code_editor = _local_session_settings.code_editors[i];

                if (editor && editor.index !== i) {
                    continue;
                }

                var code_editor = _code_editors[i];

                code_editor.marks = [];

                var j = 0;
                for (j = 0; j < saved_code_editor.marks.length; j += 1) {
                    line = saved_code_editor.marks[j];

                    code_editor.editor.setGutterMarker(line, "fs-mark", _getNewMark());

                    var lineHandle = code_editor.editor.getLineHandle(line);
                    code_editor.marks.push(lineHandle);

                    _addMarkDeleteEvent(code_editor, lineHandle);
                }

                _updateOutline(code_editor.index);
            }
        }
    }
};

var _saveEditorMarks = function (code_editor) {
    return function () {
        var marks = [],
            i = 0;

        for (i = 0; i < code_editor.marks.length; i += 1) {
            marks.push(code_editor.editor.getLineNumber(code_editor.marks[i]));
        }
        
        _local_session_settings.code_editors[code_editor.index].marks = marks.slice();
        _saveLocalSessionSettings();
    }
};

var _updateMarks = function (code_editor) {
    return function () {
        var found = 0;
        var i, j;
        for (i = 0; i < code_editor.marks.length; i += 1) {
            var line = code_editor.editor.getLineNumber(code_editor.marks[i]);
            for (j = 0; j < _local_session_settings.code_editors[code_editor.index].marks.length; j += 1) {
                var line2 = _local_session_settings.code_editors[code_editor.index].marks[i];
                if (line == line2) {
                    found += 1;
                } 
            }

            if (found === 0) {
                break
            }
        }

        if (found === 0) {
            _saveEditorMarks(code_editor)();
        }
    };
};

var _applyEditorsOption = function (key, value) {
    var i = 0;
    for (i = 0; i < _code_editors.length; i += 1) {
        _code_editors[i].editor.setOption(key, value);
    }
};

/***********************************************************
    Init.
************************************************************/
