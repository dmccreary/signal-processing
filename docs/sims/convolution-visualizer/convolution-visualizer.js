// Convolution Visualizer MicroSim
// CANVAS_HEIGHT: 630
// Step-by-step "flip and slide" view of the convolution integral
//     y(t) = integral of x(tau) h(t - tau) d tau.
// The impulse response is time-reversed, shifted by t, multiplied by the input,
// and the area under the product is plotted as one point of the output y(t).

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 670;
let drawHeight = 550;
let controlHeight = 80;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 150;
let defaultTextSize = 16;

// ---- axes and numerical grid ----
const AXIS_START = -3;      // s, shared by the tau plot and the output plot
const AXIS_END = 7;
const SHAPE_START = -1;     // s, axis of the two small signal plots
const SHAPE_END = 5;
const D_TAU = 0.005;        // integration step (midpoint rule)
const TAU_START = -1;       // integration limits; every signal is zero before 0
const TAU_END = 16;
const T_STEP = 0.025;       // spacing of the precomputed output curve
const T_SLIDER_STEP = 0.05;
const NUDGE = 0.25;         // size of one "Step" button press, s

// ---- signal building blocks ----
function rectSignal(a, b, height) { return t => (t >= a && t < b) ? height : 0; }
function expSignal(rate) { return t => (t >= 0) ? Math.exp(-rate * t) : 0; }
function triSignal(a, b) {            // triangle from a to b with peak 1 at the middle
  const mid = (a + b) / 2, half = (b - a) / 2;
  return t => Math.max(0, 1 - Math.abs(t - mid) / half);
}
function sineBurst(f, a, b) { return t => (t >= a && t < b) ? Math.sin(2 * Math.PI * f * (t - a)) : 0; }
function edgeDetector() { return t => (t >= 0 && t < 0.5) ? 1 : ((t >= 0.5 && t < 1) ? -1 : 0); }

const PAIRS = [
  { id: 'rect-rect', label: 'Rectangle * Rectangle',
    x: rectSignal(0, 2, 1), h: rectSignal(0, 2, 1),
    note: 'Two equal rectangles give a triangle that peaks when they overlap completely.' },
  { id: 'wide-narrow', label: 'Wide rectangle * Narrow rectangle',
    x: rectSignal(0, 3, 1), h: rectSignal(0, 1, 1),
    note: 'Unequal rectangles give a trapezoid: flat while the narrow one is fully inside.' },
  { id: 'rect-exp', label: 'Rectangle * Exponential (RC filter)',
    x: rectSignal(0, 2, 1), h: expSignal(1),
    note: 'h(t) = e^(−t)u(t) smooths the pulse: the output charges up, then decays.' },
  { id: 'exp-exp', label: 'Exponential * Exponential',
    x: expSignal(1), h: expSignal(2),
    note: 'e^(−t)u(t) * e^(−2t)u(t) = (e^(−t) − e^(−2t))u(t), which peaks at t = ln 2.' },
  { id: 'tri-rect', label: 'Triangle * Rectangle',
    x: triSignal(0, 2), h: rectSignal(0, 1, 1),
    note: 'Averaging a triangle over 1 s rounds its corners and widens it.' },
  { id: 'tri-tri', label: 'Triangle * Triangle',
    x: triSignal(0, 2), h: triSignal(0, 2),
    note: 'Each convolution makes the result smoother and wider than either input.' },
  { id: 'sine-rect', label: 'Sine burst * Rectangle (averager)',
    x: sineBurst(1, 0, 3), h: rectSignal(0, 0.5, 2),
    note: 'A 0.5 s averager passes a 1 Hz sine with gain 0.64 and a 0.25 s delay.' },
  { id: 'rect-edge', label: 'Rectangle * Edge detector',
    x: rectSignal(0, 2, 1), h: edgeDetector(),
    note: 'This h(t) has zero area, so the output is zero wherever the input is constant.' }
];

// ---- controls and state ----
let pairSelect, playButton, backButton, forwardButton, resetButton, timeSlider, speedSlider;
let isRunning = false;        // MicroSims start paused
let playAccumulator = 0;
let pair = PAIRS[2];
let yCurve = [];              // precomputed output on the T_STEP grid
let ranges = {};              // axis ranges for the current pair

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  pairSelect = createSelect();
  for (const p of PAIRS) pairSelect.option(p.label, p.id);
  pairSelect.selected('rect-exp');   // the default pair makes the time reversal of h easy to see
  pairSelect.changed(selectPair);

  playButton = createButton('Play');
  playButton.mousePressed(togglePlay);
  backButton = createButton('< Step');
  backButton.mousePressed(() => nudgeTime(-NUDGE));
  forwardButton = createButton('Step >');
  forwardButton.mousePressed(() => nudgeTime(NUDGE));
  resetButton = createButton('Reset');
  resetButton.mousePressed(resetTime);

  timeSlider = createSlider(-2, AXIS_END, 1, T_SLIDER_STEP);
  speedSlider = createSlider(0.25, 3, 1, 0.25);

  const mainElement = document.querySelector('main');
  [pairSelect, playButton, backButton, forwardButton, resetButton, timeSlider, speedSlider]
    .forEach(c => c.parent(mainElement));
  positionControls();
  selectPair();

  describe('Flip-and-slide convolution. Top plots show the input x(t) and impulse response h(t). ' +
    'The middle plot shows x of tau, the flipped and shifted h of t minus tau, and their shaded product. ' +
    'The bottom plot traces the output y(t), the area of the product, as time t advances.', LABEL);
}

// ---------------------------------------------------------------------------
// Convolution
// ---------------------------------------------------------------------------

// y(t) = integral x(tau) h(t - tau) d tau by the midpoint rule.  Sampling at
// interval midpoints keeps the result exact for rectangular signals whose
// edges fall on multiples of D_TAU.
function convolveAt(x, h, t) {
  let area = 0;
  for (let tau = TAU_START + D_TAU / 2; tau < TAU_END; tau += D_TAU) {
    const xv = x(tau);
    if (xv !== 0) area += xv * h(t - tau);
  }
  return area * D_TAU;
}

function selectPair() {
  pair = PAIRS.find(p => p.id === pairSelect.value());
  yCurve = [];
  for (let t = AXIS_START; t <= AXIS_END + 1e-9; t += T_STEP) {
    const tt = Math.round(t / T_STEP) * T_STEP;
    yCurve.push({ t: tt, y: convolveAt(pair.x, pair.h, tt) });
  }
  ranges = {
    x: sampleRange(pair.x),
    h: sampleRange(pair.h),
    y: paddedRange(Math.min(0, ...yCurve.map(p => p.y)), Math.max(0, ...yCurve.map(p => p.y)))
  };
  // the tau plot holds x, h and their product, so its range must cover all three
  const rx = rawRange(pair.x), rh = rawRange(pair.h);
  const products = [rx.lo * rh.lo, rx.lo * rh.hi, rx.hi * rh.lo, rx.hi * rh.hi];
  ranges.mid = paddedRange(Math.min(rx.lo, rh.lo, ...products), Math.max(rx.hi, rh.hi, ...products));
}

function rawRange(fn) {
  let lo = 0, hi = 0;
  for (let t = SHAPE_START; t <= AXIS_END; t += 0.005) {
    const v = fn(t);
    lo = Math.min(lo, v); hi = Math.max(hi, v);
  }
  return { lo: lo, hi: hi };
}

function sampleRange(fn) {
  const r = rawRange(fn);
  return paddedRange(r.lo, r.hi);
}

function paddedRange(lo, hi) {
  if (hi - lo < 1e-9) hi = lo + 1;
  const pad = (hi - lo) * 0.15;
  return { lo: lo < 0 ? lo - pad : lo - pad * 0.3, hi: hi + pad };
}

function togglePlay() {
  isRunning = !isRunning;
  if (isRunning && timeSlider.value() >= AXIS_END - 1e-9) timeSlider.value(-2);
  playButton.html(isRunning ? 'Pause' : 'Play');
}

function nudgeTime(amount) {
  isRunning = false;
  playButton.html('Play');
  timeSlider.value(constrain(timeSlider.value() + amount, -2, AXIS_END));
}

function resetTime() {
  isRunning = false;
  playButton.html('Play');
  timeSlider.value(-2);
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

  // advance time while playing
  if (isRunning) {
    playAccumulator += (deltaTime / 1000) * speedSlider.value();
    while (playAccumulator >= T_SLIDER_STEP) {
      playAccumulator -= T_SLIDER_STEP;
      timeSlider.value(timeSlider.value() + T_SLIDER_STEP);
    }
    if (timeSlider.value() >= AXIS_END - 1e-9) {
      isRunning = false;
      playButton.html('Play');
    }
  }
  const t = Math.round(timeSlider.value() / T_SLIDER_STEP) * T_SLIDER_STEP;
  const yNow = convolveAt(pair.x, pair.h, t);

  const left = 46, right = 16;
  const colW = (canvasWidth - left - right - 46) / 2;
  const plotX = { x: left, y: 56, w: colW, h: 88 };
  const plotH = { x: left + colW + 46, y: 56, w: colW, h: 88 };
  const plotMid = { x: left, y: 190, w: canvasWidth - left - right, h: 138 };
  const plotOut = { x: left, y: 372, w: canvasWidth - left - right, h: 118 };

  drawShapePlot(plotX, pair.x, ranges.x, 'blue', 'Input x(t)');
  drawShapePlot(plotH, pair.h, ranges.h, 'red', 'Impulse response h(t)');
  drawSlidePlot(plotMid, t);
  drawOutputPlot(plotOut, t, yNow);

  // title
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(22);
  text('Convolution Visualizer', canvasWidth / 2, 8);

  // readout
  const narrow = canvasWidth < 600;
  textSize(narrow ? 12 : 15);
  textAlign(LEFT, TOP);
  fill('black');
  const yText = (Math.abs(yNow) < 0.0005 ? 0 : yNow).toFixed(3);
  text('At t = ' + t.toFixed(2) + ' s:  y(t) = ∫ x(τ)·h(t − τ) dτ = shaded area = ' + yText, 12, 512);
  fill('dimgray');
  textSize(narrow ? 11 : 13);
  text(pair.note, 12, 531);

  drawControlLabels(t);
}

function makeScale(p, x0, x1, range) {
  return {
    X: v => p.x + (v - x0) / (x1 - x0) * p.w,
    Y: v => p.y + p.h - (v - range.lo) / (range.hi - range.lo) * p.h
  };
}

function drawFrame(p, x0, x1, range, tickEvery) {
  const s = makeScale(p, x0, x1, range);
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(12);
  // amplitude ticks: zero and the largest round level that fits inside the range
  const yTicks = [0];
  const top = Math.max(range.hi, -range.lo) / 1.15;
  let level = Math.floor(top + 1e-6);
  if (level < 1) level = [0.5, 0.25, 0.2, 0.1, 0.05].find(v => v <= top + 1e-6) || top;
  yTicks.push(level);
  if (range.lo < -level * 0.5) yTicks.push(-level);
  for (const v of yTicks) {
    if (v < range.lo || v > range.hi) continue;
    stroke(v === 0 ? 'gray' : 'gainsboro');
    line(p.x, s.Y(v), p.x + p.w, s.Y(v));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(v, p.x - 5, s.Y(v));
  }
  for (let v = Math.ceil(x0); v <= x1; v += tickEvery) {
    stroke(v === 0 ? 'gray' : 'gainsboro');
    line(s.X(v), p.y, s.X(v), p.y + p.h);
    noStroke();
    fill('black');
    textAlign(CENTER, TOP);
    text(v, s.X(v), p.y + p.h + 4);
  }
  return s;
}

function traceFunction(p, s, fn, x0, x1, col, weight) {
  stroke(col);
  strokeWeight(weight);
  noFill();
  beginShape();
  const n = Math.max(300, Math.floor(p.w * 2));
  let prev = fn(x0);
  for (let i = 0; i <= n; i++) {
    const v = x0 + (x1 - x0) * i / n;
    const f = fn(v);
    if (Math.abs(f - prev) > 0.2) vertex(s.X(v), s.Y(prev));   // draw jumps as vertical edges
    vertex(s.X(v), s.Y(f));
    prev = f;
  }
  endShape();
  strokeWeight(1);
}

function caption(p, str, col) {
  noStroke();
  fill(col);
  textSize(canvasWidth < 600 ? 11 : 13);
  textStyle(BOLD);
  textAlign(LEFT, BOTTOM);
  text(str, p.x, p.y - 4);
  textStyle(NORMAL);
}

function drawShapePlot(p, fn, range, col, name) {
  const s = drawFrame(p, SHAPE_START, SHAPE_END, range, 1);
  traceFunction(p, s, fn, SHAPE_START, SHAPE_END, col, 2.5);
  caption(p, name, col);
  noStroke();
  fill('black');
  textSize(12);
  textAlign(RIGHT, BOTTOM);
  text('t (s)', p.x + p.w, p.y - 4);
}

function drawSlidePlot(p, t) {
  const s = drawFrame(p, AXIS_START, AXIS_END, ranges.mid, 1);
  const flipped = tau => pair.h(t - tau);          // h(t - tau): flipped, then shifted by t
  const product = tau => pair.x(tau) * flipped(tau);

  // shaded product: its signed area is y(t)
  const n = Math.max(400, Math.floor(p.w * 2));
  noStroke();
  const zeroY = s.Y(0);
  const stripW = p.w / n + 0.6;
  for (let i = 0; i < n; i++) {
    const tau = AXIS_START + (AXIS_END - AXIS_START) * (i + 0.5) / n;
    const v = product(tau);
    if (v === 0) continue;
    fill(v > 0 ? 'mediumseagreen' : 'salmon');
    const yv = s.Y(constrain(v, ranges.mid.lo, ranges.mid.hi));
    rect(s.X(tau) - stripW / 2, Math.min(yv, zeroY), stripW, Math.abs(yv - zeroY));
  }
  traceFunction(p, s, product, AXIS_START, AXIS_END, 'darkgreen', 1.5);
  traceFunction(p, s, pair.x, AXIS_START, AXIS_END, 'blue', 2.5);
  traceFunction(p, s, flipped, AXIS_START, AXIS_END, 'red', 2.5);

  // marker at tau = t, where the origin of h has moved to
  stroke('black');
  drawingContext.setLineDash([4, 4]);
  line(s.X(t), p.y, s.X(t), p.y + p.h);
  drawingContext.setLineDash([]);
  noStroke();
  fill('black');
  textSize(12);
  textAlign(LEFT, TOP);
  text('τ = t', s.X(t) + 4, p.y + 3);

  // legend strip above the plot
  const narrow = canvasWidth < 600;
  textSize(narrow ? 10 : 13);
  let lx = p.x;
  const ly = p.y - 11;
  const items = [
    ['x(τ)', 'blue'],
    [narrow ? 'h(t − τ), flipped' : 'h(t − τ): flipped, then shifted by t', 'red'],
    [narrow ? 'product' : 'product x(τ)·h(t − τ)', 'mediumseagreen']
  ];
  for (const it of items) {
    noStroke();
    fill(it[1]);
    rect(lx, ly - 5, 14, 10);
    fill('black');
    textAlign(LEFT, CENTER);
    text(it[0], lx + 18, ly);
    lx += 18 + textWidth(it[0]) + 14;
  }
  textSize(12);
  textAlign(RIGHT, CENTER);
  text('τ (s)', p.x + p.w, ly);
}

function drawOutputPlot(p, t, yNow) {
  const s = drawFrame(p, AXIS_START, AXIS_END, ranges.y, 1);
  // output traced up to the present time
  stroke('purple');
  strokeWeight(2.5);
  noFill();
  beginShape();
  for (const pt of yCurve) {
    if (pt.t > t + 1e-9) break;
    vertex(s.X(pt.t), s.Y(pt.y));
  }
  endShape();
  strokeWeight(1);

  stroke('black');
  drawingContext.setLineDash([4, 4]);
  line(s.X(t), p.y, s.X(t), p.y + p.h);
  drawingContext.setLineDash([]);
  fill('purple');
  stroke('white');
  circle(s.X(t), s.Y(yNow), 10);

  caption(p, 'Output y(t) = x(t) * h(t), traced up to the current time', 'purple');
  noStroke();
  fill('black');
  textSize(12);
  textAlign(RIGHT, BOTTOM);
  text('t (s)', p.x + p.w, p.y - 4);
}

function drawControlLabels(t) {
  const narrow = canvasWidth < 600;
  const half = canvasWidth / 2;
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  textSize(narrow ? 13 : defaultTextSize);
  text(narrow ? 'x * h:' : 'Signals:', 10, drawHeight + 17);
  text((narrow ? 't: ' : 'Time t: ') + t.toFixed(2) + ' s', 10, drawHeight + 52);
  text((narrow ? 'Speed: ' : 'Play speed: ') + speedSlider.value().toFixed(2) + '×', half + 10, drawHeight + 52);
}

// ---------------------------------------------------------------------------
// Responsive layout
// ---------------------------------------------------------------------------

function positionControls() {
  const narrow = canvasWidth < 600;
  const half = canvasWidth / 2;
  backButton.html(narrow ? '<' : '< Step');
  forwardButton.html(narrow ? '>' : 'Step >');
  // buttons are right-aligned on the first row
  const widths = narrow ? [52, 28, 28, 52] : [56, 62, 62, 56];
  let bx = canvasWidth - 10 - widths.reduce((a, b) => a + b + 6, 0);
  const selectLeft = narrow ? 58 : 75;
  pairSelect.position(selectLeft, drawHeight + 6);
  pairSelect.style('max-width', Math.max(70, bx - selectLeft - 10) + 'px');
  [playButton, backButton, forwardButton, resetButton].forEach((b, i) => {
    b.position(bx, drawHeight + 5);
    b.size(widths[i]);
    bx += widths[i] + 6;
  });
  const labelW = narrow ? 85 : sliderLeftMargin;
  timeSlider.position(labelW, drawHeight + 42);
  timeSlider.size(Math.max(40, half - labelW - 12));
  const labelW2 = narrow ? 105 : sliderLeftMargin + 15;
  speedSlider.position(half + labelW2, drawHeight + 42);
  speedSlider.size(Math.max(40, half - labelW2 - 12));
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
