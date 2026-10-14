// Wavelet Explorer: CWT Scalogram and Haar DWT MicroSim
// CANVAS_HEIGHT: 578
// Multiresolution analysis of a 256-sample signal (fs = 256 Hz, so the signal lasts 1 s).
//  - CWT mode: W(a,b) = (1/sqrt(a)) * sum_n x[n] psi((n - b)/a) at 32 log-spaced scales a
//    (pseudo-frequencies 96 Hz down to 3 Hz), drawn as a color-mapped scalogram. The scale and
//    position sliders (or a click on the scalogram) overlay the dilated wavelet on the signal.
//  - DWT mode: a 1-5 level Haar decomposition, a[k] = (x[2k] + x[2k+1])/sqrt(2) and
//    d[k] = (x[2k] - x[2k+1])/sqrt(2), with hard thresholding of the detail coefficients and
//    the reconstructed (denoised) signal with its mean squared error.

// Canvas dimensions
let canvasWidth = 800;               // overwritten from the container in updateCanvasSize()
let drawHeight = 466;
let controlHeight = 112;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let sliderLeftMargin = 205;
let defaultTextSize = 16;

// Controls
let modeSelect, signalSelect, waveletSelect, dbCheckbox;
let scaleSlider, positionSlider, levelSlider, thresholdSlider;
let narrow = false;                  // < 600 px: two rows of drop-down lists, shorter plots

// Signal and transform constants
const N = 256;                       // samples
const FS = 256;                      // sample rate in Hz (signal length 1 s)
const N_SCALES = 32;
const F_TOP = 96, F_BOTTOM = 3;      // pseudo-frequency of the smallest and largest scale (5 octaves)
const MAX_LEVEL = 5;
const NOISE_SIGMA = 0.3;
const NOISE_SEED = 42;
const DB_RANGE = 40;                 // dynamic range of the dB color scale

const SIGNALS = {
  tones:  { label: 'two tones',    formula: 'x(t) = sin(2π·8t) + sin(2π·32t)' },
  chirp:  { label: 'chirp',        formula: 'chirp: f(t) = 4 + 56t Hz' },
  spike:  { label: 'tone + spike', formula: 'x(t) = sin(2π·8t) + spike of 3 at t = 0.625 s' },
  step:   { label: 'step edge',    formula: 'step from 0 to 1 at t = 0.41 s (n = 105)' },
  noisy:  { label: 'noisy sine',   formula: 'x(t) = sin(2π·4t) + Gaussian noise, σ = 0.3' }
};

// Mother wavelets. fc = frequency (cycles per unit t) where |Psi(f)| peaks.
const WAVELETS = {
  morlet: { label: 'Morlet',      fc: 5 / (2 * Math.PI),        support: 4,
            formula: 'Morlet ψ(t) = e^(−t²/2)·cos(5t),  f_c = 0.796' },
  mexhat: { label: 'Mexican hat', fc: Math.SQRT2 / (2 * Math.PI), support: 5,
            formula: 'Mexican hat ψ(t) = (1 − t²)·e^(−t²/2),  f_c = 0.225' },
  haar:   { label: 'Haar',        fc: 0.7420,                   support: 0.5,
            formula: 'Haar ψ(t) = +1 on [−½, 0), −1 on [0, ½),  f_c = 0.742' }
};

// Layout of the drawing region (y values; x values follow the width)
const TITLE_Y = 16, INFO_Y = 40;
const SIG_TOP = 54;
// (bottom and read-out rows move up by 34 px on narrow screens, see computeLayout())
const CWT = { sigBottom: 158, headY: 184, top: 196, bottom: 388, read1: 424, read2: 446 };
const DWT = { sigBottom: 164, read1: 198, read2: 218, top: 232, bottom: 438 };
let plotL = 50, plotR = 750;

// Colors
const COL_SIG = [25, 90, 200];       // signal: blue
const COL_WAV = [190, 125, 0];       // wavelet overlay: gold
const COL_REC = [128, 0, 0];         // reconstruction: maroon
const COL_CLEAN = [120, 120, 120];   // clean sine: gray
const COL_KEEP = [40, 140, 80];      // kept detail coefficients: green
const COL_APPROX = [70, 110, 170];   // approximation coefficients: steel blue
const COL_ZERO = [205, 205, 205];    // zeroed coefficients: light gray
const COL_THR = [205, 35, 35];       // threshold: red
const VIRIDIS = [[68, 1, 84], [71, 44, 122], [59, 81, 139], [44, 113, 142], [33, 144, 141],
                 [39, 173, 129], [92, 200, 99], [170, 220, 50], [253, 231, 37]];

// State
let mode = 'cwt', sigKey = 'chirp', wavKey = 'morlet';
let sig = null;                      // { x, clean, yRange }
let cwtCache = { key: '', W: null, maxAbs: 1, img: null };
let useDB = false;
let dwtCache = { key: '', approx: null, detail: null, dScale: 1 };
let cwtRead = {};                    // read-outs (also handy for testing)
let dwtRead = {};

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  modeSelect = createSelect();
  modeSelect.option('CWT scalogram', 'cwt');
  modeSelect.option('Haar DWT', 'dwt');
  modeSelect.selected('cwt');

  signalSelect = createSelect();
  for (const k of Object.keys(SIGNALS)) signalSelect.option(SIGNALS[k].label, k);
  signalSelect.selected('chirp');

  waveletSelect = createSelect();
  for (const k of Object.keys(WAVELETS)) waveletSelect.option(WAVELETS[k].label, k);
  waveletSelect.selected('morlet');

  dbCheckbox = createCheckbox('dB color scale', false);

  scaleSlider = createSlider(0, N_SCALES - 1, 10, 1);
  positionSlider = createSlider(0, N - 1, 128, 1);
  levelSlider = createSlider(1, MAX_LEVEL, 3, 1);
  thresholdSlider = createSlider(0, 4, 0.5, 0.05);

  layoutControls();
  describe('Wavelet explorer. In CWT mode the top plot shows a 256-sample signal with the dilated wavelet at the selected scale and position overlaid in gold, and the lower plot is a color-mapped scalogram of |W(a,b)| with time on the x axis and 32 log-spaced scales (pseudo-frequency 3 to 96 Hz) on the y axis. In Haar DWT mode the top plot shows the input and the reconstructed signal, and bar plots show the detail coefficients of each level and the final approximation, with a hard threshold band and the mean squared error.');
}

function draw() {
  updateCanvasSize();
  readControls();

  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  if (mode === 'cwt') drawCWTView();
  else drawDWTView();
  drawControlLabels();
}

// ---------------------------------------------------------------- controls and state

function readControls() {
  const m = modeSelect.value() === 'dwt' ? 'dwt' : 'cwt';
  if (m !== mode) { mode = m; layoutControls(); }
  const s = SIGNALS[signalSelect.value()] ? signalSelect.value() : 'chirp';
  const w = WAVELETS[waveletSelect.value()] ? waveletSelect.value() : 'morlet';
  if (!sig || s !== sigKey) { sigKey = s; sig = makeSignal(sigKey); }
  wavKey = w;
  useDB = dbCheckbox.checked();
}

// The canvas height is fixed; on narrow screens CWT mode trades 34 px of drawing for a
// second row of controls (the wavelet list and the dB check box)
function computeLayout() {
  narrow = canvasWidth < 600;
  drawHeight = (narrow && mode === 'cwt') ? 432 : 466;
  controlHeight = canvasHeight - drawHeight;
  CWT.bottom = drawHeight - 78;
  CWT.read1 = drawHeight - 42;
  CWT.read2 = drawHeight - 20;
  DWT.bottom = drawHeight - 28;
}

function layoutControls() {
  if (typeof modeSelect === 'undefined') return;
  computeLayout();
  const fs = narrow ? '14px' : '16px';
  for (const el of [modeSelect, signalSelect, waveletSelect, dbCheckbox]) el.style('font-size', fs);
  sliderLeftMargin = narrow ? 152 : 205;
  const y0 = drawHeight + 8;
  modeSelect.position(10, y0);
  signalSelect.position(10 + modeSelect.elt.offsetWidth + 10, y0);
  if (narrow) {
    waveletSelect.position(10, y0 + 32);
    dbCheckbox.position(10 + waveletSelect.elt.offsetWidth + 14, y0 + 34);
  } else {
    const xw = 10 + modeSelect.elt.offsetWidth + 10 + signalSelect.elt.offsetWidth + 10;
    waveletSelect.position(xw, y0);
    dbCheckbox.position(xw + waveletSelect.elt.offsetWidth + 14, y0 + 2);
  }
  const w = max(60, canvasWidth - sliderLeftMargin - margin);
  for (const sl of [scaleSlider, positionSlider, levelSlider, thresholdSlider]) sl.size(w);
  scaleSlider.position(sliderLeftMargin, sliderRowY(1) - 10);
  positionSlider.position(sliderLeftMargin, sliderRowY(2) - 10);
  levelSlider.position(sliderLeftMargin, sliderRowY(1) - 10);
  thresholdSlider.position(sliderLeftMargin, sliderRowY(2) - 10);
  const cwt = mode === 'cwt';
  for (const el of [waveletSelect, dbCheckbox, scaleSlider, positionSlider]) cwt ? el.show() : el.hide();
  for (const el of [levelSlider, thresholdSlider]) cwt ? el.hide() : el.show();
}

// vertical centre of slider row i (1 or 2); on narrow screens CWT mode has a second row of lists
function sliderRowY(i) {
  const first = (narrow && mode === 'cwt') ? 86 : 52;
  return drawHeight + first + 34 * (i - 1);
}

function drawControlLabels() {
  noStroke();
  fill('black');
  const sz = narrow ? 14 : defaultTextSize;
  if (mode === 'cwt') {
    const a = scaleOf(wavKey, Number(scaleSlider.value()));
    const b = Number(positionSlider.value());
    fitText(['Scale a = ' + fmtScale(a) + ' samples', 'Scale a = ' + fmtScale(a)], 10, sliderRowY(1), sliderLeftMargin - 14, sz, LEFT);
    fitText(['Position b = ' + (b / FS).toFixed(3) + ' s', 'b = ' + (b / FS).toFixed(3) + ' s'], 10, sliderRowY(2), sliderLeftMargin - 14, sz, LEFT);
  } else {
    fitText(['Levels L = ' + Number(levelSlider.value())], 10, sliderRowY(1), sliderLeftMargin - 14, sz, LEFT);
    fitText(['Threshold T = ' + Number(thresholdSlider.value()).toFixed(2), 'T = ' + Number(thresholdSlider.value()).toFixed(2)],
            10, sliderRowY(2), sliderLeftMargin - 14, sz, LEFT);
  }
}

// ---------------------------------------------------------------- signals

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// reproducible Gaussian noise (Box-Muller on a seeded generator)
function gaussianNoise(seed, n) {
  const r = mulberry32(seed);
  const out = [];
  while (out.length < n) {
    const u = 1 - r(), v = r();
    const m = Math.sqrt(-2 * Math.log(u));
    out.push(m * Math.cos(2 * Math.PI * v));
    if (out.length < n) out.push(m * Math.sin(2 * Math.PI * v));
  }
  return out;
}

function makeSignal(key) {
  const x = new Float64Array(N), clean = new Float64Array(N);
  const noise = key === 'noisy' ? gaussianNoise(NOISE_SEED, N) : null;
  for (let n = 0; n < N; n++) {
    const t = n / FS;
    let c;
    switch (key) {
      case 'tones': c = Math.sin(2 * Math.PI * 8 * t) + Math.sin(2 * Math.PI * 32 * t); break;
      case 'chirp': c = Math.sin(2 * Math.PI * (4 * t + 28 * t * t)); break;   // f(t) = 4 + 56 t
      case 'spike': c = Math.sin(2 * Math.PI * 8 * t) + (n === 160 ? 3 : 0); break;
      case 'step':  c = n >= 105 ? 1 : 0; break;
      default:      c = Math.sin(2 * Math.PI * 4 * t);
    }
    clean[n] = c;
    x[n] = noise ? c + NOISE_SIGMA * noise[n] : c;
  }
  let m = 0;
  for (let n = 0; n < N; n++) m = Math.max(m, Math.abs(x[n]));
  return { x, clean, noisy: !!noise, yRange: Math.max(1.2, Math.ceil(m * 1.12 * 2) / 2) };
}

// ---------------------------------------------------------------- continuous wavelet transform

function psiValue(w, t) {
  if (w === 'morlet') return Math.exp(-t * t / 2) * Math.cos(5 * t);
  if (w === 'mexhat') return (1 - t * t) * Math.exp(-t * t / 2);
  return (t >= -0.5 && t < 0) ? 1 : ((t >= 0 && t < 0.5) ? -1 : 0);
}

// antiderivative of psi (Mexican hat and Haar), used to average psi over each sample interval
function psiIntegral(w, t) {
  if (w === 'mexhat') return t * Math.exp(-t * t / 2);
  if (t < -0.5 || t >= 0.5) return 0;
  return t < 0 ? t + 0.5 : 0.5 - t;
}

// pseudo-frequency of scale index k (0 = smallest scale, top row) and the matching scale a in samples
function freqOf(k) { return F_TOP * Math.pow(F_BOTTOM / F_TOP, k / (N_SCALES - 1)); }
function scaleOf(w, k) { return WAVELETS[w].fc * FS / freqOf(k); }

// sampled, 1/sqrt(a)-normalised wavelet at scale a: h[m + M] = psi(m/a)/sqrt(a)
function waveletFilter(w, a) {
  const M = Math.ceil(WAVELETS[w].support * a) + 1;
  const h = new Float64Array(2 * M + 1);
  for (let m = -M; m <= M; m++) {
    let v;
    if (w === 'morlet') v = psiValue(w, m / a);
    else v = a * (psiIntegral(w, (m + 0.5) / a) - psiIntegral(w, (m - 0.5) / a));
    h[m + M] = v / Math.sqrt(a);
  }
  return { h, M };
}

// mirror-reflect an index into 0..N-1 (x[-1] = x[0], x[N] = x[N-1])
function reflectIndex(i) {
  const P = 2 * N;
  i = ((i % P) + P) % P;
  return i < N ? i : P - 1 - i;
}

function computeCWT(x, w) {
  const W = [];
  let maxAbs = 0;
  for (let k = 0; k < N_SCALES; k++) {
    const { h, M } = waveletFilter(w, scaleOf(w, k));
    const ext = new Float64Array(N + 2 * M);
    for (let i = 0; i < ext.length; i++) ext[i] = x[reflectIndex(i - M)];
    const row = new Float64Array(N);
    for (let b = 0; b < N; b++) {
      let s = 0;
      for (let j = 0; j <= 2 * M; j++) s += ext[b + j] * h[j];   // n = b + m, m = j - M
      row[b] = s;
      maxAbs = Math.max(maxAbs, Math.abs(s));
    }
    W.push(row);
  }
  return { W, maxAbs: maxAbs || 1 };
}

function viridis(v) {
  v = constrain(v, 0, 1) * (VIRIDIS.length - 1);
  const i = Math.min(VIRIDIS.length - 2, Math.floor(v));
  const f = v - i, c0 = VIRIDIS[i], c1 = VIRIDIS[i + 1];
  return [c0[0] + f * (c1[0] - c0[0]), c0[1] + f * (c1[1] - c0[1]), c0[2] + f * (c1[2] - c0[2])];
}

// position on the color map of |W|/max: linear, or dB over the top DB_RANGE decibels
function colorLevel(r) {
  if (!useDB) return r;
  return (20 * Math.log10(Math.max(r, 1e-12)) + DB_RANGE) / DB_RANGE;
}

function ensureCWT() {
  const key = sigKey + '|' + wavKey + '|' + useDB;
  if (cwtCache.key === key) return;
  const { W, maxAbs } = computeCWT(sig.x, wavKey);
  const img = createImage(N, N_SCALES);
  img.loadPixels();
  for (let k = 0; k < N_SCALES; k++) {
    for (let b = 0; b < N; b++) {
      const c = viridis(colorLevel(Math.abs(W[k][b]) / maxAbs));
      const p = 4 * (k * N + b);
      img.pixels[p] = c[0]; img.pixels[p + 1] = c[1]; img.pixels[p + 2] = c[2]; img.pixels[p + 3] = 255;
    }
  }
  img.updatePixels();
  cwtCache = { key, W, maxAbs, img };
}

// ---------------------------------------------------------------- Haar DWT

function haarDecompose(x) {
  const approx = [Array.from(x)], detail = [null];
  for (let j = 1; j <= MAX_LEVEL; j++) {
    const prev = approx[j - 1], h = prev.length / 2;
    const a = new Array(h), d = new Array(h);
    for (let k = 0; k < h; k++) {
      a[k] = (prev[2 * k] + prev[2 * k + 1]) / Math.SQRT2;
      d[k] = (prev[2 * k] - prev[2 * k + 1]) / Math.SQRT2;
    }
    approx.push(a);
    detail.push(d);
  }
  return { approx, detail };
}

function hardThreshold(v, T) { return Math.abs(v) > T ? v : 0; }

function haarReconstruct(approx, detail, L, T) {
  let c = approx[L].slice();
  for (let j = L; j >= 1; j--) {
    const d = detail[j], next = new Array(2 * c.length);
    for (let k = 0; k < c.length; k++) {
      const dk = hardThreshold(d[k], T);
      next[2 * k] = (c[k] + dk) / Math.SQRT2;
      next[2 * k + 1] = (c[k] - dk) / Math.SQRT2;
    }
    c = next;
  }
  return c;
}

function meanSquaredError(u, v) {
  let s = 0;
  for (let i = 0; i < u.length; i++) s += (u[i] - v[i]) * (u[i] - v[i]);
  return s / u.length;
}

function ensureDWT() {
  if (dwtCache.key === sigKey) return;
  const { approx, detail } = haarDecompose(sig.x);
  let dMax = 0;
  for (let j = 1; j <= MAX_LEVEL; j++) for (const v of detail[j]) dMax = Math.max(dMax, Math.abs(v));
  dwtCache = { key: sigKey, approx, detail, dScale: Math.max(0.5, dMax * 1.08) };
}

// ---------------------------------------------------------------- coordinates

function px(n) { return plotL + n / N * (plotR - plotL); }
function sampleAt(x) { return constrain(Math.floor((x - plotL) / (plotR - plotL) * N), 0, N - 1); }
function pySig(v, bottom) {
  const mid = (SIG_TOP + bottom) / 2, half = (bottom - SIG_TOP) / 2 - 3;
  return mid - v / sig.yRange * half;
}

function startClip(x, y, w, h) {
  push();
  drawingContext.beginPath();
  drawingContext.rect(x, y, w, h);
  drawingContext.clip();
}
function stopClip() { pop(); }

// ---------------------------------------------------------------- CWT view

function drawCWTView() {
  plotL = 50;
  plotR = canvasWidth - 48;
  ensureCWT();
  const k = Number(scaleSlider.value());
  const b = Number(positionSlider.value());
  const a = scaleOf(wavKey, k);
  const wv = WAVELETS[wavKey];

  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(['Wavelet Explorer: Continuous Wavelet Transform', 'Wavelet Explorer: CWT', 'CWT'], canvasWidth / 2, TITLE_Y, canvasWidth - 20, 20, CENTER);
  textStyle(NORMAL);
  fill(60);
  fitText([wv.formula, wv.formula.split(',')[0]], margin, INFO_Y, canvasWidth - 2 * margin, 15, LEFT);

  // signal plot with the dilated wavelet
  const bottom = CWT.sigBottom;
  drawSignalFrame(bottom, false);
  startClip(plotL, SIG_TOP, plotR - plotL, bottom - SIG_TOP);
  drawTrace(sig.x, bottom, COL_SIG, 2);
  // vertical marker at b
  stroke(COL_WAV[0], COL_WAV[1], COL_WAV[2]);
  strokeWeight(1.2);
  drawingContext.setLineDash([4, 4]);
  line(px(b + 0.5), SIG_TOP, px(b + 0.5), bottom);
  drawingContext.setLineDash([]);
  // psi((t - b)/a), peak scaled to 85 % of the plot's half-height
  strokeWeight(2.5);
  noFill();
  beginShape();
  const halfWidth = wv.support * a;
  for (let xx = Math.max(plotL, px(b - halfWidth)); xx <= Math.min(plotR, px(b + halfWidth + 1)); xx += 0.5) {
    const n = (xx - plotL) / (plotR - plotL) * N;
    vertex(xx, pySig(0.85 * sig.yRange * psiValue(wavKey, (n - b) / a), bottom));
  }
  endShape();
  stopClip();
  drawLegend(plotL + 1, SIG_TOP + 1, [
    { col: COL_SIG, label: 'x(t) ' + SIGNALS[sigKey].label },
    { col: COL_WAV, label: 'ψ((t − b)/a), peak scaled' , short: 'ψ((t − b)/a)' }
  ]);

  drawScalogram(k, b);

  // read-outs
  const row = cwtCache.W[k];
  let bestB = 0;
  for (let i = 1; i < N; i++) if (Math.abs(row[i]) > Math.abs(row[bestB])) bestB = i;
  const f = freqOf(k);
  cwtRead = { k, a, f, b, t: b / FS, W: row[b], rowMax: Math.abs(row[bestB]), rowMaxT: bestB / FS, maxAbs: cwtCache.maxAbs };
  noStroke();
  fill(30);
  fitText([
    'Scale a = ' + fmtScale(a) + ' samples (' + (a / FS * 1000).toFixed(1) + ' ms)  →  pseudo-frequency f = f_c·f_s/a = ' + f.toFixed(1) + ' Hz',
    'Scale a = ' + fmtScale(a) + ' samples  →  f = f_c·f_s/a = ' + f.toFixed(1) + ' Hz',
    'a = ' + fmtScale(a) + '  →  f = ' + f.toFixed(1) + ' Hz'
  ], margin, CWT.read1, canvasWidth - 2 * margin, 15, LEFT);
  fill(COL_WAV[0] * 0.75, COL_WAV[1] * 0.75, 0);
  fitText([
    'At b = ' + (b / FS).toFixed(3) + ' s: W(a, b) = ' + fmtSigned(row[b]) + '   ·   largest |W| in this row: ' + Math.abs(row[bestB]).toFixed(2) + ' at t = ' + (bestB / FS).toFixed(3) + ' s',
    'W(a, b) = ' + fmtSigned(row[b]) + '  ·  row max |W| = ' + Math.abs(row[bestB]).toFixed(2) + ' at ' + (bestB / FS).toFixed(3) + ' s',
    'W = ' + fmtSigned(row[b]) + ', row max ' + Math.abs(row[bestB]).toFixed(2) + ' @ ' + (bestB / FS).toFixed(2) + ' s'
  ], margin, CWT.read2, canvasWidth - 2 * margin, 15, LEFT);
}

function drawScalogram(k, b) {
  const top = CWT.top, bot = CWT.bottom, rh = (bot - top) / N_SCALES;

  // header: title and color bar
  const barW = narrow ? 60 : 120;
  textSize(14);
  const maxLabel = useDB ? (narrow ? '0 dB' : '0 dB = ' + cwtCache.maxAbs.toFixed(2))
                         : 'max ' + cwtCache.maxAbs.toFixed(2);
  const minLabel = useDB ? '−' + DB_RANGE + ' dB' : '0';
  const xEnd = plotR - advW(maxLabel) - 6;
  const xBar = xEnd - barW;
  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(['Scalogram |W(a, b)|', '|W(a, b)|'], plotL, CWT.headY, xBar - advW(minLabel) - 14 - plotL, 15, LEFT);
  textStyle(NORMAL);
  textSize(14);
  for (let i = 0; i < barW; i++) {
    const c = viridis(i / (barW - 1));
    stroke(c[0], c[1], c[2]);
    line(xBar + i, CWT.headY - 6, xBar + i, CWT.headY + 6);
  }
  noStroke();
  fill(40);
  textAlign(RIGHT, CENTER);
  text(minLabel, xBar - 5, CWT.headY);
  textAlign(LEFT, CENTER);
  text(maxLabel, xEnd + 6, CWT.headY);

  // image (one pixel per sample and scale), drawn without smoothing so the 32 rows stay crisp
  drawingContext.imageSmoothingEnabled = false;
  image(cwtCache.img, plotL, top, plotR - plotL, bot - top);
  drawingContext.imageSmoothingEnabled = true;
  noFill();
  stroke(150);
  strokeWeight(1);
  rect(plotL, top, plotR - plotL, bot - top);

  // selected row and the (b, a) marker
  const yk = top + k * rh;
  strokeWeight(3);
  stroke(0);
  rect(plotL, yk, plotR - plotL, rh);
  strokeWeight(1.5);
  stroke(255);
  rect(plotL, yk, plotR - plotL, rh);
  fill(255);
  stroke(0);
  strokeWeight(1.5);
  circle(px(b + 0.5), yk + rh / 2, 11);

  // axes: pseudo-frequency on the left, scale on the right, time below
  noStroke();
  fill(60);
  textSize(14);
  for (const f of [4, 8, 16, 32, 64]) {
    const kk = (N_SCALES - 1) * Math.log(F_TOP / f) / Math.log(F_TOP / F_BOTTOM);
    const y = top + (kk + 0.5) * rh;
    stroke(110);
    line(plotL - 4, y, plotL, y);
    line(plotR, y, plotR + 4, y);
    noStroke();
    textAlign(RIGHT, CENTER);
    text(f, plotL - 6, y);
    textAlign(LEFT, CENTER);
    text(fmtScale(WAVELETS[wavKey].fc * FS / f), plotR + 6, y);
  }
  rotatedLabel('f (Hz)', 12, (top + bot) / 2);
  rotatedLabel('scale a', canvasWidth - 8, (top + bot) / 2);
  drawTimeTicks(bot);
}

// ---------------------------------------------------------------- DWT view

function drawDWTView() {
  plotL = 88;                           // room for the row labels and their frequency bands
  plotR = canvasWidth - 16;
  ensureDWT();
  const L = Number(levelSlider.value());
  const T = Number(thresholdSlider.value());
  const { approx, detail } = dwtCache;
  const rec = haarReconstruct(approx, detail, L, T);

  // counts and errors
  let keptA = 0, keptD = 0;
  for (const v of approx[L]) if (Math.abs(v) > 1e-12) keptA++;
  for (let j = 1; j <= L; j++) for (const v of detail[j]) if (Math.abs(v) > Math.max(T, 1e-12)) keptD++;
  const mse = meanSquaredError(rec, sig.x);
  dwtRead = { L, T, keptA, keptD, kept: keptA + keptD, mse,
              mseClean: sig.noisy ? meanSquaredError(rec, sig.clean) : null,
              noiseMse: sig.noisy ? meanSquaredError(sig.x, sig.clean) : null };

  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(['Wavelet Explorer: Haar Discrete Wavelet Transform', 'Wavelet Explorer: Haar DWT', 'Haar DWT'], canvasWidth / 2, TITLE_Y, canvasWidth - 20, 20, CENTER);
  textStyle(NORMAL);
  fill(60);
  fitText(['Haar step:  a[k] = (x[2k] + x[2k+1])/√2,   d[k] = (x[2k] − x[2k+1])/√2',
           'a[k] = (x[2k] + x[2k+1])/√2,  d[k] = (x[2k] − x[2k+1])/√2',
           'a = (even + odd)/√2, d = (even − odd)/√2'], margin, INFO_Y, canvasWidth - 2 * margin, 15, LEFT);

  // input, clean (noisy sine only) and reconstruction
  const bottom = DWT.sigBottom;
  drawSignalFrame(bottom, false);
  startClip(plotL, SIG_TOP, plotR - plotL, bottom - SIG_TOP);
  // the wide reconstruction goes underneath so the thin input stays visible when they coincide
  drawTrace(rec, bottom, COL_REC, 3.5);
  if (sig.noisy) {
    drawingContext.setLineDash([6, 5]);
    drawTrace(sig.clean, bottom, COL_CLEAN, 1.5);
    drawingContext.setLineDash([]);
  }
  drawTrace(sig.x, bottom, COL_SIG, 1.3);
  stopClip();
  const items = [{ col: COL_SIG, label: 'x input' }, { col: COL_REC, label: 'reconstruction', short: 'rec.' }];
  if (sig.noisy) items.push({ col: COL_CLEAN, label: 'clean sine', dash: true });
  drawLegend(plotL + 1, SIG_TOP + 1, items);

  // read-outs
  noStroke();
  fill(30);
  const mseTxt = fmtMSE(mse);
  fitText([
    'Nonzero coefficients kept: ' + dwtRead.kept + ' of ' + N + ' (' + keptA + ' approximation + ' + keptD + ' detail)   ·   MSE(reconstruction, x) = ' + mseTxt,
    'Kept ' + dwtRead.kept + ' of ' + N + ' coefficients  ·  MSE vs x = ' + mseTxt,
    'Kept ' + dwtRead.kept + '/' + N + ' · MSE ' + mseTxt
  ], margin, DWT.read1, canvasWidth - 2 * margin, 15, LEFT);
  if (sig.noisy) {
    fill(COL_REC[0], COL_REC[1], COL_REC[2]);
    fitText([
      'Error against the clean sine: noisy input MSE = ' + dwtRead.noiseMse.toFixed(4) + '   →   reconstruction MSE = ' + dwtRead.mseClean.toFixed(4),
      'vs clean sine: input ' + dwtRead.noiseMse.toFixed(4) + ' → reconstruction ' + dwtRead.mseClean.toFixed(4),
      'vs clean: ' + dwtRead.noiseMse.toFixed(4) + ' → ' + dwtRead.mseClean.toFixed(4)
    ], margin, DWT.read2, canvasWidth - 2 * margin, 15, LEFT);
  } else {
    fill(80);
    fitText([
      'Hard threshold: detail coefficients with |d| ≤ T become 0 (gray bars); the approximation a_L is always kept.',
      'Details with |d| ≤ T are set to 0 (gray bars).',
      '|d| ≤ T → 0 (gray)'
    ], margin, DWT.read2, canvasWidth - 2 * margin, 15, LEFT);
  }

  drawCoefficientRows(L, T);
}

function drawCoefficientRows(L, T) {
  const { approx, detail, dScale } = dwtCache;
  const nRows = L + 1;
  const rh = (DWT.bottom - DWT.top) / nRows;
  let aScale = 0;
  for (const v of approx[L]) aScale = Math.max(aScale, Math.abs(v));
  aScale = Math.max(0.5, aScale * 1.08);

  for (let r = 0; r < nRows; r++) {
    const top = DWT.top + r * rh + 2, h = rh - 4, mid = top + h / 2;
    const isApprox = r === L;
    const j = isApprox ? L : r + 1;
    const coeffs = isApprox ? approx[L] : detail[j];
    const S = isApprox ? aScale : dScale;
    const span = Math.pow(2, j);          // samples covered by one coefficient

    fill(255);
    stroke(200);
    strokeWeight(1);
    rect(plotL, top, plotR - plotL, h);

    // threshold band on detail rows
    if (!isApprox && T > 0) {
      const th = Math.min(h / 2, T / S * (h / 2));
      noStroke();
      fill(COL_THR[0], COL_THR[1], COL_THR[2], 30);
      rect(plotL, mid - th, plotR - plotL, 2 * th);
      if (T < S) {
        stroke(COL_THR[0], COL_THR[1], COL_THR[2]);
        strokeWeight(1);
        drawingContext.setLineDash([5, 4]);
        line(plotL, mid - th, plotR, mid - th);
        line(plotL, mid + th, plotR, mid + th);
        drawingContext.setLineDash([]);
      }
    }
    stroke(150);
    strokeWeight(1);
    line(plotL, mid, plotR, mid);

    // bars: one per coefficient, as wide as the samples it covers
    noStroke();
    for (let i = 0; i < coeffs.length; i++) {
      const v = coeffs[i];
      const kept = isApprox || Math.abs(v) > T;
      const c = isApprox ? COL_APPROX : (kept ? COL_KEEP : COL_ZERO);
      fill(c[0], c[1], c[2]);
      const x0 = px(i * span), x1 = px((i + 1) * span);
      const gap = (x1 - x0) > 4 ? 1 : 0;
      const yv = constrain(v / S, -1, 1) * (h / 2);
      rect(x0 + gap / 2, Math.min(mid, mid - yv), Math.max(1, x1 - x0 - gap), Math.max(1, Math.abs(yv)));
    }

    // row label and the nominal frequency band of the row
    noStroke();
    if (isApprox) fill(COL_APPROX[0], COL_APPROX[1], COL_APPROX[2]);
    else fill(30);
    textStyle(BOLD);
    richText((isApprox ? 'a_' : 'd_') + j, plotL - 8, mid - 7, 15, RIGHT);
    textStyle(NORMAL);
    const fLo = isApprox ? 0 : FS / Math.pow(2, j + 1), fHi = FS / Math.pow(2, isApprox ? j + 1 : j);
    fill(80);
    textSize(13);
    textAlign(RIGHT, CENTER);
    text(fLo + '–' + fHi + ' Hz', plotL - 6, mid + 9);
  }
  drawTimeTicks(DWT.bottom);
}

// ---------------------------------------------------------------- shared drawing helpers

function drawSignalFrame(bottom) {
  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(plotL, SIG_TOP, plotR - plotL, bottom - SIG_TOP);
  stroke(235);
  for (let t = 0.1; t < 1; t += 0.1) line(px(t * N), SIG_TOP, px(t * N), bottom);
  stroke(150);
  line(plotL, pySig(0, bottom), plotR, pySig(0, bottom));
  noStroke();
  fill(60);
  textSize(14);
  textAlign(RIGHT, CENTER);
  const R = sig.yRange;
  const step = R > 2.6 ? 2 : (R >= 1.5 ? 1 : 0.5);
  for (let v = -Math.floor(R / step) * step; v <= R + 1e-9; v += step) {
    if (Math.abs(v) > R - 0.05 && Math.abs(v) > 0) continue;
    text(fmtTick(v), plotL - 6, pySig(v, bottom));
  }
  rotatedLabel('x', plotL - 38, (SIG_TOP + bottom) / 2);
  drawTimeTicks(bottom);
}

function drawTimeTicks(bottom) {
  noStroke();
  fill(60);
  textSize(14);
  const unit = 't (s)';
  const uw = advW(unit);
  textAlign(RIGHT, TOP);
  text(unit, plotR, bottom + 3);
  textAlign(CENTER, TOP);
  const step = (plotR - plotL) > 420 ? 0.1 : 0.2;
  for (let t = 0; t <= 1.0001; t += step) {
    const x = px(t * N);
    if (x + 14 > plotR - uw - 6) continue;
    stroke(110);
    line(x, bottom, x, bottom + 3);
    noStroke();
    text(fmtTick(Math.round(t * 10) / 10), x, bottom + 4);
  }
}

function drawTrace(arr, bottom, col, weight) {
  noFill();
  stroke(col[0], col[1], col[2]);
  strokeWeight(weight);
  beginShape();
  for (let n = 0; n < N; n++) vertex(px(n), pySig(arr[n], bottom));
  endShape();
}

function drawLegend(x, y, items) {
  textSize(14);
  const widthOf = list => list.reduce((w, it) => w + 26 + advW(it.label) + 12, 8);
  if (widthOf(items) > plotR - plotL - 8) items = items.map(it => ({ ...it, label: it.short || it.label.split(' ')[0] }));
  const w = widthOf(items);
  noStroke();
  fill(255, 255, 255, 225);
  rect(x, y, w, 19);
  let cx = x + 8;
  const cy = y + 10;
  for (const it of items) {
    stroke(it.col[0], it.col[1], it.col[2]);
    strokeWeight(2.5);
    if (it.dash) { line(cx, cy, cx + 7, cy); line(cx + 12, cy, cx + 20, cy); }
    else line(cx, cy, cx + 20, cy);
    noStroke();
    fill(it.col[0], it.col[1], it.col[2]);
    textAlign(LEFT, CENTER);
    text(it.label, cx + 26, cy);
    cx += 26 + advW(it.label) + 12;
  }
}

function rotatedLabel(s, x, y) {
  push();
  translate(x, y);
  rotate(-HALF_PI);
  noStroke();
  fill(40);
  textSize(14);
  textAlign(CENTER, CENTER);
  text(s, 0, 0);
  pop();
}

// ---------------------------------------------------------------- pointer: pick (b, a) on the plots

function mousePressed() { pickPoint(); }
function mouseDragged() { pickPoint(); }

function pickPoint() {
  if (mode !== 'cwt' || mouseX < plotL || mouseX > plotR) return;
  if (mouseY >= CWT.top && mouseY < CWT.bottom) {
    const k = constrain(Math.floor((mouseY - CWT.top) / ((CWT.bottom - CWT.top) / N_SCALES)), 0, N_SCALES - 1);
    scaleSlider.value(k);
    positionSlider.value(sampleAt(mouseX));
  } else if (mouseY >= SIG_TOP && mouseY <= CWT.sigBottom) {
    positionSlider.value(sampleAt(mouseX));
  }
}

// ---------------------------------------------------------------- text helpers

// Rich text: "f_c" draws the character after '_' as a subscript
function parseRich(s) {
  const out = [];
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '_' && i + 1 < s.length) {
      if (buf) { out.push({ t: buf, sub: false }); buf = ''; }
      out.push({ t: s[i + 1], sub: true });
      i++;
    } else {
      buf += s[i];
    }
  }
  if (buf) out.push({ t: buf, sub: false });
  return out;
}

// advance width: in p5 2.x textWidth() measures tight bounds and ignores spaces,
// so runs of text placed side by side must use fontWidth()
function advW(s) {
  return typeof fontWidth === 'function' ? fontWidth(s) : textWidth(s);
}

function richWidth(s, sz) {
  let w = 0;
  for (const p of parseRich(s)) {
    textSize(p.sub ? sz * 0.72 : sz);
    w += advW(p.t);
  }
  textSize(sz);
  return w;
}

// y is the vertical centre of the line
function richText(s, x, y, sz, align) {
  const w = richWidth(s, sz);
  let cx = align === CENTER ? x - w / 2 : (align === RIGHT ? x - w : x);
  textAlign(LEFT, CENTER);
  for (const p of parseRich(s)) {
    textSize(p.sub ? sz * 0.72 : sz);
    text(p.t, cx, p.sub ? y + sz * 0.3 : y);
    cx += advW(p.t);
  }
  textSize(sz);
  return w;
}

// draw the first candidate that fits in maxW (the last one otherwise)
function fitText(cands, x, y, maxW, sz, align) {
  for (const c of cands) {
    if (richWidth(c, sz) <= maxW) return richText(c, x, y, sz, align);
  }
  return richText(cands[cands.length - 1], x, y, sz, align);
}

function fmtScale(a) { return a >= 10 ? a.toFixed(1) : a.toFixed(2); }
function fmtSigned(v) {
  if (Math.abs(v) < 0.005) return '0.00';
  return (v < 0 ? '−' : '+') + Math.abs(v).toFixed(2);
}
function fmtTick(v) { return (v < 0 ? '−' : '') + Math.abs(v); }
function fmtMSE(m) {
  if (m < 1e-12) return '0 (perfect reconstruction)';
  return m < 0.0001 ? m.toExponential(1) : m.toFixed(4);
}

// ---------------------------------------------------------------- responsive layout

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  const old = canvasWidth;
  if (container) canvasWidth = container.offsetWidth;
  if (typeof modeSelect === 'undefined') computeLayout();
  else if (old !== canvasWidth) layoutControls();
}
