  // Sample program : Plane deformation (tunnel)
  // Note : Must add one input using the [+] toolbar icon (Import button)
  //        To tile the image : Must set Wrap S / Wrap T of input0 settings to "repeat" (right click on input thumbnail after it was imported)

  void main () {
    vec2 position = vec2(0.75, 0.2);
    vec2 p = (-resolution.xy + 2. * gl_FragCoord.xy) / resolution.y - position;
    
    float angle = -globalTime * 0.15;
    
    p = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p;
    
    float a = atan(p.y, p.x);
    float r = length(p);
    
    vec2 uv = vec2(0.3 / r + 0.1 * globalTime, a / 3.1415927 );
    vec2 uv2 = vec2(uv.x, atan(p.y, abs(p.x)) / 3.1415927);
    
    vec3 col = textureGrad(iInput0, uv, dFdx(uv2), dFdy(uv2)).xyz;
    
    col *= pow(r, 1.5);

    synthOutput = vec4(0.);
    fragColor = vec4(col, 1.);
  }

