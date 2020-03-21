/* jslint browser: true */

/**
 * IndexedDB initialization & interface
 * 
 * Manage Fragment inputs storage (all except videos)
 */

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

var _dbClear = function () {
    if (!_db) {
        return;
    }

    var object_store = _db.transaction(["inputs"], "readwrite").objectStore("inputs");

    object_store.clear();
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

var _dbRestoreInput = function (name, obj) {
    if (!_db) {
        return;
    }

    var object_store = _db.transaction(["inputs"], "readwrite").objectStore("inputs"),
        request = object_store.get(name);    

    request.onsuccess = function (event) {
        obj.db_obj = event.target.result;
    };
};

var _dbGetInputs = function (cb) {
    if (!_db) {
        return;
    }
    
    var transaction = _db.transaction("inputs");
    var object_store = transaction.objectStore("inputs");
    var count_query = object_store.count();
    count_query.onsuccess = function () {
        var count = count_query.result,
            open_cursor = object_store.openCursor(),
            
            inputs = [];
        
        open_cursor.onsuccess = function (event) {
            var cursor = event.target.result;
            if (cursor) {
                inputs[parseInt(cursor.key, 10)] = cursor.value;
            
                cursor.continue();
            }
        };

        transaction.oncomplete = async function (e) {
            for (var i = 0; i < inputs.length; i += 1) {
                await cb(i, inputs[i]);
            }
        };
    };
};

/***********************************************************
    Init.
************************************************************/

var _initDb = function (db_name) {
    _request = indexedDB.open(db_name, 1);
    
    if (_request !== null) {
        _request.onsuccess = function (event) {
            _db = _request.result;

            _db.onerror = function (ev) {
                _notification("IndexedDB error '" + ev.error + "'");
            };

            _dbGetInputs(async function (name, value) {
                var image_element = null;
                
                if (!value) {
                    return;
                }

                var input_id = parseInt(name, 10);

                if (value.type === "image" ||
                    value.type === "canvas") {
                    if (value.data.length === 0) {
                        await _addFragmentInput(value.type, undefined, undefined, input_id);
                        return;
                    }
                    
                    image_element = document.createElement("img");
                    image_element.src = value.data;
                    image_element.width = value.width;
                    image_element.height = value.height;

                    await new Promise(function (resolve, reject) {
                        image_element.onload = function () {
                            image_element.onload = null;

                            _addFragmentInput(value.type, image_element, value.settings, input_id);

                            resolve();
                        }
                    });
                } else if (value.type === "video") {
                    await _addFragmentInput(value.type, undefined, undefined, input_id);
                } else if (value.type === "processing.js") {
                    await _addFragmentInput(value.type, value.data, undefined, input_id);
                } else {
                    await _addFragmentInput(value.type, undefined, undefined, input_id);
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