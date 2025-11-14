# Quiz: Time-Frequency Analysis and Advanced Topics

Test your understanding of spectrograms, Wigner-Ville distribution, ambiguity functions, and compressed sensing.

---

#### 1. Why is time-frequency analysis necessary for certain signals?

<div class="upper-alpha" markdown>
1. Standard Fourier analysis already provides complete time-frequency information
2. Many real-world signals have time-varying frequency content that standard Fourier analysis cannot localize temporally
3. Time-frequency analysis eliminates all noise
4. It is only needed for discrete-time signals
</div>

??? question "Show Answer"
    The correct answer is **B**. Many real-world signals (speech, music, radar chirps, biomedical signals) exhibit time-varying frequency content that cannot be adequately characterized by standard Fourier analysis, which assumes stationarity and provides no temporal localization of spectral components. Time-frequency analysis reveals how spectral content evolves over time, enabling analysis of transients, note onsets, formant transitions, and other non-stationary phenomena.

    **Concept Tested:** Time-Frequency Analysis

    **See:** [Time-Frequency Analysis Fundamentals](index.md#time-frequency-analysis-fundamentals)

---

#### 2. What fundamental limit constrains time-frequency analysis?

<div class="upper-alpha" markdown>
1. Sampling theorem
2. Heisenberg uncertainty principle: $\Delta t \cdot \Delta f \geq 1/(4\pi)$
3. Nyquist criterion
4. Shannon capacity theorem
</div>

??? question "Show Answer"
    The correct answer is **B**. The Heisenberg uncertainty principle establishes fundamental limits on simultaneous time-frequency resolution: $\Delta t \cdot \Delta f \geq 1/(4\pi)$. Improving time localization (decreasing $\Delta t$) necessarily degrades frequency resolution (increasing $\Delta f$) and vice versa. No time-frequency representation can achieve arbitrarily fine resolution in both domains simultaneously. Different methods manage this tradeoff through window selection, adaptive approaches, or alternative kernels.

    **Concept Tested:** Time-Frequency Analysis

    **See:** [Time-Frequency Resolution Tradeoffs](index.md#time-frequency-resolution-tradeoffs)

---

#### 3. What does a spectrogram display?

<div class="upper-alpha" markdown>
1. Only the phase information of a signal
2. Time on horizontal axis, frequency on vertical axis, with magnitude/power encoded as color
3. Pole-zero locations in the z-plane
4. The autocorrelation function
</div>

??? question "Show Answer"
    The correct answer is **B**. The spectrogram displays the magnitude squared of the STFT, $S(t,f) = |STFT(t,f)|^2$, as a time-frequency image with time on the horizontal axis, frequency on the vertical axis, and color or intensity representing magnitude or power. This visualization reveals harmonic structure (horizontal bands), transient events (vertical lines), chirps (diagonal patterns), and formant structure in speech, making it the most widely used time-frequency representation.

    **Concept Tested:** Spectrogram

    **See:** [Spectrogram Analysis and Interpretation](index.md#spectrogram-analysis-and-interpretation)

---

#### 4. How does window length selection affect spectrogram characteristics?

<div class="upper-alpha" markdown>
1. Window length has no effect on the spectrogram
2. Longer windows provide better frequency resolution but poorer time localization; shorter windows provide better time resolution but poorer frequency resolution
3. Longer windows always produce better results
4. Window length only affects computational speed
</div>

??? question "Show Answer"
    The correct answer is **B**. Window length critically affects the time-frequency tradeoff: longer windows provide better frequency resolution (more oscillation cycles) but poorer time localization (averaging over long intervals), while shorter windows improve time resolution (localized events) at the expense of frequency resolution (fewer cycles). Typical lengths range from 20-30 ms for speech (capturing phoneme characteristics) to 50-100 ms for music (resolving closely-spaced frequencies).

    **Concept Tested:** Spectrogram

    **See:** [Window Selection Impact](index.md#window-selection-impact)

---

#### 5. What advantage does the Wigner-Ville distribution (WVD) offer over the spectrogram?

<div class="upper-alpha" markdown>
1. WVD is faster to compute
2. WVD achieves superior time-frequency resolution, reaching the theoretical minimum uncertainty
3. WVD eliminates all cross-terms automatically
4. WVD only works with real-valued signals
</div>

??? question "Show Answer"
    The correct answer is **B**. The Wigner-Ville distribution achieves superior time-frequency resolution compared to spectrograms, reaching the theoretical minimum time-frequency uncertainty product. It provides real-valued outputs with correct marginals and excellent resolution properties. However, for multi-component signals, WVD suffers from cross-term interference creating oscillatory artifacts between components, which can obscure true signal structure and complicate interpretation.

    **Concept Tested:** Wigner-Ville Distribution

    **See:** [Wigner-Ville Distribution](index.md#wigner-ville-distribution)

---

#### 6. What is the main limitation of the Wigner-Ville distribution for multi-component signals?

<div class="upper-alpha" markdown>
1. It cannot compute transforms for multiple components
2. Cross-term interference creates oscillatory artifacts positioned between signal components
3. It requires too much computational power
4. It only works in the time domain
</div>

??? question "Show Answer"
    The correct answer is **B**. For multi-component signals $x(t) = x_1(t) + x_2(t)$, the WVD produces cross-terms: $W_x(t,f) = W_{x_1} + W_{x_2} + 2\text{Re}\{W_{x_1,x_2}\}$. The cross-term $W_{x_1,x_2}$ creates oscillatory interference patterns between signal components, often appearing as artifacts positioned midway between actual components. While single-component analysis benefits from WVD's high resolution, cross-terms can obscure multi-component signal structure.

    **Concept Tested:** Wigner-Ville Distribution

    **See:** [Cross-Term Interference](index.md#cross-term-interference)

---

#### 7. What does the ambiguity function characterize in radar systems?

<div class="upper-alpha" markdown>
1. The noise level in the received signal
2. The matched filter response when return signal is delayed (range) and Doppler shifted (velocity)
3. The antenna beam pattern
4. The transmitter power output
</div>

??? question "Show Answer"
    The correct answer is **B**. In radar systems, the ambiguity function $A_x(\tau, f_d)$ characterizes matched filter response when the return signal is delayed by time $\tau$ (corresponding to target range) and Doppler shifted by frequency $f_d$ (corresponding to target velocity). The ambiguity function reveals range resolution (width in delay), velocity resolution (width in Doppler), and sidelobe structure, guiding waveform design to achieve desired resolution properties for target detection and parameter estimation.

    **Concept Tested:** Ambiguity Function

    **See:** [Radar and Sonar Applications](index.md#radar-and-sonar-applications)

---

#### 8. What are the three fundamental requirements for compressed sensing?

<div class="upper-alpha" markdown>
1. High sampling rate, low noise, and linear phase
2. Sparsity (in some basis), incoherence (between measurement and sparsity bases), and optimization (via convex minimization)
3. Periodic signals, real coefficients, and fast algorithms
4. Gaussian distribution, white noise, and high SNR
</div>

??? question "Show Answer"
    The correct answer is **B**. Compressed sensing requires three fundamental conditions: (1) **Sparsity**: signal must be sparse or compressible in some representation (wavelet, DCT, etc.), (2) **Incoherence**: measurement basis must be incoherent with sparsity basis (random measurements often satisfy this), and (3) **Optimization**: reconstruction employs convex optimization (typically $\ell_1$ minimization) to exploit sparsity. When these hold, signals can be recovered from far fewer measurements than Nyquist sampling requires.

    **Concept Tested:** Compressed Sensing

    **See:** [Fundamental Principles](index.md#fundamental-principles)

---

#### 9. How many measurements does compressed sensing typically require for a k-sparse signal in dimension n?

<div class="upper-alpha" markdown>
1. Exactly n measurements (same as Nyquist)
2. Approximately $m \geq C k \log(n/k)$ measurements, dramatically fewer than n
3. Always n/2 measurements
4. An infinite number of measurements
</div>

??? question "Show Answer"
    The correct answer is **B**. Under appropriate conditions (restricted isometry property), compressed sensing enables perfect reconstruction with high probability when $m \geq C k \log(n/k)$ measurements for some constant C, where k is the sparsity level and n is the signal dimension. This is dramatically fewer samples than the $n$ required by Nyquist sampling, enabling applications in medical imaging (faster MRI), radar, wireless communications, and ADC design.

    **Concept Tested:** Compressed Sensing

    **See:** [Mathematical Framework](index.md#mathematical-framework)

---

#### 10. What major application has compressed sensing revolutionized in medical imaging?

<div class="upper-alpha" markdown>
1. X-ray imaging
2. MRI acceleration by acquiring fewer k-space samples while maintaining image quality
3. Ultrasound resolution
4. PET scan sensitivity
</div>

??? question "Show Answer"
    The correct answer is **B**. Compressed sensing has revolutionized MRI by enabling significant acceleration through acquiring fewer k-space samples while maintaining image quality. MR images are naturally sparse in wavelet or other transform domains, and k-space measurements are incoherent with these bases, satisfying compressed sensing requirements. Patients benefit from shorter scan times (reducing motion artifacts and claustrophobia), while maintaining diagnostic image quality through sophisticated reconstruction algorithms.

    **Concept Tested:** Compressed Sensing

    **See:** [Applications and Impact](index.md#applications-and-impact)

---
