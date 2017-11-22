/* jslint browser: true */

var _main_program = null,
    _main_attch0 = null,
    _main_attch1 = null,
    _main_fbo = null;

var _buildScreenAlignedQuad = function() {
    var position;

    _quad_vertex_buffer = _gl.createBuffer();

    _gl.bindBuffer(_gl.ARRAY_BUFFER, _quad_vertex_buffer);
    _gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), _gl.STATIC_DRAW);
};

var _createFramebuffer = function (texture, color_attachments) {
    var framebuffer = _gl.createFramebuffer(),
        buffers = [],
        completeness_reason,
        i;
    
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);
    
    if (!color_attachments) {
        _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, texture, 0);
    } else {
        
        for (i = 0; i < color_attachments; i += 1) {
            _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.TEXTURE_2D, texture[i], 0);
            
            buffers.push(_gl.COLOR_ATTACHMENT0 + i);
        }
        
        _gl.drawBuffers(buffers);
    }
    
    completeness_reason = _gl.checkFramebufferStatus(_gl.FRAMEBUFFER);
    
    if (completeness_reason !== _gl.FRAMEBUFFER_COMPLETE) {
        if (completeness_reason === _gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT) {
            console.log("_createFramebuffer failed: incomplete attachment.");
        } else if (completeness_reason === _gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT) {
            console.log("_createFramebuffer failed: incomplete mising attachment.");
        } else if (completeness_reason === _gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS) {
            console.log("_createFramebuffer failed: incomplete dimensions.");
        } else if (completeness_reason === _gl.FRAMEBUFFER_UNSUPPORTED) {
            console.log("_createFramebuffer failed: unsupported.");
        }
        
        if (_gl2) {
            if (completeness_reason === _gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE) {
                console.log("_createFramebuffer failed: incomplete multisample.");
            } else if (completeness_reason === _gl.RENDERBUFFER_SAMPLES) {
                console.log("_createFramebuffer failed: renderbuffer samples.");
            }
        }
        return null;
    }
    
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);
    _gl.bindTexture(_gl.TEXTURE_2D, null);
    
    return framebuffer;
};

var _create2DTexture = function (image, default_wrap_filter, bind_now) {
    var new_texture = _gl.createTexture(),
        
        ws = "clamp",
        wt = "clamp",
        
        format = _gl.UNSIGNED_BYTE,
        internal_format = _gl.RGBA;
    
    // WebGL 2 only
    if (image.float) {
        format = _gl.FLOAT;
        
        internal_format = _gl.RGBA32F;
    }

    _gl.bindTexture(_gl.TEXTURE_2D, new_texture);

    if (!default_wrap_filter) {
        if (!_OES_texture_float_linear && image.float) {
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.NEAREST);
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.NEAREST);
        } else {
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
        }
        
        if ((!_isPowerOf2(image.width) || !_isPowerOf2(image.height)) && !_gl2) {
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);

            _notification("Non-power-of-2 image added, wrap mode is 'clamp' only.", 4000);
        }
    }

    if (image.empty) {
        _gl.texImage2D(_gl.TEXTURE_2D, 0, internal_format, image.width, image.height, 0, _gl.RGBA, format, null);
    } else {
        if (bind_now) {
            _gl.texImage2D(_gl.TEXTURE_2D, 0, internal_format, _gl.RGBA, format, image);
        }
    }

    _gl.bindTexture(_gl.TEXTURE_2D, null);

    return { image: image, texture: new_texture, wrap: { ws: ws, wt: wt} };
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

var _flipTexture = function (texture, image, done_cb) {
    var tmp_canvas = document.createElement('canvas'),
        tmp_canvas_context = tmp_canvas.getContext('2d'),
        
        image_element = document.createElement("img");
    
    tmp_canvas.width  = image.naturalWidth;
    tmp_canvas.height = image.naturalHeight;
    
    tmp_canvas_context.translate(0, tmp_canvas.height);
    tmp_canvas_context.scale(1, -1);

    tmp_canvas_context.drawImage(image, 0, 0);

    image_element.src = tmp_canvas.toDataURL();
    image_element.width = image.naturalWidth;
    image_element.height = image.naturalHeight;

    image_element.onload = function () {
        image_element.onload = null;
        
        done_cb(_replace2DTexture(image_element, texture));
    };
};

var _flipYTexture = function (texture, flip) {
    _gl.bindTexture(_gl.TEXTURE_2D, texture);
    _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, flip);
    _gl.bindTexture(_gl.TEXTURE_2D, null);
};

var _buildFeedback = function () {
    var i = 0, j = 0, frame, fragment_shader, vertex_shader = document.getElementById("vertex-shader").text;
    
    if (_feedback.enabled) {
        if (_feedback.program) {
            _gl.deleteProgram(_program);
        }
        
        if (_gl2) {
            fragment_shader = [
                "#version 300 es\n",
                "precision mediump float;",
                "layout(location = 0) out vec4 synthOutput;",
                "layout(location = 1) out vec4 fragColor;",
                "uniform vec2 resolution;",
                "uniform sampler2D synthInput;",
                "uniform sampler2D colorInput;",
                "void main () {",
                "    vec2 uv = gl_FragCoord.xy / resolution;",
                "    vec4 c = texture(colorInput, uv);",
                "    vec4 s = texture(synthInput, uv);",
                "    fragColor = c;",
                "    synthOutput = s;",
                "}"].join("");
            
            vertex_shader = "#version 300 es\n" + document.getElementById("vertex-shader-2").text;
        } else {
            fragment_shader = _generic_fragment_shader;
        }

        _feedback.program = _createAndLinkProgram(
                _createShader(_gl.VERTEX_SHADER, vertex_shader),
                _createShader(_gl.FRAGMENT_SHADER, fragment_shader)
            );

        if (!_feedback.program) {
            _feedback.enabled = false;
            
            _notification("Could not enable feedback feature.");
            
            return;
        }
        
        _useProgram(_feedback.program);
        _gl.uniform2f(_gl.getUniformLocation(_feedback.program, "resolution"), _canvas.width, _canvas.height);
        
        for (i = 0; i < _feedback.pframe.length; i += 1) {
            frame = _feedback.pframe[i];
            
            if (frame.data) {
                for (j = 0; j < frame.data.length; j += 1) {
                    if (frame.data[j].texture) {
                        _gl.deleteTexture(frame.data[j].texture);
                    }
                }
            }

            if (frame.buffer) {
                _gl.deleteFramebuffer(frame.buffer);
            }
        }
        
        _feedback.pframe[0] = { data: [], buffer: null };
        _feedback.pframe[1] = { data: [], buffer: null };
        
        if (!_gl2) {
            _feedback.pframe[0].data[0] = _create2DTexture({ width: _canvas.width, height: _canvas.height, empty: true });
            _feedback.pframe[0].buffer = _createFramebuffer(_feedback.pframe[0].data[0].texture);

            _feedback.pframe[1].data[0] = _create2DTexture({ width: _canvas.width, height: _canvas.height, empty: true });
            _feedback.pframe[1].buffer = _createFramebuffer(_feedback.pframe[1].data[0].texture);
        } else {
            _feedback.pframe[0].data[0] = _create2DTexture({ width: _canvas.width, height: _canvas.height, empty: true, float: true });
            _feedback.pframe[0].data[1] = _create2DTexture({ width: _canvas.width, height: _canvas.height, empty: true, float: true });
            _feedback.pframe[0].buffer = _createFramebuffer([_feedback.pframe[0].data[0].texture, _feedback.pframe[0].data[1].texture], 2);

            _feedback.pframe[1].data[0] = _create2DTexture({ width: _canvas.width, height: _canvas.height, empty: true, float: true });
            _feedback.pframe[1].data[1] = _create2DTexture({ width: _canvas.width, height: _canvas.height, empty: true, float: true });
            _feedback.pframe[1].buffer = _createFramebuffer([_feedback.pframe[1].data[0].texture, _feedback.pframe[1].data[1].texture], 2);
        }
    }
    
    _compile();
};

var _buildMainFBO = function () {
    var float_textures = false;
    
    if (_gl2) {
        if (_main_program) {
            _gl.deleteProgram(_main_program);
        }
        
        _main_program = _createAndLinkProgram(
                _createShader(_gl.VERTEX_SHADER, document.getElementById("vertex-shader").text),
                _createShader(_gl.FRAGMENT_SHADER, _generic_fragment_shader)
            );
    
        if (!_main_program) {
            _notification("Could not enable multi-output feature.");
            
            return;
        }
        
        _useProgram(_main_program);
        _gl.uniform2f(_gl.getUniformLocation(_main_program, "resolution"), _canvas.width, _canvas.height);
        
        if (_main_attch0) {
            _gl.deleteTexture(_main_attch0);
        }

        if (_main_attch1) {
            _gl.deleteTexture(_main_attch1);
        }

        if (_main_fbo) {
            _gl.deleteFramebuffer(_main_fbo);
        }
        
        if (_EXT_color_buffer_float) {
            float_textures = true;
        }

        _main_attch0 = _create2DTexture({ width: _canvas.width, height: _canvas.height, empty: true, float: float_textures }).texture;
        _main_attch1 = _create2DTexture({ width: _canvas.width, height: _canvas.height, empty: true, float: float_textures }).texture;
        _main_fbo = _createFramebuffer([_main_attch0, _main_attch1], 2);
    }
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

var _drawTimeDomainSpectrum = function () {
    var times = new Uint8Array(_analyser_node.frequencyBinCount),
        bar_width = _analysis_canvas.width / times.length,
        value = 0,
        bar_height = 0,
        i = 0;
    
    _analyser_node.getByteTimeDomainData(times);

    _analysis_canvas_ctx.fillStyle = 'black';
    
    for (i = 0; i < times.length; i += 1) {
        bar_height = _analysis_canvas.height * (times[i] / 256);

        _analysis_canvas_ctx.fillRect(i * bar_width, _analysis_canvas.height - bar_height - 1, 1, 1);
    }
};

var _drawSpectrum = function () {
    if (_is_analyser_node_connected) {
        var freq_bin_length,
            px_index = 0,
            value = 0,
            index = 0,
            y = 0,
            i = 0;
    
        if (!_fas.enabled) {
            _analyser_node.getByteFrequencyData(_analyser_freq_bin);
        } else { // TEMPORARY
            return;
        }
        
        freq_bin_length = _analyser_freq_bin.length;

        _analysis_canvas_tmp_ctx.drawImage(_analysis_canvas, 0, 0, _analysis_canvas.width, _analysis_canvas.height);

        for (i = 0; i < freq_bin_length; i += 1) {
            if (_fas.enabled) {
                //index = (_getFrequency(i) / _sample_rate * _analyser_freq_bin.length);
                
                px_index = Math.round(_getFrequency(i) / _sample_rate * _canvas_height) * 4;
                value = Math.round((_data[px_index] + _data[px_index + 1]) / 2);
            } else {
                if (_analysis_log_scale) {
                    value = _analyser_freq_bin[_logScale(i, freq_bin_length)];
                } else {
                    value = _analyser_freq_bin[i];
                } 
            }
            
            y = Math.round(i / freq_bin_length * _analysis_canvas.height);
            
            if (_analysis_colored) {
                _analysis_canvas_ctx.fillStyle = _spectrum_colors[value];
            } else {
                value = (255 - value) + '';
                _analysis_canvas_ctx.fillStyle = 'rgb(' + value + ',' + value + ',' + value + ')';
            }
            
            _analysis_canvas_ctx.fillRect(_analysis_canvas.width - _analysis_speed, _analysis_canvas.height - y, _analysis_speed, _analysis_speed);
        }

        _analysis_canvas_ctx.translate(-_analysis_speed, 0);
        _analysis_canvas_ctx.drawImage(_analysis_canvas, 0, 0, _analysis_canvas.width, _analysis_canvas.height, 0, 0, _analysis_canvas.width, _analysis_canvas.height);

        _analysis_canvas_ctx.setTransform(1, 0, 0, 1, 0, 0);
    }  
};

var _allocateFramesData = function () {
    var i = 0;
    
    _data = [];
    _prev_data = [];
    
    for (i = 0; i < _output_channels; i += 1) {
        _data.push(new _synth_data_array(_canvas_height_mul4));
        _prev_data.push(new _synth_data_array(_canvas_height_mul4));
    }
};

var _canvasRecord = function (ndata) {
    var min_r = 255, max_r = 0, 
        min_g = 255, max_g = 0,
        min_b = 255, max_b = 0,
    
        ro = 0,
        go = 1,
        bo = 2,
        
        i = 0, j = 0, o = 0, m = 1,
        
        data, temp_data;
    
    if (_record) {
        _record_position += 1;
        if (_record_position > _canvas_width) {
            _record_position = 0;
        }

        // merge all
        temp_data = new Uint8Array(_canvas_height_mul4);

        if (_read_pixels_format === _gl.FLOAT) {
            m = 255;
        }
        
        for (i = 0; i < _output_channels; i += 1) {
            for (j = 0; j <= _canvas_height_mul4; j += 1) {
                temp_data[j] += ndata[i][j] * m;
                
                temp_data[j] = Math.min(temp_data[j], 255);
            }
        }
        
        if (_record_opts.f !== _record_opts.default)  {
            data = _record_canvas_ctx.getImageData(_record_position, 0, 1, _record_canvas.height).data;
        } else {
            data = new Uint8Array(_canvas_height_mul4);
        }

        if (_audio_infos.monophonic) {
            ro = go = bo = 3;
        }

        for (i = 0; i <= _canvas_height_mul4; i += 4) {
            o = _canvas_height_mul4 - i;

            data[o] = _record_opts.f(data[o], temp_data[i + ro]);
            data[o + 1] = _record_opts.f(data[o + 1], temp_data[i + go]);
            //data[o + 2] = _record_opts.f(data[o + 2], temp_data[i + bo]);
            data[o + 3] = 255;
/*
            min_r = Math.min(min_r, data[i]);
            min_g = Math.min(min_g, data[i + 1]);
            min_b = Math.min(min_b, data[i + 2]);

            max_r = Math.max(max_r, data[i]);
            max_g = Math.max(max_g, data[i + 1]);
            max_b = Math.max(max_b, data[i + 2]);
*/
        }
/*
        max_r = 255 / (max_r - min_r);
        max_g = 255 / (max_g - min_g);
        max_b = 255 / (max_b - min_b);

        for (i = 0; i < _canvas_height_mul4; i += 4) {
            data[i] -= min_r;
            data[i + 1] -= min_g;
            data[i + 2] -= min_b;
            
            data[i] *= max_r;
            data[i + 1] *= max_g;
            data[i + 2] *= max_b;
        }
*/
        _record_slice_image.data.set(data);

        _record_canvas_ctx.putImageData(_record_slice_image, _record_position, 0);
/*
        for (i = 0; i < _fragment_input_data.length; i += 1) {
            fragment_input = _fragment_input_data[i];

            if (fragment_input.type === 2) {
                _gl.bindTexture(_gl.TEXTURE_2D, fragment_input.texture);
                _gl.texSubImage2D(_gl.TEXTURE_2D, 0, 0, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, _record_canvas);
            }
        }
*/
    }    
};

var _frame = function (raf_time) {
    var i = 0, j = 0, o = 0,

        play_position_marker,
        play_position_marker_x = 0,
        
        fsas_data,
        
        fragment_input,
        
        current_frame,
        previous_frame,
        
        time_now = performance.now(),
        
        global_time = (raf_time - _time) / 1000,
        
        iglobal_time,

        date = new Date(),
        
        channel = 0,
        channel_data,
        
        fas_enabled = _fasEnabled(),
        
        f, v, key,
        
        data,
        
        buffer = [];
    
    _MIDInotesUpdate(date);
    
    if (_feedback.enabled) {
        current_frame = _feedback.pframe[_feedback.index];
        previous_frame = _feedback.pframe[(_feedback.index + 1) % 2];

        _gl.bindFramebuffer(_gl.FRAMEBUFFER, current_frame.buffer);
        _gl.viewport(0, 0, _canvas_width, _canvas_height);
        
        _useProgram(_program);
        
        o = _fragment_input_data.length;
        
        if (_gl2) {
            _gl.activeTexture(_gl.TEXTURE0 + o);
            _gl.bindTexture(_gl.TEXTURE_2D, previous_frame.data[0].texture);
            _gl.uniform1i(_getUniformLocation("pFrameSynth", _program), o);
            
            _gl.activeTexture(_gl.TEXTURE0 + o + 1);
            _gl.bindTexture(_gl.TEXTURE_2D, previous_frame.data[1].texture);
            _gl.uniform1i(_getUniformLocation("pFrame", _program), o + 1);
        } else {
            _gl.activeTexture(_gl.TEXTURE0 + o);
            _gl.bindTexture(_gl.TEXTURE_2D, previous_frame.data[0].texture);
            _gl.uniform1i(_getUniformLocation("pFrame", _program), o);
        }

        _feedback.index += 1;
        _feedback.index = _feedback.index % 2;
    } else {
        _gl.bindFramebuffer(_gl.FRAMEBUFFER, _main_fbo);
        _useProgram(_program);
    }
    
    _gl.uniform4fv(_getUniformLocation("keyboard"), _keyboard.data);

    //_gl.useProgram(_program);
    _gl.uniform1f(_getUniformLocation("globalTime"), global_time);
    _gl.uniform1f(_getUniformLocation("octave"), _audio_infos.octaves);
    _gl.uniform1f(_getUniformLocation("baseFrequency"), _audio_infos.base_freq);
    _gl.uniform4f(_getUniformLocation("mouse"), _nmx, _nmy, _cnmx, _cnmy);
    _gl.uniform4f(_getUniformLocation("date"), date.getFullYear(), date.getMonth(), date.getDay(), date.getSeconds());
    _gl.uniform1i(_getUniformLocation("frame", _program), _globalFrame);

    // fragment inputs
    for (i = 0; i < _fragment_input_data.length; i += 1) {
        fragment_input = _fragment_input_data[i];

        if (fragment_input.type === 0 ||
           fragment_input.type === 2) { // 2D texture from image
                _gl.activeTexture(_gl.TEXTURE0 + i);
                _gl.bindTexture(_gl.TEXTURE_2D, fragment_input.texture);
                _gl.uniform1i(_getUniformLocation(_input_channel_prefix + i), i);
        } else if (fragment_input.type === 1 || fragment_input.type === 3) { // video/camera
            if (fragment_input.video_elem.readyState === fragment_input.video_elem.HAVE_ENOUGH_DATA) {
                if (fragment_input.type === 3) {
                    _gl.uniform1f(_getUniformLocation(_input_video_prefix + i), fragment_input.video_elem.currentTime / fragment_input.video_elem.duration);
                }
                
                _gl.activeTexture(_gl.TEXTURE0 + i);
                _gl.bindTexture(_gl.TEXTURE_2D, fragment_input.texture);
                _gl.uniform1i(_getUniformLocation(_input_channel_prefix + i), i);

                _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, _gl.RGBA, _gl.UNSIGNED_BYTE, fragment_input.image);
            }
        }
    }

    //_gl.bindBuffer(_gl.ARRAY_BUFFER, _quad_vertex_buffer);
    _gl.drawArrays(_gl.TRIANGLE_STRIP, 0, 4);

    if (_feedback.enabled) {
        _gl.bindFramebuffer(_gl.FRAMEBUFFER, _main_fbo);

        _gl.viewport(0, 0, _canvas_width, _canvas_height);
        _useProgram(_feedback.program);
        
        if (_main_fbo) {
            _gl.activeTexture(_gl.TEXTURE0);
            _gl.bindTexture(_gl.TEXTURE_2D, current_frame.data[0].texture);
            _gl.uniform1i(_getUniformLocation("synthInput", _feedback.program), 0);
            _gl.activeTexture(_gl.TEXTURE1);
            _gl.bindTexture(_gl.TEXTURE_2D, current_frame.data[1].texture);
            _gl.uniform1i(_getUniformLocation("colorInput", _feedback.program), 1);
        } else {
            _gl.activeTexture(_gl.TEXTURE0);
            _gl.bindTexture(_gl.TEXTURE_2D, current_frame.data[0].texture);
            _gl.uniform1i(_getUniformLocation("texture", _feedback.program), 0);
        }
        
        _gl.drawArrays(_gl.TRIANGLE_STRIP, 0, 4);
    }
    
    if (_main_fbo) {
        _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);
        _gl.viewport(0, 0, _canvas_width, _canvas_height);
        _useProgram(_main_program);
        
        _gl.activeTexture(_gl.TEXTURE0);
        _gl.bindTexture(_gl.TEXTURE_2D, _main_attch1);
        
        _gl.uniform1i(_gl.getUniformLocation(_main_program, "texture"), 0);
        
        _gl.drawArrays(_gl.TRIANGLE_STRIP, 0, 4);
        
        _gl.bindFramebuffer(_gl.FRAMEBUFFER, _main_fbo);
    }
    
    if ((_notesWorkerAvailable() || fas_enabled) && _play_position_markers.length > 0) {
        if (_gl2) {
            _gl.bindBuffer(_gl.PIXEL_PACK_BUFFER, _pbo);
            _gl.bufferData(_gl.PIXEL_PACK_BUFFER, _pbo_size, _gl.STATIC_READ);
        }

        // populate array first
        play_position_marker = _play_position_markers[0];
        
        channel = play_position_marker.output_channel - 1;
        
        if (play_position_marker.mute) {
            _data[channel] = new _synth_data_array(_canvas_height_mul4);
        } else {
            if (play_position_marker.frame_increment != 0) {
                _setPlayPosition(play_position_marker.id, play_position_marker.x + play_position_marker.frame_increment, play_position_marker.y, false, true);
            }
            
            play_position_marker_x = play_position_marker.x;
            
            if (_gl2) {
                _gl.readPixels(play_position_marker_x, 0, 1, _canvas_height, _gl.RGBA, _read_pixels_format, 0);
                _gl.getBufferSubData(_gl.PIXEL_PACK_BUFFER, 0, _data[channel]);
            } else {
                _gl.readPixels(play_position_marker_x, 0, 1, _canvas_height, _gl.RGBA, _read_pixels_format, _data[channel]);
            }

            _transformData(play_position_marker, _data[channel]);
        }

        for (i = 1; i < _play_position_markers.length; i += 1) {
            play_position_marker = _play_position_markers[i];
            
            if (play_position_marker.mute) {
                continue;
            }
            
            if (play_position_marker.frame_increment != 0) {
                _setPlayPosition(play_position_marker.id, play_position_marker.x + play_position_marker.frame_increment, play_position_marker.y, false, true);
            }
            
            play_position_marker_x = play_position_marker.x;
            
            channel = play_position_marker.output_channel - 1;

            if (_gl2) {
                _gl.readPixels(play_position_marker_x, 0, 1, _canvas_height, _gl.RGBA, _read_pixels_format, 0);
                _gl.getBufferSubData(_gl.PIXEL_PACK_BUFFER, 0, _temp_data);
            } else {
                _gl.readPixels(play_position_marker_x, 0, 1, _canvas_height, _gl.RGBA, _read_pixels_format, _temp_data);
            }
     
            _transformData(play_position_marker, _temp_data);

            channel_data = _data[channel];

            // merge slices data
            for (j = 0; j <= _canvas_height_mul4; j += 1) {
                channel_data[j] = channel_data[j] + _temp_data[j];
            }
        }
    
        for (i = 0; i < _output_channels; i += 1) {
            buffer.push(new _synth_data_array(_canvas_height_mul4));
        }
        
        if (_show_oscinfos) {
            var arr_infos = [];
            for (j = 0; j < _output_channels; j += 1) {
                var c = 0;

                for (i = 0; i <= _canvas_height_mul4; i += 4) {
                    if (_data[j][i] > 0) {
                        c += 1;
                    } else if (_data[j][i + 1] > 0) {
                        c += 1;
                    }
                }

                arr_infos.push(c);
            }

            _osc_infos.textContent = arr_infos.join(" ");
        }
        
        _canvasRecord(_data);
        
        // OSC
        if (_osc.enabled) {
            if (_osc.out) {
                // make a copy of all channels again
                var buffer_osc = [];
                for (i = 0; i < _output_channels; i += 1) {
                    buffer_osc.push(new _synth_data_array(_data[i]));
                }
                
                // and prev_data
                for (i = 0; i < _output_channels; i += 1) {
                    buffer_osc.push(new _synth_data_array(_prev_data[i]));
                }

                _oscNotifyFast(_OSC_FRAME_DATA, buffer_osc);
            }
        }
        
        if (fas_enabled) {
            _fasNotifyFast(_FAS_FRAME, _data);
        } else {
            _notesProcessing(_data, _prev_data);
            /*
            if (_osc_mode === _FS_WAVETABLE) {
                _data = buffer;
            }*/
        }
        
        for (i = 0; i < _output_channels; i += 1) {
            _prev_data[i] = new _synth_data_array(buffer[i]);
        }
        
        _data = buffer;
        
        //_midiDataOut(_data, _prev_data);
        
        // detached canvas (by a double click) TODO : Optimizations
/*
        if (_detached_canvas_ctx) {
            if (_gl2) {
                _gl.bindBuffer(_gl.PIXEL_PACK_BUFFER, _pbo);
                _gl.bufferData(_gl.PIXEL_PACK_BUFFER, _canvas_width * _canvas_height * 4, _gl.STATIC_READ);
                _gl.readPixels(0, 0, _canvas_width, _canvas_height, _gl.RGBA, _gl.UNSIGNED_BYTE, 0);
                _gl.getBufferSubData(_gl.PIXEL_PACK_BUFFER, 0, _detached_canvas_buffer);
            } else {
                _gl.readPixels(0, 0, _canvas_width, _canvas_height, _gl.RGBA, _gl.UNSIGNED_BYTE, _detached_canvas_buffer);
            }
            
            for (i = 0; i < _detached_canvas_buffer.length; i += 4) {
                _detached_canvas_buffer[i + 3] = 255;
            }

            _detached_canvas_image_data.data.set(_detached_canvas_buffer);

            _detached_canvas_ctx.putImageData(_detached_canvas_image_data, 0, 0);
        }
*/
    }
    
    if (_show_globaltime) {
        iglobal_time = parseInt(global_time, 10);
        if (parseInt(_time_infos.textContent, 10) !== iglobal_time) {
            _time_infos.textContent = iglobal_time;
        }
    }
    
    if (_show_polyinfos) {
        _poly_infos_element.textContent = _keyboard.polyphony;
    }
    
    _globalFrame += 1;
    
    _MIDInotesCleanup();
    
    _raf = window.requestAnimationFrame(_frame);
};