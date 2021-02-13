  // Sample program : Display imported data (input) & tile it
  // Note : Must add one input using the [+] toolbar icon (Import button)
  //        Must set Wrap S / Wrap T of input0 settings to "repeat" (right click on input thumbnail after it was imported)

  void main () {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // first input (import icon)
    vec4 c0 = texture(iInput0, vec2(uv.x, uv.y) * 2.);

    synthOutput = vec4(0.);
    fragColor = c0;
  }

