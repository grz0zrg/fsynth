
  // Sample program : additive synthesis with MIDI
  // MIDI input should be enabled by going into 'SETTINGS' (Jack plug icon)

  // generic ADSR envelope; can go into 'my library' if you use this example in 'main' script
  float adsr(float t, vec4 v, float s) {
      v.xyw = max(vec3(2.2e-05), v.xyw);
      float ta = t/v.x;
      float td = max(s, 1.0-(t-v.x)*(1.0-s)/v.y);
      float tr = (1.0 - max(0.0,t-(v.x+v.y+v.z))/v.w);
      return max(0.0, min(ta, tr*td));
  }

  void main () {
    float l = 0., r = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;

    // harmonics attenuation constant (low-pass filter)
    float attenuation_constant = 8.5;

    const float harmonics = 24.;

    // 64 notes polyphony (can go higher but require more GPU time)
    for (int k = 0; k < 64; k += 2) {
      vec4 data = keyboard[k];
      vec4 data_mpe = keyboard[k + 1]; // MPE data (pitch bend, CC74, pressure, release velocity)

      float kfrq = data.x; // frequency
      float kvel = data.y; // velocity
      float ktim = data.z; // elapsed time
      float kchn = data.w; // channel

      // escape the loop on silent note
      if (kfrq == 0.) {
       	break;
      }

      for (float i = 1.; i < harmonics; i += 2.) {
        float ni = 1. - i / harmonics; // normalize
        
        // define an envelope (the note is visualized from left to right)
        float env = adsr(ktim - uv.x, vec4(0., 0.5, 0.0, 1.0), 0.25);
        
        // modulated low-pass filter (attenuate high frequencies)
        float modulation = cos(ni * 3.1415 * 2. - ktim * 2.) * 4.;
        float attenuation = pow(ni, attenuation_constant - modulation);

        float frequency = kfrq * i;
        l += fline(frequency) * kvel * attenuation * env * 3.;
        r += fline(frequency) * kvel * attenuation * env * 3.;
      }
    }

    synthOutput = vec4(l, r, 0., 0.);
    gl_FragColor = vec4(l, r, 0., 1.);
  }

