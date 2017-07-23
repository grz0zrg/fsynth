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
/*#include ../dsp.js/dsp.js*/

// browserified modules for stft / ndarray implementation
/*#include ../stft/stft_libs.js*/

var ndarray     = require("ndarray"),
    ndarray_fft = require("ndarray-fft");

// enhanced stft - https://github.com/mikolalysenko/stft
/*#include ../stft/stft.js*/

/*#include ../tools.js*/

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
    var note_time = params.note_time,
        note_samples = Math.round(note_time * params.sample_rate),

        window_size = params.settings.window_length,
        window_type = params.settings.window_type,
        
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
        
        n, adiff, amax = 0,
        
        progress_step = note_samples / data_buffer.length * 100,
    
        i,
        
        frame = 0;

    if (note_samples > (window_size * 2)) {
        postMessage("Conversion failed, there is " + note_samples + " samples to process for a window length (* 2) of " + (window_size * 2) + ", please use different settings.");
    }

    if (_stereo) {
        progress_step /= 2;
    }
    
    STFT.initializeForwardWindow(window_size, window_type);
    
    //var bark = _barkScale(end - start, params.sample_rate, window_size);

    stft = STFT.forward(window_size, function (real, imag) {
        overlap_frame_buffer.push({ r: real, i: imag });

        if (overlap_frame_buffer.length === hop_divisor) {
            var index = 0,

                k = 0, j = 0,

                real_final = [],
                imag_final = [],
                
                avgdi, avgdr,
                
                stft_data_index,
                
                im, r,
                
                mag;
            
                // overlap-add
                for (k = 0; k < imag.length; k += 1) {
                    avgdi = 0;
                    avgdr = 0;
                    
                    for (j = 0; j < hop_divisor; j += 2) {
                        avgdi += overlap_frame_buffer[j].i[k] + overlap_frame_buffer[j + 1].i[k];
                        avgdr += overlap_frame_buffer[j].r[k] + overlap_frame_buffer[j + 1].r[k];
                    }

                    real_final[k] = avgdr / hop_divisor;
                    imag_final[k] = avgdi / hop_divisor;
                }

                // get magnitude data
                for (k = start; k < end; k += 1) {
                    stft_data_index = lid + _logScale(k - start, hid);
                   
                    im = imag_final[stft_data_index],
                    r  = real_final[stft_data_index],
                        
                    mag = Math.round((Math.sqrt(r * r + im * im) / hop_divisor) * 255);
                    
                    index = Math.round((((k - start) / hid * image_height))) * image_width * 4 + frame;

                    image_data[index    ] = mag;
                    image_data[index + 1] = mag;
                    image_data[index + 2] = mag;
                    image_data[index + 3] = 255;
                }
            
                frame += 4;

                overlap_frame_buffer = [];
            }
        }, hop_length);

    // stft processing
    for (i = 0; i < data_buffer.length; i += note_samples) {
        _prev_progress = parseInt(_progress, 10);
        _progress += progress_step;

        stft(data_buffer.subarray(i, i + note_samples));

        if (parseInt(_progress, 10) !== _prev_progress) {
            if ((parseInt(_progress, 10) % 5) === 0) {
                postMessage(_parseInt10(_progress, 10));
            }
        }
    }
    
    // mag. normalization
/*
    for (i = 0; i < image_data.length; i += 4) {
        n = image_data[i];
        amax = n > amax ? n : amax;
    }

    adiff = 255 / amax;

    for (i = 0; i < image_data.length; i += 4) {
        image_data[i] *= adiff;
        image_data[i + 1] *= adiff;
        image_data[i + 2] *= adiff;
    }
*/

    return { width: image_width, height: image_height, data: image_data };
};

// when in stereo, we basically assign R = L, G = R and G = (L + R) / 2
var _mergeChannels = function (l, r) {
    var i = 0;
    
    for (i = 0; i < l.length; i += 4) {
        l[i + 1] = r[i + 1];
        l[i + 2] = (l[i] + r[i + 1]) / 2;
        l[i + 3] = 255;
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
