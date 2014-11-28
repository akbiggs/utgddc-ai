utgddc-ai
=========

AI Demo for a University of Toronto Game Dev Club talk. The demo can be played
[here](http://akbiggs.github.io/utgddc-ai).

This demo uses Canvas in HTML5. For a reference on the <canvas> element and what you can do with it,
see [this page on MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API).

Parts
==============

* Position(```pos.js```): A position in the game. Represented as an array with two values, where the
first value is the Y component of the position and the second value is the X component of the position.

* Input(```input.js```): Wraps around some input logic, with support for checking keys that were "tapped"(went
down on the last frame).

* AI+World(```ai.js```): The meat of the game. Contains the AI functions, a World initializer and a basic update/draw
loop for the grid within the world.
