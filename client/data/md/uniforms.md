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

​	imported data access, typical usage : `texture2D(iInput0, uv);`

`float fvidN`

​	video current position (0 - 1 range)

`sampler2D pFrame` 

​	previous frame available as a texture (feedback fx)

`sampler2D pFrameSynth`

​	previous synth frame available as a texture (WebGL 2)

`int frame` 

​	current frame

`float htoy` 

​	function with frequency as argument which return its vertical position on the canvas (pixels)

`float fline` 

​	function with frequency as argument which return 1 or 0 (shortcut to draw a horizontal line)

`vec4[N] keyboard`

​	MIDI note-on/note-off events : frequency, velocity, elapsed time since the key was pressed, MIDI channel

`vec4[N+1] keyboard`

​	enhanced MIDI (MPE) : pitch bend, timbre (CC74), pressure (aftertouch), release velocity

`vec3[N] pKey`

​	store the previous note-off for each channels, frequency, velocity, elapsed time since the key was pressed