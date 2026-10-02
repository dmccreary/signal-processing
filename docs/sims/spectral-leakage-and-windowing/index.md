---
title: Spectral Leakage and Windowing
description: Move a tone between DFT bin centres to see spectral leakage, then compare how rectangular, Hamming, Hanning, Blackman and Kaiser windows trade main-lobe width against side-lobe level.
image: /sims/spectral-leakage-and-windowing/spectral-leakage-and-windowing.png
og:image: /sims/spectral-leakage-and-windowing/spectral-leakage-and-windowing.png
twitter:image: /sims/spectral-leakage-and-windowing/spectral-leakage-and-windowing.png
social:
   cards: false
quality_score: 100
---

# Spectral Leakage and Windowing

<iframe src="main.html" height="632px" width="100%" scrolling="no"></iframe>

[Run the Spectral Leakage and Windowing MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit in the p5.js Editor](https://editor.p5js.org/)

## About This MicroSim

A DFT of $N$ samples taken at rate $f_s$ has bins every $\Delta f = f_s/N$. A sinusoid whose frequency is a whole
number of bins completes a whole number of cycles in the record, and all of its energy lands in one bin.
Any other frequency **leaks**: its energy spreads over every bin. Observing a signal for a finite time is the same as
multiplying it by a window $w[n]$, and the spectrum that results is the true spectrum convolved with the transform of that window.

This MicroSim uses $f_s = 1024$ Hz and shows four plots:

1. **Time signal** $x[n]$, with the number of cycles in the record.
2. **Window function** $w[n]$.
3. **Windowed signal** $x_w[n] = x[n]\,w[n]$, the sequence that is actually transformed.
4. **Magnitude spectrum** in dB from 0 to 128 Hz. The red dots are the $N$ bins of the DFT. The thin grey curve underneath is the
   continuous spectrum (the DTFT) that the bins sample, found with a zero-padded FFT. The level is scaled so that a
   bin-centred sinusoid of amplitude 1 reads 0 dB.

The banner turns green when the tone is exactly on a bin and red when it is between bins.

**What the indicators mean.** The numbers in the table are measured from the transform of the selected window, not looked up:

| Quantity | Meaning |
|----------|---------|
| Main lobe (null to null) | Width of the central lobe of the window's transform, shaded on the spectrum around the tone. It sets how close two tones can be and still be told apart |
| −3 dB width | Width of the main lobe where it has fallen by 3 dB |
| Peak side lobe | Height of the largest side lobe relative to the main lobe, drawn as the dashed line. It sets how weak a tone can be next to a strong one and still be seen |
| Scalloping loss | How much lower the highest bin reads when the tone is half-way between two bins |
| Coherent gain | Mean value of the window; the factor by which a window lowers a bin-centred peak before the display corrects for it |

For the four fixed windows the simulation measures:

| Window | Main lobe (bins) | Peak side lobe | Scalloping loss |
|--------|------------------|----------------|-----------------|
| Rectangular | 2 | −13.3 dB | 3.92 dB |
| Hanning | 4 | −31.5 dB | 1.42 dB |
| Hamming | 4 | −42.7 dB | 1.75 dB |
| Blackman | 6 | −58.1 dB | 1.10 dB |

The pattern is the trade-off of windowing: lower side lobes are paid for with a wider main lobe. The **Kaiser** window makes
the trade adjustable. Its parameter $\beta$ runs from 0 (identical to the rectangular window) upward, widening the main lobe and
lowering the side lobes as it grows.

## How to Use

1. Start with the single sinusoid and the rectangular window. Press **Bin centre**, then **Half-way**, and compare the two spectra.
2. Drag the **Frequency** slider slowly (it moves in steps of 0.1 Hz) and watch the dots slide along the grey curve.
3. Change the **Window** and read the table. Select Kaiser to enable the **β** slider.
4. Change the **FFT size**. The bins move closer together and the main lobe becomes narrower in hertz, though not in bins.
5. Try the other two signals: two sinusoids 6 Hz apart, and a strong sinusoid with a second one 24 Hz higher and 40 dB weaker.
6. Move the mouse over the spectrum to read the frequency and level under the cursor.

## Iframe Embed Code

You can add this MicroSim to any web page by adding this to your HTML:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/spectral-leakage-and-windowing/main.html"
        height="632px"
        width="100%"
        scrolling="no"></iframe>
```

## Lesson Plan

### Learning Objectives

By the end of this activity, students will be able to:

1. **Explain** spectral leakage as a consequence of observing a signal for a finite time.
2. **Predict** whether a tone will leak from its frequency and the bin spacing.
3. **Compare** windows by main-lobe width, peak side-lobe level and scalloping loss.
4. **Choose** a window for resolving two close tones or for finding a weak tone near a strong one.

### Grade Level

Undergraduate (digital signal processing)

### Duration

25-30 minutes

### Prerequisites

- The DFT and frequency bins
- Decibels
- Multiplication in time as convolution in frequency

### Activities

1. **Exploration** (5 min): Rectangular window, $N = 256$, so $\Delta f = 4$ Hz. Predict which of 56, 58, 60 and 61 Hz will leak, then check each.
   For the tones that do not leak, where do the other bins sit on the grey curve?
2. **Guided Practice** (15 min):
    - Press **Half-way** and record the level of the highest bin for each window. Compare it with the scalloping loss in the table.
    - Fill in a table of main-lobe width and peak side-lobe level for the four fixed windows. Which window has the narrowest main lobe? The lowest side lobes?
    - Choose **Two close sinusoids** with $N = 256$ and the tone on a bin centre. The tones are 1.5 bins apart. Which windows show a dip between them?
      Raise $N$ to 512 and explain what changed.
    - Choose **Strong + weak sinusoid** and press **Half-way**. With the rectangular window the weak tone at −40 dB is buried. Which windows reveal it?
      Now press **Bin centre** with the rectangular window. Why can the weak tone suddenly be seen?
    - Select the Kaiser window and find the value of $\beta$ whose side lobes match the Hamming window (about 5.9) and the Blackman window (about 7.9).
      Compare the main-lobe widths.
3. **Discussion** (5-10 min): A vibration engineer needs accurate amplitudes of a few well-separated tones. A radar engineer needs to find a weak echo
   next to a strong one. A musician wants to separate two notes a semitone apart in a short recording. Which window property matters most to each?

### Assessment

- Student explains why a bin-centred tone shows no leakage with the rectangular window even though the window's transform has side lobes.
- Student ranks the windows by main-lobe width and by side-lobe level and states the trade-off.
- Student justifies a choice of window and FFT size for a given measurement.

## References

1. Harris, F. J. (1978). On the use of windows for harmonic analysis with the discrete Fourier transform. *Proceedings of the IEEE*, 66(1), 51-83.
2. Oppenheim, A. V., & Schafer, R. W. (2010). *Discrete-Time Signal Processing* (3rd ed.). Pearson. Chapter 10 covers the effect of windowing on Fourier analysis.
3. [Spectral leakage](https://en.wikipedia.org/wiki/Spectral_leakage) and [Window function](https://en.wikipedia.org/wiki/Window_function), Wikipedia.
4. [Chapter 7: DFT, FFT and Frequency Domain Analysis](../../chapters/07-dft-fft-and-frequency-domain-analysis/index.md) of this textbook.
