---
title: FFT Size MicroSim
description: A basic demonstration of FFT on a single oscillator and radio button to control the size
image: /sims/fft-size/fft-size.png
og:image: /sims/fft-size/fft-size.png
twitter:image: /fft-size/fft-size.png
social:
   cards: false
---
# FFT Size MicroSim

<iframe src="./main.html" height="480px" scrolling="no"
  style="overflow: hidden;"></iframe>

You can include this MicroSim in your course by pasting the following HTML directly into your web page.

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/fft-size/main.html" 
  height="480px" scrolling="no" style="overflow: hidden;"></iframe>
```

[Run the FFT Size MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
[Edit the FFT Size MicroSim](https://editor.p5js.org/dmccreary/sketches/FNORtTenz)

## FFT Size - Lesson Plan

!!! prompt
    Please generate a detailed lesson plan with no times for a freshman in college that is getting their first exposure to FFT.  Have them vary the controls and see the impact.  Have them note the width of the peak in the frequency graph.  Have them quickly move the amplitude control and see a packet of waves of a given frequency in the top time domain.  Return the results in markup with 

### Learning Objectives

By the end of this lesson, students will be able to:
- Understand the relationship between time domain and frequency domain representations
- Explain how FFT size affects frequency resolution
- Observe the connection between signal amplitude and spectral peaks
- Recognize how transient signals appear in both domains

## Part 1: Introduction to the FFT Visualization

### Getting Started

1. **Launch the FFT Basic Visualization** and observe the interface
2. **Identify the key components:**
   - Top half: Time Domain (shows the waveform over time)
   - Bottom half: Frequency Domain (shows the FFT spectrum)
   - Controls: Frequency slider, Amplitude slider, FFT Size radio buttons
   - Start/Pause and Reset buttons

3. **Initial Observation:**
   - Click "Start" to begin the simulation
   - Notice the green waveform in the time domain (top)
   - Notice the purple bars in the frequency domain (bottom)
   - **Question to ponder:** What is the relationship between these two displays?

---

## Part 2: Exploring Frequency Relationships

### Activity 1: Understanding the Frequency Connection
1. **Set initial conditions:**
   - Frequency: 440 Hz (default)
   - Amplitude: 0.5 (default)
   - FFT Size: 1024 (default)
   - Click "Start"

2. **Observe and record:**
   - What frequency shows the peak in the bottom graph?
   - How does this relate to the frequency slider setting?
   - **Key insight:** The peak in the frequency domain appears at exactly the same frequency as the time domain signal

3. **Experiment with different frequencies:**
   - Move the frequency slider to 200 Hz
   - Move it to 800 Hz
   - Move it to 1500 Hz
   - **Record your observations:** How does the peak location change in the frequency domain?

### Activity 2: The Amplitude Connection
1. **Fix the frequency at 440 Hz**
2. **Vary the amplitude from 0.1 to 1.0:**
   - Start with amplitude = 0.1
   - Gradually increase to 0.5
   - Increase to 1.0
   - **Observe:** What happens to the height of the peak in the frequency domain?

3. **Key discovery:** Amplitude in the time domain directly corresponds to the magnitude (height) of the peak in the frequency domain

---

## Part 3: Understanding FFT Resolution

### Activity 3: FFT Size and Peak Width Analysis
This is a crucial concept that many students find challenging initially.

1. **Set up for peak width observation:**
   - Frequency: 440 Hz
   - Amplitude: 0.7
   - Start with FFT Size: 512

2. **Observe the peak width:**
   - **Look carefully** at the width of the purple peak at 440 Hz
   - Notice how "spread out" or "narrow" the peak appears
   - **Record:** Estimate the width of the peak in the frequency domain

3. **Change FFT size systematically:**
   - Switch to FFT Size: 1024
   - **Observe:** Is the peak narrower or wider than before?
   - Switch to FFT Size: 2048
   - **Observe:** How has the peak width changed?
   - Switch to FFT Size: 4096
   - **Final observation:** What is the trend in peak width as FFT size increases?

4. **Understanding frequency resolution:**
   - **Check the display:** Look at "Freq Resolution: X.X Hz/bin" 
   - **Connect the concepts:** Smaller Hz/bin values mean better frequency resolution
   - **Key insight:** Larger FFT sizes provide better frequency resolution (narrower peaks)

### Activity 4: Trade-offs in FFT Size
1. **Practical considerations:**
   - Try FFT Size: 8192 (maximum)
   - Try FFT Size: 512 (minimum)
   - **Question:** What might be the trade-off between high resolution and computational cost?

---

## Part 4: Observing Transient Signals

### Activity 5: Creating Wave Packets
This activity helps students understand how changing signals appear in both domains.

1. **Set up for transient observation:**
   - Frequency: 600 Hz
   - FFT Size: 2048 (for good resolution)
   - Amplitude: 0.5

2. **Create a wave packet:**
   - **Quickly** move the amplitude slider from 0 to 0.8 and back to 0
   - Do this motion in about 1-2 seconds
   - **Observe the time domain:** You should see a "burst" or "packet" of waves

3. **Observe both domains simultaneously:**
   - **Time domain:** Notice the localized group of oscillations
   - **Frequency domain:** What happens to the peak during this transient?
   - **Repeat several times** to see the effect clearly

4. **Advanced observation:**
   - Try creating wave packets at different frequencies (300 Hz, 800 Hz, 1200 Hz)
   - **Question:** How does the frequency of the wave packet relate to where the peak appears in the frequency domain?

### Activity 6: Amplitude Modulation Effects
1. **Create rhythmic amplitude changes:**
   - Set frequency to 440 Hz
   - **Slowly and rhythmically** vary the amplitude up and down
   - Create a "beating" or "pulsing" effect
   - **Observe:** How does this appear in both time and frequency domains?

---

## Part 5: Synthesis and Understanding

### Reflection Questions
Work through these questions to consolidate your understanding:

1. **Fundamental relationship:**
   - How would you explain the relationship between time domain and frequency domain to a classmate?

2. **Peak characteristics:**
   - Why does a single-frequency sine wave show up as a single peak in the frequency domain?
   - What determines the location of the peak?
   - What determines the height of the peak?

3. **Resolution trade-offs:**
   - What happens to frequency resolution as FFT size increases?
   - Why might you choose a smaller FFT size despite lower resolution?
   - In what applications might high frequency resolution be critical?

4. **Transient signals:**
   - How do short-duration signals (wave packets) appear differently from continuous signals?
   - Why might the frequency domain representation change when you create wave packets?

### Key Takeaways
Students should be able to articulate:

- **Time-Frequency Duality:** Every signal can be represented in both time domain (how it changes over time) and frequency domain (what frequencies it contains)

- **FFT Resolution:** The FFT size determines how precisely we can distinguish between different frequencies - larger FFT sizes give narrower, more precise peaks

- **Amplitude-Magnitude Relationship:** The amplitude of a signal in the time domain directly relates to the magnitude (height) of its corresponding peak in the frequency domain

- **Transient Analysis:** Short-duration signals create temporary peaks in the frequency domain, illustrating how the FFT can reveal the frequency content of time-varying signals

---

## Extension Activities

### For Advanced Students:
1. **Predict and verify:** Before moving the frequency slider, predict where the peak will appear, then verify your prediction

2. **Multiple frequencies:** What would happen if we had two different frequencies at the same time? (This sets up the next lesson on multi-component signals)

3. **Real-world connections:** Where might FFT analysis be used in engineering applications? (Audio processing, vibration analysis, communications, etc.)

### Troubleshooting Common Misconceptions:
- **"The time domain shows frequency"** - Clarify that time domain shows how the signal varies over time, while frequency domain shows what frequencies are present
- **"Bigger FFT is always better"** - Discuss computational trade-offs and real-time processing constraints
- **"The peak should be a single line"** - Explain that digital processing creates finite-width peaks, and resolution limits cause peak spreading

This lesson provides hands-on experience with the fundamental concepts of FFT analysis while building intuition for more advanced signal processing topics.