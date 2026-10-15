// Compressed Sensing: Recovering a Sparse Spectrum MicroSim
// CANVAS_HEIGHT: 706
// A real signal x[n], n = 0..127 (1 s at fs = 128 Hz), is a sum of k cosines at whole-hertz
// frequencies below 64 Hz, so its DFT has only 2k non-zero bins (k conjugate pairs).
// Only m of the 128 samples are measured: y = Phi x_f, where Phi holds m rows of the inverse
// DFT matrix. Orthogonal matching pursuit (OMP) picks the DFT column most correlated with the
// residual, adds that frequency's conjugate pair (its cosine and sine columns) to the support,
// and solves least squares on the support; it runs k iterations. The minimum-energy
// (least-squares) solution of y = Phi x_f is shown for contrast: it is the zero-filled signal.
// Every random draw comes from a seeded generator, so seed s always gives the same tones,
// the same sample times and the same noise, and the 100-seed success rate is reproducible.

// Canvas dimensions
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let drawHeight = 556;
let controlHeight = 150;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let sliderLeftMargin = 215;
let defaultTextSize = 16;

// Controls
let kSlider, mSlider, noiseSlider, patternSelect, newSignalButton;

// Colors: signal blue, samples chocolate, OMP green, minimum-energy maroon, error red
const COL_SIG = [25, 90, 200];
const COL_SAMP = [210, 105, 30];
const COL_OMP = [30, 135, 70];
const COL_OMP_TEXT = [0, 115, 55];
const COL_ME = [128, 0, 0];
const COL_ERR = [205, 35, 35];
const COL_NYQ = [70, 70, 70];

// ---------------------------------------------------------------- model (plain JavaScript)

const N = 128;                        // samples on the Nyquist grid: 1 s at 128 Hz
const FMAX = N / 2;                   // 64 Hz, the Nyquist frequency of the full grid
const KMAX = 10;                      // largest number of tones
const TRIAL_SEEDS = 100;              // seeds 1..100 for the success-rate read-out

// cos and sin of 2 pi i / N, with the exact zeros cleaned up
const COS_T = new Float64Array(N);
const SIN_T = new Float64Array(N);
for (let i = 0; i < N; i++) {
  const c = Math.cos(2 * Math.PI * i / N), s = Math.sin(2 * Math.PI * i / N);
  COS_T[i] = Math.abs(c) < 1e-15 ? 0 : c;
  SIN_T[i] = Math.abs(s) < 1e-15 ? 0 : s;
}

// mulberry32: a small seeded generator returning numbers in [0, 1)
function mulberry32(a) {
  return function () {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Everything random about one seed: 10 tones (frequency 1..63 Hz, amplitude 0.4..1, phase),
// a random order of the 128 sample times, and one unit-variance noise value per sample time.
// The first k tones and the first m sample times are used, so moving a slider adds or removes
// tones and samples without reshuffling the others.
function makeCase(seed) {
  const rnd = mulberry32(seed);
  const fr = [];
  for (let f = 1; f < FMAX; f++) fr.push(f);
  for (let i = fr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = fr[i]; fr[i] = fr[j]; fr[j] = tmp;
  }
  const freqs = fr.slice(0, KMAX);
  const amps = [], phases = [];
  for (let i = 0; i < KMAX; i++) amps.push(0.4 + 0.6 * rnd());
  for (let i = 0; i < KMAX; i++) phases.push(2 * Math.PI * rnd());
  const perm = [];
  for (let n = 0; n < N; n++) perm.push(n);
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp;
  }
  const noise = new Float64Array(N);
  for (let i = 0; i < N / 2; i++) {
    const u1 = rnd(), u2 = rnd();
    const r = Math.sqrt(-2 * Math.log(1 - u1));
    noise[2 * i] = r * Math.cos(2 * Math.PI * u2);
    noise[2 * i + 1] = r * Math.sin(2 * Math.PI * u2);
  }
  return { seed, freqs, amps, phases, perm, noise };
}

// m sample times: a random subset, or evenly spaced floor(i N / m)
function sampleTimes(c, m, pattern) {
  const t = [];
  if (pattern === 'uniform') {
    for (let i = 0; i < m; i++) t.push(Math.floor(i * N / m));
    return t;
  }
  return c.perm.slice(0, m).sort((p, q) => p - q);
}

function trueSignal(c, k) {
  const x = new Float64Array(N);
  for (let i = 0; i < k; i++) {
    for (let n = 0; n < N; n++) x[n] += c.amps[i] * Math.cos(2 * Math.PI * c.freqs[i] * n / N + c.phases[i]);
  }
  return x;
}

function vnorm(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return Math.sqrt(s);
}

function vdot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// value of a support column at time index n: cos(2 pi f n / N) or sin(2 pi f n / N)
function colValue(f, isSin, n) {
  const idx = (f * n) % N;
  return isSin ? SIN_T[idx] : COS_T[idx];
}

// |sum_i v_i e^(-j 2 pi f t_i / N)|: correlation of v with the DFT column for frequency f.
// For a real v it is the same for f and N - f.
function correlation(v, t, f) {
  let re = 0, im = 0;
  for (let i = 0; i < t.length; i++) {
    const idx = (f * t[i]) % N;
    re += v[i] * COS_T[idx];
    im -= v[i] * SIN_T[idx];
  }
  return Math.sqrt(re * re + im * im);
}

// Orthogonal matching pursuit for a real signal, k iterations (stops early if the residual is 0).
// Least squares uses an incrementally built QR factorization (Gram-Schmidt, applied twice).
function omp(y, t, k) {
  const m = y.length;
  const support = [], kept = [], Q = [], R = [];
  const ny = vnorm(y);
  let r = Float64Array.from(y);
  for (let it = 0; it < k; it++) {
    if (ny === 0 || vnorm(r) <= 1e-10 * ny || Q.length >= m) break;
    // 1. the frequency whose DFT column is most correlated with the residual (ties: lower f)
    let best = -1, bestC = -1;
    for (let f = 0; f <= FMAX; f++) {
      if (support.includes(f)) continue;
      const c = correlation(r, t, f);
      if (best < 0 || c > bestC * (1 + 1e-9)) {
        best = f;
        bestC = c;
      }
    }
    support.push(best);
    // 2. add its conjugate pair: the cosine and sine columns (DC and 64 Hz have no sine)
    const kinds = (best === 0 || best === FMAX) ? [false] : [false, true];
    for (const isSin of kinds) {
      const a = new Float64Array(m);
      for (let i = 0; i < m; i++) a[i] = colValue(best, isSin, t[i]);
      const na = vnorm(a);
      const v = Float64Array.from(a);
      const rc = new Array(Q.length).fill(0);
      for (let pass = 0; pass < 2; pass++) {
        for (let j = 0; j < Q.length; j++) {
          const h = vdot(Q[j], v);
          rc[j] += h;
          for (let i = 0; i < m; i++) v[i] -= h * Q[j][i];
        }
      }
      const nv = vnorm(v);
      if (na === 0 || nv <= 1e-9 * na || nv <= 1e-8 * Math.sqrt(m)) continue;   // column adds nothing
      for (let i = 0; i < m; i++) v[i] /= nv;
      rc.push(nv);
      Q.push(v);
      R.push(rc);
      kept.push({ f: best, isSin });
    }
    // 3. least-squares residual: y minus its projection onto the support columns
    r = Float64Array.from(y);
    for (const q of Q) {
      const h = vdot(q, r);
      for (let i = 0; i < m; i++) r[i] -= h * q[i];
    }
  }
  // least-squares coefficients: solve R c = Q^T y by back substitution
  const p = Q.length;
  const b = Q.map(q => vdot(q, y));
  const coef = new Float64Array(p);
  for (let j = p - 1; j >= 0; j--) {
    let s = b[j];
    for (let l = j + 1; l < p; l++) s -= R[l][j] * coef[l];
    coef[j] = s / R[j][j];
  }
  return { support, kept, coef, residual: vnorm(r) };
}

// amplitude a of each recovered cosine a cos(2 pi f t + phi)
function ompAmplitudes(o) {
  const out = {};
  for (const f of o.support) out[f] = [0, 0];
  o.kept.forEach((c, j) => { out[c.f][c.isSin ? 1 : 0] = o.coef[j]; });
  const amps = {};
  for (const f of o.support) amps[f] = Math.hypot(out[f][0], out[f][1]);
  return amps;
}

function runCase(seed, k, m, sigma, pattern, full) {
  const c = makeCase(seed);
  const t = sampleTimes(c, m, pattern);
  const x = trueSignal(c, k);
  const y = Float64Array.from(t, n => x[n] + sigma * c.noise[n]);
  const o = omp(y, t, k);
  // OMP estimate on the full grid
  const xh = new Float64Array(N);
  o.kept.forEach((col, j) => {
    for (let n = 0; n < N; n++) xh[n] += o.coef[j] * colValue(col.f, col.isSin, n);
  });
  // minimum-energy solution: measured samples kept, unmeasured samples zero
  const z = new Float64Array(N);
  t.forEach((n, i) => { z[n] = y[i]; });
  const nx = vnorm(x);
  let e1 = 0, e2 = 0;
  for (let n = 0; n < N; n++) {
    e1 += (xh[n] - x[n]) * (xh[n] - x[n]);
    e2 += (z[n] - x[n]) * (z[n] - x[n]);
  }
  const trueSet = c.freqs.slice(0, k);
  const found = o.support.filter(f => trueSet.includes(f)).length;
  const res = {
    seed, k, m, sigma, pattern, c, t, x, y, o, xh, z, trueSet, found,
    ok: found === k && o.support.length === k,
    err: Math.sqrt(e1) / nx,
    errME: Math.sqrt(e2) / nx
  };
  if (full) {
    res.ompAmps = ompAmplitudes(o);
    // amplitude spectrum of the minimum-energy solution: 2|Z(f)|/N (|Z(f)|/N at 0 and 64 Hz)
    res.meAmps = [];
    for (let f = 0; f <= FMAX; f++) {
      const s = correlation(y, t, f) / N;
      res.meAmps.push(f === 0 || f === FMAX ? s : 2 * s);
    }
  }
  return res;
}

// success rate over seeds 1..100 at fixed settings
function runTrials(k, m, sigma, pattern) {
  let ok = 0;
  const errs = [];
  for (let s = 1; s <= TRIAL_SEEDS; s++) {
    const r = runCase(s, k, m, sigma, pattern, false);
    if (r.ok) ok++;
    errs.push(r.err);
  }
  errs.sort((p, q) => p - q);
  const h = errs.length / 2;
  const median = errs.length % 2 ? errs[Math.floor(h)] : (errs[h - 1] + errs[h]) / 2;
  return { k, m, sigma, pattern, ok, median };
}

// rule of thumb m >= C k ln(N/k) with C between 2 and 4
function ruleOfThumb(k) {
  const base = k * Math.log(N / k);
  return { base, lo: Math.round(2 * base), hi: Math.round(4 * base) };
}

// ---------------------------------------------------------------- sketch state

let seed = 1;
let kVal = 3, mVal = 24, sigmaVal = 0, patternVal = 'random';
let current = null, currentKey = '';
let trial = null, trialKey = '', pendingKey = '', pendingSince = 0;
let curves = null, curvesKey = '';
let layout = {};
let layoutWidth = -1;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  kSlider = createSlider(1, KMAX, kVal, 1);
  mSlider = createSlider(8, N, mVal, 1);
  noiseSlider = createSlider(0, 0.3, 0, 0.01);
  kSlider.attribute('aria-label', 'Number of tones k');
  mSlider.attribute('aria-label', 'Number of measured samples m');
  noiseSlider.attribute('aria-label', 'Measurement noise standard deviation sigma');

  patternSelect = createSelect();
  patternSelect.option('Random sample times', 'random');
  patternSelect.option('Evenly spaced times', 'uniform');
  patternSelect.selected('random');
  patternSelect.attribute('aria-label', 'Sampling pattern');

  newSignalButton = createButton('New signal');
  newSignalButton.mousePressed(() => { seed++; });

  layoutWidth = -1;                  // lay out the controls now that they exist
  updateCanvasSize();

  describe('Compressed sensing demonstration. A signal made of k cosines is measured at only m of its 128 ' +
    'sample times. The top plot shows the signal, the measured samples and the orthogonal matching pursuit ' +
    'reconstruction. The middle plot shows the spectrum of the minimum-energy (least-squares) solution, spread ' +
    'over all frequencies, and the bottom plot shows the sparse spectrum recovered by OMP with the true tones as ' +
    'rings. Read-outs give the recovery errors, whether the support was recovered, the m >= C k ln(N/k) rule ' +
    'and the success rate over 100 seeds. Sliders set k, m and the noise level; a menu chooses random or evenly ' +
    'spaced sample times and a button draws a new signal.');
}

function readState() {
  const kv = Math.round(Number(kSlider.value()));
  if (Number.isFinite(kv)) kVal = constrain(kv, 1, KMAX);
  const mv = Math.round(Number(mSlider.value()));
  if (Number.isFinite(mv)) mVal = constrain(mv, 8, N);
  const sv = Number(noiseSlider.value());
  if (Number.isFinite(sv)) sigmaVal = constrain(Math.round(sv * 100) / 100, 0, 0.3);
  patternVal = patternSelect.value() === 'uniform' ? 'uniform' : 'random';

  const key = [seed, kVal, mVal, sigmaVal, patternVal].join('|');
  if (key !== currentKey) {
    current = runCase(seed, kVal, mVal, sigmaVal, patternVal, true);
    currentKey = key;
  }
  // the 100-seed test runs once the settings have been still for 150 ms (it takes up to ~60 ms)
  const tk = [kVal, mVal, sigmaVal, patternVal].join('|');
  if (tk !== trialKey) {
    if (tk !== pendingKey) {
      pendingKey = tk;
      pendingSince = millis();
    }
    if (trial === null || millis() - pendingSince > 150) {
      trial = runTrials(kVal, mVal, sigmaVal, patternVal);
      trialKey = tk;
    }
  }
}

function draw() {
  updateCanvasSize();
  readState();

  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  drawTitle();
  drawBanner();
  drawTimePanel();
  drawMinEnergyPanel();
  drawOmpPanel();
  drawReadouts();
  drawControlLabels();
}

// ---------------------------------------------------------------- header

function drawTitle() {
  noStroke();
  fill(0);
  textStyle(BOLD);
  fitText(['Compressed Sensing: Recovering a Sparse Spectrum', 'Compressed Sensing'],
          canvasWidth / 2, 16, canvasWidth - 20, 20, CENTER);
  textStyle(NORMAL);
}

function drawBanner() {
  const r = current;
  const pct = Math.round(100 * r.m / N);
  const nyq = fmtHz(r.m / 2);
  const uniform = r.pattern === 'uniform';
  const tones = r.k === 1 ? 'tone' : 'tones';
  let cands;
  if (r.ok) {
    cands = uniform
      ? ['OMP recovered all ' + r.k + ' ' + tones + ' from m = ' + r.m + ' evenly spaced samples (' + pct + '% of the 128 Nyquist-rate samples)',
         'OMP recovered all ' + r.k + ' ' + tones + ' from ' + r.m + ' evenly spaced samples',
         'All ' + r.k + ' ' + tones + ' recovered (m = ' + r.m + ')']
      : ['OMP recovered all ' + r.k + ' ' + tones + ' from m = ' + r.m + ' random samples, ' + pct + '% of the 128 Nyquist-rate samples',
         'OMP recovered all ' + r.k + ' ' + tones + ' from ' + r.m + ' random samples (' + pct + '%)',
         'All ' + r.k + ' ' + tones + ' recovered (m = ' + r.m + ')'];
  } else if (uniform) {
    cands = ['Evenly spaced at ' + r.m + ' samples/s: tones above m/2 = ' + nyq + ' Hz alias; OMP found ' + r.found + ' of ' + r.k + ' ' + tones,
             r.m + ' evenly spaced samples: aliasing above ' + nyq + ' Hz; found ' + r.found + ' of ' + r.k,
             'Aliasing: found ' + r.found + ' of ' + r.k];
  } else {
    cands = ['OMP found only ' + r.found + ' of ' + r.k + ' ' + tones + ' from m = ' + r.m + ' random samples: support not recovered',
             'OMP found ' + r.found + ' of ' + r.k + ' ' + tones + ' (m = ' + r.m + '): support not recovered',
             'Found ' + r.found + ' of ' + r.k + ' (m = ' + r.m + ')'];
  }
  const col = r.ok ? COL_OMP_TEXT : COL_ERR;
  stroke(col[0], col[1], col[2]);
  strokeWeight(1.5);
  fill(r.ok ? 'honeydew' : 'mistyrose');
  rect(10, 32, canvasWidth - 20, 24, 8);
  strokeWeight(1);
  noStroke();
  fill(col[0], col[1], col[2]);
  textStyle(BOLD);
  fitText(cands, canvasWidth / 2, 44, canvasWidth - 36, layout.wide ? 14 : 13, CENTER);
  textStyle(NORMAL);
}

// ---------------------------------------------------------------- panels

function panelFrame(p) {
  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
}

// left caption (bold) and a right-aligned legend; the legend is shortened, then dropped, to fit
function caption(p, lefts, col, legends) {
  const y = p.y - 11;
  noStroke();
  fill(col[0], col[1], col[2]);
  textStyle(BOLD);
  const wl = fitText(lefts, p.x, y, p.w, layout.cs, LEFT);
  textStyle(NORMAL);
  for (const items of legends) {
    if (legendWidth(items) <= p.w - wl - 16) {
      drawLegend(items, p.x + p.w, y);
      return;
    }
  }
}

function timeX(p, t) { return p.x + t * p.w; }

function computeCurves(p) {
  const r = current;
  const key = currentKey + '|' + Math.round(p.w);
  if (key === curvesKey) return curves;
  const nPts = Math.max(600, Math.round(p.w * 2));
  const xt = [], xo = [];
  let ymax = 0;
  for (let i = 0; i <= nPts; i++) {
    const t = i / nPts;                         // seconds, 0 .. 1
    let v = 0;
    for (let q = 0; q < r.k; q++) v += r.c.amps[q] * Math.cos(2 * Math.PI * r.c.freqs[q] * t + r.c.phases[q]);
    let w = 0;
    r.o.kept.forEach((col, j) => {
      const ang = 2 * Math.PI * col.f * t;
      w += r.o.coef[j] * (col.isSin ? Math.sin(ang) : Math.cos(ang));
    });
    xt.push(v);
    xo.push(w);
    ymax = Math.max(ymax, Math.abs(v));
  }
  for (const v of r.y) ymax = Math.max(ymax, Math.abs(v));
  curves = { xt, xo, nPts, ymax: Math.max(1, Math.ceil(ymax * 2 - 1e-9) / 2) };
  curvesKey = key;
  return curves;
}

function drawTimePanel() {
  const p = layout.T, r = current;
  const cv = computeCurves(p);
  const Y = v => p.y + p.h / 2 - v / cv.ymax * (p.h / 2 - 4);
  panelFrame(p);

  // grid and tick labels
  textSize(12);
  for (const v of [-cv.ymax, 0, cv.ymax]) {
    stroke(v === 0 ? 150 : 228);
    line(p.x, Y(v), p.x + p.w, Y(v));
    noStroke();
    fill(80);
    textAlign(RIGHT, CENTER);
    text(fmtTick(v), p.x - 5, Y(v));
  }
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    stroke(236);
    line(timeX(p, t), p.y, timeX(p, t), p.y + p.h);
    noStroke();
    fill(80);
    textAlign(t === 1 ? RIGHT : CENTER, TOP);
    text(t === 1 ? '1 s' : String(t), timeX(p, t) + (t === 1 ? 6 : 0), p.y + p.h + 4);
  }

  // the 128 instants of the Nyquist-rate grid; the measured ones are taller
  stroke(185);
  strokeWeight(1);
  for (let n = 0; n < N; n++) line(timeX(p, n / N), p.y + p.h - 4, timeX(p, n / N), p.y + p.h);

  // clip the curves to the panel
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.rect(p.x, p.y, p.w, p.h);
  ctx.clip();
  strokeCurve(cv.xt, cv.nPts, p, Y, 'rgb(' + COL_SIG.join(',') + ')', 2.4);
  if (r.o.kept.length > 0) strokeCurve(cv.xo, cv.nPts, p, Y, 'rgb(' + COL_OMP.join(',') + ')', 1.3);
  ctx.restore();

  // measured samples y_i
  stroke(COL_SAMP[0], COL_SAMP[1], COL_SAMP[2]);
  strokeWeight(1);
  r.t.forEach((n, i) => line(timeX(p, n / N), p.y + p.h - 9, timeX(p, n / N), p.y + p.h));
  noStroke();
  fill(COL_SAMP[0], COL_SAMP[1], COL_SAMP[2]);
  const dot = r.m > 64 ? 4.5 : 6;
  r.t.forEach((n, i) => circle(timeX(p, n / N), constrain(Y(r.y[i]), p.y + 2, p.y + p.h - 2), dot));

  const tones = r.k === 1 ? ' tone' : ' tones';
  caption(p, ['Signal x(t), seed ' + r.seed + ': ' + r.k + tones + ' below 64 Hz, N = 128 samples in 1 s; m = ' + r.m + ' measured',
              'Signal x(t), seed ' + r.seed + ': ' + r.k + tones + ',  m = ' + r.m + ' of 128 measured',
              'x(t), seed ' + r.seed + ': ' + r.k + tones + ', m = ' + r.m,
              'x(t), seed ' + r.seed],
          COL_SIG,
          [[{ kind: 'line', col: COL_SIG, label: 'x(t)' }, { kind: 'line', col: COL_OMP, label: 'OMP estimate' },
            { kind: 'dot', col: COL_SAMP, label: 'samples y_{i}' }],
           [{ kind: 'line', col: COL_SIG, label: 'x' }, { kind: 'line', col: COL_OMP, label: 'OMP' },
            { kind: 'dot', col: COL_SAMP, label: 'y_{i}' }]]);
}

function strokeCurve(vals, nPts, p, Y, css, weight) {
  const ctx = drawingContext;
  ctx.save();
  ctx.strokeStyle = css;
  ctx.lineWidth = weight;
  ctx.setLineDash([]);
  ctx.beginPath();
  for (let i = 0; i <= nPts; i++) {
    const x = p.x + i / nPts * p.w;
    const y = Y(constrain(vals[i], -1e4, 1e4));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

// x position of frequency f (one cell per hertz, 0..64)
function specX(p, f) { return p.x + (f + 0.5) / (FMAX + 1) * p.w; }

function frequencyAxis(p) {
  const step = layout.wide ? 8 : 16;
  textSize(12);
  for (let f = 0; f <= FMAX; f += step) {
    stroke(236);
    line(specX(p, f), p.y, specX(p, f), p.y + p.h);
    noStroke();
    fill(80);
    textAlign(CENTER, TOP);
    text(f === FMAX ? '64 Hz' : String(f), specX(p, f) - (f === FMAX ? 8 : 0), p.y + p.h + 4);
  }
}

function amplitudeAxis(p, top, step) {
  const Y = v => p.y + p.h - v / top * (p.h - 6);
  textSize(12);
  for (let v = 0; v <= top + 1e-9; v += step) {
    stroke(v === 0 ? 150 : 232);
    line(p.x, Y(v), p.x + p.w, Y(v));
    noStroke();
    fill(80);
    textAlign(RIGHT, CENTER);
    text(fmtTick(v), p.x - 5, Y(v));
  }
  return Y;
}

// the Nyquist frequency m/2 of m evenly spaced samples per second
function drawNyquistMark(p, withTag) {
  const r = current;
  const fN = r.m / 2;
  if (fN >= FMAX) return;
  const x = specX(p, fN);
  stroke(COL_NYQ[0], COL_NYQ[1], COL_NYQ[2]);
  strokeWeight(1.2);
  drawingContext.setLineDash([4, 3]);
  line(x, p.y, x, p.y + p.h);
  drawingContext.setLineDash([]);
  strokeWeight(1);
  if (!withTag) return;
  const str = layout.wide ? 'm/2 = ' + fmtHz(fN) + ' Hz (Nyquist limit of m evenly spaced samples)' : 'm/2 = ' + fmtHz(fN) + ' Hz';
  textSize(12);
  const w = advW(str) + 8;
  const tx = constrain(x + 4, p.x + 2, p.x + p.w - w - 2);
  noStroke();
  fill(255, 255, 255, 225);
  rect(tx, p.y + 2, w, 15, 3);
  fill(COL_NYQ[0], COL_NYQ[1], COL_NYQ[2]);
  textAlign(LEFT, CENTER);
  text(str, tx + 4, p.y + 9.5);
}

function drawMinEnergyPanel() {
  const p = layout.M, r = current;
  panelFrame(p);
  let maxA = 0;
  for (const a of r.meAmps) maxA = Math.max(maxA, a);
  const sc = niceScale(maxA);
  const Y = amplitudeAxis(p, sc.top, sc.step);
  frequencyAxis(p);
  drawNyquistMark(p, false);

  const cell = p.w / (FMAX + 1);
  const bw = Math.max(2, cell * 0.62);
  noStroke();
  fill(COL_ME[0], COL_ME[1], COL_ME[2]);
  r.meAmps.forEach((a, f) => {
    if (a > 1e-12) rect(specX(p, f) - bw / 2, Y(a), bw, Y(0) - Y(a));
  });
  // true tone frequencies
  fill(COL_SIG[0], COL_SIG[1], COL_SIG[2]);
  for (const f of r.trueSet) {
    const x = specX(p, f);
    triangle(x - 4.5, p.y + 1, x + 4.5, p.y + 1, x, p.y + 9);
  }
  const ratio = (r.m / N).toFixed(2);
  caption(p, ['Minimum-energy (least-squares) solution: unmeasured samples set to 0',
              'Minimum-energy (least-squares) solution', 'Minimum-energy solution', 'Min-energy'],
          COL_ME,
          [[{ kind: 'tri', col: COL_SIG, label: 'true tones' }, { kind: 'text', col: [70, 70, 70], label: 'peaks ≈ (m/N)·a = ' + ratio + '·a' }],
           [{ kind: 'tri', col: COL_SIG, label: 'true tones' }],
           [{ kind: 'tri', col: COL_SIG, label: 'true' }]]);
}

function drawOmpPanel() {
  const p = layout.O, r = current;
  panelFrame(p);
  const top = 1.2;
  const Y = amplitudeAxis(p, top, 0.5);
  frequencyAxis(p);
  drawNyquistMark(p, true);

  // true tones: blue rings at (f, a)
  noFill();
  stroke(COL_SIG[0], COL_SIG[1], COL_SIG[2]);
  strokeWeight(2);
  for (let i = 0; i < r.k; i++) circle(specX(p, r.c.freqs[i]), Y(r.c.amps[i]), 13);

  // OMP picks: green when the frequency is a true tone, red otherwise
  for (const f of r.o.support) {
    const a = r.ompAmps[f];
    const good = r.trueSet.includes(f);
    const col = good ? COL_OMP : COL_ERR;
    const yTop = Y(Math.min(a, top));
    stroke(col[0], col[1], col[2]);
    strokeWeight(3);
    line(specX(p, f), Y(0), specX(p, f), yTop);
    noStroke();
    fill(col[0], col[1], col[2]);
    if (a > top) triangle(specX(p, f) - 5, yTop + 6, specX(p, f) + 5, yTop + 6, specX(p, f), yTop - 2);
    else circle(specX(p, f), yTop, 7);
  }
  strokeWeight(1);

  const it = r.o.support.length;
  caption(p, ['OMP estimate after ' + it + ' iteration' + (it === 1 ? '' : 's') + ' (one frequency per iteration)',
              'OMP estimate after ' + it + ' iteration' + (it === 1 ? '' : 's'), 'OMP estimate', 'OMP'],
          COL_OMP_TEXT,
          [[{ kind: 'ring', col: COL_SIG, label: 'true tone (f, a)' }, { kind: 'stem', col: COL_OMP, label: 'found' },
            { kind: 'stem', col: COL_ERR, label: 'wrong frequency' }],
           [{ kind: 'ring', col: COL_SIG, label: 'true' }, { kind: 'stem', col: COL_OMP, label: 'found' },
            { kind: 'stem', col: COL_ERR, label: 'wrong' }]]);
}

// ---------------------------------------------------------------- read-outs

function drawReadouts() {
  const r = current, tr = trial;
  const x = 14, w = canvasWidth - 28, sz = 14;
  const ys = layout.readY;
  noStroke();

  // 1. OMP
  const col = r.ok ? COL_OMP_TEXT : COL_ERR;
  fill(col[0], col[1], col[2]);
  textStyle(BOLD);
  const yes = r.ok ? 'YES' : 'NO';
  const picks = r.o.support.length ? r.o.support.join(', ') + ' Hz' : 'nothing';
  const e1 = fmtPct(r.err);
  fitText(['OMP picked ' + picks + ': support recovered ' + yes + ' (' + r.found + ' of ' + r.k + ' tones), recovery error ' + e1,
           'OMP: support recovered ' + yes + ' (' + r.found + ' of ' + r.k + ' tones), recovery error ' + e1,
           'OMP: support ' + yes + ' (' + r.found + '/' + r.k + '), error ' + e1],
          x, ys[0], w, sz, LEFT);
  textStyle(NORMAL);

  // 2. minimum-energy solution
  fill(COL_ME[0], COL_ME[1], COL_ME[2]);
  const e2 = fmtPct(r.errME);
  const gaps = N - r.m;
  fitText(['Minimum-energy (least-squares) solution: recovery error ' + e2 + ', because it sets the ' + gaps + ' unmeasured samples to zero',
           'Minimum-energy solution: recovery error ' + e2 + ' (' + gaps + ' samples set to 0)',
           'Min-energy: error ' + e2],
          x, ys[1], w, sz, LEFT);

  // 3. rule of thumb
  fill(70);
  const rule = ruleOfThumb(r.k);
  const C = (r.m / rule.base).toFixed(1);
  fitText(['Rule of thumb m ≥ C·k·ln(N/k), C ≈ 2 to 4: ' + rule.lo + ' to ' + rule.hi + ' samples for k = ' + r.k +
           ' (Nyquist rate: 128).  Here m = ' + r.m + ' = ' + C + '·k·ln(N/k)',
           'Rule m ≥ C·k·ln(N/k), C ≈ 2 to 4: ' + rule.lo + ' to ' + rule.hi + ' samples; here C = ' + C,
           'm ≥ C·k·ln(N/k): ' + rule.lo + ' to ' + rule.hi + '; C = ' + C],
          x, ys[2], w, sz, LEFT);

  // 4. success rate over seeds 1..100
  const tk = [kVal, mVal, sigmaVal, patternVal].join('|');
  if (tk !== trialKey) {
    fill(120);
    fitText(['Seeds 1 to 100 at these settings: testing…', 'Seeds 1–100: testing…'], x, ys[3], w, sz, LEFT);
    return;
  }
  fill(20);
  textStyle(BOLD);
  const med = fmtPct(tr.median);
  fitText(['Seeds 1 to 100 at these settings: support recovered in ' + tr.ok + ' of 100 trials, median OMP error ' + med,
           'Seeds 1–100: support recovered in ' + tr.ok + ' of 100, median error ' + med,
           'Seeds 1–100: ' + tr.ok + '/100 recovered'],
          x, ys[3], w, sz, LEFT);
  textStyle(NORMAL);
}

function drawControlLabels() {
  noStroke();
  fill('black');
  const narrow = !layout.wide;
  const sz = narrow ? 15 : defaultTextSize;
  richText((narrow ? 'k = ' : 'Tones k = ') + kVal, 10, rowY(0), sz, LEFT);
  richText((narrow ? 'm = ' : 'Samples m = ') + mVal + ' (' + Math.round(100 * mVal / N) + '%)', 10, rowY(1), sz, LEFT);
  richText((narrow ? 'σ = ' : 'Noise σ = ') + sigmaVal.toFixed(2), 10, rowY(2), sz, LEFT);
}

// ---------------------------------------------------------------- legend helpers

function legendItemWidth(it) {
  const tw = richWidth(it.label, layout.ls);
  return it.kind === 'text' ? tw : 18 + tw;
}

function legendWidth(items) {
  return items.reduce((w, it) => w + legendItemWidth(it) + 14, -14);
}

// right-aligned at xRight, vertical centre y
function drawLegend(items, xRight, y) {
  let x = xRight - legendWidth(items);
  for (const it of items) {
    const c = it.col;
    if (it.kind === 'line') {
      stroke(c[0], c[1], c[2]);
      strokeWeight(2.5);
      line(x, y, x + 13, y);
    } else if (it.kind === 'dot') {
      noStroke();
      fill(c[0], c[1], c[2]);
      circle(x + 6, y, 7);
    } else if (it.kind === 'ring') {
      noFill();
      stroke(c[0], c[1], c[2]);
      strokeWeight(2);
      circle(x + 6, y, 10);
    } else if (it.kind === 'stem') {
      stroke(c[0], c[1], c[2]);
      strokeWeight(3);
      line(x + 6, y + 6, x + 6, y - 3);
      noStroke();
      fill(c[0], c[1], c[2]);
      circle(x + 6, y - 4, 6);
    } else if (it.kind === 'tri') {
      noStroke();
      fill(c[0], c[1], c[2]);
      triangle(x + 1.5, y - 4, x + 10.5, y - 4, x + 6, y + 4);
    }
    noStroke();
    fill(c[0], c[1], c[2]);
    const tx = it.kind === 'text' ? x : x + 18;
    richText(it.label, tx, y, layout.ls, LEFT);
    x += legendItemWidth(it) + 14;
  }
  strokeWeight(1);
}

function niceScale(maxV) {
  if (!(maxV > 1e-9)) return { top: 1, step: 0.25 };
  const raw = maxV / 3;
  const p10 = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p10;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p10;
  return { top: Math.ceil(maxV / step - 1e-9) * step, step };
}

// ---------------------------------------------------------------- text helpers

// Rich text: "^{...}" is drawn as a superscript and "_{...}" as a subscript
function parseRich(s) {
  const out = [];
  let buf = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if ((ch === '^' || ch === '_') && s[i + 1] === '{') {
      const end = s.indexOf('}', i + 2);
      if (end > 0) {
        if (buf) {
          out.push({ t: buf, mode: 0 });
          buf = '';
        }
        out.push({ t: s.slice(i + 2, end), mode: ch === '^' ? 1 : -1 });
        i = end + 1;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  if (buf) out.push({ t: buf, mode: 0 });
  return out;
}

// advance width: in p5 2.x textWidth() measures tight bounds and ignores spaces,
// so runs of text placed side by side must use fontWidth()
function advW(s) {
  return typeof fontWidth === 'function' ? fontWidth(s) : textWidth(s);
}

function richWidth(s, sz) {
  let w = 0;
  for (const part of parseRich(s)) {
    textSize(part.mode === 0 ? sz : sz * 0.72);
    w += advW(part.t);
  }
  textSize(sz);
  return w;
}

// y is the vertical centre of the line
function richText(s, x, y, sz, align) {
  const w = richWidth(s, sz);
  let cx = align === CENTER ? x - w / 2 : (align === RIGHT ? x - w : x);
  textAlign(LEFT, CENTER);
  for (const part of parseRich(s)) {
    textSize(part.mode === 0 ? sz : sz * 0.72);
    const dy = part.mode === 1 ? -sz * 0.36 : (part.mode === -1 ? sz * 0.3 : 0);
    text(part.t, cx, y + dy);
    cx += advW(part.t);
  }
  textSize(sz);
  return w;
}

// draw the first candidate that fits in maxW (the last one otherwise); returns its width
function fitText(cands, x, y, maxW, sz, align) {
  for (const c of cands) {
    if (richWidth(c, sz) <= maxW) return richText(c, x, y, sz, align);
  }
  return richText(cands[cands.length - 1], x, y, sz, align);
}

function fmtTick(v) {
  const r = Math.round(v * 1000) / 1000;
  return (r < 0 ? '−' : '') + String(Math.abs(r));
}

function fmtPct(v) {
  return (100 * v).toFixed(1) + '%';
}

function fmtHz(v) {
  return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1);
}

// ---------------------------------------------------------------- responsive layout

// vertical centre of control row i
function rowY(i) {
  return drawHeight + 20 + 34 * i;
}

function computeLayout() {
  const W = canvasWidth;
  layout.wide = W >= 600;
  layout.cs = layout.wide ? 14 : 13;        // caption text size
  layout.ls = layout.wide ? 13 : 12;        // legend text size
  const left = layout.wide ? 46 : 40, right = 14;
  const w = W - left - right;
  layout.T = { x: left, y: 84, w, h: 100 };
  layout.M = { x: left, y: 232, w, h: 84 };
  layout.O = { x: left, y: 362, w, h: 84 };
  layout.readY = [478, 500, 522, 544];
}

function layoutControls() {
  if (typeof newSignalButton === 'undefined') return;
  const W = canvasWidth;
  const narrow = W < 600;
  const sl = narrow ? 125 : sliderLeftMargin;
  const sw = Math.max(80, W - sl - margin);
  kSlider.position(sl, rowY(0) - 10);
  kSlider.size(sw);
  mSlider.position(sl, rowY(1) - 10);
  mSlider.size(sw);
  noiseSlider.position(sl, rowY(2) - 10);
  noiseSlider.size(sw);
  patternSelect.style('font-size', narrow ? '14px' : '15px');
  newSignalButton.style('font-size', narrow ? '14px' : '15px');
  patternSelect.position(10, rowY(3) - 12);
  newSignalButton.position(10 + patternSelect.elt.offsetWidth + 12, rowY(3) - 12);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  if (canvasWidth !== layoutWidth) {
    layoutWidth = canvasWidth;
    computeLayout();
    layoutControls();
  }
}
