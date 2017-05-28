var osc = require("osc"),
    http = require("http"),
    WebSocket = require("ws"),

    express = require("express"),
    app = express(),
    server = app.listen(8081),

    websocketPort,
    wss,
    udp;

app.use("/", express.static(__dirname + "/static"));

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
            console.log("ready");
        });

        websocketPort.on("message", function (m) {
            console.log("An OSC Message was received!", m);
        });

        websocketPort.on("error", function (e) {
            console.log("websocketPort error: ", e);
        });
    });
}

websocketConnect();

// UDP
udp = new osc.UDPPort({
    localAddress: "127.0.0.1",
    localPort: 57120,
    metadata: true
});

udp.on("bundle", function (oscBundle, timeTag, info) {
    if (websocketPort) {
        websocketPort.send(oscBundle);
    }
});

udp.on("message", function (m) {
    if (websocketPort) {
        websocketPort.send(m);
    }
});

udp.on("error", function (e) {
    console.log("UDP Error: ", e);
});

udp.open();
