---
title: Signal Operations - Shift, Scale and Reverse
description: Transform elementary signals by time shifting, time scaling and time reversal, and track which points of x(t) map to which points of y(t).
image: /sims/signal-operations/signal-operations.png
og:image: /sims/signal-operations/signal-operations.png
twitter:image: /sims/signal-operations/signal-operations.png
social:
   cards: false
quality_score: 95
---

# Signal Operations: Shift, Scale and Reverse

<iframe src="main.html" width="100%" height="660px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/signal-operations/main.html" width="100%" height="660px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

<!-- TODO(user): add the p5.js editor link once the sketch is saved in editor.p5js.org:
[Edit in the p5.js Editor](https://editor.p5js.org/<username>/sketches/signal-operations) -->

## Description

This MicroSim applies the general signal operation

$$y(t) = A\,x\big(a(t - t_0)\big)$$

to an elementary signal chosen from the drop-down list: unit step, unit impulse, rectangular pulse,
triangle, decaying exponential $e^{-t}u(t)$, one period of a sine, or ramp. The gray upper plot shows
the original $x(t)$ and the blue lower plot shows $y(t)$ on the same time axis, with a fixed amplitude
axis so that the gain $A$ is visible.

Three landmark points **P**, **Q** and **R** on $x(t)$ are joined by dashed lines to the places where
they land on $y(t)$. A point at time $t_x$ always lands at

$$t_y = \frac{t_x}{a} + t_0,$$

and the table under the plots lists these times. The **Shift** slider sets $t_0$ (−5 to 5 s), the
**Scale** slider sets $|a|$ (0.25 to 4), **Reverse time** changes $a$ to $-a$, and **Amplitude** sets $A$
(−2 to 2). The blue formula line shows the current transformation and the line below it describes the
correct order of operations: scale about $t = 0$ first, then shift by $t_0$.

**Show the common mistake** adds $z(t) = A\,x(at - t_0)$ in red. Because $x(at - t_0) = x\big(a(t - t_0/a)\big)$,
the mistake shifts the signal by $t_0/a$ instead of $t_0$; hollow squares mark where P, Q and R end up.

**Discrete time (DT)** switches to stem plots on integer $n$. The shift becomes an integer $n_0$ and the
scale becomes $M \in \{2, 3, 4\}$ (decimation $x[Mn]$, which discards samples) or $1/L$ with
$L \in \{2, 3, 4\}$ (expansion $x[n/L]$, which is only defined at multiples of $L$, so zeros are inserted).

This simulation is used in
[Chapter 2: Introduction to Signals and Systems](../../chapters/02-introduction-to-signals-and-systems/index.md).

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Calculate** where a point of $x(t)$ at time $t_x$ appears in $y(t) = A\,x(a(t - t_0))$, using $t_y = t_x/a + t_0$
2. **Distinguish** $x(a(t - t_0))$ from $x(at - t_0)$ and calculate the actual shift $t_0/a$ produced by the second form
3. **Predict** the effect of $a < 0$ (reversal), $|a| > 1$ (compression), $|a| < 1$ (stretching) and $A$ on a signal's shape and position
4. **Explain** why decimation $x[Mn]$ loses samples and why expansion $x[n/L]$ needs inserted zeros or interpolation
5. **Calculate** the area of a time-scaled impulse using $\delta(at) = \delta(t)/|a|$

### Target Audience

Undergraduate students in a first signals and systems course (sophomore or junior engineering,
physics or computer science). Plan 20 minutes for the activities below.

### Prerequisites

- Function notation and graphing of piecewise functions
- The unit step $u(t)$ and unit impulse $\delta(t)$ (Chapter 2)
- The difference between continuous-time $x(t)$ and discrete-time $x[n]$ signals

### Activities

**Activity 1: Scale first, then shift (5 min).** Use the default settings: triangle, $t_0 = 2.00$ s,
$a = 2.00$, $A = 1.00$. Before looking at the table, predict where P ($t_x = 0$), Q ($t_x = 2$) and R
($t_x = 6$) land. The table shows 2.00, 3.00 and 5.00 s, so the triangle that spanned 0 to 6 s now spans
2 to 5 s. Turn on **Show the common mistake**: the red $z(t) = x(2t - 2)$ spans 1 to 4 s
($t_z$ = 1.00, 2.00, 4.00), a shift of $t_0/a = 1.00$ s instead of 2.00 s.

**Activity 2: Reversal (5 min).** Choose the rectangular pulse, set $t_0 = 0$, $a = 1.00$ and check
**Reverse time**. The pulse that spanned 0 to 4 s now spans −4 to 0 s, and P moves from the left edge to
the right edge. Now set $t_0 = 3.00$ s: the pulse spans −1 to 3 s (P at 3.00, Q at 1.00, R at −1.00), so a
positive $t_0$ still moves it to the right. With the mistake shown, $z(t) = x(-t - 3)$ lies between −7 and
−3 s: the mistaken shift is $t_0/a = -3.00$ s, in the wrong direction.

**Activity 3: Scaling that does and does not show (5 min).** Choose the unit step and drag the scale
from 0.25 to 4: the step never changes, because $u(at) = u(t)$ for $a > 0$, yet P and R slide along it.
Choose the unit impulse and set $a = 4.00$, $t_0 = 1.00$ s, $A = 2.00$: the arrow sits at $t = 1$ with area
0.50, because $2\,\delta(4(t - 1)) = 0.5\,\delta(t - 1)$. Choose the ramp with $t_0 = 0$, $A = 1.00$ and
$a = 2.00$: the ramp becomes twice as steep, because $r(2t) = 2\,r(t)$.

**Activity 4: Discrete time (5 min).** Check **Discrete time (DT)**, choose one sine period (8 samples),
set $n_0 = 0$, $A = 1.00$ and $a = 2$. $y[n] = x[2n]$ keeps samples 0, 2, 4 and 6, and the red crosses mark the four
samples that are lost. Set $a = 4$: only $x[0]$ and $x[4]$ survive, both are zero, so $y[n] = 0$ for every
$n$, and the table reports Q and R as lost. Finally choose the rectangular pulse and set $a = 1/2$:
$y[n] = x[n/2]$ equals 1 at $n$ = 0, 2, 4, 6, and every odd $n$ (including 1, 3 and 5, inside the
pulse) holds an inserted zero, drawn as a hollow circle.

### Assessment

1. A triangle has corners at $t$ = 0, 2 and 6 s. Where are they in $y(t) = x(2(t - 2))$?
    *Answer: at 2, 3 and 5 s, from $t_y = t_x/2 + 2$.*
2. A student wants to compress $x(t)$ by 2 and then delay the result by 2 s, and writes $x(2t - 2)$. What
    delay does this actually produce, and what is the correct expression?
    *Answer: $x(2t - 2) = x(2(t - 1))$ is delayed by only 1 s; the correct expression is $x(2(t - 2)) = x(2t - 4)$.*
3. Is $y(t) = x(-t + 3)$ delayed or advanced, and where does the point $t_x = 0$ go?
    *Answer: $x(-t + 3) = x(-(t - 3))$, so $x$ is reversed and then shifted right by 3 s; $t_x = 0$ goes to
    $t_y = 0/(-1) + 3 = 3$ s.*
4. $x[n] = \sin(2\pi n/8)$ for $0 \le n \le 7$ and zero elsewhere. What is $y[n] = x[4n]$?
    *Answer: zero for every $n$: only $x[0] = 0$ and $x[4] = 0$ are kept, and the peak and trough are lost.*
5. What is the area of the impulse $2\,\delta(4t - 4)$, and where is it located?
    *Answer: $2\,\delta(4(t - 1)) = \tfrac{2}{4}\,\delta(t - 1)$, so the area is 0.5 at $t = 1$.*

### Common Misconceptions

**"$x(at - t_0)$ is $x(at)$ delayed by $t_0$."** The red mistake curve shows that $x(at - t_0)$ is
$x(at)$ delayed by $t_0/a$. With $a = 2$ and $t_0 = 2$ s the red curve lands 1 s to the left of the
blue one, and with reversal ($a = -1$) it moves in the opposite direction.

**"$x[n/2]$ stretches a sequence just as $x(t/2)$ stretches a waveform."** In DT mode the hollow circles show
that $x[n/2]$ does not exist at odd $n$; the sim inserts zeros there. Filling those positions smoothly
requires interpolation, and the samples discarded by $x[2n]$ cannot be recovered at all.

## References

1. [Heaviside step function](https://en.wikipedia.org/wiki/Heaviside_step_function) - Wikipedia - definition of the unit step $u(t)$ and its use to switch signals on
2. [Dirac delta function](https://en.wikipedia.org/wiki/Dirac_delta_function) - Wikipedia - the unit impulse and its scaling property $\delta(at) = \delta(t)/|a|$
3. [Ramp function](https://en.wikipedia.org/wiki/Ramp_function) - Wikipedia - the ramp $r(t) = t\,u(t)$ as the integral of the unit step
4. [Downsampling (signal processing)](https://en.wikipedia.org/wiki/Downsampling_%28signal_processing%29) - Wikipedia - decimation $x[Mn]$ and the information it discards
5. [Upsampling](https://en.wikipedia.org/wiki/Upsampling) - Wikipedia - zero insertion followed by interpolation filtering, the proper version of $x[n/L]$
6. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook covering signals, sampling and multirate basics
