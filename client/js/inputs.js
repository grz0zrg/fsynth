/* jslint browser: true */

/***********************************************************
    Functions.
************************************************************/

var _createChannelSettingsDialog = function (input_channel_id) {
    var dialog_element = document.createElement("div"),
        content_element = document.createElement("div"),
        
        fragment_input_channel = _fragment_input_data[input_channel_id],
        
        channel_filter_select,
        channel_wrap_s_select,
        channel_wrap_t_select,
        channel_vflip,
    
        channel_settings_dialog,
        
        tex_parameter,
        
        power_of_two_wrap_options = '<option value="repeat">repeat</option>' +
                                    '<option value="mirror">mirrored repeat</option>';
    
    dialog_element.id = "fs_channel_settings_dialog";
    
    if (!_gl2) { // WebGL 2 does not have those limitations
        if (!_isPowerOf2(fragment_input_channel.image.width) || !_isPowerOf2(fragment_input_channel.image.height) || fragment_input_channel.type === 1) {
            power_of_two_wrap_options = "";
        }
    }
    
    dialog_element.style.fontSize = "13px";
    
    // create setting widgets
    content_element.innerHTML = '&nbsp;&nbsp;<div><div class="fs-input-settings-label">Filter:</div>&nbsp;<select id="fs_channel_filter" class="fs-btn">' +
                                '<option value="nearest">nearest</option>' +
                                '<option value="linear">linear</option>' +
                                '</select></div>' +
                                '<div><div class="fs-input-settings-label">Wrap S:</div>&nbsp;<select id="fs_channel_wrap_s" class="fs-btn">' +
                                '<option value="clamp">clamp</option>' +
                                    power_of_two_wrap_options +
                                '</select></div>' +
                                '<div><div class="fs-input-settings-label">Wrap T:</div>&nbsp;<select id="fs_channel_wrap_t" class="fs-btn">' +
                                '<option value="clamp">clamp</option>' +
                                    power_of_two_wrap_options +
                                '</select></div>' +
                                '&nbsp;&nbsp;<div><label><div class="fs-input-settings-label">VFlip:</div>&nbsp;<input id="fs_channel_vflip" value="No" type="checkbox"></label></div>';
    
    dialog_element.appendChild(content_element);
    
    document.body.appendChild(dialog_element);
    
    channel_filter_select = document.getElementById("fs_channel_filter");
    channel_wrap_s_select = document.getElementById("fs_channel_wrap_s");
    channel_wrap_t_select = document.getElementById("fs_channel_wrap_t");
    channel_vflip = document.getElementById("fs_channel_vflip");
    
    _gl.bindTexture(_gl.TEXTURE_2D, fragment_input_channel.texture);
    
    if (_gl.getTexParameter(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER) === _gl.NEAREST) {
        channel_filter_select.value = "nearest";
    }
    
    tex_parameter = _gl.getTexParameter(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S);
    
    if (tex_parameter === _gl.CLAMP_TO_EDGE) {
        channel_wrap_s_select.value = "clamp";
    } else if (tex_parameter === _gl.REPEAT) {
        channel_wrap_s_select.value = "repeat";
    } else if (tex_parameter === _gl.MIRRORED_REPEAT) {
        channel_wrap_s_select.value = "mirror";
    }
    
    tex_parameter = _gl.getTexParameter(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T);
    
    if (tex_parameter === _gl.CLAMP_TO_EDGE) {
        channel_wrap_t_select.value = "clamp";
    } else if (tex_parameter === _gl.REPEAT) {
        channel_wrap_t_select.value = "repeat";
    } else if (tex_parameter === _gl.MIRRORED_REPEAT) {
        channel_wrap_t_select.value = "mirror";
    }
    
    if (fragment_input_channel.flip) {
        channel_vflip.checked = true;
    } else {
        channel_vflip.checked = false;
    }
    
    if (fragment_input_channel.type === 1) {
        _flipYTexture(fragment_input_channel.texture, fragment_input_channel.flip);
    }
    
    channel_filter_select.addEventListener("change", function () {
            _setTextureFilter(fragment_input_channel.texture, this.value);
        });
    
    channel_wrap_s_select.addEventListener("change", function () {
            _setTextureWrapS(fragment_input_channel.texture, this.value);
        });
    
    channel_wrap_t_select.addEventListener("change", function () {
            _setTextureWrapT(fragment_input_channel.texture, this.value);
        });
    
    channel_vflip.addEventListener("change", function () {
            if (fragment_input_channel.type === 1) {
                if (channel_vflip.checked) {
                    _flipYTexture(fragment_input_channel.texture, true);
                } else {
                    _flipYTexture(fragment_input_channel.texture, false);
                }
            } else {
                var new_texture = _flipTexture(fragment_input_channel.texture, fragment_input_channel.image);
        
                fragment_input_channel.texture = new_texture;
            }
            fragment_input_channel.flip = !fragment_input_channel.flip;
        });
    
    channel_settings_dialog = WUI_Dialog.create(dialog_element.id, {
        title: _input_channel_prefix + input_channel_id + " settings",

        width: "200px",
        height: "230px",

        halign: "center",
        valign: "center",

        open: true,
        minimized: false,

        on_close: function () {
            WUI_Dialog.destroy(channel_settings_dialog);
        },

        modal: true,
        status_bar: false,

        closable: true,
        draggable: true,
        minimizable: false,

        resizable: false,

        detachable: false,

        min_width: 200,
        min_height: 250
    });
};

var _imageProcessor = function (image_data, image_processing_done_cb) {
    var worker = new Worker("dist/worker/image_processor.min.js");

    worker.onmessage = function (e) {
        _imageProcessingDone(e.data);
    };

    worker.postMessage({ img_width: image_data.width, img_height: image_data.height, buffer: image_data.data.buffer }, [image_data.data.buffer]);
};

var _removeInputChannel = function (input_id) {
    var fragment_input_data = _fragment_input_data[input_id],
        tracks,
        i;

    _gl.deleteTexture(_fragment_input_data.texture);

    if (_fragment_input_data.type === 1) {
        _fragment_input_data.video_elem.pause();
        _fragment_input_data.video_elem.src = "";

        tracks = _fragment_input_data.media_stream.getVideoTracks();
        if (tracks) {
            tracks[0].stop();
        }
        _fragment_input_data.video_elem = null;
    }

    _fragment_input_data.splice(input_id, 1);

    for (i = 0; i < _fragment_input_data.length; i += 1) {
        fragment_input_data = _fragment_input_data[i];

        fragment_input_data.elem.title = _input_channel_prefix + i;

        fragment_input_data.elem.input_id = i;
    }

    _compile();
};

var _createInputThumb = function (input_id, image, thumb_title) {
    var dom_image = document.createElement("img");

    if (image !== undefined) {
        dom_image.src = image.src;
    }

    dom_image.title = thumb_title;

    dom_image.input_id = input_id;

    dom_image.classList.add("fs-input-thumb");

    dom_image.addEventListener("click", function (ev) {
        WUI_CircularMenu.create(
            {
                element: dom_image,

                rx: 32,
                ry: 32,

                item_width:  32,
                item_height: 32
            },
            [
                { icon: "fs-gear-icon", tooltip: "Settings",  on_click: function () {
                        _createChannelSettingsDialog(dom_image.input_id);
                    } },
                { icon: "fs-replace-icon", tooltip: "Replace",  on_click: function () {

                    } },
                { icon: "fs-cross-45-icon", tooltip: "Delete",  on_click: function () {
                        _input_panel_element.removeChild(dom_image);

                        _removeInputChannel(dom_image.input_id);
                    } },
                { icon: "fs-xyf-icon", tooltip: "View image",  on_click: function () {
                        window.open(dom_image.src);
                    } },
            ]);
        });

    _input_panel_element.appendChild(dom_image);

    return dom_image;
};

var _addFragmentInput = function (type, input) {
    var input_thumb,

        data,
        image,
        texture,
        
        video_element,

        input_id = _fragment_input_data.length;

    if (type === "image") {
        data = _create2DTexture(input, false, true);
        data.texture = _flipTexture(data.texture, data.image);

        _fragment_input_data.push({
                type: 0,
                image: data.image,
                texture: data.texture,
                flip: false,
                elem: null
            });

        input_thumb = input;

        _fragment_input_data[input_id].elem = _createInputThumb(input_id, input_thumb, _input_channel_prefix + input_id);

        _compile();
    } else if (type === "camera") {
        video_element = document.createElement('video');
        video_element.width = 320;
        video_element.height = 240;
        video_element.autoplay = true;
        video_element.loop = true;
        video_element.stream = null;

        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia  || navigator.msGetUserMedia || navigator.oGetUserMedia;

        if (navigator.getUserMedia) {
            navigator.getUserMedia({ video: { mandatory: { minWidth: 640, maxWidth: 1280, minHeight: 480, maxHeight: 720, minFrameRate: 30 }, optional: [ { minFrameRate: 60 } ] },
                audio: false }, function (media_stream) {
                    video_element.src = window.URL.createObjectURL(media_stream);

                    data = _create2DTexture(video_element, false, false);

                    _setTextureWrapS(data.texture, "clamp");
                    _setTextureWrapT(data.texture, "clamp");

                    _fragment_input_data.push({
                            type: 1,
                            image: data.image,
                            texture: data.texture,
                            video_elem: video_element,
                            flip: true,
                            elem: null,
                            media_stream: media_stream
                        });

                    _fragment_input_data[input_id].elem = _createInputThumb(input_id, { src: "data/ui-icons/camera.png"}, _input_channel_prefix + input_id);

                    _compile();
                }, function (e) {
                    _notification("Unable to capture WebCam.");
                });
        } else {
            _notification("Cannot capture audio/video, getUserMedia function is not supported by your browser.");
        }
    }
};