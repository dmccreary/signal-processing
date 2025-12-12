---
title: FFT Waveform Types - Compare Harmonic Content
description: Interactive simulation showing how different waveform shapes (sine, square, triangle, sawtooth) appear in frequency domain
image: /sims/fft-waveform-types/fft-waveform-types.png
og:image: /sims/fft-waveform-types/fft-waveform-types.png
twitter:image: /sims/fft-waveform-types/fft-waveform-types.png
social:
   cards: false
quality_score: 65
---
# FFT Waveform Types MicroSim

<iframe src="main.html" height="500" scrolling="no" style="overflow: hidden;"></iframe>

You can include this MicroSim in your course by pasting the following HTML directly into your web page.

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/fft-waveform-types/main.html" 
  height="500px" scrolling="no" style="overflow: hidden;"></iframe>
```

[Run the FFT Waveform Types MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
[Edit this MicroSim](https://editor.p5js.org/){ .md-button }

## About this MicroSim

This interactive simulation demonstrates how different waveform shapes appear in both time and frequency domains. It helps students understand the fundamental relationship between waveform shape and harmonic content by showing:

- **Time Domain** (top): The actual waveform shape over time
- **Frequency Domain** (bottom): The FFT spectrum showing which frequencies are present

### Supported Waveforms

1. **Sine Wave** - Pure tone with only the fundamental frequency
2. **Square Wave** - Contains odd harmonics (1st, 3rd, 5th...) with 1/n amplitude decay
3. **Triangle Wave** - Contains odd harmonics with 1/n² amplitude decay (much smoother spectrum than square)
4. **Sawtooth Wave** - Contains all harmonics (1st, 2nd, 3rd...) with 1/n amplitude decay

### Interactive Controls

- **Waveform Type**: Radio buttons to select sine, square, triangle, or sawtooth
- **Frequency Slider**: Adjusts fundamental frequency from 0-500 Hz
- **Real-time Updates**: Changes are reflected immediately in both domains

### Key Learning Objectives

- Understand that waveform shape determines harmonic content
- Compare how different wave shapes produce different frequency spectra
- Observe that smoother waveforms (triangle) have fewer high-frequency harmonics than angular waveforms (square)
- Learn why triangle waves sound "softer" than square waves (faster harmonic decay)

## Educational Applications

### For Instructors

This simulation is ideal for:

- **Signal Processing Courses**: Demonstrating Fourier analysis principles
- **Music Technology**: Explaining synthesizer waveform selection
- **Physics Classes**: Showing wave superposition and harmonic series
- **Engineering**: Understanding spectral content of different signals

### For Students

Students can explore:

- How changing waveform shape affects the frequency spectrum
- Why different waveforms have characteristic sounds
- The mathematical relationship between time and frequency domains
- The concept of harmonic series and amplitude decay

## Technical Implementation

- **FFT Size**: 8192 samples for high frequency resolution
- **Sample Rate**: 44.1 kHz (standard audio rate)
- **Frequency Range**: Display limited to 0-500 Hz for clarity
- **Real-time Processing**: Efficient spectrum calculation for smooth interaction

## Sample Exercises

1. **Compare Harmonic Content**: Switch between waveforms and observe how the spectrum changes
2. **Frequency Scaling**: Adjust the frequency and see how all harmonics scale proportionally
3. **Harmonic Decay**: Compare the rate at which harmonics decrease for triangle vs. square waves
4. **Audio Connection**: If audio is enabled, listen to how different waveforms sound at the same frequency

## Extensions and Variations

This simulation could be extended to include:

- Audio output for hearing the differences
- Custom waveform drawing capability
- Phase relationships between harmonics
- Noise addition to demonstrate real-world signals
- Time-varying waveforms (chirps, modulation)

## Related Concepts

- **Fourier Series**: Mathematical foundation for harmonic decomposition
- **Spectral Analysis**: Frequency domain representation of signals
- **Music Synthesis**: How electronic instruments generate different timbres
- **Signal Processing**: Fundamental tool for analyzing and processing signals

## Discussion

This simulation reveals one of the most profound insights in signal processing: **every periodic waveform can be decomposed into a sum of sine waves**. This is the essence of Fourier analysis, and understanding it unlocks the door to audio synthesis, telecommunications, image processing, and countless other applications.

### Why Waveform Shape Matters

When you pluck a guitar string and a synthesizer both play the same note (say, 440 Hz for A4), they sound completely different. Why? Both produce the same fundamental frequency, but the **harmonic content**—the additional frequencies present—gives each sound its unique character or *timbre*.

The shape of a waveform in the time domain directly determines which harmonics appear in the frequency domain. This simulation lets you see this relationship visually.

### The Four Waveforms Explained

#### Sine Wave: The Pure Tone

The sine wave is the simplest possible periodic signal. It contains **only the fundamental frequency**—no harmonics at all. In the frequency domain, you see a single spike.

**Why it matters:**

- Sine waves are the building blocks of all other waveforms
- A pure sine tone sounds "hollow" or "electronic" because there's no harmonic richness
- Tuning forks and properly designed electronic oscillators produce nearly pure sine waves

#### Square Wave: Odd Harmonics with 1/n Decay

A square wave alternates abruptly between two values. This sharp transition creates a rich spectrum containing **only odd harmonics** (1st, 3rd, 5th, 7th...) with amplitudes that decrease as 1/n, where n is the harmonic number.

**Mathematical series:**

$$
\text{Square wave} = \frac{4}{\pi}\left[\sin(\omega t) + \frac{1}{3}\sin(3\omega t) + \frac{1}{5}\sin(5\omega t) + \frac{1}{7}\sin(7\omega t) + \cdots\right]
$$

**Why odd harmonics only?** The square wave has perfect symmetry about its midpoint within each half-cycle. This symmetry mathematically cancels out all even harmonics.

**Sound character:** Square waves sound "buzzy" or "hollow"—think 8-bit video game sounds or certain wind instruments like clarinets.

#### Triangle Wave: Odd Harmonics with 1/n² Decay

The triangle wave rises and falls linearly, creating smoother transitions than the square wave. Like the square wave, it contains **only odd harmonics**, but they decay much faster—as 1/n².

**Mathematical series:**

$$
\text{Triangle wave} = \frac{8}{\pi^2}\left[\sin(\omega t) - \frac{1}{9}\sin(3\omega t) + \frac{1}{25}\sin(5\omega t) - \frac{1}{49}\sin(7\omega t) + \cdots\right]
$$

**Why faster decay?** The triangle wave has no sharp corners—it's continuous and has a continuous first derivative. In signal processing, smoother time-domain shapes always produce spectra that fall off more rapidly.

**Sound character:** Triangle waves sound "softer" and "flute-like" compared to square waves. The rapid harmonic decay means less high-frequency energy.

#### Sawtooth Wave: All Harmonics with 1/n Decay

The sawtooth wave ramps up (or down) linearly, then drops sharply. Unlike square and triangle waves, it contains **all harmonics**—both odd and even—with 1/n amplitude decay.

**Mathematical series:**

$$
\text{Sawtooth wave} = \frac{2}{\pi}\left[\sin(\omega t) - \frac{1}{2}\sin(2\omega t) + \frac{1}{3}\sin(3\omega t) - \frac{1}{4}\sin(4\omega t) + \cdots\right]
$$

**Why all harmonics?** The sawtooth lacks the half-wave symmetry of square and triangle waves. Without this symmetry, even harmonics are free to appear.

**Sound character:** Sawtooth waves sound "bright" and "brassy"—common in synthesizer lead sounds and string emulations. The presence of all harmonics gives it the richest spectrum.

### The Gibbs Phenomenon

If you look carefully at a square wave reconstructed from its Fourier series, you'll notice overshoot (ringing) near the sharp transitions. This is the **Gibbs phenomenon**—a fundamental limitation when approximating discontinuities with finite sums of smooth sine waves. The overshoot is approximately 9% of the step height and persists no matter how many harmonics you include.

### Why This Matters for Audio

Understanding harmonic content explains many audio phenomena:

1. **Subtractive synthesis**: Start with a harmonically rich waveform (sawtooth) and use filters to remove unwanted harmonics
2. **Additive synthesis**: Build complex sounds by combining sine waves at harmonic frequencies
3. **Distortion effects**: Guitar distortion adds harmonics, making the sound "fatter"
4. **Audio compression**: MP3 encoding prioritizes frequencies that humans perceive most
5. **Speaker design**: Speakers must reproduce harmonics accurately to sound natural

### Exploration Activities

Try these experiments to deepen your understanding:

1. **Compare decay rates**: Set the frequency to 100 Hz. Switch between square and triangle waves. Notice how the triangle wave's harmonics (at 300 Hz, 500 Hz, etc.) are much smaller than the square wave's.

2. **Missing harmonics**: With a sawtooth at 100 Hz, you'll see peaks at 100, 200, 300, 400, 500 Hz. Switch to square—the 200 Hz and 400 Hz peaks disappear (even harmonics gone).

3. **Frequency scaling**: Change the fundamental frequency. Notice how all harmonics scale proportionally—if the fundamental doubles, so do all harmonic frequencies.

4. **The pure sine**: Select sine wave and observe the single spectral peak. This is the "atom" of sound—all other waveforms are combinations of these atoms.

5. **Approaching DC**: Lower the frequency toward 0 Hz. Watch how the harmonics compress together and eventually all spectral content disappears at 0 Hz (DC has no harmonics).

### Connection to Course Concepts

This simulation demonstrates several key signal processing principles:

- **Fourier Analysis**: The mathematical framework for decomposing signals into frequency components
- **Harmonic Series**: The integer multiples of a fundamental frequency that appear in periodic signals
- **Time-Frequency Duality**: How signal shape in time determines its spectrum in frequency
- **Spectral Envelope**: The overall shape of how harmonic amplitudes decay (1/n vs 1/n²)
- **Symmetry and Harmonics**: How waveform symmetry determines which harmonics are present