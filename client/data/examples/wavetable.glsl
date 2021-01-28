  // Sample program : wavetable synthesis
  // Note :
  //   Must add/select "Wavetable" instrument in "SYNTH".
  //   Must add audio samples in "waves" audio server directory.

  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;
    
    float frequency = 240.;
    
    float wavetable_direction = 1.;
    float wavetable_speed = 0.005 + abs(sin(globalTime * PI2) / 16.);
    float wavetable_interpolation = 0.5; // disable: 0, enable: > 0 (fractional)
    // wave start index: 0 
    // speed is encoded in the fractional part and direction is defined by the sign
    float wave_start = (0. + wavetable_speed) * wavetable_direction;
    // wave end index: 128
    float wave_end = 128. + wavetable_interpolation;

    l += fline(frequency);
    r += fline(frequency);

    synthOutput = vec4(l, r, wave_start, wave_end);
    gl_FragColor = vec4(l, r, 0., 1.);
  }

