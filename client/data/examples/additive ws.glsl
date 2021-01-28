  // Sample program : additive synthesis with per harmonics waveshaping

  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0.;
    
    const float enable_ws = 2.0;
    
    // waveshaping mode (2) is encoded as integer part of the blue channel
    float wave_a = 2.;
    float wave_b = 0.;

    vec2 uv = gl_FragCoord.xy / resolution;

    float start_frequency = 110.;
    float harmonics = 8.;
    
    const float harmonics_step = 1.;
    for (float h = 1.; h < harmonics; h += max(1., harmonics_step)) {
        // normalize
      	float nh = h / harmonics;
        // modulate attenuation factor (filter cutoff)
      	float attenuation_factor = 1.5 + sin(globalTime * PI2 * (round(cos(globalTime) * 2.) * 2.) + nh * PI2 + cos(uv.x * PI2 * 2.) * PI2);
        // attenuate high frequencies harmonics (filter)
        float attenuation = pow(1. - nh, attenuation_factor);

      	float harmonic_frequency = start_frequency * h;
        
    	l += fline(harmonic_frequency) * attenuation;
      	r += fline(harmonic_frequency) * attenuation;
      
      	// waveshaping wave A & B amount is modulated by this oscillator
        float ws_osc1 = sin(globalTime * 1. + uv.y * PI2 * 8.) / 1.25;
		float ws_osc2 = cos(globalTime * 2. + uv.y * PI2 * 8. + nh * PI2 * 8.) / 1.25;
      
        wave_b += fline(harmonic_frequency) * ws_osc1;
      	wave_a += fline(harmonic_frequency) * ws_osc2;
    }
    
    // make sure we stay in waveshaping mode (3 to < 4) for each partials
    wave_a = abs(min(2.999, max(2., wave_a)));
  
    synthOutput = vec4(l, r, wave_a, wave_b);
    gl_FragColor = vec4(l, r, wave_b, 1.);
  }
