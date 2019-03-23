# About

[Fragment](https://www.fsynth.com) is a collaborative cross-platform audiovisual live coding environment with **bitmap-based** *image-synth* approach, the sound synthesis is **powered by pixels data** produced algorithmically or by drawing over a canvas.

Fragment has a progressive learning curve, anyone can start to experiment with sounds and visuals quickly.

Fragment has many features making it a bliss to produce any kind of sounds and visuals, it is aimed at artists seeking a creative environment with few limitations to experiment with, a programmable noise-of-all-kinds software.

Many videos of most features are available on [the official YouTube channel](https://www.youtube.com/c/FragmentSynthesizer)

For any questions, a message board is available [here](https://quiet.fsynth.com/)

The old single page documentation (still updated to some extent) is available [here](https://www.fsynth.com/maml_documentation.html)

The PDF documentation can be found [here](https://www.fsynth.com/pdf/fragment_documentation.pdf)

*All software is free of charge, and distributed according to free software/open source principles and licenses.*

## Requirement

- Web. browser such as [Chromium](https://fr.wikipedia.org/wiki/Chromium_(navigateur_web)) (recommended), Opera, Safari or [Firefox](https://www.mozilla.org/fr/firefox/new) (MIDI is not supported by Firefox at the moment)
- Mid-range GPU, Fragment was developed with a GeForce GTX 970
- Mid-range multi-core CPU, a beefy CPU may be needed for advanced features
- Not necessary but a MIDI device such as a MIDI keyboard is recommended

A high amount of memory is needed to load many samples/distributed sound synthesis with the audio server, this is because all samples are pre-loaded for each instances.

## Performances

Fragment has excellent performances with a modern multi-core system and a browser such as Chromium.

If you experience crackles or need advanced audio features, it is recommended that you use the audio server available on the homepage.

The audio server is able to provide fast sound synthesis, it also provide many settings such as audio device selection, sample rate settings etc.

Moreover, the audio server is able to do distributed real-time audio synthesis on any machines or cores over the network by splitting the workload between servers instance, [fas_relay](https://github.com/grz0zrg/fsynth/tree/master/fas_relay) is needed to use this feature