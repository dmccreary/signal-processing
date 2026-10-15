// s-Plane Explorer (Laplace) MicroSim
// CANVAS_HEIGHT: 696
// Poles (x) and zeros (o) of a continuous-time system H(s) = K (s - z1)(s - z2).../((s - p1)(s - p2)...)
// are placed on the s-plane. The frequency response H(jw) is evaluated along the jw axis from the
// vectors that join every pole and zero to a moving marker s = jw; the unit-step response comes from
// simulating the real-coefficient differential equation (RK4). The region of convergence of the
// causal system, Re(s) > max Re(p), is shaded, and an optional inset maps the same poles and zeros
// to the z-plane with z = e^(sT).

// Canvas dimensions
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let drawHeight = 520;
let controlHeight = 176;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 262;
let defaultTextSize = 16;

// s-plane window: sigma from -6 to 2, omega from -4 to 4 (equal scales, so angles are true)
const SIG_MIN = -6, SIG_MAX = 2, OM_MAX = 4;
const W_MAX = 4;                     // frequency plots run over the upper jw axis, 0 ... 4 rad/s
const N_FREQ = 400;                  // frequency samples (0.01 rad/s apart)
const N_STEP = 2000;                 // RK4 steps of the step response
const MAX_POLES = 6, MAX_ZEROS = 6;
const SNAP = 0.1;                    // dragging snaps to an axis within 0.1
const GRID = 0.05;                   // dragged positions are rounded to 0.05

// Colors: poles crimson, zeros blue, magnitude maroon, phase green, step response blue, marker gold
const COL_POLE = [200, 30, 50];
const COL_ZERO = [40, 90, 210];
const COL_MAG = [128, 0, 0];
const COL_PHASE = [40, 130, 80];
const COL_STEP = [25, 90, 200];
const COL_MARK = [218, 165, 32];
const COL_MARK_TEXT = [150, 100, 0];
const STATE_COL = {
  stable: { fg: [0, 100, 0], bg: [240, 255, 240], fill: [46, 139, 87] },
  marginal: { fg: [139, 69, 19], bg: [255, 250, 205], fill: [218, 165, 32] },
  unstable: { fg: [178, 34, 34], bg: [255, 228, 225], fill: [200, 30, 50] }
};

// Presets. A 'real' item is one real root; a 'pair' item is the quadratic factor s^2 + c1 s + c0
// (a complex-conjugate pair, a double root, or two real roots).
const PRESETS = [
  { id: 'first', label: 'First-order low-pass', items: () => [realItem('pole', -1)] },
  { id: 'second', label: 'Second-order (ζ, ωn sliders)', items: () => [pairZW('pole', 0.3, 2)] },
  { id: 'integrator', label: 'Integrator 1/s', items: () => [realItem('pole', 0)] },
  { id: 'unstable', label: 'Unstable (poles in RHP)', items: () => [pairZW('pole', -0.1, 2)] },
  { id: 'oscillator', label: 'Oscillator (poles on jω axis)', items: () => [pairZW('pole', 0, 2)] },
  { id: 'notch', label: 'Notch (zeros on jω axis)', items: () => [pairZW('pole', 0.25, 2), pairZW('zero', 0, 2)] },
  { id: 'nonmin', label: 'Right-half-plane zero', items: () => [realItem('pole', -1), realItem('pole', -2), realItem('zero', 1)] }
];

// Controls
let presetSelect, addPoleButton, addZeroButton, removeButton, pairCheckbox;
let zetaSlider, wnSlider, omegaSlider, mapCheckbox, periodSlider;

// State
let items = [];
let selected = 0;                    // index into items, or -1
let drag = null;                     // {kind: 'root' | 'marker', ...}
let omega0 = 1.5;                    // marker position s = j*omega0 (rad/s)
let sysCache = null, sysKey = '';
let L = {};                          // layout of the panels (recomputed every frame)
let layoutNarrow = null;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  presetSelect = createSelect();
  for (const p of PRESETS) presetSelect.option(p.label, p.id);
  presetSelect.selected('second');
  presetSelect.style('font-size', '14px');
  presetSelect.changed(loadPreset);

  addPoleButton = createButton('Add pole');
  addPoleButton.mousePressed(() => addItem('pole'));
  addZeroButton = createButton('Add zero');
  addZeroButton.mousePressed(() => addItem('zero'));
  removeButton = createButton('Remove');
  removeButton.mousePressed(removeSelected);
  pairCheckbox = createCheckbox('as conjugate pair', true);
  pairCheckbox.style('font-size', '15px');

  zetaSlider = createSlider(-0.5, 2, 0.3, 0.01);
  zetaSlider.input(zetaMoved);
  wnSlider = createSlider(0.1, 4, 2, 0.01);
  wnSlider.input(wnMoved);
  omegaSlider = createSlider(0, W_MAX, omega0, 0.01);
  omegaSlider.input(() => { omega0 = Number(omegaSlider.value()); });
  mapCheckbox = createCheckbox('Map to z-plane', false);
  mapCheckbox.style('font-size', '16px');
  periodSlider = createSlider(0.05, 2, 0.5, 0.01);

  loadPreset();
  positionControls(true);
  describe('An s-plane with sigma on the horizontal axis and j omega on the vertical axis. Poles are red crosses and zeros are blue circles that can be dragged; the region of convergence of the causal system is shaded to the right of the rightmost pole and a banner reports stability. Three plots show the magnitude and phase of H(j omega) for omega from 0 to 4 rad/s and the unit-step response. A gold marker on the j omega axis, set by a slider or by hovering over the frequency plots, shows the vectors from every pole and zero. An optional inset maps the poles and zeros to the z-plane with z = e^(sT).');
}

// ---------------------------------------------------------------- items

function realItem(type, r) { return { type: type, kind: 'real', r: r }; }
function pairZW(type, zeta, wn) { return { type: type, kind: 'pair', c1: 2 * zeta * wn, c0: wn * wn }; }

// roots of one item as [re, im]; a pair returns two roots
function itemRoots(it) {
  if (it.kind === 'real') return [[it.r, 0]];
  const disc = it.c1 * it.c1 - 4 * it.c0;
  const re = -it.c1 / 2;
  if (disc < -1e-12) {
    const im = Math.sqrt(-disc) / 2;
    return [[re, im], [re, -im]];
  }
  const h = Math.sqrt(Math.max(0, disc)) / 2;
  return [[re + h, 0], [re - h, 0]];
}

// damping ratio and natural frequency of a pair (defined when c0 > 0)
function pairZetaWn(it) {
  if (it.kind !== 'pair' || !(it.c0 > 1e-12)) return null;
  const wn = Math.sqrt(it.c0);
  return { zeta: it.c1 / (2 * wn), wn: wn };
}

function rootCount(type) {
  let n = 0;
  for (const it of items) if (it.type === type) n += it.kind === 'pair' ? 2 : 1;
  return n;
}

function loadPreset() {
  const p = PRESETS.find(q => q.id === presetSelect.value()) || PRESETS[1];
  items = p.items();
  selectItem(0);
}

function selectItem(i) {
  selected = (i >= 0 && i < items.length) ? i : -1;
  syncSliders();
}

// show the selected pole pair's zeta and wn on the sliders
function syncSliders() {
  const zw = selectedPolePair();
  if (zw) {
    zetaSlider.value(constrain(zw.zeta, -0.5, 2));
    wnSlider.value(constrain(zw.wn, 0.1, 4));
  }
}

function selectedPolePair() {
  if (selected < 0 || selected >= items.length) return null;
  const it = items[selected];
  if (it.type !== 'pole') return null;
  return pairZetaWn(it);
}

function zetaMoved() {
  const zw = selectedPolePair();
  if (!zw) return;
  const it = items[selected];
  const z = Number(zetaSlider.value());
  it.c1 = 2 * z * zw.wn;
}

function wnMoved() {
  const zw = selectedPolePair();
  if (!zw) return;
  const it = items[selected];
  const wn = Number(wnSlider.value());
  it.c1 = 2 * zw.zeta * wn;
  it.c0 = wn * wn;
}

// candidate positions for new roots; the first one that is free is used
const NEW_SPOTS = {
  'pole-pair': [[-1, 1], [-2, 3], [-3, 1.5], [-0.5, 3], [-4, 2.5], [-1.5, 2]],
  'pole-real': [-2, -3, -0.5, -4, -1.5, -5],
  'zero-pair': [[-1, 3], [0, 3], [-2, 2], [-3, 3], [-4, 1], [-0.5, 1.5]],
  'zero-real': [-3, -4, -0.5, -1.5, -5, -2.5]
};

function spotIsFree(re, im) {
  for (const it of items) {
    for (const q of itemRoots(it)) {
      if (Math.hypot(q[0] - re, q[1] - im) < 0.3) return false;
    }
  }
  return true;
}

function canAdd(type) {
  const k = pairCheckbox.checked() ? 2 : 1;
  if (type === 'pole') return rootCount('pole') + k <= MAX_POLES;
  // keep H(s) proper: no more zeros than poles
  return rootCount('zero') + k <= Math.min(MAX_ZEROS, rootCount('pole'));
}

function addItem(type) {
  if (!canAdd(type)) return;
  const pair = pairCheckbox.checked();
  const spots = NEW_SPOTS[type + (pair ? '-pair' : '-real')];
  let it = null;
  for (const s of spots) {
    if (pair && spotIsFree(s[0], s[1])) { it = { type: type, kind: 'pair', c1: -2 * s[0], c0: s[0] * s[0] + s[1] * s[1] }; break; }
    if (!pair && spotIsFree(s, 0)) { it = realItem(type, s); break; }
  }
  if (!it) {
    const s = spots[0];
    it = pair ? { type: type, kind: 'pair', c1: -2 * s[0], c0: s[0] * s[0] + s[1] * s[1] } : realItem(type, s);
  }
  items.push(it);
  selectItem(items.length - 1);
}

function removeSelected() {
  if (selected < 0 || selected >= items.length) return;
  items.splice(selected, 1);
  selectItem(items.length > 0 ? Math.min(selected, items.length - 1) : -1);
}

// ---------------------------------------------------------------- system model

function polyMul(a, b) {
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return out;
}

// polynomial in descending powers of s, product of the factors of one kind (real coefficients)
function buildPoly(type) {
  let c = [1];
  for (const it of items) {
    if (it.type !== type) continue;
    c = polyMul(c, it.kind === 'real' ? [1, -it.r] : [1, it.c1, it.c0]);
  }
  return c;
}

// angle of the vector from a root to the point jw; continuous in w for roots off the jw axis
function rootAngle(vx, vy) {
  if (vx > 1e-12) return Math.atan2(vy, vx);
  if (vx < -1e-12) {
    let a = Math.atan2(vy, vx);
    if (a < 0) a += 2 * Math.PI;
    return a;
  }
  return vy >= 0 ? Math.PI / 2 : -Math.PI / 2;       // a root on the jw axis (limit from above at the root)
}

function rawResponse(w, sys) {
  let mag = Math.abs(sys.K), ph = sys.K < 0 ? Math.PI : 0;
  for (const q of sys.zs) {
    const vx = -q[0], vy = w - q[1];
    mag *= Math.hypot(vx, vy);
    ph += rootAngle(vx, vy);
  }
  for (const q of sys.ps) {
    const vx = -q[0], vy = w - q[1];
    mag /= Math.max(Math.hypot(vx, vy), 1e-12);
    ph -= rootAngle(vx, vy);
  }
  return { mag: mag, phase: ph };
}

// H(jw): magnitude and phase (radians, unwrapped, with the phase near w = 0 in (-pi, pi])
function responseAt(w, sys) {
  const r = rawResponse(w, sys);
  return { mag: r.mag, phase: r.phase - sys.phaseOffset };
}

function stabilityOf(ps) {
  if (ps.length === 0) return { state: 'stable', none: true, sigmaMax: -Infinity };
  let sMax = -Infinity;
  for (const q of ps) sMax = Math.max(sMax, q[0]);
  if (sMax > 1e-9) return { state: 'unstable', sigmaMax: sMax };
  if (sMax < -1e-9) return { state: 'stable', sigmaMax: sMax };
  const on = ps.filter(q => Math.abs(q[0]) <= 1e-9);
  for (let i = 0; i < on.length; i++) {
    for (let j = i + 1; j < on.length; j++) {
      if (Math.hypot(on[i][0] - on[j][0], on[i][1] - on[j][1]) < 1e-6) return { state: 'unstable', repeated: true, sigmaMax: 0 };
    }
  }
  return { state: 'marginal', sigmaMax: 0 };
}

// time window of the step plot: about six time constants of the slowest stable pole
function chooseTMax(ps, stab) {
  if (stab.state !== 'stable' || ps.length === 0) return 10;
  let slow = Infinity;
  for (const q of ps) slow = Math.min(slow, -q[0]);
  const need = 6 / slow;
  for (const t of [2, 5, 10, 20, 50]) if (need <= t + 1e-9) return t;
  return 50;
}

// Unit-step response of H(s) = K B(s)/A(s) in controllable canonical form, integrated with RK4
function stepResponse(A, B, K, tMax) {
  const n = A.length - 1, m = B.length - 1;
  const y = new Float64Array(N_STEP + 1);
  if (m > n) return { improper: true, y: y };
  if (n === 0) { y.fill(K * B[0]); return { y: y, diverged: false }; }
  const a = A.slice(1);
  const b = new Array(n + 1).fill(0);
  for (let i = 0; i <= m; i++) b[n - m + i] = K * B[i];
  const D = b[0];
  const beta = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) beta[i] = b[i] - D * a[i - 1];
  const deriv = (x) => {
    const dx = new Array(n);
    for (let k = 0; k < n - 1; k++) dx[k] = x[k + 1];
    let s = 1;                                   // u(t) = 1
    for (let i = 1; i <= n; i++) s -= a[i - 1] * x[n - i];
    dx[n - 1] = s;
    return dx;
  };
  const out = (x) => {
    let v = D;
    for (let k = 0; k < n; k++) v += beta[n - k] * x[k];
    return v;
  };
  const dt = tMax / N_STEP;
  let x = new Array(n).fill(0);
  y[0] = out(x);
  let diverged = false;
  for (let i = 1; i <= N_STEP; i++) {
    if (diverged) { y[i] = NaN; continue; }
    const k1 = deriv(x);
    const k2 = deriv(x.map((v, j) => v + 0.5 * dt * k1[j]));
    const k3 = deriv(x.map((v, j) => v + 0.5 * dt * k2[j]));
    const k4 = deriv(x.map((v, j) => v + dt * k3[j]));
    x = x.map((v, j) => v + dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    y[i] = out(x);
    if (!isFinite(y[i]) || Math.abs(y[i]) > 1e9) { y[i] = NaN; diverged = true; }
  }
  return { y: y, diverged: diverged };
}

function analyzeSystem() {
  const key = JSON.stringify(items);
  if (sysCache && key === sysKey) return sysCache;
  const ps = [], zs = [];
  for (const it of items) for (const q of itemRoots(it)) (it.type === 'pole' ? ps : zs).push(q);
  const A = buildPoly('pole'), B = buildPoly('zero');
  const A0 = A[A.length - 1], B0 = B[B.length - 1];
  let K = 1, kNorm = false;
  if (Math.abs(A0) > 1e-9 && Math.abs(B0) > 1e-9) { K = A0 / B0; kNorm = true; }
  const sys = { ps: ps, zs: zs, A: A, B: B, K: K, kNorm: kNorm, phaseOffset: 0 };
  // choose the 2*pi branch so that the phase just above w = 0 lies in (-180, 180] degrees
  const ph0 = rawResponse(1e-4, sys).phase;
  sys.phaseOffset = 2 * Math.PI * Math.round(ph0 / (2 * Math.PI) - 1e-9);
  sys.mag = new Float64Array(N_FREQ + 1);
  sys.phase = new Float64Array(N_FREQ + 1);
  for (let i = 0; i <= N_FREQ; i++) {
    const r = responseAt(W_MAX * i / N_FREQ, sys);
    sys.mag[i] = r.mag;
    sys.phase[i] = r.phase * 180 / Math.PI;
  }
  sys.stab = stabilityOf(ps);
  sys.tMax = chooseTMax(ps, sys.stab);
  const sr = stepResponse(A, B, K, sys.tMax);
  sys.improper = !!sr.improper;
  sys.y = sr.y;
  sys.diverged = !!sr.diverged;
  sys.metrics = stepMetrics(sys);
  sysCache = sys;
  sysKey = key;
  return sys;
}

function stepMetrics(sys) {
  const M = {};
  if (sys.improper) return M;
  const y = sys.y, dt = sys.tMax / N_STEP;
  M.final = (sys.stab.state === 'stable') ? sys.K * sys.B[sys.B.length - 1] / sys.A[sys.A.length - 1] : null;
  let iMax = 0, iMin = 0;
  for (let i = 0; i <= N_STEP; i++) {
    if (!isFinite(y[i])) break;
    if (y[i] > y[iMax]) iMax = i;
    if (y[i] < y[iMin]) iMin = i;
  }
  M.yMax = y[iMax]; M.tPeak = iMax * dt;
  M.yMin = y[iMin]; M.tMin = iMin * dt;
  M.yEnd = y[N_STEP];
  if (M.final !== null && Math.abs(M.final) > 1e-9) {
    const f = M.final;
    const peak = f > 0 ? M.yMax : M.yMin;
    M.overshoot = Math.max(0, (peak - f) / f * 100);
    M.tOvershootPeak = f > 0 ? M.tPeak : M.tMin;
    // undershoot: the response first moves the wrong way
    M.undershoot = f > 0 ? Math.max(0, -M.yMin) : Math.max(0, M.yMax);
    let last = -1;
    for (let i = 0; i <= N_STEP; i++) if (Math.abs(y[i] - f) > 0.02 * Math.abs(f)) last = i;
    M.settle = last < N_STEP ? (last + 1) * dt : null;
  }
  // classic formulas for a single pole item with no zeros
  if (items.length === 1 && items[0].type === 'pole') {
    const it = items[0];
    const zw = pairZetaWn(it);
    if (zw && zw.zeta > 0 && zw.zeta < 1) {
      const z = zw.zeta;
      M.formulaOS = 100 * Math.exp(-Math.PI * z / Math.sqrt(1 - z * z));
      M.formulaTp = Math.PI / (zw.wn * Math.sqrt(1 - z * z));
    }
    if (it.kind === 'real' && it.r < 0) {
      M.tau = -1 / it.r;
      M.yTau = sampleAt(y, M.tau / dt);
    }
  }
  return M;
}

function sampleAt(y, idx) {
  const i = Math.floor(idx);
  if (i >= N_STEP) return y[N_STEP];
  const f = idx - i;
  return y[i] * (1 - f) + y[i + 1] * f;
}

// ---------------------------------------------------------------- draw

function draw() {
  updateCanvasSize();
  computeLayout();

  // the marker follows the mouse over either frequency plot
  for (const p of [L.mag, L.phase]) {
    if (!drag && mouseX >= p.x && mouseX <= p.x + p.w && mouseY >= p.y && mouseY <= p.y + p.h) {
      omega0 = Math.round((mouseX - p.x) / p.w * W_MAX * 100) / 100;
      omegaSlider.value(omega0);
    }
  }

  const sys = analyzeSystem();
  updateControlStates();

  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  drawTitle();
  drawBanner(sys);
  drawFormula(sys);
  drawPlane(L.plane, sys);
  drawPlaneReadout(sys);
  drawMagnitude(L.mag, sys);
  drawPhase(L.phase, sys);
  drawStep(L.step, sys);
  drawStepReadout(sys);
  drawControlLabels();
}

function computeLayout() {
  const narrow = canvasWidth < 600;
  const size = narrow ? Math.max(130, Math.floor(canvasWidth * 0.40)) : 300;
  L.narrow = narrow;
  L.plane = { x: 12, y: 108, w: size, h: size };
  const rx = 12 + size + (narrow ? 34 : 54);
  const rw = Math.max(80, canvasWidth - rx - 14);
  L.mag = { x: rx, y: 108, w: rw, h: 85 };
  L.phase = { x: rx, y: 218, w: rw, h: 60 };
  L.step = { x: rx, y: 326, w: rw, h: 120 };
  L.fs = narrow ? 11 : 13;           // caption / read-out font size
}

function drawTitle() {
  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(['s-Plane Explorer: Poles, Zeros, Frequency and Step Response', 's-Plane Explorer'],
          canvasWidth / 2, 18, canvasWidth - 20, L.narrow ? 18 : 22, CENTER);
  textStyle(NORMAL);
}

function drawBanner(sys) {
  const st = sys.stab;
  const c = STATE_COL[st.state];
  let cands;
  if (st.state === 'stable') {
    if (st.none) cands = ['STABLE: there are no poles, so H(s) is a constant gain', 'STABLE: no poles'];
    else cands = ['STABLE: every pole has Re(p) < 0 (rightmost pole at σ = ' + fmt(st.sigmaMax) + '), so the ROC contains the jω axis',
                  'STABLE: every pole has Re(p) < 0 (rightmost σ = ' + fmt(st.sigmaMax) + ')',
                  'STABLE: all poles in the left half-plane', 'STABLE: poles in the LHP'];
  } else if (st.state === 'marginal') {
    cands = ['MARGINALLY STABLE: a simple pole on the jω axis; h(t) stays bounded, but the system is not BIBO stable',
             'MARGINALLY STABLE: a simple pole on the jω axis (not BIBO stable)',
             'MARGINAL: pole on the jω axis', 'MARGINAL'];
  } else if (st.repeated) {
    cands = ['UNSTABLE: a repeated pole on the jω axis makes h(t) grow without bound',
             'UNSTABLE: repeated pole on the jω axis', 'UNSTABLE'];
  } else {
    cands = ['UNSTABLE: a pole has Re(p) = ' + fmt(st.sigmaMax, 2, true) + ' > 0 (right half-plane), so h(t) grows without bound',
             'UNSTABLE: a pole has Re(p) = ' + fmt(st.sigmaMax, 2, true) + ' > 0 (right half-plane)',
             'UNSTABLE: pole in the right half-plane', 'UNSTABLE: pole in the RHP'];
  }
  stroke(c.fg[0], c.fg[1], c.fg[2]);
  strokeWeight(1.5);
  fill(c.bg[0], c.bg[1], c.bg[2]);
  rect(10, 36, canvasWidth - 20, 24, 8);
  noStroke();
  fill(c.fg[0], c.fg[1], c.fg[2]);
  textStyle(BOLD);
  fitText(cands, canvasWidth / 2, 48, canvasWidth - 36, L.narrow ? 12 : 14, CENTER);
  textStyle(NORMAL);
}

const SUP = ['', '', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '¹⁰', '¹¹', '¹²'];

// polynomial (descending powers of s) as text, e.g. "s² + 1.20s + 4.00"
function polyString(c) {
  const n = c.length - 1;
  let s = '';
  for (let i = 0; i <= n; i++) {
    const v = c[i], pw = n - i;
    if (Math.abs(v) < 1e-9) continue;
    const mag = Math.abs(v);
    let term;
    if (pw === 0) term = mag.toFixed(2);
    else term = (Math.abs(mag - 1) < 1e-9 ? '' : mag.toFixed(2)) + 's' + SUP[pw];
    if (s === '') s = (v < 0 ? '−' : '') + term;
    else s += (v < 0 ? ' − ' : ' + ') + term;
  }
  return s === '' ? '0' : s;
}

function nTerms(c) { return c.filter(v => Math.abs(v) >= 1e-9).length; }

function drawFormula(sys) {
  const den = sys.A.length === 1 ? '' : (nTerms(sys.A) > 1 ? '(' + polyString(sys.A) + ')' : polyString(sys.A));
  let num = fmt(sys.K);
  if (sys.B.length > 1) num += (nTerms(sys.B) > 1 ? '·(' + polyString(sys.B) + ')' : '·' + polyString(sys.B));
  const f = 'H(s) = ' + num + (den ? ' / ' + den : '');
  const note = sys.kNorm ? 'K = ' + fmt(sys.K) + ' makes H(0) = 1' : 'K = 1 (a pole or zero at s = 0)';
  noStroke();
  fill(30);
  fitText([f + '      ' + note, f], canvasWidth / 2, 82, canvasWidth - 20, L.narrow ? 13 : 16, CENTER);
}

// ---------------------------------------------------------------- s-plane

function planeMap(p) {
  const sc = p.w / (SIG_MAX - SIG_MIN);
  return {
    sc: sc,
    X: s => p.x + (s - SIG_MIN) * sc,
    Y: w => p.y + p.h / 2 - w * sc,
    S: x => SIG_MIN + (x - p.x) / sc,
    W: y => (p.y + p.h / 2 - y) / sc
  };
}

function clipRect(r) {
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(r.x, r.y, r.w, r.h);
  drawingContext.clip();
}
function unclip() { drawingContext.restore(); }

function drawPlane(p, sys) {
  const m = planeMap(p);
  const st = sys.stab;
  const c = STATE_COL[st.state];
  const mapOn = mapCheckbox.checked();
  const T = Number(periodSlider.value());

  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);

  clipRect(p);
  // ROC of the causal system: everything to the right of the rightmost pole
  const sigRoc = sys.ps.length ? st.sigmaMax : -Infinity;
  const xRoc = isFinite(sigRoc) ? constrain(m.X(sigRoc), p.x, p.x + p.w) : p.x;
  noStroke();
  fill(c.fill[0], c.fill[1], c.fill[2], 34);
  rect(xRoc, p.y, p.x + p.w - xRoc, p.h);

  // z-map: the strip |w| < pi/T maps onto the whole z-plane; outside it the poles alias
  if (mapOn && Math.PI / T < OM_MAX) {
    const yTop = m.Y(Math.PI / T), yBot = m.Y(-Math.PI / T);
    fill(120, 120, 120, 40);
    rect(p.x, p.y, p.w, yTop - p.y);
    rect(p.x, yBot, p.w, p.y + p.h - yBot);
    stroke(110);
    strokeWeight(1);
    drawingContext.setLineDash([4, 4]);
    line(p.x, yTop, p.x + p.w, yTop);
    line(p.x, yBot, p.x + p.w, yBot);
    drawingContext.setLineDash([]);
    noStroke();
    textSize(L.narrow ? 10 : 11);
    for (const lb of [['ω = π/T', yTop + 3, TOP], ['ω = −π/T', yBot - 3, BOTTOM]]) {
      fill(255, 255, 255, 200);
      rect(p.x + 2, lb[2] === TOP ? lb[1] - 1 : lb[1] - 13, advW(lb[0]) + 6, 14, 3);
      fill(70);
      textAlign(LEFT, lb[2]);
      text(lb[0], p.x + 5, lb[1]);
    }
  }

  // grid
  stroke(232);
  strokeWeight(1);
  for (let s = SIG_MIN + 1; s < SIG_MAX; s++) line(m.X(s), p.y, m.X(s), p.y + p.h);
  for (let w = -OM_MAX + 1; w < OM_MAX; w++) line(p.x, m.Y(w), p.x + p.w, m.Y(w));

  // axes: sigma (real) and the jw axis, where s = jw gives the frequency response
  stroke(120);
  line(p.x, m.Y(0), p.x + p.w, m.Y(0));
  stroke(60);
  strokeWeight(2);
  line(m.X(0), p.y, m.X(0), p.y + p.h);
  strokeWeight(1);

  // ROC boundary
  if (isFinite(sigRoc) && sigRoc >= SIG_MIN && sigRoc <= SIG_MAX) {
    stroke(c.fg[0], c.fg[1], c.fg[2]);
    strokeWeight(1.5);
    drawingContext.setLineDash([6, 4]);
    line(m.X(sigRoc), p.y, m.X(sigRoc), p.y + p.h);
    drawingContext.setLineDash([]);
    strokeWeight(1);
  }

  // tick labels
  noStroke();
  fill(90);
  textSize(L.narrow ? 10 : 11);
  textAlign(CENTER, TOP);
  for (const s of [-4, -2]) text(fmtInt(s), m.X(s), p.y + 3);
  textAlign(RIGHT, CENTER);
  for (const w of [-2, 2]) text((w < 0 ? '−j' : 'j') + Math.abs(w), p.x + p.w - 3, m.Y(w));
  textAlign(RIGHT, BOTTOM);
  text('σ', p.x + p.w - 4, m.Y(0) - 2);
  textAlign(LEFT, TOP);
  text('jω', m.X(0) + 5, p.y + 3);

  // vectors from every pole and zero to the marker s = j*omega0
  const mx = m.X(0), my = m.Y(omega0);
  strokeWeight(1.3);
  stroke(COL_ZERO[0], COL_ZERO[1], COL_ZERO[2], 120);
  for (const q of sys.zs) line(m.X(q[0]), m.Y(q[1]), mx, my);
  stroke(COL_POLE[0], COL_POLE[1], COL_POLE[2], 120);
  for (const q of sys.ps) line(m.X(q[0]), m.Y(q[1]), mx, my);

  // the roots
  items.forEach((it, i) => {
    const rs = itemRoots(it);
    const isDouble = rs.length === 2 && Math.hypot(rs[0][0] - rs[1][0], rs[0][1] - rs[1][1]) < 1e-9;
    for (let k = 0; k < (isDouble ? 1 : rs.length); k++) {
      const q = rs[k];
      if (q[0] < SIG_MIN || q[0] > SIG_MAX || Math.abs(q[1]) > OM_MAX) continue;
      const x = m.X(q[0]), y = m.Y(q[1]);
      if (i === selected) {
        noFill();
        stroke(COL_MARK[0], COL_MARK[1], COL_MARK[2]);
        strokeWeight(3);
        circle(x, y, 24);
      }
      drawRootGlyph(it.type, x, y, 6);
      if (isDouble) {
        noStroke();
        fill(it.type === 'pole' ? COL_POLE : COL_ZERO);
        textSize(11);
        textStyle(BOLD);
        textAlign(LEFT, BOTTOM);
        text('×2', x + 8, y - 5);
        textStyle(NORMAL);
      }
    }
  });

  // marker
  noStroke();
  fill(COL_MARK[0], COL_MARK[1], COL_MARK[2]);
  stroke(255);
  strokeWeight(1.5);
  circle(mx, my, 12);
  noStroke();
  fill(COL_MARK_TEXT[0], COL_MARK_TEXT[1], COL_MARK_TEXT[2]);
  textSize(L.narrow ? 10 : 12);
  textStyle(BOLD);
  // label beside the marker, on the first side that no pole or zero covers
  const lab = 'j' + omega0.toFixed(2);
  const lw = advW(lab), lhh = 8;
  const spots = [[9, -9], [-9, -9], [9, 11], [-9, 11]];
  let best = spots[0];
  for (const sp of spots) {
    const x0 = sp[0] > 0 ? mx + sp[0] : mx + sp[0] - lw, x1 = x0 + lw, yc = my + sp[1];
    let hit = false;
    for (const q of sys.ps.concat(sys.zs)) {
      const qx = m.X(q[0]), qy = m.Y(q[1]);
      if (qx > x0 - 13 && qx < x1 + 13 && Math.abs(qy - yc) < lhh + 13) { hit = true; break; }
    }
    if (!hit) { best = sp; break; }
  }
  textAlign(best[0] < 0 ? RIGHT : LEFT, CENTER);
  if (!L.narrow) text(lab, mx + best[0], my + best[1]);   // narrow screens: the value is in the slider label
  textStyle(NORMAL);
  unclip();

  // roots outside the window: an arrow on the edge with the value
  for (const it of items) {
    for (const q of itemRoots(it)) {
      if (!(q[0] < SIG_MIN || q[0] > SIG_MAX || Math.abs(q[1]) > OM_MAX)) continue;
      const x = constrain(m.X(q[0]), p.x + 8, p.x + p.w - 8);
      const y = constrain(m.Y(q[1]), p.y + 8, p.y + p.h - 8);
      const col = it.type === 'pole' ? COL_POLE : COL_ZERO;
      noStroke();
      fill(col[0], col[1], col[2]);
      const dx = q[0] < SIG_MIN ? -1 : (q[0] > SIG_MAX ? 1 : 0);
      const dy = q[1] > OM_MAX ? -1 : (q[1] < -OM_MAX ? 1 : 0);
      push();
      translate(x, y);
      rotate(Math.atan2(dy, dx));
      triangle(7, 0, -5, -6, -5, 6);
      pop();
      textSize(L.narrow ? 10 : 11);
      textAlign(dx < 0 ? LEFT : RIGHT, BOTTOM);
      text(fmtComplex(q), x + (dx < 0 ? 4 : -4), y - 7);
    }
  }

  // ROC label
  const rocTxt = !sys.ps.length ? 'ROC: entire s-plane' : (L.narrow ? 'ROC: σ > ' + fmt(sigRoc) : 'ROC: Re(s) > ' + fmt(sigRoc));
  textSize(L.narrow ? 10 : 12);
  const tw = advW(rocTxt) + 10;
  noStroke();
  fill(255, 255, 255, 225);
  rect(p.x + p.w - tw - 3, p.y + p.h - 21, tw, 18, 4);
  fill(c.fg[0], c.fg[1], c.fg[2]);
  textStyle(BOLD);
  textAlign(RIGHT, CENTER);
  text(rocTxt, p.x + p.w - 8, p.y + p.h - 12);
  textStyle(NORMAL);

  // caption
  noStroke();
  fill('black');
  textSize(L.fs);
  textStyle(BOLD);
  textAlign(LEFT, BOTTOM);
  text(L.narrow ? 's-plane (drag)' : 's-plane:  × pole   ○ zero   (drag to move)', p.x, p.y - 4);
  textStyle(NORMAL);
}

function drawRootGlyph(type, x, y, s) {
  strokeWeight(2.5);
  if (type === 'pole') {
    stroke(COL_POLE[0], COL_POLE[1], COL_POLE[2]);
    line(x - s, y - s, x + s, y + s);
    line(x - s, y + s, x + s, y - s);
  } else {
    stroke(COL_ZERO[0], COL_ZERO[1], COL_ZERO[2]);
    fill('white');
    circle(x, y, 2 * s + 1);
  }
  strokeWeight(1);
}

function fmtComplex(q) {
  if (Math.abs(q[1]) < 1e-9) return fmt(q[0]);
  return fmt(q[0]) + (q[1] < 0 ? ' − j' : ' + j') + Math.abs(q[1]).toFixed(2);
}

// ---------------------------------------------------------------- read-out under the s-plane, z inset

function drawPlaneReadout(sys) {
  const p = L.plane;
  const mapOn = mapCheckbox.checked();
  const T = Number(periodSlider.value());
  const lines = [];
  if (selected >= 0 && selected < items.length) {
    const it = items[selected];
    const rs = itemRoots(it);
    const sym = it.type === 'pole' ? 'p' : 'z';
    const col = it.type === 'pole' ? COL_POLE : COL_ZERO;
    let kind = it.type, val;
    if (it.kind === 'real') {
      val = sym + ' = ' + fmt(rs[0][0]);
    } else if (rs[0][1] !== 0) {
      kind += ' pair';
      val = sym + ' = ' + fmt(rs[0][0]) + ' ± j' + rs[0][1].toFixed(2);
    } else if (Math.abs(rs[0][0] - rs[1][0]) < 1e-9) {
      kind += ' (double)';
      val = sym + ' = ' + fmt(rs[0][0]) + ' (twice)';
    } else {
      kind += ' pair (real)';
      val = sym + ' = ' + fmt(rs[0][0]) + ' and ' + fmt(rs[1][0]);
    }
    lines.push({ t: 'Selected: ' + kind, col: col, bold: true });
    lines.push({ t: val, col: [0, 0, 0] });
    const zw = pairZetaWn(it);
    if (zw) lines.push({ t: 'ζ = ' + fmt(zw.zeta) + ', ω_n = ' + zw.wn.toFixed(2) + ' rad/s', col: [0, 0, 0] });
    else if (it.kind === 'real' && it.type === 'pole' && it.r < 0) lines.push({ t: 'τ = 1/|p| = ' + (-1 / it.r).toFixed(2) + ' s', col: [0, 0, 0] });
    else if (it.kind === 'real' && it.type === 'pole' && it.r > 0) lines.push({ t: 'mode e^(' + it.r.toFixed(2) + 't) grows', col: [0, 0, 0] });
    else if (it.kind === 'real' && it.type === 'pole') lines.push({ t: 'pole at s = 0: integrator', col: [0, 0, 0] });
    if (mapOn) {
      const q = rs[0];
      const zr = Math.exp(q[0] * T), za = q[1] * T;
      lines.push({ t: 'Mapped by z = e^(sT):', col: [0, 0, 0], bold: true });
      if (rs.length === 2 && rs[0][1] === 0 && Math.abs(rs[0][0] - rs[1][0]) > 1e-9) {
        lines.push({ t: 'z = ' + zr.toFixed(3) + ' and ' + Math.exp(rs[1][0] * T).toFixed(3), col: [0, 0, 0] });
      } else {
        lines.push({ t: '|z| = e^(σT) = ' + zr.toFixed(3), col: [0, 0, 0] });
        if (q[1] === 0) {
          lines.push({ t: '∠z = 0° (real axis)', col: [0, 0, 0] });
        } else {
          const aliased = za > Math.PI;
          const wrapped = (((za + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
          lines.push(aliased ? { t: '∠z = ±' + Math.abs(wrapped * 180 / Math.PI).toFixed(1) + '° (aliased)', col: [178, 34, 34] }
                             : { t: '∠z = ωT = ±' + (za * 180 / Math.PI).toFixed(1) + '°', col: [0, 0, 0] });
        }
      }
    }
  } else {
    lines.push({ t: 'Nothing selected', col: [105, 105, 105], bold: true });
    lines.push({ t: 'Click a pole or zero', col: [105, 105, 105] });
  }

  // z inset geometry
  let inset = null, tx = p.x, ty = p.y + p.h + 10, maxW = p.w;
  const lh = L.narrow ? 14 : 16;
  if (mapOn) {
    if (L.narrow) {
      const zs = Math.min(p.w, 140);
      inset = { x: p.x, y: ty + lines.length * lh + 8, w: zs, h: zs };
      if (inset.y + zs > drawHeight - 4) inset.y = drawHeight - 4 - zs;
    } else {
      const zs = 104;
      inset = { x: p.x + p.w - zs, y: p.y + p.h + 8, w: zs, h: zs };
      maxW = p.w - zs - 8;
    }
  }
  noStroke();
  lines.forEach((ln, i) => {
    fill(ln.col[0], ln.col[1], ln.col[2]);
    if (ln.bold) textStyle(BOLD);
    fitText([ln.t], tx, ty + i * lh + lh / 2, maxW, L.fs, LEFT);
    textStyle(NORMAL);
  });
  if (inset) drawZInset(inset, sys, T);
  // hint in the free space under the read-out (wide screens, map off)
  if (!mapOn && !L.narrow && ty + lines.length * lh < drawHeight - 44) {
    fill(110);
    fitText(['Drag the gold marker, or hover over a', 'Drag the gold marker'], tx, drawHeight - 30, p.w, 12, LEFT);
    fitText(['frequency plot, to move s = jω.', ''], tx, drawHeight - 15, p.w, 12, LEFT);
  }
}

function drawZInset(r, sys, T) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, R = r.w * 0.34;   // unit circle radius in px
  const rMax = (r.w / 2 - 6) / R;                                 // largest |z| that fits
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(r.x, r.y, r.w, r.h);
  stroke(200);
  line(r.x, cy, r.x + r.w, cy);
  line(cx, r.y, cx, r.y + r.h);
  fill(46, 139, 87, 30);
  stroke(46, 139, 87);
  strokeWeight(1.5);
  circle(cx, cy, 2 * R);
  strokeWeight(1);
  noStroke();
  fill(80);
  textSize(10);
  textAlign(LEFT, BOTTOM);
  text('z-plane', r.x + 3, r.y + r.h - 2);
  textAlign(LEFT, TOP);
  text('1', cx + R + 2, cy + 1);

  const zPoint = (q) => {
    let mag = Math.exp(q[0] * T);
    const ang = q[1] * T;
    const out = mag > rMax;
    if (out) mag = rMax;
    return { x: cx + mag * R * Math.cos(ang), y: cy - mag * R * Math.sin(ang), out: out };
  };
  // marker e^(j omega0 T) on the unit circle
  const mk = zPoint([0, omega0]);
  fill(COL_MARK[0], COL_MARK[1], COL_MARK[2]);
  noStroke();
  circle(mk.x, mk.y, 8);
  for (const q of sys.zs) { const z = zPoint(q); drawRootGlyph('zero', z.x, z.y, 4); }
  for (const q of sys.ps) { const z = zPoint(q); drawRootGlyph('pole', z.x, z.y, 4); }
}

// ---------------------------------------------------------------- frequency plots

function freqFrame(p, yMin, yMax, ticks, showW) {
  const X = w => p.x + w / W_MAX * p.w;
  const Y = v => p.y + p.h - (constrain(v, yMin, yMax) - yMin) / (yMax - yMin) * p.h;
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(L.narrow ? 10 : 12);
  for (const tk of ticks) {
    stroke(225);
    line(p.x, Y(tk[0]), p.x + p.w, Y(tk[0]));
    noStroke();
    fill(40);
    textAlign(RIGHT, CENTER);
    text(tk[1], p.x - 4, Y(tk[0]));
  }
  for (let w = 0; w <= W_MAX; w++) {
    stroke(225);
    line(X(w), p.y, X(w), p.y + p.h);
    if (showW) {
      noStroke();
      fill(40);
      textAlign(w === 0 ? LEFT : (w === W_MAX ? RIGHT : CENTER), TOP);
      text(w, X(w), p.y + p.h + 3);
    }
  }
  // marker frequency
  stroke(COL_MARK[0], COL_MARK[1], COL_MARK[2]);
  strokeWeight(1.5);
  drawingContext.setLineDash([4, 3]);
  line(X(omega0), p.y, X(omega0), p.y + p.h);
  drawingContext.setLineDash([]);
  strokeWeight(1);
  return { X: X, Y: Y };
}

function caption(p, left, col, right, rightCol) {
  noStroke();
  textSize(L.fs);
  fill(col[0], col[1], col[2]);
  textStyle(BOLD);
  const lw = richText(left, p.x, p.y - 11, L.fs, LEFT);
  textStyle(NORMAL);
  if (right) {
    const rc = rightCol || [0, 0, 0];
    fill(rc[0], rc[1], rc[2]);
    if (Array.isArray(right)) fitText(right, p.x + p.w, p.y - 11, p.w - lw - 12, L.fs, RIGHT);
    else fitText([right], p.x + p.w, p.y - 11, p.w - lw - 12, L.fs, RIGHT);
  }
}

function drawMagnitude(p, sys) {
  const db = Array.from(sys.mag, v => 20 * Math.log10(Math.max(v, 1e-12)));
  let peak = -Infinity;
  for (const v of db) peak = Math.max(peak, v);
  const sorted = db.slice().sort((a, b) => a - b);
  const p90 = sorted[Math.floor(0.9 * (sorted.length - 1))];
  const top = constrain(10 * Math.ceil((Math.min(peak, p90 + 20) + 0.5) / 10), -20, 60);
  const ticks = [0, 10, 20, 30, 40, 50].map(d => [top - d, fmtInt(top - d)]);
  const s = freqFrame(p, top - 50, top, ticks, false);
  const valid = sys.stab.state === 'stable';
  clipRect(p);
  stroke(valid ? color(COL_MAG[0], COL_MAG[1], COL_MAG[2]) : color(140));
  strokeWeight(2.2);
  noFill();
  if (!valid) drawingContext.setLineDash([5, 4]);
  beginShape();
  for (let i = 0; i <= N_FREQ; i++) vertex(s.X(W_MAX * i / N_FREQ), s.Y(db[i]));
  endShape();
  drawingContext.setLineDash([]);
  const r = responseAt(omega0, sys);
  const d0 = 20 * Math.log10(Math.max(r.mag, 1e-12));
  noStroke();
  fill(COL_MARK[0], COL_MARK[1], COL_MARK[2]);
  circle(s.X(omega0), s.Y(d0), 8);
  unclip();
  const magTxt = r.mag >= 1e4 ? r.mag.toExponential(1) : r.mag.toFixed(3);
  const dbTxt = r.mag < 1e-9 ? '−∞ dB' : (r.mag > 1e9 ? '+∞ dB' : fmt(d0, 1) + ' dB');
  const title = valid ? (L.narrow ? '|H(jω)| dB' : 'Magnitude |H(jω)| (dB)')
                      : (L.narrow ? '|H| (formula)' : '|H(jω)| (dB): formula only, not stable');
  caption(p, title, valid ? COL_MAG : [105, 105, 105],
          ['at ω = ' + omega0.toFixed(2) + ' rad/s:  |H| = ' + magTxt + '  (' + dbTxt + ')',
           '|H| = ' + magTxt + ' (' + dbTxt + ')', '|H| = ' + magTxt],
          COL_MARK_TEXT);
}

function drawPhase(p, sys) {
  let lo = Infinity, hi = -Infinity;
  for (const v of sys.phase) { if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  lo = 90 * Math.floor(lo / 90 + 1e-6);
  hi = 90 * Math.ceil(hi / 90 - 1e-6);
  if (hi - lo < 180) { lo = 90 * Math.floor(((hi + lo) / 2 - 90) / 90 + 1e-6); hi = lo + 180; }
  const stepT = (hi - lo) > 360 ? 180 : 90;
  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += stepT) ticks.push([v, fmtInt(v) + '°']);
  const s = freqFrame(p, lo - 0.04 * (hi - lo), hi + 0.04 * (hi - lo), ticks, true);
  const valid = sys.stab.state === 'stable';
  clipRect(p);
  stroke(valid ? color(COL_PHASE[0], COL_PHASE[1], COL_PHASE[2]) : color(140));
  strokeWeight(2.2);
  noFill();
  if (!valid) drawingContext.setLineDash([5, 4]);
  // break the curve where the phase jumps (a root exactly on the jw axis)
  beginShape();
  for (let i = 0; i <= N_FREQ; i++) {
    if (i > 0 && Math.abs(sys.phase[i] - sys.phase[i - 1]) > 90) { endShape(); beginShape(); }
    vertex(s.X(W_MAX * i / N_FREQ), s.Y(sys.phase[i]));
  }
  endShape();
  drawingContext.setLineDash([]);
  const r = responseAt(omega0, sys);
  const ph = r.phase * 180 / Math.PI;
  noStroke();
  fill(COL_MARK[0], COL_MARK[1], COL_MARK[2]);
  circle(s.X(omega0), s.Y(ph), 8);
  unclip();
  caption(p, L.narrow ? '∠H(jω)' : 'Phase ∠H(jω)', valid ? COL_PHASE : [105, 105, 105],
          [(r.mag < 1e-9 || r.mag > 1e9) ? '∠H undefined at a root' : '∠H = ' + fmt(ph, 1) + '°', '∠H undefined'], COL_MARK_TEXT);
  noStroke();
  fill(40);
  textSize(L.narrow ? 10 : 12);
  textAlign(RIGHT, TOP);
  text('ω (rad/s)', p.x + p.w, p.y + p.h + 17);
}

// ---------------------------------------------------------------- step response

function niceStep(x) {
  if (!(x > 0)) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(x)));
  for (const k of [1, 2, 5, 10]) if (x <= k * e * 1.0000001) return k * e;
  return 10 * e;
}

function fmtTick(v) {
  if (Math.abs(v) < 1e-12) return '0';
  const a = Math.abs(v);
  const s = a >= 10000 || a < 0.01 ? a.toExponential(0).replace('+', '') : String(parseFloat(a.toPrecision(3)));
  return (v < 0 ? '−' : '') + s;
}

function drawStep(p, sys) {
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  const tMax = sys.tMax;
  const X = t => p.x + t / tMax * p.w;
  const M = sys.metrics;

  caption(p, L.narrow ? 'Step response y(t)' : 'Unit-step response y(t)', COL_STEP,
          L.narrow ? null : (sys.diverged ? 'grows without bound (plot stops at 10⁹)' : ''), [178, 34, 34]);

  if (sys.improper) {
    noStroke();
    fill(178, 34, 34);
    fitText(['Improper H(s): more zeros than poles, so the step response contains impulses.',
             'Improper: more zeros than poles'], p.x + p.w / 2, p.y + p.h / 2, p.w - 10, L.fs, CENTER);
    return;
  }

  // y range from the data, the final value and zero
  const y = sys.y;
  let lo = 0, hi = 0;
  for (const v of y) if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  if (M.final !== null && M.final !== undefined) { lo = Math.min(lo, M.final); hi = Math.max(hi, M.final); }
  if (hi - lo < 1e-9) hi = lo + 1;
  const span0 = hi - lo;
  hi += 0.04 * span0;
  if (lo < 0) lo -= 0.04 * span0;
  const st = niceStep((hi - lo) / 4);
  lo = Math.floor(lo / st + 1e-9) * st;
  hi = Math.ceil(hi / st - 1e-9) * st;
  const Y = v => p.y + p.h - 3 - (v - lo) / (hi - lo) * (p.h - 6);

  textSize(L.narrow ? 10 : 12);
  for (let v = lo; v <= hi + 1e-9 * st; v += st) {
    stroke(Math.abs(v) < 1e-9 * st ? 150 : 225);
    line(p.x, Y(v), p.x + p.w, Y(v));
    noStroke();
    fill(40);
    textAlign(RIGHT, CENTER);
    text(fmtTick(v), p.x - 4, Y(v));
  }
  const tStep = tMax / 5;
  for (let t = 0; t <= tMax + 1e-9; t += tStep) {
    stroke(225);
    line(X(t), p.y, X(t), p.y + p.h);
    noStroke();
    fill(40);
    textAlign(t === 0 ? LEFT : (t > tMax - 1e-9 ? RIGHT : CENTER), TOP);
    text(fmtTick(t), X(t), p.y + p.h + 3);
  }
  textAlign(RIGHT, TOP);
  if (!L.narrow) text('t (s)', p.x + p.w, p.y + p.h + 17);

  clipRect(p);
  // final value
  if (M.final !== null && M.final !== undefined) {
    stroke(110);
    strokeWeight(1.2);
    drawingContext.setLineDash([6, 4]);
    line(p.x, Y(M.final), p.x + p.w, Y(M.final));
    drawingContext.setLineDash([]);
  }
  // response
  stroke(COL_STEP[0], COL_STEP[1], COL_STEP[2]);
  strokeWeight(2.2);
  noFill();
  const stride = Math.max(1, Math.floor(N_STEP / (2 * p.w)));
  beginShape();
  for (let i = 0; i <= N_STEP; i += stride) {
    if (!isFinite(y[i])) break;
    vertex(X(i * tMax / N_STEP), Y(y[i]));
  }
  endShape();
  // peak marker (overshoot) and time constant marker
  noStroke();
  if (M.overshoot > 0.05) {
    fill(COL_MARK[0], COL_MARK[1], COL_MARK[2]);
    const yp = M.final > 0 ? M.yMax : M.yMin;
    circle(X(M.tOvershootPeak), Y(yp), 9);
  }
  if (M.tau !== undefined && M.tau <= tMax) {
    fill(COL_MARK[0], COL_MARK[1], COL_MARK[2]);
    circle(X(M.tau), Y(M.yTau), 9);
  }
  unclip();
}

function drawStepReadout(sys) {
  const p = L.step;
  const M = sys.metrics;
  const x = p.x, w = p.w;
  const y1 = p.y + p.h + 40, y2 = y1 + 20;
  noStroke();
  fill(30);
  const fs = L.narrow ? 11 : 14;
  if (sys.improper) return;
  if (sys.stab.state !== 'stable') {
    fill(178, 34, 34);
    const yEnd = sys.diverged ? 'exceeds 10⁹' : 'y(' + sys.tMax + ' s) = ' + fmtTick(M.yEnd);
    fitText(['Not stable: the step response does not settle (' + yEnd + ').', 'Does not settle'], x, y1, w, fs, LEFT);
    if (sys.stab.state === 'marginal' && items.length === 1 && items[0].kind === 'real') {
      fill(30);
      fitText(['A pole at s = 0 integrates the step: y(t) is a ramp of slope K = ' + fmt(sys.K) + '.',
               'Integrator: y(t) is a ramp'], x, y2, w, fs, LEFT);
    } else if (sys.stab.state === 'marginal') {
      fill(30);
      fitText(['Poles on the jω axis: the oscillation in y(t) never decays.',
               'Oscillation never decays'], x, y2, w, fs, LEFT);
    }
    return;
  }
  if (M.final === null || Math.abs(M.final) < 1e-9) {
    fitText(['Final value 0 (a zero at s = 0 blocks DC); peak y = ' + fmtTick(M.yMax) + ' at t = ' + M.tPeak.toFixed(2) + ' s',
             'Final value 0; peak ' + fmtTick(M.yMax)], x, y1, w, fs, LEFT);
    return;
  }
  let line1;
  if (M.formulaOS !== undefined) {
    line1 = ['Overshoot ' + M.overshoot.toFixed(1) + ' % at t = ' + M.tOvershootPeak.toFixed(2) + ' s;  formula e^(−πζ/√(1−ζ²)) = ' + M.formulaOS.toFixed(1) + ' %, t_p = π/ω_d = ' + M.formulaTp.toFixed(2) + ' s',
             'Overshoot ' + M.overshoot.toFixed(1) + ' % (formula ' + M.formulaOS.toFixed(1) + ' %) at t = ' + M.tOvershootPeak.toFixed(2) + ' s',
             'Overshoot ' + M.overshoot.toFixed(1) + ' %'];
  } else if (M.tau !== undefined) {
    line1 = ['Time constant τ = ' + M.tau.toFixed(2) + ' s:  y(τ) = ' + M.yTau.toFixed(3) + '  (1 − e⁻¹ = 0.632 of the final value)',
             'τ = ' + M.tau.toFixed(2) + ' s, y(τ) = ' + M.yTau.toFixed(3), 'τ = ' + M.tau.toFixed(2) + ' s'];
  } else if (M.undershoot > 0.005) {
    line1 = ['Undershoot: y(t) first moves the wrong way, to ' + fmt(M.final > 0 ? M.yMin : M.yMax) + ' at t = ' + (M.final > 0 ? M.tMin : M.tPeak).toFixed(2) + ' s;  overshoot ' + M.overshoot.toFixed(1) + ' %',
             'Undershoot to ' + fmt(M.final > 0 ? M.yMin : M.yMax) + '; overshoot ' + M.overshoot.toFixed(1) + ' %',
             'Undershoot ' + fmt(M.final > 0 ? M.yMin : M.yMax)];
  } else {
    line1 = ['Overshoot ' + M.overshoot.toFixed(1) + ' %' + (M.overshoot > 0.05 ? ' at t = ' + M.tOvershootPeak.toFixed(2) + ' s' : ' (no overshoot)'),
             'Overshoot ' + M.overshoot.toFixed(1) + ' %'];
  }
  fitText(line1, x, y1, w, fs, LEFT);
  const ts = M.settle === null ? '> ' + sys.tMax + ' s' : M.settle.toFixed(2) + ' s';
  fitText(['Final value H(0) = ' + fmt(M.final) + ' (dashed);  2 % settling time ' + ts,
           'Final ' + fmt(M.final) + '; 2 % settling ' + ts, 'Final ' + fmt(M.final)], x, y2, w, fs, LEFT);
}

// ---------------------------------------------------------------- controls

function rowY(i) { return drawHeight + 18 + 34 * i; }

function updateControlStates() {
  const zw = selectedPolePair();
  setEnabled(zetaSlider, !!zw);
  setEnabled(wnSlider, !!zw);
  setEnabled(removeButton, selected >= 0 && selected < items.length);
  setEnabled(addPoleButton, canAdd('pole'));
  setEnabled(addZeroButton, canAdd('zero'));
  setEnabled(periodSlider, mapCheckbox.checked());
}

function setEnabled(el, on) {
  const has = el.elt.hasAttribute('disabled');
  if (on && has) el.removeAttribute('disabled');
  if (!on && !has) el.attribute('disabled', '');
}

function drawControlLabels() {
  const narrow = L.narrow;
  const fs = narrow ? 13 : defaultTextSize;
  const zw = selectedPolePair();
  noStroke();
  fill(zw ? 0 : 140);
  const z = zw ? fmt(zw.zeta) : '—', wn = zw ? zw.wn.toFixed(2) : '—';
  richText(narrow ? 'ζ = ' + z : 'Damping ζ = ' + z, 10, rowY(1), fs, LEFT);
  richText(narrow ? 'ω_n = ' + wn : 'Natural freq. ω_n = ' + wn + ' rad/s', 10, rowY(2), fs, LEFT);
  fill(0);
  richText(narrow ? 'ω = ' + omega0.toFixed(2) : 'Marker s = jω:  ω = ' + omega0.toFixed(2) + ' rad/s', 10, rowY(3), fs, LEFT);
  fill(mapCheckbox.checked() ? 0 : 140);
  const tx = 10 + mapCheckbox.elt.offsetWidth + 10;
  richText('T = ' + Number(periodSlider.value()).toFixed(2) + ' s', tx, rowY(4), fs, LEFT);
}

// Place the controls; labels and widths change below 600 px
function positionControls(force) {
  if (typeof periodSlider === 'undefined') return;
  const narrow = canvasWidth < 600;
  if (narrow !== layoutNarrow || force) {
    layoutNarrow = narrow;
    addPoleButton.html(narrow ? '+Pole' : 'Add pole');
    addZeroButton.html(narrow ? '+Zero' : 'Add zero');
    removeButton.html(narrow ? 'Del' : 'Remove');
    setCheckboxLabel(pairCheckbox, narrow ? 'pair' : 'as conjugate pair');
    setCheckboxLabel(mapCheckbox, narrow ? 'z-map' : 'Map to z-plane');
    pairCheckbox.style('font-size', narrow ? '13px' : '15px');
    mapCheckbox.style('font-size', narrow ? '13px' : '16px');
    presetSelect.style('font-size', narrow ? '12px' : '14px');
  }
  sliderLeftMargin = narrow ? 140 : 262;
  const selW = narrow ? 118 : 236;
  presetSelect.position(10, rowY(0) - 11);
  presetSelect.style('width', selW + 'px');
  const widths = narrow ? [48, 48, 36] : [84, 84, 76];
  let bx = 10 + selW + (narrow ? 6 : 12);
  [addPoleButton, addZeroButton, removeButton].forEach((b, i) => {
    b.position(bx, rowY(0) - 11);
    b.style('width', widths[i] + 'px');
    bx += widths[i] + (narrow ? 4 : 6);
  });
  pairCheckbox.position(bx + (narrow ? 2 : 8), rowY(0) - 10);
  const sw = Math.max(60, canvasWidth - sliderLeftMargin - margin);
  zetaSlider.position(sliderLeftMargin, rowY(1) - 10);
  zetaSlider.size(sw);
  wnSlider.position(sliderLeftMargin, rowY(2) - 10);
  wnSlider.size(sw);
  omegaSlider.position(sliderLeftMargin, rowY(3) - 10);
  omegaSlider.size(sw);
  mapCheckbox.position(10, rowY(4) - 10);
  periodSlider.position(sliderLeftMargin, rowY(4) - 10);
  periodSlider.size(sw);
}

// p5 checkboxes wrap the box and its label text; replace only the text
function setCheckboxLabel(cb, label) {
  const el = cb.elt;
  const span = el.querySelector('span');
  if (span) { span.textContent = label; return; }
  const lab = el.tagName === 'LABEL' ? el : el.querySelector('label');
  if (!lab) return;
  for (const n of lab.childNodes) {
    if (n.nodeType === 3 && n.textContent.trim()) { n.textContent = label; return; }
  }
}

// ---------------------------------------------------------------- mouse

function rootUnderMouse() {
  const p = L.plane;
  if (!p) return null;
  const m = planeMap(p);
  let best = null, bestD = 13;
  items.forEach((it, i) => {
    itemRoots(it).forEach((q, k) => {
      if (q[0] < SIG_MIN || q[0] > SIG_MAX || Math.abs(q[1]) > OM_MAX) return;
      const d = dist(mouseX, mouseY, m.X(q[0]), m.Y(q[1]));
      if (d < bestD) { bestD = d; best = { i: i, k: k }; }
    });
  });
  return best;
}

function insidePlane(x, y) {
  const p = L.plane;
  return p && x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;
}

function mousePressed() {
  if (!insidePlane(mouseX, mouseY)) return;
  const m = planeMap(L.plane);
  const hit = rootUnderMouse();
  if (hit) {
    selectItem(hit.i);
    const it = items[hit.i];
    drag = { kind: 'root', i: hit.i, wasReal: false, other: 0 };
    if (it.kind === 'pair') {
      const rs = itemRoots(it);
      drag.wasReal = rs[0][1] === 0;
      drag.other = rs[1 - hit.k][0];
    }
    return;
  }
  // grab the marker, or click on the upper jw axis to move it there
  const mx = m.X(0), my = m.Y(omega0);
  if (dist(mouseX, mouseY, mx, my) < 13 || (Math.abs(mouseX - mx) < 8 && m.W(mouseY) >= -0.1)) {
    drag = { kind: 'marker' };
    moveMarker(m.W(mouseY));
  }
}

function moveMarker(w) {
  omega0 = constrain(Math.round(w * 100) / 100, 0, W_MAX);
  omegaSlider.value(omega0);
}

function mouseDragged() {
  if (!drag) return;
  const m = planeMap(L.plane);
  if (drag.kind === 'marker') { moveMarker(m.W(mouseY)); return false; }
  const it = items[drag.i];
  if (!it) return;
  let s = constrain(Math.round(m.S(mouseX) / GRID) * GRID, SIG_MIN, SIG_MAX);
  let w = constrain(Math.round(m.W(mouseY) / GRID) * GRID, -OM_MAX, OM_MAX);
  if (Math.abs(s) < SNAP) s = 0;
  if (Math.abs(w) < SNAP) w = 0;
  s = Math.round(s * 100) / 100;
  w = Math.round(w * 100) / 100;
  if (it.kind === 'real') {
    it.r = s;
  } else if (w !== 0) {
    it.c1 = -2 * s;                  // complex pair s +/- jw: s^2 - 2 sigma s + sigma^2 + w^2
    it.c0 = s * s + w * w;
    drag.wasReal = false;
  } else if (drag.wasReal) {
    it.c1 = -(s + drag.other);       // move one real root, keep the other
    it.c0 = s * drag.other;
  } else {
    it.c1 = -2 * s;                  // a complex pair that reaches the real axis becomes a double root
    it.c0 = s * s;
  }
  syncSliders();
  return false;
}

function mouseReleased() { drag = null; }

// ---------------------------------------------------------------- text helpers

// Rich text: "ω_n" draws the character after '_' as a subscript
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

// advance width: in p5 2.x textWidth() ignores spaces, so pieces placed side by side use fontWidth()
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

// number with a true minus sign and no "-0.00"; plus = true writes "+" for positive values
function fmt(v, d = 2, plus = false) {
  const r = Number(v.toFixed(d));
  return (r < 0 ? '−' : (plus && r > 0 ? '+' : '')) + Math.abs(r).toFixed(d);
}
function fmtInt(v) { return (v < 0 ? '−' : '') + Math.abs(v); }

// ---------------------------------------------------------------- responsive layout

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  positionControls(false);
}
