/*jslint browser: true*/
/*jslint continue: true*/

var fsynthcommon = require('../common'),
    webSocketServer = require('ws').Server,
    winston = require('winston'),
    cluster	= require('cluster'),
    clusterControl = require('strong-cluster-control'),
    os = require('os'),
    redis = require('redis'),
    
    logger = new (winston.Logger)({
            transports: [
                new (winston.transports.Console)({ 'timestamp': true, 'colorize': true })
            ]
        }),
    
    workers = new Array(),
    cores,
    thread,
    
    wss, i;

clusterControl.start({
        size: clusterControl.CPUS,
        shutdownTimeout: 10000,
        terminateTimeout: 5000,
        throttleDelay: 5000
    }).on('error', function(er) {
        logger.error("Cluster error occured: ", er);
    }).on('startWorker', function(worker) {
        logger.info("Worker %s %s", worker.process.pid, "started");
    
		worker.on("message", function (message) {
            if (message.payload) {
                workers.forEach(function (worker) {
                    if (worker.process.connected === false) {
                        return;
                    }
                    
                    if (worker.process.pid != message.pid) {
                        worker.send({ payload: message.payload, session: message.session });
                    }
                });
            }
		});
		workers.push(worker);
    }).on('stopWorker', function(worker, code, signal) {
        var i = 0;
    
        if (code) {
            logger.warn("Worker %s stopped with code: %s", worker.process.pid, code);
        } else {
            logger.warn("Worker %s was stopped.", worker.process.pid);
        }
    
        for (i = 0; i < workers.length; i += 1) {
            if (workers[i].process.pid === worker.process.pid) {
                workers.splice(i, 1);
                break;
            }
        }
    });

var redisClient = redis.createClient({
        string_numbers: true,
        db: 0
    });

var redisSettingsClient = redis.createClient({
        string_numbers: true,
        db: 1
    });

if (cluster.isMaster) {
    redisClient.flushdb();
    redisClient.set("conn_uid", 0);
    
    process.on('SIGUSR1', function() {
        logger.warn("SIGUSR1 received, restarting workers in progress...");

        clusterControl.restart();
    });
    
    process.on('SIGUSR2', function() {
        logger.info("SIGUSR2 received, workers status:", clusterControl.status().workers);
    });

	return;
}

var fs = {
        clients: {}
    };

var prepareMessage = function (type, obj) {
    obj.type = type;

    return JSON.stringify(obj);
}

var clientVerification = function (info) {
    if (fsynthcommon.allow_fss_origin.indexOf(info.origin) !== -1) {
        logger.info("%s %s %s %s %s", process.pid, info.req.socket.remoteAddress, 'Client', 'user-agent:', info.req.headers['user-agent']);
        logger.info("%s %s %s %s %s", process.pid, info.req.socket.remoteAddress, 'Client', 'accept-language:', info.req.headers['accept-language']);
        
        return true;
    }
    
    logger.warn("%s %s %s %s", process.pid, info.req.socket.remoteAddress, 'Client refused:\n', info.req.rawHeaders);

    return false;
};

var clusterWideBroadcast = function (curr_ws, payload, session) {
    if (process.connected === false) {
        return;
    }
    
    process.send({
            pid: process.pid,
            payload: payload,
            session: session
        });
    
    wss.clients.forEach(function each (ws) {
        if (!ws["uid"]) {
            return;
        }
        
        if (curr_ws.uid !== ws.uid) {
            if (session) {
                redisClient.get("c" + ws.uid, function (err, reply) {
                        if (reply !== null) {
                            try {
                                var o = JSON.parse(reply);
                                if (o.session === session) {
                                    ws.send(payload);
                                }
                            } catch (e) {
                                logger.error('JSON.parse failed %s', reply, e.message);
                            }
                        }
                    });
            } else {
                ws.send(payload);
            }
        }
    });
};

redisClient.on('connect', function() {
    logger.info("%s %s", process.pid, 'Connected to database');

    wss = new webSocketServer({
            port: fsynthcommon.fss_port,
            verifyClient: clientVerification
        });
    
    process.on("message", function (obj) {
        if (obj.hasOwnProperty("payload")) { 
            wss.clients.forEach(function each (ws) {
                if (!ws["uid"]) {
                    return;
                }
                
                if (obj.session) {
                    redisClient.get("c"+ws.uid, function (err, reply) {
                            if (reply !== null) {
                                try {
                                    var o = JSON.parse(reply);
                                    if (o.session === obj.session) {
                                        ws.send(obj.payload);
                                    }
                                } catch (e) {
                                    logger.error('JSON.parse failed %s - %s', reply, e.message);
                                }
                            }
                        });
                } else {
                    ws.send(obj.payload);
                }
            });
        } else if (obj.cmd === clusterControl.cmd.SHUTDOWN) {
            wss.clients.forEach(function each (ws) {
                ws.close();
            });
        }
    });

    wss.on('error', function error (ws) {
            logger.error("An unknown error occured!");
        });

    wss.on('connection', function connection (ws) {
        var real_ip = ws._socket.remoteAddress;

        if (real_ip !== "127.0.0.1" && real_ip !== "::ffff:127.0.0.1" && real_ip !== "::1") {
            ws.close();

            logger.warn("%s %s %s", process.pid, real_ip, "has invalid address.");
        }

        if (ws.upgradeReq !== undefined) {
            if (ws.upgradeReq.headers['x-forwarded-for']) {
                real_ip = ws.upgradeReq.headers['x-forwarded-for'];
            }
        }

        logger.info("%s %s %s", process.pid, real_ip, "connected");
        logger.info('%s Total clients: %s', process.pid, wss.clients.length);

        ws.on('message', function incoming (message) {
            //logger.info(process.pid, '-', message);

            var msg, session;

            try {
                msg = JSON.parse(message);

                if (msg.type === "session") {
                    session = msg.session;

                    if (session.length <= 0 && session.length > 256) {
                        logger.warn("%s %s %s", process.pid, real_ip, "has invalid session name.");
                        ws.close();

                        return;
                    }
                    
                    redisClient.incr("conn_uid", function(err, reply) {
                            var client = {
                                    uid: reply,
                                    username: msg.username,
                                    session: session
                                };
                        
                            fs.clients[reply+""] = client;
                        
                            ws.uid = client.uid;
                        
                            redisClient.sadd([session, JSON.stringify(client)]);
                        
                            redisClient.set("c"+ client.uid, JSON.stringify({ session : session }));
                        
                            clusterWideBroadcast(ws, prepareMessage("userjoin", { userid: client.uid, username: msg.username }), session);
                        
                            redisSettingsClient.get(session, function (err, reply) {
                                    if (reply !== null) {
                                        console.log(JSON.parse(reply));
                                        ws.send(prepareMessage("slices", { data : JSON.parse(reply) }));
                                    } else {
                                        redisSettingsClient.set(session, "[]");
                                    }
                                });
                        
                            redisClient.smembers(session, function(err, reply) {
                                var list = [];

                                reply.forEach(function (suser) {
                                        var user = JSON.parse(suser);
                                    
                                        if (user.uid !== client.uid) {
                                            list.push({ username: user.username, userid: user.uid });
                                        }
                                    });

                                if (list.length > 0) {
                                    ws.send(prepareMessage("users", { list: list }));
                                }
                            });
                        });
                } else if (msg.type === "msg") {
                    var payload = prepareMessage("msg", { userid: ws.uid, data: msg.data }),
                        
                        client = fs.clients[ws.uid];
                    
                    clusterWideBroadcast(ws, payload, client.session);
                    
                    ws.send(prepareMessage("msg", { userid: "self", data: msg.data }));
                } else if (msg.type === "addSlice") {
                    var client = fs.clients[ws.uid];
                    
                    if (client === undefined) {
                        logger.error('Cannot find client id "%s"', ws.uid);

                        return;
                    }
                    
                    redisSettingsClient.get(client.session, function (err, reply) {
                            if (reply !== null) {
                                var slices = JSON.parse(reply);
                                
                                slices.push({ x: msg.data.x, shift: msg.data.shift, mute: msg.data.mute, output_channel: msg.data.output_channel });
                                
                                clusterWideBroadcast(ws, prepareMessage("addSlice", { data: msg.data }), client.session);
                                
                                redisSettingsClient.set(client.session, JSON.stringify(slices));
                            }
                        });  
                } else if (msg.type === "delSlice") {
                    var client = fs.clients[ws.uid];
                    
                    if (client === undefined) {
                        logger.error('Cannot find client id "%s"', ws.uid);

                        return;
                    }
                    
                    redisSettingsClient.get(client.session, function (err, reply) {
                            if (reply !== null) {
                                var slices = JSON.parse(reply);
                                
                                slices.splice(parseInt(msg.id, 10), 1);
                                
                                clusterWideBroadcast(ws, prepareMessage("delSlice", { data: msg.data }), client.session);
                                
                                redisSettingsClient.set(client.session, JSON.stringify(slices));
                            }
                        });  
                } else if (msg.type === "updSlice") {
                    var client = fs.clients[ws.uid];
                    
                    if (client === undefined) {
                        logger.error('Cannot find client id "%s"', ws.uid);

                        return;
                    }
                    
                    redisSettingsClient.get(client.session, function (err, reply) {
                            if (reply !== null) {
                                var slices = JSON.parse(reply),
                                    slice =  slices[parseInt(msg.data.id, 10)];
                            
                                if (!slice) {
                                    return;
                                }
                                
                                if (msg.data.obj.x) {
                                    slice.x = msg.data.obj.x;
                                }
                                
                                if (msg.data.obj.shift) {
                                    slice.shift = msg.data.obj.shift;
                                }
                                
                                if (msg.data.obj.mute) {
                                    slice.mute = msg.data.obj.mute;
                                }
                                
                                if (msg.data.obj.output_channel) {
                                    slice.output_channel = msg.data.obj.output_channel;
                                }
                                
                                clusterWideBroadcast(ws, prepareMessage("updSlice", { data: msg.data }), client.session);
                                
                                redisSettingsClient.set(client.session, JSON.stringify(slices));
                            }
                        }); 
                }
                
                /*} else if (msg.type === "slices") {
                    var client = fs.clients[ws.uid];
                    
                    if (client === undefined) {
                        logger.error('Cannot find client id "%s"', ws.uid);

                        return;
                    }
                    
                    redisSettingsClient.set(client.session, JSON.stringify(msg.data));
                    
                    clusterWideBroadcast(ws, prepareMessage("slices", { data: msg.data }), client.session);
                }*/
            } catch (e) {
                logger.error('Client connection closed due to occuring exception for payload "%s" %s', message, e.message);
                
                ws.close();
            }
        });
        
        ws.on('close', function close () {
                if (ws["uid"]) {
                    var client = fs.clients[ws.uid],
                        session = client.session,
                        uid = client.uid;

                    redisClient.smembers(session, function(err, reply) {
                            reply.forEach(function (suser) {
                                    var user = JSON.parse(suser);

                                    if (user.uid === uid) {
                                        redisClient.srem(session, suser);
                                    }
                                });
                        });
                    
                    clusterWideBroadcast(ws, prepareMessage("userleave", { userid: uid }), session);
                    
                    redisClient.del("c" + uid);

                    logger.info(real_ip, "disconnected");
                }
            });
    });
});
