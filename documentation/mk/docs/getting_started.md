## Getting Started

The quickest way to get started is to join/create a session on the [homepage](https://www.fsynth.com)

To output any sounds the audio server available on the [homepage](https://www.fsynth.com) must be downloaded and run alongside any Fragment sessions.

To run the audio server on Linux :

- download the AppImage .zip file on the [homepage](https://www.fsynth.com)
- unzip somewhere
- `sudo chmod +x fas` in a terminal (or allow the file to be executable through file properties)
- launch with `./fas` in a terminal

To run the audio server on Windows :

- download the corresponding .zip file on the [homepage](https://www.fsynth.com)
- unzip somewhere
- double click on the `fas` binary

The audio server will detect and select the default audio output device.

Once the session is created from the homepage, you will join automatically the Fragment application, an example code which produce basic sounds will be provided automatically along with a quickstart guide and some examples.

The Fragment user interface layout is made of :

- an information bar at the top with global gain parameter
- the canvas which is the accelerated drawing surface
- a toolbar
- the project sidebar alongside code editor where the GPU can be instructed to draw on the canvas

To hear any sounds, you must **unpause** by clicking on the corresponding toolbar button, then slice the canvas in vertical chunks to capture the pixels produced by the example code, you can do that by **right-clicking anywhere on the canvas** and then by **clicking on the + icon**.

If you hear a simple 440hz tone, congratulations! Time to move on to the tutorial!

If you want to quickly explore you can find many examples of most features in the **workspaces** sidebar, all additive examples work out of the box without additional steps.