/* jslint browser: true */

/**
 * Manage all Fragment inputs.
 */

/***********************************************************
    Fields.
************************************************************/

var _dragged_input = null,

    _selected_input_canvas = null;

/***********************************************************
    Functions.
************************************************************/

var _cbChannelSettingsClose = function (input_channel_id) {
    return function () {
        WUI_RangeSlider.destroy("fs_channel_settings_playrate"+input_channel_id);
        WUI_RangeSlider.destroy("fs_channel_settings_videostart"+input_channel_id);
        WUI_RangeSlider.destroy("fs_channel_settings_videoend"+input_channel_id);
        WUI_Dialog.destroy("fs_channel_settings_dialog"+input_channel_id);
    };
};

var _cbChannelSettingsChange = function (fic, ficd, cb) {
    return function (value) {
        cb(value, fic, ficd, this);
    };
};

var _createChannelSettingsDialog = function (input_channel_id) {
    var dialog_element = document.createElement("div"),
        content_element = document.createElement("div"),
        
        video_playrate_element = "fs_channel_settings_playrate"+input_channel_id,
        video_start_element = "fs_channel_settings_videostart"+input_channel_id,
        video_end_element = "fs_channel_settings_videoend"+input_channel_id,
        
        fragment_input_channel = _fragment_input_data[input_channel_id],
        
        channel_filter_select,
        channel_wrap_s_select,
        channel_wrap_t_select,
        channel_vflip,
        channel_sloop,
    
        channel_settings_dialog,
        
        dialog_height = "200px",

        vflip_style = "",
        
        tex_parameter,
        
        power_of_two_wrap_options = '<option value="repeat">repeat</option>' +
                                    '<option value="mirror">mirrored repeat</option>',
        
        mipmap_option = '<option value="mipmap">mipmap</option>';
    
    dialog_element.id = "fs_channel_settings_dialog" + input_channel_id;
    
    if (document.getElementById(dialog_element.id)) {
        return;
    }
    
    if (!_gl2) { // WebGL 2 does not have those limitations
        if (!_isPowerOf2(fragment_input_channel.image.width) || 
            !_isPowerOf2(fragment_input_channel.image.height) || 
            fragment_input_channel.type === 1 || 
            fragment_input_channel.type === 3) {
            power_of_two_wrap_options = "";
            mipmap_option = "";
        }
    }

    if (fragment_input_channel.type === 1 ||
        fragment_input_channel.type === 3 ||
        fragment_input_channel.type === 404) {
        vflip_style = "display: none";
    }
    
    dialog_element.style.fontSize = "13px";
    
    // create setting widgets
    content_element.innerHTML = '<div><div class="fs-input-settings-label">Filter:</div>&nbsp;<select id="fs_channel_filter' + input_channel_id + '" class="fs-btn">' +
                                '<option value="nearest">nearest</option>' +
                                '<option value="linear">linear</option>' +
                                    mipmap_option +
                                '</select></div>' +
                                '<div><div class="fs-input-settings-label">Wrap S:</div>&nbsp;<select id="fs_channel_wrap_s' + input_channel_id + '" class="fs-btn">' +
                                '<option value="clamp">clamp</option>' +
                                    power_of_two_wrap_options +
                                '</select></div>' +
                                '<div><div class="fs-input-settings-label">Wrap T:</div>&nbsp;<select id="fs_channel_wrap_t' + input_channel_id + '" class="fs-btn">' +
                                '<option value="clamp">clamp</option>' +
                                    power_of_two_wrap_options +
                                '</select></div>' +
                                '&nbsp;<div style="' + vflip_style + '"><label><div class="fs-input-settings-label">VFlip:</div>&nbsp;<input id="fs_channel_vflip' + input_channel_id + '" value="No" type="checkbox"></label></div>';
    
    dialog_element.appendChild(content_element);
    
    document.body.appendChild(dialog_element);

    channel_filter_select = document.getElementById("fs_channel_filter"+input_channel_id);
    channel_wrap_s_select = document.getElementById("fs_channel_wrap_s"+input_channel_id);
    channel_wrap_t_select = document.getElementById("fs_channel_wrap_t"+input_channel_id);
    channel_vflip = document.getElementById("fs_channel_vflip"+input_channel_id);
    
    if (fragment_input_channel.type === 3) {
        dialog_height = "340px";
        
        content_element.innerHTML += '&nbsp;<div><label><div class="fs-input-settings-label">Smooth:</div>&nbsp;<input id="fs_channel_sloop' + input_channel_id + '" value="No" type="checkbox"></label></div>';
        content_element.innerHTML += '&nbsp;<div id="' + video_playrate_element + '"></div><div id="' + video_start_element + '"></div><div id="' + video_end_element + '"></div>';
        
        WUI_RangeSlider.create(video_playrate_element, {
                    width: 120,
                    height: 8,

                    min: -10000.0,
                    max: 10000.0,

                    bar: false,
                    
                    midi: true,

                    step: 0.001,
                    scroll_step: 0.01,

                    default_value: fragment_input_channel.playrate,
                    value: fragment_input_channel.playrate,

                    decimals: 3,

                    title: "Playback rate",

                    title_min_width: 140,
                    value_min_width: 88,

                    on_change: _cbChannelSettingsChange(fragment_input_channel, input_channel_id, function (v, fic) {
                            fic.video_elem.playbackRate = parseFloat(v);
                            fic.playrate = parseFloat(v);
                        })
                });
        
        WUI_RangeSlider.create(video_start_element, {
                    width: 120,
                    height: 8,

                    min: 0.0,
                    max: 1.0,

                    bar: false,
                    
                    midi: true,

                    step: 0.0001,
                    scroll_step: 0.001,

                    default_value: fragment_input_channel.videostart,
                    value: fragment_input_channel.videostart,

                    decimals: 4,

                    title: "Video start",

                    title_min_width: 140,
                    value_min_width: 88,

                    on_change: _cbChannelSettingsChange(fragment_input_channel, input_channel_id, function (v, fic) {
                            var fval = parseFloat(v);
                            if (fic.videostart === fval) {
                                return;
                            }

                            fic.videostart = fval;
                            fic.video_elem.currentTime = fic.video_elem.duration * fval;
                        })
                });
        
        WUI_RangeSlider.create(video_end_element, {
                    width: 120,
                    height: 8,

                    min: 0.0,
                    max: 1.0,

                    bar: false,
                    
                    midi: true,

                    step: 0.0001,
                    scroll_step: 0.001,

                    default_value: fragment_input_channel.videoend,
                    value: fragment_input_channel.videoend,

                    decimals: 4,

                    title: "Video end",

                    title_min_width: 140,
                    value_min_width: 88,

                    on_change: _cbChannelSettingsChange(fragment_input_channel, input_channel_id, function (v, fic) {
                            fic.videoend = parseFloat(v);
                        })
                });
        
        channel_sloop = document.getElementById("fs_channel_sloop" + input_channel_id);
        
        if (fragment_input_channel.db_obj.settings.sloop) {
            channel_sloop.checked = true;
        } else {
            channel_sloop.checked = false;
        }

        channel_sloop.addEventListener("change", function () {
            fragment_input_channel.sloop = this.checked;
        });
    }
    
    _gl.bindTexture(_gl.TEXTURE_2D, fragment_input_channel.texture);
    
    if (_gl.getTexParameter(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER) === _gl.NEAREST) {
        channel_filter_select.value = "nearest";
    } else if (_gl.getTexParameter(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER) === _gl.LINEAR_MIPMAP_NEAREST) {
        channel_filter_select.value = "mipmap";
    } else if (_gl.getTexParameter(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER) === _gl.LINEAR) {
        channel_filter_select.value = "linear";
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
    
    if (fragment_input_channel.db_obj.settings.flip) {
        channel_vflip.checked = true;
    } else {
        channel_vflip.checked = false;
    }

    channel_vflip.addEventListener("change", _cbChannelSettingsChange(fragment_input_channel, input_channel_id, function (v, fic, ficd, self) {
            var new_texture;

            fic.db_obj.settings.flip = self.checked;

            if (fic.db_obj.settings.flip) {
                _flipTexture(fic.texture, fic.image, function (texture) {
                    fic.texture = texture;
                    
                        _dbUpdateInput(_parseInt10(ficd), fic.db_obj);
                    });
            } else {
                new_texture = _replace2DTexture(fic.image, fic.texture);
                fic.texture = new_texture;

                _dbUpdateInput(_parseInt10(ficd), fic.db_obj);
            }
        }));

    channel_filter_select.addEventListener("change", _cbChannelSettingsChange(fragment_input_channel, input_channel_id, function (v, fic, ficd, self) {
            _setTextureFilter(fic.texture, self.value);
        
            fic.db_obj.settings.f = self.value;
            _dbUpdateInput(_parseInt10(ficd), fic.db_obj);
        }));
    
    channel_wrap_s_select.addEventListener("change", _cbChannelSettingsChange(fragment_input_channel, input_channel_id, function (v, fic, ficd, self) {
            _setTextureWrapS(fic.texture, self.value);
        
            fic.db_obj.settings.wrap.s = self.value;
            _dbUpdateInput(_parseInt10(ficd), fic.db_obj);
        }));
    
    channel_wrap_t_select.addEventListener("change", _cbChannelSettingsChange(fragment_input_channel, input_channel_id, function (v, fic, ficd, self) {
            _setTextureWrapT(fic.texture, self.value);
        
            fic.db_obj.settings.wrap.t = self.value;
            _dbUpdateInput(_parseInt10(ficd), fic.db_obj);
        }));
    
    channel_settings_dialog = WUI_Dialog.create(dialog_element.id, {
        title: _input_channel_prefix + input_channel_id + " settings",

        width: "250px",
        height: dialog_height,

        halign: "center",
        valign: "center",

        open: true,
        minimized: false,

        on_close: _cbChannelSettingsClose(input_channel_id),

        modal: false,
        status_bar: false,

        closable: true,
        draggable: true,
        minimizable: false,

        resizable: false,

        detachable: false,

        min_width: 200,
        min_height: 250,
        
        header_btn: [
            {
                title: "Help",
                on_click: function () {
                    window.open(_documentation_link + "tutorials/import/"); 
                },
                class_name: "fs-help-icon"
            }
        ]
    });
};

var _imageProcessor = function (image_data, image_processing_done_cb) {
    var worker = new Worker("dist/worker/image_processor.min.js");

    worker.onmessage = function (e) {
        worker.terminate();
        
        image_processing_done_cb(e.data);
    };

    worker.postMessage({ img_width: image_data.width, img_height: image_data.height, buffer: image_data.data.buffer }, [image_data.data.buffer]);
};

var _cbChannelSettings = function (input_id) {
    return function (e) {
        e.preventDefault();

        _createChannelSettingsDialog(input_id);
    };
};

var _inputThumbMenu = function (e) {
    e.preventDefault();

    var input_id = _parseInt10(e.target.dataset.inputId),
        input = _fragment_input_data[input_id],
        dom_image = input.elem,
        
        items = [
            {
                icon: "fs-cross-45-icon", tooltip: "Delete", on_click: function () {
                    _input_panel_element.removeChild(dom_image);

                    _removeInputChannel(input_id);
                    _delBrush(input_id);
                }
            }
        ];
    
    if (input.type !== 404) {
        items.unshift({
            icon: "fs-gear-icon", tooltip: "Settings", on_click: function () {
                _createChannelSettingsDialog(input_id);
            }
        });
    }
    
    if (input.type === 0) {
        items.push({
            icon: "fs-xyf-icon", tooltip: "View image", on_click: function () {
                _flipImage(dom_image, function (conversion_data) {
                    _fnCanvasToImage(conversion_data.canvas, function (image_element) {
                        var win = window.open(image_element.src);
                        win.document.write("<img src='" + image_element.src + "'/>");
                    })
                });
            }
        });
    }
    
    if (input.type === 3) {
        items.push({
            icon: "fs-reset-icon", tooltip: "Rewind", on_click: function () {
                if (input.video_elem.duration === NaN) {
                    input.video_elem.currentTime = 0;
                } else {
                    input.video_elem.currentTime = input.video_elem.duration * input.videostart;
                }
            }
        });
    }

    WUI_CircularMenu.create(
        {
            element: dom_image,

            rx: 32,
            ry: 32,

            item_width: 32,
            item_height: 32
        }, items
    );
};

var _selectCanvasInput = function (e) {
    e.preventDefault();
    
    var input_id = _parseInt10(e.target.dataset.inputId),
        input = _fragment_input_data[input_id],
        input_tmp,
        dom_image = input.elem,
        
        i = 0;
    
    for (i = 0; i < _fragment_input_data.length; i += 1) {
        input_tmp = _fragment_input_data[i];
        
        if (i === input_id ||
           input_tmp.type !== 2) {
            continue;
        }

        input_tmp.elem.classList.remove("fs-selected-input");
        input_tmp.canvas_enable = false;
        
        input_tmp.canvas.style.display = "none";
    }
    
    input.canvas_enable = !input.canvas_enable;
    
    if (input.canvas_enable) {
        dom_image.classList.add("fs-selected-input");
        
        WUI_Dialog.open(_paint_dialog, false);
        
        input.canvas.style.display = "";
        
        _selected_input_canvas = input;
    } else {
        dom_image.classList.remove("fs-selected-input");
        
        input.canvas.style.display = "none";
        
        _selected_input_canvas = null;
    }
};

var _sortInputs = function () {
    var i = 0,
        fragment_input_data;
    
    for (i = 0; i < _fragment_input_data.length; i += 1) {
        fragment_input_data = _fragment_input_data[i];

        fragment_input_data.elem.title = _input_channel_prefix + i;
        fragment_input_data.elem.dataset.inputId = i;
    }
};

var _removeInputChannel = function (input_id) {
    var fragment_input_data = _fragment_input_data[input_id],
        tracks, i;

    _gl.deleteTexture(_fragment_input_data.texture);

    if (_fragment_input_data.type === 1 || _fragment_input_data.type === 3) {
        _fragment_input_data.video_elem.pause();
        window.URL.revokeObjectURL(_fragment_input_data.video_elem.src);
        _fragment_input_data.video_elem.src = "";

        if (_fragment_input_data.media_stream) {
            tracks = _fragment_input_data.media_stream.getVideoTracks();
            if (tracks) {
                tracks[0].stop();
            }
        }
        _fragment_input_data.video_elem = null;
    }
    
    if (fragment_input_data.canvas) {
        document.body.removeChild(fragment_input_data.canvas);   
    }
    
    _fragment_input_data.splice(input_id, 1);

    _cbChannelSettingsClose(_parseInt10(input_id))();

    _sortInputs();

    _dbClear();

    for (i = 0; i < _fragment_input_data.length; i += 1) {
         _dbStoreInput(_parseInt10(_fragment_input_data[i].elem.dataset.inputId), _fragment_input_data[i].db_obj);
    }

    _compile();
};

var _createInputThumb = function (input_id, image, thumb_title, src) {
    var dom_image = document.createElement("img"),
        
        input = _fragment_input_data[input_id],
        
        tmp_canvas,
        tmp_canvas_context;

    if (image) {
        dom_image.src = image.src;
    }

    dom_image.title = thumb_title;
    
    if (src) {
        dom_image.src = src;
    }

    dom_image.dataset.inputId = input_id;

    dom_image.classList.add("fs-input-thumb");
    
    dom_image.draggable = true;

    dom_image.addEventListener("click", _inputThumbMenu);
    
    // drag & drop
    dom_image.addEventListener("drop", function (e) {
        e.preventDefault();

        if (e.target.dataset.inputId === undefined) {
            e.target.style = "";
            
            _dragged_input = null;
            
            return;
        }

        var src_input_id = _parseInt10(_dragged_input.dataset.inputId),
            dst_input_id = _parseInt10(e.target.dataset.inputId),
            
            elem_src = _fragment_input_data[src_input_id].elem,
            
            dst_data = e.target.src,
            src_title = _dragged_input.title,
            
            dst_input_data,
            src_input_data;

        _fragment_input_data = _swapArrayItem(_fragment_input_data, src_input_id, dst_input_id);

        e.target.dataset.inputId = src_input_id;
        _dragged_input.dataset.inputId = dst_input_id;
        
        e.target.title = "iInput" + src_input_id;
        _dragged_input.title = "iInput" + dst_input_id;
        
        _swapNode(e.target, _dragged_input);
        
        dst_input_data = _fragment_input_data[dst_input_id];
        src_input_data = _fragment_input_data[src_input_id];
        
        // db update
        _dbUpdateInput(_parseInt10(dst_input_id), dst_input_data.db_obj);
        _dbUpdateInput(_parseInt10(src_input_id), src_input_data.db_obj);
        //

        e.target.style = "";
        
        _dragged_input = null;
    });
    
    dom_image.addEventListener("dragstart", function (e) {
        _dragged_input = e.target;
    });
    
    dom_image.addEventListener("dragleave", function (e) {
        e.preventDefault();

        e.target.style = "";
    });

    dom_image.addEventListener("dragover", function (e) {
        e.preventDefault();

        if (e.target === _dragged_input) {
            e.dataTransfer.dropEffect = "none";
        } else {
            e.dataTransfer.dropEffect = "move";
        }
    });

    dom_image.addEventListener("dragenter", function (e) {
        e.preventDefault();

        if (e.target !== _dragged_input) {
            e.target.style = "border: dashed 1px #00ff00; background-color: #444444";
        }
    });

    _input_panel_element.appendChild(dom_image);
    
    // add it as brush as well
    if (input.type === 0) {
        _addBrush(dom_image, dom_image.dataset.inputId);
    }

    return dom_image;
};

var _addVideoEvents = function (video_element, input) {
    video_element.addEventListener("ended", function () {
        this.play();
        if (input.sloop) {
            input.playrate = -input.playrate;
            video_element.playbackRate = input.playrate;
        } else {
            this.currentTime = input.videostart * this.duration;
        }
    });

    video_element.addEventListener("timeupdate", function () {
        if (this.duration !== NaN) {
            var video_start_pos = this.duration * input.videostart,
                video_end_pos = this.duration * input.videoend;
            if (input.sloop) {
                if (this.currentTime < video_start_pos) {
                    video_element.playbackRate = input.playrate;
                    this.currentTime = video_start_pos;
                    this.play();
                } else if (this.currentTime > video_end_pos) {
                    video_element.playbackRate = -input.playrate;
                    this.currentTime = video_end_pos;
                    this.play();
                }
            } else {
                if (this.currentTime < video_start_pos) {
                    this.currentTime = video_end_pos;
                    this.play();
                } else if (this.currentTime >= video_end_pos) {
                    this.currentTime = video_start_pos;
                    this.play();
                }
            }
        }
    }, false);
};

var _fnReplaceInputTexture = function (input_id) {
    var input_obj = _fragment_input_data[input_id];

    return function (texture) {
        input_obj.texture = texture;
    };
};

var _addNoneInput = function (type, input_id) {
    var data = _create2DTexture({ empty: true }, false, false);

    _fragment_input_data.push({
            type: 404,
            texture: data.texture,
            db_obj: null
        });
    
    _dbRestoreInput(input_id, _fragment_input_data[input_id]);
    
    _fragment_input_data[input_id].elem = _createInputThumb(input_id, null, _input_channel_prefix + input_id, "data/ui-icons/"+type+"_none.png");

    _compile();
};

var _addFragmentInput = function (type, input, settings) {
    var input_thumb,

        data,
        image,
        texture,
        canvas,
        
        input_obj,
        
        video_element,
        
        db_obj = { type: type, width: null, height: null, data: null, settings: { f: "nearest", wrap: { s: null, t: null }, flip: false } },

        input_id = _fragment_input_data.length;

    if (type === "image") {
        data = _create2DTexture(input, false, true);
        
        db_obj.data = input.src;
        db_obj.width = input.width;
        db_obj.height = input.height;
        db_obj.settings.wrap.s = data.wrap.ws;
        db_obj.settings.wrap.t = data.wrap.wt;
        db_obj.settings.flip = false;
        
        _dbStoreInput(input_id, db_obj);
        
        _fragment_input_data.push({
            type: 0,
            image: data.image,
            texture: data.texture,
            elem: null,
            db_obj: db_obj
        });
        
        if (settings !== undefined) {
            _setTextureFilter(data.texture, settings.f);
            _setTextureWrapS(data.texture, settings.wrap.s);
            _setTextureWrapT(data.texture, settings.wrap.t);
            
            db_obj.settings.f = settings.f;
            db_obj.settings.wrap.s = settings.wrap.s;
            db_obj.settings.wrap.t = settings.wrap.t;
            db_obj.settings.flip = settings.flip;
            
            if (settings.flip) {
                _flipTexture(data.texture, data.image, _fnReplaceInputTexture(input_id));
            }
        }

        input_thumb = input;

        _fragment_input_data[input_id].elem = _createInputThumb(input_id, input_thumb, _input_channel_prefix + input_id);

        _fragment_input_data[input_id].elem.addEventListener("contextmenu", _cbChannelSettings(input_id));

        _compile();
    } else if (type === "camera" || type === "video") {
        video_element = document.createElement('video');
        video_element.autoplay = true;
        video_element.loop = true;
        video_element.stream = null;
        
        if (type === "camera") {
            video_element.width = 320;
            video_element.height = 240;
            
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia  || navigator.msGetUserMedia || navigator.oGetUserMedia;
            
            if (navigator.getUserMedia) {
                navigator.getUserMedia({ video: { mandatory: { /*minWidth: 640, maxWidth: 1280, minHeight: 320, maxHeight: 720, minFrameRate: 30*/ }, optional: [ { minFrameRate: 60 } ] },
                    audio: false }, function (media_stream) {
                        video_element.src = window.URL.createObjectURL(media_stream);

                        data = _create2DTexture(video_element, false, false);

                        _setTextureWrapS(data.texture, "clamp");
                        _setTextureWrapT(data.texture, "clamp");

                        db_obj.settings.wrap.s = data.wrap.ws;
                        db_obj.settings.wrap.t = data.wrap.wt;
                        db_obj.settings.flip = false;

                        _dbStoreInput(input_id, db_obj);

                        if (settings !== undefined) {
                            _setTextureFilter(data.texture, settings.f);
                            _setTextureWrapS(data.texture, settings.wrap.s);
                            _setTextureWrapT(data.texture, settings.wrap.t);

                            db_obj.settings.f = settings.f;
                            db_obj.settings.wrap.s = settings.wrap.s;
                            db_obj.settings.wrap.t = settings.wrap.t;
                            db_obj.settings.flip = settings.flip;
                        }

                        _fragment_input_data.push({
                                type: 1,
                                image: data.image,
                                texture: data.texture,
                                video_elem: video_element,
                                elem: null,
                                media_stream: media_stream,
                                db_obj: db_obj
                            });

                        _fragment_input_data[input_id].elem = _createInputThumb(input_id, null, _input_channel_prefix + input_id, "data/ui-icons/camera.png");
                        
                        _fragment_input_data[input_id].elem.addEventListener("contextmenu", _cbChannelSettings(input_id));

                        _compile();
                    }, function (e) {
                        _notification("Unable to capture video/camera.");
                    });
            } else {
                _notification("Cannot capture video/camera, getUserMedia function is not supported by your browser.");
            }
        } else { // Video
            // a "video without data" Fragment input; a dummy image basically which tell the user that a video was here
            if (!input) {
                _addNoneInput(type, input_id);

                return;
            }

            if (Object.prototype.toString.call(input) === "[object String]") {
                video_element.src = input;
            } else {
                video_element.src = window.URL.createObjectURL(input);
            }
            
            video_element.autoplay = true;
            video_element.loop = false;
            video_element.muted = true;
            
            data = _create2DTexture(video_element, false, false);

            _setTextureWrapS(data.texture, "repeat");
            _setTextureWrapT(data.texture, "repeat");

            if (settings !== undefined) {
                _setTextureFilter(data.texture, settings.f);
                _setTextureWrapS(data.texture, settings.wrap.s);
                _setTextureWrapT(data.texture, settings.wrap.t);
                
                db_obj.settings.f = settings.f;
                db_obj.settings.wrap.s = data.wrap.ws;
                db_obj.settings.wrap.t = data.wrap.wt;
                db_obj.settings.flip = false;
            }
            
            _dbStoreInput(input_id, db_obj);
            
            input_obj = {
                    type: 3,
                    image: data.image,
                    texture: data.texture,
                    video_elem: video_element,
                    elem: null,
                    db_obj: db_obj,
                    videostart: 0.0,
                    videoend: 1.0,
                    playrate: 1.0,
                    sloop: false // smooth video loop
            };

            _fragment_input_data.push(input_obj);

            _fragment_input_data[input_id].elem = _createInputThumb(input_id, null, _input_channel_prefix + input_id, "data/ui-icons/video.png");
            
            _fragment_input_data[input_id].elem.addEventListener("contextmenu", _cbChannelSettings(input_id));

            _compile();
            
            _addVideoEvents(video_element, _fragment_input_data[input_id]);
            
            video_element.play();
        }
    } else if (type === "canvas") {
        data = _create2DTexture({
                empty: true,
                width: _canvas_width,
                height: _canvas_height,
            }, false, true);
        
        if (input) {
            db_obj.data = input.src;
        } else {
            db_obj.data = "";
        }
        
        db_obj.width = _canvas_width;
        db_obj.height = _canvas_height;
        db_obj.settings.wrap.s = data.wrap.ws;
        db_obj.settings.wrap.t = data.wrap.wt;
        db_obj.settings.flip = false;
        
        _dbStoreInput(input_id, db_obj);
        
        canvas = document.createElement("canvas");
        canvas.width = _canvas_width;
        canvas.height = _canvas_height;
        canvas.classList.add("fs-paint-canvas");
        
        input_obj = {
                type: 2,
                image: canvas,//data.image,
                texture: data.texture,
                elem: null,
                db_obj: db_obj,
                canvas: canvas,
                canvas_ctx: canvas.getContext("2d"),
                canvas_enable: false,
                mouse_btn: 0,
                update_timeout: null
            };
        
        _fragment_input_data.push(input_obj);

        var co = _getElementOffset(_canvas);
            
        canvas.style.position = "absolute";
        canvas.style.left = co.left + "px";
        canvas.style.top = co.top + "px";
        canvas.style.display = "none";
        
        canvas.dataset.group = "canvas";
        
        _setImageSmoothing(input_obj.canvas_ctx, false);
        
        if (input) {
            input_obj.canvas_ctx.drawImage(input, 0, 0);

            _canvasInputUpdate(input_obj);
        }
        
        document.body.appendChild(canvas);
        
        canvas.addEventListener('mousedown', function (e) {
            if (!input_obj.canvas_enable) {
                return false;
            }
            
            var e = e || window.event,

                canvas_offset = _getElementOffset(canvas),

                x = e.pageX - canvas_offset.left,
                y = e.pageY - canvas_offset.top;

            input_obj.mouse_btn = e.which;

            if (input_obj.mouse_btn === 1 ||
               input_obj.mouse_btn === 3) {
                _paintStart(x, y);
                
                _canvasInputDraw(input_obj, x, y, true);
                
                document.body.classList.add("fs-no-select");
            }
        });

        canvas.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        });
        
        if (settings !== undefined) {
            _setTextureFilter(data.texture, settings.f);
            _setTextureWrapS(data.texture, settings.wrap.s);
            _setTextureWrapT(data.texture, settings.wrap.t);
            
            db_obj.settings.f = settings.f;
            db_obj.settings.wrap.s = settings.wrap.s;
            db_obj.settings.wrap.t = settings.wrap.t;
            db_obj.settings.flip = settings.flip;
        }

        input_thumb = input;

        _fragment_input_data[input_id].elem = _createInputThumb(input_id, null, _input_channel_prefix + input_id, "data/ui-icons/paint_brush.png" );

        _fragment_input_data[input_id].elem.addEventListener("contextmenu", _selectCanvasInput);
        
        _compile();
    } else {
        return;
    }
};

/***********************************************************
    Init.
************************************************************/
