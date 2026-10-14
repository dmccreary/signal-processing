---
title: Microphone Frequency Visualization with FFT
description: A real-time spectrum analyzer for your microphone. An FFT turns live sound into colored frequency bars with a decibel scale and a peak-frequency read-out.
image: /sims/fft-mic/fft-mic.png
og:image: /sims/fft-mic/fft-mic.png
twitter:image: /sims/fft-mic/fft-mic.png
social:
   cards: false
quality_score: 100
---

# Microphone Frequency Visualization with FFT

<iframe src="main.html" width="100%" height="452px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/fft-mic/main.html" width="100%" height="452px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

[Edit in the p5.js Editor](https://editor.p5js.org/dmccreary/sketches/89df6y1OK)

## Description

This MicroSim turns your computer's microphone into a real-time spectrum analyzer. Press **Start** and allow
microphone access when the browser asks. Every frame the sketch computes a fast Fourier transform (FFT) of the
most recent microphone samples and draws one bar per frequency bin. Bar height is the bin's level in decibels,
from −100 dB (empty) to −30 dB (full height). Bar color runs from blue at the low end of the displayed range to
red at the high end. A gold triangle marks the strongest bin, and the **Peak** read-out gives its frequency.

| Control | What it does |
|---------|--------------|
| **Start / Stop** | Opens the microphone and starts the analysis. Stop releases the microphone and freezes the last spectrum so you can study it. |
| **Max Freq** slider | Sets the highest frequency on the horizontal axis, from 2 kHz to 24 kHz in 0.5 kHz steps (default 8 kHz). The axis never extends past the Nyquist frequency $f_s/2$. |

The analyzer returns 512 bins evenly spaced from 0 Hz to the Nyquist frequency, so bin $k$ is centered on

$$f_k = k \cdot \frac{f_s}{2 \cdot 512}$$

At the common sample rate $f_s = 48$ kHz the bin width is 46.875 Hz; at 44.1 kHz it is 43.07 Hz. The level is
$20\log_{10}|X_k|$. A full-scale sine wave reads about −14 dB, because half of its energy belongs to the
negative frequency and the analyzer's Blackman window has a coherent gain of 0.42. Successive spectra are
averaged with a smoothing constant of 0.8. The peak search skips the 0 Hz (DC) bin and the leakage around it.

Sound is analyzed only inside your browser; nothing is recorded or uploaded. Browsers allow microphone access
only on pages served over https or from localhost.

This simulation is used in [Chapter 7: DFT, FFT and Frequency Domain Analysis](../../chapters/07-dft-fft-and-frequency-domain-analysis/index.md).

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Identify** the dominant frequency of a whistled or hummed sound using the Peak read-out and the gold marker.
2. **Calculate** the center frequency of an FFT bin from its index, the sample rate and the number of bins, and use it to explain why the read-out differs from the true frequency of a tone.
3. **Compare** the spectra of a hummed note, a whistle and a hissed "sss" by the number, spacing and spread of their peaks.
4. **Predict** how the Max Freq slider rescales the frequency axis, and explain why the axis cannot extend past the Nyquist frequency.
5. **Interpret** the decibel scale of the vertical axis, including the 6 dB rise that comes from doubling a tone's amplitude.

### Target Audience

College undergraduates in an introductory signal processing, audio engineering or music technology course.
Plan 15-20 minutes. Each student (or pair) needs a computer or phone with a microphone.

### Prerequisites

- Frequency, amplitude and the idea of a sinusoid
- Sampling and the Nyquist frequency ([Chapter 5](../../chapters/05-sampling-and-quantization/index.md))
- What a spectrum is and what the DFT computes ([Chapter 6](../../chapters/06-fourier-analysis-fundamentals/index.md))
- Decibels as a logarithmic measure of amplitude

### Activities

**Activity 1: Hiss versus hum (5 min).** Leave Max Freq at 8 kHz and press Start. Stay quiet for a few seconds
and note the background level. Then say a long "sss", and afterwards sing a steady "ooo". The "sss" raises a
broad band of bars with no distinct peaks, typically strongest in the right half of the plot (above about
4 kHz). The "ooo" produces a row of narrow, evenly spaced peaks, typically with most of the energy below 1 kHz.

**Activity 2: Harmonics of a hummed note (5 min).** Set Max Freq to 2 kHz. Hum a steady low note and press
Stop while humming to freeze the spectrum. Read the positions of the first four peaks on the axis. The peaks
are evenly spaced, and the spacing equals the frequency of the first peak (the fundamental). For example, a
fundamental near 200 Hz gives further peaks near 400, 600 and 800 Hz.

**Activity 3: Frequency resolution (5 min).** Use a tone-generator app on a phone to play a steady 440 Hz sine
wave near the microphone. At $f_s = 48$ kHz the Peak read-out shows 422 Hz, not 440 Hz: $440 / 46.875 = 9.39$,
so the strongest bin is bin 9, centered on $9 \times 46.875 = 421.9$ Hz. Change the tone to 1000 Hz and the
read-out shows 984 Hz (bin 21). On a computer that runs audio at 44.1 kHz the same tones read 431 Hz and 991 Hz.
On wide screens the note below the plot ("fs = ..., bin width ...") tells you which case applies.

**Activity 4: The Nyquist limit (5 min).** Drag Max Freq all the way to 24 kHz. At $f_s = 48$ kHz the right edge
of the plot is exactly the Nyquist frequency, and on wide screens the plot is labeled "right edge = Nyquist (fs/2)".
At $f_s = 44.1$ kHz the label stops at 22.05 kHz however far you drag the slider. Notice how little energy
everyday sounds have in the upper half of this range.

### Assessment

1. With $f_s = 48$ kHz and 512 bins spanning 0 Hz to the Nyquist frequency, what is the bin width, and what
   frequency is bin 100 centered on? *(Answer: $48000 / 1024 = 46.875$ Hz; $100 \times 46.875 = 4687.5$ Hz.)*
2. You whistle a steady 1000 Hz tone and the sample rate is 48 kHz. What does the Peak read-out show, and why?
   *(Answer: 984 Hz. $1000 / 46.875 = 21.3$, so the strongest bin is bin 21, centered on 984.4 Hz; the read-out
   can only report bin center frequencies.)*
3. A hummed note shows peaks near 150, 300, 450 and 600 Hz. What is its fundamental frequency, and what are the
   other peaks? *(Answer: 150 Hz; the other peaks are its 2nd, 3rd and 4th harmonics.)*
4. A tone's amplitude doubles. How far does its bar rise on the decibel axis? *(Answer: $20\log_{10} 2 \approx 6$ dB,
   which is 6/70 of the plot height on this −100 to −30 dB scale.)*
5. Why can this display never show frequencies above 24 kHz when the sample rate is 48 kHz? *(Answer: the
   Nyquist frequency $f_s/2 = 24$ kHz is the highest frequency a signal sampled at 48 kHz can represent.)*

### Common Misconceptions

**"The Peak read-out is the exact pitch."** The FFT measures energy in bins 46.9 Hz wide (at 48 kHz), and the
read-out reports the center of the strongest bin. Activity 3 exposes this: a 440 Hz tone reads 422 Hz.

**"A voice is a single frequency."** A hummed or sung note is a fundamental plus a family of harmonics at
whole-number multiples of it. Activity 2 freezes the spectrum so students can see and measure the evenly spaced
peaks.

## References

1. [Fast Fourier transform](https://en.wikipedia.org/wiki/Fast_Fourier_transform) - Wikipedia - the algorithm that computes the spectrum shown here
2. [Spectrum analyzer](https://en.wikipedia.org/wiki/Spectrum_analyzer) - Wikipedia - instruments and software that display a live spectrum like this one
3. [Nyquist frequency](https://en.wikipedia.org/wiki/Nyquist_frequency) - Wikipedia - why the frequency axis stops at half the sample rate
4. [Harmonic series (music)](https://en.wikipedia.org/wiki/Harmonic_series_%28music%29) - Wikipedia - why one sung note produces several evenly spaced peaks
5. [Window function](https://en.wikipedia.org/wiki/Window_function) - Wikipedia - the Blackman window, its coherent gain and spectral leakage
6. [Decibel](https://en.wikipedia.org/wiki/Decibel) - Wikipedia - the logarithmic scale used on the vertical axis
7. [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) - MDN - the browser FFT analyzer (window, smoothing, decibel conversion) underneath p5.sound
8. [MediaDevices: getUserMedia() method](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) - MDN - how a page asks for microphone access and why it needs a secure context
9. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on the DFT and FFT
