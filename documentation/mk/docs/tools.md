## FAS: Fragment Audio Server

The Fragment Audio Server is an program written with the C language for very fast real-time audio synthesis.

It is recommended to use Fragment with the Fragment Audio Server enabled.

The advantage of using the audio server is that it provide the best audio performances along with audio devices choice, multiple audio outputs, sample rate choice, granular synthesis & sampler method, realtime scheduling under Linux and more...

Fragment communicate with FAS by sending data through the network when the Fragment FAS option (waveform icon) is enabled, FAS can run on any machines independently of the Fragment application, it gather the pixels data from Fragment in real-time, compute things and deliver the audio through the selected audio device.

FAS is bundled with the graphical launcher which can be downloaded on the Fragment [homepage](https://www.fsynth.com/), it can also be compiled from sources on [GitHub](https://github.com/grz0zrg/fas).

On the [Raspberry PI](https://www.raspberrypi.org) ~700 additive synthesis oscillators can play at the same time with an optimized system

## FGL: Fragment Graphical Launcher

The graphical launcher is an application available for Linux and Windows which provide an easy interface to start Fragment with the Fragment Audio Server, the launcher also provide a convenient way to configure the audio server for individual sessions and provide a list of all the sessions you joined in.

The graphical launcher is available on the [homepage](https://www.fsynth.com).

## Fragment Independent GLSL editor

The integrated GLSL editor can be too cumbersome to use sometimes with complex sessions and can make the sound choppy when you type.

A solution is to use the independent editor which is only the Fragment GLSL editor portion in a webpage, the independent editor can connect to any sessions and has about the same features as the integrated code editor.

The independent GLSL editor can be found [here](https://github.com/grz0zrg/fsynth/tree/master/editor), the [development server](https://github.com/grz0zrg/fsynth/tree/master/fsws) is needed in order to execute it, some instructions can be found on the [GitHub page](https://github.com/grz0zrg/fsynth)

## OSC relay

Fragment support OSC input and output with WebSockets, some tools does not support OSC through WebSockets and an OSC relay which translate WebSockets data to UDP packets should then be used.

The OSC relay need [NodeJS](https://nodejs.org/en/) and [NPM](https://www.npmjs.com) and can be found [here](https://github.com/grz0zrg/fsynth/tree/master/osc_relay)

To use the OSC relay once NodeJS and NPM is installed, type `cd osc_relay & npm install & node osc_relay` in a terminal at the OSC relay root level directory

## FAS relay

Fragment support distributed sound synthesis on any machines or cores over the network

The [FAS relay](https://github.com/grz0zrg/fsynth/tree/master/fas_relay) is a program which relay data from the client to all audio server instances specified at launch, audio server instances can be remote or local (same compute = multi-core)

Moreover, three type of distribution system can be chosen (the constant must be changed in the source-code at the moment)

DSPLIT

- Will split the data in equal blocks and distribute them over each audio server instances

DINTER

- Interleaved, this will distribute data over each servers in a linear & cyclical fashion

DSMART

- Distribute the data equally over all the audio servers, not in a linear fashion
- The algorithm is rather unoptimized but may provide the best performances/distribution quality out of the three methods available

## SuperCollider

A limited portion of the additive synthesis engine has been ported to [SuperCollider](http://supercollider.github.io), it can be used by using the OSC relay and enabling OSC output.

The SuperCollider script is available [here](https://github.com/grz0zrg/fsynth/blob/master/supercollider/fs.scd)

This synthesis engine only support one stereo output channel.