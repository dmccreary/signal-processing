---
title: FFT of Sound File
description: A music player with a track list that shows the waveform and the FFT frequency spectrum of the song you are listening to.
image: /sims/fft-sound-file/fft-sound-file.png
og:image: /sims/fft-sound-file/fft-sound-file.png
twitter:image: /sims/fft-sound-file/fft-sound-file.png
social:
   cards: false
quality_score: 100
---

# FFT of Sound File

<iframe src="main.html" width="100%" height="322px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/fft-sound-file/main.html" width="100%" height="322px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

[Edit in the p5.js Editor](https://editor.p5js.org/dmccreary/sketches/XZy4_ReBY)

## Description

This MicroSim is a small music player that shows what you are hearing. Pick a track from the **Track** list and
press **Play**. The **red bars** are the magnitude spectrum computed by a fast Fourier transform (FFT): each
bar shows how much energy the music has at one frequency. The **black line** is the waveform, the air pressure
over the last instant of time. The spectrum updates continuously as the music changes.

| Control | What it does |
|---------|--------------|
| **Track** | Chooses a song from the list. A newly chosen track starts from the beginning. |
| **Play / Pause** | Starts and pauses the music. Switching tracks while playing keeps playing. |
| **Volume** | Sets the playback level (it does not change the shape of the spectrum, only how loud you hear it). |
| **Range** | Zooms the frequency axis: 0-5 kHz, 0-10 kHz or the full range up to the Nyquist frequency. |
| **Your file** | Loads an audio file from your own computer to analyze. |

The analyzer uses an FFT of 1024 bins that spans 0 Hz up to the Nyquist frequency, half the sample rate, so
each bin is $f_s / (2 \times 1024)$ wide: about 23.4 Hz at a 48 kHz sample rate.

This simulation is used in [Chapter 7: DFT, FFT and Frequency Domain Analysis](../../chapters/07-dft-fft-and-frequency-domain-analysis/index.md).

### Audio Sources and Licences

| Track | Source | Licence |
|-------|--------|---------|
| Classical Pop (Instrumental) | Pro Sensory (Alex McCulloch), [OpenGameArt](https://opengameart.org/content/classical-pop-instrumental) | CC0 (public domain). Credit is appreciated but not required. |
| Dancing Tiger | Damscray, the sample file from the p5.js examples | Licence not yet verified. |
| Sugar | Maroon 5 | Commercial recording kept only as a temporary placeholder; it is being replaced with an openly licensed track. |

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Describe** what the red spectrum bars and the black waveform line each represent.
2. **Identify** the frequency range that contains most of a track's energy.
3. **Compute** the frequency of an FFT bin from its index, the FFT size and the sample rate.
4. **Compare** the spectra of different recordings and explain the differences.
5. **Predict** what the spectrum of a recording will look like before playing it, then check the prediction.

### Target Audience

College-level introductory signal processing, audio engineering or music technology students.
Plan 15-20 minutes.

### Prerequisites

- Frequency, amplitude and the idea of a sinusoid
- The sampling theorem and the Nyquist frequency (Chapter 5)
- What a spectrum is (Chapter 7 introduction)

### Activities

**Activity 1: Where is the energy? (5 min).** Play *Classical Pop (Instrumental)* with the range set to
0-10 kHz. Note the highest frequency where bars are clearly visible. Most of the visible energy lies below
about 3 kHz, with only isolated small peaks higher up.

**Activity 2: Zoom in (5 min).** Change the range to 0-5 kHz. The tall bars bunch together at low frequencies.
Look for groups of peaks that are evenly spaced: these are the harmonics of a single note.

**Activity 3: Waveform vs spectrum (5 min).** Pause the music. The waveform and spectrum freeze. Press Play and
watch both for a few seconds. Which of the two changes more smoothly, and why?

**Activity 4: Your own sound (5 min).** Use **Your file** to load a spoken-voice recording or a different style
of music. Before it plays, sketch the spectrum you expect. Then compare.

### Assessment

1. At a 48 kHz sample rate and an FFT of 1024 bins covering 0 Hz to the Nyquist frequency, what frequency is
   bin 100? *(Answer: $100 \times 24000 / 1024 = 2343.75$ Hz.)*
2. What is the highest frequency this player can show for a recording sampled at 44.1 kHz?
   *(Answer: the Nyquist frequency, 22.05 kHz.)*
3. The waveform looks like a smooth wiggle but the spectrum has many tall bars. How can both describe the same
   sound? *(Answer: the waveform is the sum of many sinusoids; the spectrum lists how strong each one is.)*
4. Why does lowering the Volume not change the shape of the spectrum bars much? *(Answer: Volume scales the
   whole signal; the bars are drawn on a decibel scale, so a uniform scaling moves every bar by the same
   amount.)*

### Common Misconceptions

Students often assume a tall bar at one frequency means the music contains one note there. A single musical
note produces a peak at its fundamental frequency and further peaks at whole-number multiples of it (its
harmonics), so one note appears as a family of evenly spaced bars.

## References

1. [Fast Fourier transform](https://en.wikipedia.org/wiki/Fast_Fourier_transform) - Wikipedia - the algorithm that computes the spectrum shown here
2. [Spectrum analyzer](https://en.wikipedia.org/wiki/Spectrum_analyzer) - Wikipedia - what instruments and software that display a spectrum like this one do
3. [Nyquist frequency](https://en.wikipedia.org/wiki/Nyquist_frequency) - Wikipedia - why the display stops at half the sample rate
4. [Harmonic series (music)](https://en.wikipedia.org/wiki/Harmonic_series_(music)) - Wikipedia - why one note produces several evenly spaced peaks
5. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on the DFT and FFT
6. [p5.sound.js](https://github.com/processing/p5.sound.js) - Processing Foundation - the audio library used by this MicroSim
7. [Classical Pop (Instrumental)](https://opengameart.org/content/classical-pop-instrumental) - OpenGameArt - the CC0 track included in the player
