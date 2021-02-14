/**
 * Simple OSC relay.
 * Relay incoming data from websocket 127.0.0.1:8081 to UDP 127.0.0.1:57120 (correspond to OSC OUT on Fragment client)
 * Relay incoming data from UDP 127.0.0.1:57121 to websocket 127.0.0.1:8081 (correspond to OSC IN on Fragment client)
 */

var osc = require("osc"),
    WebSocket = require("ws"),

    express = require("express"),
    app = express(),
    server = app.listen(8081),

    websocketPort,
    wss;

app.use("/", express.static(__dirname + "/static"));

var udpPort = new osc.UDPPort({
    localAddress: "127.0.0.1",
    localPort: 57121,
    metadata: true
});

function websocketConnect() {
    wss = new WebSocket.Server({
        server: server
    });

    wss.on("connection", function (socket) {
        websocketPort = new osc.WebSocketPort({
            socket: socket,
            metadata: true
        });

        websocketPort.on("ready", function () {
            console.log("OSC Relay ready!");
        });

        websocketPort.on("message", function (m) {
            //console.log("An OSC Message was received!", m);
            udpPort.send(m, "127.0.0.1", 57120);
        });

        websocketPort.on("error", function (e) {
            console.log("websocketPort error: ", e);
        });

        console.log("New connection...");
    });

    wss.on("close", function () {
        console.log("Connection closed.")
    });

    console.log("Websocket listening on 127.0.0.1:8081");
}

udpPort.on("ready", function () {
    websocketConnect();
});

udpPort.on("bundle", function (oscBundle, timeTag, info) {
    if (websocketPort) {
        websocketPort.send(oscBundle);
    }
});

udpPort.on("message", function (m) {
    if (websocketPort) {
        websocketPort.send(m);
    }
});

udpPort.on("osc", function (m) {
    console.log(m);
});

udpPort.on("error", function (e) {
    console.log("UDP Error: ", e);
});

udpPort.open();
