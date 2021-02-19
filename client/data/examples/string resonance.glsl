  // Sample program : string resonance with subtractive noise source
  // Note :
  //   Must add/select "Subtractive" instrument in "SYNTH" to the first part of the canvas.
  //   Must add/select "String resonance" instrument in "SYNTH" to the second part of the canvas.

  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0., b = 0., a = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;
    
    // subtractive part
    if (uv.x < 0.5) {
      // brownian noise
      float waveform = 3.; // can also try 4 (pink noise)
      
      // steep envelope
      float x = globalTime + uv.x;
      float steepness = 128.;
      float envelope = abs(sign(sin(x)) * (1. - (1. - pow(abs(sin(x * 8.)), steepness))));

      float frequency = 60.;

      float filter_cutoff = 32.;
      float filter_resonance = 0.25 + waveform;

      float modulator = 0.25 + abs(sin(globalTime * 2. + cos(globalTime + PI2) * PI2)) / 1.25;
      filter_cutoff *= modulator;
      filter_resonance += modulator / 4.;

      l += fline(frequency) * envelope;
      r += fline(frequency) * envelope;
      b += fline(frequency) * filter_cutoff;
      a += fline(frequency) * filter_resonance;
    }
    
    // string resonance part
    if (uv.x > 0.5) {
      // a list of resonant frequencies ratio : http://www.csounds.com/manual/html/MiscModalFreq.html
      const float frequencies[6] = float[6](1., 3.984, 10.668, 17.979, 23.679, 33.642);
      
      float base_frequency = 60.;
      
      for (int i = 0; i < frequencies.length(); i += 1) {
        float frequency = frequencies[i] * base_frequency;
        
        float source_mode = 0.; // 0 : channel, > 0 : instrument
        float source_index = 0.; // correspond to either channel or instrument index
        float feedback_amount = 0.99; // typically > 0.9
        
      	l += fline(frequency) * 1.;
      	r += fline(frequency) * 1.;
        b += fline(frequency) * (source_index + source_mode);
        a += fline(frequency) * feedback_amount;
      }
    }

    synthOutput = vec4(l, r, b, a);
    fragColor = vec4(l, r, 0., 1.);
  }
