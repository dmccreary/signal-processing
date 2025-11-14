# Sampling and Quantization

## Summary

This chapter explores the conversion from continuous to discrete signals, covering sampling theory, the Nyquist criterion, aliasing, and quantization methods.

Students will explore 15 key concepts that are essential for understanding this area of signal processing. This material provides the foundation for concepts introduced in later chapters.

## Concepts Covered

This chapter covers the following 15 concepts from the learning graph:

81. Sampling
82. Sampling Rate
83. Sampling Theorem
84. Nyquist Rate
85. Nyquist Frequency
86. Aliasing
87. Anti-Aliasing Filter
88. Oversampling
89. Undersampling
90. Quantization
91. Quantization Error
92. Quantization Noise
93. Uniform Quantization
94. Non-Uniform Quantization
95. Signal Reconstruction

## Prerequisites

This chapter builds on concepts from:

- [Chapter 2: Introduction to Signals and Systems](../02-introduction-to-signals-and-systems/index.md)

---

## Introduction

The conversion of continuous-time analog signals into discrete-time digital representations forms the cornerstone of modern digital signal processing, enabling computational manipulation, storage, and transmission of real-world signals. This conversion process involves two fundamental operations: sampling, which discretizes time by measuring signal values at specific instants, and quantization, which discretizes amplitude by mapping continuous values to a finite set of levels. Understanding the theoretical foundations and practical limitations of sampling and quantization enables engineers to design systems that preserve essential signal information while minimizing distortion and computational burden.

The sampling theorem, attributed to Nyquist and Shannon, establishes the conditions under which continuous signals can be perfectly reconstructed from discrete samples, providing fundamental limits on sampling rate requirements. Quantization introduces irreversible error by representing infinite-precision values with finite-precision approximations, creating a trade-off between signal fidelity and data rate or storage requirements. This chapter explores these conversion processes, their theoretical foundations, practical implications, and the engineering considerations that govern analog-to-digital converter design.

## Sampling Fundamentals

### Sampling

**Sampling** converts continuous-time signals into discrete-time sequences by measuring signal values at regular intervals, transforming $x(t)$ into $x[n] = x(nT_s)$ where $T_s$ is the sampling period and $n$ is an integer index. The sampling operation can be modeled mathematically as multiplication with an impulse train followed by integration over infinitesimal intervals, or more practically as the evaluation of the signal at discrete time instants.

The relationship between the continuous-time signal and its samples determines whether perfect reconstruction is possible. For bandlimited signals (signals with frequency content confined to a finite range), appropriate choice of sampling rate enables complete recovery of the original signal from its samples. For signals with unlimited bandwidth, sampling inevitably causes aliasing, where high-frequency components masquerade as lower frequencies in the sampled representation.

### Sampling Rate

The **sampling rate** $f_s = 1/T_s$ specifies how many samples are taken per unit time, typically measured in Hertz (Hz) or samples per second. Higher sampling rates capture more detail from the continuous signal but require greater storage, transmission bandwidth, and computational resources. Lower sampling rates reduce data volume but risk losing information or introducing aliasing artifacts.

Common sampling rates reflect the bandwidth requirements of various applications: telephone-quality speech uses 8 kHz sampling, professional audio employs 44.1 kHz or 48 kHz, ultrasonic imaging may use megahertz rates, and radar systems can sample at gigahertz rates. The choice of sampling rate balances fidelity requirements against practical constraints of cost, power consumption, and processing capability.

### Sampling Theorem

The **sampling theorem**, also known as the Nyquist-Shannon sampling theorem, states that a bandlimited continuous-time signal with highest frequency component $f_{max}$ can be perfectly reconstructed from its samples if sampled at rate $f_s > 2f_{max}$. The mathematical proof relies on showing that the spectrum of the sampled signal consists of periodic replications of the original spectrum, and that these replications do not overlap when the sampling rate exceeds twice the bandwidth.

Perfect reconstruction from samples requires an ideal low-pass filter (the sinc function in time domain) to recover the continuous signal:

$$x(t) = \sum_{n=-\infty}^{\infty} x[n] \text{sinc}\left(\frac{t - nT_s}{T_s}\right)$$

where $\text{sinc}(x) = \sin(\pi x)/(\pi x)$. While this ideal reconstruction cannot be implemented exactly (as it requires infinite filter length and perfect frequency cutoff), practical reconstruction filters approximate this behavior to acceptable accuracy.

### Nyquist Rate

The **Nyquist rate** $f_N = 2f_{max}$ represents the minimum sampling rate required to avoid aliasing for a signal with maximum frequency $f_{max}$, establishing a fundamental limit based on signal bandwidth. Sampling at exactly the Nyquist rate theoretically permits perfect reconstruction, though practical systems typically sample at rates somewhat higher than the theoretical minimum to accommodate non-ideal filters and provide margin against bandwidth estimation errors.

For real-valued signals, which have symmetric spectra, the Nyquist rate is twice the highest frequency component. For complex-valued signals or for real signals represented in complex baseband form, different relationships apply based on the asymmetric nature of complex signal spectra.

### Nyquist Frequency

The **Nyquist frequency** $f_{Nyq} = f_s/2$ represents the highest frequency that can be unambiguously represented at a given sampling rate $f_s$, defining the upper limit of the usable frequency range for sampled signals. Frequencies above the Nyquist frequency fold back or alias into the range below $f_{Nyq}$, creating false frequency components that cannot be distinguished from true low-frequency content after sampling.

Digital signal processing operations on sampled signals implicitly operate within the frequency range $[0, f_{Nyq}]$ for real signals or $[-f_{Nyq}, f_{Nyq}]$ for complex signals. The Nyquist frequency serves as a critical design parameter, determining the required sampling rate for given application bandwidth requirements.

### Aliasing

**Aliasing** occurs when signal frequency components above the Nyquist frequency appear as false lower frequencies in the sampled signal, creating distortion that cannot be removed after sampling. A sinusoid at frequency $f = f_s + \Delta f$ is indistinguishable from a sinusoid at $\Delta f$ when sampled at rate $f_s$, as both produce identical sample sequences.

Mathematically, aliasing arises from the periodicity of the discrete-time Fourier transform: frequency components at $f$ and $f + kf_s$ for any integer $k$ yield identical sampled sequences. This frequency ambiguity corrupts sampled signals whenever input signal energy exists above the Nyquist frequency, emphasizing the critical importance of band-limiting signals before sampling.

### Anti-Aliasing Filter

An **anti-aliasing filter** is a low-pass filter applied before sampling to remove frequency components above the Nyquist frequency, preventing aliasing distortion. The ideal anti-aliasing filter would have unity gain for $f < f_{Nyq}$, zero gain for $f > f_{Nyq}$, and sharp transition between these regions. Practical filters approximate this ideal with finite roll-off, requiring sampling at rates higher than the strict Nyquist rate to accommodate the transition band.

The design of anti-aliasing filters involves trade-offs between transition band width (which determines required oversampling), passband ripple (distortion within the desired frequency range), stopband attenuation (residual aliasing from imperfect rejection), and filter complexity (cost and power consumption). Analog anti-aliasing filters typically use Butterworth, Chebyshev, or elliptic designs to meet these specifications.

### Oversampling

**Oversampling** employs sampling rates significantly higher than the minimum Nyquist rate, providing several practical advantages despite increased data rates. Higher sampling rates relax anti-aliasing filter requirements, allowing simpler, lower-order analog filters with wider transition bands. Oversampling also spreads quantization noise over a wider frequency range, enabling noise-shaping techniques to push quantization noise outside the signal band.

Typical oversampling ratios range from 2× (providing modest filter relaxation) to 64× or higher in delta-sigma analog-to-digital converters that exploit aggressive noise shaping. After digital filtering and decimation (downsampling), oversampled signals return to near-Nyquist rates while benefiting from improved effective resolution and simplified analog components.

### Undersampling

**Undersampling**, also called bandpass sampling or harmonic sampling, deliberately samples signals at rates below the Nyquist rate defined by the highest frequency present, but satisfies the Nyquist criterion based on signal bandwidth rather than center frequency. For bandpass signals occupying a narrow bandwidth centered at a high carrier frequency, the sampling rate need only exceed twice the bandwidth, not twice the carrier frequency.

Undersampling causes controlled aliasing that shifts the signal spectrum to lower frequencies, effectively implementing frequency translation in the sampling process. This technique finds application in software-defined radio, radar receivers, and communication systems where direct sampling at RF frequencies would require impractically high sampling rates, but the information bandwidth remains manageable.

## Quantization Fundamentals

### Quantization

**Quantization** maps continuous amplitude values to a discrete set of levels, enabling representation with finite-precision binary words at the cost of introducing irreversible error. The quantization process divides the amplitude range into intervals and represents all values within an interval by a single quantization level, typically at the interval midpoint.

For a signal amplitude range $V$ and $b$ bits per sample, uniform quantization provides $2^b$ equally spaced levels with step size $\Delta = V/2^b$. The choice of bit depth balances signal fidelity (lower quantization error with more bits) against data rate, storage requirements, and converter cost and power consumption.

### Quantization Error

**Quantization error** $e[n] = x_q[n] - x[n]$ represents the difference between the quantized value $x_q[n]$ and the true value $x[n]$, bounded by half the quantization step: $|e[n]| \leq \Delta/2$ for midpoint quantization. This error is deterministic for any particular sample but can be modeled statistically as a random variable uniformly distributed over $[-\Delta/2, \Delta/2]$ when the signal is complex and the quantizer has many levels.

For signals that span the full quantizer range with sufficient complexity, the mean square quantization error is $\sigma_e^2 = \Delta^2/12$, leading to a signal-to-quantization-noise ratio (SQNR) of approximately $6.02b + 1.76$ dB for $b$-bit quantization, yielding about 6 dB improvement per bit. This relationship guides bit depth selection based on required dynamic range.

### Quantization Noise

**Quantization noise** represents the error signal introduced by quantization, often modeled as additive white noise uncorrelated with the signal when quantization is fine relative to signal variations. This noise model enables analysis of quantization effects using signal processing techniques developed for additive noise, though the white noise assumption breaks down for coarse quantization or simple signals.

The power spectral density of quantization noise is theoretically flat (white) across the Nyquist band, with total noise power $\sigma_e^2 = \Delta^2/12$ spread uniformly over frequency range $[0, f_s/2]$. Oversampling spreads this noise over wider bandwidth, enabling subsequent digital filtering to remove out-of-band noise and improve in-band SNR, the principle underlying oversampling converters.

### Uniform Quantization

**Uniform quantization** employs equal-sized steps $\Delta$ throughout the amplitude range, providing consistent quantization error variance independent of signal level. This simplicity makes uniform quantization the standard choice for most applications, particularly when signals have relatively flat amplitude distributions or when subsequent processing (such as automatic gain control) adapts to varying signal levels.

The uniform quantizer is optimal for uniformly distributed signals in the mean square error sense, and near-optimal for signals with probability densities that vary slowly over the quantization range. Digital audio, images, and most instrumentation applications use uniform quantization in conjunction with sufficient bit depth to achieve acceptable SNR.

### Non-Uniform Quantization

**Non-uniform quantization** employs smaller steps for small signal amplitudes and larger steps for large amplitudes, optimizing quantization error distribution to match signal statistics. For signals with probability densities concentrated near zero (such as speech or certain images), non-uniform quantization provides better SNR than uniform quantization for the same number of levels.

Common implementations include companding (compressing before uniform quantization, expanding after), using logarithmic or near-logarithmic spacing such as μ-law (North America) or A-law (Europe) for telephone speech encoding. These approaches provide approximately constant percentage error rather than constant absolute error, matching the human perception of sound intensity which operates on a logarithmic scale.

### Signal Reconstruction

**Signal reconstruction** converts discrete-time samples back to continuous-time signals, ideally recovering the original analog waveform before sampling and quantization. Perfect reconstruction (ignoring quantization error) requires sinc interpolation according to the sampling theorem, though practical systems use simpler interpolation methods such as zero-order hold (staircase output), first-order hold (linear interpolation), or higher-order polynomial interpolation.

Digital-to-analog converters (DACs) typically produce staircase outputs (zero-order hold), requiring analog reconstruction filters to smooth the waveform and remove spectral images at multiples of the sampling frequency. The reconstruction filter specifications mirror anti-aliasing filter requirements, trading off transition band width against passband flatness and stopband image rejection.

## Interactive Demonstrations

<details markdown="1">
<summary>MicroSim: Sampling Theorem Explorer</summary>

### Purpose

This interactive simulation demonstrates the sampling theorem, showing how sampling rate affects the ability to reconstruct continuous signals and how aliasing occurs when the Nyquist criterion is violated.

### Features

- Display continuous-time signal with adjustable frequency
- Show sampled version with variable sampling rate
- Demonstrate reconstruction using sinc interpolation
- Visualize aliasing when $f_s < 2f_{max}$
- Display frequency spectra showing spectral replications
- Highlight Nyquist frequency and illustrate folding
- Compare ideal vs. practical reconstruction filters

### Learning Objectives

- Understand the relationship between signal bandwidth and required sampling rate
- Visualize perfect reconstruction when Nyquist criterion is met
- Observe aliasing artifacts when sampling rate is insufficient
- Connect time-domain sampling to frequency-domain spectral replication

### Implementation Requirements

- Canvas size: 670px wide, 625px total height (550px drawing + 75px controls)
- Four plot panels: continuous signal, sample points, reconstructed signal, frequency spectrum
- Frequency slider for input signal (0-100 Hz)
- Sampling rate slider (1-200 Hz)
- Visual indicators showing $f_{max}$, $f_s$, and $f_{Nyq}$
- Color coding for properly sampled (green) vs. aliased (red) conditions
- Option to toggle reconstruction filter between ideal and practical

</details>

<details markdown="1">
<summary>MicroSim: Quantization and Noise Shaping</summary>

### Purpose

This simulation demonstrates quantization effects including quantization error, signal-to-noise ratio as a function of bit depth, and noise shaping in oversampling systems.

### Features

- Input continuous-amplitude signal (sine wave, speech sample, or custom)
- Adjust bit depth from 1 to 16 bits
- Display quantized signal and quantization error
- Show time-domain and frequency-domain representations of quantization noise
- Demonstrate oversampling with selectable oversampling ratio
- Illustrate noise shaping and digital filtering to improve SNR
- Calculate and display SQNR in dB

### Learning Objectives

- Understand quantization as irreversible amplitude discretization
- Observe how bit depth affects signal fidelity
- Visualize quantization noise characteristics
- Recognize benefits of oversampling and noise shaping

### Implementation Requirements

- Canvas size: 670px wide, 625px total height (550px drawing + 75px controls)
- Four plot areas: original signal, quantized signal, quantization error, noise spectrum
- Bit depth slider (1-16 bits)
- Oversampling ratio selector (1×, 2×, 4×, 8×, 16×)
- SQNR calculation and display
- Signal source selector (sinusoid, triangle, complex waveform)
- Visual quantization level indicators

</details>

## Comparison Tables

| Concept | Definition | Mathematical Expression | Typical Values |
|---------|-----------|------------------------|----------------|
| Sampling Period | Time between samples | $T_s$ | Audio: 22.7 μs (44.1 kHz) |
| Sampling Rate | Samples per second | $f_s = 1/T_s$ | Audio: 44.1 kHz, Speech: 8 kHz |
| Nyquist Rate | Minimum rate for bandlimited signal | $f_N = 2f_{max}$ | 2× highest signal frequency |
| Nyquist Frequency | Maximum unambiguous frequency | $f_{Nyq} = f_s/2$ | Audio: 22.05 kHz at 44.1 kHz rate |

| Sampling Strategy | Rate Requirement | Advantages | Applications |
|-------------------|------------------|------------|--------------|
| Nyquist Sampling | $f_s \geq 2f_{max}$ | Minimal data rate | Baseband signals, bandwidth-limited applications |
| Oversampling | $f_s \gg 2f_{max}$ | Relaxed filter specs, noise shaping possible | High-resolution audio, delta-sigma ADCs |
| Undersampling | $f_s \geq 2B$ (bandwidth $B$) | Direct RF sampling, frequency translation | Software-defined radio, bandpass signals |

| Quantization Type | Step Size | Optimization | Applications |
|-------------------|-----------|--------------|--------------|
| Uniform | Constant $\Delta$ | Optimal for uniform distribution | General purpose, instrumentation |
| Non-Uniform (μ-law) | Variable, denser near zero | Optimal for speech-like distributions | Telephony, speech coding |
| Non-Uniform (A-law) | Variable, denser near zero | Alternative to μ-law | European telephony |
| Lloyd-Max | Optimized for specific PDF | Minimal MSE for given PDF | Specialized applications |

| Parameter | Expression | Typical Range | Significance |
|-----------|-----------|---------------|--------------|
| Quantization Step | $\Delta = V/2^b$ | Audio: $V=2V$, $b=16$ gives $\Delta \approx 30\mu V$ | Determines resolution |
| Quantization Error | $-\Delta/2 \leq e[n] \leq \Delta/2$ | Bounded by step size | Fundamental accuracy limit |
| SQNR (dB) | $6.02b + 1.76$ dB | 8-bit: ~50 dB, 16-bit: ~98 dB | Quality metric |
| Dynamic Range | $20 \log_{10}(2^b)$ dB | 8-bit: 48 dB, 16-bit: 96 dB | Maximum signal range |

## Design Considerations

The design of sampling and quantization systems involves numerous trade-offs between conflicting requirements. Higher sampling rates improve anti-aliasing filter realizability and enable oversampling benefits, but increase data rates, power consumption, and processing requirements. Greater bit depths reduce quantization noise but increase converter cost, power, and data storage/transmission bandwidth.

Anti-aliasing filter design must balance transition band width (affecting required oversampling ratio) against filter complexity and passband distortion. Sharper filters require higher order (more components, higher cost) but permit sampling closer to the Nyquist rate. Group delay variation in the filter passband can distort signal phase relationships, particularly critical in communication systems and precision instrumentation.

Practical ADC selection considers resolution (bit depth), sampling rate, power consumption, cost, interface type (serial vs. parallel), and application-specific features such as simultaneous sampling for multiple channels or built-in programmable gain amplifiers. The effective number of bits (ENOB), which accounts for all noise and distortion sources, typically falls below the nominal bit depth, making ENOB a more realistic performance metric.

## Summary

This chapter has explored the fundamental processes of sampling and quantization that enable digital signal processing of continuous-time analog signals. The sampling theorem establishes that bandlimited signals can be perfectly reconstructed from samples when the sampling rate exceeds twice the highest frequency component, with the Nyquist rate and Nyquist frequency defining critical thresholds. Violation of the sampling theorem causes aliasing, where high-frequency components fold back into lower frequencies, creating distortion that cannot be removed after sampling occurs.

Anti-aliasing filters prevent aliasing by band-limiting signals before sampling, while oversampling relaxes filter requirements and enables noise-shaping techniques. Undersampling exploits bandpass signal characteristics to sample at rates based on bandwidth rather than center frequency, enabling direct sampling of high-frequency signals. Quantization converts continuous amplitudes to discrete levels, introducing irreversible error that can be modeled as additive noise when quantization is sufficiently fine.

Uniform quantization provides constant step sizes suitable for most applications, while non-uniform quantization optimizes error distribution for specific signal statistics such as speech. The signal-to-quantization-noise ratio increases approximately 6 dB per bit, guiding bit depth selection based on dynamic range requirements. Signal reconstruction from samples requires interpolation, ideally using sinc functions though practical systems employ simpler methods followed by analog smoothing filters.

Understanding sampling and quantization theory, practical limitations, and design trade-offs enables engineers to select appropriate ADC and DAC components, design effective anti-aliasing and reconstruction filters, and optimize overall system performance for diverse applications from audio recording to scientific instrumentation.
