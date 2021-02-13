  // Sample program : Polar coordinates (2d rotation)
  // Note : Must add one input using the [+] toolbar icon (Import button)
  //        To tile the image : Must set Wrap S / Wrap T of input0 settings to "repeat" (right click on input thumbnail after it was imported)

  void main () {
    // fix aspect ratio
    vec2 uv = (2. * gl_FragCoord.xy - resolution.xy) / resolution.y;
    
    // polar coordinates
    float angle = atan(uv.x, uv.y);
    float dist = length(uv);
    
    // rotate
    angle += globalTime / 4.;
    
    // rectangular coordinates
    uv.x = dist * cos(angle);
    uv.y = dist * sin(angle);
    
    // adjust uv
    uv = 0.5 + 0.5 * uv;

    // first input (import icon)
    vec4 c0 = texture(iInput0, vec2(uv.x, uv.y));

    synthOutput = vec4(0.);
    fragColor = c0;
  }

