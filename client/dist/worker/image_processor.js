/*jslint browser: true*/
/*continue: true*/
/*global self,postMessage*/

/**
 * This worker convert the black color of an image pixels data to alpha
 */
self.onmessage = function (m) {
    "use strict";
    
    var img_buffer = new Uint8ClampedArray(m.data.buffer),
        img_width  = m.data.img_width,
        img_height = m.data.img_height,
        x          = 0,
        y          = 0,
        line_index = 0,
        i          = 0,
        ip1        = 0,
        ip2        = 0,
        ip3        = 0,
        avg        = 0,
        alpha      = 0;
        
    for (y = 0; y < img_height; y += 1) {
        line_index = (y * 4) * img_width;
        
        for (x = 0; x < img_width; x += 1) {
            i   = line_index + x * 4;
            ip1 = i + 1;
            ip2 = i + 2;
            ip3 = i + 3;
            
            avg = (img_buffer[i] + img_buffer[ip1] + img_buffer[ip2]) / 3;
            
            if (avg === 0.0) {
                alpha = 0.0;
            } else {
                alpha = avg / 255.0;
            }
            
            alpha *= 255.0;
            
            if (alpha >= 1.0) {
                avg = 255.0 * avg / img_buffer[ip3];
                
                alpha *= img_buffer[ip3] / 255.0;
            }
            
            img_buffer[ip3] = alpha;
        }
    }
    
    postMessage({img_width: img_width, img_height: img_height, data: img_buffer.buffer}, [img_buffer.buffer]);
};