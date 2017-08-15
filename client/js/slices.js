/* jslint browser: true */

var _selected_slice_marker = null;

/***********************************************************
    Functions.
************************************************************/

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
    
    if (obj.output_channel) {
        slice.output_channel = _parseInt10(obj.output_channel);
        
        WUI_RangeSlider.setValue("fs_slice_settings_channel_input_" + slice.id, slice.output_channel);
    }
    /*
    if (obj.synthesis_type) {
        slice.synthesis_type = _parseInt10(obj.synthesis_type);
        
        document.getElementById("fs_slice_settings_synthesis_select" + slice.id).options[slice.synthesis_type].selected = "selected";
    }*/
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
    WUI_RangeSlider.destroy("fs_slice_settings_bpm_" + marker_id);

    _play_position_markers.splice(marker_id, 1);

    for (i = 0; i < _play_position_markers.length; i += 1) {
        slice_settings_container = document.getElementById("slice_settings_container_" + _play_position_markers[i].id);
        
        _play_position_markers[i].element.dataset.slice = i;
        _play_position_markers[i].id = i;
        
        slice_settings_container.id = "slice_settings_container_" + i;
    }
    
    if (_play_position_markers.length === 0) {
        _stopOscillators();
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
        fs_slice_settings_synthesis_select = document.createElement("select"),
        fs_slice_settings_bpm = document.createElement("div"),
        synthesis_option;
    
    fs_slice_settings_x_input.id = "fs_slice_settings_x_input_" + marker_obj.id;
    fs_slice_settings_shift_input.id = "fs_slice_settings_shift_input_" + marker_obj.id;
    fs_slice_settings_channel_input.id = "fs_slice_settings_channel_input_" + marker_obj.id;
    fs_slice_settings_synthesis_select.id = "fs_slice_settings_synthesis_select" + marker_obj.id;
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
/*
    synthesis_option = document.createElement("option");
    synthesis_option.text = "Additive";
    fs_slice_settings_synthesis_select.add(synthesis_option);
    synthesis_option = document.createElement("option");
    synthesis_option.text = "Granular";
    fs_slice_settings_synthesis_select.add(synthesis_option);
    fs_slice_settings_synthesis_select.classList.add("fs-btn");
*/  
    fs_slice_settings_container.appendChild(fs_slice_settings_x_input);
    fs_slice_settings_container.appendChild(fs_slice_settings_shift_input);
    fs_slice_settings_container.appendChild(fs_slice_settings_bpm);
    fs_slice_settings_container.appendChild(fs_slice_settings_channel_input);
    
    // synthesis select
/*
    var div = document.createElement("div"),
        label = document.createElement("label");
    
    div.style.textAlign = "center";
    label.classList.add("fs-input-label");
    label.htmlFor = fs_slice_settings_synthesis_select.id;
    
    label.innerHTML = "FAS Synthesis: &nbsp;";
    
    div.appendChild(label);
    div.appendChild(fs_slice_settings_synthesis_select);
    fs_slice_settings_container.appendChild(div);
    
    fs_slice_settings_synthesis_select.addEventListener('change', function (e) {
        var synthesis = e.target.value,
            slice;

        if (synthesis === "Additive") {
            synthesis = 0;
        } else if (synthesis === "Granular") {
            synthesis = 1;
        }
        
        slice = _getSlice(marker_obj.element.dataset.slice);
        slice.synthesis_type = synthesis;
        
        _submitSliceUpdate(4, marker_obj.element.dataset.slice, { synthesis_type : value });
    });
    //
*/
    
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
                //synthesis_type: play_position_marker.synthesis_type
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
    var play_position_top_hook_element = slice_obj.element.firstElementChild,
        play_position_bottom_hook_element = slice_obj.element.lastElementChild;
    
    slice_obj.mute = true;
    slice_obj.element.style.backgroundColor = "#555555";
    //play_position_top_hook_element.style.borderTopColor = "#555555";
    //play_position_bottom_hook_element.style.borderBottomColor = "#555555";
    
    if (submit) {
        _submitSliceUpdate(2, slice_obj.element.dataset.slice, { mute : true }); 
    }
};

var _unmuteSlice = function (slice_obj, submit) {
    var play_position_top_hook_element = slice_obj.element.firstElementChild,
        play_position_bottom_hook_element = slice_obj.element.lastElementChild;    

    slice_obj.mute = false;
    slice_obj.element.style.backgroundColor = "";
    //play_position_top_hook_element.style.borderTopColor = "";
    //play_position_bottom_hook_element.style.borderBottomColor = "";
    
    if (submit) {
        _submitSliceUpdate(2, slice_obj.element.dataset.slice, { mute : false });
    }
};

var _addPlayPositionMarker = function (x, shift, mute, output_channel, synthesis_type, submit) {
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
        //play_position_top_hook_element.style.borderTopColor = "#555555";
        //play_position_bottom_hook_element.style.borderBottomColor = "#555555";
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
            synthesis_type: 0,
            y: 0,
            height: _canvas_height,
            id: play_position_marker_id
        });
    
    play_position_marker = _play_position_markers[play_position_marker_id];
    
    if (output_channel !== undefined) {
        play_position_marker.output_channel = output_channel;
    }
    /*
    if (synthesis_type !== undefined) {
        play_position_marker.synthesis_type = synthesis_type;
    }*/
    
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
/*
    play_position_marker_element.addEventListener('click', function (ev) {
            var i = 0, slice;
        
            _selected_slice_marker = play_position_marker;
        
            for (i = 0; i < _play_position_markers.length; i += 1) {
                slice = _play_position_markers[i];

                slice.element.classList.remove("fs-selected-slice");
            }
        
            _selected_slice_marker.element.classList.add("fs-selected-slice");
        });
*/  
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
