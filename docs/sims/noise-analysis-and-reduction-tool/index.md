---
title: Noise Analysis and Reduction Tool
description: Generate white, pink, brown, band-limited and impulsive noise, measure its histogram, autocorrelation and Welch PSD, and see SNR improve with averaging and filtering.
image: /sims/noise-analysis-and-reduction-tool/noise-analysis-and-reduction-tool.png
og:image: /sims/noise-analysis-and-reduction-tool/noise-analysis-and-reduction-tool.png
twitter:image: /sims/noise-analysis-and-reduction-tool/noise-analysis-and-reduction-tool.png
social:
   cards: false
quality_score: 100
---

# Noise Analysis and Reduction Tool

<iframe src="main.html" width="100%" height="672px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/noise-analysis-and-reduction-tool/main.html" width="100%" height="672px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

<!-- TODO(user): add the p5.js editor link once the sketch is saved in editor.p5js.org:
[Edit in the p5.js Editor](https://editor.p5js.org/<username>/sketches/noise-analysis-and-reduction-tool) -->

## Description

This MicroSim generates a record of $N$ noise samples $w[n]$ at $f_s = 1$ kHz, optionally adds a 5 Hz sinusoid
$s[n]$, and then reduces the noise. Four panels analyse the result:

- **Time series**: the input $x[n] = s[n] + w[n]$ (blue), the clean sinusoid (dashed) and the output $y[n]$ (orange), for the first 1.02 s.
- **Histogram** of $w[n]$ with a Gaussian of the same mean and variance, plus the excess kurtosis (0 for Gaussian, $-1.2$ for uniform).
- **Autocorrelation** $\rho[m]$ with the theoretical curve and the 95% band $\pm 1.96/\sqrt{N}$ expected for white noise.
- **Power spectral density** by Welch's method on log-log axes, with the theoretical PSD and a fitted slope in dB/decade.

**Noise type** selects white Gaussian (Box-Muller), white uniform, pink ($1/f$, a bank of one-pole filters), brown
($1/f^2$, a leaky integrator), band-limited white noise (ideal low-pass at 50 Hz) or impulsive noise (5% spikes).
**Samples N** and **Noise RMS σ** set the record length and level. **Welch segments S** averages $S$ Hann-windowed
segments of length $M$; more segments smooth the estimate but widen the bins $\Delta f = f_s/M$. **Input SNR** sets the
sinusoid amplitude $A = \sigma\sqrt{2\cdot 10^{\mathrm{SNR}/10}}$. **Ensemble avg K** averages $K$ independent noisy
copies, and **Moving avg** or **Median** with length **L** filters the result. **New noise** draws a new realization.

The banner measures each stage: $\mathrm{SNR}_{out} = 10\log_{10}\!\left(P_s / \overline{(y-s)^2}\right)$. For white noise,
ensemble averaging gains $10\log_{10}K$ dB and an $L$-point moving average gains $10\log_{10}L$ dB.
This MicroSim supports [Chapter 12: Stochastic Processes and Random Signals](../../chapters/12-stochastic-processes-and-random-signals/index.md).

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Classify** a noise record as white, pink or brown from its measured PSD slope (0, −10 or −20 dB/decade) and its autocorrelation
2. **Distinguish** Gaussian, uniform and impulsive white noise using the histogram and the excess kurtosis, even though their spectra are identical
3. **Explain** the variance–resolution trade-off of Welch's method in terms of the number of segments $S$ and the segment length $M$
4. **Predict** the SNR gain of averaging $K$ independent realizations ($10\log_{10}K$) and of an $L$-point moving average on white noise ($10\log_{10}L$), and explain why a moving average gains little against pink or brown noise
5. **Evaluate** when a moving-average or median filter improves the output SNR, accounting for signal distortion at long $L$ and for impulsive noise

### Target Audience

Undergraduate students in a signals and systems, digital signal processing or communications course. Plan 45–60
minutes for the four activities.

### Prerequisites

- Mean, variance and the Gaussian distribution
- Decibels and the definition of SNR
- The discrete Fourier transform and the idea of a power spectral density
- The autocorrelation function of a random process

### Activities

All numbers below are what the MicroSim shows for the realization drawn when the page loads. After you press
**New noise** they change by a random amount (a PSD slope typically by 1–2 dB/decade).

**Activity 1: Fingerprint the noise colours (15 min).** Uncheck *Add 5 Hz sinusoid* and set K = 1, L = 1,
N = 8192, S = 16. Step through the noise types and record the PSD slope (header of the PSD panel), $\rho[1]$ and the
excess kurtosis.

| Noise type | PSD slope (dB/decade) | $\rho[1]$ | Excess kurtosis |
|---|---|---|---|
| White Gaussian | +0.6 | 0.017 | −0.04 |
| White uniform | −1.3 | 0.007 | −1.20 |
| Pink (1/f) | −10.0 | 0.804 | −0.08 |
| Brown (1/f²) | −19.7 | 0.999 | +0.08 |
| Band-limited (fit 1–30 Hz) | +1.9 | 0.984 | −0.23 |
| Impulsive | −0.3 | −0.012 | +45.4 |

The slopes match the theory: 0 dB/decade for white, −10 dB/decade (−3 dB/octave) for pink and −20 dB/decade
(−6 dB/octave) for brown. The band-limited autocorrelation is a sinc: it crosses zero near lag 10 ms ($1/(2B)$ with
$B = 50$ Hz; $\rho[10] = 0.041$) and dips to −0.196 at lag 15. Impulsive noise has a flat spectrum and $\rho[1] \approx 0$,
yet its kurtosis of 45.4 (theory 46.2) and its 1.7% of samples beyond ±4σ show that it is far from Gaussian.

**Activity 2: Welch's trade-off (10 min).** Choose White Gaussian, sinusoid off, N = 4096, K = 1, L = 1.

1. S = 1: a single periodogram with M = 4096 and Δf = 0.24 Hz. The maroon curve scatters widely around the dashed theoretical level of −27 dB ($10\log_{10}(2\sigma^2/f_s)$), and the slope reads −2.1 dB/decade.
2. S = 8: M = 512, Δf = 1.95 Hz. The curve is much smoother and the slope reads +0.9 dB/decade.
3. S = 32: M = 128, Δf = 7.81 Hz. The curve is smoothest, but the slope fit now starts at 23 Hz and uses only 10 bins, so it reads +3.4 dB/decade.
4. Switch to Pink and N = 256 with S = 32: M = 16 and Δf = 62.5 Hz, so no bins fall inside the 1–100 Hz fit band and the header reports *too few bins*.

**Activity 3: Averaging against coloured noise (15 min).** Sinusoid off, N = 8192, S = 16.

1. Set K = 1 and Moving avg L = 16. The banner shows the noise reduction of the filter: White +11.95 dB (theory 12.04 dB), Pink +1.83 dB, Brown +0.01 dB, Band-limited +2.37 dB. Watch the orange autocorrelation of white noise become a triangle that reaches zero at lag 16.
2. Set L = 1 and K = 16. Now every colour gains about 12 dB: White +12.01, Pink +11.18, Brown +11.14, Band-limited +12.09 dB.

A moving average only helps when neighbouring noise samples are uncorrelated. Pink and brown noise put most of their
power at low frequencies, where the moving average passes everything. Independent realizations are uncorrelated with
each other whatever their colour, so ensemble averaging always approaches $10\log_{10}K$.

**Activity 4: SNR, distortion and impulses (15 min).** White Gaussian, sinusoid on, Input SNR = 0 dB, N = 4096,
S = 8, K = 1, Moving avg.

1. Step L through 1, 4, 16, 32, 64. The output SNR reads −0.10, 5.79, 12.03, 14.57 and 13.51 dB. It falls at L = 64 because the filter also attenuates the 5 Hz sinusoid (gain 0.84), and the resulting error is comparable to the remaining noise.
2. Set Input SNR = +30 dB. L = 16 still helps (output 37.55 dB), but L = 64 drops the output SNR to 15.88 dB (filter gain −14.03 dB): at high SNR the distortion dominates.
3. Return to 0 dB and choose Impulsive noise with L = 5. Moving avg gains +7.13 dB (output 7.22 dB); Median gains +14.89 dB (output 14.98 dB). Switch back to White Gaussian: now Moving avg gains +6.89 dB and Median only +5.36 dB.

### Assessment

1. A noise record shows a PSD slope of −9.6 dB/decade and $\rho[1] = 0.80$. Which noise type is it, and how would brown noise differ? *(Answer: pink noise; brown noise would have a slope near −20 dB/decade and $\rho[1]$ very close to 1.)*
2. How many independent realizations must be averaged to improve the SNR of white noise by 15 dB? *(Answer: $10^{1.5} = 31.6$, so K = 32, which gives $10\log_{10}32 = 15.05$ dB; the MicroSim shows +15.17 dB for the first-load realization.)*
3. Two white-noise records have the same flat PSD, but one has an excess kurtosis of 45. What kind of noise is it, and which filter in this MicroSim reduces it more? *(Answer: impulsive noise; the median filter, because a few large spikes do not move the median of a window while they shift its mean.)*
4. With the SNR slider fixed, σ is doubled from 1.0 to 2.0. What happens to the PSD level, the PSD slope and the input SNR? *(Answer: the PSD rises by $20\log_{10}2 = 6.02$ dB (from −27.0 to −21.0 dB for white noise); the slope and the input SNR do not change, because the sinusoid amplitude is scaled with σ.)*
5. At 0 dB input SNR, why is the output SNR lower at L = 64 (13.51 dB) than at L = 32 (14.57 dB)? *(Answer: the moving average's gain at 5 Hz drops to 0.84 at L = 64, so the output differs from the clean sinusoid by 16% of its amplitude; that distortion error adds to the noise and outweighs the extra noise reduction.)*

### Common Misconceptions

**"Averaging L samples always buys $10\log_{10}L$ dB."** That holds only when the noise samples are uncorrelated.
In Activity 3 the same 16-point moving average gains 11.95 dB on white noise but only 1.83 dB on pink noise and
0.01 dB on brown noise, while averaging 16 independent realizations gains about 12 dB for every colour.

**"White noise means Gaussian noise."** Whiteness describes the spectrum and the autocorrelation; Gaussianity
describes the amplitude distribution. White uniform and impulsive noise have the same flat PSD and delta-like
autocorrelation as white Gaussian noise, but their histograms and kurtosis (−1.20 and +45.4) are very different.

## References

1. [Colors of noise](https://en.wikipedia.org/wiki/Colors_of_noise) - Wikipedia - white, pink and brown noise and their spectral slopes
2. [Welch's method](https://en.wikipedia.org/wiki/Welch%27s_method) - Wikipedia - averaging windowed, overlapping periodograms to reduce the variance of a PSD estimate
3. [Signal-to-noise ratio](https://en.wikipedia.org/wiki/Signal-to-noise_ratio) - Wikipedia - definitions of SNR in linear units and decibels
4. [Median filter](https://en.wikipedia.org/wiki/Median_filter) - Wikipedia - the nonlinear filter that removes impulsive noise
5. [Box–Muller transform](https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform) - Wikipedia - how the sketch turns uniform random numbers into Gaussian ones
6. [Kurtosis](https://en.wikipedia.org/wiki/Kurtosis) - Wikipedia - the fourth-moment statistic used to tell Gaussian, uniform and impulsive noise apart
7. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook; its chapter on moving average filters derives the $\sqrt{L}$ noise reduction
