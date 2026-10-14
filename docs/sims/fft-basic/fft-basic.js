// Basic FFT Visualization MicroSim
// CANVAS_HEIGHT: 520
// A sine-wave generator and its live FFT: the time-domain waveform on top and the
// magnitude spectrum below. p5.js 2.3.2 + p5.sound 0.4.1.

// Canvas dimensions and layout
let canvasWidth = 800;            // overwritten from the container in updateCanvasSize()
let drawHeight = 440;
let controlHeight = 80;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let defaultTextSize = 16;

// Plot geometry: y positions are fixed, x positions follow the canvas width
let plotLeft = 62;
const timePlot = { top: 66, bottom: 186 };    // amplitude +1 (top) .. -1 (bottom)
const freqPlot = { top: 266, bottom: 396 };   // magnitude 1 (top) .. 0 (baseline)

// Control layout (recomputed for narrow screens in layoutControls())
let ctl = { labelX: 20, labelSize: 16, sliderLeft: 175, right: 20 };
let buttonWidth = 72;
let layoutWidth = -1;

// Audio and FFT settings
const FFT_BINS = 8192;            // analyze() returns 8192 bins from 0 Hz to fs/2 (bin width fs/16384)
// Steady-state analyze() value of an amplitude-1.0 sine centred on a bin (measured: 0.21 =
// Blackman-window coherent gain 0.42 x 1/2). Values are linear, so height is proportional to amplitude.
const FULL_SCALE = 0.21;
const OUTPUT_LEVEL = 0.5;         // speaker level relative to the displayed signal (the FFT sees full amplitude)
const WAVE_BUFFER = 4096;         // waveform samples fetched per frame, so a trigger point can be found
const TIME_WINDOW_MS = 20;        // width of the time-domain window
const FREQ_MAX_DISPLAY = 2100;    // right edge of the spectrum plot in Hz (slider max is 2000 Hz)
const DEFAULT_FREQ = 440;         // A4
const DEFAULT_AMP = 0.5;

// Audio objects (built on the first Start click, because browsers block audio until a user gesture)
let oscillator, fft, outputGain;
let audioReady = false;

// Control elements
let frequencySlider, amplitudeSlider;
let startButton, resetButton;

// Simulation state
let isRunning = false;
let currentFreq = DEFAULT_FREQ;
let currentAmp = DEFAULT_AMP;
let appliedFreq = null;
let appliedAmp = null;
let peakHz = 0;
let peakMag = 0;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  createControls();
  layoutControls(true);

  describe('A sine-wave generator with its FFT. The top plot shows the waveform over a 20 millisecond window; the bottom plot shows its magnitude spectrum from 0 to 2100 Hz. Press Start, then move the Frequency and Amplitude sliders to see the spectral peak move and change height.');
}

function draw() {
  updateCanvasSize();

  // Read the controls every frame so the labels update even while paused
  currentFreq = Number(frequencySlider.value());
  currentAmp = Number(amplitudeSlider.value());
  applyOscillator();

  let spectrum = null;
  let wave = null;
  if (audioReady) {
    spectrum = fft.analyze();      // Float32Array(8192), linear magnitude
    wave = fft.waveform();         // Float32Array(WAVE_BUFFER), values in [-1, 1]
  }

  drawRegions();
  drawTitle();
  drawTimeSignal(wave);
  drawSpectrum(spectrum);
  drawControlLabels();
}

function drawRegions() {
  // Drawing area background (light blue)
  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);

  // Controls area background (white)
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  // Separator line between the time and frequency domains
  stroke(150);
  line(margin, 228, canvasWidth - margin, 228);
}

function drawTitle() {
  fill('black');
  noStroke();
  textSize(24);
  textAlign(CENTER, TOP);
  text('Basic FFT Visualization', canvasWidth / 2, 8);
}

function drawPanelLabel(label, y) {
  fill('black');
  noStroke();
  textSize(16);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text(label, margin, y);
  textStyle(NORMAL);
}

function drawRotatedLabel(label, yCenter) {
  push();
  translate(16, yCenter);
  rotate(-HALF_PI);
  fill('black');
  noStroke();
  textSize(14);
  textAlign(CENTER, CENTER);
  text(label, 0, 0);
  pop();
}

function drawTimeSignal(wave) {
  const x0 = plotLeft;
  const x1 = canvasWidth - margin;
  const yMid = (timePlot.top + timePlot.bottom) / 2;
  const yScale = (timePlot.bottom - timePlot.top) / 2 - 4;

  drawPanelLabel('Time Domain', 50);

  // Status indicator
  textAlign(RIGHT, CENTER);
  textSize(16);
  fill(isRunning ? 'green' : 'red');
  text(isRunning ? '● RUNNING' : '● PAUSED', canvasWidth - margin, 50);

  // Grid lines at +/-0.5 and +/-1 and the zero line
  strokeWeight(1);
  stroke(215);
  for (const a of [-1, -0.5, 0.5, 1]) line(x0, yMid - a * yScale, x1, yMid - a * yScale);
  stroke('gray');
  line(x0, yMid, x1, yMid);
  line(x0, timePlot.top, x0, timePlot.bottom);

  // Amplitude tick labels
  noStroke();
  fill(60);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (const a of [1, 0, -1]) text(a, x0 - 6, yMid - a * yScale);

  // Time tick labels (ms)
  textAlign(CENTER, CENTER);
  for (let t = 0; t <= TIME_WINDOW_MS; t += 5) {
    const x = map(t, 0, TIME_WINDOW_MS, x0, x1);
    stroke('gray');
    line(x, timePlot.bottom - 4, x, timePlot.bottom);
    noStroke();
    text(t, x, timePlot.bottom + 12);
  }
  fill('black');
  text('Time (ms)', (x0 + x1) / 2, timePlot.bottom + 30);
  drawRotatedLabel('Amplitude', yMid);

  if (!wave) {
    stroke('green');
    strokeWeight(2);
    line(x0, yMid, x1, yMid);
    noStroke();
    fill(90);
    textSize(16);
    textAlign(CENTER, CENTER);
    text('Press Start to generate the sine wave', (x0 + x1) / 2, yMid - 24);
    return;
  }

  // Show a fixed 20 ms window that starts at a rising zero crossing,
  // like an oscilloscope trigger, so the wave holds still from frame to frame.
  const sampleRate = getAudioContext().sampleRate;
  const n = Math.min(wave.length, Math.round(sampleRate * TIME_WINDOW_MS / 1000));
  let start = 0;
  for (let i = 1; i <= wave.length - n; i++) {
    if (wave[i - 1] < 0 && wave[i] >= 0) { start = i; break; }
  }

  stroke('green');
  strokeWeight(2);
  noFill();
  beginShape();
  for (let i = 0; i < n; i++) {
    vertex(map(i, 0, n, x0, x1), yMid - constrain(wave[start + i], -1, 1) * yScale);
  }
  endShape();
}

function drawSpectrum(spectrum) {
  const x0 = plotLeft;
  const x1 = canvasWidth - margin;
  const base = freqPlot.bottom;
  const top = freqPlot.top + 8;           // headroom for the peak marker
  const sampleRate = getAudioContext().sampleRate;

  drawPanelLabel('Frequency Domain', 250);

  // Grid lines at magnitude 0.5 and 1 and the baseline
  strokeWeight(1);
  stroke(215);
  for (const m of [0.5, 1]) line(x0, base - m * (base - top), x1, base - m * (base - top));
  stroke('gray');
  line(x0, base, x1, base);
  line(x0, freqPlot.top, x0, base);

  // Magnitude tick labels
  noStroke();
  fill(60);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (const m of [0, 0.5, 1]) text(m, x0 - 6, base - m * (base - top));

  // Frequency ticks: minor every 100 Hz, labelled every 500 Hz
  textAlign(CENTER, CENTER);
  for (let f = 0; f <= 2000; f += 100) {
    const x = map(f, 0, FREQ_MAX_DISPLAY, x0, x1);
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
  drawRotatedLabel('Magnitude', (freqPlot.top + base) / 2);

  // Sample rate and bin width (only where there is room)
  const binHz = sampleRate / 2 / FFT_BINS;
  if (canvasWidth >= 700) {
    fill(90);
    textAlign(LEFT, CENTER);
    text('fs = ' + (sampleRate / 1000).toFixed(1) + ' kHz, bin width ' + binHz.toFixed(2) + ' Hz', x0, base + 32);
  }

  if (!spectrum) return;

  // Filled magnitude spectrum, normalised so an amplitude-1.0 sine reaches about 1
  const lastBin = Math.min(spectrum.length - 1, Math.floor(FREQ_MAX_DISPLAY / binHz));
  let peakBin = 0;
  peakMag = 0;
  fill('purple');
  stroke('purple');
  strokeWeight(2);                        // keeps the narrow spike visible on small screens
  beginShape();
  vertex(x0, base);
  for (let i = 0; i <= lastBin; i++) {
    const m = spectrum[i] / FULL_SCALE;
    if (m > peakMag) { peakMag = m; peakBin = i; }
    vertex(map(i * binHz, 0, FREQ_MAX_DISPLAY, x0, x1), base - Math.min(1, m) * (base - top));
  }
  vertex(map(lastBin * binHz, 0, FREQ_MAX_DISPLAY, x0, x1), base);
  endShape(CLOSE);
  peakHz = peakBin * binHz;

  // Peak marker and read-out
  if (peakMag > 0.02) {
    const px = map(peakHz, 0, FREQ_MAX_DISPLAY, x0, x1);
    const py = base - Math.min(1, peakMag) * (base - top);
    fill('gold');
    stroke('darkgoldenrod');
    strokeWeight(1);
    triangle(px - 6, py - 12, px + 6, py - 12, px, py - 2);
    noStroke();
    fill('purple');
    textSize(16);
    textAlign(RIGHT, CENTER);
    const msg = canvasWidth >= 600
      ? 'Strongest bin: ' + peakHz.toFixed(1) + ' Hz, magnitude ' + peakMag.toFixed(2)
      : 'Peak: ' + peakHz.toFixed(1) + ' Hz';
    text(msg, canvasWidth - margin, 250);
  }
}

function drawControlLabels() {
  fill('black');
  noStroke();
  textSize(ctl.labelSize);
  textAlign(LEFT, CENTER);
  text('Frequency: ' + currentFreq.toFixed(0) + ' Hz', ctl.labelX, drawHeight + 25);
  text('Amplitude: ' + currentAmp.toFixed(2), ctl.labelX, drawHeight + 58);
}

function createControls() {
  // Frequency slider (20-2000 Hz)
  frequencySlider = createSlider(20, 2000, DEFAULT_FREQ, 1);

  // Amplitude slider (0-1)
  amplitudeSlider = createSlider(0, 1, DEFAULT_AMP, 0.01);

  // Start/Pause button
  startButton = createButton('Start');
  startButton.style('width', buttonWidth + 'px');
  startButton.mousePressed(toggleSimulation);

  // Reset button
  resetButton = createButton('Reset');
  resetButton.style('width', buttonWidth + 'px');
  resetButton.mousePressed(resetSimulation);
}

// Two rows: [label][slider][button]. Narrow screens get smaller labels and padding.
function layoutControls(force) {
  if (typeof frequencySlider === 'undefined') return;
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  const compact = canvasWidth < 500;
  ctl = compact
    ? { labelX: 8, labelSize: 14, sliderLeft: 145, right: 8 }
    : { labelX: 20, labelSize: 16, sliderLeft: 175, right: 20 };
  const buttonX = canvasWidth - ctl.right - buttonWidth;
  const sliderWidth = max(60, buttonX - 10 - ctl.sliderLeft);

  frequencySlider.position(ctl.sliderLeft, drawHeight + 15);
  frequencySlider.size(sliderWidth);
  amplitudeSlider.position(ctl.sliderLeft, drawHeight + 48);
  amplitudeSlider.size(sliderWidth);
  startButton.position(buttonX, drawHeight + 13);
  resetButton.position(buttonX, drawHeight + 46);
}

// Build the audio graph: oscillator -> gain -> speakers, and oscillator -> FFT.
// Called from the Start click, because browsers only allow audio after a user gesture.
function startAudio() {
  userStartAudio();                     // p5.sound 0.4.1 returns undefined here (no promise)
  const ctx = getAudioContext();
  if (ctx.state !== 'running') {
    try { ctx.resume(); } catch (e) { /* the oscillator still feeds the FFT */ }
  }

  oscillator = new p5.Oscillator('sine');
  oscillator.freq(currentFreq);
  oscillator.amp(0);

  outputGain = new p5.Gain();           // connected to the speakers by default
  oscillator.disconnect();
  oscillator.connect(outputGain);
  outputGain.getNode().gain.value = OUTPUT_LEVEL;

  fft = new p5.FFT(FFT_BINS);           // p5.sound 0.4.1: one argument (size)
  fft.analyzer.smoothing = 0.8;
  try { fft.samples.size = WAVE_BUFFER; } catch (e) { /* fall back to 1024 samples */ }
  fft.setInput(oscillator);

  oscillator.start();
  audioReady = true;
}

function applyOscillator() {
  if (!audioReady || !isRunning) return;
  if (currentFreq !== appliedFreq) {
    oscillator.freq(currentFreq);
    appliedFreq = currentFreq;
  }
  if (currentAmp !== appliedAmp) {
    oscillator.amp(currentAmp, 0.05);
    appliedAmp = currentAmp;
  }
}

function toggleSimulation() {
  if (!audioReady) startAudio();
  isRunning = !isRunning;
  startButton.html(isRunning ? 'Pause' : 'Start');

  if (isRunning) {
    appliedFreq = null;
    appliedAmp = null;
    applyOscillator();
  } else {
    oscillator.amp(0, 0.05);            // silence when paused
  }
}

function resetSimulation() {
  // Restore the default values; draw() applies them to the oscillator if it is running
  frequencySlider.value(DEFAULT_FREQ);
  amplitudeSlider.value(DEFAULT_AMP);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  layoutControls(false);
}
