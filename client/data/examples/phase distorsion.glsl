  // Sample program : additive + bandpass instrument
  // Note : 
  //   Must add/select "Additive" instrument in "SYNTH" and move it to the first part of the canvas.
  //   Must add/select "Bandpass" instrument in "SYNTH" and move it to the second part of the canvas.

  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0., g = 0., b = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;

    float start_frequency = 110.;
    float harmonics = 8. + abs(sin(globalTime + uv.x * PI2 * 2.)) * 16.;
    
    // 1 = saw wave (even harmonics), 2 = square wave (odd harmonics)
    const float harmonics_step = 1.;
    for (float h = 1.; h < harmonics; h += max(1., harmonics_step)) {
        // normalize
      	float nh = h / harmonics;
        // modulate attenuation factor (filter cutoff)
      	float attenuation_factor = 3.0 + sin(globalTime * PI2) * 2.;
        // attenuate high frequencies harmonics (filter)
        float attenuation = pow(1. - nh, attenuation_factor);
      
      	// apply varying amplitude 
      	float amplitude_osc = abs(sin(uv.y * PI2 * 1.5 + uv.x * PI * 4. + globalTime));
      	attenuation *= amplitude_osc;

      	float harmonic_frequency = start_frequency * h;
        
      	if (uv.x < 0.5) { // additive (left part of the canvas)
    		l += fline(harmonic_frequency) * attenuation / 16.;
      		r += fline(harmonic_frequency) * attenuation / 16.;
        }
    }
    
    // phase distorsion modifier
    // note : the phase distorsion will play the source channel / instrument and modify it for each 'defined' playing bands
    if (uv.x >= 0.5) {
      	float band = 440.;
      	float source_mode = 0.; // 0 : channel, > 0 : instrument
        float source_index = 0.; // correspond to either channel or instrument index
        // amount of phase distorsion to add to the source, should be between -1 and 1
        float phase_dist_amount = -0.95 - sin(globalTime * 4.) / 40.; // apply some varying distorsion
    	l += fline(band) * 1.;
      	r += fline(band) * 1.;
        g += fline(band) * (source_index + source_mode);
        b += fline(band) * phase_dist_amount;
    }

    synthOutput = vec4(l, r, g, b);
    gl_FragColor = vec4(l, r, 0., 1.);
  }

