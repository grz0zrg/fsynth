/* jslint browser: true */


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
}