/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _import_dropzone_elem = document.getElementById("fs_import_dropzone");

/***********************************************************
    Functions.
************************************************************/

var _fileChoice = function (cb) {
    var input = document.createElement("input");
    input.type = "file";
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
            file = files[0];

        if (files.length === 0) {
            return;
        }

        if (file.type.match(type + '.*')) {
            if (type === "image") {
                _loadImageFromFile(file);
            } else if (type === "audio") {
                _loadAudioFromFile(file);
            } else {
                _notification("Could not load the file '" + file.name + "', the filetype is unknown.");
            }
        } else {
            _notification("Could not load the file '" + file.name + "' as " + type + ".");
        }

        target.removeEventListener("change", _loadFile, false);
    }
};

/***********************************************************
    Init.
************************************************************/

_import_dropzone_elem.addEventListener("drop", function (e) {
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
        } else {
            _notification("Could not load the file '" + file.name + "', the filetype is unknown.");
        }
    }
    
    e.target.style = "";
});

_import_dropzone_elem.addEventListener("dragleave", function (e) {
    e.preventDefault();
    
    e.target.style = "";
});

_import_dropzone_elem.addEventListener("dragover", function (e) {
    e.preventDefault();
    
    e.dataTransfer.dropEffect = "copy";
});

_import_dropzone_elem.addEventListener("dragenter", function (e) {
    e.preventDefault();
    
    e.target.style = "outline: dashed 1px #00ff00; background-color: #444444";
});