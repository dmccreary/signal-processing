---
title: Quantization and Noise Shaping
description: Quantize a full-scale waveform with 1 to 16 bits, see the quantization error and its spectrum, and measure how oversampling and noise shaping raise the signal-to-quantization-noise ratio in the signal band.
image: /sims/quantization-and-noise-shaping/quantization-and-noise-shaping.png
og:image: /sims/quantization-and-noise-shaping/quantization-and-noise-shaping.png
twitter:image: /sims/quantization-and-noise-shaping/quantization-and-noise-shaping.png
social:
   cards: false
quality_score: 100
---

# Quantization and Noise Shaping

<iframe src="main.html" height="632px" width="100%" scrolling="no"></iframe>

[Run the Quantization and Noise Shaping MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit in the p5.js Editor](https://editor.p5js.org/)

## About This MicroSim

Quantization replaces each sample by the nearest of a finite set of levels. With $b$ bits and a full-scale range
$V$ there are $2^b$ levels, a step size of

$$\Delta = \frac{V}{2^b}$$

and an error $e[n] = x_q[n] - x[n]$ that is never larger than $\Delta/2$. In this MicroSim the range is $V = 2$
(from $-1$ to $+1$) and the input always uses the whole range.

The four plots are, from top to bottom:

1. **Original signal** $x(t)$: a sinusoid, a triangle wave or a three-harmonic waveform with a 547 Hz fundamental. Four milliseconds are shown.
2. **Quantized signal** $x_q[n]$, drawn as a staircase. The horizontal lines are the quantization levels (drawn up to 32 levels).
3. **Quantization error** $e[n]$, in units of the step size $\Delta$.
4. **Spectrum of the error** from 0 to $f_s/2$, computed from the samples with an FFT. The shaded band from 0 to 20 kHz is the signal band.
   The dashed curve is the white-noise model described below.

**The white-noise model.** If the error behaves like noise that is uniformly distributed over $[-\Delta/2, \Delta/2]$,
its power is $\sigma_e^2 = \Delta^2/12$ and it is spread evenly from 0 to $f_s/2$. For a full-scale sinusoid this gives

$$\text{SQNR} \approx 6.02\,b + 1.76\ \text{dB}$$

The banner shows this prediction next to the value **measured** from the actual samples. The two agree well for many bits
and drift apart for few bits, where the error of a simple waveform is not noise-like at all: it is a distortion locked to the signal.

**Oversampling.** Sampling at $f_s = \text{OSR} \times 40$ kHz leaves the total error power unchanged but spreads it over a
band that is OSR times wider. A digital low-pass filter that keeps only 0 to 20 kHz then removes all but $1/\text{OSR}$ of it,
a gain of 3 dB (half a bit) for every doubling of the sampling rate.

**Noise shaping.** A noise shaper feeds the previous quantization errors back to the quantizer input, so that the error
appears at the output multiplied by a high-pass noise transfer function:

| Modulator order | Noise transfer function | Total noise power | In-band gain per doubling of OSR |
|-----------------|-------------------------|-------------------|----------------------------------|
| Off | $1$ | $\Delta^2/12$ | 3 dB |
| 1st order | $1 - z^{-1}$ | $2 \times \Delta^2/12$ | about 9 dB |
| 2nd order | $(1 - z^{-1})^2$ | $6 \times \Delta^2/12$ | about 15 dB |

Noise shaping does **not** reduce the total noise. It increases it, and moves almost all of it above the signal band where the
low-pass filter removes it. The two numbers under the spectrum (noise in the signal band and total noise) show this directly.
Tick **Show low-pass filtered output** to see the filtered signal (green) and the error that is left.

With noise shaping the quantizer input can exceed full scale by up to $\Delta/2$ (first order) or $3\Delta/2$ (second order).
The shaped quantizer is therefore given a few extra levels above and below full scale, drawn dashed; the caption reports how many levels are in use.
Practical delta-sigma converters instead keep the input a little below full scale.

## How to Use

1. Leave oversampling at 1× and noise shaping off. Move the **Bit depth** slider and watch the staircase, the error and the SQNR.
2. Choose an **Oversampling** ratio. The spectrum axis stretches to the new $f_s/2$ while the shaded signal band stays at 20 kHz.
3. Switch **Noise shaping** to 1st or 2nd order and compare the two noise figures under the spectrum.
4. Tick **Show low-pass filtered output** to see what a decimation filter recovers.

## Iframe Embed Code

You can add this MicroSim to any web page by adding this to your HTML:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/quantization-and-noise-shaping/main.html"
        height="632px"
        width="100%"
        scrolling="no"></iframe>
```

## Lesson Plan

### Learning Objectives

By the end of this activity, students will be able to:

1. **Explain** why quantization is irreversible and why the error is bounded by half a step.
2. **Predict** the SQNR of a full-scale sinusoid from the bit depth.
3. **Describe** the quantization error in time and in frequency, and say when the white-noise model fails.
4. **Explain** how oversampling and noise shaping raise the SQNR in the signal band without lowering the total noise.

### Grade Level

Undergraduate (signals and systems, digital signal processing)

### Duration

20-25 minutes

### Prerequisites

- Sampling and the Nyquist frequency
- Decibels and signal power
- The idea of a frequency spectrum

### Activities

1. **Exploration** (5 min): With a sinusoid, 1× oversampling and no noise shaping, set the bit depth to 2, 4, 8 and 16.
   Record the step size and the measured SQNR. About how many dB does each extra bit add?
2. **Guided Practice** (15 min):
    - Check the rule $6.02\,b + 1.76$ dB against the measured values at 8 and 16 bits (the simulation measures 49.6 dB and 97.5 dB;
      the rule gives 49.9 dB and 98.1 dB).
    - At 4 bits, raise the oversampling ratio to 16× with noise shaping off. The model promises 12 dB, but the measured gain is only about 3 dB.
      Look at the error spectrum inside the signal band and explain why. Repeat at 12 bits.
    - At 4 bits and 16×, switch on first-order and then second-order noise shaping. Record the in-band SQNR
      (about 56 dB and 73 dB) and the total noise. Which way does the total noise move?
    - Set 2 bits, 16× and second-order shaping, and tick the filtered output. The staircase looks nothing like the input,
      yet the filtered signal follows it closely. How many bits would a plain quantizer need for the same SQNR?
3. **Discussion** (5 min): A delta-sigma audio converter uses a quantizer with very few bits at a sampling rate of several megahertz.
   Which part of the system turns that coarse stream into 16 or more useful bits?

### Assessment

- Student computes the step size and the predicted SQNR for a given bit depth.
- Student explains why the error of a coarsely quantized sinusoid is not white noise.
- Student explains, using the two noise figures, what noise shaping does and does not do.

## References

1. Bennett, W. R. (1948). Spectra of quantized signals. *Bell System Technical Journal*, 27(3), 446-472.
2. Oppenheim, A. V., & Schafer, R. W. (2010). *Discrete-Time Signal Processing* (3rd ed.). Pearson. Chapter 4 covers quantization, oversampling and noise shaping.
3. [Quantization (signal processing)](https://en.wikipedia.org/wiki/Quantization_(signal_processing)) and [Noise shaping](https://en.wikipedia.org/wiki/Noise_shaping), Wikipedia.
4. [Chapter 5: Sampling and Quantization](../../chapters/05-sampling-and-quantization/index.md) of this textbook.
