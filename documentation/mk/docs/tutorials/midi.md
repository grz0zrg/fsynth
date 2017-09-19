## MIDI inputs

*You must have a WebMIDI supported browser (such as Chrome or Opera) to use Fragment MIDI inputs.*

Fragment support MIDI inputs, it has built-in support for MIDI **keyboards** and **controllers**.

Once your MIDI keyboard is plugged in, it can be found and enabled in the Fragment MIDI devices dialog.

The MIDI data of the keyboard will now be available in a pre-defined **vec4 array** named **keyboard**, the array length is the actual polyphony capability of Fragment, the array contain a series of vec4 items, a vec4 item contain

- the note-on frequency
- the note velocity
- the elapsed time since the key was pressed
- the MIDI channel

There is no notions of *note-off* in Fragment, a note-off is simply an item filled with 0 inside the array.

Fragment will memorize the note for an user-defined duration after a *note-off* event.

Fragment will add *note-on* events in order and will reorder the array as necessary, this mean that you can loop over all items of the array and break the loop if an item component is equal to 0.

## MIDI keyboard

The simplest usage of a MIDI keyboard within Fragment is to create a loop, then get the note data from the **keyboard** array and pass the key frequency as an argument to the `fline` function and the key velocity to harmonics amplitude.

```glsl
void main () {
  float l = 0.;
  float r = 0.;

  float attenuation_constant = 1.95;

  const float harmonics = 8.;

  // 8 notes polyphony
  for (int k = 0; k < 8; k += 1) {
    vec4 data = keyboard[k];

    float kfrq = data.x; // frequency
    float kvel = data.y; // velocity
    float ktim = data.z; // elapsed time
    float kchn = data.w; // channel

    // we quit as soon as there is no more note-on data
    // this is optional but it might help with performances
    // so we don't compute things uselessly
    if (kfrq == 0.) {
      break; 
    }

    for (float i = 1.; i < harmonics; i += 1.) {
      float a = 1. / pow(i, attenuation_constant);

      // we apply key. velocity and use the key.frequency
      l += fline(kfrq * i) * a * kvel;
      r += fline(kfrq * i) * a * kvel;
    }
  }

  gl_FragColor = vec4(l, r, 0., 1.);
  // WebGL 2.0 only
  synthOutput = vec4(l, r, 0., 0.);
}
```

- `kfrq`note frequency in Hertz
- `kvel`key velocity from 0 to 1 (255)
- `ktim`the elapsed time since the key was pressed, this is useful for envelopes and other things
- `kchn`the key MIDI channel, this is useful for multitimbrality

## Portamento

With the built-in **vec3 pKey** array, it is possible to access the last played key for each MIDI channels, this is necessary for frequency gliding effects (portamento)

A **pKey** component has exactly the same things as a **keyboard** component except that the MIDI channel is the array index.

Two lines need to be added in order to build a portamento effect, the previous note data should be gathered first by passing the current note MIDI channel as the array index:

```glsl
vec4 pdata = pKey[int(kchn)];
```
The current frequency is then updated by an interpolated value, from the previous note frequency to the current note frequency, the portamento speed can be modified by multiplying the interpolation current time.
```glsl
kfrq = mix(pdata.x, kfrq, min(ktim * 28., 1.));
```
Updated code :

```glsl
void main () {
  float l = 0.;
  float r = 0.;

  float attenuation_constant = 1.95;

  const float harmonics = 8.;

  for (int k = 0; k < 8; k += 1) {
    vec4 data = keyboard[k];

    float kfrq = data.x;
    float kvel = data.y;
    float ktim = data.z;
    float kchn = data.w;

    if (kfrq == 0.) {
      break; 
    }
    
    vec4 pdata = pKey[int(kchn)];
    
    kfrq = mix(pdata.x, kfrq, min(ktim * 28., 1.));

    for (float i = 1.; i < harmonics; i += 1.) {
      float a = 1. / pow(i, attenuation_constant);

      l += fline(kfrq * i) * a * kvel;
      r += fline(kfrq * i) * a * kvel;
    }
  }

  gl_FragColor = vec4(l, r, 0., 1.);
  // WebGL 2.0 only
  synthOutput = vec4(l, r, 0., 0.);
}
```

## MIDI controllers

Fragment support MIDI controllers through the uniform controller dialog, GLSL variables can be created and changed in real-time by assigning a MIDI controller to an uniform created from the controller dialog.

The values are shared between users.

## MIDI output

Fragment has no support yet for MIDI output.

## Note

When a note-off is received, Fragment will actually keep the note in memory for an amount of time defined by the **note lifetime** global settings, this is useful for the release portion of envelopes for example, this settings can be found in the global settings dialog.