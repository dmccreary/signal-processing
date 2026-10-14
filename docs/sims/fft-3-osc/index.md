---
title: FFT with Multiple Frequency Components
description: Three sine-wave oscillators are added together - the combined waveform in the time domain and its FFT spectrum with one labelled peak per component.
image: /sims/fft-3-osc/fft-3-osc.png
og:image: /sims/fft-3-osc/fft-3-osc.png
twitter:image: /sims/fft-3-osc/fft-3-osc.png
social:
   cards: false
quality_score: 100
---

# FFT with Multiple Frequency Components

<iframe src="main.html" width="100%" height="582px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/fft-3-osc/main.html" width="100%" height="582px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

<!-- TODO(user): add the p5.js editor link once this sketch is saved in editor.p5js.org.
The previous page linked to https://editor.p5js.org/dmccreary/sketches/oDP6EoAQ6, which is the
Basic FFT sketch (the same link appears on the fft-basic page), not this one. -->

## Description

This MicroSim adds three sine waves and plays the result through your speakers:

$$x(t) = a_1\sin(2\pi f_1 t) + a_2\sin(2\pi f_2 t) + a_3\sin(2\pi f_3 t)$$

The **top plot** (blue) is the time domain: a 20 ms window of the combined waveform, triggered like an
oscilloscope so that a repeating waveform holds still. The **bottom plot** (red) is the frequency domain: the
magnitude spectrum from 0 to 1600 Hz computed by a Fast Fourier Transform (FFT), with the frequency of each
peak printed above it.

- **Freq 1, Freq 2, Freq 3** set $f_1$, $f_2$ (50-1000 Hz) and $f_3$ (50-1500 Hz). Each peak moves with its slider.
- **Amp 1, Amp 2, Amp 3** (0-1) set $a_1$, $a_2$, $a_3$. A peak's height equals its amplitude to within about 12%.
- **Master** (0-0.35) sets the loudness. **Start** turns the sound on; the same button then mutes and unmutes it.

The FFT measures the three oscillators *before* the Master volume, so Master and Mute change only what you hear;
both plots always show $a_1$, $a_2$, $a_3$. The amplitude axis grows from $\pm 1$ to $\pm 2$ or $\pm 3$ when
$a_1 + a_2 + a_3$ requires it, because the combined wave can never exceed that sum.

The FFT bins are $f_s/8192$ apart: 5.86 Hz on a 48 kHz audio device (5.38 Hz at 44.1 kHz). Each label shows the
centre of the strongest bin, so a 400 Hz tone is labelled 398 Hz at 48 kHz. Two tones 15 Hz apart still show as
two peaks; 10 Hz apart they merge into one.

This MicroSim supports [Chapter 7: DFT, FFT and Frequency Domain Analysis](../../chapters/07-dft-fft-and-frequency-domain-analysis/index.md#magnitude-spectrum).
Try the [Basic FFT MicroSim](../fft-basic/index.md) first for a single sine wave.

## Lesson Plan

### Learning Objectives

By the end of this lesson, students will be able to:

1. **Predict** that setting the three frequency sliders to distinct values produces three separate peaks in the FFT spectrum at those frequencies
2. **Explain** how the complicated time-domain waveform arises from the superposition of three sine waves whose amplitudes are set by the amplitude sliders
3. **Compare** the height of each spectral peak to its oscillator's amplitude setting to relate FFT magnitude to component amplitude
4. **Predict** what happens to the spectrum when two oscillators are tuned to the same or nearly the same frequency, or when one amplitude is set to zero
5. **Distinguish** the time-domain plot, which shows amplitude against time, from the frequency-domain plot, which shows magnitude against frequency

### Target Audience

College undergraduates in an introductory signal processing course. The lab takes about 25 minutes.

### Prerequisites

- Sine waves: frequency, period and amplitude
- The single-tone [Basic FFT MicroSim](../fft-basic/index.md): one sine wave gives one spectral peak
- Adding functions point by point (superposition)

### Activities

The read-outs below were measured on a 48 kHz audio device. On a 44.1 kHz device the bins fall in different
places, so the labels can differ by a few hertz.

**Activity 1: Three tones, three peaks (5 min).**

1. Press **Start** with the default settings (400, 800 and 1200 Hz, each amplitude 0.30). Three peaks appear, labelled 398 Hz, 803 Hz and 1201 Hz, each about 0.3 high.
2. Count the repeats of the waveform. It repeats every 2.5 ms (8 times in the window) because 800 Hz and 1200 Hz are harmonics of 400 Hz.
3. Set **Amp 3** to 0. The 1201 Hz peak disappears and the waveform becomes simpler; nothing else in the spectrum changes.

**Activity 2: Peak height follows amplitude (5 min).**

1. Set the frequencies to 250, 500 and 1000 Hz and the amplitudes to 0.8, 0.4 and 0.2.
2. The peaks read 252 Hz at about 0.76, 498 Hz at about 0.38 and 1002 Hz at about 0.19: each is half as tall as the one before, like the amplitudes.
3. Move **Master** from 0.25 to 0.05. The sound becomes much quieter, but neither plot changes.

**Activity 3: Repeating and non-repeating sums (5 min).**

1. Set 300, 600 and 900 Hz (all amplitudes 0.3). The waveform repeats every $1/300$ s $= 3.33$ ms (6 times in the window) and holds still.
2. Set 440, 550 and 660 Hz. These are the 4th, 5th and 6th harmonics of 110 Hz, so the waveform repeats every 9.09 ms and still holds still, even though no tone is at 110 Hz and the spectrum has no peak there.
3. Change Freq 2 from 800 to **803 Hz** with Freq 1 = 400 and Freq 3 = 1200. The sum no longer repeats within the window and the trace changes from frame to frame, while the spectrum still shows three steady peaks.

**Activity 4: When do two peaks become one? (8 min).**

1. Set Freq 1 = 400 Hz and Freq 2 = 450 Hz, both amplitudes 0.5 (keep Freq 3 = 1200 Hz). Two peaks appear, labelled 398 Hz and 451 Hz.
2. Lower Freq 2 to **420 Hz** and then **415 Hz**. The two peaks move closer (398 and 416 Hz at 415 Hz) but stay separate.
3. Lower Freq 2 to **410 Hz**. Only one peak remains, and its height pulses between about 0.4 and 0.7. Listen: the sound beats 10 times per second ($410 - 400 = 10$ Hz).
4. Set Freq 2 = **400 Hz**. One steady peak remains, but its height depends on how the two waves line up. In repeated trials it settled anywhere from 0.30 to 0.95: it can be any value from 0 to 1.0.

### Assessment

1. You set 300, 600 and 900 Hz, each with amplitude 0.3. Describe the spectrum and the repetition period of the waveform. *(Answer: three peaks near 300, 600 and 900 Hz (labelled 299, 598 and 902 Hz at 48 kHz), each about 0.3 high; the waveform repeats every 3.33 ms, the period of the 300 Hz fundamental.)*
2. A spectrum shows only a peak at 500 Hz of height 0.6 and a peak at 1000 Hz of height 0.2. Write a signal that produces it. *(Answer: $x(t) = 0.6\sin(2\pi\cdot 500t) + 0.2\sin(2\pi\cdot 1000t)$. A cosine or a phase shift in either term gives the same magnitude spectrum, because the magnitude spectrum carries no phase information.)*
3. Why is a 400 Hz tone labelled 398 Hz on a 48 kHz device? *(Answer: the bins are $48000/8192 = 5.86$ Hz apart. 400 Hz lies between bin 68 (398.4 Hz) and bin 69 (404.3 Hz); the label shows the centre of the stronger bin.)*
4. Two oscillators both play 400 Hz with amplitude 0.5. What heights can the 400 Hz peak have, and why? *(Answer: anything from 0 to 1.0. Equal-frequency sines add like phasors: $|0.5 + 0.5e^{j\phi}| = |\cos(\phi/2)|$, which depends on the phase difference $\phi$.)*
5. You move Master from 0.25 to 0.10. What happens to the sound and to the plots? *(Answer: the sound drops by $20\log_{10}(0.10/0.25) \approx -8$ dB; the plots do not change, because the FFT measures the oscillators before the Master volume.)*

### Common Misconceptions

**"A complicated waveform must contain many frequencies."** The jagged trace from 400, 800 and 1200 Hz contains
exactly three. The spectrum shows three peaks and nothing at sums or differences such as $600 + 900 = 1500$ Hz in
Activity 3, because adding signals (superposition) creates no new frequencies.

**"Two tones always show up as two peaks, and equal tones add to $a_1 + a_2$."** Activity 4 shows both limits:
tones 10 Hz apart merge into one pulsing peak, and two tones at exactly the same frequency become a
single sine whose amplitude depends on their phase difference.

## References

1. [Superposition principle](https://en.wikipedia.org/wiki/Superposition_principle) - Wikipedia - why the sum of sines contains only the frequencies that were added
2. [Fast Fourier transform](https://en.wikipedia.org/wiki/Fast_Fourier_transform) - Wikipedia - the algorithm that computes the spectrum in the bottom plot
3. [Harmonic](https://en.wikipedia.org/wiki/Harmonic) - Wikipedia - integer multiples of a fundamental frequency, and why harmonic sums repeat
4. [Spectral leakage](https://en.wikipedia.org/wiki/Spectral_leakage) - Wikipedia - why each tone spreads over a few bins and why close tones merge
5. [Beat (acoustics)](https://en.wikipedia.org/wiki/Beat_%28acoustics%29) - Wikipedia - the pulsing heard when two tones are a few hertz apart
6. [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) - MDN Web Docs - the browser FFT (Blackman window) that p5.sound uses for the spectrum and the waveform
7. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on the DFT and the FFT
