  // Sample program : simple additive synthesis
  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;

    float start_frequency = 65.41;
    // number of harmonics (32 + modulation)
    float harmonics = abs(32. + sin(globalTime * 2. + uv.y * PI2 * 8.) * 28.);
    
    // 1 = saw wave (even harmonics), 2 = square wave (odd harmonics)
    const float harmonics_step = 1.;
    for (float h = 1.; h < harmonics; h += max(1., harmonics_step)) {
        // normalize
      	float nh = h / harmonics;
        // modulate attenuation factor (filter cutoff)
      	float attenuation_factor = 4.0 + sin(globalTime * 16. + (uv.y * 4. + uv.x * 2.) * 2. * PI2) * 1.;
        // attenuate high frequencies harmonics (filter)
        float attenuation = pow(1. - nh, attenuation_factor);
      
      	// apply varying amplitude 
      	float amplitude_osc = abs(sin(uv.y * PI2 * 8. + uv.x * PI * 2. + globalTime * 4.));
      	attenuation *= amplitude_osc;

      	float harmonic_frequency = start_frequency * h;
        
    	l += fline(harmonic_frequency) * attenuation;
      	r += fline(harmonic_frequency) * attenuation;
    }

    synthOutput = vec4(l, r, 0., 0.);
    fragColor = vec4(l, r, 0., 1.);
  }
