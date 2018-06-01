/* jslint browser: true */

/**
 * All things related to slices.
 * 
 * This need a severe lifting!
 */

var _selected_slice_marker = null,
    _marker_midi_message_timeout = null,

    _slice_update_timeout = [{}, {}, {}, {}, {}],
    
    _slice_type_color = ["#ffffff", "#ff0000"];

/***********************************************************
    Functions.
************************************************************/

var _updateSliceSettingsDialog = function (slice_obj, show) {
    var i = 0;
    
    _selected_slice = slice_obj;
    
    if (show) {
        WUI_Dialog.open("fs_slice_settings_dialog" + slice_obj.id);

        slice_obj.custom_midi_codemirror.refresh();
    }
};

var _saveMarkersSettings = function () {
    _local_session_settings.markers = [];
    _play_position_markers.forEach(function (obj) {
            var marker_settings = {  };
            marker_settings.midi_out = _cloneObj(obj.midi_out);
            marker_settings.osc_out = obj.osc_out;
            marker_settings.audio_out = obj.audio_out;
            delete marker_settings.midi_out["custom_midi_message_fn"];
            _local_session_settings.markers.push(marker_settings);
        });
    _saveLocalSessionSettings();  
};

var _domCreatePlayPositionMarker = function (hook_element, height) {
    var play_position_marker_div = document.createElement("div"),
        decoration_div = document.createElement("div"),
        decoration_div2 = document.createElement("div");
    
    play_position_marker_div.className = "play-position-marker";
    
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

    if ('x' in obj) {
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
    
    if ('shift' in obj) {
        slice.shift = _parseInt10(obj.shift);
        
        WUI_RangeSlider.setValue("fs_slice_settings_shift_input_" + slice.id, slice.shift);
    }
    
    if ('output_channel' in obj) {
        slice.output_channel = _parseInt10(obj.output_channel);
        
        WUI_RangeSlider.setValue("fs_slice_settings_channel_input_" + slice.id, slice.output_channel);
    }

    if ('type' in obj) {
        _changeSliceType(slice, obj.type);
    }
};

var _removePlayPositionMarker = function (marker_id, force, submit) {
    var play_position_marker = _play_position_markers[parseInt(marker_id, 10)],
        i;
    
    WUI.undraggable(play_position_marker.element);
    WUI.undraggable(play_position_marker.element.firstElementChild);
    WUI.undraggable(play_position_marker.element.lastElementChild);

    play_position_marker.element.parentElement.removeChild(play_position_marker.element);
    
    WUI_RangeSlider.destroy("fs_slice_settings_x_input_" + marker_id);
    WUI_RangeSlider.destroy("fs_slice_settings_shift_input_" + marker_id);
    WUI_RangeSlider.destroy("fs_slice_settings_channel_input_" + marker_id);
    WUI_RangeSlider.destroy("fs_slice_settings_bpm_" + marker_id);
    WUI_Dialog.destroy("fs_slice_settings_dialog" + marker_id);

    _play_position_markers.splice(marker_id, 1);

    for (i = 0; i < _play_position_markers.length; i += 1) {
        _play_position_markers[i].element.dataset.slice = i;
        _play_position_markers[i].id = i;
    }
    
    if (_play_position_markers.length === 0) {
        _stopOscillators();
    }
    
    if (submit) {
        _submitRemoveSlice(marker_id);
    }
    
    _computeOutputChannels();

    _saveMarkersSettings();
};

var _cbMarkerSettingsChange = function (mobj, cb) {
    return function (value) {
        cb(this, value, mobj);
    };
};

var _buildMarkerMIDIDevices = function (marker_obj, midi_dev_list) {
    var i = 0, j = 0,
        midi_devices,
        midi_dev_option,
        uids = [],
        key;
    
    midi_dev_list.innerHTML = "";

    midi_devices = _getMIDIDevices("output");

    for (j = 0; j < marker_obj.midi_out.device_uids.length; j += 1) {
        if (!(marker_obj.midi_out.device_uids[i] in midi_devices)) {
            _notification("Slice '" + marker_obj.id + "' MIDI out '" + i + "' device does not exist anymore, defaulted to 'none'.", 4000);
        } else {
            uids.push(marker_obj.midi_out.device_uids[i]);
        }
    }

    marker_obj.midi_out.device_uids = uids;

    for (key in midi_devices) {
        if (!midi_devices[key].id) {
            continue;
        }
        
        i += 1;

        midi_dev_option = document.createElement("option");
        midi_dev_option.innerHTML = midi_devices[key].name;
        midi_dev_option.dataset.uid = midi_devices[key].id;
        midi_dev_option.value = midi_devices[key].id;
        midi_dev_option.id = "fs_slice_settings_midi_device_opt_" + marker_obj.id + "_" + i;

        for (j = 0; j < marker_obj.midi_out.device_uids.length; j += 1) {
            if (marker_obj.midi_out.device_uids[j] === midi_devices[key].id) {
                midi_dev_option.selected = true;
            }
        }

        midi_dev_list.appendChild(midi_dev_option);
    }
};

var _rebuildMarkersMIDIDevices = function () {
    var i = 0,

        play_position_marker,
        
        midi_dev_list;

    for (i = 0; i < _play_position_markers.length; i += 1) {
        play_position_marker = _play_position_markers[i];

        midi_dev_list = document.getElementById("fs_slice_settings_midi_device_" + play_position_marker.id);

        _buildMarkerMIDIDevices(play_position_marker, midi_dev_list);
    }
};


var _changeMarkerSettingsEditor = function (theme) {
    var i = 0;
    
    for (i = 0; i < _play_position_markers.length; i += 1) {
        _play_position_markers[i].custom_midi_codemirror.setOption("theme", theme);
    }
};

var _compileMarkerMIDIData = function (marker_obj, codemirror_instance) {
    var cm_element;

    try {
        marker_obj.midi_out.custom_midi_message_fn = new Function("type", "l", "r", "b", "a", "c", "var on, off, change;" + marker_obj.midi_out.custom_midi_message + "\nreturn { on: on, change: change, off: off };");
        
        if (codemirror_instance) {
            cm_element = codemirror_instance.getWrapperElement();
            cm_element.style.outline = "";
        }    
    } catch (e) {
        _notification("MIDI message compilation error : " + e, 5000);

        console.log("MIDI message compilation error : " + e);

        marker_obj.midi_out.custom_midi_message_fn = null;

        if (codemirror_instance) {
            cm_element = codemirror_instance.getWrapperElement();
            cm_element.style.outline = "1px solid #ff0000";
        }
    }
};

var _createMarkerSettings = function (marker_obj) {
    var dialog_id = "fs_slice_settings_dialog" + marker_obj.id;

    if (document.getElementById(dialog_id)) {
        WUI_Dialog.open(dialog_id);

        return;
    }

    var fs_slice_settings_container = document.createElement("div"),
        fs_slice_settings_x_input = document.createElement("div"),
        fs_slice_settings_shift_input = document.createElement("div"),
        fs_slice_settings_channel_input = document.createElement("div"),
        fs_slice_settings_synthesis_select = document.createElement("select"),
        fs_slice_settings_bpm = document.createElement("div"),

        // AUDIO pane
        audio_container = document.createElement("fieldset"),
        audio_container_legend = document.createElement("legend"),
        audio_label = document.createElement("label"),
        audio_div = document.createElement("div"),
        audio_input = document.createElement("input"),

        // OSC pane
        osc_container = document.createElement("fieldset"),
        osc_container_legend = document.createElement("legend"),
        osc_label = document.createElement("label"),
        osc_div = document.createElement("div"),
        osc_input = document.createElement("input"),

        // MIDI device
        midi_dev_out_container = document.createElement("div"),
        midi_dev_list_container = document.createElement("fieldset"),
        midi_dev_list_label = document.createElement("div"),
        midi_dev_list = document.createElement("select"),
        midi_dev_list_container_legend = document.createElement("legend"),
        midi_dev_option,

        midi_custom_codemirror = null,
        cm_element,

        midi_custom_message_area = document.createElement("textarea"),

        midi_devices,

        dialog_element = document.createElement("div"),
        content_element = document.createElement("div"),

        synthesis_option,

        key,
        
        i = 0;
    
    // AUDIO pane
    audio_container.className = "fs-fieldset";
    audio_container_legend.innerHTML = "AUDIO out";
    audio_div.innerHTML = "on/off &nbsp;";
    audio_label.className = "fs-ck-label";
    audio_input.type = "checkbox";

    if (marker_obj.audio_out) {
        audio_input.checked = true;
    }

    audio_container.appendChild(audio_container_legend);
    audio_container.appendChild(audio_label);
    audio_label.appendChild(audio_div);
    audio_label.appendChild(audio_input);

    _applyCollapsible(audio_container, audio_container_legend, true);

    audio_input.addEventListener("change", _cbMarkerSettingsChange(marker_obj, function (self, instance, marker_obj) {
        marker_obj.audio_out = self.checked;
        _saveMarkersSettings();
    }));

    // OSC pane
    osc_container.className = "fs-fieldset";
    osc_container_legend.innerHTML = "OSC out";
    osc_div.innerHTML = "on/off &nbsp;";
    osc_label.className = "fs-ck-label";
    osc_input.type = "checkbox";

    if (marker_obj.osc_out) {
        osc_input.checked = true;
    }

    osc_container.appendChild(osc_container_legend);
    osc_container.appendChild(osc_label);
    osc_label.appendChild(osc_div);
    osc_label.appendChild(osc_input);

    _applyCollapsible(osc_container, osc_container_legend, true);

    osc_input.addEventListener("change", _cbMarkerSettingsChange(marker_obj, function (self, instance, marker_obj) {
        marker_obj.osc_out = self.checked;
        _saveMarkersSettings();
    }));

    // MIDI pane
    midi_custom_message_area.innerHTML = '// User-defined MIDI messages for note events\n// Pixels data ([0,1) float data) : l, r, b, a\n// MIDI channel : c\n\nif (type === "on") {\n    on = [];\n} else if (type === "change") {\n    change = [];\n} else if (type === "off") {\n    off = [];\n}';
    midi_custom_message_area.style.width = "94%";
    midi_custom_message_area.style.height = "180px";
    midi_custom_message_area.className = "fs-textarea";
    midi_custom_message_area.style.border = "1px solid #111111";

    if (marker_obj.midi_out.custom_midi_message.length > 0) {
        midi_custom_message_area.innerHTML = marker_obj.midi_out.custom_midi_message;
    }

    midi_dev_list_label.className = "fs-select-label";
    midi_dev_list_label.htmlFor = "fs_slice_settings_midi_device_" + marker_obj.id;
    midi_dev_list_label.innerHTML = "MIDI out device";
    midi_dev_list.id = "fs_slice_settings_midi_device_" + marker_obj.id;
    midi_dev_list.className = "fs-multiple-select";
    midi_dev_list.multiple = true;

    midi_dev_list_container.className = "fs-fieldset";
    midi_dev_list_container_legend.innerHTML = "MIDI out";

    midi_dev_out_container.appendChild(midi_dev_list_label);
    midi_dev_out_container.innerHTML += "&nbsp;";
    midi_dev_out_container.appendChild(midi_dev_list);
    midi_dev_list_container.appendChild(midi_dev_list_container_legend);
    midi_dev_list_container.appendChild(midi_dev_out_container);
    midi_dev_out_container.style = "text-align: center";

    midi_dev_list_container.appendChild(midi_custom_message_area);

    midi_custom_codemirror = CodeMirror.fromTextArea(midi_custom_message_area, {
        mode:  "text/javascript",
        styleActiveLine: true,
        lineNumbers: false,
        lineWrapping: true,
        theme: ((_code_editor_theme === null) ? "seti" : _code_editor_theme),
        matchBrackets: true
    });

    cm_element = midi_custom_codemirror.getWrapperElement();
    cm_element.style = "font-size: 10pt";

    CodeMirror.on(midi_custom_codemirror, 'change', _cbMarkerSettingsChange(marker_obj, function (self, instance, marker_obj) {
        marker_obj.midi_out.custom_midi_message = instance.getValue();
        
        clearTimeout(_marker_midi_message_timeout);
        _marker_midi_message_timeout = setTimeout(_compileMarkerMIDIData, 1000, marker_obj, instance);
    
        _saveMarkersSettings();
    }));

    _applyCollapsible(midi_dev_list_container, midi_dev_list_container_legend);

    marker_obj.custom_midi_codemirror = midi_custom_codemirror;

    _buildMarkerMIDIDevices(marker_obj, midi_dev_list);

    midi_dev_list.addEventListener("change", _cbMarkerSettingsChange(marker_obj, function (self, value, marker_obj) {
        var len = self.options.length,
            opt = null,
            uids = [],
            i = 0;
        
        for (i = 0; i < len; i += 1) {
            opt = self.options[i];

            if (opt.selected) {
                uids.push(opt.dataset.uid);
            }
        }

        marker_obj.midi_out.device_uids = uids;
        
        _saveMarkersSettings();
    }));    
    
    fs_slice_settings_x_input.id = "fs_slice_settings_x_input_" + marker_obj.id;
    fs_slice_settings_shift_input.id = "fs_slice_settings_shift_input_" + marker_obj.id;
    fs_slice_settings_channel_input.id = "fs_slice_settings_channel_input_" + marker_obj.id;
    fs_slice_settings_synthesis_select.id = "fs_slice_settings_synthesis_select" + marker_obj.id;
    fs_slice_settings_bpm.id = "fs_slice_settings_bpm_" + marker_obj.id;

    dialog_element.id = dialog_id;
    
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

            title: "X Offset (px)",

            title_min_width: 140,
            value_min_width: 88,

            on_change: _cbMarkerSettingsChange(marker_obj, function (self, value, marker_obj) {
                _setPlayPosition(marker_obj.element.dataset.slice, _parseInt10(value), 0, true);
            })
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

            title: "Y Shift (px)",

            title_min_width: 140,
            value_min_width: 88,

            on_change: _cbMarkerSettingsChange(marker_obj, function (self, value, marker_obj) {
                var slice = _getSlice(marker_obj.element.dataset.slice);
                
                slice.shift = _parseInt10(value);
                
                _submitSliceUpdate(1, marker_obj.element.dataset.slice, { shift : value });
            })
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

            title: "Output channel",

            title_min_width: 140,
            value_min_width: 88,

            on_change: _cbMarkerSettingsChange(marker_obj, function (self, value, marker_obj) {
                if (value <= 0) {
                    value = 1;
                }
                
                var slice = _getSlice(marker_obj.element.dataset.slice);
                
                slice.output_channel = _parseInt10(value);
                
                _submitSliceUpdate(3, marker_obj.element.dataset.slice, { output_channel : value });
                
                _computeOutputChannels();
            })
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

            title: "Increment / frame (px)",
        
            //decimals: 2,

            title_min_width: 140,
            value_min_width: 88,

            on_change: _cbMarkerSettingsChange(marker_obj, function (self, value, marker_obj) {
                var slice = _getSlice(marker_obj.element.dataset.slice);
                
                slice.frame_increment = parseFloat(value);
            })
        });
    
    fs_slice_settings_container.appendChild(fs_slice_settings_x_input);
    fs_slice_settings_container.appendChild(fs_slice_settings_shift_input);
    fs_slice_settings_container.appendChild(fs_slice_settings_bpm);
    fs_slice_settings_container.appendChild(fs_slice_settings_channel_input);
    fs_slice_settings_container.appendChild(audio_container);
    fs_slice_settings_container.appendChild(osc_container);
    fs_slice_settings_container.appendChild(midi_dev_list_container);
    
    content_element.appendChild(fs_slice_settings_container);
    dialog_element.appendChild(content_element);

    document.body.appendChild(dialog_element);
    
    WUI_Dialog.create(dialog_element, {
        title: "Slice '"+marker_obj.id+"' settings",

        width: "360px",
        height: "auto",

        halign: "center",
        valign: "center",

        open: false,

        detachable: false,

        status_bar: false,
        draggable: true,
    
        header_btn: [
            {
                title: "Help",
                on_click: function () {
                    window.open(_documentation_link + "tutorials/slices/"); 
                },
                class_name: "fs-help-icon"
            }
        ]
    });
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
                output_channel: play_position_marker.output_channel
            });
    }

    _sendSlices(slices_settings); 
};

var _submitSliceUpdate = function (tid, id, obj) {
    clearTimeout(_slice_update_timeout[tid][id]);
    _slice_update_timeout[tid][id] = setTimeout(_sendSliceUpdate, 1000, id, obj);
};

var _submitAddSlice = function (x, shift, mute) {
    setTimeout(_sendAddSlice, 500, x, shift, mute);
};

var _submitRemoveSlice = function (id) {
    setTimeout(_sendRemoveSlice, 500, id);
};

var _muteSlice = function (slice_obj, submit) {
    var play_position_top_hook_element = slice_obj.element.firstElementChild,
        play_position_bottom_hook_element = slice_obj.element.lastElementChild;
    
    slice_obj.mute = true;
    if (slice_obj.type === 1) {
        play_position_top_hook_element.style.borderTopColor = "#550000";
        play_position_bottom_hook_element.style.borderBottomColor = "#550000";
    } else {
        play_position_top_hook_element.style.borderTopColor = "#555555";
        play_position_bottom_hook_element.style.borderBottomColor = "#555555";
    }    
    
    if (submit) {
        _submitSliceUpdate(2, slice_obj.element.dataset.slice, { mute : true }); 
    }
};

var _unmuteSlice = function (slice_obj, submit) {
    var play_position_top_hook_element = slice_obj.element.firstElementChild,
        play_position_bottom_hook_element = slice_obj.element.lastElementChild;    

    slice_obj.mute = false;
    play_position_top_hook_element.style.borderTopColor = _slice_type_color[slice_obj.type];
    play_position_bottom_hook_element.style.borderBottomColor = _slice_type_color[slice_obj.type];

    if (submit) {
        _submitSliceUpdate(2, slice_obj.element.dataset.slice, { mute : false });
    }
};


var _changeSliceType = function (slice_obj, type, submit) {
    var play_position_top_hook_element = slice_obj.element.firstElementChild,
        play_position_bottom_hook_element = slice_obj.element.lastElementChild;    

    slice_obj.type = type;
    if (!slice_obj.mute) {
        play_position_top_hook_element.style.borderTopColor = _slice_type_color[type];
        play_position_bottom_hook_element.style.borderBottomColor = _slice_type_color[type];
    } else {
        if (slice_obj.type === 1) {
            play_position_top_hook_element.style.borderTopColor = "#550000";
            play_position_bottom_hook_element.style.borderBottomColor = "#550000";
        } else {
            play_position_top_hook_element.style.borderTopColor = "#555555";
            play_position_bottom_hook_element.style.borderBottomColor = "#555555";
        }    
    }

    if (submit) {
        _submitSliceUpdate(4, slice_obj.element.dataset.slice, { type : type });
    }
};

var _addPlayPositionMarker = function (x, shift, mute, output_channel, slice_type, submit) {
    var play_position_marker_element = _domCreatePlayPositionMarker(_canvas, _canvas_height),
        play_position_marker_id = _play_position_markers.length,
        
        play_position_marker,

        play_position_top_hook_element = play_position_marker_element.firstElementChild,
        play_position_bottom_hook_element = play_position_marker_element.lastElementChild,

        local_session_marker,
        
        i = 0,
        
        is_mute = mute;

    if (x === undefined) {
        x = 0;
    }
    
    if (!is_mute) {
        is_mute = false;
    }

    play_position_top_hook_element.style.borderTopColor = _slice_type_color[slice_type];
    play_position_bottom_hook_element.style.borderBottomColor = _slice_type_color[slice_type];

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
            id: play_position_marker_id,
            type: slice_type,
            midi_out: {
                device_uids: [],
                custom_midi_message: "",
                custom_midi_message_fn: null,
            },
            osc_out: false,
            audio_out: true,
            custom_midi_codemirror: null
        });
    
    play_position_marker = _play_position_markers[play_position_marker_id];

    if (is_mute) {
        _muteSlice(play_position_marker);
    }

    if (_local_session_settings["markers"]) {
        local_session_marker = _local_session_settings.markers[play_position_marker_id];
        if (local_session_marker) {
            if (local_session_marker["midi_out"]) {
                play_position_marker.midi_out.device_uids = local_session_marker["midi_out"].device_uids;
                play_position_marker.midi_out.custom_midi_message = local_session_marker["midi_out"].custom_midi_message;

                _compileMarkerMIDIData(play_position_marker, null);
            }

            if (local_session_marker["osc_out"]) {
                play_position_marker.osc_out = local_session_marker["osc_out"];
            }

            if (local_session_marker["audio_out"]) {
                play_position_marker.audio_out = local_session_marker["audio_out"];
            }
        }
    }    
    
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
                fx_obj = { icon: "fs-fx-icon", tooltip: "FX",  on_click: function () {
                    _changeSliceType(play_position_marker, 1, true);
                } },
                synth_obj = { icon: "fs-fas-icon", tooltip: "Synth",  on_click: function () {
                    _changeSliceType(play_position_marker, 0, true);
                } },
                obj,
                type_obj;

            if (play_position_marker.type === 0 || play_position_marker.type === undefined) {
                type_obj = fx_obj;
            } else {
                type_obj = synth_obj;
            }
        
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
                    type_obj,
                    { icon: "fs-cross-45-icon", tooltip: "Delete",  on_click: function () {
                            _removePlayPositionMarker(play_position_marker_element.dataset.slice, true, true);
                        }}
                ]);

            return false;
        }, false);
    
    _createMarkerSettings(play_position_marker);  
    
    if (submit) {
        _submitAddSlice(x, shift, mute);
    }
};
