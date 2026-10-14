// Time-Frequency Analysis Explorer MicroSim
// CANVAS_HEIGHT: 605
// The short-time Fourier transform (STFT) of a one-second signal is computed with
// a radix-2 FFT: frame m holds N samples starting at sample m H, multiplied by a
// window.  The spectrogram shows the magnitude of every frame; the side panel shows
// the spectrum of the frame under the time cursor.  A long window gives fine
// frequency resolution and coarse time resolution, and a short window the reverse.

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 670;
let drawHeight = 455;
let controlHeight = 150;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 325;
let defaultTextSize = 16;

// ---- model ----
const FS = 8000;                 // Hz, sampling rate
const DURATION = 1;              // s
const NS = FS * DURATION;        // samples in the signal
const LENGTHS = [32, 64, 128, 256, 512, 1024];
const DB_RANGE = 80;             // the dB scale runs from -80 dB to 0 dB
const FSK_BITS = [1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1];
const FSK_F0 = 1000, FSK_F1 = 2000;
const NOTES = [523.25, 659.26, 783.99, 1046.50, 783.99];     // C5 E5 G5 C6 G5

const COLOR_MAPS = {
  viridis: [[68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142],
    [31, 158, 137], [53, 183, 121], [109, 205, 89], [180, 222, 44], [253, 231, 37]],
  hot: [[0, 0, 0], [128, 0, 0], [255, 0, 0], [255, 128, 0], [255, 255, 0], [255, 255, 255]],
  gray: [[255, 255, 255], [0, 0, 0]]
};

// ---- controls ----
let signalSelect, windowSelect, lengthSlider, overlapSlider, colorSelect, scaleSelect;

// ---- state ----
let signals = {};                // generated once
let stft = null, stftKey = '';
let specCanvas = null, imageKey = '';
let cursorTime = 0.5;            // s, position of the time cursor
let panels = {};

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  signalSelect = createSelect();
  signalSelect.option('Chirp (500 to 3500 Hz sweep)', 'chirp');
  signalSelect.option('Frequency-shift keying (1 and 2 kHz)', 'fsk');
  signalSelect.option('Note sequence (C5 E5 G5 C6 G5)', 'notes');
  signalSelect.selected('chirp');

  windowSelect = createSelect();
  windowSelect.option('Hanning (Hann)', 'hann');
  windowSelect.option('Hamming', 'hamming');
  windowSelect.option('Blackman', 'blackman');
  windowSelect.option('Rectangular', 'rect');
  windowSelect.selected('hann');

  lengthSlider = createSlider(0, LENGTHS.length - 1, 3, 1);
  overlapSlider = createSlider(0, 90, 50, 5);

  colorSelect = createSelect();
  colorSelect.option('Viridis', 'viridis');
  colorSelect.option('Hot', 'hot');
  colorSelect.option('Grayscale', 'gray');
  colorSelect.selected('viridis');

  scaleSelect = createSelect();
  scaleSelect.option('Magnitude (dB)', 'db');
  scaleSelect.option('Magnitude (linear)', 'linear');
  scaleSelect.option('Power (linear)', 'power');
  scaleSelect.selected('db');

  const mainElement = document.querySelector('main');
  [signalSelect, windowSelect, lengthSlider, overlapSlider, colorSelect, scaleSelect].forEach(c => c.parent(mainElement));
  positionControls();

  for (const kind of ['chirp', 'fsk', 'notes']) signals[kind] = makeSignal(kind);
  specCanvas = document.createElement('canvas');

  describe('A waveform with a movable time cursor, a spectrogram with time across and frequency upward, ' +
    'and beside it the spectrum of the frame at the cursor. Sliders set the window length and the overlap of the short-time Fourier transform.', LABEL);
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

// Window functions in DFT-periodic form (the denominator is N).
function windowFunction(kind, n) {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const c1 = Math.cos(2 * Math.PI * i / n), c2 = Math.cos(4 * Math.PI * i / n);
    if (kind === 'rect') w[i] = 1;
    else if (kind === 'hann') w[i] = 0.5 - 0.5 * c1;
    else if (kind === 'hamming') w[i] = 0.54 - 0.46 * c1;
    else w[i] = 0.42 - 0.5 * c1 + 0.08 * c2;
  }
  return w;
}

// ---------------------------------------------------------------------------
// Test signals
// ---------------------------------------------------------------------------

function makeSignal(kind) {
  const x = new Float64Array(NS);
  if (kind === 'chirp') {
    // instantaneous frequency 500 + 3000 t Hz
    for (let i = 0; i < NS; i++) {
      const t = i / FS;
      x[i] = Math.sin(2 * Math.PI * (500 * t + 1500 * t * t));
    }
  } else if (kind === 'fsk') {
    // one of two tones per bit, with the phase kept continuous across the bit boundaries
    const perBit = NS / FSK_BITS.length;
    let phase = 0;
    for (let i = 0; i < NS; i++) {
      const bit = FSK_BITS[Math.min(FSK_BITS.length - 1, Math.floor(i / perBit))];
      x[i] = Math.sin(phase);
      phase += 2 * Math.PI * (bit ? FSK_F1 : FSK_F0) / FS;
    }
  } else {
    // five notes, each with three harmonics and a plucked (decaying) envelope
    const perNote = NS / NOTES.length;
    for (let i = 0; i < NS; i++) {
      const note = Math.min(NOTES.length - 1, Math.floor(i / perNote));
      const t = (i - note * perNote) / FS;
      const env = Math.min(1, t / 0.005) * Math.exp(-t / 0.12);
      const th = 2 * Math.PI * NOTES[note] * t;
      x[i] = env * (0.6 * Math.sin(th) + 0.3 * Math.sin(2 * th) + 0.15 * Math.sin(3 * th));
    }
  }
  return x;
}

// What the signal's frequency really is at time t (used to label the cursor).
function trueFrequency(kind, t) {
  if (kind === 'chirp') return 500 + 3000 * t;
  if (kind === 'fsk') return FSK_BITS[Math.min(FSK_BITS.length - 1, Math.floor(t * FSK_BITS.length / DURATION))] ? FSK_F1 : FSK_F0;
  return NOTES[Math.min(NOTES.length - 1, Math.floor(t * NOTES.length / DURATION))];
}

// ---------------------------------------------------------------------------
// Short-time Fourier transform:  X[m, k] = sum over n of x[n + m H] w[n] e^{-j 2 pi k n / N}
// ---------------------------------------------------------------------------

function computeStft(x, n, hop, winKind) {
  const w = windowFunction(winKind, n);
  let gain = 0;
  for (let i = 0; i < n; i++) gain += w[i] / n;
  const frames = Math.floor((x.length - n) / hop) + 1;
  const bins = n / 2 + 1;
  const amp = new Float32Array(frames * bins);
  const re = new Float64Array(n), im = new Float64Array(n);
  let maxAmp = 0;
  for (let m = 0; m < frames; m++) {
    for (let i = 0; i < n; i++) { re[i] = x[i + m * hop] * w[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < bins; k++) {
      // amplitude scaling: a steady sinusoid of amplitude A on a bin centre reads A
      const a = Math.hypot(re[k], im[k]) / (n * gain) * (k === 0 || k === bins - 1 ? 1 : 2);
      amp[m * bins + k] = a;
      if (a > maxAmp) maxAmp = a;
    }
  }
  return { n: n, hop: hop, frames: frames, bins: bins, amp: amp, maxAmp: maxAmp, df: FS / n,
    // frame m covers samples m H ... m H + N - 1, so its centre is at (m H + N/2) / fs
    centre: m => (m * hop + n / 2) / FS };
}

function currentStft() {
  const kind = signalSelect.value(), n = LENGTHS[lengthSlider.value()], winKind = windowSelect.value();
  const hop = Math.max(1, Math.round(n * (1 - overlapSlider.value() / 100)));
  const key = [kind, n, hop, winKind].join('|');
  if (key !== stftKey) {
    stft = computeStft(signals[kind], n, hop, winKind);
    stft.kind = kind;
    stftKey = key;
  }
  return stft;
}

// Map an amplitude to 0..1 on the selected scale.
function levelOf(s, a, scale) {
  if (scale === 'db') return constrain((20 * Math.log10(Math.max(a, 1e-9)) + DB_RANGE) / DB_RANGE, 0, 1);
  const r = s.maxAmp > 0 ? a / s.maxAmp : 0;
  return scale === 'power' ? r * r : r;
}

function mapColor(name, v) {
  const table = COLOR_MAPS[name];
  const pos = constrain(v, 0, 1) * (table.length - 1);
  const i = Math.min(table.length - 2, Math.floor(pos)), f = pos - i;
  return [0, 1, 2].map(c => table[i][c] + (table[i + 1][c] - table[i][c]) * f);
}

// One pixel per frame and per bin; the browser stretches it without smoothing, so every
// time-frequency cell is drawn as a rectangle whose size shows the resolution.
function updateImage(s) {
  const scale = scaleSelect.value(), cmap = colorSelect.value();
  const key = stftKey + '|' + scale + '|' + cmap;
  if (key === imageKey) return;
  specCanvas.width = s.frames;
  specCanvas.height = s.bins;
  const ctx = specCanvas.getContext('2d');
  const img = ctx.createImageData(s.frames, s.bins);
  for (let m = 0; m < s.frames; m++) {
    for (let k = 0; k < s.bins; k++) {
      const c = mapColor(cmap, levelOf(s, s.amp[m * s.bins + k], scale));
      const o = ((s.bins - 1 - k) * s.frames + m) * 4;          // row 0 is the highest frequency
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  imageKey = key;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function draw() {
  updateCanvasSize();

  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  const s = currentStft();
  updateImage(s);

  const narrow = canvasWidth < 600;
  const left = 52, right = 14, gap = narrow ? 8 : 12;
  const sideW = narrow ? 84 : 150;
  const mainW = canvasWidth - left - right - gap - sideW;
  panels.wave = { x: left, y: 80, w: mainW, h: 60 };
  panels.spec = { x: left, y: 166, w: mainW, h: 250 };
  panels.side = { x: left + mainW + gap, y: 166, w: sideW, h: 250 };
  panels.info = { x: left + mainW + gap, y: 80, w: sideW, h: 60 };

  // the frame whose centre is nearest to the time cursor
  const mSel = constrain(Math.round((cursorTime * FS - s.n / 2) / s.hop), 0, s.frames - 1);

  drawBanner(s);
  drawWaveform(panels.wave, s, mSel);
  drawInfo(panels.info, s, mSel);
  drawSpectrogram(panels.spec, s, mSel);
  drawFrameSpectrum(panels.side, s, mSel);

  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(narrow ? 19 : 22);
  text('Time-Frequency Analysis Explorer', canvasWidth / 2, narrow ? 10 : 8);

  drawControlLabels(s);
}

function fmtNum(v, digits) { return String(parseFloat(v.toFixed(digits))); }

function drawBanner(s) {
  const narrow = canvasWidth < 600;
  const dt = 1000 * s.n / FS;
  // the longest wording that fits the banner is used
  const core = 'Δt = N/fs = ' + fmtNum(dt, 1) + ' ms,   Δf = fs/N = ' + fmtNum(s.df, 2) + ' Hz';
  const options = [
    'Window N = ' + s.n + ' samples:   time span Δt = N/fs = ' + fmtNum(dt, 1) + ' ms,   bin spacing Δf = fs/N = ' + fmtNum(s.df, 2) + ' Hz,   Δt × Δf = 1',
    'Window N = ' + s.n + ':   ' + core + ',   Δt × Δf = 1',
    core
  ];
  textSize(narrow ? 12 : 14);
  textStyle(BOLD);
  let msg = options[options.length - 1];
  for (const o of options) {
    if (textWidth(o) <= canvasWidth - 36) { msg = o; break; }
  }
  textStyle(NORMAL);
  stroke('steelblue');
  strokeWeight(1.5);
  fill('lightyellow');
  rect(10, 34, canvasWidth - 20, 24, 8);
  strokeWeight(1);
  noStroke();
  fill('midnightblue');
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
    textSize(canvasWidth < 600 ? 10 : 12);
    textAlign(RIGHT, BOTTOM);
    text(rightText, p.x + p.w, p.y - 4);
  }
}

function drawWaveform(p, s, mSel) {
  const x = signals[s.kind];
  const X = t => p.x + t / DURATION * p.w;
  const Y = v => p.y + p.h / 2 - (v / 1.25) * (p.h / 2);
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(12);
  for (const v of [-1, 0, 1]) {
    stroke(v === 0 ? 'gray' : 'gainsboro');
    line(p.x, Y(v), p.x + p.w, Y(v));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(v, p.x - 5, Y(v));
  }

  // waveform: the range of the samples that fall in each pixel column
  stroke('steelblue');
  const cols = Math.floor(p.w);
  for (let c = 0; c < cols; c++) {
    const i0 = Math.floor(c / cols * NS), i1 = Math.max(i0 + 1, Math.floor((c + 1) / cols * NS));
    let lo = Infinity, hi = -Infinity;
    for (let i = i0; i < i1; i++) { if (x[i] < lo) lo = x[i]; if (x[i] > hi) hi = x[i]; }
    line(p.x + c + 0.5, Y(hi), p.x + c + 0.5, Y(lo) + 1);
  }

  // the N samples of the selected frame
  const t0 = mSel * s.hop / FS, t1 = (mSel * s.hop + s.n) / FS;
  noStroke();
  fill('rgba(255, 200, 0, 0.45)');
  rect(X(t0), p.y + 1, Math.max(2, X(t1) - X(t0)), p.h - 2);
  stroke('darkorange');
  line(X(t0), p.y, X(t0), p.y + p.h);
  line(X(t1), p.y, X(t1), p.y + p.h);

  stroke('crimson');
  strokeWeight(1.5);
  line(X(s.centre(mSel)), p.y, X(s.centre(mSel)), p.y + p.h);
  strokeWeight(1);
  caption(p, canvasWidth < 600 ? 'Waveform x[n]' : 'Waveform x[n], frame at the cursor shaded',
    'steelblue', canvasWidth < 600 ? 'drag: move cursor' : 'drag to move the cursor');
}

function drawInfo(p, s, mSel) {
  const narrow = canvasWidth < 600;
  stroke('silver');
  fill('ivory');
  rect(p.x, p.y, p.w, p.h, 5);
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  textSize(narrow ? 10 : 12);
  const hopMs = fmtNum(1000 * s.hop / FS, 2);
  const lines = narrow
    ? ['t = ' + s.centre(mSel).toFixed(3) + ' s', 'frame ' + mSel + ' / ' + (s.frames - 1), 'H = ' + s.hop + ' samples']
    : ['Cursor: t = ' + s.centre(mSel).toFixed(3) + ' s', 'Frame m = ' + mSel + ' of 0…' + (s.frames - 1), 'Hop H = ' + s.hop + ' = ' + hopMs + ' ms'];
  for (let i = 0; i < 3; i++) text(lines[i], p.x + 6, p.y + 12 + i * 18);
}

function drawSpectrogram(p, s, mSel) {
  const narrow = canvasWidth < 600;
  const X = t => p.x + t / DURATION * p.w;
  const Y = f => p.y + p.h - f / (FS / 2) * p.h;

  // times for which no complete window fits are left blank
  fill('gainsboro');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);

  // the image: frame m spans its centre +/- H/2, bin k spans k df +/- df/2
  const xa = X(s.centre(0) - s.hop / (2 * FS)), xb = X(s.centre(s.frames - 1) + s.hop / (2 * FS));
  const ya = Y(FS / 2 + s.df / 2), yb = Y(-s.df / 2);
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.rect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(specCanvas, xa, ya, xb - xa, yb - ya);
  ctx.restore();
  ctx.imageSmoothingEnabled = true;

  // axes
  textSize(12);
  noStroke();
  fill('black');
  for (let f = 0; f <= 4000; f += 1000) {
    textAlign(RIGHT, CENTER);
    text(f, p.x - 5, Y(f));
  }
  for (let j = 0; j <= 5; j++) {
    textAlign(j === 0 ? LEFT : (j === 5 ? RIGHT : CENTER), TOP);
    text(fmtNum(j / 5, 1), X(j / 5), p.y + p.h + 4);
  }
  textSize(13);
  textAlign(CENTER, TOP);
  text('Time (s)', p.x + p.w / 2, p.y + p.h + 19);
  push();
  translate(13, p.y + p.h / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text('Frequency (Hz)', 0, 0);
  pop();

  // time cursor
  stroke('crimson');
  strokeWeight(1.5);
  line(X(s.centre(mSel)), p.y, X(s.centre(mSel)), p.y + p.h);
  strokeWeight(1);

  // pointer readout
  let rightText = narrow ? '' : 'point at the image for a readout';
  if (mouseX >= p.x && mouseX <= p.x + p.w && mouseY >= p.y && mouseY <= p.y + p.h) {
    const t = (mouseX - p.x) / p.w * DURATION, f = (p.y + p.h - mouseY) / p.h * FS / 2;
    const m = constrain(Math.round((t * FS - s.n / 2) / s.hop), 0, s.frames - 1);
    const k = constrain(Math.round(f / s.df), 0, s.bins - 1);
    const a = s.amp[m * s.bins + k];
    stroke('white');
    drawingContext.setLineDash([3, 3]);
    line(p.x, mouseY, p.x + p.w, mouseY);
    drawingContext.setLineDash([]);
    rightText = fmtNum(s.centre(m), 3) + ' s, ' + fmtNum(k * s.df, 0) + ' Hz: ' +
      (20 * Math.log10(Math.max(a, 1e-9))).toFixed(1).replace('-', '−') + ' dB';
  }
  const names = { db: 'magnitude in dB', linear: 'magnitude', power: 'power' };
  caption(p, narrow ? 'Spectrogram' : 'Spectrogram: ' + names[scaleSelect.value()] + ' of X[m, k]', 'black', rightText);
}

// Spectrum of the frame at the cursor, drawn sideways so that it shares the frequency axis of the spectrogram.
function drawFrameSpectrum(p, s, mSel) {
  const narrow = canvasWidth < 600;
  const scale = scaleSelect.value(), cmap = colorSelect.value();
  const Y = f => p.y + p.h - f / (FS / 2) * p.h;
  const X = v => p.x + v * p.w;                  // v is the level, 0..1, on the selected scale

  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  for (let f = 1000; f < 4000; f += 1000) { stroke('gainsboro'); line(p.x, Y(f), p.x + p.w, Y(f)); }
  for (const v of [0.25, 0.5, 0.75]) { stroke('gainsboro'); line(X(v), p.y, X(v), p.y + p.h); }

  stroke('crimson');
  strokeWeight(1.5);
  noFill();
  beginShape();
  for (let k = 0; k < s.bins; k++) vertex(X(levelOf(s, s.amp[mSel * s.bins + k], scale)), Y(k * s.df));
  endShape();
  strokeWeight(1);
  if (s.bins <= 65) {
    noStroke();
    fill('crimson');
    for (let k = 0; k < s.bins; k++) circle(X(levelOf(s, s.amp[mSel * s.bins + k], scale)), Y(k * s.df), 4);
  }

  // the signal's actual frequency at the cursor
  const fTrue = trueFrequency(s.kind, s.centre(mSel));
  stroke('gray');
  drawingContext.setLineDash([3, 3]);
  line(p.x, Y(fTrue), p.x + p.w, Y(fTrue));
  drawingContext.setLineDash([]);
  noStroke();
  fill('dimgray');
  textSize(narrow ? 10 : 12);
  textAlign(LEFT, BOTTOM);
  text((narrow ? '' : 'signal: ') + Math.round(fTrue) + ' Hz', p.x + 3, Y(fTrue) - 2);

  // colour bar under the level axis: the same scale as the spectrogram colours
  const barY = p.y + p.h + 3;
  for (let i = 0; i < p.w; i++) {
    const c = mapColor(cmap, i / (p.w - 1));
    stroke(c[0], c[1], c[2]);
    line(p.x + i, barY, p.x + i, barY + 8);
  }
  noStroke();
  fill('black');
  textSize(narrow ? 10 : 12);
  const ends = scale === 'db' ? ['−' + DB_RANGE + ' dB', '0 dB'] : ['0', 'max'];
  textAlign(LEFT, TOP);
  text(ends[0], p.x, barY + 11);
  textAlign(RIGHT, TOP);
  text(ends[1], p.x + p.w, barY + 11);

  caption(p, narrow ? 'Frame' : 'Spectrum at the cursor', 'crimson', '');
}

function drawControlLabels(s) {
  const narrow = canvasWidth < 600;
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  textSize(narrow ? 13 : defaultTextSize);
  if (!narrow) {
    text('Signal:', 10, drawHeight + 18);
    text('Window:', 372, drawHeight + 18);
  }
  text(narrow ? 'N: ' + s.n : 'Window length N: ' + s.n + ' samples (' + fmtNum(1000 * s.n / FS, 1) + ' ms)', 10, drawHeight + 53);
  text(narrow ? 'Overlap: ' + overlapSlider.value() + '%' : 'Overlap: ' + overlapSlider.value() + '% (hop H = ' + s.hop + ' samples)', 10, drawHeight + 88);
  text(narrow ? 'Colours:' : 'Colour map:', 10, drawHeight + 123);
  text('Scale:', narrow ? 185 : 262, drawHeight + 123);
}

// ---------------------------------------------------------------------------
// Mouse: click or drag in the waveform or the spectrogram to move the time cursor
// ---------------------------------------------------------------------------

function moveCursor() {
  for (const p of [panels.wave, panels.spec]) {
    if (p && mouseX >= p.x && mouseX <= p.x + p.w && mouseY >= p.y && mouseY <= p.y + p.h) {
      cursorTime = constrain((mouseX - p.x) / p.w * DURATION, 0, DURATION);
      return true;
    }
  }
  return false;
}

function mousePressed() { moveCursor(); }

function mouseDragged() {
  if (moveCursor()) return false;      // keep the page from scrolling while dragging
}

// ---------------------------------------------------------------------------
// Responsive layout
// ---------------------------------------------------------------------------

function positionControls() {
  const narrow = canvasWidth < 600;
  if (narrow) {
    const w1 = Math.floor((canvasWidth - 22) * 0.6);
    signalSelect.position(8, drawHeight + 7);
    signalSelect.style('width', w1 + 'px');
    windowSelect.position(8 + w1 + 6, drawHeight + 7);
    windowSelect.style('width', (canvasWidth - 22 - w1) + 'px');
  } else {
    signalSelect.position(68, drawHeight + 7);
    signalSelect.style('width', '290px');
    windowSelect.position(440, drawHeight + 7);
    windowSelect.style('width', '150px');
  }
  const labelW = narrow ? 110 : sliderLeftMargin;
  lengthSlider.position(labelW, drawHeight + 42);
  lengthSlider.size(canvasWidth - labelW - margin);
  overlapSlider.position(labelW, drawHeight + 77);
  overlapSlider.size(canvasWidth - labelW - margin);
  colorSelect.position(narrow ? 72 : 110, drawHeight + 112);
  colorSelect.style('width', (narrow ? 100 : 130) + 'px');
  scaleSelect.position(narrow ? 230 : 312, drawHeight + 112);
  scaleSelect.style('width', (narrow ? canvasWidth - 240 : 170) + 'px');
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
