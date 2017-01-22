/*#include WUI_CircularMenu/wui_circular_menu.min.js*/

/*#include docReady/docready.js*/

docReady(function() {
    var _welcome_message = 'Welcome back ',
        _user_name_ls_key = 'fs-user-name',
        _session_list_ls_key = 'fs-session-list',
    
        _user_name_element = document.getElementById("userName"),
        _session_name_element = document.getElementById("sessionName"),
        _session_btn_element = document.getElementById("sessionBtn"),
        _session_list_element = document.getElementById("sessionList"),
        _user_about_element = document.getElementById("userIntro"),
        _clear_sessions_btn_element = document.getElementById("clearSessionsBtn"),
        _browser_compatibility_element = document.getElementById("browserCompatibility"),
        _sessions_element = document.getElementById("sessions"),
        
        _session_list_str = localStorage.getItem(_session_list_ls_key),
        
        _user_name = localStorage.getItem(_user_name_ls_key);
    
    var _removeSessionTable = function (element) {
        var session_table_element = element.parentElement;
        
        session_table_element.parentElement.removeChild(session_table_element);
        
        _clear_sessions_btn_element.parentElement.removeChild(_clear_sessions_btn_element);
    };
    
    var _removeSessions = function (element) {
        element.innerHTML = "";
        
        localStorage.removeItem(_session_list_ls_key);
    };
    
    var _getSessionName = function () {
        if (_session_name_element.value === "") {
            return _session_name_element.placeholder;
        } else {
            return _session_name_element.value;
        }  
    };
    
    var _getUserName = function () {
        if (_user_name_element.value === "") {
            return _user_name_element.placeholder;
        } else {
            return _user_name_element.value;
        }  
    };

    var _setSession = function (name) {
            if (name.length > 128) { // TODO : Handle notification about session validation
                return;
            }
        
            _session_btn_element.href = "app/" + name;
        };
    
    var _isCompatibleBrowser = function () {
        // check browser compatibility
    };
    
    var _joinSessionFn = function (name) {
        return (function () {
            _setSession(name);

            location.href = "app/" + name;
        });
    };
    
    var _deleteSessionFn = function (col_element, name) {
        return (function () {
            var session_list_str = localStorage.getItem(_session_list_ls_key),
                session_list = [],
                i = 0,
                
                row = col_element.parentElement;
            
            row.parentElement.removeChild(row);

            if (session_list_str) {
                session_list = JSON.parse(session_list_str);
            }
        
            for (i = 0; i < session_list.length; i += 1) {
                if (session_list[i] === name) {
                    session_list.splice(i, 1)
                    break;
                }
            }
            
            if (session_list.length > 0) {
                localStorage.setItem(_session_list_ls_key, JSON.stringify(session_list));
            } else {
                _clear_sessions_btn_element.parentElement.removeChild(_clear_sessions_btn_element);
                
                localStorage.removeItem(_session_list_ls_key);
            }
            
            // delete session settings
            if (localStorage.getItem(name) !== null) {
                localStorage.removeItem(name);
            }
        });
    };
    
    var _onSessionColClick = function () {
        var session_col = this,
            
            session_name = session_col.textContent;
        
        WUI_CircularMenu.create({
                element: session_col,
            
                angle: 90
            },
            [
                { icon: "fp-join-icon", tooltip: "Join session",  on_click: _joinSessionFn(session_name) },
                { icon: "fp-trash-icon", tooltip: "Delete session",  on_click: _deleteSessionFn(session_col, session_name) }
            ]);
    };
    
    _session_name_element.placeholder = Math.random().toString(36).substr(2, 12);

    _setSession(_session_name_element.placeholder);
    
    if (_user_name) {
        _user_about_element.innerHTML = _welcome_message + '<span class="fp-user-name">' + _user_name + '</span>';
        
        _user_name_element.value = _user_name;
    } else {
        _sessions_element.parentElement.removeChild(_sessions_element);
    }
    
    _user_name_element.addEventListener("change", function() {
            localStorage.setItem(_user_name_ls_key, _getUserName());
        });
    
    _session_name_element.addEventListener("change", function() {
            _setSession(_session_name_element.value);
        });
    
    _clear_sessions_btn_element.addEventListener("click", function () {
            _removeSessions(_session_list_element);
        
            _clear_sessions_btn_element.parentElement.removeChild(_clear_sessions_btn_element);
        });
    
    _session_btn_element.addEventListener("click", function (e) {
            var session_list_str = localStorage.getItem(_session_list_ls_key),
                session_list = [],
                session_name = _getSessionName(),
                i = 0;

            if (session_list_str) {
                session_list = JSON.parse(session_list_str);
            }
        
            for (i = 0; i < session_list.length; i += 1) {
                if (session_list[i] === session_name) {
                    session_list.splice(i, 1)
                    break;
                }
            }
        
            session_list.push(session_name);
        
            localStorage.setItem(_session_list_ls_key, JSON.stringify(session_list));
        
            localStorage.setItem(_user_name_ls_key, _getUserName());
        });
    
    if (_session_list_str) {
        var session_list = JSON.parse(_session_list_str),
            row, col, btn,
            i = 0;

        for (i = 0; i < session_list.length; i += 1) {
            row = document.createElement("tr");
            col = document.createElement("td");
            
            _session_list_element.insertBefore(row, _session_list_element.firstChild);
            
            col.innerHTML = session_list[i];
            
            col.addEventListener("click", _onSessionColClick);
            
            row.appendChild(col);
        }
    } else {
        _clear_sessions_btn_element.parentElement.removeChild(_clear_sessions_btn_element);
        //_removeSessionTable(_session_list_element);
    }
});