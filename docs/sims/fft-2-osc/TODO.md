# MicroSim Coverage & Quality Plan

> **Status: DRAFT for your review. Nothing has been changed.** This analysis was read-only: I ran the
> quality scorer and the iframe-height sync in `--dry-run` mode, and wrote only this file inside the repo
> (working scripts went to the session scratchpad).
>
> **Scope:** all 34 directories in `docs/sims/` · **Standard:** the `microsim-utils` skill
> (`standardization.md` 100-point rubric, `index-template.md`, `metadata-template.json`, iframe-height and
> layout-review utilities) plus this repo's `CLAUDE.md` rules · **Prepared:** 2026-10-14
>
> **Location note.** You asked for this plan in `fft-2-osc/`. Two consequences: (1) MkDocs publishes any
> `.md` under `docs/`, so this plan will be built into the site at `/sims/fft-2-osc/TODO/` (it is not in
> the nav); (2) this plan recommends *retiring* `fft-2-osc` (see D4), which would delete the plan with it.
> Task 0.3 moves it before any sim is touched. The previous auto-generated contents of this file
> (three generic "fix metadata" items) are folded into §8 and remain in git history.

---

## 0. Decisions I need from you

Everything below is written against the recommended default. If you reply **"go with defaults"** I will
use the *Recommendation* column. Anything marked **BLOCKER** I will not touch without an explicit answer.

| # | Decision | Recommendation (default) | Why it needs you |
|---|----------|--------------------------|------------------|
| **D1** | **BLOCKER.** `fft-sound-file/maroon-5-sugar.mp3` (3.8 MB commercial recording) is committed and served from GitHub Pages. | Delete it from the working tree now; load the CC-licensed *Damscray – Dancing Tiger* clip (already used by `reverb`) and add a "load your own file" input. Confirm that clip's attribution/licence before relying on it. | Removing it from the tree does **not** remove it from git history or from the `gh-pages` branch. Purging history means a rewrite + force-push; that is your call, not mine. |
| **D2** | p5.js version policy. Today: **7 different versions** across 27 sims (1.4.0, 1.9.0, 1.10.0, 1.11.1, 1.11.5, 1.11.7, 1.11.10), and p5.sound pinned separately at 1.11.3. | Pin everything to **p5 1.11.10** (+ matching p5.sound). Defer 2.x: 15 sims load p5.sound and I have not verified p5.sound under 2.x; root `TODO.md` already tracks the 3 `preload()` sims. | Version choice affects every sim and your editor.p5js.org sketches. |
| **D3** | `metadata.json` shape. All 25 existing files are a **flat** Dublin Core + extras layout; the skill's `microsim-schema.json` and `metadata-template.json` are **nested** (`microsim.dublinCore…`). They cannot both be "the standard". | Keep **flat** (25 files already conform; the scorer accepts both). Define the canonical flat field list in §6. Fix the shared schema/template in `ibook-skills` as a separate change (it triggers that repo's auto-commit marker rule). | Choosing the wrong direction means rewriting 25 files or maintaining two formats. |
| **D4** | Fate of legacy/duplicate directories. | **Retire** `fft-2-osc` (subset of `fft-3-osc`; carry its editor link); **archive** `graph-viewer-v1` (remove from nav); **delete** `templates/` (outdated copy of `template/`); **move** `openai-gpts/` to `docs/prompts/` (it's a transcript, not a sim). Leave a 3-line meta-refresh stub at any renamed `*.html` for one release. | Deletions/renames can break external links you have shared. |
| **D5** | Overlapping FFT sims. `fft-live-audio` is a superset of `fft-mic`; `fft-basic`/`fft-3-osc` differ only by oscillator count; the Ch. 6 spec "FFT Spectrum Analyzer" is a superset of mic + sound-file + live-audio. | Keep `fft-basic` (1 osc) and `fft-3-osc` (3 osc); merge `fft-mic` **into** `fft-live-audio`; keep `fft-sound-file`; treat the Ch. 6 spec as "unify later", not a new build. | Merging changes URLs you may have published. |
| **D6** | `convolution` and `nyquist-shannon-sampling` are *intro-level* (1 slider each); the Ch. 4/5 specs ask for 4 panels and ~8 controls. | Keep the intro sims (normalize + embed) **and** build the spec'd versions as new sims `convolution-visualizer` / `sampling-theorem-explorer`. Two difficulty levels, no regressions. | Alternative is upgrading in place (one sim, bigger diff, intro learners lose the simple view). |
| **D7** | How many new sims. 5 (P1) + 19 (P2) + 11 (P3) + 3 (P4) candidates, plus 2 spec'd explorers if D6 is accepted. | Commit to **P1 + P2 only** (the "adequate coverage" bar in §4.5). Revisit P3/P4 afterwards. | It is the single biggest scope lever. |
| **D8** | Echo the Bat (`CONTENT-GENERATION-GUIDE.md`) on sim pages. The guide's rules are chapter-oriented. | No mascot on sim pages, except at most one `mascot-tip` or `mascot-warning` inside a lesson plan's "Common misconceptions". Instructor notes are exempt by the guide. | It's a style call that applies to every sim page. |
| **D9** | 7 sims are book infrastructure, not DSP content (`blooms-taxonomy`, `book-gen-workflow`, `book-levels`, `ai-pace-accelerating`, `graph-viewer`, `graph-viewer-v1`, `wordcloud`). | Keep them in `docs/sims/`, but split `sims/index.md` into **DSP MicroSims** and **About this book**, and exclude them from DSP coverage counts. | Affects how the sims page presents the book to students. |

**Needs you regardless of the above** (I can't do these from here): p5 editor sketch URLs for
`euler-formula-explorer` (currently a placeholder), `fft-waveform-types`, `reverb`, `frequency-detection`,
`mobius-transform`, `analog-mod`, and every new sim; confirmation of the Damscray clip's licence; and
approval before any commit/push/deploy (your "publish" command).

---

## 1. Executive summary

- **Coverage is thin where it matters.** Grouping the 200 learning-graph concepts into 51 teachable
  clusters (§4.3): **2 are embedded in a chapter** (Complex Plane, Euler's Formula — both Chapter 1),
  7 have a working-but-unlinked or legacy sim, 18 have a chapter spec and no sim, and **24 have nothing —
  not even a spec**. 183 of 200 concepts map to a cluster; the other 17 are math prerequisites and
  definitions where text is sufficient.
- **Only 2 of 34 sims are used by any chapter.** `CONTENT-GENERATION-GUIDE.md` calls interactivity "a
  pedagogical requirement", yet Chapters 2-15 embed no MicroSim at all.
- **Effort went to one topic.** 9 of the 19 core DSP sims are FFT demos (they cover three clusters);
  Chapters 8-15 hold 85 of the 200 concepts and 24 of 51 clusters, and have exactly one cluster with any
  working sim (audio effects). **No sim anywhere shows a phase spectrum**, DFT mechanics, windowing,
  poles/zeros, or any filter design.
- **Quality is uneven, and part of the gap is mechanical.** Recomputed scores (the scorer's own rubric):
  average **54.4** over 34 directories (**57.1** over the 31 real sims); 2 sims ≥ 85, 21 between 50 and 84,
  11 below 50. I simulated pure *pattern* fixes (`src="./main.html"` scores 0 where `src="main.html"`
  scores 10; a plan under the heading "Basic FFT Visualization - Lesson Plan" scores 0): they change 17 of
  the 31 sims by +5 to +25 (e.g. `fft-basic` 65 → 90, `fft-size` 65 → 90) but lift the mean only to
  **63.7**. The rest has to be real content: lesson plans, references, and the 8 legacy rebuilds.
- **Documentation is the larger gap.** Only 4 of 33 pages have a `## Lesson Plan` heading (2 more have a
  full plan under a non-standard heading), 6 have `## References`, and 9 sim pages have **no inline
  iframe at all** (the sim is a link away).
- **Structural defects to fix first:** 1 copyrighted MP3 (D1); 8 real sims with no `main.html` and no
  `metadata.json`; 7 wrong copy-paste embed URLs (e.g. `sims/basic-fft/`, `/mains.html`); an invalid-HTML
  Plotly sim on a frozen `plotly-latest`; unpinned CDNs; a React *development* build served to students.
- **The spec backlog is itself uneven.** Ch. 1-7 specs are 32-46 lines with Purpose / Features /
  Objectives / Implementation Requirements; the 9 specs in Ch. 8-15 are 13-23-line stubs ("This
  simulation would allow students to…") and must be expanded before they can be generated.
- **Proposed bar for "adequate coverage":** every chapter embeds ≥ 1 MicroSim and all P1+P2 clusters are
  covered → **34 of 51 clusters (67%)**, up from 2 (4%). P3 would take it to 46 (90%).

---

## 2. Method and caveats

| What | How |
|------|-----|
| Inventory & conventions | A read-only script over all 34 directories: files, library + version from `<script>` tags, JS conventions required by `CLAUDE.md` (`updateCanvasSize()` first in `setup()`, `<main>` parenting, built-in p5 controls), `index.md` structure, `metadata.json` shape. |
| Quality score | `calculate-quality-score.py --dry-run --verbose` (no files written). |
| Iframe heights | `sync-iframe-heights.py --dry-run --verbose`. |
| Concept coverage | The 200 concepts in `learning-graph.csv` grouped by me into 51 clusters, each mapped to chapter specs (`#### Diagram:` blocks) and to existing sims. Clusters are my analytic unit — adjust them and the counts follow. |
| Chapter usage | Searched all `docs/**/*.md` (excluding `chapters-v1/`) for `<iframe src=…sims/…>`. |

**What I did not do (so you can weigh the findings):**

- I analysed **source, not rendered pages**. I have not opened any sim in a browser, so layout clipping,
  broken audio permissions, and visual errors are *unverified* until Phase 7.
- I did not run `mkdocs build --strict`, the iframe tester, or the layout reviewer.
- The learning graph's **CIS (concept impact score) is too flat to rank by**: 112 of 200 concepts
  have CIS = 1 and Euler's Formula scores 2 (Complex Numbers 4). I therefore ranked priority by
  pedagogical judgment (hard-to-grasp **and** inherently visual **and** a prerequisite for later chapters).
  The sparse dependency graph is a learning-graph issue, out of scope here but worth a separate look.

---

## 3. Inventory (34 directories)

| Role | Count | Members |
|------|------:|---------|
| **CORE** — teaches a concept in the 200-concept graph | 19 | sine-wave, complex-plane, euler-formula-explorer, convolution, nyquist-shannon-sampling, fft-basic, fft-2-osc, fft-3-osc, fft-size, fft-waveform-types, fft-butterfly, fft-mic, fft-live-audio, fft-sound-file, base-and-treble, rc-lowpass-filter, tone-gen, reverb, frequency-detection |
| **SUPP** — DSP-adjacent, *not* in the concept graph | 2 | analog-mod (AM/FM), mobius-transform |
| **HIST** — history / reference | 3 | synth-timeline, timeline-viewer, citation-graph |
| **META** — book infrastructure | 7 | blooms-taxonomy, book-gen-workflow, book-levels, ai-pace-accelerating, graph-viewer, graph-viewer-v1, wordcloud |
| **SCAFFOLD** | 2 | template, templates |
| **NOT-SIM** | 1 | openai-gpts |

Structure at a glance: 25 have `main.html`; **9 do not** (8 real sims on legacy `<name>.html` files + `openai-gpts`),
and exactly those 9 also lack `metadata.json`. 33 have a PNG. 14 stray TODO files (9 auto-generated
`TODO.md` from 2026-01-23, 5 `TODO.txt` — three of which claim a screenshot is missing that now exists).

---

## 4. Coverage analysis

### 4.1 Headline

| | Clusters | Share |
|---|---:|---:|
| Embedded in a chapter | 2 | 4% |
| Exists, but unlinked or legacy | 7 | 14% |
| Chapter spec only (no sim) | 18 | 35% |
| **Gap — no sim, no spec** | **24** | **47%** |

### 4.2 By chapter

| Ch | Title | Concepts | Clusters | Embedded | Exists, unlinked | Spec only | Gap | Coverage now |
|---:|-------|---------:|---------:|---------:|-----------------:|----------:|----:|-------------:|
| 1 | Mathematical Foundations | 25 | 4 | 2 | 0 | 0 | 2 | 2/4 |
| 2 | Signals & Systems | 25 | 4 | 0 | 1 | 2 | 1 | 0/4 |
| 3 | System Properties | 20 | 3 | 0 | 0 | 2 | 1 | 0/3 |
| 4 | Convolution & Correlation | 10 | 4 | 0 | 1 | 1 | 2 | 0/4 |
| 5 | Sampling & Quantization | 15 | 3 | 0 | 1 | 1 | 1 | 0/3 |
| 6 | Fourier Fundamentals | 10 | 5 | 0 | 2 | 1 | 2 | 0/5 |
| 7 | DFT/FFT & Frequency Domain | 10 | 4 | 0 | 1 | 2 | 1 | 0/4 |
| 8 | Advanced Transforms | 15 | 5 | 0 | 0 | 2 | 3 | 0/5 |
| 9 | Filter Design Fundamentals | 13 | 2 | 0 | 0 | 1 | 1 | 0/2 |
| 10 | Advanced Filter Design | 12 | 4 | 0 | 0 | 1 | 3 | 0/4 |
| 11 | Adaptive Processing | 10 | 2 | 0 | 0 | 1 | 1 | 0/2 |
| 12 | Stochastic Processes | 10 | 2 | 0 | 0 | 1 | 1 | 0/2 |
| 13 | Multirate & Compression | 10 | 2 | 0 | 0 | 1 | 1 | 0/2 |
| 14 | Time-Frequency & Advanced | 5 | 3 | 0 | 0 | 1 | 2 | 0/3 |
| 15 | Applications & AI | 10 | 4 | 0 | 1 | 1 | 2 | 0/4 |
| | **Total** | **200** | **51** | **2** | **7** | **18** | **24** | **2/51 (4%)** |

### 4.3 Cluster matrix

State legend — **EMBEDDED**: an existing sim is iframed in that chapter. **EXISTS**: a sim covers it but no
chapter uses it, or it is legacy/incomplete. **SPEC ONLY**: a `#### Diagram:` spec exists in the chapter.
**GAP**: nothing. *Partial* = touches the idea but doesn't teach it. "Target sim" is a proposed kebab-case
id; parenthesised entries mean *fold into another sim / text-only* rather than a new build.

| ID | Concept cluster | Concepts | State | Existing sim(s) | Chapter spec | Target sim | Pri |
|----|-----------------|----------|-------|-----------------|--------------|------------|-----|
| 1.1 | Complex plane: rectangular & polar | 2-3 | EMBEDDED | `complex-plane` | — | — | - |
| 1.2 | Euler's formula & rotating phasor | 4-5 | EMBEDDED | `euler-formula-explorer` | — | — | - |
| 1.3 | Phasor addition (sum of sinusoids) | 5 | **GAP** | *partial: `euler-formula-explorer`* | — | `phasor-addition` | P3 |
| 1.4 | Probability distributions & random variables | 13-18 | **GAP** | — | — | `distribution-explorer` | P4 |
| 2.1 | Sinusoid amplitude / frequency / phase | 32,40,45-47 | EXISTS (unlinked/legacy) | `sine-wave` | — | `sine-wave` | P1 |
| 2.2 | Signal classification (periodic, energy/power, CT/DT) | 28-33,36-37,48-50 | SPEC ONLY | — | Signal Type Explorer | `signal-type-explorer` | P2 |
| 2.3 | Even / odd decomposition | 34-35 | SPEC ONLY | — | Even and Odd Signal Decomposition | `even-odd-decomposition` | P2 |
| 2.4 | Signal operations: shift, scale, reverse; step & impulse | 38-39,41-44 | **GAP** | — | — | `signal-operations` | P1 |
| 3.1 | System properties: linear, time-invariant, causal, stable | 51-61 | SPEC ONLY | — | System Property Explorer | `system-property-explorer` | P2 |
| 3.2 | Impulse / step / frequency response, transfer function | 62-67 | SPEC ONLY | *partial: `rc-lowpass-filter`, `base-and-treble`* | Impulse and Frequency Response Analyzer | `impulse-frequency-response` | P2 |
| 3.3 | Feedback, feedforward & interconnections | 68-70 | **GAP** | — | — | `system-interconnections` | P3 |
| 4.1 | Convolution (flip-and-slide) | 71-72 | EXISTS (unlinked/legacy) | `convolution` | Convolution Visualizer | `convolution` (+ `convolution-visualizer`, D6) | P1 |
| 4.2 | Circular convolution & convolution theorem | 73-74 | **GAP** | — | — | `convolution-theorem` | P2 |
| 4.3 | Correlation, autocorrelation, matched filter | 75-79 | SPEC ONLY | — | Correlation and Matched Filtering | `correlation-matched-filter` | P2 |
| 4.4 | Wiener filter | 80 | **GAP** | — | — | (text only; fold into 11/12) | P4 |
| 5.1 | Sampling, Nyquist rate, aliasing, reconstruction | 81-86,88-89,95 | EXISTS (unlinked/legacy) | `nyquist-shannon-sampling` | Sampling Theorem Explorer | `nyquist-shannon-sampling` (+ `sampling-theorem-explorer`, D6) | P1 |
| 5.2 | Anti-aliasing filter | 87 | **GAP** | *partial: `nyquist-shannon-sampling`* | — | (fold into 5.1) | P3 |
| 5.3 | Quantization error & noise, uniform vs non-uniform | 90-94 | SPEC ONLY | — | Quantization and Noise Shaping | `quantization-noise` | P2 |
| 6.1 | Fourier series: harmonic synthesis | 96-97 | SPEC ONLY | *partial: `fft-waveform-types`* | Fourier Series Explorer | `fourier-series-explorer` | P1 |
| 6.2 | Continuous Fourier transform pairs | 98-99 | **GAP** | — | — | `fourier-transform-pairs` | P3 |
| 6.3 | DFT mechanics (probing with rotating phasors) | 100-101 | **GAP** | *partial: `fft-basic`* | — | `dft-explorer` | P2 |
| 6.4 | FFT in practice (time vs spectrum of real signals) | 102 | EXISTS (unlinked/legacy) | `fft-basic`, `fft-2-osc`, `fft-3-osc`, `fft-mic`, `fft-live-audio`, `fft-sound-file`, `fft-size` | FFT Spectrum Analyzer | `fft-basic`, `fft-3-osc`, `fft-live-audio` (D5) | P1 |
| 6.5 | FFT algorithm: radix-2 / Cooley-Tukey butterfly | 103-105 | EXISTS (unlinked/legacy) | `fft-butterfly` | — | `fft-butterfly` | P1 |
| 7.1 | Time vs frequency domain; magnitude / power spectrum | 106-109,111-112 | EXISTS (unlinked/legacy) | `fft-basic`, `fft-3-osc`, `fft-waveform-types`, `fft-size` | — | `fft-basic` | P1 |
| 7.2 | Phase spectrum | 110 | **GAP** | — | — | `phase-spectrum` | P2 |
| 7.3 | Spectral leakage & window functions | 113-115 | SPEC ONLY | *partial: `fft-size`* | Spectral Leakage and Windowing | `spectral-leakage-windowing` | P1 |
| 7.4 | Time-frequency trade-off (window length) | 186 | SPEC ONLY | *partial: `fft-size`* | Time-Frequency Analysis Explorer | `time-frequency-tradeoff` | P2 |
| 8.1 | Laplace transform & s-plane | 116,124 | **GAP** | — | — | `s-plane-explorer` | P3 |
| 8.2 | Z-transform, poles & zeros, ROC, stability | 117-123,125 | SPEC ONLY | *partial: `mobius-transform`* | Interactive Pole-Zero Analysis Tool | `pole-zero-explorer` | P1 |
| 8.3 | Discrete cosine transform | 126 | **GAP** | — | — | `dct-basis-explorer` | P3 |
| 8.4 | Wavelets (CWT / DWT, multiresolution) | 127-129 | **GAP** | — | — | `wavelet-explorer` | P2 |
| 8.5 | Short-time Fourier transform | 130 | SPEC ONLY | — | Interactive STFT Spectrogram Analyzer | `stft-spectrogram` | P2 |
| 9.1 | Filter types: LP / HP / BP / BS / notch / comb / all-pass | 131-138 | SPEC ONLY | *partial: `base-and-treble`, `rc-lowpass-filter`* | Interactive Filter Design and Analysis Tool | `filter-types-explorer` | P1 |
| 9.2 | FIR vs IIR, order, coefficients, stability | 139-143 | **GAP** | — | — | `fir-vs-iir` | P2 |
| 10.1 | Analog prototypes: Butterworth / Chebyshev / Elliptic / Bessel | 144-148 | **GAP** | — | — | `iir-prototype-comparison` | P2 |
| 10.2 | FIR design: window method & frequency sampling | 149-150 | SPEC ONLY | — | FIR Filter Design Comparison Tool | `fir-design-comparison` | P2 |
| 10.3 | IIR design: bilinear transform & impulse invariance | 151-152 | **GAP** | *partial: `mobius-transform`* | — | `bilinear-transform` | P3 |
| 10.4 | Filter banks & polyphase | 153-155 | **GAP** | — | — | `filter-bank-explorer` | P4 |
| 11.1 | LMS / NLMS / RLS / Kalman convergence | 156-161 | SPEC ONLY | — | Adaptive Algorithm Comparison Tool | `adaptive-filter-comparison` | P2 |
| 11.2 | Adaptive noise cancellation, echo cancellation, equalization | 162-165 | **GAP** | — | — | `adaptive-noise-cancellation` | P2 |
| 12.1 | White / colored / Gaussian noise, SNR, noise reduction | 166-173 | SPEC ONLY | — | Noise Analysis and Reduction Tool | `noise-explorer` | P2 |
| 12.2 | Power spectral density & Wiener-Khinchin | 174-175 | **GAP** | — | — | `psd-wiener-khinchin` | P3 |
| 13.1 | Decimation, interpolation, up/down-sampling | 176-180 | SPEC ONLY | — | Multirate Sample Rate Converter | `multirate-converter` | P2 |
| 13.2 | Compression: Huffman, transform coding, lossy vs lossless | 181-185 | **GAP** | — | — | `huffman-coding` | P3 |
| 14.1 | Spectrogram parameters | 187 | SPEC ONLY | — | Interactive Spectrogram Parameter Explorer | (merge with 8.5) | P2 |
| 14.2 | Wigner-Ville distribution & ambiguity function | 188-189 | **GAP** | — | — | (text + static figure) | P4 |
| 14.3 | Compressed sensing | 190 | **GAP** | — | — | `compressed-sensing` | P4 |
| 15.1 | Real-time processing, DSP hardware | 191-193 | SPEC ONLY | *partial: `fft-mic`, `fft-live-audio`* | Real-Time Processing Simulator | `real-time-processing` | P3 |
| 15.2 | Audio signal processing (effects, tone, pitch) | 194 | EXISTS (unlinked/legacy) | `reverb`, `tone-gen`, `frequency-detection`, `analog-mod`, `base-and-treble` | — | (link existing) | P2 |
| 15.3 | Image & video processing (2-D kernels) | 195-196 | **GAP** | — | — | `image-convolution` | P3 |
| 15.4 | Machine learning in DSP, CNNs, deep learning | 197-200 | **GAP** | — | — | `conv-layer-as-filter` | P3 |

### 4.4 Findings

1. **Over-served:** FFT magnitude displays. Nine `fft-*` sims cluster around 6.4 / 6.5 / 7.1.
2. **Under-served (and prerequisite to later chapters):** phase spectrum (7.2); DFT as projection onto
   rotating phasors (6.3); windowing and leakage (7.3); circular convolution & the convolution theorem
   (4.2); pole-zero / z-plane (8.2); filter families and FIR-vs-IIR (9.x, 10.x). Chapters 11-14 have only
   spec stubs and no sims at all.
3. **The two existing "intro" sims fall short of their own specs.** `convolution` (1 slider, continuous
   overlap) vs Convolution Visualizer (4 synchronized panels, signal library, step mode);
   `nyquist-shannon-sampling` (1 slider) vs Sampling Theorem Explorer (4 panels, spectral replication,
   reconstruction-filter toggle).
4. **Spec overlap:** three separate specs describe spectrogram/STFT (Ch. 7 *Time-Frequency Analysis
   Explorer*, Ch. 8 *STFT Spectrogram Analyzer*, Ch. 14 *Spectrogram Parameter Explorer*), and the Ch. 6
   spectrum analyzer overlaps Ch. 7 leakage. I recommend one parameterised build embedded in all three
   places (clusters 7.4 / 8.5 / 14.1).
5. **Spec quality cliff at Chapter 8** (see §1): nine stubs need Purpose / Features / Objectives /
   Implementation Requirements before generation.
6. **Taught but not in the concept graph:** analog modulation (AM/FM), pitch/frequency detection, the
   Möbius transform (related to the bilinear transform, #151), reverb. Either add them to the learning
   graph or present them as "Applications" extras; as-is they have no home in any chapter.
7. **No coverage-tracking link exists.** Nothing in `metadata.json` or the chapters ties a sim to concept
   IDs, so coverage can't be regenerated. §6 proposes two small fields (`chapter`, `conceptIds`).

### 4.5 New-sim roadmap

Priority = pedagogical value × visual-ness × downstream dependence. Counts exclude "fold into" entries.

| Wave | Clusters | New builds | Polish/link existing | Bar reached |
|------|---------:|-----------:|---------------------:|-------------|
| **P1** | 11 | 5 (+2 spec'd explorers per D6) | 6 | all P1 embedded (13 of 51) |
| **P2** | 21 | 19 (+1 merged) | 1 | **≥ 1 sim in every chapter; 34 of 51 (67%)** |
| P3 | 12 | 11 (+1 folded) | 0 | 46 of 51 (90%) |
| P4 | 5 | 3 (+2 text/static) | 0 | optional |

**P1 — foundations the book can't teach without**

- **2.1** Sinusoid amplitude / frequency / phase — EXISTS (unlinked/legacy) → `sine-wave`
- **2.4** Signal operations: shift, scale, reverse; step & impulse — GAP → `signal-operations`
- **4.1** Convolution (flip-and-slide) — EXISTS (unlinked/legacy) → `convolution` (+ `convolution-visualizer`, D6)
- **5.1** Sampling, Nyquist rate, aliasing, reconstruction — EXISTS (unlinked/legacy) → `nyquist-shannon-sampling` (+ `sampling-theorem-explorer`, D6)
- **6.1** Fourier series: harmonic synthesis — SPEC ONLY → `fourier-series-explorer`
- **6.4** FFT in practice (time vs spectrum of real signals) — EXISTS (unlinked/legacy) → `fft-basic`, `fft-3-osc`, `fft-live-audio` (D5)
- **6.5** FFT algorithm: radix-2 / Cooley-Tukey butterfly — EXISTS (unlinked/legacy) → `fft-butterfly`
- **7.1** Time vs frequency domain; magnitude / power spectrum — EXISTS (unlinked/legacy) → `fft-basic`
- **7.3** Spectral leakage & window functions — SPEC ONLY → `spectral-leakage-windowing`
- **8.2** Z-transform, poles & zeros, ROC, stability — SPEC ONLY → `pole-zero-explorer`
- **9.1** Filter types: LP / HP / BP / BS / notch / comb / all-pass — SPEC ONLY → `filter-types-explorer`

**P2 — completes every chapter**

- **2.2** Signal classification (periodic, energy/power, CT/DT) — SPEC ONLY → `signal-type-explorer`
- **2.3** Even / odd decomposition — SPEC ONLY → `even-odd-decomposition`
- **3.1** System properties: linear, time-invariant, causal, stable — SPEC ONLY → `system-property-explorer`
- **3.2** Impulse / step / frequency response, transfer function — SPEC ONLY → `impulse-frequency-response`
- **4.2** Circular convolution & convolution theorem — GAP → `convolution-theorem`
- **4.3** Correlation, autocorrelation, matched filter — SPEC ONLY → `correlation-matched-filter`
- **5.3** Quantization error & noise, uniform vs non-uniform — SPEC ONLY → `quantization-noise`
- **6.3** DFT mechanics (probing with rotating phasors) — GAP → `dft-explorer`
- **7.2** Phase spectrum — GAP → `phase-spectrum`
- **7.4** Time-frequency trade-off (window length) — SPEC ONLY → `time-frequency-tradeoff`
- **8.4** Wavelets (CWT / DWT, multiresolution) — GAP → `wavelet-explorer`
- **8.5** Short-time Fourier transform — SPEC ONLY → `stft-spectrogram`
- **9.2** FIR vs IIR, order, coefficients, stability — GAP → `fir-vs-iir`
- **10.1** Analog prototypes: Butterworth / Chebyshev / Elliptic / Bessel — GAP → `iir-prototype-comparison`
- **10.2** FIR design: window method & frequency sampling — SPEC ONLY → `fir-design-comparison`
- **11.1** LMS / NLMS / RLS / Kalman convergence — SPEC ONLY → `adaptive-filter-comparison`
- **11.2** Adaptive noise cancellation, echo cancellation, equalization — GAP → `adaptive-noise-cancellation`
- **12.1** White / colored / Gaussian noise, SNR, noise reduction — SPEC ONLY → `noise-explorer`
- **13.1** Decimation, interpolation, up/down-sampling — SPEC ONLY → `multirate-converter`
- **14.1** Spectrogram parameters — SPEC ONLY → (merge with 8.5)
- **15.2** Audio signal processing (effects, tone, pitch) — EXISTS (unlinked/legacy) → (link existing)

**P3 — nice to have**

- **1.3** Phasor addition (sum of sinusoids) — GAP → `phasor-addition`
- **3.3** Feedback, feedforward & interconnections — GAP → `system-interconnections`
- **5.2** Anti-aliasing filter — GAP → (fold into 5.1)
- **6.2** Continuous Fourier transform pairs — GAP → `fourier-transform-pairs`
- **8.1** Laplace transform & s-plane — GAP → `s-plane-explorer`
- **8.3** Discrete cosine transform — GAP → `dct-basis-explorer`
- **10.3** IIR design: bilinear transform & impulse invariance — GAP → `bilinear-transform`
- **12.2** Power spectral density & Wiener-Khinchin — GAP → `psd-wiener-khinchin`
- **13.2** Compression: Huffman, transform coding, lossy vs lossless — GAP → `huffman-coding`
- **15.1** Real-time processing, DSP hardware — SPEC ONLY → `real-time-processing`
- **15.3** Image & video processing (2-D kernels) — GAP → `image-convolution`
- **15.4** Machine learning in DSP, CNNs, deep learning — GAP → `conv-layer-as-filter`

**P4 — optional / text may suffice**

- **1.4** Probability distributions & random variables — GAP → `distribution-explorer`
- **4.4** Wiener filter — GAP → (text only; fold into 11/12)
- **10.4** Filter banks & polyphase — GAP → `filter-bank-explorer`
- **14.2** Wigner-Ville distribution & ambiguity function — GAP → (text + static figure)
- **14.3** Compressed sensing — GAP → `compressed-sensing`

---

## 5. Quality analysis of existing sims

### 5.1 Scoreboard

"Stored" is the `quality_score` currently in `index.md` frontmatter; "now" is the scorer's recomputed value.
Several stored scores are stale (e.g. `fft-basic` 90 → 65). Average now: **54.4**.
A score is *necessary, not sufficient*: `synth-timeline` scores 70 with no description, lesson plan, or
references because 30 points come from metadata presence alone. The Definition of Done (§6) therefore adds
checks the scorer cannot make.

| Sim | Role | Stack | Stored → now | Principal defects | Action |
|-----|------|-------|-------------|-------------------|--------|
| `ai-pace-accelerating` | META | p5 1.11.1 | 30 → **60** | No `##` sections (no description / lesson / references); copy-paste URL typo `/mains.html`; iframe 480 vs canvas 472 | Normalize; add short description + refs; list under *Book tools* |
| `analog-mod` | SUPP | p5 1.9.0 + sound | — → **17** | No `main.html` (`analog-mod.html`); page has no iframe, no frontmatter, no metadata.json; fixed `createCanvas(800,600)`, no `updateCanvasSize`/`windowResized`; page is a prompt log | Rebuild in place (Phase 4) |
| `base-and-treble` | CORE | p5 1.10.0 | 45 → **70** | Copy-paste URL points to a non-existent `base-and-treble.html`; headings are *Discussion*/*Sample Prompt*; no fullscreen button, lesson plan or refs; draws a response curve only (no audio) yet `index` text implies a tone control | Normalize + lesson plan; clarify description |
| `blooms-taxonomy` | META | p5 1.4.0 | 30 → **70** | p5 1.4.0; `./main.html`; duplicate iframe blocks; prompt-log sections instead of description/lesson plan | Normalize; list under *Book tools* |
| `book-gen-workflow` | META | p5 1.11.1 | 40 → **65** | Zero `##` sections; iframe 610 vs 602; embedded in `docs/about.md` at 610 | Normalize (+ fix embed in about.md) |
| `book-levels` | META | p5 1.11.1 | 60 → **75** | Copy-paste URL points at the *intelligent-textbooks* repo, not this book; iframe 500 vs 502; also embedded in instructors-guide | Fix URL/heights |
| `citation-graph` | HIST | vis 4.21.0 (legacy `vis`) | 55 → **65** | Legacy monolithic `vis`; iframe 910 vs copy-paste 480; process-narrative headings ("What Anthropic Claude Sonnet 4.0 Created") are not student-facing; no `.js` file (inline script) | Upgrade to pinned vis-network; rewrite page as student-facing |
| `complex-plane` | CORE | p5 1.11.10 | 90 → **95** | **Gold reference.** Fullscreen link written `./main.html` (scorer wants `main.html`); *About* vs template *Description* heading; references have no links | Polish only |
| `convolution` | CORE | p5 1.4.0 | 60 → **80** | p5 1.4.0; entry `sketch.js`; fixed 470×267 iframe with invalid `noscroll`; no `updateCanvasSize`/`windowResized`; 1 slider vs spec's ~8 controls / 4 panels; no fullscreen, copy-paste, refs | Normalize now; spec'd visualizer is a separate build (D6) |
| `euler-formula-explorer` | CORE | p5 1.11.10 | 85 → **95** | Placeholder p5-editor link (`https://editor.p5js.org/`); stale TODO.txt | Real sketch link (needs you) |
| `fft-2-osc` | CORE | p5 1.9.0 + sound | — → **12** | No `main.html` (`fft-scheme.html`, `fft.js`); no frontmatter/iframe/metadata; title typo "Trsnaform"; functionally a subset of `fft-3-osc` (2 vs 3 oscillators) | Retire into `fft-3-osc` (D4); carry over editor link |
| `fft-3-osc` | CORE | p5 1.11.5 + sound 1.11.3 | 45 → **65** | `./main.html`; copy-paste URL points at `sims/basic-fft/`; iframe 600 vs 522; no `##` sections | Normalize + lesson plan |
| `fft-basic` | CORE | p5 1.11.5 + sound 1.11.3 | 90 → **65** | Stored 90 but scorer gives 65: `./main.html`, lesson plan under heading *Basic FFT Visualization - Lesson Plan*; copy-paste URL points at `sims/basic-fft/`; no References | Rename headings, fix URL, add refs (content is already strong) |
| `fft-butterfly` | CORE | p5 1.11.5 + sound | 40 → **80** | Loads p5.sound but sketch has no audio code; iframe 550 vs 542; no lesson plan / refs | Drop unused p5.sound; add lesson plan |
| `fft-live-audio` | CORE | p5 1.11.5 + sound | 45 → **65** | `./main.html`; copy-paste iframe `width=700 height=411` vs page 485 vs canvas 482; superset of `fft-mic` | Normalize; consolidate with fft-mic (D5) |
| `fft-mic` | CORE | p5 1.11.10 + sound | 55 → **80** | Copy-paste URL `…/microsims/sims/fft-mic/` (wrong repo); no lesson plan / refs | Fix URL; lesson plan; consolidate (D5) |
| `fft-size` | CORE | p5 1.11.5 + sound | 80 → **65** | `./main.html`; lesson-plan heading variant (*FFT Size - Lesson Plan*); no References | Rename headings; add refs |
| `fft-sound-file` | CORE | p5 1.11.10 + sound | 35 → **70** | **Ships `maroon-5-sugar.mp3` (3.8 MB commercial recording) to the public site**; iframe 200px; `preload()` (already in root TODO.md); no `##` sections; `.DS_Store` | Phase 1 blocker (D1) |
| `fft-waveform-types` | CORE | p5 1.11.7 + sound | 65 → **80** | Only sim on 1.11.7; no editor link, lesson plan or refs; iframe 500 vs 482 | Pin version; add lesson plan/refs |
| `frequency-detection` | CORE | p5 1.11.5 + sound (WEBGL) | — → **12** | No `main.html`; no iframe/frontmatter/metadata; 690-line sketch with `preload()` + `.otf` font; no `updateCanvasSize` | Rebuild in place (Phase 4) |
| `graph-viewer` | META | vis-network (unpinned unpkg) | 45 → **65** | Unpinned CDN; page has fullscreen button but **no inline iframe**; nonstandard file names (`script.js`, `local.css`) | Pin; embed; docs |
| `graph-viewer-v1` | META | vis-network (unpinned) | 35 → **65** | Superseded v1; carries 3 earlier viewer generations (`view-graph*.html/js`); still in nav | Archive; remove from nav (D4) |
| `mobius-transform` | SUPP | p5 1.9.0 (min) | — → **17** | No `main.html`; no iframe/frontmatter/metadata; page is a prompt log | Rebuild in place; cross-link to bilinear transform |
| `nyquist-shannon-sampling` | CORE | p5 1.10.0 | — → **12** | No `main.html`; calls `createCanvas` twice; no frontmatter/iframe/metadata; 258-line prompt-dump page; 1 slider vs spec's 4 panels + spectrum | Rebuild as intro sim; spec'd explorer is separate (D6) |
| `openai-gpts` | NOT-SIM | — | — → **5** | A ChatGPT transcript + 2 SVGs, not a MicroSim; not in nav | Move to `docs/prompts/` (D4) |
| `rc-lowpass-filter` | CORE | Plotly *latest* (+ p5 loaded, unused) | — → **12** | Invalid HTML (`<input>`/`<button>` inside `<head>`, duplicate `#myDiv`); `plotly-latest` is frozen at v1.58.5; p5 + p5.sound loaded but unused; no frontmatter/metadata | Rebuild in place (Phase 4) |
| `reverb` | CORE | p5 1.11.10 + sound | 30 → **70** | 100×100 canvas, click-to-play, iframe 270 — **sync script would set it to 102 and clip it**; duplicate MP3; `preload()` (root TODO.md) | Set explicit `CANVAS_HEIGHT` by hand |
| `sine-wave` | CORE | p5 1.4.0 | 75 → **80** | p5 1.4.0; `## References` is an empty heading; no description heading; stale TODO.txt | Update version; fill refs |
| `synth-timeline` | HIST | React 18.2 *development* build | 25 → **70** | Dev build shipped to students; 700×1300 iframe; zero `##` sections; embedded in `docs/prompts/11-electronic-music.md` | Switch to production build; normalize |
| `template` | SCAFFOLD | p5 1.11.5 + sound | — → **35** | Placeholder metadata (3 Dublin Core fields missing); `SIM_NAME` in copy-paste URL | Keep as scaffold; exempt from scoring/nav |
| `templates` | SCAFFOLD | p5 1.4.0 | — → **37** | Outdated duplicate of `template/`; placeholder metadata | Delete (D4) |
| `timeline-viewer` | HIST | vis 4.21.0 (legacy `vis`) | — → **17** | No `main.html`; no iframe/metadata; leftover `timeline-viewer-v1.js` | Rebuild small; pin vis-timeline |
| `tone-gen` | CORE | p5 1.11.5 + sound | 35 → **65** | `SIM_NAME` placeholder in copy-paste URL; `./main.html`; iframe 250 vs 252; no `##` lesson plan | Normalize + lesson plan |
| `wordcloud` | META | vis-network (unpinned) | — → **12** | No `main.html` (v1/v2/`wordcloud.html` duplicates); no frontmatter/metadata; embeds `./wordcloud.html` | Consolidate to one file; normalize |

### 5.2 Cross-cutting defects

| # | Defect | Extent | Fix | Phase |
|---|--------|--------|-----|-------|
| X1 | Copyrighted media in repo | `maroon-5-sugar.mp3`; plus duplicate Damscray MP3 in two sims | D1 | 1 |
| X2 | Legacy entry file, no `main.html`, no `metadata.json` | 8 sims | Rename to `main.html`; generate metadata | 1, 4 |
| X3 | Sim page has **no inline iframe** | 9 pages (`analog-mod`, `fft-2-osc`, `frequency-detection`, `graph-viewer`, `graph-viewer-v1`, `mobius-transform`, `nyquist-shannon-sampling`, `rc-lowpass-filter`, `timeline-viewer`) | Add iframe + fullscreen button | 1 |
| X4 | Wrong copy-paste embed URL | 7 (`ai-pace-accelerating` `/mains.html`; `base-and-treble` non-existent `.html`; `book-levels` other repo; `fft-3-osc` + `fft-basic` `sims/basic-fft/`; `fft-mic` `/microsims/`; `tone-gen` `SIM_NAME`) | Regenerate from template | 1 |
| X5 | `src="./main.html"` (scorer requires `main.html`) | 12 pages | Normalize | 2 |
| X6 | Non-standard H2 names (content exists, scores 0) | lesson plan: `fft-basic`, `fft-size`; description under *MicroSim Description*: `citation-graph`, `fft-live-audio`, `tone-gen` | Rename to `## Description` / `## Lesson Plan` / `## References` | 2 |
| X7 | p5 version drift (7 versions) / p5.sound mismatched or unused | 27 p5 sims; `fft-butterfly`, `rc-lowpass-filter` load p5.sound without using it | D2 | 2 |
| X8 | Unpinned / deprecated CDN | vis-network from unpkg *unversioned* (graph-viewer, graph-viewer-v1, wordcloud ×3); `plotly-latest`; legacy `vis` 4.21.0 (citation-graph, timeline-viewer); React **development** build (synth-timeline) | Pin / production build | 2 |
| X9 | `CLAUDE.md` p5 conventions | `updateCanvasSize()` first in `setup()`: 18 pass, 8 fail (`analog-mod`, `convolution`, `fft-sound-file`, `frequency-detection`, `mobius-transform`, `nyquist-shannon-sampling`, `reverb`, `templates`); `windowResized` missing in 7 of those 8 (all but `fft-sound-file`); `nyquist` calls `createCanvas` twice | Fix | 2, 4 |
| X10 | `// CANVAS_HEIGHT:` comment | **0 of 34**; `metadata.json` `canvasHeight` 0 of 25. The sync script falls back to *computed* values, which are wrong for `reverb` (102 computed vs 270 declared) | Set by hand after measuring, **then** sync | 2 |
| X11 | Iframe heights out of sync | 26 iframes would change (24 own page + 2 embeds: `about.md`, `instructors-guide`) | After X10 | 2 |
| X12 | Screenshots | 9 of 33 are 1200×800; others range 573×558 to 2618×1248, up to 732 KB | Recapture all | 2 |
| X13 | `metadata.json` quality | 17 sims tag p5 simulations `map`/`network` (detector artefact); `bloomLevel` + `bloomsTaxonomy` + `pedagogical.bloomAlignment` duplicate each other; **20 of 25** carry the generator's default date `2024-01-01`; `template`/`templates` have 3 empty fields | D3 clean-up | 2 |
| X14 | Lesson plan / references / editor link | `## Lesson Plan`: 4 pages (+2 non-standard); `## References`: 6 (1 empty); editor link missing or placeholder on 6 p5 sims | Write | 3 |
| X15 | Accessibility | `describe()` / `aria-label` present in 14 of 27 p5 sims (grep-level check) | Add `describe()` + keyboard-reachable controls | 3 |
| X16 | Stale artefacts | 14 TODO files; 2 `.DS_Store`; v1/v2 duplicates (`wordcloud-v1/v2.html`, `timeline-viewer-v1.js`, 3 viewer generations in `graph-viewer-v1`) | Remove (after this plan is approved) | 2 |
| X17 | Build-time correctness | Typo "Fast Fourier Trsnaform" (`fft-2-osc`); `rc-lowpass-filter` has duplicate `#myDiv` and inputs inside `<head>`; `noscroll="true"` (not a real attribute) on `convolution`; `sims/index.md` says "Bass and Treble" for dir `base-and-treble` | Fix; keep dir name (URL stability) | 1-2 |

---

## 6. Definition of Done (applies to every retained sim)

A sim is **done** only when every box is true. The *Files*, `main.html`, `index.md` and `metadata.json`
groups are mechanical and scriptable; *Verified* and *Integrated* need a rendered check or a human.

**Files**

- [ ] `docs/sims/<kebab-id>/` with `main.html`, `<id>.js` (p5), `index.md`, `metadata.json`, `<id>.png` (**1200×800**); nothing else (no TODO files, `.DS_Store`, old versions, unused media).
- [ ] No copyrighted or unattributed media; any audio has a stated licence in `index.md`.

**`main.html`**

- [ ] `<main></main>` with **no** `id`; `lang`, viewport meta, descriptive `<title>`.
- [ ] One pinned library version per D2 (p5 **1.11.10**); p5.sound only if the sketch uses audio; no unversioned or `latest` CDN URLs; production builds only.

**Sketch (p5)** — per `CLAUDE.md`

- [ ] `// CANVAS_HEIGHT: <int>` within the first 15 lines (non-JS sims: `canvasHeight` in `metadata.json`).
- [ ] `updateCanvasSize();` is the **first** statement in `setup()`; `windowResized()` re-measures; canvas is parented with `canvas.parent(document.querySelector('main'));`.
- [ ] Controls use p5 built-ins (`createSlider`, `createButton`, `createCheckbox`, `createSelect`, `createInput`) — never hand-drawn.
- [ ] Label text ≥ 16 px equivalent; `describe()` set; audio sims start muted/stopped and require a click (autoplay policy).

**`index.md`** — order per `index-template.md`

- [ ] Frontmatter: `title`, `description`, `quality_score`, `image`, `og:image` (`/sims/<id>/<id>.png`). **No Dublin Core fields here.**
- [ ] `# Title` → `<iframe src="main.html" width="100%" height="<CANVAS_HEIGHT+2>px" scrolling="no"></iframe>` (no `frameborder`).
- [ ] "Copy this iframe to your website:" block with `https://dmccreary.github.io/signal-processing/sims/<id>/main.html` and the **same** height.
- [ ] `[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }`; p5 sims also `[Edit in the p5.js Editor](<real sketch URL>)`.
- [ ] `## Description` (what it shows, how to use each control, which concepts, and a link to the chapter section that uses it).
- [ ] `## Lesson Plan`: Learning Objectives (matching `metadata.json`), Target Audience, Prerequisites, Activities (with concrete slider settings), Assessment (≥ 3 questions with answers an instructor can check), Common misconceptions.
- [ ] `## References` as `1. [Title](URL) - date - publisher - relevance`; at least one textbook and one open reference.
- [ ] Markdown rules: blank line before every list; Title Case headings; math in `$…$` / `$$…$$`.

**`metadata.json`** — flat layout (D3)

- [ ] Valid JSON; all 9 required Dublin Core fields non-empty: `title description creator date subject type format language rights`.
- [ ] Accurate `library`, `visualizationType` (no `map`/`network` unless true), `date`, `identifier` (= deployed URL), `learningObjectives` (≥ 3, measurable, verbs match `bloomsTaxonomy`).
- [ ] **New (proposed):** `canvasHeight` (int), `chapter` (int), `conceptIds` (learning-graph IDs). These make coverage and iframe heights regenerable.
- [ ] One Bloom's field, not three.

**Verified, not assumed**

- [ ] `quality_score` ≥ **85** from `calculate-quality-score.py`, and every rubric row earned or explicitly N/A.
- [ ] `test-iframe-heights.py`: PASS (all controls inside the declared iframe height).
- [ ] Layout review against `visual-checklist.md`: no FAIL after ≤ 3 patch cycles; screenshot recaptured **after** the last patch.
- [ ] Renders at 375 px and 1200 px wide with no horizontal scroll or clipped control.
- [ ] Every numeric claim in the lesson plan was checked against what the sim actually displays (e.g. peak at the stated frequency, aliased frequency = |f − k·fs|).

**Integrated**

- [ ] Embedded (iframe + fullscreen button) in the chapter section it teaches, and that chapter's `#### Diagram:` spec updated to `Status: Done` (as Chapter 1 does).
- [ ] Listed in `mkdocs.yml` nav and `docs/sims/index.md`; `diagram-report.py` regenerates cleanly.

---

## 7. Work plan

Task IDs are stable so you can approve by number ("do 1.1-1.4, hold 2.x"). **[auto]** = I can do it once
approved; **[you]** = needs your input or credentials; **[decide]** = §0. Size: **S** scripted/mechanical,
**M** per-sim judgment, **L** new build. I will not commit, push, or deploy except on your "publish".

### Phase 0 — Safeguards (no content changes)

- [ ] **0.1 [decide]** Answer D1-D9.
- [ ] **0.2 [you]** Decide what to do with the ~33 uncommitted entries in `git status` (25 `metadata.json` learning-objective rewrites, `CLAUDE.md`, `mkdocs.yml`, mascot files). Committing them first keeps the bulk edits below reviewable. *(S)*
- [ ] **0.3 [auto]** Move this plan out of `fft-2-osc/` to `plans/microsim-coverage-quality.md` (outside `docs/`, so it isn't published). *(S)*
- [ ] **0.4 [auto]** Save the §5.1 scoreboard as the baseline; every later phase reports before/after from `--dry-run`. *(S)*

### Phase 1 — Blockers and broken pages

- [ ] **1.1 [auto]** (D1) Remove `maroon-5-sugar.mp3`; point `fft-sound-file.js` at the CC-licensed clip; add a file-input; cite licence in the page. Resolve the `preload()` item already in root `TODO.md` in the same edit. *(M)*
- [ ] **1.2 [auto]** Rename the 7 surviving legacy entry files (`analog-mod`, `frequency-detection`, `mobius-transform`, `nyquist-shannon-sampling`, `rc-lowpass-filter`, `timeline-viewer`, `wordcloud`) to `main.html` and update their `index.md` links; leave meta-refresh stubs (D4). The 8th, `fft-2-osc`, is retired in 1.5. *(S)*
- [ ] **1.3 [auto]** Replace the 7 wrong copy-paste URLs with the template block (X4). *(S)*
- [ ] **1.4 [auto]** Add the inline iframe + fullscreen button to the 9 pages without one (X3). *(S)*
- [ ] **1.5 [auto]** Apply D4: retire `fft-2-osc` into `fft-3-osc`; archive `graph-viewer-v1`; delete `templates/`; move `openai-gpts/`. Fix the "Trsnaform" typo only if the page survives. *(S)*
- [ ] **1.6 [auto]** Delete `.DS_Store` (2) and confirm `.gitignore` covers them. *(S)*

### Phase 2 — Mechanical normalization (scripted; one reviewable diff per script)

- [ ] **2.1 [auto]** Pin libraries per D2/X8: p5 → 1.11.10 (+ p5.sound), pin vis-network / vis-timeline, replace `plotly-latest`, React → production build. Remove unused p5.sound. After each version change, open the sim and smoke-test — `convolution`, `sine-wave`, `blooms-taxonomy` jump from 1.4.0. *(S + smoke test)*
- [ ] **2.2 [auto]** `index.md` normalization: `src="main.html"`, fullscreen pattern, copy-paste block, canonical H2 names, drop `frameborder` / `style="overflow: hidden;"` (X5, X6). *(S)*
- [ ] **2.3 [auto]** Script-check the JS conventions (X9). 18 sims already conform (no edit). The 8 that don't are fixed where they're touched anyway: `fft-sound-file` (1.1), `reverb` (3.3), `nyquist-shannon-sampling` / `frequency-detection` / `analog-mod` / `mobius-transform` (4.1-4.5), `convolution` (4.7); `templates/` is deleted (D4). *(S)*
- [ ] **2.4 [auto]** Set `// CANVAS_HEIGHT` for every p5 sim by measuring the rendered canvas (not the computed fallback), then run `sync-iframe-heights.py --dry-run`, review, apply (X10, X11). *(M)*
- [ ] **2.5 [auto]** `metadata.json` clean-up per §6 (X13): visualizationType, one Bloom's field, real dates, `canvasHeight`, `chapter`, `conceptIds`. *(S)*
- [ ] **2.6 [auto]** Recapture all screenshots at 1200×800 with `bk-capture-screenshot`; verify each `image:` path resolves (X12). *(S)*
- [ ] **2.7 [auto]** Delete the 14 stale TODO files once §8 has absorbed them (X16). *(S)*
- [ ] **2.8 [auto]** Regenerate `docs/sims/index.md` (two sections per D9) and re-order the `mkdocs.yml` MicroSims nav; confirm `navigation.tabs` stays absent (it is today). *(S)*
- **Gate 2:** zero sims without `main.html` or `metadata.json`; zero wrong embed URLs; `sync-iframe-heights.py --dry-run` reports 0 changes; mean score ≥ 65 over the 31 real sims (pattern fixes alone are worth ≈ +7; the remainder comes from Phases 3-4).

### Phase 3 — Content depth for structurally sound sims (20)

Per sim: `## Description`, `## Lesson Plan`, `## References`, `describe()`, editor link, LOs checked against
actual behaviour (§6 "Verified"). Order = chapter order so each batch can be embedded in Phase 5. The
legacy sims get the same content as part of their Phase 4 rebuild.

- [ ] **3.1 [auto]** Batch A (Ch. 1-2): `complex-plane`, `euler-formula-explorer`, `sine-wave`, `tone-gen`. *(M)*
- [ ] **3.2 [auto]** Batch B (Ch. 6-7): `fft-basic`, `fft-3-osc`, `fft-size`, `fft-waveform-types`, `fft-butterfly`. *(M)*
- [ ] **3.3 [auto]** Batch C (audio / Ch. 15): `fft-live-audio` (+ merged `fft-mic`, D5), `fft-sound-file`, `reverb`, `base-and-treble`. *(M)*
- [ ] **3.4 [auto]** Batch D (HIST/META): `citation-graph`, `synth-timeline`, `blooms-taxonomy`, `book-gen-workflow`, `book-levels`, `ai-pace-accelerating`, `graph-viewer` (short description + references each). *(M)*
- [ ] **3.5 [you]** Supply p5-editor sketch URLs (or tell me to omit the link and accept −5 points).

### Phase 4 — Rebuild legacy sims (7) and modernize `convolution`

Each keeps its id/URL; each is rebuilt to the §6 sketch conventions and given real metadata **and** the
full documentation set (description, lesson plan, references), since there is nothing worth normalizing first.

- [ ] **4.1 [auto]** `nyquist-shannon-sampling`: single `createCanvas`, `updateCanvasSize`, add reconstruction trace and Nyquist indicator; the spec'd explorer is separate (D6). *(M)*
- [ ] **4.2 [auto]** `rc-lowpass-filter`: valid HTML, pinned Plotly (or p5), drop unused p5, wire R and C inputs *and* sliders, show cutoff `f_c = 1/(2πRC)` and −3 dB marker; becomes the Ch. 3 / Ch. 9 frequency-response companion. *(M)*
- [ ] **4.3 [auto]** `frequency-detection`: add `main.html`, async `setup()` (root `TODO.md`), responsive canvas, no WEBGL unless needed. *(M)*
- [ ] **4.4 [auto]** `analog-mod`: responsive, built-in controls, labelled AM vs FM modes. *(M)*
- [ ] **4.5 [auto]** `mobius-transform`: responsive + controls audit; add the conformal-map → bilinear-transform note. *(M)*
- [ ] **4.6 [auto]** `wordcloud`, `timeline-viewer`: consolidate v1/v2, one `main.html`, pinned vis. *(S)*
- [ ] **4.7 [auto]** `convolution`: responsive layout, `updateCanvasSize`/`windowResized`, p5 1.11.10, fullscreen/copy-paste/refs; keep as the intro (D6). *(M)*
- **Gate 4:** every retained existing sim ≥ 85 and passes the iframe tester and layout review.

### Phase 5 — Integrate existing sims into chapters

Today only Ch. 1 embeds anything. Proposed placement (each is an `<iframe>` + fullscreen button under the
relevant section, following the Ch. 1 pattern):

| Sim | Chapter / section |
|-----|-------------------|
| `sine-wave`, `tone-gen` | Ch. 2 — Sinusoidal signals / amplitude, frequency, phase |
| `rc-lowpass-filter` | Ch. 3 — Frequency response; Ch. 9 — Low-pass filters |
| `convolution` | Ch. 4 — Convolution |
| `nyquist-shannon-sampling` | Ch. 5 — Sampling theorem and aliasing |
| `fft-waveform-types`, `fft-basic`, `fft-butterfly` | Ch. 6 — Fourier series / DFT / Cooley-Tukey |
| `fft-3-osc`, `fft-size`, `fft-live-audio`, `fft-sound-file` | Ch. 7 — Spectrum and frequency resolution |
| `base-and-treble` | Ch. 9 — Filter types (shelving) |
| `mobius-transform` | Ch. 10 — Bilinear transform (optional) |
| `reverb`, `frequency-detection`, `analog-mod`, `citation-graph` | Ch. 15 — Audio processing / DSP hardware |
| `ai-pace-accelerating` | Ch. 15 — AI integration (opening) |

- [ ] **5.1 [auto]** Add the embeds and update the matching `Status:` lines. Chapters are **student-facing**, so run `validate-chapter-mascots.py` on every edited chapter and `CONTENT-GENERATION-GUIDE.md`'s list-spacing rule. *(S)*
- [ ] **5.2 [auto]** Add a "Used in Chapter N" link on each sim page. *(S)*
- **Gate 5:** embedded clusters 2 → 9 of 51; `diagram-report.py` regenerates `diagram-table.md` with accurate status.

### Phase 6 — New sims (waves)

Pipeline per sim (existing tooling): (a) write/expand the chapter spec → **you review** → (b)
`create-microsim-todo-json-files.py` → (c) `scaffold-microsims-from-todo.py` → (d) implement with the
`microsim-generator` (p5) skill → (e) screenshot, standardization, iframe tester, layout review →
(f) embed + `Status: Done`. After each sim I'll give the local URL as
`http://127.0.0.1:8000/signal-processing/sims/<id>/`.

- [ ] **6.0 [auto → you review]** For the "adequate" bar: write **8** new specs (the 1 P1 + 7 P2 GAP clusters in §4.3) and expand **7** of the 9 stub specs (Ch. 8-15) to the Ch. 1-7 format (the Ch. 14 spectrogram stub merges into the STFT one). That is ~15 spec tasks; up to 24 new specs if every GAP cluster is pursued (D7). *(M)*
- [ ] **6.1 [auto]** Wave A (P1): 5 new builds (+ `convolution-visualizer` and `sampling-theorem-explorer` per D6) plus the polish items above. *(L ×7)*
- [ ] **6.2 [auto]** Wave B (P2): 19 new builds; consolidate 7.4 / 8.5 / 14.1 into one parameterised spectrogram sim. *(L ×19)*
- [ ] **6.3 [decide]** Wave C (P3) only if D7 says so.
- **Gate 6:** every chapter embeds ≥ 1 MicroSim; 34 of 51 clusters (67%) covered; all new sims meet §6.

### Phase 7 — Verification and reporting

- [ ] **7.1 [auto]** `test-iframe-heights.py --sims-dir docs/sims` → PASS table (the Playwright Python package imports here; I have not confirmed its Chromium download is present, and will `playwright install chromium` if not). 
- [ ] **7.2 [auto]** Layout review (Claude Vision) on every sim, ≤ 3 cycles each.
- [ ] **7.3 [auto]** Final `calculate-quality-score.py` (non-dry-run: it rewrites `quality_score` in every `index.md`, so only here), `diagram-report.py`, index regeneration.
- [ ] **7.4 [you]** Run `mkdocs build --strict` in your own terminal (I won't start `mkdocs serve`) and send me any warnings. Review the rendered pages.
- [ ] **7.5 [you]** Say "publish" → add, commit, push, `mkdocs gh-deploy`.

### Targets

| Gate | Average score | Sims < 85 | Clusters covered | Chapters embedding a sim |
|------|--------------:|----------:|-----------------:|-------------------------:|
| Baseline (today) | 54.4 (57.1 real sims) | 32 of 34 | 2 (4%) embedded; 9 (18%) have any sim | 1 of 15 |
| After Phase 2 | ≥ 65 | ≈ 22 of 31 real sims | unchanged | 1 of 15 |
| After Phases 3-5 | ≥ 85 | 0 retained | 9 (18%) embedded | 7 of 15 (10 counting partial-coverage embeds) |
| After Wave A | ≥ 85 | 0 | 13 (25%) | 9 of 15 (11 incl. partial) |
| After Wave B | ≥ 85 | 0 | **34 (67%)** | **15 of 15** |
| After Wave C | ≥ 85 | 0 | 46 (90%) | 15 of 15 |

---

## 8. Per-sim notes carried over

- **fft-2-osc** (the previous contents of this file): the auto-generated TODO listed "missing `main.html`" and
  "no description". Both are moot if D4 is accepted (retire into `fft-3-osc`). If you'd rather keep it:
  rename `fft-scheme.html` → `main.html`, `fft.js` → `fft-2-osc.js`, add frontmatter/iframe/metadata,
  fix the title typo, and keep the existing editor link `XnH57-jNr`.
- **Existing editor links worth preserving** (don't lose them in rewrites): `complex-plane` (`wnEDizl5_`),
  `fft-basic` (`oDP6EoAQ6`), `nyquist-shannon-sampling` (`I95-hiV6z`), `fft-2-osc` (`XnH57-jNr`).
- **Root `TODO.md`** already tracks p5 2.x `preload()` fixes for `fft-sound-file`, `frequency-detection`,
  `reverb`; tasks 1.1, 4.3 and the `reverb` fix in Phase 3 close those items — I'll tick them there.
- **Stale per-sim TODO.txt claims** (`complex-plane`, `convolution`, `euler-formula-explorer`: "screenshot
  missing") are wrong — the PNGs exist. They carry no information that isn't in §5.1.

---

## 9. Risks

| Risk | Mitigation |
|------|-----------|
| The sync script's *computed* heights are wrong for some sims (`reverb` → 102 px would clip its controls). | Task 2.4: set `CANVAS_HEIGHT` by measurement first; always `--dry-run` and review. |
| Moving 1.4.0-era sims to 1.11.10 may change rendering (`convolution`, `sine-wave`, `blooms-taxonomy`). | Smoke-test each before and after; screenshots diffed in Phase 7. |
| Renaming `*.html` → `main.html` breaks external links. | Meta-refresh stubs (D4); delete in a later release if you prefer. |
| Git history and `gh-pages` still contain the MP3 after D1. | Needs your explicit instruction for a history rewrite; I will not do it unprompted. |
| The scorer is pattern-strict and rewards metadata presence. | §6 adds rendered checks; I'll report the score *and* the DoD checklist. |
| `calculate-quality-score.py` without `--dry-run` rewrites all 34 `index.md` frontmatters. | Only run in 7.3, after Phase 2 normalization, as one reviewable diff. |
| Chapter edits (Phase 5) touch student-facing text and mascot rules. | Run `validate-chapter-mascots.py`; keep edits to the embed + status line. |
| Changing the shared schema/template touches `ibook-skills` (auto-commit marker). | Kept out of this plan (D3); separate change. |
| Scope: ~24 new builds (P1+P2) plus ~15 spec writes/expansions is large. | D7: P1 + P2 only; each wave is independently shippable. |

---

## 10. How I'll run this

- Batches of ≤ 5 sims per turn; before/after score table every turn; you review diffs between batches.
- Work directly in the main checkout — no worktrees, no `mkdocs serve` started or stopped by me.
- `microsim-utils` scripts for scoring, heights, screenshots, iframe tests, index and reports; the
  `microsim-generator` skill (p5 route) for new builds.
- Nothing is committed or deployed until you say **"publish"**.
