---
title: Sampling Theorem Explorer
description: Sample a sine wave at an adjustable rate, rebuild it from the samples, and see in time and in frequency why a tone above the Nyquist frequency folds to a lower alias frequency.
image: /sims/sampling-theorem-explorer/sampling-theorem-explorer.png
og:image: /sims/sampling-theorem-explorer/sampling-theorem-explorer.png
twitter:image: /sims/sampling-theorem-explorer/sampling-theorem-explorer.png
social:
   cards: false
quality_score: 100
---

# Sampling Theorem Explorer

<iframe src="main.html" height="627px" width="100%" scrolling="no"></iframe>

[Run the Sampling Theorem Explorer MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit in the p5.js Editor](https://editor.p5js.org/)

## About This MicroSim

The sampling theorem says that a signal whose highest frequency is $f_{max}$ can be rebuilt exactly from
its samples when the sampling rate satisfies $f_s > 2f_{max}$. This MicroSim uses a single sine wave,
$x(t) = \sin(2\pi f_{max} t)$, so $f_{max}$ is simply the frequency of the tone.

The four plots are, from top to bottom:

1. **Continuous signal** $x(t)$ over 200 ms. The small ticks along the bottom edge mark the sampling instants.
2. **Samples** $x[n] = x(nT_s)$ with $T_s = 1/f_s$.
3. **Reconstructed signal**, with the original shown dashed for comparison.
4. **Spectrum** from 0 to 200 Hz. Sampling copies the tone to every frequency $k f_s \pm f_{max}$ (grey lines).
   The shaded band from 0 to the Nyquist frequency $f_{Nyq} = f_s/2$ is the range an ideal reconstruction filter keeps.

The banner under the title states which case you are in:

| Condition | Result |
|-----------|--------|
| $f_s > 2f_{max}$ (green) | The tone is the only spectral line below $f_{Nyq}$, and the reconstruction equals the original |
| $f_s < 2f_{max}$ (red) | A copy at $\lvert f_{max} - k f_s\rvert$ falls below $f_{Nyq}$. The reconstruction is a sine at that **alias** frequency |
| $f_s = 2f_{max}$ (red) | Every sample of this sine falls on a zero crossing, so nothing is recovered. This is why the inequality is strict |

The alias frequency is $f_a = \lvert f_{max} - k f_s\rvert$ with $k$ the integer nearest to $f_{max}/f_s$,
which always lies in $[0, f_s/2]$. For example, a 40 Hz tone sampled at 50 Hz appears at $\lvert 40 - 50\rvert = 10$ Hz.

**Reconstruction filters.** The ideal filter is sinc interpolation,

$$x_r(t) = \sum_{n=-\infty}^{\infty} x[n]\,\text{sinc}\!\left(\frac{t - nT_s}{T_s}\right)$$

whose frequency response is 1 below $f_{Nyq}$ and 0 above it. Tick **Show sinc pulses** to see the individual
terms of this sum. Two practical alternatives are offered:

- **Zero-order hold**, the staircase output of a typical DAC, with gain $\lvert\text{sinc}(f/f_s)\rvert$.
- **Linear interpolation**, with gain $\text{sinc}^2(f/f_s)$.

Neither practical filter removes the copies above $f_{Nyq}$ completely. The orange lines in the spectrum show
how much of each copy leaks through, which is why a DAC is followed by an analog smoothing filter.

## How to Use

1. Set the **Signal frequency** and the **Sampling rate** and read the banner.
2. Start with $f_s$ well above $2f_{max}$, then lower it slowly. Watch the grey copy at $f_s - f_{max}$ move
   down the spectrum and cross the Nyquist line.
3. Switch **Reconstruction** between ideal and practical filters and compare both the time plot and the orange leakage lines.
4. With the ideal filter selected, tick **Show sinc pulses**.

## Iframe Embed Code

You can add this MicroSim to any web page by adding this to your HTML:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/sampling-theorem-explorer/main.html"
        height="627px"
        width="100%"
        scrolling="no"></iframe>
```

## Lesson Plan

### Learning Objectives

By the end of this activity, students will be able to:

1. **State** the sampling theorem and the meaning of the Nyquist rate and the Nyquist frequency.
2. **Predict** the alias frequency of an under-sampled tone.
3. **Explain** aliasing as the overlap of spectral copies created by sampling.
4. **Compare** ideal sinc reconstruction with zero-order hold and linear interpolation.

### Grade Level

Undergraduate (signals and systems, digital signal processing)

### Duration

20-25 minutes

### Prerequisites

- Sinusoids, frequency and period
- The idea of a frequency spectrum
- Discrete-time signals $x[n]$

### Activities

1. **Exploration** (5 min): Keep the signal at 20 Hz. Lower the sampling rate from 100 Hz to 45 Hz, then to 40 Hz, then to 35 Hz.
   Record the banner text and the reconstructed frequency each time.
2. **Guided Practice** (15 min):
    - Predict, then check, the alias frequency for these pairs ($f_{max}$, $f_s$): (40, 50), (70, 50), (30, 50), (100, 30).
      The answers are 10, 20, 20 and 10 Hz.
    - Set the tone to 40 Hz and the rate to 50 Hz. In the samples plot, trace the dots by eye. Which sine do they suggest?
      Two different tones produce exactly these samples. Name them.
    - Set 20 Hz and 60 Hz with the zero-order hold. Read the heights of the lines at 20 Hz and at 40 Hz
      (about 0.83 and 0.41). Where do they come from?
    - With the ideal filter and sinc pulses shown, set 10 Hz and 40 Hz. At each sampling instant, how many sinc pulses are non-zero?
3. **Discussion** (5 min): Audio CDs use $f_s = 44.1$ kHz for signals up to 20 kHz. Why not exactly 40 kHz?
   What must be placed before the sampler to guarantee that $f_{max} < f_s/2$?

### Assessment

- Student computes the alias frequency for a given tone and sampling rate.
- Student explains why sampling at exactly $2f_{max}$ is not sufficient.
- Student explains why a practical DAC needs a smoothing filter after the zero-order hold.

## References

1. Shannon, C. E. (1949). Communication in the presence of noise. *Proceedings of the IRE*, 37(1), 10-21.
2. Oppenheim, A. V., & Schafer, R. W. (2010). *Discrete-Time Signal Processing* (3rd ed.). Pearson. Chapter 4 covers sampling of continuous-time signals.
3. [Nyquist–Shannon sampling theorem](https://en.wikipedia.org/wiki/Nyquist%E2%80%93Shannon_sampling_theorem), Wikipedia.
4. [Chapter 5: Sampling and Quantization](../../chapters/05-sampling-and-quantization/index.md) of this textbook.
