/*
    Fragment common servers config. file.
*/

var fss_port = 3001,
    fsdb_port = 3002;

exports.allow_fss_origin = ["http://127.0.0.1:3000", "file://"];
exports.allow_fsdb_origin = ["http://127.0.0.1:3000", "file://"];

exports.fss_port = fss_port;
exports.fsdb_port = fsdb_port;
