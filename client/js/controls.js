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
        margin: 28,
        width: 200,
        height: 150,
        text_size: 12,
        background: "#111111",
        border_color: "#555555",
        // http://colorbrewer2.org/#type=sequential&scheme=GnBu&n=9
        palette: ['#f7fbff','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','#08519c','#08306b']
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
            destroy: function (o) {
                
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
            destroy: function (o) {
                
            },
            position: null
        },
        iannix: {
            draw: null,
            opts: {
                osc: {
                    port: null,
                    url: "127.0.0.1:8081"
                },
                n: 6,
                values: null,
                onChange: function (o) {
                    var uniform_location = _getUniformLocation(o.name, _program);
                    
                    _useProgram(_program);
                    _gl.uniform3fv(uniform_location, new Float32Array(o.values));
                },
                cursors: {
                    count: 0
                }
            },
            init: function (o) {
                var i = 0;
                
                o.values = new Array(o.n);
                
                for (i = 0; i < o.values.length; i += 1) {
                    o.values[i] = 0.;
                }
                
                o["uniform"] = {
                        type: "vec",
                        count: o.values.length,
                        comps: 3
                    };
                
                o.title = "float[" + o.values.length + "] " + o.name;
                
                _useProgram(_program);
                _setUniforms(_gl, o.uniform.type, _program, o.name, o.values, o.uniform.comps);

                o.osc.port = new osc.WebSocketPort({
                    url: "ws://" + o.osc.url,
                    metadata: true
                });
                
                o.osc.port.on("bundle", function (bundle) {
                    var packets = bundle.packets,
                        
                        address,
                        
                        args,
                        
                        cid = 0,
                        vid = 0,
                        
                        i = 0, j = 0;
                    
                    for (i = 0; i < packets.length; i += 1) {
                        address = packets[i].address;
                        args = packets[i].args;
                    
                        if (address === "/cursor") {
                            cid = args[0].value;
                            
                            if (o.cursors.hasOwnProperty(cid)) {
                                vid = o.cursors[cid] * 6;
                            } else {
                                vid = o.cursors.count * 6;
                                
                                o.cursors[cid] = o.cursors.count;
                                
                                o.cursors.count += 1;
                            }
                            
                            for (j = 0; j < 6; j += 1) {
                                if (args.length <= (j + 2)) {
                                    o.values[vid + j] = 0.;
                                } else {
                                    o.values[vid + j] = args[j + 2].value;
                                }
                            }
                        } else if (address === "/trigger") {
                            // TODO
                        }
                    }
                    
                    while ((o.values.length % 6) !== 0) {
                        o.values.push(0);
                    }
                    
                    if (o.uniform.count !== o.values.length) {
                        _compile();

                        o.uniform.count = o.values.length;
                        
                        o.title = "float[" + o.values.length + "] " + o.name;
                        
                        _draw_list.push(o);
                        _drawControls();
                    }
                    
                    o.onChange(o);
                });

                o.osc.port.on("message", function (m) {
                    var address = m.address,
                        
                        args = m.args,
                        
                        t;
                    
                    if (address === "/cursor") {
                        // See bundle
                    } else if (address === "/trigger") {
                        // See bundle
                    } else if (address === "/transport") {
                        _time = args[1].value;
                        
                        if (args[0].value === "play") {
                            _play();
                        } else if (args[0].value === "fastrewind") {
                            o.cursors = { count: 0 };
                            
                            o.values = [];
                            
                            _rewind();
                        } else if (args[0].value === "stop") {
                            o.cursors = { count: 0 };
                            
                            o.values = [];
                            
                            _stop();
                        }
                    }
                });
                
                o.osc.port.on("close", function () {
                    _notification("IanniX OSC connection to '" + o.osc.url + "' failed, trying again in ~5sec", 2500);
                        
                    setTimeout(function () { o.init(o) }, 5000);
                });
                
                o.osc.port.on("error", function (e) {
                    console.log(e);
                });
                
                o.osc.port.open();
            },
            destroy: function (o) {
                o.osc.port.close();
            },
            position: null
        }
    },
    
    _controllers_hit_hashes = {
        
    },
    
    _controls_per_page = 0,
    
    _controls_page = 0,
        
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

var _drawIannix = function (ctx, c, x, y) {
    var controller_width = _controllers_settings.width,
        controller_height = _controllers_settings.height;
    
    ctx.save();
    ctx.font = "32px monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.lineWidth = 1;
    ctx.strokeStyle = _controllers_settings.border_color;
    ctx.fillStyle = 'white';
    ctx.fillText("IanniX", x + controller_width / 2, y + controller_height / 2);
    ctx.restore();
};

var _eventXYPad = function (ev, x, y, e) {
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
    
    ctx.fillStyle = _controllers_settings.background;
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
        
        _addHitHash(c, ii + 1, { f: _eventXYPad, e: { c: c, n: i } })

        hit_ctx.fillStyle = c.hit_hashes[ii + 1];
        //hit_ctx.arc(x + 8 + Math.round(area_width * vx), y + 8 + Math.round(area_height * vy), 8, 0, 2 * Math.PI);
        //hit_ctx.fill();
        hit_ctx.fillRect(x + Math.round(area_width * vx), y + Math.round(area_height * vy), 16, 16);
    }
    hit_ctx.closePath();
    ctx.closePath();
};

var _eventMultislider = function (ev, x, y, e) {
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
        
        ctx.fillStyle = _controllers_settings.background;
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
        _addHitHash(c, i + 1, { f: _eventMultislider, e: { c: c, n: i } })
        
        hit_ctx.fillStyle = c.hit_hashes[i + 1];
        hit_ctx.fillRect(x + w * i, y, w, controller_height);
    }
};

var _drawControls = function () {
    var i = 0,
        j = 0,
        
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
        
        pages = Math.floor(_controls.length / (_controls_per_page + 1)),

        c;
    
    ctx.font = text_size + "px monospace";
    ctx.lineWidth = 1;
    
    ctx.clearRect(8, _controllers_canvas.height - 8 - text_size, canvas_width, text_size + 8);
    
    ctx.textBaseline = "bottom";
    ctx.textAlign = "left";
    ctx.fillStyle = 'white';
    ctx.fillText((_controls_page + 1) + " / " + (pages + 1), 8, _controllers_canvas.height - 8);
    
    ctx.textBaseline = "bottom";
    ctx.textAlign = "center";
    
    for (i = 0; i < _draw_list.length; i += 1) {
        c = _draw_list[i];
        
        if (c.pos >= ((_controls_page + 1) * _controls_per_page) || 
            c.pos < (_controls_page * _controls_per_page)) {
            continue;
        }
        
        ctx.strokeStyle = _controllers_settings.border_color;
        
        x = Math.round(margin + lcw + (c.pos % lc) * controller_width_m);
        y = Math.round(margin + hcw + Math.floor((c.pos / lc) % hc) * controller_height_m);

        //ctx.fillStyle = '#000000';
        ctx.clearRect(x - 2, y - margin + 4, controller_width + 8, controller_height + margin + 6);
        
        ctx.fillStyle = _controllers_settings.background;
        ctx.fillRect(x, y, controller_width, controller_height);

        _hit_canvas_ctx.fillStyle = '#000000';
        _hit_canvas_ctx.fillRect(x, y, controller_width, controller_height);
        
        ctx.fillStyle = 'white';
        ctx.fillText(c.title, x + controller_width / 2, y - 2);
        
        // controller menu, we reserve the first hit hash for it!
        _addHitHash(c, 0, { f: _controllerMenu, e: { c: c, n: c.id } });
        
        hit_ctx.fillStyle = c.hit_hashes[0];
        hit_ctx.fillRect(x, y - text_size - 8, controller_width, text_size + 8);
        //
        
        _controllers[c.type].draw(ctx, c, x, y);
        
        ctx.strokeRect(x - 1, y - 1, controller_width + 2, controller_height + 2);
        
        c.position = { x: x, y: y };
    }

    _draw_list = [];
};

var _redrawControls = function () {
    var i = 0,
        
        ctx = _controllers_canvas_ctx,
        hit_ctx = _hit_canvas_ctx;
    
    ctx.clearRect(0, 0, _controllers_canvas.width, _controllers_canvas.height);
    hit_ctx.clearRect(0, 0, _controllers_canvas.width, _controllers_canvas.height);
    
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
        var name = _controls.length,
            
            c = 0,
            m = 0,
            i;
        
        // will look for the highest generated controller name so that a new one can be generated (meh)
        for (i = 0; i < _controls.length; i += 1) {
            c = parseInt(_controls[i].name.substring(7), 10);
            
            if (c > m) {
                m = c + 1;
            } else {
                m += 1;
            }
        }
        
        var controller = {
                id: _controls.length,
                pos: _controls.length,
                type: type,
                name: "control" + m,
                title: "",
                hit_hashes: []
            },
            
            key;
        
        for (key in _controllers[type].opts) {
            if (_controllers[type].opts.hasOwnProperty(key)) {
                controller[key] = _controllers[type].opts[key];
            }
        }
        
        controller["init"] = _controllers[type].init;
        controller["destroy"] = _controllers[type].destroy;
        
        controller.init(controller);
        
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
    
    _computeControlsPage();
};

var _deleteControllerCb = function (c) {
    return function () {
        var color_hex,
            j = 0,
            i = 0;
        
        // remove its events
        for (i = 0; i < c.hit_hashes.length; i += 1) {
            color_hex = c.hit_hashes[i].substring(1);

            delete _controllers_hit_hashes[color_hex];
        }

        _controls.splice(c.id, 1);
        
        for (i = c.id; i < _controls.length; i += 1) {
            _controls[i].id -= 1;
            _controls[i].pos -= 1;
        }
        
        _redrawControls();
        
        _hit_under_cursor = null;
    };
};

var _controllerMenu = function (ev, x, y, e) {
    WUI_CircularMenu.create(
        {
            x: ev.pageX,
            y: ev.pageY,

            rx: 48,
            ry: 48,

            item_width:  32,
            item_height: 32,

            window: WUI_Dialog.getDetachedDialog(_controls_dialog)
        }, 
        [{
            icon: "fp-trash-icon",
            tooltip: "Delete",
            on_click: _deleteControllerCb(e.c)
        }]);
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
                    text: "IanniX (OSC)",
                    on_click: _addControlWidget("iannix"),
                    tooltip: "Add IanniX (OSC) controller"
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
            ],
            page_controls: [
                {
                    text: "<",
                    on_click: function () {
                        if (_controls_page > 0) {
                            _controls_page -= 1;
                            _redrawControls();
                        }
                    },
                    tooltip: "Previous page"
                },
                {
                    text: ">",
                    on_click: function () {
                        var pages = Math.floor(_controls.length / (_controls_per_page + 1));
                        
                        if (_controls_page < pages) {
                            _controls_page += 1;
                            _redrawControls();
                        }
                    },
                    tooltip: "Next page"
                }
            ]
        });

_controllers.multislider.draw = _drawMultislider;
_controllers.xypad.draw = _drawXYPad;
_controllers.iannix.draw = _drawIannix;

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
            // "continuous" mode only for specific widgets
            // maybe add it back later as an option
/*
            if (_hit_under_cursor.e.c.type === "multislider" &&
               _controllers_hit_hashes[hit_color].e.c.type === "multislider") {
                _hit_under_cursor = _controllers_hit_hashes[hit_color];
            }
*/

            _hit_curr.f(e, _hit_x, _hit_y, _hit_under_cursor.e);
        } else {
            _hit_under_cursor = _controllers_hit_hashes[hit_color];
        }
        
        if (doc.body.style.cursor !== "pointer") {
            doc.body.style.cursor = "pointer";
        }
    } else {
        if (_hit_curr) {
            _hit_curr.f(e, _hit_x, _hit_y, _hit_under_cursor.e);
        } else {
            _hit_under_cursor = null;

            if (doc.body.style.cursor !== "") {
                doc.body.style.cursor = "";
            }
        }
    }
});

_controllers_canvas.addEventListener("contextmenu", function (e) {
    e.preventDefault(); 
});

_controllers_canvas.addEventListener("mousedown", function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    if (e.which === 3) { // right click

    } else {
        var c = null;

        if (_hit_under_cursor) {
            _hit_curr = _hit_under_cursor;

            _hit_under_cursor.f(e, _hit_x, _hit_y, _hit_under_cursor.e);
        }
    }
});
