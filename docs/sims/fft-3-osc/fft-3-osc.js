// FFT with Multiple Frequency Components MicroSim
// CANVAS_HEIGHT: 580
// Three sine-wave oscillators are added together. The top plot shows the combined waveform
// (time domain); the bottom plot shows its FFT magnitude spectrum, with one labelled peak per
// component. p5.js 2.3.2 + p5.sound 0.4.1.
//
// p5.sound 0.4.1 notes (it differs from the old 1.x addon):
//   * new p5.FFT(size) takes ONE argument; analyze() returns LINEAR magnitudes and the bins are
//     sampleRate / 2 / size Hz apart (the old code assumed 22050 Hz / 1024 bins and mislabelled
//     every peak on 48 kHz devices).
//   * there is no masterVolume(). Each oscillator plays at its own Amp slider value into one
//     p5.Gain (the Master slider and Mute) that feeds the speakers. The FFT taps the oscillators
//     BEFORE that gain, so the plots always show a1, a2, a3 and Master/Mute change only loudness.
//     (Scaling each oscillator's amp() by Master instead would put Master into the FFT, and an
//     amp() change reaches the analyser about 190 ms later, so the plots would jump.)

// Canvas dimensions and layout
let canvasWidth = 800;            // overwritten from the container in updateCanvasSize()
let drawHeight = 460;
let controlHeight = 120;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let defaultTextSize = 16;

// Plot geometry: y positions are fixed, x positions follow the canvas width
const plotLeft = 58;
const timePlot = { top: 66, bottom: 186 };
const freqPlot = { top: 266, bottom: 410 };

// Audio and FFT settings
const FFT_BINS = 4096;            // analyze() returns 4096 bins from 0 Hz to fs/2 (5.86 Hz apart at 48 kHz)
// Steady-state analyze() value of an amplitude-1.0 sine centred on a bin (Blackman-window
// coherent gain 0.42 x 1/2). Values are linear, so a peak's height is proportional to amplitude.
const FULL_SCALE = 0.21;
const WAVE_BUFFER = 4096;         // waveform samples fetched per frame, so a trigger point can be found
const TIME_WINDOW_MS = 20;        // width of the time-domain window
const FREQ_MAX_DISPLAY = 1600;    // right edge of the spectrum in Hz (the highest slider goes to 1500 Hz)
const PEAK_THRESHOLD = 0.05;      // smallest magnitude that gets a frequency label
const MAX_PEAK_LABELS = 5;

// Default slider values
const DEFAULT_FREQS = [400, 800, 1200];
const DEFAULT_AMP = 0.3;
const DEFAULT_MASTER = 0.25;

// Audio objects (built on the first Start click, because browsers block audio until a user gesture)
let oscillators = [];
let outputGain;                   // Master volume and Mute, between the oscillators and the speakers
let fft;
let audioReady = false;

// Control elements
let freq1Slider, amp1Slider;
let freq2Slider, amp2Slider;
let freq3Slider, amp3Slider;
let masterVolumeSlider;
let soundButton;
let freqSliders = [];
let ampSliders = [];

// Simulation state
let isMuted = false;
let currentFreqs = DEFAULT_FREQS.slice();
let currentAmps = [DEFAULT_AMP, DEFAULT_AMP, DEFAULT_AMP];
let masterVolume = DEFAULT_MASTER;
let appliedFreqs = [null, null, null];
let appliedAmps = [null, null, null];
let appliedLevel = null;
let peakFrequencies = [];         // [{freq, magnitude, bin}] for labelling
let spectrumRange = 1;            // top of the magnitude axis (1, or 2 when two equal tones add up)

// Control layout (recomputed when the width changes)
let ctl = { x0: 20, colWidth: 240, gap: 30, labelSize: 16, compact: false };
let layoutWidth = -1;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  createControls();
  layoutControls(true);

  describe('Three sine-wave oscillators are added together. The top plot shows the combined waveform over a 20 millisecond window; the bottom plot shows its FFT magnitude spectrum from 0 to 1600 Hz with a frequency label on each peak. Press Start, then move the frequency and amplitude sliders of each component.');
}

function draw() {
  updateCanvasSize();

  // Read the controls every frame so the labels update even before Start
  readControls();
  applyAudio();

  let spectrum = null;
  let wave = null;
  if (audioReady) {
    spectrum = fft.analyze();      // Float32Array(FFT_BINS), linear magnitude
    wave = fft.waveform();         // Float32Array(WAVE_BUFFER): a1 sin + a2 sin + a3 sin
  }

  drawRegions();
  drawTitle();
  drawTimeSignal(wave);
  drawSpectrum(spectrum);
  drawControlLabels();
}

// Width of a string including its spaces (textWidth drops spaces in p5 2.3.2)
function strWidth(s) {
  return (typeof fontWidth === 'function') ? fontWidth(s) : textWidth(s);
}

// ---- drawing -----------------------------------------------------------------

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
  stroke('black');
  line(margin, 230, canvasWidth - margin, 230);
}

function drawTitle() {
  const title = 'FFT with Multiple Frequency Components';
  fill('black');
  noStroke();
  let s = 24;
  textSize(s);
  while (s > 14 && strWidth(title) > canvasWidth - 2 * margin) {
    s -= 1;
    textSize(s);
  }
  textAlign(CENTER, TOP);
  text(title, canvasWidth / 2, 8);
  textSize(defaultTextSize);
}

// Bold panel label at the left; returns its width
function drawPanelLabel(label, y) {
  fill('black');
  noStroke();
  textSize(16);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text(label, margin, y);
  const w = strWidth(label);
  textStyle(NORMAL);
  return w;
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

function drawStartMessage(x0, x1, y) {
  noStroke();
  fill(90);
  textSize(16);
  textAlign(CENTER, CENTER);
  text('Press Start to hear and see the three tones', (x0 + x1) / 2, y);
}

function drawTimeSignal(wave) {
  const x0 = plotLeft;
  const x1 = canvasWidth - margin;
  const yMid = (timePlot.top + timePlot.bottom) / 2;
  const half = (timePlot.bottom - timePlot.top) / 2 - 3;

  // The combined wave can never exceed a1 + a2 + a3, so the axis grows to +/-2 or +/-3 only when needed
  const ampSum = currentAmps[0] + currentAmps[1] + currentAmps[2];
  const range = ampSum <= 1 ? 1 : (ampSum <= 2 ? 2 : 3);
  const yScale = half / range;

  // Panel label and the signal being played
  const labelW = drawPanelLabel(canvasWidth >= 560 ? 'Time Domain (Combined Signal)' : 'Time Domain', 48);
  textSize(14);
  const f = currentFreqs;
  const a = currentAmps.map(v => v.toFixed(2));
  const longForm = 'x(t) = ' + a[0] + ' sin(2π·' + f[0] + 't) + ' + a[1] + ' sin(2π·' + f[1] + 't) + ' + a[2] + ' sin(2π·' + f[2] + 't)';
  const shortForm = f[0] + ' Hz + ' + f[1] + ' Hz + ' + f[2] + ' Hz';
  const room = x1 - (margin + labelW + 16);
  const formula = strWidth(longForm) <= room ? longForm : (strWidth(shortForm) <= room ? shortForm : '');
  fill(40);
  noStroke();
  textAlign(RIGHT, CENTER);
  text(formula, x1, 48);

  // Grid lines at every integer amplitude, then the zero line and the left axis
  strokeWeight(1);
  stroke(215);
  for (let v = 1; v <= range; v++) {
    line(x0, yMid - v * yScale, x1, yMid - v * yScale);
    line(x0, yMid + v * yScale, x1, yMid + v * yScale);
  }
  stroke('gray');
  line(x0, yMid, x1, yMid);
  line(x0, yMid - half, x0, yMid + half);

  // Amplitude tick labels
  noStroke();
  fill(60);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (const v of [range, 0, -range]) text(v, x0 - 6, yMid - v * yScale);

  // Time tick labels (ms)
  textAlign(CENTER, CENTER);
  for (let t = 0; t <= TIME_WINDOW_MS; t += 5) {
    const x = map(t, 0, TIME_WINDOW_MS, x0, x1);
    stroke('gray');
    line(x, timePlot.bottom - 4, x, timePlot.bottom);
    noStroke();
    fill(60);
    text(t, x, timePlot.bottom + 11);
  }
  fill('black');
  text('Time (ms)', (x0 + x1) / 2, timePlot.bottom + 29);
  drawRotatedLabel('Amplitude', yMid);

  if (!wave) {
    stroke('blue');
    strokeWeight(2);
    line(x0, yMid, x1, yMid);
    drawStartMessage(x0, x1, yMid - 26);
    return;
  }

  // Show a fixed 20 ms window that starts at the steepest rising zero crossing in the buffer,
  // like an oscilloscope trigger, so a periodic combination holds still from frame to frame.
  const sampleRate = getAudioContext().sampleRate;
  const n = Math.min(wave.length, Math.round(sampleRate * TIME_WINDOW_MS / 1000));
  let start = 0;
  let bestSlope = 0;
  for (let i = 1; i <= wave.length - n; i++) {
    if (wave[i - 1] < 0 && wave[i] >= 0) {
      const slope = wave[i] - wave[i - 1];
      if (slope > bestSlope * 1.0001) { bestSlope = slope; start = i; }
    }
  }

  stroke('blue');
  strokeWeight(2);
  noFill();
  beginShape();
  for (let i = 0; i < n; i++) {
    vertex(map(i, 0, n, x0, x1), yMid - constrain(wave[start + i], -range, range) * yScale);
  }
  endShape();
}

function drawSpectrum(spectrum) {
  const x0 = plotLeft;
  const x1 = canvasWidth - margin;
  const base = freqPlot.bottom;
  const sampleRate = getAudioContext().sampleRate;
  const binHz = sampleRate / 2 / FFT_BINS;

  // Normalised magnitudes: an amplitude-a sine centred on a bin reaches height a
  let mags = null;
  if (spectrum) {
    const lastBin = Math.min(spectrum.length - 1, Math.floor(FREQ_MAX_DISPLAY / binHz));
    mags = new Float32Array(lastBin + 1);
    let maxMag = 0;
    for (let i = 0; i <= lastBin; i++) {
      mags[i] = spectrum[i] / FULL_SCALE;
      if (mags[i] > maxMag) maxMag = mags[i];
    }
    // Two oscillators at the same frequency can add up to more than 1
    if (maxMag > 1.02) spectrumRange = 2;
    else if (maxMag < 0.9) spectrumRange = 1;
  }
  const top = freqPlot.top + 22;          // headroom for the peak labels
  const yScale = (base - top) / spectrumRange;

  // Panel label, plus the sample rate and bin width where there is room
  const labelW = drawPanelLabel(canvasWidth >= 560 ? 'Frequency Domain (FFT Spectrum)' : 'Frequency Domain', 248);
  textSize(14);
  const info = 'fs = ' + (sampleRate / 1000).toFixed(1) + ' kHz, bin width ' + binHz.toFixed(2) + ' Hz';
  if (strWidth(info) <= x1 - (margin + labelW + 16)) {
    fill(90);
    noStroke();
    textAlign(RIGHT, CENTER);
    text(info, x1, 248);
  }

  // Grid lines at half and full scale, and the baseline
  strokeWeight(1);
  stroke(215);
  const step = spectrumRange / 2;
  for (let m = step; m <= spectrumRange + 1e-9; m += step) line(x0, base - m * yScale, x1, base - m * yScale);
  stroke('gray');
  line(x0, base, x1, base);
  line(x0, top - 8, x0, base);

  // Magnitude tick labels
  noStroke();
  fill(60);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (let m = 0; m <= spectrumRange + 1e-9; m += step) text(Number(m.toFixed(1)), x0 - 6, base - m * yScale);

  // Frequency ticks: minor every 50 Hz, labelled every 250 Hz
  textAlign(CENTER, CENTER);
  for (let f = 0; f <= 1500; f += 50) {
    const x = map(f, 0, FREQ_MAX_DISPLAY, x0, x1);
    stroke('gray');
    line(x, base, x, base + (f % 250 === 0 ? 6 : 3));
    if (f % 250 === 0) {
      noStroke();
      fill(60);
      text(f, x, base + 14);
    }
  }
  fill('black');
  noStroke();
  text('Frequency (Hz)', (x0 + x1) / 2, base + 32);
  drawRotatedLabel('Magnitude', (top + base) / 2);

  if (!mags) {
    peakFrequencies = [];
    drawStartMessage(x0, x1, (top + base) / 2);
    return;
  }

  // One red bar per FFT bin
  const pxPerHz = (x1 - x0) / FREQ_MAX_DISPLAY;
  const barW = Math.max(1, binHz * pxPerHz * 0.85);
  noStroke();
  fill('red');
  for (let i = 1; i < mags.length; i++) {
    const h = Math.min(mags[i], spectrumRange) * yScale;
    if (h < 0.5) continue;
    rect(x0 + i * binHz * pxPerHz - barW / 2, base - h, barW, h);
  }

  findPeaks(mags, binHz);
  drawPeakLabels(x0, pxPerHz, binHz, base, yScale);
}

// Local maxima above the threshold, strongest first
function findPeaks(mags, binHz) {
  peakFrequencies = [];
  for (let i = 2; i < mags.length - 2; i++) {
    const m = mags[i];
    if (m > PEAK_THRESHOLD && m > mags[i - 1] && m >= mags[i + 1] && m > mags[i - 2] && m >= mags[i + 2]) {
      peakFrequencies.push({ freq: Math.round(i * binHz), magnitude: m, bin: i });
    }
  }
  peakFrequencies.sort((p, q) => q.magnitude - p.magnitude);
  peakFrequencies = peakFrequencies.slice(0, MAX_PEAK_LABELS);
}

function drawPeakLabels(x0, pxPerHz, binHz, base, yScale) {
  const placed = [];                       // [left, right, y] of labels already drawn
  const overlaps = (x, w, y) => placed.some(p => x + w / 2 + 4 > p[0] && x - w / 2 - 4 < p[1] && Math.abs(y - p[2]) < 16);
  textSize(14);
  textAlign(CENTER, BOTTOM);
  for (const peak of peakFrequencies) {
    const x = x0 + peak.bin * binHz * pxPerHz;
    const label = peak.freq + ' Hz';
    const w = strWidth(label);
    let y = base - Math.min(peak.magnitude, spectrumRange) * yScale - 5;
    // Lift a label above one it would overlap; skip it if there is no room
    for (const p of placed) {
      if (x + w / 2 + 4 > p[0] && x - w / 2 - 4 < p[1] && Math.abs(y - p[2]) < 16) y = p[2] - 16;
    }
    if (y < freqPlot.top - 2 || overlaps(x, w, y)) continue;

    // Peak marker line and frequency label
    stroke('darkred');
    strokeWeight(1);
    line(x, base, x, y + 2);
    noStroke();
    fill('darkred');
    text(label, x, y);
    placed.push([x - w / 2, x + w / 2, y]);
  }
}

function drawControlLabels() {
  const y0 = drawHeight;
  fill('black');
  noStroke();
  textSize(ctl.labelSize);
  textAlign(LEFT, CENTER);
  for (let k = 0; k < 3; k++) {
    const x = colX(k);
    const n = k + 1;
    const fLabel = ctl.compact ? 'f' + n + ': ' : 'Freq ' + n + ': ';
    const aLabel = ctl.compact ? 'A' + n + ': ' : 'Amp ' + n + ': ';
    text(fLabel + currentFreqs[k].toFixed(0) + ' Hz', x, y0 + 14);
    text(aLabel + currentAmps[k].toFixed(2), x, y0 + 50);
  }
  text('Master: ' + masterVolume.toFixed(2), colX(0), y0 + 86);

  // Status indicator
  let status, color;
  if (!audioReady) { status = '● STOPPED'; color = 'gray'; }
  else if (isMuted) { status = '● MUTED'; color = 'red'; }
  else { status = '● PLAYING'; color = 'green'; }
  textStyle(BOLD);
  fill(color);
  text(status, colX(2), y0 + 100);
  textStyle(NORMAL);
}

// ---- controls ------------------------------------------------------------------

function createControls() {
  // Start / Mute / Unmute button (created first, so it is the first button on the page)
  soundButton = createButton('Start');
  soundButton.mousePressed(toggleSound);

  // Component 1 controls
  freq1Slider = createSlider(50, 1000, DEFAULT_FREQS[0], 1);
  amp1Slider = createSlider(0, 1, DEFAULT_AMP, 0.01);

  // Component 2 controls
  freq2Slider = createSlider(50, 1000, DEFAULT_FREQS[1], 1);
  amp2Slider = createSlider(0, 1, DEFAULT_AMP, 0.01);

  // Component 3 controls
  freq3Slider = createSlider(50, 1500, DEFAULT_FREQS[2], 1);
  amp3Slider = createSlider(0, 1, DEFAULT_AMP, 0.01);

  // Master volume control (loudness only)
  masterVolumeSlider = createSlider(0, 0.35, DEFAULT_MASTER, 0.01);

  freqSliders = [freq1Slider, freq2Slider, freq3Slider];
  ampSliders = [amp1Slider, amp2Slider, amp3Slider];
}

function colX(k) {
  return ctl.x0 + k * (ctl.colWidth + ctl.gap);
}

// Three columns (one per component), label above slider. Master and the button share row 3.
function layoutControls(force) {
  if (typeof freq1Slider === 'undefined') return;
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  const compact = canvasWidth < 560;
  const x0 = compact ? 10 : 20;
  const gap = compact ? 12 : 30;
  ctl = {
    x0: x0,
    gap: gap,
    colWidth: Math.max(60, (canvasWidth - 2 * x0 - 2 * gap) / 3),
    labelSize: compact ? 14 : 16,
    compact: compact
  };
  const y0 = drawHeight;
  for (let k = 0; k < 3; k++) {
    freqSliders[k].position(colX(k), y0 + 24);
    freqSliders[k].size(ctl.colWidth);
    ampSliders[k].position(colX(k), y0 + 60);
    ampSliders[k].size(ctl.colWidth);
  }
  masterVolumeSlider.position(colX(0), y0 + 96);
  masterVolumeSlider.size(ctl.colWidth);
  soundButton.position(colX(1), y0 + 88);
  soundButton.style('min-width', '80px');
}

function readControls() {
  for (let k = 0; k < 3; k++) {
    currentFreqs[k] = Number(freqSliders[k].value());
    currentAmps[k] = Number(ampSliders[k].value());
  }
  masterVolume = Number(masterVolumeSlider.value());
}

// ---- audio ---------------------------------------------------------------------

// Build the audio graph:  oscillator k --> outputGain (Master, Mute) --> speakers
//                         oscillator k --> FFT (sees a1, a2, a3 exactly)
// Called from the Start click, because browsers only allow audio after a user gesture.
function startAudio() {
  userStartAudio();                     // p5.sound 0.4.1 returns undefined here (no promise)
  const ctx = getAudioContext();
  if (ctx.state !== 'running') {
    try { ctx.resume(); } catch (e) { /* the oscillators still feed the FFT */ }
  }

  fft = new p5.FFT(FFT_BINS);           // p5.sound 0.4.1: one argument (size)
  fft.analyzer.smoothing = 0;           // no averaging between frames (as in the original sketch)
  try { fft.samples.size = WAVE_BUFFER; } catch (e) { /* fall back to 1024 samples */ }

  outputGain = new p5.Gain();           // connected to the speakers by default
  outputGain.getNode().gain.value = 0;

  for (let k = 0; k < 3; k++) {
    const osc = new p5.Oscillator('sine');
    osc.freq(currentFreqs[k]);
    osc.amp(0);
    osc.disconnect();                   // leave the default speaker route ...
    osc.connect(outputGain);            // ... and go through Master instead
    osc.connect(fft);
    osc.start();
    oscillators.push(osc);
  }
  audioReady = true;
}

// Send changed slider values to the audio graph
function applyAudio() {
  if (!audioReady) return;
  for (let k = 0; k < 3; k++) {
    if (currentFreqs[k] !== appliedFreqs[k]) {
      oscillators[k].freq(currentFreqs[k]);
      appliedFreqs[k] = currentFreqs[k];
    }
    if (currentAmps[k] !== appliedAmps[k]) {
      oscillators[k].amp(currentAmps[k], 0.03);
      appliedAmps[k] = currentAmps[k];
    }
  }
  const level = isMuted ? 0 : masterVolume;
  if (level !== appliedLevel) {
    outputGain.getNode().gain.value = level;
    appliedLevel = level;
  }
}

function toggleSound() {
  if (!audioReady) {
    startAudio();
    isMuted = false;
  } else {
    isMuted = !isMuted;
    if (!isMuted) userStartAudio();     // make sure the audio context is running when unmuting
  }
  soundButton.html(isMuted ? 'Unmute' : 'Mute');
  applyAudio();
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
