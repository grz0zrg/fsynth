  // Sample program : karplus-strong synthesis
  // Note :
  //   Must add/select "Physical model" instrument in "SYNTH".

  highp float rand(vec2 co) { highp float a = 12.9898; highp float b = 78.233; highp float c = 43758.5453; highp float dt= dot(co.xy ,vec2(a,b)); highp float sn= mod(dt,3.14); return fract(sin(sn) * c); }
  const vec2 O = vec2(0.,1.); float noise (in vec2 uv) { vec2 b = floor(uv); return mix(mix(rand(b),rand(b+O.yx),.5),mix(rand(b+O),rand(b+O.yy),.5),.5); }

  // numbers of notes layers
  #define LAYERS 8

  void main () {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    float lr = 0.; // amplitude for left & right channels (Red, Green)
    float karplus_cutoff = 440.; // karplus resonance filter cutoff frequency (integer)
    float karplus_stretching = abs(sin(globalTime * 32. + uv.y * 3.1415 * 2.) / 2.) + karplus_cutoff; // karplus stretching is encoded with cutoff in fractional part
    float karplus_res = 0.25; // karplus filter resonance
    if (uv.y > 0.3 && uv.y < 0.75) { // filter too low / high frequencies
      // create layers of notes
      for (int layer = 0; layer < LAYERS; layer++) {
        float li = float(layer);
        float scale = 200.; // layer scale
        float density = .05; // notes density
        lr += step(density, pow(noise(mod(vec2(uv.x * scale + globalTime * 2. - li * 1.5, uv.y * scale),resolution.x)), 18.));
      }
    }
    
    synthOutput = vec4(vec2(lr), karplus_stretching, karplus_res);
    fragColor = vec4(vec3(lr), 1.0 );
}
