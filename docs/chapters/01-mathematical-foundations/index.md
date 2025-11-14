# Mathematical Foundations

## Summary

This chapter introduces the essential mathematical concepts that form the foundation for signal processing, including complex numbers, linear algebra, calculus, probability, and trigonometry.

Students will explore 25 key concepts that are essential for understanding this area of signal processing. This material provides the foundation for concepts introduced in later chapters.

## Concepts Covered

This chapter covers the following 25 concepts from the learning graph:

1. Real Numbers
2. Complex Numbers
3. Imaginary Unit
4. Euler's Formula
5. Phasors
6. Vectors
7. Matrices
8. Linear Algebra
9. Differential Calculus
10. Integral Calculus
11. Differential Equations
12. Partial Derivatives
13. Probability Theory
14. Random Variables
15. Statistical Distributions
16. Mean and Expected Value
17. Variance
18. Standard Deviation
19. Trigonometry
20. Exponential Functions
21. Logarithmic Functions
22. Series and Sequences
23. Eigenvalues and Eigenvectors
24. Inner Product
25. Norms and Metrics

## Prerequisites

This chapter assumes only the prerequisites listed in the [course description](../../course-description.md).

---

## Introduction

Signal processing relies on a robust mathematical framework that enables us to analyze, manipulate, and understand signals in both continuous and discrete forms. This chapter establishes the mathematical foundation necessary for comprehending advanced signal processing techniques. While some concepts may be familiar from prior coursework, we present them here in the context of their specific applications to signal analysis and transformation.

The mathematical tools we develop in this chapter fall into several key categories: number systems (particularly complex numbers), linear algebra for representing and transforming signals, calculus for analyzing continuous changes, probability theory for handling uncertainty and noise, and trigonometry for understanding periodic phenomena. Each concept builds upon previous knowledge while introducing signal processing-specific applications.

## Number Systems and Complex Analysis

### Real Numbers

Real numbers form the foundational number system for measuring continuous quantities in signal processing. The real number line $\mathbb{R}$ includes all rational and irrational numbers, providing a complete ordered field essential for representing signal amplitudes, frequencies, and time indices.

In signal processing, real numbers represent:

- Signal amplitudes at specific time instants
- Sampling rates and frequencies
- Filter coefficients and gain values
- Time delays and phase shifts

The properties of real numbers—particularly their completeness, ordering, and arithmetic operations—enable rigorous analysis of signal behavior. The real number system supports the limit operations fundamental to calculus, which we apply extensively in continuous-time signal analysis.

### Complex Numbers

Complex numbers extend the real number system to include solutions to equations like $x^2 + 1 = 0$, which have no real solutions. A complex number $z$ takes the form:

$$z = a + bi$$

where $a$ is the real part, $b$ is the imaginary part, and $i$ is the imaginary unit.

**Why complex numbers matter in signal processing:**

- They provide a compact representation of sinusoidal signals
- They simplify frequency domain analysis
- They enable elegant formulations of filters and transforms
- They naturally represent magnitude and phase information

Complex numbers can be visualized on the complex plane, where the horizontal axis represents the real part and the vertical axis represents the imaginary part. This geometric interpretation proves invaluable when analyzing signal transformations.

#### Diagram: Complex Plane Representation
<details markdown="1">
<summary>Complex Plane Visualization</summary>
Type: diagram

Purpose: Illustrate the geometric representation of complex numbers in the complex plane, showing both rectangular and polar forms.

Components to show:
- Coordinate axes (Real axis horizontal, Imaginary axis vertical)
- A sample complex number z = 3 + 4i plotted as a point
- Vector from origin to the point
- Right triangle showing real part (3), imaginary part (4), and magnitude (5)
- Angle θ from positive real axis to the vector
- Labels for magnitude |z| and phase angle θ

Annotations:
- "Real Part: Re(z) = 3"
- "Imaginary Part: Im(z) = 4"
- "Magnitude: |z| = 5"
- "Phase: θ = tan⁻¹(4/3) ≈ 53.1°"

Connections:
- Dashed lines from point to axes showing projection
- Arc showing angle measurement

Style: Clean geometric diagram with grid

Color scheme: Blue for real axis, red for imaginary axis, green for the complex number vector

Implementation: SVG or interactive p5.js sketch allowing exploration of different complex numbers
</details>

### The Imaginary Unit

The imaginary unit $i$ is defined by the property:

$$i^2 = -1$$

This seemingly simple definition has profound implications. Powers of $i$ cycle through four values:

- $i^1 = i$
- $i^2 = -1$
- $i^3 = -i$
- $i^4 = 1$

This cyclic behavior relates directly to periodic signals and rotations in the complex plane. When we multiply a complex number by $i$, we rotate it 90° counterclockwise—a geometric operation that appears frequently in signal processing operations like Hilbert transforms and quadrature modulation.

### Euler's Formula

Euler's formula establishes a fundamental relationship between exponential functions and trigonometric functions:

$$e^{i\theta} = \cos(\theta) + i\sin(\theta)$$

This elegant equation is arguably the most important formula in signal processing. It allows us to express sinusoidal signals as complex exponentials, dramatically simplifying mathematical manipulations.

**Key consequences of Euler's formula:**

1. **Sinusoids as complex exponentials**: Any sinusoidal signal can be expressed as the real or imaginary part of a complex exponential
2. **Addition of phases**: Multiplying complex exponentials adds their phases
3. **Fourier analysis foundation**: The formula underlies the Fourier transform's ability to decompose signals into frequency components

From Euler's formula, we derive the relationships:

$$\cos(\theta) = \frac{e^{i\theta} + e^{-i\theta}}{2}$$

$$\sin(\theta) = \frac{e^{i\theta} - e^{-i\theta}}{2i}$$

These expressions allow us to manipulate trigonometric functions using the powerful tools of complex analysis.

#### MicroSim: Euler's Formula Visualization
<details markdown="1">
<summary>Interactive Euler's Formula Explorer</summary>
Type: microsim

Learning Objective (Understanding): Students will visualize and understand how Euler's formula connects complex exponentials with circular motion and sinusoidal signals.

Purpose: Demonstrate the relationship between $e^{i\theta}$, rotation on the unit circle, and sine/cosine functions.

Canvas size: 800 x 600 pixels

Layout:
- Left side (400x600): Unit circle in complex plane showing rotation
- Right side (400x600): Two plots showing cos(θ) and sin(θ) over time

Visual elements:
- Unit circle with labeled axes (Re and Im)
- Rotating point on circle as θ increases
- Vector from origin to rotating point (magnitude 1)
- Real and imaginary projections (dashed lines)
- Synchronized plots of cos(θ) and sin(θ) vs θ
- Current θ value highlighted on both displays

Interactive controls:
- Play/Pause button
- Speed slider (0.1x to 5x)
- Reset button
- θ value slider (0 to 4π)

Behavior:
- Point rotates counterclockwise on unit circle
- As point moves, corresponding values trace out on sin/cos plots
- Real projection shows cos(θ)
- Imaginary projection shows sin(θ)
- Display equation: e^(iθ) = cos(θ) + i·sin(θ)

Color coding:
- Real component/cos(θ): Blue
- Imaginary component/sin(θ): Red
- Rotating vector: Green

Implementation: p5.js with synchronized animation
</details>

### Phasors

A phasor is a complex number representing a sinusoidal signal's amplitude and phase. For a sinusoidal signal:

$$x(t) = A\cos(\omega t + \phi)$$

we define the phasor:

$$\tilde{X} = Ae^{i\phi}$$

The phasor captures the amplitude $A$ and initial phase $\phi$ while implicitly assuming the frequency $\omega$ is known from context. This representation transforms differential equations into algebraic equations, greatly simplifying circuit and system analysis.

**Phasor arithmetic:**

- Addition of sinusoids at the same frequency becomes complex number addition
- Differentiation becomes multiplication by $i\omega$
- Integration becomes division by $i\omega$

Phasors form the foundation of AC circuit analysis and are extensively used in communications and power systems engineering.

## Linear Algebra Foundations

### Vectors

Vectors represent quantities with both magnitude and direction. In signal processing, we use vectors to represent:

- Discrete-time signals as ordered collections of samples
- Feature vectors extracted from signals
- State variables in dynamic systems
- Multi-channel signals (stereo audio, RGB images)

A vector in $\mathbb{R}^n$ can be written as:

$$\mathbf{v} = \begin{bmatrix} v_1 \\ v_2 \\ \vdots \\ v_n \end{bmatrix}$$

Vector operations include:

| Operation | Notation | Description |
|-----------|----------|-------------|
| Addition | $\mathbf{u} + \mathbf{v}$ | Component-wise addition |
| Scalar multiplication | $c\mathbf{v}$ | Multiply each component by scalar c |
| Dot product | $\mathbf{u} \cdot \mathbf{v}$ | Sum of products of components |
| Norm | $\|\|\mathbf{v}\|\|$ | Length or magnitude of vector |

### Matrices

Matrices represent linear transformations and systems of linear equations. In signal processing, matrices appear in:

- Filter banks and transform matrices (DFT, DCT, wavelet transforms)
- System state-space representations
- Correlation and covariance matrices
- Image representations (2D signals)

A matrix $\mathbf{A}$ of size $m \times n$ contains $m$ rows and $n$ columns:

$$\mathbf{A} = \begin{bmatrix} a_{11} & a_{12} & \cdots & a_{1n} \\ a_{21} & a_{22} & \cdots & a_{2n} \\ \vdots & \vdots & \ddots & \vdots \\ a_{m1} & a_{m2} & \cdots & a_{mn} \end{bmatrix}$$

**Essential matrix operations:**

- Matrix addition and subtraction (component-wise, same dimensions)
- Matrix multiplication (row-by-column, dimensions must be compatible)
- Matrix transpose (flip rows and columns): $(\mathbf{A}^T)_{ij} = (\mathbf{A})_{ji}$
- Matrix inverse (when it exists): $\mathbf{A}\mathbf{A}^{-1} = \mathbf{I}$

### Linear Algebra

Linear algebra is the study of vector spaces and linear transformations. Key concepts for signal processing include:

**Vector spaces**: Sets closed under addition and scalar multiplication, providing the framework for signal representation

**Linear independence**: Vectors are linearly independent if none can be expressed as a linear combination of the others

**Basis and dimension**: A basis is a linearly independent set that spans the entire space; dimension is the number of basis vectors

**Linear transformations**: Functions $T$ satisfying $T(a\mathbf{u} + b\mathbf{v}) = aT(\mathbf{u}) + bT(\mathbf{v})$, represented by matrices

These concepts enable us to decompose signals into components, change representations (via transforms), and analyze system behavior.

### Eigenvalues and Eigenvectors

Eigenvalues and eigenvectors reveal the intrinsic geometric properties of linear transformations. For a square matrix $\mathbf{A}$, an eigenvector $\mathbf{v}$ and eigenvalue $\lambda$ satisfy:

$$\mathbf{A}\mathbf{v} = \lambda\mathbf{v}$$

This means the transformation $\mathbf{A}$ merely scales the eigenvector $\mathbf{v}$ by factor $\lambda$ without changing its direction.

**Applications in signal processing:**

- Principal Component Analysis (PCA) for dimensionality reduction
- Stability analysis of recursive systems
- Diagonalization of circulant matrices in DFT analysis
- Power iteration methods in spectral analysis

The eigenvalue decomposition of a matrix $\mathbf{A}$ (when it exists) expresses:

$$\mathbf{A} = \mathbf{V}\mathbf{\Lambda}\mathbf{V}^{-1}$$

where $\mathbf{V}$ contains eigenvectors and $\mathbf{\Lambda}$ is diagonal with eigenvalues.

### Inner Product

The inner product generalizes the dot product to abstract vector spaces. For real vectors $\mathbf{u}$ and $\mathbf{v}$:

$$\langle \mathbf{u}, \mathbf{v} \rangle = \sum_{i=1}^{n} u_i v_i$$

For complex vectors, we use the conjugate:

$$\langle \mathbf{u}, \mathbf{v} \rangle = \sum_{i=1}^{n} u_i v_i^*$$

**Properties and applications:**

- Measures similarity between signals
- Projects one signal onto another
- Defines orthogonality: $\langle \mathbf{u}, \mathbf{v} \rangle = 0$ means orthogonal
- Enables matched filtering for signal detection
- Forms the basis for correlation analysis

### Norms and Metrics

Norms measure the "size" or "length" of vectors, while metrics measure distances between vectors. Common norms include:

**$L^1$ norm (Manhattan)**: $\|\|\mathbf{v}\|\|_1 = \sum_{i=1}^{n} |v_i|$

**$L^2$ norm (Euclidean)**: $\|\|\mathbf{v}\|\|_2 = \sqrt{\sum_{i=1}^{n} |v_i|^2}$

**$L^\infty$ norm (maximum)**: $\|\|\mathbf{v}\|\|_\infty = \max_i |v_i|$

These norms lead to different notions of signal energy and distance, each appropriate for different applications. The $L^2$ norm is particularly important as it relates to signal energy.

## Calculus and Differential Equations

### Differential Calculus

Differential calculus studies rates of change. The derivative of a function $f(t)$ at point $t$ is:

$$f'(t) = \lim_{h \to 0} \frac{f(t+h) - f(t)}{h}$$

In signal processing, derivatives represent:

- Instantaneous rate of change of signals
- Velocity and acceleration in motion analysis
- Edge detection in images (spatial derivatives)
- Frequency content (derivatives increase with frequency)

**Key derivative rules:**

- Power rule: $(t^n)' = nt^{n-1}$
- Product rule: $(fg)' = f'g + fg'$
- Chain rule: $(f(g(t)))' = f'(g(t)) \cdot g'(t)$
- Exponential: $(e^{at})' = ae^{at}$
- Sinusoid: $(\sin(\omega t))' = \omega\cos(\omega t)$

### Integral Calculus

Integral calculus deals with accumulation and areas under curves. The definite integral:

$$\int_a^b f(t) \, dt$$

represents the accumulated value of $f(t)$ from $t=a$ to $t=b$.

**Signal processing applications:**

- Signal energy: $E = \int_{-\infty}^{\infty} |x(t)|^2 \, dt$
- Averaging filters: $y(t) = \frac{1}{T}\int_{t-T}^{t} x(\tau) \, d\tau$
- Convolution integral: $y(t) = \int_{-\infty}^{\infty} h(\tau)x(t-\tau) \, d\tau$
- Fourier transform computation

### Differential Equations

Differential equations relate a function to its derivatives, modeling dynamic systems. An ordinary differential equation (ODE) has the general form:

$$a_n \frac{d^n y}{dt^n} + a_{n-1}\frac{d^{n-1}y}{dt^{n-1}} + \cdots + a_1\frac{dy}{dt} + a_0 y = f(t)$$

**Linear time-invariant (LTI) systems** are characterized by linear constant-coefficient differential equations. These equations:

- Model analog filters (RC circuits, op-amp circuits)
- Describe mechanical and electrical oscillators
- Define continuous-time system dynamics
- Lead to transfer function representations

**Solution methods:**

- Characteristic equation for homogeneous equations
- Method of undetermined coefficients
- Laplace transform methods (covered in Chapter 8)
- Numerical integration for complex systems

### Partial Derivatives

Partial derivatives extend differentiation to multivariable functions. For $f(x,y)$, the partial derivatives are:

$$\frac{\partial f}{\partial x} = \lim_{h \to 0} \frac{f(x+h, y) - f(x,y)}{h}$$

$$\frac{\partial f}{\partial y} = \lim_{h \to 0} \frac{f(x, y+h) - f(x,y)}{h}$$

**Applications in signal processing:**

- Image processing (2D signals): $I(x,y)$
- Gradient calculation for edge detection
- Heat equation and diffusion processes
- Video analysis: $V(x,y,t)$ has spatial and temporal derivatives
- Optimization algorithms (gradient descent)

The gradient vector $\nabla f = [\frac{\partial f}{\partial x}, \frac{\partial f}{\partial y}]$ points in the direction of steepest increase.

## Probability and Statistics

### Probability Theory

Probability theory provides a mathematical framework for quantifying uncertainty. A probability measure $P$ assigns numbers in $[0,1]$ to events, satisfying:

- $P(\Omega) = 1$ (certainty)
- $P(\emptyset) = 0$ (impossibility)
- $P(A \cup B) = P(A) + P(B)$ for disjoint events

**Key concepts for signal processing:**

- Random signals and noise modeling
- Detection and estimation theory
- Statistical signal processing
- Error analysis and performance bounds

**Conditional probability**: $P(A|B) = \frac{P(A \cap B)}{P(B)}$ describes the probability of $A$ given that $B$ has occurred.

**Independence**: Events $A$ and $B$ are independent if $P(A \cap B) = P(A)P(B)$.

### Random Variables

A random variable $X$ is a function mapping outcomes to real numbers. Random variables model:

- Noise in signals
- Measurement errors
- Channel fading in communications
- Detection thresholds

Random variables can be **discrete** (taking countable values) or **continuous** (taking values in intervals).

**Probability mass function (PMF)** for discrete $X$: $p_X(x) = P(X = x)$

**Probability density function (PDF)** for continuous $X$: $f_X(x)$ where $P(a \leq X \leq b) = \int_a^b f_X(x) \, dx$

**Cumulative distribution function (CDF)**: $F_X(x) = P(X \leq x)$

### Statistical Distributions

Common probability distributions in signal processing include:

| Distribution | PDF/PMF | Parameters | Applications |
|--------------|---------|------------|--------------|
| Uniform | $f(x) = \frac{1}{b-a}$ for $x \in [a,b]$ | $a, b$ | Quantization, random sampling |
| Gaussian | $f(x) = \frac{1}{\sigma\sqrt{2\pi}}e^{-(x-\mu)^2/2\sigma^2}$ | $\mu, \sigma$ | Thermal noise, measurement errors |
| Exponential | $f(x) = \lambda e^{-\lambda x}$ for $x \geq 0$ | $\lambda$ | Waiting times, decay processes |
| Rayleigh | $f(x) = \frac{x}{\sigma^2}e^{-x^2/2\sigma^2}$ for $x \geq 0$ | $\sigma$ | Fading channels, envelope detection |

The **Gaussian (normal) distribution** is particularly important due to the Central Limit Theorem, which states that sums of independent random variables tend toward Gaussian distributions.

### Mean and Expected Value

The expected value (mean) of a random variable $X$ represents its average value:

**Discrete**: $E[X] = \sum_x x \cdot p_X(x)$

**Continuous**: $E[X] = \int_{-\infty}^{\infty} x \cdot f_X(x) \, dx$

**Properties of expectation:**

- Linearity: $E[aX + bY] = aE[X] + bE[Y]$
- For independent $X, Y$: $E[XY] = E[X]E[Y]$
- $E[X + c] = E[X] + c$

The mean of a signal $x(t)$ over time $T$ is:

$$\mu_x = \frac{1}{T}\int_0^T x(t) \, dt$$

This DC (direct current) component represents the signal's average level.

### Variance

Variance measures the spread of a random variable around its mean:

$$\text{Var}(X) = E[(X - \mu)^2] = E[X^2] - (E[X])^2$$

where $\mu = E[X]$.

**Properties:**

- Always non-negative: $\text{Var}(X) \geq 0$
- $\text{Var}(aX + b) = a^2\text{Var}(X)$
- For independent $X, Y$: $\text{Var}(X + Y) = \text{Var}(X) + \text{Var}(Y)$

In signal processing, variance relates to:

- Signal power (after removing DC component)
- Noise power
- Estimation error bounds

### Standard Deviation

Standard deviation is the square root of variance:

$$\sigma = \sqrt{\text{Var}(X)}$$

Standard deviation has the same units as the random variable itself, making it more interpretable than variance. For a Gaussian distribution with mean $\mu$ and standard deviation $\sigma$:

- Approximately 68% of values fall within $\mu \pm \sigma$
- Approximately 95% fall within $\mu \pm 2\sigma$
- Approximately 99.7% fall within $\mu \pm 3\sigma$

This "68-95-99.7 rule" provides intuition for the spread of Gaussian-distributed signals and noise.

## Trigonometry and Special Functions

### Trigonometry

Trigonometric functions are fundamental to signal processing because they describe periodic phenomena. The basic trigonometric functions—sine, cosine, and tangent—relate angles in a right triangle to side lengths.

**Unit circle definitions:**

- $\sin(\theta)$: vertical coordinate of point on unit circle
- $\cos(\theta)$: horizontal coordinate of point on unit circle
- $\tan(\theta) = \frac{\sin(\theta)}{\cos(\theta)}$

**Key identities:**

- Pythagorean: $\sin^2(\theta) + \cos^2(\theta) = 1$
- Angle sum: $\sin(A \pm B) = \sin A \cos B \pm \cos A \sin B$
- Double angle: $\cos(2\theta) = \cos^2(\theta) - \sin^2(\theta)$
- Product-to-sum: $2\sin A \cos B = \sin(A+B) + \sin(A-B)$

These identities enable manipulation and simplification of signal expressions.

### Exponential Functions

The exponential function $e^x$ has the unique property that it equals its own derivative. For signal processing, we use exponentials to represent:

- Growth and decay processes: $x(t) = Ae^{-t/\tau}$
- Complex sinusoids: $e^{i\omega t}$
- Stability regions in system analysis
- Modulation envelopes

**Properties:**

- $e^{a+b} = e^a \cdot e^b$
- $(e^x)' = e^x$
- $e^0 = 1$
- $\lim_{x \to -\infty} e^x = 0$

The complex exponential $e^{i\omega t}$ represents pure oscillation at frequency $\omega$ radians per second.

### Logarithmic Functions

The natural logarithm $\ln(x) = \log_e(x)$ is the inverse of the exponential function. Logarithms appear in signal processing for:

- Decibel (dB) scale: $\text{dB} = 10\log_{10}(P/P_0)$ or $20\log_{10}(A/A_0)$
- Cepstral analysis (log of log-spectrum)
- Information theory and entropy
- Dynamic range compression

**Properties:**

- $\ln(ab) = \ln(a) + \ln(b)$
- $\ln(a^n) = n\ln(a)$
- $\ln(1) = 0$
- $\frac{d}{dx}\ln(x) = \frac{1}{x}$

The logarithmic decibel scale compresses large dynamic ranges into manageable numbers, crucial for representing signal power and frequency response.

### Series and Sequences

Sequences are ordered lists of numbers: $\{x_0, x_1, x_2, \ldots\}$. Series are sums of sequence terms: $\sum_{n=0}^{\infty} x_n$.

**Important series in signal processing:**

**Geometric series**: $\sum_{n=0}^{\infty} ar^n = \frac{a}{1-r}$ for $|r| < 1$

This series appears in recursive filter analysis and Z-transform convergence.

**Taylor series**: Represents functions as infinite polynomials

$$f(x) = f(a) + f'(a)(x-a) + \frac{f''(a)}{2!}(x-a)^2 + \cdots$$

Taylor series enable approximations and analytical solutions.

**Fourier series**: Decomposes periodic signals into sums of sinusoids (covered in Chapter 6)

Understanding convergence criteria and manipulation of series is essential for transform analysis and filter design.

## Summary

This chapter established the mathematical foundations essential for signal processing. We covered five major areas:

1. **Complex numbers and analysis**: Complex numbers, Euler's formula, and phasors provide elegant representations of sinusoidal signals and simplify frequency domain manipulations.

2. **Linear algebra**: Vectors, matrices, eigenvalues, and inner products enable signal representation, transformation, and decomposition techniques.

3. **Calculus**: Differential and integral calculus, along with differential equations, model continuous-time signals and systems.

4. **Probability and statistics**: Random variables, distributions, and statistical measures handle noise, uncertainty, and stochastic signals.

5. **Trigonometry and special functions**: Trigonometric, exponential, and logarithmic functions represent periodic signals and model growth/decay processes.

These mathematical tools recur throughout signal processing. Complex exponentials form the basis of Fourier analysis. Linear algebra underlies transform matrices and filter banks. Calculus enables continuous-time system analysis. Probability theory models noise and enables statistical signal processing. Mastering these fundamentals prepares you for the rich theory and powerful techniques in subsequent chapters.

**Key takeaways:**

- Complex numbers simplify sinusoidal signal representation through Euler's formula
- Linear algebra provides frameworks for signal decomposition and transformation
- Calculus enables continuous-time signal and system analysis
- Probability theory quantifies uncertainty and noise in signals
- These mathematical foundations interconnect throughout signal processing applications
