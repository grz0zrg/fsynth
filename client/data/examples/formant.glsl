  // Sample program : formant synthesis with subtractive source
  // Note :
  //   Must add/select "Subtractive" instrument in "SYNTH" to the first part of the canvas  and assign second output channel.
  //   Must add/select "Formant" instrument in "SYNTH" to the second part of the canvas.

  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0., b = 0., a = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;
    
    // subtractive part
    if (uv.x < 0.5) {
      // brownian noise
      float waveform = 0.; // can also try 4 (pink noise)
      
      // steep envelope
      float x = globalTime / 4. + uv.x * 1.;
      float steepness = 1.;
      float envelope = abs(sign(sin(x)) * (1. - (1. - pow(abs(sin(x * 64.)), steepness))));

      float frequency = 60. + abs(sin(globalTime)) * 1200.;

      float filter_cutoff = 64.;
      float filter_resonance = 0.25 + waveform;

      float modulator = 0.25 + abs(sin(globalTime * 2. + cos(globalTime + PI2) * PI2)) / 1.25;
      filter_cutoff *= modulator;
      filter_resonance += modulator / 4.;

      l += fline(frequency) * envelope;
      r += fline(frequency) * envelope;
      b += fline(frequency) * filter_cutoff;
      a += fline(frequency) * filter_resonance;
      
      l += fline(frequency*2.) * envelope;
      r += fline(frequency*2.) * envelope;
      b += fline(frequency*2.) * filter_cutoff;
      a += fline(frequency*2.) * filter_resonance;
    }
    
    // formant part
    if (uv.x > 0.5) {
      // a list of frequencies
      const float frequencies[2] = float[2](1.125, 2.25);
      
      float base_frequency = 480.;
      
      for (int i = 0; i < frequencies.length(); i += 1) {
        float frequency = frequencies[i] * base_frequency;
        
        float source_index = 1.; // correspond to channel index; note : cannot be the same as the formant channel output
        float impulse_response_attack_time = 0.02751; // attack time of the impulse (seconds) (encoded in fractional part of B)
        float impulse_response_decay_time = 0.0009; // decay time of the impulse (seconds)
        
      	l += fline(frequency) * 0.125;
      	r += fline(frequency) * 0.125;
        b += fline(frequency) * (source_index + impulse_response_attack_time);
        a += fline(frequency) * impulse_response_decay_time;
      }
    }

    synthOutput = vec4(l, r, b, a);
    fragColor = vec4(l, r, 0., 1.);
  }


