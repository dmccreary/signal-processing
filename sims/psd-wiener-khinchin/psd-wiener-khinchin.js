// Power Spectral Density and the Wiener-Khinchin Theorem MicroSim
// CANVAS_HEIGHT: 784
// Estimates the power spectral density S(w) of a random process two ways and overlays the
// closed-form curve: (1) the averaged periodogram (Welch: Hann window, 50% overlap, or
// Bartlett: rectangular, no overlap) of K segments of M samples, and (2) the Wiener-Khinchin
// route, the Fourier transform of the sample autocorrelation r[k] of the whole record, tapered by
// the lag window c[k] (the autocorrelation of the segment window). Both have the same expected
// value; with one rectangular segment they are identical, because the periodogram IS the Fourier
// transform of the biased sample autocorrelation. All white noise comes from a seeded generator.

// Canvas dimensions
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let drawHeight = 612;
let controlHeight = 172;
let canvasHeight = drawHeight + controlHeight;
let margin = 16;
let defaultTextSize = 16;

// Controls
let processSelect, methodSelect;
let paramSlider, nSlider, kSlider;
let newButton, resetButton;

// Model constants
const SQRT2 = Math.SQRT2;
const PRE = 64;                      // white-noise samples drawn before n = 0 (MA start-up)
const LAG_SHOW = 32;                 // autocorrelation panel shows k = -32..32
const MAX_SHOW = 512;                // realization panel shows at most 512 samples
const K_MAX = 64;
const M_MIN = 16;                    // shortest segment allowed
const DB_SPAN = 50;                  // height of the PSD axis in dB
const FLOOR_POW = 1e-6;              // -60 dB: floor for the log of tiny or negative estimates
const THEORY_REL = 1e-4;             // error vs theory uses frequencies within 40 dB of the peak

const PROCESSES = [
  { key: 'white', label: 'white noise' },
  { key: 'ar1',   label: 'AR(1) process' },
  { key: 'ma',    label: 'moving average MA(q)' },
  { key: 'sine',  label: 'sinusoid + white noise' }
];
const METHODS = [
  { key: 'welch',    label: 'Welch (Hann, 50% overlap)' },
  { key: 'bartlett', label: 'Bartlett (rectangular)' }
];
const PARAM = {
  ar1:  { min: -0.95, max: 0.95, step: 0.05 },
  ma:   { min: 1, max: 32, step: 1 },
  sine: { min: 0.05, max: 0.95, step: 0.01 }     // omega_0 / pi
};

// Colors
const COL_X = [25, 90, 200];         // realization and r[k]: blue
const COL_TH = [30, 30, 30];         // theory: black
const COL_W = [128, 0, 0];           // averaged periodogram: maroon
const COL_BT = [30, 135, 70];        // Fourier transform of r[k]: green
const COL_WIN = [200, 145, 0];       // segment and lag windows, hover: gold
const COL_WIN_TEXT = [150, 105, 0];
const COL_ERR = [205, 35, 35];

// Panel geometry: y positions are fixed, x positions follow the canvas width
const PANEL = {
  X: { top: 90,  h: 60 },            // realization
  R: { top: 196, h: 88 },            // autocorrelation
  S: { top: 326, h: 214 }            // power spectral density
};
const READ1_Y = 574, READ2_Y = 596;
let plotL = 52, plotR = 886;
let ctl = { narrow: false, sliderLeft: 250 };
let layoutWidth = -1;

// State
let st = { stateKey: '' };
let paramVals = { ar1: 0.9, ma: 8, sine: 0.25 };
let curProc = '';
let seed = 1;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  processSelect = createSelect();
  for (const p of PROCESSES) processSelect.option(p.label, p.key);
  processSelect.selected('ar1');
  methodSelect = createSelect();
  for (const m of METHODS) methodSelect.option(m.label, m.key);
  methodSelect.selected('welch');
  processSelect.style('font-size', '15px');
  methodSelect.style('font-size', '15px');

  paramSlider = createSlider(-0.95, 0.95, 0.9, 0.05);
  nSlider = createSlider(6, 12, 10, 1);              // N = 2^value
  kSlider = createSlider(1, K_MAX, 7, 1);

  newButton = createButton('New realization');
  newButton.mousePressed(() => { seed += 1; });
  resetButton = createButton('Reset seed');
  resetButton.mousePressed(() => { seed = 1; });
  newButton.style('font-size', '15px');
  resetButton.style('font-size', '15px');

  layoutControls();
  describe('Three stacked plots estimate the power spectral density of a random process. Top: the first samples of one realization x[n], ' +
    'with the analysis segments in gold. Middle: the sample autocorrelation r-hat[k] for lags -32 to 32 (blue stems), the theoretical ' +
    'autocorrelation (black rings) and the lag window (gold). Bottom: the PSD in dB from 0 to pi radians per sample, estimated by an ' +
    'averaged periodogram (maroon) and by the Fourier transform of r-hat[k] (green, the Wiener-Khinchin theorem), with the theoretical ' +
    'S(omega) dashed in black. Read-outs give the RMS difference between the two estimates and their errors against theory. Controls ' +
    'choose the process (white noise, AR(1), moving average, sinusoid plus noise), its parameter, the record length N, the number of ' +
    'averaged segments K, the window method and the random seed.');
}

function draw() {
  updateCanvasSize();
  readState();
  computeAll();

  // Drawing region and control region
  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  drawHeader();
  drawRealization();
  drawAutocorr();
  drawPsd();
  drawReadouts();
  drawControlLabels();
}

// ---------------------------------------------------------------- state

function readState() {
  const proc = processSelect.value();
  if (proc !== curProc) switchProcess(proc);
  let p = null;
  const P = PARAM[proc];
  if (P) {
    p = Math.round(Number(paramSlider.value()) / P.step) * P.step;
    p = Number(Math.min(P.max, Math.max(P.min, p)).toFixed(2));
    paramVals[proc] = p;
  }
  const N = Math.pow(2, Math.round(Number(nSlider.value())));
  const method = methodSelect.value();
  const kMax = maxK(N, method);
  if (Number(kSlider.elt.max) !== kMax) kSlider.elt.max = kMax;
  if (Number(kSlider.value()) > kMax) kSlider.value(kMax);
  st.proc = proc;
  st.p = p;
  st.N = N;
  st.K = Math.max(1, Math.min(kMax, Math.round(Number(kSlider.value()))));
  st.method = method;
  st.seed = seed;
}

// Put the parameter slider on the range of the chosen process (white noise has no parameter)
function switchProcess(proc) {
  curProc = proc;
  const P = PARAM[proc];
  const el = paramSlider.elt;
  if (P) {
    el.disabled = false;
    el.min = P.min;
    el.max = P.max;
    el.step = P.step;
    el.value = paramVals[proc];
  } else {
    el.disabled = true;
  }
}

// keep every segment at least M_MIN samples long
function maxK(N, method) {
  return method === 'bartlett' ? Math.min(K_MAX, Math.floor(N / M_MIN))
                               : Math.min(K_MAX, Math.floor(2 * N / M_MIN) - 1);
}

function computeAll() {
  const stateKey = [st.proc, st.p, st.N, st.K, st.method, st.seed].join('|');
  if (stateKey === st.stateKey) return;
  st.stateKey = stateKey;
  Object.assign(st, analyze(st.proc, st.p, st.N, st.K, st.method, st.seed));
}

// ---------------------------------------------------------------- random processes

// Small seeded PRNG (mulberry32): the same seed always gives the same noise
function seededRandom(seedVal) {
  let a = seedVal >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// count Gaussian samples (variance 1) by the Box-Muller transform; element j never depends on count
function gaussianSeq(seedVal, count) {
  const rnd = seededRandom(seedVal * 2654435761);
  const out = new Float64Array(count);
  for (let j = 0; j < count; j += 2) {
    const u1 = Math.max(rnd(), 1e-12), u2 = rnd();
    const r = Math.sqrt(-2 * Math.log(u1));
    out[j] = r * Math.cos(2 * Math.PI * u2);
    if (j + 1 < count) out[j + 1] = r * Math.sin(2 * Math.PI * u2);
  }
  return out;
}

// One realization x[0..N-1]; every process is driven by the same white noise w[n] (sigma^2 = 1)
function makeProcess(proc, p, N, seedVal) {
  const w = gaussianSeq(seedVal, N + PRE);         // w[n] is w[PRE + n]
  const x = new Float64Array(N);
  if (proc === 'ar1') {
    x[0] = w[PRE] / Math.sqrt(1 - p * p);           // start in the stationary state
    for (let n = 1; n < N; n++) x[n] = p * x[n - 1] + w[PRE + n];
  } else if (proc === 'ma') {
    const g = 1 / Math.sqrt(p);
    for (let n = 0; n < N; n++) {
      let s = 0;
      for (let i = 0; i < p; i++) s += w[PRE + n - i];
      x[n] = g * s;
    }
  } else if (proc === 'sine') {
    const phi = 2 * Math.PI * seededRandom(seedVal * 7919 + 13)();
    const w0 = p * Math.PI;
    for (let n = 0; n < N; n++) x[n] = SQRT2 * Math.cos(w0 * n + phi) + w[PRE + n];
  } else {
    for (let n = 0; n < N; n++) x[n] = w[PRE + n];
  }
  return x;
}

// Closed-form PSD S(w) = sum_k r[k] e^{-jwk} (the sinusoid's spectral line is drawn separately)
function theoryS(proc, p, om) {
  if (proc === 'ar1') return 1 / (1 - 2 * p * Math.cos(om) + p * p);
  if (proc === 'ma') {
    const s = Math.sin(om / 2);
    if (Math.abs(s) < 1e-12) return p;
    const t = Math.sin(p * om / 2);
    return t * t / (p * s * s);
  }
  return 1;                                          // white noise, and the sinusoid's noise floor
}

// Closed-form autocorrelation r[k] = E{x[n] x[n + k]}
function theoryR(proc, p, k) {
  k = Math.abs(k);
  if (proc === 'ar1') return Math.pow(p, k) / (1 - p * p);
  if (proc === 'ma') return k < p ? 1 - k / p : 0;
  if (proc === 'sine') return Math.cos(p * Math.PI * k) + (k === 0 ? 1 : 0);
  return k === 0 ? 1 : 0;
}

// ---------------------------------------------------------------- spectral estimation

function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// In-place radix-2 FFT (forward: e^{-j...}); re.length must be a power of two
function fftInPlace(re, im) {
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
    const h = len >> 1;
    const ang = -2 * Math.PI / len;
    for (let j = 0; j < h; j++) {
      const wr = Math.cos(ang * j), wi = Math.sin(ang * j);
      for (let i = j; i < n; i += len) {
        const k = i + h;
        const ar = re[k] * wr - im[k] * wi;
        const ai = re[k] * wi + im[k] * wr;
        re[k] = re[i] - ar;
        im[k] = im[i] - ai;
        re[i] += ar;
        im[i] += ai;
      }
    }
  }
}

// Lag products s[k] = sum_n v[n] v[n + k], k = 0..len-1, through a zero-padded FFT
function lagSums(v) {
  const len = v.length;
  const L = nextPow2(2 * len);
  const re = new Float64Array(L), im = new Float64Array(L);
  re.set(v);
  fftInPlace(re, im);
  for (let i = 0; i < L; i++) {
    re[i] = re[i] * re[i] + im[i] * im[i];
    im[i] = 0;
  }
  fftInPlace(re, im);                               // |V|^2 is real and even: forward = L * inverse
  const s = new Float64Array(len);
  for (let k = 0; k < len; k++) s[k] = re[k] / L;
  return s;
}

function toDb(v) { return 10 * Math.log10(Math.max(v, FLOOR_POW)); }

// Everything the panels need for one setting of the controls
function analyze(proc, p, N, K, method, seedVal) {
  const x = makeProcess(proc, p, N, seedVal);

  // biased sample autocorrelation of the whole record: r[k] = (1/N) sum_n x[n] x[n + k]
  const s = lagSums(x);
  const rb = new Float64Array(N);
  for (let k = 0; k < N; k++) rb[k] = s[k] / N;

  // segments
  let M, hop;
  if (method === 'bartlett') { M = Math.floor(N / K); hop = M; }
  else { M = Math.floor(2 * N / (K + 1)); hop = Math.floor(M / 2); }
  const win = new Float64Array(M);
  for (let n = 0; n < M; n++) win[n] = method === 'bartlett' ? 1 : 0.5 - 0.5 * Math.cos(2 * Math.PI * n / M);
  let U = 0;
  for (let n = 0; n < M; n++) U += win[n] * win[n];

  // (1) averaged periodogram: S_W(w) = (1/K) sum_i |sum_n win[n] x[iD + n] e^{-jwn}|^2 / U
  const NFFT = Math.max(1024, nextPow2(2 * M));
  const half = NFFT / 2;
  const SW = new Float64Array(half + 1);
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
  for (let i = 0; i < K; i++) {
    re.fill(0);
    im.fill(0);
    const s0 = i * hop;
    for (let n = 0; n < M; n++) re[n] = win[n] * x[s0 + n];
    fftInPlace(re, im);
    for (let m = 0; m <= half; m++) SW[m] += (re[m] * re[m] + im[m] * im[m]) / U;
  }
  for (let m = 0; m <= half; m++) SW[m] /= K;

  // lag window c[k], c[0] = 1, chosen so that both estimates have (nearly) the same mean:
  //  Welch (Hann): the autocorrelation of the Hann window. c[k] r[k] is then the product of two
  //    non-negative-definite sequences, so the estimate below can never be negative.
  //  Bartlett (rectangular): (1 - |k|/M) / (1 - |k|/N), the triangle of an M-sample segment with
  //    the (1 - |k|/N) bias of r[k] divided out; for one segment (M = N) it is 1 at every lag.
  const lagWin = new Float64Array(M);
  if (method === 'bartlett') {
    for (let k = 0; k < M; k++) lagWin[k] = (1 - k / M) / (1 - k / N);
  } else {
    const cs = lagSums(win);
    for (let k = 0; k < M; k++) lagWin[k] = cs[k] / U;
  }

  // (2) Wiener-Khinchin route: S_BT(w) = sum_{|k| < M} c[k] r[k] e^{-jwk}
  re.fill(0);
  im.fill(0);
  re[0] = lagWin[0] * rb[0];
  for (let k = 1; k < M; k++) {
    const v = lagWin[k] * rb[k];
    re[k] = v;
    re[NFFT - k] = v;
  }
  fftInPlace(re, im);
  const SBT = new Float64Array(half + 1);
  for (let m = 0; m <= half; m++) SBT[m] = re[m];

  // dB values, agreement and error against theory on the grid w_m = 2 pi m / NFFT
  const dbW = new Float64Array(half + 1), dbBT = new Float64Array(half + 1), thBin = new Float64Array(half + 1);
  // (a negative value of S_BT, possible only with the Bartlett lag window, has no dB value:
  //  it is counted in nNeg and left out of the RMS figures)
  let sumA = 0, maxA = 0, cntA = 0, thMax = 0, nNeg = 0;
  for (let m = 0; m <= half; m++) {
    dbW[m] = toDb(SW[m]);
    dbBT[m] = toDb(SBT[m]);
    thBin[m] = theoryS(proc, p, 2 * Math.PI * m / NFFT);
    thMax = Math.max(thMax, thBin[m]);
    if (SBT[m] <= 0) { nNeg++; continue; }
    const d = dbW[m] - dbBT[m];
    sumA += d * d;
    maxA = Math.max(maxA, Math.abs(d));
    cntA++;
  }
  let errW = null, errBT = null;
  if (proc !== 'sine') {
    let sw = 0, sb = 0, cnt = 0, cntB = 0;
    for (let m = 0; m <= half; m++) {
      if (thBin[m] < thMax * THEORY_REL) continue;
      const t = 10 * Math.log10(thBin[m]);
      sw += (dbW[m] - t) * (dbW[m] - t);
      cnt++;
      if (SBT[m] > 0) { sb += (dbBT[m] - t) * (dbBT[m] - t); cntB++; }
    }
    errW = Math.sqrt(sw / cnt);
    errBT = Math.sqrt(sb / Math.max(cntB, 1));
  }

  // theory on a fine grid for drawing
  const thW = [], thDb = [];
  for (let i = 0; i <= 1024; i++) {
    const om = Math.PI * i / 1024;
    thW.push(om);
    thDb.push(toDb(theoryS(proc, p, om)));
  }

  // vertical range of the PSD panel
  // (top: 1 dB above the highest value; bottom: the lowest value, but between 30 and 50 dB below)
  let top = -Infinity, low = Infinity;
  for (let m = 0; m <= half; m++) {
    top = Math.max(top, dbW[m], dbBT[m]);
    low = Math.min(low, dbW[m], SBT[m] > 0 ? dbBT[m] : Infinity);
  }
  for (const v of thDb) {
    top = Math.max(top, v);
    if (v > -59) low = Math.min(low, v);
  }
  const yTop = 10 * Math.ceil((top + 1) / 10);
  const yBot = Math.min(yTop - 30, Math.max(yTop - DB_SPAN, 10 * Math.floor((low - 2) / 10)));

  // realization range
  const nShow = Math.min(N, MAX_SHOW);
  let mx = 0;
  for (let n = 0; n < nShow; n++) mx = Math.max(mx, Math.abs(x[n]));

  // autocorrelation range over the lags shown
  let rHi = Math.max(rb[0], theoryR(proc, p, 0)), rLo = 0;
  for (let k = 0; k <= LAG_SHOW; k++) {
    rHi = Math.max(rHi, rb[k], theoryR(proc, p, k));
    rLo = Math.min(rLo, rb[k], theoryR(proc, p, k));
  }
  const hiR = niceCeil(rHi * 1.08);
  const loR = rLo < -1e-9 ? -niceCeil(Math.max(-rLo * 1.15, 0.25 * hiR)) : 0;

  return {
    x: x, rb: rb, M: M, hop: hop, nSeg: K, win: win, lagWin: lagWin, NFFT: NFFT,
    SW: SW, SBT: SBT, dbW: dbW, dbBT: dbBT, thBin: thBin, thW: thW, thDb: thDb,
    agreeRms: Math.sqrt(sumA / Math.max(cntA, 1)), agreeMax: maxA, nNeg: nNeg,
    errW: errW, errBT: errBT,
    r0hat: rb[0], r0th: theoryR(proc, p, 0),
    rangeS: { lo: yBot, hi: yTop },
    rangeX: { lo: -niceCeil(Math.max(mx, 1e-6) * 1.05), hi: niceCeil(Math.max(mx, 1e-6) * 1.05) },
    rangeR: { lo: loR, hi: hiR },
    nShow: nShow
  };
}

// smallest "nice" number >= v
function niceCeil(v) {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const f of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (f * p >= v - 1e-12) return f * p;
  }
  return 10 * p;
}

// ---------------------------------------------------------------- coordinates

function vY(v, P, R) { return P.top + P.h - (v - R.lo) / (R.hi - R.lo) * P.h; }
function omX(om) { return plotL + om / Math.PI * (plotR - plotL); }

// ---------------------------------------------------------------- drawing: header

function drawHeader() {
  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(['Power Spectral Density and the Wiener–Khinchin Theorem', 'PSD and the Wiener–Khinchin Theorem',
           'Wiener–Khinchin Theorem'], canvasWidth / 2, 14, canvasWidth - 20, 20, CENTER);
  textStyle(NORMAL);
  fill(40);
  fitText(formulaCands(), margin, 36, canvasWidth - 2 * margin, 15, LEFT);
  fill(COL_BT);
  textStyle(BOLD);
  fitText(['Wiener–Khinchin theorem: the PSD is the Fourier transform of the autocorrelation, S(ω) = Σ_k r[k] e^{−jωk}   (σ² = 1)',
           'Wiener–Khinchin: S(ω) = Σ_k r[k] e^{−jωk}   (σ² = 1)', 'S(ω) = Σ_k r[k] e^{−jωk}'],
          margin, 57, canvasWidth - 2 * margin, 15, LEFT);
  textStyle(NORMAL);
}

function formulaCands() {
  if (st.proc === 'ar1') {
    return ['AR(1): x[n] = a·x[n−1] + w[n],   r[k] = σ²a^{|k|}/(1 − a²),   S(ω) = σ²/|1 − a·e^{−jω}|²',
            'AR(1): r[k] = σ²a^{|k|}/(1 − a²),  S(ω) = σ²/|1 − a·e^{−jω}|²', 'S(ω) = σ²/|1 − a·e^{−jω}|²'];
  }
  if (st.proc === 'ma') {
    return ['MA(q): x[n] = (w[n] + … + w[n−q+1])/√q,   r[k] = σ²(1 − |k|/q) for |k| < q,   S(ω) = σ²sin²(qω/2)/(q·sin²(ω/2))',
            'MA(q): r[k] = σ²(1 − |k|/q),  S(ω) = σ²sin²(qω/2)/(q·sin²(ω/2))', 'S(ω) = σ²sin²(qω/2)/(q·sin²(ω/2))'];
  }
  if (st.proc === 'sine') {
    return ['x[n] = √2·cos(ω_0n + φ) + w[n],   r[k] = cos(ω_0k) + σ²δ[k],   S(ω) = σ² + π[δ(ω − ω_0) + δ(ω + ω_0)]',
            'r[k] = cos(ω_0k) + σ²δ[k],  S(ω) = σ² + line at ω_0', 'S(ω) = σ² + line at ω_0'];
  }
  return ['White noise: x[n] = w[n],   r[k] = σ²δ[k],   S(ω) = σ² for every ω (0 dB)',
          'White: r[k] = σ²δ[k],  S(ω) = σ² (0 dB)', 'S(ω) = σ² (0 dB)'];
}

// ---------------------------------------------------------------- drawing: frames and paths

// White plot frame with grid lines at the given values and labels on the left
function drawFrame(P, R, vals, fmt) {
  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(plotL, P.top, plotR - plotL, P.h);
  for (const v of vals) {
    stroke(Math.abs(v) < 1e-12 ? 130 : 228);
    line(plotL, vY(v, P, R), plotR, vY(v, P, R));
  }
  // labels at the top and bottom edges move inward so they clear the caption and the tick row
  noStroke();
  fill(70);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (const v of vals) text(fmt(v), plotL - 5, constrain(vY(v, P, R), P.top + 5, P.top + P.h - 5));
}

// italic axis name in the right margin, on the tick-label row
function axisName(s, P) {
  noStroke();
  fill(70);
  textSize(14);
  textStyle(ITALIC);
  textAlign(CENTER, CENTER);
  text(s, plotR + 9, P.top + P.h + 10);
  textStyle(NORMAL);
}

// Fast polyline through the 2D context (thousands of points per frame), clipped to a panel
function nativePath(n, xAt, yAt, P, col, alpha, weight, dash) {
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.rect(plotL, P.top, plotR - plotL, P.h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + alpha + ')';
  ctx.lineWidth = weight;
  ctx.lineJoin = 'round';
  ctx.setLineDash(dash || []);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    if (i === 0) ctx.moveTo(xAt(i), yAt(i));
    else ctx.lineTo(xAt(i), yAt(i));
  }
  ctx.stroke();
  ctx.restore();
}

function startPanelClip(P) {
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(plotL, P.top, plotR - plotL, P.h);
  drawingContext.clip();
}
function endPanelClip() { drawingContext.restore(); }

function tickStep(dx, minPx, steps) {
  for (const s of steps) if (s * dx >= minPx) return s;
  return steps[steps.length - 1];
}

// ---------------------------------------------------------------- panel X: realization

function drawRealization() {
  const P = PANEL.X, R = st.rangeX;
  const nShow = st.nShow;
  drawFrame(P, R, [R.lo, 0, R.hi], fmtV);
  const dx = (plotR - plotL) / nShow;
  const xOf = n => plotL + (n + 0.5) * dx;

  // the analysis segments: alternate shading (Bartlett) or the Hann windows (Welch)
  startPanelClip(P);
  for (let i = 0; i < st.nSeg; i++) {
    const s0 = i * st.hop;
    if (s0 >= nShow) break;
    if (st.method === 'bartlett') {
      noStroke();
      fill(COL_WIN[0], COL_WIN[1], COL_WIN[2], i % 2 === 0 ? 38 : 12);
      rect(plotL + s0 * dx, P.top + 1, st.M * dx, P.h - 2);
      stroke(COL_WIN[0], COL_WIN[1], COL_WIN[2], 160);
      strokeWeight(1);
      line(plotL + s0 * dx, P.top, plotL + s0 * dx, P.top + P.h);
    } else {
      const n1 = Math.min(st.M, nShow - s0 + 1);
      nativePath(n1, j => plotL + (s0 + j) * dx, j => vY(R.hi * st.win[Math.min(j, st.M - 1)], P, R),
                 P, COL_WIN, 0.75, 1.3, null);
    }
  }
  endPanelClip();
  nativePath(nShow, xOf, n => vY(st.x[n], P, R), P, COL_X, 1, dx >= 2 ? 1.4 : 1.1, null);

  // n axis
  const every = tickStep(dx, 42, [8, 16, 32, 64, 128, 256]);
  noStroke();
  fill(70);
  textSize(14);
  textAlign(CENTER, CENTER);
  for (let n = 0; n < nShow; n += every) {
    if (xOf(n) + 14 < plotR) text(n, xOf(n), P.top + P.h + 10);
  }
  axisName('n', P);

  // caption
  textStyle(BOLD);
  noStroke();
  fill(COL_X);
  const shown = nShow < st.N ? 'first ' + nShow + ' of N = ' + st.N + ' samples' : 'all N = ' + st.N + ' samples';
  const left = fitText(['realization x[n]: ' + shown + ', seed ' + st.seed, 'x[n]: ' + shown + ', seed ' + st.seed,
                        'x[n], seed ' + st.seed], plotL, P.top - 10, (plotR - plotL) * 0.62, 14, LEFT);
  fill(COL_WIN_TEXT);
  const segTxt = st.method === 'bartlett'
    ? ['segments of M = ' + st.M + ' (rectangular)', 'segments, M = ' + st.M, 'M = ' + st.M]
    : ['Hann windows, M = ' + st.M + ', hop ' + st.hop, 'Hann, M = ' + st.M, 'M = ' + st.M];
  fitText(segTxt, plotR, P.top - 10, plotR - plotL - richWidth(left, 14) - 14, 14, RIGHT);
  textStyle(NORMAL);
}

// ---------------------------------------------------------------- panel R: autocorrelation

function drawAutocorr() {
  const P = PANEL.R, R = st.rangeR;
  const vals = R.lo < 0 ? [R.lo, 0, R.hi] : [0, R.hi / 2, R.hi];
  drawFrame(P, R, vals, fmtV);
  const nk = 2 * LAG_SHOW + 1;
  const dx = (plotR - plotL) / nk;
  const kX = k => plotL + (k + LAG_SHOW + 0.5) * dx;

  // hover (or touch) a lag to read r[k] there; otherwise the caption reports k = 0 (the power)
  let kSel = 0;
  st.acfText = null;
  const hovering = mouseX >= plotL && mouseX <= plotR && mouseY >= P.top && mouseY <= P.top + P.h;
  if (hovering) {
    kSel = constrain(Math.floor((mouseX - plotL) / dx) - LAG_SHOW, -LAG_SHOW, LAG_SHOW);
    noStroke();
    fill(255, 215, 0, 90);
    rect(kX(kSel) - dx / 2, P.top + 1, dx, P.h - 2);
  }

  // lag window c[k], drawn on a 0..1 scale that reaches the top grid line
  const yWin = c => vY(c * R.hi, P, R);
  nativePath(nk, i => kX(i - LAG_SHOW), i => {
    const k = Math.abs(i - LAG_SHOW);
    return yWin(k < st.M ? st.lagWin[k] : 0);
  }, P, COL_WIN, 0.95, 1.6, [6, 4]);
  noStroke();
  fill(COL_WIN_TEXT);
  textSize(13);
  textAlign(LEFT, CENTER);
  text('1', plotR + 4, yWin(1));

  // sample autocorrelation (stems) and theory (rings where r[k] is not zero)
  const d = constrain(dx * 0.5, 3.5, 7);
  for (let k = -LAG_SHOW; k <= LAG_SHOW; k++) {
    const v = st.rb[Math.abs(k)];
    stroke(COL_X[0], COL_X[1], COL_X[2]);
    strokeWeight(dx >= 9 ? 2 : 1.3);
    line(kX(k), vY(0, P, R), kX(k), vY(v, P, R));
    noStroke();
    fill(COL_X[0], COL_X[1], COL_X[2]);
    circle(kX(k), vY(v, P, R), d);
  }
  noFill();
  stroke(COL_TH[0], COL_TH[1], COL_TH[2]);
  strokeWeight(1.4);
  for (let k = -LAG_SHOW; k <= LAG_SHOW; k++) {
    const t = theoryR(st.proc, st.p, k);
    if (Math.abs(t) > 1e-9) circle(kX(k), vY(t, P, R), d + 5);
  }

  // k axis
  const every = tickStep(dx, 30, [4, 8, 16, 32]);
  noStroke();
  fill(70);
  textSize(14);
  textAlign(CENTER, CENTER);
  for (let k = -LAG_SHOW; k <= LAG_SHOW; k += every) {
    if (kX(k) + advW(fmtV(k)) / 2 <= plotR + 2) text(fmtV(k), kX(k), P.top + P.h + 10);   // keep clear of the axis name
  }
  axisName('k', P);

  // caption: legend (left) and the r[k] read-out (right)
  const kh = String(kSel).replace('-', '−');
  const rh = fmtSigned(st.rb[Math.abs(kSel)]), rt0 = fmtSigned(theoryR(st.proc, st.p, kSel));
  const right = hovering
    ? ['k = ' + kh + ':  r̂[k] = ' + rh + '  (theory r[k] = ' + rt0 + ')', 'k = ' + kh + ': r̂ = ' + rh + ', r = ' + rt0,
       'r̂[' + kh + '] = ' + rh]
    : ['r̂[0] = ' + st.r0hat.toFixed(2) + '  (theory r[0] = ' + st.r0th.toFixed(2) + ')',
       'r̂[0] = ' + st.r0hat.toFixed(2) + ', r[0] = ' + st.r0th.toFixed(2),
       'r̂[0] = ' + st.r0hat.toFixed(2)];
  textStyle(BOLD);
  let rt = right[right.length - 1];
  for (const c of right) if (richWidth(c, 14) <= (plotR - plotL) * 0.42) { rt = c; break; }
  const rw = richWidth(rt, 14);
  noStroke();
  fill(COL_X);
  richText(rt, plotR, P.top - 10, 14, RIGHT);
  if (hovering) st.acfText = rt;
  textStyle(NORMAL);
  fitLegend([
    [{ kind: 'stem', col: COL_X, label: 'sample autocorrelation r̂[k]' }, { kind: 'ring', col: COL_TH, label: 'theory r[k]' },
     { kind: 'dash', col: COL_WIN, tcol: COL_WIN_TEXT, label: 'lag window c[k] (0 to 1)' }],
    [{ kind: 'stem', col: COL_X, label: 'r̂[k]' }, { kind: 'ring', col: COL_TH, label: 'theory' },
     { kind: 'dash', col: COL_WIN, tcol: COL_WIN_TEXT, label: 'lag window c[k]' }],
    [{ kind: 'stem', col: COL_X, label: 'r̂[k]' }, { kind: 'ring', col: COL_TH, label: 'r[k]' },
     { kind: 'dash', col: COL_WIN, tcol: COL_WIN_TEXT, label: 'c[k]' }]
  ], plotL, P.top - 10, plotR - plotL - rw - 14, 14, LEFT);
}

// ---------------------------------------------------------------- panel S: power spectral density

function drawPsd() {
  const P = PANEL.S, R = st.rangeS;
  const vals = [];
  for (let v = R.lo; v <= R.hi + 1e-9; v += 10) vals.push(v);
  drawFrame(P, R, vals, v => fmtV(v));

  // y unit, rotated
  push();
  translate(13, P.top + P.h / 2);
  rotate(-HALF_PI);
  noStroke();
  fill(70);
  textSize(14);
  textAlign(CENTER, CENTER);
  text('PSD (dB)', 0, 0);
  pop();

  // omega grid lines and labels
  const tl = ['0', 'π/4', 'π/2', '3π/4', 'π'];
  for (let i = 0; i <= 4; i++) {
    const x = omX(Math.PI * i / 4);
    stroke(232);
    strokeWeight(1);
    if (i > 0 && i < 4) line(x, P.top, x, P.top + P.h);
    noStroke();
    fill(70);
    textSize(14);
    textAlign(i === 4 ? RIGHT : (i === 0 ? LEFT : CENTER), CENTER);
    text(tl[i], i === 4 ? x + 4 : (i === 0 ? x - 3 : x), P.top + P.h + 10);
  }
  textAlign(CENTER, CENTER);
  const axisT = plotR - plotL > 560 ? 'frequency ω (rad/sample)' : 'ω';
  text(axisT, omX(Math.PI * 7 / 8), P.top + P.h + 10);

  const half = st.NFFT / 2;
  const bx = m => omX(2 * Math.PI * m / st.NFFT);
  const yS = v => vY(constrain(v, R.lo - 5, R.hi + 5), P, R);

  // theory
  nativePath(st.thW.length, i => omX(st.thW[i]), i => yS(st.thDb[i]), P, COL_TH, 0.95, 1.7, [7, 5]);
  if (st.proc === 'sine') drawLine(P, R);

  // the two estimates: Welch (wide maroon band) under the Fourier transform of r[k] (thin green)
  nativePath(half + 1, bx, m => yS(st.dbW[m]), P, COL_W, 0.55, 4, null);
  nativePath(half + 1, bx, m => yS(st.dbBT[m]), P, COL_BT, 1, 1.4, null);

  drawHover(P, R);

  // caption: legend (left) and segment summary (right)
  const wName = st.method === 'bartlett' ? 'Bartlett' : 'Welch';
  const segs = ['K = ' + st.K + ' segment' + (st.K === 1 ? '' : 's') + ' of M = ' + st.M, 'K = ' + st.K + ', M = ' + st.M, 'M = ' + st.M];
  textStyle(BOLD);
  let rt = segs[segs.length - 1];
  for (const c of segs) if (richWidth(c, 14) <= (plotR - plotL) * 0.3) { rt = c; break; }
  const rw = richWidth(rt, 14);
  noStroke();
  fill(60);
  richText(rt, plotR, P.top - 10, 14, RIGHT);
  textStyle(NORMAL);
  fitLegend([
    [{ kind: 'band', col: COL_W, label: wName + ' averaged periodogram' }, { kind: 'line', col: COL_BT, label: 'FT of c[k]·r̂[k] (Wiener–Khinchin)' },
     { kind: 'dash', col: COL_TH, label: 'theory S(ω)' }],
    [{ kind: 'band', col: COL_W, label: wName + ' periodogram' }, { kind: 'line', col: COL_BT, label: 'FT of r̂[k]' },
     { kind: 'dash', col: COL_TH, label: 'theory' }],
    [{ kind: 'band', col: COL_W, label: wName }, { kind: 'line', col: COL_BT, label: 'FT r̂' }, { kind: 'dash', col: COL_TH, label: 'S(ω)' }]
  ], plotL, P.top - 10, plotR - plotL - rw - 14, 14, LEFT);
}

// the sinusoid's spectral line pi*delta(w - w0): an arrow (its area, the power 1, is not a height)
function drawLine(P, R) {
  const x = omX(st.p * Math.PI);
  const y0 = vY(0, P, R), y1 = P.top + 16;
  stroke(COL_TH[0], COL_TH[1], COL_TH[2]);
  strokeWeight(2);
  drawingContext.setLineDash([7, 5]);
  line(x, y0, x, y1 + 8);
  drawingContext.setLineDash([]);
  noStroke();
  fill(COL_TH[0], COL_TH[1], COL_TH[2]);
  triangle(x, y1, x - 5, y1 + 10, x + 5, y1 + 10);
  textSize(14);
  const lbl = 'spectral line at ω_0 (power 1)';
  const onLeft = x + 10 + richWidth(lbl, 14) > plotR - 4;
  richText(plotR - plotL > 400 ? lbl : 'line', onLeft ? x - 8 : x + 8, y1 + 4, 14, onLeft ? RIGHT : LEFT);
}

// hover (or touch) a frequency to read the three values there
function drawHover(P, R) {
  st.hover = null;
  st.hoverText = null;
  if (!(mouseX >= plotL && mouseX <= plotR && mouseY >= P.top && mouseY <= P.top + P.h)) return;
  const om = (mouseX - plotL) / (plotR - plotL) * Math.PI;
  const m = Math.round(om / (2 * Math.PI) * st.NFFT);
  const omm = 2 * Math.PI * m / st.NFFT;
  const x = omX(omm);
  stroke(COL_WIN[0], COL_WIN[1], COL_WIN[2]);
  strokeWeight(1.5);
  line(x, P.top, x, P.top + P.h);
  const th = 10 * Math.log10(Math.max(st.thBin[m], 1e-30));
  const thTxt = st.thBin[m] > 1e-12 ? fmtDb(th) : '−∞';
  const w = (omm / Math.PI).toFixed(3);
  const btTxt = st.SBT[m] > 0 ? fmtDb(st.dbBT[m]) : '(< 0)';
  const cands = [
    'ω = ' + w + 'π:  ' + (st.method === 'bartlett' ? 'Bartlett ' : 'Welch ') + fmtDb(st.dbW[m]) + ',  FT of r̂ ' + btTxt + ',  ' +
      (st.proc === 'sine' ? 'noise floor ' : 'theory ') + thTxt + ' dB',
    'ω = ' + w + 'π:  ' + fmtDb(st.dbW[m]) + ' / ' + btTxt + ' / ' + thTxt + ' dB',
    w + 'π: ' + fmtDb(st.dbW[m]) + '/' + btTxt + '/' + thTxt
  ];
  st.hover = { m: m, om: omm, w: st.dbW[m], bt: st.dbBT[m], th: th };
  textStyle(BOLD);
  let c = cands[cands.length - 1];
  for (const s of cands) if (richWidth(s, 14) <= plotR - plotL - 16) { c = s; break; }
  const cw = richWidth(c, 14);
  const bxl = constrain(x - cw / 2 - 6, plotL + 2, plotR - cw - 14);
  noStroke();
  fill(255, 255, 255, 235);
  stroke(COL_WIN[0], COL_WIN[1], COL_WIN[2]);
  strokeWeight(1);
  rect(bxl, P.top + P.h - 26, cw + 12, 22, 4);
  noStroke();
  fill(40);
  richText(c, bxl + 6, P.top + P.h - 15, 14, LEFT);
  textStyle(NORMAL);
  st.hoverText = c;
}

// ---------------------------------------------------------------- read-outs

function drawReadouts() {
  const w = canvasWidth - 2 * margin;
  noStroke();
  textStyle(BOLD);
  const a = st.agreeRms, am = st.agreeMax;
  let c1;
  if (a < 0.005) {
    fill(COL_BT);
    c1 = ['Agreement of the two estimates: RMS difference ' + fmtDb(a) + ' dB (max ' + fmtDb(am) +
            ' dB). One rectangular segment: the periodogram IS the FT of r̂[k].',
          'Two estimates identical: RMS difference ' + fmtDb(a) + ' dB (max ' + fmtDb(am) + ' dB)',
          'Identical: RMS difference ' + fmtDb(a) + ' dB'];
  } else {
    fill(COL_W);
    c1 = ['Agreement of the two estimates: RMS difference ' + fmtDb(a) + ' dB (max ' + fmtDb(am) + ' dB) between ' +
            (st.method === 'bartlett' ? 'Bartlett' : 'Welch') + ' and FT of r̂',
          'Agreement: RMS difference ' + fmtDb(a) + ' dB (max ' + fmtDb(am) + ' dB)',
          'Agreement: RMS ' + fmtDb(a) + ' dB, max ' + fmtDb(am) + ' dB'];
  }
  st.read1 = fitText(c1, margin, READ1_Y, w, 15, LEFT);
  fill(50);
  let c2;
  if (st.nNeg > 0) {
    fill(COL_ERR);
    const f = st.nNeg === 1 ? '1 frequency' : st.nNeg + ' frequencies';
    c2 = ['The FT of c[k]·r̂[k] is negative at ' + f + ' (drawn at the bottom edge): a lag-window estimate can dip below 0',
          'FT of c[k]·r̂[k] < 0 at ' + f + ' (bottom edge)', 'FT of r̂ < 0 at ' + f];
  } else if (st.proc === 'sine') {
    c2 = ['Error vs theory: not defined, because S(ω) has a spectral line; compare the 0 dB floor and where the peak sits',
          'S(ω) has a line: compare the 0 dB floor and the peak', 'line spectrum: no RMS error'];
  } else {
    const nm = st.method === 'bartlett' ? 'Bartlett' : 'Welch';
    c2 = ['RMS error vs theory:  ' + nm + ' ' + fmtDb(st.errW) + ' dB,   FT of r̂ ' + fmtDb(st.errBT) + ' dB',
          'vs theory: ' + nm + ' ' + fmtDb(st.errW) + ' dB, FT of r̂ ' + fmtDb(st.errBT) + ' dB',
          'vs theory: ' + fmtDb(st.errW) + ' / ' + fmtDb(st.errBT) + ' dB'];
  }
  st.read2 = fitText(c2, margin, READ2_Y, w, 15, LEFT);
  textStyle(NORMAL);
}

// ---------------------------------------------------------------- controls

function rowY(i) { return drawHeight + 20 + 32 * i; }

function paramLabel() {
  const p = st.p;
  if (st.proc === 'ar1') return (ctl.narrow ? 'a = ' : 'AR coefficient a = ') + fmtSigned(p);
  if (st.proc === 'ma') return (ctl.narrow ? 'q = ' : 'MA length q = ') + p;
  if (st.proc === 'sine') return (ctl.narrow ? 'ω_0 = ' : 'Frequency ω_0 = ') + p.toFixed(2) + 'π';
  return ctl.narrow ? 'no parameter' : 'White noise: no parameter';
}

function drawControlLabels() {
  noStroke();
  textAlign(LEFT, CENTER);
  fill('black');
  textSize(defaultTextSize);
  if (!ctl.narrow) {
    text('Process', 10, rowY(0));
    text('Method', 10, rowY(1));
  }
  const sz = ctl.narrow ? 15 : defaultTextSize;
  fill(st.proc === 'white' ? 120 : 0);
  richText(paramLabel(), 10, rowY(2), sz, LEFT);
  fill(0);
  richText((ctl.narrow ? 'N = ' : 'Record length N = ') + st.N, 10, rowY(3), sz, LEFT);
  richText(ctl.narrow ? 'K = ' + st.K + ', M = ' + st.M : 'Averages K = ' + st.K + '  (M = ' + st.M + ')', 10, rowY(4), sz, LEFT);
}

function layoutControls() {
  if (typeof resetButton === 'undefined' || canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  const narrow = canvasWidth < 560;
  ctl.narrow = narrow;
  const bw = narrow ? 122 : 132;
  const selX = narrow ? 10 : 92;
  const selW = narrow ? Math.max(120, Math.min(222, canvasWidth - 10 - bw - margin - 10)) : 230;
  processSelect.position(selX, rowY(0) - 12);
  methodSelect.position(selX, rowY(1) - 12);
  processSelect.style('width', selW + 'px');
  methodSelect.style('width', selW + 'px');
  newButton.style('width', bw + 'px');
  resetButton.style('width', bw + 'px');
  newButton.position(canvasWidth - margin - bw, rowY(0) - 13);
  resetButton.position(canvasWidth - margin - bw, rowY(1) - 13);
  ctl.sliderLeft = narrow ? 140 : 250;
  const sw = Math.max(60, canvasWidth - ctl.sliderLeft - margin);
  paramSlider.position(ctl.sliderLeft, rowY(2) - 10);
  nSlider.position(ctl.sliderLeft, rowY(3) - 10);
  kSlider.position(ctl.sliderLeft, rowY(4) - 10);
  paramSlider.size(sw);
  nSlider.size(sw);
  kSlider.size(sw);
}

// ---------------------------------------------------------------- legend and text helpers

// legend items: { kind: 'stem' | 'ring' | 'line' | 'band' | 'dash', col, tcol (optional text color), label }
function legendWidth(items, sz) {
  let w = 0;
  items.forEach((it, i) => { w += 26 + richWidth(it.label, sz) + (i < items.length - 1 ? 14 : 0); });
  return w;
}

function drawLegend(items, x, y, sz) {
  let cx = x;
  for (const it of items) {
    const c = it.col;
    if (it.kind === 'stem') {
      stroke(c[0], c[1], c[2]);
      strokeWeight(2);
      line(cx + 8, y + 6, cx + 8, y - 2);
      noStroke();
      fill(c[0], c[1], c[2]);
      circle(cx + 8, y - 3, 7);
    } else if (it.kind === 'ring') {
      noFill();
      stroke(c[0], c[1], c[2]);
      strokeWeight(1.5);
      circle(cx + 8, y, 10);
    } else if (it.kind === 'band') {
      stroke(c[0], c[1], c[2], 140);
      strokeWeight(4);
      line(cx, y, cx + 20, y);
    } else if (it.kind === 'line') {
      stroke(c[0], c[1], c[2]);
      strokeWeight(2);
      line(cx, y, cx + 20, y);
    } else if (it.kind === 'dash') {
      stroke(c[0], c[1], c[2]);
      strokeWeight(2);
      line(cx, y, cx + 7, y);
      line(cx + 12, y, cx + 20, y);
    }
    cx += 26;
    const tc = it.tcol || c;
    noStroke();
    fill(tc[0], tc[1], tc[2]);
    textStyle(BOLD);
    richText(it.label, cx, y, sz, LEFT);
    cx += richWidth(it.label, sz) + 14;
  }
  textStyle(NORMAL);
}

function fitLegend(cands, x, y, maxW, sz) {
  textStyle(BOLD);
  let pick = cands[cands.length - 1];
  for (const c of cands) {
    if (legendWidth(c, sz) <= maxW) { pick = c; break; }
  }
  drawLegend(pick, x, y, sz);
  textStyle(NORMAL);
  return pick;
}

// Rich text: "ω_0" draws the character after '_' as a subscript, "a^{|k|}" a superscript group
function parseRich(s) {
  const out = [];
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ((ch === '_' || ch === '^') && i + 1 < s.length) {
      if (buf) { out.push({ t: buf, mode: 0 }); buf = ''; }
      const mode = ch === '_' ? 1 : 2;
      if (s[i + 1] === '{') {
        const j = s.indexOf('}', i + 2);
        out.push({ t: s.slice(i + 2, j), mode: mode });
        i = j;
      } else {
        out.push({ t: s[i + 1], mode: mode });
        i++;
      }
    } else {
      buf += ch;
    }
  }
  if (buf) out.push({ t: buf, mode: 0 });
  return out;
}

// advance width: in p5 2.x textWidth() measures tight bounds and ignores spaces,
// so runs of text placed side by side must use fontWidth()
function advW(s) {
  return typeof fontWidth === 'function' ? fontWidth(String(s)) : textWidth(String(s));
}

function richWidth(s, sz) {
  let w = 0;
  for (const p of parseRich(s)) {
    textSize(p.mode ? sz * 0.72 : sz);
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
    textSize(p.mode ? sz * 0.72 : sz);
    text(p.t, cx, p.mode === 1 ? y + sz * 0.3 : (p.mode === 2 ? y - sz * 0.32 : y));
    cx += advW(p.t);
  }
  textSize(sz);
  return w;
}

// draw the first candidate that fits in maxW (the last one otherwise); returns the string drawn
function fitText(cands, x, y, maxW, sz, align) {
  for (const c of cands) {
    if (richWidth(c, sz) <= maxW) { richText(c, x, y, sz, align); return c; }
  }
  const last = cands[cands.length - 1];
  richText(last, x, y, sz, align);
  return last;
}

// number with a true minus sign, at most two decimals, no trailing zeros
function fmtV(v) {
  const r = Math.round(v * 100) / 100;
  if (Math.abs(r) < 1e-12) return '0';
  return (r < 0 ? '−' : '') + String(Math.abs(r));
}
function fmtDb(v) {
  const r = Number(v.toFixed(2));
  return (r < 0 ? '−' : '') + Math.abs(r).toFixed(2);
}
function fmtSigned(v) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(2); }

// ---------------------------------------------------------------- responsive layout

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  plotL = 52;
  plotR = canvasWidth - 18;
  layoutControls();
}
