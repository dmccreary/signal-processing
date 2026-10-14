---
title: FFT with Two Oscillators
description: A sine and a cosine oscillator are added and played; see their sum in the time domain and one FFT peak per oscillator in the magnitude spectrum.
image: /sims/fft-2-osc/fft-2-osc.png
og:image: /sims/fft-2-osc/fft-2-osc.png
twitter:image: /sims/fft-2-osc/fft-2-osc.png
social:
   cards: false
quality_score: 100
---

# FFT with Two Oscillators

<iframe src="main.html" width="100%" height="522px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/fft-2-osc/main.html" width="100%" height="522px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

[Edit in the p5.js Editor](https://editor.p5js.org/dmccreary/sketches/XnH57-jNr)

## Description

This MicroSim adds two oscillators, a sine wave and a cosine wave, plays the sum through your speakers, and shows it
in two ways at once:

$$x(t) = A_1 \sin(2\pi f_1 t) + A_2 \cos(2\pi f_2 t)$$

The **top plot** (green) is the time domain: a 20 ms window of the sum, triggered at a rising zero crossing so a
periodic sum holds still like an oscilloscope trace. The read-out gives the largest value of $|x(t)|$ in the window.
The vertical range is $\pm 1$, and switches to $\pm 2$ when $A_1 + A_2$ is larger than 1.
The **bottom plot** (purple) is the frequency domain: the magnitude spectrum from 0 to 2100 Hz computed by a
Fast Fourier Transform (FFT). Gold markers and the read-out give the frequency and height of the two strongest peaks.

- **Sine Freq** and **Sine Amp** (20-2000 Hz, default 440 Hz; 0-1, default 0.50) set $f_1$ and $A_1$.
- **Cosine Freq** and **Cosine Amp** (20-2000 Hz, default 880 Hz; 0-1, default 0.30) set $f_2$ and $A_2$.
- **Start/Pause** turns both tones on and off. **Mute** silences the speakers while the plots keep running.

Each oscillator produces its own peak, at its own frequency, with a height proportional to its own amplitude. This is
superposition: the spectrum of a sum is the sum of the spectra. The two waves start at the same instant, the cosine a
quarter cycle ahead of the sine. Moving a frequency slider changes their relative phase, which changes the shape of
the sum but not the magnitude spectrum.

This MicroSim supports [Chapter 7: DFT, FFT and Frequency Domain Analysis](../../chapters/07-dft-fft-and-frequency-domain-analysis/index.md#magnitude-spectrum).

### The Fast Fourier Transform

The FFT is an algorithm that computes the Discrete Fourier Transform (DFT), which converts a block of $N$ samples from
the time domain into $N$ frequency bins. It reduces the work from $O(N^2)$ to $O(N \log N)$ operations, which is what
makes real-time spectrum displays like this one possible. This MicroSim uses $N = 16384$, so the bins are
$\Delta f = f_s / N$ apart: 2.93 Hz when your audio device runs at $f_s = 48$ kHz (2.69 Hz at 44.1 kHz). The sample rate
and bin width are printed under the spectrum on wide screens.

Heights are scaled so that a sine of amplitude 1 centred on a bin reaches 1.0. The browser applies a Blackman window
before the FFT, so a tone that falls between two bins reads up to about 12% lower. The speakers play the sum at one
quarter of the displayed amplitude to protect listeners; the FFT analyses the full signal.

## Lesson Plan

### Learning Objectives

By the end of this lesson, students will be able to:

1. **Identify** the frequency and amplitude of each oscillator from the position and height of its peak in the magnitude spectrum
2. **Explain** why the spectrum of a sum of two sinusoids contains one peak for each sinusoid (superposition)
3. **Predict** how changing one oscillator's frequency or amplitude changes both the time-domain sum and the spectrum
4. **Demonstrate** that the relative phase of the two components changes the shape of the sum but not its magnitude spectrum
5. **Relate** the smallest frequency separation at which two peaks can be told apart to the FFT bin width

### Target Audience

College undergraduates in an introductory signal processing course. The activities take about 25 minutes.

### Prerequisites

- Sine and cosine functions; frequency, period and amplitude
- The idea that an FFT shows which frequencies a signal contains (see the [Basic FFT MicroSim](../fft-basic/index.md))

### Activities

The read-outs below were measured with a 48 kHz audio device. On a 44.1 kHz device the frequencies differ by up to
about 3 Hz and the heights by a few hundredths, because the bins fall in different places.

**Activity 1: Two tones, two peaks (5 min).** Keep the defaults (sine 440 Hz at 0.50, cosine 880 Hz at 0.30) and press
**Start**. The spectrum shows two peaks; the read-out gives *439.5 Hz (0.49), 878.9 Hz (0.28)*. The sum repeats every
$1/440$ s = 2.27 ms, so the pattern appears 8.8 times in the 20 ms window. *Max |x(t)|* reads 0.80: the two waves
reach $-0.5$ and $-0.3$ at the same instant, so the sum dips to $-0.8$.

**Activity 2: Each slider controls its own peak (5 min).**

1. Set **Cosine Amp** to 0. Only the 439.5 Hz peak remains (0.49), and the time plot becomes a pure sine with a maximum of 0.50.
2. Set **Sine Amp** to 0 and **Cosine Amp** back to 0.30. Only the 878.9 Hz peak remains (0.28); the maximum is 0.30.
3. Set both amplitudes to 1.00. The peaks rise to 0.98 and 0.93, the time axis switches to $\pm 2$, and *Max |x(t)|* reads 2.00 (both waves still reach $-1$ at the same instant).

Key point: changing one oscillator never moves or resizes the other oscillator's peak.

**Activity 3: Phase changes the shape, not the spectrum (5 min).** Reload the page, press **Start**, and sketch the
waveform (*Max |x(t)|* = 0.80). Drag **Cosine Freq** to 900 Hz and straight back to 880 Hz. The settings are the same as
before, but the waveform usually has a different shape: in our tests *Max |x(t)|* read between 0.70 and 0.80 after a detour.
The peaks still read 439.5 Hz (0.49) and 878.9 Hz (0.28). The detour shifted the relative phase of the two waves;
for $0.5\sin\theta + 0.3\sin(2\theta + \varphi)$ the maximum of $|x|$ ranges from 0.69 to 0.80 depending on $\varphi$,
while the magnitude spectrum ignores $\varphi$ completely.

**Activity 4: Beats and frequency resolution (7 min).**

1. Set the sine to 440 Hz at 0.50 and the cosine to 450 Hz at 0.50. You hear a tone that swells and fades 10 times a second (the beat frequency $|f_2 - f_1| = 10$ Hz). In the time plot the wave's height pulses and *Max |x(t)|* jumps between about 0.3 and 1.0. The spectrum shows two separate peaks: 439.5 Hz (0.49) and 451.2 Hz (0.46).
2. Set **Cosine Freq** to 446 Hz. There are still two peaks (439.5 Hz and 445.3 Hz), now only 6 Hz (about two bins) apart.
3. Set **Cosine Freq** to 442 Hz. Now the spectrum shows a single peak at 442.4 Hz whose height rises and falls (roughly between 0.3 and 0.8) in step with the 2 beats per second you hear. The tones are closer together than the FFT can resolve.

With 2.93 Hz bins and the Blackman window, two equal tones need to be about two bins (5-6 Hz) apart to appear as separate
peaks. At 444-445 Hz the display flickers between one peak and two.

### Assessment

1. The sine is set to 300 Hz at amplitude 0.50 and the cosine to 900 Hz at amplitude 0.25. Describe the spectrum. *(Answer: two peaks, at 300 Hz and 900 Hz, the second about half as tall as the first; the MicroSim reads 298.8 Hz (0.46) and 899.4 Hz (0.25) at 48 kHz.)*
2. A cosine and a sine of the same frequency and amplitude produce the same peak. Why? *(Answer: $\cos\theta = \sin(\theta + 90^\circ)$, so the two differ only in phase, and the magnitude spectrum does not show phase.)*
3. With the defaults (440 Hz + 880 Hz), how often does the summed waveform repeat? *(Answer: every $1/440$ s = 2.27 ms. 880 Hz is the second harmonic of 440 Hz, so the sum has the period of the 440 Hz tone.)*
4. Two tones at 440 Hz and 447 Hz are played together. How many peaks does the FFT show, and how many beats per second do you hear? *(Answer: two peaks, because 7 Hz is more than two bins (5.86 Hz) apart; the MicroSim reads 439.5 Hz and 448.2 Hz. You hear 7 beats per second.)*
5. Why does the 880 Hz peak read 0.28 instead of 0.30? *(Answer: 880 Hz lies 0.37 of a bin away from the nearest bin centre (878.9 Hz). The Blackman window lowers the reading of a tone that falls between bins.)*

### Common Misconceptions

**"Adding a second wave changes the first wave's spectrum."** Each oscillator keeps its own peak. With the defaults
running, move **Cosine Amp** from 0 to 1: the 878.9 Hz peak grows, while the 439.5 Hz peak stays at 0.49.

**"Two waveforms that look different must have different spectra."** The shape of a sum depends on the relative phase
of its components, but the magnitude spectrum does not. Activity 3 produces different-looking waveforms with identical
peak read-outs.

## References

1. [Fast Fourier transform](https://en.wikipedia.org/wiki/Fast_Fourier_transform) - Wikipedia - the algorithm that computes the spectrum in the bottom plot
2. [Superposition principle](https://en.wikipedia.org/wiki/Superposition_principle) - Wikipedia - why the spectrum of a sum is the sum of the spectra
3. [Beat (acoustics)](https://en.wikipedia.org/wiki/Beat_%28acoustics%29) - Wikipedia - the slow loudness pulsing heard when two tones are close in frequency
4. [Window function](https://en.wikipedia.org/wiki/Window_function) - Wikipedia - the Blackman window, main-lobe width, and why a tone between bins reads low
5. [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) - MDN Web Docs - the browser FFT that p5.sound uses for the spectrum and the waveform
6. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on the DFT and the FFT

## Development Notes

This MicroSim was ported from p5.js 1.9 to p5.js 2.3.2 and p5.sound 0.4.1 in October 2026. Changes a returning
user will notice:

- Sound starts only after **Start** is pressed (browsers block audio until a click). The Pause button is now
  labelled **Start** while the tones are off.
- The second oscillator is now a true cosine. The old library had no cosine type and silently played a sine.
- The spectrum is plotted on a linear scale, so peak heights are proportional to the amplitudes. The old dB-style
  plot drew the default 0.50 and 0.30 tones at nearly the same height (235 and 217 out of 255).
- The time plot gained a trigger, a 20 ms time axis, amplitude ticks and a *Max |x(t)|* read-out; the spectrum gained
  frequency ticks, peak markers and a peak read-out.
