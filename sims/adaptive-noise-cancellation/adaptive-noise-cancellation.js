// Adaptive Noise and Echo Cancellation MicroSim
// CANVAS_HEIGHT: 680
// One NLMS adaptive filter, three classic jobs: (1) noise cancellation with a reference
// input, (2) acoustic echo cancellation with a near-end talker (double-talk) and an optional
// adaptation freeze, (3) channel equalization of a +/-1 training sequence with eye diagrams.
// Every scenario shows a convergence curve; the first two also compare the learned taps with
// the unknown path (system identification). All signals are generated with seeded random
// numbers, so Reset replays exactly the same run.

// Canvas dimensions (drawHeight and controlHeight switch between a wide and a narrow layout)
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
const canvasHeight = 680;
let drawHeight = 555;
let controlHeight = 125;
let margin = 15;
let defaultTextSize = 16;
const WIDE_MIN = 600;                // below this width the plots and the controls use one column

// Controls
let scenarioSelect, runButton, resetButton;
let muSlider, lengthSlider, levelSlider, speedSlider;
let leakCheckbox, nearEndCheckbox, freezeCheckbox, ddCheckbox;

// State
let running = false;                  // MicroSims open paused; the learner presses Run
let scenario = 'nc';
let sim = null;
let params = { scenario: 'nc', mu: 0.05, M: 16, level: 1, leak: false, nearEnd: false, freeze: false, dd: false };
let speed = 8;
let lastLevelEq = -1;
let wide = true;
let optsInline = true;               // option checkboxes share the first control row
let layoutWidth = -1;
let LY = null;                       // drawing layout, rebuilt when the width changes

// Colors
const COL_D = [25, 90, 200];         // primary / microphone signal: blue
const COL_X = [105, 105, 105];       // reference / far-end signal: gray
const COL_E = [30, 140, 70];         // canceller output: green
const COL_REF = [40, 40, 40];        // what the output should be (dashed)
const COL_W = [128, 0, 0];           // adaptive filter (taps, convergence curve): maroon
const COL_H = [175, 175, 175];       // true path: light gray bars
const COL_BAD = [205, 35, 35];       // warnings: red
const COL_GOLD = [184, 134, 11];     // highlight: gold
const COL_NEG = [128, 0, 0];         // symbol -1 dots: maroon (symbol +1 uses blue)

// Per-scenario settings: slider defaults and plot ranges
const SCN = {
  nc: { label: 'Noise cancellation', mu: 0.05, M: 16, level: { min: 0.1, max: 2, step: 0.05, value: 1 }, speed: 8,
        window: 300, conv: [-5, 35], unit: 'samples', tau: 500 },
  ec: { label: 'Echo cancellation', mu: 0.5, M: 32, level: { min: 0.1, max: 1, step: 0.05, value: 0.5 }, speed: 24,
        window: 1200, conv: [-15, 35], unit: 'samples', tau: 800 },
  eq: { label: 'Equalization', mu: 0.1, M: 11, level: { min: 0, max: 0.3, step: 0.01, value: 0.05 }, speed: 4,
        window: 300, conv: [-35, 5], unit: 'symbols', tau: 200 }
};

// ================================================================ engine (no p5 calls)

const MAX_M = 32;                    // longest adaptive filter
const TRACE_LEN = 1200;              // samples kept for the scrolling traces
const EPS = 0.05;                    // NLMS regularisation (keeps updates small during far-end silences)
const BLOCK = 20;                    // one convergence-curve point every BLOCK samples

// Noise cancellation: clean signal s[n] and the unknown noise path P (unit energy, 10 taps)
const NC_PATH = unitEnergy([0.9, 0.6, -0.45, 0.5, -0.3, 0.25, -0.2, 0.12, -0.08, 0.05]);
const LEAK = 0.3;                    // fraction of s[n] that leaks into the reference when enabled
function cleanSignal(n) { return 0.8 * Math.sin(2 * Math.PI * n / 64) + 0.4 * Math.sin(2 * Math.PI * n / 23 + 0.5); }

// Echo cancellation: echo path H = 4-sample delay + 20 decaying taps (unit energy before the echo gain g)
const EC_DELAY = 4;
const EC_PATH = unitEnergy(Array.from({ length: EC_DELAY + 20 }, (_, k) => {
  if (k < EC_DELAY) return 0;
  const j = k - EC_DELAY;
  return Math.pow(0.82, j) * Math.cos(1.3 * j + 0.4) * (1 + 0.3 * Math.sin(2.1 * j));
}));
const MIC_NOISE = 0.005;             // background noise at the microphone (rms)

// Equalization: dispersive channel C (unit energy, main tap at index 1)
const EQ_CHANNEL = unitEnergy([0.4, 0.9, 0.7, -0.4, 0.3]);
const EQ_MAIN = 1;
const ERR_WIN = 500;                 // symbols in the symbol-error-rate window
const EYE_WIN = 300;                 // symbols used for the eye opening

function unitEnergy(h) {
  const e = Math.sqrt(h.reduce((a, v) => a + v * v, 0));
  return h.map(v => v / e);
}

// mulberry32 uniform generator with a Gaussian helper, so Reset replays exactly the same run
function makeRng(seed) {
  let a = seed >>> 0;
  let spare = null;
  const u = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  u.gauss = () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let x, y, r;
    do { x = 2 * u() - 1; y = 2 * u() - 1; r = x * x + y * y; } while (r >= 1 || r === 0);
    const f = Math.sqrt(-2 * Math.log(r) / r);
    spare = y * f;
    return x * f;
  };
  return u;
}

// Speech-like talker: raised-cosine bursts ("syllables") of three harmonics of a random pitch
// plus a little broadband breath noise, separated by short silences
function makeTalker(seed, minPeriod, maxPeriod, amp) {
  const rng = makeRng(seed);
  const t = { left: 0, len: 1, inBurst: false, f0: 0.02, ph: 0, wts: [1, 0.6, 0.35], active: false };
  t.next = () => {
    if (t.left <= 0) {
      t.inBurst = !t.inBurst;
      t.len = t.inBurst ? 260 + Math.floor(rng() * 420) : 60 + Math.floor(rng() * 180);
      t.left = t.len;
      if (t.inBurst) {
        t.f0 = 1 / (minPeriod + rng() * (maxPeriod - minPeriod));
        t.wts = [1, 0.3 + 0.5 * rng(), 0.2 + 0.4 * rng()];
      }
    }
    const p = t.len - t.left;
    t.left--;
    t.active = t.inBurst;
    if (!t.inBurst) return 0;
    const env = Math.pow(Math.sin(Math.PI * (p + 0.5) / t.len), 2);
    t.ph += t.f0;
    let v = 0;
    for (let k = 0; k < 3; k++) v += t.wts[k] * Math.sin(2 * Math.PI * (k + 1) * t.ph + k);
    return amp * env * (0.75 * v + 0.35 * rng.gauss());
  };
  return t;
}

// Wiener (minimum-MSE) equalizer of length M for noise variance s2 and decision delay D.
// Returns the minimum MSE J; used to choose the delay and to draw the optimum on the learning curve.
function wienerMse(M, D, s2) {
  const h = EQ_CHANNEL, L = h.length;
  const rh = k => { let a = 0; for (let i = 0; i + k < L; i++) a += h[i] * h[i + k]; return a; };
  const A = [];
  for (let i = 0; i < M; i++) {
    const row = [];
    for (let j = 0; j < M; j++) row.push(rh(Math.abs(i - j)) + (i === j ? s2 : 0));
    const k = D - i;
    row.push(k >= 0 && k < L ? h[k] : 0);           // cross-correlation p_i = E[r[n-i] a[n-D]]
    A.push(row);
  }
  const p = A.map(r => r[M]);
  for (let c = 0; c < M; c++) {                       // Gauss-Jordan elimination with partial pivoting
    let piv = c;
    for (let r = c + 1; r < M; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    const tmp = A[c]; A[c] = A[piv]; A[piv] = tmp;
    for (let r = 0; r < M; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k <= M; k++) A[r][k] -= f * A[c][k];
    }
  }
  let J = 1;
  for (let i = 0; i < M; i++) J -= p[i] * (A[i][M] / A[i][i]);
  return Math.max(J, 1e-12);
}

function bestDelay(M, s2) {
  let best = { D: 0, J: Infinity };
  for (let D = 0; D < M + EQ_CHANNEL.length - 1; D++) {
    const J = wienerMse(M, D, s2);
    if (J < best.J - 1e-9) best = { D, J };
  }
  return best;
}

// p = { scenario, mu, M, level, leak, nearEnd, freeze, dd }
function newSim(p) {
  const s = {
    scenario: p.scenario, M: p.M, n: 0,
    w: new Float64Array(MAX_M),
    xb: new Float64Array(MAX_M),          // adaptive-filter input delay line x[n], x[n-1], ...
    pb: new Float64Array(MAX_M + 8),      // input delay line of the unknown path / channel (symbols)
    tr: [new Float32Array(TRACE_LEN), new Float32Array(TRACE_LEN), new Float32Array(TRACE_LEN), new Float32Array(TRACE_LEN)],
    sym: [new Int8Array(TRACE_LEN), new Int8Array(TRACE_LEN)],
    head: 0,
    hist: [], flags: [],                  // convergence curve (dB) and option flag, one entry per BLOCK
    pa: 0, pb2: 0, pc: 0, pes: 0, mis: 1, // smoothed powers (meaning depends on the scenario)
    errB: new Uint8Array(ERR_WIN), errA: new Uint8Array(ERR_WIN), nErrB: 0, nErrA: 0, nDec: 0,
    rngA: makeRng(11), rngB: makeRng(23),
    far: makeTalker(101, 25, 60, 0.9), near: makeTalker(202, 20, 45, 0.7),
    doubleTalk: false, frozen: false, D: 0, Jmin: 1
  };
  if (p.scenario === 'eq') {
    const b = bestDelay(p.M, p.level * p.level);
    s.D = b.D;
    s.Jmin = b.J;
    s.w[Math.min(p.M - 1, Math.max(0, b.D - EQ_MAIN))] = 1;   // centre-spike start: output = unequalized channel
  }
  return s;
}

function shiftIn(buf, v) { buf.copyWithin(1, 0, buf.length - 1); buf[0] = v; }

// NLMS on the first M taps: y = w^T x, then w <- w + mu e x / (eps + ||x||^2)
function nlmsOutput(s) {
  let y = 0;
  for (let k = 0; k < s.M; k++) y += s.w[k] * s.xb[k];
  return y;
}
function nlmsUpdate(s, mu, e) {
  let nrm = 0;
  for (let k = 0; k < s.M; k++) nrm += s.xb[k] * s.xb[k];
  const g = mu * e / (EPS + nrm);
  for (let k = 0; k < s.M; k++) s.w[k] += g * s.xb[k];
}

function pushTrace(s, a, b, c, d, symB, symA) {
  const i = s.head;
  s.tr[0][i] = a; s.tr[1][i] = b; s.tr[2][i] = c; s.tr[3][i] = d;
  s.sym[0][i] = symB; s.sym[1][i] = symA;
  s.head = (i + 1) % TRACE_LEN;
}

function stepSim(s, p, nSteps) {
  const tau = SCN[s.scenario].tau;
  for (let it = 0; it < nSteps; it++) {
    const al = s.n < tau ? 1 / (s.n + 1) : 1 / tau;      // running mean at first, then exponential smoothing
    if (s.scenario === 'nc') {
      const noise = p.level * s.rngA.gauss();
      shiftIn(s.pb, noise);
      let n0 = 0;
      for (let k = 0; k < NC_PATH.length; k++) n0 += NC_PATH[k] * s.pb[k];
      const sig = cleanSignal(s.n);
      const d = sig + n0;                                  // primary: signal + noise through the path
      shiftIn(s.xb, noise + (p.leak ? LEAK * sig : 0));    // reference
      const y = nlmsOutput(s);
      const e = d - y;
      nlmsUpdate(s, p.mu, e);
      s.pa += al * (n0 * n0 - s.pa);                       // noise power in the primary
      s.pb2 += al * ((e - sig) * (e - sig) - s.pb2);       // noise (and distortion) left in the output
      s.pc += al * (sig * sig - s.pc);                     // signal power
      s.pes += al * (e * sig - s.pes);                     // for the signal gain E[e s] / E[s^2]
      pushTrace(s, d, s.xb[0], e, sig, 0, 0);
    } else if (s.scenario === 'ec') {
      const xf = s.far.next();
      const nearV = s.near.next();
      shiftIn(s.pb, xf);
      let echo = 0;
      for (let k = 0; k < EC_PATH.length; k++) echo += EC_PATH[k] * s.pb[k];
      echo *= p.level;
      const v = MIC_NOISE * s.rngA.gauss();
      const near = p.nearEnd ? nearV : 0;
      const d = echo + v + near;                           // microphone
      shiftIn(s.xb, xf);
      const y = nlmsOutput(s);
      const e = d - y;
      s.doubleTalk = p.nearEnd && s.near.active;
      s.frozen = p.freeze && s.doubleTalk;                 // ideal double-talk detector
      if (!s.frozen) nlmsUpdate(s, p.mu, e);
      const de = echo + v, ee = echo + v - y;              // echo part of the microphone and output signals
      s.pa += al * (de * de - s.pa);
      s.pb2 += al * (ee * ee - s.pb2);
      pushTrace(s, xf, d, e, near, 0, 0);
    } else {
      const a = s.rngA() < 0.5 ? -1 : 1;
      shiftIn(s.pb, a);                                    // pb[k] = a[n-k]
      let r = p.level * s.rngB.gauss();
      for (let k = 0; k < EQ_CHANNEL.length; k++) r += EQ_CHANNEL[k] * s.pb[k];
      shiftIn(s.xb, r);
      const y = nlmsOutput(s);
      const ready = s.n >= s.D;
      const aD = ready ? s.pb[s.D] : 0;                    // training symbol a[n - D]
      const dec = y >= 0 ? 1 : -1;
      if (ready) {
        nlmsUpdate(s, p.mu, (p.dd ? dec : aD) - y);        // training or decision-directed error
        s.pa += al * ((aD - y) * (aD - y) - s.pa);         // MSE against the true symbol
        const i = s.n % ERR_WIN;
        const eb = ((r >= 0 ? 1 : -1) !== s.pb[EQ_MAIN]) ? 1 : 0;
        const ea = (dec !== aD) ? 1 : 0;
        s.nErrB += eb - s.errB[i]; s.errB[i] = eb;
        s.nErrA += ea - s.errA[i]; s.errA[i] = ea;
        s.nDec = Math.min(ERR_WIN, s.nDec + 1);
      } else {
        s.pa = 1;
      }
      pushTrace(s, r, y, 0, 0, s.pb[EQ_MAIN], aD);
    }
    if (s.scenario !== 'eq') {
      const h = s.scenario === 'nc' ? NC_PATH : EC_PATH;
      const g = s.scenario === 'ec' ? p.level : 1;
      let num = 0;
      for (let k = 0; k < MAX_M; k++) {
        const dk = (k < h.length ? g * h[k] : 0) - (k < s.M ? s.w[k] : 0);
        num += dk * dk;
      }
      s.mis += al * (num / (g * g) - s.mis);             // misalignment ||h - w||^2 / ||h||^2 (smoothed)
    }
    s.n++;
    if (s.n % BLOCK === 0) {
      s.hist.push(metricDb(s));
      s.flags.push(s.scenario === 'nc' ? p.leak : (s.scenario === 'ec' ? p.nearEnd : p.dd));
    }
  }
}

// The quantity drawn on the convergence curve: noise reduction, ERLE, or MSE (all in dB)
function metricDb(s) {
  if (s.scenario === 'eq') return 10 * Math.log10(s.pa + 1e-12);
  return 10 * Math.log10((s.pa + 1e-12) / (s.pb2 + 1e-12));
}

// ================================================================ p5 sketch

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  createControls();
  applyScenario('nc');
  layoutControls(true);

  describe('An NLMS adaptive filter applied to three problems, chosen from a drop-down list: noise cancellation with a reference input, acoustic echo cancellation with a near-end talker, and channel equalization of a plus or minus one training sequence. Scrolling traces or eye-diagram scatter plots show the signals before and after the filter, a stem plot compares the learned taps with the unknown path, and a convergence curve shows noise reduction, ERLE or mean-squared error over time. Sliders set the step size, the filter length, the noise or echo level and the speed.');
}

function createControls() {
  scenarioSelect = createSelect();
  for (const key of Object.keys(SCN)) scenarioSelect.option(SCN[key].label, key);
  scenarioSelect.selected('nc');
  scenarioSelect.style('font-size', '15px');

  runButton = createButton('Run');
  runButton.style('font-size', '15px');
  runButton.mousePressed(toggleRun);

  resetButton = createButton('Reset');
  resetButton.style('font-size', '15px');
  resetButton.mousePressed(resetRun);

  muSlider = createSlider(0.01, 1.5, 0.05, 0.01);
  lengthSlider = createSlider(1, MAX_M, 16, 1);
  levelSlider = createSlider(0.1, 2, 1, 0.05);
  speedSlider = createSlider(1, 50, 8, 1);

  leakCheckbox = createCheckbox('Signal leaks into reference', false);
  nearEndCheckbox = createCheckbox('Near-end talker', false);
  freezeCheckbox = createCheckbox('Freeze during double-talk', false);
  ddCheckbox = createCheckbox('Decision-directed (no training)', false);
  for (const c of [leakCheckbox, nearEndCheckbox, freezeCheckbox, ddCheckbox]) {
    c.style('font-size', '15px');
    c.position(0, canvasHeight);     // absolute positioning, so offsetWidth is the label width
  }
}

// Switch scenario: load its slider defaults, show its options and restart
function applyScenario(key) {
  scenario = key;
  const c = SCN[key];
  muSlider.value(c.mu);
  lengthSlider.value(c.M);
  const el = levelSlider.elt;
  el.min = c.level.min; el.max = c.level.max; el.step = c.level.step; el.value = c.level.value;
  speedSlider.value(c.speed);
  leakCheckbox.checked(false); nearEndCheckbox.checked(false);
  freezeCheckbox.checked(false); ddCheckbox.checked(false);
  layoutControls(true);
  readControls();
  resetRun();
}

function optionBoxes() {
  if (scenario === 'nc') return [leakCheckbox];
  if (scenario === 'ec') return [nearEndCheckbox, freezeCheckbox];
  return [ddCheckbox];
}

function readControls() {
  params.scenario = scenario;
  params.mu = Number(muSlider.value());
  params.M = Math.round(Number(lengthSlider.value()));
  params.level = Number(levelSlider.value());
  params.leak = leakCheckbox.checked();
  params.nearEnd = nearEndCheckbox.checked();
  params.freeze = freezeCheckbox.checked();
  params.dd = ddCheckbox.checked();
  speed = Math.round(Number(speedSlider.value()));
}

function resetRun() {
  readControls();
  sim = newSim(params);
  lastLevelEq = params.level;
}

function toggleRun() {
  running = !running;
  runButton.html(running ? 'Pause' : 'Run');
}

function draw() {
  updateCanvasSize();
  if (scenarioSelect.value() !== scenario && SCN[scenarioSelect.value()]) applyScenario(scenarioSelect.value());
  readControls();
  if (params.M !== sim.M) resetRun();                    // a new filter length restarts the run
  if (scenario === 'eq' && params.level !== lastLevelEq) {
    sim.Jmin = wienerMse(sim.M, sim.D, params.level * params.level);   // optimum for the new noise level
    lastLevelEq = params.level;
  }
  if (running) stepSim(sim, params, speed);

  // drawing region and control region
  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  drawHeader();
  if (scenario === 'eq') drawEqualizerPanels(); else drawCancellerPanels();
  drawConvergence();
  drawReadouts();
  drawControlLabels();
}

// ---------------------------------------------------------------- layout

function computeLayout() {
  const W = canvasWidth;
  const ly = { W };
  if (wide) {
    ly.titleY = 18; ly.formulaY = 42; ly.titleSize = 20;
    ly.top = 62; ly.bottom = drawHeight - 82;
    ly.leftX0 = 52; ly.leftX1 = Math.round(W * 0.58);
    ly.rightX0 = ly.leftX1 + 62; ly.rightX1 = W - 16;
    const span = ly.bottom - ly.top;
    ly.tapsY0 = ly.top + 18; ly.tapsY1 = ly.top + Math.round(span * (scenario === 'eq' ? 0.5 : 0.36));
    ly.convY0 = ly.tapsY1 + 46; ly.convY1 = ly.bottom;
    ly.readY = [drawHeight - 47, drawHeight - 21];
  } else {
    ly.titleY = 14; ly.formulaY = 34; ly.titleSize = 17;
    ly.top = 48; ly.bottom = drawHeight - 200;
    ly.leftX0 = 40; ly.leftX1 = W - 10;
    const half = Math.round(W / 2);
    ly.rightX0 = 40; ly.rightX1 = half - 12;          // taps panel (left half below the strips)
    ly.convX0 = half + 34; ly.convX1 = W - 10;        // convergence panel (right half)
    ly.tapsY0 = drawHeight - 168; ly.tapsY1 = drawHeight - 70;
    ly.convY0 = ly.tapsY0; ly.convY1 = ly.tapsY1;
    ly.readY = [drawHeight - 34, drawHeight - 13];
  }
  if (wide) { ly.convX0 = ly.rightX0; ly.convX1 = ly.rightX1; }
  // strips: three for the cancellers, two (taller) for the equalizer
  ly.strips = n => {
    const out = [];
    const gap = wide ? 24 : 20;
    const h = (ly.bottom - ly.top - gap * (n - 1) - 18 * n) / n;
    let y = ly.top;
    for (let i = 0; i < n; i++) {
      out.push({ x0: ly.leftX0, x1: ly.leftX1, y0: y + 18, y1: y + 18 + h });
      y += 18 + h + gap;
    }
    return out;
  };
  return ly;
}

// Control rows. Wide: [select, Pause, Reset, options] then two columns of sliders; the options
// get their own row when they do not fit next to the buttons. Narrow: one control per row.
function rowY(i) { return wide ? drawHeight + 21 + 38 * i : drawHeight + 18 + 34 * i; }
function sliderRow(i) { return wide ? (optsInline ? 1 : 2) + i : 2 + i; }   // row of slider pair / slider i
function labelWidth() { return canvasWidth >= 760 ? 182 : 152; }

function layoutControls(force) {
  if (typeof scenarioSelect === 'undefined') {
    controlHeight = wide ? 125 : 212;
    drawHeight = canvasHeight - controlHeight;
    return;
  }
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  const W = canvasWidth;
  const bw = wide ? 72 : 62;

  // measure the option checkboxes of this scenario and decide whether they fit on the first row
  for (const c of [leakCheckbox, nearEndCheckbox, freezeCheckbox, ddCheckbox]) c.hide();
  const boxes = optionBoxes();
  boxes.forEach(c => c.show());
  const selW = scenarioSelect.elt.offsetWidth || 160;
  const firstOpt = 10 + selW + 10 + bw + 8 + bw + 26;
  const optW = boxes.reduce((a, c) => a + (c.elt.offsetWidth || 150) + 16, 0);
  optsInline = wide && firstOpt + optW <= W;
  controlHeight = wide ? (optsInline ? 125 : 160) : 212;
  drawHeight = canvasHeight - controlHeight;

  scenarioSelect.position(10, rowY(0) - 12);
  runButton.position(10 + selW + 10, rowY(0) - 13);
  runButton.style('width', bw + 'px');
  resetButton.position(10 + selW + 10 + bw + 8, rowY(0) - 13);
  resetButton.style('width', bw + 'px');

  let ox = optsInline ? firstOpt : 10;
  const oy = (optsInline ? rowY(0) : rowY(1)) - 11;
  for (const c of boxes) {
    c.position(ox, oy);
    ox += (c.elt.offsetWidth || 150) + 16;
  }

  if (wide) {
    const colW = (W - 20) / 2;
    const lab = labelWidth();
    const sw = Math.max(60, colW - lab - 16);
    const r1 = rowY(sliderRow(0)), r2 = rowY(sliderRow(1));
    muSlider.position(10 + lab, r1 - 10); muSlider.size(sw);
    lengthSlider.position(10 + colW + lab, r1 - 10); lengthSlider.size(sw);
    levelSlider.position(10 + lab, r2 - 10); levelSlider.size(sw);
    speedSlider.position(10 + colW + lab, r2 - 10); speedSlider.size(sw);
  } else {
    const left = 162;
    const sw = Math.max(60, W - left - 12);
    [muSlider, lengthSlider, levelSlider, speedSlider].forEach((sl, i) => {
      sl.position(left, rowY(sliderRow(i)) - 10);
      sl.size(sw);
    });
  }
}

// ---------------------------------------------------------------- header and labels

function drawHeader() {
  // run status and sample counter
  noStroke();
  fill(running ? 'green' : COL_BAD);
  textSize(14);
  textAlign(RIGHT, CENTER);
  const counter = (running ? '● ' : '❚❚ ') + 'n = ' + sim.n + (!running && sim.n === 0 ? '  (press Run)' : '');
  text(counter, canvasWidth - 10, LY.titleY);
  const cw = advW(counter) + 24;

  // title: centred when it clears the counter, otherwise left-aligned
  fill('black');
  textStyle(BOLD);
  const full = 'Adaptive Noise and Echo Cancellation: ' + SCN[scenario].label;
  if (wide && richWidth(full, LY.titleSize) <= canvasWidth - 2 * cw) {
    richText(full, canvasWidth / 2, LY.titleY, LY.titleSize, CENTER);
  } else {
    fitText([full, SCN[scenario].label], 10, LY.titleY, canvasWidth - cw - 10, LY.titleSize, LEFT);
  }
  textStyle(NORMAL);

  fill(60);
  let cands;
  if (scenario === 'nc') {
    cands = ['Primary d = s + P*x (noise x through an unknown path P);   reference x;   output e = d − w^Tx → s',
             'd = s + P*x,   reference x,   output e = d − w^Tx → s', 'e = d − w^Tx → s'];
  } else if (scenario === 'ec') {
    cands = ['Microphone d = H*x (echo of far-end x) + near-end talker + noise;   output e = d − w^Tx',
             'd = H*x + near-end + noise,   e = d − w^Tx', 'e = d − w^Tx'];
  } else {
    cands = ['Received r = C*a + noise (a = ±1 training symbols);   y = w^Tr;   error e = a[n − Δ] − y',
             'r = C*a + noise,   y = w^Tr,   e = a[n−Δ] − y', 'y = w^Tr'];
  }
  fitText(cands, 10, LY.formulaY, canvasWidth - 20, wide ? 15 : 13, LEFT);
}

function levelLabel(short) {
  const v = params.level;
  if (scenario === 'nc') return (short ? 'Noise σ = ' : 'Noise level σ = ') + v.toFixed(2);
  if (scenario === 'ec') return (short ? 'Echo g = ' : 'Echo level g = ') + v.toFixed(2);
  return (short ? 'Noise σ = ' : 'Channel noise σ = ') + v.toFixed(2);
}

function drawControlLabels() {
  noStroke();
  fill('black');
  const unit = scenario === 'eq' ? 'symbols' : 'samples';
  if (wide) {
    const colW = (canvasWidth - 20) / 2;
    const lw = labelWidth() - 6;
    const r1 = rowY(sliderRow(0)), r2 = rowY(sliderRow(1));
    fitText(['Step size μ = ' + params.mu.toFixed(2), 'μ = ' + params.mu.toFixed(2)], 10, r1, lw, 16, LEFT);
    fitText(['Filter length M = ' + params.M, 'Length M = ' + params.M], 10 + colW, r1, lw, 16, LEFT);
    fitText([levelLabel(false), levelLabel(true)], 10, r2, lw, 16, LEFT);
    fitText(['Speed = ' + speed + ' ' + unit + '/frame', 'Speed = ' + speed + '/frame'], 10 + colW, r2, lw, 16, LEFT);
  } else {
    const r = i => rowY(sliderRow(i));
    fitText(['Step size μ = ' + params.mu.toFixed(2), 'μ = ' + params.mu.toFixed(2)], 10, r(0), 148, 15, LEFT);
    fitText(['Length M = ' + params.M, 'M = ' + params.M], 10, r(1), 148, 15, LEFT);
    fitText([levelLabel(false), levelLabel(true)], 10, r(2), 148, 15, LEFT);
    fitText(['Speed = ' + speed + '/frame', 'Speed ' + speed], 10, r(3), 148, 15, LEFT);
  }
}

// ---------------------------------------------------------------- plotting helpers

function niceUp(v) {
  for (const c of [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (v <= c) return c;
  return 10;
}

function plotBox(b) {
  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
}

function stripTitle(b, label, col, reserve = 0) {
  noStroke();
  fill(col[0], col[1], col[2]);
  textStyle(BOLD);
  fitText(label, b.x0, b.y0 - 9, b.x1 - b.x0 - reserve, wide ? 15 : 13, LEFT);
  textStyle(NORMAL);
}

function startClip(b) {
  push();
  drawingContext.beginPath();
  drawingContext.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  drawingContext.clip();
}
function stopClip() { pop(); }

// Mapping from absolute sample index m to x inside a strip that shows the last nWin samples
function stripMap(b, nWin) {
  const n = sim.n;
  const start = Math.max(0, n - nWin);
  return { start, end: n, x: m => b.x0 + (m - start) / nWin * (b.x1 - b.x0) };
}
function traceValue(k, m) {
  const age = sim.n - 1 - m;
  return sim.tr[k][((sim.head - 1 - age) % TRACE_LEN + TRACE_LEN) % TRACE_LEN];
}

// Draw trace k as a line, or as a min/max envelope when there are more samples than pixels
function drawTrace(b, k, yMax, col, weight, dashed, nWin) {
  const mp = stripMap(b, nWin);
  const yc = (b.y0 + b.y1) / 2, ys = (b.y1 - b.y0) / 2 / yMax;
  if (mp.end - mp.start < 2) return;
  stroke(col[0], col[1], col[2]);
  strokeWeight(weight);
  noFill();
  if (dashed) drawingContext.setLineDash([6, 5]);
  const pxPerSample = (b.x1 - b.x0) / nWin;
  if (pxPerSample >= 0.9) {
    beginShape();
    for (let m = mp.start; m < mp.end; m++) vertex(mp.x(m), yc - traceValue(k, m) * ys);
    endShape();
  } else {
    const per = Math.ceil(1 / pxPerSample);
    for (let m0 = mp.start; m0 < mp.end; m0 += per) {
      let lo = Infinity, hi = -Infinity;
      for (let m = m0; m < Math.min(mp.end, m0 + per); m++) {
        const v = traceValue(k, m);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const x = mp.x(m0);
      line(x, yc - hi * ys, x, yc - lo * ys - 0.5);
    }
  }
  drawingContext.setLineDash([]);
}

function stripAxes(b, yMax, showTicks, nWin) {
  plotBox(b);
  const yc = (b.y0 + b.y1) / 2;
  stroke(150);
  strokeWeight(1);
  line(b.x0, yc, b.x1, yc);
  noStroke();
  fill(80);
  textSize(wide ? 14 : 12);
  textAlign(RIGHT, CENTER);
  text(fmtNum(yMax), b.x0 - 4, b.y0 + 7);
  text('0', b.x0 - 4, yc);
  text(fmtNum(-yMax), b.x0 - 4, b.y1 - 7);
  if (!showTicks) return;
  // scrolling sample-index ticks under the strip
  const mp = stripMap(b, nWin);
  const step = nWin >= 1000 ? 300 : 100;
  const axisTitle = 'n (' + SCN[scenario].unit + ')';
  const limit = b.x1 - advW(axisTitle) - 10;
  textAlign(CENTER, TOP);
  for (let m = Math.ceil(mp.start / step) * step; m <= mp.start + nWin; m += step) {
    const x = mp.x(m);
    if (x < b.x0 + 12 || x + advW(String(m)) / 2 > limit) continue;
    stroke(150);
    line(x, b.y1, x, b.y1 + 4);
    noStroke();
    text(m, x, b.y1 + 5);
  }
  textAlign(RIGHT, TOP);
  text(axisTitle, b.x1, b.y1 + 5);
}

// ---------------------------------------------------------------- noise and echo cancellation panels

function drawCancellerPanels() {
  const S = LY.strips(3);
  const nWin = SCN[scenario].window;
  let yTop, yMid, yBot, t1, t2, t3, k1, k2, c1, c2;
  if (scenario === 'nc') {
    const Y = niceUp(1.2 + 2.5 * params.level);
    yTop = yMid = yBot = Y;
    t1 = ['Primary d[n] = s[n] + noise through path P', 'Primary d[n] = s[n] + P*x[n]', 'Primary d[n]'];
    t2 = params.leak ? ['Reference x[n] = noise + 0.3 s[n] (leak!)', 'Reference x[n] + leak']
                     : ['Reference x[n]: the noise source', 'Reference x[n]'];
    t3 = ['Output e[n] (green) and the clean s[n] (dashed)', 'Output e[n], clean s[n] dashed'];
    k1 = 0; k2 = 1; c1 = COL_D; c2 = COL_X;
  } else {
    yTop = 2;
    yMid = yBot = niceUp(Math.max(0.5, 0.9 * params.level + (params.nearEnd ? 0.9 : 0)));
    t1 = ['Far-end x[n] played by the loudspeaker', 'Far-end x[n]'];
    t2 = ['Microphone d[n] = echo + near-end talker + noise', 'Microphone d[n]'];
    t3 = params.nearEnd ? ['Output e[n] sent to the far end (green); near-end speech dashed', 'Output e[n], near-end dashed']
                        : ['Output e[n] sent to the far end (green): ideally zero', 'Output e[n]: ideally zero', 'Output e[n]'];
    k1 = 0; k2 = 1; c1 = COL_X; c2 = COL_D;
  }
  stripTitle(S[0], t1, c1);
  stripAxes(S[0], yTop, false, nWin);
  startClip(S[0]); drawTrace(S[0], k1, yTop, c1, 1.5, false, nWin); stopClip();

  stripTitle(S[1], t2, c2);
  stripAxes(S[1], yMid, false, nWin);
  startClip(S[1]); drawTrace(S[1], k2, yMid, c2, 1.5, false, nWin); stopClip();

  stripTitle(S[2], t3, COL_E);
  stripAxes(S[2], yBot, true, nWin);
  startClip(S[2]);
  drawTrace(S[2], 2, yBot, COL_E, 2, false, nWin);
  if (scenario === 'nc' || params.nearEnd) drawTrace(S[2], 3, yBot, COL_REF, 1.3, true, nWin);
  stopClip();
  if (scenario === 'ec' && sim.frozen) {
    noStroke();
    fill(COL_BAD);
    textSize(14);
    textAlign(RIGHT, BOTTOM);
    text('adaptation frozen', S[2].x1 - 4, S[2].y1 - 3);
  }

  drawTapsPanel();
}

function drawTapsPanel() {
  const b = { x0: LY.rightX0, x1: LY.rightX1, y0: LY.tapsY0, y1: LY.tapsY1 };
  const h = scenario === 'nc' ? NC_PATH : EC_PATH;
  const g = scenario === 'ec' ? params.level : 1;
  let ymax = 0;
  for (let k = 0; k < MAX_M; k++) {
    ymax = Math.max(ymax, Math.abs(k < h.length ? g * h[k] : 0), Math.abs(k < sim.M ? sim.w[k] : 0));
  }
  const Y = niceUp(Math.max(0.5 * g, ymax * 1.08));
  noStroke();
  fill(COL_W);
  textStyle(BOLD);
  fitText([(scenario === 'nc' ? 'Learned taps w vs true noise path P' : 'Learned taps w vs true echo path H'),
           'Taps w vs path'], b.x0, b.y0 - 9, b.x1 - b.x0, wide ? 15 : 13, LEFT);
  textStyle(NORMAL);
  drawStemPanel(b, Y, k => (k < h.length ? g * h[k] : 0), k => (k < sim.M ? sim.w[k] : null), MAX_M, -1);

  // legend
  const ly = b.y0 + 11;
  noStroke();
  fill(255, 255, 255, 220);
  textSize(13);
  const l1 = wide ? 'true path' : 'path', l2 = wide ? 'learned w' : 'w';
  const wl = 14 + advW(l1) + 18 + 14 + advW(l2) + 10;
  rect(b.x1 - wl - 4, b.y0 + 2, wl, 18);
  let x = b.x1 - wl;
  fill(COL_H); rect(x, ly - 5, 9, 10);
  fill(70); textAlign(LEFT, CENTER); text(l1, x + 13, ly);
  x += 14 + advW(l1) + 18;
  fill(COL_W); circle(x + 4, ly, 7);
  text(l2, x + 13, ly);
}

// Stem plot of taps: optional gray bars (ref) and maroon stems (w; null = outside the filter)
function drawStemPanel(b, Y, refFn, wFn, n, highlight) {
  plotBox(b);
  const yc = (b.y0 + b.y1) / 2, ys = (b.y1 - b.y0) / 2 / Y * 0.92;
  const dx = (b.x1 - b.x0) / n;
  // taps outside the adaptive filter
  let firstOut = -1;
  for (let k = 0; k < n; k++) if (wFn(k) === null) { firstOut = k; break; }
  if (firstOut >= 0) {
    noStroke();
    fill(238);
    rect(b.x0 + firstOut * dx + 1, b.y0 + 1, (n - firstOut) * dx - 2, b.y1 - b.y0 - 2);
    fill(140);
    textSize(13);
    textAlign(CENTER, BOTTOM);
    if ((n - firstOut) * dx > 70) text('not in filter', b.x0 + (firstOut + n) / 2 * dx, b.y1 - 3);
  }
  stroke(150);
  strokeWeight(1);
  line(b.x0, yc, b.x1, yc);
  for (let k = 0; k < n; k++) {
    const x = b.x0 + (k + 0.5) * dx;
    if (refFn) {
      const r = refFn(k);
      if (r !== 0) {
        noStroke();
        fill(COL_H);
        const bw = Math.max(3, dx * 0.62);
        rect(x - bw / 2, Math.min(yc, yc - r * ys), bw, Math.abs(r * ys));
      }
    }
    const w = wFn(k);
    if (w !== null) {
      const col = k === highlight ? COL_GOLD : COL_W;
      stroke(col[0], col[1], col[2]);
      strokeWeight(1.6);
      line(x, yc, x, yc - constrain(w, -Y, Y) * ys);
      noStroke();
      fill(col[0], col[1], col[2]);
      circle(x, yc - constrain(w, -Y, Y) * ys, Math.min(7, dx * 0.8));
    }
  }
  // axes labels
  noStroke();
  fill(80);
  textSize(wide ? 14 : 12);
  textAlign(RIGHT, CENTER);
  text('0', b.x0 - 4, yc);
  if (b.y1 - b.y0 >= 60) {
    text(fmtNum(Y), b.x0 - 4, b.y0 + 7);
    text(fmtNum(-Y), b.x0 - 4, b.y1 - 7);
  } else {
    textAlign(RIGHT, TOP);
    text(fmtNum(Y), b.x0 - 4, b.y0 - 1);
    textAlign(RIGHT, BOTTOM);
    text(fmtNum(-Y), b.x0 - 4, b.y1 + 2);
  }
  textAlign(CENTER, TOP);
  const stepK = n > 20 ? (dx * 8 > 60 ? 8 : 16) : 4;
  const limit = b.x1 - advW('tap k') - 14;
  for (let k = 0; k < n; k += stepK) {
    const x = b.x0 + (k + 0.5) * dx;
    if (x + advW(String(k)) / 2 < limit) text(k, x, b.y1 + 3);
  }
  textAlign(RIGHT, TOP);
  text('tap k', b.x1, b.y1 + 3);
}

// ---------------------------------------------------------------- equalization panels

function eyeStats(k) {
  let mp = Infinity, mm = -Infinity;
  for (let j = 0; j < EYE_WIN && j < sim.n; j++) {
    const i = ((sim.head - 1 - j) % TRACE_LEN + TRACE_LEN) % TRACE_LEN;
    const a = sim.sym[k][i], v = sim.tr[k][i];
    if (a > 0) mp = Math.min(mp, v);
    else if (a < 0) mm = Math.max(mm, v);
  }
  if (!isFinite(mp) || !isFinite(mm)) return null;
  return { lo: mm, hi: mp, open: (mp - mm) / 2 };
}

function drawEqualizerPanels() {
  const S = LY.strips(2);
  const nWin = SCN.eq.window;
  const Y = 2.5;
  const titles = [['Before: channel output r[n] (no equalizer)', 'Before: channel output r[n]', 'Before: r[n]'],
                  ['After: equalizer output y[n] = w^Tr', 'After: equalizer output y[n]', 'After: y[n]']];
  for (let k = 0; k < 2; k++) {
    const b = S[k];
    stripTitle(b, titles[k], k === 0 ? COL_X : COL_E, 140);
    stripAxes(b, Y, k === 1, nWin);
    const yc = (b.y0 + b.y1) / 2, ys = (b.y1 - b.y0) / 2 / Y;
    startClip(b);
    // reference levels +/-1
    stroke(225);
    strokeWeight(1);
    line(b.x0, yc - ys, b.x1, yc - ys);
    line(b.x0, yc + ys, b.x1, yc + ys);
    // eye band between the two symbol clouds
    const st = eyeStats(k);
    if (st) {
      noStroke();
      if (st.open > 0) fill(30, 160, 70, 50); else fill(205, 35, 35, 45);
      const ya = yc - st.hi * ys, yb = yc - st.lo * ys;
      rect(b.x0, Math.min(ya, yb), b.x1 - b.x0, Math.abs(yb - ya));
    }
    const mp = stripMap(b, nWin);
    noStroke();
    for (let m = mp.start; m < mp.end; m++) {
      const i = ((sim.head - 1 - (sim.n - 1 - m)) % TRACE_LEN + TRACE_LEN) % TRACE_LEN;
      const a = sim.sym[k][i];
      if (a === 0) continue;
      if (a > 0) fill(COL_D[0], COL_D[1], COL_D[2]); else fill(COL_NEG[0], COL_NEG[1], COL_NEG[2]);
      circle(mp.x(m), yc - constrain(sim.tr[k][i], -Y, Y) * ys, wide ? 4.5 : 3.5);
    }
    stopClip();
    // eye label
    if (st) {
      noStroke();
      fill(st.open > 0 ? [20, 120, 50] : COL_BAD);
      textSize(14);
      textAlign(RIGHT, BOTTOM);
      text(st.open > 0 ? 'eye open: ' + fmt(st.open) : 'eye closed: ' + fmt(st.open), b.x1 - 4, b.y0 - 2);
    }
  }
  // symbol legend under the title line of the first strip (right side of the formula area)
  const b0 = S[0];
  textSize(13);
  const lx = b0.x1 - 4;
  noStroke();
  fill(255, 255, 255, 220);
  const lw = advW('a = +1') + advW('a = −1') + 50;
  rect(lx - lw, b0.y0 + 2, lw + 2, 18);
  fill(COL_NEG); circle(lx - advW('a = −1') - 9, b0.y0 + 11, 7);
  fill(70); textAlign(RIGHT, CENTER); text('a = −1', lx, b0.y0 + 11);
  const x2 = lx - advW('a = −1') - 22;
  fill(COL_D); circle(x2 - advW('a = +1') - 9, b0.y0 + 11, 7);
  fill(70); text('a = +1', x2, b0.y0 + 11);

  // equalizer taps and combined response
  const top = LY.tapsY0, bot = LY.tapsY1;
  const midGap = 34;
  const hb = wide ? (bot - top - midGap) / 2 : bot - top;
  const b1 = { x0: LY.rightX0, x1: LY.rightX1, y0: top, y1: top + hb };
  const b2 = { x0: LY.rightX0, x1: LY.rightX1, y0: top + hb + midGap, y1: bot };
  let wmax = 0;
  for (let k = 0; k < sim.M; k++) wmax = Math.max(wmax, Math.abs(sim.w[k]));
  noStroke();
  fill(COL_W);
  textStyle(BOLD);
  fitText(['Equalizer taps w (M = ' + sim.M + ')', 'Taps w'], b1.x0, b1.y0 - 9, b1.x1 - b1.x0, wide ? 15 : 13, LEFT);
  textStyle(NORMAL);
  drawStemPanel(b1, niceUp(Math.max(0.5, wmax * 1.05)), null, k => (k < sim.M ? sim.w[k] : null), MAX_M, -1);

  if (!wide) return;                                     // narrow screens: taps only
  const L = EQ_CHANNEL.length;
  const nc = sim.M + L - 1;
  const comb = [];
  for (let i = 0; i < nc; i++) {
    let a = 0;
    for (let k = 0; k < L; k++) { const j = i - k; if (j >= 0 && j < sim.M) a += EQ_CHANNEL[k] * sim.w[j]; }
    comb.push(a);
  }
  noStroke();
  fill(70);
  textStyle(BOLD);
  fitText(['Channel then equalizer: c = C*w (goal: spike at Δ = ' + sim.D + ')', 'c = C*w, goal spike at Δ = ' + sim.D],
          b2.x0, b2.y0 - 9, b2.x1 - b2.x0, wide ? 15 : 13, LEFT);
  textStyle(NORMAL);
  drawStemPanel(b2, 1, null, k => (k < nc ? comb[k] : null), MAX_M + L - 1, sim.D);
}

// ---------------------------------------------------------------- convergence curve

function drawConvergence() {
  const b = { x0: LY.convX0, x1: LY.convX1, y0: LY.convY0, y1: LY.convY1 };
  const [lo, hi] = SCN[scenario].conv;
  const names = { nc: ['Convergence: noise reduction (dB)', 'Noise reduction (dB)'],
                  ec: ['Convergence: ERLE (dB)', 'ERLE (dB)'],
                  eq: ['Learning curve: MSE (dB)', 'MSE (dB)'] };
  noStroke();
  fill(COL_W);
  textStyle(BOLD);
  fitText(names[scenario], b.x0, b.y0 - 9, b.x1 - b.x0, wide ? 15 : 13, LEFT);
  textStyle(NORMAL);
  plotBox(b);

  // x range grows by doubling so the start of the run always stays visible
  let xmax = 2000;
  while (sim.n > xmax) xmax *= 2;
  const X = m => b.x0 + m / xmax * (b.x1 - b.x0);
  const Yp = v => b.y1 - (constrain(v, lo, hi) - lo) / (hi - lo) * (b.y1 - b.y0);

  // shaded spans where the scenario option was on
  const fl = sim.flags;
  noStroke();
  fill(205, 35, 35, 40);
  for (let i = 0; i < fl.length; i++) {
    if (!fl[i]) continue;
    let j = i;
    while (j + 1 < fl.length && fl[j + 1]) j++;
    rect(X(i * BLOCK), b.y0 + 1, Math.max(1, X((j + 1) * BLOCK) - X(i * BLOCK)), b.y1 - b.y0 - 2);
    i = j;
  }

  // grid
  textSize(wide ? 14 : 12);
  for (let v = lo; v <= hi; v += 10) {
    stroke(v === 0 ? 160 : 230);
    strokeWeight(1);
    line(b.x0, Yp(v), b.x1, Yp(v));
    noStroke();
    fill(80);
    textAlign(RIGHT, CENTER);
    text(v, b.x0 - 4, Yp(v));
  }
  noStroke();
  fill(80);
  const axisTitle = 'n (' + SCN[scenario].unit + ')';
  const limit = b.x1 - advW(axisTitle) - 8;
  textAlign(CENTER, TOP);
  for (let f = 0; f < 0.99; f += 0.25) {
    const m = Math.round(f * xmax);
    if (X(m) + advW(fmtCount(m)) / 2 < limit) text(fmtCount(m), X(m), b.y1 + 3);
  }
  textAlign(RIGHT, TOP);
  text(axisTitle, b.x1, b.y1 + 3);

  // Wiener optimum for the equalizer
  if (scenario === 'eq') {
    const jdb = 10 * Math.log10(sim.Jmin);
    stroke(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
    strokeWeight(1.5);
    drawingContext.setLineDash([6, 5]);
    line(b.x0, Yp(jdb), b.x1, Yp(jdb));
    drawingContext.setLineDash([]);
    noStroke();
    fill(COL_GOLD);
    textSize(13);
    const below = Yp(jdb) < b.y1 - 20;
    textAlign(RIGHT, below ? TOP : BOTTOM);
    text('Wiener minimum ' + fmt(jdb, 1) + ' dB', b.x1 - 4, Yp(jdb) + (below ? 3 : -3));
  }

  // the curve (at most ~one vertex per pixel)
  const hist = sim.hist;
  if (hist.length > 1) {
    const stride = Math.max(1, Math.floor(hist.length / (b.x1 - b.x0)));
    stroke(COL_W[0], COL_W[1], COL_W[2]);
    strokeWeight(1.8);
    noFill();
    beginShape();
    for (let i = 0; i < hist.length; i += stride) vertex(X((i + 1) * BLOCK), Yp(hist[i]));
    vertex(X(hist.length * BLOCK), Yp(hist[hist.length - 1]));
    endShape();
    noStroke();
    fill(COL_W);
    circle(X(hist.length * BLOCK), Yp(hist[hist.length - 1]), 6);
  }

  // legend for the shaded spans
  const flagName = { nc: 'leak on', ec: 'near-end talking', eq: 'decision-directed' }[scenario];
  if (fl.some(v => v)) {
    textSize(13);
    noStroke();
    fill(205, 35, 35, 60);
    const lw = advW(flagName) + 22;
    rect(b.x0 + 4, b.y0 + 4, lw, 17);
    fill(150, 20, 20);
    textAlign(LEFT, CENTER);
    text(flagName, b.x0 + 12, b.y0 + 12);
  }
}

// ---------------------------------------------------------------- numeric read-outs

function drawReadouts() {
  const sz = wide ? 16 : 13;
  let l1, l2;
  if (scenario === 'nc') {
    const nr = metricDb(sim);
    const snrIn = 10 * Math.log10((sim.pc + 1e-12) / (sim.pa + 1e-12));
    const gain = sim.pes / (sim.pc + 1e-12);
    const mis = 10 * Math.log10(sim.mis + 1e-12);
    l1 = [[['SNR in ', 60], [fmt(snrIn, 1) + ' dB', COL_D, true], ['    Noise reduction ', 60], [fmt(nr, 1) + ' dB', COL_W, true],
           ['    SNR out ', 60], [fmt(snrIn + nr, 1) + ' dB', COL_E, true]],
          [['SNR in ', 60], [fmt(snrIn, 1), COL_D, true], ['  NR ', 60], [fmt(nr, 1) + ' dB', COL_W, true],
           ['  out ', 60], [fmt(snrIn + nr, 1), COL_E, true]]];
    l2 = [[['Signal kept in e: ', 60], [(100 * gain).toFixed(0) + ' %', gain < 0.9 ? COL_BAD : COL_E, true],
           ['    Misalignment ‖P − w‖²/‖P‖² = ', 60], [fmt(mis, 1) + ' dB', COL_W, true]],
          [['Signal kept ', 60], [(100 * gain).toFixed(0) + '%', gain < 0.9 ? COL_BAD : COL_E, true],
           ['  Misalign. ', 60], [fmt(mis, 1) + ' dB', COL_W, true]]];
  } else if (scenario === 'ec') {
    const erle = metricDb(sim);
    const mis = 10 * Math.log10(sim.mis + 1e-12);
    l1 = [[['ERLE = 10 log₁₀(E[d²]/E[e²]) = ', 60], [fmt(erle, 1) + ' dB', erle < 0 ? COL_BAD : COL_W, true],
           ['   (echo part of d and e)', 110]],
          [['ERLE ', 60], [fmt(erle, 1) + ' dB', erle < 0 ? COL_BAD : COL_W, true]]];
    const nearTxt = !params.nearEnd ? 'off' : (sim.doubleTalk ? 'talking (double-talk)' : 'silent');
    const adTxt = sim.frozen ? 'frozen' : 'on';
    l2 = [[['Misalignment ', 60], [fmt(mis, 1) + ' dB', COL_W, true], ['    Near-end: ', 60],
           [nearTxt, sim.doubleTalk ? COL_BAD : [60, 60, 60], true], ['    Adaptation: ', 60], [adTxt, sim.frozen ? COL_BAD : COL_E, true]],
          [['Misalign. ', 60], [fmt(mis, 1) + ' dB', COL_W, true], ['  Near: ', 60],
           [params.nearEnd ? (sim.doubleTalk ? 'talking' : 'silent') : 'off', sim.doubleTalk ? COL_BAD : [60, 60, 60], true],
           ['  Adapt: ', 60], [adTxt, sim.frozen ? COL_BAD : COL_E, true]]];
  } else {
    const mse = metricDb(sim);
    const serB = 100 * sim.nErrB / Math.max(1, sim.nDec), serA = 100 * sim.nErrA / Math.max(1, sim.nDec);
    const eb = eyeStats(0), ea = eyeStats(1);
    const eyeTxt = st => (st ? (st.open >= 0 ? '+' : '') + st.open.toFixed(2) : '–');
    l1 = [[['MSE ', 60], [fmt(mse, 1) + ' dB', COL_W, true], ['  (Wiener minimum ' + fmt(10 * Math.log10(sim.Jmin), 1) + ' dB)', 90],
           ['    Delay Δ = ' + sim.D + '    Mode: ', 60], [params.dd ? 'decision-directed' : 'training', params.dd ? COL_BAD : COL_E, true]],
          [['MSE ', 60], [fmt(mse, 1) + ' dB', COL_W, true], ['  Δ = ' + sim.D + '  ', 60],
           [params.dd ? 'decision-dir.' : 'training', params.dd ? COL_BAD : COL_E, true]]];
    l2 = [[['Symbol errors: before ', 60], [serB.toFixed(1) + ' %', serB > 0 ? COL_BAD : COL_E, true], [', after ', 60],
           [serA.toFixed(1) + ' %', serA > 0 ? COL_BAD : COL_E, true], ['    Eye opening: before ', 60],
           [eyeTxt(eb), eb && eb.open > 0 ? COL_E : COL_BAD, true], [', after ', 60], [eyeTxt(ea), ea && ea.open > 0 ? COL_E : COL_BAD, true]],
          [['Errors ', 60], [serB.toFixed(1) + '%', serB > 0 ? COL_BAD : COL_E, true], [' → ', 60],
           [serA.toFixed(1) + '%', serA > 0 ? COL_BAD : COL_E, true], ['  Eye ', 60], [eyeTxt(eb), eb && eb.open > 0 ? COL_E : COL_BAD, true],
           [' → ', 60], [eyeTxt(ea), ea && ea.open > 0 ? COL_E : COL_BAD, true]]];
  }
  drawSegments(l1, 10, LY.readY[0], sz, canvasWidth - 20);
  drawSegments(l2, 10, LY.readY[1], sz, canvasWidth - 20);
}

// Draw the first segment list that fits; a segment is [text, color (gray level or rgb), bold]
function drawSegments(cands, x, y, sz, maxW) {
  textSize(sz);
  const widthOf = segs => segs.reduce((w, s) => { textStyle(s[2] ? BOLD : NORMAL); const v = w + advW(s[0]); textStyle(NORMAL); return v; }, 0);
  let segs = cands[cands.length - 1];
  for (const c of cands) if (widthOf(c) <= maxW) { segs = c; break; }
  noStroke();
  textAlign(LEFT, CENTER);
  let cx = x;
  for (const s of segs) {
    const col = s[1];
    if (Array.isArray(col)) fill(col[0], col[1], col[2]); else fill(col);
    textStyle(s[2] ? BOLD : NORMAL);
    text(s[0], cx, y);
    cx += advW(s[0]);
  }
  textStyle(NORMAL);
}

// ---------------------------------------------------------------- text helpers

// Rich text: '_x' draws x as a subscript and '^x' draws x as a superscript
function parseRich(s) {
  const out = [];
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    if ((s[i] === '_' || s[i] === '^') && i + 1 < s.length) {
      if (buf) { out.push({ t: buf, v: 0 }); buf = ''; }
      out.push({ t: s[i + 1], v: s[i] === '_' ? 1 : -1 });
      i++;
    } else {
      buf += s[i];
    }
  }
  if (buf) out.push({ t: buf, v: 0 });
  return out;
}

// advance width: in p5 2.x textWidth() measures tight bounds and ignores spaces
function advW(s) {
  return typeof fontWidth === 'function' ? fontWidth(s) : textWidth(s);
}

function richWidth(s, sz) {
  let w = 0;
  for (const p of parseRich(s)) {
    textSize(p.v ? sz * 0.72 : sz);
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
    textSize(p.v ? sz * 0.72 : sz);
    text(p.t, cx, y + p.v * sz * 0.32);
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

// number with a true minus sign and no "-0.0"
function fmt(v, d = 2) {
  const r = Number(v.toFixed(d));
  return (r < 0 ? '−' : '') + Math.abs(r).toFixed(d);
}
function fmtNum(v) { return (v < 0 ? '−' : '') + Math.abs(v); }
function fmtCount(m) { return m >= 10000 ? (m / 1000) + 'k' : String(m); }

// ---------------------------------------------------------------- responsive layout

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  const w = canvasWidth >= WIDE_MIN;
  if (w !== wide) layoutWidth = -1;
  wide = w;
  layoutControls(false);                 // also sets controlHeight and drawHeight
  if (!LY || LY.W !== canvasWidth || LY.dh !== drawHeight || LY.scn !== scenario) {
    LY = computeLayout();
    LY.dh = drawHeight;
    LY.scn = scenario;
  }
}
