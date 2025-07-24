---
title: FFT Waveform Types - Compare Harmonic Content
description: Interactive simulation showing how different waveform shapes (sine, square, triangle, sawtooth) appear in frequency domain
image: /sims/fft-waveform-types/fft-waveform-types.png
og:image: /sims/fft-waveform-types/fft-waveform-types.png
twitter:image: /sims/fft-waveform-types/fft-waveform-types.png
social:
   cards: false
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