  // Sample program : droplet synthesis
  // Note :
  //   Must add/select "Physical model" instrument in "SYNTH".
  //   Must select "droplet" model in instrument parameters.

  highp float rand(vec2 co) { highp float a = 12.9898; highp float b = 78.233; highp float c = 43758.5453; highp float dt= dot(co.xy ,vec2(a,b)); highp float sn= mod(dt,3.14); return fract(sin(sn) * c); }
  const vec2 O = vec2(0.,1.); float noise (in vec2 uv) { vec2 b = floor(uv); return mix(mix(rand(b),rand(b+O.yx),.5),mix(rand(b+O),rand(b+O.yy),.5),.5); }

  // numbers of notes layers
  #define LAYERS 2

  void main () {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    float lr = 0.; // amplitude for left & right channels (Red, Green)
    float droplet_damping_factor = 0.1; // must be fractional (encoded within Blue channel)
    float droplet_energy_amount = 0.2; // must be fractional (encoded within Alpha channel)
    float droplet_first_resonant_freq = 120. + droplet_damping_factor;
    float droplet_second_resonant_freq = 240. + droplet_energy_amount;
    if (uv.y > 0.3 && uv.y < 0.75) { // filter too low / high frequencies
      // create layers of notes
      for (int layer = 0; layer < LAYERS; layer++) {
        float li = float(layer);
        float scale = 100.; // layer scale
        float density = .05; // notes density
        lr += step(density, pow(noise(mod(vec2(uv.x * scale + globalTime * 8. - li * 2., uv.y * scale),resolution.x)), 18.));
      }
    }
    
    synthOutput = vec4(vec2(lr)/2., droplet_first_resonant_freq, droplet_second_resonant_freq);
    gl_FragColor = vec4(vec3(lr), 1.0 );
}
