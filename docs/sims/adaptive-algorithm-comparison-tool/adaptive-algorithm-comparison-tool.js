// Adaptive Algorithm Comparison Tool MicroSim
// CANVAS_HEIGHT: 680
// LMS, NLMS and RLS identify the same unknown FIR plant from the same noisy data.
// Learning curves (ensemble MSE), the weight-error norm and the estimated weights are
// shown side by side so the three algorithms can be compared under identical conditions.
// p5.js 2.3.2, no audio.

// ---------- Canvas and layout ----------
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let drawHeight = 500;
let controlHeight = 180;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let defaultTextSize = 16;
let wideLayout = true;
let layoutWidth = -1;
let boxes = {};                      // plot rectangles, recomputed when the width changes

// ---------- Experiment constants ----------
const N_ITER = 1500;                 // iterations per run
const CHANGE_AT = 500;               // instant of the plant change when tracking is switched on
const SS_WINDOW = 500;               // "final" window: n = 1000 .. 1499
const PRE_WINDOW = 200;              // reference window before the change: n = 300 .. 499
const BIN = 5;                       // iterations averaged into each plotted point
const MAX_RUNS = 20;
const BURN_IN = 64;                  // input samples before n = 0, so the delay line starts full
const ITERS_PER_SECOND = 1000;       // animation speed (about 1.5 s per experiment)
const NLMS_EPS = 1e-6;               // regulariser in the NLMS denominator
const SIGMA_X2 = 1;                  // every input is scaled to unit power
const E2_CAP = 1e4;                  // +40 dB cap so a diverging LMS cannot overflow the averages

// Learning-curve and weight-error axes (dB)
const LC_MIN = -50, LC_MAX = 20;
const WE_MIN = -70, WE_MAX = 10;

// Algorithm colours: LMS blue, NLMS green, RLS maroon
const ALG_NAMES = ['LMS', 'NLMS', 'RLS'];
const ALG_COLORS = ['#1f5fbf', '#2a8a3a', '#8b1c3c'];
const TRUE_COLOR = '#555555';
const WARN_COLOR = '#c00000';
const CHANGE_COLOR = '#b8860b';      // darkgoldenrod

// ---------- Unknown plants (all scaled to unit energy, ||w_o|| = 1) ----------
function makeLowpass(L, wc) {
  // Hamming-windowed sinc, cutoff wc rad/sample
  const h = [];
  const c = (L - 1) / 2;
  for (let k = 0; k < L; k++) {
    const t = k - c;
    const s = t === 0 ? wc / Math.PI : Math.sin(wc * t) / (Math.PI * t);
    h.push(s * (0.54 - 0.46 * Math.cos(2 * Math.PI * k / (L - 1))));
  }
  return h;
}
function unitEnergy(h) {
  const e = Math.sqrt(h.reduce((s, v) => s + v * v, 0));
  return h.map(v => v / e);
}
const PLANTS = [
  { label: 'A: 4 taps', h: unitEnergy([1.0, 0.5, -0.3, 0.2]) },
  { label: 'B: 8-tap lowpass', h: unitEnergy(makeLowpass(8, 0.35 * Math.PI)) },
  { label: 'C: 12-tap echo', h: unitEnergy([1.0, 0.4, 0.1, 0, 0, -0.5, -0.25, -0.05, 0, 0, 0.3, 0.15]) }
];

// ---------- Inputs: unit-power AR(1) x[n] = a x[n-1] + sqrt(1 - a^2) u[n] ----------
const INPUTS = [
  { label: 'White noise', a: 0 },
  { label: 'AR(1) a = 0.5', a: 0.5 },
  { label: 'AR(1) a = 0.9', a: 0.9 }
];
const DELTAS = [0.001, 0.01, 0.1, 1, 10, 100];   // RLS initialisation P(0) = I / delta
const VIEWS = ['Weights', 'Freq. response', 'Trajectories'];

const DEFAULTS = { plant: 1, input: 0, delta: 1, view: 0, noiseDb: -30, runs: 10, M: 8, mu: 0.01, muN: 0.5, lambda: 0.99 };

// ---------- Seeded random numbers: every algorithm and every setting sees the same data ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussianArray(seed, n) {
  const rng = mulberry32(seed);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i += 2) {
    const u1 = Math.max(rng(), 1e-12);
    const u2 = rng();
    const r = Math.sqrt(-2 * Math.log(u1));
    out[i] = r * Math.cos(2 * Math.PI * u2);
    if (i + 1 < n) out[i + 1] = r * Math.sin(2 * Math.PI * u2);
  }
  return out;
}
let innovations = null;              // u[n] per run (input driving noise)
let noiseUnit = null;                // unit-variance observation noise per run
const inputCache = {};
function getInputSequences(inputIdx) {
  if (!innovations) {
    innovations = [];
    noiseUnit = [];
    for (let r = 0; r < MAX_RUNS; r++) {
      innovations.push(gaussianArray(1009 + 7919 * r, BURN_IN + N_ITER));
      noiseUnit.push(gaussianArray(50021 + 104729 * r, N_ITER));
    }
  }
  if (!inputCache[inputIdx]) {
    const a = INPUTS[inputIdx].a;
    const g = Math.sqrt(1 - a * a);
    inputCache[inputIdx] = innovations.map(u => {
      const x = new Float64Array(u.length);
      x[0] = u[0];                   // x[0] ~ N(0, 1): the process is stationary from the start
      for (let i = 1; i < u.length; i++) x[i] = a * x[i - 1] + g * u[i];
      return x;
    });
  }
  return inputCache[inputIdx];
}

// ---------- Small linear-algebra helpers ----------
function autocorr(a, k) { return Math.pow(a, Math.abs(k)); }   // r[k] of the unit-power AR(1) input

function solveLinear(A, b) {
  // Gaussian elimination with partial pivoting (A is copied)
  const n = b.length;
  const M = A.map((row, i) => row.slice().concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

// Minimum MSE of an M-tap Wiener filter for the plant wo (handles M < plant length)
function wienerJmin(wo, M, a, sv2) {
  const L = wo.length;
  let sy2 = 0;
  for (let i = 0; i < L; i++) for (let j = 0; j < L; j++) sy2 += wo[i] * wo[j] * autocorr(a, i - j);
  const p = [];
  const R = [];
  for (let i = 0; i < M; i++) {
    let s = 0;
    for (let j = 0; j < L; j++) s += autocorr(a, i - j) * wo[j];
    p.push(s);
    const row = [];
    for (let j = 0; j < M; j++) row.push(autocorr(a, i - j));
    R.push(row);
  }
  const w = solveLinear(R, p);
  let pw = 0;
  for (let i = 0; i < M; i++) pw += p[i] * w[i];
  return Math.max(sv2, sv2 + sy2 - pw);
}

// Eigenvalue spread lambda_max / lambda_min of the M x M input autocorrelation matrix (cyclic Jacobi)
function eigenSpread(M, a) {
  if (a === 0) return 1;
  const A = [];
  for (let i = 0; i < M; i++) { const row = []; for (let j = 0; j < M; j++) row.push(autocorr(a, i - j)); A.push(row); }
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let i = 0; i < M; i++) for (let j = i + 1; j < M; j++) off += A[i][j] * A[i][j];
    if (off < 1e-22) break;
    for (let p = 0; p < M; p++) {
      for (let q = p + 1; q < M; q++) {
        if (Math.abs(A[p][q]) < 1e-15) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < M; k++) {
          const akp = A[k][p], akq = A[k][q];
          A[k][p] = c * akp - s * akq;
          A[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < M; k++) {
          const apk = A[p][k], aqk = A[q][k];
          A[p][k] = c * apk - s * aqk;
          A[q][k] = s * apk + c * aqk;
        }
      }
    }
  }
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < M; i++) { lo = Math.min(lo, A[i][i]); hi = Math.max(hi, A[i][i]); }
  return hi / lo;
}

// ---------- The experiment: R runs x 3 algorithms, advanced in lockstep ----------
function createExperiment(p) {
  const M = p.M;
  const wo = PLANTS[p.plant].h;
  const xs = getInputSequences(p.input);
  const exp = {
    p, wo, n: 0, done: false,
    sv2: Math.pow(10, p.noiseDb / 10),
    mse: [0, 1, 2].map(() => new Float64Array(N_ITER)),   // sum over runs of e^2[n]
    exc: [0, 1, 2].map(() => new Float64Array(N_ITER)),   // sum over runs of (e[n] - v[n])^2
    wen: [0, 1, 2].map(() => new Float64Array(N_ITER)),   // sum over runs of ||w_o - w[n]||^2
    runs: [],
    summary: null
  };
  exp.sv = Math.sqrt(exp.sv2);
  exp.jmin = wienerJmin(wo, M, INPUTS[p.input].a, exp.sv2);
  exp.chi = eigenSpread(M, INPUTS[p.input].a);
  // the two largest plant taps that the filter can represent (for the trajectory view)
  const order = [];
  for (let k = 0; k < Math.min(M, wo.length); k++) order.push(k);
  order.sort((i, j) => Math.abs(wo[j]) - Math.abs(wo[i]));
  exp.track = order.slice(0, Math.min(2, order.length)).sort((i, j) => i - j);
  exp.hist = [0, 1, 2].map(() => exp.track.map(() => new Float32Array(N_ITER)));
  const delta = DELTAS[p.delta];
  for (let r = 0; r < p.runs; r++) {
    const P = new Float64Array(M * M);
    for (let i = 0; i < M; i++) P[i * M + i] = 1 / delta;
    exp.runs.push({
      x: xs[r], z: noiseUnit[r],
      w: [new Float64Array(M), new Float64Array(M), new Float64Array(M)],
      P, xv: new Float64Array(M), pv: new Float64Array(M), kv: new Float64Array(M),
      dead: [false, false, false]
    });
  }
  return exp;
}

function rlsUpdate(run, w, e, lambda, M) {
  const P = run.P, xv = run.xv, pv = run.pv, kv = run.kv;
  let den = lambda;
  for (let i = 0; i < M; i++) {
    let s = 0;
    for (let j = 0; j < M; j++) s += P[i * M + j] * xv[j];
    pv[i] = s;                                   // pi = P x
    den += xv[i] * s;                            // lambda + x' P x
  }
  for (let i = 0; i < M; i++) { kv[i] = pv[i] / den; w[i] += kv[i] * e; }   // gain and weight update
  for (let i = 0; i < M; i++) {                  // P = (P - k pi') / lambda, kept symmetric
    for (let j = i; j < M; j++) {
      const v = (P[i * M + j] - kv[i] * pv[j]) / lambda;
      P[i * M + j] = v;
      P[j * M + i] = v;
    }
  }
}

function stepExperiment(exp, count) {
  const p = exp.p, M = p.M, wo = exp.wo, L = wo.length, K = Math.max(M, L);
  const end = Math.min(N_ITER, exp.n + count);
  for (; exp.n < end; exp.n++) {
    const n = exp.n;
    const sign = (p.change && n >= CHANGE_AT) ? -1 : 1;     // the plant flips sign at n = 500
    const xi = BURN_IN + n;
    for (let r = 0; r < exp.runs.length; r++) {
      const run = exp.runs[r];
      const x = run.x;
      let d = 0;
      for (let k = 0; k < L; k++) d += wo[k] * x[xi - k];
      const v = exp.sv * run.z[n];
      d = sign * d + v;                                     // desired response d[n] = w_o' x[n] + v[n]
      const xv = run.xv;
      let nrm = 0;
      for (let k = 0; k < M; k++) { xv[k] = x[xi - k]; nrm += xv[k] * xv[k]; }
      for (let a = 0; a < 3; a++) {
        const w = run.w[a];
        let e2 = E2_CAP, ex2 = E2_CAP, we = E2_CAP;
        if (!run.dead[a]) {
          let y = 0;
          for (let k = 0; k < M; k++) y += w[k] * xv[k];
          const e = d - y;                                  // a priori error
          e2 = e * e;
          ex2 = (e - v) * (e - v);
          if (a === 0) {
            const g = p.mu * e;
            for (let k = 0; k < M; k++) w[k] += g * xv[k];
          } else if (a === 1) {
            const g = p.muN * e / (NLMS_EPS + nrm);
            for (let k = 0; k < M; k++) w[k] += g * xv[k];
          } else {
            rlsUpdate(run, w, e, p.lambda, M);
          }
          we = 0;
          for (let k = 0; k < K; k++) {
            const t = (k < L ? sign * wo[k] : 0) - (k < M ? w[k] : 0);
            we += t * t;
          }
          // A large error alone is not divergence: near the stability edge LMS produces bursts
          // that die away again. Only freeze a run whose numbers have overflowed.
          if (!(e2 < 1e200) || !(we < 1e200)) {
            run.dead[a] = true;
            e2 = ex2 = we = E2_CAP;
          }
        }
        exp.mse[a][n] += Math.min(e2, E2_CAP);            // clip at +40 dB for the averages
        exp.exc[a][n] += Math.min(ex2, E2_CAP);
        exp.wen[a][n] += Math.min(we, E2_CAP);
        if (r === 0) {
          for (let t = 0; t < exp.track.length; t++) exp.hist[a][t][n] = run.dead[a] ? NaN : w[exp.track[t]];
        }
      }
    }
  }
  if (exp.n >= N_ITER && !exp.done) {
    exp.done = true;
    exp.summary = summarize(exp);
  }
}

// A run has diverged if its weights end the experiment far from the plant (||wo - w||^2 > 100, +20 dB)
function countDiverged(exp, a) {
  const M = exp.p.M, wo = exp.wo, L = wo.length, K = Math.max(M, L);
  const sign = (exp.p.change && exp.n > CHANGE_AT) ? -1 : 1;
  let count = 0;
  for (const run of exp.runs) {
    if (run.dead[a]) { count++; continue; }
    let we = 0;
    for (let k = 0; k < K; k++) {
      const t = (k < L ? sign * wo[k] : 0) - (k < M ? run.w[a][k] : 0);
      we += t * t;
    }
    if (!(we < 100)) count++;
  }
  return count;
}

function windowMean(arr, from, to, R) {
  let s = 0;
  for (let n = from; n < to; n++) s += arr[n];
  return s / ((to - from) * R);
}
function binMean(arr, b, R) {
  let s = 0;
  for (let n = b * BIN; n < (b + 1) * BIN; n++) s += arr[n];
  return s / (BIN * R);
}

function theoryMisadjustment(p, a, L) {
  if (p.M < L) return null;                                 // formulas assume the filter is long enough
  if (a === 0) return p.mu * p.M * SIGMA_X2 / 2;             // LMS:  mu M sigma_x^2 / 2
  if (a === 1) return p.muN / (2 - p.muN);                   // NLMS: mu~ / (2 - mu~)
  return (1 - p.lambda) * p.M / (1 + p.lambda);              // RLS:  (1 - lambda) M / (1 + lambda)
}

function summarize(exp) {
  const R = exp.runs.length, p = exp.p, L = exp.wo.length;
  const s = { finalMse: [], finalDb: [], misMeas: [], misTheory: [], conv: [], weDb: [], diverged: [], divergedRuns: [] };
  for (let a = 0; a < 3; a++) {
    const fin = windowMean(exp.mse[a], N_ITER - SS_WINDOW, N_ITER, R);
    s.finalMse.push(fin);
    s.finalDb.push(10 * Math.log10(fin));
    // excess MSE: mean (e - v)^2 minus the part a short filter can never model
    const emse = windowMean(exp.exc[a], N_ITER - SS_WINDOW, N_ITER, R) - (exp.jmin - exp.sv2);
    s.misMeas.push(Math.max(0, emse / exp.jmin));          // estimation noise can push it just below 0
    s.misTheory.push(theoryMisadjustment(p, a, L));
    s.weDb.push(10 * Math.log10(windowMean(exp.wen[a], N_ITER - SS_WINDOW, N_ITER, R)));
    const nDiv = countDiverged(exp, a);
    s.diverged.push(nDiv > 0);
    s.divergedRuns.push(nDiv);
    // convergence: first 5-sample bin within 3 dB of the reference level
    let start = 0, ref = fin;
    if (p.change) { start = CHANGE_AT; ref = windowMean(exp.mse[a], CHANGE_AT - PRE_WINDOW, CHANGE_AT, R); }
    const target = ref * Math.pow(10, 0.3);
    let conv = null;
    for (let b = start / BIN; b < N_ITER / BIN; b++) {
      if (binMean(exp.mse[a], b, R) <= target) { conv = (b + 1) * BIN - start; break; }
    }
    s.conv.push(nDiv > 0 ? null : conv);
  }
  return s;
}

// ---------- p5 state ----------
let exp = null;
let currentKey = '';
let running = true;
let changeOn = false;
let shownRunLabel = '';
let plantSelect, inputSelect, deltaSelect, viewSelect;
let noiseSlider, runsSlider, lengthSlider, muSlider, muNSlider, lambdaSlider;
let runButton, resetButton, changeButton;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);
  createControls();
  layoutControls(true);
  readControls();
  describe('System identification with three adaptive filters. LMS (blue), NLMS (green) and RLS (maroon) learn the same unknown FIR plant from the same noisy data. Plots show the learning curves in dB, the weight-error norm, and the true versus estimated weights. Sliders set the noise level, number of averaged runs, filter length, LMS step size, NLMS normalized step size and RLS forgetting factor.');
}

function draw() {
  updateCanvasSize();
  readControls();
  if (running && exp && !exp.done) {
    const count = Math.max(5, Math.min(60, Math.round(ITERS_PER_SECOND * Math.min(deltaTime, 100) / 1000)));
    stepExperiment(exp, count);
    if (exp.done) running = false;
  }
  const label = running ? 'Pause' : 'Run';
  if (label !== shownRunLabel) { runButton.html(label); shownRunLabel = label; }

  drawRegions();
  drawTitle();
  drawLearningCurves(boxes.lc);
  drawWeightError(boxes.we);
  const v = Number(viewSelect.value());
  if (v === 0) drawWeightBars(boxes.panel);
  else if (v === 1) drawFrequencyResponse(boxes.panel);
  else drawTrajectories(boxes.panel);
  if (wideLayout) drawTable(boxes.table); else drawNarrowInfo();
  drawControlLabels();
}

// ---------- Controls ----------
function createControls() {
  plantSelect = createSelect();
  PLANTS.forEach((pl, i) => plantSelect.option(pl.label, String(i)));
  plantSelect.selected(String(DEFAULTS.plant));
  inputSelect = createSelect();
  INPUTS.forEach((inp, i) => inputSelect.option(inp.label, String(i)));
  inputSelect.selected(String(DEFAULTS.input));
  deltaSelect = createSelect();
  DELTAS.forEach((d, i) => deltaSelect.option('δ = ' + d, String(i)));
  deltaSelect.selected(String(DEFAULTS.delta));

  noiseSlider = createSlider(-40, -10, DEFAULTS.noiseDb, 1);
  runsSlider = createSlider(1, MAX_RUNS, DEFAULTS.runs, 1);
  lengthSlider = createSlider(2, 16, DEFAULTS.M, 1);
  muSlider = createSlider(0.001, 0.3, DEFAULTS.mu, 0.001);
  muNSlider = createSlider(0.01, 1, DEFAULTS.muN, 0.01);
  lambdaSlider = createSlider(0.9, 1, DEFAULTS.lambda, 0.001);

  runButton = createButton('Pause');
  runButton.mousePressed(toggleRun);
  resetButton = createButton('Reset');
  resetButton.mousePressed(resetAll);
  changeButton = createButton('Change the plant at n = 500');
  changeButton.mousePressed(toggleChange);

  viewSelect = createSelect();
  VIEWS.forEach((name, i) => viewSelect.option(name, String(i)));
  viewSelect.selected(String(DEFAULTS.view));
}

function rowY(i) { return drawHeight + 10 + i * 34; }

function layoutControls(force) {
  if (typeof plantSelect === 'undefined') return;
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  wideLayout = canvasWidth >= 760;
  computeBoxes();
  const W = canvasWidth;
  const fs = wideLayout ? '14px' : '13px';
  [plantSelect, inputSelect, deltaSelect, viewSelect, runButton, resetButton, changeButton].forEach(el => el.style('font-size', fs));
  if (wideLayout) {
    plantSelect.position(62, rowY(0)); plantSelect.style('width', '160px');
    inputSelect.position(290, rowY(0)); inputSelect.style('width', '160px');
    deltaSelect.position(520, rowY(0)); deltaSelect.style('width', '100px');
    runButton.position(10, rowY(4)); runButton.style('width', '70px');
    resetButton.position(88, rowY(4)); resetButton.style('width', '64px');
    changeButton.position(160, rowY(4)); changeButton.style('width', '210px');
    viewSelect.position(440, rowY(4)); viewSelect.style('width', '140px');
  } else {
    plantSelect.position(6, rowY(0)); plantSelect.style('width', '128px');
    inputSelect.position(140, rowY(0)); inputSelect.style('width', '118px');
    deltaSelect.position(264, rowY(0)); deltaSelect.style('width', '86px');
    runButton.position(6, rowY(4)); runButton.style('width', '56px');
    resetButton.position(66, rowY(4)); resetButton.style('width', '54px');
    changeButton.position(124, rowY(4)); changeButton.style('width', '124px');
    viewSelect.position(252, rowY(4)); viewSelect.style('width', '106px');
  }
  changeButton.html(changeButtonText());
  // sliders: three rows, two columns
  const pad = wideLayout ? 10 : 6;
  const labelW = wideLayout ? 150 : 76;
  const colW = (W - 2 * pad) / 2;
  const grid = [[noiseSlider, runsSlider], [lengthSlider, muSlider], [muNSlider, lambdaSlider]];
  grid.forEach((row, i) => row.forEach((s, c) => {
    s.position(pad + c * colW + labelW, rowY(i + 1) + 2);
    s.size(Math.max(50, colW - labelW - (wideLayout ? 18 : 8)));
  }));
}

function changeButtonText() {
  if (wideLayout) return changeOn ? 'Keep the plant fixed' : 'Change the plant at n = 500';
  return changeOn ? 'Keep plant fixed' : 'Change at n = 500';
}

function currentParams() {
  return {
    plant: Number(plantSelect.value()),
    input: Number(inputSelect.value()),
    delta: Number(deltaSelect.value()),
    noiseDb: Number(noiseSlider.value()),
    runs: Number(runsSlider.value()),
    M: Number(lengthSlider.value()),
    mu: Number(muSlider.value()),
    muN: Number(muNSlider.value()),
    lambda: Number(lambdaSlider.value()),
    change: changeOn
  };
}

// Any change of a parameter restarts the experiment with the same random data
function readControls() {
  const p = currentParams();
  const key = JSON.stringify(p);
  if (key !== currentKey) {
    currentKey = key;
    exp = createExperiment(p);
    running = true;
  }
}

function toggleRun() {
  if (exp && exp.done) { exp = createExperiment(exp.p); running = true; return; }
  running = !running;
}

function resetAll() {
  plantSelect.selected(String(DEFAULTS.plant));
  inputSelect.selected(String(DEFAULTS.input));
  deltaSelect.selected(String(DEFAULTS.delta));
  viewSelect.selected(String(DEFAULTS.view));
  noiseSlider.value(DEFAULTS.noiseDb);
  runsSlider.value(DEFAULTS.runs);
  lengthSlider.value(DEFAULTS.M);
  muSlider.value(DEFAULTS.mu);
  muNSlider.value(DEFAULTS.muN);
  lambdaSlider.value(DEFAULTS.lambda);
  changeOn = false;
  changeButton.html(changeButtonText());
  currentKey = '';                                // forces a fresh run even if nothing changed
}

function toggleChange() {
  changeOn = !changeOn;
  changeButton.html(changeButtonText());
}

function lmsBound(M) { return 2 / (M * SIGMA_X2); }

function drawControlLabels() {
  const p = exp.p;
  const pad = wideLayout ? 10 : 6;
  const colW = (canvasWidth - 2 * pad) / 2;
  noStroke();
  textStyle(NORMAL);
  textAlign(LEFT, CENTER);
  textSize(wideLayout ? 16 : 14);
  fill('black');
  if (wideLayout) {
    text('Plant', 10, rowY(0) + 11);
    text('Input', 240, rowY(0) + 11);
    text('RLS', 482, rowY(0) + 11);
  }
  const unstable = p.mu > lmsBound(p.M);
  const labels = wideLayout
    ? [['Noise σv²: ' + p.noiseDb + ' dB', 'Runs averaged: ' + p.runs],
       ['Filter length M: ' + p.M, 'LMS μ: ' + p.mu.toFixed(3)],
       ['NLMS μ̃: ' + p.muN.toFixed(2), 'RLS λ: ' + p.lambda.toFixed(3)]]
    : [['σv² ' + p.noiseDb + ' dB', 'Runs ' + p.runs],
       ['M = ' + p.M, 'μ ' + p.mu.toFixed(3)],
       ['μ̃ ' + p.muN.toFixed(2), 'λ ' + p.lambda.toFixed(3)]];
  const colors = [['black', 'black'], ['black', unstable ? WARN_COLOR : ALG_COLORS[0]], [ALG_COLORS[1], ALG_COLORS[2]]];
  for (let i = 0; i < 3; i++) {
    for (let c = 0; c < 2; c++) {
      fill(colors[i][c]);
      text(labels[i][c], pad + c * colW, rowY(i + 1) + 11);
    }
  }
  if (wideLayout) {
    fill(60);
    textSize(15);
    text('Panel', 392, rowY(4) + 11);
    const status = exp.done ? 'done' : (running ? 'running' : 'paused');
    text('n = ' + exp.n + ' of ' + N_ITER + ' (' + status + ')', 596, rowY(4) + 11);
  }
}

// ---------- Layout of the drawing region ----------
function computeBoxes() {
  const W = canvasWidth;
  if (W >= 760) {
    const leftX1 = Math.round(W * 0.58) - 10;
    boxes = {
      lc: { x0: 62, x1: leftX1, y0: 58, y1: 236 },
      we: { x0: 62, x1: leftX1, y0: 290, y1: 424 },
      panel: { x0: leftX1 + 70, x1: W - margin, y0: 58, y1: 236 },
      table: { x0: leftX1 + 36, x1: W - margin, y0: 286, y1: 494 }
    };
  } else {
    boxes = {
      lc: { x0: 46, x1: W - 16, y0: 52, y1: 176 },
      we: { x0: 46, x1: W - 16, y0: 222, y1: 290 },
      panel: { x0: 46, x1: W - 16, y0: 350, y1: 428 },
      table: null
    };
  }
}

function drawRegions() {
  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
}

function drawTitle() {
  noStroke();
  fill('black');
  textStyle(NORMAL);
  if (wideLayout) {
    textSize(20);
    textAlign(CENTER, TOP);
    text('Adaptive Algorithm Comparison: LMS vs NLMS vs RLS', canvasWidth / 2, 8);
  } else {
    textSize(17);
    textAlign(LEFT, TOP);
    text('LMS vs NLMS vs RLS', 8, 6);
    textSize(13);
    textAlign(RIGHT, TOP);
    fill(60);
    text('n = ' + exp.n + ' / ' + N_ITER, canvasWidth - 8, 9);
  }
}

// ---------- Plot helpers ----------
function mapX(box, v, lo, hi) { return box.x0 + (v - lo) / (hi - lo) * (box.x1 - box.x0); }
function mapY(box, v, lo, hi) { return box.y1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo) * (box.y1 - box.y0); }

function panelLabel(txt, x, y) {
  noStroke();
  fill('black');
  textStyle(BOLD);
  textSize(wideLayout ? 15 : 13);
  textAlign(LEFT, CENTER);
  text(txt, x, y);
  textStyle(NORMAL);
}

function rotatedLabel(txt, x, yc) {
  push();
  translate(x, yc);
  rotate(-HALF_PI);
  noStroke();
  fill('black');
  textSize(wideLayout ? 14 : 12);
  textAlign(CENTER, CENTER);
  text(txt, 0, 0);
  pop();
}

// White plot area, grid lines and tick labels
function drawFrame(box, xs, xlo, xhi, ys, ylo, yhi, xfmt, yfmt, showX) {
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
  stroke(228);
  for (const v of ys) { const y = mapY(box, v, ylo, yhi); line(box.x0, y, box.x1, y); }
  for (const v of xs) { const x = mapX(box, v, xlo, xhi); line(x, box.y0, x, box.y1); }
  noStroke();
  fill(70);
  textSize(wideLayout ? 13 : 12);
  textAlign(RIGHT, CENTER);
  for (const v of ys) text(yfmt(v), box.x0 - 5, mapY(box, v, ylo, yhi));
  if (showX) {
    textAlign(CENTER, TOP);
    for (const v of xs) text(xfmt(v), mapX(box, v, xlo, xhi), box.y1 + 4);
  }
}

function setDash(on) { drawingContext.setLineDash(on ? [6, 4] : []); }

function drawChangeMarker(box) {
  if (!exp.p.change) return;
  const x = mapX(box, CHANGE_AT, 0, N_ITER);
  stroke(CHANGE_COLOR);
  strokeWeight(1.5);
  setDash(true);
  line(x, box.y0, x, box.y1);
  setDash(false);
}

function iterTicks() { return [0, 250, 500, 750, 1000, 1250, 1500]; }
function iterFmt(v) { return (!wideLayout && v % 500 !== 0) ? '' : String(v); }

// ---------- Learning curves ----------
function drawLearningCurves(box) {
  const p = exp.p, R = exp.runs.length;
  panelLabel('Learning curves (MSE, ' + R + (R === 1 ? ' run)' : ' runs)'), wideLayout ? 15 : 8, box.y0 - 13);
  if (p.mu > lmsBound(p.M)) {
    noStroke();
    fill(WARN_COLOR);
    textStyle(BOLD);
    textSize(wideLayout ? 14 : 12);
    textAlign(RIGHT, CENTER);
    text('μ > 2/(Mσx²) = ' + lmsBound(p.M).toFixed(3) + ': LMS unstable', box.x1, box.y0 - 13);
    textStyle(NORMAL);
  }
  drawFrame(box, iterTicks(), 0, N_ITER, [-50, -40, -30, -20, -10, 0, 10, 20], LC_MIN, LC_MAX, iterFmt, v => (v % 20 === 0 || wideLayout) ? String(v) : '', true);
  rotatedLabel('MSE (dB)', wideLayout ? 16 : 10, (box.y0 + box.y1) / 2);
  drawChangeMarker(box);

  const nb = Math.floor(exp.n / BIN);
  noFill();
  strokeWeight(wideLayout ? 2 : 1.5);
  for (const a of [0, 1, 2]) {
    stroke(ALG_COLORS[a]);
    beginShape();
    for (let b = 0; b < nb; b++) {
      const m = binMean(exp.mse[a], b, R);
      vertex(mapX(box, (b + 0.5) * BIN, 0, N_ITER), mapY(box, 10 * Math.log10(m), LC_MIN, LC_MAX));
    }
    endShape();
  }

  // Wiener floor J_min, drawn on top of the curves so it stays visible
  const yj = mapY(box, 10 * Math.log10(exp.jmin), LC_MIN, LC_MAX);
  stroke(60);
  strokeWeight(1.5);
  setDash(true);
  line(box.x0, yj, box.x1, yj);
  setDash(false);
  drawLegend(box);
}

function algDiverged(a) { return exp.summary !== null && exp.summary.diverged[a]; }

function drawLegend(box) {
  const rows = ALG_NAMES.map((n, a) => ({ name: n + (algDiverged(a) ? ' (diverged)' : ''), color: ALG_COLORS[a], dash: false }));
  rows.push({ name: 'Jmin (Wiener)', color: 'rgb(60,60,60)', dash: true });
  const ts = wideLayout ? 13 : 11;
  const lh = ts + 4;
  const w = wideLayout ? 150 : 118;
  const h = rows.length * lh + 6;
  // Put the legend in the corner that the learning curves cross least
  const R = exp.runs.length, nb = Math.floor(exp.n / BIN);
  const spots = [[box.x1 - w - 6, box.y0 + 6], [box.x1 - w - 6, box.y1 - h - 6],
                 [(box.x0 + box.x1 - w) / 2, box.y0 + 6], [box.x0 + 40, box.y1 - h - 6]];
  let best = spots[0], bestHits = Infinity;
  for (const [sx, sy] of spots) {
    let hits = 0;
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < nb; b++) {
        const px = mapX(box, (b + 0.5) * BIN, 0, N_ITER);
        if (px < sx || px > sx + w) continue;
        const py = mapY(box, 10 * Math.log10(binMean(exp.mse[a], b, R)), LC_MIN, LC_MAX);
        if (py >= sy - 2 && py <= sy + h + 2) hits++;
      }
    }
    if (hits < bestHits) { bestHits = hits; best = [sx, sy]; }
  }
  const [x, y] = best;
  fill(255, 255, 255, 225);
  stroke(200);
  strokeWeight(1);
  rect(x, y, w, h, 4);
  textSize(ts);
  textAlign(LEFT, CENTER);
  rows.forEach((r, i) => {
    const yy = y + 5 + lh * (i + 0.5);
    stroke(r.color);
    strokeWeight(2.5);
    setDash(r.dash);
    line(x + 6, yy, x + 26, yy);
    setDash(false);
    noStroke();
    fill(i < 3 && algDiverged(i) ? WARN_COLOR : 'black');
    text(r.name, x + 32, yy);
  });
}

// ---------- Weight-error norm ----------
function drawWeightError(box) {
  const R = exp.runs.length;
  const lx = wideLayout ? 15 : 8;
  panelLabel('Weight-error norm', lx, box.y0 - 13);
  textSize(wideLayout ? 15 : 13);
  textStyle(BOLD);
  const lw = textWidth('Weight-error norm');
  textStyle(NORMAL);
  fill('black');
  text('‖wo − w[n]‖² in dB', lx + lw + 8, box.y0 - 13);
  drawFrame(box, iterTicks(), 0, N_ITER, [-60, -40, -20, 0], WE_MIN, WE_MAX, iterFmt, v => String(v), true);
  rotatedLabel('Error (dB)', wideLayout ? 16 : 10, (box.y0 + box.y1) / 2);
  noStroke();
  fill('black');
  textSize(wideLayout ? 14 : 12);
  textAlign(CENTER, TOP);
  text('Iteration n', (box.x0 + box.x1) / 2, box.y1 + (wideLayout ? 22 : 19));
  drawChangeMarker(box);
  const nb = Math.floor(exp.n / BIN);
  noFill();
  strokeWeight(wideLayout ? 2 : 1.5);
  for (const a of [0, 1, 2]) {
    stroke(ALG_COLORS[a]);
    beginShape();
    for (let b = 0; b < nb; b++) {
      const m = binMean(exp.wen[a], b, R);
      vertex(mapX(box, (b + 0.5) * BIN, 0, N_ITER), mapY(box, 10 * Math.log10(Math.max(m, 1e-12)), WE_MIN, WE_MAX));
    }
    endShape();
  }
}

// ---------- Right panel: weights, frequency response or trajectories ----------
function currentTrueWeights() {
  const sign = (exp.p.change && exp.n > CHANGE_AT) ? -1 : 1;
  return exp.wo.map(v => sign * v);
}

function weightRange() {
  const m = Math.max(...exp.wo.map(Math.abs));
  return Math.max(0.5, Math.ceil(m * 1.25 / 0.25) * 0.25);
}

function drawWeightBars(box) {
  const run = exp.runs[0], M = exp.p.M, L = exp.wo.length, K = Math.max(M, L);
  const wt = currentTrueWeights();
  const ymax = weightRange();
  panelLabel('True vs estimated weights, run 1 (n = ' + exp.n + ')', box.x0 - (wideLayout ? 40 : 38), box.y0 - 13);
  const ys = [-ymax, -ymax / 2, 0, ymax / 2, ymax];
  drawFrame(box, [], 0, 1, ys, -ymax, ymax, v => '', v => v.toFixed(2), false);
  rotatedLabel('Weight', box.x0 - (wideLayout ? 46 : 38), (box.y0 + box.y1) / 2);
  const slot = (box.x1 - box.x0) / K;
  const bw = slot * 0.2;
  const y0 = mapY(box, 0, -ymax, ymax);
  noStroke();
  for (let k = 0; k < K; k++) {
    const xs = box.x0 + k * slot + slot * 0.1;
    const vals = [k < L ? wt[k] : 0];
    for (let a = 0; a < 3; a++) vals.push(k < M && !run.dead[a] ? run.w[a][k] : 0);
    vals.forEach((v, i) => {
      fill(i === 0 ? TRUE_COLOR : ALG_COLORS[i - 1]);
      const y = mapY(box, v, -ymax, ymax);
      rect(xs + i * bw, Math.min(y, y0), bw - 0.5, Math.max(1, Math.abs(y - y0)));
    });
  }
  stroke(90);
  strokeWeight(1);
  line(box.x0, y0, box.x1, y0);
  // tap indices and the edge of the adaptive filter
  noStroke();
  fill(70);
  textSize(wideLayout ? 12 : 11);
  textAlign(CENTER, TOP);
  const every = slot < 16 ? 2 : 1;
  for (let k = 0; k < K; k += every) text(k, box.x0 + (k + 0.5) * slot, box.y1 + 3);
  textAlign(CENTER, TOP);
  fill('black');
  textSize(wideLayout ? 13 : 12);
  if (wideLayout) text('Tap k', (box.x0 + box.x1) / 2, box.y1 + 18);
  if (M < L) {
    const xe = box.x0 + M * slot;
    stroke(WARN_COLOR);
    setDash(true);
    line(xe, box.y0, xe, box.y1);
    setDash(false);
    noStroke();
    fill(WARN_COLOR);
    textAlign(LEFT, TOP);
    textSize(12);
    text('M < plant length', xe + 4, box.y0 + 4);
  }
  // swatch for the true plant (white backing keeps it readable over off-scale bars)
  fill(255, 255, 255, 235);
  stroke(200);
  strokeWeight(1);
  rect(box.x1 - 98, box.y0 + 5, 92, 20, 3);
  noStroke();
  fill(TRUE_COLOR);
  rect(box.x1 - 92, box.y0 + 10, 12, 10);
  fill('black');
  textSize(12);
  textAlign(LEFT, CENTER);
  text('true plant', box.x1 - 76, box.y0 + 15);
}

function freqResponseDb(w, omega) {
  let re = 0, im = 0;
  for (let k = 0; k < w.length; k++) { re += w[k] * Math.cos(omega * k); im -= w[k] * Math.sin(omega * k); }
  return 10 * Math.log10(Math.max(re * re + im * im, 1e-10));
}

function drawFrequencyResponse(box) {
  const run = exp.runs[0];
  const lo = -40, hi = 10;
  panelLabel('Frequency response |H(e^jω)|, run 1 (n = ' + exp.n + ')', box.x0 - (wideLayout ? 40 : 38), box.y0 - 13);
  drawFrame(box, [0, 0.25, 0.5, 0.75, 1], 0, 1, [-40, -30, -20, -10, 0, 10], lo, hi, v => String(v), v => String(v), true);
  rotatedLabel('Gain (dB)', box.x0 - (wideLayout ? 46 : 38), (box.y0 + box.y1) / 2);
  noStroke();
  fill('black');
  textSize(wideLayout ? 13 : 12);
  textAlign(CENTER, TOP);
  if (wideLayout) text('Normalized frequency ω/π', (box.x0 + box.x1) / 2, box.y1 + 18);
  const curves = [{ w: currentTrueWeights(), color: TRUE_COLOR, weight: 4 }];
  for (let a = 0; a < 3; a++) if (!run.dead[a]) curves.push({ w: run.w[a], color: ALG_COLORS[a], weight: 2 });
  noFill();
  for (const c of curves) {
    stroke(c.color);
    strokeWeight(c.weight);
    beginShape();
    for (let i = 0; i <= 120; i++) {
      const f = i / 120;
      vertex(mapX(box, f, 0, 1), mapY(box, freqResponseDb(c.w, Math.PI * f), lo, hi));
    }
    endShape();
  }
  noStroke();
  fill(TRUE_COLOR);
  rect(box.x1 - 92, box.y0 + 8, 12, 4);
  fill('black');
  textSize(12);
  textAlign(LEFT, CENTER);
  text('true plant', box.x1 - 76, box.y0 + 10);
}

function drawTrajectories(box) {
  const ymax = weightRange();
  const names = exp.track.map(k => 'w' + k);
  panelLabel('Trajectories of ' + names.join(' and ') + ', run 1', box.x0 - (wideLayout ? 40 : 38), box.y0 - 13);
  drawFrame(box, iterTicks(), 0, N_ITER, [-ymax, -ymax / 2, 0, ymax / 2, ymax], -ymax, ymax, iterFmt, v => v.toFixed(2), true);
  rotatedLabel('Weight', box.x0 - (wideLayout ? 46 : 38), (box.y0 + box.y1) / 2);
  drawChangeMarker(box);
  // true values (dashed)
  stroke(TRUE_COLOR);
  strokeWeight(1.5);
  setDash(true);
  for (const k of exp.track) {
    const v = exp.wo[k];
    const xc = exp.p.change ? mapX(box, CHANGE_AT, 0, N_ITER) : box.x1;
    line(box.x0, mapY(box, v, -ymax, ymax), xc, mapY(box, v, -ymax, ymax));
    if (exp.p.change) line(xc, mapY(box, -v, -ymax, ymax), box.x1, mapY(box, -v, -ymax, ymax));
  }
  setDash(false);
  noFill();
  strokeWeight(1.5);
  const step = 3;
  for (let a = 0; a < 3; a++) {
    stroke(ALG_COLORS[a]);
    for (let t = 0; t < exp.track.length; t++) {
      const h = exp.hist[a][t];
      beginShape();
      for (let n = 0; n < exp.n; n += step) {
        if (!isFinite(h[n])) break;
        vertex(mapX(box, n, 0, N_ITER), mapY(box, h[n], -ymax, ymax));
      }
      endShape();
    }
  }
  noStroke();
  fill('black');
  textSize(12);
  textAlign(LEFT, CENTER);
  const sign = (exp.p.change) ? -1 : 1;
  exp.track.forEach((k, t) => {
    const y = mapY(box, sign * exp.wo[k], -ymax, ymax);
    text(names[t], box.x1 - 22, y + (t === 0 ? -9 : 9));
  });
}

// ---------- Read-outs ----------
function fmtPct(v) {
  if (v === null || !isFinite(v)) return '—';
  if (v > 10) return '>1000%';
  const pct = 100 * v;
  return (Math.abs(pct) < 10 ? pct.toFixed(1) : pct.toFixed(0)) + '%';
}

function drawTable(box) {
  const p = exp.p, s = exp.summary;
  const x0 = box.x0, tw = box.x1 - box.x0;
  const c1 = x0 + 0.40 * tw, c2 = x0 + 0.74 * tw, c3 = box.x1;
  fill(255, 255, 255, 235);
  stroke('silver');
  strokeWeight(1);
  rect(box.x0 - 8, box.y0 - 6, tw + 12, box.y1 - box.y0 + 6, 6);
  noStroke();
  fill('black');
  textStyle(BOLD);
  textSize(14);
  textAlign(LEFT, TOP);
  text('Read-outs', x0, box.y0);
  textStyle(NORMAL);
  textSize(13);
  fill(70);
  textAlign(RIGHT, TOP);
  const y1 = box.y0 + 24;
  text('Final MSE', c1, y1);
  text('(dB)', c1, y1 + 16);
  text('Misadjustment', c2, y1);
  text('meas. / approx.', c2, y1 + 16);
  text(p.change ? 'Recovered' : 'Within 3 dB', c3, y1);
  text(p.change ? 'after n = 500' : 'of final at n', c3, y1 + 16);
  stroke(200);
  line(x0, y1 + 36, box.x1, y1 + 36);
  noStroke();
  const paramText = ['μ = ' + p.mu.toFixed(3), 'μ̃ = ' + p.muN.toFixed(2), 'λ = ' + p.lambda.toFixed(3)];
  for (let a = 0; a < 3; a++) {
    const y = y1 + 44 + a * 24;
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    textSize(14);
    fill(ALG_COLORS[a]);
    text(ALG_NAMES[a], x0, y);
    textStyle(NORMAL);
    textSize(12);
    fill(90);
    if (tw > 400) text(paramText[a], x0 + 46, y + 1);
    textSize(14);
    fill('black');
    textAlign(RIGHT, TOP);
    if (!s) {
      text('…', c1, y);
      continue;
    }
    if (s.diverged[a]) {
      fill(WARN_COLOR);
      text('diverged in ' + s.divergedRuns[a] + ' of ' + exp.runs.length + ' runs', c3, y);
      continue;
    }
    text(s.finalDb[a].toFixed(1), c1, y);
    const th = s.misTheory[a];
    const thText = th === null ? '—' : (a === 2 && p.lambda >= 1 ? '≈ 0' : fmtPct(th));
    text(fmtPct(s.misMeas[a]) + ' / ' + thText, c2, y);
    text(s.conv[a] === null ? '> ' + (N_ITER - (p.change ? CHANGE_AT : 0)) : String(s.conv[a]), c3, y);
  }
  // footer
  const yf = y1 + 44 + 3 * 24 + 6;
  stroke(200);
  line(x0, yf - 4, box.x1, yf - 4);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(13);
  fill('black');
  text('Jmin = ' + (10 * Math.log10(exp.jmin)).toFixed(1) + ' dB      eigenvalue spread χ(R) = ' + fmtChi(exp.chi), x0, yf);
  fill(p.mu > lmsBound(p.M) ? WARN_COLOR : 'black');
  text('LMS bound 2/(Mσx²) = ' + lmsBound(p.M).toFixed(3) + '   (σx² = 1)', x0, yf + 18);
  fill(90);
  text(s ? 'Final MSE: mean of e² over n = 1000–1499, ' + exp.runs.length + (exp.runs.length === 1 ? ' run' : ' runs') : 'Running… read-outs appear at n = 1500', x0, yf + 36);
}

function fmtChi(c) { return c < 10 ? c.toFixed(2) : c < 100 ? c.toFixed(1) : c.toFixed(0); }

function drawNarrowInfo() {
  const s = exp.summary, p = exp.p;
  const W = canvasWidth;
  const y = 462;
  noStroke();
  textSize(13);
  textAlign(LEFT, CENTER);
  fill('black');
  text('Final MSE (dB):', 8, y);
  const xs = [112, 112 + (W - 120) / 3, 112 + 2 * (W - 120) / 3];
  for (let a = 0; a < 3; a++) {
    fill(ALG_COLORS[a]);
    let v = '…';
    if (s) v = s.diverged[a] ? 'diverged' : s.finalDb[a].toFixed(1);
    text(ALG_NAMES[a] + ' ' + v, xs[a], y);
  }
  fill(p.mu > lmsBound(p.M) ? WARN_COLOR : 'black');
  text('Jmin ' + (10 * Math.log10(exp.jmin)).toFixed(1) + ' dB   χ(R) ' + fmtChi(exp.chi) + '   2/(Mσx²) ' + lmsBound(p.M).toFixed(3), 8, y + 22);
}

// ---------- Resizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  layoutControls(false);
}
