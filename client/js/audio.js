/* jslint browser: true */


/***********************************************************
    Fields.
************************************************************/

var _FS_WAVETABLE = 0,
    _FS_OSC_NODES = 1,
    
    _audio_context = new window.AudioContext(),
    
    _analyser_node = _audio_context.createAnalyser(),
    _analyser_fftsize = 16384,
    
    _sample_rate = _audio_context.sampleRate,
    
    _volume = 0.05,

    // wavetable
    _wavetable_size = 4096,
    _wavetable = (function (wsize) {
            var wavetable = new Float32Array(wsize),

                wave_phase = 0,
                wave_phase_step = 2 * Math.PI / wsize,

                s = 0;

            for (s = 0; s < wsize; s += 1) {
                wavetable[s] = Math.sin(wave_phase);

                wave_phase += wave_phase_step;
            }

            return wavetable;
        })(_wavetable_size),
    
    _osc_mode = _FS_OSC_NODES,
    _osc_fadeout = 0.25,
    
    _oscillators,
    
    _periodic_wave = [],
    _periodic_wave_n = 16,

    _note_time = 1 / _fps,
    _note_time_samples = Math.round(_note_time * _sample_rate),
    
    _lerp_t_step = 1 / _note_time_samples,

    _notes_worker = new Worker("js/worker/notes_buffer.js"),
    _notes_worker_available = true,
    
    _curr_notes_data = [],
    _next_notes_data = [],
    
    _curr_sample = 0,
        
    _lerp_t = 0,
    
    _data_switch = false,
    
    _audio_infos = { 
            h: 0,
            base_freq: 0,
            octaves: 0,
            gain: _volume
        },
    
    _is_script_node_connected = false,
    _is_analyser_node_connected = false,
    
    _mst_gain_node,
    _script_node;

/***********************************************************
    Functions.
************************************************************/

var _createGainNode = function (dst, channel) {
    var gain_node = _audio_context.createGain();
    gain_node.gain.value = 0.0;
    if (channel) {
        gain_node.connect(dst, 0, channel);
    } else {
        gain_node.connect(dst);
    }

    return gain_node;
};

var _createMergerNode = function (dst) {
    var merger_node = _audio_context.createChannelMerger(2);
    merger_node.connect(dst);

    return merger_node;
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

var _generatePeriodicWaves = function (n) {
    var real   = new Float32Array(2),
        imag   = new Float32Array(2),
        a1     = 0.0,
        b1     = 1.0,
        offset = 0.0,
        step   = 1.0 / n,
        i      = 0;
    
    _periodic_wave = [];
    
    for (i = 0; i <= n; i += 1) {
        offset = 2 * Math.PI * (step * i);
        real[1] = a1 * Math.cos(offset) - b1 * Math.sin(offset);
        imag[1] = a1 * Math.sin(offset) + b1 * Math.cos(offset);

        _periodic_wave.push(_audio_context.createPeriodicWave(real, imag));
    }
    
    _periodic_wave_n = n - 1;
};

var _generateOscillatorSet = function (n, base_frequency, octaves) {
    var y = 0,
        frequency = 0.0,
        phase_step = 0.0,
        merger_node = null,
        gain_node_l = null,
        gain_node_r = null,
        octave_length = n / octaves;

    _oscillators = [];

    for (y = n; y >= 0; y -= 1) {
        frequency = base_frequency * Math.pow(2, y / octave_length);
        phase_step = frequency / _audio_context.sampleRate * _wavetable_size;
        
        merger_node = _createMergerNode(_mst_gain_node);
        gain_node_l = _createGainNode(merger_node, 0);
        gain_node_r = _createGainNode(merger_node, 1);

        var osc = {
            freq: frequency,
            
            // WebAudio periodic waves
            gain_node_l: gain_node_l,
            gain_node_r: gain_node_r,
            merger_node: merger_node,
            period: 1.0 / frequency,
            gain_l: 0,
            gain_r: 0,
            node: null,
            used: false,

            // wavetable
            phase_index: Math.random() * _wavetable_size, 
            phase_step: phase_step
        };

        _oscillators.push(osc);
    }
    
    _audio_infos.h = n;
    _audio_infos.base_freq = base_frequency;
    _audio_infos.octaves = octaves;
};

var _stopOscillators = function () {
    var osc = null,
        i = 0;
    
    for (i = 0; i < _oscillators.length; i += 1) {
        osc = _oscillators[i];
        if (osc.node) {
            osc.node.disconnect();
            osc.node.stop(_audio_context.currentTime + 0.01);
        }
    }
};

var _onOscillatorEnded = function () {
    this.node = null;
};

var _playOscillator = function (osc_obj, ts) {
    if (!osc_obj.used) {
        var osc_node = _audio_context.createOscillator();

        osc_node.setPeriodicWave(_periodic_wave[Math.round((ts % osc_obj.period) / osc_obj.period * _periodic_wave_n)]);

        osc_node.frequency.value = osc_obj.freq;

        osc_node.connect(osc_obj.gain_node_l);
        osc_node.connect(osc_obj.gain_node_r);
        osc_node.onended = _onOscillatorEnded;

        osc_node.start();
        
        osc_obj.node = osc_node;
        
        osc_obj.used = true;
    }
};

var _playSlice = function (pixels_data) {
    var data_length = pixels_data.length,
        audio_ctx_curr_time = _audio_context.currentTime,
        time_samples = audio_ctx_curr_time * _audio_context.sampleRate,
        osc = null,
        l = 0,
        r = 0,
        y = _oscillators.length - 1,
        i = 0;
    
    for (i = 0; i < data_length; i += 4) {
        l = pixels_data[i];
        r = pixels_data[i + 1];
        osc = _oscillators[y];
        
        if (l === 0) {
            osc.gain_node_l.gain.setTargetAtTime(0.0, audio_ctx_curr_time, _osc_fadeout);
        } else {
            osc.gain_node_l.gain.setTargetAtTime(l / 255.0, audio_ctx_curr_time, _osc_fadeout);
            
            _playOscillator(osc, time_samples);
        }
        
        if (r === 0) {
            osc.gain_node_r.gain.setTargetAtTime(0.0, audio_ctx_curr_time, _osc_fadeout);
        } else {
            osc.gain_node_r.gain.setTargetAtTime(r / 255.0, audio_ctx_curr_time, _osc_fadeout);
            
            _playOscillator(osc, time_samples);
        }
        
        if (osc.gain_node_r.gain.value === 0 && 
            osc.gain_node_l.gain.value === 0 && osc.node) {
            osc.node.stop(audio_ctx_curr_time + 0.1);
            osc.used = false;
        }

        y -= 1;
    }
};

var _notesWorkerAvailable = function () {
    return _notes_worker_available;
};

var _notesProcessing = function (arr, prev_arr) {   
    var worker_obj,
        
        i = 0;
    
    if (_osc_mode === _FS_WAVETABLE) {
        if (_notes_worker_available) {
            _notes_worker.postMessage({
                    score_height: _canvas_height,
                    data: arr.buffer,
                    prev_data: prev_arr.buffer
                }, [arr.buffer, prev_arr.buffer]);

            _notes_worker_available = false;
        }
    } else if (_osc_mode === _FS_OSC_NODES) {
        _playSlice(arr);
    }
};

var _audioProcess = function (audio_processing_event) {
    var output_buffer = audio_processing_event.outputBuffer,

        output_data_l = output_buffer.getChannelData(0),
        output_data_r = output_buffer.getChannelData(1),

        output_data_length = output_data_l.length,

        output_l = 0, output_r = 0,

        wavetable = _wavetable,
        wavetable_size_m1 = _wavetable_size - 1,

        note_buffer = _curr_notes_data,
        note_buffer_len = note_buffer.length,// = note_buffer[0],

        osc,

        lerp_t_step = _lerp_t_step,
        
        lerp_t = _lerp_t,
        
        curr_sample = _curr_sample,

        sample,

        s, j, i;

    for (sample = 0; sample < output_data_length; sample += 1) {
        output_l = 0.0;
        output_r = 0.0;

        for (j = 0; j < note_buffer_len; j += 5) {
            var osc_index         = note_buffer[j],
                previous_volume_l = note_buffer[j + 1],
                previous_volume_r = note_buffer[j + 2],
                diff_volume_l     = note_buffer[j + 3],
                diff_volume_r     = note_buffer[j + 4];

            osc = _oscillators[osc_index];

            s = wavetable[osc.phase_index & wavetable_size_m1];
            
            output_l += (previous_volume_l + diff_volume_l * lerp_t) * s;
            output_r += (previous_volume_r + diff_volume_r * lerp_t) * s;

            osc.phase_index += osc.phase_step;

            if (osc.phase_index >= _wavetable_size) {
                osc.phase_index -= _wavetable_size;
            }
        }

        output_data_l[sample] = output_l;
        output_data_r[sample] = output_r;

        lerp_t += _lerp_t_step;

        curr_sample += 1;

        if (curr_sample >= _note_time_samples) {
            _lerp_t_step = 0;
            
            curr_sample = 0;
            
            if (_data_switch) {
                lerp_t = 0;
                _lerp_t = 0;
                
                _lerp_t_step = 1 / _note_time_samples;
                
                _curr_notes_data = new Float32Array(_next_notes_data);
                
                _data_switch = false;
            }
        }
    }

    _lerp_t = lerp_t;
    
    _curr_sample = curr_sample;
};

var _connectAnalyserNode = function () {
    if (!_is_analyser_node_connected) {
        _mst_gain_node.connect(_analyser_node);
        
        _is_analyser_node_connected = true;
    }
}

var _disconnectAnalyserNode = function () {
    if (_is_analyser_node_connected) {
        _mst_gain_node.disconnect(_analyser_node);
        
        _is_analyser_node_connected = false;
    }
};

var _connectScriptNode = function () {
    if (_script_node && !_is_script_node_connected) {
        _script_node.connect(_mst_gain_node);
        
        _is_script_node_connected = true;
    }
};

var _disconnectScriptNode = function () {
    if (_script_node && _is_script_node_connected) {
        _script_node.disconnect(_mst_gain_node);

        _is_script_node_connected = false;
    }
};

var _setGain = function (gain_value) {
    _volume = gain_value;

    if (_mst_gain_node) {
        if (_volume) {
            _mst_gain_node.gain.value = parseFloat(_volume);
        } else {
            _mst_gain_node.gain.value = 0;
        }
    }
    
    _audio_infos.gain = _volume;  
};

var _disableNotesProcessing = function () {
    _notes_worker_available = false;
    
    _curr_notes_data = [];
};

var _enableNotesProcessing = function () {
    _notes_worker_available = true;
};

/***********************************************************
    Init.
************************************************************/

var _audioInit = function () {
    _mst_gain_node = _createGainNode(_audio_context.destination);
    _setGain(_volume);
    
    _generateOscillatorSet(_canvas_height, 16.34, 10);
    _generatePeriodicWaves(16);

    _script_node = _audio_context.createScriptProcessor(0, 0, 2);
    _script_node.onaudioprocess = _audioProcess;

    if (!_fasEnabled() && _osc_mode === _FS_WAVETABLE) {
        _script_node.connect(_mst_gain_node);
        
        _is_script_node_connected = true;
    }

    _analyser_node.smoothingTimeConstant = 0;
    _analyser_node.fftSize = _analyser_fftsize;

    // workaround, webkit bug ?
    window._fs_sn = _script_node;

    _notes_worker.addEventListener('message', function (w) {
            _next_notes_data = w.data.d;

            _notes_worker_available = true;

            _data_switch = true;
        }, false);
};
