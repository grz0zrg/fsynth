/**
 * Fragment Audio Server relay.
 *
 * This application allow to serve multiple Fragment Audio Server over the wire by splitting and distributing the incoming pixels data
 * This allow to distribute the sound synthesis computation over different computers or cores
 * See "simulation.htm" for the algorithms playground with a nice simulation of servers load
 *
 * Allow to specify the distribution weight (aka load) for each servers via the -w option, this only work with DSMART method!
 * Note: the distribution "weight" is a float which indicate "server performance", 1 is the default weight,
 *       a high weight value for a server (say 2 while all others are 1) mean that the server is slower and will take half load,
 *       a low value for a server (say 0.5) mean that the server is fast and will take double load
 *
 * Listen (websocket) on 127.0.0.1:3003 then split the incoming data and distribute it to a multitude of Fragment Audio Server which listen on port starting from 3004
 * The load output from all the connected Fragment Audio Server incoming data is also printed at regular interval
 *
 * Usage:
 *   Simple usage (same machine, will try to connect to 127.0.0.1:3004, 127.0.0.1:3005 etc) :
 *      node fas_relay -c 2
 *   Usage by specifying address/port of each sound server :
 *      node fas_relay -s="127.0.0.1:3004 127.0.0.1:3005"
 *   Usage by specifying address/port + distribution weight of each sound server :
 *      node fas_relay -w="1 1.5" -s="127.0.0.1:3004 127.0.0.1:3005"
 *   Usage by specifying a starting address/port and the number of sound server instances on each address + address range :
 *      node fas_relay -r 8 -c 4 -s="192.168.0.40:3003"
 *    Note : this will connect from 192.168.0.40 to 192.168.0.48 on ports 3003 to 3006 for each address
 * 
 *  All options can be used with each other, weight option apply to each ip:port of the servers list even with ip/port range (in this case the range weight is the one of the starting addr/port).
 *
 * Note : All instruments which use inputs are sent to all instances, this can affect performances when using alot of instruments which use inputs.
 */

const SYNTH_SETTINGS = 0,
      FRAME_DATA = 1,
      GAIN_CHANGE = 2,
      CHN_SETTINGS = 3,
      INSTRUMENT_SETTINGS = 6;

// distribution methods of pixels value, see simulation.html
const // smart distribution of load over each servers
      // this is the best algorithm, it distribute data equally to all servers, work with distribution weights
      DSMART = 2;

var WebSocket = require("ws"),
    winston = require("winston"),
    wss,

    frame_array_type = Uint8Array,
    frame_data_comp = 1,
    channels = 0,

    data_length = 0,
    data_length_rgba = 0,

    logger = winston.createLogger({
        format: winston.format.combine(winston.format.splat(), winston.format.simple()),
        transports: [
            new (winston.transports.Console)({ 'timestamp': true, 'colorize': true, 'level': 'debug' })
        ]
    }),

    // default distribution method
    distribution_method = DSMART,

    client_socket,

    fas_wss = [],
    fas_wss_count = 0,

    fas_load_timeout,

    args = require('minimist')(process.argv.slice(2), {
        string: ["s", "w"]
      }),

    fas_servers = [],
    fas_weight = [],
    fas_loads = [],
    fas_latencies = [],
    fas_count = 1,
    fas_addr_range = null;

if ("s" in args) {
    fas_servers = args.s.split(" ");
}

if ("c" in args) {
    fas_count = parseInt(args.c, 10);
}

if ("r" in args) {
    fas_addr_range = parseInt(args.r, 10);
}

if ("w" in args) {
    fas_weight = args.w.split(" ");
    fas_weight = fas_weight.map(function (w) {
            return parseFloat(w);
        });
}

if ("h" in args) {
    console.log('Options (where N is an integer and F a float) : ');
    console.log('    -c N - Total number of ports (incremental)');
    console.log('    -r N - Total number of address (incremental)');
    console.log('    -s="ip:port ip:port" - A list of servers');
    console.log('    -w="F F F" - Distribution weight which apply to each servers of the -s="" list\n');
    console.log('Example usage : ');
    console.log('    Same machine (127.0.0.1:3004, 127.0.0.1:3005) : node fas_relay -c 2');
    console.log('    List of address:port : node fas_relay -s="127.0.0.1:3004 127.0.0.1:3005"');
    console.log('    List of address:port with distribution weight : node fas_relay -w="1 1.5" -s="127.0.0.1:3004 127.0.0.1:3005"');
    console.log('    List of address:port with address/port range (will connect from 192.168.0.40 to 192.168.0.48 on ports 3003 to 3006 for each address) : node fas_relay -r 8 -c 4 -s="192.168.0.40:3003"');

    process.exit();
}

if (distribution_method === DSMART) {
    logger.log("info", "Distribution algorithm: DSMART");
}

function sendError(error) {
    if (error) {
        logger.log("error", error);
    }
}

function websocketConnect() {
    wss = new WebSocket.Server({
        port: 3003
    });

    wss.binaryType = "arraybuffer";
    wss.on("connection", function (socket) {
        client_socket = socket;

        logger.log("info", "Client successfully connected.");

        socket.binaryType = "arraybuffer";

        var pframes = null,
            smart_piarr = null,
            fas_arr = null,
            frame_length = null,
            instruments = [];

        socket.on("message", function incoming(data) {
            var uint8_view,
                uint32_view,
                float64_view,
                data,
                data_view,
                frame_data,
                data_length_per_fas,
                start = 0,
                end,
                index,
                instance = 0,
                obj,
                r, g, b, a, pr, pg,
                smart_arr,
                fi = 0,
                ws_obj,
                i = 0, j = 0, k = 0;

            uint8_view = new Uint8Array(data, 0, 1);

            logger.log("silly", "Packet id '%s' received from client.", uint8_view[0]);
            if (uint8_view[0] !== FRAME_DATA) {
                if (uint8_view[0] === SYNTH_SETTINGS) {
                    uint32_view = new Uint32Array(data, 8, 3);
                    data_length = uint32_view[0];
                    data_length_rgba = data_length * 4;

                    if (uint32_view[2]) {
                        frame_array_type = Float32Array;
                        frame_data_comp = 4;

                        logger.log("info", "Frame data set to float.");
                    } else {
                        frame_array_type = Uint8Array;
                        frame_data_comp = 1;
                    }
                } else if (uint8_view[0] === INSTRUMENT_SETTINGS) {
                    uint8_view = new Uint8Array(data, 0, 1);
                    uint32_view = new Uint32Array(data, 8, 2);
                    var float64_view = new Float64Array(data, 16, 1);

                    var instrument_index = uint32_view[0];
                    if (!instruments[instrument_index]) {
                        instruments[instrument_index] = {
                            type: 15,
                            p3: -1
                        };
                    }
                    
                    if (uint32_view[1] === 0) { // target
                        instruments[instrument_index].type = float64_view[0];
                    } else if (uint32_view[1] === 5) {
                        instruments[instrument_index].p3 = float64_view[0];
                    }
                }
                
                for (i = 0; i < fas_wss_count; i += 1) {
                    fas_wss[i].socket.send(data, sendError);
                }
            } else {
                uint32_view = new Uint32Array(data, 8, 1);

                if (frame_length !== uint32_view[0]) {
                    pframes = null;
                    smart_piarr = null;
                    fas_arr = null;
                }

                frame_length = uint32_view[0]; // instruments in the frame
                data_length_per_fas = Math.round((data_length / fas_wss_count) * 4);

                data_view = new frame_array_type(data, 16);

                if (fas_wss_count === 1) {
                    for (i = 0; i < fas_wss_count; i += 1) {
                        fas_wss[i].socket.send(data, sendError);
                    }
                } else {
                    // split pixels data and distribute it to FAS instances over the wire
                    if (distribution_method === DSMART) {
                        if (pframes === null) {
                            pframes = new frame_array_type(new frame_array_type(data.slice(0), 16).length);
                            pframes.fill(0);
                        }

                        if (smart_piarr === null) {
                            smart_piarr = new Array(frame_length * data_length);
                            smart_piarr.fill(0);
                        }

                        if (fas_arr === null) {
                            fas_arr = [];
                            for (i = 0; i < fas_wss_count; i += 1) {
                                var ab = new ArrayBuffer(data.byteLength);
                                fas_arr.push({ data: ab, data_view: new frame_array_type(ab, 16), count: 0 });
                            }
                        }

                        for (j = 0; j < frame_length; j += 1) {
                            var instrument_type = instruments[j].type;
                            var instrument_p3 = instruments[j].p3;
                            // instruments which use a source channel / instrument are sent to all instances
                            // TODO: could probably be optimized...
                            // TODO: Faust instruments with inputs are not handled at all which may cause strange behaviors (we need a way to detect them)
                            if (instruments[j] && (
                                    (instrument_type === 1 && instrument_p3 === 0) || // spectral & factor mode
                                    instrument_type === 7  ||
                                    instrument_type === 8  ||
                                    instrument_type === 9  ||
                                    instrument_type === 10 ||
                                    instrument_type === 11 ||
                                    instrument_type === 12)) {
                                    //instrument_type === 14) { // remove this to handle Faust instruments with input, downside is Faust with no inputs will be handled additively on all instances...
                                for (k = 0; k < data_length_rgba; k += 4) {
                                    index = k + j * data_length_rgba;

                                    r = data_view[index];
                                    g = data_view[index + 1];
                                    b = data_view[index + 2];
                                    a = data_view[index + 3];

                                    pr = pframes[index];
                                    pg = pframes[index + 1];

                                    if (r > 0 || g > 0) {
                                        for (i = 0; i < fas_wss_count; i += 1) {
                                            var fa = fas_arr[i];

                                            fa.data_view[index]     = r;
                                            fa.data_view[index + 1] = g;
                                            fa.data_view[index + 2] = b;
                                            fa.data_view[index + 3] = a;
                                        }
                                    } else {
                                        if (pr > 0 || pg > 0) {
                                            for (i = 0; i < fas_wss_count; i += 1) {
                                                var fa = fas_arr[i];

                                                fa.data_view[index]     = 0;
                                                fa.data_view[index + 1] = 0;
                                            }
                                        }
                                    }
                                }
                            } else {
                                for (k = 0; k < data_length_rgba; k += 4) {
                                    index = k + j * data_length_rgba;

                                    r = data_view[index];
                                    g = data_view[index + 1];
                                    b = data_view[index + 2];
                                    a = data_view[index + 3];

                                    pr = pframes[index];
                                    pg = pframes[index + 1];

                                    if (r > 0 || g > 0) {
                                        if (pr > 0 || pg > 0) {
                                            var pii = smart_piarr[index / 4];
                                            var f = fas_arr[pii];

                                            f.data_view[index]     = r;
                                            f.data_view[index + 1] = g;
                                            f.data_view[index + 2] = b;
                                            f.data_view[index + 3] = a;
                                        } else {
                                            for (i = 0; i < fas_wss_count; i += 1) {
                                                var fa = fas_arr[i];
                                                var fa2 = fas_arr[i + 1];

                                                if (fa2) {
                                                    if (fa.count < fa2.count) {
                                                        fa.data_view[index]     = r;
                                                        fa.data_view[index + 1] = g;
                                                        fa.data_view[index + 2] = b;
                                                        fa.data_view[index + 3] = a;
                                                        fa.count += fas_weight[i];

                                                        smart_piarr[index / 4] = i;

                                                        break;
                                                    } else if (fa.count > fa2.count) {
                                                        fa2.data_view[index]     = r;
                                                        fa2.data_view[index + 1] = g;
                                                        fa2.data_view[index + 2] = b;
                                                        fa2.data_view[index + 3] = a;
                                                        fa2.count += fas_weight[i + 1];

                                                        smart_piarr[index / 4] = i + 1;

                                                        break;
                                                    }
                                                } else {
                                                    fa.data_view[index]     = r;
                                                    fa.data_view[index + 1] = g;
                                                    fa.data_view[index + 2] = b;
                                                    fa.data_view[index + 3] = a;
                                                    fa.count += fas_weight[i];

                                                    smart_piarr[index / 4] = i;

                                                    break;
                                                }
                                            }
                                        }
                                    } else {
                                        if (pr > 0 || pg > 0) {
                                            var pii = smart_piarr[index / 4];
                                            var f = fas_arr[pii];

                                            f.data_view[index]     = 0;
                                            f.data_view[index + 1] = 0;
                                            f.count -= fas_weight[pii];
                                        }
                                    }
                                }
                            }
                        }

                        for (i = 0; i < fas_wss_count; i += 1) {
                            ws_obj = fas_wss[i];

                            var fas_data = fas_arr[i].data;
                            var v1 = new Uint8Array(fas_data, 0, 1);
                            var v2 = new Uint32Array(fas_data, 8, 1);

                            v1[0] = uint8_view;
                            v2[0] = frame_length;

                            ws_obj.socket.send(fas_data, sendError);
                        }

                        pframes = new frame_array_type(data.slice(0), 16);
                    }
                }
            }
        });

        socket.on("close", function close() {
            logger.log("info", "Client disconnected.");
        });
    });
}

function onFASOpen(i, port, cb) {
  return function open() {
      logger.log("info", "Relay successfully connected to FAS %s on port %s.", i, port);

      fas_wss_count++;

      if (fas_wss_count === fas_servers.length) {
          logger.log("info", "Relay successfully connected to all servers.");
          
          cb();
      }
  };
}

function onFASClose(fas_obj) {
  return function close() {
      logger.log("info", "FAS %s disconnected from port %s.", fas_obj.i, fas_obj.p);

      for (i = 0; i < fas_wss_count; i += 1) {
          if (fas_wss[i].socket === fas_obj.s) {
              fas_wss.splice(i, 1);
              break;
          }
      }

      fas_wss_count--;
  };
}

function onFASMessage(i) {
    return function msg(message) {
        var data = new Int32Array(message);
        var datad = new Float64Array(message, 2);

        if (data[0] === 0) {
            fas_latencies[i] = datad[0];
            fas_loads[i] = data[1];

            if (fas_loads[i] <= 0) {
                return;
            }

            logger.log("info", "Server %s stream load: %s latency %s.", i, data[1] + "%", datad[0]);
        }
    };
}

function onFASError(i, addr) {
    return function msg(message) {
        logger.log("error", "Cannot connect to server '%s' (id %s).", addr, i);
        logger.log("error", "Network error message : %s", message);
    };
}

function printOverallLoad() {
    clearTimeout(fas_load_timeout);
    fas_load_timeout = setTimeout(printOverallLoad, 2000);

    var i = 0, l = 0, overall_latency = 0;
    for (i = 0; i < fas_loads.length; i += 1) {
        l += fas_loads[i];
    }

    if (l > 0) {
        l /= i;
    }

    for (i = 0; i < fas_latencies.length; i += 1) {
        overall_latency += fas_latencies[i];
    }

    if (overall_latency > 0) {
        overall_latency /= i;
    }

    logger.log("info", "Overall stream load %s latency %s.", l + "%", overall_latency);

    var stream_infos = new ArrayBuffer(8 + 8),
        int32_view = new Int32Array(stream_infos, 0),
        float64_view = new Float64Array(stream_infos, 2);

    int32_view[0] = 0;
    int32_view[1] = l;
    float64_view[0] = overall_latency;

    try {
      client_socket.send(stream_infos, sendError);
    } catch (e) {
      console.log(e);
    }
}

function fasConnect(cb) {
    var i = 0, j = 0, k = 0,
        s = "",
        expanded_servers = [],
        inc, port, ws, curr_addr = 0, addr = "";

    if (fas_servers.length <= 0) {
        port = 3004;
        
        for (i = 0; i < fas_count; i += 1) {
            fas_servers.push("127.0.0.1:" + port);

            port += 1;
        }
    } else {
        if (fas_addr_range !== null && fas_count > 1) {
            for (i = 0; i < fas_servers.length; i += 1) {
                s = fas_servers[i].split(":");

                addr = s[0];
                port = parseInt(s[1], 10) + 1;

                for (j = 0; j < fas_count - 1; j += 1) {
                    expanded_servers.push(addr + ":" + port);

                    port += 1;
                }

                addr = s[0].split(".");
                curr_addr = parseInt(addr[3], 10) + 1;
                addr.splice(3, 1);
                addr = addr.join(".");

                for (j = 0; j < fas_addr_range - 1; j += 1) {
                    port = parseInt(s[1], 10);

                    for (k = 0; k < fas_count; k += 1) {
                        expanded_servers.push(addr + "." + curr_addr + ":" + port);

                        fas_weight.push(fas_weight[i]);

                        port += 1;
                    }

                    curr_addr += 1;
                }
            }
        } else if (fas_count > 1) {
            for (i = 0; i < fas_servers.length; i += 1) {
                s = fas_servers[i].split(":");

                addr = s[0];
                port = parseInt(s[1], 10) + 1;

                for (j = 0; j < fas_count - 1; j += 1) {
                    expanded_servers.push(addr + ":" + port);

                    fas_weight.push(fas_weight[i]);

                    port += 1;
                }
            }
        } else if (fas_addr_range !== null) {
            for (i = 0; i < fas_servers.length; i += 1) {
                s = fas_servers[i].split(":");

                addr = s[0].split(".");
                curr_addr = parseInt(addr[3], 10) + 1;
                addr.splice(3, 1);
                addr = addr.join(".");

                for (j = 0; j < fas_addr_range - 1; j += 1) {
                    port = parseInt(s[1], 10);

                    for (k = 0; k < fas_count; k += 1) {
                        expanded_servers.push(addr + "." + curr_addr + ":" + port);

                        fas_weight.push(fas_weight[i]);

                        port += 1;
                    }

                    curr_addr += 1;
                }
            }
        }
    }

    fas_servers = fas_servers.concat(expanded_servers);

    fas_servers.forEach(function (v, i) {
        if (fas_weight[i] === undefined) {
            fas_weight[i] = 1;
        }
    });

    if (!fas_servers.length) {
        logger.log("info", "Please specify a valid target.");
    }
    
    for (i = 0; i < fas_servers.length; i += 1) {
        logger.log("info", "Connecting to '" + fas_servers[i] + "' (FAS " + i + ")");

        s = fas_servers[i].split(":");

        addr = s[0];
        port = s[1];

        addr = "ws://" + addr + ":" + port;

        ws = new WebSocket(addr);

        ws.binaryType = "arraybuffer";
        ws.on("open", onFASOpen(i, port, cb));

        ws.on("error", onFASError(i, addr));

        ws.on("message", onFASMessage(i));

        ws.on("close", onFASClose({ s: ws, i: i, p: port }));

        fas_wss.push({
            socket: ws,
            data: null
        });
    }

    clearTimeout(fas_load_timeout);
    fas_load_timeout = setTimeout(printOverallLoad, 2000);
}

fasConnect(websocketConnect);
