## Concept

Fragment is a combination of an accelerated drawing surface with an oscillator-bank / filter-bank / spectral synthesizer.

The interface is web-based, available [online](https://www.fsynth.com) or locally. It has collaborative features which allow the same type of graphics content to be shown for multiple users.

The synthesizer part is a software which must be downloaded and installed separately.

For sounds, the combination can be thought of as a spectral synthesis / resynthesis environment where all work apply from a frequency domain graphical standpoint.

### Accelerated graphics canvas

The graphics canvas is by default a black rectangular drawing area.

It is accelerated which mean that all drawing operations will be computed on any available Graphics Processing Unit. Accelerated graphics allow the realization of complex real-time computer graphics of any kinds.

Drawing on the canvas is done by instructing the GPU to draw with a simple high-level programming language called [GLSL](https://en.wikipedia.org/wiki/OpenGL_Shading_Language), the Fragment GLSL script (also called a **fragment** shader) is called by the GPU for every pixels on the canvas. This approach allow very fast real-time manipulation of the bitmap data.

The GLSL script is unique and is shared in real-time between the users of an online session.

All changes to the GLSL script are immediately applied providing immediate audio and visual feedback.

Fragment also support the [Processing](https://en.wikipedia.org/wiki/Processing_(programming_language)) language which is a general purpose programming language associated with a simple and powerful graphics library.

The graphics canvas can also be manipulated through several other means :

* by drawing over the canvas using a pointer device
* by any software through desktop capture
* by displaying images, videos, sounds / mic spectrum or camera feed

### Oscillator-bank / filter-bank synthesizer

An oscillator-bank / filter-bank synthesizer can be represented as a huge number of independent sound generators or filters.

Each oscillators / filters are tuned to a specific frequency defined by the formula :

![Vertical axis frequency mapping formula](tutorials/images/frequency_map.png)

Where:

- **a** the starting frequency (16.34Hz by default)
- **y** the oscillator index starting at 0
- **n** the number of oscillators (439 by default)
- **o** the octave count (10 by default)

The maximum number of frequency components (frequency resolution) is determined by the number of oscillators / filters.

There is no limits on the number of oscillators / filters except hardware constrains.

The oscillator / filter bank concept can be used interchangeably.

#### Oscillators

Fragment default oscillator-bank is sinusoidal.

When every oscillators produce sinusoidal oscillations the method is called Additive synthesis.

Additive synthesis can reproduce any waveforms, it allow to precisely define the timbre of any sounds and is the default instrument type.

Fragment oscillators are not limited to sinusoidal oscillations but allow several type of generators / oscillators all working from the same oscillator-bank concept :

* Phase / Frequency modulation with feedback (complex waveforms through modulations)
* Subtractive synthesis (waveforms such as square wave, triangle wave...)
* Physical model (Karplus-strong string synthesis, droplet, bar)
* Wavetable (single-cycle waveforms)
* Granular / sampler
* Phase distorsion synthesis

#### Filters

Instead of generators which work additively Fragment also allow the use of the filter-bank concept which work subtractively :

* Spectral filter (synthesis / resynthesis)
* Bandpass filter
* Modal filter (bandpass filter with resonant component)
* Formant filter (complex filter)
* String resonance filter (complex filter with resonant component)

### The combination of both

Fragment generate sounds from the direct interpretation of the graphics canvas content as the oscillator-bank / filter-bank content.

To achieve this, vertical 1px large slices of the graphics canvas are streamed in real-time to the synthesizer.

Slices can be thought of as a single instrument.

All pixels data from the vertical slices are oscillator-bank on / off switch where Red component is the left channel amplitude and the Green component is the right channel amplitude.

With Fragment, all sounds is generated from a frequency domain, frequency is represented on the vertical axis and stereo/mono amplitude is represented by the intensity of each pixels, parts of the canvas is then captured by user-positioned slices.

The basics of making sounds with Fragment is by first slicing the canvas in vertical slices, pixels data is then captured continuously from the slices at the browser display refresh rate and is then converted to notes from the RGBA pixels value, the notes are then interpreted and played by one or more synthesis method in real-time.

The canvas represent frequencies (exponential map) on the vertical axis, the horizontal axis generally represent time.

One of the unique feature of Fragment is the time visualization of sounds / parameters, the horizontal axis span several pixels enabling the user to see a sound past, present and future.
