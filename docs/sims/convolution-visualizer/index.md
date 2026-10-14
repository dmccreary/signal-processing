---
title: Convolution Visualizer
description: Step through the flip-and-slide picture of convolution. The impulse response is time-reversed, shifted, multiplied by the input, and the area under the product builds the output y(t).
image: /sims/convolution-visualizer/convolution-visualizer.png
og:image: /sims/convolution-visualizer/convolution-visualizer.png
twitter:image: /sims/convolution-visualizer/convolution-visualizer.png
social:
   cards: false
quality_score: 100
---

# Convolution Visualizer

<iframe src="main.html" height="632px" width="100%" scrolling="no"></iframe>

[Run the Convolution Visualizer MicroSim Fullscreen](./main.html){ .md-button .md-button--primary }
<br/>
[Edit in the p5.js Editor](https://editor.p5js.org/)

## About This MicroSim

The convolution integral

$$y(t) = x(t) * h(t) = \int_{-\infty}^{\infty} x(\tau)\,h(t-\tau)\,d\tau$$

gives one output value for each time $t$. This MicroSim shows the four steps that produce that value:

1. **Flip.** Plot $h$ against $\tau$ and reverse it to get $h(-\tau)$.
2. **Slide.** Shift the flipped curve by $t$ to get $h(t - \tau)$. The dashed line marks $\tau = t$, the place where the origin of $h$ now sits.
3. **Multiply.** Form the product $x(\tau)\,h(t - \tau)$, shown as the shaded region. Green is positive and salmon is negative.
4. **Integrate.** The signed area of the shaded region is $y(t)$. It is plotted as the purple dot in the bottom panel.

The two small plots at the top show $x(t)$ and $h(t)$ as functions of time. The middle plot uses the
integration variable $\tau$ on the horizontal axis. The bottom plot uses $t$, and its axis lines up with the
middle plot, so the dashed marker is at the same horizontal position in both.

The output is only drawn up to the current time. This lets you predict the next part of the curve
before you reveal it.

| Signal pair | What to look for |
|-------------|------------------|
| Rectangle * Rectangle | Equal widths give a triangle with its peak at full overlap |
| Wide rectangle * Narrow rectangle | A trapezoid, flat while the narrow pulse is completely inside the wide one |
| Rectangle * Exponential (RC filter) | The output charges toward 1, then decays after the pulse ends |
| Exponential * Exponential | $e^{-t}u(t) * e^{-2t}u(t) = (e^{-t} - e^{-2t})u(t)$, peak 0.25 at $t = \ln 2$ |
| Triangle * Rectangle | A 1 s average of a triangle, with rounded corners |
| Triangle * Triangle | A smooth bump, wider than either input |
| Sine burst * Rectangle (averager) | A 0.5 s average passes a 1 Hz sine with gain $2/\pi \approx 0.64$ and a 0.25 s delay |
| Rectangle * Edge detector | $h(t)$ has zero area, so the output is zero wherever the input is constant |

The integral is evaluated numerically with the midpoint rule and a step of 0.005 s. For the rectangle
pairs the result is exact at every slider position.

## How to Use

1. Choose a pair of **Signals**.
2. Drag the **Time t** slider, or press **Step >** and **< Step** to move $t$ by 0.25 s. Watch the red curve slide
   and the shaded area change.
3. Read the value of the integral in the line under the plots.
4. Press **Play** to sweep $t$ automatically, and set the sweep rate with **Play speed**. The MicroSim starts paused.
   **Reset** returns $t$ to $-2$ s.

## Iframe Embed Code

You can add this MicroSim to any web page by adding this to your HTML:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/convolution-visualizer/main.html"
        height="632px"
        width="100%"
        scrolling="no"></iframe>
```

## Lesson Plan

### Learning Objectives

By the end of this activity, students will be able to:

1. **Explain** each step of the convolution integral: flip, slide, multiply and integrate.
2. **Identify** the range of $t$ over which two finite-duration signals overlap, and so where the output is non-zero.
3. **Predict** the shape of the output for simple pairs of signals.
4. **Describe** how the shape of an impulse response determines what a system does to its input.

### Grade Level

Undergraduate (signals and systems)

### Duration

20-25 minutes

### Prerequisites

- Time shifting and time reversal of signals
- The impulse response of an LTI system
- Integration as signed area

### Activities

1. **Exploration** (5 min): With Rectangle * Exponential selected, press Reset and then Step > repeatedly.
   At which $t$ does the output first become non-zero? Which way does the red curve face compared with the
   small $h(t)$ plot, and why?
2. **Guided Practice** (15 min):
    - Rectangle * Rectangle. Before stepping, sketch the output. At $t = 1$, $2$ and $3$ s the area should be
      1, 2 and 1. Over what range of $t$ is the output non-zero? Relate its length to the lengths of the two pulses.
    - Wide rectangle * Narrow rectangle. Predict the times at which the flat top of the trapezoid starts and ends.
    - Exponential * Exponential. Set $t = 0.70$ s and read the area. Compare it with $e^{-t} - e^{-2t}$.
    - Sine burst * Rectangle. Step through one full period after $t = 1$ s. Why do the green and salmon regions
      partly cancel? What would happen if the averager were 1 s long?
    - Rectangle * Edge detector. Explain why the output is zero between $t = 1$ and $t = 2$ s.
3. **Discussion** (5 min): Swap the roles of the two signals in your head. Does flipping $x$ instead of $h$
   change the answer? Which property of convolution does this show?

### Assessment

- Student states that the output of two pulses of durations $T_1$ and $T_2$ has duration $T_1 + T_2$.
- Student computes $y(t)$ at one time by finding the overlap region and its area without the MicroSim.
- Student explains why an impulse response with zero area removes constant inputs.

## References

1. Oppenheim, A. V., Willsky, A. S., & Nawab, S. H. (1997). *Signals and Systems* (2nd ed.). Prentice Hall. Chapter 2 covers the convolution sum and the convolution integral.
2. [Convolution](https://en.wikipedia.org/wiki/Convolution), Wikipedia.
3. [Chapter 4: Convolution and Correlation](../../chapters/04-convolution-and-correlation/index.md) of this textbook.
