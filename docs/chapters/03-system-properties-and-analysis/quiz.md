# Quiz: System Properties and Analysis

Test your understanding of fundamental system properties and analysis techniques.

---

#### 1. What mathematical condition defines a linear system?

<div class="upper-alpha" markdown>
1. $\mathcal{T}[ax_1(t) + bx_2(t)] = a\mathcal{T}[x_1(t)] + b\mathcal{T}[x_2(t)]$ for any inputs and constants
2. $\mathcal{T}[x(t - t_0)] = y(t - t_0)$ for all time shifts
3. $y(t_0)$ depends only on $x(t)$ for $t \leq t_0$
4. $|x(t)| < M_x$ implies $|y(t)| < M_y$
</div>

??? question "Show Answer"
    The correct answer is **A**. A system is linear if it satisfies the superposition principle: $\mathcal{T}[ax_1(t) + bx_2(t)] = a\mathcal{T}[x_1(t)] + b\mathcal{T}[x_2(t)]$ for any inputs $x_1(t)$ and $x_2(t)$ and any constants $a$ and $b$. This encompasses both additivity and homogeneity properties. Option B describes time-invariance, option C describes causality, and option D describes BIBO stability.

    **Concept Tested:** Linear Systems

    **See:** [Linear Systems](index.md#linear-systems)

---

#### 2. For a time-invariant system, if $y(t) = \mathcal{T}[x(t)]$, what must be true?

<div class="upper-alpha" markdown>
1. The system parameters change linearly with time
2. The system response depends on when the input is applied
3. $\mathcal{T}[x(t - t_0)] = y(t - t_0)$ for all signals and time shifts
4. The system has no memory of past inputs
</div>

??? question "Show Answer"
    The correct answer is **C**. A time-invariant system satisfies $\mathcal{T}[x(t - t_0)] = y(t - t_0)$ for all signals $x(t)$ and all time shifts $t_0$. This means a time shift in the input produces an equivalent time shift in the output with no change in the waveform. Time-invariant systems have constant parameters that do not change over time, ensuring consistent behavior regardless of when an input is applied.

    **Concept Tested:** Time-Invariant Systems

    **See:** [Time-Invariant Systems](index.md#time-invariant-systems)

---

#### 3. What is the BIBO stability condition for an LTI system in terms of its impulse response $h(t)$?

<div class="upper-alpha" markdown>
1. $h(t) = 0$ for $t < 0$
2. $h(t)$ must be a finite-duration signal
3. $\int_{-\infty}^{\infty} |h(t)| dt < \infty$
4. $h(t)$ must be a periodic function
</div>

??? question "Show Answer"
    The correct answer is **C**. For LTI systems, BIBO stability requires that the impulse response be absolutely integrable: $\int_{-\infty}^{\infty} |h(t)| dt < \infty$. This ensures that every bounded input produces a bounded output. Option A describes causality (not stability), option B is too restrictive (stable systems can have infinite-duration impulse responses if they decay sufficiently), and option D is incorrect as impulse responses are generally not periodic.

    **Concept Tested:** Stability, Impulse Response

    **See:** [Stability](index.md#stability)

---

#### 4. Which of the following best describes a causal system?

<div class="upper-alpha" markdown>
1. A system whose impulse response $h(t) = 0$ for $t < 0$
2. A system that can predict future input values
3. A system with zero phase shift at all frequencies
4. A system that produces outputs before inputs are applied
</div>

??? question "Show Answer"
    The correct answer is **A**. A causal system has an impulse response that satisfies $h(t) = 0$ for $t < 0$, meaning the output at any time depends only on present and past input values, never on future inputs. All physical systems that operate in real-time must be causal, as they cannot respond to inputs that have not yet occurred.

    **Concept Tested:** Causality, Impulse Response

    **See:** [Causality](index.md#causality)

---

#### 5. What is the relationship between the step response $s(t)$ and the impulse response $h(t)$ for an LTI system?

<div class="upper-alpha" markdown>
1. $s(t) = \frac{d}{dt}h(t)$
2. $s(t) = \int_{-\infty}^{t} h(\tau) d\tau$
3. $s(t) = h(t) * u(t)$, which is the same as option B
4. Both B and C are correct
</div>

??? question "Show Answer"
    The correct answer is **D**. The step response is the integral of the impulse response: $s(t) = \int_{-\infty}^{t} h(\tau) d\tau$. This can also be expressed as the convolution of the impulse response with the unit step: $s(t) = h(t) * u(t)$. Both formulations are equivalent and correct. The step response reveals important characteristics including rise time, settling time, overshoot, and steady-state error.

    **Concept Tested:** Step Response, Impulse Response

    **See:** [Step Response](index.md#step-response)

---

#### 6. How is the frequency response $H(f)$ of an LTI system related to its impulse response $h(t)$?

<div class="upper-alpha" markdown>
1. $H(f)$ is the Laplace transform of $h(t)$
2. $H(f)$ is the derivative of $h(t)$
3. $H(f)$ is the Fourier transform of $h(t)$: $H(f) = \int_{-\infty}^{\infty} h(t)e^{-j2\pi ft} dt$
4. $H(f)$ is the time-reversed version of $h(t)$
</div>

??? question "Show Answer"
    The correct answer is **C**. The frequency response is the Fourier transform of the impulse response: $H(f) = \int_{-\infty}^{\infty} h(t)e^{-j2\pi ft} dt$. The magnitude $|H(f)|$ shows how the system amplifies or attenuates different frequencies, while the phase $\angle H(f)$ shows how the system delays sinusoidal components. Note that option A describes the transfer function $H(s)$, which is the Laplace transform.

    **Concept Tested:** Frequency Response, Impulse Response

    **See:** [Frequency Response](index.md#frequency-response)

---

#### 7. What is the impulse response of a memoryless system?

<div class="upper-alpha" markdown>
1. $h(t) = K\delta(t)$ where $K$ is a constant gain
2. $h(t) = u(t)$ (unit step function)
3. $h(t) = e^{-at}u(t)$ (exponential decay)
4. $h(t)$ extends over infinite time
</div>

??? question "Show Answer"
    The correct answer is **A**. A memoryless system produces outputs that depend only on the current input value, with no dependence on past or future inputs. The impulse response is $h(t) = K\delta(t)$ where $K$ is a constant gain. Options B and C describe systems with memory, as their impulse responses extend over time beyond $t = 0$.

    **Concept Tested:** Memoryless Systems, Impulse Response

    **See:** [Memoryless Systems](index.md#memoryless-systems)

---

#### 8. Given two LTI systems connected in series (cascade) with transfer functions $H_1(s)$ and $H_2(s)$, what is the overall transfer function?

<div class="upper-alpha" markdown>
1. $H_{total}(s) = H_1(s) + H_2(s)$
2. $H_{total}(s) = H_1(s) \cdot H_2(s)$
3. $H_{total}(s) = \frac{H_1(s)}{1 + H_1(s)H_2(s)}$
4. $H_{total}(s) = H_1(s) - H_2(s)$
</div>

??? question "Show Answer"
    The correct answer is **B**. For LTI systems in cascade (series), the overall transfer function is the product of individual transfer functions: $H_{total}(s) = H_1(s) \cdot H_2(s)$. In the time domain, this corresponds to the convolution of impulse responses. Option A describes parallel systems, and option C describes a feedback configuration.

    **Concept Tested:** System Interconnections, Transfer Function

    **See:** [System Interconnections](index.md#system-interconnections)

---

#### 9. For a negative feedback system with forward path $G(s)$ and feedback path $H(s)$, what is the closed-loop transfer function?

<div class="upper-alpha" markdown>
1. $T(s) = G(s) + H(s)$
2. $T(s) = G(s) \cdot H(s)$
3. $T(s) = \frac{G(s)}{1 - G(s)H(s)}$
4. $T(s) = \frac{G(s)}{1 + G(s)H(s)}$
</div>

??? question "Show Answer"
    The correct answer is **D**. The closed-loop transfer function for a negative feedback system is $T(s) = \frac{G(s)}{1 + G(s)H(s)}$. The denominator $1 + G(s)H(s)$ is called the characteristic equation, and its roots (poles of the closed-loop system) determine stability. Negative feedback provides stability, disturbance rejection, and reduced sensitivity to parameter variations.

    **Concept Tested:** Feedback Systems, Transfer Function

    **See:** [Feedback Systems](index.md#feedback-systems)

---

#### 10. An LTI system has impulse response $h(t) = e^{at}u(t)$ where $a > 0$. What can you conclude about this system's stability?

<div class="upper-alpha" markdown>
1. The system is stable because it has an exponential impulse response
2. The system is stable because the impulse response is causal
3. The system is unstable because $\int_{-\infty}^{\infty} |h(t)| dt = \int_{0}^{\infty} e^{at} dt$ diverges when $a > 0$
4. Stability cannot be determined without knowing the input signal
</div>

??? question "Show Answer"
    The correct answer is **C**. The system is unstable because with $a > 0$, the integral $\int_{-\infty}^{\infty} |h(t)| dt = \int_{0}^{\infty} e^{at} dt$ diverges (approaches infinity). The BIBO stability condition for LTI systems requires the impulse response to be absolutely integrable. A growing exponential violates this condition, meaning bounded inputs can produce unbounded outputs. Note that causality (option B) does not guarantee stability.

    **Concept Tested:** Stability, Impulse Response

    **See:** [Stability](index.md#stability), [Impulse Response](index.md#impulse-response)

---
