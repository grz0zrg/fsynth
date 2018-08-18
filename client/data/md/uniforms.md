`vec2 resolution`

​	viewport resolution (pixels)

`float globalTime`

​	playback time (seconds)

`float baseFrequency`

​	score base frequency (hertz)

`float octave`

​	score octave range

`vec4 mouse`

​	normalized mouse coordinates (pixels)

`vec4 date`

​	year, month, day, time (seconds)

`sampler2D iInputN`

​	imported data access, typical usage : `texture2D(iInput0, uv);`

`float fvidN`

​	video current position (0 - 1 range)

`sampler2D pFrame` 

​	the previous frame available as a texture (feedback)

`sampler2D pFrameSynth`

​	previous synth frame available as a texture (WebGL 2)

`int frame` 

​	the current frame

`float htoy` 

​	a function with a frequency as argument, return a vertical position on the canvas (pixels)

`float fline` 

​	a function with a frequency as argument, return 1 or 0 (a shortcut to draw a horizontal line)

`float yfreq` 

​	a function with a vertical position as argument and a sample rate argument, return the oscillator frequency at the corresponding position for the corresponding sample rate

`vec4[N] keyboard`

​	MIDI note-on/note-off events : frequency, velocity, elapsed time since the key was pressed, MIDI channel

`vec4[N+1] keyboard`

​	enhanced MIDI (MPE) : pitch bend, timbre (CC74), pressure (aftertouch), release velocity

`vec3[N] pKey`

​	store the previous note-off for each channels, frequency, velocity, elapsed time since the key was pressed