const {app, BrowserWindow, Menu, shell} = require('electron')
const path = require('path')
const url = require('url')
const spawn = require('child_process').spawn;

let win
let fas

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
        win = null
        fas.kill("SIGINT")
        fas.stdin.write("\x03")
        if (process.platform !== 'darwin') {
            app.quit()
        }
    })
}

function fasSpawn () {
    fas = spawn(path.join(__dirname, 'fas/fas'), [], {
            cwd: path.join(__dirname, 'fas')
        });

    fas.stderr.on('data', (data) => {
        console.log("stderr: " + data.toString());
    });

    fas.stdout.on('data', (data) => {
        console.log("stdout: " + data.toString());

        var stdout = data.toString(),
            started_result;
        started_result = stdout.search(/started and listening on port 3003/);
        if (started_result !== -1) {
            createWindow()
        }
    });

    fas.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });
}

app.on('ready', fasSpawn)

/*app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})*/

app.on('activate', () => {
    if (win === null) {
        createWindow()
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

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
