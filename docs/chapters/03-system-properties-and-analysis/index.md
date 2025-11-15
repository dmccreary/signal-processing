# System Properties and Analysis

## Summary

This chapter examines key system properties including linearity, time-invariance, causality, stability, and various types of system responses.

Students will explore 20 key concepts that are essential for understanding this area of signal processing. This material provides the foundation for concepts introduced in later chapters.

## Concepts Covered

This chapter covers the following 20 concepts from the learning graph:

51. Linear Systems
52. Nonlinear Systems
53. Time-Invariant Systems
54. Time-Varying Systems
55. Causality
56. Non-Causal Systems
57. Stability
58. Unstable Systems
59. Memory Systems
60. Memoryless Systems
61. Invertible Systems
62. System Response
63. Impulse Response
64. Step Response
65. Frequency Response
66. Transfer Function
67. System Identification
68. Feedback Systems
69. Feedforward Systems
70. System Interconnections

## Prerequisites

This chapter builds on concepts from:

- [Chapter 2: Introduction to Signals and Systems](../02-introduction-to-signals-and-systems/index.md)

---

## Introduction

The behavior of systems that process signals can be characterized through a set of fundamental properties that determine how systems respond to various inputs and how they can be analyzed mathematically. Understanding system properties enables engineers to predict system behavior, design systems with desired characteristics, and select appropriate analysis techniques for complex signal processing tasks. This chapter examines the key properties that distinguish different classes of systems and introduces the mathematical frameworks used to characterize system responses.

System analysis provides the theoretical foundation for understanding everything from simple electronic circuits to complex communication networks, control systems, and digital signal processors. By classifying systems according to properties such as linearity, time-invariance, causality, and stability, we gain powerful analytical tools that simplify system design and enable prediction of system behavior without exhaustive simulation or testing.

## Fundamental System Properties

### Linear Systems

A system is linear if it satisfies both the additivity property and the homogeneity (scaling) property, which together constitute the principle of superposition. Mathematically, a system $\mathcal{T}$ is linear if for any inputs $x_1(t)$ and $x_2(t)$ and any constants $a$ and $b$, the relationship holds:

$$\mathcal{T}[ax_1(t) + bx_2(t)] = a\mathcal{T}[x_1(t)] + b\mathcal{T}[x_2(t)]$$

Linear systems are crucial in signal processing because they preserve the structure of input signals and can be analyzed using powerful mathematical techniques from linear algebra. The impulse response completely characterizes a linear system, and the frequency response can be computed directly from the impulse response. Examples of linear systems include resistor-capacitor circuits (without diodes or transistors), ideal operational amplifiers, and many digital filters.

The linearity property enables decomposition of complex inputs into simpler components, analysis of each component separately, and recombination through superposition to obtain the total response. This divide-and-conquer approach underlies much of signal processing theory.

### Nonlinear Systems

**Nonlinear Systems** violate the superposition principle, exhibiting behaviors where the response to a sum of inputs differs from the sum of individual responses. Nonlinearity introduces phenomena including harmonic generation, intermodulation distortion, and limit cycles that cannot occur in linear systems. Examples include amplifiers operating in saturation, diode rectifiers, and most biological systems.

Nonlinear systems are generally more difficult to analyze than linear systems, requiring specialized techniques such as describing functions, phase plane analysis, or numerical simulation. However, nonlinearity also enables important functions including modulation, demodulation, mixing, and signal detection that cannot be achieved with purely linear operations.

### Time-Invariant Systems

A system is **time-invariant** if a time shift in the input produces an equivalent time shift in the output, with no change in the output waveform. Mathematically, if $y(t) = \mathcal{T}[x(t)]$, then the system is time-invariant if:

$$\mathcal{T}[x(t - t_0)] = y(t - t_0)$$

for all signals $x(t)$ and all time shifts $t_0$. Time-invariant systems have constant parameters that do not change over time, ensuring consistent behavior regardless of when an input is applied. Most passive electronic components (resistors, capacitors, inductors) form time-invariant systems, as do many digital filters with constant coefficients.

The combination of linearity and time-invariance (LTI systems) creates a particularly powerful class of systems that can be completely characterized by their impulse response and analyzed using convolution and Fourier transform techniques.

### Time-Varying Systems

**Time-Varying Systems** have parameters or characteristics that change over time, causing the system response to depend on when the input is applied. A time shift in the input does not produce a simple time shift in the output. Examples include amplitude modulators (where a carrier signal varies the system gain), adaptive filters (where coefficients update based on signal statistics), and switches that open or close at specific times.

Time-varying systems require more complex analysis techniques than time-invariant systems and generally cannot be characterized by a single impulse response. However, slowly time-varying systems can often be approximated as locally time-invariant over short intervals.

### Causality

A system is **causal** if the output at any time depends only on present and past input values, never on future inputs. Mathematically, for a causal system, $y(t_0)$ depends only on $x(t)$ for $t \leq t_0$. All physical systems that operate in real time must be causal, as they cannot respond to inputs that have not yet occurred.

Causality constrains the form of system impulse responses: for causal systems, the impulse response $h(t)$ must be zero for $t < 0$. This requirement affects filter design, imposing limitations on achievable frequency responses. The Paley-Wiener criterion provides necessary and sufficient conditions for a frequency response to correspond to a causal, stable system.

### Non-Causal Systems

**Non-Causal Systems** produce outputs that depend on future input values, which is physically impossible for real-time operation but mathematically permissible and useful for off-line processing of recorded signals. Examples include the ideal delay-free low-pass filter (which requires infinite look-ahead) and certain image processing operations that access entire frames before producing output.

Non-causal systems can achieve ideal frequency responses that causal systems can only approximate, making them valuable in applications where signals are fully available before processing begins.

### Stability

A system is **stable** in the bounded-input, bounded-output (BIBO) sense if every bounded input produces a bounded output. Mathematically, if $|x(t)| < M_x$ for all $t$ implies $|y(t)| < M_y$ for all $t$ (where $M_x$ and $M_y$ are finite constants), then the system is BIBO stable. For LTI systems, stability requires that the impulse response be absolutely integrable:

$$\int_{-\infty}^{\infty} |h(t)| dt < \infty$$

Stability is essential for practical systems, as unstable systems produce unbounded outputs that saturate physical components or cause numerical overflow in digital implementations. Control systems must be designed for stability, and filters must have poles inside the unit circle (for discrete-time) or in the left half-plane (for continuous-time).

### Unstable Systems

**Unstable Systems** produce unbounded outputs for at least some bounded inputs, leading to divergent behavior that can damage physical systems or cause computational failures. Examples include amplifiers with positive feedback exceeding unity gain and discrete-time systems with poles outside the unit circle. While generally undesirable, controlled instability is sometimes used intentionally, such as in oscillators where a stable limit cycle provides a periodic output.

## Memory Properties

### Memory Systems

**Memory Systems** have outputs at time $t$ that depend on past input values, not just the current input. Such systems store information about previous inputs, either in physical form (charge on capacitors, current in inductors) or in computational form (previous samples in digital filter delays). The impulse response of a memory system extends over time, with $h(t) \neq 0$ for some $t \neq 0$.

Memory systems are essential for filtering, equalization, prediction, and most signal processing operations that extract information from temporal patterns. The amount of memory (the duration over which past inputs affect the output) relates to system complexity and computational requirements.

### Memoryless Systems

**Memoryless Systems** produce outputs that depend only on the current input value, with no dependence on past or future inputs. The input-output relationship takes the form $y(t) = f[x(t)]$ where $f$ is some function. The impulse response of a memoryless system is $h(t) = K\delta(t)$ where $K$ is a constant gain.

Examples of memoryless systems include resistive voltage dividers, linear amplifiers with pure gain, and nonlinear operations such as squaring or absolute value. Memoryless systems respond instantaneously to input changes and require no storage of past information.

### Invertible Systems

**Invertible Systems** allow the input signal to be recovered from the output signal through an inverse system. If $y(t) = \mathcal{T}[x(t)]$, then an inverse system $\mathcal{T}^{-1}$ exists such that $x(t) = \mathcal{T}^{-1}[y(t)]$. For invertibility, the system must be one-to-one: different inputs must produce different outputs.

Invertibility is important in communication systems where signals must be recovered after transmission through a channel, in control systems where disturbances must be canceled, and in signal restoration where degradations must be removed. For LTI systems, invertibility requires that the frequency response $H(f)$ never be zero.

## System Response Characterization

### System Response

The **system response** describes the output produced by a system for a given input, encompassing both transient behavior (response to sudden changes) and steady-state behavior (long-term response to sustained inputs). Complete characterization of system response for LTI systems requires knowledge of the impulse response, from which responses to all other inputs can be computed via convolution.

For linear systems, the total response to an input can be decomposed into the zero-input response (due to initial conditions) and the zero-state response (due to the applied input). This decomposition separates the effects of energy stored in the system from the effects of external excitation.

### Impulse Response

The **impulse response** $h(t)$ is the output of a system when the input is the unit impulse function $\delta(t)$, representing the most fundamental characterization of an LTI system. Knowledge of $h(t)$ enables computation of the response to any input through the convolution integral:

$$y(t) = \int_{-\infty}^{\infty} x(\tau)h(t-\tau) d\tau = x(t) * h(t)$$

The impulse response reveals crucial system properties: causality requires $h(t) = 0$ for $t < 0$, stability requires $\int_{-\infty}^{\infty} |h(t)| dt < \infty$, and memory duration is indicated by the effective width of $h(t)$. In discrete-time systems, the impulse response $h[n]$ plays an analogous role.

### Step Response

The **step response** $s(t)$ is the output when the input is the unit step function $u(t)$, providing insight into system dynamics and transient behavior. For LTI systems, the step response is the integral of the impulse response:

$$s(t) = \int_{-\infty}^{t} h(\tau) d\tau$$

The step response reveals important system characteristics including rise time (speed of response), settling time (time to reach steady state), overshoot (extent of oscillation), and steady-state error (long-term accuracy). Step response measurements are commonly performed in experimental system identification because step inputs are easy to generate.

### Frequency Response

The **frequency response** $H(f)$ describes how a system modifies the amplitude and phase of sinusoidal inputs as a function of frequency. For LTI systems, the frequency response is the Fourier transform of the impulse response:

$$H(f) = \int_{-\infty}^{\infty} h(t)e^{-j2\pi ft} dt$$

The magnitude $|H(f)|$ shows how the system amplifies or attenuates different frequencies, while the phase $\angle H(f)$ shows how the system delays sinusoidal components. Frequency response characterization is fundamental to filter design and provides intuitive understanding of system behavior in terms of which frequency components pass through and which are blocked.

### Transfer Function

The **transfer function** $H(s)$ is the Laplace transform of the impulse response for continuous-time systems, or the Z-transform for discrete-time systems, providing a compact representation of system behavior in the complex frequency domain:

$$H(s) = \frac{Y(s)}{X(s)} = \int_{-\infty}^{\infty} h(t)e^{-st} dt$$

The transfer function enables analysis of system stability through pole locations, frequency response through evaluation on the imaginary axis ($s = j\omega$), and transient response through inverse transform techniques. Rational transfer functions (ratios of polynomials) correspond to systems described by linear differential equations with constant coefficients.

## System Analysis and Interconnection

### System Identification

**System Identification** is the process of constructing mathematical models of systems based on observed input-output data, enabling prediction and control of system behavior without detailed knowledge of internal structure. Techniques include impulse response measurement, frequency response measurement using swept sinusoids, correlation analysis using white noise excitation, and parametric modeling using least-squares or maximum likelihood estimation.

System identification bridges the gap between theoretical models and physical reality, accounting for unmodeled dynamics, parameter variations, and measurement noise. Applications span from control system design to audio equalization to channel characterization in communications.

### Feedback Systems

**Feedback Systems** route all or part of the output signal back to the input, creating a closed loop where the output affects subsequent output values. Negative feedback (where the fed-back signal opposes changes) provides stability, disturbance rejection, and reduced sensitivity to parameter variations, though at the cost of reduced gain. The closed-loop transfer function for a system with forward path $G(s)$ and feedback path $H(s)$ is:

$$T(s) = \frac{G(s)}{1 + G(s)H(s)}$$

Positive feedback (where the fed-back signal reinforces changes) can cause instability but is used intentionally in oscillators and certain nonlinear circuits. Feedback system design must carefully balance stability margins against performance requirements.

### Feedforward Systems

**Feedforward Systems** process signals in one direction only, from input to output, without feedback loops. Such systems are inherently stable (if each component is stable) and have simpler analysis, but lack the disturbance rejection and robustness properties of feedback systems. Feedforward compensation adds a parallel path that anticipates and cancels disturbances, complementing feedback control.

Many signal processing systems use pure feedforward architectures, particularly in cases where feedback would introduce unwanted latency or where open-loop control suffices.

### System Interconnections

**System Interconnections** combine multiple subsystems through series (cascade), parallel, or feedback configurations to achieve overall system objectives. For LTI systems in cascade, the overall impulse response is the convolution of individual impulse responses, and the overall transfer function is the product of individual transfer functions:

$$H_{total}(s) = H_1(s) \cdot H_2(s) \cdot \ldots \cdot H_N(s)$$

For parallel systems, the overall transfer function is the sum of individual transfer functions. These composition rules enable hierarchical system design where complex systems are built from simpler, well-understood components.

## Interactive Demonstrations

#### Diagram: System Property Explorer

<details markdown="1">
<summary>MicroSim: System Property Explorer</summary>

### Purpose

This interactive simulation allows students to explore fundamental system properties including linearity, time-invariance, causality, and stability through visual demonstrations and interactive tests.

### Features

- Apply test signals to various system types with visual output display
- Test linearity by comparing $\mathcal{T}[ax_1 + bx_2]$ with $a\mathcal{T}[x_1] + b\mathcal{T}[x_2]$
- Test time-invariance by comparing $\mathcal{T}[x(t-t_0)]$ with $y(t-t_0)$
- Demonstrate causal versus non-causal system responses
- Show stable versus unstable system behavior with bounded inputs
- Predefined systems: linear filter, amplifier, time-varying multiplier, nonlinear compressor

### Learning Objectives

- Understand the superposition principle for linear systems
- Recognize time-invariant versus time-varying behavior
- Distinguish causal from non-causal systems
- Identify stable versus unstable system responses

### Implementation Requirements

- Canvas size: 670px wide, 550px total height (475px drawing + 75px controls)
- Dual plot areas showing input signal (top) and output signal (bottom)
- System selector dropdown with 6-8 example systems
- Test type selector: linearity test, time-invariance test, causality test, stability test
- Visual indicators showing pass/fail for each property test
- Adjustable input parameters: amplitude, frequency, time shift

</details>

#### Diagram: Impulse and Frequency Response Analyzer

<details markdown="1">
<summary>MicroSim: Impulse and Frequency Response Analyzer</summary>

### Purpose

This simulation demonstrates the relationship between impulse response, step response, and frequency response for LTI systems, showing how these different characterizations provide complementary information about system behavior.

### Features

- Display impulse response $h(t)$ for selected system types
- Compute and display step response $s(t) = \int h(\tau) d\tau$
- Compute and display frequency response magnitude $|H(f)|$ and phase $\angle H(f)$
- Interactive cursor shows corresponding values across all three representations
- Apply arbitrary input signals and show convolution-based output
- System library: low-pass filter, high-pass filter, differentiator, integrator, resonant system

### Learning Objectives

- Understand the impulse response as complete characterization of LTI systems
- Relate step response to impulse response through integration
- Connect time-domain impulse response to frequency-domain frequency response
- Visualize how different system types modify signals in time and frequency domains

### Implementation Requirements

- Canvas size: 670px wide, 625px total height (550px drawing + 75px controls)
- Four synchronized plot areas: impulse response, step response, magnitude response, phase response
- System parameter sliders: cutoff frequency, damping ratio, filter order
- Input signal generator for testing system response
- Export functionality for impulse response coefficients

</details>

## Comparison Tables

| Property | Definition | Mathematical Test | Implication |
|----------|-----------|-------------------|-------------|
| Linearity | Superposition holds | $\mathcal{T}[ax_1 + bx_2] = a\mathcal{T}[x_1] + b\mathcal{T}[x_2]$ | Impulse response characterization valid |
| Time-Invariance | Time shifts preserve response | $\mathcal{T}[x(t-t_0)] = y(t-t_0)$ | Constant parameters, convolution applies |
| Causality | No future dependence | $y(t_0)$ depends only on $x(t)$ for $t \leq t_0$ | Real-time implementable |
| BIBO Stability | Bounded inputs yield bounded outputs | $\|x(t)\| < M_x \Rightarrow \|y(t)\| < M_y$ | Practical, safe operation |
| Memory | Output depends on past inputs | $h(t) \neq 0$ for some $t \neq 0$ | Storage or delays required |
| Invertibility | Input recoverable from output | Inverse system $\mathcal{T}^{-1}$ exists | Signal recovery possible |

| System Type | Impulse Response | Frequency Response | Applications |
|-------------|------------------|-------------------|--------------|
| Low-Pass Filter | Sinc-like, decaying | Passes low frequencies, blocks high | Anti-aliasing, smoothing |
| High-Pass Filter | Derivative of sinc | Blocks low frequencies, passes high | Edge detection, AC coupling |
| Band-Pass Filter | Modulated sinc | Passes band, blocks outside | Channel selection, resonance |
| Differentiator | $\delta'(t)$ approximation | $\|H(f)\| \propto f$ | Edge detection, rate-of-change |
| Integrator | Step-like | $\|H(f)\| \propto 1/f$ | Accumulation, DC gain |
| All-Pass Filter | Complex phase shift | $\|H(f)\| = 1$, variable phase | Phase equalization, delay |

| Response Type | Domain | Computation | Primary Use |
|--------------|--------|-------------|-------------|
| Impulse Response $h(t)$ | Time | Measure or compute from transfer function | Convolution, time-domain analysis |
| Step Response $s(t)$ | Time | Integrate impulse response | Transient analysis, rise/settling time |
| Frequency Response $H(f)$ | Frequency | Fourier transform of $h(t)$ | Filter design, frequency analysis |
| Transfer Function $H(s)$ | Complex frequency | Laplace transform of $h(t)$ | Stability analysis, control design |

| Interconnection | Overall Transfer Function | Overall Impulse Response | Common Use |
|-----------------|--------------------------|-------------------------|------------|
| Series (Cascade) | $H(s) = H_1(s) H_2(s)$ | $h(t) = h_1(t) * h_2(t)$ | Filter cascades, gain stages |
| Parallel | $H(s) = H_1(s) + H_2(s)$ | $h(t) = h_1(t) + h_2(t)$ | Filter banks, multipath |
| Feedback | $H(s) = \frac{G(s)}{1 + G(s)H(s)}$ | Complex, requires Laplace methods | Control systems, oscillators |

## Summary

This chapter has explored the fundamental properties that characterize systems and enable their analysis through systematic mathematical frameworks. Linear systems satisfy the superposition principle, enabling powerful analytical techniques based on impulse response characterization and frequency domain methods. Time-invariant systems maintain constant parameters, allowing the use of convolution and transform methods that simplify analysis and design. Causal systems respond only to present and past inputs, reflecting the constraints of real-time physical implementation, while stable systems ensure bounded outputs for bounded inputs, a prerequisite for practical operation.

The distinction between memory and memoryless systems determines whether past input values affect current outputs, with memory systems enabling filtering and temporal pattern recognition. Invertible systems allow input recovery from outputs, essential for communication and control applications. System responses including impulse response, step response, frequency response, and transfer function provide complementary views of system behavior, each highlighting different aspects crucial for design and analysis.

System interconnections through series, parallel, and feedback configurations enable construction of complex systems from simpler building blocks, with composition rules that preserve linearity and time-invariance. Understanding these fundamental properties and analysis techniques prepares students for advanced topics in filtering, control, and signal processing where these concepts apply to diverse practical applications from communication systems to biomedical instrumentation.
