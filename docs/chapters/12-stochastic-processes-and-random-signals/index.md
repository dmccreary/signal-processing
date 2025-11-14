# Stochastic Processes and Random Signals

## Summary

This chapter covers random signal analysis, noise characterization, power spectral density, and statistical signal processing methods.

Students will explore 10 key concepts that are essential for understanding this area of signal processing. This material provides the foundation for concepts introduced in later chapters.

## Concepts Covered

This chapter covers the following 10 concepts from the learning graph:

166. Random Processes
167. Stochastic Signals
168. White Noise
169. Colored Noise
170. Gaussian Noise
171. Signal-to-Noise Ratio
172. Noise Reduction
173. Statistical Signal Processing
174. Power Spectral Density
175. Wiener-Khinchin Theorem

## Prerequisites

This chapter builds on concepts from:

- [Chapter 1: Mathematical Foundations](../01-mathematical-foundations/index.md)
- [Chapter 2: Introduction to Signals and Systems](../02-introduction-to-signals-and-systems/index.md)
- [Chapter 4: Convolution and Correlation](../04-convolution-and-correlation/index.md)
- [Chapter 7: DFT, FFT and Frequency Domain Analysis](../07-dft-fft-and-frequency-domain-analysis/index.md)
- [Chapter 9: Filter Design Fundamentals](../09-filter-design-fundamentals/index.md)

---

## Introduction

Real-world signals inevitably contain random components arising from thermal noise, quantum effects, measurement uncertainties, and unpredictable environmental fluctuations. Unlike the deterministic signals examined in earlier chapters, random signals cannot be described by explicit mathematical functions but instead require statistical characterization through probability distributions, correlation functions, and spectral densities. Understanding stochastic signal analysis is essential for designing systems that extract information from noisy measurements, estimate signal parameters in uncertain environments, and optimize performance under statistical constraints.

This chapter develops the mathematical framework for analyzing random processes, examining different noise types and their characteristics, introducing power spectral density as the frequency-domain description of random signals, and exploring statistical signal processing methods that leverage probabilistic models. These concepts underpin adaptive filter analysis, optimal estimation theory, and modern machine learning approaches to signal processing covered in subsequent chapters.

## Random Processes and Stochastic Signals

A random process (also called a stochastic process) is a collection of random variables indexed by time, representing signals whose exact values cannot be predicted but whose statistical properties can be characterized. Each time instance $t$ corresponds to a random variable $X(t)$ with an associated probability distribution.

### Statistical Description

Random processes are characterized through ensemble statistics computed across multiple realizations of the process. Key statistical descriptors include:

**Mean function** describes the expected value at each time:

$$\mu_X(t) = E[X(t)] = \int_{-\infty}^{\infty} x f_X(x,t)dx$$

where $f_X(x,t)$ is the probability density function at time $t$.

**Autocorrelation function** quantifies how signal values at different times relate statistically:

$$R_X(t_1, t_2) = E[X(t_1)X(t_2)]$$

This function reveals temporal dependencies, periodicity, and memory characteristics of the random process.

**Autocovariance function** measures correlation of deviations from the mean:

$$C_X(t_1, t_2) = E[(X(t_1)-\mu_X(t_1))(X(t_2)-\mu_X(t_2))] = R_X(t_1,t_2) - \mu_X(t_1)\mu_X(t_2)$$

The variance at time $t$ is the autocovariance evaluated at equal times: $\sigma_X^2(t) = C_X(t,t)$.

### Stationarity

A random process is stationary if its statistical properties remain constant over time. **Strict-sense stationarity** requires that all statistical properties (distributions of all orders) are time-invariant. The more practical **wide-sense stationary** (WSS) process requires only:

1. Constant mean: $\mu_X(t) = \mu_X$ for all $t$
2. Autocorrelation depends only on time difference: $R_X(t_1, t_2) = R_X(\tau)$ where $\tau = t_2 - t_1$

WSS processes simplify analysis significantly because their correlation structure depends only on the time lag $\tau$ rather than absolute time. Most naturally occurring noise sources approximate WSS conditions over reasonable time scales.

### Ergodicity

An ergodic process has the property that time averages computed from a single realization equal ensemble averages computed across multiple realizations. For a WSS ergodic process:

$$\lim_{T\to\infty} \frac{1}{T}\int_0^T x(t)dt = E[X(t)] = \mu_X$$

Ergodicity enables practical signal analysis because we can estimate statistical properties from time-averaged measurements of single signal recordings rather than requiring multiple independent realizations.

## White Noise and Colored Noise

Noise processes are categorized by their frequency domain characteristics, with white and colored noise representing two fundamental classes with distinct spectral properties.

### White Noise

White noise is a random process with constant power spectral density across all frequencies, analogous to white light containing all visible wavelengths equally. For white noise $w[n]$:

$$R_w[k] = \sigma^2 \delta[k]$$
$$S_w(f) = \sigma^2$$

where $\sigma^2$ is the noise variance and $S_w(f)$ is the power spectral density. The autocorrelation being a delta function means samples are completely uncorrelated: $E[w[n]w[m]] = 0$ for $n \neq m$.

White noise properties include:

- **Flat spectrum**: Equal power at all frequencies
- **Zero correlation**: Future values unpredictable from past values
- **Infinite bandwidth**: Theoretical white noise has unbounded power
- **Idealized model**: Physical processes have finite bandwidth

In practice, "white" noise is approximately white over the frequency range of interest, with negligible correlation at the sampling rate used. Thermal noise in resistors and shot noise in electronic devices closely approximate white noise characteristics.

### Colored Noise

Colored noise has non-uniform power spectral density, with power concentrated in specific frequency ranges. The autocorrelation function of colored noise is not a delta function, indicating temporal correlation between samples.

Common colored noise types include:

**Pink noise** ($1/f$ noise) has power spectral density inversely proportional to frequency:

$$S(f) \propto \frac{1}{f}$$

Equal power per octave characterizes pink noise, making it prevalent in natural phenomena and electronic devices. Applications include audio testing, fractal signal modeling, and characterizing low-frequency fluctuations.

**Brown noise** (Brownian noise or red noise) has power spectral density:

$$S(f) \propto \frac{1}{f^2}$$

This corresponds to integrated white noise (random walk), appearing in Brownian motion, economic time series, and certain physical processes.

**Band-limited white noise** restricts white noise to finite bandwidth through filtering, providing a more realistic noise model for practical systems with finite bandwidths.

### Generating Colored Noise from White Noise

Colored noise can be synthesized by filtering white noise through appropriately designed systems. For desired power spectral density $S_d(f)$, design filter $H(f)$ such that:

$$S_d(f) = |H(f)|^2 S_w(f)$$

For white noise input with $S_w(f) = \sigma^2$:

$$H(f) = \frac{1}{\sigma}\sqrt{S_d(f)}$$

This technique enables generation of arbitrary noise processes with specified spectral characteristics, useful for testing, simulation, and noise injection applications.

## Gaussian Noise

Gaussian noise follows the normal (Gaussian) probability distribution, completely characterized by mean $\mu$ and variance $\sigma^2$. The probability density function is:

$$f_X(x) = \frac{1}{\sqrt{2\pi\sigma^2}}\exp\left(-\frac{(x-\mu)^2}{2\sigma^2}\right)$$

### Properties of Gaussian Processes

Gaussian random processes possess unique properties making them particularly important in signal processing:

1. **Complete characterization**: Mean and covariance fully specify all statistics
2. **Central limit theorem**: Sums of independent random variables approach Gaussian distribution
3. **Linear system preservation**: Gaussian input to linear system produces Gaussian output
4. **Analytical tractability**: Many calculations have closed-form solutions

The central limit theorem explains why Gaussian noise models are so prevalent—many noise sources arise from summing numerous independent contributing factors, yielding approximately Gaussian distributions.

### Additive White Gaussian Noise (AWGN)

The most common noise model in communications and signal processing is additive white Gaussian noise, where:

$$y[n] = s[n] + w[n]$$

with $w[n]$ being zero-mean white Gaussian noise. This model assumes:

- Noise adds to signal (additive)
- Samples are uncorrelated (white)
- Amplitude follows Gaussian distribution
- Zero mean (no DC bias)

AWGN provides a tractable mathematical model enabling analytical performance evaluation for many signal processing algorithms and communication systems. While idealized, it accurately approximates thermal noise and aggregated interference from many independent sources.

## Signal-to-Noise Ratio

The signal-to-noise ratio (SNR) quantifies the relative strength of desired signal to background noise, fundamentally limiting system performance in detection, estimation, and communication applications.

### SNR Definitions

SNR can be defined in several ways depending on context:

**Power ratio** (most common):

$$\text{SNR} = \frac{P_{signal}}{P_{noise}} = \frac{\sigma_s^2}{\sigma_n^2}$$

**Decibel scale**:

$$\text{SNR}_{dB} = 10\log_{10}\left(\frac{P_{signal}}{P_{noise}}\right)$$

**Peak SNR** (for images and communications):

$$\text{PSNR} = 10\log_{10}\left(\frac{\text{MAX}^2}{\text{MSE}}\right)$$

where MAX is the maximum possible signal value and MSE is mean-squared error.

### SNR and System Performance

SNR directly impacts system capabilities:

| SNR (dB) | Performance Implications |
|----------|--------------------------|
| < 0 | Noise power exceeds signal power, detection very difficult |
| 0-10 | Low quality, significant degradation |
| 10-20 | Moderate quality, noticeable noise |
| 20-40 | Good quality, noise tolerable |
| > 40 | Excellent quality, noise negligible |

Communication systems require minimum SNR thresholds for reliable operation. Shannon's channel capacity theorem establishes fundamental limits:

$$C = B\log_2(1 + \text{SNR})$$

where $C$ is channel capacity (bits/second), $B$ is bandwidth (Hz), and SNR is the signal-to-noise power ratio. No communication system can reliably transmit data faster than this capacity limit.

## Noise Reduction Techniques

Reducing noise while preserving signal content is fundamental to extracting information from noisy measurements. Various filtering and processing strategies exploit signal and noise characteristics to improve SNR.

### Time-Domain Averaging

For repetitive signals corrupted by uncorrelated noise, averaging multiple observations reduces noise power. If $x_i[n] = s[n] + w_i[n]$ for $i = 1, \ldots, K$ independent observations:

$$\hat{s}[n] = \frac{1}{K}\sum_{i=1}^K x_i[n] = s[n] + \frac{1}{K}\sum_{i=1}^K w_i[n]$$

The signal component remains unchanged while noise variance decreases:

$$\sigma_{\text{noise}}^2 = \frac{\sigma_w^2}{K}$$

improving SNR by factor $K$ (or $10\log_{10}K$ dB). This technique is fundamental in medical imaging, evoked potential measurements, and signal averaging oscilloscopes.

### Frequency-Domain Filtering

When signal and noise occupy different frequency bands, linear filters can separate them. Low-pass filtering removes high-frequency noise from low-frequency signals, band-pass filtering extracts signals in specific frequency ranges, and adaptive notch filtering eliminates narrowband interference.

Filter design for noise reduction balances:

- **Noise suppression**: Narrower bandwidth reduces more noise
- **Signal distortion**: Excessive filtering attenuates or distorts signal content
- **Transient response**: Sharp filters introduce ringing and delay

Wiener filtering provides optimal linear filtering for noise reduction, designing filter frequency response:

$$H(f) = \frac{S_s(f)}{S_s(f) + S_n(f)}$$

where $S_s(f)$ and $S_n(f)$ are signal and noise power spectral densities. This filter minimizes mean-squared error between filtered output and desired signal.

### Nonlinear Noise Reduction

Nonlinear methods exploit signal structure beyond frequency domain characteristics:

**Median filtering** replaces each sample with the median of a local neighborhood, effectively removing impulsive noise (salt-and-pepper noise in images) while preserving edges better than linear smoothing.

**Wavelet denoising** decomposes signals using wavelet transforms, applies thresholding to wavelet coefficients to suppress small-amplitude noise components, then reconstructs the denoised signal. This approach preserves transients and discontinuities while removing noise.

**Morphological filtering** uses nonlinear mathematical morphology operations to remove noise while preserving specific signal shapes and structures.

<details markdown="1">
<summary>MicroSim: Noise Analysis and Reduction Tool</summary>

This simulation would provide interactive exploration of noise characteristics and reduction techniques:

- Generate test signals: sinusoidal, pulse, speech-like, with adjustable parameters
- Add noise: white, pink, brown, Gaussian, uniform, impulsive, with controllable SNR
- View time-domain waveforms and frequency spectra of signal, noise, and combined
- Apply noise reduction methods:
  - Averaging (adjust number of realizations)
  - Linear filtering (low-pass, band-pass, Wiener)
  - Median filtering (adjust window size)
  - Wavelet thresholding (select wavelet, threshold level)
- Display performance metrics: output SNR, MSE, correlation coefficient
- Compare multiple methods simultaneously to understand tradeoffs

Students would develop intuition about noise type identification, appropriate reduction strategy selection, and parameter tuning effects on signal quality vs. noise suppression tradeoffs.

</details>

## Statistical Signal Processing

Statistical signal processing applies probability theory and statistical methods to extract information from signals in the presence of uncertainty, leveraging knowledge of signal and noise statistical properties.

### Detection Theory

Detection theory addresses deciding whether a signal is present or absent based on noisy observations. The binary hypothesis testing problem formulates as:

- **Hypothesis $H_0$**: Only noise present, $x[n] = w[n]$
- **Hypothesis $H_1$**: Signal plus noise present, $x[n] = s[n] + w[n]$

The optimal detector computes the likelihood ratio:

$$\Lambda = \frac{p(x|H_1)}{p(x|H_0)}$$

and compares to threshold $\gamma$, choosing $H_1$ if $\Lambda > \gamma$ and $H_0$ otherwise. The Neyman-Pearson criterion selects threshold to maximize detection probability for a fixed false alarm probability.

Detection performance metrics include:

- **Probability of detection** $P_D$: Correctly identifying signal presence
- **Probability of false alarm** $P_{FA}$: Incorrectly declaring signal present when absent
- **Receiver operating characteristic (ROC)**: Plot of $P_D$ vs. $P_{FA}$ for various thresholds

### Estimation Theory

Estimation theory develops methods to infer signal parameters from noisy measurements. Two principal approaches are:

**Maximum likelihood estimation** selects parameter values that maximize the probability of observed data:

$$\hat{\theta}_{ML} = \arg\max_{\theta} p(x|\theta)$$

ML estimators are asymptotically unbiased and efficient, achieving Cramer-Rao lower bound on variance for large sample sizes.

**Minimum mean-squared error estimation** minimizes expected squared error:

$$\hat{\theta}_{MMSE} = \arg\min_{\theta} E[(\\theta - \hat{\theta})^2]$$

The MMSE estimate equals the conditional expectation $E[\theta|x]$, requiring knowledge of prior parameter distribution.

### Applications

Statistical signal processing techniques enable:

- **Radar detection**: Identifying targets in clutter and noise
- **Biomedical signal analysis**: Detecting abnormal patterns in ECG, EEG
- **Speech processing**: Voice activity detection, speaker identification
- **Communications**: Symbol detection, channel estimation, synchronization

## Power Spectral Density

The power spectral density (PSD) describes how signal power distributes across frequency, providing the frequency-domain characterization of random processes complementary to the time-domain autocorrelation function.

### Definition and Properties

For a WSS random process $X(t)$ with autocorrelation $R_X(\tau)$, the power spectral density is the Fourier transform:

$$S_X(f) = \int_{-\infty}^{\infty} R_X(\tau)e^{-j2\pi f\tau}d\tau$$

This fundamental relationship, known as the Wiener-Khinchin theorem, establishes that autocorrelation and power spectral density form a Fourier transform pair. The inverse relationship is:

$$R_X(\tau) = \int_{-\infty}^{\infty} S_X(f)e^{j2\pi f\tau}df$$

Key PSD properties include:

- **Non-negative**: $S_X(f) \geq 0$ for all $f$ (power cannot be negative)
- **Real-valued**: For real processes, PSD is purely real
- **Even symmetry**: For real processes, $S_X(-f) = S_X(f)$
- **Total power**: Integrating PSD over all frequencies yields total power: $\int_{-\infty}^{\infty} S_X(f)df = R_X(0) = E[X^2(t)]$

### PSD Estimation

In practice, PSD must be estimated from finite-length signal observations. Two primary approaches are:

**Periodogram method** computes:

$$\hat{S}_X(f) = \frac{1}{N}|X(f)|^2$$

where $X(f)$ is the DFT of N samples. While simple, the periodogram is an inconsistent estimator—variance does not decrease with increased data length.

**Welch's method** improves periodogram estimation by:

1. Dividing data into overlapping segments
2. Windowing each segment
3. Computing periodogram for each segment
4. Averaging periodograms across segments

This averaging reduces variance at the cost of decreased frequency resolution, providing a practical bias-variance tradeoff.

**Parametric methods** model the process using autoregressive (AR), moving average (MA), or ARMA models, then estimate model parameters and compute theoretical PSD. These methods can provide better resolution for short data records when the model appropriately matches the process.

## Wiener-Khinchin Theorem

The Wiener-Khinchin theorem establishes the fundamental relationship between autocorrelation and power spectral density, unifying time-domain and frequency-domain characterizations of random processes. For wide-sense stationary processes, the autocorrelation function and power spectral density form a Fourier transform pair:

$$S_X(f) = \mathcal{F}\{R_X(\tau)\}$$
$$R_X(\tau) = \mathcal{F}^{-1}\{S_X(f)\}$$

### Theoretical Significance

This theorem bridges correlation analysis and spectral analysis, enabling computation of one from the other. Physical interpretations include:

- Autocorrelation at $\tau = 0$ equals total signal power
- PSD integrated over frequency equals total signal power
- Narrow autocorrelation (rapid decorrelation) corresponds to wide PSD (wideband signal)
- Wide autocorrelation (slow decorrelation) corresponds to narrow PSD (narrowband signal)

### Applications

The Wiener-Khinchin relationship enables:

- **Spectral estimation**: Computing PSD from estimated autocorrelation
- **Filter design**: Wiener filtering uses PSD to design optimal filters
- **System identification**: Estimating system characteristics from correlation measurements
- **Random process synthesis**: Generating processes with specified spectral characteristics

For linear systems with input $x[n]$ and output $y[n]$, the output PSD relates to input PSD through:

$$S_y(f) = |H(f)|^2 S_x(f)$$

where $H(f)$ is the system frequency response. This enables output noise analysis and signal-to-noise ratio calculation for cascaded systems.

## Summary

This chapter developed the mathematical framework for analyzing random signals and stochastic processes that pervade real-world signal processing applications. Random processes require statistical characterization through probability distributions, mean functions, and autocorrelation functions, with wide-sense stationary processes providing particularly tractable analysis through their time-invariant statistical properties.

White noise exhibits flat power spectral density and uncorrelated samples, serving as a fundamental building block for noise modeling, while colored noise concentrates power in specific frequency ranges, modeling many physical noise sources. Gaussian noise, characterized by normal probability distributions, appears ubiquitously due to the central limit theorem and provides analytical tractability for performance analysis.

Signal-to-noise ratio quantifies the fundamental limitation noise imposes on system performance, with various reduction techniques including averaging, filtering, and nonlinear processing exploiting signal and noise characteristics to improve SNR. Statistical signal processing applies detection and estimation theory to extract information optimally from noisy observations, enabling applications from radar to biomedical instrumentation.

Power spectral density provides frequency-domain characterization of random processes, with the Wiener-Khinchin theorem establishing its fundamental relationship to autocorrelation. PSD estimation techniques enable practical analysis of measured signals, while parametric modeling approaches provide enhanced resolution when appropriate models match the underlying processes.

These stochastic signal analysis concepts underpin adaptive filtering, optimal estimation, and modern machine learning approaches examined in subsequent chapters, providing essential tools for designing robust signal processing systems that operate effectively despite uncertainty and noise.
