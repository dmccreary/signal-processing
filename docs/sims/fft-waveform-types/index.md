---
title: FFT Waveform Types
description: Compare the harmonic spectra of sine, square, triangle and sawtooth waves - which harmonics each shape contains and how fast they decay.
image: /sims/fft-waveform-types/fft-waveform-types.png
og:image: /sims/fft-waveform-types/fft-waveform-types.png
twitter:image: /sims/fft-waveform-types/fft-waveform-types.png
social:
   cards: false
quality_score: 100
---

# FFT Waveform Types

<iframe src="main.html" width="100%" height="532px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/fft-waveform-types/main.html" width="100%" height="532px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

<!-- TODO(user): add the p5.js editor link once the sketch is saved in editor.p5js.org:
[Edit in the p5.js Editor](https://editor.p5js.org/<username>/sketches/fft-waveform-types) -->

## Description

This MicroSim shows how the **shape** of a periodic waveform determines its **harmonic content**. The top plot
(green) is the time domain: 50 ms of a sine, square, triangle or sawtooth wave with peak amplitude 1, with a read-out
of the period $T = 1/f$. The bottom plot (purple) is the frequency domain: one vertical line for every harmonic
$f_n = n f$ from 0 to 500 Hz, labelled with its harmonic number $n$ when there is room.

- **Waveform** radio buttons choose the shape. The caption above the spectrum summarizes the rule, for example *Odd harmonics, 1/n decay*.
- **Frequency** slider (0-500 Hz, default 50 Hz) sets the fundamental $f$. Every harmonic line moves with it, so fewer harmonics fit below 500 Hz as $f$ rises.
- **Hover** over (or tap) a spectral line to highlight it in gold and read its frequency and exact relative magnitude, for example *n = 3: 300 Hz, magnitude 1/3 = 0.333*.

Line heights are **relative to the fundamental** (the $n = 1$ line always reaches 1), so you can compare how fast the
harmonics decay: $1/n$ for the square and sawtooth waves, $1/n^2$ for the triangle wave. A small dot on the baseline
marks every harmonic that is present, even when its line is too short to see. The spectrum is computed from the
Fourier series rather than by running an FFT on samples; it shows the peak heights an ideal FFT would report for a
window that holds a whole number of periods, without leakage or aliasing.

This MicroSim supports the Fourier series section of
[Chapter 6: Fourier Analysis Fundamentals](../../chapters/06-fourier-analysis-fundamentals/index.md#fourier-series).

### Fourier Series of the Four Waveforms

For a wave of peak amplitude 1 and angular frequency $\omega = 2\pi f$:

$$\text{Square} = \frac{4}{\pi}\left[\sin(\omega t) + \frac{1}{3}\sin(3\omega t) + \frac{1}{5}\sin(5\omega t) + \frac{1}{7}\sin(7\omega t) + \cdots\right]$$

$$\text{Triangle} = \frac{8}{\pi^2}\left[\sin(\omega t) - \frac{1}{9}\sin(3\omega t) + \frac{1}{25}\sin(5\omega t) - \frac{1}{49}\sin(7\omega t) + \cdots\right]$$

$$\text{Sawtooth} = \frac{2}{\pi}\left[\sin(\omega t) - \frac{1}{2}\sin(2\omega t) + \frac{1}{3}\sin(3\omega t) - \frac{1}{4}\sin(4\omega t) + \cdots\right]$$

The factor in front sets the absolute size of the fundamental ($4/\pi \approx 1.27$, $8/\pi^2 \approx 0.81$,
$2/\pi \approx 0.64$); the MicroSim divides it out so that only the decay pattern remains. The MicroSim draws the
triangle and sawtooth starting from $-1$ at $t = 0$. That is a time shift, which changes the phases of the harmonics
but not their magnitudes.

**Why only odd harmonics?** Square and triangle waves have *half-wave symmetry*: shifting them by half a period flips
their sign, $x(t + T/2) = -x(t)$. Every even harmonic fails that test, so its coefficient is zero. The sawtooth has no
such symmetry, so all harmonics appear.

**Why does the triangle decay faster?** The square and sawtooth waves *jump* (the signal itself is discontinuous),
which gives coefficients that fall as $1/n$. The triangle wave never jumps; only its slope changes abruptly at the
corners, which gives $1/n^2$. In general, the smoother a waveform is in time, the faster its spectrum falls off in
frequency. When a jump is rebuilt from a finite number of harmonics, the partial sum overshoots by about 9% of the
jump near the edge (the Gibbs phenomenon); this MicroSim shows the ideal waveforms, not partial sums.

**Connection to sound.** Instruments playing the same note share the fundamental but differ in harmonic content,
which we hear as *timbre*. Sine tones sound pure, triangle waves soft, square waves hollow and buzzy, and sawtooth
waves bright, which is why subtractive synthesizers start from a sawtooth and filter harmonics away.

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Compare** the harmonic spectra of sine, square, triangle and sawtooth waves at the same fundamental frequency
2. **Explain** why square and triangle waves contain only odd harmonics while sawtooth waves contain every integer harmonic
3. **Distinguish** the $1/n$ amplitude decay of a square wave from the $1/n^2$ decay of a triangle wave in the spectrum plot
4. **Predict** how raising the fundamental frequency slider rescales the position of every harmonic line
5. **Relate** jumps and corners of a waveform in the time domain to the amount of high-frequency energy in its spectrum

### Target Audience

College undergraduates in an introductory signal processing, electronics or music technology course.
Plan 20 minutes of guided exploration.

### Prerequisites

- Basic trigonometry: sine waves, frequency and period
- The idea of a spectrum as a plot of magnitude against frequency (see the [Basic FFT MicroSim](../fft-basic/index.md))

### Activities

**Activity 1: Square versus triangle (5 min).** Set the frequency to **100 Hz** and select **Square**. Lines appear at
100, 300 and 500 Hz with relative heights 1, 0.333 and 0.200. Switch to **Triangle**: the lines stay at the same
frequencies but shrink to 1, 0.111 and 0.040. Hover over each line to read the exact values. Ask: "Which wave has
more high-frequency energy, and which one has sharper features in the time plot?"

**Activity 2: The missing even harmonics (5 min).** At 100 Hz select **Sawtooth**: five lines appear at 100, 200, 300,
400 and 500 Hz with heights 1, 0.5, 0.333, 0.25 and 0.2. Switch to **Square**: the 200 Hz and 400 Hz lines vanish.
Ask students to sketch the square wave shifted by half a period and explain the symmetry that removes them.

**Activity 3: Frequency scaling (5 min).** Select **Square** at **50 Hz**: the period read-out shows 20.0 ms,
the window holds 2.5 cycles, and five lines appear at 50, 150, 250, 350 and 450 Hz. Move to **100 Hz**: the period
halves to 10.0 ms, the window holds 5 cycles, and only three lines remain (100, 300, 500 Hz). Every harmonic frequency
doubled; none of the relative heights changed.

**Activity 4: A crowded spectrum (5 min).** Select **Sawtooth** at **20 Hz**. Exactly one ramp fills the 50 ms window
(period 50.0 ms), and 25 lines fill the spectrum, the last at 500 Hz with height 0.040. Then select **Sine**: a
single line at 20 Hz remains. Discuss why a pure sine is the only waveform with one line.

### Assessment

1. A square wave has a fundamental of 60 Hz. Which lines appear between 0 and 500 Hz, and what are their relative heights? *(Answer: 60, 180, 300 and 420 Hz, with heights 1, 0.333, 0.200 and 0.143; the next odd harmonic, 540 Hz, is off the plot.)*
2. What is the relative magnitude of the 5th harmonic of a triangle wave, and how does it compare with the 5th harmonic of a square wave? *(Answer: $1/25 = 0.04$ for the triangle and $1/5 = 0.2$ for the square, five times larger.)*
3. Why does a 100 Hz square wave have no line at 200 Hz? *(Answer: it has half-wave symmetry, $x(t + T/2) = -x(t)$, which forces every even-harmonic coefficient to zero.)*
4. How many lines does a 125 Hz sawtooth produce between 0 and 500 Hz? *(Answer: four, at 125, 250, 375 and 500 Hz, with heights 1, 0.5, 0.333 and 0.25.)*
5. The time plot shows exactly 4 complete cycles in its 50 ms window. What are the fundamental frequency and the period? *(Answer: $f = 4 / 0.050\ \text{s} = 80$ Hz and $T = 12.5$ ms; the read-out confirms it.)*

### Common Misconceptions

**"Harmonics are extra tones the analyser adds to every signal."** Harmonics are part of the waveform's shape. Select
**Sine** at any frequency: only one line appears. The harmonics appear only when the shape departs from a sinusoid.

**"Square and triangle waves have the same spectrum because both contain only odd harmonics."** The lines sit at the
same frequencies but decay at different rates. At 100 Hz, hover over the 300 Hz line: 0.333 for the square wave,
0.111 for the triangle wave.

### Extension Activities

- Predict the spectrum of a *half-amplitude* square wave. (The relative heights do not change; only the absolute scale does.)
- Add a dB magnitude scale (an extension to the code) so that the small triangle-wave harmonics become visible.
- Add audio output so that students can hear the timbre of each waveform at the same pitch.

## References

1. [Fourier series](https://en.wikipedia.org/wiki/Fourier_series) - Wikipedia - the decomposition of a periodic signal into harmonics that this MicroSim plots
2. [Square wave](https://en.wikipedia.org/wiki/Square_wave) - Wikipedia - odd-harmonic series with $1/n$ amplitudes
3. [Triangle wave](https://en.wikipedia.org/wiki/Triangle_wave) - Wikipedia - odd-harmonic series with $1/n^2$ amplitudes and alternating signs
4. [Sawtooth wave](https://en.wikipedia.org/wiki/Sawtooth_wave) - Wikipedia - series containing every integer harmonic
5. [Gibbs phenomenon](https://en.wikipedia.org/wiki/Gibbs_phenomenon) - Wikipedia - the overshoot when a jump is rebuilt from a finite number of harmonics
6. [Timbre](https://en.wikipedia.org/wiki/Timbre) - Wikipedia - how harmonic content shapes the character of a sound
7. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on Fourier analysis and harmonics
