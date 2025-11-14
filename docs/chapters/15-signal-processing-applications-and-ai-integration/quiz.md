# Quiz: Signal Processing Applications and AI Integration

Test your understanding of DSP hardware, real-time processing, audio/image/video processing, and AI-driven signal analysis.

---

#### 1. What architectural feature distinguishes DSP processors from general-purpose microprocessors?

<div class="upper-alpha" markdown>
1. DSPs use only software-based multiplication
2. DSPs employ Harvard architecture with separate program and data buses enabling simultaneous instruction fetch and data access
3. DSPs cannot perform floating-point arithmetic
4. DSPs only work with analog signals
</div>

??? question "Show Answer"
    The correct answer is **B**. DSP processors employ Harvard architecture with separate buses for program and data memory, allowing simultaneous instruction fetch and data access. This parallel memory access doubles effective memory bandwidth compared to von Neumann architectures. Additional DSP features include hardware multipliers (single-cycle multiplication), extended precision accumulators (preventing overflow), zero-overhead looping, and bit-reversed addressing for efficient FFT computation.

    **Concept Tested:** Digital Signal Processors

    **See:** [DSP Architecture and Features](index.md#dsp-architecture-and-features)

---

#### 2. What key advantage do FPGAs provide for signal processing implementations?

<div class="upper-alpha" markdown>
1. Lower cost than all other options
2. Massive parallelism and custom datapaths enabling operations impossible on sequential processors
3. Easier programming than DSPs
4. Higher power consumption allows faster processing
</div>

??? question "Show Answer"
    The correct answer is **B**. FPGAs provide reconfigurable hardware enabling massive parallelism where thousands of operations execute simultaneously rather than sequentially. Custom datapaths with deep pipelines process different data samples in parallel stages, achieving throughput impossible on sequential processors. Additional advantages include custom precision arithmetic, deterministic timing, low latency, and field reconfigurability for updates without hardware replacement.

    **Concept Tested:** FPGA Implementation

    **See:** [FPGA Architecture and Advantages](index.md#fpga-architecture-and-advantages)

---

#### 3. What does "real-time processing" fundamentally require?

<div class="upper-alpha" markdown>
1. Processing must use the fastest available processor
2. Processing must satisfy strict timing deadlines, producing outputs within specified latency bounds
3. All processing must complete in less than 1 microsecond
4. Processing can only be done in software
</div>

??? question "Show Answer"
    The correct answer is **B**. Real-time signal processing requires satisfying strict timing deadlines, processing input samples and producing outputs within specified latency bounds determined by application requirements. Key metrics include throughput (minimum sustained processing rate), latency (maximum acceptable delay), jitter (timing variation), and determinism (guarantee of meeting worst-case deadlines). Hard real-time systems require formal timing verification, not just average-case performance.

    **Concept Tested:** Real-Time Processing

    **See:** [Real-Time Constraints and Metrics](index.md#real-time-constraints-and-metrics)

---

#### 4. What psychoacoustic property do audio compression systems exploit?

<div class="upper-alpha" markdown>
1. Humans can hear all frequencies equally well
2. Masking: loud sounds mask nearby quiet sounds in frequency and time, allowing masked components to be discarded
3. All audio signals are periodic
4. Human hearing extends to 100 kHz
</div>

??? question "Show Answer"
    The correct answer is **B**. Audio compression systems exploit psychoacoustic masking, where loud sounds mask nearby quiet sounds in both frequency and time domains. Perceptual coding schemes like MP3 use psychoacoustic models to identify masked frequency components that can be coarsely quantized or eliminated without audible degradation. Combined with filter banks and entropy coding, this enables 10:1 to 12:1 compression while maintaining near-CD quality for typical listeners.

    **Concept Tested:** Audio Signal Processing

    **See:** [Audio Fundamentals](index.md#audio-fundamentals)

---

#### 5. What operation is fundamental to image enhancement and filtering?

<div class="upper-alpha" markdown>
1. Increasing the sampling rate
2. Spatial filtering through convolution with 2D kernels for blurring, sharpening, and edge detection
3. Converting to the frequency domain only
4. Reducing the number of pixels
</div>

??? question "Show Answer"
    The correct answer is **B**. Spatial filtering convolves images with 2D kernels to implement operations including blurring (low-pass filtering), sharpening (high-pass filtering), and edge detection. Common operations also include point operations (brightness/contrast adjustment), morphological operations (erosion, dilation), and frequency domain processing (2D FFT). Separable filters reduce 2D convolution to sequential 1D operations for computational efficiency.

    **Concept Tested:** Image Processing

    **See:** [Image Representation and Operations](index.md#image-representation-and-operations)

---

#### 6. What technique enables video compression to achieve dramatically higher compression ratios than image compression?

<div class="upper-alpha" markdown>
1. Using lower resolution for all frames
2. Motion compensation: predicting current frames from previous frames using motion vectors, encoding only prediction errors
3. Converting color to grayscale
4. Reducing the frame rate to 1 fps
</div>

??? question "Show Answer"
    The correct answer is **B**. Video compression exploits temporal redundancy through motion compensation, predicting current frames from previous frames using motion vectors describing pixel block displacements. Only prediction errors are encoded rather than complete frames. Combined with frame types (I-frames, P-frames, B-frames), transform coding, and entropy coding, modern codecs achieve 50:1 to 200:1 compression. Standards like H.264/AVC and H.265/HEVC employ sophisticated rate-distortion optimization.

    **Concept Tested:** Video Processing

    **See:** [Video Characteristics and Challenges](index.md#video-characteristics-and-challenges)

---

#### 7. What paradigm shift does machine learning introduce to signal processing?

<div class="upper-alpha" markdown>
1. ML eliminates the need for any signal processing
2. ML enables data-driven approaches that learn representations and operations from examples rather than relying solely on mathematical models
3. ML only works with image data, not audio or other signals
4. ML requires no training data
</div>

??? question "Show Answer"
    The correct answer is **B**. Machine learning enables data-driven approaches that learn processing operations and representations directly from examples rather than relying solely on mathematical models. Advantages include automatic feature learning (no manual engineering), adaptation to data statistics, handling complexity (approximating arbitrarily complex functions), and leveraging big data (performance improving with more training). Hybrid approaches combining classical methods with learned components often outperform purely traditional or purely ML approaches.

    **Concept Tested:** Machine Learning in DSP

    **See:** [Machine Learning in Signal Processing](index.md#machine-learning-in-signal-processing)

---

#### 8. Why are Convolutional Neural Networks (CNNs) particularly effective for signal processing?

<div class="upper-alpha" markdown>
1. They require less training data than other methods
2. They exploit local correlations through convolutional layers with shared weights, extracting hierarchical features from grid-structured data
3. They only work with 2D images, not 1D signals
4. They eliminate the need for any preprocessing
</div>

??? question "Show Answer"
    The correct answer is **B**. CNNs excel at processing grid-structured data (1D signals, 2D images, 3D video) by exploiting local correlations through convolutional layers with shared weights. Multiple filters detect different features (edges, textures, frequency components) at various scales. Pooling layers provide translation invariance while reducing dimensionality. CNNs process raw waveforms or spectrograms for audio tasks, achieving state-of-the-art results in speech recognition, music classification, and audio event detection.

    **Concept Tested:** Convolutional Neural Networks

    **See:** [Convolutional Neural Networks for Signal Analysis](index.md#convolutional-neural-networks-for-signal-analysis)

---

#### 9. What capability do recurrent neural networks (RNNs) and LSTMs provide for sequential signal processing?

<div class="upper-alpha" markdown>
1. They process all samples simultaneously in parallel
2. They maintain hidden state across time steps, enabling modeling of long-range temporal dependencies
3. They eliminate the need for training data
4. They only work with periodic signals
</div>

??? question "Show Answer"
    The correct answer is **B**. Recurrent networks process sequential data by maintaining hidden state across time steps, enabling modeling of long-range temporal dependencies. LSTMs (Long Short-Term Memory) overcome vanishing gradient problems through gated mechanisms, successfully modeling sequences hundreds of steps long. Applications include speech recognition, language modeling, signal prediction, and anomaly detection. Transformers with self-attention mechanisms now often outperform RNNs for many sequence tasks.

    **Concept Tested:** Deep Learning for Signals

    **See:** [Recurrent Neural Networks and Sequence Modeling](index.md#recurrent-neural-networks-and-sequence-modeling)

---

#### 10. What characterizes effective hybrid classical-ML signal processing approaches?

<div class="upper-alpha" markdown>
1. They use only machine learning without any classical signal processing
2. They combine signal processing domain knowledge with ML flexibility, using classical preprocessing and feature extraction before ML classification
3. They require quantum computers for implementation
4. They eliminate the need for training data
</div>

??? question "Show Answer"
    The correct answer is **B**. The most effective systems combine signal processing domain knowledge with machine learning flexibility through approaches including: learned preprocessing (classical filtering/normalization before ML), feature extraction pipelines (computing traditional features as CNN inputs), model-based networks (embedding DSP operations with learned parameters), and physics-informed learning (constraining networks to satisfy known properties). These hybrid approaches require less training data, generalize better, and provide more interpretable results than pure black-box learning.

    **Concept Tested:** AI-Driven Signal Analysis

    **See:** [Hybrid Classical-ML Approaches](index.md#hybrid-classical-ml-approaches)

---
