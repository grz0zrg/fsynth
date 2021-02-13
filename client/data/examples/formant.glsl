  // Sample program : additive + bandpass instrument
  // Note : 
  //   Must add/select "Additive" instrument in "SYNTH" and move it to the first part of the canvas.
  //   Must add/select "Bandpass" instrument in "SYNTH" and move it to the second part of the canvas.

  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0., g = 0., b = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;

    float start_frequency = 220.;
    float harmonics = 8.;//8. + abs(sin(globalTime + uv.x * PI2 * 1.)) * 16.;
    
    // 1 = saw wave (even harmonics), 2 = square wave (odd harmonics)
    const float harmonics_step = 1.;
    for (float h = 1.; h < harmonics; h += max(1., harmonics_step)) {
        // normalize
      	float nh = h / harmonics;
        // modulate attenuation factor (filter cutoff)
      	float attenuation_factor = 1.0;
        // attenuate high frequencies harmonics (filter)
        float attenuation = pow(1. - nh, attenuation_factor);
      
      	// apply varying amplitude 
      	float amplitude_osc = abs(sin(uv.y * PI2 * 1.5 + uv.x * PI * 4. + globalTime));
      	attenuation *= amplitude_osc;

      	float harmonic_frequency = start_frequency * h;
        
      	if (uv.x < 0.5) { // additive (left part of the canvas)
    		l += fline(harmonic_frequency) * attenuation / 8.;
      		r += fline(harmonic_frequency) * attenuation / 8.;
        } else { // bandpass (right part of the canvas)
            // frequency band 
          	float sf = start_frequency * 1. + nh * 512.;
 
            // L & R amplitude factor
    		l += fline(sf) * 0.05;
      		r += fline(sf) * 0.05;
          
            float impulse_response_attack_time = 0.5; // impulse response attack time (seconds, fractional)
            float channel_index = 1.; // correspond to channel index
            float impulse_response_decay_time = 0.025; // impulse response decay time (seconds)

            g += fline(sf) * (channel_index + impulse_response_attack_time);
            b += fline(sf) * impulse_response_decay_time;
        }
    }

    synthOutput = vec4(l, r, g, b);
    fragColor = vec4(l, r, 0., 1.);
  }
