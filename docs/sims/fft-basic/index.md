---
title: Basic FFT MicroSim
description: A sine-wave generator with its live FFT - the waveform in the time domain on top and its magnitude spectrum below, with frequency and amplitude sliders.
image: /sims/fft-basic/fft-basic.png
og:image: /sims/fft-basic/fft-basic.png
twitter:image: /sims/fft-basic/fft-basic.png
social:
   cards: false
quality_score: 95
---

# Basic FFT MicroSim

<iframe src="main.html" width="100%" height="522px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/fft-basic/main.html" width="100%" height="522px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

[Edit in the p5.js Editor](https://editor.p5js.org/dmccreary/sketches/oDP6EoAQ6)

## Description

This MicroSim generates a pure sine wave $x(t) = A\sin(2\pi f t)$, plays it through your speakers, and shows it two ways at once.
The **top plot** (green) is the time domain: a 20 ms window of the waveform, triggered on a rising zero crossing so the
wave holds still like an oscilloscope trace. The **bottom plot** (purple) is the frequency domain: the magnitude
spectrum from 0 to 2100 Hz computed by a Fast Fourier Transform (FFT).

- **Frequency** slider (20-2000 Hz, default 440 Hz) sets $f$. The wave completes $f \times 0.020$ cycles in the window, and the spike moves to $f$.
- **Amplitude** slider (0-1, default 0.5) sets $A$. The wave height and the spike height both scale with $A$; the spike does not move.
- **Start/Pause** turns the tone on and off. **Reset** returns the sliders to 440 Hz and 0.5.

The read-out above the spectrum gives the centre frequency and height of the strongest FFT bin. The FFT uses
$N = 16384$ points, so its bins are $\Delta f = f_s / N$ apart: 2.93 Hz when your audio device runs at $f_s = 48$ kHz
(2.69 Hz at 44.1 kHz). The sample rate and bin width are printed under the spectrum on wide screens. A 440 Hz tone falls
between two bins, so at 48 kHz the read-out shows 439.5 Hz. Heights are scaled so that a sine of amplitude 1 centred on a
bin reaches 1.0; because the browser applies a Blackman window, a tone that falls between bins reads up to about 12% lower.
The speakers play the tone at half the displayed amplitude to protect listeners; the FFT analyses the full signal.

This MicroSim supports [Chapter 7: DFT, FFT and Frequency Domain Analysis](../../chapters/07-dft-fft-and-frequency-domain-analysis/index.md#domain-representations).

## Lesson Plan

### Learning Objectives

By the end of this lesson, students will be able to:

1. **Explain** that the FFT decomposes a time-domain waveform into the frequencies it contains
2. **Predict** that raising the frequency slider shortens the period in the time-domain plot and shifts the spectral peak to the right in the frequency-domain plot
3. **Predict** that increasing the amplitude slider raises both the waveform and the spectral peak in proportion while leaving the peak's frequency unchanged
4. **Distinguish** the time-domain display, which plots amplitude against time, from the frequency-domain display, which plots magnitude against frequency
5. **Identify** the frequency of a pure sine wave from the location of its single spectral peak and from the number of cycles in the 20 ms window

### Target Audience

College freshmen in an introductory signal processing course. The lab takes about 20 minutes.

### Prerequisites

- Basic trigonometry
- Familiarity with sine waves (period, frequency, amplitude)

### Materials and Setup

- Computer with a web browser and audio output
- This MicroSim
- Headphones or speakers (optional but recommended)
- The student worksheet in the activities below
- Whiteboard or projector for demonstrations

**Student setup.** Open the MicroSim, set the computer volume to a comfortable level, and find the two plots (top and
bottom), the two sliders, the Start and Reset buttons, and the red PAUSED status indicator.

**Instructor setup.** Project the MicroSim for a class demonstration, have the example frequencies 220 Hz, 440 Hz and
880 Hz ready, and prepare simple sine-wave sketches on the whiteboard.

### Lesson Introduction

**Hook: the musical connection.** Ask: "When you hear a musical note, what makes it different from noise?" Students may
mention pitch, tone or harmony. Lead toward the idea that a musical note has a specific frequency.

**Core concept.** "Today we will analyse a signal - music, voice, or an electronic signal - by breaking it into its
frequency components."

**Key terms.** Write these on the board:

- **Time domain:** how a signal changes over time (what an oscilloscope shows)
- **Frequency domain:** which frequencies are present in a signal and how strong each one is
- **FFT (Fast Fourier Transform):** a fast algorithm that converts a sampled time-domain signal into the frequency domain

The read-outs quoted below were measured with a 48 kHz audio device. On a 44.1 kHz device the frequencies differ by up
to about 3 Hz and the heights by a few hundredths, because the bins fall in different places.

### Activities

**Activity 1: Interface tour and first observations (8 min).**

1. Before pressing Start (440 Hz, amplitude 0.5): the top plot is a flat line and the spectrum is empty. Ask: "What do you see in both displays right now?"
2. Press **Start**. A green sine wave appears with 8.8 cycles in the 20 ms window ($440 \times 0.020$), and a purple spike appears at 440 Hz. The read-out shows *Strongest bin: 439.5 Hz, magnitude 0.49*. Ask: "Where is the spike? Why there?"
3. Set the frequency to **220 Hz**. The wave stretches out to 4.4 cycles and the spike moves left (read-out 219.7 Hz).
4. Set the frequency to **880 Hz**. The wave compresses to 17.6 cycles and the spike moves right (read-out 878.9 Hz). Ask: "Can you predict the pattern?"

Key point: one sine wave in time always produces exactly one spike in frequency.

**Activity 2: Amplitude exploration (7 min).**

1. Set the frequency to 440 Hz and change the amplitude from 0.5 to **0.1**. The wave shrinks to peaks of $\pm 0.1$ and the spike drops to a height of 0.10. Ask: "What changed? What stayed the same?"
2. Set the amplitude to **1.0**. The wave reaches the $\pm 1$ gridlines and the spike reaches 0.98.
3. Worksheet: set the frequency to 500 Hz and complete the table.

| Amplitude | Time-domain wave height | Frequency spike height |
|-----------|-------------------------|------------------------|
| 0.1       |                         |                        |
| 0.3       |                         |                        |
| 0.7       |                         |                        |
| 1.0       |                         |                        |

Expected spike heights: 0.09, 0.28, 0.66 and 0.95. Each is about 0.95 times the amplitude (500 Hz falls between two
bins), so the spike height is proportional to the amplitude. Key point: amplitude changes the height in both domains but
not the frequency location.

**Activity 3: Frequency prediction (5 min).**

1. Set the frequency to **100 Hz** and press Start. The window holds exactly 2 cycles and the spike is at the far left (read-out 99.6 Hz).
2. Predict where the spike and the wave will be at 200 Hz, then test it. The spike moves to 199.2 Hz and the window holds 4 cycles.
3. Find the setting that puts the spike on the 1000 Hz tick. At 1000 Hz the read-out shows 999.0 Hz: discuss why the FFT reports the nearest bin rather than the exact frequency.

**Activity 4: Musical notes (5 min).** Set each note and listen while you watch the spike:

- C4: 262 Hz (read-out 260.7 Hz)
- E4: 330 Hz (read-out 331.1 Hz)
- G4: 392 Hz (read-out 392.6 Hz)
- C5: 523 Hz (read-out 524.4 Hz)

Higher pitch puts the spike further to the right. C5 is one octave above C4, and its spike sits at almost exactly twice
the frequency ($523 / 262 \approx 2.0$).

### Class Discussion and Wrap-up

Ask students to share:

- "What surprised you most about the relationship between time and frequency?"
- "How would you explain the FFT to a friend in simple terms?"

Connect to the real world:

- **Music production:** equalizers and spectrum analysers show frequency content
- **Medical imaging:** MRI reconstructs images with Fourier transforms
- **Communication:** mobile networks place many signals in separate frequency channels
- **Audio compression:** MP3 encoders use frequency analysis to discard sounds we cannot hear

Preview of the next lesson: "What will the frequency domain look like when two sine waves play at the same time?"

### Assessment

1. A student sets the frequency to 250 Hz. Where does the spike appear, and how many complete cycles fit in the 20 ms window? *(Answer: at 250 Hz (the read-out shows 249.0 Hz at 48 kHz); $250 \times 0.020 = 5$ cycles.)*
2. At a fixed frequency the amplitude is changed from 0.2 to 0.6. What happens to the height and the position of the spike? *(Answer: the height triples because the spectrum magnitude is proportional to amplitude; the position does not change.)*
3. You count 6 complete cycles in the 20 ms window. What frequency is the generator set to? *(Answer: $6 / 0.020\ \text{s} = 300$ Hz; the spike confirms it, with a read-out of 298.8 Hz at 48 kHz.)*
4. Why does the read-out show 439.5 Hz rather than 440 Hz for a 440 Hz tone at $f_s = 48$ kHz? *(Answer: the FFT measures only at bins spaced $48000 / 16384 \approx 2.93$ Hz apart. 440 Hz lies between bin 150 (439.45 Hz) and bin 151 (442.38 Hz), and the read-out reports the centre of the stronger bin.)*
5. Predict the spectrum of a signal that contains 300 Hz at amplitude 0.5 and 900 Hz at amplitude 0.25. *(Answer: two spikes, one at 300 Hz and one at 900 Hz, with the second about half as tall as the first.)*

**Assessment rubric (formative, during the lesson).**

- **Excellent (4):** correctly predicts the effects of frequency and amplitude and explains the reasoning
- **Proficient (3):** makes correct observations with minimal guidance
- **Developing (2):** participates but needs significant guidance
- **Beginning (1):** struggles to make basic observations

**Worksheet assessment.**

- Understanding of the FFT: identifies that a sine wave creates a single spike, explains the relationship between the two domains, and shows that amplitude affects height, not position
- Problem solving: makes accurate predictions about frequency changes, uses the MicroSim to test hypotheses, and records observations accurately

### Common Misconceptions

**"Higher frequency means a taller spike."** Frequency moves the spike sideways; only the amplitude changes its height.
With the amplitude at 0.5, move the frequency from 220 Hz to 880 Hz: the spike moves right while its height stays near
0.5 (0.50 and 0.47).

**"The time-domain wave and the frequency spike should look similar."** They show different information. A smooth wave
with 8.8 cycles in the window becomes one narrow spike at 440 Hz.

**"The FFT creates the frequencies."** The FFT only reveals frequencies that are already in the signal, the way a prism
reveals colours already present in white light. Press Pause: the signal goes silent and the spike decays to nothing.

### Extension Activities

For advanced students:

1. **Research challenge:** look up the definition of the discrete Fourier transform. How does the bin spacing $f_s/N$ explain the read-out values in Activity 3?
2. **Real-world connection:** find an example of frequency analysis in your own field (engineering, music, medicine).

For students needing support:

1. **Visual summary:** draw a sine wave and its frequency spike, with labelled axes.
2. **Analogy:** invent an analogy that explains why we need both the time and the frequency representation.

### Homework

1. In your own words, explain what the Fast Fourier Transform does and why it is useful.
2. Describe a situation where you would analyse a signal in the frequency domain rather than the time domain.
3. Using the MicroSim, put the spike on the 1000 Hz mark. Explain how you found the setting and why the read-out may not show exactly 1000 Hz.
4. **Creative application:** if you were designing a music app, how could you use frequency-domain analysis? Describe at least two features.

### Instructor Notes

- **Audio not working:** students must click Start (browsers block sound until a click) and check that the tab is not muted. The speakers play the tone at half the displayed amplitude.
- **Display too small:** use browser zoom, or open the MicroSim full screen.
- **Running behind:** skip the worksheet table in Activity 2.
- **Ahead of schedule:** discuss frequency resolution. This MicroSim uses a 16,384-point FFT, giving 2.93 Hz bins at 48 kHz; a 1,024-point FFT would give 46.9 Hz bins ($48000 / 1024$), too coarse to separate 440 Hz from 460 Hz.
- **Differentiation:** visual learners can sketch both plots; auditory learners can listen with headphones while sweeping the frequency; kinesthetic learners can explore freely with the sliders.
- **Accommodations:** allow verbal worksheet answers, give English-language learners a vocabulary list of the key terms, and ask advanced students about sampling rate and frequency resolution.

## References

1. [Fast Fourier transform](https://en.wikipedia.org/wiki/Fast_Fourier_transform) - Wikipedia - the algorithm that computes the spectrum shown in the bottom plot
2. [Discrete Fourier transform](https://en.wikipedia.org/wiki/Discrete_Fourier_transform) - Wikipedia - definition of the frequency bins and their spacing $f_s/N$
3. [Frequency domain](https://en.wikipedia.org/wiki/Frequency_domain) - Wikipedia - time-domain and frequency-domain views of the same signal
4. [Window function](https://en.wikipedia.org/wiki/Window_function) - Wikipedia - the Blackman window and why a tone between bins reads slightly low
5. [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) - MDN Web Docs - the browser FFT that p5.sound uses for the spectrum and the waveform
6. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on the DFT and the FFT
