/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

/***********************************************************
    Functions.
************************************************************/

var _canvasInputUpdate = function (input_obj) {
    clearTimeout(input_obj.update_timeout);
    input_obj.update_timeout = setTimeout(function () {
            var image_data,   
                m;

                if (input_obj.db_obj.settings.flip) {
                    var tmp_canvas = document.createElement('canvas'),
                        tmp_canvas_context = tmp_canvas.getContext('2d');
                    
                    tmp_canvas.width = input_obj.canvas.width;
                    tmp_canvas.height = input_obj.canvas.height;
                
                    tmp_canvas_context.translate(0, input_obj.canvas.height);
                    tmp_canvas_context.scale(1, -1);
                    tmp_canvas_context.drawImage(input_obj.canvas, 0, 0, input_obj.canvas.width, input_obj.canvas.height);

                    image_data = tmp_canvas_context.getImageData(0, 0, input_obj.canvas.width, input_obj.canvas.height);

                    m = { img_width: image_data.width, img_height: image_data.height, data: image_data.data };
                } else {
                    image_data = input_obj.canvas_ctx.getImageData(0, 0, input_obj.canvas.width, input_obj.canvas.height);

                    m = { img_width: image_data.width, img_height: image_data.height, data: image_data.data };
                }
        
                _gl.bindTexture(_gl.TEXTURE_2D, input_obj.texture);
                _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, m.img_width, m.img_height, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, new Uint8Array(m.data));
                _gl.bindTexture(_gl.TEXTURE_2D, null);
                
                input_obj.db_obj.data = input_obj.canvas.toDataURL();
                
                var input_id = _parseInt10(input_obj.elem.dataset.inputId);
                
                _dbUpdateInput(input_id, input_obj.db_obj);
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

var _canvasInputPaintStop = function () {
    if (_selected_input_canvas) {
        _selected_input_canvas.mouse_btn = 0;
    }
    
    document.body.classList.remove("fs-no-select");
};

var _canvasInputClear = function (input_obj) {
    input_obj.canvas_ctx.clearRect(0, 0, input_obj.canvas.width, input_obj.canvas.height);
};

var _canvasInputDimensionsUpdate = function (new_width, new_height) {
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
            
            //_flipYTexture(fragment_input_data.texture, true);
            
            _canvasInputUpdate(fragment_input_data);
            
            input_id = _parseInt10(fragment_input_data.elem.dataset.inputId);
            
            _dbUpdateInput(input_id, fragment_input_data.db_obj);
        } else if (fragment_input_data.type === 6) {
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
            
            //_flipYTexture(fragment_input_data.texture, true);
            
            //_canvasInputUpdate(fragment_input_data);
            
            input_id = _parseInt10(fragment_input_data.elem.dataset.inputId);
            
            _dbUpdateInput(input_id, fragment_input_data.db_obj);
        }
    }
};
