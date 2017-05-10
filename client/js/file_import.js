/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/



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