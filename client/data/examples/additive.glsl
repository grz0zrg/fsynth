  // Sample program : simple additive synthesis

  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;

    float start_frequency = 64.;
    float harmonics = abs(32. + sin(globalTime + uv.x * PI2 + uv.y * PI2 * 32.) * 32.);
    
    // 1 = saw wave (even harmonics), 2 = square wave (odd harmonics)
    const float harmonics_step = 1.;
    for (float h = 1.; h < harmonics; h += max(1., harmonics_step)) {
        // normalize
      	float nh = h / harmonics;
        // modulate attenuation factor (filter cutoff)
      	float attenuation_factor = 8.0 + sin(mod(globalTime + (uv.y * 2. - 1. + uv.x * 8.), 0.5) * 4. * PI2) * 1.;
        // attenuate high frequencies harmonics (filter)
        float attenuation = pow(1. - nh, attenuation_factor);
      
      	// apply varying amplitude 
      	float amplitude_osc = abs(sin(uv.y * PI2 + uv.x * PI * 8. + globalTime));
      	attenuation *= amplitude_osc;

      	float harmonic_frequency = start_frequency * h;
        
    	l += fline(harmonic_frequency) * attenuation;
      	r += fline(harmonic_frequency) * attenuation;
    }

    synthOutput = vec4(l, r, 0., 0.);
    fragColor = vec4(l, r, 0., 1.);
  }
