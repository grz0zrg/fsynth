/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _image_to_audio_worker = new Worker("dist/image_to_audio.min.js");

/***********************************************************
    Functions.
************************************************************/

var _exportImage = function (image_data) {
    var data = new Uint8ClampedArray(image_data.data),
        
        params = {
            image_width: image_data.width,
            image_height: image_data.height,
            max_freq: _oscillators[0].freq,
            note_time: _getNoteTime(120, 16),
            sample_rate: _sample_rate,
            data: data
        };
    
    _notification("Export in progress...", 2000);

    _image_to_audio_worker.postMessage(params, [params.data.buffer]);
};

_image_to_audio_worker.addEventListener('message', function (m) {
        console.log(m);
    }, false);