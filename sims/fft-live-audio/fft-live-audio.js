// FFT Live Audio from Microphone MicroSim
// CANVAS_HEIGHT: 480
// Visualize the frequency spectrum of live microphone input with adjustable
// smoothness and FFT size.  p5.js 2.3.2 + p5.sound 0.4.1.
//
// p5.sound 0.4.1 notes (it differs from the old 1.x addon):
//   * new p5.FFT(size) takes ONE argument, the number of frequency bins from 0 Hz to the
//     Nyquist frequency. The size is fixed at construction, so a new FFT is built whenever
//     the FFT Size slider moves. Smoothing is a property: fft.analyzer.smoothing = s.
//   * analyze() returns LINEAR magnitudes. Converting to dB and mapping -100..-30 dB onto the
//     bar height reproduces the 1.x 0..255 byte scale exactly (the Web Audio AnalyserNode
//     defaults minDecibels = -100 and maxDecibels = -30).
//   * p5.AudioIn is routed to the speakers by default (1.x was not). We disconnect it so
//     the microphone is never played back, which would cause feedback.
//   * userStartAudio() returns undefined, not a promise, and mic.start() reports no errors,
//     so the sketch watches mic.node.state to know when the microphone is really open.

// Canvas dimensions and layout
let canvasWidth = 800;               // overwritten from the container in updateCanvasSize()
let drawHeight = 400;
let controlHeight = 80;
let canvasHeight = drawHeight + controlHeight;
let margin = 40;
let defaultTextSize = 16;

// Plot geometry: y positions are fixed, x positions follow the canvas width
let plotLeft = 62;
let plotRightMargin = 28;
const plotTop = 92;
const plotBaseline = 340;

// Display scale (see the notes above)
const DB_FLOOR = -100;               // dB drawn as an empty bar
const DB_CEIL = -30;                 // dB drawn as a full-height bar
const PEAK_MIN_HZ = 50;              // ignore DC and room rumble when finding the strongest peak
const MIC_TIMEOUT_MS = 6000;         // how long to wait for the microphone before giving up

// Control layout (recomputed for narrow screens in layoutControls())
let ctl = { labelX: 10, labelSize: 16, sliderLeft: 190, right: 12, buttonWidth: 72 };
let layoutWidth = -1;

// Audio objects (built on the first Start click, because browsers block audio until a user gesture)
let mic = null;
let fft = null;
let sampleRateHz = 48000;

// Control elements
let smoothnessSlider, fftSizeSlider;
let startButton, resetButton;

// Simulation state
const DEFAULT_SMOOTHNESS = 0.5;
const DEFAULT_SIZE_INDEX = 3;        // 1024
let fftSizeOptions = [128, 256, 512, 1024, 2048, 4096, 8192, 16384];
let fftSizeIndex = DEFAULT_SIZE_INDEX;
let currentFftSize = fftSizeOptions[fftSizeIndex];
let currentSmoothness = DEFAULT_SMOOTHNESS;
let isRunning = false;
let micStartMs = 0;
let peakHz = null;
let peakDb = null;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  try { sampleRateHz = getAudioContext().sampleRate; } catch (e) { /* keep 48000 */ }

  createControls();
  layoutControls(true);

  describe('Live microphone spectrum analyzer. Press Start and allow microphone access; purple bars show the FFT magnitude in decibels from 0 Hz to the Nyquist frequency. The Smoothness slider averages successive spectra and the FFT Size slider sets the number of frequency bins.');
}

function draw() {
  updateCanvasSize();
  updateFFTParameters();
  closeLateMic();

  drawRegions();
  drawTitle();
  drawInfoLine();
  drawGridAndAxes();

  const state = micState();
  if (state === 'live') {
    drawSpectrum();
  } else {
    peakHz = null;
    drawInactiveState(state);
  }

  drawControlLabels();
}

// ---- drawing ---------------------------------------------------------------------

function plotRight() {
  return canvasWidth - plotRightMargin;
}

function drawRegions() {
  // Drawing area background (light blue)
  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);

  // Controls area background (white)
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(0, drawHeight, canvasWidth, controlHeight);
}

function drawTitle() {
  fill('black');
  noStroke();
  textSize(24);
  textAlign(CENTER, TOP);
  text('Live Audio FFT Analysis', canvasWidth / 2, 10);
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
}

// Sample rate, bin width and analysis window, plus the recording status
function drawInfoLine() {
  const binHz = sampleRateHz / 2 / currentFftSize;
  const windowSamples = 2 * currentFftSize;
  const windowMs = windowSamples / sampleRateHz * 1000;
  const compact = canvasWidth < 640;

  noStroke();
  fill(60);
  textSize(compact ? 14 : 15);
  textAlign(LEFT, CENTER);
  const info = compact
    ? 'bin ' + binHz.toFixed(1) + ' Hz, window ' + windowMs.toFixed(1) + ' ms'
    : 'fs = ' + (sampleRateHz / 1000).toFixed(1) + ' kHz    bin width = ' + binHz.toFixed(2) +
      ' Hz    window = ' + windowSamples + ' samples (' + windowMs.toFixed(1) + ' ms)';
  text(info, 10, 50);

  // Status indicator
  const state = micState();
  textAlign(RIGHT, CENTER);
  textSize(compact ? 14 : 16);
  if (state === 'live') {
    fill('green');
    text('● LISTENING', canvasWidth - 10, 50);   // was "RECORDING"; nothing is recorded
  } else if (state === 'waiting') {
    fill('darkorange');
    text('● WAITING FOR MIC', canvasWidth - 10, 50);
  } else if (state === 'failed') {
    fill('red');
    text('● NO MICROPHONE', canvasWidth - 10, 50);
  } else {
    fill('red');
    text('● STOPPED', canvasWidth - 10, 50);
  }
  textSize(defaultTextSize);
}

// Frequency axis in kHz from 0 to the Nyquist frequency, magnitude axis in dB
function drawGridAndAxes() {
  const x0 = plotLeft;
  const x1 = plotRight();
  const nyquist = sampleRateHz / 2;

  // Horizontal grid lines every 10 dB
  strokeWeight(1);
  for (let db = DB_FLOOR; db <= DB_CEIL; db += 10) {
    const y = dbToY(db);
    stroke(db === DB_FLOOR ? 'gray' : 220);
    line(x0, y, x1, y);
  }
  stroke('gray');
  line(x0, plotTop, x0, plotBaseline);

  // dB tick labels
  noStroke();
  fill(60);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (let db = DB_FLOOR; db <= DB_CEIL; db += 10) {
    text(db, x0 - 6, dbToY(db));
  }

  // Frequency ticks: pick a round step so the labels are at least 45 px apart
  const stepsKHz = [1, 2, 4, 5, 10];
  let stepKHz = 10;
  for (const s of stepsKHz) {
    if ((s * 1000 / nyquist) * (x1 - x0) >= 45) { stepKHz = s; break; }
  }
  textAlign(CENTER, TOP);
  for (let k = 0; k * 1000 <= nyquist + 1e-6; k += stepKHz) {
    const x = hzToX(k * 1000);
    stroke('gray');
    line(x, plotBaseline, x, plotBaseline + 5);
    noStroke();
    text(k, x, plotBaseline + 8);
  }

  // Axis titles
  fill('black');
  textSize(14);
  textAlign(CENTER, TOP);
  text('Frequency (kHz)', (x0 + x1) / 2, plotBaseline + 30);

  push();
  translate(16, (plotTop + plotBaseline) / 2);
  rotate(-PI / 2);
  textAlign(CENTER, CENTER);
  text('Magnitude (dB)', 0, 0);
  pop();
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
}

function drawSpectrum() {
  const spectrum = fft.analyze();          // Float32Array(currentFftSize), linear magnitude
  const n = spectrum.length;
  const x0 = plotLeft;
  const plotWidth = plotRight() - plotLeft;
  const barWidth = plotWidth / n;
  const binHz = sampleRateHz / 2 / n;

  if (barWidth >= 3) {
    // Few bins: one bar per bin, coloured by intensity, as in the original sketch
    stroke('purple');
    strokeWeight(1);
    for (let i = 0; i < n; i++) {
      const intensity = dbToLevel(toDb(spectrum[i]));
      const h = intensity * (plotBaseline - plotTop);
      fill(255 - intensity * 100, intensity * 255, 255 - intensity * 200, 200);
      rect(x0 + i * barWidth, plotBaseline - h, barWidth * 0.8, h);
    }
  } else {
    // Many bins: several bins share one pixel column, so draw the tallest bin of each column
    stroke('purple');
    strokeWeight(1);
    const columns = Math.floor(plotWidth);
    for (let c = 0; c < columns; c++) {
      const i0 = Math.floor(c * n / columns);
      const i1 = Math.max(i0 + 1, Math.floor((c + 1) * n / columns));
      let v = 0;
      for (let i = i0; i < i1; i++) if (spectrum[i] > v) v = spectrum[i];
      const h = dbToLevel(toDb(v)) * (plotBaseline - plotTop);
      if (h > 0) line(x0 + c + 0.5, plotBaseline, x0 + c + 0.5, plotBaseline - h);
    }
  }

  // Strongest peak above PEAK_MIN_HZ
  let peakBin = -1;
  let peakV = 0;
  for (let i = Math.ceil(PEAK_MIN_HZ / binHz); i < n; i++) {
    if (spectrum[i] > peakV) { peakV = spectrum[i]; peakBin = i; }
  }
  peakDb = toDb(peakV);
  peakHz = (peakBin >= 0 && peakDb > DB_FLOOR + 5) ? peakBin * binHz : null;

  if (peakHz !== null) {
    const px = x0 + (peakBin + 0.5) * barWidth;
    const py = dbToY(peakDb);
    fill('gold');
    stroke('darkgoldenrod');
    strokeWeight(1);
    triangle(px - 6, py - 13, px + 6, py - 13, px, py - 3);
  }

  drawReadouts(spectrum, binHz);
}

// Strongest-peak read-out (left) and the frequency under the mouse (right)
function drawReadouts(spectrum, binHz) {
  const compact = canvasWidth < 640;
  noStroke();
  textSize(compact ? 14 : 16);
  textAlign(LEFT, CENTER);
  fill('purple');
  if (peakHz !== null) {
    text((compact ? 'Peak ' : 'Strongest peak: ') + formatHz(peakHz) + ' (' + peakDb.toFixed(0) + ' dB)', 10, 74);
  } else {
    text(compact ? 'Peak: none' : 'Strongest peak: none (quiet)', 10, 74);
  }

  // Cursor read-out
  if (mouseX >= plotLeft && mouseX <= plotRight() && mouseY >= plotTop && mouseY <= plotBaseline) {
    const hz = (mouseX - plotLeft) / (plotRight() - plotLeft) * sampleRateHz / 2;
    const bin = constrain(Math.floor(hz / binHz), 0, spectrum.length - 1);
    stroke('darkgoldenrod');
    strokeWeight(1);
    line(mouseX, plotTop, mouseX, plotBaseline);
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text((compact ? '' : 'Cursor: ') + formatHz(hz) + ', ' + toDb(spectrum[bin]).toFixed(0) + ' dB', canvasWidth - 10, 74);
  }
  textSize(defaultTextSize);
}

function drawInactiveState(state) {
  const cx = (plotLeft + plotRight()) / 2;
  const cy = (plotTop + plotBaseline) / 2;
  fill('gray');
  noStroke();
  textSize(18);
  textAlign(CENTER, CENTER);
  if (state === 'waiting') {
    text('Waiting for the microphone...', cx, cy);
    text('(allow microphone access if the browser asks)', cx, cy + 25);
  } else if (state === 'failed') {
    fill('red');
    text('No microphone signal.', cx, cy);
    text('Allow microphone access, then press Stop and Start.', cx, cy + 25);
  } else {
    text('Click "Start" to begin audio analysis', cx, cy);
    text('(Microphone permission required)', cx, cy + 25);
  }
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
}

function drawControlLabels() {
  fill('black');
  noStroke();
  textSize(ctl.labelSize);
  textAlign(LEFT, CENTER);
  text('Smoothness: ' + currentSmoothness.toFixed(2), ctl.labelX, drawHeight + 25);
  text('FFT Size: ' + currentFftSize + ' bins', ctl.labelX, drawHeight + 58);
  textSize(defaultTextSize);
}

// ---- helpers ---------------------------------------------------------------------

function toDb(v) {
  return 20 * Math.log10(Math.max(v, 1e-12));
}

function dbToLevel(db) {
  return constrain((db - DB_FLOOR) / (DB_CEIL - DB_FLOOR), 0, 1);
}

function dbToY(db) {
  return plotBaseline - dbToLevel(db) * (plotBaseline - plotTop);
}

function hzToX(hz) {
  return plotLeft + (hz / (sampleRateHz / 2)) * (plotRight() - plotLeft);
}

function formatHz(hz) {
  return Math.round(hz).toLocaleString('en-US') + ' Hz';
}

// 'stopped' | 'waiting' | 'live' | 'failed'
function micState() {
  if (!isRunning || !mic || !fft) return 'stopped';
  let open = true;
  try { open = mic.node.state === 'started'; } catch (e) { open = true; }
  if (open) return 'live';
  return (millis() - micStartMs < MIC_TIMEOUT_MS) ? 'waiting' : 'failed';
}

// If Stop was pressed while the browser was still opening the microphone, the stream can
// arrive afterwards; close it so the microphone is never left on while the sketch is stopped.
function closeLateMic() {
  if (isRunning || !mic) return;
  try { if (mic.node.state === 'started') mic.stop(); } catch (e) { /* nothing to close */ }
}

// ---- controls --------------------------------------------------------------------

function createControls() {
  // Start/Stop button (created first so it is the first button on the page)
  startButton = createButton('Start');
  startButton.mousePressed(toggleRecording);

  // Reset button
  resetButton = createButton('Reset');
  resetButton.mousePressed(resetAnalysis);

  // Smoothness slider (0.0 - 0.95)
  smoothnessSlider = createSlider(0, 0.95, currentSmoothness, 0.05);

  // FFT Size slider (0-7 index into fftSizeOptions)
  fftSizeSlider = createSlider(0, fftSizeOptions.length - 1, fftSizeIndex, 1);
}

// Two rows: [label][slider][button]. Narrow screens get smaller labels and padding.
function layoutControls(force) {
  if (typeof smoothnessSlider === 'undefined') return;
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  const compact = canvasWidth < 500;
  ctl = compact
    ? { labelX: 8, labelSize: 14, sliderLeft: 158, right: 8, buttonWidth: 62 }
    : { labelX: 10, labelSize: 16, sliderLeft: 190, right: 12, buttonWidth: 72 };
  const buttonX = canvasWidth - ctl.right - ctl.buttonWidth;
  const sliderWidth = Math.max(60, buttonX - 12 - ctl.sliderLeft);

  smoothnessSlider.position(ctl.sliderLeft, drawHeight + 16);
  smoothnessSlider.size(sliderWidth);
  fftSizeSlider.position(ctl.sliderLeft, drawHeight + 49);
  fftSizeSlider.size(sliderWidth);
  startButton.position(buttonX, drawHeight + 13);
  startButton.style('width', ctl.buttonWidth + 'px');
  resetButton.position(buttonX, drawHeight + 46);
  resetButton.style('width', ctl.buttonWidth + 'px');
}

// Read the sliders every frame. Smoothness is a live property of the analyser;
// a new FFT size needs a new p5.FFT object.
function updateFFTParameters() {
  const newSmoothness = Number(smoothnessSlider.value());
  if (newSmoothness !== currentSmoothness) {
    currentSmoothness = newSmoothness;
    if (fft) fft.analyzer.smoothing = currentSmoothness;
  }

  const newFftSizeIndex = Math.round(Number(fftSizeSlider.value()));
  if (newFftSizeIndex !== fftSizeIndex) {
    fftSizeIndex = newFftSizeIndex;
    currentFftSize = fftSizeOptions[fftSizeIndex];
    if (fft) buildFFT();
  }
}

// Replace the analyser with one of the current size and route the microphone to it
function buildFFT() {
  if (fft) {
    try {
      fft.disconnect();
      fft.analyzer.dispose();
      fft.samples.dispose();
      fft.node.dispose();
    } catch (e) { /* the old analyser is simply dropped */ }
  }
  fft = new p5.FFT(currentFftSize);        // p5.sound 0.4.1: one argument (size)
  fft.analyzer.smoothing = currentSmoothness;
  if (mic) {
    mic.disconnect();                      // drops the old FFT (and the speakers)
    mic.connect(fft);
  }
}

function toggleRecording() {
  if (!isRunning) {
    // Start recording. The audio context starts suspended until a user gesture.
    userStartAudio();
    const ctx = getAudioContext();
    if (ctx.state !== 'running') {
      try { ctx.resume(); } catch (e) { /* mic.start() also asks for it */ }
    }
    sampleRateHz = ctx.sampleRate;
    if (!mic) {
      mic = new p5.AudioIn();
      mic.disconnect();                    // never play the microphone through the speakers
    }
    buildFFT();
    mic.start();
    micStartMs = millis();
    isRunning = true;
    startButton.html('Stop');
  } else {
    // Stop recording
    mic.stop();
    isRunning = false;
    startButton.html('Start');
  }
}

function resetAnalysis() {
  // Restore the default values (the same values the sketch starts with)
  smoothnessSlider.value(DEFAULT_SMOOTHNESS);
  fftSizeSlider.value(DEFAULT_SIZE_INDEX);
  updateFFTParameters();
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
