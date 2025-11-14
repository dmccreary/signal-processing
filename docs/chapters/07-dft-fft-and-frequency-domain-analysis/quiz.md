# Quiz: DFT, FFT and Frequency Domain Analysis

Test your understanding of frequency domain representation, spectral analysis, and windowing techniques.

---

#### 1. What is the primary difference between time domain and frequency domain representations of a signal?

<div class="upper-alpha" markdown>
1. Time domain shows amplitude vs. time, while frequency domain shows amplitude and phase vs. frequency
2. Time domain is continuous while frequency domain is always discrete
3. Frequency domain can only represent periodic signals
4. Time domain requires more storage space than frequency domain
</div>

??? question "Show Answer"
    The correct answer is **A**. Time domain represents signals as amplitude varying with time ($x(t)$ or $x[n]$), showing temporal structure and transient behavior. Frequency domain represents signals through their spectral content ($X(f)$ or $X[k]$), showing which frequencies are present and their relative strengths (magnitude) and temporal alignment (phase). Both representations contain complete signal information but provide different perspectives for analysis.

    **Concept Tested:** Frequency Domain, Time Domain

    **See:** [Domain Representations](index.md#domain-representations)

---

#### 2. What does the magnitude spectrum $|X[k]|$ of a signal reveal?

<div class="upper-alpha" markdown>
1. The time delays of each frequency component
2. The amplitude of each frequency component without phase information
3. Only the DC component of the signal
4. The sampling rate used to acquire the signal
</div>

??? question "Show Answer"
    The correct answer is **B**. The magnitude spectrum $|X[k]|$ shows the amplitude of each frequency component without phase information, computed as $|X[k]| = \sqrt{A[k]^2 + B[k]^2}$ for complex-valued frequency samples. It reveals which frequencies contain significant signal energy and is the most commonly visualized spectral representation in spectrum analyzers and analysis software.

    **Concept Tested:** Magnitude Spectrum

    **See:** [Magnitude Spectrum](index.md#magnitude-spectrum)

---

#### 3. What is spectral leakage in the context of the DFT?

<div class="upper-alpha" markdown>
1. Loss of signal energy during analog-to-digital conversion
2. Spreading of signal energy from one frequency into adjacent frequency bins due to finite observation windows
3. Aliasing caused by insufficient sampling rates
4. Errors introduced by finite-precision arithmetic
</div>

??? question "Show Answer"
    The correct answer is **B**. Spectral leakage occurs when finite-duration observation windows cause signal energy at one frequency to spread into adjacent frequency bins. This arises because truncating a signal is equivalent to multiplying by a rectangular window, and the window's Fourier transform (a sinc function with substantial sidelobes) convolves with the signal's true spectrum, spreading energy across frequencies.

    **Concept Tested:** Spectral Leakage

    **See:** [Spectral Leakage](index.md#spectral-leakage)

---

#### 4. What is the primary purpose of applying window functions before computing the DFT?

<div class="upper-alpha" markdown>
1. To increase computational speed of the FFT algorithm
2. To reduce spectral leakage by smoothly tapering the signal at observation interval endpoints
3. To eliminate aliasing from undersampling
4. To convert real-valued signals to complex-valued signals
</div>

??? question "Show Answer"
    The correct answer is **B**. Window functions taper time-domain signals to reduce spectral leakage by smoothly decreasing signal amplitude toward observation interval endpoints, minimizing discontinuities that cause leakage. Different windows make different trade-offs between main lobe width (frequency resolution) and sidelobe level (leakage suppression).

    **Concept Tested:** Window Functions, Windowing Techniques

    **See:** [Window Functions](index.md#window-functions)

---

#### 5. Which window function provides the best frequency resolution but the worst sidelobe suppression?

<div class="upper-alpha" markdown>
1. Hamming window
2. Blackman window
3. Rectangular window
4. Kaiser window
</div>

??? question "Show Answer"
    The correct answer is **C**. The rectangular window (no tapering) provides the best frequency resolution with the narrowest main lobe (1.0 bins), but exhibits the worst sidelobe suppression at approximately -13 dB. This makes it unsuitable for most applications where spectral leakage is a concern, but optimal when maximum frequency resolution is the primary requirement.

    **Concept Tested:** Window Functions

    **See:** [Window Functions](index.md#window-functions)

---

#### 6. What does the power spectrum or power spectral density (PSD) describe?

<div class="upper-alpha" markdown>
1. The total energy of a signal
2. How signal power is distributed across frequency
3. The phase relationship between frequency components
4. The time-varying amplitude of a signal
</div>

??? question "Show Answer"
    The correct answer is **B**. The power spectrum or power spectral density describes how signal power is distributed across the frequency spectrum. For deterministic signals, it is proportional to the squared magnitude spectrum, while for random processes, the PSD is defined through the Fourier transform of the autocorrelation function (Wiener-Khinchin theorem). Integration of the PSD over a frequency band yields the total power in that band.

    **Concept Tested:** Power Spectrum

    **See:** [Power Spectrum](index.md#power-spectrum)

---

#### 7. For analyzing a signal with time-varying frequency content, which technique is most appropriate?

<div class="upper-alpha" markdown>
1. Standard FFT of the entire signal
2. Short-time Fourier transform (STFT) with overlapping windows
3. Direct calculation of the DFT
4. Computing only the magnitude spectrum
</div>

??? question "Show Answer"
    The correct answer is **B**. The short-time Fourier transform (STFT) analyzes signals with time-varying frequency content by computing the Fourier transform over short, overlapping time windows. This reveals how spectral content evolves over time through spectrogram visualization, making it invaluable for non-stationary signals like speech, music, and chirps where standard FFT would only show average frequency content.

    **Concept Tested:** Spectral Analysis

    **See:** [Spectral Analysis](index.md#spectral-analysis)

---

#### 8. What fundamental tradeoff governs time-frequency analysis in the STFT?

<div class="upper-alpha" markdown>
1. Computational complexity vs. accuracy
2. Time resolution vs. frequency resolution (uncertainty principle)
3. Signal amplitude vs. noise level
4. Sampling rate vs. aliasing
</div>

??? question "Show Answer"
    The correct answer is **B**. The STFT faces an inherent tradeoff governed by the uncertainty principle: improving time resolution (using shorter windows) degrades frequency resolution and vice versa. This fundamental limitation is expressed as $\Delta t \cdot \Delta f \geq 1/(4\pi)$, showing that simultaneous high resolution in both time and frequency domains is impossible. Window length selection must balance these competing requirements based on signal characteristics.

    **Concept Tested:** Spectral Analysis, Window Functions

    **See:** [Spectral Analysis](index.md#spectral-analysis)

---

#### 9. If a signal is sampled at $f_s = 8000$ Hz and a 256-point DFT is computed, what is the frequency resolution $\Delta f$?

<div class="upper-alpha" markdown>
1. 8000 Hz
2. 256 Hz
3. 31.25 Hz
4. 4000 Hz
</div>

??? question "Show Answer"
    The correct answer is **C**. Frequency resolution equals the sampling rate divided by the number of samples: $\Delta f = f_s/N = 8000/256 = 31.25$ Hz. This establishes the minimum frequency separation resolvable with a given data length. Improving frequency resolution requires longer observation windows (more samples), creating a fundamental tradeoff with time resolution for time-varying signal analysis.

    **Concept Tested:** Spectrum, Spectral Analysis

    **See:** [Practical Considerations](index.md#practical-considerations)

---

#### 10. What effect does zero-padding (appending zeros to increase FFT length) have on spectral analysis?

<div class="upper-alpha" markdown>
1. Improves fundamental frequency resolution determined by observation duration
2. Provides finer frequency sampling without improving fundamental resolution
3. Eliminates spectral leakage completely
4. Reduces computational complexity of the FFT
</div>

??? question "Show Answer"
    The correct answer is **B**. Zero-padding provides finer frequency sampling by interpolating between the natural frequency bins, improving visualization of spectral features. However, it does not improve fundamental frequency resolution, which depends solely on observation duration ($\Delta f = f_s/N_{original}$). Zero-padding can be useful for better visualization and interpolation but does not reveal new frequency information.

    **Concept Tested:** Spectral Analysis

    **See:** [Practical Considerations](index.md#practical-considerations)

---
