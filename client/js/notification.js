/* jslint browser: true */


/*
    Simple double notifications system
    
    This show notification messages in corners of the score area,
    generic notifications can be stacked and a duration can be set,
    fail notification is used for notifications that should not disappear and should be solved (aka, GLSL compilation failed),
    fail notification is always shown in the left corner, if a generic notification is shown at the same time, it will go to the right corner,
    there is also the utter fail notification which is just used for critical, app. breaking stuff...
*/

/***********************************************************
    Fields.
************************************************************/

var _utter_fail_element = document.getElementById("fs_utter_fail"),
    _fail_element = document.getElementById("fail"),
    _notification_element = document.getElementById("fs_notification");

/***********************************************************
    Functions.
************************************************************/

var _fail = function (message, utter) {
    if (message instanceof Element) {
        _fail_element.innerHTML = "";
        _fail_element.appendChild(message);
        
        if (_notification_element.innerHTML !== "") {
            _notification_element.classList.add("fs-text-align-right");
        }
    } else {
        _fail_element.innerHTML = message;
    }
    
    if (utter) {
        document.body.innerHTML = "";
        
        _utter_fail_element.innerHTML = '<a href="https://www.fsynth.com"><img src="data/fsynth2.png" width="397"/></a>' + message;
        
        document.body.appendChild(_utter_fail_element);
    }
};

var _utterFailRemove = function () {
    _utter_fail_element.parentElement.removeChild(_utter_fail_element);
    
    _utter_fail_element = null;
};

var _removeNotification = function (notification_div) {
    return function () {
        notification_div.parentElement.removeChild(notification_div);
    };
};

var _hideNotification = function (notification_div) {
    return function () {
        notification_div.classList.add("fs-opacity-transition");
        notification_div.classList.add("fs-transparent");
        
        window.setTimeout(_removeNotification(notification_div), 2000);
    };
};

var _notification = function (message, duration_ms) {
    var notification_div = document.createElement('div');
    
    notification_div.innerHTML = message;
    
    if (duration_ms === undefined) {
        duration_ms = 1500;
    }
    
    if (_fail_element.innerHTML !== "") {
        notification_div.classList.add("fs-text-align-right");
    }
    
    _notification_element.appendChild(notification_div);

    window.setTimeout(_hideNotification(notification_div), duration_ms);
};

/***********************************************************
    Init.
************************************************************/

_utter_fail_element.innerHTML = "";