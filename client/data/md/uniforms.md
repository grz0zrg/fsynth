#### Pre-defined uniforms

`vec2 resolution`

​	viewport resolution (pixels)

`float globalTime`

​	playback time (seconds)

`float baseFrequency`

​	score base frequency (hertz)

`float octave`

​	score octave range

`vec4 mouse`

​	normalized mouse pixel coords.

`vec4 date`

​	year, month, day, time (seconds)

`sampler2D iInputN`

​	import data access, typical usage : `texture2D(iInput0, uv);`

`sampler2D pFrame` 

​	previous frame available as a texture

`sampler2D pFrameSynth`

​	previous synth frame available as a texture (WebGL 2)

`int frame` 

​	current frame

`float htoy` 

​	take a frequency as argument and return its vertical position on the canvas (pixels)

`float fline` 

​	take a frequency as argument and return either 1 or 0 (shortcut to draw horizontal line)

`vec4[N] keyboard`

​	MIDI note-on/note-off events : frequency, velocity, elapsed time since the key was pressed, MIDI channel

`vec4[N+1] keyboard`

​	enhanced MIDI (MPE) : pitch bend, timbre (CC74), pressure (aftertouch), release velocity

`vec3[N] pKey`

​	store the previous note-off for each channels, frequency, velocity, elapsed time since the key was pressed