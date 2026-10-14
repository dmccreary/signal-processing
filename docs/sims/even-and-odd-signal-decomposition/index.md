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

<iframe src="main.html" width="100%" height="562px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/even-and-odd-signal-decomposition/main.html" width="100%" height="562px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

[Edit in the p5.js Editor](https://editor.p5js.org/)

## Description

Any signal can be written as the sum of an even signal and an odd signal:

$$x_e(t) = \frac{x(t) + x(-t)}{2} \qquad x_o(t) = \frac{x(t) - x(-t)}{2} \qquad x(t) = x_e(t) + x_o(t)$$

Three plots share one time axis from $-5$ s to $+5$ s:

- **Top (blue):** the signal $x(t)$, with the purple dashed sum $x_e(t) + x_o(t)$ lying exactly on top of it.
- **Middle (green):** the even part $x_e(t)$, a mirror image about $t = 0$.
- **Bottom (red):** the odd part $x_o(t)$, which changes sign when reflected about $t = 0$.

Dashed vertical lines mark the probe time $t$ (filled dot) and its mirror $-t$ (open dot). The panel below substitutes
$x(t)$ and $x(-t)$ into the formulas and reports how the energy divides between the two parts, $E = E_e + E_o$,
over the displayed 10 s window.

**Controls:** **Signal** selects a preset (pulse, triangle, sawtooth, one-sided exponential) or a custom signal.
**Time shift $t_0$** slides a preset. **Probe time $t$** picks the instant in the worked calculation.
**Show sum** toggles the check curve. Drag in the top plot to draw $x(t)$; **Clear** starts from zero.

Signals are sampled every 0.01 s, and a jump takes its midpoint value, so $u(0) = 0.5$ in the exponential.

This simulation is used in [Chapter 2: Introduction to Signals and Systems](../../chapters/02-introduction-to-signals-and-systems/index.md).

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Explain** even and odd symmetry in terms of reflection about $t = 0$.
2. **Apply** the decomposition formulas to compute $x_e(t)$ and $x_o(t)$ at a given time.
3. **Verify** that the even and odd parts sum to the original signal.
4. **Recognize** the even and odd parts of pulses, triangles, sawtooth waves and one-sided exponentials.

### Target Audience

College undergraduates in an introductory signals and systems course. Plan 15-20 minutes.

### Prerequisites

- Even and odd functions from algebra or precalculus
- Time reversal $x(-t)$ and time shifting $x(t - t_0)$

### Activities

**Activity 1: Symmetric signals (5 min).** Select **Pulse** and set the time shift to 0. The odd part is zero everywhere
and the panel reports 100% even. Now select **Sawtooth** and set the time shift to 0. The even part is zero and the panel
reports 100% odd. Explain both results from the shape of the signal.

**Activity 2: Hand calculation (5 min).** Predict first, then read the panel.

- **Pulse**, time shift 1 s, probe time 1 s: $x(1) = 1$ and $x(-1) = 0$, so $x_e(1) = 0.500$ and $x_o(1) = 0.500$.
  Move the probe to $-1$ s: $x_e(-1) = 0.500$ and $x_o(-1) = -0.500$.
- **Exponential**, time shift 0 s, probe time 1 s: $x(1) = e^{-1} = 0.368$ and $x(-1) = 0$, so $x_e(1) = x_o(1) = 0.184$.
  At probe time $-1$ s the even part is unchanged and the odd part flips to $-0.184$.

**Activity 3: Slide a pulse away from the origin (5 min).** Select **Pulse** and watch the energy line while you move the
time shift from 0 s upward. The split is 100% / 0% at 0 s, 75% / 25% at 0.5 s, and 50% / 50% at 1 s and beyond.
Explain why it stops changing at 1 s.

**Activity 4: Draw your own (5 min).** Press **Clear**, then drag in the top plot to draw a signal that is zero for
$t < 0$ (for example a ramp or a bump on the right half only). The panel should report close to 50% even and 50% odd,
and the even and odd parts should be equal for $t > 0$ and opposite for $t < 0$. Then clear again and draw a rising
ramp that passes through the origin, from about $(-2, -1)$ to $(2, +1)$. The even part stays near zero and the signal is
almost entirely odd.

### Assessment

1. **Triangle**, time shift 1 s, probe time 0.5 s: $x(0.5) = 0.75$ and $x(-0.5) = 0.25$. What are $x_e(0.5)$ and $x_o(0.5)$?
   *Answer: $x_e = (0.75 + 0.25)/2 = 0.5$ and $x_o = (0.75 - 0.25)/2 = 0.25$.*
2. Why is $x_o(0) = 0$ for every signal, and what is $x_e(0)$?
   *Answer: at $t = 0$ the two samples $x(t)$ and $x(-t)$ are the same sample, so $x_o(0) = [x(0) - x(0)]/2 = 0$ and $x_e(0) = x(0)$.*
3. A signal is zero for $t < 0$ and has total energy 8 J. How is the energy divided between $x_e$ and $x_o$?
   *Answer: 4 J each. For $t > 0$ both parts equal $x(t)/2$, and each part has the same energy on the negative side by symmetry, so $E_e = E_o = E/2$.*
4. Write $x_e(t)$ and $x_o(t)$ for $x(t) = e^{-t}u(t)$.
   *Answer: $x_e(t) = \tfrac{1}{2}e^{-|t|}$ and $x_o(t) = \tfrac{1}{2}\operatorname{sgn}(t)\,e^{-|t|}$, that is $\tfrac{1}{2}e^{-t}$ for $t > 0$ and $-\tfrac{1}{2}e^{t}$ for $t < 0$.*
5. Can a nonzero signal be both even and odd?
   *Answer: No. If $x(t) = x(-t)$ and $x(t) = -x(-t)$ then $x(t) = -x(t)$, so $x(t) = 0$ everywhere. This is also why the decomposition is unique.*

### Common Misconceptions

**"Every signal is either even or odd."** Most signals are neither. Select the pulse with a time shift of 1 s: both parts are
nonzero and the panel reports 50% even and 50% odd.

**"The even part is the part of the signal for $t > 0$."** Both parts exist for all $t$. With the pulse at a 1 s shift,
$x(-1) = 0$, yet $x_e(-1) = 0.5$ and $x_o(-1) = -0.5$. Each part borrows from the signal at $-t$.

**"Shifting a signal does not change its even and odd parts."** Compare the pulse at shifts of 0 s and 1 s: the odd part
goes from zero to a square wave of height 0.5 (negative for $t < 0$, positive for $t > 0$), and the energy split moves
from 100% / 0% to 50% / 50%.

## References

1. [Even and odd functions](https://en.wikipedia.org/wiki/Even_and_odd_functions) - Wikipedia - definitions of even and odd symmetry and the decomposition of a general function into an even and an odd part
2. [Energy (signal processing)](https://en.wikipedia.org/wiki/Energy_%28signal_processing%29) - Wikipedia - signal energy, used by the energy split in the read-out panel
3. [Fourier series](https://en.wikipedia.org/wiki/Fourier_series) - Wikipedia - the even part of a periodic signal needs only cosine terms and the odd part only sine terms
4. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with a treatment of signal symmetry in the Fourier transform chapters
5. [Chapter 2: Introduction to Signals and Systems](../../chapters/02-introduction-to-signals-and-systems/index.md) - this textbook - the chapter section that uses this MicroSim
6. Oppenheim, A. V., Willsky, A. S., & Nawab, S. H. (1997). *Signals and Systems* (2nd ed.). Prentice Hall. - textbook - Chapter 1 covers even and odd signals and their decomposition (no link)
