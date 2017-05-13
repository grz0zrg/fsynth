/* jslint browser: true */

/* global CodeMirror, performance*/

// WUI - https://github.com/grz0zrg/wui
/* jslint browser: true */

var WUI_Dialog = new (function() {
    "use strict";

    /***********************************************************
        Private section.
        
        Fields.
    ************************************************************/
    
    var _self = this,
    
        _widget_list = {},
        
        _dragged_dialog = null,
        _resized_dialog = null,
        
        _touch_identifier = null,
        
        _drag_x = 0,
        _drag_y = 0,
        
        _resize_start_x = 0,
        _resize_start_y = 0,

        _resize_timeout = null,

        _detached_windows = [],

        _class_name = {
            dialog:         "wui-dialog",
            content:        "wui-dialog-content",
            btn:            "wui-dialog-btn",
            btn_close:      "wui-dialog-close",
            detach:         "wui-dialog-detach",
            minimized:      "wui-dialog-minimized",
            minimize:       "wui-dialog-minimize",
            maximize:       "wui-dialog-maximize",
            header:         "wui-dialog-header",
            open:           "wui-dialog-open",
            closed:         "wui-dialog-closed",
            draggable:      "wui-dialog-draggable",
            transition:     "wui-dialog-transition",
            dim_transition: "wui-dialog-dim-transition",
            modal:          "wui-dialog-modal",
            status_bar:     "wui-dialog-status-bar"
        },
        
        _known_options = {
            title: "",
            
            width: "80%",
            height: "40%",
            
            open: true,

            closable: true,
            minimizable: false,
            draggable: false,
            resizable: false,
            detachable: false,
            
            min_width: "title",
            min_height: 32,

            status_bar: false,
            status_bar_content: "",

            keep_align_when_resized: false,

            halign: "left", // 'left', 'center', 'right'
            valign: "top", // 'top', 'center', 'bottom'
            
            top: 0,
            left: 0,

            modal: false,
            
            minimized: false,

            on_close: null,
            on_detach: null,
            on_pre_detach: null,
            on_resize: null
        };
    
    /***********************************************************
        Private section.
        
        Initialization.
    ************************************************************/

    // this keep track of event listeners... globally
    // a tricky solution but the only one i know of until a standard pop up or someone has a better solution
    if (!Element.prototype['_addEventListener']) {
        Element.prototype._addEventListener = Element.prototype.addEventListener;
        Element.prototype.addEventListener = function(a, b, c) {
            this._addEventListener(a, b, c);
            if (!this['eventListenerList']) {
                this['eventListenerList'] = {};
            }

            if(!this.eventListenerList[a]) {
                this.eventListenerList[a] = [];
            }
            this.eventListenerList[a].push(b);
        };
        Element.prototype._removeEventListener = Element.prototype.removeEventListener;
        Element.prototype.removeEventListener = function(a, b, c) {
            if (this['eventListenerList']) {
                var events = this.eventListenerList[a], i;
                if(events) {
                    for (i = 0; i < events.length; i += 1) {
                        if (events[i] === b) {
                            events.splice(i, 1);
                            break;
                        }
                    }
                }
            }
            this._removeEventListener(a, b, c);
        };
    }

    /***********************************************************
        Private section.

        Functions.
    ************************************************************/
    
    var _removeDetachedWindow = function (widget) {
        var i = 0;
        
        for (i = 0; i < _detached_windows.length; i += 1) {
            if (_detached_windows[i] === widget.detachable_ref) {
                _detached_windows.splice(i, 1);
                break;
            }
        }
    };

    var _close = function (dialog, detach, propagate, remove_modal_element) {
        var widget = _widget_list[dialog.id], modal_elems, i, j, w;

        if (!widget) {
            return;
        }

        if (detach) {
            if(widget.detachable_ref) {
                if (!widget.detachable_ref.closed) {
                    widget.detachable_ref.close();
                }

                _removeDetachedWindow(widget);
            }
        }

        if (widget.dialog.classList.contains(_class_name.closed)) {
            return;
        }

        if (remove_modal_element) {
            if (widget.modal_element) {
                document.body.removeChild(widget.modal_element);

                for (i = 0; i < _detached_windows.length; i += 1) {
                    w = _detached_windows[i];

                    modal_elems = w.document.body.getElementsByClassName(_class_name.modal);

                    for (j = 0; j < modal_elems.length; j += 1) {
                        w.document.body.removeChild(modal_elems[j]);
                    }
                }
            }
        }

        if (!widget.dialog.classList.contains(_class_name.open)) {
            return;
        }

        dialog.classList.add(_class_name.closed);
        dialog.classList.remove(_class_name.open);

        if (propagate) {
            if (widget.opts.on_close !== null) {
                widget.opts.on_close();
            }
        }
    };

    var _focus = function (dialog) {
        var cz_index = 0,

            tmp_dialog = null,
            
            elem = null,

            widget = _widget_list[dialog.id];

        if (widget.opts.modal) {
            return;
        }

        for (var i in _widget_list) {
            if (_widget_list.hasOwnProperty(i)) {
                tmp_dialog = _widget_list[i].dialog;

                if (!isNaN(tmp_dialog.style.zIndex)) {
                    cz_index = parseInt(tmp_dialog.style.zIndex, 10);

                    if (cz_index > 100) {
                        tmp_dialog.style.zIndex = 100;
                    }
                }
            }
        }
        
        // traverse backward to see if it is contained by another dialog and focus all the parents, note: could be done once for performances
        elem = widget.dialog.parentElement;
        
        while (elem !== null) {
            if (elem.classList.contains(_class_name.dialog)) {
                elem.style.zIndex = 101;
            }
            
            elem = elem.parentElement;
        }

        dialog.style.zIndex = 101;
    };

    var _createModalElement = function (dialog) {
        var div = document.createElement("div");

        div.className = "wui-dialog-modal";

        div.addEventListener("click", function (ev) {
            ev.preventDefault();

            _close(dialog, true, true, true);
        });

        div.style.zIndex = 16777270;

        return div;
    };

    var _computeThenSetPosition = function (dialog) {
        var widget = _widget_list[dialog.id],

            opts = widget.opts,

            parent_width = dialog.parentElement.offsetWidth,
            parent_height = dialog.parentElement.offsetHeight,

            dialog_width = dialog.offsetWidth,
            dialog_height = dialog.offsetHeight;

        if (opts.halign === "center") {
            dialog.style.left = Math.round((parent_width - dialog_width) / 2 + opts.left) + "px";
        } else if (opts.halign === "right") {
            dialog.style.left = (parent_width - dialog_width + opts.left) + "px";
        } else {
            dialog.style.left = opts.left + "px";
        }

        if (opts.valign === "center") {
            dialog.style.top = Math.round((parent_height - dialog_height) / 2 + opts.top) + "px";
        } else if (opts.valign === "bottom") {
            dialog.style.top = (parent_height - dialog_height + opts.top) + "px";
        } else {
            dialog.style.top = opts.top + "px";
        }
    };

    var _minimize = function (minimize_btn, dialog) {
        var widget = _widget_list[dialog.id],
            
            resize_handler = widget.resize_handler;
        
        if (widget.dialog !== dialog) {
            _minimize(widget.header_minimaxi_btn, widget.dialog);
        }

        minimize_btn.classList.toggle(_class_name.minimize);
        minimize_btn.classList.toggle(_class_name.maximize);

        dialog.classList.toggle(_class_name.minimized);
        
        if (dialog.classList.contains(_class_name.minimized)) {
            dialog.style.borderStyle = "solid";
            dialog.style.borderColor = "#808080";
            dialog.style.borderWidth = "1px";
        } else {
            dialog.style.borderStyle = "";
            dialog.style.borderColor = "";
            dialog.style.borderWidth = "";
        }

        if (resize_handler) {
            resize_handler.classList.toggle(_class_name.open);
        }

        if (widget.status_bar) {
            widget.status_bar.classList.toggle(_class_name.open);
        }
    };

    var _onWindowResize = function (detached) {
        if (_resize_timeout === null) {
            _resize_timeout = setTimeout(function() {
                _resize_timeout = null;

                var doc = document,
                    dialog_contents,

                    widget,

                    content,
                    dialog,

                    status_bar,

                    bcr,

                    i;

                if (detached) {
                    doc = detached.document;

                    dialog_contents = doc.getElementsByClassName(_class_name.content);

                    for (i = 0; i < dialog_contents.length; i += 1) {
                        content = dialog_contents[i];

                        dialog = content.parentElement;

                        widget = _widget_list[dialog.id];

                        status_bar = dialog.getElementsByClassName(_class_name.status_bar);

                        if (status_bar.length > 0) {
                            content.style.height = (detached.innerHeight - 32) + "px";
                        } else {
                            content.style.height = detached.innerHeight + "px";
                        }

                        bcr = content.getBoundingClientRect();

                        if (widget.opts.on_resize) {
                            widget.opts.on_resize(bcr.width, bcr.height);
                        }
                    }

                    return;
                }

                dialog_contents = doc.getElementsByClassName(_class_name.content);

                // resize content & set position
                for (i = 0; i < dialog_contents.length; i += 1) {
                    content = dialog_contents[i];

                    dialog = content.parentElement;

                    status_bar = dialog.getElementsByClassName(_class_name.status_bar);

                    if (status_bar.length > 0) {
                        content.style.height = dialog.offsetHeight - 64 + "px";
                    } else {
                        content.style.height = dialog.offsetHeight - 32 + "px";
                    }

                    _computeThenSetPosition(dialog);

                    bcr = content.getBoundingClientRect();

                    widget = _widget_list[dialog.id];

                    if (widget.opts.on_resize) {
                        widget.opts.on_resize(bcr.width, bcr.height);
                    }
                }
            }, 1000 / 8);
        }
    };

    var _addListenerWalk = function (elem, target) {
        var key, i;

        do {
            if(elem.nodeType == 1) {
                if (elem['eventListenerList']) {
                    for (key in elem.eventListenerList) {
                        if (key === 'length' || !elem.eventListenerList.hasOwnProperty(key)) continue;
                            for (i = 0; i < elem.eventListenerList[key].length; i += 1) {
                                target.addEventListener(key, elem.eventListenerList[key][i], false);
                            }
                        }
                    }
                }
                if(elem.hasChildNodes()) {
                    _addListenerWalk(elem.firstChild, target.firstChild);
                }

                elem = elem.nextSibling;
                target = target.nextSibling;
            }
            while (elem && target);
    };

    var _detach = function (dialog) {
        var widget = _widget_list[dialog.id],

            //window_w, window_h,
            w, h,

            screen_left, screen_top,

            dialog_title_element = dialog.firstElementChild.firstElementChild.firstElementChild,

            stripped_title = dialog_title_element.textContent || dialog_title_element.innerText || "",

            child_window = widget.detachable_ref,

            css, css_html, i, dbc = dialog.getBoundingClientRect();
        
        if (widget.opts.on_pre_detach) {
            widget.opts.on_pre_detach();
        }

        if (dialog.classList.contains(_class_name.minimized)) {
            w = parseInt(dialog.style.width,  10);
            h = parseInt(dialog.style.height, 10) - 32;
        } else {
            w = dbc.width;
            h = dbc.height - 32;
        }

        screen_left = typeof window.screenLeft !== "undefined" ? window.screenLeft : screen.left;
        screen_top = typeof window.screenTop !== "undefined" ? window.screenTop : screen.top;

        /*window_w = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.availWidth;
        window_h = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.availHeight;*/

        _close(dialog, true, false, false);

        child_window = window.open("", stripped_title, [
            "toolbar=no",
            "location=no",
            "directories=no",
            "status=no",
            "menubar=no",
            "scrollbars=yes",
            "resizable=yes",
            "width=" + w,
            "height=" + h,
            "top=" + (dbc.top + screen_top + 32),//((window_h-h)/2 + screen_top),
            "left=" + (dbc.left  + screen_left)].join(','));//((window_w-w) / 2 + screen_left)].join(','));
        
        widget.detachable_ref = child_window;

        css_html = "";

        css = document.head.getElementsByTagName("link");

        for (i = 0; i < css.length; i += 1) {
            if (css[i].type === "text/css" && css[i].rel === "stylesheet") {
                css_html += css[i].outerHTML;
            }
        }

        css = document.head.getElementsByTagName("style");

        for (i = 0; i < css.length; i += 1) {
            css_html += css[i].outerHTML;
        }

        // insert the dialog content in the newly opened window
        // it insert back all CSS files of the parent as well...
        child_window.document.open();
        child_window.document.write(['<html>',
                                     '<head>',
                                     '<title>' + stripped_title + '</title>',
                                     css_html,
                                     '</head>',
                                     '<body id="' + dialog.id + "\" class=\"wui-dialog-detach-window-body\" onload=\"parent.opener.WUI_Dialog.childWindowLoaded(document.body.id)\">",
                                     //dialog.children[1].outerHTML,
                                     '</body>',
                                     '</html>'].join(''));
        child_window.document.close();

        child_window.document.body.appendChild(dialog.children[1].cloneNode(true));

        var status_bar = dialog.getElementsByClassName(_class_name.status_bar);

        if (status_bar.length > 0) {
            var new_status_bar = status_bar[0].cloneNode(true);

            new_status_bar.classList.add(_class_name.open);

            child_window.document.body.appendChild(new_status_bar);
        }
        
        child_window.addEventListener("keyup", function (ev) { if (ev.keyCode !== 27) { return; } _close(dialog, true, true, true); }, false);

        child_window.addEventListener("resize", function () { _onWindowResize(child_window); }, false);

        child_window.addEventListener("beforeunload", function () {
            //_removeDetachedWindow(widget);
            _close(dialog, true, true, true);

            /*if (widget.modal_element) {
                document.body.removeChild(widget.modal_element);
            }*/
        }, false);

        _detached_windows.push(child_window);
    };

    var _onClick = function (ev) {
        ev.preventDefault();
        //ev.stopPropagation();

        var element = ev.target,

            dialog = null;

        if (element.classList.contains(_class_name.btn_close)) {
            dialog = element.parentElement.parentElement;

            _close(dialog, false, true, true);
        } else if (element.classList.contains(_class_name.maximize) ||
                   element.classList.contains(_class_name.minimize)) {
            dialog = element.parentElement.parentElement;

            _minimize(element, dialog);
        } else if (element.classList.contains(_class_name.detach)) {
            dialog = element.parentElement.parentElement;

            _detach(dialog);
        }
    };
    
    var _onKeyUp = function (ev) {
        if (ev.keyCode !== 27) {
            return;
        }
        
        var key, widget;
        
        for(key in _widget_list) { 
            if (_widget_list.hasOwnProperty(key)) {
                widget = _widget_list[key];
                
                if (widget.opts.closable &&
                    widget.dialog.style.zIndex === "101" && 
                    widget.dialog.classList.contains(_class_name.open)) {
                    _self.close(key, true);
                    
                    return;
                }
            }
        }
    };
    
    var _windowMouseMove = function (ev) {
        if (!_dragged_dialog) {
            return;
        }

        ev.preventDefault();
        
        var widget = _widget_list[_dragged_dialog.id],
        
            x = ev.clientX,
            y = ev.clientY,
            
            touches = ev.changedTouches,
            
            touch = null,
            
            i,
            
            new_x, new_y;
        
        if (touches) {
            for (i = 0; i < touches.length; i += 1) {
                touch = touches[i];
                
                if (touch.identifier === _touch_identifier) {
                    x = touches[i].clientX;
                    y = touches[i].clientY;
                    
                    break;
                }
            }
        }
        
        new_x = x - _drag_x;
        new_y = y - _drag_y;

        _dragged_dialog.style.left = new_x + 'px';
        _dragged_dialog.style.top  = new_y + 'px';
        
        if (widget.dialog !== _dragged_dialog) {
            widget.dialog.style.left = new_x + 'px';
            widget.dialog.style.top  = new_y + 'px';
        }
    };
    
    var _windowMouseUp = function (ev) {
        if (!_dragged_dialog) {
            return;
        }

        var touches = ev.changedTouches,
            
            touch = null,
            
            i,

            owner_doc = _dragged_dialog.ownerDocument,
            owner_win = owner_doc.defaultView || owner_doc.parentWindow;
        
        if (touches) {
            for (i = 0; i < touches.length; i += 1) {
                touch = touches[i];
                
                if (touch.identifier === _touch_identifier) {
                    _dragged_dialog = null;
                    
                    owner_doc.body.style.cursor = "default";
                    
                    owner_win.removeEventListener('touchmove', _windowMouseMove, false);
                    owner_win.removeEventListener('touchend', _windowMouseUp, false);
                    
                    break;
                }
            }
        } else {
            _dragged_dialog = null;
            
            owner_doc.body.style.cursor = "default";
            
            owner_win.removeEventListener('mousemove', _windowMouseMove, false);
            owner_win.removeEventListener('mouseup', _windowMouseUp, false);
        }
    };
    
    var _onMouseDown = function (ev) {
        var x = ev.clientX,
            y = ev.clientY,
            
            left = 0,
            top = 0,

            touches = ev.changedTouches,

            owner_doc,
            owner_win,

            dragged_dialog;
        
        ev.preventDefault();

        if (_dragged_dialog === null) {
            if (touches) {
                _touch_identifier = touches[0].identifier;
                
                x = touches[0].clientX;
                y = touches[0].clientY;
            } else if (ev.button !== 0) {
                return;
            }
        }
        
        dragged_dialog = ev.target.parentElement;

        if (dragged_dialog.classList.contains(_class_name.maximize) ||
           !dragged_dialog.classList.contains(_class_name.draggable)) {
            return;
        }
        
        _dragged_dialog = dragged_dialog;

        owner_doc = _dragged_dialog.ownerDocument;
        owner_win = owner_doc.defaultView || owner_doc.parentWindow;

        _focus(_dragged_dialog);
        
        owner_doc.body.style.cursor = "move";
        
        left = parseInt(_dragged_dialog.style.left, 10);
        top = parseInt(_dragged_dialog.style.top,  10);

        _drag_x = x - left;
        _drag_y = y - top;

        owner_win.addEventListener('mousemove', _windowMouseMove, false);
        owner_win.addEventListener('touchmove', _windowMouseMove, false);

        owner_win.addEventListener('mouseup',  _windowMouseUp, false);
        owner_win.addEventListener('touchend', _windowMouseUp, false);
    };
    
    var _onStartResize = function (e) {
        e.preventDefault();
        e.stopPropagation();

        var dialog = e.target.parentElement,

            left = dialog.offsetLeft,
            top  = dialog.offsetTop,

            touches = e.changedTouches,

            owner_doc = dialog.ownerDocument,
            owner_win = owner_doc.defaultView || owner_doc.parentWindow;

        if (touches) {
            _touch_identifier = touches[0].identifier;
        }

        _resize_start_x = left;
        _resize_start_y = top;

        dialog.classList.remove(_class_name.dim_transition);

        owner_win.addEventListener('mousemove', _onResize, false);
        owner_win.addEventListener('touchmove', _onResize, false);

        owner_win.addEventListener('mouseup', _onStopResize, false);
        owner_win.addEventListener('touchend', _onStopResize, false);

        _resized_dialog = dialog;
    };

    var _onResize = function (e) {
        e.preventDefault();

        var x = e.clientX, y = e.clientY,

            touches = e.changedTouches,

            touch = null,

            widget = _widget_list[_resized_dialog.id],

            dialog_contents = null,

            title_div = null,
            title_div_width = 0,

            i = 0,

            w, h, off_h = 0;

        if (touches) {
            for (i = 0; i < touches.length; i += 1) {
                touch = touches[i];

                if (touch.identifier === _touch_identifier) {
                    x = touches[i].clientX;
                    y = touches[i].clientY;

                    break;
                }
            }
        }

        w = x - _resize_start_x;
        h = y - _resize_start_y;

        /*if (widget.opts.halign === "center") {
            w += 2;
        }

        if (widget.opts.valign === "center") {
            h += 2;
        }*/

        title_div = _resized_dialog.firstElementChild.firstElementChild.firstElementChild;

        title_div_width = title_div.offsetWidth + 148;

        if (widget.opts.min_width === "title" &&
            w < title_div_width) {
            w = title_div_width;
        } else if (w < widget.opts.min_width) {
            w = widget.opts.min_width;
        }

        if (widget.opts.status_bar) {
            off_h = 32;
        }

        if (h < (widget.opts.min_height + off_h)) {
            h = widget.opts.min_height + off_h;
        }

        _resized_dialog.style.width  = w + "px";

        if (!_resized_dialog.classList.contains(_class_name.minimized)) {
            _resized_dialog.style.height = h + "px";
        }

        dialog_contents = _resized_dialog.getElementsByClassName(_class_name.content);

        for (i = 0; i < dialog_contents.length; i += 1) {
            var content = dialog_contents[i],

                widg = _widget_list[content.parentElement.id],

                bcr;

            content.style.height = (_resized_dialog.offsetHeight - 32 - off_h) + "px";

            bcr = content.getBoundingClientRect();

            if (widg.opts.on_resize) {
                widg.opts.on_resize(bcr.width, bcr.height);
            }

            if (widget.opts.keep_align_when_resized) {
                _computeThenSetPosition(_resized_dialog);
            }
        }
    };

    var _onStopResize = function (e) {
        var owner_doc = _resized_dialog.ownerDocument,
            owner_win = owner_doc.defaultView || owner_doc.parentWindow;

        e.preventDefault();

        _resized_dialog.classList.add(_class_name.dim_transition);

        owner_win.removeEventListener('mousemove', _onResize, false);
        owner_win.removeEventListener('touchmove', _onResize, false);

        owner_win.removeEventListener('mouseup', _onStopResize, false);
        owner_win.removeEventListener('touchend', _onStopResize, false);

        _resized_dialog = null;
    };

    var _onBeforeUnload = function () {
        for (var id in _widget_list) {
            if (_widget_list.hasOwnProperty(id)) {
                _close(_widget_list[id].dialog, true, false, true);
            }
        }
    };
    
    var _createFailed = function () {
        console.log("WUI_RangeSlider 'create' failed, first argument not an id nor a DOM element.");
    };

    /***********************************************************
        Public section.
        
        Functions.
    ************************************************************/

    this.create = function (id, options) { 
        var dialog,
            
            header = document.createElement("div"),
            
            resize_handler = null,

            header_detach_btn    = null,
            header_close_btn     = null,
            header_minimaxi_btn  = null,
            header_title         = null,
            header_title_wrapper = null,

            status_bar = null,
            
            opts = {},
            
            key;
        
        if ((typeof id) === "string") {
            dialog = document.getElementById(id);
        } else if ((typeof id) === "object") {
            if ((typeof id.innerHTML) !== "string") {
                _createFailed();
                
                return;
            }
            
            dialog = id;

            id = dialog.id;
        } else {
            _createFailed();
            
            return;
        }
        
        if (_widget_list[id] !== undefined) {
            console.log("WUI_Dialog id '" + id + "' already created, aborting.");
            
            return;
        }
        
        for (key in _known_options) {
            if (_known_options.hasOwnProperty(key)) {
                opts[key] = _known_options[key];
            }
        }
        
        if (options !== undefined) {
            for (key in options) {
                if (options.hasOwnProperty(key)) {
                    if (_known_options[key] !== undefined) {
                        opts[key] = options[key];
                    }
                }
            }
        }
        
        var content = dialog.firstElementChild;
        
        if (content === null) {
            content = document.createElement("div");
            
            dialog.appendChild(content);
        }
        
        // set dialog style
        dialog.style.width  = opts.width;
        dialog.style.height = opts.height;

        dialog.classList.add(_class_name.dialog);
        
        content.classList.add(_class_name.content);
        
        // build the dialog header (btns and the title)
        header.className = _class_name.header;
        
        if (opts.status_bar) {
            content.style.height = dialog.offsetHeight - 64 + "px";
        } else {
            content.style.height = dialog.offsetHeight - 32 + "px";
        }
        
        //if (opts.title !== "") {
            header_title_wrapper = document.createElement("div");
            header_title = document.createElement("div");

            header_title_wrapper.style.display = "inline-block";
            
            header_title.className = "wui-dialog-title";
            header_title_wrapper.innerHTML = opts.title;
            
            header_title.appendChild(header_title_wrapper);
            header.appendChild(header_title);
        //}

        if (opts.draggable) {
            dialog.classList.toggle(_class_name.draggable);

            header.addEventListener("mousedown", _onMouseDown, false);
            header.addEventListener("touchstart", _onMouseDown, false);
        }

        if (opts.closable) {
            header_close_btn = document.createElement("div"); 
            header_close_btn.className = _class_name.btn + " " + _class_name.btn_close;

            header_close_btn.title = "Close";

            header.appendChild(header_close_btn);
        }
        
        if (opts.minimizable) {
            header_minimaxi_btn = document.createElement("div");
            header_minimaxi_btn.className = _class_name.btn + " " + _class_name.minimize;

            if (opts.minimized) {
                _minimize(header_minimaxi_btn, dialog);
            }

            header.appendChild(header_minimaxi_btn);
        }

        if (opts.detachable) {
            header_detach_btn = document.createElement("div");
            header_detach_btn.className = _class_name.btn + " " + _class_name.detach;

            header_detach_btn.title = "Detach";

            header.appendChild(header_detach_btn);
        }

        if (opts.status_bar) {
            status_bar = document.createElement("div");

            status_bar.classList.add(_class_name.status_bar);
            status_bar.classList.add(_class_name.transition);
            status_bar.classList.add(_class_name.open);

            status_bar.innerHTML = opts.status_bar_content;

            dialog.appendChild(status_bar);
        }
        
        header.addEventListener("click", _onClick, false);
        header.addEventListener("touchstart", _onClick, false);

        window.addEventListener("resize", function () { _onWindowResize(false); }, false);
        window.addEventListener("beforeunload", _onBeforeUnload, false);

        dialog.classList.add(_class_name.transition);
        dialog.classList.add(_class_name.dim_transition);

        // go!
        dialog.insertBefore(header, content);
        
        if (opts.resizable) {
            resize_handler = document.createElement("div");

            resize_handler.addEventListener("mousedown", _onStartResize, false);
            resize_handler.addEventListener("touchstart", _onStartResize, false);

            resize_handler.classList.add("wui-dialog-resize");

            resize_handler.classList.add(_class_name.transition);

            resize_handler.classList.add(_class_name.open);

            dialog.appendChild(resize_handler);
        }
        
        _widget_list[id] =  {
                                dialog: dialog,
                                minimized_id: -1,

                                resize_handler: resize_handler,
            
                                header_minimaxi_btn: header_minimaxi_btn,

                                opts: opts,
            
                                detachable_ref: null,

                                modal_element: null,

                                status_bar: status_bar
                            };
        
        _computeThenSetPosition(dialog);
        
        _focus(dialog);
        
        if (opts.open) {
            this.open(id, false);
        } else {
            dialog.classList.add(_class_name.closed);
        }

        return id;
    };
    
    this.setStatusBarContent = function (id, content) {
        var widget = _widget_list[id],
            
            status_bar,

            detach_ref;

        if (widget === undefined) {
            if (typeof console !== "undefined") {
                console.log("Cannot setStatusBarContent of WUI dialog \"" + id + "\".");
            }

            return;
        }

        if (widget.status_bar) {
            widget.status_bar.innerHTML = content;

            detach_ref = widget.detachable_ref;
            if (detach_ref) {
                if (!detach_ref.closed) {
                    status_bar = detach_ref.document.body.getElementsByClassName(_class_name.status_bar);

                    if (status_bar.length > 0) {
                        status_bar[0].innerHTML = content;
                    }
                }
            }
        }
    };

    this.open = function (id, detach) {
        var widget = _widget_list[id],

            div, i, dialog;

        if (widget === undefined) {
            if (typeof console !== "undefined") {
                console.log("Cannot open WUI dialog \"" + id + "\".");
            }
            
            return;   
        }
        
        if (widget.detachable_ref) {
            if (!widget.detachable_ref.closed) {
                widget.detachable_ref.focus();

                return;
            }
        }

        dialog = widget.dialog;

        if (widget.opts.modal) {
            div = _createModalElement(dialog);

            widget.dialog.style.zIndex = 16777271;

            widget.modal_element = div;

            document.body.appendChild(div);

            for (i = 0; i < _detached_windows.length; i += 1) {
                div = _createModalElement(dialog);

                _detached_windows[i].document.body.appendChild(div);
            }
        }

        if (detach) {
            _detach(dialog);

            return;
        }

        dialog.classList.remove(_class_name.closed);
        dialog.classList.add(_class_name.open);

        _focus(dialog);
    };
    
    this.focus = function (id) {
        var widget = _widget_list[id];

        if (widget === undefined) {
            if (typeof console !== "undefined") {
                console.log("Cannot focus WUI dialog \"" + id + "\".");
            }

            return;
        }
        
        _focus(widget.dialog);
    };

    this.close = function (id, propagate) {
        var widget = _widget_list[id];

        if (widget === undefined) {
            if (typeof console !== "undefined") {
                console.log("Cannot close WUI dialog \"" + id + "\".");
            }

            return;
        }

        _close(widget.dialog, true, propagate, true);
    };

    this.destroy = function (id) {
        var widget = _widget_list[id],

            element;

        if (widget === undefined) {
            console.log("Element id '" + id + "' is not a WUI_Dialog, destroying aborted.");

            return;
        }

        _close(widget.dialog, true, false, true);

        element = widget.dialog;

        element.parentElement.removeChild(element);

        delete _widget_list[id];
    };
    
    // called from a dialog detached window, this basically ensure that the window is initialized before adding back listeners on elements
    this.childWindowLoaded = function (id) {
        var widget = _widget_list[id],
            child_window = widget.detachable_ref;
        
        if (!child_window) {
            return;
        }
        
        if (child_window.document.body.firstElementChild) {
            _addListenerWalk(widget.dialog.children[1], child_window.document.body.firstElementChild);

            if (widget.opts.on_detach) {
                widget.opts.on_detach(child_window);
            }
        } else {
            window.setTimeout(function(){ // temporary
                WUI_Dialog.childWindowLoaded(id);
            }, 500);
        }
    };
    
    // get the corresponding detached dialog for dialog dialog_id
    this.getDetachedDialog = function (dialog_id) {
        var widget = _widget_list[dialog_id],
            
            i = 0;
        
        if (widget === undefined) {
            if (dialog_id !== undefined) {
                console.log("WUI_Dialog.getDetachedDialog: Element id '" + dialog_id + "' is not a WUI_Dialog.");
            }

            return null;
        }
            
        for (i = 0; i < _detached_windows.length; i += 1) {
            if (_detached_windows[i] === widget.detachable_ref) {
                return widget.detachable_ref;
            }
        }
        
        return null;
    };
    
    document.addEventListener("keyup", _onKeyUp, false);
})();

/* jslint browser: true */
/* jshint globalstrict: false */
/* global */

var WUI_DropDown = new (function() {
    "use strict";

    /***********************************************************
        Private section.
        
        Fields.
    ************************************************************/
    
    var _widget_list = {},
        
        _class_name = {
            dropdown:   "wui-dropdown",
            item:       "wui-dropdown-item",
            content:    "wui-dropdown-content",
            selected:   "wui-dropdown-selected",
            open:       "wui-dropdown-open",
            on:         "wui-dropdown-on"
        },
        
        _known_options = {
            width: "auto",
            height: 24,
            
            ms_before_hiding: 2000,
            
            vertical: false,
            
            vspacing: 0,
            
            selected_id: 0, // default item selected
            
            on_item_selected: null
        };
    
    /***********************************************************
        Private section.
        
        Functions.
    ************************************************************/
    
    var _getElementOffset = function (element) {
        var owner_doc = element.ownerDocument,
            box = element.getBoundingClientRect(),
            body = owner_doc.body,
            docEl = owner_doc.documentElement,

            owner_win = owner_doc.defaultView || owner_doc.parentWindow,
        
            scrollTop = owner_win.pageYOffset || docEl.scrollTop || body.scrollTop,
            scrollLeft = owner_win.pageXOffset || docEl.scrollLeft || body.scrollLeft,

            clientTop = docEl.clientTop || body.clientTop || 0,
            clientLeft = docEl.clientLeft || body.clientLeft || 0,

            top  = box.top +  scrollTop - clientTop,
            left = box.left + scrollLeft - clientLeft;

        return { top: Math.round(top), left: Math.round(left) };
    };
    
    var _createFloatingContent = function (doc, widget) {
        var floating_content = doc.createElement("div"),
            div_item = null,
            item = "",
            i;

        for (i = 0; i < widget.content_array.length; i += 1) {
            item = widget.content_array[i];

            div_item = doc.createElement("div");

            if (!widget.opts.vertical) {
                div_item.classList.add("wui-dropdown-horizontal");
            }

            div_item.classList.add(_class_name.item);

            div_item.innerHTML = item;

            div_item.dataset.index = i;

            floating_content.appendChild(div_item);

            //widget.items.push(div_item);

            div_item.addEventListener("click", _itemClick, false);

            if (item === widget.content_array[widget.selected_id]) {
                div_item.classList.add(_class_name.selected);
            }
        }

        floating_content.addEventListener("mouseover", _mouseOver, false);

        floating_content.classList.add(_class_name.content);

        floating_content.dataset.linkedto = widget.element.id;

        doc.body.appendChild(floating_content);

        widget.floating_content = floating_content;
    };

    var _deleteFloatingContent = function (doc, dd, widget) {
        //widget.floating_content.classList.remove(_class_name.open);
        dd.classList.remove(_class_name.on);

        if (widget.floating_content) {
            if (widget.floating_content.parentElement === doc.body) {
                doc.body.removeChild(widget.floating_content);
            }
        }

        widget.floating_content = null;
        
        widget.close_timeout = null;
    };
    
    var _click = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();

        var current_element = ev.target,

            widget = null,

            floating_content = null;

        if (current_element.classList.contains(_class_name.dropdown)) {
            widget = _widget_list[current_element.id];

            floating_content = widget.floating_content;

            if (floating_content) {
                if (floating_content.classList.contains(_class_name.open)) {
                    _deleteFloatingContent(ev.target.ownerDocument, current_element, widget);
                }
            } else {
                _mouseOver(ev);
            }
        }

        return;
    };

    var _itemClick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();

        var current_element = ev.target,
            
            widget,
            
            floating_content = null,
            
            floating_content_childs = null,
            
            i;
        
        if (current_element.classList.contains(_class_name.item)) {
            floating_content = current_element.parentElement;
            
            widget = _widget_list[floating_content.dataset.linkedto];
        } else {
            return;   
        }
        
        floating_content_childs = floating_content.getElementsByTagName('div');

        for (i = 0; i < floating_content_childs.length; i += 1) {
            floating_content_childs[i].classList.remove(_class_name.selected);
        }
        
        current_element.classList.add(_class_name.selected);
        
        widget.selected_id = parseInt(current_element.dataset.index, 10);
        widget.target_element.lastElementChild.innerHTML = current_element.textContent;
        
        if (widget.element !== widget.target_element) {
            widget.element.lastElementChild.innerHTML = current_element.textContent;
        }
        
        if (widget.opts.on_item_selected !== undefined) {
            widget.opts.on_item_selected(current_element.dataset.index);  
        }

        _deleteFloatingContent(current_element.ownerDocument, widget.target_element, widget);
    };
    
    var _mouseOver = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();

        var current_element = ev.target,
            
            widget = null,
            
            offset = null,
            
            floating_content = null,

            owner_doc = current_element.ownerDocument,
            owner_win = owner_doc.defaultView || owner_doc.parentWindow;

        if (current_element.classList.contains(_class_name.dropdown)) {
            widget = _widget_list[current_element.id];
            
            if (widget.floating_content === null) {
                current_element.classList.add(_class_name.on);

                _createFloatingContent(owner_doc, widget);

                floating_content = widget.floating_content;

                offset = _getElementOffset(current_element);

                floating_content.style.top = (offset.top - floating_content.offsetHeight - widget.opts.vspacing) + "px";
                floating_content.style.left = offset.left + "px";

                floating_content.classList.add(_class_name.open);

                widget.target_element = current_element;
            }
        } else if ( current_element.classList.contains(_class_name.content)) {
            widget = _widget_list[current_element.dataset.linkedto];
        } else if ( current_element.classList.contains(_class_name.item)) {
            widget = _widget_list[current_element.parentElement.dataset.linkedto];
        } else {
            return;
        }
        
        owner_win.clearTimeout(widget.close_timeout);

        current_element.addEventListener("mouseleave", _mouseLeave, false);
    };
    
    var _mouseLeave = function (ev) {
        ev.preventDefault();

        var current_element = ev.target,
            
            widget = null,

            owner_doc = current_element.ownerDocument,
            owner_win = owner_doc.defaultView || owner_doc.parentWindow;
    
        if (current_element.classList.contains(_class_name.content)) {
            widget = _widget_list[current_element.dataset.linkedto];
        } else if (current_element.classList.contains(_class_name.item)) {
            widget = _widget_list[current_element.parentElement.dataset.linkedto];
        } else {
            widget = _widget_list[current_element.id];
        }
            
        widget.close_timeout = owner_win.setTimeout(_deleteFloatingContent, widget.opts.ms_before_hiding, owner_doc, widget.target_element, widget);

        current_element.removeEventListener("mouseleave", _mouseLeave, false);
    };

    var _createFailed = function () {
        console.log("WUI_RangeSlider 'create' failed, first argument not an id nor a DOM element.");
    };
    
    /***********************************************************
        Public section.
        
        Functions.
    ************************************************************/

    this.create = function (id, options, content_array) {
        var dropdown,

            opts = {},
        
            key;
        
        if ((typeof id) === "string") {
            dropdown = document.getElementById(id);
        } else if ((typeof id) === "object") {
            if ((typeof id.innerHTML) !== "string") {
                _createFailed();
                
                return;
            }
            
            dropdown = id;

            id = dropdown.id;
        } else {
            _createFailed();
            
            return;
        }
        
        if (_widget_list[id] !== undefined) {
            console.log("WUI_DropDown id '" + id + "' already created, aborting.");
            
            return;
        }
        
        for (key in _known_options) {
            if (_known_options.hasOwnProperty(key)) {
                opts[key] = _known_options[key];
            }
        }
        
        if (options !== undefined) {
            for (key in options) {
                if (options.hasOwnProperty(key)) {
                    if (_known_options[key] !== undefined) {
                        opts[key] = options[key];
                    }
                }
            }
        }
        
        dropdown.classList.add(_class_name.dropdown);
        
        dropdown.style.width = opts.width;
        dropdown.style.height = opts.height;
        
        var div_icon = document.createElement("div");
        div_icon.classList.add("wui-dropdown-icon");

        dropdown.appendChild(div_icon);
        
        var div_button = document.createElement("div");
        div_button.classList.add("wui-dropdown-text");
        
        if (content_array.length !== 0) {
            div_button.innerHTML = content_array[opts.selected_id];
        }
        
        dropdown.appendChild(div_button);
        
        dropdown.addEventListener("click", _click, false);
        
        dropdown.addEventListener("mouseover", _mouseOver, false);
        
        var dd = {
            element: dropdown,

            floating_content: null,
            //items: [],
            selected_id: opts.selected_id,

            content_array: content_array,
            
            opts: opts,
            
            button_item: div_button,
            
            hover_count: 0,
            
            target_element: null,

            close_timeout: null
        };
        
        _widget_list[id] = dd;

        return id;
    };
    
    this.destroy = function (id) {
        var widget = _widget_list[id],

            element;

        if (widget === undefined) {
            console.log("Element id '" + id + "' is not a WUI_DropDown, destroying aborted.");

            return;
        }

        element = widget.element;

        _deleteFloatingContent(document, element, widget);

        element.parentElement.removeChild(element);

        delete _widget_list[id];
    };
})();

/* jslint browser: true */
/* jshint globalstrict: false */
/* global */

var WUI_RangeSlider = new (function() {
    "use strict";

    /***********************************************************
        Private section.

        Fields.
    ************************************************************/

    var _widget_list = {},

        _hook_value = null,

        _grabbed_widget = null,
        _grabbed_hook_element = null,

        _touch_identifier = null,

        _container_suffix_id = "_wui_container",

        //_midi_learn_disabled_color = "background-color: #ff0000",
        _midi_learn_enabled_color = "background-color: #00ff00",
        _midi_learn_current = null,
        _midi_controls =  {

        },

        _title = {
            midi_learn_btn: "MIDI learn"
        },

        _class_name = {
            hook:           "wui-rangeslider-hook",
            bar:            "wui-rangeslider-bar",
            filler:         "wui-rangeslider-filler",

            hook_focus:     "wui-rangeslider-hook-focus",

            value_input:    "wui-rangeslider-input",

            midi_learn_btn: "wui-rangeslider-midi-learn-btn"
        },

        _known_options = {
            width: 148,
            height: 8,

            title: "",

            title_min_width: 0,
            value_min_width: 0,

            min: 0,
            max: 1,

            decimals: 4,

            step: 0.01,
            scroll_step: 0.01,

            vertical: false,

            title_on_top: false,

            on_change: null,

            default_value: 0.0,
            value: 0.0,

            bar: true,

            midi: null,

            /*
                can be an object with the following fields (example) :
                    {
                        min: { min: 0, max: 0, val: 0 },
                        max: { min: 0, max: 0, val: 0 },
                        step: { min: 0, max: 0, val: 0 },
                        scroll_step: { min: 0, max: 0, val: 0 }
                    }
                if one of these keys are undefined, the option will be not configurable
            */
            configurable: null
        },

        _known_configurable_options = {
            min: 0,
            max: 0,
            step: 0,
            scroll_step: 0
        },

        // exportable parameters
        _exportable_parameters = {
            opts: {},
            endless: false,
            midi: {},
            value: 0
        };

    /***********************************************************
        Private section.

        Functions.
    ************************************************************/

    // find the same slider element from a detached WUI_Dialog
    var _getDetachedElement = function (id) {
        var node = document.getElementById(id),

            wui_dialog_id,
            win_handle;

        while (node) {
            if (node.classList) {
                if (node.classList.contains('wui-dialog')) {
                    wui_dialog_id = node.id;
                    break;
                }
            }

            node = node.parentNode;
        }

        if (WUI_Dialog) {
            win_handle = WUI_Dialog.getDetachedDialog(wui_dialog_id);

            if (win_handle) {
                return win_handle.document.getElementById(id);
            }
        }

        return null;
    };

    var _getElementOffset = function (element) {
        var owner_doc = element.ownerDocument,
            box = element.getBoundingClientRect(),
            body = owner_doc.body,
            docEl = owner_doc.documentElement,

            owner_win = owner_doc.defaultView || owner_doc.parentWindow,

            scrollTop = owner_win.pageYOffset || docEl.scrollTop || body.scrollTop,
            scrollLeft = owner_win.pageXOffset || docEl.scrollLeft || body.scrollLeft,

            clientTop = docEl.clientTop || body.clientTop || 0,
            clientLeft = docEl.clientLeft || body.clientLeft || 0,

            top  = box.top +  scrollTop - clientTop,
            left = box.left + scrollLeft - clientLeft;

        return { top: Math.round(top), left: Math.round(left) };
    };

    var _onChange = function (func, value) {
        if (func !== null) {
            func(value);
        }
    };

    // thank to Nick Knowlson - http://stackoverflow.com/questions/4912788/truncate-not-round-off-decimal-numbers-in-javascript
    var _truncateDecimals = function (num, digits) {
        var numS = num.toString(),
            decPos = numS.indexOf('.'),
            substrLength = decPos == -1 ? numS.length : 1 + decPos + digits,
            trimmedResult = numS.substr(0, substrLength),
            finalResult = isNaN(trimmedResult) ? 0 : trimmedResult;

        return parseFloat(finalResult);
    };

    var _getHookElementFromTarget = function (ev_target) {
        if (ev_target.classList.contains(_class_name.hook)) {
            return ev_target;
        } else if (ev_target.classList.contains(_class_name.filler)) {
            return ev_target.firstElementChild;
        } else if (!ev_target.firstElementChild) {
            return null;
        }

        return ev_target.firstElementChild.firstElementChild;
    };

    var _update = function (rs_element, rs, value) {
        var element = rs_element,

            widget = _widget_list[element.id],

            bar,
            filler,
            hook,

            value_input,

            width = rs.opts.width,
            height = rs.opts.height,

            pos = Math.abs((value - rs.opts.min) / rs.opts.range);

        bar = element.getElementsByClassName(_class_name.bar)[0];
        filler = bar.firstElementChild;
        hook = filler.firstElementChild;

        value_input = bar.nextElementSibling;

        value = _truncateDecimals(value, widget.opts.decimals);

        if (rs.opts.vertical) {
            pos = Math.round(pos * bar.offsetHeight);

            filler.style.position = "absolute";
            filler.style.bottom = "0";
            filler.style.width = "100%";
            filler.style.height = pos + "px";

            hook.style.marginTop  = -width + "px";
            hook.style.marginLeft = -width / 2 - 1 + "px";

            hook.style.width  = width * 2 + "px";
            hook.style.height = width * 2 + "px";

            value_input.style.marginTop = "13px";

            // all theses are to support synchronization between a detached dialog and the original dialog
            // TODO: optimize/clean all this mess :P
            if (widget.element !== element) {
                widget.filler.style.position = "absolute";
                widget.filler.style.bottom = "0";
                widget.filler.style.width = "100%";
                widget.filler.style.height = pos + "px";

                widget.hook.style.marginTop  = -width + "px";
                widget.hook.style.marginLeft = -width / 2 - 1 + "px";

                widget.hook.style.width  = width * 2 + "px";
                widget.hook.style.height = width * 2 + "px";

                widget.value_input.style.marginTop = "13px";
            }
        } else {
            pos = Math.round(pos * width);

            filler.style.width = pos + "px";
            filler.style.height = "100%";

            hook.style.left = pos + "px";

            hook.style.marginTop  = -height / 2 + "px";
            hook.style.marginLeft = -height + "px";

            hook.style.width  = height * 2 + "px";
            hook.style.height = height * 2 + "px";

            if (widget.element !== element) {
                widget.filler.style.width = pos + "px";
                widget.filler.style.height = "100%";

                widget.hook.style.left = pos + "px";

                widget.hook.style.marginTop  = -height / 2 + "px";
                widget.hook.style.marginLeft = -height + "px";

                widget.hook.style.width  = height * 2 + "px";
                widget.hook.style.height = height * 2 + "px";
            }
        }

        widget.value_input.value = value;
        value_input.value = value;

        rs.value = value;
    };

    var _mouseMove = function (ev) {
        ev.preventDefault();

        if (_grabbed_hook_element !== null) {
            var filler = _grabbed_hook_element.parentElement,
                bar = filler.parentElement,

                value_input = bar.nextElementSibling,//bar.parentElement.lastElementChild,

                bar_offset = _getElementOffset(bar),
                max_pos = bar.offsetWidth,

                cursor_relative_pos = 0,

                x = ev.clientX,
                y = ev.clientY,

                touches = ev.changedTouches,

                touch = null,

                i, v;

            if (touches) {
                for (i = 0; i < touches.length; i += 1) {
                    touch = touches[i];

                    if (touch.identifier === _touch_identifier) {
                        x = touches[i].clientX;
                        y = touches[i].clientY;

                        break;
                    }
                }
            }

            if (_grabbed_widget.opts.vertical) {
                max_pos = bar.offsetHeight;

                cursor_relative_pos = Math.round((bar_offset.top + bar.offsetHeight - y) / _grabbed_widget.opts.step) * _grabbed_widget.opts.step;
            } else {
                cursor_relative_pos = Math.round((x - bar_offset.left) / _grabbed_widget.opts.step) * _grabbed_widget.opts.step;
            }

            if (cursor_relative_pos > max_pos) {
                cursor_relative_pos = max_pos;

                _hook_value = _grabbed_widget.opts.max;
            } else if (cursor_relative_pos < 0) {
                cursor_relative_pos = 0;

                _hook_value = _grabbed_widget.opts.min;
            } else {
                _hook_value = (Math.round((_grabbed_widget.opts.min + (cursor_relative_pos / max_pos) * _grabbed_widget.opts.range) / _grabbed_widget.opts.step) * _grabbed_widget.opts.step);
            }

            if (_grabbed_widget.value === _hook_value) {
                return;
            }

            _grabbed_widget.value = _hook_value;

            v = _truncateDecimals(_hook_value, _grabbed_widget.opts.decimals);

            value_input.value = v;
            _grabbed_widget.value_input.value = v;

            if (_grabbed_widget.opts.vertical) {
                filler.style.height = cursor_relative_pos + "px";
                _grabbed_widget.filler.style.height = cursor_relative_pos + "px";
            } else {
                filler.style.width = cursor_relative_pos + "px";
                _grabbed_widget.filler.style.width = cursor_relative_pos + "px";

                _grabbed_hook_element.style.left = cursor_relative_pos + "px";
                _grabbed_widget.hook.style.left = cursor_relative_pos + "px";
            }

            _onChange(_grabbed_widget.opts.on_change, _hook_value);
        }
    };

    var _rsMouseUp = function (ev) {
        if (!_grabbed_hook_element) {
            return;
        }

        ev.preventDefault();

        var touches = ev.changedTouches,

            touch = null,

            stop_drag = false,

            i,

            owner_doc = _grabbed_hook_element.ownerDocument,
            owner_win = owner_doc.defaultView || owner_doc.parentWindow;

        if (touches) {
            for (i = 0; i < touches.length; i += 1) {
                touch = touches[i];

                if (touch.identifier === _touch_identifier) {
                    stop_drag = true;

                    owner_win.removeEventListener("touchend", _rsMouseUp, false);
                    owner_win.removeEventListener("touchmove", _mouseMove, false);

                    break;
                }
            }
        } else {
            stop_drag = true;

            owner_win.removeEventListener("mouseup", _rsMouseUp, false);
            owner_win.removeEventListener("mousemove", _mouseMove, false);
        }

        if (stop_drag) {
            _grabbed_hook_element.classList.remove(_class_name.hook_focus);

            _grabbed_hook_element = null;
            _grabbed_widget = null;

            owner_doc.body.style.cursor = "default";
        }
    };

    var _rsMouseDown = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();

        var rs_element = null,

            drag_slider = false,

            touches = ev.changedTouches,

            owner_doc,
            owner_win;

        if (_grabbed_widget === null) {
            if (touches) {
                _touch_identifier = touches[0].identifier;

                drag_slider = true;
            }
        }

        if (ev.button === 0) {
            drag_slider = true;
        }

        if (drag_slider) {
            _grabbed_hook_element = _getHookElementFromTarget(ev.target);

            _grabbed_hook_element.classList.add(_class_name.hook_focus);

            rs_element = _grabbed_hook_element.parentElement.parentElement.parentElement;

            _grabbed_widget = _widget_list[rs_element.id];

            owner_doc = rs_element.ownerDocument;
            owner_win = owner_doc.defaultView || owner_doc.parentWindow;

            owner_doc.body.style.cursor = "pointer";

            _mouseMove(ev);

            owner_win.addEventListener("mousemove", _mouseMove, false);
            owner_win.addEventListener("touchmove", _mouseMove, false);
            owner_win.addEventListener("mouseup",   _rsMouseUp, false);
            owner_win.addEventListener("touchend",  _rsMouseUp, false);
        }
    };

    var _rsDblClick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();

        var hook_element = ev.target,

            rs_element = hook_element.parentElement.parentElement.parentElement,

            grabbed_widget = _widget_list[rs_element.id],

            value = grabbed_widget.opts.default_value;

        _update(rs_element, grabbed_widget, value);

        _onChange(grabbed_widget.opts.on_change, value);
    };

    var _rsMouseWheel = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();

        var hook_element,
            rs_element,
            grabbed_widget,
            delta = ev.wheelDelta ? ev.wheelDelta / 40 : ev.detail ? -ev.detail : 0,
            value;

        hook_element = _getHookElementFromTarget(ev.target);

        if (hook_element === null) {
            rs_element = ev.target.parentElement;
            grabbed_widget = _widget_list[rs_element.id];
        } else {
            rs_element = hook_element.parentElement.parentElement.parentElement;
            grabbed_widget = _widget_list[rs_element.id];
        }

        value = parseFloat(grabbed_widget.value);

        if (delta >= 0) {
            value += grabbed_widget.opts.scroll_step;
        } else {
            value -= grabbed_widget.opts.scroll_step;
        }

        if (!grabbed_widget.endless) {
            if (grabbed_widget.opts.max && value > grabbed_widget.opts.max) {
                value = grabbed_widget.opts.max;
            } else if (value < grabbed_widget.opts.min) {
                value = grabbed_widget.opts.min;
            }
        }

        _update(rs_element, grabbed_widget, value);

        _onChange(grabbed_widget.opts.on_change, value);
    };

    var _inputChange = function (ev) {
        if ((ev.target.validity) && (!ev.target.validity.valid)) {
            return;
        }

/*
        var target = ev.target.parentElement.childNodes[1];

        if (target === undefined) {
            return;
        }

        var hook_element = _getHookElementFromTarget(target),
*/
            var rs_element = /*hook_element*/ev.target.parentElement/*.parentElement.parentElement*/,

            grabbed_widget = _widget_list[rs_element.id];

        _update(rs_element, grabbed_widget, ev.target.value);

        _onChange(grabbed_widget.opts.on_change, ev.target.value);
    };

    var _fnConfInputChange = function (ev, widget, conf_key) {
        return function (ev) {
            var target = ev.target,
                opts = widget.opts;

            if ((target.validity) && (!target.validity.valid)) {
                if (conf_key === "min" ||
                    conf_key === "max") {
                        widget.endless = true;
                } else if (conf_key === "step") {
                    widget.value_input.step = "any";
                }

                return;
            }

            if (conf_key === "min") {
                opts.min = _truncateDecimals(target.value, opts.decimals);

                widget.value_input.min = opts.min;

                //if (opts.min < 0) {
                    opts.range = opts.max - opts.min;
                //}

                widget.endless = false;
            } else if (conf_key === "max") {
                opts.max = _truncateDecimals(target.value, opts.decimals);

                widget.value_input.max = opts.max;

                //opts.range = opts.max;

                //if (opts.min < 0) {
                    opts.range = opts.max - opts.min;
                //}

                widget.endless = false;
            } else if (conf_key === "step") {
                opts.step = _truncateDecimals(target.value, opts.decimals);

                widget.value_input.step = opts.step;
            } else if (conf_key === "scroll_step") {
                opts.scroll_step = _truncateDecimals(target.value, opts.decimals);
            }

            if (opts.configurable[conf_key] !== undefined) {
                opts.configurable[conf_key].val = target.value;
            }
        };
    };

    var _removeMIDIControls = function (id) {
        var device,
            control,

            ctrl_obj,

            widget_id,

            i;

        if (id) {
            for(device in _midi_controls) {
                for(control in _midi_controls[device]) {
                    ctrl_obj = _midi_controls[device][control];

                    for (i = 0; i < ctrl_obj.widgets.length; i += 1) {
                        widget_id = ctrl_obj.widgets[i];

                        if (widget_id === id) {
                            ctrl_obj.widgets.splice(i, 1);

                            return;
                        }
                    }
                }
            }
        }
    };

    var _onMIDILearnBtnClick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();

        var target = ev.target,
            rs_element = target.parentElement,

            widget = _widget_list[rs_element.id],

            detached_slider,

            key,
            value_obj,

            elems;

        if (widget.learn) {
            widget.learn = false;

            target.style = "";
            target.title = _title.midi_learn_btn;

            widget.learn_elem.title = _title.midi_learn_btn;

            _midi_learn_current = null;

            widget.midi.device = null;
            widget.midi.controller = null;

            _removeMIDIControls(rs_element.id);

            return;
        }

        for(key in _widget_list) {
            if (_widget_list.hasOwnProperty(key)) {
                value_obj = _widget_list[key];

                value_obj.learn = false;

                detached_slider = _getDetachedElement(key);

                if (detached_slider) {
                    elems = detached_slider.getElementsByClassName(_class_name.midi_learn_btn);
                    if (elems.length > 0) {
                        elems[0].style = "";
                    }
                }

                if (value_obj.learn_elem) {
                    value_obj.learn_elem.style = "";
                }
            }
        }

        widget.learn = true;

        target.style = _midi_learn_enabled_color;

        _midi_learn_current = rs_element.id;
    };

    var _onConfigurableBtnClick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();

        var target = ev.target,
            rs_element = target.parentElement,

            widget = _widget_list[rs_element.id],

            opts = widget.opts,

            owner_doc = target.ownerDocument,

            id = widget.element.id + _container_suffix_id,

            fn,
            btn_offset,
            key, key_value,
            configure_container,
            input_label, input_element,
            close_btn,
            i = 1;

        if (!document.getElementById(id)) {
            widget.configure_panel_open = false;
        }

        if (widget.configure_panel_open === true) {
            return;
        }

        configure_container = owner_doc.createElement("div");
        configure_container.className = "wui-rangeslider-configure-container";

        close_btn = owner_doc.createElement("div");
        close_btn.className = "wui-rangeslider-configure-close";

        fn = function (ev) {
                widget.configure_panel_open = false;

                var doc_cc = document.getElementById(id),
                    own_cc = ev.target.ownerDocument.getElementById(id);

                if (doc_cc) {
                    if (doc_cc.parentElement) {
                        doc_cc.parentElement.removeChild(doc_cc);
                    }
                }

                if (own_cc) {
                    if (own_cc.parentElement) {
                        own_cc.parentElement.removeChild(own_cc);
                    }
                }
            };

        close_btn.addEventListener("click", fn, false);
        close_btn.addEventListener("touchstart", fn, false);

        configure_container.id = id;

        configure_container.appendChild(close_btn);

        for (key in opts.configurable) {
            if (opts.configurable.hasOwnProperty(key)) {
                if (_known_configurable_options[key] !== undefined) {
                    key_value = opts.configurable[key];

                    input_label = owner_doc.createElement("div");
                    input_label.style.display = "inline-block";
                    input_label.style.marginRight = "8px";
                    input_label.style.width = "80px";
                    input_label.style.textAlign = "right";
                    input_label.innerHTML = key.replace("_", " ") + " : ";

                    input_element = owner_doc.createElement("input");
                    input_element.className = _class_name.value_input;

                    //input_element.style.display = "inline-block";

                    configure_container.appendChild(input_label);
                    configure_container.appendChild(input_element);

                    if (i%2 === 0) {
                        configure_container.appendChild(owner_doc.createElement("div"));
                    }

                    input_element.setAttribute("type", "number");
                    input_element.setAttribute("step", "any");

                    if (key_value !== undefined) {
                        if (key_value.min !== undefined) {
                            input_element.setAttribute("min", key_value.min);
                            input_element.title = input_element.title + " min: " + key_value.min;
                        }
                        if (key_value.max !== undefined) {
                            input_element.setAttribute("max", key_value.max);
                            input_element.title = input_element.title + " max: " + key_value.max;
                        }
                        if (key_value.val !== undefined) {
                            input_element.setAttribute("value", key_value.val);
                        } else {
                            if (key === "min") {
                                input_element.setAttribute("value", opts.min);
                            } else if (key === "max") {
                                input_element.setAttribute("value", opts.max);
                            } else if (key === "step") {
                                input_element.setAttribute("value", opts.step);
                            } else if (key === "scroll_step") {
                                input_element.setAttribute("value", opts.scroll_step);
                            }
                        }
                    }

                    input_element.addEventListener("input", _fnConfInputChange(ev, widget, key), false);

                    i += 1;
                }
            }
        }

        btn_offset = _getElementOffset(target);

        //configure_container.style.top = btn_offset.top + "px";
        //configure_container.style.left = btn_offset.left + "px";

        /*owner_doc.body*/rs_element.insertBefore(configure_container, target);

        widget.configure_panel_open = true;
    };

    var _createFailed = function () {
        console.log("WUI_RangeSlider 'create' failed, first argument not an id nor a DOM element.");
    };

    /***********************************************************
        Public section.

        Functions.
    ************************************************************/

    this.create = function (id, options) {
        var range_slider,

            opts = {},

            key;

        if ((typeof id) === "string") {
            range_slider = document.getElementById(id);
        } else if ((typeof id) === "object") {
            if ((typeof id.innerHTML) !== "string") {
                _createFailed();

                return;
            }

            range_slider = id;

            id = range_slider.id;
        } else {
            _createFailed();

            return;
        }

        if (_widget_list[id] !== undefined) {
            console.log("WUI_RangeSlider id '" + id + "' already created, aborting.");

            return;
        }

        for (key in _known_options) {
            if (_known_options.hasOwnProperty(key)) {
                opts[key] = _known_options[key];
            }
        }

        if (options !== undefined) {
            for (key in options) {
                if (options.hasOwnProperty(key)) {
                    if (_known_options[key] !== undefined) {
                        opts[key] = options[key];
                    }
                }
            }

            if (options.max !== undefined) {
                opts.range = options.max;
            }

            if (options.step !== undefined) {
                opts.step = options.step;

                if (options.scroll_step === undefined) {
                    opts.scroll_step = opts.step;
                }
            }

            if (options.title_on_top !== undefined) {
                opts.title_on_top = options.title_on_top;
            } else {
                if (opts.vertical) {
                    opts.title_on_top = true;
                }
            }

            if (options.default_value !== undefined) {
                opts.default_value = options.default_value;
            } else {
                if (options.min !== undefined && options.max !== undefined) {
                    opts.default_value = opts.min + opts.max / 2;
                }
            }
        }

        if (opts.min < 0) {
            opts.range = opts.max - opts.min;
        }

        // build up the range slider widget internal data structure
        _widget_list[id] = null;

        // build the range slider and its items
        range_slider.classList.add("wui-rangeslider");

        if (opts.title_on_top) {
            range_slider.classList.add("wui-rangeslider-title-ontop");
        }

        var title_div   = document.createElement("div"),
            bar         = document.createElement("div"),
            filler      = document.createElement("div"),
            hook        = document.createElement("div"),
            value_div   = document.createElement("div"),
            value_input = document.createElement("input"),

            rs = {
                    element: range_slider,

                    opts: opts,

                    bar: null,
                    filler: null,
                    hook: null,

                    endless: false,

                    midi: {
                        device: null,
                        controller: null,

                        ctrl_type: "abs"
                    },

                    learn: false,
                    learn_elem: null,

                    value_input: value_input,

                    default_value: opts.default_value,
                    value: opts.value
                 };

        title_div.innerHTML = opts.title;

        value_input.setAttribute("value", opts.value);
        value_input.setAttribute("type",  "number");
        value_input.setAttribute("step",  opts.step);

        value_input.classList.add(_class_name.value_input);

        value_div.classList.add("wui-rangeslider-value");
        title_div.classList.add("wui-rangeslider-title");
        bar.classList.add(_class_name.bar);
        filler.classList.add(_class_name.filler);
        hook.classList.add(_class_name.hook);

        if (opts.vertical) {
            title_div.style.textAlign = "center";
        }

        title_div.style.minWidth = opts.title_min_width + "px";
        value_div.style.minWidth = opts.value_min_width + "px";
        value_input.style.minWidth = opts.value_min_width + "px";

        bar.style.width  = opts.width + "px";
        bar.style.height = opts.height + "px";

        range_slider.appendChild(title_div);

        if (!opts.bar) {
            bar.style.display = "none";

            value_input.style.marginTop = "6px";
        }

        if (options.hasOwnProperty("min")) {
            value_input.setAttribute("min", opts.min);
        } else {
            opts.min = undefined;
        }

        if (options.hasOwnProperty("max")) {
            value_input.setAttribute("max", opts.max);
        } else {
            opts.max = undefined;

            if (opts.min === undefined) {
                rs.endless = true;
            }
        }

        bar.appendChild(filler);
        filler.appendChild(hook);
        range_slider.appendChild(bar);

        rs.bar = bar;
        rs.filler = filler;
        rs.hook = hook;

        range_slider.appendChild(value_input);

        if (opts.configurable) {
            var configurable_opts = 0;
            for (key in opts.configurable) {
                if (opts.configurable.hasOwnProperty(key)) {
                    if (_known_configurable_options[key] !== undefined) {
                        configurable_opts += 1;
                    }
                }
            }

            // add configurable button
            if (configurable_opts > 0) {
                var configurable_btn_div = document.createElement("div");

                configurable_btn_div.classList.add("wui-rangeslider-configurable-btn");

                configurable_btn_div.addEventListener("click", _onConfigurableBtnClick, false);
                configurable_btn_div.addEventListener("touchstart", _onConfigurableBtnClick, false);

                // accomodate the slider layout for the configurable button
                if (opts.title_on_top && !opts.vertical) {
                    configurable_btn_div.style.bottom = "0";
                    title_div.style.marginBottom = "4px";
                } else if (opts.title_on_top && opts.vertical) {
                    title_div.style.marginLeft = "16px";
                    title_div.style.marginRight = "16px";
                    configurable_btn_div.style.top = "0";
                } else {
                    title_div.style.marginLeft = "16px";
                    configurable_btn_div.style.top = "0";
                }

                if (opts.vertical) {
                    range_slider.appendChild(configurable_btn_div);
                } else {
                    range_slider.insertBefore(configurable_btn_div, title_div);
                }
            }
        }

        if (opts.midi) {
            if (navigator.requestMIDIAccess) {
                var midi_learn_elem = document.createElement("div");
                midi_learn_elem.classList.add(_class_name.midi_learn_btn);
                midi_learn_elem.title = _title.midi_learn_btn;

                midi_learn_elem.addEventListener("click", _onMIDILearnBtnClick, false);
                midi_learn_elem.addEventListener("touchstart", _onMIDILearnBtnClick, false);

                rs.learn_elem = midi_learn_elem;

                if (opts.midi["type"]) {
                    rs.midi.ctrl_type = opts.midi.type;
                }

                range_slider.appendChild(midi_learn_elem);
            } else {
                console.log("WUI_RangeSlider id '" + id + "' : Web MIDI API is disabled. (not supported by your browser?)");
            }
        }

        if (opts.bar) {
            bar.addEventListener("mousedown", _rsMouseDown, false);
            bar.addEventListener("touchstart", _rsMouseDown, false);
            bar.addEventListener("mousewheel", _rsMouseWheel, false);
            bar.addEventListener("DOMMouseScroll", _rsMouseWheel, false);

            hook.addEventListener("dblclick", _rsDblClick, false);
        } else {
            value_input.addEventListener("mousewheel", _rsMouseWheel, false);
            value_input.addEventListener("DOMMouseScroll", _rsMouseWheel, false);
        }

        value_input.addEventListener("input", _inputChange, false);

        _widget_list[id] = rs;

        _update(range_slider, rs, opts.value);

        return id;
    };

    this.destroy = function (id) {
        var widget = _widget_list[id],

            element,

            owner_doc,

            container_element;

        if (widget === undefined) {
            console.log("Element id '" + id + "' is not a WUI_RangeSlider, destroying aborted.");

            return;
        }

        if (_midi_learn_current === id) {
            midi_learn_current = null;
        }

        _removeMIDIControls(id);

        element = widget.element;

        element.parentElement.removeChild(element);

        owner_doc = element.ownerDocument;

        container_element = owner_doc.getElementById(id + _container_suffix_id);

        if (container_element) {
            owner_doc.removeChild(container_element);
        }

        delete _widget_list[id];
    };

    this.getParameters = function (id) {
        var widget = _widget_list[id],
            parameters = { },
            key;

        if (widget === undefined) {
            console.log("Element id '" + id + "' is not a WUI_RangeSlider, getParameters aborted.");

            return null;
        }

        for (key in widget) {
            if (widget.hasOwnProperty(key)) {
                if (_exportable_parameters[key] !== undefined) {
                    parameters[key] = widget[key];
                }
            }
        }

        return parameters;
    };

    this.setParameters = function (id, parameters) {
        var widget = _widget_list[id],
            key;

        if (widget === undefined) {
            console.log("Element id '" + id + "' is not a WUI_RangeSlider, setParameters aborted.");

            return;
        }

        if (!parameters) {
            return;
        }

        for (key in widget) {
            if (widget.hasOwnProperty(key)) {
                if (parameters[key] !== undefined) {
                    widget[key] = parameters[key];
                }
            }
        }

        if (widget.midi.device) {
            if (widget.midi.controller) {
                _midi_controls["d" + widget.midi.device]["c" + widget.midi.controller].widgets.push(id);
            }
        }

        _update(widget.element, widget, widget.value);
    };

    this.setValue = function (id, value, trigger_on_change) {
        var widget = _widget_list[id];

        if (widget === undefined) {
            console.log("Element id '" + id + "' is not a WUI_RangeSlider, setParameters aborted.");

            return;
        }

        _update(widget.element, widget, value);

        if (trigger_on_change) {
          _onChange(widget.opts.on_change, value);
        }
    };

    this.submitMIDIMessage = function (midi_event) {
        var id = _midi_learn_current,

            widget,

            device = midi_event.data[0],
            controller = midi_event.data[1],
            value = parseInt(midi_event.data[2], 10),

            kdevice = "d" + device,
            kcontroller = "c" + controller,

            ctrl_obj,

            elems,
            elem,

            detached_slider,

            new_value,

            i = 0;

        if (_midi_learn_current) {
            widget = _widget_list[id];

            if (!_midi_controls[kdevice]) {
                _midi_controls[kdevice] = {};
            }

            if (!_midi_controls[kdevice][kcontroller]) {
                _midi_controls[kdevice][kcontroller] = {
                        prev_value: value,
                        widgets: [],
                        increments: 1
                    };
            }

            _midi_controls[kdevice][kcontroller].widgets.push(id);

            detached_slider = _getDetachedElement(id);

            if (detached_slider) {
                elems = detached_slider.getElementsByClassName(_class_name.midi_learn_btn);
                if (elems.length > 0) {
                    elems[0].style = "";
                    elems[0].title = kdevice + " " + kcontroller;
                }
            }

            widget.midi.device = device;
            widget.midi.controller = controller;

            widget.learn = false;
            widget.learn_elem.style = "";
            widget.learn_elem.title = kdevice + " " + kcontroller;
            _midi_learn_current = null;

            return;
        }

        if (_midi_controls[kdevice]) {
            if (_midi_controls[kdevice][kcontroller]) {
                ctrl_obj = _midi_controls[kdevice][kcontroller];

                for (i = 0; i < ctrl_obj.widgets.length; i += 1) {
                    id = ctrl_obj.widgets[i];

                    widget = _widget_list[id];

                    detached_slider = _getDetachedElement(id);
                    if (detached_slider) {
                        elem = detached_slider;
                    } else {
                        elem = widget.element;
                    }

                    if (widget.midi.ctrl_type === "abs") {
                        new_value = widget.opts.min + widget.opts.range * (value / 127.0);

                        _update(elem, widget, new_value);

                        _onChange(widget.opts.on_change, new_value);
                    } else if (widget.midi.ctrl_type === "rel") {
                        var step = widget.opts.step;
                        if (step === "any") {
                            step = 0.5;
                        }

                        if (ctrl_obj.prev_value > value) {
                            ctrl_obj.increments = -step;

                            new_value = widget.value - step;

                            if (new_value < widget.opts.min && !widget.endless) {
                                continue;
                            }

                            ctrl_obj.prev_value = value;
                        } else if (ctrl_obj.prev_value < value) {
                            ctrl_obj.increments = step;

                            new_value = widget.value + step;

                            if (new_value > widget.opts.max && !widget.endless) {
                                continue;
                            }

                            ctrl_obj.prev_value = value;
                        } else {
                            new_value = widget.value + ctrl_obj.increments;

                            if (!widget.endless) {
                                if (new_value > widget.opts.max) {
                                    continue;
                                } else if (new_value < widget.opts.min) {
                                    continue;
                                }
                            }
                        }

                        _update(elem, widget, new_value);

                        _onChange(widget.opts.on_change, new_value);
                    }
                }
            }
        }
    };
})();

var WUI_Input = WUI_RangeSlider;

/* jslint browser: true */
/* jshint globalstrict: false */

var WUI_Tabs = new (function() {
    "use strict";

    /***********************************************************
        Private section.
        
        Fields.
    ************************************************************/
    
    var _widget_list = {},
        
        _class_name = {
            enabled:      "wui-tab-enabled",
            disabled:     "wui-tab-disabled",
            display_none: "wui-tab-display-none",
            tabs:         "wui-tabs",
            tab:          "wui-tab",
            tabs_content: "wui-tabs-content",
            tab_content:  "wui-tab-content",
            underline:    "wui-tabs-underline"
        },
        
        _known_options = {
            on_tab_click: null,

            height: "calc(100% - 30px)"
        };

    /***********************************************************
        Private section.
        
        Functions.
    ************************************************************/
    
    var _onTabClick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();

        var tab_elem = ev.target,
            
            tabs = tab_elem.parentElement,
            content = tabs.nextElementSibling.nextElementSibling,
            
            widget_id = tabs.parentElement.id,
            
            widget = _widget_list[widget_id],

            tab_index = 0,
            elem = null,
            
            i = 0;
        
        for (i = 0; i < tabs.childElementCount; i += 1) {
            elem = tabs.children[i];
            
            elem.classList.remove(_class_name.enabled);
            elem.classList.add(_class_name.disabled);
            
            widget.tabs[i].classList.remove(_class_name.enabled);
            widget.tabs[i].classList.add(_class_name.disabled);

            if (elem === tab_elem) {
                tab_index = i;
            }
        }

        for (i = 0; i < content.childElementCount; i += 1) {
            elem = content.children[i];
            
            elem.classList.remove(_class_name.display_none);
            
            widget.contents[i].classList.remove(_class_name.display_none);

            if (tab_index !== i) {
                elem.classList.add(_class_name.display_none);

                widget.contents[i].classList.add(_class_name.display_none);
            }
        }
        
        widget.tabs[tab_index].classList.remove(_class_name.disabled);
        widget.tabs[tab_index].classList.add(_class_name.enabled);

        ev.target.classList.remove(_class_name.disabled);
        ev.target.classList.add(_class_name.enabled);

        if (widget.opts.on_tab_click) {
            widget.opts.on_tab_click(tab_index);
        }
    };
    
    var _createFailed = function () {
        console.log("WUI_RangeSlider 'create' failed, first argument not an id nor a DOM element.");
    };
    
    /***********************************************************
        Public section.
        
        Functions.
    ************************************************************/

    /**
     * Create a tabs widget from an element.
     * @param {String}   id       DOM Element id
     * @param {Function} tab_click_callback Called when a tab is clicked
     */
    this.create = function (id, options) {
        var element,
            
            tabs,
            underline = document.createElement("div"),
            content,
            
            first_tab,
            
            opts = {},
            
            key,

            i = 0;
        
        if ((typeof id) === "string") {
            element = document.getElementById(id);
        } else if ((typeof id) === "object") {
            if ((typeof id.innerHTML) !== "string") {
                _createFailed();
                
                return;
            }
            
            element = id;

            id = element.id;
        } else {
            _createFailed();
            
            return;
        }
        
        tabs = element.firstElementChild;
        content = tabs.nextElementSibling;
            
        first_tab = tabs.children[0];
        
        if (_widget_list[id] !== undefined) {
            console.log("WUI_Tabs id '" + id + "' already created, aborting.");
            
            return;
        }
        
        for (key in _known_options) {
            if (_known_options.hasOwnProperty(key)) {
                opts[key] = _known_options[key];
            }
        }
        
        if (options !== undefined) {
            for (key in options) {
                if (options.hasOwnProperty(key)) {
                    if (_known_options[key] !== undefined) {
                        opts[key] = options[key];
                    }
                }
            }
        }
        
        element.style.overflow = "hidden";

        underline.className = "wui-tabs-underline";
        
        element.insertBefore(underline, content);
        
        // style tabs
        tabs.classList.add(_class_name.tabs);
        
        var tab_count = tabs.childElementCount,
            tab_elems = [];
        
        for (i = 0; i < tab_count; i += 1) {
            var tab = tabs.children[i];
            
            tab.classList.add("wui-tab");
            
            if (tab !== first_tab) {
                tab.classList.add(_class_name.disabled);
            }
            
            tab.addEventListener("click", _onTabClick, false);
            tab.addEventListener("touchstart", _onTabClick, false);

            tab_elems.push(tab);
        }
        
        first_tab.classList.add(_class_name.enabled);
        first_tab.classList.add("wui-first-tab");
        
        // style tabs content
        content.classList.add("wui-tabs-content");
        
        var tab_content_count = content.childElementCount,
            content_elems = [content.children[0]];
        
        content.style.height = opts.height;
        
        content.children[0].classList.add(_class_name.tab_content);  
        
        for (i = 1; i < tab_content_count; i += 1) {
            var tab_content = content.children[i];
            
            tab_content.classList.add(_class_name.tab_content);
            tab_content.classList.add(_class_name.display_none);

            content_elems.push(tab_content);
        }
        
        _widget_list[id] = { element: element, tabs: tab_elems, contents: content_elems, opts : opts };
        
        return id;
    };
    
    /**
     * Get tab content element from a widget id and tab id
     * @param   {String} id     Widget id
     * @param   {Number} tab_id Tab id
     * @returns {Object} DOM Element of the tab content
     */
    this.getContentElement = function (id, tab_id) {
        var element = document.getElementById(id);
        var content = element.firstElementChild.nextElementSibling.nextElementSibling;
        
        return content.children[tab_id];
    };
    
    /**
     * Get a tab name from a widget id and tab id
     * @param   {String} id     Widget id
     * @param   {Number} tab_id Tab id
     * @returns {String} Tab name
     */
    
    this.getTabName = function (id, tab_id) {
        var content = this.getContentElement(id, tab_id);
        
        return content.getAttribute("data-group-name");
    };

    this.destroy = function (id) {
        var widget = _widget_list[id],

            element,

            tabs, tabs_underline, tabs_content,

            i;

        if (widget === undefined) {
            console.log("Element id '" + id + "' is not a WUI_Tabs, destroying aborted.");

            return;
        }

        element = widget.element;

        // make it compatible with WUI_Dialog, it shouldn't remove the WUI_Dialog content div...
        if (!element.classList.contains("wui-dialog-content")) {
            element.parentElement.removeChild(element);
        } else {
            tabs = element.getElementsByClassName(_class_name.tabs);
            tabs_underline = element.getElementsByClassName(_class_name.underline);
            tabs_content = element.getElementsByClassName(_class_name.tabs_content);

            for (i = 0; i < tabs.length; i += 1) {
                element.removeChild(tabs[i]);
                element.removeChild(tabs_underline[i]);
                element.removeChild(tabs_content[i]);
            }
        }

        delete _widget_list[id];
    };
})();

/* jslint browser: true */
/* jshint globalstrict: false */

var WUI_ToolBar = new (function() {
    "use strict";

    /***********************************************************
        Private section.
        
        Fields.
    ************************************************************/
    
    var _widget_list = {},
        
        _class_name = {
            minimize_icon:  "wui-toolbar-minimize-icon",
            maximize_icon:  "wui-toolbar-maximize-icon",
            button:         "wui-toolbar-button",
            minimize_group: "wui-toolbar-minimize-group",
            minimize_gr_v:  "wui-toolbar-minimize-group-vertical",
            toggle:         "wui-toolbar-toggle",
            toggle_on:      "wui-toolbar-toggle-on",
            item:           "wui-toolbar-item",
            group:          "wui-toolbar-group",
            vertical_group: "wui-toolbar-group-vertical",
            tb:             "wui-toolbar",

            // dropdown
            dd_content:     "wui-toolbar-dropdown-content",
            dd_item:        "wui-toolbar-dropdown-item",
            dd_open:        "wui-toolbar-dropdown-open"
        },
        
        _known_options = {
            item_hmargin: null,
            item_vmargin: null,

            item_width: 32,
            item_height: 32,
            
            icon_width: 32,
            icon_height: 32,
            
            allow_groups_minimize: false,
            
            vertical: false
        };

    /***********************************************************
        Private section.
        
        Functions.
    ************************************************************/
    
    var _getWidget = function (toolbar_id) {
        var widget = _widget_list[toolbar_id];

        if (widget === undefined) {
            if (typeof console !== "undefined") {
                console.log("_getWidget failed, the element id \"" + toolbar_id + "\" is not a WUI_ToolBar.");
            }

            return null;
        }

        return widget;
    };

    var _getElementOffset = function (element) {
        var owner_doc = element.ownerDocument,
            box = element.getBoundingClientRect(),
            body = owner_doc.body,
            docEl = owner_doc.documentElement,

            owner_win = owner_doc.defaultView || owner_doc.parentWindow,

            scrollTop = owner_win.pageYOffset || docEl.scrollTop || body.scrollTop,
            scrollLeft = owner_win.pageXOffset || docEl.scrollLeft || body.scrollLeft,

            clientTop = docEl.clientTop || body.clientTop || 0,
            clientLeft = docEl.clientLeft || body.clientLeft || 0,

            top  = box.top +  scrollTop - clientTop,
            left = box.left + scrollLeft - clientLeft;

        return { top: Math.round(top), left: Math.round(left) };
    };

    var _getWidgetFromElement = function (element, toolbar_id) {
        if (toolbar_id !== undefined) {
            return _widget_list[toolbar_id];
        } else if (element.classList.contains(_class_name.tb)) {
            return _widget_list[element.id];
        } else if (element.classList.contains(_class_name.minimize_icon) ||
                   element.classList.contains(_class_name.maximize_icon) ||
                   element.classList.contains(_class_name.vertical_group)||
                   element.classList.contains(_class_name.group)) {
            return _widget_list[element.parentElement.id];
        } else {
            return _widget_list[element.parentElement.parentElement.id];
        }
    };
    
    var _propagate = function (tool, type, state) {
        if (tool.on_click !== undefined &&
            tool.on_click !== null) {
            var o = {
                id: tool.id,
                type: type
            };
            
            if (state !== undefined) {
                o.state = state;
            }
            
            tool.on_click(o);
        }
    };
    
    var _createDdFloatingContent = function (doc, tool, widget) {
        var dropdown_floating_content = doc.createElement("div"), j;

        if (tool.items !== undefined) {
            for (j = 0; j < tool.items.length; j += 1) {
                var item = tool.items[j],

                    div_item = doc.createElement("div");

                if (!tool.vertical) {
                    div_item.classList.add("wui-toolbar-dropdown-horizontal");
                }

                div_item.classList.add(_class_name.dd_item);

                div_item.innerHTML = item.title;

                div_item.dataset.index = j;

                dropdown_floating_content.appendChild(div_item);
            }
        }

        dropdown_floating_content.addEventListener("click", _ddItemClick, false);

        //widget.floating_content = dropdown_floating_content;

        dropdown_floating_content.style.width = widget.dd_items_width + "px";

        dropdown_floating_content.classList.add(_class_name.dd_content);

        dropdown_floating_content.dataset.linkedto_tb = widget.element.id;
        dropdown_floating_content.dataset.linkedto_tool_index = tool.id;

        doc.body.appendChild(dropdown_floating_content);

        return dropdown_floating_content;
    };

    var _toggle = function (element, toolbar_id, propagate) {
        var widget = null,
            
            state = false,
            
            toggle_group,
            
            tb,

            tools,

            i = 0;
        
        widget = _getWidgetFromElement(element, toolbar_id);
        
        tb = widget.element;

        if (element.parentElement) {
            if (element.parentElement.parentElement) {
                tb = element.parentElement.parentElement;
            }
        }

        var my_tool = widget.tools[parseInt(element.dataset.tool_id, 10)];
        
        if (my_tool.element.dataset.on === "1") {
            my_tool.element.dataset.on = 0;
            element.dataset.on = 0;
            
            my_tool.element.title = my_tool.tooltip;

            element.title = my_tool.tooltip;

            if (my_tool.icon !== undefined) {
                my_tool.element.classList.add(my_tool.icon);
                my_tool.element.classList.remove(my_tool.toggled_icon);

                element.classList.add(my_tool.icon);
                element.classList.remove(my_tool.toggled_icon);
            }
        } else {
            my_tool.element.dataset.on = 1;
            element.dataset.on = 1;
            
            if (my_tool.tooltip_toggled !== undefined) {
                my_tool.element.title = my_tool.tooltip_toggled;
                element.title = my_tool.tooltip_toggled;
            }
            
            if (my_tool.toggled_icon !== undefined) {
                my_tool.element.classList.add(my_tool.toggled_icon);
                my_tool.element.classList.remove(my_tool.icon);

                element.classList.add(my_tool.toggled_icon);
                element.classList.remove(my_tool.icon);
            }
            
            state = true;
        }
        
        if (my_tool.toggled_style !== "none") {
            if (element.classList.contains(_class_name.toggle_on)) {
                my_tool.element.classList.remove(_class_name.toggle_on);
                element.classList.remove(_class_name.toggle_on);
            } else {
                my_tool.element.classList.add(_class_name.toggle_on);
                element.classList.add(_class_name.toggle_on);
            }
        }
        
        toggle_group = element.dataset.toggle_group;

        if (toggle_group !== undefined) {
            tools = tb.getElementsByClassName(_class_name.item);

            for (i = 0; i < tools.length; i += 1) {
                var tool_element = tools[i],

                    tool = widget.tools[parseInt(tool_element.dataset.tool_id, 10)];

                if (toggle_group === tool_element.dataset.toggle_group &&
                    tool_element.dataset.tool_id !== element.dataset.tool_id) {

                    if (tool_element.dataset.on === "0") {
                        continue;
                    }
                    
                    tool_element.dataset.on = "0";
                    tool.element.dataset.on = "0";

                    tool_element.classList.remove(_class_name.toggle_on);
                    tool.element.classList.remove(_class_name.toggle_on);

                    if (my_tool.toggled_icon !== undefined) {
                        tool_element.classList.remove(tool.toggled_icon);
                        tool.element.classList.remove(tool.toggled_icon);
                    }

                    if (my_tool.icon !== undefined) {
                        tool_element.classList.add(tool.icon);
                        tool.element.classList.add(tool.icon);
                    }

                    if (propagate || propagate === undefined) {
                        _propagate(tool, "toggle", false);
                    }
                }
            }
        }

        if (propagate === true || propagate === undefined) {
            _propagate(my_tool, "toggle", state);
        }
    };
    
    var _ddItemClick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();

        var item_element = ev.target,

            doc = item_element.ownerDocument,

            dropdown_content = item_element.parentElement,

            widget = _widget_list[dropdown_content.dataset.linkedto_tb],

            tool_index = parseInt(dropdown_content.dataset.linkedto_tool_index, 10),

            my_tool = widget.tools[tool_index],

            item_index = parseInt(item_element.dataset.index, 10),

            item = my_tool.items[item_index],

            tb_elem = doc.getElementById(dropdown_content.dataset.linkedto_tb),

            tool_elems = tb_elem.getElementsByClassName(_class_name.item),

            tool_elem = tool_elems[tool_index];

        if (item.on_click !== undefined) {
            item.on_click();

            tool_elem.classList.remove(_class_name.toggle_on);
            my_tool.element.classList.remove(_class_name.toggle_on);

            _removeDdFloatingContent(my_tool, tool_elem);
            //dropdown_content.classList.remove(_class_name.dd_open);
        }
    };

    var _removeDdFloatingContent = function (tool, element) {
        var owner_doc = element.ownerDocument,

            floating_contents = owner_doc.body.getElementsByClassName(_class_name.dd_content),

            floating_content_element,

            i;

        for (i = 0; i < floating_contents.length; i += 1) {
            floating_content_element = floating_contents[i];

            floating_content_element.removeEventListener("click", _ddItemClick, false);
            floating_content_element.parentElement.removeChild(floating_content_element);
        }

        tool.element.classList.remove(_class_name.toggle_on);
        element.classList.remove(_class_name.toggle_on);
    };

    var _removeDdFloatingContentHandler = function (tool, element) {
        var handler = function () {
            var owner_doc = element.ownerDocument,
                owner_win = owner_doc.defaultView || owner_doc.parentWindow;

            _removeDdFloatingContent(tool, element);

            owner_win.removeEventListener('click', handler);
        };

        return handler;
    };

    var _onClick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();

        var element = ev.target;

        // delegation
        if (element.classList.contains(_class_name.minimize_group) ||
            element.classList.contains(_class_name.minimize_gr_v)) {
            _minimizeGroup(element);

            return;
        } else if (element.classList.contains(_class_name.toggle)) {
            _toggle(element);

            return;
        } else if (element.classList.contains(_class_name.tb) ||
                   element.classList.contains(_class_name.group) ||
                   element.classList.contains(_class_name.vertical_group)) {
            return;
        }

        // else, regular button

        var my_tool = null,

            dropdown_floating_content = null,

            offset = null,

            widget = null,

            owner_doc = element.ownerDocument,
            owner_win = owner_doc.defaultView || owner_doc.parentWindow;

        widget = _getWidgetFromElement(element);

        my_tool = widget.tools[element.dataset.tool_id];

        if (my_tool.type === "dropdown") {
            if (element.classList.contains(_class_name.toggle_on)) {
                _removeDdFloatingContent(my_tool, element);

                return;
            }

            dropdown_floating_content = _createDdFloatingContent(owner_doc, my_tool, widget);

            var tool_element = my_tool.element;

            element.classList.add(_class_name.toggle_on);
            tool_element.classList.add(_class_name.toggle_on);

            offset = _getElementOffset(element);

            if (my_tool.dd_items_width === "tb_item") {
                dropdown_floating_content.style.width = element.offsetWidth + "px";
            }

            if (my_tool.orientation === "s") {
                dropdown_floating_content.style.top  = (offset.top + element.offsetHeight) + "px";
                dropdown_floating_content.style.left = offset.left + "px";
            } else if (my_tool.orientation === "sw") {
                dropdown_floating_content.style.top  = (offset.top + element.offsetHeight) + "px";
                dropdown_floating_content.style.left = (offset.left - dropdown_floating_content.offsetWidth) + "px";
            } else if (my_tool.orientation === "nw") {
                dropdown_floating_content.style.top  = (offset.top - dropdown_floating_content.offsetHeight + element.offsetHeight) + "px";
                dropdown_floating_content.style.left = (offset.left - dropdown_floating_content.offsetWidth) + "px";
            } else if (my_tool.orientation === "se") {
                dropdown_floating_content.style.top  = (offset.top + element.offsetHeight) + "px";
                dropdown_floating_content.style.left = (offset.left + element.offsetWidth) + "px";
            } else if (my_tool.orientation === "ne") {
                dropdown_floating_content.style.top  = (offset.top - dropdown_floating_content.offsetHeight + element.offsetHeight) + "px";
                dropdown_floating_content.style.left = (offset.left + element.offsetWidth) + "px";
            } else { // n
                dropdown_floating_content.style.top  = (offset.top - dropdown_floating_content.offsetHeight) + "px";
                dropdown_floating_content.style.left = offset.left + "px";
            }

            dropdown_floating_content.classList.add(_class_name.dd_open);

            if(ev.stopPropagation) {
                ev.stopPropagation();
            }
        
            owner_win.addEventListener("click", _removeDdFloatingContentHandler(my_tool, element), false);
        } else {
            _propagate(my_tool, "click");
        }
    };
    
    var _minimizeGroup = function (minimize_element) {
        var group = minimize_element.nextSibling;
        
        if (minimize_element.classList.contains(_class_name.minimize_icon)) {
            minimize_element.classList.add(_class_name.maximize_icon);
            minimize_element.classList.remove(_class_name.minimize_icon);
            
            minimize_element.title = "Maximize group";
            
            group.style.display = "none";
        } else {
            minimize_element.classList.add(_class_name.minimize_icon);
            minimize_element.classList.remove(_class_name.maximize_icon);
            
            minimize_element.title = "Minimize group";
            
            group.style.display = "";
        }
    };
    
    var _createFailed = function () {
        console.log("WUI_RangeSlider 'create' failed, first argument not an id nor a DOM element.");
    };
    
    /***********************************************************
        Public section.
        
        Functions.
    ************************************************************/
    
    /**
     * Create a toolbar widget from an element.
     * 
     * @param   {String} id      DOM Element id
     * @param   {Object}   options [[Description]]
     * @param   {Array}    tools   [[Description]]
     * @returns {String} Created widget reference, internally used to recognize the widget
     */
    this.create = function (id, options, tools) {
        var toolbar,
            
            group = null,
            elem = null,
            
            index = null,
            
            previous_group = null,
            
            opts = {},
            
            key;
        
        if ((typeof id) === "string") {
            toolbar = document.getElementById(id);
        } else if ((typeof id) === "object") {
            if ((typeof id.innerHTML) !== "string") {
                _createFailed();
                
                return;
            }
            
            toolbar = id;

            id = toolbar.id;
        } else {
            _createFailed();
            
            return;
        }
        
        if (_widget_list[id] !== undefined) {
            console.log("WUI_Toolbar id '" + id + "' already created, aborting.");
            
            return;
        }
        
        for (key in _known_options) {
            if (_known_options.hasOwnProperty(key)) {
                opts[key] = _known_options[key];
            }
        }
        
        if (options !== undefined) {
            for (key in options) {
                if (options.hasOwnProperty(key)) {
                    if (_known_options[key] !== undefined) {
                        opts[key] = options[key];
                    }
                }
            }
        }
        
        // build up the toolbar widget internal data structure
        _widget_list[id] = {
            element: toolbar,

            tools: [],
            opts: opts
        };
        
        // build the toolbar and its items
        toolbar.classList.add(_class_name.tb);
        
        var group_class = _class_name.group,
            item_class = _class_name.item,
            spacer_class = "wui-toolbar-spacer",
            group_minimize_class = _class_name.minimize_group;
        
        if (opts.vertical) {
            toolbar.classList.add("wui-toolbar-vertical");
            
            group_class = _class_name.vertical_group;
            item_class += " wui-toolbar-item-vertical";
            spacer_class = "wui-toolbar-spacer-vertical";
            group_minimize_class = _class_name.minimize_gr_v;

            toolbar.style.maxWidth = (opts.item_width + 4) + "px";

            if (opts.item_hmargin === null) {
                opts.item_hmargin = 3;
            }

            if (opts.item_vmargin === null) {
                opts.item_vmargin = 8;
            }
        } else {
            toolbar.style.maxHeight = (opts.item_height + 4) + "px";

            if (opts.item_hmargin === null) {
                opts.item_hmargin = 3;
            }

            if (opts.item_vmargin === null) {
                opts.item_vmargin = 0;
            }
        }
        
        group_minimize_class = _class_name.button + " " + _class_name.minimize_icon + " " + group_minimize_class;
        
        toolbar.addEventListener("click", _onClick, false);

        var i;

        for(index in tools) { 
            if (tools.hasOwnProperty(index)) {
                if (previous_group !== null) {
                    elem = document.createElement("div");
                    elem.className = spacer_class;
                    
                    toolbar.appendChild(elem);
                }
                
                if (opts.allow_groups_minimize) {
                    elem = document.createElement("div");
                    elem.className = group_minimize_class;
                    
                    elem.title = "Minimize group";
                    
                    toolbar.appendChild(elem);
                }

                group = tools[index];
               
                var group_element = document.createElement("div");
                group_element.className = group_class;

                if (opts.vertical) {
                    group_element.style.maxWidth = opts.item_width + "px";
                } else {
                    group_element.style.maxHeight = opts.item_height + "px";
                }

                for (i = 0; i < group.length; i += 1) {
                    var tool = group[i],
                        tool_element = document.createElement("div"),
                        
                        tool_id = _widget_list[id].tools.length,

                        widget = {
                            element: tool_element,
                            on_click: tool.on_click,
                            icon: tool.icon,
                            items: [],
                            tooltip: "",
                            type: tool.type,
                            dd_items_width: tool.dropdown_items_width,
                            orientation: tool.orientation,
                            id: tool_id
                        },

                        j;

                    tool_element.className = item_class;
                    
                    tool_element.style.minWidth     = opts.item_width   + "px";
                    tool_element.style.minHeight    = opts.item_height  + "px";
                    tool_element.style.marginLeft   = opts.item_hmargin + "px";
                    tool_element.style.marginRight  = opts.item_hmargin + "px";
                    tool_element.style.marginTop    = opts.item_vmargin + "px";
                    tool_element.style.marginBottom = opts.item_vmargin + "px";

                    tool_element.style.backgroundSize = (opts.icon_width - 4) + "px " + (opts.icon_height - 4) + "px";
                    
                    group_element.appendChild(tool_element);
                    
                    _widget_list[id].tools.push(widget);
                    
                    tool_element.dataset.tool_id = tool_id;
                    
                    widget.tooltip = tool.tooltip;
                    
                    if (tool.tooltip !== undefined) {
                        tool_element.title = tool.tooltip; 
                    }
                    
                    if (tool.text !== undefined) {
                        tool_element.innerHTML = tool.text;
                        
                        tool_element.style.lineHeight = opts.item_height + "px";
                        
                        tool_element.classList.add("wui-toolbar-text");

                        if (tool.icon !== undefined) {
                            tool_element.style.paddingLeft = (opts.icon_width + 2) + "px";
                            tool_element.style.backgroundPosition = "left center";
                        }
                    }

                    if (tool.icon !== undefined) {
                        tool_element.classList.add(tool.icon);
                    }
                    
                    // handle button type
                    if (tool.type === "toggle") {
                        tool_element.classList.add(_class_name.toggle);
                        
                        widget.toggled_icon = tool.toggled_icon;
                        widget.tooltip_toggled = tool.tooltip_toggled;
                        widget.toggled_style = tool.toggled_style;
                        
                        if (tool.toggle_group !== undefined) {
                            tool_element.dataset.toggle_group = tool.toggle_group;
                        }
                        
                        if (tool.toggle_state) {
                            tool_element.dataset.on = "1";
                        }
                    } else if (tool.type === "dropdown") {
                        tool_element.classList.add(_class_name.button);

                        if (tool.items !== undefined) {
                            for (j = 0; j < tool.items.length; j += 1) {
                                var item = tool.items[j];
                                widget.items.push({ title: item.title, on_click: item.on_click });
                            }
                        }
                    } else { // default to standard button
                        tool_element.classList.add(_class_name.button);
                    }
                }
                
                toolbar.appendChild(group_element);
                
                previous_group = group;
           }
        }
        
        // now setup tools state, this could have been done before,
        // but to work with the detachable dialog widget we need them added to the toolbar before calling _toggle etc.
        var tools_elems = toolbar.getElementsByClassName(_class_name.item);

        for (i = 0; i < tools_elems.length; i += 1) {
            var tool_elem = tools_elems[i];

            if (tool_elem.dataset.on === "1") {
                tool_elem.dataset.on = "0";

                _toggle(tool_elem, id, true);
            }
        }

        return id;
    };

    this.hideGroup = function (toolbar_id, group_index) {
        var widget = _getWidget(toolbar_id),

            groups, group, minimize_group;

        if (widget) {
            if (widget.opts.vertical) {
                groups = widget.element.getElementsByClassName(_class_name.vertical_group);
            } else {
                groups = widget.element.getElementsByClassName(_class_name.group);
            }

            if (groups.length === 0) {
                return;
            }

            group = groups[group_index];

            minimize_group = group.previousElementSibling;

            if (minimize_group.classList.contains(_class_name.minimize_group) ||
                minimize_group.classList.contains(_class_name.minimize_gr_v)) {
                minimize_group.style.display = "none";
            }

            group.style.display = "none";
        }
    };

    this.showGroup = function (toolbar_id, group_index) {
        var widget = _getWidget(toolbar_id),

            groups, group, minimize_group;

        if (widget) {
            if (widget.opts.vertical) {
                groups = widget.element.getElementsByClassName(_class_name.vertical_group);
            } else {
                groups = widget.element.getElementsByClassName(_class_name.group);
            }

            if (groups.length === 0) {
                return;
            }

            group = groups[group_index];

            minimize_group = group.previousElementSibling;

            if (minimize_group.classList.contains(_class_name.minimize_group) ||
                minimize_group.classList.contains(_class_name.minimize_gr_v)) {
                minimize_group.style.display = "";
            }

            groups[group_index].style.display = "";
        }
    };

    this.toggle = function (toolbar_id, tool_index, propagate) {
        var widget = _getWidget(toolbar_id);

        if (widget) {
            _toggle(widget.tools[tool_index].element, toolbar_id, propagate);
        }
    };

    this.getItemElement = function (toolbar_id, tool_index) {
        var widget = _getWidget(toolbar_id);

        if (widget) {
            return widget.tools[tool_index].element;
        }
    };

    this.destroy = function (id) {
        var widget = _widget_list[id],

            element,

            tools, tool, tool_items, first_item, first_item_element,

            i;

        if (widget === undefined) {
            console.log("Element id '" + id + "' is not a WUI_ToolBar, destroying aborted.");

            return;
        }

        element = widget.toolbar;

        tools = widget.tools;

        element.parentElement.removeChild(element);

        // destroy any related content as well (like the floating element created by a dropdown tool)
        for (i = 0; i < tools.length; i += 1) {
            tool = tools[i];

            if (tool.type === "dropdown") {
                tool_items = tool.items;

                if (tool_items.length > 0) {
                    first_item = tool_items[0];

                    first_item_element = first_item.element;

                    first_item_element.parentElement.removeChild(first_item_element);
                }
            }
        }

        delete _widget_list[id];
    };
})();

/* jslint browser: true */
/* jshint globalstrict: false */

var WUI_CircularMenu = new (function() {
    "use strict";

    /***********************************************************
        Private section.

        Fields.
    ************************************************************/

    var _elems = [],

        _last_time = 0,

        _class_name = {
            item:       "wui-circularmenu-item",
            show:       "wui-circularmenu-show"
        },

        _known_options = {
            x: null,
            y: null,

            rx: 64,
            ry: 48,
            
            angle: 0,

            item_width:  32,
            item_height: 32,

            window: null,

            element: null
        };

    /***********************************************************
        Private section.

        Functions.
    ************************************************************/

    var _destroy = function (doc) {
        var elem,

            i;

        try { // this is in case it is in a detached WUI dialog, it will try to remove something that does not exist if the dialog was closed while the circular menu is still shown
            for (i = 0; i < _elems.length; i += 1) {
                elem = _elems[i];


                doc.body.removeChild(elem);
            }
        } catch (e) {
            _elems = [];
        }
    };

    var _onClickHandler = function (win, doc, cb) {
        var handler = function (ev) {
            ev.preventDefault();

            cb();

            _destroy(doc);
        };

        return handler;
    };

    var _onClickOutHandler = function (win, doc) {
        var handler = function (ev) {
            ev.preventDefault();

            var now = new Date().getTime();
            if (now - _last_time <= 500) {
                return;
            }

            if (ev.target.classList.contains(_class_name.item)) {
                return;
            }

            _destroy(doc);

            win.removeEventListener("click", handler);
            win.removeEventListener("mousedown", handler);
        };

        return handler;
    };
    
    var _getElementOffset = function (elem) {
        var box = elem.getBoundingClientRect(),
            body = document.body,
            docEl = document.documentElement,

            scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop,
            scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft,

            clientTop = docEl.clientTop || body.clientTop || 0,
            clientLeft = docEl.clientLeft || body.clientLeft || 0,

            top  = box.top +  scrollTop - clientTop,
            left = box.left + scrollLeft - clientLeft;

        return { top: Math.round(top), left: Math.round(left), width: box.width, height: box.height };
    };
    
    var _toRadians = function (angle) {
        return angle * (Math.PI / 180.0);
    };

    var _addItems = function (opts, items, win, doc, x, y) {
        _destroy(doc);

        var elem, item, i, handler,
            a = -(Math.PI / 2) + _toRadians(opts.angle),
            c = items.length,
            ia = (Math.PI * 2 / c);

        for (i = 0; i < c; i += 1) {
            item = items[i];

            elem = document.createElement("div");

            elem.classList.add(_class_name.item);

            elem.style.width  = opts.item_width  + "px";
            elem.style.height = opts.item_height + "px";

            elem.style.backgroundSize = (opts.item_width - 4)  + "px " + (opts.item_height - 4) + "px";

            elem.style.left = (x + opts.rx * Math.cos(a)) + "px";
            elem.style.top  = (y + opts.ry * Math.sin(a)) + "px";

            elem.classList.add(item.icon);

            if (item.tooltip) {
                elem.title = item.tooltip;
            }

            doc.body.appendChild(elem);

            // for the transition to work, force the layout engine
            win.getComputedStyle(elem).width;

            _elems.push(elem);

            if (item.on_click) {
                elem.addEventListener("click", _onClickHandler(win, doc, item.on_click));
            }

            elem.classList.add(_class_name.show);

            a += ia;
        }

        handler = _onClickOutHandler(win, doc);

        win.addEventListener("click", handler);

        _last_time = new Date().getTime();

        win.addEventListener("mousedown", handler);
    };

    /***********************************************************
        Public section.

        Functions.
    ************************************************************/

    /**
     * Create a circular menu.
     */
    this.create = function (options, items) {
        var opts = {},

            key,

            x, y,

            elem,
            elem_bcr,

            owner_doc = document,
            owner_win = window;

        for (key in _known_options) {
            if (_known_options.hasOwnProperty(key)) {
                opts[key] = _known_options[key];
            }
        }

        if (options !== undefined) {
            for (key in options) {
                if (options.hasOwnProperty(key)) {
                    if (_known_options[key] !== undefined) {
                        opts[key] = options[key];
                    }
                }
            }
        }

        elem = opts.element;

        if (elem !== null) {
            elem_bcr = _getElementOffset(elem);

            owner_doc = elem.ownerDocument;
            owner_win = owner_doc.defaultView || owner_doc.parentWindow;

            x = elem_bcr.left + (elem_bcr.width  - opts.item_width)  / 2;
            y = elem_bcr.top  + (elem_bcr.height - opts.item_height) / 2;

            _addItems(opts, items, owner_win, owner_doc, x, y);
        } else if (x !== null && y !== null) {
            if (opts.window !== null) {
                owner_win = opts.window;
                owner_doc = owner_win.document;
            }

            x = opts.x - opts.item_width  / 2;
            y = opts.y - opts.item_height / 2;

            _addItems(opts, items, owner_win, owner_doc, x, y);
        }
    };
})();

/* jslint browser: true */
/* jshint globalstrict: false */
/* global WUI_ToolBar, WUI_DropDown, WUI_RangeSlider, WUI_Tabs, WUI_Dialog */

var WUI = new (function() {
    "use strict";

    /***********************************************************
        Private section.
        
        Fields.
    ************************************************************/
    
    var _class_name = {
            display_none:  "wui-display-none",
            hide_fi_500:   "wui-hide-fi-500",
            hide_show_500: "wui-show-fi-500",
            draggable:     "wui-draggable"
        },


        // Draggable
        _draggables = [],

        _dragged_element = null,
        _dragged_element_id = null,

        _touch_identifier = null,

        _drag_x = 0,
        _drag_y = 0;
    
    /***********************************************************
        Private section.
        
        Functions.
    ************************************************************/
    
    var _hideHandler = function (element, fade_finish_cb, hide_when_fade_finish) {
        var handler = function () {
            if (hide_when_fade_finish) {
                element.classList.add(_class_name.display_none);
            }

            if (fade_finish_cb) {
                fade_finish_cb();
            }

            element.removeEventListener('transitionend', handler);
        };

        return handler;
    };

    var _dragStart = function (ev) {
        ev.preventDefault();

        var x = ev.clientX,
            y = ev.clientY,
            
            draggable,

            touches = ev.changedTouches;

        if (!ev.target.classList.contains(_class_name.draggable)) {
            return;
        }

        if (_dragged_element === null) {
            if (touches) {
                _touch_identifier = touches[0].identifier;

                x = touches[0].clientX;
                y = touches[0].clientY;
            } else if (ev.button !== 0) {
                return;
            }
        }
        
        draggable = _draggables[parseInt(ev.target.dataset.wui_draggable_id, 10)];
        
        if (draggable.target_element !== undefined) {
            _dragged_element = draggable.target_element;
        } else {
            _dragged_element = ev.target;
        }
        
        _dragged_element_id = parseInt(_dragged_element.dataset.wui_draggable_id, 10);
        
        document.body.style.cursor = "move";
        
        if (draggable.virtual) {
            draggable = _draggables[_dragged_element_id];
            
            _drag_x = x - parseInt(draggable.x, 10);
            _drag_y = y - parseInt(draggable.y,  10);
        } else {
            _drag_x = x - parseInt(_dragged_element.style.left, 10);
            _drag_y = y - parseInt(_dragged_element.style.top,  10);
        }

        window.addEventListener('mousemove', _drag, false);
        window.addEventListener('touchmove', _drag, false);

        window.addEventListener('mouseup', _dragStop, false);
        window.addEventListener('touchend', _dragStop, false);
    };

    var _drag = function (ev) {
        ev.preventDefault();

        var x = ev.clientX,
            y = ev.clientY,

            touches = ev.changedTouches,

            touch = null,

            i,

            draggable = _draggables[_dragged_element_id],

            new_x = draggable.x, new_y = draggable.y;
        
        if (touches) {
            for (i = 0; i < touches.length; i += 1) {
                touch = touches[i];

                if (touch.identifier === _touch_identifier) {
                    x = touches[i].clientX;
                    y = touches[i].clientY;

                    break;
                }
            }
        }

        if (draggable.axisLock !== 0) {
            new_x = x - _drag_x;
            
            if (!draggable.virtual) {
                _dragged_element.style.left = new_x + 'px';
            }
            
            draggable.x = new_x;
        }
        
        if (draggable.axisLock !== 1) {
            new_y = y - _drag_y;
            
            if (!draggable.virtual) {
                _dragged_element.style.top  = new_y + 'px';
            }
            
            draggable.y = new_y;
        }
        
        if (draggable) {
            if (draggable.cb !== undefined) {
                draggable.cb(_dragged_element, new_x, new_y);
            }
        }
    };

    var _dragStop = function (ev) {
        ev.preventDefault();

        var touches = ev.changedTouches,

            touch = null,

            i;

        if (_draggables.length === 0) {
            return;
        }

        if (touches) {
            for (i = 0; i < touches.length; i += 1) {
                touch = touches[i];

                if (touch.identifier === _touch_identifier) {
                    _dragged_element = null;

                    document.body.style.cursor = "default";

                    window.removeEventListener('touchmove', _drag, false);
                    window.removeEventListener('touchend', _dragStop, false);

                    break;
                }
            }
        } else {
            _dragged_element = null;

            document.body.style.cursor = "default";

            window.removeEventListener('mousemove', _drag, false);
            window.removeEventListener('mouseup', _dragStop, false);
        }
    };

    /***********************************************************
        Public section.
        
        Functions.
    ************************************************************/

    /**
     * Apply a fade out effect to the element.
     *
     * @param {Object}   element                 DOM Element
     * @param {Callback} fade_finish_cb        Function called when the fade out effect finish
     * @param {Boolean} hide_when_fade_finish  If true, add a "display: none;" style class automatically when the fade out effect finish
     */
    this.fadeOut = function (element, duration_ms, fade_finish_cb, hide_when_fade_finish) {
        var transition;

        if (duration_ms === undefined || duration_ms === null) {
            duration_ms = 500;
        }

        transition_str = "visibility 0s ease-in-out " + duration_ms + "ms, opacity " + duration_ms + "ms ease-in-out";

        if (element.style['WebkitTransition'] === undefined) {
            element.style.transition = transition_str;
        } else {
            element.style.WebkitTransition = transition_str;
        }

        element.addEventListener('transitionend', _hideHandler(element, fade_finish_cb, hide_when_fade_finish), false);

        element.classList.add(_class_name.hide_fi_500);
        element.classList.remove(_class_name.hide_show_500);
    };

    /**
     * Apply a fade in effect to the element.
     *
     * @param {Object} element DOM Element
     */
    this.fadeIn = function (element, duration_ms) {
        var transition;

        if (duration_ms === undefined || duration_ms === null) {
            duration_ms = 500;
        }

        transition_str = "visibility 0s ease-in-out 0s, opacity " + duration_ms + "ms ease-in-out";

        if (element.style['WebkitTransition'] === undefined) {
            element.style.transition = transition_str;
        } else {
            element.style.WebkitTransition = transition_str;
        }

        element.classList.remove(_class_name.hide_fi_500);
        element.classList.add(_class_name.hide_show_500);

        element.classList.remove(_class_name.display_none);
    };

    /**
     * Make an element draggable
     *
     * @param {Object} element DOM Element
     * @param {Callback} function called when the element is being dragged, it has two argument which is the new x/y
     * @param {Boolean} virtual true to keep track of element position WITHOUT updating the element position (updating it is left to users through the callback)
     * @param {Object} element DOM Element target, the drag will happen on this element, the first argument will just initiate the drag event
     */
    this.draggable = function (element, on_drag_cb, virtual, target_element) {
        if (element.classList.contains(_class_name.draggable)) {
            return;
        }

        element.classList.add(_class_name.draggable);

        element.addEventListener("mousedown",  _dragStart, false);
        element.addEventListener("touchstart", _dragStart, false);

        element.dataset.wui_draggable_id = _draggables.length;

        _draggables.push({
            cb: on_drag_cb,
            element: element,
            target_element: target_element,
            axisLock: null,
            virtual: virtual,
            x: parseInt(element.style.left, 10),
            y: parseInt(element.style.top, 10)
        });
    };
    
    /**
     * Make an element undraggable
     *
     * @param {Object} element DOM Element
     */
    this.undraggable = function (element) {
        if (!element.classList.contains(_class_name.draggable)) {
            return;
        }

        element.classList.remove(_class_name.draggable);

        element.removeEventListener("mousedown",  _dragStart, false);
        element.removeEventListener("touchstart", _dragStart, false);

        var id = parseInt(element.dataset.wui_draggable_id, 10),

            i;

        _draggables.splice(id, 1);

        for (i = 0; i < _draggables.length; i += 1) {
            var draggable = _draggables[i];

            draggable.element.dataset.wui_draggable_id = i;
        }
    };
    
    this.lockDraggable = function (element, axis) {
        if (!element.classList.contains(_class_name.draggable)) {
            return;
        }
        
        var draggable = _draggables[parseInt(element.dataset.wui_draggable_id, 10)];
        
        if (axis === 'x') {
            draggable.axisLock = 0;
        } else if (axis === 'y') {
            draggable.axisLock = 1;
        } else {
            draggable.axisLock = null;
        }
    };
})();

// CodeMirror - https://codemirror.net/
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// This is CodeMirror (http://codemirror.net), a code editor
// implemented in JavaScript on top of the browser's DOM.
//
// You can find some technical background for some of the code below
// at http://marijnhaverbeke.nl/blog/#cm-internals .

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.CodeMirror = factory());
}(this, (function () { 'use strict';

// Kludges for bugs and behavior differences that can't be feature
// detected are enabled based on userAgent etc sniffing.
var userAgent = navigator.userAgent
var platform = navigator.platform

var gecko = /gecko\/\d/i.test(userAgent)
var ie_upto10 = /MSIE \d/.test(userAgent)
var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(userAgent)
var ie = ie_upto10 || ie_11up
var ie_version = ie && (ie_upto10 ? document.documentMode || 6 : ie_11up[1])
var webkit = /WebKit\//.test(userAgent)
var qtwebkit = webkit && /Qt\/\d+\.\d+/.test(userAgent)
var chrome = /Chrome\//.test(userAgent)
var presto = /Opera\//.test(userAgent)
var safari = /Apple Computer/.test(navigator.vendor)
var mac_geMountainLion = /Mac OS X 1\d\D([8-9]|\d\d)\D/.test(userAgent)
var phantom = /PhantomJS/.test(userAgent)

var ios = /AppleWebKit/.test(userAgent) && /Mobile\/\w+/.test(userAgent)
// This is woefully incomplete. Suggestions for alternative methods welcome.
var mobile = ios || /Android|webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(userAgent)
var mac = ios || /Mac/.test(platform)
var chromeOS = /\bCrOS\b/.test(userAgent)
var windows = /win/i.test(platform)

var presto_version = presto && userAgent.match(/Version\/(\d*\.\d*)/)
if (presto_version) { presto_version = Number(presto_version[1]) }
if (presto_version && presto_version >= 15) { presto = false; webkit = true }
// Some browsers use the wrong event properties to signal cmd/ctrl on OS X
var flipCtrlCmd = mac && (qtwebkit || presto && (presto_version == null || presto_version < 12.11))
var captureRightClick = gecko || (ie && ie_version >= 9)

function classTest(cls) { return new RegExp("(^|\\s)" + cls + "(?:$|\\s)\\s*") }

var rmClass = function(node, cls) {
  var current = node.className
  var match = classTest(cls).exec(current)
  if (match) {
    var after = current.slice(match.index + match[0].length)
    node.className = current.slice(0, match.index) + (after ? match[1] + after : "")
  }
}

function removeChildren(e) {
  for (var count = e.childNodes.length; count > 0; --count)
    { e.removeChild(e.firstChild) }
  return e
}

function removeChildrenAndAdd(parent, e) {
  return removeChildren(parent).appendChild(e)
}

function elt(tag, content, className, style) {
  var e = document.createElement(tag)
  if (className) { e.className = className }
  if (style) { e.style.cssText = style }
  if (typeof content == "string") { e.appendChild(document.createTextNode(content)) }
  else if (content) { for (var i = 0; i < content.length; ++i) { e.appendChild(content[i]) } }
  return e
}

var range
if (document.createRange) { range = function(node, start, end, endNode) {
  var r = document.createRange()
  r.setEnd(endNode || node, end)
  r.setStart(node, start)
  return r
} }
else { range = function(node, start, end) {
  var r = document.body.createTextRange()
  try { r.moveToElementText(node.parentNode) }
  catch(e) { return r }
  r.collapse(true)
  r.moveEnd("character", end)
  r.moveStart("character", start)
  return r
} }

function contains(parent, child) {
  if (child.nodeType == 3) // Android browser always returns false when child is a textnode
    { child = child.parentNode }
  if (parent.contains)
    { return parent.contains(child) }
  do {
    if (child.nodeType == 11) { child = child.host }
    if (child == parent) { return true }
  } while (child = child.parentNode)
}

function activeElt() {
  // IE and Edge may throw an "Unspecified Error" when accessing document.activeElement.
  // IE < 10 will throw when accessed while the page is loading or in an iframe.
  // IE > 9 and Edge will throw when accessed in an iframe if document.body is unavailable.
  var activeElement
  try {
    activeElement = document.activeElement
  } catch(e) {
    activeElement = document.body || null
  }
  while (activeElement && activeElement.root && activeElement.root.activeElement)
    { activeElement = activeElement.root.activeElement }
  return activeElement
}

function addClass(node, cls) {
  var current = node.className
  if (!classTest(cls).test(current)) { node.className += (current ? " " : "") + cls }
}
function joinClasses(a, b) {
  var as = a.split(" ")
  for (var i = 0; i < as.length; i++)
    { if (as[i] && !classTest(as[i]).test(b)) { b += " " + as[i] } }
  return b
}

var selectInput = function(node) { node.select() }
if (ios) // Mobile Safari apparently has a bug where select() is broken.
  { selectInput = function(node) { node.selectionStart = 0; node.selectionEnd = node.value.length } }
else if (ie) // Suppress mysterious IE10 errors
  { selectInput = function(node) { try { node.select() } catch(_e) {} } }

function bind(f) {
  var args = Array.prototype.slice.call(arguments, 1)
  return function(){return f.apply(null, args)}
}

function copyObj(obj, target, overwrite) {
  if (!target) { target = {} }
  for (var prop in obj)
    { if (obj.hasOwnProperty(prop) && (overwrite !== false || !target.hasOwnProperty(prop)))
      { target[prop] = obj[prop] } }
  return target
}

// Counts the column offset in a string, taking tabs into account.
// Used mostly to find indentation.
function countColumn(string, end, tabSize, startIndex, startValue) {
  if (end == null) {
    end = string.search(/[^\s\u00a0]/)
    if (end == -1) { end = string.length }
  }
  for (var i = startIndex || 0, n = startValue || 0;;) {
    var nextTab = string.indexOf("\t", i)
    if (nextTab < 0 || nextTab >= end)
      { return n + (end - i) }
    n += nextTab - i
    n += tabSize - (n % tabSize)
    i = nextTab + 1
  }
}

function Delayed() {this.id = null}
Delayed.prototype.set = function(ms, f) {
  clearTimeout(this.id)
  this.id = setTimeout(f, ms)
}

function indexOf(array, elt) {
  for (var i = 0; i < array.length; ++i)
    { if (array[i] == elt) { return i } }
  return -1
}

// Number of pixels added to scroller and sizer to hide scrollbar
var scrollerGap = 30

// Returned or thrown by various protocols to signal 'I'm not
// handling this'.
var Pass = {toString: function(){return "CodeMirror.Pass"}}

// Reused option objects for setSelection & friends
var sel_dontScroll = {scroll: false};
var sel_mouse = {origin: "*mouse"};
var sel_move = {origin: "+move"};
// The inverse of countColumn -- find the offset that corresponds to
// a particular column.
function findColumn(string, goal, tabSize) {
  for (var pos = 0, col = 0;;) {
    var nextTab = string.indexOf("\t", pos)
    if (nextTab == -1) { nextTab = string.length }
    var skipped = nextTab - pos
    if (nextTab == string.length || col + skipped >= goal)
      { return pos + Math.min(skipped, goal - col) }
    col += nextTab - pos
    col += tabSize - (col % tabSize)
    pos = nextTab + 1
    if (col >= goal) { return pos }
  }
}

var spaceStrs = [""]
function spaceStr(n) {
  while (spaceStrs.length <= n)
    { spaceStrs.push(lst(spaceStrs) + " ") }
  return spaceStrs[n]
}

function lst(arr) { return arr[arr.length-1] }

function map(array, f) {
  var out = []
  for (var i = 0; i < array.length; i++) { out[i] = f(array[i], i) }
  return out
}

function insertSorted(array, value, score) {
  var pos = 0, priority = score(value)
  while (pos < array.length && score(array[pos]) <= priority) { pos++ }
  array.splice(pos, 0, value)
}

function nothing() {}

function createObj(base, props) {
  var inst
  if (Object.create) {
    inst = Object.create(base)
  } else {
    nothing.prototype = base
    inst = new nothing()
  }
  if (props) { copyObj(props, inst) }
  return inst
}

var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/
function isWordCharBasic(ch) {
  return /\w/.test(ch) || ch > "\x80" &&
    (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch))
}
function isWordChar(ch, helper) {
  if (!helper) { return isWordCharBasic(ch) }
  if (helper.source.indexOf("\\w") > -1 && isWordCharBasic(ch)) { return true }
  return helper.test(ch)
}

function isEmpty(obj) {
  for (var n in obj) { if (obj.hasOwnProperty(n) && obj[n]) { return false } }
  return true
}

// Extending unicode characters. A series of a non-extending char +
// any number of extending chars is treated as a single unit as far
// as editing and measuring is concerned. This is not fully correct,
// since some scripts/fonts/browsers also treat other configurations
// of code points as a group.
var extendingChars = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0900-\u0902\u093c\u0941-\u0948\u094d\u0951-\u0955\u0962\u0963\u0981\u09bc\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01\u0a02\u0a3c\u0a41\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81\u0a82\u0abc\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3\u0b01\u0b3c\u0b3e\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0cbc\u0cbf\u0cc2\u0cc6\u0ccc\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dcf\u0dd2-\u0dd4\u0dd6\u0ddf\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86\u0f87\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085\u1086\u108d\u109d\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193b\u1a17\u1a18\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8\u1ba9\u1c2c-\u1c33\u1c36\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1dc0-\u1de6\u1dfd-\u1dff\u200c\u200d\u20d0-\u20f0\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua67c\ua67d\ua6f0\ua6f1\ua802\ua806\ua80b\ua825\ua826\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua951\ua980-\ua982\ua9b3\ua9b6-\ua9b9\ua9bc\uaa29-\uaa2e\uaa31\uaa32\uaa35\uaa36\uaa43\uaa4c\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uabe5\uabe8\uabed\udc00-\udfff\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\uff9e\uff9f]/
function isExtendingChar(ch) { return ch.charCodeAt(0) >= 768 && extendingChars.test(ch) }

// The display handles the DOM integration, both for input reading
// and content drawing. It holds references to DOM nodes and
// display-related state.

function Display(place, doc, input) {
  var d = this
  this.input = input

  // Covers bottom-right square when both scrollbars are present.
  d.scrollbarFiller = elt("div", null, "CodeMirror-scrollbar-filler")
  d.scrollbarFiller.setAttribute("cm-not-content", "true")
  // Covers bottom of gutter when coverGutterNextToScrollbar is on
  // and h scrollbar is present.
  d.gutterFiller = elt("div", null, "CodeMirror-gutter-filler")
  d.gutterFiller.setAttribute("cm-not-content", "true")
  // Will contain the actual code, positioned to cover the viewport.
  d.lineDiv = elt("div", null, "CodeMirror-code")
  // Elements are added to these to represent selection and cursors.
  d.selectionDiv = elt("div", null, null, "position: relative; z-index: 1")
  d.cursorDiv = elt("div", null, "CodeMirror-cursors")
  // A visibility: hidden element used to find the size of things.
  d.measure = elt("div", null, "CodeMirror-measure")
  // When lines outside of the viewport are measured, they are drawn in this.
  d.lineMeasure = elt("div", null, "CodeMirror-measure")
  // Wraps everything that needs to exist inside the vertically-padded coordinate system
  d.lineSpace = elt("div", [d.measure, d.lineMeasure, d.selectionDiv, d.cursorDiv, d.lineDiv],
                    null, "position: relative; outline: none")
  // Moved around its parent to cover visible view.
  d.mover = elt("div", [elt("div", [d.lineSpace], "CodeMirror-lines")], null, "position: relative")
  // Set to the height of the document, allowing scrolling.
  d.sizer = elt("div", [d.mover], "CodeMirror-sizer")
  d.sizerWidth = null
  // Behavior of elts with overflow: auto and padding is
  // inconsistent across browsers. This is used to ensure the
  // scrollable area is big enough.
  d.heightForcer = elt("div", null, null, "position: absolute; height: " + scrollerGap + "px; width: 1px;")
  // Will contain the gutters, if any.
  d.gutters = elt("div", null, "CodeMirror-gutters")
  d.lineGutter = null
  // Actual scrollable element.
  d.scroller = elt("div", [d.sizer, d.heightForcer, d.gutters], "CodeMirror-scroll")
  d.scroller.setAttribute("tabIndex", "-1")
  // The element in which the editor lives.
  d.wrapper = elt("div", [d.scrollbarFiller, d.gutterFiller, d.scroller], "CodeMirror")

  // Work around IE7 z-index bug (not perfect, hence IE7 not really being supported)
  if (ie && ie_version < 8) { d.gutters.style.zIndex = -1; d.scroller.style.paddingRight = 0 }
  if (!webkit && !(gecko && mobile)) { d.scroller.draggable = true }

  if (place) {
    if (place.appendChild) { place.appendChild(d.wrapper) }
    else { place(d.wrapper) }
  }

  // Current rendered range (may be bigger than the view window).
  d.viewFrom = d.viewTo = doc.first
  d.reportedViewFrom = d.reportedViewTo = doc.first
  // Information about the rendered lines.
  d.view = []
  d.renderedView = null
  // Holds info about a single rendered line when it was rendered
  // for measurement, while not in view.
  d.externalMeasured = null
  // Empty space (in pixels) above the view
  d.viewOffset = 0
  d.lastWrapHeight = d.lastWrapWidth = 0
  d.updateLineNumbers = null

  d.nativeBarWidth = d.barHeight = d.barWidth = 0
  d.scrollbarsClipped = false

  // Used to only resize the line number gutter when necessary (when
  // the amount of lines crosses a boundary that makes its width change)
  d.lineNumWidth = d.lineNumInnerWidth = d.lineNumChars = null
  // Set to true when a non-horizontal-scrolling line widget is
  // added. As an optimization, line widget aligning is skipped when
  // this is false.
  d.alignWidgets = false

  d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null

  // Tracks the maximum line length so that the horizontal scrollbar
  // can be kept static when scrolling.
  d.maxLine = null
  d.maxLineLength = 0
  d.maxLineChanged = false

  // Used for measuring wheel scrolling granularity
  d.wheelDX = d.wheelDY = d.wheelStartX = d.wheelStartY = null

  // True when shift is held down.
  d.shift = false

  // Used to track whether anything happened since the context menu
  // was opened.
  d.selForContextMenu = null

  d.activeTouch = null

  input.init(d)
}

// Find the line object corresponding to the given line number.
function getLine(doc, n) {
  n -= doc.first
  if (n < 0 || n >= doc.size) { throw new Error("There is no line " + (n + doc.first) + " in the document.") }
  var chunk = doc
  while (!chunk.lines) {
    for (var i = 0;; ++i) {
      var child = chunk.children[i], sz = child.chunkSize()
      if (n < sz) { chunk = child; break }
      n -= sz
    }
  }
  return chunk.lines[n]
}

// Get the part of a document between two positions, as an array of
// strings.
function getBetween(doc, start, end) {
  var out = [], n = start.line
  doc.iter(start.line, end.line + 1, function (line) {
    var text = line.text
    if (n == end.line) { text = text.slice(0, end.ch) }
    if (n == start.line) { text = text.slice(start.ch) }
    out.push(text)
    ++n
  })
  return out
}
// Get the lines between from and to, as array of strings.
function getLines(doc, from, to) {
  var out = []
  doc.iter(from, to, function (line) { out.push(line.text) }) // iter aborts when callback returns truthy value
  return out
}

// Update the height of a line, propagating the height change
// upwards to parent nodes.
function updateLineHeight(line, height) {
  var diff = height - line.height
  if (diff) { for (var n = line; n; n = n.parent) { n.height += diff } }
}

// Given a line object, find its line number by walking up through
// its parent links.
function lineNo(line) {
  if (line.parent == null) { return null }
  var cur = line.parent, no = indexOf(cur.lines, line)
  for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
    for (var i = 0;; ++i) {
      if (chunk.children[i] == cur) { break }
      no += chunk.children[i].chunkSize()
    }
  }
  return no + cur.first
}

// Find the line at the given vertical position, using the height
// information in the document tree.
function lineAtHeight(chunk, h) {
  var n = chunk.first
  outer: do {
    for (var i$1 = 0; i$1 < chunk.children.length; ++i$1) {
      var child = chunk.children[i$1], ch = child.height
      if (h < ch) { chunk = child; continue outer }
      h -= ch
      n += child.chunkSize()
    }
    return n
  } while (!chunk.lines)
  var i = 0
  for (; i < chunk.lines.length; ++i) {
    var line = chunk.lines[i], lh = line.height
    if (h < lh) { break }
    h -= lh
  }
  return n + i
}

function isLine(doc, l) {return l >= doc.first && l < doc.first + doc.size}

function lineNumberFor(options, i) {
  return String(options.lineNumberFormatter(i + options.firstLineNumber))
}

// A Pos instance represents a position within the text.
function Pos (line, ch) {
  if (!(this instanceof Pos)) { return new Pos(line, ch) }
  this.line = line; this.ch = ch
}

// Compare two positions, return 0 if they are the same, a negative
// number when a is less, and a positive number otherwise.
function cmp(a, b) { return a.line - b.line || a.ch - b.ch }

function copyPos(x) {return Pos(x.line, x.ch)}
function maxPos(a, b) { return cmp(a, b) < 0 ? b : a }
function minPos(a, b) { return cmp(a, b) < 0 ? a : b }

// Most of the external API clips given positions to make sure they
// actually exist within the document.
function clipLine(doc, n) {return Math.max(doc.first, Math.min(n, doc.first + doc.size - 1))}
function clipPos(doc, pos) {
  if (pos.line < doc.first) { return Pos(doc.first, 0) }
  var last = doc.first + doc.size - 1
  if (pos.line > last) { return Pos(last, getLine(doc, last).text.length) }
  return clipToLen(pos, getLine(doc, pos.line).text.length)
}
function clipToLen(pos, linelen) {
  var ch = pos.ch
  if (ch == null || ch > linelen) { return Pos(pos.line, linelen) }
  else if (ch < 0) { return Pos(pos.line, 0) }
  else { return pos }
}
function clipPosArray(doc, array) {
  var out = []
  for (var i = 0; i < array.length; i++) { out[i] = clipPos(doc, array[i]) }
  return out
}

// Optimize some code when these features are not used.
var sawReadOnlySpans = false;
var sawCollapsedSpans = false;
function seeReadOnlySpans() {
  sawReadOnlySpans = true
}

function seeCollapsedSpans() {
  sawCollapsedSpans = true
}

// TEXTMARKER SPANS

function MarkedSpan(marker, from, to) {
  this.marker = marker
  this.from = from; this.to = to
}

// Search an array of spans for a span matching the given marker.
function getMarkedSpanFor(spans, marker) {
  if (spans) { for (var i = 0; i < spans.length; ++i) {
    var span = spans[i]
    if (span.marker == marker) { return span }
  } }
}
// Remove a span from an array, returning undefined if no spans are
// left (we don't store arrays for lines without spans).
function removeMarkedSpan(spans, span) {
  var r
  for (var i = 0; i < spans.length; ++i)
    { if (spans[i] != span) { (r || (r = [])).push(spans[i]) } }
  return r
}
// Add a span to a line.
function addMarkedSpan(line, span) {
  line.markedSpans = line.markedSpans ? line.markedSpans.concat([span]) : [span]
  span.marker.attachLine(line)
}

// Used for the algorithm that adjusts markers for a change in the
// document. These functions cut an array of spans at a given
// character position, returning an array of remaining chunks (or
// undefined if nothing remains).
function markedSpansBefore(old, startCh, isInsert) {
  var nw
  if (old) { for (var i = 0; i < old.length; ++i) {
    var span = old[i], marker = span.marker
    var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= startCh : span.from < startCh)
    if (startsBefore || span.from == startCh && marker.type == "bookmark" && (!isInsert || !span.marker.insertLeft)) {
      var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= startCh : span.to > startCh)
      ;(nw || (nw = [])).push(new MarkedSpan(marker, span.from, endsAfter ? null : span.to))
    }
  } }
  return nw
}
function markedSpansAfter(old, endCh, isInsert) {
  var nw
  if (old) { for (var i = 0; i < old.length; ++i) {
    var span = old[i], marker = span.marker
    var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= endCh : span.to > endCh)
    if (endsAfter || span.from == endCh && marker.type == "bookmark" && (!isInsert || span.marker.insertLeft)) {
      var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= endCh : span.from < endCh)
      ;(nw || (nw = [])).push(new MarkedSpan(marker, startsBefore ? null : span.from - endCh,
                                            span.to == null ? null : span.to - endCh))
    }
  } }
  return nw
}

// Given a change object, compute the new set of marker spans that
// cover the line in which the change took place. Removes spans
// entirely within the change, reconnects spans belonging to the
// same marker that appear on both sides of the change, and cuts off
// spans partially within the change. Returns an array of span
// arrays with one element for each line in (after) the change.
function stretchSpansOverChange(doc, change) {
  if (change.full) { return null }
  var oldFirst = isLine(doc, change.from.line) && getLine(doc, change.from.line).markedSpans
  var oldLast = isLine(doc, change.to.line) && getLine(doc, change.to.line).markedSpans
  if (!oldFirst && !oldLast) { return null }

  var startCh = change.from.ch, endCh = change.to.ch, isInsert = cmp(change.from, change.to) == 0
  // Get the spans that 'stick out' on both sides
  var first = markedSpansBefore(oldFirst, startCh, isInsert)
  var last = markedSpansAfter(oldLast, endCh, isInsert)

  // Next, merge those two ends
  var sameLine = change.text.length == 1, offset = lst(change.text).length + (sameLine ? startCh : 0)
  if (first) {
    // Fix up .to properties of first
    for (var i = 0; i < first.length; ++i) {
      var span = first[i]
      if (span.to == null) {
        var found = getMarkedSpanFor(last, span.marker)
        if (!found) { span.to = startCh }
        else if (sameLine) { span.to = found.to == null ? null : found.to + offset }
      }
    }
  }
  if (last) {
    // Fix up .from in last (or move them into first in case of sameLine)
    for (var i$1 = 0; i$1 < last.length; ++i$1) {
      var span$1 = last[i$1]
      if (span$1.to != null) { span$1.to += offset }
      if (span$1.from == null) {
        var found$1 = getMarkedSpanFor(first, span$1.marker)
        if (!found$1) {
          span$1.from = offset
          if (sameLine) { (first || (first = [])).push(span$1) }
        }
      } else {
        span$1.from += offset
        if (sameLine) { (first || (first = [])).push(span$1) }
      }
    }
  }
  // Make sure we didn't create any zero-length spans
  if (first) { first = clearEmptySpans(first) }
  if (last && last != first) { last = clearEmptySpans(last) }

  var newMarkers = [first]
  if (!sameLine) {
    // Fill gap with whole-line-spans
    var gap = change.text.length - 2, gapMarkers
    if (gap > 0 && first)
      { for (var i$2 = 0; i$2 < first.length; ++i$2)
        { if (first[i$2].to == null)
          { (gapMarkers || (gapMarkers = [])).push(new MarkedSpan(first[i$2].marker, null, null)) } } }
    for (var i$3 = 0; i$3 < gap; ++i$3)
      { newMarkers.push(gapMarkers) }
    newMarkers.push(last)
  }
  return newMarkers
}

// Remove spans that are empty and don't have a clearWhenEmpty
// option of false.
function clearEmptySpans(spans) {
  for (var i = 0; i < spans.length; ++i) {
    var span = spans[i]
    if (span.from != null && span.from == span.to && span.marker.clearWhenEmpty !== false)
      { spans.splice(i--, 1) }
  }
  if (!spans.length) { return null }
  return spans
}

// Used to 'clip' out readOnly ranges when making a change.
function removeReadOnlyRanges(doc, from, to) {
  var markers = null
  doc.iter(from.line, to.line + 1, function (line) {
    if (line.markedSpans) { for (var i = 0; i < line.markedSpans.length; ++i) {
      var mark = line.markedSpans[i].marker
      if (mark.readOnly && (!markers || indexOf(markers, mark) == -1))
        { (markers || (markers = [])).push(mark) }
    } }
  })
  if (!markers) { return null }
  var parts = [{from: from, to: to}]
  for (var i = 0; i < markers.length; ++i) {
    var mk = markers[i], m = mk.find(0)
    for (var j = 0; j < parts.length; ++j) {
      var p = parts[j]
      if (cmp(p.to, m.from) < 0 || cmp(p.from, m.to) > 0) { continue }
      var newParts = [j, 1], dfrom = cmp(p.from, m.from), dto = cmp(p.to, m.to)
      if (dfrom < 0 || !mk.inclusiveLeft && !dfrom)
        { newParts.push({from: p.from, to: m.from}) }
      if (dto > 0 || !mk.inclusiveRight && !dto)
        { newParts.push({from: m.to, to: p.to}) }
      parts.splice.apply(parts, newParts)
      j += newParts.length - 1
    }
  }
  return parts
}

// Connect or disconnect spans from a line.
function detachMarkedSpans(line) {
  var spans = line.markedSpans
  if (!spans) { return }
  for (var i = 0; i < spans.length; ++i)
    { spans[i].marker.detachLine(line) }
  line.markedSpans = null
}
function attachMarkedSpans(line, spans) {
  if (!spans) { return }
  for (var i = 0; i < spans.length; ++i)
    { spans[i].marker.attachLine(line) }
  line.markedSpans = spans
}

// Helpers used when computing which overlapping collapsed span
// counts as the larger one.
function extraLeft(marker) { return marker.inclusiveLeft ? -1 : 0 }
function extraRight(marker) { return marker.inclusiveRight ? 1 : 0 }

// Returns a number indicating which of two overlapping collapsed
// spans is larger (and thus includes the other). Falls back to
// comparing ids when the spans cover exactly the same range.
function compareCollapsedMarkers(a, b) {
  var lenDiff = a.lines.length - b.lines.length
  if (lenDiff != 0) { return lenDiff }
  var aPos = a.find(), bPos = b.find()
  var fromCmp = cmp(aPos.from, bPos.from) || extraLeft(a) - extraLeft(b)
  if (fromCmp) { return -fromCmp }
  var toCmp = cmp(aPos.to, bPos.to) || extraRight(a) - extraRight(b)
  if (toCmp) { return toCmp }
  return b.id - a.id
}

// Find out whether a line ends or starts in a collapsed span. If
// so, return the marker for that span.
function collapsedSpanAtSide(line, start) {
  var sps = sawCollapsedSpans && line.markedSpans, found
  if (sps) { for (var sp = (void 0), i = 0; i < sps.length; ++i) {
    sp = sps[i]
    if (sp.marker.collapsed && (start ? sp.from : sp.to) == null &&
        (!found || compareCollapsedMarkers(found, sp.marker) < 0))
      { found = sp.marker }
  } }
  return found
}
function collapsedSpanAtStart(line) { return collapsedSpanAtSide(line, true) }
function collapsedSpanAtEnd(line) { return collapsedSpanAtSide(line, false) }

// Test whether there exists a collapsed span that partially
// overlaps (covers the start or end, but not both) of a new span.
// Such overlap is not allowed.
function conflictingCollapsedRange(doc, lineNo, from, to, marker) {
  var line = getLine(doc, lineNo)
  var sps = sawCollapsedSpans && line.markedSpans
  if (sps) { for (var i = 0; i < sps.length; ++i) {
    var sp = sps[i]
    if (!sp.marker.collapsed) { continue }
    var found = sp.marker.find(0)
    var fromCmp = cmp(found.from, from) || extraLeft(sp.marker) - extraLeft(marker)
    var toCmp = cmp(found.to, to) || extraRight(sp.marker) - extraRight(marker)
    if (fromCmp >= 0 && toCmp <= 0 || fromCmp <= 0 && toCmp >= 0) { continue }
    if (fromCmp <= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.to, from) >= 0 : cmp(found.to, from) > 0) ||
        fromCmp >= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.from, to) <= 0 : cmp(found.from, to) < 0))
      { return true }
  } }
}

// A visual line is a line as drawn on the screen. Folding, for
// example, can cause multiple logical lines to appear on the same
// visual line. This finds the start of the visual line that the
// given line is part of (usually that is the line itself).
function visualLine(line) {
  var merged
  while (merged = collapsedSpanAtStart(line))
    { line = merged.find(-1, true).line }
  return line
}

// Returns an array of logical lines that continue the visual line
// started by the argument, or undefined if there are no such lines.
function visualLineContinued(line) {
  var merged, lines
  while (merged = collapsedSpanAtEnd(line)) {
    line = merged.find(1, true).line
    ;(lines || (lines = [])).push(line)
  }
  return lines
}

// Get the line number of the start of the visual line that the
// given line number is part of.
function visualLineNo(doc, lineN) {
  var line = getLine(doc, lineN), vis = visualLine(line)
  if (line == vis) { return lineN }
  return lineNo(vis)
}

// Get the line number of the start of the next visual line after
// the given line.
function visualLineEndNo(doc, lineN) {
  if (lineN > doc.lastLine()) { return lineN }
  var line = getLine(doc, lineN), merged
  if (!lineIsHidden(doc, line)) { return lineN }
  while (merged = collapsedSpanAtEnd(line))
    { line = merged.find(1, true).line }
  return lineNo(line) + 1
}

// Compute whether a line is hidden. Lines count as hidden when they
// are part of a visual line that starts with another line, or when
// they are entirely covered by collapsed, non-widget span.
function lineIsHidden(doc, line) {
  var sps = sawCollapsedSpans && line.markedSpans
  if (sps) { for (var sp = (void 0), i = 0; i < sps.length; ++i) {
    sp = sps[i]
    if (!sp.marker.collapsed) { continue }
    if (sp.from == null) { return true }
    if (sp.marker.widgetNode) { continue }
    if (sp.from == 0 && sp.marker.inclusiveLeft && lineIsHiddenInner(doc, line, sp))
      { return true }
  } }
}
function lineIsHiddenInner(doc, line, span) {
  if (span.to == null) {
    var end = span.marker.find(1, true)
    return lineIsHiddenInner(doc, end.line, getMarkedSpanFor(end.line.markedSpans, span.marker))
  }
  if (span.marker.inclusiveRight && span.to == line.text.length)
    { return true }
  for (var sp = (void 0), i = 0; i < line.markedSpans.length; ++i) {
    sp = line.markedSpans[i]
    if (sp.marker.collapsed && !sp.marker.widgetNode && sp.from == span.to &&
        (sp.to == null || sp.to != span.from) &&
        (sp.marker.inclusiveLeft || span.marker.inclusiveRight) &&
        lineIsHiddenInner(doc, line, sp)) { return true }
  }
}

// Find the height above the given line.
function heightAtLine(lineObj) {
  lineObj = visualLine(lineObj)

  var h = 0, chunk = lineObj.parent
  for (var i = 0; i < chunk.lines.length; ++i) {
    var line = chunk.lines[i]
    if (line == lineObj) { break }
    else { h += line.height }
  }
  for (var p = chunk.parent; p; chunk = p, p = chunk.parent) {
    for (var i$1 = 0; i$1 < p.children.length; ++i$1) {
      var cur = p.children[i$1]
      if (cur == chunk) { break }
      else { h += cur.height }
    }
  }
  return h
}

// Compute the character length of a line, taking into account
// collapsed ranges (see markText) that might hide parts, and join
// other lines onto it.
function lineLength(line) {
  if (line.height == 0) { return 0 }
  var len = line.text.length, merged, cur = line
  while (merged = collapsedSpanAtStart(cur)) {
    var found = merged.find(0, true)
    cur = found.from.line
    len += found.from.ch - found.to.ch
  }
  cur = line
  while (merged = collapsedSpanAtEnd(cur)) {
    var found$1 = merged.find(0, true)
    len -= cur.text.length - found$1.from.ch
    cur = found$1.to.line
    len += cur.text.length - found$1.to.ch
  }
  return len
}

// Find the longest line in the document.
function findMaxLine(cm) {
  var d = cm.display, doc = cm.doc
  d.maxLine = getLine(doc, doc.first)
  d.maxLineLength = lineLength(d.maxLine)
  d.maxLineChanged = true
  doc.iter(function (line) {
    var len = lineLength(line)
    if (len > d.maxLineLength) {
      d.maxLineLength = len
      d.maxLine = line
    }
  })
}

// BIDI HELPERS

function iterateBidiSections(order, from, to, f) {
  if (!order) { return f(from, to, "ltr") }
  var found = false
  for (var i = 0; i < order.length; ++i) {
    var part = order[i]
    if (part.from < to && part.to > from || from == to && part.to == from) {
      f(Math.max(part.from, from), Math.min(part.to, to), part.level == 1 ? "rtl" : "ltr")
      found = true
    }
  }
  if (!found) { f(from, to, "ltr") }
}

function bidiLeft(part) { return part.level % 2 ? part.to : part.from }
function bidiRight(part) { return part.level % 2 ? part.from : part.to }

function lineLeft(line) { var order = getOrder(line); return order ? bidiLeft(order[0]) : 0 }
function lineRight(line) {
  var order = getOrder(line)
  if (!order) { return line.text.length }
  return bidiRight(lst(order))
}

function compareBidiLevel(order, a, b) {
  var linedir = order[0].level
  if (a == linedir) { return true }
  if (b == linedir) { return false }
  return a < b
}

var bidiOther = null
function getBidiPartAt(order, pos) {
  var found
  bidiOther = null
  for (var i = 0; i < order.length; ++i) {
    var cur = order[i]
    if (cur.from < pos && cur.to > pos) { return i }
    if ((cur.from == pos || cur.to == pos)) {
      if (found == null) {
        found = i
      } else if (compareBidiLevel(order, cur.level, order[found].level)) {
        if (cur.from != cur.to) { bidiOther = found }
        return i
      } else {
        if (cur.from != cur.to) { bidiOther = i }
        return found
      }
    }
  }
  return found
}

function moveInLine(line, pos, dir, byUnit) {
  if (!byUnit) { return pos + dir }
  do { pos += dir }
  while (pos > 0 && isExtendingChar(line.text.charAt(pos)))
  return pos
}

// This is needed in order to move 'visually' through bi-directional
// text -- i.e., pressing left should make the cursor go left, even
// when in RTL text. The tricky part is the 'jumps', where RTL and
// LTR text touch each other. This often requires the cursor offset
// to move more than one unit, in order to visually move one unit.
function moveVisually(line, start, dir, byUnit) {
  var bidi = getOrder(line)
  if (!bidi) { return moveLogically(line, start, dir, byUnit) }
  var pos = getBidiPartAt(bidi, start), part = bidi[pos]
  var target = moveInLine(line, start, part.level % 2 ? -dir : dir, byUnit)

  for (;;) {
    if (target > part.from && target < part.to) { return target }
    if (target == part.from || target == part.to) {
      if (getBidiPartAt(bidi, target) == pos) { return target }
      part = bidi[pos += dir]
      return (dir > 0) == part.level % 2 ? part.to : part.from
    } else {
      part = bidi[pos += dir]
      if (!part) { return null }
      if ((dir > 0) == part.level % 2)
        { target = moveInLine(line, part.to, -1, byUnit) }
      else
        { target = moveInLine(line, part.from, 1, byUnit) }
    }
  }
}

function moveLogically(line, start, dir, byUnit) {
  var target = start + dir
  if (byUnit) { while (target > 0 && isExtendingChar(line.text.charAt(target))) { target += dir } }
  return target < 0 || target > line.text.length ? null : target
}

// Bidirectional ordering algorithm
// See http://unicode.org/reports/tr9/tr9-13.html for the algorithm
// that this (partially) implements.

// One-char codes used for character types:
// L (L):   Left-to-Right
// R (R):   Right-to-Left
// r (AL):  Right-to-Left Arabic
// 1 (EN):  European Number
// + (ES):  European Number Separator
// % (ET):  European Number Terminator
// n (AN):  Arabic Number
// , (CS):  Common Number Separator
// m (NSM): Non-Spacing Mark
// b (BN):  Boundary Neutral
// s (B):   Paragraph Separator
// t (S):   Segment Separator
// w (WS):  Whitespace
// N (ON):  Other Neutrals

// Returns null if characters are ordered as they appear
// (left-to-right), or an array of sections ({from, to, level}
// objects) in the order in which they occur visually.
var bidiOrdering = (function() {
  // Character types for codepoints 0 to 0xff
  var lowTypes = "bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLN"
  // Character types for codepoints 0x600 to 0x6f9
  var arabicTypes = "nnnnnnNNr%%r,rNNmmmmmmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmmmnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmnNmmmmmmrrmmNmmmmrr1111111111"
  function charType(code) {
    if (code <= 0xf7) { return lowTypes.charAt(code) }
    else if (0x590 <= code && code <= 0x5f4) { return "R" }
    else if (0x600 <= code && code <= 0x6f9) { return arabicTypes.charAt(code - 0x600) }
    else if (0x6ee <= code && code <= 0x8ac) { return "r" }
    else if (0x2000 <= code && code <= 0x200b) { return "w" }
    else if (code == 0x200c) { return "b" }
    else { return "L" }
  }

  var bidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/
  var isNeutral = /[stwN]/, isStrong = /[LRr]/, countsAsLeft = /[Lb1n]/, countsAsNum = /[1n]/
  // Browsers seem to always treat the boundaries of block elements as being L.
  var outerType = "L"

  function BidiSpan(level, from, to) {
    this.level = level
    this.from = from; this.to = to
  }

  return function(str) {
    if (!bidiRE.test(str)) { return false }
    var len = str.length, types = []
    for (var i = 0; i < len; ++i)
      { types.push(charType(str.charCodeAt(i))) }

    // W1. Examine each non-spacing mark (NSM) in the level run, and
    // change the type of the NSM to the type of the previous
    // character. If the NSM is at the start of the level run, it will
    // get the type of sor.
    for (var i$1 = 0, prev = outerType; i$1 < len; ++i$1) {
      var type = types[i$1]
      if (type == "m") { types[i$1] = prev }
      else { prev = type }
    }

    // W2. Search backwards from each instance of a European number
    // until the first strong type (R, L, AL, or sor) is found. If an
    // AL is found, change the type of the European number to Arabic
    // number.
    // W3. Change all ALs to R.
    for (var i$2 = 0, cur = outerType; i$2 < len; ++i$2) {
      var type$1 = types[i$2]
      if (type$1 == "1" && cur == "r") { types[i$2] = "n" }
      else if (isStrong.test(type$1)) { cur = type$1; if (type$1 == "r") { types[i$2] = "R" } }
    }

    // W4. A single European separator between two European numbers
    // changes to a European number. A single common separator between
    // two numbers of the same type changes to that type.
    for (var i$3 = 1, prev$1 = types[0]; i$3 < len - 1; ++i$3) {
      var type$2 = types[i$3]
      if (type$2 == "+" && prev$1 == "1" && types[i$3+1] == "1") { types[i$3] = "1" }
      else if (type$2 == "," && prev$1 == types[i$3+1] &&
               (prev$1 == "1" || prev$1 == "n")) { types[i$3] = prev$1 }
      prev$1 = type$2
    }

    // W5. A sequence of European terminators adjacent to European
    // numbers changes to all European numbers.
    // W6. Otherwise, separators and terminators change to Other
    // Neutral.
    for (var i$4 = 0; i$4 < len; ++i$4) {
      var type$3 = types[i$4]
      if (type$3 == ",") { types[i$4] = "N" }
      else if (type$3 == "%") {
        var end = (void 0)
        for (end = i$4 + 1; end < len && types[end] == "%"; ++end) {}
        var replace = (i$4 && types[i$4-1] == "!") || (end < len && types[end] == "1") ? "1" : "N"
        for (var j = i$4; j < end; ++j) { types[j] = replace }
        i$4 = end - 1
      }
    }

    // W7. Search backwards from each instance of a European number
    // until the first strong type (R, L, or sor) is found. If an L is
    // found, then change the type of the European number to L.
    for (var i$5 = 0, cur$1 = outerType; i$5 < len; ++i$5) {
      var type$4 = types[i$5]
      if (cur$1 == "L" && type$4 == "1") { types[i$5] = "L" }
      else if (isStrong.test(type$4)) { cur$1 = type$4 }
    }

    // N1. A sequence of neutrals takes the direction of the
    // surrounding strong text if the text on both sides has the same
    // direction. European and Arabic numbers act as if they were R in
    // terms of their influence on neutrals. Start-of-level-run (sor)
    // and end-of-level-run (eor) are used at level run boundaries.
    // N2. Any remaining neutrals take the embedding direction.
    for (var i$6 = 0; i$6 < len; ++i$6) {
      if (isNeutral.test(types[i$6])) {
        var end$1 = (void 0)
        for (end$1 = i$6 + 1; end$1 < len && isNeutral.test(types[end$1]); ++end$1) {}
        var before = (i$6 ? types[i$6-1] : outerType) == "L"
        var after = (end$1 < len ? types[end$1] : outerType) == "L"
        var replace$1 = before || after ? "L" : "R"
        for (var j$1 = i$6; j$1 < end$1; ++j$1) { types[j$1] = replace$1 }
        i$6 = end$1 - 1
      }
    }

    // Here we depart from the documented algorithm, in order to avoid
    // building up an actual levels array. Since there are only three
    // levels (0, 1, 2) in an implementation that doesn't take
    // explicit embedding into account, we can build up the order on
    // the fly, without following the level-based algorithm.
    var order = [], m
    for (var i$7 = 0; i$7 < len;) {
      if (countsAsLeft.test(types[i$7])) {
        var start = i$7
        for (++i$7; i$7 < len && countsAsLeft.test(types[i$7]); ++i$7) {}
        order.push(new BidiSpan(0, start, i$7))
      } else {
        var pos = i$7, at = order.length
        for (++i$7; i$7 < len && types[i$7] != "L"; ++i$7) {}
        for (var j$2 = pos; j$2 < i$7;) {
          if (countsAsNum.test(types[j$2])) {
            if (pos < j$2) { order.splice(at, 0, new BidiSpan(1, pos, j$2)) }
            var nstart = j$2
            for (++j$2; j$2 < i$7 && countsAsNum.test(types[j$2]); ++j$2) {}
            order.splice(at, 0, new BidiSpan(2, nstart, j$2))
            pos = j$2
          } else { ++j$2 }
        }
        if (pos < i$7) { order.splice(at, 0, new BidiSpan(1, pos, i$7)) }
      }
    }
    if (order[0].level == 1 && (m = str.match(/^\s+/))) {
      order[0].from = m[0].length
      order.unshift(new BidiSpan(0, 0, m[0].length))
    }
    if (lst(order).level == 1 && (m = str.match(/\s+$/))) {
      lst(order).to -= m[0].length
      order.push(new BidiSpan(0, len - m[0].length, len))
    }
    if (order[0].level == 2)
      { order.unshift(new BidiSpan(1, order[0].to, order[0].to)) }
    if (order[0].level != lst(order).level)
      { order.push(new BidiSpan(order[0].level, len, len)) }

    return order
  }
})()

// Get the bidi ordering for the given line (and cache it). Returns
// false for lines that are fully left-to-right, and an array of
// BidiSpan objects otherwise.
function getOrder(line) {
  var order = line.order
  if (order == null) { order = line.order = bidiOrdering(line.text) }
  return order
}

// EVENT HANDLING

// Lightweight event framework. on/off also work on DOM nodes,
// registering native DOM handlers.

var noHandlers = []

var on = function(emitter, type, f) {
  if (emitter.addEventListener) {
    emitter.addEventListener(type, f, false)
  } else if (emitter.attachEvent) {
    emitter.attachEvent("on" + type, f)
  } else {
    var map = emitter._handlers || (emitter._handlers = {})
    map[type] = (map[type] || noHandlers).concat(f)
  }
}

function getHandlers(emitter, type) {
  return emitter._handlers && emitter._handlers[type] || noHandlers
}

function off(emitter, type, f) {
  if (emitter.removeEventListener) {
    emitter.removeEventListener(type, f, false)
  } else if (emitter.detachEvent) {
    emitter.detachEvent("on" + type, f)
  } else {
    var map = emitter._handlers, arr = map && map[type]
    if (arr) {
      var index = indexOf(arr, f)
      if (index > -1)
        { map[type] = arr.slice(0, index).concat(arr.slice(index + 1)) }
    }
  }
}

function signal(emitter, type /*, values...*/) {
  var handlers = getHandlers(emitter, type)
  if (!handlers.length) { return }
  var args = Array.prototype.slice.call(arguments, 2)
  for (var i = 0; i < handlers.length; ++i) { handlers[i].apply(null, args) }
}

// The DOM events that CodeMirror handles can be overridden by
// registering a (non-DOM) handler on the editor for the event name,
// and preventDefault-ing the event in that handler.
function signalDOMEvent(cm, e, override) {
  if (typeof e == "string")
    { e = {type: e, preventDefault: function() { this.defaultPrevented = true }} }
  signal(cm, override || e.type, cm, e)
  return e_defaultPrevented(e) || e.codemirrorIgnore
}

function signalCursorActivity(cm) {
  var arr = cm._handlers && cm._handlers.cursorActivity
  if (!arr) { return }
  var set = cm.curOp.cursorActivityHandlers || (cm.curOp.cursorActivityHandlers = [])
  for (var i = 0; i < arr.length; ++i) { if (indexOf(set, arr[i]) == -1)
    { set.push(arr[i]) } }
}

function hasHandler(emitter, type) {
  return getHandlers(emitter, type).length > 0
}

// Add on and off methods to a constructor's prototype, to make
// registering events on such objects more convenient.
function eventMixin(ctor) {
  ctor.prototype.on = function(type, f) {on(this, type, f)}
  ctor.prototype.off = function(type, f) {off(this, type, f)}
}

// Due to the fact that we still support jurassic IE versions, some
// compatibility wrappers are needed.

function e_preventDefault(e) {
  if (e.preventDefault) { e.preventDefault() }
  else { e.returnValue = false }
}
function e_stopPropagation(e) {
  if (e.stopPropagation) { e.stopPropagation() }
  else { e.cancelBubble = true }
}
function e_defaultPrevented(e) {
  return e.defaultPrevented != null ? e.defaultPrevented : e.returnValue == false
}
function e_stop(e) {e_preventDefault(e); e_stopPropagation(e)}

function e_target(e) {return e.target || e.srcElement}
function e_button(e) {
  var b = e.which
  if (b == null) {
    if (e.button & 1) { b = 1 }
    else if (e.button & 2) { b = 3 }
    else if (e.button & 4) { b = 2 }
  }
  if (mac && e.ctrlKey && b == 1) { b = 3 }
  return b
}

// Detect drag-and-drop
var dragAndDrop = function() {
  // There is *some* kind of drag-and-drop support in IE6-8, but I
  // couldn't get it to work yet.
  if (ie && ie_version < 9) { return false }
  var div = elt('div')
  return "draggable" in div || "dragDrop" in div
}()

var zwspSupported
function zeroWidthElement(measure) {
  if (zwspSupported == null) {
    var test = elt("span", "\u200b")
    removeChildrenAndAdd(measure, elt("span", [test, document.createTextNode("x")]))
    if (measure.firstChild.offsetHeight != 0)
      { zwspSupported = test.offsetWidth <= 1 && test.offsetHeight > 2 && !(ie && ie_version < 8) }
  }
  var node = zwspSupported ? elt("span", "\u200b") :
    elt("span", "\u00a0", null, "display: inline-block; width: 1px; margin-right: -1px")
  node.setAttribute("cm-text", "")
  return node
}

// Feature-detect IE's crummy client rect reporting for bidi text
var badBidiRects
function hasBadBidiRects(measure) {
  if (badBidiRects != null) { return badBidiRects }
  var txt = removeChildrenAndAdd(measure, document.createTextNode("A\u062eA"))
  var r0 = range(txt, 0, 1).getBoundingClientRect()
  var r1 = range(txt, 1, 2).getBoundingClientRect()
  removeChildren(measure)
  if (!r0 || r0.left == r0.right) { return false } // Safari returns null in some cases (#2780)
  return badBidiRects = (r1.right - r0.right < 3)
}

// See if "".split is the broken IE version, if so, provide an
// alternative way to split lines.
var splitLinesAuto = "\n\nb".split(/\n/).length != 3 ? function (string) {
  var pos = 0, result = [], l = string.length
  while (pos <= l) {
    var nl = string.indexOf("\n", pos)
    if (nl == -1) { nl = string.length }
    var line = string.slice(pos, string.charAt(nl - 1) == "\r" ? nl - 1 : nl)
    var rt = line.indexOf("\r")
    if (rt != -1) {
      result.push(line.slice(0, rt))
      pos += rt + 1
    } else {
      result.push(line)
      pos = nl + 1
    }
  }
  return result
} : function (string) { return string.split(/\r\n?|\n/); }

var hasSelection = window.getSelection ? function (te) {
  try { return te.selectionStart != te.selectionEnd }
  catch(e) { return false }
} : function (te) {
  var range
  try {range = te.ownerDocument.selection.createRange()}
  catch(e) {}
  if (!range || range.parentElement() != te) { return false }
  return range.compareEndPoints("StartToEnd", range) != 0
}

var hasCopyEvent = (function () {
  var e = elt("div")
  if ("oncopy" in e) { return true }
  e.setAttribute("oncopy", "return;")
  return typeof e.oncopy == "function"
})()

var badZoomedRects = null
function hasBadZoomedRects(measure) {
  if (badZoomedRects != null) { return badZoomedRects }
  var node = removeChildrenAndAdd(measure, elt("span", "x"))
  var normal = node.getBoundingClientRect()
  var fromRange = range(node, 0, 1).getBoundingClientRect()
  return badZoomedRects = Math.abs(normal.left - fromRange.left) > 1
}

var modes = {};
var mimeModes = {};
// Extra arguments are stored as the mode's dependencies, which is
// used by (legacy) mechanisms like loadmode.js to automatically
// load a mode. (Preferred mechanism is the require/define calls.)
function defineMode(name, mode) {
  if (arguments.length > 2)
    { mode.dependencies = Array.prototype.slice.call(arguments, 2) }
  modes[name] = mode
}

function defineMIME(mime, spec) {
  mimeModes[mime] = spec
}

// Given a MIME type, a {name, ...options} config object, or a name
// string, return a mode config object.
function resolveMode(spec) {
  if (typeof spec == "string" && mimeModes.hasOwnProperty(spec)) {
    spec = mimeModes[spec]
  } else if (spec && typeof spec.name == "string" && mimeModes.hasOwnProperty(spec.name)) {
    var found = mimeModes[spec.name]
    if (typeof found == "string") { found = {name: found} }
    spec = createObj(found, spec)
    spec.name = found.name
  } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+xml$/.test(spec)) {
    return resolveMode("application/xml")
  } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+json$/.test(spec)) {
    return resolveMode("application/json")
  }
  if (typeof spec == "string") { return {name: spec} }
  else { return spec || {name: "null"} }
}

// Given a mode spec (anything that resolveMode accepts), find and
// initialize an actual mode object.
function getMode(options, spec) {
  spec = resolveMode(spec)
  var mfactory = modes[spec.name]
  if (!mfactory) { return getMode(options, "text/plain") }
  var modeObj = mfactory(options, spec)
  if (modeExtensions.hasOwnProperty(spec.name)) {
    var exts = modeExtensions[spec.name]
    for (var prop in exts) {
      if (!exts.hasOwnProperty(prop)) { continue }
      if (modeObj.hasOwnProperty(prop)) { modeObj["_" + prop] = modeObj[prop] }
      modeObj[prop] = exts[prop]
    }
  }
  modeObj.name = spec.name
  if (spec.helperType) { modeObj.helperType = spec.helperType }
  if (spec.modeProps) { for (var prop$1 in spec.modeProps)
    { modeObj[prop$1] = spec.modeProps[prop$1] } }

  return modeObj
}

// This can be used to attach properties to mode objects from
// outside the actual mode definition.
var modeExtensions = {}
function extendMode(mode, properties) {
  var exts = modeExtensions.hasOwnProperty(mode) ? modeExtensions[mode] : (modeExtensions[mode] = {})
  copyObj(properties, exts)
}

function copyState(mode, state) {
  if (state === true) { return state }
  if (mode.copyState) { return mode.copyState(state) }
  var nstate = {}
  for (var n in state) {
    var val = state[n]
    if (val instanceof Array) { val = val.concat([]) }
    nstate[n] = val
  }
  return nstate
}

// Given a mode and a state (for that mode), find the inner mode and
// state at the position that the state refers to.
function innerMode(mode, state) {
  var info
  while (mode.innerMode) {
    info = mode.innerMode(state)
    if (!info || info.mode == mode) { break }
    state = info.state
    mode = info.mode
  }
  return info || {mode: mode, state: state}
}

function startState(mode, a1, a2) {
  return mode.startState ? mode.startState(a1, a2) : true
}

// STRING STREAM

// Fed to the mode parsers, provides helper functions to make
// parsers more succinct.

var StringStream = function(string, tabSize) {
  this.pos = this.start = 0
  this.string = string
  this.tabSize = tabSize || 8
  this.lastColumnPos = this.lastColumnValue = 0
  this.lineStart = 0
}

StringStream.prototype = {
  eol: function() {return this.pos >= this.string.length},
  sol: function() {return this.pos == this.lineStart},
  peek: function() {return this.string.charAt(this.pos) || undefined},
  next: function() {
    if (this.pos < this.string.length)
      { return this.string.charAt(this.pos++) }
  },
  eat: function(match) {
    var ch = this.string.charAt(this.pos)
    var ok
    if (typeof match == "string") { ok = ch == match }
    else { ok = ch && (match.test ? match.test(ch) : match(ch)) }
    if (ok) {++this.pos; return ch}
  },
  eatWhile: function(match) {
    var start = this.pos
    while (this.eat(match)){}
    return this.pos > start
  },
  eatSpace: function() {
    var this$1 = this;

    var start = this.pos
    while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) { ++this$1.pos }
    return this.pos > start
  },
  skipToEnd: function() {this.pos = this.string.length},
  skipTo: function(ch) {
    var found = this.string.indexOf(ch, this.pos)
    if (found > -1) {this.pos = found; return true}
  },
  backUp: function(n) {this.pos -= n},
  column: function() {
    if (this.lastColumnPos < this.start) {
      this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue)
      this.lastColumnPos = this.start
    }
    return this.lastColumnValue - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0)
  },
  indentation: function() {
    return countColumn(this.string, null, this.tabSize) -
      (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0)
  },
  match: function(pattern, consume, caseInsensitive) {
    if (typeof pattern == "string") {
      var cased = function (str) { return caseInsensitive ? str.toLowerCase() : str; }
      var substr = this.string.substr(this.pos, pattern.length)
      if (cased(substr) == cased(pattern)) {
        if (consume !== false) { this.pos += pattern.length }
        return true
      }
    } else {
      var match = this.string.slice(this.pos).match(pattern)
      if (match && match.index > 0) { return null }
      if (match && consume !== false) { this.pos += match[0].length }
      return match
    }
  },
  current: function(){return this.string.slice(this.start, this.pos)},
  hideFirstChars: function(n, inner) {
    this.lineStart += n
    try { return inner() }
    finally { this.lineStart -= n }
  }
}

// Compute a style array (an array starting with a mode generation
// -- for invalidation -- followed by pairs of end positions and
// style strings), which is used to highlight the tokens on the
// line.
function highlightLine(cm, line, state, forceToEnd) {
  // A styles array always starts with a number identifying the
  // mode/overlays that it is based on (for easy invalidation).
  var st = [cm.state.modeGen], lineClasses = {}
  // Compute the base array of styles
  runMode(cm, line.text, cm.doc.mode, state, function (end, style) { return st.push(end, style); },
    lineClasses, forceToEnd)

  // Run overlays, adjust style array.
  var loop = function ( o ) {
    var overlay = cm.state.overlays[o], i = 1, at = 0
    runMode(cm, line.text, overlay.mode, true, function (end, style) {
      var start = i
      // Ensure there's a token end at the current position, and that i points at it
      while (at < end) {
        var i_end = st[i]
        if (i_end > end)
          { st.splice(i, 1, end, st[i+1], i_end) }
        i += 2
        at = Math.min(end, i_end)
      }
      if (!style) { return }
      if (overlay.opaque) {
        st.splice(start, i - start, end, "overlay " + style)
        i = start + 2
      } else {
        for (; start < i; start += 2) {
          var cur = st[start+1]
          st[start+1] = (cur ? cur + " " : "") + "overlay " + style
        }
      }
    }, lineClasses)
  };

  for (var o = 0; o < cm.state.overlays.length; ++o) loop( o );

  return {styles: st, classes: lineClasses.bgClass || lineClasses.textClass ? lineClasses : null}
}

function getLineStyles(cm, line, updateFrontier) {
  if (!line.styles || line.styles[0] != cm.state.modeGen) {
    var state = getStateBefore(cm, lineNo(line))
    var result = highlightLine(cm, line, line.text.length > cm.options.maxHighlightLength ? copyState(cm.doc.mode, state) : state)
    line.stateAfter = state
    line.styles = result.styles
    if (result.classes) { line.styleClasses = result.classes }
    else if (line.styleClasses) { line.styleClasses = null }
    if (updateFrontier === cm.doc.frontier) { cm.doc.frontier++ }
  }
  return line.styles
}

function getStateBefore(cm, n, precise) {
  var doc = cm.doc, display = cm.display
  if (!doc.mode.startState) { return true }
  var pos = findStartLine(cm, n, precise), state = pos > doc.first && getLine(doc, pos-1).stateAfter
  if (!state) { state = startState(doc.mode) }
  else { state = copyState(doc.mode, state) }
  doc.iter(pos, n, function (line) {
    processLine(cm, line.text, state)
    var save = pos == n - 1 || pos % 5 == 0 || pos >= display.viewFrom && pos < display.viewTo
    line.stateAfter = save ? copyState(doc.mode, state) : null
    ++pos
  })
  if (precise) { doc.frontier = pos }
  return state
}

// Lightweight form of highlight -- proceed over this line and
// update state, but don't save a style array. Used for lines that
// aren't currently visible.
function processLine(cm, text, state, startAt) {
  var mode = cm.doc.mode
  var stream = new StringStream(text, cm.options.tabSize)
  stream.start = stream.pos = startAt || 0
  if (text == "") { callBlankLine(mode, state) }
  while (!stream.eol()) {
    readToken(mode, stream, state)
    stream.start = stream.pos
  }
}

function callBlankLine(mode, state) {
  if (mode.blankLine) { return mode.blankLine(state) }
  if (!mode.innerMode) { return }
  var inner = innerMode(mode, state)
  if (inner.mode.blankLine) { return inner.mode.blankLine(inner.state) }
}

function readToken(mode, stream, state, inner) {
  for (var i = 0; i < 10; i++) {
    if (inner) { inner[0] = innerMode(mode, state).mode }
    var style = mode.token(stream, state)
    if (stream.pos > stream.start) { return style }
  }
  throw new Error("Mode " + mode.name + " failed to advance stream.")
}

// Utility for getTokenAt and getLineTokens
function takeToken(cm, pos, precise, asArray) {
  var getObj = function (copy) { return ({
    start: stream.start, end: stream.pos,
    string: stream.current(),
    type: style || null,
    state: copy ? copyState(doc.mode, state) : state
  }); }

  var doc = cm.doc, mode = doc.mode, style
  pos = clipPos(doc, pos)
  var line = getLine(doc, pos.line), state = getStateBefore(cm, pos.line, precise)
  var stream = new StringStream(line.text, cm.options.tabSize), tokens
  if (asArray) { tokens = [] }
  while ((asArray || stream.pos < pos.ch) && !stream.eol()) {
    stream.start = stream.pos
    style = readToken(mode, stream, state)
    if (asArray) { tokens.push(getObj(true)) }
  }
  return asArray ? tokens : getObj()
}

function extractLineClasses(type, output) {
  if (type) { for (;;) {
    var lineClass = type.match(/(?:^|\s+)line-(background-)?(\S+)/)
    if (!lineClass) { break }
    type = type.slice(0, lineClass.index) + type.slice(lineClass.index + lineClass[0].length)
    var prop = lineClass[1] ? "bgClass" : "textClass"
    if (output[prop] == null)
      { output[prop] = lineClass[2] }
    else if (!(new RegExp("(?:^|\s)" + lineClass[2] + "(?:$|\s)")).test(output[prop]))
      { output[prop] += " " + lineClass[2] }
  } }
  return type
}

// Run the given mode's parser over a line, calling f for each token.
function runMode(cm, text, mode, state, f, lineClasses, forceToEnd) {
  var flattenSpans = mode.flattenSpans
  if (flattenSpans == null) { flattenSpans = cm.options.flattenSpans }
  var curStart = 0, curStyle = null
  var stream = new StringStream(text, cm.options.tabSize), style
  var inner = cm.options.addModeClass && [null]
  if (text == "") { extractLineClasses(callBlankLine(mode, state), lineClasses) }
  while (!stream.eol()) {
    if (stream.pos > cm.options.maxHighlightLength) {
      flattenSpans = false
      if (forceToEnd) { processLine(cm, text, state, stream.pos) }
      stream.pos = text.length
      style = null
    } else {
      style = extractLineClasses(readToken(mode, stream, state, inner), lineClasses)
    }
    if (inner) {
      var mName = inner[0].name
      if (mName) { style = "m-" + (style ? mName + " " + style : mName) }
    }
    if (!flattenSpans || curStyle != style) {
      while (curStart < stream.start) {
        curStart = Math.min(stream.start, curStart + 5000)
        f(curStart, curStyle)
      }
      curStyle = style
    }
    stream.start = stream.pos
  }
  while (curStart < stream.pos) {
    // Webkit seems to refuse to render text nodes longer than 57444
    // characters, and returns inaccurate measurements in nodes
    // starting around 5000 chars.
    var pos = Math.min(stream.pos, curStart + 5000)
    f(pos, curStyle)
    curStart = pos
  }
}

// Finds the line to start with when starting a parse. Tries to
// find a line with a stateAfter, so that it can start with a
// valid state. If that fails, it returns the line with the
// smallest indentation, which tends to need the least context to
// parse correctly.
function findStartLine(cm, n, precise) {
  var minindent, minline, doc = cm.doc
  var lim = precise ? -1 : n - (cm.doc.mode.innerMode ? 1000 : 100)
  for (var search = n; search > lim; --search) {
    if (search <= doc.first) { return doc.first }
    var line = getLine(doc, search - 1)
    if (line.stateAfter && (!precise || search <= doc.frontier)) { return search }
    var indented = countColumn(line.text, null, cm.options.tabSize)
    if (minline == null || minindent > indented) {
      minline = search - 1
      minindent = indented
    }
  }
  return minline
}

// LINE DATA STRUCTURE

// Line objects. These hold state related to a line, including
// highlighting info (the styles array).
function Line(text, markedSpans, estimateHeight) {
  this.text = text
  attachMarkedSpans(this, markedSpans)
  this.height = estimateHeight ? estimateHeight(this) : 1
}
eventMixin(Line)
Line.prototype.lineNo = function() { return lineNo(this) }

// Change the content (text, markers) of a line. Automatically
// invalidates cached information and tries to re-estimate the
// line's height.
function updateLine(line, text, markedSpans, estimateHeight) {
  line.text = text
  if (line.stateAfter) { line.stateAfter = null }
  if (line.styles) { line.styles = null }
  if (line.order != null) { line.order = null }
  detachMarkedSpans(line)
  attachMarkedSpans(line, markedSpans)
  var estHeight = estimateHeight ? estimateHeight(line) : 1
  if (estHeight != line.height) { updateLineHeight(line, estHeight) }
}

// Detach a line from the document tree and its markers.
function cleanUpLine(line) {
  line.parent = null
  detachMarkedSpans(line)
}

// Convert a style as returned by a mode (either null, or a string
// containing one or more styles) to a CSS style. This is cached,
// and also looks for line-wide styles.
var styleToClassCache = {};
var styleToClassCacheWithMode = {};
function interpretTokenStyle(style, options) {
  if (!style || /^\s*$/.test(style)) { return null }
  var cache = options.addModeClass ? styleToClassCacheWithMode : styleToClassCache
  return cache[style] ||
    (cache[style] = style.replace(/\S+/g, "cm-$&"))
}

// Render the DOM representation of the text of a line. Also builds
// up a 'line map', which points at the DOM nodes that represent
// specific stretches of text, and is used by the measuring code.
// The returned object contains the DOM node, this map, and
// information about line-wide styles that were set by the mode.
function buildLineContent(cm, lineView) {
  // The padding-right forces the element to have a 'border', which
  // is needed on Webkit to be able to get line-level bounding
  // rectangles for it (in measureChar).
  var content = elt("span", null, null, webkit ? "padding-right: .1px" : null)
  var builder = {pre: elt("pre", [content], "CodeMirror-line"), content: content,
                 col: 0, pos: 0, cm: cm,
                 trailingSpace: false,
                 splitSpaces: (ie || webkit) && cm.getOption("lineWrapping")}
  // hide from accessibility tree
  content.setAttribute("role", "presentation")
  builder.pre.setAttribute("role", "presentation")
  lineView.measure = {}

  // Iterate over the logical lines that make up this visual line.
  for (var i = 0; i <= (lineView.rest ? lineView.rest.length : 0); i++) {
    var line = i ? lineView.rest[i - 1] : lineView.line, order = (void 0)
    builder.pos = 0
    builder.addToken = buildToken
    // Optionally wire in some hacks into the token-rendering
    // algorithm, to deal with browser quirks.
    if (hasBadBidiRects(cm.display.measure) && (order = getOrder(line)))
      { builder.addToken = buildTokenBadBidi(builder.addToken, order) }
    builder.map = []
    var allowFrontierUpdate = lineView != cm.display.externalMeasured && lineNo(line)
    insertLineContent(line, builder, getLineStyles(cm, line, allowFrontierUpdate))
    if (line.styleClasses) {
      if (line.styleClasses.bgClass)
        { builder.bgClass = joinClasses(line.styleClasses.bgClass, builder.bgClass || "") }
      if (line.styleClasses.textClass)
        { builder.textClass = joinClasses(line.styleClasses.textClass, builder.textClass || "") }
    }

    // Ensure at least a single node is present, for measuring.
    if (builder.map.length == 0)
      { builder.map.push(0, 0, builder.content.appendChild(zeroWidthElement(cm.display.measure))) }

    // Store the map and a cache object for the current logical line
    if (i == 0) {
      lineView.measure.map = builder.map
      lineView.measure.cache = {}
    } else {
      ;(lineView.measure.maps || (lineView.measure.maps = [])).push(builder.map)
      ;(lineView.measure.caches || (lineView.measure.caches = [])).push({})
    }
  }

  // See issue #2901
  if (webkit) {
    var last = builder.content.lastChild
    if (/\bcm-tab\b/.test(last.className) || (last.querySelector && last.querySelector(".cm-tab")))
      { builder.content.className = "cm-tab-wrap-hack" }
  }

  signal(cm, "renderLine", cm, lineView.line, builder.pre)
  if (builder.pre.className)
    { builder.textClass = joinClasses(builder.pre.className, builder.textClass || "") }

  return builder
}

function defaultSpecialCharPlaceholder(ch) {
  var token = elt("span", "\u2022", "cm-invalidchar")
  token.title = "\\u" + ch.charCodeAt(0).toString(16)
  token.setAttribute("aria-label", token.title)
  return token
}

// Build up the DOM representation for a single token, and add it to
// the line map. Takes care to render special characters separately.
function buildToken(builder, text, style, startStyle, endStyle, title, css) {
  if (!text) { return }
  var displayText = builder.splitSpaces ? splitSpaces(text, builder.trailingSpace) : text
  var special = builder.cm.state.specialChars, mustWrap = false
  var content
  if (!special.test(text)) {
    builder.col += text.length
    content = document.createTextNode(displayText)
    builder.map.push(builder.pos, builder.pos + text.length, content)
    if (ie && ie_version < 9) { mustWrap = true }
    builder.pos += text.length
  } else {
    content = document.createDocumentFragment()
    var pos = 0
    while (true) {
      special.lastIndex = pos
      var m = special.exec(text)
      var skipped = m ? m.index - pos : text.length - pos
      if (skipped) {
        var txt = document.createTextNode(displayText.slice(pos, pos + skipped))
        if (ie && ie_version < 9) { content.appendChild(elt("span", [txt])) }
        else { content.appendChild(txt) }
        builder.map.push(builder.pos, builder.pos + skipped, txt)
        builder.col += skipped
        builder.pos += skipped
      }
      if (!m) { break }
      pos += skipped + 1
      var txt$1 = (void 0)
      if (m[0] == "\t") {
        var tabSize = builder.cm.options.tabSize, tabWidth = tabSize - builder.col % tabSize
        txt$1 = content.appendChild(elt("span", spaceStr(tabWidth), "cm-tab"))
        txt$1.setAttribute("role", "presentation")
        txt$1.setAttribute("cm-text", "\t")
        builder.col += tabWidth
      } else if (m[0] == "\r" || m[0] == "\n") {
        txt$1 = content.appendChild(elt("span", m[0] == "\r" ? "\u240d" : "\u2424", "cm-invalidchar"))
        txt$1.setAttribute("cm-text", m[0])
        builder.col += 1
      } else {
        txt$1 = builder.cm.options.specialCharPlaceholder(m[0])
        txt$1.setAttribute("cm-text", m[0])
        if (ie && ie_version < 9) { content.appendChild(elt("span", [txt$1])) }
        else { content.appendChild(txt$1) }
        builder.col += 1
      }
      builder.map.push(builder.pos, builder.pos + 1, txt$1)
      builder.pos++
    }
  }
  builder.trailingSpace = displayText.charCodeAt(text.length - 1) == 32
  if (style || startStyle || endStyle || mustWrap || css) {
    var fullStyle = style || ""
    if (startStyle) { fullStyle += startStyle }
    if (endStyle) { fullStyle += endStyle }
    var token = elt("span", [content], fullStyle, css)
    if (title) { token.title = title }
    return builder.content.appendChild(token)
  }
  builder.content.appendChild(content)
}

function splitSpaces(text, trailingBefore) {
  if (text.length > 1 && !/  /.test(text)) { return text }
  var spaceBefore = trailingBefore, result = ""
  for (var i = 0; i < text.length; i++) {
    var ch = text.charAt(i)
    if (ch == " " && spaceBefore && (i == text.length - 1 || text.charCodeAt(i + 1) == 32))
      { ch = "\u00a0" }
    result += ch
    spaceBefore = ch == " "
  }
  return result
}

// Work around nonsense dimensions being reported for stretches of
// right-to-left text.
function buildTokenBadBidi(inner, order) {
  return function (builder, text, style, startStyle, endStyle, title, css) {
    style = style ? style + " cm-force-border" : "cm-force-border"
    var start = builder.pos, end = start + text.length
    for (;;) {
      // Find the part that overlaps with the start of this text
      var part = (void 0)
      for (var i = 0; i < order.length; i++) {
        part = order[i]
        if (part.to > start && part.from <= start) { break }
      }
      if (part.to >= end) { return inner(builder, text, style, startStyle, endStyle, title, css) }
      inner(builder, text.slice(0, part.to - start), style, startStyle, null, title, css)
      startStyle = null
      text = text.slice(part.to - start)
      start = part.to
    }
  }
}

function buildCollapsedSpan(builder, size, marker, ignoreWidget) {
  var widget = !ignoreWidget && marker.widgetNode
  if (widget) { builder.map.push(builder.pos, builder.pos + size, widget) }
  if (!ignoreWidget && builder.cm.display.input.needsContentAttribute) {
    if (!widget)
      { widget = builder.content.appendChild(document.createElement("span")) }
    widget.setAttribute("cm-marker", marker.id)
  }
  if (widget) {
    builder.cm.display.input.setUneditable(widget)
    builder.content.appendChild(widget)
  }
  builder.pos += size
  builder.trailingSpace = false
}

// Outputs a number of spans to make up a line, taking highlighting
// and marked text into account.
function insertLineContent(line, builder, styles) {
  var spans = line.markedSpans, allText = line.text, at = 0
  if (!spans) {
    for (var i$1 = 1; i$1 < styles.length; i$1+=2)
      { builder.addToken(builder, allText.slice(at, at = styles[i$1]), interpretTokenStyle(styles[i$1+1], builder.cm.options)) }
    return
  }

  var len = allText.length, pos = 0, i = 1, text = "", style, css
  var nextChange = 0, spanStyle, spanEndStyle, spanStartStyle, title, collapsed
  for (;;) {
    if (nextChange == pos) { // Update current marker set
      spanStyle = spanEndStyle = spanStartStyle = title = css = ""
      collapsed = null; nextChange = Infinity
      var foundBookmarks = [], endStyles = (void 0)
      for (var j = 0; j < spans.length; ++j) {
        var sp = spans[j], m = sp.marker
        if (m.type == "bookmark" && sp.from == pos && m.widgetNode) {
          foundBookmarks.push(m)
        } else if (sp.from <= pos && (sp.to == null || sp.to > pos || m.collapsed && sp.to == pos && sp.from == pos)) {
          if (sp.to != null && sp.to != pos && nextChange > sp.to) {
            nextChange = sp.to
            spanEndStyle = ""
          }
          if (m.className) { spanStyle += " " + m.className }
          if (m.css) { css = (css ? css + ";" : "") + m.css }
          if (m.startStyle && sp.from == pos) { spanStartStyle += " " + m.startStyle }
          if (m.endStyle && sp.to == nextChange) { (endStyles || (endStyles = [])).push(m.endStyle, sp.to) }
          if (m.title && !title) { title = m.title }
          if (m.collapsed && (!collapsed || compareCollapsedMarkers(collapsed.marker, m) < 0))
            { collapsed = sp }
        } else if (sp.from > pos && nextChange > sp.from) {
          nextChange = sp.from
        }
      }
      if (endStyles) { for (var j$1 = 0; j$1 < endStyles.length; j$1 += 2)
        { if (endStyles[j$1 + 1] == nextChange) { spanEndStyle += " " + endStyles[j$1] } } }

      if (!collapsed || collapsed.from == pos) { for (var j$2 = 0; j$2 < foundBookmarks.length; ++j$2)
        { buildCollapsedSpan(builder, 0, foundBookmarks[j$2]) } }
      if (collapsed && (collapsed.from || 0) == pos) {
        buildCollapsedSpan(builder, (collapsed.to == null ? len + 1 : collapsed.to) - pos,
                           collapsed.marker, collapsed.from == null)
        if (collapsed.to == null) { return }
        if (collapsed.to == pos) { collapsed = false }
      }
    }
    if (pos >= len) { break }

    var upto = Math.min(len, nextChange)
    while (true) {
      if (text) {
        var end = pos + text.length
        if (!collapsed) {
          var tokenText = end > upto ? text.slice(0, upto - pos) : text
          builder.addToken(builder, tokenText, style ? style + spanStyle : spanStyle,
                           spanStartStyle, pos + tokenText.length == nextChange ? spanEndStyle : "", title, css)
        }
        if (end >= upto) {text = text.slice(upto - pos); pos = upto; break}
        pos = end
        spanStartStyle = ""
      }
      text = allText.slice(at, at = styles[i++])
      style = interpretTokenStyle(styles[i++], builder.cm.options)
    }
  }
}


// These objects are used to represent the visible (currently drawn)
// part of the document. A LineView may correspond to multiple
// logical lines, if those are connected by collapsed ranges.
function LineView(doc, line, lineN) {
  // The starting line
  this.line = line
  // Continuing lines, if any
  this.rest = visualLineContinued(line)
  // Number of logical lines in this visual line
  this.size = this.rest ? lineNo(lst(this.rest)) - lineN + 1 : 1
  this.node = this.text = null
  this.hidden = lineIsHidden(doc, line)
}

// Create a range of LineView objects for the given lines.
function buildViewArray(cm, from, to) {
  var array = [], nextPos
  for (var pos = from; pos < to; pos = nextPos) {
    var view = new LineView(cm.doc, getLine(cm.doc, pos), pos)
    nextPos = pos + view.size
    array.push(view)
  }
  return array
}

var operationGroup = null

function pushOperation(op) {
  if (operationGroup) {
    operationGroup.ops.push(op)
  } else {
    op.ownsGroup = operationGroup = {
      ops: [op],
      delayedCallbacks: []
    }
  }
}

function fireCallbacksForOps(group) {
  // Calls delayed callbacks and cursorActivity handlers until no
  // new ones appear
  var callbacks = group.delayedCallbacks, i = 0
  do {
    for (; i < callbacks.length; i++)
      { callbacks[i].call(null) }
    for (var j = 0; j < group.ops.length; j++) {
      var op = group.ops[j]
      if (op.cursorActivityHandlers)
        { while (op.cursorActivityCalled < op.cursorActivityHandlers.length)
          { op.cursorActivityHandlers[op.cursorActivityCalled++].call(null, op.cm) } }
    }
  } while (i < callbacks.length)
}

function finishOperation(op, endCb) {
  var group = op.ownsGroup
  if (!group) { return }

  try { fireCallbacksForOps(group) }
  finally {
    operationGroup = null
    endCb(group)
  }
}

var orphanDelayedCallbacks = null

// Often, we want to signal events at a point where we are in the
// middle of some work, but don't want the handler to start calling
// other methods on the editor, which might be in an inconsistent
// state or simply not expect any other events to happen.
// signalLater looks whether there are any handlers, and schedules
// them to be executed when the last operation ends, or, if no
// operation is active, when a timeout fires.
function signalLater(emitter, type /*, values...*/) {
  var arr = getHandlers(emitter, type)
  if (!arr.length) { return }
  var args = Array.prototype.slice.call(arguments, 2), list
  if (operationGroup) {
    list = operationGroup.delayedCallbacks
  } else if (orphanDelayedCallbacks) {
    list = orphanDelayedCallbacks
  } else {
    list = orphanDelayedCallbacks = []
    setTimeout(fireOrphanDelayed, 0)
  }
  var loop = function ( i ) {
    list.push(function () { return arr[i].apply(null, args); })
  };

  for (var i = 0; i < arr.length; ++i)
    loop( i );
}

function fireOrphanDelayed() {
  var delayed = orphanDelayedCallbacks
  orphanDelayedCallbacks = null
  for (var i = 0; i < delayed.length; ++i) { delayed[i]() }
}

// When an aspect of a line changes, a string is added to
// lineView.changes. This updates the relevant part of the line's
// DOM structure.
function updateLineForChanges(cm, lineView, lineN, dims) {
  for (var j = 0; j < lineView.changes.length; j++) {
    var type = lineView.changes[j]
    if (type == "text") { updateLineText(cm, lineView) }
    else if (type == "gutter") { updateLineGutter(cm, lineView, lineN, dims) }
    else if (type == "class") { updateLineClasses(lineView) }
    else if (type == "widget") { updateLineWidgets(cm, lineView, dims) }
  }
  lineView.changes = null
}

// Lines with gutter elements, widgets or a background class need to
// be wrapped, and have the extra elements added to the wrapper div
function ensureLineWrapped(lineView) {
  if (lineView.node == lineView.text) {
    lineView.node = elt("div", null, null, "position: relative")
    if (lineView.text.parentNode)
      { lineView.text.parentNode.replaceChild(lineView.node, lineView.text) }
    lineView.node.appendChild(lineView.text)
    if (ie && ie_version < 8) { lineView.node.style.zIndex = 2 }
  }
  return lineView.node
}

function updateLineBackground(lineView) {
  var cls = lineView.bgClass ? lineView.bgClass + " " + (lineView.line.bgClass || "") : lineView.line.bgClass
  if (cls) { cls += " CodeMirror-linebackground" }
  if (lineView.background) {
    if (cls) { lineView.background.className = cls }
    else { lineView.background.parentNode.removeChild(lineView.background); lineView.background = null }
  } else if (cls) {
    var wrap = ensureLineWrapped(lineView)
    lineView.background = wrap.insertBefore(elt("div", null, cls), wrap.firstChild)
  }
}

// Wrapper around buildLineContent which will reuse the structure
// in display.externalMeasured when possible.
function getLineContent(cm, lineView) {
  var ext = cm.display.externalMeasured
  if (ext && ext.line == lineView.line) {
    cm.display.externalMeasured = null
    lineView.measure = ext.measure
    return ext.built
  }
  return buildLineContent(cm, lineView)
}

// Redraw the line's text. Interacts with the background and text
// classes because the mode may output tokens that influence these
// classes.
function updateLineText(cm, lineView) {
  var cls = lineView.text.className
  var built = getLineContent(cm, lineView)
  if (lineView.text == lineView.node) { lineView.node = built.pre }
  lineView.text.parentNode.replaceChild(built.pre, lineView.text)
  lineView.text = built.pre
  if (built.bgClass != lineView.bgClass || built.textClass != lineView.textClass) {
    lineView.bgClass = built.bgClass
    lineView.textClass = built.textClass
    updateLineClasses(lineView)
  } else if (cls) {
    lineView.text.className = cls
  }
}

function updateLineClasses(lineView) {
  updateLineBackground(lineView)
  if (lineView.line.wrapClass)
    { ensureLineWrapped(lineView).className = lineView.line.wrapClass }
  else if (lineView.node != lineView.text)
    { lineView.node.className = "" }
  var textClass = lineView.textClass ? lineView.textClass + " " + (lineView.line.textClass || "") : lineView.line.textClass
  lineView.text.className = textClass || ""
}

function updateLineGutter(cm, lineView, lineN, dims) {
  if (lineView.gutter) {
    lineView.node.removeChild(lineView.gutter)
    lineView.gutter = null
  }
  if (lineView.gutterBackground) {
    lineView.node.removeChild(lineView.gutterBackground)
    lineView.gutterBackground = null
  }
  if (lineView.line.gutterClass) {
    var wrap = ensureLineWrapped(lineView)
    lineView.gutterBackground = elt("div", null, "CodeMirror-gutter-background " + lineView.line.gutterClass,
                                    ("left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px; width: " + (dims.gutterTotalWidth) + "px"))
    wrap.insertBefore(lineView.gutterBackground, lineView.text)
  }
  var markers = lineView.line.gutterMarkers
  if (cm.options.lineNumbers || markers) {
    var wrap$1 = ensureLineWrapped(lineView)
    var gutterWrap = lineView.gutter = elt("div", null, "CodeMirror-gutter-wrapper", ("left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px"))
    cm.display.input.setUneditable(gutterWrap)
    wrap$1.insertBefore(gutterWrap, lineView.text)
    if (lineView.line.gutterClass)
      { gutterWrap.className += " " + lineView.line.gutterClass }
    if (cm.options.lineNumbers && (!markers || !markers["CodeMirror-linenumbers"]))
      { lineView.lineNumber = gutterWrap.appendChild(
        elt("div", lineNumberFor(cm.options, lineN),
            "CodeMirror-linenumber CodeMirror-gutter-elt",
            ("left: " + (dims.gutterLeft["CodeMirror-linenumbers"]) + "px; width: " + (cm.display.lineNumInnerWidth) + "px"))) }
    if (markers) { for (var k = 0; k < cm.options.gutters.length; ++k) {
      var id = cm.options.gutters[k], found = markers.hasOwnProperty(id) && markers[id]
      if (found)
        { gutterWrap.appendChild(elt("div", [found], "CodeMirror-gutter-elt",
                                   ("left: " + (dims.gutterLeft[id]) + "px; width: " + (dims.gutterWidth[id]) + "px"))) }
    } }
  }
}

function updateLineWidgets(cm, lineView, dims) {
  if (lineView.alignable) { lineView.alignable = null }
  for (var node = lineView.node.firstChild, next = (void 0); node; node = next) {
    next = node.nextSibling
    if (node.className == "CodeMirror-linewidget")
      { lineView.node.removeChild(node) }
  }
  insertLineWidgets(cm, lineView, dims)
}

// Build a line's DOM representation from scratch
function buildLineElement(cm, lineView, lineN, dims) {
  var built = getLineContent(cm, lineView)
  lineView.text = lineView.node = built.pre
  if (built.bgClass) { lineView.bgClass = built.bgClass }
  if (built.textClass) { lineView.textClass = built.textClass }

  updateLineClasses(lineView)
  updateLineGutter(cm, lineView, lineN, dims)
  insertLineWidgets(cm, lineView, dims)
  return lineView.node
}

// A lineView may contain multiple logical lines (when merged by
// collapsed spans). The widgets for all of them need to be drawn.
function insertLineWidgets(cm, lineView, dims) {
  insertLineWidgetsFor(cm, lineView.line, lineView, dims, true)
  if (lineView.rest) { for (var i = 0; i < lineView.rest.length; i++)
    { insertLineWidgetsFor(cm, lineView.rest[i], lineView, dims, false) } }
}

function insertLineWidgetsFor(cm, line, lineView, dims, allowAbove) {
  if (!line.widgets) { return }
  var wrap = ensureLineWrapped(lineView)
  for (var i = 0, ws = line.widgets; i < ws.length; ++i) {
    var widget = ws[i], node = elt("div", [widget.node], "CodeMirror-linewidget")
    if (!widget.handleMouseEvents) { node.setAttribute("cm-ignore-events", "true") }
    positionLineWidget(widget, node, lineView, dims)
    cm.display.input.setUneditable(node)
    if (allowAbove && widget.above)
      { wrap.insertBefore(node, lineView.gutter || lineView.text) }
    else
      { wrap.appendChild(node) }
    signalLater(widget, "redraw")
  }
}

function positionLineWidget(widget, node, lineView, dims) {
  if (widget.noHScroll) {
    ;(lineView.alignable || (lineView.alignable = [])).push(node)
    var width = dims.wrapperWidth
    node.style.left = dims.fixedPos + "px"
    if (!widget.coverGutter) {
      width -= dims.gutterTotalWidth
      node.style.paddingLeft = dims.gutterTotalWidth + "px"
    }
    node.style.width = width + "px"
  }
  if (widget.coverGutter) {
    node.style.zIndex = 5
    node.style.position = "relative"
    if (!widget.noHScroll) { node.style.marginLeft = -dims.gutterTotalWidth + "px" }
  }
}

function widgetHeight(widget) {
  if (widget.height != null) { return widget.height }
  var cm = widget.doc.cm
  if (!cm) { return 0 }
  if (!contains(document.body, widget.node)) {
    var parentStyle = "position: relative;"
    if (widget.coverGutter)
      { parentStyle += "margin-left: -" + cm.display.gutters.offsetWidth + "px;" }
    if (widget.noHScroll)
      { parentStyle += "width: " + cm.display.wrapper.clientWidth + "px;" }
    removeChildrenAndAdd(cm.display.measure, elt("div", [widget.node], null, parentStyle))
  }
  return widget.height = widget.node.parentNode.offsetHeight
}

// Return true when the given mouse event happened in a widget
function eventInWidget(display, e) {
  for (var n = e_target(e); n != display.wrapper; n = n.parentNode) {
    if (!n || (n.nodeType == 1 && n.getAttribute("cm-ignore-events") == "true") ||
        (n.parentNode == display.sizer && n != display.mover))
      { return true }
  }
}

// POSITION MEASUREMENT

function paddingTop(display) {return display.lineSpace.offsetTop}
function paddingVert(display) {return display.mover.offsetHeight - display.lineSpace.offsetHeight}
function paddingH(display) {
  if (display.cachedPaddingH) { return display.cachedPaddingH }
  var e = removeChildrenAndAdd(display.measure, elt("pre", "x"))
  var style = window.getComputedStyle ? window.getComputedStyle(e) : e.currentStyle
  var data = {left: parseInt(style.paddingLeft), right: parseInt(style.paddingRight)}
  if (!isNaN(data.left) && !isNaN(data.right)) { display.cachedPaddingH = data }
  return data
}

function scrollGap(cm) { return scrollerGap - cm.display.nativeBarWidth }
function displayWidth(cm) {
  return cm.display.scroller.clientWidth - scrollGap(cm) - cm.display.barWidth
}
function displayHeight(cm) {
  return cm.display.scroller.clientHeight - scrollGap(cm) - cm.display.barHeight
}

// Ensure the lineView.wrapping.heights array is populated. This is
// an array of bottom offsets for the lines that make up a drawn
// line. When lineWrapping is on, there might be more than one
// height.
function ensureLineHeights(cm, lineView, rect) {
  var wrapping = cm.options.lineWrapping
  var curWidth = wrapping && displayWidth(cm)
  if (!lineView.measure.heights || wrapping && lineView.measure.width != curWidth) {
    var heights = lineView.measure.heights = []
    if (wrapping) {
      lineView.measure.width = curWidth
      var rects = lineView.text.firstChild.getClientRects()
      for (var i = 0; i < rects.length - 1; i++) {
        var cur = rects[i], next = rects[i + 1]
        if (Math.abs(cur.bottom - next.bottom) > 2)
          { heights.push((cur.bottom + next.top) / 2 - rect.top) }
      }
    }
    heights.push(rect.bottom - rect.top)
  }
}

// Find a line map (mapping character offsets to text nodes) and a
// measurement cache for the given line number. (A line view might
// contain multiple lines when collapsed ranges are present.)
function mapFromLineView(lineView, line, lineN) {
  if (lineView.line == line)
    { return {map: lineView.measure.map, cache: lineView.measure.cache} }
  for (var i = 0; i < lineView.rest.length; i++)
    { if (lineView.rest[i] == line)
      { return {map: lineView.measure.maps[i], cache: lineView.measure.caches[i]} } }
  for (var i$1 = 0; i$1 < lineView.rest.length; i$1++)
    { if (lineNo(lineView.rest[i$1]) > lineN)
      { return {map: lineView.measure.maps[i$1], cache: lineView.measure.caches[i$1], before: true} } }
}

// Render a line into the hidden node display.externalMeasured. Used
// when measurement is needed for a line that's not in the viewport.
function updateExternalMeasurement(cm, line) {
  line = visualLine(line)
  var lineN = lineNo(line)
  var view = cm.display.externalMeasured = new LineView(cm.doc, line, lineN)
  view.lineN = lineN
  var built = view.built = buildLineContent(cm, view)
  view.text = built.pre
  removeChildrenAndAdd(cm.display.lineMeasure, built.pre)
  return view
}

// Get a {top, bottom, left, right} box (in line-local coordinates)
// for a given character.
function measureChar(cm, line, ch, bias) {
  return measureCharPrepared(cm, prepareMeasureForLine(cm, line), ch, bias)
}

// Find a line view that corresponds to the given line number.
function findViewForLine(cm, lineN) {
  if (lineN >= cm.display.viewFrom && lineN < cm.display.viewTo)
    { return cm.display.view[findViewIndex(cm, lineN)] }
  var ext = cm.display.externalMeasured
  if (ext && lineN >= ext.lineN && lineN < ext.lineN + ext.size)
    { return ext }
}

// Measurement can be split in two steps, the set-up work that
// applies to the whole line, and the measurement of the actual
// character. Functions like coordsChar, that need to do a lot of
// measurements in a row, can thus ensure that the set-up work is
// only done once.
function prepareMeasureForLine(cm, line) {
  var lineN = lineNo(line)
  var view = findViewForLine(cm, lineN)
  if (view && !view.text) {
    view = null
  } else if (view && view.changes) {
    updateLineForChanges(cm, view, lineN, getDimensions(cm))
    cm.curOp.forceUpdate = true
  }
  if (!view)
    { view = updateExternalMeasurement(cm, line) }

  var info = mapFromLineView(view, line, lineN)
  return {
    line: line, view: view, rect: null,
    map: info.map, cache: info.cache, before: info.before,
    hasHeights: false
  }
}

// Given a prepared measurement object, measures the position of an
// actual character (or fetches it from the cache).
function measureCharPrepared(cm, prepared, ch, bias, varHeight) {
  if (prepared.before) { ch = -1 }
  var key = ch + (bias || ""), found
  if (prepared.cache.hasOwnProperty(key)) {
    found = prepared.cache[key]
  } else {
    if (!prepared.rect)
      { prepared.rect = prepared.view.text.getBoundingClientRect() }
    if (!prepared.hasHeights) {
      ensureLineHeights(cm, prepared.view, prepared.rect)
      prepared.hasHeights = true
    }
    found = measureCharInner(cm, prepared, ch, bias)
    if (!found.bogus) { prepared.cache[key] = found }
  }
  return {left: found.left, right: found.right,
          top: varHeight ? found.rtop : found.top,
          bottom: varHeight ? found.rbottom : found.bottom}
}

var nullRect = {left: 0, right: 0, top: 0, bottom: 0}

function nodeAndOffsetInLineMap(map, ch, bias) {
  var node, start, end, collapse, mStart, mEnd
  // First, search the line map for the text node corresponding to,
  // or closest to, the target character.
  for (var i = 0; i < map.length; i += 3) {
    mStart = map[i]
    mEnd = map[i + 1]
    if (ch < mStart) {
      start = 0; end = 1
      collapse = "left"
    } else if (ch < mEnd) {
      start = ch - mStart
      end = start + 1
    } else if (i == map.length - 3 || ch == mEnd && map[i + 3] > ch) {
      end = mEnd - mStart
      start = end - 1
      if (ch >= mEnd) { collapse = "right" }
    }
    if (start != null) {
      node = map[i + 2]
      if (mStart == mEnd && bias == (node.insertLeft ? "left" : "right"))
        { collapse = bias }
      if (bias == "left" && start == 0)
        { while (i && map[i - 2] == map[i - 3] && map[i - 1].insertLeft) {
          node = map[(i -= 3) + 2]
          collapse = "left"
        } }
      if (bias == "right" && start == mEnd - mStart)
        { while (i < map.length - 3 && map[i + 3] == map[i + 4] && !map[i + 5].insertLeft) {
          node = map[(i += 3) + 2]
          collapse = "right"
        } }
      break
    }
  }
  return {node: node, start: start, end: end, collapse: collapse, coverStart: mStart, coverEnd: mEnd}
}

function getUsefulRect(rects, bias) {
  var rect = nullRect
  if (bias == "left") { for (var i = 0; i < rects.length; i++) {
    if ((rect = rects[i]).left != rect.right) { break }
  } } else { for (var i$1 = rects.length - 1; i$1 >= 0; i$1--) {
    if ((rect = rects[i$1]).left != rect.right) { break }
  } }
  return rect
}

function measureCharInner(cm, prepared, ch, bias) {
  var place = nodeAndOffsetInLineMap(prepared.map, ch, bias)
  var node = place.node, start = place.start, end = place.end, collapse = place.collapse

  var rect
  if (node.nodeType == 3) { // If it is a text node, use a range to retrieve the coordinates.
    for (var i$1 = 0; i$1 < 4; i$1++) { // Retry a maximum of 4 times when nonsense rectangles are returned
      while (start && isExtendingChar(prepared.line.text.charAt(place.coverStart + start))) { --start }
      while (place.coverStart + end < place.coverEnd && isExtendingChar(prepared.line.text.charAt(place.coverStart + end))) { ++end }
      if (ie && ie_version < 9 && start == 0 && end == place.coverEnd - place.coverStart)
        { rect = node.parentNode.getBoundingClientRect() }
      else
        { rect = getUsefulRect(range(node, start, end).getClientRects(), bias) }
      if (rect.left || rect.right || start == 0) { break }
      end = start
      start = start - 1
      collapse = "right"
    }
    if (ie && ie_version < 11) { rect = maybeUpdateRectForZooming(cm.display.measure, rect) }
  } else { // If it is a widget, simply get the box for the whole widget.
    if (start > 0) { collapse = bias = "right" }
    var rects
    if (cm.options.lineWrapping && (rects = node.getClientRects()).length > 1)
      { rect = rects[bias == "right" ? rects.length - 1 : 0] }
    else
      { rect = node.getBoundingClientRect() }
  }
  if (ie && ie_version < 9 && !start && (!rect || !rect.left && !rect.right)) {
    var rSpan = node.parentNode.getClientRects()[0]
    if (rSpan)
      { rect = {left: rSpan.left, right: rSpan.left + charWidth(cm.display), top: rSpan.top, bottom: rSpan.bottom} }
    else
      { rect = nullRect }
  }

  var rtop = rect.top - prepared.rect.top, rbot = rect.bottom - prepared.rect.top
  var mid = (rtop + rbot) / 2
  var heights = prepared.view.measure.heights
  var i = 0
  for (; i < heights.length - 1; i++)
    { if (mid < heights[i]) { break } }
  var top = i ? heights[i - 1] : 0, bot = heights[i]
  var result = {left: (collapse == "right" ? rect.right : rect.left) - prepared.rect.left,
                right: (collapse == "left" ? rect.left : rect.right) - prepared.rect.left,
                top: top, bottom: bot}
  if (!rect.left && !rect.right) { result.bogus = true }
  if (!cm.options.singleCursorHeightPerLine) { result.rtop = rtop; result.rbottom = rbot }

  return result
}

// Work around problem with bounding client rects on ranges being
// returned incorrectly when zoomed on IE10 and below.
function maybeUpdateRectForZooming(measure, rect) {
  if (!window.screen || screen.logicalXDPI == null ||
      screen.logicalXDPI == screen.deviceXDPI || !hasBadZoomedRects(measure))
    { return rect }
  var scaleX = screen.logicalXDPI / screen.deviceXDPI
  var scaleY = screen.logicalYDPI / screen.deviceYDPI
  return {left: rect.left * scaleX, right: rect.right * scaleX,
          top: rect.top * scaleY, bottom: rect.bottom * scaleY}
}

function clearLineMeasurementCacheFor(lineView) {
  if (lineView.measure) {
    lineView.measure.cache = {}
    lineView.measure.heights = null
    if (lineView.rest) { for (var i = 0; i < lineView.rest.length; i++)
      { lineView.measure.caches[i] = {} } }
  }
}

function clearLineMeasurementCache(cm) {
  cm.display.externalMeasure = null
  removeChildren(cm.display.lineMeasure)
  for (var i = 0; i < cm.display.view.length; i++)
    { clearLineMeasurementCacheFor(cm.display.view[i]) }
}

function clearCaches(cm) {
  clearLineMeasurementCache(cm)
  cm.display.cachedCharWidth = cm.display.cachedTextHeight = cm.display.cachedPaddingH = null
  if (!cm.options.lineWrapping) { cm.display.maxLineChanged = true }
  cm.display.lineNumChars = null
}

function pageScrollX() { return window.pageXOffset || (document.documentElement || document.body).scrollLeft }
function pageScrollY() { return window.pageYOffset || (document.documentElement || document.body).scrollTop }

// Converts a {top, bottom, left, right} box from line-local
// coordinates into another coordinate system. Context may be one of
// "line", "div" (display.lineDiv), "local"./null (editor), "window",
// or "page".
function intoCoordSystem(cm, lineObj, rect, context, includeWidgets) {
  if (!includeWidgets && lineObj.widgets) { for (var i = 0; i < lineObj.widgets.length; ++i) { if (lineObj.widgets[i].above) {
    var size = widgetHeight(lineObj.widgets[i])
    rect.top += size; rect.bottom += size
  } } }
  if (context == "line") { return rect }
  if (!context) { context = "local" }
  var yOff = heightAtLine(lineObj)
  if (context == "local") { yOff += paddingTop(cm.display) }
  else { yOff -= cm.display.viewOffset }
  if (context == "page" || context == "window") {
    var lOff = cm.display.lineSpace.getBoundingClientRect()
    yOff += lOff.top + (context == "window" ? 0 : pageScrollY())
    var xOff = lOff.left + (context == "window" ? 0 : pageScrollX())
    rect.left += xOff; rect.right += xOff
  }
  rect.top += yOff; rect.bottom += yOff
  return rect
}

// Coverts a box from "div" coords to another coordinate system.
// Context may be "window", "page", "div", or "local"./null.
function fromCoordSystem(cm, coords, context) {
  if (context == "div") { return coords }
  var left = coords.left, top = coords.top
  // First move into "page" coordinate system
  if (context == "page") {
    left -= pageScrollX()
    top -= pageScrollY()
  } else if (context == "local" || !context) {
    var localBox = cm.display.sizer.getBoundingClientRect()
    left += localBox.left
    top += localBox.top
  }

  var lineSpaceBox = cm.display.lineSpace.getBoundingClientRect()
  return {left: left - lineSpaceBox.left, top: top - lineSpaceBox.top}
}

function charCoords(cm, pos, context, lineObj, bias) {
  if (!lineObj) { lineObj = getLine(cm.doc, pos.line) }
  return intoCoordSystem(cm, lineObj, measureChar(cm, lineObj, pos.ch, bias), context)
}

// Returns a box for a given cursor position, which may have an
// 'other' property containing the position of the secondary cursor
// on a bidi boundary.
function cursorCoords(cm, pos, context, lineObj, preparedMeasure, varHeight) {
  lineObj = lineObj || getLine(cm.doc, pos.line)
  if (!preparedMeasure) { preparedMeasure = prepareMeasureForLine(cm, lineObj) }
  function get(ch, right) {
    var m = measureCharPrepared(cm, preparedMeasure, ch, right ? "right" : "left", varHeight)
    if (right) { m.left = m.right; } else { m.right = m.left }
    return intoCoordSystem(cm, lineObj, m, context)
  }
  function getBidi(ch, partPos) {
    var part = order[partPos], right = part.level % 2
    if (ch == bidiLeft(part) && partPos && part.level < order[partPos - 1].level) {
      part = order[--partPos]
      ch = bidiRight(part) - (part.level % 2 ? 0 : 1)
      right = true
    } else if (ch == bidiRight(part) && partPos < order.length - 1 && part.level < order[partPos + 1].level) {
      part = order[++partPos]
      ch = bidiLeft(part) - part.level % 2
      right = false
    }
    if (right && ch == part.to && ch > part.from) { return get(ch - 1) }
    return get(ch, right)
  }
  var order = getOrder(lineObj), ch = pos.ch
  if (!order) { return get(ch) }
  var partPos = getBidiPartAt(order, ch)
  var val = getBidi(ch, partPos)
  if (bidiOther != null) { val.other = getBidi(ch, bidiOther) }
  return val
}

// Used to cheaply estimate the coordinates for a position. Used for
// intermediate scroll updates.
function estimateCoords(cm, pos) {
  var left = 0
  pos = clipPos(cm.doc, pos)
  if (!cm.options.lineWrapping) { left = charWidth(cm.display) * pos.ch }
  var lineObj = getLine(cm.doc, pos.line)
  var top = heightAtLine(lineObj) + paddingTop(cm.display)
  return {left: left, right: left, top: top, bottom: top + lineObj.height}
}

// Positions returned by coordsChar contain some extra information.
// xRel is the relative x position of the input coordinates compared
// to the found position (so xRel > 0 means the coordinates are to
// the right of the character position, for example). When outside
// is true, that means the coordinates lie outside the line's
// vertical range.
function PosWithInfo(line, ch, outside, xRel) {
  var pos = Pos(line, ch)
  pos.xRel = xRel
  if (outside) { pos.outside = true }
  return pos
}

// Compute the character position closest to the given coordinates.
// Input must be lineSpace-local ("div" coordinate system).
function coordsChar(cm, x, y) {
  var doc = cm.doc
  y += cm.display.viewOffset
  if (y < 0) { return PosWithInfo(doc.first, 0, true, -1) }
  var lineN = lineAtHeight(doc, y), last = doc.first + doc.size - 1
  if (lineN > last)
    { return PosWithInfo(doc.first + doc.size - 1, getLine(doc, last).text.length, true, 1) }
  if (x < 0) { x = 0 }

  var lineObj = getLine(doc, lineN)
  for (;;) {
    var found = coordsCharInner(cm, lineObj, lineN, x, y)
    var merged = collapsedSpanAtEnd(lineObj)
    var mergedPos = merged && merged.find(0, true)
    if (merged && (found.ch > mergedPos.from.ch || found.ch == mergedPos.from.ch && found.xRel > 0))
      { lineN = lineNo(lineObj = mergedPos.to.line) }
    else
      { return found }
  }
}

function coordsCharInner(cm, lineObj, lineNo, x, y) {
  var innerOff = y - heightAtLine(lineObj)
  var wrongLine = false, adjust = 2 * cm.display.wrapper.clientWidth
  var preparedMeasure = prepareMeasureForLine(cm, lineObj)

  function getX(ch) {
    var sp = cursorCoords(cm, Pos(lineNo, ch), "line", lineObj, preparedMeasure)
    wrongLine = true
    if (innerOff > sp.bottom) { return sp.left - adjust }
    else if (innerOff < sp.top) { return sp.left + adjust }
    else { wrongLine = false }
    return sp.left
  }

  var bidi = getOrder(lineObj), dist = lineObj.text.length
  var from = lineLeft(lineObj), to = lineRight(lineObj)
  var fromX = getX(from), fromOutside = wrongLine, toX = getX(to), toOutside = wrongLine

  if (x > toX) { return PosWithInfo(lineNo, to, toOutside, 1) }
  // Do a binary search between these bounds.
  for (;;) {
    if (bidi ? to == from || to == moveVisually(lineObj, from, 1) : to - from <= 1) {
      var ch = x < fromX || x - fromX <= toX - x ? from : to
      var outside = ch == from ? fromOutside : toOutside
      var xDiff = x - (ch == from ? fromX : toX)
      // This is a kludge to handle the case where the coordinates
      // are after a line-wrapped line. We should replace it with a
      // more general handling of cursor positions around line
      // breaks. (Issue #4078)
      if (toOutside && !bidi && !/\s/.test(lineObj.text.charAt(ch)) && xDiff > 0 &&
          ch < lineObj.text.length && preparedMeasure.view.measure.heights.length > 1) {
        var charSize = measureCharPrepared(cm, preparedMeasure, ch, "right")
        if (innerOff <= charSize.bottom && innerOff >= charSize.top && Math.abs(x - charSize.right) < xDiff) {
          outside = false
          ch++
          xDiff = x - charSize.right
        }
      }
      while (isExtendingChar(lineObj.text.charAt(ch))) { ++ch }
      var pos = PosWithInfo(lineNo, ch, outside, xDiff < -1 ? -1 : xDiff > 1 ? 1 : 0)
      return pos
    }
    var step = Math.ceil(dist / 2), middle = from + step
    if (bidi) {
      middle = from
      for (var i = 0; i < step; ++i) { middle = moveVisually(lineObj, middle, 1) }
    }
    var middleX = getX(middle)
    if (middleX > x) {to = middle; toX = middleX; if (toOutside = wrongLine) { toX += 1000; } dist = step}
    else {from = middle; fromX = middleX; fromOutside = wrongLine; dist -= step}
  }
}

var measureText
// Compute the default text height.
function textHeight(display) {
  if (display.cachedTextHeight != null) { return display.cachedTextHeight }
  if (measureText == null) {
    measureText = elt("pre")
    // Measure a bunch of lines, for browsers that compute
    // fractional heights.
    for (var i = 0; i < 49; ++i) {
      measureText.appendChild(document.createTextNode("x"))
      measureText.appendChild(elt("br"))
    }
    measureText.appendChild(document.createTextNode("x"))
  }
  removeChildrenAndAdd(display.measure, measureText)
  var height = measureText.offsetHeight / 50
  if (height > 3) { display.cachedTextHeight = height }
  removeChildren(display.measure)
  return height || 1
}

// Compute the default character width.
function charWidth(display) {
  if (display.cachedCharWidth != null) { return display.cachedCharWidth }
  var anchor = elt("span", "xxxxxxxxxx")
  var pre = elt("pre", [anchor])
  removeChildrenAndAdd(display.measure, pre)
  var rect = anchor.getBoundingClientRect(), width = (rect.right - rect.left) / 10
  if (width > 2) { display.cachedCharWidth = width }
  return width || 10
}

// Do a bulk-read of the DOM positions and sizes needed to draw the
// view, so that we don't interleave reading and writing to the DOM.
function getDimensions(cm) {
  var d = cm.display, left = {}, width = {}
  var gutterLeft = d.gutters.clientLeft
  for (var n = d.gutters.firstChild, i = 0; n; n = n.nextSibling, ++i) {
    left[cm.options.gutters[i]] = n.offsetLeft + n.clientLeft + gutterLeft
    width[cm.options.gutters[i]] = n.clientWidth
  }
  return {fixedPos: compensateForHScroll(d),
          gutterTotalWidth: d.gutters.offsetWidth,
          gutterLeft: left,
          gutterWidth: width,
          wrapperWidth: d.wrapper.clientWidth}
}

// Computes display.scroller.scrollLeft + display.gutters.offsetWidth,
// but using getBoundingClientRect to get a sub-pixel-accurate
// result.
function compensateForHScroll(display) {
  return display.scroller.getBoundingClientRect().left - display.sizer.getBoundingClientRect().left
}

// Returns a function that estimates the height of a line, to use as
// first approximation until the line becomes visible (and is thus
// properly measurable).
function estimateHeight(cm) {
  var th = textHeight(cm.display), wrapping = cm.options.lineWrapping
  var perLine = wrapping && Math.max(5, cm.display.scroller.clientWidth / charWidth(cm.display) - 3)
  return function (line) {
    if (lineIsHidden(cm.doc, line)) { return 0 }

    var widgetsHeight = 0
    if (line.widgets) { for (var i = 0; i < line.widgets.length; i++) {
      if (line.widgets[i].height) { widgetsHeight += line.widgets[i].height }
    } }

    if (wrapping)
      { return widgetsHeight + (Math.ceil(line.text.length / perLine) || 1) * th }
    else
      { return widgetsHeight + th }
  }
}

function estimateLineHeights(cm) {
  var doc = cm.doc, est = estimateHeight(cm)
  doc.iter(function (line) {
    var estHeight = est(line)
    if (estHeight != line.height) { updateLineHeight(line, estHeight) }
  })
}

// Given a mouse event, find the corresponding position. If liberal
// is false, it checks whether a gutter or scrollbar was clicked,
// and returns null if it was. forRect is used by rectangular
// selections, and tries to estimate a character position even for
// coordinates beyond the right of the text.
function posFromMouse(cm, e, liberal, forRect) {
  var display = cm.display
  if (!liberal && e_target(e).getAttribute("cm-not-content") == "true") { return null }

  var x, y, space = display.lineSpace.getBoundingClientRect()
  // Fails unpredictably on IE[67] when mouse is dragged around quickly.
  try { x = e.clientX - space.left; y = e.clientY - space.top }
  catch (e) { return null }
  var coords = coordsChar(cm, x, y), line
  if (forRect && coords.xRel == 1 && (line = getLine(cm.doc, coords.line).text).length == coords.ch) {
    var colDiff = countColumn(line, line.length, cm.options.tabSize) - line.length
    coords = Pos(coords.line, Math.max(0, Math.round((x - paddingH(cm.display).left) / charWidth(cm.display)) - colDiff))
  }
  return coords
}

// Find the view element corresponding to a given line. Return null
// when the line isn't visible.
function findViewIndex(cm, n) {
  if (n >= cm.display.viewTo) { return null }
  n -= cm.display.viewFrom
  if (n < 0) { return null }
  var view = cm.display.view
  for (var i = 0; i < view.length; i++) {
    n -= view[i].size
    if (n < 0) { return i }
  }
}

function updateSelection(cm) {
  cm.display.input.showSelection(cm.display.input.prepareSelection())
}

function prepareSelection(cm, primary) {
  var doc = cm.doc, result = {}
  var curFragment = result.cursors = document.createDocumentFragment()
  var selFragment = result.selection = document.createDocumentFragment()

  for (var i = 0; i < doc.sel.ranges.length; i++) {
    if (primary === false && i == doc.sel.primIndex) { continue }
    var range = doc.sel.ranges[i]
    if (range.from().line >= cm.display.viewTo || range.to().line < cm.display.viewFrom) { continue }
    var collapsed = range.empty()
    if (collapsed || cm.options.showCursorWhenSelecting)
      { drawSelectionCursor(cm, range.head, curFragment) }
    if (!collapsed)
      { drawSelectionRange(cm, range, selFragment) }
  }
  return result
}

// Draws a cursor for the given range
function drawSelectionCursor(cm, head, output) {
  var pos = cursorCoords(cm, head, "div", null, null, !cm.options.singleCursorHeightPerLine)

  var cursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor"))
  cursor.style.left = pos.left + "px"
  cursor.style.top = pos.top + "px"
  cursor.style.height = Math.max(0, pos.bottom - pos.top) * cm.options.cursorHeight + "px"

  if (pos.other) {
    // Secondary cursor, shown when on a 'jump' in bi-directional text
    var otherCursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor CodeMirror-secondarycursor"))
    otherCursor.style.display = ""
    otherCursor.style.left = pos.other.left + "px"
    otherCursor.style.top = pos.other.top + "px"
    otherCursor.style.height = (pos.other.bottom - pos.other.top) * .85 + "px"
  }
}

// Draws the given range as a highlighted selection
function drawSelectionRange(cm, range, output) {
  var display = cm.display, doc = cm.doc
  var fragment = document.createDocumentFragment()
  var padding = paddingH(cm.display), leftSide = padding.left
  var rightSide = Math.max(display.sizerWidth, displayWidth(cm) - display.sizer.offsetLeft) - padding.right

  function add(left, top, width, bottom) {
    if (top < 0) { top = 0 }
    top = Math.round(top)
    bottom = Math.round(bottom)
    fragment.appendChild(elt("div", null, "CodeMirror-selected", ("position: absolute; left: " + left + "px;\n                             top: " + top + "px; width: " + (width == null ? rightSide - left : width) + "px;\n                             height: " + (bottom - top) + "px")))
  }

  function drawForLine(line, fromArg, toArg) {
    var lineObj = getLine(doc, line)
    var lineLen = lineObj.text.length
    var start, end
    function coords(ch, bias) {
      return charCoords(cm, Pos(line, ch), "div", lineObj, bias)
    }

    iterateBidiSections(getOrder(lineObj), fromArg || 0, toArg == null ? lineLen : toArg, function (from, to, dir) {
      var leftPos = coords(from, "left"), rightPos, left, right
      if (from == to) {
        rightPos = leftPos
        left = right = leftPos.left
      } else {
        rightPos = coords(to - 1, "right")
        if (dir == "rtl") { var tmp = leftPos; leftPos = rightPos; rightPos = tmp }
        left = leftPos.left
        right = rightPos.right
      }
      if (fromArg == null && from == 0) { left = leftSide }
      if (rightPos.top - leftPos.top > 3) { // Different lines, draw top part
        add(left, leftPos.top, null, leftPos.bottom)
        left = leftSide
        if (leftPos.bottom < rightPos.top) { add(left, leftPos.bottom, null, rightPos.top) }
      }
      if (toArg == null && to == lineLen) { right = rightSide }
      if (!start || leftPos.top < start.top || leftPos.top == start.top && leftPos.left < start.left)
        { start = leftPos }
      if (!end || rightPos.bottom > end.bottom || rightPos.bottom == end.bottom && rightPos.right > end.right)
        { end = rightPos }
      if (left < leftSide + 1) { left = leftSide }
      add(left, rightPos.top, right - left, rightPos.bottom)
    })
    return {start: start, end: end}
  }

  var sFrom = range.from(), sTo = range.to()
  if (sFrom.line == sTo.line) {
    drawForLine(sFrom.line, sFrom.ch, sTo.ch)
  } else {
    var fromLine = getLine(doc, sFrom.line), toLine = getLine(doc, sTo.line)
    var singleVLine = visualLine(fromLine) == visualLine(toLine)
    var leftEnd = drawForLine(sFrom.line, sFrom.ch, singleVLine ? fromLine.text.length + 1 : null).end
    var rightStart = drawForLine(sTo.line, singleVLine ? 0 : null, sTo.ch).start
    if (singleVLine) {
      if (leftEnd.top < rightStart.top - 2) {
        add(leftEnd.right, leftEnd.top, null, leftEnd.bottom)
        add(leftSide, rightStart.top, rightStart.left, rightStart.bottom)
      } else {
        add(leftEnd.right, leftEnd.top, rightStart.left - leftEnd.right, leftEnd.bottom)
      }
    }
    if (leftEnd.bottom < rightStart.top)
      { add(leftSide, leftEnd.bottom, null, rightStart.top) }
  }

  output.appendChild(fragment)
}

// Cursor-blinking
function restartBlink(cm) {
  if (!cm.state.focused) { return }
  var display = cm.display
  clearInterval(display.blinker)
  var on = true
  display.cursorDiv.style.visibility = ""
  if (cm.options.cursorBlinkRate > 0)
    { display.blinker = setInterval(function () { return display.cursorDiv.style.visibility = (on = !on) ? "" : "hidden"; },
      cm.options.cursorBlinkRate) }
  else if (cm.options.cursorBlinkRate < 0)
    { display.cursorDiv.style.visibility = "hidden" }
}

function ensureFocus(cm) {
  if (!cm.state.focused) { cm.display.input.focus(); onFocus(cm) }
}

function delayBlurEvent(cm) {
  cm.state.delayingBlurEvent = true
  setTimeout(function () { if (cm.state.delayingBlurEvent) {
    cm.state.delayingBlurEvent = false
    onBlur(cm)
  } }, 100)
}

function onFocus(cm, e) {
  if (cm.state.delayingBlurEvent) { cm.state.delayingBlurEvent = false }

  if (cm.options.readOnly == "nocursor") { return }
  if (!cm.state.focused) {
    signal(cm, "focus", cm, e)
    cm.state.focused = true
    addClass(cm.display.wrapper, "CodeMirror-focused")
    // This test prevents this from firing when a context
    // menu is closed (since the input reset would kill the
    // select-all detection hack)
    if (!cm.curOp && cm.display.selForContextMenu != cm.doc.sel) {
      cm.display.input.reset()
      if (webkit) { setTimeout(function () { return cm.display.input.reset(true); }, 20) } // Issue #1730
    }
    cm.display.input.receivedFocus()
  }
  restartBlink(cm)
}
function onBlur(cm, e) {
  if (cm.state.delayingBlurEvent) { return }

  if (cm.state.focused) {
    signal(cm, "blur", cm, e)
    cm.state.focused = false
    rmClass(cm.display.wrapper, "CodeMirror-focused")
  }
  clearInterval(cm.display.blinker)
  setTimeout(function () { if (!cm.state.focused) { cm.display.shift = false } }, 150)
}

// Re-align line numbers and gutter marks to compensate for
// horizontal scrolling.
function alignHorizontally(cm) {
  var display = cm.display, view = display.view
  if (!display.alignWidgets && (!display.gutters.firstChild || !cm.options.fixedGutter)) { return }
  var comp = compensateForHScroll(display) - display.scroller.scrollLeft + cm.doc.scrollLeft
  var gutterW = display.gutters.offsetWidth, left = comp + "px"
  for (var i = 0; i < view.length; i++) { if (!view[i].hidden) {
    if (cm.options.fixedGutter) {
      if (view[i].gutter)
        { view[i].gutter.style.left = left }
      if (view[i].gutterBackground)
        { view[i].gutterBackground.style.left = left }
    }
    var align = view[i].alignable
    if (align) { for (var j = 0; j < align.length; j++)
      { align[j].style.left = left } }
  } }
  if (cm.options.fixedGutter)
    { display.gutters.style.left = (comp + gutterW) + "px" }
}

// Used to ensure that the line number gutter is still the right
// size for the current document size. Returns true when an update
// is needed.
function maybeUpdateLineNumberWidth(cm) {
  if (!cm.options.lineNumbers) { return false }
  var doc = cm.doc, last = lineNumberFor(cm.options, doc.first + doc.size - 1), display = cm.display
  if (last.length != display.lineNumChars) {
    var test = display.measure.appendChild(elt("div", [elt("div", last)],
                                               "CodeMirror-linenumber CodeMirror-gutter-elt"))
    var innerW = test.firstChild.offsetWidth, padding = test.offsetWidth - innerW
    display.lineGutter.style.width = ""
    display.lineNumInnerWidth = Math.max(innerW, display.lineGutter.offsetWidth - padding) + 1
    display.lineNumWidth = display.lineNumInnerWidth + padding
    display.lineNumChars = display.lineNumInnerWidth ? last.length : -1
    display.lineGutter.style.width = display.lineNumWidth + "px"
    updateGutterSpace(cm)
    return true
  }
  return false
}

// Read the actual heights of the rendered lines, and update their
// stored heights to match.
function updateHeightsInViewport(cm) {
  var display = cm.display
  var prevBottom = display.lineDiv.offsetTop
  for (var i = 0; i < display.view.length; i++) {
    var cur = display.view[i], height = (void 0)
    if (cur.hidden) { continue }
    if (ie && ie_version < 8) {
      var bot = cur.node.offsetTop + cur.node.offsetHeight
      height = bot - prevBottom
      prevBottom = bot
    } else {
      var box = cur.node.getBoundingClientRect()
      height = box.bottom - box.top
    }
    var diff = cur.line.height - height
    if (height < 2) { height = textHeight(display) }
    if (diff > .001 || diff < -.001) {
      updateLineHeight(cur.line, height)
      updateWidgetHeight(cur.line)
      if (cur.rest) { for (var j = 0; j < cur.rest.length; j++)
        { updateWidgetHeight(cur.rest[j]) } }
    }
  }
}

// Read and store the height of line widgets associated with the
// given line.
function updateWidgetHeight(line) {
  if (line.widgets) { for (var i = 0; i < line.widgets.length; ++i)
    { line.widgets[i].height = line.widgets[i].node.parentNode.offsetHeight } }
}

// Compute the lines that are visible in a given viewport (defaults
// the the current scroll position). viewport may contain top,
// height, and ensure (see op.scrollToPos) properties.
function visibleLines(display, doc, viewport) {
  var top = viewport && viewport.top != null ? Math.max(0, viewport.top) : display.scroller.scrollTop
  top = Math.floor(top - paddingTop(display))
  var bottom = viewport && viewport.bottom != null ? viewport.bottom : top + display.wrapper.clientHeight

  var from = lineAtHeight(doc, top), to = lineAtHeight(doc, bottom)
  // Ensure is a {from: {line, ch}, to: {line, ch}} object, and
  // forces those lines into the viewport (if possible).
  if (viewport && viewport.ensure) {
    var ensureFrom = viewport.ensure.from.line, ensureTo = viewport.ensure.to.line
    if (ensureFrom < from) {
      from = ensureFrom
      to = lineAtHeight(doc, heightAtLine(getLine(doc, ensureFrom)) + display.wrapper.clientHeight)
    } else if (Math.min(ensureTo, doc.lastLine()) >= to) {
      from = lineAtHeight(doc, heightAtLine(getLine(doc, ensureTo)) - display.wrapper.clientHeight)
      to = ensureTo
    }
  }
  return {from: from, to: Math.max(to, from + 1)}
}

// Sync the scrollable area and scrollbars, ensure the viewport
// covers the visible area.
function setScrollTop(cm, val) {
  if (Math.abs(cm.doc.scrollTop - val) < 2) { return }
  cm.doc.scrollTop = val
  if (!gecko) { updateDisplaySimple(cm, {top: val}) }
  if (cm.display.scroller.scrollTop != val) { cm.display.scroller.scrollTop = val }
  cm.display.scrollbars.setScrollTop(val)
  if (gecko) { updateDisplaySimple(cm) }
  startWorker(cm, 100)
}
// Sync scroller and scrollbar, ensure the gutter elements are
// aligned.
function setScrollLeft(cm, val, isScroller) {
  if (isScroller ? val == cm.doc.scrollLeft : Math.abs(cm.doc.scrollLeft - val) < 2) { return }
  val = Math.min(val, cm.display.scroller.scrollWidth - cm.display.scroller.clientWidth)
  cm.doc.scrollLeft = val
  alignHorizontally(cm)
  if (cm.display.scroller.scrollLeft != val) { cm.display.scroller.scrollLeft = val }
  cm.display.scrollbars.setScrollLeft(val)
}

// Since the delta values reported on mouse wheel events are
// unstandardized between browsers and even browser versions, and
// generally horribly unpredictable, this code starts by measuring
// the scroll effect that the first few mouse wheel events have,
// and, from that, detects the way it can convert deltas to pixel
// offsets afterwards.
//
// The reason we want to know the amount a wheel event will scroll
// is that it gives us a chance to update the display before the
// actual scrolling happens, reducing flickering.

var wheelSamples = 0;
var wheelPixelsPerUnit = null;
// Fill in a browser-detected starting value on browsers where we
// know one. These don't have to be accurate -- the result of them
// being wrong would just be a slight flicker on the first wheel
// scroll (if it is large enough).
if (ie) { wheelPixelsPerUnit = -.53 }
else if (gecko) { wheelPixelsPerUnit = 15 }
else if (chrome) { wheelPixelsPerUnit = -.7 }
else if (safari) { wheelPixelsPerUnit = -1/3 }

function wheelEventDelta(e) {
  var dx = e.wheelDeltaX, dy = e.wheelDeltaY
  if (dx == null && e.detail && e.axis == e.HORIZONTAL_AXIS) { dx = e.detail }
  if (dy == null && e.detail && e.axis == e.VERTICAL_AXIS) { dy = e.detail }
  else if (dy == null) { dy = e.wheelDelta }
  return {x: dx, y: dy}
}
function wheelEventPixels(e) {
  var delta = wheelEventDelta(e)
  delta.x *= wheelPixelsPerUnit
  delta.y *= wheelPixelsPerUnit
  return delta
}

function onScrollWheel(cm, e) {
  var delta = wheelEventDelta(e), dx = delta.x, dy = delta.y

  var display = cm.display, scroll = display.scroller
  // Quit if there's nothing to scroll here
  var canScrollX = scroll.scrollWidth > scroll.clientWidth
  var canScrollY = scroll.scrollHeight > scroll.clientHeight
  if (!(dx && canScrollX || dy && canScrollY)) { return }

  // Webkit browsers on OS X abort momentum scrolls when the target
  // of the scroll event is removed from the scrollable element.
  // This hack (see related code in patchDisplay) makes sure the
  // element is kept around.
  if (dy && mac && webkit) {
    outer: for (var cur = e.target, view = display.view; cur != scroll; cur = cur.parentNode) {
      for (var i = 0; i < view.length; i++) {
        if (view[i].node == cur) {
          cm.display.currentWheelTarget = cur
          break outer
        }
      }
    }
  }

  // On some browsers, horizontal scrolling will cause redraws to
  // happen before the gutter has been realigned, causing it to
  // wriggle around in a most unseemly way. When we have an
  // estimated pixels/delta value, we just handle horizontal
  // scrolling entirely here. It'll be slightly off from native, but
  // better than glitching out.
  if (dx && !gecko && !presto && wheelPixelsPerUnit != null) {
    if (dy && canScrollY)
      { setScrollTop(cm, Math.max(0, Math.min(scroll.scrollTop + dy * wheelPixelsPerUnit, scroll.scrollHeight - scroll.clientHeight))) }
    setScrollLeft(cm, Math.max(0, Math.min(scroll.scrollLeft + dx * wheelPixelsPerUnit, scroll.scrollWidth - scroll.clientWidth)))
    // Only prevent default scrolling if vertical scrolling is
    // actually possible. Otherwise, it causes vertical scroll
    // jitter on OSX trackpads when deltaX is small and deltaY
    // is large (issue #3579)
    if (!dy || (dy && canScrollY))
      { e_preventDefault(e) }
    display.wheelStartX = null // Abort measurement, if in progress
    return
  }

  // 'Project' the visible viewport to cover the area that is being
  // scrolled into view (if we know enough to estimate it).
  if (dy && wheelPixelsPerUnit != null) {
    var pixels = dy * wheelPixelsPerUnit
    var top = cm.doc.scrollTop, bot = top + display.wrapper.clientHeight
    if (pixels < 0) { top = Math.max(0, top + pixels - 50) }
    else { bot = Math.min(cm.doc.height, bot + pixels + 50) }
    updateDisplaySimple(cm, {top: top, bottom: bot})
  }

  if (wheelSamples < 20) {
    if (display.wheelStartX == null) {
      display.wheelStartX = scroll.scrollLeft; display.wheelStartY = scroll.scrollTop
      display.wheelDX = dx; display.wheelDY = dy
      setTimeout(function () {
        if (display.wheelStartX == null) { return }
        var movedX = scroll.scrollLeft - display.wheelStartX
        var movedY = scroll.scrollTop - display.wheelStartY
        var sample = (movedY && display.wheelDY && movedY / display.wheelDY) ||
          (movedX && display.wheelDX && movedX / display.wheelDX)
        display.wheelStartX = display.wheelStartY = null
        if (!sample) { return }
        wheelPixelsPerUnit = (wheelPixelsPerUnit * wheelSamples + sample) / (wheelSamples + 1)
        ++wheelSamples
      }, 200)
    } else {
      display.wheelDX += dx; display.wheelDY += dy
    }
  }
}

// SCROLLBARS

// Prepare DOM reads needed to update the scrollbars. Done in one
// shot to minimize update/measure roundtrips.
function measureForScrollbars(cm) {
  var d = cm.display, gutterW = d.gutters.offsetWidth
  var docH = Math.round(cm.doc.height + paddingVert(cm.display))
  return {
    clientHeight: d.scroller.clientHeight,
    viewHeight: d.wrapper.clientHeight,
    scrollWidth: d.scroller.scrollWidth, clientWidth: d.scroller.clientWidth,
    viewWidth: d.wrapper.clientWidth,
    barLeft: cm.options.fixedGutter ? gutterW : 0,
    docHeight: docH,
    scrollHeight: docH + scrollGap(cm) + d.barHeight,
    nativeBarWidth: d.nativeBarWidth,
    gutterWidth: gutterW
  }
}

var NativeScrollbars = function(place, scroll, cm) {
  this.cm = cm
  var vert = this.vert = elt("div", [elt("div", null, null, "min-width: 1px")], "CodeMirror-vscrollbar")
  var horiz = this.horiz = elt("div", [elt("div", null, null, "height: 100%; min-height: 1px")], "CodeMirror-hscrollbar")
  place(vert); place(horiz)

  on(vert, "scroll", function () {
    if (vert.clientHeight) { scroll(vert.scrollTop, "vertical") }
  })
  on(horiz, "scroll", function () {
    if (horiz.clientWidth) { scroll(horiz.scrollLeft, "horizontal") }
  })

  this.checkedZeroWidth = false
  // Need to set a minimum width to see the scrollbar on IE7 (but must not set it on IE8).
  if (ie && ie_version < 8) { this.horiz.style.minHeight = this.vert.style.minWidth = "18px" }
};

NativeScrollbars.prototype.update = function (measure) {
  var needsH = measure.scrollWidth > measure.clientWidth + 1
  var needsV = measure.scrollHeight > measure.clientHeight + 1
  var sWidth = measure.nativeBarWidth

  if (needsV) {
    this.vert.style.display = "block"
    this.vert.style.bottom = needsH ? sWidth + "px" : "0"
    var totalHeight = measure.viewHeight - (needsH ? sWidth : 0)
    // A bug in IE8 can cause this value to be negative, so guard it.
    this.vert.firstChild.style.height =
      Math.max(0, measure.scrollHeight - measure.clientHeight + totalHeight) + "px"
  } else {
    this.vert.style.display = ""
    this.vert.firstChild.style.height = "0"
  }

  if (needsH) {
    this.horiz.style.display = "block"
    this.horiz.style.right = needsV ? sWidth + "px" : "0"
    this.horiz.style.left = measure.barLeft + "px"
    var totalWidth = measure.viewWidth - measure.barLeft - (needsV ? sWidth : 0)
    this.horiz.firstChild.style.width =
      (measure.scrollWidth - measure.clientWidth + totalWidth) + "px"
  } else {
    this.horiz.style.display = ""
    this.horiz.firstChild.style.width = "0"
  }

  if (!this.checkedZeroWidth && measure.clientHeight > 0) {
    if (sWidth == 0) { this.zeroWidthHack() }
    this.checkedZeroWidth = true
  }

  return {right: needsV ? sWidth : 0, bottom: needsH ? sWidth : 0}
};

NativeScrollbars.prototype.setScrollLeft = function (pos) {
  if (this.horiz.scrollLeft != pos) { this.horiz.scrollLeft = pos }
  if (this.disableHoriz) { this.enableZeroWidthBar(this.horiz, this.disableHoriz) }
};

NativeScrollbars.prototype.setScrollTop = function (pos) {
  if (this.vert.scrollTop != pos) { this.vert.scrollTop = pos }
  if (this.disableVert) { this.enableZeroWidthBar(this.vert, this.disableVert) }
};

NativeScrollbars.prototype.zeroWidthHack = function () {
  var w = mac && !mac_geMountainLion ? "12px" : "18px"
  this.horiz.style.height = this.vert.style.width = w
  this.horiz.style.pointerEvents = this.vert.style.pointerEvents = "none"
  this.disableHoriz = new Delayed
  this.disableVert = new Delayed
};

NativeScrollbars.prototype.enableZeroWidthBar = function (bar, delay) {
  bar.style.pointerEvents = "auto"
  function maybeDisable() {
    // To find out whether the scrollbar is still visible, we
    // check whether the element under the pixel in the bottom
    // left corner of the scrollbar box is the scrollbar box
    // itself (when the bar is still visible) or its filler child
    // (when the bar is hidden). If it is still visible, we keep
    // it enabled, if it's hidden, we disable pointer events.
    var box = bar.getBoundingClientRect()
    var elt = document.elementFromPoint(box.left + 1, box.bottom - 1)
    if (elt != bar) { bar.style.pointerEvents = "none" }
    else { delay.set(1000, maybeDisable) }
  }
  delay.set(1000, maybeDisable)
};

NativeScrollbars.prototype.clear = function () {
  var parent = this.horiz.parentNode
  parent.removeChild(this.horiz)
  parent.removeChild(this.vert)
};

var NullScrollbars = function () {};

NullScrollbars.prototype.update = function () { return {bottom: 0, right: 0} };
NullScrollbars.prototype.setScrollLeft = function () {};
NullScrollbars.prototype.setScrollTop = function () {};
NullScrollbars.prototype.clear = function () {};

function updateScrollbars(cm, measure) {
  if (!measure) { measure = measureForScrollbars(cm) }
  var startWidth = cm.display.barWidth, startHeight = cm.display.barHeight
  updateScrollbarsInner(cm, measure)
  for (var i = 0; i < 4 && startWidth != cm.display.barWidth || startHeight != cm.display.barHeight; i++) {
    if (startWidth != cm.display.barWidth && cm.options.lineWrapping)
      { updateHeightsInViewport(cm) }
    updateScrollbarsInner(cm, measureForScrollbars(cm))
    startWidth = cm.display.barWidth; startHeight = cm.display.barHeight
  }
}

// Re-synchronize the fake scrollbars with the actual size of the
// content.
function updateScrollbarsInner(cm, measure) {
  var d = cm.display
  var sizes = d.scrollbars.update(measure)

  d.sizer.style.paddingRight = (d.barWidth = sizes.right) + "px"
  d.sizer.style.paddingBottom = (d.barHeight = sizes.bottom) + "px"
  d.heightForcer.style.borderBottom = sizes.bottom + "px solid transparent"

  if (sizes.right && sizes.bottom) {
    d.scrollbarFiller.style.display = "block"
    d.scrollbarFiller.style.height = sizes.bottom + "px"
    d.scrollbarFiller.style.width = sizes.right + "px"
  } else { d.scrollbarFiller.style.display = "" }
  if (sizes.bottom && cm.options.coverGutterNextToScrollbar && cm.options.fixedGutter) {
    d.gutterFiller.style.display = "block"
    d.gutterFiller.style.height = sizes.bottom + "px"
    d.gutterFiller.style.width = measure.gutterWidth + "px"
  } else { d.gutterFiller.style.display = "" }
}

var scrollbarModel = {"native": NativeScrollbars, "null": NullScrollbars}

function initScrollbars(cm) {
  if (cm.display.scrollbars) {
    cm.display.scrollbars.clear()
    if (cm.display.scrollbars.addClass)
      { rmClass(cm.display.wrapper, cm.display.scrollbars.addClass) }
  }

  cm.display.scrollbars = new scrollbarModel[cm.options.scrollbarStyle](function (node) {
    cm.display.wrapper.insertBefore(node, cm.display.scrollbarFiller)
    // Prevent clicks in the scrollbars from killing focus
    on(node, "mousedown", function () {
      if (cm.state.focused) { setTimeout(function () { return cm.display.input.focus(); }, 0) }
    })
    node.setAttribute("cm-not-content", "true")
  }, function (pos, axis) {
    if (axis == "horizontal") { setScrollLeft(cm, pos) }
    else { setScrollTop(cm, pos) }
  }, cm)
  if (cm.display.scrollbars.addClass)
    { addClass(cm.display.wrapper, cm.display.scrollbars.addClass) }
}

// SCROLLING THINGS INTO VIEW

// If an editor sits on the top or bottom of the window, partially
// scrolled out of view, this ensures that the cursor is visible.
function maybeScrollWindow(cm, coords) {
  if (signalDOMEvent(cm, "scrollCursorIntoView")) { return }

  var display = cm.display, box = display.sizer.getBoundingClientRect(), doScroll = null
  if (coords.top + box.top < 0) { doScroll = true }
  else if (coords.bottom + box.top > (window.innerHeight || document.documentElement.clientHeight)) { doScroll = false }
  if (doScroll != null && !phantom) {
    var scrollNode = elt("div", "\u200b", null, ("position: absolute;\n                         top: " + (coords.top - display.viewOffset - paddingTop(cm.display)) + "px;\n                         height: " + (coords.bottom - coords.top + scrollGap(cm) + display.barHeight) + "px;\n                         left: " + (coords.left) + "px; width: 2px;"))
    cm.display.lineSpace.appendChild(scrollNode)
    scrollNode.scrollIntoView(doScroll)
    cm.display.lineSpace.removeChild(scrollNode)
  }
}

// Scroll a given position into view (immediately), verifying that
// it actually became visible (as line heights are accurately
// measured, the position of something may 'drift' during drawing).
function scrollPosIntoView(cm, pos, end, margin) {
  if (margin == null) { margin = 0 }
  var coords
  for (var limit = 0; limit < 5; limit++) {
    var changed = false
    coords = cursorCoords(cm, pos)
    var endCoords = !end || end == pos ? coords : cursorCoords(cm, end)
    var scrollPos = calculateScrollPos(cm, Math.min(coords.left, endCoords.left),
                                       Math.min(coords.top, endCoords.top) - margin,
                                       Math.max(coords.left, endCoords.left),
                                       Math.max(coords.bottom, endCoords.bottom) + margin)
    var startTop = cm.doc.scrollTop, startLeft = cm.doc.scrollLeft
    if (scrollPos.scrollTop != null) {
      setScrollTop(cm, scrollPos.scrollTop)
      if (Math.abs(cm.doc.scrollTop - startTop) > 1) { changed = true }
    }
    if (scrollPos.scrollLeft != null) {
      setScrollLeft(cm, scrollPos.scrollLeft)
      if (Math.abs(cm.doc.scrollLeft - startLeft) > 1) { changed = true }
    }
    if (!changed) { break }
  }
  return coords
}

// Scroll a given set of coordinates into view (immediately).
function scrollIntoView(cm, x1, y1, x2, y2) {
  var scrollPos = calculateScrollPos(cm, x1, y1, x2, y2)
  if (scrollPos.scrollTop != null) { setScrollTop(cm, scrollPos.scrollTop) }
  if (scrollPos.scrollLeft != null) { setScrollLeft(cm, scrollPos.scrollLeft) }
}

// Calculate a new scroll position needed to scroll the given
// rectangle into view. Returns an object with scrollTop and
// scrollLeft properties. When these are undefined, the
// vertical/horizontal position does not need to be adjusted.
function calculateScrollPos(cm, x1, y1, x2, y2) {
  var display = cm.display, snapMargin = textHeight(cm.display)
  if (y1 < 0) { y1 = 0 }
  var screentop = cm.curOp && cm.curOp.scrollTop != null ? cm.curOp.scrollTop : display.scroller.scrollTop
  var screen = displayHeight(cm), result = {}
  if (y2 - y1 > screen) { y2 = y1 + screen }
  var docBottom = cm.doc.height + paddingVert(display)
  var atTop = y1 < snapMargin, atBottom = y2 > docBottom - snapMargin
  if (y1 < screentop) {
    result.scrollTop = atTop ? 0 : y1
  } else if (y2 > screentop + screen) {
    var newTop = Math.min(y1, (atBottom ? docBottom : y2) - screen)
    if (newTop != screentop) { result.scrollTop = newTop }
  }

  var screenleft = cm.curOp && cm.curOp.scrollLeft != null ? cm.curOp.scrollLeft : display.scroller.scrollLeft
  var screenw = displayWidth(cm) - (cm.options.fixedGutter ? display.gutters.offsetWidth : 0)
  var tooWide = x2 - x1 > screenw
  if (tooWide) { x2 = x1 + screenw }
  if (x1 < 10)
    { result.scrollLeft = 0 }
  else if (x1 < screenleft)
    { result.scrollLeft = Math.max(0, x1 - (tooWide ? 0 : 10)) }
  else if (x2 > screenw + screenleft - 3)
    { result.scrollLeft = x2 + (tooWide ? 0 : 10) - screenw }
  return result
}

// Store a relative adjustment to the scroll position in the current
// operation (to be applied when the operation finishes).
function addToScrollPos(cm, left, top) {
  if (left != null || top != null) { resolveScrollToPos(cm) }
  if (left != null)
    { cm.curOp.scrollLeft = (cm.curOp.scrollLeft == null ? cm.doc.scrollLeft : cm.curOp.scrollLeft) + left }
  if (top != null)
    { cm.curOp.scrollTop = (cm.curOp.scrollTop == null ? cm.doc.scrollTop : cm.curOp.scrollTop) + top }
}

// Make sure that at the end of the operation the current cursor is
// shown.
function ensureCursorVisible(cm) {
  resolveScrollToPos(cm)
  var cur = cm.getCursor(), from = cur, to = cur
  if (!cm.options.lineWrapping) {
    from = cur.ch ? Pos(cur.line, cur.ch - 1) : cur
    to = Pos(cur.line, cur.ch + 1)
  }
  cm.curOp.scrollToPos = {from: from, to: to, margin: cm.options.cursorScrollMargin, isCursor: true}
}

// When an operation has its scrollToPos property set, and another
// scroll action is applied before the end of the operation, this
// 'simulates' scrolling that position into view in a cheap way, so
// that the effect of intermediate scroll commands is not ignored.
function resolveScrollToPos(cm) {
  var range = cm.curOp.scrollToPos
  if (range) {
    cm.curOp.scrollToPos = null
    var from = estimateCoords(cm, range.from), to = estimateCoords(cm, range.to)
    var sPos = calculateScrollPos(cm, Math.min(from.left, to.left),
                                  Math.min(from.top, to.top) - range.margin,
                                  Math.max(from.right, to.right),
                                  Math.max(from.bottom, to.bottom) + range.margin)
    cm.scrollTo(sPos.scrollLeft, sPos.scrollTop)
  }
}

// Operations are used to wrap a series of changes to the editor
// state in such a way that each change won't have to update the
// cursor and display (which would be awkward, slow, and
// error-prone). Instead, display updates are batched and then all
// combined and executed at once.

var nextOpId = 0
// Start a new operation.
function startOperation(cm) {
  cm.curOp = {
    cm: cm,
    viewChanged: false,      // Flag that indicates that lines might need to be redrawn
    startHeight: cm.doc.height, // Used to detect need to update scrollbar
    forceUpdate: false,      // Used to force a redraw
    updateInput: null,       // Whether to reset the input textarea
    typing: false,           // Whether this reset should be careful to leave existing text (for compositing)
    changeObjs: null,        // Accumulated changes, for firing change events
    cursorActivityHandlers: null, // Set of handlers to fire cursorActivity on
    cursorActivityCalled: 0, // Tracks which cursorActivity handlers have been called already
    selectionChanged: false, // Whether the selection needs to be redrawn
    updateMaxLine: false,    // Set when the widest line needs to be determined anew
    scrollLeft: null, scrollTop: null, // Intermediate scroll position, not pushed to DOM yet
    scrollToPos: null,       // Used to scroll to a specific position
    focus: false,
    id: ++nextOpId           // Unique ID
  }
  pushOperation(cm.curOp)
}

// Finish an operation, updating the display and signalling delayed events
function endOperation(cm) {
  var op = cm.curOp
  finishOperation(op, function (group) {
    for (var i = 0; i < group.ops.length; i++)
      { group.ops[i].cm.curOp = null }
    endOperations(group)
  })
}

// The DOM updates done when an operation finishes are batched so
// that the minimum number of relayouts are required.
function endOperations(group) {
  var ops = group.ops
  for (var i = 0; i < ops.length; i++) // Read DOM
    { endOperation_R1(ops[i]) }
  for (var i$1 = 0; i$1 < ops.length; i$1++) // Write DOM (maybe)
    { endOperation_W1(ops[i$1]) }
  for (var i$2 = 0; i$2 < ops.length; i$2++) // Read DOM
    { endOperation_R2(ops[i$2]) }
  for (var i$3 = 0; i$3 < ops.length; i$3++) // Write DOM (maybe)
    { endOperation_W2(ops[i$3]) }
  for (var i$4 = 0; i$4 < ops.length; i$4++) // Read DOM
    { endOperation_finish(ops[i$4]) }
}

function endOperation_R1(op) {
  var cm = op.cm, display = cm.display
  maybeClipScrollbars(cm)
  if (op.updateMaxLine) { findMaxLine(cm) }

  op.mustUpdate = op.viewChanged || op.forceUpdate || op.scrollTop != null ||
    op.scrollToPos && (op.scrollToPos.from.line < display.viewFrom ||
                       op.scrollToPos.to.line >= display.viewTo) ||
    display.maxLineChanged && cm.options.lineWrapping
  op.update = op.mustUpdate &&
    new DisplayUpdate(cm, op.mustUpdate && {top: op.scrollTop, ensure: op.scrollToPos}, op.forceUpdate)
}

function endOperation_W1(op) {
  op.updatedDisplay = op.mustUpdate && updateDisplayIfNeeded(op.cm, op.update)
}

function endOperation_R2(op) {
  var cm = op.cm, display = cm.display
  if (op.updatedDisplay) { updateHeightsInViewport(cm) }

  op.barMeasure = measureForScrollbars(cm)

  // If the max line changed since it was last measured, measure it,
  // and ensure the document's width matches it.
  // updateDisplay_W2 will use these properties to do the actual resizing
  if (display.maxLineChanged && !cm.options.lineWrapping) {
    op.adjustWidthTo = measureChar(cm, display.maxLine, display.maxLine.text.length).left + 3
    cm.display.sizerWidth = op.adjustWidthTo
    op.barMeasure.scrollWidth =
      Math.max(display.scroller.clientWidth, display.sizer.offsetLeft + op.adjustWidthTo + scrollGap(cm) + cm.display.barWidth)
    op.maxScrollLeft = Math.max(0, display.sizer.offsetLeft + op.adjustWidthTo - displayWidth(cm))
  }

  if (op.updatedDisplay || op.selectionChanged)
    { op.preparedSelection = display.input.prepareSelection(op.focus) }
}

function endOperation_W2(op) {
  var cm = op.cm

  if (op.adjustWidthTo != null) {
    cm.display.sizer.style.minWidth = op.adjustWidthTo + "px"
    if (op.maxScrollLeft < cm.doc.scrollLeft)
      { setScrollLeft(cm, Math.min(cm.display.scroller.scrollLeft, op.maxScrollLeft), true) }
    cm.display.maxLineChanged = false
  }

  var takeFocus = op.focus && op.focus == activeElt() && (!document.hasFocus || document.hasFocus())
  if (op.preparedSelection)
    { cm.display.input.showSelection(op.preparedSelection, takeFocus) }
  if (op.updatedDisplay || op.startHeight != cm.doc.height)
    { updateScrollbars(cm, op.barMeasure) }
  if (op.updatedDisplay)
    { setDocumentHeight(cm, op.barMeasure) }

  if (op.selectionChanged) { restartBlink(cm) }

  if (cm.state.focused && op.updateInput)
    { cm.display.input.reset(op.typing) }
  if (takeFocus) { ensureFocus(op.cm) }
}

function endOperation_finish(op) {
  var cm = op.cm, display = cm.display, doc = cm.doc

  if (op.updatedDisplay) { postUpdateDisplay(cm, op.update) }

  // Abort mouse wheel delta measurement, when scrolling explicitly
  if (display.wheelStartX != null && (op.scrollTop != null || op.scrollLeft != null || op.scrollToPos))
    { display.wheelStartX = display.wheelStartY = null }

  // Propagate the scroll position to the actual DOM scroller
  if (op.scrollTop != null && (display.scroller.scrollTop != op.scrollTop || op.forceScroll)) {
    doc.scrollTop = Math.max(0, Math.min(display.scroller.scrollHeight - display.scroller.clientHeight, op.scrollTop))
    display.scrollbars.setScrollTop(doc.scrollTop)
    display.scroller.scrollTop = doc.scrollTop
  }
  if (op.scrollLeft != null && (display.scroller.scrollLeft != op.scrollLeft || op.forceScroll)) {
    doc.scrollLeft = Math.max(0, Math.min(display.scroller.scrollWidth - display.scroller.clientWidth, op.scrollLeft))
    display.scrollbars.setScrollLeft(doc.scrollLeft)
    display.scroller.scrollLeft = doc.scrollLeft
    alignHorizontally(cm)
  }
  // If we need to scroll a specific position into view, do so.
  if (op.scrollToPos) {
    var coords = scrollPosIntoView(cm, clipPos(doc, op.scrollToPos.from),
                                   clipPos(doc, op.scrollToPos.to), op.scrollToPos.margin)
    if (op.scrollToPos.isCursor && cm.state.focused) { maybeScrollWindow(cm, coords) }
  }

  // Fire events for markers that are hidden/unidden by editing or
  // undoing
  var hidden = op.maybeHiddenMarkers, unhidden = op.maybeUnhiddenMarkers
  if (hidden) { for (var i = 0; i < hidden.length; ++i)
    { if (!hidden[i].lines.length) { signal(hidden[i], "hide") } } }
  if (unhidden) { for (var i$1 = 0; i$1 < unhidden.length; ++i$1)
    { if (unhidden[i$1].lines.length) { signal(unhidden[i$1], "unhide") } } }

  if (display.wrapper.offsetHeight)
    { doc.scrollTop = cm.display.scroller.scrollTop }

  // Fire change events, and delayed event handlers
  if (op.changeObjs)
    { signal(cm, "changes", cm, op.changeObjs) }
  if (op.update)
    { op.update.finish() }
}

// Run the given function in an operation
function runInOp(cm, f) {
  if (cm.curOp) { return f() }
  startOperation(cm)
  try { return f() }
  finally { endOperation(cm) }
}
// Wraps a function in an operation. Returns the wrapped function.
function operation(cm, f) {
  return function() {
    if (cm.curOp) { return f.apply(cm, arguments) }
    startOperation(cm)
    try { return f.apply(cm, arguments) }
    finally { endOperation(cm) }
  }
}
// Used to add methods to editor and doc instances, wrapping them in
// operations.
function methodOp(f) {
  return function() {
    if (this.curOp) { return f.apply(this, arguments) }
    startOperation(this)
    try { return f.apply(this, arguments) }
    finally { endOperation(this) }
  }
}
function docMethodOp(f) {
  return function() {
    var cm = this.cm
    if (!cm || cm.curOp) { return f.apply(this, arguments) }
    startOperation(cm)
    try { return f.apply(this, arguments) }
    finally { endOperation(cm) }
  }
}

// Updates the display.view data structure for a given change to the
// document. From and to are in pre-change coordinates. Lendiff is
// the amount of lines added or subtracted by the change. This is
// used for changes that span multiple lines, or change the way
// lines are divided into visual lines. regLineChange (below)
// registers single-line changes.
function regChange(cm, from, to, lendiff) {
  if (from == null) { from = cm.doc.first }
  if (to == null) { to = cm.doc.first + cm.doc.size }
  if (!lendiff) { lendiff = 0 }

  var display = cm.display
  if (lendiff && to < display.viewTo &&
      (display.updateLineNumbers == null || display.updateLineNumbers > from))
    { display.updateLineNumbers = from }

  cm.curOp.viewChanged = true

  if (from >= display.viewTo) { // Change after
    if (sawCollapsedSpans && visualLineNo(cm.doc, from) < display.viewTo)
      { resetView(cm) }
  } else if (to <= display.viewFrom) { // Change before
    if (sawCollapsedSpans && visualLineEndNo(cm.doc, to + lendiff) > display.viewFrom) {
      resetView(cm)
    } else {
      display.viewFrom += lendiff
      display.viewTo += lendiff
    }
  } else if (from <= display.viewFrom && to >= display.viewTo) { // Full overlap
    resetView(cm)
  } else if (from <= display.viewFrom) { // Top overlap
    var cut = viewCuttingPoint(cm, to, to + lendiff, 1)
    if (cut) {
      display.view = display.view.slice(cut.index)
      display.viewFrom = cut.lineN
      display.viewTo += lendiff
    } else {
      resetView(cm)
    }
  } else if (to >= display.viewTo) { // Bottom overlap
    var cut$1 = viewCuttingPoint(cm, from, from, -1)
    if (cut$1) {
      display.view = display.view.slice(0, cut$1.index)
      display.viewTo = cut$1.lineN
    } else {
      resetView(cm)
    }
  } else { // Gap in the middle
    var cutTop = viewCuttingPoint(cm, from, from, -1)
    var cutBot = viewCuttingPoint(cm, to, to + lendiff, 1)
    if (cutTop && cutBot) {
      display.view = display.view.slice(0, cutTop.index)
        .concat(buildViewArray(cm, cutTop.lineN, cutBot.lineN))
        .concat(display.view.slice(cutBot.index))
      display.viewTo += lendiff
    } else {
      resetView(cm)
    }
  }

  var ext = display.externalMeasured
  if (ext) {
    if (to < ext.lineN)
      { ext.lineN += lendiff }
    else if (from < ext.lineN + ext.size)
      { display.externalMeasured = null }
  }
}

// Register a change to a single line. Type must be one of "text",
// "gutter", "class", "widget"
function regLineChange(cm, line, type) {
  cm.curOp.viewChanged = true
  var display = cm.display, ext = cm.display.externalMeasured
  if (ext && line >= ext.lineN && line < ext.lineN + ext.size)
    { display.externalMeasured = null }

  if (line < display.viewFrom || line >= display.viewTo) { return }
  var lineView = display.view[findViewIndex(cm, line)]
  if (lineView.node == null) { return }
  var arr = lineView.changes || (lineView.changes = [])
  if (indexOf(arr, type) == -1) { arr.push(type) }
}

// Clear the view.
function resetView(cm) {
  cm.display.viewFrom = cm.display.viewTo = cm.doc.first
  cm.display.view = []
  cm.display.viewOffset = 0
}

function viewCuttingPoint(cm, oldN, newN, dir) {
  var index = findViewIndex(cm, oldN), diff, view = cm.display.view
  if (!sawCollapsedSpans || newN == cm.doc.first + cm.doc.size)
    { return {index: index, lineN: newN} }
  var n = cm.display.viewFrom
  for (var i = 0; i < index; i++)
    { n += view[i].size }
  if (n != oldN) {
    if (dir > 0) {
      if (index == view.length - 1) { return null }
      diff = (n + view[index].size) - oldN
      index++
    } else {
      diff = n - oldN
    }
    oldN += diff; newN += diff
  }
  while (visualLineNo(cm.doc, newN) != newN) {
    if (index == (dir < 0 ? 0 : view.length - 1)) { return null }
    newN += dir * view[index - (dir < 0 ? 1 : 0)].size
    index += dir
  }
  return {index: index, lineN: newN}
}

// Force the view to cover a given range, adding empty view element
// or clipping off existing ones as needed.
function adjustView(cm, from, to) {
  var display = cm.display, view = display.view
  if (view.length == 0 || from >= display.viewTo || to <= display.viewFrom) {
    display.view = buildViewArray(cm, from, to)
    display.viewFrom = from
  } else {
    if (display.viewFrom > from)
      { display.view = buildViewArray(cm, from, display.viewFrom).concat(display.view) }
    else if (display.viewFrom < from)
      { display.view = display.view.slice(findViewIndex(cm, from)) }
    display.viewFrom = from
    if (display.viewTo < to)
      { display.view = display.view.concat(buildViewArray(cm, display.viewTo, to)) }
    else if (display.viewTo > to)
      { display.view = display.view.slice(0, findViewIndex(cm, to)) }
  }
  display.viewTo = to
}

// Count the number of lines in the view whose DOM representation is
// out of date (or nonexistent).
function countDirtyView(cm) {
  var view = cm.display.view, dirty = 0
  for (var i = 0; i < view.length; i++) {
    var lineView = view[i]
    if (!lineView.hidden && (!lineView.node || lineView.changes)) { ++dirty }
  }
  return dirty
}

// HIGHLIGHT WORKER

function startWorker(cm, time) {
  if (cm.doc.mode.startState && cm.doc.frontier < cm.display.viewTo)
    { cm.state.highlight.set(time, bind(highlightWorker, cm)) }
}

function highlightWorker(cm) {
  var doc = cm.doc
  if (doc.frontier < doc.first) { doc.frontier = doc.first }
  if (doc.frontier >= cm.display.viewTo) { return }
  var end = +new Date + cm.options.workTime
  var state = copyState(doc.mode, getStateBefore(cm, doc.frontier))
  var changedLines = []

  doc.iter(doc.frontier, Math.min(doc.first + doc.size, cm.display.viewTo + 500), function (line) {
    if (doc.frontier >= cm.display.viewFrom) { // Visible
      var oldStyles = line.styles, tooLong = line.text.length > cm.options.maxHighlightLength
      var highlighted = highlightLine(cm, line, tooLong ? copyState(doc.mode, state) : state, true)
      line.styles = highlighted.styles
      var oldCls = line.styleClasses, newCls = highlighted.classes
      if (newCls) { line.styleClasses = newCls }
      else if (oldCls) { line.styleClasses = null }
      var ischange = !oldStyles || oldStyles.length != line.styles.length ||
        oldCls != newCls && (!oldCls || !newCls || oldCls.bgClass != newCls.bgClass || oldCls.textClass != newCls.textClass)
      for (var i = 0; !ischange && i < oldStyles.length; ++i) { ischange = oldStyles[i] != line.styles[i] }
      if (ischange) { changedLines.push(doc.frontier) }
      line.stateAfter = tooLong ? state : copyState(doc.mode, state)
    } else {
      if (line.text.length <= cm.options.maxHighlightLength)
        { processLine(cm, line.text, state) }
      line.stateAfter = doc.frontier % 5 == 0 ? copyState(doc.mode, state) : null
    }
    ++doc.frontier
    if (+new Date > end) {
      startWorker(cm, cm.options.workDelay)
      return true
    }
  })
  if (changedLines.length) { runInOp(cm, function () {
    for (var i = 0; i < changedLines.length; i++)
      { regLineChange(cm, changedLines[i], "text") }
  }) }
}

// DISPLAY DRAWING

var DisplayUpdate = function(cm, viewport, force) {
  var display = cm.display

  this.viewport = viewport
  // Store some values that we'll need later (but don't want to force a relayout for)
  this.visible = visibleLines(display, cm.doc, viewport)
  this.editorIsHidden = !display.wrapper.offsetWidth
  this.wrapperHeight = display.wrapper.clientHeight
  this.wrapperWidth = display.wrapper.clientWidth
  this.oldDisplayWidth = displayWidth(cm)
  this.force = force
  this.dims = getDimensions(cm)
  this.events = []
};

DisplayUpdate.prototype.signal = function (emitter, type) {
  if (hasHandler(emitter, type))
    { this.events.push(arguments) }
};
DisplayUpdate.prototype.finish = function () {
    var this$1 = this;

  for (var i = 0; i < this.events.length; i++)
    { signal.apply(null, this$1.events[i]) }
};

function maybeClipScrollbars(cm) {
  var display = cm.display
  if (!display.scrollbarsClipped && display.scroller.offsetWidth) {
    display.nativeBarWidth = display.scroller.offsetWidth - display.scroller.clientWidth
    display.heightForcer.style.height = scrollGap(cm) + "px"
    display.sizer.style.marginBottom = -display.nativeBarWidth + "px"
    display.sizer.style.borderRightWidth = scrollGap(cm) + "px"
    display.scrollbarsClipped = true
  }
}

// Does the actual updating of the line display. Bails out
// (returning false) when there is nothing to be done and forced is
// false.
function updateDisplayIfNeeded(cm, update) {
  var display = cm.display, doc = cm.doc

  if (update.editorIsHidden) {
    resetView(cm)
    return false
  }

  // Bail out if the visible area is already rendered and nothing changed.
  if (!update.force &&
      update.visible.from >= display.viewFrom && update.visible.to <= display.viewTo &&
      (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo) &&
      display.renderedView == display.view && countDirtyView(cm) == 0)
    { return false }

  if (maybeUpdateLineNumberWidth(cm)) {
    resetView(cm)
    update.dims = getDimensions(cm)
  }

  // Compute a suitable new viewport (from & to)
  var end = doc.first + doc.size
  var from = Math.max(update.visible.from - cm.options.viewportMargin, doc.first)
  var to = Math.min(end, update.visible.to + cm.options.viewportMargin)
  if (display.viewFrom < from && from - display.viewFrom < 20) { from = Math.max(doc.first, display.viewFrom) }
  if (display.viewTo > to && display.viewTo - to < 20) { to = Math.min(end, display.viewTo) }
  if (sawCollapsedSpans) {
    from = visualLineNo(cm.doc, from)
    to = visualLineEndNo(cm.doc, to)
  }

  var different = from != display.viewFrom || to != display.viewTo ||
    display.lastWrapHeight != update.wrapperHeight || display.lastWrapWidth != update.wrapperWidth
  adjustView(cm, from, to)

  display.viewOffset = heightAtLine(getLine(cm.doc, display.viewFrom))
  // Position the mover div to align with the current scroll position
  cm.display.mover.style.top = display.viewOffset + "px"

  var toUpdate = countDirtyView(cm)
  if (!different && toUpdate == 0 && !update.force && display.renderedView == display.view &&
      (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo))
    { return false }

  // For big changes, we hide the enclosing element during the
  // update, since that speeds up the operations on most browsers.
  var focused = activeElt()
  if (toUpdate > 4) { display.lineDiv.style.display = "none" }
  patchDisplay(cm, display.updateLineNumbers, update.dims)
  if (toUpdate > 4) { display.lineDiv.style.display = "" }
  display.renderedView = display.view
  // There might have been a widget with a focused element that got
  // hidden or updated, if so re-focus it.
  if (focused && activeElt() != focused && focused.offsetHeight) { focused.focus() }

  // Prevent selection and cursors from interfering with the scroll
  // width and height.
  removeChildren(display.cursorDiv)
  removeChildren(display.selectionDiv)
  display.gutters.style.height = display.sizer.style.minHeight = 0

  if (different) {
    display.lastWrapHeight = update.wrapperHeight
    display.lastWrapWidth = update.wrapperWidth
    startWorker(cm, 400)
  }

  display.updateLineNumbers = null

  return true
}

function postUpdateDisplay(cm, update) {
  var viewport = update.viewport

  for (var first = true;; first = false) {
    if (!first || !cm.options.lineWrapping || update.oldDisplayWidth == displayWidth(cm)) {
      // Clip forced viewport to actual scrollable area.
      if (viewport && viewport.top != null)
        { viewport = {top: Math.min(cm.doc.height + paddingVert(cm.display) - displayHeight(cm), viewport.top)} }
      // Updated line heights might result in the drawn area not
      // actually covering the viewport. Keep looping until it does.
      update.visible = visibleLines(cm.display, cm.doc, viewport)
      if (update.visible.from >= cm.display.viewFrom && update.visible.to <= cm.display.viewTo)
        { break }
    }
    if (!updateDisplayIfNeeded(cm, update)) { break }
    updateHeightsInViewport(cm)
    var barMeasure = measureForScrollbars(cm)
    updateSelection(cm)
    updateScrollbars(cm, barMeasure)
    setDocumentHeight(cm, barMeasure)
  }

  update.signal(cm, "update", cm)
  if (cm.display.viewFrom != cm.display.reportedViewFrom || cm.display.viewTo != cm.display.reportedViewTo) {
    update.signal(cm, "viewportChange", cm, cm.display.viewFrom, cm.display.viewTo)
    cm.display.reportedViewFrom = cm.display.viewFrom; cm.display.reportedViewTo = cm.display.viewTo
  }
}

function updateDisplaySimple(cm, viewport) {
  var update = new DisplayUpdate(cm, viewport)
  if (updateDisplayIfNeeded(cm, update)) {
    updateHeightsInViewport(cm)
    postUpdateDisplay(cm, update)
    var barMeasure = measureForScrollbars(cm)
    updateSelection(cm)
    updateScrollbars(cm, barMeasure)
    setDocumentHeight(cm, barMeasure)
    update.finish()
  }
}

// Sync the actual display DOM structure with display.view, removing
// nodes for lines that are no longer in view, and creating the ones
// that are not there yet, and updating the ones that are out of
// date.
function patchDisplay(cm, updateNumbersFrom, dims) {
  var display = cm.display, lineNumbers = cm.options.lineNumbers
  var container = display.lineDiv, cur = container.firstChild

  function rm(node) {
    var next = node.nextSibling
    // Works around a throw-scroll bug in OS X Webkit
    if (webkit && mac && cm.display.currentWheelTarget == node)
      { node.style.display = "none" }
    else
      { node.parentNode.removeChild(node) }
    return next
  }

  var view = display.view, lineN = display.viewFrom
  // Loop over the elements in the view, syncing cur (the DOM nodes
  // in display.lineDiv) with the view as we go.
  for (var i = 0; i < view.length; i++) {
    var lineView = view[i]
    if (lineView.hidden) {
    } else if (!lineView.node || lineView.node.parentNode != container) { // Not drawn yet
      var node = buildLineElement(cm, lineView, lineN, dims)
      container.insertBefore(node, cur)
    } else { // Already drawn
      while (cur != lineView.node) { cur = rm(cur) }
      var updateNumber = lineNumbers && updateNumbersFrom != null &&
        updateNumbersFrom <= lineN && lineView.lineNumber
      if (lineView.changes) {
        if (indexOf(lineView.changes, "gutter") > -1) { updateNumber = false }
        updateLineForChanges(cm, lineView, lineN, dims)
      }
      if (updateNumber) {
        removeChildren(lineView.lineNumber)
        lineView.lineNumber.appendChild(document.createTextNode(lineNumberFor(cm.options, lineN)))
      }
      cur = lineView.node.nextSibling
    }
    lineN += lineView.size
  }
  while (cur) { cur = rm(cur) }
}

function updateGutterSpace(cm) {
  var width = cm.display.gutters.offsetWidth
  cm.display.sizer.style.marginLeft = width + "px"
}

function setDocumentHeight(cm, measure) {
  cm.display.sizer.style.minHeight = measure.docHeight + "px"
  cm.display.heightForcer.style.top = measure.docHeight + "px"
  cm.display.gutters.style.height = (measure.docHeight + cm.display.barHeight + scrollGap(cm)) + "px"
}

// Rebuild the gutter elements, ensure the margin to the left of the
// code matches their width.
function updateGutters(cm) {
  var gutters = cm.display.gutters, specs = cm.options.gutters
  removeChildren(gutters)
  var i = 0
  for (; i < specs.length; ++i) {
    var gutterClass = specs[i]
    var gElt = gutters.appendChild(elt("div", null, "CodeMirror-gutter " + gutterClass))
    if (gutterClass == "CodeMirror-linenumbers") {
      cm.display.lineGutter = gElt
      gElt.style.width = (cm.display.lineNumWidth || 1) + "px"
    }
  }
  gutters.style.display = i ? "" : "none"
  updateGutterSpace(cm)
}

// Make sure the gutters options contains the element
// "CodeMirror-linenumbers" when the lineNumbers option is true.
function setGuttersForLineNumbers(options) {
  var found = indexOf(options.gutters, "CodeMirror-linenumbers")
  if (found == -1 && options.lineNumbers) {
    options.gutters = options.gutters.concat(["CodeMirror-linenumbers"])
  } else if (found > -1 && !options.lineNumbers) {
    options.gutters = options.gutters.slice(0)
    options.gutters.splice(found, 1)
  }
}

// Selection objects are immutable. A new one is created every time
// the selection changes. A selection is one or more non-overlapping
// (and non-touching) ranges, sorted, and an integer that indicates
// which one is the primary selection (the one that's scrolled into
// view, that getCursor returns, etc).
function Selection(ranges, primIndex) {
  this.ranges = ranges
  this.primIndex = primIndex
}

Selection.prototype = {
  primary: function() { return this.ranges[this.primIndex] },
  equals: function(other) {
    var this$1 = this;

    if (other == this) { return true }
    if (other.primIndex != this.primIndex || other.ranges.length != this.ranges.length) { return false }
    for (var i = 0; i < this.ranges.length; i++) {
      var here = this$1.ranges[i], there = other.ranges[i]
      if (cmp(here.anchor, there.anchor) != 0 || cmp(here.head, there.head) != 0) { return false }
    }
    return true
  },
  deepCopy: function() {
    var this$1 = this;

    var out = []
    for (var i = 0; i < this.ranges.length; i++)
      { out[i] = new Range(copyPos(this$1.ranges[i].anchor), copyPos(this$1.ranges[i].head)) }
    return new Selection(out, this.primIndex)
  },
  somethingSelected: function() {
    var this$1 = this;

    for (var i = 0; i < this.ranges.length; i++)
      { if (!this$1.ranges[i].empty()) { return true } }
    return false
  },
  contains: function(pos, end) {
    var this$1 = this;

    if (!end) { end = pos }
    for (var i = 0; i < this.ranges.length; i++) {
      var range = this$1.ranges[i]
      if (cmp(end, range.from()) >= 0 && cmp(pos, range.to()) <= 0)
        { return i }
    }
    return -1
  }
}

function Range(anchor, head) {
  this.anchor = anchor; this.head = head
}

Range.prototype = {
  from: function() { return minPos(this.anchor, this.head) },
  to: function() { return maxPos(this.anchor, this.head) },
  empty: function() {
    return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch
  }
}

// Take an unsorted, potentially overlapping set of ranges, and
// build a selection out of it. 'Consumes' ranges array (modifying
// it).
function normalizeSelection(ranges, primIndex) {
  var prim = ranges[primIndex]
  ranges.sort(function (a, b) { return cmp(a.from(), b.from()); })
  primIndex = indexOf(ranges, prim)
  for (var i = 1; i < ranges.length; i++) {
    var cur = ranges[i], prev = ranges[i - 1]
    if (cmp(prev.to(), cur.from()) >= 0) {
      var from = minPos(prev.from(), cur.from()), to = maxPos(prev.to(), cur.to())
      var inv = prev.empty() ? cur.from() == cur.head : prev.from() == prev.head
      if (i <= primIndex) { --primIndex }
      ranges.splice(--i, 2, new Range(inv ? to : from, inv ? from : to))
    }
  }
  return new Selection(ranges, primIndex)
}

function simpleSelection(anchor, head) {
  return new Selection([new Range(anchor, head || anchor)], 0)
}

// Compute the position of the end of a change (its 'to' property
// refers to the pre-change end).
function changeEnd(change) {
  if (!change.text) { return change.to }
  return Pos(change.from.line + change.text.length - 1,
             lst(change.text).length + (change.text.length == 1 ? change.from.ch : 0))
}

// Adjust a position to refer to the post-change position of the
// same text, or the end of the change if the change covers it.
function adjustForChange(pos, change) {
  if (cmp(pos, change.from) < 0) { return pos }
  if (cmp(pos, change.to) <= 0) { return changeEnd(change) }

  var line = pos.line + change.text.length - (change.to.line - change.from.line) - 1, ch = pos.ch
  if (pos.line == change.to.line) { ch += changeEnd(change).ch - change.to.ch }
  return Pos(line, ch)
}

function computeSelAfterChange(doc, change) {
  var out = []
  for (var i = 0; i < doc.sel.ranges.length; i++) {
    var range = doc.sel.ranges[i]
    out.push(new Range(adjustForChange(range.anchor, change),
                       adjustForChange(range.head, change)))
  }
  return normalizeSelection(out, doc.sel.primIndex)
}

function offsetPos(pos, old, nw) {
  if (pos.line == old.line)
    { return Pos(nw.line, pos.ch - old.ch + nw.ch) }
  else
    { return Pos(nw.line + (pos.line - old.line), pos.ch) }
}

// Used by replaceSelections to allow moving the selection to the
// start or around the replaced test. Hint may be "start" or "around".
function computeReplacedSel(doc, changes, hint) {
  var out = []
  var oldPrev = Pos(doc.first, 0), newPrev = oldPrev
  for (var i = 0; i < changes.length; i++) {
    var change = changes[i]
    var from = offsetPos(change.from, oldPrev, newPrev)
    var to = offsetPos(changeEnd(change), oldPrev, newPrev)
    oldPrev = change.to
    newPrev = to
    if (hint == "around") {
      var range = doc.sel.ranges[i], inv = cmp(range.head, range.anchor) < 0
      out[i] = new Range(inv ? to : from, inv ? from : to)
    } else {
      out[i] = new Range(from, from)
    }
  }
  return new Selection(out, doc.sel.primIndex)
}

// Used to get the editor into a consistent state again when options change.

function loadMode(cm) {
  cm.doc.mode = getMode(cm.options, cm.doc.modeOption)
  resetModeState(cm)
}

function resetModeState(cm) {
  cm.doc.iter(function (line) {
    if (line.stateAfter) { line.stateAfter = null }
    if (line.styles) { line.styles = null }
  })
  cm.doc.frontier = cm.doc.first
  startWorker(cm, 100)
  cm.state.modeGen++
  if (cm.curOp) { regChange(cm) }
}

// DOCUMENT DATA STRUCTURE

// By default, updates that start and end at the beginning of a line
// are treated specially, in order to make the association of line
// widgets and marker elements with the text behave more intuitive.
function isWholeLineUpdate(doc, change) {
  return change.from.ch == 0 && change.to.ch == 0 && lst(change.text) == "" &&
    (!doc.cm || doc.cm.options.wholeLineUpdateBefore)
}

// Perform a change on the document data structure.
function updateDoc(doc, change, markedSpans, estimateHeight) {
  function spansFor(n) {return markedSpans ? markedSpans[n] : null}
  function update(line, text, spans) {
    updateLine(line, text, spans, estimateHeight)
    signalLater(line, "change", line, change)
  }
  function linesFor(start, end) {
    var result = []
    for (var i = start; i < end; ++i)
      { result.push(new Line(text[i], spansFor(i), estimateHeight)) }
    return result
  }

  var from = change.from, to = change.to, text = change.text
  var firstLine = getLine(doc, from.line), lastLine = getLine(doc, to.line)
  var lastText = lst(text), lastSpans = spansFor(text.length - 1), nlines = to.line - from.line

  // Adjust the line structure
  if (change.full) {
    doc.insert(0, linesFor(0, text.length))
    doc.remove(text.length, doc.size - text.length)
  } else if (isWholeLineUpdate(doc, change)) {
    // This is a whole-line replace. Treated specially to make
    // sure line objects move the way they are supposed to.
    var added = linesFor(0, text.length - 1)
    update(lastLine, lastLine.text, lastSpans)
    if (nlines) { doc.remove(from.line, nlines) }
    if (added.length) { doc.insert(from.line, added) }
  } else if (firstLine == lastLine) {
    if (text.length == 1) {
      update(firstLine, firstLine.text.slice(0, from.ch) + lastText + firstLine.text.slice(to.ch), lastSpans)
    } else {
      var added$1 = linesFor(1, text.length - 1)
      added$1.push(new Line(lastText + firstLine.text.slice(to.ch), lastSpans, estimateHeight))
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0))
      doc.insert(from.line + 1, added$1)
    }
  } else if (text.length == 1) {
    update(firstLine, firstLine.text.slice(0, from.ch) + text[0] + lastLine.text.slice(to.ch), spansFor(0))
    doc.remove(from.line + 1, nlines)
  } else {
    update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0))
    update(lastLine, lastText + lastLine.text.slice(to.ch), lastSpans)
    var added$2 = linesFor(1, text.length - 1)
    if (nlines > 1) { doc.remove(from.line + 1, nlines - 1) }
    doc.insert(from.line + 1, added$2)
  }

  signalLater(doc, "change", doc, change)
}

// Call f for all linked documents.
function linkedDocs(doc, f, sharedHistOnly) {
  function propagate(doc, skip, sharedHist) {
    if (doc.linked) { for (var i = 0; i < doc.linked.length; ++i) {
      var rel = doc.linked[i]
      if (rel.doc == skip) { continue }
      var shared = sharedHist && rel.sharedHist
      if (sharedHistOnly && !shared) { continue }
      f(rel.doc, shared)
      propagate(rel.doc, doc, shared)
    } }
  }
  propagate(doc, null, true)
}

// Attach a document to an editor.
function attachDoc(cm, doc) {
  if (doc.cm) { throw new Error("This document is already in use.") }
  cm.doc = doc
  doc.cm = cm
  estimateLineHeights(cm)
  loadMode(cm)
  if (!cm.options.lineWrapping) { findMaxLine(cm) }
  cm.options.mode = doc.modeOption
  regChange(cm)
}

function History(startGen) {
  // Arrays of change events and selections. Doing something adds an
  // event to done and clears undo. Undoing moves events from done
  // to undone, redoing moves them in the other direction.
  this.done = []; this.undone = []
  this.undoDepth = Infinity
  // Used to track when changes can be merged into a single undo
  // event
  this.lastModTime = this.lastSelTime = 0
  this.lastOp = this.lastSelOp = null
  this.lastOrigin = this.lastSelOrigin = null
  // Used by the isClean() method
  this.generation = this.maxGeneration = startGen || 1
}

// Create a history change event from an updateDoc-style change
// object.
function historyChangeFromChange(doc, change) {
  var histChange = {from: copyPos(change.from), to: changeEnd(change), text: getBetween(doc, change.from, change.to)}
  attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1)
  linkedDocs(doc, function (doc) { return attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1); }, true)
  return histChange
}

// Pop all selection events off the end of a history array. Stop at
// a change event.
function clearSelectionEvents(array) {
  while (array.length) {
    var last = lst(array)
    if (last.ranges) { array.pop() }
    else { break }
  }
}

// Find the top change event in the history. Pop off selection
// events that are in the way.
function lastChangeEvent(hist, force) {
  if (force) {
    clearSelectionEvents(hist.done)
    return lst(hist.done)
  } else if (hist.done.length && !lst(hist.done).ranges) {
    return lst(hist.done)
  } else if (hist.done.length > 1 && !hist.done[hist.done.length - 2].ranges) {
    hist.done.pop()
    return lst(hist.done)
  }
}

// Register a change in the history. Merges changes that are within
// a single operation, or are close together with an origin that
// allows merging (starting with "+") into a single event.
function addChangeToHistory(doc, change, selAfter, opId) {
  var hist = doc.history
  hist.undone.length = 0
  var time = +new Date, cur
  var last

  if ((hist.lastOp == opId ||
       hist.lastOrigin == change.origin && change.origin &&
       ((change.origin.charAt(0) == "+" && doc.cm && hist.lastModTime > time - doc.cm.options.historyEventDelay) ||
        change.origin.charAt(0) == "*")) &&
      (cur = lastChangeEvent(hist, hist.lastOp == opId))) {
    // Merge this change into the last event
    last = lst(cur.changes)
    if (cmp(change.from, change.to) == 0 && cmp(change.from, last.to) == 0) {
      // Optimized case for simple insertion -- don't want to add
      // new changesets for every character typed
      last.to = changeEnd(change)
    } else {
      // Add new sub-event
      cur.changes.push(historyChangeFromChange(doc, change))
    }
  } else {
    // Can not be merged, start a new event.
    var before = lst(hist.done)
    if (!before || !before.ranges)
      { pushSelectionToHistory(doc.sel, hist.done) }
    cur = {changes: [historyChangeFromChange(doc, change)],
           generation: hist.generation}
    hist.done.push(cur)
    while (hist.done.length > hist.undoDepth) {
      hist.done.shift()
      if (!hist.done[0].ranges) { hist.done.shift() }
    }
  }
  hist.done.push(selAfter)
  hist.generation = ++hist.maxGeneration
  hist.lastModTime = hist.lastSelTime = time
  hist.lastOp = hist.lastSelOp = opId
  hist.lastOrigin = hist.lastSelOrigin = change.origin

  if (!last) { signal(doc, "historyAdded") }
}

function selectionEventCanBeMerged(doc, origin, prev, sel) {
  var ch = origin.charAt(0)
  return ch == "*" ||
    ch == "+" &&
    prev.ranges.length == sel.ranges.length &&
    prev.somethingSelected() == sel.somethingSelected() &&
    new Date - doc.history.lastSelTime <= (doc.cm ? doc.cm.options.historyEventDelay : 500)
}

// Called whenever the selection changes, sets the new selection as
// the pending selection in the history, and pushes the old pending
// selection into the 'done' array when it was significantly
// different (in number of selected ranges, emptiness, or time).
function addSelectionToHistory(doc, sel, opId, options) {
  var hist = doc.history, origin = options && options.origin

  // A new event is started when the previous origin does not match
  // the current, or the origins don't allow matching. Origins
  // starting with * are always merged, those starting with + are
  // merged when similar and close together in time.
  if (opId == hist.lastSelOp ||
      (origin && hist.lastSelOrigin == origin &&
       (hist.lastModTime == hist.lastSelTime && hist.lastOrigin == origin ||
        selectionEventCanBeMerged(doc, origin, lst(hist.done), sel))))
    { hist.done[hist.done.length - 1] = sel }
  else
    { pushSelectionToHistory(sel, hist.done) }

  hist.lastSelTime = +new Date
  hist.lastSelOrigin = origin
  hist.lastSelOp = opId
  if (options && options.clearRedo !== false)
    { clearSelectionEvents(hist.undone) }
}

function pushSelectionToHistory(sel, dest) {
  var top = lst(dest)
  if (!(top && top.ranges && top.equals(sel)))
    { dest.push(sel) }
}

// Used to store marked span information in the history.
function attachLocalSpans(doc, change, from, to) {
  var existing = change["spans_" + doc.id], n = 0
  doc.iter(Math.max(doc.first, from), Math.min(doc.first + doc.size, to), function (line) {
    if (line.markedSpans)
      { (existing || (existing = change["spans_" + doc.id] = {}))[n] = line.markedSpans }
    ++n
  })
}

// When un/re-doing restores text containing marked spans, those
// that have been explicitly cleared should not be restored.
function removeClearedSpans(spans) {
  if (!spans) { return null }
  var out
  for (var i = 0; i < spans.length; ++i) {
    if (spans[i].marker.explicitlyCleared) { if (!out) { out = spans.slice(0, i) } }
    else if (out) { out.push(spans[i]) }
  }
  return !out ? spans : out.length ? out : null
}

// Retrieve and filter the old marked spans stored in a change event.
function getOldSpans(doc, change) {
  var found = change["spans_" + doc.id]
  if (!found) { return null }
  var nw = []
  for (var i = 0; i < change.text.length; ++i)
    { nw.push(removeClearedSpans(found[i])) }
  return nw
}

// Used for un/re-doing changes from the history. Combines the
// result of computing the existing spans with the set of spans that
// existed in the history (so that deleting around a span and then
// undoing brings back the span).
function mergeOldSpans(doc, change) {
  var old = getOldSpans(doc, change)
  var stretched = stretchSpansOverChange(doc, change)
  if (!old) { return stretched }
  if (!stretched) { return old }

  for (var i = 0; i < old.length; ++i) {
    var oldCur = old[i], stretchCur = stretched[i]
    if (oldCur && stretchCur) {
      spans: for (var j = 0; j < stretchCur.length; ++j) {
        var span = stretchCur[j]
        for (var k = 0; k < oldCur.length; ++k)
          { if (oldCur[k].marker == span.marker) { continue spans } }
        oldCur.push(span)
      }
    } else if (stretchCur) {
      old[i] = stretchCur
    }
  }
  return old
}

// Used both to provide a JSON-safe object in .getHistory, and, when
// detaching a document, to split the history in two
function copyHistoryArray(events, newGroup, instantiateSel) {
  var copy = []
  for (var i = 0; i < events.length; ++i) {
    var event = events[i]
    if (event.ranges) {
      copy.push(instantiateSel ? Selection.prototype.deepCopy.call(event) : event)
      continue
    }
    var changes = event.changes, newChanges = []
    copy.push({changes: newChanges})
    for (var j = 0; j < changes.length; ++j) {
      var change = changes[j], m = (void 0)
      newChanges.push({from: change.from, to: change.to, text: change.text})
      if (newGroup) { for (var prop in change) { if (m = prop.match(/^spans_(\d+)$/)) {
        if (indexOf(newGroup, Number(m[1])) > -1) {
          lst(newChanges)[prop] = change[prop]
          delete change[prop]
        }
      } } }
    }
  }
  return copy
}

// The 'scroll' parameter given to many of these indicated whether
// the new cursor position should be scrolled into view after
// modifying the selection.

// If shift is held or the extend flag is set, extends a range to
// include a given position (and optionally a second position).
// Otherwise, simply returns the range between the given positions.
// Used for cursor motion and such.
function extendRange(doc, range, head, other) {
  if (doc.cm && doc.cm.display.shift || doc.extend) {
    var anchor = range.anchor
    if (other) {
      var posBefore = cmp(head, anchor) < 0
      if (posBefore != (cmp(other, anchor) < 0)) {
        anchor = head
        head = other
      } else if (posBefore != (cmp(head, other) < 0)) {
        head = other
      }
    }
    return new Range(anchor, head)
  } else {
    return new Range(other || head, head)
  }
}

// Extend the primary selection range, discard the rest.
function extendSelection(doc, head, other, options) {
  setSelection(doc, new Selection([extendRange(doc, doc.sel.primary(), head, other)], 0), options)
}

// Extend all selections (pos is an array of selections with length
// equal the number of selections)
function extendSelections(doc, heads, options) {
  var out = []
  for (var i = 0; i < doc.sel.ranges.length; i++)
    { out[i] = extendRange(doc, doc.sel.ranges[i], heads[i], null) }
  var newSel = normalizeSelection(out, doc.sel.primIndex)
  setSelection(doc, newSel, options)
}

// Updates a single range in the selection.
function replaceOneSelection(doc, i, range, options) {
  var ranges = doc.sel.ranges.slice(0)
  ranges[i] = range
  setSelection(doc, normalizeSelection(ranges, doc.sel.primIndex), options)
}

// Reset the selection to a single range.
function setSimpleSelection(doc, anchor, head, options) {
  setSelection(doc, simpleSelection(anchor, head), options)
}

// Give beforeSelectionChange handlers a change to influence a
// selection update.
function filterSelectionChange(doc, sel, options) {
  var obj = {
    ranges: sel.ranges,
    update: function(ranges) {
      var this$1 = this;

      this.ranges = []
      for (var i = 0; i < ranges.length; i++)
        { this$1.ranges[i] = new Range(clipPos(doc, ranges[i].anchor),
                                   clipPos(doc, ranges[i].head)) }
    },
    origin: options && options.origin
  }
  signal(doc, "beforeSelectionChange", doc, obj)
  if (doc.cm) { signal(doc.cm, "beforeSelectionChange", doc.cm, obj) }
  if (obj.ranges != sel.ranges) { return normalizeSelection(obj.ranges, obj.ranges.length - 1) }
  else { return sel }
}

function setSelectionReplaceHistory(doc, sel, options) {
  var done = doc.history.done, last = lst(done)
  if (last && last.ranges) {
    done[done.length - 1] = sel
    setSelectionNoUndo(doc, sel, options)
  } else {
    setSelection(doc, sel, options)
  }
}

// Set a new selection.
function setSelection(doc, sel, options) {
  setSelectionNoUndo(doc, sel, options)
  addSelectionToHistory(doc, doc.sel, doc.cm ? doc.cm.curOp.id : NaN, options)
}

function setSelectionNoUndo(doc, sel, options) {
  if (hasHandler(doc, "beforeSelectionChange") || doc.cm && hasHandler(doc.cm, "beforeSelectionChange"))
    { sel = filterSelectionChange(doc, sel, options) }

  var bias = options && options.bias ||
    (cmp(sel.primary().head, doc.sel.primary().head) < 0 ? -1 : 1)
  setSelectionInner(doc, skipAtomicInSelection(doc, sel, bias, true))

  if (!(options && options.scroll === false) && doc.cm)
    { ensureCursorVisible(doc.cm) }
}

function setSelectionInner(doc, sel) {
  if (sel.equals(doc.sel)) { return }

  doc.sel = sel

  if (doc.cm) {
    doc.cm.curOp.updateInput = doc.cm.curOp.selectionChanged = true
    signalCursorActivity(doc.cm)
  }
  signalLater(doc, "cursorActivity", doc)
}

// Verify that the selection does not partially select any atomic
// marked ranges.
function reCheckSelection(doc) {
  setSelectionInner(doc, skipAtomicInSelection(doc, doc.sel, null, false), sel_dontScroll)
}

// Return a selection that does not partially select any atomic
// ranges.
function skipAtomicInSelection(doc, sel, bias, mayClear) {
  var out
  for (var i = 0; i < sel.ranges.length; i++) {
    var range = sel.ranges[i]
    var old = sel.ranges.length == doc.sel.ranges.length && doc.sel.ranges[i]
    var newAnchor = skipAtomic(doc, range.anchor, old && old.anchor, bias, mayClear)
    var newHead = skipAtomic(doc, range.head, old && old.head, bias, mayClear)
    if (out || newAnchor != range.anchor || newHead != range.head) {
      if (!out) { out = sel.ranges.slice(0, i) }
      out[i] = new Range(newAnchor, newHead)
    }
  }
  return out ? normalizeSelection(out, sel.primIndex) : sel
}

function skipAtomicInner(doc, pos, oldPos, dir, mayClear) {
  var line = getLine(doc, pos.line)
  if (line.markedSpans) { for (var i = 0; i < line.markedSpans.length; ++i) {
    var sp = line.markedSpans[i], m = sp.marker
    if ((sp.from == null || (m.inclusiveLeft ? sp.from <= pos.ch : sp.from < pos.ch)) &&
        (sp.to == null || (m.inclusiveRight ? sp.to >= pos.ch : sp.to > pos.ch))) {
      if (mayClear) {
        signal(m, "beforeCursorEnter")
        if (m.explicitlyCleared) {
          if (!line.markedSpans) { break }
          else {--i; continue}
        }
      }
      if (!m.atomic) { continue }

      if (oldPos) {
        var near = m.find(dir < 0 ? 1 : -1), diff = (void 0)
        if (dir < 0 ? m.inclusiveRight : m.inclusiveLeft)
          { near = movePos(doc, near, -dir, near && near.line == pos.line ? line : null) }
        if (near && near.line == pos.line && (diff = cmp(near, oldPos)) && (dir < 0 ? diff < 0 : diff > 0))
          { return skipAtomicInner(doc, near, pos, dir, mayClear) }
      }

      var far = m.find(dir < 0 ? -1 : 1)
      if (dir < 0 ? m.inclusiveLeft : m.inclusiveRight)
        { far = movePos(doc, far, dir, far.line == pos.line ? line : null) }
      return far ? skipAtomicInner(doc, far, pos, dir, mayClear) : null
    }
  } }
  return pos
}

// Ensure a given position is not inside an atomic range.
function skipAtomic(doc, pos, oldPos, bias, mayClear) {
  var dir = bias || 1
  var found = skipAtomicInner(doc, pos, oldPos, dir, mayClear) ||
      (!mayClear && skipAtomicInner(doc, pos, oldPos, dir, true)) ||
      skipAtomicInner(doc, pos, oldPos, -dir, mayClear) ||
      (!mayClear && skipAtomicInner(doc, pos, oldPos, -dir, true))
  if (!found) {
    doc.cantEdit = true
    return Pos(doc.first, 0)
  }
  return found
}

function movePos(doc, pos, dir, line) {
  if (dir < 0 && pos.ch == 0) {
    if (pos.line > doc.first) { return clipPos(doc, Pos(pos.line - 1)) }
    else { return null }
  } else if (dir > 0 && pos.ch == (line || getLine(doc, pos.line)).text.length) {
    if (pos.line < doc.first + doc.size - 1) { return Pos(pos.line + 1, 0) }
    else { return null }
  } else {
    return new Pos(pos.line, pos.ch + dir)
  }
}

function selectAll(cm) {
  cm.setSelection(Pos(cm.firstLine(), 0), Pos(cm.lastLine()), sel_dontScroll)
}

// UPDATING

// Allow "beforeChange" event handlers to influence a change
function filterChange(doc, change, update) {
  var obj = {
    canceled: false,
    from: change.from,
    to: change.to,
    text: change.text,
    origin: change.origin,
    cancel: function () { return obj.canceled = true; }
  }
  if (update) { obj.update = function (from, to, text, origin) {
    if (from) { obj.from = clipPos(doc, from) }
    if (to) { obj.to = clipPos(doc, to) }
    if (text) { obj.text = text }
    if (origin !== undefined) { obj.origin = origin }
  } }
  signal(doc, "beforeChange", doc, obj)
  if (doc.cm) { signal(doc.cm, "beforeChange", doc.cm, obj) }

  if (obj.canceled) { return null }
  return {from: obj.from, to: obj.to, text: obj.text, origin: obj.origin}
}

// Apply a change to a document, and add it to the document's
// history, and propagating it to all linked documents.
function makeChange(doc, change, ignoreReadOnly) {
  if (doc.cm) {
    if (!doc.cm.curOp) { return operation(doc.cm, makeChange)(doc, change, ignoreReadOnly) }
    if (doc.cm.state.suppressEdits) { return }
  }

  if (hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange")) {
    change = filterChange(doc, change, true)
    if (!change) { return }
  }

  // Possibly split or suppress the update based on the presence
  // of read-only spans in its range.
  var split = sawReadOnlySpans && !ignoreReadOnly && removeReadOnlyRanges(doc, change.from, change.to)
  if (split) {
    for (var i = split.length - 1; i >= 0; --i)
      { makeChangeInner(doc, {from: split[i].from, to: split[i].to, text: i ? [""] : change.text}) }
  } else {
    makeChangeInner(doc, change)
  }
}

function makeChangeInner(doc, change) {
  if (change.text.length == 1 && change.text[0] == "" && cmp(change.from, change.to) == 0) { return }
  var selAfter = computeSelAfterChange(doc, change)
  addChangeToHistory(doc, change, selAfter, doc.cm ? doc.cm.curOp.id : NaN)

  makeChangeSingleDoc(doc, change, selAfter, stretchSpansOverChange(doc, change))
  var rebased = []

  linkedDocs(doc, function (doc, sharedHist) {
    if (!sharedHist && indexOf(rebased, doc.history) == -1) {
      rebaseHist(doc.history, change)
      rebased.push(doc.history)
    }
    makeChangeSingleDoc(doc, change, null, stretchSpansOverChange(doc, change))
  })
}

// Revert a change stored in a document's history.
function makeChangeFromHistory(doc, type, allowSelectionOnly) {
  if (doc.cm && doc.cm.state.suppressEdits && !allowSelectionOnly) { return }

  var hist = doc.history, event, selAfter = doc.sel
  var source = type == "undo" ? hist.done : hist.undone, dest = type == "undo" ? hist.undone : hist.done

  // Verify that there is a useable event (so that ctrl-z won't
  // needlessly clear selection events)
  var i = 0
  for (; i < source.length; i++) {
    event = source[i]
    if (allowSelectionOnly ? event.ranges && !event.equals(doc.sel) : !event.ranges)
      { break }
  }
  if (i == source.length) { return }
  hist.lastOrigin = hist.lastSelOrigin = null

  for (;;) {
    event = source.pop()
    if (event.ranges) {
      pushSelectionToHistory(event, dest)
      if (allowSelectionOnly && !event.equals(doc.sel)) {
        setSelection(doc, event, {clearRedo: false})
        return
      }
      selAfter = event
    }
    else { break }
  }

  // Build up a reverse change object to add to the opposite history
  // stack (redo when undoing, and vice versa).
  var antiChanges = []
  pushSelectionToHistory(selAfter, dest)
  dest.push({changes: antiChanges, generation: hist.generation})
  hist.generation = event.generation || ++hist.maxGeneration

  var filter = hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange")

  var loop = function ( i ) {
    var change = event.changes[i]
    change.origin = type
    if (filter && !filterChange(doc, change, false)) {
      source.length = 0
      return {}
    }

    antiChanges.push(historyChangeFromChange(doc, change))

    var after = i ? computeSelAfterChange(doc, change) : lst(source)
    makeChangeSingleDoc(doc, change, after, mergeOldSpans(doc, change))
    if (!i && doc.cm) { doc.cm.scrollIntoView({from: change.from, to: changeEnd(change)}) }
    var rebased = []

    // Propagate to the linked documents
    linkedDocs(doc, function (doc, sharedHist) {
      if (!sharedHist && indexOf(rebased, doc.history) == -1) {
        rebaseHist(doc.history, change)
        rebased.push(doc.history)
      }
      makeChangeSingleDoc(doc, change, null, mergeOldSpans(doc, change))
    })
  };

  for (var i$1 = event.changes.length - 1; i$1 >= 0; --i$1) {
    var returned = loop( i$1 );

    if ( returned ) return returned.v;
  }
}

// Sub-views need their line numbers shifted when text is added
// above or below them in the parent document.
function shiftDoc(doc, distance) {
  if (distance == 0) { return }
  doc.first += distance
  doc.sel = new Selection(map(doc.sel.ranges, function (range) { return new Range(
    Pos(range.anchor.line + distance, range.anchor.ch),
    Pos(range.head.line + distance, range.head.ch)
  ); }), doc.sel.primIndex)
  if (doc.cm) {
    regChange(doc.cm, doc.first, doc.first - distance, distance)
    for (var d = doc.cm.display, l = d.viewFrom; l < d.viewTo; l++)
      { regLineChange(doc.cm, l, "gutter") }
  }
}

// More lower-level change function, handling only a single document
// (not linked ones).
function makeChangeSingleDoc(doc, change, selAfter, spans) {
  if (doc.cm && !doc.cm.curOp)
    { return operation(doc.cm, makeChangeSingleDoc)(doc, change, selAfter, spans) }

  if (change.to.line < doc.first) {
    shiftDoc(doc, change.text.length - 1 - (change.to.line - change.from.line))
    return
  }
  if (change.from.line > doc.lastLine()) { return }

  // Clip the change to the size of this doc
  if (change.from.line < doc.first) {
    var shift = change.text.length - 1 - (doc.first - change.from.line)
    shiftDoc(doc, shift)
    change = {from: Pos(doc.first, 0), to: Pos(change.to.line + shift, change.to.ch),
              text: [lst(change.text)], origin: change.origin}
  }
  var last = doc.lastLine()
  if (change.to.line > last) {
    change = {from: change.from, to: Pos(last, getLine(doc, last).text.length),
              text: [change.text[0]], origin: change.origin}
  }

  change.removed = getBetween(doc, change.from, change.to)

  if (!selAfter) { selAfter = computeSelAfterChange(doc, change) }
  if (doc.cm) { makeChangeSingleDocInEditor(doc.cm, change, spans) }
  else { updateDoc(doc, change, spans) }
  setSelectionNoUndo(doc, selAfter, sel_dontScroll)
}

// Handle the interaction of a change to a document with the editor
// that this document is part of.
function makeChangeSingleDocInEditor(cm, change, spans) {
  var doc = cm.doc, display = cm.display, from = change.from, to = change.to

  var recomputeMaxLength = false, checkWidthStart = from.line
  if (!cm.options.lineWrapping) {
    checkWidthStart = lineNo(visualLine(getLine(doc, from.line)))
    doc.iter(checkWidthStart, to.line + 1, function (line) {
      if (line == display.maxLine) {
        recomputeMaxLength = true
        return true
      }
    })
  }

  if (doc.sel.contains(change.from, change.to) > -1)
    { signalCursorActivity(cm) }

  updateDoc(doc, change, spans, estimateHeight(cm))

  if (!cm.options.lineWrapping) {
    doc.iter(checkWidthStart, from.line + change.text.length, function (line) {
      var len = lineLength(line)
      if (len > display.maxLineLength) {
        display.maxLine = line
        display.maxLineLength = len
        display.maxLineChanged = true
        recomputeMaxLength = false
      }
    })
    if (recomputeMaxLength) { cm.curOp.updateMaxLine = true }
  }

  // Adjust frontier, schedule worker
  doc.frontier = Math.min(doc.frontier, from.line)
  startWorker(cm, 400)

  var lendiff = change.text.length - (to.line - from.line) - 1
  // Remember that these lines changed, for updating the display
  if (change.full)
    { regChange(cm) }
  else if (from.line == to.line && change.text.length == 1 && !isWholeLineUpdate(cm.doc, change))
    { regLineChange(cm, from.line, "text") }
  else
    { regChange(cm, from.line, to.line + 1, lendiff) }

  var changesHandler = hasHandler(cm, "changes"), changeHandler = hasHandler(cm, "change")
  if (changeHandler || changesHandler) {
    var obj = {
      from: from, to: to,
      text: change.text,
      removed: change.removed,
      origin: change.origin
    }
    if (changeHandler) { signalLater(cm, "change", cm, obj) }
    if (changesHandler) { (cm.curOp.changeObjs || (cm.curOp.changeObjs = [])).push(obj) }
  }
  cm.display.selForContextMenu = null
}

function replaceRange(doc, code, from, to, origin) {
  if (!to) { to = from }
  if (cmp(to, from) < 0) { var tmp = to; to = from; from = tmp }
  if (typeof code == "string") { code = doc.splitLines(code) }
  makeChange(doc, {from: from, to: to, text: code, origin: origin})
}

// Rebasing/resetting history to deal with externally-sourced changes

function rebaseHistSelSingle(pos, from, to, diff) {
  if (to < pos.line) {
    pos.line += diff
  } else if (from < pos.line) {
    pos.line = from
    pos.ch = 0
  }
}

// Tries to rebase an array of history events given a change in the
// document. If the change touches the same lines as the event, the
// event, and everything 'behind' it, is discarded. If the change is
// before the event, the event's positions are updated. Uses a
// copy-on-write scheme for the positions, to avoid having to
// reallocate them all on every rebase, but also avoid problems with
// shared position objects being unsafely updated.
function rebaseHistArray(array, from, to, diff) {
  for (var i = 0; i < array.length; ++i) {
    var sub = array[i], ok = true
    if (sub.ranges) {
      if (!sub.copied) { sub = array[i] = sub.deepCopy(); sub.copied = true }
      for (var j = 0; j < sub.ranges.length; j++) {
        rebaseHistSelSingle(sub.ranges[j].anchor, from, to, diff)
        rebaseHistSelSingle(sub.ranges[j].head, from, to, diff)
      }
      continue
    }
    for (var j$1 = 0; j$1 < sub.changes.length; ++j$1) {
      var cur = sub.changes[j$1]
      if (to < cur.from.line) {
        cur.from = Pos(cur.from.line + diff, cur.from.ch)
        cur.to = Pos(cur.to.line + diff, cur.to.ch)
      } else if (from <= cur.to.line) {
        ok = false
        break
      }
    }
    if (!ok) {
      array.splice(0, i + 1)
      i = 0
    }
  }
}

function rebaseHist(hist, change) {
  var from = change.from.line, to = change.to.line, diff = change.text.length - (to - from) - 1
  rebaseHistArray(hist.done, from, to, diff)
  rebaseHistArray(hist.undone, from, to, diff)
}

// Utility for applying a change to a line by handle or number,
// returning the number and optionally registering the line as
// changed.
function changeLine(doc, handle, changeType, op) {
  var no = handle, line = handle
  if (typeof handle == "number") { line = getLine(doc, clipLine(doc, handle)) }
  else { no = lineNo(handle) }
  if (no == null) { return null }
  if (op(line, no) && doc.cm) { regLineChange(doc.cm, no, changeType) }
  return line
}

// The document is represented as a BTree consisting of leaves, with
// chunk of lines in them, and branches, with up to ten leaves or
// other branch nodes below them. The top node is always a branch
// node, and is the document object itself (meaning it has
// additional methods and properties).
//
// All nodes have parent links. The tree is used both to go from
// line numbers to line objects, and to go from objects to numbers.
// It also indexes by height, and is used to convert between height
// and line object, and to find the total height of the document.
//
// See also http://marijnhaverbeke.nl/blog/codemirror-line-tree.html

function LeafChunk(lines) {
  var this$1 = this;

  this.lines = lines
  this.parent = null
  var height = 0
  for (var i = 0; i < lines.length; ++i) {
    lines[i].parent = this$1
    height += lines[i].height
  }
  this.height = height
}

LeafChunk.prototype = {
  chunkSize: function() { return this.lines.length },
  // Remove the n lines at offset 'at'.
  removeInner: function(at, n) {
    var this$1 = this;

    for (var i = at, e = at + n; i < e; ++i) {
      var line = this$1.lines[i]
      this$1.height -= line.height
      cleanUpLine(line)
      signalLater(line, "delete")
    }
    this.lines.splice(at, n)
  },
  // Helper used to collapse a small branch into a single leaf.
  collapse: function(lines) {
    lines.push.apply(lines, this.lines)
  },
  // Insert the given array of lines at offset 'at', count them as
  // having the given height.
  insertInner: function(at, lines, height) {
    var this$1 = this;

    this.height += height
    this.lines = this.lines.slice(0, at).concat(lines).concat(this.lines.slice(at))
    for (var i = 0; i < lines.length; ++i) { lines[i].parent = this$1 }
  },
  // Used to iterate over a part of the tree.
  iterN: function(at, n, op) {
    var this$1 = this;

    for (var e = at + n; at < e; ++at)
      { if (op(this$1.lines[at])) { return true } }
  }
}

function BranchChunk(children) {
  var this$1 = this;

  this.children = children
  var size = 0, height = 0
  for (var i = 0; i < children.length; ++i) {
    var ch = children[i]
    size += ch.chunkSize(); height += ch.height
    ch.parent = this$1
  }
  this.size = size
  this.height = height
  this.parent = null
}

BranchChunk.prototype = {
  chunkSize: function() { return this.size },
  removeInner: function(at, n) {
    var this$1 = this;

    this.size -= n
    for (var i = 0; i < this.children.length; ++i) {
      var child = this$1.children[i], sz = child.chunkSize()
      if (at < sz) {
        var rm = Math.min(n, sz - at), oldHeight = child.height
        child.removeInner(at, rm)
        this$1.height -= oldHeight - child.height
        if (sz == rm) { this$1.children.splice(i--, 1); child.parent = null }
        if ((n -= rm) == 0) { break }
        at = 0
      } else { at -= sz }
    }
    // If the result is smaller than 25 lines, ensure that it is a
    // single leaf node.
    if (this.size - n < 25 &&
        (this.children.length > 1 || !(this.children[0] instanceof LeafChunk))) {
      var lines = []
      this.collapse(lines)
      this.children = [new LeafChunk(lines)]
      this.children[0].parent = this
    }
  },
  collapse: function(lines) {
    var this$1 = this;

    for (var i = 0; i < this.children.length; ++i) { this$1.children[i].collapse(lines) }
  },
  insertInner: function(at, lines, height) {
    var this$1 = this;

    this.size += lines.length
    this.height += height
    for (var i = 0; i < this.children.length; ++i) {
      var child = this$1.children[i], sz = child.chunkSize()
      if (at <= sz) {
        child.insertInner(at, lines, height)
        if (child.lines && child.lines.length > 50) {
          // To avoid memory thrashing when child.lines is huge (e.g. first view of a large file), it's never spliced.
          // Instead, small slices are taken. They're taken in order because sequential memory accesses are fastest.
          var remaining = child.lines.length % 25 + 25
          for (var pos = remaining; pos < child.lines.length;) {
            var leaf = new LeafChunk(child.lines.slice(pos, pos += 25))
            child.height -= leaf.height
            this$1.children.splice(++i, 0, leaf)
            leaf.parent = this$1
          }
          child.lines = child.lines.slice(0, remaining)
          this$1.maybeSpill()
        }
        break
      }
      at -= sz
    }
  },
  // When a node has grown, check whether it should be split.
  maybeSpill: function() {
    if (this.children.length <= 10) { return }
    var me = this
    do {
      var spilled = me.children.splice(me.children.length - 5, 5)
      var sibling = new BranchChunk(spilled)
      if (!me.parent) { // Become the parent node
        var copy = new BranchChunk(me.children)
        copy.parent = me
        me.children = [copy, sibling]
        me = copy
     } else {
        me.size -= sibling.size
        me.height -= sibling.height
        var myIndex = indexOf(me.parent.children, me)
        me.parent.children.splice(myIndex + 1, 0, sibling)
      }
      sibling.parent = me.parent
    } while (me.children.length > 10)
    me.parent.maybeSpill()
  },
  iterN: function(at, n, op) {
    var this$1 = this;

    for (var i = 0; i < this.children.length; ++i) {
      var child = this$1.children[i], sz = child.chunkSize()
      if (at < sz) {
        var used = Math.min(n, sz - at)
        if (child.iterN(at, used, op)) { return true }
        if ((n -= used) == 0) { break }
        at = 0
      } else { at -= sz }
    }
  }
}

// Line widgets are block elements displayed above or below a line.

function LineWidget(doc, node, options) {
  var this$1 = this;

  if (options) { for (var opt in options) { if (options.hasOwnProperty(opt))
    { this$1[opt] = options[opt] } } }
  this.doc = doc
  this.node = node
}
eventMixin(LineWidget)

function adjustScrollWhenAboveVisible(cm, line, diff) {
  if (heightAtLine(line) < ((cm.curOp && cm.curOp.scrollTop) || cm.doc.scrollTop))
    { addToScrollPos(cm, null, diff) }
}

LineWidget.prototype.clear = function() {
  var this$1 = this;

  var cm = this.doc.cm, ws = this.line.widgets, line = this.line, no = lineNo(line)
  if (no == null || !ws) { return }
  for (var i = 0; i < ws.length; ++i) { if (ws[i] == this$1) { ws.splice(i--, 1) } }
  if (!ws.length) { line.widgets = null }
  var height = widgetHeight(this)
  updateLineHeight(line, Math.max(0, line.height - height))
  if (cm) { runInOp(cm, function () {
    adjustScrollWhenAboveVisible(cm, line, -height)
    regLineChange(cm, no, "widget")
  }) }
}
LineWidget.prototype.changed = function() {
  var oldH = this.height, cm = this.doc.cm, line = this.line
  this.height = null
  var diff = widgetHeight(this) - oldH
  if (!diff) { return }
  updateLineHeight(line, line.height + diff)
  if (cm) { runInOp(cm, function () {
    cm.curOp.forceUpdate = true
    adjustScrollWhenAboveVisible(cm, line, diff)
  }) }
}

function addLineWidget(doc, handle, node, options) {
  var widget = new LineWidget(doc, node, options)
  var cm = doc.cm
  if (cm && widget.noHScroll) { cm.display.alignWidgets = true }
  changeLine(doc, handle, "widget", function (line) {
    var widgets = line.widgets || (line.widgets = [])
    if (widget.insertAt == null) { widgets.push(widget) }
    else { widgets.splice(Math.min(widgets.length - 1, Math.max(0, widget.insertAt)), 0, widget) }
    widget.line = line
    if (cm && !lineIsHidden(doc, line)) {
      var aboveVisible = heightAtLine(line) < doc.scrollTop
      updateLineHeight(line, line.height + widgetHeight(widget))
      if (aboveVisible) { addToScrollPos(cm, null, widget.height) }
      cm.curOp.forceUpdate = true
    }
    return true
  })
  return widget
}

// TEXTMARKERS

// Created with markText and setBookmark methods. A TextMarker is a
// handle that can be used to clear or find a marked position in the
// document. Line objects hold arrays (markedSpans) containing
// {from, to, marker} object pointing to such marker objects, and
// indicating that such a marker is present on that line. Multiple
// lines may point to the same marker when it spans across lines.
// The spans will have null for their from/to properties when the
// marker continues beyond the start/end of the line. Markers have
// links back to the lines they currently touch.

// Collapsed markers have unique ids, in order to be able to order
// them, which is needed for uniquely determining an outer marker
// when they overlap (they may nest, but not partially overlap).
var nextMarkerId = 0

function TextMarker(doc, type) {
  this.lines = []
  this.type = type
  this.doc = doc
  this.id = ++nextMarkerId
}
eventMixin(TextMarker)

// Clear the marker.
TextMarker.prototype.clear = function() {
  var this$1 = this;

  if (this.explicitlyCleared) { return }
  var cm = this.doc.cm, withOp = cm && !cm.curOp
  if (withOp) { startOperation(cm) }
  if (hasHandler(this, "clear")) {
    var found = this.find()
    if (found) { signalLater(this, "clear", found.from, found.to) }
  }
  var min = null, max = null
  for (var i = 0; i < this.lines.length; ++i) {
    var line = this$1.lines[i]
    var span = getMarkedSpanFor(line.markedSpans, this$1)
    if (cm && !this$1.collapsed) { regLineChange(cm, lineNo(line), "text") }
    else if (cm) {
      if (span.to != null) { max = lineNo(line) }
      if (span.from != null) { min = lineNo(line) }
    }
    line.markedSpans = removeMarkedSpan(line.markedSpans, span)
    if (span.from == null && this$1.collapsed && !lineIsHidden(this$1.doc, line) && cm)
      { updateLineHeight(line, textHeight(cm.display)) }
  }
  if (cm && this.collapsed && !cm.options.lineWrapping) { for (var i$1 = 0; i$1 < this.lines.length; ++i$1) {
    var visual = visualLine(this$1.lines[i$1]), len = lineLength(visual)
    if (len > cm.display.maxLineLength) {
      cm.display.maxLine = visual
      cm.display.maxLineLength = len
      cm.display.maxLineChanged = true
    }
  } }

  if (min != null && cm && this.collapsed) { regChange(cm, min, max + 1) }
  this.lines.length = 0
  this.explicitlyCleared = true
  if (this.atomic && this.doc.cantEdit) {
    this.doc.cantEdit = false
    if (cm) { reCheckSelection(cm.doc) }
  }
  if (cm) { signalLater(cm, "markerCleared", cm, this) }
  if (withOp) { endOperation(cm) }
  if (this.parent) { this.parent.clear() }
}

// Find the position of the marker in the document. Returns a {from,
// to} object by default. Side can be passed to get a specific side
// -- 0 (both), -1 (left), or 1 (right). When lineObj is true, the
// Pos objects returned contain a line object, rather than a line
// number (used to prevent looking up the same line twice).
TextMarker.prototype.find = function(side, lineObj) {
  var this$1 = this;

  if (side == null && this.type == "bookmark") { side = 1 }
  var from, to
  for (var i = 0; i < this.lines.length; ++i) {
    var line = this$1.lines[i]
    var span = getMarkedSpanFor(line.markedSpans, this$1)
    if (span.from != null) {
      from = Pos(lineObj ? line : lineNo(line), span.from)
      if (side == -1) { return from }
    }
    if (span.to != null) {
      to = Pos(lineObj ? line : lineNo(line), span.to)
      if (side == 1) { return to }
    }
  }
  return from && {from: from, to: to}
}

// Signals that the marker's widget changed, and surrounding layout
// should be recomputed.
TextMarker.prototype.changed = function() {
  var pos = this.find(-1, true), widget = this, cm = this.doc.cm
  if (!pos || !cm) { return }
  runInOp(cm, function () {
    var line = pos.line, lineN = lineNo(pos.line)
    var view = findViewForLine(cm, lineN)
    if (view) {
      clearLineMeasurementCacheFor(view)
      cm.curOp.selectionChanged = cm.curOp.forceUpdate = true
    }
    cm.curOp.updateMaxLine = true
    if (!lineIsHidden(widget.doc, line) && widget.height != null) {
      var oldHeight = widget.height
      widget.height = null
      var dHeight = widgetHeight(widget) - oldHeight
      if (dHeight)
        { updateLineHeight(line, line.height + dHeight) }
    }
  })
}

TextMarker.prototype.attachLine = function(line) {
  if (!this.lines.length && this.doc.cm) {
    var op = this.doc.cm.curOp
    if (!op.maybeHiddenMarkers || indexOf(op.maybeHiddenMarkers, this) == -1)
      { (op.maybeUnhiddenMarkers || (op.maybeUnhiddenMarkers = [])).push(this) }
  }
  this.lines.push(line)
}
TextMarker.prototype.detachLine = function(line) {
  this.lines.splice(indexOf(this.lines, line), 1)
  if (!this.lines.length && this.doc.cm) {
    var op = this.doc.cm.curOp
    ;(op.maybeHiddenMarkers || (op.maybeHiddenMarkers = [])).push(this)
  }
}

// Create a marker, wire it up to the right lines, and
function markText(doc, from, to, options, type) {
  // Shared markers (across linked documents) are handled separately
  // (markTextShared will call out to this again, once per
  // document).
  if (options && options.shared) { return markTextShared(doc, from, to, options, type) }
  // Ensure we are in an operation.
  if (doc.cm && !doc.cm.curOp) { return operation(doc.cm, markText)(doc, from, to, options, type) }

  var marker = new TextMarker(doc, type), diff = cmp(from, to)
  if (options) { copyObj(options, marker, false) }
  // Don't connect empty markers unless clearWhenEmpty is false
  if (diff > 0 || diff == 0 && marker.clearWhenEmpty !== false)
    { return marker }
  if (marker.replacedWith) {
    // Showing up as a widget implies collapsed (widget replaces text)
    marker.collapsed = true
    marker.widgetNode = elt("span", [marker.replacedWith], "CodeMirror-widget")
    marker.widgetNode.setAttribute("role", "presentation") // hide from accessibility tree
    if (!options.handleMouseEvents) { marker.widgetNode.setAttribute("cm-ignore-events", "true") }
    if (options.insertLeft) { marker.widgetNode.insertLeft = true }
  }
  if (marker.collapsed) {
    if (conflictingCollapsedRange(doc, from.line, from, to, marker) ||
        from.line != to.line && conflictingCollapsedRange(doc, to.line, from, to, marker))
      { throw new Error("Inserting collapsed marker partially overlapping an existing one") }
    seeCollapsedSpans()
  }

  if (marker.addToHistory)
    { addChangeToHistory(doc, {from: from, to: to, origin: "markText"}, doc.sel, NaN) }

  var curLine = from.line, cm = doc.cm, updateMaxLine
  doc.iter(curLine, to.line + 1, function (line) {
    if (cm && marker.collapsed && !cm.options.lineWrapping && visualLine(line) == cm.display.maxLine)
      { updateMaxLine = true }
    if (marker.collapsed && curLine != from.line) { updateLineHeight(line, 0) }
    addMarkedSpan(line, new MarkedSpan(marker,
                                       curLine == from.line ? from.ch : null,
                                       curLine == to.line ? to.ch : null))
    ++curLine
  })
  // lineIsHidden depends on the presence of the spans, so needs a second pass
  if (marker.collapsed) { doc.iter(from.line, to.line + 1, function (line) {
    if (lineIsHidden(doc, line)) { updateLineHeight(line, 0) }
  }) }

  if (marker.clearOnEnter) { on(marker, "beforeCursorEnter", function () { return marker.clear(); }) }

  if (marker.readOnly) {
    seeReadOnlySpans()
    if (doc.history.done.length || doc.history.undone.length)
      { doc.clearHistory() }
  }
  if (marker.collapsed) {
    marker.id = ++nextMarkerId
    marker.atomic = true
  }
  if (cm) {
    // Sync editor state
    if (updateMaxLine) { cm.curOp.updateMaxLine = true }
    if (marker.collapsed)
      { regChange(cm, from.line, to.line + 1) }
    else if (marker.className || marker.title || marker.startStyle || marker.endStyle || marker.css)
      { for (var i = from.line; i <= to.line; i++) { regLineChange(cm, i, "text") } }
    if (marker.atomic) { reCheckSelection(cm.doc) }
    signalLater(cm, "markerAdded", cm, marker)
  }
  return marker
}

// SHARED TEXTMARKERS

// A shared marker spans multiple linked documents. It is
// implemented as a meta-marker-object controlling multiple normal
// markers.
function SharedTextMarker(markers, primary) {
  var this$1 = this;

  this.markers = markers
  this.primary = primary
  for (var i = 0; i < markers.length; ++i)
    { markers[i].parent = this$1 }
}
eventMixin(SharedTextMarker)

SharedTextMarker.prototype.clear = function() {
  var this$1 = this;

  if (this.explicitlyCleared) { return }
  this.explicitlyCleared = true
  for (var i = 0; i < this.markers.length; ++i)
    { this$1.markers[i].clear() }
  signalLater(this, "clear")
}
SharedTextMarker.prototype.find = function(side, lineObj) {
  return this.primary.find(side, lineObj)
}

function markTextShared(doc, from, to, options, type) {
  options = copyObj(options)
  options.shared = false
  var markers = [markText(doc, from, to, options, type)], primary = markers[0]
  var widget = options.widgetNode
  linkedDocs(doc, function (doc) {
    if (widget) { options.widgetNode = widget.cloneNode(true) }
    markers.push(markText(doc, clipPos(doc, from), clipPos(doc, to), options, type))
    for (var i = 0; i < doc.linked.length; ++i)
      { if (doc.linked[i].isParent) { return } }
    primary = lst(markers)
  })
  return new SharedTextMarker(markers, primary)
}

function findSharedMarkers(doc) {
  return doc.findMarks(Pos(doc.first, 0), doc.clipPos(Pos(doc.lastLine())), function (m) { return m.parent; })
}

function copySharedMarkers(doc, markers) {
  for (var i = 0; i < markers.length; i++) {
    var marker = markers[i], pos = marker.find()
    var mFrom = doc.clipPos(pos.from), mTo = doc.clipPos(pos.to)
    if (cmp(mFrom, mTo)) {
      var subMark = markText(doc, mFrom, mTo, marker.primary, marker.primary.type)
      marker.markers.push(subMark)
      subMark.parent = marker
    }
  }
}

function detachSharedMarkers(markers) {
  var loop = function ( i ) {
    var marker = markers[i], linked = [marker.primary.doc]
    linkedDocs(marker.primary.doc, function (d) { return linked.push(d); })
    for (var j = 0; j < marker.markers.length; j++) {
      var subMarker = marker.markers[j]
      if (indexOf(linked, subMarker.doc) == -1) {
        subMarker.parent = null
        marker.markers.splice(j--, 1)
      }
    }
  };

  for (var i = 0; i < markers.length; i++) loop( i );
}

var nextDocId = 0
var Doc = function(text, mode, firstLine, lineSep) {
  if (!(this instanceof Doc)) { return new Doc(text, mode, firstLine, lineSep) }
  if (firstLine == null) { firstLine = 0 }

  BranchChunk.call(this, [new LeafChunk([new Line("", null)])])
  this.first = firstLine
  this.scrollTop = this.scrollLeft = 0
  this.cantEdit = false
  this.cleanGeneration = 1
  this.frontier = firstLine
  var start = Pos(firstLine, 0)
  this.sel = simpleSelection(start)
  this.history = new History(null)
  this.id = ++nextDocId
  this.modeOption = mode
  this.lineSep = lineSep
  this.extend = false

  if (typeof text == "string") { text = this.splitLines(text) }
  updateDoc(this, {from: start, to: start, text: text})
  setSelection(this, simpleSelection(start), sel_dontScroll)
}

Doc.prototype = createObj(BranchChunk.prototype, {
  constructor: Doc,
  // Iterate over the document. Supports two forms -- with only one
  // argument, it calls that for each line in the document. With
  // three, it iterates over the range given by the first two (with
  // the second being non-inclusive).
  iter: function(from, to, op) {
    if (op) { this.iterN(from - this.first, to - from, op) }
    else { this.iterN(this.first, this.first + this.size, from) }
  },

  // Non-public interface for adding and removing lines.
  insert: function(at, lines) {
    var height = 0
    for (var i = 0; i < lines.length; ++i) { height += lines[i].height }
    this.insertInner(at - this.first, lines, height)
  },
  remove: function(at, n) { this.removeInner(at - this.first, n) },

  // From here, the methods are part of the public interface. Most
  // are also available from CodeMirror (editor) instances.

  getValue: function(lineSep) {
    var lines = getLines(this, this.first, this.first + this.size)
    if (lineSep === false) { return lines }
    return lines.join(lineSep || this.lineSeparator())
  },
  setValue: docMethodOp(function(code) {
    var top = Pos(this.first, 0), last = this.first + this.size - 1
    makeChange(this, {from: top, to: Pos(last, getLine(this, last).text.length),
                      text: this.splitLines(code), origin: "setValue", full: true}, true)
    setSelection(this, simpleSelection(top))
  }),
  replaceRange: function(code, from, to, origin) {
    from = clipPos(this, from)
    to = to ? clipPos(this, to) : from
    replaceRange(this, code, from, to, origin)
  },
  getRange: function(from, to, lineSep) {
    var lines = getBetween(this, clipPos(this, from), clipPos(this, to))
    if (lineSep === false) { return lines }
    return lines.join(lineSep || this.lineSeparator())
  },

  getLine: function(line) {var l = this.getLineHandle(line); return l && l.text},

  getLineHandle: function(line) {if (isLine(this, line)) { return getLine(this, line) }},
  getLineNumber: function(line) {return lineNo(line)},

  getLineHandleVisualStart: function(line) {
    if (typeof line == "number") { line = getLine(this, line) }
    return visualLine(line)
  },

  lineCount: function() {return this.size},
  firstLine: function() {return this.first},
  lastLine: function() {return this.first + this.size - 1},

  clipPos: function(pos) {return clipPos(this, pos)},

  getCursor: function(start) {
    var range = this.sel.primary(), pos
    if (start == null || start == "head") { pos = range.head }
    else if (start == "anchor") { pos = range.anchor }
    else if (start == "end" || start == "to" || start === false) { pos = range.to() }
    else { pos = range.from() }
    return pos
  },
  listSelections: function() { return this.sel.ranges },
  somethingSelected: function() {return this.sel.somethingSelected()},

  setCursor: docMethodOp(function(line, ch, options) {
    setSimpleSelection(this, clipPos(this, typeof line == "number" ? Pos(line, ch || 0) : line), null, options)
  }),
  setSelection: docMethodOp(function(anchor, head, options) {
    setSimpleSelection(this, clipPos(this, anchor), clipPos(this, head || anchor), options)
  }),
  extendSelection: docMethodOp(function(head, other, options) {
    extendSelection(this, clipPos(this, head), other && clipPos(this, other), options)
  }),
  extendSelections: docMethodOp(function(heads, options) {
    extendSelections(this, clipPosArray(this, heads), options)
  }),
  extendSelectionsBy: docMethodOp(function(f, options) {
    var heads = map(this.sel.ranges, f)
    extendSelections(this, clipPosArray(this, heads), options)
  }),
  setSelections: docMethodOp(function(ranges, primary, options) {
    var this$1 = this;

    if (!ranges.length) { return }
    var out = []
    for (var i = 0; i < ranges.length; i++)
      { out[i] = new Range(clipPos(this$1, ranges[i].anchor),
                         clipPos(this$1, ranges[i].head)) }
    if (primary == null) { primary = Math.min(ranges.length - 1, this.sel.primIndex) }
    setSelection(this, normalizeSelection(out, primary), options)
  }),
  addSelection: docMethodOp(function(anchor, head, options) {
    var ranges = this.sel.ranges.slice(0)
    ranges.push(new Range(clipPos(this, anchor), clipPos(this, head || anchor)))
    setSelection(this, normalizeSelection(ranges, ranges.length - 1), options)
  }),

  getSelection: function(lineSep) {
    var this$1 = this;

    var ranges = this.sel.ranges, lines
    for (var i = 0; i < ranges.length; i++) {
      var sel = getBetween(this$1, ranges[i].from(), ranges[i].to())
      lines = lines ? lines.concat(sel) : sel
    }
    if (lineSep === false) { return lines }
    else { return lines.join(lineSep || this.lineSeparator()) }
  },
  getSelections: function(lineSep) {
    var this$1 = this;

    var parts = [], ranges = this.sel.ranges
    for (var i = 0; i < ranges.length; i++) {
      var sel = getBetween(this$1, ranges[i].from(), ranges[i].to())
      if (lineSep !== false) { sel = sel.join(lineSep || this$1.lineSeparator()) }
      parts[i] = sel
    }
    return parts
  },
  replaceSelection: function(code, collapse, origin) {
    var dup = []
    for (var i = 0; i < this.sel.ranges.length; i++)
      { dup[i] = code }
    this.replaceSelections(dup, collapse, origin || "+input")
  },
  replaceSelections: docMethodOp(function(code, collapse, origin) {
    var this$1 = this;

    var changes = [], sel = this.sel
    for (var i = 0; i < sel.ranges.length; i++) {
      var range = sel.ranges[i]
      changes[i] = {from: range.from(), to: range.to(), text: this$1.splitLines(code[i]), origin: origin}
    }
    var newSel = collapse && collapse != "end" && computeReplacedSel(this, changes, collapse)
    for (var i$1 = changes.length - 1; i$1 >= 0; i$1--)
      { makeChange(this$1, changes[i$1]) }
    if (newSel) { setSelectionReplaceHistory(this, newSel) }
    else if (this.cm) { ensureCursorVisible(this.cm) }
  }),
  undo: docMethodOp(function() {makeChangeFromHistory(this, "undo")}),
  redo: docMethodOp(function() {makeChangeFromHistory(this, "redo")}),
  undoSelection: docMethodOp(function() {makeChangeFromHistory(this, "undo", true)}),
  redoSelection: docMethodOp(function() {makeChangeFromHistory(this, "redo", true)}),

  setExtending: function(val) {this.extend = val},
  getExtending: function() {return this.extend},

  historySize: function() {
    var hist = this.history, done = 0, undone = 0
    for (var i = 0; i < hist.done.length; i++) { if (!hist.done[i].ranges) { ++done } }
    for (var i$1 = 0; i$1 < hist.undone.length; i$1++) { if (!hist.undone[i$1].ranges) { ++undone } }
    return {undo: done, redo: undone}
  },
  clearHistory: function() {this.history = new History(this.history.maxGeneration)},

  markClean: function() {
    this.cleanGeneration = this.changeGeneration(true)
  },
  changeGeneration: function(forceSplit) {
    if (forceSplit)
      { this.history.lastOp = this.history.lastSelOp = this.history.lastOrigin = null }
    return this.history.generation
  },
  isClean: function (gen) {
    return this.history.generation == (gen || this.cleanGeneration)
  },

  getHistory: function() {
    return {done: copyHistoryArray(this.history.done),
            undone: copyHistoryArray(this.history.undone)}
  },
  setHistory: function(histData) {
    var hist = this.history = new History(this.history.maxGeneration)
    hist.done = copyHistoryArray(histData.done.slice(0), null, true)
    hist.undone = copyHistoryArray(histData.undone.slice(0), null, true)
  },

  setGutterMarker: docMethodOp(function(line, gutterID, value) {
    return changeLine(this, line, "gutter", function (line) {
      var markers = line.gutterMarkers || (line.gutterMarkers = {})
      markers[gutterID] = value
      if (!value && isEmpty(markers)) { line.gutterMarkers = null }
      return true
    })
  }),

  clearGutter: docMethodOp(function(gutterID) {
    var this$1 = this;

    this.iter(function (line) {
      if (line.gutterMarkers && line.gutterMarkers[gutterID]) {
        changeLine(this$1, line, "gutter", function () {
          line.gutterMarkers[gutterID] = null
          if (isEmpty(line.gutterMarkers)) { line.gutterMarkers = null }
          return true
        })
      }
    })
  }),

  lineInfo: function(line) {
    var n
    if (typeof line == "number") {
      if (!isLine(this, line)) { return null }
      n = line
      line = getLine(this, line)
      if (!line) { return null }
    } else {
      n = lineNo(line)
      if (n == null) { return null }
    }
    return {line: n, handle: line, text: line.text, gutterMarkers: line.gutterMarkers,
            textClass: line.textClass, bgClass: line.bgClass, wrapClass: line.wrapClass,
            widgets: line.widgets}
  },

  addLineClass: docMethodOp(function(handle, where, cls) {
    return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
      var prop = where == "text" ? "textClass"
               : where == "background" ? "bgClass"
               : where == "gutter" ? "gutterClass" : "wrapClass"
      if (!line[prop]) { line[prop] = cls }
      else if (classTest(cls).test(line[prop])) { return false }
      else { line[prop] += " " + cls }
      return true
    })
  }),
  removeLineClass: docMethodOp(function(handle, where, cls) {
    return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
      var prop = where == "text" ? "textClass"
               : where == "background" ? "bgClass"
               : where == "gutter" ? "gutterClass" : "wrapClass"
      var cur = line[prop]
      if (!cur) { return false }
      else if (cls == null) { line[prop] = null }
      else {
        var found = cur.match(classTest(cls))
        if (!found) { return false }
        var end = found.index + found[0].length
        line[prop] = cur.slice(0, found.index) + (!found.index || end == cur.length ? "" : " ") + cur.slice(end) || null
      }
      return true
    })
  }),

  addLineWidget: docMethodOp(function(handle, node, options) {
    return addLineWidget(this, handle, node, options)
  }),
  removeLineWidget: function(widget) { widget.clear() },

  markText: function(from, to, options) {
    return markText(this, clipPos(this, from), clipPos(this, to), options, options && options.type || "range")
  },
  setBookmark: function(pos, options) {
    var realOpts = {replacedWith: options && (options.nodeType == null ? options.widget : options),
                    insertLeft: options && options.insertLeft,
                    clearWhenEmpty: false, shared: options && options.shared,
                    handleMouseEvents: options && options.handleMouseEvents}
    pos = clipPos(this, pos)
    return markText(this, pos, pos, realOpts, "bookmark")
  },
  findMarksAt: function(pos) {
    pos = clipPos(this, pos)
    var markers = [], spans = getLine(this, pos.line).markedSpans
    if (spans) { for (var i = 0; i < spans.length; ++i) {
      var span = spans[i]
      if ((span.from == null || span.from <= pos.ch) &&
          (span.to == null || span.to >= pos.ch))
        { markers.push(span.marker.parent || span.marker) }
    } }
    return markers
  },
  findMarks: function(from, to, filter) {
    from = clipPos(this, from); to = clipPos(this, to)
    var found = [], lineNo = from.line
    this.iter(from.line, to.line + 1, function (line) {
      var spans = line.markedSpans
      if (spans) { for (var i = 0; i < spans.length; i++) {
        var span = spans[i]
        if (!(span.to != null && lineNo == from.line && from.ch >= span.to ||
              span.from == null && lineNo != from.line ||
              span.from != null && lineNo == to.line && span.from >= to.ch) &&
            (!filter || filter(span.marker)))
          { found.push(span.marker.parent || span.marker) }
      } }
      ++lineNo
    })
    return found
  },
  getAllMarks: function() {
    var markers = []
    this.iter(function (line) {
      var sps = line.markedSpans
      if (sps) { for (var i = 0; i < sps.length; ++i)
        { if (sps[i].from != null) { markers.push(sps[i].marker) } } }
    })
    return markers
  },

  posFromIndex: function(off) {
    var ch, lineNo = this.first, sepSize = this.lineSeparator().length
    this.iter(function (line) {
      var sz = line.text.length + sepSize
      if (sz > off) { ch = off; return true }
      off -= sz
      ++lineNo
    })
    return clipPos(this, Pos(lineNo, ch))
  },
  indexFromPos: function (coords) {
    coords = clipPos(this, coords)
    var index = coords.ch
    if (coords.line < this.first || coords.ch < 0) { return 0 }
    var sepSize = this.lineSeparator().length
    this.iter(this.first, coords.line, function (line) { // iter aborts when callback returns a truthy value
      index += line.text.length + sepSize
    })
    return index
  },

  copy: function(copyHistory) {
    var doc = new Doc(getLines(this, this.first, this.first + this.size),
                      this.modeOption, this.first, this.lineSep)
    doc.scrollTop = this.scrollTop; doc.scrollLeft = this.scrollLeft
    doc.sel = this.sel
    doc.extend = false
    if (copyHistory) {
      doc.history.undoDepth = this.history.undoDepth
      doc.setHistory(this.getHistory())
    }
    return doc
  },

  linkedDoc: function(options) {
    if (!options) { options = {} }
    var from = this.first, to = this.first + this.size
    if (options.from != null && options.from > from) { from = options.from }
    if (options.to != null && options.to < to) { to = options.to }
    var copy = new Doc(getLines(this, from, to), options.mode || this.modeOption, from, this.lineSep)
    if (options.sharedHist) { copy.history = this.history
    ; }(this.linked || (this.linked = [])).push({doc: copy, sharedHist: options.sharedHist})
    copy.linked = [{doc: this, isParent: true, sharedHist: options.sharedHist}]
    copySharedMarkers(copy, findSharedMarkers(this))
    return copy
  },
  unlinkDoc: function(other) {
    var this$1 = this;

    if (other instanceof CodeMirror) { other = other.doc }
    if (this.linked) { for (var i = 0; i < this.linked.length; ++i) {
      var link = this$1.linked[i]
      if (link.doc != other) { continue }
      this$1.linked.splice(i, 1)
      other.unlinkDoc(this$1)
      detachSharedMarkers(findSharedMarkers(this$1))
      break
    } }
    // If the histories were shared, split them again
    if (other.history == this.history) {
      var splitIds = [other.id]
      linkedDocs(other, function (doc) { return splitIds.push(doc.id); }, true)
      other.history = new History(null)
      other.history.done = copyHistoryArray(this.history.done, splitIds)
      other.history.undone = copyHistoryArray(this.history.undone, splitIds)
    }
  },
  iterLinkedDocs: function(f) {linkedDocs(this, f)},

  getMode: function() {return this.mode},
  getEditor: function() {return this.cm},

  splitLines: function(str) {
    if (this.lineSep) { return str.split(this.lineSep) }
    return splitLinesAuto(str)
  },
  lineSeparator: function() { return this.lineSep || "\n" }
})

// Public alias.
Doc.prototype.eachLine = Doc.prototype.iter

// Kludge to work around strange IE behavior where it'll sometimes
// re-fire a series of drag-related events right after the drop (#1551)
var lastDrop = 0

function onDrop(e) {
  var cm = this
  clearDragCursor(cm)
  if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e))
    { return }
  e_preventDefault(e)
  if (ie) { lastDrop = +new Date }
  var pos = posFromMouse(cm, e, true), files = e.dataTransfer.files
  if (!pos || cm.isReadOnly()) { return }
  // Might be a file drop, in which case we simply extract the text
  // and insert it.
  if (files && files.length && window.FileReader && window.File) {
    var n = files.length, text = Array(n), read = 0
    var loadFile = function (file, i) {
      if (cm.options.allowDropFileTypes &&
          indexOf(cm.options.allowDropFileTypes, file.type) == -1)
        { return }

      var reader = new FileReader
      reader.onload = operation(cm, function () {
        var content = reader.result
        if (/[\x00-\x08\x0e-\x1f]{2}/.test(content)) { content = "" }
        text[i] = content
        if (++read == n) {
          pos = clipPos(cm.doc, pos)
          var change = {from: pos, to: pos,
                        text: cm.doc.splitLines(text.join(cm.doc.lineSeparator())),
                        origin: "paste"}
          makeChange(cm.doc, change)
          setSelectionReplaceHistory(cm.doc, simpleSelection(pos, changeEnd(change)))
        }
      })
      reader.readAsText(file)
    }
    for (var i = 0; i < n; ++i) { loadFile(files[i], i) }
  } else { // Normal drop
    // Don't do a replace if the drop happened inside of the selected text.
    if (cm.state.draggingText && cm.doc.sel.contains(pos) > -1) {
      cm.state.draggingText(e)
      // Ensure the editor is re-focused
      setTimeout(function () { return cm.display.input.focus(); }, 20)
      return
    }
    try {
      var text$1 = e.dataTransfer.getData("Text")
      if (text$1) {
        var selected
        if (cm.state.draggingText && !cm.state.draggingText.copy)
          { selected = cm.listSelections() }
        setSelectionNoUndo(cm.doc, simpleSelection(pos, pos))
        if (selected) { for (var i$1 = 0; i$1 < selected.length; ++i$1)
          { replaceRange(cm.doc, "", selected[i$1].anchor, selected[i$1].head, "drag") } }
        cm.replaceSelection(text$1, "around", "paste")
        cm.display.input.focus()
      }
    }
    catch(e){}
  }
}

function onDragStart(cm, e) {
  if (ie && (!cm.state.draggingText || +new Date - lastDrop < 100)) { e_stop(e); return }
  if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e)) { return }

  e.dataTransfer.setData("Text", cm.getSelection())
  e.dataTransfer.effectAllowed = "copyMove"

  // Use dummy image instead of default browsers image.
  // Recent Safari (~6.0.2) have a tendency to segfault when this happens, so we don't do it there.
  if (e.dataTransfer.setDragImage && !safari) {
    var img = elt("img", null, null, "position: fixed; left: 0; top: 0;")
    img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
    if (presto) {
      img.width = img.height = 1
      cm.display.wrapper.appendChild(img)
      // Force a relayout, or Opera won't use our image for some obscure reason
      img._top = img.offsetTop
    }
    e.dataTransfer.setDragImage(img, 0, 0)
    if (presto) { img.parentNode.removeChild(img) }
  }
}

function onDragOver(cm, e) {
  var pos = posFromMouse(cm, e)
  if (!pos) { return }
  var frag = document.createDocumentFragment()
  drawSelectionCursor(cm, pos, frag)
  if (!cm.display.dragCursor) {
    cm.display.dragCursor = elt("div", null, "CodeMirror-cursors CodeMirror-dragcursors")
    cm.display.lineSpace.insertBefore(cm.display.dragCursor, cm.display.cursorDiv)
  }
  removeChildrenAndAdd(cm.display.dragCursor, frag)
}

function clearDragCursor(cm) {
  if (cm.display.dragCursor) {
    cm.display.lineSpace.removeChild(cm.display.dragCursor)
    cm.display.dragCursor = null
  }
}

// These must be handled carefully, because naively registering a
// handler for each editor will cause the editors to never be
// garbage collected.

function forEachCodeMirror(f) {
  if (!document.body.getElementsByClassName) { return }
  var byClass = document.body.getElementsByClassName("CodeMirror")
  for (var i = 0; i < byClass.length; i++) {
    var cm = byClass[i].CodeMirror
    if (cm) { f(cm) }
  }
}

var globalsRegistered = false
function ensureGlobalHandlers() {
  if (globalsRegistered) { return }
  registerGlobalHandlers()
  globalsRegistered = true
}
function registerGlobalHandlers() {
  // When the window resizes, we need to refresh active editors.
  var resizeTimer
  on(window, "resize", function () {
    if (resizeTimer == null) { resizeTimer = setTimeout(function () {
      resizeTimer = null
      forEachCodeMirror(onResize)
    }, 100) }
  })
  // When the window loses focus, we want to show the editor as blurred
  on(window, "blur", function () { return forEachCodeMirror(onBlur); })
}
// Called when the window resizes
function onResize(cm) {
  var d = cm.display
  if (d.lastWrapHeight == d.wrapper.clientHeight && d.lastWrapWidth == d.wrapper.clientWidth)
    { return }
  // Might be a text scaling operation, clear size caches.
  d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null
  d.scrollbarsClipped = false
  cm.setSize()
}

var keyNames = {
  3: "Enter", 8: "Backspace", 9: "Tab", 13: "Enter", 16: "Shift", 17: "Ctrl", 18: "Alt",
  19: "Pause", 20: "CapsLock", 27: "Esc", 32: "Space", 33: "PageUp", 34: "PageDown", 35: "End",
  36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 44: "PrintScrn", 45: "Insert",
  46: "Delete", 59: ";", 61: "=", 91: "Mod", 92: "Mod", 93: "Mod",
  106: "*", 107: "=", 109: "-", 110: ".", 111: "/", 127: "Delete",
  173: "-", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\",
  221: "]", 222: "'", 63232: "Up", 63233: "Down", 63234: "Left", 63235: "Right", 63272: "Delete",
  63273: "Home", 63275: "End", 63276: "PageUp", 63277: "PageDown", 63302: "Insert"
}

// Number keys
for (var i = 0; i < 10; i++) { keyNames[i + 48] = keyNames[i + 96] = String(i) }
// Alphabetic keys
for (var i$1 = 65; i$1 <= 90; i$1++) { keyNames[i$1] = String.fromCharCode(i$1) }
// Function keys
for (var i$2 = 1; i$2 <= 12; i$2++) { keyNames[i$2 + 111] = keyNames[i$2 + 63235] = "F" + i$2 }

var keyMap = {}

keyMap.basic = {
  "Left": "goCharLeft", "Right": "goCharRight", "Up": "goLineUp", "Down": "goLineDown",
  "End": "goLineEnd", "Home": "goLineStartSmart", "PageUp": "goPageUp", "PageDown": "goPageDown",
  "Delete": "delCharAfter", "Backspace": "delCharBefore", "Shift-Backspace": "delCharBefore",
  "Tab": "defaultTab", "Shift-Tab": "indentAuto",
  "Enter": "newlineAndIndent", "Insert": "toggleOverwrite",
  "Esc": "singleSelection"
}
// Note that the save and find-related commands aren't defined by
// default. User code or addons can define them. Unknown commands
// are simply ignored.
keyMap.pcDefault = {
  "Ctrl-A": "selectAll", "Ctrl-D": "deleteLine", "Ctrl-Z": "undo", "Shift-Ctrl-Z": "redo", "Ctrl-Y": "redo",
  "Ctrl-Home": "goDocStart", "Ctrl-End": "goDocEnd", "Ctrl-Up": "goLineUp", "Ctrl-Down": "goLineDown",
  "Ctrl-Left": "goGroupLeft", "Ctrl-Right": "goGroupRight", "Alt-Left": "goLineStart", "Alt-Right": "goLineEnd",
  "Ctrl-Backspace": "delGroupBefore", "Ctrl-Delete": "delGroupAfter", "Ctrl-S": "save", "Ctrl-F": "find",
  "Ctrl-G": "findNext", "Shift-Ctrl-G": "findPrev", "Shift-Ctrl-F": "replace", "Shift-Ctrl-R": "replaceAll",
  "Ctrl-[": "indentLess", "Ctrl-]": "indentMore",
  "Ctrl-U": "undoSelection", "Shift-Ctrl-U": "redoSelection", "Alt-U": "redoSelection",
  fallthrough: "basic"
}
// Very basic readline/emacs-style bindings, which are standard on Mac.
keyMap.emacsy = {
  "Ctrl-F": "goCharRight", "Ctrl-B": "goCharLeft", "Ctrl-P": "goLineUp", "Ctrl-N": "goLineDown",
  "Alt-F": "goWordRight", "Alt-B": "goWordLeft", "Ctrl-A": "goLineStart", "Ctrl-E": "goLineEnd",
  "Ctrl-V": "goPageDown", "Shift-Ctrl-V": "goPageUp", "Ctrl-D": "delCharAfter", "Ctrl-H": "delCharBefore",
  "Alt-D": "delWordAfter", "Alt-Backspace": "delWordBefore", "Ctrl-K": "killLine", "Ctrl-T": "transposeChars",
  "Ctrl-O": "openLine"
}
keyMap.macDefault = {
  "Cmd-A": "selectAll", "Cmd-D": "deleteLine", "Cmd-Z": "undo", "Shift-Cmd-Z": "redo", "Cmd-Y": "redo",
  "Cmd-Home": "goDocStart", "Cmd-Up": "goDocStart", "Cmd-End": "goDocEnd", "Cmd-Down": "goDocEnd", "Alt-Left": "goGroupLeft",
  "Alt-Right": "goGroupRight", "Cmd-Left": "goLineLeft", "Cmd-Right": "goLineRight", "Alt-Backspace": "delGroupBefore",
  "Ctrl-Alt-Backspace": "delGroupAfter", "Alt-Delete": "delGroupAfter", "Cmd-S": "save", "Cmd-F": "find",
  "Cmd-G": "findNext", "Shift-Cmd-G": "findPrev", "Cmd-Alt-F": "replace", "Shift-Cmd-Alt-F": "replaceAll",
  "Cmd-[": "indentLess", "Cmd-]": "indentMore", "Cmd-Backspace": "delWrappedLineLeft", "Cmd-Delete": "delWrappedLineRight",
  "Cmd-U": "undoSelection", "Shift-Cmd-U": "redoSelection", "Ctrl-Up": "goDocStart", "Ctrl-Down": "goDocEnd",
  fallthrough: ["basic", "emacsy"]
}
keyMap["default"] = mac ? keyMap.macDefault : keyMap.pcDefault

// KEYMAP DISPATCH

function normalizeKeyName(name) {
  var parts = name.split(/-(?!$)/)
  name = parts[parts.length - 1]
  var alt, ctrl, shift, cmd
  for (var i = 0; i < parts.length - 1; i++) {
    var mod = parts[i]
    if (/^(cmd|meta|m)$/i.test(mod)) { cmd = true }
    else if (/^a(lt)?$/i.test(mod)) { alt = true }
    else if (/^(c|ctrl|control)$/i.test(mod)) { ctrl = true }
    else if (/^s(hift)?$/i.test(mod)) { shift = true }
    else { throw new Error("Unrecognized modifier name: " + mod) }
  }
  if (alt) { name = "Alt-" + name }
  if (ctrl) { name = "Ctrl-" + name }
  if (cmd) { name = "Cmd-" + name }
  if (shift) { name = "Shift-" + name }
  return name
}

// This is a kludge to keep keymaps mostly working as raw objects
// (backwards compatibility) while at the same time support features
// like normalization and multi-stroke key bindings. It compiles a
// new normalized keymap, and then updates the old object to reflect
// this.
function normalizeKeyMap(keymap) {
  var copy = {}
  for (var keyname in keymap) { if (keymap.hasOwnProperty(keyname)) {
    var value = keymap[keyname]
    if (/^(name|fallthrough|(de|at)tach)$/.test(keyname)) { continue }
    if (value == "...") { delete keymap[keyname]; continue }

    var keys = map(keyname.split(" "), normalizeKeyName)
    for (var i = 0; i < keys.length; i++) {
      var val = (void 0), name = (void 0)
      if (i == keys.length - 1) {
        name = keys.join(" ")
        val = value
      } else {
        name = keys.slice(0, i + 1).join(" ")
        val = "..."
      }
      var prev = copy[name]
      if (!prev) { copy[name] = val }
      else if (prev != val) { throw new Error("Inconsistent bindings for " + name) }
    }
    delete keymap[keyname]
  } }
  for (var prop in copy) { keymap[prop] = copy[prop] }
  return keymap
}

function lookupKey(key, map, handle, context) {
  map = getKeyMap(map)
  var found = map.call ? map.call(key, context) : map[key]
  if (found === false) { return "nothing" }
  if (found === "...") { return "multi" }
  if (found != null && handle(found)) { return "handled" }

  if (map.fallthrough) {
    if (Object.prototype.toString.call(map.fallthrough) != "[object Array]")
      { return lookupKey(key, map.fallthrough, handle, context) }
    for (var i = 0; i < map.fallthrough.length; i++) {
      var result = lookupKey(key, map.fallthrough[i], handle, context)
      if (result) { return result }
    }
  }
}

// Modifier key presses don't count as 'real' key presses for the
// purpose of keymap fallthrough.
function isModifierKey(value) {
  var name = typeof value == "string" ? value : keyNames[value.keyCode]
  return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod"
}

// Look up the name of a key as indicated by an event object.
function keyName(event, noShift) {
  if (presto && event.keyCode == 34 && event["char"]) { return false }
  var base = keyNames[event.keyCode], name = base
  if (name == null || event.altGraphKey) { return false }
  if (event.altKey && base != "Alt") { name = "Alt-" + name }
  if ((flipCtrlCmd ? event.metaKey : event.ctrlKey) && base != "Ctrl") { name = "Ctrl-" + name }
  if ((flipCtrlCmd ? event.ctrlKey : event.metaKey) && base != "Cmd") { name = "Cmd-" + name }
  if (!noShift && event.shiftKey && base != "Shift") { name = "Shift-" + name }
  return name
}

function getKeyMap(val) {
  return typeof val == "string" ? keyMap[val] : val
}

// Helper for deleting text near the selection(s), used to implement
// backspace, delete, and similar functionality.
function deleteNearSelection(cm, compute) {
  var ranges = cm.doc.sel.ranges, kill = []
  // Build up a set of ranges to kill first, merging overlapping
  // ranges.
  for (var i = 0; i < ranges.length; i++) {
    var toKill = compute(ranges[i])
    while (kill.length && cmp(toKill.from, lst(kill).to) <= 0) {
      var replaced = kill.pop()
      if (cmp(replaced.from, toKill.from) < 0) {
        toKill.from = replaced.from
        break
      }
    }
    kill.push(toKill)
  }
  // Next, remove those actual ranges.
  runInOp(cm, function () {
    for (var i = kill.length - 1; i >= 0; i--)
      { replaceRange(cm.doc, "", kill[i].from, kill[i].to, "+delete") }
    ensureCursorVisible(cm)
  })
}

// Commands are parameter-less actions that can be performed on an
// editor, mostly used for keybindings.
var commands = {
  selectAll: selectAll,
  singleSelection: function (cm) { return cm.setSelection(cm.getCursor("anchor"), cm.getCursor("head"), sel_dontScroll); },
  killLine: function (cm) { return deleteNearSelection(cm, function (range) {
    if (range.empty()) {
      var len = getLine(cm.doc, range.head.line).text.length
      if (range.head.ch == len && range.head.line < cm.lastLine())
        { return {from: range.head, to: Pos(range.head.line + 1, 0)} }
      else
        { return {from: range.head, to: Pos(range.head.line, len)} }
    } else {
      return {from: range.from(), to: range.to()}
    }
  }); },
  deleteLine: function (cm) { return deleteNearSelection(cm, function (range) { return ({
    from: Pos(range.from().line, 0),
    to: clipPos(cm.doc, Pos(range.to().line + 1, 0))
  }); }); },
  delLineLeft: function (cm) { return deleteNearSelection(cm, function (range) { return ({
    from: Pos(range.from().line, 0), to: range.from()
  }); }); },
  delWrappedLineLeft: function (cm) { return deleteNearSelection(cm, function (range) {
    var top = cm.charCoords(range.head, "div").top + 5
    var leftPos = cm.coordsChar({left: 0, top: top}, "div")
    return {from: leftPos, to: range.from()}
  }); },
  delWrappedLineRight: function (cm) { return deleteNearSelection(cm, function (range) {
    var top = cm.charCoords(range.head, "div").top + 5
    var rightPos = cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div")
    return {from: range.from(), to: rightPos }
  }); },
  undo: function (cm) { return cm.undo(); },
  redo: function (cm) { return cm.redo(); },
  undoSelection: function (cm) { return cm.undoSelection(); },
  redoSelection: function (cm) { return cm.redoSelection(); },
  goDocStart: function (cm) { return cm.extendSelection(Pos(cm.firstLine(), 0)); },
  goDocEnd: function (cm) { return cm.extendSelection(Pos(cm.lastLine())); },
  goLineStart: function (cm) { return cm.extendSelectionsBy(function (range) { return lineStart(cm, range.head.line); },
    {origin: "+move", bias: 1}
  ); },
  goLineStartSmart: function (cm) { return cm.extendSelectionsBy(function (range) { return lineStartSmart(cm, range.head); },
    {origin: "+move", bias: 1}
  ); },
  goLineEnd: function (cm) { return cm.extendSelectionsBy(function (range) { return lineEnd(cm, range.head.line); },
    {origin: "+move", bias: -1}
  ); },
  goLineRight: function (cm) { return cm.extendSelectionsBy(function (range) {
    var top = cm.charCoords(range.head, "div").top + 5
    return cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div")
  }, sel_move); },
  goLineLeft: function (cm) { return cm.extendSelectionsBy(function (range) {
    var top = cm.charCoords(range.head, "div").top + 5
    return cm.coordsChar({left: 0, top: top}, "div")
  }, sel_move); },
  goLineLeftSmart: function (cm) { return cm.extendSelectionsBy(function (range) {
    var top = cm.charCoords(range.head, "div").top + 5
    var pos = cm.coordsChar({left: 0, top: top}, "div")
    if (pos.ch < cm.getLine(pos.line).search(/\S/)) { return lineStartSmart(cm, range.head) }
    return pos
  }, sel_move); },
  goLineUp: function (cm) { return cm.moveV(-1, "line"); },
  goLineDown: function (cm) { return cm.moveV(1, "line"); },
  goPageUp: function (cm) { return cm.moveV(-1, "page"); },
  goPageDown: function (cm) { return cm.moveV(1, "page"); },
  goCharLeft: function (cm) { return cm.moveH(-1, "char"); },
  goCharRight: function (cm) { return cm.moveH(1, "char"); },
  goColumnLeft: function (cm) { return cm.moveH(-1, "column"); },
  goColumnRight: function (cm) { return cm.moveH(1, "column"); },
  goWordLeft: function (cm) { return cm.moveH(-1, "word"); },
  goGroupRight: function (cm) { return cm.moveH(1, "group"); },
  goGroupLeft: function (cm) { return cm.moveH(-1, "group"); },
  goWordRight: function (cm) { return cm.moveH(1, "word"); },
  delCharBefore: function (cm) { return cm.deleteH(-1, "char"); },
  delCharAfter: function (cm) { return cm.deleteH(1, "char"); },
  delWordBefore: function (cm) { return cm.deleteH(-1, "word"); },
  delWordAfter: function (cm) { return cm.deleteH(1, "word"); },
  delGroupBefore: function (cm) { return cm.deleteH(-1, "group"); },
  delGroupAfter: function (cm) { return cm.deleteH(1, "group"); },
  indentAuto: function (cm) { return cm.indentSelection("smart"); },
  indentMore: function (cm) { return cm.indentSelection("add"); },
  indentLess: function (cm) { return cm.indentSelection("subtract"); },
  insertTab: function (cm) { return cm.replaceSelection("\t"); },
  insertSoftTab: function (cm) {
    var spaces = [], ranges = cm.listSelections(), tabSize = cm.options.tabSize
    for (var i = 0; i < ranges.length; i++) {
      var pos = ranges[i].from()
      var col = countColumn(cm.getLine(pos.line), pos.ch, tabSize)
      spaces.push(spaceStr(tabSize - col % tabSize))
    }
    cm.replaceSelections(spaces)
  },
  defaultTab: function (cm) {
    if (cm.somethingSelected()) { cm.indentSelection("add") }
    else { cm.execCommand("insertTab") }
  },
  // Swap the two chars left and right of each selection's head.
  // Move cursor behind the two swapped characters afterwards.
  //
  // Doesn't consider line feeds a character.
  // Doesn't scan more than one line above to find a character.
  // Doesn't do anything on an empty line.
  // Doesn't do anything with non-empty selections.
  transposeChars: function (cm) { return runInOp(cm, function () {
    var ranges = cm.listSelections(), newSel = []
    for (var i = 0; i < ranges.length; i++) {
      if (!ranges[i].empty()) { continue }
      var cur = ranges[i].head, line = getLine(cm.doc, cur.line).text
      if (line) {
        if (cur.ch == line.length) { cur = new Pos(cur.line, cur.ch - 1) }
        if (cur.ch > 0) {
          cur = new Pos(cur.line, cur.ch + 1)
          cm.replaceRange(line.charAt(cur.ch - 1) + line.charAt(cur.ch - 2),
                          Pos(cur.line, cur.ch - 2), cur, "+transpose")
        } else if (cur.line > cm.doc.first) {
          var prev = getLine(cm.doc, cur.line - 1).text
          if (prev) {
            cur = new Pos(cur.line, 1)
            cm.replaceRange(line.charAt(0) + cm.doc.lineSeparator() +
                            prev.charAt(prev.length - 1),
                            Pos(cur.line - 1, prev.length - 1), cur, "+transpose")
          }
        }
      }
      newSel.push(new Range(cur, cur))
    }
    cm.setSelections(newSel)
  }); },
  newlineAndIndent: function (cm) { return runInOp(cm, function () {
    var sels = cm.listSelections()
    for (var i = sels.length - 1; i >= 0; i--)
      { cm.replaceRange(cm.doc.lineSeparator(), sels[i].anchor, sels[i].head, "+input") }
    sels = cm.listSelections()
    for (var i$1 = 0; i$1 < sels.length; i$1++)
      { cm.indentLine(sels[i$1].from().line, null, true) }
    ensureCursorVisible(cm)
  }); },
  openLine: function (cm) { return cm.replaceSelection("\n", "start"); },
  toggleOverwrite: function (cm) { return cm.toggleOverwrite(); }
}


function lineStart(cm, lineN) {
  var line = getLine(cm.doc, lineN)
  var visual = visualLine(line)
  if (visual != line) { lineN = lineNo(visual) }
  var order = getOrder(visual)
  var ch = !order ? 0 : order[0].level % 2 ? lineRight(visual) : lineLeft(visual)
  return Pos(lineN, ch)
}
function lineEnd(cm, lineN) {
  var merged, line = getLine(cm.doc, lineN)
  while (merged = collapsedSpanAtEnd(line)) {
    line = merged.find(1, true).line
    lineN = null
  }
  var order = getOrder(line)
  var ch = !order ? line.text.length : order[0].level % 2 ? lineLeft(line) : lineRight(line)
  return Pos(lineN == null ? lineNo(line) : lineN, ch)
}
function lineStartSmart(cm, pos) {
  var start = lineStart(cm, pos.line)
  var line = getLine(cm.doc, start.line)
  var order = getOrder(line)
  if (!order || order[0].level == 0) {
    var firstNonWS = Math.max(0, line.text.search(/\S/))
    var inWS = pos.line == start.line && pos.ch <= firstNonWS && pos.ch
    return Pos(start.line, inWS ? 0 : firstNonWS)
  }
  return start
}

// Run a handler that was bound to a key.
function doHandleBinding(cm, bound, dropShift) {
  if (typeof bound == "string") {
    bound = commands[bound]
    if (!bound) { return false }
  }
  // Ensure previous input has been read, so that the handler sees a
  // consistent view of the document
  cm.display.input.ensurePolled()
  var prevShift = cm.display.shift, done = false
  try {
    if (cm.isReadOnly()) { cm.state.suppressEdits = true }
    if (dropShift) { cm.display.shift = false }
    done = bound(cm) != Pass
  } finally {
    cm.display.shift = prevShift
    cm.state.suppressEdits = false
  }
  return done
}

function lookupKeyForEditor(cm, name, handle) {
  for (var i = 0; i < cm.state.keyMaps.length; i++) {
    var result = lookupKey(name, cm.state.keyMaps[i], handle, cm)
    if (result) { return result }
  }
  return (cm.options.extraKeys && lookupKey(name, cm.options.extraKeys, handle, cm))
    || lookupKey(name, cm.options.keyMap, handle, cm)
}

var stopSeq = new Delayed
function dispatchKey(cm, name, e, handle) {
  var seq = cm.state.keySeq
  if (seq) {
    if (isModifierKey(name)) { return "handled" }
    stopSeq.set(50, function () {
      if (cm.state.keySeq == seq) {
        cm.state.keySeq = null
        cm.display.input.reset()
      }
    })
    name = seq + " " + name
  }
  var result = lookupKeyForEditor(cm, name, handle)

  if (result == "multi")
    { cm.state.keySeq = name }
  if (result == "handled")
    { signalLater(cm, "keyHandled", cm, name, e) }

  if (result == "handled" || result == "multi") {
    e_preventDefault(e)
    restartBlink(cm)
  }

  if (seq && !result && /\'$/.test(name)) {
    e_preventDefault(e)
    return true
  }
  return !!result
}

// Handle a key from the keydown event.
function handleKeyBinding(cm, e) {
  var name = keyName(e, true)
  if (!name) { return false }

  if (e.shiftKey && !cm.state.keySeq) {
    // First try to resolve full name (including 'Shift-'). Failing
    // that, see if there is a cursor-motion command (starting with
    // 'go') bound to the keyname without 'Shift-'.
    return dispatchKey(cm, "Shift-" + name, e, function (b) { return doHandleBinding(cm, b, true); })
        || dispatchKey(cm, name, e, function (b) {
             if (typeof b == "string" ? /^go[A-Z]/.test(b) : b.motion)
               { return doHandleBinding(cm, b) }
           })
  } else {
    return dispatchKey(cm, name, e, function (b) { return doHandleBinding(cm, b); })
  }
}

// Handle a key from the keypress event
function handleCharBinding(cm, e, ch) {
  return dispatchKey(cm, "'" + ch + "'", e, function (b) { return doHandleBinding(cm, b, true); })
}

var lastStoppedKey = null
function onKeyDown(e) {
  var cm = this
  cm.curOp.focus = activeElt()
  if (signalDOMEvent(cm, e)) { return }
  // IE does strange things with escape.
  if (ie && ie_version < 11 && e.keyCode == 27) { e.returnValue = false }
  var code = e.keyCode
  cm.display.shift = code == 16 || e.shiftKey
  var handled = handleKeyBinding(cm, e)
  if (presto) {
    lastStoppedKey = handled ? code : null
    // Opera has no cut event... we try to at least catch the key combo
    if (!handled && code == 88 && !hasCopyEvent && (mac ? e.metaKey : e.ctrlKey))
      { cm.replaceSelection("", null, "cut") }
  }

  // Turn mouse into crosshair when Alt is held on Mac.
  if (code == 18 && !/\bCodeMirror-crosshair\b/.test(cm.display.lineDiv.className))
    { showCrossHair(cm) }
}

function showCrossHair(cm) {
  var lineDiv = cm.display.lineDiv
  addClass(lineDiv, "CodeMirror-crosshair")

  function up(e) {
    if (e.keyCode == 18 || !e.altKey) {
      rmClass(lineDiv, "CodeMirror-crosshair")
      off(document, "keyup", up)
      off(document, "mouseover", up)
    }
  }
  on(document, "keyup", up)
  on(document, "mouseover", up)
}

function onKeyUp(e) {
  if (e.keyCode == 16) { this.doc.sel.shift = false }
  signalDOMEvent(this, e)
}

function onKeyPress(e) {
  var cm = this
  if (eventInWidget(cm.display, e) || signalDOMEvent(cm, e) || e.ctrlKey && !e.altKey || mac && e.metaKey) { return }
  var keyCode = e.keyCode, charCode = e.charCode
  if (presto && keyCode == lastStoppedKey) {lastStoppedKey = null; e_preventDefault(e); return}
  if ((presto && (!e.which || e.which < 10)) && handleKeyBinding(cm, e)) { return }
  var ch = String.fromCharCode(charCode == null ? keyCode : charCode)
  // Some browsers fire keypress events for backspace
  if (ch == "\x08") { return }
  if (handleCharBinding(cm, e, ch)) { return }
  cm.display.input.onKeyPress(e)
}

// A mouse down can be a single click, double click, triple click,
// start of selection drag, start of text drag, new cursor
// (ctrl-click), rectangle drag (alt-drag), or xwin
// middle-click-paste. Or it might be a click on something we should
// not interfere with, such as a scrollbar or widget.
function onMouseDown(e) {
  var cm = this, display = cm.display
  if (signalDOMEvent(cm, e) || display.activeTouch && display.input.supportsTouch()) { return }
  display.input.ensurePolled()
  display.shift = e.shiftKey

  if (eventInWidget(display, e)) {
    if (!webkit) {
      // Briefly turn off draggability, to allow widgets to do
      // normal dragging things.
      display.scroller.draggable = false
      setTimeout(function () { return display.scroller.draggable = true; }, 100)
    }
    return
  }
  if (clickInGutter(cm, e)) { return }
  var start = posFromMouse(cm, e)
  window.focus()

  switch (e_button(e)) {
  case 1:
    // #3261: make sure, that we're not starting a second selection
    if (cm.state.selectingText)
      { cm.state.selectingText(e) }
    else if (start)
      { leftButtonDown(cm, e, start) }
    else if (e_target(e) == display.scroller)
      { e_preventDefault(e) }
    break
  case 2:
    if (webkit) { cm.state.lastMiddleDown = +new Date }
    if (start) { extendSelection(cm.doc, start) }
    setTimeout(function () { return display.input.focus(); }, 20)
    e_preventDefault(e)
    break
  case 3:
    if (captureRightClick) { onContextMenu(cm, e) }
    else { delayBlurEvent(cm) }
    break
  }
}

var lastClick;
var lastDoubleClick;
function leftButtonDown(cm, e, start) {
  if (ie) { setTimeout(bind(ensureFocus, cm), 0) }
  else { cm.curOp.focus = activeElt() }

  var now = +new Date, type
  if (lastDoubleClick && lastDoubleClick.time > now - 400 && cmp(lastDoubleClick.pos, start) == 0) {
    type = "triple"
  } else if (lastClick && lastClick.time > now - 400 && cmp(lastClick.pos, start) == 0) {
    type = "double"
    lastDoubleClick = {time: now, pos: start}
  } else {
    type = "single"
    lastClick = {time: now, pos: start}
  }

  var sel = cm.doc.sel, modifier = mac ? e.metaKey : e.ctrlKey, contained
  if (cm.options.dragDrop && dragAndDrop && !cm.isReadOnly() &&
      type == "single" && (contained = sel.contains(start)) > -1 &&
      (cmp((contained = sel.ranges[contained]).from(), start) < 0 || start.xRel > 0) &&
      (cmp(contained.to(), start) > 0 || start.xRel < 0))
    { leftButtonStartDrag(cm, e, start, modifier) }
  else
    { leftButtonSelect(cm, e, start, type, modifier) }
}

// Start a text drag. When it ends, see if any dragging actually
// happen, and treat as a click if it didn't.
function leftButtonStartDrag(cm, e, start, modifier) {
  var display = cm.display, startTime = +new Date
  var dragEnd = operation(cm, function (e2) {
    if (webkit) { display.scroller.draggable = false }
    cm.state.draggingText = false
    off(document, "mouseup", dragEnd)
    off(display.scroller, "drop", dragEnd)
    if (Math.abs(e.clientX - e2.clientX) + Math.abs(e.clientY - e2.clientY) < 10) {
      e_preventDefault(e2)
      if (!modifier && +new Date - 200 < startTime)
        { extendSelection(cm.doc, start) }
      // Work around unexplainable focus problem in IE9 (#2127) and Chrome (#3081)
      if (webkit || ie && ie_version == 9)
        { setTimeout(function () {document.body.focus(); display.input.focus()}, 20) }
      else
        { display.input.focus() }
    }
  })
  // Let the drag handler handle this.
  if (webkit) { display.scroller.draggable = true }
  cm.state.draggingText = dragEnd
  dragEnd.copy = mac ? e.altKey : e.ctrlKey
  // IE's approach to draggable
  if (display.scroller.dragDrop) { display.scroller.dragDrop() }
  on(document, "mouseup", dragEnd)
  on(display.scroller, "drop", dragEnd)
}

// Normal selection, as opposed to text dragging.
function leftButtonSelect(cm, e, start, type, addNew) {
  var display = cm.display, doc = cm.doc
  e_preventDefault(e)

  var ourRange, ourIndex, startSel = doc.sel, ranges = startSel.ranges
  if (addNew && !e.shiftKey) {
    ourIndex = doc.sel.contains(start)
    if (ourIndex > -1)
      { ourRange = ranges[ourIndex] }
    else
      { ourRange = new Range(start, start) }
  } else {
    ourRange = doc.sel.primary()
    ourIndex = doc.sel.primIndex
  }

  if (chromeOS ? e.shiftKey && e.metaKey : e.altKey) {
    type = "rect"
    if (!addNew) { ourRange = new Range(start, start) }
    start = posFromMouse(cm, e, true, true)
    ourIndex = -1
  } else if (type == "double") {
    var word = cm.findWordAt(start)
    if (cm.display.shift || doc.extend)
      { ourRange = extendRange(doc, ourRange, word.anchor, word.head) }
    else
      { ourRange = word }
  } else if (type == "triple") {
    var line = new Range(Pos(start.line, 0), clipPos(doc, Pos(start.line + 1, 0)))
    if (cm.display.shift || doc.extend)
      { ourRange = extendRange(doc, ourRange, line.anchor, line.head) }
    else
      { ourRange = line }
  } else {
    ourRange = extendRange(doc, ourRange, start)
  }

  if (!addNew) {
    ourIndex = 0
    setSelection(doc, new Selection([ourRange], 0), sel_mouse)
    startSel = doc.sel
  } else if (ourIndex == -1) {
    ourIndex = ranges.length
    setSelection(doc, normalizeSelection(ranges.concat([ourRange]), ourIndex),
                 {scroll: false, origin: "*mouse"})
  } else if (ranges.length > 1 && ranges[ourIndex].empty() && type == "single" && !e.shiftKey) {
    setSelection(doc, normalizeSelection(ranges.slice(0, ourIndex).concat(ranges.slice(ourIndex + 1)), 0),
                 {scroll: false, origin: "*mouse"})
    startSel = doc.sel
  } else {
    replaceOneSelection(doc, ourIndex, ourRange, sel_mouse)
  }

  var lastPos = start
  function extendTo(pos) {
    if (cmp(lastPos, pos) == 0) { return }
    lastPos = pos

    if (type == "rect") {
      var ranges = [], tabSize = cm.options.tabSize
      var startCol = countColumn(getLine(doc, start.line).text, start.ch, tabSize)
      var posCol = countColumn(getLine(doc, pos.line).text, pos.ch, tabSize)
      var left = Math.min(startCol, posCol), right = Math.max(startCol, posCol)
      for (var line = Math.min(start.line, pos.line), end = Math.min(cm.lastLine(), Math.max(start.line, pos.line));
           line <= end; line++) {
        var text = getLine(doc, line).text, leftPos = findColumn(text, left, tabSize)
        if (left == right)
          { ranges.push(new Range(Pos(line, leftPos), Pos(line, leftPos))) }
        else if (text.length > leftPos)
          { ranges.push(new Range(Pos(line, leftPos), Pos(line, findColumn(text, right, tabSize)))) }
      }
      if (!ranges.length) { ranges.push(new Range(start, start)) }
      setSelection(doc, normalizeSelection(startSel.ranges.slice(0, ourIndex).concat(ranges), ourIndex),
                   {origin: "*mouse", scroll: false})
      cm.scrollIntoView(pos)
    } else {
      var oldRange = ourRange
      var anchor = oldRange.anchor, head = pos
      if (type != "single") {
        var range
        if (type == "double")
          { range = cm.findWordAt(pos) }
        else
          { range = new Range(Pos(pos.line, 0), clipPos(doc, Pos(pos.line + 1, 0))) }
        if (cmp(range.anchor, anchor) > 0) {
          head = range.head
          anchor = minPos(oldRange.from(), range.anchor)
        } else {
          head = range.anchor
          anchor = maxPos(oldRange.to(), range.head)
        }
      }
      var ranges$1 = startSel.ranges.slice(0)
      ranges$1[ourIndex] = new Range(clipPos(doc, anchor), head)
      setSelection(doc, normalizeSelection(ranges$1, ourIndex), sel_mouse)
    }
  }

  var editorSize = display.wrapper.getBoundingClientRect()
  // Used to ensure timeout re-tries don't fire when another extend
  // happened in the meantime (clearTimeout isn't reliable -- at
  // least on Chrome, the timeouts still happen even when cleared,
  // if the clear happens after their scheduled firing time).
  var counter = 0

  function extend(e) {
    var curCount = ++counter
    var cur = posFromMouse(cm, e, true, type == "rect")
    if (!cur) { return }
    if (cmp(cur, lastPos) != 0) {
      cm.curOp.focus = activeElt()
      extendTo(cur)
      var visible = visibleLines(display, doc)
      if (cur.line >= visible.to || cur.line < visible.from)
        { setTimeout(operation(cm, function () {if (counter == curCount) { extend(e) }}), 150) }
    } else {
      var outside = e.clientY < editorSize.top ? -20 : e.clientY > editorSize.bottom ? 20 : 0
      if (outside) { setTimeout(operation(cm, function () {
        if (counter != curCount) { return }
        display.scroller.scrollTop += outside
        extend(e)
      }), 50) }
    }
  }

  function done(e) {
    cm.state.selectingText = false
    counter = Infinity
    e_preventDefault(e)
    display.input.focus()
    off(document, "mousemove", move)
    off(document, "mouseup", up)
    doc.history.lastSelOrigin = null
  }

  var move = operation(cm, function (e) {
    if (!e_button(e)) { done(e) }
    else { extend(e) }
  })
  var up = operation(cm, done)
  cm.state.selectingText = up
  on(document, "mousemove", move)
  on(document, "mouseup", up)
}


// Determines whether an event happened in the gutter, and fires the
// handlers for the corresponding event.
function gutterEvent(cm, e, type, prevent) {
  var mX, mY
  try { mX = e.clientX; mY = e.clientY }
  catch(e) { return false }
  if (mX >= Math.floor(cm.display.gutters.getBoundingClientRect().right)) { return false }
  if (prevent) { e_preventDefault(e) }

  var display = cm.display
  var lineBox = display.lineDiv.getBoundingClientRect()

  if (mY > lineBox.bottom || !hasHandler(cm, type)) { return e_defaultPrevented(e) }
  mY -= lineBox.top - display.viewOffset

  for (var i = 0; i < cm.options.gutters.length; ++i) {
    var g = display.gutters.childNodes[i]
    if (g && g.getBoundingClientRect().right >= mX) {
      var line = lineAtHeight(cm.doc, mY)
      var gutter = cm.options.gutters[i]
      signal(cm, type, cm, line, gutter, e)
      return e_defaultPrevented(e)
    }
  }
}

function clickInGutter(cm, e) {
  return gutterEvent(cm, e, "gutterClick", true)
}

// CONTEXT MENU HANDLING

// To make the context menu work, we need to briefly unhide the
// textarea (making it as unobtrusive as possible) to let the
// right-click take effect on it.
function onContextMenu(cm, e) {
  if (eventInWidget(cm.display, e) || contextMenuInGutter(cm, e)) { return }
  if (signalDOMEvent(cm, e, "contextmenu")) { return }
  cm.display.input.onContextMenu(e)
}

function contextMenuInGutter(cm, e) {
  if (!hasHandler(cm, "gutterContextMenu")) { return false }
  return gutterEvent(cm, e, "gutterContextMenu", false)
}

function themeChanged(cm) {
  cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-s-\S+/g, "") +
    cm.options.theme.replace(/(^|\s)\s*/g, " cm-s-")
  clearCaches(cm)
}

var Init = {toString: function(){return "CodeMirror.Init"}}

var defaults = {}
var optionHandlers = {}

function defineOptions(CodeMirror) {
  var optionHandlers = CodeMirror.optionHandlers

  function option(name, deflt, handle, notOnInit) {
    CodeMirror.defaults[name] = deflt
    if (handle) { optionHandlers[name] =
      notOnInit ? function (cm, val, old) {if (old != Init) { handle(cm, val, old) }} : handle }
  }

  CodeMirror.defineOption = option

  // Passed to option handlers when there is no old value.
  CodeMirror.Init = Init

  // These two are, on init, called from the constructor because they
  // have to be initialized before the editor can start at all.
  option("value", "", function (cm, val) { return cm.setValue(val); }, true)
  option("mode", null, function (cm, val) {
    cm.doc.modeOption = val
    loadMode(cm)
  }, true)

  option("indentUnit", 2, loadMode, true)
  option("indentWithTabs", false)
  option("smartIndent", true)
  option("tabSize", 4, function (cm) {
    resetModeState(cm)
    clearCaches(cm)
    regChange(cm)
  }, true)
  option("lineSeparator", null, function (cm, val) {
    cm.doc.lineSep = val
    if (!val) { return }
    var newBreaks = [], lineNo = cm.doc.first
    cm.doc.iter(function (line) {
      for (var pos = 0;;) {
        var found = line.text.indexOf(val, pos)
        if (found == -1) { break }
        pos = found + val.length
        newBreaks.push(Pos(lineNo, found))
      }
      lineNo++
    })
    for (var i = newBreaks.length - 1; i >= 0; i--)
      { replaceRange(cm.doc, val, newBreaks[i], Pos(newBreaks[i].line, newBreaks[i].ch + val.length)) }
  })
  option("specialChars", /[\u0000-\u001f\u007f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff]/g, function (cm, val, old) {
    cm.state.specialChars = new RegExp(val.source + (val.test("\t") ? "" : "|\t"), "g")
    if (old != Init) { cm.refresh() }
  })
  option("specialCharPlaceholder", defaultSpecialCharPlaceholder, function (cm) { return cm.refresh(); }, true)
  option("electricChars", true)
  option("inputStyle", mobile ? "contenteditable" : "textarea", function () {
    throw new Error("inputStyle can not (yet) be changed in a running editor") // FIXME
  }, true)
  option("spellcheck", false, function (cm, val) { return cm.getInputField().spellcheck = val; }, true)
  option("rtlMoveVisually", !windows)
  option("wholeLineUpdateBefore", true)

  option("theme", "default", function (cm) {
    themeChanged(cm)
    guttersChanged(cm)
  }, true)
  option("keyMap", "default", function (cm, val, old) {
    var next = getKeyMap(val)
    var prev = old != Init && getKeyMap(old)
    if (prev && prev.detach) { prev.detach(cm, next) }
    if (next.attach) { next.attach(cm, prev || null) }
  })
  option("extraKeys", null)

  option("lineWrapping", false, wrappingChanged, true)
  option("gutters", [], function (cm) {
    setGuttersForLineNumbers(cm.options)
    guttersChanged(cm)
  }, true)
  option("fixedGutter", true, function (cm, val) {
    cm.display.gutters.style.left = val ? compensateForHScroll(cm.display) + "px" : "0"
    cm.refresh()
  }, true)
  option("coverGutterNextToScrollbar", false, function (cm) { return updateScrollbars(cm); }, true)
  option("scrollbarStyle", "native", function (cm) {
    initScrollbars(cm)
    updateScrollbars(cm)
    cm.display.scrollbars.setScrollTop(cm.doc.scrollTop)
    cm.display.scrollbars.setScrollLeft(cm.doc.scrollLeft)
  }, true)
  option("lineNumbers", false, function (cm) {
    setGuttersForLineNumbers(cm.options)
    guttersChanged(cm)
  }, true)
  option("firstLineNumber", 1, guttersChanged, true)
  option("lineNumberFormatter", function (integer) { return integer; }, guttersChanged, true)
  option("showCursorWhenSelecting", false, updateSelection, true)

  option("resetSelectionOnContextMenu", true)
  option("lineWiseCopyCut", true)

  option("readOnly", false, function (cm, val) {
    if (val == "nocursor") {
      onBlur(cm)
      cm.display.input.blur()
      cm.display.disabled = true
    } else {
      cm.display.disabled = false
    }
    cm.display.input.readOnlyChanged(val)
  })
  option("disableInput", false, function (cm, val) {if (!val) { cm.display.input.reset() }}, true)
  option("dragDrop", true, dragDropChanged)
  option("allowDropFileTypes", null)

  option("cursorBlinkRate", 530)
  option("cursorScrollMargin", 0)
  option("cursorHeight", 1, updateSelection, true)
  option("singleCursorHeightPerLine", true, updateSelection, true)
  option("workTime", 100)
  option("workDelay", 100)
  option("flattenSpans", true, resetModeState, true)
  option("addModeClass", false, resetModeState, true)
  option("pollInterval", 100)
  option("undoDepth", 200, function (cm, val) { return cm.doc.history.undoDepth = val; })
  option("historyEventDelay", 1250)
  option("viewportMargin", 10, function (cm) { return cm.refresh(); }, true)
  option("maxHighlightLength", 10000, resetModeState, true)
  option("moveInputWithCursor", true, function (cm, val) {
    if (!val) { cm.display.input.resetPosition() }
  })

  option("tabindex", null, function (cm, val) { return cm.display.input.getField().tabIndex = val || ""; })
  option("autofocus", null)
}

function guttersChanged(cm) {
  updateGutters(cm)
  regChange(cm)
  alignHorizontally(cm)
}

function dragDropChanged(cm, value, old) {
  var wasOn = old && old != Init
  if (!value != !wasOn) {
    var funcs = cm.display.dragFunctions
    var toggle = value ? on : off
    toggle(cm.display.scroller, "dragstart", funcs.start)
    toggle(cm.display.scroller, "dragenter", funcs.enter)
    toggle(cm.display.scroller, "dragover", funcs.over)
    toggle(cm.display.scroller, "dragleave", funcs.leave)
    toggle(cm.display.scroller, "drop", funcs.drop)
  }
}

function wrappingChanged(cm) {
  if (cm.options.lineWrapping) {
    addClass(cm.display.wrapper, "CodeMirror-wrap")
    cm.display.sizer.style.minWidth = ""
    cm.display.sizerWidth = null
  } else {
    rmClass(cm.display.wrapper, "CodeMirror-wrap")
    findMaxLine(cm)
  }
  estimateLineHeights(cm)
  regChange(cm)
  clearCaches(cm)
  setTimeout(function () { return updateScrollbars(cm); }, 100)
}

// A CodeMirror instance represents an editor. This is the object
// that user code is usually dealing with.

function CodeMirror(place, options) {
  var this$1 = this;

  if (!(this instanceof CodeMirror)) { return new CodeMirror(place, options) }

  this.options = options = options ? copyObj(options) : {}
  // Determine effective options based on given values and defaults.
  copyObj(defaults, options, false)
  setGuttersForLineNumbers(options)

  var doc = options.value
  if (typeof doc == "string") { doc = new Doc(doc, options.mode, null, options.lineSeparator) }
  this.doc = doc

  var input = new CodeMirror.inputStyles[options.inputStyle](this)
  var display = this.display = new Display(place, doc, input)
  display.wrapper.CodeMirror = this
  updateGutters(this)
  themeChanged(this)
  if (options.lineWrapping)
    { this.display.wrapper.className += " CodeMirror-wrap" }
  initScrollbars(this)

  this.state = {
    keyMaps: [],  // stores maps added by addKeyMap
    overlays: [], // highlighting overlays, as added by addOverlay
    modeGen: 0,   // bumped when mode/overlay changes, used to invalidate highlighting info
    overwrite: false,
    delayingBlurEvent: false,
    focused: false,
    suppressEdits: false, // used to disable editing during key handlers when in readOnly mode
    pasteIncoming: false, cutIncoming: false, // help recognize paste/cut edits in input.poll
    selectingText: false,
    draggingText: false,
    highlight: new Delayed(), // stores highlight worker timeout
    keySeq: null,  // Unfinished key sequence
    specialChars: null
  }

  if (options.autofocus && !mobile) { display.input.focus() }

  // Override magic textarea content restore that IE sometimes does
  // on our hidden textarea on reload
  if (ie && ie_version < 11) { setTimeout(function () { return this$1.display.input.reset(true); }, 20) }

  registerEventHandlers(this)
  ensureGlobalHandlers()

  startOperation(this)
  this.curOp.forceUpdate = true
  attachDoc(this, doc)

  if ((options.autofocus && !mobile) || this.hasFocus())
    { setTimeout(bind(onFocus, this), 20) }
  else
    { onBlur(this) }

  for (var opt in optionHandlers) { if (optionHandlers.hasOwnProperty(opt))
    { optionHandlers[opt](this$1, options[opt], Init) } }
  maybeUpdateLineNumberWidth(this)
  if (options.finishInit) { options.finishInit(this) }
  for (var i = 0; i < initHooks.length; ++i) { initHooks[i](this$1) }
  endOperation(this)
  // Suppress optimizelegibility in Webkit, since it breaks text
  // measuring on line wrapping boundaries.
  if (webkit && options.lineWrapping &&
      getComputedStyle(display.lineDiv).textRendering == "optimizelegibility")
    { display.lineDiv.style.textRendering = "auto" }
}

// The default configuration options.
CodeMirror.defaults = defaults
// Functions to run when options are changed.
CodeMirror.optionHandlers = optionHandlers

// Attach the necessary event handlers when initializing the editor
function registerEventHandlers(cm) {
  var d = cm.display
  on(d.scroller, "mousedown", operation(cm, onMouseDown))
  // Older IE's will not fire a second mousedown for a double click
  if (ie && ie_version < 11)
    { on(d.scroller, "dblclick", operation(cm, function (e) {
      if (signalDOMEvent(cm, e)) { return }
      var pos = posFromMouse(cm, e)
      if (!pos || clickInGutter(cm, e) || eventInWidget(cm.display, e)) { return }
      e_preventDefault(e)
      var word = cm.findWordAt(pos)
      extendSelection(cm.doc, word.anchor, word.head)
    })) }
  else
    { on(d.scroller, "dblclick", function (e) { return signalDOMEvent(cm, e) || e_preventDefault(e); }) }
  // Some browsers fire contextmenu *after* opening the menu, at
  // which point we can't mess with it anymore. Context menu is
  // handled in onMouseDown for these browsers.
  if (!captureRightClick) { on(d.scroller, "contextmenu", function (e) { return onContextMenu(cm, e); }) }

  // Used to suppress mouse event handling when a touch happens
  var touchFinished, prevTouch = {end: 0}
  function finishTouch() {
    if (d.activeTouch) {
      touchFinished = setTimeout(function () { return d.activeTouch = null; }, 1000)
      prevTouch = d.activeTouch
      prevTouch.end = +new Date
    }
  }
  function isMouseLikeTouchEvent(e) {
    if (e.touches.length != 1) { return false }
    var touch = e.touches[0]
    return touch.radiusX <= 1 && touch.radiusY <= 1
  }
  function farAway(touch, other) {
    if (other.left == null) { return true }
    var dx = other.left - touch.left, dy = other.top - touch.top
    return dx * dx + dy * dy > 20 * 20
  }
  on(d.scroller, "touchstart", function (e) {
    if (!signalDOMEvent(cm, e) && !isMouseLikeTouchEvent(e)) {
      d.input.ensurePolled()
      clearTimeout(touchFinished)
      var now = +new Date
      d.activeTouch = {start: now, moved: false,
                       prev: now - prevTouch.end <= 300 ? prevTouch : null}
      if (e.touches.length == 1) {
        d.activeTouch.left = e.touches[0].pageX
        d.activeTouch.top = e.touches[0].pageY
      }
    }
  })
  on(d.scroller, "touchmove", function () {
    if (d.activeTouch) { d.activeTouch.moved = true }
  })
  on(d.scroller, "touchend", function (e) {
    var touch = d.activeTouch
    if (touch && !eventInWidget(d, e) && touch.left != null &&
        !touch.moved && new Date - touch.start < 300) {
      var pos = cm.coordsChar(d.activeTouch, "page"), range
      if (!touch.prev || farAway(touch, touch.prev)) // Single tap
        { range = new Range(pos, pos) }
      else if (!touch.prev.prev || farAway(touch, touch.prev.prev)) // Double tap
        { range = cm.findWordAt(pos) }
      else // Triple tap
        { range = new Range(Pos(pos.line, 0), clipPos(cm.doc, Pos(pos.line + 1, 0))) }
      cm.setSelection(range.anchor, range.head)
      cm.focus()
      e_preventDefault(e)
    }
    finishTouch()
  })
  on(d.scroller, "touchcancel", finishTouch)

  // Sync scrolling between fake scrollbars and real scrollable
  // area, ensure viewport is updated when scrolling.
  on(d.scroller, "scroll", function () {
    if (d.scroller.clientHeight) {
      setScrollTop(cm, d.scroller.scrollTop)
      setScrollLeft(cm, d.scroller.scrollLeft, true)
      signal(cm, "scroll", cm)
    }
  })

  // Listen to wheel events in order to try and update the viewport on time.
  on(d.scroller, "mousewheel", function (e) { return onScrollWheel(cm, e); })
  on(d.scroller, "DOMMouseScroll", function (e) { return onScrollWheel(cm, e); })

  // Prevent wrapper from ever scrolling
  on(d.wrapper, "scroll", function () { return d.wrapper.scrollTop = d.wrapper.scrollLeft = 0; })

  d.dragFunctions = {
    enter: function (e) {if (!signalDOMEvent(cm, e)) { e_stop(e) }},
    over: function (e) {if (!signalDOMEvent(cm, e)) { onDragOver(cm, e); e_stop(e) }},
    start: function (e) { return onDragStart(cm, e); },
    drop: operation(cm, onDrop),
    leave: function (e) {if (!signalDOMEvent(cm, e)) { clearDragCursor(cm) }}
  }

  var inp = d.input.getField()
  on(inp, "keyup", function (e) { return onKeyUp.call(cm, e); })
  on(inp, "keydown", operation(cm, onKeyDown))
  on(inp, "keypress", operation(cm, onKeyPress))
  on(inp, "focus", function (e) { return onFocus(cm, e); })
  on(inp, "blur", function (e) { return onBlur(cm, e); })
}

var initHooks = []
CodeMirror.defineInitHook = function (f) { return initHooks.push(f); }

// Indent the given line. The how parameter can be "smart",
// "add"/null, "subtract", or "prev". When aggressive is false
// (typically set to true for forced single-line indents), empty
// lines are not indented, and places where the mode returns Pass
// are left alone.
function indentLine(cm, n, how, aggressive) {
  var doc = cm.doc, state
  if (how == null) { how = "add" }
  if (how == "smart") {
    // Fall back to "prev" when the mode doesn't have an indentation
    // method.
    if (!doc.mode.indent) { how = "prev" }
    else { state = getStateBefore(cm, n) }
  }

  var tabSize = cm.options.tabSize
  var line = getLine(doc, n), curSpace = countColumn(line.text, null, tabSize)
  if (line.stateAfter) { line.stateAfter = null }
  var curSpaceString = line.text.match(/^\s*/)[0], indentation
  if (!aggressive && !/\S/.test(line.text)) {
    indentation = 0
    how = "not"
  } else if (how == "smart") {
    indentation = doc.mode.indent(state, line.text.slice(curSpaceString.length), line.text)
    if (indentation == Pass || indentation > 150) {
      if (!aggressive) { return }
      how = "prev"
    }
  }
  if (how == "prev") {
    if (n > doc.first) { indentation = countColumn(getLine(doc, n-1).text, null, tabSize) }
    else { indentation = 0 }
  } else if (how == "add") {
    indentation = curSpace + cm.options.indentUnit
  } else if (how == "subtract") {
    indentation = curSpace - cm.options.indentUnit
  } else if (typeof how == "number") {
    indentation = curSpace + how
  }
  indentation = Math.max(0, indentation)

  var indentString = "", pos = 0
  if (cm.options.indentWithTabs)
    { for (var i = Math.floor(indentation / tabSize); i; --i) {pos += tabSize; indentString += "\t"} }
  if (pos < indentation) { indentString += spaceStr(indentation - pos) }

  if (indentString != curSpaceString) {
    replaceRange(doc, indentString, Pos(n, 0), Pos(n, curSpaceString.length), "+input")
    line.stateAfter = null
    return true
  } else {
    // Ensure that, if the cursor was in the whitespace at the start
    // of the line, it is moved to the end of that space.
    for (var i$1 = 0; i$1 < doc.sel.ranges.length; i$1++) {
      var range = doc.sel.ranges[i$1]
      if (range.head.line == n && range.head.ch < curSpaceString.length) {
        var pos$1 = Pos(n, curSpaceString.length)
        replaceOneSelection(doc, i$1, new Range(pos$1, pos$1))
        break
      }
    }
  }
}

// This will be set to a {lineWise: bool, text: [string]} object, so
// that, when pasting, we know what kind of selections the copied
// text was made out of.
var lastCopied = null

function setLastCopied(newLastCopied) {
  lastCopied = newLastCopied
}

function applyTextInput(cm, inserted, deleted, sel, origin) {
  var doc = cm.doc
  cm.display.shift = false
  if (!sel) { sel = doc.sel }

  var paste = cm.state.pasteIncoming || origin == "paste"
  var textLines = splitLinesAuto(inserted), multiPaste = null
  // When pasing N lines into N selections, insert one line per selection
  if (paste && sel.ranges.length > 1) {
    if (lastCopied && lastCopied.text.join("\n") == inserted) {
      if (sel.ranges.length % lastCopied.text.length == 0) {
        multiPaste = []
        for (var i = 0; i < lastCopied.text.length; i++)
          { multiPaste.push(doc.splitLines(lastCopied.text[i])) }
      }
    } else if (textLines.length == sel.ranges.length) {
      multiPaste = map(textLines, function (l) { return [l]; })
    }
  }

  var updateInput
  // Normal behavior is to insert the new text into every selection
  for (var i$1 = sel.ranges.length - 1; i$1 >= 0; i$1--) {
    var range = sel.ranges[i$1]
    var from = range.from(), to = range.to()
    if (range.empty()) {
      if (deleted && deleted > 0) // Handle deletion
        { from = Pos(from.line, from.ch - deleted) }
      else if (cm.state.overwrite && !paste) // Handle overwrite
        { to = Pos(to.line, Math.min(getLine(doc, to.line).text.length, to.ch + lst(textLines).length)) }
      else if (lastCopied && lastCopied.lineWise && lastCopied.text.join("\n") == inserted)
        { from = to = Pos(from.line, 0) }
    }
    updateInput = cm.curOp.updateInput
    var changeEvent = {from: from, to: to, text: multiPaste ? multiPaste[i$1 % multiPaste.length] : textLines,
                       origin: origin || (paste ? "paste" : cm.state.cutIncoming ? "cut" : "+input")}
    makeChange(cm.doc, changeEvent)
    signalLater(cm, "inputRead", cm, changeEvent)
  }
  if (inserted && !paste)
    { triggerElectric(cm, inserted) }

  ensureCursorVisible(cm)
  cm.curOp.updateInput = updateInput
  cm.curOp.typing = true
  cm.state.pasteIncoming = cm.state.cutIncoming = false
}

function handlePaste(e, cm) {
  var pasted = e.clipboardData && e.clipboardData.getData("Text")
  if (pasted) {
    e.preventDefault()
    if (!cm.isReadOnly() && !cm.options.disableInput)
      { runInOp(cm, function () { return applyTextInput(cm, pasted, 0, null, "paste"); }) }
    return true
  }
}

function triggerElectric(cm, inserted) {
  // When an 'electric' character is inserted, immediately trigger a reindent
  if (!cm.options.electricChars || !cm.options.smartIndent) { return }
  var sel = cm.doc.sel

  for (var i = sel.ranges.length - 1; i >= 0; i--) {
    var range = sel.ranges[i]
    if (range.head.ch > 100 || (i && sel.ranges[i - 1].head.line == range.head.line)) { continue }
    var mode = cm.getModeAt(range.head)
    var indented = false
    if (mode.electricChars) {
      for (var j = 0; j < mode.electricChars.length; j++)
        { if (inserted.indexOf(mode.electricChars.charAt(j)) > -1) {
          indented = indentLine(cm, range.head.line, "smart")
          break
        } }
    } else if (mode.electricInput) {
      if (mode.electricInput.test(getLine(cm.doc, range.head.line).text.slice(0, range.head.ch)))
        { indented = indentLine(cm, range.head.line, "smart") }
    }
    if (indented) { signalLater(cm, "electricInput", cm, range.head.line) }
  }
}

function copyableRanges(cm) {
  var text = [], ranges = []
  for (var i = 0; i < cm.doc.sel.ranges.length; i++) {
    var line = cm.doc.sel.ranges[i].head.line
    var lineRange = {anchor: Pos(line, 0), head: Pos(line + 1, 0)}
    ranges.push(lineRange)
    text.push(cm.getRange(lineRange.anchor, lineRange.head))
  }
  return {text: text, ranges: ranges}
}

function disableBrowserMagic(field, spellcheck) {
  field.setAttribute("autocorrect", "off")
  field.setAttribute("autocapitalize", "off")
  field.setAttribute("spellcheck", !!spellcheck)
}

function hiddenTextarea() {
  var te = elt("textarea", null, null, "position: absolute; bottom: -1em; padding: 0; width: 1px; height: 1em; outline: none")
  var div = elt("div", [te], null, "overflow: hidden; position: relative; width: 3px; height: 0px;")
  // The textarea is kept positioned near the cursor to prevent the
  // fact that it'll be scrolled into view on input from scrolling
  // our fake cursor out of view. On webkit, when wrap=off, paste is
  // very slow. So make the area wide instead.
  if (webkit) { te.style.width = "1000px" }
  else { te.setAttribute("wrap", "off") }
  // If border: 0; -- iOS fails to open keyboard (issue #1287)
  if (ios) { te.style.border = "1px solid black" }
  disableBrowserMagic(te)
  return div
}

// The publicly visible API. Note that methodOp(f) means
// 'wrap f in an operation, performed on its `this` parameter'.

// This is not the complete set of editor methods. Most of the
// methods defined on the Doc type are also injected into
// CodeMirror.prototype, for backwards compatibility and
// convenience.

function addEditorMethods(CodeMirror) {
  var optionHandlers = CodeMirror.optionHandlers

  var helpers = CodeMirror.helpers = {}

  CodeMirror.prototype = {
    constructor: CodeMirror,
    focus: function(){window.focus(); this.display.input.focus()},

    setOption: function(option, value) {
      var options = this.options, old = options[option]
      if (options[option] == value && option != "mode") { return }
      options[option] = value
      if (optionHandlers.hasOwnProperty(option))
        { operation(this, optionHandlers[option])(this, value, old) }
      signal(this, "optionChange", this, option)
    },

    getOption: function(option) {return this.options[option]},
    getDoc: function() {return this.doc},

    addKeyMap: function(map, bottom) {
      this.state.keyMaps[bottom ? "push" : "unshift"](getKeyMap(map))
    },
    removeKeyMap: function(map) {
      var maps = this.state.keyMaps
      for (var i = 0; i < maps.length; ++i)
        { if (maps[i] == map || maps[i].name == map) {
          maps.splice(i, 1)
          return true
        } }
    },

    addOverlay: methodOp(function(spec, options) {
      var mode = spec.token ? spec : CodeMirror.getMode(this.options, spec)
      if (mode.startState) { throw new Error("Overlays may not be stateful.") }
      insertSorted(this.state.overlays,
                   {mode: mode, modeSpec: spec, opaque: options && options.opaque,
                    priority: (options && options.priority) || 0},
                   function (overlay) { return overlay.priority; })
      this.state.modeGen++
      regChange(this)
    }),
    removeOverlay: methodOp(function(spec) {
      var this$1 = this;

      var overlays = this.state.overlays
      for (var i = 0; i < overlays.length; ++i) {
        var cur = overlays[i].modeSpec
        if (cur == spec || typeof spec == "string" && cur.name == spec) {
          overlays.splice(i, 1)
          this$1.state.modeGen++
          regChange(this$1)
          return
        }
      }
    }),

    indentLine: methodOp(function(n, dir, aggressive) {
      if (typeof dir != "string" && typeof dir != "number") {
        if (dir == null) { dir = this.options.smartIndent ? "smart" : "prev" }
        else { dir = dir ? "add" : "subtract" }
      }
      if (isLine(this.doc, n)) { indentLine(this, n, dir, aggressive) }
    }),
    indentSelection: methodOp(function(how) {
      var this$1 = this;

      var ranges = this.doc.sel.ranges, end = -1
      for (var i = 0; i < ranges.length; i++) {
        var range = ranges[i]
        if (!range.empty()) {
          var from = range.from(), to = range.to()
          var start = Math.max(end, from.line)
          end = Math.min(this$1.lastLine(), to.line - (to.ch ? 0 : 1)) + 1
          for (var j = start; j < end; ++j)
            { indentLine(this$1, j, how) }
          var newRanges = this$1.doc.sel.ranges
          if (from.ch == 0 && ranges.length == newRanges.length && newRanges[i].from().ch > 0)
            { replaceOneSelection(this$1.doc, i, new Range(from, newRanges[i].to()), sel_dontScroll) }
        } else if (range.head.line > end) {
          indentLine(this$1, range.head.line, how, true)
          end = range.head.line
          if (i == this$1.doc.sel.primIndex) { ensureCursorVisible(this$1) }
        }
      }
    }),

    // Fetch the parser token for a given character. Useful for hacks
    // that want to inspect the mode state (say, for completion).
    getTokenAt: function(pos, precise) {
      return takeToken(this, pos, precise)
    },

    getLineTokens: function(line, precise) {
      return takeToken(this, Pos(line), precise, true)
    },

    getTokenTypeAt: function(pos) {
      pos = clipPos(this.doc, pos)
      var styles = getLineStyles(this, getLine(this.doc, pos.line))
      var before = 0, after = (styles.length - 1) / 2, ch = pos.ch
      var type
      if (ch == 0) { type = styles[2] }
      else { for (;;) {
        var mid = (before + after) >> 1
        if ((mid ? styles[mid * 2 - 1] : 0) >= ch) { after = mid }
        else if (styles[mid * 2 + 1] < ch) { before = mid + 1 }
        else { type = styles[mid * 2 + 2]; break }
      } }
      var cut = type ? type.indexOf("overlay ") : -1
      return cut < 0 ? type : cut == 0 ? null : type.slice(0, cut - 1)
    },

    getModeAt: function(pos) {
      var mode = this.doc.mode
      if (!mode.innerMode) { return mode }
      return CodeMirror.innerMode(mode, this.getTokenAt(pos).state).mode
    },

    getHelper: function(pos, type) {
      return this.getHelpers(pos, type)[0]
    },

    getHelpers: function(pos, type) {
      var this$1 = this;

      var found = []
      if (!helpers.hasOwnProperty(type)) { return found }
      var help = helpers[type], mode = this.getModeAt(pos)
      if (typeof mode[type] == "string") {
        if (help[mode[type]]) { found.push(help[mode[type]]) }
      } else if (mode[type]) {
        for (var i = 0; i < mode[type].length; i++) {
          var val = help[mode[type][i]]
          if (val) { found.push(val) }
        }
      } else if (mode.helperType && help[mode.helperType]) {
        found.push(help[mode.helperType])
      } else if (help[mode.name]) {
        found.push(help[mode.name])
      }
      for (var i$1 = 0; i$1 < help._global.length; i$1++) {
        var cur = help._global[i$1]
        if (cur.pred(mode, this$1) && indexOf(found, cur.val) == -1)
          { found.push(cur.val) }
      }
      return found
    },

    getStateAfter: function(line, precise) {
      var doc = this.doc
      line = clipLine(doc, line == null ? doc.first + doc.size - 1: line)
      return getStateBefore(this, line + 1, precise)
    },

    cursorCoords: function(start, mode) {
      var pos, range = this.doc.sel.primary()
      if (start == null) { pos = range.head }
      else if (typeof start == "object") { pos = clipPos(this.doc, start) }
      else { pos = start ? range.from() : range.to() }
      return cursorCoords(this, pos, mode || "page")
    },

    charCoords: function(pos, mode) {
      return charCoords(this, clipPos(this.doc, pos), mode || "page")
    },

    coordsChar: function(coords, mode) {
      coords = fromCoordSystem(this, coords, mode || "page")
      return coordsChar(this, coords.left, coords.top)
    },

    lineAtHeight: function(height, mode) {
      height = fromCoordSystem(this, {top: height, left: 0}, mode || "page").top
      return lineAtHeight(this.doc, height + this.display.viewOffset)
    },
    heightAtLine: function(line, mode, includeWidgets) {
      var end = false, lineObj
      if (typeof line == "number") {
        var last = this.doc.first + this.doc.size - 1
        if (line < this.doc.first) { line = this.doc.first }
        else if (line > last) { line = last; end = true }
        lineObj = getLine(this.doc, line)
      } else {
        lineObj = line
      }
      return intoCoordSystem(this, lineObj, {top: 0, left: 0}, mode || "page", includeWidgets).top +
        (end ? this.doc.height - heightAtLine(lineObj) : 0)
    },

    defaultTextHeight: function() { return textHeight(this.display) },
    defaultCharWidth: function() { return charWidth(this.display) },

    getViewport: function() { return {from: this.display.viewFrom, to: this.display.viewTo}},

    addWidget: function(pos, node, scroll, vert, horiz) {
      var display = this.display
      pos = cursorCoords(this, clipPos(this.doc, pos))
      var top = pos.bottom, left = pos.left
      node.style.position = "absolute"
      node.setAttribute("cm-ignore-events", "true")
      this.display.input.setUneditable(node)
      display.sizer.appendChild(node)
      if (vert == "over") {
        top = pos.top
      } else if (vert == "above" || vert == "near") {
        var vspace = Math.max(display.wrapper.clientHeight, this.doc.height),
        hspace = Math.max(display.sizer.clientWidth, display.lineSpace.clientWidth)
        // Default to positioning above (if specified and possible); otherwise default to positioning below
        if ((vert == 'above' || pos.bottom + node.offsetHeight > vspace) && pos.top > node.offsetHeight)
          { top = pos.top - node.offsetHeight }
        else if (pos.bottom + node.offsetHeight <= vspace)
          { top = pos.bottom }
        if (left + node.offsetWidth > hspace)
          { left = hspace - node.offsetWidth }
      }
      node.style.top = top + "px"
      node.style.left = node.style.right = ""
      if (horiz == "right") {
        left = display.sizer.clientWidth - node.offsetWidth
        node.style.right = "0px"
      } else {
        if (horiz == "left") { left = 0 }
        else if (horiz == "middle") { left = (display.sizer.clientWidth - node.offsetWidth) / 2 }
        node.style.left = left + "px"
      }
      if (scroll)
        { scrollIntoView(this, left, top, left + node.offsetWidth, top + node.offsetHeight) }
    },

    triggerOnKeyDown: methodOp(onKeyDown),
    triggerOnKeyPress: methodOp(onKeyPress),
    triggerOnKeyUp: onKeyUp,

    execCommand: function(cmd) {
      if (commands.hasOwnProperty(cmd))
        { return commands[cmd].call(null, this) }
    },

    triggerElectric: methodOp(function(text) { triggerElectric(this, text) }),

    findPosH: function(from, amount, unit, visually) {
      var this$1 = this;

      var dir = 1
      if (amount < 0) { dir = -1; amount = -amount }
      var cur = clipPos(this.doc, from)
      for (var i = 0; i < amount; ++i) {
        cur = findPosH(this$1.doc, cur, dir, unit, visually)
        if (cur.hitSide) { break }
      }
      return cur
    },

    moveH: methodOp(function(dir, unit) {
      var this$1 = this;

      this.extendSelectionsBy(function (range) {
        if (this$1.display.shift || this$1.doc.extend || range.empty())
          { return findPosH(this$1.doc, range.head, dir, unit, this$1.options.rtlMoveVisually) }
        else
          { return dir < 0 ? range.from() : range.to() }
      }, sel_move)
    }),

    deleteH: methodOp(function(dir, unit) {
      var sel = this.doc.sel, doc = this.doc
      if (sel.somethingSelected())
        { doc.replaceSelection("", null, "+delete") }
      else
        { deleteNearSelection(this, function (range) {
          var other = findPosH(doc, range.head, dir, unit, false)
          return dir < 0 ? {from: other, to: range.head} : {from: range.head, to: other}
        }) }
    }),

    findPosV: function(from, amount, unit, goalColumn) {
      var this$1 = this;

      var dir = 1, x = goalColumn
      if (amount < 0) { dir = -1; amount = -amount }
      var cur = clipPos(this.doc, from)
      for (var i = 0; i < amount; ++i) {
        var coords = cursorCoords(this$1, cur, "div")
        if (x == null) { x = coords.left }
        else { coords.left = x }
        cur = findPosV(this$1, coords, dir, unit)
        if (cur.hitSide) { break }
      }
      return cur
    },

    moveV: methodOp(function(dir, unit) {
      var this$1 = this;

      var doc = this.doc, goals = []
      var collapse = !this.display.shift && !doc.extend && doc.sel.somethingSelected()
      doc.extendSelectionsBy(function (range) {
        if (collapse)
          { return dir < 0 ? range.from() : range.to() }
        var headPos = cursorCoords(this$1, range.head, "div")
        if (range.goalColumn != null) { headPos.left = range.goalColumn }
        goals.push(headPos.left)
        var pos = findPosV(this$1, headPos, dir, unit)
        if (unit == "page" && range == doc.sel.primary())
          { addToScrollPos(this$1, null, charCoords(this$1, pos, "div").top - headPos.top) }
        return pos
      }, sel_move)
      if (goals.length) { for (var i = 0; i < doc.sel.ranges.length; i++)
        { doc.sel.ranges[i].goalColumn = goals[i] } }
    }),

    // Find the word at the given position (as returned by coordsChar).
    findWordAt: function(pos) {
      var doc = this.doc, line = getLine(doc, pos.line).text
      var start = pos.ch, end = pos.ch
      if (line) {
        var helper = this.getHelper(pos, "wordChars")
        if ((pos.xRel < 0 || end == line.length) && start) { --start; } else { ++end }
        var startChar = line.charAt(start)
        var check = isWordChar(startChar, helper)
          ? function (ch) { return isWordChar(ch, helper); }
          : /\s/.test(startChar) ? function (ch) { return /\s/.test(ch); }
          : function (ch) { return (!/\s/.test(ch) && !isWordChar(ch)); }
        while (start > 0 && check(line.charAt(start - 1))) { --start }
        while (end < line.length && check(line.charAt(end))) { ++end }
      }
      return new Range(Pos(pos.line, start), Pos(pos.line, end))
    },

    toggleOverwrite: function(value) {
      if (value != null && value == this.state.overwrite) { return }
      if (this.state.overwrite = !this.state.overwrite)
        { addClass(this.display.cursorDiv, "CodeMirror-overwrite") }
      else
        { rmClass(this.display.cursorDiv, "CodeMirror-overwrite") }

      signal(this, "overwriteToggle", this, this.state.overwrite)
    },
    hasFocus: function() { return this.display.input.getField() == activeElt() },
    isReadOnly: function() { return !!(this.options.readOnly || this.doc.cantEdit) },

    scrollTo: methodOp(function(x, y) {
      if (x != null || y != null) { resolveScrollToPos(this) }
      if (x != null) { this.curOp.scrollLeft = x }
      if (y != null) { this.curOp.scrollTop = y }
    }),
    getScrollInfo: function() {
      var scroller = this.display.scroller
      return {left: scroller.scrollLeft, top: scroller.scrollTop,
              height: scroller.scrollHeight - scrollGap(this) - this.display.barHeight,
              width: scroller.scrollWidth - scrollGap(this) - this.display.barWidth,
              clientHeight: displayHeight(this), clientWidth: displayWidth(this)}
    },

    scrollIntoView: methodOp(function(range, margin) {
      if (range == null) {
        range = {from: this.doc.sel.primary().head, to: null}
        if (margin == null) { margin = this.options.cursorScrollMargin }
      } else if (typeof range == "number") {
        range = {from: Pos(range, 0), to: null}
      } else if (range.from == null) {
        range = {from: range, to: null}
      }
      if (!range.to) { range.to = range.from }
      range.margin = margin || 0

      if (range.from.line != null) {
        resolveScrollToPos(this)
        this.curOp.scrollToPos = range
      } else {
        var sPos = calculateScrollPos(this, Math.min(range.from.left, range.to.left),
                                      Math.min(range.from.top, range.to.top) - range.margin,
                                      Math.max(range.from.right, range.to.right),
                                      Math.max(range.from.bottom, range.to.bottom) + range.margin)
        this.scrollTo(sPos.scrollLeft, sPos.scrollTop)
      }
    }),

    setSize: methodOp(function(width, height) {
      var this$1 = this;

      var interpret = function (val) { return typeof val == "number" || /^\d+$/.test(String(val)) ? val + "px" : val; }
      if (width != null) { this.display.wrapper.style.width = interpret(width) }
      if (height != null) { this.display.wrapper.style.height = interpret(height) }
      if (this.options.lineWrapping) { clearLineMeasurementCache(this) }
      var lineNo = this.display.viewFrom
      this.doc.iter(lineNo, this.display.viewTo, function (line) {
        if (line.widgets) { for (var i = 0; i < line.widgets.length; i++)
          { if (line.widgets[i].noHScroll) { regLineChange(this$1, lineNo, "widget"); break } } }
        ++lineNo
      })
      this.curOp.forceUpdate = true
      signal(this, "refresh", this)
    }),

    operation: function(f){return runInOp(this, f)},

    refresh: methodOp(function() {
      var oldHeight = this.display.cachedTextHeight
      regChange(this)
      this.curOp.forceUpdate = true
      clearCaches(this)
      this.scrollTo(this.doc.scrollLeft, this.doc.scrollTop)
      updateGutterSpace(this)
      if (oldHeight == null || Math.abs(oldHeight - textHeight(this.display)) > .5)
        { estimateLineHeights(this) }
      signal(this, "refresh", this)
    }),

    swapDoc: methodOp(function(doc) {
      var old = this.doc
      old.cm = null
      attachDoc(this, doc)
      clearCaches(this)
      this.display.input.reset()
      this.scrollTo(doc.scrollLeft, doc.scrollTop)
      this.curOp.forceScroll = true
      signalLater(this, "swapDoc", this, old)
      return old
    }),

    getInputField: function(){return this.display.input.getField()},
    getWrapperElement: function(){return this.display.wrapper},
    getScrollerElement: function(){return this.display.scroller},
    getGutterElement: function(){return this.display.gutters}
  }
  eventMixin(CodeMirror)

  CodeMirror.registerHelper = function(type, name, value) {
    if (!helpers.hasOwnProperty(type)) { helpers[type] = CodeMirror[type] = {_global: []} }
    helpers[type][name] = value
  }
  CodeMirror.registerGlobalHelper = function(type, name, predicate, value) {
    CodeMirror.registerHelper(type, name, value)
    helpers[type]._global.push({pred: predicate, val: value})
  }
}

// Used for horizontal relative motion. Dir is -1 or 1 (left or
// right), unit can be "char", "column" (like char, but doesn't
// cross line boundaries), "word" (across next word), or "group" (to
// the start of next group of word or non-word-non-whitespace
// chars). The visually param controls whether, in right-to-left
// text, direction 1 means to move towards the next index in the
// string, or towards the character to the right of the current
// position. The resulting position will have a hitSide=true
// property if it reached the end of the document.
function findPosH(doc, pos, dir, unit, visually) {
  var line = pos.line, ch = pos.ch, origDir = dir
  var lineObj = getLine(doc, line)
  function findNextLine() {
    var l = line + dir
    if (l < doc.first || l >= doc.first + doc.size) { return false }
    line = l
    return lineObj = getLine(doc, l)
  }
  function moveOnce(boundToLine) {
    var next = (visually ? moveVisually : moveLogically)(lineObj, ch, dir, true)
    if (next == null) {
      if (!boundToLine && findNextLine()) {
        if (visually) { ch = (dir < 0 ? lineRight : lineLeft)(lineObj) }
        else { ch = dir < 0 ? lineObj.text.length : 0 }
      } else { return false }
    } else { ch = next }
    return true
  }

  if (unit == "char") {
    moveOnce()
  } else if (unit == "column") {
    moveOnce(true)
  } else if (unit == "word" || unit == "group") {
    var sawType = null, group = unit == "group"
    var helper = doc.cm && doc.cm.getHelper(pos, "wordChars")
    for (var first = true;; first = false) {
      if (dir < 0 && !moveOnce(!first)) { break }
      var cur = lineObj.text.charAt(ch) || "\n"
      var type = isWordChar(cur, helper) ? "w"
        : group && cur == "\n" ? "n"
        : !group || /\s/.test(cur) ? null
        : "p"
      if (group && !first && !type) { type = "s" }
      if (sawType && sawType != type) {
        if (dir < 0) {dir = 1; moveOnce()}
        break
      }

      if (type) { sawType = type }
      if (dir > 0 && !moveOnce(!first)) { break }
    }
  }
  var result = skipAtomic(doc, Pos(line, ch), pos, origDir, true)
  if (!cmp(pos, result)) { result.hitSide = true }
  return result
}

// For relative vertical movement. Dir may be -1 or 1. Unit can be
// "page" or "line". The resulting position will have a hitSide=true
// property if it reached the end of the document.
function findPosV(cm, pos, dir, unit) {
  var doc = cm.doc, x = pos.left, y
  if (unit == "page") {
    var pageSize = Math.min(cm.display.wrapper.clientHeight, window.innerHeight || document.documentElement.clientHeight)
    var moveAmount = Math.max(pageSize - .5 * textHeight(cm.display), 3)
    y = (dir > 0 ? pos.bottom : pos.top) + dir * moveAmount

  } else if (unit == "line") {
    y = dir > 0 ? pos.bottom + 3 : pos.top - 3
  }
  var target
  for (;;) {
    target = coordsChar(cm, x, y)
    if (!target.outside) { break }
    if (dir < 0 ? y <= 0 : y >= doc.height) { target.hitSide = true; break }
    y += dir * 5
  }
  return target
}

// CONTENTEDITABLE INPUT STYLE

var ContentEditableInput = function(cm) {
  this.cm = cm
  this.lastAnchorNode = this.lastAnchorOffset = this.lastFocusNode = this.lastFocusOffset = null
  this.polling = new Delayed()
  this.composing = null
  this.gracePeriod = false
  this.readDOMTimeout = null
};

ContentEditableInput.prototype.init = function (display) {
    var this$1 = this;

  var input = this, cm = input.cm
  var div = input.div = display.lineDiv
  disableBrowserMagic(div, cm.options.spellcheck)

  on(div, "paste", function (e) {
    if (signalDOMEvent(cm, e) || handlePaste(e, cm)) { return }
    // IE doesn't fire input events, so we schedule a read for the pasted content in this way
    if (ie_version <= 11) { setTimeout(operation(cm, function () {
      if (!input.pollContent()) { regChange(cm) }
    }), 20) }
  })

  on(div, "compositionstart", function (e) {
    this$1.composing = {data: e.data, done: false}
  })
  on(div, "compositionupdate", function (e) {
    if (!this$1.composing) { this$1.composing = {data: e.data, done: false} }
  })
  on(div, "compositionend", function (e) {
    if (this$1.composing) {
      if (e.data != this$1.composing.data) { this$1.readFromDOMSoon() }
      this$1.composing.done = true
    }
  })

  on(div, "touchstart", function () { return input.forceCompositionEnd(); })

  on(div, "input", function () {
    if (!this$1.composing) { this$1.readFromDOMSoon() }
  })

  function onCopyCut(e) {
    if (signalDOMEvent(cm, e)) { return }
    if (cm.somethingSelected()) {
      setLastCopied({lineWise: false, text: cm.getSelections()})
      if (e.type == "cut") { cm.replaceSelection("", null, "cut") }
    } else if (!cm.options.lineWiseCopyCut) {
      return
    } else {
      var ranges = copyableRanges(cm)
      setLastCopied({lineWise: true, text: ranges.text})
      if (e.type == "cut") {
        cm.operation(function () {
          cm.setSelections(ranges.ranges, 0, sel_dontScroll)
          cm.replaceSelection("", null, "cut")
        })
      }
    }
    if (e.clipboardData) {
      e.clipboardData.clearData()
      var content = lastCopied.text.join("\n")
      // iOS exposes the clipboard API, but seems to discard content inserted into it
      e.clipboardData.setData("Text", content)
      if (e.clipboardData.getData("Text") == content) {
        e.preventDefault()
        return
      }
    }
    // Old-fashioned briefly-focus-a-textarea hack
    var kludge = hiddenTextarea(), te = kludge.firstChild
    cm.display.lineSpace.insertBefore(kludge, cm.display.lineSpace.firstChild)
    te.value = lastCopied.text.join("\n")
    var hadFocus = document.activeElement
    selectInput(te)
    setTimeout(function () {
      cm.display.lineSpace.removeChild(kludge)
      hadFocus.focus()
      if (hadFocus == div) { input.showPrimarySelection() }
    }, 50)
  }
  on(div, "copy", onCopyCut)
  on(div, "cut", onCopyCut)
};

ContentEditableInput.prototype.prepareSelection = function () {
  var result = prepareSelection(this.cm, false)
  result.focus = this.cm.state.focused
  return result
};

ContentEditableInput.prototype.showSelection = function (info, takeFocus) {
  if (!info || !this.cm.display.view.length) { return }
  if (info.focus || takeFocus) { this.showPrimarySelection() }
  this.showMultipleSelections(info)
};

ContentEditableInput.prototype.showPrimarySelection = function () {
  var sel = window.getSelection(), prim = this.cm.doc.sel.primary()
  var curAnchor = domToPos(this.cm, sel.anchorNode, sel.anchorOffset)
  var curFocus = domToPos(this.cm, sel.focusNode, sel.focusOffset)
  if (curAnchor && !curAnchor.bad && curFocus && !curFocus.bad &&
      cmp(minPos(curAnchor, curFocus), prim.from()) == 0 &&
      cmp(maxPos(curAnchor, curFocus), prim.to()) == 0)
    { return }

  var start = posToDOM(this.cm, prim.from())
  var end = posToDOM(this.cm, prim.to())
  if (!start && !end) { return }

  var view = this.cm.display.view
  var old = sel.rangeCount && sel.getRangeAt(0)
  if (!start) {
    start = {node: view[0].measure.map[2], offset: 0}
  } else if (!end) { // FIXME dangerously hacky
    var measure = view[view.length - 1].measure
    var map = measure.maps ? measure.maps[measure.maps.length - 1] : measure.map
    end = {node: map[map.length - 1], offset: map[map.length - 2] - map[map.length - 3]}
  }

  var rng
  try { rng = range(start.node, start.offset, end.offset, end.node) }
  catch(e) {} // Our model of the DOM might be outdated, in which case the range we try to set can be impossible
  if (rng) {
    if (!gecko && this.cm.state.focused) {
      sel.collapse(start.node, start.offset)
      if (!rng.collapsed) {
        sel.removeAllRanges()
        sel.addRange(rng)
      }
    } else {
      sel.removeAllRanges()
      sel.addRange(rng)
    }
    if (old && sel.anchorNode == null) { sel.addRange(old) }
    else if (gecko) { this.startGracePeriod() }
  }
  this.rememberSelection()
};

ContentEditableInput.prototype.startGracePeriod = function () {
    var this$1 = this;

  clearTimeout(this.gracePeriod)
  this.gracePeriod = setTimeout(function () {
    this$1.gracePeriod = false
    if (this$1.selectionChanged())
      { this$1.cm.operation(function () { return this$1.cm.curOp.selectionChanged = true; }) }
  }, 20)
};

ContentEditableInput.prototype.showMultipleSelections = function (info) {
  removeChildrenAndAdd(this.cm.display.cursorDiv, info.cursors)
  removeChildrenAndAdd(this.cm.display.selectionDiv, info.selection)
};

ContentEditableInput.prototype.rememberSelection = function () {
  var sel = window.getSelection()
  this.lastAnchorNode = sel.anchorNode; this.lastAnchorOffset = sel.anchorOffset
  this.lastFocusNode = sel.focusNode; this.lastFocusOffset = sel.focusOffset
};

ContentEditableInput.prototype.selectionInEditor = function () {
  var sel = window.getSelection()
  if (!sel.rangeCount) { return false }
  var node = sel.getRangeAt(0).commonAncestorContainer
  return contains(this.div, node)
};

ContentEditableInput.prototype.focus = function () {
  if (this.cm.options.readOnly != "nocursor") {
    if (!this.selectionInEditor())
      { this.showSelection(this.prepareSelection(), true) }
    this.div.focus()
  }
};
ContentEditableInput.prototype.blur = function () { this.div.blur() };
ContentEditableInput.prototype.getField = function () { return this.div };

ContentEditableInput.prototype.supportsTouch = function () { return true };

ContentEditableInput.prototype.receivedFocus = function () {
  var input = this
  if (this.selectionInEditor())
    { this.pollSelection() }
  else
    { runInOp(this.cm, function () { return input.cm.curOp.selectionChanged = true; }) }

  function poll() {
    if (input.cm.state.focused) {
      input.pollSelection()
      input.polling.set(input.cm.options.pollInterval, poll)
    }
  }
  this.polling.set(this.cm.options.pollInterval, poll)
};

ContentEditableInput.prototype.selectionChanged = function () {
  var sel = window.getSelection()
  return sel.anchorNode != this.lastAnchorNode || sel.anchorOffset != this.lastAnchorOffset ||
    sel.focusNode != this.lastFocusNode || sel.focusOffset != this.lastFocusOffset
};

ContentEditableInput.prototype.pollSelection = function () {
  if (!this.composing && this.readDOMTimeout == null && !this.gracePeriod && this.selectionChanged()) {
    var sel = window.getSelection(), cm = this.cm
    this.rememberSelection()
    var anchor = domToPos(cm, sel.anchorNode, sel.anchorOffset)
    var head = domToPos(cm, sel.focusNode, sel.focusOffset)
    if (anchor && head) { runInOp(cm, function () {
      setSelection(cm.doc, simpleSelection(anchor, head), sel_dontScroll)
      if (anchor.bad || head.bad) { cm.curOp.selectionChanged = true }
    }) }
  }
};

ContentEditableInput.prototype.pollContent = function () {
  if (this.readDOMTimeout != null) {
    clearTimeout(this.readDOMTimeout)
    this.readDOMTimeout = null
  }

  var cm = this.cm, display = cm.display, sel = cm.doc.sel.primary()
  var from = sel.from(), to = sel.to()
  if (from.ch == 0 && from.line > cm.firstLine())
    { from = Pos(from.line - 1, getLine(cm.doc, from.line - 1).length) }
  if (to.ch == getLine(cm.doc, to.line).text.length && to.line < cm.lastLine())
    { to = Pos(to.line + 1, 0) }
  if (from.line < display.viewFrom || to.line > display.viewTo - 1) { return false }

  var fromIndex, fromLine, fromNode
  if (from.line == display.viewFrom || (fromIndex = findViewIndex(cm, from.line)) == 0) {
    fromLine = lineNo(display.view[0].line)
    fromNode = display.view[0].node
  } else {
    fromLine = lineNo(display.view[fromIndex].line)
    fromNode = display.view[fromIndex - 1].node.nextSibling
  }
  var toIndex = findViewIndex(cm, to.line)
  var toLine, toNode
  if (toIndex == display.view.length - 1) {
    toLine = display.viewTo - 1
    toNode = display.lineDiv.lastChild
  } else {
    toLine = lineNo(display.view[toIndex + 1].line) - 1
    toNode = display.view[toIndex + 1].node.previousSibling
  }

  if (!fromNode) { return false }
  var newText = cm.doc.splitLines(domTextBetween(cm, fromNode, toNode, fromLine, toLine))
  var oldText = getBetween(cm.doc, Pos(fromLine, 0), Pos(toLine, getLine(cm.doc, toLine).text.length))
  while (newText.length > 1 && oldText.length > 1) {
    if (lst(newText) == lst(oldText)) { newText.pop(); oldText.pop(); toLine-- }
    else if (newText[0] == oldText[0]) { newText.shift(); oldText.shift(); fromLine++ }
    else { break }
  }

  var cutFront = 0, cutEnd = 0
  var newTop = newText[0], oldTop = oldText[0], maxCutFront = Math.min(newTop.length, oldTop.length)
  while (cutFront < maxCutFront && newTop.charCodeAt(cutFront) == oldTop.charCodeAt(cutFront))
    { ++cutFront }
  var newBot = lst(newText), oldBot = lst(oldText)
  var maxCutEnd = Math.min(newBot.length - (newText.length == 1 ? cutFront : 0),
                           oldBot.length - (oldText.length == 1 ? cutFront : 0))
  while (cutEnd < maxCutEnd &&
         newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1))
    { ++cutEnd }

  newText[newText.length - 1] = newBot.slice(0, newBot.length - cutEnd).replace(/^\u200b+/, "")
  newText[0] = newText[0].slice(cutFront).replace(/\u200b+$/, "")

  var chFrom = Pos(fromLine, cutFront)
  var chTo = Pos(toLine, oldText.length ? lst(oldText).length - cutEnd : 0)
  if (newText.length > 1 || newText[0] || cmp(chFrom, chTo)) {
    replaceRange(cm.doc, newText, chFrom, chTo, "+input")
    return true
  }
};

ContentEditableInput.prototype.ensurePolled = function () {
  this.forceCompositionEnd()
};
ContentEditableInput.prototype.reset = function () {
  this.forceCompositionEnd()
};
ContentEditableInput.prototype.forceCompositionEnd = function () {
  if (!this.composing) { return }
  clearTimeout(this.readDOMTimeout)
  this.composing = null
  if (!this.pollContent()) { regChange(this.cm) }
  this.div.blur()
  this.div.focus()
};
ContentEditableInput.prototype.readFromDOMSoon = function () {
    var this$1 = this;

  if (this.readDOMTimeout != null) { return }
  this.readDOMTimeout = setTimeout(function () {
    this$1.readDOMTimeout = null
    if (this$1.composing) {
      if (this$1.composing.done) { this$1.composing = null }
      else { return }
    }
    if (this$1.cm.isReadOnly() || !this$1.pollContent())
      { runInOp(this$1.cm, function () { return regChange(this$1.cm); }) }
  }, 80)
};

ContentEditableInput.prototype.setUneditable = function (node) {
  node.contentEditable = "false"
};

ContentEditableInput.prototype.onKeyPress = function (e) {
  e.preventDefault()
  if (!this.cm.isReadOnly())
    { operation(this.cm, applyTextInput)(this.cm, String.fromCharCode(e.charCode == null ? e.keyCode : e.charCode), 0) }
};

ContentEditableInput.prototype.readOnlyChanged = function (val) {
  this.div.contentEditable = String(val != "nocursor")
};

ContentEditableInput.prototype.onContextMenu = function () {};
ContentEditableInput.prototype.resetPosition = function () {};

ContentEditableInput.prototype.needsContentAttribute = true

function posToDOM(cm, pos) {
  var view = findViewForLine(cm, pos.line)
  if (!view || view.hidden) { return null }
  var line = getLine(cm.doc, pos.line)
  var info = mapFromLineView(view, line, pos.line)

  var order = getOrder(line), side = "left"
  if (order) {
    var partPos = getBidiPartAt(order, pos.ch)
    side = partPos % 2 ? "right" : "left"
  }
  var result = nodeAndOffsetInLineMap(info.map, pos.ch, side)
  result.offset = result.collapse == "right" ? result.end : result.start
  return result
}

function badPos(pos, bad) { if (bad) { pos.bad = true; } return pos }

function domTextBetween(cm, from, to, fromLine, toLine) {
  var text = "", closing = false, lineSep = cm.doc.lineSeparator()
  function recognizeMarker(id) { return function (marker) { return marker.id == id; } }
  function walk(node) {
    if (node.nodeType == 1) {
      var cmText = node.getAttribute("cm-text")
      if (cmText != null) {
        if (cmText == "") { text += node.textContent.replace(/\u200b/g, "") }
        else { text += cmText }
        return
      }
      var markerID = node.getAttribute("cm-marker"), range
      if (markerID) {
        var found = cm.findMarks(Pos(fromLine, 0), Pos(toLine + 1, 0), recognizeMarker(+markerID))
        if (found.length && (range = found[0].find()))
          { text += getBetween(cm.doc, range.from, range.to).join(lineSep) }
        return
      }
      if (node.getAttribute("contenteditable") == "false") { return }
      for (var i = 0; i < node.childNodes.length; i++)
        { walk(node.childNodes[i]) }
      if (/^(pre|div|p)$/i.test(node.nodeName))
        { closing = true }
    } else if (node.nodeType == 3) {
      var val = node.nodeValue
      if (!val) { return }
      if (closing) {
        text += lineSep
        closing = false
      }
      text += val
    }
  }
  for (;;) {
    walk(from)
    if (from == to) { break }
    from = from.nextSibling
  }
  return text
}

function domToPos(cm, node, offset) {
  var lineNode
  if (node == cm.display.lineDiv) {
    lineNode = cm.display.lineDiv.childNodes[offset]
    if (!lineNode) { return badPos(cm.clipPos(Pos(cm.display.viewTo - 1)), true) }
    node = null; offset = 0
  } else {
    for (lineNode = node;; lineNode = lineNode.parentNode) {
      if (!lineNode || lineNode == cm.display.lineDiv) { return null }
      if (lineNode.parentNode && lineNode.parentNode == cm.display.lineDiv) { break }
    }
  }
  for (var i = 0; i < cm.display.view.length; i++) {
    var lineView = cm.display.view[i]
    if (lineView.node == lineNode)
      { return locateNodeInLineView(lineView, node, offset) }
  }
}

function locateNodeInLineView(lineView, node, offset) {
  var wrapper = lineView.text.firstChild, bad = false
  if (!node || !contains(wrapper, node)) { return badPos(Pos(lineNo(lineView.line), 0), true) }
  if (node == wrapper) {
    bad = true
    node = wrapper.childNodes[offset]
    offset = 0
    if (!node) {
      var line = lineView.rest ? lst(lineView.rest) : lineView.line
      return badPos(Pos(lineNo(line), line.text.length), bad)
    }
  }

  var textNode = node.nodeType == 3 ? node : null, topNode = node
  if (!textNode && node.childNodes.length == 1 && node.firstChild.nodeType == 3) {
    textNode = node.firstChild
    if (offset) { offset = textNode.nodeValue.length }
  }
  while (topNode.parentNode != wrapper) { topNode = topNode.parentNode }
  var measure = lineView.measure, maps = measure.maps

  function find(textNode, topNode, offset) {
    for (var i = -1; i < (maps ? maps.length : 0); i++) {
      var map = i < 0 ? measure.map : maps[i]
      for (var j = 0; j < map.length; j += 3) {
        var curNode = map[j + 2]
        if (curNode == textNode || curNode == topNode) {
          var line = lineNo(i < 0 ? lineView.line : lineView.rest[i])
          var ch = map[j] + offset
          if (offset < 0 || curNode != textNode) { ch = map[j + (offset ? 1 : 0)] }
          return Pos(line, ch)
        }
      }
    }
  }
  var found = find(textNode, topNode, offset)
  if (found) { return badPos(found, bad) }

  // FIXME this is all really shaky. might handle the few cases it needs to handle, but likely to cause problems
  for (var after = topNode.nextSibling, dist = textNode ? textNode.nodeValue.length - offset : 0; after; after = after.nextSibling) {
    found = find(after, after.firstChild, 0)
    if (found)
      { return badPos(Pos(found.line, found.ch - dist), bad) }
    else
      { dist += after.textContent.length }
  }
  for (var before = topNode.previousSibling, dist$1 = offset; before; before = before.previousSibling) {
    found = find(before, before.firstChild, -1)
    if (found)
      { return badPos(Pos(found.line, found.ch + dist$1), bad) }
    else
      { dist$1 += before.textContent.length }
  }
}

// TEXTAREA INPUT STYLE

var TextareaInput = function(cm) {
  this.cm = cm
  // See input.poll and input.reset
  this.prevInput = ""

  // Flag that indicates whether we expect input to appear real soon
  // now (after some event like 'keypress' or 'input') and are
  // polling intensively.
  this.pollingFast = false
  // Self-resetting timeout for the poller
  this.polling = new Delayed()
  // Tracks when input.reset has punted to just putting a short
  // string into the textarea instead of the full selection.
  this.inaccurateSelection = false
  // Used to work around IE issue with selection being forgotten when focus moves away from textarea
  this.hasSelection = false
  this.composing = null
};

TextareaInput.prototype.init = function (display) {
    var this$1 = this;

  var input = this, cm = this.cm

  // Wraps and hides input textarea
  var div = this.wrapper = hiddenTextarea()
  // The semihidden textarea that is focused when the editor is
  // focused, and receives input.
  var te = this.textarea = div.firstChild
  display.wrapper.insertBefore(div, display.wrapper.firstChild)

  // Needed to hide big blue blinking cursor on Mobile Safari (doesn't seem to work in iOS 8 anymore)
  if (ios) { te.style.width = "0px" }

  on(te, "input", function () {
    if (ie && ie_version >= 9 && this$1.hasSelection) { this$1.hasSelection = null }
    input.poll()
  })

  on(te, "paste", function (e) {
    if (signalDOMEvent(cm, e) || handlePaste(e, cm)) { return }

    cm.state.pasteIncoming = true
    input.fastPoll()
  })

  function prepareCopyCut(e) {
    if (signalDOMEvent(cm, e)) { return }
    if (cm.somethingSelected()) {
      setLastCopied({lineWise: false, text: cm.getSelections()})
      if (input.inaccurateSelection) {
        input.prevInput = ""
        input.inaccurateSelection = false
        te.value = lastCopied.text.join("\n")
        selectInput(te)
      }
    } else if (!cm.options.lineWiseCopyCut) {
      return
    } else {
      var ranges = copyableRanges(cm)
      setLastCopied({lineWise: true, text: ranges.text})
      if (e.type == "cut") {
        cm.setSelections(ranges.ranges, null, sel_dontScroll)
      } else {
        input.prevInput = ""
        te.value = ranges.text.join("\n")
        selectInput(te)
      }
    }
    if (e.type == "cut") { cm.state.cutIncoming = true }
  }
  on(te, "cut", prepareCopyCut)
  on(te, "copy", prepareCopyCut)

  on(display.scroller, "paste", function (e) {
    if (eventInWidget(display, e) || signalDOMEvent(cm, e)) { return }
    cm.state.pasteIncoming = true
    input.focus()
  })

  // Prevent normal selection in the editor (we handle our own)
  on(display.lineSpace, "selectstart", function (e) {
    if (!eventInWidget(display, e)) { e_preventDefault(e) }
  })

  on(te, "compositionstart", function () {
    var start = cm.getCursor("from")
    if (input.composing) { input.composing.range.clear() }
    input.composing = {
      start: start,
      range: cm.markText(start, cm.getCursor("to"), {className: "CodeMirror-composing"})
    }
  })
  on(te, "compositionend", function () {
    if (input.composing) {
      input.poll()
      input.composing.range.clear()
      input.composing = null
    }
  })
};

TextareaInput.prototype.prepareSelection = function () {
  // Redraw the selection and/or cursor
  var cm = this.cm, display = cm.display, doc = cm.doc
  var result = prepareSelection(cm)

  // Move the hidden textarea near the cursor to prevent scrolling artifacts
  if (cm.options.moveInputWithCursor) {
    var headPos = cursorCoords(cm, doc.sel.primary().head, "div")
    var wrapOff = display.wrapper.getBoundingClientRect(), lineOff = display.lineDiv.getBoundingClientRect()
    result.teTop = Math.max(0, Math.min(display.wrapper.clientHeight - 10,
                                        headPos.top + lineOff.top - wrapOff.top))
    result.teLeft = Math.max(0, Math.min(display.wrapper.clientWidth - 10,
                                         headPos.left + lineOff.left - wrapOff.left))
  }

  return result
};

TextareaInput.prototype.showSelection = function (drawn) {
  var cm = this.cm, display = cm.display
  removeChildrenAndAdd(display.cursorDiv, drawn.cursors)
  removeChildrenAndAdd(display.selectionDiv, drawn.selection)
  if (drawn.teTop != null) {
    this.wrapper.style.top = drawn.teTop + "px"
    this.wrapper.style.left = drawn.teLeft + "px"
  }
};

// Reset the input to correspond to the selection (or to be empty,
// when not typing and nothing is selected)
TextareaInput.prototype.reset = function (typing) {
  if (this.contextMenuPending) { return }
  var minimal, selected, cm = this.cm, doc = cm.doc
  if (cm.somethingSelected()) {
    this.prevInput = ""
    var range = doc.sel.primary()
    minimal = hasCopyEvent &&
      (range.to().line - range.from().line > 100 || (selected = cm.getSelection()).length > 1000)
    var content = minimal ? "-" : selected || cm.getSelection()
    this.textarea.value = content
    if (cm.state.focused) { selectInput(this.textarea) }
    if (ie && ie_version >= 9) { this.hasSelection = content }
  } else if (!typing) {
    this.prevInput = this.textarea.value = ""
    if (ie && ie_version >= 9) { this.hasSelection = null }
  }
  this.inaccurateSelection = minimal
};

TextareaInput.prototype.getField = function () { return this.textarea };

TextareaInput.prototype.supportsTouch = function () { return false };

TextareaInput.prototype.focus = function () {
  if (this.cm.options.readOnly != "nocursor" && (!mobile || activeElt() != this.textarea)) {
    try { this.textarea.focus() }
    catch (e) {} // IE8 will throw if the textarea is display: none or not in DOM
  }
};

TextareaInput.prototype.blur = function () { this.textarea.blur() };

TextareaInput.prototype.resetPosition = function () {
  this.wrapper.style.top = this.wrapper.style.left = 0
};

TextareaInput.prototype.receivedFocus = function () { this.slowPoll() };

// Poll for input changes, using the normal rate of polling. This
// runs as long as the editor is focused.
TextareaInput.prototype.slowPoll = function () {
    var this$1 = this;

  if (this.pollingFast) { return }
  this.polling.set(this.cm.options.pollInterval, function () {
    this$1.poll()
    if (this$1.cm.state.focused) { this$1.slowPoll() }
  })
};

// When an event has just come in that is likely to add or change
// something in the input textarea, we poll faster, to ensure that
// the change appears on the screen quickly.
TextareaInput.prototype.fastPoll = function () {
  var missed = false, input = this
  input.pollingFast = true
  function p() {
    var changed = input.poll()
    if (!changed && !missed) {missed = true; input.polling.set(60, p)}
    else {input.pollingFast = false; input.slowPoll()}
  }
  input.polling.set(20, p)
};

// Read input from the textarea, and update the document to match.
// When something is selected, it is present in the textarea, and
// selected (unless it is huge, in which case a placeholder is
// used). When nothing is selected, the cursor sits after previously
// seen text (can be empty), which is stored in prevInput (we must
// not reset the textarea when typing, because that breaks IME).
TextareaInput.prototype.poll = function () {
    var this$1 = this;

  var cm = this.cm, input = this.textarea, prevInput = this.prevInput
  // Since this is called a *lot*, try to bail out as cheaply as
  // possible when it is clear that nothing happened. hasSelection
  // will be the case when there is a lot of text in the textarea,
  // in which case reading its value would be expensive.
  if (this.contextMenuPending || !cm.state.focused ||
      (hasSelection(input) && !prevInput && !this.composing) ||
      cm.isReadOnly() || cm.options.disableInput || cm.state.keySeq)
    { return false }

  var text = input.value
  // If nothing changed, bail.
  if (text == prevInput && !cm.somethingSelected()) { return false }
  // Work around nonsensical selection resetting in IE9/10, and
  // inexplicable appearance of private area unicode characters on
  // some key combos in Mac (#2689).
  if (ie && ie_version >= 9 && this.hasSelection === text ||
      mac && /[\uf700-\uf7ff]/.test(text)) {
    cm.display.input.reset()
    return false
  }

  if (cm.doc.sel == cm.display.selForContextMenu) {
    var first = text.charCodeAt(0)
    if (first == 0x200b && !prevInput) { prevInput = "\u200b" }
    if (first == 0x21da) { this.reset(); return this.cm.execCommand("undo") }
  }
  // Find the part of the input that is actually new
  var same = 0, l = Math.min(prevInput.length, text.length)
  while (same < l && prevInput.charCodeAt(same) == text.charCodeAt(same)) { ++same }

  runInOp(cm, function () {
    applyTextInput(cm, text.slice(same), prevInput.length - same,
                   null, this$1.composing ? "*compose" : null)

    // Don't leave long text in the textarea, since it makes further polling slow
    if (text.length > 1000 || text.indexOf("\n") > -1) { input.value = this$1.prevInput = "" }
    else { this$1.prevInput = text }

    if (this$1.composing) {
      this$1.composing.range.clear()
      this$1.composing.range = cm.markText(this$1.composing.start, cm.getCursor("to"),
                                         {className: "CodeMirror-composing"})
    }
  })
  return true
};

TextareaInput.prototype.ensurePolled = function () {
  if (this.pollingFast && this.poll()) { this.pollingFast = false }
};

TextareaInput.prototype.onKeyPress = function () {
  if (ie && ie_version >= 9) { this.hasSelection = null }
  this.fastPoll()
};

TextareaInput.prototype.onContextMenu = function (e) {
  var input = this, cm = input.cm, display = cm.display, te = input.textarea
  var pos = posFromMouse(cm, e), scrollPos = display.scroller.scrollTop
  if (!pos || presto) { return } // Opera is difficult.

  // Reset the current text selection only if the click is done outside of the selection
  // and 'resetSelectionOnContextMenu' option is true.
  var reset = cm.options.resetSelectionOnContextMenu
  if (reset && cm.doc.sel.contains(pos) == -1)
    { operation(cm, setSelection)(cm.doc, simpleSelection(pos), sel_dontScroll) }

  var oldCSS = te.style.cssText, oldWrapperCSS = input.wrapper.style.cssText
  input.wrapper.style.cssText = "position: absolute"
  var wrapperBox = input.wrapper.getBoundingClientRect()
  te.style.cssText = "position: absolute; width: 30px; height: 30px;\n      top: " + (e.clientY - wrapperBox.top - 5) + "px; left: " + (e.clientX - wrapperBox.left - 5) + "px;\n      z-index: 1000; background: " + (ie ? "rgba(255, 255, 255, .05)" : "transparent") + ";\n      outline: none; border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);"
  var oldScrollY
  if (webkit) { oldScrollY = window.scrollY } // Work around Chrome issue (#2712)
  display.input.focus()
  if (webkit) { window.scrollTo(null, oldScrollY) }
  display.input.reset()
  // Adds "Select all" to context menu in FF
  if (!cm.somethingSelected()) { te.value = input.prevInput = " " }
  input.contextMenuPending = true
  display.selForContextMenu = cm.doc.sel
  clearTimeout(display.detectingSelectAll)

  // Select-all will be greyed out if there's nothing to select, so
  // this adds a zero-width space so that we can later check whether
  // it got selected.
  function prepareSelectAllHack() {
    if (te.selectionStart != null) {
      var selected = cm.somethingSelected()
      var extval = "\u200b" + (selected ? te.value : "")
      te.value = "\u21da" // Used to catch context-menu undo
      te.value = extval
      input.prevInput = selected ? "" : "\u200b"
      te.selectionStart = 1; te.selectionEnd = extval.length
      // Re-set this, in case some other handler touched the
      // selection in the meantime.
      display.selForContextMenu = cm.doc.sel
    }
  }
  function rehide() {
    input.contextMenuPending = false
    input.wrapper.style.cssText = oldWrapperCSS
    te.style.cssText = oldCSS
    if (ie && ie_version < 9) { display.scrollbars.setScrollTop(display.scroller.scrollTop = scrollPos) }

    // Try to detect the user choosing select-all
    if (te.selectionStart != null) {
      if (!ie || (ie && ie_version < 9)) { prepareSelectAllHack() }
      var i = 0, poll = function () {
        if (display.selForContextMenu == cm.doc.sel && te.selectionStart == 0 &&
            te.selectionEnd > 0 && input.prevInput == "\u200b")
          { operation(cm, selectAll)(cm) }
        else if (i++ < 10) { display.detectingSelectAll = setTimeout(poll, 500) }
        else { display.input.reset() }
      }
      display.detectingSelectAll = setTimeout(poll, 200)
    }
  }

  if (ie && ie_version >= 9) { prepareSelectAllHack() }
  if (captureRightClick) {
    e_stop(e)
    var mouseup = function () {
      off(window, "mouseup", mouseup)
      setTimeout(rehide, 20)
    }
    on(window, "mouseup", mouseup)
  } else {
    setTimeout(rehide, 50)
  }
};

TextareaInput.prototype.readOnlyChanged = function (val) {
  if (!val) { this.reset() }
};

TextareaInput.prototype.setUneditable = function () {};

TextareaInput.prototype.needsContentAttribute = false

function fromTextArea(textarea, options) {
  options = options ? copyObj(options) : {}
  options.value = textarea.value
  if (!options.tabindex && textarea.tabIndex)
    { options.tabindex = textarea.tabIndex }
  if (!options.placeholder && textarea.placeholder)
    { options.placeholder = textarea.placeholder }
  // Set autofocus to true if this textarea is focused, or if it has
  // autofocus and no other element is focused.
  if (options.autofocus == null) {
    var hasFocus = activeElt()
    options.autofocus = hasFocus == textarea ||
      textarea.getAttribute("autofocus") != null && hasFocus == document.body
  }

  function save() {textarea.value = cm.getValue()}

  var realSubmit
  if (textarea.form) {
    on(textarea.form, "submit", save)
    // Deplorable hack to make the submit method do the right thing.
    if (!options.leaveSubmitMethodAlone) {
      var form = textarea.form
      realSubmit = form.submit
      try {
        var wrappedSubmit = form.submit = function () {
          save()
          form.submit = realSubmit
          form.submit()
          form.submit = wrappedSubmit
        }
      } catch(e) {}
    }
  }

  options.finishInit = function (cm) {
    cm.save = save
    cm.getTextArea = function () { return textarea; }
    cm.toTextArea = function () {
      cm.toTextArea = isNaN // Prevent this from being ran twice
      save()
      textarea.parentNode.removeChild(cm.getWrapperElement())
      textarea.style.display = ""
      if (textarea.form) {
        off(textarea.form, "submit", save)
        if (typeof textarea.form.submit == "function")
          { textarea.form.submit = realSubmit }
      }
    }
  }

  textarea.style.display = "none"
  var cm = CodeMirror(function (node) { return textarea.parentNode.insertBefore(node, textarea.nextSibling); },
    options)
  return cm
}

function addLegacyProps(CodeMirror) {
  CodeMirror.off = off
  CodeMirror.on = on
  CodeMirror.wheelEventPixels = wheelEventPixels
  CodeMirror.Doc = Doc
  CodeMirror.splitLines = splitLinesAuto
  CodeMirror.countColumn = countColumn
  CodeMirror.findColumn = findColumn
  CodeMirror.isWordChar = isWordCharBasic
  CodeMirror.Pass = Pass
  CodeMirror.signal = signal
  CodeMirror.Line = Line
  CodeMirror.changeEnd = changeEnd
  CodeMirror.scrollbarModel = scrollbarModel
  CodeMirror.Pos = Pos
  CodeMirror.cmpPos = cmp
  CodeMirror.modes = modes
  CodeMirror.mimeModes = mimeModes
  CodeMirror.resolveMode = resolveMode
  CodeMirror.getMode = getMode
  CodeMirror.modeExtensions = modeExtensions
  CodeMirror.extendMode = extendMode
  CodeMirror.copyState = copyState
  CodeMirror.startState = startState
  CodeMirror.innerMode = innerMode
  CodeMirror.commands = commands
  CodeMirror.keyMap = keyMap
  CodeMirror.keyName = keyName
  CodeMirror.isModifierKey = isModifierKey
  CodeMirror.lookupKey = lookupKey
  CodeMirror.normalizeKeyMap = normalizeKeyMap
  CodeMirror.StringStream = StringStream
  CodeMirror.SharedTextMarker = SharedTextMarker
  CodeMirror.TextMarker = TextMarker
  CodeMirror.LineWidget = LineWidget
  CodeMirror.e_preventDefault = e_preventDefault
  CodeMirror.e_stopPropagation = e_stopPropagation
  CodeMirror.e_stop = e_stop
  CodeMirror.addClass = addClass
  CodeMirror.contains = contains
  CodeMirror.rmClass = rmClass
  CodeMirror.keyNames = keyNames
}

// EDITOR CONSTRUCTOR

defineOptions(CodeMirror)

addEditorMethods(CodeMirror)

// Set up methods on CodeMirror's prototype to redirect to the editor's document.
var dontDelegate = "iter insert remove copy getEditor constructor".split(" ")
for (var prop in Doc.prototype) { if (Doc.prototype.hasOwnProperty(prop) && indexOf(dontDelegate, prop) < 0)
  { CodeMirror.prototype[prop] = (function(method) {
    return function() {return method.apply(this.doc, arguments)}
  })(Doc.prototype[prop]) } }

eventMixin(Doc)

// INPUT HANDLING

CodeMirror.inputStyles = {"textarea": TextareaInput, "contenteditable": ContentEditableInput}

// MODE DEFINITION AND QUERYING

// Extra arguments are stored as the mode's dependencies, which is
// used by (legacy) mechanisms like loadmode.js to automatically
// load a mode. (Preferred mechanism is the require/define calls.)
CodeMirror.defineMode = function(name/*, mode, …*/) {
  if (!CodeMirror.defaults.mode && name != "null") { CodeMirror.defaults.mode = name }
  defineMode.apply(this, arguments)
}

CodeMirror.defineMIME = defineMIME

// Minimal default mode.
CodeMirror.defineMode("null", function () { return ({token: function (stream) { return stream.skipToEnd(); }}); })
CodeMirror.defineMIME("text/plain", "null")

// EXTENSIONS

CodeMirror.defineExtension = function (name, func) {
  CodeMirror.prototype[name] = func
}
CodeMirror.defineDocExtension = function (name, func) {
  Doc.prototype[name] = func
}

CodeMirror.fromTextArea = fromTextArea

addLegacyProps(CodeMirror)

CodeMirror.version = "5.23.0"

return CodeMirror;

})));// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  var Pos = CodeMirror.Pos;

  function SearchCursor(doc, query, pos, caseFold) {
    this.atOccurrence = false; this.doc = doc;
    if (caseFold == null && typeof query == "string") caseFold = false;

    pos = pos ? doc.clipPos(pos) : Pos(0, 0);
    this.pos = {from: pos, to: pos};

    // The matches method is filled in based on the type of query.
    // It takes a position and a direction, and returns an object
    // describing the next occurrence of the query, or null if no
    // more matches were found.
    if (typeof query != "string") { // Regexp match
      if (!query.global) query = new RegExp(query.source, query.ignoreCase ? "ig" : "g");
      this.matches = function(reverse, pos) {
        if (reverse) {
          query.lastIndex = 0;
          var line = doc.getLine(pos.line).slice(0, pos.ch), cutOff = 0, match, start;
          for (;;) {
            query.lastIndex = cutOff;
            var newMatch = query.exec(line);
            if (!newMatch) break;
            match = newMatch;
            start = match.index;
            cutOff = match.index + (match[0].length || 1);
            if (cutOff == line.length) break;
          }
          var matchLen = (match && match[0].length) || 0;
          if (!matchLen) {
            if (start == 0 && line.length == 0) {match = undefined;}
            else if (start != doc.getLine(pos.line).length) {
              matchLen++;
            }
          }
        } else {
          query.lastIndex = pos.ch;
          var line = doc.getLine(pos.line), match = query.exec(line);
          var matchLen = (match && match[0].length) || 0;
          var start = match && match.index;
          if (start + matchLen != line.length && !matchLen) matchLen = 1;
        }
        if (match && matchLen)
          return {from: Pos(pos.line, start),
                  to: Pos(pos.line, start + matchLen),
                  match: match};
      };
    } else { // String query
      var origQuery = query;
      if (caseFold) query = query.toLowerCase();
      var fold = caseFold ? function(str){return str.toLowerCase();} : function(str){return str;};
      var target = query.split("\n");
      // Different methods for single-line and multi-line queries
      if (target.length == 1) {
        if (!query.length) {
          // Empty string would match anything and never progress, so
          // we define it to match nothing instead.
          this.matches = function() {};
        } else {
          this.matches = function(reverse, pos) {
            if (reverse) {
              var orig = doc.getLine(pos.line).slice(0, pos.ch), line = fold(orig);
              var match = line.lastIndexOf(query);
              if (match > -1) {
                match = adjustPos(orig, line, match);
                return {from: Pos(pos.line, match), to: Pos(pos.line, match + origQuery.length)};
              }
             } else {
               var orig = doc.getLine(pos.line).slice(pos.ch), line = fold(orig);
               var match = line.indexOf(query);
               if (match > -1) {
                 match = adjustPos(orig, line, match) + pos.ch;
                 return {from: Pos(pos.line, match), to: Pos(pos.line, match + origQuery.length)};
               }
            }
          };
        }
      } else {
        var origTarget = origQuery.split("\n");
        this.matches = function(reverse, pos) {
          var last = target.length - 1;
          if (reverse) {
            if (pos.line - (target.length - 1) < doc.firstLine()) return;
            if (fold(doc.getLine(pos.line).slice(0, origTarget[last].length)) != target[target.length - 1]) return;
            var to = Pos(pos.line, origTarget[last].length);
            for (var ln = pos.line - 1, i = last - 1; i >= 1; --i, --ln)
              if (target[i] != fold(doc.getLine(ln))) return;
            var line = doc.getLine(ln), cut = line.length - origTarget[0].length;
            if (fold(line.slice(cut)) != target[0]) return;
            return {from: Pos(ln, cut), to: to};
          } else {
            if (pos.line + (target.length - 1) > doc.lastLine()) return;
            var line = doc.getLine(pos.line), cut = line.length - origTarget[0].length;
            if (fold(line.slice(cut)) != target[0]) return;
            var from = Pos(pos.line, cut);
            for (var ln = pos.line + 1, i = 1; i < last; ++i, ++ln)
              if (target[i] != fold(doc.getLine(ln))) return;
            if (fold(doc.getLine(ln).slice(0, origTarget[last].length)) != target[last]) return;
            return {from: from, to: Pos(ln, origTarget[last].length)};
          }
        };
      }
    }
  }

  SearchCursor.prototype = {
    findNext: function() {return this.find(false);},
    findPrevious: function() {return this.find(true);},

    find: function(reverse) {
      var self = this, pos = this.doc.clipPos(reverse ? this.pos.from : this.pos.to);
      function savePosAndFail(line) {
        var pos = Pos(line, 0);
        self.pos = {from: pos, to: pos};
        self.atOccurrence = false;
        return false;
      }

      for (;;) {
        if (this.pos = this.matches(reverse, pos)) {
          this.atOccurrence = true;
          return this.pos.match || true;
        }
        if (reverse) {
          if (!pos.line) return savePosAndFail(0);
          pos = Pos(pos.line-1, this.doc.getLine(pos.line-1).length);
        }
        else {
          var maxLine = this.doc.lineCount();
          if (pos.line == maxLine - 1) return savePosAndFail(maxLine);
          pos = Pos(pos.line + 1, 0);
        }
      }
    },

    from: function() {if (this.atOccurrence) return this.pos.from;},
    to: function() {if (this.atOccurrence) return this.pos.to;},

    replace: function(newText, origin) {
      if (!this.atOccurrence) return;
      var lines = CodeMirror.splitLines(newText);
      this.doc.replaceRange(lines, this.pos.from, this.pos.to, origin);
      this.pos.to = Pos(this.pos.from.line + lines.length - 1,
                        lines[lines.length - 1].length + (lines.length == 1 ? this.pos.from.ch : 0));
    }
  };

  // Maps a position in a case-folded line back to a position in the original line
  // (compensating for codepoints increasing in number during folding)
  function adjustPos(orig, folded, pos) {
    if (orig.length == folded.length) return pos;
    for (var pos1 = Math.min(pos, orig.length);;) {
      var len1 = orig.slice(0, pos1).toLowerCase().length;
      if (len1 < pos) ++pos1;
      else if (len1 > pos) --pos1;
      else return pos1;
    }
  }

  CodeMirror.defineExtension("getSearchCursor", function(query, pos, caseFold) {
    return new SearchCursor(this.doc, query, pos, caseFold);
  });
  CodeMirror.defineDocExtension("getSearchCursor", function(query, pos, caseFold) {
    return new SearchCursor(this, query, pos, caseFold);
  });

  CodeMirror.defineExtension("selectMatches", function(query, caseFold) {
    var ranges = [];
    var cur = this.getSearchCursor(query, this.getCursor("from"), caseFold);
    while (cur.findNext()) {
      if (CodeMirror.cmpPos(cur.to(), this.getCursor("to")) > 0) break;
      ranges.push({anchor: cur.from(), head: cur.to()});
    }
    if (ranges.length)
      this.setSelections(ranges, 0);
  });
});
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// Highlighting text that matches the selection
//
// Defines an option highlightSelectionMatches, which, when enabled,
// will style strings that match the selection throughout the
// document.
//
// The option can be set to true to simply enable it, or to a
// {minChars, style, wordsOnly, showToken, delay} object to explicitly
// configure it. minChars is the minimum amount of characters that should be
// selected for the behavior to occur, and style is the token style to
// apply to the matches. This will be prefixed by "cm-" to create an
// actual CSS class name. If wordsOnly is enabled, the matches will be
// highlighted only if the selected text is a word. showToken, when enabled,
// will cause the current token to be highlighted when nothing is selected.
// delay is used to specify how much time to wait, in milliseconds, before
// highlighting the matches. If annotateScrollbar is enabled, the occurences
// will be highlighted on the scrollbar via the matchesonscrollbar addon.

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"), require("./matchesonscrollbar"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror", "./matchesonscrollbar"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var defaults = {
    style: "matchhighlight",
    minChars: 2,
    delay: 100,
    wordsOnly: false,
    annotateScrollbar: false,
    showToken: false,
    trim: true
  }

  function State(options) {
    this.options = {}
    for (var name in defaults)
      this.options[name] = (options && options.hasOwnProperty(name) ? options : defaults)[name]
    this.overlay = this.timeout = null;
    this.matchesonscroll = null;
    this.active = false;
  }

  CodeMirror.defineOption("highlightSelectionMatches", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init) {
      removeOverlay(cm);
      clearTimeout(cm.state.matchHighlighter.timeout);
      cm.state.matchHighlighter = null;
      cm.off("cursorActivity", cursorActivity);
      cm.off("focus", onFocus)
    }
    if (val) {
      var state = cm.state.matchHighlighter = new State(val);
      if (cm.hasFocus()) {
        state.active = true
        highlightMatches(cm)
      } else {
        cm.on("focus", onFocus)
      }
      cm.on("cursorActivity", cursorActivity);
    }
  });

  function cursorActivity(cm) {
    var state = cm.state.matchHighlighter;
    if (state.active || cm.hasFocus()) scheduleHighlight(cm, state)
  }

  function onFocus(cm) {
    var state = cm.state.matchHighlighter
    if (!state.active) {
      state.active = true
      scheduleHighlight(cm, state)
    }
  }

  function scheduleHighlight(cm, state) {
    clearTimeout(state.timeout);
    state.timeout = setTimeout(function() {highlightMatches(cm);}, state.options.delay);
  }

  function addOverlay(cm, query, hasBoundary, style) {
    var state = cm.state.matchHighlighter;
    cm.addOverlay(state.overlay = makeOverlay(query, hasBoundary, style));
    if (state.options.annotateScrollbar && cm.showMatchesOnScrollbar) {
      var searchFor = hasBoundary ? new RegExp("\\b" + query + "\\b") : query;
      state.matchesonscroll = cm.showMatchesOnScrollbar(searchFor, false,
        {className: "CodeMirror-selection-highlight-scrollbar"});
    }
  }

  function removeOverlay(cm) {
    var state = cm.state.matchHighlighter;
    if (state.overlay) {
      cm.removeOverlay(state.overlay);
      state.overlay = null;
      if (state.matchesonscroll) {
        state.matchesonscroll.clear();
        state.matchesonscroll = null;
      }
    }
  }

  function highlightMatches(cm) {
    cm.operation(function() {
      var state = cm.state.matchHighlighter;
      removeOverlay(cm);
      if (!cm.somethingSelected() && state.options.showToken) {
        var re = state.options.showToken === true ? /[\w$]/ : state.options.showToken;
        var cur = cm.getCursor(), line = cm.getLine(cur.line), start = cur.ch, end = start;
        while (start && re.test(line.charAt(start - 1))) --start;
        while (end < line.length && re.test(line.charAt(end))) ++end;
        if (start < end)
          addOverlay(cm, line.slice(start, end), re, state.options.style);
        return;
      }
      var from = cm.getCursor("from"), to = cm.getCursor("to");
      if (from.line != to.line) return;
      if (state.options.wordsOnly && !isWord(cm, from, to)) return;
      var selection = cm.getRange(from, to)
      if (state.options.trim) selection = selection.replace(/^\s+|\s+$/g, "")
      if (selection.length >= state.options.minChars)
        addOverlay(cm, selection, false, state.options.style);
    });
  }

  function isWord(cm, from, to) {
    var str = cm.getRange(from, to);
    if (str.match(/^\w+$/) !== null) {
        if (from.ch > 0) {
            var pos = {line: from.line, ch: from.ch - 1};
            var chr = cm.getRange(pos, from);
            if (chr.match(/\W/) === null) return false;
        }
        if (to.ch < cm.getLine(from.line).length) {
            var pos = {line: to.line, ch: to.ch + 1};
            var chr = cm.getRange(to, pos);
            if (chr.match(/\W/) === null) return false;
        }
        return true;
    } else return false;
  }

  function boundariesAround(stream, re) {
    return (!stream.start || !re.test(stream.string.charAt(stream.start - 1))) &&
      (stream.pos == stream.string.length || !re.test(stream.string.charAt(stream.pos)));
  }

  function makeOverlay(query, hasBoundary, style) {
    return {token: function(stream) {
      if (stream.match(query) &&
          (!hasBoundary || boundariesAround(stream, hasBoundary)))
        return style;
      stream.next();
      stream.skipTo(query.charAt(0)) || stream.skipToEnd();
    }};
  }
});
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"), require("./searchcursor"), require("../scroll/annotatescrollbar"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror", "./searchcursor", "../scroll/annotatescrollbar"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  CodeMirror.defineExtension("showMatchesOnScrollbar", function(query, caseFold, options) {
    if (typeof options == "string") options = {className: options};
    if (!options) options = {};
    return new SearchAnnotation(this, query, caseFold, options);
  });

  function SearchAnnotation(cm, query, caseFold, options) {
    this.cm = cm;
    this.options = options;
    var annotateOptions = {listenForChanges: false};
    for (var prop in options) annotateOptions[prop] = options[prop];
    if (!annotateOptions.className) annotateOptions.className = "CodeMirror-search-match";
    this.annotation = cm.annotateScrollbar(annotateOptions);
    this.query = query;
    this.caseFold = caseFold;
    this.gap = {from: cm.firstLine(), to: cm.lastLine() + 1};
    this.matches = [];
    this.update = null;

    this.findMatches();
    this.annotation.update(this.matches);

    var self = this;
    cm.on("change", this.changeHandler = function(_cm, change) { self.onChange(change); });
  }

  var MAX_MATCHES = 1000;

  SearchAnnotation.prototype.findMatches = function() {
    if (!this.gap) return;
    for (var i = 0; i < this.matches.length; i++) {
      var match = this.matches[i];
      if (match.from.line >= this.gap.to) break;
      if (match.to.line >= this.gap.from) this.matches.splice(i--, 1);
    }
    var cursor = this.cm.getSearchCursor(this.query, CodeMirror.Pos(this.gap.from, 0), this.caseFold);
    var maxMatches = this.options && this.options.maxMatches || MAX_MATCHES;
    while (cursor.findNext()) {
      var match = {from: cursor.from(), to: cursor.to()};
      if (match.from.line >= this.gap.to) break;
      this.matches.splice(i++, 0, match);
      if (this.matches.length > maxMatches) break;
    }
    this.gap = null;
  };

  function offsetLine(line, changeStart, sizeChange) {
    if (line <= changeStart) return line;
    return Math.max(changeStart, line + sizeChange);
  }

  SearchAnnotation.prototype.onChange = function(change) {
    var startLine = change.from.line;
    var endLine = CodeMirror.changeEnd(change).line;
    var sizeChange = endLine - change.to.line;
    if (this.gap) {
      this.gap.from = Math.min(offsetLine(this.gap.from, startLine, sizeChange), change.from.line);
      this.gap.to = Math.max(offsetLine(this.gap.to, startLine, sizeChange), change.from.line);
    } else {
      this.gap = {from: change.from.line, to: endLine + 1};
    }

    if (sizeChange) for (var i = 0; i < this.matches.length; i++) {
      var match = this.matches[i];
      var newFrom = offsetLine(match.from.line, startLine, sizeChange);
      if (newFrom != match.from.line) match.from = CodeMirror.Pos(newFrom, match.from.ch);
      var newTo = offsetLine(match.to.line, startLine, sizeChange);
      if (newTo != match.to.line) match.to = CodeMirror.Pos(newTo, match.to.ch);
    }
    clearTimeout(this.update);
    var self = this;
    this.update = setTimeout(function() { self.updateAfterChange(); }, 250);
  };

  SearchAnnotation.prototype.updateAfterChange = function() {
    this.findMatches();
    this.annotation.update(this.matches);
  };

  SearchAnnotation.prototype.clear = function() {
    this.cm.off("change", this.changeHandler);
    this.annotation.clear();
  };
});
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  var defaults = {
    pairs: "()[]{}''\"\"",
    triples: "",
    explode: "[]{}"
  };

  var Pos = CodeMirror.Pos;

  CodeMirror.defineOption("autoCloseBrackets", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init) {
      cm.removeKeyMap(keyMap);
      cm.state.closeBrackets = null;
    }
    if (val) {
      cm.state.closeBrackets = val;
      cm.addKeyMap(keyMap);
    }
  });

  function getOption(conf, name) {
    if (name == "pairs" && typeof conf == "string") return conf;
    if (typeof conf == "object" && conf[name] != null) return conf[name];
    return defaults[name];
  }

  var bind = defaults.pairs + "`";
  var keyMap = {Backspace: handleBackspace, Enter: handleEnter};
  for (var i = 0; i < bind.length; i++)
    keyMap["'" + bind.charAt(i) + "'"] = handler(bind.charAt(i));

  function handler(ch) {
    return function(cm) { return handleChar(cm, ch); };
  }

  function getConfig(cm) {
    var deflt = cm.state.closeBrackets;
    if (!deflt || deflt.override) return deflt;
    var mode = cm.getModeAt(cm.getCursor());
    return mode.closeBrackets || deflt;
  }

  function handleBackspace(cm) {
    var conf = getConfig(cm);
    if (!conf || cm.getOption("disableInput")) return CodeMirror.Pass;

    var pairs = getOption(conf, "pairs");
    var ranges = cm.listSelections();
    for (var i = 0; i < ranges.length; i++) {
      if (!ranges[i].empty()) return CodeMirror.Pass;
      var around = charsAround(cm, ranges[i].head);
      if (!around || pairs.indexOf(around) % 2 != 0) return CodeMirror.Pass;
    }
    for (var i = ranges.length - 1; i >= 0; i--) {
      var cur = ranges[i].head;
      cm.replaceRange("", Pos(cur.line, cur.ch - 1), Pos(cur.line, cur.ch + 1), "+delete");
    }
  }

  function handleEnter(cm) {
    var conf = getConfig(cm);
    var explode = conf && getOption(conf, "explode");
    if (!explode || cm.getOption("disableInput")) return CodeMirror.Pass;

    var ranges = cm.listSelections();
    for (var i = 0; i < ranges.length; i++) {
      if (!ranges[i].empty()) return CodeMirror.Pass;
      var around = charsAround(cm, ranges[i].head);
      if (!around || explode.indexOf(around) % 2 != 0) return CodeMirror.Pass;
    }
    cm.operation(function() {
      cm.replaceSelection("\n\n", null);
      cm.execCommand("goCharLeft");
      ranges = cm.listSelections();
      for (var i = 0; i < ranges.length; i++) {
        var line = ranges[i].head.line;
        cm.indentLine(line, null, true);
        cm.indentLine(line + 1, null, true);
      }
    });
  }

  function contractSelection(sel) {
    var inverted = CodeMirror.cmpPos(sel.anchor, sel.head) > 0;
    return {anchor: new Pos(sel.anchor.line, sel.anchor.ch + (inverted ? -1 : 1)),
            head: new Pos(sel.head.line, sel.head.ch + (inverted ? 1 : -1))};
  }

  function handleChar(cm, ch) {
    var conf = getConfig(cm);
    if (!conf || cm.getOption("disableInput")) return CodeMirror.Pass;

    var pairs = getOption(conf, "pairs");
    var pos = pairs.indexOf(ch);
    if (pos == -1) return CodeMirror.Pass;
    var triples = getOption(conf, "triples");

    var identical = pairs.charAt(pos + 1) == ch;
    var ranges = cm.listSelections();
    var opening = pos % 2 == 0;

    var type;
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i], cur = range.head, curType;
      var next = cm.getRange(cur, Pos(cur.line, cur.ch + 1));
      if (opening && !range.empty()) {
        curType = "surround";
      } else if ((identical || !opening) && next == ch) {
        if (identical && stringStartsAfter(cm, cur))
          curType = "both";
        else if (triples.indexOf(ch) >= 0 && cm.getRange(cur, Pos(cur.line, cur.ch + 3)) == ch + ch + ch)
          curType = "skipThree";
        else
          curType = "skip";
      } else if (identical && cur.ch > 1 && triples.indexOf(ch) >= 0 &&
                 cm.getRange(Pos(cur.line, cur.ch - 2), cur) == ch + ch &&
                 (cur.ch <= 2 || cm.getRange(Pos(cur.line, cur.ch - 3), Pos(cur.line, cur.ch - 2)) != ch)) {
        curType = "addFour";
      } else if (identical) {
        if (!CodeMirror.isWordChar(next) && enteringString(cm, cur, ch)) curType = "both";
        else return CodeMirror.Pass;
      } else if (opening && (cm.getLine(cur.line).length == cur.ch ||
                             isClosingBracket(next, pairs) ||
                             /\s/.test(next))) {
        curType = "both";
      } else {
        return CodeMirror.Pass;
      }
      if (!type) type = curType;
      else if (type != curType) return CodeMirror.Pass;
    }

    var left = pos % 2 ? pairs.charAt(pos - 1) : ch;
    var right = pos % 2 ? ch : pairs.charAt(pos + 1);
    cm.operation(function() {
      if (type == "skip") {
        cm.execCommand("goCharRight");
      } else if (type == "skipThree") {
        for (var i = 0; i < 3; i++)
          cm.execCommand("goCharRight");
      } else if (type == "surround") {
        var sels = cm.getSelections();
        for (var i = 0; i < sels.length; i++)
          sels[i] = left + sels[i] + right;
        cm.replaceSelections(sels, "around");
        sels = cm.listSelections().slice();
        for (var i = 0; i < sels.length; i++)
          sels[i] = contractSelection(sels[i]);
        cm.setSelections(sels);
      } else if (type == "both") {
        cm.replaceSelection(left + right, null);
        cm.triggerElectric(left + right);
        cm.execCommand("goCharLeft");
      } else if (type == "addFour") {
        cm.replaceSelection(left + left + left + left, "before");
        cm.execCommand("goCharRight");
      }
    });
  }

  function isClosingBracket(ch, pairs) {
    var pos = pairs.lastIndexOf(ch);
    return pos > -1 && pos % 2 == 1;
  }

  function charsAround(cm, pos) {
    var str = cm.getRange(Pos(pos.line, pos.ch - 1),
                          Pos(pos.line, pos.ch + 1));
    return str.length == 2 ? str : null;
  }

  // Project the token type that will exists after the given char is
  // typed, and use it to determine whether it would cause the start
  // of a string token.
  function enteringString(cm, pos, ch) {
    var line = cm.getLine(pos.line);
    var token = cm.getTokenAt(pos);
    if (/\bstring2?\b/.test(token.type)) return false;
    var stream = new CodeMirror.StringStream(line.slice(0, pos.ch) + ch + line.slice(pos.ch), 4);
    stream.pos = stream.start = token.start;
    for (;;) {
      var type1 = cm.getMode().token(stream, token.state);
      if (stream.pos >= pos.ch + 1) return /\bstring2?\b/.test(type1);
      stream.start = stream.pos;
    }
  }

  function stringStartsAfter(cm, pos) {
    var token = cm.getTokenAt(Pos(pos.line, pos.ch + 1))
    return /\bstring/.test(token.type) && token.start == pos.ch
  }
});
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  var ie_lt8 = /MSIE \d/.test(navigator.userAgent) &&
    (document.documentMode == null || document.documentMode < 8);

  var Pos = CodeMirror.Pos;

  var matching = {"(": ")>", ")": "(<", "[": "]>", "]": "[<", "{": "}>", "}": "{<"};

  function findMatchingBracket(cm, where, strict, config) {
    var line = cm.getLineHandle(where.line), pos = where.ch - 1;
    var match = (pos >= 0 && matching[line.text.charAt(pos)]) || matching[line.text.charAt(++pos)];
    if (!match) return null;
    var dir = match.charAt(1) == ">" ? 1 : -1;
    if (strict && (dir > 0) != (pos == where.ch)) return null;
    var style = cm.getTokenTypeAt(Pos(where.line, pos + 1));

    var found = scanForBracket(cm, Pos(where.line, pos + (dir > 0 ? 1 : 0)), dir, style || null, config);
    if (found == null) return null;
    return {from: Pos(where.line, pos), to: found && found.pos,
            match: found && found.ch == match.charAt(0), forward: dir > 0};
  }

  // bracketRegex is used to specify which type of bracket to scan
  // should be a regexp, e.g. /[[\]]/
  //
  // Note: If "where" is on an open bracket, then this bracket is ignored.
  //
  // Returns false when no bracket was found, null when it reached
  // maxScanLines and gave up
  function scanForBracket(cm, where, dir, style, config) {
    var maxScanLen = (config && config.maxScanLineLength) || 10000;
    var maxScanLines = (config && config.maxScanLines) || 1000;

    var stack = [];
    var re = config && config.bracketRegex ? config.bracketRegex : /[(){}[\]]/;
    var lineEnd = dir > 0 ? Math.min(where.line + maxScanLines, cm.lastLine() + 1)
                          : Math.max(cm.firstLine() - 1, where.line - maxScanLines);
    for (var lineNo = where.line; lineNo != lineEnd; lineNo += dir) {
      var line = cm.getLine(lineNo);
      if (!line) continue;
      var pos = dir > 0 ? 0 : line.length - 1, end = dir > 0 ? line.length : -1;
      if (line.length > maxScanLen) continue;
      if (lineNo == where.line) pos = where.ch - (dir < 0 ? 1 : 0);
      for (; pos != end; pos += dir) {
        var ch = line.charAt(pos);
        if (re.test(ch) && (style === undefined || cm.getTokenTypeAt(Pos(lineNo, pos + 1)) == style)) {
          var match = matching[ch];
          if ((match.charAt(1) == ">") == (dir > 0)) stack.push(ch);
          else if (!stack.length) return {pos: Pos(lineNo, pos), ch: ch};
          else stack.pop();
        }
      }
    }
    return lineNo - dir == (dir > 0 ? cm.lastLine() : cm.firstLine()) ? false : null;
  }

  function matchBrackets(cm, autoclear, config) {
    // Disable brace matching in long lines, since it'll cause hugely slow updates
    var maxHighlightLen = cm.state.matchBrackets.maxHighlightLineLength || 1000;
    var marks = [], ranges = cm.listSelections();
    for (var i = 0; i < ranges.length; i++) {
      var match = ranges[i].empty() && findMatchingBracket(cm, ranges[i].head, false, config);
      if (match && cm.getLine(match.from.line).length <= maxHighlightLen) {
        var style = match.match ? "CodeMirror-matchingbracket" : "CodeMirror-nonmatchingbracket";
        marks.push(cm.markText(match.from, Pos(match.from.line, match.from.ch + 1), {className: style}));
        if (match.to && cm.getLine(match.to.line).length <= maxHighlightLen)
          marks.push(cm.markText(match.to, Pos(match.to.line, match.to.ch + 1), {className: style}));
      }
    }

    if (marks.length) {
      // Kludge to work around the IE bug from issue #1193, where text
      // input stops going to the textare whever this fires.
      if (ie_lt8 && cm.state.focused) cm.focus();

      var clear = function() {
        cm.operation(function() {
          for (var i = 0; i < marks.length; i++) marks[i].clear();
        });
      };
      if (autoclear) setTimeout(clear, 800);
      else return clear;
    }
  }

  var currentlyHighlighted = null;
  function doMatchBrackets(cm) {
    cm.operation(function() {
      if (currentlyHighlighted) {currentlyHighlighted(); currentlyHighlighted = null;}
      currentlyHighlighted = matchBrackets(cm, false, cm.state.matchBrackets);
    });
  }

  CodeMirror.defineOption("matchBrackets", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init) {
      cm.off("cursorActivity", doMatchBrackets);
      if (currentlyHighlighted) {currentlyHighlighted(); currentlyHighlighted = null;}
    }
    if (val) {
      cm.state.matchBrackets = typeof val == "object" ? val : {};
      cm.on("cursorActivity", doMatchBrackets);
    }
  });

  CodeMirror.defineExtension("matchBrackets", function() {matchBrackets(this, true);});
  CodeMirror.defineExtension("findMatchingBracket", function(pos, strict, config){
    return findMatchingBracket(this, pos, strict, config);
  });
  CodeMirror.defineExtension("scanForBracket", function(pos, dir, style, config){
    return scanForBracket(this, pos, dir, style, config);
  });
});
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  function Bar(cls, orientation, scroll) {
    this.orientation = orientation;
    this.scroll = scroll;
    this.screen = this.total = this.size = 1;
    this.pos = 0;

    this.node = document.createElement("div");
    this.node.className = cls + "-" + orientation;
    this.inner = this.node.appendChild(document.createElement("div"));

    var self = this;
    CodeMirror.on(this.inner, "mousedown", function(e) {
      if (e.which != 1) return;
      CodeMirror.e_preventDefault(e);
      var axis = self.orientation == "horizontal" ? "pageX" : "pageY";
      var start = e[axis], startpos = self.pos;
      function done() {
        CodeMirror.off(document, "mousemove", move);
        CodeMirror.off(document, "mouseup", done);
      }
      function move(e) {
        if (e.which != 1) return done();
        self.moveTo(startpos + (e[axis] - start) * (self.total / self.size));
      }
      CodeMirror.on(document, "mousemove", move);
      CodeMirror.on(document, "mouseup", done);
    });

    CodeMirror.on(this.node, "click", function(e) {
      CodeMirror.e_preventDefault(e);
      var innerBox = self.inner.getBoundingClientRect(), where;
      if (self.orientation == "horizontal")
        where = e.clientX < innerBox.left ? -1 : e.clientX > innerBox.right ? 1 : 0;
      else
        where = e.clientY < innerBox.top ? -1 : e.clientY > innerBox.bottom ? 1 : 0;
      self.moveTo(self.pos + where * self.screen);
    });

    function onWheel(e) {
      var moved = CodeMirror.wheelEventPixels(e)[self.orientation == "horizontal" ? "x" : "y"];
      var oldPos = self.pos;
      self.moveTo(self.pos + moved);
      if (self.pos != oldPos) CodeMirror.e_preventDefault(e);
    }
    CodeMirror.on(this.node, "mousewheel", onWheel);
    CodeMirror.on(this.node, "DOMMouseScroll", onWheel);
  }

  Bar.prototype.setPos = function(pos, force) {
    if (pos < 0) pos = 0;
    if (pos > this.total - this.screen) pos = this.total - this.screen;
    if (!force && pos == this.pos) return false;
    this.pos = pos;
    this.inner.style[this.orientation == "horizontal" ? "left" : "top"] =
      (pos * (this.size / this.total)) + "px";
    return true
  };

  Bar.prototype.moveTo = function(pos) {
    if (this.setPos(pos)) this.scroll(pos, this.orientation);
  }

  var minButtonSize = 10;

  Bar.prototype.update = function(scrollSize, clientSize, barSize) {
    var sizeChanged = this.screen != clientSize || this.total != scrollSize || this.size != barSize
    if (sizeChanged) {
      this.screen = clientSize;
      this.total = scrollSize;
      this.size = barSize;
    }

    var buttonSize = this.screen * (this.size / this.total);
    if (buttonSize < minButtonSize) {
      this.size -= minButtonSize - buttonSize;
      buttonSize = minButtonSize;
    }
    this.inner.style[this.orientation == "horizontal" ? "width" : "height"] =
      buttonSize + "px";
    this.setPos(this.pos, sizeChanged);
  };

  function SimpleScrollbars(cls, place, scroll) {
    this.addClass = cls;
    this.horiz = new Bar(cls, "horizontal", scroll);
    place(this.horiz.node);
    this.vert = new Bar(cls, "vertical", scroll);
    place(this.vert.node);
    this.width = null;
  }

  SimpleScrollbars.prototype.update = function(measure) {
    if (this.width == null) {
      var style = window.getComputedStyle ? window.getComputedStyle(this.horiz.node) : this.horiz.node.currentStyle;
      if (style) this.width = parseInt(style.height);
    }
    var width = this.width || 0;

    var needsH = measure.scrollWidth > measure.clientWidth + 1;
    var needsV = measure.scrollHeight > measure.clientHeight + 1;
    this.vert.node.style.display = needsV ? "block" : "none";
    this.horiz.node.style.display = needsH ? "block" : "none";

    if (needsV) {
      this.vert.update(measure.scrollHeight, measure.clientHeight,
                       measure.viewHeight - (needsH ? width : 0));
      this.vert.node.style.bottom = needsH ? width + "px" : "0";
    }
    if (needsH) {
      this.horiz.update(measure.scrollWidth, measure.clientWidth,
                        measure.viewWidth - (needsV ? width : 0) - measure.barLeft);
      this.horiz.node.style.right = needsV ? width + "px" : "0";
      this.horiz.node.style.left = measure.barLeft + "px";
    }

    return {right: needsV ? width : 0, bottom: needsH ? width : 0};
  };

  SimpleScrollbars.prototype.setScrollTop = function(pos) {
    this.vert.setPos(pos);
  };

  SimpleScrollbars.prototype.setScrollLeft = function(pos) {
    this.horiz.setPos(pos);
  };

  SimpleScrollbars.prototype.clear = function() {
    var parent = this.horiz.node.parentNode;
    parent.removeChild(this.horiz.node);
    parent.removeChild(this.vert.node);
  };

  CodeMirror.scrollbarModel.simple = function(place, scroll) {
    return new SimpleScrollbars("CodeMirror-simplescroll", place, scroll);
  };
  CodeMirror.scrollbarModel.overlay = function(place, scroll) {
    return new SimpleScrollbars("CodeMirror-overlayscroll", place, scroll);
  };
});
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  CodeMirror.defineExtension("annotateScrollbar", function(options) {
    if (typeof options == "string") options = {className: options};
    return new Annotation(this, options);
  });

  CodeMirror.defineOption("scrollButtonHeight", 0);

  function Annotation(cm, options) {
    this.cm = cm;
    this.options = options;
    this.buttonHeight = options.scrollButtonHeight || cm.getOption("scrollButtonHeight");
    this.annotations = [];
    this.doRedraw = this.doUpdate = null;
    this.div = cm.getWrapperElement().appendChild(document.createElement("div"));
    this.div.style.cssText = "position: absolute; right: 0; top: 0; z-index: 7; pointer-events: none";
    this.computeScale();

    function scheduleRedraw(delay) {
      clearTimeout(self.doRedraw);
      self.doRedraw = setTimeout(function() { self.redraw(); }, delay);
    }

    var self = this;
    cm.on("refresh", this.resizeHandler = function() {
      clearTimeout(self.doUpdate);
      self.doUpdate = setTimeout(function() {
        if (self.computeScale()) scheduleRedraw(20);
      }, 100);
    });
    cm.on("markerAdded", this.resizeHandler);
    cm.on("markerCleared", this.resizeHandler);
    if (options.listenForChanges !== false)
      cm.on("change", this.changeHandler = function() {
        scheduleRedraw(250);
      });
  }

  Annotation.prototype.computeScale = function() {
    var cm = this.cm;
    var hScale = (cm.getWrapperElement().clientHeight - cm.display.barHeight - this.buttonHeight * 2) /
      cm.getScrollerElement().scrollHeight
    if (hScale != this.hScale) {
      this.hScale = hScale;
      return true;
    }
  };

  Annotation.prototype.update = function(annotations) {
    this.annotations = annotations;
    this.redraw();
  };

  Annotation.prototype.redraw = function(compute) {
    if (compute !== false) this.computeScale();
    var cm = this.cm, hScale = this.hScale;

    var frag = document.createDocumentFragment(), anns = this.annotations;

    var wrapping = cm.getOption("lineWrapping");
    var singleLineH = wrapping && cm.defaultTextHeight() * 1.5;
    var curLine = null, curLineObj = null;
    function getY(pos, top) {
      if (curLine != pos.line) {
        curLine = pos.line;
        curLineObj = cm.getLineHandle(curLine);
      }
      if (wrapping && curLineObj.height > singleLineH)
        return cm.charCoords(pos, "local")[top ? "top" : "bottom"];
      var topY = cm.heightAtLine(curLineObj, "local");
      return topY + (top ? 0 : curLineObj.height);
    }

    if (cm.display.barWidth) for (var i = 0, nextTop; i < anns.length; i++) {
      var ann = anns[i];
      var top = nextTop || getY(ann.from, true) * hScale;
      var bottom = getY(ann.to, false) * hScale;
      while (i < anns.length - 1) {
        nextTop = getY(anns[i + 1].from, true) * hScale;
        if (nextTop > bottom + .9) break;
        ann = anns[++i];
        bottom = getY(ann.to, false) * hScale;
      }
      if (bottom == top) continue;
      var height = Math.max(bottom - top, 3);

      var elt = frag.appendChild(document.createElement("div"));
      elt.style.cssText = "position: absolute; right: 0px; width: " + Math.max(cm.display.barWidth - 1, 2) + "px; top: "
        + (top + this.buttonHeight) + "px; height: " + height + "px";
      elt.className = this.options.className;
      if (ann.id) {
        elt.setAttribute("annotation-id", ann.id);
      }
    }
    this.div.textContent = "";
    this.div.appendChild(frag);
  };

  Annotation.prototype.clear = function() {
    this.cm.off("refresh", this.resizeHandler);
    this.cm.off("markerAdded", this.resizeHandler);
    this.cm.off("markerCleared", this.resizeHandler);
    if (this.changeHandler) this.cm.off("change", this.changeHandler);
    this.div.parentNode.removeChild(this.div);
  };
});
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  var WRAP_CLASS = "CodeMirror-activeline";
  var BACK_CLASS = "CodeMirror-activeline-background";
  var GUTT_CLASS = "CodeMirror-activeline-gutter";

  CodeMirror.defineOption("styleActiveLine", false, function(cm, val, old) {
    var prev = old == CodeMirror.Init ? false : old;
    if (val == prev) return
    if (prev) {
      cm.off("beforeSelectionChange", selectionChange);
      clearActiveLines(cm);
      delete cm.state.activeLines;
    }
    if (val) {
      cm.state.activeLines = [];
      updateActiveLines(cm, cm.listSelections());
      cm.on("beforeSelectionChange", selectionChange);
    }
  });

  function clearActiveLines(cm) {
    for (var i = 0; i < cm.state.activeLines.length; i++) {
      cm.removeLineClass(cm.state.activeLines[i], "wrap", WRAP_CLASS);
      cm.removeLineClass(cm.state.activeLines[i], "background", BACK_CLASS);
      cm.removeLineClass(cm.state.activeLines[i], "gutter", GUTT_CLASS);
    }
  }

  function sameArray(a, b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++)
      if (a[i] != b[i]) return false;
    return true;
  }

  function updateActiveLines(cm, ranges) {
    var active = [];
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      var option = cm.getOption("styleActiveLine");
      if (typeof option == "object" && option.nonEmpty ? range.anchor.line != range.head.line : !range.empty())
        continue
      var line = cm.getLineHandleVisualStart(range.head.line);
      if (active[active.length - 1] != line) active.push(line);
    }
    if (sameArray(cm.state.activeLines, active)) return;
    cm.operation(function() {
      clearActiveLines(cm);
      for (var i = 0; i < active.length; i++) {
        cm.addLineClass(active[i], "wrap", WRAP_CLASS);
        cm.addLineClass(active[i], "background", BACK_CLASS);
        cm.addLineClass(active[i], "gutter", GUTT_CLASS);
      }
      cm.state.activeLines = active;
    });
  }

  function selectionChange(cm, sel) {
    updateActiveLines(cm, sel.ranges);
  }
});
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  CodeMirror.defineOption("fullScreen", false, function(cm, val, old) {
    if (old == CodeMirror.Init) old = false;
    if (!old == !val) return;
    if (val) setFullscreen(cm);
    else setNormal(cm);
  });

  function setFullscreen(cm) {
    var wrap = cm.getWrapperElement();
    cm.state.fullScreenRestore = {scrollTop: window.pageYOffset, scrollLeft: window.pageXOffset,
                                  width: wrap.style.width, height: wrap.style.height};
    wrap.style.width = "";
    wrap.style.height = "auto";
    wrap.className += " CodeMirror-fullscreen";
    document.documentElement.style.overflow = "hidden";
    cm.refresh();
  }

  function setNormal(cm) {
    var wrap = cm.getWrapperElement();
    wrap.className = wrap.className.replace(/\s*CodeMirror-fullscreen\b/, "");
    document.documentElement.style.overflow = "";
    var info = cm.state.fullScreenRestore;
    wrap.style.width = info.width; wrap.style.height = info.height;
    window.scrollTo(info.scrollLeft, info.scrollTop);
    cm.refresh();
  }
});
CodeMirror.defineMode("glsl", function(config, parserConfig) {
  var indentUnit = config.indentUnit,
      keywords = parserConfig.keywords || {},
      builtins = parserConfig.builtins || {},
      blockKeywords = parserConfig.blockKeywords || {},
      atoms = parserConfig.atoms || {},
      hooks = parserConfig.hooks || {},
      multiLineStrings = parserConfig.multiLineStrings;
  var isOperatorChar = /[+\-*&%=<>!?|\/]/;

  var curPunc;

  function tokenBase(stream, state) {
    var ch = stream.next();
    if (hooks[ch]) {
      var result = hooks[ch](stream, state);
      if (result !== false) return result;
    }
    if (ch == '"' || ch == "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    }
    if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
      curPunc = ch;
      return "bracket";
    }
    if (/\d/.test(ch)) {
      stream.eatWhile(/[\w\.]/);
      return "number";
    }
    if (ch == "/") {
      if (stream.eat("*")) {
        state.tokenize = tokenComment;
        return tokenComment(stream, state);
      }
      if (stream.eat("/")) {
        stream.skipToEnd();
        return "comment";
      }
    }
    if (isOperatorChar.test(ch)) {
      stream.eatWhile(isOperatorChar);
      return "operator";
    }
    stream.eatWhile(/[\w\$_]/);
    var cur = stream.current();
    if (keywords.propertyIsEnumerable(cur)) {
      if (blockKeywords.propertyIsEnumerable(cur)) curPunc = "newstatement";
      return "keyword";
    }
    if (builtins.propertyIsEnumerable(cur)) {
      return "builtin";
    }
    if (atoms.propertyIsEnumerable(cur)) return "atom";
    return "word";
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next, end = false;
      while ((next = stream.next()) != null) {
        if (next == quote && !escaped) {end = true; break;}
        escaped = !escaped && next == "\\";
      }
      if (end || !(escaped || multiLineStrings))
        state.tokenize = tokenBase;
      return "string";
    };
  }

  function tokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = tokenBase;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return "comment";
  }

  function Context(indented, column, type, align, prev) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.align = align;
    this.prev = prev;
  }
  function pushContext(state, col, type) {
    return state.context = new Context(state.indented, col, type, null, state.context);
  }
  function popContext(state) {
    var t = state.context.type;
    if (t == ")" || t == "]" || t == "}")
      state.indented = state.context.indented;
    return state.context = state.context.prev;
  }

  // Interface

  return {
    startState: function(basecolumn) {
      return {
        tokenize: null,
        context: new Context((basecolumn || 0) - indentUnit, 0, "top", false),
        indented: 0,
        startOfLine: true
      };
    },

    token: function(stream, state) {
      var ctx = state.context;
      if (stream.sol()) {
        if (ctx.align == null) ctx.align = false;
        state.indented = stream.indentation();
        state.startOfLine = true;
      }
      if (stream.eatSpace()) return null;
      curPunc = null;
      var style = (state.tokenize || tokenBase)(stream, state);
      if (style == "comment" || style == "meta") return style;
      if (ctx.align == null) ctx.align = true;

      if ((curPunc == ";" || curPunc == ":") && ctx.type == "statement") popContext(state);
      else if (curPunc == "{") pushContext(state, stream.column(), "}");
      else if (curPunc == "[") pushContext(state, stream.column(), "]");
      else if (curPunc == "(") pushContext(state, stream.column(), ")");
      else if (curPunc == "}") {
        while (ctx.type == "statement") ctx = popContext(state);
        if (ctx.type == "}") ctx = popContext(state);
        while (ctx.type == "statement") ctx = popContext(state);
      }
      else if (curPunc == ctx.type) popContext(state);
      else if (ctx.type == "}" || ctx.type == "top" || (ctx.type == "statement" && curPunc == "newstatement"))
        pushContext(state, stream.column(), "statement");
      state.startOfLine = false;
      return style;
    },

    indent: function(state, textAfter) {
      if (state.tokenize != tokenBase && state.tokenize != null) return 0;
      var firstChar = textAfter && textAfter.charAt(0), ctx = state.context, closing = firstChar == ctx.type;
      if (ctx.type == "statement") return ctx.indented + (firstChar == "{" ? 0 : indentUnit);
      else if (ctx.align) return ctx.column + (closing ? 0 : 1);
      else return ctx.indented + (closing ? 0 : indentUnit);
    },

    electricChars: "{}"
  };
});

(function() {
  function words(str) {
    var obj = {}, words = str.split(" ");
    for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
    return obj;
  }
  var glslKeywords = "attribute const uniform varying break continue " +
    "do for while if else in out inout float int void bool true false " +
    "lowp mediump highp precision invariant discard return mat2 mat3 " +
    "mat4 vec2 vec3 vec4 ivec2 ivec3 ivec4 bvec2 bvec3 bvec4 sampler2D " +
    "samplerCube struct gl_FragCoord gl_FragColor";
  var glslBuiltins = "radians degrees sin cos tan asin acos atan pow " +
    "exp log exp2 log2 sqrt inversesqrt abs sign floor ceil fract mod " +
    "min max clamp mix step smoothstep length distance dot cross " +
    "normalize faceforward reflect refract matrixCompMult lessThan " +
    "lessThanEqual greaterThan greaterThanEqual equal notEqual any all " +
    "not dFdx dFdy fwidth texture2D texture2DProj texture2DLod " +
    "texture2DProjLod textureCube textureCubeLod";

  function cppHook(stream, state) {
    if (!state.startOfLine) return false;
    stream.skipToEnd();
    return "meta";
  }

  // C#-style strings where "" escapes a quote.
  function tokenAtString(stream, state) {
    var next;
    while ((next = stream.next()) != null) {
      if (next == '"' && !stream.eat('"')) {
        state.tokenize = null;
        break;
      }
    }
    return "string";
  }

  CodeMirror.defineMIME("text/x-glsl", {
    name: "glsl",
    keywords: words(glslKeywords),
    builtins: words(glslBuiltins),
    blockKeywords: words("case do else for if switch while struct"),
    atoms: words("null"),
    hooks: {"#": cppHook}
  });
}());
// sharedb - https://github.com/share/sharedb
!function(t){function e(n){if(i[n])return i[n].exports;var r=i[n]={exports:{},id:n,loaded:!1};return t[n].call(r.exports,r,r.exports,e),r.loaded=!0,r.exports}var i={};return e.m=t,e.c=i,e.p="",e(0)}([function(t,e,i){ShareDB=i(1)},function(t,e,i){e.Connection=i(2),e.Doc=i(4),e.Error=i(7),e.Query=i(14),e.types=i(9)},function(t,e,i){(function(e){function n(t){h.EventEmitter.call(this),this.collections={},this.nextQueryId=1,this.queries={},this.seq=1,this.id=null,this.agent=null,this.debug=!1,this.bindToSocket(t)}function r(t){return t.hasPending()}function s(t){return t.hasWritePending()}var o=i(4),l=i(14),h=i(5),c=i(7),p=i(9),a=i(15);t.exports=n,h.mixin(n),n.prototype.bindToSocket=function(t){this.socket&&(this.socket.close(),this.socket.onmessage=null,this.socket.onopen=null,this.socket.onerror=null,this.socket.onclose=null),this.socket=t,this.state=0===t.readyState||1===t.readyState?"connecting":"disconnected",this.canSend=!1;var i=this;t.onmessage=function(t){try{var n="string"==typeof t.data?JSON.parse(t.data):t.data}catch(r){return void console.warn("Failed to parse message",t)}i.debug&&console.log("RECV",JSON.stringify(n));var s={data:n};if(i.emit("receive",s),s.data)try{i.handleMessage(s.data)}catch(r){e.nextTick(function(){i.emit("error",r)})}},t.onopen=function(){i._setState("connecting")},t.onerror=function(t){i.emit("connection error",t)},t.onclose=function(t){"closed"===t||"Closed"===t?i._setState("closed",t):"stopped"===t||"Stopped by server"===t?i._setState("stopped",t):i._setState("disconnected",t)}},n.prototype.handleMessage=function(t){var e=null;switch(t.error&&(e=new Error(t.error.message),e.code=t.error.code,e.data=t,delete t.error),t.a){case"init":return 1!==t.protocol?(e=new c(4019,"Invalid protocol version"),this.emit("error",e)):p.map[t.type]!==p.defaultType?(e=new c(4020,"Invalid default type"),this.emit("error",e)):"string"!=typeof t.id?(e=new c(4021,"Invalid client id"),this.emit("error",e)):(this.id=t.id,void this._setState("connected"));case"qf":var i=this.queries[t.id];return void(i&&i._handleFetch(e,t.data,t.extra));case"qs":var i=this.queries[t.id];return void(i&&i._handleSubscribe(e,t.data,t.extra));case"qu":return;case"q":var i=this.queries[t.id];if(!i)return;return e?i._handleError(e):(t.diff&&i._handleDiff(t.diff),void(t.hasOwnProperty("extra")&&i._handleExtra(t.extra)));case"bf":return this._handleBulkMessage(t,"_handleFetch");case"bs":return this._handleBulkMessage(t,"_handleSubscribe");case"bu":return this._handleBulkMessage(t,"_handleUnsubscribe");case"f":var n=this.getExisting(t.c,t.d);return void(n&&n._handleFetch(e,t.data));case"s":var n=this.getExisting(t.c,t.d);return void(n&&n._handleSubscribe(e,t.data));case"u":var n=this.getExisting(t.c,t.d);return void(n&&n._handleUnsubscribe(e));case"op":var n=this.getExisting(t.c,t.d);return void(n&&n._handleOp(e,t));default:console.warn("Ignorning unrecognized message",t)}},n.prototype._handleBulkMessage=function(t,e){if(t.data)for(var i in t.data){var n=this.getExisting(t.c,i);n&&n[e](t.error,t.data[i])}else if(Array.isArray(t.b))for(var r=0;r<t.b.length;r++){var i=t.b[r],n=this.getExisting(t.c,i);n&&n[e](t.error)}else if(t.b)for(var i in t.b){var n=this.getExisting(t.c,i);n&&n[e](t.error)}else console.error("Invalid bulk message",t)},n.prototype._reset=function(){this.seq=1,this.id=null,this.agent=null},n.prototype._setState=function(t,e){if(this.state!==t){if("connecting"===t&&"disconnected"!==this.state&&"stopped"!==this.state&&"closed"!==this.state||"connected"===t&&"connecting"!==this.state){var i=new c(5007,"Cannot transition directly from "+this.state+" to "+t);return this.emit("error",i)}this.state=t,this.canSend="connected"===t,"disconnected"!==t&&"stopped"!==t&&"closed"!==t||this._reset(),this.startBulk();for(var n in this.queries){var r=this.queries[n];r._onConnectionStateChanged()}for(var s in this.collections){var o=this.collections[s];for(var n in o)o[n]._onConnectionStateChanged()}this.endBulk(),this.emit(t,e),this.emit("state",t,e)}},n.prototype.startBulk=function(){this.bulk||(this.bulk={})},n.prototype.endBulk=function(){if(this.bulk)for(var t in this.bulk){var e=this.bulk[t];this._sendBulk("f",t,e.f),this._sendBulk("s",t,e.s),this._sendBulk("u",t,e.u)}this.bulk=null},n.prototype._sendBulk=function(t,e,i){if(i){var n,r=[],s={},o=0;for(var l in i){var h=i[l];null==h?r.push(l):(s[l]=h,n=l,o++)}if(1===r.length){var l=r[0];this.send({a:t,c:e,d:l})}else r.length&&this.send({a:"b"+t,c:e,b:r});if(1===o){var c=s[n];this.send({a:t,c:e,d:n,v:c})}else o&&this.send({a:"b"+t,c:e,b:s})}},n.prototype._sendAction=function(t,e,i){if(this._addDoc(e),this.bulk){var n=this.bulk[e.collection]||(this.bulk[e.collection]={}),r=n[t]||(n[t]={}),s=r.hasOwnProperty(e.id);return r[e.id]=i,s}var o={a:t,c:e.collection,d:e.id,v:i};this.send(o)},n.prototype.sendFetch=function(t){return this._sendAction("f",t,t.version)},n.prototype.sendSubscribe=function(t){return this._sendAction("s",t,t.version)},n.prototype.sendUnsubscribe=function(t){return this._sendAction("u",t)},n.prototype.sendOp=function(t,e){this._addDoc(t);var i={a:"op",c:t.collection,d:t.id,v:t.version,src:e.src,seq:e.seq};e.op&&(i.op=e.op),e.create&&(i.create=e.create),e.del&&(i.del=e.del),this.send(i)},n.prototype.send=function(t){this.debug&&console.log("SEND",JSON.stringify(t)),this.emit("send",t),this.socket.send(JSON.stringify(t))},n.prototype.close=function(){this.socket.close()},n.prototype.getExisting=function(t,e){if(this.collections[t])return this.collections[t][e]},n.prototype.get=function(t,e){var i=this.collections[t]||(this.collections[t]={}),n=i[e];return n||(n=i[e]=new o(this,t,e),this.emit("doc",n)),n},n.prototype._destroyDoc=function(t){var e=this.collections[t.collection];e&&(delete e[t.id],a.hasKeys(e)||delete this.collections[t.collection])},n.prototype._addDoc=function(t){var e=this.collections[t.collection];e||(e=this.collections[t.collection]={}),e[t.id]!==t&&(e[t.id]=t)},n.prototype._createQuery=function(t,e,i,n,r){var s=this.nextQueryId++,o=new l(t,this,s,e,i,n,r);return this.queries[s]=o,o.send(),o},n.prototype._destroyQuery=function(t){delete this.queries[t.id]},n.prototype.createFetchQuery=function(t,e,i,n){return this._createQuery("qf",t,e,i,n)},n.prototype.createSubscribeQuery=function(t,e,i,n){return this._createQuery("qs",t,e,i,n)},n.prototype.hasPending=function(){return!(!this._firstDoc(r)&&!this._firstQuery(r))},n.prototype.hasWritePending=function(){return!!this._firstDoc(s)},n.prototype.whenNothingPending=function(t){var i=this._firstDoc(r);if(i)return void i.once("nothing pending",this._nothingPendingRetry(t));var n=this._firstQuery(r);return n?void n.once("ready",this._nothingPendingRetry(t)):void e.nextTick(t)},n.prototype._nothingPendingRetry=function(t){var i=this;return function(){e.nextTick(function(){i.whenNothingPending(t)})}},n.prototype._firstDoc=function(t){for(var e in this.collections){var i=this.collections[e];for(var n in i){var r=i[n];if(t(r))return r}}},n.prototype._firstQuery=function(t){for(var e in this.queries){var i=this.queries[e];if(t(i))return i}}}).call(e,i(3))},function(t,e){function i(){throw new Error("setTimeout has not been defined")}function n(){throw new Error("clearTimeout has not been defined")}function r(t){if(p===setTimeout)return setTimeout(t,0);if((p===i||!p)&&setTimeout)return p=setTimeout,setTimeout(t,0);try{return p(t,0)}catch(e){try{return p.call(null,t,0)}catch(e){return p.call(this,t,0)}}}function s(t){if(a===clearTimeout)return clearTimeout(t);if((a===n||!a)&&clearTimeout)return a=clearTimeout,clearTimeout(t);try{return a(t)}catch(e){try{return a.call(null,t)}catch(e){return a.call(this,t)}}}function o(){v&&f&&(v=!1,f.length?d=f.concat(d):g=-1,d.length&&l())}function l(){if(!v){var t=r(o);v=!0;for(var e=d.length;e;){for(f=d,d=[];++g<e;)f&&f[g].run();g=-1,e=d.length}f=null,v=!1,s(t)}}function h(t,e){this.fun=t,this.array=e}function c(){}var p,a,u=t.exports={};!function(){try{p="function"==typeof setTimeout?setTimeout:i}catch(t){p=i}try{a="function"==typeof clearTimeout?clearTimeout:n}catch(t){a=n}}();var f,d=[],v=!1,g=-1;u.nextTick=function(t){var e=new Array(arguments.length-1);if(arguments.length>1)for(var i=1;i<arguments.length;i++)e[i-1]=arguments[i];d.push(new h(t,e)),1!==d.length||v||r(l)},h.prototype.run=function(){this.fun.apply(null,this.array)},u.title="browser",u.browser=!0,u.env={},u.argv=[],u.version="",u.versions={},u.on=c,u.addListener=c,u.once=c,u.off=c,u.removeListener=c,u.removeAllListeners=c,u.emit=c,u.binding=function(t){throw new Error("process.binding is not supported")},u.cwd=function(){return"/"},u.chdir=function(t){throw new Error("process.chdir is not supported")},u.umask=function(){return 0}},function(t,e,i){(function(e){function n(t,e,i){h.EventEmitter.call(this),this.connection=t,this.collection=e,this.id=i,this.version=null,this.type=null,this.data=void 0,this.inflightFetch=[],this.inflightSubscribe=[],this.inflightUnsubscribe=[],this.pendingFetch=[],this.subscribed=!1,this.wantSubscribe=!1,this.inflightOp=null,this.pendingOps=[],this.type=null,this.applyStack=null,this.preventCompose=!1}function r(t,e,i){if(e){var n=t.pop();t.push(function(t){n&&n(t),i&&i(t)})}else t.push(i)}function s(t){delete t.op,delete t.create,delete t.del}function o(t,e){if(t.del)return s(e);if(e.del)return new c(4017,"Document was deleted");if(e.create)return new c(4018,"Document alredy created");if(e.op){if(t.create)return new c(4018,"Document already created");if(t.type.transformX){var i=t.type.transformX(t.op,e.op);t.op=i[0],e.op=i[1]}else{var n=t.type.transform(t.op,e.op,"left"),r=t.type.transform(e.op,t.op,"right");t.op=n,e.op=r}}}function l(t,e){for(var i=!1,n=0;n<t.length;n++){var r=t[n];r&&(r(e),i=!0)}return i}var h=i(5),c=i(7),p=i(9);t.exports=n,h.mixin(n),n.prototype.destroy=function(t){var e=this;e.whenNothingPending(function(){return e.connection._destroyDoc(e),e.wantSubscribe?e.unsubscribe(t):void(t&&t())})},n.prototype._setType=function(t){if("string"==typeof t&&(t=p.map[t]),t)this.type=t;else{if(null!==t){var e=new c(4008,"Missing type "+t);return this.emit("error",e)}this.type=t,this.data=void 0}},n.prototype.ingestSnapshot=function(t,e){if(!t)return e&&e();if("number"!=typeof t.v){var i=new c(5008,"Missing version in ingested snapshot. "+this.collection+"."+this.id);return e?e(i):this.emit("error",i)}if(this.type||this.hasWritePending()){if(null==this.version){if(this.hasWritePending())return e&&this.once("no write pending",e);var i=new c(5009,"Cannot ingest snapshot in doc with null version. "+this.collection+"."+this.id);return e?e(i):this.emit("error",i)}return t.v>this.version?this.fetch(e):e&&e()}if(this.version>t.v)return e&&e();this.version=t.v;var n=void 0===t.type?p.defaultType:t.type;this._setType(n),this.data=this.type&&this.type.deserialize?this.type.deserialize(t.data):t.data,this.emit("load"),e&&e()},n.prototype.whenNothingPending=function(t){return this.hasPending()?void this.once("nothing pending",t):void t()},n.prototype.hasPending=function(){return!!(this.inflightOp||this.pendingOps.length||this.inflightFetch.length||this.inflightSubscribe.length||this.inflightUnsubscribe.length||this.pendingFetch.length)},n.prototype.hasWritePending=function(){return!(!this.inflightOp&&!this.pendingOps.length)},n.prototype._emitNothingPending=function(){this.hasWritePending()||(this.emit("no write pending"),this.hasPending()||this.emit("nothing pending"))},n.prototype._emitResponseError=function(t,e){return e?(e(t),void this._emitNothingPending()):(this._emitNothingPending(),void this.emit("error",t))},n.prototype._handleFetch=function(t,e){var i=this.inflightFetch.shift();return t?this._emitResponseError(t,i):(this.ingestSnapshot(e,i),void this._emitNothingPending())},n.prototype._handleSubscribe=function(t,e){var i=this.inflightSubscribe.shift();return t?this._emitResponseError(t,i):(this.wantSubscribe&&(this.subscribed=!0),this.ingestSnapshot(e,i),void this._emitNothingPending())},n.prototype._handleUnsubscribe=function(t){var e=this.inflightUnsubscribe.shift();return t?this._emitResponseError(t,e):(e&&e(),void this._emitNothingPending())},n.prototype._handleOp=function(t,e){if(t)return this.inflightOp?(4002===t.code&&(t=null),this._rollback(t)):this.emit("error",t);if(this.inflightOp&&e.src===this.inflightOp.src&&e.seq===this.inflightOp.seq)return void this._opAcknowledged(e);if(null==this.version||e.v>this.version)return void this.fetch();if(!(e.v<this.version)){if(this.inflightOp){var i=o(this.inflightOp,e);if(i)return this._hardRollback(i)}for(var n=0;n<this.pendingOps.length;n++){var i=o(this.pendingOps[n],e);if(i)return this._hardRollback(i)}this.version++,this._otApply(e,!1)}},n.prototype._onConnectionStateChanged=function(){if(this.connection.canSend)this.flush(),this._resubscribe();else if(this.inflightOp&&(this.pendingOps.unshift(this.inflightOp),this.inflightOp=null),this.subscribed=!1,(this.inflightFetch.length||this.inflightSubscribe.length)&&(this.pendingFetch=this.pendingFetch.concat(this.inflightFetch,this.inflightSubscribe),this.inflightFetch.length=0,this.inflightSubscribe.length=0),this.inflightUnsubscribe.length){var t=this.inflightUnsubscribe;this.inflightUnsubscribe=[],l(t)}},n.prototype._resubscribe=function(){var t=this.pendingFetch;return this.pendingFetch=[],this.wantSubscribe?t.length?void this.subscribe(function(e){l(t,e)}):void this.subscribe():void(t.length&&this.fetch(function(e){l(t,e)}))},n.prototype.fetch=function(t){if(this.connection.canSend){var e=this.connection.sendFetch(this);return void r(this.inflightFetch,e,t)}this.pendingFetch.push(t)},n.prototype.subscribe=function(t){if(this.wantSubscribe=!0,this.connection.canSend){var e=this.connection.sendSubscribe(this);return void r(this.inflightSubscribe,e,t)}this.pendingFetch.push(t)},n.prototype.unsubscribe=function(t){if(this.wantSubscribe=!1,this.subscribed=!1,this.connection.canSend){var i=this.connection.sendUnsubscribe(this);return void r(this.inflightUnsubscribe,i,t)}t&&e.nextTick(t)},n.prototype.flush=function(){this.connection.canSend&&!this.inflightOp&&!this.paused&&this.pendingOps.length&&this._sendOp()},n.prototype._otApply=function(t,e){if(t.op){if(!this.type){var i=new c(4015,"Cannot apply op to uncreated document. "+this.collection+"."+this.id);return this.emit("error",i)}if(!e&&this.type===p.defaultType&&t.op.length>1){this.applyStack||(this.applyStack=[]);for(var n=this.applyStack.length,r=0;r<t.op.length;r++){for(var s=t.op[r],l={op:[s]},h=n;h<this.applyStack.length;h++){var a=o(this.applyStack[h],l);if(a)return this._hardRollback(a)}this.emit("before op",l.op,e),this.data=this.type.apply(this.data,l.op),this.emit("op",l.op,e)}return void this._popApplyStack(n)}return this.emit("before op",t.op,e),this.data=this.type.apply(this.data,t.op),void this.emit("op",t.op,e)}if(t.create)return this._setType(t.create.type),this.data=this.type.deserialize?this.type.createDeserialized?this.type.createDeserialized(t.create.data):this.type.deserialize(this.type.create(t.create.data)):this.type.create(t.create.data),void this.emit("create",e);if(t.del){var u=this.data;return this._setType(null),void this.emit("del",u,e)}},n.prototype._sendOp=function(){var t=this.connection.id;if(t){this.inflightOp||(this.inflightOp=this.pendingOps.shift());var e=this.inflightOp;if(!e){var i=new c(5010,"No op to send on call to _sendOp");return this.emit("error",i)}e.sentAt=Date.now(),e.retries=null==e.retries?0:e.retries+1,null==e.seq&&(e.seq=this.connection.seq++),this.connection.sendOp(this,e),null==e.src&&(e.src=t)}},n.prototype._submit=function(t,i,n){if(i||(i=!0),t.op){if(!this.type){var r=new c(4015,"Cannot submit op. Document has not been created. "+this.collection+"."+this.id);return n?n(r):this.emit("error",r)}this.type.normalize&&(t.op=this.type.normalize(t.op))}this._pushOp(t,n),this._otApply(t,i);var s=this;e.nextTick(function(){s.flush()})},n.prototype._pushOp=function(t,e){if(this.applyStack)this.applyStack.push(t);else{var i=this._tryCompose(t);if(i)return void i.callbacks.push(e)}t.type=this.type,t.callbacks=[e],this.pendingOps.push(t)},n.prototype._popApplyStack=function(t){if(t>0)return void(this.applyStack.length=t);var e=this.applyStack[0];if(this.applyStack=null,e){var i=this.pendingOps.indexOf(e);if(i!==-1)for(var n=this.pendingOps.splice(i),i=0;i<n.length;i++){var e=n[i],r=this._tryCompose(e);r?r.callbacks=r.callbacks.concat(e.callbacks):this.pendingOps.push(e)}}},n.prototype._tryCompose=function(t){if(!this.preventCompose){var e=this.pendingOps[this.pendingOps.length-1];if(e)return e.create&&t.op?(e.create.data=this.type.apply(e.create.data,t.op),e):e.op&&t.op&&this.type.compose?(e.op=this.type.compose(e.op,t.op),e):void 0}},n.prototype.submitOp=function(t,e,i){"function"==typeof e&&(i=e,e=null);var n={op:t},r=e&&e.source;this._submit(n,r,i)},n.prototype.create=function(t,e,i,n){if("function"==typeof e?(n=e,i=null,e=null):"function"==typeof i&&(n=i,i=null),e||(e=p.defaultType.uri),this.type){var r=new c(4016,"Document already exists");return n?n(r):this.emit("error",r)}var s={create:{type:e,data:t}},o=i&&i.source;this._submit(s,o,n)},n.prototype.del=function(t,e){if("function"==typeof t&&(e=t,t=null),!this.type){var i=new c(4015,"Document does not exist");return e?e(i):this.emit("error",i)}var n={del:!0},r=t&&t.source;this._submit(n,r,e)},n.prototype.pause=function(){this.paused=!0},n.prototype.resume=function(){this.paused=!1,this.flush()},n.prototype._opAcknowledged=function(t){if(this.inflightOp.create)this.version=t.v;else if(t.v!==this.version)return console.warn("Invalid version from server. Expected: "+this.version+" Received: "+t.v,t),this.fetch();this.version++,this._clearInflightOp()},n.prototype._rollback=function(t){var e=this.inflightOp;if(e.op&&e.type.invert){e.op=e.type.invert(e.op);for(var i=0;i<this.pendingOps.length;i++){var n=o(this.pendingOps[i],e);if(n)return this._hardRollback(n)}return this._otApply(e,!1),void this._clearInflightOp(t)}this._hardRollback(t)},n.prototype._hardRollback=function(t){var e=this.inflightOp,i=this.pendingOps;this._setType(null),this.version=null,this.inflightOp=null,this.pendingOps=[];var n=this;this.fetch(function(){for(var r=e&&l(e.callbacks,t),s=0;s<i.length;s++)l(i[s].callbacks,t);if(t&&!r)return n.emit("error",t)})},n.prototype._clearInflightOp=function(t){var e=l(this.inflightOp.callbacks,t);if(this.inflightOp=null,this.flush(),this._emitNothingPending(),t&&!e)return this.emit("error",t)}}).call(e,i(3))},function(t,e,i){function n(t){for(var e in r.prototype)t.prototype[e]=r.prototype[e]}var r=i(6).EventEmitter;e.EventEmitter=r,e.mixin=n},function(t,e){function i(){this._events=this._events||{},this._maxListeners=this._maxListeners||void 0}function n(t){return"function"==typeof t}function r(t){return"number"==typeof t}function s(t){return"object"==typeof t&&null!==t}function o(t){return void 0===t}t.exports=i,i.EventEmitter=i,i.prototype._events=void 0,i.prototype._maxListeners=void 0,i.defaultMaxListeners=10,i.prototype.setMaxListeners=function(t){if(!r(t)||t<0||isNaN(t))throw TypeError("n must be a positive number");return this._maxListeners=t,this},i.prototype.emit=function(t){var e,i,r,l,h,c;if(this._events||(this._events={}),"error"===t&&(!this._events.error||s(this._events.error)&&!this._events.error.length)){if(e=arguments[1],e instanceof Error)throw e;var p=new Error('Uncaught, unspecified "error" event. ('+e+")");throw p.context=e,p}if(i=this._events[t],o(i))return!1;if(n(i))switch(arguments.length){case 1:i.call(this);break;case 2:i.call(this,arguments[1]);break;case 3:i.call(this,arguments[1],arguments[2]);break;default:l=Array.prototype.slice.call(arguments,1),i.apply(this,l)}else if(s(i))for(l=Array.prototype.slice.call(arguments,1),c=i.slice(),r=c.length,h=0;h<r;h++)c[h].apply(this,l);return!0},i.prototype.addListener=function(t,e){var r;if(!n(e))throw TypeError("listener must be a function");return this._events||(this._events={}),this._events.newListener&&this.emit("newListener",t,n(e.listener)?e.listener:e),this._events[t]?s(this._events[t])?this._events[t].push(e):this._events[t]=[this._events[t],e]:this._events[t]=e,s(this._events[t])&&!this._events[t].warned&&(r=o(this._maxListeners)?i.defaultMaxListeners:this._maxListeners,r&&r>0&&this._events[t].length>r&&(this._events[t].warned=!0,console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.",this._events[t].length),"function"==typeof console.trace&&console.trace())),this},i.prototype.on=i.prototype.addListener,i.prototype.once=function(t,e){function i(){this.removeListener(t,i),r||(r=!0,e.apply(this,arguments))}if(!n(e))throw TypeError("listener must be a function");var r=!1;return i.listener=e,this.on(t,i),this},i.prototype.removeListener=function(t,e){var i,r,o,l;if(!n(e))throw TypeError("listener must be a function");if(!this._events||!this._events[t])return this;if(i=this._events[t],o=i.length,r=-1,i===e||n(i.listener)&&i.listener===e)delete this._events[t],this._events.removeListener&&this.emit("removeListener",t,e);else if(s(i)){for(l=o;l-- >0;)if(i[l]===e||i[l].listener&&i[l].listener===e){r=l;break}if(r<0)return this;1===i.length?(i.length=0,delete this._events[t]):i.splice(r,1),this._events.removeListener&&this.emit("removeListener",t,e)}return this},i.prototype.removeAllListeners=function(t){var e,i;if(!this._events)return this;if(!this._events.removeListener)return 0===arguments.length?this._events={}:this._events[t]&&delete this._events[t],this;if(0===arguments.length){for(e in this._events)"removeListener"!==e&&this.removeAllListeners(e);return this.removeAllListeners("removeListener"),this._events={},this}if(i=this._events[t],n(i))this.removeListener(t,i);else if(i)for(;i.length;)this.removeListener(t,i[i.length-1]);return delete this._events[t],this},i.prototype.listeners=function(t){var e;return e=this._events&&this._events[t]?n(this._events[t])?[this._events[t]]:this._events[t].slice():[]},i.prototype.listenerCount=function(t){if(this._events){var e=this._events[t];if(n(e))return 1;if(e)return e.length}return 0},i.listenerCount=function(t,e){return t.listenerCount(e)}},function(t,e,i){function n(t,e){n["super"].call(this,e),this.code=t}var r=i(8);r(n),t.exports=n},function(t,e){"use strict";function i(t){t&&r(this,"message",{configurable:!0,value:t,writable:!0});var e=this.constructor.name;e&&e!==this.name&&r(this,"name",{configurable:!0,value:e,writable:!0}),s(this,this.constructor)}function n(t,e){if(null==e||e===Error)e=i;else if("function"!=typeof e)throw new TypeError("super_ should be a function");var n;if("string"==typeof t)n=t,t=function(){e.apply(this,arguments)},o&&(o(t,n),n=null);else if("function"!=typeof t)throw new TypeError("constructor should be either a string or a function");t.super_=t["super"]=e;var r={constructor:{configurable:!0,value:t,writable:!0}};return null!=n&&(r.name={configurable:!0,value:n,writable:!0}),t.prototype=Object.create(e.prototype,r),t}var r=Object.defineProperty,s=Error.captureStackTrace;s||(s=function(t){var e=new Error;r(t,"stack",{configurable:!0,get:function(){var t=e.stack;return r(this,"stack",{value:t}),t},set:function(e){r(t,"stack",{configurable:!0,value:e,writable:!0})}})}),i.prototype=Object.create(Error.prototype,{constructor:{configurable:!0,value:i,writable:!0}});var o=function(){function t(t,e){return r(t,"name",{configurable:!0,value:e})}try{var e=function(){};if(t(e,"foo"),"foo"===e.name)return t}catch(i){}}();e=t.exports=n,e.BaseError=i},function(t,e,i){e.defaultType=i(10).type,e.map={},e.register=function(t){t.name&&(e.map[t.name]=t),t.uri&&(e.map[t.uri]=t)},e.register(e.defaultType)},function(t,e,i){t.exports={type:i(11)}},function(t,e,i){function n(t){t.t="text0";var e={p:t.p.pop()};null!=t.si&&(e.i=t.si),null!=t.sd&&(e.d=t.sd),t.o=[e]}function r(t){t.p.push(t.o[0].p),null!=t.o[0].i&&(t.si=t.o[0].i),null!=t.o[0].d&&(t.sd=t.o[0].d),delete t.t,delete t.o}var s=function(t){return"[object Array]"==Object.prototype.toString.call(t)},o=function(t){return!!t&&t.constructor===Object},l=function(t){return JSON.parse(JSON.stringify(t))},h={name:"json0",uri:"http://sharejs.org/types/JSONv0"},c={};h.registerSubtype=function(t){c[t.name]=t},h.create=function(t){return void 0===t?null:l(t)},h.invertComponent=function(t){var e={p:t.p};return t.t&&c[t.t]&&(e.t=t.t,e.o=c[t.t].invert(t.o)),void 0!==t.si&&(e.sd=t.si),void 0!==t.sd&&(e.si=t.sd),void 0!==t.oi&&(e.od=t.oi),void 0!==t.od&&(e.oi=t.od),void 0!==t.li&&(e.ld=t.li),void 0!==t.ld&&(e.li=t.ld),void 0!==t.na&&(e.na=-t.na),void 0!==t.lm&&(e.lm=t.p[t.p.length-1],e.p=t.p.slice(0,t.p.length-1).concat([t.lm])),e},h.invert=function(t){for(var e=t.slice().reverse(),i=[],n=0;n<e.length;n++)i.push(h.invertComponent(e[n]));return i},h.checkValidOp=function(t){for(var e=0;e<t.length;e++)if(!s(t[e].p))throw new Error("Missing path")},h.checkList=function(t){if(!s(t))throw new Error("Referenced element not a list")},h.checkObj=function(t){if(!o(t))throw new Error("Referenced element not an object (it was "+JSON.stringify(t)+")")},h.apply=function(t,e){h.checkValidOp(e),e=l(e);for(var i={data:t},r=0;r<e.length;r++){var s=e[r];null==s.si&&null==s.sd||n(s);for(var o=null,p=null,a=i,u="data",f=0;f<s.p.length;f++){var d=s.p[f];if(o=a,p=u,a=a[u],u=d,null==o)throw new Error("Path invalid")}if(s.t&&void 0!==s.o&&c[s.t])a[u]=c[s.t].apply(a[u],s.o);else if(void 0!==s.na){if("number"!=typeof a[u])throw new Error("Referenced element not a number");a[u]+=s.na}else if(void 0!==s.li&&void 0!==s.ld)h.checkList(a),a[u]=s.li;else if(void 0!==s.li)h.checkList(a),a.splice(u,0,s.li);else if(void 0!==s.ld)h.checkList(a),a.splice(u,1);else if(void 0!==s.lm){if(h.checkList(a),s.lm!=u){var v=a[u];a.splice(u,1),a.splice(s.lm,0,v)}}else if(void 0!==s.oi)h.checkObj(a),a[u]=s.oi;else{if(void 0===s.od)throw new Error("invalid / missing instruction in op");h.checkObj(a),delete a[u]}}return i.data},h.shatter=function(t){for(var e=[],i=0;i<t.length;i++)e.push([t[i]]);return e},h.incrementalApply=function(t,e,i){for(var n=0;n<e.length;n++){var r=[e[n]];t=h.apply(t,r),i(r,t)}return t};var p=h.pathMatches=function(t,e,i){if(t.length!=e.length)return!1;for(var n=0;n<t.length;n++)if(t[n]!==e[n]&&(!i||n!==t.length-1))return!1;return!0};h.append=function(t,e){if(e=l(e),0===t.length)return void t.push(e);var i=t[t.length-1];if(null==e.si&&null==e.sd||null==i.si&&null==i.sd||(n(e),n(i)),p(e.p,i.p))if(e.t&&i.t&&e.t===i.t&&c[e.t]){if(i.o=c[e.t].compose(i.o,e.o),null!=e.si||null!=e.sd){for(var s=e.p,o=0;o<i.o.length-1;o++)e.o=[i.o.pop()],e.p=s.slice(),r(e),t.push(e);r(i)}}else null!=i.na&&null!=e.na?t[t.length-1]={p:i.p,na:i.na+e.na}:void 0!==i.li&&void 0===e.li&&e.ld===i.li?void 0!==i.ld?delete i.li:t.pop():void 0!==i.od&&void 0===i.oi&&void 0!==e.oi&&void 0===e.od?i.oi=e.oi:void 0!==i.oi&&void 0!==e.od?void 0!==e.oi?i.oi=e.oi:void 0!==i.od?delete i.oi:t.pop():void 0!==e.lm&&e.p[e.p.length-1]===e.lm||t.push(e);else null==e.si&&null==e.sd||null==i.si&&null==i.sd||(r(e),r(i)),t.push(e)},h.compose=function(t,e){h.checkValidOp(t),h.checkValidOp(e);for(var i=l(t),n=0;n<e.length;n++)h.append(i,e[n]);return i},h.normalize=function(t){var e=[];t=s(t)?t:[t];for(var i=0;i<t.length;i++){var n=t[i];null==n.p&&(n.p=[]),h.append(e,n)}return e},h.commonLengthForOps=function(t,e){var i=t.p.length,n=e.p.length;if((null!=t.na||t.t)&&i++,(null!=e.na||e.t)&&n++,0===i)return-1;if(0===n)return null;i--,n--;for(var r=0;r<i;r++){var s=t.p[r];if(r>=n||s!==e.p[r])return null}return i},h.canOpAffectPath=function(t,e){return null!=h.commonLengthForOps({p:e},t)},h.transformComponent=function(t,e,i,s){e=l(e);var o=h.commonLengthForOps(i,e),p=h.commonLengthForOps(e,i),a=e.p.length,u=i.p.length;if((null!=e.na||e.t)&&a++,(null!=i.na||i.t)&&u++,null!=p&&u>a&&e.p[p]==i.p[p])if(void 0!==e.ld){var f=l(i);f.p=f.p.slice(a),e.ld=h.apply(l(e.ld),[f])}else if(void 0!==e.od){var f=l(i);f.p=f.p.slice(a),e.od=h.apply(l(e.od),[f])}if(null!=o){var d=a==u,f=i;if(null==e.si&&null==e.sd||null==i.si&&null==i.sd||(n(e),f=l(i),n(f)),f.t&&c[f.t]){if(e.t&&e.t===f.t){var v=c[e.t].transform(e.o,f.o,s);if(v.length>0)if(null!=e.si||null!=e.sd)for(var g=e.p,y=0;y<v.length;y++)e.o=[v[y]],e.p=g.slice(),r(e),h.append(t,e);else e.o=v,h.append(t,e);return t}}else if(void 0!==i.na);else if(void 0!==i.li&&void 0!==i.ld){if(i.p[o]===e.p[o]){if(!d)return t;if(void 0!==e.ld){if(void 0===e.li||"left"!==s)return t;e.ld=l(i.li)}}}else if(void 0!==i.li)void 0!==e.li&&void 0===e.ld&&d&&e.p[o]===i.p[o]?"right"===s&&e.p[o]++:i.p[o]<=e.p[o]&&e.p[o]++,void 0!==e.lm&&d&&i.p[o]<=e.lm&&e.lm++;else if(void 0!==i.ld){if(void 0!==e.lm&&d){if(i.p[o]===e.p[o])return t;var g=i.p[o],m=e.p[o],b=e.lm;(g<b||g===b&&m<b)&&e.lm--}if(i.p[o]<e.p[o])e.p[o]--;else if(i.p[o]===e.p[o]){if(u<a)return t;if(void 0!==e.ld){if(void 0===e.li)return t;delete e.ld}}}else if(void 0!==i.lm)if(void 0!==e.lm&&a===u){var m=e.p[o],b=e.lm,_=i.p[o],w=i.lm;if(_!==w)if(m===_){if("left"!==s)return t;e.p[o]=w,m===b&&(e.lm=w)}else m>_&&e.p[o]--,m>w?e.p[o]++:m===w&&_>w&&(e.p[o]++,m===b&&e.lm++),b>_?e.lm--:b===_&&b>m&&e.lm--,b>w?e.lm++:b===w&&(w>_&&b>m||w<_&&b<m?"right"===s&&e.lm++:b>m?e.lm++:b===_&&e.lm--)}else if(void 0!==e.li&&void 0===e.ld&&d){var m=i.p[o],b=i.lm;g=e.p[o],g>m&&e.p[o]--,g>b&&e.p[o]++}else{var m=i.p[o],b=i.lm;g=e.p[o],g===m?e.p[o]=b:(g>m&&e.p[o]--,g>b?e.p[o]++:g===b&&m>b&&e.p[o]++)}else if(void 0!==i.oi&&void 0!==i.od){if(e.p[o]===i.p[o]){if(void 0===e.oi||!d)return t;if("right"===s)return t;e.od=i.oi}}else if(void 0!==i.oi){if(void 0!==e.oi&&e.p[o]===i.p[o]){if("left"!==s)return t;h.append(t,{p:e.p,od:i.oi})}}else if(void 0!==i.od&&e.p[o]==i.p[o]){if(!d)return t;if(void 0===e.oi)return t;delete e.od}}return h.append(t,e),t},i(12)(h,h.transformComponent,h.checkValidOp,h.append);var a=i(13);h.registerSubtype(a),t.exports=h},function(t,e){function i(t,e,i,n){var r=function(t,i,n,r){e(n,t,i,"left"),e(r,i,t,"right")},s=t.transformX=function(t,e){i(t),i(e);for(var o=[],l=0;l<e.length;l++){for(var h=e[l],c=[],p=0;p<t.length;){var a=[];if(r(t[p],h,c,a),p++,1!==a.length){if(0===a.length){for(var u=p;u<t.length;u++)n(c,t[u]);h=null;break}for(var f=s(t.slice(p),a),d=0;d<f[0].length;d++)n(c,f[0][d]);for(var v=0;v<f[1].length;v++)n(o,f[1][v]);h=null;break}h=a[0]}null!=h&&n(o,h),t=c}return[t,o]};t.transform=function(t,i,n){if("left"!==n&&"right"!==n)throw new Error("type must be 'left' or 'right'");return 0===i.length?t:1===t.length&&1===i.length?e([],t[0],i[0],n):"left"===n?s(t,i)[0]:s(i,t)[1]}}t.exports=i},function(t,e,i){var n=t.exports={name:"text0",uri:"http://sharejs.org/types/textv0",create:function(t){if(null!=t&&"string"!=typeof t)throw new Error("Initial data must be a string");return t||""}},r=function(t,e,i){return t.slice(0,e)+i+t.slice(e)},s=function(t){if("number"!=typeof t.p)throw new Error("component missing position field");if("string"==typeof t.i==("string"==typeof t.d))throw new Error("component needs an i or d field");if(t.p<0)throw new Error("position cannot be negative")},o=function(t){for(var e=0;e<t.length;e++)s(t[e])};n.apply=function(t,e){var i;o(e);for(var n=0;n<e.length;n++){var s=e[n];if(null!=s.i)t=r(t,s.p,s.i);else{if(i=t.slice(s.p,s.p+s.d.length),s.d!==i)throw new Error("Delete component '"+s.d+"' does not match deleted text '"+i+"'");t=t.slice(0,s.p)+t.slice(s.p+s.d.length)}}return t};var l=n._append=function(t,e){if(""!==e.i&&""!==e.d)if(0===t.length)t.push(e);else{var i=t[t.length-1];null!=i.i&&null!=e.i&&i.p<=e.p&&e.p<=i.p+i.i.length?t[t.length-1]={i:r(i.i,e.p-i.p,e.i),p:i.p}:null!=i.d&&null!=e.d&&e.p<=i.p&&i.p<=e.p+e.d.length?t[t.length-1]={d:r(e.d,i.p-e.p,i.d),p:e.p}:t.push(e)}};n.compose=function(t,e){o(t),o(e);for(var i=t.slice(),n=0;n<e.length;n++)l(i,e[n]);return i},n.normalize=function(t){var e=[];null==t.i&&null==t.p||(t=[t]);for(var i=0;i<t.length;i++){var n=t[i];null==n.p&&(n.p=0),l(e,n)}return e};var h=function(t,e,i){return null!=e.i?e.p<t||e.p===t&&i?t+e.i.length:t:t<=e.p?t:t<=e.p+e.d.length?e.p:t-e.d.length};n.transformCursor=function(t,e,i){for(var n="right"===i,r=0;r<e.length;r++)t=h(t,e[r],n);
return t};var c=n._tc=function(t,e,i,n){if(s(e),s(i),null!=e.i)l(t,{i:e.i,p:h(e.p,i,"right"===n)});else if(null!=i.i){var r=e.d;e.p<i.p&&(l(t,{d:r.slice(0,i.p-e.p),p:e.p}),r=r.slice(i.p-e.p)),""!==r&&l(t,{d:r,p:e.p+i.i.length})}else if(e.p>=i.p+i.d.length)l(t,{d:e.d,p:e.p-i.d.length});else if(e.p+e.d.length<=i.p)l(t,e);else{var o={d:"",p:e.p};e.p<i.p&&(o.d=e.d.slice(0,i.p-e.p)),e.p+e.d.length>i.p+i.d.length&&(o.d+=e.d.slice(i.p+i.d.length-e.p));var c=Math.max(e.p,i.p),p=Math.min(e.p+e.d.length,i.p+i.d.length),a=e.d.slice(c-e.p,p-e.p),u=i.d.slice(c-i.p,p-i.p);if(a!==u)throw new Error("Delete ops delete different text in the same region of the document");""!==o.d&&(o.p=h(o.p,i),l(t,o))}return t},p=function(t){return null!=t.i?{d:t.i,p:t.p}:{i:t.d,p:t.p}};n.invert=function(t){t=t.slice().reverse();for(var e=0;e<t.length;e++)t[e]=p(t[e]);return t},i(12)(n,c,o,l)},function(t,e,i){(function(e){function n(t,e,i,n,s,o,l){r.EventEmitter.call(this),this.action=t,this.connection=e,this.id=i,this.collection=n,this.query=s,this.results=null,o&&o.results&&(this.results=o.results,delete o.results),this.extra=void 0,this.options=o,this.callback=l,this.ready=!1,this.sent=!1}var r=i(5);t.exports=n,r.mixin(n),n.prototype.hasPending=function(){return!this.ready},n.prototype.send=function(){if(this.connection.canSend){var t={a:this.action,id:this.id,c:this.collection,q:this.query};if(this.options&&(t.o=this.options),this.results){for(var e=[],i=0;i<this.results.length;i++){var n=this.results[i];e.push([n.id,n.version])}t.r=e}this.connection.send(t),this.sent=!0}},n.prototype.destroy=function(t){this.connection.canSend&&"qs"===this.action&&this.connection.send({a:"qu",id:this.id}),this.connection._destroyQuery(this),t&&e.nextTick(t)},n.prototype._onConnectionStateChanged=function(){this.connection.canSend&&!this.sent?this.send():this.sent=!1},n.prototype._handleFetch=function(t,e,i){this.connection._destroyQuery(this),this._handleResponse(t,e,i)},n.prototype._handleSubscribe=function(t,e,i){this._handleResponse(t,e,i)},n.prototype._handleResponse=function(t,e,i){var n=this.callback;if(this.callback=null,t)return this._finishResponse(t,n);if(!e)return this._finishResponse(null,n);var r=this,s=1,o=function(t){return t?r._finishResponse(t,n):void(--s||r._finishResponse(null,n))};if(Array.isArray(e))s+=e.length,this.results=this._ingestSnapshots(e,o),this.extra=i;else for(var l in e){s++;var h=e[l],c=this.connection.get(h.c||this.collection,l);c.ingestSnapshot(h,o)}o()},n.prototype._ingestSnapshots=function(t,e){for(var i=[],n=0;n<t.length;n++){var r=t[n],s=this.connection.get(r.c||this.collection,r.d);s.ingestSnapshot(r,e),i.push(s)}return i},n.prototype._finishResponse=function(t,e){return this.emit("ready"),this.ready=!0,t?(this.connection._destroyQuery(this),e?e(t):this.emit("error",t)):void(e&&e(null,this.results,this.extra))},n.prototype._handleError=function(t){this.emit("error",t)},n.prototype._handleDiff=function(t){for(var e=0;e<t.length;e++){var i=t[e];"insert"===i.type&&(i.values=this._ingestSnapshots(i.values))}for(var e=0;e<t.length;e++){var i=t[e];switch(i.type){case"insert":var n=i.values;Array.prototype.splice.apply(this.results,[i.index,0].concat(n)),this.emit("insert",n,i.index);break;case"remove":var r=i.howMany||1,s=this.results.splice(i.index,r);this.emit("remove",s,i.index);break;case"move":var r=i.howMany||1,o=this.results.splice(i.from,r);Array.prototype.splice.apply(this.results,[i.to,0].concat(o)),this.emit("move",o,i.from,i.to)}}this.emit("changed",this.results)},n.prototype._handleExtra=function(t){this.extra=t,this.emit("extra",t)}}).call(e,i(3))},function(t,e){function i(){}e.doNothing=i,e.hasKeys=function(t){for(var e in t)return!0;return!1}}]);!function(e){function t(n){if(r[n])return r[n].exports;var o=r[n]={exports:{},id:n,loaded:!1};return e[n].call(o.exports,o,o.exports,t),o.loaded=!0,o.exports}var r={};return t.m=e,t.c=r,t.p="",t(0)}([function(e,t,r){otText=r(1)},function(e,t,r){var n=r(2);n.api=r(3),e.exports={type:n}},function(e,t){t.name="text",t.uri="http://sharejs.org/types/textv1",t.create=function(e){if(null!=e&&"string"!=typeof e)throw Error("Initial data must be a string");return e||""};var r=Array.isArray||function(e){return"[object Array]"===Object.prototype.toString.call(e)},n=function(e){if(!r(e))throw Error("Op must be an array of components");for(var t=null,n=0;n<e.length;n++){var o=e[n];switch(typeof o){case"object":if(!("number"==typeof o.d&&o.d>0))throw Error("Object components must be deletes of size > 0");break;case"string":if(!(o.length>0))throw Error("Inserts cannot be empty");break;case"number":if(!(o>0))throw Error("Skip components must be >0");if("number"==typeof t)throw Error("Adjacent skip components should be combined")}t=o}if("number"==typeof t)throw Error("Op has a trailing skip")},o=function(e){return function(t){if(t&&0!==t.d)return 0===e.length?e.push(t):typeof t==typeof e[e.length-1]?"object"==typeof t?e[e.length-1].d+=t.d:e[e.length-1]+=t:e.push(t)}},i=function(e){var t=0,r=0,n=function(n,o){if(t===e.length)return n===-1?null:n;var i,s=e[t];return"number"==typeof s?n===-1||s-r<=n?(i=s-r,++t,r=0,i):(r+=n,n):"string"==typeof s?n===-1||"i"===o||s.length-r<=n?(i=s.slice(r),++t,r=0,i):(i=s.slice(r,r+n),r+=n,i):n===-1||"d"===o||s.d-r<=n?(i={d:s.d-r},++t,r=0,i):(r+=n,{d:n})},o=function(){return e[t]};return[n,o]},s=function(e){return"number"==typeof e?e:e.length||e.d},a=function(e){return e.length>0&&"number"==typeof e[e.length-1]&&e.pop(),e};t.normalize=function(e){for(var t=[],r=o(t),n=0;n<e.length;n++)r(e[n]);return a(t)},t.apply=function(e,t){if("string"!=typeof e)throw Error("Snapshot should be a string");n(t);for(var r=[],o=0;o<t.length;o++){var i=t[o];switch(typeof i){case"number":if(i>e.length)throw Error("The op is too long for this document");r.push(e.slice(0,i)),e=e.slice(i);break;case"string":r.push(i);break;case"object":e=e.slice(i.d)}}return r.join("")+e},t.transform=function(e,t,r){if("left"!=r&&"right"!=r)throw Error("side ("+r+") must be 'left' or 'right'");n(e),n(t);for(var c=[],f=o(c),u=i(e),h=u[0],l=u[1],p=0;p<t.length;p++){var b,g,m=t[p];switch(typeof m){case"number":for(b=m;b>0;)g=h(b,"i"),f(g),"string"!=typeof g&&(b-=s(g));break;case"string":"left"===r&&"string"==typeof l()&&f(h(-1)),f(m.length);break;case"object":for(b=m.d;b>0;)switch(g=h(b,"i"),typeof g){case"number":b-=g;break;case"string":f(g);break;case"object":b-=g.d}}}for(;m=h(-1);)f(m);return a(c)},t.compose=function(e,t){n(e),n(t);for(var r=[],c=o(r),f=i(e)[0],u=0;u<t.length;u++){var h,l,p=t[u];switch(typeof p){case"number":for(h=p;h>0;)l=f(h,"d"),c(l),"object"!=typeof l&&(h-=s(l));break;case"string":c(p);break;case"object":for(h=p.d;h>0;)switch(l=f(h,"d"),typeof l){case"number":c({d:l}),h-=l;break;case"string":h-=l.length;break;case"object":c(l)}}}for(;p=f(-1);)c(p);return a(r)};var c=function(e,t){for(var r=0,n=0;n<t.length;n++){var o=t[n];if(e<=r)break;switch(typeof o){case"number":if(e<=r+o)return e;r+=o;break;case"string":r+=o.length,e+=o.length;break;case"object":e-=Math.min(o.d,e-r)}}return e};t.transformSelection=function(e,t,r){var n=0;if(r){for(var o=0;o<t.length;o++){var i=t[o];switch(typeof i){case"number":n+=i;break;case"string":n+=i.length}}return n}return"number"==typeof e?c(e,t):[c(e[0],t),c(e[1],t)]},t.selectionEq=function(e,t){return null!=e[0]&&e[0]===e[1]&&(e=e[0]),null!=t[0]&&t[0]===t[1]&&(t=t[0]),e===t||null!=e[0]&&null!=t[0]&&e[0]===t[0]&&e[1]==t[1]}},function(e,t){function r(e,t){return{get:function(){return e()},getLength:function(){return e().length},insert:function(e,r,n){return t([e,r],n)},remove:function(e,r,n){return t([e,{d:r}],n)},_onOp:function(e){for(var t=0,r=0,n=0;n<e.length;n++){var o=e[n];switch(typeof o){case"number":t+=o,r+=o;break;case"string":this.onInsert&&this.onInsert(t,o),t+=o.length;break;case"object":this.onRemove&&this.onRemove(t,o.d),r+=o.d}}}}}e.exports=r,r.provides={text:!0}}]);
/* jslint browser: true */

/* global */

var ResizeThrottler = new (function() {
    /***********************************************************
        Private section.
        
        Fields.
    ************************************************************/
    var _callback_arr = [],
        
        _throttling_speed = 1000 / 8, // 8 fps by default
        
        _resize_timeout = null;
        
    
    /***********************************************************
        Private section.
        
        Functions.
    ************************************************************/
    var _throttler = function () {
        if (_resize_timeout === null) {
            _resize_timeout = setTimeout(function() {
                _resize_timeout = null;
                _callback_arr.forEach(function (func) { func(); });
            }, _throttling_speed);
        }
    };
    
    var _add = function (callback) {
        _callback_arr.push(callback);
    };
    
    /***********************************************************
        Public section.
        
        Functions.
    ************************************************************/
    this.initialize = function (callback_arr) {
        window.addEventListener("resize", _throttler, false);
        
        callback_arr.forEach(function (func) { _add(func); func(); });
    };
    
    this.add = function (callback) {
        _add(callback);
    };
})();
window.onload = function() {
    "use strict";
    
    document.body.style.overflow = "hidden";
    
/* jslint browser: true */

var _fp_main = function (join_cb) {
    var _welcome_message = 'Welcome back ',
        _user_name_ls_key = 'fs-user-name',
        _session_list_ls_key = 'fs-session-list',
    
        _user_name_element = document.getElementById("userName"),
        _session_name_element = document.getElementById("sessionName"),
        _session_btn_element = document.getElementById("sessionBtn"),
        _session_list_element = document.getElementById("sessionList"),
        _user_about_element = document.getElementById("userIntro"),
        _clear_sessions_btn_element = document.getElementById("clearSessionsBtn"),
        _browser_compatibility_element = document.getElementById("browserCompatibility"),
        _sessions_element = document.getElementById("sessions"),
        
        _session_list_str = localStorage.getItem(_session_list_ls_key),
        
        _user_name = localStorage.getItem(_user_name_ls_key);
    
    var _backToTopCb = function () {
        var scroll_top = document.documentElement.scrollTop || document.body.scrollTop,
            back_to_top = document.getElementById("back_to_top"),
            display_at_y = 500;

        if (!back_to_top) {
            return;
        }
        
        if (scroll_top < display_at_y && 
            back_to_top.style.display !== "none") {
            back_to_top.style.display = "none";
        } else if (scroll_top >= display_at_y &&
                   back_to_top.style.display === "none") {
            back_to_top.style.display = "block";
        }
    };
    
    var _removeSessionTable = function (element) {
        var session_table_element = element.parentElement;
        
        session_table_element.parentElement.removeChild(session_table_element);
        
        _clear_sessions_btn_element.parentElement.removeChild(_clear_sessions_btn_element);
    };
    
    var _removeSessions = function (element) {
        element.innerHTML = "";
        
        localStorage.removeItem(_session_list_ls_key);
    };
    
    var _getSessionName = function () {
        if (_session_name_element.value === "") {
            return _session_name_element.placeholder;
        } else {
            return _session_name_element.value;
        }  
    };
    
    var _getUserName = function () {
        if (_user_name_element.value === "") {
            return _user_name_element.placeholder;
        } else {
            return _user_name_element.value;
        }  
    };

    var _setSession = function (name) {
            if (join_cb) {
                return;
            }
        
            if (name.length > 128) { // TODO : Handle notification about session validation
                return;
            }
        
            _session_btn_element.href = "app/" + name;
        };
    
    var _isCompatibleBrowser = function () {
        // check browser compatibility
    };
    
    var _joinSessionFn = function (name) {
        return (function () {
            if (join_cb) {
                join_cb(name);
            } else {
                _setSession(name);

                location.href = "app/" + name;
            }
        });
    };
    
    var _deleteSessionFn = function (col_element, name) {
        return (function () {
            var session_list_str = localStorage.getItem(_session_list_ls_key),
                session_list = [],
                i = 0,
                
                row = col_element.parentElement;
            
            row.parentElement.removeChild(row);

            if (session_list_str) {
                session_list = JSON.parse(session_list_str);
            }
        
            for (i = 0; i < session_list.length; i += 1) {
                if (session_list[i] === name) {
                    session_list.splice(i, 1)
                    break;
                }
            }
            
            if (session_list.length > 0) {
                localStorage.setItem(_session_list_ls_key, JSON.stringify(session_list));
            } else {
                _clear_sessions_btn_element.parentElement.removeChild(_clear_sessions_btn_element);
                
                localStorage.removeItem(_session_list_ls_key);
            }
            
            // delete session settings
            if (localStorage.getItem(name) !== null) {
                localStorage.removeItem(name);
            }
        });
    };
    
    var _onSessionColClick = function () {
        var session_col = this,
            
            session_name = session_col.textContent;
        
        WUI_CircularMenu.create({
                element: session_col,
            
                angle: 90
            },
            [
                { icon: "fp-join-icon", tooltip: "Join session",  on_click: _joinSessionFn(session_name) },
                { icon: "fp-trash-icon", tooltip: "Delete session",  on_click: _deleteSessionFn(session_col, session_name) }
            ]);
    };
    
    _session_name_element.placeholder = Math.random().toString(36).substr(2, 12);

    _setSession(_session_name_element.placeholder);
    
    if (_user_name) {
        if (!join_cb) {
            _user_about_element.innerHTML = _welcome_message + '<span class="fp-user-name">' + _user_name + '</span>';
        }
        
        _user_name_element.value = _user_name;
    } else {
        _sessions_element.parentElement.removeChild(_sessions_element);
    }
    
    _user_name_element.addEventListener("change", function() {
            localStorage.setItem(_user_name_ls_key, _getUserName());
        });
    
    _session_name_element.addEventListener("change", function() {
            _setSession(_session_name_element.value);
        });
    
    _clear_sessions_btn_element.addEventListener("click", function () {
            _removeSessions(_session_list_element);
        
            _clear_sessions_btn_element.parentElement.removeChild(_clear_sessions_btn_element);
        });
    
    _session_btn_element.addEventListener("click", function (e) {
            var session_list_str = localStorage.getItem(_session_list_ls_key),
                session_list = [],
                session_name = _getSessionName(),
                i = 0;

            if (session_list_str) {
                session_list = JSON.parse(session_list_str);
            }
        
            for (i = 0; i < session_list.length; i += 1) {
                if (session_list[i] === session_name) {
                    session_list.splice(i, 1)
                    break;
                }
            }
        
            session_list.push(session_name);
        
            localStorage.setItem(_session_list_ls_key, JSON.stringify(session_list));
        
            localStorage.setItem(_user_name_ls_key, _getUserName());
        
            if (join_cb) {
                join_cb(name);
            }
        });
    
    if (_session_list_str) {
        var session_list = JSON.parse(_session_list_str),
            row, col, btn,
            i = 0;

        for (i = 0; i < session_list.length; i += 1) {
            row = document.createElement("tr");
            col = document.createElement("td");
            
            _session_list_element.insertBefore(row, _session_list_element.firstChild);
            
            col.innerHTML = session_list[i];
            
            col.addEventListener("click", _onSessionColClick);
            
            row.appendChild(col);
        }
    } else {
        _clear_sessions_btn_element.parentElement.removeChild(_clear_sessions_btn_element);
        //_removeSessionTable(_session_list_element);
    }
    
    window.addEventListener("scroll", _backToTopCb);
    
    _backToTopCb();
};
/***********************************************************
    Fields.
************************************************************/

var _electron,
    
    _fasInfos,
    _fasRestart,
    
    _fas_devices,
    
    _electron_login_dialog,
    
    _fs_fas_device = null,
    _chosen_fas_device = 0;

/***********************************************************
    Functions.
************************************************************/

var _isElectronApp = function () {
    return (typeof process !== "undefined") && process.versions && (process.versions.electron !== undefined);
};

var _join = function (session_name) {
    var body_childs = document.body.children,
        i = 0;
    
    for (i = 0; i < body_childs.length; i += 1) {
        if (body_childs[i].id === "fs_electron_login") {
            body_childs[i].style.display = "none";
        } else {
            body_childs[i].style.display = "";
        }
    }
    
    FragmentSynth({
            session_name: session_name,
            fas: true
        });
};

var _restartFas = function () {
    var opts = [];
    
    if (_chosen_fas_device) {
        opts.push("--device");
        opts.push(_chosen_fas_device);
    }
    
    _fasRestart(opts);
};

var _updateDeviceInfos = function (index) {
    var fas_infos_elem = document.getElementById("fs_fas_infos"),
        
        device = _fas_devices[index],
        
        html = "<ul>";
    
    html += "<li>max input channels: " + device.inchn + "</li>";
    html += "<li>max output channels: " + device.ouchn + "</li>";
    html += "<li>default samplerate: " + parseInt(device.smpr, 10) + "</li>";
    html += "</ul>";
    
    fas_infos_elem.innerHTML = html;
};

var _onDeviceSelected = function (e) {
    var selected_option = e.target.options[e.target.selectedIndex],
        device_id = parseInt(selected_option.dataset.id, 10),
        device_name = e.target.value;
    
    _chosen_fas_device = device_id;
    
    _updateDeviceInfos(device_id);
    
    localStorage.setItem('fs-fas-device-id', device_id);
    localStorage.setItem('fs-fas-device-name', device_name);
    
    _restartFas();
};

var _onDeviceInfos = function (devices) {
    _fas_devices = devices;
    
    var device_select = document.getElementById("fs_fas_device"),
        
        selected_device_id = localStorage.getItem('fs-fas-device-id'),
        selected_device_name = localStorage.getItem('fs-fas-device-name'),
        
        fas_device,
        
        selected = "",
        
        i = 0;
    
    if (selected_device_id === null) {
        selected_device_id = 0;
    } else {
        selected_device_id = parseInt(selected_device_id, 10);
    }
    
    _chosen_fas_device = selected_device_id;
    
    device_select.addEventListener("change", _onDeviceSelected);
    
    device_select.innerHTML = "";
    
    for (i = _fas_devices.length - 1; i > 0; i -= 1) {
        fas_device = _fas_devices[i];
        
        if (fas_device.id === selected_device_id &&
            fas_device.name === selected_device_name) {
            selected = " selected"
        } else {
            selected = "";
        }
        
        device_select.innerHTML += "<option data-id=\"" + fas_device.id + "\"" + selected + ">" + fas_device.name + "</option>";
    }
    
    _updateDeviceInfos(_chosen_fas_device);
};

/***********************************************************
    Init.
************************************************************/

var _electronInit = function () {
    var electron_login = document.getElementById("fs_electron_login"),
        
        body_childs = document.body.children,
        
        i = 0;
    
    if (_isElectronApp()) {
        document.body.classList.add("login");
        
        _electron = require('electron');
        
        _fasInfos = _electron.remote.getGlobal('fasInfos');
        _fasRestart = _electron.remote.getGlobal('fasRestart');
        
        //document.body.style.backgroundColor = "#ffffff";
         
        for (i = 0; i < body_childs.length; i += 1) {
            if (body_childs[i].id !== "fs_electron_login") {
                body_childs[i].style.display = "none";
            }
        }
        
        _electron_login_dialog = WUI_Dialog.create("fs_electron_login_dialog", {
                title: "",

                width: "500px",
                height: "400px",

                halign: "center",
                valign: "center",

                open: true,
                closable: false,
            
                status_bar: false,
                detachable: false,
                resizable: false,
                minimizable: false,
                draggable: false,
            });
        
        WUI_Tabs.create("fs_electron_login_tabs", {
            //on_tab_click: tab_clicked,

            height: "100%"
        });
        
        document.getElementById("fs_app_version").innerHTML = "v" + _electron.remote.app.getVersion();

        _fp_main(_join);
        
        electron_login.style.display = "";
        
        _fasInfos(_onDeviceInfos);
        
        return true;
    } else {
        document.body.removeChild(electron_login);
    }
    
    return false;
};    
var FragmentSynth = function (params) {
    "use strict";

    /***********************************************************
        Globals.
    ************************************************************/

/* jslint browser: true */

var _fs_palette = {
        0:   [0,   0,   0],
        10:  [75,  0, 159],
        20:  [104, 0, 251],
        30:  [131, 0, 255],
        40:  [155, 18,157],
        50:  [175, 37,  0],
        60:  [191, 59,  0],
        70:  [206, 88,  0],
        80:  [223, 132, 0],
        90:  [240, 188, 0],
        100: [255, 252, 0]
    },
    
    _spectrum_colors = [];

/***********************************************************
    Functions.
************************************************************/

var _webMIDISupport = function () {
    if (navigator.requestMIDIAccess) {
        return true;
    } else {
        return false;
    }
};

var _isPowerOf2 = function (value) {
    return (value & (value - 1)) === 0;
};

var _parseInt10 = function (value) {
    return parseInt(value, 10);
};

var _getElementOffset = function (elem) {
    var box = elem.getBoundingClientRect(),
        body = document.body,
        docEl = document.documentElement,

        scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop,
        scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft,

        clientTop = docEl.clientTop || body.clientTop || 0,
        clientLeft = docEl.clientLeft || body.clientLeft || 0,

        top  = box.top +  scrollTop - clientTop,
        left = box.left + scrollLeft - clientLeft;

    return { top: Math.round(top), left: Math.round(left), width: box.width, height: box.height };
};

var _logScale = function (index, total, opt_base) {
    var base = opt_base || 2, 
        logmax = Math.log(total + 1) / Math.log(base),
        exp = logmax * index / total;
    
    return Math.round(Math.pow(base, exp) - 1);
};

var _melScale = function () {
    
};

var _barkScale = function (length, sample_rate, buffer_size) {
    var scale = new Float32Array(length),
        
        i = 0;
    
    for (i = 0; i < scale.length; i += 1) {
        scale[i] = i * sample_rate / buffer_size;
        scale[i] = 13 * Math.atan(scale[i] / 1315.8) + 3.5 * Math.atan(Math.pow((scale[i] / 7518), 2));
    }
    
    return scale;
};

var _getColorFromPalette = function (value) {
    var decimalised = 100 * value / 255,
        percent = decimalised / 100,
        floored = 10 * Math.floor(decimalised / 10),
        distFromFloor = decimalised - floored,
        distFromFloorPercentage = distFromFloor/10,
        rangeToNextColor,
        color;
    
    if (decimalised < 100){
        rangeToNextColor = [
            _fs_palette[floored + 10][0] - _fs_palette[floored + 10][0],
            _fs_palette[floored + 10][1] - _fs_palette[floored + 10][1],
            _fs_palette[floored + 10][2] - _fs_palette[floored + 10][2]
        ];
    } else {
        rangeToNextColor = [0, 0, 0];
    }

    color = [
        _fs_palette[floored][0] + distFromFloorPercentage * rangeToNextColor[0],
        _fs_palette[floored][1] + distFromFloorPercentage * rangeToNextColor[1],
        _fs_palette[floored][2] + distFromFloorPercentage * rangeToNextColor[2]
    ];

    return "rgb(" + color[0] +", "+color[1] +"," + color[2]+")";
};

// thank to Nick Knowlson - http://stackoverflow.com/questions/4912788/truncate-not-round-off-decimal-numbers-in-javascript
var _truncateDecimals = function (num, digits) {
    var numS = num.toString(),
        decPos = numS.indexOf('.'),
        substrLength = decPos == -1 ? numS.length : 1 + decPos + digits,
        trimmedResult = numS.substr(0, substrLength),
        finalResult = isNaN(trimmedResult) ? 0 : trimmedResult;

    return parseFloat(finalResult);
};

var _isFireFox = function () {
    return (navigator.userAgent.toLowerCase().indexOf('firefox') > -1);
};

var _frequencyFromNoteNumber = function (note) {
    return 440 * Math.pow(2, (note - 69) / 12);
};

// ms
var _getNoteTime = function (tempo, ppb) {
    return (1.0 / ppb) * (60.0 / tempo);
};

var _lZeroPad = function (str, c, length) {
    str = "" + str;

    while (str.length < length) {
        str = c + str;
    }

    return str;
};

var _setCookie = function (name, value, days) {
    var d = new Date();
    
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    
    document.cookie = name + "=" + value + ";" + ("expires=" + d.toUTCString()) + ";path=/";
};

var _getCookie = function getCookie(name) {
    var cookies,
        cookie,
        
        i = 0;
    
    name = name + "=";
    cookies = document.cookie.split(';');
    
    for(i = 0; i < cookies.length; i += 1) {
        cookie = cookies[i];
        
        while (cookie.charAt(0) == ' ') {
            cookie = cookie.substring(1);
        }
        
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length, cookie.length);
        }
    }
    
    return "";
};

/***********************************************************
    Init.
************************************************************/

var _toolsInit = function () {
    var i = 0;
    
    for (i = 0; i < 256; i += 1) {
        _spectrum_colors.push(_getColorFromPalette(i));
    }
};

_toolsInit();/* jslint browser: true */


/*
    Simple double notifications system
    
    This show notification messages in corners of the score area,
    generic notifications can be stacked and a duration can be set,
    fail notification is used for notifications that should not disapear and should be solved (aka, GLSL compilation failed),
    fail notification is always shown in the left corner, if a generic notification is shown at the same time, it will go to the right corner,
    there is also the utter fail notification which is just used for critical, app. breaking stuff...
*/

/***********************************************************
    Fields.
************************************************************/

var _utter_fail_element = document.getElementById("fs_utter_fail"),
    _fail_element = document.getElementById("fail"),
    _notification_element = document.getElementById("fs_notification");

/***********************************************************
    Functions.
************************************************************/

var _fail = function (message, utter) {
    _fail_element.innerHTML = message;
    
    if (utter) {
        document.body.innerHTML = "";
        
        _utter_fail_element.innerHTML = '<a href="https://www.fsynth.com"><img src="data/fsynth2.png" width="397"/></a>' + message;
        
        document.body.appendChild(_utter_fail_element);
    }
};

var _utterFailRemove = function () {
    _utter_fail_element.parentElement.removeChild(_utter_fail_element);
    
    _utter_fail_element = null;
};

var _removeNotification = function (notification_div) {
    return function () {
        notification_div.parentElement.removeChild(notification_div);
    };
};

var _hideNotification = function (notification_div) {
    return function () {
        notification_div.classList.add("fs-opacity-transition");
        notification_div.classList.add("fs-transparent");
        
        window.setTimeout(_removeNotification(notification_div), 2000);
    };
};

var _notification = function (message, duration_ms) {
    var notification_div = document.createElement('div');
    
    notification_div.innerHTML = message;
    
    if (duration_ms === undefined) {
        duration_ms = 1500;
    }
    
    if (_fail_element.innerHTML !== "") {
        notification_div.classList.add("fs-text-align-right");
    }
    
    _notification_element.appendChild(notification_div);

    window.setTimeout(_hideNotification(notification_div), duration_ms);
};

/***********************************************************
    Init.
************************************************************/

_utter_fail_element.innerHTML = "";
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
        _osc_infos = document.getElementById("fs_osc_infos"),
        _poly_infos_element = document.getElementById("fs_polyphony_infos"),

        _haxis_infos = document.getElementById("fs_haxis_infos"),
        _vaxis_infos = document.getElementById("fs_vaxis_infos"),

        _canvas_container = document.getElementById("canvas_container"),
        _canvas = document.createElement("canvas"),
        
        _record_canvas = document.getElementById("fs_record_canvas"),
        _record_canvas_ctx = _record_canvas.getContext('2d'),
        _record_slice_image,
        _record_position = 0,
        _record = false,
        _record_opts = {
            additive: false
        },

        _canvas_width  = 1024,
        _canvas_height = 439,//Math.round(window.innerHeight / 2) - 68,

        _canvas_width_m1 = _canvas_width - 1,
        _canvas_height_mul4 = _canvas_height * 4,

        _render_width = _canvas_width,
        _render_height = _canvas_height,
        
        _feedback = {
            enabled: true,
            pframe: [],
            index: 0,
            program: null,
            texture: null
        },

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
            mode: "text/x-glsl",
            extraKeys: {
                "F11": function (cm) {
                    cm.setOption("fullScreen", !cm.getOption("fullScreen"));
                },
                "Esc": function (cm) {
                    if (cm.getOption("fullScreen")) {
                        cm.setOption("fullScreen", false);
                    }
                }
            }
        },
        
        _code_editor_extern = false,
        
        _detached_code_editor_window,
        
        // this is the amount of free uniform vectors for Fragment regular uniforms and session custom uniforms
        // this is also used to assign uniform vectors automatically for polyphonic uses
        // if the GPU cannot have that much uniforms (with polyphonic uses), this will be divided by two and the polyphonic computation will be done again
        // if the GPU cannot still have that much uniforms (with polyphonic uses), there will be a polyphony limit of 16 notes, this is a safe limit for all devices nowaday
        _free_uniform_vectors = 320,
        
        // note-on/note-off related stuff (MIDI keyboard etc.)
        _keyboard = {
            data: [],
            data_components: 4,
            // polyphonic capabilities is set dynamically from MAX_FRAGMENT_UNIFORM_VECTORS parameter
            // ~221 MAX_FRAGMENT_UNIFORM_VECTORS value will be generally the default for desktop
            // this permit a polyphony of ~60 notes with 4 components for each notes and by considering the reserved uniform vectors
            // all this is limited by the MAX_FRAGMENT_UNIFORM_VECTORS parameter on the GPU taking into account the other Fragment uniform PLUS sessions uniform
            // at the time of this comment in 2017, 99.9% of desktop devices support up to 221 uniform vectors while there is a 83.9% support for up to 512 uniform vectors,
            // this amount to ~192 notes polyphony, a capability of 1024 lead to ~704 notes polyphony and so on...
            data_length: 60 * 4,
            // amount of allocated uniform vectors
            uniform_vectors: 0,
            pressed: {},
            polyphony_max: 60,
            polyphony: 0 // current polyphony
        },
        
        _webgl = {
            max_fragment_uniform_vector: -1
        },

        _compile_timer,

        _undock_code_editor = false,

        _xyf_grid = false,

        _glsl_error = false,
        
        // settings
        _show_globaltime = true,
        _show_oscinfos = false,
        _show_polyinfos = false,
        _show_slicebar = true,
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
        _gl2 = false,
        
        _pbo = null,

        _play_position_markers = [],

        _webgl_opts = {
                preserveDrawingBuffer: true,
                antialias: true,
                depth: false
            },

        _prev_data = [],
        _temp_data = new Uint8Array(_canvas_height_mul4),
        _data = [],
        _output_channels = 1,

        _analysis_canvas,
        _analysis_canvas_ctx,
        
        _analysis_canvas_tmp,
        _analysis_canvas_tmp_ctx,
        
        _analysis_log_scale = true,
        _analysis_colored = true,
        _analysis_speed = 2,
        
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

/*
    Client global configuration file
    
    This file is generated by a production system and filled with the correct settings (aka. domain where fss/fsdb is and the protocol used)
*/

var _ws_protocol = "ws",
    _domain = "127.0.0.1";/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _FS_WAVETABLE = 0,
    _FS_OSC_NODES = 1,
    
    _audio_context = new window.AudioContext(),
    
    _analyser_node = _audio_context.createAnalyser(),
    _analyser_fftsize = 16384,
    _analyser_freq_bin,
    
    _sample_rate = _audio_context.sampleRate,
    
    _volume = 0.05,

    // wavetable
    _wavetable_size = 4096,
    _wavetable = (function (wsize) {
            var wavetable = new Float32Array(wsize),

                wave_phase = 0,
                wave_phase_step = 2 * Math.PI / wsize,

                s = 0;

            for (s = 0; s < wsize; s += 1) {
                wavetable[s] = Math.sin(wave_phase);

                wave_phase += wave_phase_step;
            }

            return wavetable;
        })(_wavetable_size),
    
    _osc_mode = _isFireFox() ? _FS_WAVETABLE : _FS_OSC_NODES,
    _osc_fadeout = 0.25,
    
    _oscillators,
    
    _stop_oscillators_timeout,

    _periodic_wave = [],
    _periodic_wave_n = 16,

    _note_time = 1 / _fps,
    _note_time_samples = Math.round(_note_time * _sample_rate),
    
    _lerp_t_step = 1 / _note_time_samples,

    _notes_worker = new Worker("dist/worker/notes_buffer.min.js"),
    _notes_worker_available = true,
    
    _curr_notes_data = [],
    _next_notes_data = [],
    
    _curr_sample = 0,
        
    _lerp_t = 0,
    
    _data_switch = false,
    
    _audio_infos = { 
            h: 0,
            base_freq: 0,
            octaves: 0,
            gain: _volume,
            monophonic: false
        },
    
    _is_script_node_connected = false,
    _is_analyser_node_connected = false,
    
    _mst_gain_node,
    _script_node;

/***********************************************************
    Functions.
************************************************************/

var _createGainNode = function (dst, channel) {
    var gain_node = _audio_context.createGain();
    gain_node.gain.value = 0.0;
    if (channel) {
        gain_node.connect(dst, 0, channel);
    } else {
        gain_node.connect(dst);
    }

    return gain_node;
};

var _createMergerNode = function (dst) {
    var merger_node = _audio_context.createChannelMerger(2);
    merger_node.connect(dst);

    return merger_node;
};

var _getOscillator = function (y) {
    if (y >= _oscillators.length || y < 0) {
        return null;
    }
        
    return _oscillators[y];
};

var _getFrequency = function (y) {
    var osc = _getOscillator(y);
    
    if (!osc) {
        return null;
    }
        
    return osc.freq;
};

var _generatePeriodicWaves = function (n) {
    var real   = new Float32Array(2),
        imag   = new Float32Array(2),
        a1     = 0.0,
        b1     = 1.0,
        offset = 0.0,
        step   = 1.0 / n,
        i      = 0;
    
    _periodic_wave = [];
    
    for (i = 0; i <= n; i += 1) {
        offset = 2 * Math.PI * (step * i);
        real[1] = a1 * Math.cos(offset) - b1 * Math.sin(offset);
        imag[1] = a1 * Math.sin(offset) + b1 * Math.cos(offset);

        _periodic_wave.push(_audio_context.createPeriodicWave(real, imag));
    }
    
    _periodic_wave_n = n - 1;
};

var _generateOscillatorSet = function (n, base_frequency, octaves) {
    var y = 0,
        frequency = 0.0,
        phase_step = 0.0,
        merger_node = null,
        gain_node_l = null,
        gain_node_r = null,
        octave_length = n / octaves,
        osc_obj;
    
    if (_oscillators) {
        for (y = 0; y < _oscillators.length; y += 1) {
            osc_obj = _oscillators[y];

            osc_obj.merger_node.disconnect(_mst_gain_node);
            osc_obj.node.stop();
        }
    }

    _oscillators = [];

    for (y = n; y >= 0; y -= 1) {
        frequency = base_frequency * Math.pow(2, y / octave_length);
        phase_step = frequency / _audio_context.sampleRate * _wavetable_size;
        
        merger_node = _createMergerNode(_mst_gain_node);
        gain_node_l = _createGainNode(merger_node, 0);
        gain_node_r = _createGainNode(merger_node, 1);

        var osc = {
            freq: frequency,
            
            // WebAudio periodic waves
            gain_node_l: gain_node_l,
            gain_node_r: gain_node_r,
            merger_node: merger_node,
            period: 1.0 / frequency,
            gain_l: 0,
            gain_r: 0,
            node: null,
            used: false,

            // wavetable
            phase_index: Math.random() * _wavetable_size, 
            phase_step: phase_step
        };
        
        osc.node = _audio_context.createOscillator();
        osc.node.setPeriodicWave(_periodic_wave[Math.round(Math.random() * _periodic_wave_n)]);
        osc.node.frequency.value = osc.freq;
        osc.node.connect(osc.gain_node_l);
        osc.node.connect(osc.gain_node_r);
        osc.node.start();
        
        _oscillators.push(osc);
    }
    
    _audio_infos.h = n;
    _audio_infos.base_freq = base_frequency;
    _audio_infos.octaves = octaves;
};

var _stopOscillatorsCheck = function () {
    var osc = null,
        r = 0,
        l = 0,
        i = 0;
    
    for (i = 0; i < _oscillators.length; i += 1) {
        osc = _oscillators[i];
        if (osc.node) {
            r += osc.gain_node_r.gain.value;
            l += osc.gain_node_l.gain.value;
        }
    }
    
    if (r < 0.05 && l < 0.05) { // this may be unsafe!
        for (i = 0; i < _oscillators.length; i += 1) {
            osc = _oscillators[i];
            if (osc.node) {
                osc.node.stop(_audio_context.currentTime);
                osc.node.disconnect();
                osc.used = false;
            }
        }
    } else {
        window.clearTimeout(_stop_oscillators_timeout);
        _stop_oscillators_timeout = window.setTimeout(_stopOscillatorsCheck, 2000);
    }
};

var _stopOscillators = function () {
    var osc = null,
        audio_ctx_curr_time = _audio_context.currentTime,
        i = 0;
    
    for (i = 0; i < _oscillators.length; i += 1) {
        osc = _oscillators[i];
        if (osc.node) {
            osc.gain_node_l.gain.setTargetAtTime(0.0, audio_ctx_curr_time, _osc_fadeout);
            osc.gain_node_r.gain.setTargetAtTime(0.0, audio_ctx_curr_time, _osc_fadeout);
        }
    }
    
    // osc. gain values will be checked to stop them cleanly
    //window.clearTimeout(_stop_oscillators_timeout);
    //_stop_oscillators_timeout = window.setTimeout(_stopOscillatorsCheck, 2000);
};

var _onOscillatorEnded = function () {
    this.node = null;
};

// this was used to allocate web audio oscillators dynamically, this was disabled because it seem unecessary, the browser seem to do it internally
// NOTE : it introduced memory leaks
var _playOscillator = function (osc_obj, ts) {
    var osc_node;
    
    if (!osc_obj.used) {
        osc_node = _audio_context.createOscillator();
        
        osc_obj.node = osc_node;

        osc_node.setPeriodicWave(_periodic_wave[Math.round((ts % osc_obj.period) / osc_obj.period * _periodic_wave_n)]);

        osc_node.frequency.value = osc_obj.freq;

        osc_node.connect(osc_obj.gain_node_l);
        osc_node.connect(osc_obj.gain_node_r);
        osc_node.onended = _onOscillatorEnded;

        osc_node.start();
        
        osc_obj.used = true;
    }
};

var _playSlice = function (pixels_data) {
    var data_length = pixels_data.length,
        audio_ctx_curr_time = _audio_context.currentTime,
        time_samples = audio_ctx_curr_time * _audio_context.sampleRate,
        osc = null,
        l = 0,
        r = 0,
        y = _oscillators.length - 1,
        li = 0,
        ri = 1,
        i = 0;
    
    if (_audio_infos.monophonic) {
        li = 3;
        ri = 3;
    }
    
    for (i = 0; i < data_length; i += 4) {
        l = pixels_data[i + li];
        r = pixels_data[i + ri];
        osc = _oscillators[y];
        
        if (l === 0) {
            osc.gain_node_l.gain.setTargetAtTime(0.0, audio_ctx_curr_time, _osc_fadeout);
        } else {
            osc.gain_node_l.gain.setTargetAtTime(l / 255.0, audio_ctx_curr_time, _osc_fadeout);
        }
        
        if (r === 0) {
            osc.gain_node_r.gain.setTargetAtTime(0.0, audio_ctx_curr_time, _osc_fadeout);
        } else {
            osc.gain_node_r.gain.setTargetAtTime(r / 255.0, audio_ctx_curr_time, _osc_fadeout);
        }
        y -= 1;
    }
};

var _notesWorkerAvailable = function () {
    return _notes_worker_available;
};

var _notesProcessing = function (arr, prev_arr) {   
    var worker_obj,
        
        i = 0;
    
    if (_osc_mode === _FS_WAVETABLE) {
        if (_notes_worker_available) {
            _notes_worker.postMessage({
                    score_height: _canvas_height,
                    data: arr.buffer,
                    prev_data: prev_arr.buffer,
                    mono: _audio_infos.monophonic
                }, [arr.buffer, prev_arr.buffer]);

            _notes_worker_available = false;
        }
    } else if (_osc_mode === _FS_OSC_NODES) {
        _playSlice(arr);
    }
};

var _audioProcess = function (audio_processing_event) {
    var output_buffer = audio_processing_event.outputBuffer,

        output_data_l = output_buffer.getChannelData(0),
        output_data_r = output_buffer.getChannelData(1),

        output_data_length = output_data_l.length,

        output_l = 0, output_r = 0,

        wavetable = _wavetable,
        wavetable_size_m1 = _wavetable_size - 1,

        note_buffer = _curr_notes_data,
        note_buffer_len = note_buffer.length,// = note_buffer[0],

        osc,

        lerp_t_step = _lerp_t_step,
        
        lerp_t = _lerp_t,
        
        curr_sample = _curr_sample,

        sample,

        s, j, i;

    for (sample = 0; sample < output_data_length; sample += 1) {
        output_l = 0.0;
        output_r = 0.0;

        for (j = 0; j < note_buffer_len; j += 5) {
            var osc_index         = note_buffer[j],
                previous_volume_l = note_buffer[j + 1],
                previous_volume_r = note_buffer[j + 2],
                diff_volume_l     = note_buffer[j + 3],
                diff_volume_r     = note_buffer[j + 4];

            osc = _oscillators[osc_index];

            s = wavetable[osc.phase_index & wavetable_size_m1];
            
            output_l += (previous_volume_l + diff_volume_l * lerp_t) * s;
            output_r += (previous_volume_r + diff_volume_r * lerp_t) * s;

            osc.phase_index += osc.phase_step;

            if (osc.phase_index >= _wavetable_size) {
                osc.phase_index -= _wavetable_size;
            }
        }

        output_data_l[sample] = output_l;
        output_data_r[sample] = output_r;

        lerp_t += _lerp_t_step;

        curr_sample += 1;

        if (curr_sample >= _note_time_samples) {
            _lerp_t_step = 0;
            
            curr_sample = 0;
            
            if (_data_switch) {
                lerp_t = 0;
                _lerp_t = 0;
                
                _lerp_t_step = 1 / _note_time_samples;
                
                _curr_notes_data = new Float32Array(_next_notes_data);
                
                _data_switch = false;
            }
        }
    }

    _lerp_t = lerp_t;
    
    _curr_sample = curr_sample;
};

var _connectAnalyserNode = function () {
    if (!_is_analyser_node_connected) {
        _mst_gain_node.connect(_analyser_node);
        
        _is_analyser_node_connected = true;
    }
}

var _disconnectAnalyserNode = function () {
    if (_is_analyser_node_connected) {
        _mst_gain_node.disconnect(_analyser_node);
        
        _is_analyser_node_connected = false;
    }
};

var _connectScriptNode = function () {
    if (_script_node && !_is_script_node_connected) {
        _script_node.connect(_mst_gain_node);
        
        _is_script_node_connected = true;
    }
};

var _disconnectScriptNode = function () {
    if (_script_node && _is_script_node_connected) {
        _script_node.disconnect(_mst_gain_node);

        _is_script_node_connected = false;
    }
};

var _setGain = function (gain_value) {
    _volume = gain_value;

    if (_mst_gain_node) {
        if (_volume) {
            _mst_gain_node.gain.value = parseFloat(_volume);
        } else {
            _mst_gain_node.gain.value = 0;
        }
    }
    
    _audio_infos.gain = _volume;  
};

var _disableNotesProcessing = function () {
    _notes_worker_available = false;
    
    _curr_notes_data = [];
};

var _enableNotesProcessing = function () {
    _notes_worker_available = true;
};

var _computeOutputChannels = function () {
    var i = 0, max = 0, marker;
    
    for (i = 0; i < _play_position_markers.length; i += 1) {
        marker = _play_position_markers[i];
        
        if (max < marker.output_channel) {
            max = marker.output_channel
        }
    }
    
    _output_channels = max;
    _allocateFramesData();
};

var _decodeAudioData = function (audio_data, done_cb) {
    _audio_context.decodeAudioData(audio_data, function (buffer) {
            done_cb(buffer);
        },
        function (e) {
            _notification("An error occured while decoding the audio data " + e.err);
        });
};

/*
var _getByteFrequencyData = function (pixels_data) {
    var i = 0,
        f = 0,
        y = 0,
        index = 0,
        d = new Uint8Array(_analyser_node.frequencyBinCount);
    
    for (i = 0; i < pixels_data.length; i += 4) {
        f = _getFrequency(y);

        index = Math.round(f / _sample_rate * _analyser_node.frequencyBinCount);
        d[index] += (pixels_data[i] + pixels_data[i + 1]) / 2;
        
        y += 1;
    }
        
    return d;
};
*/

/***********************************************************
    Init.
************************************************************/

var _audioInit = function () {
    _mst_gain_node = _createGainNode(_audio_context.destination);
    _setGain(_volume);
    
    _generatePeriodicWaves(16);
    _generateOscillatorSet(_canvas_height, 16.34, 10);

    _script_node = _audio_context.createScriptProcessor(0, 0, 2);
    _script_node.onaudioprocess = _audioProcess;

    if (!_fasEnabled() && _osc_mode === _FS_WAVETABLE) {
        _script_node.connect(_mst_gain_node);
        
        _is_script_node_connected = true;
    }

    _analyser_node.smoothingTimeConstant = 0;
    _analyser_node.fftSize = _analyser_fftsize;
    _analyser_freq_bin = new Uint8Array(_analyser_node.frequencyBinCount);

    // workaround, webkit bug ?
    //window._fs_sn = _script_node;

    _notes_worker.addEventListener('message', function (w) {
            _next_notes_data = w.data.d;

            _notes_worker_available = true;

            _data_switch = true;
        }, false);
};
/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/



/***********************************************************
    Functions.
************************************************************/

var _imageProcessingDone = function (mdata) {
    var tmp_canvas = document.createElement('canvas'),
        tmp_canvas_context = tmp_canvas.getContext('2d'),
        
        image_data = tmp_canvas_context.createImageData(mdata.img_width, mdata.img_height),
        
        image_element;
    
    image_data.data.set(new Uint8ClampedArray(mdata.data));

    tmp_canvas.width  = image_data.width;
    tmp_canvas.height = image_data.height;

    tmp_canvas_context.putImageData(image_data, 0, 0);

    image_element = document.createElement("img");
    image_element.src = tmp_canvas.toDataURL();
    image_element.width = image_data.width;
    image_element.height = image_data.height;

    image_element.onload = function () {
        image_element.onload = null;
        
        _addFragmentInput("image", image_element);
    };
};

var _loadImageFromFile = function (file) {
    var img = new Image(),
        
        tmp_canvas = document.createElement('canvas'),
        tmp_canvas_context = tmp_canvas.getContext('2d'),
        
        tmp_image_data;
    
    img.onload = function () {
        tmp_canvas.width  = img.naturalWidth;
        tmp_canvas.height = img.naturalHeight;

        tmp_canvas_context.translate(0, tmp_canvas.height);
        tmp_canvas_context.scale(1, -1);
        tmp_canvas_context.drawImage(img, 0, 0, tmp_canvas.width, tmp_canvas.height);

        tmp_image_data = tmp_canvas_context.getImageData(0, 0, tmp_canvas.width, tmp_canvas.height);

        _imageProcessor(tmp_image_data, _imageProcessingDone);
        
        img.onload = null;
        img = null;
    };
    img.src = window.URL.createObjectURL(file);
};/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _image_to_audio_worker = new Worker("dist/worker/image_to_audio.min.js");

/***********************************************************
    Functions.
************************************************************/

var _exportImage = function (image_data) {
    var data = new Uint8ClampedArray(image_data.data),
        
        params = {
            image_width: image_data.width,
            image_height: image_data.height,
            max_freq: _oscillators[0].freq,
            note_time: _getNoteTime(120, 16),
            sample_rate: _sample_rate,
            data: data
        };
    
    _notification("Export in progress...", 2000);

    _image_to_audio_worker.postMessage(params, [params.data.buffer]);
};

_image_to_audio_worker.addEventListener('message', function (m) {
        console.log(m);
    }, false);/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _audio_to_image_worker = new Worker("dist/worker/audio_to_image.js"),
    
    _audio_import_settings = {
        window_length: 8192,
        window_type: "hann",
        overlap: 4,
        bpm: 60,
        ppb: 12,
        height: 0,
        minfreq: 0,
        maxfreq: 0
    };

/***********************************************************
    Functions.
************************************************************/

var _convertAudioToImage = function (data) {
    var l = data.getChannelData(0).buffer,
        r = ((data.numberOfChannels > 1) ? data.getChannelData(1).buffer : null),
        
        params = {
            settings: JSON.parse(JSON.stringify(_audio_import_settings)),
            left: l,
            right: r,
            note_time: _getNoteTime(_audio_import_settings.bpm, _audio_import_settings.ppb),
            sample_rate: _sample_rate
        },
        
        barr = [l];
    
    if (_audio_import_settings.height <= 0) {
        params.settings.height = _canvas_height;
    }
    
    if (_audio_import_settings.minfreq <= 0) {
        params.settings.minfreq = _oscillators[_oscillators.length - 1].freq;
    }
    
    if (_audio_import_settings.maxfreq <= 0) {
        params.settings.maxfreq = _oscillators[0].freq;
    }
    
    if (r) {
        barr.push(r);
    }
    
    _notification("STFT in progress...", 2000);

    _audio_to_image_worker.postMessage(params, barr);
};

var _loadAudioFromFile = function (file) {
    var reader = new FileReader();

    reader.onload = function (e) {
        _decodeAudioData(e.target.result, _convertAudioToImage);
    };

    reader.onerror = function (e) {
        var error = e.target.error;
        switch(error.code) {
            case error.NOT_FOUND_ERR:
                _notification("File '" + file.name + " not found.");
                break;

            case error.NOT_READABLE_ERR:
                _notification("File '" + file.name + " not readable.");
                break;

            case error.ABORT_ERR:
                _notification("File '" + file.name + " operation was aborted.");
                break; 

            case error.SECURITY_ERR:
                _notification("File '" + file.name + " is in a locked state.");
                break;

            case error.ENCODING_ERR:
                _notification("File '" + file.name + " encoding took too long.");
                break;

            default:
                _notification("File '" + file.name + " cannot be loaded.");
        }
    };
    
    reader.onprogress = function (e) {
        var percent = 0;
        
        if (e.lengthComputable) {
            percent = Math.round((e.loaded * 100) / e.total);

            _notification("loading '" + file.name + "' " + percent + "%.");
        }
    };

    reader.readAsArrayBuffer(file);
};

_audio_to_image_worker.addEventListener('message', function (m) {
        if (m.data !== Object(m.data)) {
            if ((typeof m.data) === "string") {
                _notification(m.data, 10000);
            } else {
                _notification("Audio file conversion in progress : " + m.data + "%");
            }
            return;
        }
    
        var image_data = {
                width: m.data.width,
                height: m.data.height,
                data: {
                    buffer: m.data.pbuffer
                }
            };

        // now image processing step...
        _imageProcessor(image_data, _imageProcessingDone);
    
        _notification("Audio file converted to " + image_data.width + "x" + image_data.height + "px image.")
    }, false);/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _import_dropzone_elem = document.getElementById("fs_import_dropzone");

/***********************************************************
    Functions.
************************************************************/

var _fileChoice = function (cb) {
    var input = document.createElement("input");
    input.type = "file";
    input.addEventListener("change", cb, false);
    input.click();
};

var _loadFile = function (type) {
    return function (e) {
        if (e === undefined) {
            _fileChoice(_loadFile(type));

            return;
        }

        var target = e.target,

            files = target.files, 
            file = files[0];

        if (files.length === 0) {
            return;
        }

        if (file.type.match(type + '.*')) {
            if (type === "image") {
                _loadImageFromFile(file);
            } else if (type === "audio") {
                _loadAudioFromFile(file);
            } else {
                _notification("Could not load the file '" + file.name + "', the filetype is unknown.");
            }
        } else {
            _notification("Could not load the file '" + file.name + "' as " + type + ".");
        }

        target.removeEventListener("change", _loadFile, false);
    }
};

/***********************************************************
    Init.
************************************************************/

_import_dropzone_elem.addEventListener("drop", function (e) {
    e.preventDefault();
    
    var data = e.dataTransfer,
        
        file,
        
        i = 0;
    
    for (i = 0; i < data.files.length; i += 1) {
        file = data.files[i];
        
        if (file.type.match('image.*')) {
            _loadImageFromFile(file);
        } else if (file.type.match('audio.*')) {
            _loadAudioFromFile(file);
        } else {
            _notification("Could not load the file '" + file.name + "', the filetype is unknown.");
        }
    }
    
    e.target.style = "";
});

_import_dropzone_elem.addEventListener("dragleave", function (e) {
    e.preventDefault();
    
    e.target.style = "";
});

_import_dropzone_elem.addEventListener("dragover", function (e) {
    e.preventDefault();
    
    e.dataTransfer.dropEffect = "copy";
});

_import_dropzone_elem.addEventListener("dragenter", function (e) {
    e.preventDefault();
    
    e.target.style = "outline: dashed 1px #00ff00; background-color: #444444";
});/* jslint browser: true */

var _buildScreenAlignedQuad = function() {
    var position;

    _quad_vertex_buffer = _gl.createBuffer();

    _gl.bindBuffer(_gl.ARRAY_BUFFER, _quad_vertex_buffer);
    _gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), _gl.STATIC_DRAW);
};

var _createFramebuffer = function (texture) {
    var framebuffer = _gl.createFramebuffer();

    _gl.bindTexture(_gl.TEXTURE_2D, texture);
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);
    _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, texture, 0);
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);
    
    return framebuffer;
};

var _create2DTexture = function (image, default_wrap_filter, bind_now) {
    var new_texture = _gl.createTexture();

    _gl.bindTexture(_gl.TEXTURE_2D, new_texture);

    if (!default_wrap_filter) {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);

        if ((!_isPowerOf2(image.width) || !_isPowerOf2(image.height)) && !_gl2) {
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);

            _notification("Non-power-of-2 image added, wrap mode is 'clamp' only.", 4000);
        }
    }

    if (image.empty) {
        _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, image.width, image.height, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, null);
    } else {
        if (bind_now) {
            _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, _gl.RGBA, _gl.UNSIGNED_BYTE, image);
        }
    }

    _gl.bindTexture(_gl.TEXTURE_2D, null);

    return { image: image, texture: new_texture };
};

var _replace2DTexture = function (image, texture) {
    var data,

        filter_tex_parameter,
        filter_wrap_s_parameter,
        filter_wrap_t_parameter;
    
    _gl.bindTexture(_gl.TEXTURE_2D, texture);
    
    filter_tex_parameter = _gl.getTexParameter(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER);
    filter_wrap_s_parameter = _gl.getTexParameter(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S);
    filter_wrap_t_parameter = _gl.getTexParameter(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T);

    _gl.deleteTexture(texture);

    data = _create2DTexture(image, true, true);

    _gl.bindTexture(_gl.TEXTURE_2D, data.texture);

    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, filter_tex_parameter);
    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, filter_tex_parameter);
    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, filter_wrap_s_parameter);
    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, filter_wrap_t_parameter);

    _gl.bindTexture(_gl.TEXTURE_2D, null);

    return data.texture;
};

var _setTextureFilter = function (texture, mode) {
    _gl.bindTexture(_gl.TEXTURE_2D, texture);

    if (mode === "nearest") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.NEAREST);
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.NEAREST);
    } else if (mode === "linear") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
    }

    _gl.bindTexture(_gl.TEXTURE_2D, null);
};

var _setTextureWrapS = function (texture, mode) {
    _gl.bindTexture(_gl.TEXTURE_2D, texture);
    
    if (mode === "clamp") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
    } else if (mode === "repeat") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.REPEAT);
    } else if (mode === "mirror") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.MIRRORED_REPEAT);
    }

    _gl.bindTexture(_gl.TEXTURE_2D, null);
};

var _setTextureWrapT = function (texture, mode) {
    _gl.bindTexture(_gl.TEXTURE_2D, texture);
    
    if (mode === "clamp") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
    } else if (mode === "repeat") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.REPEAT);
    } else if (mode === "mirror") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.MIRRORED_REPEAT);
    }

    _gl.bindTexture(_gl.TEXTURE_2D, null);
};

var _flipTexture = function (texture, image) {
    var tmp_canvas = document.createElement('canvas'),
        tmp_canvas_context = tmp_canvas.getContext('2d');
    
    tmp_canvas.width  = image.naturalWidth;
    tmp_canvas.height = image.naturalHeight;
    
    tmp_canvas_context.translate(0, tmp_canvas.height);
    tmp_canvas_context.scale(1, -1);

    tmp_canvas_context.drawImage(image, 0, 0);

    image.src = tmp_canvas.toDataURL();
    
    return _replace2DTexture(image, texture);
};

var _flipYTexture = function (texture, flip) {
    _gl.bindTexture(_gl.TEXTURE_2D, texture);
    _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, flip);
    _gl.bindTexture(_gl.TEXTURE_2D, null);
};

var _buildFeedback = function () {
    var i = 0, frame;
    
    if (_feedback.enabled) {
        if (_feedback.program) {
            _gl.deleteProgram(_program);
        }
        
        _feedback.program = _createAndLinkProgram(
                _createShader(_gl.VERTEX_SHADER, document.getElementById("vertex-shader").text),
                _createShader(_gl.FRAGMENT_SHADER, [
                    "precision mediump float;",
                    "uniform vec2 resolution;",
                    "uniform sampler2D texture;",
                    "void main () {",
                    "    vec2 uv = gl_FragCoord.xy / resolution;",
                    "    vec4 c = texture2D(texture, uv);",
                    "    gl_FragColor = c;",
                    "}"].join(""))
            );
        
        if (!_feedback.program) {
            _feedback.enabled = false;
            
            _notification("Could not enable feedback feature.");
            
            return;
        }
        
        _useProgram(_feedback.program);
        _gl.uniform2f(_gl.getUniformLocation(_feedback.program, "resolution"), _canvas.width, _canvas.height);
        
        for (i = 0; i < _feedback.pframe.length; i += 1) {
            frame = _feedback.pframe[i];
            
            if (frame.data) {
                if (frame.data.texture) {
                    _gl.deleteTexture(frame.data.texture);
                }
            }

            if (frame.buffer) {
                _gl.deleteFramebuffer(frame.buffer);
            }
        }
        
        _feedback.pframe[0] = { data: null, buffer: null };
        _feedback.pframe[1] = { data: null, buffer: null };
        
        _feedback.pframe[0].data = _create2DTexture({ width: _canvas.width, height: _canvas.height, empty: true });
        _feedback.pframe[0].buffer = _createFramebuffer(_feedback.pframe[0].data.texture);
        
        _feedback.pframe[1].data = _create2DTexture({ width: _canvas.width, height: _canvas.height, empty: true });
        _feedback.pframe[1].buffer = _createFramebuffer(_feedback.pframe[1].data.texture);
    }
    
    _compile();
};

var _transformData = function (slice_obj, data) {
    var offset = 0,
        
        i = 0,
        
        j = 0;
    
    if (slice_obj.shift > 0) {
        offset = slice_obj.shift * 4;
        
        data.copyWithin(offset, 0, _canvas_height_mul4 - offset);
        
        for (i = 0; i < offset; i += 1) {
            data[i] = 0;
        }
    } else if (slice_obj.shift < 0) {
        offset = -slice_obj.shift * 4;
        
        data.copyWithin(0, offset, _canvas_height_mul4 - offset);
        
        for (i = (_canvas_height_mul4 - offset); i < _canvas_height_mul4; i += 1) {
            data[i] = 0;
        }
    }
};

var _drawTimeDomainSpectrum = function () {
    var times = new Uint8Array(_analyser_node.frequencyBinCount),
        bar_width = _analysis_canvas.width / times.length,
        value = 0,
        bar_height = 0,
        i = 0;
    
    _analyser_node.getByteTimeDomainData(times);

    _analysis_canvas_ctx.fillStyle = 'black';
    
    for (i = 0; i < times.length; i += 1) {
        bar_height = _analysis_canvas.height * (times[i] / 256);

        _analysis_canvas_ctx.fillRect(i * bar_width, _analysis_canvas.height - bar_height - 1, 1, 1);
    }
};

var _drawSpectrum = function () {
    if (_is_analyser_node_connected) {
        var freq_bin_length,
            px_index = 0,
            value = 0,
            index = 0,
            y = 0,
            i = 0;
    
        if (!_fas.enabled) {
            _analyser_node.getByteFrequencyData(_analyser_freq_bin);
        } else { // TEMPORARY
            return;
        }
        
        freq_bin_length = _analyser_freq_bin.length;

        _analysis_canvas_tmp_ctx.drawImage(_analysis_canvas, 0, 0, _analysis_canvas.width, _analysis_canvas.height);

        for (i = 0; i < freq_bin_length; i += 1) {
            if (_fas.enabled) {
                //index = (_getFrequency(i) / _sample_rate * _analyser_freq_bin.length);
                
                px_index = Math.round(_getFrequency(i) / _sample_rate * _canvas_height) * 4;
                value = Math.round((_data[px_index] + _data[px_index + 1]) / 2);
            } else {
                if (_analysis_log_scale) {
                    value = _analyser_freq_bin[_logScale(i, freq_bin_length)];
                } else {
                    value = _analyser_freq_bin[i];
                } 
            }
            
            y = Math.round(i / freq_bin_length * _analysis_canvas.height);
            
            if (_analysis_colored) {
                _analysis_canvas_ctx.fillStyle = _spectrum_colors[value];
            } else {
                value = (255 - value) + '';
                _analysis_canvas_ctx.fillStyle = 'rgb(' + value + ',' + value + ',' + value + ')';
            }
            
            _analysis_canvas_ctx.fillRect(_analysis_canvas.width - _analysis_speed, _analysis_canvas.height - y, _analysis_speed, _analysis_speed);
        }

        _analysis_canvas_ctx.translate(-_analysis_speed, 0);
        _analysis_canvas_ctx.drawImage(_analysis_canvas, 0, 0, _analysis_canvas.width, _analysis_canvas.height, 0, 0, _analysis_canvas.width, _analysis_canvas.height);

        _analysis_canvas_ctx.setTransform(1, 0, 0, 1, 0, 0);
    }  
};

var _allocateFramesData = function () {
    var i = 0;
    
    _data = [];
    _prev_data = [];
    
    for (i = 0; i < _output_channels; i += 1) {
        _data.push(new Uint8Array(_canvas_height_mul4));
        _prev_data.push(new Uint8Array(_canvas_height_mul4));
    }
};

var _frame = function (raf_time) {
    var i = 0, j = 0, o = 0,

        play_position_marker,
        play_position_marker_x = 0,
        
        fsas_data,
        
        fragment_input,
        
        current_frame,
        previous_frame,
        
        time_now = performance.now(),
        
        global_time = (raf_time - _time) / 1000,
        
        iglobal_time,

        date = new Date(),

        channel = 0,
        channel_data,
        
        fas_enabled = _fasEnabled(),
        
        f, v, key,
        
        data, data2,
        
        buffer = [];

    // update notes time
    for (key in _keyboard.pressed) { 
        v = _keyboard.pressed[key];

        _keyboard.data[i + 2] = (date - v.time) / 1000;

        i += _keyboard.data_components;

        if (i > _keyboard.data_length) {
            break;
        }
    }
    
    if (_feedback.enabled) {
        current_frame = _feedback.pframe[_feedback.index];
        previous_frame = _feedback.pframe[(_feedback.index + 1) % 2];
        
        _gl.bindFramebuffer(_gl.FRAMEBUFFER, current_frame.buffer);
        _gl.viewport(0, 0, _canvas_width, _canvas_height);
        
        _useProgram(_program);
        
        o = _fragment_input_data.length;
        
        _gl.activeTexture(_gl.TEXTURE0 + o);
        _gl.bindTexture(_gl.TEXTURE_2D, previous_frame.data.texture);
        _gl.uniform1i(_getUniformLocation("pFrame", _program), o);
    }
    
    _gl.uniform4fv(_getUniformLocation("keyboard"), _keyboard.data);

    //_gl.useProgram(_program);
    _gl.uniform1f(_getUniformLocation("globalTime"), global_time);
    _gl.uniform1f(_getUniformLocation("octave"), _audio_infos.octaves);
    _gl.uniform1f(_getUniformLocation("baseFrequency"), _audio_infos.base_freq);
    _gl.uniform4f(_getUniformLocation("mouse"), _nmx, _nmy, _cnmx, _cnmy);
    _gl.uniform4f(_getUniformLocation("date"), date.getFullYear(), date.getMonth(), date.getDay(), date.getSeconds());

    // fragment inputs
    for (i = 0; i < _fragment_input_data.length; i += 1) {
        fragment_input = _fragment_input_data[i];

        if (fragment_input.type === 0) { // 2D texture from image
                _gl.activeTexture(_gl.TEXTURE0 + i);
                _gl.bindTexture(_gl.TEXTURE_2D, fragment_input.texture);
                _gl.uniform1i(_getUniformLocation(_input_channel_prefix + i), i);
        } else if (fragment_input.type === 1) { // camera
            if (fragment_input.video_elem.readyState === fragment_input.video_elem.HAVE_ENOUGH_DATA) {
                _gl.activeTexture(_gl.TEXTURE0 + i);
                _gl.bindTexture(_gl.TEXTURE_2D, fragment_input.texture);
                _gl.uniform1i(_getUniformLocation(_input_channel_prefix + i), i);

                _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, _gl.RGBA, _gl.UNSIGNED_BYTE, fragment_input.image);
            }
        }
    }

    //_gl.bindBuffer(_gl.ARRAY_BUFFER, _quad_vertex_buffer);
    _gl.drawArrays(_gl.TRIANGLE_STRIP, 0, 4);
    
    if (_feedback.enabled) {
        _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);
        _gl.viewport(0, 0, _canvas_width, _canvas_height);
        _useProgram(_feedback.program);
        
        _gl.activeTexture(_gl.TEXTURE0);
        _gl.bindTexture(_gl.TEXTURE_2D, current_frame.data.texture);
        _gl.uniform1i(_getUniformLocation("texture", _feedback.program), 0);
        
        _gl.drawArrays(_gl.TRIANGLE_STRIP, 0, 4);
        
        _feedback.index += 1;
        _feedback.index = _feedback.index % 2;
    }
    
    if ((_notesWorkerAvailable() || fas_enabled) && _play_position_markers.length > 0) {
        if (!fas_enabled) {
            _prev_data[0] = new Uint8Array(_data[0]);
        }
        
        if (_gl2) {
            _gl.bindBuffer(_gl.PIXEL_PACK_BUFFER, _pbo);
            _gl.bufferData(_gl.PIXEL_PACK_BUFFER, 1 * _canvas.height * 4, _gl.STATIC_READ);
        }

        // populate array first
        play_position_marker = _play_position_markers[0];
        
        channel = play_position_marker.output_channel - 1;
        
        if (play_position_marker.mute) {
            _data[channel] = new Uint8Array(_canvas_height_mul4);
        } else {
            if (play_position_marker.frame_increment != 0) {
                _setPlayPosition(play_position_marker.id, play_position_marker.x + play_position_marker.frame_increment, play_position_marker.y, false, true);
            }
            
            play_position_marker_x = play_position_marker.x;
            
            if (_gl2) {
                _gl.readPixels(play_position_marker_x, 0, 1, _canvas_height, _gl.RGBA, _gl.UNSIGNED_BYTE, 0);
                _gl.getBufferSubData(_gl.PIXEL_PACK_BUFFER, 0, _data[channel]);
            } else {
                _gl.readPixels(play_position_marker_x, 0, 1, _canvas_height, _gl.RGBA, _gl.UNSIGNED_BYTE, _data[channel]);
            }

            _transformData(play_position_marker, _data[channel]);
        }

        for (i = 1; i < _play_position_markers.length; i += 1) {
            play_position_marker = _play_position_markers[i];
            
            if (play_position_marker.mute) {
                continue;
            }
            
            if (play_position_marker.frame_increment != 0) {
                _setPlayPosition(play_position_marker.id, play_position_marker.x + play_position_marker.frame_increment, play_position_marker.y, false, true);
            }
            
            play_position_marker_x = play_position_marker.x;
            
            channel = play_position_marker.output_channel - 1;

            if (_gl2) {
                _gl.readPixels(play_position_marker_x, 0, 1, _canvas_height, _gl.RGBA, _gl.UNSIGNED_BYTE, 0);
                _gl.getBufferSubData(_gl.PIXEL_PACK_BUFFER, 0, _temp_data);
            } else {
                _gl.readPixels(play_position_marker_x, 0, 1, _canvas_height, _gl.RGBA, _gl.UNSIGNED_BYTE, _temp_data);
            }
     
            _transformData(play_position_marker, _temp_data);

            channel_data = _data[channel];

            // merge slices data
            for (j = 0; j <= _canvas_height_mul4; j += 1) {
                channel_data[j] = channel_data[j] + _temp_data[j];
            }
        }
    
        for (i = 0; i < _output_channels; i += 1) {
            buffer.push(new Uint8Array(/*_data[i]*/_canvas_height_mul4));
        }
        
        if (_show_oscinfos) {
            var arr_infos = [];
            for (j = 0; j < _output_channels; j += 1) {
                var c = 0;

                for (i = 0; i <= _canvas_height_mul4; i += 4) {
                    if (_data[j][i] > 0) {
                        c += 1;
                    } else if (_data[j][i + 1] > 0) {
                        c += 1;
                    }
                }

                arr_infos.push(c);
            }

            _osc_infos.innerHTML = arr_infos.join(" ");
        }
        
        if (_record) {
            _record_position += 1;
            if (_record_position > _canvas_width) {
                _record_position = 0;
            }
            
            if (_record_opts.additive) {
                data = _record_canvas_ctx.getImageData(_record_position, 0, 1, _record_canvas.height).data;
            } else {
                data = new Uint8ClampedArray(_canvas_height_mul4);
            }
            
            if (_audio_infos.monophonic) {
                for (j = 0; j < _output_channels; j += 1) {
                    for (i = 0; i <= _canvas_height_mul4; i += 4) {
                        o = _canvas_height_mul4 - i;
                        
                        data[o] += _data[j][i + 3];
                        data[o + 1] += _data[j][i + 3];
                        data[o + 2] += _data[j][i + 3];
                        data[o + 3] = 255;
                    }
                }
            } else {
                for (j = 0; j < _output_channels; j += 1) {
                    for (i = 0; i <= _canvas_height_mul4; i += 4) {
                        o = _canvas_height_mul4 - i;
                        
                        data[o] += _data[j][i];
                        data[o + 1] += _data[j][i + 1];
                        data[o + 2] += _data[j][i + 2];
                        data[o + 3] = 255;
                    }
                }
            }
            
            _record_slice_image.data.set(data);
            
            _record_canvas_ctx.putImageData(_record_slice_image, _record_position, 0);
        }
        
        if (fas_enabled) {
            _fasNotifyFast(_FAS_FRAME, _data);
        } else {
            _notesProcessing(_data[0], _prev_data[0]);
        }
        
        _data = buffer;
    }
    
    if (_show_globaltime) {
        iglobal_time = parseInt(global_time, 10);
        if (parseInt(_time_infos.innerHTML, 10) !== iglobal_time) {
            _time_infos.innerHTML = iglobal_time;
        }
    }
    
    if (_show_polyinfos) {
        _poly_infos_element.innerHTML = _keyboard.polyphony;
    }
    
    _drawSpectrum();

    _raf = window.requestAnimationFrame(_frame);
};/* jslint browser: true */


/***********************************************************
    Fields.
************************************************************/

var _uniform_location_cache = {},
    _current_program,
    
    _outline_element = document.getElementById("fs_outline"),
    
    _glsl_parser_worker = new Worker("dist/worker/parse_glsl.min.js");


/***********************************************************
    Functions.
************************************************************/

var _parse_glsl = function (glsl_code) {
    _glsl_parser_worker.postMessage(glsl_code);
};

var _createAndLinkProgram = function (vertex_shader, fragment_shader) {
    if (!vertex_shader || !fragment_shader) {
        return;
    }

    var prog = _gl.createProgram();

    _gl.attachShader(prog, vertex_shader);
    _gl.attachShader(prog, fragment_shader);

    _gl.linkProgram(prog);

    if (!_gl.getProgramParameter(prog, _gl.LINK_STATUS)) {
        _fail("Failed to link program: " + _gl.getProgramInfoLog(prog));
    }

    _gl.deleteShader(vertex_shader);
    _gl.deleteShader(fragment_shader);

    return prog;
};

var _createShader = function (shader_type, shader_code) {
    var shader = _gl.createShader(shader_type),

        log;

    _gl.shaderSource(shader, shader_code);
    _gl.compileShader(shader);

    if (!_gl.getShaderParameter(shader, _gl.COMPILE_STATUS)) {
        log = _gl.getShaderInfoLog(shader);

        _fail("Failed to compile shader: " + log);

        _parseCompileOutput(log);

        _gl.deleteShader(shader);

        shader = false;
    }

    return shader;
};

var _useProgram = function (program) {
    if (_current_program !== program) {
        _gl.useProgram(program);
        _current_program = program;
    }
};

var _getUniformLocation = function (name, program) {
    var prog = _program;
    
    if (!_uniform_location_cache[name]) {
        if (program !== undefined) {
            prog = program;
        }

        _uniform_location_cache[name] = _gl.getUniformLocation(prog, name);
    }
    
    return _uniform_location_cache[name];
};

var _setUniform = function (gl_ctx, type_str, program, name, value) {
    var uniform_location = _getUniformLocation(name, program);//gl_ctx.getUniformLocation(program, name);
    
    if (type_str === "bool" || type_str === "int" || type_str === "uint") {
        gl_ctx.uniform1i(uniform_location, value);
    } else if (type_str === "float") {
        gl_ctx.uniform1f(uniform_location, value);
    }
};

var _setUniforms = function (gl_ctx, type_str, program, name, values, comps) {
    var uniform_location = _getUniformLocation(name, program);

    if (type_str === "bool" || 
        type_str === "int" || 
        type_str === "uint") {
        gl_ctx.uniform1iv(uniform_location, new Int32Array(values));
    } else if (type_str === "float") {
        gl_ctx.uniform1fv(uniform_location, new Float32Array(values));
    } else {
        if (type_str === "bvec" || 
            type_str === "ivec" || 
            type_str === "uvec") {
            if (comps === 2) {
                gl_ctx.uniform2iv(uniform_location, new Int32Array(values));
            } else if (comps === 3) {
                gl_ctx.uniform3iv(uniform_location, new Int32Array(values));
            } else if (comps === 4) {
                gl_ctx.uniform4iv(uniform_location, new Int32Array(values));
            }
        } else if (type_str === "vec") {
            if (comps === 2) {
                gl_ctx.uniform2fv(uniform_location, new Float32Array(values));
            } else if (comps === 3) {
                gl_ctx.uniform3fv(uniform_location, new Float32Array(values));
            } else if (comps === 4) {
                if (values.length > 0) {
                    gl_ctx.uniform4fv(uniform_location, new Float32Array(values));
                }
            }
        }
    }
};

var _compile = function () {
    var frag,

        glsl_code = "",

        position,

        fragment_input,
        
        ctrl_name,
        ctrl_obj,
        
        temp_program,

        i = 0;
    
    // add our uniforms
    glsl_code = "precision mediump float; uniform float globalTime; uniform float octave; uniform float baseFrequency; uniform vec4 mouse; uniform vec4 date; uniform vec2 resolution; uniform vec4 keyboard[" + _keyboard.polyphony_max + "];"
    
    if (_feedback.enabled) {
        glsl_code += "uniform sampler2D pFrame;";
    }
    
    // add htoy
    glsl_code += "float htoy(float frequency) {return resolution.y - (resolution.y - (log(frequency / baseFrequency) / log(2.)) * (resolution.y / octave));}";
    
    // add htox
    //glsl_code += "float htoy(float frequency) {return resolution.x - (resolution.x - (log(frequency / baseFrequency) / log(2.)) * (resolution.x / octave));}";
    
    // add fline
    glsl_code += "float fline(float frequency) {return step(abs(gl_FragCoord.y - htoy(frequency)), 0.5);}";

    // add vline
    //glsl_code += "float vline(float frequency) {return step(abs(gl_FragCoord.x - htoy(frequency)), 0.5);}";
    
    // add inputs uniforms
    for (i = 0; i < _fragment_input_data.length; i += 1) {
        fragment_input = _fragment_input_data[i];

        if (fragment_input.type === 0 ||
           fragment_input.type === 1) { // 2D texture from either image or webcam type
            glsl_code += "uniform sampler2D iInput" + i + ";";
        }
    }
    
    // inputs uniform from controllers
    for(ctrl_name in _controls) { 
        if (_controls.hasOwnProperty(ctrl_name)) {
           ctrl_obj = _controls[ctrl_name];

           glsl_code += "uniform " + ((ctrl_obj.comps !== undefined) ? ctrl_obj.type + ctrl_obj.comps : ctrl_obj.type) + " " + ctrl_name + ((ctrl_obj.count > 1) ? "[" + ctrl_obj.count + "]" : "") + ";";
        }
    }
    
    // add user fragment code
    glsl_code += _code_editor.getValue();

    frag = _createShader(_gl.FRAGMENT_SHADER, glsl_code);

    temp_program = _createAndLinkProgram(
            _createShader(_gl.VERTEX_SHADER, document.getElementById("vertex-shader").text),
            frag
        );
    
    _parse_glsl(glsl_code);

    if (temp_program) {
        _gl.deleteProgram(_program);
        
        _program = temp_program;
        
        _uniform_location_cache = {};
        
        _fail("");

        _clearCodeMirrorWidgets();

        _useProgram(_program);

        _gl.uniform2f(_gl.getUniformLocation(_program, "resolution"), _canvas.width, _canvas.height);
        
        _setUniforms(_gl, "vec", _program, "keyboard", _keyboard.data, _keyboard.data_components);
        
        // set uniforms to value from controllers
        for(ctrl_name in _controls) { 
            if (_controls.hasOwnProperty(ctrl_name)) {
                ctrl_obj = _controls[ctrl_name];
                
                _setUniforms(_gl, ctrl_obj.type, _program, ctrl_name, ctrl_obj.values, ctrl_obj.comps);
            }
        }

        position = _gl.getAttribLocation(_program, "position");
        _gl.enableVertexAttribArray(position);
        _gl.vertexAttribPointer(position, 2, _gl.FLOAT, false, 0, 0);
        
        if (_glsl_error) {
            _glsl_error = false;

            if (_fs_state === 0) {
                _play(false);   
            }
        }
    } else {
        _glsl_error = true;

        //_stop();
    }
};

var setCursorCb = function (position) {
    return function () {
        _code_editor.setCursor({ line: position.start.line - 1, ch: position.start.column });
        
        if (_detached_code_editor_window) {
            _detached_code_editor_window.cm.setCursor({ line: position.start.line - 1, ch: position.start.column });
        }
    };
};

_glsl_parser_worker.onmessage = function(m) {
    var i = 0, j = 0,
        
        data = m.data,
        statement,
        
        tmp,
        param,
        
        elem;
    
    _outline_element.innerHTML = "";

    for (i = 0; i < data.length; i += 1) {
        statement = data[i];
        
        if (statement.type === "function") {
            elem = document.createElement("div");
            
            elem.className = "fs-outline-item fs-outline-function";
            
            tmp = [];
            for (j = 0; j < statement.parameters.length; j += 1) {
                param = statement.parameters[j];
                
                tmp.push('<span class="fs-outline-item-type">' + param.type_name + "</span> " + param.name);
            }
            
            elem.innerHTML = '<span class="fs-outline-item-type">' + statement.returnType.name + "</span> " + statement.name + " (" + tmp.join(", ") + ")";
            elem.title = "line: " + statement.position.start.line;
                
            elem.addEventListener("click", setCursorCb(statement.position));

            _outline_element.appendChild(elem);
        } else if (statement.type === "declarator") {
            elem = document.createElement("div");
            
            elem.className = "fs-outline-item fs-outline-declarator";
            
            elem.innerHTML = '<span class="fs-outline-item-type">' + statement.returnType + "</span> " + statement.name;
            elem.title = "line: " + statement.position.start.line;
                
            elem.addEventListener("click", setCursorCb(statement.position));

            _outline_element.appendChild(elem);
        } else if (statement.type === "preprocessor") {
            elem = document.createElement("div");
            
            elem.className = "fs-outline-item fs-outline-preprocessor";
            
            elem.innerHTML = statement.name + " = " + statement.value;
            elem.title = "line: " + statement.position.start.line;
                
            elem.addEventListener("click", setCursorCb(statement.position));

            _outline_element.appendChild(elem);
        }
    }
};/* jslint browser: true */


/***********************************************************
    Fields.
************************************************************/

var _socket,
    
    _fss_ws,
    
    _address_fss = _domain + ":3001",
    _address_sdb = _domain + ":3002",
    
    _session,
    
    _share_ctrl_timeout,
    _share_settings_timeout,
    
    _sharedb_timeout,
    
    _sharedb_connection,
    _sharedb_doc,
    _sharedb_doc_ready = false,
    
    _sharedb_ctrl_doc_ready = false,
    
    _sharedb_code_changes = [],
    
    _sharedb_ctrl_doc;

/***********************************************************
    Functions.
************************************************************/

var _sharedbDocError = function (err) {
    _notification(err, 5000);
};

var _shareDBConnect = function () {
    var ws = new WebSocket(_ws_protocol + "://" + _address_sdb);
    
    ws.addEventListener("open", function (ev) {
        var fs_sync = document.getElementById("fs_sync_status");
        
        fs_sync.classList.add("fs-server-status-on");
    });
    
    ws.addEventListener("close", function (ev) {
            _sharedb_doc_ready = false;
            _sharedb_ctrl_doc_ready = false;
        
            _notification("Connection to synchronization server was lost, trying again in ~5s.", 2500);
        
            clearTimeout(_sharedb_timeout);
            _sharedb_timeout = setTimeout(_shareDBConnect, 5000);
        
            var fs_sync = document.getElementById("fs_sync_status");
        
            fs_sync.classList.remove("fs-server-status-on");
        });
    
    ws.addEventListener("error", function (event) {
        
        });
    
    _sharedb_connection = new ShareDB.Connection(ws);
    
    _sharedb_doc = _sharedb_connection.get(_session, "fs");

    _sharedb_doc.on('error', _sharedbDocError);
    
    _sharedb_doc.subscribe(function(err) {
        if (err) {
            _notification(err, 5000);
        }
        
        if (!_sharedb_doc.data) {
            _sharedb_doc.create(_code_editor.getValue());
        } else {
            _code_editor.setValue(_sharedb_doc.data);
        }
        
        _sharedb_doc.on('op', function(op, source) {
            var i = 0, j = 0,
                from,
                to,
                operation,
                o;
            
            if (source === false) { // only changes from the server
                for (i = 0; i < op.length; i += 1) {
                    operation = op[i];
                    
                    for (j = 0; j < operation.o.length; j += 1) {
                        o = operation.o[j];
                        
                        if (o["d"] !== undefined) {
                            from = _code_editor.posFromIndex(o.p);
                            to = _code_editor.posFromIndex(o.p + o.d.length);
                            _code_editor.replaceRange("", from, to, "remote");
                        } else if (o["i"] !== undefined) {
                            from = _code_editor.posFromIndex(o.p);
                            _code_editor.replaceRange(o.i, from, from, "remote");
                        } else {
                            _notification("Unknown type of operation.");
                        }
                    }
                }
            }
        });
        
        _sharedb_doc_ready = true;
    });
    
    _sharedb_ctrl_doc = _sharedb_connection.get(_session, "ctrls");
    _sharedb_ctrl_doc.on('error', _sharedbDocError);
    
    _sharedb_ctrl_doc.subscribe(function(err) {
        var i = 0,
            
            s;
        
        if (err) {
            _notification(err, 5000);
        }
        
        if (!_sharedb_ctrl_doc.data) {
            _sharedb_ctrl_doc.create({ ctrls: {}, score_settings: [] });
        } else {
            _buildControls(_sharedb_ctrl_doc.data.ctrls);

            if (_sharedb_ctrl_doc.data.score_settings.length === 4) {
                _updateScore({
                        width: parseInt(_sharedb_ctrl_doc.data.score_settings[0], 10),
                        height: parseInt(_sharedb_ctrl_doc.data.score_settings[1], 10),
                        octave: parseInt(_sharedb_ctrl_doc.data.score_settings[2], 10),
                        base_freq: parseFloat(_sharedb_ctrl_doc.data.score_settings[3])
                    });
            }
        }
        
        _sharedb_ctrl_doc.on('op', function(op, source) {
            var i = 0,
                operation;
            
            if (source === false) { // only changes from the server
                for (i = 0; i < op.length; i += 1) {
                    operation = op[i];
                    
                    if (operation["oi"]) {
                        var ctrl_window = WUI_Dialog.getDetachedDialog(_controls_dialog);
                        if (!ctrl_window) {
                            ctrl_window = window;
                        }

                        operation.oi.nosync = "";

                        _addControls(operation.oi.type, ctrl_window, operation.oi, null);
                    } else if (operation["od"]) {
                        _deleteControlsFn(operation.od.name, operation.od.ids)();
                    } else if (operation["ld"] && operation["li"] && operation["p"]) {
                        if (operation.p[0] === "score_settings") {
                            if (operation.p[1] === 0) {
                                _updateScore({
                                        width: parseInt(operation.li, 10)
                                    });
                            } else if (operation.p[1] === 1) {
                                _updateScore({
                                        height: parseInt(operation.li, 10)
                                    });
                            } else if (operation.p[1] === 2) {
                                _updateScore({
                                        octave: parseInt(operation.li, 10)
                                    });
                            } else if (operation.p[1] === 3) {
                                _updateScore({
                                        base_freq: parseFloat(operation.li)
                                    });
                            }
                        } else if (operation.p[0] === "ctrls") {
                            _setControlsValue(operation.p[1], operation.p[3], operation.li);
                        }
                    }
                }
            }
        });
  
        _sharedb_ctrl_doc_ready = true;

    });
};

var _prepareMessage = function (type, obj) {
    obj.type = type;

    return JSON.stringify(obj);
};

var _fssConnect = function () {
    _fss_ws = new WebSocket(_ws_protocol + "://" + _address_fss);
    
    _fss_ws.onopen = function (event) {
            _setUsersList([]);
        
            var fs_server = document.getElementById("fs_server_status");

            fs_server.classList.add("fs-server-status-on");
        
            _fss_ws.send(_prepareMessage("session", { session: _session, username: _username }));
        };
    
    _fss_ws.onmessage = function (event) {
            var i = 0, msg;
        
            try {
                msg = JSON.parse(event.data);
                
                if (msg.type === "users") {
                    _setUsersList(msg.list);
                } else if (msg.type === "userjoin") {
                    _addUser(msg.userid, msg.username);
                } else if (msg.type === "userleave") {
                    _removeUser(msg.userid);
                } else if (msg.type === "msg") {
                    _addMessage(msg.userid, msg.data);
                } else if (msg.type === "addSlice") {
                    _addPlayPositionMarker(msg.data.x, msg.data.shift, msg.data.mute, msg.data.output_channel);
                } else if (msg.type === "delSlice") {
                    _removePlayPositionMarker(msg.data.id);
                } else if (msg.type === "updSlice") {
                    _updatePlayMarker(msg.data.id, msg.data.obj);
                } else if (msg.type === "slices") {
                    _removeAllSlices();
                    
                    for (i = 0; i < msg.data.length; i += 1) {
                        _addPlayPositionMarker(msg.data[i].x, msg.data[i].shift, msg.data[i].mute, msg.data[i].output_channel);
                    }
                }
            } catch (e) {
                _notification('JSON message parsing failed : ' + e);
            }
        };
    
    _fss_ws.onerror = function (event) {

        };
    
    _fss_ws.onclose = function (event) {
            _removeUsers();
        
            setTimeout(_fssConnect, 5000);
        
            _notification("Connection with the server lost, trying again in ~5s.", 2500);
        
            var fs_server = document.getElementById("fs_server_status");

            fs_server.classList.remove("fs-server-status-on");
        };
};

var _sendSlices = function (data) {
    try {
        _fss_ws.send(_prepareMessage("slices", { data: data }));
    } catch (err) {

    }
};

var _sendSliceUpdate = function (id, data) {
    try {
        _fss_ws.send(_prepareMessage("updSlice", { data: { id: id, obj: data } }));
    } catch (err) {

    }
};

var _sendAddSlice = function (x, shift, mute) {
    try {
        _fss_ws.send(_prepareMessage("addSlice", { data: { x: x, shift: shift, mute: mute } }));
    } catch (err) {

    }
};

var _sendRemoveSlice = function (id) {
    try {
        _fss_ws.send(_prepareMessage("delSlice", { data: { id: id } }));
    } catch (err) {

    }
};

var _sendMessage = function (message) {
    try {
        _fss_ws.send(_prepareMessage("msg", { data: message }));
    } catch (err) {
        _notification("An error occured whuile trying to send the message.");
    }
};

var _shareCtrlsAdd = function (ctrl_obj) {
    var op, obj;
    
    if (!_sharedb_ctrl_doc_ready) {
        return;
    }
    
    obj = JSON.parse(JSON.stringify(ctrl_obj));
    
    //delete obj.ids;

    op = [{ p: ['ctrls', ctrl_obj.name], oi: obj }];
    
    _sharedb_ctrl_doc.submitOp(op);
};

var _shareCtrlsDel = function (ctrl_obj) {
    var op, obj;
    
    if (!_sharedb_ctrl_doc_ready) {
        return;
    }
    
    obj = JSON.parse(JSON.stringify(ctrl_obj));
    
    //delete obj.ids;

    op = [{ p: ['ctrls', ctrl_obj.name], od: obj }];
    
    _sharedb_ctrl_doc.submitOp(op);
};

var _shareCtrlsUpdFn = function (name, index, bv, av) {
    return function () {
        var op = [{ p: ['ctrls', name, 'values', index], ld: bv, li: av }];

        _sharedb_ctrl_doc.submitOp(op);
    };
};

var _shareCtrlsUpd = function (name, index, bv, av) {
    if (!_sharedb_ctrl_doc_ready) {
        return;
    }
    
    clearTimeout(_share_ctrl_timeout);
    _share_ctrl_timeout = setTimeout(_shareCtrlsUpdFn(name, index, bv, av), 1000);
};

var _shareSettingsUpdFn = function (settings) {
    return function () {
        var op = [{ p: ['score_settings', 0], ld: settings[0], li: settings[1] },
                  { p: ['score_settings', 1], ld: settings[2], li: settings[3] },
                  { p: ['score_settings', 2], ld: settings[4], li: settings[5] },
                  { p: ['score_settings', 3], ld: settings[6], li: settings[7] }];

        _sharedb_ctrl_doc.submitOp(op);
    };
};

var _shareSettingsUpd = function (settings) {
    if (!_sharedb_ctrl_doc_ready) {
        return;
    }
    
    clearTimeout(_share_settings_timeout);
    _share_settings_timeout = setTimeout(_shareSettingsUpdFn(settings), 500);
};

var _shareCodeEditorChanges = function (changes) {
    var op,
        change,
        start_pos,
        chars,
        
        i = 0, j = 0;
    
    if (!_sharedb_doc_ready) {
        return;
    }
    
    op = {
        p: [],
        t: "text0",
        o: []
    };

    for (i = 0; i < changes.length; i += 1) {
        change = changes[i];
        start_pos = 0;
        j = 0;
        
        if (change.origin === "remote") { // do not submit back things pushed by remotes
            continue;
        }
        
        while (j < change.from.line) {
            start_pos += _code_editor.lineInfo(j).text.length + 1;
            j += 1;
        }
        
        start_pos += change.from.ch;
        
        if (change.to.line != change.from.line || change.to.ch != change.from.ch) {
            chars = "";
            
            for (j = 0; j < change.removed.length; j += 1) {
                chars += change.removed[j];
                
                if (j !== (change.removed.length - 1)) {
                    chars += "\n";
                }
            }
            
            op.o.push({
                p: start_pos,
                d: chars
            });
        }

        if (change.text) {
            op.o.push({
                p: start_pos,
                i: change.text.join('\n')
            });
        }
    }

    if (op.o.length > 0) {
        _sharedb_doc.submitOp(op);
    }
};

/***********************************************************
    Init.
************************************************************/

var _initNetwork = function () {
    _session = _getSessionName();

    _fssConnect();
    _shareDBConnect();
};
/* jslint browser: true */


/*
    Simple discussion system
*/

/***********************************************************
    Fields.
************************************************************/

var _discuss_dialog_id = "fs_right_dialog",
    _right_dialog,
    
    _discuss_input = document.getElementById("fs_discuss_input");

/***********************************************************
    Functions.
************************************************************/

var _getUserListElement = function () {
    return document.getElementById("fs_users_list");
};

var _addUser = function (id, name, hex_color, bold) {
    var users_list_element = _getUserListElement(),
        li = document.createElement("li"),
        detached_dialog = WUI_Dialog.getDetachedDialog(_discuss_dialog_id);

    li.innerHTML = name;
    li.id = "user" + id;
    li.title = name;
    
    if (hex_color) {
        li.style.color = hex_color;
    }
    
    if (bold) {
        li.style.fontWeight = "bold";
    }

    users_list_element.appendChild(li);
    
    if (detached_dialog) {
        detached_dialog.document.getElementById("fs_users_list").appendChild(li.cloneNode(true));
    }
};

var _removeUser = function (id) {
    var user_li = document.getElementById("user" + id),
        detached_user_li,
        detached_dialog = WUI_Dialog.getDetachedDialog(_discuss_dialog_id);
    
    if (detached_dialog) {
        detached_user_li = detached_dialog.document.getElementById("user" + id);
        
        detached_user_li.parentElement.removeChild(detached_user_li);
    }
    
    user_li.parentElement.removeChild(user_li);
};

var _setUsersList = function (list) {
    var users_list_element = _getUserListElement(),
        detached_dialog = WUI_Dialog.getDetachedDialog(_discuss_dialog_id),
        detached_dialog_list_element,
        li,
        i;
    
    users_list_element.innerHTML = "";
    
    _addUser("self", _username, "#adff2f", false);

    for (i = 0; i < list.length; i += 1) {
        li = document.createElement("li");
        li.innerHTML = list[i].username;
        li.id = "user" + list[i].userid;

        users_list_element.appendChild(li);
    }
    
    if (detached_dialog) {
        detached_dialog_list_element = detached_dialog.document.getElementById("fs_users_list");
        
        detached_dialog_list_element.parentElement.removeChild(detached_dialog_list_element);
        
        detached_dialog_list_element.parentElement.appendChild(users_list_element.cloneNode(true));
    }
};

var _removeUsers = function () {
    _setUsersList([]);
    
    _removeUser("self");
};

var _addMessage = function (userid, data) {
    var discuss_element = document.getElementById("fs_discuss"),
        user_li = document.getElementById("user" + userid),
        li = document.createElement("li"),
        detached_discuss_element,
        
        detached_dialog;

    li.title = new Date().toLocaleString();
    li.innerHTML = "&lt;" + user_li.innerHTML + "&gt; " + data;
    
    if (userid === "self") {
        li.style.color = "#adff2f";
    } else {
        _notification(li.innerHTML);
    }
    
    discuss_element.appendChild(li);
    
    detached_dialog = WUI_Dialog.getDetachedDialog(_discuss_dialog_id);
    if (detached_dialog) {
        detached_discuss_element = detached_dialog.document.getElementById("fs_discuss");
        
        detached_discuss_element.appendChild(li.cloneNode(true));
        detached_discuss_element.scrollTop = detached_discuss_element.scrollHeight;
    }
    
    discuss_element.scrollTop = discuss_element.scrollHeight;
};

/***********************************************************
    Init.
************************************************************/

_right_dialog = WUI_Dialog.create(_discuss_dialog_id, {    
    title: "Chat - Session '" + _getSessionName() + "'",
    width: "600px",
    height: "300px",
    halign: "right",
    valign: "bottom",
    
    open: false,
    
    closable: true,
    draggable: true,
    minimizable: true,
    resizable: true,
    detachable: false,
    
    min_width: 300,
    min_height: 200
});

_setUsersList([]);

_discuss_input.addEventListener("keypress", function (e) {
        if (e.which === 13 || e.keyCode === 13) {
            if (e.target.value.length <= 0) {
                return true;
            }
            
            _sendMessage(e.target.value);
            
            e.target.value = "";
             
            return false;
        }
    
        return true;
    });/* jslint browser: true */


var _imageProcessor = function (image_data, image_processing_done_cb) {
    var worker = new Worker("dist/worker/image_processor.min.js");

    worker.onmessage = function (e) {
        _imageProcessingDone(e.data);
    };

    worker.postMessage({ img_width: image_data.width, img_height: image_data.height, buffer: image_data.data.buffer }, [image_data.data.buffer]);
};

var _removeInputChannel = function (input_id) {
    var fragment_input_data = _fragment_input_data[input_id],
        tracks,
        i;

    _gl.deleteTexture(_fragment_input_data.texture);

    if (_fragment_input_data.type === 1) {
        _fragment_input_data.video_elem.pause();
        _fragment_input_data.video_elem.src = "";

        tracks = _fragment_input_data.media_stream.getVideoTracks();
        if (tracks) {
            tracks[0].stop();
        }
        _fragment_input_data.video_elem = null;
    }

    _fragment_input_data.splice(input_id, 1);

    for (i = 0; i < _fragment_input_data.length; i += 1) {
        fragment_input_data = _fragment_input_data[i];

        fragment_input_data.elem.title = _input_channel_prefix + i;

        fragment_input_data.elem.input_id = i;
    }

    _compile();
};

var _createInputThumb = function (input_id, image, thumb_title) {
    var dom_image = document.createElement("img");

    if (image !== undefined) {
        dom_image.src = image.src;
    }

    dom_image.title = thumb_title;

    dom_image.input_id = input_id;

    dom_image.classList.add("fs-input-thumb");

    dom_image.addEventListener("click", function (ev) {
        WUI_CircularMenu.create(
            {
                element: dom_image,

                rx: 32,
                ry: 32,

                item_width:  32,
                item_height: 32
            },
            [
                { icon: "fs-gear-icon", tooltip: "Settings",  on_click: function () {
                        _createChannelSettingsDialog(dom_image.input_id);
                    } },
                { icon: "fs-replace-icon", tooltip: "Replace",  on_click: function () {

                    } },
                { icon: "fs-cross-45-icon", tooltip: "Delete",  on_click: function () {
                        _input_panel_element.removeChild(dom_image);

                        _removeInputChannel(dom_image.input_id);
                    } },
                { icon: "fs-xyf-icon", tooltip: "View image",  on_click: function () {
                        window.open(dom_image.src);
                    } },
            ]);
        });

    _input_panel_element.appendChild(dom_image);

    return dom_image;
};

var _addFragmentInput = function (type, input) {
    var input_thumb,

        data,
        image,
        texture,
        
        video_element,

        input_id = _fragment_input_data.length;

    if (type === "image") {
        data = _create2DTexture(input, false, true);

        _fragment_input_data.push({
                type: 0,
                image: data.image,
                texture: data.texture,
                flip: true,
                elem: null
            });

        input_thumb = input;

        _fragment_input_data[input_id].elem = _createInputThumb(input_id, input_thumb, _input_channel_prefix + input_id);

        _compile();
    } else if (type === "camera") {
        video_element = document.createElement('video');
        video_element.width = 320;
        video_element.height = 240;
        video_element.autoplay = true;
        video_element.loop = true;
        video_element.stream = null;

        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia  || navigator.msGetUserMedia || navigator.oGetUserMedia;

        if (navigator.getUserMedia) {
            navigator.getUserMedia({ video: { mandatory: { minWidth: 640, maxWidth: 1280, minHeight: 480, maxHeight: 720, minFrameRate: 30 }, optional: [ { minFrameRate: 60 } ] },
                audio: false }, function (media_stream) {
                    video_element.src = window.URL.createObjectURL(media_stream);

                    data = _create2DTexture(video_element, false, false);

                    _setTextureWrapS(data.texture, "clamp");
                    _setTextureWrapT(data.texture, "clamp");

                    _fragment_input_data.push({
                            type: 1,
                            image: data.image,
                            texture: data.texture,
                            video_elem: video_element,
                            flip: true,
                            elem: null,
                            media_stream: media_stream
                        });

                    _fragment_input_data[input_id].elem = _createInputThumb(input_id, { src: "data/ui-icons/camera.png"}, _input_channel_prefix + input_id);

                    _compile();
                }, function (e) {
                    _notification("Unable to capture WebCam.");
                });
        } else {
            _notification("Cannot capture audio/video, getUserMedia function is not supported by your browser.");
        }
    }
};/* jslint browser: true */

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

        _codemirror_line_widgets.push(_code_editor.addLineWidget(line - 1, msg_container, { coverGutter: false, noHScroll: true }));
    }
};

var _updateCodeView = function () {
    var code = document.getElementById("code"),
        mid_panel = document.getElementById("fs_middle_panel"),

        mid_panel_offset = _getElementOffset(mid_panel);

    code.style.height = window.innerHeight - (mid_panel_offset.top + mid_panel_offset.height) + "px";

    _code_editor.refresh();
};

var _changeEditorTheme = function (theme) {
    if (_code_editor_theme_link) {
        document.getElementsByTagName('head')[0].removeChild(_code_editor_theme_link);
    }

    _code_editor_theme_link = document.createElement('link');

    _code_editor_theme_link.onload = function(){
        _code_editor.setOption("theme", theme);
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
/*    
    // moved to proper js files due to events issues
    new_editor_element = new_window.document.body.getElementsByClassName("fs-editor");
    if (new_editor_element.length > 0) {
        new_editor_element = new_editor_element[0];
    }

    new_editor = new CodeMirror(new_editor_element, _code_editor_settings);
    new_editor.setOption("theme", _code_editor_theme);
    new_editor.setValue(_code_editor.getValue());
    
    synced_cm_document = _code_editor.getDoc();
    
    new_editor.swapDoc(synced_cm_document.linkedDoc({
            sharedHist: true
        }));
    
    new_window.addEventListener("load", function () {
            new_editor.refresh();
        }, false);
    new_window.addEventListener("resize", function () {
            new_editor.refresh();
        }, false);
*/
/*
    // probably not needed
    _code_editor_element.style.display = "none";
    
    new_window.addEventListener("beforeunload", function () {
            _code_editor_element.style.display = "";
        });
*/
};/* jslint browser: true */


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
};/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _icon_class = {
            plus: "fs-plus-icon"
        },
    
    _selected_slice,
    
    _slice_settings_dialog_id = "fs_slice_settings_dialog",
    _slice_settings_dialog,
    
    _midi_out_editor,
    
    _midi_out_dialog_id = "fs_midi_out_dialog",
    _midi_out_dialog,
    
    _settings_dialog_id = "fs_settings_dialog",
    _settings_dialog,
    
    _midi_settings_dialog_id = "fs_midi_settings_dialog",
    _midi_settings_dialog,
    
    _help_dialog_id = "fs_help_dialog",
    _help_dialog,
    
    _analysis_dialog_id = "fs_analysis_dialog",
    _analysis_dialog,
    
    _record_dialog_id = "fs_record_dialog",
    _record_dialog,
    
    _outline_dialog_id = "fs_outline_dialog",
    _outline_dialog,
    
    _import_dialog_id = "fs_import_dialog",
    _import_dialog,
    
    _wui_main_toolbar,
    
    _send_slices_settings_timeout,
    _add_slice_timeout,
    _remove_slice_timeout,
    _slice_update_timeout = [{}, {}, {}, {}],
    _slice_update_queue = [],
    
    _controls_dialog_id = "fs_controls_dialog",
    _controls_dialog,
    _controls_dialog_element = document.getElementById(_controls_dialog_id);

/***********************************************************
    Functions.
************************************************************/

var _togglePlay = function (toggle_ev) {
    if (toggle_ev.state) {
        _pause();
    } else {
        _play();
    }
};

var _saveMarkersSettings = function () {
    _local_session_settings.markers = [];
    _play_position_markers.forEach(function (obj) {
            _local_session_settings.markers.push({ m: obj.mute, p: obj.percent });
        });
    _saveLocalSessionSettings();  
};

var _domCreatePlayPositionMarker = function (hook_element, height) {
    var play_position_marker_div = document.createElement("div"),
        decoration_div = document.createElement("div"),
        decoration_div2 = document.createElement("div");
    
    play_position_marker_div.className = "play-position-marker";
    
    if (_show_slicebar) {
        play_position_marker_div.classList.add("play-position-marker-bar");
    }
    
    decoration_div.style.top = "0px";
    //decoration_div2.style.top = "0";
    
    play_position_marker_div.style.height = height + "px";
    
    decoration_div.className = "play-position-triangle";
    decoration_div2.className = "play-position-triangle-vflip";
    
    play_position_marker_div.appendChild(decoration_div);
    play_position_marker_div.appendChild(decoration_div2);
    
    hook_element.parentElement.insertBefore(play_position_marker_div, hook_element);
    
    return play_position_marker_div;
};

var _getSlice = function (play_position_marker_id) {
    return _play_position_markers[parseInt(play_position_marker_id, 10)];
};

var _setPlayPosition = function (play_position_marker_id, x, y, submit, dont_update_slider) {
    var play_position_marker = _getSlice(play_position_marker_id),
        
        height = play_position_marker.height,
        
        canvas_offset = _getElementOffset(_canvas),

        bottom;
    
    if (play_position_marker.x < 0) {
        x = _canvas_width_m1; 
    } else if (play_position_marker.x > _canvas_width_m1) {
        x = 0;
    }

    play_position_marker.x = x;

    play_position_marker.element.style.left = (parseInt(x, 10) + canvas_offset.left + 1) + "px";
/*
    if (y !== undefined) {
        bottom = y + height;

        play_position_marker.y = y;
    }
*/  
    if (dont_update_slider === undefined) {
        WUI_RangeSlider.setValue("fs_slice_settings_x_input_" + play_position_marker.id, x);
    }
    
    if (submit) {
        _submitSliceUpdate(0, play_position_marker_id, { x : x }); 
    }
};

var _updateAllPlayPosition = function () {
    var i = 0,
        
        canvas_offset = _getElementOffset(_canvas),

        play_position_marker;

    for (i = 0; i < _play_position_markers.length; i += 1) {
        play_position_marker = _play_position_markers[i];

        play_position_marker.element.style.left = (play_position_marker.x + canvas_offset.left) + "px";
    }
};

var _updatePlayMarkersHeight = function (height) {
    var i = 0,

        play_position_marker;

    for (i = 0; i < _play_position_markers.length; i += 1) {
        play_position_marker = _play_position_markers[i];

        play_position_marker.element.style.height = height + "px";
        play_position_marker.height = height;
    }
};

var _updatePlayMarker = function (id, obj) {
    var slice = _play_position_markers[_parseInt10(id)];

    if (obj.x) {
        _setPlayPosition(slice.element.dataset.slice, _parseInt10(obj.x), 0);
    }
    
    if ('mute' in obj) {
        slice.mute = obj.mute;
        
        if (slice.mute) {
            _muteSlice(slice);
        } else {
            _unmuteSlice(slice);
        }
    }
    
    if (obj.shift) {
        slice.shift = _parseInt10(obj.shift);
        
        WUI_RangeSlider.setValue("fs_slice_settings_shift_input_" + slice.id, slice.shift);
    }
};

var _removePlayPositionMarker = function (marker_id, force, submit) {
    var play_position_marker = _play_position_markers[parseInt(marker_id, 10)],
        slice_settings_container = document.getElementById("slice_settings_container_" + marker_id),
        i;
    
    slice_settings_container.parentElement.removeChild(slice_settings_container);

    WUI.undraggable(play_position_marker.element);
    WUI.undraggable(play_position_marker.element.firstElementChild);
    WUI.undraggable(play_position_marker.element.lastElementChild);

    play_position_marker.element.parentElement.removeChild(play_position_marker.element);
    
    WUI_RangeSlider.destroy("fs_slice_settings_x_input_" + marker_id);
    WUI_RangeSlider.destroy("fs_slice_settings_shift_input_" + marker_id);
    WUI_RangeSlider.destroy("fs_slice_settings_channel_input_" + marker_id);

    _play_position_markers.splice(marker_id, 1);

    for (i = 0; i < _play_position_markers.length; i += 1) {
        slice_settings_container = document.getElementById("slice_settings_container_" + _play_position_markers[i].id);
        
        _play_position_markers[i].element.dataset.slice = i;
        _play_position_markers[i].id = i;
        
        slice_settings_container.id = "slice_settings_container_" + i;
    }
    
    if (submit) {
        _submitRemoveSlice(marker_id);
    }
    
    _computeOutputChannels();
};

var _createMarkerSettings = function (marker_obj) {
    var fs_slice_settings_dialog_content_div = document.getElementById("fs_slice_settings_dialog").getElementsByClassName("wui-dialog-content")[0],
        
        fs_slice_settings_container = document.createElement("div"),
        fs_slice_settings_x_input = document.createElement("div"),
        fs_slice_settings_shift_input = document.createElement("div"),
        fs_slice_settings_channel_input = document.createElement("div"),
        fs_slice_settings_bpm = document.createElement("div");
    
    fs_slice_settings_x_input.id = "fs_slice_settings_x_input_" + marker_obj.id;
    fs_slice_settings_shift_input.id = "fs_slice_settings_shift_input_" + marker_obj.id;
    fs_slice_settings_channel_input.id = "fs_slice_settings_channel_input_" + marker_obj.id;
    fs_slice_settings_bpm.id = "fs_slice_settings_bpm_" + marker_obj.id;
    
    WUI_RangeSlider.create(fs_slice_settings_x_input, {
            width: 120,
            height: 8,

            bar: false,

            min: 0,

            step: 1,

            midi: {
                type: "rel"   
            },

            default_value: 0,
            value: marker_obj.x,

            title: "X Offset",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (value) {
                _setPlayPosition(marker_obj.element.dataset.slice, _parseInt10(value), 0, true);
                
                //_submitSliceSettings(); 
            }
        });

    WUI_RangeSlider.create(fs_slice_settings_shift_input, {
            width: 120,
            height: 8,

            bar: false,

            step: 1,

            midi: {
                type: "rel"   
            },

            default_value: 0,
            value: marker_obj.shift,

            title: "Y Shift",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (value) {
                /*
                if (_selected_slice) {
                    _selected_slice.shift = _parseInt10(value);
                    
                    _submitSliceUpdate(1, marker_obj.element.dataset.slice, { shift : value });
                }*/
                
                var slice = _getSlice(marker_obj.element.dataset.slice);
                
                slice.shift = _parseInt10(value);
                
                _submitSliceUpdate(1, marker_obj.element.dataset.slice, { shift : value });
            }
        });
    
    WUI_RangeSlider.create(fs_slice_settings_channel_input, {
            width: 120,
            height: 8,

            bar: false,

            step: 1,

            midi: {
                type: "rel"   
            },
        
            min: 1,

            default_value: 0,
            value: marker_obj.output_channel,

            title: "FAS Output channel",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (value) {
                if (value <= 0) {
                    value = 1;
                }
                
                var slice = _getSlice(marker_obj.element.dataset.slice);
                
                slice.output_channel = _parseInt10(value);
                
                _submitSliceUpdate(3, marker_obj.element.dataset.slice, { output_channel : value });
                
                _computeOutputChannels();
            }
        });
    
    WUI_RangeSlider.create(fs_slice_settings_bpm, {
            width: 120,
            height: 8,

            bar: false,

            step: 0.01,

            midi: {
                type: "rel"   
            },
        
            default_value: 0,
            value: marker_obj.frame_increment,

            title: "Increment per frame",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (value) {
                var slice = _getSlice(marker_obj.element.dataset.slice);
                
                slice.frame_increment = parseFloat(value);
            }
        });
    
    fs_slice_settings_container.appendChild(fs_slice_settings_x_input);
    fs_slice_settings_container.appendChild(fs_slice_settings_shift_input);
    fs_slice_settings_container.appendChild(fs_slice_settings_bpm);
    fs_slice_settings_container.appendChild(fs_slice_settings_channel_input);
    
    fs_slice_settings_container.id = "slice_settings_container_" + marker_obj.id;
    fs_slice_settings_container.style = "display: none";
    
    fs_slice_settings_dialog_content_div.appendChild(fs_slice_settings_container);
};

var _setSlicePositionFromAbsolute = function (play_position_marker_id, x, y) {
    var canvas_offset = _getElementOffset(_canvas);
    
    if (x <= (canvas_offset.left + 1)) {
        x = 0;
    } else if (x > (canvas_offset.left + _canvas_width)) {
        x = _canvas_width - 1;
    } else {
        x = x - canvas_offset.left - 2;
    }
    
    _setPlayPosition(play_position_marker_id, x, y, true);
};

var _removeAllSlices = function () {
    _play_position_markers.forEach(function(slice_obj) {
            _removePlayPositionMarker(slice_obj.id, true);
        });
};

var _submitSliceSettingsFn = function () {
    var slices_settings = [],
        play_position_marker,
        i = 0;
    for (i = 0; i < _play_position_markers.length; i += 1) {
        play_position_marker = _play_position_markers[i];
        
        slices_settings.push({
                x: play_position_marker.x,
                shift: play_position_marker.shift,
                mute: play_position_marker.mute,
                output_channel: play_position_marker.output_channel,
            });
    }

    _sendSlices(slices_settings); 
};

var _submitSliceUpdate = function (tid, id, obj) {
    clearTimeout(_slice_update_timeout[tid][id]);
    _slice_update_timeout[tid][id] = setTimeout(_sendSliceUpdate, 1000, id, obj);
};

var _submitAddSlice = function (x, shift, mute) {
    //clearTimeout(_add_slice_timeout);
    /*_add_slice_timeout = */setTimeout(_sendAddSlice, 500, x, shift, mute);
};

var _submitRemoveSlice = function (id) {
    //clearTimeout(_remove_slice_timeout);
    /*_remove_slice_timeout = */setTimeout(_sendRemoveSlice, 500, id);
};

var _muteSlice = function (slice_obj, submit) {
    slice_obj.mute = true;
    slice_obj.element.style.backgroundColor = "#555555";
    
    if (submit) {
        _submitSliceUpdate(2, slice_obj.element.dataset.slice, { mute : true }); 
    }
};

var _unmuteSlice = function (slice_obj, submit) {
    slice_obj.mute = false;
    slice_obj.element.style.backgroundColor = "";
    
    if (submit) {
        _submitSliceUpdate(2, slice_obj.element.dataset.slice, { mute : false });
    }
};

var _addPlayPositionMarker = function (x, shift, mute, output_channel, submit) {
    var play_position_marker_element = _domCreatePlayPositionMarker(_canvas, _canvas_height),
        play_position_marker_id = _play_position_markers.length,
        
        play_position_marker,

        play_position_top_hook_element = play_position_marker_element.firstElementChild,
        play_position_bottom_hook_element = play_position_marker_element.lastElementChild,
        
        i = 0,
        
        is_mute = mute;

    if (x === undefined) {
        x = 0;
    }
    
    if (!is_mute) {
        is_mute = false;
    } else {
        play_position_marker_element.style.backgroundColor = "#555555";
    }

    play_position_marker_element.dataset.slice = play_position_marker_id;

    _play_position_markers.push({
            element: play_position_marker_element,
            x: x,
            mute: is_mute,
            min: 0,
            max: 100,
            shift: 0,
            frame_increment: 0,
            output_channel: 1,
            y: 0,
            height: _canvas_height,
            id: play_position_marker_id
        });
    
    play_position_marker = _play_position_markers[play_position_marker_id];
    
    if (output_channel !== undefined) {
        play_position_marker.output_channel = output_channel;
    }
    
    _computeOutputChannels();
    
    if (shift !== undefined) {
        play_position_marker.shift = shift;
    }

    _setPlayPosition(play_position_marker_id, play_position_marker.x, 0);

    WUI.draggable(play_position_top_hook_element, function (element, x, y) {
            _setSlicePositionFromAbsolute(element.dataset.slice, x, y);
        }, false, play_position_marker_element);
    WUI.lockDraggable(play_position_top_hook_element, 'y');
    WUI.draggable(play_position_bottom_hook_element, function (element, x, y) {
            _setSlicePositionFromAbsolute(element.dataset.slice, x, y);
        }, false, play_position_marker_element);
    WUI.lockDraggable(play_position_bottom_hook_element, 'y');

    WUI.draggable(play_position_marker_element, function (element, x, y) {
            _setSlicePositionFromAbsolute(element.dataset.slice, x, y);
        });
    WUI.lockDraggable(play_position_marker_element, 'y');
    
    play_position_marker_element.addEventListener('dblclick', function (ev) {
            _updateSliceSettingsDialog(play_position_marker, true);
        });
    
    play_position_marker_element.addEventListener('contextmenu', function(ev) {
            ev.preventDefault();
        
            if (!this.mute) {
                this.mute = false;
            }
        
            var play_position_marker = _play_position_markers[parseInt(play_position_marker_element.dataset.slice, 10)],
                
                mute_obj = { icon: "fs-mute-icon", tooltip: "Mute",  on_click: function () {
                        _muteSlice(play_position_marker, true);
                    } },
                unmute_obj = { icon: "fs-unmute-icon", tooltip: "Unmute",  on_click: function () {
                        _unmuteSlice(play_position_marker, true);
                    } },
                
                obj;
        
            if (!play_position_marker.mute) {
                obj = mute_obj;
            } else {
                obj = unmute_obj;
            }

            WUI_CircularMenu.create(
                {
                    x: _mx,
                    y: _my,

                    rx: 32,
                    ry: 32,

                    item_width:  32,
                    item_height: 32
                },
                [
                    obj,
                    { icon: "fs-gear-icon", tooltip: "Settings",  on_click: function () {
                            _updateSliceSettingsDialog(play_position_marker, true);
                        }},
                    { icon: "fs-cross-45-icon", tooltip: "Delete",  on_click: function () {
                            _removePlayPositionMarker(play_position_marker_element.dataset.slice, true, true);
                        } }
                ]);

            return false;
        }, false);
    
    _createMarkerSettings(play_position_marker);  
    
    if (submit) {
        _submitAddSlice(x, shift, mute);
    }
};

var _createChannelSettingsDialog = function (input_channel_id) {
    var dialog_element = document.createElement("div"),
        content_element = document.createElement("div"),
        
        fragment_input_channel = _fragment_input_data[input_channel_id],
        
        channel_filter_select,
        channel_wrap_s_select,
        channel_wrap_t_select,
        channel_vflip,
    
        channel_settings_dialog,
        
        tex_parameter,
        
        power_of_two_wrap_options = '<option value="repeat">repeat</option>' +
                                    '<option value="mirror">mirrored repeat</option>';
    
    dialog_element.id = "fs_channel_settings_dialog";
    
    if (!_gl2) { // WebGL 2 does not have those limitations
        if (!_isPowerOf2(fragment_input_channel.image.width) || !_isPowerOf2(fragment_input_channel.image.height) || fragment_input_channel.type === 1) {
            power_of_two_wrap_options = "";
        }
    }
    
    dialog_element.style.fontSize = "13px";
    
    // create setting widgets
    content_element.innerHTML = '&nbsp;&nbsp;<div><div class="fs-input-settings-label">Filter:</div>&nbsp;<select id="fs_channel_filter">' +
                                '<option value="nearest">nearest</option>' +
                                '<option value="linear">linear</option>' +
                                '</select></div>' +
                                '&nbsp;&nbsp;<div><div class="fs-input-settings-label">Wrap S:</div>&nbsp;<select id="fs_channel_wrap_s">' +
                                '<option value="clamp">clamp</option>' +
                                    power_of_two_wrap_options +
                                '</select></div>' +
                                '&nbsp;&nbsp;<div><div class="fs-input-settings-label">Wrap T:</div>&nbsp;<select id="fs_channel_wrap_t">' +
                                '<option value="clamp">clamp</option>' +
                                    power_of_two_wrap_options +
                                '</select></div>' +
                                '&nbsp;&nbsp;<div><label><div class="fs-input-settings-label">VFlip:</div>&nbsp;<input id="fs_channel_vflip" value="No" type="checkbox"></label></div>';
    
    dialog_element.appendChild(content_element);
    
    document.body.appendChild(dialog_element);
    
    channel_filter_select = document.getElementById("fs_channel_filter");
    channel_wrap_s_select = document.getElementById("fs_channel_wrap_s");
    channel_wrap_t_select = document.getElementById("fs_channel_wrap_t");
    channel_vflip = document.getElementById("fs_channel_vflip");
    
    _gl.bindTexture(_gl.TEXTURE_2D, fragment_input_channel.texture);
    
    if (_gl.getTexParameter(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER) === _gl.NEAREST) {
        channel_filter_select.value = "nearest";
    }
    
    tex_parameter = _gl.getTexParameter(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S);
    
    if (tex_parameter === _gl.CLAMP_TO_EDGE) {
        channel_wrap_s_select.value = "clamp";
    } else if (tex_parameter === _gl.REPEAT) {
        channel_wrap_s_select.value = "repeat";
    } else if (tex_parameter === _gl.MIRRORED_REPEAT) {
        channel_wrap_s_select.value = "mirror";
    }
    
    tex_parameter = _gl.getTexParameter(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T);
    
    if (tex_parameter === _gl.CLAMP_TO_EDGE) {
        channel_wrap_t_select.value = "clamp";
    } else if (tex_parameter === _gl.REPEAT) {
        channel_wrap_t_select.value = "repeat";
    } else if (tex_parameter === _gl.MIRRORED_REPEAT) {
        channel_wrap_t_select.value = "mirror";
    }
    
    if (fragment_input_channel.flip) {
        channel_vflip.checked = true;
    } else {
        channel_vflip.checked = false;
    }
    
    if (fragment_input_channel.type === 1) {
        _flipYTexture(fragment_input_channel.texture, fragment_input_channel.flip);
    }
    
    channel_filter_select.addEventListener("change", function () {
            _setTextureFilter(fragment_input_channel.texture, this.value);
        });
    
    channel_wrap_s_select.addEventListener("change", function () {
            _setTextureWrapS(fragment_input_channel.texture, this.value);
        });
    
    channel_wrap_t_select.addEventListener("change", function () {
            _setTextureWrapT(fragment_input_channel.texture, this.value);
        });
    
    channel_vflip.addEventListener("change", function () {
            if (fragment_input_channel.type === 1) {
                _flipYTexture(fragment_input_channel.texture, !fragment_input_channel.flip);
            } else {
                var new_texture = _flipTexture(fragment_input_channel.texture, fragment_input_channel.image);
        
                fragment_input_channel.texture = new_texture;
            }
            fragment_input_channel.flip = !fragment_input_channel.flip;
        });
    
    channel_settings_dialog = WUI_Dialog.create(dialog_element.id, {
        title: _input_channel_prefix + input_channel_id + " settings",

        width: "200px",
        height: "230px",

        halign: "center",
        valign: "center",

        open: true,
        minimized: false,

        on_close: function () {
            WUI_Dialog.destroy(channel_settings_dialog);
        },

        modal: true,
        status_bar: false,

        closable: true,
        draggable: true,
        minimizable: false,

        resizable: false,

        detachable: false,

        min_width: 200,
        min_height: 250
    });
};

var _showControlsDialog = function () {
    WUI_Dialog.open(_controls_dialog, true);
};

var _showHelpDialog = function () {
    WUI_Dialog.open(_help_dialog);
};

var _showSettingsDialog = function () {
    WUI_Dialog.open(_settings_dialog);
};

var _showMIDISettingsDialog = function () {
    WUI_Dialog.open(_midi_settings_dialog);
};

var _showMIDIOutDialog = function () {
    WUI_Dialog.open(_midi_out_dialog);
};

var _updateSliceSettingsDialog = function (slice_obj, show) {
    var slice_settings_container = document.getElementById("slice_settings_container_" + slice_obj.element.dataset.slice),
        
        fs_slice_settings_dialog_content_div = document.getElementById("fs_slice_settings_dialog"),
        
        slice_settings_nodes = fs_slice_settings_dialog_content_div.querySelectorAll('*[id^="slice_settings_container_"]'),
        
        i = 0;
    
    WUI_Dialog.setStatusBarContent(_slice_settings_dialog, "Slice " + slice_obj.element.dataset.slice);
    
    _selected_slice = slice_obj;
    
    for (i = 0; i < slice_settings_nodes.length; i += 1) {
        slice_settings_nodes[i].style = "display: none";
    }
    
    slice_settings_container.style = "";
    
    
    //WUI_RangeSlider.setValue("fs_slice_shift_input", _selected_slice.shift);
    //WUI_RangeSlider.setValue("fs_slice_min_input", _selected_slice.min);
    //WUI_RangeSlider.setValue("fs_slice_max_input", _selected_slice.max);
    
    if (show) {
        WUI_Dialog.open(_slice_settings_dialog);
    }
};

var _getControlsChangeFn = function (value_fn, name, index, count, comps) {
    return function (val) {
            var ctrl_obj = _controls[name],

                value = value_fn(val),
                
                comp_index;

            _shareCtrlsUpd(name, index, ctrl_obj.values[index], value);
        
            ctrl_obj.values[index] = value;

        /*
            if (comps) {
                comp_index = index * comps;
                
                value = ctrl_obj.values.slice(comp_index, comp_index + comps);
            }
        */
        
            _useProgram(_program);

            _setUniforms(_gl, ctrl_obj.type, _program, name, ctrl_obj.values, comps);
        /*
            if (ctrl_obj.values.length > 1 && ctrl_obj.values.length === count) {
                _setUniforms(_gl, ctrl_obj.type, _program, name, ctrl_obj.values);
            } else {
                _setUniform(_gl, ctrl_obj.type, _program, name, value);
            }
        */
        };
};

var _setControlsValue = function (name, index, value) {
    var ctrl = _controls[name],
        comps = 1;
    
    ctrl.values[index] = value;
    
    if (ctrl.comps) {
        comps = ctrl.comps;
    }
    
    WUI_RangeSlider.setValue(ctrl.ids[index * comps], value);
    
    _useProgram(_program);
    
    _setUniforms(_gl, ctrl.type, _program, name, ctrl.values, comps);
};

var _deleteControlsFn = function (name, ids) {
    return function (ev) {
        var i, ctrl_window, ctrl_group;

        for (i = 0; i < ids.length; i += 1) {
            WUI_RangeSlider.destroy(ids[i]);
        }
        
        _shareCtrlsDel(_controls[name]);

        delete _controls[name];
        
        ctrl_window = WUI_Dialog.getDetachedDialog(_controls_dialog);

        if (!ctrl_window) {
            ctrl_window = window;
        }
        
        ctrl_group = ctrl_window.document.getElementById("fs_controls_group_" + name);
        
        ctrl_group.parentElement.removeChild(ctrl_group);

        _compile();
    };
};

var _addControls = function (type, target_window, ctrl, params) {
    var ndocument = target_window.document,
        
        ctrl_name_input, ctrl_type_input, ctrl_array_size_input, ctrl_components_input, ctrl_mtype_input,
        ctrl_name, ctrl_type, ctrl_array_count, ctrl_components, ctrl_mtype,
        
        ctrls_panel_elem = ndocument.getElementById("fs_controls_panel"),
        ctrls_div,
        
        name_patt = /[a-zA-Z_]+[a-zA-Z0-9_]*/,
        size_patt = /[0-9]+/,
        
        delete_btn,
        
        div_text_node,
        
        div,
        div_ctrl_group,
        divs = [],
        
        count, 
        
        ids = [],
        
        opt = {
                width: 100,
                height: 8,

                step: "any",

                scroll_step: 1.0,

                vertical: false,

                midi: {
                    type: "rel"
                },

                bar: false,

                default_value: 0.0,
            
                value: 0.0,

                title_on_top: true,

                value_min_width: 48,

                configurable: {
                    min: { },
                    max: { },
                    step: { },
                    scroll_step: { }
                }
            },
        
        values,
        
        opts = [],
        
        controls = {},
        
        i, j, n;

    if (ctrl === undefined) {
        ctrl_name_input = ndocument.getElementById("fs_" + type + "_ctrl_name");
        ctrl_array_size_input = ndocument.getElementById("fs_" + type + "_ctrl_array_size");

        ctrl_type_input = ndocument.getElementById("fs_" + type + "_ctrl_type");
        ctrl_type = ctrl_type_input.value;
        
        ctrl_mtype_input = ndocument.getElementById("fs_" + type + "_ctrl_mtype");
        ctrl_mtype = ctrl_mtype_input.value;

        //ctrls_div = ctrl_name_input.parentElement;

        ctrl_name = ctrl_name_input.value;
        ctrl_array_count = ctrl_array_size_input.value;

        count = parseInt(ctrl_array_count, 10);

        if (!name_patt.test(ctrl_name)) {
            _notification("Invalid " + type + " input name, should start by a letter or underscore followed by any letters/underscore/numbers.");
            return;
        }

        if (!size_patt.test(ctrl_array_count) || count < 1) {
            _notification("Invalid " + type + " count, should be a positive number.");
            return;
        }

        if (_controls[ctrl_name]) {
            _notification("Input name already taken.");
            return;
        }
        
        ctrl_components_input = ndocument.getElementById("fs_" + type + "_ctrl_comps");
        if (ctrl_components_input) {
            ctrl_components = parseInt(ctrl_components_input.value, 10);
/*
            if (!size_patt.test(ctrl_components_input.value) || (ctrl_components < 2 && ctrl_components > 4)) {
                _notification("Invalid " + type + " components, should be number 2, 3 or 4.");
                return;
            }
*/          
            values = new Array(count * ctrl_components);
        } else {
            values = new Array(count);
        }
        
        for (i = 0; i < values.length; i += 1) {
            values[i] = 0.0;
        }
        
        ctrl_name_input.value = "";
    } else {
        ctrl_type = type;
        ctrl_name = ctrl.name;
        count = ctrl.count;
        ctrl_components = ctrl.comps;
        ctrl_mtype = ctrl.mtype;
        
        values = ctrl.values;
    }
    
    opt.midi.type = ctrl_mtype;

    delete_btn = ndocument.createElement("div");
    div = ndocument.createElement("div");
    div.className = "fs-controls-group";
    div.id = "fs_controls_group_" + ctrl_name;
    div_ctrl_group = ndocument.createElement("div");
    div_ctrl_group.className = "fs-controls-group-elems";
    
    delete_btn.className = "wui-dialog-btn fs-cross-45-icon fs-delete-controls";
    delete_btn.title = "delete";

    div.appendChild(delete_btn);
    
    if (ctrl_components) {
        for (i = 0; i < count; i += 1) {
            for (j = 0; j < ctrl_components; j += 1) {
                n = i * ctrl_components + j;
                
                opts[n] = JSON.parse(JSON.stringify(opt));
                
                opts[n].default_value = values[n];
                opts[n].value = opts[n].default_value;

                divs[n] = ndocument.createElement("div");
                divs[n].style.width = "180px";
                divs[n].id = "fs_control_" + ctrl_name + "_c" + i + "_c" + j;
                
                ids.push(divs[n].id);
                
                opts[n].title = ctrl_name + ((count > 1) ? "[" + i + "]" + "[" + j + "]" : " [" + j + "]");
                
                div_ctrl_group.appendChild(divs[n]);
            }
        }
        
        if (count > 1) {
            div_text_node = ndocument.createTextNode("Array (Vector (" + ctrl_type + "))");
        } else {
            div_text_node = ndocument.createTextNode("Vector (" + ctrl_type + ")");
        }
    } else {
        for (i = 0; i < count; i += 1) {
            opts[i] = JSON.parse(JSON.stringify(opt));
            
            opts[i].default_value = values[i];
            opts[i].value = opts[i].default_value;
            
            divs[i] = ndocument.createElement("div");
            divs[i].style.width = "180px";
            divs[i].id = "fs_control_" + ctrl_name + "_c" + i;
            
            ids.push(divs[i].id);

            opts[i].title = ctrl_name + ((count > 1) ? "[" + i + "]" : " (" + ctrl_type + ")");

            div_ctrl_group.appendChild(divs[i]);
        }
        
        if (count > 1) {
            div_text_node = ndocument.createTextNode("Array (" + ctrl_type + ")");
        }
    }
    
    if (div_text_node) {
        div.appendChild(div_text_node);
    }
    
    div.appendChild(div_ctrl_group);
    
    if (ctrl_type === "bool") {
        for (i = 0; i < count; i += 1) {
            opts[i].step = 1;
            opts[i].min = 0;
            opts[i].max = 1;
            opts[i].on_change = _getControlsChangeFn(_parseInt10, ctrl_name, i, count);
        }
    } else if (ctrl_type === "int") {
        for (i = 0; i < count; i += 1) {
            opts[i].step = 1;
            if (ctrl_mtype === "abs") {
                opts[i].min = 0;
                opts[i].max = 127;
            }
            opts[i].on_change = _getControlsChangeFn(_parseInt10, ctrl_name, i, count);
        }
    } else if (ctrl_type === "uint") {
        for (i = 0; i < count; i += 1) {
            opts[i].min = 0;
            if (ctrl_mtype === "abs") {
                opts[i].max = 127;
            } else {
                opts[i].max = 4294967295;
            }
            opts[i].step = 1;
            opts[i].on_change = _getControlsChangeFn(_parseInt10, ctrl_name, i, count);
        }
    } else if (ctrl_type === "float") {
        for (i = 0; i < count; i += 1) {
            if (ctrl_mtype === "abs") {
                opts[i].min = 0.0;
                opts[i].max = 127.0;
            }
            opts[i].on_change = _getControlsChangeFn(parseFloat, ctrl_name, i, count);
        }
    } else if (ctrl_type === "bvec") {
        for (i = 0; i < count; i += 1) {
            for (j = 0; j < ctrl_components; j += 1) {
                n = i * ctrl_components + j;
                
                opts[n].step = 1;
                opts[n].min = 0;
                opts[n].max = 1;
                
                opts[n].on_change = _getControlsChangeFn(_parseInt10, ctrl_name, n, count, ctrl_components);
            }
        }
    } else if (ctrl_type === "ivec") {
        for (i = 0; i < count; i += 1) {
            for (j = 0; j < ctrl_components; j += 1) {
                n = i * ctrl_components + j;
                
                if (ctrl_mtype === "abs") {
                    opts[n].min = 0;
                    opts[n].max = 127;
                }
                
                opts[n].step = 1;
                opts[n].on_change = _getControlsChangeFn(_parseInt10, ctrl_name, n, count, ctrl_components);
            }
        }
    } else if (ctrl_type === "uvec") {
        for (i = 0; i < count; i += 1) {
            for (j = 0; j < ctrl_components; j += 1) {
                n = i * ctrl_components + j;
                
                opts[n].min = 0;
                if (ctrl_mtype === "abs") {
                    opts[n].max = 127;
                } else {
                    opts[n].max = 4294967295;
                }
                opts[n].step = 1;
                
                opts[n].on_change = _getControlsChangeFn(_parseInt10, ctrl_name, n, count, ctrl_components);
            }
        }
    } else if (ctrl_type === "vec") {
        for (i = 0; i < count; i += 1) {
            for (j = 0; j < ctrl_components; j += 1) {
                n = i * ctrl_components + j;
                
                if (ctrl_mtype === "abs") {
                    opts[n].min = 0.0;
                    opts[n].max = 127.0;
                }
                
                opts[n].on_change = _getControlsChangeFn(parseFloat, ctrl_name, n, count, ctrl_components);
            }
        }
    } else {
        _notification("Type not implemented yet.");
        return;
    }
    
    if (ctrl_components) {
        for (i = 0; i < count; i += 1) {
            for (j = 0; j < ctrl_components; j += 1) {
                n = i * ctrl_components + j;
                
                WUI_RangeSlider.create(divs[n], opts[n]);
                
                if (params) {
                    WUI_RangeSlider.setParameters(ids[n], params[n]);
                }
            }
        }
    } else {
        for (i = 0; i < count; i += 1) {
            WUI_RangeSlider.create(divs[i], opts[i]);
            
            if (params) {
                WUI_RangeSlider.setParameters(ids[i], params[i]);
            }
        } 
    }
    
    ctrls_panel_elem.appendChild(div);
    
    delete_btn.addEventListener("click", _deleteControlsFn(ctrl_name, ids));
    
    controls.name = ctrl_name;
    controls.type = ctrl_type;
    controls.mtype = ctrl_mtype;
    controls.count = count;
    controls.comps = ctrl_components;
    controls.values = values;
    controls.ids = ids;
    
    _controls[ctrl_name] = controls;
    
    if (ctrl === undefined || ctrl["nosync"] === undefined) {
        _shareCtrlsAdd(controls);
    }
    
    _compile();
};

var _buildControls = function (ctrl_obj) {
    var key, i,
        params = [],
        ctrl, ctrl_window;
    
    ctrl_window = WUI_Dialog.getDetachedDialog(_controls_dialog);
    
    if (!ctrl_window) {
        ctrl_window = window;
    }

    for(key in ctrl_obj) {
        ctrl = ctrl_obj[key];
        
        if (ctrl.ids) {
            for (i = 0; i < ctrl.ids.length; i += 1) {
                params[i] = WUI_RangeSlider.getParameters(ctrl.ids[i]);
                WUI_RangeSlider.destroy(ctrl.ids[i]);
            }
        }
        
        ctrl.nosync = "";
        
        _addControls(ctrl.type, ctrl_window, ctrl, params);
    }
};

var _toggleFas = function (toggle_ev) {
    if (toggle_ev.state) {
        document.getElementById("fs_fas_status").style = "";
        
        _fasEnable();
        
        _stopOscillators();
        
        _disconnectScriptNode();
    } else {
        document.getElementById("fs_fas_status").style = "display: none";
        
        _fasDisable();

        if (_fs_state === 0) {
            _connectScriptNode();
        }
    }
};

var _toggleGridInfos = function (toggle_ev) {
    if (toggle_ev.state) {
        _xyf_grid = true;
    } else {
        _xyf_grid = false;
    }
};

var _toggleDetachCodeEditor = function (toggle_ev) {
    if (toggle_ev.state) {
        _undock_code_editor = true;
        
        _code_editor_element.style.display = "none";
    } else {
        _undock_code_editor = false;
        
        _code_editor_element.style.display = "";
    }
};

var _showSpectrumDialog = function () {
    var analysis_dialog_content = document.getElementById(_analysis_dialog_id).childNodes[2];
    
    _analysis_canvas = document.createElement("canvas");
    _analysis_canvas_ctx = _analysis_canvas.getContext('2d');
    
    _analysis_canvas_tmp = document.createElement("canvas");
    _analysis_canvas_tmp_ctx = _analysis_canvas_tmp.getContext('2d');
    
    _analysis_canvas.width = 380;
    _analysis_canvas.height = 380;
    
    _analysis_canvas_tmp.width = _analysis_canvas.width;
    _analysis_canvas_tmp.height = _analysis_canvas.height;
    
    analysis_dialog_content.innerHTML = "";
    analysis_dialog_content.appendChild(_analysis_canvas);
    
    _connectAnalyserNode();
    
    WUI_Dialog.open(_analysis_dialog);
};

var _showRecordDialog = function () {
    if (_record) {
        _record = false;
        
        WUI_Dialog.close(_record_dialog);
    } else {
        _record = true;
        
        WUI_Dialog.open(_record_dialog);
    }
};

var _onImportDialogClose = function () {
    WUI_ToolBar.toggle(_wui_main_toolbar, 15);
    
    WUI_Dialog.close(_import_dialog);
};

var _onRecordDialogClose = function () {
    WUI_ToolBar.toggle(_wui_main_toolbar, 7);
};

var _showOutlineDialog = function () {
    WUI_Dialog.open(_outline_dialog);
};

var _showImportDialog = function () {
    WUI_Dialog.open(_import_dialog);
};

var _toggleAdditiveRecord = function () {
    if (_record_opts.additive) {
        _record_opts.additive = false;
    } else {
        _record_opts.additive = true;
    }
};

var _saveRecord = function () {
    window.open(_record_canvas.toDataURL('image/png'));
};

var _renderRecord = function () {
    if (_fs_state) {
        _exportImage(_record_canvas_ctx.getImageData(0, 0, _record_canvas.width, _record_canvas.height));
    }
};

/***********************************************************
    Init.
************************************************************/

var _uiInit = function () {
    // there is an easier way of handling this, it may don't scale at all in the future!
    var settings_ck_globaltime_elem = document.getElementById("fs_settings_ck_globaltime"),
        settings_ck_polyinfos_elem = document.getElementById("fs_settings_ck_polyinfos"),
        settings_ck_oscinfos_elem = document.getElementById("fs_settings_ck_oscinfos"),
        settings_ck_hlmatches_elem = document.getElementById("fs_settings_ck_hlmatches"),
        settings_ck_lnumbers_elem = document.getElementById("fs_settings_ck_lnumbers"),
        settings_ck_xscrollbar_elem = document.getElementById("fs_settings_ck_xscrollbar"),
        settings_ck_wavetable_elem = document.getElementById("fs_settings_ck_wavetable"),
        settings_ck_monophonic_elem = document.getElementById("fs_settings_ck_monophonic"),
        settings_ck_feedback_elem = document.getElementById("fs_settings_ck_feedback"),
        settings_ck_exted_elem = document.getElementById("fs_settings_ck_exted"),
        settings_ck_slicebar_elem = document.getElementById("fs_settings_ck_slicebar"),
        settings_ck_slices_elem = document.getElementById("fs_settings_ck_slices"),
        
        fs_settings_max_polyphony = localStorage.getItem('fs-max-polyphony'),
        fs_settings_osc_fadeout = localStorage.getItem('fs-osc-fadeout'),
        fs_settings_show_globaltime = localStorage.getItem('fs-show-globaltime'),
        fs_settings_show_polyinfos = localStorage.getItem('fs-show-polyinfos'),
        fs_settings_show_oscinfos = localStorage.getItem('fs-show-oscinfos'),
        fs_settings_show_slicebar = localStorage.getItem('fs-show-slicebar'),
        fs_settings_hlmatches = localStorage.getItem('fs-editor-hl-matches'),
        fs_settings_lnumbers = localStorage.getItem('fs-editor-show-linenumbers'),
        fs_settings_xscrollbar = localStorage.getItem('fs-editor-advanced-scrollbar'),
        fs_settings_wavetable = localStorage.getItem('fs-use-wavetable'),
        fs_settings_monophonic = localStorage.getItem('fs-monophonic'),
        fs_settings_feedback = localStorage.getItem('fs-feedback'),
        fs_settings_exted = localStorage.getItem('fs-exted');
    
    _settings_dialog = WUI_Dialog.create(_settings_dialog_id, {
            title: "Session & global settings",

            width: "320px",
            height: "418px",

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: false,
            draggable: true
        });
    
    if (fs_settings_monophonic === "true") {
        _audio_infos.monophonic = true;
        settings_ck_monophonic_elem.checked = true;
    } else {
        _audio_infos.monophonic = false;
        settings_ck_monophonic_elem.checked = false;
    }
    
    if (fs_settings_exted === "true") {
        settings_ck_exted_elem.checked = true;
    } else {
        settings_ck_exted_elem.checked = false;
    }
    
    if (fs_settings_feedback === "true") {
        _feedback.enabled = true;
        settings_ck_feedback_elem.checked = true;
    } else if (fs_settings_feedback === null) {
        if (_feedback.enabled) {
            settings_ck_feedback_elem.checked = true;
        } else {
            settings_ck_feedback_elem.checked = false;
        }
    } else {
        _feedback.enabled = false;
        settings_ck_feedback_elem.checked = false;
    }
    
    if (fs_settings_osc_fadeout) {
        _osc_fadeout = parseFloat(fs_settings_osc_fadeout);
    }
    
    if (fs_settings_max_polyphony) {
        _keyboard.polyphony_max = _parseInt10(fs_settings_max_polyphony);
    }
    
    if (fs_settings_wavetable === "true") {
        _osc_mode = _FS_WAVETABLE;
        settings_ck_wavetable_elem.checked = true;
    } else {
        _osc_mode = _FS_OSC_NODES;
        settings_ck_wavetable_elem.checked = false;
    }
    
    if (fs_settings_show_globaltime !== null) {
        _show_globaltime = (fs_settings_show_globaltime === "true");
    }
    
    if (fs_settings_show_oscinfos !== null) {
        _show_oscinfos = (fs_settings_show_oscinfos === "true");
    }
    
    if (fs_settings_show_polyinfos !== null) {
        _show_polyinfos = (fs_settings_show_polyinfos === "true");
    }

    if (fs_settings_show_slicebar !== null) {
        _show_slicebar = (fs_settings_show_slicebar === "true");
    }

    if (fs_settings_hlmatches !== null) {
        _cm_highlight_matches = (fs_settings_hlmatches === "true");
    }
        
    if (fs_settings_lnumbers !== null) {
        _cm_show_linenumbers = (fs_settings_lnumbers === "true");
    }
        
    if (fs_settings_xscrollbar !== null) {
        _cm_advanced_scrollbar = (fs_settings_xscrollbar === "true");
    }
    
    if (_cm_advanced_scrollbar) {
        settings_ck_xscrollbar_elem.checked = true;
    } else {
        settings_ck_xscrollbar_elem.checked = false;
    }
    
    if (_show_oscinfos) {
        settings_ck_oscinfos_elem.checked = true;
    } else {
        settings_ck_oscinfos_elem.checked = false;
    }
    
    if (_show_polyinfos) {
        settings_ck_polyinfos_elem.checked = true;
    } else {
        settings_ck_polyinfos_elem.checked = false;
    }

    if (_show_globaltime) {
        settings_ck_globaltime_elem.checked = true;
    } else {
        settings_ck_globaltime_elem.checked = false;
    }
    
    if (_cm_highlight_matches) {
        settings_ck_hlmatches_elem.checked = true;
    } else {
        settings_ck_hlmatches_elem.checked = false;
    }
    
    if (_cm_show_linenumbers) {
        settings_ck_lnumbers_elem.checked = true;
    } else {
        settings_ck_lnumbers_elem.checked = false;
    }
    
    if (_show_slicebar) {
        settings_ck_slicebar_elem.checked = true;
    } else {
        settings_ck_slicebar_elem.checked = false;
    }
    
    settings_ck_monophonic_elem.addEventListener("change", function () {
            if (this.checked) {
                _audio_infos.monophonic = true;
            } else {
                _audio_infos.monophonic = false;
            }
        
            localStorage.setItem('fs-monophonic', this.checked);
        });

    settings_ck_feedback_elem.addEventListener("change", function () {
            if (this.checked) {
                _feedback.enabled = true;
            } else {
                _feedback.enabled = false;
            }
        
            localStorage.setItem('fs-feedback', this.checked);
        
            _buildFeedback();
        });
    
    settings_ck_exted_elem.addEventListener("change", function () {
            localStorage.setItem('fs-exted', this.checked);
        
            //_notification("Reload the page for the external editor change to take effect", 10000);
        });
    
    settings_ck_wavetable_elem.addEventListener("change", function () {
            if (this.checked) {
                _osc_mode = _FS_WAVETABLE;
                _stopOscillators();
                _connectScriptNode();
            } else {
                _osc_mode = _FS_OSC_NODES;
                _disconnectScriptNode();
            }
        
            localStorage.setItem('fs-use-wavetable', this.checked);
        });
    
    settings_ck_oscinfos_elem.addEventListener("change", function () {
            _show_oscinfos = this.checked;
        
            if (!_show_oscinfos) {
                _osc_infos.innerHTML = "";
            }
        
            localStorage.setItem('fs-show-oscinfos', _show_oscinfos);
        });
    
    settings_ck_polyinfos_elem.addEventListener("change", function () {
            _show_polyinfos = this.checked;
        
            if (!_show_polyinfos) {
                _poly_infos_element.innerHTML = "";
            }
        
            localStorage.setItem('fs-show-polyinfos', _show_polyinfos);
        });
    
    settings_ck_slicebar_elem.addEventListener("change", function () {
            var elements = document.getElementsByClassName("play-position-marker"),
                i = 0;
        
            _show_slicebar = this.checked;
        
            if (!_show_slicebar) {
                for(i = elements.length - 1; i >= 0; --i) {
                    elements[i].classList.remove("play-position-marker-bar");
                }   
            } else {
                for(i = elements.length - 1; i >= 0; --i) {
                    elements[i].classList.add("play-position-marker-bar");
                } 
            }
        
            localStorage.setItem('fs-show-slicebar', _show_slicebar);
        });
    
    settings_ck_slices_elem.addEventListener("change", function () {
            var elements = document.getElementsByClassName("play-position-marker"),
                i = 0;
        
            if (!this.checked) {
                for(i = elements.length - 1; i >= 0; --i) {
                    elements[i].classList.add("fs-hide");
                }   
            } else {
                for(i = elements.length - 1; i >= 0; --i) {
                    elements[i].classList.remove("fs-hide");
                } 
            }
        });

    settings_ck_globaltime_elem.addEventListener("change", function () {
            _show_globaltime = this.checked;
        
            if (!_show_globaltime) {
                _time_infos.innerHTML = "";
            }
        
            localStorage.setItem('fs-show-globaltime', _show_globaltime);
        });
    
    settings_ck_hlmatches_elem.addEventListener("change", function () {
            _cm_highlight_matches = this.checked;
        
            if (_cm_highlight_matches) {
                _code_editor_settings.highlightSelectionMatches = _code_editor_highlight;
                
                _code_editor.setOption("highlightSelectionMatches", _code_editor_highlight);
            } else {
                delete _code_editor_settings.highlightSelectionMatches;
                
                _code_editor.setOption("highlightSelectionMatches", null);
            }
        
            localStorage.setItem('fs-editor-hl-matches', _cm_highlight_matches);
        });

    settings_ck_lnumbers_elem.addEventListener("change", function () {
            _cm_show_linenumbers = this.checked;
        
            _code_editor_settings.lineNumbers = _cm_show_linenumbers;
        
            _code_editor.setOption("lineNumbers", _cm_show_linenumbers);
        
            localStorage.setItem('fs-editor-show-linenumbers', _cm_show_linenumbers);
        });
    
    settings_ck_xscrollbar_elem.addEventListener("change", function () {
            _cm_advanced_scrollbar = this.checked;
        
            if (_cm_advanced_scrollbar) {
                _code_editor_settings.scrollbarStyle = "overlay";
                
                _code_editor.setOption("scrollbarStyle", "overlay");
            } else {
                _code_editor_settings.scrollbarStyle = "native";
                
                _code_editor.setOption("scrollbarStyle", "native");
            }
        
            localStorage.setItem('fs-editor-advanced-scrollbar', _cm_advanced_scrollbar);
        });
    settings_ck_wavetable_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_oscinfos_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_polyinfos_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_globaltime_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_hlmatches_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_lnumbers_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_xscrollbar_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_monophonic_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_feedback_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_exted_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_slicebar_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_slices_elem.dispatchEvent(new UIEvent('change'));
    
    _midi_settings_dialog = WUI_Dialog.create(_midi_settings_dialog_id, {
            title: "MIDI settings",

            width: "320px",
            height: "390px",

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: false,
            draggable: true
        });
    
    _record_dialog = WUI_Dialog.create(_record_dialog_id, {
            title: "Recording...",

            width: "auto",
            height: "auto",

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: false,
            draggable: true,
        
            on_close: _onRecordDialogClose
        });
    
    _import_dialog = WUI_Dialog.create(_import_dialog_id, {
            title: "Import input (image, audio, webcam)",

            width: "380px",
            height: "490px",

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: true,
            draggable: true,
        
            on_close: _onImportDialogClose
        });
    
    WUI_ToolBar.create("fs_import_toolbar", {
                allow_groups_minimize: false
            },
            {
                acts: [
                    {
                        icon: "fs-image-file-icon",
                        on_click: (function () { _loadFile("image")(); }),
                        tooltip: "Image",
                        text: "Image"
                    },
                    {
                        icon: "fs-audio-file-icon",
                        on_click: (function () { _loadFile("audio")(); }),
                        tooltip: "Audio",
                        text: "Audio"
                    },
                    {
                        icon: "fs-camera-icon",
                        on_click: (function () { _addFragmentInput("camera"); }),
                        tooltip: "Webcam",
                        text: "Webcam"
                    }
                ]
            });
    
    _outline_dialog = WUI_Dialog.create(_outline_dialog_id, {
            title: "GLSL Outline",

            width: "380px",
            height: "700px",

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: true,
            draggable: true
        });

    _analysis_dialog = WUI_Dialog.create(_analysis_dialog_id, {
            title: "Audio analysis",

            width: "380px",
            height: "380px",

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: false,
            draggable: true,
        
            on_close: _disconnectAnalyserNode
        });
    
    _help_dialog = WUI_Dialog.create(_help_dialog_id, {
            title: "Fragment - Help",

            width: "380px",
            height: "605px",

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: true,
            draggable: true
        });

    _slice_settings_dialog = WUI_Dialog.create(_slice_settings_dialog_id, {
            title: "Slice settings",

            width: "320px",
            height: "200px",

            halign: "center",
            valign: "center",

            open: false,

            detachable: false,

            status_bar: true,
            draggable: true
        });

    _controls_dialog = WUI_Dialog.create(_controls_dialog_id, {
            title: "Controls input",

            width: "50%",
            height: "50%",

            halign: "center",
            valign: "center",

            on_pre_detach: function () {
                var ctrl_panel_element = document.getElementById("fs_controls_panel"),
                    nodes, i;

                if (ctrl_panel_element.firstElementChild) {
                    nodes = ctrl_panel_element.firstElementChild.lastElementChild.childNodes;

                    for (i = 0; i < nodes.length; i += 1) {
                        WUI_RangeSlider.destroy(nodes[i].id);
                    }

                    ctrl_panel_element.innerHTML = "";
                }
            },

            on_detach: function (new_window) {
                var ndocument = new_window.document,
                    ctrl_scalars_add_btn = ndocument.getElementById("fs_scalars_ctrl_add"),
                    ctrl_vectors_add_btn = ndocument.getElementById("fs_vectors_ctrl_add");
                    //ctrl_matrices_add_btn = ndocument.getElementById("fs_matrices_ctrl_add");

                new_window.document.body.style.overflow = "auto";

                _controls_dialog_element = ndocument.getElementById(_controls_dialog_id);

                ctrl_scalars_add_btn.addEventListener("click",  function (ev) { _addControls("scalars", new_window);  });
                ctrl_vectors_add_btn.addEventListener("click",  function (ev) { _addControls("vectors", new_window);  });
                //ctrl_matrices_add_btn.addEventListener("click", function (ev) { _addControls("matrices", ev); });

                _buildControls(_controls);
            },

            open: false,

            status_bar: false,
            detachable: true,
        });

    WUI_ToolBar.create("fs_record_toolbar", {
                allow_groups_minimize: false
            },
            {
                opts: [
                    {
                        icon: "fs-plus-symbol-icon",
                        type: "toggle",
                        toggle_state: false,
                        on_click: _toggleAdditiveRecord,
                        tooltip: "Additive",
                        toggle_group: 0
                    }
                ],
                acts: [
                    {
                        icon: "fs-save-icon",
                        on_click: _saveRecord,
                        tooltip: "Save as PNG"
                    }/*,
                    {
                        icon: "fs-record-icon",
                        on_click: _renderRecord,
                        tooltip: "Render audio"
                    }*/
                ]
            });

    _wui_main_toolbar = WUI_ToolBar.create("fs_middle_toolbar", {
            allow_groups_minimize: false
        },
        {
            help: [
                {
                    icon: "fs-help-icon",
                    on_click: _showHelpDialog,
                    tooltip: "Help"
                }
            ],
            social: [
                {
                    icon: "fs-discuss-icon",
                    on_click: function () {
                        WUI_Dialog.open(_discuss_dialog_id);
                    },
                    tooltip: "Session chat"
                },
                {
                    icon: "fs-board-icon",
                    on_click: function () {
                        window.open("https://quiet.fsynth.com", '_blank');
                    },
                    tooltip: "Message board"
                }
            ],
            settings: [
                {
                    icon: "fs-gear-icon",
                    on_click: _showSettingsDialog,
                    tooltip: "Settings"
                },
                {
                    icon: "fs-midi-icon",
                    on_click: _showMIDISettingsDialog,
                    tooltip: "MIDI Settings"
                }
            ],
            audio: [
                {
                    icon: "fs-reset-icon",
                    on_click: _rewind,
                    tooltip: "Rewind (globalTime = 0)"
                },
                {
                    icon: "fs-pause-icon",
                    type: "toggle",
                    toggle_state: (_fs_state === 1 ? true : false),
                    on_click: _togglePlay,
                    tooltip: "Play/Pause"
                },
                {
                    icon: "fs-record-icon",
                    type: "toggle",
                    toggle_state: false,
                    on_click: _showRecordDialog,
                    tooltip: "Record"
                },
                {
                    icon: "fs-fas-icon",
                    type: "toggle",
                    toggle_state: _fasEnabled(),
                    on_click: _toggleFas,
                    tooltip: "Enable/Disable Native audio (native application available on the homepage)"
                }
            ],
            opts: [
                {
                    icon: "fs-shadertoy-icon",

                    toggle_state: false,

                    tooltip: "Convert Shadertoy shader",

                    on_click: function () {
                        var input_code  = _code_editor.getValue(),
                            output_code = input_code;

                        output_code = output_code.replace(/void\s+mainImage\s*\(\s*out\s+vec4\s*[a-zA-Z]+,\s*(in)?\s+vec2\s+[a-zA-Z]+\s*\)/, "void main ()");
                        output_code = output_code.replace(/fragCoord/g, "gl_FragCoord");
                        output_code = output_code.replace(/fragColor/g, "gl_FragColor");
                        output_code = output_code.replace(/iResolution/g, "resolution");
                        output_code = output_code.replace(/iGlobalTime/g, "globalTime");
                        output_code = output_code.replace(/iMouse/g, "mouse");

                        _code_editor.setValue(output_code);

                        _compile();
                    }
                },
                {
                    icon: "fs-xyf-icon",
                    type: "toggle",
                    toggle_state: _xyf_grid,
                    on_click: _toggleGridInfos,
                    tooltip: "Hide/Show mouse hover axis grid"
                },
                {
                    icon: "fs-spectrum-icon",
                    on_click: _showSpectrumDialog,
                    tooltip: "Audio analysis dialog"
                },
                {
                    icon: "fs-function-icon",
                    on_click: _showOutlineDialog,
                    tooltip: "Outline"
                },
                {
                    icon: "fs-code-icon",
                    on_click: _detachCodeEditor,
                    tooltip: "Spawn a new editor into a separate window"
                }
            ],
    /*
            output: [
                {
                    icon: "fs-midi-out-icon",
                    on_click: _showMIDIOutDialog,
                    tooltip: "MIDI output"
                },
            ],
    */
            inputs: [
                {
                    icon: "fs-controls-icon",
                    on_click: _showControlsDialog,
                    tooltip: "Controllers input"
                },
                {
                    icon: _icon_class.plus,
                    type: "toggle",
                    on_click: _showImportDialog,
                    tooltip: "Import input"
/*
                    icon: _icon_class.plus,
    //                on_click: (function () { _loadImage(); }),
                    tooltip: "Add image",

                    type: "dropdown",

                    orientation: "s",

                    items: [
                        {
                            title: "Webcam",

                            on_click: (function () { _addFragmentInput("camera"); })
                        },
                        {
                            title: "Image",

                            on_click: _loadFile("image")
                        },
                        {
                            title: "Audio",

                            on_click: _loadFile("audio")
                        }
                    ]
*/
                }
            ]
        });

    WUI_RangeSlider.create("fs_score_width_input", {
            width: 120,
            height: 8,

            min: 0,

            bar: false,

            step: 1,
            scroll_step: 1,

            default_value: _canvas_width,
            value: _canvas_width,

            title: "Score width",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (new_width) { _updateScore({ width: new_width }, true); }
        });

    WUI_RangeSlider.create("fs_score_height_input", {
            width: 120,
            height: 8,

            min: 16,

            bar: false,

            step: 1,
            scroll_step: 1,

            default_value: _canvas_height,
            value: _canvas_height,

            title: "Score height (resolution)",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (new_height) { _updateScore({ height: new_height }, true); }
        });

    WUI_RangeSlider.create("fs_score_base_input", {
            width: 120,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 0.01,

            default_value: 16.34,
            value: 16.34,

            title: "Score base frequency",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (new_base_freq) { _updateScore({ base_freq: new_base_freq }, true); }
        });

    WUI_RangeSlider.create("fs_score_octave_input", {
            width: 120,
            height: 8,

            min: 1,

            bar: false,

            step: 1,
            scroll_step: 1,

            default_value: 10,
            value: 10,

            title: "Score octave range",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (new_range) { _updateScore({ octave: new_range }, true); }
        });
    
    WUI_RangeSlider.create("fs_settings_max_polyphony", {
            width: 120,
            height: 8,

            min: 1,
        
            bar: false,

            step: 1,
            scroll_step: 1,

            default_value: _keyboard.polyphony_max,
            value: _keyboard.polyphony_max,

            title: "Polyphony",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (polyphony) {
                if (polyphony <= 0) {
                    return;
                }
                
                _keyboard.polyphony_max = polyphony;
                
                localStorage.setItem('fs-max-polyphony', _keyboard.polyphony_max);
                
                _keyboard.data = [];
                
                _keyboard.data_length = _keyboard.polyphony_max * _keyboard.data_components;

                for (i = 0; i < _keyboard.data_length; i += 1) {
                    _keyboard.data[i] = 0;
                }
                
                _compile();
            }
        });
    
    WUI_RangeSlider.create("fs_settings_osc_fade_input", {
            width: 120,
            height: 8,

            min: 0.01,

            bar: false,

            step: 0.01,
            scroll_step: 0.01,

            default_value: _osc_fadeout,
            value: _osc_fadeout,

            title: "Osc. fadeout",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (new_fadeout) {
                if (new_fadeout <= 0) {
                    return;
                }
                
                _osc_fadeout = new_fadeout;
                
                localStorage.setItem('fs-osc-fadeout', _osc_fadeout);
            }
        });

    WUI_RangeSlider.create("mst_slider", {
            width: 100,
            height: 8,

            min: 0.0,
            max: 1.0,

            bar: false,

            step: "any",
            scroll_step: 0.01,

            midi: true,

            default_value: _volume,
            value: _volume,

            title: "Gain",

            title_min_width: 32,
            value_min_width: 48,

            on_change: function (value) {
                _local_session_settings.gain = value;
                _saveLocalSessionSettings();

                _setGain(value);

                _fasNotify(_FAS_GAIN_INFOS, _audio_infos);
            }
        });

    WUI_RangeSlider.create("fs_import_audio_winlength_settings", {
            width: 100,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 1024,

            midi: false,

            default_value: _audio_import_settings.window_length,
            value: _audio_import_settings.window_length,

            title: "Window length",

            title_min_width: 81,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.window_length = parseInt(value, 10);
            }
        });
    
    WUI_RangeSlider.create("fs_import_audio_overlap_settings", {
            width: 100,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 1024,

            midi: false,

            default_value: _audio_import_settings.overlap,
            value: _audio_import_settings.overlap,

            title: "Overlap",

            title_min_width: 81,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.overlap = parseInt(value, 10);
            }
        });
    
    WUI_RangeSlider.create("fs_import_audio_bpm_settings", {
            width: 100,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 1,

            midi: false,

            default_value: _audio_import_settings.bpm,
            value: _audio_import_settings.bpm,

            title: "BPM",

            title_min_width: 81,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.bpm = parseInt(value, 10);
            }
        });
    
    WUI_RangeSlider.create("fs_import_audio_ppb_settings", {
            width: 100,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 1,

            midi: false,

            default_value: _audio_import_settings.ppb,
            value: _audio_import_settings.ppb,

            title: "PPB",

            title_min_width: 81,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.ppb = parseInt(value, 10);
            }
        });
    
    WUI_RangeSlider.create("fs_import_audio_height_settings", {
            width: 100,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 1,

            midi: false,

            default_value: _audio_import_settings.height,
            value: _audio_import_settings.height,

            title: "Height",

            title_min_width: 81,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.height = parseInt(value, 10);
            }
        });
    
    WUI_RangeSlider.create("fs_import_audio_minfreq_settings", {
            width: 100,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 0.1,

            midi: false,

            default_value: _audio_import_settings.minfreq,
            value: _audio_import_settings.minfreq,

            title: "Min. freq.",

            title_min_width: 81,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.minfreq = value;
            }
        });
    
    WUI_RangeSlider.create("fs_import_audio_maxfreq_settings", {
            width: 100,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 0.1,

            midi: false,

            default_value: _audio_import_settings.maxfreq,
            value: _audio_import_settings.maxfreq,

            title: "Max. freq.",

            title_min_width: 81,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.maxfreq = value;
            }
        });
    
    // now useless, just safe to remove!
    _utterFailRemove();
};/* jslint browser: true */


/***********************************************************
    Fields.
************************************************************/

var _midi_access = null,
    
    _midi_devices = {
        input: {},
        output: {}
    },
    
    _midi_device_uid = 0;

/***********************************************************
    Functions.
************************************************************/

var _loadMIDISettings = function (midi_settings_json) {
    var midi_settings_obj,
        key, midi_device;
    
    if (!midi_settings_json) {
        return null;
    }
    
    try {
        midi_settings_obj = JSON.parse(midi_settings_json);
        
        for(key in midi_settings_obj.i) { 
            midi_device = midi_settings_obj.i[key];
            
            _midi_devices.input[key] = {
                    enabled: midi_device.enabled
                };
        }
    } catch (e) {
        _notification('_loadMIDISettings JSON message parsing failed : ' + e);
    }
};

var _saveMIDISettings = function () {
    var key, midi_device, midi_settings_obj = { i: {}, o: {}};
    
    for(key in _midi_devices.input) { 
        midi_device = _midi_devices.input[key];
        
        midi_settings_obj.i[key] = {
                enabled: midi_device.enabled
            };
    }
    
    _local_session_settings['midi_settings'] = JSON.stringify(midi_settings_obj);
    _saveLocalSessionSettings();
};

var _addMIDIDevice = function (midi_input) {
    var midi_input_element = document.createElement("div"),
        midi_input_enabled_ck_id = "fs_midi_settings_ck_" + _midi_device_uid,
        midi_settings_element = document.getElementById(_midi_settings_dialog_id).lastElementChild,
        midi_device_enabled = false,
        midi_device_enabled_ck = "";
    
    // settings were loaded previously
    if (midi_input.id in _midi_devices.input) {
        midi_device_enabled = _midi_devices.input[midi_input.id].enabled;
        if (midi_device_enabled) {
            midi_device_enabled_ck = "checked";
        }
        
        if (_midi_devices.input[midi_input.id].connected) {
            return;
        }
    }

    midi_input_element.classList.add("fs-midi-settings-device");

    midi_input_element.innerHTML = [
                midi_input.name,
                '<div>',
                '    <label class="fs-ck-label">',
                '        <div>Enable</div>&nbsp;',
                '        <input id="' + midi_input_enabled_ck_id + '" type="checkbox" data-did="' + midi_input.id + '" ' + midi_device_enabled_ck + '>',
                '    </label>',
                '</div>'].join('');

    midi_settings_element.appendChild(midi_input_element);

    _midi_devices.input[midi_input.id] = {
            type: midi_input.type,
            id: midi_input.id,
            manufacturer: midi_input.manufacturer,
            name: midi_input.name,
            version: midi_input.version,
            iid: _midi_device_uid,
            enabled: midi_device_enabled,
            element: midi_input_element,
            connected: true
        };

    document.getElementById(midi_input_enabled_ck_id).addEventListener("change", function () {
            var midi_device = _midi_devices.input[this.dataset.did];

            midi_device.enabled = this.checked;

            _saveMIDISettings();
        });
    
    midi_input.onmidimessage = _onMIDIMessage;
    
    _midi_device_uid += 1;
};

var _deleteMIDIDevice = function (id) {
    var midi_device = _midi_devices.input[id];
    
    if (!midi_device) {
        console.log("_deleteMIDIDevice: MIDI Device ", id, " does not exist.");
        return;
    }
    
    midi_device.element.parentElement.removeChild(midi_device.element);
    
    delete _midi_devices.input[id]
};

var _onMIDIAccessChange = function (connection_event) {
    var device = connection_event.port;
    
    // only inputs are supported at the moment
    if (device.type !== "input") {
        return;
    }

    if (device.state === "connected") {
        _addMIDIDevice(device);
    } else if (device.state === "disconnected") {
        _deleteMIDIDevice(device.id);
    }
};

var _onMIDIMessage = function (midi_message) {
    var i = 0, midi_device = _midi_devices.input[this.id],
        key, value, channel = midi_message.data[0] & 0x0f;

    if (!midi_device.enabled) {
        return;
    }

    _useProgram(_program);
    
    switch (midi_message.data[0] & 0xf0) {
        case 0x90:
            if (midi_message.data[2] !== 0) { // note-on
                key = channel + "_" + midi_message.data[1];

                _keyboard.data = new Array(_keyboard.data_length);
                _keyboard.data.fill(0);

                _keyboard.pressed[key] = {
                        frq: _frequencyFromNoteNumber(midi_message.data[1]),
                        vel: midi_message.data[2] / 127,
                        time: Date.now(),
                        channel: channel
                    };

                i = 0;

                for (key in _keyboard.pressed) { 
                    value = _keyboard.pressed[key];

                    _keyboard.data[i] = value.frq;
                    _keyboard.data[i + 1] = value.vel;
                    _keyboard.data[i + 2] = Date.now();
                    _keyboard.data[i + 3] = value.channel;

                    i += _keyboard.data_components;

                    if (i > _keyboard.data_length) {
                        break;
                    }
                }

                _keyboard.polyphony = i / _keyboard.data_components;

                _setUniforms(_gl, "vec", _program, "keyboard", _keyboard.data, _keyboard.data_components);
            }
            break;

        case 0x80:
            key = channel + "_" + midi_message.data[1];

            delete _keyboard.pressed[key];

            _keyboard.data = new Array(_keyboard.data_length);
            _keyboard.data.fill(0);

            i = 0;

            for (key in _keyboard.pressed) { 
                value = _keyboard.pressed[key];

                _keyboard.data[i] = value.frq;
                _keyboard.data[i + 1] = value.vel;
                _keyboard.data[i + 2] = value.time;
                _keyboard.data[i + 3] = value.channel;

                i += _keyboard.data_components;

                if (i > _keyboard.data_length) {
                    break;
                }
            }

            _keyboard.polyphony = i / _keyboard.data_components;

            _setUniforms(_gl, "vec", _program, "keyboard", _keyboard.data, _keyboard.data_components);
            break;
    }

    WUI_RangeSlider.submitMIDIMessage(midi_message);
};

var _midiAccessSuccess = function (midi_access) {
    var midi_settings_element = document.getElementById(_midi_settings_dialog_id).lastElementChild;
    
    _midi_access = midi_access;
    
    midi_settings_element.innerHTML = '<div class="fs-midi-settings-section">MIDI Inputs</div>';
    
    _midi_access.inputs.forEach(
        function (midi_input) {
            _addMIDIDevice(midi_input);
        }
    );
    
    _midi_access.onstatechange = _onMIDIAccessChange;
};

var _midiAccessFailure = function (msg) {
    midi_settings_element.innerHTML = "<center>Failed to get WebMIDI API access : " + msg + "</center>";
};

/***********************************************************
    Init.
************************************************************/

var _midiInit = function () {
    var i = 0,
        midi_settings_element = document.getElementById(_midi_settings_dialog_id).lastElementChild;
    
    _keyboard.data = [];
    
    for (i = 0; i < _keyboard.polyphony_max; i += 1) {
        _keyboard.data[i] = 0;
    }

    if (_webMIDISupport()) {
        navigator.requestMIDIAccess().then(_midiAccessSuccess, _midiAccessFailure);
    } else {
        midi_settings_element.innerHTML = "<center>WebMIDI API is not enabled or supported by this browser.</center>";
    }
}/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _fas = {
        address: "127.0.0.1:3003",
        enabled: false,
        status: null,
        worker: new Worker("dist/worker/fas.min.js")
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
    var output_data_buffer = [],
        i = 0;
    
    for (i = 0; i < data.length; i += 1) {
        output_data_buffer.push(data[i].buffer);
    }
    
    _fas.worker.postMessage({
            cmd: cmd,
            arg: output_data_buffer,
            mono: _audio_infos.monophonic
        }, output_data_buffer);
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
            _gl.bufferData(_gl.PIXEL_PACK_BUFFER, 1 * _canvas.height * 4, _gl.STATIC_READ);
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
        
        _stopOscillators();

        if (update_obj.height) {
            _canvas_height = update_obj.height;
            _canvas.height = _canvas_height;
            _canvas.style.height = _canvas_height + 'px';
            _canvas_height_mul4 = _canvas_height * 4;
            
            _record_canvas.height = _canvas_height;
            _record_slice_image = _record_canvas_ctx.createImageData(1, _canvas_height);

            _vaxis_infos.style.height = _canvas_height + "px";

            _temp_data = new Uint8Array(_canvas_height_mul4);
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
        
        _buildFeedback();
    };

    /***********************************************************
        Init.
    ************************************************************/
    
    _code_editor_extern = localStorage.getItem('fs-exted');
    
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
    
    _record_canvas.width = _canvas_width;
    _record_canvas.height = _canvas_height;
    
    _record_slice_image = _record_canvas_ctx.createImageData(1, _canvas_height);

    _vaxis_infos.style.height = _canvas_height + "px";

    // CodeMirror
    if (_code_editor_extern === null ||
        _code_editor_extern === "false" ||
        _code_editor_extern === false) {
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
    } else {
        // the "dummy" CodeMirror object when the external editor is used
        _code_editor = {
                s: document.getElementById("fragment-shader").text,
            
                getValue: function () {
                    return this.s;
                },
            
                setValue: function (str) {
                    this.s = str;
                    
                    clearTimeout(_compile_timer);
                    _compile_timer = setTimeout(_compile, 500);
                },
            
                setOption: function () {
                    
                },
            
                refresh: function () {

                },
            
                posFromIndex: function (i) {
                    return i;
                },
            
                replaceRange: function (substitute, start, end) {
                    this.s = this.s.substring(0, start) + substitute + this.s.substring(end);
                    
                    clearTimeout(_compile_timer);
                    _compile_timer = setTimeout(_compile, 500);
                },
            
                addLineWidget: function () {
                    
                },
            
                removeLineWidget: function () {
                    
                },
            
                setCursor: function () {

                }
            };
    }
    
    // WebGL 2 check
    _gl = _canvas.getContext("webgl2", _webgl_opts) || _canvas.getContext("experimental-webgl2", _webgl_opts);
    if (!_gl) {
        _gl = _canvas.getContext("webgl", _webgl_opts) || _canvas.getContext("experimental-webgl", _webgl_opts);
    } else {
        _gl2 = true;
        
        _initializePBO();
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

    _compile();

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
    } else {
        _local_session_settings = {
            gain: _volume,
        };
    }

    //_addPlayPositionMarker(_canvas_width / 4);
    //_addPlayPositionMarker(_canvas_width - _canvas_width / 4);

    _allocateFramesData();
    
    _uiInit();
    
    _midiInit();
    
    _fasInit();

    _initNetwork();

    //_play();
    
/* jslint browser: true */

_user_name_element.addEventListener('click', function (e) {
        var user_name = prompt("User Name");

        if (user_name === null) {
            return;
        }

        if (user_name === "") {
            user_name = "Anonymous";
        }

        _user_name_element.innerHTML = user_name;

        localStorage.setItem('fs-user-name', user_name);

        _notification("User name change will take effect after page reload.");
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
                        _addPlayPositionMarker(_cx, 0, false, 1, true);
                    } }
            ]);

        return false;
    }, false);

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

document.getElementById("fs_import_audio_window_settings").addEventListener('change', function (e) {
    var window_type = e.target.value;
    
    _audio_import_settings.window_type = window_type;
});

document.addEventListener('mouseup', function (e) {
    _mouse_btn = 0;
});

document.addEventListener('mousemove', function (e) {
        var e = e || window.event,
            
            canvas_offset;

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

                _haxis_infos.firstElementChild.innerHTML = _cy;
                _haxis_infos.lastElementChild.style.left = e.pageX + "px";
                _haxis_infos.lastElementChild.innerHTML = _truncateDecimals(_hover_freq + "", 2) + "Hz";
                _vaxis_infos.firstElementChild.innerHTML = _cx;

                _haxis_infos.style.top = _cy + "px";
                _vaxis_infos.style.left = e.pageX + "px";
            } else {
                _xy_infos.innerHTML = "x " + _cx + " y " + _cy;
                _hz_infos.innerHTML = " " + _truncateDecimals(_hover_freq + "", 2) + "Hz";
            }
        } else {
            if (_xyf_grid) {
                if (_haxis_infos.style.display !== "none" ||
                    _vaxis_infos.style.display !== "none") {
                    _haxis_infos.style.display = "none";
                    _vaxis_infos.style.display = "none";
                }
            } else {
                _xy_infos.innerHTML = "";
                _hz_infos.innerHTML = "";
            }
        }

        _mx = e.pageX;
        _my = e.pageY;

        if (_mouse_btn === _LEFT_MOUSE_BTN) {
            _nmx = 1. - _cx / _canvas_width;
            _nmy = 1. - _cy / _canvas_height;
        }
   });

document.getElementById("fs_ui_doc_btn").addEventListener("click", function () {
        window.open("https://www.fsynth.com/documentation", '_blank');
    });

document.getElementById("fs_ui_help_btn").addEventListener("click", function () {
        window.open("data/guide/fs.png", '_blank');
    });
/*
document.getElementById("fs_glsl_help_btn").addEventListener("click", function () {
        window.open("https://www.khronos.org/registry/gles/specs/2.0/GLSL_ES_Specification_1.0.17.pdf", '_blank');
    });
*/

var _on_window_resize = function () {
    _updateAllPlayPosition();
    
    _updateCodeView();
};

ResizeThrottler.initialize([_on_window_resize]);

_red_curtain_element.classList.add("fs-open-red-curtain");
_red_curtain_element.addEventListener("transitionend", function () {
        _red_curtain_element.parentElement.removeChild(_red_curtain_element);
    }, false);    
    window.gb_code_editor_settings = _code_editor_settings;
    window.gb_code_editor = _code_editor;
    window.gb_code_editor_theme = _code_editor_theme;
    
    document.body.style.overflow = "visible";
    
    if (params.fas) {
        _fasEnable();
    }
    
    _buildFeedback();
};
    
    if (_electronInit()) {
        
    } else {
        FragmentSynth({});
    }
}
