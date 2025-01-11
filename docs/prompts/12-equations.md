# Generating Signal Processing Equations

### Prompt

!!! prompt
    Create a list of the 25 most commonly used
    equations in a college level signal processing course.

    For each equation, return the following:

    1. The name of the equation in markdown level 4.
    2. Within the body, return the equation in LaTeX format
    3. Surround the equation with dollar signs
    4. For each variable in the equation, add a "where:" that defines each variable
    5. Put blank lines around the list of variables
    6. Wrap the variables names in dollar signs

    Examples:

    #### Slope and Intercept
    $y = m * x + b$

    where:

    - $y$ is the vertical axis
    - $x$ is the horizontal axis
    - $m$ is the slope
    - $b$ is the intercept

    #### Area of a Circle
    $A = 2\pi r^2$
    where:

    - $A$ is the area of the circle
    - $r$ is the radius

After the first 25 equations were generated I used the following prompt:

!!! prompt
    Excellent! Please continue with the next 25 most commonly used equations in a signal processing course.

## Responses

Note that the 100 top equations are group in four ranges:

1. [1-25](#equations-1-25)
2. [26-50](#equations-25-50)
3. [50-75](#equations-50-75)
4. [75-100](#equations-75-100)

### Equations 1-25

#### Discrete Fourier Transform (DFT)
$X[k] = \sum_{n=0}^{N-1} x[n]e^{-j2\pi kn/N}$

where:

- $X[k]$ is the frequency domain representation
- $x[n]$ is the time domain signal
- $N$ is the number of samples
- $k$ is the frequency index
- $n$ is the time index

#### Inverse Discrete Fourier Transform (IDFT)
$x[n] = \frac{1}{N}\sum_{k=0}^{N-1} X[k]e^{j2\pi kn/N}$

where:

- $x[n]$ is the reconstructed time domain signal
- $X[k]$ is the frequency domain representation
- $N$ is the number of samples
- $k$ is the frequency index
- $n$ is the time index

#### Sampling Theorem (Nyquist Rate)
$f_s \geq 2f_{max}$

where:

- $f_s$ is the sampling frequency
- $f_{max}$ is the highest frequency component in the signal

#### Z-Transform
$X(z) = \sum_{n=-\infty}^{\infty} x[n]z^{-n}$

where:

- $X(z)$ is the z-domain representation
- $x[n]$ is the time domain signal
- $z$ is the complex variable
- $n$ is the time index

#### Inverse Z-Transform
$x[n] = \frac{1}{2\pi j}\oint_C X(z)z^{n-1}dz$

where:

- $x[n]$ is the time domain signal
- $X(z)$ is the z-domain representation
- $C$ is the contour of integration
- $z$ is the complex variable

#### Convolution Sum
$y[n] = x[n] * h[n] = \sum_{k=-\infty}^{\infty} x[k]h[n-k]$

where:

- $y[n]$ is the output signal
- $x[n]$ is the input signal
- $h[n]$ is the impulse response
- $k$ is the summation index

#### Correlation
$R_{xy}[n] = \sum_{k=-\infty}^{\infty} x[k]y[k+n]$

where:

- $R_{xy}[n]$ is the correlation sequence
- $x[k]$ is the first signal
- $y[k]$ is the second signal
- $n$ is the lag variable

#### Power Spectral Density
$P_{xx}(e^{j\omega}) = \sum_{n=-\infty}^{\infty} R_{xx}[n]e^{-j\omega n}$

where:

- $P_{xx}(e^{j\omega})$ is the power spectral density
- $R_{xx}[n]$ is the autocorrelation sequence
- $\omega$ is the angular frequency
- $n$ is the lag variable

#### First Difference Equation
$y[n] = y[n-1] + x[n]$

where:

- $y[n]$ is the output signal
- $x[n]$ is the input signal
- $n$ is the time index

#### Moving Average Filter
$y[n] = \frac{1}{M}\sum_{k=0}^{M-1} x[n-k]$

where:

- $y[n]$ is the filtered output
- $x[n]$ is the input signal
- $M$ is the number of points in the average
- $k$ is the summation index

#### IIR Filter General Form
$y[n] = \sum_{k=0}^{M} b_k x[n-k] - \sum_{k=1}^{N} a_k y[n-k]$

where:

- $y[n]$ is the filter output
- $x[n]$ is the filter input
- $b_k$ are the feedforward coefficients
- $a_k$ are the feedback coefficients
- $M$ is the feedforward filter order
- $N$ is the feedback filter order

#### Frequency Response
$H(e^{j\omega}) = \sum_{n=-\infty}^{\infty} h[n]e^{-j\omega n}$

where:

- $H(e^{j\omega})$ is the frequency response
- $h[n]$ is the impulse response
- $\omega$ is the angular frequency
- $n$ is the time index

#### Phase Response
$\phi(\omega) = \tan^{-1}\left(\frac{\Im\{H(e^{j\omega})\}}{\Re\{H(e^{j\omega})\}}\right)$

where:

- $\phi(\omega)$ is the phase response
- $H(e^{j\omega})$ is the frequency response
- $\omega$ is the angular frequency
- $\Im$ represents the imaginary part
- $\Re$ represents the real part

#### Magnitude Response
$|H(e^{j\omega})| = \sqrt{\Re\{H(e^{j\omega})\}^2 + \Im\{H(e^{j\omega})\}^2}$

where:

- $|H(e^{j\omega})|$ is the magnitude response
- $H(e^{j\omega})$ is the frequency response
- $\omega$ is the angular frequency
- $\Im$ represents the imaginary part
- $\Re$ represents the real part

#### Group Delay
$\tau_g(\omega) = -\frac{d\phi(\omega)}{d\omega}$

where:

- $\tau_g(\omega)$ is the group delay
- $\phi(\omega)$ is the phase response
- $\omega$ is the angular frequency

#### Parseval's Theorem
$\sum_{n=-\infty}^{\infty} |x[n]|^2 = \frac{1}{2\pi}\int_{-\pi}^{\pi} |X(e^{j\omega})|^2 d\omega$

where:

- $x[n]$ is the time domain signal
- $X(e^{j\omega})$ is the frequency domain representation
- $\omega$ is the angular frequency

#### Discrete-Time Fourier Transform (DTFT)
$X(e^{j\omega}) = \sum_{n=-\infty}^{\infty} x[n]e^{-j\omega n}$

where:

- $X(e^{j\omega})$ is the frequency domain representation
- $x[n]$ is the time domain signal
- $\omega$ is the angular frequency
- $n$ is the time index

#### Window Function (Hamming)
$w[n] = 0.54 - 0.46\cos(\frac{2\pi n}{N-1})$

where:

- $w[n]$ is the window function value
- $n$ is the sample index
- $N$ is the window length

#### Discrete Cosine Transform (DCT)
$X[k] = \sum_{n=0}^{N-1} x[n]\cos[\frac{\pi k(2n+1)}{2N}]$

where:

- $X[k]$ is the DCT coefficient
- $x[n]$ is the input signal
- $N$ is the number of samples
- $k$ is the frequency index
- $n$ is the time index

#### Energy of a Signal
$E = \sum_{n=-\infty}^{\infty} |x[n]|^2$

where:

- $E$ is the total energy
- $x[n]$ is the signal
- $n$ is the time index

#### Power of a Signal
$P = \lim_{N\to\infty} \frac{1}{2N+1}\sum_{n=-N}^{N} |x[n]|^2$

where:

- $P$ is the average power
- $x[n]$ is the signal
- $N$ is the number of samples

#### Decimation Equation
$y[n] = x[Mn]$

where:

- $y[n]$ is the decimated signal
- $x[n]$ is the input signal
- $M$ is the decimation factor
- $n$ is the time index

#### Interpolation Equation
$y[n] = \begin{cases} x[n/L] & \text{if } n/L \text{ is integer} \\ 0 & \text{otherwise} \end{cases}$

where:

- $y[n]$ is the interpolated signal
- $x[n]$ is the input signal
- $L$ is the interpolation factor
- $n$ is the time index

#### Signal-to-Noise Ratio (SNR)
$SNR = 10\log_{10}\left(\frac{P_{signal}}{P_{noise}}\right)$

where:

- $SNR$ is the signal-to-noise ratio in dB
- $P_{signal}$ is the power of the signal
- $P_{noise}$ is the power of the noise

#### Circular Convolution
$y[n] = \sum_{k=0}^{N-1} x[k]h[(n-k)_N]$

where:

- $y[n]$ is the output signal
- $x[n]$ is the input signal
- $h[n]$ is the impulse response
- $N$ is the period of the circular convolution
- $(n-k)_N$ denotes modulo-N operation

I'll continue with the next 25 common signal processing equations following the same format.

### Equations 25-50 

#### Fast Fourier Transform (Radix-2 Decimation in Time)
$X[k] = \sum_{n=0}^{N/2-1} x[2n]W_N^{2nk} + W_N^k\sum_{n=0}^{N/2-1} x[2n+1]W_N^{2nk}$

where:

- $X[k]$ is the frequency domain output
- $x[n]$ is the time domain input
- $W_N^k = e^{-j2\pi k/N}$ is the twiddle factor
- $N$ is the number of points (power of 2)
- $k$ is the frequency index
- $n$ is the time index

#### Goertzel Algorithm
$y[n] = 2\cos(2\pi f_0/f_s)y[n-1] - y[n-2] + x[n]$

where:

- $y[n]$ is the filter output
- $x[n]$ is the input signal
- $f_0$ is the frequency of interest
- $f_s$ is the sampling frequency
- $n$ is the time index

#### Chirp Signal
$x[n] = \cos(2\pi(f_0n + \frac{\beta}{2}n^2))$

where:

- $x[n]$ is the chirp signal
- $f_0$ is the starting frequency
- $\beta$ is the rate of frequency change
- $n$ is the time index

#### Hilbert Transform (Discrete)
$h[n] = \begin{cases} \frac{2}{\pi n} & n \text{ odd} \\ 0 & n \text{ even} \end{cases}$

where:

- $h[n]$ is the Hilbert transform impulse response
- $n$ is the time index
- $\pi$ is pi (approximately 3.14159)

#### Cross-Correlation Coefficient
$\rho_{xy} = \frac{R_{xy}[0]}{\sqrt{R_{xx}[0]R_{yy}[0]}}$

where:

- $\rho_{xy}$ is the correlation coefficient
- $R_{xy}[0]$ is the cross-correlation at lag zero
- $R_{xx}[0]$ is the autocorrelation of x at lag zero
- $R_{yy}[0]$ is the autocorrelation of y at lag zero

#### Discrete Wavelet Transform
$W[j,k] = \sum_{n} x[n]2^{-j/2}\psi(2^{-j}n - k)$

where:

- $W[j,k]$ is the wavelet coefficient
- $x[n]$ is the input signal
- $\psi$ is the mother wavelet
- $j$ is the scale parameter
- $k$ is the translation parameter
- $n$ is the time index

#### Kalman Filter Prediction
$\hat{x}_{k|k-1} = F_k\hat{x}_{k-1|k-1}$

where:

- $\hat{x}_{k|k-1}$ is the state prediction
- $F_k$ is the state transition matrix
- $\hat{x}_{k-1|k-1}$ is the previous state estimate
- $k$ is the time step

#### Kalman Filter Update
$\hat{x}_{k|k} = \hat{x}_{k|k-1} + K_k(z_k - H_k\hat{x}_{k|k-1})$

where:

- $\hat{x}_{k|k}$ is the updated state estimate
- $K_k$ is the Kalman gain
- $z_k$ is the measurement
- $H_k$ is the measurement matrix
- $\hat{x}_{k|k-1}$ is the state prediction

#### Autocorrelation Function (Biased)
$R_{xx}[m] = \frac{1}{N}\sum_{n=0}^{N-|m|-1} x[n]x[n+|m|]$

where:

- $R_{xx}[m]$ is the autocorrelation function
- $x[n]$ is the signal
- $N$ is the number of samples
- $m$ is the lag
- $n$ is the time index

#### Levinson-Durbin Recursion
$a_m^{(m)} = k_m$
$a_i^{(m)} = a_i^{(m-1)} - k_ma_{m-i}^{(m-1)}$

where:

- $a_i^{(m)}$ are the reflection coefficients
- $k_m$ is the mth reflection coefficient
- $m$ is the order
- $i$ is the coefficient index

#### LMS Adaptive Filter
$w[n+1] = w[n] + \mu e[n]x[n]$

where:

- $w[n]$ is the filter coefficient vector
- $\mu$ is the step size
- $e[n]$ is the error signal
- $x[n]$ is the input signal vector
- $n$ is the time index

#### NLMS Adaptive Filter
$w[n+1] = w[n] + \frac{\mu}{||x[n]||^2}e[n]x[n]$

where:

- $w[n]$ is the filter coefficient vector
- $\mu$ is the step size
- $e[n]$ is the error signal
- $x[n]$ is the input signal vector
- $||x[n]||^2$ is the squared norm of the input vector

#### RLS Adaptive Filter
$w[n] = w[n-1] + k[n]e[n]$

where:

- $w[n]$ is the filter coefficient vector
- $k[n]$ is the gain vector
- $e[n]$ is the a priori error
- $n$ is the time index

#### Bandwidth
$BW = f_H - f_L$

where:

- $BW$ is the bandwidth
- $f_H$ is the upper cutoff frequency
- $f_L$ is the lower cutoff frequency

#### Quality Factor
$Q = \frac{f_c}{BW}$

where:

- $Q$ is the quality factor
- $f_c$ is the center frequency
- $BW$ is the bandwidth

#### Polyphase Decomposition
$H(z) = \sum_{k=0}^{M-1} z^{-k}E_k(z^M)$

where:

- $H(z)$ is the transfer function
- $E_k(z)$ are the polyphase components
- $M$ is the number of phases
- $k$ is the phase index

#### Instantaneous Frequency
$f_i[n] = \frac{1}{2\pi}\frac{d\phi[n]}{dn}$

where:

- $f_i[n]$ is the instantaneous frequency
- $\phi[n]$ is the instantaneous phase
- $n$ is the time index

#### Discrete Sine Transform
$X[k] = \sum_{n=0}^{N-1} x[n]\sin[\frac{\pi(k+1)(n+1)}{N+1}]$

where:

- $X[k]$ is the transform coefficient
- $x[n]$ is the input signal
- $N$ is the number of samples
- $k$ is the frequency index
- $n$ is the time index

#### Complex Envelope
$z[n] = x[n] + j\hat{x}[n]$

where:

- $z[n]$ is the complex envelope
- $x[n]$ is the original signal
- $\hat{x}[n]$ is the Hilbert transform
- $n$ is the time index

#### Matched Filter
$h[n] = s[L-1-n]$

where:

- $h[n]$ is the filter impulse response
- $s[n]$ is the signal to be detected
- $L$ is the signal length
- $n$ is the time index

#### Peak Signal-to-Noise Ratio
$PSNR = 10\log_{10}\left(\frac{MAX^2}{MSE}\right)$

where:

- $PSNR$ is the peak signal-to-noise ratio
- $MAX$ is the maximum possible signal value
- $MSE$ is the mean squared error

#### Frequency Response of Moving Average
$H(e^{j\omega}) = \frac{\sin(\omega M/2)}{M\sin(\omega/2)}e^{-j\omega(M-1)/2}$

where:

- $H(e^{j\omega})$ is the frequency response
- $M$ is the filter length
- $\omega$ is the angular frequency

#### Cepstrum
$c[n] = \mathcal{F}^{-1}\{\log|\mathcal{F}\{x[n]\}|\}$

where:

- $c[n]$ is the cepstrum
- $x[n]$ is the input signal
- $\mathcal{F}$ represents the Fourier transform
- $\mathcal{F}^{-1}$ represents the inverse Fourier transform
- $n$ is the time index

#### Linear Prediction
$\hat{x}[n] = -\sum_{k=1}^{p} a_k x[n-k]$

where:

- $\hat{x}[n]$ is the predicted sample
- $x[n]$ is the input signal
- $a_k$ are the prediction coefficients
- $p$ is the prediction order
- $k$ is the coefficient index

### Equations 50-75

I'll continue with the next 25 common signal processing equations, focusing on more specialized topics and advanced concepts.

#### Bilinear Transform
$s = \frac{2}{T}\frac{1-z^{-1}}{1+z^{-1}}$

where:

- $s$ is the continuous-time complex frequency
- $z$ is the discrete-time complex frequency
- $T$ is the sampling period

#### Yule-Walker Equations
$R_{xx}[m] = -\sum_{k=1}^p a_k R_{xx}[m-k]$

where:

- $R_{xx}[m]$ is the autocorrelation sequence
- $a_k$ are the AR coefficients
- $p$ is the model order
- $m$ is the lag
- $k$ is the coefficient index

#### Zero-Phase Filter
$H_{zp}(z) = H(z)H(z^{-1})$

where:

- $H_{zp}(z)$ is the zero-phase filter
- $H(z)$ is the original filter
- $z$ is the complex frequency variable

#### Gabor Transform
$X[n,k] = \sum_{m=-\infty}^{\infty} x[m]w[n-m]e^{-j2\pi km/N}$

where:

- $X[n,k]$ is the time-frequency representation
- $x[m]$ is the input signal
- $w[n]$ is the window function
- $N$ is the number of frequency points
- $n$ is the time index
- $k$ is the frequency index

#### Bartlett Window
$w[n] = 1 - |\frac{2n}{N-1} - 1|$

where:

- $w[n]$ is the window function value
- $n$ is the sample index
- $N$ is the window length

#### Compression Ratio
$CR = \frac{n_{bits_{original}}}{n_{bits_{compressed}}}$

where:

- $CR$ is the compression ratio
- $n_{bits_{original}}$ is the number of bits in original signal
- $n_{bits_{compressed}}$ is the number of bits after compression

#### Coherence Function
$\gamma_{xy}^2(f) = \frac{|P_{xy}(f)|^2}{P_{xx}(f)P_{yy}(f)}$

where:

- $\gamma_{xy}^2(f)$ is the coherence function
- $P_{xy}(f)$ is the cross-spectral density
- $P_{xx}(f)$ and $P_{yy}(f)$ are power spectral densities
- $f$ is the frequency

#### Multi-Rate Noble Identity 1
$H(z^M)↓M = ↓MH(z)$

where:

- $H(z)$ is the transfer function
- $M$ is the decimation factor
- $↓M$ represents decimation by M

#### Savitzky-Golay Filter
$y[n] = \sum_{k=-M}^{M} h[k]x[n+k]$

where:

- $y[n]$ is the filtered output
- $x[n]$ is the input signal
- $h[k]$ are the Savitzky-Golay coefficients
- $M$ is the half-width of the window
- $n$ is the time index

#### Phase Delay
$\tau_p(\omega) = -\frac{\phi(\omega)}{\omega}$

where:

- $\tau_p(\omega)$ is the phase delay
- $\phi(\omega)$ is the phase response
- $\omega$ is the angular frequency

#### Kaiser Window
$w[n] = \frac{I_0(\beta\sqrt{1-((n-\alpha)/\alpha)^2})}{I_0(\beta)}$

where:

- $w[n]$ is the window function value
- $I_0$ is the modified Bessel function
- $\beta$ is the shape parameter
- $\alpha$ is $(N-1)/2$
- $N$ is the window length
- $n$ is the sample index

#### Median Filter
$y[n] = \text{median}\{x[n-M],...,x[n],...,x[n+M]\}$

where:

- $y[n]$ is the filtered output
- $x[n]$ is the input signal
- $M$ is the half-width of the window
- $n$ is the time index

#### Envelope Detection
$e[n] = |x[n] + j\hat{x}[n]|$

where:

- $e[n]$ is the envelope
- $x[n]$ is the input signal
- $\hat{x}[n]$ is the Hilbert transform
- $n$ is the time index

#### Total Harmonic Distortion
$THD = \sqrt{\frac{\sum_{n=2}^{N} V_n^2}{V_1^2}}$

where:

- $THD$ is the total harmonic distortion
- $V_n$ is the voltage of the nth harmonic
- $V_1$ is the voltage of the fundamental frequency
- $N$ is the number of harmonics considered

#### Frequency Modulation
$x[n] = A\cos(2\pi f_cn + \beta\sin(2\pi f_mn))$

where:

- $x[n]$ is the FM signal
- $A$ is the amplitude
- $f_c$ is the carrier frequency
- $f_m$ is the modulating frequency
- $\beta$ is the modulation index
- $n$ is the time index

#### Amplitude Modulation
$x[n] = A_c(1 + \mu m[n])\cos(2\pi f_cn)$

where:

- $x[n]$ is the AM signal
- $A_c$ is the carrier amplitude
- $\mu$ is the modulation index
- $m[n]$ is the modulating signal
- $f_c$ is the carrier frequency
- $n$ is the time index

#### Complementary Filter
$H_1(z) + H_2(z) = 1$

where:

- $H_1(z)$ is the first filter transfer function
- $H_2(z)$ is the second filter transfer function
- $z$ is the complex frequency variable

#### Barker Code Correlation
$R[k] = \sum_{n=0}^{N-1} b[n]b[n+k]$

where:

- $R[k]$ is the autocorrelation function
- $b[n]$ is the Barker sequence
- $N$ is the sequence length
- $k$ is the lag
- $n$ is the time index

#### Notch Filter Transfer Function
$H(z) = \frac{1 - 2\cos(\omega_0)z^{-1} + z^{-2}}{1 - 2r\cos(\omega_0)z^{-1} + r^2z^{-2}}$

where:

- $H(z)$ is the transfer function
- $\omega_0$ is the notch frequency
- $r$ is the pole radius
- $z$ is the complex frequency variable

#### Raised Cosine Filter
$H(f) = \begin{cases} T, & |f| \leq \frac{1-\alpha}{2T} \\ \frac{T}{2}[1 + \cos(\frac{\pi T}{\alpha}(|f| - \frac{1-\alpha}{2T}))], & \frac{1-\alpha}{2T} \leq |f| \leq \frac{1+\alpha}{2T} \\ 0, & \text{otherwise} \end{cases}$

where:

- $H(f)$ is the frequency response
- $T$ is the symbol period
- $\alpha$ is the roll-off factor
- $f$ is the frequency

#### Golay Complementary Sequences
$G_A(z)G_A(z^{-1}) + G_B(z)G_B(z^{-1}) = 2N$

where:

- $G_A(z)$ is the z-transform of the first sequence
- $G_B(z)$ is the z-transform of the second sequence
- $N$ is the sequence length
- $z$ is the complex frequency variable

#### Walsh Transform
$W[k] = \sum_{n=0}^{N-1} x[n]wal(k,n)$

where:

- $W[k]$ is the Walsh transform coefficient
- $x[n]$ is the input signal
- $wal(k,n)$ is the Walsh function
- $N$ is the number of points
- $k$ is the sequency index
- $n$ is the time index

#### Normalized Cross-Correlation
$\rho[m] = \frac{\sum_{n} (x[n]-\bar{x})(y[n+m]-\bar{y})}{\sqrt{\sum_{n} (x[n]-\bar{x})^2\sum_{n} (y[n]-\bar{y})^2}}$

where:

- $\rho[m]$ is the normalized correlation
- $x[n]$ and $y[n]$ are the signals
- $\bar{x}$ and $\bar{y}$ are the means
- $m$ is the lag
- $n$ is the time index

#### Zadoff-Chu Sequence
$x[n] = e^{-j\pi un(n+1)/N}$

where:

- $x[n]$ is the sequence value
- $u$ is the sequence root
- $N$ is the sequence length
- $n$ is the time index

#### Maximum Length Sequence
$s[n] = s[n-p] \oplus s[n-q]$

where:

- $s[n]$ is the sequence value
- $p$ and $q$ are the tap positions
- $\oplus$ represents modulo-2 addition
- $n$ is the time index

### Equations 75-100

I'll continue with the next 25 equations, focusing on more specialized signal processing concepts and applications.

#### Multi-Channel Wiener Filter
$\mathbf{W} = \mathbf{R}_{xx}^{-1}\mathbf{R}_{xy}$

where:

- $\mathbf{W}$ is the filter coefficient matrix
- $\mathbf{R}_{xx}$ is the input correlation matrix
- $\mathbf{R}_{xy}$ is the cross-correlation matrix

#### Costas Loop Phase Error
$e[n] = I[n]Q'[n] - I'[n]Q[n]$

where:

- $e[n]$ is the phase error signal
- $I[n]$ is the in-phase component
- $Q[n]$ is the quadrature component
- $I'[n]$ and $Q'[n]$ are the derivatives

#### Discrete Hartley Transform
$H[k] = \sum_{n=0}^{N-1} x[n]cas(\frac{2\pi kn}{N})$

where:

- $H[k]$ is the transform coefficient
- $x[n]$ is the input signal
- $cas(\theta) = \cos(\theta) + \sin(\theta)$
- $N$ is the transform length
- $k$ is the frequency index

#### Exponential Moving Average
$y[n] = \alpha x[n] + (1-\alpha)y[n-1]$

where:

- $y[n]$ is the filtered output
- $x[n]$ is the input signal
- $\alpha$ is the smoothing factor
- $n$ is the time index

#### Rician K-Factor
$K = \frac{A^2}{2\sigma^2}$

where:

- $K$ is the Rician K-factor
- $A$ is the amplitude of the dominant signal
- $\sigma^2$ is the variance of the multipath components

#### Periodogram
$P_{xx}(f) = \frac{1}{N}|X(f)|^2$

where:

- $P_{xx}(f)$ is the power spectral density
- $X(f)$ is the Fourier transform
- $N$ is the number of samples
- $f$ is the frequency

#### Teager Energy Operator
$\Psi[x[n]] = x^2[n] - x[n-1]x[n+1]$

where:

- $\Psi[x[n]]$ is the Teager energy
- $x[n]$ is the input signal
- $n$ is the time index

#### Adaptive Line Enhancer
$y[n] = \mathbf{w}^T[n]\mathbf{x}[n-\Delta]$

where:

- $y[n]$ is the filter output
- $\mathbf{w}[n]$ is the weight vector
- $\mathbf{x}[n]$ is the input vector
- $\Delta$ is the prediction delay

#### Modified DFT Filter Bank
$H_k(z) = H(zW_M^k)$

where:

- $H_k(z)$ is the kth bandpass filter
- $H(z)$ is the prototype filter
- $W_M = e^{-j2\pi/M}$ is the twiddle factor
- $M$ is the number of channels

#### Constant Q Transform
$X[k] = \sum_{n=0}^{N_k-1} x[n]w[n]e^{-j2\pi Qn/N_k}$

where:

- $X[k]$ is the transform coefficient
- $x[n]$ is the input signal
- $w[n]$ is the window function
- $Q$ is the quality factor
- $N_k$ is the window length for bin k

#### Short-Time Energy Function
$E[n] = \sum_{m=-\infty}^{\infty} (x[m]w[n-m])^2$

where:

- $E[n]$ is the short-time energy
- $x[m]$ is the input signal
- $w[n]$ is the window function
- $n$ is the frame index
- $m$ is the time index

#### Zero-Crossing Rate
$ZCR[n] = \sum_{m=-\infty}^{\infty} |\text{sign}(x[m]) - \text{sign}(x[m-1])|w[n-m]$

where:

- $ZCR[n]$ is the zero-crossing rate
- $x[m]$ is the input signal
- $w[n]$ is the window function
- $\text{sign}()$ is the signum function

#### Linear Predictive Coding Error
$e[n] = x[n] - \sum_{k=1}^{p} a_k x[n-k]$

where:

- $e[n]$ is the prediction error
- $x[n]$ is the input signal
- $a_k$ are the LPC coefficients
- $p$ is the prediction order
- $k$ is the coefficient index

#### Mel-Frequency Scale
$f_{mel} = 2595\log_{10}(1 + \frac{f}{700})$

where:

- $f_{mel}$ is the frequency in mel scale
- $f$ is the frequency in Hz

#### Bark Scale
$z = 13\arctan(0.00076f) + 3.5\arctan((f/7500)^2)$

where:

- $z$ is the frequency in Bark scale
- $f$ is the frequency in Hz

#### Phase Vocoder
$\phi_{out}[n] = \phi_{in}[n] + 2\pi f_{in}\frac{R_{out}}{R_{in}}$

where:

- $\phi_{out}[n]$ is the output phase
- $\phi_{in}[n]$ is the input phase
- $f_{in}$ is the input frequency
- $R_{out}$ is the output rate
- $R_{in}$ is the input rate

#### Wavelet Packet Transform
$W_{j,k,n}[m] = 2^{j/2}w_n(2^jm - k)$

where:

- $W_{j,k,n}[m]$ is the wavelet packet basis
- $w_n$ is the wavelet packet function
- $j$ is the scale parameter
- $k$ is the translation parameter
- $n$ is the oscillation parameter

#### Preemphasis Filter
$y[n] = x[n] - \alpha x[n-1]$

where:

- $y[n]$ is the filtered output
- $x[n]$ is the input signal
- $\alpha$ is the preemphasis coefficient
- $n$ is the time index

#### Modulation Transfer Function
$MTF(f) = \frac{|H(f)|}{|H(0)|}$

where:

- $MTF(f)$ is the modulation transfer function
- $H(f)$ is the system transfer function
- $f$ is the frequency

#### Karhunen-Loève Transform
$\Phi_k = \sum_{n=1}^{N} v_k[n]x[n]$

where:

- $\Phi_k$ is the KLT coefficient
- $v_k[n]$ is the kth eigenvector
- $x[n]$ is the input signal
- $N$ is the signal length

#### Adaptive Spectral Enhancement
$H(z) = \frac{1}{1 - \sum_{k=1}^{p} a_k z^{-k}}$

where:

- $H(z)$ is the enhancement filter
- $a_k$ are the prediction coefficients
- $p$ is the filter order
- $z$ is the complex frequency variable

#### Pitch Synchronous Overlap Add (PSOLA)
$y[n] = \sum_{m=-\infty}^{\infty} x[m]h[n-mT_0]$

where:

- $y[n]$ is the modified signal
- $x[m]$ is the input signal
- $h[n]$ is the synthesis window
- $T_0$ is the pitch period
- $n$ is the time index

#### Harmonic Plus Noise Model
$s[n] = h[n] + r[n]$

where:

- $s[n]$ is the total signal
- $h[n]$ is the harmonic component
- $r[n]$ is the noise residual
- $n$ is the time index

#### Goertzel Energy
$E_k = x_1^2[N] + x_2^2[N] - 2\cos(2\pi k/N)x_1[N]x_2[N]$

where:

- $E_k$ is the energy at frequency k
- $x_1[N]$ and $x_2[N]$ are Goertzel algorithm outputs
- $N$ is the block length
- $k$ is the frequency bin

#### Adaptive Noise Cancellation
$e[n] = d[n] - \mathbf{w}^T[n]\mathbf{x}[n]$

where:

- $e[n]$ is the error signal
- $d[n]$ is the desired signal
- $\mathbf{w}[n]$ is the filter coefficient vector
- $\mathbf{x}[n]$ is the reference noise vector