---
title: Bass and Treble Amplifier Controls
description: Interactive simulation of classic amplifier frequency response with adjustable bass and treble controls.
image: /sims/base-and-treble/base-and-treble.png
og:image: /sims/base-and-treble/base-and-treble.png
social:
   cards: false
quality_score: 45
hide:
  - toc
---
# Bass and Treble Amplifier Controls

<iframe src="main.html" height="420" scrolling="no"></iframe>

To use this MicroSim on your web page, just copy this code into your web page.

```html
<iframe src="/signal-processing/sims/base-and-treble/base-and-treble.html" height="420" scrolling="no" style="overflow: hidden;"></iframe>
```

[Run the Base and Treble MicroSim](./main.html){ .md-button .md-button--primary }
[Edit the Base and Treble MicroSim using the p5.js Editor](https://editor.p5js.org/dmccreary/sketches/j1ND7Tl4a)

## Discussion

This simulation visualizes one of the most fundamental concepts in audio signal processing: **frequency response modification** using bass and treble controls. Whether you're adjusting the EQ on your car stereo, tweaking settings on Spotify, or mixing music in a studio, you're manipulating the same underlying principles demonstrated here.

### What Are Bass and Treble?

**Bass** refers to low-frequency sounds (roughly 20 Hz to 500 Hz)—the deep rumble of thunder, the thump of a kick drum, or the lowest notes on a bass guitar. **Treble** refers to high-frequency sounds (roughly 2,000 Hz to 20,000 Hz)—the shimmer of cymbals, the crispness of vocals, or the brightness of a flute.

When you adjust bass or treble controls, you're telling the amplifier to boost or cut specific frequency ranges while leaving others relatively unchanged.

### Understanding the Frequency Response Curve

The blue curve in this simulation represents the **frequency response**—how much the amplifier boosts or attenuates (reduces) signals at each frequency. Key observations:

- **Flat response (both sliders at 50)**: The curve is a horizontal line at 0 dB, meaning all frequencies pass through unchanged
- **Boosted bass**: The left side of the curve rises above 0 dB, amplifying low frequencies
- **Cut treble**: The right side of the curve drops below 0 dB, reducing high frequencies

### The Logarithmic Frequency Scale

Notice that the x-axis uses a **logarithmic scale** rather than a linear one. This is standard in audio engineering because:

1. **Human hearing is logarithmic**: We perceive pitch relationships as ratios. The jump from 100 Hz to 200 Hz sounds like the same "distance" as 1,000 Hz to 2,000 Hz (both are octaves)
2. **Wide frequency range**: The audible spectrum spans 20 Hz to 20,000 Hz—a 1000:1 ratio. A linear scale would compress the bass frequencies into an unreadable sliver

### Decibels (dB): The Language of Audio

The y-axis shows gain in **decibels (dB)**. This logarithmic unit is used because:

- **+6 dB** approximately doubles the perceived loudness
- **-6 dB** approximately halves it
- **0 dB** means no change (unity gain)

The simulation ranges from -15 dB to +15 dB, representing significant but realistic adjustments for consumer audio equipment.

### Shelving Filters: The Math Behind the Knobs

This simulation models **shelving filters**, which are the actual circuits used in bass and treble controls:

- **Low-shelf filter** (bass control): Affects all frequencies below a cutoff point (500 Hz in this simulation)
- **High-shelf filter** (treble control): Affects all frequencies above a cutoff point (2,000 Hz in this simulation)

The mathematical formula used creates a smooth transition around these cutoff frequencies, which is why you see gradual curves rather than sharp steps.

### Exploration Activities

Try these experiments to deepen your understanding:

1. **Extreme settings**: Move both sliders to their minimum (0) and maximum (100) positions. Notice how the curve creates a "smile" or "frown" shape—terms actually used by audio engineers!

2. **Scooped mids**: Set bass high, treble high, and imagine the midrange frequencies around 1 kHz. This "scooped" sound is popular in heavy metal guitar tones.

3. **The flat response**: Return both sliders to 50 and observe the perfectly flat line. This is what "neutral" or "reference" sound looks like.

4. **Asymmetric adjustments**: Try boosting bass while cutting treble (or vice versa). This mimics what you might do to compensate for poor speakers or room acoustics.

5. **Find the cutoff frequencies**: Slowly adjust one slider while watching where the curve begins to deviate from flat. Can you identify the 500 Hz bass cutoff and 2 kHz treble cutoff?

### Real-World Applications

Understanding frequency response is essential for:

- **Audio engineering**: Mixing and mastering music requires precise EQ adjustments
- **Telecommunications**: Phone systems intentionally limit frequency response to save bandwidth
- **Hearing aids**: These devices boost specific frequencies to compensate for hearing loss
- **Room acoustics**: Engineers use EQ to counteract resonances in concert halls and recording studios

### Connection to Course Concepts

This simulation demonstrates several key signal processing principles you'll encounter throughout this course:

- **Frequency domain analysis**: Viewing signals by their frequency content rather than time
- **Transfer functions**: The mathematical description of how a system modifies signals
- **Filter design**: Creating systems that selectively modify frequency content
- **Logarithmic relationships**: Why audio engineers think in octaves and decibels

## Sample Prompt

!!! prompt
    Use the microsim generator skill to create simulation of the frequency
    response of an old classic amplifier with base and treble knobs.
    
    - The title is "Frequency Response"
    - Instead of knobs, use two sliders at the bottom of the canvas,
    one for base and one for treble.
    - The sliders should start out in the middle (default).
    - The vertical axis has a label of "Gain (dB)" (-15dB to +15dB).
    - The horizontal axis has the label of "Frequency Hz - Logarithmic Scale" (20 to 20K)


**Explanation:**

-   **Sliders Creation:** Two sliders, `bassSlider` and `trebleSlider`, are created in the `setup()` function. They are positioned one below the other in the control area at the bottom of the canvas.

-   **Slider Values Normalization:** The values from the sliders are normalized to a range of -1 to 1 to represent the adjustment from minimum to maximum gain.

-   **Frequency Response Calculation:** The frequency response is calculated using shelving filter approximations for bass and treble adjustments. The gains are computed based on the slider positions and applied to low and high-frequency ranges.

-   **Plotting the Curve:** The frequency response curve is plotted using `beginShape()` and `vertex()`. Frequencies are mapped logarithmically to the x-axis, and gains in decibels are mapped to the y-axis.

-   **Axes and Labels:** Axes are drawn to represent 0 dB gain, and labels are added for clarity. The labels for the sliders are positioned above them.

**Note:** This code can be run in the p5.js editor environment with no changes. The canvas size and control regions are set according to the template provided. Adjustments can be made to the EQ parameters to simulate different amplifier characteristics.
