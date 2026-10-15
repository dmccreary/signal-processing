// FFT with Two Oscillators MicroSim
// CANVAS_HEIGHT: 520
// Two oscillators, a sine and a cosine, are added together and played through the speakers.
// The top plot shows the sum in the time domain; the bottom plot shows its magnitude spectrum
// computed by an FFT. Sliders set each oscillator's frequency and amplitude.
// p5.js 2.3.2 + p5.sound 0.4.1. Original sketch: https://editor.p5js.org/dmccreary/sketches/XnH57-jNr
//
// p5.sound 0.4.1 notes (it differs from the old 1.x addon):
//   * new p5.FFT(size) takes ONE argument; analyze() returns LINEAR magnitudes.
//   * there is no 'cosine' oscillator type: the cosine is a sine with phase(270).
//     Tone.js treats phase as a delay, and a 270-degree delay equals a 90-degree lead (measured).
//   * there is no outputVolume(): Mute sets the gain of a p5.Gain between the oscillators and
//     the speakers, so the FFT keeps analysing the signal while the speakers are silent.

// Canvas dimensions and layout. The canvas height is fixed; narrow screens give the controls
// more rows and the plots a little less height (see computeLayout()).
let canvasWidth = 800;            // overwritten from the container in updateCanvasSize()
let drawHeight = 440;             // 440 on wide screens, 370 on narrow screens
let controlHeight = 80;           // 80 on wide screens (two rows), 150 on narrow screens (four rows)
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let defaultTextSize = 16;
const WIDE_MIN = 680;             // narrower than this: one column of controls
let narrow = false;
let layoutWidth = -1;

// Audio and FFT settings
const FFT_BINS = 8192;            // analyze() returns 8192 bins from 0 Hz to fs/2 (bin width fs/16384)
// Steady-state analyze() value of an amplitude-1.0 sine centred on a bin (measured: 0.21 =
// Blackman-window coherent gain 0.42 x 1/2). Values are linear, so height is proportional to amplitude.
const FULL_SCALE = 0.21;
const OUTPUT_LEVEL = 0.25;        // speaker level relative to the displayed signal (the FFT sees full amplitude)
const WAVE_BUFFER = 4096;         // waveform samples fetched per frame, so a trigger point can be found
const TIME_WINDOW_MS = 20;        // width of the time-domain window
const FREQ_MAX_DISPLAY = 2100;    // right edge of the spectrum plot in Hz (slider max is 2000 Hz)
const PEAK_THRESHOLD = 0.03;      // smallest normalised magnitude reported as a peak
const COSINE_PHASE = 270;         // Tone.js phase (a delay in degrees) that turns a sine into a cosine

// Audio objects (built on the first Start click, because browsers block audio until a user gesture)
let signalSine, signalCos, fft, outputGain;
let audioReady = false;

// Controls (p5 built-ins)
let freqSliderSine, ampSliderSine, freqSliderCos, ampSliderCos;
let pauseButton;                  // Start / Pause: turns both tones on and off
let muteButton;                   // Mute / Unmute: silences the speakers; the plots keep running

// Simulation state
let isRunning = false;
let isMuted = false;
let applied = { fs: null, as: null, fc: null, ac: null };
let peaks = [];                   // up to two strongest spectral peaks: { hz, mag }
let maxAbs = 0;                   // largest |x(t)| in the displayed window

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  // Oscillator 1: the sine
  freqSliderSine = createSlider(20, 2000, 440, 1);
  ampSliderSine = createSlider(0, 1, 0.5, 0.01);
  // Oscillator 2: the cosine
  freqSliderCos = createSlider(20, 2000, 880, 1);
  ampSliderCos = createSlider(0, 1, 0.3, 0.01);

  pauseButton = createButton('Start');
  pauseButton.mousePressed(togglePause);
  muteButton = createButton('Mute');
  muteButton.mousePressed(toggleMute);

  layoutControls(true);

  describe('Two oscillators, a sine and a cosine, are added together. The top plot shows the sum over a 20 millisecond window; the bottom plot shows its magnitude spectrum from 0 to 2100 Hz with one peak for each oscillator. Press Start, then move the four sliders to change each frequency and amplitude.');
}

function draw() {
  updateCanvasSize();
  applyOscillators();

  let spectrum = null;
  let wave = null;
  if (audioReady) {
    spectrum = fft.analyze();      // Float32Array(8192), linear magnitude
    wave = fft.waveform();         // Float32Array(WAVE_BUFFER), the summed signal
  }

  const g = plotGeometry();
  drawRegions(g);
  drawTitle();
  drawTimeSignal(wave, g);
  drawSpectrum(spectrum, g);
  drawControlLabels();
}

// ---------------------------------------------------------------- layout

// Vertical positions follow drawHeight; horizontal positions follow the canvas width.
function plotGeometry() {
  const avail = drawHeight - 190;                // height shared by the two plots
  const timeTop = 66;
  const timeBottom = timeTop + Math.round(avail * 0.48);
  const sepY = timeBottom + 42;
  return {
    x0: narrow ? 50 : 62,
    x1: canvasWidth - (narrow ? 10 : margin),
    timeTop: timeTop,
    timeBottom: timeBottom,
    sepY: sepY,
    freqLabelY: sepY + 22,
    freqTop: sepY + 38,
    freqBottom: drawHeight - 44
  };
}

function drawRegions(g) {
  // Drawing area background (light blue)
  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);

  // Controls area background (white)
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  // Separator line between the time and frequency domains
  stroke('black');
  line(0, g.sepY, canvasWidth, g.sepY);
}

function drawTitle() {
  noStroke();
  fill('black');
  if (narrow) {
    textSize(18);
    textAlign(LEFT, TOP);
    text('Sum of Two Oscillator Waves', 8, 10);
  } else {
    textSize(24);
    textAlign(CENTER, TOP);
    text('Sum of Two Oscillator Waves', canvasWidth / 2, 8);
  }

  // Status indicator
  textSize(narrow ? 14 : 16);
  textAlign(RIGHT, CENTER);
  let status = '● PAUSED';
  let col = '#c00000';
  if (isRunning && isMuted) { status = '● MUTED'; col = '#a35200'; }
  else if (isRunning) { status = '● RUNNING'; col = 'green'; }
  fill(col);
  text(status, canvasWidth - (narrow ? 8 : margin), narrow ? 20 : 22);
}

function drawRotatedLabel(label, yCenter) {
  push();
  translate(narrow ? 12 : 16, yCenter);
  rotate(-HALF_PI);
  fill('black');
  noStroke();
  textSize(14);
  textAlign(CENTER, CENTER);
  text(label, 0, 0);
  pop();
}

// ---------------------------------------------------------------- time domain

function drawTimeSignal(wave, g) {
  const x0 = g.x0, x1 = g.x1;
  const yMid = (g.timeTop + g.timeBottom) / 2;
  const yScale = (g.timeBottom - g.timeTop) / 2 - 4;
  // Vertical range: +/-1 while the two amplitudes add up to 1 or less, otherwise +/-2
  const total = Number(ampSliderSine.value()) + Number(ampSliderCos.value());
  const yMax = total > 1 ? 2 : 1;
  const ys = (v) => yMid - (v / yMax) * yScale;

  // Panel label
  noStroke();
  fill('green');
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  textSize(narrow ? 14 : 16);
  text(narrow ? 'Time domain: sine + cosine' : 'TIME DOMAIN: Combined Signal (Sine + Cosine)', narrow ? 8 : margin, 50);
  textStyle(NORMAL);

  // Grid lines at +/-yMax and +/-yMax/2, the zero line and the left axis
  strokeWeight(1);
  stroke(215);
  for (const a of [-1, -0.5, 0.5, 1]) line(x0, ys(a * yMax), x1, ys(a * yMax));
  stroke('gray');
  line(x0, yMid, x1, yMid);
  line(x0, g.timeTop, x0, g.timeBottom);

  // Amplitude tick labels
  noStroke();
  fill(60);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (const a of [yMax, 0, -yMax]) text(a, x0 - 6, ys(a));

  // Time tick labels (ms)
  textAlign(CENTER, CENTER);
  for (let t = 0; t <= TIME_WINDOW_MS; t += 5) {
    const x = map(t, 0, TIME_WINDOW_MS, x0, x1);
    stroke('gray');
    line(x, g.timeBottom - 4, x, g.timeBottom);
    noStroke();
    text(t, constrain(x, x0, x1 - 8), g.timeBottom + 12);
  }
  fill('black');
  text('Time (ms)', (x0 + x1) / 2, g.timeBottom + 30);
  drawRotatedLabel('Amplitude', yMid);

  if (!wave) {
    stroke('green');
    strokeWeight(2);
    line(x0, yMid, x1, yMid);
    noStroke();
    fill(90);
    textSize(16);
    textAlign(CENTER, CENTER);
    text('Press Start to hear and analyse the two waves', (x0 + x1) / 2, yMid - 24);
    return;
  }

  // Show a fixed 20 ms window that starts at a rising zero crossing, like an oscilloscope
  // trigger. Of the rising crossings within one period of the sum, use the steepest one, so a
  // periodic sum (for example 440 Hz + 880 Hz) is always triggered at the same point of its cycle.
  const sampleRate = getAudioContext().sampleRate;
  const n = Math.min(wave.length, Math.round(sampleRate * TIME_WINDOW_MS / 1000));
  const searchEnd = Math.min(wave.length - n, Math.ceil(sampleRate / triggerFrequency()) + 1);
  let start = 0;
  let bestSlope = 0;
  for (let i = 1; i <= searchEnd; i++) {
    if (wave[i - 1] < 0 && wave[i] >= 0) {
      const slope = wave[i] - wave[i - 1];
      if (slope > bestSlope * 1.001) { bestSlope = slope; start = i; }
    }
  }

  maxAbs = 0;
  stroke('green');
  strokeWeight(2);
  noFill();
  beginShape();
  for (let i = 0; i < n; i++) {
    const v = wave[start + i];
    if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
    vertex(map(i, 0, n, x0, x1), ys(constrain(v, -yMax, yMax)));
  }
  endShape();

  // Read-out: largest |x(t)| in the window
  noStroke();
  fill('green');
  textSize(narrow ? 14 : 16);
  textAlign(RIGHT, CENTER);
  text((narrow ? 'max |x| ' : 'Max |x(t)| = ') + maxAbs.toFixed(2), x1, 50);
}

// The repetition frequency used by the trigger search. The sum of two tones repeats at the
// greatest common divisor of the two (integer) slider frequencies. If that period is longer
// than 25 ms (for example 440 Hz + 450 Hz, which beat 10 times a second), search only one
// period of the lower tone, so the plot shows the beat envelope rising and falling.
function triggerFrequency() {
  const fs = Number(freqSliderSine.value()), fc = Number(freqSliderCos.value());
  const as = Number(ampSliderSine.value()), ac = Number(ampSliderCos.value());
  if (as === 0 && ac > 0) return fc;
  if (ac === 0 && as > 0) return fs;
  let a = fs, b = fc;
  while (b) [a, b] = [b, a % b];               // a = gcd(fs, fc)
  return a >= 40 ? a : Math.min(fs, fc);
}

// ---------------------------------------------------------------- frequency domain

function drawSpectrum(spectrum, g) {
  const x0 = g.x0, x1 = g.x1;
  const base = g.freqBottom;
  const top = g.freqTop + 8;                    // headroom for the peak markers
  const sampleRate = getAudioContext().sampleRate;
  const binHz = sampleRate / 2 / FFT_BINS;
  const fx = (hz) => map(hz, 0, FREQ_MAX_DISPLAY, x0, x1);
  const my = (m) => base - Math.min(1, m) * (base - top);

  // Panel label
  noStroke();
  fill('purple');
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  textSize(narrow ? 14 : 16);
  text(narrow ? 'Frequency domain: FFT' : 'FREQUENCY DOMAIN: FFT Analysis', narrow ? 8 : margin, g.freqLabelY);
  textStyle(NORMAL);

  // Grid lines at magnitude 0.5 and 1, the baseline and the left axis
  strokeWeight(1);
  stroke(215);
  for (const m of [0.5, 1]) line(x0, my(m), x1, my(m));
  stroke('gray');
  line(x0, base, x1, base);
  line(x0, g.freqTop, x0, base);

  // Magnitude tick labels
  noStroke();
  fill(60);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (const m of [0, 0.5, 1]) text(m, x0 - 6, my(m));

  // Frequency ticks: minor every 100 Hz, labelled every 500 Hz
  textAlign(CENTER, CENTER);
  for (let f = 0; f <= 2000; f += 100) {
    const x = fx(f);
    stroke('gray');
    line(x, base, x, base + (f % 500 === 0 ? 6 : 3));
    if (f % 500 === 0) {
      noStroke();
      text(f, x, base + 14);
    }
  }
  fill('black');
  noStroke();
  text('Frequency (Hz)', (x0 + x1) / 2, base + 32);
  drawRotatedLabel('Magnitude', (g.freqTop + base) / 2);

  // Sample rate and bin width (only where there is room)
  if (canvasWidth >= 800) {
    fill(90);
    textAlign(LEFT, CENTER);
    text('fs = ' + (sampleRate / 1000).toFixed(1) + ' kHz, bin width ' + binHz.toFixed(2) + ' Hz', x0, base + 32);
  }

  if (!spectrum) { peaks = []; return; }

  // Magnitude spectrum, normalised so an amplitude-1.0 sine centred on a bin reaches about 1
  const lastBin = Math.min(spectrum.length - 2, Math.floor(FREQ_MAX_DISPLAY / binHz));
  stroke('purple');
  strokeWeight(2);
  noFill();
  beginShape();
  for (let i = 0; i <= lastBin; i++) vertex(fx(i * binHz), my(spectrum[i] / FULL_SCALE));
  endShape();

  // The two strongest local maxima, listed in order of frequency
  const found = [];
  for (let i = 1; i <= lastBin; i++) {
    const m = spectrum[i] / FULL_SCALE;
    if (m > PEAK_THRESHOLD && spectrum[i] > spectrum[i - 1] && spectrum[i] >= spectrum[i + 1]) {
      found.push({ hz: i * binHz, mag: m });
    }
  }
  found.sort((a, b) => b.mag - a.mag);
  peaks = found.slice(0, 2).sort((a, b) => a.hz - b.hz);

  // Gold markers on the peaks
  for (const p of peaks) {
    const px = fx(p.hz);
    const py = my(p.mag);
    fill('gold');
    stroke('darkgoldenrod');
    strokeWeight(1);
    triangle(px - 6, py - 12, px + 6, py - 12, px, py - 2);
  }

  // Read-out of the peak frequencies and heights
  noStroke();
  fill('purple');
  textSize(narrow ? 14 : 16);
  textAlign(RIGHT, CENTER);
  let msg;
  if (peaks.length === 0) msg = narrow ? 'no peaks' : 'No peaks above ' + PEAK_THRESHOLD;
  else if (narrow) msg = peaks.map((p) => p.hz.toFixed(1)).join(', ') + ' Hz';
  else msg = (peaks.length === 1 ? 'Peak: ' : 'Peaks: ') +
    peaks.map((p) => p.hz.toFixed(1) + ' Hz (' + p.mag.toFixed(2) + ')').join(', ');
  text(msg, x1, g.freqLabelY);
}

// ---------------------------------------------------------------- controls

function drawControlLabels() {
  fill('black');
  noStroke();
  textSize(narrow ? 14 : defaultTextSize);
  textAlign(LEFT, CENTER);
  const labels = [
    'Sine Freq: ' + freqSliderSine.value() + ' Hz',
    'Sine Amp: ' + Number(ampSliderSine.value()).toFixed(2),
    'Cosine Freq: ' + freqSliderCos.value() + ' Hz',
    'Cosine Amp: ' + Number(ampSliderCos.value()).toFixed(2)
  ];
  const pos = controlPositions();
  for (let i = 0; i < 4; i++) text(labels[i], pos[i].labelX, pos[i].y + 10);
}

// Wide screens: two columns (sine | cosine) of two rows, buttons on the right.
// Narrow screens: one column of four rows, buttons to the right of the first two rows.
function controlPositions() {
  const pos = [];
  if (narrow) {
    const buttonX = canvasWidth - 8 - 72;
    const sliderLeft = 150;
    const w = Math.max(50, buttonX - 8 - sliderLeft);
    for (let r = 0; r < 4; r++) pos.push({ labelX: 8, sliderX: sliderLeft, y: drawHeight + 10 + r * 34, w: w });
  } else {
    const buttonX = canvasWidth - margin - 80;
    const colW = (buttonX - 10 - margin) / 2;
    const labelW = 165;
    const w = Math.max(60, colW - labelW - 15);
    for (let c = 0; c < 2; c++) {
      for (let r = 0; r < 2; r++) {
        pos.push({ labelX: margin + c * colW, sliderX: margin + c * colW + labelW, y: drawHeight + 15 + r * 33, w: w });
      }
    }
  }
  return pos;
}

function computeLayout() {
  narrow = canvasWidth < WIDE_MIN;
  controlHeight = narrow ? 150 : 80;
  drawHeight = canvasHeight - controlHeight;    // the canvas height itself never changes
}

function layoutControls(force) {
  computeLayout();
  if (typeof muteButton === 'undefined') return;
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  const pos = controlPositions();
  const sliders = [freqSliderSine, ampSliderSine, freqSliderCos, ampSliderCos];
  for (let i = 0; i < 4; i++) {
    sliders[i].position(pos[i].sliderX, pos[i].y);
    sliders[i].size(pos[i].w);
  }
  const bw = narrow ? 72 : 80;
  const bx = canvasWidth - (narrow ? 8 : margin) - bw;
  pauseButton.style('width', bw + 'px');
  muteButton.style('width', bw + 'px');
  pauseButton.position(bx, pos[0].y - 2);
  muteButton.position(bx, pos[1].y - 2);
}

// ---------------------------------------------------------------- audio

// Build the audio graph: each oscillator -> gain -> speakers, and each oscillator -> FFT.
// Called from the Start click, because browsers only allow audio after a user gesture.
function startAudio() {
  userStartAudio();                     // p5.sound 0.4.1 returns undefined here (no promise)
  const ctx = getAudioContext();
  if (ctx.state !== 'running') {
    try { ctx.resume(); } catch (e) { /* the oscillators still feed the FFT */ }
  }

  outputGain = new p5.Gain();           // connected to the speakers by default
  outputGain.getNode().gain.value = isMuted ? 0 : OUTPUT_LEVEL;

  fft = new p5.FFT(FFT_BINS);           // p5.sound 0.4.1: one argument (size)
  fft.analyzer.smoothing = 0.8;
  try { fft.samples.size = WAVE_BUFFER; } catch (e) { /* fall back to 1024 samples */ }

  // Pass the frequency to the constructor: it is set immediately, whereas freq() schedules a
  // ramp that can land a few milliseconds after start() and shift the starting phase.
  applied = { fs: Number(freqSliderSine.value()), as: null, fc: Number(freqSliderCos.value()), ac: null };
  signalSine = new p5.Oscillator(applied.fs, 'sine');
  signalCos = new p5.Oscillator(applied.fc, 'sine');
  signalCos.phase(COSINE_PHASE);        // a sine delayed by 270 degrees = cos
  for (const osc of [signalSine, signalCos]) {
    osc.amp(0);
    osc.disconnect();
    osc.connect(outputGain);
    osc.connect(fft);                   // the FFT sees the sum of the two oscillators
  }

  // Start both at one shared instant so sin and cos stay in step. p5.sound 0.4.1's start() takes
  // no time argument and the audio clock can advance between two calls (measured: the cosine
  // started one 128-sample block late in 3 of 10 page loads), so the underlying Tone.js
  // oscillators are started directly with the same start time. Tone applies the constructor's
  // frequency at node.now() (current time + look-ahead), so the start time must come after that.
  const t0 = signalSine.node.now() + 0.05;
  for (const osc of [signalSine, signalCos]) {
    osc.node.start(t0);
    osc.started = true;                 // the flag p5's own start() would set
  }
  audioReady = true;
}

function applyOscillators() {
  if (!audioReady || !isRunning) return;
  const fs = Number(freqSliderSine.value()), as = Number(ampSliderSine.value());
  const fc = Number(freqSliderCos.value()), ac = Number(ampSliderCos.value());
  if (fs !== applied.fs) { signalSine.freq(fs); applied.fs = fs; }
  if (fc !== applied.fc) { signalCos.freq(fc); applied.fc = fc; }
  if (as !== applied.as) { signalSine.amp(as, 0.05); applied.as = as; }
  if (ac !== applied.ac) { signalCos.amp(ac, 0.05); applied.ac = ac; }
}

// Start / Pause: Pause silences both oscillators (they keep running at zero amplitude)
function togglePause() {
  if (!audioReady) startAudio();
  isRunning = !isRunning;
  pauseButton.html(isRunning ? 'Pause' : 'Start');
  if (isRunning) {
    applied.as = null;                  // re-apply both amplitudes (frequencies are unchanged)
    applied.ac = null;
    applyOscillators();
  } else {
    signalSine.amp(0, 0.05);
    signalCos.amp(0, 0.05);
  }
}

// Mute / Unmute: silences the speakers only; the plots keep showing the signal
function toggleMute() {
  isMuted = !isMuted;
  muteButton.html(isMuted ? 'Unmute' : 'Mute');
  if (audioReady) outputGain.getNode().gain.value = isMuted ? 0 : OUTPUT_LEVEL;
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = Math.floor(container.getBoundingClientRect().width);
  layoutControls(false);
}
