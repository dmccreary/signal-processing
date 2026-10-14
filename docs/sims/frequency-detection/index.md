---
title: Frequency Detection
description: A winding machine wraps a sine wave around a spinning circle; the center of mass of the wound curve reveals the signal frequency, as the Fourier transform does.
image: /sims/frequency-detection/frequency-detection.png
og:image: /sims/frequency-detection/frequency-detection.png
twitter:image: /sims/frequency-detection/frequency-detection.png
social:
   cards: false
quality_score: 100
---

# Frequency Detection

<iframe src="main.html" width="100%" height="597px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/frequency-detection/main.html" width="100%" height="597px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

<!-- TODO(user): add the p5.js editor link once the sketch is saved in editor.p5js.org:
[Edit in the p5.js Editor](https://editor.p5js.org/<username>/sketches/frequency-detection) -->

## Description

This MicroSim builds the Fourier transform from one idea: wrap a signal around a spinning circle and see where
its center of mass lands. A sine wave with period $T_s$ (the shaded curve in the **Cartesian Coordinates**
graph; its left edge is "now") is sampled and wound onto the **Polar** plot. Each sample becomes a point whose
distance from the center is the sample value and whose angle makes one full turn every circle period $T_c$. The
**Center of Mass** panel repeats the wound curve, marks the average of all its points with a yellow dot, and
prints that dot's distance from the center as $|\text{COM}|$.

- **Circle period** (0.10–2.00 s) sets $T_c$. The blue marker shows $T_c$ on both graphs, which span 0–2 s; the blue lines in the Cartesian graph mark each completed turn.
- **Signal period** (0.1–1.0 s) sets $T_s$. **Resolution** (10–300 points/s) is the sampling rate. **Speed** scales simulated time.
- **AutoPoll** sweeps $T_c$ from 0.10 to 2.00 s in 0.05 s steps at 20× speed. It records each strength once it stops changing; press it again to stop. **Show Spin** rotates the drawing instead of the pen.

The **Frequency Strength** graph plots $|\text{COM}|$ against $T_c$, and its header names the strongest period
and its frequency $f_c = 1/T_c$. With $t_n = n/R$ for resolution $R$, the simulation computes

$$|\text{COM}(T_c)| = \left|\frac{1}{M}\sum_{n=0}^{M-1} x(t_n)\,e^{-i2\pi f_c t_n}\right|,$$

a sampled, averaged form of the Fourier transform $X(f) = \int x(t)\,e^{-i2\pi f t}\,dt$ at $f = f_c$. For
$x(t) = \sin(2\pi t/T_s)$ it settles at $1/2$ when $T_c = T_s$ and falls to zero otherwise.

This MicroSim supports [Chapter 6: Fourier Analysis Fundamentals](../../chapters/06-fourier-analysis-fundamentals/index.md#fourier-transform).

## Lesson Plan

### Learning Objectives

By the end of this lesson, students will be able to:

1. **Explain** how winding a signal around a spinning circle turns it into a center of mass whose distance from the origin measures the strength of one frequency
2. **Predict** that the center of mass stays about 0.5 from the origin only when the circle period equals the signal period, and keeps returning to the origin otherwise
3. **Interpret** the AutoPoll frequency-strength graph to find the period and frequency of a sine wave
4. **Relate** the center-of-mass average to the Fourier transform integral $X(f) = \int x(t)e^{-i2\pi f t}\,dt$
5. **Identify** an alias peak caused by a low resolution (sampling rate) and compute where it appears

### Target Audience

College undergraduates in a first signals and systems course, after complex numbers and before the discrete
Fourier transform. Plan 20–30 minutes.

### Prerequisites

- Complex numbers in polar form and Euler's formula $e^{i\theta} = \cos\theta + i\sin\theta$
- Period and frequency of a sinusoid, $f = 1/T$
- The center of mass (average position) of a set of points

### Activities

**Activity 1: A mismatched winding (5 min).** Keep the defaults ($T_s$ = 0.50 s, $T_c$ = 0.30 s, Resolution
300, Speed 1.00x) and press **Play**. The wound curve becomes a three-lobed rose that is balanced around the
center. $|\text{COM}|$ is about 0.15 after 0.5 s and 0.08 after 1 s, then returns to 0.000 at 1.5 s, the first time
that both 3 signal periods and 5 turns of the circle are complete. It returns to zero every 1.5 s after that.

**Activity 2: A matched winding (5 min).** Press **Reset**, set the circle period to **0.50 s** and press Play.
The positive and the negative half of every cycle now land on the same side of the center (a negative
radius flips a point to the opposite side), so the curve is a single circle that passes through the center. $|\text{COM}|$ settles at 0.50 (0.498 after 1 s). Now set $T_c$ = **1.00 s**.
The curve becomes a four-petal rose, and $|\text{COM}|$ is back to 0.000 after every whole second. Check
**Show Spin**: the red dot on the polar plot now moves straight up and down in step with the red dot at the left
edge of the Cartesian graph.

**Activity 3: Detect the frequency (8 min).** Press **Reset**, then **AutoPoll**, and wait for the sweep to
reach 2.00 s (about 13 s). One stem stands out at 0.50 s with a strength of about 0.51, and the header reads
*0.50 s = 2.00 Hz*. Its neighbors at 0.45 s and 0.55 s reach only about 0.11, and the rest stay below about 0.1.
Set the signal period to **0.8 s** and run AutoPoll again (about 22 s): the peak moves to 0.80 s, which is 1.25 Hz.

**Activity 4: An alias (7 min).** Set Resolution to **10 pts/s** and the signal period to **0.3 s**, so a
3.33 Hz sine is sampled only 3 times per period (the Cartesian graph shows a jagged three-point wave). Run
AutoPoll. Two stems of about 0.5 appear: at 0.30 s (3.33 Hz) and at 0.15 s (6.67 Hz). They are equally strong,
so the header may name either one. The 0.15 s stem is an
alias at $f_s - f = 10 - 3.33 = 6.67$ Hz. At 10 samples per second, winding at 6.67 Hz cannot be told apart
from winding at $-3.33$ Hz.

### Assessment

1. A sine wave is wound with $T_c = T_s$. Where does its center of mass end up, and why? *(Answer: about 0.5 from the center. Each turn of the circle covers exactly one cycle, and the negative radius flips the other half-cycle onto the same side of the center, so nothing cancels. The wound curve is a single circle through the center whose center of mass is 0.5 away.)*
2. AutoPoll shows a single peak at $T_c$ = 0.25 s. What is the frequency of the signal? *(Answer: $f = 1/0.25\ \text{s} = 4$ Hz.)*
3. With $T_s$ = 0.5 s and $T_c$ = 0.3 s, why does $|\text{COM}|$ return to exactly zero every 1.5 s? *(Answer: 1.5 s is the least common multiple of the two periods. It holds 3 whole signal periods and 5 whole turns, and over such a span the sum of $\sin(2\pi t/T_s)\,e^{-i2\pi t/T_c}$ is zero whenever $1/T_c \ne 1/T_s$ (and no alias is involved). This is the orthogonality of sinusoids.)*
4. Explain why the AutoPoll stems at 0.45 s and 0.55 s are not zero when the signal period is 0.5 s. *(Answer: AutoPoll watches each $T_c$ for only a few signal periods. At $T_c$ = 0.55 s, $|\text{COM}|$ is still 0.49 after 1 s and 0.30 after 3 s, and reaches 0 only at 5.5 s, so nearby frequencies need a long observation to tell apart. This is spectral leakage, and frequency resolution is about $1/T$ for observation time $T$.)*
5. At Resolution 10 pts/s, a 3.33 Hz signal produces a second peak at $T_c$ = 0.15 s. Explain it. *(Answer: sampling at $f_s$ = 10 Hz makes winding at 6.67 Hz identical to winding at $6.67 - 10 = -3.33$ Hz. A real sine has a component at $-3.33$ Hz, so the alias appears at $1/6.67 = 0.15$ s.)*

### Common Misconceptions

**"The horizontal axis of the strength graph is frequency."** It is the circle period $T_c$, so frequency
$f_c = 1/T_c$ *decreases* to the right. The header converts the peak to hertz (0.50 s = 2.00 Hz). Compare
the 0.80 s peak in Activity 3 with the 0.50 s peak: the slower signal appears farther right.

**"Only the exact matching period gives a large center of mass."** Close periods look matched for a while.
Set $T_s$ = 0.5 s and $T_c$ = 0.55 s and press Play: $|\text{COM}|$ starts near 0.49 and decays only slowly
(0.42 at 2 s, 0.17 at 4 s), reaching zero at 5.5 s. Telling close frequencies apart takes a long
observation.

## References

1. [Fourier transform](https://en.wikipedia.org/wiki/Fourier_transform) - Wikipedia - the integral $X(f) = \int x(t)e^{-i2\pi ft}\,dt$ that the winding average approximates
2. [But what is the Fourier Transform? A visual introduction](https://www.3blue1brown.com/lessons/fourier-transforms) - 3Blue1Brown (Grant Sanderson) - the "winding machine" and center-of-mass picture this MicroSim animates
3. [Center of mass](https://en.wikipedia.org/wiki/Center_of_mass) - Wikipedia - the average position shown by the yellow dot
4. [Aliasing](https://en.wikipedia.org/wiki/Aliasing) - Wikipedia - why a low resolution produces the extra peak in Activity 4
5. [Rose (mathematics)](https://en.wikipedia.org/wiki/Rose_%28mathematics%29) - Wikipedia - the petal curves $r = \sin(k\theta)$ traced when $T_c/T_s = k$
6. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free textbook with chapters on the DFT and spectral leakage
