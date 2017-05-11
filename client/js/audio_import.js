/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _audio_to_image_worker = new Worker("dist/audio_to_image.min.js");

/***********************************************************
    Functions.
************************************************************/

var _convertAudioToImage = function (data) {
    var l = data.getChannelData(0).buffer,
        r = ((data.numberOfChannels > 1) ? data.getChannelData(1).buffer : null),
        
        params = {
            image_height: _canvas_height,
            max_freq: _oscillators[0].freq,
            left: l,
            right: r,
            note_time: _getNoteTime(120, 16),
            sample_rate: _sample_rate
        },
        
        barr = [l];
    
    if (r) {
        barr.push(r);
    }
    
    _notification("STFT in progress...", 2000);

    _audio_to_image_worker.postMessage(params, barr);
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

            _notification("loading '" + file.name + "' " + percent + "%.");
        }
    };

    reader.readAsArrayBuffer(file);
};

_audio_to_image_worker.addEventListener('message', function (m) {
        if (m.data !== Object(m.data)) {
            _notification("Audio file conversion progress : " + m.data + "%");
            return;
        }
    
        var image_data = {
                width: m.data.width,
                height: m.data.height,
                data: {
                    buffer: m.data.pbuffer
                }
            };

        // now image processing step...
        _imageProcessor(image_data, _imageProcessingDone);
    }, false);