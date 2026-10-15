// System Interconnections: Series, Parallel, Feedback MicroSim
// CANVAS_HEIGHT: 660
// Two blocks H1 and H2 (a gain K, a first-order low-pass with time constant tau, or a delay of
// D samples) are connected in series, in parallel, in a negative-feedback loop or in a
// feedforward structure. Everything runs in discrete time at fs = 100 Hz. The sketch builds the
// overall transfer function H(z) = B(z)/A(z) from the block polynomials, runs the difference
// equation to get the step and impulse responses, finds the poles (roots of A) and zeros
// (roots of B), and reports whether the combined system is stable.

// Canvas dimensions (drawHeight and controlHeight change with the width; the total does not)
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
const CANVAS_H = 660;
let canvasHeight = CANVAS_H;
let controlHeight = 112;
let drawHeight = CANVAS_H - controlHeight;
let margin = 20;
let sliderLeftMargin = 350;
let defaultTextSize = 16;
let compact = false;                 // narrow screens: one control per row, stacked plots
let layoutWidth = -1;

// Discrete-time model
const FS = 100;                      // sampling rate (Hz)
const TS = 1 / FS;                   // sampling period (s)
const N_SAMPLES = 200;               // responses are computed for n = 0..199 (0 to 1.99 s)
const Y_CAP = 4;                     // display clamp for growing (unstable) responses

// Block types and their parameter sliders
const BLOCK_TYPES = {
  gain:  { label: 'Gain K',            name: 'Gain',     min: -2,   max: 2,   step: 0.05 },
  lp:    { label: 'Low-pass (τ)',      name: 'Low-pass', min: 0.01, max: 0.5, step: 0.01 },
  delay: { label: 'Delay (D samples)', name: 'Delay',    min: 1,    max: 50,  step: 1 }
};
const TOPOLOGIES = [
  ['series', 'Series (cascade)'],
  ['parallel', 'Parallel'],
  ['feedback', 'Negative feedback'],
  ['feedforward', 'Feedforward']
];
const DEFAULT_STATE = {
  topology: 'feedback',
  blocks: [
    { type: 'gain',  values: { gain: 0.8, lp: 0.10, delay: 5 } },
    { type: 'delay', values: { gain: 1.0, lp: 0.10, delay: 10 } }
  ]
};

// Colors
const COL_SIG = [25, 90, 200];       // responses (time domain): blue
const COL_INPUT = [140, 140, 140];   // input signal: gray
const COL_REF = [184, 134, 11];      // final value H(1): gold
const COL_LOOP = [190, 135, 0];      // feedback loop wires: gold
const COL_ERR = [205, 35, 35];       // clipped values, unstable poles: red
const COL_WIRE = [60, 64, 72];
const COL_ZERO = [30, 130, 60];
const COL_BLOCK = [[110, 70, 175], [20, 125, 95]];        // H1 purple, H2 teal (borders/labels)
const FILL_BLOCK = [[242, 236, 252], [230, 246, 239]];
const STATUS = {
  stable:   { label: 'STABLE',            short: 'STABLE',    col: [30, 130, 60] },
  marginal: { label: 'MARGINALLY STABLE', short: 'MARGINAL',  col: [200, 115, 0] },
  unstable: { label: 'UNSTABLE',          short: 'UNSTABLE',  col: [205, 35, 35] },
  illposed: { label: 'ILL-POSED',         short: 'ILL-POSED', col: [205, 35, 35] }
};

// Controls
let topologySelect, typeSelect1, typeSelect2, paramSlider1, paramSlider2, resetButton;

// State
let state = cloneState(DEFAULT_STATE);
let shownType = [null, null];        // the block type each slider is configured for
let sys = null;                      // the analysed combined system
let sysKey = '';

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  topologySelect = createSelect();
  for (const [v, lbl] of TOPOLOGIES) topologySelect.option(lbl, v);
  topologySelect.selected(state.topology);
  topologySelect.style('font-size', '15px');

  typeSelect1 = createSelect();
  typeSelect2 = createSelect();
  for (const s of [typeSelect1, typeSelect2]) {
    for (const k of Object.keys(BLOCK_TYPES)) s.option(BLOCK_TYPES[k].label, k);
    s.style('font-size', '15px');
  }
  typeSelect1.selected(state.blocks[0].type);
  typeSelect2.selected(state.blocks[1].type);

  const t1 = BLOCK_TYPES[state.blocks[0].type], t2 = BLOCK_TYPES[state.blocks[1].type];
  paramSlider1 = createSlider(t1.min, t1.max, state.blocks[0].values[state.blocks[0].type], t1.step);
  paramSlider2 = createSlider(t2.min, t2.max, state.blocks[1].values[state.blocks[1].type], t2.step);
  shownType = [state.blocks[0].type, state.blocks[1].type];

  resetButton = createButton('Reset');
  resetButton.style('font-size', '15px');
  resetButton.elt.addEventListener('click', resetAll);   // 'click' also fires for keyboard activation

  layoutControls(true);
  describe('Block diagram of two systems H1 and H2 connected in series, in parallel, in a negative-feedback loop or in a feedforward structure. Below it are the overall transfer function H(z), its difference equation at fs = 100 Hz, a pole-zero plot with a stability badge, and the step and impulse responses of the combined system. Selects choose the topology and the type of each block (gain, first-order low-pass, delay); sliders set each block parameter.');
}

function cloneState(s) {
  return {
    topology: s.topology,
    blocks: s.blocks.map(b => ({ type: b.type, values: Object.assign({}, b.values) }))
  };
}

function resetAll() {
  state = cloneState(DEFAULT_STATE);
  topologySelect.selected(state.topology);
  typeSelect1.selected(state.blocks[0].type);
  typeSelect2.selected(state.blocks[1].type);
  shownType = [null, null];
  readControls();
}

function draw() {
  updateCanvasSize();
  readControls();
  const key = JSON.stringify(state);
  if (key !== sysKey || !sys) {
    sys = analyse();
    sysKey = key;
  }

  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  const G = geometry();
  drawTitle(G);
  drawDiagram(G.diagram);
  if (G.zplane) drawZPlane(G.zplane);
  drawEquations(G);
  if (!G.zplane) drawStatusLine(G);
  drawPlot(G.plot1, 'step');
  drawPlot(G.plot2, 'impulse');
  drawControlLabels();
}

// ---------------------------------------------------------------- controls

function readControls() {
  state.topology = topologySelect.value();
  const sels = [typeSelect1, typeSelect2], sliders = [paramSlider1, paramSlider2];
  for (let i = 0; i < 2; i++) {
    let t = sels[i].value();
    if (!BLOCK_TYPES[t]) t = 'gain';
    state.blocks[i].type = t;
    if (shownType[i] !== t) configureSlider(sliders[i], t, state.blocks[i].values[t]);
    shownType[i] = t;
    state.blocks[i].values[t] = Number(sliders[i].value());
  }
}

// Reuse one slider for whichever parameter the block type needs
function configureSlider(s, type, value) {
  const T = BLOCK_TYPES[type], el = s.elt;
  el.step = T.step;
  el.min = T.min;
  el.max = T.max;
  el.value = value;
}

function layoutControls(force) {
  if (typeof paramSlider1 === 'undefined') return;
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  if (compact) {
    topologySelect.position(88, rowY(0) - 12);
    resetButton.position(canvasWidth - 12 - 64, rowY(0) - 13);
    typeSelect1.position(44, rowY(1) - 12);
    typeSelect2.position(44, rowY(3) - 12);
    sliderLeftMargin = 150;
    paramSlider1.position(sliderLeftMargin, rowY(2) - 10);
    paramSlider2.position(sliderLeftMargin, rowY(4) - 10);
    const w = Math.max(80, canvasWidth - sliderLeftMargin - 12);
    paramSlider1.size(w);
    paramSlider2.size(w);
  } else {
    topologySelect.position(98, rowY(0) - 12);
    resetButton.position(canvasWidth - margin - 64, rowY(0) - 13);
    typeSelect1.position(44, rowY(1) - 12);
    typeSelect2.position(44, rowY(2) - 12);
    const selW = Math.max(typeSelect1.elt.offsetWidth || 150, typeSelect2.elt.offsetWidth || 150, 150);
    sliderLeftMargin = 44 + selW + 14 + 138;
    paramSlider1.position(sliderLeftMargin, rowY(1) - 10);
    paramSlider2.position(sliderLeftMargin, rowY(2) - 10);
    const w = Math.max(80, canvasWidth - sliderLeftMargin - margin);
    paramSlider1.size(w);
    paramSlider2.size(w);
  }
}

// vertical centre of control row i
function rowY(i) {
  return compact ? drawHeight + 18 + 31 * i : drawHeight + 20 + 35 * i;
}

function paramLabel(i, inBox) {
  const blk = state.blocks[i], v = blk.values[blk.type], s = inBox ? '' : '_' + (i + 1);
  if (blk.type === 'gain') return 'K' + s + ' = ' + fmt(v, 2);
  if (blk.type === 'lp') return 'τ' + s + ' = ' + fmt(v, 2) + ' s';
  const D = Math.round(v);
  return 'D' + s + ' = ' + D + ' (' + (D * TS).toFixed(2) + ' s)';
}

function drawControlLabels() {
  noStroke();
  fill('black');
  textStyle(NORMAL);
  const sz = compact ? 15 : defaultTextSize;
  richText('Topology:', 10, rowY(0), sz, LEFT);
  textStyle(BOLD);
  for (let i = 0; i < 2; i++) {
    const c = COL_BLOCK[i];
    fill(c[0], c[1], c[2]);
    richText('H_' + (i + 1), 12, rowY(compact ? 1 + 2 * i : 1 + i), sz + 1, LEFT);
  }
  textStyle(NORMAL);
  fill('black');
  if (compact) {
    richText(paramLabel(0, false), 12, rowY(2), sz, LEFT);
    richText(paramLabel(1, false), 12, rowY(4), sz, LEFT);
  } else {
    const x = sliderLeftMargin - 138;
    richText(paramLabel(0, false), x, rowY(1), sz, LEFT);
    richText(paramLabel(1, false), x, rowY(2), sz, LEFT);
  }
}

// ---------------------------------------------------------------- the model

// A block as B(z)/A(z) with coefficients in powers of z^-1
function blockTF(blk) {
  const v = blk.values[blk.type];
  if (blk.type === 'gain') return { b: [v], a: [1] };
  if (blk.type === 'lp') {
    const a = Math.exp(-TS / v);       // y[n] = a y[n-1] + (1 - a) x[n]
    return { b: [1 - a], a: [1, -a], pole: a };
  }
  const D = Math.round(v);
  const b = new Array(D + 1).fill(0);
  b[D] = 1;
  return { b, a: [1] };
}

function pmul(p, q) {
  const r = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) {
    if (p[i] === 0) continue;
    for (let j = 0; j < q.length; j++) r[i + j] += p[i] * q[j];
  }
  return r;
}
function padd(p, q) {
  const r = new Array(Math.max(p.length, q.length)).fill(0);
  p.forEach((v, i) => { r[i] += v; });
  q.forEach((v, i) => { r[i] += v; });
  return r;
}
function ptrim(p) {
  let n = p.length;
  while (n > 1 && Math.abs(p[n - 1]) < 1e-14) n--;
  return p.slice(0, n);
}
function pequal(p, q) {
  return p.length === q.length && p.every((v, i) => Math.abs(v - q[i]) < 1e-12);
}
function pIsZero(p) { return p.every(v => Math.abs(v) < 1e-14); }

// Overall B/A for the topology. Exact pole-zero cancellations (a zero gain, or two identical
// low-pass blocks in parallel) are removed so the pole list describes the real system.
function combine(topo, h1, h2) {
  const z1 = pIsZero(h1.b), z2 = pIsZero(h2.b);
  let r;
  if (topo === 'series') {
    r = (z1 || z2) ? { b: [0], a: [1] } : { b: pmul(h1.b, h2.b), a: pmul(h1.a, h2.a) };
  } else if (topo === 'parallel') {
    if (z1) r = h2;
    else if (z2) r = h1;
    else if (pequal(h1.a, h2.a)) r = { b: padd(h1.b, h2.b), a: h1.a };
    else r = { b: padd(pmul(h1.b, h2.a), pmul(h2.b, h1.a)), a: pmul(h1.a, h2.a) };
  } else if (topo === 'feedback') {            // H = H1 / (1 + H1 H2)
    if (z1) r = { b: [0], a: [1] };
    else if (z2) r = h1;
    else r = { b: pmul(h1.b, h2.a), a: padd(pmul(h1.a, h2.a), pmul(h1.b, h2.b)) };
  } else {                                     // feedforward: H = 1 + H1 H2
    if (z1 || z2) r = { b: [1], a: [1] };
    else {
      const a = pmul(h1.a, h2.a);
      r = { b: padd(a, pmul(h1.b, h2.b)), a };
    }
  }
  return { B: ptrim(r.b.slice()), A: ptrim(r.a.slice()) };
}

function analyse() {
  const h1 = blockTF(state.blocks[0]), h2 = blockTF(state.blocks[1]);
  const { B, A } = combine(state.topology, h1, h2);
  const out = { h1, h2, illPosed: false, B, A };
  if (Math.abs(A[0]) < 1e-9) {               // delay-free loop with 1 + H1 H2 = 0
    out.illPosed = true;
    out.status = 'illposed';
    out.maxPole = Infinity;
    return out;
  }
  const clean = v => (Math.abs(v) < 1e-14 ? 0 : v);
  const b = ptrim(B.map(v => clean(v / A[0])));
  const a = ptrim(A.map(v => clean(v / A[0])));
  out.b = b;
  out.a = a;
  out.h = runFilter(b, a, true);
  out.s = runFilter(b, a, false);
  const sb = b.reduce((s, v) => s + v, 0), sa = a.reduce((s, v) => s + v, 0);
  out.dc = Math.abs(sa) < 1e-12 ? Infinity : sb / sa;

  // Poles and zeros. With L = max(M, N), H(z) = z^(L-M)(b0 z^M + ...) / z^(L-N)(a0 z^N + ...)
  const bz = pIsZero(b);
  const N = a.length - 1, M = bz ? 0 : b.length - 1, L = Math.max(M, N);
  let first = 0;
  while (first < b.length - 1 && Math.abs(b[first]) < 1e-14) first++;
  out.poles = rootsOf(a);
  out.poleOrigin = L - N;
  out.zeros = bz ? [] : rootsOf(b.slice(first));
  out.zeroOrigin = bz ? 0 : L - M;
  out.zeroSystem = bz;
  out.maxPole = out.poles.reduce((m, p) => Math.max(m, Math.hypot(p[0], p[1])), 0);
  out.maxZero = out.zeros.reduce((m, p) => Math.max(m, Math.hypot(p[0], p[1])), 0);
  if (out.maxPole < 1 - 1e-6) out.status = 'stable';
  else if (out.maxPole <= 1 + 1e-6) out.status = 'marginal';
  else out.status = 'unstable';
  return out;
}

// y[n] = sum b_k x[n-k] - sum_{k>=1} a_k y[n-k]   (a_0 = 1)
function runFilter(b, a, impulse) {
  const y = new Array(N_SAMPLES).fill(0);
  for (let n = 0; n < N_SAMPLES; n++) {
    let acc = 0;
    for (let k = 0; k < b.length && k <= n; k++) {
      if (b[k] !== 0) acc += b[k] * (impulse ? (n === k ? 1 : 0) : 1);
    }
    for (let k = 1; k < a.length && k <= n; k++) {
      if (a[k] !== 0) acc -= a[k] * y[n - k];
    }
    if (!isFinite(acc) || Math.abs(acc) > 1e100) acc = Math.sign(acc || 1) * 1e100;
    y[n] = acc;
  }
  return y;
}

// Roots of c[0] z^n + c[1] z^(n-1) + ... + c[n] (c[0] != 0, c[n] != 0) as [re, im] pairs.
// Degrees 1 and 2 are solved exactly; higher degrees use the Durand-Kerner iteration.
function rootsOf(c) {
  const n = c.length - 1;
  if (n < 1) return [];
  const a = c.map(v => v / c[0]);
  if (n === 1) return [[-a[1], 0]];
  if (n === 2) {
    const p = a[1], q = a[2], disc = p * p - 4 * q;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      return [[(-p + s) / 2, 0], [(-p - s) / 2, 0]];
    }
    const im = Math.sqrt(-disc) / 2;
    return [[-p / 2, im], [-p / 2, -im]];
  }
  let R = Math.pow(Math.abs(a[n]), 1 / n);
  if (!(R > 1e-6) || !isFinite(R)) R = 1;
  // start on a slightly uneven ring: perfectly symmetric starts can stall for z^n + c
  const zr = [], zi = [];
  for (let k = 0; k < n; k++) {
    const th = 2 * Math.PI * k / n + 0.4, rr = R * (1 + 0.1 * ((k % 3) - 1));
    zr.push(rr * Math.cos(th));
    zi.push(rr * Math.sin(th));
  }
  for (let it = 0; it < 1500; it++) {
    let maxStep = 0;
    for (let i = 0; i < n; i++) {
      let pr = 1, pi = 0;                                  // Horner: p(z_i)
      for (let k = 1; k <= n; k++) {
        const t = pr * zr[i] - pi * zi[i] + a[k];
        pi = pr * zi[i] + pi * zr[i];
        pr = t;
      }
      let dr = 1, di = 0;                                  // prod (z_i - z_j)
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const ur = zr[i] - zr[j], ui = zi[i] - zi[j];
        const t = dr * ur - di * ui;
        di = dr * ui + di * ur;
        dr = t;
      }
      const den = dr * dr + di * di;
      if (den === 0) { zr[i] += 1e-7; continue; }
      const qr = (pr * dr + pi * di) / den, qi = (pi * dr - pr * di) / den;
      if (!isFinite(qr) || !isFinite(qi)) {              // restart this estimate
        const th = 2.4 * (i + it + 1);
        zr[i] = R * Math.cos(th);
        zi[i] = R * Math.sin(th);
        maxStep = Infinity;
        continue;
      }
      zr[i] -= qr;
      zi[i] -= qi;
      maxStep = Math.max(maxStep, Math.hypot(qr, qi));
    }
    if (maxStep < 1e-14) break;
  }
  return zr.map((r, i) => [r, Math.abs(zi[i]) < 1e-9 ? 0 : zi[i]]);
}

// ---------------------------------------------------------------- text for the formulas

function topoName() {
  return TOPOLOGIES.find(t => t[0] === state.topology)[1];
}
function topoFormula() {
  switch (state.topology) {
    case 'series': return 'H = H_1·H_2';
    case 'parallel': return 'H = H_1 + H_2';
    case 'feedback': return 'H = H_1 / (1 + H_1H_2)';
  }
  return 'H = 1 + H_1H_2';
}

// 3 significant digits, no exponent for the values used here
function fmtC(v) {
  return Number(Math.abs(v).toPrecision(3)).toString();
}

// polynomial in z^-1 as text, e.g. "1 + 0.8z^{−10}"
function polyStr(c, withSign) {
  const terms = [];
  c.forEach((v, k) => {
    if (Math.abs(v) < 1e-12) return;
    const mag = fmtC(v);
    const zp = k === 0 ? '' : 'z^{−' + k + '}';
    const coef = (k > 0 && mag === '1') ? '' : mag;
    terms.push({ neg: v < 0, s: coef + zp });
  });
  if (!terms.length) return '0';
  return terms.map((t, i) => (i === 0 ? (t.neg ? '−' : '') : (t.neg ? ' − ' : ' + ')) + t.s).join('');
}
function nTerms(c) { return c.filter(v => Math.abs(v) >= 1e-12).length; }

function tfStr(b, a) {
  const num = polyStr(b);
  if (a.length === 1 && Math.abs(a[0] - 1) < 1e-12) return num;
  return (nTerms(b) > 1 ? '(' + num + ')' : num) + ' / (' + polyStr(a) + ')';
}

function blockTFStr(i) {
  const h = i === 0 ? sys.h1 : sys.h2;
  return 'H_' + (i + 1) + '(z) = ' + tfStr(h.b, h.a);
}

function diffEqStr(b, a) {
  const idx = k => (k === 0 ? 'n' : 'n−' + k);
  const terms = [];
  b.forEach((v, k) => { if (Math.abs(v) >= 1e-12) terms.push({ c: v, s: 'x[' + idx(k) + ']' }); });
  a.forEach((v, k) => { if (k > 0 && Math.abs(v) >= 1e-12) terms.push({ c: -v, s: 'y[' + idx(k) + ']' }); });
  if (!terms.length) return 'y[n] = 0';
  return 'y[n] = ' + terms.map((t, i) => {
    const mag = fmtC(t.c), coef = mag === '1' ? '' : mag;
    return (i === 0 ? (t.c < 0 ? '−' : '') : (t.c < 0 ? ' − ' : ' + ')) + coef + t.s;
  }).join('');
}

function cplxStr(p) {
  if (p[1] === 0) return fmt(p[0], 3);
  return fmt(p[0], 3) + ' ± ' + Math.abs(p[1]).toFixed(3) + 'j';
}

// Short description of the poles (origin poles counted separately)
function poleSummary() {
  if (sys.illPosed) return '1 + H_1H_2 = 0 with no delay in the loop';
  const P = sys.poles, o = sys.poleOrigin;
  const originTxt = o ? (o === 1 ? '1 pole at z = 0' : o + ' poles at z = 0') : '';
  if (!P.length) return o ? 'FIR: ' + originTxt : 'no poles: a memoryless gain';
  let txt;
  if (P.length === 1 || (P.length === 2 && P[0][1] !== 0)) {
    txt = 'pole' + (P.length > 1 ? 's' : '') + ' z = ' + cplxStr(P[0]);
    if (P.length === 1 && P[0][0] > 0 && P[0][0] < 1) {
      txt += ' (τ = ' + fmt(-TS / Math.log(P[0][0]), 3) + ' s)';
    }
  } else if (P.length === 2 && Math.abs(P[0][0] - P[1][0]) < 1e-6) {
    txt = 'double pole z = ' + fmt(P[0][0], 3);
  } else if (P.length === 2) {
    txt = 'poles z = ' + fmt(P[0][0], 3) + ', ' + fmt(P[1][0], 3);
  } else {
    const mags = P.map(p => Math.hypot(p[0], p[1]));
    const lo = Math.min(...mags), hi = Math.max(...mags);
    txt = (hi - lo < 1e-3) ? P.length + ' poles on |z| = ' + fmt(hi, 3)
                           : P.length + ' poles, |z| from ' + fmt(lo, 3) + ' to ' + fmt(hi, 3);
  }
  return o ? txt + '; ' + originTxt : txt;
}

// ---------------------------------------------------------------- layout

function geometry() {
  const G = {};
  if (compact) {
    G.titleY = 14;
    G.diagram = { x: 8, y: 28, w: canvasWidth - 16, h: 150 };
    G.eqY = [192, 210, 228];
    G.statusY = 249;
    G.plot1 = { x: 50, y: 282, w: canvasWidth - 62, h: 68 };
    G.plot2 = { x: 50, y: 394, w: canvasWidth - 62, h: 68 };
  } else {
    const zw = Math.round(constrain(canvasWidth * 0.27, 220, 300));
    G.titleY = 20;
    G.diagram = { x: margin, y: 40, w: canvasWidth - 2 * margin - zw - 12, h: 212 };
    G.zplane = { x: canvasWidth - margin - zw, y: 40, w: zw, h: 212 };
    G.eqY = [272, 294, 316];
    const gap = 34, left = margin + 44;
    const w = (canvasWidth - margin - left - gap - 44) / 2;
    G.plot1 = { x: left, y: 352, w, h: 160 };
    G.plot2 = { x: left + w + gap + 44, y: 352, w, h: 160 };
  }
  return G;
}

// ---------------------------------------------------------------- drawing

function drawTitle(G) {
  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(['System Interconnections: Series, Parallel, Feedback', 'System Interconnections'],
          canvasWidth / 2, G.titleY, canvasWidth - 20, compact ? 17 : 22, CENTER);
  textStyle(NORMAL);
}

function panel(P, title) {
  fill(255);
  stroke(205);
  strokeWeight(1);
  rect(P.x, P.y, P.w, P.h, 8);
  noStroke();
  fill(70);
  textStyle(BOLD);
  richText(title, P.x + 10, P.y + (compact ? 11 : 14), compact ? 12 : 14, LEFT);
  textStyle(NORMAL);
}

function drawDiagram(P) {
  panel(P, 'Block diagram: ' + topoName().toLowerCase());
  const topo = state.topology;
  const fs = compact ? 12 : 14;
  const bodyTop = P.y + (compact ? 20 : 28), bodyBot = P.y + P.h - 8, body = bodyBot - bodyTop;
  const bh = compact ? 40 : 52;
  const r = compact ? 11 : 14;
  const loopCol = sys.status === 'unstable' || sys.illPosed ? COL_ERR : COL_LOOP;

  textSize(fs);
  const xInEnd = P.x + 12 + advW('x[n]') + 6;
  const xOutStart = P.x + P.w - 12 - advW('y[n]') - 6;
  const inLabel = (y) => { noStroke(); fill(30); richText('x[n]', P.x + 10, y, fs, LEFT); };
  const outLabel = (y) => { noStroke(); fill(30); richText('y[n]', P.x + P.w - 10, y, fs, RIGHT); };

  if (topo === 'series') {
    const y = bodyTop + body * 0.52;
    const bw = constrain(P.w * 0.22, 64, 160);
    const c1 = P.x + P.w * 0.36, c2 = P.x + P.w * 0.66;
    inLabel(y);
    arrowLine(xInEnd, y, c1 - bw / 2, y, COL_WIRE);
    drawBlock(0, c1, y, bw, bh);
    arrowLine(c1 + bw / 2, y, c2 - bw / 2, y, COL_WIRE);
    wireLabel('w[n]', (c1 + c2) / 2, y - 10, fs);
    drawBlock(1, c2, y, bw, bh);
    arrowLine(c2 + bw / 2, y, xOutStart, y, COL_WIRE);
    outLabel(y);
  } else if (topo === 'parallel') {
    const mid = bodyTop + body * 0.52, d = body * 0.28;
    const bw = constrain(P.w * 0.24, 64, 170);
    const xs = P.x + P.w * 0.2, c = P.x + P.w * 0.48, xSum = P.x + P.w * 0.78;
    inLabel(mid);
    plainLine(xInEnd, mid, xs, mid, COL_WIRE);
    plainLine(xs, mid - d, xs, mid + d, COL_WIRE);
    branchDot(xs, mid);
    arrowLine(xs, mid - d, c - bw / 2, mid - d, COL_WIRE);
    arrowLine(xs, mid + d, c - bw / 2, mid + d, COL_WIRE);
    drawBlock(0, c, mid - d, bw, bh);
    drawBlock(1, c, mid + d, bw, bh);
    plainLine(c + bw / 2, mid - d, xSum, mid - d, COL_WIRE);
    arrowLine(xSum, mid - d, xSum, mid - r, COL_WIRE);
    plainLine(c + bw / 2, mid + d, xSum, mid + d, COL_WIRE);
    arrowLine(xSum, mid + d, xSum, mid + r, COL_WIRE);
    sumJunction(xSum, mid, r);
    signLabel('+', xSum - 11, mid - r - 9, fs);
    signLabel('+', xSum - 11, mid + r + 9, fs);
    arrowLine(xSum + r, mid, xOutStart, mid, COL_WIRE);
    outLabel(mid);
  } else if (topo === 'feedback') {
    const yA = bodyTop + body * 0.30, yB = bodyTop + body * 0.78;
    const bw = constrain(P.w * 0.24, 64, 170);
    const xSum = P.x + P.w * 0.21, c = P.x + P.w * 0.5, xb = P.x + P.w * 0.8;
    inLabel(yA);
    arrowLine(xInEnd, yA, xSum - r, yA, COL_WIRE);
    signLabel('+', xSum - r - 9, yA - 11, fs);
    sumJunction(xSum, yA, r);
    arrowLine(xSum + r, yA, c - bw / 2, yA, loopCol);
    wireLabel('e[n]', (xSum + r + c - bw / 2) / 2, yA - 10, fs);
    drawBlock(0, c, yA, bw, bh);
    plainLine(c + bw / 2, yA, xb, yA, loopCol);
    arrowLine(xb, yA, xOutStart, yA, COL_WIRE);
    outLabel(yA);
    plainLine(xb, yA, xb, yB, loopCol);
    arrowLine(xb, yB, c + bw / 2, yB, loopCol);
    drawBlock(1, c, yB, bw, bh);
    plainLine(c - bw / 2, yB, xSum, yB, loopCol);
    arrowLine(xSum, yB, xSum, yA + r, loopCol);
    signLabel('−', xSum - 12, yA + r + 10, fs + 2);
    branchDot(xb, yA);
    noStroke();
    fill(loopCol[0], loopCol[1], loopCol[2]);
    if (!compact) richText('loop gain H_1H_2', xb + 8, (yA + yB) / 2, 13, LEFT);
  } else {
    const yA = bodyTop + body * 0.26, yB = bodyTop + body * 0.76;
    const bw = constrain(P.w * 0.2, 62, 150);
    const xs = P.x + P.w * 0.15, c1 = P.x + P.w * 0.38, c2 = P.x + P.w * 0.62, xSum = P.x + P.w * 0.84;
    inLabel(yA);
    plainLine(xInEnd, yA, xs, yA, COL_WIRE);
    arrowLine(xs, yA, xSum - r, yA, COL_WIRE);
    wireLabel(compact ? 'direct path ×1' : 'direct path (gain 1)', (xs + xSum) / 2, yA - 10, fs);
    plainLine(xs, yA, xs, yB, COL_WIRE);
    branchDot(xs, yA);
    arrowLine(xs, yB, c1 - bw / 2, yB, COL_WIRE);
    drawBlock(0, c1, yB, bw, bh);
    arrowLine(c1 + bw / 2, yB, c2 - bw / 2, yB, COL_WIRE);
    drawBlock(1, c2, yB, bw, bh);
    plainLine(c2 + bw / 2, yB, xSum, yB, COL_WIRE);
    arrowLine(xSum, yB, xSum, yA + r, COL_WIRE);
    sumJunction(xSum, yA, r);
    signLabel('+', xSum - r - 9, yA - 11, fs);
    signLabel('+', xSum - 12, yA + r + 10, fs);
    arrowLine(xSum + r, yA, xOutStart, yA, COL_WIRE);
    outLabel(yA);
  }
}

function drawBlock(i, cx, cy, bw, bh) {
  const c = COL_BLOCK[i], f = FILL_BLOCK[i];
  fill(f[0], f[1], f[2]);
  stroke(c[0], c[1], c[2]);
  strokeWeight(2);
  rectMode(CENTER);
  rect(cx, cy, bw, bh, 6);
  rectMode(CORNER);
  noStroke();
  const blk = state.blocks[i], T = BLOCK_TYPES[blk.type];
  const sz = compact ? 12 : 14;
  fill(c[0], c[1], c[2]);
  textStyle(BOLD);
  fitText(['H_' + (i + 1) + ': ' + T.name, 'H_' + (i + 1)], cx, cy - bh * 0.2, bw - 8, sz, CENTER);
  textStyle(NORMAL);
  fill(30);
  const p = paramLabel(i, true);
  fitText([p, p.split(' (')[0]], cx, cy + bh * 0.22, bw - 8, sz, CENTER);
}

function plainLine(x1, y1, x2, y2, col) {
  stroke(col[0], col[1], col[2]);
  strokeWeight(2);
  line(x1, y1, x2, y2);
}

function arrowLine(x1, y1, x2, y2, col) {
  plainLine(x1, y1, x2, y2, col);
  const ang = Math.atan2(y2 - y1, x2 - x1), s = compact ? 7 : 9;
  noStroke();
  fill(col[0], col[1], col[2]);
  triangle(x2, y2,
           x2 - s * Math.cos(ang - 0.4), y2 - s * Math.sin(ang - 0.4),
           x2 - s * Math.cos(ang + 0.4), y2 - s * Math.sin(ang + 0.4));
}

function branchDot(x, y) {
  noStroke();
  fill(COL_WIRE[0], COL_WIRE[1], COL_WIRE[2]);
  circle(x, y, compact ? 7 : 8);
}

function sumJunction(x, y, r) {
  fill(255);
  stroke(COL_WIRE[0], COL_WIRE[1], COL_WIRE[2]);
  strokeWeight(2);
  circle(x, y, 2 * r);
  noStroke();
  fill(30);
  textAlign(CENTER, CENTER);
  textSize(r * 1.25);
  text('Σ', x, y + 1);
}

function signLabel(s, x, y, sz) {
  noStroke();
  fill(20);
  textStyle(BOLD);
  textSize(sz);
  textAlign(CENTER, CENTER);
  text(s, x, y);
  textStyle(NORMAL);
}

function wireLabel(s, x, y, sz) {
  noStroke();
  fill(80);
  richText(s, x, y, sz - 1, CENTER);
}

function drawZPlane(P) {
  panel(P, '');
  const bw = drawBadge(P.x + P.w - 8, P.y + 14, RIGHT, false);
  noStroke();
  fill(70);
  textStyle(BOLD);
  fitText(['Poles × and zeros ○', 'Poles × zeros ○', 'z-plane'], P.x + 10, P.y + 14, P.w - bw - 26, 14, LEFT);
  textStyle(NORMAL);
  const S = Math.min(P.w - 24, P.h - 30 - 46);
  const cx = P.x + P.w / 2, cy = P.y + 28 + S / 2;
  const rAll = Math.max(1, sys.illPosed ? 1 : Math.max(sys.maxPole, sys.maxZero));
  const Rmax = constrain(rAll * 1.12, 1.25, 2.6);
  const sc = (S / 2) / Rmax;

  // axes and unit circle
  const xL = P.x + 10, xR = P.x + P.w - 10;
  stroke(215);
  strokeWeight(1);
  line(xL, cy, xR, cy);
  line(cx, cy - S / 2, cx, cy + S / 2);
  noFill();
  stroke(120);
  strokeWeight(1.5);
  circle(cx, cy, 2 * sc);
  noStroke();
  fill(110);
  textSize(11);
  textAlign(LEFT, TOP);
  text('1', cx + sc + 3, cy + 2);
  textAlign(RIGHT, BOTTOM);
  text('Re', xR, cy - 2);
  textAlign(RIGHT, TOP);
  text('Im', cx - 8, cy - S / 2);

  if (sys.illPosed) {
    noStroke();
    fill(255, 255, 255, 235);
    rectMode(CENTER);
    rect(cx, cy - 18, 128, 20, 4);
    rectMode(CORNER);
    fill(COL_ERR);
    textSize(13);
    textAlign(CENTER, CENTER);
    text('no solution for y[n]', cx, cy - 18);
  } else {
    const toXY = p => {
      const m = Math.hypot(p[0], p[1]);
      const k = m > Rmax * 0.97 ? Rmax * 0.97 / m : 1;
      return [cx + p[0] * k * sc, cy - p[1] * k * sc];
    };
    for (const z of sys.zeros) {
      const [x, y] = toXY(z);
      noFill();
      stroke(COL_ZERO[0], COL_ZERO[1], COL_ZERO[2]);
      strokeWeight(1.8);
      circle(x, y, 9);
    }
    if (sys.zeroOrigin > 0) originMark(cx, cy, sys.zeroOrigin, false);
    for (const p of sys.poles) {
      const [x, y] = toXY(p);
      const outside = Math.hypot(p[0], p[1]) > 1 + 1e-6;
      poleMark(x, y, outside ? COL_ERR : [25, 25, 35]);
    }
    if (sys.poleOrigin > 0) originMark(cx, cy, sys.poleOrigin, true);
  }

  // read-outs under the plot
  const st = STATUS[sys.status];
  noStroke();
  fill(st.col[0], st.col[1], st.col[2]);
  textStyle(BOLD);
  const yl = cy + S / 2 + 14;
  const mp = maxPoleText();
  fitText([mp + (sys.status === 'stable' ? '  (inside |z| = 1)' : sys.status === 'marginal' ? '  (on |z| = 1)' : sys.status === 'unstable' ? '  (outside |z| = 1)' : ''), mp],
          cx, yl, P.w - 12, 13, CENTER);
  textStyle(NORMAL);
  fill(50);
  const ps = poleSummary();
  fitText([ps, ps.split('; ')[0]], cx, yl + 18, P.w - 12, 13, CENTER);
}

function poleMark(x, y, col) {
  stroke(col[0], col[1], col[2]);
  strokeWeight(2);
  line(x - 4.5, y - 4.5, x + 4.5, y + 4.5);
  line(x - 4.5, y + 4.5, x + 4.5, y - 4.5);
}

function originMark(cx, cy, k, isPole) {
  if (isPole) poleMark(cx, cy, [25, 25, 35]);
  else {
    noFill();
    stroke(COL_ZERO[0], COL_ZERO[1], COL_ZERO[2]);
    strokeWeight(1.8);
    circle(cx, cy, 9);
  }
  if (k > 1) {
    noStroke();
    if (isPole) fill(30, 30, 40);
    else fill(COL_ZERO[0], COL_ZERO[1], COL_ZERO[2]);
    textSize(11);
    textAlign(isPole ? LEFT : RIGHT, isPole ? BOTTOM : TOP);
    text('(' + k + ')', isPole ? cx + 6 : cx - 6, isPole ? cy - 4 : cy + 5);
  }
}

function maxPoleText() {
  if (sys.illPosed) return 'max |p| = ∞';
  if (sys.poles.length) return 'max |p| = ' + fmt(sys.maxPole, 3);
  return sys.poleOrigin ? 'max |p| = 0' : 'no poles';
}

// rounded status badge; returns its width
function drawBadge(x, y, align, useShort) {
  const st = STATUS[sys.status];
  const label = useShort ? st.short : st.label;
  textSize(13);
  textStyle(BOLD);
  const w = advW(label) + 16, h = 20;
  const x0 = align === RIGHT ? x - w : x;
  noStroke();
  fill(st.col[0], st.col[1], st.col[2]);
  rect(x0, y - h / 2, w, h, 10);
  fill(255);
  textAlign(CENTER, CENTER);
  text(label, x0 + w / 2, y + 1);
  textStyle(NORMAL);
  return w;
}

// compact screens: badge and pole read-out on one line instead of the z-plane panel
function drawStatusLine(G) {
  const st = STATUS[sys.status];
  const w = drawBadge(10, G.statusY, LEFT, canvasWidth < 420);
  noStroke();
  fill(st.col[0], st.col[1], st.col[2]);
  textStyle(BOLD);
  const mp = maxPoleText();
  const x = 10 + w + 8;
  const mw = richText(mp, x, G.statusY, 13, LEFT);
  textStyle(NORMAL);
  fill(50);
  const ps = poleSummary();
  fitText([ps, ps.split('; ')[0], ps.split(' (')[0], ''], x + mw + 8, G.statusY, canvasWidth - x - mw - 16, 13, LEFT);
}

function drawEquations(G) {
  const sz = compact ? 13 : 16;
  const x = compact ? 10 : margin, maxW = canvasWidth - 2 * x;
  noStroke();
  fill(40);
  const f = topoFormula(), b1 = blockTFStr(0), b2 = blockTFStr(1);
  fitText([topoName() + ':  ' + f + ',   ' + b1 + ',   ' + b2,
           f + ',   ' + b1 + ',   ' + b2,
           f + ',  ' + b1,
           f], x, G.eqY[0], maxW, sz, LEFT);
  if (sys.illPosed) {
    fill(COL_ERR);
    fitText(['Delay-free loop with 1 + H_1H_2 = 0: y[n] cannot be computed. Change a gain or put a delay in the loop.',
             'Delay-free loop with 1 + H_1H_2 = 0: y[n] cannot be computed.',
             '1 + H_1H_2 = 0: no solution for y[n]'], x, G.eqY[1], maxW, sz, LEFT);
    return;
  }
  fill(COL_SIG[0], COL_SIG[1], COL_SIG[2]);
  textStyle(BOLD);
  const tf = 'H(z) = ' + tfStr(sys.b, sys.a);
  fitText([tf, tf.replace(/ /g, '')], x, G.eqY[1], maxW, sz, LEFT);
  textStyle(NORMAL);
  fill(40);
  const de = diffEqStr(sys.b, sys.a);
  const dc = isFinite(sys.dc) ? 'H(1) = ' + fmt(sys.dc, 3) : 'H(1) = ∞';
  fitText(['Difference equation at fs = 100 Hz:  ' + de + '      DC gain ' + dc,
           de + '      DC gain ' + dc,
           de + '   ' + dc,
           de, de.replace(/ /g, '')], x, G.eqY[2], maxW, sz, LEFT);
}

// ---------------------------------------------------------------- response plots

const NICE_TOPS = [0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4];
function niceUp(v) {
  for (const c of NICE_TOPS) if (c >= v - 1e-12) return c;
  return Y_CAP;
}
function niceStep(span) {
  const steps = [0.0025, 0.005, 0.01, 0.02, 0.025, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2];
  for (const s of steps) if (span / s <= 4.01) return s;
  return 2;
}
function decimalsOf(step) {
  let d = 0;
  while (d < 4 && Math.abs(Math.round(step * Math.pow(10, d)) - step * Math.pow(10, d)) > 1e-9) d++;
  return d;
}

function drawPlot(R, kind) {
  const isStep = kind === 'step';
  noStroke();
  fill(30);
  textStyle(BOLD);
  richText(isStep ? 'Step response s[n]' : 'Impulse response h[n]', R.x - (compact ? 40 : 42), R.y - (compact ? 10 : 13), compact ? 13 : 15, LEFT);
  textStyle(NORMAL);
  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(R.x, R.y, R.w, R.h);

  if (sys.illPosed) {
    noStroke();
    fill(COL_ERR);
    textSize(14);
    textAlign(CENTER, CENTER);
    text('no output: the loop equation has no solution', R.x + R.w / 2, R.y + R.h / 2);
    drawTimeAxis(R);
    return;
  }

  const data = isStep ? sys.s : sys.h;
  const showDC = isStep && sys.status === 'stable' && isFinite(sys.dc);
  let hi = isStep ? 1 : 0, lo = 0;
  for (const v of data) { if (v > hi) hi = v; if (v < lo) lo = v; }
  if (showDC) { hi = Math.max(hi, sys.dc); lo = Math.min(lo, sys.dc); }
  const top = niceUp(Math.min(hi, Y_CAP) * 1.06);
  const bot = lo < -1e-9 ? -niceUp(Math.min(-lo, Y_CAP) * 1.06) : 0;
  const span = top - bot;
  const vlo = bot - (bot === 0 ? span * 0.08 : span * 0.02), vhi = top + span * 0.04;
  const clipped = data.some(v => v > vhi || v < vlo);

  // legend items (decided first, so the data area can leave room for the legend)
  const items = [];
  if (isStep) {
    items.push({ kind: 'line', col: COL_SIG, label: 's[n] output', short: 's[n]' });
    items.push({ kind: 'dash', col: COL_INPUT, label: 'u[n] input', short: 'u[n]' });
    if (showDC) items.push({ kind: 'dash', col: COL_REF, label: 'final value H(1) = ' + fmt(sys.dc, 3), short: 'H(1) = ' + fmt(sys.dc, 3) });
  }
  if (clipped) items.push({ kind: 'line', col: COL_ERR, label: 'beyond ±' + fmt(Y_CAP, 0) + ' (clipped)', short: 'clipped' });
  const topPad = items.length ? (compact ? 16 : 21) : 3;
  const yOf = v => R.y + R.h - (v - vlo) / (vhi - vlo) * (R.h - topPad);
  const xOf = n => R.x + n / N_SAMPLES * R.w;
  const yTopEdge = R.y + topPad, yBotEdge = R.y + R.h - 2;

  // grid and value ticks
  const step = niceStep(span), d = decimalsOf(step);
  textSize(compact ? 11 : 13);
  for (let t = Math.ceil(bot / step - 1e-9) * step; t <= top + 1e-9; t += step) {
    const y = yOf(t);
    stroke(Math.abs(t) < 1e-12 ? 120 : 232);
    strokeWeight(1);
    line(R.x, y, R.x + R.w, y);
    noStroke();
    fill(80);
    textAlign(RIGHT, CENTER);
    text(fmt(t, d), R.x - 5, y);
  }
  drawTimeAxis(R);

  push();
  drawingContext.beginPath();
  drawingContext.rect(R.x, R.y, R.w, R.h);
  drawingContext.clip();

  if (isStep) {
    // unit-step input
    stroke(COL_INPUT[0], COL_INPUT[1], COL_INPUT[2]);
    strokeWeight(1.5);
    drawingContext.setLineDash([6, 5]);
    line(xOf(0), yOf(1), R.x + R.w, yOf(1));
    if (showDC) {
      stroke(COL_REF[0], COL_REF[1], COL_REF[2]);
      strokeWeight(2);
      line(R.x, yOf(sys.dc), R.x + R.w, yOf(sys.dc));
    }
    drawingContext.setLineDash([]);
    // output as a staircase (each sample held for one sampling period)
    noFill();
    stroke(COL_SIG[0], COL_SIG[1], COL_SIG[2]);
    strokeWeight(2.2);
    beginShape();
    for (let n = 0; n < N_SAMPLES; n++) {
      const v = constrain(data[n], vlo, vhi);
      vertex(xOf(n), yOf(v));
      vertex(xOf(n + 1), yOf(v));
    }
    endShape();
    for (let n = 0; n < N_SAMPLES; n++) {
      if (data[n] > vhi || data[n] < vlo) {
        stroke(COL_ERR[0], COL_ERR[1], COL_ERR[2]);
        strokeWeight(4);
        const y = data[n] > vhi ? yTopEdge : yBotEdge;
        line(xOf(n), y, xOf(n + 1), y);
      }
    }
  } else {
    // impulse response as stems
    const spacing = R.w / N_SAMPLES, y0 = yOf(0);
    for (let n = 0; n < N_SAMPLES; n++) {
      const v = data[n];
      if (Math.abs(v) < 1e-12) continue;
      const out = v > vhi || v < vlo;
      const vc = constrain(v, vlo, vhi), col = out ? COL_ERR : COL_SIG;
      const x = xOf(n) + spacing / 2;
      stroke(col[0], col[1], col[2]);
      strokeWeight(spacing >= 3 ? 1.6 : 1.2);
      line(x, y0, x, yOf(vc));
      if (spacing >= 3.5 || nonZeroCount(data) <= 40) {
        noStroke();
        fill(col[0], col[1], col[2]);
        circle(x, yOf(vc), compact ? 5 : 6);
      }
    }
  }
  pop();

  // legend (top-right, in the band above the data)
  if (items.length) legendBox(R, items);
}

function nonZeroCount(d) {
  let c = 0;
  for (const v of d) if (Math.abs(v) >= 1e-12) c++;
  return c;
}

function drawTimeAxis(R) {
  noStroke();
  fill(80);
  textSize(compact ? 11 : 13);
  const title = 't (s)';
  const tw = advW(title);
  textAlign(RIGHT, TOP);
  text(title, R.x + R.w, R.y + R.h + 3);
  textAlign(CENTER, TOP);
  for (let t = 0; t <= 2.0001; t += 0.5) {
    const x = R.x + t / (N_SAMPLES * TS) * R.w;
    const lbl = t === 0 ? '0' : t.toFixed(1);
    if (x + advW(lbl) / 2 > R.x + R.w - tw - 6) continue;
    stroke(150);
    strokeWeight(1);
    line(x, R.y + R.h, x, R.y + R.h + 3);
    noStroke();
    text(lbl, x, R.y + R.h + 3);
  }
}

function legendBox(R, items) {
  const sz = compact ? 11 : 13;
  textSize(sz);
  const widthOf = list => list.reduce((w, it) => w + 24 + advW(it.label) + 10, 6);
  if (widthOf(items) > R.w - 8) items = items.map(it => Object.assign({}, it, { label: it.short }));
  const w = widthOf(items), h = sz + 7;
  const x0 = R.x + R.w - w - 2, y0 = R.y + 2;
  noStroke();
  fill(255, 255, 255, 225);
  rect(x0, y0, w, h);
  let x = x0 + 6;
  const y = y0 + h / 2;
  for (const it of items) {
    const c = it.col;
    stroke(c[0], c[1], c[2]);
    strokeWeight(2.2);
    if (it.kind === 'line') line(x, y, x + 18, y);
    else { line(x, y, x + 6, y); line(x + 11, y, x + 18, y); }
    noStroke();
    fill(it.col === COL_INPUT ? 90 : c[0], it.col === COL_INPUT ? 90 : c[1], it.col === COL_INPUT ? 90 : c[2]);
    textAlign(LEFT, CENTER);
    text(it.label, x + 24, y);
    x += 24 + advW(it.label) + 10;
  }
}

// ---------------------------------------------------------------- text helpers

// Rich text: "H_1" draws the 1 as a subscript, "z^{−10}" draws −10 as a superscript
function parseRich(s) {
  const out = [];
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ((ch === '_' || ch === '^') && i + 1 < s.length) {
      if (buf) { out.push({ t: buf, k: 0 }); buf = ''; }
      let body;
      if (s[i + 1] === '{') {
        const j = s.indexOf('}', i + 2);
        body = s.slice(i + 2, j < 0 ? s.length : j);
        i = j < 0 ? s.length : j;
      } else {
        body = s[i + 1];
        i++;
      }
      out.push({ t: body, k: ch === '_' ? 1 : 2 });
    } else {
      buf += ch;
    }
  }
  if (buf) out.push({ t: buf, k: 0 });
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
    textSize(p.k ? sz * 0.72 : sz);
    w += advW(p.t);
  }
  textSize(sz);
  return w;
}

// y is the vertical centre of the line; returns the width drawn
function richText(s, x, y, sz, align) {
  const w = richWidth(s, sz);
  let cx = align === CENTER ? x - w / 2 : (align === RIGHT ? x - w : x);
  textAlign(LEFT, CENTER);
  for (const p of parseRich(s)) {
    textSize(p.k ? sz * 0.72 : sz);
    const dy = p.k === 1 ? sz * 0.3 : (p.k === 2 ? -sz * 0.32 : 0);
    text(p.t, cx, y + dy);
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

// number with a true minus sign and no "-0.00"
function fmt(v, d = 2) {
  const r = Number(v.toFixed(d));
  return (r < 0 ? '−' : '') + Math.abs(r).toFixed(d);
}

// ---------------------------------------------------------------- responsive layout

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  compact = canvasWidth < 640;
  controlHeight = compact ? 172 : 112;
  drawHeight = CANVAS_H - controlHeight;
  layoutControls(false);
}
