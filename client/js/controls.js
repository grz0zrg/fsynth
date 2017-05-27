/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _controllers_canvas = document.getElementById("fs_controllers"),
    _controllers_canvas_ctx = _controllers_canvas.getContext("2d"),
    
    _hit_canvas = document.createElement("canvas"),
    _hit_canvas_ctx = _hit_canvas.getContext("2d"),
    
    _hit_curr = null,
    
    _hit_curr_color = 1,
    _hit_x = 0,
    _hit_y = 0,
    _hit_under_cursor = null,
    
    _controllers_settings = {
        margin: 20,
        width: 200,
        height: 150,
        text_size: 12,
        palette: [
            "#0040a0",
            "#0060c0",
            "#0080e0",
            "#00a0ff",
            "#00ffff"
        ]
    },
    
    _controllers = {
        multislider: {
            draw: null,
            opts: {
                n: 16,
                values: null,
                onChange: function (o) {
                    var uniform_location = _getUniformLocation(o.name, _program);
                    
                    _useProgram(_program);
                    _gl.uniform1fv(uniform_location, new Float32Array(o.values));
                }
            },
            init: function (o) {
                var i = 0;
                
                o.values = new Array(o.n);
                
                for (i = 0; i < o.values.length; i += 1) {
                    o.values[i] = 0;
                }
                
                o["uniform"] = {
                        type: "float",
                        count: o.values.length
                    };
                
                o.title = "float[" + o.values.length + "] " + o.name;
                
                _useProgram(_program);
                _setUniforms(_gl, o.uniform.type, _program, o.name, o.values, o.uniform.comps);
            },
            position: null
        },
        xypad: {
            draw: null,
            opts: {
                n: 2,
                values: null,
                onChange: function (o) {
                    var uniform_location = _getUniformLocation(o.name, _program);
                    
                    _useProgram(_program);
                    _gl.uniform2fv(uniform_location, new Float32Array(o.values));
                }
            },
            init: function (o) {
                var i = 0;
                
                o.values = new Array(o.n);
                
                for (i = 0; i < o.values.length; i += 1) {
                    o.values[i] = 0.5;
                }
                
                o["uniform"] = {
                        type: "vec",
                        comps: 2
                    };
                
                o.title = "vec" + o.uniform.comps + " " + o.name;
                
                _useProgram(_program);
                _setUniforms(_gl, o.uniform.type, _program, o.name, o.values, o.uniform.comps);
            },
            position: null
        }
    },
    
    _controllers_hit_hashes = {
        
    },
    
    _controls_per_page = 0,
        
    _controls = [],
    
    _draw_list = [];

/***********************************************************
    Functions.
************************************************************/

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

var _addHitHash = function (c, i, eo) {
    var color;
    
    if (i >= c.hit_hashes.length) {
        color = _decimalToHTMLColor(_hit_curr_color);

        c.hit_hashes[i] = "#" + color;

        _controllers_hit_hashes[color] = eo;

        _hit_curr_color += 1;
    }
};

var _eventXYPad = function (x, y, e) {
    var c = e.c,
        n = e.n,
        
        area_width = _controllers_settings.width - 16,
        area_height = _controllers_settings.height - 16,
        
        vx, vy;
    
    if (x < (e.c.position.x + 8)) {
        vx = 0;
    } else if (x > (c.position.x + (_controllers_settings.width - 8))) {
        vx = 1;
    } else {
        vx = (x - 8 - c.position.x) / area_width;
    }
    
    if (y < (e.c.position.y + 8)) {
        vy = 0;
    } else if (y > (c.position.y + (_controllers_settings.height - 8))) {
        vy = 1;
    } else {
        vy = (y - 8 - c.position.y) / area_height;
    }
    
    c.values[n] = vx;
    c.values[n + 1] = vy;
    
    _drawXYPad(_controllers_canvas_ctx, c, c.position.x, c.position.y, n);
    
    c.onChange(c);
};

var _drawXYPad = function (ctx, c, x, y, n) {
    var i = 0,
        
        palette = _controllers_settings.palette,
        
        controller_width = _controllers_settings.width,
        controller_height = _controllers_settings.height,
        
        area_width = _controllers_settings.width - 16,
        area_height = _controllers_settings.height - 16,
        
        hit_ctx = _hit_canvas_ctx,
        
        ly = 0,
        
        lh = 6,
        
        ii = 0,
        
        vx = 0,
        vy = 0,
        
        i_start = 0,
        i_end = c.n,
        
        color = "";
    
    ctx.fillStyle = "#111111";
    ctx.fillRect(x, y, controller_width, controller_height);
    
    hit_ctx.fillStyle = "#000000";
    hit_ctx.fillRect(x, y, controller_width, controller_height);
    
    ctx.beginPath();
    hit_ctx.beginPath();
    for (i = i_start; i < i_end; i += 2) {
        ii = i / 2;
        
        ctx.fillStyle = palette[ii % palette.length];
        
        vx = c.values[i];
        vy = c.values[i + 1];
        
        //ctx.arc(x + 8 + Math.round(area_width * vx), y + 8 + Math.round(area_height * vy), 8, 0, 2 * Math.PI);
        //ctx.fill();
        ctx.fillRect(x + Math.round(area_width * vx), y + Math.round(area_height * vy), 16, 16);
        
        _addHitHash(c, ii, { f: _eventXYPad, e: { c: c, n: i } })

        hit_ctx.fillStyle = c.hit_hashes[ii];
        //hit_ctx.arc(x + 8 + Math.round(area_width * vx), y + 8 + Math.round(area_height * vy), 8, 0, 2 * Math.PI);
        //hit_ctx.fill();
        hit_ctx.fillRect(x + Math.round(area_width * vx), y + Math.round(area_height * vy), 16, 16);
    }
    hit_ctx.closePath();
    ctx.closePath();
};

var _eventMultislider = function (x, y, e) {
    var c = e.c,
        n = e.n,
        
        v;
    
    if (y < e.c.position.y) {
        v = 1;
    } else if (y > (c.position.y + _controllers_settings.height)) {
        v = 0;
    } else {
        v = 1 - (y - c.position.y) / _controllers_settings.height;
    }
    
    c.values[n] = v;

    _drawMultislider(_controllers_canvas_ctx, c, c.position.x, c.position.y, n);
    
    c.onChange(c);
};

var _drawMultislider = function (ctx, c, x, y, n) {
    var i = 0,
        
        palette = _controllers_settings.palette,
        
        controller_width = _controllers_settings.width,
        controller_height = _controllers_settings.height,
        
        hit_ctx = _hit_canvas_ctx,
        
        w = Math.floor(controller_width / c.n),
        wr = controller_width % c.n,
        
        ly = 0,
        
        lh = 6,
        
        v = 0,
        iv = 0,
        
        i_start = 0,
        i_end = c.n,
        
        color = "";
    
    x = x + wr / 2;

    if (n !== undefined) {
        i_start = n;
        i_end = i_start + 1;
        
        ctx.fillStyle = "#111111";
        ctx.fillRect(x + w * i_start, y, w, controller_height);
    }
    
    for (i = i_start; i < i_end; i += 1) {
        v = c.values[i];
        iv = 1 - v;
        
        ly = y + iv * (controller_height - lh);
        
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + w * i, ly, w, lh);
        
        ctx.fillStyle = palette[i % palette.length];
        ctx.fillRect(x + w * i, ly + lh, w, Math.max((controller_height - lh) - (iv * (controller_height - lh)), 0));
        
        // hit testing
        _addHitHash(c, i, { f: _eventMultislider, e: { c: c, n: i } })
        
        hit_ctx.fillStyle = c.hit_hashes[i];
        hit_ctx.fillRect(x + w * i, y, w, controller_height);
    }
};

var _drawControls = function () {
    var i = 0,
        
        x = 0,
        y = 0,
        
        ctx = _controllers_canvas_ctx,
        hit_ctx = _hit_canvas_ctx,
        
        canvas_width = _controllers_canvas.width,
        canvas_height = _controllers_canvas.height,
        
        margin = _controllers_settings.margin,
        
        controller_width = _controllers_settings.width,
        controller_height = _controllers_settings.height,
        
        controller_width_m = controller_width + margin,
        controller_height_m = controller_height + margin,
        
        text_size = _controllers_settings.text_size,
        
        lc = Math.floor(canvas_width / controller_width_m),
        lcw = (canvas_width % controller_width_m) / 2 - margin,
        
        hc = Math.floor(canvas_height / controller_height_m),
        hcw = (canvas_height % controller_height_m) / 2 - margin,
        
        c;
    
    ctx.font = text_size + "px monospace";
    ctx.textBaseline = "bottom";
    ctx.textAlign = "center";
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#555555';
    
    for (i = 0; i < _draw_list.length; i += 1) {
        c = _draw_list[i];
        
        if (c.id >= _controls_per_page) {
            continue;
        }
        
        x = Math.round(margin + lcw + (c.id % lc) * controller_width_m);
        y = Math.round(margin + hcw + Math.floor(c.id / lc) * controller_height_m);

        ctx.fillStyle = '#111111';
        ctx.fillRect(x, y, controller_width, controller_height);

        _hit_canvas_ctx.fillStyle = '#000000';
        _hit_canvas_ctx.fillRect(x, y, controller_width, controller_height);
        
        ctx.fillStyle = 'white';
        ctx.fillText(c.title, x + controller_width / 2, y - 2);
        
        _controllers[c.type].draw(ctx, c, x, y);
        
        ctx.strokeRect(x - 1, y - 1, controller_width + 2, controller_height + 2);
        
        c.position = { x: x, y: y };
    }
    
    _draw_list = [];
};

var _redrawControls = function () {
    _controllers_canvas_ctx.fillStyle = '#000000';
    _controllers_canvas_ctx.fillRect(0, 0, _controllers_canvas.width, _controllers_canvas.height);
    
    var i = 0;
    
    for (i = 0; i < _controls.length; i += 1) {
        _draw_list.push(_controls[i]);
    }
    
    _drawControls();
};

var _computeControlsPage = function () {
    var canvas_width = _controllers_canvas.width,
        canvas_height = _controllers_canvas.height,
        
        margin = _controllers_settings.margin,
        
        controller_width = _controllers_settings.width,
        controller_height = _controllers_settings.height,
        
        controller_width_m = controller_width + margin,
        controller_height_m = controller_height + margin,
        
        lc = Math.floor(canvas_width / controller_width_m),
        hc = Math.floor(canvas_height / controller_height_m);
    
    _controls_per_page = lc * hc;
};

var _addControlWidget = function (type) {
    return function () {
        var controller = {
                id: _controls.length,
                type: type,
                name: "control" + _controls.length,
                title: "",
                hit_hashes: []
            },
            
            key;
        
        for (key in _controllers[type].opts) {
            if (_controllers[type].opts.hasOwnProperty(key)) {
                controller[key] = _controllers[type].opts[key];
            }
        }
        
        _controllers[type].init(controller);
        
        _computeControlsPage();
        
        _controls.push(controller);
        _draw_list.push(controller);
        
        _drawControls();
        
        _compile();
    }
};

var _setControllersCanvasDim = function () {
    _controllers_canvas.style.position = "relative";
    _controllers_canvas.width = Math.round(window.innerWidth / 1.5);
    _controllers_canvas.height = Math.round(window.innerHeight / 1.5);

    _hit_canvas.width = _controllers_canvas.width;
    _hit_canvas.height = _controllers_canvas.height;
    
    _controllers_canvas_ctx.imageSmoothingEnabled = false;
    _hit_canvas_ctx.imageSmoothingEnabled = false;
};

/***********************************************************
    Functions.
************************************************************/

_setControllersCanvasDim();

WUI_ToolBar.create("fs_controls_toolbar", {
            allow_groups_minimize: false
        },
        {
            controls: [
                {
                    text: "OSC",
                    on_click: _addControlWidget("osc"),
                    tooltip: "Add OSC controller"
                },
                {
                    text: "XY Pad",
                    on_click: _addControlWidget("xypad"),
                    tooltip: "Add XY pad"
                },
                {
                    text: "Multislider",
                    on_click: _addControlWidget("multislider"),
                    tooltip: "Add a multislider"
                }
            ]
        });

_controllers.multislider.draw = _drawMultislider;
_controllers.xypad.draw = _drawXYPad;

_controllers_canvas.addEventListener("mousemove", function (e) {
    e.preventDefault();

    var hit_canvas_offset = _getElementOffset(_controllers_canvas),
        
        hit_x = e.clientX - hit_canvas_offset.left,
        hit_y = e.clientY - hit_canvas_offset.top,
        
        hit_img_data = _hit_canvas_ctx.getImageData(hit_x, hit_y, 1, 1).data,
        
        hit_color = _rgbToHex(hit_img_data[0], hit_img_data[1], hit_img_data[2]),
        
        doc = _controllers_canvas.ownerDocument,
        
        c = null;

    _hit_x = hit_x;
    _hit_y = hit_y;
    
    if (_controllers_hit_hashes.hasOwnProperty(hit_color)) {
        if (_hit_curr) {
            _hit_curr.f(_hit_x, _hit_y, _hit_under_cursor.e);
        } else {
            _hit_under_cursor = _controllers_hit_hashes[hit_color];
        }
        
        if (doc.body.style.cursor !== "pointer") {
            doc.body.style.cursor = "pointer";
        }
    } else {
        if (_hit_curr) {
            _hit_curr.f(_hit_x, _hit_y, _hit_under_cursor.e);
        } else {
            _hit_under_cursor = null;

            if (doc.body.style.cursor !== "") {
                doc.body.style.cursor = "";
            }
        }
    }
});

_controllers_canvas.addEventListener("mousedown", function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    var c = null;
    
    if (_hit_under_cursor) {
        _hit_curr = _hit_under_cursor;
        
        _hit_under_cursor.f(_hit_x, _hit_y, _hit_under_cursor.e);
    }
});

_controllers_canvas.addEventListener("mouseup", function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    _hit_curr = null;
});