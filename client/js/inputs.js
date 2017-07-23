/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _dragged_input = null,
    
    _selected_input_canvas = null;

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
    } else {
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
    
    channel_filter_select.addEventListener("change", function () {
            _setTextureFilter(fragment_input_channel.texture, this.value);
        
            fragment_input_channel.db_obj.settings.f = this.value;
            _dbUpdateInput(input_channel_id, fragment_input_channel.db_obj);
        });
    
    channel_wrap_s_select.addEventListener("change", function () {
            _setTextureWrapS(fragment_input_channel.texture, this.value);
        
            fragment_input_channel.db_obj.settings.wrap.s = this.value;
            _dbUpdateInput(input_channel_id, fragment_input_channel.db_obj);
        });
    
    channel_wrap_t_select.addEventListener("change", function () {
            _setTextureWrapT(fragment_input_channel.texture, this.value);
        
            fragment_input_channel.db_obj.settings.wrap.t = this.value;
            _dbUpdateInput(input_channel_id, fragment_input_channel.db_obj);
        });
    
    channel_vflip.addEventListener("change", function () {
            var new_texture;
        
            fragment_input_channel.db_obj.settings.flip = this.checked;

            if (fragment_input_channel.db_obj.settings.flip) {
                _flipTexture(fragment_input_channel.texture, fragment_input_channel.image, function (texture) {
                        fragment_input_channel.texture = texture;
                    });
            } else {
                new_texture = _replace2DTexture(fragment_input_channel.image, fragment_input_channel.texture);
                fragment_input_channel.texture = new_texture;
            }

            _dbUpdateInput(input_channel_id, fragment_input_channel.db_obj);
        });
    
    channel_settings_dialog = WUI_Dialog.create(dialog_element.id, {
        title: _input_channel_prefix + input_channel_id + " settings",

        width: "250px",
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
        min_height: 250,
        
        header_btn: [
            {
                title: "Help",
                on_click: function () {
                    window.open(_documentation_link + "#subsec5_5"); 
                },
                class_name: "fs-help-icon"
            }
        ]
    });
};

var _imageProcessor = function (image_data, image_processing_done_cb) {
    var worker = new Worker("dist/worker/image_processor.min.js");

    worker.onmessage = function (e) {
        image_processing_done_cb(e.data);
    };

    worker.postMessage({ img_width: image_data.width, img_height: image_data.height, buffer: image_data.data.buffer }, [image_data.data.buffer]);
};

var _inputThumbMenu = function (e) {
    var input_id = _parseInt10(e.target.dataset.inputId),
        input = _fragment_input_data[input_id],
        dom_image = input.elem,
        
        items = [
                { icon: "fs-gear-icon", tooltip: "Settings",  on_click: function () {
                        _createChannelSettingsDialog(input_id);
                    } },
    /*
                { icon: "fs-replace-icon", tooltip: "Replace",  on_click: function () {

                    } },
    */
                { icon: "fs-cross-45-icon", tooltip: "Delete",  on_click: function () {
                        _input_panel_element.removeChild(dom_image);

                        _removeInputChannel(input_id);
                        _delBrush(input_id);
                    } }
            ];
    
    if (input.type === 0) {
        items.push({ icon: "fs-xyf-icon", tooltip: "View image",  on_click: function () {
                window.open(dom_image.src);
            } });
    }

    WUI_CircularMenu.create(
            {
                element: dom_image,

                rx: 32,
                ry: 32,

                item_width:  32,
                item_height: 32
            }, items
        );
};

var _selectCanvas = function (e) {
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
        tracks;

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
    
    if (fragment_input_data.canvas) {
        document.body.removeChild(fragment_input_data.canvas);   
    }
    
    _fragment_input_data.splice(input_id, 1);

    _sortInputs();

    _compile();
    
    _dbRemoveInput(input_id);
};

var _createInputThumb = function (input_id, image, thumb_title, src) {
    var dom_image = document.createElement("img"),
        
        input = _fragment_input_data[input_id],
        
        tmp_canvas,
        tmp_canvas_context;

    if (image) {
        // because the data is inverted for WebGL, so we revert it...
        tmp_canvas = document.createElement('canvas');
        tmp_canvas_context = tmp_canvas.getContext('2d');
        tmp_canvas.width  = image.naturalWidth;
        tmp_canvas.height = image.naturalHeight;

        tmp_canvas_context.translate(0, tmp_canvas.height);
        tmp_canvas_context.scale(1, -1);
        tmp_canvas_context.drawImage(image, 0, 0, tmp_canvas.width, tmp_canvas.height);
        
        dom_image.src = tmp_canvas.toDataURL();
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
        _dbUpdateInput(dst_input_id, dst_input_data.db_obj);
        _dbUpdateInput(src_input_id, src_input_data.db_obj);
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

var _canvasInputUpdate = function (input_obj) {
    clearTimeout(input_obj.update_timeout);
    input_obj.update_timeout = setTimeout(function () {
            var image_data = input_obj.canvas_ctx.getImageData(0, 0, input_obj.canvas.width, input_obj.canvas.height);

            _imageProcessor(image_data, function (m) {
                _gl.bindTexture(_gl.TEXTURE_2D, input_obj.texture);
                _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, true);
                _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, m.img_width, m.img_height, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, new Uint8Array(m.data));
                _gl.bindTexture(_gl.TEXTURE_2D, null);

                input_obj.db_obj.data = input_obj.canvas.toDataURL();
                
                var input_id = _parseInt10(input_obj.elem.dataset.inputId);
                
                _dbUpdateInput(input_id, input_obj.db_obj);
            });
        }, 250);
};

var _canvasInputDraw = function (input_obj, x, y, once) {
    if (_paint_brush === null) {
        return;
    }
    
    if (once) {
        _draw(input_obj.canvas_ctx, _paint_brush, input_obj.mouse_btn - 2, x, y, _paint_scalex, _paint_scaley, _paint_angle, _paint_opacity);
    } else {
        _paint(input_obj.canvas_ctx, _paint_brush, input_obj.mouse_btn - 2, x, y, _paint_scalex, _paint_scaley, _paint_angle, _paint_opacity);
    }

    _canvasInputUpdate(input_obj);
};

var _canvasInputPaint = function (e) {
    if (_selected_input_canvas) {
        if (!_selected_input_canvas.canvas_enable) {
            return false;
        }

        var e = e || window.event,

            canvas_offset = _getElementOffset(_selected_input_canvas.canvas),

            x = e.pageX - canvas_offset.left,
            y = e.pageY - canvas_offset.top;

        if (!_paint_brush) {
            return;
        }

        if (_selected_input_canvas.mouse_btn === 1 ||
           _selected_input_canvas.mouse_btn === 3) {
            _canvasInputDraw(_selected_input_canvas, x, y);
        }
    }
};

var _canvasInputStopPainting = function () {
    if (_selected_input_canvas) {
        _selected_input_canvas.mouse_btn = 0;
    }
    
    document.body.classList.remove("fs-no-select");
};

var _canvasInputClear = function (input_obj) {
    input_obj.canvas_ctx.clearRect(0, 0, input_obj.canvas.width, input_obj.canvas.height);
};

var _updateCanvasInputDimensions = function (new_width, new_height) {
    var i = 0,
        fragment_input_data,
        tmp_canvas = document.createElement("canvas"),
        tmp_canvas_ctx = tmp_canvas.getContext("2d"),
        input_id;
    
    if (!new_width) {
        new_width = _canvas_width;
    }
    
    if (!new_height) {
        new_height = _canvas_height;
    }
    
    new_width = _parseInt10(new_width);
    new_height = _parseInt10(new_height);
    
    for (i = 0; i < _fragment_input_data.length; i += 1) {
        fragment_input_data = _fragment_input_data[i];
        
        if (fragment_input_data.type === 2) {
            tmp_canvas.width = new_width; 
            tmp_canvas.height = new_height;
            tmp_canvas_ctx.fillRect(0, 0, new_width, new_height);
            tmp_canvas_ctx.drawImage(fragment_input_data.canvas, 0, 0);

            fragment_input_data.canvas.width = new_width; 
            fragment_input_data.canvas.height = new_height;
            fragment_input_data.db_obj.width = _canvas_width;
            fragment_input_data.db_obj.height = _canvas_height;
            fragment_input_data.canvas_ctx.drawImage(tmp_canvas, 0, 0, new_width, new_height);

            fragment_input_data.texture = _replace2DTexture({ empty: true, width: new_width, height: new_height }, fragment_input_data.texture);
            
            _flipYTexture(fragment_input_data.texture, true);
            
            _canvasInputUpdate(fragment_input_data);
            
            input_id = _parseInt10(fragment_input_data.elem.dataset.inputId);
            
            _dbUpdateInput(input_id, fragment_input_data.db_obj);
        }
    }
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
            _flipYTexture(data.texture, settings.flip);
            _setTextureFilter(data.texture, settings.f);
            _setTextureWrapS(data.texture, settings.wrap.s);
            _setTextureWrapT(data.texture, settings.wrap.t);
            
            db_obj.settings.f = settings.f;
            db_obj.settings.wrap.s = settings.wrap.s;
            db_obj.settings.wrap.t = settings.wrap.t;
            db_obj.settings.flip = settings.flip;
            
            if (settings.flip) {
                _fragment_input_data[input_id].texture = _replace2DTexture(data.image, data.texture);
            }
        }

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
                        _flipYTexture(data.texture, settings.flip);
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

                    _fragment_input_data[input_id].elem = _createInputThumb(input_id, null, _input_channel_prefix + input_id, "data/ui-icons/camera.png" );

                    _compile();
                }, function (e) {
                    _notification("Unable to capture WebCam.");
                });
        } else {
            _notification("Cannot capture audio/video, getUserMedia function is not supported by your browser.");
        }
    } else if (type === "canvas") {
        data = _create2DTexture({
                empty: true,
                width: _canvas_width,
                height: _canvas_height,
            }, true, true);
        
        if (input) {
            db_obj.data = input.src;
        } else {
            db_obj.data = "";
        }
        
        db_obj.width = _canvas_width;
        db_obj.height = _canvas_height;
        db_obj.settings.wrap.s = data.wrap.ws;
        db_obj.settings.wrap.t = data.wrap.wt;
        db_obj.settings.flip = true;
        
        _dbStoreInput(input_id, db_obj);
        
        canvas = document.createElement("canvas");
        canvas.width = _canvas_width;
        canvas.height = _canvas_height;
        canvas.classList.add("fs-paint-canvas");
        
        input_obj = {
                type: 2,
                image: data.image,
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
            _flipYTexture(data.texture, settings.flip);
            _setTextureFilter(data.texture, settings.f);
            _setTextureWrapS(data.texture, settings.wrap.s);
            _setTextureWrapT(data.texture, settings.wrap.t);
            
            db_obj.settings.f = settings.f;
            db_obj.settings.wrap.s = settings.wrap.s;
            db_obj.settings.wrap.t = settings.wrap.t;
            db_obj.settings.flip = settings.flip;
            
            if (settings.flip) {
                _fragment_input_data[input_id].texture = _replace2DTexture(data.image, data.texture);
            }
        }

        input_thumb = input;

        _fragment_input_data[input_id].elem = _createInputThumb(input_id, null, _input_channel_prefix + input_id, "data/ui-icons/paint_brush.png" );

        _fragment_input_data[input_id].elem.addEventListener("contextmenu", _selectCanvas);
        
        _compile();
    } else {
        return;
    }
};

/***********************************************************
    Init.
************************************************************/
