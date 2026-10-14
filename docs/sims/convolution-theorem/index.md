---
title: Convolution Theorem and Circular Convolution
description: Compare linear convolution with L-point circular convolution computed as IDFT(DFT(x)·DFT(h)), and watch the tail wrap around when L < N + M − 1.
image: /sims/convolution-theorem/convolution-theorem.png
og:image: /sims/convolution-theorem/convolution-theorem.png
twitter:image: /sims/convolution-theorem/convolution-theorem.png
social:
   cards: false
quality_score: 100
---

# Convolution Theorem and Circular Convolution

<iframe src="main.html" width="100%" height="744px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/convolution-theorem/main.html" width="100%" height="744px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

<!-- TODO(user): add the p5.js editor link once the sketch is saved in editor.p5js.org:
[Edit in the p5.js Editor](https://editor.p5js.org/<username>/sketches/convolution-theorem) -->

## Description

This MicroSim tests the convolution theorem for the discrete Fourier transform (DFT). The drop-down lists choose
an input $x[n]$ and an impulse response $h[n]$: rectangle, triangle, exponential $0.8^n$, alternating $(-1)^n$,
a fixed random sequence, the impulse $\delta[n]$, or a delayed impulse (a single 1 at the last sample). The
**N** and **M** sliders set their lengths (1 to 16), and the **Transform length L** slider sets the DFT length,
from $\max(N, M)$ to 64. Both sequences are zero-padded to $L$ samples.

The panels, from top to bottom:

- $x[n]$ (blue) and $h[n]$ (purple)
- the linear convolution $y[n] = \sum_k x[k]\,h[n-k]$ (green), with $N + M - 1$ samples
- the $L$-point circular convolution $y_c[n]$ (teal), with gold rings for $\mathrm{IDFT}_L\{X[k]H[k]\}$
- the error $e[n] = y_c[n] - y[n]$ (red)
- the magnitudes $|X[k]|$, $|H[k]|$ and $|Y[k]|$; point at a bin to read its values

Because the DFT treats each sequence as one period of a periodic signal, $X[k]H[k]$ is the DFT of the
circular convolution

$$y_c[n] = \sum_{m} y[n + mL], \qquad 0 \le n < L .$$

When $L < N + M - 1$, the samples of $y$ at $n \ge L$ (red) do not fit in $L$ samples: the arrows show them
wrapping to $n - L$ and adding to the samples there (**time aliasing**). The read-outs give the required length,
the maximum error, and whether circular equals linear, which holds whenever $L \ge N + M - 1$. The spectra are
scaled by $\max|X|$, $\max|H|$ and $\max|X|\cdot\max|H|$, so each maroon stem is the blue height times the
purple height.

This MicroSim is used in [Chapter 4: Convolution and Correlation](../../chapters/04-convolution-and-correlation/index.md).

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Calculate** the length $N + M - 1$ of a linear convolution and the smallest DFT length $L$ for which $\mathrm{IDFT}_L\{X[k]H[k]\}$ equals it
2. **Explain** circular convolution as linear convolution with its tail wrapped around, $y_c[n] = \sum_m y[n + mL]$, and identify the time-aliased samples when $L < N + M - 1$
3. **Verify** the convolution theorem $Y[k] = X[k]H[k]$ by comparing the DFT route with the wrap-around sum and by reading $|X[k]|$, $|H[k]|$ and $|Y[k]|$ at one bin
4. **Evaluate** whether a transform length $L$ is adequate for a given pair of sequences, including cases where the wrapped samples happen to be zero
5. **Predict** that a delay becomes a circular shift (rotation) when $L$ is too short

### Target Audience

Undergraduate students in a signals and systems or digital signal processing course (typically junior year).
Plan 25 minutes for the activities below.

### Prerequisites

- The convolution sum $y[n] = \sum_k x[k]\,h[n-k]$
- The definition of the DFT and its inverse
- Magnitude of a complex number

### Activities

**Activity 1: Watch the tail wrap around (6 min).** Start with the defaults: triangle $x$ with $N = 8$
(samples 1, 2, 3, 4, 4, 3, 2, 1), rectangle $h$ with $M = 4$, and $L = 8$. The read-out says that
$L \ge 8 + 4 - 1 = 11$ is required. The linear result is 1, 3, 6, 10, 13, 14, 13, 10, 6, 3, 1. Its last three
samples (6, 3 and 1, in red) wrap to $n$ = 0, 1 and 2, so $y_c$ = 7, 6, 7, 10, 13, 14, 13, 10 and the labels read
1+6=7, 3+3=6 and 6+1=7. The error panel shows +6, +3, +1 at the start and −6, −3, −1 at $n$ = 8 to 10, so the
maximum error is 6. Now raise $L$ one step at a time: at $L = 9$ the maximum error is 3, at $L = 10$ it is 1, and
at $L = 11$ the status line turns green with a maximum error of 0. At $L = 16$ the error is still 0; the extra
samples are zeros.

**Activity 2: The theorem in the frequency domain (6 min).** Return to $L = 8$. The gold rings sit on every
circular sample, the red ones included, even though the result is wrong: the circular-panel legend reports
that the two routes differ by 1.8e−15, which is rounding error. Point at bin $k = 0$: the read-out shows $|X[0]| = 20.00$,
$|H[0]| = 4.00$ and $|Y[0]| = 80.00$, the sums of $x$, $h$ and $y_c$. Now choose the exponential for $x$ and
point at $k = 2$: $|X[2]| = 0.65$ but $|H[2]| = 0.00$, so $|Y[2]| = 0.00$. A 4-sample rectangle padded to 8
samples has zeros at $k$ = 2, 4 and 6, and the product inherits every zero.

**Activity 3: A delay becomes a rotation (5 min).** Choose the triangle for $x$ ($N = 8$) and the delayed
impulse for $h$ ($M = 4$, so $h[n] = \delta[n-3]$), with $L = 8$. The linear result is $x$ delayed by three
samples (0, 0, 0, 1, 2, 3, 4, 4, 3, 2, 1), but the circular result is 3, 2, 1, 1, 2, 3, 4, 4: the last three
samples have come around to the front, so the maximum error is 3. In the spectrum every purple stem has
$|H[k]| = 1$, because a delay changes only the phase, and the maroon stems match the blue ones. Set $L = 11$
and the circular result becomes the true delay.

**Activity 4: What the length rule really requires (5 min).** Choose the impulse $\delta[n]$ for $x$ ($N = 8$)
and the rectangle for $h$ ($M = 4$) with $L = 8$. The required length is still 11, but the status line is
green: the three samples that wrap are all 0. Next choose the rectangle for both sequences with $N = M = 16$:
the required length is 31. At $L = 16$ every circular sample equals 16 and the maximum error is 15. At
$L = 30$ only $y[30] = 1$ wraps, so $y_c[0] = 1 + 1 = 2$ and the maximum error is 1. At $L = 31$, or at the
FFT-friendly $L = 32$, the error is 0.

### Assessment

1. $x[n]$ has 12 samples and $h[n]$ has 5. What is the smallest $L$ for which $\mathrm{IDFT}_L\{X[k]H[k]\}$ equals the linear convolution, and what goes wrong at one less?
    *Answer: $L = 12 + 5 - 1 = 16$. At $L = 15$ the last sample $y[15]$ wraps onto $y_c[0]$ (with the triangle and rectangle the sim shows a maximum error of 1).*
2. With the default settings (triangle $N = 8$, rectangle $M = 4$, $L = 8$), compute $y_c[1]$ by hand.
    *Answer: $y_c[1] = y[1] + y[9] = 3 + 3 = 6$.*
3. If $L = N + M - 2$, how many samples of the circular result are wrong?
    *Answer: one. Only $y[N + M - 2]$ wraps, so $y_c[0]$ is too large by that amount and the last linear sample is missing (with the defaults and $L = 10$: $y_c[0] = 1 + 1 = 2$).*
4. The gold rings always land on the circular result, even when the error panel is red. What does this show?
    *Answer: the product of two $L$-point DFTs is always exactly the DFT of the circular convolution, for every $L$. The theorem never fails; what fails for short $L$ is the assumption that circular convolution equals linear convolution.*
5. With the 4-sample rectangle and $L = 8$, $|H[2]| = 0$. What is $|Y[2]|$ for any input $x$, and why?
    *Answer: 0, because $Y[k] = X[k]H[k]$ and a zero of either factor is a zero of the product.*

### Common Misconceptions

**"Multiplying two FFTs gives the convolution."** It gives the *circular* convolution. With the defaults and
$L = 8$ the gold rings agree with the wrap-around sum to about $10^{-15}$, yet the error panel shows a maximum
error of 6 against the linear result. The two agree only when $L \ge N + M - 1$.

**"Extra zero padding changes the answer."** Compare $L = 11$, $L = 16$ and $L = 64$ with the defaults: the
same 11 samples appear, followed by zeros, and the maximum error stays 0. More padding only samples the
spectrum at more frequencies; it does not change $y[n]$.

## References

1. [Circular convolution](https://en.wikipedia.org/wiki/Circular_convolution) - Wikipedia - definition of circular convolution and its relation to periodic summation of the linear result
2. [Convolution theorem](https://en.wikipedia.org/wiki/Convolution_theorem) - Wikipedia - convolution in time corresponds to multiplication of transforms, including the DFT form
3. [Discrete Fourier transform](https://en.wikipedia.org/wiki/Discrete_Fourier_transform) - Wikipedia - the DFT, its periodicity, and the circular convolution theorem
4. [Overlap-add method](https://en.wikipedia.org/wiki/Overlap-add_method) - Wikipedia - how zero padding to $L \ge N + M - 1$ lets FFTs filter long signals block by block
5. [Chapter 18: FFT Convolution](https://www.dspguide.com/ch18.htm) - Steven W. Smith, The Scientist and Engineer's Guide to Digital Signal Processing - free chapter on computing convolution with the FFT and the overlap-add method
