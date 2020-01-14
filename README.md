[![Fragment](https://www.fsynth.com/data/fs_screenshot_logo.png)](https://www.fsynth.com)

# [Fragment - The Collaborative Spectral Synthesizer](https://www.fsynth.com)

Source code repository for the Fragment app. which can be found at : https://www.fsynth.com

Table of Contents
=================

   * [<a href="https://www.fsynth.com">Fragment - The Collaborative Spectral Synthesizer</a>](#fragment---the-collaborative-spectral-synthesizer)
      * [About Fragment](#about-fragment)
      * [Requirement](#requirement)
      * [Features](#features)
         * [Sound Synthesis](#sound-synthesis)
            * [Additive Synthesis](#additive-synthesis)
            * [Granular Synthesis (<a href="https://github.com/grz0zrg/fas">FAS only)</a>](#granular-synthesis-fas-only)
            * [Sampler (<a href="https://github.com/grz0zrg/fas">FAS only)</a>](#sampler-fas-only)
            * [PM (<a href="https://github.com/grz0zrg/fas">FAS only)</a>](#pm-fas-only)
            * [Subtractive (<a href="https://github.com/grz0zrg/fas">FAS only)</a>](#subtractive-fas-only)
            * [Wavetable synthesis WIP (<a href="https://github.com/grz0zrg/fas">FAS only)</a>](#wavetable-synthesis-fas-only)
            * [Physical modelling (<a href="https://github.com/grz0zrg/fas">FAS only)</a>](#Physical-modelling-synthesis-fas-only)
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

Fragment is a collaborative audiovisual live coding web. environment with pixels based (image-synth) live additive/spectral/granular synthesis and sequencing, the **sound synthesis** is **powered by pixels data** generated from live [GLSL code](https://en.wikipedia.org/wiki/OpenGL_Shading_Language) and [Processing.js](http://processingjs.org/) code with many different types of input data.

Many videos of most features are available on [YouTube](https://www.youtube.com/c/FragmentSynthesizer)

Fragment has only one fragment shader which has the particularity to be shared between the users of an online session, it update and compile on-the-fly as you or other peoples type, some settings are also synchronized between users such as slices and some global settings.

Fragment has many features making it a bliss to produce any kind of sounds associated (or not) with visuals, it is aimed at artists seeking a creative environment with few limitations to experiment with, a programmable noise-of-all-kinds software.

With WebGL 2 capable web browser, audio can be produced independently from the visuals with the *synthOutput* **vec4** uniform, with WebGL 1 you can use the default pixels output (**gl_FragColor** or **fragColor**) to produce sounds and visuals, use the monophonic mode if you want independent audio & visuals with WebGL 1.

For any questions, a message board is available [here](https://quiet.fsynth.com/)

You can support this project through [Patreon](https://www.patreon.com/fsynth)

## Requirement

- Recent web browser such as Chrome, Opera, Safari or Firefox (MIDI is not supported by Firefox at the moment)
- Mid-range GPU, this app. was made and tested with a GeForce GTX 970
- Mid-range multi-core CPU (a dual core should be ok with the FAS, a beefy CPU is needed if you use more than one output channel)
- Not necessary but a MIDI device such as a MIDI keyboard is recommended

**Note on performances :** Fragment has excellent performances with a modern multi-core system and a browser such as Chrome, if you experience crackles or need advanced audio features, it is recommended that you use the sound server and the independent code editor, the things that may cause poor performances is due to the browser reflow (UI side)

Fragment is also able to do real-time distributed sound synthesis with the sound server, it support any number of machines over the wire and multicore support, this feature also need the fas_relay to work (see below)

## Features

- Additive, spectral, granular, subtractive, wavetable, phase modulation synthesizer powered by WebAudio oscillators (additive only, work best in Chrome), a Wavetable with AudioWorklet (additive only, probably the best in the future) OR a [C native audio server](https://github.com/grz0zrg/fas) (fastest/best)
- Live coding/JIT compilation of shader code
- Real-time, collaborative app.
- Distributed sound synthesis, multi-machines/multi-core support (Fragment Audio Server with fas_relay)
- Stereophonic or monaural
- Polyphonic
- Multitimbral
- MIDI IN/OUT support with [Web MIDI](https://caniuse.com/#feat=midi) compatible web browsers, MPE supported
- Adjustable audio output channel per slices
- Real-time frames by frames recording with export as an image or Fragment input (export back into itself, this can be used to build complex brushes for drawing canvas inputs)
- .wav export (without FAS : additive synthesis only)
- WebGL 2.0 and GLSL 3.0 support when compatibility is detected
- RGBA Live visuals with stereophonic sound generation (WebGL 2.0) or monophonic sound generation (WebGL 1)
- Synthesis data processed in 32-bit precision (WebGL 2.0 & EXT_color_buffer_float extension) or 8-bit precision
- Slices can be added/deleted anywhere on the canvas without limits, move left or right automatically and have independent pitch offset
- Feedback via framebuffer (for fx like reverb, delay, spectral distortion etc)
- OSC in/out support (a [SuperCollider](http://supercollider.github.io/) port of the additive synthesis engine use this)
- Shader inputs:
  - Webcam (no audio support)
  - Images
  - Videos with rate & rewind & loop settings (can import the audio track as an image)
  - Desktop capture (screen region, specific window or browser tab via `getDisplayMedia`)
  - Audio files (translated to images)
  - Drawing canvas with drawing and compositing operations which use images Fragment input as brushes, Fragment is bundled with 20 high-quality brushes, a pack of 969 high-quality brushes is also available as a [separate download](https://www.fsynth.com/data/969_png_brushes_pack.7z)
  - [Processing.js](http://processingjs.org/) sketchs
- Uniform controllers via OSC [Open Stage Control is recommended](http://osc.ammd.net)
- Per-sessions discussion system
- Global and per sessions settings smart save/load; make use of *localStorage*
- No authentifications needed, anonymous (make use of *localStorage* and is *sessions* based)

### Sound Synthesis

Fragment capture pixels data (1px wide slices) from a WebGL drawing surface at the browser display refresh rate and translate the RGBA pixels value to notes, the notes are then interpreted and played by one or more synthesis method in real-time.

Common to all synthesis methods, the canvas represent frequencies (exponential mapping) on the vertical axis and time on the horizontal axis.

The [Fragment audio server](https://github.com/grz0zrg/fas) is necessary for very fast sound synthesis and other features such as different output channels per slices.

With the web browser, Fragment is limited to additive synthesis and two output channels, external synthesizers can be triggered via MIDI out.

Slices data can be sent via OSC bundles to extend the possibilities of this synthesizer.

#### Additive Synthesis

Fragment default sound synthesis is additive, with additive synthesis, Fragment become a fully capable spectral synthesizer able to do re-synthesis based on imported videos or audio files, an image-synth where any number of partials can be played, there is no limits except the canvas height and the computing resources available.

With additive synthesis and stereo mode, the Red channel is the left oscillator amplitude and the Green channel is the right oscillator amplitude.

With FAS (Fragment Audio Server), the Blue channel value is used to add bandwidth noise to the oscillator which may enhance the sound by adding a noise component to the oscillator.

In monophonic mode, the alpha value is used for both L&R oscillator amplitude.

#### Granular Synthesis ([FAS](https://github.com/grz0zrg/fas) only)

FAS load all samples in a "grains" folder and try to guess their pitch to map it on the canvas so that it match the canvas freq. mapping.

Fragment let you manipulate granular synthesis parameters, there is two type of parameters, channels based and dynamic parameters from the fragment shader output.

Channels based parameters :

- Granular envelope
  - sine
  - hann
  - hamming
  - tukey
  - gaussian
  - confined gaussian
  - trapezoidal
  - blackman
  - blackman harris
  - parzen
  - nutall
  - flattop
  - kaiser
- Minimum grain length (ms)
- Maximum grain length (ms)

Dynamics parameters

- Red = Left amplitude
- Green = Right amplitude
- Blue = Sample index bounded to [0, 1] (cyclic) and grains density when > 2
- Alpha = Grains start index bounded [0, 1] (cyclic), grains start index random 
  [0, 1] factor when > 1, play the grain backward when negative

#### Sampler ([FAS](https://github.com/grz0zrg/fas) only)

Granular synthesis with grain start index of 0 and min/max duration of the sample duration can be used to trigger samples as-is like a regular sampler.

#### PM ([FAS](https://github.com/grz0zrg/fas) only)

Phase modulation (PM) is a mean to generate sounds by modulating the phase of an oscillator (carrier) from another oscillator (modulator), it is very similar to frequency modulation (FM).

PM synthesis in Fragment work by giving an oscillator index (based on image-height) to the note, this oscillator will be used as a modulator.

No filtering is applied.

Dynamics parameters

- Red = Amplitude value of the LEFT channel
- Green = Amplitude value of the RIGHT channel
- Blue = Fractionnal part : Modulator amplitude
- Alpha = Modulator frequency

#### Subtractive ([FAS](https://github.com/grz0zrg/fas) only)

Subtractive synthesis start from harmonically rich waveforms which are then filtered.

It is fast, can use additive synthesized waveforms or Poly BLEP waveforms, there is only one high quality low-pass filter (Moog type) implemented.

There is four type of waveforms : sawtooth, square, triangle, noise

**Note** : The waveforms are constitued of a maximum of 64 partials with additive synthesis

Dynamics parameters

- Red = Amplitude value of the LEFT channel
- Green = Amplitude value of the RIGHT channel
- Blue = Moog filter cutoff parameter
- Alpha = Moog filter resonance [0, 1] & waveform selection on integral part (0.x, 1.x, 2.x etc)

#### Wavetable synthesis ([FAS](https://github.com/grz0zrg/fas) only, WIP)

Wavetable synthesis is a sound synthesis technique that employs arbitrary periodic waveforms in the production of musical tones or notes.

Wavetable synthesis use single cycle waveforms / samples loaded from the grains folder.

The wavetable can be switched with the alpha channel (integral part), a linear interpolation will happen between current & next wavetable upon switch.

Wavetable synthesis is fast.

There is only one high quality low-pass filter (Moog type) implemented.

Dynamics parameters

- Red = Amplitude value of the LEFT channel
- Green = Amplitude value of the RIGHT channel
- Blue = Filter cutoff parameter
- Alpha = Filter resonance [0, 1] & wavetable selection on integral part (0.x, 1.x, 2.x etc)

#### Physical modelling synthesis ([FAS](https://github.com/grz0zrg/fas) only)

Physical modelling synthesis refers to sound synthesis methods in which the waveform of the sound to be generated is computed using a mathematical model, a set of equations and algorithms to simulate a physical source of sound, usually a musical instrument.

Physical modelling in Fragment use Karplus-Strong string synthesis (for now).

This is a fast method which generate pleasant string-like sounds.

Dynamics parameters

- Red = Amplitude value of the LEFT channel
- Green = Amplitude value of the RIGHT channel
- Blue = Noise wavetable cutoff lp filter / fractional part : stretching factor
- Alpha = Noise wavetable res. lp filter

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
  - user-defined MIDI messages interpretation of RGBA values
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


- [SuperCollider port of the additive synthesis engine (use OSC)](https://github.com/grz0zrg/fsynth/tree/master/supercollider)
- [Additive synthesis web. sonogram player](https://github.com/grz0zrg/splayer)

## Limitations

* The main limitation of Fragment is the events granularity caused by the monitor refresh rate (60 or 120 FPS), this can be solved by running the browser without VSYNC, example for Chrome with the command-line parameter **--disable-gpu-vsync** this may be not ideal for visuals however.
* Discrete mapping of frequencies can be seen as a limitation, especially for additive synthesis, this is mostly solved by increasing the resolution of the canvas.
* Additive synthesis : Phases are randomly assigned
* Many synthesis parameters cannot be mapped well due to RGBA, this is a limitation which apply mainly to PM/FM, this limit the number of algorithm for example.

## Notes

- WebAudio oscillators and the WebAudio Worklet mode can only have two output channels (L/R) due to performances issues (this may change in the future!)


## Tips and tricks

- If you enable the *monophonic* setting, you have the RGB output for live coding visuals which can be fully synchronized with the synthesized sounds, sounds will be synthesized by using the alpha channel
- Pressing F11 in the GLSL code editor make the editor fullscreen (as an overlay)
- You can feed the display content of any apps on your desktop (such as GIMP or Krita) by streaming your desktop as a camera (**v4l2loopback** and **ffmpeg** is useful to pull of this on Linux)

## Project organization

 * client - main application
 * www - landing page
 * fss - main server (discuss. system, slices)
 * fsdb - sharedb server (collaborative features)
 * fsws - web. server (only used for development or local installation)
 * osc_relay - an OSC relay which use the osc.js library (must be launched to use OSC features)
 * fas_relay - distributed multi-machines/multi-core realtime sound synthesis
 * editor - external GLSL code editor
 * supercollider - the SuperCollider port of the additive synthesis engine (fed through OSC)
 * documentation - MkDocs documentation and previous MAML (Minimalist Anubis Markup Language) documentation with the latest HTML and PDF doc.
 * main.js - Electron app. file
 * common.js - Server config. file

 All servers are clustered for scalability and smooth updates.

## Build system

Fragment is built with a custom build system scanning for changes in real-time and which include files when it read /\*#include file\*/, it execute several programs on the output files such as code minifier, the build system was made with the functional *Anubis* programming language, a programming language based on cartesian closed category theory.

Since the *Anubis* language is relatively unknown, a simplified (without live check & build) Python port of the build system is available, check out [pyNut](https://github.com/grz0zrg/pynut)

If you want to build it by yourself, install [pyNut](https://github.com/grz0zrg/pynut) script somewhere in your PATH then call `pynutbuild` shell script in the `client` root directory.

**_app_fs\_** and **_app_cm\_** are the entry point files used by the build system to produce a single file and a production ready file in the *dist* directory.

You may need to install these dependencies (code minifier) globally through NPM :

 * sudo npm install csso -g
 * sudo npm install uglify-es -g

The Anubis build system can be found [here](https://github.com/grz0zrg/nut) and this build system is called by the shell script named `nutbuild` (root folder)

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

## The future

Maybe a VST/LV2 plugin for accessibility and of course many new features are coming soon. ;)

## Stuff used to make this

Client :
 * [Vanilla JS](http://vanilla-js.com/) yup!
 * [WUI](https://github.com/grz0zrg/wui) vanilla collection of UI widgets for the web
 * [CodeMirror](http://codemirror.net/) for the awesome editor and its addons/modes
 * [osc.js](https://github.com/colinbdclark/osc.js/)
 * [glsl-simulator](https://github.com/burg/glsl-simulator) the GLSL parser is based on glsl-simulator
 * [ShareDB](https://github.com/share/sharedb/) for the collaborative features
 * [mpejs](https://github.com/WeAreROLI/mpejs)
 * [FileSaver.js](https://github.com/eligrey/FileSaver.js/)
 * [Recorderjs](https://github.com/mattdiamond/Recorderjs)
 * [Normalize](https://necolas.github.io/normalize.css/)
 * [Skeleton](http://getskeleton.com/) for the landing page
 * [Showdown](https://github.com/showdownjs/showdown) in-app markdown
 * [Mikola Lysenko stft (enhanced version)](https://github.com/mikolalysenko/stft)

Papers :
 * [The Scientist and Engineer's Guide to Digital Signal Processing](http://www.dspguide.com)
 * [L'audionumérique 3°ed by Curtis Road](http://www.audionumerique.com/)
 * [Fabrice Neyret Desmos page](http://www-evasion.imag.fr/Membres/Fabrice.Neyret/demos/DesmosGraph/indexImages.html)

Servers :
 * [NodeJS](https://nodejs.org/en/)
 * [NGINX](https://www.nginx.com/)
 * [Flarum](http://flarum.org/)
 * [pm2](https://github.com/Unitech/pm2)
 * [MongoDB](https://www.mongodb.com)
 * [Redis](https://redis.io/)
 * [Winston](https://github.com/winstonjs/winston)
 * [Express](http://expressjs.com/)
 * [strong-cluster-control](https://github.com/strongloop/strong-cluster-control)

Utilities :
 * [FontAwesome](http://fontawesome.io/)
 * [pegjs](https://www.pegjs.org)
 * [fa2png](http://fa2png.io/)
 * [Brackets](http://brackets.io/)
 * [Atom](https://atom.io/)
 * [desmos](https://www.desmos.com)
 * [libwebsockets](https://libwebsockets.org/) for [fas](https://github.com/grz0zrg/fas)
 * [portaudio](http://www.portaudio.com/) for [fas](https://github.com/grz0zrg/fas)
 * [libflds](http://liblfds.org/) for [fas](https://github.com/grz0zrg/fas)
 * [SimpleScreenRecorder](http://www.maartenbaert.be/simplescreenrecorder/) for videos recording
 * [KDEnlive](https://kdenlive.org/) to edit the videos
 * [Geogebra](https://www.geogebra.org) for the logo
 * [Inkscape](https://www.inkscape.org) for the logo and some graphics
 * [GIMP](https://www.gimp.org/) some graphics
 * [MkDocs](http://www.mkdocs.org/) Documentation
 * [The Anubis programming language](http://redmine.anubis-language.com/)
 * [Minimalist Anubis Markup Language](http://redmine.anubis-language.com/)
 * [Nut](https://github.com/grz0zrg/nut)
 * [HotShots](https://sourceforge.net/projects/hotshots) for the UI quick reference

Data :
 * [Brushes](http://www.texturemate.com)

The repository for the early proof of concept can be found [here](https://github.com/grz0zrg/fs).

## Fragment on social medias

[YouTube](https://www.youtube.com/c/FragmentSynthesizer)

[Twitter](https://twitter.com/fragmentsynth)

[Facebook](https://www.facebook.com/fsynth/)

[SoundCloud](https://soundcloud.com/fsynth/)

## License

Simplified BSD license

## Credits

The main inspiration for all of this is [Alexander Zolotov Virtual ANS software](http://www.warmplace.ru/soft/ans/)

Heavily inspired by [Shadertoy](https://www.shadertoy.com) as well.
