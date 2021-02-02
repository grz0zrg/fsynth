## About

Fragment does not have any audio based effects, however, pixels-based effects to apply process such as delay can be done within Fragment easily.

Audio effects can also be added outside Fragment from a DAW etc.

## How-to

### Delay

```glsl
  // Sample program : additive synthesis with MIDI and delay effect
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

    float attenuation_constant = 1.95;

    const float harmonics = 2.;

    for (int k = 0; k < 32; k += 2) {
      vec4 data = keyboard[k];
      vec4 data2 = keyboard[k + 1];

      float kfrq = data.x; // frequency
      float kvel = data.y; // velocity
      float ktim = data.z; // elapsed time
      float kchn = data.w; // channel

      float kpth = data2.x; // pitch
      float ktmb = data2.y; // timbre
      float kpre = data2.z; // pressure
      float krel = data2.w; // release velocity

      kfrq += kpth * 10.;

      if (kfrq == 0.) {
        break;
      }

      for (float i = 1.; i < harmonics; i += 1.) {
        // the delay line with 4 repeat
        for (float j = 1.; j < 4.; j += 1.) {
          // core delay parameter, 4 repeat by offseting time
          float delay = ktim - ((j - 1.) / 4.);
          // a delay parameter which will be used to apply small amount of difference to release envelope between delay
          float delay_parameter = j / 2.;

          float a = 1. / pow(i, attenuation_constant + abs(sin(delay / 18. / i - j / 2.) / 3.1415 * 8.));

          // notice how the envelope is divided by the repeats so that each "echo" are quieter
          float env_l = adsr(delay, vec4(2.75 * (harmonics - i * 2.), 0.05, 0., .25 + delay_parameter), 0.75) / j;
          float env_r = adsr(delay, vec4(2.75 * (harmonics - i * 2.), 0.05, 0., .25 + delay_parameter), 0.75) / j;

          l += fline(kfrq * i) * a * kvel * env_l;
          r += fline(kfrq * i) * a * kvel * env_r;
        }
      }
    }

    synthOutput = vec4(l, r, 0., 0.);
    gl_FragColor = vec4(l, r, 0., 1.);
  }
```