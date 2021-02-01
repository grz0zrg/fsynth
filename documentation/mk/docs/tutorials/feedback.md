## About

Feedback is a powerful feature which allow Fragment access to the previously rendered frame.

The previously rendered frame can then be manipulated in the main fragment and displayed back generating a feedback loop, effects such as **delay**, **reverberation** etc. can be produced that way.

One must be careful when using this feature because the sound can become pretty loud depending on how the rendered frame is manipulated, for example, with static visuals, if you add the previous frame to the current frame, the result will be pretty much white!

## How-to

The previous frame fragment shader cannot be edited for now, its source-code is

```glsl
void main () {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec4 c = texture(colorInput, uv);
  vec4 s = texture(synthInput, uv);
  fragColor = c;
  synthOutput = s;
}
```

### Usage

The previous **visuals** frame (what you see) is accessible as a texture within the main shader :

`vec4 pframe = texture(pFrame, vec2(uv.x, uv.y));`

The previous **slices** frame (what is captured by the instruments / slices) is accessible as a texture within the main shader :

`vec4 pframe_synth = texture(pFrameSynth, vec2(uv.x, uv.y));`

