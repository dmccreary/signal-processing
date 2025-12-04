---
title: Complex Plane
description: Interactive visualization of complex numbers in the complex plane, showing both rectangular (a + bi) and polar (r angle theta) forms with geometric representations.
image: /sims/complex-plane/complex-plane.png
og:image: /sims/complex-plane/complex-plane.png
twitter:image: /sims/complex-plane/complex-plane.png
social:
   cards: false
quality_score: 90
---

# Complex Plane

<iframe src="main.html" height="532px" width="100%" scrolling="no"></iframe>

[Run the Complex Plane MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit the Complex Plane MicroSim with the p5.js Editor](https://editor.p5js.org/dmccreary/sketches/wnEDizl5_)

## About This MicroSim

This interactive simulation demonstrates the geometric representation of complex numbers in the complex plane (also known as the Argand diagram). Students can manipulate the real and imaginary parts of a complex number and observe how the rectangular and polar forms change in real-time.

## Embedding This MicroSim

You can include this MicroSim on your website using the following `iframe`:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/complex-plane/main.html" height="532px" scrolling="no"></iframe>
```

## Key Features

**Visual Components:**

- **Coordinate Axes**: Blue horizontal axis represents the Real axis, red vertical axis represents the Imaginary axis
- **Complex Number Vector**: Green arrow from the origin to the plotted point z
- **Right Triangle**: Shows the geometric relationship between real part, imaginary part, and magnitude
- **Angle Arc**: Green arc showing the phase angle θ from the positive real axis
- **Dashed Projections**: Lines showing how the complex number projects onto both axes

**Information Displays:**

- **Left Panel**: Shows Re(z), Im(z), magnitude |z|, and phase angle θ
- **Right Panel**: Displays both rectangular (a + bi) and polar (r∠θ) forms
- **On-Graph Labels**: Magnitude label on the vector

## Mathematical Concepts

### Rectangular Form
A complex number z can be written as:

$$z = a + bi$$

where:
- $a$ = Real part (Re(z))
- $b$ = Imaginary part (Im(z))
- $i$ = Imaginary unit ($i^2 = -1$)

### Polar Form
The same complex number can be expressed as:

$$z = r \angle \theta = r(\cos\theta + i\sin\theta) = re^{i\theta}$$

where:
- $r = |z| = \sqrt{a^2 + b^2}$ (magnitude/modulus)
- $\theta = \tan^{-1}(b/a)$ (phase angle/argument)

### Euler's Formula Connection
The polar form connects to Euler's famous formula:

$$e^{i\theta} = \cos\theta + i\sin\theta$$

This relationship is fundamental to signal processing, allowing sinusoidal signals to be represented as rotating phasors in the complex plane.

## Lesson Plan

### Learning Objectives

By the end of this lesson, students will be able to:

1. **Understand** the geometric interpretation of complex numbers as points in a 2D plane
2. **Convert** between rectangular (a + bi) and polar (r∠θ) forms
3. **Calculate** magnitude and phase from real and imaginary components
4. **Explain** how changing real and imaginary parts affects the polar representation
5. **Connect** complex plane concepts to phasor representation of signals

### Grade Level
College-level introductory signal processing or pre-calculus/calculus courses

### Duration
15-20 minutes for exploration, 30-45 minutes with instruction

### Prerequisites
- Basic understanding of the Cartesian coordinate system
- Familiarity with trigonometry (sine, cosine, tangent)
- Knowledge of the Pythagorean theorem

### Suggested Activities

**Activity 1: Quadrant Exploration (5 min)**

Have students move the sliders to place the complex number in each quadrant and observe:

- How does the phase angle change in each quadrant?
- When is the phase positive? Negative?

**Activity 2: Special Cases (5 min)**

Set the sliders to these values and discuss:

- Real = 1, Imag = 0 (pure real number)
- Real = 0, Imag = 1 (pure imaginary number)
- Real = 1, Imag = 1 (45° angle case)
- Real = 0, Imag = 0 (origin)

**Activity 3: Pythagorean Relationship (5 min)**

Find combinations where the magnitude equals exactly 5 (like 3+4i, 4+3i, -3+4i, etc.)

**Activity 4: Unit Circle (5 min)**

Find real/imaginary combinations that produce a magnitude of exactly 1 (points on the unit circle)

### Assessment Questions

1. If z = 3 + 4i, what is the magnitude |z|?
2. What is the phase angle of z = -1 + i in degrees?
3. Convert z = 2∠60° to rectangular form
4. Why is the complex plane useful for representing signals in signal processing?

## Applications in Signal Processing

The complex plane representation is essential in signal processing for:

- **Phasor Analysis**: Representing sinusoidal signals as rotating vectors
- **Fourier Transform**: Complex exponentials form the basis of frequency analysis
- **Filter Design**: Pole-zero plots in the complex plane characterize filter behavior
- **Modulation**: AM, FM, and PM signals can be visualized as trajectories in the complex plane

## References

- Oppenheim, A. V., & Schafer, R. W. (2010). *Discrete-Time Signal Processing*
- Proakis, J. G., & Manolakis, D. G. (2006). *Digital Signal Processing*
