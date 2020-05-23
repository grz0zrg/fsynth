/* jslint browser: true */


/***********************************************************
    Fields.
************************************************************/

/***********************************************************
    Functions.
************************************************************/

var _updateWorkView = function () {
    var explorer = document.getElementById("fs_explorer"),
        //nodegraph_element = document.getElementById("fs_nodegraph"),
        mid_panel = document.getElementById("fs_middle_panel"),

        mid_panel_offset = _getElementOffset(mid_panel),

        computed_height =  (window.innerHeight - (mid_panel_offset.top + mid_panel_offset.height)) + "px";
    
    explorer.style.height = computed_height;
    //nodegraph_element.style.height = computed_height;

    var i = 0;
    for (i = 0; i < _code_editors.length; i += 1) {
        _code_editors[i].container.style.height = computed_height;
        _code_editors[i].editor.refresh();
    }
/*
    if (nodegraph_element.style.display !== "none") {
        _lgraph_canvas.resize();
    }
*/
};

var _workspaceClearSelection = function () {
    var i = 0;
    var active_items = document.getElementsByClassName("fs-workspace-item-active");

    for (i = 0; i < active_items.length; i += 1) {
        active_items[i].classList.remove("fs-workspace-item-active");
    }

    //document.getElementById("fs_nodegraph").style.display = "none";
    document.getElementById("fs_code").style.display = "none";
    //document.getElementById("fs_buffer_code").style.display = "none";
    document.getElementById("fs_library_code").style.display = "none";
    document.getElementById("fs_example_code").style.display = "none";
};

var _isWorkspaceActive = function (id) {
    var active_items = document.getElementsByClassName("fs-workspace-item-active");

    return (active_items[0].id === id);
};

var _showWorkspace = function (target, i) {
    return function () {
        _workspaceClearSelection();

        if (target === "fs-workspace-item") {
            if (i === 0) {
                document.getElementById("fs_code").style.display = "";
                document.getElementById("fs_code_target").classList.add("fs-workspace-item-active");

                _current_code_editor = _code_editors[i];
            } else if (i === 1) {
                document.getElementById("fs_library_code").style.display = "";
                document.getElementById("fs_library_target").classList.add("fs-workspace-item-active");

                _current_code_editor = _code_editors[i];
            }
        } else if (target === "fs-workspace-example-item") {
            var rootElement = document.getElementById("fs_examples_target");

            rootElement.children[i].classList.add("fs-workspace-item-active");

            document.getElementById("fs_example_code").style.display = "";

            // assign example code to editor code

            _current_code_editor = _code_editors[i];
        }

        _updateWorkView();
    };
};

var _toggleReduce = function (ev) {
    var content = this.parentElement.nextElementSibling;

    if (content.style.display === "none") {
        content.style.display = "";
        this.textContent = "-";
    } else {
        content.style.display = "none";
        this.textContent = "+";
    }
};

/***********************************************************
    Init.
************************************************************/

var _initWorkspace = function () {
    var i = 0,
        element;

    var workspace_items = document.getElementsByClassName("fs-workspace-item");

    for (i = 0; i < workspace_items.length; i += 1) {
        element = workspace_items[i];
        element.addEventListener("click", _showWorkspace("fs-workspace-item", i));
    }

    var workspace_example_items = document.getElementsByClassName("fs-workspace-example-item");

    for (i = 0; i < workspace_example_items.length; i += 1) {
        element = workspace_example_items[i];
        element.addEventListener("click", _showWorkspace("fs-workspace-example-item", i));
    }

    var workspace_reduce_btn = document.getElementsByClassName("fs-workspace-reduce-btn");

    for (i = 0; i < workspace_reduce_btn.length; i += 1) {
        element = workspace_reduce_btn[i];
        element.addEventListener("click", _toggleReduce);
    }
}