// SuperCollider additive synthesizer for the Fragment synthesizer
//
// This is a simple additive synthesizer which use the DynKlang UGen, this synthesizer is fed from OSC data.
// Only one channel is supported at this moment.
//
// This can be used with the Fragment synthesizer by enabling OSC out and using an OSC relay.
//
// Note: You should set the canvas height manually at this moment. (but this might work dynamically ?)
//
// https://www.fsynth.com/

(
SynthDef(\fragment, {
	    var dkl_l, dkl_r, height, freqs, amps_l, amps_r, gain_l, gain_r, noise, out, out_l, out_r, env;

	    height = 439;
	    gain_l = NamedControl.kr(\gain_l, 0.001);
	    gain_r = NamedControl.kr(\gain_r, 0.001);
	    freqs = NamedControl.kr(\freqs, Array.fill(height,0), Array.fill(height,0.01));
	    amps_l = NamedControl.kr(\amps_l, Array.fill(height,0), Array.fill(height,0.01));
	    amps_r = NamedControl.kr(\amps_r, Array.fill(height,0), Array.fill(height,0.01));

	    noise = WhiteNoise.ar * 0.05;

	    dkl_l = DynKlang.ar(`[freqs, amps_l, Array.fill(height, { rrand(-1, 1) })], 1.0 - noise);
	    dkl_r = DynKlang.ar(`[freqs, amps_r, Array.fill(height, { rrand(-1, 1) })], 1.0 - noise);

	    Out.ar(0, [dkl_l, dkl_r]);
    }).load(s)
);

(
SynthDef(\output_enhancer, {|outbus, mix = 0.25, room = 0.8, damp = 0.5, amp = 1.0|
    var signal;
	signal = In.ar(outbus, 2);
    ReplaceOut.ar(outbus,
        Limiter.ar(FreeVerb2.ar(
            signal[0],
            signal[1],
			mix, room, damp, amp).clip2(1.0), 1.0, 0.01));
}).add;
);

(
~height = 439;

~fs = Synth(\fragment, [\freqs, []]);

// uncomment this line for reverb/clipped enhanced sound output
//~oe = Synth(\output_enhancer, [\outbus, 0], addAction:\addToTail);

~pf = Array.fill(~height, 0);
~pa_l = Array.fill(~height, 0);
~pa_r = Array.fill(~height, 0);

~n=NetAddr("127.0.0.1", 57120);
o = OSCdef(\osc_receiver, {| msg, time |
	    ~pf[msg[1]] = msg[2];
	    ~pa_l[msg[1]] = msg[3];
	    ~pa_r[msg[1]] = msg[4];
	    ~fs.set(\freqs, ~pf, \amps_l, ~pa_l, \amps_r, ~pa_r);
    }, "/fragment", n);
);
