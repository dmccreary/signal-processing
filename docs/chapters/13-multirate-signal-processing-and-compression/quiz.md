# Quiz: Multirate Signal Processing and Compression

Test your understanding of decimation, interpolation, sample rate conversion, and signal compression techniques.

---

#### 1. What is the primary purpose of multirate signal processing?

<div class="upper-alpha" markdown>
1. To increase the amplitude of signals
2. To enable processing at different sampling rates for computational efficiency and flexible interfacing
3. To eliminate noise from signals
4. To convert analog signals to digital
</div>

??? question "Show Answer"
    The correct answer is **B**. Multirate signal processing involves systems that operate on signals at different sampling rates, enabling computational efficiency (reduced operations at lower rates), flexible interfacing (connecting systems at different native rates), and subband processing (analyzing specific frequency regions independently). Applications include sample rate conversion, oversampling converters, digital communications, and audio compression systems like MP3.

    **Concept Tested:** Multirate Signal Processing

    **See:** [Multirate Signal Processing Fundamentals](index.md#multirate-signal-processing-fundamentals)

---

#### 2. What is decimation in multirate signal processing?

<div class="upper-alpha" markdown>
1. Increasing the sampling rate by interpolating between samples
2. Reducing the sampling rate by factor M, keeping only every M-th sample
3. Converting from time domain to frequency domain
4. Removing DC components from a signal
</div>

??? question "Show Answer"
    The correct answer is **B**. Decimation reduces the sampling rate by an integer factor M through the operation $y[n] = x[nM]$, keeping only every M-th sample while discarding the rest. However, direct downsampling can cause aliasing if the input contains frequency components above $\pi/M$ (half the new Nyquist frequency). Proper decimation requires anti-aliasing low-pass filtering before downsampling to prevent spectral overlap.

    **Concept Tested:** Decimation, Downsampling

    **See:** [Decimation and Downsampling](index.md#decimation-and-downsampling)

---

#### 3. Why is anti-aliasing filtering required before downsampling in decimation?

<div class="upper-alpha" markdown>
1. To increase signal power
2. To prevent frequency components above $\pi/M$ from folding into the baseband and causing aliasing
3. To convert real signals to complex signals
4. To increase the sampling rate
</div>

??? question "Show Answer"
    The correct answer is **B**. Downsampling causes spectral replication and compression. If the input signal contains frequency components above $\pi/M$ (where M is the decimation factor), these components fold into the baseband, causing aliasing. Anti-aliasing low-pass filtering with cutoff $\omega_c \leq \pi/M$ eliminates these high-frequency components before downsampling, preventing spectral overlap and preserving signal integrity.

    **Concept Tested:** Decimation, Downsampling

    **See:** [Anti-Aliasing Filtering](index.md#anti-aliasing-filtering)

---

#### 4. What does the upsampling operation do in interpolation?

<div class="upper-alpha" markdown>
1. Increases amplitude of all samples
2. Inserts (L-1) zeros between each input sample, where L is the interpolation factor
3. Removes samples to reduce the sampling rate
4. Filters out high frequencies
</div>

??? question "Show Answer"
    The correct answer is **B**. Upsampling by factor L inserts (L-1) zeros between each input sample: $y[n] = x[n/L]$ if $n$ is a multiple of L, otherwise $y[n] = 0$. This increases the sampling rate but creates spectral replications. The upsampled sequence must be low-pass filtered with cutoff $\omega_c \leq \pi/L$ and gain L to remove spectral images and reconstruct a smooth interpolated signal.

    **Concept Tested:** Interpolation, Upsampling

    **See:** [Interpolation and Upsampling](index.md#interpolation-and-upsampling)

---

#### 5. How is fractional (non-integer) sample rate conversion achieved?

<div class="upper-alpha" markdown>
1. By using only decimation
2. By cascading interpolation by L and decimation by M to achieve rate change of L/M
3. By changing the clock frequency
4. It is impossible to achieve non-integer rate changes
</div>

??? question "Show Answer"
    The correct answer is **B**. Fractional rate conversion achieves non-integer rate changes through cascaded interpolation by L and decimation by M, resulting in overall rate change of L/M. For example, converting 44.1 kHz to 48 kHz requires ratio 160/147. The combined filter must satisfy both interpolation (removing images) and decimation (preventing aliasing) requirements. Polyphase implementation performs necessary filtering efficiently without explicitly computing the high intermediate rate.

    **Concept Tested:** Interpolation, Decimation

    **See:** [Fractional Rate Conversion](index.md#fractional-rate-conversion)

---

#### 6. What fundamental compression limit does Shannon's source coding theorem establish?

<div class="upper-alpha" markdown>
1. All signals can be compressed to 1 bit
2. Lossless compression cannot achieve average bit rates below the source entropy H without information loss
3. Compression always introduces distortion
4. Only periodic signals can be compressed
</div>

??? question "Show Answer"
    The correct answer is **B**. Shannon's source coding theorem establishes that for a source with entropy $H = -\sum_{i} p_i \log_2 p_i$ bits per symbol, lossless compression cannot achieve average bit rates below $H$ without information loss. Highly redundant sources (low entropy) can be compressed more than random sources (high entropy approaching maximum). This fundamental limit guides realistic expectations for compression ratios.

    **Concept Tested:** Signal Compression

    **See:** [Source Coding Theorem](index.md#source-coding-theorem)

---

#### 7. What distinguishes lossless from lossy compression?

<div class="upper-alpha" markdown>
1. Lossless enables perfect reconstruction while lossy permanently discards information deemed less important
2. Lossless only works with images while lossy works with audio
3. Lossless achieves higher compression ratios than lossy
4. Lossless requires more computational power than lossy
</div>

??? question "Show Answer"
    The correct answer is **A**. Lossless compression enables perfect reconstruction of the original signal from the compressed representation by exploiting statistical redundancy without discarding information. Lossy compression permanently discards information deemed perceptually insignificant or less important, achieving much higher compression ratios (10:1 to 200:1) at the cost of some quality loss. Applications requiring perfect fidelity (medical images, scientific data) use lossless, while multimedia (audio, video) tolerates lossy compression.

    **Concept Tested:** Lossless Compression, Lossy Compression

    **See:** [Lossy vs. Lossless Compression](index.md#lossy-vs-lossless-compression)

---

#### 8. Why is the Discrete Cosine Transform (DCT) effective for transform coding in compression?

<div class="upper-alpha" markdown>
1. It produces complex coefficients with better resolution
2. It exhibits excellent energy compaction, concentrating most signal energy in a few low-frequency coefficients
3. It is faster to compute than all other transforms
4. It eliminates all quantization noise
</div>

??? question "Show Answer"
    The correct answer is **B**. The DCT exhibits excellent energy compaction properties that concentrate most signal energy in a few low-frequency coefficients, enabling efficient compression. For correlated data like images, most DCT coefficients are small and can be coarsely quantized or discarded. The DCT produces real-valued coefficients and forms the basis of JPEG image compression and MPEG video coding, where 8×8 blocks are transformed and quantized.

    **Concept Tested:** Transform Coding

    **See:** [Transform Selection](index.md#transform-selection)

---

#### 9. How does Huffman coding achieve compression?

<div class="upper-alpha" markdown>
1. By discarding high-frequency components
2. By assigning shorter codewords to more frequent symbols and longer codewords to rarer symbols
3. By increasing the sampling rate
4. By converting signals to the frequency domain
</div>

??? question "Show Answer"
    The correct answer is **B**. Huffman coding achieves lossless compression by assigning shorter codewords to more frequent symbols and longer codewords to rarer symbols, based on symbol probability statistics. The algorithm constructs optimal prefix-free codes (no code is a prefix of another) through bottom-up tree construction. Huffman coding is optimal for integer-length codes and widely used in JPEG, MPEG, and data compression utilities.

    **Concept Tested:** Huffman Coding

    **See:** [Huffman Coding](index.md#huffman-coding-and-entropy-coding)

---

#### 10. What is the key principle exploited by MP3 audio compression?

<div class="upper-alpha" markdown>
1. Perfect reconstruction of all frequency components
2. Psychoacoustic masking: loud sounds mask nearby quiet sounds, allowing masked components to be discarded
3. Increasing the sampling rate to 192 kHz
4. Converting stereo to mono
</div>

??? question "Show Answer"
    The correct answer is **B**. MP3 (MPEG-1 Audio Layer 3) exploits psychoacoustic masking, where loud sounds mask nearby quiet sounds in both frequency and time domains. A psychoacoustic model identifies masked frequency components that can be coarsely quantized or eliminated without audible degradation. Combined with a 32-band polyphase filter bank, perceptual bit allocation, and Huffman coding, MP3 achieves 10:1 to 12:1 compression while maintaining near-CD quality.

    **Concept Tested:** Signal Compression, Lossy Compression

    **See:** [Audio Compression (MP3)](index.md#audio-compression-mp3)

---
