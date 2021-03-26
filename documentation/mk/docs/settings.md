## About

Fragment support a variety of global and session related settings through the settings dialog.

![Session & global settings dialog](images/settings.png)

Detailed description of the settings dialog

### Options

Score width

- The score width in pixels units

Score height

- The score height in pixels units
    - Higher height means better frequencies resolution

Score base frequency

- Determine the base frequency in hertz units

Score octave range

- Control the range of frequencies

Polyphony

- Maximum polyphony

Note lifetime

- The lifetime of a note in **ms**, this is useful to handle MIDI keys note-off & release sections part of envelopes

FPS / Slices data rate

- The rate at which the audio server accept slices data
    - note : this only relate to the audio server rate; generally the client slices capture data at the display refresh rate which is generally 60 Hz, this has an impact on the synthesizer events resolution. As such it is possible to run the client without VSync or with a higher display rate monitor and change the audio server rate to increase the events resolution.

Compile delay (ms)

- Milliseconds delay before the code get compiled when typing stop (only affect GLSL code)
    - can be 0 (immediate) but performance may degrade (the compilation will be triggered often) good default is 100 ms

Show globalTime

- Hide/Show the globalTime in the informations bar

Show osc. infos

- Hide/Show the number of oscillators playing simultaneously in the informations bar

Show poly. infos

- Hide/Show the polyphony infos per output channels in the informations bar

Show slices

- Hide/Show slices, can be useful for visuals, this settings is not saved

Show slice channel

- Hide/Show slices channel number at the top of the slice

Show toolbar titles

- Hide/Show toolbar subtitles

Show OSD errors

- Hide/Show errors displayed in the top left or right corner of the window (may be useful to disable the OSD when the fullscreen editor is used)

Show inline errors

- Hide/Show inline errors displayed in the code editor

Show line numbers

- Hide/Show the line number in the code editor

Stylized scrollbar

- Enable/disable a better looking scrollbar for the code editor

Highlight matches

- Enable/disable matches highlight in the code editor (when words are selected)

Disable audio

- Enable/Disable audio

Editor theme

- A list of code editor themes

Editor font size

- Different font size to chose from

### Features

OSC IN

- Enable/disable OSC input, you can add and controls uniform variables through OSC, you will need an [OSC relay](https://github.com/grz0zrg/fsynth/tree/master/osc_relay) to use this feature

OSC OUT

- Enable/disable OSC output, slices data will be sent through OSC bundles via WebSockets, you will need an [OSC relay](https://github.com/grz0zrg/fsynth/tree/master/osc_relay) to use this feature

Feedback

- Enable/disable the previous frame in the Fragment shader (aka feedback), this is useful for complex effects, may be CPU/GPU intensive

### Servers

FAS address

- The network location of the [Audio Server](https://www.fsynth.com/documentation.html#fas)

OSC address

- The network location of the OSC relay / OSC websocket server to send data to
