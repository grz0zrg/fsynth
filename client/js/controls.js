/* jslint browser: true */

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