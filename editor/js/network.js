/* jslint browser: true */


/***********************************************************
    Fields.
************************************************************/

var _session,
    
    _address_sdb = _domain + ":3002",
    
    _sharedb_connection,
    
    _sharedb_timeout,
    
    _sharedb_doc,
    _sharedb_doc_ready = false,
    _sharedb_code_changes = [];

/***********************************************************
    Functions.
************************************************************/

var _notification = function (e, d) {
    
};

var _sharedbDocError = function (err) {
    _notification(err, 5000);
};

var _shareDBConnect = function () {
    var ws = new WebSocket(_ws_protocol + "://" + _address_sdb);
    
    ws.addEventListener("close", function (ev) {
            _sharedb_doc_ready = false;
            _sharedb_ctrl_doc_ready = false;
        
            _notification("Connection to synchronization server was lost, trying again in ~5s.", 2500);
        
            clearTimeout(_sharedb_timeout);
            _sharedb_timeout = setTimeout(_shareDBConnect, 5000);
        });
    
    ws.addEventListener("error", function (event) {
        
        });
    
    _sharedb_connection = new ShareDB.Connection(ws);
    
    _sharedb_doc = _sharedb_connection.get(_session, "fs");

    _sharedb_doc.on('error', _sharedbDocError);
    
    _sharedb_doc.subscribe(function(err) {
        if (err) {
            _notification(err, 5000);
        }
        
        if (!_sharedb_doc.data) {
            _sharedb_doc.create(_code_editor.getValue());
        } else {
            _code_editor.setValue(_sharedb_doc.data);
        }
        
        _sharedb_doc.on('op', function(op, source) {
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
                        
                        if (o["d"]) {
                            from = _code_editor.posFromIndex(o.p);
                            to = _code_editor.posFromIndex(o.p + o.d.length);
                            _code_editor.replaceRange("", from, to, "remote");
                        } else if (o["i"]) {
                            from = _code_editor.posFromIndex(o.p);
                            _code_editor.replaceRange(o.i, from, from, "remote");
                        } else {
                            _notification("Unknown type of operation.");
                        }
                    }
                }
            }
        });
        
        _sharedb_doc_ready = true;
    });
};

var _shareCodeEditorChanges = function (changes) {
    var op,
        change,
        start_pos,
        chars,
        
        i = 0, j = 0;
    
    if (!_sharedb_doc_ready) {
        return;
    }
    
    op = {
        p: [],
        t: "text0",
        o: []
    };

    for (i = 0; i < changes.length; i += 1) {
        change = changes[i];
        start_pos = 0;
        j = 0;
        
        if (change.origin === "remote") { // do not submit back things pushed by remotes
            continue;
        }
        
        while (j < change.from.line) {
            start_pos += _code_editor.lineInfo(j).text.length + 1;
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
    }

    if (op.o.length > 0) {
        _sharedb_doc.submitOp(op);
    }
};

/***********************************************************
    Init.
************************************************************/

var _initNetwork = function () {
    _session = _getSessionName();

    _shareDBConnect();
};