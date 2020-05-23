/* jslint browser: true */

// UX helper / guide / tour

/***********************************************************
    Fields.
************************************************************/

var _ux_helper_overlay = new PlainOverlay(),
    _ux_helper_anchor = null,
    _ux_helper_scenario = null,
    _ux_helper_end_infos = {
        content: "Not enough informations ?",
        sub_content: [
            'The help dialog (?) has many useful helpers / informations',
            'Fragment full documentation is available <a target="_blank" class="fs-link" href="https://www.fsynth.com/documentation">here</a>',
            'Fragment forum is available <a target="_blank" class="fs-link" href="https://quiet.fsynth.com">here</a>'
        ]
    },
    _ux_helper_quickstart_scenario = [
        {
            style: "font-size: 19pt; color: white; margin: 4px; padding: 4px; text-align: center;",
            content: "Quickstart",
            sub_content: [
                "This will show you the interface layout and how to start playing sounds"
            ]
        },
        {
            content: "The top bar contain various informations including master gain level",
            target: "fs_top_panel",
            leaderline: {
                endSocket: "bottom"
            }
        },
        {
            content: "Canvas (generated visual content)",
            target: "canvas_container",
            point_anchor: true
        },
        {
            content: "Main toolbar",
            target: "fs_middle_toolbar",
            point_anchor: true
        },
        {
            content: "Data / inputs (images, videos, etc.)",
            sub_content: [
                "Content must be added with the import dialog (last toolbar button)"
            ],
            target: "fs_input_panel",
            point_anchor: true
        },
        {
            content: "Fragment / GLSL code editor",
            sub_content: [
                'This is where you type <a target="_blank" class="fs-link" href="https://en.wikipedia.org/wiki/OpenGL_Shading_Language">GLSL</a> code to produce visual / sound content'
            ],
            target: "fs_code",
            point_anchor: true
        },
        {
            content: "Right click here then click on the + button to add a slice",
            sub_content: [
                "Slices capture the pixels data which is sent to the sound synthesis engine in real-time."
            ],
            target: "canvas_container",
            point_anchor: true
        },
        {
            content: "Click here to unpause and hear the 440hz tone",
            target: "fs_tb_pause",
            point_anchor: true
        },
        _ux_helper_end_infos
    ],
    _ux_helper_ui_scenario = [
        {
            style: "font-size: 19pt; color: white; margin: 4px; padding: 4px; text-align: center;",
            content: "Data server status",
            sub_content: [
                "Collaborative features are managed by this server"
            ],
            target: "fs_sync_status",
            leaderline: {
                endSocket: "bottom"
            }
        },
        {
            content: "Server status (chat & slices)",
            sub_content: [
                "Chat and slices settings are managed by this server"
            ],
            target: "fs_server_status",
            leaderline: {
                endSocket: "bottom"
            }
        },
        {
            content: "Username",
            sub_content: [
                "Can be edited by a left click"
            ],
            target: "fs_user_name",
            leaderline: {
                endSocket: "bottom"
            }
        },
        {
            content: "Global clock",
            sub_content: [
                "Accessible in the fragment shader as <code>globalTime</code>"
            ],
            target: "fs_time_infos",
            point_anchor: true
        },
        {
            content: "Master gain level",
            target: "mst_slider",
            leaderline: {
                endSocket: "bottom"
            }
        },
        {
            content: "Canvas (generated visual content)",
            sub_content: [
                "Right click to add a slice",
                "Double click to open slices panel"
            ],
            target: "canvas_container",
            point_anchor: true
        },
        {
            content: "Main toolbar",
            target: "fs_middle_toolbar",
            point_anchor: true
        },
        {
            content: "Data / inputs (images, videos, etc.)",
            sub_content: [
                "Bitmaps / texture accessible as iInput0, iInput1 etc. (in order of appearance)",
                "Inputs can be reordered in realtime by a drag and drop",
                "Click on an input to open its action menu",
                "Some data / inputs have a shortcut accessible by a right click"
            ],
            target: "fs_input_panel",
            point_anchor: true
        },
        {
            content: "Fragment / GLSL code editor",
            sub_content: [
                "This is where you type to produce visual / sound content"
            ],
            target: "fs_code",
            point_anchor: true
        },
        _ux_helper_end_infos
    ],
    _ux_helper_step = -1,
    _ux_helper_current_line = null,
    _ux_helper_help_overlay = null;

/***********************************************************
    Functions.
************************************************************/

var _startUXHelper = function (scenario) {
    _ux_helper_scenario = scenario;

    WUI_Dialog.closeAll();

    // create anchor points
    _ux_helper_anchor = document.createElement("div");

    // create overlay and attach anchor on top
    _ux_helper_overlay.setOptions({
        face: _ux_helper_anchor,
        style: {
            backgroundColor: 'rgba(16, 16, 16, 0.3)',
            cursor: 'pointer',
            zIndex: 9000
        }
    });

    _ux_helper_overlay.show();

    _nextUXHelper();

    document.getElementsByClassName("plainoverlay")[0].addEventListener("click", _nextUXHelper);

    _ux_helper_help_overlay = document.createElement("div");
    _ux_helper_help_overlay.style = "position: absolute; bottom: 14px; width: 100%; text-align: center; font-size: 13pt; z-index: 900000; color: white";
    _ux_helper_help_overlay.innerHTML = "click to continue";
    document.body.appendChild(_ux_helper_help_overlay);
};

var _stopUXHelper = function () {
    _ux_helper_overlay.hide();

    _ux_helper_step = -1;

    document.body.removeChild(_ux_helper_help_overlay);

    _ux_helper_scenario = null;
};

var _nextUXHelper = function () {
    if (_ux_helper_overlay.state === PlainOverlay.STATE_HIDDEN ||
        _ux_helper_overlay.state === PlainOverlay.STATE_HIDING) {
        return;
    }

    if (_ux_helper_current_line) {
        _ux_helper_current_line.remove();
        _ux_helper_current_line = null;
    }

    _ux_helper_step += 1;

    if (_ux_helper_step >= _ux_helper_scenario.length) {
        _stopUXHelper();

        return;
    }

    var step_data = _ux_helper_scenario[_ux_helper_step];

    if (step_data.style) {
        _ux_helper_anchor.style = step_data.style;
    }

    if (step_data.content) {
        _ux_helper_anchor.innerHTML = step_data.content;
    }

    if (step_data.sub_content) {
        var sub_content_html = step_data.sub_content.map(function (content, index) {
            if (index) {
                return '<div style="font-size: 11pt;">' + content + '</div>';
            } else {
                return '<div style="font-size: 11pt; padding-top: 6px;">' + content + '</div>';
            }
        }).join("");
        _ux_helper_anchor.innerHTML += sub_content_html;
    }

    if (step_data.target) {
        var leaderline_options = {
            //animOptions: { duration: 400, timing: [0.58, 0, 0.42, 1] },
            startPlug: 'behind',
            endPlug: 'arrow1',
            startPlugSize: 1,
            endPlugSize: 1,
            color: 'white',
            endPlugColor: 'white'/*,
            startSocketGravity: 400,
            gradient: {
                startColor: 'white',
                endColor: 'green'
            }*/
        };

        if (step_data.leaderline) {
            if (step_data.leaderline.endSocket) {
                leaderline_options["endSocket"] = step_data.leaderline.endSocket;
            }
        }

        var target_elem = document.getElementById(step_data.target);
        if (step_data.point_anchor) {
            target_elem = LeaderLine.pointAnchor(target_elem);
        }

        _ux_helper_current_line = new LeaderLine(_ux_helper_anchor, target_elem, leaderline_options);
    }
};

/***********************************************************
    Init.
************************************************************/

document.body.addEventListener("keydown", function (evt) {
    if (evt.key === 'Escape' && _ux_helper_step !== -1) {
        _stopUXHelper();
    }
});

document.getElementById("fs_ux_tour").addEventListener("click", function () {
    _startUXHelper(_ux_helper_ui_scenario);
});

document.getElementById("fs_quickstart_tour").addEventListener("click", function () {
    _startUXHelper(_ux_helper_quickstart_scenario);
});