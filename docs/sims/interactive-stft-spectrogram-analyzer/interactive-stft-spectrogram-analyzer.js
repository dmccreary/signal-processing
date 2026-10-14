// Interactive STFT Spectrogram Analyzer MicroSim
// CANVAS_HEIGHT: 610
// One test signal is analyzed twice with the short-time Fourier transform
//   X[m, k] = sum over n of x[n + m H] w[n] e^{-j 2 pi k n / N}
// using a short window (A) and a long window (B).  The signal is built from two
// tones a chosen distance apart in frequency, two clicks a chosen distance apart
// in time, a chirp and noise, so the two spectrograms show directly which window
// separates what.  Cursors measure time and frequency.

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 670;
let drawHeight = 460;
let controlHeight = 150;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let defaultTextSize = 16;

// ---- model ----
const FS = 8000;                 // Hz, sampling rate
const NS = 8000;                 // samples in the signal (1 s)
const T_VIEW0 = 0.25, T_VIEW1 = 0.75;    // s, the part of the signal that is displayed
const F_VIEW = 2000;             // Hz, upper limit of the displayed frequency axis
const LENGTHS = [32, 64, 128, 256, 512, 1024, 2048];
const DB_RANGE = 60;             // colours and spectra run from -60 dB to 0 dB
const TONE_F = 500;              // Hz, lower tone
const CLICK_T = 0.5;             // s, first click
const CLICK_AMP = 8;
const CHIRP_F0 = 1100, CHIRP_F1 = 1900;   // Hz, at t = 0 and t = 1 s
const NOISE_SIGMA = 0.2;

const VIRIDIS = [[68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142],
  [31, 158, 137], [53, 183, 121], [109, 205, 89], [180, 222, 44], [253, 231, 37]];

// ---- controls ----
let tonesCheckbox, clicksCheckbox, chirpCheckbox, noiseCheckbox;
let toneSlider, clickSlider, lengthSliderA, lengthSliderB, windowSelect, hopSelect;

// ---- state ----
let signal = null, signalKey = '';
let views = { A: { key: '', canvas: null, stft: null }, B: { key: '', canvas: null, stft: null } };
let cursorTime = 0.5, cursorFreq = 500;
let panels = {};

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  tonesCheckbox = createCheckbox(' Two tones', true);
  clicksCheckbox = createCheckbox(' Two clicks', true);
  chirpCheckbox = createCheckbox(' Chirp', false);
  noiseCheckbox = createCheckbox(' Noise', false);

  toneSlider = createSlider(10, 400, 100, 10);
  clickSlider = createSlider(2, 100, 20, 2);
  lengthSliderA = createSlider(0, LENGTHS.length - 1, 1, 1);
  lengthSliderB = createSlider(0, LENGTHS.length - 1, 5, 1);

  windowSelect = createSelect();
  windowSelect.option('Hann', 'hann');
  windowSelect.option('Hamming', 'hamming');
  windowSelect.option('Blackman', 'blackman');
  windowSelect.option('Rectangular', 'rect');
  windowSelect.selected('hann');

  hopSelect = createSelect();
  hopSelect.option('N/8 (87.5% overlap)', '8');
  hopSelect.option('N/4 (75% overlap)', '4');
  hopSelect.option('N/2 (50% overlap)', '2');
  hopSelect.option('N (no overlap)', '1');
  hopSelect.selected('4');

  const mainElement = document.querySelector('main');
  [tonesCheckbox, clicksCheckbox, chirpCheckbox, noiseCheckbox, toneSlider, clickSlider, lengthSliderA, lengthSliderB,
    windowSelect, hopSelect].forEach(c => c.parent(mainElement));
  positionControls();

  views.A.canvas = document.createElement('canvas');
  views.B.canvas = document.createElement('canvas');

  describe('A waveform and two spectrograms of the same signal, one computed with a short window and one with a long window, ' +
    'each with the spectrum of the frame at the time cursor beside it. Cursors measure time and frequency.', LABEL);
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
// Test signal
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

function settings() {
  return {
    tones: tonesCheckbox.checked(), clicks: clicksCheckbox.checked(), chirp: chirpCheckbox.checked(), noise: noiseCheckbox.checked(),
    toneGap: toneSlider.value(), clickGap: clickSlider.value() / 1000
  };
}

function makeSignal(c) {
  const x = new Float64Array(NS);
  for (let i = 0; i < NS; i++) {
    const t = i / FS;
    let v = 0;
    if (c.tones) v += Math.sin(2 * Math.PI * TONE_F * t) + Math.sin(2 * Math.PI * (TONE_F + c.toneGap) * t);
    // chirp: instantaneous frequency CHIRP_F0 + (CHIRP_F1 - CHIRP_F0) t
    if (c.chirp) v += Math.sin(2 * Math.PI * (CHIRP_F0 * t + 0.5 * (CHIRP_F1 - CHIRP_F0) * t * t));
    if (c.noise) v += NOISE_SIGMA * gaussian(i);
    x[i] = v;
  }
  if (c.clicks) {
    x[Math.round(CLICK_T * FS)] += CLICK_AMP;
    x[Math.round((CLICK_T + c.clickGap) * FS)] += CLICK_AMP;
  }
  return x;
}

// ---------------------------------------------------------------------------
// Short-time Fourier transform
// ---------------------------------------------------------------------------

function computeStft(x, n, hop, winKind) {
  const w = windowFunction(winKind, n);
  let gain = 0;
  for (let i = 0; i < n; i++) gain += w[i] / n;
  const frames = Math.floor((x.length - n) / hop) + 1;
  const bins = Math.round(F_VIEW / (FS / n)) + 1;          // only the bins up to F_VIEW are kept
  const amp = new Float32Array(frames * bins);
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let m = 0; m < frames; m++) {
    for (let i = 0; i < n; i++) { re[i] = x[i + m * hop] * w[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < bins; k++) {
      // amplitude scaling: a steady sinusoid of amplitude A on a bin centre reads A
      amp[m * bins + k] = Math.hypot(re[k], im[k]) / (n * gain) * (k === 0 ? 1 : 2);
    }
  }
  return { n: n, hop: hop, frames: frames, bins: bins, amp: amp, df: FS / n,
    // frame m covers samples m H ... m H + N - 1, so its centre is at (m H + N/2) / fs
    centre: m => (m * hop + n / 2) / FS,
    nearest: t => constrain(Math.round((t * FS - n / 2) / hop), 0, frames - 1) };
}

function level(a) { return constrain((20 * Math.log10(Math.max(a, 1e-9)) + DB_RANGE) / DB_RANGE, 0, 1); }

function viridis(v) {
  const pos = constrain(v, 0, 1) * (VIRIDIS.length - 1);
  const i = Math.min(VIRIDIS.length - 2, Math.floor(pos)), f = pos - i;
  return [0, 1, 2].map(c => VIRIDIS[i][c] + (VIRIDIS[i + 1][c] - VIRIDIS[i][c]) * f);
}

// Recompute a spectrogram (and its image: one pixel per frame and per bin) when its settings change.
function updateView(view, n) {
  const hop = Math.max(1, n / parseInt(hopSelect.value()));
  const key = [signalKey, n, hop, windowSelect.value()].join('|');
  if (key === view.key) return;
  const s = computeStft(signal, n, hop, windowSelect.value());
  view.canvas.width = s.frames;
  view.canvas.height = s.bins;
  const ctx = view.canvas.getContext('2d');
  const img = ctx.createImageData(s.frames, s.bins);
  for (let m = 0; m < s.frames; m++) {
    for (let k = 0; k < s.bins; k++) {
      const c = viridis(level(s.amp[m * s.bins + k]));
      const o = ((s.bins - 1 - k) * s.frames + m) * 4;        // row 0 is the highest frequency
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  view.stft = s;
  view.key = key;
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

  const c = settings();
  const key = JSON.stringify(c);
  if (key !== signalKey) { signal = makeSignal(c); signalKey = key; }
  updateView(views.A, LENGTHS[lengthSliderA.value()]);
  updateView(views.B, LENGTHS[lengthSliderB.value()]);

  if (c.tones) toneSlider.removeAttribute('disabled'); else toneSlider.attribute('disabled', '');
  if (c.clicks) clickSlider.removeAttribute('disabled'); else clickSlider.attribute('disabled', '');

  const narrow = canvasWidth < 600;
  const left = 52, right = 14, gap = narrow ? 8 : 12;
  const sideW = narrow ? 84 : 150;
  const mainW = canvasWidth - left - right - gap - sideW;
  const sideX = left + mainW + gap;
  panels.wave = { x: left, y: 80, w: mainW, h: 40 };
  panels.info = { x: sideX, y: 68, w: sideW, h: 56 };
  panels.A = { x: left, y: 144, w: mainW, h: 135 };
  panels.sideA = { x: sideX, y: 144, w: sideW, h: 135 };
  panels.B = { x: left, y: 303, w: mainW, h: 135 };
  panels.sideB = { x: sideX, y: 303, w: sideW, h: 135 };

  drawBanner(c);
  drawWaveform(panels.wave);
  drawInfo(panels.info);
  drawSpectrogram(panels.A, views.A, 'A', 'teal', c, false);
  drawSpectrogram(panels.B, views.B, 'B', 'purple', c, true);
  drawFrameSpectrum(panels.sideA, views.A, 'teal', false);
  drawFrameSpectrum(panels.sideB, views.B, 'purple', true);

  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(narrow ? 17 : 22);
  text('Interactive STFT Spectrogram Analyzer', canvasWidth / 2, narrow ? 11 : 8);

  drawControlLabels(c);
}

function fmtNum(v, digits) { return String(parseFloat(v.toFixed(digits))); }

function drawBanner(c) {
  const narrow = canvasWidth < 600;
  const parts = [];
  if (c.tones) parts.push(narrow ? 'tones ' + c.toneGap + ' Hz apart' : 'tones at ' + TONE_F + ' and ' + (TONE_F + c.toneGap) + ' Hz (' + c.toneGap + ' Hz apart)');
  if (c.clicks) parts.push(narrow ? 'clicks ' + fmtNum(1000 * c.clickGap, 0) + ' ms apart' : 'clicks at 500 and ' + fmtNum(500 + 1000 * c.clickGap, 0) + ' ms (' + fmtNum(1000 * c.clickGap, 0) + ' ms apart)');
  if (c.chirp && !narrow) parts.push('chirp');
  if (c.noise && !narrow) parts.push('noise');
  let msg = parts.length ? 'Signal:  ' + parts.join(',  ') : 'Signal: silence. Tick a component below.';
  textSize(narrow ? 12 : 14);
  textStyle(BOLD);
  if (textWidth(msg) > canvasWidth - 36) msg = parts.slice(0, 2).join(',  ') + (parts.length > 2 ? ',  …' : '');
  textStyle(NORMAL);
  stroke('steelblue');
  strokeWeight(1.5);
  fill('lightyellow');
  rect(10, 34, canvasWidth - 20, 24, 8);
  strokeWeight(1);
  noStroke();
  fill('midnightblue');
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

function timeToX(p, t) { return p.x + (t - T_VIEW0) / (T_VIEW1 - T_VIEW0) * p.w; }
function freqToY(p, f) { return p.y + p.h - f / F_VIEW * p.h; }

function drawWaveform(p) {
  const yMax = 4;
  const Y = v => p.y + p.h / 2 - constrain(v / yMax, -1, 1) * (p.h / 2);
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  stroke('gray');
  line(p.x, Y(0), p.x + p.w, Y(0));
  // the range of the samples that fall in each pixel column
  stroke('steelblue');
  const cols = Math.floor(p.w);
  const i0all = Math.round(T_VIEW0 * FS), span = Math.round((T_VIEW1 - T_VIEW0) * FS);
  for (let c = 0; c < cols; c++) {
    const i0 = i0all + Math.floor(c / cols * span), i1 = Math.max(i0 + 1, i0all + Math.floor((c + 1) / cols * span));
    let lo = Infinity, hi = -Infinity;
    for (let i = i0; i < i1; i++) { if (signal[i] < lo) lo = signal[i]; if (signal[i] > hi) hi = signal[i]; }
    line(p.x + c + 0.5, Y(hi), p.x + c + 0.5, Y(lo) + 1);
  }
  // the samples used by window A (teal) and window B (purple) at the cursor
  const bars = [[views.A.stft, 'teal', p.y + 2], [views.B.stft, 'purple', p.y + p.h - 5]];
  for (const b of bars) {
    const s = b[0], m = s.nearest(cursorTime);
    const x0 = Math.max(p.x, timeToX(p, m * s.hop / FS)), x1 = Math.min(p.x + p.w, timeToX(p, (m * s.hop + s.n) / FS));
    noStroke();
    fill(b[1]);
    rect(x0, b[2], Math.max(2, x1 - x0), 3);
  }
  stroke('crimson');
  strokeWeight(1.5);
  line(timeToX(p, cursorTime), p.y, timeToX(p, cursorTime), p.y + p.h);
  strokeWeight(1);
  caption(p, canvasWidth < 600 ? 'Waveform x[n]' : 'Waveform x[n], with the samples each window uses at the cursor', 'steelblue', '');
}

function drawInfo(p) {
  const narrow = canvasWidth < 600;
  stroke('silver');
  fill('ivory');
  rect(p.x, p.y, p.w, p.h, 5);
  const lines = [[narrow ? 'Cursor' : 'Cursor (click to set)', 'crimson', true],
    [fmtNum(1000 * cursorTime, 1) + ' ms,  ' + fmtNum(cursorFreq, 0) + ' Hz', 'black', false]];
  // distance from the cursor to the mouse pointer, for measuring separations
  let found = false;
  for (const q of [panels.A, panels.B]) {
    if (q && mouseX >= q.x && mouseX <= q.x + q.w && mouseY >= q.y && mouseY <= q.y + q.h) {
      const t = T_VIEW0 + (mouseX - q.x) / q.w * (T_VIEW1 - T_VIEW0), f = (q.y + q.h - mouseY) / q.h * F_VIEW;
      const dt = 1000 * (t - cursorTime), dfr = f - cursorFreq;
      lines.push([(narrow ? 'Δ ' : 'Pointer: ') + (dt >= 0 ? '+' : '−') + Math.abs(dt).toFixed(1) + ' ms, ' + (dfr >= 0 ? '+' : '−') + Math.abs(dfr).toFixed(0) + ' Hz', 'black', false]);
      found = true;
    }
  }
  if (!found) lines.push([narrow ? 'point: Δt, Δf' : 'Point to measure Δt, Δf', 'dimgray', false]);
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(narrow ? 10 : 12);
  lines.forEach((ln, i) => {
    fill(ln[1]);
    textStyle(ln[2] ? BOLD : NORMAL);
    text(ln[0], p.x + 6, p.y + 11 + i * 17);
  });
  textStyle(NORMAL);
}

function drawSpectrogram(p, view, name, col, c, showTimeTicks) {
  const narrow = canvasWidth < 600;
  const s = view.stft;

  fill('gainsboro');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);

  // the image: frame m spans its centre +/- H/2, bin k spans k df +/- df/2
  const xa = timeToX(p, s.centre(0) - s.hop / (2 * FS)), xb = timeToX(p, s.centre(s.frames - 1) + s.hop / (2 * FS));
  const ya = freqToY(p, (s.bins - 1) * s.df + s.df / 2), yb = freqToY(p, -s.df / 2);
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.rect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(view.canvas, xa, ya, xb - xa, yb - ya);
  ctx.restore();
  ctx.imageSmoothingEnabled = true;

  textSize(narrow ? 10 : 12);
  noStroke();
  fill('black');
  for (let f = 0; f <= F_VIEW; f += 500) {
    textAlign(RIGHT, CENTER);
    text(f, p.x - 5, freqToY(p, f));
  }
  if (showTimeTicks) {
    for (let ms = 250; ms <= 750; ms += (narrow ? 250 : 100)) {
      const edge = ms === 250 ? LEFT : (ms === 750 ? RIGHT : CENTER);
      textAlign(edge, TOP);
      text(ms === 750 ? '750 ms' : ms, timeToX(p, ms / 1000), p.y + p.h + 4);
    }
  }
  push();
  translate(12, p.y + p.h / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  textSize(12);
  text(narrow ? 'f (Hz)' : 'Frequency (Hz)', 0, 0);
  pop();

  // cursors
  stroke('crimson');
  strokeWeight(1.5);
  line(timeToX(p, cursorTime), p.y, timeToX(p, cursorTime), p.y + p.h);
  strokeWeight(1);
  stroke('white');
  drawingContext.setLineDash([4, 3]);
  line(p.x, freqToY(p, cursorFreq), p.x + p.w, freqToY(p, cursorFreq));
  drawingContext.setLineDash([]);

  // what the window can and cannot separate, in its own units; the longest wording that fits is used
  const dtMs = 1000 * s.n / FS;
  const bins = fmtNum(c.toneGap / s.df, 1), wins = fmtNum(1000 * c.clickGap / dtMs, 2);
  const title = name + ':  N = ' + s.n + ',  Δt = ' + fmtNum(dtMs, 0) + ' ms,  Δf = ' + fmtNum(s.df, 1) + ' Hz';
  const options = [];
  if (c.tones && c.clicks) {
    options.push('tones ' + bins + ' bins apart,  clicks ' + wins + ' windows apart');
    options.push('tones ' + bins + ' bins,  clicks ' + wins + ' windows');
    options.push(bins + ' bins,  ' + wins + ' win');
  } else if (c.tones) {
    options.push('tones ' + bins + ' bins apart');
  } else if (c.clicks) {
    options.push('clicks ' + wins + ' windows apart');
  }
  textSize(narrow ? 11 : 13);
  textStyle(BOLD);
  const titleW = textWidth(title);
  textStyle(NORMAL);
  textSize(narrow ? 10 : 12);
  let rightText = '';
  for (const o of options) {
    if (titleW + textWidth(o) + 14 <= p.w) { rightText = o; break; }
  }
  caption(p, title, col, rightText);
}

// Spectrum of the frame at the time cursor, drawn sideways on the frequency axis of its spectrogram.
function drawFrameSpectrum(p, view, col, showScale) {
  const narrow = canvasWidth < 600;
  const s = view.stft, m = s.nearest(cursorTime);
  const X = v => p.x + v * p.w;
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  for (let f = 500; f < F_VIEW; f += 500) { stroke('gainsboro'); line(p.x, freqToY(p, f), p.x + p.w, freqToY(p, f)); }
  for (const v of [1 / 3, 2 / 3]) { stroke('gainsboro'); line(X(v), p.y, X(v), p.y + p.h); }

  stroke(col);
  strokeWeight(1.5);
  noFill();
  beginShape();
  for (let k = 0; k < s.bins; k++) vertex(X(level(s.amp[m * s.bins + k])), freqToY(p, k * s.df));
  endShape();
  strokeWeight(1);
  if (s.bins <= 40) {
    noStroke();
    fill(col);
    for (let k = 0; k < s.bins; k++) circle(X(level(s.amp[m * s.bins + k])), freqToY(p, k * s.df), 4);
  }
  stroke('gray');
  drawingContext.setLineDash([4, 3]);
  line(p.x, freqToY(p, cursorFreq), p.x + p.w, freqToY(p, cursorFreq));
  drawingContext.setLineDash([]);

  if (showScale) {
    // colour bar: the key to both spectrograms
    const barY = p.y + p.h + 3;
    for (let i = 0; i < p.w; i++) {
      const cc = viridis(i / (p.w - 1));
      stroke(cc[0], cc[1], cc[2]);
      line(p.x + i, barY, p.x + i, barY + 7);
    }
    noStroke();
    fill('black');
    textSize(narrow ? 10 : 12);
    textAlign(LEFT, TOP);
    text('−' + DB_RANGE + ' dB', p.x, barY + 9);
    textAlign(RIGHT, TOP);
    text('0 dB', p.x + p.w, barY + 9);
  }
  caption(p, narrow ? 'Frame' : 'Spectrum at the cursor', col, '');
}

function drawControlLabels(c) {
  const narrow = canvasWidth < 600;
  const half = canvasWidth / 2;
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(narrow ? 12 : 15);
  fill(c.tones ? 'black' : 'gray');
  text((narrow ? 'Δf: ' : 'Tone spacing: ') + c.toneGap + ' Hz', 10, drawHeight + 53);
  fill(c.clicks ? 'black' : 'gray');
  text((narrow ? 'Δt: ' : 'Click spacing: ') + fmtNum(1000 * c.clickGap, 0) + ' ms', half + 6, drawHeight + 53);
  fill('teal');
  text((narrow ? 'A: N = ' : 'Window A:  N = ') + LENGTHS[lengthSliderA.value()], 10, drawHeight + 88);
  fill('purple');
  text((narrow ? 'B: N = ' : 'Window B:  N = ') + LENGTHS[lengthSliderB.value()], half + 6, drawHeight + 88);
  fill('black');
  text(narrow ? 'Win:' : 'Window type:', 10, drawHeight + 123);
  text(narrow ? 'Hop:' : 'Hop size H:', narrow ? half - 10 : half + 6, drawHeight + 123);
}

// ---------------------------------------------------------------------------
// Mouse: click or drag to place the time cursor (waveform) or the time and frequency cursors (spectrograms)
// ---------------------------------------------------------------------------

function moveCursor() {
  for (const name of ['wave', 'A', 'B']) {
    const p = panels[name];
    if (p && mouseX >= p.x && mouseX <= p.x + p.w && mouseY >= p.y && mouseY <= p.y + p.h) {
      cursorTime = T_VIEW0 + (mouseX - p.x) / p.w * (T_VIEW1 - T_VIEW0);
      if (name !== 'wave') cursorFreq = (p.y + p.h - mouseY) / p.h * F_VIEW;
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
  const half = canvasWidth / 2;
  const boxes = [tonesCheckbox, clicksCheckbox, chirpCheckbox, noiseCheckbox];
  const xs = narrow ? [6, 0.27 * canvasWidth, 0.54 * canvasWidth, 0.76 * canvasWidth] : [10, 150, 300, 410];
  boxes.forEach((b, i) => {
    b.position(xs[i], drawHeight + 8);
    b.style('font-size', narrow ? '12px' : '16px');
  });
  const lab = narrow ? 78 : 180;
  toneSlider.position(lab, drawHeight + 42);
  toneSlider.size(half - lab - 8);
  clickSlider.position(half + lab, drawHeight + 42);
  clickSlider.size(half - lab - margin);
  lengthSliderA.position(lab, drawHeight + 77);
  lengthSliderA.size(half - lab - 8);
  lengthSliderB.position(half + lab, drawHeight + 77);
  lengthSliderB.size(half - lab - margin);
  windowSelect.position(narrow ? 42 : 112, drawHeight + 112);
  windowSelect.style('width', (narrow ? half - 62 : 150) + 'px');
  hopSelect.position(narrow ? half + 24 : half + 100, drawHeight + 112);
  hopSelect.style('width', (narrow ? half - 34 : 190) + 'px');
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
