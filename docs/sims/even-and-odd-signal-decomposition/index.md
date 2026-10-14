---
title: Even and Odd Signal Decomposition
description: Decompose a preset or hand-drawn signal x(t) into its even part and odd part, read the worked calculation at a probe time, and verify that the two parts sum back to x(t).
image: /sims/even-and-odd-signal-decomposition/even-and-odd-signal-decomposition.png
og:image: /sims/even-and-odd-signal-decomposition/even-and-odd-signal-decomposition.png
twitter:image: /sims/even-and-odd-signal-decomposition/even-and-odd-signal-decomposition.png
social:
   cards: false
quality_score: 100
---

# Even and Odd Signal Decomposition

<iframe src="main.html" height="562px" width="100%" scrolling="no"></iframe>

[Run the Even and Odd Signal Decomposition MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit in the p5.js Editor](https://editor.p5js.org/)

## About This MicroSim

Any signal can be written as the sum of an even signal and an odd signal:

$$x_e(t) = \frac{x(t) + x(-t)}{2} \qquad x_o(t) = \frac{x(t) - x(-t)}{2} \qquad x(t) = x_e(t) + x_o(t)$$

The three plots share one time axis from $-5$ s to $+5$ s:

- **Top (blue):** the original signal $x(t)$. The purple dashed curve is the sum $x_e(t) + x_o(t)$, which lies exactly on top of $x(t)$.
- **Middle (green):** the even part $x_e(t)$, a mirror image about the vertical axis at $t = 0$.
- **Bottom (red):** the odd part $x_o(t)$, which changes sign when reflected about $t = 0$.

The dashed vertical lines mark the probe time $t$ (filled dot) and its mirror $-t$ (open dot).
The panel under the plots substitutes the two values $x(t)$ and $x(-t)$ into the formulas,
so you can follow the arithmetic for one point at a time.

The last line of the panel reports how the signal energy divides between the two parts.
Because the product of an even and an odd signal integrates to zero over a symmetric interval,
the energies add: $E = E_e + E_o$. A purely even signal shows 100% even, and a purely odd signal shows 100% odd.

Preset signals are sampled every 0.01 s. At a jump, the sample takes the midpoint value, so the
unit step in the exponential is plotted as $u(0) = 0.5$. This keeps the even and odd parts free of one-sample spikes
and does not change any integral.

## How to Use

1. Choose a preset **Signal**: pulse, triangle, sawtooth or exponential.
2. Move **Time shift** to slide the preset along the time axis and watch the even and odd parts change.
3. Move **Probe time** to pick the instant used in the worked calculation.
4. Drag inside the top plot to draw your own signal. Drawing on a preset edits a copy of it.
   Press **Clear** to start from a blank signal.
5. Untick **Show sum** to hide the purple check curve.

## Iframe Embed Code

You can add this MicroSim to any web page by adding this to your HTML:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/even-and-odd-signal-decomposition/main.html"
        height="562px"
        width="100%"
        scrolling="no"></iframe>
```

## Lesson Plan

### Learning Objectives

By the end of this activity, students will be able to:

1. **Explain** even and odd symmetry in terms of reflection about $t = 0$.
2. **Apply** the decomposition formulas to compute $x_e(t)$ and $x_o(t)$ at a given time.
3. **Verify** that the even and odd parts sum to the original signal.
4. **Recognize** the even and odd parts of pulses, triangles, sawtooth waves and one-sided exponentials.

### Grade Level

Undergraduate (introductory signals and systems)

### Duration

15-20 minutes

### Prerequisites

- Even and odd functions from algebra or precalculus
- Time reversal $x(-t)$ and time shifting $x(t - t_0)$

### Activities

1. **Exploration** (5 min): Select the pulse and set the time shift to 0. The odd part vanishes.
   Now select the sawtooth with time shift 0. The even part vanishes. Explain both results from the shape of the signal.
2. **Guided Practice** (10 min):
    - Pulse, time shift 1 s, probe time 1 s. Before looking at the panel, compute $x_e(1)$ and $x_o(1)$ by hand
      from $x(1) = 1$ and $x(-1) = 0$. Then move the probe to $-1$ s and repeat.
    - Select the exponential with time shift 0. Sketch $x_e(t)$ and $x_o(t)$ before looking at the plots.
      The even part is $\tfrac{1}{2}e^{-|t|}$. What is the odd part?
    - Slide the pulse from shift 0 to shift 3 and watch the energy split. At what shift does it first reach 50% even, 50% odd, and why does it stay there?
3. **Assessment** (5 min): Draw a signal that is zero for $t < 0$. Show that for $t > 0$ the even and odd parts are equal,
   and for $t < 0$ they are equal and opposite.

### Assessment

- Student computes $x_e$ and $x_o$ at a probe time from $x(t)$ and $x(-t)$ without the panel.
- Student explains why a signal that is zero for $t < 0$ always splits its energy equally between the even and odd parts.
- Student states that the decomposition is unique: a signal that is both even and odd must be zero.

## References

1. Oppenheim, A. V., Willsky, A. S., & Nawab, S. H. (1997). *Signals and Systems* (2nd ed.). Prentice Hall. Chapter 1 covers even and odd signals and their decomposition.
2. [Even and odd functions](https://en.wikipedia.org/wiki/Even_and_odd_functions), Wikipedia.
3. [Chapter 2: Introduction to Signals and Systems](../../chapters/02-introduction-to-signals-and-systems/index.md) of this textbook.
