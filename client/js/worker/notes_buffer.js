/*jslint browser: true*/
/*continue: true*/
/*global self,postMessage*/

/* 
    This worker transform pixels score into a sequence of optimized notes events.
    
    note_buffer format -> 
        
        [y, previous_volume_left, previous_volume_right, diff_volume_left, diff_volume_right, ...]
        - 'y' is the oscillator index
        
    // NOTE : Same as notes_renderer.js except it can process a 1px wide slice not a whole image (and the output data is optimized)
    // DEPRECATION NOTE : This code is unused & not loaded, it was made for WebAudio script processor wavetable, check fragment_worklet.js now
*/
self.onmessage = function (m) {
    "use strict";

    var score_height = m.data.score_height,
    
        note_buffer = new Float32Array(score_height * 5),
        
        prev_data,
        data,
        
        pvl = 0, pvr = 0, pr, pg, r, g,
        inv_full_brightness,

        dlen,
        y = score_height - 1, i,
        volume_l, volume_r,
        index = 0,
        li = 0,
        ri = 1;
    
    if (m.data.float) {
        prev_data = new Float32Array(m.data.prev_data);
        data = new Float32Array(m.data.data);
        
        inv_full_brightness = 1;
    } else {
        prev_data = new Uint8ClampedArray(m.data.prev_data);
        data = new Uint8ClampedArray(m.data.data);
        
        inv_full_brightness = 1 / 255.0;
    }
    
    dlen = data.length;
    
    if (m.data.mono) {
        li = 3;
        ri = 3;
    }

    for (i = 0; i < dlen; i += 4) {
        pr = prev_data[i + li];
        pg = prev_data[i + ri];

        r = data[i + li];
        g = data[i + ri];

        if (r > 0 || g > 0) {
            volume_l = r * inv_full_brightness;
            volume_r = g * inv_full_brightness;

            pvl = pr * inv_full_brightness;
            pvr = pg * inv_full_brightness;

            note_buffer[index] = y;
            note_buffer[index + 1] = pvl;
            note_buffer[index + 2] = pvr;
            note_buffer[index + 3] = volume_l - pvl;
            note_buffer[index + 4] = volume_r - pvr;
        } else {
            if (pr > 0 || pg > 0) {
                pvl = pr * inv_full_brightness;
                pvr = pg * inv_full_brightness;

                note_buffer[index] = y;
                note_buffer[index + 1] = pvl;
                note_buffer[index + 2] = pvr;
                note_buffer[index + 3] = -pvl;
                note_buffer[index + 4] = -pvr;
            } else {
                y -= 1;
                continue;
            }
        }

        y -= 1;

        index += 5;
    }
    
    postMessage({d: note_buffer.buffer}, [note_buffer.buffer]);
};