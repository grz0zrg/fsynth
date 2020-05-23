/* jslint browser: true */


/***********************************************************
    Fields.
************************************************************/

var _socket,
    
    _fss_ws,
    
    _address_fss = _domain + ":3001",
    _address_sdb = _domain + ":3002",
    
    _session,
    
    _share_ctrl_timeout,
    _share_settings_timeout,
    
    _sharedb_timeout,
    
    _sharedb_connection,
    _sharedb_doc,
    _sharedb_doc_ready = false,
    
    _sharedb_ctrl_doc_ready = false,
    
    _sharedb_code_changes = [],
    
    _sharedb_ctrl_doc;

/***********************************************************
    Functions.
************************************************************/

var _sharedbDocError = function (err) {
    _notification(err, 5000);
};

var _subscribeSharedbEditor = function (code_editor) {
    return function(err) {
        if (err) {
            _notification(err, 5000);
        }
        
        if (!code_editor.sharedb.doc.data) {
            code_editor.sharedb.doc.create(code_editor.editor.getValue());
        } else {
            code_editor.editor.setValue(code_editor.sharedb.doc.data);
        }

        _loadEditorsMarks(code_editor);
        
        code_editor.sharedb.doc.on('op', function(op, source) {
            var i = 0, j = 0,
                from,
                to,
                operation,
                o;
            
            if (source === false) { // only changes from the server
                for (i = 0; i < op.length; i += 1) {
                    operation = op[i];
                    
                    for (j = 0; j < operation.o.length; j += 1) {
                        o = operation.o[j];
                        
                        if (o["d"] !== undefined) {
                            from = code_editor.editor.posFromIndex(o.p);
                            to = code_editor.editor.posFromIndex(o.p + o.d.length);
                            code_editor.editor.replaceRange("", from, to, "remote");
                        } else if (o["i"] !== undefined) {
                            from = code_editor.editor.posFromIndex(o.p);
                            code_editor.editor.replaceRange(o.i, from, from, "remote");
                        } else {
                            _notification("Unknown operation type.");
                        }
                    }
                }
            }
        });
        
        code_editor.sharedb.rdy = true;
    };
};

var _shareDBConnect = function () {
    var ws = new WebSocket(_ws_protocol + "://" + _address_sdb);
    
    ws.addEventListener("open", function (ev) {
        var fs_sync = document.getElementById("fs_sync_status");
        
        fs_sync.classList.add("fs-server-status-on");
    });
    
    ws.addEventListener("close", function (ev) {
            _sharedb_doc_ready = false;
            _sharedb_ctrl_doc_ready = false;
        
            _notification("Data server connection lost, trying again in ~5s.", 2500);
        
            clearTimeout(_sharedb_timeout);
            _sharedb_timeout = setTimeout(_shareDBConnect, 5000);
        
            var fs_sync = document.getElementById("fs_sync_status");
        
            fs_sync.classList.remove("fs-server-status-on");
        });
    
    ws.addEventListener("error", function (event) {

        });
    
    _sharedb_connection = new ShareDB.Connection(ws);

    // get all collaborative editors document
    var i = 0;
    for (i = 0; i < _code_editors.length; i += 1) {
        var code_editor = _code_editors[i];

        if (!code_editor.collaborative) {
            continue;
        }

        code_editor.sharedb.doc = _sharedb_connection.get("_" + _session, "code_" + code_editor.name);

        code_editor.sharedb.doc.on('error', _sharedbDocError);
        
        code_editor.sharedb.doc.subscribe(_subscribeSharedbEditor(code_editor));
    }

    // document for session settings
    _sharedb_ctrl_doc = _sharedb_connection.get("_" + _session, "ctrls");
    _sharedb_ctrl_doc.on('error', _sharedbDocError);
    
    _sharedb_ctrl_doc.subscribe(function(err) {
        var i = 0,
            
            s;
        
        if (err) {
            _notification(err, 5000);
        }
        
        if (!_sharedb_ctrl_doc.data) {
            _sharedb_ctrl_doc.create({ score_settings: [] });
        } else {
            if (_sharedb_ctrl_doc.data.score_settings.length === 4) {
                _updateScore({
                        width: parseInt(_sharedb_ctrl_doc.data.score_settings[0], 10),
                        height: parseInt(_sharedb_ctrl_doc.data.score_settings[1], 10),
                        octave: parseInt(_sharedb_ctrl_doc.data.score_settings[2], 10),
                        base_freq: parseFloat(_sharedb_ctrl_doc.data.score_settings[3])
                    });
            }
        }
        
        _sharedb_ctrl_doc.on('op', function(op, source) {
            var i = 0,
                operation;
            
            if (source === false) { // only changes from the server
                for (i = 0; i < op.length; i += 1) {
                    operation = op[i];
                    
                    if (operation["ld"] && operation["li"] && operation["p"]) {
                        if (operation.p[0] === "score_settings") {
                            if (operation.p[1] === 0) {
                                _updateScore({
                                        width: parseInt(operation.li, 10)
                                    });
                            } else if (operation.p[1] === 1) {
                                _updateScore({
                                        height: parseInt(operation.li, 10)
                                    });
                            } else if (operation.p[1] === 2) {
                                _updateScore({
                                        octave: parseInt(operation.li, 10)
                                    });
                            } else if (operation.p[1] === 3) {
                                _updateScore({
                                        base_freq: parseFloat(operation.li)
                                    });
                            }
                        }
                    }
                }
            }
        });
  
        _sharedb_ctrl_doc_ready = true;

    });
};

var _prepareMessage = function (type, obj) {
    obj.type = type;

    return JSON.stringify(obj);
};

var _fssConnect = function () {
    _fss_ws = new WebSocket(_ws_protocol + "://" + _address_fss);
    
    _fss_ws.onopen = function (event) {
            _setUsersList([]);
        
            var fs_server = document.getElementById("fs_server_status");

            fs_server.classList.add("fs-server-status-on");
        
            _fss_ws.send(_prepareMessage("session", { session: _session, username: _username }));
        };
    
    _fss_ws.onmessage = function (event) {
            var i = 0, msg;
        
            try {
                msg = JSON.parse(event.data);
                
                if (msg.type === "users") {
                    _setUsersList(msg.list);
                } else if (msg.type === "userjoin") {
                    _addUser(msg.userid, msg.username);
                } else if (msg.type === "userleave") {
                    _removeUser(msg.userid);
                } else if (msg.type === "msg") {
                    _addMessage(msg.userid, msg.data);
                } else if (msg.type === "addSlice") {
                    _addPlayPositionMarker(msg.data.x, msg.data.shift, msg.data.mute, msg.data.output_channel, msg.data.type);
                } else if (msg.type === "delSlice") {
                    _removePlayPositionMarker(msg.data.id);
                } else if (msg.type === "updSlice") {
                    _updatePlayMarker(msg.data.id, msg.data.obj);
                } else if (msg.type === "slices") {
                    _removeAllSlices();
                    
                    for (i = 0; i < msg.data.length; i += 1) {
                        _addPlayPositionMarker(msg.data[i].x, msg.data[i].shift, msg.data[i].mute, msg.data[i].output_channel, msg.data[i].type);
                    }
                }
            } catch (e) {
                _notification('JSON message parsing failed : ' + e, 3500);

                console.log(e);
            }
        };
    
    _fss_ws.onerror = function (event) {

        };
    
    _fss_ws.onclose = function (event) {
            _removeUsers();
        
            setTimeout(_fssConnect, 5000);
        
            _notification("Server connection lost, trying again in ~5s.", 2500);
        
            var fs_server = document.getElementById("fs_server_status");

            fs_server.classList.remove("fs-server-status-on");
        };
};

var _sendSlices = function (data) {
    try {
        _fss_ws.send(_prepareMessage("slices", { data: data }));
    } catch (err) {

    }
};

var _sendSliceUpdate = function (id, data) {
    try {
        _fss_ws.send(_prepareMessage("updSlice", { data: { id: id, obj: data } }));
    } catch (err) {

    }
};

var _sendAddSlice = function (x, shift, mute) {
    try {
        _fss_ws.send(_prepareMessage("addSlice", { data: { x: x, shift: shift, mute: mute } }));
    } catch (err) {

    }
};

var _sendRemoveSlice = function (id) {
    try {
        _fss_ws.send(_prepareMessage("delSlice", { data: { id: id } }));
    } catch (err) {

    }
};

var _sendMessage = function (message) {
    try {
        _fss_ws.send(_prepareMessage("msg", { data: message }));
    } catch (err) {
        _notification("An error occured whuile trying to send the message.");
    }
};

var _shareSettingsUpdFn = function (settings) {
    return function () {
        var op = [{ p: ['score_settings', 0], ld: settings[0], li: settings[1] },
                  { p: ['score_settings', 1], ld: settings[2], li: settings[3] },
                  { p: ['score_settings', 2], ld: settings[4], li: settings[5] },
                  { p: ['score_settings', 3], ld: settings[6], li: settings[7] }];

        _sharedb_ctrl_doc.submitOp(op);
    };
};

var _shareSettingsUpd = function (settings) {
    if (!_sharedb_ctrl_doc_ready) {
        return;
    }
    
    clearTimeout(_share_settings_timeout);
    _share_settings_timeout = setTimeout(_shareSettingsUpdFn(settings), 500);
};

var _shareCodeEditorChanges = function (code_editor, changes) {
    var op,
        change,
        start_pos,
        chars,
        
        i = 0, j = 0;
    
    if (!code_editor.sharedb.rdy) {
        return;
    }
    
    // we must do it in order (this avoid issue with same-time op)
    //changes.reverse();

    for (i = 0; i < changes.length; i += 1) {
        op = {
            p: [],
            t: "text0",
            o: []
        };
        
        change = changes[i];
        start_pos = 0;
        j = 0;
        
        if (change.origin === "remote") { // do not submit back things pushed by remotes
            continue;
        }
        
        while (j < change.from.line) {
            start_pos += code_editor.editor.lineInfo(j).text.length + 1;
            j += 1;
        }
        
        start_pos += change.from.ch;
        
        if (change.to.line != change.from.line || change.to.ch != change.from.ch) {
            chars = "";
            
            for (j = 0; j < change.removed.length; j += 1) {
                chars += change.removed[j];
                
                if (j !== (change.removed.length - 1)) {
                    chars += "\n";
                }
            }
            
            op.o.push({
                p: start_pos,
                d: chars
            });
        }

        if (change.text) {
            op.o.push({
                p: start_pos,
                i: change.text.join('\n')
            });
        }
        
        if (op.o.length > 0) {
            code_editor.sharedb.doc.submitOp(op);
        }
    }
};

/***********************************************************
    Init.
************************************************************/

var _initNetwork = function () {
    _session = _getSessionName();

    _fssConnect();
    _shareDBConnect();
};
