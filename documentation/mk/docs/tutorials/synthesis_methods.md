## About

Fragment has support for simultanenous additive and granular sound synthesis.

Granular synthesis only work with the Fragment Audio Server.

The two main synthesis method that Fragment support can be combined in real-time to enhance the synthesized sound.

When using the Fragment Audio Server, you can configure the synthesis methods per channels with the FAS settings dialog accessible by right-clicking on the waveform icon of the main toolbar

![Fragment Audio Server settings dialog](images/fas_settings.png)

Channels settings appear automatically when they are assigned to slices. 

Synthesis

- The synthesis method to use for this particular channel

Granular envelope

- The granular envelope to use

Minimum grain length

- The minimum grain length in samples percent

Maximum grain length

- The maximum grain length in samples percent

## How-to

### Additive synthesis

This is the default and main sound synthesis method.

### Granular synthesis

Granular synthesis is the secondary synthesis method available with the Fragment Audio Server.

The Fragment Audio Server load all samples from a **grains folder** and try to guess their pitch to map it on the canvas so that it match the canvas freq. mapping.

The pitch algorithm used to find the sample pitch may be sometimes wrong on some samples, it is possible to force the pitch of a specific sample by adding the MIDI note to their filename, such as `flute_A4.wav` for example, it is also possible to force a specific frequency by adding it to the filename between `##`such as `flute_#440#.wav`

Just like with additive synthesis, re-synthesis by granular mean is possible.

Fragment work with granular synthesis on pre-loaded samples, all samples must be placed into the **grains** folder of the Fragment launcher/server

Granular synthesis has more parameters than additive synthesis, all the parameters are encoded in slices RGBA pixels value.

The parameter are

- RED : Left amplitude
- GREEN : Right amplitude
- BLUE : Grain sample index between 0,1, also affect grain desnity if >= 2
- ALPHA : Grain index between 0,1, also affect playback direction if negative and grain index randomization if >= 2

Granular synthesis is recommended to be used with additive synthesis as it is able to improve the sound quality.