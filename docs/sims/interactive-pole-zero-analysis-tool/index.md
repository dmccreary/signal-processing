---
title: Interactive Pole-Zero Analysis Tool
description: Place poles and zeros on the z-plane and watch the magnitude response, phase response, impulse response, step response and stability verdict of the discrete-time system update.
image: /sims/interactive-pole-zero-analysis-tool/interactive-pole-zero-analysis-tool.png
og:image: /sims/interactive-pole-zero-analysis-tool/interactive-pole-zero-analysis-tool.png
twitter:image: /sims/interactive-pole-zero-analysis-tool/interactive-pole-zero-analysis-tool.png
social:
   cards: false
quality_score: 100
---

# Interactive Pole-Zero Analysis Tool

<iframe src="main.html" height="547px" width="100%" scrolling="no"></iframe>

[Run the Interactive Pole-Zero Analysis Tool MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit in the p5.js Editor](https://editor.p5js.org/)

## About This MicroSim

This MicroSim works in the **z-plane**, the domain of discrete-time systems. A rational transfer function is fixed, apart from a gain $G$,
by its zeros $z_i$ and poles $p_i$:

$$H(z) = G\,\frac{(z-z_1)(z-z_2)\cdots(z-z_M)}{(z-p_1)(z-p_2)\cdots(z-p_N)}$$

Poles are drawn as red crosses and zeros as blue circles. The gain is $G = 1$ throughout.

**Frequency response from geometry.** The frequency response is $H(z)$ evaluated on the unit circle, $z = e^{j\omega}$.
At each frequency $\omega$ (in radians per sample, from 0 to $\pi$):

$$\lvert H(e^{j\omega})\rvert = \frac{\text{product of the distances from the zeros to } e^{j\omega}}{\text{product of the distances from the poles to } e^{j\omega}}$$

and the phase is the sum of the angles of the zero vectors minus the sum of the angles of the pole vectors.
Move the mouse over the magnitude or phase plot: the orange point $e^{j\omega}$ moves round the unit circle and the vectors from every pole and zero are drawn.
A pole close to the unit circle gives a short vector in the denominator and therefore a resonance peak at that angle.
A zero on the unit circle gives a vector of length zero and therefore a notch.

**Stability.** For a causal discrete-time system, bounded-input bounded-output stability requires every pole to lie strictly inside the unit circle:

| Pole location | Banner | Impulse response |
|---------------|--------|------------------|
| All poles inside the unit circle, $\lvert p\rvert < 1$ | Stable (green) | Decays |
| A simple pole on the unit circle, $\lvert p\rvert = 1$ | Marginally stable (amber) | Neither decays nor grows |
| Any pole outside the unit circle, $\lvert p\rvert > 1$, or a repeated pole on it | Unstable (red) | Grows |

Zeros do not affect stability. (For continuous-time systems, analyzed in the s-plane with the Laplace transform, the corresponding rule is that all poles lie in the left half-plane.)
When the system is not stable its frequency response does not exist as a steady-state gain; the curves are then drawn dashed and grey to show only what the formula gives.

**Real systems.** A system with real coefficients has poles and zeros that are either real or in complex-conjugate pairs.
The tool enforces this: a pole or zero placed off the real axis always appears with its mirror image, and both move together.

**Poles and zeros at the origin.** The impulse and step responses come from the causal difference equation that has these poles and zeros.
When the numbers of poles and zeros differ, a causal system has extra zeros or poles at $z = 0$ to make them equal. They are drawn in grey with their count.
They add delay and change the phase, but not the magnitude, since every point of the unit circle is at distance 1 from the origin.

## How to Use

1. Choose a **System** from the list to load a set of poles and zeros.
2. Click a pole or zero to select it, then drag it, or set its **Radius** and **Angle** with the sliders.
   Dragging snaps to the unit circle and to the real axis when you come close. The sliders give finer control.
3. **Add pole** and **Add zero** add a conjugate pair (up to six items in all). **Remove** deletes the selected item.
4. Move the mouse over the magnitude or phase plot to choose the frequency $\omega$ at which the vectors are drawn and $H$ is read out.

## Iframe Embed Code

You can add this MicroSim to any web page by adding this to your HTML:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/interactive-pole-zero-analysis-tool/main.html"
        height="547px"
        width="100%"
        scrolling="no"></iframe>
```

## Lesson Plan

### Learning Objectives

By the end of this activity, students will be able to:

1. **Determine** from a pole-zero plot whether a causal discrete-time system is stable.
2. **Explain** the magnitude response as a ratio of distances from zeros and poles to a point on the unit circle.
3. **Relate** the radius and angle of a pole pair to the decay rate and oscillation frequency of the impulse response.
4. **Design** a simple resonator or notch by placing poles and zeros.

### Grade Level

Undergraduate (signals and systems, digital signal processing)

### Duration

25-30 minutes

### Prerequisites

- Complex numbers in polar form
- The z-transform and transfer functions
- Impulse response and frequency response

### Activities

1. **Exploration** (5 min): Load the resonator. Move the pole radius from 0.5 to 0.99 and describe what happens to the peak of the magnitude response
   and to the impulse response. Then move the angle from 20° to 160°.
2. **Guided Practice** (15 min):
    - Resonator, $r = 0.9$, angle 45°. Point at $\omega = \pi/4$ and read $\lvert H\rvert$ (about 7.4). The nearer pole is at distance $1 - r = 0.1$ from $e^{j\pi/4}$.
      How far away is the other pole? Check that the reciprocal of the product of the two distances matches the reading.
    - Count the samples in one cycle of the impulse response. Compare with $2\pi/\omega_0 = 8$ samples for a pole angle of $\pi/4$.
    - Increase the radius to 1.00 and then to 1.05. Record the banner and the impulse response each time.
    - Load the notch filter. Which frequency is removed completely, and why? Move the pole pair from radius 0.9 to 0.99. What happens to the width of the notch?
    - Load the moving average of 4. Its transfer function is $1 + z^{-1} + z^{-2} + z^{-3}$. Where are its zeros, and which frequencies does it remove? Why can an FIR filter never be unstable?
    - Load the all-pass system. The zeros are at radius $1/r$ and the same angles as the poles. What is special about its magnitude response?
3. **Design task** (5-10 min): Build a filter that removes $\omega = \pi/2$ and passes low frequencies with as little change as possible. Then build one that is unstable, and repair it by moving a single pole.

### Assessment

- Student states the stability rule and applies it to a given pole-zero plot.
- Student predicts where the magnitude response peaks or dips from the positions of the poles and zeros.
- Student explains why poles and zeros of a real system come in conjugate pairs.

## References

1. Oppenheim, A. V., & Schafer, R. W. (2010). *Discrete-Time Signal Processing* (3rd ed.). Pearson. Chapters 3 and 5 cover the z-transform and the geometric evaluation of the frequency response.
2. Proakis, J. G., & Manolakis, D. G. (2007). *Digital Signal Processing* (4th ed.). Pearson. Chapter 3 covers the z-transform and pole-zero analysis.
3. [Pole–zero plot](https://en.wikipedia.org/wiki/Pole%E2%80%93zero_plot) and [Z-transform](https://en.wikipedia.org/wiki/Z-transform), Wikipedia.
4. [Chapter 8: Advanced Transforms](../../chapters/08-advanced-transforms/index.md) of this textbook.
