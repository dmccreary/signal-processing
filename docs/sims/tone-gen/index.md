---
title: Tone Generator MicroSim
description: A sine-wave tone generator with a live FFT spectrum - hear the tone, set its frequency and amplitude, and watch its single spectral peak move.
image: /sims/tone-gen/tone-gen.png
og:image: /sims/tone-gen/tone-gen.png
twitter:image: /sims/tone-gen/tone-gen.png
social:
   cards: false
quality_score: 100
---

# Tone Generator MicroSim

<iframe src="main.html" width="100%" height="402px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/tone-gen/main.html" width="100%" height="402px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

[Edit in the p5.js Editor](https://editor.p5js.org/dmccreary/sketches/NCgsgPY8y)

## Description

This MicroSim generates a pure sine tone $x(t) = A\sin(2\pi f t)$, plays it through your speakers, and shows its
magnitude spectrum from 0 to 10 kHz, computed live by a Fast Fourier Transform (FFT). Each blue bar shows the strongest
FFT bin in a narrow band of frequencies. Heights are levels in decibels, $L = 20\log_{10}(A)$ dB, so the top of the
plot (0 dB) is a sine of amplitude 1.

- **Start/Stop** turns the tone on and off. Nothing plays until you press Start.
- **Frequency** (20 Hz to 10 kHz, default 440 Hz) sets $f$. You can also press and drag horizontally across the plot:
    the frequency under the pointer is applied, so the peak follows the pointer.
- **Amplitude** (0 to 0.50, default 0.20) sets $A$. The default is deliberately quiet; set your volume low before you
    press Start.

The dashed line marks the frequency you set. The gold triangle marks the strongest FFT bin, and the read-out above the
plot gives that bin's frequency and level. A tone of amplitude 0.20 reads -14.0 dB. The FFT uses $N = 8192$ points, so it
measures only at bins $\Delta f = f_s/N$ apart: 5.86 Hz at a 48 kHz sample rate (5.38 Hz at 44.1 kHz). The read-out
therefore differs from the set frequency by up to half a bin, and a tone that falls between two bins reads up to about
1 dB low because the browser applies a Blackman window. The sample rate and bin width are printed under the plot on wide
screens.

This MicroSim supports [Chapter 2: Signal Frequency](../../chapters/02-introduction-to-signals-and-systems/index.md#signal-frequency)
and previews the spectra of [Chapter 7: DFT, FFT and Frequency Domain Analysis](../../chapters/07-dft-fft-and-frequency-domain-analysis/index.md).

## Lesson Plan

### Learning Objectives

By the end of this lesson, students will be able to:

1. **Identify** the single spectral peak that a pure sine tone produces in the FFT display and read its frequency and level
2. **Predict** how the FFT peak moves along the frequency axis as the tone sweeps from low to high frequency, and relate its position to the pitch they hear
3. **Explain** how horizontal position on the plot maps linearly to a frequency between 20 Hz and 10 kHz
4. **Calculate** the peak level $20\log_{10}(A)$ dB for an amplitude $A$ and verify that halving $A$ lowers the peak by about 6 dB
5. **Explain** why the read-out can differ from the set frequency by up to half a bin width (2.93 Hz at 48 kHz)

### Target Audience

College undergraduates in an introductory signal processing course. The activities take about 20 minutes.

### Prerequisites

- Sine waves: amplitude, frequency and period
- Sound as a pressure wave; frequency and pitch
- Base-10 logarithms (for decibels)

### Activities

The read-outs below were measured with a 48 kHz audio device. On a 44.1 kHz device the bins are 5.38 Hz apart, so the
frequency read-outs differ from these by a few hertz; each is still within half a bin of the set frequency.

**Activity 1: Hear the pitch, see the peak (5 min).**

1. Set your volume low and press **Start** (440 Hz, amplitude 0.20). One narrow peak appears on the dashed line, and the read-out shows *FFT peak: 439.5 Hz, -14.0 dB*.
2. Set the frequency to **220 Hz**. The pitch drops by one octave and the peak moves left (read-out 222.7 Hz).
3. Set **880 Hz** (read-out 878.9 Hz), then **1760 Hz** (read-out 1757.8 Hz). Each doubling raises the pitch by one octave and doubles the peak's distance from 0 Hz.

**Activity 2: Drag the tone across the spectrum (5 min).** Press on the plot at the 1 kHz tick and drag slowly to the
6 kHz tick. The frequency label follows the pointer and the peak stays under it; release on the 6 kHz tick and the
read-out shows close to 6000 Hz. Then compare two equal 1 kHz steps: drag from the 1 kHz tick to the 2 kHz tick, then
from the 8 kHz tick to the 9 kHz tick. Both steps are the same width on the linear axis, but the first is a full octave
(ratio 2) while the second is a ratio of only 1.125, about two semitones, so the first sounds like a much larger change
in pitch.

**Activity 3: Amplitude and decibels (5 min).** Set the frequency to **1500 Hz** (exactly on a bin at 48 kHz) and
complete the table, then compare with $20\log_{10}(A)$.

| Amplitude | Predicted level (dB) | Read-out level (dB) |
|-----------|----------------------|---------------------|
| 0.50      |                      |                     |
| 0.40      |                      |                     |
| 0.20      |                      |                     |
| 0.10      |                      |                     |
| 0.05      |                      |                     |

Expected read-outs: -6.0, -8.0, -14.0, -20.0 and -26.0 dB. Each halving of the amplitude (0.40 to 0.20, 0.20 to 0.10,
0.10 to 0.05) lowers the peak by 6.0 dB, and the peak never moves sideways.

**Activity 4: Frequency resolution (5 min).** Read the bin width under the plot ($48000 / 8192 = 5.86$ Hz). Set
**1500 Hz**: the read-out is exactly 1500.0 Hz because $1500 / 5.859375 = 256$ is a whole bin. Set **1000 Hz**: the
read-out is 1002.0 Hz, the centre of bin 171, because $1000 / 5.859375 = 170.7$. Set **220 Hz**: the read-out is
222.7 Hz (bin 38). In every case the error is at most half a bin, 2.93 Hz.

### Assessment

1. The amplitude is set to 0.25. What level will the FFT peak show at 1500 Hz? *(Answer: $20\log_{10}(0.25) = -12.0$ dB; the read-out shows -12.0 dB.)*
2. With $f_s = 48$ kHz and $N = 8192$, what is the bin width, and why does a 1000 Hz tone read 1002.0 Hz? *(Answer: $48000/8192 = 5.86$ Hz. 1000 Hz lies between bin 170 (996.1 Hz) and bin 171 (1002.0 Hz); it is closer to bin 171, so that bin is the strongest.)*
3. You change the frequency from 440 Hz to 880 Hz without touching the amplitude. What happens to the pitch, the position of the peak and its height? *(Answer: the pitch rises one octave, the peak moves right to twice the frequency (878.9 Hz), and the height stays the same (-14.0 dB before, -14.1 dB after).)*
4. The plot spans 0 to 10 kHz across its width. Where must you press to set about 2500 Hz? *(Answer: one quarter of the way from the 0 tick to the 10 kHz tick, halfway between the 2 and 3 kHz ticks, because the axis is linear.)*
5. After you press Stop, the peak sinks and disappears within a fraction of a second. What does this tell you about where the peak comes from? *(Answer: the FFT only reveals frequencies that are present in the signal; when the tone is silent there is nothing at 440 Hz to show.)*

### Common Misconceptions

**"A louder tone has a higher frequency."** Amplitude and frequency are independent. At 440 Hz, change the amplitude from
0.10 to 0.40: the peak rises from -20.0 dB to -8.0 dB but stays at 439.5 Hz, and the pitch does not change.

**"Doubling the amplitude doubles the level in decibels."** Decibels are logarithmic: doubling the amplitude adds
$20\log_{10}(2) = 6.0$ dB. Activity 3 shows -20.0 dB at 0.10 and -14.0 dB at 0.20, not -40 dB.

**"The FFT measures the exact frequency."** It measures the energy in bins a fixed distance apart. A 1000 Hz tone reads
1002.0 Hz at 48 kHz because the nearest bin centre is at 1002.0 Hz.

## References

1. [Sine wave](https://en.wikipedia.org/wiki/Sine_wave) - Wikipedia - amplitude, frequency and period of the pure tone the oscillator generates
2. [Pitch (music)](https://en.wikipedia.org/wiki/Pitch_%28music%29) - Wikipedia - how the frequency of a tone relates to the pitch we hear, including octaves
3. [Decibel](https://en.wikipedia.org/wiki/Decibel) - Wikipedia - the $20\log_{10}$ amplitude ratio used for the level axis
4. [Fast Fourier transform](https://en.wikipedia.org/wiki/Fast_Fourier_transform) - Wikipedia - the algorithm that computes the spectrum
5. [Window function](https://en.wikipedia.org/wiki/Window_function) - Wikipedia - the Blackman window and why a tone between bins reads slightly low
6. [OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode) - MDN Web Docs - the Web Audio source behind the p5.sound oscillator
7. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on the DFT and the FFT
