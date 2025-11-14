# Quiz: Mathematical Foundations

Test your understanding of the mathematical foundations essential for signal processing.

---

#### 1. What is the defining property of the imaginary unit $i$?

<div class="upper-alpha" markdown>
1. $i = 1$
2. $i^2 = -1$
3. $i = -1$
4. $i^2 = 1$
</div>

??? question "Show Answer"
    The correct answer is **B**. The imaginary unit $i$ is defined by the fundamental property that $i^2 = -1$, which allows us to extend the real number system to include solutions to equations like $x^2 + 1 = 0$. This definition leads to the cyclic behavior of powers of $i$ and enables the representation of complex numbers in the form $z = a + bi$.

    **Concept Tested:** Imaginary Unit

    **See:** [Imaginary Unit](index.md#the-imaginary-unit)

---

#### 2. Which formula establishes the fundamental relationship between exponential functions and trigonometric functions?

<div class="upper-alpha" markdown>
1. Pythagorean theorem
2. Fourier transform
3. Euler's formula
4. Taylor series
</div>

??? question "Show Answer"
    The correct answer is **C**. Euler's formula, $e^{i\theta} = \cos(\theta) + i\sin(\theta)$, establishes the fundamental relationship between exponential and trigonometric functions. This elegant equation is arguably the most important formula in signal processing, as it allows us to express sinusoidal signals as complex exponentials and forms the foundation of Fourier analysis.

    **Concept Tested:** Euler's Formula

    **See:** [Euler's Formula](index.md#eulers-formula)

---

#### 3. What does a phasor represent in signal processing?

<div class="upper-alpha" markdown>
1. The frequency of a sinusoidal signal only
2. A complex number representing a sinusoidal signal's amplitude and phase
3. The time delay between two signals
4. The power spectrum of a signal
</div>

??? question "Show Answer"
    The correct answer is **B**. A phasor is a complex number that represents a sinusoidal signal's amplitude and phase. For a sinusoidal signal $x(t) = A\cos(\omega t + \phi)$, the phasor is $\tilde{X} = Ae^{i\phi}$, capturing amplitude $A$ and initial phase $\phi$ while assuming frequency $\omega$ is known from context. This representation transforms differential equations into algebraic equations, simplifying circuit and system analysis.

    **Concept Tested:** Phasors

    **See:** [Phasors](index.md#phasors)

---

#### 4. In signal processing, vectors are commonly used to represent which of the following?

<div class="upper-alpha" markdown>
1. Only continuous-time signals
2. Discrete-time signals as ordered collections of samples
3. Frequency domain representations exclusively
4. Only scalar quantities without direction
</div>

??? question "Show Answer"
    The correct answer is **B**. In signal processing, vectors are used to represent discrete-time signals as ordered collections of samples, along with feature vectors, state variables in dynamic systems, and multi-channel signals like stereo audio or RGB images. Vectors provide a mathematical framework for representing quantities with both magnitude and direction, enabling various signal processing operations.

    **Concept Tested:** Vectors

    **See:** [Vectors](index.md#vectors)

---

#### 5. What does the eigenvalue equation $\mathbf{A}\mathbf{v} = \lambda\mathbf{v}$ tell us about the transformation represented by matrix $\mathbf{A}$?

<div class="upper-alpha" markdown>
1. The matrix inverts the eigenvector
2. The matrix rotates the eigenvector by 90 degrees
3. The matrix scales the eigenvector by factor $\lambda$ without changing its direction
4. The matrix translates the eigenvector to a new location
</div>

??? question "Show Answer"
    The correct answer is **C**. The eigenvalue equation shows that the transformation $\mathbf{A}$ merely scales the eigenvector $\mathbf{v}$ by factor $\lambda$ without changing its direction. This property reveals the intrinsic geometric behavior of linear transformations and is essential for applications like Principal Component Analysis, stability analysis of recursive systems, and diagonalization of matrices in signal processing.

    **Concept Tested:** Eigenvalues and Eigenvectors

    **See:** [Eigenvalues and Eigenvectors](index.md#eigenvalues-and-eigenvectors)

---

#### 6. In signal processing, what does the integral $E = \int_{-\infty}^{\infty} |x(t)|^2 \, dt$ represent?

<div class="upper-alpha" markdown>
1. The average value of the signal
2. The signal energy
3. The signal frequency
4. The signal duration
</div>

??? question "Show Answer"
    The correct answer is **B**. The integral $E = \int_{-\infty}^{\infty} |x(t)|^2 \, dt$ represents the signal energy, which is the accumulated squared magnitude of the signal over all time. This concept from integral calculus is fundamental in signal processing for characterizing signal strength and is related to the $L^2$ norm. Energy signals have finite energy, while power signals require a different measure.

    **Concept Tested:** Integral Calculus, Signal Energy

    **See:** [Integral Calculus](index.md#integral-calculus)

---

#### 7. Why is the Gaussian distribution particularly important in signal processing?

<div class="upper-alpha" markdown>
1. It has the simplest mathematical form
2. The Central Limit Theorem shows that sums of independent random variables tend toward Gaussian distributions
3. It is the only distribution used for noise modeling
4. It always has zero mean and unit variance
</div>

??? question "Show Answer"
    The correct answer is **B**. The Gaussian (normal) distribution is particularly important because the Central Limit Theorem states that sums of independent random variables tend toward Gaussian distributions, regardless of the original distributions. This makes Gaussian distributions natural models for thermal noise, measurement errors, and many other phenomena in signal processing. The distribution is characterized by its mean $\mu$ and standard deviation $\sigma$, which can take various values.

    **Concept Tested:** Statistical Distributions, Gaussian Distribution

    **See:** [Statistical Distributions](index.md#statistical-distributions)

---

#### 8. Given a signal with additive Gaussian noise having standard deviation $\sigma = 2$, approximately what percentage of noise samples will fall within the range $\mu \pm 2\sigma$?

<div class="upper-alpha" markdown>
1. 68%
2. 75%
3. 95%
4. 99.7%
</div>

??? question "Show Answer"
    The correct answer is **C**. For a Gaussian distribution, approximately 95% of values fall within $\mu \pm 2\sigma$ (the "68-95-99.7 rule"). Specifically, about 68% fall within $\mu \pm \sigma$, 95% within $\mu \pm 2\sigma$, and 99.7% within $\mu \pm 3\sigma$. This understanding is crucial for analyzing noise levels and setting detection thresholds in signal processing applications.

    **Concept Tested:** Standard Deviation, Gaussian Distribution

    **See:** [Standard Deviation](index.md#standard-deviation)

---

#### 9. When measuring signal power in decibels (dB), which logarithmic expression is used?

<div class="upper-alpha" markdown>
1. $\text{dB} = \log_{10}(P/P_0)$
2. $\text{dB} = 10\log_{10}(P/P_0)$
3. $\text{dB} = 20\log_{10}(P/P_0)$
4. $\text{dB} = \ln(P/P_0)$
</div>

??? question "Show Answer"
    The correct answer is **B**. Power in decibels is calculated as $\text{dB} = 10\log_{10}(P/P_0)$, where $P$ is the measured power and $P_0$ is the reference power. For amplitude measurements, the formula is $20\log_{10}(A/A_0)$ (since power is proportional to amplitude squared). The logarithmic decibel scale compresses large dynamic ranges into manageable numbers and is crucial for representing signal power and frequency response.

    **Concept Tested:** Logarithmic Functions, Decibel Scale

    **See:** [Logarithmic Functions](index.md#logarithmic-functions)

---

#### 10. What is the sum of a geometric series $\sum_{n=0}^{\infty} ar^n$ when $|r| < 1$?

<div class="upper-alpha" markdown>
1. $\frac{r}{1-a}$
2. $\frac{a}{1-r}$
3. $\frac{1}{a-r}$
4. $ar$
</div>

??? question "Show Answer"
    The correct answer is **B**. The geometric series $\sum_{n=0}^{\infty} ar^n = \frac{a}{1-r}$ when $|r| < 1$ (the convergence condition). This series is fundamental in signal processing, appearing in recursive filter analysis, Z-transform convergence regions, and many analytical solutions. The condition $|r| < 1$ ensures the series converges to a finite value.

    **Concept Tested:** Series and Sequences, Geometric Series

    **See:** [Series and Sequences](index.md#series-and-sequences)

---
