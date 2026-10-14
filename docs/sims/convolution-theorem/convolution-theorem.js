// Convolution Theorem and Circular Convolution MicroSim
// CANVAS_HEIGHT: 742
// Compares the linear convolution y[n] = x[n] * h[n] (length N + M - 1) with the L-point
// circular convolution y_c[n] = sum_m y[n + mL], computed two ways: by wrapping y onto itself
// and by the DFT route IDFT_L(DFT_L(x) DFT_L(h)). When L < N + M - 1 the tail of y wraps
// around onto its first samples (time aliasing); those samples are drawn in red and joined
// by arrows to where they land. The bottom panel shows |X[k]|, |H[k]| and |Y[k]| = |X[k]||H[k]|.

// Canvas dimensions
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let drawHeight = 606;
let controlHeight = 136;
let canvasHeight = drawHeight + controlHeight;
let margin = 16;
let defaultTextSize = 16;

// Controls
let xSelect, hSelect;
let nSlider, mSlider, lSlider;
let showXCheckbox, showHCheckbox, showYCheckbox;

// Sequence library and limits
const MAX_LEN = 16;                  // N, M <= 16
const MAX_L = 64;                    // transform length L <= 64
const SEQS = [
  { key: 'rect',  label: 'rectangle' },
  { key: 'tri',   label: 'triangle' },
  { key: 'exp',   label: 'exponential 0.8ⁿ' },
  { key: 'alt',   label: 'alternating (−1)ⁿ' },
  { key: 'rand',  label: 'random' },
  { key: 'delta', label: 'impulse δ[n]' },
  { key: 'delay', label: 'delayed impulse' }
];
const SEED_X = 7, SEED_H = 23;       // fixed seeds: the "random" sequences are reproducible
const EPS = 1e-9;

// Colors
const COL_X = [25, 90, 200];         // x[n] and |X[k]|: blue
const COL_H = [130, 50, 175];        // h[n] and |H[k]|: purple
const COL_Y = [30, 130, 70];         // linear convolution: green
const COL_C = [0, 115, 140];         // circular convolution: teal
const COL_DFT = [200, 145, 0];       // IDFT(X·H) rings: gold
const COL_DFT_TEXT = [150, 105, 0];
const COL_ERR = [205, 35, 35];       // wrap-around, aliasing and error: red
const COL_YS = [128, 0, 0];          // |Y[k]|: maroon
const COL_ZERO = [165, 165, 165];

// Panel geometry: y positions are fixed, x positions follow the canvas width
const PANEL = {
  A: { top: 90,  h: 62 },            // x[n] and h[n]
  B: { top: 192, h: 70 },            // linear convolution
  C: { top: 314, h: 70 },            // circular convolution
  D: { top: 424, h: 46 },            // error
  E: { top: 510, h: 72 }             // magnitude spectra
};
let plotL = 46, plotR = 886;
let ctl = { narrow: false, lenLabelX: 244 };
let layoutWidth = -1;                // canvas width the controls were last laid out for

// Computed state (rebuilt only when a control changes)
let st = { stateKey: '' };
let selectedK = 1;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  xSelect = createSelect();
  hSelect = createSelect();
  for (const s of SEQS) {
    xSelect.option(s.label, s.key);
    hSelect.option(s.label, s.key);
  }
  xSelect.selected('tri');
  hSelect.selected('rect');
  xSelect.style('font-size', '15px');
  hSelect.style('font-size', '15px');

  nSlider = createSlider(1, MAX_LEN, 8, 1);
  mSlider = createSlider(1, MAX_LEN, 4, 1);
  lSlider = createSlider(8, MAX_L, 8, 1);

  showXCheckbox = createCheckbox('|X[k]|', true);
  showHCheckbox = createCheckbox('|H[k]|', true);
  showYCheckbox = createCheckbox('|Y[k]|', true);
  for (const c of [showXCheckbox, showHCheckbox, showYCheckbox]) c.style('font-size', '16px');

  layoutControls();
  describe('Five stacked stem plots compare linear and circular convolution. Top: the input x[n] and the impulse response h[n]. ' +
    'Second: the linear convolution y[n] of length N + M - 1. Third: the L-point circular convolution, with gold rings showing the ' +
    'result of the DFT route IDFT(DFT(x) times DFT(h)). When L is shorter than N + M - 1 the samples of y beyond L are drawn in red ' +
    'and arrows show where they wrap around. Fourth: the error between circular and linear convolution. Bottom: the DFT magnitudes ' +
    '|X[k]|, |H[k]| and |Y[k]|. Drop-down lists and sliders choose the two sequences, their lengths N and M, and the transform length L.');
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
  drawInputs();
  drawLinear();
  drawCircular();
  drawWrapArrows();
  timeTicks(PANEL.B);
  drawError();
  drawSpectra();
  drawControlLabels();
}

// ---------------------------------------------------------------- state and math

function readState() {
  const N = Number(nSlider.value());
  const M = Number(mSlider.value());
  const minL = Math.max(N, M);
  if (Number(lSlider.elt.min) !== minL) {
    lSlider.elt.min = minL;                    // L can never be shorter than either sequence
    if (Number(lSlider.value()) < minL) lSlider.value(minL);
  }
  st.N = N;
  st.M = M;
  st.L = Math.max(minL, Number(lSlider.value()));
  st.xType = xSelect.value();
  st.hType = hSelect.value();
  st.showX = showXCheckbox.checked();
  st.showH = showHCheckbox.checked();
  st.showY = showYCheckbox.checked();
}

// Small seeded PRNG so the random sequences are the same on every load
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

function makeSeq(type, len, seed) {
  const rnd = seededRandom(seed);
  const out = [];
  for (let n = 0; n < len; n++) {
    const r = rnd();
    let v = 0;
    switch (type) {
      case 'rect':  v = 1; break;
      case 'tri':   v = Math.min(n + 1, len - n); break;           // 1, 2, ..., peak, ..., 2, 1
      case 'exp':   v = Math.pow(0.8, n); break;
      case 'alt':   v = (n % 2 === 0) ? 1 : -1; break;
      case 'rand':  v = Math.round((2 * r - 1) * 10) / 10 + 0; break; // one decimal in [-1, 1]
      case 'delta': v = (n === 0) ? 1 : 0; break;
      case 'delay': v = (n === len - 1) ? 1 : 0; break;            // impulse on the last sample
    }
    out.push(v);
  }
  return out;
}

// Naive O(L^2) DFT of a sequence zero-padded to L samples
function dftPadded(seq, L) {
  const out = [];
  for (let k = 0; k < L; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < seq.length; n++) {     // samples seq.length .. L-1 are the zero padding
      const a = -2 * Math.PI * ((k * n) % L) / L;
      re += seq[n] * Math.cos(a);
      im += seq[n] * Math.sin(a);
    }
    out.push({ re: re, im: im });
  }
  return out;
}

// Real part of the inverse DFT
function idftReal(Y, L) {
  const out = [];
  for (let n = 0; n < L; n++) {
    let s = 0;
    for (let k = 0; k < L; k++) {
      const a = 2 * Math.PI * ((k * n) % L) / L;
      s += Y[k].re * Math.cos(a) - Y[k].im * Math.sin(a);
    }
    out.push(s / L);
  }
  return out;
}

function computeAll() {
  const stateKey = [st.xType, st.hType, st.N, st.M, st.L].join('|');
  if (stateKey === st.stateKey) return;
  st.stateKey = stateKey;
  const N = st.N, M = st.M, L = st.L;

  const x = makeSeq(st.xType, N, SEED_X);
  const h = makeSeq(st.hType, M, SEED_H);

  // linear convolution, length N + M - 1
  const lenY = N + M - 1;
  const y = new Array(lenY).fill(0);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) y[i + j] += x[i] * h[j];
  }

  // L-point circular convolution by wrapping: y_c[n] = sum over m of y[n + mL]
  const yc = new Array(L).fill(0);
  const terms = [];
  const aliased = new Array(L).fill(false);
  for (let n = 0; n < L; n++) terms.push([]);
  for (let n = 0; n < lenY; n++) {
    yc[n % L] += y[n];
    terms[n % L].push(y[n]);
    if (n >= L && Math.abs(y[n]) > EPS) aliased[n % L] = true;
  }

  // the DFT route: y_d = IDFT_L( DFT_L(x) · DFT_L(h) )
  const X = dftPadded(x, L);
  const H = dftPadded(h, L);
  const Y = X.map((a, k) => ({ re: a.re * H[k].re - a.im * H[k].im, im: a.re * H[k].im + a.im * H[k].re }));
  const yd = idftReal(Y, L);
  let dftDiff = 0;
  for (let n = 0; n < L; n++) dftDiff = Math.max(dftDiff, Math.abs(yd[n] - yc[n]));

  // error between circular and linear convolution (each is zero outside its own length)
  const nAxis = Math.max(L, lenY);
  const err = [];
  let maxErr = 0;
  for (let n = 0; n < nAxis; n++) {
    let v = (n < L ? yc[n] : 0) - (n < lenY ? y[n] : 0);
    if (Math.abs(v) < EPS) v = 0;
    err.push(v);
    maxErr = Math.max(maxErr, Math.abs(v));
  }

  const magX = X.map(c => Math.hypot(c.re, c.im));
  const magH = H.map(c => Math.hypot(c.re, c.im));
  const magY = Y.map(c => Math.hypot(c.re, c.im));
  const maxX = Math.max(...magX), maxH = Math.max(...magH);

  // vertical ranges: the linear and circular panels share one scale
  const mBC = Math.max(maxAbs(y), maxAbs(yc), maxAbs(yd), EPS);
  const negBC = y.some(v => v < -EPS) || yc.some(v => v < -EPS);
  const hiBC = niceCeil(mBC * 1.22);
  const hiE = maxErr > 0 ? niceCeil(maxErr * 1.1) : 1;

  Object.assign(st, {
    x: x, h: h, y: y, lenY: lenY, yc: yc, yd: yd, terms: terms, aliased: aliased,
    dftDiff: dftDiff, nAxis: nAxis, err: err, maxErr: maxErr,
    wrapCount: Math.max(0, lenY - L),
    magX: magX, magH: magH, magY: magY,
    maxX: maxX > EPS ? maxX : 1, maxH: maxH > EPS ? maxH : 1,
    rangeX: seqRange(x), rangeH: seqRange(h),
    rangeBC: { lo: negBC ? -hiBC : 0, hi: hiBC },
    rangeE: { lo: -hiE, hi: hiE }
  });
}

function maxAbs(a) { return a.reduce((m, v) => Math.max(m, Math.abs(v)), 0); }

function seqRange(vals) {
  const hi = niceCeil(Math.max(maxAbs(vals), EPS) * 1.08);
  return { lo: vals.some(v => v < -EPS) ? -hi : 0, hi: hi };
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

function tDx() { return (plotR - plotL) / st.nAxis; }
function tX(n) { return plotL + (n + 0.5) * tDx(); }
function kDx() { return (plotR - plotL) / st.L; }
function kX(k) { return plotL + (k + 0.5) * kDx(); }
function vY(v, P, R) { return P.top + P.h - (v - R.lo) / (R.hi - R.lo) * P.h; }
function boundaryX() { return plotL + st.L * tDx(); }   // between n = L - 1 and n = L

function tickStep(dx, minPx) {
  for (const s of [1, 2, 4, 8, 16, 32]) if (s * dx >= minPx) return s;
  return 64;
}

// ---------------------------------------------------------------- drawing: header

function drawHeader() {
  const N = st.N, M = st.M, L = st.L, lenY = st.lenY;
  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(['Convolution Theorem: Linear vs Circular Convolution', 'Convolution Theorem'],
          canvasWidth / 2, 14, canvasWidth - 20, 20, CENTER);
  textStyle(NORMAL);

  fill(40);
  st.lineReq = fitText([
    'Required L ≥ N + M − 1 = ' + N + ' + ' + M + ' − 1 = ' + lenY + '.   Chosen L = ' + L +
      ' (x and h are zero-padded to ' + L + ' samples)',
    'Required L ≥ N + M − 1 = ' + N + ' + ' + M + ' − 1 = ' + lenY + ';  chosen L = ' + L,
    'Need L ≥ N + M − 1 = ' + lenY + ';  L = ' + L,
    'Need L ≥ ' + lenY + ';  L = ' + L
  ], margin, 38, canvasWidth - 2 * margin, 16, LEFT);

  const e = fmtV(st.maxErr);
  const w = st.wrapCount;
  const samples = w === 1 ? '1 sample of y wraps' : w + ' samples of y wrap';
  let cands;
  if (L >= lenY) {
    fill(COL_Y);
    cands = ['L = ' + L + ' ≥ ' + lenY + ': nothing wraps around, so circular = linear (max error = 0)',
             'L ≥ ' + lenY + ': circular = linear (max error = 0)',
             'circular = linear'];
  } else if (st.maxErr === 0) {
    fill(COL_Y);
    cands = ['L = ' + L + ' < ' + lenY + ', but the ' + (w === 1 ? 'sample that wraps is' : w + ' samples that wrap are all') +
               ' 0, so circular = linear (max error = 0)',
             'wrapped samples are all 0: circular = linear',
             'circular = linear'];
  } else {
    fill(COL_ERR);
    cands = ['L = ' + L + ' < ' + lenY + ': ' + samples + ' around (time aliasing), so circular ≠ linear;  max error = ' + e,
             samples + ' around: circular ≠ linear, max error = ' + e,
             'circular ≠ linear, max error = ' + e];
  }
  textStyle(BOLD);
  st.lineStatus = fitText(cands, margin, 60, canvasWidth - 2 * margin, 16, LEFT);
  textStyle(NORMAL);
}

// ---------------------------------------------------------------- drawing: frames and stems

// White plot frame with grid lines at the given values and amplitude labels on the left
function drawFrame(x0, x1, P, R, labels) {
  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(x0, P.top, x1 - x0, P.h);
  const vals = labels || [R.lo, 0, R.hi].filter((v, i, a) => a.indexOf(v) === i);
  for (const v of vals) {
    stroke(v === 0 ? 120 : 228);
    line(x0, vY(v, P, R), x1, vY(v, P, R));
  }
  noStroke();
  fill(70);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (const v of vals) text(fmtV(v), x0 - 5, vY(v, P, R));
}

function stemAt(x, v, P, R, col, d, w) {
  const y0 = vY(0, P, R);
  if (v === 0 || Math.abs(v) < EPS) {
    noStroke();
    fill(COL_ZERO);
    circle(x, y0, Math.max(3, d * 0.55));
    return;
  }
  const yv = vY(v, P, R);
  stroke(col[0], col[1], col[2]);
  strokeWeight(w);
  line(x, y0, x, yv);
  noStroke();
  fill(col[0], col[1], col[2]);
  circle(x, yv, d);
}

function dotSize(dx) { return constrain(dx * 0.42, 4, 9); }
function stemWeight(dx) { return dx >= 10 ? 2 : 1.4; }

// labels under a panel on the shared time axis (drawn with a background so arrows pass behind them)
function timeTicks(P) {
  const dx = tDx();
  const every = tickStep(dx, 30);
  const y = P.top + P.h + 9;
  textSize(14);
  textAlign(CENTER, CENTER);
  for (let n = 0; n < st.nAxis; n += every) {
    const s = String(n);
    const w = advW(s) + 6;
    noStroke();
    fill(240, 248, 255);
    rect(tX(n) - w / 2, y - 8, w, 16);
    fill(70);
    text(s, tX(n), y);
  }
  fill(70);
  textAlign(RIGHT, CENTER);
  textStyle(ITALIC);
  text('n', plotL - 6, y);
  textStyle(NORMAL);
}

// dashed line between n = L - 1 and n = L
function drawBoundary(P, label) {
  if (st.L >= st.nAxis) return;
  const xb = boundaryX();
  stroke(COL_ERR[0], COL_ERR[1], COL_ERR[2], 170);
  strokeWeight(1.5);
  drawingContext.setLineDash([5, 4]);
  line(xb, P.top, xb, P.top + P.h);
  drawingContext.setLineDash([]);
  if (label && plotR - xb > advW(label) + 12) {
    noStroke();
    fill(COL_ERR);
    textSize(14);
    textAlign(RIGHT, BOTTOM);
    text(label, plotR - 4, P.top + P.h - 3);
  }
}

// value label above (or below) a stem, only when it fits the sample spacing
function stemLabel(s, x, v, P, R, col, maxW) {
  textSize(14);
  if (advW(s) > maxW) return false;
  const yv = vY(v, P, R);
  const yl = v >= 0 ? Math.max(P.top + 8, yv - 11) : Math.min(P.top + P.h - 8, yv + 11);
  noStroke();
  fill(255, 255, 255, 200);
  const w = advW(s) + 4;
  rect(x - w / 2, yl - 8, w, 16, 3);
  fill(col[0], col[1], col[2]);
  textAlign(CENTER, CENTER);
  text(s, x, yl);
  return true;
}

// ---------------------------------------------------------------- panel A: x[n] and h[n]

function drawInputs() {
  const P = PANEL.A;
  const gap = 46;
  const wHalf = (plotR - plotL - gap) / 2;
  const subs = [
    { x0: plotL, x1: plotL + wHalf, seq: st.x, len: st.N, R: st.rangeX, col: COL_X,
      name: 'x[n]', lenName: 'N', type: st.xType },
    { x0: plotL + wHalf + gap, x1: plotR, seq: st.h, len: st.M, R: st.rangeH, col: COL_H,
      name: 'h[n]', lenName: 'M', type: st.hType }
  ];
  for (const sp of subs) {
    drawFrame(sp.x0, sp.x1, P, sp.R);
    const dx = (sp.x1 - sp.x0) / MAX_LEN;
    const d = dotSize(dx), w = stemWeight(dx);
    for (let n = 0; n < MAX_LEN; n++) {
      const v = n < sp.len ? sp.seq[n] : 0;
      stemAt(sp.x0 + (n + 0.5) * dx, v, P, sp.R, sp.col, d, w);
    }
    // n axis labels
    const every = tickStep(dx, 24);
    noStroke();
    fill(70);
    textSize(14);
    textAlign(CENTER, CENTER);
    for (let n = 0; n < MAX_LEN; n += every) text(n, sp.x0 + (n + 0.5) * dx, P.top + P.h + 9);
    // caption
    const label = SEQS.find(s => s.key === sp.type).label;
    fill(sp.col);
    textStyle(BOLD);
    fitText([sp.name + ': ' + label + ', ' + sp.lenName + ' = ' + sp.len,
             sp.name + ', ' + sp.lenName + ' = ' + sp.len, sp.name],
            sp.x0, P.top - 10, sp.x1 - sp.x0, 15, LEFT);
    textStyle(NORMAL);
  }
  fill(70);
  textAlign(RIGHT, CENTER);
  textStyle(ITALIC);
  textSize(14);
  text('n', plotL - 6, P.top + P.h + 9);
  textStyle(NORMAL);
}

// ---------------------------------------------------------------- panel B: linear convolution

function drawLinear() {
  const P = PANEL.B, R = st.rangeBC;
  drawFrame(plotL, plotR, P, R);
  const dx = tDx(), d = dotSize(dx), w = stemWeight(dx);
  const wraps = st.lenY > st.L;

  // samples at n >= L have nowhere to go in an L-point result: they wrap to n - L
  if (wraps) {
    noStroke();
    fill(COL_ERR[0], COL_ERR[1], COL_ERR[2], 24);
    rect(boundaryX(), P.top + 1, plotR - boundaryX() - 1, P.h - 2);
  }
  for (let n = 0; n < st.nAxis; n++) {
    const v = n < st.lenY ? st.y[n] : 0;
    stemAt(tX(n), v, P, R, n >= st.L ? COL_ERR : COL_Y, d, w);
  }
  for (let n = st.L; n < st.lenY; n++) {
    if (Math.abs(st.y[n]) > EPS) stemLabel(fmtV(st.y[n]), tX(n), st.y[n], P, R, COL_ERR, dx - 4);
  }
  drawBoundary(P, null);

  const items = [{ kind: 'stem', col: COL_Y, label: 'y[n] = x[n] ∗ h[n], linear convolution, N + M − 1 = ' + st.lenY + ' samples' }];
  const short = [{ kind: 'stem', col: COL_Y, label: 'linear y[n], ' + st.lenY + ' samples' }];
  const tiny = [{ kind: 'stem', col: COL_Y, label: 'linear y[n]' }];
  if (wraps) {
    items.push({ kind: 'stem', col: COL_ERR, label: 'n ≥ L: wraps to n − L' });
    short.push({ kind: 'stem', col: COL_ERR, label: 'wraps' });
    tiny.push({ kind: 'stem', col: COL_ERR, label: 'wraps' });
  }
  fitLegend([items, short, tiny], plotL, P.top - 10, plotR - plotL, 14, LEFT);
}

// ---------------------------------------------------------------- panel C: circular convolution

function drawCircular() {
  const P = PANEL.C, R = st.rangeBC;
  drawFrame(plotL, plotR, P, R);
  const dx = tDx(), d = dotSize(dx), w = stemWeight(dx);

  // an L-point result has no samples at n >= L
  if (st.nAxis > st.L) {
    const xb = boundaryX();
    noStroke();
    fill(232);
    rect(xb, P.top + 1, plotR - xb - 1, P.h - 2);
    fill(110);
    textSize(14);
    textAlign(CENTER, CENTER);
    const msg = ['y_c[n] has only L = ' + st.L + ' samples', 'only L samples', ''];
    for (const m of msg) {
      if (richWidth(m, 14) <= plotR - xb - 10) { richText(m, (xb + plotR) / 2, P.top + P.h / 2, 14, CENTER); break; }
    }
  }
  for (let n = 0; n < st.L; n++) {
    stemAt(tX(n), st.yc[n], P, R, st.aliased[n] ? COL_ERR : COL_C, d, w);
  }
  // the DFT route lands on the same values (gold rings)
  noFill();
  stroke(COL_DFT[0], COL_DFT[1], COL_DFT[2]);
  strokeWeight(dx >= 10 ? 2 : 1.4);
  for (let n = 0; n < st.L; n++) circle(tX(n), vY(st.yd[n], P, R), d + 7);

  // the aliased samples show their sums, e.g. 1+6
  for (let n = 0; n < st.L; n++) {
    if (!st.aliased[n]) continue;
    const t = st.terms[n];
    let s = fmtV(t[0]);
    for (let i = 1; i < t.length; i++) s += (t[i] < 0 ? '−' : '+') + fmtV(Math.abs(t[i]));
    for (const lab of [s + '=' + fmtV(st.yc[n]), s, fmtV(st.yc[n])]) {
      if (stemLabel(lab, tX(n), st.yc[n], P, R, COL_ERR, dx - 4)) break;
    }
  }
  drawBoundary(P, null);
  timeTicks(P);

  // caption, right-aligned so the wrap arrows land to its left
  const anyAlias = st.aliased.some(a => a);
  const diff = fmtSci(st.dftDiff);
  const c1 = [{ kind: 'stem', col: COL_C, label: 'circular y_c[n] = Σ_m y[n + mL], L = ' + st.L }];
  const c1b = [{ kind: 'stem', col: COL_C, label: 'circular y_c[n], L = ' + st.L }];
  const c2 = [{ kind: 'stem', col: COL_C, label: 'circular y_c[n], L = ' + st.L }];
  const c3 = [{ kind: 'stem', col: COL_C, label: 'y_c[n]' }];
  const c4 = [{ kind: 'stem', col: COL_C, label: 'y_c' }, { kind: 'ring', col: COL_DFT, tcol: COL_DFT_TEXT, label: 'IDFT' }];
  if (anyAlias) {
    c1.push({ kind: 'stem', col: COL_ERR, label: 'time-aliased' });
    c1b.push({ kind: 'stem', col: COL_ERR, label: 'aliased' });
    c2.push({ kind: 'stem', col: COL_ERR, label: 'aliased' });
  }
  c1b.push({ kind: 'ring', col: COL_DFT, tcol: COL_DFT_TEXT, label: 'IDFT(X·H), differs by ' + diff });
  c1.push({ kind: 'ring', col: COL_DFT, tcol: COL_DFT_TEXT, label: 'IDFT_L(X·H), differs by ' + diff });
  c2.push({ kind: 'ring', col: COL_DFT, tcol: COL_DFT_TEXT, label: 'IDFT(X·H)' });
  c3.push({ kind: 'ring', col: COL_DFT, tcol: COL_DFT_TEXT, label: 'IDFT(X·H)' });
  // keep the caption to the right of the last arrow target
  let lastTarget = -1;
  for (let n = 0; n < st.L; n++) if (st.aliased[n]) lastTarget = n;
  const leftEdge = lastTarget >= 0 ? tX(lastTarget) + dx / 2 + 14 : plotL;
  st.legendC = fitLegend([c1, c1b, c2, c3, c4], plotR, P.top - 10, plotR - leftEdge, 14, RIGHT);
}

// arrows from each non-zero sample of y at n >= L down to the circular sample n mod L
function drawWrapArrows() {
  if (st.lenY <= st.L) return;
  const PB = PANEL.B, PC = PANEL.C;
  const y0 = PB.top + PB.h + 1, y1 = PC.top - 3, ym = (y0 + y1) / 2;
  for (let n = st.L; n < st.lenY; n++) {
    if (Math.abs(st.y[n]) <= EPS) continue;
    const x0 = tX(n), x1 = tX(n % st.L);
    stroke(COL_ERR[0], COL_ERR[1], COL_ERR[2], 165);
    strokeWeight(1.6);
    noFill();
    beginShape();
    for (let i = 0; i <= 28; i++) {
      const t = i / 28, u = 1 - t;
      const bx = u * u * u * x0 + 3 * u * u * t * x0 + 3 * u * t * t * x1 + t * t * t * x1;
      const by = u * u * u * y0 + 3 * u * u * t * ym + 3 * u * t * t * ym + t * t * t * y1;
      vertex(bx, by);
    }
    endShape();
    noStroke();
    fill(COL_ERR[0], COL_ERR[1], COL_ERR[2], 210);
    triangle(x1, y1 + 2, x1 - 4.5, y1 - 6, x1 + 4.5, y1 - 6);
  }
}

// ---------------------------------------------------------------- panel D: error

function drawError() {
  const P = PANEL.D, R = st.rangeE;
  drawFrame(plotL, plotR, P, R);
  const dx = tDx(), d = dotSize(dx), w = stemWeight(dx);
  for (let n = 0; n < st.nAxis; n++) stemAt(tX(n), st.err[n], P, R, COL_ERR, d, w);
  drawBoundary(P, null);
  if (st.maxErr === 0) {
    noStroke();
    fill(COL_Y);
    textSize(14);
    textStyle(BOLD);
    textAlign(CENTER, BOTTOM);
    fitText(['e[n] = 0 for every n: the circular result equals the linear one', 'e[n] = 0 for every n', 'e = 0'],
            (plotL + plotR) / 2, P.top + P.h / 2 - 9, plotR - plotL - 10, 14, CENTER);
    textStyle(NORMAL);
  }
  timeTicks(P);

  const left = [[{ kind: 'stem', col: COL_ERR, label: 'error e[n] = y_c[n] − y[n]  (y_c = 0 for n ≥ L)' }],
                [{ kind: 'stem', col: COL_ERR, label: 'error e[n] = y_c[n] − y[n]' }],
                [{ kind: 'stem', col: COL_ERR, label: 'e[n]' }]];
  const right = 'max error = ' + fmtV(st.maxErr);
  textSize(14);
  textStyle(BOLD);
  const rw = richWidth(right, 14);
  noStroke();
  fill(st.maxErr === 0 ? COL_Y : COL_ERR);
  richText(right, plotR, P.top - 10, 14, RIGHT);
  textStyle(NORMAL);
  fitLegend(left, plotL, P.top - 10, plotR - plotL - rw - 16, 14, LEFT);
}

// ---------------------------------------------------------------- panel E: spectra

function drawSpectra() {
  const P = PANEL.E;
  const R = { lo: 0, hi: 1.12 };
  const L = st.L;
  const dk = kDx();

  // hover (or touch) selects the bin whose values are printed
  if (mouseX >= plotL && mouseX <= plotR && mouseY >= P.top - 20 && mouseY <= P.top + P.h + 18) {
    selectedK = constrain(Math.floor((mouseX - plotL) / dk), 0, L - 1);
  }
  if (selectedK > L - 1) selectedK = L - 1;
  const k = selectedK;

  drawFrame(plotL, plotR, P, R, [0, 1]);
  const anyTrace = st.showX || st.showH || st.showY;
  if (anyTrace) {
    noStroke();
    fill(255, 215, 0, 70);
    rect(kX(k) - dk / 2, P.top + 1, dk, P.h - 2);
  }

  const traces = [];
  if (st.showX) traces.push({ vals: st.magX.map(v => v / st.maxX), col: COL_X });
  if (st.showH) traces.push({ vals: st.magH.map(v => v / st.maxH), col: COL_H });
  if (st.showY) traces.push({ vals: st.magY.map(v => v / (st.maxX * st.maxH)), col: COL_YS });
  const offs = traces.length === 3 ? [-0.26, 0, 0.26] : (traces.length === 2 ? [-0.17, 0.17] : [0]);
  const d = constrain(dk * 0.2, 3, 8), w = dk >= 14 ? 2 : 1.2;
  traces.forEach((tr, i) => {
    for (let kk = 0; kk < L; kk++) {
      const v = tr.vals[kk];
      const x = kX(kk) + offs[i] * dk;
      if (v < 1e-9) {
        noStroke();
        fill(tr.col[0], tr.col[1], tr.col[2]);
        circle(x, vY(0, P, R), Math.max(3, d * 0.7));
        continue;
      }
      stroke(tr.col[0], tr.col[1], tr.col[2]);
      strokeWeight(w);
      line(x, vY(0, P, R), x, vY(v, P, R));
      noStroke();
      fill(tr.col[0], tr.col[1], tr.col[2]);
      circle(x, vY(v, P, R), d);
    }
  });
  if (traces.length === 0) {
    noStroke();
    fill(90);
    textAlign(CENTER, CENTER);
    fitText(['Check |X[k]|, |H[k]| or |Y[k]| below to show the spectra', 'Check a spectrum below'],
            (plotL + plotR) / 2, P.top + P.h / 2, plotR - plotL - 10, 14, CENTER);
  }

  // k axis labels
  const every = tickStep(dk, 26);
  noStroke();
  fill(70);
  textSize(14);
  textAlign(CENTER, CENTER);
  for (let kk = 0; kk < L; kk += every) text(kk, kX(kk), P.top + P.h + 9);
  textAlign(RIGHT, CENTER);
  textStyle(ITALIC);
  text('k', plotL - 6, P.top + P.h + 9);
  textStyle(NORMAL);

  // legend (left) and the values at the selected bin (right)
  const fx = st.magX[k].toFixed(2), fh = st.magH[k].toFixed(2), fy = st.magY[k].toFixed(2);
  textStyle(BOLD);
  const kk1 = '[' + k + ']|';
  const readCands = [
    'bin k = ' + k + ':  |X' + kk1 + ' = ' + fx + ',  |H' + kk1 + ' = ' + fh + ',  |Y' + kk1 + ' = |X' + kk1 + '·|H' + kk1 + ' = ' + fy,
    'k = ' + k + ':  |X| = ' + fx + ', |H| = ' + fh + ', |Y| = ' + fy,
    'k = ' + k + ':  ' + fx + ' × ' + fh + ' ≈ ' + fy,
    'k=' + k + ': ' + fx + '×' + fh + '≈' + fy
  ];
  let readout = readCands[readCands.length - 1];
  for (const c of readCands) {
    if (richWidth(c, 14) <= (plotR - plotL) * 0.6) { readout = c; break; }
  }
  st.binReadout = readout;
  const rw = richWidth(readout, 14);
  noStroke();
  fill(COL_YS);
  richText(readout, plotR, P.top - 10, 14, RIGHT);
  textStyle(NORMAL);
  const lg = [
    [{ kind: 'stem', col: COL_X, label: '|X[k]|' }, { kind: 'stem', col: COL_H, label: '|H[k]|' },
     { kind: 'stem', col: COL_YS, label: '|Y[k]| = |X[k]|·|H[k]|' }, { kind: 'text', col: [90, 90, 90], label: '(L-point DFT, hover to pick k)' }],
    [{ kind: 'stem', col: COL_X, label: '|X[k]|' }, { kind: 'stem', col: COL_H, label: '|H[k]|' },
     { kind: 'stem', col: COL_YS, label: '|Y[k]| = |X[k]|·|H[k]|' }],
    [{ kind: 'stem', col: COL_X, label: '|X|' }, { kind: 'stem', col: COL_H, label: '|H|' },
     { kind: 'stem', col: COL_YS, label: '|Y|' }]
  ];
  fitLegend(lg, plotL, P.top - 10, plotR - plotL - rw - 16, 14, LEFT);
}

// ---------------------------------------------------------------- controls

function rowY(i) { return drawHeight + 18 + 32 * i; }

function drawControlLabels() {
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(defaultTextSize);
  textStyle(BOLD);
  fill(COL_X);
  text('x[n]', 10, rowY(0));
  fill(COL_H);
  text('h[n]', 10, rowY(1));
  textStyle(NORMAL);
  fill('black');
  const sz = ctl.narrow ? 15 : defaultTextSize;
  textSize(sz);
  text('N = ' + st.N, ctl.lenLabelX, rowY(0));
  text('M = ' + st.M, ctl.lenLabelX, rowY(1));
  text((ctl.narrow ? 'L = ' : 'Transform length L = ') + st.L, 10, rowY(2));
  text(ctl.narrow ? 'Show:' : 'Spectra:', 10, rowY(3));
}

function layoutControls() {
  if (typeof showYCheckbox === 'undefined' || canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  const narrow = canvasWidth < 560;
  ctl.narrow = narrow;
  const selX = 52, selW = narrow ? 126 : 180;
  xSelect.position(selX, rowY(0) - 12);
  hSelect.position(selX, rowY(1) - 12);
  xSelect.style('width', selW + 'px');
  hSelect.style('width', selW + 'px');
  ctl.lenLabelX = selX + selW + 12;
  const sl = ctl.lenLabelX + (narrow ? 52 : 66);
  const sw = Math.max(60, canvasWidth - sl - margin);
  nSlider.position(sl, rowY(0) - 10);
  mSlider.position(sl, rowY(1) - 10);
  nSlider.size(sw);
  mSlider.size(sw);
  const ll = narrow ? 76 : 214;
  lSlider.position(ll, rowY(2) - 10);
  lSlider.size(Math.max(60, canvasWidth - ll - margin));
  const cx = narrow ? 62 : 96, cdx = narrow ? 96 : 110;
  showXCheckbox.position(cx, rowY(3) - 11);
  showHCheckbox.position(cx + cdx, rowY(3) - 11);
  showYCheckbox.position(cx + 2 * cdx, rowY(3) - 11);
}

// ---------------------------------------------------------------- legend and text helpers

// legend items: { kind: 'stem' | 'ring' | 'text', col, tcol (optional text color), label }
function legendWidth(items, sz) {
  let w = 0;
  items.forEach((it, i) => {
    w += (it.kind === 'text' ? 0 : 16) + richWidth(it.label, sz) + (i < items.length - 1 ? 14 : 0);
  });
  return w;
}

function drawLegend(items, x, y, sz, align) {
  textStyle(BOLD);
  const total = legendWidth(items, sz);
  let cx = align === RIGHT ? x - total : x;
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
      noFill();
      stroke(c[0], c[1], c[2]);
      strokeWeight(2);
      circle(cx + 6, y, 10);
    }
    if (it.kind !== 'text') cx += 16;
    const tc = it.tcol || c;
    noStroke();
    fill(tc[0], tc[1], tc[2]);
    textStyle(BOLD);
    richText(it.label, cx, y, sz, LEFT);
    cx += richWidth(it.label, sz) + 14;
  }
  textStyle(NORMAL);
  return total;
}

function fitLegend(cands, x, y, maxW, sz, align) {
  textStyle(BOLD);
  for (const c of cands) {
    if (legendWidth(c, sz) <= maxW) {
      textStyle(NORMAL);
      drawLegend(c, x, y, sz, align);
      return c;
    }
  }
  textStyle(NORMAL);
  const last = cands[cands.length - 1];
  drawLegend(last, x, y, sz, align);
  return last;
}

// Rich text: "y_c" draws the character after '_' as a subscript
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
  return typeof fontWidth === 'function' ? fontWidth(String(s)) : textWidth(String(s));
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

function fmtSci(v) {
  if (v === 0) return '0';
  return v.toExponential(1).replace('e-', 'e−');
}

// ---------------------------------------------------------------- responsive layout

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  plotL = 46;
  plotR = canvasWidth - 14;
  layoutControls();
}
