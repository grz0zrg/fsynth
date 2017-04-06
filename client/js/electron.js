/* jslint browser: true */

/*#include ../../www/js/main.js*/

/***********************************************************
    Fields.
************************************************************/

var _electron,
    
    _fasInfos,
    _fasRestart,
    
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

var _restartFas = function () {
    var opts = [];
    
    if (_chosen_fas_device) {
        opts.push("--device");
        opts.push(_chosen_fas_device);
    }
    
    _fasRestart(opts);
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

var _onDeviceSelected = function (e) {
    var selected_option = e.target.options[e.target.selectedIndex],
        device_id = parseInt(selected_option.dataset.id, 10),
        device_name = e.target.value;
    
    _chosen_fas_device = device_id;
    
    _updateDeviceInfos(device_id);
    
    localStorage.setItem('fs-fas-device-id', device_id);
    localStorage.setItem('fs-fas-device-name', device_name);
    
    _restartFas();
};

var _onDeviceInfos = function (devices) {
    _fas_devices = devices;
    
    var device_select = document.getElementById("fs_fas_device"),
        
        selected_device_id = localStorage.getItem('fs-fas-device-id'),
        selected_device_name = localStorage.getItem('fs-fas-device-name'),
        
        fas_device,
        
        selected = "",
        
        i = 0;
    
    if (selected_device_id === null) {
        selected_device_id = 0;
    } else {
        selected_device_id = parseInt(selected_device_id, 10);
    }
    
    _chosen_fas_device = selected_device_id;
    
    device_select.addEventListener("change", _onDeviceSelected);
    
    device_select.innerHTML = "";
    
    for (i = _fas_devices.length - 1; i > 0; i -= 1) {
        fas_device = _fas_devices[i];
        
        if (fas_device.id === selected_device_id &&
            fas_device.name === selected_device_name) {
            selected = " selected"
        } else {
            selected = "";
        }
        
        device_select.innerHTML += "<option data-id=\"" + fas_device.id + "\"" + selected + ">" + fas_device.name + "</option>";
    }
    
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
        _fasRestart = _electron.remote.getGlobal('fasRestart');
        
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