/* jslint browser: true */


/*
    Simple discussion system
*/

/***********************************************************
    Fields.
************************************************************/

var _discuss_dialog_id = "fs_right_dialog",
    _right_dialog,
    
    _discuss_input = document.getElementById("fs_discuss_input");

/***********************************************************
    Functions.
************************************************************/

var _getUserListElement = function () {
    return document.getElementById("fs_users_list");
};

var _addUser = function (id, name, hex_color, bold) {
    var users_list_element = _getUserListElement(),
        li = document.createElement("li"),
        detached_dialog = WUI_Dialog.getDetachedDialog(_discuss_dialog_id);

    li.innerHTML = name;
    li.id = "user" + id;
    li.title = name;
    
    if (hex_color) {
        li.style.color = hex_color;
    }
    
    if (bold) {
        li.style.fontWeight = "bold";
    }

    users_list_element.appendChild(li);
    
    if (detached_dialog) {
        detached_dialog.document.getElementById("fs_users_list").appendChild(li.cloneNode(true));
    }
};

var _removeUser = function (id) {
    var user_li = document.getElementById("user" + id),
        detached_user_li,
        detached_dialog = WUI_Dialog.getDetachedDialog(_discuss_dialog_id);
    
    if (detached_dialog) {
        detached_user_li = detached_dialog.document.getElementById("user" + id);
        
        detached_user_li.parentElement.removeChild(detached_user_li);
    }
    
    user_li.parentElement.removeChild(user_li);
};

var _setUsersList = function (list) {
    var users_list_element = _getUserListElement(),
        detached_dialog = WUI_Dialog.getDetachedDialog(_discuss_dialog_id),
        detached_dialog_list_element,
        li,
        i;
    
    users_list_element.innerHTML = "";
    
    _addUser("self", _username, "#adff2f", false);

    for (i = 0; i < list.length; i += 1) {
        li = document.createElement("li");
        li.innerHTML = list[i].username;
        li.id = "user" + list[i].userid;

        users_list_element.appendChild(li);
    }
    
    if (detached_dialog) {
        detached_dialog_list_element = detached_dialog.document.getElementById("fs_users_list");
        
        detached_dialog_list_element.parentElement.removeChild(detached_dialog_list_element);
        
        detached_dialog_list_element.parentElement.appendChild(users_list_element.cloneNode(true));
    }
};

var _removeUsers = function () {
    _setUsersList([]);
    
    _removeUser("self");
};

var _addMessage = function (userid, data) {
    var discuss_element = document.getElementById("fs_discuss"),
        user_li = document.getElementById("user" + userid),
        li = document.createElement("li"),
        detached_discuss_element,
        
        detached_dialog;

    li.title = new Date().toLocaleString();
    li.innerHTML = "&lt;" + user_li.innerHTML + "&gt; " + data;
    
    if (userid === "self") {
        li.style.color = "#adff2f";
    } else {
        _notification(li.innerHTML);
    }
    
    discuss_element.appendChild(li);
    
    detached_dialog = WUI_Dialog.getDetachedDialog(_discuss_dialog_id);
    if (detached_dialog) {
        detached_discuss_element = detached_dialog.document.getElementById("fs_discuss");
        
        detached_discuss_element.appendChild(li.cloneNode(true));
        detached_discuss_element.scrollTop = detached_discuss_element.scrollHeight;
    }
    
    discuss_element.scrollTop = discuss_element.scrollHeight;
};

/***********************************************************
    Init.
************************************************************/

_right_dialog = WUI_Dialog.create(_discuss_dialog_id, {    
    title: "Chat - Session '" + _getSessionName() + "'",
    width: "600px",
    height: "300px",
    halign: "right",
    valign: "bottom",
    
    open: false,
    
    closable: true,
    draggable: true,
    minimizable: true,
    resizable: true,
    detachable: true,
    
    min_width: 300,
    min_height: 200,
        
    header_btn: [
        {
            title: "Help",
            on_click: function () {
                window.open(_documentation_link + "#subsec5_12"); 
            },
            class_name: "fs-help-icon"
        }
    ]
});

_setUsersList([]);

_discuss_input.addEventListener("keypress", function (e) {
        if (e.which === 13 || e.keyCode === 13) {
            if (e.target.value.length <= 0) {
                return true;
            }
            
            _sendMessage(e.target.value);
            
            e.target.value = "";
             
            return false;
        }
    
        return true;
    });