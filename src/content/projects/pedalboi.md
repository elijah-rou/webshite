---
name: PedalBoi
repo: https://github.com/elijah-rou/PedalBoi
language: C++
summary: Programmable guitar pedal built on the Electrosmith Daisy audio microcontroller.
order: 3
---
A guitar pedal built around the Electrosmith Daisy Seed, a microcontroller made
for audio, so that one pedal can run any effect written as digital signal
processing in C++. The programmed effect is a hard-clipping distortion.

The circuit is a simplified, breadboard version of Electrosmith's Daisy Petal
reference design: an op-amp input buffer that turns the guitar's high-impedance
signal into a low-impedance one, the Daisy Seed, an output buffer for
high-gain signals, and a 3PDT footswitch for true bypass, all in a drilled
aluminium enclosure.

The first prototype works. Getting there meant tracing ground-loop hum with an
oscilloscope and raising the supply to the NJM4580D op-amp, which is not
rail-to-rail and misbehaved on 5 V. A potentiometer, a custom PCB and enclosure,
and wireless effect upload were planned next.
