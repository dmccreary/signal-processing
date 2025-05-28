---
title: Basic FFT MicroSim
description: A basic demonstration of FFT with time on the top and frequency on the bottom of the MicroSim
image: /sims/fft-basic/fft-basic.png
og:image: /sims/fft-basic/fft-basic.png
twitter:image: /sims/fft-basic/fft-basic.png
social:
   cards: false
---
# Basic FFT MicroSim

<iframe src="./main.html" height="480px" scrolling="no"
  style="overflow: hidden;"></iframe>

You can include this MicroSim in your course by pasting the following HTML directly into your web page.

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/basic-fft/main.html" 
  height="480px" scrolling="no" style="overflow: hidden;"></iframe>
```

[Run the Basic FFT MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
[Edit the Basic FFT MicroSim](https://editor.p5js.org/dmccreary/sketches/oDP6EoAQ6)

To include this MicroSim on your web site, just copy the following line of HTML code:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/sine-wave/main.html" height="480px" scrolling="no"
  style="overflow: hidden;"></iframe>
```
## Basic FFT Visualization - Lesson Plan

## Lab Information
**Course:** Introduction to Signal Processing  
**Level:** College Freshman  
**Duration:** 20 minutes  
**Prerequisites:** Basic trigonometry, familiarity with sine waves  
**Learning Objectives:** Students will understand the fundamental concept of FFT and the relationship between time and frequency domains

## Learning Objectives

By the end of this lesson, students will be able to:

1. Explain what the Fast Fourier Transform (FFT) does conceptually
2. Identify the relationship between a sine wave in time domain and its frequency domain representation
3. Predict how changes in frequency and amplitude affect both domain representations
4. Distinguish between time domain and frequency domain visualizations
5. Use interactive tools to explore signal analysis concepts

## Materials Needed

- Computer with web browser and audio capability
- Basic FFT Visualization MicroSim
- Headphones or speakers (optional but recommended)
- Student worksheet (provided below)
- Whiteboard/projector for demonstrations

## Pre-Lesson Preparation

### Student Setup

1. Open the Basic FFT Visualization MicroSim in web browser
2. Ensure audio is working (volume at comfortable level)
3. Familiarize yourself with the interface:
   - Two main display areas (top and bottom)
   - Control sliders and buttons at bottom
   - Note the "PAUSED" status indicator

### Instructor Setup
- Project MicroSim on screen for class demonstration
- Have example frequency values ready (220 Hz, 440 Hz, 880 Hz)
- Prepare simple sine wave drawings on whiteboard

## Lesson Introduction

### Hook: The Musical Connection

**Ask students:** "When you hear a musical note, what makes it different from noise?"

**Brief Discussion:** Students may mention pitch, tone, harmony. Lead toward the idea that musical notes have specific frequencies.

### Core Concept Introduction

**Explain:** "Today we'll explore how we can analyze any signal - music, voice, or electronic signals - by breaking it down into its frequency components. This is like having X-ray vision for sound!"

### Key Terms Introduction

Write on board and define:

- **Time Domain:** How a signal changes over time (what we usually see on an oscilloscope)
- **Frequency Domain:** Which frequencies are present in a signal and how strong they are
- **FFT (Fast Fourier Transform):** A mathematical tool that converts time domain signals to frequency domain

## Guided Exploration

### Phase 1: Understanding the Interface

**Instructor Demonstration:**
1. Point out the two main areas:

   - **Top area (green line):** "This shows how our signal changes over time"
   - **Bottom area (purple bars):** "This shows which frequencies are in our signal"

2. Show the controls:

   - **Frequency slider:** "Controls the pitch of our sine wave"
   - **Amplitude slider:** "Controls how loud/strong our signal is"
   - **Start/Pause button:** "Turns our signal generator on and off"

**Student Task:** Have students identify these same elements on their screens.

### Phase 2: First Observations (8 minutes)

**Guided Activity:**

1. **Start with default settings** (440 Hz, 0.5 amplitude, paused)
   - **Ask:** "What do you see in both displays right now?" (Flat lines)

2. **Press Start button**

   - **Observe:** Green sine wave appears in top, purple spike appears in bottom
   - **Ask:** "Where is the purple spike located? Why there?"

3. **Change frequency to 220 Hz**

   - **Observe:** Wave in top gets "stretched out," spike in bottom moves left
   - **Ask:** "What happened to the wave? What happened to the spike?"

4. **Change frequency to 880 Hz**

   - **Observe:** Wave in top gets "compressed," spike in bottom moves right
   - **Ask:** "Can you predict the pattern here?"

**Key Learning Point:** "One sine wave in time always creates exactly one spike in frequency!"

### Phase 3: Amplitude Exploration (7 minutes)

**Guided Activity:**

1. **Set frequency to 440 Hz**

2. **Change amplitude from 0.5 to 0.1**
   - **Observe:** Time domain wave gets smaller, frequency spike gets shorter
   - **Ask:** "What changed? What stayed the same?"

3. **Change amplitude to 1.0**
   - **Observe:** Both displays show maximum values
   - **Ask:** "How does amplitude affect each domain?"

**Key Learning Point:** "Amplitude changes the height in both domains, but not the frequency location!"

## Independent Practice

### Student Worksheet Activity

**Instructions:** Working individually or in pairs, complete the following exercises using the MicroSim:

#### Exercise 1: Frequency Prediction

1. Set the frequency slider to 100 Hz and press Start
2. Observe where the spike appears in the frequency domain
3. **Predict:** If you change to 200 Hz, where will the spike move?
4. Test your prediction
5. **Record:** Was your prediction correct? Why or why not?

#### Exercise 2: Musical Notes

The following frequencies correspond to musical notes:

- C4: 262 Hz
- E4: 330 Hz  
- G4: 392 Hz
- C5: 523 Hz

1. Set each frequency and observe the frequency domain
2. **Record:** How does the spike position relate to the pitch you hear?
3. **Challenge:** Can you "tune" the slider to create these exact frequencies?

#### Exercise 3: Amplitude Investigation

1. Set frequency to 500 Hz
2. Try amplitude values: 0.1, 0.3, 0.7, 1.0
3. **Record:** Complete this table:

| Amplitude | Time Domain Wave Height | Frequency Spike Height |
|-----------|------------------------|----------------------|
| 0.1       |                        |                      |
| 0.3       |                        |                      |
| 0.7       |                        |                      |
| 1.0       |                        |                      |

4. **Conclusion:** What is the relationship between amplitude and the heights in both domains?

## Class Discussion and Wrap-up (5 minutes)

### Key Findings Review
**Ask students to share:**
- "What surprised you most about the relationship between time and frequency?"
- "How would you explain FFT to a friend in simple terms?"

### Connect to Real World

**Discuss applications:**
- **Music production:** Equalizers show frequency content
- **Medical imaging:** MRI uses similar frequency analysis
- **Communication:** Cell phones analyze frequency to separate channels
- **Audio compression:** MP3 files use frequency analysis to reduce file size

### Preview Next Lesson

"Next time, we'll explore what happens when we have multiple sine waves at the same time. Can you predict what the frequency domain might look like with two different frequencies playing together?"

## Assessment Rubric

### Formative Assessment (During Lesson)

**Excellent (4):** Student correctly predicts frequency/amplitude effects and explains reasoning  
**Proficient (3):** Student makes correct observations with minimal guidance  
**Developing (2):** Student participates but needs significant guidance  
**Beginning (1):** Student struggles to make basic observations

### Worksheet Assessment

**Understanding of FFT Concept:**

- Correctly identifies that sine waves create single frequency spikes
- Explains relationship between time and frequency domains
- Demonstrates understanding that amplitude affects height, not frequency position

**Problem-Solving Skills:**

- Makes accurate predictions about frequency changes
- Uses MicroSim effectively to test hypotheses
- Records observations accurately

## Extension Activities

### For Advanced Students

1. **Research Challenge:** Look up the mathematical definition of Fourier Transform. How does the visual representation relate to the equations?

2. **Real-World Connection:** Find examples of frequency analysis in your field of interest (engineering, music, medicine, etc.)

### For Students Needing Support

1. **Visual Summary:** Create a drawing showing a sine wave and its corresponding frequency spike with labels

2. **Analogy Development:** Think of an analogy that helps explain why we need both time and frequency representations

## Common Student Misconceptions

### Misconception 1: "Higher frequency means taller spike"
**Correction:** Higher frequency moves the spike to the right, not up. Height is controlled by amplitude.

### Misconception 2: "The time domain wave and frequency spike should look similar"
**Correction:** They represent completely different information. Time domain shows change over time; frequency domain shows which frequencies are present.

### Misconception 3: "FFT creates the frequencies"
**Correction:** FFT reveals frequencies that were already in the signal. It's like using a prism to see colors that were already in white light.

## Homework Assignment

### Reflection Questions (Due Next Class)

1. In your own words, explain what the Fast Fourier Transform does and why it's useful.

2. Describe a situation where you might want to analyze a signal in the frequency domain rather than just looking at it in time domain.

3. Using the MicroSim, find the frequency that creates a spike at exactly the 1000 Hz mark. Explain how you found this frequency and what you observed.

4. **Creative Application:** If you were designing a music app, how might you use frequency domain analysis? Describe at least two features that could benefit from FFT analysis.

## Instructor Notes

### Common Technical Issues

- **Audio not working:** Ensure students click "Start" button and check browser audio permissions
- **Slider not responding:** Refresh page and try again
- **Display too small:** Use browser zoom if needed

### Timing Adjustments

- **Running behind:** Skip Exercise 3 in Independent Practice
- **Ahead of schedule:** Add discussion about why we need 1024 samples for good frequency resolution

### Differentiation Strategies

- **Visual learners:** Emphasize the graphical representations and encourage drawing
- **Auditory learners:** Have students listen to frequency changes with headphones
- **Kinesthetic learners:** Encourage hands-on exploration with sliders

### Assessment Modifications

- **For students with disabilities:** Allow verbal responses instead of written for worksheet
- **For ESL students:** Provide vocabulary list with key terms and definitions
- **For advanced students:** Ask follow-up questions about sampling rates and frequency resolution