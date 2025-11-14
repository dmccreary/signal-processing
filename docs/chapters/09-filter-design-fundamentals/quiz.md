# Quiz: Filter Design Fundamentals

Test your understanding of filter types, FIR and IIR filters, filter order, and stability analysis.

---

#### 1. What is the primary function of a digital filter?

<div class="upper-alpha" markdown>
1. To increase the sampling rate of a signal
2. To selectively pass certain frequency components while attenuating others
3. To convert analog signals to digital signals
4. To amplify all frequency components equally
</div>

??? question "Show Answer"
    The correct answer is **B**. A filter is a system that selectively passes certain frequency components of an input signal while attenuating or blocking others. Filters are characterized by their frequency response $H(f)$ or impulse response $h[n]$ and serve purposes including noise reduction, signal separation, anti-aliasing, reconstruction, and equalization by discriminating between different frequency components.

    **Concept Tested:** Filters

    **See:** [Filters and Their Role in Signal Processing](index.md#filters-and-their-role-in-signal-processing)

---

#### 2. Which type of filter passes frequencies below a cutoff frequency while attenuating higher frequencies?

<div class="upper-alpha" markdown>
1. High-pass filter
2. Band-pass filter
3. Low-pass filter
4. Band-stop filter
</div>

??? question "Show Answer"
    The correct answer is **C**. Low-pass filters (LPF) pass frequencies below a cutoff frequency $f_c$ while attenuating higher frequencies. The cutoff is typically defined at the -3 dB point where magnitude equals $1/\sqrt{2} \approx 0.707$ of passband magnitude. Common applications include audio noise reduction, anti-aliasing before A/D conversion, and smoothing control signals.

    **Concept Tested:** Low-Pass Filters

    **See:** [Low-Pass Filters](index.md#low-pass-filters)

---

#### 3. What distinguishes a notch filter from a general band-stop filter?

<div class="upper-alpha" markdown>
1. Notch filters pass all frequencies while band-stop filters block all frequencies
2. Notch filters are extremely narrow band-stop filters designed to eliminate a single frequency
3. Notch filters only work with digital signals
4. Notch filters have linear phase while band-stop filters do not
</div>

??? question "Show Answer"
    The correct answer is **B**. Notch filters are extremely narrow band-stop filters designed to eliminate a single frequency component with minimal impact on adjacent frequencies. They typically have very high Q factors (Q > 10) and are used to remove specific interference like 50/60 Hz power line hum or pilot tones while preserving nearby signal content.

    **Concept Tested:** Notch Filters, Band-Stop Filters

    **See:** [Specialized Filter Types](index.md#specialized-filter-types)

---

#### 4. What is the key structural difference between FIR and IIR filters?

<div class="upper-alpha" markdown>
1. FIR filters use only feedforward paths (no feedback), while IIR filters use feedback from previous outputs
2. FIR filters can only be implemented in hardware while IIR filters require software
3. FIR filters always have higher order than IIR filters
4. FIR filters work only with real signals while IIR filters work with complex signals
</div>

??? question "Show Answer"
    The correct answer is **A**. FIR filters have impulse responses of finite duration and use only feedforward paths: $y[n] = \sum_{k=0}^{M} b_k x[n-k]$ (non-recursive). IIR filters have impulse responses of infinite duration and use feedback: $y[n] = \sum_{k=0}^{M} b_k x[n-k] - \sum_{k=1}^{N} a_k y[n-k]$ (recursive). This fundamental structural difference leads to distinct advantages and tradeoffs for each filter type.

    **Concept Tested:** FIR Filters, IIR Filters

    **See:** [FIR vs. IIR Filter Structures](index.md#fir-vs-iir-filter-structures)

---

#### 5. Which filter type is inherently stable regardless of coefficient values?

<div class="upper-alpha" markdown>
1. All-pass filters
2. IIR filters
3. FIR filters
4. Comb filters
</div>

??? question "Show Answer"
    The correct answer is **C**. FIR filters are inherently stable regardless of coefficient values because they have no feedback, ensuring bounded outputs for bounded inputs. For any FIR filter with finite-length impulse response, the impulse response is absolutely summable, automatically satisfying the BIBO stability condition. IIR filters require careful pole placement inside the unit circle to ensure stability.

    **Concept Tested:** FIR Filters, Filter Stability

    **See:** [Finite Impulse Response Filters](index.md#finite-impulse-response-filters)

---

#### 6. What is a key advantage of IIR filters over FIR filters?

<div class="upper-alpha" markdown>
1. IIR filters always have linear phase
2. IIR filters achieve sharp frequency responses with lower order (fewer coefficients) than equivalent FIR
3. IIR filters are always more stable than FIR filters
4. IIR filters require less memory than FIR filters in all cases
</div>

??? question "Show Answer"
    The correct answer is **B**. IIR filters achieve sharp frequency responses with lower order than equivalent FIR filters due to their recursive structure. This computational efficiency (fewer coefficients means fewer multiplications) makes IIR filters attractive when sharp transitions are needed with minimal resources or when emulating classical analog filter characteristics. However, this comes at the cost of potential stability issues and generally nonlinear phase.

    **Concept Tested:** IIR Filters

    **See:** [Infinite Impulse Response Filters](index.md#infinite-impulse-response-filters)

---

#### 7. What does the filter order fundamentally determine?

<div class="upper-alpha" markdown>
1. The sampling rate required for the filter
2. The filter's capabilities including transition sharpness, stopband attenuation, and passband ripple
3. Whether the filter is high-pass or low-pass
4. The number of output samples produced
</div>

??? question "Show Answer"
    The correct answer is **B**. The filter order fundamentally determines a filter's capabilities and limitations. Higher order enables sharper transitions, greater stopband attenuation, and tighter passband ripple tolerance. For FIR filters, order equals length minus one ($M = \text{Length} - 1$). For IIR filters, order equals the maximum of numerator and denominator polynomial degrees. Required order depends on frequency specifications including transition bandwidth, passband ripple, and stopband attenuation.

    **Concept Tested:** Filter Order

    **See:** [Filter Order and Coefficient Specification](index.md#filter-order-and-coefficient-specification)

---

#### 8. What is the BIBO stability criterion for discrete-time systems?

<div class="upper-alpha" markdown>
1. The sum of all filter coefficients must equal one
2. The impulse response must be absolutely summable: $\sum_{n=-\infty}^{\infty} |h[n]| < \infty$
3. All zeros must lie inside the unit circle
4. The frequency response must be real-valued
</div>

??? question "Show Answer"
    The correct answer is **B**. A system is bounded-input bounded-output (BIBO) stable if every bounded input produces a bounded output. For discrete-time systems, the BIBO stability condition requires the impulse response to be absolutely summable: $\sum_{n=-\infty}^{\infty} |h[n]| < \infty$. FIR filters automatically satisfy this since they have finite-length impulse responses. IIR filters require verification through pole location analysis.

    **Concept Tested:** Filter Stability

    **See:** [BIBO Stability Criterion](index.md#bibo-stability-criterion)

---

#### 9. How do pole locations in the z-plane relate to IIR filter stability?

<div class="upper-alpha" markdown>
1. Poles must lie on the unit circle for stability
2. Poles must lie outside the unit circle for stability
3. Poles must lie strictly inside the unit circle ($|p_i| < 1$) for stability
4. Pole locations do not affect stability
</div>

??? question "Show Answer"
    The correct answer is **C**. For IIR filters, stability requires all poles to lie strictly inside the unit circle ($|p_i| < 1$ for all poles $p_i$). Each pole contributes a term proportional to $p_i^n$ to the impulse response; if $|p_i| < 1$, this decays exponentially. If $|p_i| \geq 1$, the term grows or remains constant, violating absolute summability and causing instability. Even a single pole outside the unit circle causes unbounded output growth.

    **Concept Tested:** Filter Stability

    **See:** [Pole Location and Stability](index.md#pole-location-and-stability)

---

#### 10. What does a comb filter's frequency response resemble?

<div class="upper-alpha" markdown>
1. A single narrow notch at one frequency
2. Multiple evenly-spaced passbands and stopbands resembling comb teeth
3. A smooth monotonic rolloff
4. Random variations across frequency
</div>

??? question "Show Answer"
    The correct answer is **B**. Comb filters have periodic frequency responses with multiple evenly-spaced passbands and stopbands, resembling the teeth of a comb. The transfer function $H(z) = 1 \pm z^{-N}$ creates notches or peaks at multiples of the sampling frequency divided by N. Applications include acoustic echo cancellation, video signal processing for separating luminance and chrominance, and audio effects like flanging and phasing.

    **Concept Tested:** Comb Filters

    **See:** [Specialized Filter Types](index.md#specialized-filter-types)

---
