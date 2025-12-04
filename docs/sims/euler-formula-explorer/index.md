---
title: Euler's Formula Explorer
description: Interactive visualization demonstrating Euler's formula e^(iθ) = cos(θ) + i·sin(θ) with synchronized unit circle rotation and sine/cosine wave traces.
image: /sims/euler-formula-explorer/euler-formula-explorer.png
og:image: /sims/euler-formula-explorer/euler-formula-explorer.png
twitter:image: /sims/euler-formula-explorer/euler-formula-explorer.png
social:
   cards: false
quality_score: 85
---

# Euler's Formula Explorer

<iframe src="main.html" height="602px" width="100%" scrolling="no"></iframe>

[Run the Euler's Formula Explorer Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit this MicroSim with the p5.js Editor](https://editor.p5js.org/)

## About This MicroSim

This interactive simulation demonstrates **Euler's Formula**, one of the most beautiful and important equations in mathematics:

$$e^{i\theta} = \cos(\theta) + i\sin(\theta)$$

The visualization shows how a point rotating on the unit circle in the complex plane generates both cosine and sine waves simultaneously. Students can observe the deep connection between exponential functions, trigonometry, and complex numbers.

## Embedding This MicroSim

You can include this MicroSim on your website using the following `iframe`:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/euler-formula-explorer/main.html" height="602px" scrolling="no"></iframe>
```

## Key Features

### Left Panel: Unit Circle

- **Unit circle** in the complex plane (radius = 1)
- **Rotating green vector** from origin showing $e^{i\theta}$
- **Blue projection** on real axis showing $\cos(\theta)$
- **Red projection** on imaginary axis showing $\sin(\theta)$
- **Dashed lines** connecting the point to its axis projections
- **Angle arc** showing the current value of $\theta$

### Right Panel: Wave Traces

- **Cosine plot** (blue) showing $\cos(\theta)$ vs $\theta$
- **Sine plot** (red) showing $\sin(\theta)$ vs $\theta$
- **Current position** highlighted on each trace
- **Connecting lines** from unit circle to corresponding plot values

### Interactive Controls

| Control | Function |
|---------|----------|
| **Play/Pause** | Start or stop the automatic rotation |
| **Angle Slider** | Manually set θ from 0 to 2π |
| **Speed Slider** | Adjust animation speed (0.1x to 5x) |
| **Reset** | Return to θ = 0 and clear traces |

## Mathematical Background

### Why Euler's Formula Matters

Euler's formula connects three fundamental mathematical operations:
- **Exponentiation** ($e^x$)
- **Trigonometry** ($\cos$, $\sin$)
- **Complex numbers** ($i$)

This relationship is essential in signal processing because it allows us to:

1. **Represent sinusoids compactly**: $A\cos(\omega t + \phi) = \text{Re}[Ae^{i(\omega t + \phi)}]$
2. **Simplify calculations**: Multiplication of complex exponentials adds phases
3. **Understand frequency analysis**: The Fourier transform decomposes signals into complex exponentials

### The Unit Circle Connection

When $\theta$ increases from 0 to $2\pi$:
- The point $e^{i\theta}$ traces the unit circle counterclockwise
- The real part traces out exactly one period of cosine
- The imaginary part traces out exactly one period of sine

This is why $e^{i\theta}$ is called a **complex sinusoid** or **phasor**.

### Special Values

| $\theta$ | $e^{i\theta}$ | $\cos(\theta)$ | $\sin(\theta)$ |
|----------|---------------|----------------|----------------|
| 0 | 1 | 1 | 0 |
| $\pi/2$ | $i$ | 0 | 1 |
| $\pi$ | -1 | -1 | 0 |
| $3\pi/2$ | $-i$ | 0 | -1 |
| $2\pi$ | 1 | 1 | 0 |

## Lesson Plan

### Learning Objectives

By the end of this lesson, students will be able to:

1. **Visualize** Euler's formula as rotation on the unit circle
2. **Explain** how cosine and sine relate to the real and imaginary parts
3. **Connect** complex exponentials to sinusoidal signals
4. **Apply** this understanding to phasor representation in signal processing

### Grade Level
College-level signal processing, pre-calculus, or complex analysis courses

### Duration
15-25 minutes for exploration, 45 minutes with full instruction

### Prerequisites
- Understanding of complex numbers and the complex plane
- Basic trigonometry (sine, cosine, unit circle)
- Familiarity with exponential functions

### Suggested Activities

**Activity 1: Trace the Circle (5 min)**

1. Set speed to 0.5x and press Play
2. Watch the green point rotate around the unit circle
3. Observe how the blue and red dots move along the axes
4. Notice how the traces build up on the right

**Activity 2: Find Special Points (5 min)**

Use the angle slider to find:
- Where is $\cos(\theta) = 0$? What is $\sin(\theta)$ there?
- Where is $\sin(\theta) = 0$? What is $\cos(\theta)$ there?
- Where are both $|\cos(\theta)| = |\sin(\theta)|$?

**Activity 3: Phase Relationships (5 min)**

1. Notice that sine lags cosine by $\pi/2$ radians (90°)
2. Verify: when cosine is at maximum, where is sine?
3. When sine is at maximum, where is cosine?

**Activity 4: Frequency Connection (5 min)**

If the point rotates once per second (frequency = 1 Hz):
- How many cycles of cosine appear in one second?
- What determines the frequency of the output sinusoid?

### Assessment Questions

1. What is the value of $e^{i\pi}$? Explain geometrically.
2. Why does the point move counterclockwise as $\theta$ increases?
3. How does multiplying two complex exponentials $e^{i\theta_1} \cdot e^{i\theta_2}$ relate to their angles?
4. Why is Euler's formula useful for representing AC signals?

## Applications in Signal Processing

### Phasors
In AC circuit analysis, sinusoidal voltages and currents are represented as phasors $Ve^{i\phi}$, simplifying impedance calculations.

### Fourier Transform
The Fourier transform uses $e^{-i\omega t}$ as basis functions, decomposing signals into frequency components.

### Modulation
AM, FM, and PM modulation schemes can be understood as manipulating the amplitude, frequency, or phase of complex exponentials.

### Filter Design
Transfer functions and frequency responses are expressed using complex exponentials, making analysis tractable.

## References

- Euler, L. (1748). *Introductio in analysin infinitorum*
- Oppenheim, A. V., & Schafer, R. W. (2010). *Discrete-Time Signal Processing*
- Nahin, P. J. (2006). *Dr. Euler's Fabulous Formula*
