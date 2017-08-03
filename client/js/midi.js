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
        detached_dialog_midi_settings_element = null;
    
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
                '        <div>(' + io_type + ') Enable</div>&nbsp;',
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
            
            value = _keyboard.pressed[key];
            
            _pkeyboard.data[value.channel * 3]     = value.frq;
            _pkeyboard.data[value.channel * 3 + 1] = value.vel;
            _pkeyboard.data[value.channel * 3 + 2] = value.time;
            
            _setUniforms(_gl, "vec", _program, "pKey", _pkeyboard.data, _pkeyboard.data_components);

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
}