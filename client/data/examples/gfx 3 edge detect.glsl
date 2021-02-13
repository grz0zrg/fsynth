  // Sample program : Basic edges detection
  // Note : Must add one input using the [+] toolbar icon (Import button)

  void main () {
    vec2 fc = gl_FragCoord.xy;

    vec2 R = fc + vec2(+1.0, 0.0);
    vec2 L = fc + vec2(-1.0, 0.0);
    vec2 U = fc + vec2(0.0, +1.0);
    vec2 D = fc + vec2(0.0, -1.0);

    vec4 H = texture(iInput0, L / resolution.xy) - texture(iInput0, R / resolution.xy);
    vec4 V = texture(iInput0, U / resolution.xy) - texture(iInput0, D / resolution.xy);

    synthOutput = vec4(0.);

    fragColor.r = length(vec2(H.r, V.r));
    fragColor.g = length(vec2(H.g, V.g));
    fragColor.b = length(vec2(H.b, V.b));
    fragColor.a = length(vec2(H.a, V.a));
  }
