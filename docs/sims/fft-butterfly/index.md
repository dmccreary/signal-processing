---
title: FFT Butterfly
description: Step through the input reordering of a radix-2 FFT, splitting every group into even and odd samples until they sit in bit-reversed order.
image: /sims/fft-butterfly/fft-butterfly.png
og:image: /sims/fft-butterfly/fft-butterfly.png
twitter:image: /sims/fft-butterfly/fft-butterfly.png
social:
   cards: false
quality_score: 100
---

# FFT Butterfly

<iframe src="main.html" width="100%" height="582px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/fft-butterfly/main.html" width="100%" height="582px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

[Edit in the p5.js Editor](https://editor.p5js.org/dmccreary/sketches/K-BDjmSQF)

## Description

This MicroSim traces the first job of a radix-2 decimation-in-time FFT: putting the $N$ input samples into
bit-reversed order before the butterfly stages combine them. Each circle is one sample $x[n]$ labelled with its
index $n$ (at $N = 32$, read the binary labels). The orange column
is the natural order $x[0], x[1], \dots, x[N-1]$.

- **Start / Next Step** adds one column. Each step splits every group into its even-indexed samples (top half of
    the group) and its odd-indexed samples (bottom half). Navy lines show where each sample moves, and gray bars
    mark the boundaries of the new groups.
- **Reset** returns to the natural order.
- **FFT Size** (4, 8, 16 or 32) chooses $N$ and resets the diagram.

The diagram has $\log_2 N$ columns: the natural order plus $\log_2 N - 1$ splits. The last split would only turn
pairs into single samples, which does not change the order. The green column therefore holds $N/2$ pairs of samples
that are $N/2$ apart, such as $x[0], x[4]$ for $N = 8$; each pair feeds one butterfly of the first stage. The binary
labels show why the result is called bit-reversed: read across a row and the bits on the right are the bits on the
left in reverse order. For $N = 8$, row 1 (`001`) receives $x[4]$ (`100`).

Each split rests on the decimation-in-time identity, where $E[k]$ and $O[k]$ are the $N/2$-point DFTs of the
even and odd samples:

$$X[k] = E[k] + W_N^k\,O[k], \qquad X[k + N/2] = E[k] - W_N^k\,O[k], \qquad W_N = e^{-j2\pi/N}$$

Repeating the split $\log_2 N$ times costs $(N/2)\log_2 N$ complex multiplications instead of $N^2$: 12 instead of
64 for $N = 8$, and 80 instead of 1024 for $N = 32$.

This MicroSim supports [Chapter 6: Fourier Analysis Fundamentals](../../chapters/06-fourier-analysis-fundamentals/index.md#radix-2-fft).

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Describe** one decimation-in-time step as splitting every group of samples into its even-indexed and odd-indexed halves
2. **Calculate** the number of columns ($\log_2 N$), the number of splits ($\log_2 N - 1$) and the group size after split $s$ ($N/2^s$) for a given FFT size
3. **Predict** the row that sample $x[n]$ occupies in the final column by reversing the bits of $n$, and verify the prediction in the diagram
4. **Explain** why the final pairs $x[m]$ and $x[m + N/2]$ are the inputs of the first butterfly stage
5. **Compare** the $(N/2)\log_2 N$ complex multiplications of the radix-2 FFT with the $N^2$ of the direct DFT

### Target Audience

College undergraduates in an introductory digital signal processing course, during the lesson on the FFT.
Plan 15-20 minutes.

### Prerequisites

- The definition of the DFT and its $N^2$ cost
- Binary representation of integers
- Even and odd indices of a sequence

### Activities

**Activity 1: One split at a time (5 min).** Keep FFT Size at 8 and press **Start**. The middle column holds
0, 2, 4, 6 above the gray bar and 1, 3, 5, 7 below it: the even and the odd samples. Press **Next Step**. Each group
of 4 splits again and the green column reads 0, 4, 2, 6, 1, 5, 3, 7. Ask: which samples feed each 4-point DFT, and
which feed each 2-point DFT?

**Activity 2: Read the bits (5 min).** At the last step for $N = 8$, compare the binary labels across each row.
Row 3 shows `011` on the left and `110` on the right, so it receives $x[6]$. Find the samples that end in the row
where they started: $x[0]$, $x[2]$, $x[5]$ and $x[7]$, whose 3-bit patterns (`000`, `010`, `101`, `111`) read the same
in both directions.

**Activity 3: Count the steps (5 min).** Select each FFT Size and press Next Step until nothing changes. The title
stops at Step 2 of 2 for $N = 4$, Step 3 of 3 for $N = 8$, Step 4 of 4 for $N = 16$ and Step 5 of 5 for $N = 32$.
Record $N$, the number of splits and the group size after each split. Each doubling of $N$ adds one split, and one
butterfly stage.

**Activity 4: Predict before you click (5 min).** Select $N = 16$. Before stepping, reverse four bits to predict
the final rows: $x[3]$ (`0011`) goes to row 12 (`1100`), $x[5]$ (`0101`) to row 10 (`1010`) and $x[11]$ (`1011`)
to row 13 (`1101`). Step to the end and check the green column. Which four samples end in their own row?
($x[0]$, $x[6]$, $x[9]$ and $x[15]$.)

### Assessment

1. For $N = 32$, how many splits does the diagram show, and what are the groups after the second split? *(Answer: $\log_2 32 - 1 = 4$ splits; after the second split there are 4 groups of 8 samples.)*
2. For $N = 16$, which sample sits in row 2 of the final column? *(Answer: row 2 is `0010`; reversed it is `0100` = 4, so $x[4]$. The green column reads 0, 8, 4, 12, ...)*
3. After the first split for $N = 8$, the top group is $x[0], x[2], x[4], x[6]$. What is computed from these samples, and how is it combined with the bottom group? *(Answer: the 4-point DFT $E[k]$ of the even samples. It is combined with the odd-sample DFT $O[k]$ as $X[k] = E[k] + W_8^k O[k]$ and $X[k+4] = E[k] - W_8^k O[k]$.)*
4. How many complex multiplications does a radix-2 FFT need for $N = 32$, compared with the direct DFT? *(Answer: $(32/2) \times 5 = 80$ versus $32^2 = 1024$, about 13 times fewer.)*
5. Is the green column the FFT output $X[k]$? *(Answer: no. It holds the same input samples in a new order; no arithmetic has been done yet. The butterfly stages that follow compute $X[k]$, which comes out in natural order.)*

### Common Misconceptions

**"Bit-reversed order means the list is reversed."** Reversing the list would put $x[7]$ first. In the diagram
$x[0]$ and $x[7]$ stay at the top and bottom while $x[4]$ moves up to row 1: the bits of each index are reversed,
not the list.

**"The right-hand column is the FFT result."** The green circles carry the same sample labels as the orange ones.
Reordering only moves data; the multiplications and additions happen in the butterfly stages that follow.

## References

1. [Fast Fourier transform](https://en.wikipedia.org/wiki/Fast_Fourier_transform) - Wikipedia - overview of FFT algorithms and their $O(N \log N)$ cost
2. [Cooley-Tukey FFT algorithm](https://en.wikipedia.org/wiki/Cooley%E2%80%93Tukey_FFT_algorithm) - Wikipedia - the radix-2 decimation-in-time recursion into even and odd samples
3. [Bit-reversal permutation](https://en.wikipedia.org/wiki/Bit-reversal_permutation) - Wikipedia - the input order shown in the green column and how it is computed
4. [Butterfly diagram](https://en.wikipedia.org/wiki/Butterfly_diagram) - Wikipedia - the two-input butterfly that combines each pair after the reordering
5. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook; Chapter 12 explains the FFT's interlaced decomposition and bit-reversal sorting

## Development Notes

Version 2.0 (October 2026) ported the sketch to p5.js 2.3.2 and removed the unused p5.sound library. The
intermediate columns now follow the textbook decimation-in-time split (whole sequence first, then each half);
the earlier version built the same bit-reversed order from the smallest groups upward. The binary labels, the
group bars and the caption under the diagram were added, and the column headings were renamed from
"Inputs"/"Outputs" to "Natural order"/"Bit-reversed order", because the right-hand column is not the FFT output.
