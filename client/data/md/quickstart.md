Fragment Quickstart Guide - Table of contents
   * [About Fragment](#about-fragment)
   * [Quickstart](#quickstart)
      * [Sessions](#sessions)
      * [User interface](#user-interface)
      * [Making sounds](#making-sounds)
      * [MIDI](#midi)
      * [Fragment Audio Server](#fragment-audio-server)
   * [Help](#help)

## About Fragment

Fragment is a collaborative cross-platform real-time audiovisual live coding environment with a pixels based approach, the sound synthesis is powered by pixels data produced by live GLSL code.

The GLSL code is executed on the GPU for each pixels (also called fragments), this approach allow hardware accelerated real-time manipulation of the pixels data, making it a bliss to create stunning visuals or stunning sound design.

Videos of most features are available on [YouTube](https://www.youtube.com/channel/UC2CJFT1_ybPcTNlT6bVG0WQ)

**Note**

- With web. browser audio, Fragment is **limited to additive synthesis** and two output channels.

Please consider the Fragment Audio Server (available on the [homepage](https://www.fsynth.com)) for fast additive/granular/subtractive/PM sound synthesis, multi-output channels (DAW connection) and many other features.

## Quickstart

### Sessions

You are in a Fragment session, a session is a public, anonymous and collaborative space containing session-specific GLSL code and settings (such as canvas parameters, including slices), all the sessions you joined in are saved locally and can be joined back by going to the [homepage](https://www.fsynth.com)

You can invite friends to join your session and collaborate online by sharing the link shown in the address bar

### User interface

Fragment interface is made of 4 parts

- info. panel/gain settings at the top
- a graphical area which represent frequency on the vertical axis and time on the horizontal axis
- a toolbar
- a GLSL code editor

### Making sounds

When a session is created for the first time, an example code is made available with a basic MIDI setup playing an additive synthesis SAW-like waveform and a ~440Hz continuous tone, the audio output is paused by default.

To hear the tone, slice the graphical canvas by right-clicking anywhere on the canvas, click on the (+) icon which appeared then click on the play button.

Slices capture the pixels data, the captured data is then sent to the sound synthesis engine in real-time, there is two main type of synthesis, additive and granular, **granular synthesis and many other type of synthesis are only available with the sound server/launcher which can be downloaded on the homepage**.

Any number of slices can be added, slices can be removed, muted or tweaked by right-clicking on it.

The slices can be moved by clicking on it, holding it and by moving the cursor around.

You can experiment right away with the sound/visual by tweaking the values of this sample program in the GLSL code editor, any modifications is updated in real-time as you type.

### MIDI

To play a saw-like waveform with a MIDI keyboard, click on the Jack plug icon on the toolbar to open the MIDI settings dialog and enable your MIDI controller.

### Fragment Audio Server

The Fragment audio server (FAS) is necessary for fast sound synthesis, additive/granular/subtractive/PM synthesis, multiple output channels and many other professional grade features.

[Please checkout the software documentation to setup the audio server on your machine.](https://www.fsynth.com/documentation/tutorials/audio_server/)

## Help

- Click on the ? icon on the toolbar, many code snippets and informations are available
- Checkout the [software documentation](https://www.fsynth.com/documentation)
- Post on the [Fragment message board](https://quiet.fsynth.com)

Have fun!