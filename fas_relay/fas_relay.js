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
 *   Simple usage (same machine, will try to connect to 127.0.0.1:3004, 127.0.0.1:3005 etc) : node fas_relay -c 2
 *   Usage by specifying address/port of each sound server : node fas_relay -s="127.0.0.1:3004 127.0.0.1:3005"
 *   Usage by specifying address/port + distribution weight of each sound server : node fas_relay -w="1 1.5" -s="127.0.0.1:3004 127.0.0.1:3005"
 */

const SYNTH_SETTINGS = 0,
      FRAME_DATA = 1,
      GAIN_CHANGE = 2,
      CHN_SETTINGS = 3;

// distribution methods of pixels value, see simulation.html to watch and interact with all those algorithms
const DSPLIT = 0, // split the slices in equals chunks for each servers, this is the naive algorithm
      // interleaved processing
      // this will distribute data over each servers in a linear & cyclical fashion, it has very good performances
      DINTER = 1,
      // smart distribution of load over each servers
      // this is the best algorithm, it distribute data equally to all servers, it, it work great
      DSMART = 2;

var WebSocket = require("ws"),
    winston = require("winston"),
    wss,

    frame_array_type = Uint8Array,
    frame_data_comp = 1,
    channels = 0,

    data_length = 0,
    data_length_rgba = 0,

    logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({ 'timestamp': true, 'colorize': true, 'level': 'debug' })
        ]
    }),

    distribution_method = DSMART,

    fas_wss = [],
    fas_wss_count = 0,

    fas_load_timeout,

    args = require('minimist')(process.argv.slice(2), {
        string: ["s", "w"]
      }),

    fas_servers = [],
    fas_weight = [],
    fas_loads = [],
    fas_count = null;

if (args.s) {
    fas_servers = args.s.split(" ");
} else if (args.c) {
    fas_count = parseInt(args.c, 10);
}

if (args.w) {
    fas_weight = args.w.split(" ");
    fas_weight = fas_weight.map(function (w) {
            return parseFloat(w);
        });
}

if (distribution_method === DSPLIT) {
    logger.info("Distribution algorithm: DSPLIT");
} else if (distribution_method === DINTER) {
    logger.info("Distribution algorithm: DINTER");
} else if (distribution_method === DSMART) {
    logger.info("Distribution algorithm: DSMART");
}

function sendError(error) {
    if (error) {
        logger.error("Error: %s", error);
    }
}

function websocketConnect() {
    wss = new WebSocket.Server({
        port: 3003
    });

    wss.binaryType = "arraybuffer";
    wss.on("connection", function (socket) {
        logger.info("Client successfully connected.");

        socket.binaryType = "arraybuffer";

        var pframes = null,
            smart_piarr = null,
            fas_arr = null,
            channels = [];

        socket.on("message", function incoming(data) {
            var uint8_view,
                uint32_view,
                float64_view,
                data,
                data_view,
                frame_data,
                frame_length,
                data_length_per_fas,
                start = 0,
                mono,
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

            logger.silly("Packet id '%s' received from client.", uint8_view[0]);
            if (uint8_view[0] !== FRAME_DATA) {
                if (uint8_view[0] === SYNTH_SETTINGS) {
                    uint32_view = new Uint32Array(data, 8, 3);
                    data_length = uint32_view[0];
                    data_length_rgba = data_length * 4;

                    if (uint32_view[2]) {
                        frame_array_type = Float32Array;
                        frame_data_comp = 4;

                        logger.info("Frame data set to float.");
                    } else {
                        frame_array_type = Uint8Array;
                        frame_data_comp = 1;
                    }
                } else if (uint8_view[0] === CHN_SETTINGS) {
                    uint32_view = new Uint32Array(data, 8, 1);

                    channels = uint32_view[0];

                    logger.info("%s Channels.", channels);

                    for (i = 0; i < channels; i += 1) {
                        uint8_view = new Uint32Array(data, 16 + i * 24, 2);
                        float64_view = new Float64Array(data, 16 + 8 + i * 24);

                        channels[i] = { synthesis: uint8_view[0] };
                    }
                }

                for (i = 0; i < fas_wss_count; i += 1) {
                    fas_wss[i].socket.send(data, sendError);
                }
            } else {
                uint32_view = new Uint32Array(data, 8, 2);

                frame_length = uint32_view[0]; // channels in the frame
                mono = uint32_view[1];
                data_length_per_fas = Math.round((data_length / fas_wss_count) * 4);

                data_view = new frame_array_type(data, 16);

                if (fas_wss_count === 1) {
                    for (i = 0; i < fas_wss_count; i += 1) {
                        fas_wss[i].socket.send(data, sendError);
                    }
                } else {
                    // split pixels data and distribute it to FAS instances over the wire
                    if (distribution_method === DSPLIT) {
                        for (i = 0; i < fas_wss_count; i += 1) {
                            ws_obj = fas_wss[i];

                            ws_obj.data = data.slice(0);

                            frame_data = new frame_array_type(ws_obj.data, 16);
                            //frame_data.fill(0);

                            for (j = 0; j < frame_length; j += 1) {
                                start = data_length_rgba * j + fi;
                                end = start + data_length_per_fas;

                                for (k = start; k < end; k += 1) {
                                    frame_data[k] = data_view[k];
                                }
                            }

                            ws_obj.socket.send(ws_obj.data, sendError);

                            fi += data_length_per_fas;
                        }
                    } else if (distribution_method === DINTER) {
                        for (i = 0; i < fas_wss_count; i += 1) {
                            ws_obj = fas_wss[i];

                            ws_obj.data = data.slice(0);

                            frame_data = new frame_array_type(ws_obj.data, 16);
                            //frame_data.fill(0);

                            for (j = (i * 4); j < frame_data.length; j += (fas_wss_count * 4)) {
                                frame_data[j] = data_view[j];
                                frame_data[j + 1] = data_view[j + 1];
                                frame_data[j + 2] = data_view[j + 2];
                                frame_data[j + 3] = data_view[j + 3];
                            }

                            ws_obj.socket.send(ws_obj.data, sendError);
                        }
                    } else if (distribution_method === DSMART) {
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

                                        if (f) {
                                            f.data_view[index]     = 0;
                                            f.data_view[index + 1] = 0;
                                            f.data_view[index + 2] = 0;
                                            f.data_view[index + 3] = 0;
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
                            var v2 = new Uint32Array(fas_data, 8, 2);

                            v1[0] = uint8_view;
                            v2[0] = frame_length;
                            v2[1] = mono;

                            ws_obj.socket.send(fas_data, sendError);
                        }

                        pframes = new frame_array_type(data.slice(0), 16);
                    }
                }
            }
        });

        socket.on("close", function close() {
            logger.info("Client disconnected.");
        });
    });
}

function onFASOpen(i, port, cb) {
  return function open() {
      logger.info("Relay successfully connected to FAS %s on port %s.", i, port);

      fas_wss_count++;

      if (fas_wss_count === fas_count) {
          cb();
      }
  };
}

function onFASClose(fas_obj) {
  return function close() {
      logger.info("FAS %s disconnected from port %s.", fas_obj.i, fas_obj.p);

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
        var stream_load = new Float64Array(message);

        fas_loads[i] = stream_load[0];

        if (fas_loads[i] <= 0) {
          return;
        }

        logger.info("Server %s stream load: %s.", i, parseInt(stream_load[0] * 100, 10) + "%");
    };
}

function onFASError(i, addr) {
    return function msg(message) {
        logger.error("Cannot connect to server '%s' (id %s).", addr, i);
        logger.error("Network error message : %s", message);
    };
}

function printOverallLoad() {
    var i = 0, l = 0;
    for (i = 0; i < fas_loads.length; i += 1) {
        l += fas_loads[i];
    }

    if (i > 0) {
        l /= i;
    } else {
        return;
    }

    if (l <= 0) {
      return;
    }

    logger.info("Overall stream load: %s.", parseInt(l * 100, 10) + "%");

    clearTimeout(fas_load_timeout);
    fas_load_timeout = setTimeout(printOverallLoad, 4000);
}

function fasConnect(cb) {
    var i = 0,
        c = fas_count,
        port, ws;

    if (c === null) {
        c = fas_servers.length;
    }

    fas_count = c;

    for (i = 0; i < c; i += 1) {
        var addr = "";
        if (args.s) {
            port = fas_servers[i].split(":")[1];

            addr = "ws://" + fas_servers[i];

            ws = new WebSocket(addr);
        } else if (args.c) {
            port = 3004 + i;

            addr = "ws://127.0.0.1:" + port;

            ws = new WebSocket(addr);
        }
        ws.binaryType = "arraybuffer";
        ws.on("open", onFASOpen(i, port, cb));

        ws.on("error", onFASError(i, addr));

        ws.on("message", onFASMessage(i));

        ws.on("close", onFASClose({ s: ws, i: i, p: port }));

        fas_wss.push({
          socket: ws,
          data: null
        });

        if (!fas_weight[i]) {
            fas_weight[i] = 1;
        }
    }

    clearTimeout(fas_load_timeout);
    fas_load_timeout = setTimeout(printOverallLoad, 4000);
}

fasConnect(websocketConnect);
