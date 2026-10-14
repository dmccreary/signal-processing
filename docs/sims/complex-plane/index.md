---
title: Complex Plane
description: Interactive visualization of complex numbers in the complex plane, showing both rectangular (a + bi) and polar (r angle theta) forms with geometric representations.
image: /sims/complex-plane/complex-plane.png
og:image: /sims/complex-plane/complex-plane.png
twitter:image: /sims/complex-plane/complex-plane.png
social:
   cards: false
quality_score: 95
---

# Complex Plane

<iframe src="main.html" width="100%" height="532px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/complex-plane/main.html" width="100%" height="532px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

[Edit in the p5.js Editor](https://editor.p5js.org/dmccreary/sketches/wnEDizl5_)

## Description

This MicroSim shows the geometric representation of a complex number in the complex plane (the Argand diagram).
Drag the two sliders to set the real part $a$ and the imaginary part $b$ of $z = a + bi$.
The green vector, the right triangle beneath it, and the green arc update immediately, and the two panels show
the same number in rectangular form and in polar form.

This simulation is used in [Chapter 1: Mathematical Foundations](../../chapters/01-mathematical-foundations/index.md).

**Visual components**

- **Coordinate axes**: the blue horizontal axis is the Real axis and the red vertical axis is the Imaginary axis
- **Complex number vector**: a green arrow from the origin to the point $z$
- **Right triangle**: shows how the real part, imaginary part, and magnitude are related
- **Angle arc**: a green arc showing the phase angle $\theta$ measured from the positive real axis
- **Dashed projections**: lines showing how the point projects onto both axes

**Information displays**

- **Left panel**: $\mathrm{Re}(z)$, $\mathrm{Im}(z)$, the magnitude $|z|$, and the phase angle $\theta$
- **Right panel**: the rectangular form $a + bi$ and the polar form $r\angle\theta$

### Mathematical Concepts

A complex number can be written in rectangular form

$$z = a + bi$$

where $a = \mathrm{Re}(z)$, $b = \mathrm{Im}(z)$, and $i^2 = -1$. The same number in polar form is

$$z = r\angle\theta = r(\cos\theta + i\sin\theta) = re^{i\theta}$$

with magnitude $r = |z| = \sqrt{a^2 + b^2}$ and phase angle $\theta = \operatorname{atan2}(b, a)$.
The polar form connects directly to Euler's formula,

$$e^{i\theta} = \cos\theta + i\sin\theta$$

which is why sinusoidal signals can be written as rotating phasors in signal processing.

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Understand** the geometric interpretation of complex numbers as points in a two-dimensional plane
2. **Convert** between rectangular ($a + bi$) and polar ($r\angle\theta$) forms
3. **Calculate** magnitude and phase from the real and imaginary components
4. **Explain** how changing the real and imaginary parts affects the polar representation
5. **Connect** the complex plane to the phasor representation of signals

### Target Audience

College-level introductory signal processing, or pre-calculus and calculus courses.
Plan 15-20 minutes for exploration and 30-45 minutes with instruction.

### Prerequisites

- The Cartesian coordinate system
- Basic trigonometry (sine, cosine, tangent)
- The Pythagorean theorem

### Activities

**Activity 1: Quadrant Exploration (5 min).** Move the sliders so the number lies in each quadrant.
How does the phase angle change from quadrant to quadrant? When is the phase positive and when is it negative?

**Activity 2: Special Cases (5 min).** Set the sliders to each of these and discuss what you see:

- Real = 1, Imag = 0 (a pure real number)
- Real = 0, Imag = 1 (a pure imaginary number)
- Real = 1, Imag = 1 (the 45 degree case)
- Real = 0, Imag = 0 (the origin)

**Activity 3: Pythagorean Triples (5 min).** Find slider settings where the magnitude is exactly 5
(for example $3 + 4i$, $4 + 3i$, and $-3 + 4i$).

**Activity 4: The Unit Circle (5 min).** Find real and imaginary values that give a magnitude of exactly 1.
What shape do all of these points trace out?

### Assessment

1. If $z = 3 + 4i$, what is the magnitude $|z|$? *(Answer: 5)*
2. What is the phase angle of $z = -1 + i$ in degrees? *(Answer: 135 degrees)*
3. Convert $z = 2\angle 60^\circ$ to rectangular form. *(Answer: $1 + 1.73i$)*
4. Why is the complex plane useful for representing signals? *(Answer: a sinusoid's amplitude and phase become the magnitude and angle of one number, so adding and scaling signals becomes simple vector arithmetic.)*

### Common Misconceptions

Students often compute the phase as $\arctan(b/a)$ and stop. That formula cannot tell $1 + i$ from $-1 - i$.
Move the point across the origin and watch the arc: the angle must be placed in the quadrant where the point lies.

## References

1. [Complex number](https://en.wikipedia.org/wiki/Complex_number) - Wikipedia - overview of rectangular and polar forms, arithmetic, and the complex plane
2. [Complex plane](https://en.wikipedia.org/wiki/Complex_plane) - Wikipedia - the Argand diagram, modulus and argument
3. [Phasor](https://en.wikipedia.org/wiki/Phasor) - Wikipedia - how rotating complex numbers represent sinusoidal signals
4. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with a chapter on complex numbers
5. [Euler's formula](https://en.wikipedia.org/wiki/Euler%27s_formula) - Wikipedia - the link from the polar form to $e^{i\theta}$
