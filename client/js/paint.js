/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _pvx = 0,
    _pvy = 0,

    _paint_brush = null,
    _paint_scalex = 1,
    _paint_scaley = 1,
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
    
    ctx.globalAlpha = opacity;
    
    brush_width  = brush.naturalWidth * scale_x;
    brush_height = brush.naturalHeight * scale_y;

    brush_width_d2  = brush_width  / 2;
    brush_height_d2 = brush_height / 2;
    
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
};

var _draw = function (ctx, brush, x, y, scale_x, scale_y, angle, opacity) {
    var brush_width,
        brush_height,
        brush_width_d2,
        brush_height_d2,
        drawing_x,
        drawing_y;
    
    drawing_x = Math.round(x - brush_width_d2);
    drawing_y = Math.round(y - brush_height_d2);
    
    ctx.globalAlpha = opacity;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.translate(drawing_x - x, drawing_y - y);
    ctx.scale(scale_x, scale_y);
    ctx.drawImage(brush, 0, 0);
    ctx.restore();
};

