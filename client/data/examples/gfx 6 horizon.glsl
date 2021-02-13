  // Sample program : Plane deformation (horizont)
  // Note : Must add one input using the [+] toolbar icon (Import button)
  //        To tile the image : Must set Wrap S / Wrap T of input0 settings to "repeat" (right click on input thumbnail after it was imported)

  void main () {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
	vec2 cuv = uv * 2.0 - 1.0;
	
	vec2 tuv = cuv;
	
	tuv.x = abs(0.5 / tuv.x);
	tuv.y *= max(tuv.x, 0.75);

	tuv.y += globalTime * 0.175;
    
	vec4 depth = vec4(pow(abs(cuv.x / cuv.y), 0.25 * (1.+abs(cuv.y)))) * pow(abs(cuv.x), 0.05);
	
    vec4 col = texture(iInput0, vec2(tuv.x, tuv.y)) * depth;
    col += texture(iInput0, vec2(tuv.y / 2., tuv.x*2.0)) * depth;

    synthOutput = vec4(0.);
    fragColor = col;
  }

