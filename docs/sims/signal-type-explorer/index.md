---
title: Signal Type Explorer
description: Compare continuous-time and discrete-time views of sinusoid, square wave, exponential and step signals while adjusting amplitude, frequency, phase, time shift and time scale, with energy, power and RMS readouts.
image: /sims/signal-type-explorer/signal-type-explorer.png
og:image: /sims/signal-type-explorer/signal-type-explorer.png
twitter:image: /sims/signal-type-explorer/signal-type-explorer.png
social:
   cards: false
quality_score: 100
---

# Signal Type Explorer

<iframe src="main.html" height="592px" width="100%" scrolling="no"></iframe>

[Run the Signal Type Explorer MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit in the p5.js Editor](https://editor.p5js.org/)

## About This MicroSim

This MicroSim plots four basic signals and lets you look at each one as a
continuous-time signal $x(t)$, as a discrete-time signal $x[n]$, or as both at once.
The discrete-time view samples the plotted curve every $T_s = 0.05$ s, so
$x[n] = x(nT_s)$ and the 4-second window holds samples $n = -40$ to $n = 40$.

| Signal | Definition | Classification |
|--------|------------|----------------|
| Sinusoid | $x(t) = A\cos(2\pi f t + \phi)$ | Periodic, power signal |
| Square wave | $x(t) = A\,\text{sgn}[\cos(2\pi f t + \phi)]$ | Periodic, power signal |
| Exponential | $x(t) = A e^{-\alpha t}u(t)$ | Aperiodic, energy signal |
| Step function | $x(t) = A\,u(t)$ | Aperiodic, power signal |

The time-shift and time-scale controls plot $y(t) = x\big(a(t - t_0)\big)$.
A positive $t_0$ delays the signal, $a > 1$ compresses it, $0 < a < 1$ expands it,
and the **Reverse** checkbox makes $a$ negative, which flips the signal about $t = t_0$.

The table under the plot reports the energy, average power and RMS amplitude of the
plotted signal. These are closed-form results for the ideal, infinitely long signal,
not estimates taken from the 4-second window:

| Signal | Energy $E$ | Average power $P$ | RMS $=\sqrt{P}$ |
|--------|-----------|-------------------|-----------------|
| Sinusoid | $\infty$ | $A^2/2$ | $A/\sqrt{2}$ |
| Square wave | $\infty$ | $A^2$ | $A$ |
| Exponential | $A^2/(2\alpha\lvert a\rvert)$ | $0$ | $0$ |
| Step function | $\infty$ | $A^2/2$ | $A/\sqrt{2}$ |

For the discrete-time view the integrals become sums, $E = \sum_n |x[n]|^2$ and
$P = \lim_{N\to\infty}\frac{1}{2N+1}\sum_{n=-N}^{N}|x[n]|^2$. The power values match
the continuous-time ones, but the energy of the sampled exponential is a geometric
series, $E = A^2 / (1 - e^{-2\alpha |a| T_s})$ when a sample lands on the start of the
exponential, so it is roughly $1/T_s = 20$ times the continuous-time energy.

## How to Use

1. Pick a **Signal** and a **View** (continuous-time, discrete-time, or both).
2. Move the **Amplitude**, **Frequency** and **Phase** sliders and watch the waveform
   and the power and RMS values change. Frequency and phase are greyed out for signals
   that do not use them; for the exponential the frequency slider sets the decay rate $\alpha$.
3. Move **Time shift** and **Time scale**, and tick **Reverse**, to apply signal operations.
   Notice which readouts change and which do not.
4. Press **Pin** to keep the current signal on the plot in a second color, then change
   the settings to compare. Up to three signals can be pinned (four traces in total).
   **Clear** removes the pinned signals.

A red note appears in the discrete-time views when the sinusoid or square wave has
fewer than two samples per cycle ($f\,|a| > 10$ Hz). The samples then no longer follow
the continuous curve, an effect called aliasing that is covered in
[Chapter 5](../../chapters/05-sampling-and-quantization/index.md).

## Iframe Embed Code

You can add this MicroSim to any web page by adding this to your HTML:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/signal-type-explorer/main.html"
        height="592px"
        width="100%"
        scrolling="no"></iframe>
```

## Lesson Plan

### Learning Objectives

By the end of this activity, students will be able to:

1. **Distinguish** continuous-time and discrete-time representations of the same signal.
2. **Predict** how amplitude, frequency and phase change a sinusoid.
3. **Classify** a signal as an energy signal or a power signal from its energy and average power.
4. **Analyze** how time shifting, time scaling and time reversal change a waveform and its energy or power.

### Grade Level

Undergraduate (introductory signals and systems)

### Duration

15-20 minutes

### Prerequisites

- Sine and cosine functions, radians and degrees
- The exponential function
- The idea of an integral as an area

### Activities

1. **Exploration** (5 min): With the sinusoid selected, switch between the three views.
   Double the amplitude from 2 to 4. By what factor does the power change? By what
   factor does the RMS amplitude change?
2. **Guided Practice** (10 min):
    - Pin the sinusoid, then set the phase to 180°. Describe the new curve relative to
      the pinned one. Return the phase to 0°. Which time shift $t_0$ produces the same curve at $f = 1$ Hz?
    - Select the exponential. Record the energy for $\alpha = 1$ and $A = 2$, then set
      the time scale to 2. Explain why the energy halves.
    - Select the step function and tick Reverse. Why is the power unchanged?
    - Set the sinusoid to 10 Hz with phase 90° in the discrete-time view. Every sample is zero.
      Explain why, using $T_s = 0.05$ s.
3. **Assessment** (5 min): Without using the MicroSim, give the energy, power and class
   of $x(t) = 3e^{-2t}u(t)$ and of $x(t) = 3\cos(2\pi \cdot 5t)$. Then check with the MicroSim.

### Assessment

- Student states that power grows with the square of amplitude and RMS grows linearly.
- Student explains that a time shift never changes energy or power, while time scaling by $a$
  divides the energy of an energy signal by $|a|$.
- Student correctly labels each of the four signals as an energy signal or a power signal.

## References

1. Oppenheim, A. V., Willsky, A. S., & Nawab, S. H. (1997). *Signals and Systems* (2nd ed.). Prentice Hall. Chapter 1 covers signal energy and power, transformations of the independent variable, and the basic continuous-time and discrete-time signals.
2. Lathi, B. P., & Green, R. A. (2018). *Linear Systems and Signals* (3rd ed.). Oxford University Press.
3. [Chapter 2: Introduction to Signals and Systems](../../chapters/02-introduction-to-signals-and-systems/index.md) of this textbook.
