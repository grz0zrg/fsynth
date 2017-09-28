/**
 * Fragment Audio Server relay.
 *
 * This application allow to serve multiple Fragment Audio Server over the wire by splitting and distributing the incoming pixels data
 * This allow to distribute the sound synthesis computation over different computers or cores
 *
 * Listen (websocket) on 127.0.0.1:3003 then split the incoming data and distribute it to a multitude of Fragment Audio Server which listen on port starting from 3004
 * Output the load from all the connected Fragment Audio Server incoming data
 *
 * Usage:
 *   Simple usage (same machine, will try to connect to 127.0.0.1:3004, 127.0.0.1:3005 etc) : node fas_relay -count 2
 *   Usage by specifying address/port of each sound server : node fas_relay 127.0.0.1:3004 127.0.0.1:3005
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

    args = require('minimist')(process.argv.slice(2)),
    args_arr = process.argv.slice(2),
    fas_count = null;

if (distribution_method === DSPLIT) {
    logger.info("Distribution algorithm: DSPLIT");
} else if (distribution_method === DINTER) {
    logger.info("Distribution algorithm: DINTER");
} else if (distribution_method === DSMART) {
    logger.info("Distribution algorithm: DSMART");
}

if (args.count) {
    fas_count = parseInt(args.count, 10);
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

                        channels[i] = { synthesis: uint8_view[0]; };
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
                        }

                        if (smart_piarr === null) {
                            smart_piarr = new Array(frame_length * data_length);
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
                                                    fa.count++;

                                                    smart_piarr[index / 4] = i;

                                                    break;
                                                } else if (fa.count > fa2.count) {
                                                    fa2.data_view[index]     = r;
                                                    fa2.data_view[index + 1] = g;
                                                    fa2.data_view[index + 2] = b;
                                                    fa2.data_view[index + 3] = a;
                                                    fa2.count++;

                                                    smart_piarr[index / 4] = i + 1;

                                                    break;
                                                }
                                            } else {
                                                fa.data_view[index]     = r;
                                                fa.data_view[index + 1] = g;
                                                fa.data_view[index + 2] = b;
                                                fa.data_view[index + 3] = a;
                                                fa.count++;

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
                                        f.data_view[index + 2] = 0;
                                        f.data_view[index + 3] = 0;
                                        f.count--;
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

        logger.info("Server %s stream load: %s.", i, parseInt(stream_load * 100, 10) + "%");
    };
}

function fasConnect(cb) {
    var i = 0,
        c = fas_count,
        port, ws;

    if (c === null) {
        c = args_arr.length;
    }

    for (i = 0; i < c; i += 1) {
        if (fas_count === null) {
            port = args_arr[i].split(":")[1];

            ws = new WebSocket("ws://" + args_arr[i]);
        } else {
            port = 3004 + i;

            ws = new WebSocket("ws://127.0.0.1:" + port);
        }
        ws.binaryType = "arraybuffer";
        ws.on("open", onFASOpen(i, port, cb));

        ws.on("message", onFASMessage(i));

        ws.on("close", onFASClose({ s: ws, i: i, p: port }));

        fas_wss.push({
          socket: ws,
          data: null
        });
    }

    fas_count = c;
}

fasConnect(websocketConnect);
