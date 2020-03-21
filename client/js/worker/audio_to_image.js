/*jslint browser: true*/
/*continue: true*/
/*global self,postMessage*/

/*
    Dedicated worker to convert audio data to image data (aka. spectrum), quite generic!
*/

/***********************************************************
    Include.
************************************************************/

// dependency
/*#include ../ccwt/ccwt.js*/

CCWT.onReady = function () {

};

/***********************************************************
    Fields.
************************************************************/

var _progress = 0,
    _prev_progress = 0,
    _stereo = false;

/***********************************************************
    Functions.
************************************************************/

var _convert = function (params, data) {
/*
    var note_time = params.note_time,
        note_samples = Math.round(note_time * params.sample_rate),

        window_size = params.settings.window_length,
        window_type = params.settings.window_type,
        
        window_alpha = params.settings.window_alpha,
        
        hop_divisor = params.settings.overlap, // overlap factor
        hop_length = Math.round(window_size / hop_divisor),
        
        stft_result_length = Math.round(window_size / 2),

        data_buffer = data,

        image_width  = Math.ceil(data_buffer.length / note_samples),
        image_height = params.settings.height,//note_samples,
        image_height_m1 = params.settings.height - 1,
                
        min_freq = params.settings.minfreq,
        max_freq = params.settings.maxfreq,
        
        overlap_frame_buffer = [],
        stft,

        image_data = new Uint8ClampedArray(image_width * image_height * 4),
        
        min_stft_freq = params.sample_rate / window_size,
        
        // id boundaries of the stft result matching our scale settings
        lid = Math.round(min_freq / min_stft_freq),
        hid = Math.round(max_freq / min_stft_freq),
        
        start = stft_result_length + lid,
        end = stft_result_length + lid + hid,
        
        n, adiff, amax = 0, amin = 255,
        
        progress_step = note_samples / data_buffer.length * 100,
    
        i,
        
        frame = 0;
*/
    var length_in_seconds = data.length / params.sample_rate,
    
        height = params.settings.height,

        minimum_frequency = params.settings.minfreq * length_in_seconds,
        maximum_frequency = params.settings.maxfreq * length_in_seconds,
    
        deviation = params.settings.deviation,

        // linear
        frequency_basis_linear = 0,
        frequency_range_linear = maximum_frequency - minimum_frequency,
        frequency_offset_linear = minimum_frequency,

        // logarithmic
        frequency_basis_log = 2.0, // each octave double the frequency
        minimum_octave = Math.log(minimum_frequency) / Math.log(frequency_basis_log),
        maximum_octave = Math.log(maximum_frequency) / Math.log(frequency_basis_log),

        frequency_range_log = maximum_octave - minimum_octave,
        frequency_offset_log = minimum_octave,

        frequencies = null,

        padding = params.settings.padding,

        gain_factor = params.settings.gain,
        fourier_transformed_signal,

        pixels_per_second = params.settings.pps,

        output_width,

        row_callback,
        
        image_data;

    
    if (params.settings.mapping === "linear") {
        // linear
        frequencies = CCWT.frequencyBand(height, frequency_range_linear, frequency_offset_linear, frequency_basis_linear, deviation);
    } else {
        // logarithmic
        frequencies = CCWT.frequencyBand(height, frequency_range_log, frequency_offset_log, frequency_basis_log, deviation);
    }

    // add some padding to avoid start / end oddities (when there is data at one/both end of the signal)
    fourier_transformed_signal = CCWT.fft1d(data, padding, gain_factor);

    output_width = Math.floor(length_in_seconds * pixels_per_second);

    image_data = new Uint8ClampedArray(output_width * height * 4);

    row_callback = function (y, row_data, output_padding) {
        var _progress = Math.round(y / height * 100);

        if (_progress != _prev_progress) {
            _prev_progress = _progress;

            var current_progress = _stereo ? _prev_progress / 2 : _prev_progress;

            if (current_progress % 5 === 0) {
                postMessage(current_progress);
            }
        }
        
        var x = 0
        for (x = 0; x < output_width; ++x) {
            var r = row_data[output_padding * 2 + x * 2];
            var i = row_data[output_padding * 2 + x * 2 + 1];

            var amplitude_raw = Math.hypot(r, i);

            // linear intensity
            var value_sign = (0 < amplitude_raw) - (amplitude_raw < 0);
            var amplitude = Math.min(amplitude_raw * value_sign, 1.0) * value_sign;
            
            var color = Math.round(amplitude * 255);

            var index = y * output_width * 4 + x * 4;
            image_data[index] = color;
            image_data[index + 1] = color;
            image_data[index + 2] = color;
            image_data[index + 3] = 255;
        }
    };

    CCWT.numericOutput(fourier_transformed_signal, padding, frequencies, 0, frequencies.length / 2, output_width, row_callback);

    var i, n, amax = 0, amin = 255, adiff;

    // mag. normalization
    for (i = 0; i < image_data.length; i += 4) {
        n = image_data[i];
        amax = n > amax ? n : amax;
        amin = n < amin ? n : amin;
    }

    adiff = 255 / (amax - amin);

    for (i = 0; i < image_data.length; i += 4) {
        image_data[i] -= amin;
        image_data[i + 1] -= amin;
        image_data[i + 2] -= amin;
        
        image_data[i] *= adiff;
        image_data[i + 1] *= adiff;
        image_data[i + 2] *= adiff;
    }
   
    return { width: output_width, height: height, data: image_data };
};

// when in stereo, we basically assign R = L, G = R and G = (L + R) / 2
var _mergeChannels = function (l, r) {
    var i = 0;
    
    for (i = 0; i < l.length; i += 4) {
        l[i + 1] = r[i + 1];
        l[i + 2] = (l[i] + r[i + 1]) / 2;
        l[i + 3] = (l[i + 3] + r[i + 3]) / 2;
    }
    
    return l;
};

self.onmessage = function (m) {
    "use strict";

    var data = m.data,

        l = new Float32Array(data.left),
        r = null,
        
        ll = null,
        rr = null,
        
        result = {
            pbuffer: null,
            width: null,
            height: null
        };
    
    _progress = 0;
    
    _stereo = (data.right !== null);
    
    ll = _convert(data, l);

    if (data.right) {
        r = new Float32Array(data.right);
        rr = _convert(data, r);
        
        result.pbuffer = _mergeChannels(ll.data, rr.data).buffer;
    } else {
        result.pbuffer = ll.data.buffer;
    }

    result.width = ll.width;
    result.height = ll.height;
    
    postMessage(result, [result.pbuffer]);
};
