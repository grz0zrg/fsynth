/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _pvx = 0,
    _pvy = 0,
    
    _paint_start_time = 0,
    
    _paint_lock_x = false,
    _paint_lock_y = false,
    
    _paint_delay = 0,
    _paint_random = false,

    _paint_brush = null,
    _paint_mode = "source-over",
    _paint_scalex = 0.15,
    _paint_scaley = 0.15,
    _paint_opacity = 0.25,
    _paint_angle = 0;

/***********************************************************
    Functions.
************************************************************/

var _paint = function (ctx, brush, mode, x, y, scale_x, scale_y, angle, opacity) {
    var brush_width,
        brush_height,
        brush_width_d2,
        brush_height_d2,
        drawing_x,
        drawing_y,
        xinc,
        yinc,
        step,
        dx,
        dy,
        
        i = 0;
    
    if (_paint_delay !== 0) {
        if ((performance.now() - _paint_start_time) > _paint_delay) {
            _draw(ctx, brush, mode, x, y, scale_x, scale_y, angle, opacity);

            _paint_start_time = performance.now();

            return;
        } else {
            return;
        }
    }
    
    if (_paint_random) {
        angle = _random(0, angle);
        scale_x = _random(0, scale_x);
        scale_y = _random(0, scale_y);
        opacity = _random(0, opacity);
    }
    
    ctx.globalAlpha = opacity;
    
    brush_width  = brush.naturalWidth * scale_x;
    brush_height = brush.naturalHeight * scale_y;

    brush_width_d2  = brush_width  / 2;
    brush_height_d2 = brush_height / 2;
    
    if (_paint_lock_x) {
        x = _pvx;
    }
    
    if (_paint_lock_y) {
        y = _pvy;
    }
    
    dx = _pvx - x;
    dy = _pvy - y;

    if(Math.abs(dx) > Math.abs(dy)) {
        step = Math.abs(dx);
    } else {
        step = Math.abs(dy);
    }
    
    xinc = dx / step;
    yinc = dy / step;
    
    _pvx = x;
    _pvy = y;
    
    for(i = 1; i <= step; i += 1) {
        x += xinc;
        y += yinc;

        drawing_x = Math.round(x - brush_width_d2);
        drawing_y = Math.round(y - brush_height_d2);

        ctx.save();
        if (mode === 1) {
            ctx.globalCompositeOperation = "destination-out";
        } else {
            ctx.globalCompositeOperation = _paint_mode;
        }
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.translate(drawing_x - x, drawing_y - y);
        ctx.scale(scale_x, scale_y);
        ctx.drawImage(brush, 0, 0);
        ctx.restore();
    }
};

var _paintStart = function (x, y) { 
    _pvx = x;
    _pvy = y;
    
    _paint_start_time = performance.now();
};

var _draw = function (ctx, brush, mode, x, y, scale_x, scale_y, angle, opacity) {
    var brush_width,
        brush_height,
        brush_width_d2,
        brush_height_d2,
        drawing_x,
        drawing_y;
    
    if (_paint_random) {
        angle = _random(0, angle);
        scale_x = _random(0, scale_x);
        scale_y = _random(0, scale_y);
        opacity = _random(0, opacity);
    }
    
    brush_width  = brush.naturalWidth * scale_x;
    brush_height = brush.naturalHeight * scale_y;

    brush_width_d2  = brush_width  / 2;
    brush_height_d2 = brush_height / 2;
    
    drawing_x = Math.round(x - brush_width_d2);
    drawing_y = Math.round(y - brush_height_d2);
    
    ctx.globalAlpha = opacity;
    
    ctx.save();
    if (mode === 1) {
        ctx.globalCompositeOperation = "destination-out";
    } else {
        ctx.globalCompositeOperation = _paint_mode;
    }
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.translate(drawing_x - x, drawing_y - y);
    ctx.scale(scale_x, scale_y);
    ctx.drawImage(brush, 0, 0);
    ctx.restore();
};

var _setPaintCompositingMode = function (mode) {
    return function (e) {
        var detached_dialog = WUI_Dialog.getDetachedDialog(_paint_dialog),
            updated_html = "Brushes (Mode : " + mode + ")";
        
        _paint_mode = mode;
        
        document.getElementById("fs_brushes_info").innerHTML = updated_html;
    
        if (detached_dialog) {
            detached_dialog.document.getElementById("fs_brushes_info").innerHTML = updated_html;
        }
    };
}
