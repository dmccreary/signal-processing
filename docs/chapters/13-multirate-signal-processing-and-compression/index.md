# Multirate Signal Processing and Compression

## Summary

This chapter examines multirate techniques including decimation, interpolation, and signal compression methods for efficient data representation.

Students will explore 10 key concepts that are essential for understanding this area of signal processing. This material provides the foundation for concepts introduced in later chapters.

## Concepts Covered

This chapter covers the following 10 concepts from the learning graph:

176. Multirate Signal Processing
177. Decimation
178. Interpolation
179. Upsampling
180. Downsampling
181. Signal Compression
182. Lossy Compression
183. Lossless Compression
184. Transform Coding
185. Huffman Coding

## Prerequisites

This chapter builds on concepts from:

- [Chapter 2: Introduction to Signals and Systems](../02-introduction-to-signals-and-systems/index.md)
- [Chapter 5: Sampling and Quantization](../05-sampling-and-quantization/index.md)
- [Chapter 6: Fourier Analysis Fundamentals](../06-fourier-analysis-fundamentals/index.md)

---

## Introduction

Multirate signal processing involves systems that operate on signals at different sampling rates, enabling efficient implementation of digital filters, flexible rate conversion, and sophisticated subband decomposition schemes. By strategically changing sampling rates throughout the processing chain, multirate techniques dramatically reduce computational requirements compared to single-rate implementations while enabling applications impossible at fixed rates. From sample rate conversion in digital audio to channel banks in telecommunications, multirate methods have become fundamental to modern signal processing system design.

Signal compression exploits redundancy and perceptual irrelevance to represent signals with fewer bits while preserving essential information, enabling efficient storage and transmission across bandwidth-limited channels. Understanding decimation, interpolation, and polyphase filter structures provides the foundation for efficient multirate implementations, while compression techniques including transform coding, predictive coding, and entropy coding enable modern multimedia applications from MP3 audio to JPEG images and H.264 video.

## Multirate Signal Processing Fundamentals

Multirate systems process signals at multiple sampling rates, changing rates through decimation (downsampling) and interpolation (upsampling) operations. These rate changes, combined with appropriate filtering, enable computational efficiency and flexible system designs.

### Benefits and Applications

Multirate processing provides several key advantages:

- **Computational efficiency**: Reduced rate means fewer operations per second
- **Flexible interfacing**: Connect systems operating at different native rates
- **Subband processing**: Analyze and manipulate specific frequency regions independently
- **Implementation efficiency**: Simplified filter designs at appropriate rates

Applications spanning signal processing domains include:

- **Sample rate conversion**: Audio between 44.1 kHz (CD) and 48 kHz (DAT/DVD)
- **Oversampling converters**: High-rate conversion with relaxed analog filtering
- **Digital communication**: Matched filtering, interpolation, symbol synchronization
- **Image processing**: Pyramidal decomposition, resolution conversion, zooming
- **Audio compression**: MP3, AAC use filter banks for perceptual coding

## Decimation and Downsampling

Decimation reduces the sampling rate by an integer factor M, keeping only every M-th sample while discarding the rest. This operation is fundamental to multirate processing but must be performed carefully to avoid aliasing.

### Downsampling Operation

The downsampling operation by factor M is mathematically defined as:

$$y[n] = x[nM]$$

In the frequency domain, downsampling causes the spectrum to be compressed and replicated M times across the frequency range $[-\pi, \pi]$:

$$Y(e^{j\omega}) = \frac{1}{M}\sum_{k=0}^{M-1} X\left(e^{j(\omega-2\pi k)/M}\right)$$

This spectral replication creates aliasing if the input signal contains frequency components above $\pi/M$ (half the new Nyquist frequency).

### Anti-Aliasing Filtering

To prevent aliasing, the input signal must be filtered before downsampling to eliminate frequency content above $\pi/M$. The decimation process therefore consists of two steps:

1. **Low-pass filtering**: Apply filter with cutoff frequency $\omega_c \leq \pi/M$
2. **Downsample**: Keep every M-th sample, discard others

The combined decimator is represented as:

$$y[n] = \left(h[k] * x[k]\right)\Big|_{k=nM}$$

where $h[k]$ is the anti-aliasing filter impulse response.

### Computational Considerations

A naive implementation filters at the high rate then downsamples, but this wastes computation on samples that will be discarded. Polyphase decomposition, discussed later, reorganizes the computation to operate primarily at the low output rate, reducing operations by approximately factor M.

## Interpolation and Upsampling

Interpolation increases the sampling rate by an integer factor L, inserting (L-1) zeros between each input sample, then filtering to remove spectral replications and smooth the result.

### Upsampling Operation

The upsampling operation by factor L inserts (L-1) zeros between samples:

$$y[n] = \begin{cases} x[n/L] & \text{if } n = 0, \pm L, \pm 2L, \ldots \\ 0 & \text{otherwise} \end{cases}$$

In the frequency domain, upsampling causes spectral compression without introducing new frequency content:

$$Y(e^{j\omega}) = X(e^{j\omega L})$$

The output spectrum repeats L times within $[-\pi, \pi]$, requiring lowpass filtering to remove the (L-1) spectral images.

### Interpolation Filtering

To reconstruct a smooth signal, the upsampled sequence is filtered with a lowpass interpolation filter with cutoff frequency $\omega_c \leq \pi/L$ and passband gain of L:

1. **Upsample**: Insert (L-1) zeros between samples
2. **Low-pass filtering**: Apply filter with cutoff $\omega_c \leq \pi/L$ and gain L

The combined interpolator is:

$$y[n] = L \cdot h[n] * u[n]$$

where $u[n]$ is the upsampled sequence and $h[n]$ is the interpolation filter.

### Polyphase Implementation

Direct implementation filters the upsampled signal containing (L-1) zeros out of every L samples, wasting computation multiplying by zero. Polyphase structure reorganizes computation to avoid these wasted multiplications, operating efficiently at the input rate for most computations.

## Fractional Rate Conversion

Many applications require non-integer rate changes, such as converting between 44.1 kHz and 48 kHz audio (ratio 147:160). Rational rate conversion achieves fractional factor L/M through cascaded interpolation by L and decimation by M.

### Combined Interpolation and Decimation

The fractional rate converter implements:

1. **Interpolate by L**: Increase rate to L times original
2. **Decimate by M**: Reduce rate to L/M times original

The intermediate high rate L times the input rate never needs to be explicitly computed—polyphase implementation performs the necessary filtering efficiently.

The combined filter must satisfy both interpolation and decimation requirements:

- Passband width: $\min(\pi/L, \pi/M)$
- Passband gain: L (to compensate for upsampling)
- Stopband attenuation: Sufficient to prevent aliasing from decimation

### Multistage Implementation

For large rate change factors, multistage cascaded conversion is more efficient than single-stage. The rate change L/M is factored as products of smaller rational factors:

$$\frac{L}{M} = \frac{L_1}{M_1} \cdot \frac{L_2}{M_2} \cdot \ldots \cdot \frac{L_K}{M_K}$$

Each stage operates at an intermediate rate, with filter complexities distributed across stages. Proper factorization minimizes total computational cost.

Typical strategies include:

- Use small prime factors (2, 3, 5) when possible
- Place stages with higher intermediate rates later in the chain
- Optimize filter lengths at each stage for computational efficiency

#### Diagram: Multirate Sample Rate Converter

<details markdown="1">
<summary>MicroSim: Multirate Sample Rate Converter</summary>

This simulation would demonstrate multirate conversion interactively:

- Generate test signals: sinusoids, chirps, speech, music
- Configure input and output sampling rates (or specify rational factor L/M)
- Select single-stage or multistage implementation
- Adjust filter parameters: length, window type, stopband attenuation
- View displays showing:
  - Input signal waveform and spectrum
  - Intermediate rate signals (if multistage)
  - Output signal waveform and spectrum
  - Frequency response of conversion filters
  - Computational complexity metrics (multiplications per output sample)
- Compare single-stage vs. optimized multistage implementations

Students would understand how upsampling creates spectral images, how downsampling causes aliasing without proper filtering, and how multistage structures dramatically reduce computational requirements for large rate changes.

</details>

## Signal Compression Fundamentals

Signal compression reduces the number of bits required to represent signals by exploiting redundancy (statistical dependencies) and irrelevance (perceptually insignificant information). Compression enables efficient storage and transmission across capacity-limited channels.

### Compression Metrics and Terminology

Key compression performance metrics include:

**Compression ratio** compares original to compressed sizes:

$$CR = \frac{\text{Original Size}}{\text{Compressed Size}}$$

**Bit rate** specifies compressed data rate in bits per second or bits per sample:

$$\text{Bit Rate} = \frac{\text{Compressed Bits}}{\text{Duration}}$$

**Quality metrics** quantify fidelity loss:

- **Mean Squared Error (MSE)**: $\frac{1}{N}\sum_{n=0}^{N-1}(x[n] - \hat{x}[n])^2$
- **Peak SNR (PSNR)**: $10\log_{10}(\frac{\text{MAX}^2}{\text{MSE}})$
- **Perceptual metrics**: Account for human perception characteristics

### Source Coding Theorem

Shannon's source coding theorem establishes fundamental compression limits. For a source with entropy $H$ bits per symbol, lossless compression cannot achieve average bit rates below $H$ without information loss. The entropy is:

$$H = -\sum_{i} p_i \log_2 p_i$$

where $p_i$ is the probability of symbol $i$. Highly redundant sources (low entropy) can be compressed more than random sources (high entropy approaching maximum).

## Lossy vs. Lossless Compression

Compression techniques are categorized based on whether perfect reconstruction is possible or if some information is permanently discarded.

### Lossless Compression

Lossless compression enables perfect reconstruction of the original signal from the compressed representation. Techniques exploit statistical redundancy without discarding information:

- **Run-length encoding**: Represents sequences of identical symbols efficiently
- **Huffman coding**: Assigns shorter codes to more probable symbols
- **Arithmetic coding**: Achieves compression approaching entropy limits
- **Dictionary methods**: LZ77, LZ78, LZW encode repeated patterns efficiently

Lossless compression is essential when perfect fidelity is required:

- Medical images (legal/diagnostic requirements)
- Text documents (no acceptable loss)
- Scientific data (analysis precision requirements)
- Archival storage (future access needs unknown)

Typical lossless compression ratios range from 1.5:1 to 4:1 depending on signal redundancy.

### Lossy Compression

Lossy compression permanently discards information deemed perceptually insignificant or less important, achieving much higher compression ratios. The key challenge is determining what to discard while maintaining acceptable quality.

Lossy techniques include:

- **Quantization**: Reduce precision of coefficients or samples
- **Transform coding**: Discard small-magnitude transform coefficients
- **Perceptual modeling**: Remove information below perception thresholds
- **Prediction**: Encode prediction errors rather than original samples

Lossy compression dominates multimedia applications:

- Audio: MP3 (10:1 to 12:1), AAC, Opus
- Images: JPEG (10:1 to 50:1), WebP
- Video: H.264/AVC (50:1 to 200:1), H.265/HEVC

The compression ratio vs. quality tradeoff is controlled through bit rate or quality parameters.

## Transform Coding

Transform coding represents signals in alternative domains where energy compaction concentrates most signal energy in a few coefficients, enabling efficient compression by quantizing and encoding only significant coefficients.

### Transform Selection

Effective transforms for compression exhibit:

- **Energy compaction**: Few large coefficients, many near-zero coefficients
- **Decorrelation**: Transform coefficients uncorrelated (independent)
- **Fast computation**: Efficient algorithms for practical implementation
- **Invertibility**: Perfect reconstruction possible from transform domain

Common transforms include:

**Discrete Cosine Transform (DCT)**: Optimal for highly correlated signals, forms basis of JPEG and MPEG standards. The DCT provides excellent energy compaction for smooth, correlated image blocks.

**Wavelet Transform**: Provides multiresolution analysis with good localization in both time/space and frequency, used in JPEG2000 and modern audio codecs.

**Karhunen-Lo\u00e8ve Transform (KLT)**: Theoretically optimal for given signal statistics but requires computing signal-dependent basis functions, limiting practical use.

### JPEG Image Compression

JPEG (Joint Photographic Experts Group) exemplifies transform coding principles:

1. **Block decomposition**: Divide image into 8×8 pixel blocks
2. **2D DCT**: Transform each block to frequency domain
3. **Quantization**: Coarsely quantize high-frequency coefficients
4. **Zigzag scan**: Order coefficients from low to high frequency
5. **Entropy coding**: Apply Huffman or arithmetic coding

The quantization table determines quality vs. compression tradeoff, with human visual perception guiding quantization strength across frequencies. Low frequencies (visually important) use fine quantization while high frequencies (less visible) use coarse quantization.

### Rate-Distortion Optimization

Transform coding involves allocating bits across transform coefficients to minimize distortion for a target bit rate (or equivalently, minimize bit rate for target quality). This optimization problem is solved through:

- **Bit allocation algorithms**: Distribute bits based on coefficient statistics
- **Lagrangian optimization**: Balance rate and distortion with parameter $\lambda$
- **Perceptual weighting**: Account for human perception sensitivities

Modern codecs employ sophisticated rate-distortion optimization during encoding to achieve maximum compression for desired quality.

## Huffman Coding and Entropy Coding

Entropy coding achieves compression by assigning shorter codewords to more frequent symbols and longer codewords to rarer symbols, approaching the entropy bound for lossless compression.

### Huffman Coding

Huffman coding constructs optimal prefix-free codes given symbol probabilities through a bottom-up tree construction algorithm:

1. **Order symbols** by probability
2. **Combine** two least probable symbols into parent node
3. **Repeat** until single root node remains
4. **Assign codes** by traversing tree from root to leaves

The resulting variable-length codes satisfy the prefix property (no code is a prefix of another) enabling unambiguous decoding. Huffman coding is optimal for integer-length codes and widely used in JPEG, MPEG, and data compression utilities.

### Arithmetic Coding

Arithmetic coding represents message sequences as intervals within [0,1), achieving compression arbitrarily close to entropy limits. Unlike Huffman coding which assigns integer bit lengths, arithmetic coding allows fractional bits per symbol.

The algorithm:

1. **Initialize** interval to [0,1)
2. **For each symbol**, subdivide interval proportionally to symbol probabilities
3. **Final interval** is represented as binary fraction

Arithmetic coding outperforms Huffman coding for highly skewed probability distributions and is used in modern image and video compression standards (JPEG2000, H.264/AVC, H.265/HEVC).

### Adaptive Entropy Coding

Adaptive methods update probability models as data is encoded, handling non-stationary sources more effectively than fixed models. Both encoder and decoder maintain synchronized models, avoiding overhead of transmitting probability tables.

## Applications: Audio and Image Compression

Multirate and compression techniques underpin modern multimedia standards that enable practical storage and transmission of audio, images, and video.

### Audio Compression (MP3)

MP3 (MPEG-1 Audio Layer 3) achieves 10:1 to 12:1 compression while maintaining near-CD quality through psychoacoustic modeling:

1. **Filter bank**: 32-band polyphase filter bank divides spectrum
2. **Psychoacoustic model**: Identifies masked frequency components
3. **Quantization**: Allocates bits based on perceptual importance
4. **Huffman coding**: Entropy codes quantized values

Critical features include:

- Exploiting frequency masking (loud sounds mask nearby quiet sounds)
- Temporal masking (pre- and post-masking around transients)
- Bit reservoir for variable bit rate encoding
- Joint stereo coding for correlated channels

### Image Compression (JPEG)

JPEG achieves typical compression ratios of 10:1 to 50:1 for photographic images:

- 8×8 DCT blocks capture local correlation
- Perceptually weighted quantization prioritizes low frequencies
- Zigzag scanning groups coefficients for run-length encoding
- Separate DC and AC entropy coding paths

JPEG quality parameter controls quantization table scaling, enabling user tradeoff between file size and visual quality.

### Modern Alternatives

Advanced standards improve upon classical approaches:

- **AAC (Advanced Audio Coding)**: Successor to MP3 with better quality at same bit rates
- **JPEG 2000**: Wavelet-based image coding with better compression and features
- **WebP**: Google's image format with superior compression than JPEG
- **Opus**: Modern audio codec optimizing for internet streaming

These leverage improved transforms, more sophisticated perceptual models, and advanced entropy coding.

## Summary

This chapter examined multirate signal processing techniques that enable efficient implementation through strategic sampling rate changes. Decimation reduces sampling rates through low-pass filtering followed by downsampling, while interpolation increases rates through upsampling followed by filtering to remove spectral images. Polyphase decomposition reorganizes filter structures to minimize computation by avoiding operations on zero-valued samples, providing dramatic computational savings.

Fractional rate conversion combines interpolation and decimation to achieve arbitrary rational sampling rate changes, with multistage implementations optimizing computational efficiency for large factors. These techniques enable flexible interfacing between systems operating at different rates and support efficient implementation of sample rate converters across audio, communications, and image processing applications.

Signal compression exploits redundancy and irrelevance to minimize representation size, with lossless techniques enabling perfect reconstruction and lossy techniques achieving higher compression by discarding perceptually insignificant information. Transform coding concentrates signal energy into few coefficients, enabling efficient quantization and encoding. Huffman and arithmetic entropy coding approaches assign shorter codes to more probable symbols, approaching theoretical compression limits.

Practical compression systems including MP3 audio and JPEG images demonstrate how multirate filter banks, perceptual models, transform coding, quantization, and entropy coding combine to achieve compression ratios enabling modern multimedia applications. Understanding these fundamental techniques prepares you for advanced topics in video compression, speech coding, and emerging compression standards optimizing for machine learning and AI applications.

The next chapter explores time-frequency analysis methods including spectrograms and advanced techniques for analyzing non-stationary signals whose characteristics evolve over time, building on the transform and multirate concepts developed here.
