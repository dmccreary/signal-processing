# Quiz: Fourier Analysis Fundamentals

Test your understanding of Fourier series, Fourier transforms, and FFT algorithms.

---

#### 1. What is the fundamental principle of Fourier series?

<div class="upper-alpha" markdown>
1. Any signal can be represented as a sum of impulses
2. Periodic signals can be represented as sums of sinusoids at integer multiples of the fundamental frequency
3. All signals are bandlimited
4. Time and frequency are inversely proportional
</div>

??? question "Show Answer"
    The correct answer is **B**. The Fourier series represents periodic signals as sums of sinusoids at integer multiples of the fundamental frequency, providing a complete orthogonal decomposition for signals that repeat with period $T$. The series uses harmonics at frequencies $n\omega_0$ where $\omega_0 = 2\pi/T$ is the fundamental angular frequency.

    **Concept Tested:** Fourier Series

    **See:** [Fourier Series](index.md#fourier-series)

---

#### 2. What is the formula for the DC component (average value) $a_0$ in a Fourier series?

<div class="upper-alpha" markdown>
1. $a_0 = \frac{1}{T}\int_0^T x(t) dt$
2. $a_0 = \frac{2}{T}\int_0^T x(t) dt$
3. $a_0 = \int_0^T x(t)\cos(\omega_0 t) dt$
4. $a_0 = 0$ for all periodic signals
</div>

??? question "Show Answer"
    The correct answer is **A**. The DC component (average value) is computed as $a_0 = \frac{1}{T}\int_0^T x(t) dt$, which is the integral of the signal over one period divided by the period. This represents the zero-frequency component or mean value of the periodic signal.

    **Concept Tested:** Fourier Coefficients

    **See:** [Fourier Coefficients](index.md#fourier-coefficients)

---

#### 3. What is the definition of the continuous-time Fourier Transform?

<div class="upper-alpha" markdown>
1. $X(f) = \sum_{n=-\infty}^{\infty} x[n]e^{-j2\pi fn}$
2. $X(f) = \frac{1}{T}\int_0^T x(t)e^{-j2\pi ft} dt$
3. $X(f) = \int_{-\infty}^{\infty} x(t)e^{-j2\pi ft} dt$
4. $X(f) = \int_{-\infty}^{\infty} x(t)e^{j2\pi ft} dt$
</div>

??? question "Show Answer"
    The correct answer is **C**. The continuous-time Fourier transform is defined as $X(f) = \int_{-\infty}^{\infty} x(t)e^{-j2\pi ft} dt$, mapping time-domain signals $x(t)$ to frequency-domain representations $X(f)$ that specify the complex amplitude (magnitude and phase) of each frequency component. This extends Fourier analysis from periodic signals to aperiodic signals.

    **Concept Tested:** Fourier Transform

    **See:** [Fourier Transform](index.md#fourier-transform)

---

#### 4. How does the Inverse Fourier Transform differ from the forward Fourier Transform?

<div class="upper-alpha" markdown>
1. It uses a different frequency range
2. It only works for periodic signals
3. It differs in the sign of the exponent: $x(t) = \int_{-\infty}^{\infty} X(f)e^{j2\pi ft} df$
4. It produces imaginary values while the forward transform produces real values
</div>

??? question "Show Answer"
    The correct answer is **C**. The Inverse Fourier Transform recovers the time-domain signal from its frequency-domain representation and differs from the forward transform primarily in the sign of the exponent: $x(t) = \int_{-\infty}^{\infty} X(f)e^{j2\pi ft} df$. This bidirectional relationship demonstrates that the frequency-domain representation contains complete information about the signal.

    **Concept Tested:** Inverse Fourier Transform

    **See:** [Inverse Fourier Transform](index.md#inverse-fourier-transform)

---

#### 5. What is the Discrete Fourier Transform (DFT) formula for a sequence of length $N$?

<div class="upper-alpha" markdown>
1. $X[k] = \sum_{n=0}^{N-1} x[n]e^{j2\pi kn/N}$
2. $X[k] = \sum_{n=0}^{N-1} x[n]e^{-j2\pi kn/N}$
3. $X[k] = \frac{1}{N}\sum_{n=0}^{N-1} x[n]e^{-j2\pi kn/N}$
4. $X[k] = \int_{0}^{N} x(t)e^{-j2\pi kt/N} dt$
</div>

??? question "Show Answer"
    The correct answer is **B**. The DFT is defined as $X[k] = \sum_{n=0}^{N-1} x[n]e^{-j2\pi kn/N}$ for $k = 0, 1, \ldots, N-1$. The DFT produces $N$ complex frequency-domain samples from $N$ time-domain samples, with $X[k]$ representing the frequency bin centered at $f = k f_s/N$ where $f_s$ is the sampling rate.

    **Concept Tested:** Discrete Fourier Transform

    **See:** [Discrete Fourier Transform](index.md#discrete-fourier-transform)

---

#### 6. What key assumption does the DFT make about the input sequence?

<div class="upper-alpha" markdown>
1. The input sequence is causal
2. The input sequence is periodic with period $N$
3. The input sequence contains only real values
4. The input sequence has zero mean
</div>

??? question "Show Answer"
    The correct answer is **B**. The DFT implicitly assumes the input sequence is periodic with period $N$, leading to circular convolution when DFT-based filtering is performed. This periodicity assumption means that sample $x[N]$ is treated as equivalent to $x[0]$, which is important to consider when using the DFT for spectral analysis or filtering applications.

    **Concept Tested:** Discrete Fourier Transform

    **See:** [Discrete Fourier Transform](index.md#discrete-fourier-transform)

---

#### 7. What is the primary advantage of the Fast Fourier Transform (FFT) over direct DFT computation?

<div class="upper-alpha" markdown>
1. FFT produces more accurate results
2. FFT can handle complex-valued inputs while DFT cannot
3. FFT reduces computational complexity from $O(N^2)$ to $O(N \log N)$
4. FFT works for any signal length while DFT requires powers of two
</div>

??? question "Show Answer"
    The correct answer is **C**. The FFT algorithms compute the DFT with reduced computational complexity from $O(N^2)$ for direct calculation to $O(N \log N)$ for FFT algorithms. This dramatic improvement enables real-time spectral analysis and frequency-domain processing for sequences of substantial length. Both FFT and direct DFT produce identical mathematical results; FFT is simply a faster algorithm.

    **Concept Tested:** Fast Fourier Transform

    **See:** [Fast Fourier Transform](index.md#fast-fourier-transform)

---

#### 8. For an $N = 1024$ point sequence, approximately how many complex multiplications does the radix-2 FFT require compared to direct DFT?

<div class="upper-alpha" markdown>
1. About the same number (1 million each)
2. FFT requires about 5,000 vs. DFT's 1 million
3. FFT requires about 100,000 vs. DFT's 1 million
4. FFT requires about 50,000 vs. DFT's 500,000
</div>

??? question "Show Answer"
    The correct answer is **B**. For $N = 1024$, the radix-2 FFT requires $(N/2)\log_2 N \approx 5,120$ complex multiplications, compared to $N^2 \approx 1,048,576$ operations for direct DFT calculation. This represents a reduction from about one million to about five thousand multiplications, explaining the FFT's transformative impact on signal processing practice.

    **Concept Tested:** Radix-2 FFT

    **See:** [Radix-2 FFT](index.md#radix-2-fft)

---

#### 9. What requirement does the radix-2 FFT algorithm impose on the sequence length $N$?

<div class="upper-alpha" markdown>
1. $N$ must be an even number
2. $N$ must be a power of two ($N = 2^m$)
3. $N$ must be a prime number
4. $N$ can be any positive integer
</div>

??? question "Show Answer"
    The correct answer is **B**. The radix-2 FFT algorithm requires that the sequence length be a power of two ($N = 2^m$). The algorithm recursively decomposes an $N$-point DFT into two $(N/2)$-point DFTs, continuing until reaching trivial one-point DFTs. For non-power-of-two lengths, sequences can be zero-padded to the next higher power of two, or alternative FFT algorithms like Cooley-Tukey can be used.

    **Concept Tested:** Radix-2 FFT

    **See:** [Radix-2 FFT](index.md#radix-2-fft)

---

#### 10. What is the key contribution of the Cooley-Tukey algorithm?

<div class="upper-alpha" markdown>
1. It only works for sequence lengths that are powers of two
2. It provides the most general FFT approach, applicable to any composite sequence length $N = N_1 N_2$
3. It eliminates the need for complex arithmetic
4. It computes the inverse DFT faster than the forward DFT
</div>

??? question "Show Answer"
    The correct answer is **B**. The Cooley-Tukey algorithm provides the most general FFT approach, applicable to any composite sequence length $N = N_1 N_2$. The algorithm decomposes the $N$-point DFT into smaller DFTs, achieving $O(N \log N)$ complexity. When $N$ is a power of two, it reduces to the radix-2 FFT. The flexibility to accommodate various sequence lengths makes it the basis for most general-purpose FFT implementations.

    **Concept Tested:** Cooley-Tukey Algorithm

    **See:** [Cooley-Tukey Algorithm](index.md#cooley-tukey-algorithm)

---
