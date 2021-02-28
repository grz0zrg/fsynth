  // Sample program : simple additive synthesis with per partial noise

  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0., n = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;
    
    const float enable_noise = 2.;

    float start_frequency = 314.;
    float harmonics = abs(16. + sin(globalTime + uv.x * PI2 + uv.y * PI2 * 4.) * 8.);
    
    // 1 = saw wave (even harmonics), 2 = square wave (odd harmonics)
    const float harmonics_step = 1.;
    for (float h = 1.; h < harmonics; h += max(1., harmonics_step)) {
        // normalize
      	float nh = h / harmonics;
        // modulate attenuation factor (filter cutoff)
      	float attenuation_factor = 5.0 + sin(mod(globalTime + (uv.y * 3.1415 - 1. + uv.x * 2.), 0.095) * 128. * PI2) * 2.75;
        // attenuate high frequencies harmonics (filter)
        float attenuation = pow(1. - nh, attenuation_factor);
      
      	// apply varying amplitude 
      	float amplitude_osc = abs(sin(uv.y * PI2 + uv.x * PI * 2. + globalTime));
      	attenuation *= amplitude_osc;
      
      	// apply varying noise (noise amount is sent in alpha synthOutput parameter)
      	float noise_osc = abs(sin(uv.y * PI2 * 8. + uv.x * PI * 8. + globalTime * 2.)) * (uv.y * 2.);

      	float harmonic_frequency = start_frequency * h;
        
    	l += fline(harmonic_frequency) * attenuation;
      	r += fline(harmonic_frequency) * attenuation;
      	n += fline(harmonic_frequency) * noise_osc;
    }

    synthOutput = vec4(l, r, enable_noise, n);
    fragColor = vec4(l, r, 0., 1.);
  }

