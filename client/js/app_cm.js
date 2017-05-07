/**
    Pack CodeMirror and its dependencies into a single file
*/

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

window.onload = function() {
    var new_editor_element = document.body.getElementsByClassName("fs-editor"),
        new_editor;
    if (new_editor_element.length > 0) {
        new_editor_element = new_editor_element[0];
    }

    new_editor = new CodeMirror(new_editor_element, window.opener.gb_code_editor_settings);
    new_editor.setOption("theme", window.opener.gb_code_editor_theme);
    new_editor.setValue(window.opener.gb_code_editor.getValue());

    synced_cm_document = window.opener.gb_code_editor.getDoc();

    new_editor.swapDoc(synced_cm_document.linkedDoc({
            sharedHist: true
        }));

    window.addEventListener("load", function () {
            new_editor.refresh();
        }, false);
    window.addEventListener("resize", function () {
            new_editor.refresh();
        }, false);
    
    window.cm = new_editor;
};