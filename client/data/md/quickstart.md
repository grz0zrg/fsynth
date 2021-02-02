Fragment Quickstart Guide - Table of contents
   * [About Fragment](#about)
   * [Quickstart](#quickstart)
      * [Sessions](#sessions)
      * [User interface](#userinterface)
      * [Making sounds](#makingsounds)
      * [MIDI](#midi)
      * [More examples](#moreexamples)
   * [Getting help](#help)

## About

Fragment is a collaborative real-time audiovisual live coding environment, an unique combination of a web-based interface / accelerated graphics canvas with an oscillator-bank / filter-bank / spectral synthesizer, the sound synthesis is powered by pixels data produced with live GLSL code.

The GLSL code is executed on the GPU for each pixels, this approach allow hardware accelerated real-time manipulation of the pixels data, making it a bliss to create stunning visuals or stunning sound design.

Videos of most features are available on [YouTube](https://www.youtube.com/c/FragmentSynthesizer)

**Note**

To output any sounds the audio server available on the homepage must be launched.

[Please checkout the software documentation to install the audio server on your machine.](https://www.fsynth.com/documentation/getting_started/)

## Quickstart

### Sessions

This is a Fragment session, a session is a public, anonymous and collaborative space containing session-specific GLSL code and settings such as canvas parameters and slices parameters, all the sessions you joined in are saved locally and can be joined back by going to the [homepage](https://www.fsynth.com)

You can invite friends to join your session and collaborate online by sharing the link shown in the address bar

### User interface

Fragment interface is made of 4 parts

- info. panel/gain settings at the top
- a graphical area which represent frequency on the vertical axis and time on the horizontal axis
- a toolbar
- a workspace / GLSL code editor

Red squares indicate that the control can be used with a MIDI controller by clicking on the square and tweaking one of your controller. (MIDI learn)

### Making sounds

When a session is created for the first time, an example code is made available with a basic MIDI setup, this setup allow playing with an additive synthesis SAW-like waveform and a ~440Hz continuous tone, the audio output is paused by default.

To hear the tone, slice the graphical canvas by **right-clicking anywhere on the canvas**, **click on the (+) icon** which appeared then **click on the play button**.

Slices capture the pixels data, the captured data is then sent to the audio server in real-time.

Any number of slices can be added, slices can be removed, muted or tweaked by right-clicking on it.

Slices can be moved by clicking on it, holding it and moving the cursor around.

You can also open the slices dialog which show an overview of all slices by double clicking anywhere on the canvas.

You can experiment right away with the sound/visual by tweaking the values of this sample program in the GLSL code editor, any modifications is updated in real-time as you type.

### MIDI

To play a saw-like waveform with a MIDI keyboard, click on the Jack plug icon on the toolbar to open the MIDI settings dialog and enable your MIDI controller.

### More examples

Once done with the basics you may want to explore some examples in the workspace section, just browse the categories then click on an example to load it, all examples can be tweaked but changes are not saved, only the session code **main** and **library** are saved and synchronized as you type.

## Help

- Click on the **?** icon on the toolbar, many code snippets, interactive guides and informations are available
- Checkout the [software documentation](https://www.fsynth.com/documentation)
- Post on the [Fragment message board](https://quiet.fsynth.com)
- Join the [Discord server](https://discord.gg/CQ3zqpd)

Have fun!