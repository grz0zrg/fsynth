  // Sample program : spectral synthesis
  // Note :
  //   Must add/select "Spectral" instrument in "SYNTH". (with mode 1 in "Parameter")
  // This is similar to additive synthesis except it use a fourrier transform instead of an oscillators sum.
  // The bank resolution is limited by the window size parameter. (see "Window size" in instrument "Parameters")

  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0., pl = 0., pr = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;

    float start_frequency = 60.;
    float harmonics = 32. + sin(globalTime + uv.x * PI + uv.y * PI2 * 1.) * 8.;
    
    // 1 = saw wave (even harmonics), 2 = square wave (odd harmonics)
    const float harmonics_step = 1.;
    for (float h = 1.; h < harmonics; h += max(1., harmonics_step)) {
        // normalize
      	float nh = h / harmonics;
        // modulate attenuation factor (filter cutoff)
      	float attenuation_factor = 2.0 + sin(mod(globalTime + (uv.x / (0.5 + uv.y / 2.)), 0.5) * PI2 * 24.) * 1.;
        // attenuate high frequencies harmonics (filter)
        float attenuation = pow(1. - nh, attenuation_factor);
      
      	// apply varying amplitude 
      	float amplitude_osc = abs(sin(uv.y * PI2 + uv.x * PI + globalTime));
      	attenuation *= amplitude_osc;

      	float harmonic_frequency = start_frequency * h;
      
        // bin amplitude
    	l += fline(harmonic_frequency) * attenuation * 2.;
      	r += fline(harmonic_frequency) * attenuation * 2.;
        // phase informations
    	pl += fline(harmonic_frequency) * attenuation;
      	pr += fline(harmonic_frequency) * attenuation;
    }

    synthOutput = vec4(l, r, pl, pr);
    gl_FragColor = vec4(l, r, 0., 1.);
  }

