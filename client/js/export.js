/* jslint browser: true */


/***********************************************************
    Fields.
************************************************************/

var _notes_renderer_worker = new Worker("dist/worker/notes_renderer.min.js"),
    _audio_renderer_worker = new Worker("dist/worker/audio_renderer.min.js"),
    _audio_recorder_worker = new Worker("dist/worker/recorder.min.js");

/***********************************************************
    Functions.
************************************************************/

var _exportRecord = function () {
    var image_data = _record_canvas_ctx.getImageData(0, 0, _record_canvas.width, _record_canvas.height),
        
        sonogram_left_boundary,
        sonogram_right_boundary,
        
        opts = {
            float: _audio_infos.float_data,
            ffreq: 0,
            sps: _fps,
            octaves: _audio_infos.octaves,
            baseFrequency: _audio_infos.base_freq,
            flipY: false
        };
    
    sonogram_left_boundary = _getSonogramBoundary(image_data.data, _record_canvas.width, _record_canvas.height);
    sonogram_right_boundary = _getSonogramBoundary(image_data.data, _record_canvas.width, _record_canvas.height, true);

    if (sonogram_left_boundary != -1 && sonogram_right_boundary != 1 && sonogram_left_boundary != sonogram_right_boundary) {
        image_data = _record_canvas_ctx.getImageData(sonogram_left_boundary, 0, sonogram_right_boundary - sonogram_left_boundary, _record_canvas.height);
    }
    
    opts.ffreq = _getFundamentalFrequency(image_data.data, image_data.width, image_data.height);
    
    _notification("image conversion in progress...");
    
    _notes_renderer_worker.postMessage({
            data: image_data.data,
            width: image_data.width,
            height: image_data.height,
            options: opts
        }, [image_data.data.buffer]);
};

var _audioRecordToWav = function (audio_buffer, filename, ffreq) {
    if (!audio_buffer) {
        return;
    }
    
    var date_now = (new Date().toLocaleDateString()).replace("/", "_");
    
    if (!filename) {
        filename = "fs_" + encodeURIComponent(_getSessionName()) + "_" + date_now + "_" + _truncateDecimals(ffreq, 2) + "hz_" + _MIDINoteName(_hzToMIDINote(ffreq));
    }
    
    _audio_recorder_worker.postMessage({
            command: 'init',
            config: {
                sampleRate: _audio_context.sampleRate,
                numChannels: 2,
                gain: _audio_infos.gain
            }
        });
    
    _audio_recorder_worker.postMessage({
        command: 'record',
        buffer: [
                audio_buffer.getChannelData(0), 
                audio_buffer.getChannelData(1)
            ]
        });  
    
    _audio_recorder_worker.postMessage({
            command: 'exportWAV',
            type: 'audio/wav',
            filename: filename
        });
};

_notes_renderer_worker.addEventListener("message", function (m) {
        var w = m.data;

        w.sample_rate = _audio_context.sampleRate;
    
        _notification("image to sound conversion in progress...");

        _audio_renderer_worker.postMessage(w);
    }, false);

_audio_renderer_worker.addEventListener("message", function (m) {
        var w = m.data,

            data_l = new Float32Array(w.data_l),
            data_r = new Float32Array(w.data_r),

            audio_buffer;
    
        _notification("exporting sound in progress...");

        audio_buffer = _audio_context.createBuffer(2, w.length, _audio_context.sampleRate);

        audio_buffer.copyToChannel(data_l, 0, 0);
        audio_buffer.copyToChannel(data_r, 1, 0);
    
        _audioRecordToWav(audio_buffer, null, w.opts.ffreq);
    }, false);

_audio_recorder_worker.addEventListener("message", function (m) {
        var wav_blob = m.data.blob,
            
            file = new File([wav_blob], m.data.filename + ".wav", {
                    type: "audio/wav"
                });
        
        saveAs(file);
    
        _notification("exporting '" + m.data.filename + ".wav'");
        
        _audio_recorder_worker.postMessage({
                command: 'clear'
            });
    }, false);
