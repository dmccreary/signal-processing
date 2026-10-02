---
title: Time-Frequency Analysis Explorer
description: Compute the spectrogram of a chirp, a frequency-shift-keyed signal or a sequence of notes, and change the window length, overlap and window type of the short-time Fourier transform to see the trade-off between time resolution and frequency resolution.
image: /sims/time-frequency-analysis-explorer/time-frequency-analysis-explorer.png
og:image: /sims/time-frequency-analysis-explorer/time-frequency-analysis-explorer.png
twitter:image: /sims/time-frequency-analysis-explorer/time-frequency-analysis-explorer.png
social:
   cards: false
quality_score: 100
---

# Time-Frequency Analysis Explorer

<iframe src="main.html" height="607px" width="100%" scrolling="no"></iframe>

[Run the Time-Frequency Analysis Explorer MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit in the p5.js Editor](https://editor.p5js.org/)

## About This MicroSim

A single Fourier transform says which frequencies a signal contains but not *when* they occur. The short-time Fourier transform (STFT)
answers both questions by transforming one short frame after another:

$$X[m,k] = \sum_{n=0}^{N-1} x[n + mH]\,w[n]\,e^{-j2\pi kn/N}$$

Frame $m$ holds $N$ samples starting at sample $mH$, where $H$ is the hop size, multiplied by a window $w[n]$.
A **spectrogram** is a picture of $\lvert X[m,k]\rvert$ with time across, frequency upward and colour for level.

The signal is one second long, sampled at $f_s = 8000$ Hz. The display has three plots:

1. **Waveform** with a red time cursor. The shaded band shows the $N$ samples of the frame at the cursor.
2. **Spectrogram**. Each frame is drawn at the centre of its $N$ samples and each bin at its centre frequency, so every coloured
   rectangle is one value of $X[m,k]$. The grey strips at the two ends are times for which no complete window fits.
3. **Spectrum at the cursor**, drawn sideways so that it shares the frequency axis of the spectrogram. The dashed line marks the
   frequency the signal really has at that instant, and the colour bar underneath is the key to the spectrogram colours.

**The trade-off.** A window of $N$ samples spans a time $\Delta t = N/f_s$ and gives bins spaced $\Delta f = f_s/N$ apart, so

$$\Delta t \times \Delta f = 1$$

whatever $N$ is. A long window separates close frequencies but smears anything that changes during the window.
A short window follows fast changes but gives wide frequency bins. This is the uncertainty principle of time-frequency analysis:
both resolutions cannot be made fine together.

| Window length $N$ | 32 | 64 | 128 | 256 | 512 | 1024 |
|-------------------|----|----|-----|-----|-----|------|
| Time span $\Delta t$ (ms) | 4 | 8 | 16 | 32 | 64 | 128 |
| Bin spacing $\Delta f$ (Hz) | 250 | 125 | 62.5 | 31.25 | 15.6 | 7.8 |

**Overlap** sets the hop size, $H = N(1 - \text{overlap})$. More overlap gives more frames and a smoother picture along the time axis,
but it does not improve the resolution: that is fixed by $N$.

**Signals.** The chirp sweeps linearly from 500 to 3500 Hz. The frequency-shift-keyed (FSK) signal sends 16 bits, each 62.5 ms long,
as a 1 kHz or a 2 kHz tone. The note sequence plays C5, E5, G5, C6 and G5, each a plucked tone with three harmonics.
All three are synthesized by the MicroSim; no recorded audio is used.

## How to Use

1. Click or drag in the waveform or the spectrogram to move the time cursor.
2. Move the **Window length** slider and watch the cells of the spectrogram change shape: tall and narrow for a short window, flat and wide for a long one.
3. Move the **Overlap** slider and read the hop size and the number of frames in the box at the upper right.
4. Point at the spectrogram to read the time, frequency and level of the cell under the mouse.
5. Change the **Window**, the **Colour map** and the **Scale** (magnitude in dB, linear magnitude or linear power).

## Iframe Embed Code

You can add this MicroSim to any web page by adding this to your HTML:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/time-frequency-analysis-explorer/main.html"
        height="607px"
        width="100%"
        scrolling="no"></iframe>
```

## Lesson Plan

### Learning Objectives

By the end of this activity, students will be able to:

1. **Explain** why a spectrogram is needed for a signal whose frequency content changes with time.
2. **Compute** the time span, bin spacing and hop size of an STFT from the window length, sampling rate and overlap.
3. **Analyze** how the window length trades time resolution against frequency resolution.
4. **Choose** STFT settings that suit a given signal.

### Grade Level

Undergraduate (digital signal processing)

### Duration

20-25 minutes

### Prerequisites

- The DFT, bin spacing and window functions
- Spectral leakage
- Sampling rate and sample period

### Activities

1. **Exploration** (5 min): With the chirp, step the window length from 32 to 1024. Sketch the ridge at 32, 256 and 1024. What does a chirp look like in a spectrogram?
2. **Guided Practice** (15 min):
    - For each window length, compute $\Delta t$ and $\Delta f$ and check them against the banner. Verify that their product is always 1.
    - Chirp: the ridge is thinnest near $N = 128$ to $256$ and becomes thicker again at 512 and 1024. The chirp rises 3000 Hz per second.
      How far does its frequency move during a 128 ms window? Use that to explain why the longest window is not the sharpest.
    - FSK: at $N = 64$, put the cursor on a bit boundary and read how wide each tone is in frequency. At $N = 1024$ the tones are thin lines,
      but both appear at once for most cursor positions. Why? (Each bit lasts 62.5 ms.) Which window length would you use to read the bits?
    - Notes: which window length lets you tell E5 (659 Hz) from G5 (784 Hz)? Which shows the start of each note most sharply? Find the harmonics of one note.
    - With $N = 256$, change the overlap from 0% to 90%. Record the hop size and the number of frames. What improved and what did not?
    - With the chirp, compare the rectangular and Hanning windows on the dB scale. Where does the leakage of the rectangular window show up in the picture?
3. **Discussion** (5 min): Speech analysis commonly uses windows of 20 to 30 ms. Music analysis often uses longer ones.
   What does each choice give up?

### Assessment

- Student computes $\Delta t$, $\Delta f$ and $H$ for given settings.
- Student explains why no window length gives sharp time and sharp frequency together.
- Student justifies a window length for the FSK signal and a different one for the note sequence.

## References

1. Allen, J. B., & Rabiner, L. R. (1977). A unified approach to short-time Fourier analysis and synthesis. *Proceedings of the IEEE*, 65(11), 1558-1564.
2. Oppenheim, A. V., & Schafer, R. W. (2010). *Discrete-Time Signal Processing* (3rd ed.). Pearson. Chapter 10 covers the time-dependent Fourier transform.
3. [Short-time Fourier transform](https://en.wikipedia.org/wiki/Short-time_Fourier_transform) and [Spectrogram](https://en.wikipedia.org/wiki/Spectrogram), Wikipedia.
4. [Chapter 7: DFT, FFT and Frequency Domain Analysis](../../chapters/07-dft-fft-and-frequency-domain-analysis/index.md) of this textbook.
