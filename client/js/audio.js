/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _FS_WORKLET = 0,
    _FS_OSC_NODES = 1,
    
    _audio_context = new window.AudioContext(),

    _notes_worker = new Worker("dist/worker/notes_buffer.min.js"),
    
    _analyser_node,// = _audio_context.createAnalyser(),
    _analyser_fftsize = 16384,
    _analyser_freq_bin,
    
    _sample_rate = _audio_context.sampleRate,
    
    _volume = 0.05,
    
    _fragment_worklet_node = null,
    _fragment_worklet_busy = false,
    _fragment_worklet_connected = false,
    
    _wavetable_size = 4096,
    
    _osc_mode = _FS_OSC_NODES,
    _osc_fadeout = 0.25,
    
    _oscillators,
    
    _stop_oscillators_timeout,

    _periodic_wave = [],
    _periodic_wave_n = 16,

    _note_time = 1 / _fps,
    _note_time_samples = Math.round(_note_time * _sample_rate),
    
    _lerp_t_step = 1 / _note_time_samples,
    
    _amp_divisor = 255.0,

    _curr_sample = 0,
        
    _lerp_t = 0,
    
    _audio_infos = { 
            h: 0,
            base_freq: 0,
            octaves: 0,
            gain: _volume,
            monophonic: false,
            float_data: false
        },
    
    _worklet_settings_timeout,
    
    _is_analyser_node_connected = false,
    
    _mst_gain_node;

/***********************************************************
    Functions.
************************************************************/

var _postWorkletSettings = function (data, tdata, clear) {
    if (!_fragment_worklet_node) {
        if (clear) {
            clearTimeout(_worklet_settings_timeout);
        }
        _worklet_settings_timeout = setTimeout(_postWorkletSettings, 2000, data, tdata, clear);
    } else {
        _fragment_worklet_node.port.postMessage(data, tdata);
    }
};

var _workletReady = function (wnode) {
    _fragment_worklet_node = wnode;
    
    _fragment_worklet_node.port.onmessage = function (event) {
        if (event.data.done) {
            _fragment_worklet_busy = false;
        }
    };
};

var _pauseWorklet = function () {
    _postWorkletSettings({ type: 1 });
};

var _playWorklet = function () {
    if (!_fasEnabled()) {
        _postWorkletSettings({ type: 2 });
    }    
};

var _disconnectWorklet = function () {
    if (_fragment_worklet_node) {
        if (_fragment_worklet_connected) {
            _fragment_worklet_node.disconnect(_mst_gain_node);

            _fragment_worklet_busy = false;
        }
        
        _pauseWorklet();
        
        _fragment_worklet_connected = false;
    }
};

var _connectWorklet = function () {
    if (_fragment_worklet_node && _osc_mode === _FS_WORKLET) {
        if (!_fragment_worklet_connected) {
            _fragment_worklet_node.connect(_mst_gain_node);
        }
        
        if (_fs_state === 0) {
            _playWorklet();
        }    
        
        _fragment_worklet_connected = true;
    }
};

var _createGainNode = function (dst, channel) {
    var gain_node = _audio_context.createGain();
    gain_node.gain.setTargetAtTime(0.0, 0.0, 0.0);
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

var _attachMediaStream = function (stream) {
    _audio_context.createMediaStreamSource(stream)
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
        octave_length = n / octaves,
        osc_obj,
        worklet_obj = [];
    
    if (_oscillators) {
        for (y = 0; y < _oscillators.length; y += 1) {
            osc_obj = _oscillators[y];

            osc_obj.merger_node.disconnect(_mst_gain_node);
            osc_obj.node.stop();
        }
    }

    _oscillators = [];
    
    for (y = n - 1; y >= 0; y -= 1) {
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
        
        var wosc = {
            freq: frequency,
            phase_index: Math.random() * _wavetable_size,
            phase_step: phase_step
        };
        
        osc.node = _audio_context.createOscillator();
        osc.node.setPeriodicWave(_periodic_wave[Math.round(Math.random() * _periodic_wave_n)]);
        //osc.node.frequency.value = osc.freq;
        osc.node.frequency.setTargetAtTime(osc.freq, 0.0, 0.0);
        osc.node.connect(osc.gain_node_l);
        osc.node.connect(osc.gain_node_r);
        osc.node.start();
        
        _oscillators.push(osc);
        worklet_obj.push(wosc);
    }
    
    _audio_infos.h = n;
    _audio_infos.base_freq = base_frequency;
    _audio_infos.octaves = octaves;
    
    _postWorkletSettings({
            oscillators: worklet_obj,
            wsize: _wavetable_size,
            nts: _note_time_samples,
            lts: _lerp_t_step,
            type: 0
        }, [], true);
};

var _stopOscillatorsCheck = function () {
    var osc = null,
        r = 0,
        l = 0,
        i = 0;
    
    for (i = 0; i < _oscillators.length; i += 1) {
        osc = _oscillators[i];
        if (osc.node) {
            r += osc.gain_node_r.gain.value;
            l += osc.gain_node_l.gain.value;
        }
    }
    
    if (r < 0.05 && l < 0.05) { // this may be unsafe!
        for (i = 0; i < _oscillators.length; i += 1) {
            osc = _oscillators[i];
            if (osc.node) {
                osc.node.stop(_audio_context.currentTime);
                osc.node.disconnect();
                osc.used = false;
            }
        }
    } else {
        window.clearTimeout(_stop_oscillators_timeout);
        _stop_oscillators_timeout = window.setTimeout(_stopOscillatorsCheck, 2000);
    }
};

var _stopOscillators = function () {
    var osc = null,
        audio_ctx_curr_time = _audio_context.currentTime,
        i = 0;
    
    for (i = 0; i < _oscillators.length; i += 1) {
        osc = _oscillators[i];
        if (osc.node) {
            osc.gain_node_l.gain.setTargetAtTime(0.0, audio_ctx_curr_time, _osc_fadeout);
            osc.gain_node_r.gain.setTargetAtTime(0.0, audio_ctx_curr_time, _osc_fadeout);
        }
    }
};

var _onOscillatorEnded = function () {
    this.node = null;
};

// this was used to allocate web audio oscillators dynamically, this was disabled because it seem unecessary, the browser seem to do it internally
// NOTE : it introduced memory leaks
var _playOscillator = function (osc_obj, ts) {
    var osc_node;
    
    if (!osc_obj.used) {
        osc_node = _audio_context.createOscillator();
        
        osc_obj.node = osc_node;

        osc_node.setPeriodicWave(_periodic_wave[Math.round((ts % osc_obj.period) / osc_obj.period * _periodic_wave_n)]);

        osc_node.frequency.value = osc_obj.freq;

        osc_node.connect(osc_obj.gain_node_l);
        osc_node.connect(osc_obj.gain_node_r);
        osc_node.onended = _onOscillatorEnded;

        osc_node.start();
        
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
        li = 0,
        ri = 1,
        i = 0;
    
    if (_audio_infos.monophonic) {
        li = 3;
        ri = 3;
    }
    
    for (i = 0; i < data_length; i += 4) {
        l = pixels_data[i + li];
        r = pixels_data[i + ri];
        osc = _oscillators[y];
        
        if (l === 0) {
            osc.gain_node_l.gain.setTargetAtTime(0.0, audio_ctx_curr_time, _osc_fadeout);
        } else {
            osc.gain_node_l.gain.setTargetAtTime(l / _amp_divisor, audio_ctx_curr_time, 0.001);
        }
        
        if (r === 0) {
            osc.gain_node_r.gain.setTargetAtTime(0.0, audio_ctx_curr_time, _osc_fadeout);
        } else {
            osc.gain_node_r.gain.setTargetAtTime(r / _amp_divisor, audio_ctx_curr_time, 0.001);
        }
        y -= 1;
    }
};

var _notesProcessing = function (prev_arr, arr) {   
    if (_osc_mode === _FS_OSC_NODES) {
        _playSlice(arr[0]);
    } else if (_fragment_worklet_node && _osc_mode === _FS_WORKLET) {
        if (_fragment_worklet_busy) {
            return;
        }

        _notes_worker.postMessage({
            data: arr[0].buffer,
            prev_data: prev_arr[0].buffer,
            score_height: _canvas_height,
            mono: _audio_infos.monophonic,
            float: _audio_infos.float_data,
        }, [arr[0].buffer, prev_arr[0].buffer]);
        
        _fragment_worklet_busy = true;
    }
};

/*
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
                
                _curr_notes_data = new Float32Array(_next_notes_data.pop());
                
                _data_switch = false;
            }
        }
    }

    _lerp_t = lerp_t;
    
    _curr_sample = curr_sample;
};
*/

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

var _setGain = function (gain_value) {
    _volume = gain_value;

    if (_mst_gain_node) {
        if (_volume) {
            _mst_gain_node.gain.setTargetAtTime(parseFloat(_volume), 0.0, 0.1);
            //_mst_gain_node.gain.value = parseFloat(_volume);
        } else {
            _mst_gain_node.gain.setTargetAtTime(0.0, 0.0, 0.0);
            //_mst_gain_node.gain.value = 0;
        }
    }
    
    _audio_infos.gain = _volume;  
};

var _computeOutputChannels = function () {
    var i = 0, max = 0, marker;
    
    for (i = 0; i < _play_position_markers.length; i += 1) {
        marker = _play_position_markers[i];
        
        if (max < marker.output_channel) {
            max = marker.output_channel
        }
    }
    
    _output_channels = max;
    _allocateFramesData();
    _createFasSettingsContent();
};

var _decodeAudioData = function (audio_data, done_cb) {
    _audio_context.decodeAudioData(audio_data, function (buffer) {
            done_cb(buffer);
        },
        function (e) {
            _notification("An error occured while decoding the audio data " + e.err);
        });
};

/*
var _getByteFrequencyData = function (pixels_data) {
    var i = 0,
        f = 0,
        y = 0,
        index = 0,
        d = new Uint8Array(_analyser_node.frequencyBinCount);
    
    for (i = 0; i < pixels_data.length; i += 4) {
        f = _getFrequency(y);

        index = Math.round(f / _sample_rate * _analyser_node.frequencyBinCount);
        d[index] += (pixels_data[i] + pixels_data[i + 1]) / 2;
        
        y += 1;
    }
        
    return d;
};
*/

/***********************************************************
    Init.
************************************************************/

var _audioInit = function () {
    _mst_gain_node = _createGainNode(_audio_context.destination);
    _setGain(_volume);
    
    _generatePeriodicWaves(16);
    _generateOscillatorSet(_canvas_height, 16.34, 10);

    try {
        var aw = new Function("readyCb", "audio_ctx", "mst_gain_node", "" +
            "class FragmentWorkletNode extends AudioWorkletNode {" +
            "    constructor(context) {" +
            "        super(context, 'fragment-worklet-processor');" +
            "    }" +
            "}" +
            //"audio_ctx.audioWorklet.addModule('dist/worker/input_worklet.js');" +
            "audio_ctx.audioWorklet.addModule('dist/worker/fragment_worklet.js').then(() => {" +
            "    let node = new FragmentWorkletNode(audio_ctx);" +
            "    node.connect(mst_gain_node);" +
            "    readyCb(node);" +
            "});");

        aw(_workletReady, _audio_context, _mst_gain_node);
        
        _osc_mode = _FS_WORKLET;
        
        _fragment_worklet_connected = true;
    } catch (e) {
        _notification("AudioWorklet unavailable... switching to OSC. mode.", 2500);

        console.log("AudioWorklet unavailable... switching to OSC. mode.");
        
        _fragment_worklet_connected = false;
    }

    _notes_worker.addEventListener("message", function (m) {
        var data = m.data;
    
        _fragment_worklet_node.port.postMessage({
            d: data.d,
            type: 500
        }, [data.d]);
    }, false);
};
