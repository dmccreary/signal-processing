---
title: FFT Live Audio from Microphone
description: A live spectrum analyzer for your microphone with adjustable smoothness and FFT size, showing bin width, window length and the strongest peak.
image: /sims/fft-live-audio/fft-live-audio.png
og:image: /sims/fft-live-audio/fft-live-audio.png
twitter:image: /sims/fft-live-audio/fft-live-audio.png
social:
   cards: false
quality_score: 100
---

# FFT Live Audio from Microphone

<iframe src="main.html" width="100%" height="482px" scrolling="no" allow="microphone"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/fft-live-audio/main.html" width="100%" height="482px" scrolling="no" allow="microphone"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

[Edit in the p5.js Editor](https://editor.p5js.org/dmccreary/sketches/ke1cB4Lpl)

## Description

This MicroSim is a live spectrum analyzer for your computer's microphone. Press **Start** and allow microphone
access when the browser asks. The **purple bars** show the magnitude spectrum of the last fraction of a second
of sound, computed by a fast Fourier transform (FFT), from 0 Hz up to the Nyquist frequency $f_s/2$. The
vertical axis is in decibels: $-100$ dB is an empty bar and anything louder than $-30$ dB fills the plot.
A gold marker and the **Strongest peak** read-out show the loudest frequency above 50 Hz, and moving the mouse
over the plot reads out the frequency under the cursor.

| Control | What it does |
|---------|--------------|
| **Start / Stop** | Opens or closes the microphone. Sound is analyzed in your browser only; nothing is recorded, sent or played back. |
| **Smoothness** (0 to 0.95) | Averages each new spectrum with the previous ones. High values steady the display but make it slow to follow sudden sounds. |
| **FFT Size** (128 to 16384 bins) | Sets how many frequency bins divide the range from 0 Hz to $f_s/2$. |
| **Reset** | Returns to Smoothness 0.50 and 1024 bins. |

The line above the plot shows the quantities that the FFT Size controls. With $N$ bins and sample rate $f_s$,

$$\Delta f = \frac{f_s}{2N}, \qquad T_{\text{window}} = \frac{2N}{f_s}.$$

For example, 1024 bins at $f_s = 48$ kHz gives a bin width of 23.4 Hz and needs a window of 2048 samples
(42.7 ms). Finer frequency resolution always costs a longer window, which is the time-frequency trade-off.

This simulation is used in [Chapter 7: DFT, FFT and Frequency Domain Analysis](../../chapters/07-dft-fft-and-frequency-domain-analysis/index.md).
If you embed it on another site, keep `allow="microphone"` on the iframe.

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Identify** the frequency of a sustained whistle as the strongest narrow peak in the live spectrum.
2. **Calculate** the bin width $f_s/(2N)$ and window length $2N/f_s$ for a given FFT size and sample rate.
3. **Predict** how raising the Smoothness slider toward 0.95 steadies the spectrum but slows its response to sudden sounds.
4. **Explain** the trade-off between frequency resolution and time resolution when the FFT size changes.
5. **Compare** the spectra of a whistle, a sung vowel and a hissed "sss" to distinguish tonal sounds from broadband noise.

### Target Audience

College undergraduates in an introductory signal processing, audio engineering or music technology course.
Plan 15-20 minutes. A computer with a working microphone is required.

### Prerequisites

- Frequency, amplitude and the idea of a sinusoid
- Sampling and the Nyquist frequency (Chapter 5)
- What a magnitude spectrum is and the decibel scale

### Activities

**Activity 1: Find your whistle (5 min).** Press Start with Smoothness 0.50 and FFT Size 1024 bins. Whistle a
steady note. A single narrow peak appears with the gold marker on it; read its frequency from the
**Strongest peak** read-out, then whistle higher and lower and watch the peak move. At 48 kHz the read-out moves
in steps of the 23.4 Hz bin width.

**Activity 2: Resolution in steps (5 min).** Keep whistling the same note and move FFT Size from 128 to 16384
bins. At 128 bins (bin width 187.5 Hz at 48 kHz) the peak is a wide block and the read-out jumps in 187.5 Hz
steps. At 16384 bins the bin width is 1.46 Hz, so the read-out is much more precise, but the analysis window is
32768 samples (683 ms) long.

**Activity 3: Smoothness and time (5 min).** Set FFT Size to 1024 bins and Smoothness to 0.00, then clap once:
the bars flash and disappear. Set Smoothness to 0.95 and clap again: the bars fade slowly. Each display frame the
analyzer keeps the fraction $\tau$ (the Smoothness value) of the previous magnitude, so after a sound ends the
bars fall by $20\log_{10}\tau$ dB per frame: about 6 dB per frame at 0.50 but only 0.45 dB per frame at 0.95,
which at 60 frames per second takes about 2.6 s to cross the 70 dB height of the plot.

**Activity 4: Tones versus noise (5 min).** With Smoothness 0.50 and 2048 bins, compare a whistle, a long sung
"ah" and a long hissed "sss". The whistle gives one peak, the vowel gives a row of evenly spaced peaks
(harmonics of the voice's fundamental frequency), and the hiss spreads energy over many kilohertz with no
single peak.

### Assessment

1. At $f_s = 48$ kHz with FFT Size 1024 bins, what is the bin width?
   *Answer: $48000 / (2 \times 1024) = 23.4375$ Hz, about 23.4 Hz.*
2. With 1024 bins at $f_s = 48$ kHz, the strongest peak is in bin 85. What frequency is that?
   *Answer: $85 \times 23.4375 = 1992.2$ Hz.*
3. At $f_s = 44.1$ kHz with 4096 bins, how long is the analysis window?
   *Answer: $2 \times 4096 = 8192$ samples, and $8192 / 44100 = 0.186$ s, about 186 ms.*
4. With Smoothness 0.80, how many display frames does it take a bar to fall by 20 dB after a sound stops?
   *Answer: each frame falls by $20\log_{10}0.8 = 1.94$ dB, so about $20 / 1.94 \approx 10$ frames, roughly 0.17 s at 60 frames per second.*
5. Why does a clap stay on the display much longer at 16384 bins than at 128 bins, even with Smoothness 0?
   *Answer: 16384 bins needs a 32768-sample window (683 ms at 48 kHz), so the clap stays inside the analyzed window for a large part of a second; the 128-bin window is only 256 samples (5.3 ms).*

### Common Misconceptions

**"A bigger FFT size shows higher frequencies."** The frequency axis always runs from 0 Hz to the Nyquist
frequency; move the FFT Size slider and the axis does not change. Only the bin width and the window length
change.

**"Smoothness filters the sound."** Smoothness only averages successive spectra over time for display. Whistle
with Smoothness 0.00 and then 0.95: the peak appears at the same frequency both times. At 0.95 it only rises and
fades more slowly, because the averaging changes how the display follows time, not which frequencies are present.

## References

1. [Fast Fourier transform](https://en.wikipedia.org/wiki/Fast_Fourier_transform) - Wikipedia - the algorithm that computes the spectrum shown here
2. [Short-time Fourier transform](https://en.wikipedia.org/wiki/Short-time_Fourier_transform) - Wikipedia - spectra of a sliding window of a live signal and the time-frequency trade-off
3. [Window function](https://en.wikipedia.org/wiki/Window_function) - Wikipedia - the Blackman window that the browser analyzer applies before the FFT
4. [Spectrum analyzer](https://en.wikipedia.org/wiki/Spectrum_analyzer) - Wikipedia - what instruments and software that display a live spectrum do
5. [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) - MDN - the Web Audio node behind the analyzer, including fftSize and smoothingTimeConstant
6. [MediaDevices: getUserMedia() method](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) - MDN - how a web page asks for microphone access
7. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on the DFT and FFT
8. [p5.sound.js](https://github.com/processing/p5.sound.js) - Processing Foundation - the audio library used by this MicroSim
