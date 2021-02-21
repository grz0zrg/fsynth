## MIDI inputs

*You must have a WebMIDI supported browser (such as Chrome or Opera) to use MIDI.*

Fragment support MIDI inputs and output, it has built-in support for MIDI **keyboards** (see OSC for MIDI controllers).

Fragment has complete support for *Multidimensional Polyphonic Expression* aka MPE which apply to a new class of controllers like the LinnStrument, Eigenharp and Roli RISE/SeaBoard allowing full per-note expressive support.

Once your MIDI keyboard is plugged in, it can be found and enabled in the Fragment MIDI devices dialog (JACK plug icon on the toolbar)

The MIDI data of the keyboard will now be available in a pre-defined **vec4 array** named **keyboard**, the array length * 2 is the actual polyphony capability of Fragment, the array contain a series of vec4 items, a note is constitued by two vec4 items containing

- the note frequency
- the note velocity
- the elapsed time since the key was pressed
- the MIDI channel
- the pitch bend
- the timbre (CC74)
- the pressure (aftertouch)

All values except frequency/time/channel are normalized (0.0 - 1.0 range).

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
  for (int k = 0; k < 16; k += 2) {
    vec4 data = keyboard[k];
    vec4 data2 = keyboard[k + 1];

    float kfrq = data.x; // frequency
    float kvel = data.y; // velocity
    float ktim = data.z; // elapsed time
    float kchn = data.w; // channel
    float kpth = data2.x; // pitch bend
    float ktmb = 1.0 + data2.y; // timbre (CC74)
    float kpre = data2.z; // pressure (aftertouch)
    float kvof = data2.w; // release velocity (set on note-off)

    // we quit as soon as there is no more note-on data
    // this is optional but it might help with performances
    // so we don't compute things uselessly
    if (kfrq == 0.) {
      break; 
    }

    for (float i = 1.; i < harmonics; i += 1.) {
      float a = 1. / pow(i, attenuation_constant + ktmb * 2.);

      // we apply key. velocity and use the key.frequency
      l += fline(kfrq * i + kpth * 2.) * a * (kvel + kpre);
      r += fline(kfrq * i + kpth * 2.) * a * (kvel + kpre);
    }
  }

  fragColor = vec4(l, r, 0., 1.);
  synthOutput = vec4(l, r, 0., 0.);
}
```

- `kfrq`note frequency in Hertz
- `kvel`key velocity from 0 to 1 (255)
- `ktim`the elapsed time since the key was pressed, this is useful for envelopes and other things
- `kchn`the key MIDI channel, this is useful for multitimbrality
- `kpth`the pitch bend value from 0 to 1
- `ktmb`the timbre (MPE) MIDI CC74
- `kpre`aftertouch value from 0 to 1
- `kvof`release velocity from 0 to 1

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

  for (int k = 0; k < 16; k += 2) {
    vec4 data = keyboard[k];

    float kfrq = data.x;
    float kvel = data.y;
    float ktim = data.z;
    float kchn = data.w;

    if (kfrq == 0.) {
      break; 
    }
    
    vec3 pdata = pKey[int(kchn)];
    
    kfrq = mix(pdata.x, kfrq, min(ktim * 28., 1.));

    for (float i = 1.; i < harmonics; i += 1.) {
      float a = 1. / pow(i, attenuation_constant);

      l += fline(kfrq * i) * a * kvel;
      r += fline(kfrq * i) * a * kvel;
    }
  }

  fragColor = vec4(l, r, 0., 1.);
  synthOutput = vec4(l, r, 0., 0.);
}
```

## MIDI controllers

See OSC section to use more controllers.

## MIDI output

Features :

- MIDI devices can be assigned to slices through the slice settings dialog
- user-defined MIDI messages interpretation of RGBA values via JS scripting (slice settings dialog)
- polyphony/stereo panning through 16 channels
- microtonal capabilities (frequency mapping is respected)

External synths can be triggered from pixels data via MIDI OUT, one or multiple MIDI devices can be assigned to one or more slice (note: slices must have different output channels otherwise the last slice with MIDI devices attached is used), RGBA channels can be assigned to user-defined MIDI messages from the slice settings JS script, Fragment has limited MPE support (non-standard for now) to support polyphony through 16 channels, every sounding note is temporarily assigned to its own MIDI channel, allowing microtonal, individual stereo panning and polyphonic capabilities.

### How it Work

On every 'note on' (or more like a 'data on' event) Fragment send the following MIDI data (in order) :

* user-defined MIDI data (the `on` array content of the MIDI out editor startup code)
* channel pitch bend (this will fine tune the note frequency to match the activated bank frequency; microtonal capability)
* channel panning
* note / volume

On each slice data change (R,G,B,A) a 'change' event is triggered, this 'change' event trigger a MIDI send with data from the `change` user-defined array content.

On a 'note off' event (when a slice data become 0 for both left & right or red & green) the user-defined content of the `off` array is sent, the note off event is also sent afterward.

Note : The MIDI channel is defined by the output channel slice parameter.

### User-defined MIDI OUT messages

This feature allow to send custom MIDI data for each specific events (note-on, change and note-off). This use JavaScript to allow maximum flexibility. The MIDI out messages editor can be accessed from the slices / instrument settings `MIDI out` section.

Here is the default setup for each instruments :

```js
/*
 User-defined MIDI messages for note events
 Pre-defined variables : 
  Pixels data: l, r, b, a
  MIDI channel : c
*/

if (type === "on") {
    on = [];
} else if (type === "change") {
    change = [];
} else if (type === "off") {
    off = [];
}
```

The pre-defined pixels data variables are all normalized (0,1) which mean they should likely be multiplied before being sent.

Here is an example of user-defined control change (modulation) using A pixel data :

```js
if (type === "on") {
    on = [];
} else if (type === "change") {
    // send CC on defined output channel of modulation type with the value of pixel data alpha channel
    change = [0xb0 + c, 0x01, a * 127];
} else if (type === "off") {
    off = [];
}
```

Most JavaScript features in the MIDI out editor are supported, the editor data is saved and shared between session users.

## Note

When a note-off is received, Fragment will actually keep the note in memory for an amount of time defined by the **note lifetime** global settings, this is useful for the release portion of envelopes for example or to use the release velocity, this settings can be found in the global settings dialog.