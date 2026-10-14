---
title: Interactive STFT Spectrogram Analyzer
description: Compare two spectrograms of the same signal, one computed with a short STFT window and one with a long window, and measure time and frequency with cursors to see what each window can and cannot separate.
image: /sims/interactive-stft-spectrogram-analyzer/interactive-stft-spectrogram-analyzer.png
og:image: /sims/interactive-stft-spectrogram-analyzer/interactive-stft-spectrogram-analyzer.png
twitter:image: /sims/interactive-stft-spectrogram-analyzer/interactive-stft-spectrogram-analyzer.png
social:
   cards: false
quality_score: 100
---

# Interactive STFT Spectrogram Analyzer

<iframe src="main.html" height="612px" width="100%" scrolling="no"></iframe>

[Run the Interactive STFT Spectrogram Analyzer MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit in the p5.js Editor](https://editor.p5js.org/)

## About This MicroSim

The discrete-time short-time Fourier transform of a signal $x[n]$ with window $w[n]$ is

$$X[m,k] = \sum_{n=0}^{N-1} x[n+mH]\,w[n]\,e^{-j2\pi kn/N}$$

where $m$ is the frame index, $k$ the frequency bin, $N$ the window length and $H$ the hop size.
This MicroSim computes it **twice** for the same signal, with a window length A and a window length B, and stacks the two spectrograms
on one time axis so that they can be compared directly.

**The test signal** is built from parts that you switch on and off ($f_s = 8000$ Hz; the display shows 250 to 750 ms and 0 to 2000 Hz):

| Component | Description | What it tests |
|-----------|-------------|---------------|
| Two tones | Steady sinusoids at 500 Hz and 500 Hz + the tone spacing | Frequency resolution |
| Two clicks | Single-sample impulses at 500 ms and 500 ms + the click spacing | Time resolution |
| Chirp | A tone that rises steadily, from 1300 Hz at the left edge to 1700 Hz at the right edge | Both at once |
| Noise | White Gaussian noise | Robustness of what you see |

**Reading the display.**

- The **waveform** at the top shows a teal bar and a purple bar: the samples that window A and window B use at the time cursor.
- Each **spectrogram** caption gives the window's time span $\Delta t = N/f_s$ and bin spacing $\Delta f = f_s/N$, followed by the two
  spacings in the window's own units: the tone spacing in bins and the click spacing in window lengths.
- Beside each spectrogram is the **spectrum of the frame at the cursor**, drawn sideways on the same frequency axis.
- Colour runs from −60 dB (dark) to 0 dB (bright), where 0 dB is a steady sinusoid of amplitude 1.

**What to expect.** Two tones show as two separate lines only if they are about two or more bins apart. Two clicks show as two separate
vertical lines only if they are about one window length or more apart. Since $\Delta t \times \Delta f = 1$, making one of these easier makes the other harder.
With the default spacings (100 Hz and 20 ms) window A separates the clicks and merges the tones, and window B does the opposite.

When both clicks fall inside one long window, the spectrum of that frame shows evenly spaced ripples. Two impulses $\tau$ seconds apart
have a spectrum that rises and falls every $1/\tau$ hertz, so the spacing of the ripples still carries the time information that the picture has lost.

## How to Use

1. **Click** in either spectrogram to place the cursor at a time and frequency. Click or drag in the waveform to move the time cursor only.
2. **Point** at another feature without clicking. The box at the upper right reports the distance from the cursor to the pointer in milliseconds and hertz.
3. Move the **Window A** and **Window B** sliders (32 to 2048 samples) and watch the two pictures and their captions.
4. Change the **Tone spacing** and **Click spacing** to make the test easier or harder.
5. Tick **Chirp** or **Noise** to add components, and try the other **Window types** and **Hop sizes**.

## Iframe Embed Code

You can add this MicroSim to any web page by adding this to your HTML:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/interactive-stft-spectrogram-analyzer/main.html"
        height="612px"
        width="100%"
        scrolling="no"></iframe>
```

## Lesson Plan

### Learning Objectives

By the end of this activity, students will be able to:

1. **Compare** spectrograms of one signal made with a short and a long window.
2. **Predict** from the window length whether two tones or two clicks will be separated.
3. **Measure** time and frequency separations on a spectrogram with cursors.
4. **Justify** a choice of window length, window type and hop size for a given signal.

### Grade Level

Undergraduate (digital signal processing)

### Duration

25-30 minutes

### Prerequisites

- The DFT, bin spacing and window functions
- The idea of a spectrogram
- Sampling rate and sample period

### Activities

1. **Exploration** (5 min): With the default settings, describe how the tones and the clicks appear in spectrogram A ($N = 64$) and in spectrogram B ($N = 1024$).
2. **Guided Practice** (15 min):
    - Use the cursor and pointer to measure the tone spacing in B and the click spacing in A. Compare with the slider values.
    - Step window A through 32, 64, 128, 256 and 512. For each, record the tone spacing in bins, the click spacing in windows and whether each pair is separated.
      With 100 Hz and 20 ms, the tones separate from $N = 256$ upward and the clicks only up to $N = 128$.
    - Is there any window length that separates both pairs? Now raise the tone spacing to 200 Hz and try $N = 128$. Explain the result using $\Delta t \times \Delta f = 1$.
    - Set window B to 1024 and put the cursor on the clicks. Measure the spacing of the ripples in the frame spectrum and compare it with $1/(20\ \text{ms}) = 50$ Hz.
    - Add the chirp. Which window draws it as the thinnest line? Why is that neither the shortest nor the longest window?
    - Switch the window type from Hann to rectangular. What happens to the area around the tones, and why?
    - Change the hop size from $N/8$ to $N$. What is lost when frames do not overlap? Does a smaller hop improve the resolution?
3. **Discussion** (5-10 min): A spectrogram of speech must show both the pitch harmonics of vowels (about 100 Hz apart) and the bursts of plosive consonants
   (a few milliseconds long). Why do speech scientists use two kinds of spectrogram, "wideband" and "narrowband"?

### Assessment

- Student predicts, before moving the slider, whether a given window separates two tones or two clicks.
- Student explains why no single window length can make both resolutions arbitrarily fine.
- Student recommends STFT settings for a described signal and defends them.

## References

1. Allen, J. B., & Rabiner, L. R. (1977). A unified approach to short-time Fourier analysis and synthesis. *Proceedings of the IEEE*, 65(11), 1558-1564.
2. Cohen, L. (1995). *Time-Frequency Analysis*. Prentice Hall.
3. [Short-time Fourier transform](https://en.wikipedia.org/wiki/Short-time_Fourier_transform), Wikipedia.
4. [Chapter 8: Advanced Transforms](../../chapters/08-advanced-transforms/index.md) of this textbook.
5. The related [Time-Frequency Analysis Explorer](../time-frequency-analysis-explorer/index.md) shows a single spectrogram with adjustable overlap, colour map and scale.
