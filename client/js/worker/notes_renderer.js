/*jslint browser: true*/
/*continue: true*/
/*global self,postMessage*/

/* 
    This worker transform pixels score into notes
    
    // NOTE : Same as notes_buffer.js except it can process a whole image not just a slice (and the output data is different)
*/
self.onmessage = function (m) {
    "use strict";

    var w = m.data,
        score_width = w.width,
        score_height = w.height,
        score_rgba_width = score_width * 4,
    
        notes = [],
        
        data,
        
        pvl = 0, pvr = 0, pr, pg, r = 0, g = 0,
        inv_full_brightness,

        dlen,
        
        i, j,
        
        volume_l, volume_r,
        index = 0,
        data_index = 0,
        offset_y = 0,
        li = 0,
        ri = 1;

    if (w.options.float) {
        data = new Float32Array(w.data);
        
        inv_full_brightness = 1;
    } else {
        data = new Uint8ClampedArray(w.data);
        
        inv_full_brightness = 1 / 255.0;
    }
    
    dlen = data.length;

    if (w.options.flipY) {
        offset_y = -(score_height - 1);
    }

    for (i = 0; i < score_height; i += 1) {
        r = 0;
        g = 0;
        
        for (j = 0; j < score_width; j += 1) {
            data_index = i * score_rgba_width + j * 4;
            
            pr = r;
            pg = g;

            r = data[data_index + li];
            g = data[data_index + ri];
            
            if (!notes[j]) {
                notes[j] = [];
            }

            if (r > 0 || g > 0) {
                volume_l = r * inv_full_brightness;
                volume_r = g * inv_full_brightness;

                pvl = pr * inv_full_brightness;
                pvr = pg * inv_full_brightness;

                notes[j].push({
                    y: i + offset_y,
                    pl: pvl,
                    pr: pvr,
                    dl: volume_l - pvl,
                    dr: volume_r - pvr
                });
            } else {
                if (pr > 0 || pg > 0) {
                    pvl = pr * inv_full_brightness;
                    pvr = pg * inv_full_brightness;

                    notes[j].push({
                        y: i + offset_y,
                        pl: pvl,
                        pr: pvr,
                        dl: -pvl,
                        dr: -pvr
                    });
                }
            }
        }
    }
    
    postMessage({
            uid: w.uid,
            width: w.width,
            height: w.height,
            options: w.options,
            data: notes
        });
};