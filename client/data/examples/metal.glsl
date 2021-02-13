  // Sample program : metal bar synthesis
  // Note :
  //   Must add/select "Physical model" instrument in "SYNTH".
  //   Must select "Metal bar" model in instrument parameters.

  highp float rand(vec2 co) { highp float a = 12.9898; highp float b = 78.233; highp float c = 43758.5453; highp float dt= dot(co.xy ,vec2(a,b)); highp float sn= mod(dt,3.14); return fract(sin(sn) * c); }
  const vec2 O = vec2(0.,1.); float noise (in vec2 uv) { vec2 b = floor(uv); return mix(mix(rand(b),rand(b+O.yx),.5),mix(rand(b+O),rand(b+O.yy),.5),.5); }

  // numbers of notes layers
  #define LAYERS 2

  void main () {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    float lr = 0.; // amplitude for left & right channels (Red, Green)
    float bar_scan_speed = 0.001; // must be fractional (encoded within Blue channel)
    float bar_strike_position = 0.95; // must be fractional (encoded within Alpha channel)
    float bar_decay = 1. + bar_scan_speed; // integer
    float bar_strike_width = 500. + bar_strike_position; // must be between 0 and 1000
    if (uv.y > 0.3 && uv.y < 0.65) { // filter too low / high frequencies
      // create layers of notes
      for (int layer = 0; layer < LAYERS; layer++) {
        float li = float(layer);
        float scale = 400.; // layer scale
        float density = .05; // notes density
        lr += step(density, pow(noise(mod(vec2(uv.x * scale + globalTime * 8. - li * 2., uv.y * scale),resolution.x)), 18.));
      }
    }
    
    synthOutput = vec4(vec2(lr), bar_decay, bar_strike_width);
    fragColor = vec4(vec3(lr), 1.0 );
}
