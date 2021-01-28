  // Sample program : subtractive synthesis
  // Note :
  //   Must add/select "Subtractive" instrument in "SYNTH".

  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;
    
    // 0: sawtooth, 1: square, 2: triangle, 3: brownian noise, 4: pink noise
    float waveform = abs(0. + round(sin(globalTime * 32.) * 1.)); // vary waveform between 0 and 1

    float frequency = 60.;
    
    // filter type can be changed in instrument parameters
    float filter_cutoff = 32.; // this is a multiplier, 1 mean that the cutoff frequency is set to frequency of the currently active band
    float filter_resonance = 0.25 + waveform; // amount of resonance is stored in the fractional part of the alpha channel with waveform on the integer part
    
    // modulate filter cutoff / resonance and add small frequency jitter
    float modulator = 0.25 + abs(sin(globalTime * 2. + cos(globalTime + PI2) * PI2)) / 1.25;
    filter_cutoff *= modulator;
    frequency += frequency * round(modulator);
    filter_resonance += modulator / 2.;

    l += fline(frequency);
    r += fline(frequency);

    synthOutput = vec4(l, r, filter_cutoff, filter_resonance);
    gl_FragColor = vec4(l, r, 0., 1.);
  }

