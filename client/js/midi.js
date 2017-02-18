/* jslint browser: true */


/***********************************************************
    Fields.
************************************************************/

/***********************************************************
    Functions.
************************************************************/

/***********************************************************
    Init.
************************************************************/

var _midiInit = function () {
    var i = 0;
    
    _keyboard.data = [];
    
    for (i = 0; i < _keyboard.polyphony_max; i += 1) {
        _keyboard.data[i] = 0;
    }

    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(
                function (m) {
                    m.inputs.forEach(
                        function (midi_input) {
                            midi_input.onmidimessage = function (midi_message) {
                                var i = 0,
                                    key, value, channel = midi_message.data[0] & 0x0f;

                                switch (midi_message.data[0] & 0xf0) {
                                    case 0x90:
                                        if (midi_message.data[2] !== 0) { // note-on
                                            key = channel + "_" + midi_message.data[1];
                                            
                                            _keyboard.data = new Array(_keyboard.data_length);
                                            _keyboard.data.fill(0);

                                            _keyboard.pressed[key] = {
                                                    frq: _frequencyFromNoteNumber(midi_message.data[1]),
                                                    vel: midi_message.data[2],
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
                        }
                    );
            });
    }
}