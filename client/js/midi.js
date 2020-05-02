/* jslint browser: true */


/***********************************************************
    Fields.
************************************************************/

var _midi_dialog_id = "fs_midi_output",
    _midi_dialog,

    _current_midi_out_slice = null,

    _midi_code_change_timeout = null,
    _midi_code_change_ms = 2000,
    
    _midi_codemirror_instance,
    _midi_codemirror_instance_detached,
    
    _midi_wrapped_code_change,
    _midi_wrapped_code_change_detached,

    _midi_access = null,
    
    _midi_devices = {
        input: {},
        output: {},
        
        i_total_active: 0,
        o_total_active: 0
    },
    
    _dead_notes_buffer,
    
    _mpe_instrument,
    
    _midi_notes = [],
    
    _midi_device_uid = 0;

/***********************************************************
    Functions.
************************************************************/

var _midiCodeChange = function () {
    if (_current_midi_out_slice !== null) {
        _current_midi_out_slice.midi_out.custom_midi_message = _midi_codemirror_instance.getValue();

        _compileMarkerMIDIData(_current_midi_out_slice);

        _saveMarkersSettings();
    }
};

var _midiBindCodeChangeEvent = function () {
    CodeMirror.on(_midi_codemirror_instance, 'change', _midi_wrapped_code_change);

    if (_midi_codemirror_instance_detached) {
        CodeMirror.on(_midi_codemirror_instance_detached, 'change', _midi_wrapped_code_change_detached);
    }
};

var _midiUnbindCodeChangeEvent = function () {
    CodeMirror.off(_midi_codemirror_instance, 'change', _midi_wrapped_code_change);

    if (_midi_codemirror_instance_detached) {
        CodeMirror.off(_midi_codemirror_instance_detached, 'change', _midi_wrapped_code_change_detached);
    }
};

var _midiDialogInit = function () {
    var custom_message_area = document.createElement("textarea"),

        midi_editor_div = document.getElementById("fs_midi_editor"),
        
        cm_element;
    
    custom_message_area.className = "fs-textarea";
    custom_message_area.style.border = "1px solid #111111";

    _midi_dialog = WUI_Dialog.create(_midi_dialog_id, {
        title: "MIDI Out Editor",

        width: "800px",
        height: "360px",
        min_height: "80px",

        halign: "center",
        valign: "center",

        open: false,

        status_bar: true,
        detachable: true,
        draggable: true,
        resizable: true,
        minimizable: true,

        status_bar_content: "",

        on_open: function () {
            _midi_codemirror_instance.refresh();
        },

        on_detach: function (new_window) {
            _current_midi_output = null;

            _midiUnbindCodeChangeEvent();

            var midi_editor_div = new_window.document.getElementById("fs_midi_editor"),
                textarea = document.createElement("textarea"),
                cm_element;
            
            new_window.document.head.innerHTML += '<link rel="stylesheet" type="text/css" href="css/codemirror/theme/' + _code_editor_theme + '.css"/>';
            
            textarea.className = "fs-textarea";
            textarea.style.border = "1px solid #111111";
            
            midi_editor_div.innerHTML = "";

            midi_editor_div.appendChild(textarea);

            _midi_codemirror_instance = CodeMirror.fromTextArea(textarea, {
                mode: "text/javascript",
                styleActiveLine: true,
                lineNumbers: true,
                lineWrapping: true,
                theme: ((_code_editor_theme === null) ? "seti" : _code_editor_theme),
                matchBrackets: true,
                scrollbarStyle: "native"
            });

            cm_element = _midi_codemirror_instance.getWrapperElement();
            cm_element.style = "font-size: 12pt";

            _midi_codemirror_instance_detached.setValue(_midi_codemirror_instance.getValue());

            _midi_codemirror_instance_detached.refresh();

            CodeMirror.on(_midi_codemirror_instance_detached, 'change', _midi_wrapped_code_change_detached);

            _midiBindCodeChangeEvent();
        },
    
        header_btn: [
            {
                title: "Help",
                on_click: function () {
                    window.open(_documentation_link + "tutorials/midi_output_editor/");
                },
                class_name: "fs-help-icon"
            }
        ]
    });

    midi_editor_div.appendChild(custom_message_area);

    _midi_codemirror_instance = CodeMirror.fromTextArea(custom_message_area, {
        mode: "text/javascript",
        styleActiveLine: true,
        lineNumbers: true,
        lineWrapping: true,
        theme: ((_code_editor_theme === null) ? "seti" : _code_editor_theme),
        matchBrackets: true,
        scrollbarStyle: "native"
    });

    cm_element = _midi_codemirror_instance.getWrapperElement();
    cm_element.style = "font-size: 12pt";

    _midi_wrapped_code_change = function () {
        clearTimeout(_midi_code_change_timeout);
        _midi_code_change_timeout = setTimeout(_midiCodeChange, _midi_code_change_ms);
    };

    _midi_wrapped_code_change_detached = function () {
        clearTimeout(_midi_code_change_timeout);
        _midi_code_change_timeout = setTimeout(_midiCodeChange, _midi_code_change_ms, _midi_codemirror_instance_detached.getValue());

        _midiUnbindCodeChangeEvent();

        _midi_codemirror_instance.setValue(_midi_codemirror_instance_detached.getValue());

        _midiBindCodeChangeEvent();
    };

    _midiBindCodeChangeEvent();

    _midiUpdateSlices();

    var detached_dialog = WUI_Dialog.getDetachedDialog(_midi_dialog);
    if (detached_dialog) {
        _midiUpdateSlices(detached_dialog.document);
    }
};

var _midiSelectSlice = function (slice) {
    if (_current_midi_out_slice === slice || slice === null) {
        return;
    }

    _current_midi_out_slice = slice;

    _midiUnbindCodeChangeEvent();

    _midi_codemirror_instance.setValue(slice.midi_out.custom_midi_message);

    if (_midi_codemirror_instance_detached) {
        _midi_codemirror_instance_detached.setValue(slice.midi_out.custom_midi_message);
    }

    _midiUpdateSlices();

    var detached_dialog = WUI_Dialog.getDetachedDialog(_midi_dialog);
    if (detached_dialog) {
        _midiUpdateSlices(detached_dialog.document);
    }

    _midiBindCodeChangeEvent();
};

var _midiChangeSourceCb = function (slice) {
    return function (e) {
        var elem = e.target;
        
        _midiSelectSlice(slice);

        if (elem.parentElement !== null) {
            elem.parentElement.childNodes.forEach(function (item) {
                item.classList.remove("fs-midi-selected");
            });

            elem.classList.add("fs-midi-selected");
        }
    };
};

var _midiUpdateSlices = function (doc) {
    if (!doc) {
        doc = document;
    }

    var i = 0,
        midi_editor_outputs = doc.getElementById("fs_midi_outputs"),
        slice,

        selected_output = _current_midi_out_slice,
        
        output_name_div;
    
    midi_editor_outputs.innerHTML = "";

    _current_midi_out_slice = null;

    for (i = 0; i < _play_position_markers.length; i += 1) {
        slice = _play_position_markers[i];
        
        if (slice.midi_out.enabled) {
            output_name_div = doc.createElement("div");
            output_name_div.className = "fs-pjs-input";
            output_name_div.innerHTML = "Slice " + i;

            if (selected_output === slice) {
                output_name_div.classList.add("fs-midi-selected");

                _current_midi_out_slice = slice;
            }

            midi_editor_outputs.appendChild(output_name_div);

            output_name_div.addEventListener("click", _midiChangeSourceCb(slice));
        }
    }
};

var _midiDeviceIOUpdate = function () {
    var key;

    _midi_devices.i_total_active = 0;
    _midi_devices.o_total_active = 0;
    
    for (key in _midi_devices.input) { 
        if(_midi_devices.input[key].enabled) {
            _midi_devices.i_total_active += 1;
        }
    }
    
    for (key in _midi_devices.output) { 
        if(_midi_devices.output[key].enabled) {
            _midi_devices.o_total_active += 1;
        }
    }
};

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
        
        for(key in midi_settings_obj.o) { 
            midi_device = midi_settings_obj.o[key];
            
            _midi_devices.output[key] = {
                    enabled: midi_device.enabled
                };
        }

        _midiDeviceIOUpdate();
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
    
    for(key in _midi_devices.output) { 
        midi_device = _midi_devices.output[key];
        
        midi_settings_obj.o[key] = {
                enabled: midi_device.enabled
            };
    }
    
    _local_session_settings['midi_settings'] = JSON.stringify(midi_settings_obj);
    _saveLocalSessionSettings();
};

var _MIDIDeviceCheckboxChange = function () {
    var midi_device = _midi_devices[this.dataset.type][this.dataset.did],
        
        midi_enabled_ck_id = "fs_midi_settings_ck_" + midi_device.iid;

    midi_device.enabled = this.checked;
    
    _saveMIDISettings();
    
    if (this.checked) {
        document.getElementById(midi_enabled_ck_id).setAttribute("checked", "checked");
        document.getElementById(midi_enabled_ck_id + '_status').style.color = 'lightgreen';
    } else {
        document.getElementById(midi_enabled_ck_id).removeAttribute("checked");
        document.getElementById(midi_enabled_ck_id + '_status').style.color = 'grey';
    }
    
    _midiDeviceIOUpdate();
};

var _resetMIDIDevice = function () {
    var i = 0;

    for (i = 0; i < 16; i += 1) {
        _midiSendAllActive([0xB0 + i, 0x7B, 0x0, 0xB0 + i, 0x78, 0x0]);
    }    
};

var _addMIDIDevice = function (midi, io_type) {
    var midi_element = document.createElement("div"),
        midi_enabled_ck_id = "fs_midi_settings_ck_" + _midi_device_uid,
        midi_settings_in_element = document.getElementById("fs_midi_in_container"),
        midi_settings_out_element = document.getElementById("fs_midi_out_container"),
        midi_device_enabled = (io_type === "output"),
        midi_device_enabled_ck = (io_type === "output" ? "checked" : ""),
        
        tmp_element = null,

        i = 0,
        
        detached_dialog = WUI_Dialog.getDetachedDialog(_midi_settings_dialog),
        detached_dialog_midi_in_element = null,
        detached_dialog_midi_out_element = null;
    
    // settings were loaded previously
    if (midi.id in _midi_devices[io_type]) {
        midi_device_enabled = _midi_devices[io_type][midi.id].enabled;
        if (midi_device_enabled) {
            midi_device_enabled_ck = "checked";
        }
        
        if (_midi_devices[io_type][midi.id].connected) {
            return;
        }
    }

    midi_element.classList.add("fs-midi-settings-device");

    midi_element.innerHTML = [
                '<div>',
                midi.name,
                '</div>',
                '    <label class="fs-ck-label">',
                ' <span id="' + midi_enabled_ck_id + '_status" style="color: ' + ((midi_device_enabled_ck === "checked") ? "lightgreen" : "grey") + '">Enabled</span> </div>&nbsp;',
                '        <input id="' + midi_enabled_ck_id + '" type="checkbox" class="fs-checkbox" data-type="' + io_type + '" data-did="' + midi.id + '" ' + midi_device_enabled_ck + '>',
                '    </label>'].join('');

    if (io_type === "input") {
        midi_settings_in_element.appendChild(midi_element);
    } else {
        midi_settings_out_element.appendChild(midi_element);
    } 

    _midi_devices[io_type][midi.id] = {
            obj: midi,
            type: midi.type,
            id: midi.id,
            manufacturer: midi.manufacturer,
            name: midi.name,
            version: midi.version,
            iid: _midi_device_uid,
            enabled: midi_device_enabled,
            element: midi_element,
            detached_element: null,
            connected: true
        };

    document.getElementById(midi_enabled_ck_id).addEventListener("change", _MIDIDeviceCheckboxChange);
    
    if (detached_dialog) {
        tmp_element = midi_element.cloneNode(true);
        
        if (io_type === "input") {
            detached_dialog_midi_in_element = detached_dialog.document.getElementById("fs_midi_in_container");
            detached_dialog_midi_in_element.appendChild(tmp_element);
        } else {
            detached_dialog_midi_out_element = detached_dialog.document.getElementById("fs_midi_out_container");
            detached_dialog_midi_out_element.appendChild(tmp_element);
        }    
        
        _midi_devices[io_type][midi.id].detached_element = tmp_element;
    }
    
    if (io_type === "input") {
        midi.onmidimessage = _onMIDIMessage;
    }
    
    _midi_device_uid += 1;

    _midiDeviceIOUpdate();

    // re-initialize MIDI device, default program change
    for (i = 0; i < 16; i += 1) {
        _midiSendToDevice([0xC0 + i, 0x00], "output", midi.id);
    }

    _rebuildMarkersMIDIDevices();
};

var _deleteMIDIDevice = function (id, type) {
    var midi_device = _midi_devices[type][id],
        
        detached_dialog = WUI_Dialog.getDetachedDialog(_midi_settings_dialog),
        
        nodes;
    
    if (!midi_device) {
        console.log("_deleteMIDIDevice: MIDI Device ", id, " does not exist.");
        return;
    }
    
    midi_device.element.parentElement.removeChild(midi_device.element);
    
    if (detached_dialog) {
        nodes = detached_dialog.document.querySelectorAll("[data-did='" + id + "']");
        
        if (nodes.length > 0) {
            nodes[0].parentElement.parentElement.parentElement.removeChild(nodes[0].parentElement.parentElement);
        }
    }
    
    delete _midi_devices[type][id];

    _midiDeviceIOUpdate();

    _rebuildMarkersMIDIDevices();
};

var _getMIDIDevices = function (io_type) {
    return _midi_devices[io_type];
};

var _onMIDIAccessChange = function (connection_event) {
    var device = connection_event.port;

    if (device.type !== "input" && device.type !== "output") {
        return;
    }

    if (device.state === "connected") {
        _addMIDIDevice(device, device.type);
    } else if (device.state === "disconnected") {
        _deleteMIDIDevice(device.id, device.type);
    }
};

var _midiSendAllActive = function (msg_arr) {
    var key, midi_device;
    
    for(key in _midi_devices.output) { 
        midi_device = _midi_devices.output[key];
        
        if (midi_device.enabled) {
            if (midi_device.obj) {
                midi_device.obj.send(msg_arr);
            }    
        }
    }
};

var _midiSendToDevice = function (msg_arr, device_type, device_uids) {
    var i = 0,
        midi_device;

    for (i = 0; i < device_uids.length; i += 1) {
        midi_device = _midi_devices[device_type][device_uids[i]];

        if (!midi_device) {
            return;
        }
        
        if (midi_device.enabled) {
            try {
                midi_device.obj.send(msg_arr);
            } catch (e) {
                console.log("_midiSendToDevice: Tried to send invalid MIDI data.", e);
            }    
        }
    }    
};

var _getMIDINoteObj = function (chn, note) {
    if (!_midi_notes[chn][note]) {
        _midi_notes[chn][note] = { on: false, chn: 0 };
    }
    
    return _midi_notes[chn][note];
};

var _midiDataOut = function (pixels_data) {
    if (_midi_devices.o_total_active === 0 && pixels_data.length > 1) {
        return;
    }

    var data_length,
        buffer = [],
        data,
        prev_data,
        osc = null,
        l = 0, pl = 0,
        r = 0, pr = 0,
        y = 0,
        li = 0,
        ri = 1,
        i = 0,
        k = 0,
        j = 0,
        b = 0,
        a = 0,
        chn,

        midi_chn_data_index = _output_channels,

        notes,

        inv_full_brightness = 1,

        midi_volume,
        midi_panning,

        midi_message = [],
        
        midi_bend = 0,

        midi_obj,

        midi_note = 0,
        midi_note_fractional = 0,
        midi_note_obj;
    
    if (!_audio_infos.float_data) {
        inv_full_brightness = 1 / 255.0;
    }
    
    if (_audio_infos.monophonic) {
        li = 3;
        ri = 3;
    }

    for (i = 0; i < _output_channels; i += 1) {
        buffer.push(new _synth_data_array(_canvas_height_mul4));
    }

    for (k = 0; k < midi_chn_data_index; k += 1) {
        data = pixels_data[k];
        prev_data = _prev_midi_data[k];
        data_length = data.length - 1;

        y = _oscillators.length - 1;
        
        for (i = 0; i < data_length; i += 4) {
            l = data[i + li];
            r = data[i + ri];
            b = data[i + 2];
            a = data[i + 3];
            
            pl = prev_data[i + li];
            pr = prev_data[i + ri];
            
            osc = _oscillators[y];

            midi_obj = pixels_data[midi_chn_data_index + k];

            if (!midi_obj) {
                y -= 1;
                continue;
            }

            if (l > 0 || r > 0) {
                l *= inv_full_brightness;
                r *= inv_full_brightness;
                b *= inv_full_brightness;
                a *= inv_full_brightness;

                midi_note_fractional = _hzToMIDINote(osc.freq);
                midi_note = Math.min(Math.round(midi_note_fractional), 127);
                
                midi_note_obj = _getMIDINoteObj(k, midi_note_fractional);

                midi_volume = Math.min(Math.round((l + r) / 2 * 127), 127);

                if ((pl <= 0 || pr <= 0) /*&& !midi_note_obj.on*/) {
                    chn = 0;
                    notes = Infinity;

                    for (j = 0; j < 16; j += 1) {
                        if (_midi_notes[j].notes === 0) {
                            chn = j;
                            break;
                        }

                        if (_midi_notes[j].notes < notes) {
                            chn = j;
                            notes = _midi_notes[chn].notes;
                        }
                    }

                    if (midi_note_obj.on) {
                        _midi_notes[midi_note_obj.chn].notes -= 1;

                        midi_message = [0x80 + midi_note_obj.chn, midi_note, 127];

                        if (midi_obj.custom_midi_message_fn) {
                            midi_message = midi_message.concat(midi_obj.custom_midi_message_fn("off", l, r, b, a, midi_note_obj.chn).off);
                        }

                        _midiSendToDevice(midi_message, "output", midi_obj.device_uids);
                    }

                    _midi_notes[chn].notes += 1;

                    midi_bend = _getMIDIBend(osc.freq, midi_note);

                    midi_panning = _getMIDIPan(l, r);

                    midi_message = [];

                    if (midi_obj.custom_midi_message_fn) {
                        midi_message = midi_obj.custom_midi_message_fn("on", l, r, b, a, chn).on;
                    }
                    
                    if (midi_message) {
                        midi_message = midi_message.concat([0xE0 + chn, midi_bend & 0x7F, (midi_bend >> 7),
                        0xB0 + chn, 0x0A, midi_panning,
                        0x90 + chn, midi_note, midi_volume]);
                    
                        _midiSendToDevice(midi_message, "output", midi_obj.device_uids);

                        midi_note_obj.on = true;
                        midi_note_obj.chn = chn;
                    }
                }
                
                if (pl !== l || pr !== r) {
                    if (midi_note_obj.on && _midi_notes[midi_note_obj.chn].notes <= 1) {
                        if (midi_obj.custom_midi_message_fn) {
                            midi_message = midi_obj.custom_midi_message_fn("change", l, r, b, a, midi_note_obj.chn).change;

                            _midiSendToDevice(midi_message, "output", midi_obj.device_uids);
                        }
                    }
                }
            } else {
                if (pl > 0 || pr > 0) {
                    midi_note_fractional = _hzToMIDINote(osc.freq);
                    midi_note = Math.min(Math.round(midi_note_fractional), 127);
                    
                    midi_note_obj = _getMIDINoteObj(k, midi_note_fractional);

                    if (midi_note_obj.on) {
                        _midi_notes[midi_note_obj.chn].notes -= 1;

                        midi_message = [0x80 + midi_note_obj.chn, midi_note, 127];

                        if (midi_obj.custom_midi_message_fn) {
                            midi_message = midi_message.concat(midi_obj.custom_midi_message_fn("off", l, r, b, a, midi_note_obj.chn).off);
                        }

                        if (midi_message) {
                            _midiSendToDevice(midi_message, "output", midi_obj.device_uids);
                        
                            midi_note_obj.on = false;
                        }
                    }
                }
            }

            y -= 1;
        }
    }

    for (i = 0; i < _output_channels; i += 1) {
        _prev_midi_data[i] = pixels_data[i];
    }

    _midi_data = buffer;
};

var _MIDInotesCleanup = function () {
    var key, value, i = 0, v;

    // cleanup all MIDI dead notes
    for (key in _dead_notes_buffer) {
        v = _dead_notes_buffer[key];

        _keyboard.data.splice(v.i, _keyboard.data_components);

        delete _keyboard.pressed[v.k];

        for (key in _keyboard.pressed) { 
            value = _keyboard.pressed[key];

            if (value.id > v.i) {
                value.id -= _keyboard.data_components;

                if (_dead_notes_buffer[key]) {
                    _dead_notes_buffer[key].i = value.id;
                }
            }
        }
    }
};

var _MIDInotesUpdate = function (date) {
    var et = 0, key, v;
    
    _dead_notes_buffer = {};
    
    // update notes time
    for (key in _keyboard.pressed) { 
        v = _keyboard.pressed[key];
        
        // check if we need to cleanup the note
        if (v.noteoff) {
            et = date - v.noteoff_time;
            
            if (et >= _keyboard.note_lifetime) {
                _dead_notes_buffer[key] = {
                        k: key,
                        i: v.id
                    };
                
                // dead notes will be cleaned up before the next frame begin (see _MIDInotesCleanup)
                
                continue;
            }
        }

        et = date - v.time;

        _keyboard.data[v.id + 2] = et / 1000;
    }

    _keyboard.polyphony = _keyboard.data.length / _keyboard.data_components - 1;
}

// general MIDI messages processing
var _onMIDIMessage = function (midi_message) {
    var i = 0, midi_device = _midi_devices.input[this.id];

    if (!midi_device.enabled) {
        return;
    }
    
    _mpe_instrument.processMidiMessage(midi_message.data);

    WUI_RangeSlider.submitMIDIMessage(midi_message);
};

// MPE/MIDI messages (provided by mpejs)
var _mpeMIDIMessage = function (notes) {
    var i = 0,
        data, note, key, chn, d;
    
    for (i = 0; i < notes.length; i += 1) {
        data = notes[i];
        chn = data.channel - 1;

        key = chn + "_" + data.noteNumber;
        note = _keyboard.pressed[key];

        if (data.noteState !== 0) {
            if (!data.frq) {
                data.frq = _frequencyFromNoteNumber(data.noteNumber);
            }
            
            if (_fasEnabled()) {
                // re-trigger on FAS side for physical modelling (because this type of synthesis require it)
                if (_chn_settings[chn] !== undefined) {
                    if ((_chn_settings[chn].osc[1] === 5) && note) {
                        if (note.noteoff) {
                            var osc = _hzToOscillator(data.frq, _audio_infos.base_freq, _audio_infos.octaves, _audio_infos.h);
                            _fasNotify(_FAS_ACTION, { type: 1, note: osc, chn: chn + 1 });
                        }
                    }
                }
            }
            
            if (note) { // note update / re-trigger
                if (note.noteoff) { // re-trigger
                    d = _keyboard.pressed[key];
                    
                    d.time = Date.now();
                    d.noteoff = false;
                    d.noteoff_time = 0;
                    d.pressure = data.pressure;
                    d.timbre = data.timbre;
                    d.pitchBend = data.pitchBend;
                    d.noteOnVelocity = data.noteOnVelocity;
                    d.frq = data.frq;
                    
                    _keyboard.data[note.id] = note.frq;
                    _keyboard.data[note.id + 1] = note.noteOnVelocity;
                    _keyboard.data[note.id + 2] = note.time;
                    _keyboard.data[note.id + 4] = note.pitchBend;
                    _keyboard.data[note.id + 5] = note.timbre;
                    _keyboard.data[note.id + 6] = note.pressure;
                } else { // note update
                    if (note.pitchBend === data.pitchBend && 
                        note.timbre === data.timbre && 
                        note.pressure === data.pressure) {
                        continue;
                    }
                    
                    note.pitchBend = data.pitchBend;
                    note.timbre = data.timbre;
                    note.pressure = data.pressure;

                    //_keyboard.data[note.id + 2] = Date.now();
                    _keyboard.data[note.id + 4] = note.pitchBend;
                    _keyboard.data[note.id + 5] = note.timbre;
                    _keyboard.data[note.id + 6] = note.pressure;
                }
            } else { // note-on
                if (_keyboard.data.length > _keyboard.data_length) {
                    _notification("Maximum polyphony reached. Please increase maximum polyphony.");
                }

                // remove the empty data
                _keyboard.data.splice(_keyboard.data.length - _keyboard.data_components, _keyboard.data_components);

                note = {
                        frq: data.frq,
                        noteOnVelocity: data.noteOnVelocity,
                        pitchBend: data.pitchBend,
                        timbre: data.timbre,
                        pressure: data.pressure,
                        time: Date.now(),
                        channel: chn,
                        noteoff: false,
                        noteoff_time: 0,
                        id: _keyboard.data.length
                    };

                _keyboard.data.push(note.frq, note.noteOnVelocity, note.time, note.channel, note.pitchBend, note.timbre, note.pressure, 0);
                _keyboard.data.push(0, 0, 0, 0, 0, 0, 0, 0); // fill up with empty data ("stop point")

                _keyboard.pressed[key] = note;
            }
        } else { // note-off
            if (note) {
                _keyboard.data[note.id + 7] = data.noteOffVelocity;
                
                _pkeyboard.data[note.channel * 3] = note.frq;
                _pkeyboard.data[note.channel * 3 + 1] = note.noteOnVelocity;
                _pkeyboard.data[note.channel * 3 + 2] = note.time;

                note.noteoff_time = Date.now();
                note.noteoff = true;

                _useProgram(_program);
                _setUniforms(_gl, "vec", _program, "pKey", _pkeyboard.data, _pkeyboard.data_components);
            }
        }
    }
};

var _midiAccessSuccess = function (midi_access) {
    _midi_access = midi_access;
    
    _mpe_instrument = mpe({
            log: null,
            normalize: true
        });
    
    _mpe_instrument.subscribe(_mpeMIDIMessage);
    
    _midi_access.inputs.forEach(
        function (midi_in) {
            _addMIDIDevice(midi_in, midi_in.type);
        }
    );

    _midi_access.outputs.forEach(
        function (midi_out) {
            _addMIDIDevice(midi_out, midi_out.type);
        }
    );
    
    _midi_access.onstatechange = _onMIDIAccessChange;
};

var _midiAccessFailure = function (msg) {
    var midi_settings_element = document.getElementById(_midi_settings_dialog_id).lastElementChild;

    midi_settings_element.innerHTML = "<center>Failed to get WebMIDI API access : " + msg + "</center>";
};

/***********************************************************
    Init.
************************************************************/

var _midiInit = function () {
    var i = 0,
        midi_settings_element = document.getElementById(_midi_settings_dialog_id).lastElementChild;

    _keyboard.data = [0, 0, 0, 0, 0, 0, 0, 0];

    if (_webMIDISupport()) {
        for (i = 0; i < 16; i += 1) {
            _midi_notes[i] = { notes: 0 };
        }

        navigator.requestMIDIAccess().then(_midiAccessSuccess, _midiAccessFailure);
    } else {
        midi_settings_element.style.paddingTop = "12px";
        midi_settings_element.innerHTML = _webmidi_support_msg;
    }

    _midiDialogInit();
}