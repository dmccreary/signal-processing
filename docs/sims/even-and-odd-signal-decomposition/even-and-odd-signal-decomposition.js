// Even and Odd Signal Decomposition MicroSim
// CANVAS_HEIGHT: 560
// Splits a signal x(t) into its even part x_e(t) = [x(t) + x(-t)]/2 and its
// odd part x_o(t) = [x(t) - x(-t)]/2 and shows that x_e(t) + x_o(t) = x(t).
// The signal can be a preset waveform or drawn by dragging in the top plot.

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 670;
let drawHeight = 480;
let controlHeight = 80;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 165;
let defaultTextSize = 16;

// ---- time grid: t = -5 ... +5 s, symmetric about t = 0 ----
const T_LIMIT = 5;
const DT = 0.01;
const N = Math.round(2 * T_LIMIT / DT) + 1;   // 1001 samples; index N-1-i holds -t
const Y_LIMIT = 1.3;                          // plot range
const DRAW_LIMIT = 1.25;                      // range for hand-drawn values

let x = new Array(N).fill(0);    // original signal
let xe = new Array(N).fill(0);   // even part
let xo = new Array(N).fill(0);   // odd part

// ---- controls ----
let signalSelect, sumCheckbox, clearButton, shiftSlider, probeSlider;

// ---- mouse drawing state ----
let drawing = false;
let lastIndex = -1;
let lastValue = 0;
let plots = [];   // three plot rectangles, rebuilt each frame

const DEFAULT_SHIFT = { pulse: 1, triangle: 1, sawtooth: 0.5, exponential: 0 };

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  signalSelect = createSelect();
  signalSelect.option('Pulse', 'pulse');
  signalSelect.option('Triangle', 'triangle');
  signalSelect.option('Sawtooth', 'sawtooth');
  signalSelect.option('Exponential', 'exponential');
  signalSelect.option('Custom (draw)', 'custom');
  signalSelect.selected('pulse');
  signalSelect.changed(onSignalChanged);

  sumCheckbox = createCheckbox(' Show sum', true);
  clearButton = createButton('Clear');
  clearButton.mousePressed(clearSignal);

  shiftSlider = createSlider(-3, 3, DEFAULT_SHIFT.pulse, 0.1);
  shiftSlider.input(buildPreset);
  probeSlider = createSlider(-T_LIMIT, T_LIMIT, 1, 0.1);

  const mainElement = document.querySelector('main');
  [signalSelect, sumCheckbox, clearButton, shiftSlider, probeSlider].forEach(c => c.parent(mainElement));
  positionControls();
  buildPreset();

  describe('Three stacked plots from minus five to plus five seconds showing a signal, its even part ' +
    'and its odd part, with a probe time whose values are worked through the decomposition formulas. ' +
    'The signal is chosen from presets or drawn with the mouse.', LABEL);
}

// ---------------------------------------------------------------------------
// Signal model
// ---------------------------------------------------------------------------

function timeAt(i) { return -T_LIMIT + i * DT; }
function indexAt(t) { return constrain(Math.round((t + T_LIMIT) / DT), 0, N - 1); }

// Preset waveforms, each written in terms of u = t - t0 so the shift slider
// moves the waveform along the time axis.  At a jump the sample takes the
// midpoint value, which keeps the even and odd parts free of one-sample spikes.
function presetValue(kind, u) {
  switch (kind) {
    case 'pulse': {      // rectangular pulse, width 2 s, centered on u = 0
      const d = Math.abs(u) - 1;
      if (Math.abs(d) < 1e-9) return 0.5;             // midpoint value at each edge
      return d < 0 ? 1 : 0;
    }
    case 'triangle':     // triangular pulse, base 4 s, centered on u = 0
      return Math.max(0, 1 - Math.abs(u) / 2);
    case 'sawtooth': {   // period 4 s, rises from -1 to +1, passes through 0 at u = 0
      let frac = ((u + 2) / 4) % 1;
      if (frac < 0) frac += 1;
      if (frac < 1e-9 || frac > 1 - 1e-9) return 0;   // midpoint value at each jump
      return 2 * frac - 1;
    }
    case 'exponential':  // one-sided decaying exponential e^(-u) u(u)
      if (Math.abs(u) < 1e-9) return 0.5;             // midpoint value at the jump
      return u > 0 ? Math.exp(-u) : 0;
  }
  return 0;
}

function buildPreset() {
  const kind = signalSelect.value();
  if (kind === 'custom') return;
  const t0 = shiftSlider.value();
  for (let i = 0; i < N; i++) x[i] = presetValue(kind, timeAt(i) - t0);
  decompose();
}

// The decomposition itself.  Because the grid is symmetric, x(-t) for the
// sample at index i is simply the sample at index N-1-i.
function decompose() {
  for (let i = 0; i < N; i++) {
    const xt = x[i];
    const xMinusT = x[N - 1 - i];
    xe[i] = (xt + xMinusT) / 2;
    xo[i] = (xt - xMinusT) / 2;
  }
}

function energy(arr) {
  let s = 0;
  for (let i = 0; i < N; i++) s += arr[i] * arr[i];
  return s * DT;
}

function onSignalChanged() {
  const kind = signalSelect.value();
  if (kind !== 'custom') {
    shiftSlider.value(DEFAULT_SHIFT[kind]);
    buildPreset();
  }
}

function clearSignal() {
  signalSelect.selected('custom');
  x.fill(0);
  decompose();
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

  const isCustom = signalSelect.value() === 'custom';
  if (isCustom) shiftSlider.attribute('disabled', '');
  else shiftSlider.removeAttribute('disabled');

  const px = 58, pw = canvasWidth - 58 - 20, ph = 96;
  plots = [
    { x: px, y: 40, w: pw, h: ph },
    { x: px, y: 148, w: pw, h: ph },
    { x: px, y: 256, w: pw, h: ph }
  ];
  const probeT = probeSlider.value();
  const ip = indexAt(probeT);

  for (let k = 0; k < 3; k++) drawPlotFrame(plots[k], k === 2);

  // title
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(22);
  text('Even and Odd Signal Decomposition', canvasWidth / 2, 9);

  // curves
  drawCurve(plots[0], x, 'blue', 2.5, false);
  if (sumCheckbox.checked()) {
    const sum = xe.map((v, i) => v + xo[i]);
    drawCurve(plots[0], sum, 'purple', 1.5, true);
  }
  drawCurve(plots[1], xe, 'green', 2.5, false);
  drawCurve(plots[2], xo, 'red', 2.5, false);

  // probe markers at t and at -t
  drawProbe(plots[0], x, ip, 'blue');
  drawProbe(plots[1], xe, ip, 'green');
  drawProbe(plots[2], xo, ip, 'red');

  // plot captions (on a translucent backing so they stay readable over a curve)
  textSize(canvasWidth < 600 ? 12 : 14);
  textAlign(LEFT, TOP);
  let capW = caption('Original x(t)', plots[0].x + 6, plots[0].y + 4, 'blue');
  if (sumCheckbox.checked()) {
    caption('sum x_{e}(t) + x_{o}(t) (dashed)', plots[0].x + 6 + capW + 6, plots[0].y + 4, 'purple');
  }
  caption('Even part x_{e}(t) = [x(t) + x(−t)] / 2', plots[1].x + 6, plots[1].y + 4, 'green');
  caption('Odd part x_{o}(t) = [x(t) − x(−t)] / 2', plots[2].x + 6, plots[2].y + 4, 'red');

  textSize(12);
  const hint = canvasWidth < 600 ? 'Drag here to draw x(t)' : 'Drag in this plot to draw a custom x(t)';
  const hintW = textWidth(hint) + 8;
  noStroke();
  fill(255, 255, 255, 200);
  rect(plots[0].x + plots[0].w - hintW - 4, plots[0].y + plots[0].h - 20, hintW, 17, 4);
  fill('dimgray');
  textAlign(RIGHT, BOTTOM);
  text(hint, plots[0].x + plots[0].w - 8, plots[0].y + plots[0].h - 5);

  drawCalculationPanel(probeT, ip);
  drawControlLabels(probeT, isCustom);
}

function plotX(p, t) { return p.x + (t + T_LIMIT) / (2 * T_LIMIT) * p.w; }
function plotY(p, v) { return p.y + p.h / 2 - (v / Y_LIMIT) * (p.h / 2); }

function drawPlotFrame(p, showTimeLabels) {
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(12);
  for (let v = -1; v <= 1; v++) {
    const y = plotY(p, v);
    stroke(v === 0 ? 'gray' : 'gainsboro');
    line(p.x, y, p.x + p.w, y);
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(v, p.x - 6, y);
  }
  for (let t = -T_LIMIT; t <= T_LIMIT; t++) {
    const xx = plotX(p, t);
    stroke(t === 0 ? 'gray' : 'gainsboro');
    strokeWeight(t === 0 ? 1.5 : 1);
    line(xx, p.y, xx, p.y + p.h);
    strokeWeight(1);
    if (showTimeLabels) {
      noStroke();
      fill('black');
      textAlign(CENTER, TOP);
      text(t, xx, p.y + p.h + 5);
    }
  }
  if (showTimeLabels) {
    noStroke();
    fill('black');
    textSize(14);
    textAlign(CENTER, TOP);
    text('Time t (s)', p.x + p.w / 2, p.y + p.h + 20);
  }
  // shared amplitude label
  push();
  noStroke();
  fill('black');
  textSize(13);
  translate(16, p.y + p.h / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text('Amplitude', 0, 0);
  pop();
}

function drawCurve(p, arr, col, weight, dashed) {
  stroke(col);
  strokeWeight(weight);
  noFill();
  if (dashed) drawingContext.setLineDash([7, 5]);
  beginShape();
  for (let i = 0; i < N; i++) vertex(plotX(p, timeAt(i)), plotY(p, constrain(arr[i], -Y_LIMIT, Y_LIMIT)));
  endShape();
  drawingContext.setLineDash([]);
  strokeWeight(1);
}

function drawProbe(p, arr, ip, col) {
  const im = N - 1 - ip;
  // solid marker at t, lighter marker at -t
  stroke('black');
  strokeWeight(1);
  drawingContext.setLineDash([4, 4]);
  line(plotX(p, timeAt(ip)), p.y, plotX(p, timeAt(ip)), p.y + p.h);
  stroke('darkgray');
  line(plotX(p, timeAt(im)), p.y, plotX(p, timeAt(im)), p.y + p.h);
  drawingContext.setLineDash([]);
  stroke('black');
  fill('white');
  circle(plotX(p, timeAt(im)), plotY(p, arr[im]), 8);
  fill(col);
  circle(plotX(p, timeAt(ip)), plotY(p, arr[ip]), 9);
}

// Draws text containing _{...} subscript markers.  Left/top aligned.
function richText(str, xPos, yPos, col) {
  const size = textSize();
  const parts = str.split(/_\{(.*?)\}/);   // odd entries are subscripts
  let cx = xPos;
  noStroke();
  fill(col);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      textSize(size * 0.72);
      text(parts[i], cx, yPos + size * 0.42);
      cx += textWidth(parts[i]);
      textSize(size);
    } else {
      text(parts[i], cx, yPos);
      cx += textWidth(parts[i]);
    }
  }
  return cx - xPos;
}

// Width of a string that may contain _{...} subscript markers.
function richWidth(str) {
  const size = textSize();
  const parts = str.split(/_\{(.*?)\}/);
  let w = 0;
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      textSize(size * 0.72);
      w += textWidth(parts[i]);
      textSize(size);
    } else {
      w += textWidth(parts[i]);
    }
  }
  return w;
}

// A plot caption: rich text on a translucent white backing.  Returns its width.
function caption(str, xPos, yPos, col) {
  const w = richWidth(str) + 8;
  noStroke();
  fill(255, 255, 255, 200);
  rect(xPos, yPos, w, textSize() + 8, 4);
  textAlign(LEFT, TOP);
  richText(str, xPos + 4, yPos + 2, col);
  return w;
}

function fmt(v) {
  const r = Math.abs(v) < 0.0005 ? 0 : v;
  return r.toFixed(3);
}

function drawCalculationPanel(probeT, ip) {
  const px = 10, py = 398, pw = canvasWidth - 20, ph = 76;
  fill(255, 255, 255, 230);
  stroke('silver');
  strokeWeight(1);
  rect(px, py, pw, ph, 10);

  const xt = x[ip];
  const xm = x[N - 1 - ip];
  const e = xe[ip];
  const o = xo[ip];
  const narrow = canvasWidth < 600;
  textSize(narrow ? 11 : 14);
  textAlign(LEFT, TOP);
  const lx = px + 10;
  const lineGap = 23;

  richText('At t = ' + probeT.toFixed(1) + ' s:   x(t) = ' + fmt(xt) + ',   x(−t) = ' + fmt(xm),
    lx, py + 7, 'black');

  let w = richText('x_{e}(t) = [' + fmt(xt) + ' + ' + fmt(xm) + '] / 2 = ' + fmt(e), lx, py + 7 + lineGap, 'green');
  richText('x_{o}(t) = [' + fmt(xt) + ' − ' + fmt(xm) + '] / 2 = ' + fmt(o), lx + w + (narrow ? 12 : 30), py + 7 + lineGap, 'red');

  // check and symmetry summary
  const eTotal = energy(x), eEven = energy(xe), eOdd = energy(xo);
  let summary;
  if (eTotal < 1e-9) summary = 'x(t) is zero';
  else if (eOdd / eTotal < 1e-6) summary = 'x(t) is even';
  else if (eEven / eTotal < 1e-6) summary = 'x(t) is odd';
  else summary = 'neither even nor odd';
  w = richText('Check: x_{e}(t) + x_{o}(t) = ' + fmt(e + o) + ' = x(t)', lx, py + 7 + 2 * lineGap, 'purple');
  if (eTotal >= 1e-9) {
    const pe = (100 * eEven / eTotal).toFixed(0);
    const po = (100 * eOdd / eTotal).toFixed(0);
    const split = narrow
      ? 'Energy: ' + pe + '% even, ' + po + '% odd'
      : 'Energy: ' + pe + '% even, ' + po + '% odd (' + summary + ')';
    richText(split, lx + w + (narrow ? 12 : 30), py + 7 + 2 * lineGap, 'black');
  }
}

function drawControlLabels(probeT, isCustom) {
  const narrow = canvasWidth < 600;
  const half = canvasWidth / 2;
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  textSize(narrow ? 13 : defaultTextSize);
  text('Signal:', 10, drawHeight + 17);
  if (isCustom) {
    fill('gray');
    text(narrow ? 't₀: presets' : 'Shift: presets only', 10, drawHeight + 52);
    fill('black');
  } else {
    text((narrow ? 't₀: ' : 'Time shift t₀: ') + shiftSlider.value().toFixed(1) + ' s', 10, drawHeight + 52);
  }
  text((narrow ? 't: ' : 'Probe time t: ') + probeT.toFixed(1) + ' s', half + 10, drawHeight + 52);
}

// ---------------------------------------------------------------------------
// Mouse drawing in the top plot
// ---------------------------------------------------------------------------

function insideTopPlot() {
  if (plots.length === 0) return false;
  const p = plots[0];
  return mouseX >= p.x && mouseX <= p.x + p.w && mouseY >= p.y && mouseY <= p.y + p.h;
}

function drawAtMouse() {
  const p = plots[0];
  const i = constrain(Math.round((mouseX - p.x) / p.w * (N - 1)), 0, N - 1);
  let v = (p.y + p.h / 2 - mouseY) / (p.h / 2) * Y_LIMIT;
  v = constrain(v, -DRAW_LIMIT, DRAW_LIMIT);
  if (lastIndex < 0) {
    x[i] = v;
  } else {
    // fill every sample between the previous and the current mouse position
    const lo = Math.min(lastIndex, i), hi = Math.max(lastIndex, i);
    for (let j = lo; j <= hi; j++) {
      const f = (hi === lo) ? 1 : (j - lastIndex) / (i - lastIndex);
      x[j] = lastValue + f * (v - lastValue);
    }
  }
  lastIndex = i;
  lastValue = v;
  decompose();
}

function mousePressed() {
  if (insideTopPlot()) {
    drawing = true;
    lastIndex = -1;
    signalSelect.selected('custom');   // drawing edits a copy of whatever was shown
    drawAtMouse();
  }
}

function mouseDragged() {
  if (drawing) {
    drawAtMouse();
    return false;   // keep touch drags from scrolling the page while drawing
  }
}

function mouseReleased() {
  drawing = false;
  lastIndex = -1;
}

// ---------------------------------------------------------------------------
// Responsive layout
// ---------------------------------------------------------------------------

function positionControls() {
  const narrow = canvasWidth < 600;
  const half = canvasWidth / 2;
  const labelW = narrow ? 105 : sliderLeftMargin;
  const sliderW = Math.max(40, half - labelW - 12);
  signalSelect.position(narrow ? 60 : 70, drawHeight + 6);
  sumCheckbox.position(half + 8, drawHeight + 8);
  sumCheckbox.style('font-size', narrow ? '13px' : '16px');
  clearButton.position(half + (narrow ? 105 : 125), drawHeight + 6);
  shiftSlider.position(labelW, drawHeight + 42);
  shiftSlider.size(sliderW);
  probeSlider.position(half + labelW, drawHeight + 42);
  probeSlider.size(sliderW);
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
