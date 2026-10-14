// System Property Explorer MicroSim
// CANVAS_HEIGHT: 615
// Runs four tests - linearity, time-invariance, causality and BIBO stability -
// on eight example continuous-time systems y(t) = T[x(t)].  Each test builds
// the two signals that the property says must be equal and overlays them, so
// a failed property shows up as two curves that separate.

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 670;
let drawHeight = 500;
let controlHeight = 115;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 165;
let defaultTextSize = 16;

// ---- time grids ----
// Signals are simulated on a grid wider than the plot so that shifted,
// advanced and integrated signals are correct everywhere inside the plot.
const DT = 0.01;
const GRID_START = -8;                 // seconds
const GRID_END = 14;
const NG = Math.round((GRID_END - GRID_START) / DT) + 1;
const VIEW_START = -2;                 // plotted window
const VIEW_END = 10;
const ONE_SECOND = Math.round(1 / DT); // samples in 1 s

// ---- the example systems and their true properties ----
const SYSTEMS = [
  {
    id: 'amp', label: 'Amplifier: y(t) = 2·x(t)',
    linear: true, timeInvariant: true, causal: true, stable: true, memoryless: true,
    why: {
      linear: 'Scaling and adding inputs scales and adds the outputs: 2(A·x₁ + x₂) = A·2x₁ + 2x₂.',
      timeInvariant: 'The gain is 2 at every instant, so a delayed input gives the same output, delayed.',
      causal: 'y(t) uses only the present input x(t).',
      stable: '|y(t)| = 2|x(t)|, so a bounded input gives a bounded output.'
    }
  },
  {
    id: 'avg', label: 'Linear filter: y(t) = ∫ x(τ)dτ over the last 1 s',
    linear: true, timeInvariant: true, causal: true, stable: true, memoryless: false,
    why: {
      linear: 'Integration is a linear operation, so superposition holds.',
      timeInvariant: 'The window always covers the most recent second, wherever the input sits in time.',
      causal: 'The window t − 1 ≤ τ ≤ t holds only past and present input.',
      stable: '|y(t)| can never exceed the input bound times the 1 s window.'
    }
  },
  {
    id: 'tmult', label: 'Time-varying multiplier: y(t) = t·x(t)',
    linear: true, timeInvariant: false, causal: true, stable: false, memoryless: true,
    why: {
      linear: 't·(A·x₁ + x₂) = A·t·x₁ + t·x₂, so superposition holds.',
      timeInvariant: 'The gain t depends on when the input arrives: T[x(t − t₀)] = t·x(t − t₀), but y(t − t₀) = (t − t₀)·x(t − t₀).',
      causal: 'y(t) uses only the present input x(t).',
      stable: 'The bounded input A·u(t − t₀) gives y(t) = A·t, which grows without limit.'
    }
  },
  {
    id: 'square', label: 'Squarer: y(t) = x²(t)',
    linear: false, timeInvariant: true, causal: true, stable: true, memoryless: true,
    why: {
      linear: '(A·x₁ + x₂)² = A²x₁² + 2A·x₁x₂ + x₂², which is not A·x₁² + x₂².',
      timeInvariant: 'Squaring acts the same way at every instant.',
      causal: 'y(t) uses only the present input x(t).',
      stable: 'If |x(t)| ≤ M then |y(t)| ≤ M².'
    }
  },
  {
    id: 'tanh', label: 'Compressor: y(t) = tanh(x(t))',
    linear: false, timeInvariant: true, causal: true, stable: true, memoryless: true,
    why: {
      linear: 'tanh saturates near ±1, so doubling a large input does not double the output.',
      timeInvariant: 'The compression curve is the same at every instant.',
      causal: 'y(t) uses only the present input x(t).',
      stable: '|tanh(x)| < 1 for every input value.'
    }
  },
  {
    id: 'advance', label: 'Predictor: y(t) = x(t + 1)',
    linear: true, timeInvariant: true, causal: false, stable: true, memoryless: false,
    why: {
      linear: 'A time shift of A·x₁ + x₂ is the same combination of the shifted signals.',
      timeInvariant: 'Advancing by 1 s commutes with any other time shift.',
      causal: 'y(t) = x(t + 1) needs the input one second into the future.',
      stable: 'The output is the input moved in time, so it has the same bound.'
    }
  },
  {
    id: 'integrator', label: 'Integrator: y(t) = ∫ x(τ)dτ from −∞ to t',
    linear: true, timeInvariant: true, causal: true, stable: false, memoryless: false,
    why: {
      linear: 'Integration is a linear operation, so superposition holds.',
      timeInvariant: 'Delaying the input delays the running integral by the same amount.',
      causal: 'The integral runs only up to the present time t.',
      stable: 'The bounded input A·u(t − t₀) integrates to the ramp A·(t − t₀), which grows without limit.'
    }
  },
  {
    id: 'offset', label: 'Offset: y(t) = x(t) + 1',
    linear: false, timeInvariant: true, causal: true, stable: true, memoryless: true,
    why: {
      linear: 'T[A·x₁ + x₂] = A·x₁ + x₂ + 1, but A·T[x₁] + T[x₂] = A·x₁ + x₂ + A + 1. Zero input does not give zero output.',
      timeInvariant: 'The added constant is the same at every instant.',
      causal: 'y(t) uses only the present input x(t).',
      stable: '|y(t)| ≤ |x(t)| + 1.'
    }
  }
];

const TESTS = [
  { id: 'linear', label: 'Linearity', phrase: 'linear' },
  { id: 'timeInvariant', label: 'Time-invariance', phrase: 'time-invariant' },
  { id: 'causal', label: 'Causality', phrase: 'causal' },
  { id: 'stable', label: 'BIBO stability', phrase: 'BIBO stable' }
];

// ---- controls ----
let systemSelect, testSelect, ampSlider, freqSlider, shiftSlider;

// ---- cached test result (rebuilt only when a control changes) ----
let result = null;
let resultKey = '';

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  systemSelect = createSelect();
  for (const s of SYSTEMS) systemSelect.option(s.label, s.id);
  systemSelect.selected('tmult');

  testSelect = createSelect();
  for (const t of TESTS) testSelect.option(t.label, t.id);
  testSelect.selected('timeInvariant');

  ampSlider = createSlider(0.5, 3, 2, 0.1);
  freqSlider = createSlider(0.25, 2, 0.5, 0.25);
  shiftSlider = createSlider(0.5, 4, 2, 0.1);

  const mainElement = document.querySelector('main');
  [systemSelect, testSelect, ampSlider, freqSlider, shiftSlider].forEach(c => c.parent(mainElement));
  positionControls();

  describe('Input and output plots for eight example systems. A selected test for linearity, ' +
    'time-invariance, causality or stability overlays the two signals that should be equal, ' +
    'reports whether they match, and badges list every property of the selected system.', LABEL);
}

// ---------------------------------------------------------------------------
// Signals and systems on the simulation grid
// ---------------------------------------------------------------------------

function gridTime(i) { return GRID_START + i * DT; }
function gridIndex(t) { return Math.round((t - GRID_START) / DT); }

function makeSignal(fn) {
  const a = new Float64Array(NG);
  for (let i = 0; i < NG; i++) a[i] = fn(gridTime(i));
  return a;
}

// sine burst: sin(2 pi f t) for 0 <= t <= 4 s, zero elsewhere
function burst(f) {
  return makeSignal(t => (t >= -1e-9 && t <= 4 + 1e-9) ? Math.sin(2 * Math.PI * f * t) : 0);
}
// rectangular pulse of height 1 from t0 to t0 + 2 s
function pulse(t0) {
  return makeSignal(t => (t >= t0 - 1e-9 && t < t0 + 2 - 1e-9) ? 1 : 0);
}
// unit step u(t - t0)
function stepSignal(t0) {
  return makeSignal(t => (t >= t0 - 1e-9) ? 1 : 0);
}

function combine(a, x1, b, x2) {
  const out = new Float64Array(NG);
  for (let i = 0; i < NG; i++) out[i] = a * x1[i] + b * x2[i];
  return out;
}

// delay a signal by k samples (values before the grid start are zero)
function delay(x, k) {
  const out = new Float64Array(NG);
  for (let i = 0; i < NG; i++) out[i] = (i - k >= 0 && i - k < NG) ? x[i - k] : 0;
  return out;
}

// y = T[x] for the system with the given id
function applySystem(id, x) {
  const y = new Float64Array(NG);
  let running = 0;
  const cumulative = new Float64Array(NG);
  for (let i = 0; i < NG; i++) { running += x[i]; cumulative[i] = running; }
  for (let i = 0; i < NG; i++) {
    switch (id) {
      case 'amp': y[i] = 2 * x[i]; break;
      case 'avg': y[i] = (cumulative[i] - (i >= ONE_SECOND ? cumulative[i - ONE_SECOND] : 0)) * DT; break;
      case 'tmult': y[i] = gridTime(i) * x[i]; break;
      case 'square': y[i] = x[i] * x[i]; break;
      case 'tanh': y[i] = Math.tanh(x[i]); break;
      case 'advance': y[i] = (i + ONE_SECOND < NG) ? x[i + ONE_SECOND] : 0; break;
      case 'integrator': y[i] = cumulative[i] * DT; break;
      case 'offset': y[i] = x[i] + 1; break;
    }
  }
  return y;
}

// largest |a - b| inside the plotted window, optionally only up to time tEnd
function maxDifference(a, b, tEnd) {
  const i0 = gridIndex(VIEW_START);
  const i1 = gridIndex(tEnd === undefined ? VIEW_END : Math.min(tEnd, VIEW_END));
  let m = 0;
  for (let i = i0; i <= i1; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

function maxAbs(a) {
  const i0 = gridIndex(VIEW_START), i1 = gridIndex(VIEW_END);
  let m = 0;
  for (let i = i0; i <= i1; i++) m = Math.max(m, Math.abs(a[i]));
  return m;
}

// Build the signals for one test.  Returns the curves to draw in each plot
// and whether the two compared signals agree for these particular inputs.
function runTest(systemId, testId, A, f, t0) {
  const r = { inputs: [], outputs: [], marker: null, bound: null };
  const k0 = Math.round(t0 / DT);

  if (testId === 'linear') {
    // compare T[A x1 + x2] with A T[x1] + T[x2]
    const x1 = burst(f), x2 = pulse(t0);
    const xin = combine(A, x1, 1, x2);
    const lhs = applySystem(systemId, xin);
    const rhs = combine(A, applySystem(systemId, x1), 1, applySystem(systemId, x2));
    r.inputs = [
      { data: combine(A, x1, 0, x2), color: 'gray', weight: 1, label: 'A·x₁(t)' },
      { data: x2, color: 'darkgray', weight: 1, dashed: true, label: 'x₂(t)' },
      { data: xin, color: 'blue', weight: 2.5, label: 'A·x₁(t) + x₂(t)' }
    ];
    r.outputs = [
      { data: lhs, color: 'blue', weight: 3, label: 'T[A·x₁ + x₂]' },
      { data: rhs, color: 'darkorange', weight: 2, dashed: true, label: 'A·T[x₁] + T[x₂]' }
    ];
    r.difference = maxDifference(lhs, rhs);
  } else if (testId === 'timeInvariant') {
    // compare T[x(t - t0)] with y(t - t0)
    const x = combine(A, burst(f), 0, burst(f));
    const xShift = delay(x, k0);
    const y = applySystem(systemId, x);
    const lhs = applySystem(systemId, xShift);
    const rhs = delay(y, k0);
    r.inputs = [
      { data: x, color: 'gray', weight: 1, label: 'x(t)' },
      { data: xShift, color: 'blue', weight: 2.5, label: 'x(t − t₀)' }
    ];
    r.outputs = [
      { data: y, color: 'gray', weight: 1, label: 'y(t)' },
      { data: lhs, color: 'blue', weight: 3, label: 'T[x(t − t₀)]' },
      { data: rhs, color: 'darkorange', weight: 2, dashed: true, label: 'y(t − t₀)' }
    ];
    r.difference = maxDifference(lhs, rhs);
  } else if (testId === 'causal') {
    // two inputs that are identical up to t0; a causal system must give
    // identical outputs up to t0
    const xa = combine(A, burst(f), 0, burst(f));
    const xb = combine(1, xa, 1, makeSignal(t => (t > t0 + 1e-9 && t <= t0 + 2 + 1e-9) ? 1 : 0));
    const ya = applySystem(systemId, xa);
    const yb = applySystem(systemId, xb);
    r.inputs = [
      { data: xa, color: 'blue', weight: 3, label: 'x₁(t)' },
      { data: xb, color: 'darkorange', weight: 2, dashed: true, label: 'x₂(t), equal to x₁(t) until t₀' }
    ];
    r.outputs = [
      { data: ya, color: 'blue', weight: 3, label: 'T[x₁]' },
      { data: yb, color: 'darkorange', weight: 2, dashed: true, label: 'T[x₂]' }
    ];
    r.marker = t0;
    r.difference = maxDifference(ya, yb, t0);
    r.earlyDifference = { a: ya, b: yb, until: t0 };
  } else {
    // bounded input A u(t - t0); is the output bounded?
    const x = combine(A, stepSignal(t0), 0, stepSignal(t0));
    const y = applySystem(systemId, x);
    r.inputs = [{ data: x, color: 'blue', weight: 2.5, label: 'x(t) = A·u(t − t₀), bounded by ±A (dotted)' }];
    r.outputs = [{ data: y, color: 'blue', weight: 3, label: 'y(t) = T[x(t)]' }];
    r.bound = A;
    r.peak = maxAbs(y);
    const end = Math.abs(y[gridIndex(VIEW_END)]);
    r.growing = end > Math.abs(y[gridIndex(VIEW_END - 2)]) + 1e-6 &&
      end > Math.abs(y[gridIndex(VIEW_END - 4)]) + 1e-6;
    r.difference = r.growing ? Infinity : 0;
  }
  r.agrees = r.difference < 1e-7;
  return r;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function draw() {
  updateCanvasSize();

  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  const sys = SYSTEMS.find(s => s.id === systemSelect.value());
  const testId = testSelect.value();
  const A = ampSlider.value(), f = freqSlider.value(), t0 = shiftSlider.value();
  if (testId === 'stable') freqSlider.attribute('disabled', '');
  else freqSlider.removeAttribute('disabled');

  const key = [sys.id, testId, A, f, t0].join('|');
  if (key !== resultKey) {
    result = runTest(sys.id, testId, A, f, t0);
    resultKey = key;
  }

  drawBadges(sys, testId);

  // each plot has an 18 px legend strip above it
  const px = 58, pw = canvasWidth - 58 - 20, ph = 120;
  const topPlot = { x: px, y: 92, w: pw, h: ph };
  const bottomPlot = { x: px, y: 242, w: pw, h: ph };
  drawPlot(topPlot, result.inputs, 'Input', false, result);
  drawPlot(bottomPlot, result.outputs, 'Output', true, result);

  // title
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(22);
  text('System Property Explorer', canvasWidth / 2, 8);

  drawExplanation(sys, testId, result);
  drawControlLabels(testId, A, f, t0);
}

function drawBadges(sys, testId) {
  const items = [
    ['Linear', sys.linear, 'linear'],
    ['Time-invariant', sys.timeInvariant, 'timeInvariant'],
    ['Causal', sys.causal, 'causal'],
    ['BIBO stable', sys.stable, 'stable'],
    ['Memoryless', sys.memoryless, 'memoryless']
  ];
  const narrow = canvasWidth < 600;
  const gap = 6;
  const bw = (canvasWidth - 20 - gap * 4) / 5;
  textSize(narrow ? 10 : 13);
  for (let i = 0; i < items.length; i++) {
    const bx = 10 + i * (bw + gap), by = 38, bh = 28;
    const active = items[i][2] === testId;
    stroke(active ? 'black' : 'silver');
    strokeWeight(active ? 2.5 : 1);
    fill(items[i][1] ? 'honeydew' : 'mistyrose');
    rect(bx, by, bw, bh, 8);
    noStroke();
    fill(items[i][1] ? 'darkgreen' : 'firebrick');
    textAlign(CENTER, CENTER);
    text(items[i][0] + ': ' + (items[i][1] ? 'yes' : 'no'), bx + bw / 2, by + bh / 2);
  }
  strokeWeight(1);
}

function niceLimit(v) {
  const steps = [1, 2, 3, 4, 5, 8, 10, 15, 20, 30, 40, 50, 80, 100];
  for (const s of steps) if (v <= s * 1.0001) return s;
  return Math.ceil(v / 50) * 50;
}

function drawPlot(p, curves, axisName, showTime, r) {
  // amplitude range from the data
  let peak = 0;
  for (const c of curves) peak = Math.max(peak, maxAbs(c.data));
  const lim = niceLimit(Math.max(peak, 1));
  const X = t => p.x + (t - VIEW_START) / (VIEW_END - VIEW_START) * p.w;
  const Y = v => p.y + p.h / 2 - (v / (lim * 1.15)) * (p.h / 2);

  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);

  textSize(12);
  for (const v of [-lim, -lim / 2, 0, lim / 2, lim]) {
    stroke(v === 0 ? 'gray' : 'gainsboro');
    line(p.x, Y(v), p.x + p.w, Y(v));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(v, p.x - 6, Y(v));
  }
  for (let t = VIEW_START; t <= VIEW_END; t += 2) {
    stroke(t === 0 ? 'gray' : 'gainsboro');
    line(X(t), p.y, X(t), p.y + p.h);
    if (showTime) {
      noStroke();
      fill('black');
      textAlign(CENTER, TOP);
      text(t, X(t), p.y + p.h + 5);
    }
  }
  noStroke();
  fill('black');
  if (showTime) {
    textSize(14);
    textAlign(CENTER, TOP);
    text('Time t (s)', p.x + p.w / 2, p.y + p.h + 20);
  }
  push();
  textSize(14);
  translate(16, p.y + p.h / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text(axisName, 0, 0);
  pop();

  // input bound for the stability test
  if (r.bound !== null && axisName === 'Input') {
    stroke('firebrick');
    drawingContext.setLineDash([3, 4]);
    line(p.x, Y(r.bound), p.x + p.w, Y(r.bound));
    line(p.x, Y(-r.bound), p.x + p.w, Y(-r.bound));
    drawingContext.setLineDash([]);
  }

  // curves
  const i0 = gridIndex(VIEW_START), i1 = gridIndex(VIEW_END);
  const stride = Math.max(1, Math.floor((i1 - i0) / (p.w * 2)));
  for (const c of curves) {
    stroke(c.color);
    strokeWeight(c.weight);
    noFill();
    if (c.dashed) drawingContext.setLineDash([7, 6]);
    beginShape();
    for (let i = i0; i <= i1; i += stride) vertex(X(gridTime(i)), Y(c.data[i]));
    endShape();
    drawingContext.setLineDash([]);
  }

  // causality test: mark t0 and highlight any output difference before it
  if (r.marker !== null) {
    stroke('black');
    strokeWeight(1);
    drawingContext.setLineDash([4, 4]);
    line(X(r.marker), p.y, X(r.marker), p.y + p.h);
    drawingContext.setLineDash([]);
    if (axisName === 'Output' && r.earlyDifference) {
      const d = r.earlyDifference;
      stroke('red');
      strokeWeight(5);
      drawingContext.globalAlpha = 0.5;
      for (let i = i0; i < gridIndex(d.until); i += stride) {
        if (Math.abs(d.a[i] - d.b[i]) > 1e-7) point(X(gridTime(i)), Y(d.b[i]));
      }
      drawingContext.globalAlpha = 1;
    }
    noStroke();
    fill('black');
    textSize(12);
    textAlign(LEFT, BOTTOM);
    text('t₀', X(r.marker) + 4, p.y + p.h - 3);
  }
  strokeWeight(1);

  // legend in the strip above the plot
  textSize(canvasWidth < 600 ? 11 : 13);
  let lx = p.x + 2;
  const ly = p.y - 10;
  for (const c of curves) {
    stroke(c.color);
    strokeWeight(Math.min(c.weight, 2.5));
    if (c.dashed) drawingContext.setLineDash([5, 4]);
    line(lx, ly, lx + 20, ly);
    drawingContext.setLineDash([]);
    noStroke();
    fill('black');
    textAlign(LEFT, CENTER);
    text(c.label, lx + 24, ly);
    lx += 26 + textWidth(c.label) + 12;
  }
  strokeWeight(1);
}

function drawExplanation(sys, testId, r) {
  const px = 10, py = 404, pw = canvasWidth - 20, ph = 90;
  fill(255, 255, 255, 230);
  stroke('silver');
  strokeWeight(1);
  rect(px, py, pw, ph, 10);

  const truth = sys[testId];
  const test = TESTS.find(t => t.id === testId);
  const narrow = canvasWidth < 600;
  let headline, headColor;
  if (testId === 'stable') {
    if (r.growing) headline = 'The output is still growing at t = 10 s. Its magnitude has reached ' + r.peak.toFixed(1) + ' for an input bounded by ' + r.bound.toFixed(1) + '.';
    else headline = 'The output stays bounded: its magnitude never exceeds ' + r.peak.toFixed(2) + ' for an input bounded by ' + r.bound.toFixed(1) + '.';
  } else if (testId === 'causal') {
    headline = r.agrees
      ? 'Outputs are identical up to t₀, where the inputs first differ.'
      : 'Outputs differ before t₀ (by up to ' + r.difference.toFixed(2) + ') although the inputs are identical until t₀.';
  } else {
    headline = r.agrees
      ? 'The two output curves match (maximum difference 0.00).'
      : 'The two output curves differ (maximum difference ' + r.difference.toFixed(2) + ').';
  }
  let verdict;
  if (truth) {
    verdict = 'PASS: ' + test.phrase + '.  ';
    headColor = 'darkgreen';
  } else if (r.agrees) {
    // a passing example can never prove a property; say so plainly
    verdict = 'Not ' + test.phrase + ', but these inputs do not show it. Try other slider values.  ';
    headColor = 'sienna';
  } else {
    verdict = 'FAIL: not ' + test.phrase + '.  ';
    headColor = 'firebrick';
  }

  noStroke();
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(narrow ? 12 : 14);
  fill(headColor);
  text(verdict + headline, px + 10, py + 8, pw - 20, 40);
  textStyle(NORMAL);
  fill('black');
  textSize(narrow ? 11 : 14);
  text('Why: ' + sys.why[testId], px + 10, py + 46, pw - 20, 44);
}

function drawControlLabels(testId, A, f, t0) {
  const narrow = canvasWidth < 600;
  const half = canvasWidth / 2;
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  textSize(narrow ? 13 : defaultTextSize);
  text('System:', 10, drawHeight + 17);
  text('Test:', half + 10, drawHeight + 17);
  text((narrow ? 'A: ' : 'Amplitude A: ') + A.toFixed(1), 10, drawHeight + 52);
  if (testId === 'stable') {
    fill('gray');
    text(narrow ? 'f: not used' : 'Frequency: not used', half + 10, drawHeight + 52);
    fill('black');
  } else {
    text((narrow ? 'f: ' : 'Frequency f: ') + f.toFixed(2) + ' Hz', half + 10, drawHeight + 52);
  }
  text((narrow ? 't₀: ' : 'Time shift t₀: ') + t0.toFixed(1) + ' s', 10, drawHeight + 87);
}

// ---------------------------------------------------------------------------
// Responsive layout
// ---------------------------------------------------------------------------

function positionControls() {
  const narrow = canvasWidth < 600;
  const half = canvasWidth / 2;
  const labelW = narrow ? 95 : sliderLeftMargin;
  const sliderW = Math.max(40, half - labelW - 12);
  systemSelect.position(narrow ? 65 : 75, drawHeight + 6);
  systemSelect.style('max-width', Math.max(80, half - (narrow ? 70 : 85)) + 'px');
  testSelect.position(half + (narrow ? 48 : 55), drawHeight + 6);
  testSelect.style('max-width', Math.max(80, half - 65) + 'px');
  ampSlider.position(labelW, drawHeight + 42);
  freqSlider.position(half + labelW, drawHeight + 42);
  shiftSlider.position(labelW, drawHeight + 77);
  [ampSlider, freqSlider, shiftSlider].forEach(s => s.size(sliderW));
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) {
    const w = Math.floor(container.getBoundingClientRect().width);
    if (w > 0) canvasWidth = w;
  }
}
