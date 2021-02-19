## About

> **OpenGL Shading Language** (abbreviated: **GLSL**), is a [high-level](https://en.wikipedia.org/wiki/High_level_programming_language) [shading language](https://en.wikipedia.org/wiki/Shading_language) with a syntax based on the [C programming language](https://en.wikipedia.org/wiki/C_(programming_language)). It was created by the [OpenGL ARB](https://en.wikipedia.org/wiki/OpenGL_ARB) (OpenGL Architecture Review Board) to give developers more direct control over the [graphics pipeline](https://en.wikipedia.org/wiki/Graphics_pipeline).
>
> Some benefits of using GLSL are:
>
> - [Cross-platform](https://en.wikipedia.org/wiki/Cross-platform) compatibility on multiple operating systems, including [GNU](https://en.wikipedia.org/wiki/GNU)/[Linux](https://en.wikipedia.org/wiki/Linux), [macOS](https://en.wikipedia.org/wiki/MacOS) and [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows).
> - The ability to write shaders that can be used on any hardware vendor's graphics card that supports the OpenGL Shading Language.
> - Each hardware vendor includes the GLSL compiler in their driver, thus allowing each vendor to create code optimized for their particular graphics card’s architecture.

## How-to

Fragment usage of the graphics pipeline is restricted to a single fragment program which will be executed by the GPU for each pixels of the accelerated canvas.

The fragment program is written in GLSL (OpenGL Shading Language) which has a syntax similar to the C language without all the complex bits, it is much simpler to learn.

You can do anything from ray-traced 3D to drawing simple lines and define their behaviors with Fragment, the only requirement is high school mathematics.

Here is a simple example of GLSL code that Fragment accept which just set all pixels to black and subsequently all oscillators off:

```glsl
void main () {
  fragColog = vec4(0., 0., 0., 0.); // can also be gl_FragColor
  synthOutput = vec4(0., 0., 0., 0.);
}
```

## Pre-defined uniforms

Fragment has many pre-defined uniforms (global variables) which can be used in the code editor to access different informations.

Here is a list of Fragment pre-defined uniforms

- `vec2 resolution`
    - viewport resolution (pixels)
- `float globalTime`
    - playback time (seconds)
- `float baseFrequency`
    - score base frequency (hertz)
- `float octave`
    - score octave range
- `vec4 mouse`
    - normalized mouse coordinates (pixels)
- `vec4 date`
    - year, month, day, time in seconds
- `sampler2D iInputN`
    - imported data access, typical usage : texture2D(iInput0, uv);
- `float fvidN`
    - imported video current playback position (0-1 range)
- `sampler2D pFrame`
    - previous frame available as a texture (feedback)
- `sampler2D pFrameSynth`
    - previous score frame available as a texture
- `int frame`
    - current frame
- `float htoy`
    - a function with a frequency as argument, return a vertical position on the canvas (pixels)
- `float fline`
    - ​a function with a frequency as argument, return 1 or 0 (a shortcut to draw a horizontal line)
- `float yfreq`
    - ​a function with a vertical position as argument and a sample rate argument, return the oscillator frequency at the corresponding position for the corresponding sample rate
- `vec4[N] keyboard`
    - ​MIDI note-on/note-off events : frequency, velocity, elapsed time since the key was pressed, MIDI channel
- `vec4[N+1] keyboard`
    - ​enhanced MIDI (MPE) : pitch bend, timbre (CC74), pressure (aftertouch), release velocity
- `vec3[N] pKey`
    - ​store the previous note-off for each channels, frequency, velocity, elapsed time since the key was pressed

### Reference cards

The Khronos Group (authors of the language specification) released several reference cards of the GLSL specification, the reference cards are compact reference of the full language specification which can be used in conjunctions with code samples to learn the OpenGL Shading Language quickly.

Since there is plenty of resources to learn the OpenGL Shading Language, the documentation provided in this section will only provide the official reference cards, many GLSL tutorials are available on the internet and are valid for Fragment.

- WebGL 2.0 OpenGL Shading Language
  - [Page 1 PDF](https://www.fsynth.com/pdf/webgl2_glsl_1.pdf)
  - [Page 2 PDF](https://www.fsynth.com/pdf/webgl2_glsl_2.pdf)
  - [Page 3 PDF](https://www.fsynth.com/pdf/webgl2_glsl_3.pdf)

## Notes

Fragment support GLSL 3.0, GLSL 3.0 allow to use dynamical indexes with arrays among many other things, it also allow to use some shortcuts.

There is actually two output in the fragment shader, `gl_FragColor` or `fragColor` for the visuals and `synthOutput` for the synth pixels data which will be used by the sound synthesis engine, this allow to do visuals alongside stereo audio.

When the EXT_color_buffer_float extension is available, the pixels data output will be encoded as 32-bit float, this allow more accuracy to represent values resulting in higher accuracy synthesis / modulation. This can be checked in the help dialog.

There is also many applications that let you create stunning visuals in your browser by the same method, one of the most popular one and compatible with Fragment (by using the convert ShaderToy button of the toolbar) is [ShaderToy](https://www.shadertoy.com/), this program let you build visuals and audio at the same time, just like Fragment with a more conventional approach for audio synthesis.