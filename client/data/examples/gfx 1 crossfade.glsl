  // Sample program : Cross-fade between two inputs
  // Note : Must add two inputs using the [+] toolbar icon (Import button)

  #define PI 3.1415926

  void main () {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // first input (import icon)
    vec4 c0 = texture(iInput0, vec2(uv.x, uv.y));
    // second input (import icon)
    vec4 c1 = texture(iInput1, vec2(uv.x, uv.y));

    // crossfade
    float t = 0.5 - 0.5 * cos(2.0 * PI * globalTime / 8.0);
    vec4 c = mix(c0, c1, t);

    synthOutput = vec4(0.);
    fragColor = c;
  }

