// FFT Spectrum Analyzer MicroSim
// CANVAS_HEIGHT: 605
// A frame of N samples is multiplied by a window function and transformed with a
// radix-2 FFT.  The spectrum is shown as amplitude, in dB or as phase, with peak
// markers, a cursor readout and an optional scrolling spectrogram.  The input is
// a generated test signal (fs = 8000 Hz) or the microphone.

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 670;
let drawHeight = 455;
let controlHeight = 150;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 245;
let defaultTextSize = 16;

// ---- model ----
const FS_GEN = 8000;          // Hz, sampling rate of the generated signals
const CHIRP_PERIOD = 4;       // s, the sweep repeats after this time
const CHIRP_F0 = 100, CHIRP_F1 = 3900;
const KAISER_BETA = 8.6;
const MIC_F_MAX = 8000;       // Hz, upper limit of the frequency axis for the microphone
const ROW_INTERVAL = 0.05;    // s of signal time between spectrogram rows
const SPEC_COLS = 512, SPEC_ROWS = 100;
const DB_FLOOR = -100;

const SOURCES = [
  { id: 'sine', label: 'Sine' },
  { id: 'two', label: 'Two tones (f and f + 100 Hz)' },
  { id: 'square', label: 'Square wave' },
  { id: 'sawtooth', label: 'Sawtooth wave' },
  { id: 'noisy', label: 'Sine + white noise' },
  { id: 'chirp', label: 'Chirp (100 to 3900 Hz sweep)' },
  { id: 'mic', label: 'Microphone' }
];

// ---- controls ----
let sourceSelect, runButton, freqSlider, sizeSelect, windowSelect, scaleSelect, spectrogramCheckbox;

// ---- state ----
let running = false;
let simTime = 0;                 // s, start time of the current frame of a generated signal
let lastRowTime = -1;
let frame = null, frameKey = '';
let specImage = null;
let mic = { ctx: null, analyser: null, stream: null, buffer: null, status: 'idle', message: '' };
let plot = null;                 // geometry of the spectrum panel, for the cursor

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  sourceSelect = createSelect();
  for (const s of SOURCES) sourceSelect.option(s.label, s.id);
  sourceSelect.selected('sine');
  sourceSelect.changed(sourceChanged);

  runButton = createButton('Run');
  runButton.mousePressed(toggleRun);

  freqSlider = createSlider(50, 3900, 1000, 1);

  sizeSelect = createSelect();
  for (const n of [128, 256, 512, 1024, 2048, 4096]) sizeSelect.option(String(n));
  sizeSelect.selected('1024');

  windowSelect = createSelect();
  windowSelect.option('Rectangular', 'rect');
  windowSelect.option('Hamming', 'hamming');
  windowSelect.option('Hanning (Hann)', 'hann');
  windowSelect.option('Blackman', 'blackman');
  windowSelect.option('Kaiser (β = 8.6)', 'kaiser');
  windowSelect.selected('rect');

  scaleSelect = createSelect();
  scaleSelect.option('Magnitude (linear)', 'linear');
  scaleSelect.option('Magnitude (dB)', 'db');
  scaleSelect.option('Phase', 'phase');
  scaleSelect.selected('linear');

  spectrogramCheckbox = createCheckbox(' Spectrogram', false);

  const mainElement = document.querySelector('main');
  [sourceSelect, runButton, freqSlider, sizeSelect, windowSelect, scaleSelect, spectrogramCheckbox]
    .forEach(c => c.parent(mainElement));
  positionControls();

  specImage = createImage(SPEC_COLS, SPEC_ROWS);
  clearSpectrogram();

  describe('A spectrum analyzer. The upper plot shows one frame of the input signal before and after the window function. ' +
    'The lower plot shows its FFT spectrum with peak markers, and optionally a scrolling spectrogram.', LABEL);
}

// ---------------------------------------------------------------------------
// FFT (radix-2, decimation in time, in place)
// ---------------------------------------------------------------------------

const twiddleCache = {};

function twiddles(n) {
  if (!twiddleCache[n]) {
    const c = new Float64Array(n / 2), s = new Float64Array(n / 2);
    for (let k = 0; k < n / 2; k++) {
      c[k] = Math.cos(2 * Math.PI * k / n);
      s[k] = Math.sin(2 * Math.PI * k / n);
    }
    twiddleCache[n] = { c: c, s: s };
  }
  return twiddleCache[n];
}

// X[k] = sum over n of x[n] e^{-j 2 pi k n / N}
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {          // bit-reversal permutation
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  const tw = twiddles(n);
  for (let len = 2; len <= n; len <<= 1) {      // butterflies
    const half = len >> 1, step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k++) {
        const wr = tw.c[k * step], wi = -tw.s[k * step];
        const a = i + k, b = a + half;
        const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Window functions (DFT-periodic form: the denominator is N)
// ---------------------------------------------------------------------------

function besselI0(x) {
  let sum = 1, term = 1;
  for (let k = 1; k < 60; k++) {
    term *= (x / (2 * k)) * (x / (2 * k));
    sum += term;
    if (term < 1e-16 * sum) break;
  }
  return sum;
}

const windowCache = {};

function windowFunction(kind, n) {
  const key = kind + n;
  if (windowCache[key]) return windowCache[key];
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const c1 = Math.cos(2 * Math.PI * i / n), c2 = Math.cos(4 * Math.PI * i / n);
    if (kind === 'rect') w[i] = 1;
    else if (kind === 'hann') w[i] = 0.5 - 0.5 * c1;
    else if (kind === 'hamming') w[i] = 0.54 - 0.46 * c1;
    else if (kind === 'blackman') w[i] = 0.42 - 0.5 * c1 + 0.08 * c2;
    else {
      const r = 2 * i / n - 1;
      w[i] = besselI0(KAISER_BETA * Math.sqrt(Math.max(0, 1 - r * r))) / besselI0(KAISER_BETA);
    }
  }
  windowCache[key] = w;
  return w;
}

// ---------------------------------------------------------------------------
// Signal sources
// ---------------------------------------------------------------------------

// Repeatable Gaussian noise: the same sample index always gives the same value.
function hash01(i) {
  let h = (i | 0) + 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return ((h >>> 0) + 0.5) / 4294967296;
}

function gaussian(i) {
  return Math.sqrt(-2 * Math.log(hash01(2 * i))) * Math.cos(2 * Math.PI * hash01(2 * i + 1));
}

// Sample number i of a generated signal at sampling rate FS_GEN.
function generated(kind, f, i) {
  const th = 2 * Math.PI * f * i / FS_GEN;
  if (kind === 'sine') return Math.sin(th);
  if (kind === 'two') return Math.sin(th) + 0.5 * Math.sin(2 * Math.PI * (f + 100) * i / FS_GEN);
  if (kind === 'noisy') return Math.sin(th) + gaussian(i);
  if (kind === 'square') {            // band-limited: odd harmonics below fs/2, amplitudes 4/(pi k)
    let s = 0;
    for (let k = 1; k * f < FS_GEN / 2; k += 2) s += Math.sin(k * th) / k;
    return 4 / Math.PI * s;
  }
  if (kind === 'sawtooth') {          // band-limited: all harmonics below fs/2, amplitudes 2/(pi k)
    let s = 0;
    for (let k = 1; k * f < FS_GEN / 2; k++) s += (k % 2 === 1 ? 1 : -1) * Math.sin(k * th) / k;
    return 2 / Math.PI * s;
  }
  // chirp: the frequency rises linearly from CHIRP_F0 to CHIRP_F1 and then starts again
  const t = (i / FS_GEN) % CHIRP_PERIOD;
  return Math.sin(2 * Math.PI * (CHIRP_F0 * t + 0.5 * (CHIRP_F1 - CHIRP_F0) / CHIRP_PERIOD * t * t));
}

// ---- microphone (Web Audio) ----

function startMic() {
  if (mic.status === 'on' || mic.status === 'asking') return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    mic.status = 'error';
    mic.message = 'This browser gives no access to a microphone here.';
    stopRunning();
    return;
  }
  mic.status = 'asking';
  mic.message = 'Waiting for permission to use the microphone...';
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    mic.ctx = new Ctx();
    mic.stream = stream;
    mic.analyser = mic.ctx.createAnalyser();
    mic.analyser.fftSize = 4096;
    mic.ctx.createMediaStreamSource(stream).connect(mic.analyser);
    mic.buffer = new Float32Array(4096);
    mic.status = 'on';
    mic.message = '';
  }).catch(err => {
    mic.status = 'error';
    mic.message = 'Microphone not available (' + (err && err.name ? err.name : 'error') + ').';
    stopRunning();
  });
}

function stopMic() {
  if (mic.stream) mic.stream.getTracks().forEach(t => t.stop());
  if (mic.ctx) mic.ctx.close();
  mic = { ctx: null, analyser: null, stream: null, buffer: mic.buffer, status: 'idle', message: '' };
}

// ---------------------------------------------------------------------------
// Analysis of one frame
// ---------------------------------------------------------------------------

function analyze(x, fs, windowKind) {
  const n = x.length;
  const w = windowFunction(windowKind, n);
  const re = new Float64Array(n), im = new Float64Array(n);
  let gain = 0;
  for (let i = 0; i < n; i++) { re[i] = x[i] * w[i]; gain += w[i] / n; }
  const windowed = Float64Array.from(re);
  fft(re, im);

  const half = n / 2;
  const mag = new Float64Array(half + 1), amp = new Float64Array(half + 1), phase = new Float64Array(half + 1);
  let maxAmp = 0;
  for (let k = 0; k <= half; k++) {
    mag[k] = Math.hypot(re[k], im[k]);                    // |X[k]|; a bin-centred sine of amplitude A gives A N / 2
    // amplitude estimate: undo the N/2 of the DFT and the gain of the window (bins 0 and N/2 have no mirror image)
    amp[k] = mag[k] / (n * gain) * (k === 0 || k === half ? 1 : 2);
    phase[k] = Math.atan2(im[k], re[k]) * 180 / Math.PI;
    if (amp[k] > maxAmp) maxAmp = amp[k];
  }
  return { n: n, fs: fs, df: fs / n, x: x, windowed: windowed, gain: gain, mag: mag, amp: amp, phase: phase,
    maxAmp: maxAmp, peaks: findPeaks(amp, fs / n, maxAmp) };
}

function toDb(a) { return 20 * Math.log10(Math.max(a, 1e-12)); }

// Local maxima within 20 dB of the strongest one.  The frequency of each is refined by fitting
// a parabola to the dB values of the peak bin and its two neighbours.
function findPeaks(amp, df, maxAmp) {
  const peaks = [];
  if (maxAmp < 1e-6) return peaks;
  for (let k = 1; k < amp.length - 1; k++) {
    if (amp[k] < 0.1 * maxAmp) continue;
    if (amp[k] <= amp[k - 1] || amp[k] < amp[k + 1]) continue;
    const a = toDb(amp[k - 1]), b = toDb(amp[k]), c = toDb(amp[k + 1]);
    const denom = a - 2 * b + c;
    const delta = Math.abs(denom) < 1e-9 ? 0 : constrain(0.5 * (a - c) / denom, -0.5, 0.5);
    peaks.push({ k: k, f: (k + delta) * df, amp: amp[k] });
  }
  peaks.sort((p, q) => q.amp - p.amp);
  return peaks.slice(0, 4);
}

function currentFrame() {
  const kind = sourceSelect.value(), n = parseInt(sizeSelect.value()), win = windowSelect.value();
  if (kind === 'mic') {
    if (mic.status === 'on' && running) {
      mic.analyser.getFloatTimeDomainData(mic.buffer);
      frame = analyze(Float64Array.from(mic.buffer.subarray(4096 - n)), mic.ctx.sampleRate, win);
      frameKey = '';
    } else {
      // hold the last captured buffer (or silence) while paused
      const key = ['mic', n, win, mic.status].join('|');
      if (key !== frameKey) {
        const src = mic.buffer ? Float64Array.from(mic.buffer.subarray(4096 - n)) : new Float64Array(n);
        frame = analyze(src, mic.ctx ? mic.ctx.sampleRate : 48000, win);
        frameKey = key;
      }
    }
    return frame;
  }
  const f = freqSlider.value();
  const start = Math.round(simTime * FS_GEN);
  const key = [kind, n, win, f, start].join('|');
  if (key !== frameKey) {
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) x[i] = generated(kind, f, start + i);
    frame = analyze(x, FS_GEN, win);
    frameKey = key;
  }
  return frame;
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function toggleRun() {
  if (running) { stopRunning(); return; }
  running = true;
  runButton.html('Pause');
  if (sourceSelect.value() === 'mic') startMic();
}

function stopRunning() {
  running = false;
  if (runButton) runButton.html('Run');
}

function sourceChanged() {
  if (sourceSelect.value() !== 'mic' && mic.status !== 'idle') stopMic();
  if (sourceSelect.value() === 'mic' && running) startMic();
  simTime = 0;
  lastRowTime = -1;
  clearSpectrogram();
}

// ---------------------------------------------------------------------------
// Spectrogram (a scrolling image: frequency across, newest row at the top)
// ---------------------------------------------------------------------------

const VIRIDIS = [[68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142],
  [31, 158, 137], [53, 183, 121], [109, 205, 89], [180, 222, 44], [253, 231, 37]];

function viridis(v) {
  const pos = constrain(v, 0, 1) * (VIRIDIS.length - 1);
  const i = Math.min(VIRIDIS.length - 2, Math.floor(pos)), f = pos - i;
  return [0, 1, 2].map(c => VIRIDIS[i][c] + (VIRIDIS[i + 1][c] - VIRIDIS[i][c]) * f);
}

function clearSpectrogram() {
  specImage.loadPixels();
  const c = viridis(0);
  for (let i = 0; i < specImage.pixels.length; i += 4) {
    specImage.pixels[i] = c[0]; specImage.pixels[i + 1] = c[1]; specImage.pixels[i + 2] = c[2]; specImage.pixels[i + 3] = 255;
  }
  specImage.updatePixels();
}

function addSpectrogramRow(fr, fMax) {
  specImage.loadPixels();
  const px = specImage.pixels, rowBytes = SPEC_COLS * 4;
  px.copyWithin(rowBytes, 0, px.length - rowBytes);          // move every row down by one
  const half = fr.n / 2;
  for (let c = 0; c < SPEC_COLS; c++) {
    // strongest bin among those that fall in this column
    const k0 = Math.floor(c / SPEC_COLS * fMax / fr.df), k1 = Math.max(k0 + 1, Math.floor((c + 1) / SPEC_COLS * fMax / fr.df));
    let a = 0;
    for (let k = k0; k < k1 && k <= half; k++) a = Math.max(a, fr.amp[k]);
    const col = viridis((toDb(a) + 80) / 80);                // -80 dB ... 0 dB
    px[c * 4] = col[0]; px[c * 4 + 1] = col[1]; px[c * 4 + 2] = col[2]; px[c * 4 + 3] = 255;
  }
  specImage.updatePixels();
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function draw() {
  updateCanvasSize();

  const kind = sourceSelect.value();
  if (running && kind !== 'mic') simTime += Math.min(0.1, deltaTime / 1000);

  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  const fr = currentFrame();
  const fMax = kind === 'mic' ? Math.min(fr.fs / 2, MIC_F_MAX) : fr.fs / 2;
  const showSpec = spectrogramCheckbox.checked();

  // a new spectrogram row for every ROW_INTERVAL of signal time
  const clock = kind === 'mic' ? millis() / 1000 : simTime;
  if (running && (kind !== 'mic' || mic.status === 'on') && (lastRowTime < 0 || clock - lastRowTime >= ROW_INTERVAL)) {
    addSpectrogramRow(fr, fMax);
    lastRowTime = clock;
  }

  if (kind === 'chirp' || kind === 'mic') freqSlider.attribute('disabled', '');
  else freqSlider.removeAttribute('disabled');

  const left = 52, right = 16;
  const pw = canvasWidth - left - right;
  const p1 = { x: left, y: 80, w: pw, h: 80 };
  const p2 = { x: left, y: 216, w: pw, h: showSpec ? 112 : 200 };
  const p3 = { x: left, y: 334, w: pw, h: 82 };

  drawBanner(fr, kind);
  drawTimePlot(p1, fr);
  drawSpectrum(p2, fr, fMax, scaleSelect.value());
  if (showSpec) drawSpectrogram(p3);
  drawFrequencyAxis(showSpec ? p3 : p2, fMax);
  drawReadout(fr, fMax);

  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(22);
  text('FFT Spectrum Analyzer', canvasWidth / 2, 8);

  drawControlLabels(kind);
}

function fmtHz(v) { return v >= 100 ? v.toFixed(1) : v.toFixed(2); }

function drawBanner(fr, kind) {
  const narrow = canvasWidth < 600;
  let msg = 'N = ' + fr.n + ' samples at fs = ' + Math.round(fr.fs) + ' Hz:   bin spacing Δf = fs/N = ' + fmtHz(fr.df) +
    ' Hz,   frame length N/fs = ' + (1000 * fr.n / fr.fs).toFixed(1) + ' ms';
  if (narrow) msg = 'Δf = fs/N = ' + fmtHz(fr.df) + ' Hz,  frame ' + (1000 * fr.n / fr.fs).toFixed(1) + ' ms';
  let warn = false;
  if (kind === 'mic' && mic.status !== 'on') {
    warn = mic.status === 'error';
    msg = mic.message || 'Press Run to start the microphone. The browser will ask for permission.';
  }
  stroke(warn ? 'firebrick' : 'steelblue');
  strokeWeight(1.5);
  fill(warn ? 'mistyrose' : 'lightyellow');
  rect(10, 34, canvasWidth - 20, 24, 8);
  strokeWeight(1);
  noStroke();
  fill(warn ? 'firebrick' : 'midnightblue');
  textSize(narrow ? 12 : 14);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(msg, canvasWidth / 2, 46);
  textStyle(NORMAL);
}

function caption(p, str, col, rightText) {
  noStroke();
  textSize(canvasWidth < 600 ? 11 : 13);
  fill(col);
  textStyle(BOLD);
  textAlign(LEFT, BOTTOM);
  text(str, p.x, p.y - 4);
  textStyle(NORMAL);
  if (rightText) {
    fill('black');
    textSize(12);
    textAlign(RIGHT, BOTTOM);
    text(rightText, p.x + p.w, p.y - 4);
  }
}

function drawTimePlot(p, fr) {
  let peak = 0;
  for (let i = 0; i < fr.n; i++) peak = Math.max(peak, Math.abs(fr.x[i]));
  const yMax = peak > 2.4 ? 5 : (peak > 1.2 ? 2.5 : (peak > 0.3 ? 1.25 : (peak > 0.06 ? 0.3 : 0.06)));
  const tick = yMax / 1.25;
  const X = i => p.x + i / fr.n * p.w;
  const Y = v => p.y + p.h / 2 - constrain(v / yMax, -1, 1) * (p.h / 2);
  const duration = 1000 * fr.n / fr.fs;

  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(12);
  for (const v of [-tick, 0, tick]) {
    stroke(v === 0 ? 'gray' : 'gainsboro');
    line(p.x, Y(v), p.x + p.w, Y(v));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(parseFloat(v.toPrecision(2)), p.x - 5, Y(v));
  }
  for (let j = 0; j <= 4; j++) {
    const x = p.x + j / 4 * p.w;
    stroke('gainsboro');
    line(x, p.y, x, p.y + p.h);
    noStroke();
    fill('black');
    textAlign(j === 0 ? LEFT : (j === 4 ? RIGHT : CENTER), TOP);
    text(parseFloat((duration * j / 4).toFixed(1)), x, p.y + p.h + 4);
  }

  const trace = (data, col, weight) => {
    stroke(col);
    strokeWeight(weight);
    noFill();
    beginShape();
    for (let i = 0; i < fr.n; i++) vertex(X(i), Y(data[i]));
    endShape();
  };
  trace(fr.x, 'silver', 1);
  trace(fr.windowed, 'blue', 1.5);
  strokeWeight(1);
  caption(p, canvasWidth < 600 ? 'Frame x[n] (grey), windowed (blue)' : 'Time frame of N samples: x[n] (grey) and after the window, x[n]·w[n] (blue)',
    'blue', 't (ms)');
}

function drawSpectrum(p, fr, fMax, mode) {
  const half = fr.n / 2;
  const kMax = Math.min(half, Math.round(fMax / fr.df));
  const X = f => p.x + f / fMax * p.w;
  let yMin, yMax, ticks, value;
  if (mode === 'linear') {
    yMax = fr.maxAmp > 1.45 ? 2 * Math.ceil(fr.maxAmp / 2 + 0.01) : (fr.maxAmp > 0.3 || fr.maxAmp < 1e-9 ? 1.5 : (fr.maxAmp > 0.03 ? 0.3 : 0.03));
    yMin = 0;
    ticks = [0, yMax / 3, 2 * yMax / 3, yMax].map(v => [v, String(parseFloat(v.toPrecision(2)))]);
    value = k => fr.amp[k];
  } else if (mode === 'db') {
    yMin = DB_FLOOR; yMax = 10;
    ticks = [0, -20, -40, -60, -80, -100].map(v => [v, String(v)]);
    value = k => toDb(fr.amp[k]);
  } else {
    yMin = -200; yMax = 200;
    ticks = [[-180, '−180°'], [-90, '−90°'], [0, '0°'], [90, '90°'], [180, '180°']];
    value = k => fr.phase[k];
  }
  const Y = v => p.y + p.h - (constrain(v, yMin, yMax) - yMin) / (yMax - yMin) * p.h;

  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(12);
  for (const tk of ticks) {
    stroke('gainsboro');
    line(p.x, Y(tk[0]), p.x + p.w, Y(tk[0]));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(tk[1], p.x - 5, Y(tk[0]));
  }
  for (let j = 0; j <= 8; j++) {
    stroke('gainsboro');
    line(p.x + j / 8 * p.w, p.y, p.x + j / 8 * p.w, p.y + p.h);
  }

  const dots = kMax <= 130;                       // few enough bins to draw each one
  if (mode === 'phase') {
    // the phase of a bin that holds almost no signal is numerical noise, so only strong bins are drawn
    noStroke();
    for (let k = 0; k <= kMax; k++) {
      if (fr.amp[k] < 0.05 * fr.maxAmp || fr.maxAmp < 1e-9) continue;
      stroke('seagreen');
      line(X(k * fr.df), Y(0), X(k * fr.df), Y(fr.phase[k]));
      noStroke();
      fill('seagreen');
      circle(X(k * fr.df), Y(fr.phase[k]), 5);
    }
  } else {
    stroke('crimson');
    strokeWeight(1.5);
    noFill();
    beginShape();
    for (let k = 0; k <= kMax; k++) vertex(X(k * fr.df), Y(value(k)));
    endShape();
    strokeWeight(1);
    if (dots) {
      noStroke();
      fill('crimson');
      for (let k = 0; k <= kMax; k++) circle(X(k * fr.df), Y(value(k)), 4);
    }
    // peak markers
    textSize(12);
    for (const pk of fr.peaks) {
      if (pk.f > fMax) continue;
      const px = X(pk.f), py = Y(value(pk.k));
      noStroke();
      fill('darkorange');
      triangle(px - 5, py - 12, px + 5, py - 12, px, py - 3);
      fill('black');
      const label = '≈ ' + pk.f.toFixed(pk.f < 1000 && fr.df < 20 ? 1 : 0) + ' Hz';
      const tw = textWidth(label);
      textAlign(LEFT, BOTTOM);
      text(label, constrain(px - tw / 2, p.x + 2, p.x + p.w - tw - 2), Math.max(p.y + 14, py - 14));
    }
  }

  // cursor
  plot = { p: p, fMax: fMax, kMax: kMax };
  const k = cursorBin(fr);
  if (k !== null) {
    stroke('gray');
    drawingContext.setLineDash([3, 3]);
    line(X(k * fr.df), p.y, X(k * fr.df), p.y + p.h);
    drawingContext.setLineDash([]);
    noFill();
    stroke('black');
    circle(X(k * fr.df), Y(value(k)), 9);
  }

  const narrow = canvasWidth < 600;
  const names = {
    linear: narrow ? 'Amplitude spectrum' : 'Spectrum: amplitude 2|X[k]| / (N · mean of w[n])',
    db: narrow ? 'Amplitude spectrum (dB)' : 'Spectrum: amplitude in dB (0 dB = amplitude 1)',
    phase: narrow ? 'Phase of X[k]' : 'Spectrum: phase of X[k], drawn for bins above 5% of the peak'
  };
  caption(p, names[mode], mode === 'phase' ? 'seagreen' : 'crimson', '');
}

function cursorBin(fr) {
  if (!plot) return null;
  const p = plot.p;
  if (mouseX < p.x || mouseX > p.x + p.w || mouseY < p.y || mouseY > p.y + p.h) return null;
  return constrain(Math.round((mouseX - p.x) / p.w * plot.fMax / fr.df), 0, plot.kMax);
}

function drawSpectrogram(p) {
  stroke('silver');
  noFill();
  rect(p.x, p.y, p.w, p.h);
  drawingContext.imageSmoothingEnabled = false;
  image(specImage, p.x + 1, p.y + 1, p.w - 2, p.h - 2);
  drawingContext.imageSmoothingEnabled = true;
  noStroke();
  fill('black');
  textSize(12);
  textAlign(RIGHT, TOP);
  text('now', p.x - 5, p.y);
  textAlign(RIGHT, BOTTOM);
  text('−' + (SPEC_ROWS * ROW_INTERVAL) + ' s', p.x - 5, p.y + p.h);
  if (!running) {
    fill('white');
    textAlign(CENTER, CENTER);
    textSize(13);
    text('Press Run to scroll the spectrogram (colour: −80 dB dark to 0 dB bright)', p.x + p.w / 2, p.y + p.h / 2);
  }
}

function drawFrequencyAxis(p, fMax) {
  noStroke();
  fill('black');
  textSize(12);
  for (let j = 0; j <= 8; j++) {
    textAlign(j === 0 ? LEFT : (j === 8 ? RIGHT : CENTER), TOP);
    text(Math.round(fMax * j / 8), p.x + j / 8 * p.w, p.y + p.h + 4);
  }
  textSize(13);
  textAlign(CENTER, TOP);
  text('Frequency (Hz)', p.x + p.w / 2, p.y + p.h + 19);
}

function drawReadout(fr, fMax) {
  const narrow = canvasWidth < 600;
  const k = cursorBin(fr);
  let str;
  if (k !== null) {
    str = 'Cursor: bin k = ' + k + ',  f = k·Δf = ' + fmtHz(k * fr.df) + ' Hz,  |X[k]| = ' + fr.mag[k].toFixed(1) +
      ',  amplitude ' + fr.amp[k].toFixed(3) + ' (' + toDb(fr.amp[k]).toFixed(1) + ' dB),  phase ' + fr.phase[k].toFixed(0) + '°';
    if (narrow) str = 'k = ' + k + ', ' + fmtHz(k * fr.df) + ' Hz, |X[k]| = ' + fr.mag[k].toFixed(1) + ', ' + toDb(fr.amp[k]).toFixed(1) + ' dB';
  } else if (fr.peaks.length > 0) {
    const pk = fr.peaks[0];
    str = 'Strongest peak: bin k = ' + pk.k + ',  ≈ ' + fmtHz(pk.f) + ' Hz,  |X[k]| = ' + fr.mag[pk.k].toFixed(1) +
      ',  amplitude ' + pk.amp.toFixed(3) + ' (' + toDb(pk.amp).toFixed(1) + ' dB)';
    if (narrow) str = 'Peak ≈ ' + fmtHz(pk.f) + ' Hz, |X[k]| = ' + fr.mag[pk.k].toFixed(1) + ', ' + toDb(pk.amp).toFixed(1) + ' dB';
  } else {
    str = 'No signal';
  }
  noStroke();
  fill('black');
  textSize(narrow ? 11 : 13);
  textAlign(LEFT, CENTER);
  text(str, 52, 190);
}

function drawControlLabels(kind) {
  const narrow = canvasWidth < 600;
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  textSize(narrow ? 13 : defaultTextSize);
  text('Source:', 10, drawHeight + 18);
  fill(kind === 'chirp' || kind === 'mic' ? 'gray' : 'black');
  text((narrow ? 'f: ' : 'Signal frequency f: ') + freqSlider.value() + ' Hz', 10, drawHeight + 53);
  fill('black');
  text(narrow ? 'N:' : 'FFT size N:', 10, drawHeight + 88);
  text('Window:', narrow ? 120 : 220, drawHeight + 88);
  text('Display:', 10, drawHeight + 123);
}

// ---------------------------------------------------------------------------
// Responsive layout
// ---------------------------------------------------------------------------

function positionControls() {
  const narrow = canvasWidth < 600;
  const sourceLeft = narrow ? 62 : 72;
  sourceSelect.position(sourceLeft, drawHeight + 7);
  sourceSelect.style('max-width', (canvasWidth - sourceLeft - 90) + 'px');
  runButton.position(canvasWidth - 76, drawHeight + 5);
  runButton.size(66);
  const labelW = narrow ? 95 : sliderLeftMargin;
  freqSlider.position(labelW, drawHeight + 42);
  freqSlider.size(canvasWidth - labelW - margin);
  sizeSelect.position(narrow ? 32 : 100, drawHeight + 77);
  windowSelect.position(narrow ? 180 : 290, drawHeight + 77);
  windowSelect.style('max-width', (narrow ? canvasWidth - 190 : 220) + 'px');
  scaleSelect.position(narrow ? 68 : 78, drawHeight + 112);
  spectrogramCheckbox.position(narrow ? 225 : 290, drawHeight + 114);
  spectrogramCheckbox.style('font-size', narrow ? '13px' : '16px');
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) {
    const w = Math.floor(container.getBoundingClientRect().width);
    if (w > 0) canvasWidth = w;
  }
}
