
  // Sample program : additive synthesis with MIDI portamento (pitch gliding between notes)
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
    float l = 0.;
    float r = 0.;

    float attenuation_constant = 2.;

    const float harmonics = 16.;

    for (int k = 0; k < 32; k += 2) {
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

      // glide the frequency from previous frequency to current, add some modulation to make it sound like retro
      float glide_fun = 1.;
      float glide_pow = 10.;
      float glide_tim = 2.; // glide time factor
      kfrq = mix(pdata.x, kfrq, min(pow(ktim * glide_tim, glide_pow), glide_fun));

      for (float i = 1.; i < harmonics; i += 2.) {
        float ni = 1. - i / harmonics; // normalize
        
        float a = 1. / pow(i, attenuation_constant);
        
        float env = adsr(ktim, vec4(0., 1.5 - a, 0.0, 0.5), 0.25);

        l += fline(kfrq * i) * a * kvel * env * 2.;
        r += fline(kfrq * i) * a * kvel * env * 2.;
      }
    }

    synthOutput = vec4(l, r, 0., 0.);
    fragColor = vec4(l, r, 0., 1.);
}
