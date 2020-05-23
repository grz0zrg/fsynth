/* jslint browser: true */

/* global CodeMirror, performance*/

/**
    Fragment external editor built on CodeMirror
    
    This was made so that typing in the editor does not interrupt any of the audio/visuals stuff.
    
    This editor communicate directly with the collaborative editing backend built around ShareDB, update are then sent to the client.
*/

// CodeMirror - https://codemirror.net/
/*#include codemirror/codemirror.js*/
/*#include codemirror/addon/search/searchcursor.js*/
/*#include codemirror/addon/search/match-highlighter.js*/
/*#include codemirror/addon/search/matchesonscrollbar.js*/
/*#include codemirror/addon/edit/closebrackets.js*/
/*#include codemirror/addon/edit/matchbrackets.js*/
/*#include codemirror/addon/scroll/simplescrollbars.js*/
/*#include codemirror/addon/scroll/annotatescrollbar.js*/
/*#include codemirror/addon/selection/active-line.js*/
/*#include codemirror/codemirror_glsl.js*/

// sharedb - https://github.com/share/sharedb
/*#include sharedb/sharedb.js*/
/*#include sharedb/ot-text.js*/

window.onload = function() {
    "use strict";

    /***********************************************************
        Globals.
    ************************************************************/

    var _getUrlParameters = function () {
        var search = location.search.substring(1);
        return JSON.parse('{"' + search.replace(/&/g, '","').replace(/=/g,'":"') + '"}', function(key, value) { return key===""?value:decodeURIComponent(value) });
    };
    
    var _getSessionName = function () {
        var url_parts;
        
        url_parts = window.location.pathname.split('/');

        return url_parts[url_parts.length - 2];
    };

    var _getTargetName = function () {
        var url_parts;
        
        url_parts = window.location.pathname.split('/');

        return url_parts[url_parts.length - 1];
    };
    
    var _code_editor = null,
        _code_editor_settings = {
            value: "",
            theme: "seti",
            matchBrackets: true,
            //autoCloseBrackets: true,
            lineNumbers: true,
            styleActiveLine: true,
            scrollbarStyle: "native",
            mode: "text/x-glsl",
            extraKeys: {
                "F11": function (cm) {
                    cm.setOption("fullScreen", !cm.getOption("fullScreen"));
                },
                "Esc": function (cm) {
                    if (cm.getOption("fullScreen")) {
                        cm.setOption("fullScreen", false);
                    }
                }
            }
        };
    
    /***********************************************************
        Fields.
    ************************************************************/

    var _urlParameters = _getUrlParameters();
    
    /***********************************************************
        App. Includes.
    ************************************************************/

    /*#include config.js*/
    /*#include network.js*/
    
    /***********************************************************
        Functions.
    ************************************************************/
    
    
    
    /***********************************************************
        Init.
    ************************************************************/
    
    _code_editor = new CodeMirror(document.getElementById("ed"), _code_editor_settings);
    _code_editor.setValue(document.getElementById("fragment-shader").text);

    CodeMirror.on(_code_editor, 'changes', function (instance, changes) {
        _shareCodeEditorChanges(changes);
    });

    window.addEventListener("load", function () {
            _code_editor.refresh();
        }, false);
    window.addEventListener("resize", function () {
            _code_editor.refresh();
        }, false);
    
    _initNetwork();
};