// Probability Distribution Explorer MicroSim
// CANVAS_HEIGHT: 640
// Draws N samples from a uniform, Gaussian, exponential, binomial (Bernoulli for n = 1) or Poisson
// distribution, or from the sum of n independent U(0, 1) variables (central-limit-theorem mode), and
// compares them with the theory: a histogram over the PDF/PMF, or the empirical CDF over the CDF.
// A gold band marks mu +/- k sigma and reports the probability it holds, and a table lists the
// theoretical and sample mean, variance and standard deviation. All random numbers come from a seeded
// generator (Mulberry32 and the Box-Muller transform), so the page always opens with the same samples
// (seed 1) and "New samples" moves to the next seed. No audio library is used.

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
const canvasHeight = 640;
let controlHeight = 118;             // 216 on narrow screens, where every control gets its own row
let drawHeight = canvasHeight - controlHeight;
let margin = 15;
let defaultTextSize = 16;
let compact = false;
let layoutWidth = -1;

// ---- model constants ----
const N_VALUES = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
const N_MAX = 10000;                 // every distribution draws one stream of 10000; N uses the first N
const DIST_KEYS = ['uniform', 'gauss', 'expo', 'binom', 'poisson', 'clt'];
const DISTS = {
  uniform: { label: 'Uniform U(a, b)', discrete: false,
    params: [{ name: 'Lower a', min: -5, max: 5, step: 0.1, def: -2, dec: 1 },
             { name: 'Upper b', min: -5, max: 5, step: 0.1, def: 2, dec: 1 }] },
  gauss: { label: 'Gaussian N(μ, σ²)', discrete: false,
    params: [{ name: 'Mean μ', min: -3, max: 3, step: 0.1, def: 0, dec: 1 },
             { name: 'Std dev σ', min: 0.25, max: 2.5, step: 0.05, def: 1, dec: 2 }] },
  expo: { label: 'Exponential Exp(λ)', discrete: false,
    params: [{ name: 'Rate λ', min: 0.25, max: 4, step: 0.05, def: 1, dec: 2 }] },
  binom: { label: 'Binomial B(n, p) / Bernoulli', discrete: true,
    params: [{ name: 'Trials n', min: 1, max: 50, step: 1, def: 10, dec: 0 },
             { name: 'Success p', min: 0.01, max: 0.99, step: 0.01, def: 0.5, dec: 2 }] },
  poisson: { label: 'Poisson Pois(λ)', discrete: true,
    params: [{ name: 'Mean λ', min: 0.5, max: 20, step: 0.5, def: 4, dec: 1 }] },
  clt: { label: 'CLT: sum of n uniforms', discrete: false,
    params: [{ name: 'Terms n', min: 1, max: 30, step: 1, def: 1, dec: 0 }] }
};

// ---- colours ----
const C_SAMPLE = '#1f5fbf';                      // samples: blue
const C_SAMPLE_FILL = 'rgba(31,95,191,0.30)';
const C_THEORY = '#800000';                      // theory: maroon
const C_BAND_BG = 'rgba(218,165,32,0.13)';       // mu +/- k sigma band: gold
const C_BAND_FILL = 'rgba(218,165,32,0.42)';
const C_BAND_LINE = '#c99700';
const C_GOLD_TEXT = '#7a5600';
const C_GAUSS = '#1b7f3b';                       // Gaussian reference: green, dashed
const C_MEAN = '#444444';

// ---- controls ----
let distSelect, cdfCheckbox, gaussCheckbox, newButton;
let p1Slider, p2Slider, nSlider, kSlider;
let ctl = {};                        // label positions, filled by layoutControls()

// ---- state ----
let curDist = 'gauss';
const params = {};                   // remembered slider values for each distribution
for (const d of DIST_KEYS) params[d] = [DISTS[d].params[0].def, DISTS[d].params[1] ? DISTS[d].params[1].def : 0];
let realizationSeed = 1;             // "New samples" adds 1; every seed is reproducible
let st = null;                       // control values read this frame
let dmodel = null;                    // everything computed from st (kept global for inspection)
let drawKey = '';
let sampleCache = { key: '', data: null };
let sortedCache = { key: '', data: null };
const cltErrCache = {};

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);
  createControls();
  layoutControls();
  describe('Probability distribution explorer. A plot shows the theoretical PDF or PMF in maroon with a ' +
    'blue histogram of N random samples, or the theoretical and empirical CDFs, and a gold band marks the mean ' +
    'plus or minus k standard deviations with the probability it contains. A table compares the theoretical and ' +
    'sample mean, variance and standard deviation. Controls choose the distribution (uniform, Gaussian, ' +
    'exponential, binomial, Poisson, or the sum of n uniform variables for the central limit theorem), its ' +
    'parameters, the number of samples N, the band width k, a CDF view, a Gaussian overlay and new samples.');
}

function draw() {
  updateCanvasSize();
  readState();
  const stateKey = JSON.stringify(st) + '|' + canvasWidth + '|' + compact;
  if (stateKey === drawKey) return;       // the picture only changes when a control changes
  drawKey = stateKey;
  dmodel = computeModel(st);

  drawRegions();
  drawTitle();
  const G = layoutGeom();
  drawFormula(G);
  drawPlot(G.P, dmodel);
  if (compact) drawStatsCompact(G.S, dmodel);
  else drawStatsWide(G.S, dmodel);
  drawControlLabels();
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function createControls() {
  distSelect = createSelect();
  for (const d of DIST_KEYS) distSelect.option(DISTS[d].label, d);
  distSelect.selected('gauss');

  cdfCheckbox = createCheckbox(' Show CDF', false);
  gaussCheckbox = createCheckbox(' Gaussian overlay', false);

  newButton = createButton('New samples');
  newButton.mousePressed(() => { realizationSeed++; });

  p1Slider = createSlider(0, 1, 0.5, 0.01);
  p2Slider = createSlider(0, 1, 0.5, 0.01);
  nSlider = createSlider(0, N_VALUES.length - 1, 6, 1);      // index into N_VALUES (default N = 1000)
  kSlider = createSlider(0.25, 4, 1, 0.25);
  applyDist('gauss');
}

function configSlider(s, q, v) {
  s.elt.step = q.step;
  s.elt.min = q.min;
  s.elt.max = q.max;
  s.elt.value = v;
}

// Re-purpose the two parameter sliders for the chosen distribution
function applyDist(d) {
  curDist = d;
  const D = DISTS[d];
  configSlider(p1Slider, D.params[0], params[d][0]);
  if (D.params[1]) {
    configSlider(p2Slider, D.params[1], params[d][1]);
    p2Slider.show();
  } else {
    p2Slider.hide();
  }
  layoutControls();
}

function roundTo(v, dec) { const f = Math.pow(10, dec); return Math.round(v * f) / f; }

function readState() {
  const d = distSelect.value();
  if (DISTS[d] && d !== curDist) applyDist(d);
  const D = DISTS[curDist];
  let v1 = roundTo(Number(p1Slider.value()), D.params[0].dec);
  let v2 = D.params[1] ? roundTo(Number(p2Slider.value()), D.params[1].dec) : 0;
  if (curDist === 'uniform' && v2 - v1 < 0.2 - 1e-9) {
    // keep b >= a + 0.2: the slider that moved pushes the other one
    if (v1 !== params.uniform[0]) { v2 = Math.min(5, roundTo(v1 + 0.2, 1)); v1 = roundTo(v2 - 0.2, 1); }
    else { v1 = Math.max(-5, roundTo(v2 - 0.2, 1)); v2 = roundTo(v1 + 0.2, 1); }
    p1Slider.value(v1);
    p2Slider.value(v2);
  }
  params[curDist] = [v1, v2];
  const ni = constrain(Math.round(Number(nSlider.value())), 0, N_VALUES.length - 1);
  st = {
    dist: curDist, v1: v1, v2: v2, N: N_VALUES[ni], k: roundTo(Number(kSlider.value()), 2),
    cdf: cdfCheckbox.checked(), gauss: gaussCheckbox.checked(), seed: realizationSeed
  };
}

// Wide screens: three rows (menu and toggles; two columns of sliders).
// Narrow screens: one control per row.
function layoutControls() {
  if (typeof kSlider === 'undefined') return;
  layoutWidth = canvasWidth;
  const fs = compact ? 14 : 16;
  distSelect.style('font-size', (compact ? 14 : 15) + 'px');
  newButton.style('font-size', (compact ? 14 : 15) + 'px');
  cdfCheckbox.style('font-size', fs + 'px');
  gaussCheckbox.style('font-size', fs + 'px');
  textSize(fs);
  const D = DISTS[curDist];
  const lwP = Math.ceil(Math.max(tw('Success p = 0.50'), tw('Std dev σ = 2.50'), tw('Lower a = −5.0'))) + 14;
  const lwS = Math.ceil(Math.max(tw('Samples N = 10000'), tw('Band k = 4.00'))) + 14;
  ctl.size = fs;
  if (!compact) {
    const rowY = r => drawHeight + 10 + r * 36;
    distSelect.style('width', 'auto');
    distSelect.position(margin, rowY(0));
    let x = margin + distSelect.elt.offsetWidth + 22;
    cdfCheckbox.position(x, rowY(0) + 2);
    x += cdfCheckbox.elt.offsetWidth + 18;
    gaussCheckbox.position(x, rowY(0) + 2);
    newButton.position(canvasWidth - margin - newButton.elt.offsetWidth, rowY(0));
    const colW = (canvasWidth - 2 * margin) / 2;
    const x0 = margin, x1 = margin + colW + 12;
    p1Slider.position(x0 + lwP, rowY(1) + 3);
    p1Slider.size(colW - lwP - 18);
    p2Slider.position(x0 + lwP, rowY(2) + 3);
    p2Slider.size(colW - lwP - 18);
    nSlider.position(x1 + lwS, rowY(1) + 3);
    nSlider.size(canvasWidth - margin - x1 - lwS);
    kSlider.position(x1 + lwS, rowY(2) + 3);
    kSlider.size(canvasWidth - margin - x1 - lwS);
    ctl.p1 = [x0, rowY(1) + 12];
    ctl.p2 = [x0, rowY(2) + 12];
    ctl.n = [x1, rowY(1) + 12];
    ctl.k = [x1, rowY(2) + 12];
  } else {
    const rowY = r => drawHeight + 8 + r * 34;
    const bw = newButton.elt.offsetWidth;
    distSelect.position(margin, rowY(0));
    distSelect.style('width', Math.max(120, canvasWidth - 2 * margin - bw - 10) + 'px');
    newButton.position(canvasWidth - margin - bw, rowY(0));
    cdfCheckbox.position(margin, rowY(1) + 3);
    gaussCheckbox.position(margin + cdfCheckbox.elt.offsetWidth + 18, rowY(1) + 3);
    const lw = Math.max(lwP, lwS);
    const sw = canvasWidth - 2 * margin - lw;
    let r = 2;
    const place = (s) => { s.position(margin + lw, rowY(r) + 3); s.size(sw); return [margin, rowY(r++) + 12]; };
    ctl.p1 = place(p1Slider);
    ctl.p2 = D.params[1] ? place(p2Slider) : [margin, -100];
    ctl.n = place(nSlider);
    ctl.k = place(kSlider);
  }
}

function drawControlLabels() {
  const D = DISTS[st.dist];
  noStroke();
  fill('black');
  textSize(ctl.size);
  textAlign(LEFT, CENTER);
  text(D.params[0].name + ' = ' + fmt(st.v1, D.params[0].dec), ctl.p1[0], ctl.p1[1]);
  if (D.params[1]) text(D.params[1].name + ' = ' + fmt(st.v2, D.params[1].dec), ctl.p2[0], ctl.p2[1]);
  text('Samples N = ' + st.N, ctl.n[0], ctl.n[1]);
  text('Band k = ' + st.k.toFixed(2), ctl.k[0], ctl.k[1]);
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

// 32-bit seed for (seed, distribution), scrambled with the MurmurHash3 finalizer
function seedFor(seed, i) {
  let h = (Math.imul(seed, 0x9E3779B1) ^ Math.imul(i + 1, 0x85EBCA77)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85EBCA6B);
  h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35);
  h ^= h >>> 16;
  return h >>> 0;
}

// N_MAX samples of the current distribution. Each distribution has its own stream, and the same
// uniforms are reused when only a location or scale parameter changes (x = mu + sigma z, etc.).
function getSamples(s) {
  const stateKey = s.dist + '|' + s.v1 + '|' + s.v2 + '|' + s.seed;
  if (sampleCache.key === stateKey) return sampleCache.data;
  const rng = mulberry32(seedFor(s.seed, DIST_KEYS.indexOf(s.dist)));
  const out = new Float64Array(N_MAX);
  const v1 = s.v1, v2 = s.v2;
  if (s.dist === 'uniform') {
    for (let i = 0; i < N_MAX; i++) out[i] = v1 + (v2 - v1) * rng();
  } else if (s.dist === 'gauss') {
    const g = gaussFactory(rng);
    for (let i = 0; i < N_MAX; i++) out[i] = v1 + v2 * g();
  } else if (s.dist === 'expo') {
    for (let i = 0; i < N_MAX; i++) out[i] = -Math.log(1 - rng()) / v1;        // inverse CDF
  } else if (s.dist === 'binom') {
    const n = Math.round(v1);
    for (let i = 0; i < N_MAX; i++) {                                           // n Bernoulli trials
      let c = 0;
      for (let t = 0; t < n; t++) if (rng() < v2) c++;
      out[i] = c;
    }
  } else if (s.dist === 'poisson') {
    const L = Math.exp(-v1);
    for (let i = 0; i < N_MAX; i++) {                                           // Knuth's method
      let kk = 0, p = 1;
      do { kk++; p *= rng(); } while (p > L);
      out[i] = kk - 1;
    }
  } else {
    const n = Math.round(v1);
    for (let i = 0; i < N_MAX; i++) {                                           // sum of n uniforms
      let sum = 0;
      for (let t = 0; t < n; t++) sum += rng();
      out[i] = sum;
    }
  }
  sampleCache = { key: stateKey, data: out };
  return out;
}

// ---------------------------------------------------------------------------
// Theory: densities, distribution functions, moments
// ---------------------------------------------------------------------------

function erf(x) {
  const ax = Math.abs(x);
  if (ax < 3) {                                   // Maclaurin series
    let sum = x, term = x;
    const x2 = x * x;
    for (let n = 1; n < 200; n++) {
      term *= -x2 / n;
      const add = term / (2 * n + 1);
      sum += add;
      if (Math.abs(add) < 1e-17) break;
    }
    return 2 / Math.sqrt(Math.PI) * sum;
  }
  let t = ax;                                     // continued fraction for erfc
  for (let n = 60; n >= 1; n--) t = ax + (n / 2) / t;
  const erfc = Math.exp(-ax * ax) / (Math.sqrt(Math.PI) * t);
  return x > 0 ? 1 - erfc : erfc - 1;
}

function normPdf(z) { return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI); }
function normCdf(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }

function binomPmf(n, p) {
  const pmf = new Float64Array(n + 1);
  pmf[0] = Math.pow(1 - p, n);
  for (let j = 1; j <= n; j++) pmf[j] = pmf[j - 1] * (n - j + 1) / j * p / (1 - p);
  return pmf;
}

function poissonPmf(lam, jmax) {
  const pmf = new Float64Array(jmax + 1);
  pmf[0] = Math.exp(-lam);
  for (let j = 1; j <= jmax; j++) pmf[j] = pmf[j - 1] * lam / j;
  return pmf;
}

// Cardinal B-spline values M_m(t - j) for j = 0..J by the Cox-de Boor recursion
// M_k(t) = (t M_{k-1}(t) + (k - t) M_{k-1}(t - 1)) / (k - 1). M_n is the density of the sum of
// n independent U(0, 1) variables (Irwin-Hall); every term is >= 0, so the recursion is stable.
function bsplineShifts(m, t, J) {
  const L = J + m;
  const a = new Float64Array(L);
  for (let j = 0; j < L; j++) { const u = t - j; a[j] = (u >= 0 && u < 1) ? 1 : 0; }
  for (let kk = 2; kk <= m; kk++) {
    for (let j = 0; j <= L - kk; j++) {
      const u = t - j;
      a[j] = (u * a[j] + (kk - u) * a[j + 1]) / (kk - 1);
    }
  }
  return a;
}

function irwinHallPdf(n, x) {
  if (x < 0 || x > n) return 0;
  return bsplineShifts(n, x, 0)[0];
}

// F_n(x) = sum_j M_{n+1}(x - j), because M_{n+1}(x) = F_n(x) - F_n(x - 1)
function irwinHallCdf(n, x) {
  if (x <= 0) return 0;
  if (x >= n) return 1;
  const J = Math.floor(x);
  const a = bsplineShifts(n + 1, x, J);
  let s = 0;
  for (let j = 0; j <= J; j++) s += a[j];
  return Math.min(1, s);
}

// Largest distance between the exact CDF of the n-term sum and the Gaussian CDF with the same mean
// and variance (a measure of how close the central limit theorem has come)
function cltGaussError(n) {
  if (cltErrCache[n] !== undefined) return cltErrCache[n];
  const mu = n / 2, sd = Math.sqrt(n / 12);
  let best = 0;
  const steps = 2400;
  for (let i = 0; i <= steps; i++) {
    const x = i * n / steps;
    best = Math.max(best, Math.abs(irwinHallCdf(n, x) - normCdf((x - mu) / sd)));
  }
  cltErrCache[n] = best;
  return best;
}

function computeModel(s) {
  const D = DISTS[s.dist];
  const M = { s: s, dist: s.dist, discrete: D.discrete, jumps: [] };
  const v1 = s.v1, v2 = s.v2;
  if (s.dist === 'uniform') {
    M.mu = (v1 + v2) / 2; M.var = (v2 - v1) * (v2 - v1) / 12; M.xlo = -6; M.xhi = 6; M.jumps = [v1, v2];
    M.pdf = x => (x >= v1 && x <= v2) ? 1 / (v2 - v1) : 0;
    M.cdf = x => Math.min(1, Math.max(0, (x - v1) / (v2 - v1)));
  } else if (s.dist === 'gauss') {
    M.mu = v1; M.var = v2 * v2; M.xlo = -8; M.xhi = 8;
    M.pdf = x => normPdf((x - v1) / v2) / v2;
    M.cdf = x => normCdf((x - v1) / v2);
  } else if (s.dist === 'expo') {
    M.mu = 1 / v1; M.var = 1 / (v1 * v1); M.xlo = -1; M.xhi = 12; M.jumps = [0];
    M.pdf = x => x >= 0 ? v1 * Math.exp(-v1 * x) : 0;
    M.cdf = x => x > 0 ? 1 - Math.exp(-v1 * x) : 0;
  } else if (s.dist === 'binom') {
    const n = Math.round(v1);
    M.n = n; M.mu = n * v2; M.var = n * v2 * (1 - v2); M.xlo = -1; M.xhi = Math.max(n, 4) + 1;
    M.pmf = binomPmf(n, v2);
  } else if (s.dist === 'poisson') {
    M.mu = v1; M.var = v1; M.xlo = -1; M.xhi = 5 * Math.ceil((v1 + 4 * Math.sqrt(v1) + 2) / 5);
    M.pmf = poissonPmf(v1, Math.ceil(v1 + 12 * Math.sqrt(v1) + 25));
  } else {
    const n = Math.round(v1);
    M.n = n; M.mu = n / 2; M.var = n / 12;
    const pad = 0.08 * n + 0.15;
    M.xlo = -pad; M.xhi = n + pad;
    M.jumps = n === 1 ? [0, 1] : [];
    M.pdf = x => irwinHallPdf(n, x);
    M.cdf = x => irwinHallCdf(n, x);
    M.gaussErr = cltGaussError(n);
  }
  M.sd = Math.sqrt(M.var);
  M.lo = M.mu - s.k * M.sd;
  M.hi = M.mu + s.k * M.sd;

  // probability in the closed band mu - k sigma <= X <= mu + k sigma
  if (M.discrete) {
    M.cdfArr = new Float64Array(M.pmf.length);
    let c = 0;
    for (let j = 0; j < M.pmf.length; j++) { c += M.pmf[j]; M.cdfArr[j] = Math.min(1, c); }
    M.cdf = x => x < 0 ? 0 : M.cdfArr[Math.min(Math.floor(x + 1e-9), M.cdfArr.length - 1)];
    M.j0 = Math.max(0, Math.ceil(M.lo - 1e-9));
    M.j1 = Math.min(M.pmf.length - 1, Math.floor(M.hi + 1e-9));
    let p = 0;
    for (let j = M.j0; j <= M.j1; j++) p += M.pmf[j];
    M.pBand = p;
    M.Flo = M.j0 > 0 ? M.cdfArr[M.j0 - 1] : 0;                // P(X < mu - k sigma)
    M.Fhi = M.Flo + p;
  } else {
    M.Flo = M.cdf(M.lo);
    M.Fhi = M.cdf(M.hi);
    M.pBand = M.Fhi - M.Flo;
  }

  // sample statistics of the first N draws
  const all = getSamples(s);
  const N = s.N;
  let sum = 0;
  for (let i = 0; i < N; i++) sum += all[i];
  const mean = sum / N;
  let ss = 0, inBand = 0, outside = 0;
  for (let i = 0; i < N; i++) {
    const x = all[i], d = x - mean;
    ss += d * d;
    if (x >= M.lo - 1e-9 && x <= M.hi + 1e-9) inBand++;
    if (x < M.xlo || x > M.xhi) outside++;
  }
  M.sMean = mean;
  M.sVar = ss / (N - 1);                                       // unbiased sample variance
  M.sSd = Math.sqrt(M.sVar);
  M.sBand = inBand / N;
  M.outside = outside;

  if (M.discrete) {
    let jm = M.pmf.length - 1;
    for (let i = 0; i < N; i++) jm = Math.max(jm, all[i]);
    M.rel = new Float64Array(jm + 1);
    for (let i = 0; i < N; i++) M.rel[all[i]] += 1 / N;
  } else {
    // histogram bins from Scott's rule h = 3.49 sigma N^(-1/3), aligned with the support
    let h = 3.49 * M.sd * Math.pow(N, -1 / 3), e0, m;
    if (s.dist === 'uniform') { m = Math.max(1, Math.round((v2 - v1) / h)); h = (v2 - v1) / m; e0 = v1; }
    else if (s.dist === 'clt') { m = Math.max(1, Math.round(M.n / h)); h = M.n / m; e0 = 0; }
    else if (s.dist === 'expo') { e0 = 0; m = Math.ceil(M.xhi / h); }
    else { e0 = M.mu - h / 2 - h * Math.ceil((M.mu - h / 2 - M.xlo) / h); m = Math.ceil((M.xhi - e0) / h); }
    const counts = new Float64Array(m);
    const bounded = s.dist === 'uniform' || s.dist === 'clt';
    for (let i = 0; i < N; i++) {
      let b = Math.floor((all[i] - e0) / h);
      if (bounded && b === m) b = m - 1;
      if (b >= 0 && b < m) counts[b]++;
    }
    M.hist = { e0: e0, h: h, m: m, dens: counts.map(c => c / (N * h)) };
  }

  if (s.cdf) {
    const skey = sampleCache.key + '|' + N;
    if (sortedCache.key !== skey) sortedCache = { key: skey, data: Float64Array.from(all.subarray(0, N)).sort() };
    M.sorted = sortedCache.data;
  }
  return M;
}

// ---------------------------------------------------------------------------
// Layout and drawing helpers
// ---------------------------------------------------------------------------

function tw(s) { return typeof fontWidth === 'function' ? fontWidth(s) : textWidth(s); }

// number with a true minus sign and no "-0.000"
function fmt(v, d) {
  const r = Number(v.toFixed(d));
  return (r < 0 ? '−' : '') + Math.abs(r).toFixed(d);
}
function fmtK(k) { return String(Number(k.toFixed(2))); }

function niceStep(raw) {
  const e = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * e >= raw - 1e-12) return m * e;
  return 10 * e;
}

function setDash(on) { drawingContext.setLineDash(on ? [7, 5] : []); }

function plotClipOn(R) {
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(R.l, R.t, R.r - R.l, R.b - R.t);
  drawingContext.clip();
}
function plotClipOff() { drawingContext.restore(); }

// Rich text: "_x" or "_{..}" is a subscript, "^x" or "^{..}" a superscript
function parseRich(s) {
  const out = [];
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ((c === '_' || c === '^') && i + 1 < s.length) {
      if (buf) { out.push({ t: buf, m: 0 }); buf = ''; }
      let t;
      if (s[i + 1] === '{') { const e = s.indexOf('}', i + 2); t = s.slice(i + 2, e); i = e; }
      else { t = s[i + 1]; i++; }
      out.push({ t: t, m: c === '_' ? -1 : 1 });
    } else {
      buf += c;
    }
  }
  if (buf) out.push({ t: buf, m: 0 });
  return out;
}

function richWidth(s, sz) {
  let w = 0;
  for (const p of parseRich(s)) { textSize(p.m ? sz * 0.72 : sz); w += tw(p.t); }
  textSize(sz);
  return w;
}

function richText(s, x, y, sz, align) {
  const w = richWidth(s, sz);
  let cx = align === CENTER ? x - w / 2 : (align === RIGHT ? x - w : x);
  textAlign(LEFT, CENTER);
  for (const p of parseRich(s)) {
    textSize(p.m ? sz * 0.72 : sz);
    text(p.t, cx, p.m < 0 ? y + sz * 0.3 : (p.m > 0 ? y - sz * 0.38 : y));
    cx += tw(p.t);
  }
  textSize(sz);
  return w;
}

// draw the first candidate that fits in maxW (the last one otherwise)
function fitText(cands, x, y, maxW, sz, align) {
  for (const c of cands) if (richWidth(c, sz) <= maxW) return richText(c, x, y, sz, align);
  return richText(cands[cands.length - 1], x, y, sz, align);
}

function labelBox(msg, x, y, sz, col, align, xmin, xmax) {
  textSize(sz);
  textStyle(BOLD);
  const w = tw(msg) + 12;
  let bx = align === CENTER ? x - w / 2 : (align === RIGHT ? x - w : x);
  bx = constrain(bx, xmin, Math.max(xmin, xmax - w));
  noStroke();
  fill(255, 255, 255, 225);
  rect(bx, y - sz * 0.78, w, sz * 1.56, 4);
  fill(col);
  textAlign(LEFT, CENTER);
  text(msg, bx + 6, y);
  textStyle(NORMAL);
}

function layoutGeom() {
  if (!compact) {
    const top = 64;
    const panelW = constrain(Math.round(canvasWidth * 0.33), 270, 380);
    const P = { x: margin, y: top, w: canvasWidth - 3 * margin - panelW, h: drawHeight - top - 10 };
    const S = { x: P.x + P.w + margin, y: top, w: panelW, h: P.h };
    return { P: P, S: S };
  }
  const top = 46;
  const P = { x: 8, y: top, w: canvasWidth - 16, h: 244 };
  const S = { x: 8, y: top + P.h + 6, w: canvasWidth - 16, h: drawHeight - (top + P.h + 6) - 6 };
  return { P: P, S: S };
}

function plotRect(P) {
  if (!compact) return { l: P.x + 58, r: P.x + P.w - 14, t: P.y + 32, b: P.y + P.h - 44 };
  return { l: P.x + 42, r: P.x + P.w - 8, t: P.y + 26, b: P.y + P.h - 34 };
}

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
  textStyle(BOLD);
  textSize(compact ? 18 : 22);
  textAlign(CENTER, TOP);
  text('Probability Distribution Explorer', canvasWidth / 2, compact ? 5 : 8);
  textStyle(NORMAL);
}

function formulaCandidates(M) {
  const bern = M.dist === 'binom' && M.n === 1;
  switch (M.dist) {
    case 'uniform': return [
      'X ~ U(a, b):   f(x) = 1/(b − a) for a ≤ x ≤ b,   E[X] = (a + b)/2,   Var(X) = (b − a)²/12',
      'f(x) = 1/(b − a) on [a, b];  E[X] = (a + b)/2,  Var(X) = (b − a)²/12',
      'E[X] = (a + b)/2,  Var(X) = (b − a)²/12'];
    case 'gauss': return [
      'X ~ N(μ, σ²):   f(x) = e^{−(x − μ)²/(2σ²)} / (σ√(2π)),   E[X] = μ,   Var(X) = σ²',
      'f(x) = e^{−(x − μ)²/(2σ²)} / (σ√(2π));  E[X] = μ,  Var(X) = σ²',
      'E[X] = μ,  Var(X) = σ²'];
    case 'expo': return [
      'X ~ Exp(λ):   f(x) = λe^{−λx} for x ≥ 0,   E[X] = 1/λ,   Var(X) = 1/λ²',
      'f(x) = λe^{−λx}, x ≥ 0;  E[X] = 1/λ,  Var(X) = 1/λ²',
      'E[X] = 1/λ,  Var(X) = 1/λ²'];
    case 'binom': return [
      'X ~ B(n, p):   P(X = j) = C(n, j) p^{j} (1 − p)^{n − j},   E[X] = np,   Var(X) = np(1 − p)' +
        (bern ? '   (n = 1: Bernoulli)' : ''),
      'P(X = j) = C(n, j) p^{j} (1 − p)^{n − j};  E[X] = np,  Var(X) = np(1 − p)',
      'E[X] = np,  Var(X) = np(1 − p)' + (bern ? '  (Bernoulli)' : '')];
    case 'poisson': return [
      'X ~ Pois(λ):   P(X = j) = λ^{j} e^{−λ} / j!,   E[X] = λ,   Var(X) = λ',
      'P(X = j) = λ^{j} e^{−λ} / j!;  E[X] = Var(X) = λ',
      'E[X] = Var(X) = λ'];
    default: return [
      'S = U_{1} + U_{2} + … + U_{n},  independent U_{i} ~ U(0, 1):   E[S] = n/2,   Var(S) = n/12',
      'S = U_{1} + … + U_{n},  U_{i} ~ U(0, 1):  E[S] = n/2,  Var(S) = n/12',
      'E[S] = n/2,  Var(S) = n/12'];
  }
}

function drawFormula(G) {
  noStroke();
  fill('#222222');
  fitText(formulaCandidates(dmodel), canvasWidth / 2, compact ? 35 : 47, canvasWidth - 2 * margin, compact ? 13 : 16, CENTER);
}

// ---------------------------------------------------------------------------
// The plot
// ---------------------------------------------------------------------------

function drawPlot(P, M) {
  const R = plotRect(P);
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(P.x, P.y, P.w, P.h, 6);
  fill('#fcfdff');
  stroke('#cccccc');
  rect(R.l, R.t, R.r - R.l, R.b - R.t);

  const xOf = x => R.l + (x - M.xlo) / (M.xhi - M.xlo) * (R.r - R.l);
  const xAt = px => M.xlo + (px - R.l) / (R.r - R.l) * (M.xhi - M.xlo);

  if (!compact) {
    noStroke();
    fill('black');
    textStyle(BOLD);
    textSize(15);
    textAlign(LEFT, CENTER);
    const what = M.s.cdf ? 'CDF and empirical CDF' : (M.discrete ? 'PMF and relative frequencies' : 'PDF and density histogram');
    text(what + ' of N = ' + M.s.N + ' samples', P.x + 10, P.y + 15);
    textStyle(NORMAL);
    if (!M.s.cdf && !M.discrete) {
      fill('#555555');
      textSize(14);
      textAlign(RIGHT, CENTER);
      text('bin width h = ' + fmt(M.hist.h, 3), P.x + P.w - 10, P.y + 15);
    }
  } else {
    compactLegend(P, M);
  }

  if (M.s.cdf) drawCdfView(M, R, xOf, xAt);
  else if (M.discrete) drawPmfView(M, R, xOf, xAt);
  else drawPdfView(M, R, xOf, xAt);
}

function xTitle(M) {
  if (M.dist === 'binom') return compact ? 'j (successes)' : 'j = number of successes in n trials';
  if (M.dist === 'poisson') return compact ? 'j (events)' : 'j = number of events';
  if (M.dist === 'clt') return compact ? 's (sum of n uniforms)' : 's = sum of n independent U(0, 1) values';
  return 'x';
}

function drawAxes(M, R, xOf, yOf, yTicks, yDec, yTitleStr) {
  const ts = compact ? 12 : 14;
  textSize(ts);
  for (const v of yTicks) {
    stroke(v === 0 ? '#999999' : '#e6e6e6');
    strokeWeight(1);
    line(R.l, yOf(v), R.r, yOf(v));
    noStroke();
    fill('#333333');
    textAlign(RIGHT, CENTER);
    text(fmt(v, yDec), R.l - 5, yOf(v));
  }
  const span = M.xhi - M.xlo;
  let xStep = niceStep(span / (compact ? 5 : 9));
  if (M.discrete) xStep = Math.max(1, Math.round(xStep));
  const dec = xStep >= 1 ? 0 : (xStep >= 0.1 ? 1 : 2);
  for (let i = Math.ceil(M.xlo / xStep - 1e-9); i * xStep <= M.xhi + 1e-9; i++) {
    const x = i * xStep, px = xOf(x);
    stroke('#eeeeee');
    line(px, R.t, px, R.b);
    stroke('#999999');
    line(px, R.b, px, R.b + 4);
    noStroke();
    fill('#333333');
    textAlign(CENTER, TOP);
    text(fmt(x, dec), px, R.b + 6);
  }
  noStroke();
  fill('#333333');
  textSize(compact ? 12 : 14);
  textAlign(CENTER, CENTER);
  text(xTitle(M), (R.l + R.r) / 2, R.b + (compact ? 26 : 31));
  push();
  translate(R.l - (compact ? 33 : 46), (R.t + R.b) / 2);
  rotate(-HALF_PI);
  text(yTitleStr, 0, 0);
  pop();
}

// mean line and band edges (inside the clip)
function drawMeanAndEdges(M, R, xOf) {
  stroke(C_BAND_LINE);
  strokeWeight(1.5);
  line(xOf(M.lo), R.t, xOf(M.lo), R.b);
  line(xOf(M.hi), R.t, xOf(M.hi), R.b);
  stroke(C_MEAN);
  strokeWeight(1.5);
  setDash(true);
  line(xOf(M.mu), R.t + 26, xOf(M.mu), R.b);
  setDash(false);
  noStroke();
  fill(C_MEAN);
  textSize(compact ? 12 : 14);
  textAlign(LEFT, CENTER);
  text('μ', xOf(M.mu) + 4, R.t + 36);
}

function bandLabel(M, R, xOf, y) {
  const msg = 'P(μ ± ' + fmtK(M.s.k) + 'σ) = ' + M.pBand.toFixed(3);
  const cx = (constrain(xOf(M.lo), R.l, R.r) + constrain(xOf(M.hi), R.l, R.r)) / 2;
  labelBox(msg, cx, y, compact ? 12 : 15, C_GOLD_TEXT, CENTER, R.l + 2, R.r - 2);
}

// theory density as a polyline with exact vertical edges at the discontinuities
function pdfPoints(M, R, xAt) {
  const xs = [];
  for (let px = R.l; px <= R.r; px += 1) xs.push(xAt(px));
  for (const j of M.jumps) {
    if (j > M.xlo && j < M.xhi) { xs.push(j - 1e-9); xs.push(j + 1e-9); }
  }
  xs.sort((a, b) => a - b);
  return xs.map(x => [x, M.pdf(x)]);
}

function drawPdfView(M, R, xOf, xAt) {
  const pts = pdfPoints(M, R, xAt);
  let peak = 0;
  for (const p of pts) peak = Math.max(peak, p[1]);
  const gPeak = M.s.gauss ? 1 / (M.sd * Math.sqrt(2 * Math.PI)) : 0;
  let hMax = 0;
  for (const d of M.hist.dens) hMax = Math.max(hMax, d);
  const base = Math.max(peak, gPeak);
  const yMax = 1.16 * Math.max(base, Math.min(hMax, 2.5 * base));
  const yOf = v => R.b - v / yMax * (R.b - R.t);
  const ys = niceStep(yMax / (compact ? 3 : 5));
  const yt = [];
  for (let v = 0; v <= yMax + 1e-9; v += ys) yt.push(Number(v.toPrecision(6)));
  drawAxes(M, R, xOf, yOf, yt, ys >= 1 ? 0 : (ys >= 0.1 ? 1 : 2), compact ? 'density' : 'probability density f(x)');

  plotClipOn(R);
  // band background and the probability mass under the PDF
  noStroke();
  fill(C_BAND_BG);
  rect(xOf(M.lo), R.t, xOf(M.hi) - xOf(M.lo), R.b - R.t);
  fill(C_BAND_FILL);
  beginShape();
  vertex(xOf(M.lo), yOf(0));
  vertex(xOf(M.lo), yOf(M.pdf(M.lo)));
  for (const p of pts) if (p[0] > M.lo && p[0] < M.hi) vertex(xOf(p[0]), yOf(p[1]));
  vertex(xOf(M.hi), yOf(M.pdf(M.hi)));
  vertex(xOf(M.hi), yOf(0));
  endShape(CLOSE);

  // histogram
  const H = M.hist;
  const binPx = H.h / (M.xhi - M.xlo) * (R.r - R.l);
  fill(C_SAMPLE_FILL);
  if (binPx >= 4) { stroke(C_SAMPLE); strokeWeight(1); } else noStroke();
  for (let b = 0; b < H.m; b++) {
    const d = H.dens[b];
    if (d <= 0) continue;
    const x0 = xOf(H.e0 + b * H.h), x1 = xOf(H.e0 + (b + 1) * H.h);
    rect(x0, yOf(d), x1 - x0, R.b - yOf(d));
  }

  // theory PDF
  noFill();
  stroke(C_THEORY);
  strokeWeight(2.5);
  beginShape();
  for (const p of pts) vertex(xOf(p[0]), yOf(p[1]));
  endShape();

  if (M.s.gauss) drawGaussDensity(M, R, xOf, xAt, yOf);
  drawMeanAndEdges(M, R, xOf);
  plotClipOff();
  bandLabel(M, R, xOf, R.t + 13);
}

function drawGaussDensity(M, R, xOf, xAt, yOf) {
  noFill();
  stroke(C_GAUSS);
  strokeWeight(2);
  setDash(true);
  beginShape();
  for (let px = R.l; px <= R.r; px += 2) {
    const x = xAt(px);
    vertex(px, yOf(normPdf((x - M.mu) / M.sd) / M.sd));
  }
  endShape();
  setDash(false);
}

function drawPmfView(M, R, xOf, xAt) {
  const jTop = Math.floor(M.xhi);
  let pk = 0;
  for (let j = 0; j <= jTop; j++) {
    pk = Math.max(pk, j < M.pmf.length ? M.pmf[j] : 0, j < M.rel.length ? M.rel[j] : 0);
  }
  if (M.s.gauss) pk = Math.max(pk, 1 / (M.sd * Math.sqrt(2 * Math.PI)));
  const yMax = Math.min(1.16, 1.16 * pk);
  const yOf = v => R.b - v / yMax * (R.b - R.t);
  const ys = niceStep(yMax / (compact ? 3 : 5));
  const yt = [];
  for (let v = 0; v <= yMax + 1e-9; v += ys) yt.push(Number(v.toPrecision(6)));
  drawAxes(M, R, xOf, yOf, yt, ys >= 0.1 ? 1 : (ys >= 0.01 ? 2 : 3), compact ? 'probability' : 'probability P(X = j)');

  plotClipOn(R);
  noStroke();
  fill(C_BAND_BG);
  rect(xOf(M.lo), R.t, xOf(M.hi) - xOf(M.lo), R.b - R.t);
  const unit = xOf(1) - xOf(0);
  // relative frequencies of the samples
  fill(C_SAMPLE_FILL);
  if (unit >= 8) { stroke(C_SAMPLE); strokeWeight(1); } else noStroke();
  for (let j = 0; j < M.rel.length && j <= jTop; j++) {
    if (M.rel[j] <= 0) continue;
    rect(xOf(j - 0.36), yOf(M.rel[j]), 0.72 * unit, R.b - yOf(M.rel[j]));
  }
  // theory PMF: stems, gold dots inside the band
  const dotD = constrain(unit * 0.55, 5, 11);
  for (let j = 0; j <= jTop && j < M.pmf.length; j++) {
    const y = yOf(M.pmf[j]);
    stroke(C_THEORY);
    strokeWeight(2);
    line(xOf(j), yOf(0), xOf(j), y);
    const inBand = j >= M.j0 && j <= M.j1;
    fill(inBand ? '#e3b31c' : C_THEORY);
    strokeWeight(1.5);
    circle(xOf(j), y, dotD);
  }
  if (M.s.gauss) drawGaussDensity(M, R, xOf, xAt, yOf);
  drawMeanAndEdges(M, R, xOf);
  plotClipOff();
  bandLabel(M, R, xOf, R.t + 13);
}

function drawCdfView(M, R, xOf, xAt) {
  const yOf = v => R.b - v / 1.1 * (R.b - R.t);
  drawAxes(M, R, xOf, yOf, [0, 0.25, 0.5, 0.75, 1], 2, compact ? 'F(x)' : 'cumulative probability F(x) = P(X ≤ x)');

  plotClipOn(R);
  noStroke();
  fill(C_BAND_BG);
  rect(xOf(M.lo), R.t, xOf(M.hi) - xOf(M.lo), R.b - R.t);

  // empirical CDF: fraction of the N samples <= x, evaluated at every pixel column
  const srt = M.sorted, N = srt.length;
  noFill();
  stroke(C_SAMPLE);
  strokeWeight(2);
  beginShape();
  let ptr = 0, prev = 0;
  for (let px = R.l; px <= R.r; px += 1) {
    const x = xAt(px);
    while (ptr < N && srt[ptr] <= x) ptr++;
    const cur = ptr / N;
    vertex(px, yOf(prev));
    vertex(px, yOf(cur));
    prev = cur;
  }
  endShape();

  // theory CDF
  stroke(C_THEORY);
  strokeWeight(2.5);
  beginShape();
  prev = M.cdf(xAt(R.l));
  for (let px = R.l; px <= R.r; px += 1) {
    const cur = M.cdf(xAt(px));
    if (M.discrete) vertex(px, yOf(prev));
    vertex(px, yOf(cur));
    prev = cur;
  }
  endShape();

  if (M.s.gauss) {
    stroke(C_GAUSS);
    strokeWeight(2);
    setDash(true);
    beginShape();
    for (let px = R.l; px <= R.r; px += 2) vertex(px, yOf(normCdf((xAt(px) - M.mu) / M.sd)));
    endShape();
    setDash(false);
  }

  drawMeanAndEdges(M, R, xOf);
  // F at the band edges, carried to a bracket at the right
  const xb = R.r - 16;
  stroke(C_BAND_LINE);
  strokeWeight(1.5);
  setDash(true);
  line(xOf(M.lo), yOf(M.Flo), xb, yOf(M.Flo));
  line(xOf(M.hi), yOf(M.Fhi), xb, yOf(M.Fhi));
  setDash(false);
  strokeWeight(2.5);
  line(xb, yOf(M.Flo), xb, yOf(M.Fhi));
  line(xb - 5, yOf(M.Flo), xb + 5, yOf(M.Flo));
  line(xb - 5, yOf(M.Fhi), xb + 5, yOf(M.Fhi));
  fill('#e3b31c');
  stroke(C_THEORY);
  strokeWeight(1.5);
  circle(xOf(M.lo), yOf(M.Flo), 9);
  circle(xOf(M.hi), yOf(M.Fhi), 9);
  plotClipOff();

  const msg = 'ΔF = ' + M.pBand.toFixed(3);
  labelBox(msg, xb - 8, (yOf(M.Flo) + yOf(M.Fhi)) / 2, compact ? 12 : 15, C_GOLD_TEXT, RIGHT, R.l + 2, R.r - 2);
  bandLabel(M, R, xOf, R.t + 13);
}

// ---------------------------------------------------------------------------
// Legend and statistics
// ---------------------------------------------------------------------------

function legendItems(M, short) {
  const it = [];
  if (M.s.cdf) {
    it.push({ kind: 'line', col: C_SAMPLE, label: short ? 'sample' : 'empirical CDF of the samples' });
    it.push({ kind: 'line', col: C_THEORY, label: short ? 'theory' : 'theoretical CDF F(x)' });
  } else if (M.discrete) {
    it.push({ kind: 'box', col: C_SAMPLE, label: short ? 'sample' : 'relative frequency of the samples' });
    it.push({ kind: 'stem', col: C_THEORY, label: short ? 'PMF' : 'PMF P(X = j)' });
  } else {
    it.push({ kind: 'box', col: C_SAMPLE, label: short ? 'sample' : 'histogram of the samples' });
    it.push({ kind: 'line', col: C_THEORY, label: short ? 'PDF' : 'PDF f(x)' });
  }
  it.push({ kind: 'band', label: short ? 'μ ± kσ' : 'band μ ± kσ and its probability' });
  if (!short) it.push({ kind: 'dash', col: C_MEAN, label: 'mean μ' });
  if (M.s.gauss) it.push({ kind: 'dash', col: C_GAUSS, label: short ? 'Gauss' : (M.s.cdf ? 'Gaussian CDF Φ((x − μ)/σ)' : 'Gaussian N(μ, σ²), same μ, σ') });
  return it;
}

function legendSwatch(it, x, y) {
  if (it.kind === 'box') {
    fill(C_SAMPLE_FILL); stroke(C_SAMPLE); strokeWeight(1);
    rect(x, y - 6, 20, 12);
  } else if (it.kind === 'band') {
    fill(C_BAND_FILL); stroke(C_BAND_LINE); strokeWeight(1);
    rect(x, y - 6, 20, 12);
  } else if (it.kind === 'stem') {
    stroke(it.col); strokeWeight(2);
    line(x + 10, y + 6, x + 10, y - 3);
    fill(it.col); strokeWeight(1);
    circle(x + 10, y - 3, 7);
  } else {
    stroke(it.col); strokeWeight(it.kind === 'dash' ? 2 : 2.5);
    setDash(it.kind === 'dash');
    line(x, y, x + 20, y);
    setDash(false);
  }
}

function compactLegend(P, M) {
  const items = legendItems(M, true);
  textSize(12);
  const widths = items.map(it => 26 + tw(it.label));
  const total = widths.reduce((a, b) => a + b, 0) + 10 * (items.length - 1);
  let x = P.x + Math.max(6, (P.w - total) / 2);
  const y = P.y + 12;
  items.forEach((it, i) => {
    legendSwatch(it, x, y);
    noStroke();
    fill('#222222');
    textSize(12);
    textAlign(LEFT, CENTER);
    text(it.label, x + 25, y);
    x += widths[i] + 10;
  });
}

function statRows(M) {
  return [
    ['Mean μ', M.mu, M.sMean],
    ['Variance σ²', M.var, M.sVar],
    ['Std dev σ', M.sd, M.sSd],
    ['P(μ ± ' + fmtK(M.s.k) + 'σ)', M.pBand, M.sBand]
  ];
}

function drawStatsWide(S, M) {
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(S.x, S.y, S.w, S.h, 6);
  noStroke();
  fill('black');
  textStyle(BOLD);
  textSize(16);
  textAlign(LEFT, CENTER);
  text('Theory versus sample', S.x + 12, S.y + 16);
  const cL = S.x + 12, cT = S.x + S.w * 0.68, cS = S.x + S.w - 12;
  let y = S.y + 44;
  textSize(15);
  textAlign(RIGHT, CENTER);
  fill(C_THEORY);
  text('Theory', cT, y);
  fill(C_SAMPLE);
  text('Sample', cS, y);
  textStyle(NORMAL);
  stroke('#d6d6d6');
  line(cL, y + 13, cS, y + 13);
  y += 34;
  for (const r of statRows(M)) {
    noStroke();
    fill('#222222');
    textSize(15);
    textAlign(LEFT, CENTER);
    text(r[0], cL, y);
    textAlign(RIGHT, CENTER);
    fill(C_THEORY);
    text(fmt(r[1], 3), cT, y);
    fill(C_SAMPLE);
    text(fmt(r[2], 3), cS, y);
    y += 26;
  }
  stroke('#d6d6d6');
  line(cL, y - 12, cS, y - 12);

  // notes
  const notes = [];
  notes.push(['Sample = first N = ' + M.s.N + ' draws, seed ' + M.s.seed, '#333333']);
  notes.push(['Sample variance divides by N − 1', '#333333']);
  notes.push(['Std error of the mean σ/√N = ' + (M.sd / Math.sqrt(M.s.N)).toFixed(4), '#333333']);
  notes.push(['Band μ ± kσ = [' + fmt(M.lo, 3) + ', ' + fmt(M.hi, 3) + ']', C_GOLD_TEXT]);
  if (M.s.cdf && !M.discrete) {
    notes.push(['F(μ − kσ) = ' + M.Flo.toFixed(3) + ',  F(μ + kσ) = ' + M.Fhi.toFixed(3), C_GOLD_TEXT]);
  } else if (M.s.cdf) {
    notes.push(['P(X < μ − kσ) = ' + M.Flo.toFixed(3), C_GOLD_TEXT]);
    notes.push(['P(X ≤ μ + kσ) = ' + M.Fhi.toFixed(3), C_GOLD_TEXT]);
  }
  if (M.discrete) {
    notes.push([M.j1 >= M.j0 ? 'Values in the band: j = ' + M.j0 + (M.j1 > M.j0 ? ' … ' + M.j1 : '') : 'No integer lies in the band', C_GOLD_TEXT]);
  }
  if (M.dist === 'clt') notes.push(['Largest gap between F and Φ = ' + M.gaussErr.toFixed(4), C_GAUSS]);
  if (M.outside > 0) notes.push([M.outside + ' sample' + (M.outside > 1 ? 's' : '') + ' (' + (100 * M.outside / M.s.N).toFixed(1) + '%) beyond the plot', '#b00000']);
  // legend at the bottom of the panel; the notes share the space above it
  const items = legendItems(M, false);
  const lh = 20;
  const legendTop = S.y + S.h - 12 - lh * (items.length - 1);
  const nl = constrain((legendTop - 16 - (y + 4)) / Math.max(1, notes.length), 17, 21);
  textSize(14);
  y += 4;
  for (const n of notes) {
    noStroke();
    fill(n[1]);
    textAlign(LEFT, CENTER);
    text(n[0], cL, y);
    y += nl;
  }
  stroke('#d6d6d6');
  strokeWeight(1);
  let ly = Math.max(legendTop, y + 14);
  line(cL, ly - 15, cS, ly - 15);
  for (const it of items) {
    legendSwatch(it, cL, ly);
    noStroke();
    fill('#222222');
    textSize(14);
    textAlign(LEFT, CENTER);
    text(it.label, cL + 28, ly);
    ly += lh;
  }
}

function drawStatsCompact(S, M) {
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(S.x, S.y, S.w, S.h, 6);
  const cL = S.x + 8, cT = S.x + S.w * 0.70, cS = S.x + S.w - 8;
  let y = S.y + 12;
  noStroke();
  textStyle(BOLD);
  textSize(13);
  textAlign(LEFT, CENTER);
  fill('black');
  text('N = ' + M.s.N + ', seed ' + M.s.seed, cL, y);
  textAlign(RIGHT, CENTER);
  fill(C_THEORY);
  text('Theory', cT, y);
  fill(C_SAMPLE);
  text('Sample', cS, y);
  textStyle(NORMAL);
  y += 19;
  for (const r of statRows(M)) {
    fill('#222222');
    textSize(13);
    textAlign(LEFT, CENTER);
    text(r[0], cL, y);
    textAlign(RIGHT, CENTER);
    fill(C_THEORY);
    text(fmt(r[1], 3), cT, y);
    fill(C_SAMPLE);
    text(fmt(r[2], 3), cS, y);
    y += 18;
  }
  textSize(12);
  textAlign(LEFT, CENTER);
  let note;
  if (M.dist === 'clt') { fill(C_GAUSS); note = 'Largest gap between F and Φ = ' + M.gaussErr.toFixed(4); }
  else if (M.outside > 0) { fill('#b00000'); note = M.outside + ' samples beyond the plot'; }
  else { fill(C_GOLD_TEXT); note = 'Band [' + fmt(M.lo, 2) + ', ' + fmt(M.hi, 2) + ']; variance uses N − 1'; }
  text(note, cL, y);
}

// ---------------------------------------------------------------------------
// Responsive sizing
// ---------------------------------------------------------------------------

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  drawKey = '';
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  compact = canvasWidth < 700;
  controlHeight = compact ? 216 : 118;
  drawHeight = canvasHeight - controlHeight;
  if (typeof kSlider !== 'undefined' && layoutWidth !== canvasWidth) {
    layoutControls();
    if (width !== canvasWidth) resizeCanvas(canvasWidth, canvasHeight);
    drawKey = '';
  }
}
