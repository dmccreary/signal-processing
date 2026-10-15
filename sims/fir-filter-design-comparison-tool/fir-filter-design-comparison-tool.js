// FIR Filter Design Comparison Tool MicroSim
// CANVAS_HEIGHT: 665
// Two linear-phase FIR designs (A solid, B dashed) for the same low-pass, high-pass or
// band-pass specification. Each design uses the window method, frequency sampling or
// Parks-McClellan. The sketch plots h[n] (or the zeros, phase or group delay) and |H| and
// measures the transition width, passband ripple and stop-band attenuation. p5.js 2.3.2, no audio.

// Canvas dimensions and layout
let canvasWidth = 900;            // overwritten from the container in updateCanvasSize()
let drawHeight = 490;
let controlHeight = 175;
let canvasHeight = drawHeight + controlHeight;
let margin = 12;
let defaultTextSize = 16;

// Frequency grid and plot ranges
const GRID = 2048;                // |H| is evaluated at GRID + 1 points on 0 <= w <= pi
const DB_TOP = 10;
const DB_FLOOR = -120;
const PM_MAX_DB = 130;            // cap on Kaiser's attenuation estimate for Parks-McClellan (see remezDesign)
const ZOOM_STEPS = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];

// Colours: design A = blue solid, design B = maroon dashed, ideal = grey
const COLOR_A = [21, 101, 192];
const COLOR_B = [150, 30, 70];
const COLOR_IDEAL = [120, 120, 120];
const DASH_B = [8, 5];

const METHODS = ['Window', 'Freq. sampling', 'Parks-McClellan'];
const SCALE_DB = 'dB scale', SCALE_LIN = 'Linear scale', SCALE_ZOOM = 'Passband zoom';
const VIEWS = ['Impulse h[n]', 'Zeros', 'Phase', 'Group delay'];
const ROW1_LABELS = [{ text: 'Filter type:', w: 92 }, { text: 'Magnitude:', w: 90 }, { text: 'Left plot:', w: 76 }];
const WINDOWS = ['Rectangular', 'Hann', 'Hamming', 'Blackman', 'Kaiser'];

// Controls (shared specification)
let typeSelect, scaleSelect, viewSelect, fc1Slider, fc2Slider;
// Controls for design A
let methodSelA, windowSelA, tapsSliderA, betaSliderA, transSliderA, widthSliderA;
// Controls for design B
let methodSelB, windowSelB, tapsSliderB, betaSliderB, transSliderB, widthSliderB;

let ctl = {};                     // ctl.A / ctl.B group each design's controls
let designs = { A: null, B: null };
let designKeys = { A: '', B: '' };
let stateKey = '';
let layoutWidth = -1;
let compact = false;              // narrow controls (< 760 px)
let narrow = false;               // stacked drawing (< 640 px)
let geo = {};                     // plot rectangles

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);
  frameRate(30);

  createControls();
  layoutControls(true);

  describe('FIR filter design comparison. Two designs, A (solid blue) and B (dashed maroon), meet the same low-pass, high-pass or band-pass cutoff. Each uses the window method, frequency sampling or Parks-McClellan with its own number of taps. The left plot shows the impulse response (or the zeros, phase or group delay); the right plot shows the magnitude response with the ideal response in grey. A table reports each design\'s transition width, passband ripple and stop-band attenuation.');
}

function draw() {
  updateCanvasSize();
  syncControlStates();
  updateDesigns();

  // Drawing area and control area
  stroke('silver');
  strokeWeight(1);
  fill('aliceblue');
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  drawTitle();
  drawMagnitudePlot();
  const view = viewSelect.value();
  if (view === 'Zeros') drawZerosPlot();
  else if (view === 'Phase') drawPhasePlot();
  else if (view === 'Group delay') drawGroupDelayPlot();
  else drawImpulsePlot();
  drawReadoutTable();
  drawControlLabels();
}

// ---------------------------------------------------------------------------
// Filter design
// ---------------------------------------------------------------------------

function currentSpec() {
  return {
    type: typeSelect.value(),
    w1: Number(fc1Slider.value()),            // cutoffs in units of pi rad/sample
    w2: Number(fc2Slider.value())
  };
}

function designParams(id) {
  const c = ctl[id];
  return {
    method: c.method.value(),
    window: c.window.value(),
    N: Number(c.taps.value()),
    beta: Number(c.beta.value()),
    T: Number(c.trans.value()),
    dw: Number(c.width.value())
  };
}

function updateDesigns() {
  const spec = currentSpec();
  for (const id of ['A', 'B']) {
    const p = designParams(id);
    const key = JSON.stringify([spec, p]);
    if (key !== designKeys[id]) {
      designs[id] = computeDesign(spec, p);
      designKeys[id] = key;
    }
  }
}

function computeDesign(spec, p) {
  let h;
  let pmHalfWidth = null;
  if (p.method === 'Window') {
    h = windowDesign(spec, p.N, p.window, p.beta);
  } else if (p.method === 'Freq. sampling') {
    h = freqSamplingDesign(spec, p.N, p.T);
  } else {
    const r = remezDesign(spec, p.N, p.dw);
    h = r.h;
    pmHalfWidth = r.half;
  }
  if (h.some(v => !isFinite(v))) h = h.map(() => 0);
  const amp = amplitudeResponse(h);
  const mag = amp.map(Math.abs);
  return { spec, p, h, amp, mag, M: (p.N - 1) / 2, meas: measureResponse(mag, spec), zeros: null, pmHalfWidth };
}

// Ideal (infinite-length) low-pass impulse response at k = n - M
function idealLowpass(wc, k) {
  return k === 0 ? wc / Math.PI : Math.sin(wc * k) / (Math.PI * k);
}

function idealImpulse(spec, N) {
  const M = (N - 1) / 2;
  const w1 = spec.w1 * Math.PI, w2 = spec.w2 * Math.PI;
  const h = new Array(N);
  for (let n = 0; n < N; n++) {
    const k = n - M;
    if (spec.type === 'Low-pass') h[n] = idealLowpass(w1, k);
    else if (spec.type === 'High-pass') h[n] = (k === 0 ? 1 : 0) - idealLowpass(w1, k);
    else h[n] = idealLowpass(w2, k) - idealLowpass(w1, k);
  }
  return h;
}

function besselI0(x) {
  let sum = 1, term = 1;
  const q = x * x / 4;
  for (let k = 1; k < 200 && term > 1e-14 * sum; k++) {
    term *= q / (k * k);
    sum += term;
  }
  return sum;
}

// Symmetric windows of length N (n = 0 .. N-1). Hann and Blackman have zero end points.
function makeWindow(name, N, beta) {
  const M = (N - 1) / 2;
  const w = new Array(N);
  for (let n = 0; n < N; n++) {
    const c = 2 * Math.PI * n / (N - 1);
    let v;
    if (name === 'Hann') v = 0.5 - 0.5 * Math.cos(c);
    else if (name === 'Hamming') v = 0.54 - 0.46 * Math.cos(c);
    else if (name === 'Blackman') v = 0.42 - 0.5 * Math.cos(c) + 0.08 * Math.cos(2 * c);
    else if (name === 'Kaiser') {
      const r = (n - M) / M;
      v = besselI0(beta * Math.sqrt(Math.max(0, 1 - r * r))) / besselI0(beta);
    } else v = 1;
    w[n] = Math.abs(v) < 1e-12 ? 0 : v;
  }
  return w;
}

function windowDesign(spec, N, windowName, beta) {
  const hd = idealImpulse(spec, N);
  const w = makeWindow(windowName, N, beta);
  return hd.map((v, n) => v * w[n]);
}

function inPassband(spec, wPi) {
  const eps = 1e-9;
  if (spec.type === 'Low-pass') return wPi <= spec.w1 + eps;
  if (spec.type === 'High-pass') return wPi >= spec.w1 - eps;
  return wPi >= spec.w1 - eps && wPi <= spec.w2 + eps;
}

// Frequency sampling, type I (N odd): amplitude samples A[k] at w_k = 2 pi k / N,
// k = 0..M, then the inverse DFT of H[k] = A[k] exp(-j pi k (N-1)/N).
// Stop-band bins next to a pass-band bin are transition samples with value T.
function freqSamplingDesign(spec, N, T) {
  const M = (N - 1) / 2;
  const pass = [];
  for (let k = 0; k <= M; k++) pass.push(inPassband(spec, 2 * k / N));
  const A = pass.map((p, k) => {
    if (p) return 1;
    const nextToPass = (k > 0 && pass[k - 1]) || (k < M && pass[k + 1]);
    return nextToPass ? T : 0;
  });
  return amplitudeToImpulse(A, N);
}

// h[n] = (1/N) [A0 + 2 sum_{k=1}^{M} A_k cos(2 pi k (n - M) / N)]
function amplitudeToImpulse(A, N) {
  const M = (N - 1) / 2;
  const h = new Array(N);
  for (let n = 0; n < N; n++) {
    let s = A[0];
    for (let k = 1; k <= M; k++) s += 2 * A[k] * Math.cos(2 * Math.PI * k * (n - M) / N);
    h[n] = s / N;
  }
  return h;
}

// Parks-McClellan (Remez exchange) for an odd-length symmetric FIR with equal
// pass-band and stop-band weights. Band edges are cutoff -/+ half the transition width.
function remezDesign(spec, N, dwPi) {
  const M = (N - 1) / 2;
  const r = M + 2;                                    // number of extremal frequencies
  const PI = Math.PI;
  const w1 = spec.w1 * PI, w2 = spec.w2 * PI;
  let half = dwPi * PI / 2;
  // Kaiser's estimate A = 2.285 dw (N - 1) + 7.95 dB. Far beyond the -120 dB plot floor the
  // optimal ripple drowns in double-precision rounding, so the transition width is capped.
  half = Math.min(half, (PM_MAX_DB - 7.95) / (2.285 * (N - 1)) / 2);
  // Keep at least half of every pass band and stop band
  if (spec.type === 'Band-pass') half = Math.min(half, 0.25 * (w2 - w1), 0.5 * w1, 0.5 * (PI - w2));
  else half = Math.min(half, 0.5 * w1, 0.5 * (PI - w1));

  let bands;
  if (spec.type === 'Low-pass') bands = [[0, w1 - half, 1], [w1 + half, PI, 0]];
  else if (spec.type === 'High-pass') bands = [[0, w1 - half, 0], [w1 + half, PI, 1]];
  else bands = [[0, w1 - half, 0], [w1 + half, w2 - half, 1], [w2 + half, PI, 0]];

  // Dense grid (about 16 points per coefficient), band edges included
  const total = bands.reduce((s, b) => s + (b[1] - b[0]), 0);
  const target = 16 * (M + 1);
  const grid = [], D = [], band = [];
  bands.forEach((b, bi) => {
    const n = Math.max(8, Math.round(target * (b[1] - b[0]) / total));
    for (let i = 0; i < n; i++) {
      grid.push(b[0] + (b[1] - b[0]) * i / (n - 1));
      D.push(b[2]);
      band.push(bi);
    }
  });
  const G = grid.length;
  const x = grid.map(Math.cos);
  const E = new Float64Array(G);

  // Start from the error extrema of a Kaiser-window design with the same edges, so the
  // first levelled error is already close to the optimum (a uniform start can give a
  // levelled error far below double precision for long filters).
  const A0 = 2.285 * 2 * half * (N - 1) + 7.95;
  const beta0 = A0 > 50 ? 0.1102 * (A0 - 8.7) : (A0 > 21 ? 0.5842 * Math.pow(A0 - 21, 0.4) + 0.07886 * (A0 - 21) : 0);
  const h0 = windowDesign(spec, N, 'Kaiser', beta0);
  let err0 = 0;
  for (let j = 0; j < G; j++) {
    let s = h0[M];
    for (let k = 1; k <= M; k++) s += 2 * h0[M + k] * Math.cos(k * grid[j]);
    E[j] = D[j] - s;
    err0 = Math.max(err0, Math.abs(E[j]));
  }
  let ext = trimExtrema(alternatingExtrema(E, band, G, 0), E, r);
  if (ext.length < r) {                               // top up with evenly spaced points
    const have = new Set(ext);
    for (let i = 0; i < r && have.size < r; i++) have.add(Math.round(i * (G - 1) / (r - 1)));
    for (let j = 0; have.size < r; j++) have.add(j);
    ext = [...have].sort((a, b) => a - b);
  }

  let best = null;
  for (let iter = 0; iter < 60; iter++) {
    const xe = ext.map(i => x[i]);
    const be = baryWeights(xe);
    let num = 0, den = 0;
    for (let i = 0; i < r; i++) {
      num += be[i] * D[ext[i]];
      den += be[i] * (i % 2 === 0 ? 1 : -1);
    }
    const delta = num / den;
    const xi = xe.slice(0, r - 1);
    const yi = xi.map((_, i) => D[ext[i]] - (i % 2 === 0 ? 1 : -1) * delta);
    const bi = baryWeights(xi);
    let maxE = 0;
    for (let j = 0; j < G; j++) {
      E[j] = D[j] - baryEval(x[j], xi, yi, bi);
      maxE = Math.max(maxE, Math.abs(E[j]));
    }
    if (!isFinite(maxE)) break;
    if (!best || maxE < best.maxE) best = { maxE, xi, yi, bi };
    if (maxE - Math.abs(delta) <= 1e-6 * maxE) break;  // levelled error = peak error: optimal
    const alt = trimExtrema(alternatingExtrema(E, band, G, Math.abs(delta) * (1 - 1e-4) - 1e-11), E, r);
    if (alt.length < r || alt.every((v, i) => v === ext[i])) break;
    ext = alt;
  }

  // Sample the best amplitude response at w_k = 2 pi k / N and invert
  if (!best || best.maxE > err0) return { h: h0, half: half / PI };
  const A = [];
  for (let k = 0; k <= M; k++) A.push(baryEval(Math.cos(2 * PI * k / N), best.xi, best.yi, best.bi));
  return { h: amplitudeToImpulse(A, N), half: half / PI };
}

// Local maxima of E (where E > 0) and minima (where E < 0) inside each band with
// |E| >= minAbs; band edges count as extrema of their band. Same-sign runs keep their largest.
function alternatingExtrema(E, band, G, minAbs) {
  const alt = [];
  for (let j = 0; j < G; j++) {
    if (Math.abs(E[j]) < minAbs || E[j] === 0) continue;
    const s = E[j] > 0 ? 1 : -1;
    const left = (j > 0 && band[j - 1] === band[j]) ? s * E[j - 1] : -Infinity;
    const right = (j < G - 1 && band[j + 1] === band[j]) ? s * E[j + 1] : -Infinity;
    if (!(s * E[j] >= left && s * E[j] > right)) continue;
    const last = alt.length - 1;
    if (last >= 0 && Math.sign(E[j]) === Math.sign(E[alt[last]])) {
      if (Math.abs(E[j]) > Math.abs(E[alt[last]])) alt[last] = j;
    } else alt.push(j);
  }
  return alt;
}

// Remove surplus extrema (smallest first) while keeping the signs alternating
function trimExtrema(alt, E, r) {
  alt = alt.slice();
  while (alt.length > r) {
    if (alt.length - r === 1) {
      if (Math.abs(E[alt[0]]) < Math.abs(E[alt[alt.length - 1]])) alt.shift(); else alt.pop();
    } else {
      let k = 0;
      for (let i = 1; i < alt.length; i++) if (Math.abs(E[alt[i]]) < Math.abs(E[alt[k]])) k = i;
      if (k === 0) alt.shift();
      else if (k === alt.length - 1) alt.pop();
      else {
        alt.splice(k, 1);
        alt.splice(Math.abs(E[alt[k - 1]]) < Math.abs(E[alt[k]]) ? k - 1 : k, 1);
      }
    }
  }
  return alt;
}

function baryWeights(xs) {
  const n = xs.length;
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let p = 1;
    for (let j = 0; j < n; j++) if (j !== i) p *= 2 * (xs[i] - xs[j]);
    w[i] = 1 / p;
  }
  return w;
}

function baryEval(xv, xs, ys, w) {
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) {
    const d = xv - xs[i];
    if (d === 0) return ys[i];
    const t = w[i] / d;
    num += t * ys[i];
    den += t;
  }
  return num / den;
}

// Zero-phase amplitude A(w) = h[M] + 2 sum_k h[M+k] cos(k w), so H = A(w) exp(-j M w)
function amplitudeResponse(h) {
  const N = h.length, M = (N - 1) / 2;
  const out = new Float64Array(GRID + 1);
  for (let i = 0; i <= GRID; i++) {
    const w = Math.PI * i / GRID;
    let s = h[M];
    for (let k = 1; k <= M; k++) s += (h[M + k] + h[M - k]) * Math.cos(k * w);
    out[i] = s;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Measurements: passband ripple, stop-band attenuation and transition width
// ---------------------------------------------------------------------------

// An edge is where |H| crosses 0.5 near the cutoff. dir = +1 when the stop band lies at
// higher frequencies. From there the response is followed into the stop band to its first
// minimum and back into the pass band to its last peak.
function findEdge(mag, iCut, dir, lo, hi) {
  for (let d = 0; d <= hi - lo; d++) {
    for (const p of [iCut + d, iCut - d]) {
      const s = p + dir;
      if (p < lo || p > hi || s < lo || s > hi) continue;
      if (mag[p] >= 0.5 && mag[s] < 0.5) {
        let st = s;
        while (st + dir >= 0 && st + dir <= GRID && mag[st + dir] < mag[st]) st += dir;
        let pe = p;
        while (pe - dir >= 0 && pe - dir <= GRID && mag[pe - dir] > mag[pe]) pe -= dir;
        return { dir, passEnd: pe, stopStart: st };
      }
    }
  }
  return null;
}

// Walk from index start in direction dir until test(mag) is true; interpolate the crossing.
function crossing(mag, start, dir, level, test) {
  for (let j = start; j >= 0 && j <= GRID; j += dir) {
    if (test(mag[j])) {
      if (j === start) return j;
      const prev = j - dir;
      const f = (mag[prev] - level) / (mag[prev] - mag[j]);
      return prev + dir * Math.min(1, Math.max(0, f));
    }
  }
  return null;
}

function measureResponse(mag, spec) {
  const iC1 = Math.round(spec.w1 * GRID), iC2 = Math.round(spec.w2 * GRID);
  let edges, passRange, stopRanges;
  if (spec.type === 'Low-pass') {
    const e = findEdge(mag, iC1, 1, 0, GRID);
    if (!e) return null;
    edges = [e]; passRange = [0, e.passEnd]; stopRanges = [[e.stopStart, GRID]];
  } else if (spec.type === 'High-pass') {
    const e = findEdge(mag, iC1, -1, 0, GRID);
    if (!e) return null;
    edges = [e]; passRange = [e.passEnd, GRID]; stopRanges = [[0, e.stopStart]];
  } else {
    const mid = Math.round((iC1 + iC2) / 2);
    const lo = findEdge(mag, iC1, -1, 0, mid);
    const hi = findEdge(mag, iC2, 1, mid, GRID);
    if (!lo || !hi || lo.passEnd > hi.passEnd) return null;
    edges = [lo, hi]; passRange = [lo.passEnd, hi.passEnd];
    stopRanges = [[0, lo.stopStart], [hi.stopStart, GRID]];
  }
  let dp = 0, ds = 0;
  for (let i = passRange[0]; i <= passRange[1]; i++) dp = Math.max(dp, Math.abs(mag[i] - 1));
  for (const [a, b] of stopRanges) for (let i = a; i <= b; i++) ds = Math.max(ds, mag[i]);
  if (dp >= 1 || ds <= 0) return null;
  const edgeInfo = edges.map(e => {
    const wp = crossing(mag, e.passEnd, e.dir, 1 - dp, v => v < 1 - dp);
    const ws = crossing(mag, e.passEnd, e.dir, ds, v => v <= ds);
    return { wp: wp / GRID, ws: ws / GRID };
  });
  if (edgeInfo.some(e => !isFinite(e.wp) || !isFinite(e.ws))) return null;
  return {
    dp, ds,
    rippleDb: 20 * Math.log10((1 + dp) / (1 - dp)),
    attenDb: -20 * Math.log10(ds),
    dw: Math.max(...edgeInfo.map(e => Math.abs(e.ws - e.wp))),
    edges: edgeInfo, passRange, stopRanges
  };
}

// Kaiser's empirical formulas, inverted for a given beta and N
function kaiserPrediction(beta, N) {
  let A;
  if (beta <= 0) A = 21;
  else if (beta > 0.1102 * (50 - 8.7)) A = beta / 0.1102 + 8.7;
  else {
    let lo = 21, hi = 50;                             // beta = 0.5842 (A-21)^0.4 + 0.07886 (A-21)
    for (let i = 0; i < 60; i++) {
      const m = (lo + hi) / 2;
      const b = 0.5842 * Math.pow(m - 21, 0.4) + 0.07886 * (m - 21);
      if (b < beta) lo = m; else hi = m;
    }
    A = (lo + hi) / 2;
  }
  const dwPi = (A - 7.95) / (2.285 * (N - 1)) / Math.PI;
  return { A, dwPi };
}

// ---------------------------------------------------------------------------
// Zeros of H(z) (Aberth-Ehrlich iteration)
// ---------------------------------------------------------------------------

function firZeros(h) {
  const big = Math.max(...h.map(Math.abs));
  let a = 0, b = h.length - 1;
  while (a < b && Math.abs(h[a]) < 1e-13 * big) a++;   // zero end taps cancel poles at z = 0
  while (b > a && Math.abs(h[b]) < 1e-13 * big) b--;
  return polyRoots(h.slice(a, b + 1));
}

// Roots of c[0] z^n + c[1] z^(n-1) + ... + c[n]
function polyRoots(c) {
  const n = c.length - 1;
  if (n < 1) return [];
  const a = c.map(v => v / c[0]);
  const R = Math.pow(Math.abs(a[n]), 1 / n) || 1;
  const zr = new Float64Array(n), zi = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const th = 2 * Math.PI * k / n + 0.4;
    zr[k] = R * Math.cos(th);
    zi[k] = R * Math.sin(th);
  }
  for (let iter = 0; iter < 400; iter++) {
    let worst = 0;
    for (let k = 0; k < n; k++) {
      const q = newtonRatio(a, zr[k], zi[k]);          // p(z) / p'(z)
      if (!q) continue;
      let sr = 0, si = 0;
      for (let j = 0; j < n; j++) {
        if (j === k) continue;
        const dr = zr[k] - zr[j], di = zi[k] - zi[j];
        const d2 = dr * dr + di * di;
        if (d2 === 0) continue;
        sr += dr / d2;
        si -= di / d2;
      }
      const pr = q[0] * sr - q[1] * si, pim = q[0] * si + q[1] * sr;
      const er = 1 - pr, ei = -pim;
      const e2 = er * er + ei * ei;
      if (!(e2 > 0)) continue;
      const wr = (q[0] * er + q[1] * ei) / e2, wi = (q[1] * er - q[0] * ei) / e2;
      if (!isFinite(wr) || !isFinite(wi)) continue;
      zr[k] -= wr;
      zi[k] -= wi;
      worst = Math.max(worst, Math.hypot(wr, wi) / Math.max(1, Math.hypot(zr[k], zi[k])));
    }
    if (worst < 1e-10) break;
  }
  const roots = [];
  for (let k = 0; k < n; k++) roots.push([zr[k], zi[k]]);
  return roots;
}

// p(z)/p'(z) by Horner; for |z| > 1 the reversed polynomial keeps the arithmetic stable
function newtonRatio(a, xr, xi) {
  const n = a.length - 1;
  const r2 = xr * xr + xi * xi;
  if (r2 <= 1) {
    let pr = a[0], pi = 0, dr = 0, di = 0;
    for (let k = 1; k <= n; k++) {
      const ndr = dr * xr - di * xi + pr, ndi = dr * xi + di * xr + pi;
      dr = ndr; di = ndi;
      const npr = pr * xr - pi * xi + a[k], npi = pr * xi + pi * xr;
      pr = npr; pi = npi;
    }
    const d2 = dr * dr + di * di;
    if (!(d2 > 0)) return null;
    return [(pr * dr + pi * di) / d2, (pi * dr - pr * di) / d2];
  }
  // w = 1/z, q(w) = sum a[k] w^k; p/p' = z q / (n q - w q')
  const wr = xr / r2, wi = -xi / r2;
  let qr = a[n], qi = 0, dr = 0, di = 0;
  for (let k = n - 1; k >= 0; k--) {
    const ndr = dr * wr - di * wi + qr, ndi = dr * wi + di * wr + qi;
    dr = ndr; di = ndi;
    const nqr = qr * wr - qi * wi + a[k], nqi = qr * wi + qi * wr;
    qr = nqr; qi = nqi;
  }
  const numr = xr * qr - xi * qi, numi = xr * qi + xi * qr;           // z q
  const wdr = wr * dr - wi * di, wdi = wr * di + wi * dr;             // w q'
  const denr = n * qr - wdr, deni = n * qi - wdi;
  const d2 = denr * denr + deni * deni;
  if (!(d2 > 0)) return null;
  return [(numr * denr + numi * deni) / d2, (numi * denr - numr * deni) / d2];
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function computeGeometry() {
  const W = canvasWidth;
  if (!narrow) {
    const split = Math.round(W * 0.36);
    geo.left = { x0: 58, x1: split, y0: 64, y1: 300 };
    geo.mag = { x0: split + 64, x1: W - 18, y0: 64, y1: 300 };
    geo.table = { x0: margin, x1: W - margin, y0: 352, y1: 482 };
  } else {
    geo.mag = { x0: 48, x1: W - 12, y0: 58, y1: 200 };
    geo.left = { x0: 48, x1: W - 12, y0: 262, y1: 350 };
    geo.table = { x0: 6, x1: W - 6, y0: 382, y1: 486 };
  }
}

function drawTitle() {
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(narrow ? 18 : 22);
  textStyle(NORMAL);
  text('FIR Filter Design Comparison', canvasWidth / 2, 8);
}

function setDesignStroke(id, weight) {
  const c = id === 'A' ? COLOR_A : COLOR_B;
  stroke(c[0], c[1], c[2]);
  strokeWeight(weight);
  drawingContext.setLineDash(id === 'A' ? [] : DASH_B);
}

function clearDash() {
  drawingContext.setLineDash([]);
}

function clipTo(P) {
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0);
  drawingContext.clip();
}

function unclip() {
  drawingContext.restore();
}

function drawPlotFrame(P) {
  stroke(170);
  strokeWeight(1);
  fill('white');
  rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0);
}

function panelTitle(label, P) {
  noStroke();
  fill('black');
  textSize(15);
  textStyle(BOLD);
  textAlign(LEFT, BASELINE);
  text(label, panelTitleX(P), P.y0 - 8);
  const w = fontWidth(label);
  textStyle(NORMAL);
  return w;
}

function panelTitleX(P) {
  return narrow ? 8 : P.x0 - 46;
}

function rotatedLabel(label, x, yCenter) {
  push();
  translate(x, yCenter);
  rotate(-HALF_PI);
  noStroke();
  fill(40);
  textSize(14);
  textAlign(CENTER, CENTER);
  text(label, 0, 0);
  pop();
}

// Frequency axis shared by the magnitude, phase and group-delay plots (w/pi from 0 to 1)
function drawFreqAxis(P, showTitle) {
  const step = (P.x1 - P.x0) < 300 ? 0.2 : 0.1;
  textSize(14);
  for (let f = 0; f <= 1.0001; f += step) {
    const x = map(f, 0, 1, P.x0, P.x1);
    stroke(228);
    strokeWeight(1);
    line(x, P.y0, x, P.y1);
    noStroke();
    fill(60);
    textAlign(CENTER, TOP);
    text(f === 0 ? '0' : f.toFixed(1), x, P.y1 + 4);
  }
  if (showTitle) {
    fill(40);
    textAlign(CENTER, TOP);
    text('Normalized frequency ω/π  (1 = Nyquist)', (P.x0 + P.x1) / 2, P.y1 + 21);
  }
}

function magValue(m, scale) {
  if (scale === SCALE_LIN) return m;
  return 20 * Math.log10(Math.max(m, 1e-12));
}

function zoomHalfRange() {
  let worst = 0;
  for (const id of ['A', 'B']) {
    const d = designs[id];
    if (d && d.meas) worst = Math.max(worst, Math.abs(20 * Math.log10(1 + d.meas.dp)), Math.abs(20 * Math.log10(1 - d.meas.dp)));
  }
  for (const z of ZOOM_STEPS) if (worst * 1.25 <= z) return z;
  return ZOOM_STEPS[ZOOM_STEPS.length - 1];
}

function drawMagnitudePlot() {
  const P = geo.mag;
  const scale = scaleSelect.value();
  let yLo, yHi, ticks, unit;
  if (scale === SCALE_LIN) {
    yLo = 0; yHi = 1.2; ticks = [0, 0.2, 0.4, 0.6, 0.8, 1, 1.2]; unit = '|H|';
  } else if (scale === SCALE_ZOOM) {
    const z = zoomHalfRange();
    yLo = -z; yHi = z; ticks = [-z, -z / 2, 0, z / 2, z]; unit = 'dB';
  } else {
    yLo = DB_FLOOR; yHi = DB_TOP; ticks = [0, -20, -40, -60, -80, -100, -120]; unit = 'dB';
  }
  const yOf = v => map(v, yLo, yHi, P.y1, P.y0);
  const xOf = f => map(f, 0, 1, P.x0, P.x1);

  // Title and legend in the panel header
  // Title and legend share the header line: use the longest forms that fit
  const longTitle = { [SCALE_DB]: 'Magnitude response (dB)', [SCALE_LIN]: 'Magnitude response |H|', [SCALE_ZOOM]: 'Passband detail (dB)' }[scale];
  const shortTitle = longTitle.replace('Magnitude response', 'Magnitude').replace('Passband detail', 'Passband');
  const avail = P.x1 - panelTitleX(P);
  const legends = [
    [['A', 'Design A'], ['B', 'Design B'], ['ideal', 'Ideal'], ['bars', 'Transition Δω']],
    [['A', 'Design A'], ['B', 'Design B'], ['ideal', 'Ideal'], ['bars', 'Δω']],
    [['A', 'A'], ['B', 'B'], ['ideal', 'ideal'], ['bars', 'Δω']],
    [['A', 'A'], ['B', 'B'], ['ideal', 'ideal']]
  ];
  let choice = null;
  for (const title of [longTitle, shortTitle]) {
    textSize(15); textStyle(BOLD);
    const tw = fontWidth(title);
    textStyle(NORMAL);
    for (const items of legends) {
      if (tw + 16 + legendWidth(items) <= avail) { choice = { title, items }; break; }
    }
    if (choice) break;
  }
  if (!choice) choice = { title: shortTitle, items: legends[legends.length - 1] };
  panelTitle(choice.title, P);
  drawLegend(P, choice.items);

  drawPlotFrame(P);
  drawFreqAxis(P, true);
  // y grid and labels
  textSize(14);
  for (const t of ticks) {
    const y = yOf(t);
    stroke(t === 0 && scale !== SCALE_LIN ? 190 : 228);
    strokeWeight(1);
    line(P.x0, y, P.x1, y);
    noStroke();
    fill(60);
    textAlign(RIGHT, CENTER);
    text(formatTick(t), P.x0 - 5, y);
  }
  if (!narrow) rotatedLabel(unit === 'dB' ? 'Magnitude (dB)' : 'Magnitude |H|', P.x0 - 48, (P.y0 + P.y1) / 2);

  const spec = currentSpec();
  clipTo(P);
  drawIdeal(spec, P, yOf, xOf, scale);

  // Measured levels: stop-band peak (dB / linear) or passband ripple limits (zoom)
  for (const id of ['A', 'B']) {
    const d = designs[id];
    if (!d || !d.meas) continue;
    setDesignStroke(id, 1);
    if (scale === SCALE_DB) {
      const y = yOf(-d.meas.attenDb);
      for (const [a, b] of d.meas.stopRanges) line(xOf(a / GRID), y, xOf(b / GRID), y);
    } else if (scale === SCALE_ZOOM) {
      const [a, b] = d.meas.passRange;
      for (const v of [1 + d.meas.dp, 1 - d.meas.dp]) {
        const y = yOf(20 * Math.log10(v));
        line(xOf(a / GRID), y, xOf(b / GRID), y);
      }
    }
  }
  clearDash();

  // The two responses: B first so the solid A line stays visible where they coincide
  for (const id of ['B', 'A']) {
    const d = designs[id];
    if (!d) continue;
    setDesignStroke(id, 2);
    noFill();
    beginShape();
    for (let i = 0; i <= GRID; i++) {
      const v = magValue(d.mag[i], scale);
      vertex(xOf(i / GRID), yOf(constrain(v, yLo - 10, yHi + 10)));
    }
    endShape();
  }
  clearDash();

  // Transition bands (w_p to w_s) as bars along the top edge
  for (const id of ['A', 'B']) {
    const d = designs[id];
    if (!d || !d.meas) continue;
    const c = id === 'A' ? COLOR_A : COLOR_B;
    noStroke();
    fill(c[0], c[1], c[2], 200);
    const y = P.y0 + (id === 'A' ? 3 : 9);
    for (const e of d.meas.edges) {
      const xa = xOf(Math.min(e.wp, e.ws)), xb = xOf(Math.max(e.wp, e.ws));
      rect(xa, y, Math.max(2, xb - xa), 4);
    }
  }
  unclip();
}

function drawIdeal(spec, P, yOf, xOf, scale) {
  const top = scale === SCALE_LIN ? yOf(1) : yOf(0);
  const bottom = scale === SCALE_LIN ? yOf(0) : P.y1 + 4;
  const c = COLOR_IDEAL;
  stroke(c[0], c[1], c[2], 150);
  strokeWeight(3);
  noFill();
  const x1 = xOf(spec.w1), x2 = xOf(spec.w2);
  beginShape();
  if (spec.type === 'Low-pass') {
    vertex(P.x0, top); vertex(x1, top); vertex(x1, bottom); vertex(P.x1, bottom);
  } else if (spec.type === 'High-pass') {
    vertex(P.x0, bottom); vertex(x1, bottom); vertex(x1, top); vertex(P.x1, top);
  } else {
    vertex(P.x0, bottom); vertex(x1, bottom); vertex(x1, top); vertex(x2, top); vertex(x2, bottom); vertex(P.x1, bottom);
  }
  endShape();
}

function legendWidth(items) {
  textSize(14);
  return items.reduce((s, [, lab]) => s + 28 + fontWidth(lab) + 12, 0) - 12;
}

function drawLegend(P, items) {
  textSize(14);
  textAlign(LEFT, CENTER);
  const y = P.y0 - 13;
  const widths = items.map(([, lab]) => 28 + fontWidth(lab) + 12);
  let x = P.x1 - legendWidth(items);
  items.forEach(([kind, lab], i) => {
    if (kind === 'A' || kind === 'B') {
      setDesignStroke(kind, 2);
      line(x, y, x + 22, y);
      clearDash();
    } else if (kind === 'ideal') {
      stroke(COLOR_IDEAL[0], COLOR_IDEAL[1], COLOR_IDEAL[2], 150);
      strokeWeight(3);
      line(x, y, x + 22, y);
    } else {
      noStroke();
      fill(COLOR_A[0], COLOR_A[1], COLOR_A[2], 200);
      rect(x, y - 5, 22, 4);
      fill(COLOR_B[0], COLOR_B[1], COLOR_B[2], 200);
      rect(x, y + 1, 22, 4);
    }
    noStroke();
    fill(40);
    text(lab, x + 28, y);
    x += widths[i];
  });
}

function formatTick(t) {
  if (Math.abs(t) < 1e-12) return '0';
  if (Math.abs(t) >= 1 && Number.isInteger(t)) return String(t);
  const s = Math.abs(t) < 0.01 ? t.toFixed(4) : Math.abs(t) < 0.1 ? t.toFixed(3) : Math.abs(t) < 1 ? t.toFixed(2) : t.toFixed(1);
  return s.replace(/0+$/, '').replace(/\.$/, '').replace('-', '−');
}

function niceStep(range, targetTicks) {
  const raw = range / targetTicks;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}

function drawImpulsePlot() {
  const P = geo.left;
  panelTitle('Impulse response h[n]', P);
  drawPlotFrame(P);
  const dA = designs.A, dB = designs.B;
  const Mmax = Math.max(dA.M, dB.M);
  let hMin = 0, hMax = 0;
  for (const d of [dA, dB]) for (const v of d.h) { hMin = Math.min(hMin, v); hMax = Math.max(hMax, v); }
  const pad = 0.1 * (hMax - hMin || 1);
  const yLo = hMin - pad, yHi = hMax + pad;
  const xOf = k => map(k, -Mmax - 1, Mmax + 1, P.x0, P.x1);
  const yOf = v => map(v, yLo, yHi, P.y1, P.y0);

  // Grid and ticks
  textSize(14);
  const xs = niceStep(2 * Mmax + 2, (P.x1 - P.x0) < 240 ? 4 : 6);
  for (let k = -Math.floor((Mmax + 1) / xs) * xs; k <= Mmax + 1; k += xs) {
    const x = xOf(k);
    stroke(228); strokeWeight(1); line(x, P.y0, x, P.y1);
    noStroke(); fill(60); textAlign(CENTER, TOP);
    text(formatTick(k), x, P.y1 + 4);
  }
  const ys = niceStep(yHi - yLo, 4);
  for (let v = Math.ceil(yLo / ys) * ys; v <= yHi; v += ys) {
    const y = yOf(v);
    stroke(Math.abs(v) < 1e-12 ? 150 : 228); strokeWeight(1); line(P.x0, y, P.x1, y);
    noStroke(); fill(60); textAlign(RIGHT, CENTER);
    text(formatTick(v), P.x0 - 5, y);
  }
  fill(40);
  textAlign(CENTER, TOP);
  text('n − M  (taps from the center)', (P.x0 + P.x1) / 2, P.y1 + 21);

  // Stems: A filled dots, B dashed stems with open circles
  const spacing = (P.x1 - P.x0) / (2 * Mmax + 2);
  const dot = constrain(spacing * 0.9, 2.5, 6);
  const y0 = yOf(0);
  for (const id of ['A', 'B']) {
    const d = designs[id];
    const c = id === 'A' ? COLOR_A : COLOR_B;
    for (let n = 0; n < d.h.length; n++) {
      const x = xOf(n - d.M), y = yOf(d.h[n]);
      setDesignStroke(id, id === 'A' ? 1.5 : 1);
      if (id === 'B') drawingContext.setLineDash([3, 2]);
      line(x, y0, x, y);
      clearDash();
      if (id === 'A') { noStroke(); fill(c[0], c[1], c[2]); }
      else { stroke(c[0], c[1], c[2]); strokeWeight(1.2); noFill(); }
      circle(x, y, id === 'A' ? dot : dot + 2);
    }
  }
}

function drawZerosPlot() {
  const P = geo.left;
  panelTitle(narrow ? 'Zeros of H(z)' : 'Zeros of H(z)  (○ A, □ B)', P);
  const side = Math.min(P.x1 - P.x0, P.y1 - P.y0);
  const cx = (P.x0 + P.x1) / 2, cy = (P.y0 + P.y1) / 2;
  const B = { x0: cx - side / 2, x1: cx + side / 2, y0: cy - side / 2, y1: cy + side / 2 };
  drawPlotFrame(B);
  const R = 1.6;
  const s = side / 2 / R;
  stroke(220); strokeWeight(1);
  line(B.x0, cy, B.x1, cy);
  line(cx, B.y0, cx, B.y1);
  stroke(140); noFill();
  circle(cx, cy, 2 * s);
  noStroke(); fill(80); textSize(14);
  textAlign(LEFT, TOP);
  text('Re', B.x1 - 22, cy + 3);
  text('Im', cx + 4, B.y0 + 2);
  textAlign(CENTER, TOP);
  text('1', cx + s, cy + 3);

  const outside = { A: 0, B: 0 };
  clipTo(B);
  for (const id of ['A', 'B']) {
    const d = designs[id];
    if (!d.zeros) d.zeros = firZeros(d.h);
    const c = id === 'A' ? COLOR_A : COLOR_B;
    stroke(c[0], c[1], c[2]);
    strokeWeight(1.3);
    noFill();
    for (const [re, im] of d.zeros) {
      if (Math.abs(re) > R || Math.abs(im) > R) { outside[id]++; continue; }
      const x = cx + re * s, y = cy - im * s;
      if (id === 'A') circle(x, y, 7);
      else rect(x - 3, y - 3, 6, 6);
    }
  }
  unclip();
  // Pole of order K at the origin
  stroke(40); strokeWeight(1.5);
  line(cx - 4, cy - 4, cx + 4, cy + 4);
  line(cx - 4, cy + 4, cx + 4, cy - 4);

  noStroke(); fill(40); textSize(14);
  textAlign(CENTER, TOP);
  const nzA = designs.A.zeros.length, nzB = designs.B.zeros.length;
  let msg = 'zeros: A ' + nzA + ', B ' + nzB + ';  × = poles at z = 0';
  if (outside.A + outside.B > 0) msg = 'outside view: A ' + outside.A + ', B ' + outside.B + ';  × = poles at 0';
  if (!narrow) text(msg, (P.x0 + P.x1) / 2 - 20, P.y1 + 21);
}

function drawPhasePlot() {
  const P = geo.left;
  panelTitle('Phase φ(ω)/π', P);
  drawPlotFrame(P);
  const Mmax = Math.max(designs.A.M, designs.B.M);
  const yLo = -(Mmax + 1), yHi = 1;
  const yOf = v => map(v, yLo, yHi, P.y1, P.y0);
  const xOf = f => map(f, 0, 1, P.x0, P.x1);
  drawFreqAxis(P, false);
  textSize(14);
  const ys = niceStep(yHi - yLo, 4);
  for (let v = 0; v >= yLo; v -= ys) {
    const y = yOf(v);
    stroke(v === 0 ? 150 : 228); strokeWeight(1); line(P.x0, y, P.x1, y);
    noStroke(); fill(60); textAlign(RIGHT, CENTER);
    text(formatTick(v), P.x0 - 5, y);
  }
  fill(40); textAlign(CENTER, TOP);
  text('ω/π   (φ = −Mω, plus π where A(ω) < 0)', (P.x0 + P.x1) / 2, P.y1 + 21);
  clipTo(P);
  for (const id of ['B', 'A']) {
    const d = designs[id];
    setDesignStroke(id, 1.6);
    noFill();
    beginShape();
    for (let i = 0; i <= GRID; i += 2) {
      const f = i / GRID;
      const ph = -d.M * f + (d.amp[i] < 0 ? 1 : 0);
      vertex(xOf(f), yOf(ph));
    }
    endShape();
  }
  clearDash();
  unclip();
}

function drawGroupDelayPlot() {
  const P = geo.left;
  panelTitle('Group delay τ(ω) (samples)', P);
  drawPlotFrame(P);
  const Mmax = Math.max(designs.A.M, designs.B.M);
  const yHi = Math.max(10, Math.ceil(Mmax * 1.3 / 10) * 10);
  const yOf = v => map(v, 0, yHi, P.y1, P.y0);
  drawFreqAxis(P, false);
  textSize(14);
  const ys = niceStep(yHi, 4);
  for (let v = 0; v <= yHi; v += ys) {
    const y = yOf(v);
    stroke(228); strokeWeight(1); line(P.x0, y, P.x1, y);
    noStroke(); fill(60); textAlign(RIGHT, CENTER);
    text(formatTick(v), P.x0 - 5, y);
  }
  fill(40); textAlign(CENTER, TOP);
  text('ω/π  (symmetric h[n]: τ = (N − 1)/2)', (P.x0 + P.x1) / 2, P.y1 + 21);
  for (const id of ['B', 'A']) {
    const d = designs[id];
    setDesignStroke(id, 2.5);
    const y = yOf(d.M);
    line(P.x0, y, P.x1, y);
    clearDash();
    noStroke();
    const c = id === 'A' ? COLOR_A : COLOR_B;
    fill(c[0], c[1], c[2]);
    textAlign(id === 'A' ? LEFT : RIGHT, BOTTOM);
    const sameLevel = designs.A.M === designs.B.M;
    const label = id + ': ' + d.M + ' samples';
    text(label, id === 'A' ? P.x0 + 6 : P.x1 - 6, y - 4 + (sameLevel && id === 'B' ? 0 : 0));
  }
}

// Description of a design for the read-out table (long or short form)
function describeDesign(d, long) {
  const p = d.p;
  let s;
  if (p.method === 'Window') {
    s = long ? 'Window, ' + p.window : p.window;
    if (p.window === 'Kaiser') s += long ? ' β = ' + p.beta.toFixed(1) : ' β=' + p.beta.toFixed(1);
  } else if (p.method === 'Freq. sampling') {
    s = long ? 'Freq. sampling, T1 = ' + p.T.toFixed(2) : 'FS T1=' + p.T.toFixed(2);
  } else {
    const capped = Math.abs(2 * d.pmHalfWidth - p.dw) > 0.004;
    const dw = (2 * d.pmHalfWidth).toFixed(capped ? 3 : 2) + 'π';
    s = long ? 'Parks-McClellan, Δω = ' + dw : 'PM Δω=' + dw;
  }
  return s + (long ? ', N = ' : ', N=') + p.N;
}

function drawReadoutTable() {
  const T = geo.table;
  fill(255, 253, 235);
  stroke(210, 200, 150);
  strokeWeight(1);
  rect(T.x0, T.y0, T.x1 - T.x0, T.y1 - T.y0, 6);
  noStroke();
  textSize(14);

  const rows = ['A', 'B'].map(id => {
    const d = designs[id], m = d.meas;
    const vals = m ? [m.dw.toFixed(3) + 'π', formatRipple(m.rippleDb), m.attenDb.toFixed(1) + ' dB'] : ['—', '—', '—'];
    vals.push(d.M + ' samples');
    return { id, d, vals };
  });
  // Pick the longest headers and descriptions that fit the table width
  const layouts = [
    [true, ['Transition Δω', 'Passband ripple', 'Stop-band atten.', 'Group delay']],
    [true, ['Δω', 'Ripple', 'Atten.', 'Delay']],
    [false, ['Transition Δω', 'Passband ripple', 'Stop-band atten.', 'Group delay']],
    [false, ['Δω', 'Ripple', 'Atten.', 'Delay']],
    [false, ['Δω', 'Ripple', 'Atten.']]
  ];
  const avail = T.x1 - T.x0 - 16;
  let L = null;
  for (const [long, heads] of layouts) {
    textStyle(BOLD);
    const hw = heads.map(h => fontWidth(h));
    textStyle(NORMAL);
    const colW = heads.map((h, i) => Math.max(hw[i], ...rows.map(r => fontWidth(r.vals[i]))) + 14);
    const descW = 42 + Math.max(...rows.map(r => fontWidth(describeDesign(r.d, long)))) + 14;
    const need = descW + colW.reduce((s, w) => s + w, 0);
    L = { long, heads, colW, descW, extra: Math.max(0, avail - need) };
    if (need <= avail) break;
  }
  const gap = L.extra / (L.heads.length + 1);
  const xs = [T.x0 + 8];
  let x = T.x0 + 8 + L.descW + gap;
  L.colW.forEach(w => { xs.push(x); x += w + gap; });

  const rowH = narrow ? 20 : 22;
  let y = T.y0 + 14;
  fill(70);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text('Design', xs[0], y);
  L.heads.forEach((h, i) => text(h, xs[i + 1], y));
  textStyle(NORMAL);

  for (const r of rows) {
    y += rowH;
    const c = r.id === 'A' ? COLOR_A : COLOR_B;
    setDesignStroke(r.id, 2.5);
    line(xs[0], y, xs[0] + 18, y);
    clearDash();
    noStroke();
    fill(c[0], c[1], c[2]);
    textStyle(BOLD);
    text(r.id, xs[0] + 24, y);
    textStyle(NORMAL);
    fill(30);
    text(describeDesign(r.d, L.long), xs[0] + 42, y);
    L.heads.forEach((h, i) => text(r.vals[i], xs[i + 1], y));
  }

  // Footnotes: Kaiser predictions and PM caps first, otherwise the definitions
  y += rowH + 1;
  const notes = [];
  for (const id of ['A', 'B']) {
    const p = designs[id].p;
    if (p.method === 'Window' && p.window === 'Kaiser') {
      const k = kaiserPrediction(p.beta, p.N);
      notes.push('Kaiser formula for ' + id + ' (β = ' + p.beta.toFixed(1) + ', N = ' + p.N + '): As ≈ ' +
        k.A.toFixed(1) + ' dB, Δω ≈ ' + k.dwPi.toFixed(3) + 'π');
    }
    if (p.method === 'Parks-McClellan' && Math.abs(2 * designs[id].pmHalfWidth - p.dw) > 0.004) {
      notes.push('PM transition band for ' + id + ' limited to Δω = ' + (2 * designs[id].pmHalfWidth).toFixed(3) + 'π (see the notes below the sim)');
    }
  }
  if (narrow) {
    notes.push('δp: largest passband error; δs: largest stop |H|');
    notes.push('Δω: from |H| = 1 − δp to |H| = δs (bars on plot)');
  } else {
    notes.push('Ripple = 20 log10((1 + δp)/(1 − δp)), where δp = largest passband error');
    notes.push('Atten. = −20 log10 δs, where δs = largest stop-band |H|');
    notes.push('Δω runs from |H| = 1 − δp to |H| = δs (bars at the top of the plot)');
  }
  fill(70);
  textSize(narrow ? 13 : 14);
  textAlign(LEFT, CENTER);
  for (const n of notes.slice(0, narrow ? 2 : 3)) {
    text(fitText(n, T.x1 - T.x0 - 16), T.x0 + 8, y);
    y += narrow ? 17 : 19;
  }
}

function formatRipple(db) {
  if (db < 0.0001) return db.toExponential(1) + ' dB';
  if (db >= 1) return db.toFixed(2) + ' dB';
  if (db >= 0.01) return db.toFixed(3) + ' dB';
  return db.toFixed(4) + ' dB';
}

function fitText(s, maxW) {
  if (fontWidth(s) <= maxW) return s;
  while (s.length > 4 && fontWidth(s + '…') > maxW) s = s.slice(0, -1);
  return s + '…';
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function makeSelect(options, value) {
  const s = createSelect();
  for (const o of options) s.option(o);
  s.selected(value);
  return s;
}

function createControls() {
  typeSelect = makeSelect(['Low-pass', 'High-pass', 'Band-pass'], 'Low-pass');
  scaleSelect = makeSelect([SCALE_DB, SCALE_LIN, SCALE_ZOOM], SCALE_DB);
  viewSelect = makeSelect(VIEWS, VIEWS[0]);
  fc1Slider = createSlider(0.05, 0.95, 0.40, 0.01);
  fc2Slider = createSlider(0.05, 0.95, 0.60, 0.01);

  methodSelA = makeSelect(METHODS, 'Window');
  windowSelA = makeSelect(WINDOWS, 'Hamming');
  tapsSliderA = createSlider(11, 127, 51, 2);
  betaSliderA = createSlider(0, 12, 5, 0.1);
  transSliderA = createSlider(0, 1, 0.4, 0.01);
  widthSliderA = createSlider(0.02, 0.4, 0.1, 0.01);

  methodSelB = makeSelect(METHODS, 'Freq. sampling');
  windowSelB = makeSelect(WINDOWS, 'Hamming');
  tapsSliderB = createSlider(11, 127, 51, 2);
  betaSliderB = createSlider(0, 12, 5, 0.1);
  transSliderB = createSlider(0, 1, 0.4, 0.01);
  widthSliderB = createSlider(0.02, 0.4, 0.1, 0.01);

  ctl.A = { method: methodSelA, window: windowSelA, taps: tapsSliderA, beta: betaSliderA, trans: transSliderA, width: widthSliderA };
  ctl.B = { method: methodSelB, window: windowSelB, taps: tapsSliderB, beta: betaSliderB, trans: transSliderB, width: widthSliderB };
}

// Rows: 1 = type / scale / left plot, 2 = cutoffs, 3-5 = design A (left) and design B (right)
function rowY(r) {
  return drawHeight + 22 + (r - 1) * 33;
}

function colRect(i) {
  const cw = (canvasWidth - 3 * margin) / 2;
  return { x: margin + i * (cw + margin), w: cw };
}

function sliderLabelWidth() {
  return compact ? 84 : 150;
}

function layoutControls(force) {
  if (typeof typeSelect === 'undefined') return;
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  compact = canvasWidth < 800;
  narrow = canvasWidth < 640;
  computeGeometry();
  const selFont = compact ? '13px' : '15px';
  const allSelects = [typeSelect, scaleSelect, viewSelect, methodSelA, windowSelA, methodSelB, windowSelB];
  for (const s of allSelects) { s.style('font-size', selFont); s.style('height', '24px'); }

  // Row 1
  const y1 = rowY(1) - 12;
  if (!compact) {
    const gw = (canvasWidth - 2 * margin) / 3;
    [typeSelect, scaleSelect, viewSelect].forEach((sel, i) => {
      const lab = ROW1_LABELS[i];
      sel.position(margin + i * gw + lab.w, y1);
      sel.size(Math.min(180, gw - lab.w - 16), 24);
    });
  } else {
    const w = (canvasWidth - 4 * margin) / 3;
    typeSelect.position(margin, y1); typeSelect.size(w, 24);
    scaleSelect.position(2 * margin + w, y1); scaleSelect.size(w, 24);
    viewSelect.position(3 * margin + 2 * w, y1); viewSelect.size(w, 24);
  }

  // Row 2: cutoffs
  const lw = sliderLabelWidth();
  [fc1Slider, fc2Slider].forEach((s, i) => {
    const c = colRect(i);
    s.position(c.x + lw, rowY(2) - 10);
    s.size(Math.max(50, c.w - lw - 4));
  });

  // Rows 3-5: one column per design
  ['A', 'B'].forEach((id, i) => {
    const c = colRect(i);
    const tag = compact ? 18 : 78;
    const selW = (c.w - tag - 8) / 2;
    ctl[id].method.position(c.x + tag, rowY(3) - 12);
    ctl[id].method.size(selW + 10, 24);
    ctl[id].window.position(c.x + tag + selW + 16, rowY(3) - 12);
    ctl[id].window.size(selW - 10, 24);
    for (const key of ['taps', 'beta', 'trans', 'width']) {
      const row = key === 'taps' ? 4 : 5;
      ctl[id][key].position(c.x + lw, rowY(row) - 10);
      ctl[id][key].size(Math.max(50, c.w - lw - 4));
    }
  });
  stateKey = '';
}

// Enable, disable, show and hide the controls that do not apply to the current choices
function syncControlStates() {
  const isBP = typeSelect.value() === 'Band-pass';
  if (isBP) {
    let a = Number(fc1Slider.value()), b = Number(fc2Slider.value());
    if (a > 0.85) { a = 0.85; fc1Slider.value(a); }
    if (b < a + 0.1 - 1e-9) fc2Slider.value(Math.min(0.95, +(a + 0.1).toFixed(2)));
  }
  const key = [isBP, methodSelA.value(), windowSelA.value(), methodSelB.value(), windowSelB.value(), layoutWidth].join('|');
  if (key === stateKey) return;
  stateKey = key;
  fc2Slider.elt.disabled = !isBP;
  for (const id of ['A', 'B']) {
    const c = ctl[id];
    const m = c.method.value();
    c.window.elt.disabled = m !== 'Window';
    const show = { beta: m === 'Window' && c.window.value() === 'Kaiser', trans: m === 'Freq. sampling', width: m === 'Parks-McClellan' };
    for (const k of ['beta', 'trans', 'width']) show[k] ? c[k].show() : c[k].hide();
  }
}

function drawControlLabels() {
  noStroke();
  textStyle(NORMAL);
  textAlign(LEFT, CENTER);
  const fs = compact ? 14 : 16;
  textSize(fs);
  fill('black');

  if (!compact) {
    const gw = (canvasWidth - 2 * margin) / 3;
    ROW1_LABELS.forEach((lab, i) => text(lab.text, margin + i * gw, rowY(1)));
  }

  const spec = currentSpec();
  const isBP = spec.type === 'Band-pass';
  const c0 = colRect(0), c1 = colRect(1);
  text((compact ? 'ωc1 ' : (isBP ? 'Lower ωc1 ' : 'Cutoff ωc ')) + '= ' + spec.w1.toFixed(2) + 'π', c0.x, rowY(2));
  fill(isBP ? 'black' : 160);
  text(isBP ? (compact ? 'ωc2 ' : 'Upper ωc2 ') + '= ' + spec.w2.toFixed(2) + 'π' : (compact ? 'ωc2 (BP)' : 'ωc2 (band-pass only)'), c1.x, rowY(2));

  ['A', 'B'].forEach((id, i) => {
    const c = colRect(i);
    const col = id === 'A' ? COLOR_A : COLOR_B;
    fill(col[0], col[1], col[2]);
    textStyle(BOLD);
    text(compact ? id : 'Design ' + id, c.x, rowY(3));
    textStyle(NORMAL);
    if (!compact) {
      setDesignStroke(id, 2.5);
      line(c.x, rowY(3) + 12, c.x + 66, rowY(3) + 12);
      clearDash();
      noStroke();
    }
    const p = designParams(id);
    fill('black');
    text((compact ? 'N = ' : 'Taps N = ') + p.N, c.x, rowY(4));
    let lab;
    if (p.method === 'Window' && p.window === 'Kaiser') lab = (compact ? 'β = ' : 'Kaiser β = ') + p.beta.toFixed(1);
    else if (p.method === 'Freq. sampling') lab = (compact ? 'T1 = ' : 'Transition T1 = ') + p.T.toFixed(2);
    else if (p.method === 'Parks-McClellan') lab = (compact ? 'Δω = ' : 'PM Δω = ') + p.dw.toFixed(2) + 'π';
    else { fill(150); lab = compact ? '(no parameter)' : '(' + p.window.toLowerCase() + ' window: no shape parameter)'; }
    text(lab, c.x, rowY(5));
  });
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  layoutControls(false);
}
