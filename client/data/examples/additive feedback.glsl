  // Sample program : additive synthesis with feedback (previous frame is feeded back)
  // WARNING: Using feedback may produce loud / unwanted sounds.
  // This may also be computationally intensive because it will activate huge amount of partials.

  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;

    float start_frequency = 220.;
    float harmonics = 4.;
    
    // 1 = saw wave (even harmonics), 2 = square wave (odd harmonics)
    const float harmonics_step = 1.;
    for (float h = 1.; h < harmonics; h += max(1., harmonics_step)) {
        // normalize
      	float nh = h / harmonics;
        // modulate attenuation factor (filter cutoff)
      	float attenuation_factor = .5;
        // attenuate high frequencies harmonics (filter)
        float attenuation = pow(1. - nh, attenuation_factor);
      
        // steep envelope
        float x = globalTime / 4. + uv.x;
        float steepness = 64.;
        float envelope = abs(sign(sin(x)) * ((1. - pow(abs(sin(x * 64.)), steepness))));

      	// apply varying amplitude 
      	float amplitude_osc = abs(sin(uv.y * PI2 + uv.x * PI + globalTime));
      	attenuation *= amplitude_osc;

      	float harmonic_frequency = start_frequency * h;
        
    	l += fline(harmonic_frequency) * attenuation * envelope;
      	r += fline(harmonic_frequency) * attenuation * envelope;
    }
    
    // get previous frame data with slightly modified texture offset
    vec4 previous_frame = texture2D(pFrameSynth, vec2(uv.x + abs(sin(globalTime / 2.)), uv.y - 0.0035));
    
    // now add previous frame data to current frame
    l += previous_frame.r * 0.75;
    r += previous_frame.g * 0.75;

    synthOutput = vec4(l, r, 0., 0.);
    fragColor = vec4(l, r, 0., 1.);
  }

