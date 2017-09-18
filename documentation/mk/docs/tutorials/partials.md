## About

Partials are the building block to **construct complex timbres**, harmonic partials are defined as positive integer multiple of the frequency of the fundamental while inharmonic partials can be anything else.

## How-to

To produce harmonic partials, we can start from the fundamental and multiply its frequency by an increasing value. This is generally done with a loop.

```glsl
void main () {
  float l = 0.;
  float r = 0.;
  float base_frequency = 440.;

  const float harmonics = 8.;

  for (float i = 1.; i < harmonics; i += 1.) {
    l += fline(base_frequency * i);
    r += fline(base_frequency * i);
  }

  gl_FragColor = vec4(l, r, 0., 1.);
  synthOutput = vec4(l, r, 0., 0.); // WebGL 2.0 only
}
```

- `base_frequency`is the fundamental frequency that we will use to produce partials
- `harmonics`is the number of partials (which include the fundamental) that we want to have

## Enhancement

The timbre produced by the code above is quite raw because all the harmonics are of the same amplitude.

Harmonics amplitude is an important parameter for timbre quality and to produce complex sounds.

There is many ways of changing the amplitude of harmonics within Fragment, an array can be used to have a precise control of each amplitude or a math function can be used for example.

We will fix this for now by attenuating higher frequencies with the exponential function, this is similar to the concept of filtering in a common synthesizer.

```glsl
void main () {
  float l = 0.;
  float r = 0.;
  float base_frequency = 440.;

  float attenuation_constant = 1.95;

  const float harmonics = 8.;

  for (float i = 1.; i < harmonics; i += 1.) {
    float a = 1. / pow(i, attenuation_constant);

    l += fline(base_frequency * i) * a;
    r += fline(base_frequency * i) * a;
  }

  gl_FragColor = vec4(l, r, 0., 1.);
  synthOutput = vec4(l, r, 0., 0.); // WebGL 2.0 only
}
```

- `attenuation_constant`the attenuation power
- `a`the computed amplitude based on current harmonic and attenuation constant

The produced sound is smoother and more pleasant!