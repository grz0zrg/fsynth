/* jslint browser: true */

/*#include ../../www/js/main.js*/

/***********************************************************
    Fields.
************************************************************/

var _electron,
    
    _electron_login_dialog;

/***********************************************************
    Functions.
************************************************************/

var _isElectronApp = function () {
    return (typeof process !== "undefined") && process.versions && (process.versions.electron !== undefined);
};

var _join = function (session_name) {
    var body_childs = document.body.children,
        i = 0;
    
    for (i = 0; i < body_childs.length; i += 1) {
        if (body_childs[i].id === "fs_electron_login") {
            body_childs[i].style.display = "none";
        } else {
            body_childs[i].style.display = "";
        }
    }
    
    FragmentSynth({
            session_name: session_name,
            fas: true
        });
};

/***********************************************************
    Init.
************************************************************/

var _electronInit = function () {
    var electron_login = document.getElementById("fs_electron_login"),
        
        body_childs = document.body.children,
        
        i = 0;
    
    if (_isElectronApp()) {
        _electron = require('electron');
        
        //document.body.style.backgroundColor = "#ffffff";
         
        for (i = 0; i < body_childs.length; i += 1) {
            if (body_childs[i].id !== "fs_electron_login") {
                body_childs[i].style.display = "none";
            }
        }
        
        _electron_login_dialog = WUI_Dialog.create("fs_electron_login_dialog", {
                title: "",

                width: "500px",
                height: "400px",

                halign: "center",
                valign: "center",

                open: true,
                closable: false,
            
                status_bar: false,
                detachable: false,
                resizable: false,
                minimizable: false,
                draggable: false
            });
        
        WUI_Tabs.create("fs_electron_login_tabs", {
            //on_tab_click: tab_clicked,

            height: "100%"
        });
        
        document.getElementById("fs_app_version").innerHTML = "v" + _electron.remote.app.getVersion();

        _fp_main(_join);
        
        return true;
    } else {
        document.body.removeChild(electron_login);
    }
    
    return false;
};