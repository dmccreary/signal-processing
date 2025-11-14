# Quiz: Convolution and Correlation

Test your understanding of convolution and correlation operations in signal processing.

---

#### 1. What is the continuous-time convolution integral formula?

<div class="upper-alpha" markdown>
1. $y(t) = \int_{-\infty}^{\infty} x(\tau)h(t+\tau) d\tau$
2. $y(t) = \int_{-\infty}^{\infty} x(\tau)h(t-\tau) d\tau$
3. $y(t) = \int_{-\infty}^{\infty} x(t)h(\tau) d\tau$
4. $y(t) = \int_{-\infty}^{\infty} x(\tau)h(\tau) d\tau$
</div>

??? question "Show Answer"
    The correct answer is **B**. The convolution integral is defined as $y(t) = \int_{-\infty}^{\infty} x(\tau)h(t-\tau) d\tau$, which can also be written as $y(t) = x(t) * h(t)$. This operation computes the overlap between one signal and a time-reversed, shifted version of the other signal. For LTI systems, $x(t)$ is the input signal, $h(t)$ is the impulse response, and $y(t)$ is the output.

    **Concept Tested:** Convolution

    **See:** [Convolution](index.md#convolution)

---

#### 2. What is the discrete convolution formula?

<div class="upper-alpha" markdown>
1. $y[n] = \sum_{k=-\infty}^{\infty} x[k]h[k-n]$
2. $y[n] = \sum_{k=-\infty}^{\infty} x[n]h[k]$
3. $y[n] = \sum_{k=-\infty}^{\infty} x[k]h[n-k]$
4. $y[n] = \prod_{k=-\infty}^{\infty} x[k]h[n-k]$
</div>

??? question "Show Answer"
    The correct answer is **C**. Discrete convolution is defined as $y[n] = \sum_{k=-\infty}^{\infty} x[k]h[n-k]$, which is the discrete-time equivalent of the continuous convolution integral. This formula expresses the output of a discrete-time LTI system as a weighted sum of present and past input samples, and appears frequently in FIR filter implementations.

    **Concept Tested:** Discrete Convolution

    **See:** [Discrete Convolution](index.md#discrete-convolution)

---

#### 3. What is the key difference between circular convolution and linear convolution?

<div class="upper-alpha" markdown>
1. Circular convolution uses multiplication instead of summation
2. Circular convolution treats signals as periodic with period $N$, wrapping indices modulo $N$
3. Circular convolution is faster but less accurate than linear convolution
4. Circular convolution can only be used for real-valued signals
</div>

??? question "Show Answer"
    The correct answer is **B**. Circular convolution treats signals as periodic with period $N$, so samples "wrap around" from the end back to the beginning using modulo arithmetic: $y[n] = \sum_{k=0}^{N-1} x[k]h[(n-k) \bmod N]$. This operation arises naturally when computing convolution using the DFT, which implicitly assumes periodic signals. To obtain linear convolution results using the DFT, signals must be zero-padded to length at least $N_1 + N_2 - 1$.

    **Concept Tested:** Circular Convolution

    **See:** [Circular Convolution](index.md#circular-convolution)

---

#### 4. According to the convolution theorem, what does convolution in the time domain correspond to in the frequency domain?

<div class="upper-alpha" markdown>
1. Addition: $\mathcal{F}\{x(t) * h(t)\} = X(f) + H(f)$
2. Convolution: $\mathcal{F}\{x(t) * h(t)\} = X(f) * H(f)$
3. Division: $\mathcal{F}\{x(t) * h(t)\} = X(f) / H(f)$
4. Multiplication: $\mathcal{F}\{x(t) * h(t)\} = X(f) \cdot H(f)$
</div>

??? question "Show Answer"
    The correct answer is **D**. The convolution theorem states that convolution in the time domain corresponds to multiplication in the frequency domain: $\mathcal{F}\{x(t) * h(t)\} = X(f) \cdot H(f)$. This fundamental relationship enables efficient filtering by multiplying in the frequency domain and transforming back, often more efficient than direct time-domain convolution for large filters.

    **Concept Tested:** Convolution Theorem

    **See:** [Convolution Theorem](index.md#convolution-theorem)

---

#### 5. How does correlation differ from convolution in its basic operation?

<div class="upper-alpha" markdown>
1. Correlation uses addition while convolution uses multiplication
2. Correlation slides $y(t)$ without time reversal; convolution uses $h(t-\tau)$ reversed
3. Correlation is only defined for discrete-time signals
4. Correlation produces complex-valued outputs while convolution produces real outputs
</div>

??? question "Show Answer"
    The correct answer is **B**. The key difference is that correlation slides $y(t)$ without time reversal (using $y(t-τ)$), whereas convolution uses the time-reversed function $h(t-τ)$. The relationship between them is $R_{xy}(τ) = x(τ) * y(-τ)$, showing that correlation can be computed as convolution with one signal time-reversed.

    **Concept Tested:** Correlation, Convolution

    **See:** [Correlation](index.md#correlation)

---

#### 6. What is a key property of the autocorrelation function $R_{xx}(τ)$?

<div class="upper-alpha" markdown>
1. It is always zero at zero lag
2. It achieves its minimum value at zero lag
3. It is symmetric about zero lag: $R_{xx}(τ) = R_{xx}(-τ)$
4. It is only defined for periodic signals
</div>

??? question "Show Answer"
    The correct answer is **C**. The autocorrelation function is always symmetric about zero lag: $R_{xx}(τ) = R_{xx}(-τ)$. Additionally, it achieves its maximum value at zero lag: $R_{xx}(0) \geq |R_{xx}(τ)|$ for all $τ$. Autocorrelation reveals the internal structure of a signal, particularly periodic components and self-similarity across different time scales.

    **Concept Tested:** Autocorrelation

    **See:** [Autocorrelation](index.md#autocorrelation)

---

#### 7. What range of values can the normalized correlation coefficient $\rho_{xy}$ take?

<div class="upper-alpha" markdown>
1. $[0, \infty)$
2. $[-1, 1]$
3. $[0, 1]$
4. $(-\infty, \infty)$
</div>

??? question "Show Answer"
    The correct answer is **B**. The correlation coefficient is normalized to the range $[-1, 1]$. A value of $\rho_{xy} = 1$ indicates perfect positive correlation (signals are identical up to scaling), $\rho_{xy} = -1$ indicates perfect negative correlation (one signal is the negative of the other), and $\rho_{xy} = 0$ indicates no linear relationship (signals are orthogonal or uncorrelated).

    **Concept Tested:** Correlation Coefficient

    **See:** [Correlation Coefficient](index.md#correlation-coefficient)

---

#### 8. What is the impulse response of a matched filter designed to detect signal $s(t)$ in noise?

<div class="upper-alpha" markdown>
1. $h(t) = s(t)$
2. $h(t) = s^*(T - t)$ (time-reversed complex conjugate)
3. $h(t) = s(T + t)$
4. $h(t) = |s(t)|$
</div>

??? question "Show Answer"
    The correct answer is **B**. The matched filter has impulse response $h(t) = s^*(T - t)$, which is the time-reversed complex conjugate of the signal to be detected, where $T$ is the time at which SNR is maximized. The matched filter is optimal for detecting a known signal in additive white noise, maximizing the signal-to-noise ratio. It essentially performs correlation between the received signal and the known template.

    **Concept Tested:** Matched Filter

    **See:** [Matched Filter](index.md#matched-filter)

---

#### 9. If you convolve two finite-length discrete sequences of lengths $N_1 = 10$ and $N_2 = 15$, what is the length of the linear convolution output?

<div class="upper-alpha" markdown>
1. $10$ samples
2. $15$ samples
3. $24$ samples
4. $25$ samples
</div>

??? question "Show Answer"
    The correct answer is **C**. The length of the linear convolution output is $N_1 + N_2 - 1 = 10 + 15 - 1 = 24$ samples. This is important when using the DFT for fast convolution: to avoid circular convolution artifacts, signals must be zero-padded to at least this length before applying the DFT-multiply-IDFT procedure.

    **Concept Tested:** Discrete Convolution, Linear Convolution

    **See:** [Discrete Convolution](index.md#discrete-convolution), [Circular Convolution](index.md#circular-convolution)

---

#### 10. What optimization criterion does the Wiener filter minimize?

<div class="upper-alpha" markdown>
1. Maximum absolute error
2. Total signal energy
3. Mean square error between filter output and desired signal
4. Maximum signal-to-noise ratio at a specific time instant
</div>

??? question "Show Answer"
    The correct answer is **C**. The Wiener filter is the optimal linear filter for estimating a desired signal from a noisy observation by minimizing the mean square error between the filter output and the desired signal. The frequency response is $H(f) = S_{ds}(f)/S_{xx}(f)$, balancing noise suppression against signal distortion. Note that option D describes the matched filter, not the Wiener filter.

    **Concept Tested:** Wiener Filter

    **See:** [Wiener Filter](index.md#wiener-filter)

---
