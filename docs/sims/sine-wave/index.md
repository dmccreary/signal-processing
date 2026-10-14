---
title: Sine Wave
description: Plot y(t) = A sin(2πt/T + φ) and use three sliders to see how amplitude, period and phase change a sine wave, with frequency and time-shift read-outs.
image: /sims/sine-wave/sine-wave.png
og:image: /sims/sine-wave/sine-wave.png
twitter:image: /sims/sine-wave/sine-wave.png
social:
   cards: false
quality_score: 90
---

# Sine Wave

<iframe src="main.html" width="100%" height="572px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/sine-wave/main.html" width="100%" height="572px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

[Edit in the p5.js Editor](https://editor.p5js.org/dmccreary/sketches/0SEATs3jW)

## Description

This MicroSim draws one sinusoid, $y(t) = A\sin\left(\frac{2\pi t}{T} + \varphi\right)$, over a fixed 10 ms window
from $-5$ ms to $+5$ ms. Three sliders set the three parameters that completely define the wave:

- **Amplitude $A$** (0 to 2, arbitrary units) sets the height of the peaks.
- **Period $T$** (0.5 to 5 ms) sets the time taken by one full cycle.
- **Phase $\varphi$** (-180° to +180°) sets where in its cycle the wave is at $t = 0$.

Gold markers show each parameter on the plot: dashed lines at $\pm A$, a dimension line exactly one period wide,
and an arrow on the time axis for the time shift $\Delta t$. The read-out panel at the top gives the equation with the
current numbers, the frequency $f$, the angular frequency $\omega$, the time shift $\Delta t$ and the value $y(0)$,
which is also marked by the open circle at $t = 0$.

A positive phase moves the wave to the left (the wave *leads*), the same convention as $A\cos(\omega t + \varphi)$
in the text. A phase of +90° turns the sine into a cosine. This simulation supports the section on sinusoidal signals
in [Chapter 2: Introduction to Signals and Systems](../../chapters/02-introduction-to-signals-and-systems/index.md).

### Mathematical Concepts

The three read-outs are computed from the period $T$ and the phase $\varphi$:

$$f = \frac{1}{T}, \qquad \omega = 2\pi f = \frac{2\pi}{T}, \qquad \Delta t = -\frac{\varphi}{\omega} = -\frac{\varphi T}{2\pi}$$

Writing the wave as $y(t) = A\sin\big(\omega (t - \Delta t)\big)$ shows that the phase is a time shift expressed as a
fraction of a cycle: a phase of $2\pi$ radians (360°) is one full period.

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Identify** the amplitude, period and phase of a sine wave from the markers on its plot
2. **Calculate** the frequency $f = 1/T$ and the angular frequency $\omega = 2\pi f$ from a period read off the time axis
3. **Predict** how changing the amplitude, period or phase alters the plotted wave before moving a slider
4. **Compute** the time shift $\Delta t = -\varphi T / 2\pi$ produced by a given phase and explain why it depends on the period
5. **Explain** why a phase of +90° turns a sine wave into a cosine wave

### Target Audience

College-level introductory signal processing, or any course that first introduces sinusoids (pre-calculus,
calculus, circuits, physics). Plan 20-30 minutes for the activities. A suggested class flow is 10 minutes of motivation
(sine waves in sound, radio and AC power), 15 minutes of instructor demonstration, 30 minutes of student
activities and 10 minutes of group discussion.

### Prerequisites

- Graphing a function on a Cartesian grid
- Right-triangle trigonometry and the radian measure of angles
- Function notation such as $y(t)$

### Activities

**Activity 1: Amplitude (5 min).** Set $T$ = 4.0 ms and $\varphi$ = 0°, then move $A$ to 0.50, 1.00 and 2.00.
The peaks reach $\pm A$, so the peak-to-peak value is 1.0, 2.0 and 4.0. The period bracket stays 4.0 ms wide and the
frequency stays 250.0 Hz: amplitude changes only the height.

**Activity 2: Period and frequency (5-10 min).** Set $A$ = 1.00 and $\varphi$ = 0°, then set $T$ to 5.0, 4.0, 2.0,
1.0 and 0.5 ms. The frequency read-out shows 200.0 Hz, 250.0 Hz, 500.0 Hz, 1.00 kHz and 2.00 kHz, and the
10 ms window holds 2, 2.5, 5, 10 and 20 cycles. Halving the period doubles the frequency.

**Activity 3: Phase (5-10 min).** Set $A$ = 1.00 and $T$ = 4.0 ms. Move $\varphi$ to +90°: the wave becomes a cosine,
$y(0) = 1.00$ sits on a peak and the time shift is $\Delta t = -1.00$ ms (left). Move $\varphi$ to -90°: $\Delta t = +1.00$ ms (right)
and $y(0) = -1.00$. Move $\varphi$ to 180°: the wave is upside down, $y(0) = 0.00$ and $\Delta t = -2.00$ ms, half a period.

**Activity 4: Predict, then verify (5-10 min).** Without looking at the read-out, predict $\Delta t$ for $T$ = 2.0 ms and
$\varphi$ = 90°, then set the sliders. The read-out shows $\Delta t = -0.50$ ms. Now set $T$ = 4.0 ms: the same phase gives
$\Delta t = -1.00$ ms, because a quarter cycle lasts longer when the period is longer.

**Extension and homework (optional).** Open the sketch in the p5.js editor and add the cosine and the tangent
functions to the plot, then compare the cosine with the sine at $\varphi$ = 90°. For homework, write your own sketch
with an adjustable sine wave and describe in a short report, with screenshots, how each parameter changes the wave.

### Assessment

1. A sine wave has a period of 2.5 ms. What are its frequency and angular frequency? *(Answer: $f = 1/T = 400$ Hz and $\omega = 2\pi f \approx 2513$ rad/s.)*
2. A wave has $A = 1.5$. What is its peak-to-peak value? *(Answer: 3.0, from $-1.5$ to $+1.5$.)*
3. With $T$ = 4.0 ms, the phase is set to 45°. By how much and in which direction is the wave shifted from the $\varphi$ = 0° wave? *(Answer: $\Delta t = -\varphi T / 2\pi = -(45/360)(4\text{ ms}) = -0.5$ ms, so it is shifted 0.5 ms to the left.)*
4. Which phase makes $A\sin(\omega t + \varphi)$ identical to $A\cos(\omega t)$? Which phase turns it into $-A\sin(\omega t)$? *(Answer: $\varphi$ = +90° gives the cosine; $\varphi$ = ±180° gives $-A\sin(\omega t)$.)*
5. Why does a phase of 90° produce a 1.00 ms shift at $T$ = 4.0 ms but only 0.50 ms at $T$ = 2.0 ms? *(Answer: 90° is a quarter of a cycle, and a quarter of 4.0 ms is 1.00 ms while a quarter of 2.0 ms is 0.50 ms.)*

### Common Misconceptions

**"Phase is a time delay in milliseconds."** Phase is an angle, a fraction of one cycle. The same $\varphi$ gives a
different time shift for every period. Compare the $\Delta t$ arrow for $\varphi$ = 90° at $T$ = 2.0 ms and $T$ = 4.0 ms
(Activity 4). Also note the sign: a positive phase moves the wave left, not right.

**"A longer period means a higher frequency."** The two are reciprocals. Increase $T$ from 2.0 to 4.0 ms and the
frequency read-out falls from 500.0 Hz to 250.0 Hz while the number of cycles in the window falls from 5 to 2.5.

## References

1. [Sine wave](https://en.wikipedia.org/wiki/Sine_wave) - Wikipedia - definition of the sinusoid in terms of amplitude, frequency and phase
2. [Amplitude](https://en.wikipedia.org/wiki/Amplitude) - Wikipedia - peak, peak-to-peak and other amplitude measures
3. [Frequency](https://en.wikipedia.org/wiki/Frequency) - Wikipedia - the relationship between period, frequency and angular frequency
4. [Phase (waves)](https://en.wikipedia.org/wiki/Phase_%28waves%29) - Wikipedia - phase offset, leading and lagging waves, and time shift
5. [Sine and cosine](https://en.wikipedia.org/wiki/Sine_and_cosine) - Wikipedia - why a 90 degree phase shift converts sine into cosine
6. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on sinusoids and signal parameters

## Development Notes

<details markdown="1">
<summary>Prompt history</summary>

**Version 2.0.0 (2026-10-14).** Ported from p5.js 1.4.0 to p5.js 2.3.2. The period slider now sets the true period
in milliseconds (the earlier sketch plotted $\sin(x/p)$ in pixels, so the number shown was not the period). The phase slider is
now an angle in degrees using the $\sin(\omega t + \varphi)$ convention, and the plot gained a labeled time axis,
$\pm A$ markers, a period marker, a time-shift arrow and the read-out panel.

**Original sketch prompt**

```linenums="0"
Generate a static sine wave on a grid of cartesian coordinates. 
Make (0,0) be at the center of an 600x400 canvas and larger y at the top.  
Add sliders for period, amplitude and phase.
Provide the label and values to the left of the sliders.
Make the sliders span the width less the leftSliderMargin of 100.
Draw and label the X and Y Axis.
```

[Edit This MicroSim with the P5.js Editor](https://editor.p5js.org/dmccreary/sketches/f7E377T03)

**Original sketch result (p5.js 1.x)**

```js
// sine wave with 3 sliders
let width = 600;
let height = 400;
let halfWidth = width / 2
let halfHeight = height / 2
let amplitude = 100;
let phase = 0;

let amplitudeSlider, periodSlider, phaseSlider;
let labelValueMargin = 120;

function setup() {
  createCanvas(width, height);
  textSize(16)
  
  // Create sliders
  amplitudeSlider = createSlider(0, 200, 100);
  amplitudeSlider.position(labelValueMargin, height - 20);
  amplitudeSlider.style('width', width - labelValueMargin + 'px')
  
  periodSlider = createSlider(1, 100, 50);
  periodSlider.position(labelValueMargin, height - 40);
  periodSlider.style('width', width - labelValueMargin + 'px')
  
  phaseSlider = createSlider(-PI*100, PI*100, 0, 0.01);
  phaseSlider.position(labelValueMargin, height - 60);
  phaseSlider.style('width', width - labelValueMargin + 'px')
}

function draw() {
  background(240);
  
  amplitude = amplitudeSlider.value();
  period = periodSlider.value();
  phase = phaseSlider.value();
  
  // draw on the standard axis to keep text upright
  drawAxis();
  translate(width / 2, height / 2); // Shift origin to center
  scale(1, -1); // Flip y-axis to make positive y up
  
  drawSineWave(amplitude, 1/period, phase);
}

function setLineDash(list) {
  drawingContext.setLineDash(list);
}

function drawAxis() {
  fill('black')
  strokeWeight(0)
  text('y', halfWidth-20, 15)
  text('x', width-20, halfHeight + 20)
  stroke('gray')
  strokeWeight(1)
  setLineDash([5, 5])
  
  // horizontal line
  line(0, halfHeight, width, halfHeight)
  // vertical line
  line(halfWidth, 0, halfWidth, height)
  
  stroke(0)
  strokeWeight(0);
  fill('black'); // Text color
  text('Amplitude: ' + amplitude/100,    10, height - 5);
  text('Period: '    + period,           10, height - 25);
  text('Phase: '     + phase.toFixed(2), 10, height - 45);
}

function drawSineWave(amplitude, frequency, phase) {
  stroke('blue');
  strokeWeight(3)
  noFill();
  // turn off dash line
  setLineDash([1, 0])
  beginShape();
    for (let x = -width / 2; x < width / 2; x++) {
      let y = amplitude * sin(frequency * (x - phase));
      vertex(x, y);
    }
  endShape();
}
```

**Original challenge:** create your own trigonometry demos by drawing the cosine and tangent functions.

**Original lesson plan prompt**

```linenums="0"
Generate a lesson plan for a 9th grade geometry class 
that accompanies the following p5.js demonstration:

The users see a sine wave on the screen.
There are three range control sliders under the sine wave.
One slider changes the amplitude of the sine wave.
One slider changes the period of the sine wave.
One slider changes the phase of the sine wave.
```

</details>
