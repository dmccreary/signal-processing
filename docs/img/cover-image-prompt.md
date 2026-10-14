# Cover Image Prompt

Please generate a professional-quality cover image for this textbook.
This image will be used in social media previews and must follow the
formatting guidelines for an Open Graph image preview.

**Required specifications:**
- Format: PNG
- Wide-landscape format
- Size: 1200x630 pixels (1.91:1 aspect ratio)
- This is the Open Graph standard for social media previews

The image has four layers, back to front: background montage, color
treatment, mascot, and title text.

## Subject & Tone

Signal Processing with AI is a college-level textbook about how signals such as
sound, radio, and sensor data are sampled, transformed into the frequency
domain, filtered, and analyzed, taught through interactive MicroSim
simulations and generative AI. The intended audience is college students with
a wide range of math backgrounds, plus the instructors who teach them. The
visual tone should be modern, technical, and approachable: it should feel like
a real engineering oscilloscope display, not a stock-art textbook, but with
enough warmth that a student with limited math background is invited in rather
than intimidated.

## Title

Place **Signal Processing with AI** in the center of the image, in a clean,
highly legible bold sans-serif font. Use a white font color for "Signal
Processing" and the book's gold (#E6B800) for "with AI", with a subtle drop
shadow or dark scrim behind the whole title so it stays readable against the
busy montage background. Keep the title large and on at most two lines: do not
shrink it to fit; instead simplify the background directly behind the text.

## Background Montage

Arrange a montage of the following 8 concepts around the title, each rendered
in a consistent illustration style (see Style below) so the composition reads
as one image rather than a collage of unrelated styles:

1. **Sine wave (time domain)**: a smooth glowing teal sinusoid with a faint
   grid behind it, like an oscilloscope trace.
2. **FFT spectrum (frequency domain)**: a row of vertical bars of varying
   height in violet and magenta rising to a single sharp peak, as if the sine
   wave had just been decomposed into frequencies.
3. **Nyquist-Shannon sampling**: a smooth wave overlaid with evenly spaced
   bright red sample dots, with a coarser stair-step or piecewise-line
   reconstruction drawn just below it.
4. **Complex plane and phasor**: a circle with real and imaginary axes and a
   gold arrow (phasor) at an angle theta, with a dashed projection down to the
   real axis.
5. **Convolution**: a blue rectangle sliding across a red triangle, with a
   small curve showing the overlap area building up beneath them.
6. **Spectrogram**: a rectangular heat map of frequency versus time, in warm
   orange, yellow, and deep blue bands, like a map of a bird song or a speech
   clip.
7. **Low-pass filter response**: a smooth curve that stays flat and then rolls
   off steeply to the right, in cyan, with a small dashed vertical line at the
   cutoff frequency.
8. **Microcontroller and AI**: a small square chip with gold pins along its
   edges, with a tiny layered neural-network node-and-edge diagram glowing
   above it, representing low-cost DSP hardware and machine learning.

Spread the elements around the edges and corners of the image so they frame the
title in a loose ring. Let a few waveform lines flow behind the title and
connect neighboring elements, so the montage reads as one continuous signal.

## Mascot

Place the book's mascot, **Echo the Bat**, in the lower-left corner, sized so
it does not overlap the title text. Echo is a small, round, friendly cartoon
bat with a deep maroon body (#800000), a cream belly (#F5E6C8), large gold
inner ears (#E6B800), small round gold-rimmed glasses, and compact gold
over-ear headphones worn between the ears. Echo has large, kind dark eyes and a
gentle smile with no visible fangs. Use the waving "welcome" pose: one wing
raised in greeting, facing the viewer. Match the reference image
`docs/img/mascot/welcome.png` as closely as possible, in modern flat vector
style with clean bold outlines and flat shading.

## Style & Composition

- Illustration style: flat vector with clean bold outlines and a soft neon
  glow on the line work, using a single style for every montage element.
- Color palette: deep navy and indigo background, with cyan and teal waveforms,
  gold (#E6B800) and orange accents, and small touches of magenta and red.
  Echo's maroon (#800000) should pop clearly against the dark navy background.
- Lighting/mood: bright, optimistic, and energetic, like a glowing instrument
  display in a dark lab.
- Composition: title centered, montage elements arranged in a loose ring around
  it, Echo in the lower-left, generous negative space and a soft dark scrim
  immediately behind the title so it stays readable.

## Avoid

- Do not render dense paragraphs or small illegible text anywhere in the image.
  Short axis labels such as "Hz" or "t" are acceptable only if clearly legible
  at 1200x630.
- Do not include any other words besides the title: no subtitle, author name,
  logo, watermark, or URL.
- Avoid generic stock-photo cliches (handshakes, isolated lightbulbs, people
  pointing at whiteboards) and generic "glowing brain" or "robot head" AI
  imagery.
- Avoid photorealistic human faces and avoid a realistic-looking bat: Echo must
  stay a cute flat-vector cartoon with no fangs.
- Do not let montage elements visually compete with or overlap the title or
  Echo.
- Do not crop Echo's wing, ears, or headphones at the image edge.
