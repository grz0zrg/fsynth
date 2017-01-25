/* jslint browser: true */


var _buildScreenAlignedQuad = function() {
    var position;

    _quad_vertex_buffer = _gl.createBuffer();

    _gl.bindBuffer(_gl.ARRAY_BUFFER, _quad_vertex_buffer);
    _gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), _gl.STATIC_DRAW);
};

var _create2DTexture = function (image, default_wrap_filter, bind_now) {
    var new_texture = _gl.createTexture();

    _gl.bindTexture(_gl.TEXTURE_2D, new_texture);

    if (!default_wrap_filter) {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);

        if ((!_isPowerOf2(image.width) || !_isPowerOf2(image.height)) && !_gl2) {
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);

            _notification("Non-power-of-2 image added, wrap mode is 'clamp' only.", 4000);
        }
    }
    
    if (bind_now) {
        _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, _gl.RGBA, _gl.UNSIGNED_BYTE, image);
    }

    _gl.bindTexture(_gl.TEXTURE_2D, null);

    return { image: image, texture: new_texture };
};

var _replace2DTexture = function (image, texture) {
    var data,

        filter_tex_parameter,
        filter_wrap_s_parameter,
        filter_wrap_t_parameter;
    
    _gl.bindTexture(_gl.TEXTURE_2D, texture);
    
    filter_tex_parameter = _gl.getTexParameter(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER);
    filter_wrap_s_parameter = _gl.getTexParameter(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S);
    filter_wrap_t_parameter = _gl.getTexParameter(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T);

    _gl.deleteTexture(texture);

    data = _create2DTexture(image, true, true);

    _gl.bindTexture(_gl.TEXTURE_2D, data.texture);

    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, filter_tex_parameter);
    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, filter_tex_parameter);
    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, filter_wrap_s_parameter);
    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, filter_wrap_t_parameter);

    _gl.bindTexture(_gl.TEXTURE_2D, null);

    return data.texture;
};

var _setTextureFilter = function (texture, mode) {
    _gl.bindTexture(_gl.TEXTURE_2D, texture);

    if (mode === "nearest") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.NEAREST);
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.NEAREST);
    } else if (mode === "linear") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
    }

    _gl.bindTexture(_gl.TEXTURE_2D, null);
};

var _setTextureWrapS = function (texture, mode) {
    _gl.bindTexture(_gl.TEXTURE_2D, texture);
    
    if (mode === "clamp") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
    } else if (mode === "repeat") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.REPEAT);
    } else if (mode === "mirror") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.MIRRORED_REPEAT);
    }

    _gl.bindTexture(_gl.TEXTURE_2D, null);
};

var _setTextureWrapT = function (texture, mode) {
    _gl.bindTexture(_gl.TEXTURE_2D, texture);
    
    if (mode === "clamp") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
    } else if (mode === "repeat") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.REPEAT);
    } else if (mode === "mirror") {
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.MIRRORED_REPEAT);
    }

    _gl.bindTexture(_gl.TEXTURE_2D, null);
};

var _flipTexture = function (texture, image) {
    var tmp_canvas = document.createElement('canvas'),
        tmp_canvas_context = tmp_canvas.getContext('2d');
    
    tmp_canvas.width  = image.naturalWidth;
    tmp_canvas.height = image.naturalHeight;
    
    tmp_canvas_context.translate(0, tmp_canvas.height);
    tmp_canvas_context.scale(1, -1);

    tmp_canvas_context.drawImage(image, 0, 0);

    image.src = tmp_canvas.toDataURL();
    
    return _replace2DTexture(image, texture);
};

var _flipYTexture = function (texture, flip) {
    _gl.bindTexture(_gl.TEXTURE_2D, texture);
    _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, flip);
    _gl.bindTexture(_gl.TEXTURE_2D, null);
};

var _transformData = function (slice_obj, data) {
    var offset = 0,
        
        i = 0,
        
        j = 0;
    
    if (slice_obj.shift > 0) {
        offset = slice_obj.shift * 4;
        
        data.copyWithin(offset, 0, _canvas_height_mul4 - offset);
        
        for (i = 0; i < offset; i += 1) {
            data[i] = 0;
        }
    } else if (slice_obj.shift < 0) {
        offset = -slice_obj.shift * 4;
        
        data.copyWithin(0, offset, _canvas_height_mul4 - offset);
        
        for (i = (_canvas_height_mul4 - offset); i < _canvas_height_mul4; i += 1) {
            data[i] = 0;
        }
    }
};

var _frame = function (raf_time) {
    var i = 0, j = 0,

        play_position_marker,
        play_position_marker_x = 0,
        
        fsas_data,
        
        fragment_input,
        
        global_time = (raf_time - _time) / 1000,
        
        iglobal_time,

        date = new Date(),
        
        fas_enabled = _fasEnabled(),
        
        f,
        
        buffer;

    //_gl.useProgram(_program);
    _gl.uniform1f(_getUniformLocation("globalTime"), global_time);
    _gl.uniform1f(_getUniformLocation("octave"), _audio_infos.octaves);
    _gl.uniform1f(_getUniformLocation("baseFrequency"), _audio_infos.base_freq);
    _gl.uniform4f(_getUniformLocation("mouse"), _nmx, _nmy, _cnmx, _cnmy);
    _gl.uniform4f(_getUniformLocation("date"), date.getFullYear(), date.getMonth(), date.getDay(), date.getSeconds());

    // fragment inputs
    for (i = 0; i < _fragment_input_data.length; i += 1) {
        fragment_input = _fragment_input_data[i];

        if (fragment_input.type === 0) { // 2D texture from image
                _gl.activeTexture(_gl.TEXTURE0 + i);
                _gl.bindTexture(_gl.TEXTURE_2D, fragment_input.texture);
                _gl.uniform1i(_getUniformLocation(_input_channel_prefix + i), i);
        } else if (fragment_input.type === 1) { // camera
            if (fragment_input.video_elem.readyState === fragment_input.video_elem.HAVE_ENOUGH_DATA) {
                _gl.activeTexture(_gl.TEXTURE0 + i);
                _gl.bindTexture(_gl.TEXTURE_2D, fragment_input.texture);
                _gl.uniform1i(_getUniformLocation(_input_channel_prefix + i), i);

                _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, _gl.RGBA, _gl.UNSIGNED_BYTE, fragment_input.image);
            }
        }
    }

    //_gl.bindBuffer(_gl.ARRAY_BUFFER, _quad_vertex_buffer);
    _gl.drawArrays(_gl.TRIANGLE_STRIP, 0, 4);
    
    if ((_notesWorkerAvailable() || fas_enabled) && _play_position_markers.length > 0) {
        if (!fas_enabled) {
            _prev_data = new Uint8Array(_data);
        }
        
        if (_gl2) {
            _gl.bindBuffer(_gl.PIXEL_PACK_BUFFER, _pbo);
            _gl.bufferData(_gl.PIXEL_PACK_BUFFER, 1 * _canvas.height * 4, _gl.STATIC_READ);
        }

        // populate array first
        play_position_marker = _play_position_markers[0];
        
        if (play_position_marker.mute) {
            _data = new Uint8Array(_data.length);
        } else {
            play_position_marker_x = play_position_marker.x;
            
            if (_gl2) {
                _gl.readPixels(play_position_marker_x, 0, 1, _canvas_height, _gl.RGBA, _gl.UNSIGNED_BYTE, 0);
                _gl.getBufferSubData(_gl.PIXEL_PACK_BUFFER, 0, _data);
            } else {
                _gl.readPixels(play_position_marker_x, 0, 1, _canvas_height, _gl.RGBA, _gl.UNSIGNED_BYTE, _data);
            }
            
            _transformData(play_position_marker, _data);
        }

        for (i = 1; i < _play_position_markers.length; i += 1) {
            play_position_marker = _play_position_markers[i];
            
            if (play_position_marker.mute) {
                continue;
            }
            
            play_position_marker_x = play_position_marker.x;

            if (_gl2) {
                _gl.readPixels(play_position_marker_x, 0, 1, _canvas_height, _gl.RGBA, _gl.UNSIGNED_BYTE, 0);
                _gl.getBufferSubData(_gl.PIXEL_PACK_BUFFER, 0, _temp_data);
            } else {
                _gl.readPixels(play_position_marker_x, 0, 1, _canvas_height, _gl.RGBA, _gl.UNSIGNED_BYTE, _temp_data);
            }
            
            _transformData(play_position_marker, _temp_data);

            // merge slices data
            for (j = 0; j < _canvas_height_mul4; j += 1) {
                _data[j] = _data[j] + _temp_data[j];
            }
        }
    
        buffer = new Uint8Array(_data);
        
        if (fas_enabled) {
            _fasNotifyFast(_FAS_FRAME, _data);
        } else {
            _notesProcessing(_data, _prev_data);
        }
        
        _data = buffer;
    }
    
    if (_show_globaltime) {
        iglobal_time = parseInt(global_time, 10);
        if (parseInt(_time_infos.innerHTML, 10) !== iglobal_time) {
            _time_infos.innerHTML = iglobal_time;
        }
    }
    
    if (_show_oscinfos) {
        var c = 0;
        for (i = 0; i < _data.length; i += 4) {
            if (_data[i] > 0) {
                c += 1;
            } else if (_data[i + 1] > 0) {
                c += 1;
            }
        }

        _osc_infos.innerHTML = c;
    }

    _raf = window.requestAnimationFrame(_frame);
};