/*jslint browser: true*/
/*continue: true*/
/*global self, postMessage*/

var sine_lookup_size = 8192,
    sine_lookup_size_m1 = sine_lookup_size - 1,
    sine_lookup = new Float32Array(sine_lookup_size),
    
    sine_lookup_phase = 0,
    sine_lookup_phase_step = 2 * Math.PI / sine_lookup_size,
    
    s = 0,
    
    oscillators = [];

for (s = 0; s < sine_lookup_size; s += 1) {
    sine_lookup[s] = Math.sin(sine_lookup_phase);

    sine_lookup_phase += sine_lookup_phase_step;
}

self.onmessage = function (m) {
    "use strict";

    var w = m.data,

        sample_rate = w.sample_rate,
        
        notes = w.data,
        curr_notes = notes[0],
        
        note,
        
        note_time = 1 / (w.options.sps ? w.options.sps : 60),
        note_time_samples = Math.round(note_time * sample_rate),
        
        data_l = null,
        data_r = null,
        
        output_l = 0.0,
        output_r = 0.0,
        
        avg_l = 0,
        avg_r = 0,
        
        max_l = 0,
        max_r = 0,
        
        n = 0,
        
        sample = 0,
    
        lerp_t_step = 1 / note_time_samples,
   
        curr_sample = 0,
        
        osc = null,
        
        base_frequency = 16.34,
        octave_length,
        frequency,
        phase_step,
        
        lerp_t = 0,
    
        j = 0, s = 0, n = 0;

    if (w.options.octaves) {
        octave_length = w.height / w.options.octaves;
    } else {
        octave_length = w.height / 10;
    }
    
    if (w.options.baseFrequency) {
        base_frequency = w.options.baseFrequency;
    }

    // initialize oscillators
    for (j = 0; j < w.height; j += 1) {
        frequency = base_frequency * Math.pow(2, j / octave_length);
        phase_step = frequency / sample_rate * sine_lookup_size;
        
        oscillators[(w.height - 1) - j] = {
                phase_step: phase_step,
                phase_index: Math.random() * sine_lookup_size_m1, 
            };
    }
    
    data_l = [];
    data_r = [];

    var sample = 0;
    while (1) {
        output_l = 0.0;
        output_r = 0.0;
        
        for (j = 0; j < curr_notes.length; j += 1) {
            note = curr_notes[j];
            osc = oscillators[note.y];
            
            s = sine_lookup[osc.phase_index & sine_lookup_size_m1];

            output_l += (note.pl + note.dl * lerp_t) * s;
            output_r += (note.pr + note.dr * lerp_t) * s;

            osc.phase_index += osc.phase_step;
        }

        data_l[sample] = output_l;
        data_r[sample] = output_r;
        
        avg_l += Math.abs(output_l);
        avg_r += Math.abs(output_r);
        
        max_l = Math.max(output_l, max_l);
        max_r = Math.max(output_r, max_r);

        lerp_t += lerp_t_step;

        curr_sample += 1;

        if (curr_sample >= note_time_samples) {
            lerp_t = 0;

            curr_sample = 0;

            n += 1;
            
            if (n === w.data.length) {
                break;
            }

            curr_notes = w.data[n];
        }

        sample += 1;
    }

    var sample_length = data_l.length;
    
    var ratio_l = 1.0 - max_l;
    var ratio_r = 1.0 - max_r;
    
    for (sample = 0; sample < sample_length; sample += 1) {
        data_l[sample] /= ratio_l;
        data_r[sample] /= ratio_r;
    }
    
    var smooth_samples = 8;
    var factor_step = 1.0 / smooth_samples;
    var factor = 0.0;

    if (sample_length > (smooth_samples * 4)) {
        for (sample = 0; sample < smooth_samples; sample += 1) {
            data_l[sample] *= factor;
            data_r[sample] *= factor;

            data_l[sample_length - sample - 1] *= factor;
            data_r[sample_length - sample - 1] *= factor;

            factor += factor_step;
        }
    }

    avg_l /= sample_length;
    avg_r /= sample_length;

    var data_lb = new Float32Array(data_l);
    var data_rb = new Float32Array(data_r);

    postMessage({ 
            uid: w.uid,
            length: sample_length,
            data_l: data_lb,
            data_r: data_rb,
            avg_l: avg_l,
            avg_r: avg_r,
            opts: w.options,
        }, [data_lb.buffer, data_rb.buffer]);
};