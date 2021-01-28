  // Sample program : pm (fm) synthesis
  // Note :
  //   Must add/select "PM/FM" instrument in "SYNTH".

  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;

    float start_frequency = 240.;
    float harmonics = 4. + sin(globalTime + uv.x * PI2 + uv.y * PI2) * 4.;

    // fm start parameters
    float mb = 0., ma = 0.;
    float modulator_amplitude = 0.75;
    float modulator_frequency = 120.;
    float modulator_feedback = round(0.95 * 65536.);
    
    const float harmonics_step = 1.;
    for (float h = 1.; h < harmonics; h += max(1., harmonics_step)) {
        // normalize
      	float nh = h / harmonics;
        // modulate attenuation factor (filter cutoff)
      	float attenuation_factor = 1.25 + sin(globalTime * PI + nh * PI2);
        // attenuate high frequencies harmonics (filter)
        float attenuation = pow(1. - nh, attenuation_factor);
      
      	// apply varying amplitude 
      	float amplitude_osc = abs(sin(uv.y * PI2 + uv.x * PI2 + globalTime * 2.));
      	attenuation *= amplitude_osc;

      	float harmonic_frequency = start_frequency * h;
      
        // fm parameters modulation
        float feedback_mod = abs(sin(globalTime * 2. + nh * PI2)) * nh;
        float feedback = round(modulator_feedback * feedback_mod);
      
        float amplitude_mod = pow(abs(sin(globalTime + nh * PI2)), 2.) * nh;
      	float fm_amplitude = modulator_amplitude * amplitude_mod;
      
        float frequency_mod = sin(globalTime / 2. + nh * PI2) * 110.;
        float fm_frequency = modulator_frequency + frequency_mod;

    	l += fline(harmonic_frequency) * attenuation;
      	r += fline(harmonic_frequency) * attenuation;
        // modulator amplitude on (fractional, with feedback level encoded on integer part [0, 65536)
        mb += fline(harmonic_frequency) * (fm_amplitude + feedback);
        // modulator frequency
        ma += fline(harmonic_frequency) * fm_frequency;
    }

    synthOutput = vec4(l, r, mb, ma);
    gl_FragColor = vec4(l, r, 0., 1.);
  }

