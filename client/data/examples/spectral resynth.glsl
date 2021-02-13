  // Sample program : spectral re-synthesis
  // Note : 
  //   Must add/select "Additive" instrument in "SYNTH" and move it to the first part of the canvas.
  //   Must add/select "Spectral" instrument in "SYNTH" and move it to the second part of the canvas. (with source mode 1 / source instrument 0 parameters)
  //   Window size of the spectral instrument can be changed for different result.

  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0., g = 0., b = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;

    float start_frequency = 220.;
    float harmonics = 8. + abs(sin(globalTime + uv.x * PI2 * 2.)) * 16.;
    
    // 1 = saw wave (even harmonics), 2 = square wave (odd harmonics)
    const float harmonics_step = 1.;
    for (float h = 1.; h < harmonics; h += max(1., harmonics_step)) {
        // normalize
      	float nh = h / harmonics;
        // modulate attenuation factor (filter cutoff)
      	float attenuation_factor = 8.0 + sin(globalTime * PI2) * 2.;
        // attenuate high frequencies harmonics (filter)
        float attenuation = pow(1. - nh, attenuation_factor);
      
      	// apply varying amplitude 
      	float amplitude_osc = abs(sin(uv.y * PI2 * 8. + uv.x * PI + globalTime));
      	attenuation *= amplitude_osc;

      	float harmonic_frequency = start_frequency * h;
        
      	if (uv.x < 0.5) { // additive (left part of the canvas)
    		l += fline(harmonic_frequency) * attenuation / 4.;
      		r += fline(harmonic_frequency) * attenuation / 4.;
        } else { // spectral (right part of the canvas)
            // frequency band 
          	float sf = harmonic_frequency / 2. + sin(globalTime / 2. + nh * PI * 2. + uv.x * 4.) * 32. * uv.y * 24.;
 
            // L & R amplitude factor
    		l += fline(sf) * 6.;
      		r += fline(sf) * 6.;
            // L & R phase factor
            g += fline(sf) * abs(round(sin(globalTime / 2.)));
            b += fline(sf) * abs(round(cos(globalTime / 2.)));
        }
    }

    synthOutput = vec4(l, r, g, b);
    fragColor = vec4(l, r, 0., 1.);
  }
