  // Sample program : additive synthesis with per harmonics bitcrushing

  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0.;
    
    // bitcrush parameters
    const float enable_bitcrush = 1.;
    
    // note : bitcrush mode (1) is encoded as integer part of the blue channel with the bitdepth as fractionnal part
    // here we ensure it is always enabled for all partials
    float bitdepth = enable_bitcrush;
    float sample_rate = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;

    float start_frequency = 110.;
    // sequence
    start_frequency += (8. * round(mod(globalTime * 4., 2.)));
    float harmonics = 8.;
    
    const float harmonics_step = 1.;
    for (float h = 1.; h < harmonics; h += max(1., harmonics_step)) {
        // normalize
      	float nh = h / harmonics;
        // modulate attenuation factor (filter cutoff)
      	float attenuation_factor = 1.75 + sin(globalTime * PI2 + nh * PI2 + uv.x * 64.);
        // attenuate high frequencies harmonics (filter)
        float attenuation = pow(1. - nh, attenuation_factor);

      	float harmonic_frequency = start_frequency * h;
        
    	l += fline(harmonic_frequency) * attenuation;
      	r += fline(harmonic_frequency) * attenuation;
      
      	// bitdepth & samplerate is modulated by this oscillator
        float bitcrush_osc = 0.015 + abs(round(sin(globalTime * 2. * uv.y * 2.) * 2.)) / 256.;
      
        // modulate this partial bitcrush effect parameters
        bitdepth += fline(harmonic_frequency) * abs(sin(globalTime * 1. + uv.y * PI2));
        sample_rate += fline(harmonic_frequency) * bitcrush_osc;
    }
    
    // make sure it is always enabled (> 1.) & stay a bitcrush (< 2.)
    bitdepth = bitdepth > 1.5 ? min(max(1., bitdepth), 1.99) : 0.;

    synthOutput = vec4(l, r, bitdepth, sample_rate);
    gl_FragColor = vec4(l, r, sample_rate, 1.);
  }

