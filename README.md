[![Fragment](https://www.fsynth.com/data/fs_screenshot_logo.png)](https://www.fsynth.com)

# [Fragment - The Collaborative Spectral Synthesizer](https://www.fsynth.com)

Source code repository for the Fragment app. which can be found at : https://www.fsynth.com

This is a web. additive/spectral/granular synthesizer/sequencer powered by live [GLSL code](https://en.wikipedia.org/wiki/OpenGL_Shading_Language)

Fragment basically capture slices of a WebGL canvas at the display refresh rate and translate RGBA pixels value to notes, the notes are then interpreted and played by one of the synthesis engine method, with the additive synthesis engine, this is actually like generating the sound spectrum by code. The frame data can also be sent via OSC bundles. 

The content of the WebGL canvas is produced on the GPU by a collaborative GLSL script, this make it extremely fast and easy to do any kinds of pixels manipulations.

Fragment has many features making it a bliss to produce any kind of sounds associated (or not) with visuals, it is aimed at artists seeking a creative environment with few limitations to experiment with, a programmable noise-of-all-kinds software.

Fragment can be used for live coding visuals, either exclusively like ShaderToy or with sounds, the visual can be synchronized to any audio using the MIDI capabilities AND also synchronized to the synthesized sound, canvas inputs can be quite fun to use with generated visuals!

This is a sort of [Shadertoy](https://www.shadertoy.com) with a special kind of audio data source, it is compatible with most shaders written for it.

Fragment is quite modular and has several external app. such as an external GLSL editor which can directly connect to the sharedb server and a native additive synthesis engine which communicate via the WebSocket API, a WIP IanniX/OSC relay is also available and more is to come!

Fragment can also act as a standalone sequencer but you have to make your own software that interpret the data sent via WebSocket, this synthesizer can also send its data via OSC.

Fragment support OSC inputs as well, if you send OSC messages starting with "i" (a single message which update a specific index of the array) or "a" (a single message with all the array data) as the address, it will define a shader uniform of that name with the data as a float array, [Open Stage Control](http://osc.ammd.net) can be used to control partials or more parameters through OSC that way. 

For any questions, a message board is available [here](https://quiet.fsynth.com/)

## Features

 * Complete additive and granular (WIP) synthesizer powered by WebAudio oscillators (work best in Chrome), a Wavetable (slow) OR a C native audio server (fastest)
 * Live coding/JIT compilation of shader code
 * Real-time, collaborative app.
 * Stereophonic or monaural
 * Polyphonic
 * Multitimbral
 * Adjustable audio output channel per slices
 * Real-time frames by frames recording with export as image or Fragment input (export back into itself, this can be used to build complex brushes for drawing canvas inputs)
 * WebGL 2.0 and GLSL 3.0 support when compatibility is detected
 * RGBA Live visuals with stereophonic sound generation (WebGL 2.0) or monophonic sound generation (WebGL 1)
 * Synthesis data processed in 32-bit precision (WebGL 2.0 & EXT_color_buffer_float extension) or 8-bit precision
 * Slices can be added/deleted anywhere on the canvas, move left or right automatically and have independent pitch offset for convenience
 * Feedback via framebuffer (for fx like reverb, delay, spectral distortion etc)
 * OSC in/out support (a [SuperCollider](http://supercollider.github.io/) port of the synthesis engine which use OSC is also available)
 * Shader inputs:
    * Webcam
    * Images
    * Audio files (translated to images)
    * Drawing canvas with drawing and compositing operations which use images Fragment input as brushes, Fragment is bundled with 20 high-quality brushes, a pack of 969 high-quality brushes is also available as a [separate download](https://www.fsynth.com/data/969_png_brushes_pack.7z)
 * Uniform controllers via OSC [Open Stage Control is recommended](http://osc.ammd.net)
 * Per-sessions discussion system
 * Global and per sessions settings automatic save/load; make use of *localStorage*
 * No authentifications (make use of *localStorage* and is *sessions* based)

 ***Note**: With WebGL 2 compatible browser, Fragment make use of two separate output by default, "synthOutput" can be used to feed the synthesizer (with R=L, G=R, see note below) while "fragColor" or "gl_FragColor" can be used to do visuals.

 ***Note**: Without WebGL 2 compatible browser, Fragment interpret the Red and Green shader output (gl_FragColor or fragColor) when stereophonic mode is enabled, the blue component output is left unused and can be used for real-time sounds/visuals sync or direct visual feedback (debug, aesthetic ...) of functions/textures etc... when in monophonic mode the full RGB output is available for visuals and the synthesizer use the alpha channel*

 ***Note**: WebAudio oscillators and Wavetable mode can only have two output channels (L/R) due to performances issues (this may change in the future!)*

 ***Note**: One of the main limitation of Fragment may be the events granularity caused by the monitor refresh rate (60 or 120 FPS), this can be solved by running the browser without VSYNC, example for Chrome with the command-line parameter "--disable-gpu-vsync"

## MIDI Features (Integrated MIDI support with the WebMIDI API):

 * Integrated note-on/note-off messages, note frequency, velocity, MIDI channel and elapsed time are accessible in the fragment shader (this is not shared between users)
 * Polyphony is automatically detected from the GPU capabilities (704 notes with a GeForce GTX 970 GPU, 16 notes is the minimum, maximum notes depend on the GPU capability/shader complexity)
 * Hot plugging of MIDI devices are supported
 * MIDI enabled shader inputs

## Requirement:

 * Recent browser such as Chrome, Opera, Safari or Firefox (WebMIDI is still not supported by Firefox)
 * Recent medium GPU (Graphics Processing Unit), this app. was made and is used with a GeForce GTX 970
 * Recent medium multi-core CPU (a dual core should be ok with the native program, a beefy CPU is needed if you use more than one output channel), this is required for the audio synthesis part
 * Not necessary but a MIDI device such as a MIDI keyboard and a MIDI controller is recommended

Fragment has excellent performances with a modern multi-core system and a browser such as Chrome, if you experience crackles or need advanced audio features, it is recommended that you use the external synthesis program (FAS) and the external code editor, the things that may cause poor performances is generally due to the browser reflow (UI side), also, although a great feature, detached dialog have quite poor performances sometimes due to them being tied to the parent window thread... this may change with the future of browsers.

## The project

 * client - main application
 * www - landing page
 * fss - main server (discuss. system, slices)
 * fsdb - sharedb server (collaborative features)
 * fsws - web. server (only used for development or local installation)
 * osc_relay - an OSC relay which use the osc.js library (must be launched to use OSC features)
 * editor - external GLSL code editor
 * supercollider - the SuperCollider port of the additive synthesis engine (fed through OSC)
 * documentation - MAML (Minimalist Anubis Markup Language) with the latest HTML and PDF doc.
 * main.js - Electron app. file
 * common.js - Server config. file

 All servers are clustered for scalability and smooth updates.

## Build

Fragment is built with a custom build system called Nut scanning for changes in real-time and which include files when it read /\*#include file\*/, it execute several programs on the output files such as code minifier for production ready usage, the build system was made with the functional *Anubis* programming language based on cartesian closed category theory.

_app_fs.\*_ and _app_cm.\*_ are the entry point files used by the build system to produce a single file and a production ready file in the *dist* directory.

If you want to build it by yourself, you will have to find a way to run a pre-processor over _app_fs.\*_ and _app_cm.\*_ or implement other systems like requireJS! This was made like this for build system simplicity and independence.

The build system can be found [here](https://github.com/grz0zrg/nut) and the build system is called by the shell script named `nutbuild` (root folder)

## How to setup your own

Fragment make use of NodeJS, NPM, MongoDB and Redis database, once those are installed, it is easy to run it locally:

 * clone this repository
 * cd fss & npm install & node fss
 * cd fsdb & npm install & node fsdb
 * cd fsws & npm install & node fsws
 * point your browser to http://127.0.0.1:3000

 If you just want to try it out without the collaborative feature and GLSL code save, you don't need MongoDB and Redis, you just need "fsws" then point your browser to http://127.0.0.1:3000

 If you want to use it with an OSC app like the SuperCollider fs.sc file or [Open Stage Control](http://osc.ammd.net), please look at the osc_relay directory.
 
 To use the OSC relay : cd osc_relay & npm install & node osc_relay

## Prod. system

 * *prod_files* contain a list of files and directories that will be copied to the production system
 * *prod* is a shell script which produce an archive from *prod_files* list, perform additional cleanup and unarchive over SSH
 * *setup* is a script which is executed on the server after everything has been uploaded, this configure Fragment for the production system

## Native app.

A native app. was developed with [Electron](http://electron.atom.io/) featuring a special login page but it is deprecated as some features does not work with Electron (like dialogs), the advantage of the native app was the built-in [C powered additive synthesis engine](https://github.com/grz0zrg/fas) which made Fragment a bit more accessible (download & play), you can run the native app with Electron by executing `electron .` in the root directory

A graphical launcher for the audio server program is available [here](https://github.com/grz0zrg/fas_launcher).

## Tips and tricks

 * If you enable the *monophonic* setting, you have the RGB output for live coding visuals which can be fully synchronized with the synthesized sounds which will be synthesized by using the alpha channel
 * Pressing F11 in the GLSL code editor make the editor fullscreen (as an overlay)
 * You can feed the display content of any apps on your desktop (such as GIMP or Krita) by streaming your desktop as a camera (v4l2loopback and ffmpeg is useful to pull of this on Linux)

## The future

Some more work involving parallelism and plenty of bugfix on the native FAS program need to be done, maybe a VST/LV2 plugin for accessibility and of course many new features are coming soon. ;)

A native app. will be done soon but with a totally different paradigm, it may be the "ultimate" image synth while being extremely simple technically and very flexible/accessible, it will also fix the main limitation of Fragment by allowing > 60 FPS capture (configurable so not limited to the display refresh rate...) which mean basically unlimited granularity as the hardware get faster.

## Stuff used to make this

Client :
 * [Vanilla JS](http://vanilla-js.com/) yup!
 * [WUI](https://github.com/grz0zrg/wui) vanilla collection of UI widgets for the web
 * [CodeMirror](http://codemirror.net/) for the awesome editor and its addons/modes
 * [osc.js](https://github.com/colinbdclark/osc.js/)
 * [glsl-simulator](https://github.com/burg/glsl-simulator) the GLSL parser is based on glsl-simulator
 * [ShareDB](https://github.com/share/sharedb/) for the collaborative features
 * [Normalize](https://necolas.github.io/normalize.css/)
 * [Skeleton](http://getskeleton.com/) for the landing page
 * [Mikola Lysenko stft (enhanced version)](https://github.com/mikolalysenko/stft)

Papers :
 * [The Scientist and Engineer's Guide to Digital Signal Processing](http://www.dspguide.com)
 * [Welsh's Synthesizer Cookbook](http://www.synthesizer-cookbook.com)
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
 * [Geogebra](https://kdenlive.org/) for the logo
 * [Inkscape](https://www.inkscape.org) for the logo and some graphics
 * [GIMP](https://www.gimp.org/) some graphics
 * [The Anubis programming language](http://redmine.anubis-language.com/)
 * [Minimalist Anubis Markup Language](http://redmine.anubis-language.com/)
 * [Nut](https://github.com/grz0zrg/nut)
 * [HotShots](https://sourceforge.net/projects/hotshots) for the UI quick reference

Data :
 * [Brushes](http://www.texturemate.com)

The repository for the early proof of concept can be found [here](https://github.com/grz0zrg/fs).

## Fragment on social medias

[Facebook](https://www.facebook.com/fsynth/)

[YouTube](https://www.youtube.com/channel/UC2CJFT1_ybPcTNlT6bVG0WQ)

[Twitter](https://twitter.com/fragmentsynth)

[SoundCloud](https://soundcloud.com/fsynth/)

## License

Simplified BSD license

## Credits

The main inspiration (how it started) for all of this is [Alexander Zolotov Virtual ANS software](http://www.warmplace.ru/soft/ans/), thank to him.

Heavily inspired by [Shadertoy](https://www.shadertoy.com) as well.
