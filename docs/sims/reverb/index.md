---
title: Sound Reverb Effect
description: Play a music clip through a convolution reverb, set the decay time and the dry/wet mix, and watch the reverb tail fade after the source stops.
image: /sims/reverb/reverb.png
og:image: /sims/reverb/reverb.png
twitter:image: /sims/reverb/reverb.png
social:
   cards: false
quality_score: 100
---

# Sound Reverb Effect

<iframe src="main.html" width="100%" height="422px" scrolling="no"></iframe>

Copy this iframe to your website:

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/reverb/main.html" width="100%" height="422px" scrolling="no"></iframe>
```

[Run MicroSim in Fullscreen](main.html){ .md-button .md-button--primary }

<!-- TODO(user): add the p5.js editor link once the sketch is saved in editor.p5js.org:
[Edit in the p5.js Editor](https://editor.p5js.org/<username>/sketches/reverb) -->

## Description

Reverberation is the sound that keeps arriving after a source stops, built from thousands of reflections off the
walls of a room. This MicroSim plays a short music clip (2.4 s, looped) through a digital reverb and plots, over the
last 8 seconds, the level of the **dry clip** going into the reverb (blue) and of the **output you hear** (maroon),
in decibels relative to full scale (dBFS).

| Control | What it does |
|---------|--------------|
| **Play / Stop** | Play starts the clip from the beginning; Stop silences the clip, so only the reverb tail is left. A gold dashed line marks the moment the clip fell silent. |
| **Decay time** | Length of the reverb's impulse response, 1 to 10 s. The panel shows the resulting reverberation time RT60. |
| **Wet mix** | Dry/wet balance, 0 % (clip only) to 100 % (reverb only). The bars show the dry and wet gains. |

With **Wet mix** at 0 % the maroon trace sits on the blue one and drops to silence the instant you press Stop. Raise
the wet mix and the maroon trace keeps going after Stop: that tail is the reverb. On the decibel axis the tail is a
straight line, because the reverb's impulse response decays exponentially.

The reverb is a convolution, so this simulation belongs with
[Chapter 4: Convolution and Correlation](../../chapters/04-convolution-and-correlation/index.md).

The music clip is *Dancing Tiger* by Damscray, the sample file used in the p5.js sound examples. Its licence has not
yet been verified.

### Mathematical Concepts

The output is the clip $x(t)$ convolved with the room's impulse response $h(t)$:

$$y(t) = (x * h)(t) = \int_0^{\infty} h(\tau)\, x(t - \tau)\, d\tau$$

so $y$ keeps sounding for as long as $h$ is non-zero, even after $x$ has stopped. The reverb used here (p5.sound 0.4.1,
which wraps the Tone.js `Reverb`) builds $h(t)$ as stereo white noise multiplied by an exponential envelope
$e^{-t/\tau}$ with $\tau = \ln(d + 1)/\ln 200$, where $d$ is the decay time, and cuts it to zero at $t = d$.
The reverberation time RT60 is the time for the level to fall by 60 dB (a factor of 1000 in amplitude):

$$\mathrm{RT60} = \tau \ln 1000 = \frac{\ln 1000}{\ln 200}\,\ln(d + 1) \approx 1.30\,\ln(d + 1)$$

The default $d = 3$ s gives RT60 = 1.81 s; the slider range 1 to 10 s gives 0.90 to 3.13 s. These values match
RT60s measured from the impulse responses the library actually generates to within 3 %.

The **Wet mix** $w$ is an *equal-power* crossfade: the dry gain is $\cos(w\pi/2)$ and the wet gain is
$\sin(w\pi/2)$, so the squared gains always add up to 1. At 50 % both gains are 0.71.

## Lesson Plan

### Learning Objectives

After using this MicroSim, students will be able to:

1. **Explain** why the reverb output continues after the source stops, using the convolution $y = x * h$.
2. **Predict** how moving the Wet mix from 0 % to 100 % changes the dry and wet gains and the sound after Stop.
3. **Estimate** the reverberation time RT60 from the slope of the decaying tail on the decibel plot.
4. **Calculate** RT60 from the decay time $d$ and compare it with the value shown in the panel.
5. **Distinguish** between reverb (a dense, smoothly decaying tail) and a discrete echo.

### Target Audience

College undergraduates in an introductory signal processing, audio engineering or music technology course.
Plan 15-20 minutes. Headphones or speakers are required.

### Prerequisites

- Decibels and logarithms
- The impulse response of a linear time-invariant system
- Convolution (Chapter 4)

### Activities

**Activity 1: Dry versus wet (5 min).** Set **Wet mix** to 0 %, press **Play**, wait a few seconds and press
**Stop**. Both traces fall to the bottom of the plot at the same instant and the sound stops at once. Now set
**Wet mix** to 100 % and repeat. The blue trace still drops at once, but the maroon output trace keeps going and
takes about 1.5 s to reach the bottom of the plot (−80 dB); you hear the tail.

**Activity 2: Measure RT60 (5 min).** Keep **Wet mix** at 100 % and **Decay time** at 3.0 s. Play for a few seconds,
press **Stop**, and measure how long the maroon tail takes to fall 20 dB (one grid spacing). It takes about 0.6 s.
Multiply by 3 to estimate the time for a 60 dB fall and compare it with the **RT60 (est.)** read-out of 1.81 s.

**Activity 3: Small room, big hall (5 min).** Repeat Activity 2 with **Decay time** 1.0 s and then 10.0 s. Predict
the slopes before you look: RT60 = 0.90 s means a fall of about 66 dB per second, and RT60 = 3.13 s means about 19 dB
per second. Listen to how the long tail blurs the notes of the clip together.

**Activity 4: Equal-power mixing (5 min).** Move **Wet mix** to 25 %, 50 % and 75 % and read the gain bars:
0.92/0.38, 0.71/0.71 and 0.38/0.92. Square and add each pair. The sum is always 1: an equal-power crossfade keeps
the combined power of two unrelated signals constant, where a linear crossfade (0.5/0.5 in the middle) would dip.
The output still gets quieter toward 100 % because the reverb's wet signal is itself about 10 dB quieter than the
dry clip; compare the two traces at 100 %.

### Assessment

1. The **Decay time** slider is set to 5 s. What RT60 does the panel show? *(Answer: $1.30 \ln 6 \approx 2.34$ s.)*
2. At **Wet mix** = 25 %, what are the dry and wet gains, and what is the sum of their squares?
   *(Answer: $\cos(\pi/8) = 0.92$ and $\sin(\pi/8) = 0.38$; $0.92^2 + 0.38^2 = 1$.)*
3. After Stop with **Wet mix** at 100 %, why does the maroon trace keep going while the blue trace has already
   dropped to the floor? Why does this not happen at 0 %?
   *(Answer: the output is $y(t) = \int h(\tau)x(t-\tau)\,d\tau$, which still contains past input for as long as
   $h$ is non-zero. At 0 % wet the output is the dry clip only, with no convolution.)*
4. A hall has an RT60 of 2 s. A chord at 80 dB SPL is cut off. How long until it has fallen to 50 dB SPL?
   *(Answer: a 30 dB fall is half of 60 dB, so 1 s.)*
5. A 3 s impulse response sampled at 48 kHz has how many samples, and how many multiply-adds per output sample
   would direct convolution need? *(Answer: 144,000 of each, per channel. This is why reverbs use FFT-based fast
   convolution.)*

### Common Misconceptions

- **"Reverb is just an echo."** An echo is a single delayed copy you can hear as a separate event. Reverb is a dense
  mass of reflections whose level decays smoothly. The maroon tail in this simulation falls along a roughly straight,
  unbroken line on the decibel plot, with no separate repeats.
- **"The decay time is the reverberation time."** In this library the decay time is the *length* of the impulse
  response. The level falls 60 dB well before the end: a 3 s decay gives an RT60 of 1.81 s, as the panel shows.

## References

1. [Reverberation](https://en.wikipedia.org/wiki/Reverberation) - Wikipedia - what reverberation is and how the reverberation time RT60 is defined
2. [Convolution reverb](https://en.wikipedia.org/wiki/Convolution_reverb) - Wikipedia - how a reverb is computed by convolving a signal with an impulse response
3. [Impulse response](https://en.wikipedia.org/wiki/Impulse_response) - Wikipedia - the system description that the reverb tail comes from
4. [Convolution](https://en.wikipedia.org/wiki/Convolution) - Wikipedia - the operation $y = x * h$ used by the reverb
5. [The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/) - Steven W. Smith - free online textbook with chapters on convolution and FFT convolution
6. [p5.sound.js](https://github.com/processing/p5.sound.js) - Processing Foundation - the audio library used by this MicroSim
