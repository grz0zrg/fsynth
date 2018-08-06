## About

> Processing.js is the sister project of the popular [Processing](http://processing.org/) visual programming language, designed for the web. Processing.js makes your data visualizations, digital art, interactive animations, educational graphs, video games, etc.

Fragment has full support for the Processing.js visualization language through Fragment inputs, the Processing.js sketch is rendered into a texture and passed to the fragment shader.

This feature allow to build almost anything within Fragment.

## How-to

Open the import dialog and click on the **Pjs** button, this will add a Processing.js input.

You can then open the Processing.js editor by **right clicking** on any Processing.js input thumbnail (Pjs icon).

The Processing.js editor has a list of all added Pjs inputs to the left and the associated source code to the right.

You can switch from Pjs inputs sources by selecting the input name to the left.

Compilation status appear at the bottom end of the Pjs editor dialog.

All changes done in the Pjs editor are updated in real-time as you type.

## Pre-defined variables

Fragment add it's own variables to any created Processing.js input which are defined as follow :

`float baseFrequency`

​	score base frequency (hertz)

`float octave`

​	score octave range

`PImage iInputN`

​	imported image data

`float htoy` 

​	a function with a frequency as argument, return a vertical position (pixels)

## Images input

All imported images within Fragment are available in a Processing.js sketch by calling the appropriate function such as :

`image(iInput0, 0, 0);`

This only work with images input.