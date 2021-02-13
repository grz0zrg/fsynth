  // Sample program : Box blur
  // Note : Must add one input using the [+] toolbar icon (Import button)
  //        To tile the image : Must set Wrap S / Wrap T of input0 settings to "repeat" (right click on input thumbnail after it was imported)

  #define N 8.0

  void main () {
    vec2 uv = gl_FragCoord.xy / resolution.y;
    
    // box blur (average of neighbour pixels)
    vec4 sum = vec4(0.0);
    vec2 d;
    for(d.y = -N; d.y <= +N; d.y++) {
      for(d.x = -N; d.x <= +N; d.x++) {
        sum += texture(iInput0, (gl_FragCoord.xy + d) / resolution.xy);
      }
    }

    vec4 avg = sum / pow(2.0 * N + 1.0, 2.0);

    // first input (import icon)
    vec4 c0 = texture(iInput0, gl_FragCoord.xy);
    // add blur version
    c0 += avg;

    synthOutput = vec4(0.);
    fragColor = c0;
  }

