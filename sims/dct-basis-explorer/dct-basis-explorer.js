// DCT Basis Explorer MicroSim
// CANVAS_HEIGHT: 666
// 1-D view: the N = 8 orthonormal DCT-II basis functions, an 8-sample signal (preset or
// dragged by hand), its coefficients X[k], the reconstruction from the first K of them, the
// error, and the fraction of the energy captured by the first K DCT and DFT coefficients.
// 2-D view: the 64 basis images of the separable 8x8 DCT (C = D X D^T), a synthetic block,
// uniform quantization with step Q (small coefficients become 0), the reconstruction and PSNR.

// Canvas dimensions
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let drawHeight = 560;
let controlHeight = 106;
let canvasHeight = drawHeight + controlHeight;
let margin = 16;
let defaultTextSize = 16;

// Controls
let viewSelect, signalSelect, blockSelect;
let kSlider, qSlider;

// Transform size and display constants
const N = 8;
const Y_MAX = 4;                     // 1-D samples live in [-4, 4]
const DFT_ORDER = [0, 1, 7, 2, 6, 3, 5, 4];          // DFT bins from low to high frequency
const DFT_LABEL = ['0', '1', '−1', '2', '−2', '3', '−3', '4'];
const EPS = 1e-9;
const ERR_FULL = 16;                 // |pixel error| drawn fully red

// Colors
const COL_X = [25, 90, 200];         // signal x[n]: blue
const COL_REC = [130, 50, 175];      // reconstruction x_K[n]: purple
const COL_DCT = [128, 0, 0];         // DCT coefficients: maroon
const COL_DFT = [30, 130, 70];       // DFT magnitudes: green
const COL_ERR = [205, 35, 35];       // error: red
const COL_GOLD = [218, 165, 32];     // highlight: gold
const COL_GOLD_TEXT = [150, 105, 0];
const COL_DROP = [180, 180, 180];    // dropped coefficients: gray
const COL_TEXT = [40, 40, 40];

// 1-D signal presets (8 samples in [-4, 4]) and 2-D blocks (8x8 pixels, 0..255)
const SIGNALS = [
  { key: 'ramp',   label: 'ramp' },
  { key: 'bump',   label: 'smooth bump' },
  { key: 'step',   label: 'step edge' },
  { key: 'basis3', label: 'pure basis k = 3' },
  { key: 'cos1',   label: 'cosine, one period' },
  { key: 'alt',    label: 'alternating ±2' },
  { key: 'noise',  label: 'random noise' },
  { key: 'custom', label: 'custom (drag samples)' }
];
const BLOCKS = [
  { key: 'blob',    label: 'smooth blob' },
  { key: 'grad',    label: 'horizontal gradient' },
  { key: 'diag',    label: 'diagonal gradient' },
  { key: 'vedge',   label: 'vertical edge' },
  { key: 'dedge',   label: 'diagonal edge' },
  { key: 'stripes', label: 'texture: stripes' },
  { key: 'checker', label: 'texture: checkerboard' },
  { key: 'noise',   label: 'random noise' }
];
const SEED_SIGNAL = 5, SEED_BLOCK = 11;   // fixed seeds: the noise presets are reproducible

// Orthonormal DCT-II matrix D[k][n] = c_k cos(pi k (2n + 1) / 2N)
function dctScale(k) { return k === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N); }
const DMAT = [];
for (let k = 0; k < N; k++) {
  const row = [];
  for (let n = 0; n < N; n++) row.push(dctScale(k) * Math.cos(Math.PI * k * (2 * n + 1) / (2 * N)));
  DMAT.push(row);
}

// State
let view = '1d';
let sigKey = 'ramp';
let xs = [];
let K = 3;
let selK = 1;
let blockKey = 'blob';
let Q = 20;
let selU = 0, selV = 2;
let dragN = -1;
let narrow = false;
let L1 = {}, L2 = {};
let st1 = {}, st2 = { key: '' };
let hover = null;
let basisG = null, basisGKey = '';
let layoutWidth = -1;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  viewSelect = createSelect();
  viewSelect.option('1-D signal (N = 8)', '1d');
  viewSelect.option('2-D 8×8 block', '2d');
  viewSelect.selected('1d');

  signalSelect = createSelect();
  for (const s of SIGNALS) signalSelect.option(s.label, s.key);
  signalSelect.selected('ramp');

  blockSelect = createSelect();
  for (const b of BLOCKS) blockSelect.option(b.label, b.key);
  blockSelect.selected('blob');

  for (const s of [viewSelect, signalSelect, blockSelect]) s.style('font-size', '15px');

  kSlider = createSlider(1, N, 3, 1);
  qSlider = createSlider(1, 100, 20, 1);

  xs = makeSignal('ramp');
  layoutControls(true);
  applyView();
  describe('DCT basis explorer with two views. 1-D view: eight small plots of the DCT-II basis functions for k = 0 to 7, ' +
    'a bar chart of the DCT coefficients of an 8-sample signal, the signal with its reconstruction from the first K coefficients, ' +
    'the reconstruction error, the DFT magnitudes of the same signal, and the fraction of the energy captured by the first K DCT ' +
    'and DFT coefficients. 2-D view: the 64 basis images of the 8 by 8 DCT, an 8 by 8 test block, its quantized coefficients, ' +
    'the reconstructed block, the error and the PSNR. Drop-down lists choose the view and the signal or block; sliders set K or the ' +
    'quantization step Q; click a basis function to highlight it and drag a sample to edit the 1-D signal.');
}

function draw() {
  updateCanvasSize();
  readControls();

  // Drawing region and control region
  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  if (view === '1d') {
    compute1D();
    draw1D();
  } else {
    compute2D();
    draw2D();
  }
  drawControlLabels();
}

// ---------------------------------------------------------------- state and math

function readControls() {
  const v = viewSelect.value();
  if (v !== view) { view = v; applyView(); }
  const s = signalSelect.value();
  if (s !== sigKey) {
    sigKey = s;
    if (s !== 'custom') xs = makeSignal(s);     // "custom" keeps the current samples
  }
  K = Number(kSlider.value());
  blockKey = blockSelect.value();
  Q = Number(qSlider.value());
}

// show only the controls of the current view
function applyView() {
  const one = view === '1d';
  if (one) { signalSelect.show(); kSlider.show(); blockSelect.hide(); qSlider.hide(); }
  else { signalSelect.hide(); kSlider.hide(); blockSelect.show(); qSlider.show(); }
  dragN = -1;
}

// Small seeded PRNG so the random presets are the same on every load
function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSignal(key) {
  const rnd = seededRandom(SEED_SIGNAL);
  const out = [];
  for (let n = 0; n < N; n++) {
    const r = rnd();
    let v = 0;
    switch (key) {
      case 'ramp':   v = n - 3.5; break;
      case 'bump':   v = 3 * Math.sin(Math.PI * (n + 0.5) / N); break;
      case 'step':   v = n < N / 2 ? -2 : 2; break;
      case 'basis3': v = 3 * Math.cos(3 * Math.PI * (2 * n + 1) / (2 * N)); break;   // = 6 phi_3[n]
      case 'cos1':   v = 3 * Math.cos(2 * Math.PI * n / N); break;                    // one full period
      case 'alt':    v = n % 2 === 0 ? 2 : -2; break;
      case 'noise':  v = Math.round((6 * r - 3) * 10) / 10; break;                    // one decimal in [-3, 3]
    }
    out.push(Math.abs(v) < 1e-12 ? 0 : v);
  }
  return out;
}

function makeBlock(key) {
  const rnd = seededRandom(SEED_BLOCK);
  const B = [];
  for (let m = 0; m < N; m++) {
    const row = [];
    for (let n = 0; n < N; n++) {
      const r = rnd();
      let v = 128;
      switch (key) {
        case 'blob':    v = 50 + 170 * Math.exp(-((m - 3.5) ** 2 + (n - 3.5) ** 2) / 6); break;
        case 'grad':    v = 40 + 25 * n; break;
        case 'diag':    v = 30 + 14 * (m + n); break;
        case 'vedge':   v = n < 4 ? 50 : 200; break;
        case 'dedge':   v = m + n >= 8 ? 200 : 50; break;
        case 'stripes': v = 128 + (n % 2 === 0 ? 80 : -80); break;
        case 'checker': v = 128 + ((m + n) % 2 === 0 ? 80 : -80); break;
        case 'noise':   v = Math.floor(r * 256); break;
      }
      row.push(constrain(Math.round(v), 0, 255));
    }
    B.push(row);
  }
  return B;
}

function matMul(A, B) {
  const out = [];
  for (let i = 0; i < A.length; i++) {
    const row = [];
    for (let j = 0; j < B[0].length; j++) {
      let s = 0;
      for (let k = 0; k < B.length; k++) s += A[i][k] * B[k][j];
      row.push(s);
    }
    out.push(row);
  }
  return out;
}

function transpose(A) { return A[0].map((_, j) => A.map(r => r[j])); }

function compute1D() {
  const X = DMAT.map(row => row.reduce((s, d, n) => s + d * xs[n], 0)).map(v => Math.abs(v) < EPS ? 0 : v);
  // DFT magnitudes with orthonormal scaling |X_DFT[k]| / sqrt(N), so both transforms share Parseval's energy
  const F = [];
  for (let k = 0; k < N; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const a = -2 * Math.PI * ((k * n) % N) / N;
      re += xs[n] * Math.cos(a);
      im += xs[n] * Math.sin(a);
    }
    const m = Math.hypot(re, im) / Math.sqrt(N);
    F.push(m < EPS ? 0 : m);
  }
  const E = xs.reduce((s, v) => s + v * v, 0);
  const rec = xs.map((_, n) => {
    let s = 0;
    for (let k = 0; k < K; k++) s += X[k] * DMAT[k][n];
    return s;
  });
  const err = xs.map((v, n) => { const e = v - rec[n]; return Math.abs(e) < EPS ? 0 : e; });
  const cumDCT = [], cumDFT = [];
  let a = 0, b = 0;
  for (let i = 0; i < N; i++) {
    a += X[i] * X[i];
    b += F[DFT_ORDER[i]] ** 2;
    cumDCT.push(E > EPS ? Math.min(1, a / E) : NaN);
    cumDFT.push(E > EPS ? Math.min(1, b / E) : NaN);
  }
  let errE = err.reduce((s, v) => s + v * v, 0);
  if (errE < EPS) errE = 0;
  const hi = niceCeil(Math.max(maxAbs(X), Math.max(...F), 0.5) * 1.3);
  st1 = { X: X, F: F, E: E, rec: rec, err: err, cumDCT: cumDCT, cumDFT: cumDFT, errE: errE,
          fracDCT: cumDCT[K - 1], fracDFT: cumDFT[K - 1], hi: hi };
}

function compute2D() {
  const key = blockKey + '|' + Q;
  if (key === st2.key) return;
  const B = makeBlock(blockKey);
  const Xs = B.map(r => r.map(v => v - 128));               // level shift, as in JPEG
  const C = matMul(matMul(DMAT, Xs), transpose(DMAT));       // C = D X D^T
  const Cq = C.map(r => r.map(v => { const q = Q * Math.round(v / Q); return q === 0 ? 0 : q; }));
  const R0 = matMul(matMul(transpose(DMAT), Cq), DMAT);      // X = D^T C D
  const R = R0.map(r => r.map(v => constrain(Math.round(v + 128), 0, 255)));
  let se = 0, maxErr = 0, nz = 0, eAll = 0, eKept = 0;
  const err = [];
  for (let m = 0; m < N; m++) {
    const row = [];
    for (let n = 0; n < N; n++) {
      const e = B[m][n] - R[m][n];
      row.push(e);
      se += e * e;
      maxErr = Math.max(maxErr, Math.abs(e));
      const c2 = C[m][n] * C[m][n];
      eAll += c2;
      if (Cq[m][n] !== 0) { nz++; eKept += c2; }
    }
    err.push(row);
  }
  const mse = se / (N * N);
  st2 = { key: key, B: B, C: C, Cq: Cq, R: R, err: err, mse: mse, maxErr: maxErr, nz: nz,
          psnr: mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse),
          kept: eAll > 0 ? eKept / eAll : 1 };
}

function maxAbs(a) { return a.reduce((m, v) => Math.max(m, Math.abs(v)), 0); }

// smallest "nice" number >= v
function niceCeil(v) {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const f of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (f * p >= v - 1e-12) return f * p;
  }
  return 10 * p;
}

// ---------------------------------------------------------------- layout

function computeLayout() {
  const W = canvasWidth;
  narrow = W < 640;
  const x0 = margin, x1 = W - margin;

  // ---- 1-D view
  L1 = {};
  if (!narrow) {
    const gap = 8;
    const pw = (x1 - x0 - 7 * gap) / 8;
    L1.basisCapY = 64;
    L1.basis = [];
    for (let k = 0; k < N; k++) L1.basis.push({ x: x0 + k * (pw + gap), y: 90, w: pw, h: 62 });
    L1.coef = { x0: x0, x1: x1, top: 190, h: 86, aligned: true };
    const split = x0 + 30 + (x1 - x0 - 30) * 0.57;
    L1.sig = { x0: x0 + 30, x1: split - 10, top: 318, h: 116 };
    L1.err = { x0: x0 + 30, x1: split - 10, top: 478, h: 54 };
    L1.dft = { x0: split + 40, x1: x1, top: 318, h: 92 };
    L1.cum = { x0: split + 40, x1: x1, top: 458, h: 74 };
  } else {
    const gap = 6;
    const pw = (x1 - x0 - 3 * gap) / 4;
    L1.basisCapY = 58;
    L1.basis = [];
    for (let k = 0; k < N; k++) {
      L1.basis.push({ x: x0 + (k % 4) * (pw + gap), y: k < 4 ? 82 : 142, w: pw, h: 42 });
    }
    L1.coef = { x0: x0 + 28, x1: x1, top: 212, h: 62, aligned: false };
    L1.sig = { x0: x0 + 28, x1: x1, top: 312, h: 86 };
    L1.err = { x0: x0 + 28, x1: x1, top: 440, h: 32 };
    L1.dft = { x0: x0 + 28, x1: x1, top: 502, h: 38 };
    L1.cum = null;
  }

  // ---- 2-D view
  L2 = {};
  if (!narrow) {
    const gx0 = x0 + 18;
    const gridMax = Math.min(330, Math.floor((x1 - x0) * 0.34));
    const t = Math.floor((gridMax - 14) / 8);
    L2.grid = { x: gx0, y: 90, t: t, gap: 2, w: 8 * t + 14 };
    const rx = gx0 + L2.grid.w + 30;
    const rw = x1 - rx;
    const three = (rw - 2 * 24) / 3 >= 150;
    if (three) {
      const b = Math.min(190, Math.floor((rw - 2 * 24) / 3));
      const g = Math.min(48, (rw - 3 * b) / 2);
      const ox = rx + (rw - 3 * b - 2 * g) / 2;          // centre the three blocks in the right area
      L2.orig = { x: ox, y: 90, b: b };
      L2.coef = { x: ox + b + g, y: 90, b: b };
      L2.rec = { x: ox + 2 * (b + g), y: 90, b: b };
      L2.err = { x: ox, y: 90 + b + 56, b: b };
      L2.stats = { x: ox + b + g, y: 90 + b + 64, w: x1 - (ox + b + g), dy: 24, sz: 15 };
      L2.hover = { x: ox, y: drawHeight - 20, w: x1 - ox };
      L2.capW = b + g - 6;
    } else {
      const b = Math.min(170, Math.floor((rw - 24) / 2));
      const g = Math.min(48, rw - 2 * b);
      const ox = rx + (rw - 2 * b - g) / 2;
      L2.orig = { x: ox, y: 90, b: b };
      L2.coef = { x: ox + b + g, y: 90, b: b };
      L2.rec = { x: ox, y: 90 + b + 44, b: b };
      L2.err = { x: ox + b + g, y: 90 + b + 44, b: b };
      L2.capW = b + g - 6;
      const top = Math.max(L2.grid.y + L2.grid.w + 96, 90 + 2 * b + 64);
      L2.stats = { x: x0, y: top, w: x1 - x0, dy: 20, sz: 15, cols: 2 };
      L2.hover = { x: x0, y: top + 2 * 20 + 6, w: x1 - x0 };
    }
    L2.sel = { x: gx0, y: L2.grid.y + L2.grid.w + 26, s: 72, textX: gx0 + 86, w: L2.grid.w - 86 };
    L2.gridCapW = rx - margin - 10;
    L2.capY = 64;
  } else {
    // grid height and the two block rows are fixed by drawHeight, so tile and block sizes are capped
    const gx0 = x0 + 14;
    const t = constrain(Math.floor((x1 - gx0 - 150) / 8) - 2, 12, 20);
    L2.grid = { x: gx0, y: 89, t: t, gap: 2, w: 8 * t + 14 };
    L2.capY = 57;
    const sx = gx0 + L2.grid.w + 16;
    L2.sel = { x: sx, y: 89, s: 56, textX: sx, w: x1 - sx, below: true };
    const b = Math.min(104, Math.floor((x1 - x0 - 2 * 14) / 3));
    const g = Math.min(40, (x1 - x0 - 3 * b) / 2);
    const ox = x0 + (x1 - x0 - 3 * b - 2 * g) / 2;
    L2.orig = { x: ox, y: 292, b: b };
    L2.coef = { x: ox + b + g, y: 292, b: b };
    L2.rec = { x: ox + 2 * (b + g), y: 292, b: b };
    L2.err = { x: ox, y: 292 + b + 34, b: b };
    L2.stats = { x: ox + b + 14, y: 292 + b + 38, w: x1 - (ox + b + 14), dy: 20, sz: 14 };
    L2.hover = { x: x0, y: 549, w: x1 - x0 };
    L2.capW = b + g - 6;
    L2.gridCapW = x1 - x0;
  }
}

// ---------------------------------------------------------------- 1-D view

function draw1D() {
  drawTitle(['DCT Basis Explorer: 1-D Signal, N = 8', 'DCT Basis Explorer']);
  const fd = pct(st1.fracDCT), ff = pct(st1.fracDFT);
  drawSegsFit([
    [{ t: 'Energy in the first K = ' + K + ' coefficients:   ', c: COL_TEXT }, { t: 'DCT ' + fd, c: COL_DCT }, { t: '     DFT ' + ff, c: COL_DFT }],
    [{ t: 'Energy in first K = ' + K + ':  ', c: COL_TEXT }, { t: 'DCT ' + fd, c: COL_DCT }, { t: '   DFT ' + ff, c: COL_DFT }],
    [{ t: 'K = ' + K + ':  ', c: COL_TEXT }, { t: 'DCT ' + fd, c: COL_DCT }, { t: '  DFT ' + ff, c: COL_DFT }]
  ], margin, narrow ? 36 : 40, canvasWidth - 2 * margin, 16, LEFT, true);

  drawBasisPanels();
  drawCoefBars();
  drawSignal();
  drawError();
  drawDFT();
  if (L1.cum) drawCumulative();
}

function drawTitle(cands) {
  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(cands, canvasWidth / 2, 14, canvasWidth - 20, 20, CENTER);
  textStyle(NORMAL);
}

function drawBasisPanels() {
  noStroke();
  fill(COL_TEXT);
  fitText(['DCT-II basis functions φ_k[n] = c_k cos(πk(2n + 1)/16), n = 0…7   (click one to highlight it)',
           'Basis functions φ_k[n] (click one to highlight it)', 'Basis φ_k[n] (tap one)'],
          margin, L1.basisCapY, canvasWidth - 2 * margin, 15, LEFT);
  for (let k = 0; k < N; k++) {
    const p = L1.basis[k];
    const kept = k < K, sel = k === selK;
    const col = kept ? COL_DCT : COL_DROP;
    fill(kept ? 255 : 247);
    stroke(sel ? color(COL_GOLD) : color(200));
    strokeWeight(sel ? 3 : 1);
    rect(p.x, p.y, p.w, p.h, 3);
    const yc = p.y + p.h / 2, amp = p.h / 2 - 5;
    stroke(215);
    strokeWeight(1);
    line(p.x + 3, yc, p.x + p.w - 3, yc);
    // the cosine that the samples come from
    noFill();
    stroke(col[0], col[1], col[2], 90);
    strokeWeight(1.2);
    beginShape();
    for (let t = -0.5; t <= 7.5 + 1e-9; t += 0.05) {
      const v = dctScale(k) * Math.cos(Math.PI * k * (2 * t + 1) / (2 * N));
      vertex(p.x + (t + 0.5) / N * p.w, yc - v / 0.5 * amp);
    }
    endShape();
    // the samples phi_k[n]
    const d = constrain(p.w / 16, 3.5, 6);
    for (let n = 0; n < N; n++) {
      const x = p.x + (n + 0.5) * p.w / N;
      const y = yc - DMAT[k][n] / 0.5 * amp;
      stroke(col[0], col[1], col[2]);
      strokeWeight(1.6);
      line(x, yc, x, y);
      noStroke();
      fill(col[0], col[1], col[2]);
      circle(x, y, d);
    }
    noStroke();
    fill(sel ? color(COL_GOLD_TEXT) : (kept ? color(40) : color(120)));
    textStyle(sel ? BOLD : NORMAL);
    richText('k = ' + k, p.x + p.w / 2, p.y - 9, 14, CENTER);
    textStyle(NORMAL);
  }
}

function coefColX(k) {
  const P = L1.coef;
  if (P.aligned) return L1.basis[k].x + L1.basis[k].w / 2;
  return P.x0 + (k + 0.5) * (P.x1 - P.x0) / N;
}

function coefColW() {
  const P = L1.coef;
  return P.aligned ? L1.basis[0].w + 8 : (P.x1 - P.x0) / N;
}

// vertical position of value v in panel P with range R
function vY(v, P, R) { return P.top + P.h - (v - R.lo) / (R.hi - R.lo) * P.h; }

function plotFrame(P, R, labels, x0) {
  const left = x0 === undefined ? P.x0 : x0;
  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(left, P.top, P.x1 - left, P.h);
  for (const v of labels) {
    stroke(v === 0 ? 130 : 230);
    line(left, vY(v, P, R), P.x1, vY(v, P, R));
  }
}

function axisLabels(P, R, labels, x, fmtFn) {
  noStroke();
  fill(70);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (const v of labels) text(fmtFn ? fmtFn(v) : fmtV(v), x, vY(v, P, R));
}

function drawCoefBars() {
  const P = L1.coef;
  const R = { lo: -st1.hi, hi: st1.hi };
  const left = P.x0;
  plotFrame(P, R, [R.lo, 0, R.hi], left);
  if (!P.aligned) axisLabels(P, R, [R.lo, 0, R.hi], P.x0 - 4);
  const cw = coefColW();
  // kept region and the K boundary
  if (K < N) {
    const xb = (coefColX(K - 1) + coefColX(K)) / 2;
    noStroke();
    fill(COL_DCT[0], COL_DCT[1], COL_DCT[2], 14);
    rect(left + 1, P.top + 1, xb - left - 1, P.h - 2);
    stroke(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
    strokeWeight(2);
    drawingContext.setLineDash([5, 4]);
    line(xb, P.top - 4, xb, P.top + P.h + 4);
    drawingContext.setLineDash([]);
  } else {
    noStroke();
    fill(COL_DCT[0], COL_DCT[1], COL_DCT[2], 14);
    rect(left + 1, P.top + 1, P.x1 - left - 2, P.h - 2);
  }
  const bw = Math.min(cw * 0.42, 30);
  const y0 = vY(0, P, R);
  for (let k = 0; k < N; k++) {
    const x = coefColX(k), v = st1.X[k];
    const kept = k < K;
    const col = kept ? COL_DCT : COL_DROP;
    const y1 = vY(v, P, R);
    noStroke();
    fill(col[0], col[1], col[2]);
    rect(x - bw / 2, Math.min(y0, y1), bw, Math.max(1.5, Math.abs(y1 - y0)));
    if (k === selK) {
      noFill();
      stroke(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
      strokeWeight(3);
      rect(x - bw / 2 - 4, Math.min(y0, y1) - 4, bw + 8, Math.abs(y1 - y0) + 8, 3);
    }
    // value label (wide layout only; the narrow layout prints the highlighted value in the caption)
    // labels sit on the other side of the zero line, so they never collide with a bar or its outline
    if (P.aligned) {
      const s = fmt2(v);
      textSize(14);
      const pad = k === selK ? 14 : 10;
      const yl = v > 0 ? y0 + pad : y0 - pad;
      noStroke();
      fill(kept ? color(COL_DCT) : color(130));
      textAlign(CENTER, CENTER);
      text(s, x, yl);
    }
    // k label
    noStroke();
    fill(70);
    textSize(14);
    textAlign(CENTER, CENTER);
    text(k, x, P.top + P.h + 9);
  }
  // caption
  noStroke();
  const selS = 'X[' + selK + '] = ' + fmt2(st1.X[selK]);
  const cap = [
    [{ t: 'DCT coefficients X[k] = Σ_n x[n] φ_k[n]:  ', c: COL_TEXT }, { t: 'kept (k < K)', c: COL_DCT }, { t: '   dropped', c: [130, 130, 130] }],
    [{ t: 'DCT coefficients X[k]:  ', c: COL_TEXT }, { t: 'kept', c: COL_DCT }, { t: ', dropped', c: [130, 130, 130] },
     { t: '    ' + selS, c: COL_GOLD_TEXT }],
    [{ t: 'X[k]: ', c: COL_TEXT }, { t: 'kept', c: COL_DCT }, { t: ', dropped', c: [130, 130, 130] }, { t: '   ' + selS, c: COL_GOLD_TEXT }],
    [{ t: 'X[k] ', c: COL_TEXT }, { t: '  ' + selS, c: COL_GOLD_TEXT }]
  ];
  drawSegsFit(P.aligned ? cap : cap.slice(1), narrow ? margin : P.x0, P.top - 12, canvasWidth - 2 * margin, 15, LEFT, false);
  if (narrow) axisLetter('k', P.x1 + 4, P.top + P.h + 9);
}

// italic axis letter placed just right of the last tick label
function axisLetter(s, x, y) {
  noStroke();
  fill(70);
  textSize(14);
  textAlign(LEFT, CENTER);
  textStyle(ITALIC);
  text(s, x, y);
  textStyle(NORMAL);
}

function sigX(t) { const P = L1.sig; return P.x0 + (t + 0.5) * (P.x1 - P.x0) / N; }

function startClip(x, y, w, h) {
  push();
  drawingContext.beginPath();
  drawingContext.rect(x, y, w, h);
  drawingContext.clip();
}
function stopClip() { pop(); }

function drawSignal() {
  const P = L1.sig;
  const R = { lo: -Y_MAX, hi: Y_MAX };
  plotFrame(P, R, [-4, -2, 0, 2, 4]);
  axisLabels(P, R, [-4, -2, 0, 2, 4], P.x0 - 5);
  const dx = (P.x1 - P.x0) / N;

  startClip(P.x0, P.top, P.x1 - P.x0, P.h);
  // contribution of the highlighted basis function, X[k] phi_k(t)
  const Xs = st1.X[selK];
  noFill();
  stroke(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  strokeWeight(2);
  drawingContext.setLineDash([6, 5]);
  beginShape();
  for (let t = -0.5; t <= 7.5 + 1e-9; t += 0.05) {
    vertex(sigX(t), vY(Xs * dctScale(selK) * Math.cos(Math.PI * selK * (2 * t + 1) / (2 * N)), P, R));
  }
  endShape();
  drawingContext.setLineDash([]);

  // x[n]: blue stems
  for (let n = 0; n < N; n++) {
    const x = sigX(n), y = vY(xs[n], P, R), yz = vY(0, P, R);
    stroke(COL_X[0], COL_X[1], COL_X[2]);
    strokeWeight(3);
    line(x, yz, x, y);
    noStroke();
    fill(COL_X[0], COL_X[1], COL_X[2]);
    circle(x, y, 11);
  }

  // reconstruction: the sum of the first K cosines, continuous, with rings at the samples
  noFill();
  stroke(COL_REC[0], COL_REC[1], COL_REC[2]);
  strokeWeight(2);
  beginShape();
  for (let t = -0.5; t <= 7.5 + 1e-9; t += 0.05) {
    let s = 0;
    for (let k = 0; k < K; k++) s += st1.X[k] * dctScale(k) * Math.cos(Math.PI * k * (2 * t + 1) / (2 * N));
    vertex(sigX(t), vY(s, P, R));
  }
  endShape();
  strokeWeight(2.5);
  for (let n = 0; n < N; n++) circle(sigX(n), vY(st1.rec[n], P, R), 17);
  stopClip();

  // the sample being dragged
  if (dragN >= 0) {
    const s = 'x[' + dragN + '] = ' + fmtV(xs[dragN]);
    textSize(14);
    const w = advW(s) + 8;
    let x = constrain(sigX(dragN) + 12, P.x0 + 2, P.x1 - w - 2);
    const y = constrain(vY(xs[dragN], P, R) - 16, P.top + 10, P.top + P.h - 10);
    noStroke();
    fill(255, 255, 255, 225);
    rect(x, y - 9, w, 18, 3);
    fill(COL_X);
    textAlign(LEFT, CENTER);
    text(s, x + 4, y);
  }

  // n axis
  noStroke();
  fill(70);
  textSize(14);
  textAlign(CENTER, CENTER);
  for (let n = 0; n < N; n++) text(n, sigX(n), P.top + P.h + 9);
  axisLetter('n', P.x1 + 4, P.top + P.h + 9);

  // legend
  const kS = String(selK);
  fitLegend([
    [{ kind: 'stem', col: COL_X, label: 'x[n]' }, { kind: 'ring', col: COL_REC, label: 'x_K[n] = Σ_{k<K} X[k] φ_k[n]' },
     { kind: 'dash', col: COL_GOLD, tcol: COL_GOLD_TEXT, label: 'X[' + kS + '] φ_' + kS + '[n]' }],
    [{ kind: 'stem', col: COL_X, label: 'x[n]' }, { kind: 'ring', col: COL_REC, label: 'x_K[n], first K' },
     { kind: 'dash', col: COL_GOLD, tcol: COL_GOLD_TEXT, label: 'X[' + kS + '] φ_' + kS + '[n]' }],
    [{ kind: 'stem', col: COL_X, label: 'x[n]' }, { kind: 'ring', col: COL_REC, label: 'x_K[n]' },
     { kind: 'dash', col: COL_GOLD, tcol: COL_GOLD_TEXT, label: 'X[' + kS + ']φ_' + kS }]
  ], narrow ? margin : P.x0, P.top - 12, (narrow ? canvasWidth - 2 * margin : P.x1 - P.x0), 14, LEFT);
}

function drawError() {
  const P = L1.err;
  const m = maxAbs(st1.err);
  const hi = m > EPS ? niceCeil(m * 1.15) : 1;
  const R = { lo: -hi, hi: hi };
  plotFrame(P, R, [-hi, 0, hi]);
  axisLabels(P, R, narrow ? [0] : [-hi, 0, hi], P.x0 - 5);
  const yz = vY(0, P, R);
  for (let n = 0; n < N; n++) {
    const x = sigX(n), v = st1.err[n];
    if (v === 0) {
      noStroke();
      fill(170);
      circle(x, yz, 4);
      continue;
    }
    const y = vY(v, P, R);
    stroke(COL_ERR[0], COL_ERR[1], COL_ERR[2]);
    strokeWeight(2.5);
    line(x, yz, x, y);
    noStroke();
    fill(COL_ERR[0], COL_ERR[1], COL_ERR[2]);
    circle(x, y, 8);
  }
  if (m <= EPS) {
    noStroke();
    fill(COL_DFT);
    textStyle(BOLD);
    fitText(['e[n] = 0 for every n: all the energy is kept', 'e[n] = 0'], (P.x0 + P.x1) / 2, P.top + P.h / 2 - 9, P.x1 - P.x0 - 10, 14, CENTER);
    textStyle(NORMAL);
  }
  const eS = fmt2(st1.errE);
  const pS = st1.E > EPS ? pct(st1.errE / st1.E) : '—';
  noStroke();
  fill(COL_ERR);
  textStyle(BOLD);
  fitText([
    'error e[n] = x[n] − x_K[n]:  Σe² = ' + eS + ' = Σ_{k≥K} X[k]²  (' + pS + ' of Σx² = ' + fmt2(st1.E) + ')',
    'error e[n]:  Σe² = ' + eS + ' = Σ_{k≥K} X[k]²  (' + pS + ')',
    'error e[n]:  Σe² = ' + eS + '  (' + pS + ' of Σx²)',
    'e[n]: Σe² = ' + eS
  ], narrow ? margin : P.x0, P.top - 12, narrow ? canvasWidth - 2 * margin : P.x1 - P.x0, 14, LEFT);
  textStyle(NORMAL);
}

function dftColX(i) { const P = L1.dft; return P.x0 + (i + 0.5) * (P.x1 - P.x0) / N; }

function drawDFT() {
  const P = L1.dft;
  const R = { lo: 0, hi: st1.hi };
  plotFrame(P, R, [0, R.hi]);
  axisLabels(P, R, [0, R.hi], P.x0 - 4);
  const cw = (P.x1 - P.x0) / N;
  const bw = Math.min(cw * 0.42, 30);
  if (K < N) {
    const xb = (dftColX(K - 1) + dftColX(K)) / 2;
    noStroke();
    fill(COL_DFT[0], COL_DFT[1], COL_DFT[2], 16);
    rect(P.x0 + 1, P.top + 1, xb - P.x0 - 1, P.h - 2);
    stroke(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
    strokeWeight(2);
    drawingContext.setLineDash([5, 4]);
    line(xb, P.top - 4, xb, P.top + P.h + 4);
    drawingContext.setLineDash([]);
  }
  const y0 = vY(0, P, R);
  for (let i = 0; i < N; i++) {
    const x = dftColX(i), v = st1.F[DFT_ORDER[i]];
    const kept = i < K;
    const col = kept ? COL_DFT : COL_DROP;
    const y1 = vY(v, P, R);
    noStroke();
    fill(col[0], col[1], col[2]);
    rect(x - bw / 2, y1, bw, Math.max(1.5, y0 - y1));
    textSize(14);
    if (!narrow) {
      // two decimals when the column is wide enough, otherwise one
      let s = fmt2(v);
      if (advW(s) + 8 > cw) s = (v < 0.05 ? '0' : v.toFixed(1));
      if (advW(s) + 6 <= cw) {
        fill(kept ? color(COL_DFT) : color(130));
        textAlign(CENTER, CENTER);
        text(s, x, Math.max(P.top + 8, y1 - 10));
      }
    }
    fill(70);
    textAlign(CENTER, CENTER);
    text(DFT_LABEL[i], x, P.top + P.h + 9);
  }
  noStroke();
  drawSegsFit([
    [{ t: 'DFT |X_{DFT}[k]|/√8, low to high frequency:  ', c: COL_TEXT }, { t: 'first K', c: COL_DFT }],
    [{ t: 'DFT |X_{DFT}[k]|/√8 by frequency:  ', c: COL_TEXT }, { t: 'first K', c: COL_DFT }],
    [{ t: 'DFT |X_{DFT}[k]|/√8, ', c: COL_TEXT }, { t: 'first K', c: COL_DFT }],
    [{ t: 'DFT ', c: COL_TEXT }, { t: 'first K', c: COL_DFT }]
  ], narrow ? margin : P.x0, P.top - 14, narrow ? canvasWidth - 2 * margin : P.x1 - P.x0, 14, LEFT, false);
}

function drawCumulative() {
  const P = L1.cum;
  const R = { lo: 0, hi: 1 };
  plotFrame(P, R, [0, 0.5, 1]);
  axisLabels(P, R, [0, 0.5, 1], P.x0 - 4, v => Math.round(v * 100) + '%');
  const cx = K2 => P.x0 + (K2 - 0.5) * (P.x1 - P.x0) / N;
  // current K
  stroke(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  strokeWeight(2);
  line(cx(K), P.top, cx(K), P.top + P.h);
  if (st1.E > EPS) {
    for (const tr of [{ v: st1.cumDFT, col: COL_DFT, ring: true }, { v: st1.cumDCT, col: COL_DCT, ring: false }]) {
      noFill();
      stroke(tr.col[0], tr.col[1], tr.col[2]);
      strokeWeight(2);
      beginShape();
      for (let i = 0; i < N; i++) vertex(cx(i + 1), vY(tr.v[i], P, R));
      endShape();
      for (let i = 0; i < N; i++) {
        if (tr.ring) {
          fill(255);
          stroke(tr.col[0], tr.col[1], tr.col[2]);
          strokeWeight(2);
          circle(cx(i + 1), vY(tr.v[i], P, R), 9);
        } else {
          noStroke();
          fill(tr.col[0], tr.col[1], tr.col[2]);
          circle(cx(i + 1), vY(tr.v[i], P, R), 7);
        }
      }
    }
  }
  noStroke();
  fill(70);
  textSize(14);
  textAlign(CENTER, CENTER);
  for (let i = 1; i <= N; i++) text(i, cx(i), P.top + P.h + 9);
  axisLetter('K', P.x1 + 3, P.top + P.h + 9);
  fitLegend([
    [{ kind: 'text', col: COL_TEXT, label: 'Energy in the first K:' }, { kind: 'dot', col: COL_DCT, label: 'DCT' }, { kind: 'ring', col: COL_DFT, label: 'DFT' }],
    [{ kind: 'dot', col: COL_DCT, label: 'DCT' }, { kind: 'ring', col: COL_DFT, label: 'DFT' }]
  ], P.x0, P.top - 13, P.x1 - P.x0, 14, LEFT);
}

// ---------------------------------------------------------------- 2-D view

function draw2D() {
  drawTitle(['DCT Basis Explorer: 2-D 8 × 8 Block', 'DCT Basis Explorer']);
  const ps = psnrText(st2.psnr);
  drawSegsFit([
    [{ t: 'Quantization step Q = ' + Q + ':   ', c: COL_TEXT }, { t: st2.nz + ' of 64 coefficients nonzero', c: COL_DCT },
     { t: '     PSNR = ' + ps, c: COL_X }],
    [{ t: 'Q = ' + Q + ':  ', c: COL_TEXT }, { t: st2.nz + ' of 64 nonzero', c: COL_DCT }, { t: ',  PSNR ' + ps, c: COL_X }],
    [{ t: 'Q = ' + Q + ': ', c: COL_TEXT }, { t: st2.nz + '/64 nonzero', c: COL_DCT }, { t: ', PSNR ' + ps, c: COL_X }]
  ], margin, narrow ? 36 : 40, canvasWidth - 2 * margin, 16, LEFT, true);

  findHover2D();
  drawBasisGrid();
  drawSelectedBasis();
  drawPixelBlock(L2.orig, st2.B, ['Original block x[m, n]', 'Original', 'Original']);
  drawCoefMap();
  drawPixelBlock(L2.rec, st2.R, ['Reconstructed block', 'Reconstructed', 'Rebuilt']);
  drawErrorBlock();
  drawStats();
  drawHoverLine();
}

function psnrText(p) { return p === Infinity ? '∞ (exact)' : p.toFixed(1) + ' dB'; }

// cell rectangle with integer edges, so neighbouring cells never leave seams
function cellRect(x, y, s, i, j) {
  const xa = Math.round(x + j * s / N), xb = Math.round(x + (j + 1) * s / N);
  const ya = Math.round(y + i * s / N), yb = Math.round(y + (i + 1) * s / N);
  return [xa, ya, xb - xa, yb - ya];
}

function tilePos(u, v) {
  const G = L2.grid;
  return { x: G.x + v * (G.t + G.gap), y: G.y + u * (G.t + G.gap) };
}

// the 64 basis images change only with the layout, so they are drawn once into a buffer
function buildBasisImage() {
  const G = L2.grid;
  const key = G.t + '|' + G.w;
  if (key === basisGKey && basisG) return;
  if (basisG) basisG.remove();
  basisG = createGraphics(G.w, G.w);
  basisG.noStroke();
  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      const x = v * (G.t + G.gap), y = u * (G.t + G.gap);
      for (let m = 0; m < N; m++) {
        for (let n = 0; n < N; n++) {
          const val = DMAT[u][m] * DMAT[v][n];               // phi_u[m] phi_v[n], in [-0.25, 0.25]
          basisG.fill(constrain(128 + 127 * val / 0.25, 0, 255));
          const r = cellRect(x, y, G.t, m, n);
          basisG.rect(r[0], r[1], r[2], r[3]);
        }
      }
    }
  }
  basisGKey = key;
}

function drawBasisGrid() {
  const G = L2.grid;
  buildBasisImage();
  image(basisG, G.x, G.y);
  // fade the basis images whose quantized coefficient is 0
  noStroke();
  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      if (st2.Cq[u][v] !== 0) continue;
      const p = tilePos(u, v);
      fill(240, 248, 255, 150);
      rect(p.x, p.y, G.t, G.t);
    }
  }
  const p = tilePos(selU, selV);
  noFill();
  stroke(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  strokeWeight(3);
  rect(p.x - 2, p.y - 2, G.t + 4, G.t + 4);
  // u (rows) and v (columns) indices
  noStroke();
  fill(70);
  textSize(14);
  textAlign(CENTER, CENTER);
  for (let v = 0; v < N; v++) text(v, G.x + v * (G.t + G.gap) + G.t / 2, G.y - 9);
  textAlign(RIGHT, CENTER);
  for (let u = 0; u < N; u++) text(u, G.x - 5, G.y + u * (G.t + G.gap) + G.t / 2);
  textStyle(ITALIC);
  text('u', G.x - 5, G.y - 9);
  textStyle(NORMAL);
  fill(COL_TEXT);
  fitText(['64 basis images φ_u[m] φ_v[n]   (faded: quantized coefficient is 0)', '64 basis images φ_u[m] φ_v[n] (faded: C = 0)',
           'Basis images φ_u[m] φ_v[n] (faded: C = 0)', 'Basis images (faded: C = 0)'],
          margin, L2.capY, L2.gridCapW, 15, LEFT);
}

function drawSelectedBasis() {
  const S = L2.sel;
  const s = S.s;
  // enlarged copy of the selected basis image
  noStroke();
  for (let m = 0; m < N; m++) {
    for (let n = 0; n < N; n++) {
      const val = DMAT[selU][m] * DMAT[selV][n];
      fill(constrain(128 + 127 * val / 0.25, 0, 255));
      const r = cellRect(S.x, S.y, s, m, n);
      rect(r[0], r[1], r[2], r[3]);
    }
  }
  noFill();
  stroke(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  strokeWeight(3);
  rect(S.x - 1, S.y - 1, s + 2, s + 2);
  const c = st2.C[selU][selV], cq = st2.Cq[selU][selV];
  const lines = [
    { t: ['(u, v) = (' + selU + ', ' + selV + ')'], c: COL_GOLD_TEXT, b: true },
    { t: ['= φ_' + selU + '[m] φ_' + selV + '[n]'], c: COL_GOLD_TEXT, b: false },
    { t: ['C = ' + fmt2(c)], c: COL_TEXT, b: false },
    { t: ['quantized: ' + fmtV(cq), 'Q: ' + fmtV(cq)], c: cq === 0 ? COL_ERR : COL_DCT, b: true }
  ];
  const tx = S.below ? S.x : S.textX;
  const ty = S.below ? S.y + s + 14 : S.y + 8;
  const dy = S.below ? 19 : 19;
  noStroke();
  lines.forEach((ln, i) => {
    fill(ln.c);
    textStyle(ln.b ? BOLD : NORMAL);
    fitText(ln.t, tx, ty + i * dy, S.w, 14, LEFT);
  });
  textStyle(NORMAL);
}

function drawPixelBlock(P, B, caps) {
  noStroke();
  for (let m = 0; m < N; m++) {
    for (let n = 0; n < N; n++) {
      fill(B[m][n]);
      const r = cellRect(P.x, P.y, P.b, m, n);
      rect(r[0], r[1], r[2], r[3]);
    }
  }
  noFill();
  stroke(150);
  strokeWeight(1);
  rect(P.x, P.y, P.b, P.b);
  if (hover && hover.kind === 'pix') outlineCell(P, hover.i, hover.j, COL_GOLD);
  noStroke();
  fill(COL_TEXT);
  fitText(caps, P.x, P.y - 12, blockCapW(P), narrow ? 14 : 15, LEFT);
}

// a caption may run into the gap after its block, but never past the canvas edge
function blockCapW(P) { return Math.min(L2.capW, canvasWidth - 6 - P.x); }

function outlineCell(P, i, j, col) {
  const r = cellRect(P.x, P.y, P.b, i, j);
  noFill();
  stroke(col[0], col[1], col[2]);
  strokeWeight(2.5);
  rect(r[0], r[1], r[2], r[3]);
}

function drawCoefMap() {
  const P = L2.coef;
  const lmax = Math.log10(1 + 1024);
  noStroke();
  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      const q = st2.Cq[u][v];
      const r = cellRect(P.x, P.y, P.b, u, v);
      if (q === 0) {
        fill(255);
        rect(r[0], r[1], r[2], r[3]);
        fill(200);
        circle(r[0] + r[2] / 2, r[1] + r[3] / 2, 3);
      } else {
        const t = 0.25 + 0.75 * constrain(Math.log10(1 + Math.abs(q)) / lmax, 0, 1);
        fill(lerp(255, COL_DCT[0], t), lerp(255, COL_DCT[1], t), lerp(255, COL_DCT[2], t));
        rect(r[0], r[1], r[2], r[3]);
      }
    }
  }
  noFill();
  stroke(150);
  strokeWeight(1);
  rect(P.x, P.y, P.b, P.b);
  outlineCell(P, selU, selV, COL_GOLD);
  if (hover && hover.kind === 'coef') outlineCell(P, hover.i, hover.j, [90, 90, 90]);
  noStroke();
  fill(COL_TEXT);
  fitText(['Quantized coefficients |C[u, v]|', 'Quantized |C[u, v]|', 'Quantized |C|'], P.x, P.y - 12, blockCapW(P), narrow ? 14 : 15, LEFT);
}

function drawErrorBlock() {
  const P = L2.err;
  noStroke();
  for (let m = 0; m < N; m++) {
    for (let n = 0; n < N; n++) {
      const t = Math.min(1, Math.abs(st2.err[m][n]) / ERR_FULL);
      fill(lerp(255, COL_ERR[0], t), lerp(255, COL_ERR[1], t), lerp(255, COL_ERR[2], t));
      const r = cellRect(P.x, P.y, P.b, m, n);
      rect(r[0], r[1], r[2], r[3]);
    }
  }
  noFill();
  stroke(150);
  strokeWeight(1);
  rect(P.x, P.y, P.b, P.b);
  if (hover && hover.kind === 'pix') outlineCell(P, hover.i, hover.j, COL_GOLD);
  noStroke();
  fill(COL_ERR);
  fitText(['|Error| (white 0, red ≥ ' + ERR_FULL + ')', '|Error|'], P.x, P.y - 12, Math.max(blockCapW(P), Math.min(P.b + 60, canvasWidth - 6 - P.x) * (narrow ? 0 : 1)), narrow ? 14 : 15, LEFT);
}

function drawStats() {
  const S = L2.stats;
  const items = [
    { c: [COL_TEXT, COL_X], t: ['PSNR = 10·log_{10}(255²/MSE)', 'PSNR = 10 log_{10}(255²/MSE)'] },
    { c: [COL_TEXT], t: ['MSE = ' + fmt2(st2.mse) + ',  max |error| = ' + st2.maxErr, 'MSE ' + fmt2(st2.mse) + ', max |e| ' + st2.maxErr] },
    { c: [COL_DCT], t: ['Nonzero coefficients carry ' + pct(st2.kept) + ' of the energy', 'Nonzero coefs: ' + pct(st2.kept) + ' of energy', pct(st2.kept) + ' of energy kept'] },
    { c: [COL_TEXT], t: ['C = D X D^T,  X = block − 128,  quantized C = Q·round(C/Q)', 'C = D X D^T,  X = block − 128', 'C = D X D^T'] }
  ];
  noStroke();
  textStyle(NORMAL);
  if (S.cols === 2) {
    const cw = (S.w - 20) / 2;
    items.forEach((it, i) => {
      fill(it.c[0]);
      fitText(it.t, S.x + (i % 2) * (cw + 20), S.y + Math.floor(i / 2) * S.dy, cw, S.sz, LEFT);
    });
  } else {
    items.forEach((it, i) => {
      fill(it.c[0]);
      fitText(it.t, S.x, S.y + i * S.dy, S.w, S.sz, LEFT);
    });
  }
}

function drawHoverLine() {
  const H = L2.hover;
  let s, col = COL_TEXT;
  if (hover && hover.kind === 'pix') {
    const i = hover.i, j = hover.j;
    const e = st2.err[i][j];
    s = ['Pixel (m, n) = (' + i + ', ' + j + '):  original ' + st2.B[i][j] + ',  reconstructed ' + st2.R[i][j] + ',  error ' + fmtV(e),
         '(' + i + ', ' + j + '): ' + st2.B[i][j] + ' → ' + st2.R[i][j] + ', error ' + fmtV(e)];
    col = COL_X;
  } else if (hover && hover.kind === 'coef') {
    const u = hover.i, v = hover.j;
    s = ['C[' + u + ', ' + v + '] = ' + fmt2(st2.C[u][v]) + '  →  quantized ' + fmtV(st2.Cq[u][v]) + '   (click to highlight)',
         'C[' + u + ', ' + v + '] = ' + fmt2(st2.C[u][v]) + ' → ' + fmtV(st2.Cq[u][v])];
    col = COL_DCT;
  } else {
    s = ['Point at a block to read pixel values, or at a coefficient to read C[u, v].', 'Point at a block to read its values.'];
    col = [100, 100, 100];
  }
  noStroke();
  fill(col);
  fitText(s, H.x, H.y, H.w, 14, LEFT);
}

function cellAt(P, mx, my) {
  if (mx < P.x || my < P.y || mx >= P.x + P.b || my >= P.y + P.b) return null;
  return { i: Math.min(N - 1, Math.floor((my - P.y) / P.b * N)), j: Math.min(N - 1, Math.floor((mx - P.x) / P.b * N)) };
}

function findHover2D() {
  hover = null;
  for (const P of [L2.orig, L2.rec, L2.err]) {
    const c = cellAt(P, mouseX, mouseY);
    if (c) { hover = { kind: 'pix', i: c.i, j: c.j }; return; }
  }
  const c = cellAt(L2.coef, mouseX, mouseY);
  if (c) hover = { kind: 'coef', i: c.i, j: c.j };
}

function tileAt(mx, my) {
  const G = L2.grid;
  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      const p = tilePos(u, v);
      if (mx >= p.x - 1 && mx <= p.x + G.t + 1 && my >= p.y - 1 && my <= p.y + G.t + 1) return { u: u, v: v };
    }
  }
  return null;
}

// ---------------------------------------------------------------- mouse

function mousePressed() {
  if (mouseX < 0 || mouseX > canvasWidth || mouseY < 0 || mouseY > drawHeight) return;
  if (view === '1d') {
    for (let k = 0; k < N; k++) {
      const p = L1.basis[k];
      if (mouseX >= p.x && mouseX <= p.x + p.w && mouseY >= p.y - 18 && mouseY <= p.y + p.h) { selK = k; return; }
    }
    const C = L1.coef;
    if (mouseY >= C.top - 4 && mouseY <= C.top + C.h + 18 && mouseX >= C.x0 && mouseX <= C.x1) {
      let best = 0;
      for (let k = 1; k < N; k++) if (Math.abs(coefColX(k) - mouseX) < Math.abs(coefColX(best) - mouseX)) best = k;
      selK = best;
      return;
    }
    const P = L1.sig;
    if (mouseX >= P.x0 && mouseX <= P.x1 && mouseY >= P.top - 6 && mouseY <= P.top + P.h + 6) {
      dragN = constrain(Math.floor((mouseX - P.x0) / (P.x1 - P.x0) * N), 0, N - 1);
      setSample();
      return false;
    }
  } else {
    const t = tileAt(mouseX, mouseY);
    if (t) { selU = t.u; selV = t.v; return; }
    const c = cellAt(L2.coef, mouseX, mouseY);
    if (c) { selU = c.i; selV = c.j; }
  }
}

function mouseDragged() {
  if (dragN >= 0) { setSample(); return false; }
}

function mouseReleased() { dragN = -1; }

function setSample() {
  const P = L1.sig;
  const v = ((P.top + P.h / 2) - mouseY) / (P.h / 2) * Y_MAX;
  xs[dragN] = constrain(Math.round(v * 10) / 10, -Y_MAX, Y_MAX);
  if (sigKey !== 'custom') {
    sigKey = 'custom';
    signalSelect.selected('custom');
  }
}

// ---------------------------------------------------------------- controls

function rowY(i) { return drawHeight + 18 + 32 * i; }

function drawControlLabels() {
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  textSize(defaultTextSize);
  if (!narrow) {
    text('View:', 10, rowY(0));
    text(view === '1d' ? 'Signal:' : 'Block:', 252, rowY(0));
  }
  if (view === '1d') {
    richText(narrow ? 'K = ' + K : 'Coefficients kept K = ' + K + ' of 8', 10, rowY(1), defaultTextSize, LEFT);
  } else {
    richText(narrow ? 'Q = ' + Q : 'Quantization step Q = ' + Q, 10, rowY(1), defaultTextSize, LEFT);
  }
  fill(90);
  const hint = view === '1d'
    ? ['Click a basis function or a bar to highlight it (gold); drag a blue sample to edit x[n].',
       'Tap a basis function to highlight it; drag a sample to edit x[n].', 'Drag a sample to edit x[n].']
    : ['Click a basis image or a coefficient to highlight it; Q·round(C/Q) sets |C| < Q/2 to 0.',
       'Tap a basis image to highlight it; |C| < Q/2 becomes 0.', 'Coefficients with |C| < Q/2 become 0.'];
  fitText(hint, 10, rowY(2), canvasWidth - 20, 14, LEFT);
}

function layoutControls(force) {
  if (typeof qSlider === 'undefined') return;
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  const nar = canvasWidth < 640;
  if (nar) {
    viewSelect.position(10, rowY(0) - 12);
    viewSelect.style('width', '150px');
    const px = 170;
    const pw = Math.min(220, canvasWidth - px - margin);
    for (const s of [signalSelect, blockSelect]) {
      s.position(px, rowY(0) - 12);
      s.style('width', pw + 'px');
    }
  } else {
    viewSelect.position(62, rowY(0) - 12);
    viewSelect.style('width', '170px');
    for (const s of [signalSelect, blockSelect]) {
      s.position(310, rowY(0) - 12);
      s.style('width', '220px');
    }
  }
  const sl = nar ? 78 : 250;
  const sw = Math.max(80, canvasWidth - sl - margin);
  for (const s of [kSlider, qSlider]) {
    s.position(sl, rowY(1) - 10);
    s.size(sw);
  }
}

// ---------------------------------------------------------------- legend and text helpers

// legend items: { kind: 'stem' | 'ring' | 'dot' | 'dash' | 'text', col, tcol (optional text color), label }
function legendWidth(items, sz) {
  let w = 0;
  items.forEach((it, i) => {
    w += (it.kind === 'text' ? 0 : (it.kind === 'dash' ? 24 : 16)) + richWidth(it.label, sz) + (i < items.length - 1 ? 14 : 0);
  });
  return w;
}

function drawLegend(items, x, y, sz) {
  let cx = x;
  for (const it of items) {
    const c = it.col;
    if (it.kind === 'stem') {
      stroke(c[0], c[1], c[2]);
      strokeWeight(2);
      line(cx + 6, y + 6, cx + 6, y - 2);
      noStroke();
      fill(c[0], c[1], c[2]);
      circle(cx + 6, y - 3, 7);
    } else if (it.kind === 'ring') {
      fill(255);
      stroke(c[0], c[1], c[2]);
      strokeWeight(2);
      circle(cx + 6, y, 10);
    } else if (it.kind === 'dot') {
      noStroke();
      fill(c[0], c[1], c[2]);
      circle(cx + 6, y, 8);
    } else if (it.kind === 'dash') {
      stroke(c[0], c[1], c[2]);
      strokeWeight(2);
      line(cx, y, cx + 7, y);
      line(cx + 11, y, cx + 18, y);
    }
    if (it.kind !== 'text') cx += it.kind === 'dash' ? 24 : 16;
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

// a line made of coloured segments: [{ t, c }]
function segsWidth(segs, sz) { return segs.reduce((w, s) => w + richWidth(s.t, sz), 0); }

function drawSegsFit(cands, x, y, maxW, sz, align, bold) {
  textStyle(bold ? BOLD : NORMAL);
  let pick = cands[cands.length - 1];
  for (const c of cands) {
    if (segsWidth(c, sz) <= maxW) { pick = c; break; }
  }
  const w = segsWidth(pick, sz);
  let cx = align === CENTER ? x - w / 2 : (align === RIGHT ? x - w : x);
  noStroke();
  for (const s of pick) {
    fill(s.c[0], s.c[1], s.c[2]);
    richText(s.t, cx, y, sz, LEFT);
    cx += richWidth(s.t, sz);
  }
  textStyle(NORMAL);
}

// Rich text: "x_K" draws K as a subscript, "x_{DFT}" a longer subscript, "D^T" a superscript
function parseRich(s) {
  const out = [];
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ((ch === '_' || ch === '^') && i + 1 < s.length) {
      if (buf) { out.push({ t: buf, sub: false, sup: false }); buf = ''; }
      let piece;
      if (s[i + 1] === '{') {
        const end = s.indexOf('}', i + 2);
        piece = s.slice(i + 2, end < 0 ? s.length : end);
        i = end < 0 ? s.length : end;
      } else {
        piece = s[i + 1];
        i++;
      }
      out.push({ t: piece, sub: ch === '_', sup: ch === '^' });
    } else {
      buf += ch;
    }
  }
  if (buf) out.push({ t: buf, sub: false, sup: false });
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
    textSize(p.sub || p.sup ? sz * 0.72 : sz);
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
    textSize(p.sub || p.sup ? sz * 0.72 : sz);
    text(p.t, cx, p.sub ? y + sz * 0.3 : (p.sup ? y - sz * 0.32 : y));
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

// number with exactly two decimals and a true minus sign (never "−0.00")
function fmt2(v) {
  const r = Number(v.toFixed(2));
  if (Math.abs(r) < 1e-12) return '0.00';
  return (r < 0 ? '−' : '') + Math.abs(r).toFixed(2);
}

function pct(f) {
  if (!(f >= 0)) return '—';
  return (100 * f).toFixed(2) + '%';
}

// ---------------------------------------------------------------- responsive layout

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  if (canvasWidth !== layoutWidth) computeLayout();
  layoutControls(false);
}
