var WUI_CircularMenu=new function(){"use strict";var a=[],b=0,c={item:"wui-circularmenu-item",show:"wui-circularmenu-show"},d={x:null,y:null,rx:64,ry:48,angle:0,item_width:32,item_height:32,window:null,element:null},e=function(b){var c,d;for(d=0;a.length>d;d+=1)c=a[d],b.body.removeChild(c);a=[]},f=function(a,b,c){var d=function(a){a.preventDefault(),c(),e(b)};return d},g=function(a,d){var f=function(g){g.preventDefault();var h=(new Date).getTime();500>=h-b||g.target.classList.contains(c.item)||(e(d),a.removeEventListener("click",f),a.removeEventListener("mousedown",f))};return f},h=function(a){var b=a.getBoundingClientRect(),c=document.body,d=document.documentElement,e=window.pageYOffset||d.scrollTop||c.scrollTop,f=window.pageXOffset||d.scrollLeft||c.scrollLeft,g=d.clientTop||c.clientTop||0,h=d.clientLeft||c.clientLeft||0,i=b.top+e-g,j=b.left+f-h;return{top:Math.round(i),left:Math.round(j),width:b.width,height:b.height}},i=function(a){return a*(Math.PI/180)},j=function(d,h,j,k,l,m){e(k);var n,o,p,q,r=-(Math.PI/2)+i(d.angle),s=h.length,t=2*Math.PI/s;for(p=0;s>p;p+=1)o=h[p],n=document.createElement("div"),n.classList.add(c.item),n.style.width=d.item_width+"px",n.style.height=d.item_height+"px",n.style.backgroundSize=d.item_width-4+"px "+(d.item_height-4)+"px",n.style.left=l+d.rx*Math.cos(r)+"px",n.style.top=m+d.ry*Math.sin(r)+"px",n.classList.add(o.icon),o.tooltip&&(n.title=o.tooltip),k.body.appendChild(n),j.getComputedStyle(n).width,a.push(n),o.on_click&&n.addEventListener("click",f(j,k,o.on_click)),n.classList.add(c.show),r+=t;q=g(j,k),j.addEventListener("click",q),b=(new Date).getTime(),j.addEventListener("mousedown",q)};this.create=function(a,b){var c,e,f,g,i,k={},l=document,m=window;for(c in d)d.hasOwnProperty(c)&&(k[c]=d[c]);if(void 0!==a)for(c in a)a.hasOwnProperty(c)&&void 0!==d[c]&&(k[c]=a[c]);g=k.element,null!==g?(i=h(g),l=g.ownerDocument,m=l.defaultView||l.parentWindow,e=i.left+(i.width-k.item_width)/2,f=i.top+(i.height-k.item_height)/2,j(k,b,m,l,e,f)):null!==e&&null!==f&&(null!==k.window&&(m=k.window,l=m.document),e=k.x-k.item_width/2,f=k.y-k.item_height/2,j(k,b,m,l,e,f))}};
(function(funcName, baseObj) {
    "use strict";
    // The public function name defaults to window.docReady
    // but you can modify the last line of this function to pass in a different object or method name
    // if you want to put them in a different namespace and those will be used instead of 
    // window.docReady(...)
    funcName = funcName || "docReady";
    baseObj = baseObj || window;
    var readyList = [];
    var readyFired = false;
    var readyEventHandlersInstalled = false;
    
    // call this when the document is ready
    // this function protects itself against being called more than once
    function ready() {
        if (!readyFired) {
            // this must be set to true before we start calling callbacks
            readyFired = true;
            for (var i = 0; i < readyList.length; i++) {
                // if a callback here happens to add new ready handlers,
                // the docReady() function will see that it already fired
                // and will schedule the callback to run right after
                // this event loop finishes so all handlers will still execute
                // in order and no new ones will be added to the readyList
                // while we are processing the list
                readyList[i].fn.call(window, readyList[i].ctx);
            }
            // allow any closures held by these functions to free
            readyList = [];
        }
    }
    
    function readyStateChange() {
        if ( document.readyState === "complete" ) {
            ready();
        }
    }
    
    // This is the one public interface
    // docReady(fn, context);
    // the context argument is optional - if present, it will be passed
    // as an argument to the callback
    baseObj[funcName] = function(callback, context) {
        // if ready has already fired, then just schedule the callback
        // to fire asynchronously, but right away
        if (readyFired) {
            setTimeout(function() {callback(context);}, 1);
            return;
        } else {
            // add the function and context to the list
            readyList.push({fn: callback, ctx: context});
        }
        // if document already ready to go, schedule the ready function to run
        // IE only safe when readyState is "complete", others safe when readyState is "interactive"
        if (document.readyState === "complete" || (!document.attachEvent && document.readyState === "interactive")) {
            setTimeout(ready, 1);
        } else if (!readyEventHandlersInstalled) {
            // otherwise if we don't have event handlers installed, install them
            if (document.addEventListener) {
                // first choice is DOMContentLoaded event
                document.addEventListener("DOMContentLoaded", ready, false);
                // backup is window load event
                window.addEventListener("load", ready, false);
            } else {
                // must be IE
                document.attachEvent("onreadystatechange", readyStateChange);
                window.attachEvent("onload", ready);
            }
            readyEventHandlersInstalled = true;
        }
    }
})("docReady", window);
// modify this previous line to pass in your own method name 
// and object for the method to be attached to
var _fp_main = function (join_cb) {
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
            if (join_cb) {
                return;
            }
        
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
            if (join_cb) {
                join_cb(name);
            } else {
                _setSession(name);

                location.href = "app/" + name;
            }
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
        if (!join_cb) {
            _user_about_element.innerHTML = _welcome_message + '<span class="fp-user-name">' + _user_name + '</span>';
        }
        
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
        
            if (join_cb) {
                join_cb(name);
            }
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
};
docReady(_fp_main);