## Square and triangle wave

Common waveforms can be produced with the right harmonics setup.

A square wave has only odd partials.

A triangle wave also has odd partials but with gradually weaker partials.

This can be done easily within Fragment by increasing a loop step, only the odd partials will be computed.

```glsl
void main () {
  float l = 0.;
  float r = 0.;
  float base_frequency = 440.;

  float attenuation_constant = 1.95;

  const float harmonics = 8.;

  // notice the loop step
  for (float i = 1.; i < harmonics; i += 2.) {
    float a = 1. / pow(i, attenuation_constant);

    l += fline(base_frequency * i) * a;
    r += fline(base_frequency * i) * a;
  }

  fragColor = vec4(l, r, 0., 1.);
  synthOutput = vec4(l, r, 0., 0.);
}
```

