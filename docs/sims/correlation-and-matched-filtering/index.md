---
title: Correlation and Matched Filtering
description: Find copies of a known template hidden in noise by cross-correlating the received signal with the template, and compare the matched filter with a simple moving average.
image: /sims/correlation-and-matched-filtering/correlation-and-matched-filtering.png
og:image: /sims/correlation-and-matched-filtering/correlation-and-matched-filtering.png
twitter:image: /sims/correlation-and-matched-filtering/correlation-and-matched-filtering.png
social:
   cards: false
quality_score: 100
---

# Correlation and Matched Filtering

<iframe src="main.html" height="617px" width="100%" scrolling="no"></iframe>

[Run the Correlation and Matched Filtering MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit in the p5.js Editor](https://editor.p5js.org/)

## About This MicroSim

A receiver knows the shape of the signal it is looking for, the template $s[n]$ of length $L$, but not
when it arrives. The received signal is

$$r[n] = \sum_i s[n - d_i] + w[n]$$

where the $d_i$ are the unknown delays and $w[n]$ is white Gaussian noise. The MicroSim has three rows of plots:

- **Received signal $r[n]$** (600 samples). With **True delays** ticked, the green bands show where the templates actually are.
- **Template $s[n]$** and the **matched filter** $h[n] = s[L-1-n]$, which is the template reversed in time.
- **Cross-correlation** $R_{rs}[m] = \sum_k r[k]\,s[k-m]$, divided by the template energy $E_s = \sum_n s^2[n]$
  so that a clean, isolated template gives a peak of exactly 1 at lag $m = d_i$.

Filtering $r[n]$ with the matched filter gives the same numbers as the cross-correlation, delayed by
$L - 1$ samples: $(r * h)[m + L - 1] = R_{rs}[m]$. Correlation and matched filtering are the same operation.

A peak is declared wherever the correlation is a local maximum above the dashed threshold. Each detected
peak is labelled with its lag $m$ and its measured signal-to-noise ratio, $20\log_{10}(\text{peak}/\sigma_c)$,
where $\sigma_c = \sigma/\sqrt{E_s}$ is the standard deviation of the noise in the correlation output.

**Why the matched filter wins.** Define the input SNR as the average template power divided by the noise
variance, $(E_s/L)/\sigma^2$. The peak SNR at the matched filter output is $E_s/\sigma^2$, which is $L$ times larger.
In decibels the gain is $10\log_{10}L$: 16.8 dB for the 48-sample templates and 17.2 dB for the 52-sample
Barker code. No other linear filter does better in white noise.

Tick **Moving average** to overlay the output of a plain $L$-sample averager scaled to the same output noise level.
For the rectangular pulse the two curves coincide, because the averager *is* the matched filter for a rectangle.
For the other templates the averager's peak is far smaller (0.11 for the sine burst, 0.16 for the chirp and
0.38 for the Barker code, against 1.00 for the matched filter).

| Template | Samples | Correlation peak shape |
|----------|---------|------------------------|
| Rectangular pulse | 48 | Wide triangle, so the delay estimate is easily shifted by noise |
| Sine burst (4 cycles) | 48 | Oscillating, with strong side peaks one period (12 samples) away |
| Chirp, 0.02 to 0.25 cycles per sample | 48 | Narrow single peak (pulse compression) |
| Barker-13 code, 4 samples per chip | 52 | Narrow peak with side lobes no larger than 1/13 of the peak |

## How to Use

1. Choose a **Template**.
2. Lower the **Input SNR** until you can no longer see the templates in the received signal. Check whether the
   correlation peaks still stand out.
3. Set the **Number of signals** from 1 to 5. Delays are random and at least 1.5 template lengths apart.
4. Adjust the **Threshold** and watch the trade-off between missed signals and false alarms in the summary line.
5. Press **New Noise** for a new noise record and new delays.
6. Untick **True delays** to hide the answers and try locating the signals from the correlation alone.

## Iframe Embed Code

You can add this MicroSim to any web page by adding this to your HTML:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/correlation-and-matched-filtering/main.html"
        height="617px"
        width="100%"
        scrolling="no"></iframe>
```

## Lesson Plan

### Learning Objectives

By the end of this activity, students will be able to:

1. **Explain** how cross-correlation locates a known pattern inside a longer signal.
2. **Relate** the matched filter to the time-reversed template and to cross-correlation.
3. **Analyze** how input SNR, template length and threshold affect missed detections and false alarms.
4. **Compare** templates by the sharpness of their correlation peaks and the resulting timing accuracy.

### Grade Level

Undergraduate (signals and systems, communications)

### Duration

20-30 minutes

### Prerequisites

- Discrete convolution and correlation
- Signal energy and power, decibels
- Basic idea of random noise and standard deviation

### Activities

1. **Exploration** (5 min): Chirp template, three signals, input SNR 0 dB. Untick True delays.
   Can you find the signals by eye in the top plot? Now read the lags of the correlation peaks, tick True delays, and compare.
2. **Guided Practice** (15 min):
    - Lower the input SNR to $-10$ dB. The expected peak SNR is $-10 + 16.8 = 6.8$ dB. Press New Noise ten times and
      tally missed signals and false alarms. Repeat with the threshold at 0.35 and at 0.70.
    - Compare the rectangular pulse and the chirp at 0 dB. Which gives the larger timing error in the summary line? Explain from the width of the peak.
    - Select the sine burst and tick Moving average. Explain why the averager output shows almost nothing where the signals are.
    - Select the rectangular pulse with Moving average ticked. Why do the two curves coincide?
3. **Discussion** (5 min): Radar designers want a long pulse for energy and a narrow correlation peak for range accuracy.
   Which templates here provide both, and how?

### Assessment

- Student states that the matched filter impulse response is the time-reversed template and that its output equals the cross-correlation.
- Student computes the expected peak SNR from the input SNR and template length.
- Student explains the trade-off set by the detection threshold.

## References

1. Turin, G. L. (1960). An introduction to matched filters. *IRE Transactions on Information Theory*, 6(3), 311-329.
2. Oppenheim, A. V., & Schafer, R. W. (2010). *Discrete-Time Signal Processing* (3rd ed.). Pearson.
3. [Matched filter](https://en.wikipedia.org/wiki/Matched_filter), Wikipedia.
4. [Barker code](https://en.wikipedia.org/wiki/Barker_code), Wikipedia.
5. [Chapter 4: Convolution and Correlation](../../chapters/04-convolution-and-correlation/index.md) of this textbook.
