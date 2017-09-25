/**
 * Fragment Audio Server relay.
 *
 * This application allow to serve multiple Fragment Audio Server over the wire by splitting and distributing the incoming pixels data
 * This allow to distribute the sound synthesis computation over different computers or cores
 *
 * Listen (websocket) on 127.0.0.1:3003 then split the incoming data and distribute it to a multitude of Fragment Audio Server which listen on port starting from 3004
 * Gather and compute the overall load from incoming data from all the connected Fragment Audio Server
 *
 * Usage:
 *   Simple usage (same machine, will try to connect to 127.0.0.1:3004, 127.0.0.1:3005 etc) : node fas_relay -count 2
 *   Usage by specifying address/port of each sound server : node fas_relay 127.0.0.1:3004 127.0.0.1:3005
 */

const SYNTH_SETTINGS = 0,
      FRAME_DATA = 1,
      GAIN_CHANGE = 2,
      CHN_SETTINGS = 3;

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

    fas_wss = [],
    fas_wss_count = 0,

    args = require('minimist')(process.argv.slice(2)),
    args_arr = process.argv.slice(2),
    fas_count = null;

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

        socket.on("message", function incoming(data) {
            var uint8_view,
                uint32_view,
                frame_data,
                frame_length,
                data_length_per_fas,
                start = 0,
                end,
                endc,
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
                }

                for (i = 0; i < fas_wss_count; i += 1) {
                    fas_wss[i].socket.send(data, sendError);
                }
            } else {
                uint32_view = new Uint32Array(data, 8, 2);

                frame_length = uint32_view[0]; // channels in the frame
                data_length_per_fas = Math.ceil((data_length / fas_wss_count) * 4);

                // split pixels data and distribute it to FAS instances over the wire
                for (i = 0; i < fas_wss_count; i += 1) {
                    ws_obj = fas_wss[i];

                    ws_obj.data = data.slice(0);

                    frame_data = new frame_array_type(ws_obj.data, 16);

                    for (j = 0; j < channels; j += 1) {
                        start = data_length_rgba * j;
                        endc = data_length_rgba * (j + 1);
                        end = Math.min(start + fi + data_length_per_fas, endc);

                        for (k = start; k < (start + fi); k += 1) {
                            frame_data[k] = 0;
                        }

                        for (k = end; k < endc; k += 1) {
                            frame_data[k] = 0;
                        }

                        // fill don't work (implementation ?)
                        //frame_data.fill(0, start + fi, end);
                    }

                    ws_obj.socket.send(ws_obj.data, sendError);

                    fi += data_length_per_fas;
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

function onFASClose(ws, i, port) {
  return function close() {
      logger.info("FAS %s disconnected from port %s.", i, port);

      for (i = 0; i < fas_wss_count; i += 1) {
          if (fas_wss[i].socket === ws) {
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

        ws.on("close", onFASClose(ws, i, port));

        fas_wss.push({
          socket: ws,
          data: null
        });
    }

    fas_count = c;
}

fasConnect(websocketConnect);
