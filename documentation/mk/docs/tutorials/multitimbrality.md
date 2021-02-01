## About

Fragment multitimbrality is done by splitting the canvas in a multitude of independant parts.

## How-to

Example by splitting the canvas into two parts with a condition checking the current fragment position on the horizontal axis lie between a defined boundary, if `uv.x`is less than 0.25, draw something there, if `uv.x`is between 0.25 and 0.5, draw something else.

To hear the sound, you must add two slices, one on the first part and another one on the second part.

The result of this example is that you can play with a MIDI keyboard on the first two MIDI channels, both channels will play a slightly different timbre.

```glsl
void main () {
  float l = 0.;
  float r = 0.;

  vec2 uv = gl_FragCoord.xy / resolution;

  float attenuation_constant = 1.95;

  const float harmonics = 10.;

  for (int k = 0; k < 32; k += 2) {
    vec4 data = keyboard[k];

    float kfrq = data.x;
    float kvel = data.y;
    float ktim = data.z;
    float kchn = data.w;

    if (kfrq == 0.) {
        break;
    }

    if (uv.x < 0.25 && kchn == 1.) {
        for (float i = 1.; i <= harmonics; i += 1.) {
            float a = 1. / pow(i, attenuation_constant);

            l += fline(kfrq * i) * a * kvel;
            r += fline(kfrq * i) * a * kvel;
        }
    } else if (uv.x > 0.25 && uv.x < 0.5 && kchn == 2.) {
        for (float i = 1.; i <= harmonics; i += 0.75) {
            float a = 1. / pow(i, attenuation_constant);

            l += fline(kfrq * i) * a * kvel;
            r += fline(kfrq * i) * a * kvel;
        }
    }
  }

  gl_FragColor = vec4(l, r, 0., 0.);
  synthOutput = vec4(l, r, 0., 0.);//; // WebGL 2 only
}
```