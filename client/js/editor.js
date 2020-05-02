/* jslint browser: true */

var _clearCodeMirrorWidgets = function () {
    var i = 0;

    for (i = 0; i < _codemirror_line_widgets.length; i += 1) {
        _code_editor.removeLineWidget(_codemirror_line_widgets[i]);
    }

    _codemirror_line_widgets = [];
};

var _parseCompileOutput = function (output) {
    var regex = /ERROR: \d+:(\d+): (.*)/g,

        msg_container,
        msg_icon,

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
        
        if (_gl2) {
            line = line - 1;
        }
        
        result.push({ line: m[1] - 1, msg: m[2]});

        if (_cm_show_inerrors || _code_editor.getOption("fullScreen")) {
            _codemirror_line_widgets.push(_code_editor.addLineWidget(line - 1, msg_container, { coverGutter: false, noHScroll: true }));
        }
    }
    
    return result;
};

var _updateCodeView = function () {
    var code = document.getElementById("code"),
        mid_panel = document.getElementById("fs_middle_panel"),

        mid_panel_offset = _getElementOffset(mid_panel);/*,
        
        fs_browser = document.getElementById("fs_browser"),
        fs_browser_offset = _getElementOffset(fs_browser);*/

    code.style.width = (window.innerWidth /*- (fs_browser_offset.left + fs_browser_offset.width + 2)*/) + "px";
    code.style.height = (window.innerHeight - (mid_panel_offset.top + mid_panel_offset.height)) + "px";
    
    //fs_browser.style.height = (window.innerHeight - (mid_panel_offset.top + mid_panel_offset.height)) + "px";

    _code_editor.refresh();
};

var _changeEditorTheme = function (theme) {
    if (_code_editor_theme_link) {
        document.getElementsByTagName('head')[0].removeChild(_code_editor_theme_link);
    }

    _code_editor_theme_link = document.createElement('link');

    _code_editor_theme_link.onload = function(){
        _code_editor.setOption("theme", theme);

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
    var new_editor,
        new_editor_element,
        synced_cm_document;
    
    _detached_code_editor_window = window.open("", "Fragment", [
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
    
    _detached_code_editor_window.document.write([
        '<!DOCTYPE html>',
        '<html>',
            '<head>',
                '<title>Fragment &lt; /&gt;</title>',
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
    _detached_code_editor_window.document.close();
};