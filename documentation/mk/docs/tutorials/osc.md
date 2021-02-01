## About

> Open Sound Control (OSC) is a protocol for networking sound synthesizers, computers, and other multimedia devices for purposes such as musical performance or show control. OSC's advantages include interoperability, accuracy, flexibility and enhanced organization and documentation.

Fragment has OSC in/out support through a WebSocket connection.

This feature can be enabled from the settings dialog.

## How-to

Note: If your application does not support OSC through WebSocket, you will have to use an [OSC relay](https://github.com/grz0zrg/fsynth/tree/master/osc_relay).

### In

Fragment accept OSC inputs from *127.0.0.1:8081*

The supported OSC address are

`/clear` Clear all OSC defined uniforms

`/video` An array which control a video settings

- input id (must be a video)
- playback rate
- video loop start
- video loop end
- video current time (seek)

`/i[uniformname]` Create/extend a **float** uniform **array** or update a specific index

- index
- value

`/a[uniformname]` Create or update a **float** uniform **array**

- an array of values

This feature is useful to send data to the fragment shader from an external application and control parameters / videos, it act as an alternative and powerful controller.

### Out

Fragment can output OSC slices pixels data as a bundle to the address */fragment* to *127.0.0.1:8081* host

The OSC bundle contain :

- Oscillator index (aka vertical position)
- Oscillator frequency
- Oscillator L amplitude (R)
- Oscillator R amplitude (G)
- B pixel component
- A pixel component
- Slice channel

This feature is useful to trigger external applications from the slices content, this was used to build a [SuperCollider port](https://github.com/grz0zrg/fsynth/tree/master/supercollider) of the additive synthesis engine for example.