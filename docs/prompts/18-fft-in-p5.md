# Signal Processing MicroSims Using p5.js FFT

!!! prompt
    I just found out that the new version of p5.js JavaScript library already has an FFT function built in.  I have not been using this in this course.  Can you please create a list of Micro-Simulations for this course on Signal Processing that follow the standard-rules.md guidelines?  
    
    For each Signal Processing MicroSim that uses the FFT, suggest what concept we are trying to teach and how we could implement the MicroSim.  List the display and the slider and/or button controls the student would be able to change.

## Claude Sonnet 4.0 Response

I'll analyze the signal processing concepts and create a comprehensive list of MicroSims that leverage p5.js's built-in FFT function. Let me first examine the concepts in your CSV file to understand the curriculum structure.

Now I'll create a comprehensive list of FFT-based MicroSims organized by learning progression and complexity level.

This comprehensive list provides 15 MicroSims that progressively build understanding of FFT concepts in signal processing. Each MicroSim is designed to:

1. Follow your standard-rules.md guidelines for consistent layout and responsive design
2. Leverage p5.js's built-in FFT function for real-time frequency analysis
3. Target specific learning objectives based on the concepts in your CSV file
4. Provide meaningful interactive controls that let students explore parameter effects
5. Use clear visual representations separating time and frequency domains

The progression moves from basic single-frequency FFT visualization to advanced applications like STFT spectrograms and real-world audio analysis. Each MicroSim includes specific implementation details for displays and controls, making them ready for development using your established template system.

The MicroSims are organized by complexity level (Foundation → Intermediate → Advanced → Specialized) to support a structured learning path through signal processing concepts that build upon each other according to the dependency relationships in your curriculum.RetryClaude can make mistakes. Please double-check responses.

## Foundation Level MicroSims

### 1. Basic FFT Visualization
**Concept:** Fast Fourier Transform (FFT) fundamentals
**Learning Goal:** Students understand how FFT converts time-domain signals to frequency-domain representation

**Display:**
- Top half: Time-domain waveform (green line)
- Bottom half: Frequency spectrum (purple bars)
- Clear axis labels with units (Time/Frequency)

**Controls:**
- Frequency slider: 20-2000 Hz (adjusts sine wave frequency)
- Amplitude slider: 0-1 (adjusts sine wave amplitude)
- Start/Pause button
- Reset button

**Implementation:** Single sine wave oscillator with real-time FFT analysis, similar to the provided fft.js example.

---

### 2. Multiple Frequency Components
**Concept:** Frequency domain analysis of complex signals
**Learning Goal:** Students see how multiple sine waves appear as distinct peaks in frequency domain

**Display:**
- Top: Combined time-domain signal
- Bottom: FFT showing multiple frequency peaks
- Peak frequency labels on spectrum

**Controls:**
- Frequency 1 slider: 50-1000 Hz
- Amplitude 1 slider: 0-1
- Frequency 2 slider: 50-1000 Hz  
- Amplitude 2 slider: 0-1
- Frequency 3 slider: 50-1000 Hz
- Amplitude 3 slider: 0-1
- Master volume slider
- Mute button

---

### 3. Noise vs. Signal FFT
**Concept:** Signal detection in noise using frequency analysis
**Learning Goal:** Students learn how FFT helps identify signals buried in noise

**Display:**
- Time-domain: Noisy signal (barely visible sine wave)
- Frequency-domain: Clear peak above noise floor
- SNR indicator

**Controls:**
- Signal frequency slider: 100-1000 Hz
- Signal amplitude slider: 0-1
- Noise level slider: 0-0.5
- Start/Stop signal button
- Reset button

---

## Intermediate Level MicroSims

### 4. Window Functions and FFT
**Concept:** Windowing effects on frequency analysis
**Learning Goal:** Students understand spectral leakage and window function trade-offs

**Display:**
- Left: Time-domain signal with window overlay
- Right: FFT spectrum showing window effects
- Window function visualization

**Controls:**
- Signal frequency slider: 50-500 Hz
- Window type dropdown: Rectangular, Hann, Hamming, Blackman
- Window size slider: 512-4096 samples
- Overlap slider: 0-75%

---

### 5. Real-time Audio FFT Analyzer
**Concept:** Live frequency analysis of microphone input
**Learning Goal:** Students analyze real-world audio signals

**Display:**
- Live FFT spectrum (0-8000 Hz range)
- Peak frequency display
- Frequency bin labels
- dB scale on Y-axis

**Controls:**
- Start/Stop microphone button
- Sensitivity slider: 0.1-2.0
- Frequency range selector: Low (0-2kHz), Mid (0-8kHz), Full (0-22kHz)
- Hold peaks checkbox
- Clear peaks button

---

### 6. Filter Frequency Response
**Concept:** Frequency response of digital filters
**Learning Goal:** Students see how filters modify frequency content

**Display:**
- Two-column layout:
  - Left: Time-domain (input vs filtered output)
  - Right: Frequency-domain (input vs output spectra)

**Controls:**
- Input signal type: Sine wave, Square wave, White noise
- Filter type: Low-pass, High-pass, Band-pass, Band-stop
- Cutoff frequency slider: 100-2000 Hz
- Filter order slider: 1-8
- Q factor slider: 0.5-20 (for band-pass/stop)

---

## Advanced Level MicroSims

### 7. Short-Time Fourier Transform (STFT)
**Concept:** Time-frequency analysis using STFT
**Learning Goal:** Students understand how frequency content changes over time

**Display:**
- Top: Time-domain signal
- Bottom: Spectrogram (time vs frequency heatmap)
- Color scale for magnitude

**Controls:**
- Signal type: Chirp, FM sweep, Multi-tone
- Window size slider: 256-2048 samples
- Hop size slider: 64-512 samples
- Frequency range: 0-4000 Hz
- Time range slider: 1-10 seconds
- Play/Pause audio

---

### 8. Frequency Modulation Analysis
**Concept:** FM signal analysis in frequency domain
**Learning Goal:** Students see FM sidebands and modulation index effects

**Display:**
- Time-domain: FM modulated signal
- Frequency-domain: Carrier and sideband structure
- Theoretical vs measured sideband amplitudes

**Controls:**
- Carrier frequency: 500-2000 Hz
- Modulating frequency: 10-200 Hz
- Modulation index: 0-10
- Start/Stop modulation
- Show theory overlay checkbox

---

### 9. Amplitude Modulation (AM) FFT Analysis
**Concept:** AM signal frequency domain representation
**Learning Goal:** Students understand AM sideband structure

**Display:**
- Time-domain: AM modulated signal with envelope
- Frequency-domain: Carrier and sidebands
- Modulation depth indicator

**Controls:**
- Carrier frequency: 1000-3000 Hz
- Modulating frequency: 50-500 Hz
- Modulation depth: 0-100%
- Show envelope checkbox
- Carrier on/off button

---

### 10. Two-Channel FFT Analyzer
**Concept:** Cross-correlation and coherence in frequency domain
**Learning Goal:** Students analyze relationships between two signals

**Display:**
- Top left: Channel 1 time-domain
- Top right: Channel 2 time-domain  
- Bottom left: Individual FFT spectra
- Bottom right: Coherence function

**Controls:**
- Channel 1 frequency: 100-1000 Hz
- Channel 2 frequency: 100-1000 Hz
- Phase difference: 0-360°
- Noise level 1: 0-0.5
- Noise level 2: 0-0.5
- Sync channels button

---

## Specialized Applications

### 11. Musical Note Recognition
**Concept:** Fundamental frequency detection using FFT
**Learning Goal:** Students learn pitch detection algorithms

**Display:**
- FFT spectrum with musical note overlays
- Detected note name and frequency
- Harmonic series visualization
- Confidence meter

**Controls:**
- Input source: Microphone, Generated tones
- Note range: C2-C7
- Detection threshold slider
- Show harmonics checkbox
- Tune to A440 button

---

### 12. Doppler Effect FFT
**Concept:** Frequency shifts due to motion
**Learning Goal:** Students observe frequency changes in moving sources

**Display:**
- Animated moving source visualization
- Real-time FFT showing frequency shift
- Theoretical vs measured frequency plot

**Controls:**
- Source velocity: -50 to +50 m/s
- Source frequency: 500-2000 Hz
- Observer position slider
- Start/Stop motion
- Reset position

---

### 13. Equalizer Design Tool
**Concept:** Multi-band frequency shaping
**Learning Goal:** Students design frequency response curves

**Display:**
- Left: Input signal time-domain
- Center: Equalizer frequency response curve
- Right: Output FFT spectrum

**Controls:**
- 8-band EQ sliders: 60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz
- Each band: -12dB to +12dB
- Input signal type: Music, Speech, White noise
- Bypass button
- Reset EQ button

---

### 14. Spectral Leakage Demo
**Concept:** FFT artifacts and windowing
**Learning Goal:** Students understand non-integer frequency effects

**Display:**
- FFT spectrum showing leakage effects
- True frequency marker
- Window function overlay

**Controls:**
- Signal frequency: 99.5-100.5 Hz (fine control)
- FFT size: 512, 1024, 2048, 4096
- Window type: None, Hann, Kaiser
- Show true frequency checkbox
- Animate frequency sweep button

---

### 15. Phase Visualization in FFT
**Concept:** Phase information in frequency domain
**Learning Goal:** Students understand magnitude vs phase spectra

**Display:**
- Top: Magnitude spectrum
- Bottom: Phase spectrum
- Time-domain reconstruction option

**Controls:**
- Number of harmonics: 1-10
- Phase offset for each harmonic: 0-360°
- Amplitude for each harmonic: 0-1
- Show reconstruction button
- Randomize phases button

---

## Implementation Notes

Each MicroSim should follow the standard-rules.md guidelines:

- Use responsive layout with `updateCanvasSize()` and `windowResized()`
- Place controls in dedicated control area below drawing region
- Use 'aliceblue' background for drawing area, 'white' for controls
- Include proper axis labels and units
- Implement Start/Pause/Reset functionality where appropriate
- Use `describe()` function for accessibility
- Follow consistent color scheme across all MicroSims

### Common FFT Implementation Pattern:

```javascript
let fft;
let oscillator;

function setup() {
  // Standard setup...
  fft = new p5.FFT(0.8, 1024);  // smoothing, bins
  oscillator = new p5.Oscillator('sine');
  oscillator.start();
}

function draw() {
  // Get FFT data
  let spectrum = fft.analyze();
  let waveform = fft.waveform();
  
  // Draw time domain
  drawWaveform(waveform);
  
  // Draw frequency domain  
  drawSpectrum(spectrum);
}
```