# Quiz: Sampling and Quantization

Test your understanding of sampling theory, the Nyquist criterion, aliasing, and quantization.

---

#### 1. What does the sampling theorem (Nyquist-Shannon theorem) state?

<div class="upper-alpha" markdown>
1. A bandlimited signal with highest frequency $f_{max}$ can be perfectly reconstructed if sampled at rate $f_s > 2f_{max}$
2. Any signal can be perfectly reconstructed from samples taken at any sampling rate
3. The sampling rate must be exactly equal to the signal frequency
4. Sampling introduces no distortion regardless of sampling rate
</div>

??? question "Show Answer"
    The correct answer is **A**. The sampling theorem states that a bandlimited continuous-time signal with highest frequency component $f_{max}$ can be perfectly reconstructed from its samples if sampled at rate $f_s > 2f_{max}$. Perfect reconstruction requires an ideal low-pass filter (sinc interpolation). This fundamental theorem establishes the minimum sampling rate needed to avoid information loss.

    **Concept Tested:** Sampling Theorem

    **See:** [Sampling Theorem](index.md#sampling-theorem)

---

#### 2. What is the Nyquist rate for a signal with maximum frequency of 10 kHz?

<div class="upper-alpha" markdown>
1. 5 kHz
2. 10 kHz
3. 20 kHz
4. 40 kHz
</div>

??? question "Show Answer"
    The correct answer is **C**. The Nyquist rate $f_N = 2f_{max} = 2 \times 10 \text{ kHz} = 20 \text{ kHz}$. This represents the minimum sampling rate required to avoid aliasing for a signal with maximum frequency $f_{max}$. Practical systems typically sample somewhat higher than this theoretical minimum to accommodate non-ideal filters.

    **Concept Tested:** Nyquist Rate

    **See:** [Nyquist Rate](index.md#nyquist-rate)

---

#### 3. If the sampling rate is $f_s = 8$ kHz, what is the Nyquist frequency?

<div class="upper-alpha" markdown>
1. 16 kHz
2. 8 kHz
3. 4 kHz
4. 2 kHz
</div>

??? question "Show Answer"
    The correct answer is **C**. The Nyquist frequency $f_{Nyq} = f_s/2 = 8 \text{ kHz}/2 = 4 \text{ kHz}$. This represents the highest frequency that can be unambiguously represented at the given sampling rate. Frequencies above the Nyquist frequency will alias into the range below $f_{Nyq}$.

    **Concept Tested:** Nyquist Frequency

    **See:** [Nyquist Frequency](index.md#nyquist-frequency)

---

#### 4. What is aliasing?

<div class="upper-alpha" markdown>
1. A method for improving signal quality
2. Signal frequency components above the Nyquist frequency appearing as false lower frequencies in the sampled signal
3. The process of converting analog signals to digital
4. A type of quantization error
</div>

??? question "Show Answer"
    The correct answer is **B**. Aliasing occurs when signal frequency components above the Nyquist frequency appear as false lower frequencies in the sampled signal, creating distortion that cannot be removed after sampling. A sinusoid at frequency $f = f_s + \Delta f$ is indistinguishable from a sinusoid at $\Delta f$ when sampled at rate $f_s$, as both produce identical sample sequences.

    **Concept Tested:** Aliasing

    **See:** [Aliasing](index.md#aliasing)

---

#### 5. What is the purpose of an anti-aliasing filter?

<div class="upper-alpha" markdown>
1. To increase the sampling rate
2. To remove frequency components above the Nyquist frequency before sampling
3. To reduce quantization noise after sampling
4. To reconstruct the continuous signal from samples
</div>

??? question "Show Answer"
    The correct answer is **B**. An anti-aliasing filter is a low-pass filter applied before sampling to remove frequency components above the Nyquist frequency, preventing aliasing distortion. The ideal anti-aliasing filter would have unity gain for $f < f_{Nyq}$ and zero gain for $f > f_{Nyq}$, though practical filters approximate this with finite roll-off.

    **Concept Tested:** Anti-Aliasing Filter

    **See:** [Anti-Aliasing Filter](index.md#anti-aliasing-filter)

---

#### 6. What is a key advantage of oversampling?

<div class="upper-alpha" markdown>
1. It reduces the amount of data to be processed
2. It relaxes anti-aliasing filter requirements, allowing simpler analog filters
3. It increases aliasing effects
4. It reduces the Nyquist frequency
</div>

??? question "Show Answer"
    The correct answer is **B**. Oversampling employs sampling rates significantly higher than the minimum Nyquist rate, which relaxes anti-aliasing filter requirements by allowing simpler, lower-order analog filters with wider transition bands. Additionally, oversampling spreads quantization noise over a wider frequency range, enabling noise-shaping techniques. Typical oversampling ratios range from 2× to 64× or higher.

    **Concept Tested:** Oversampling

    **See:** [Oversampling](index.md#oversampling)

---

#### 7. For b-bit uniform quantization, what is the quantization step size $\Delta$ for a signal amplitude range $V$?

<div class="upper-alpha" markdown>
1. $\Delta = V/b$
2. $\Delta = V/2^b$
3. $\Delta = 2^b/V$
4. $\Delta = bV$
</div>

??? question "Show Answer"
    The correct answer is **B**. For uniform quantization with $b$ bits and amplitude range $V$, there are $2^b$ equally spaced levels with step size $\Delta = V/2^b$. This determines the granularity of amplitude representation, with smaller steps (more bits) providing finer resolution and lower quantization error.

    **Concept Tested:** Quantization, Uniform Quantization

    **See:** [Quantization](index.md#quantization)

---

#### 8. What is the maximum quantization error for midpoint uniform quantization with step size $\Delta$?

<div class="upper-alpha" markdown>
1. $\Delta$
2. $\Delta/4$
3. $2\Delta$
4. $\Delta/2$
</div>

??? question "Show Answer"
    The correct answer is **D**. The quantization error is bounded by half the quantization step: $|e[n]| \leq \Delta/2$ for midpoint quantization, where $e[n] = x_q[n] - x[n]$ is the difference between the quantized value and the true value. This maximum error occurs when the true value falls exactly between quantization levels.

    **Concept Tested:** Quantization Error

    **See:** [Quantization Error](index.md#quantization-error)

---

#### 9. Approximately how much does the signal-to-quantization-noise ratio (SQNR) improve for each additional bit in uniform quantization?

<div class="upper-alpha" markdown>
1. 1 dB per bit
2. 3 dB per bit
3. 6 dB per bit
4. 12 dB per bit
</div>

??? question "Show Answer"
    The correct answer is **C**. The SQNR for $b$-bit quantization is approximately $6.02b + 1.76$ dB, yielding about 6 dB improvement per additional bit. This relationship guides bit depth selection based on required dynamic range: each bit doubles the number of quantization levels and roughly doubles the SNR in linear terms (approximately 6 dB).

    **Concept Tested:** Quantization Error, Quantization Noise

    **See:** [Quantization Error](index.md#quantization-error)

---

#### 10. What is the primary advantage of non-uniform quantization over uniform quantization?

<div class="upper-alpha" markdown>
1. It is simpler to implement
2. It optimizes quantization error distribution to match signal statistics, providing better SNR for signals with probability densities concentrated near zero
3. It always uses fewer bits than uniform quantization
4. It completely eliminates quantization noise
</div>

??? question "Show Answer"
    The correct answer is **B**. Non-uniform quantization employs smaller steps for small signal amplitudes and larger steps for large amplitudes, optimizing quantization error distribution to match signal statistics. For signals with probability densities concentrated near zero (such as speech), non-uniform quantization provides better SNR than uniform quantization for the same number of levels. Common implementations include μ-law and A-law companding for telephone speech.

    **Concept Tested:** Non-Uniform Quantization

    **See:** [Non-Uniform Quantization](index.md#non-uniform-quantization)

---
