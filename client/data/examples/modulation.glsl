  // Sample program : additive + modulation of effect parameter
  // Note : 
  //   Must add/select "Additive" instrument in "SYNTH" and move it to the first part of the canvas.
  //   Must add/select "Modulation" instrument in "SYNTH" and move it to the second part of the canvas.
  //   Must add "Decimator" effect in the first slot of channel 2 with Chn 1 as modulation instrument parameters
  // Modulation target of the modulation instrument can be set via modulation instrument parameters.
  // WARNING : Modulation may introduce unwanted and loud sounds.

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
    		l += fline(harmonic_frequency) * attenuation / 8.;
      		r += fline(harmonic_frequency) * attenuation / 8.;
        }
    }
    
    // modulation modifier
    // note : modulation target is set via instrument settings so using it with multiple bands is useless
    //        more modulation thus mean adding as much modulation instrument as there is modulations
    if (uv.x >= 0.5) {
        float x = globalTime + uv.x;
        float steepness = 256.;
        float envelope = abs(sign(sin(x)) * (1. - (1. - pow(abs(sin(x * 8.)), steepness))));
      
      	float modulation = 1. + envelope * 8.;

        float band = 440.;
    	l += fline(band) * 1.;
      	r += fline(band) * 1.;
        b += fline(band) * modulation;
    }

    synthOutput = vec4(l, r, g, b);
    gl_FragColor = vec4(l, r, 0., 1.);
  }

