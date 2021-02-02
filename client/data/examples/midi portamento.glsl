
  // Sample program : additive synthesis with MIDI portamento (pitch gliding between notes)
  // MIDI input should be enabled by going into 'SETTINGS' (Jack plug icon)

  void main () {
    float l = 0.;
    float r = 0.;

    float attenuation_constant = 1.95;

    const float harmonics = 8.;

    for (int k = 0; k < 16; k += 2) {
      vec4 data = keyboard[k];

      float kfrq = data.x;
      float kvel = data.y;
      float ktim = data.z;
      float kchn = data.w;

      if (kfrq == 0.) {
        break; 
      }

      // get previous MIDI note-off
      vec3 pdata = pKey[int(kchn)];

      // glide the frequency from previous frequency to current
      kfrq = mix(pdata.x, kfrq, min(ktim * 28., 1.));

      for (float i = 1.; i < harmonics; i += 1.) {
        float a = 1. / pow(i, attenuation_constant);

        l += fline(kfrq * i) * a * kvel;
        r += fline(kfrq * i) * a * kvel;
      }
    }

    gl_FragColor = vec4(l, r, 0., 1.);
    synthOutput = vec4(l, r, 0., 0.);
}

