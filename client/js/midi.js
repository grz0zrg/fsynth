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

if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(
            function (m) {
                m.inputs.forEach(
                    function (midi_input) {
                        midi_input.onmidimessage = function (midi_message) {
                            var i = 0,
                                key, value;
                            
                            switch (midi_message.data[0] & 0xf0) {
                                case 0x90:
                                    if (midi_message.data[2] !== 0) { // note-on
                                        _keyboard = new Array(_polyphony_max * 3);
                                        _keyboard.fill(0);

                                        _keyboard_pressed[midi_message.data[1]] = {
                                                frq: _frequencyFromNoteNumber(midi_message.data[1]),
                                                vel: midi_message.data[2],
                                                time: Date.now()
                                            };

                                        i = 0;

                                        for (key in _keyboard_pressed) { 
                                            value = _keyboard_pressed[key];

                                            _keyboard[i] = value.frq;
                                            _keyboard[i + 1] = value.vel;
                                            _keyboard[i + 2] = Date.now();

                                            i += 3;

                                            if (i > _keyboard_data_length) {
                                                break;
                                            }
                                        }

                                        _setUniforms(_gl, "vec", _program, "keyboard", _keyboard, 3);
                                    }
                                    break;

                                case 0x80:
                                    delete _keyboard_pressed[midi_message.data[1]];

                                    _keyboard = new Array(_polyphony_max * 3);
                                    _keyboard.fill(0);

                                    i = 0;

                                    for (key in _keyboard_pressed) { 
                                        value = _keyboard_pressed[key];

                                        _keyboard[i] = value.frq;
                                        _keyboard[i + 1] = value.vel;
                                        _keyboard[i + 2] = value.time;

                                        i += 3;

                                        if (i > _keyboard_data_length) {
                                            break;
                                        }
                                    }

                                    _setUniforms(_gl, "vec", _program, "keyboard", _keyboard, 3);
                                    break;
                            }

                            WUI_RangeSlider.submitMIDIMessage(midi_message);
                        };
                    }
                );
        });
}