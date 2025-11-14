# Quiz: Adaptive Signal Processing

Test your understanding of adaptive filtering algorithms, LMS, RLS, Kalman filtering, and applications.

---

#### 1. What distinguishes adaptive filters from fixed filters?

<div class="upper-alpha" markdown>
1. Adaptive filters use only FIR structures while fixed filters use IIR
2. Adaptive filters automatically adjust their coefficients in response to changing signal characteristics
3. Adaptive filters require less computational power
4. Adaptive filters can only process audio signals
</div>

??? question "Show Answer"
    The correct answer is **B**. Unlike fixed filters with predetermined coefficients, adaptive filters possess the ability to automatically adjust their coefficients in response to changing signal characteristics and environment conditions. This self-tuning capability makes them indispensable for applications where signal properties are unknown, time-varying, or unpredictable, such as echo cancellation, adaptive equalization, and noise cancellation in dynamic environments.

    **Concept Tested:** Adaptive Filters

    **See:** [Adaptive Filter Fundamentals](index.md#adaptive-filter-fundamentals)

---

#### 2. What performance criterion do most adaptive algorithms seek to minimize?

<div class="upper-alpha" markdown>
1. Filter order
2. Mean-squared error (MSE) between desired and actual outputs
3. Sampling rate
4. Computational complexity
</div>

??? question "Show Answer"
    The correct answer is **B**. Most adaptive algorithms seek to minimize the mean-squared error (MSE): $J = E[e^2[n]] = E[(d[n] - w^Tx[n])^2]$ where $d[n]$ is the desired response, $w$ is the coefficient vector, and $x[n]$ is the input vector. This optimization framework connects adaptive filtering to fundamental concepts in estimation theory and stochastic optimization, creating a performance surface that algorithms navigate through iterative updates.

    **Concept Tested:** Adaptive Filters, Adaptive Algorithms

    **See:** [Basic Adaptive Filter Architecture](index.md#basic-adaptive-filter-architecture)

---

#### 3. What is the LMS (Least Mean Squares) algorithm's update equation?

<div class="upper-alpha" markdown>
1. $w[n+1] = w[n] + \mu x[n]$
2. $w[n+1] = w[n] - \mu e[n]x[n]$
3. $w[n+1] = w[n] + \mu e[n]x[n]$
4. $w[n+1] = w[n] + e[n]/x[n]$
</div>

??? question "Show Answer"
    The correct answer is **C**. The LMS algorithm update equation is $w[n+1] = w[n] + \mu e[n]x[n]$ where $\mu$ is the step-size parameter controlling convergence rate and stability, $e[n]$ is the error signal, and $x[n]$ is the input vector. This remarkably simple update uses an instantaneous gradient estimate rather than computing true statistical averages, requiring only M+1 multiplications per iteration for an M-tap filter.

    **Concept Tested:** Least Mean Squares

    **See:** [LMS Update Equation](index.md#lms-update-equation)

---

#### 4. What condition must the LMS step-size parameter $\mu$ satisfy for stability?

<div class="upper-alpha" markdown>
1. $\mu > 1$
2. $0 < \mu < 2/\lambda_{max}$ where $\lambda_{max}$ is maximum eigenvalue of input autocorrelation matrix
3. $\mu$ must equal 1
4. $\mu$ can be any positive value
</div>

??? question "Show Answer"
    The correct answer is **B**. LMS algorithm stability requires the step-size parameter to satisfy $0 < \mu < 2/\lambda_{max}$ where $\lambda_{max}$ is the maximum eigenvalue of the input autocorrelation matrix. A practical conservative bound uses $0 < \mu < 2/(M \cdot P_x)$ where $M$ is filter length and $P_x$ is input signal power. Larger step sizes accelerate convergence but risk instability, while smaller values ensure stability but slow convergence.

    **Concept Tested:** Least Mean Squares

    **See:** [Convergence and Stability Analysis](index.md#convergence-and-stability-analysis)

---

#### 5. What key advantage does Normalized LMS (NLMS) provide over standard LMS?

<div class="upper-alpha" markdown>
1. NLMS converges in fewer iterations regardless of input correlation
2. NLMS normalizes the update based on input signal power, providing robustness to power variations
3. NLMS eliminates all gradient noise
4. NLMS requires no step-size parameter
</div>

??? question "Show Answer"
    The correct answer is **B**. The NLMS algorithm normalizes the coefficient update based on input signal power: $w[n+1] = w[n] + \frac{\mu}{||x[n]||^2 + \epsilon}e[n]x[n]$. This automatic adjustment of effective step size based on input power provides more consistent convergence behavior, robustness to power variations, and typically 2-4 times faster convergence than LMS for correlated inputs. The stable convergence range becomes $0 < \mu < 2$, independent of input statistics.

    **Concept Tested:** Normalized LMS

    **See:** [NLMS Update Rule](index.md#nlms-update-rule)

---

#### 6. What is the main advantage of the RLS (Recursive Least Squares) algorithm over LMS?

<div class="upper-alpha" markdown>
1. RLS requires less memory than LMS
2. RLS achieves substantially faster convergence (approximately 2M iterations vs. 10M-100M for LMS)
3. RLS has lower computational complexity than LMS
4. RLS works only with real-valued signals while LMS works with complex signals
</div>

??? question "Show Answer"
    The correct answer is **B**. RLS achieves convergence in approximately 2M iterations (where M is filter length), independent of input correlation structure, compared to LMS which may require 10M to 100M iterations for highly correlated signals. This dramatic improvement comes from explicitly exploiting input signal correlation structure through recursive matrix updates, though at the cost of increased computational complexity ($O(M^2)$ vs. $O(M)$ for LMS) and memory requirements.

    **Concept Tested:** Recursive Least Squares

    **See:** [Convergence Properties](index.md#convergence-properties)

---

#### 7. What role does the forgetting factor $\lambda$ play in the RLS algorithm?

<div class="upper-alpha" markdown>
1. It determines the sampling rate
2. It exponentially weights recent errors more heavily than past errors, enabling tracking of time-varying systems
3. It eliminates the need for an error signal
4. It converts RLS to LMS
</div>

??? question "Show Answer"
    The correct answer is **B**. The RLS forgetting factor $\lambda$ (typically 0.95-0.999) exponentially weights recent errors more heavily than past errors in the cost function $J[n] = \sum_{i=0}^{n} \lambda^{n-i}e^2[i]$. Smaller $\lambda$ enables quicker adaptation to changes (faster tracking), while larger $\lambda$ reduces misadjustment in stationary environments. The effective memory depth is approximately $1/(1-\lambda)$ samples.

    **Concept Tested:** Recursive Least Squares

    **See:** [RLS Formulation](index.md#rls-formulation)

---

#### 8. What is the primary application of adaptive noise cancellation?

<div class="upper-alpha" markdown>
1. Increasing signal amplitude
2. Removing unwanted interference by subtracting an adaptively filtered version of a reference noise signal
3. Converting analog signals to digital
4. Changing the sampling rate of signals
</div>

??? question "Show Answer"
    The correct answer is **B**. Adaptive noise cancellation (ANC) removes unwanted interference from signals by subtracting an adaptively filtered version of a reference noise signal. The configuration exploits correlation between primary and reference inputs: as the adaptive filter converges, its output approximates the noise component, leaving primarily the desired signal in the error output. Applications include biomedical instrumentation, active noise control, and speech enhancement.

    **Concept Tested:** Adaptive Noise Cancellation

    **See:** [Adaptive Noise Cancellation](index.md#adaptive-noise-cancellation)

---

#### 9. What challenge does "double-talk" present in acoustic echo cancellation systems?

<div class="upper-alpha" markdown>
1. It increases the sampling rate beyond system capability
2. Simultaneous near-end and far-end speakers confuse the adaptation algorithm
3. It eliminates all echo completely
4. It requires switching from LMS to RLS algorithm
</div>

??? question "Show Answer"
    The correct answer is **B**. Double-talk occurs when both near-end and far-end speakers talk simultaneously, confusing the echo cancellation adaptation algorithm. The near-end speech appears as additional "error" that doesn't correlate with the far-end reference, causing the adaptive filter to diverge from the correct echo path model. Modern echo cancelers employ double-talk detection to freeze adaptation when both ends are speaking, preventing filter corruption.

    **Concept Tested:** Echo Cancellation

    **See:** [Acoustic Echo Cancellation](index.md#acoustic-echo-cancellation)

---

#### 10. How do adaptive equalizers operate in decision-directed mode?

<div class="upper-alpha" markdown>
1. They use the symbol detector output as the desired response after training completes
2. They only work during the training sequence
3. They require manual coefficient adjustment
4. They convert digital signals to analog
</div>

??? question "Show Answer"
    The correct answer is **A**. After initial training with a known sequence, adaptive equalizers switch to decision-directed mode where they use detected symbols (symbol detector output) as the desired response. The equalizer input is the received signal, and the "desired" response comes from the detector's symbol decisions. This enables continuous tracking of slowly time-varying channels without requiring repeated training sequences, essential for maintaining performance as channel conditions change.

    **Concept Tested:** Adaptive Equalization

    **See:** [Training and Decision-Directed Modes](index.md#training-and-decision-directed-modes)

---
