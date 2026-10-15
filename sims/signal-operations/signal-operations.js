// Signal Operations: Shift, Scale and Reverse MicroSim
// CANVAS_HEIGHT: 658
// Transforms an elementary signal x(t) into y(t) = A·x(a(t − t0)) and tracks three
// landmark points P, Q, R from x to y (t_y = t_x/a + t0). An optional overlay shows the
// common mistake z(t) = A·x(at − t0), and a discrete-time mode shows decimation x[Mn]
// (samples lost) and expansion x[n/L] (zeros inserted).

// Canvas dimensions
let canvasWidth = 700;               // overwritten from the container in updateCanvasSize()
let drawHeight = 492;
let controlHeight = 166;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let sliderLeftMargin = 170;
let defaultTextSize = 16;

// Controls
let shiftSlider, scaleSlider, ampSlider;
let signalSelect;
let dtCheckbox, reverseCheckbox, mistakeCheckbox;

// Fixed axes: the same time window and amplitude range on both plots
const T_MIN = -10, T_MAX = 10;
const Y_MAX = 2.4;

// Vertical layout of the drawing region
const TITLE_Y = 18, LINE1_Y = 46, LINE2_Y = 68;
const PLOT1_TOP = 84, PLOT2_TOP = 244, PLOT_H = 126;
const TABLE_Y = 402, ROW_DY = 19, NOTE_Y = 480;
let plotL = 44, plotR = 684;

// Discrete-time scale factors a = p/q: expansion 1/L or decimation M
const DT_SCALES = [
  { p: 1, q: 4 }, { p: 1, q: 3 }, { p: 1, q: 2 }, { p: 1, q: 1 },
  { p: 2, q: 1 }, { p: 3, q: 1 }, { p: 4, q: 1 }
];

// Colors
const COL_X = [105, 105, 105];       // original signal: gray
const COL_Y = [25, 90, 200];         // transformed signal: blue
const COL_Z = [205, 35, 35];         // common mistake: red
const LM_COLORS = [[184, 134, 11], [130, 50, 175], [40, 140, 80]];   // P gold, Q purple, R green
const LM_NAMES = ['P', 'Q', 'R'];

// Base signals and their landmark times (CT and DT)
const SIGNALS = {
  step:     { label: 'unit step u(t)',          lmCT: [-2, 0, 3], lmDT: [-2, 0, 3] },
  impulse:  { label: 'unit impulse δ(t)',   lmCT: [-2, 0, 2], lmDT: [-2, 0, 2] },
  rect:     { label: 'rectangular pulse',       lmCT: [0, 2, 4],  lmDT: [0, 2, 3] },
  triangle: { label: 'triangle',                lmCT: [0, 2, 6],  lmDT: [0, 2, 6] },
  exp:      { label: 'exponential e^(−t)u(t)', lmCT: [0, 1, 3],  lmDT: [0, 1, 3] },
  sine:     { label: 'one sine period',         lmCT: [0, 2, 6],  lmDT: [0, 2, 6] },
  ramp:     { label: 'ramp r(t) = t·u(t)', lmCT: [0, 1, 2],  lmDT: [0, 1, 2] }
};

// Current state (read from the controls every frame)
let isDT = false;
let sig = 'triangle';
let shiftT0 = 2, scaleA = 2, ampA = 1;
let reversed = false, showMistake = false;
let dtP = 2, dtQ = 1;                // DT scale a = dtP / dtQ (sign of dtP = reversal)

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  shiftSlider = createSlider(-5, 5, 2, 0.1);
  shiftSlider.position(sliderLeftMargin, rowY(0) - 10);

  scaleSlider = createSlider(0.25, 4, 2, 0.05);
  scaleSlider.position(sliderLeftMargin, rowY(1) - 10);

  ampSlider = createSlider(-2, 2, 1, 0.1);
  ampSlider.position(sliderLeftMargin, rowY(2) - 10);

  signalSelect = createSelect();
  for (const key of Object.keys(SIGNALS)) signalSelect.option(SIGNALS[key].label, key);
  signalSelect.selected('triangle');
  signalSelect.style('font-size', '15px');
  signalSelect.position(10, rowY(3) - 12);

  dtCheckbox = createCheckbox('Discrete time (DT)', false);
  dtCheckbox.style('font-size', '16px');
  dtCheckbox.position(10 + signalSelect.elt.offsetWidth + 18, rowY(3) - 11);

  reverseCheckbox = createCheckbox('Reverse time', false);
  reverseCheckbox.style('font-size', '16px');
  reverseCheckbox.position(10, rowY(4) - 11);

  mistakeCheckbox = createCheckbox('Show the common mistake', false);
  mistakeCheckbox.style('font-size', '16px');
  mistakeCheckbox.position(150, rowY(4) - 11);

  updateCanvasSize();
  describe('Two stacked plots on the same time axis: the original signal x(t) in gray and the transformed signal y(t) = A x(a(t - t0)) in blue. Three colored landmark points P, Q and R are joined by dashed lines from x to y, and a table lists their times. Sliders set the shift t0, the scale a and the amplitude A; checkboxes reverse time, overlay the common shift-before-scale mistake in red, and switch to discrete time.');
}

// vertical centre of control row i
function rowY(i) {
  return drawHeight + 18 + 32 * i;
}

function draw() {
  updateCanvasSize();
  readState();

  // Drawing region and control region
  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  drawTitleAndFormulas();

  drawPlotFrame(PLOT1_TOP);
  drawPlotFrame(PLOT2_TOP);

  const L = landmarkData();
  drawConnectors(L);

  if (isDT) {
    drawSignalsDT();
  } else {
    drawSignalsCT();
  }

  drawLandmarks(L);
  drawLegends();
  drawTable(L);
  drawNote();
  drawControlLabels();
}

// ---------------------------------------------------------------- state

function readState() {
  if (dtCheckbox.checked() !== isDT) applyMode(dtCheckbox.checked());
  sig = signalSelect.value();
  if (!SIGNALS[sig]) sig = 'triangle';
  shiftT0 = Number(shiftSlider.value());
  if (isDT) shiftT0 = Math.round(shiftT0);
  ampA = Number(ampSlider.value());
  reversed = reverseCheckbox.checked();
  showMistake = mistakeCheckbox.checked();
  if (isDT) {
    const s = DT_SCALES[constrain(Math.round(Number(scaleSlider.value())) + 3, 0, DT_SCALES.length - 1)];
    dtP = reversed ? -s.p : s.p;
    dtQ = s.q;
    scaleA = dtP / dtQ;
  } else {
    scaleA = Number(scaleSlider.value()) * (reversed ? -1 : 1);
  }
}

// Switch the shift and scale sliders between continuous and discrete-time ranges
function applyMode(dt) {
  isDT = dt;
  const sEl = scaleSlider.elt, tEl = shiftSlider.elt;
  if (dt) {
    const aNow = Number(scaleSlider.value());
    let best = 3, bestErr = Infinity;
    DT_SCALES.forEach((s, i) => {
      const e = Math.abs(Math.log(s.p / s.q) - Math.log(aNow));
      if (e < bestErr) { bestErr = e; best = i; }
    });
    const t0 = Math.round(Number(shiftSlider.value()));
    sEl.min = -3; sEl.max = 3; sEl.step = 1; sEl.value = best - 3;
    tEl.step = 1; tEl.value = t0;
  } else {
    const s = DT_SCALES[constrain(Math.round(Number(scaleSlider.value())) + 3, 0, DT_SCALES.length - 1)];
    sEl.min = 0.25; sEl.max = 4; sEl.step = 0.05; sEl.value = s.p / s.q;
    tEl.step = 0.1;
  }
}

// ---------------------------------------------------------------- signals

// Base signal x(t); the CT impulse is drawn separately as an arrow
function xBase(t) {
  switch (sig) {
    case 'step': return t >= 0 ? 1 : 0;
    case 'impulse': return 0;
    case 'rect': return (t >= 0 && t < 4) ? 1 : 0;
    case 'triangle':
      if (t < 0 || t > 6) return 0;
      return t <= 2 ? t / 2 : (6 - t) / 4;
    case 'exp': return t >= 0 ? Math.exp(-t) : 0;
    case 'sine': return (t >= 0 && t < 8) ? Math.sin(2 * Math.PI * t / 8) : 0;
    case 'ramp': return t >= 0 ? t : 0;
  }
  return 0;
}

// Base sequence x[n]
function xDT(n) {
  if (sig === 'impulse') return n === 0 ? 1 : 0;
  const v = xBase(n);
  return Math.abs(v) < 1e-12 ? 0 : v;
}

// Height of a landmark on x (the impulse uses its area, the rectangle its top corner)
function landmarkValue(t) {
  if (isDT) return xDT(t);
  if (sig === 'impulse') return t === 0 ? 1 : 0;
  if (sig === 'rect' && t === 4) return 1;
  return xBase(t);
}

function yCT(t) { return ampA * xBase(scaleA * (t - shiftT0)); }
function zCT(t) { return ampA * xBase(scaleA * t - shiftT0); }

function landmarkData() {
  const times = isDT ? SIGNALS[sig].lmDT : SIGNALS[sig].lmCT;
  return times.map((tx, i) => {
    const vx = landmarkValue(tx);
    let ty, tz, keptY = true, keptZ = true;
    if (isDT) {
      keptY = ((tx * dtQ) % dtP) === 0;
      ty = tx * dtQ / dtP + shiftT0;
      keptZ = (((tx + shiftT0) * dtQ) % dtP) === 0;
      tz = (tx + shiftT0) * dtQ / dtP;
    } else {
      ty = tx / scaleA + shiftT0;
      tz = (tx + shiftT0) / scaleA;
    }
    let vy = ampA * vx;
    if (!isDT && sig === 'impulse' && tx === 0) vy = ampA / Math.abs(scaleA);
    return { tx, vx, ty, vy, tz, keptY, keptZ, col: LM_COLORS[i], name: LM_NAMES[i] };
  });
}

// ---------------------------------------------------------------- coordinates

function px(t) { return plotL + (t - T_MIN) / (T_MAX - T_MIN) * (plotR - plotL); }
function tOf(x) { return T_MIN + (x - plotL) / (plotR - plotL) * (T_MAX - T_MIN); }
function py(v, top) { return top + PLOT_H / 2 - v / Y_MAX * (PLOT_H / 2); }
function clampY(y, top) { return constrain(y, top + 2, top + PLOT_H - 2); }
function inWindow(t) { return t >= T_MIN - 1e-9 && t <= T_MAX + 1e-9; }

function startPlotClip(top) {
  push();
  drawingContext.beginPath();
  drawingContext.rect(plotL, top, plotR - plotL, PLOT_H);
  drawingContext.clip();
}
function stopPlotClip() { pop(); }

// ---------------------------------------------------------------- drawing

function drawTitleAndFormulas() {
  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(['Signal Operations: Shift, Scale and Reverse', 'Signal Operations'],
          canvasWidth / 2, TITLE_Y, canvasWidth - 20, 20, CENTER);
  textStyle(NORMAL);

  // Line 1: the correct transformation with numbers
  fill(COL_Y);
  let numeric;
  if (isDT) {
    numeric = 'y[n] = ' + fmt(ampA) + '·x[' + dtScaleStr(true) + '(n ' + signedTerm(shiftT0, 0) + ')]';
    fitText(['y[n] = A·x[a(n − n_0)]   →   ' + numeric, numeric],
            margin, LINE1_Y, canvasWidth - 2 * margin, 16, LEFT);
  } else {
    numeric = 'y(t) = ' + fmt(ampA) + '·x(' + fmt(scaleA) + '(t ' + signedTerm(shiftT0, 2) + '))';
    fitText(['y(t) = A·x(a(t − t_0))   →   ' + numeric, numeric],
            margin, LINE1_Y, canvasWidth - 2 * margin, 16, LEFT);
  }

  // Line 2: the common mistake (if shown) or the correct order of operations
  if (showMistake) {
    fill(COL_Z);
    const s0 = isDT ? 'n_0' : 't_0';
    const netV = shiftT0 / scaleA;
    const d = isDT ? (Number.isInteger(netV) ? 0 : 2) : 2;
    const unitNet = isDT ? (Math.abs(netV) === 1 ? ' sample' : ' samples') : ' s';
    const unit = isDT ? (Math.abs(shiftT0) === 1 ? ' sample' : ' samples') : ' s';
    const net = fmt(netV, d), t0s = fmt(shiftT0, isDT ? 0 : 2);
    const zf = isDT ? 'z[n] = A·x[an − n_0]' : 'z(t) = A·x(at − t_0)';
    const zf2 = isDT ? 'A·x[a(n − n_0/a)]' : 'A·x(a(t − t_0/a))';
    fitText([
      'Mistake: ' + zf + ' = ' + zf2 + ' shifts by ' + s0 + '/a = ' + net + unitNet + ', not ' + s0 + ' = ' + t0s + unit,
      'Mistake: ' + zf + ' shifts by ' + s0 + '/a = ' + net + unitNet + ', not ' + t0s + unit,
      zf + ': shift ' + s0 + '/a = ' + net + ', not ' + t0s
    ], margin, LINE2_Y, canvasWidth - 2 * margin, 15, LEFT);
  } else {
    fill(60);
    const sc = scaleDescription(), sh = shiftDescription();
    fitText([
      'Correct order: first ' + sc + (isDT ? '' : ' about t = 0') + ', then ' + sh + gainDescription(),
      'First ' + sc + ', then ' + sh,
      sc + ', then ' + sh
    ], margin, LINE2_Y, canvasWidth - 2 * margin, 15, LEFT);
  }
}

function scaleDescription() {
  const m = Math.abs(scaleA);
  let s;
  if (isDT) {
    const p = Math.abs(dtP);
    if (p > 1) s = 'keep every ' + ordinal(p) + ' sample (x[' + p + 'n])';
    else if (dtQ > 1) s = 'insert ' + (dtQ - 1) + ' zero' + (dtQ > 2 ? 's' : '') + ' between samples';
    else s = 'no scaling';
  } else {
    if (Math.abs(m - 1) < 1e-9) s = 'no scaling';
    else if (m > 1) s = 'compress ×' + fmt(m);
    else s = 'stretch ×' + fmt(1 / m);
  }
  if (scaleA < 0) s += ' and reverse';
  return s;
}

function shiftDescription() {
  const unit = isDT ? (Math.abs(shiftT0) === 1 ? ' sample' : ' samples') : ' s';
  const d = isDT ? 0 : 2;
  if (Math.abs(shiftT0) < 1e-9) return 'no shift';
  if (shiftT0 > 0) return 'delay by ' + fmt(shiftT0, d) + unit + ' (right)';
  return 'advance by ' + fmt(-shiftT0, d) + unit + ' (left)';
}

function gainDescription() {
  if (Math.abs(ampA - 1) < 1e-9) return '';
  return '; gain A = ' + fmt(ampA) + (ampA < 0 ? ' (flips upside down)' : '');
}

function drawPlotFrame(top) {
  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(plotL, top, plotR - plotL, PLOT_H);

  // light grid at every integer time and amplitude
  stroke(236);
  for (let t = T_MIN + 1; t < T_MAX; t++) line(px(t), top, px(t), top + PLOT_H);
  for (let v = -2; v <= 2; v++) {
    if (v !== 0) line(plotL, py(v, top), plotR, py(v, top));
  }
  // axes
  stroke(150);
  line(px(0), top, px(0), top + PLOT_H);
  stroke(90);
  line(plotL, py(0, top), plotR, py(0, top));

  // amplitude tick labels
  noStroke();
  fill(80);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (let v = -2; v <= 2; v++) text(fmtInt(v), plotL - 6, py(v, top));

  // time tick labels and axis title
  const axisTitle = isDT ? 'n (samples)' : 't (s)';
  const titleW = textWidth(axisTitle);
  textAlign(RIGHT, TOP);
  text(axisTitle, plotR, top + PLOT_H + 3);
  const step = (px(2) - px(0)) >= 34 ? 2 : 5;
  textAlign(CENTER, TOP);
  for (let t = T_MIN; t <= T_MAX; t += step) {
    const x = px(t);
    if (x + textWidth(fmtInt(t)) / 2 > plotR - titleW - 8) continue;
    text(fmtInt(t), x, top + PLOT_H + 3);
  }
}

function drawSignalsCT() {
  // original x(t)
  startPlotClip(PLOT1_TOP);
  drawCurve(t => xBase(t), PLOT1_TOP, COL_X, 2.5, false);
  if (sig === 'impulse') impulseArrow(0, 1, PLOT1_TOP, COL_X);
  stopPlotClip();

  // transformed y(t) and (optionally) the mistake z(t)
  startPlotClip(PLOT2_TOP);
  drawCurve(yCT, PLOT2_TOP, COL_Y, 3, false);
  if (sig === 'impulse') impulseArrow(shiftT0, ampA / Math.abs(scaleA), PLOT2_TOP, COL_Y);
  if (showMistake) {
    drawCurve(zCT, PLOT2_TOP, COL_Z, 2.5, true);
    if (sig === 'impulse') impulseArrow(shiftT0 / scaleA, ampA / Math.abs(scaleA), PLOT2_TOP, COL_Z);
  }
  stopPlotClip();
}

function drawCurve(fn, top, col, weight, dashed) {
  noFill();
  stroke(col[0], col[1], col[2]);
  strokeWeight(weight);
  if (dashed) drawingContext.setLineDash([8, 6]);
  beginShape();
  for (let x = plotL; x <= plotR; x += 1) {
    const v = constrain(fn(tOf(x)), -3 * Y_MAX, 3 * Y_MAX);
    vertex(x, py(v, top));
  }
  endShape();
  drawingContext.setLineDash([]);
}

function impulseArrow(t, area, top, col) {
  if (!inWindow(t) || Math.abs(area) < 1e-9) return;
  const x = px(t), y0 = py(0, top);
  const shown = constrain(area, -Y_MAX * 0.95, Y_MAX * 0.95);
  const yTip = py(shown, top);
  const dir = area > 0 ? 1 : -1;
  stroke(col[0], col[1], col[2]);
  strokeWeight(3);
  line(x, y0, x, yTip + 9 * dir);
  noStroke();
  fill(col[0], col[1], col[2]);
  triangle(x, yTip, x - 6, yTip + 11 * dir, x + 6, yTip + 11 * dir);
  textSize(14);
  textAlign(LEFT, CENTER);
  text('(' + fmt(area) + ')', x + 8, yTip + 9 * dir);
}

function drawSignalsDT() {
  const decimating = Math.abs(dtP) > 1;

  // original x[n]; samples that decimation never uses are crossed out
  startPlotClip(PLOT1_TOP);
  for (let n = T_MIN; n <= T_MAX; n++) {
    const v = xDT(n);
    drawStem(n, v, PLOT1_TOP, COL_X, true);
    if (decimating && v !== 0 && n % dtP !== 0) drawCross(px(n), py(v, PLOT1_TOP), COL_Z, 6);
  }
  stopPlotClip();

  startPlotClip(PLOT2_TOP);
  // y[n] = A x[a(n - n0)], with a = p/q
  for (let n = T_MIN; n <= T_MAX; n++) {
    const num = dtP * (n - shiftT0);
    if (num % dtQ === 0) {
      drawStem(n, ampA * xDT(num / dtQ), PLOT2_TOP, COL_Y, true);
    } else {
      drawStem(n, 0, PLOT2_TOP, COL_Y, false);      // inserted zero (x[n/L] undefined)
    }
  }
  // z[n] = A x[a n - n0]: only its non-zero samples, as red rings
  if (showMistake) {
    for (let n = T_MIN; n <= T_MAX; n++) {
      const num = dtP * n;
      if (num % dtQ !== 0) continue;
      const v = ampA * xDT(num / dtQ - shiftT0);
      if (Math.abs(v) < 1e-9) continue;
      const x = px(n);
      stroke(COL_Z[0], COL_Z[1], COL_Z[2]);
      strokeWeight(1.5);
      line(x, py(0, PLOT2_TOP), x, py(v, PLOT2_TOP));
      noFill();
      strokeWeight(2);
      circle(x, py(v, PLOT2_TOP), 14);
    }
  }
  stopPlotClip();
}

// one stem of a stem plot; filled = defined sample, hollow = inserted zero
function drawStem(n, v, top, col, filled) {
  const x = px(n), y0 = py(0, top), y = py(v, top);
  stroke(col[0], col[1], col[2]);
  strokeWeight(2);
  if (v !== 0) line(x, y0, x, y);
  if (filled) {
    fill(col[0], col[1], col[2]);
    noStroke();
    circle(x, y, v === 0 ? 6 : 9);
  } else {
    fill(255);
    strokeWeight(2);
    circle(x, y0, 9);
  }
}

function drawCross(x, y, col, r) {
  stroke(col[0], col[1], col[2]);
  strokeWeight(2.5);
  line(x - r, y - r, x + r, y + r);
  line(x - r, y + r, x + r, y - r);
}

function drawConnectors(L) {
  for (const m of L) {
    const x1 = px(m.tx), y1 = clampY(py(m.vx, PLOT1_TOP), PLOT1_TOP);
    const x2 = constrain(px(m.ty), plotL, plotR), y2 = clampY(py(m.vy, PLOT2_TOP), PLOT2_TOP);
    stroke(m.col[0], m.col[1], m.col[2], 190);
    strokeWeight(1.8);
    drawingContext.setLineDash([5, 4]);
    line(x1, y1, x2, y2);
    drawingContext.setLineDash([]);
  }
}

function drawLandmarks(L) {
  for (const m of L) {
    // on x
    landmarkDot(px(m.tx), clampY(py(m.vx, PLOT1_TOP), PLOT1_TOP), m.col, m.name);

    // on y
    const y2 = clampY(py(m.vy, PLOT2_TOP), PLOT2_TOP);
    if (!inWindow(m.ty)) {
      edgeMarker(m.ty < T_MIN ? plotL : plotR, y2, m.ty < T_MIN ? -1 : 1, m.col, m.name);
    } else if (isDT && !m.keptY) {
      drawCross(px(m.ty), y2, m.col, 7);
      noStroke();
      fill(m.col[0], m.col[1], m.col[2]);
      textSize(14);
      textAlign(LEFT, BOTTOM);
      text(m.name + ' lost', px(m.ty) + 8, y2 - 4);
    } else {
      landmarkDot(px(m.ty), y2, m.col, m.name);
    }

    // where the mistake puts the same point (hollow square)
    if (showMistake && inWindow(m.tz) && (!isDT || m.keptZ)) {
      noFill();
      stroke(m.col[0], m.col[1], m.col[2]);
      strokeWeight(2.5);
      rectMode(CENTER);
      rect(px(m.tz), y2, 11, 11);
      rectMode(CORNER);
    }
  }
}

function landmarkDot(x, y, col, name) {
  stroke(255);
  strokeWeight(2);
  fill(col[0], col[1], col[2]);
  circle(x, y, 13);
  noStroke();
  textSize(15);
  textStyle(BOLD);
  textAlign(LEFT, BOTTOM);
  text(name, x + 6, y - 5);
  textStyle(NORMAL);
}

function edgeMarker(x, y, dir, col, name) {
  noStroke();
  fill(col[0], col[1], col[2]);
  triangle(x + 2 * dir, y, x - 10 * dir, y - 7, x - 10 * dir, y + 7);
  textSize(14);
  textStyle(BOLD);
  textAlign(dir > 0 ? RIGHT : LEFT, BOTTOM);
  text(name, x - 13 * dir, y - 4);
  textStyle(NORMAL);
}

function drawLegends() {
  const v = isDT ? '[n]' : '(t)';
  legendRow(PLOT1_TOP, [
    { kind: 'line', col: COL_X, label: 'x' + v + ' original' },
    ...(isDT && Math.abs(dtP) > 1 ? [{ kind: 'cross', col: COL_Z, label: 'unused by y' }] : [])
  ]);
  legendRow(PLOT2_TOP, [
    { kind: 'line', col: COL_Y, label: 'y' + v + ' correct' },
    ...(showMistake ? [{ kind: 'dash', col: COL_Z, label: 'z' + v + ' mistake' }] : []),
    ...(isDT && dtQ > 1 ? [{ kind: 'ring', col: COL_Y, label: 'inserted 0' }] : [])
  ]);
}

function legendRow(top, items) {
  textSize(14);
  const widthOf = list => list.reduce((w, it) => w + 26 + advW(it.label) + 12, 8);
  // narrow screens: keep only the first word of each label ("y[n]", "z[n]", "inserted")
  if (widthOf(items) > plotR - plotL - 4) {
    items = items.map(it => ({ ...it, label: it.label.split(' ')[0] }));
  }
  const w = widthOf(items);
  noStroke();
  fill(255, 255, 255, 215);
  rect(plotL + 1, top + 1, w, 19);
  let x = plotL + 8;
  const y = top + 11;
  for (const it of items) {
    const c = it.col;
    stroke(c[0], c[1], c[2]);
    strokeWeight(2.5);
    noFill();
    if (it.kind === 'line') line(x, y, x + 20, y);
    else if (it.kind === 'dash') { line(x, y, x + 7, y); line(x + 12, y, x + 20, y); }
    else if (it.kind === 'cross') { line(x + 5, y - 5, x + 15, y + 5); line(x + 5, y + 5, x + 15, y - 5); }
    else if (it.kind === 'ring') { strokeWeight(2); circle(x + 10, y, 9); }
    noStroke();
    fill(c[0], c[1], c[2]);
    textAlign(LEFT, CENTER);
    text(it.label, x + 26, y);
    x += 26 + advW(it.label) + 12;
  }
}

function drawTable(L) {
  const v = isDT ? 'n' : 't';
  // column offsets grow with the width on small screens but are capped on wide ones
  const cols = [margin, margin + Math.min(canvasWidth * 0.15, 120),
                margin + Math.min(canvasWidth * 0.37, 260), margin + Math.min(canvasWidth * 0.65, 540)];
  const avail = i => (i < 3 ? cols[i + 1] : canvasWidth - margin) - cols[i] - 8;
  noStroke();
  fill(70);
  textStyle(BOLD);
  fitText(['Point'], cols[0], TABLE_Y, avail(0), 14, LEFT);
  fitText([v + '_x on x', v + '_x'], cols[1], TABLE_Y, avail(1), 14, LEFT);
  fitText([v + '_y = ' + v + '_x/a + ' + v + '_0  on y', v + '_y = ' + v + '_x/a + ' + v + '_0', v + '_y'],
          cols[2], TABLE_Y, avail(2), 14, LEFT);
  if (showMistake) {
    fill(COL_Z);
    fitText([v + '_z = (' + v + '_x + ' + v + '_0)/a  on z', v + '_z = (' + v + '_x + ' + v + '_0)/a', v + '_z'],
            cols[3], TABLE_Y, avail(3), 14, LEFT);
  }
  textStyle(NORMAL);

  L.forEach((m, i) => {
    const y = TABLE_Y + ROW_DY * (i + 1);
    const c = m.col;
    noStroke();
    fill(c[0], c[1], c[2]);
    circle(cols[0] + 6, y, 11);
    textSize(15);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    text(m.name, cols[0] + 16, y);
    textStyle(NORMAL);
    fill(30);
    text(fmtTime(m.tx), cols[1], y);
    fill(COL_Y);
    text(fmtTime(m.ty) + (isDT && !m.keptY ? '  (lost)' : (inWindow(m.ty) ? '' : '  (off plot)')), cols[2], y);
    if (showMistake) {
      fill(COL_Z);
      text(fmtTime(m.tz) + (isDT && !m.keptZ ? '  (lost)' : (inWindow(m.tz) ? '' : '  (off plot)')), cols[3], y);
    }
  });
}

function drawNote() {
  noStroke();
  fill(70);
  const absA = Math.abs(scaleA);
  let cands;
  if (isDT && Math.abs(dtP) > 1) {
    const p = Math.abs(dtP);
    cands = ['Decimation x[' + fmtInt(dtP) + 'n] keeps only every ' + ordinal(p) + ' sample of x: the samples marked × never reach y and cannot be recovered.',
             'x[' + fmtInt(dtP) + 'n] keeps every ' + ordinal(p) + ' sample; × samples are lost.',
             '× = samples lost by decimation'];
  } else if (isDT && dtQ > 1) {
    const f = (dtP < 0 ? '−' : '') + 'n/' + dtQ;
    cands = ['x[' + f + '] exists only when n is a multiple of ' + dtQ + ': hollow circles are inserted zeros (interpolation would be needed to fill them).',
             'x[' + f + '] is undefined between multiples of ' + dtQ + ': hollow circles are inserted zeros.',
             'hollow circles = inserted zeros'];
  } else if (!isDT && sig === 'impulse' && Math.abs(absA - 1) > 1e-9) {
    cands = ['δ(at) = δ(t)/|a|: time scaling changes the impulse area to A/|a| = ' + fmt(ampA / absA) + ' (numbers in brackets are areas).',
             'δ(at) = δ(t)/|a|: area A/|a| = ' + fmt(ampA / absA)];
  } else if (!isDT && sig === 'step' && Math.abs(absA - 1) > 1e-9) {
    cands = ['u(at) depends only on the sign of a: the step looks unchanged by |a|, but its landmarks P and R still move.',
             'u(at) is unchanged by |a|; only P and R move.'];
  } else if (!isDT && sig === 'ramp' && scaleA > 0 && Math.abs(absA - 1) > 1e-9) {
    cands = ['r(at) = a·r(t) for a > 0: compressing a ramp in time looks the same as making it steeper.',
             'r(at) = a·r(t) for a > 0'];
  } else if (isDT) {
    cands = ['Each sample x[n_x] reappears in y at n_y = n_x/a + n_0 with height A·x[n_x].',
             'n_y = n_x/a + n_0'];
  } else {
    cands = ['Each point of x at time t_x reappears in y at t_y = t_x/a + t_0 with height A·x(t_x).',
             't_y = t_x/a + t_0, height A·x(t_x)'];
  }
  fitText(cands, margin, NOTE_Y, canvasWidth - 2 * margin, 14, LEFT);
}

function drawControlLabels() {
  noStroke();
  fill('black');
  const d = isDT ? 0 : 2;
  richText('Shift ' + (isDT ? 'n_0' : 't_0') + ' = ' + fmt(shiftT0, d) + (isDT ? '' : ' s'), 10, rowY(0), defaultTextSize, LEFT);
  richText('Scale a = ' + (isDT ? dtScaleStr(false) : fmt(scaleA)), 10, rowY(1), defaultTextSize, LEFT);
  richText('Amplitude A = ' + fmt(ampA), 10, rowY(2), defaultTextSize, LEFT);
}

// ---------------------------------------------------------------- text helpers

// Rich text: "t_0" draws the character after '_' as a subscript
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

// advance width: in p5 2.x textWidth() measures tight bounds and ignores spaces,
// so runs of text placed side by side must use fontWidth()
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

// number with a true minus sign and no "-0.00"
function fmt(v, d = 2) {
  const r = Number(v.toFixed(d));
  return (r < 0 ? '−' : '') + Math.abs(r).toFixed(d);
}
function fmtInt(v) { return (v < 0 ? '−' : '') + Math.abs(v); }
function fmtTime(t) { return isDT && Number.isInteger(Math.round(t * 1e9) / 1e9) ? fmt(t, 0) : fmt(t, 2); }
function signedTerm(t0, d) { return (t0 < 0 ? '+ ' : '− ') + fmt(Math.abs(t0), d); }
function ordinal(k) { return k === 2 ? '2nd' : (k === 3 ? '3rd' : k + 'th'); }

// DT scale factor as text: 2, -3, 1/2, -1/4 (parenthesised fractions inside formulas)
function dtScaleStr(inFormula) {
  const sign = dtP < 0 ? '−' : '';
  if (dtQ === 1) return sign + Math.abs(dtP);
  const f = sign + '1/' + dtQ;
  return inFormula ? '(' + f + ')' : f;
}

// ---------------------------------------------------------------- responsive layout

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  plotL = 44;
  plotR = canvasWidth - 16;
  const w = canvasWidth - sliderLeftMargin - margin;
  if (typeof shiftSlider !== 'undefined') shiftSlider.size(w);
  if (typeof scaleSlider !== 'undefined') scaleSlider.size(w);
  if (typeof ampSlider !== 'undefined') ampSlider.size(w);
}
