// Signal Type Explorer MicroSim
// CANVAS_HEIGHT: 590
// Compare continuous-time x(t) and discrete-time x[n] views of four basic
// signals (sinusoid, square wave, decaying exponential, unit step) while
// adjusting amplitude, frequency and phase, and applying the time-shift and
// time-scale operations y(t) = x(a(t - t0)).  Energy, average power and RMS
// amplitude are computed from closed-form results, not estimated from the plot.

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 670;
let drawHeight = 440;
let controlHeight = 150;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 165;
let defaultTextSize = 16;

// ---- plot window ----
const T_MIN = -2;      // seconds
const T_MAX = 2;       // seconds
const Y_LIMIT = 5.5;   // amplitude axis is fixed so amplitude changes are visible
const TS = 0.05;       // sampling period used for the discrete-time view (s)
const N_MAX = Math.round(T_MAX / TS);   // samples run from n = -40 to n = 40

// ---- controls ----
let typeSelect, viewSelect, reverseCheckbox, pinButton, clearButton;
let ampSlider, freqSlider, phaseSlider, shiftSlider, scaleSlider;

// pinned comparison signals (up to three, plus the current one = four traces)
let pinned = [];
const TRACE_COLORS = ['blue', 'darkorange', 'mediumvioletred', 'teal'];

const TYPE_LABELS = {
  sinusoid: 'Sinusoid',
  square: 'Square wave',
  exponential: 'Exponential',
  step: 'Step function'
};

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  typeSelect = createSelect();
  typeSelect.option('Sinusoid', 'sinusoid');
  typeSelect.option('Square wave', 'square');
  typeSelect.option('Exponential', 'exponential');
  typeSelect.option('Step function', 'step');
  typeSelect.selected('sinusoid');

  viewSelect = createSelect();
  viewSelect.option('Continuous-time x(t)', 'ct');
  viewSelect.option('Discrete-time x[n]', 'dt');
  viewSelect.option('Both', 'both');
  viewSelect.selected('both');

  ampSlider = createSlider(0, 5, 2, 0.1);
  freqSlider = createSlider(0.1, 10, 1, 0.1);
  phaseSlider = createSlider(0, 360, 0, 5);
  shiftSlider = createSlider(-1.5, 1.5, 0, 0.1);
  scaleSlider = createSlider(0.25, 4, 1, 0.25);

  reverseCheckbox = createCheckbox(' Reverse', false);
  pinButton = createButton('Pin');
  pinButton.mousePressed(pinCurrentSignal);
  clearButton = createButton('Clear');
  clearButton.mousePressed(() => { pinned = []; });

  const mainElement = document.querySelector('main');
  [typeSelect, viewSelect, ampSlider, freqSlider, phaseSlider, shiftSlider,
    scaleSlider, reverseCheckbox, pinButton, clearButton].forEach(c => c.parent(mainElement));

  positionControls();

  describe('Plot of a sinusoid, square wave, decaying exponential or step function shown as a ' +
    'continuous-time curve and as discrete-time samples, with sliders for amplitude, frequency, ' +
    'phase, time shift and time scale, and a table of energy, average power and RMS amplitude.', LABEL);
}

// ---------------------------------------------------------------------------
// Signal model
// ---------------------------------------------------------------------------

// Base signal x(t).  For the exponential the "frequency" slider is the decay
// rate alpha in 1/s:  x(t) = A e^(-alpha t) u(t).
function baseSignal(type, t, A, f, phiRad) {
  if (Math.abs(t) < 1e-9) t = 0;   // keep u(0) = 1 despite floating-point round-off
  switch (type) {
    case 'sinusoid':
      return A * Math.cos(2 * Math.PI * f * t + phiRad);
    case 'square':
      return Math.cos(2 * Math.PI * f * t + phiRad) >= -1e-9 ? A : -A;
    case 'exponential':
      return t >= 0 ? A * Math.exp(-f * t) : 0;
    case 'step':
      return t >= 0 ? A : 0;
  }
  return 0;
}

// Plotted signal after the time operations: y(t) = x(a (t - t0)).
// a > 1 compresses, 0 < a < 1 expands, a < 0 reverses time; t0 > 0 delays.
function signalValue(p, t) {
  return baseSignal(p.type, p.a * (t - p.t0), p.A, p.f, p.phi * Math.PI / 180);
}

function currentParams() {
  const mag = scaleSlider.value();
  return {
    type: typeSelect.value(),
    A: ampSlider.value(),
    f: freqSlider.value(),
    phi: phaseSlider.value(),
    t0: shiftSlider.value(),
    a: reverseCheckbox.checked() ? -mag : mag
  };
}

// Closed-form energy and average power of the continuous-time signal y(t).
//   E = integral of |y(t)|^2 dt,   P = lim (1/2T) integral over [-T, T]
function continuousMeasures(p) {
  const A2 = p.A * p.A;
  let E = Infinity, P = 0;
  if (p.A === 0) {
    E = 0; P = 0;
  } else if (p.type === 'sinusoid') {
    P = A2 / 2;                               // mean of cos^2 is 1/2
  } else if (p.type === 'square') {
    P = A2;                                   // |y(t)| = A at all times
  } else if (p.type === 'step') {
    P = A2 / 2;                               // on for half of all time
  } else {                                    // exponential
    E = A2 / (2 * p.f * Math.abs(p.a));       // A^2 / (2 alpha |a|)
    P = 0;
  }
  return { E: E, P: P, rms: Math.sqrt(P) };
}

// Closed-form energy and average power of the samples x[n] = y(n Ts).
//   E = sum of |x[n]|^2,   P = lim 1/(2N+1) sum over n = -N..N
function discreteMeasures(p) {
  const A2 = p.A * p.A;
  let E = Infinity, P = 0;
  if (p.A === 0) {
    E = 0; P = 0;
  } else if (p.type === 'sinusoid') {
    // x[n] = A cos(Omega n + theta)
    const Omega = 2 * Math.PI * p.f * p.a * TS;
    const theta = p.phi * Math.PI / 180 - 2 * Math.PI * p.f * p.a * p.t0;
    if (Math.abs(Math.sin(Omega)) < 1e-9) {
      // Omega is a multiple of pi: every sample is +/- A cos(theta)
      P = A2 * Math.cos(theta) * Math.cos(theta);
      if (P < 1e-12) { P = 0; E = 0; }
    } else {
      P = A2 / 2;
    }
  } else if (p.type === 'square') {
    P = A2;
  } else if (p.type === 'step') {
    P = A2 / 2;
  } else {
    // exponential: geometric series starting at the first non-zero sample
    const absA = Math.abs(p.a);
    let firstArg;
    if (p.a > 0) {
      const n0 = Math.ceil(p.t0 / TS - 1e-9);
      firstArg = absA * (n0 * TS - p.t0);
    } else {
      const n1 = Math.floor(p.t0 / TS + 1e-9);
      firstArg = absA * (p.t0 - n1 * TS);
    }
    if (firstArg < 0) firstArg = 0;
    E = A2 * Math.exp(-2 * p.f * firstArg) / (1 - Math.exp(-2 * p.f * absA * TS));
    P = 0;
  }
  return { E: E, P: P, rms: Math.sqrt(P) };
}

function classify(m) {
  if (m.E === 0) return 'Zero signal';
  if (isFinite(m.E)) return 'Energy signal';
  return 'Power signal';
}

function pinCurrentSignal() {
  if (pinned.length >= 3) pinned.shift();
  pinned.push(currentParams());
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

  const p = currentParams();
  const view = viewSelect.value();
  const usesFreq = p.type !== 'step';
  const usesPhase = p.type === 'sinusoid' || p.type === 'square';
  setEnabled(freqSlider, usesFreq);
  setEnabled(phaseSlider, usesPhase);

  // plot rectangle
  const plot = { x: 58, y: 44, w: canvasWidth - 58 - 20, h: 212 };
  drawPlotFrame(plot, view);

  // title drawn after the grid
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(22);
  text('Signal Type Explorer', canvasWidth / 2, 10);

  // pinned comparison signals first, current signal on top
  for (let i = 0; i < pinned.length; i++) {
    drawSignal(plot, pinned[i], TRACE_COLORS[i + 1], view, false);
  }
  drawSignal(plot, p, TRACE_COLORS[0], view, true);

  // warning when the samples can no longer follow the waveform
  if (view !== 'ct' && usesPhase && p.f * Math.abs(p.a) > 0.5 / TS + 1e-9) {
    noStroke();
    fill('firebrick');
    textAlign(CENTER, TOP);
    textSize(13);
    text('Fewer than 2 samples per cycle: the samples no longer follow x(t) (aliasing, Chapter 5)',
      plot.x + plot.w / 2, plot.y + 4);
  }

  drawInfoPanel(p, view);
  drawControlLabels(p, usesFreq, usesPhase);
}

function plotX(plot, t) { return plot.x + (t - T_MIN) / (T_MAX - T_MIN) * plot.w; }
function plotY(plot, v) { return plot.y + plot.h / 2 - (v / Y_LIMIT) * (plot.h / 2); }

function drawPlotFrame(plot, view) {
  // plot background
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(plot.x, plot.y, plot.w, plot.h);

  // horizontal grid and amplitude tick labels
  textSize(12);
  for (let v = -4; v <= 4; v += 2) {
    const y = plotY(plot, v);
    stroke(v === 0 ? 'gray' : 'gainsboro');
    line(plot.x, y, plot.x + plot.w, y);
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(v, plot.x - 6, y);
  }
  // vertical grid and time (or sample index) tick labels
  for (let t = T_MIN; t <= T_MAX + 1e-9; t += 0.5) {
    const x = plotX(plot, t);
    stroke(Math.abs(t) < 1e-9 ? 'gray' : 'gainsboro');
    line(x, plot.y, x, plot.y + plot.h);
    noStroke();
    fill('black');
    textAlign(CENTER, TOP);
    const label = (view === 'dt') ? Math.round(t / TS) : t.toFixed(1);
    text(label, x, plot.y + plot.h + 5);
  }
  // axis labels
  noStroke();
  fill('black');
  textSize(14);
  textAlign(CENTER, TOP);
  const xLabel = (view === 'dt')
    ? 'Sample index n  (sampling period Ts = ' + TS.toFixed(2) + ' s)'
    : 'Time t (s)';
  text(xLabel, plot.x + plot.w / 2, plot.y + plot.h + 21);
  push();
  translate(16, plot.y + plot.h / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text('Amplitude', 0, 0);
  pop();
}

function drawSignal(plot, p, col, view, isCurrent) {
  // continuous-time curve
  if (view === 'ct' || view === 'both') {
    stroke(col);
    strokeWeight(isCurrent ? 2 : 1.5);
    noFill();
    if (view === 'both') drawingContext.globalAlpha = 0.45;
    beginShape();
    const steps = Math.max(400, Math.floor(plot.w * 2));
    for (let i = 0; i <= steps; i++) {
      const t = T_MIN + (T_MAX - T_MIN) * i / steps;
      vertex(plotX(plot, t), plotY(plot, signalValue(p, t)));
    }
    endShape();
    drawingContext.globalAlpha = 1;
  }
  // discrete-time stems x[n] = y(n Ts)
  if (view === 'dt' || view === 'both') {
    const zeroY = plotY(plot, 0);
    for (let n = -N_MAX; n <= N_MAX; n++) {
      const x = plotX(plot, n * TS);
      const y = plotY(plot, signalValue(p, n * TS));
      stroke(col);
      strokeWeight(1);
      if (isCurrent) line(x, zeroY, x, y);
      noStroke();
      fill(col);
      circle(x, y, isCurrent ? 5 : 4);
    }
  }
  strokeWeight(1);
}

function formatMeasure(v) {
  if (!isFinite(v)) return '∞';
  if (v === 0) return '0';
  if (v >= 100) return v.toFixed(1);
  return v.toFixed(2);
}

function formulaText(p) {
  switch (p.type) {
    case 'sinusoid': return 'x(t) = A·cos(2πft + φ)';
    case 'square': return 'x(t) = A·sgn[cos(2πft + φ)]';
    case 'exponential': return 'x(t) = A·e^(−αt)·u(t)';
    case 'step': return 'x(t) = A·u(t)';
  }
  return '';
}

function drawInfoPanel(p, view) {
  const px = 10, py = 300, pw = canvasWidth - 20, ph = 132;
  fill(255, 255, 255, 230);
  stroke('silver');
  strokeWeight(1);
  rect(px, py, pw, ph, 10);

  const narrow = canvasWidth < 560;
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  textSize(narrow ? 12 : 14);
  const op = 'plotted: x(a(t − t₀)),  a = ' + p.a.toFixed(2) + ',  t₀ = ' + p.t0.toFixed(1) + ' s';
  text(formulaText(p) + '      ' + op, px + 10, py + 15);

  // measurement table
  const cols = [0.02, 0.33, 0.50, 0.65, 0.78].map(f => px + f * pw);
  const headY = py + 40;
  textStyle(BOLD);
  textSize(narrow ? 12 : 14);
  text('Signal view', cols[0], headY);
  text('Energy E', cols[1], headY);
  text('Power P', cols[2], headY);
  text('RMS', cols[3], headY);
  text('Class', cols[4], headY);
  textStyle(NORMAL);
  stroke('silver');
  line(px + 8, headY + 11, px + pw - 8, headY + 11);

  const rows = [];
  if (view !== 'dt') rows.push([narrow ? 'x(t)' : 'Continuous-time x(t)', continuousMeasures(p)]);
  if (view !== 'ct') rows.push([narrow ? 'x[n]' : 'Discrete-time x[n]', discreteMeasures(p)]);
  for (let r = 0; r < rows.length; r++) {
    const y = headY + 24 + r * 21;
    const m = rows[r][1];
    noStroke();
    fill('black');
    text(rows[r][0], cols[0], y);
    text(formatMeasure(m.E), cols[1], y);
    text(formatMeasure(m.P), cols[2], y);
    text(formatMeasure(m.rms), cols[3], y);
    fill(isFinite(m.E) ? 'darkgreen' : 'navy');
    text(classify(m), cols[4], y);
  }

  // legend of the traces on the plot
  const legendY = py + ph - 16;
  let lx = px + 10;
  textSize(narrow ? 11 : 13);
  const entries = [['Current: ' + TYPE_LABELS[p.type], TRACE_COLORS[0]]];
  for (let i = 0; i < pinned.length; i++) {
    entries.push(['Pinned ' + (i + 1) + ': ' + TYPE_LABELS[pinned[i].type], TRACE_COLORS[i + 1]]);
  }
  for (const e of entries) {
    noStroke();
    fill(e[1]);
    rect(lx, legendY - 5, 12, 10);
    fill('black');
    text(e[0], lx + 16, legendY);
    lx += 16 + textWidth(e[0]) + 14;
  }
}

function drawControlLabels(p, usesFreq, usesPhase) {
  const narrow = canvasWidth < 560;
  const half = canvasWidth / 2;
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(narrow ? 13 : defaultTextSize);
  fill('black');

  // row 0: selects
  text('Signal:', 10, drawHeight + 17);
  text('View:', half + 10, drawHeight + 17);

  // row 1: amplitude | frequency
  text((narrow ? 'A: ' : 'Amplitude A: ') + p.A.toFixed(1), 10, drawHeight + 52);
  if (p.type === 'exponential') {
    text((narrow ? 'α: ' : 'Decay rate α: ') + p.f.toFixed(1) + ' /s', half + 10, drawHeight + 52);
  } else if (usesFreq) {
    text((narrow ? 'f: ' : 'Frequency f: ') + p.f.toFixed(1) + ' Hz', half + 10, drawHeight + 52);
  } else {
    fill('gray');
    text(narrow ? 'f: not used' : 'Frequency: not used', half + 10, drawHeight + 52);
    fill('black');
  }

  // row 2: phase | time shift
  if (usesPhase) {
    text((narrow ? 'φ: ' : 'Phase φ: ') + p.phi + '°', 10, drawHeight + 87);
  } else {
    fill('gray');
    text(narrow ? 'φ: not used' : 'Phase: not used', 10, drawHeight + 87);
    fill('black');
  }
  text((narrow ? 't₀: ' : 'Time shift t₀: ') + p.t0.toFixed(1) + ' s', half + 10, drawHeight + 87);

  // row 3: time scale
  text((narrow ? 'a: ' : 'Time scale a: ') + p.a.toFixed(2), 10, drawHeight + 122);
}

function setEnabled(control, enabled) {
  if (enabled) control.removeAttribute('disabled');
  else control.attribute('disabled', '');
}

// ---------------------------------------------------------------------------
// Responsive layout
// ---------------------------------------------------------------------------

function positionControls() {
  const narrow = canvasWidth < 560;
  const half = canvasWidth / 2;
  const labelW = narrow ? 95 : sliderLeftMargin;
  const sliderW = Math.max(40, half - labelW - 12);

  typeSelect.position(narrow ? 60 : 70, drawHeight + 6);
  viewSelect.position(half + (narrow ? 50 : 58), drawHeight + 6);
  viewSelect.style('max-width', Math.max(90, half - 70) + 'px');

  ampSlider.position(labelW, drawHeight + 42);
  freqSlider.position(half + labelW, drawHeight + 42);
  phaseSlider.position(labelW, drawHeight + 77);
  shiftSlider.position(half + labelW, drawHeight + 77);
  scaleSlider.position(labelW, drawHeight + 112);
  [ampSlider, freqSlider, phaseSlider, shiftSlider, scaleSlider].forEach(s => s.size(sliderW));

  reverseCheckbox.position(half + 8, drawHeight + 112);
  reverseCheckbox.style('font-size', narrow ? '13px' : '16px');
  pinButton.position(half + (narrow ? 92 : 110), drawHeight + 111);
  clearButton.position(half + (narrow ? 134 : 158), drawHeight + 111);
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
