/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _audio_context = new window.AudioContext(),

    _sample_rate = _audio_context.sampleRate,

    _volume = 0.05,

    _audio_infos = { 
            h: 0,
            base_freq: 0,
            octaves: 0,
            gain: _volume,
            float_data: false
        },
        
    _oscillators = [];

/***********************************************************
    Functions.
************************************************************/

var _setGain = function (gain) {
    _volume = gain;
    _audio_infos.gain = _volume;
};

var _getOscillator = function (y) {
    if (y >= _oscillators.length || y < 0) {
        return null;
    }
        
    return _oscillators[y];
};

var _getFrequency = function (y) {
    var osc = _getOscillator(y);
    
    if (!osc) {
        return null;
    }
        
    return osc.freq;
};

var _attachMediaStream = function (stream) {
    _audio_context.createMediaStreamSource(stream)
};

var _generateOscillatorSet = function (n, base_frequency, octaves) {
    var y = 0,
        frequency = 0.0,
        octave_length = n / octaves;
    
    _oscillators = [];
    
    for (y = n - 1; y >= 0; y -= 1) {
        frequency = base_frequency * Math.pow(2, y / octave_length);
        
        var osc = {
            freq: frequency,
        };
        
        _oscillators.push(osc);
    }
    
    _audio_infos.h = n;
    _audio_infos.base_freq = base_frequency;
    _audio_infos.octaves = octaves;
};

var _computeOutputChannels = function () {
    var i = 0, j = 0, max = 0, marker;
    
    for (i = 0; i < _play_position_markers.length; i += 1) {
        marker = _play_position_markers[i];
        
        if (max < marker.output_channel) {
            max = marker.output_channel;
        }
    }
    
    _output_channels = max;

    for (i = 0; i < _output_channels; i += 1) {
        if (!_chn_settings[i]) {
            _chn_settings[i] = { osc: [], efx: [], muted: 0, chn_output: 0 };
        }
    }

    _allocateFramesData();
    _createFasSettingsContent();

    _fasSendChannelsInfos();

    _saveLocalSessionSettings();
};

var _decodeAudioData = function (audio_data, done_cb) {
    _audio_context.decodeAudioData(audio_data, function (buffer) {
            done_cb(buffer);
        },
        function (e) {
            _notification("An error occured while decoding the audio data " + e.err);
        });
};

/***********************************************************
    Init.
************************************************************/
