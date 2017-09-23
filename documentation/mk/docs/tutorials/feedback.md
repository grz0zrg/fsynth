## About

Feedback is a powerful feature which allow Fragment to have access to the previously rendered frame.

The previously rendered frame can then be manipulated and displayed back generating a feedback loop, effects such as **delay**, **reverberation** etc. can be produced that way.

One must be careful when using this feature because the sound can become pretty loud depending on how the rendered frame is manipulated, for example, with static visuals, if you add the previous frame to the current frame, the result will be pretty much white!

## How-to

The previous frame is accessible as a texture within the shader, example

`vec4 pframe = texture(pFrame, vec2(uv.x, uv.y));`

When WebGL 2 is supported, there is also an independant definition for the synth. data frame

`vec4 pframe_synth = texture(pFrameSynth, vec2(uv.x, uv.y));`

