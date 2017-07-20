/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _request = null,
    _db = null;

/***********************************************************
    Functions.
************************************************************/

var _dbStoreInput = function (input_name, input_data) {
    if (!_db) {
        return;
    }
    
    var object_store = _db.transaction(["inputs"], "readwrite").objectStore("inputs"),
        
        request = object_store.openCursor(input_name);
    
    request.onsuccess = function (event) {
        var cursor = event.target.result;
        if (!cursor) {
            object_store.add(input_data, input_name);
        }
    };
};

var _dbRemoveInput = function (name) {
    if (!_db) {
        return;
    }
    
    var object_store = _db.transaction(["inputs"], "readwrite").objectStore("inputs");
    
    object_store.delete(name);
};

var _dbUpdateInput = function (name, input_data) {
    if (!_db) {
        return;
    }
    
    var object_store = _db.transaction(["inputs"], "readwrite").objectStore("inputs"),
        request = object_store.get(name);
    
    request.onsuccess = function (event) {
        object_store.put(input_data, name);
    };
};

var _dbGetInputs = function (cb) {
    if (!_db) {
        return;
    }
    
    var object_store = _db.transaction("inputs").objectStore("inputs");
    
    object_store.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            cb(cursor.key, cursor.value);
            
            cursor.continue();
        }
    };
};

/***********************************************************
    Init.
************************************************************/

var _initDb = function () {
    _request = indexedDB.open("fs" + _getSessionName(), 1);
    
    if (_request !== null) {
        _request.onsuccess = function (event) {
            _db = _request.result;

            _db.onerror = function (event) {
                console.log(event);
            };

            _dbGetInputs(function (name, value) {
                var image_element = null;

                if (value.type === "image") {
                    image_element = document.createElement("img");
                    image_element.src = value.data;
                    image_element.width = value.width;
                    image_element.height = value.height;

                    image_element.onload = function () {
                        image_element.onload = null;

                        _addFragmentInput("image", image_element, value.settings);
                    };
                } else {
                    _addFragmentInput(value.type);
                }
            });
        };

        _request.onupgradeneeded = function (event) {
            var db = event.target.result,

                input_store;

            db.createObjectStore("inputs");
        };
    }
};