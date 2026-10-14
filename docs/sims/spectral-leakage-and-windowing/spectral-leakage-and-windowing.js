// Spectral Leakage and Windowing MicroSim
// CANVAS_HEIGHT: 630
// N samples of a sinusoid are multiplied by a window function and transformed.
// When the frequency is not a whole number of bins, the energy of the tone leaks
// into other bins.  The spectrum plot shows the DFT bins (dots) on top of the
// underlying DTFT (thin curve, from a zero-padded FFT), and the main-lobe width,
// peak side-lobe level and scalloping loss are computed from the window itself.

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 670;
let drawHeight = 515;
let controlHeight = 115;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 290;
let defaultTextSize = 16;

// ---- model ----
const FS = 1024;            // Hz, sampling rate
const F_SHOW = 128;         // Hz, upper limit of the spectrum plot
const PAD = 8;              // zero-padding factor used to draw the DTFT between the bins
const TONE_GAP = 6;         // Hz, spacing of the two close sinusoids
const WEAK_GAP = 24;        // Hz, offset of the weak sinusoid
const WEAK_AMP = 0.01;      // amplitude of the weak sinusoid (-40 dB)
const DB_TOP = 10, DB_BOTTOM = -100;
const METRIC_N = 512, METRIC_PAD = 64;   // window length and zero padding used to measure a window

// ---- controls ----
let signalSelect, windowSelect, sizeSelect, freqSlider, centreButton, halfButton, betaSlider;

let model = null, modelKey = '';
let metricsCache = {};
let plot = null;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  signalSelect = createSelect();
  signalSelect.option('Single sinusoid', 'single');
  signalSelect.option('Two close sinusoids', 'two');
  signalSelect.option('Strong + weak sinusoid', 'weak');
  signalSelect.selected('single');

  windowSelect = createSelect();
  windowSelect.option('Rectangular', 'rect');
  windowSelect.option('Hamming', 'hamming');
  windowSelect.option('Hanning (Hann)', 'hann');
  windowSelect.option('Blackman', 'blackman');
  windowSelect.option('Kaiser', 'kaiser');
  windowSelect.selected('rect');

  sizeSelect = createSelect();
  for (const n of [256, 512, 1024, 2048]) sizeSelect.option(String(n));
  sizeSelect.selected('256');

  freqSlider = createSlider(40, 80, 58.6, 0.1);
  betaSlider = createSlider(0, 14, 8.6, 0.1);

  centreButton = createButton('Bin centre');
  centreButton.mousePressed(() => snapFrequency(0));
  halfButton = createButton('Half-way');
  halfButton.mousePressed(() => snapFrequency(0.5));

  const mainElement = document.querySelector('main');
  [signalSelect, windowSelect, sizeSelect, freqSlider, centreButton, halfButton, betaSlider]
    .forEach(c => c.parent(mainElement));
  positionControls();

  describe('Four plots: a sinusoid of N samples, the window function, the windowed signal and its magnitude spectrum in decibels. ' +
    'Dots mark the DFT bins on the continuous spectrum, with the main-lobe width and peak side-lobe level of the window marked. ' +
    'A banner says whether the tone lies on a bin centre.', LABEL);
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
// Window functions (DFT-periodic form: the denominator is N) and their measured properties
// ---------------------------------------------------------------------------

function besselI0(x) {
  let sum = 1, term = 1;
  for (let k = 1; k < 80; k++) {
    term *= (x / (2 * k)) * (x / (2 * k));
    sum += term;
    if (term < 1e-17 * sum) break;
  }
  return sum;
}

function windowFunction(kind, n, beta) {
  const w = new Float64Array(n);
  const i0 = besselI0(beta);
  for (let i = 0; i < n; i++) {
    const c1 = Math.cos(2 * Math.PI * i / n), c2 = Math.cos(4 * Math.PI * i / n);
    if (kind === 'rect') w[i] = 1;
    else if (kind === 'hann') w[i] = 0.5 - 0.5 * c1;
    else if (kind === 'hamming') w[i] = 0.54 - 0.46 * c1;
    else if (kind === 'blackman') w[i] = 0.42 - 0.5 * c1 + 0.08 * c2;
    else {
      const r = 2 * i / n - 1;
      w[i] = besselI0(beta * Math.sqrt(Math.max(0, 1 - r * r))) / i0;
    }
  }
  return w;
}

// Properties of a window, measured from the magnitude of its own transform.
// The window is zero-padded so that its transform is sampled every 1/METRIC_PAD of a bin.
function windowMetrics(kind, beta) {
  const key = kind + (kind === 'kaiser' ? beta.toFixed(1) : '');
  if (metricsCache[key]) return metricsCache[key];
  const w = windowFunction(kind, METRIC_N, beta);
  const size = METRIC_N * METRIC_PAD;
  const re = new Float64Array(size), im = new Float64Array(size);
  let sum = 0, sumSq = 0;
  for (let i = 0; i < METRIC_N; i++) { re[i] = w[i]; sum += w[i]; sumSq += w[i] * w[i]; }
  fft(re, im);
  const half = size / 2;
  const mag = new Float64Array(half);
  for (let i = 0; i < half; i++) mag[i] = Math.hypot(re[i], im[i]) / sum;     // 1 at the centre of the main lobe

  // first null: the first local minimum of the magnitude
  let iNull = 1;
  while (iNull < half - 1 && !(mag[iNull] <= mag[iNull - 1] && mag[iNull] <= mag[iNull + 1])) iNull++;
  // highest side lobe: the largest value beyond the first null
  let side = 0;
  for (let i = iNull; i < half; i++) side = Math.max(side, mag[i]);
  // -3 dB point of the main lobe, by linear interpolation
  let i3 = 1;
  while (i3 < iNull && mag[i3] > Math.SQRT1_2) i3++;
  const frac = (mag[i3 - 1] - Math.SQRT1_2) / (mag[i3 - 1] - mag[i3]);
  const m = {
    coherentGain: sum / METRIC_N,
    mainLobeBins: 2 * iNull / METRIC_PAD,                      // null to null
    halfPowerBins: 2 * (i3 - 1 + frac) / METRIC_PAD,           // -3 dB width
    sideLobeDb: 20 * Math.log10(side),
    scallopDb: -20 * Math.log10(mag[METRIC_PAD / 2]),          // loss for a tone half-way between two bins
    enbwBins: METRIC_N * sumSq / (sum * sum)
  };
  metricsCache[key] = m;
  return m;
}

// ---------------------------------------------------------------------------
// Signal and spectrum
// ---------------------------------------------------------------------------

function tones(kind, f) {
  if (kind === 'two') return [{ f: f, a: 1 }, { f: f + TONE_GAP, a: 1 }];
  if (kind === 'weak') return [{ f: f, a: 1 }, { f: f + WEAK_GAP, a: WEAK_AMP }];
  return [{ f: f, a: 1 }];
}

function buildModel(kind, winKind, n, f, beta) {
  const w = windowFunction(winKind, n, beta);
  const list = tones(kind, f);
  const x = new Float64Array(n), xw = new Float64Array(n);
  const size = n * PAD;
  const re = new Float64Array(size), im = new Float64Array(size);
  let gain = 0, peak = 0;
  for (let i = 0; i < n; i++) {
    for (const t of list) x[i] += t.a * Math.sin(2 * Math.PI * t.f * i / FS);
    xw[i] = x[i] * w[i];
    re[i] = xw[i];
    gain += w[i] / n;
    peak = Math.max(peak, Math.abs(x[i]));
  }
  fft(re, im);
  // level in dB, scaled so that a bin-centred sinusoid of amplitude 1 reads 0 dB:
  // 20 log10( 2 |X| / (N * mean of w) )
  const count = Math.round(F_SHOW / FS * size) + 1;
  const db = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    db[i] = 20 * Math.log10(Math.max(1e-12, 2 * Math.hypot(re[i], im[i]) / (n * gain)));
  }
  // highest DFT bin (every PAD-th point of the padded transform is a bin of the N-point DFT)
  let kPeak = 0;
  for (let k = 0; k * PAD < count; k++) if (db[k * PAD] > db[kPeak * PAD]) kPeak = k;
  return { kind: kind, winKind: winKind, n: n, f: f, beta: beta, df: FS / n, w: w, x: x, xw: xw, tones: list,
    db: db, fineStep: FS / size, kPeak: kPeak, peakDb: db[kPeak * PAD], signalPeak: peak,
    bins: f / (FS / n), metrics: windowMetrics(winKind, beta) };
}

function currentModel() {
  const kind = signalSelect.value(), winKind = windowSelect.value(), n = parseInt(sizeSelect.value());
  const f = freqSlider.value(), beta = betaSlider.value();
  const key = [kind, winKind, n, f, winKind === 'kaiser' ? beta : 0].join('|');
  if (key !== modelKey) {
    model = buildModel(kind, winKind, n, f, beta);
    modelKey = key;
  }
  return model;
}

function onBin(m) { return Math.abs(m.bins - Math.round(m.bins)) < 1e-6; }

// Move the tone to the nearest bin centre (offset 0) or to the nearest point half-way between bins (offset 0.5).
function snapFrequency(offset) {
  const df = FS / parseInt(sizeSelect.value());
  let k = Math.round(freqSlider.value() / df - offset) + offset;
  let f = k * df;
  if (f < 40) f += df;
  if (f > 80) f -= df;
  freqSlider.value(f);
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

  const m = currentModel();
  if (m.winKind === 'kaiser') betaSlider.removeAttribute('disabled');
  else betaSlider.attribute('disabled', '');

  const left = 46, right = 16;
  const pw = canvasWidth - left - right;
  const p1 = { x: left, y: 80, w: pw, h: 40 };
  const p2 = { x: left, y: 142, w: pw, h: 40 };
  const p3 = { x: left, y: 204, w: pw, h: 40 };
  const p4 = { x: left, y: 326, w: pw, h: 150 };
  const narrow = canvasWidth < 600;

  drawBanner(m);
  const yMax = m.signalPeak > 1.3 ? 2.5 : 1.25;
  drawTimePanel(p1, m, m.x, yMax, 'blue', false,
    narrow ? 'Signal x[n]: ' + m.bins.toFixed(2) + ' cycles' : 'Time signal x[n]: ' + m.bins.toFixed(2) + ' cycles of the ' + m.f.toFixed(1) + ' Hz tone in N = ' + m.n + ' samples',
    'fs = ' + FS + ' Hz');
  drawTimePanel(p2, m, m.w, 1.25, 'darkorange', false, 'Window function w[n]: ' + windowName(m), '');
  drawTimePanel(p3, m, m.xw, yMax, 'purple', true, narrow ? 'Windowed signal x[n]·w[n]' : 'Windowed signal x[n]·w[n], the sequence that is transformed', 't (ms)');
  drawMetrics(m, left, pw);
  drawSpectrum(p4, m);

  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(22);
  text('Spectral Leakage and Windowing', canvasWidth / 2, 8);

  drawControlLabels(m);
}

function windowName(m) {
  const names = { rect: 'rectangular', hamming: 'Hamming', hann: 'Hanning (Hann)', blackman: 'Blackman', kaiser: 'Kaiser, β = ' + m.beta.toFixed(1) };
  return names[m.winKind];
}

function drawBanner(m) {
  const narrow = canvasWidth < 600;
  const centred = onBin(m);
  const fTxt = 'f = ' + m.f.toFixed(1) + ' Hz = ' + m.bins.toFixed(2) + ' × Δf';
  let msg;
  if (centred) {
    msg = fTxt + (narrow ? ': on bin ' + Math.round(m.bins) : '  (Δf = fs/N = ' + m.df + ' Hz):  exactly on bin ' + Math.round(m.bins) + ', a whole number of cycles');
  } else {
    msg = fTxt + (narrow ? ': between bins, leakage' : '  (Δf = fs/N = ' + m.df + ' Hz):  between bins ' + Math.floor(m.bins) + ' and ' + Math.ceil(m.bins) + ', so the tone leaks into other bins');
  }
  stroke(centred ? 'darkgreen' : 'firebrick');
  strokeWeight(1.5);
  fill(centred ? 'honeydew' : 'mistyrose');
  rect(10, 34, canvasWidth - 20, 24, 8);
  strokeWeight(1);
  noStroke();
  fill(centred ? 'darkgreen' : 'firebrick');
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

function drawTimePanel(p, m, data, yMax, col, showTimeTicks, title, rightText) {
  const tick = yMax / 1.25;
  const X = i => p.x + i / m.n * p.w;
  const Y = v => p.y + p.h / 2 - (v / yMax) * (p.h / 2);
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(12);
  for (const v of [-tick, 0, tick]) {
    stroke(v === 0 ? 'gray' : 'gainsboro');
    line(p.x, Y(v), p.x + p.w, Y(v));
    if (v !== 0) {
      noStroke();
      fill('black');
      textAlign(RIGHT, CENTER);
      text(v > 0 ? v : '−' + (-v), p.x - 5, Y(v));
    }
  }
  const duration = 1000 * m.n / FS;
  for (let j = 0; j <= 4; j++) {
    const x = p.x + j / 4 * p.w;
    stroke('gainsboro');
    line(x, p.y, x, p.y + p.h);
    if (showTimeTicks) {
      noStroke();
      fill('black');
      textAlign(j === 0 ? LEFT : (j === 4 ? RIGHT : CENTER), TOP);
      text(Math.round(duration * j / 4), x, p.y + p.h + 4);
    }
  }
  stroke(col);
  strokeWeight(1.5);
  noFill();
  beginShape();
  for (let i = 0; i < m.n; i++) vertex(X(i), Y(data[i]));
  endShape();
  strokeWeight(1);
  caption(p, title, col, rightText);
}

// Measured properties of the window, as a small table.
function drawMetrics(m, left, pw) {
  const narrow = canvasWidth < 600;
  const q = m.metrics;
  let cells = [
    ['Main lobe (null to null)', q.mainLobeBins.toFixed(2) + ' bins = ' + parseFloat((q.mainLobeBins * m.df).toFixed(2)) + ' Hz'],
    ['−3 dB width', q.halfPowerBins.toFixed(2) + ' bins'],
    ['Peak side lobe', q.sideLobeDb.toFixed(1).replace('-', '−') + ' dB'],
    ['Scalloping loss', q.scallopDb.toFixed(2) + ' dB'],
    ['Coherent gain', q.coherentGain.toFixed(3)]
  ];
  if (narrow) {
    cells = [
      ['Main lobe', q.mainLobeBins.toFixed(2) + ' bins'],
      ['Peak side lobe', q.sideLobeDb.toFixed(1).replace('-', '−') + ' dB'],
      ['Scalloping loss', q.scallopDb.toFixed(2) + ' dB']
    ];
  }
  const widths = narrow ? [1, 1.2, 1.2] : [1.7, 1, 1.1, 1.1, 1];
  const total = widths.reduce((a, b) => a + b, 0);
  stroke('silver');
  fill('ivory');
  rect(left, 268, pw, 36, 5);
  let x = left;
  noStroke();
  for (let i = 0; i < cells.length; i++) {
    const cw = pw * widths[i] / total;
    textAlign(CENTER, CENTER);
    fill('dimgray');
    textSize(narrow ? 10 : 11);
    text(cells[i][0], x + cw / 2, 277);
    fill('black');
    textSize(narrow ? 12 : 14);
    textStyle(BOLD);
    text(cells[i][1], x + cw / 2, 293);
    textStyle(NORMAL);
    x += cw;
  }
}

function drawSpectrum(p, m) {
  const X = f => p.x + f / F_SHOW * p.w;
  const Y = db => p.y + (DB_TOP - constrain(db, DB_BOTTOM, DB_TOP)) / (DB_TOP - DB_BOTTOM) * p.h;
  const q = m.metrics;
  const narrow = canvasWidth < 600;

  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(12);
  for (let db = 0; db >= DB_BOTTOM; db -= 20) {
    stroke(db === 0 ? 'silver' : 'gainsboro');
    line(p.x, Y(db), p.x + p.w, Y(db));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(db === 0 ? '0' : '−' + (-db), p.x - 5, Y(db));
  }
  for (let f = 0; f <= F_SHOW; f += 16) {
    stroke('gainsboro');
    line(X(f), p.y, X(f), p.y + p.h);
    noStroke();
    fill('black');
    textAlign(f === 0 ? LEFT : (f === F_SHOW ? RIGHT : CENTER), TOP);
    if (!narrow || f % 32 === 0) text(f, X(f), p.y + p.h + 4);
  }
  noStroke();
  fill('black');
  textSize(13);
  textAlign(CENTER, TOP);
  text('Frequency (Hz)', p.x + p.w / 2, p.y + p.h + 19);

  // main lobe of the window around the first tone, null to null
  const lobeHz = q.mainLobeBins * m.df;
  noStroke();
  fill('rgba(255, 165, 0, 0.20)');
  rect(X(m.f - lobeHz / 2), p.y + 1, X(lobeHz) - X(0), p.h - 2);

  // peak side-lobe level of the window, relative to the top of the main lobe
  stroke('darkorange');
  drawingContext.setLineDash([6, 4]);
  line(p.x, Y(q.sideLobeDb), p.x + p.w, Y(q.sideLobeDb));
  drawingContext.setLineDash([]);

  // true frequencies of the tones
  for (const t of m.tones) {
    stroke('lightsteelblue');
    drawingContext.setLineDash([2, 3]);
    line(X(t.f), p.y, X(t.f), p.y + p.h);
    drawingContext.setLineDash([]);
    noStroke();
    fill('steelblue');
    triangle(X(t.f) - 5, p.y + 1, X(t.f) + 5, p.y + 1, X(t.f), p.y + 9);
  }

  // DTFT of the windowed signal (zero-padded FFT)
  stroke('gray');
  strokeWeight(1);
  noFill();
  beginShape();
  for (let i = 0; i < m.db.length; i++) vertex(X(i * m.fineStep), Y(m.db[i]));
  endShape();

  // the N-point DFT: one dot per bin
  const dot = m.n <= 512 ? 5 : 3.5;
  noStroke();
  fill('crimson');
  for (let k = 0; k * PAD < m.db.length; k++) {
    if (m.db[k * PAD] < DB_BOTTOM) continue;
    circle(X(k * m.df), Y(m.db[k * PAD]), dot);
  }

  // labels of the two indicators
  textSize(12);
  noStroke();
  fill('chocolate');
  textAlign(LEFT, BOTTOM);
  const sideLabel = (narrow ? 'side lobe ' : 'peak side lobe of the window: ') + q.sideLobeDb.toFixed(1).replace('-', '−') + ' dB';
  text(sideLabel, p.x + 4, Y(q.sideLobeDb) - 2);
  textAlign(LEFT, TOP);
  if (!narrow) text('shaded: main lobe', Math.min(X(m.f + lobeHz / 2) + 4, p.x + p.w - 110), p.y + 12);

  // cursor readout, or the level of the highest bin
  plot = { p: p };
  let rightText;
  if (mouseX >= p.x && mouseX <= p.x + p.w && mouseY >= p.y && mouseY <= p.y + p.h) {
    const i = constrain(Math.round((mouseX - p.x) / p.w * F_SHOW / m.fineStep), 0, m.db.length - 1);
    const f = i * m.fineStep;
    stroke('gray');
    drawingContext.setLineDash([3, 3]);
    line(X(f), p.y, X(f), p.y + p.h);
    drawingContext.setLineDash([]);
    noFill();
    stroke('black');
    circle(X(f), Y(m.db[i]), 9);
    rightText = 'cursor: ' + f.toFixed(1) + ' Hz (bin ' + (f / m.df).toFixed(2) + '), ' + m.db[i].toFixed(1).replace('-', '−') + ' dB';
  } else {
    rightText = 'highest bin: k = ' + m.kPeak + ' (' + parseFloat((m.kPeak * m.df).toFixed(1)) + ' Hz), ' + m.peakDb.toFixed(2).replace('-', '−') + ' dB';
  }
  caption(p, narrow ? 'Spectrum (dB)' : 'Magnitude spectrum (dB): DFT bins (dots) on the DTFT (curve)', 'crimson', rightText);
}

function drawControlLabels(m) {
  const narrow = canvasWidth < 600;
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  textSize(narrow ? 13 : defaultTextSize);
  if (!narrow) {
    text('Signal:', 10, drawHeight + 18);
    text('Window:', 280, drawHeight + 18);
    text('FFT size N:', 492, drawHeight + 18);
  }
  text(narrow ? 'f: ' + m.f.toFixed(1) + ' Hz' : 'Frequency f: ' + m.f.toFixed(1) + ' Hz (' + m.bins.toFixed(2) + ' bins)', 10, drawHeight + 53);
  fill(m.winKind === 'kaiser' ? 'black' : 'gray');
  text((narrow ? 'β: ' : 'Kaiser β: ') + betaSlider.value().toFixed(1), narrow ? 150 : 215, drawHeight + 88);
}

// ---------------------------------------------------------------------------
// Responsive layout
// ---------------------------------------------------------------------------

function positionControls() {
  const narrow = canvasWidth < 600;
  if (narrow) {
    const w1 = Math.floor((canvasWidth - 16 - 70 - 12) * 0.56), w2 = canvasWidth - 16 - 70 - 12 - w1;
    signalSelect.position(8, drawHeight + 7);
    signalSelect.style('width', w1 + 'px');
    windowSelect.position(8 + w1 + 6, drawHeight + 7);
    windowSelect.style('width', w2 + 'px');
    sizeSelect.position(canvasWidth - 8 - 70, drawHeight + 7);
    sizeSelect.style('width', '70px');
  } else {
    signalSelect.position(68, drawHeight + 7);
    signalSelect.style('width', '200px');
    windowSelect.position(346, drawHeight + 7);
    windowSelect.style('width', '134px');
    sizeSelect.position(582, drawHeight + 7);
    sizeSelect.style('width', '70px');
  }
  const labelW = narrow ? 95 : sliderLeftMargin;
  freqSlider.position(labelW, drawHeight + 42);
  freqSlider.size(canvasWidth - labelW - margin);
  centreButton.html(narrow ? 'On bin' : 'Bin centre');
  halfButton.html(narrow ? 'Half' : 'Half-way');
  const bw = narrow ? 62 : 92;
  centreButton.position(8, drawHeight + 75);
  centreButton.size(bw);
  halfButton.position(8 + bw + 6, drawHeight + 75);
  halfButton.size(bw);
  const betaLeft = narrow ? 205 : 320;
  betaSlider.position(betaLeft, drawHeight + 77);
  betaSlider.size(canvasWidth - betaLeft - margin);
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
