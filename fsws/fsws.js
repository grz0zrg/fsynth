/*jslint browser: true*/
/*jslint continue: true*/

var compression = require('compression'),
    serveStatic = require('serve-static'),
    winston = require('winston'),
    express = require('express'),
    app = express(),
    path = require('path'),
    url = require("url"),
    cluster	= require('cluster'),
    clusterControl = require('strong-cluster-control'),
    http = require('http').Server(app),
    
    logger = winston.createLogger({
        format: winston.format.combine(winston.format.splat(), winston.format.simple()),
        transports: [
            new (winston.transports.Console)({ 'timestamp': true, 'colorize': true })
        ]
    }),
    
    index = __dirname + '/../www/index.html';

clusterControl.start({
        size: clusterControl.CPUS,
        shutdownTimeout: 1000,
        terminateTimeout: 5000,
        throttleDelay: 5000
    }).on('error', function(er) {
        logger.log("error", "Cluster error occured: ", er);
    }).on('startWorker', function(worker) {
        logger.log("info", "Worker %s %s", worker.process.pid, "started");
    }).on('stopWorker', function(worker, code, signal) {
        if (code) {
            logger.log("warn", "Worker %s stopped with code: %s", worker.process.pid, code);
        } else {
            logger.log("warn", "Worker %s was stopped.", worker.process.pid);
        }
    });

if (cluster.isMaster) {
    process.on('SIGUSR1', function() {
        logger.log("warn", "SIGUSR1 received, restarting workers in progress...");

        clusterControl.restart();
    });
    
    process.on('SIGUSR2', function() {
        logger.log("info", "Workers status:", clusterControl.status().workers);
    });

	return;
}

app.use(compression());

app.use(serveStatic(__dirname + '/../www'));
app.use('/app/js/worker', serveStatic(__dirname + '/../client/js/worker'));
app.use('/app/favicon.png', serveStatic(__dirname + '/../client/favicon.png'));
app.use('/app/favicon_64x64.png', serveStatic(__dirname + '/../client/favicon_64x64.png'));
app.use('/app/favicon_128x128.png', serveStatic(__dirname + '/../client/favicon_128x128.png'));
app.use('/app/favicon_256x256.png', serveStatic(__dirname + '/../client/favicon_256x256.png'));
app.use('/app/cache-manifest.mf', serveStatic(__dirname + '/../client/cache-manifest.mf'));
app.use('/app/manifest.json', serveStatic(__dirname + '/../client/manifest.json'));
app.use('/app/dist', serveStatic(__dirname + '/../client/dist/'));
app.use('/app/data', serveStatic(__dirname + '/../client/data/'));
app.use('/app/client/data', serveStatic(__dirname + '/../client/data/'));
app.use('/app/fonts', serveStatic(__dirname + '/../client/fonts/'));
app.use('/app/css', serveStatic(__dirname + '/../client/css/'));
app.use('/ed/dist', serveStatic(__dirname + '/../editor/dist/'));
app.use('/ed/data', serveStatic(__dirname + '/../editor/data/'));
app.use('/ed/client/data', serveStatic(__dirname + '/../client/data/'));
app.use('/ed/css', serveStatic(__dirname + '/../editor/css/'));
app.use('/ed/favicon.png', serveStatic(__dirname + '/../editor/favicon.png'));

app.use('/FFTW.wasm', serveStatic(__dirname + '/../client/dist/worker/FFTW.wasm'));

app.get('/', serveStatic(index));

app.get('/app', function (req, res) {
    res.sendFile(path.resolve(index));
});

app.get('/app/:session', function (req, res) {
    res.sendFile(path.resolve(__dirname + '/../client/index.html'));
});

app.get('/ed', function (req, res) {
    res.sendFile(path.resolve(index));
});

app.get('/ed/:session', function (req, res) {
    res.sendFile(path.resolve(__dirname + '/../editor/index.html'));
});

http.listen(3000, "127.0.0.1", function () {
    logger.log("info", 'Fragment - Web Server listening on *:3000');
});