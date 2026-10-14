---
title: FIR Filter Design Comparison Tool
description: Compare two linear-phase FIR designs (window method, frequency sampling or Parks-McClellan) for the same specification, with measured ripple, attenuation and transition width.
image: /sims/fir-filter-design-comparison-tool/fir-filter-design-comparison-tool.png
og:image: /sims/fir-filter-design-comparison-tool/fir-filter-design-comparison-tool.png
twitter:image: /sims/fir-filter-design-comparison-tool/fir-filter-design-comparison-tool.png
social:
   cards: false
quality_score: 90
---

# FIR Filter Design Comparison Tool

<iframe src="main.html" width="100%" height="667px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/fir-filter-design-comparison-tool/main.html" width="100%" height="667px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

<!-- TODO(user): add the p5.js editor link once the sketch is saved in editor.p5js.org:
[Edit in the p5.js Editor](https://editor.p5js.org/<username>/sketches/fir-filter-design-comparison-tool) -->

## Description

This MicroSim designs two odd-length, linear-phase FIR filters, **A** (solid blue) and **B** (dashed maroon), for the
same specification and overlays them so that you can compare design methods directly.

- **Filter type** (low-pass, high-pass, band-pass) and the **cutoff** sliders $\omega_{c1}$, $\omega_{c2}$ (in units of
  $\pi$ rad/sample) set the shared specification. The grey line is the ideal brick-wall response.
- Each design has its own **method**, **taps** $N$ (odd, 11-127) and one shape parameter:
    - **Window**: $h[n] = h_d[n]\,w[n]$ with $h_d[n] = \sin(\omega_c(n-M))/(\pi(n-M))$, $M = (N-1)/2$, and a rectangular,
      Hann, Hamming, Blackman or Kaiser window (slider $\beta$ for Kaiser).
    - **Frequency sampling**: $N$ amplitude samples $H[k]$ at $\omega_k = 2\pi k/N$ (1 in the pass band, 0 in the stop
      band) followed by an inverse DFT. The **transition sample** $T_1$ sets the first stop-band sample next to each band edge.
    - **Parks-McClellan**: the optimal equiripple design for pass and stop bands separated by a transition band of
      width $\Delta\omega$ centred on the cutoff, with equal weights.
- The **right plot** shows $|H(e^{j\omega})|$ evaluated at 2049 frequencies in dB, on a linear scale, or zoomed on the
  passband. The **left plot** shows the impulse response $h[n]$, the zeros of $H(z)$, the phase or the group delay.
- The **table** reports each design's transition width $\Delta\omega$, passband ripple and stop-band attenuation. For a
  Kaiser window it also prints the prediction of Kaiser's formulas.

This MicroSim supports [Chapter 10: Advanced Filter Design and Implementation](../../chapters/10-advanced-filter-design-and-implementation/index.md).

### How the read-outs are measured

- $\delta_p$ is the largest passband deviation $\big||H|-1\big|$ and $\delta_s$ the largest stop-band $|H|$. Passband
  ripple $= 20\log_{10}\frac{1+\delta_p}{1-\delta_p}$ dB and stop-band attenuation $A_s = -20\log_{10}\delta_s$ dB.
- The pass band ends at the last ripple peak before the cutoff and the stop band starts at the first null after it.
  $\Delta\omega$ runs from the frequency where $|H|$ falls below $1-\delta_p$ to the frequency where it reaches
  $\delta_s$ (the coloured bars at the top of the magnitude plot).
- Kaiser's formulas: $\beta = 0.1102(A-8.7)$ for $A > 50$ dB, $\beta = 0.5842(A-21)^{0.4} + 0.07886(A-21)$ for
  $21 \le A \le 50$ dB, and $\Delta\omega \approx (A-7.95)/(2.285\,(N-1))$.
- Every design is symmetric, so $H(e^{j\omega}) = A(\omega)e^{-j\omega M}$: the phase is linear and the group delay is
  $M = (N-1)/2$ samples at every frequency.
- Parks-McClellan limits: the sketch narrows the requested $\Delta\omega$ if the band edges would remove more than half of
  a pass band or stop band, or if Kaiser's estimate $2.285\,\Delta\omega\,(N-1) + 7.95$ exceeds 130 dB (a wider band
  would need a ripple smaller than double-precision arithmetic can resolve). The table and a footnote show the width used.
- Hann and Blackman windows are zero at both ends, and some cutoffs make the end taps of $h_d[n]$ zero (for example
  $\omega_c = 0.40\pi$ with $N = 51$, because $\sin(10\pi) = 0$). Such a filter has fewer than $N-1$ zeros.

## Lesson Plan

### Learning Objectives

By the end of this lesson, students will be able to:

1. **Apply** the window method to design a low-pass, high-pass or band-pass FIR filter and read its transition width, passband ripple and stop-band attenuation
2. **Compare** how the rectangular, Hann, Hamming, Blackman and Kaiser windows trade transition width against stop-band attenuation at a fixed number of taps
3. **Predict** the stop-band attenuation and transition width of a Kaiser-window design from $\beta$ and $N$ with Kaiser's formulas, and check the prediction against the measurement
4. **Explain** how the transition sample $T_1$ changes the stop-band attenuation of a frequency-sampling design, and find the value that maximizes it
5. **Evaluate** which design method meets a given specification with the fewest taps, using Parks-McClellan as the optimal benchmark

### Target Audience

Undergraduate engineering and computer science students in a digital signal processing course (typically third year).
The activities take about 40 minutes.

### Prerequisites

- The z-transform and the frequency response $H(e^{j\omega})$ of an FIR filter
- The ideal low-pass impulse response (the sinc function) and the DFT
- Decibels and the idea of passband and stop-band tolerances

### Activities

All activities start from the default settings: low-pass, $\omega_c = 0.40\pi$, $N = 51$ for both designs, A = Hamming
window, B = frequency sampling with $T_1 = 0.40$. The table reports the values quoted below.

**Activity 1: Window comparison (10 min).** Set Design A's window to each option in turn and copy the table row.

| Window (N = 51) | Transition $\Delta\omega$ | Passband ripple | Stop-band attenuation |
|-----------------|---------------------------|-----------------|-----------------------|
| Rectangular     | 0.037π                    | 1.60 dB         | 21.1 dB               |
| Hann            | 0.125π                    | 0.110 dB        | 43.9 dB               |
| Hamming         | 0.133π                    | 0.030 dB        | 53.7 dB               |
| Blackman        | 0.223π                    | 0.0031 dB       | 75.3 dB               |

Every step down the table buys more attenuation and less ripple with a wider transition band. Switch the left plot to
**Zeros**: with the Blackman window the stop-band zeros on the unit circle start at a higher angle than with the
rectangular window, matching its later stop-band edge.

**Activity 2: Taps versus window shape (10 min).** Keep A on Hamming and set $N$ = 21, 51 and 101. The transition width
falls from 0.333π to 0.133π to 0.067π, so $\Delta\omega\,(N-1) \approx 6.7\pi$ stays constant, while the attenuation
stays near 54 dB (53.6, 53.7 and 53.9 dB). Now choose the Kaiser window with $N = 51$. At $\beta = 5.0$ the table shows
54.0 dB and 0.129π, and the footnote predicts 54.1 dB and 0.128π. At $\beta = 8.0$ it shows 80.9 dB and 0.204π
(predicted 81.3 dB and 0.204π). The shape parameter $\beta$, not $N$, sets the attenuation.

**Activity 3: The transition sample (10 min).** Watch Design B (frequency sampling, $N = 51$). Set $T_1 = 0$: the
attenuation drops to 16.4 dB and the passband ripple grows to 2.29 dB, even though every frequency sample is exactly 0 or
1. Sweep $T_1$ upward: the attenuation peaks at 42.9 dB for $T_1 = 0.38$ (39.7 dB at 0.40) and falls again to 22.0 dB
at $T_1 = 0.70$. Use **Passband zoom** to see the ripple between the samples.

**Activity 4: Which method needs the fewest taps? (10 min).** Keep A at Hamming, $N = 51$ (53.7 dB, $\Delta\omega =$
0.133π). Set B to Parks-McClellan with $\Delta\omega = 0.13\pi$. At $N = 51$, B reaches 58.4 dB with 0.021 dB ripple.
Lower B's taps: at $N = 47$ it still gives 54.7 dB with 0.032 dB ripple, beating A with four fewer taps and a slightly
narrower transition band. At $N = 45$ it falls to 53.1 dB. Switch the left plot to **Group delay**: B's delay drops from
25 to 23 samples.

### Assessment

1. A Hamming design with $N = 51$ has $\Delta\omega = 0.133\pi$ and 53.7 dB attenuation. Predict both values for $N = 101$. *(Answer: the transition width scales as $1/(N-1)$, so $0.133\pi \times 50/100 \approx 0.067\pi$; the attenuation is set by the window and stays near 54 dB. The sim shows 0.067π and 53.9 dB.)*
2. You need at least 60 dB of stop-band attenuation with $N = 51$ taps. Which Kaiser $\beta$ do you choose, and what transition width do you expect? *(Answer: $\beta = 0.1102(60-8.7) = 5.65$, so set $\beta = 5.7$; $\Delta\omega \approx (60-7.95)/(2.285 \times 50) = 0.456$ rad $= 0.145\pi$. The sim measures 60.1 dB and 0.146π.)*
3. Why does a frequency-sampling design with $T_1 = 0$ reach only about 16 dB of attenuation, and how does $T_1 = 0.38$ help? *(Answer: between the samples the response is an interpolation of the abrupt 1-to-0 step, which oscillates like the response of a rectangular window. A transition sample makes the step gradual, so the interpolation ripple shrinks and the attenuation rises to 42.9 dB at the cost of a wider transition band.)*
4. A 51-tap linear-phase filter runs at $f_s = 8$ kHz. How long is its delay, and does it depend on frequency? *(Answer: $M = 25$ samples, or $25/8000 = 3.125$ ms, at every frequency, because the symmetric impulse response gives a phase of $-25\omega$.)*
5. Why does a 47-tap Parks-McClellan design beat a 51-tap Hamming design? *(Answer: Parks-McClellan spreads the error evenly (equiripple) across both bands, while a window design's ripples decay away from the band edge, so most of its stop band has more attenuation than the specification needs and the taps are used less efficiently.)*

### Common Misconceptions

**"More taps give more stop-band attenuation."** With the window method the window shape sets the attenuation and the
number of taps sets the transition width. In Activity 2 the Hamming design stays between 53.6 and 53.9 dB from $N = 21$
to $N = 101$ while $\Delta\omega$ shrinks by a factor of five.

**"A frequency-sampling filter equals the ideal response because it matches it at every sample."** It matches only at
$\omega_k = 2\pi k/N$. With $T_1 = 0$ the samples are exactly 1 and 0, yet the response between them ripples by 2.29 dB
in the pass band and rises to −16.4 dB in the stop band.

## References

1. [Finite impulse response](https://en.wikipedia.org/wiki/Finite_impulse_response) - Wikipedia - FIR filters, the window method and frequency sampling
2. [Window function](https://en.wikipedia.org/wiki/Window_function) - Wikipedia - definitions and side-lobe levels of the rectangular, Hann, Hamming and Blackman windows
3. [Kaiser window](https://en.wikipedia.org/wiki/Kaiser_window) - Wikipedia - the Bessel-function window and the formulas that relate $\beta$, attenuation and filter length
4. [Parks-McClellan filter design algorithm](https://en.wikipedia.org/wiki/Parks%E2%80%93McClellan_filter_design_algorithm) - Wikipedia - the optimal equiripple design used for method three
5. [Remez algorithm](https://en.wikipedia.org/wiki/Remez_algorithm) - Wikipedia - the exchange algorithm behind Parks-McClellan
6. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on windowed-sinc and custom FIR filters
