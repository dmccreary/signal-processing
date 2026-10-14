---
title: FFT Spectrum Analyzer
description: Analyze test signals or the microphone with a radix-2 FFT, choosing FFT size, window and a magnitude, dB or phase display, with peak markers and a spectrogram.
image: /sims/fft-spectrum-analyzer/fft-spectrum-analyzer.png
og:image: /sims/fft-spectrum-analyzer/fft-spectrum-analyzer.png
twitter:image: /sims/fft-spectrum-analyzer/fft-spectrum-analyzer.png
social:
   cards: false
quality_score: 100
---

# FFT Spectrum Analyzer

<iframe src="main.html" width="100%" height="607px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/fft-spectrum-analyzer/main.html" width="100%" height="607px" scrolling="no" allow="microphone"></iframe>
```

The `allow="microphone"` attribute lets the microphone source work when the MicroSim is embedded in a page on another site.

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

[Edit in the p5.js Editor](https://editor.p5js.org/)

<!-- TODO(user): replace the link above with the saved sketch URL, for example
https://editor.p5js.org/<username>/sketches/<id> -->

## Description

A spectrum analyzer takes a frame of $N$ samples, multiplies it by a window function $w[n]$ and computes the DFT

$$X[k] = \sum_{n=0}^{N-1} x[n]\,w[n]\,e^{-j2\pi kn/N}$$

with a Fast Fourier Transform. This MicroSim does exactly that, with its own radix-2 FFT, on every frame.

- **Upper plot**: the frame of $N$ samples before the window (grey) and after it (blue), with time in milliseconds.
- **Lower plot**: the spectrum from 0 to $f_s/2$. Bin $k$ sits at frequency $f = k\,\Delta f$, where $\Delta f = f_s/N$ is the bin spacing shown in the yellow banner.
- Orange markers label up to four peaks. Move the mouse over the spectrum to read one bin: its number $k$, its frequency, the raw $\lvert X[k]\rvert$, the amplitude in linear units and dB, and the phase.

**Controls.** **Source** chooses the input signal. **Run / Pause** lets time advance (the MicroSim starts paused).
**Signal frequency f** sets the tone from 50 to 3900 Hz (it is greyed out for the chirp and the microphone).
**FFT size N** chooses 128 to 4096 samples. **Window** chooses rectangular, Hamming, Hanning, Blackman or Kaiser ($\beta = 8.6$).
**Display** shows the magnitude on a linear scale, in dB or the phase, and **Spectrogram** adds a scrolling time-frequency image.

The MicroSim illustrates frequency bins, the amplitude scaling of the DFT, spectral leakage, window functions, frequency
resolution and the trade-off between frequency and time resolution.
It is used in [Chapter 6: Fourier Analysis Fundamentals](../../chapters/06-fourier-analysis-fundamentals/index.md).

### How the Vertical Axis Is Scaled

A sine of amplitude $A$ whose frequency falls exactly on a bin gives $\lvert X[k]\rvert = A\,N/2$ with a rectangular window,
and $A\,N/2$ times the mean of the window otherwise. The magnitude displays divide that out:

$$\text{amplitude} = \frac{2\,\lvert X[k]\rvert}{N \cdot \text{mean of } w[n]}$$

so a bin-centred sine reads its own amplitude whatever the FFT size and window. The readout line also gives the raw $\lvert X[k]\rvert$.
The dB display is $20\log_{10}$ of this amplitude (0 dB = amplitude 1), and the phase display shows $\angle X[k]$ only for the bins that hold
more than 5% of the peak amplitude (the phase of an empty bin is only numerical noise).

### Sources

The generated signals are computed in the browser at $f_s = 8000$ Hz. They are analysed, not played through the speakers.

| Source | What it shows |
|--------|---------------|
| Sine | One spectral line, and leakage when the frequency is not on a bin |
| Two tones ($f$ and $f + 100$ Hz, amplitudes 1 and 0.5) | Frequency resolution: the tones separate only when the FFT is long enough |
| Square wave | Odd harmonics with amplitudes $4/(\pi k)$ |
| Sawtooth wave | All harmonics with amplitudes $2/(\pi k)$ |
| Sine + white noise | A tone of amplitude 1 in Gaussian noise of standard deviation 1; a longer FFT lowers the noise in each bin |
| Chirp | A sweep from 100 to 3900 Hz every 4 s (950 Hz per second); use it with the spectrogram |
| Microphone | Live audio at the sampling rate of your sound card, shown up to 8 kHz |

The square and sawtooth waves are built from their harmonics below $f_s/2$, so they contain no aliased components.

### Spectrogram

Tick **Spectrogram** and press **Run**. Every 50 ms of signal a new row is added at the top, and the image holds the last 5 s:
frequency runs across, time runs downward and colour shows the level from −80 dB (dark) to 0 dB (bright).

### Microphone

The microphone opens only after you choose **Microphone**, press **Run** and allow access in the browser.
The sound is analysed in your browser and is never played back or sent anywhere. The analyzer reads the raw signal,
with the browser's echo cancellation and noise suppression switched off. **Pause** freezes the last frame; choosing
another source closes the microphone. At a 48 kHz sound card rate and $N = 1024$ the bin spacing is 46.875 Hz.

## Lesson Plan

### Learning Objectives

By the end of this activity, students will be able to:

1. **Compute** the bin spacing and frame length of an FFT from the sampling rate and the FFT size.
2. **Use** the relation $\lvert X[k]\rvert = A\,N/2$ to read the amplitude of a tone from an FFT.
3. **Compare** the leakage of rectangular, Hamming, Hanning, Blackman and Kaiser windows.
4. **Explain** the trade-off between frequency resolution and time resolution when the FFT size changes.
5. **Interpret** a spectrogram of a steady tone, a frequency sweep and live sound.

### Target Audience

Undergraduate students in signals and systems or digital signal processing. Plan 25-30 minutes.

### Prerequisites

- Sampling and the Nyquist frequency
- The DFT and the idea of a frequency bin
- Decibels

### Activities

**Activity 1: Bins and amplitude scaling (5 min).** Choose the sine at 1000 Hz with the rectangular window. For each FFT size
from 128 to 4096, record $\Delta f$, the frame length, the bin number of the peak and the raw $\lvert X[k]\rvert$ from the readout.
Expected: $\Delta f$ halves from 62.5 Hz to 1.953 Hz, the frame grows from 16 ms to 512 ms, the peak moves from bin 16 to bin 512,
and $\lvert X[k]\rvert = N/2$ every time (64 at $N = 128$, 512 at $N = 1024$, 2048 at $N = 4096$) while the amplitude reads 1.000.

**Activity 2: Leakage and windows (10 min).** With $N = 1024$, move the tone to 1004 Hz, about half-way between bins 128 and 129.

- The peak now reads about 0.65 (−3.7 dB) with the rectangular window, 0.86 (−1.4 dB) with Hanning and 0.89 (−1.0 dB) with Blackman.
- Switch to dB and point at a bin 20 bins from the peak. The level is roughly −36 dB (rectangular), −53 dB (Hamming), −87 dB (Hanning)
  and −95 dB (Blackman). Which window would you choose to find a weak tone next to a strong one?
- Return to 1000 Hz: every window now reads amplitude 1.000, and the rectangular window shows a single bin.

**Activity 3: Resolution, harmonics and noise (10 min).**

- Choose the two-tone source at 1000 Hz with the Hanning window. At $N = 128$ only one peak is found; at $N = 256$ two appear,
  near 1000 Hz and 1100 Hz. Relate this to $\Delta f$.
- Choose the square wave at 250 Hz and $N = 4096$. The first three peaks read 1.273, 0.424 and 0.255, matching $4/(\pi k)$ for
  $k = 1, 3, 5$. Switch to the phase display before pressing Run: every harmonic is at −90°, because the square wave is a sum of sines.
- Choose sine + white noise with the rectangular window. Compare $N = 128$ and $N = 4096$ in dB: the tone stays near amplitude 1
  while the noise level in each bin falls by about 15 dB.

**Activity 4: Time against frequency (5-10 min).** Tick **Spectrogram**, choose the chirp, the Hanning window and press **Run**.
At $N = 256$ (a 32 ms frame) the sweep moves only 30 Hz per frame and the peak reads about 0.9. At $N = 4096$ (a 512 ms frame)
the frequency rises 486 Hz during one frame, so the energy spreads over a band a few hundred hertz wide and the peak reads only about 0.13.
Then choose **Microphone**, press **Run** and whistle a rising note or hold a long vowel. A steady note is a vertical line in the
spectrogram; a hissing "s" is a broad band of energy at high frequencies.

### Assessment

1. A signal is sampled at $f_s = 8000$ Hz and analysed with $N = 2048$. What are the bin spacing and the frame length?
   *(Answer: $\Delta f = 8000/2048 = 3.906$ Hz and $N/f_s = 256$ ms.)*
2. A sine of amplitude 1 at 1000 Hz is analysed with $N = 1024$ and a rectangular window. Which bin holds the peak, and what is $\lvert X[k]\rvert$?
   *(Answer: $k = 1000/7.8125 = 128$ and $\lvert X[128]\rvert = N/2 = 512$.)*
3. Why does a 1004 Hz tone read about 0.65 instead of 1 with the rectangular window at $N = 1024$?
   *(Answer: 1004 Hz lies about half-way between two bins, so the frame does not hold a whole number of cycles; the energy leaks into neighbouring bins
   and no single bin sees the full amplitude. A Hanning or Blackman window reduces this scalloping loss.)*
4. Two tones 100 Hz apart are analysed with a Hanning window at $f_s = 8000$ Hz. Why are they resolved at $N = 256$ but not at $N = 128$?
   *(Answer: at $N = 128$, $\Delta f = 62.5$ Hz and the tones are only 1.6 bins apart, inside one Hanning main lobe (4 bins wide); at $N = 256$,
   $\Delta f = 31.25$ Hz and they are 3.2 bins apart, so two separate peaks form.)*
5. Why does the noise in each bin fall by about 15 dB from $N = 128$ to $N = 4096$ while the tone does not change?
   *(Answer: the noise power is shared among about $N/2$ bins, so its amplitude per bin falls as $1/\sqrt{N}$; $10\log_{10}(4096/128) = 15$ dB.
   The tone's energy stays in one bin, and the scaling keeps its amplitude at 1.)*

### Common Misconceptions

- **"The height of an FFT peak is the amplitude of the tone."** The raw DFT value grows with $N$: the readout shows $\lvert X[k]\rvert = 512$ at
  $N = 1024$ and 2048 at $N = 4096$ for the same unit sine. Only after dividing by $N/2$ (and the window's mean) does it read 1.
- **"Leakage is an error in the FFT algorithm."** The same FFT gives one clean line at 1000 Hz and a spread-out peak at 1004 Hz. Leakage comes from
  cutting a frame that does not hold a whole number of cycles, and the window choice trades a wider main lobe for lower side lobes.

## References

1. [Window function](https://en.wikipedia.org/wiki/Window_function) - Wikipedia - definitions and leakage properties of the Hamming, Hanning, Blackman and Kaiser windows
2. [Spectral leakage](https://en.wikipedia.org/wiki/Spectral_leakage) - Wikipedia - why a tone between bins spreads into its neighbours
3. [Kaiser window](https://en.wikipedia.org/wiki/Kaiser_window) - Wikipedia - the Bessel-function window and its $\beta$ parameter
4. [Fast Fourier transform](https://en.wikipedia.org/wiki/Fast_Fourier_transform) - Wikipedia - the algorithm behind the analyzer, including the radix-2 Cooley-Tukey FFT
5. [Spectrogram](https://en.wikipedia.org/wiki/Spectrogram) - Wikipedia - the time-frequency image shown by the Spectrogram option
6. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on the DFT, FFT and windows
7. [p5.sound.js](https://github.com/processing/p5.sound.js) - Processing Foundation - the audio library used to read the microphone
8. Harris, F. J. (1978). On the use of windows for harmonic analysis with the discrete Fourier transform. *Proceedings of the IEEE*, 66(1), 51-83. - the classic comparison of window functions
9. Cooley, J. W., & Tukey, J. W. (1965). An algorithm for the machine calculation of complex Fourier series. *Mathematics of Computation*, 19(90), 297-301. - the paper that introduced the FFT
10. Oppenheim, A. V., & Schafer, R. W. (2010). *Discrete-Time Signal Processing* (3rd ed.). Pearson. - Chapter 10 covers Fourier analysis of signals using the DFT
