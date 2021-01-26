[![Fragment](https://www.fsynth.com/data/fs_screenshot_logo.png)](https://www.fsynth.com)

# [Fragment - The Collaborative Graphical Audio Synthesizer](https://www.fsynth.com)

Source code repository for the Fragment app. which can be found at : https://www.fsynth.com

Table of Contents
=================

   * [<a href="https://www.fsynth.com">Fragment - The Collaborative Graphical Audio Synthesizer</a>](#fragment---the-collaborative-graphical-audio-synthesizer)
      * [About Fragment](#about-fragment)
      * [Requirement](#requirement)
      * [Features](#features)
      * [MIDI Features](#midi)
      * [OSC](#osc)
      * [Tools](#tools)
      * [Notes](#notes)
      * [Tips and tricks](#tips-and-tricks)
      * [Project organization](#project-organization)
      * [Build system](#build-system)
      * [How to setup your own server](#how-to-setup-your-own-server)
      * [Prod. system](#prod-system)
      * [The future](#the-future)
      * [Stuff used to make this](#stuff-used-to-make-this)
      * [Fragment on social medias](#fragment-on-social-medias)
      * [License](#license)
      * [Credits](#credits)

## About Fragment

Fragment is a graphical audio synth. / collaborative audiovisual live coding web. environment with a pixels based (image-synth) real-time sound synthesis approach, the **sound synthesis** is **powered by pixels data** generated from live [GLSL code](https://en.wikipedia.org/wiki/OpenGL_Shading_Language) and [Processing.js](http://processingjs.org/) code with many different types of input data available.

Many videos of most features are available on [YouTube](https://www.youtube.com/c/FragmentSynthesizer)

Fragment has only one fragment shader which has the particularity to be shared between the users of an online session, it update and compile on-the-fly as you or other peoples type, some settings are also synchronized between users such as slices and some global settings with the exception of inputs data which are not synchronized between users.

Fragment has many features making it a bliss to produce any kind of sounds associated (or not) with visuals, it is aimed at artists seeking a creative environment with few limitations to experiment with, a programmable noise-of-all-kinds software.

To output any sounds the client need to be used with the [Fragment Audio Server](https://github.com/grz0zrg/fas) which is a high performance native digital synthesizer.

Fragment require WebGL 2 compatible brower, audio can be produced independently from the visuals with the *synthOutput* **vec4** uniform.

For any questions, a message board is available [here](https://quiet.fsynth.com/)

## Requirement

- Web browser such as Chrome, Opera, Safari or Firefox (MIDI is not supported by Firefox at the moment)
- Mid-range GPU, this app. was made and tested with a GeForce GTX 970
- Mid-range multi-core CPU (a beefy CPU is needed if you use many instruments)
- Not necessary but a MIDI device such as a MIDI keyboard is recommended

**Note on performances :** Fragment has excellent performances with a modern multi-core system and a browser such as Chrome however due to browser UI reflow you may experience latency sometimes especially when typing in the code editor, this can be solved by using the independent code editor.

Fragment is able to do real-time distributed sound synthesis with its audio server, it support any number of machines over the wire and multicore support, this feature also need the fas_relay to work (see below)

## Features

- Sound synthesis powered by a fast & powerful [C native audio server](https://github.com/grz0zrg/fas) which has a very versatile high quality stereophonic / polyphonic / multitimbral sound engine with distributed sound synthesis, multi-machines/multi-core support (with fas_relay)
- Live coding/JIT compilation of shader code
- Real-time, collaborative app.
- MIDI IN/OUT support with [Web MIDI](https://caniuse.com/#feat=midi) compatible web browsers, MPE supported
- Multiple positional MIDI / OSC / AUDIO instruments with configurable output channel and more
- Real-time frames by frames recording with export as an image or as a .wav (additive synthesis only) or Fragment input (export back into itself, this can be used to build complex brushes for drawing canvas inputs)
- WebGL 2.0 / GLSL 3.0 support
- RGBA Live visuals with stereophonic sound generation
- Synthesis data processed in 32-bit precision (WebGL 2.0 & EXT_color_buffer_float extension) or 8-bit precision
- Feedback via framebuffer (for fx like reverb, delay, spectral distortion etc)
- OSC in/out support (there is a crude [SuperCollider](http://supercollider.github.io/) port of the additive synthesis engine)
- Shader inputs:
  - Webcam
  - Microphone (live analysis; mono)
  - Images
  - Videos with rate & rewind & loop settings (can import the audio track as an image)
  - Desktop capture (screen region, specific window or browser tab via `getDisplayMedia`)
  - Audio files (converted to images using Continuous Wavelet Transform)
  - Drawing canvas with drawing and compositing operations which use images Fragment input as brushes, Fragment is bundled with 20 high-quality brushes, a pack of 969 high-quality brushes is also available as a [separate download](https://www.fsynth.com/data/969_png_brushes_pack.7z)
  - [Processing.js](http://processingjs.org/) sketchs
- Uniform controllers via OSC [Open Stage Control is recommended](http://osc.ammd.net)
- No authentifications needed, anonymous (make use of *localStorage* and is *sessions* based)

### Sound Synthesis

Fragment capture pixels data (1px wide slices) from a WebGL drawing surface at the browser display refresh rate and translate the RGBA pixels value to notes, the notes are then interpreted and played by one or more synthesis method in real-time.

Common to all synthesis methods, the canvas represent frequencies (exponential mapping) on the vertical axis and time on the horizontal axis.

It can be seen as a front-end for a huge bank of oscillators / filters.

Audio synthesis is powered by an independent [audio server](https://github.com/grz0zrg/fas), Fragment doesn't output any real-time sounds on its own.

External synthesizers can be triggered via MIDI out.

Slices data can be sent via OSC bundles to use Fragment as an interface.

## MIDI

Fragment support MIDI inputs and MIDI outputs with compatible browsers.

##### Features

- MIDI keyboard support, list of MIDI parameters accessible in the fragment shader :
  - note-on/note-off messages
  - note frequency
  - velocity / release velocity
  - aftertouch
  - pitch bend
  - CC74
  - MIDI channel
  - elapsed time since the key was pressed
- Polyphony is automatically detected from the GPU capabilities (704 notes with a GeForce GTX 970 GPU, 16 notes is the minimum, maximum notes depend on the GPU capability/shader complexity)
- Multidimensional Polyphonic Expression (MPE) support
- Hot plugging of MIDI devices
- MIDI output
  - MIDI devices can be assigned to each slices
  - user-defined MIDI messages interpretation of RGBA values via bundled editor
  - polyphony/stereo panning through 16 channels
  - microtonal capabilities (frequency mapping is respected)

External synths can be triggered from pixels data via MIDI OUT, MIDI devices can be assigned to one or more slice, RGBA channels can be assigned to user-defined MIDI messages from the slice settings, Fragment has limited MPE support for output (non-standard for now) to support polyphony through 16 channels, every sounding note is temporarily assigned to its own MIDI channel, allowing microtonal, individual stereo panning and polyphonic capabilities.

If you need to control more parameters, see OSC below.

## OSC

Fragment support OSC input and output, an OSC relay which translate WebSockets data to UDP packets should be used for this feature to work.

Fragment uniforms can be defined through OSC with two methods :

- Message with an address starting with **i** such as */iarr*
  - This will create/update a **float** array uniform, the message should contain an array with index to update at index 0 and the value at index 1
  - If the array does not exist, it will create it and grow the array as needed
- Update whole float array with message starting with **a** address such as **/aarr**
  - This will create/update a whole **float** array uniform, the message should just contain all the array values

You can send a message to the **/clear** address to clear all OSC defined uniforms

[Open Stage Control](http://osc.ammd.net) can be used to control partials or more parameters through OSC via faders etc.

## Tools

Many tools are available to enhance Fragment.

- A graphical launcher for Fragment and the audio server program is available [here](https://github.com/grz0zrg/fas_launcher).
- [Independent GLSL editor which can directly connect to the sharedb server](https://github.com/grz0zrg/fsynth/tree/master/editor) 
- [Audio server which communicate via the WebSocket API](https://github.com/grz0zrg/fas)
- [OSC relay](https://github.com/grz0zrg/fsynth/tree/master/osc_relay)
- [FAS relay: Distributed multi-machines/multi-core realtime sound synthesis with three distribution algorithm](https://github.com/grz0zrg/fsynth/tree/master/fas_relay)
- [FFS: Audio server files manager API](https://github.com/grz0zrg/fsynth/tree/master/ffs)

- [SuperCollider port of the additive synthesis engine (use OSC)](https://github.com/grz0zrg/fsynth/tree/master/supercollider)
- [Additive synthesis web. sonogram player](https://github.com/grz0zrg/splayer)

## Limitations

* The main limitation of Fragment is the events granularity caused by the monitor refresh rate (which can be maxed out at 240 Hz on some monitors), this can also be solved by running the browser without VSYNC, example for Chrome with the command-line parameter **--disable-gpu-vsync** this may be not ideal for visuals. This will be solved as monitor / gpu progress is made with hopefully ideal granularity (granularity of human auditory system ENV / TFS is typically 1 to 3ms which mean ideal would be something like 500 FPS or double than that)
* Discrete mapping of frequencies can be seen as a limitation, especially for additive synthesis, this is solved by increasing the resolution of the canvas at a performance / bandwidth price.

## Tips and tricks

- Pressing F11 in the GLSL code editor make the editor fullscreen (as an overlay)
- You can feed the display content of any apps on your desktop (such as GIMP or Krita) by streaming your desktop as a camera (**v4l2loopback** and **ffmpeg** is useful to pull of this on Linux)

## Project organization

 * client - main application
 * www - landing page
 * fss - main server (discuss. system, slices)
 * fsdb - sharedb server (collaborative features)
 * fsws - web. server (only used for development or local installation)
 * ffs - file server (API to provide easy upload / informations of audio samples from FAS grains / impulses / waves directories; for convenience & for embedded uses)
 * osc_relay - an OSC relay which use the osc.js library (must be launched to use OSC features)
 * fas_relay - distributed multi-machines/multi-core realtime sound synthesis (interface between client / FAS servers)
 * editor - external GLSL code editor
 * supercollider - the SuperCollider port of the additive synthesis engine (fed through OSC)
 * documentation - MkDocs documentation
 * common.js - Server config. file

 All servers are clustered for scalability and smooth updates.

## Tech

Fragment client is a vanilla JavaScript web application, it use ECMAScript 5 and many Web API technologies. (Web Audio, Web Workers, Web MIDI, Web GL, Web Storage, indexedDB etc.) It was rapidly built from a prototype and had multiple iterations since then, UI code is probably the part which didn't change much in architectural terms and is probably the most bloated one.

Fragment client rely on few dependencies (CodeMirror, sharedb, Recorderjs etc.) and rely on some specifically built libraries such as WUI which handle all the UI widgets.

The client use a custom / simple build system and is architectured around its 'code injection' feature within a single function (see `app_fs.js`), all other files roughly follow a Fields declaration / Functions / Initialization structure, code injection and initialization calls is only done in `app_fs.js` for sanity.

Most backend apps are built using NodeJS.

## Build system

Fragment is built with a custom build system scanning for changes in real-time and which include files when it read /\*#include file\*/, it execute several programs on the output files such as code minifier, the build system was made with the functional *Anubis* programming language, a programming language based on cartesian closed category theory.

Since the *Anubis* language is mainly private, a simplified (without live check & build) Python port of the build system is available, check out [pyNut](https://github.com/grz0zrg/pynut)

If you want to build it by yourself, install [pyNut](https://github.com/grz0zrg/pynut) script somewhere in your PATH then call `pynutbuild` shell script in the `client` root directory.

**_app_fs\_** and **_app_cm\_** are the entry point files used by the build system to produce a single file and a production ready file in the *dist* directory.

You may need to install these dependencies (code minifier) globally through NPM :

 * sudo npm install csso -g
 * sudo npm install uglify-es -g

The Anubis build system can be found [here](https://github.com/grz0zrg/nut) and the build system is called by the shell script named `nutbuild` (root folder)

## How to setup your own server

Fragment make use of NodeJS, NPM, MongoDB and Redis database, install steps with APT (adapt to your package manager) :

 * sudo apt install nodejs
 * sudo apt install npm
 * sudo apt install mongodb
 * sudo apt install redis-server

Once those are installed, it is easy to run it locally:

 * clone this repository
 * cd fss & npm install & node fss
 * cd fsdb & npm install & node fsdb
 * cd fsws & npm install & node fsws
 * cd ffs & npm install & node ffs
 * point your browser to http://127.0.0.1:3000

Under Linux : proprietary GPU drivers is recommended due to performance reasons.

If you just want to try it out without the collaborative feature and GLSL code save, you don't need MongoDB and Redis, you just need "fsws" then point your browser to http://127.0.0.1:3000

If you want to use it with an OSC app like the SuperCollider fs.sc file or [Open Stage Control](http://osc.ammd.net), please look at the osc_relay directory.

To use the OSC relay :

- cd osc_relay & npm install & node osc_relay

To use the FAS relay :

- cd fas_relay & npm install & node fas_relay

## Prod. system

 * *prod_files* contain a list of files and directories that will be copied to the production system
 * *prod* is a shell script which produce an archive from *prod_files* list, perform additional cleanup and unarchive over SSH
 * *setup* is a script which is executed on the server after everything has been uploaded, this configure Fragment for the production system

## Credits

Libraries :
 * alot of them can be found in `app_fs.js` / `app_fs.css`
Papers :
 * [The Scientist and Engineer's Guide to Digital Signal Processing](http://www.dspguide.com)
 * [L'audionumérique 3°ed by Curtis Road](http://www.audionumerique.com/)

Data :
 * [Brushes](http://www.texturemate.com)

The repository for the early proof of concept can be found [here](https://github.com/grz0zrg/fs).

## Fragment on social medias

[YouTube](https://www.youtube.com/c/FragmentSynthesizer)

[Twitter](https://twitter.com/fragmentsynth)

[SoundCloud](https://soundcloud.com/fsynth/)

## License

Simplified BSD license

## Credits

The main inspiration for all of this is [Alexander Zolotov Virtual ANS software](http://www.warmplace.ru/soft/ans/)

Heavily inspired by [Shadertoy](https://www.shadertoy.com) as well.

Some ideas also come from [Sonographic sound processing](https://www.tadej-droljc.org/portfolio/sonographic-sound-processing/) and [Metasynth](http://uisoftware.com/MetaSynth/)