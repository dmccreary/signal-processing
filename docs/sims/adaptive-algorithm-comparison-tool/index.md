---
title: Adaptive Algorithm Comparison Tool
description: LMS, NLMS and RLS identify the same unknown FIR plant from the same noisy data. Compare convergence speed, steady-state error, stability and tracking.
image: /sims/adaptive-algorithm-comparison-tool/adaptive-algorithm-comparison-tool.png
og:image: /sims/adaptive-algorithm-comparison-tool/adaptive-algorithm-comparison-tool.png
twitter:image: /sims/adaptive-algorithm-comparison-tool/adaptive-algorithm-comparison-tool.png
social:
   cards: false
quality_score: 100
---

# Adaptive Algorithm Comparison Tool

<iframe src="main.html" width="100%" height="682px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/adaptive-algorithm-comparison-tool/main.html" width="100%" height="682px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

<!-- TODO(user): add the p5.js editor link once the sketch is saved in editor.p5js.org:
[Edit in the p5.js Editor](https://editor.p5js.org/<username>/sketches/adaptive-algorithm-comparison-tool) -->

## Description

This MicroSim runs a **system-identification** experiment. An unknown FIR plant $\mathbf{w}_o$ (scaled to unit energy) is
driven by an input $x[n]$ of power $\sigma_x^2 = 1$, and white noise $v[n]$ of power $\sigma_v^2$ is added to its output:
$d[n] = \mathbf{w}_o^T\mathbf{x}[n] + v[n]$. Three $M$-tap adaptive filters learn $\mathbf{w}_o$ from exactly the same data:

- **LMS** (blue): $\mathbf{w} \leftarrow \mathbf{w} + \mu\, e[n]\,\mathbf{x}[n]$
- **NLMS** (green): $\mathbf{w} \leftarrow \mathbf{w} + \tilde{\mu}\, e[n]\,\mathbf{x}[n] / (\epsilon + \|\mathbf{x}[n]\|^2)$
- **RLS** (maroon): $\mathbf{k} = \mathbf{P}\mathbf{x} / (\lambda + \mathbf{x}^T\mathbf{P}\mathbf{x})$, $\mathbf{w} \leftarrow \mathbf{w} + \mathbf{k}\,e[n]$, $\mathbf{P} \leftarrow (\mathbf{P} - \mathbf{k}\mathbf{x}^T\mathbf{P})/\lambda$, starting from $\mathbf{P}(0) = \mathbf{I}/\delta$

The **learning curves** plot the error power $e^2[n]$ in dB, averaged over 1-20 runs and over blocks of 5 iterations.
The dashed line is the Wiener floor $J_{min}$. The **weight-error norm** $\|\mathbf{w}_o - \mathbf{w}[n]\|^2$ shows how close the
coefficients are. The right panel shows run 1's weights, frequency response, or the trajectories of its two largest taps.
The read-out table gives the final MSE (mean over $n$ = 1000-1499) and the measured misadjustment beside the textbook
approximations $\mu M\sigma_x^2/2$, $\tilde{\mu}/(2-\tilde{\mu})$ and $(1-\lambda)M/(1+\lambda)$. It also gives the iteration at
which each curve first comes within 3 dB of its final value.

**Change the plant at n = 500** flips the sign of every plant tap halfway through, to test tracking. Every setting reuses
the same random data, so any difference comes from the control you changed. A red warning appears when
$\mu > 2/(M\sigma_x^2)$. With $\lambda = 1$, RLS gives the same estimate as a Kalman filter whose state is the constant
weight vector, so it stands in for the Kalman filter here.

This MicroSim supports [Chapter 11: Adaptive Signal Processing](../../chapters/11-adaptive-signal-processing/index.md).

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Compare** the convergence speed and final MSE of LMS, NLMS and RLS on the same system-identification problem, using the learning curves and the read-out table
2. **Analyze** how input correlation, measured by the eigenvalue spread $\chi(\mathbf{R})$, slows LMS and NLMS but not RLS
3. **Evaluate** the LMS step-size trade-off by predicting the misadjustment $\mu M\sigma_x^2/2$ and the stability limit, then judging how well each approximation matches the measured values
4. **Evaluate** a choice of RLS forgetting factor $\lambda$ for tracking, explaining why $\lambda = 1$ fails after the plant changes
5. **Explain** why a filter shorter than the plant settles at a floor above the noise power ($J_{min} > \sigma_v^2$)

### Target Audience

Undergraduate juniors and seniors in a digital signal processing or adaptive filtering course. The four activities take
about 45 minutes.

### Prerequisites

- FIR filters and convolution
- Mean-squared error, the Wiener solution $\mathbf{w}^* = \mathbf{R}^{-1}\mathbf{p}$, and eigenvalues of the autocorrelation matrix $\mathbf{R}$
- The LMS, NLMS and RLS update equations from Chapter 11

### Activities

Press **Reset** before each activity. The defaults are plant B (8-tap lowpass), white input, noise $-30$ dB, 10 runs,
$M = 8$, $\mu = 0.010$, $\tilde{\mu} = 0.50$, $\lambda = 0.990$ and $\delta = 0.01$. Each experiment takes about 1.5 s.

**Activity 1: The baseline race (10 min).**

1. Watch the default run. RLS comes within 3 dB of its final MSE at $n = 20$ (about $2M$), NLMS at $n = 50$ and LMS at $n = 305$. The final MSEs are $-29.8$, $-28.5$ and $-29.8$ dB, against $J_{min} = -30.0$ dB.
2. Read the misadjustment column: LMS 4.1% (approximation 4.0%), RLS 4.0% (4.0%), NLMS 41% (33%). NLMS converges fast but pays for it with a higher floor.
3. Set $\tilde{\mu} = 0.08$. NLMS now reads 5.4% / 4.2% and converges at $n = 350$, about as slowly as LMS. For white input NLMS behaves like LMS with $\mu = \tilde{\mu}/(M\sigma_x^2) = 0.01$.
4. Evaluate the NLMS approximation. $\tilde{\mu}/(2-\tilde{\mu})$ assumes a long filter. For Gaussian white input, multiplying by $M/(M-2)$ gives 44% at $\tilde{\mu} = 0.5$ and 5.6% at $\tilde{\mu} = 0.08$, much closer to the measured 41% and 5.4%.

**Activity 2: Colored input and eigenvalue spread (10 min).**

1. Set **Input** to *AR(1) a = 0.5*. The footer shows $\chi(\mathbf{R}) = 7.47$, and LMS still converges at $n = 285$.
2. Set **Input** to *AR(1) a = 0.9*, so $\chi(\mathbf{R}) = 113$. RLS does not change (within 3 dB at $n = 20$, 3.9% / 4.0%). LMS needs 690 iterations and its misadjustment reads 41% against 4.0%, because it has not finished converging.
3. Compare the weight-error plot. The LMS curve is still falling at $n = 1500$ (about $-27$ dB), whereas with white input it reached about $-45$ dB.
4. Switch **Panel** to *Freq. response*. All three estimates match the plant at low frequencies, where the input has power. Above about $0.6\pi$, LMS and NLMS miss the stopband while RLS follows it.

**Activity 3: Step size, misadjustment and stability (10 min).**

1. With white input, set $\mu$ = 0.005, 0.02 and 0.04. The read-outs are 2.9% / 2.0% (converged at $n = 645$), 8.7% / 8.0% ($n = 170$) and 20% / 16% ($n = 90$). Faster convergence costs a higher floor.
2. The textbook value $\mu M\sigma_x^2/2$ falls short at large $\mu$. Mean-square analysis for white Gaussian input gives $\mu M\sigma_x^2 / (2 - \mu(M+2)\sigma_x^2)$, which predicts 8.9% at $\mu = 0.02$ and 20.0% at $\mu = 0.04$. At $\mu = 0.005$ the measured 2.9% is still above the predicted 2.1%, because LMS is still settling after $n = 1000$.
3. Raise $\mu$ toward the warning. At $\mu = 0.13$ the learning curve shows spikes and the final MSE is $-25.8$ dB. At 0.18 it is $-6.9$ dB, and at 0.20 it is $+23.9$ dB. At 0.22 the table reports *diverged in 5 of 10 runs*, and at 0.23 *10 of 10*. The red warning appears only above 0.250.

**Activity 4: Tracking and the RLS memory (12 min).**

1. Click **Change the plant at n = 500**. LMS and RLS jump to about $+6$ dB: the error becomes twice the plant output, so its power is 4 times $\sigma_x^2\|\mathbf{w}_o\|^2 = 1$. NLMS starts re-adapting so quickly that its curve peaks near $+4$ dB. The *Recovered after n = 500* column reads LMS 340, NLMS 75 and RLS 405.
2. Set $\lambda = 0.980$ (memory $1/(1-\lambda) = 50$ samples). RLS now recovers in 215 iterations, with misadjustment 8.3% / 8.1%. At $\lambda = 0.950$ it recovers in 90 iterations but reads 22% / 21%.
3. Set $\lambda = 1.000$. RLS never recovers (*> 1000*): its final MSE is $-1.8$ dB, because it weights the old plant as heavily as the new one.
4. Click **Keep the plant fixed** and set $\lambda = 0.990$. Change **RLS δ** to 1, 10 and 100. RLS now converges at $n$ = 50, 155 and 350 instead of 20. The fast start of RLS comes from a large initial $\mathbf{P}(0) = \mathbf{I}/\delta$.

### Assessment

1. With white input, $M = 16$ and $\mu = 0.01$, predict the LMS misadjustment and the $\mu$ at which the warning appears. *(Answer: $\mu M\sigma_x^2/2 = 8\%$ and the sim measures 8.3%. The warning threshold is $2/(M\sigma_x^2) = 0.125$.)*
2. For RLS with $\lambda = 0.98$ and $M = 8$, estimate the misadjustment and the memory length. *(Answer: $(1-\lambda)M/(1+\lambda) = 0.02 \times 8 / 1.98 = 8.1\%$ (measured 8.3%), and the memory is about $1/(1-\lambda) = 50$ samples.)*
3. Why does the AR(1) input with $a = 0.9$ slow LMS but not RLS? *(Answer: $\chi(\mathbf{R}) = 113$. Each LMS mode converges at a rate set by $\mu\lambda_i$, so the slowest mode is about 113 times slower than the fastest. RLS scales its update by $\mathbf{P} \approx \mathbf{R}^{-1}$, which equalizes the modes, so it still converges in about 20 iterations.)*
4. With plant C (12 taps) and $M = 8$, LMS and RLS settle at $-11.4$ dB (NLMS at $-10.0$ dB) instead of near $-30$ dB, and the approximation column shows a dash. Why, and what fixes it? *(Answer: an 8-tap filter cannot represent taps 8-11 of the plant. Their output power sets the Wiener floor $J_{min} = -11.5$ dB, so no step size can do better. Setting $M = 12$ restores $J_{min} = -30.0$ dB, and LMS then reaches $-29.7$ dB.)*
5. LMS with $\mu = 0.01$ and RLS with $\lambda = 0.99$ have the same misadjustment (about 4%). Which recovers faster after the plant change, and why? *(Answer: neither has an advantage; LMS needs 340 iterations and RLS 405. Once converged, $\mathbf{P} \approx (1-\lambda)\mathbf{R}^{-1}$, so RLS acts like LMS with step $1-\lambda = 0.01$ on whitened data. Its fast start came from $\mathbf{P}(0)$, not from better tracking.)*

### Common Misconceptions

**"Any step size below $2/(M\sigma_x^2)$ is safe."** That bound guarantees convergence of the *mean* weight vector,
because $\lambda_{max} \le \mathrm{tr}(\mathbf{R}) = M\sigma_x^2$. The MSE needs a smaller step: about
$2/((M+2)\sigma_x^2) = 0.20$ for white Gaussian input with $M = 8$. In Activity 3, half the runs diverge at $\mu = 0.22$ with
no warning shown. With the *AR(1) a = 0.9* input, one run in ten already diverges at $\mu = 0.03$, because a burst of
large input samples makes $\mu\|\mathbf{x}\|^2$ exceed 2. NLMS divides by $\|\mathbf{x}\|^2$, so it stays stable for any
$0 < \tilde{\mu} < 2$.

**"RLS always tracks faster than LMS."** RLS converges fast from its start-up. After the plant changes, its speed is set
by $\lambda$, and at equal misadjustment it recovers no faster than LMS (Activity 4, step 1).

**"A flat learning curve means the weights are right."** With *AR(1) a = 0.9*, the LMS MSE is within 1.6 dB of
$J_{min}$, yet its weight error is still about $-27$ dB rather than $-45$ dB. Errors along small-eigenvalue directions
barely change the output, so the MSE hides them.

## References

1. [Least mean squares filter](https://en.wikipedia.org/wiki/Least_mean_squares_filter) - Wikipedia - the LMS and normalized LMS updates, the step-size bound and misadjustment
2. [Recursive least squares filter](https://en.wikipedia.org/wiki/Recursive_least_squares_filter) - Wikipedia - the RLS recursion, the forgetting factor and the inverse correlation matrix $\mathbf{P}$
3. [Adaptive filter](https://en.wikipedia.org/wiki/Adaptive_filter) - Wikipedia - the adaptive filter structure and the system-identification configuration used here
4. [System identification](https://en.wikipedia.org/wiki/System_identification) - Wikipedia - estimating an unknown system from its input and noisy output
5. [Wiener filter](https://en.wikipedia.org/wiki/Wiener_filter) - Wikipedia - the minimum-MSE solution and the floor $J_{min}$ drawn on the learning curves
6. [Kalman filter](https://en.wikipedia.org/wiki/Kalman_filter) - Wikipedia - the state-space estimator that RLS matches when the state is constant
