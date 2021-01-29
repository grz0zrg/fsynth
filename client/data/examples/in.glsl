  // Sample program : Play input channel
  // Note :
  //   Must add/select "In" instrument in "SYNTH".
  //   Must play something and forward it to the first input channel of the sound server.
  void main () {
    float l = 0., r = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;
    
    // output sound from the first source channel (stereo so input 0 / 1 of the audio server)
    float source_chn = 0.;
    
    // note :
    //   frequency here is just an on/off switch that indicate that we want to play a source channel, it does not change output sound
    //   multiple source channel playback can be done simultaneously by just adding more data at different frequency band
    //   many effects can be done with this like stuttering (by switching fast), amplitude modulation (by fast variation of the amplitude combined with high FPS settings)
    //   or even some kind of granular synthesis by playing multiple input channels with different looped sample offset and fast switching
    float frequency = 440.;
    float amplitude = 1.;
    l += fline(frequency) * amplitude;
    r += fline(frequency) * amplitude;

    synthOutput = vec4(l, r, source_chn, 0.);
    gl_FragColor = vec4(l, r, 0., 1.);
  }


