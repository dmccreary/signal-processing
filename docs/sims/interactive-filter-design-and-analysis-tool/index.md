---
title: Interactive Filter Design and Analysis Tool
description: Design low-pass, high-pass, band-pass, band-stop, notch, comb and all-pass filters as IIR or FIR and see their responses, poles, stability and effect on three tones.
image: /sims/interactive-filter-design-and-analysis-tool/interactive-filter-design-and-analysis-tool.png
og:image: /sims/interactive-filter-design-and-analysis-tool/interactive-filter-design-and-analysis-tool.png
twitter:image: /sims/interactive-filter-design-and-analysis-tool/interactive-filter-design-and-analysis-tool.png
social:
   cards: false
quality_score: 90
---

# Interactive Filter Design and Analysis Tool

<iframe src="main.html" width="100%" height="782px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/interactive-filter-design-and-analysis-tool/main.html" width="100%" height="782px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

<!-- TODO(user): add the p5.js editor link once the sketch is saved in editor.p5js.org:
[Edit in the p5.js Editor](https://editor.p5js.org/<username>/sketches/interactive-filter-design-and-analysis-tool) -->

## Description

This MicroSim designs a digital filter at a sample rate of $f_s = 8000$ Hz and shows it several ways at once.
The **magnitude plot** (maroon) shows $|H(f)|$ with the ideal brick-wall response as a dashed gray line and gold
markers at the three test-tone frequencies. The **lower plot** shows the unwrapped phase, the group delay, the impulse
response $h[n]$ or the step response $s[n]$. The **pole-zero plot** marks poles (×) and zeros (o) in the z-plane, with
a number beside repeated roots. The read-out below it reports stability, the largest pole radius, the order, the
−3 dB frequencies, the passband (gain within 3 dB of the peak) and the stopband (at least 40 dB below the peak).
The bottom row filters the test signal $x[n] = \sin(2\pi\,200\,n/f_s) + \sin(2\pi\,1000\,n/f_s) + \sin(2\pi\,3000\,n/f_s)$
sample by sample with the same coefficients. It shows 10 ms of input (gray) and output (blue) after a 2 s warm-up, and
bars with the amplitude of each tone before and after the filter.

| Control | What it does |
|---------|--------------|
| Filter type | Low-pass, high-pass, band-pass, band-stop, notch, comb or all-pass |
| Design | IIR as a cascade of biquads, the same IIR multiplied out into one direct-form polynomial, or FIR (no feedback) |
| Show | Selects the lower plot: phase, group delay, impulse response or step response |
| dB scale | Magnitude in dB (−80 to +10 dB) or as a linear gain |
| Cutoff fc / Centre f0 | 20–3500 Hz on a logarithmic slider |
| Order N | IIR: Butterworth order 1–8 (band-pass and band-stop have order 2N). FIR: order M = 8N |
| Q | Selectivity of the band-pass, band-stop, notch and all-pass sections |
| Comb delay D, gain g | Delay 2–64 samples and gain 0–0.95 of the comb filter |
| Coeff. bits | Rounds every coefficient to 4–24 bits; the right end (off) keeps 64-bit floating point |

Sliders that do not apply to the chosen filter are grayed out. This MicroSim supports
[Chapter 9: Filter Design Fundamentals](../../chapters/09-filter-design-fundamentals/index.md), in particular the
sections on filter types, FIR and IIR structures, and filter stability.

### Design Equations

**IIR filters** start from an analog Butterworth prototype and use the bilinear transform with prewarping,
$\Omega = \tan(\pi f / f_s)$, so the −3 dB frequency lands exactly on the slider value. Each pair of complex poles
becomes one second-order section (biquad). For order 2 this is exactly the RBJ cookbook low-pass:

$$b = \left[\tfrac{1-\cos\omega_0}{2},\ 1-\cos\omega_0,\ \tfrac{1-\cos\omega_0}{2}\right],\quad
a = \left[1+\alpha,\ -2\cos\omega_0,\ 1-\alpha\right],\quad \omega_0 = \frac{2\pi f_c}{f_s},\ \alpha = \frac{\sin\omega_0}{2Q}$$

Higher even orders cascade sections with $Q_k = 1/\left(2\cos\frac{(2k-1)\pi}{2N}\right)$; odd orders add a
first-order section. Band-pass and band-stop filters use the low-pass-to-band-pass transformation, so order $N$ gives
$N$ biquads; with $N = 1$ they are the RBJ constant-0-dB-peak band-pass and notch sections. The notch is always one
biquad. The all-pass cascades RBJ all-pass biquads (plus a first-order all-pass when $N$ is odd), so its phase at
$f_0$ is $-90N$ degrees. Every section is filtered with $y[n] = \sum_k b_k x[n-k] - \sum_{k\ge 1} a_k y[n-k]$.

**FIR filters** are Hamming-windowed sinc filters of order $M = 8N$ ($M + 1$ taps). For a windowed sinc the cutoff
is the half-amplitude (−6 dB) point, so the −3 dB frequency is lower than $f_c$. The FIR band-pass and band-stop use
edges $f_1, f_2$ with $\sqrt{f_1 f_2} = f_0$ and $f_2 - f_1 = f_0/Q$. The FIR notch is the 3-tap filter
$[1,\ -2\cos\omega_0,\ 1]$ scaled to a peak gain of 1.

**Comb filters** are $y[n] = x[n] + g\,x[n-D]$ (FIR), with $|H| = \sqrt{1 + g^2 + 2g\cos(\omega D)}$, and
$y[n] = (1-g)\,x[n] + g\,y[n-D]$ (IIR, peaks scaled to 0 dB). Both have peaks every $f_s/D$ Hz and dips at odd
multiples of $f_s/(2D)$.

**Coefficient rounding.** Each coefficient vector (every numerator $b$, and the feedback coefficients
$a_1 \ldots a_N$ of every section; $a_0 = 1$ stays exact) is given a power-of-two scale $2^e$ at least as large as
its largest coefficient, and each coefficient is rounded to a multiple of $2^e / 2^{B-1}$ ($B$ bits including the
sign). A biquad's $a_1$ is always below 2 in magnitude, so its step is $2^{-(B-2)}$. The coefficients of a
high-order direct-form polynomial are much larger, so the same $B$ gives a much coarser step.

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Classify** low-pass, high-pass, band-pass, band-stop, notch, comb and all-pass filters by which of the 200, 1000 and 3000 Hz test tones each one passes or removes
2. **Explain** why raising the order of a Butterworth filter steepens the transition band without moving the −3 dB frequency
3. **Compare** FIR and IIR designs using their pole locations, group delay and impulse responses
4. **Calculate** the peak and dip frequencies of a comb filter from $f_s/D$ and choose $D$ to remove given tones
5. **Analyze** how rounding the coefficients moves poles, and why a biquad cascade survives rounding that makes the same filter unstable in direct form

### Target Audience

Undergraduate engineering and computer science students in a first digital signal processing course, after the
z-transform has been introduced. Plan about 45 minutes for the four activities.

### Prerequisites

- Difference equations and the z-transform
- Poles, zeros and the unit circle
- Frequency response, magnitude in decibels and phase
- Sinusoids and sampling at a rate $f_s$

### Activities

**Activity 1: Filter families and the test signal (10 min).** Start from the default settings (Low-pass, IIR biquad
cascade, $f_c$ = 500 Hz, N = 4). The tone bars read 1.00, 0.05 and 0.00: the 200 Hz tone passes, the other two are
removed, and the blue output is a clean 200 Hz sinusoid. Set each row of the table and record the three bar values.
Then compare each magnitude curve with its dashed ideal response.

| Settings | 200 Hz | 1000 Hz | 3000 Hz | Read-out |
|----------|--------|---------|---------|----------|
| Low-pass, $f_c$ = 500 Hz, N = 4 | 1.00 | 0.05 | 0.00 | −3 dB at 500 Hz |
| High-pass, $f_c$ = 500 Hz, N = 4 | 0.02 | 1.00 | 1.00 | Stopband 0–160 Hz |
| Band-pass, $f_0$ = 1000 Hz, Q = 2, N = 2 | 0.01 | 1.00 | 0.01 | −3 dB at 797 and 1242 Hz |
| Band-stop, $f_0$ = 1000 Hz, Q = 1, N = 4 | 1.00 | 0.00 | 1.00 | Stopband 866–1150 Hz |
| Notch, $f_0$ = 1000 Hz, Q = 10 | 1.00 | 0.00 | 1.00 | −3 dB at 956 and 1046 Hz |

The band-stop removes a wide band (866–1150 Hz is at least 40 dB down), while the notch is only 90 Hz wide at its
−3 dB points. Both remove the 1000 Hz tone and keep the other two.

**Activity 2: Order, phase, and FIR versus IIR (12 min).**

1. Low-pass, $f_c$ = 500 Hz. Set N = 1, then 4, then 8. The −3 dB read-out stays at 500 Hz, but the 1000 Hz bar falls from 0.43 to 0.05 to 0.00, and the stopband starts at 3872, 1430 and 866 Hz. With **Show: phase**, the phase at 500 Hz is −45°, −180° and −360°: $-45N$ degrees.
2. Set N = 4 and **Show: group delay**. The IIR group delay peaks at about 10 samples (1.25 ms) near 450 Hz, so tones near the cutoff are delayed more than others.
3. Change **Design** to FIR (order M = 32, 33 taps). The group delay becomes a flat line at 16 samples (2 ms), which is $M/2$: linear phase. The pole-zero plot shows all 32 poles at $z = 0$, and the read-out says STABLE. The −3 dB read-out is 398 Hz, because 500 Hz is the windowed sinc's −6 dB point. With **Show: impulse response**, the 33 taps are symmetric about n = 16.
4. Notch, $f_0$ = 1000 Hz. The IIR notch (Q = 10) gives bars 1.00, 0.00, 1.00. The FIR notch gives 0.16, 0.00, 0.83: its two zeros on the unit circle remove 1000 Hz but also cut most of the spectrum. The IIR notch places poles at radius 0.9652 right beside its zeros, which confines the notch to 956–1046 Hz.

**Activity 3: Comb and all-pass filters (8 min).**

1. Comb, FIR, D = 4, g = 0.95. The read-out gives peaks every $f_s/D$ = 2000 Hz (+5.8 dB) and dips at odd multiples of 1000 Hz (−26.0 dB). The bars read 1.85, 0.05, 0.05: the dips remove both the 1000 Hz and the 3000 Hz tones.
2. Predict the bars for D = 8, then test. Now the peaks are every 1000 Hz, so the 1000 and 3000 Hz tones sit on peaks (1.95) and the 200 Hz tone reads 1.58.
3. Switch to the IIR (feedback) comb with D = 8 and g = 0.90. It has narrow passbands at multiples of 1000 Hz, so the bars read 0.09, 1.00, 1.00, and the impulse response repeats every 8 samples (0.10, then 0.09, ...). Its 8 poles sit at radius $0.9^{1/8} = 0.9869$.
4. All-pass, $f_0$ = 1000 Hz, Q = 2. For N = 1, 2 and 4 every bar reads 1.00, yet the read-out gives a phase at 1000 Hz of −90°, −180° and −360°. The output waveform changes shape because the three tones are delayed by different amounts.

**Activity 4: Coefficient rounding and stability (15 min).**

1. Low-pass, $f_c$ = 500 Hz, N = 8, IIR biquad cascade. Set **Coeff. bits** to 16. The filter stays STABLE with a largest pole radius of 0.9279, the same to four decimals as without rounding (step 1/16384).
2. Change **Design** to IIR direct form, which is the same filter multiplied out into one 8th-order polynomial. At 16 bits the read-out says UNSTABLE with a pole radius of 1.0497. A cross sits outside the unit circle, the output bars turn red, and the output grows. The step is now 1/1024, because the direct-form coefficients are much larger. At 20 bits the direct form is stable again (0.9296), but the −3 dB point has moved to 493 Hz.
3. Still in direct form, set **Coeff. bits** to off (64-bit floating point) and $f_c$ = 20 Hz. The direct form is unstable even without deliberate rounding (radius 1.0032), while the biquad cascade at the same settings is stable (0.9969, a pole close to the unit circle).
4. Biquad cascade, $f_c$ = 100 Hz, N = 2, **Coeff. bits** = 8. Rounding puts a pole exactly on the unit circle at $z = 1$. With **Show: step response**, the output keeps rising (6.37 at n = 127) instead of settling at 1. At 9 bits the filter is stable again (radius 0.9479).
5. Return to FIR (low-pass, $f_c$ = 500 Hz, N = 4) and set 6 bits. The filter stays STABLE, because all of its poles are at $z = 0$. Only the stopband gets worse: it now ends at 3887 Hz instead of 4000 Hz.

### Assessment

1. With $f_s$ = 8000 Hz, which delay D makes the FIR comb $y[n] = x[n] + g\,x[n-D]$ remove the 1000 and 3000 Hz tones but keep 200 Hz? *(Answer: D = 4. The dips are at odd multiples of $f_s/(2D)$ = 1000 Hz, which are 1000 and 3000 Hz. With g = 0.95 the bars read 1.85, 0.05 and 0.05.)*
2. Use the prewarped frequencies $\Omega = \tan(\pi f/f_s)$ to compute $|H|$ at 1000 Hz for the 4th-order Butterworth low-pass with $f_c$ = 500 Hz. *(Answer: $\Omega_c = \tan(\pi/16) = 0.1989$ and $\Omega = \tan(\pi/8) = 0.4142$, so the ratio is 2.082 and $|H| = 1/\sqrt{1 + 2.082^{8}} = 0.053$, which matches the 0.05 bar.)*
3. Why is the FIR low-pass group delay a flat 16 samples while the IIR group delay varies with frequency? *(Answer: the 33 FIR taps are symmetric about n = 16, so $H(e^{j\omega}) = e^{-j16\omega}A(\omega)$ with real $A$: the phase is linear and every frequency is delayed by $M/2$ = 16 samples (2 ms). The IIR poles make the phase nonlinear, and the delay is largest near the cutoff.)*
4. A 4th-order all-pass filter at $f_0$ = 1000 Hz leaves all three bars at 1.00. What does it change, and what is its phase at 1000 Hz? *(Answer: it changes only the phase, so each tone is delayed by a different amount and the waveform changes shape. The phase at 1000 Hz is −360°, that is −90° per order.)*
5. The same 8th-order low-pass ($f_c$ = 500 Hz) is stable as a biquad cascade but unstable in direct form at 16 bits. Explain why. *(Answer: the roots of a high-order polynomial with clustered roots are very sensitive to its coefficients. Rounding the large direct-form coefficients (step 1/1024) moves a pole to radius 1.0497. Each biquad places only one pole pair from two small coefficients rounded with step 1/16384, so its poles barely move.)*

### Common Misconceptions

**"A higher-order filter has a lower cutoff."** For a Butterworth design the −3 dB frequency does not depend on the
order. In Activity 2 it stays at 500 Hz for N = 1, 4 and 8. Only the transition band narrows: the stopband edge
moves from 3872 Hz to 866 Hz.

**"Coefficients rounded to 16 bits are practically exact, so the filter cannot change much."** Whether rounding matters
depends on the structure. At 16 bits the biquad cascade keeps its pole radius at 0.9279, while the direct form of the
same filter becomes unstable (radius 1.0497). The pole-zero plot shows the cross leaving the unit circle.

**"The cutoff of an FIR filter is its −3 dB frequency."** For a windowed-sinc design the cutoff is the half-amplitude
(−6 dB) point. With $f_c$ = 500 Hz and M = 32 the −3 dB read-out is 398 Hz.

## References

1. [Digital biquad filter](https://en.wikipedia.org/wiki/Digital_biquad_filter) - Wikipedia - the second-order section used for every IIR design in this MicroSim, in direct forms I and II
2. [Audio EQ Cookbook](https://www.w3.org/TR/audio-eq-cookbook/) - W3C (R. Bristow-Johnson) - the RBJ low-pass, high-pass, band-pass, notch and all-pass biquad formulas
3. [Butterworth filter](https://en.wikipedia.org/wiki/Butterworth_filter) - Wikipedia - maximally flat magnitude response, pole locations and the Q values of the cascaded sections
4. [Bilinear transform](https://en.wikipedia.org/wiki/Bilinear_transform) - Wikipedia - mapping analog prototypes to digital filters, with frequency prewarping
5. [Comb filter](https://en.wikipedia.org/wiki/Comb_filter) - Wikipedia - feedforward and feedback comb filters and their peak and dip frequencies
6. [All-pass filter](https://en.wikipedia.org/wiki/All-pass_filter) - Wikipedia - unit magnitude response with frequency-dependent phase
7. [Finite impulse response](https://en.wikipedia.org/wiki/Finite_impulse_response) - Wikipedia - FIR filters, the window design method and linear phase
8. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on windowed-sinc and recursive filters
