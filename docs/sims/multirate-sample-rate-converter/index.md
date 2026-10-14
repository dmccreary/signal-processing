---
title: Multirate Sample Rate Converter
description: Change a signal's sample rate by L/M and watch zero insertion create images, downsampling fold aliases, and the low-pass filter remove both.
image: /sims/multirate-sample-rate-converter/multirate-sample-rate-converter.png
og:image: /sims/multirate-sample-rate-converter/multirate-sample-rate-converter.png
twitter:image: /sims/multirate-sample-rate-converter/multirate-sample-rate-converter.png
social:
   cards: false
quality_score: 100
---

# Multirate Sample Rate Converter

<iframe src="main.html" width="100%" height="572px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/multirate-sample-rate-converter/main.html" width="100%" height="572px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

<!-- TODO(user): add the p5.js editor link once the sketch is saved in editor.p5js.org:
[Edit in the p5.js Editor](https://editor.p5js.org/<username>/sketches/multirate-sample-rate-converter) -->

## Description

This MicroSim is a rational sample-rate converter that changes a signal's sample rate by the factor $L/M$.
The pipeline diagram shows three blocks: an upsampler $\uparrow L$ that inserts $L-1$ zeros between
samples, a low-pass FIR filter (LPF), and a downsampler $\downarrow M$ that keeps one sample in $M$. The rate under
each node follows the sliders; with $f_s = 8$ kHz the output rate is $f_s' = 8L/M$ kHz.

Below the diagram, four columns show the signal at the input $x[n]$, after zero insertion $u[k]$, after the filter
$v[k]$, and at the output $y[m]$. Each column has a magnitude spectrum in dB, drawn from 0 Hz to that stage's own
Nyquist frequency (the red value at the right end of the axis), above a 2 ms stem plot of the samples over the ideal
continuous signal (gray). In the two high-rate columns, dashed lines mark the input Nyquist frequency
$f_s/2$ (gray, "in") and the output Nyquist frequency $f_s'/2$ (red, "out"). The gold curve is the filter response $|H|/L$.

- **Upsample L** and **Downsample M** (1-8 each) set the conversion ratio.
- **Filter length N** (8-128 taps) sizes a Hamming-windowed sinc filter with cutoff $\pi/\max(L, M)$ at the high rate and gain $L$.
- **Low-pass filter on**, when unchecked, bypasses the filter to expose raw images and aliases.
- **Input signal** chooses a multi-tone (0.5, 1.2 and 3.1 kHz at amplitudes 0.5, 0.3 and 0.2), a linear chirp, or colored noise whose spectrum falls with frequency.

Read-outs give the output rate, the error against an ideal converter, the multiplications per output sample and,
for the multi-tone input, the measured output peaks (aliases and images in red). Hover over a spectrum to read values.

This simulation supports [Chapter 13: Multirate Signal Processing and Compression](../../chapters/13-multirate-signal-processing-and-compression/index.md).

### Mathematical Concepts

Zero insertion compresses the spectrum by $L$, so $L-1$ images of the baseband appear at $k f_s \pm f$:

$$u[k] = \begin{cases} x[k/L] & k = 0, \pm L, \pm 2L, \ldots \\ 0 & \text{otherwise} \end{cases} \qquad U(e^{j\omega}) = X(e^{j\omega L})$$

The filter runs at the high rate $L f_s$. Its cutoff $\omega_c = \pi/\max(L, M)$ removes the images (the $L$ term) and
everything above the output Nyquist frequency (the $M$ term), and its taps are scaled so that $\sum_j h[j] = L$:

$$v[k] = \sum_{j=0}^{N-1} h[j]\, u[k-j], \qquad y[m] = v[mM], \qquad f_s' = f_s \frac{L}{M}$$

The sketch removes the filter's delay of $(N-1)/2$ high-rate samples so the four stages line up in time.
The error read-out compares the output with an ideal converter, whose output $y_{\text{ideal}}[m]$ is the input with
every component at or above $\min(f_s, f_s')/2$ removed, sampled at the output instants:

$$E = 10 \log_{10} \frac{\operatorname{mean}\left( (y[m] - y_{\text{ideal}}[m])^2 \right)}{\operatorname{mean}\left( x[n]^2 \right)} \ \text{dB}$$

A direct implementation computes every high-rate sample and then discards $M-1$ of every $M$, costing $N \cdot M$
multiplications per output sample. A polyphase implementation computes only the kept samples and skips the inserted
zeros, costing about $N/L$. Each spectrum is computed from a 64 ms segment with a Blackman-Harris window and is scaled
so a sinusoid of amplitude $A$ reads $20\log_{10} A$ dB (amplitude 0.5 reads $-6.0$ dB).

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Calculate** the sample rate at every node of an $L/M$ converter, including the output rate $f_s L/M$
2. **Predict** the frequencies $k f_s \pm f$ of the spectral images created by inserting $L-1$ zeros, and identify them on the spectrum after upsampling
3. **Predict** where a component above the output Nyquist frequency lands after downsampling, and verify the alias frequency on the output spectrum
4. **Explain** why the converter's single low-pass filter needs cutoff $\pi/\max(L, M)$ and passband gain $L$
5. **Analyze** how the filter length trades conversion error against multiplications per output sample, and compare direct and polyphase cost

### Target Audience

Undergraduate students in a junior- or senior-level digital signal processing course. Plan 45-50 minutes for the
four activities.

### Prerequisites

- The sampling theorem, the Nyquist frequency and aliasing
- Reading a magnitude spectrum in decibels
- FIR low-pass filters and the windowed-sinc design method

### Activities

All activities use the **multi-tone** input unless stated otherwise. Readings are what the sim displays.

**Activity 1: Zero insertion creates images (10 min).** Set L = 3, M = 1, N = 48 and uncheck the filter.

- The pipeline reads 8, 24, 24 and 24 kHz. In column 2 the three tones are still at 0.50, 1.20 and 3.10 kHz, but at $-15.6$, $-20.0$ and $-23.5$ dB instead of $-6.0$, $-10.5$ and $-14.0$ dB: each dropped by $20\log_{10} 3 = 9.5$ dB.
- Six new peaks appear at 4.90, 6.80, 7.50, 8.50, 9.20 and 11.10 kHz, which are $8 \pm 3.1$, $8 \pm 1.2$ and $8 \pm 0.5$ kHz. The peak list marks them red and the error reads $-1.8$ dB.
- Check the filter box. The images fall below $-70$ dB, the tones return to $-6.0$, $-10.4$ and $-14.0$ dB because the filter has gain 3, and the error improves to $-49.5$ dB.

**Activity 2: Downsampling folds the spectrum (10 min).** Set L = 1, M = 2, N = 48 and uncheck the filter.

- The output rate is 4 kHz, so the output Nyquist frequency is 2 kHz. The 3.1 kHz tone cannot be represented and reappears at $4 - 3.1 = 0.90$ kHz at $-14.0$ dB (red in the peak list). The error reads $-9.7$ dB.
- Check the filter box (cutoff 2 kHz = $\pi/2$). The 0.90 kHz alias disappears, only 0.50 and 1.20 kHz remain, and the error improves to $-50.9$ dB.
- Now set M = 4 (output rate 2 kHz). Even with the filter on, a red alias remains at 0.80 kHz ($-37.4$ dB) and the error is $-33.1$ dB: the 1.2 kHz tone is only 0.2 kHz above the 1 kHz cutoff, closer than the 48-tap filter's transition band is wide.

**Activity 3: Rational conversion, 3/2 versus 2/3 (10 min).** Keep the filter on with N = 48.

- L = 3, M = 2: the rates are 8, 24, 24 and 12 kHz, the cutoff is 4 kHz ($\pi/3$, set by L), all three tones survive, and the error is $-49.5$ dB. The cost is 96 multiplications per output sample direct and 16.0 polyphase.
- L = 2, M = 3: the rates are 8, 16, 16 and 5.333 kHz, the cutoff is 2.667 kHz ($\pi/3$, now set by M), and the 3.1 kHz tone is removed, so the output peaks are 0.50 and 1.20 kHz only. The error is $-39.9$ dB; the cost is 144 direct and 24.0 polyphase.
- Uncheck the filter at L = 2, M = 3. The error jumps to $-3.0$ dB and red peaks appear at 0.43, 1.47, 2.17 and 2.23 kHz.
- Finally set L = M = 3 with the filter off. The output equals the input sample for sample and the error reads "below $-120$ dB". Explain why from $y[m] = u[3m]$.

**Activity 4: Filter length versus cost (10 min).** Set L = 3, M = 2 with the filter on and step N through
8, 16, 32, 48, 64 and 128. Record the error and both costs:

| N | Error (dB) | Direct N·M | Polyphase N/L |
|---|------------|------------|---------------|
| 8 | -14.5 | 16 | 2.7 |
| 16 | -19.9 | 32 | 5.3 |
| 32 | -33.4 | 64 | 10.7 |
| 48 | -49.5 | 96 | 16.0 |
| 64 | -56.4 | 128 | 21.3 |
| 128 | -62.5 | 256 | 42.7 |

At N = 16 an image survives at 4.90 kHz ($-27.3$ dB, red) and the 3.1 kHz tone droops to $-16.1$ dB because it sits
in the filter's wide transition band. Switch to **colored noise**: the error is $-33.3$ dB at N = 48 and $-39.1$ dB at
N = 128, worse than for the tones because the noise has energy right up to the 4 kHz cutoff.

### Assessment

1. A converter has $f_s = 8$ kHz, L = 5 and M = 4. What are the rates at $u$, $v$ and $y$, and what are the filter's cutoff and gain? *(Answer: 40, 40 and 10 kHz; cutoff $\pi/5$ at 40 kHz, which is 4 kHz, and gain 5. Set L = 5, M = 4 to check.)*
2. A 1.2 kHz tone sampled at 8 kHz is upsampled by L = 4. At which frequencies between 0 and the new Nyquist frequency do its images appear? *(Answer: the new rate is 32 kHz, so the images are at $8 \pm 1.2$ and $16 - 1.2$: 6.8, 9.2 and 14.8 kHz, which is $L - 1 = 3$ images.)*
3. With L = 1, M = 3 and the filter off, where does the 3.1 kHz tone appear in the output, and why? *(Answer: the output rate is 2.667 kHz, so the tone folds to $3.1 - 2.667 = 0.43$ kHz; it is above the output Nyquist frequency of 1.333 kHz.)*
4. Why must the interpolation filter have a passband gain of L? *(Answer: inserting $L-1$ zeros divides each component's amplitude by L and puts the rest of its energy into the $L-1$ images; removing the images leaves amplitude $A/L$, so the filter multiplies by L to restore $A$.)*
5. For L = 3, M = 2 and N = 48, how many times cheaper is the polyphase implementation than the direct one, and where does the saving come from? *(Answer: 96 versus 16 multiplications per output sample, six times cheaper, which is $L \cdot M$: a factor M from not computing discarded outputs and a factor L from skipping the inserted zeros.)*

### Common Misconceptions

**"Upsampling adds detail to the signal."** Raising the rate adds no new frequencies. Set L = 3, M = 1 with the filter
on: the output rate is 24 kHz, but the output spectrum still holds only 0.5, 1.2 and 3.1 kHz, and nothing above 4 kHz
rises above $-70$ dB. The extra samples are interpolated, not measured.

**"Downsampling just throws samples away, so it cannot hurt."** With L = 1, M = 2 and the filter off, a 0.90 kHz
component appears that was never in the input. Once aliased it sits among the wanted tones and no later filter can
tell it apart, which is why the low-pass filter must come before the downsampler.

## References

1. [Sample-rate conversion](https://en.wikipedia.org/wiki/Sample-rate_conversion) - Wikipedia - rational L/M resampling and its applications, such as 44.1 kHz to 48 kHz audio
2. [Upsampling](https://en.wikipedia.org/wiki/Upsampling) - Wikipedia - zero insertion, spectral images and the interpolation filter
3. [Downsampling (signal processing)](https://en.wikipedia.org/wiki/Downsampling_%28signal_processing%29) - Wikipedia - decimation, aliasing and the anti-aliasing filter
4. [Aliasing](https://en.wikipedia.org/wiki/Aliasing) - Wikipedia - why components above the Nyquist frequency fold back into the baseband
5. [Window function](https://en.wikipedia.org/wiki/Window_function) - Wikipedia - the Hamming window used in the filter and the Blackman-Harris window used for the spectra
6. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on windowed-sinc filters and sampling
