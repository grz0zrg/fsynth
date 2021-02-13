  // Sample program : karplus-strong synthesis with automata visuals
  // Note :
  //   Must add/select "Physical model" instrument in "SYNTH".
  // Automata code from https://www.shadertoy.com/view/wtlcR8

  void main () {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    float lr = 0.; // amplitude for left & right channels (Red, Green)
    float karplus_cutoff = 440.0; // karplus resonance filter cutoff frequency (integer)
    float karplus_stretching = abs(sin(globalTime * 80. + uv.y * 3.1415 * 2.) / 120.) + karplus_cutoff; // karplus stretching is encoded with cutoff in fractional part
    float karplus_res = 0.2; // karplus filter resonance
    
    // automata is based on boolean logic
    bool b = false;
    if (uv.y > 0.3 && uv.y < 0.75) { // filter too low / high frequencies
      int x = int(gl_FragCoord.x);
      int y = int(gl_FragCoord.y + 1.0 * globalTime);
      int r = (x+y)^(x-y); // other logic operator work too!
      b = abs(r*r*r/(y+x+int(globalTime*100.0))) % (9970) < 1000;
    }
    
    synthOutput = vec4(vec2(b ? 1. : 0.), karplus_stretching, karplus_res);
    fragColor = vec4(vec3(b ? 1.0 : 0.), 1.0 );
}
