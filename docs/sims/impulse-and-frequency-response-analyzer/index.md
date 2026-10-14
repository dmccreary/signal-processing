---
title: Impulse and Frequency Response Analyzer
description: See the impulse response, step response, magnitude response and phase response of five LTI systems side by side, with linked cursors and sliders for cutoff frequency, filter order and damping ratio.
image: /sims/impulse-and-frequency-response-analyzer/impulse-and-frequency-response-analyzer.png
og:image: /sims/impulse-and-frequency-response-analyzer/impulse-and-frequency-response-analyzer.png
twitter:image: /sims/impulse-and-frequency-response-analyzer/impulse-and-frequency-response-analyzer.png
social:
   cards: false
quality_score: 100
---

# Impulse and Frequency Response Analyzer

<iframe src="main.html" height="627px" width="100%" scrolling="no"></iframe>

[Run the Impulse and Frequency Response Analyzer MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit in the p5.js Editor](https://editor.p5js.org/)

## About This MicroSim

An LTI system can be described in several equivalent ways. This MicroSim shows four of them at once
for the same system:

- **Impulse response $h(t)$** (top left), the output for the input $\delta(t)$.
- **Step response $s(t) = \int_{-\infty}^{t} h(\tau)\,d\tau$** (bottom left), the output for the input $u(t)$.
- **Magnitude $|H(f)|$** in decibels (top right) and **phase $\angle H(f)$** in degrees (bottom right),
  where $H(f) = \int_{-\infty}^{\infty} h(t)e^{-j2\pi ft}\,dt$. The frequency axis is logarithmic from 0.1 Hz to 100 Hz.

Every curve is drawn from a closed-form expression for the selected system, with $\omega_c = 2\pi f_c$:

| System | Frequency response | Impulse response | Step response |
|--------|--------------------|------------------|---------------|
| Low-pass, order 1 | $\dfrac{1}{1 + jf/f_c}$ | $\omega_c e^{-\omega_c t}u(t)$ | $(1 - e^{-\omega_c t})u(t)$ |
| High-pass, order 1 | $\dfrac{jf/f_c}{1 + jf/f_c}$ | $\delta(t) - \omega_c e^{-\omega_c t}u(t)$ | $e^{-\omega_c t}u(t)$ |
| Differentiator | $jf/f_0$ | $\delta'(t)/(2\pi f_0)$ | $\delta(t)/(2\pi f_0)$ |
| Integrator | $f_0/(jf)$ | $2\pi f_0\,u(t)$ | $2\pi f_0\,t\,u(t)$ |
| Resonant | $\dfrac{1}{1 - (f/f_n)^2 + j2\zeta f/f_n}$ | decaying sinusoid for $\zeta < 1$ | rises to 1, overshoots for $\zeta < 1$ |

The low-pass and high-pass filters are Butterworth filters of order $N = 1$ to $4$. Their magnitude
responses are $1/\sqrt{1 + (f/f_c)^{2N}}$ and $(f/f_c)^N/\sqrt{1 + (f/f_c)^{2N}}$, so the gain is always
$-3$ dB at $f_c$ and the roll-off is $20N$ dB per decade. Their impulse and step responses are computed
from the filter poles by partial fractions.

Impulses cannot be plotted as ordinary curves, so they are drawn as arrows: a single arrow for $\delta(t)$
and an up-down pair for the doublet $\delta'(t)$.

The **Input** menu replaces the unit step with a 0.5 s rectangular pulse or a 1 Hz square wave.
Both are sums of steps, so by linearity and time-invariance the output is the same sum of shifted step
responses. For the pulse, $y(t) = s(t) - s(t - 0.5)$. This equals the convolution $y(t) = x(t) * h(t)$.
The grey trace is the input.

## How to Use

1. Choose a **System** and read its four plots.
2. Hover over either time plot to move the time cursor, and over either frequency plot to move the
   frequency cursor. The red readouts above the plots give the values at the cursor.
3. Move **Cutoff**, **Filter order** and **Damping ratio**. Sliders that the selected system does not use are greyed out.
   The orange dotted line on the frequency plots marks the cutoff, natural or unity-gain frequency.
4. Change the **Input** to see how the same system responds to a pulse or a square wave.
5. **Export h(t) as CSV** downloads the impulse response and step response sampled every 0.01 s from 0 to 2.5 s.

## Iframe Embed Code

You can add this MicroSim to any web page by adding this to your HTML:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/impulse-and-frequency-response-analyzer/main.html"
        height="627px"
        width="100%"
        scrolling="no"></iframe>
```

## Lesson Plan

### Learning Objectives

By the end of this activity, students will be able to:

1. **Explain** why the impulse response completely characterizes an LTI system.
2. **Relate** the step response to the impulse response through integration.
3. **Connect** features of $h(t)$ (decay rate, ringing) to features of $H(f)$ (cutoff, resonant peak).
4. **Compare** how low-pass, high-pass, differentiating, integrating and resonant systems change a signal in time and in frequency.

### Grade Level

Undergraduate (signals and systems)

### Duration

20-30 minutes

### Prerequisites

- Unit impulse and unit step functions
- Convolution and the meaning of an impulse response
- Complex numbers, magnitude and phase, decibels

### Activities

1. **Exploration** (5 min): Low-pass filter, order 1, $f_c = 1$ Hz. Put the time cursor near
   $t = 0.16$ s, which is the time constant $1/(2\pi f_c)$. Confirm that $s(t) \approx 0.63$.
   Put the frequency cursor on $f_c$ and confirm a gain of 0.707 ($-3$ dB) and a phase of $-45°$.
2. **Guided Practice** (15 min):
    - Raise the cutoff from 1 Hz to 4 Hz. What happens to the width of $h(t)$ and to the rise time of $s(t)$?
      State the general rule linking bandwidth and response speed.
    - Step the filter order from 1 to 4. Read the gain at 10 Hz each time ($-20$, $-40$, $-60$, $-80$ dB)
      and the phase at $f_c$ ($-45°$ per order). What is the cost in the step response of a sharper cutoff?
    - Select the resonant system with $\zeta = 0.2$. Count the ringing period in $h(t)$ and compare it with
      the frequency of the peak in $|H(f)|$. Then raise $\zeta$ to 0.7 and to 1.0.
    - Select the high-pass filter with a square-wave input. Explain the shape of the output from the gain at low frequencies.
3. **Discussion** (5 min): The differentiator and the integrator have phase $+90°$ and $-90°$ at every frequency.
   What do their magnitude plots say about how each treats high-frequency noise?

### Assessment

- Student reads the time constant from $s(t)$ and the cutoff from $|H(f)|$ and shows they satisfy $\tau = 1/(2\pi f_c)$.
- Student explains that a resonant peak in frequency and ringing in time are the same behavior seen in two domains.
- Student predicts the pulse response from the step response using $y(t) = s(t) - s(t - 0.5)$.

## References

1. Oppenheim, A. V., Willsky, A. S., & Nawab, S. H. (1997). *Signals and Systems* (2nd ed.). Prentice Hall. Chapters 2, 4 and 6 cover the impulse response, the Fourier transform, and time and frequency characterization of systems.
2. Butterworth, S. (1930). On the theory of filter amplifiers. *Experimental Wireless and the Wireless Engineer*, 7, 536-541.
3. [Butterworth filter](https://en.wikipedia.org/wiki/Butterworth_filter), Wikipedia.
4. [Chapter 3: System Properties and Analysis](../../chapters/03-system-properties-and-analysis/index.md) of this textbook.
