# Convolution and Correlation

## Summary

This chapter covers convolution operations, correlation techniques, and their applications in system analysis and signal matching.

Students will explore 10 key concepts that are essential for understanding this area of signal processing. This material provides the foundation for concepts introduced in later chapters.

## Concepts Covered

This chapter covers the following 10 concepts from the learning graph:

71. Convolution
72. Discrete Convolution
73. Circular Convolution
74. Convolution Theorem
75. Correlation
76. Autocorrelation
77. Cross-Correlation
78. Correlation Coefficient
79. Matched Filter
80. Wiener Filter

## Prerequisites

This chapter builds on concepts from:

- [Chapter 1: Mathematical Foundations](../01-mathematical-foundations/index.md)
- [Chapter 2: Introduction to Signals and Systems](../02-introduction-to-signals-and-systems/index.md)

---

## Introduction

Convolution and correlation represent two of the most fundamental operations in signal processing, providing mathematical frameworks for system analysis, pattern matching, and signal comparison. While these operations share mathematical similarities, they serve distinct purposes: convolution characterizes how linear time-invariant systems modify input signals, while correlation measures the similarity or relationship between signals. Understanding these operations enables engineers to analyze system behavior, detect patterns in noisy data, implement matched filters for optimal signal detection, and design adaptive systems that learn from observed signals.

The convolution operation appears throughout signal processing theory and practice, from the fundamental input-output relationship of LTI systems to image processing applications and probability theory. Correlation techniques enable applications ranging from radar target detection to time delay estimation in sonar systems, from template matching in computer vision to feature extraction in pattern recognition. This chapter develops both the mathematical foundations and the intuitive understanding necessary to apply these powerful operations effectively.

## Convolution Fundamentals

### Convolution

The **convolution** of two signals $x(t)$ and $h(t)$ produces an output signal $y(t)$ that represents the overlap between one signal and a time-reversed, shifted version of the other signal. For continuous-time signals, the convolution integral is defined as:

$$y(t) = x(t) * h(t) = \int_{-\infty}^{\infty} x(\tau)h(t-\tau) d\tau$$

This operation characterizes the input-output relationship for linear time-invariant systems, where $x(t)$ represents the input signal, $h(t)$ represents the system's impulse response, and $y(t)$ represents the output. The convolution operation can be visualized as sliding one function past another while computing the area of their product at each position.

The convolution operation possesses several important properties that simplify analysis and computation. Commutativity means that $x(t) * h(t) = h(t) * x(t)$, allowing the roles of input and impulse response to be exchanged. Associativity enables cascaded convolutions to be computed in any order: $(x * h_1) * h_2 = x * (h_1 * h_2)$. Distributivity over addition allows $x * (h_1 + h_2) = x * h_1 + x * h_2$, useful for systems with parallel paths.

### Discrete Convolution

For discrete-time signals, **discrete convolution** is defined through a summation rather than an integral, expressing the output of a discrete-time LTI system:

$$y[n] = x[n] * h[n] = \sum_{k=-\infty}^{\infty} x[k]h[n-k]$$

This formula appears frequently in digital signal processing implementations, where finite impulse response (FIR) filters compute outputs as weighted sums of present and past input samples. The computational complexity of discrete convolution is $O(N^2)$ for sequences of length $N$ using direct computation, though fast convolution algorithms based on the FFT reduce this to $O(N \log N)$.

Practical implementation of discrete convolution requires handling boundary conditions when signals have finite length. Zero-padding extends signals beyond their defined regions, periodic extension treats signals as repeating, and symmetric extension mirrors signal values at boundaries. The choice of boundary handling affects output length and edge artifacts in filtered results.

### Circular Convolution

**Circular convolution** treats signals as periodic with period $N$, wrapping indices modulo $N$ so that samples "wrap around" from the end back to the beginning. The circular convolution of two $N$-point sequences is defined as:

$$y[n] = \sum_{k=0}^{N-1} x[k]h[(n-k) \text{ mod } N]$$

This operation arises naturally when computing convolution using the Discrete Fourier Transform (DFT), since the DFT implicitly assumes periodic signals. The DFT of the circular convolution equals the pointwise product of the individual DFTs: $\text{DFT}\{x[n] \circledast h[n]\} = \text{DFT}\{x[n]\} \cdot \text{DFT}\{h[n]\}$, where $\circledast$ denotes circular convolution.

To obtain linear convolution using the DFT (which naturally computes circular convolution), signals must be zero-padded to length at least $N_1 + N_2 - 1$ where $N_1$ and $N_2$ are the lengths of the sequences being convolved. This technique, called fast convolution, exploits the computational efficiency of the FFT algorithm.

### Convolution Theorem

The **convolution theorem** states that convolution in the time domain corresponds to multiplication in the frequency domain, and vice versa. For continuous-time signals:

$$\mathcal{F}\{x(t) * h(t)\} = X(f) \cdot H(f)$$

$$\mathcal{F}^{-1}\{X(f) \cdot H(f)\} = x(t) * h(t)$$

This fundamental relationship connects time-domain and frequency-domain representations, enabling analysis of filtering operations through frequency response examination. The theorem implies that to filter a signal, we can either convolve with the impulse response in the time domain or multiply by the frequency response in the frequency domain and transform back. The frequency domain approach often proves more efficient for large filters.

The convolution theorem extends to discrete-time signals using the Discrete-Time Fourier Transform (DTFT) or the DFT. For the DFT, the theorem takes the form $\text{DFT}\{x[n] \circledast h[n]\} = \text{DFT}\{x[n]\} \cdot \text{DFT}\{h[n]\}$, providing the basis for fast convolution algorithms.

## Correlation Fundamentals

### Correlation

**Correlation** measures the similarity between two signals as a function of time lag, quantifying how well one signal matches another when shifted by various amounts. The cross-correlation of signals $x(t)$ and $y(t)$ is defined as:

$$R_{xy}(τ) = \int_{-\infty}^{\infty} x(t)y(t-τ) dt$$

Note that correlation differs from convolution in that correlation slides $y(t)$ without time reversal, whereas convolution uses $y(t-τ)$ reversed. The relationship between correlation and convolution is $R_{xy}(τ) = x(τ) * y(-τ)$, showing that correlation can be computed as convolution with one signal time-reversed.

Correlation finds applications in time delay estimation (finding the lag that maximizes correlation identifies the delay between signals), pattern detection (high correlation indicates presence of a known pattern), and signal analysis (correlation structure reveals periodicities and dependencies).

### Autocorrelation

**Autocorrelation** is the correlation of a signal with itself at different time lags, defined as:

$$R_{xx}(τ) = \int_{-\infty}^{\infty} x(t)x(t-τ) dt$$

This function reveals the internal structure of a signal, particularly periodic components and self-similarity across different time scales. The autocorrelation function is always symmetric about zero lag: $R_{xx}(τ) = R_{xx}(-τ)$, and achieves its maximum value at zero lag: $R_{xx}(0) \geq |R_{xx}(τ)|$ for all $τ$.

The power spectral density of a signal equals the Fourier transform of its autocorrelation function, a relationship known as the Wiener-Khinchin theorem. This connection enables spectral estimation through autocorrelation measurement and explains how autocorrelation captures frequency content information.

### Cross-Correlation

**Cross-correlation** measures the similarity between two different signals as a function of time lag, defined as:

$$R_{xy}(τ) = \int_{-\infty}^{\infty} x(t)y(t-τ) dt$$

Unlike autocorrelation, cross-correlation is generally not symmetric: $R_{xy}(τ) \neq R_{xy}(-τ)$. However, the relationship $R_{xy}(τ) = R_{yx}(-τ)$ holds, showing that the cross-correlation of $x$ with $y$ at lag $τ$ equals the cross-correlation of $y$ with $x$ at lag $-τ$.

Cross-correlation applications include passive sonar (correlating hydrophone signals to locate sound sources), speech recognition (correlating input speech with template utterances), and image registration (finding alignment between images through correlation maximization). The computational complexity of direct cross-correlation is $O(N^2)$, but FFT-based computation reduces this to $O(N \log N)$.

### Correlation Coefficient

The **correlation coefficient** normalizes correlation to the range $[-1, 1]$, removing dependence on signal amplitudes and providing a standardized measure of similarity. The normalized cross-correlation coefficient is defined as:

$$\rho_{xy} = \frac{\int_{-\infty}^{\infty} x(t)y(t) dt}{\sqrt{\int_{-\infty}^{\infty} x^2(t) dt} \sqrt{\int_{-\infty}^{\infty} y^2(t) dt}}$$

A value of $\rho_{xy} = 1$ indicates perfect positive correlation (signals are identical up to scaling), $\rho_{xy} = -1$ indicates perfect negative correlation (one signal is the negative of the other), and $\rho_{xy} = 0$ indicates no linear relationship (signals are orthogonal or uncorrelated).

The correlation coefficient appears in numerous applications including image matching (comparing image patches), signal detection (determining if a template signal is present), and statistical analysis (measuring relationships between time series).

## Advanced Filtering Techniques

### Matched Filter

The **matched filter** is the optimal linear filter for detecting a known signal in additive white noise, maximizing the signal-to-noise ratio at a specific time instant. For a signal $s(t)$ to be detected in noise, the impulse response of the matched filter is the time-reversed complex conjugate of the signal:

$$h(t) = s^*(T - t)$$

where $T$ is the time at which SNR is maximized. The matched filter essentially performs correlation between the received signal and the known template, with maximum output occurring when the template aligns with the signal in the received data.

Matched filtering provides the theoretical foundation for optimal receivers in digital communications, where received signals are correlated with possible transmitted symbols. Radar and sonar systems use matched filters to detect echoes of transmitted pulses. The output SNR of a matched filter depends only on the signal energy and noise power spectral density, independent of the particular signal waveform shape.

### Wiener Filter

The **Wiener filter** is the optimal linear filter for estimating a desired signal from a noisy observation, minimizing the mean square error between the filter output and the desired signal. The frequency response of the Wiener filter is given by:

$$H(f) = \frac{S_{ds}(f)}{S_{xx}(f)}$$

where $S_{ds}(f)$ is the cross-power spectral density between the desired signal and the observation, and $S_{xx}(f)$ is the power spectral density of the observation. This filter balances noise suppression against signal distortion, attenuating frequencies where noise dominates while preserving frequencies where signal dominates.

Wiener filtering applications include speech enhancement (removing background noise), image restoration (reducing blur and noise), and adaptive channel equalization (compensating for communication channel distortion). The Wiener filter requires knowledge of signal and noise statistics, which may need to be estimated from data in practical applications.

## Interactive Demonstrations

#### Diagram: Convolution Visualizer

<details markdown="1">
<summary>MicroSim: Convolution Visualizer</summary>

### Purpose

This interactive simulation provides a visual, step-by-step demonstration of the convolution operation, showing how one function slides past another while computing the overlap integral at each position.

### Features

- Display two input signals $x(t)$ and $h(t)$ in separate panels
- Animate the time-reversal and sliding of $h(t)$ to form $h(t-τ)$
- Show the product $x(τ)h(t-τ)$ at each time instant
- Display the integral (area under product curve) as output $y(t)$
- Step-by-step mode with adjustable animation speed
- Predefined signal pairs: rectangular pulses, exponentials, triangles, sinusoids
- Custom signal drawing capability

### Learning Objectives

- Understand the mechanics of the convolution operation
- Visualize time-reversal and shifting in convolution
- Connect the geometric interpretation to the mathematical formula
- Recognize how impulse response shape affects filtering behavior

### Implementation Requirements

- Canvas size: 670px wide, 625px total height (550px drawing + 75px controls)
- Four synchronized plot panels: $x(t)$, $h(t)$, $h(t-τ)$ with product, and output $y(t)$
- Time slider to control current convolution time $t$
- Play/pause button for continuous animation
- Signal library dropdown with 8-10 signal combinations
- Adjustable time range and amplitude scaling
- Visual highlighting of current computation point

</details>

#### Diagram: Correlation and Matched Filtering

<details markdown="1">
<summary>MicroSim: Correlation and Matched Filtering</summary>

### Purpose

This simulation demonstrates correlation operations and matched filtering for signal detection in noise, showing how correlation can detect known patterns and optimize SNR.

### Features

- Generate noisy signal containing one or more template signals at unknown positions
- Compute and display cross-correlation between received signal and template
- Show peak detection identifying signal locations
- Display SNR measurements at correlation peaks
- Add various noise levels to test detection performance
- Compare matched filter output with simple filtering approaches

### Learning Objectives

- Understand correlation as a pattern detection tool
- Recognize matched filtering as optimal for SNR maximization
- Observe how correlation peaks identify signal positions
- Compare detection performance under various noise conditions

### Implementation Requirements

- Canvas size: 670px wide, 550px total height (475px drawing + 75px controls)
- Three plot panels: received signal (with noise), template signal, correlation output
- Noise level slider (SNR range -10 to +20 dB)
- Template selection dropdown (pulse shapes, sinusoids, chirps)
- Number of signals slider (1-5 signals in noise)
- Peak detection threshold slider with visual indicators
- SNR meter display for detected peaks

</details>

## Comparison Tables

| Operation | Continuous-Time Formula | Discrete-Time Formula | Key Property |
|-----------|------------------------|----------------------|--------------|
| Linear Convolution | $y(t) = \int x(\tau)h(t-\tau) d\tau$ | $y[n] = \sum_k x[k]h[n-k]$ | Time reversal of second function |
| Circular Convolution | N/A (periodic signals) | $y[n] = \sum_{k=0}^{N-1} x[k]h[(n-k) \bmod N]$ | Periodic wrapping |
| Cross-Correlation | $R_{xy}(τ) = \int x(t)y(t-τ) dt$ | $R_{xy}[m] = \sum_k x[k]y[k-m]$ | No time reversal |
| Autocorrelation | $R_{xx}(τ) = \int x(t)x(t-τ) dt$ | $R_{xx}[m] = \sum_k x[k]x[k-m]$ | Symmetric about zero lag |

| Property | Convolution | Correlation | Significance |
|----------|------------|-------------|--------------|
| Commutativity | Yes: $x * h = h * x$ | No: $R_{xy} \neq R_{yx}$ | Order matters for correlation |
| Time Reversal | Uses $h(t-\tau)$ reversed | Uses $y(t-\tau)$ without reversal | Distinguishes operations |
| Relationship | $x * h = x \star h(-t)$ | $R_{xy} = x * y(-t)$ | Interconvertible |
| LTI Systems | Describes input-output | Not directly applicable | Convolution fundamental to LTI |
| Pattern Matching | Not primary use | Primary application | Correlation detects patterns |
| Frequency Domain | $Y(f) = X(f)H(f)$ | $S_{xy}(f) = X(f)Y^*(f)$ | Multiplication in frequency |

| Filter Type | Impulse Response | Optimization Criterion | Application |
|-------------|------------------|----------------------|-------------|
| Matched Filter | $h(t) = s^*(T-t)$ | Maximize SNR at time $T$ | Signal detection, radar, communications |
| Wiener Filter | $H(f) = S_{ds}(f)/S_{xx}(f)$ | Minimize mean square error | Noise reduction, deconvolution, estimation |
| Correlator | $h(t) = s(-t)$ | Pattern matching | Template detection, time delay estimation |

| Convolution Type | Length of Output | Computation | Primary Use |
|------------------|------------------|-------------|-------------|
| Linear | $N_1 + N_2 - 1$ samples | $O(N^2)$ direct, $O(N \log N)$ FFT | General filtering, FIR filters |
| Circular | $N$ samples (period) | $O(N \log N)$ via DFT | Block processing, DFT-based filtering |
| Overlap-Add | Continuous stream | Segmented FFT convolution | Real-time filtering of long signals |
| Overlap-Save | Continuous stream | Segmented FFT convolution | Alternative to overlap-add |

## Computational Considerations

The choice between time-domain and frequency-domain implementation of convolution and correlation depends on signal lengths and computational resources. Direct computation of convolution requires $N_1 \times N_2$ multiplications for signals of lengths $N_1$ and $N_2$, while FFT-based methods require $O(N \log N)$ operations where $N = N_1 + N_2 - 1$ (padded to a power of two for efficiency).

For short filters (typically less than 64 taps), direct time-domain convolution often proves faster due to FFT overhead. For long filters, particularly in applications requiring the same filter applied to many signal blocks, FFT-based methods offer substantial computational savings. Modern signal processing libraries automatically select the optimal method based on signal characteristics.

Block processing techniques including overlap-add and overlap-save methods enable real-time filtering of continuous signals using FFT-based convolution, dividing long signals into manageable blocks and combining results appropriately to maintain equivalence with linear convolution.

## Summary

This chapter has developed the fundamental operations of convolution and correlation that underlie signal processing analysis and applications. Convolution characterizes the input-output relationship of linear time-invariant systems, enabling prediction of system responses through the impulse response. The convolution integral or sum computes output signals by sliding one function past another, with the convolution theorem connecting time-domain convolution to frequency-domain multiplication.

Correlation measures similarity between signals, providing tools for pattern detection, time delay estimation, and signal analysis. Autocorrelation reveals the internal structure of signals including periodicities and self-similarity, while cross-correlation quantifies relationships between different signals. The normalized correlation coefficient provides a scale-independent measure of similarity essential for pattern matching applications.

Advanced filtering techniques including matched filters and Wiener filters apply convolution and correlation principles to optimize specific performance criteria. The matched filter maximizes signal-to-noise ratio for detecting known signals in noise, while the Wiener filter minimizes mean square error for signal estimation. These optimal filters demonstrate how mathematical operations on signals achieve practical engineering objectives ranging from radar detection to image enhancement.

Understanding convolution and correlation, their properties, efficient computation methods, and applications provides the foundation for subsequent topics in spectral analysis, digital filtering, and adaptive signal processing.
