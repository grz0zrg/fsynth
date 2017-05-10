/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/



/***********************************************************
    Functions.
************************************************************/

var _convertAudioToImage = function (data) {
    var note_time = _getNoteTime(120, 16),
        note_samples = Math.round(note_time * _sample_rate),

        window_size = 8192,
        window_type = "hann",
        
        hop_divisor = 8, // overlap factor
        hop_length = window_size / hop_divisor,
        
        stft_result_length = Math.round(window_size / 2),

        data_buffer = data.getChannelData(0),

        image_width  = Math.ceil(data_buffer.length / note_samples),
        image_height = _canvas_height,//note_samples,
                
        min_freq = 16.34,
        max_freq = _oscillators[0].freq,
        
        overlap_frame_buffer = [],
        stft,
        
        tmp_canvas = document.createElement('canvas'),
        tmp_canvas_context = tmp_canvas.getContext('2d'),
        
        image = tmp_canvas_context.createImageData(image_width, image_height),
        image_data = image.data,
        
        image_element,
        
        min_stft_freq = _sample_rate / window_size,
        
        // id boundaries of the stft result matching our scale settings
        lid = Math.round(min_freq / min_stft_freq),
        hid = Math.round(max_freq / min_stft_freq),
        
        start = stft_result_length + lid,
        end = stft_result_length + lid + hid,
        
        n, adiff, amax = 0,
    
        i,
        
        frame = 0;
    
    tmp_canvas.width  = image.width;
    tmp_canvas.height = image.height;

    STFT.initializeForwardWindow(window_size, window_type);
    
    _notification("STFT in progress... (may freeze for a while)");

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
                    
                    index = Math.round(((image_height - 1) - ((k - start) / hid * image_height))) * image_width * 4 + frame;

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
        stft(data_buffer.subarray(i, i + note_samples));
    }
    
    // mag. normalization (not needed)
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
    
    // done, now image processing...
    _imageProcessor(image, _imageProcessingDone);
    
  // shortcut
/*
        tmp_canvas_context.putImageData(image, 0, 0);

        image_element = document.createElement("img");
        image_element.src = tmp_canvas.toDataURL();

        _addFragmentInput("image", image_element);
*/
};

var _loadAudioFromFile = function (file) {
    var reader = new FileReader();

    reader.onload = function (e) {
        _decodeAudioData(e.target.result, _convertAudioToImage);
    };

    reader.onerror = function (e) {
        var error = e.target.error;
        switch(error.code) {
            case error.NOT_FOUND_ERR:
                _notification("File '" + file.name + " not found.");
                break;

            case error.NOT_READABLE_ERR:
                _notification("File '" + file.name + " not readable.");
                break;

            case error.ABORT_ERR:
                _notification("File '" + file.name + " operation was aborted.");
                break; 

            case error.SECURITY_ERR:
                _notification("File '" + file.name + " is in a locked state.");
                break;

            case error.ENCODING_ERR:
                _notification("File '" + file.name + " encoding took too long.");
                break;

            default:
                _notification("File '" + file.name + " cannot be loaded.");
        }
    };
    
    reader.onprogress = function (e) {
        var percent = 0;
        
        if (e.lengthComputable) {
            percent = Math.round((e.loaded * 100) / e.total);

            _notification("loading audio file " + file.name + " in progress (" + percent + "%).");
        }
    };

    reader.readAsArrayBuffer(file);
/*
    var img = new Image(),
        
        tmp_canvas = document.createElement('canvas'),
        tmp_canvas_context = tmp_canvas.getContext('2d'),
        
        tmp_image_data;
    
    img.onload = function () {
        tmp_canvas.width  = img.naturalWidth;
        tmp_canvas.height = img.naturalHeight;

        tmp_canvas_context.translate(0, tmp_canvas.height);
        tmp_canvas_context.scale(1, -1);
        tmp_canvas_context.drawImage(img, 0, 0, tmp_canvas.width, tmp_canvas.height);

        tmp_image_data = tmp_canvas_context.getImageData(0, 0, tmp_canvas.width, tmp_canvas.height);

        _imageProcessor(tmp_image_data, _imageProcessingDone);
        
        img.onload = null;
        img = null;
    };
    img.src = window.URL.createObjectURL(file);
*/
};