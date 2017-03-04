/* jslint browser: true */

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

var _fileChoice = function (cb) {
    var input = document.createElement("input");
    input.type = "file";
    input.addEventListener("change", cb, false);
    input.click();
};

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

    _addFragmentInput("image", image_element);
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
};

var _loadImage = function (e) {
    if (e === undefined) {
        _fileChoice(_loadImage);
        
        return;
    }
    
    var target = e.target,
            
        files = target.files, 
        file = files[0];
        
    if (files.length === 0) {
        return;
    }

    if (file.type.match('image.*')) {
        _loadImageFromFile(file);
    } else {
        _notification("Could not load the file '" + file.name + "' as an image.");
    }

    target.removeEventListener("change", _loadImage, false);
};

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

var _setPlayPosition = function (play_position_marker_id, x, y, submit) {
    var play_position_marker = _getSlice(play_position_marker_id),
        
        height = play_position_marker.height,
        
        canvas_offset = _getElementOffset(_canvas),

        bottom;

    play_position_marker.x = x;
    
    play_position_marker.element.style.left = (x + canvas_offset.left + 1) + "px";
/*
    if (y !== undefined) {
        bottom = y + height;

        play_position_marker.y = y;
    }
*/  
    WUI_RangeSlider.setValue("fs_slice_settings_x_input_" + play_position_marker.id, x);
    
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
        fs_slice_settings_channel_input = document.createElement("div");
    
    fs_slice_settings_x_input.id = "fs_slice_settings_x_input_" + marker_obj.id;
    fs_slice_settings_shift_input.id = "fs_slice_settings_shift_input_" + marker_obj.id;
    fs_slice_settings_channel_input.id = "fs_slice_settings_channel_input_" + marker_obj.id;
    
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
                var slice = _getSlice(marker_obj.element.dataset.slice);
                
                slice.output_channel = _parseInt10(value);
                
                _submitSliceUpdate(3, marker_obj.element.dataset.slice, { output_channel : value });
                
                _computeOutputChannels();
            }
        });
    
    fs_slice_settings_container.appendChild(fs_slice_settings_x_input);
    fs_slice_settings_container.appendChild(fs_slice_settings_shift_input);
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
    
    play_position_marker_element.addEventListener('click', function (ev) {
            _updateSliceSettingsDialog(play_position_marker);
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
        
        fs_settings_max_polyphony = localStorage.getItem('fs-max-polyphony'),
        fs_settings_osc_fadeout = localStorage.getItem('fs-osc-fadeout'),
        fs_settings_show_globaltime = localStorage.getItem('fs-show-globaltime'),
        fs_settings_show_polyinfos = localStorage.getItem('fs-show-polyinfos'),
        fs_settings_show_oscinfos = localStorage.getItem('fs-show-oscinfos'),
        fs_settings_hlmatches = localStorage.getItem('fs-editor-hl-matches'),
        fs_settings_lnumbers = localStorage.getItem('fs-editor-show-linenumbers'),
        fs_settings_xscrollbar = localStorage.getItem('fs-editor-advanced-scrollbar'),
        fs_settings_wavetable = localStorage.getItem('fs-use-wavetable'),
        fs_settings_monophonic = localStorage.getItem('fs-monophonic');
    
    _settings_dialog = WUI_Dialog.create(_settings_dialog_id, {
            title: "Session & global settings",

            width: "320px",
            height: "398px",

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: false,
            draggable: true
        });
    
    if (fs_settings_monophonic === "true") {
        _audio_infos.monophonic = fs_settings_monophonic;
        settings_ck_monophonic_elem.checked = true;
    } else {
        _audio_infos.monophonic = false;
        settings_ck_monophonic_elem.checked = false;
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
    
    settings_ck_monophonic_elem.addEventListener("change", function () {
            if (this.checked) {
                _audio_infos.monophonic = true;
            } else {
                _audio_infos.monophonic = false;
            }
        
            localStorage.setItem('fs-monophonic', this.checked);
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
            height: "645px",

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
                    nodes = ctrl_panel_element.firstElementChild.lastElementChild.childNodes;//.firstElementChild.id;

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

    WUI_ToolBar.create("fs_middle_toolbar", {
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
                    toggle_state: (_fs_state === 1 ? false : true),
                    on_click: _togglePlay,
                    tooltip: "Play/Pause"
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

                        output_code = output_code.replace(/void\s+mainImage\s*\(\s*out\s+vec4\s+fragColor\s*,\s*in\s+vec2\s+fragCoord\s*\)/, "void main ()");
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
    //                on_click: (function () { _loadImage(); }),
                    tooltip: "Add image",

                    type: "dropdown",

                    orientation: "n",

                    items: [
                        {
                            title: "Webcam",

                            on_click: (function () { _addFragmentInput("camera"); })
                        },
                        {
                            title: "Image",

                            on_click: _loadImage
                        }
                    ]

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
    
    // now useless, just safe to remove!
    _utterFailRemove();
};