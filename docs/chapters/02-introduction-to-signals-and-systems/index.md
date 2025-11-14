# Introduction to Signals and Systems

## Summary

This chapter defines signals and systems, exploring signal classifications, properties, and basic operations that are fundamental to signal processing analysis.

Students will explore 25 key concepts that are essential for understanding this area of signal processing. This material provides the foundation for concepts introduced in later chapters.

## Concepts Covered

This chapter covers the following 25 concepts from the learning graph:

26. Signals
27. Systems
28. Continuous-Time Signals
29. Discrete-Time Signals
30. Analog Signals
31. Digital Signals
32. Periodic Signals
33. Aperiodic Signals
34. Even Signals
35. Odd Signals
36. Energy Signals
37. Power Signals
38. Unit Step Function
39. Unit Impulse Function
40. Sinusoidal Signals
41. Exponential Signals
42. Signal Operations
43. Time Shifting
44. Time Scaling
45. Signal Amplitude
46. Signal Frequency
47. Signal Phase
48. Signal Duration
49. Signal Energy
50. Signal Power

## Prerequisites

This chapter builds on concepts from:

- [Chapter 1: Mathematical Foundations](../01-mathematical-foundations/index.md)

---

## Introduction

The study of signal processing begins with understanding the fundamental nature of signals and the systems that process them. A signal represents information-bearing quantities that vary with respect to one or more independent variables, typically time or space. Systems, on the other hand, are entities that transform input signals into output signals through specific operations or transformations. This chapter establishes the theoretical foundation for all subsequent signal processing topics by introducing signal classifications, mathematical representations, and basic operations that enable sophisticated analysis and manipulation of real-world phenomena.

Understanding the diverse characteristics of signals provides engineers and scientists with the vocabulary and conceptual tools necessary to describe, analyze, and predict the behavior of complex communication systems, control systems, and data processing applications. From the continuous voltages in analog circuits to the discrete samples in digital audio files, signals permeate every aspect of modern technology and engineering practice.

## Fundamental Definitions

### Signals

A signal is a function that conveys information about the behavior or attributes of some phenomenon, represented mathematically as a function of one or more independent variables. In electrical engineering contexts, signals typically represent voltages or currents that vary over time, while in other domains they might represent temperature variations, stock prices, or seismic measurements. The mathematical representation of a signal allows engineers to apply analytical techniques from calculus, linear algebra, and complex analysis to understand, predict, and manipulate the information contained within.

Signals serve as the primary carriers of information in communication systems, the measurements in control systems, and the data sources in computational analysis. The abstract mathematical treatment of signals enables powerful generalizations that apply across diverse application domains, from medical imaging to financial forecasting.

### Systems

A system is an entity that processes input signals to produce output signals according to specific rules or mathematical operations. Systems can be physical devices such as electronic filters or amplifiers, or they can be algorithmic processes implemented in software. The fundamental relationship is expressed as $y(t) = \mathcal{T}[x(t)]$, where $x(t)$ represents the input signal, $y(t)$ represents the output signal, and $\mathcal{T}$ represents the transformation operation performed by the system.

The study of systems focuses on characterizing their behavior, predicting their responses to various inputs, and designing systems that achieve desired transformation objectives. System analysis techniques provide the mathematical framework for understanding how signals are modified as they pass through physical or computational processes.

## Signal Classifications

Signals can be categorized along multiple dimensions, each classification revealing different aspects of signal behavior and suggesting appropriate analysis techniques.

### Continuous-Time vs. Discrete-Time Signals

**Continuous-Time Signals** are defined for every value of time within some interval, represented mathematically as $x(t)$ where $t$ is a real-valued continuous variable. These signals naturally arise in physical systems where quantities vary smoothly over time, such as temperature measurements, acoustic pressure waves, or electromagnetic field strengths. The continuous nature allows application of calculus-based analysis techniques including differentiation and integration.

**Discrete-Time Signals** are defined only at specific time instances, typically at uniform intervals, and are represented as $x[n]$ where $n$ is an integer-valued index. These signals arise naturally from sampling processes or from inherently discrete phenomena such as daily stock prices or monthly rainfall measurements. The notation $x[n]$ distinguishes discrete signals from their continuous counterparts, emphasizing that the signal exists only at integer multiples of some sampling period.

The relationship between these representations is fundamental to digital signal processing, where continuous-time signals from the physical world are converted to discrete-time signals for computational processing.

### Analog vs. Digital Signals

**Analog Signals** can take any value within a continuous range, both in time and amplitude, providing infinite resolution limited only by measurement precision and noise. Traditional telephone systems, vinyl records, and thermocouple temperature sensors all produce analog signals that vary continuously in both dimensions. The infinite precision of analog representation comes at the cost of susceptibility to noise and degradation during transmission and storage.

**Digital Signals** are quantized in both time and amplitude, taking on only discrete values from a finite set of possible levels. Modern computers, digital communication systems, and compact disc audio all employ digital signals that offer advantages in noise immunity, reproducibility, and compatibility with computational processing. The conversion from analog to digital involves both sampling (discretization in time) and quantization (discretization in amplitude).

The distinction between analog and digital representations underlies the fundamental trade-offs in modern signal processing system design between precision, cost, power consumption, and computational capability.

### Temporal Properties: Periodicity

**Periodic Signals** repeat their values at regular intervals, satisfying the condition $x(t) = x(t + T)$ for all values of $t$, where $T$ is the fundamental period. Common examples include sinusoidal waveforms, square waves, and the carrier signals used in radio transmission. The frequency $f = 1/T$ measured in Hertz (Hz) describes how many complete cycles occur per unit time, providing an intuitive characterization of periodic behavior.

**Aperiodic Signals** do not exhibit regular repetition patterns and may be transient (existing for finite duration) or persistent but non-repeating. Speech signals, radar pulses, and most naturally occurring phenomena produce aperiodic signals that require different analytical approaches than their periodic counterparts. While periodic signals can be efficiently represented using Fourier series, aperiodic signals require the more general Fourier transform.

### Symmetry Properties

**Even Signals** satisfy the symmetry condition $x(t) = x(-t)$, meaning they are symmetric about the vertical axis at $t=0$. The cosine function $\cos(\omega t)$ exemplifies an even signal, and this property simplifies many mathematical operations in signal analysis. Even signals contain only cosine components in their Fourier representations, eliminating the need to compute sine coefficients.

**Odd Signals** satisfy the condition $x(t) = -x(-t)$, exhibiting antisymmetry about the origin. The sine function $\sin(\omega t)$ is the prototypical odd signal, and such signals integrate to zero over symmetric intervals. Odd signals contain only sine components in their Fourier series expansions.

Any arbitrary signal can be decomposed into the sum of an even component and an odd component using the expressions:

$$x_e(t) = \frac{x(t) + x(-t)}{2}$$

$$x_o(t) = \frac{x(t) - x(-t)}{2}$$

This decomposition proves valuable in many analytical contexts, particularly in understanding signal behavior under various system transformations.

### Energy and Power Classifications

**Energy Signals** possess finite total energy, computed as $E = \int_{-\infty}^{\infty} |x(t)|^2 dt < \infty$, and consequently have zero average power. Such signals are necessarily time-limited or decay sufficiently rapidly at infinity, including examples such as rectangular pulses, exponentially decaying functions, and finite-duration speech segments. The energy metric provides a measure of the signal's total effect or magnitude over all time.

**Power Signals** have infinite energy but finite average power, defined as $P = \lim_{T \to \infty} \frac{1}{2T} \int_{-T}^{T} |x(t)|^2 dt < \infty$. Periodic signals constitute the primary class of power signals, as their indefinite repetition leads to unbounded total energy. Constant signals and many random processes also fall into this category. The distinction between energy and power signals reflects fundamental differences in signal duration and long-term behavior.

## Fundamental Signal Types

### Unit Step Function

The unit step function $u(t)$ represents an instantaneous transition from zero to one at time zero, defined mathematically as:

$$u(t) = \begin{cases} 0 & t < 0 \\ 1 & t \geq 0 \end{cases}$$

This simple function serves as a building block for constructing more complex signals and modeling switching operations in circuits and control systems. The step function enables representation of causal signals (signals that are zero for $t < 0$) through multiplication, and can create rectangular pulses through combinations such as $u(t) - u(t-T)$.

The discrete-time unit step $u[n]$ plays an analogous role in discrete signal processing, enabling representation of causal sequences and accumulation operations.

### Unit Impulse Function

The unit impulse or Dirac delta function $\delta(t)$ represents an infinitely narrow, infinitely tall pulse with unit area, defined through its sifting property:

$$\int_{-\infty}^{\infty} f(t)\delta(t-t_0) dt = f(t_0)$$

Although not a function in the strict mathematical sense, the impulse is rigorously defined in distribution theory and proves indispensable in system analysis. The impulse response of a system (its output when the input is an impulse) completely characterizes the system's behavior for all possible inputs through convolution operations.

The discrete-time impulse $\delta[n]$ is defined as $\delta[0] = 1$ and $\delta[n] = 0$ for $n \neq 0$, providing the basis for representing any discrete signal as a weighted sum of shifted impulses:

$$x[n] = \sum_{k=-\infty}^{\infty} x[k]\delta[n-k]$$

### Sinusoidal Signals

Sinusoidal signals represent perhaps the most important signal type in engineering analysis, taking the general form:

$$x(t) = A\cos(\omega t + \phi)$$

where $A$ represents amplitude, $\omega = 2\pi f$ represents angular frequency in radians per second, and $\phi$ represents the phase angle in radians. Sinusoids are eigenfunctions of linear time-invariant systems, meaning that a sinusoidal input produces a sinusoidal output at the same frequency (though possibly with altered amplitude and phase).

The mathematical properties of sinusoids, particularly their relationship to complex exponentials through Euler's formula $e^{j\omega t} = \cos(\omega t) + j\sin(\omega t)$, enable powerful analytical techniques including Fourier analysis and phasor methods. The ubiquity of sinusoidal behavior in physical systems from mechanical vibrations to electromagnetic waves makes these signals central to engineering practice.

### Exponential Signals

Exponential signals take the form $x(t) = Ce^{at}$ where $C$ and $a$ are constants that may be real or complex. Real exponentials with $a < 0$ decay to zero, modeling processes such as capacitor discharge, radioactive decay, and thermal cooling. Real exponentials with $a > 0$ grow unboundedly, representing unstable or divergent processes.

Complex exponentials $e^{j\omega t}$ are intimately connected to sinusoids and form the basis for frequency domain analysis. The complex exponential combines oscillatory behavior with exponential growth or decay, providing a unified framework for analyzing both the magnitude and phase characteristics of signals and systems.

The discrete-time exponential $x[n] = Ca^n$ serves analogous purposes in discrete signal processing, with $|a| < 1$ producing decay and $|a| > 1$ producing growth.

## Signal Parameters and Characteristics

### Signal Amplitude

The amplitude of a signal refers to its maximum deviation from its mean or equilibrium value, providing a measure of signal strength or intensity. For sinusoidal signals $A\cos(\omega t)$, the amplitude $A$ directly specifies the peak value. For general signals, various amplitude measures exist including peak amplitude, peak-to-peak amplitude, and root-mean-square (RMS) amplitude given by:

$$A_{rms} = \sqrt{\frac{1}{T}\int_0^T x^2(t)dt}$$

The RMS amplitude relates directly to the average power delivered by the signal, making it particularly relevant in electrical power calculations and audio signal measurements.

### Signal Frequency

Frequency describes the rate of oscillation or repetition in periodic signals, measured in Hertz (Hz) representing cycles per second. The frequency $f$ relates to the period $T$ by $f = 1/T$ and to angular frequency by $\omega = 2\pi f$. Frequency characterizes not only pure sinusoids but also complex periodic waveforms through their harmonic content, where integer multiples of the fundamental frequency combine to create the overall signal shape.

The concept of frequency extends to aperiodic signals through spectral analysis, where the Fourier transform reveals the distribution of frequency content even in non-repeating signals. This frequency domain perspective provides crucial insights into signal behavior and system design.

### Signal Phase

Phase represents the temporal offset or shift of a periodic signal relative to a reference, typically measured in radians or degrees. For a sinusoid $A\cos(\omega t + \phi)$, the phase angle $\phi$ determines the signal's value at $t=0$ and its relationship to other sinusoids of the same frequency. Phase information proves critical in applications from interference patterns in wave propagation to synchronization in communication systems.

Relative phase between two signals determines whether they reinforce (in phase) or cancel (out of phase), with intermediate phase differences producing varying degrees of constructive and destructive interference. Phase linearity in systems preserves signal shape, while phase distortion can severely impact signal quality.

### Signal Duration

The duration of a signal specifies its extent in time, distinguishing finite-duration (time-limited) signals from infinite-duration signals. Practical signals are always finite in duration, but many useful mathematical models employ infinite-duration signals such as sinusoids and exponentials. The duration of a signal relates inversely to its bandwidth through various uncertainty principles, establishing fundamental limits on simultaneous localization in time and frequency.

Compact signal duration enables efficient storage and transmission but requires wider frequency bandwidth, while spread-out signals can achieve narrower bandwidths at the cost of extended duration.

### Signal Energy and Power

Signal energy quantifies the total effect of a signal over all time, while signal power measures the energy per unit time. For continuous-time signals:

$$E = \int_{-\infty}^{\infty} |x(t)|^2 dt$$

$$P = \lim_{T \to \infty} \frac{1}{2T}\int_{-T}^{T} |x(t)|^2 dt$$

These metrics generalize to discrete-time signals by replacing integrals with summations. Energy and power calculations prove essential in applications from communication system design (where signal power must exceed noise power for reliable detection) to electrical engineering (where power consumption directly impacts cost and thermal management).

## Signal Operations

Signal operations enable the manipulation and transformation of signals to extract information, emphasize features, or prepare signals for further processing.

### Time Shifting

Time shifting translates a signal forward or backward in time without changing its shape, represented as $y(t) = x(t - t_0)$. A positive value of $t_0$ delays the signal (shifts it to the right), while a negative value advances it (shifts left). Time shifting appears in applications from acoustic echo cancellation to alignment of multiple measurement channels for comparative analysis.

In discrete-time systems, time shifting by an integer number of samples is implemented simply by index manipulation: $y[n] = x[n - n_0]$, where $n_0$ represents the shift amount.

### Time Scaling

Time scaling expands or compresses a signal in time by replacing $t$ with $at$, yielding $y(t) = x(at)$. When $a > 1$, the signal is compressed (plays faster), while $0 < a < 1$ expands the signal (plays slower). The case $a = -1$ produces time reversal, flipping the signal about $t = 0$.

Time scaling affects both the duration and the frequency content of signals, with compression increasing all frequencies by factor $a$ and expansion decreasing frequencies proportionally. Audio applications exploit time scaling for pitch shifting and time-stretching effects.

## Interactive Demonstrations

<details markdown="1">
<summary>MicroSim: Signal Type Explorer</summary>

### Purpose

This interactive simulation allows students to visualize and compare different signal types including continuous-time, discrete-time, periodic, and aperiodic signals.

### Features

- Toggle between continuous and discrete time representations
- Adjust amplitude, frequency, and phase parameters in real-time
- Display multiple signal types simultaneously for comparison
- Show energy and power calculations for selected signals
- Demonstrate time shifting and time scaling operations

### Learning Objectives

- Distinguish between continuous-time and discrete-time signal representations
- Understand the impact of amplitude, frequency, and phase on signal characteristics
- Visualize the difference between energy and power signals
- Observe how signal operations affect waveform shape and properties

### Implementation Requirements

- Canvas size: 670px wide, 475px total height (400px drawing + 75px controls)
- Drawing area displays up to four signals in different colors
- Control panel includes sliders for amplitude (0-5), frequency (0.1-10 Hz), and phase (0-360 degrees)
- Dropdown menu selects signal type: sinusoid, square wave, exponential, step function
- Display numerical values for energy, power, and RMS amplitude
- Interactive buttons for time shift and time scale operations

</details>

<details markdown="1">
<summary>MicroSim: Even and Odd Signal Decomposition</summary>

### Purpose

This simulation demonstrates the decomposition of arbitrary signals into even and odd components using the mathematical formulas presented in this chapter.

### Features

- Draw custom signal shapes using mouse or select from predefined waveforms
- Automatically compute and display even component $x_e(t)$
- Automatically compute and display odd component $x_o(t)$
- Verify that $x(t) = x_e(t) + x_o(t)$ through visual overlay
- Show mathematical calculations for each component

### Learning Objectives

- Understand the concept of even and odd signal symmetry
- Apply decomposition formulas to arbitrary signals
- Verify the uniqueness of even/odd decomposition
- Recognize even and odd components in common signal types

### Implementation Requirements

- Canvas size: 670px wide, 550px total height (475px drawing + 75px controls)
- Three synchronized plot areas showing original, even component, and odd component
- Time axis from -5 to +5 seconds with vertical axis at t=0
- Predefined signals: pulse, triangle, sawtooth, custom
- Color coding: original (blue), even (green), odd (red), sum (purple dashed)
- Clear button to reset and draw new custom signal

</details>

## Comparison Tables

| Signal Classification | Defining Property | Examples | Mathematical Representation |
|----------------------|-------------------|----------|---------------------------|
| Continuous-Time | Defined for all t | Analog voltage, temperature | $x(t)$, $t \in \mathbb{R}$ |
| Discrete-Time | Defined at integer indices | Digital audio samples | $x[n]$, $n \in \mathbb{Z}$ |
| Periodic | Repeats with period T | Sinusoid, square wave | $x(t) = x(t + T)$ |
| Aperiodic | No repetition | Speech signal, pulse | No periodicity condition |
| Even | Symmetric about t=0 | $\cos(\omega t)$, $t^2$ | $x(t) = x(-t)$ |
| Odd | Antisymmetric about t=0 | $\sin(\omega t)$, $t^3$ | $x(t) = -x(-t)$ |
| Energy Signal | Finite total energy | Rectangular pulse | $E < \infty$, $P = 0$ |
| Power Signal | Finite average power | Constant signal, periodic | $P < \infty$, $E = \infty$ |

| Signal Operation | Mathematical Form | Effect | Application |
|-----------------|-------------------|--------|-------------|
| Time Shift | $y(t) = x(t - t_0)$ | Delays ($t_0 > 0$) or advances ($t_0 < 0$) signal | Echo, synchronization |
| Time Scaling | $y(t) = x(at)$ | Compresses ($a > 1$) or expands ($0 < a < 1$) signal | Audio speed change |
| Time Reversal | $y(t) = x(-t)$ | Flips signal about t=0 | Matched filtering |
| Amplitude Scaling | $y(t) = cx(t)$ | Multiplies amplitude by constant c | Volume control, gain |

| Signal Type | General Form | Key Parameters | Frequency Content |
|-------------|--------------|----------------|-------------------|
| Sinusoid | $A\cos(\omega t + \phi)$ | Amplitude A, frequency $\omega$, phase $\phi$ | Single frequency $\omega$ |
| Real Exponential | $Ce^{at}$ | Constant C, decay/growth rate a | Continuous spectrum |
| Complex Exponential | $Ce^{(σ+j\omega)t}$ | Growth/decay σ, frequency $\omega$ | Single complex frequency |
| Unit Step | $u(t)$ | Step time (usually 0) | DC plus wide spectrum |
| Unit Impulse | $\delta(t)$ | Impulse time (usually 0) | All frequencies equally |

## Summary

This chapter has established the fundamental concepts of signals and systems that form the foundation for all signal processing analysis. Signals represent information-bearing quantities that vary with independent variables, most commonly time, while systems transform input signals into output signals through specific mathematical operations. The classification of signals along multiple dimensions including continuous versus discrete time, analog versus digital amplitude, periodic versus aperiodic behavior, and even versus odd symmetry provides the vocabulary for describing real-world phenomena mathematically.

Fundamental signal types including the unit step function, unit impulse function, sinusoids, and exponentials serve as building blocks for representing and analyzing more complex signals. Signal parameters such as amplitude, frequency, phase, duration, energy, and power quantify signal characteristics and enable rigorous analysis of signal behavior. Basic signal operations including time shifting and time scaling provide the tools for manipulating signals to extract information and prepare data for processing.

Understanding these foundational concepts enables students to progress to more advanced topics including system properties, convolution operations, frequency domain analysis, and digital signal processing techniques. The mathematical framework established here applies across diverse application domains from communications and control to biomedical engineering and financial analysis, demonstrating the power and generality of signal processing theory.
