## About

Overview of all the available tools associated with the Fragment client.

## FAS: Fragment Audio Server

The Fragment Audio Server is a program written with the C language for fast real-time audio synthesis, it is the complementary part of the Fragment client.

Here are some architectural specifications as if it were made by a synth. manufacturer :

* polyphonic; unlimited number of voices
* multitimbral; unlimited number of timbres / parts / instruments with configurable virtual output channel
* distributed architecture; more than one instance can run on same machine / a network with independent processing of voice / part, example : FAS relay
* driven by pixels data over the wire; the audio server can be used as a basis for other softwares and has about no limitations as-is, it is typically used with a client that implement higher order features like MIDI such as the Fragment client
* envelopes ? has it all due to stream based architecture, you can build any types (ADSR etc.) with any interpolation scheme (linear / exp etc.)
* multiple sound engine; additive / spectral, sample-based, subtractive, wavetable, physical modeling, frequency modulation, spectral, filters bank, phase distorsion...
* virtual channels: instruments -> virtual channels -> output device channels
* allow to extend the sound engine at runtime with user-defined generators and effects written with Faust DSP specification language
* high quality stereophonic audio with low latency and multiple input / output (with Jack)
* fully microtonal / spectral (oscillator-bank concept for every instruments)
* unlimited effects slot per virtual channel (24 by default but adaptable); reverb, convolution, comb, delay, filters, phaser... 30 high quality effects type provided by Soundpipe are available (most of them stereophonic)
* per partial effect slot for additive synthesis
* per voice filtering for subtractive synthesis with one multi mode filter
* per voice effects is limited by RGBA note data, this may be seen as a limitation since only one multi mode filter per voice is allowed
* highly optimized real-time architecture; run on low-power embedded hardware such as Raspberry
* events resolution can be defined as you wish and can be changed dynamically (typically display refresh rate; 60 Hz but you can go above that through a real-time parameter)
* cross-platform; can run about anywhere !

Note : "Unlimited" is actually an architectural term, in real conditions it is limited by the available processing power, amount of memory available, frequency resolution is also limited by slice height so it may be out of tune with low resolution! (just like analog but still more precise!)

Fragment communicate with the audio server by sending data through the network, FAS can run on any machines independently of the Fragment application, it gather the pixels data from Fragment in real-time, compute things and deliver the audio through the selected audio device.

The audio server is downloadable on the [homepage](https://www.fsynth.com/), it can also be compiled from sources on [GitHub](https://github.com/grz0zrg/fas).

On the [Raspberry PI](https://www.raspberrypi.org) ~700 additive synthesis oscillators can play at the same time with an optimized system

## Fragment Independent GLSL editor

The integrated GLSL editor can be too cumbersome to use sometimes with complex sessions with latency downsides due to browser reflow.

A solution is to use the independent editor which is the Fragment GLSL editor as an entirely separate application, the independent editor can connect to any sessions and has the same features as the integrated code editor.

The independent GLSL editor can be found [here](https://github.com/grz0zrg/fsynth/tree/master/editor), the [development server](https://github.com/grz0zrg/fsynth/tree/master/fsws) is needed in order to execute it and fsdb, some instructions can be found on the [GitHub page](https://github.com/grz0zrg/fsynth) and [GitHub editor page](https://github.com/grz0zrg/fsynth/tree/master/editor)

## OSC relay

Fragment support OSC input and output with WebSockets, some tools does not support OSC through WebSockets and an OSC relay which translate WebSockets data to UDP packets should then be used.

The OSC relay need [NodeJS](https://nodejs.org/en/) and [NPM](https://www.npmjs.com) and can be found [here](https://github.com/grz0zrg/fsynth/tree/master/osc_relay)

The OSC relay can also be found on the homepage as a binary for Windows and Linux.

To use the OSC relay once NodeJS and NPM is installed, type `cd osc_relay & npm install & node osc_relay` in a terminal at the OSC relay root level directory

## FFS: Audio server files manager

The audio server files manager server provide an API for easy upload / informations of audio samples from FAS grains / impulses / waves directories; for convenience and for embedded uses.

FFS is required in order to use the **File managers** pane of the **SYNTH** / **Audio Server settings** dialog.

FFS is available on the [homepage](https://www.fsynth.com) as a download, it is generally placed / run into / from the audio server directory.

To compile FFS, [NodeJS](https://nodejs.org/en/) and [NPM](https://www.npmjs.com) are required and can be found [here](https://github.com/grz0zrg/fsynth/tree/master/fss)

To use FFS once NodeJS and NPM is installed, type `cd ffs & npm install & node ffs` in a terminal at the FFS root level directory

## FAS relay

Fragment audio server support distributed sound synthesis on any machines or cores over the network

This tool is available on the homepage.

The [FAS relay](https://github.com/grz0zrg/fsynth/tree/master/fas_relay) is a program which listen to port 3003 and wait a client connection, when a client is connected, it relay the data from the client to all audio server instances specified at launch, audio server instances can be remote or local (same computer = multi-core)

The relay work as follow:

- Distribute the data equally by default over all the audio servers
- Will also distribute different channels data to different instances
- Instruments with input (such as filters) see their dependencies being sent to all instances
- Weight can be defined per servers, this may be of interest to run the servers on machines that has different capabilities, you could have double amount of processing for machine X while normal amount for machine Y and low amount of processing for machine Z etc.

**Commands line argument** (example for 3 localhost servers)

-c3

- Shortcut when servers are on the same machine, this will connect to 3 localhost servers from port 3004 to 3006
- Equivalent to `-s="127.0.0.1:3004 127.0.0.1:3005 127.0.0.1:3006"`

-s="list of servers address+port separated by whitespace"

- Example : `-s="127.0.0.1:3004 127.0.0.1:3005 127.0.0.1:3006"`

-w="list of servers weight as a float value for each servers"

- the distribution "weight" is a float which indicate "server performance", 1 is the default weight, a high weight value (say 2 while all others are 1) mean that the server is slower and will take half load, a low value for a server (say 0.5) mean that the server is fast and will take double load
- Example : `-s="1 0.5 1"`

## SPlayer web widget

SPlayer is a JS/HTML widget which provide some kind of additive synthesis spectogram player in the browser, it's like Fragment made for playback only, it was made to be integrated on boards, websites etc. to share scores.

The widget is easy to use, small and have few dependencies. It provide WAV download, PNG download, drag'n'drop to import spectrum images, basic transport features (play / pause / stop / seek), gain level selection, magnifying tool and is customizable.

For more informations see [here](https://github.com/grz0zrg/splayer)

## SuperCollider

A limited portion of the additive synthesis engine has been ported to [SuperCollider](http://supercollider.github.io), it can be used by using the OSC relay and enabling OSC output.

The SuperCollider script is available [here](https://github.com/grz0zrg/fsynth/blob/master/supercollider/fs.scd)

This synthesis engine only support one stereo output channel.