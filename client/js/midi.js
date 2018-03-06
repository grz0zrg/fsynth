/* jslint browser: true */


/***********************************************************
    Fields.
************************************************************/

var _midi_access = null,
    
    _midi_devices = {
        input: {},
        output: {},
        
        i_total_active: 0,
        o_total_active: 0
    },
    
    _dead_notes_buffer,
    
    _mpe_instrument,
    
    _midi_notes = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
    
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
        
        for(key in midi_settings_obj.o) { 
            midi_device = midi_settings_obj.o[key];
            
            _midi_devices.output[key] = {
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
        
        midi_enabled_ck_id = "fs_midi_settings_ck_" + midi_device.iid,
        
        key;

    midi_device.enabled = this.checked;
    
    _saveMIDISettings();
    
    if (this.checked) {
        document.getElementById(midi_enabled_ck_id).setAttribute("checked", "checked");
    } else {
        document.getElementById(midi_enabled_ck_id).removeAttribute("checked");
    }
    
    _midi_devices.i_total_active = 0;
    _midi_devices.o_total_active = 0;
    
    for(key in _midi_devices.input) { 
        if(_midi_devices.input[key].enabled) {
            _midi_devices.i_total_active += 1;
        }
    }
    
    for(key in _midi_devices.output) { 
        if(_midi_devices.output[key].enabled) {
            _midi_devices.o_total_active += 1;
        }
    }
};

var _addMIDIDevice = function (midi, io_type) {
    var midi_element = document.createElement("div"),
        midi_enabled_ck_id = "fs_midi_settings_ck_" + _midi_device_uid,
        midi_settings_element = document.getElementById(_midi_settings_dialog_id).lastElementChild,
        midi_device_enabled = false,
        midi_device_enabled_ck = "",
        
        tmp_element = null,
        
        detached_dialog = WUI_Dialog.getDetachedDialog(_midi_settings_dialog),
        detached_dialog_midi_settings_element = null,
        
        io_type_html ='<span style="color: ' + ((io_type === "input") ? "lightgreen" : "orange") + '">' + io_type + '</span>';
    
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
                midi.name,
                '<div>',
                '    <label class="fs-ck-label">',
                '        <div>' + io_type_html.toUpperCase() + ' Enable</div>&nbsp;',
                '        <input id="' + midi_enabled_ck_id + '" type="checkbox" data-type="' + io_type + '" data-did="' + midi.id + '" ' + midi_device_enabled_ck + '>',
                '    </label>',
                '</div>'].join('');

    midi_settings_element.appendChild(midi_element);

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
        
        detached_dialog_midi_settings_element = detached_dialog.document.getElementById(_midi_settings_dialog_id).lastElementChild,
        detached_dialog_midi_settings_element.appendChild(tmp_element);
        
        _midi_devices[io_type][midi.id].detached_element = tmp_element;
    }
    
    if (io_type === "input") {
        midi.onmidimessage = _onMIDIMessage;
    }
    
    _midi_device_uid += 1;
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
            nodes[0].parentElement.parentElement.parentElement.parentElement.removeChild(nodes[0].parentElement.parentElement.parentElement);
        }
    }
    
    delete _midi_devices[type][id]
};

var _onMIDIAccessChange = function (connection_event) {
    var device = connection_event.port;

    // only inputs are supported at the moment
    if (device.type !== "input"/* && device.type !== "output"*/) {
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
            midi_device.obj.send(msg_arr);
        }
    }
};

var _midiDataOut = function (pixels_data, prev_pixels_data) {
    var data_length,
        data,
        prev_data,
        osc = null,
        l = 0, pl = 0,
        r = 0, pr = 0,
        y = _oscillators.length - 1,
        li = 0,
        ri = 1,
        i = 0,
        k = 0,

        midi_note = 0;
    
    if (_audio_infos.monophonic) {
        li = 3;
        ri = 3;
    }
    
    for (k = 0; k < pixels_data.length; k += 4) {
        data = pixels_data[k];
        prev_data = prev_pixels_data[k];
        data_length = data.length;
        
        for (i = 0; i < data_length; i += 4) {
            l = data[i + li];
            r = data[i + ri];
            
            pl = data[i + li];
            pr = data[i + ri];
            
            osc = _oscillators[y];
            midi_note = _hzToMIDINote(osc.freq);
            
            if (!_midi_notes[k][midi_note]) {
                _midi_notes[k][midi_note] = { on: false };
            }
            
            midi_note = _midi_notes[k][midi_note];
            
            if (l > 0 || r > 0) {
                if (pl <= 0 || pr <= 0) {
                    _midiSendAllActive([0x90 + k, midi_note, 127]);
                    midi_note.on = true;
                }
                
                if (pl !== l || pr !== r) {
                    if (midi_note.on) {
                        _midiSendAllActive([0xB0 + k, 0x07, Math.floor((l + r) / 4)]);
                        _midiSendAllActive([0xB0 + k, 0x08, Math.floor(64 + (l - r) / 4)]);
                    }
                }
            } else {
                if (pl > 0 || pr > 0) {
                    if (midi_note.on) {
                        _midiSendAllActive([0x80 + k, midi_note, 127.]);
                        midi_note.on = false;
                    }
                }
            }

            y -= 1;
        }
    }
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

    _keyboard.polyphony = _keyboard.data.length / _keyboard.data_components;
}

// general MIDI messages processing
var _onMIDIMessage = function (midi_message) {
    var i = 0, midi_device = _midi_devices.input[this.id],
        key, frq, value, value2, channel = midi_message.data[0] & 0x0f;

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
                if (_chn_settings[chn][0] === 5 && note) {
                    if (note.noteoff) {
                        var osc = _hzToOscillator(data.frq, _audio_infos.base_freq, _audio_infos.octaves, _audio_infos.h);
                        _fasNotify(_FAS_ACTION, { type: 1, note: osc, chn: chn + 1 });
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

                    _keyboard.data[note.id + 4] = note.pitchBend;
                    _keyboard.data[note.id + 5] = note.timbre;
                    _keyboard.data[note.id + 6] = note.pressure;
                }
            } else { // note-on
                if (_keyboard.data.length > _keyboard.data_length) {
                    _notification("Cannot process more notes. Please increase maximum polyphony.");
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
    var midi_settings_element = document.getElementById(_midi_settings_dialog_id).lastElementChild;
    
    _midi_access = midi_access;
    
    _mpe_instrument = mpe({
            log: null,
            normalize: true
        });
    
    _mpe_instrument.subscribe(_mpeMIDIMessage);
    
    //midi_settings_element.innerHTML = '<div class="fs-midi-settings-section">I/O</div>';
    
    _midi_access.inputs.forEach(
        function (midi_in) {
            _addMIDIDevice(midi_in, midi_in.type);
        }
    );
/*
    _midi_access.outputs.forEach(
        function (midi_out) {
            _addMIDIDevice(midi_out, midi_out.type);
        }
    );
*/
    
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

    _keyboard.data = [0, 0, 0, 0, 0, 0, 0, 0];
/*
    for (i = 0; i < _keyboard.polyphony_max; i += 1) {
        _keyboard.data[i] = 0;
    }
*/
    if (_webMIDISupport()) {
        navigator.requestMIDIAccess().then(_midiAccessSuccess, _midiAccessFailure);
    } else {
        midi_settings_element.innerHTML = "<center>WebMIDI API is not enabled/supported by this browser, please use a <a href=\"https://caniuse.com/#search=midi\">compatible browser</a>.</center>";
    }
}