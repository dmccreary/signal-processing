# Signal Processing Concept Taxonomy

## Overview

This taxonomy organizes 200 signal processing concepts into 12 categories for better navigation, visualization, and curriculum design.

## Taxonomy Categories

### 1. MATH - Mathematical Foundations
**TaxonomyID**: `MATH`

**Description**: Fundamental mathematics concepts including calculus, linear algebra, complex numbers, probability, and statistics. These are prerequisite concepts that provide the mathematical language and tools for signal processing.

**Typical Concepts**: Real numbers, complex numbers, vectors, matrices, calculus, probability theory, trigonometry

**Target Size**: 15-20 concepts

---

### 2. SIG - Signal Fundamentals
**TaxonomyID**: `SIG`

**Description**: Core signal concepts including signal types (analog/digital, continuous/discrete), basic signal properties, signal operations, and fundamental signal representations.

**Typical Concepts**: Signals, signal types, periodic signals, signal properties, signal operations, time/frequency domains

**Target Size**: 20-25 concepts

---

### 3. SYS - Systems Theory
**TaxonomyID**: `SYS`

**Description**: System concepts including linearity, time-invariance, LTI systems, causality, stability, impulse response, convolution, and system characterization.

**Typical Concepts**: Systems, LTI systems, causality, stability, impulse response, convolution, transfer functions

**Target Size**: 18-22 concepts

---

### 4. SAMP - Sampling and Quantization
**TaxonomyID**: `SAMP`

**Description**: Concepts related to converting between analog and digital signals, including sampling theory, Nyquist theorem, aliasing, quantization, and ADC processes.

**Typical Concepts**: Sampling, sampling rate, Nyquist theorem, aliasing, quantization, ADC

**Target Size**: 12-15 concepts

---

### 5. FOUR - Fourier Analysis
**TaxonomyID**: `FOUR`

**Description**: Fourier-based transform methods including Fourier series, continuous Fourier transform, DFT, FFT, window functions, and spectral analysis.

**Typical Concepts**: Fourier series, Fourier transform, DFT, FFT, windows, spectral analysis

**Target Size**: 22-28 concepts

---

### 6. TRANS - Other Transforms
**TaxonomyID**: `TRANS`

**Description**: Non-Fourier transform methods including Laplace transform, Z-transform, STFT, wavelet transforms, and time-frequency analysis.

**Typical Concepts**: Laplace transform, Z-transform, wavelets, STFT, time-frequency analysis

**Target Size**: 12-16 concepts

---

### 7. FILT - Filtering Fundamentals
**TaxonomyID**: `FILT`

**Description**: Basic filtering concepts including filter types (LPF, HPF, BPF, BSF), filter characteristics, FIR vs IIR, and fundamental filter properties.

**Typical Concepts**: Filters, filter types, cutoff frequency, passband, stopband, FIR, IIR

**Target Size**: 20-25 concepts

---

### 8. FDES - Filter Design
**TaxonomyID**: `FDES`

**Description**: Filter design methodologies and specific filter implementations including Butterworth, Chebyshev, elliptic filters, and design algorithms.

**Typical Concepts**: Filter design methods, Butterworth, Chebyshev, filter specifications, implementation structures

**Target Size**: 18-22 concepts

---

### 9. ADV - Advanced DSP Topics
**TaxonomyID**: `ADV`

**Description**: Advanced signal processing techniques including adaptive filtering, correlation analysis, spectral density, signal estimation, and compression.

**Typical Concepts**: Adaptive filtering, LMS, RLS, correlation, PSD, Wiener filter, Kalman filter, compression

**Target Size**: 14-18 concepts

---

### 10. APP - Applications
**TaxonomyID**: `APP`

**Description**: Real-world application domains for signal processing including audio, image, communications, biomedical, radar, and sonar signal processing.

**Typical Concepts**: Audio processing, speech processing, image processing, communications, biomedical signals

**Target Size**: 8-12 concepts

---

### 11. AI - AI and Machine Learning
**TaxonomyID**: `AI`

**Description**: Machine learning and artificial intelligence concepts applied to signal processing, including neural networks, deep learning, and generative AI for educational applications.

**Typical Concepts**: Machine learning, neural networks, deep learning, CNNs, generative AI, feature extraction

**Target Size**: 8-12 concepts

---

### 12. MISC - Miscellaneous
**TaxonomyID**: `MISC`

**Description**: Concepts that don't fit cleanly into other categories or span multiple categories. Should contain less than 5% of total concepts.

**Typical Concepts**: Cross-cutting concepts, integration topics, special cases

**Target Size**: <10 concepts

---

## Distribution Guidelines

- Target even distribution across categories
- No single category should exceed 30% of total concepts (60 concepts)
- Foundation categories (MATH, SIG) can be slightly larger
- Application and AI categories can be smaller (8-12 concepts each)
- MISC should be minimal (<10 concepts)

## Usage

This taxonomy will be added as a column to the concept dependency CSV and used for:
- Color coding in graph visualizations
- Filtering and navigation in interactive tools
- Curriculum module organization
- Assessment categorization
- Learning path design
