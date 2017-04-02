/* jslint browser: true */

/*#include ../../www/js/main.js*/

/***********************************************************
    Fields.
************************************************************/

var _electron,
    
    _fasInfos,
    
    _fas_devices,
    
    _electron_login_dialog,
    
    _fs_fas_device = null,
    _chosen_fas_device = 0;

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

var _updateDeviceInfos = function (index) {
    var fas_infos_elem = document.getElementById("fs_fas_infos"),
        
        device = _fas_devices[index],
        
        html = "<ul>";
    
    html += "<li>max input channels: " + device.inchn + "</li>";
    html += "<li>max output channels: " + device.ouchn + "</li>";
    html += "<li>default samplerate: " + parseInt(device.smpr, 10) + "</li>";
    html += "</ul>";
    
    fas_infos_elem.innerHTML = html;
};

var _onDeviceSelected = function (index) {
    _chosen_fas_device = index;
    
    _updateDeviceInfos(index);
    
    // TODO: relaunch FAS
};

var _onDeviceInfos = function (devices) {
    _fas_devices = devices;
    
    var device_names = [],
        
        i = 0;
    
    for (i = 0; i < _fas_devices.length; i += 1) {
        device_names.push(_fas_devices[i].name);
    }
    
    device_names.reverse();
    
    WUI_DropDown.destroy("fs_fas_device");
    
    WUI_DropDown.create("fs_fas_device", {
            width: "440px",
            height: "24px",

            vspacing: 4,

            ms_before_hiding: 1000,

            selected_id: _chosen_fas_device,

            vertical: true,

            on_item_selected: _onDeviceSelected
        },
        device_names
    );
    
    _updateDeviceInfos(_chosen_fas_device);
};

/***********************************************************
    Init.
************************************************************/

var _electronInit = function () {
    var electron_login = document.getElementById("fs_electron_login"),
        
        body_childs = document.body.children,
        
        i = 0;
    
    if (_isElectronApp()) {
        document.body.classList.add("login");
        
        _electron = require('electron');
        
        _fasInfos = _electron.remote.getGlobal('fasInfos');
        
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
                draggable: false,
            });
        
        WUI_Tabs.create("fs_electron_login_tabs", {
            //on_tab_click: tab_clicked,

            height: "100%"
        });
        
        document.getElementById("fs_app_version").innerHTML = "v" + _electron.remote.app.getVersion();

        _fp_main(_join);
        
        electron_login.style.display = "";
        
        _fasInfos(_onDeviceInfos);
        
        return true;
    } else {
        document.body.removeChild(electron_login);
    }
    
    return false;
};