---
title: FFT Size MicroSim
description: A sine wave analysed with FFT sizes from 512 to 8192 bins. Larger FFTs give narrower bins and peaks but need a longer analysis window.
image: /sims/fft-size/fft-size.png
og:image: /sims/fft-size/fft-size.png
twitter:image: /sims/fft-size/fft-size.png
social:
   cards: false
quality_score: 100
---

# FFT Size MicroSim

<iframe src="main.html" width="100%" height="582px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/fft-size/main.html" width="100%" height="582px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

[Edit in the p5.js Editor](https://editor.p5js.org/dmccreary/sketches/FNORtTenz)

## Description

This MicroSim plays a pure sine wave $x(t) = A\sin(2\pi f t)$ and analyses it with a Fast Fourier Transform (FFT)
whose size you choose, to show how the FFT size sets the **frequency resolution**: the spacing of the frequency bins
and the width of the spectral peak.

- **Frequency** slider (20-2000 Hz, default 440 Hz) sets $f$; **Amplitude** slider (0-1, default 0.5) sets $A$.
- **FFT Size** radio buttons choose 512, 1024, 2048 (default), 4096 or 8192 bins. The size is the number of bins between 0 Hz and the Nyquist frequency $f_s/2$; each spectrum is computed from the most recent $N = 2 \times \text{size}$ samples.
- **Start/Pause** turns the tone on and off. **Reset** returns the sliders to 440 Hz and 0.5.

The **top plot** (green) shows a stretch of the waveform one window long, $T = N/f_s$. The **bottom plot** (purple)
draws one bar per frequency bin. A gold triangle marks the strongest bin and a gold bracket marks the peak width at
half height. Below the spectrum the MicroSim prints that width and the bin width

$$\Delta f = \frac{f_s}{N}.$$

Because $T = N/f_s$, the product $\Delta f \cdot T = 1$: each doubling of the FFT size halves the bin width and the
peak width, and doubles the length of signal the FFT must see. The browser applies a Blackman window, so the peak is
always about 2.4 bins wide at half height. A sine of amplitude 1 centred on a bin reaches a height of 1.0; the speakers
play the tone at half the displayed amplitude.

This MicroSim supports [Chapter 7: DFT, FFT and Frequency Domain Analysis](../../chapters/07-dft-fft-and-frequency-domain-analysis/index.md#practical-considerations).

## Lesson Plan

### Learning Objectives

By the end of this lesson, students will be able to:

1. **Calculate** the bin width $\Delta f = f_s/N$ and the window length $T = N/f_s$ for a given FFT size and sample rate
2. **Predict** how doubling the FFT size changes the bin width, the width of the spectral peak and the length of the analysis window
3. **Explain** the time-frequency trade-off: a larger FFT resolves frequency more finely only by analysing a longer stretch of signal, because $\Delta f \cdot T = 1$
4. **Explain** why the strongest bin can differ from the true tone frequency by up to half a bin width
5. **Determine** which FFT sizes can separate two tones a given distance apart, using the measured peak width

### Target Audience

College undergraduates in an introductory signal processing course who have just met the FFT.

### Prerequisites

- Sine waves: frequency, period and amplitude
- Sampling and the sample rate $f_s$
- What an FFT spectrum shows (for example, the [Basic FFT MicroSim](../fft-basic/index.md))

### Activities

The numbers below were measured with a 48 kHz audio device. The MicroSim prints the sample rate in the
**Freq Resolution** line; on a 44.1 kHz device the bins are 8% narrower and the read-outs differ slightly.

**Activity 1: Interface tour.**

1. Press **Start** with the defaults (440 Hz, amplitude 0.5, 2048 bins). The Freq Resolution line reads *48000 / 4096 = 11.72 Hz/bin*, and the time axis spans 85.3 ms, so the window holds $440 \times 0.0853 = 37.5$ cycles.
2. Read the spectrum: the strongest bin is at 445.3 Hz, not 440 Hz. Ask why. ($440 / 11.72 = 37.55$, so the tone lies between bin 37 at 433.6 Hz and bin 38 at 445.3 Hz.)
3. Change the amplitude to 0.1 and then to 1.0. The peak height changes from 0.09 to 0.90, but the peak width stays at 28.9 Hz: the width depends on the FFT size, not on the amplitude.

**Activity 2: Peak width and FFT size.** Keep 440 Hz and amplitude 0.5. Select each FFT size in turn and fill in the
table. Expected values at 48 kHz:

| FFT size (bins) | N (samples) | Window $T$ | $\Delta f$ (Hz/bin) | Strongest bin (Hz) | Peak width at half height (Hz) |
|-----------------|-------------|------------|---------------------|--------------------|--------------------------------|
| 512             | 1024        | 21.3 ms    | 46.88               | 421.9              | 113.8                          |
| 1024            | 2048        | 42.7 ms    | 23.44               | 445.3              | 55.6                           |
| 2048            | 4096        | 85.3 ms    | 11.72               | 445.3              | 28.9                           |
| 4096            | 8192        | 170.7 ms   | 5.86                | 439.5              | 13.9                           |
| 8192            | 16384       | 341.3 ms   | 2.93                | 439.5              | 6.9                            |

Each doubling halves $\Delta f$ and the peak width and doubles $T$. At 512 bins the peak is built from a handful of wide
bars; at 8192 bins it is a thin spike. The width is always about 2.4 bins, so the width in hertz is set by $\Delta f$.
(At 44.1 kHz: $\Delta f$ = 43.07, 21.53, 10.77, 5.38 and 2.69 Hz; peak widths 102.1, 52.9, 25.5, 12.8 and 6.7 Hz.)

**Activity 3: How accurate is the strongest bin?** Set the frequency to **1000 Hz**.

1. At 512 bins the strongest bin reads 984.4 Hz, an error of 15.6 Hz.
2. At 2048 bins it reads 996.1 Hz; at 8192 bins, 999.0 Hz.
3. Repeat at **100 Hz**: 93.8 Hz, 105.5 Hz and 99.6 Hz. In every case the error is less than half a bin width ($\Delta f/2$), because the read-out reports the centre of the bin nearest the tone.

**Activity 4: The time-frequency trade-off.** Set 440 Hz and select **8192 bins**.

1. Drag the amplitude slider quickly to 0 and back to 0.5 (about a tenth of a second). The time plot shows a gap in the wave that travels from the right edge (newest samples) to the left across the 341 ms window, and the spectral peak drops while the gap is inside the window.
2. Select **512 bins** and repeat. The 21 ms window is shorter than the gap, so no single frame shows the whole change: the wave simply shrinks, vanishes and returns.
3. Discuss: a long window gives a sharp peak but cannot say exactly *when* something happened inside it; a short window locates changes in time but gives a wide peak. This trade-off is the reason a spectrogram (short-time Fourier transform) needs a window-length setting.

### Assessment

1. With $f_s = 48$ kHz and an FFT size of 4096 bins, what are the bin width and the window length? *(Answer: $N = 8192$ samples, so $\Delta f = 48000 / 8192 = 5.86$ Hz and $T = 8192 / 48000 = 170.7$ ms.)*
2. At $f_s = 44.1$ kHz you need bins no wider than 5 Hz. Which is the smallest FFT size in this MicroSim that meets the requirement? *(Answer: $\Delta f = 44100 / (2 \times \text{size}) \le 5$ requires size $\ge 4410$, so 8192 bins ($\Delta f = 2.69$ Hz). 4096 bins gives 5.38 Hz, which is too wide.)*
3. Two equal-strength tones at 440 Hz and 460 Hz are analysed at 48 kHz. Which FFT sizes show two separate peaks? *(Answer: 4096 and 8192 bins, whose single-tone peaks are 13.9 Hz and 6.9 Hz wide at half height, narrower than the 20 Hz spacing. At 512 to 2048 bins the peaks are 28.9 Hz or wider and generally merge into one.)*
4. Why does a 440 Hz tone read 421.9 Hz at 512 bins and 48 kHz? *(Answer: the bins are 46.88 Hz apart. 440 Hz lies at bin 9.39, between bin 9 (421.9 Hz) and bin 10 (468.8 Hz), and bin 9 is the stronger. The error, 18.1 Hz, is less than half a bin, 23.4 Hz.)*
5. A student wants 1 Hz frequency resolution and also wants to see when a 10 ms click occurs. Can one FFT do both? *(Answer: no. $\Delta f = 1$ Hz needs $T = 1/\Delta f = 1$ s of signal, so the click is somewhere inside a 1 s window and its timing is lost. Because $\Delta f \cdot T = 1$, finer frequency resolution always costs time resolution.)*

### Common Misconceptions

**"A bigger FFT is always better."** A larger FFT gives narrower peaks only because it analyses a longer stretch of
signal. In Activity 4, at 8192 bins each spectrum depends on 341 ms of signal, so a short gap is spread across the whole
analysis; at 512 bins the window is only 21 ms. Larger FFTs also cost more computation, $O(N \log N)$ per spectrum.

**"The FFT reports the exact frequency of the tone."** The FFT measures only at the bin frequencies $k f_s/N$. At 512
bins a 440 Hz tone appears at 421.9 Hz; the read-out approaches 440 Hz only as the bins get narrower.

**"The peak should be a single thin line."** Any finite window spreads a pure tone over several bins: about 2.4 bins at
half height for the Blackman window. The peak narrows in hertz as $N$ grows, but it never becomes a single bin.

### Key Takeaways

- **Bin width:** $\Delta f = f_s/N$. Doubling the FFT size halves the bin width.
- **Peak width:** a pure tone's peak is a fixed number of bins wide (about 2.4 at half height here), so it narrows in proportion to $\Delta f$.
- **Time-frequency trade-off:** the FFT needs $T = N/f_s$ seconds of signal, and $\Delta f \cdot T = 1$. Fine frequency detail costs time detail.
- **Amplitude and width are independent:** amplitude sets the height of the peak; the FFT size sets its width.

### Extension Activities

1. **Predict and verify:** before changing the FFT size, predict the new Freq Resolution and peak width, then check them on screen.
2. **Two tones:** what would the spectrum look like if a second oscillator played 460 Hz? Sketch it for 1024 and 8192 bins, then compare with the [two-oscillator FFT MicroSim](../fft-2-osc/index.md).
3. **Real-world choices:** a guitar tuner must distinguish notes about 6% apart, while a speech analyser must follow changes every 10-20 ms. Which needs a larger FFT, and why?

## References

1. [Fast Fourier transform](https://en.wikipedia.org/wiki/Fast_Fourier_transform) - Wikipedia - the algorithm that computes the spectrum, with its $O(N \log N)$ cost
2. [Discrete Fourier transform](https://en.wikipedia.org/wiki/Discrete_Fourier_transform) - Wikipedia - definition of the frequency bins and their spacing $f_s/N$
3. [Window function](https://en.wikipedia.org/wiki/Window_function) - Wikipedia - the Blackman window and its main-lobe width, which sets the peak width in bins
4. [Spectral leakage](https://en.wikipedia.org/wiki/Spectral_leakage) - Wikipedia - why a pure tone spreads over several bins
5. [Short-time Fourier transform](https://en.wikipedia.org/wiki/Short-time_Fourier_transform) - Wikipedia - the time-frequency resolution trade-off explored in Activity 4
6. [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) - MDN Web Docs - the browser FFT that p5.sound uses, including its Blackman window and FFT size
7. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on the DFT, the FFT and frequency resolution

## Development Notes

<details markdown="1">
<summary>Prompt history</summary>

The original lesson plan was generated from this prompt:

> Please generate a detailed lesson plan with no times for a freshman in college that is getting their first exposure to FFT.  Have them vary the controls and see the impact.  Have them note the width of the peak in the frequency graph.  Have them quickly move the amplitude control and see a packet of waves of a given frequency in the top time domain.  Return the results in markup with

</details>
