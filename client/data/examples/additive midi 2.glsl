
  // Sample program : additive synthesis with MIDI; harmonics parameter
  // MIDI input should be enabled by going into 'SETTINGS' (Jack plug icon)
  // try some pentatonic scale

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
    float attenuation_constant = 3.5;

    // harmonics parameters with first vec2 value as amplitude factor and second value as sustain value
    // amplitude loosely based on oboe harmonics
    const vec2 harmonics_parameters[7] = vec2[7](vec2(0.021, 0.5), vec2(0.0237, 0.25), vec2(0.1, 0.5), vec2(0.0513, 0.75), vec2(0.045, 0.75), vec2(0.061, 1.), vec2(0.068, 1.));

    // 64 notes polyphony (can go higher but require more GPU time)
    for (int k = 0; k < 64; k += 2) {
      vec4 data = keyboard[k];
      vec4 data_mpe = keyboard[k + 1]; // MPE data (pitch bend, CC74, pressure, release velocity)

      float kfrq = data.x; // frequency
      float kvel = data.y; // velocity
      float ktim = data.z; // elapsed time
      float kchn = data.w; // channel
      float kbnd = data_mpe.x; // pitch bend

      // escape the loop on silent note
      if (kfrq == 0.) {
       	break;
      }

      // loop over all harmonics defined by the array above
      for (int i = 0; i < harmonics_parameters.length(); i += 1) {
        float ni = 1. - float(i + 1) / float(harmonics_parameters.length()); // normalize
        
        // define an envelope (the note is visualized from left to right)
        float env = adsr(ktim - uv.x * 2., vec4(0.0125, harmonics_parameters[i].y / 2., 0., 0.75), 0.25);
        
        // modulated low-pass filter (attenuate high frequencies)
        float modulation = cos(ni * 3.1415 * 1. - ktim * 1. * uv.y) * (attenuation_constant / 1.5);
        float attenuation = pow(ni, max(0.25, abs(attenuation_constant + modulation)));

        float gain = 100.;
        
        float frequency = kfrq * float(i + 1);
        l += fline(frequency + kbnd) * kvel * attenuation * env * harmonics_parameters[i].x * gain;
        r += fline(frequency + kbnd) * kvel * attenuation * env * harmonics_parameters[i].x * gain;
        
        // second set of harmonics with some frequencies shifting
        float fmod1 = sin(ktim * 2.) / 12.;
        float fmod2 = cos(ktim * 2.) / 12.;
        
        l += fline(frequency * (3. + fmod1) + kbnd) * kvel * attenuation * env * harmonics_parameters[i].x * gain;
        r += fline(frequency * (3. + fmod2) + kbnd) * kvel * attenuation * env * harmonics_parameters[i].x * gain;
      }
    }

    synthOutput = vec4(l, r, 0., 0.);
    fragColor = vec4(l, r, 0., 1.);
  }

