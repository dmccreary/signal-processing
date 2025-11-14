# Quiz: Introduction to Signals and Systems

Test your understanding of fundamental signal and system concepts.

---

#### 1. What is a system in the context of signal processing?

<div class="upper-alpha" markdown>
1. A collection of unrelated mathematical equations
2. An entity that processes input signals to produce output signals according to specific rules
3. A physical device only, not including software algorithms
4. A method for storing digital data
</div>

??? question "Show Answer"
    The correct answer is **B**. A system is an entity that processes input signals to produce output signals according to specific rules or mathematical operations. The fundamental relationship is expressed as $y(t) = \mathcal{T}[x(t)]$, where $x(t)$ is the input signal, $y(t)$ is the output signal, and $\mathcal{T}$ represents the transformation operation. Systems can be physical devices like filters or amplifiers, or algorithmic processes implemented in software.

    **Concept Tested:** Systems

    **See:** [Systems](index.md#systems)

---

#### 2. Which notation is used to distinguish discrete-time signals from continuous-time signals?

<div class="upper-alpha" markdown>
1. $x(t)$ for discrete-time, $x[n]$ for continuous-time
2. $x[n]$ for discrete-time where $n$ is an integer, $x(t)$ for continuous-time where $t$ is real-valued
3. Both use $x(t)$ with different subscripts
4. $x_d(t)$ for discrete-time, $x_c(t)$ for continuous-time
</div>

??? question "Show Answer"
    The correct answer is **B**. Discrete-time signals are represented as $x[n]$ where $n$ is an integer-valued index, while continuous-time signals are represented as $x(t)$ where $t$ is a real-valued continuous variable. The square bracket notation $x[n]$ emphasizes that the signal exists only at specific discrete time instances, typically at integer multiples of some sampling period.

    **Concept Tested:** Discrete-Time Signals, Continuous-Time Signals

    **See:** [Continuous-Time vs. Discrete-Time Signals](index.md#continuous-time-vs-discrete-time-signals)

---

#### 3. What condition must a periodic signal satisfy?

<div class="upper-alpha" markdown>
1. $x(t) = -x(-t)$ for all $t$
2. $x(t) = x(-t)$ for all $t$
3. $x(t) = x(t + T)$ for all $t$, where $T$ is the fundamental period
4. $\int_{-\infty}^{\infty} |x(t)|^2 dt < \infty$
</div>

??? question "Show Answer"
    The correct answer is **C**. Periodic signals must satisfy $x(t) = x(t + T)$ for all values of $t$, where $T$ is the fundamental period. This means the signal repeats its values at regular intervals. The frequency $f = 1/T$ describes how many complete cycles occur per unit time. Common examples include sinusoids, square waves, and carrier signals in radio transmission.

    **Concept Tested:** Periodic Signals

    **See:** [Temporal Properties: Periodicity](index.md#temporal-properties-periodicity)

---

#### 4. What is the definition of the unit step function $u(t)$ for $t \geq 0$?

<div class="upper-alpha" markdown>
1. $u(t) = 1$
2. $u(t) = 0$
3. $u(t) = t$
4. $u(t) = \infty$
</div>

??? question "Show Answer"
    The correct answer is **A**. The unit step function is defined as $u(t) = 1$ for $t \geq 0$ and $u(t) = 0$ for $t < 0$. This function represents an instantaneous transition from zero to one at time zero and serves as a building block for constructing more complex signals and modeling switching operations in circuits and control systems.

    **Concept Tested:** Unit Step Function

    **See:** [Unit Step Function](index.md#unit-step-function)

---

#### 5. How can any arbitrary signal be decomposed into even and odd components?

<div class="upper-alpha" markdown>
1. Using Fourier transform only
2. Using the formulas $x_e(t) = \frac{x(t) + x(-t)}{2}$ and $x_o(t) = \frac{x(t) - x(-t)}{2}$
3. By separating positive and negative amplitude values
4. Using integration over the entire time domain
</div>

??? question "Show Answer"
    The correct answer is **B**. Any arbitrary signal can be decomposed into an even component using $x_e(t) = \frac{x(t) + x(-t)}{2}$ and an odd component using $x_o(t) = \frac{x(t) - x(-t)}{2}$. The original signal can be reconstructed as $x(t) = x_e(t) + x_o(t)$. This decomposition is valuable in many analytical contexts, particularly for understanding signal behavior under various transformations.

    **Concept Tested:** Even Signals, Odd Signals

    **See:** [Symmetry Properties](index.md#symmetry-properties)

---

#### 6. What is the key property of the unit impulse (Dirac delta) function $\delta(t)$?

<div class="upper-alpha" markdown>
1. It has infinite duration and unit amplitude
2. It equals 1 at $t = 0$ and 0 everywhere else
3. It satisfies the sifting property: $\int_{-\infty}^{\infty} f(t)\delta(t-t_0) dt = f(t_0)$
4. It represents a rectangular pulse of unit area
</div>

??? question "Show Answer"
    The correct answer is **C**. The unit impulse function is defined through its sifting property: $\int_{-\infty}^{\infty} f(t)\delta(t-t_0) dt = f(t_0)$. This represents an infinitely narrow, infinitely tall pulse with unit area. The impulse response of a system (its output when the input is an impulse) completely characterizes the system's behavior for all possible inputs through convolution operations.

    **Concept Tested:** Unit Impulse Function

    **See:** [Unit Impulse Function](index.md#unit-impulse-function)

---

#### 7. For a sinusoidal signal $x(t) = A\cos(\omega t + \phi)$, what does the parameter $\omega$ represent?

<div class="upper-alpha" markdown>
1. The amplitude in volts
2. The phase angle in radians
3. The period in seconds
4. The angular frequency in radians per second
</div>

??? question "Show Answer"
    The correct answer is **D**. In the sinusoidal signal $x(t) = A\cos(\omega t + \phi)$, the parameter $\omega$ represents the angular frequency in radians per second, where $\omega = 2\pi f$ and $f$ is the frequency in Hertz. The amplitude is represented by $A$, the phase angle by $\phi$, and the period is $T = 2\pi/\omega = 1/f$.

    **Concept Tested:** Sinusoidal Signals, Signal Frequency

    **See:** [Sinusoidal Signals](index.md#sinusoidal-signals)

---

#### 8. Given a signal $x(t)$, what is the effect of the time shifting operation $y(t) = x(t - 3)$?

<div class="upper-alpha" markdown>
1. The signal is compressed by a factor of 3
2. The signal is delayed (shifted right) by 3 time units
3. The signal is advanced (shifted left) by 3 time units
4. The signal amplitude is multiplied by 3
</div>

??? question "Show Answer"
    The correct answer is **B**. The operation $y(t) = x(t - t_0)$ with $t_0 = 3 > 0$ delays the signal, shifting it to the right by 3 time units. A positive value of $t_0$ always delays the signal, while a negative value would advance it (shift left). Time shifting translates a signal forward or backward in time without changing its shape.

    **Concept Tested:** Time Shifting

    **See:** [Time Shifting](index.md#time-shifting)

---

#### 9. If you apply time scaling to signal $x(t)$ to create $y(t) = x(2t)$, what happens to the signal?

<div class="upper-alpha" markdown>
1. The signal is expanded (plays slower) and frequencies decrease
2. The signal is compressed (plays faster) and frequencies increase by factor 2
3. The signal is reversed in time
4. The signal amplitude is doubled
</div>

??? question "Show Answer"
    The correct answer is **B**. When $y(t) = x(at)$ with $a = 2 > 1$, the signal is compressed (plays faster), and all frequencies are increased by factor 2. Time scaling with $a > 1$ compresses the signal, while $0 < a < 1$ would expand it. The operation affects both the duration and frequency content of signals, with compression increasing frequencies and expansion decreasing them proportionally.

    **Concept Tested:** Time Scaling

    **See:** [Time Scaling](index.md#time-scaling)

---

#### 10. What distinguishes energy signals from power signals?

<div class="upper-alpha" markdown>
1. Energy signals have infinite energy and zero power; power signals have finite power
2. Energy signals have finite total energy and zero average power; power signals have infinite energy but finite average power
3. Energy signals are always periodic; power signals are always aperiodic
4. Energy signals exist only in digital systems; power signals exist only in analog systems
</div>

??? question "Show Answer"
    The correct answer is **B**. Energy signals possess finite total energy ($E = \int_{-\infty}^{\infty} |x(t)|^2 dt < \infty$) and consequently have zero average power. Power signals have infinite energy but finite average power ($P = \lim_{T \to \infty} \frac{1}{2T} \int_{-T}^{T} |x(t)|^2 dt < \infty$). Energy signals are necessarily time-limited or decay rapidly, while periodic signals constitute the primary class of power signals due to their indefinite repetition.

    **Concept Tested:** Energy Signals, Power Signals

    **See:** [Energy and Power Classifications](index.md#energy-and-power-classifications)

---
