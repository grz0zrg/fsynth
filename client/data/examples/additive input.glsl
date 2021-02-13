  // Sample program : additive synthesis with input
  // Note :
  //   Must add an input with "IMPORT" button.
  //   Must add an additive instrument.
  //   The slice can be moved to scan different part of the input texture.

  void main () {
    float l = 0., r = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;
    
    vec4 tex = texture(iInput0, vec2(uv.x, uv.y));
    
    if (uv.y > 0.35 && uv.y < 0.75) { // filter too high / low frequencies
      l = tex.r / 8.;
      r = tex.g / 8.;
    }

    synthOutput = vec4(l, r, 0., 0.);
    fragColor = vec4(tex.r, tex.b, 0., 1.);
  }

