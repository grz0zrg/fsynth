  // Sample program : granular synthesis
  // Note :
  //   Must add/select "Granular" instrument in "SYNTH".
  //   Must add grains samples in "grains" audio server directory.
  // See instrument "Parameters" to change min/max grain length, spread and envelope type.
  // This example was made with a granular env of type "confined gaussian", min. grain length of 0.001, max. grain length of 0.001 and almost no spread.
  // Result depend on grains content.
  // Note : this is computationally heavy, you may need to reduce the grains density or number of harmonics.

  #define PI 3.141592653
  #define PI2 (PI * 2.)

  void main () {
    float l = 0., r = 0.;
    
    vec2 uv = gl_FragCoord.xy / resolution;

    float start_frequency = 220.;
    float harmonics = 2.;
    
    const float harmonics_step = 0.25;
    for (float h = 1.; h < harmonics; h += max(0.25, harmonics_step)) {
        // normalize
      	float nh = h / harmonics;
        // modulate attenuation factor (filter cutoff)
      	float attenuation_factor = 2.0 + sin(globalTime / PI2) * 1.;
        // attenuate high frequencies harmonics (filter)
        float attenuation = pow(1. - nh, attenuation_factor);
      
      	// apply varying amplitude 
      	float amplitude_osc = abs(sin(uv.y * PI2 + uv.x * PI + globalTime));
      	attenuation *= amplitude_osc;

      	float harmonic_frequency = start_frequency * h;
        
    	l += fline(harmonic_frequency) * attenuation;
      	r += fline(harmonic_frequency) * attenuation;
    }
    
    // grain sample index; fractional between 0 and < 1 (encoded with grains density)
    float sample_index = 0.;
    // grains density (integer; the audio server define the maximum number of grains which is 128 by default)
    // Note : can be changed dynamically but may produce crackles
    //        dynamic grains density is possible by adding generators at different frequencies and modulating amplitude
    float grains_density = 12. + sample_index;
    // the index at which new grains spawn; fractional, if negative play grains backward and if > 1 grain start is random
    float grains_start = uv.y + sin(globalTime * 32.) / 128.;

    synthOutput = vec4(l, r, grains_density, grains_start);
    gl_FragColor = vec4(l, r, 0., 1.);
  }


