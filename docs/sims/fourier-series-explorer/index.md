---
title: Fourier Series Explorer
description: Build square, triangle, sawtooth, pulse-train and hand-drawn periodic waveforms from their first N harmonics, and read the coefficients, amplitude spectrum and phase spectrum of the Fourier series.
image: /sims/fourier-series-explorer/fourier-series-explorer.png
og:image: /sims/fourier-series-explorer/fourier-series-explorer.png
twitter:image: /sims/fourier-series-explorer/fourier-series-explorer.png
social:
   cards: false
quality_score: 100
---

# Fourier Series Explorer

<iframe src="main.html" height="627px" width="100%" scrolling="no"></iframe>

[Run the Fourier Series Explorer MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit in the p5.js Editor](https://editor.p5js.org/)

## About This MicroSim

A periodic signal with period $T$ can be written as a sum of sinusoids at whole-number multiples of the
fundamental frequency $f_0 = 1/T$:

$$x(t) = a_0 + \sum_{n=1}^{\infty}\left[a_n\cos(n\omega_0 t) + b_n\sin(n\omega_0 t)\right], \qquad \omega_0 = \frac{2\pi}{T}$$

This MicroSim keeps only the first $N$ harmonics and draws that partial sum (red) on top of the waveform (grey)
over two periods. The three plots are:

1. **Time plot**: the waveform, the partial sum, and in orange the single harmonic that is currently selected.
2. **Magnitude spectrum**: the amplitude $\sqrt{a_n^2 + b_n^2} = 2\lvert c_n\rvert$ of each harmonic. Bar 0 is the DC term $a_0$.
3. **Phase spectrum**: the angle of the complex coefficient $c_n = (a_n - jb_n)/2$. No stem is drawn for a harmonic whose amplitude is zero.

Bars in colour are included in the sum. Pale bars are harmonics above $N$.

The coefficients of the four standard waveforms (amplitude from $-1$ to $+1$, except the pulse train which goes from 0 to 1) are:

| Waveform | $a_0$ | $a_n$ | $b_n$ | Amplitudes fall as |
|----------|-------|-------|-------|--------------------|
| Square | 0 | 0 | $\dfrac{4}{\pi n}$ for odd $n$, 0 for even $n$ | $1/n$ |
| Triangle | 0 | 0 | $\dfrac{8}{\pi^2 n^2}(-1)^{(n-1)/2}$ for odd $n$, 0 for even $n$ | $1/n^2$ |
| Sawtooth | 0 | 0 | $\dfrac{2}{\pi n}(-1)^{n+1}$ | $1/n$ |
| Pulse train, duty cycle $d = 0.25$ | $d$ | $\dfrac{2}{\pi n}\sin(\pi n d)$ | 0 | $1/n$ with a sinc-shaped envelope |

The **custom** waveform starts as a half-wave rectified sine. Drag in the time plot to draw one period of your own.
Its coefficients are found by evaluating the coefficient integrals numerically over 512 samples of the curve you drew.

**Convergence and the Gibbs phenomenon.** The banner reports the rms error between the waveform and the partial sum.
For waveforms with a jump it also reports how far the highest peak of the partial sum overshoots the waveform.
Adding harmonics makes the ripple narrower but not lower: the overshoot settles at about 9% of the jump height
however many harmonics are used. The triangle wave has no jump, so its series converges quickly and without overshoot.

## How to Use

1. Pick a **Waveform**. Press **Step >** to add one harmonic at a time, or **Play** to add them automatically (Play starts paused).
2. Move the mouse over a bar to select that harmonic. Its sinusoid is drawn in orange and its coefficients are listed under the time plot.
3. Click a bar to switch that harmonic off and on again, and see what it contributes to the shape.
4. Tick **Show individual harmonics** to draw every sinusoid in the sum.
5. Tick **Show aₙ and bₙ** to replace the magnitude and phase plots with bar charts of the cosine and sine coefficients.
6. **Reset** returns to five harmonics, switches every harmonic back on and restores the default custom waveform.

## Iframe Embed Code

You can add this MicroSim to any web page by adding this to your HTML:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/fourier-series-explorer/main.html"
        height="627px"
        width="100%"
        scrolling="no"></iframe>
```

## Lesson Plan

### Learning Objectives

By the end of this activity, students will be able to:

1. **Explain** a Fourier series as a sum of harmonics of the fundamental frequency.
2. **Compare** the harmonic content of square, triangle, sawtooth and pulse waveforms.
3. **Describe** how the partial sum converges as harmonics are added, and what the Gibbs phenomenon is.
4. **Relate** the coefficients $a_n$ and $b_n$ to the amplitude and phase of each harmonic.

### Grade Level

Undergraduate (signals and systems)

### Duration

20-25 minutes

### Prerequisites

- Sinusoids: amplitude, frequency and phase
- Even and odd functions
- Complex numbers in polar form

### Activities

1. **Exploration** (5 min): Choose the square wave and set $N = 1$. Step up to $N = 9$ one harmonic at a time.
   Which steps change the picture and which do not? Why?
2. **Guided Practice** (15 min):
    - For the square wave, read $b_1$, $b_3$ and $b_5$ from the readout and check them against $4/(\pi n)$
      (1.2732, 0.4244 and 0.2546).
    - Record the overshoot at $N = 1, 3, 5, 9, 21$ and $50$ (13.7%, 10.0%, 9.4%, 9.1%, 9.0% and 9.0%).
      Does it go to zero? What does shrink as $N$ grows?
    - Switch to the triangle wave with $N = 5$. Compare its rms error (about 0.016) with the square wave at $N = 5$ (about 0.26).
      Use the rate at which the amplitudes fall to explain the difference.
    - For the sawtooth, look at the phase spectrum. Why do the phases alternate between $-90°$ and $+90°$?
    - For the pulse train, which harmonics are missing? Relate the answer to the 25% duty cycle.
    - Choose the custom waveform. Before drawing anything, read $a_0$, $b_1$ and $a_2$ (0.3183, 0.5 and −0.2122) and
      check them against $1/\pi$, $1/2$ and $-2/(3\pi)$, the known results for a half-wave rectified sine.
3. **Discussion** (5 min): The square wave and the pulse train have only sine or only cosine terms. What symmetry of each
   waveform explains that? Draw a custom waveform that needs both.

### Assessment

- Student states which harmonics are present in a square wave and how their amplitudes fall with $n$.
- Student explains why the overshoot near a jump does not disappear as more harmonics are added.
- Student predicts whether a given waveform has cosine terms, sine terms or both from its symmetry.

## References

1. Oppenheim, A. V., Willsky, A. S., & Nawab, S. H. (1997). *Signals and Systems* (2nd ed.). Prentice Hall. Chapter 3 covers the Fourier series of periodic signals.
2. [Fourier series](https://en.wikipedia.org/wiki/Fourier_series) and [Gibbs phenomenon](https://en.wikipedia.org/wiki/Gibbs_phenomenon), Wikipedia.
3. [Chapter 6: Fourier Analysis Fundamentals](../../chapters/06-fourier-analysis-fundamentals/index.md) of this textbook.
