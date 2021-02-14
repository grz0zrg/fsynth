## About

> Open Sound Control (OSC) is a protocol for networking sound synthesizers, computers, and other multimedia devices for purposes such as musical performance or show control. OSC's advantages include interoperability, accuracy, flexibility and enhanced organization and documentation.

Fragment has OSC in/out support through a WebSocket connection.

This feature can be enabled from the settings dialog.

## How-to

Note: If your application does not support OSC through WebSocket, you will have to use an [OSC relay](https://github.com/grz0zrg/fsynth/tree/master/osc_relay).

### In

Fragment accept OSC inputs from *127.0.0.1:8081* (the address can be defined in session / global settings dialog)

The supported OSC address are

`/clear` Clear all OSC defined uniforms

`/video` An array which control a video settings

arguments :

- input id (must be a video)
- playback rate
- video loop start
- video loop end
- video current time (seek)

`/i[uniformname]` Can be used to update a **float** uniform **array** (the array will automatically grow if needed) or set a **float** uniform

To define / set a single float uniform, arguments :

- 0
- value

To update a **float** uniform **array** value, arguments :

- index
- value

Note : The type (array of float or single float) is set when the first message is received, if a message with 0 as first value is received first the defined type will be a single float uniform, to define an array the first index will define the length of the array.

`/a[uniformname]` Create or update whole **float** uniform **array**

arguments :

- a list of values

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

### Open Stage Control

[Open Stage Control](https://openstagecontrol.ammd.net/) is a libre and modular OSC / MIDI controller with many widgets type and can be used as an effective way to control Fragment OSC uniforms.

When widgets are added the `id` field of the `widget` property section specify the OSC address, this can also be specified more directly in the `address` field in `osc` property section.

Example to define a float uniform :

* specify uniform name in widget `id` or `address` field such as `iMyUniform`
* add `[0]` to `preArgs` widget property field