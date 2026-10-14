---
title: System Property Explorer
description: Run linearity, time-invariance, causality and BIBO stability tests on eight example systems and see which properties each system has, and why.
image: /sims/system-property-explorer/system-property-explorer.png
og:image: /sims/system-property-explorer/system-property-explorer.png
twitter:image: /sims/system-property-explorer/system-property-explorer.png
social:
   cards: false
quality_score: 100
---

# System Property Explorer

<iframe src="main.html" height="617px" width="100%" scrolling="no"></iframe>

[Run the System Property Explorer MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit in the p5.js Editor](https://editor.p5js.org/)

## About This MicroSim

Each system property is a statement that two signals must be equal. This MicroSim builds
both signals for the system you select and overlays them on the output plot. When a property
holds, the dashed orange curve lies exactly on the solid blue one. When it fails, the curves separate.

| Test | What is compared | Input used |
|------|------------------|------------|
| Linearity | $\mathcal{T}[A x_1 + x_2]$ against $A\,\mathcal{T}[x_1] + \mathcal{T}[x_2]$ | $x_1$ is a sine burst, $x_2$ is a 2 s pulse starting at $t_0$ |
| Time-invariance | $\mathcal{T}[x(t - t_0)]$ against $y(t - t_0)$ | A sine burst of amplitude $A$ |
| Causality | Outputs for two inputs that are identical up to $t_0$ | A sine burst, and the same burst with 1 added after $t_0$ |
| BIBO stability | Whether the output stays bounded | The bounded step $A\,u(t - t_0)$ |

The badges across the top give the true classification of the selected system. The badge for the
test being run has a heavy outline.

| System | Linear | Time-invariant | Causal | BIBO stable | Memoryless |
|--------|:------:|:--------------:|:------:|:-----------:|:----------:|
| Amplifier $y(t) = 2x(t)$ | yes | yes | yes | yes | yes |
| Linear filter $y(t) = \int_{t-1}^{t} x(\tau)\,d\tau$ | yes | yes | yes | yes | no |
| Time-varying multiplier $y(t) = t\,x(t)$ | yes | **no** | yes | **no** | yes |
| Squarer $y(t) = x^2(t)$ | **no** | yes | yes | yes | yes |
| Compressor $y(t) = \tanh(x(t))$ | **no** | yes | yes | yes | yes |
| Predictor $y(t) = x(t + 1)$ | yes | yes | **no** | yes | no |
| Integrator $y(t) = \int_{-\infty}^{t} x(\tau)\,d\tau$ | yes | yes | yes | **no** | no |
| Offset $y(t) = x(t) + 1$ | **no** | yes | yes | yes | yes |

!!! note "One example can disprove a property, but cannot prove it"
    A property must hold for *every* input. A single pair of curves that separate is enough to show
    that a property fails. Curves that match only show that the property holds for those inputs.
    For some slider settings a nonlinear system passes the linearity comparison by coincidence
    (try the squarer with $A = 1$ and $t_0 = 4$ s, where the burst and the pulse do not overlap).
    The MicroSim then reports that the system is not linear and that these inputs do not show it.

## How to Use

1. Choose a **System** and a **Test**.
2. Compare the solid blue and dashed orange curves on the output plot. Read the verdict and the
   one-line reason in the panel below the plots.
3. Move **Amplitude**, **Frequency** and **Time shift** to change the test input and check whether
   the verdict depends on the input.
4. For the causality test the vertical dashed line marks $t_0$, where the two inputs begin to differ.
   A thick red trace marks any output difference that appears before $t_0$.
5. For the stability test the dotted red lines mark the input bound $\pm A$.

## Iframe Embed Code

You can add this MicroSim to any web page by adding this to your HTML:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/system-property-explorer/main.html"
        height="617px"
        width="100%"
        scrolling="no"></iframe>
```

## Lesson Plan

### Learning Objectives

By the end of this activity, students will be able to:

1. **Explain** the superposition principle and test a system for linearity.
2. **Distinguish** time-invariant systems from time-varying systems using a shifted input.
3. **Determine** whether a system is causal by comparing outputs for inputs that agree up to a given time.
4. **Classify** a system as BIBO stable or unstable from its response to a bounded input.

### Grade Level

Undergraduate (introductory signals and systems)

### Duration

20-25 minutes

### Prerequisites

- Signals as functions of time, time shifting
- The unit step function
- Basic integration

### Activities

1. **Predict first** (5 min): Before opening the MicroSim, fill in a table of the four tested properties
   for $y(t) = 2x(t)$, $y(t) = t\,x(t)$, $y(t) = x^2(t)$ and $y(t) = x(t+1)$. Then check each cell.
2. **Guided Practice** (10 min):
    - Time-varying multiplier, time-invariance test. Set $t_0 = 2$ s and $A = 2$. The maximum difference is 4.00.
      Explain this number from $\mathcal{T}[x(t - t_0)] - y(t - t_0) = t_0\,x(t - t_0)$.
    - Offset system, linearity test. The maximum difference equals $A$ for every setting. Explain why from the two expressions in the reason line.
    - Integrator, stability test. Read the output at $t = 10$ s and compare it with $A\,(10 - t_0)$.
    - Predictor, causality test. Between which two times do the outputs differ, and why does that interval end at $t_0$?
3. **Discussion** (5 min): The squarer passes the linearity comparison when $A = 1$ and $t_0 = 4$ s.
   Does that make it linear? What does this say about proving a property with examples?

### Assessment

- Student states both parts of linearity (additivity and homogeneity) and identifies which one the offset system violates.
- Student explains why $y(t) = t\,x(t)$ is linear but time-varying.
- Student gives a bounded input that produces an unbounded output for the integrator.
- Student explains that examples can disprove a property but cannot prove it.

## References

1. Oppenheim, A. V., Willsky, A. S., & Nawab, S. H. (1997). *Signals and Systems* (2nd ed.). Prentice Hall. Chapter 1 covers the basic system properties: memory, invertibility, causality, stability, time invariance and linearity.
2. [Linear time-invariant system](https://en.wikipedia.org/wiki/Linear_time-invariant_system), Wikipedia.
3. [BIBO stability](https://en.wikipedia.org/wiki/BIBO_stability), Wikipedia.
4. [Chapter 3: System Properties and Analysis](../../chapters/03-system-properties-and-analysis/index.md) of this textbook.
