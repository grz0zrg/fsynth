# [Fragment - The Collaborative Spectral Synthesizer](https://www.fsynth.com)

[![Fragment](https://www.fsynth.com/data/fs_screenshot_logo.png)](https://www.fsynth.com)

Source code repository for the Fragment app. which can be found at : https://www.fsynth.com

This is a web. spectral synthesizer powered by live [GLSL code](https://en.wikipedia.org/wiki/OpenGL_Shading_Language).

Feature list:

 * Full-blown additive synthesizer powered by WebAudio oscillators, a wavetable OR a native program written in C
 * Live coding and JIT compilation of shader code
 * Real-time, collaborative app.
 * MIDI enabled shader inputs
 * Shader inputs, webcam, textures and more
 * Real-time analysis (logarithmic spectrum view of the output etc.)
 * Native app. powered by [Electron](http://electron.atom.io/) with built-in [C powered additive synthesizer](https://github.com/grz0zrg/fas)
 * Per-sessions discussion system
 * No authentifications (make use of *localStorage* and is *sessions* based)

## The project

 * client - main application
 * www - landing page
 * fss - main server (discuss. system, slices)
 * fsdb - sharedb server (collaborative features)
 * fsws - web. server (only used for development)
 * main.js - Electron app. file
 * common.js - Servers config. files

## Build

Fragment was done with a custom build system which watch for changes and include files when it read /\*#include file\*/, it was made with the functional *Anubis* programming language.

_app_fs.\*_ and _app_cm.\*_ are the entry point files used by the build system to produce a single file and a production ready file in the *dist* directory.

If you want to build it by yourself, you will have to find a way to run a pre-processor over _app_fs.\*_ and _app_cm.\*_ or implement other systems like requireJS!

## Prod. system

 * *prod_files* contain a list of files and directories that will be copied to the production system
 * *prod* is a shell script which produce an archive from *prod_files*, perform additional cleaning and unarchive over SSH
 * *setup* is a script which is executed on the server after everything has been uploaded and which configure Fragment for the system

## Server structure

 * main app. directory is /home/fs/fsynth with user "fs"
 * NGINX reverse proxy for fsdb/fss, simple NGINX rules for landing page and main app.
 
## Social medias

[Facebook](https://www.facebook.com/fsynth/)
[YouTube](https://www.youtube.com/channel/UC2CJFT1_ybPcTNlT6bVG0WQ)
[Twitter](https://twitter.com/fragmentsynth)
[SoundCloud](https://soundcloud.com/fsynth/)

## Stuff used to make this:

Client :
 * [Vanilla JS](http://vanilla-js.com/) yup!
 * [WUI](https://github.com/grz0zrg/wui) vanilla collection of UI widgets for the web
 * [CodeMirror](http://codemirror.net/) for the awesome editor
 * [ShareDB](https://github.com/share/sharedb/) for the collaborative features
 * [Normalize](https://necolas.github.io/normalize.css/)
 * [Skeleton](http://getskeleton.com/) for the landing page

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
 * [fa2png](http://fa2png.io/)
 * [Brackets](http://brackets.io/)
 * [Atom](https://atom.io/)
 * [libwebsockets](https://libwebsockets.org/) for [fas](https://github.com/grz0zrg/fas)
 * [portaudio](http://www.portaudio.com/) for [fas](https://github.com/grz0zrg/fas)
 * [libflds](http://liblfds.org/) for [fas](https://github.com/grz0zrg/fas)
 * [SimpleScreenRecorder](http://www.maartenbaert.be/simplescreenrecorder/) for videos recording
 * [KDEnlive](https://kdenlive.org/) to edit the videos
 * [The Anubis programming language](http://redmine.anubis-language.com/)

The repository for the early proof of concept can be found [here](https://github.com/grz0zrg/fs).

## License

Simplified BSD license

## Credits

The biggest inspiration for all of this was [Alexander Zolotov Virtual ANS software](http://www.warmplace.ru/soft/ans/), thank to him.

Also inspired by [Shadertoy](https://www.shadertoy.com)

For any questions, the main forum is available [here](https://quiet.fsynth.com/)
