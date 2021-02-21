## About

The Fragment Audio Server is a program which is able to do fast real-time audio synthesis, it run alongside the web application to produce sounds.

The audio server **must be launched to output any audio**, it will listen to 127.0.0.1:3003 by default and will use the default audio device. This can be changed by passing command line arguments when launched.

The Fragment web-client communicate with FAS by sending data through the network, FAS can run on any machines independently of the Fragment application, it gather the pixels data from Fragment in real-time, compute things and deliver the audio through the selected audio device.

FAS can be configured through the Audio Server dialog (SYNTH button on the toolbar)

![Fragment Audio Server settings dialog](images/fas_settings.png)

## Instruments pane

This pane allow to select an instrument type for each instruments added onto the canvas, all instruments are listed by their index at the top of the list.

Some instruments may have parameters which may be configured independently by clicking on the **Parameters** button which will open the parameters dialog listing all instruments with their parameters.

See below for a list of instruments with their parameters.

## Channels

This pane allow to configure the synthesizer virtual channels and add effects (effects chain).

All slices / instruments added are automatically bound to the first virtual channel, a virtual channel is where the sound output of slices / instruments goes before being sent to a physical / device driver / OS mixer port.

Instrument can be assigned a virtual channel by going into the slices settings dialog (see Slice / Instruments section)

Virtual channels can be muted by clicking on their number, a red number indicate a muted channel. A muted channel is particularly usefull for instruments with channel input such as bandpass for example by playing an instrument in a muted channel and using the channel as a source for bandpass instrument.

Unused channels can be cleared by right clicking on any channel number and clicking on the trash icon. (Note : this will only delete unused channels starting from the latest used one)

Multiple effects can be added to any virtual channels by drag and dropping the effect from the list onto the large grey rectangle space (the effects chain), the added effect will be shown by a colored square.

Effects can be moved up or down the effects chain by drag and dropping the colored square.

Effects can also be replaced by drag and dropping the effect from the list onto a colored square on the fx chain.

Any added effects can be configured by double clicking on their square, they can also be muted with a middle click (they will appear dimmed), they can be deleted by a right click (trash icon).

Each channels can be routed to a physical / device driver / OS mixer port by changing the value at the end of effects space. The value correspond to the index of the port (0 based)

Note : Effects are not shared, they are saved locally.

## Actions

This pane allow to reload the audio server samples, impulse responses and Faust generators / effects.

Reload is needed when uploading files with the file manager or when files are added with the operating system file browser.

## File managers

This pane allow to upload instruments / effects files such as samples, convolution impulse response and Faust *.dsp files in a convenient way to the audio server.

Each buttons open a dialog with a files manager.

The files manager display a list of files and folders (bold name), supported files can be uploaded by drag and dropping onto a folder name or filename.

All basic features of a files manager are present, multiple files and folder can be selected by clicking on their respective checkbox or name.

Multiple files can be selected quickly by maintaining the left click button and moving the mouse over all items.

When right clicking anywhere in the file manager dialog some actions appear :

* download selected files : download all files as a *.zip file (note : all files are stored hierarchically)
* rename selected file (only work when a single file is selected)
* delete selected files

When right clicking on a folder name some actions appear :

* new directory
* move selected files here : allow to move files between folders

The number associated to each files is the internal mapping attributed by the audio server, this is the index of the file which may be asked with some instrument type of parameters (such as granular or wavetable). Sometimes this number may be fractional thus the fractional value is also provided as a tooltip when the filename is hovered.

**Note : The audio server files manager need to run in order to use this feature. It is available on the homepage.**

## Instruments type details

### Additive

Additive synthesis is a mean to generate sounds by adding sine waves together, it is an extremely powerful type of sound synthesis able to reproduce any waveforms in theory.

This is the default and main sound synthesis method.

Additive synthesis instrument type support per partial effect slot through the **BLUE** component.

The effect type must be provided as an integer value from the BLUE component, the following effects are available :

* 0: none
* 1: bitcrush (Bitdepth / Sampling rate : B component [0, 1] / A component [0, 1])
* 2: noise (B added white noise factor to sine wave phase)

Any of these can be applied to each partials with real-time parameters change. This allow to easily add character to the additive sound.

Note : performance may be reduced when per partial effects are used.

### Spectral

Spectral synthesis produce sounds by modifying (mode 0) any virtual channel output or instrument output / generate (mode 1) in frequency domain via a Short-time Fourier transform with overlap add method.

Typical example may be a vocoder (which can be done using bandpass as well) and more generally cross synthesis (combining characteristics of different sounds), some effects involving phases may be done as well.

To get the corresponding bin one can use this formula : `frequency / (sample_rate / 2) / window_size`

Spectral synthesis slice parameters are encoded in slice RGBA pixels value :

- RED : Magnitude factor of the LEFT channel (depend on mode)
- GREEN : Magnitude factor of the RIGHT channel (depend on mode)
- BLUE : Phase factor of the LEFT channel
- ALPHA: Phase factor of the RIGHT channel

Here are the instrument parameters :

* Window size : the window size (from 32 up to 1024; aka max amount of frequencies bin)
    * due to the maximum window size of 1024 bins frequencies of the vertical axis may fall onto the same bin (so accuracy is disminished)
* Source CHN / instrument : the source virtual channel index (0 based) or instrument index (0 based); this parameter depend on **Source mode** parameter
* Mode (factor / direct) :
    * 0 : re-synthesis mode; incoming data is used as a factor of the input data bins (polar form)
    * 1 : synthesis mode; incoming data is directly placed into the corresponding bin, input channel is unused, it is faster because a FFT step is discarded (note : some frequencies may fall into the same bin due to differences in how frequencies are mapped)
* Source mode : 0 for virtual channel or 1 for instrument

### Granular

Granular synthesis is a mean to generate sounds by using small grains of sounds blended together and forming a continuous stream.

Both asynchronous and synchronous granular synthesis is implemented and can be used at the same time.

The Fragment Audio Server load all samples (*.wav, *.flac or any formats supported by [libsndfile](https://github.com/erikd/libsndfile) ) from a **grains folder** and try to guess their pitch to map it on the canvas so that it match the canvas freq. mapping, the grains folder is at **/usr/local/share/fragment/grains** by default under Linux and if you installed Fragment from the .deb package or run it with the AppImage, otherwise the grain folder should be located in the audio server directory or should be specified from the arguments.

The pitch algorithm used to find the sample pitch may be sometimes wrong on some samples, it is possible to force the pitch of a specific sample by adding the MIDI note to their filename, such as `flute_A#4.wav`  or `flute_As4.wav` for example (the note name can be lowercase or uppercase), it is also possible to force a specific frequency by adding it to the filename between `##`such as `flute_##440##.wav`

Just like with additive synthesis, re-synthesis by granular means is possible altough computationally heavy.

Fragment work with granular synthesis on pre-loaded samples, all samples (.wav, .aiff and related samples) must be placed into the **grains** folder of the Fragment audio server (see above)

A good source of free samples is the [OLPC](http://one.laptop.org/) sound samples available [here](http://wiki.laptop.org/go/Sound_samples)

There is also [freesound.org](http://freesound.org/)

Granular synthesis slice parameters are encoded in slice RGBA pixels value :

- RED : Left amplitude
- GREEN : Right amplitude
- BLUE : Grain sample index between 0,1 (fractional) and grain density as integer value
- ALPHA : Grain index between 0,1, (fractional) also affect playback direction if negative, grain index randomization if >= 2

Here are the instrument parameters :

* Granular env : applied grain enveloppe type (13 to chose from)
* Min. grain length : the minimum length a grain instance can be (normalized sample length, fractional between 0 and 1)
* Max. grain length : the maximum length a grain instance can be (normalized sample length, fractional between 0 and 1)
* Spread : spread amount

All granular synthesis parameters excluding density and envelope type can be changed in real-time without crackles.

#### Sampler

Granular synthesis with grain start index of 0 and min/max duration of 1/1 can be used to trigger samples as-is like a regular sampler.

### Subtractive synthesis

Subtractive synthesis start from harmonically rich waveforms which are then filtered.

There is many filters type to chose from (see instrument parameters): moog, diode, korg 35, lpf18...

Be careful as some filters may have unstability issues with some parameters! (note : they are all checked for safety but there could be bugs...)

There is three type of band-limited waveforms : sawtooth, square, triangle

There is also a noise waveform and additional brownian / pink noise. This may be usefull for some instruments such as String resonance / Modal.

The RGBA parameters are

- RED : Left amplitude
- GREEN : Right amplitude
- BLUE : filter cutoff multiplier; the cutoff is set to the fundamental frequency, 1.0 = cutoff at fundamental frequency
- ALPHA : filter resonance [0, 1] & waveform selection on integral part (0.x, 1.x, 2.x etc)

Here are the instrument parameters :

* Filter type : 4 classic filters type to chose from

### PM (Phase modulation)

Phase modulation (PM) is a mean to generate sounds by modulating the phase of an oscillator (carrier) from another oscillator (modulator), it is very similar to frequency modulation (FM).

PM synthesis in Fragment use a simple algorithm with one carrier and one modulator with filtered feedback.

PM synthesis is one of the fastest method to generate sounds and is able to do re-synthesis.

Carrier and modulator oscillator can be a sine wave or an arbitrary wavetable. (see instrument parameters)

Modulator amplitude and frequency can be set with BLUE and ALPHA channel, modulator feedback amount can be set with integral part of BLUE channel.

The typical index of modulation of standard FM synths can be computed by doing : modulator frequency / carrier frequency

The RGBA parameters are

- RED : Left amplitude
- GREEN : Right amplitude
- BLUE : Fractionnal part : Modulator amplitude, Integer part : Modulator feedback level [0,65536)
- ALPHA : Modulator frequency

Here are the instrument parameters :

* Wavetable (carrier) : index of a wave loaded from the **waves** folder of the audio server (can also be -1 for the bundled sinewave)
* Wavetable (modulator) : index of a wave loaded from the **waves** folder of the audio server (can also be -1 for the bundled sinewave)

### Physical modelling

Physical modelling synthesis refers to sound synthesis methods in which the waveform of the sound to be generated is computed using a mathematical model, a set of equations and algorithms to simulate a physical source of sound, usually a musical instrument.

Physical modelling in Fragment use models, there is three type to chose from : Karplus-Strong string synthesis, droplet and metal bar.

Here are the instrument parameters :

* Model : Phisical model to use (3 to chose from)
* Droplet tubes : (only for droplet model)
* Droplet deattack : Period of time over which all sound is stopped (only for droplet model)
* Bar boundary left : Boundary condition at left end of bar (only for metal bar)
* Bar boundary right : Boundary condition at right end of bar (only for metal bar)
* Bar strike velocity : Normalized strike velocity (only for metal bar)

#### Karplus-strong

This is a fast method which generate pleasant string-like sounds.

The RGBA parameters are

- RED : Left amplitude
- GREEN : Right amplitude
- BLUE : Noise wavetable cutoff lp filter / fractional part : stretching factor
- ALPHA : Noise wavetable feedback amount

#### Droplet

Integral part of blue / alpha component correspond to the first / second resonant frequency (main resonant frequency is tuned to current vertical pixel position), fractional part of blue component correspond to damping factor and amount of energy to add back for the alpha component.

#### Metal bar

Approximate metal bar being struck, integral part of blue component correspond to decay, integral part of alpha component correspond to strike spatial width (normalized into [0,1000] range), fractional part of the blue component is the scanning spped of the output location, fractional part of the alpha component is the position along bar that strike occurs.

### Wavetable

Wavetable synthesis is a sound synthesis technique that employ arbitrary periodic waveforms in the production of musical tones or notes.

Wavetable synthesis use single cycle waveforms / samples loaded from the waves folder of the audio server. Wave lookup is monophonic.

The implementation is similar to PPG synths with linear interpolation (sampling & wave change) but no oversampling. (may alias)

Interpolation between waves can be enabled / disabled (PPG like) at note time trough ALPHA fractional part. ( > 0 enabled interpolation)

Specific wave can be read by having similar start & end value (which will thus act as an offset) with a wavetable speed set to 0.

The speed at which the table is read can be set with the fractional part of the blue channel, the table will be read in reverse order if the value is negative.

Every note-on trigger a wavetable reset from current settings (wavetable position), this can be disabled in the instrument parameters.

Wavetable synthesis is fast and provide rich sounds.

Note : There are not really multiple 'wavetables' as the audio server load every waves into a big continuous wavetable but the different wavetables are ordered (by directory then by filename) when loaded so that each loaded waves are contiguous, all waves are referenced by their loaded internal index which is shown on audio server startup or in the waves files manager.

Note : The wavetable can be used as a sampler as long as the input file is exported into small chunks (with some kind of windowing to remove crackles), this can be done easily with a small script or some software to split a sample into multiple ones.

The RGBA parameters are

- RED : Left amplitude
- GREEN : Right amplitude
- BLUE : Start wave selection on integral part & wavetable speed on fractional
- ALPHA : End wave selection on integral part & wave interpolation on / off on fractional

Here are the instrument parameters :

* Note-on reset : a value of 1 will reset the wavetable every notes and a value of 0 disable it

### Bandpass (M)

Specific type of synthesis which use a canvas-mapped bank of bandpass filters (second-order Butterworth), each activated filters use an user-defined channel or instrument as source.

It can be used with rich form of synthesis (subtractive etc.) as a spectrum sculpt tool (vocoding etc.)

Bandwidth can be adjusted individually through alpha channel value which is a factor of current bank gap.

As a speed example ~300 filters can be enabled at the same time with ~6 subtractive oscillators as input on an i7 6700 with a single FAS instance (96000kHz)

Fractional part of the blue channel can be used to target a channel (> 0) or an instrument (= 0)

The RGBA parameters are

- RED : Left amplitude
- GREEN : Right amplitude
- BLUE : integral part : source channel / instrument index
- ALPHA : bandwidth factor : a value of 1 mean a bandwidth of current bank above + below gap

Here are the instrument parameters :

* Filter order : High value approach brickwall filter (more precise) at the expense of processing time

### Phase distorsion (M)

Specific type of synthesis which use an user-defined source channel or instrument as input and produce waveform distorsion as output.

Fractional part of the blue channel can be used to target a channel (> 0) or an instrument (= 0)

The RGBA parameters are

- RED : Left amplitude
- GREEN : Right amplitude
- BLUE : integral part : source channel / instrument index
- ALPHA : Amount of distorsion [-1, 1]

### String resonance (M)

Specific type of synthesis which use a canvas-mapped bank of string resonator, each activated filters use an user-defined channel or instrument as source. It produce sounds similar to physical modelling / modal synthesis.

A list of frequencies for several instruments are available [here](http://www.csounds.com/manual/html/MiscModalFreq.html)

A high feedback gain will create a slower decay and a more pronounced resonance.

As an easy first step a noisy sound such as one produced with subtractive synthesis may be used.

Fractional part of the blue channel can be used to target a channel (> 0) or an instrument (= 0)

The RGBA parameters are

- RED : Left amplitude
- GREEN : Right amplitude
- BLUE : integral part : source channel / instrument index
- ALPHA : feedback gain; typically > 0.9

### Modal (M)

Specific type of synthesis which use a canvas-mapped bank of resonant filters, each activated resonant filters use an user-defined channel or instrument as source. It produce sounds similar to physical modelling.

A list of frequencies for several instruments are available here

A high Q factor will make the sound more "resonant".

As an easy first step a noisy sound such as one produced with subtractive synthesis may be used.

Note : Due to stabilization filter bank frequency will be tresholded when it match that condition : (samplerate / filter_frequency) < pi

Fractional part of the blue channel can be used to target a channel (> 0) or an instrument (= 0)

The RGBA parameters are

- RED : Left amplitude
- GREEN : Right amplitude
- BLUE : integral part : source channel / instrument index
- ALPHA : Q factor of the resonant filter

### Modulation (M)

This instrument does not output any sounds.

It is instead used to provide fx / instrument modulation.

Simple use case would be to modulate filters cutoff / resonance parameter or wavetable selection for FM/PM.

The RGBA parameters are

- RED : Left amplitude
- GREEN : Right amplitude
- BLUE : unused
- ALPHA : Modulation value

Here are the instrument parameters :

* Mode : 0 for channel, 1 for instrument
* Chn / Instrument : index of the targeted virtual channel / instrument (0 based)
* Slot / param : index of the targeted effect slot / instrument parameter
* Target : only used for mode 0; index of the targeted fx parameter
* Easing (interpolation) : the interpolation function from 0 to 30

Here are the indexes of the easing interpolation functions :

* 0 : linear
* 1 to 3 : quadratic ease in/out/in out
* 4 to 6 : cubic ease in/out/in out
* 7 to 9 : quartic ease in/out/in out
* 10 to 12 : quintic ease in/out/in out
* 13 to 15 : sine ease in/out/in out
* 16 to 18 : circular ease in/out/in out
* 19 to 21 : exponential ease in/out/in out
* 22 to 24 : elastic ease in/out/in out
* 25 to 26 : back ease in/out/in out
* 27 to 29 : bounce ease in/out/in out
* any others value : no interpolation

### In (input)

This is a special instrument type which just play an input channel. Typically used in conjunction with formant / modal / bandpass instruments or effects.

The input channel refer to a physical / OS mixer / device input channel.

The RGBA parameters are

- RED : Left amplitude
- GREEN : Right amplitude
- BLUE : source channel index (integer)
- ALPHA : unused

### Faust

[Faust](https://faust.grame.fr/) is embedded into the audio server and allow to dynamically extend FAS bank generators and effects with custom one written with the Faust DSP specification language.

Faust DSP focused language is simple and intuitive to learn and produce highly optimized effects and generators. Faust documentation is available [here](https://faustdoc.grame.fr/manual/quick-start/#quick-start)

The audio server look and load any Faust DSP code (*.dsp) at startup in the faust/generators and faust/effects directories. Faust code can also be reloaded dynamically through the **SYNTH** / Audio Server dialog and actions pane.

All Faust DSP generators are registered into the special instrument type Faust, generators can be switched by going into the Faust instrument parameters, generators with two inputs also work in this case the blue integer part will be used to select the source channel / instrument and its fractional part to switch between channel (> 0) / instrument mode.

All Faust DSP effects will be registered into the special effect type Faust, the first Faust effect parameter can then be used to switch between effects.

Generators code will be hooked to the synthesis part of the sound engine while effects code will be hooked to the fx chain part.

One generator is bundled into the audio server; a pulse wave generator.

One effect is bundled into the audio server; Oberheim LPF filter.

Fragment to Faust DSP parameters can be specified through nentry interface primitive and are used to transfer note / initial generator data.

Here is a list of usable Faust generators nentry key :

Generator data (when FAS oscillators bank is initialized; depend on canvas settings) :

* fs_frequency : bank generator frequency
* fs_bw : bank generator bandwidth

Note data :

* fs_r : RED
* fs_b : BLUE
* fs_g : GREEN
* fs_a : ALPHA

Those can be usefull to detect note-on events thus acting as trigger (when both equals to 0) :

* fs_pr : PREVIOUS RED
* fs_pg : PREVIOUS GREEN

Instrument data :

* fs_p0 : parameter 1
* fs_p1 : parameter 2
* fs_p2 : parameter 3
* fs_p3 : parameter 4

Here is simple example of a stereo Faust generator which add a bandlimited pulse wave oscillator to the bank with controllable L/R duty cycle through BLUE and ALPHA channels :

```
import("stdfaust.lib");

freq = nentry("fs_freq",440,0,96000,1);
b = nentry("fs_b",0,0,1,0.01) : si.smoo;
a = nentry("fs_a",0,0,1,0.01) : si.smoo;
process = os.pulsetrain(freq, b),os.pulsetrain(freq, a);
```

Here is a list of usable **Faust effects** nentry key (these correspond to Faust effect parameters) :

* fs_p0 : parameter 0
* fs_p1 : parameter 1
* fs_p2 : parameter 2
* fs_p3 : parameter 3
* fs_p4 : parameter 4
* fs_p5 : parameter 5
* fs_p6 : parameter 6
* fs_p7 : parameter 7
* fs_p8 : parameter 8
* fs_p9 : parameter 9

Almost all instruments pre-defined algorithms can be rewritten as Faust DSP code which mean that one could only use its own custom DSP code within Fragment.

Note : Faust DSP code cannot be used to extend available synthesis methods which mean that using Faust to extend per partial effects or add filters to subtractive synthesis is not possible.

Here are the instrument parameters :

* Generator ID : the generator indexe (the audio server assign an index to each generators loaded, this index can be seen at startup / reload time in the audio server console output or in the Faust generators files manager in **SYNTH** / Audio Server dialog)
* p0 : fs_p0
* p1 : fs_p1
* p2 : fs_p2
* p3 : fs_p3

[Faust online IDE](https://faustide.grame.fr/) can be used to get more generator / effect examples and develop Faust DSP easily.

### Building the Audio Server

The audio server can be compiled from the sources which are available on [GitHub](https://github.com/grz0zrg/fas).

The audio server can be launched manually by executing it, it will listen to 127.0.0.1:3003 by default and will use the default audio device, see the [GitHub](https://github.com/grz0zrg/fas) README file for all the command-line arguments that the program support or use `--help` argument.

Once the audio server is started, a link between the audio server and the Fragment application is automatically done when you join any sessions (note : by default the client will try to connect to the default listening address of the audio server).