---
title: DFT Explorer
description: Build each DFT value X[k] by multiplying x[n] by a rotating phasor and adding the products head to tail, then rebuild x[n] from the bins you keep.
image: /sims/dft-explorer/dft-explorer.png
og:image: /sims/dft-explorer/dft-explorer.png
twitter:image: /sims/dft-explorer/dft-explorer.png
social:
   cards: false
quality_score: 90
---

# DFT Explorer: Probing a Signal with Rotating Phasors

<iframe src="main.html" width="100%" height="744px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/dft-explorer/main.html" width="100%" height="744px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

<!-- TODO(user): add the p5.js editor link once the sketch is saved in editor.p5js.org:
[Edit in the p5.js Editor](https://editor.p5js.org/<username>/sketches/dft-explorer) -->

## Description

The discrete Fourier transform

$$X[k] = \sum_{n=0}^{N-1} x[n]\,e^{-j2\pi kn/N}$$

is a sum of $N$ complex numbers, and this MicroSim draws every one of them. The signal $x[n]$ (blue stems)
is the sum of up to three sinusoids at whole-number bins $m$. Each drop-down list picks a cosine
($m = 0 \ldots N/2$) or a sine ($m = 1 \ldots N/2-1$), and each slider sets its amplitude $A$ (0 to 2).
The **Bin k** slider chooses the probing frequency, and **N** sets the length to 8, 16 or 32.

The unit circle shows the phasor $e^{-j2\pi kn/N}$ for every $n$. It turns clockwise by $360^\circ\,k/N$ per
sample, and samples that land on the same point share a label. On screens at least 600 px wide, a panel
below the signal plots its real part $\cos(2\pi kn/N)$ and imaginary part $-\sin(2\pi kn/N)$.

The **Running sum** plane places the products $x[n]\,e^{-j2\pi kn/N}$ head to tail (green). The maroon arrow
from the origin to the end of the chain is $X[k]$, and its length is the highlighted bar of the magnitude
spectrum $|X[k]|$. When $k$ matches a frequency in the signal, the products keep pointing the same way and
add up. When it does not, they wind around into a closed loop and $X[k] = 0$. **Animate** adds the products
one sample at a time; **Step** adds one per click and starts again at $n = 0$ after a finished sum.
Clicking a bar selects that bin.

**Inverse DFT** rebuilds the signal from the bins you keep,
$x_r[n] = \frac{1}{N}\sum_{k\ \text{kept}} X[k]\,e^{+j2\pi kn/N}$, and draws its real part as maroon rings.
Click bars to remove or restore bins. The sim shows the error $e[n] = x[n] - \mathrm{Re}\,x_r[n]$, the
fraction of the energy kept, and a warning when $x_r[n]$ is complex.

This simulation is used in
[Chapter 6: Fourier Analysis Fundamentals](../../chapters/06-fourier-analysis-fundamentals/index.md#discrete-fourier-transform).

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Explain** how $X[k]$ is formed by multiplying each sample $x[n]$ by a phasor that turns $k/N$ of a revolution per sample and adding the products
2. **Predict** the non-zero DFT values of a sum of whole-bin sinusoids: $AN/2$ at bins $m$ and $N - m$, or $AN$ when $m = 0$ or $m = N/2$
3. **Distinguish** a matching bin, where the products line up and add, from a non-matching bin, where they close into a loop, and relate this to the orthogonality of the DFT phasors
4. **Interpret** the phase of $X[k]$: a cosine gives a real $X[m]$ and a sine gives $X[m] = -jAN/2$
5. **Analyze** an inverse DFT built from a subset of bins by predicting its error and energy, and explain why bins $k$ and $N - k$ must be kept together for a real result

### Target Audience

Undergraduate students in a first digital signal processing or signals and systems course
(sophomore or junior engineering, physics or computer science). Plan 25 minutes for the activities below.

### Prerequisites

- Complex numbers in polar form and Euler's formula $e^{j\theta} = \cos\theta + j\sin\theta$
- Discrete-time sinusoids such as $\cos(2\pi mn/N)$
- Summation notation

### Activities

**Activity 1: Products that add up and products that cancel (7 min).** Start from the defaults: $N = 16$,
$x[n] = \cos(2\pi\cdot 2n/16) + 0.5\cos(2\pi\cdot 5n/16)$ and $k = 2$. The green products march to the right
and the arrow ends at $X[2] = 8.00 + j0.00$ ("the products add up"). Move $k$ to 3: the chain closes into a
loop and the read-out shows $X[3] = 0.00 + j0.00$ ("the products cancel"). Sweep $k$ from 0 to 15 and list the
non-zero bins: $X[2] = X[14] = 8.00$ and $X[5] = X[11] = 4.00$. Check them against $AN/2$: $1 \times 16/2 = 8$
and $0.5 \times 16/2 = 4$.

**Activity 2: One sample at a time (6 min).** With $k = 2$, press **Step** and watch the gold point on the
unit circle move $-45.0^\circ$ per sample. After $n = 0$ the partial sum is $1.50 + j0.00$, which is just
$x[0]$ because the phasor starts at 1. After $n = 0\ldots3$ it is $2.04 + j0.16$, after $n = 0\ldots7$ it is
$4.50 + j0.32$, and after all 16 samples it is $8.00 + j0.00$. The highlighted spectrum bar grows toward its
dashed final height. Once the sum is complete, set $k = 3$ and press **Animate**: the bar rises and then falls
back to zero as the chain closes.

**Activity 3: Phase, negative frequencies and special bins (6 min).** Set $A_3 = 1.00$ (component 3 is
$\sin(2\pi\cdot 3n/16)$) and $k = 3$. The arrow points straight down: $X[3] = 0.00 - j8.00$, phase
$-90.0^\circ$. Move to $k = 13$: $X[13] = 0.00 + j8.00$, phase $90.0^\circ$, and the circle reports
$-292.5^\circ$ per sample $= +67.5^\circ$, a counter-clockwise turn: bins above $N/2$ are negative frequencies.
Set $A_3$ back to 0 and $A_2$ to 0, choose "cos, m = 8" for component 1 and set $k = 8$. Now $x[n] = (-1)^n$
and $X[8] = 16.00$, not 8: bins $m$ and $N - m$ are the same bin. Choosing "cos, m = 0" with $k = 0$ also gives
$X[0] = 16.00$.

**Activity 4: Rebuilding the signal (6 min).** Reload the page to restore the defaults and check
**Inverse DFT**. With all 16 bins kept, the rings sit on the stems: max $|e[n]| = 0.000$ and energy kept
100.0%. Click bars 5 and 11 to remove them: the rings follow $\cos(2\pi\cdot 2n/16)$ alone,
max $|e[n]| = 0.500$ and energy kept 80.0%. Click bar 5 to restore it while bar 11 stays removed: the warning
reports that $x_r[n]$ is complex (max $|\mathrm{Im}| = 0.250$), max $|e[n]| = 0.250$ and energy kept 90.0%.

### Assessment

1. With $N = 16$, what are the DFT values of $x[n] = 2\cos(2\pi\cdot 3n/16)$?
    *Answer: $X[3] = X[13] = AN/2 = 2 \times 16/2 = 16$, and every other bin is 0.*
2. For the default signal, $X[3] = 0$ although $x[n]$ is not zero. Why exactly zero?
    *Answer: multiplied by the probing phasor, each cosine becomes two phasors that make $m - k$ and $m + k$
    whole turns over the $N$ samples, and $\sum_n e^{j2\pi qn/N} = 0$ for any whole $q$ that is not a multiple
    of $N$. For $k = 3$ the turn counts are $-1$ and 5 (from $m = 2$) and 2 and 8 (from $m = 5$), so every part
    sums to zero and the chain returns to the origin.*
3. Why does $x[n] = \cos(\pi n)$ with $N = 16$ give $X[8] = 16$ instead of $N/2 = 8$?
    *Answer: here $m = N/2 = 8$, so bins $m$ and $N - m$ are the same bin and both halves of the cosine land
    in it: $X[8] = AN = 16$.*
4. What is $X[3]$ for $x[n] = \sin(2\pi\cdot 3n/16)$, and what does its phase mean?
    *Answer: $X[3] = -j8$, phase $-90^\circ$: a sine is a cosine delayed by a quarter cycle. The mirror bin is
    $X[13] = +j8$.*
5. In Inverse DFT mode with the default signal, you remove bins 2 and 14 and keep the rest. Predict the
    largest error and the energy kept.
    *Answer: $x_r[n] = 0.5\cos(2\pi\cdot 5n/16)$ and $e[n] = \cos(2\pi\cdot 2n/16)$, so max $|e[n]| = 1.000$; the
    energy kept is $(4^2 + 4^2)/(8^2 + 8^2 + 4^2 + 4^2) = 32/160 = 20.0\%$.*

### Common Misconceptions

**"A cosine at bin $m$ makes one spike at $m$."** The spectrum always shows two bars, at $m$ and $N - m$, each
$AN/2$ tall. At $k = N - m$ the unit circle turns counter-clockwise, which is the negative-frequency half of
$\cos\theta = (e^{j\theta} + e^{-j\theta})/2$. Removing only one of the pair in Inverse DFT mode makes
$x_r[n]$ complex, and the sim warns you.

**"If $k$ does not match, $X[k]$ is small but not zero."** For whole-bin sinusoids the chain closes exactly
and the read-out shows $0.00 + j0.00$. Non-zero values between peaks (spectral leakage) appear only when a
frequency falls between bins, which this MicroSim does not generate.

## References

1. [Discrete Fourier transform](https://en.wikipedia.org/wiki/Discrete_Fourier_transform) - Wikipedia - definition of $X[k]$ and the inverse DFT, with the orthogonality of the basis phasors
2. [Root of unity](https://en.wikipedia.org/wiki/Root_of_unity) - Wikipedia - the points $e^{-j2\pi kn/N}$ on the unit circle are $N$-th roots of unity
3. [Euler's formula](https://en.wikipedia.org/wiki/Euler%27s_formula) - Wikipedia - why a cosine is the sum of two counter-rotating phasors
4. [Negative frequency](https://en.wikipedia.org/wiki/Negative_frequency) - Wikipedia - why bins above $N/2$ mirror the positive frequencies of a real signal
5. [Parseval's theorem](https://en.wikipedia.org/wiki/Parseval%27s_theorem) - Wikipedia - the energy-kept read-out in Inverse DFT mode
6. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on the DFT and its properties
