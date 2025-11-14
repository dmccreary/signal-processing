# Time-Frequency Analysis and Advanced Topics

## Summary

This chapter covers spectrograms, time-frequency representations, and advanced analysis methods for non-stationary signals.

Students will explore 5 key concepts that are essential for understanding this area of signal processing. This material provides the foundation for concepts introduced in later chapters.

## Concepts Covered

This chapter covers the following 5 concepts from the learning graph:

186. Time-Frequency Analysis
187. Spectrogram
188. Wigner-Ville Distribution
189. Ambiguity Function
190. Compressed Sensing

## Prerequisites

This chapter builds on concepts from:

- [Chapter 1: Mathematical Foundations](../01-mathematical-foundations/index.md)
- [Chapter 6: Fourier Analysis Fundamentals](../06-fourier-analysis-fundamentals/index.md)
- [Chapter 7: DFT, FFT and Frequency Domain Analysis](../07-dft-fft-and-frequency-domain-analysis/index.md)
- [Chapter 8: Advanced Transforms](../08-advanced-transforms/index.md)

---

## Introduction

Many real-world signals exhibit time-varying frequency content that cannot be adequately characterized by traditional Fourier analysis, which assumes stationarity and provides no temporal localization of spectral components. Speech signals transition between phonemes with distinct spectral characteristics, music contains notes starting and ending at specific times, radar chirps sweep through frequency ranges, and biological signals like EEG exhibit transient events against varying background activity. Analyzing such non-stationary signals requires joint time-frequency representations that reveal how spectral content evolves over time.

This chapter explores advanced techniques for time-frequency analysis including spectrograms, the Wigner-Ville distribution, ambiguity functions, and compressed sensing. These methods extend beyond the short-time Fourier transform limitations by providing alternative representations optimized for specific signal characteristics and application requirements. Understanding these sophisticated analytical tools equips you to extract meaningful information from complex, time-varying signals across diverse signal processing domains.

## Time-Frequency Analysis Fundamentals

Time-frequency analysis addresses the fundamental limitation of classical Fourier analysis: the inability to simultaneously localize signal characteristics in both time and frequency domains. The uncertainty principle imposes fundamental limits on achievable joint resolution, but various time-frequency representations offer different tradeoffs suited to particular signal types.

### Motivation and Applications

Time-varying signals require analysis methods that capture spectral evolution. Consider speech signals where different phonemes exhibit distinct formant structures, musical performances where notes have specific onset times and durations, or communication signals employing frequency modulation. Standard Fourier analysis reveals which frequencies are present but not when they occur, while pure time-domain analysis shows when events happen but not their spectral content.

Time-frequency analysis enables:

- **Speech and audio**: Analyzing formant trajectories, detecting transients, separating harmonic and percussive content
- **Biomedical signals**: Identifying sleep stages from EEG, detecting arrhythmias in ECG
- **Radar and sonar**: Analyzing chirp signals, detecting Doppler shifts, target classification
- **Vibration analysis**: Machine fault detection, structural health monitoring
- **Communications**: Analyzing spread spectrum signals, interference characterization

### Time-Frequency Resolution Tradeoffs

The Heisenberg uncertainty principle establishes fundamental limits on simultaneous time-frequency resolution:

$$\Delta t \cdot \Delta f \geq \frac{1}{4\pi}$$

This relationship means that improving time localization (decreasing $\Delta t$) necessarily degrades frequency resolution (increasing $\Delta f$) and vice versa. No time-frequency representation can achieve arbitrarily fine resolution in both domains simultaneously.

Different time-frequency methods manage this tradeoff through:

- **Window selection**: Controlling analysis window duration and shape
- **Adaptive approaches**: Varying resolution across time-frequency plane
- **Alternative kernels**: Different mathematical formulations emphasizing various properties

Understanding these fundamental constraints guides appropriate method selection and parameter tuning for specific applications.

## Spectrogram Analysis and Interpretation

The spectrogram, introduced in Chapter 8 as the magnitude squared of the short-time Fourier transform, provides the most widely used time-frequency representation. Its intuitive visualization and computational efficiency make it the standard tool for initial time-frequency analysis across many domains.

### Mathematical Foundation

The spectrogram of signal $x(t)$ with analysis window $w(t)$ is:

$$S(t,f) = \left|\int_{-\infty}^{\infty} x(\tau)w(\tau-t)e^{-j2\pi f\tau}d\tau\right|^2$$

For discrete-time signals:

$$S[m,k] = \left|\sum_{n=0}^{N-1} x[n+mH]w[n]e^{-j2\pi kn/N}\right|^2$$

where $m$ is the time frame index, $k$ is frequency bin, $N$ is window length, and $H$ is hop size between successive windows.

### Visualization and Interpretation

Spectrograms display time on the horizontal axis, frequency on the vertical axis, and intensity (magnitude or power) encoded as color or grayscale. Common interpretation patterns include:

**Horizontal structures**: Sustained tones produce horizontal bands at constant frequencies

**Vertical structures**: Transients and impulses create vertical lines across frequencies

**Diagonal trajectories**: Chirps and frequency sweeps appear as tilted lines

**Harmonic patterns**: Musical notes show multiple parallel horizontal bands at fundamental and harmonic frequencies

**Formant structure**: Speech vowels display broad resonant regions (formants) that shift with articulation

### Window Selection Impact

Window choice critically affects spectrogram characteristics:

- **Rectangular**: Narrowest main lobe but highest sidelobes, rarely used
- **Hamming/Hann**: Good general-purpose windows balancing main lobe width and sidelobe suppression
- **Gaussian**: Achieves minimum time-frequency uncertainty product
- **Kaiser**: Adjustable parameter controls main lobe vs. sidelobe tradeoff

Longer windows provide better frequency resolution but poorer time localization, while shorter windows improve time resolution at the expense of frequency resolution. Typical window lengths range from 20-30 ms for speech to 50-100 ms for music analysis.

### Overlap and Hop Size

The hop size $H$ (spacing between successive analysis windows) affects:

- **Time resolution**: Smaller hop sizes produce finer time sampling
- **Computation**: Larger hop sizes reduce computational requirements
- **Visualization smoothness**: Greater overlap creates smoother spectrograms

Typical overlap ranges from 50% (hop size = window length / 2) to 87.5% (hop size = window length / 8), balancing smoothness and computation.

<details markdown="1">
<summary>MicroSim: Interactive Spectrogram Parameter Explorer</summary>

This simulation would enable deep exploration of spectrogram parameters:

- Load or synthesize test signals: speech, music, chirps, multi-component signals, noise
- Adjust spectrogram parameters:
  - Window type: rectangular, Hamming, Hann, Blackman, Gaussian, Kaiser
  - Window length: 16 to 4096 samples via slider
  - Hop size: 25% to 95% overlap
  - Frequency scale: linear or logarithmic
  - Color map: perceptually uniform options
- Display synchronized views:
  - Waveform with current analysis window position highlighted
  - Spectrogram with adjustable dynamic range
  - Frequency spectrum at selected time point
  - Time series at selected frequency
- Interactive cursor for precise time-frequency measurements
- Compare multiple parameter sets side-by-side

Students would develop intuition about how window parameters affect time-frequency resolution, understand tradeoffs between temporal and spectral clarity, and learn to select appropriate parameters for different signal types.

</details>

## Wigner-Ville Distribution

The Wigner-Ville distribution (WVD) provides an alternative time-frequency representation with superior resolution properties compared to spectrograms, achieving the theoretical minimum time-frequency uncertainty. However, this improved resolution comes at the cost of cross-term interference for multi-component signals.

### Mathematical Formulation

The WVD of continuous-time signal $x(t)$ is defined as:

$$W_x(t,f) = \int_{-\infty}^{\infty} x\left(t+\frac{\tau}{2}\right)x^*\left(t-\frac{\tau}{2}\right)e^{-j2\pi f\tau}d\tau$$

For discrete-time signals:

$$W_x[n,k] = 2\sum_{m=-\infty}^{\infty} x[n+m]x^*[n-m]e^{-j4\pi km/N}$$

This formulation computes the Fourier transform of the instantaneous autocorrelation function, providing a fundamentally different approach than windowed Fourier analysis.

### Properties and Characteristics

The WVD exhibits several mathematically desirable properties:

1. **Real-valued**: Always produces real values (unlike STFT which is complex)
2. **High resolution**: Achieves minimum time-frequency uncertainty product
3. **Correct marginals**: Time and frequency marginals match signal energy distributions
4. **Frequency shift covariance**: Shifts in frequency domain correspond to shifts in time-frequency plane
5. **Time shift covariance**: Shifts in time domain correspond to shifts in time-frequency plane

These properties make the WVD theoretically attractive for time-frequency analysis.

### Cross-Term Interference

The WVD's major limitation is cross-term interference for multi-component signals. For a signal with two components $x(t) = x_1(t) + x_2(t)$:

$$W_x(t,f) = W_{x_1}(t,f) + W_{x_2}(t,f) + 2\text{Re}\{W_{x_1,x_2}(t,f)\}$$

The cross-term $W_{x_1,x_2}(t,f)$ creates oscillatory interference patterns between signal components, often appearing as artifacts positioned midway between actual components. These cross-terms can obscure the true signal structure and complicate interpretation.

### Applications and Extensions

Despite cross-term issues, the WVD finds applications where high resolution justifies dealing with artifacts:

- **Single-component analysis**: Chirp parameter estimation, instantaneous frequency tracking
- **Radar signal processing**: Target detection and parameter estimation
- **Biomedical analysis**: Heart sound analysis, EEG micro-event detection

Variants like the pseudo-Wigner-Ville distribution and smoothed pseudo-Wigner-Ville distribution introduce smoothing kernels to suppress cross-terms while sacrificing some resolution. The Cohen's class of time-frequency distributions generalizes the WVD by introducing various kernel functions optimized for specific applications.

## Ambiguity Function

The ambiguity function, closely related to the Wigner-Ville distribution through Fourier duality, provides an alternative representation particularly valuable in radar and sonar signal processing for analyzing matched filter response characteristics and optimizing waveform design.

### Definition and Relationship to WVD

The ambiguity function of signal $x(t)$ is defined as:

$$A_x(\tau, f_d) = \int_{-\infty}^{\infty} x\left(t+\frac{\tau}{2}\right)x^*\left(t-\frac{\tau}{2}\right)e^{-j2\pi f_d t}dt$$

where $\tau$ is time delay and $f_d$ is Doppler frequency shift. The ambiguity function and Wigner-Ville distribution form a 2D Fourier transform pair:

$$A_x(\tau, f_d) = \int_{-\infty}^{\infty}\int_{-\infty}^{\infty} W_x(t,f)e^{j2\pi(f\tau - f_d t)}dtdf$$

This duality means information content is equivalent, but the ambiguity function domain ($\tau$, $f_d$) often provides more intuitive interpretation for radar applications.

### Radar and Sonar Applications

In radar systems, the ambiguity function characterizes matched filter response when the return signal is delayed by time $\tau$ (corresponding to target range) and Doppler shifted by frequency $f_d$ (corresponding to target velocity). The ambiguity function reveals:

- **Range resolution**: Determined by ambiguity function width in delay dimension
- **Velocity resolution**: Determined by width in Doppler dimension
- **Sidelobe structure**: Indicates potential ghost targets or interference
- **Optimization criteria**: Guide waveform design to achieve desired resolution properties

### Ambiguity Function Properties

Key properties guiding waveform design:

1. **Volume theorem**: Total volume under $|A_x(\tau, f_d)|^2$ is constant (conserved)
2. **Maximum at origin**: Peak occurs at $A_x(0,0) = E$ (signal energy)
3. **Symmetry**: $|A_x(\tau, f_d)| = |A_x(-\tau, -f_d)|$ for real signals
4. **Tradeoffs**: Improving resolution in one dimension degrades it in another (uncertainty principle)

Waveform designers manipulate signal characteristics (bandwidth, duration, modulation) to shape the ambiguity function for specific target detection and parameter estimation requirements. Linear FM chirps, phase-coded waveforms, and frequency-hopping patterns each produce distinct ambiguity function shapes optimized for different radar scenarios.

## Compressed Sensing

Compressed sensing (also called compressive sensing or compressive sampling) represents a paradigm shift in signal acquisition and reconstruction, enabling recovery of sparse or compressible signals from far fewer measurements than traditional Nyquist sampling requires. This revolutionary approach has transformed numerous signal processing applications by reducing sampling requirements, storage needs, and power consumption.

### Fundamental Principles

Compressed sensing exploits signal sparsity: most natural signals contain relatively few significant coefficients when represented in an appropriate basis. The key insight is that if a signal is sparse in some transform domain, it can be recovered from incomplete measurements through optimization rather than requiring complete Nyquist-rate sampling.

Three fundamental requirements enable compressed sensing:

1. **Sparsity**: Signal must be sparse or compressible in some representation (typically wavelet, DCT, or other transform domain)
2. **Incoherence**: Measurement basis must be incoherent with sparsity basis (randomly sampled measurements often satisfy this)
3. **Optimization**: Reconstruction employs convex optimization (typically $\ell_1$ minimization) to exploit sparsity

### Mathematical Framework

Consider signal $x \in \mathbb{R}^n$ that is $k$-sparse in transform domain $\Psi$, meaning $x = \Psi s$ where $s$ has only $k \ll n$ non-zero coefficients. We obtain $m$ random linear measurements:

$$y = \Phi x = \Phi\Psi s$$

where measurement matrix $\Phi \in \mathbb{R}^{m \times n}$ and $m \ll n$. Recovering $x$ from $y$ is underdetermined (more unknowns than equations), but sparsity enables unique recovery through:

$$\min_s ||s||_1 \text{ subject to } y = \Phi\Psi s$$

This $\ell_1$-minimization problem can be solved efficiently using convex optimization algorithms. Under appropriate conditions (restricted isometry property), perfect reconstruction is guaranteed with high probability when $m \geq C k \log(n/k)$ for some constant $C$—dramatically fewer samples than the $n$ required by Nyquist.

### Applications and Impact

Compressed sensing has revolutionized numerous domains:

**Medical imaging**: MRI acceleration acquires fewer k-space samples, reducing scan time while maintaining image quality. Patients benefit from shorter procedures and reduced motion artifacts.

**Imaging systems**: Single-pixel cameras, coded aperture imaging, and computational photography exploit compressed sensing for novel imaging modalities.

**Radar**: Achieve high-resolution imaging with reduced sampling rates and simplified hardware architectures.

**Wireless communications**: Spectrum sensing for cognitive radio, channel estimation in MIMO systems, and efficient data aggregation in sensor networks.

**Analog-to-digital conversion**: Modulated wideband converters (MWC) and random demodulation enable sub-Nyquist sampling of sparse wideband signals.

### Reconstruction Algorithms

Various algorithms solve the sparse reconstruction problem:

- **Basis pursuit**: Standard convex $\ell_1$ optimization using linear programming or interior point methods
- **Orthogonal matching pursuit (OMP)**: Greedy iterative algorithm selecting basis functions
- **Iterative shrinkage/thresholding**: Simple, fast algorithms alternating between measurement projection and soft thresholding
- **Approximate message passing**: Leverages statistical physics insights for efficient reconstruction

Recent deep learning approaches use neural networks trained to perform compressed sensing reconstruction, often outperforming classical optimization algorithms in speed and quality.

## Advanced Topics and Current Research Directions

Time-frequency analysis and compressed sensing represent active research areas with ongoing developments extending capabilities and discovering new applications.

### Multi-Window Spectrograms

Rather than using a single fixed window, multi-window methods employ several window functions with different lengths simultaneously, combining results to achieve improved time-frequency localization adapted to signal characteristics. This approach partially overcomes the fundamental resolution tradeoff by using narrow windows for transients and wide windows for sustained components.

### Synchrosqueezing Transform

The synchrosqueezing transform post-processes continuous wavelet or short-time Fourier transforms to improve frequency localization by reassigning time-frequency coefficients according to instantaneous frequency estimates. This technique produces sharper time-frequency representations while maintaining invertibility, useful for signals with well-separated components like chirps and harmonic decomposition.

### Sparse Time-Frequency Representations

Combining compressed sensing with time-frequency analysis enables sparse representations that adaptively select relevant time-frequency atoms rather than computing complete transforms. This reduces computational requirements and storage while potentially improving resolution and noise robustness.

### Machine Learning Integration

Modern approaches integrate classical time-frequency analysis with machine learning:

- **Feature extraction**: Spectrogram representations serve as inputs to convolutional neural networks for classification tasks (speech recognition, environmental sound classification, biomedical signal analysis)
- **Learned representations**: Auto-encoders discover optimal time-frequency-like representations from data
- **Denoi sing and enhancement**: Neural networks trained to remove artifacts from spectrograms and other time-frequency representations

## Summary

This chapter explored advanced techniques for analyzing non-stationary signals whose spectral characteristics evolve over time. Time-frequency analysis addresses the fundamental limitation of classical Fourier methods by providing joint time-frequency representations revealing how signal spectral content changes temporally.

Spectrograms, based on the short-time Fourier transform, provide intuitive and widely applicable time-frequency visualization with window selection controlling the fundamental tradeoff between time and frequency resolution. Proper parameter selection enables effective analysis across diverse applications from speech processing to vibration monitoring.

The Wigner-Ville distribution achieves superior time-frequency resolution through a fundamentally different mathematical formulation, though cross-term interference complicates interpretation for multi-component signals. Variants and extensions within Cohen's class provide flexibility to suppress artifacts while maintaining desirable properties for specific applications.

Ambiguity functions, dual to the Wigner-Ville distribution, characterize matched filter responses and guide waveform design for radar and sonar systems. Understanding delay-Doppler representations enables optimization of range and velocity resolution for target detection and parameter estimation.

Compressed sensing revolutionizes signal acquisition by exploiting sparsity to enable reconstruction from far fewer samples than Nyquist theory requires. This paradigm shift enables novel applications across medical imaging, communications, and sensing systems, with ongoing research developing improved reconstruction algorithms and discovering new application domains.

The final chapter examines practical signal processing applications and integration with modern artificial intelligence techniques, demonstrating how the theoretical foundations developed throughout this textbook enable real-world systems solving complex problems across diverse domains.
