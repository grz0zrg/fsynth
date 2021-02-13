  // Sample program : Faust (using default pulsewave.dsp)
  // Note :
  //   Must add/select "Faust" instrument in "SYNTH".
  //   Must set "Generator ID" to 0 (or an index which correspond to the pulsewave.dsp ID in case there is added .dsp)

  void main () {
    float l = 0., r = 0.;
    
    // pulsewave.dsp use Blue and Alpha channel as L/R duty cycle parameters for the pulse wave
    // see documentation for writing your own .dsp file
    float duty_cycle_left = abs(sin(globalTime / 2.));
    float duty_cycle_right = abs(cos(globalTime + 3.1415 / 2.));

    float frequency = 440.;
    
    l += fline(frequency) * 0.25;
    r += fline(frequency) * 0.25;

    synthOutput = vec4(l, r, duty_cycle_left, duty_cycle_right);
    fragColor = vec4(l, r, 0., 1.);
  }
