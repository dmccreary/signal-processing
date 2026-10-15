// Noise Analysis and Reduction Tool MicroSim
// CANVAS_HEIGHT: 670
// Generates white (Gaussian or uniform), pink (1/f), brown (1/f^2), band-limited and
// impulsive noise; estimates its histogram, autocorrelation and Welch power spectral
// density; and measures how ensemble averaging and a moving-average or median filter
// change the SNR of a 5 Hz sinusoid buried in that noise. All signals are computed in
// the sketch with a seeded random-number generator (no audio library is needed).

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
const canvasHeight = 670;
let controlHeight = 150;             // 196 on narrow screens, where labels sit above the controls
let drawHeight = canvasHeight - controlHeight;
let margin = 15;
let defaultTextSize = 16;
let compact = false;
let layoutWidth = -1;

// ---- model constants ----
const FS = 1000;                     // sample rate (Hz)
const F0 = 5;                        // frequency of the test sinusoid (Hz)
const BROWN_A = 0.999;               // pole of the leaky integrator that makes brown noise
const BAND_B = 50;                   // band-limited noise: edge of the ideal low-pass filter (Hz)
const IMP_P = 0.05;                  // impulsive noise: probability of an impulse in each sample
const IMP_BG = 0.1;                  // impulsive noise: share of the power in the Gaussian background
const MAX_LAG = 100;                 // autocorrelation lags shown (samples)
const TIME_SHOW = 1024;              // the time panel shows at most the first 1.024 s
const HIST_BINS = 61;
const PSD_TOP = 20, PSD_BOTTOM = -90;       // PSD axis, dB re 1 unit^2/Hz
const F_MIN = 0.1, F_MAX = 500;             // PSD axis, Hz
const SLOPE_BAND = [1, 100];                // PSD slope fit band (Hz)
const SLOPE_BAND_BL = [1, 30];              // band-limited noise: fit only inside the pass band

// Paul Kellet's "refined" pink-noise filter: six one-pole low-pass filters in parallel
// plus a direct path, fed by white Gaussian noise (accurate 1/f shape above ~0.2 Hz here)
const PINK_P = [0.99886, 0.99332, 0.96900, 0.86650, 0.55000, -0.7616];
const PINK_C = [0.0555179, 0.0750759, 0.1538520, 0.3104856, 0.5329522, -0.0168980];
const PINK_D0 = 0.5362, PINK_D1 = 0.115926;
const PINK_BURN = 8000;              // samples run before the record so the filter is in steady state
let pinkGain = 1;                    // sum of h^2 (output variance for unit white input)
let pinkAcf = null;                  // theoretical normalised autocorrelation of pink noise

const NOISE_TYPES = [
  ['White Gaussian', 'white'],
  ['White uniform', 'uniform'],
  ['Pink (1/f)', 'pink'],
  ['Brown (1/f²)', 'brown'],
  ['Band-limited (0–50 Hz)', 'band'],
  ['Impulsive (5% spikes)', 'impulse']
];
const N_CHOICES = [256, 512, 1024, 2048, 4096, 8192];

// ---- colours ----
const C_IN = '#1f5fbf';              // input signal / input noise (blue)
const C_SIG = '#111111';             // clean sinusoid
const C_OUT = '#e06c00';             // output after averaging and filtering (orange)
const C_PSD = '#800000';             // input spectrum (maroon)
const C_THEORY = '#555555';          // theory curves (dashed)
const C_FIT = '#c99700';             // fitted PSD slope (gold)

// ---- controls ----
let noiseSelect, nSelect, newButton, sigmaSlider, welchSlider;
let signalCheckbox, snrSlider, ensSlider, filterSelect, lenSlider;
let ctl = {};                        // label positions, filled by layoutControls()

// ---- state ----
let realizationSeed = 3;             // "New noise" adds 1; every value of the seed is reproducible
let analysis = null;                 // everything computed from the current settings
let analysisKey = '';
let needsRedraw = true;
let noiseCache = { id: '', reals: [] };

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);
  precomputePink();
  createControls();
  layoutControls(true);
  describe('Noise analysis tool with four plots: the noisy time series with the clean 5 Hz sinusoid and the ' +
    'averaged output, a histogram with a Gaussian fit, the autocorrelation, and a log-log Welch power spectral ' +
    'density with a fitted slope. A banner reports input SNR, the SNR gain of ensemble averaging and of a ' +
    'moving-average or median filter, and the output SNR. Controls choose the noise type, sample count, noise ' +
    'level, Welch segments, input SNR, number of averaged realizations and filter length.');
}

function draw() {
  updateCanvasSize();
  const p = readParams();
  const id = JSON.stringify(p);
  if (id !== analysisKey) {
    analysis = computeAnalysis(p);
    analysisKey = id;
    needsRedraw = true;
  }
  if (!needsRedraw) return;          // the plots only change when a control changes
  needsRedraw = false;

  drawRegions();
  drawTitle();
  drawBanner();
  const P = panelLayout();
  drawTimePanel(P[0]);
  drawHistPanel(P[1]);
  drawAcfPanel(P[2]);
  drawPsdPanel(P[3]);
  drawControlLabels();
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function createControls() {
  noiseSelect = createSelect();
  for (const [label, v] of NOISE_TYPES) noiseSelect.option(label, v);
  noiseSelect.selected('white');

  nSelect = createSelect();
  for (const n of N_CHOICES) nSelect.option(String(n), String(n));
  nSelect.selected('4096');

  newButton = createButton('New noise');
  newButton.mousePressed(() => { realizationSeed++; });

  sigmaSlider = createSlider(0.1, 2, 1, 0.1);
  welchSlider = createSlider(1, 32, 8, 1);

  signalCheckbox = createCheckbox(' Add 5 Hz sinusoid', true);

  snrSlider = createSlider(-20, 30, 0, 1);
  ensSlider = createSlider(1, 64, 1, 1);

  filterSelect = createSelect();
  filterSelect.option('Moving avg', 'ma');
  filterSelect.option('Median', 'median');
  filterSelect.selected('ma');

  lenSlider = createSlider(1, 64, 8, 1);
}

function readParams() {
  return {
    type: noiseSelect.value(),
    N: parseInt(nSelect.value(), 10),
    sigma: Math.round(Number(sigmaSlider.value()) * 10) / 10,
    S: Number(welchSlider.value()),
    signal: signalCheckbox.checked(),
    snr: Number(snrSlider.value()),
    K: Number(ensSlider.value()),
    filt: filterSelect.value(),
    L: Number(lenSlider.value()),
    seed: realizationSeed
  };
}

// Two columns of four rows. Wide screens: label to the left of each control.
// Narrow screens: label above each control.
function layoutControls(force) {
  if (typeof lenSlider === 'undefined') return;
  if (!force && layoutWidth === canvasWidth) return;
  layoutWidth = canvasWidth;

  const colW = (canvasWidth - 2 * margin) / 2;
  const x0 = margin, x1 = margin + colW + 8;
  const cw = colW - 8;
  const fs = compact ? 13 : 15;
  for (const s of [noiseSelect, nSelect, filterSelect, newButton]) s.style('font-size', fs + 'px');
  signalCheckbox.style('font-size', (compact ? 14 : 16) + 'px');

  if (!compact) {
    const lw = 180;                                   // label column width
    const rowY = r => drawHeight + 10 + r * 34;
    ctl = { compact: false, size: 16, rows: [0, 1, 2, 3].map(r => rowY(r) + 11), x0, x1, lw };
    noiseSelect.position(x0 + 95, rowY(0));
    noiseSelect.style('width', Math.min(230, cw - 100) + 'px');
    nSelect.position(x1 + 95, rowY(0));
    nSelect.style('width', '80px');
    newButton.position(x1 + 190, rowY(0));
    sigmaSlider.position(x0 + lw, rowY(1) + 2);
    sigmaSlider.size(cw - lw - 6);
    welchSlider.position(x1 + lw, rowY(1) + 2);
    welchSlider.size(cw - lw - 6);
    signalCheckbox.position(x0, rowY(2) + 1);
    snrSlider.position(x1 + lw, rowY(2) + 2);
    snrSlider.size(cw - lw - 6);
    ensSlider.position(x0 + lw, rowY(3) + 2);
    ensSlider.size(cw - lw - 6);
    filterSelect.position(x1, rowY(3));
    filterSelect.style('width', '112px');
    ctl.lenLabelX = x1 + 122;
    lenSlider.position(x1 + 196, rowY(3) + 2);
    lenSlider.size(cw - 196 - 6);
  } else {
    const rowY = r => drawHeight + 6 + r * 47;
    ctl = { compact: true, size: 14, rows: [0, 1, 2, 3].map(r => rowY(r) + 8), x0, x1 };
    noiseSelect.position(x0, rowY(0) + 18);
    noiseSelect.style('width', (cw - 4) + 'px');
    nSelect.position(x1, rowY(0) + 18);
    nSelect.style('width', '70px');
    newButton.position(x1 + 76, rowY(0) + 18);
    sigmaSlider.position(x0, rowY(1) + 20);
    sigmaSlider.size(cw - 6);
    welchSlider.position(x1, rowY(1) + 20);
    welchSlider.size(cw - 6);
    signalCheckbox.position(x0, rowY(2) + 14);
    snrSlider.position(x1, rowY(2) + 20);
    snrSlider.size(cw - 6);
    ensSlider.position(x0, rowY(3) + 20);
    ensSlider.size(cw - 6);
    filterSelect.position(x1, rowY(3) - 2);
    filterSelect.style('width', '96px');
    ctl.lenLabelX = x1 + 102;
    lenSlider.position(x1, rowY(3) + 20);
    lenSlider.size(cw - 6);
  }
}

function drawControlLabels() {
  const p = analysis.p;
  fill('black');
  noStroke();
  textSize(ctl.size);
  textAlign(LEFT, CENTER);
  const r = ctl.rows;
  text('Noise type', ctl.x0, r[0]);
  text('Samples N', ctl.x1, r[0]);
  text('Noise RMS σ = ' + p.sigma.toFixed(1), ctl.x0, r[1]);
  text('Welch segments S = ' + p.S, ctl.x1, r[1]);
  fill(p.signal ? 'black' : '#999999');
  text('Input SNR = ' + p.snr + ' dB', ctl.x1, r[2]);
  fill('black');
  text('Ensemble avg K = ' + p.K, ctl.x0, r[3]);
  text('L = ' + p.L, ctl.lenLabelX, r[3]);
}

// ---------------------------------------------------------------------------
// Random numbers (seeded, so every realization can be reproduced)
// ---------------------------------------------------------------------------

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller: two independent N(0, 1) values from each pair of uniform values
function gaussFactory(rng) {
  let spare = null;
  return function () {
    if (spare !== null) { const s = spare; spare = null; return s; }
    const u1 = 1 - rng(), u2 = rng();
    const r = Math.sqrt(-2 * Math.log(u1));
    spare = r * Math.sin(2 * Math.PI * u2);
    return r * Math.cos(2 * Math.PI * u2);
  };
}

function seedFor(seed, i) {
  return (Math.imul(seed, 1000003) + Math.imul(i + 1, 7919) + 12345) >>> 0;
}

// ---------------------------------------------------------------------------
// FFT (radix-2, in place). Forward: X[k] = sum x[n] e^{-j 2 pi k n / N}; the inverse divides by N.
// ---------------------------------------------------------------------------

function fftRadix2(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = (inverse ? 2 : -2) * Math.PI / len;
    for (let k = 0; k < half; k++) {
      const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
      for (let i = k; i < n; i += len) {
        const b = i + half;
        const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
        re[b] = re[i] - tr; im[b] = im[i] - ti;
        re[i] += tr; im[i] += ti;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

// ---------------------------------------------------------------------------
// Noise generators. Each returns one realization with zero mean and unit variance
// (in expectation); the sketch multiplies it by sigma.
// ---------------------------------------------------------------------------

function bandKmax(n) { return Math.floor(BAND_B * n / FS); }

function makeUnitNoise(type, n, seedVal) {
  const rng = mulberry32(seedVal);
  const g = gaussFactory(rng);
  const w = new Float64Array(n);
  if (type === 'white') {
    for (let i = 0; i < n; i++) w[i] = g();
  } else if (type === 'uniform') {
    const a = Math.sqrt(3);                       // uniform on [-sqrt3, sqrt3] has variance 1
    for (let i = 0; i < n; i++) w[i] = a * (2 * rng() - 1);
  } else if (type === 'pink') {
    const b = [0, 0, 0, 0, 0, 0];
    let d1 = 0;
    const scale = 1 / Math.sqrt(pinkGain);
    for (let i = -PINK_BURN; i < n; i++) {
      const x = g();
      let y = d1 + PINK_D0 * x;
      for (let j = 0; j < 6; j++) { b[j] = PINK_P[j] * b[j] + PINK_C[j] * x; y += b[j]; }
      d1 = PINK_D1 * x;
      if (i >= 0) w[i] = y * scale;
    }
  } else if (type === 'brown') {
    const c = Math.sqrt(1 - BROWN_A * BROWN_A);
    let y = g() / c;                              // start in the stationary state
    for (let i = 0; i < n; i++) { y = BROWN_A * y + g(); w[i] = y * c; }
  } else if (type === 'band') {
    // ideal low-pass: keep only the DFT bins at or below BAND_B
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = g();
    fftRadix2(re, im, false);
    const kmax = bandKmax(n);
    for (let k = kmax + 1; k < n - kmax; k++) { re[k] = 0; im[k] = 0; }
    fftRadix2(re, im, true);
    const scale = 1 / Math.sqrt((2 * kmax + 1) / n);
    for (let i = 0; i < n; i++) w[i] = re[i] * scale;
  } else {
    // impulsive (Bernoulli-Gaussian): weak Gaussian background plus rare large spikes
    const bg = Math.sqrt(IMP_BG), amp = Math.sqrt((1 - IMP_BG) / IMP_P);
    for (let i = 0; i < n; i++) {
      let v = bg * g();
      if (rng() < IMP_P) v += amp * g();
      w[i] = v;
    }
  }
  return w;
}

function getRealizations(type, n, seed, K) {
  const id = type + '|' + n + '|' + seed;
  if (noiseCache.id !== id) noiseCache = { id: id, reals: [] };
  while (noiseCache.reals.length < K) {
    noiseCache.reals.push(makeUnitNoise(type, n, seedFor(seed, noiseCache.reals.length)));
  }
  return noiseCache.reals.slice(0, K);
}

// Impulse response of the pink filter: its power gain and its autocorrelation
function precomputePink() {
  const len = 40000;
  const h = new Float64Array(len);
  const b = [0, 0, 0, 0, 0, 0];
  let d1 = 0;
  for (let i = 0; i < len; i++) {
    const x = i === 0 ? 1 : 0;
    let y = d1 + PINK_D0 * x;
    for (let j = 0; j < 6; j++) { b[j] = PINK_P[j] * b[j] + PINK_C[j] * x; y += b[j]; }
    d1 = PINK_D1 * x;
    h[i] = y;
  }
  const r = new Float64Array(MAX_LAG + 1);
  for (let m = 0; m <= MAX_LAG; m++) {
    let s = 0;
    for (let i = 0; i + m < len; i++) s += h[i] * h[i + m];
    r[m] = s;
  }
  pinkGain = r[0];
  pinkAcf = r.map(v => v / r[0]);
}

// Squared magnitude of the pink filter at normalised angular frequency om
function pinkH2(om) {
  let re = PINK_D0 + PINK_D1 * Math.cos(om), im = -PINK_D1 * Math.sin(om);
  for (let j = 0; j < 6; j++) {
    // c / (1 - p e^{-j om})
    const dr = 1 - PINK_P[j] * Math.cos(om), di = PINK_P[j] * Math.sin(om);
    const den = dr * dr + di * di;
    re += PINK_C[j] * dr / den;
    im += -PINK_C[j] * di / den;
  }
  return re * re + im * im;
}

// One-sided theoretical PSD (unit^2/Hz) of the input noise at frequency f
function theoryPsd(type, f, sigma, n) {
  const white = 2 * sigma * sigma / FS;
  const om = 2 * Math.PI * f / FS;
  if (type === 'pink') return white * pinkH2(om) / pinkGain;
  if (type === 'brown') return white * (1 - BROWN_A * BROWN_A) / (1 - 2 * BROWN_A * Math.cos(om) + BROWN_A * BROWN_A);
  if (type === 'band') {
    const kmax = bandKmax(n);
    return f <= kmax * FS / n + 1e-9 ? white * n / (2 * kmax + 1) : 0;
  }
  return white;
}

// Theoretical normalised autocorrelation of the input noise at lag m
function theoryAcf(type, m, n) {
  if (m === 0) return 1;
  if (type === 'pink') return pinkAcf[m];
  if (type === 'brown') return Math.pow(BROWN_A, m);
  if (type === 'band') {
    const q = 2 * bandKmax(n) + 1;
    return Math.sin(q * Math.PI * m / n) / (q * Math.sin(Math.PI * m / n));
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Estimators and filters
// ---------------------------------------------------------------------------

function sampleMoments(a) {
  const n = a.length;
  let s = 0, ss = 0;
  for (let i = 0; i < n; i++) { s += a[i]; ss += a[i] * a[i]; }
  const mean = s / n;
  let m2 = 0, m4 = 0;
  for (let i = 0; i < n; i++) { const d = a[i] - mean; const d2 = d * d; m2 += d2; m4 += d2 * d2; }
  m2 /= n; m4 /= n;
  return { mean: mean, variance: m2, meanSquare: ss / n, kurtosis: m2 > 0 ? m4 / (m2 * m2) - 3 : 0 };
}

// Biased autocorrelation estimate with the mean removed, normalised so rho[0] = 1
function autocorr(a, maxLag) {
  const n = a.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += a[i];
  mean /= n;
  const d = new Float64Array(n);
  for (let i = 0; i < n; i++) d[i] = a[i] - mean;
  const rho = new Float64Array(maxLag + 1);
  let c0 = 0;
  for (let i = 0; i < n; i++) c0 += d[i] * d[i];
  for (let m = 0; m <= maxLag; m++) {
    let c = 0;
    for (let i = 0; i + m < n; i++) c += d[i] * d[i + m];
    rho[m] = c0 > 0 ? c / c0 : 0;
  }
  return rho;
}

function densityHistogram(a, lo, hi, bins) {
  const counts = new Float64Array(bins);
  const bw = (hi - lo) / bins;
  let outside = 0;
  for (let i = 0; i < a.length; i++) {
    const k = Math.floor((a[i] - lo) / bw);
    if (k >= 0 && k < bins) counts[k]++; else outside++;
  }
  for (let k = 0; k < bins; k++) counts[k] /= a.length * bw;
  return { density: counts, outside: outside / a.length };
}

// Welch PSD: S Hann-windowed segments of length M (a power of two), spread evenly over
// the record with at least 50% overlap allowed; segment means are removed. One-sided, unit^2/Hz.
function welchPsd(x, S, forcedM) {
  const n = x.length;
  let M;
  if (forcedM) M = forcedM;
  else { M = 16; while ((S + 1) * M <= n) M *= 2; }
  while (M > n) M /= 2;
  const win = new Float64Array(M);
  let U = 0;
  for (let i = 0; i < M; i++) { win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / M); U += win[i] * win[i]; }
  const half = M / 2;
  const acc = new Float64Array(half + 1);
  const re = new Float64Array(M), im = new Float64Array(M);
  for (let s = 0; s < S; s++) {
    const start = S === 1 ? 0 : Math.round(s * (n - M) / (S - 1));
    let mu = 0;
    for (let i = 0; i < M; i++) mu += x[start + i];
    mu /= M;
    for (let i = 0; i < M; i++) { re[i] = (x[start + i] - mu) * win[i]; im[i] = 0; }
    fftRadix2(re, im, false);
    for (let k = 0; k <= half; k++) acc[k] += re[k] * re[k] + im[k] * im[k];
  }
  const psd = new Float64Array(half + 1);
  for (let k = 0; k <= half; k++) psd[k] = acc[k] / S / (FS * U) * (k === 0 || k === half ? 1 : 2);
  const hop = S === 1 ? M : (n - M) / (S - 1);
  return { psd: psd, M: M, df: FS / M, overlap: Math.max(0, 1 - hop / M) };
}

// Weighted least-squares line through 10 log10 PSD versus log10 f. Each bin is weighted by 1/k so
// every decade counts equally; bins k < 3 are skipped because the Hann main lobe smears DC into them.
function fitSlope(W, lo, hi) {
  let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0, cnt = 0, fLo = Infinity, fHi = 0;
  for (let k = 3; k < W.psd.length - 1; k++) {
    const f = k * W.df;
    if (f < lo || f > hi || !(W.psd[k] > 0)) continue;
    const xx = Math.log10(f), yy = 10 * Math.log10(W.psd[k]), wt = 1 / k;
    sw += wt; sx += wt * xx; sy += wt * yy; sxx += wt * xx * xx; sxy += wt * xx * yy;
    cnt++; fLo = Math.min(fLo, f); fHi = Math.max(fHi, f);
  }
  if (cnt < 3) return null;
  const slope = (sw * sxy - sx * sy) / (sw * sxx - sx * sx);
  return { slope: slope, icpt: (sy - slope * sx) / sw, fLo: fLo, fHi: fHi, count: cnt };
}

// Centred moving average over the samples where the whole window fits. Output j is the
// mean of z[j .. j+L-1], centred on time (j + (L-1)/2) / FS.
function movingAverageValid(z, L) {
  const nOut = z.length - L + 1;
  const y = new Float64Array(nOut);
  let sum = 0;
  for (let i = 0; i < L; i++) sum += z[i];
  y[0] = sum / L;
  for (let j = 1; j < nOut; j++) { sum += z[j + L - 1] - z[j - 1]; y[j] = sum / L; }
  return y;
}

function lowerBound(arr, v) {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < v) lo = mid + 1; else hi = mid; }
  return lo;
}

// Centred running median over the same windows as the moving average
function medianValid(z, L) {
  const nOut = z.length - L + 1;
  const y = new Float64Array(nOut);
  const win = Array.from(z.subarray(0, L)).sort((a, b) => a - b);
  const med = () => (L % 2 ? win[(L - 1) / 2] : 0.5 * (win[L / 2 - 1] + win[L / 2]));
  y[0] = med();
  for (let j = 1; j < nOut; j++) {
    win.splice(lowerBound(win, z[j - 1]), 1);
    const v = z[j + L - 1];
    win.splice(lowerBound(win, v), 0, v);
    y[j] = med();
  }
  return y;
}

// ---------------------------------------------------------------------------
// The whole analysis for one set of control values
// ---------------------------------------------------------------------------

function computeAnalysis(p) {
  const n = p.N;
  const unit = getRealizations(p.type, n, p.seed, p.K);
  const sig = p.sigma;
  const A = p.signal ? sig * Math.sqrt(2 * Math.pow(10, p.snr / 10)) : 0;
  const sAt = t => A * Math.sin(2 * Math.PI * F0 * t / FS);   // t in samples (may be fractional)

  const s = new Float64Array(n), w = new Float64Array(n), x = new Float64Array(n);
  const v = new Float64Array(n), z = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    s[i] = sAt(i);
    w[i] = sig * unit[0][i];
    x[i] = s[i] + w[i];
    let acc = 0;
    for (let k = 0; k < p.K; k++) acc += unit[k][i];
    v[i] = sig * acc / p.K;              // noise left after ensemble averaging
    z[i] = s[i] + v[i];
  }

  const y = p.filt === 'median' ? medianValid(z, p.L) : movingAverageValid(z, p.L);
  const c0 = (p.L - 1) / 2;              // output j sits at sample time j + c0
  const e = new Float64Array(y.length);  // output noise: output minus the clean signal at the same time
  let sumYS = 0, sumY = 0, sumS = 0, sumYY = 0, sumSS = 0;
  for (let j = 0; j < y.length; j++) {
    const sr = sAt(j + c0);
    e[j] = y[j] - sr;
    sumY += y[j]; sumS += sr; sumYS += y[j] * sr; sumYY += y[j] * y[j]; sumSS += sr * sr;
  }
  const ny = y.length;
  let rhoYS = null;
  if (p.signal) {
    const cov = sumYS / ny - (sumY / ny) * (sumS / ny);
    const vy = sumYY / ny - (sumY / ny) ** 2, vs = sumSS / ny - (sumS / ny) ** 2;
    rhoYS = cov / Math.sqrt(vy * vs);
  }

  const mw = sampleMoments(w);
  const mv = sampleMoments(v);
  const me = sampleMoments(e);
  const Ps = p.signal ? sampleMoments(s).meanSquare : 0;
  const Pw = mw.meanSquare, Pv = mv.meanSquare, Pe = me.meanSquare;
  const processed = p.K > 1 || p.L > 1;

  const nShow = Math.min(n, TIME_SHOW);
  const out = {
    p: p, n: n, nShow: nShow, A: A, s: s, w: w, x: x, y: y, c0: c0, e: e, processed: processed,
    mw: mw, me: me, Ps: Ps, Pw: Pw, Pv: Pv, Pe: Pe, rhoYS: rhoYS,
    snrIn: p.signal ? 10 * Math.log10(Ps / Pw) : null,
    gainEns: 10 * Math.log10(Pw / Pv),
    gainFilt: 10 * Math.log10(Pv / Pe),
    snrOut: p.signal ? 10 * Math.log10(Ps / Pe) : null
  };

  // histogram over mean +/- 4 standard deviations of the input noise
  const sd = Math.sqrt(mw.variance);
  out.hLo = mw.mean - 4 * sd;
  out.hHi = mw.mean + 4 * sd;
  out.histIn = densityHistogram(w, out.hLo, out.hHi, HIST_BINS);
  out.histOut = processed ? densityHistogram(e, out.hLo, out.hHi, HIST_BINS) : null;

  out.acfIn = autocorr(w, MAX_LAG);
  out.acfOut = processed ? autocorr(e, MAX_LAG) : null;

  out.Wx = welchPsd(x, p.S);
  out.Wy = processed ? welchPsd(y, p.S, out.Wx.M) : null;
  const Ww = p.signal ? welchPsd(w, p.S) : out.Wx;
  const band = p.type === 'band' ? SLOPE_BAND_BL : SLOPE_BAND;
  out.fitBand = band;
  out.fit = fitSlope(Ww, band[0], band[1]);

  // the time panel shows the first nShow samples; scale it to what is visible
  let tmax = 0;
  for (let i = 0; i < nShow; i++) tmax = Math.max(tmax, Math.abs(x[i]));
  out.yShow = processed ? y.subarray(0, Math.max(0, Math.min(ny, Math.floor(nShow - c0)))) : null;
  if (out.yShow) for (const v of out.yShow) tmax = Math.max(tmax, Math.abs(v));
  out.timeMax = tmax;
  return out;
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function tw(s) { return typeof fontWidth === 'function' ? fontWidth(s) : textWidth(s); }

function signed(v, d) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d); }
function num(v, d) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(d); }

function niceCeil(v) {
  if (!(v > 0)) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 4, 5, 10]) if (m * e >= v) return m * e;
  return 10 * e;
}

function niceStep(raw) {
  const e = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * e >= raw) return m * e;
  return 10 * e;
}

function setDash(on) { drawingContext.setLineDash(on ? [6, 4] : []); }

function startPlotClip(R) {
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(R.l, R.t, R.r - R.l, R.b - R.t);
  drawingContext.clip();
}

function endPlotClip() { drawingContext.restore(); }

// Polyline for short traces; per-pixel min/max envelope for long ones
function drawTrace(arr, xOf, yOf, col, weight) {
  const n = arr.length;
  stroke(col);
  strokeWeight(weight);
  noFill();
  const pxSpan = Math.abs(xOf(n - 1) - xOf(0));
  if (n <= 2 * pxSpan) {
    beginShape();
    for (let i = 0; i < n; i++) vertex(xOf(i), yOf(arr[i]));
    endShape();
    return;
  }
  let col0 = Math.floor(xOf(0)), mn = arr[0], mx = arr[0];
  for (let i = 1; i < n; i++) {
    const c = Math.floor(xOf(i));
    if (c !== col0) {
      line(col0 + 0.5, yOf(mn), col0 + 0.5, yOf(mx));
      col0 = c;
      mn = Math.min(arr[i], arr[i - 1]);
      mx = Math.max(arr[i], arr[i - 1]);
    } else {
      mn = Math.min(mn, arr[i]);
      mx = Math.max(mx, arr[i]);
    }
  }
  line(col0 + 0.5, yOf(mn), col0 + 0.5, yOf(mx));
}

function panelLayout() {
  const gridTop = compact ? 98 : 88;
  const gap = compact ? 8 : 14;
  const colW = (canvasWidth - 2 * margin - gap) / 2;
  const rowH = (drawHeight - gridTop - 4 - gap) / 2;
  const P = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      P.push({ x: margin + c * (colW + gap), y: gridTop + r * (rowH + gap), w: colW, h: rowH });
    }
  }
  return P;
}

function plotRect(P) {
  const padL = compact ? 34 : 46;
  return { l: P.x + padL, r: P.x + P.w - 6, t: P.y + (compact ? 20 : 24), b: P.y + P.h - (compact ? 30 : 34) };
}

function panelFrame(P, R, title) {
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(P.x, P.y, P.w, P.h, 6);
  fill('#fbfdff');
  stroke('#cccccc');
  rect(R.l, R.t, R.r - R.l, R.b - R.t);
  noStroke();
  fill('black');
  textStyle(BOLD);
  textSize(compact ? 12 : 15);
  textAlign(LEFT, CENTER);
  text(title, P.x + 8, P.y + (compact ? 10 : 12));
  textStyle(NORMAL);
}

function headerRight(P, str, col) {
  noStroke();
  fill(col || 'black');
  textSize(compact ? 11 : 14);
  textAlign(RIGHT, CENTER);
  text(str, P.x + P.w - 8, P.y + (compact ? 10 : 12));
}

function axisTitle(P, R, str) {
  noStroke();
  fill('#333333');
  textSize(compact ? 11 : 14);
  textAlign(CENTER, CENTER);
  text(str, (R.l + R.r) / 2, R.b + (compact ? 22 : 25));
}

function yAxisTitle(P, R, str) {
  push();
  translate(P.x + (compact ? 7 : 9), (R.t + R.b) / 2);
  rotate(-HALF_PI);
  noStroke();
  fill('#333333');
  textSize(compact ? 11 : 13);
  textAlign(CENTER, CENTER);
  text(str, 0, 0);
  pop();
}

function tickLabelSize() { return compact ? 10 : 13; }

// Small legend: rows of [colour, dashed?, label], drawn in a translucent box
function legend(x, y, items, alignRight) {
  textSize(compact ? 10 : 13);
  const lh = compact ? 13 : 17;
  let wmax = 0;
  for (const it of items) wmax = Math.max(wmax, tw(it[2]));
  const bw = wmax + 34, bh = items.length * lh + 6;
  const bx = alignRight ? x - bw : x;
  fill(255, 255, 255, 215);
  stroke('#dddddd');
  strokeWeight(1);
  rect(bx, y, bw, bh, 4);
  items.forEach((it, i) => {
    const yy = y + 3 + lh * i + lh / 2;
    stroke(it[0]);
    strokeWeight(it[3] || 2);
    setDash(it[1]);
    line(bx + 5, yy, bx + 24, yy);
    setDash(false);
    noStroke();
    fill('#222222');
    textAlign(LEFT, CENTER);
    text(it[2], bx + 29, yy);
  });
}

// One-row legend, right-aligned so it ends at xRight, centred vertically on y
function rowLegend(xRight, y, items, boxed) {
  textSize(13);
  const widths = items.map(it => 24 + tw(it[2]));
  const total = widths.reduce((u, v) => u + v, 0) + 12 * (items.length - 1);
  let x = xRight - total;
  if (boxed) {
    fill(255, 255, 255, 215);
    stroke('#dddddd');
    strokeWeight(1);
    rect(x - 6, y - 10, total + 12, 20, 4);
  }
  items.forEach((it, i) => {
    stroke(it[0]);
    strokeWeight(it[3] || 2);
    setDash(it[1]);
    line(x, y, x + 18, y);
    setDash(false);
    noStroke();
    fill('#222222');
    textAlign(LEFT, CENTER);
    text(it[2], x + 23, y);
    x += widths[i] + 12;
  });
}

// ---------------------------------------------------------------------------
// Regions, title and SNR banner
// ---------------------------------------------------------------------------

function drawRegions() {
  noStroke();
  fill('aliceblue');
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);
}

function drawTitle() {
  noStroke();
  fill('black');
  textSize(compact ? 18 : 22);
  textAlign(CENTER, TOP);
  text('Noise Analysis and Reduction Tool', canvasWidth / 2, compact ? 4 : 6);
}

function drawBanner() {
  const a = analysis, p = a.p;
  const top = compact ? 28 : 36;
  const h = compact ? 64 : 44;
  fill('#fffbe6');
  stroke('#d8c27a');
  strokeWeight(1);
  rect(margin, top, canvasWidth - 2 * margin, h, 6);

  const filtName = p.filt === 'median' ? 'Median' : 'Moving avg';
  const thK = 10 * Math.log10(p.K), thL = 10 * Math.log10(p.L);
  const cells = [];
  if (p.signal) cells.push(['Input SNR', num(a.snrIn, 2) + ' dB', C_IN]);
  else cells.push(['Input noise power', a.Pw.toPrecision(3), C_IN]);
  cells.push(['Ensemble avg, K = ' + p.K,
    signed(a.gainEns, 2) + ' dB' + (compact ? '' : '  (10 log K = ' + thK.toFixed(2) + ')'), 'black']);
  if (p.filt === 'median') {
    cells.push([filtName + ', L = ' + p.L, signed(a.gainFilt, 2) + ' dB' + (compact ? '' : '  (nonlinear)'), 'black']);
  } else {
    cells.push([filtName + ', L = ' + p.L,
      signed(a.gainFilt, 2) + ' dB' + (compact ? '' : '  (white: 10 log L = ' + thL.toFixed(2) + ')'), 'black']);
  }
  if (p.signal) {
    cells.push(['Output SNR', num(a.snrOut, 2) + ' dB' + (compact ? '' : ',  ρ(y, s) = ' + a.rhoYS.toFixed(3)), C_OUT]);
  } else {
    cells.push(['Output noise power', a.Pe.toPrecision(3), C_OUT]);
  }

  noStroke();
  if (!compact) {
    const wts = [0.19, 0.25, 0.30, 0.26];
    const gutter = 26;                                  // room for the arrow between cells
    const inner = canvasWidth - 2 * margin - 20 - 3 * gutter;
    let x = margin + 10;
    cells.forEach((c, i) => {
      const cw = inner * wts[i];
      textAlign(LEFT, CENTER);
      textStyle(BOLD);
      textSize(14);
      fill('#333333');
      text(c[0], x, top + 13);
      textStyle(NORMAL);
      fill(c[2]);
      textSize(14);
      text(c[1], x, top + 31);
      x += cw;
      if (i < 3) {
        fill('#8a8a8a');
        textSize(20);
        textAlign(CENTER, CENTER);
        text('→', x + gutter / 2 - 4, top + 21);
        x += gutter;
      }
    });
  } else {
    const cw = (canvasWidth - 2 * margin - 12) / 2;
    cells.forEach((c, i) => {
      const x = margin + 6 + (i % 2) * cw;
      const y = top + 4 + Math.floor(i / 2) * 30;
      textAlign(LEFT, TOP);
      textStyle(BOLD);
      textSize(11);
      fill('#333333');
      text(c[0], x, y);
      textStyle(NORMAL);
      fill(c[2]);
      textSize(12);
      text(c[1], x, y + 13);
    });
  }
}

// ---------------------------------------------------------------------------
// Panel 1: time series
// ---------------------------------------------------------------------------

function drawTimePanel(P) {
  const a = analysis, p = a.p;
  const R = plotRect(P);
  const n = a.nShow;
  let title = 'Time series';
  if (!compact) {
    title += a.n > n ? ' (first ' + (n / FS).toFixed(2) + ' s)' : ' (all ' + (a.n / FS).toFixed(2) + ' s)';
  }
  panelFrame(P, R, title);

  const yMax = niceCeil(a.timeMax * 1.02);
  const xOf = i => R.l + (i / (n - 1)) * (R.r - R.l);
  const yOf = val => R.b - (val + yMax) / (2 * yMax) * (R.b - R.t);

  // grid and ticks
  textSize(tickLabelSize());
  for (const val of [-yMax, -yMax / 2, 0, yMax / 2, yMax]) {
    stroke(val === 0 ? '#999999' : '#e3e3e3');
    strokeWeight(1);
    line(R.l, yOf(val), R.r, yOf(val));
    if (val === -yMax / 2 || val === yMax / 2) continue;
    noStroke();
    fill('#333333');
    textAlign(RIGHT, CENTER);
    text(num(val, val % 1 === 0 ? 0 : 1), R.l - 4, yOf(val));
  }
  const tMax = (n - 1) / FS;
  const step = niceStep(tMax / (compact ? 3 : 5));
  textAlign(CENTER, TOP);
  for (let t = 0; t <= tMax + 1e-9; t += step) {
    const xx = R.l + t / tMax * (R.r - R.l);
    stroke('#999999');
    line(xx, R.b, xx, R.b + 4);
    noStroke();
    fill('#333333');
    text(Number(t.toFixed(3)).toString(), xx, R.b + 5);
  }
  axisTitle(P, R, 'time (s)');
  yAxisTitle(P, R, 'amplitude');

  startPlotClip(R);
  drawTrace(a.x.subarray(0, n), xOf, yOf, p.signal || a.processed ? 'rgba(31,95,191,0.55)' : C_IN, 1);
  if (p.signal) {
    setDash(true);
    stroke(C_SIG);
    strokeWeight(1.5);
    noFill();
    beginShape();
    const steps = Math.min(n, 600);
    for (let k = 0; k <= steps; k++) {
      const i = k * (n - 1) / steps;
      vertex(xOf(i), yOf(a.A * Math.sin(2 * Math.PI * F0 * i / FS)));
    }
    endShape();
    setDash(false);
  }
  if (a.yShow && a.yShow.length > 1) {
    const xOfY = j => xOf(j + a.c0);
    drawTrace(a.yShow, xOfY, yOf, C_OUT, 2);
  }
  endPlotClip();

  const items = [[C_IN, false, p.signal ? 'x = s + w' : 'x = w']];
  if (p.signal) items.push([C_SIG, true, 's', 1.5]);
  if (a.processed) items.push([C_OUT, false, 'y output']);
  if (!compact) rowLegend(P.x + P.w - 8, P.y + 12, items);
}

// ---------------------------------------------------------------------------
// Panel 2: histogram with Gaussian fit
// ---------------------------------------------------------------------------

function drawHistPanel(P) {
  const a = analysis;
  const R = plotRect(P);
  panelFrame(P, R, compact ? 'Histogram' : 'Histogram of noise w[n]');
  headerRight(P, (compact ? 'var ' : 'mean ' + num(a.mw.mean, 3) + '   var ') + a.mw.variance.toFixed(3), C_IN);

  const lo = a.hLo, hi = a.hHi;
  const mu = a.mw.mean, sd = Math.sqrt(a.mw.variance);
  const gauss = u => Math.exp(-0.5 * ((u - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
  let dIn = gauss(mu);
  for (const d of a.histIn.density) dIn = Math.max(dIn, d);
  let dMax = dIn, outPeak = 0;
  // a much narrower output histogram may run off the top (at most 3x the input peak is shown)
  if (a.histOut) for (const d of a.histOut.density) { outPeak = Math.max(outPeak, d); dMax = Math.max(dMax, Math.min(d, 3 * dIn)); }
  dMax *= 1.12;
  const xOf = u => R.l + (u - lo) / (hi - lo) * (R.r - R.l);
  const yOf = d => R.b - d / dMax * (R.b - R.t);

  // x ticks at round values
  textSize(tickLabelSize());
  const xstep = niceStep((hi - lo) / (compact ? 4 : 6));
  for (let u = Math.ceil(lo / xstep) * xstep; u <= hi + 1e-9; u += xstep) {
    stroke('#e3e3e3');
    strokeWeight(1);
    line(xOf(u), R.t, xOf(u), R.b);
    noStroke();
    fill('#333333');
    textAlign(CENTER, TOP);
    const dec = xstep >= 1 ? 0 : xstep >= 0.1 ? 1 : 2;
    text(num(Math.abs(u) < 1e-9 ? 0 : u, dec), xOf(u), R.b + 5);
  }
  // y ticks (density)
  const ystep = niceStep(dMax / 3);
  for (let d = 0; d <= dMax; d += ystep) {
    stroke('#e3e3e3');
    line(R.l, yOf(d), R.r, yOf(d));
    noStroke();
    fill('#333333');
    textAlign(RIGHT, CENTER);
    text(Number(d.toPrecision(3)).toString(), R.l - 4, yOf(d));
  }
  axisTitle(P, R, compact ? 'amplitude' : 'amplitude (range: mean ± 4σ)');
  yAxisTitle(P, R, 'density');

  startPlotClip(R);
  const bw = (hi - lo) / HIST_BINS;
  fill('rgba(31,95,191,0.30)');
  stroke(C_IN);
  strokeWeight(1);
  a.histIn.density.forEach((d, k) => { if (d > 0) rect(xOf(lo + k * bw), yOf(d), xOf(lo + (k + 1) * bw) - xOf(lo + k * bw), R.b - yOf(d)); });
  if (a.histOut) {
    noFill();
    stroke(C_OUT);
    strokeWeight(2);
    beginShape();
    vertex(xOf(lo), R.b);
    a.histOut.density.forEach((d, k) => { vertex(xOf(lo + k * bw), yOf(d)); vertex(xOf(lo + (k + 1) * bw), yOf(d)); });
    vertex(xOf(hi), R.b);
    endShape();
  }
  setDash(true);
  stroke(C_SIG);
  strokeWeight(1.5);
  noFill();
  beginShape();
  for (let i = 0; i <= 160; i++) { const u = lo + (hi - lo) * i / 160; vertex(xOf(u), yOf(gauss(u))); }
  endShape();
  setDash(false);
  endPlotClip();

  // statistics (top right) and legend (top left): the tails of the histogram leave room there
  noStroke();
  textSize(compact ? 10 : 13);
  textAlign(RIGHT, TOP);
  const lh = compact ? 12 : 16;
  const sx = R.r - 5;
  let yy = R.t + 4;
  fill(C_IN);
  text((compact ? 'kurt. ' : 'excess kurtosis ') + num(a.mw.kurtosis, 2), sx, yy);
  yy += lh;
  if (a.histOut && !compact) {
    fill(C_OUT);
    text('out var ' + a.me.variance.toPrecision(3), sx, yy);
    yy += lh;
    text('out excess kurtosis ' + num(a.me.kurtosis, 2), sx, yy);
    yy += lh;
    if (outPeak > 3 * dIn) { text('(output peak off scale)', sx, yy); yy += lh; }
  }
  if (a.histIn.outside > 0.0005) {
    fill('#b00000');
    text((100 * a.histIn.outside).toFixed(1) + '% beyond ±4σ', sx, yy);
  }
  const items = [['rgba(31,95,191,0.6)', false, 'input w', 6], [C_SIG, true, 'Gaussian fit', 1.5]];
  if (a.histOut) items.push([C_OUT, false, 'output y − s']);
  if (!compact) legend(R.l + 3, R.t + 3, items, false);
}

// ---------------------------------------------------------------------------
// Panel 3: autocorrelation
// ---------------------------------------------------------------------------

function drawAcfPanel(P) {
  const a = analysis, p = a.p;
  const R = plotRect(P);
  panelFrame(P, R, compact ? 'ACF' : 'Autocorrelation ρ[m] of the noise');
  headerRight(P, 'ρ[1] = ' + num(a.acfIn[1], 3), C_IN);

  const yLo = -0.55, yHi = 1.05;
  const xOf = m => R.l + m / MAX_LAG * (R.r - R.l);
  const yOf = r => R.b - (r - yLo) / (yHi - yLo) * (R.b - R.t);

  textSize(tickLabelSize());
  for (const r of [-0.5, 0, 0.5, 1]) {
    stroke(r === 0 ? '#999999' : '#e3e3e3');
    strokeWeight(1);
    line(R.l, yOf(r), R.r, yOf(r));
    if (r < 0) continue;                  // the legend sits in the strip below zero
    noStroke();
    fill('#333333');
    textAlign(RIGHT, CENTER);
    text(num(r, 1), R.l - 4, yOf(r));
  }
  for (let m = 0; m <= MAX_LAG; m += 20) {
    stroke('#999999');
    line(xOf(m), R.b, xOf(m), R.b + 4);
    noStroke();
    fill('#333333');
    textAlign(CENTER, TOP);
    text(m, xOf(m), R.b + 5);
  }
  axisTitle(P, R, compact ? 'lag m (ms)' : 'lag m (samples = ms)');
  yAxisTitle(P, R, 'ρ[m]');

  startPlotClip(R);
  // 95% band for white noise
  const band = 1.96 / Math.sqrt(a.n);
  noStroke();
  fill('rgba(120,120,120,0.13)');
  rect(R.l, yOf(band), R.r - R.l, yOf(-band) - yOf(band));
  // measured input autocorrelation as stems
  stroke(C_IN);
  strokeWeight(1.5);
  for (let m = 0; m <= MAX_LAG; m++) line(xOf(m), yOf(0), xOf(m), yOf(a.acfIn[m]));
  // theory
  setDash(true);
  stroke(C_THEORY);
  strokeWeight(1.5);
  noFill();
  beginShape();
  for (let m = 0; m <= MAX_LAG; m++) vertex(xOf(m), yOf(theoryAcf(p.type, m, a.n)));
  endShape();
  setDash(false);
  if (a.acfOut) {
    stroke(C_OUT);
    strokeWeight(2);
    beginShape();
    for (let m = 0; m <= MAX_LAG; m++) vertex(xOf(m), yOf(a.acfOut[m]));
    endShape();
  }
  endPlotClip();

  const items = [[C_IN, false, 'input w'], [C_THEORY, true, 'theory', 1.5]];
  if (a.acfOut) items.push([C_OUT, false, 'output']);
  items.push(['rgba(120,120,120,0.35)', false, '95% band', 8]);
  if (!compact) rowLegend(R.r - 8, R.b - 13, items, true);
}

// ---------------------------------------------------------------------------
// Panel 4: Welch PSD on log-log axes
// ---------------------------------------------------------------------------

function drawPsdPanel(P) {
  const a = analysis, p = a.p;
  const R = plotRect(P);
  if (!compact) R.t += 18;                // a legend row sits between the header and the plot
  panelFrame(P, R, compact ? 'PSD' : 'Power spectral density (Welch)');
  if (a.fit) headerRight(P, 'slope ' + num(a.fit.slope, 1) + (compact ? ' dB/dec' : ' dB/decade'), '#8a6d00');
  else headerRight(P, compact ? 'slope: n/a' : 'slope: too few bins in fit band', '#b00000');

  const lf0 = Math.log10(F_MIN), lf1 = Math.log10(F_MAX);
  const xOf = f => R.l + (Math.log10(f) - lf0) / (lf1 - lf0) * (R.r - R.l);
  const yOf = db => R.b - (db - PSD_BOTTOM) / (PSD_TOP - PSD_BOTTOM) * (R.b - R.t);
  const toDb = v => (v > 0 ? 10 * Math.log10(v) : PSD_BOTTOM - 50);

  textSize(tickLabelSize());
  for (let db = -80; db <= PSD_TOP; db += 20) {
    stroke('#e3e3e3');
    strokeWeight(1);
    line(R.l, yOf(db), R.r, yOf(db));
    noStroke();
    fill('#333333');
    textAlign(RIGHT, CENTER);
    text(num(db, 0), R.l - 4, yOf(db));
  }
  for (let dec = 0.1; dec <= 100; dec *= 10) {
    for (let m = 1; m <= 9; m++) {
      const f = dec * m;
      if (f > F_MAX) break;
      stroke(m === 1 ? '#cfcfcf' : '#eeeeee');
      line(xOf(f), R.t, xOf(f), R.b);
    }
    noStroke();
    fill('#333333');
    textAlign(CENTER, TOP);
    text(Number(dec.toPrecision(1)).toString(), xOf(dec), R.b + 5);
  }
  textAlign(RIGHT, TOP);
  if (!compact) text('500', R.r, R.b + 5);
  if (compact) axisTitle(P, R, 'frequency (Hz)');
  else {
    noStroke();
    fill('#333333');
    textSize(14);
    textAlign(RIGHT, CENTER);
    text('frequency (Hz)', R.r, R.b + 25);
  }
  yAxisTitle(P, R, compact ? 'dB' : 'dB re 1/Hz');

  startPlotClip(R);
  // fit band shading
  if (a.fit) {
    noStroke();
    fill('rgba(201,151,0,0.10)');
    rect(xOf(a.fit.fLo), R.t, xOf(a.fit.fHi) - xOf(a.fit.fLo), R.b - R.t);
  }
  const W = a.Wx;
  const curve = (Wd, col, wgt) => {
    stroke(col);
    strokeWeight(wgt);
    noFill();
    beginShape();
    for (let k = 1; k < Wd.psd.length; k++) {
      const f = k * Wd.df;
      if (f < F_MIN) continue;
      vertex(xOf(f), yOf(toDb(Wd.psd[k])));
    }
    endShape();
  };
  // theory for the input noise (underneath the estimates)
  setDash(true);
  stroke(C_THEORY);
  strokeWeight(1.5);
  noFill();
  beginShape();
  for (let i = 0; i <= 240; i++) {
    const f = Math.pow(10, lf0 + (lf1 - lf0) * i / 240);
    vertex(xOf(f), yOf(toDb(theoryPsd(p.type, f, p.sigma, a.n))));
  }
  endShape();
  setDash(false);
  curve(W, C_PSD, 1.8);
  if (a.Wy) curve(a.Wy, C_OUT, 1.8);
  // fitted line
  if (a.fit) {
    stroke(C_FIT);
    strokeWeight(3);
    const f1 = a.fit.fLo, f2 = a.fit.fHi;
    line(xOf(f1), yOf(a.fit.icpt + a.fit.slope * Math.log10(f1)), xOf(f2), yOf(a.fit.icpt + a.fit.slope * Math.log10(f2)));
  }
  endPlotClip();

  if (!compact) {
    // Welch settings on the axis-title line, legend on its own row above the plot
    noStroke();
    fill('#333333');
    textSize(13);
    textAlign(LEFT, CENTER);
    const info = 'S = ' + p.S + ' × M = ' + W.M + ', Δf = ' + num(W.df, W.df < 10 ? 2 : 1) + ' Hz, overlap ' +
      Math.round(100 * W.overlap) + '%';
    text(info, P.x + 8, R.b + 25);
    const items = [[C_PSD, false, p.signal ? 'input x' : 'input noise'], [C_THEORY, true, 'theory', 1.5]];
    if (a.Wy) items.push([C_OUT, false, 'output y']);
    items.push([C_FIT, false, 'fit ' + a.fitBand[0] + '–' + a.fitBand[1] + ' Hz', 3]);
    rowLegend(P.x + P.w - 10, R.t - 10, items, false);
  }
}

// ---------------------------------------------------------------------------
// Responsive sizing
// ---------------------------------------------------------------------------

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  needsRedraw = true;
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  compact = canvasWidth < 640;
  controlHeight = compact ? 196 : 150;
  drawHeight = canvasHeight - controlHeight;
  if (typeof lenSlider !== 'undefined' && layoutWidth !== canvasWidth) {
    layoutControls(false);
    if (width !== canvasWidth) resizeCanvas(canvasWidth, canvasHeight);
    needsRedraw = true;
  }
}
