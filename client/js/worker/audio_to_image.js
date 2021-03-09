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

/***********************************************************
    Fields.
************************************************************/

var _progress = 0,
    _prev_progress = 0,
    _stereo = false;

/***********************************************************
    Functions.
************************************************************/

var _convert = function (ccwt_lib, params, data) {
    var length_in_seconds = data.length / params.sample_rate,
    
        height = params.settings.height,

        minimum_frequency = params.settings.minfreq * length_in_seconds,
        maximum_frequency = params.settings.maxfreq * length_in_seconds,
    
        deviation = params.settings.deviation,

        phase_import = params.settings.phase_import,

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

        progress_step = 1 / height * 100,

        output_width,

        row_callback,
        
        image_data;

    if (_stereo) {
        progress_step /= 2;
    }

    if (params.settings.mapping === "linear") {
        // linear
        frequencies = ccwt_lib.frequencyBand(height, frequency_range_linear, frequency_offset_linear, frequency_basis_linear, deviation);
    } else {
        // logarithmic
        frequencies = ccwt_lib.frequencyBand(height, frequency_range_log, frequency_offset_log, frequency_basis_log, deviation);
    }

    // add some padding to avoid start / end oddities (when there is data at one/both end of the signal)
    fourier_transformed_signal = ccwt_lib.fft1d(data, padding, gain_factor);

    output_width = Math.floor(length_in_seconds * pixels_per_second);

    image_data = new Uint8ClampedArray(output_width * height * 4);

    row_callback = function (y, row_data, output_padding) {
        _prev_progress = parseInt(_progress, 10);
        _progress += progress_step;

        var roundedProgress = parseInt(_progress, 10);
        
        if (roundedProgress != _prev_progress) {
            if (roundedProgress % 5 === 0) {
                postMessage(roundedProgress);
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

            if (phase_import) {
                var phase = Math.atan2(r, i);
                var phase_color = Math.round(phase * 255);

                image_data[index + 2] = phase_color;
            }
        }
    };

    ccwt_lib.numericOutput(fourier_transformed_signal, padding, frequencies, 0, frequencies.length / 2, output_width, row_callback);

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
        
        image_data[i] *= adiff;
        image_data[i + 1] *= adiff;
        
        if (!phase_import) {
            image_data[i + 2] -= amin;
            image_data[i + 2] *= adiff;
        }
    }
   
    return { width: output_width, height: height, data: image_data };
};

// when in stereo, we basically assign R = L, G = R and B = phase OR B = (L+R) / 2
var _mergeChannels = function (l, r, phase_import) {
    var i = 0;
    
    for (i = 0; i < l.length; i += 4) {
        l[i + 1] = r[i];
        if (phase_import) {
            l[i + 2] = r[i + 2];
        } else {
            l[i + 2] = (l[i] + r[i]) / 2;
        } 
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
    
    CCWT.then(function (ccwt_lib) {
        ll = _convert(ccwt_lib, data, l);

        if (data.right) {
            r = new Float32Array(data.right);
            rr = _convert(ccwt_lib, data, r);
            
            result.pbuffer = _mergeChannels(ll.data, rr.data, data.settings.phase_import).buffer;
        } else {
            result.pbuffer = ll.data.buffer;
        }

        result.width = ll.width;
        result.height = ll.height;
        
        postMessage(result, [result.pbuffer]);
    });
};
