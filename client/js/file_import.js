/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _import_dropzone_elem = document.getElementById("fs_import_dropzone");

/***********************************************************
    Functions.
************************************************************/

var _fileChoice = function (cb) {
    var detached_dialog = WUI_Dialog.getDetachedDialog(_import_dialog);
    var input = detached_dialog ? detached_dialog.document.createElement("input") :  document.createElement("input");

    input.type = "file";
    input.multiple = true;
    input.addEventListener("change", cb, false);
    input.click();
};

var _loadFile = function (type) {
    return function (e) {
        if (e === undefined) {
            _fileChoice(_loadFile(type));

            return;
        }

        var target = e.target,

            files = target.files, 
            file,
            
            i = 0;

        if (files.length === 0) {
            return;
        }
        
        for (i = 0; i < files.length; i += 1) {
            file = files[i];
            
            if (file.type.match(type + '.*')) {
                if (type === "image") {
                    _loadImageFromFile(file);
                } else if (type === "audio") {
                    _loadAudioFromFile(file);
                } else if (type === "video") {
                    _addFragmentInput("video", file);
                    if (_audio_import_settings.videotrack_import) {
                        _loadAudioFromFile(file);
                    }
                } else {
                    _notification("Could not load the file '" + file.name + "', the filetype is unknown.");
                }
            } else {
                _notification("Could not load the file '" + file.name + "' as " + type + ".");
            }
        }

        target.removeEventListener("change", _loadFile, false);
    }
};

var _importDropzoneDrop = function (e) {
    e.preventDefault();
    
    var data = e.dataTransfer,
        
        file,
        
        i = 0;
    
    for (i = 0; i < data.files.length; i += 1) {
        file = data.files[i];
        
        if (file.type.match('image.*')) {
            _loadImageFromFile(file);
        } else if (file.type.match('audio.*')) {
            _loadAudioFromFile(file);
        } else if (file.type.match('video.*')) {
            _addFragmentInput("video", file);
            if (_audio_import_settings.videotrack_import) {
                _loadAudioFromFile(file);
            }
        } else {
            _notification("Could not load the file '" + file.name + "', the filetype is unknown.");
        }
    }
    
    e.target.style = "";
};

var _createImportDropzone = function (element) {
    element.addEventListener("drop", _importDropzoneDrop);

    element.addEventListener("dragleave", function (e) {
        e.preventDefault();
        
        e.target.style = "";
    });
    
    element.addEventListener("dragover", function (e) {
        e.preventDefault();
        
        e.dataTransfer.dropEffect = "copy";
    });
    
    element.addEventListener("dragenter", function (e) {
        e.preventDefault();
        
        e.target.style = "outline: dashed 1px #00ff00; background-color: #444444";
    });
};

var _createImportListeners = function (doc) {
    doc.getElementById("fs_import_audio_mapping").addEventListener('change', function (e) {
        var mapping_type = e.target.value;

        _audio_import_settings.mapping = mapping_type;
    });
    
    doc.getElementById("fs_import_mic_fft_size").addEventListener('change', function (e) {
        var fft_size = e.target.value;
        
        _audio_import_settings.fft_size = _parseInt10(fft_size);
    });
    
    doc.getElementById("fs_import_audio_ck_videotrack").addEventListener('change', function (e) {
        var videotrack_import = this.checked;
        
        _audio_import_settings.videotrack_import = videotrack_import;
    });

    doc.getElementById("fs_import_audio_ck_phase").addEventListener('change', function (e) {
        var phase_import = this.checked;
        
        _audio_import_settings.phase_import = phase_import;
    });
};

var _updateImportWidgets = function (doc) {
    var current_doc = doc;
    if (!doc) {
        current_doc = document;
    }
    
    // synchronize in case it was detached
    current_doc.getElementById("fs_import_audio_mapping").value = _audio_import_settings.mapping;
    current_doc.getElementById("fs_import_mic_fft_size").value = _audio_import_settings.fft_size;
    current_doc.getElementById("fs_import_audio_ck_videotrack").checked = _audio_import_settings.videotrack_import;
    current_doc.getElementById("fs_import_audio_ck_phase").checked = _audio_import_settings.phase_import;
};

/***********************************************************
    Init.
************************************************************/

_createImportDropzone(_import_dropzone_elem);

_createImportListeners(document);