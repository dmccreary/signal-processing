---
title: FFT Spectrum Analyzer
description: Analyze generated test signals or the microphone with a radix-2 FFT, choosing the FFT size, the window function and a magnitude, dB or phase display, with peak markers, a cursor readout and a scrolling spectrogram.
image: /sims/fft-spectrum-analyzer/fft-spectrum-analyzer.png
og:image: /sims/fft-spectrum-analyzer/fft-spectrum-analyzer.png
twitter:image: /sims/fft-spectrum-analyzer/fft-spectrum-analyzer.png
social:
   cards: false
quality_score: 100
---

# FFT Spectrum Analyzer

<iframe src="main.html" height="607px" width="100%" scrolling="no"></iframe>

[Run the FFT Spectrum Analyzer MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit in the p5.js Editor](https://editor.p5js.org/)

## About This MicroSim

A spectrum analyzer takes a frame of $N$ samples, multiplies it by a window function $w[n]$ and computes the DFT

$$X[k] = \sum_{n=0}^{N-1} x[n]\,w[n]\,e^{-j2\pi kn/N}$$

with a Fast Fourier Transform. This MicroSim does exactly that, with its own radix-2 FFT, on each frame.

- **Upper plot**: the frame of $N$ samples before the window (grey) and after it (blue).
- **Lower plot**: the spectrum from 0 to $f_s/2$. Bin $k$ sits at frequency $f = k\,\Delta f$, where $\Delta f = f_s/N$ is the bin spacing shown in the banner.
- Orange markers label the strongest peaks. Move the mouse over the spectrum to read one bin.

**How the vertical axis is scaled.** A sine of amplitude $A$ whose frequency falls exactly on a bin gives $\lvert X[k]\rvert = A\,N/2$
with a rectangular window, and $A\,N/2$ times the mean of the window otherwise. The magnitude displays divide that out:

$$\text{amplitude} = \frac{2\,\lvert X[k]\rvert}{N \cdot \text{mean of } w[n]}$$

so a bin-centred sine reads its own amplitude whatever the FFT size and window. The readout line also gives the raw $\lvert X[k]\rvert$.
The dB display is $20\log_{10}$ of this amplitude, and the phase display shows $\angle X[k]$ for the bins that hold more than 5% of the peak amplitude
(the phase of an empty bin is only numerical noise).

**Sources.** The generated signals are sampled at $f_s = 8000$ Hz:

| Source | What it shows |
|--------|---------------|
| Sine | One spectral line, and leakage when the frequency is not on a bin |
| Two tones ($f$ and $f + 100$ Hz, amplitudes 1 and 0.5) | Frequency resolution: the tones separate only when the FFT is long enough |
| Square wave | Odd harmonics with amplitudes $4/(\pi k)$ |
| Sawtooth wave | All harmonics with amplitudes $2/(\pi k)$ |
| Sine + white noise | A tone of amplitude 1 in noise of standard deviation 1; a longer FFT lowers the noise in each bin |
| Chirp | A sweep from 100 to 3900 Hz every 4 s; use it with the spectrogram |
| Microphone | Live audio at the sampling rate of your sound card, shown up to 8 kHz |

The square and sawtooth waves are built from their harmonics below $f_s/2$, so they contain no aliased components.

**Spectrogram.** Tick **Spectrogram** and press **Run**. Every 50 ms of signal a new row is added at the top:
frequency runs across, time runs downward and colour shows the level from −80 dB (dark) to 0 dB (bright).

## How to Use

1. With the sine source, set the frequency to 1000 Hz and the FFT size to 1024. The tone is on bin 128 and the spectrum is one clean line.
2. Change the frequency by a few hertz and watch the line spread out. Switch the **Display** to dB to see how far the leakage reaches.
3. Try each **Window** and compare the height of the peak and the level far from it.
4. Change the **FFT size** and read the new bin spacing and frame length in the banner.
5. Press **Run** to let time advance. Run starts paused, and the microphone starts only after you press it and give permission.

## Iframe Embed Code

You can add this MicroSim to any web page by adding this to your HTML:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/fft-spectrum-analyzer/main.html"
        height="607px"
        width="100%"
        scrolling="no"></iframe>
```

If the page that embeds the MicroSim is on a different site, add `allow="microphone"` to the iframe so that the microphone source can work.

## Lesson Plan

### Learning Objectives

By the end of this activity, students will be able to:

1. **Compute** the bin spacing and frame length of an FFT from the sampling rate and the FFT size.
2. **Use** the relation $\lvert X[k]\rvert = A\,N/2$ to read the amplitude of a tone from an FFT.
3. **Compare** the leakage of rectangular, Hamming, Hanning, Blackman and Kaiser windows.
4. **Explain** the trade-off between frequency resolution and time resolution when the FFT size changes.

### Grade Level

Undergraduate (signals and systems, digital signal processing)

### Duration

25-30 minutes

### Prerequisites

- Sampling and the Nyquist frequency
- The DFT and the idea of a frequency bin
- Decibels

### Activities

1. **Exploration** (5 min): Sine at 1000 Hz, rectangular window. For each FFT size from 128 to 4096, record $\Delta f$,
   the bin number of the peak and the raw $\lvert X[k]\rvert$ from the readout. Check that $\lvert X[k]\rvert = N/2$ every time.
2. **Guided Practice** (15 min):
    - With $N = 1024$, move the tone to 1004 Hz, half-way between bins 128 and 129. The peak now reads about 0.65 (−3.7 dB)
      with the rectangular window. Repeat with the Hanning window (about 0.86, −1.4 dB) and the Blackman window (about 0.89, −1.0 dB).
    - Still at 1004 Hz, switch to dB and point at a bin about 20 bins from the peak. Record the level for each window
      (roughly −36 dB rectangular, −53 dB Hamming, −87 dB Hanning, −95 dB Blackman). Which window would you choose to find a weak tone next to a strong one?
    - Choose the two-tone source at 1000 Hz with the Hanning window. At $N = 128$ only one peak is found. What is the smallest FFT size that shows two? Relate it to $\Delta f$.
    - Choose the square wave at 250 Hz and $N = 4096$. Read the amplitudes of the first three peaks and compare them with $4/(\pi k)$: 1.273, 0.424 and 0.255.
      Then switch to the phase display.
    - Choose sine + white noise. Compare the spectrum at $N = 128$ and at $N = 4096$. The tone stays near amplitude 1 while the noise in each bin falls by about 15 dB. Why?
3. **Apply** (5-10 min): Tick Spectrogram, choose the chirp and press Run. Then switch to the microphone and whistle a rising note, or speak a long vowel.
   What do you see for a steady note, and for a consonant such as "s"?

### Assessment

- Student computes $\Delta f$ and the frame length for a given $f_s$ and $N$.
- Student explains why the same tone reads a lower amplitude when it lies between two bins.
- Student chooses and justifies a window for a stated measurement task.

## References

1. Harris, F. J. (1978). On the use of windows for harmonic analysis with the discrete Fourier transform. *Proceedings of the IEEE*, 66(1), 51-83.
2. Cooley, J. W., & Tukey, J. W. (1965). An algorithm for the machine calculation of complex Fourier series. *Mathematics of Computation*, 19(90), 297-301.
3. Oppenheim, A. V., & Schafer, R. W. (2010). *Discrete-Time Signal Processing* (3rd ed.). Pearson. Chapter 10 covers Fourier analysis of signals using the DFT.
4. [Chapter 6: Fourier Analysis Fundamentals](../../chapters/06-fourier-analysis-fundamentals/index.md) of this textbook.
