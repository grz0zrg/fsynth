/*
    Fragment common servers config. file.
*/

var fss_port = 3001,
    fsdb_port = 3002,
    ffs_port = 3122;

exports.allow_fss_origin = ["127.0.0.1:3000", "http://127.0.0.1:3000", "file://"];
exports.allow_fsdb_origin = ["127.0.0.1:3000", "http://127.0.0.1:3000", "file://"];

exports.fss_port = fss_port;
exports.fsdb_port = fsdb_port;
exports.ffs_port = ffs_port;
