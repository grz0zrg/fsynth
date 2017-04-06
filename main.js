const {app, BrowserWindow, Menu, shell} = require('electron')
const path = require('path')
const url = require('url')
const spawn = require('child_process').spawn;

let win
let fas
let fas_tmp

function createWindow () {
    win = new BrowserWindow({
        title: "Fragment - The Collaborative Spectral Synthesizer",
        icon: "client/favicon.ico",
        darkTheme: true,
        width: 1280,
        height: 800
    })

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'client/index.html'),
        protocol: 'file:',
        slashes: true
    }))

    win.webContents.openDevTools()

    win.on('closed', () => {
        win = null;
        fas.stdin.write("\x03");
        //fas.kill("SIGINT")
    })
}

function fasClose(code) {
    console.log(`FAS exited with code ${code}`);
/*
    if (process.platform !== 'darwin') {
        app.quit();
    }
*/
}

function fasSpawn(params) {
    if (params === undefined) {
        params = [];
    }
    
    fas = spawn(path.join(__dirname, 'fas/fas'), params, {
            cwd: path.join(__dirname, 'fas')
        });
    
    fas.stderr.on('data', (data) => {
        console.log("stderr: " + data.toString());
    });
    
    fas.stderr.on('error', (data) => { });
    fas.stdin.on('error', (data) => { });
    fas.stdout.on('error', (data) => { });

    fas.stdout.on('data', (data) => {
        console.log("stdout: " + data.toString());

        var stdout = data.toString(),
            started_result;
        started_result = stdout.search(/started and listening/);
        if (started_result !== -1) {
            if (!win) {
                createWindow();
            }
            
            console.log("FAS started.");
        }
    });
    
    fas.removeListener('close', fasClose);

    fas.on('close', fasClose);
}

global.fasRestart = function (params) {
    fas.removeListener('close', fasClose);
    
    fas.on('close', (code) => {
        console.log(`FAS exited with code ${code} after restart`);
        
        fasSpawn(params);
    });
    
    fas.stdin.write("\x03");
};

global.fasInfos = function (mcb) {
    var fas_output = "";
    
    fas_tmp = spawn(path.join(__dirname, 'fas/fas'), ['--i'], {
            cwd: path.join(__dirname, 'fas')
        });

    fas_tmp.stderr.on('data', (data) => {
        //console.log("stderr: " + data.toString());
    });

    fas_tmp.stdout.on('data', (data) => {
        fas_output += data.toString();
    });
    
    fas_tmp.on('close', (code) => {
        console.log(`fasInfos: FAS exited with code ${code}`);
        
        var regex = /PortAudio device (\d+) - ([\s|\S]+?)=+\n  max input channels : (\d+)\n  max output channels : (\d+)\n  default low input latency : ([-|\d|\.]+)\n  default low output latency : ([-|\d|\.]+)\n  default high input latency : ([-|\d|\.]+)\n  default high output latency : ([-|\d|\.]+)\n  default sample rate : ([\d|\.]+)/g;
        var matches;
        var audio_devices = [];
        
        while (matches = regex.exec(fas_output)) {
            audio_devices.push({
                id:    matches[1],
                name:  matches[2],
                inchn: matches[3],
                ouchn: matches[4],
                linl:  matches[5],
                loul:  matches[6],
                hinl:  matches[7],
                houl:  matches[8],
                smpr:  matches[9]
            });
        }
        
        mcb(audio_devices);
    });
}

app.on('ready', fasSpawn);

/*app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})*/

app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
})

const template = [
    {
        label: 'Fragment',
        submenu: [
            {
                role: 'quit'
            }
        ]
    },
    {
        label: 'Edit',
        submenu: [
            {
                role: 'undo'
            },
            {
                role: 'redo'
            },
            {
                type: 'separator'
            },
            {
                role: 'cut'
            },
            {
                role: 'copy'
            },
            {
                role: 'paste'
            },
            {
                role: 'pasteandmatchstyle'
            },
            {
                role: 'delete'
            },
            {
                role: 'selectall'
            }
        ]
    },
    {
        label: 'View',
        submenu: [
            {
                role: 'reload'
            },
            {
                type: 'separator'
            },
            {
                role: 'resetzoom'
            },
            {
                role: 'zoomin'
            },
            {
                role: 'zoomout'
            },
            {
                type: 'separator'
            },
            {
                role: 'togglefullscreen'
            }
        ]
    },
    {
        role: 'help',
        submenu: [
            {
                label: 'Documentation',
                click () {
                    shell.openExternal('https://www.fsynth.com/documentation')
                  }
            },
            {
                label: 'Website',
                click () {
                    shell.openExternal('https://www.fsynth.com')
                }
            }
        ]
    }
  ]

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
