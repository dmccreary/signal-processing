// Impulse and Frequency Response Analyzer MicroSim
// CANVAS_HEIGHT: 625
// Four linked views of one LTI system: impulse response h(t), step response
// s(t) (or the output for a pulse or square-wave input), magnitude |H(f)| and
// phase of H(f).  All curves come from closed-form expressions for the chosen
// system, so the time-domain and frequency-domain views always agree.

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 670;
let drawHeight = 510;
let controlHeight = 115;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 165;
let defaultTextSize = 16;

// ---- axes ----
const T_START = -0.25;   // s
const T_END = 2.5;       // s
const F_START = 0.1;     // Hz (logarithmic axis)
const F_END = 100;       // Hz
const DB_MIN = -60;
const DB_MAX = 20;
const PULSE_WIDTH = 0.5; // s, rectangular pulse input
const SQUARE_PERIOD = 1; // s, square-wave input

// ---- controls ----
let systemSelect, inputSelect, exportButton, cutoffSlider, orderSlider, dampingSlider;

// ---- cursors (moved by hovering over a plot) ----
let cursorT = 0.5;       // s
let cursorF = null;      // Hz; null means "follow the cutoff slider"
let plotRects = null;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  systemSelect = createSelect();
  systemSelect.option('Low-pass filter', 'lowpass');
  systemSelect.option('High-pass filter', 'highpass');
  systemSelect.option('Differentiator', 'differentiator');
  systemSelect.option('Integrator', 'integrator');
  systemSelect.option('Resonant system', 'resonant');
  systemSelect.selected('lowpass');

  inputSelect = createSelect();
  inputSelect.option('Unit step u(t)', 'step');
  inputSelect.option('Rectangular pulse', 'pulse');
  inputSelect.option('Square wave', 'square');
  inputSelect.selected('step');

  exportButton = createButton('Export h(t) as CSV');
  exportButton.mousePressed(exportImpulseResponse);

  cutoffSlider = createSlider(0.5, 5, 1, 0.1);
  orderSlider = createSlider(1, 4, 2, 1);
  dampingSlider = createSlider(0.05, 2, 0.2, 0.05);

  const mainElement = document.querySelector('main');
  [systemSelect, inputSelect, exportButton, cutoffSlider, orderSlider, dampingSlider]
    .forEach(c => c.parent(mainElement));
  positionControls();

  describe('Four plots for a selected linear time-invariant system: impulse response and step ' +
    'response against time, and magnitude in decibels and phase in degrees against frequency. ' +
    'Sliders set the cutoff frequency, filter order and damping ratio.', LABEL);
}

// ---------------------------------------------------------------------------
// Complex helpers
// ---------------------------------------------------------------------------

function cx(re, im) { return { re: re, im: im }; }
function cAdd(a, b) { return cx(a.re + b.re, a.im + b.im); }
function cSub(a, b) { return cx(a.re - b.re, a.im - b.im); }
function cMul(a, b) { return cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
function cDiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
}
function cExp(a) { const e = Math.exp(a.re); return cx(e * Math.cos(a.im), e * Math.sin(a.im)); }
function cPow(a, n) { let r = cx(1, 0); for (let i = 0; i < n; i++) r = cMul(r, a); return r; }
function cScale(a, k) { return cx(a.re * k, a.im * k); }

// ---------------------------------------------------------------------------
// System model
// ---------------------------------------------------------------------------

// Poles of an order-N Butterworth filter with cutoff wc (rad/s).
function butterworthPoles(N, wc) {
  const poles = [];
  for (let k = 1; k <= N; k++) {
    const angle = Math.PI * (2 * k + N - 1) / (2 * N);
    poles.push(cx(wc * Math.cos(angle), wc * Math.sin(angle)));
  }
  return poles;
}

// Build a system object with
//   h(t), s(t)   regular (non-impulsive) parts of the impulse and step response
//   hImpulse     weight of delta(t) in h(t)
//   hDoublet     weight of the doublet delta'(t) in h(t)
//   sImpulse     weight of delta(t) in s(t)
//   H(f)         { mag, phase } with phase in radians, unwrapped
function buildSystem(kind, fc, N, zeta) {
  const wc = 2 * Math.PI * fc;
  const sys = { kind: kind, fc: fc, N: N, zeta: zeta, hImpulse: 0, hDoublet: 0, sImpulse: 0 };

  if (kind === 'lowpass' || kind === 'highpass') {
    const poles = butterworthPoles(N, wc);
    // partial-fraction denominators: product of (p_k - p_m) over m != k
    const denom = poles.map((pk, k) => {
      let d = cx(1, 0);
      poles.forEach((pm, m) => { if (m !== k) d = cMul(d, cSub(pk, pm)); });
      return d;
    });
    let hRes, sRes, sConst;
    if (kind === 'lowpass') {
      // H(s) = wc^N / prod(s - p_k)
      hRes = denom.map(d => cDiv(cx(Math.pow(wc, N), 0), d));
      sRes = hRes.map((r, k) => cDiv(r, poles[k]));
      sConst = 1;
    } else {
      // H(s) = s^N / prod(s - p_k) = 1 + sum A_k / (s - p_k)
      hRes = denom.map((d, k) => cDiv(cPow(poles[k], N), d));
      sRes = denom.map((d, k) => cDiv(cPow(poles[k], N - 1), d));
      sConst = 0;
      sys.hImpulse = 1;
    }
    const sumExp = (res, t) => {
      let acc = 0;
      for (let k = 0; k < poles.length; k++) acc += cMul(res[k], cExp(cScale(poles[k], t))).re;
      return acc;
    };
    sys.h = t => (t < 0 ? 0 : sumExp(hRes, t));
    sys.s = t => (t < 0 ? 0 : sConst + sumExp(sRes, t));
    sys.H = f => {
      const w = 2 * Math.PI * f;
      let mag = 1, phase = 0;
      for (const p of poles) {
        const term = cSub(cx(1, 0), cDiv(cx(0, w), p));   // 1 - jw/p_k
        mag /= Math.hypot(term.re, term.im);
        phase -= Math.atan2(term.im, term.re);
      }
      if (kind === 'highpass') {
        mag *= Math.pow(w / wc, N);
        phase += N * Math.PI / 2;
      }
      return { mag: mag, phase: phase };
    };
  } else if (kind === 'differentiator') {
    // y(t) = (1/wc) dx/dt,  H(f) = j f / fc
    sys.hDoublet = 1 / wc;
    sys.sImpulse = 1 / wc;
    sys.h = t => 0;
    sys.s = t => 0;
    sys.H = f => ({ mag: f / fc, phase: Math.PI / 2 });
  } else if (kind === 'integrator') {
    // y(t) = wc * integral of x,  H(f) = fc / (j f)
    sys.h = t => (t < 0 ? 0 : wc);
    sys.s = t => (t < 0 ? 0 : wc * t);
    sys.H = f => ({ mag: fc / f, phase: -Math.PI / 2 });
  } else {
    // resonant second-order system  H(s) = wn^2 / (s^2 + 2 zeta wn s + wn^2)
    const wn = wc;
    if (Math.abs(zeta - 1) < 1e-6) {
      sys.h = t => (t < 0 ? 0 : wn * wn * t * Math.exp(-wn * t));
      sys.s = t => (t < 0 ? 0 : 1 - (1 + wn * t) * Math.exp(-wn * t));
    } else if (zeta < 1) {
      const root = Math.sqrt(1 - zeta * zeta);
      const wd = wn * root;
      sys.h = t => (t < 0 ? 0 : (wn / root) * Math.exp(-zeta * wn * t) * Math.sin(wd * t));
      sys.s = t => (t < 0 ? 0 :
        1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + (zeta / root) * Math.sin(wd * t)));
    } else {
      const root = Math.sqrt(zeta * zeta - 1);
      const p1 = -wn * (zeta - root), p2 = -wn * (zeta + root);
      const k = wn * wn / (p1 - p2);
      sys.h = t => (t < 0 ? 0 : k * (Math.exp(p1 * t) - Math.exp(p2 * t)));
      sys.s = t => (t < 0 ? 0 : 1 + k * (Math.exp(p1 * t) / p1 - Math.exp(p2 * t) / p2));
    }
    sys.H = f => {
      const r = f / fc;
      const re = 1 - r * r, im = 2 * zeta * r;
      return { mag: 1 / Math.hypot(re, im), phase: -Math.atan2(im, re) };
    };
  }
  return sys;
}

// Piecewise-constant inputs are sums of steps:  x(t) = sum a_i u(t - t_i).
// By linearity and time-invariance the output is y(t) = sum a_i s(t - t_i).
function inputEdges(kind) {
  if (kind === 'step') return [{ t: 0, a: 1 }];
  if (kind === 'pulse') return [{ t: 0, a: 1 }, { t: PULSE_WIDTH, a: -1 }];
  const edges = [{ t: 0, a: 1 }];           // square wave of +/-1 starting at t = 0
  let sign = -2;
  for (let t = SQUARE_PERIOD / 2; t < T_END; t += SQUARE_PERIOD / 2) {
    edges.push({ t: t, a: sign });
    sign = -sign;
  }
  return edges;
}

function inputValue(edges, t) {
  let v = 0;
  for (const e of edges) if (t >= e.t) v += e.a;
  return v;
}

function outputValue(sys, edges, t) {
  let v = 0;
  for (const e of edges) v += e.a * sys.s(t - e.t);
  return v;
}

function exportImpulseResponse() {
  const sys = currentSystem();
  const lines = ['# ' + describeSystem(sys)];
  if (sys.hImpulse !== 0) lines.push('# h(t) also contains the impulse ' + sys.hImpulse + '*delta(t), which is not listed below');
  if (sys.hDoublet !== 0) lines.push('# h(t) is the doublet ' + sys.hDoublet.toPrecision(4) + '*delta\'(t); its regular part is zero');
  lines.push('t_seconds,h,s');
  for (let i = 0; i <= 250; i++) {
    const t = i * 0.01;
    lines.push(t.toFixed(2) + ',' + sys.h(t).toPrecision(6) + ',' + sys.s(t).toPrecision(6));
  }
  saveStrings(lines, 'impulse-response', 'csv');
}

function currentSystem() {
  return buildSystem(systemSelect.value(), cutoffSlider.value(), orderSlider.value(), dampingSlider.value());
}

function describeSystem(sys) {
  const fc = sys.fc.toFixed(1) + ' Hz';
  switch (sys.kind) {
    case 'lowpass':
      return 'Butterworth low-pass, order ' + sys.N + ', fc = ' + fc + ': gain is −3 dB at fc and falls ' +
        (20 * sys.N) + ' dB per decade above it.';
    case 'highpass':
      return 'Butterworth high-pass, order ' + sys.N + ', fc = ' + fc + ': gain is −3 dB at fc and falls ' +
        (20 * sys.N) + ' dB per decade below it. h(t) contains the impulse δ(t).';
    case 'differentiator':
      return 'Differentiator, H(f) = j·f/f₀ with f₀ = ' + fc + ': gain rises 20 dB per decade, phase is +90°. ' +
        'h(t) is the doublet δ′(t)/(2πf₀).';
    case 'integrator':
      return 'Integrator, H(f) = f₀/(j·f) with f₀ = ' + fc + ': gain falls 20 dB per decade, phase is −90°. ' +
        'h(t) is a step of height 2πf₀.';
    default: {
      let s = 'Second-order resonant system, fₙ = ' + fc + ', ζ = ' + sys.zeta.toFixed(2) + ': ';
      if (sys.zeta < Math.SQRT1_2 - 1e-9) {
        const peak = 1 / (2 * sys.zeta * Math.sqrt(1 - sys.zeta * sys.zeta));
        s += 'resonant peak of ' + (20 * Math.log10(peak)).toFixed(1) + ' dB at ' +
          (sys.fc * Math.sqrt(1 - 2 * sys.zeta * sys.zeta)).toFixed(2) + ' Hz';
      } else {
        s += 'no resonant peak (ζ ≥ 0.707)';
      }
      if (sys.zeta < 1) {
        const os = 100 * Math.exp(-Math.PI * sys.zeta / Math.sqrt(1 - sys.zeta * sys.zeta));
        s += ', step overshoot ' + os.toFixed(0) + '%.';
      } else {
        s += ', no step overshoot.';
      }
      return s;
    }
  }
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

  const sys = currentSystem();
  const isFilter = sys.kind === 'lowpass' || sys.kind === 'highpass';
  setEnabled(orderSlider, isFilter);
  setEnabled(dampingSlider, sys.kind === 'resonant');

  // 2 x 2 grid of plots: time domain on the left, frequency domain on the right
  const colW = canvasWidth / 2;
  const leftPad = 50, rightPad = 12, ph = 168;
  plotRects = {
    h: { x: leftPad, y: 58, w: colW - leftPad - rightPad, h: ph },
    mag: { x: colW + leftPad, y: 58, w: colW - leftPad - rightPad, h: ph },
    s: { x: leftPad, y: 268, w: colW - leftPad - rightPad, h: ph },
    phase: { x: colW + leftPad, y: 268, w: colW - leftPad - rightPad, h: ph }
  };
  updateCursors();
  const fCursor = cursorF === null ? sys.fc : cursorF;
  const edges = inputEdges(inputSelect.value());

  drawTimePlot(plotRects.h, sys, 'h', edges, false);
  drawTimePlot(plotRects.s, sys, 's', edges, true);
  drawMagnitudePlot(plotRects.mag, sys, fCursor);
  drawPhasePlot(plotRects.phase, sys, fCursor);

  // title
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(canvasWidth < 600 ? 17 : 22);
  text('Impulse and Frequency Response Analyzer', canvasWidth / 2, 8);

  // one-line summary of the selected system
  textSize(canvasWidth < 600 ? 11 : 13);
  textAlign(LEFT, TOP);
  text(describeSystem(sys), 12, 474, canvasWidth - 24, 34);

  drawControlLabels(sys);
}

function setEnabled(control, enabled) {
  if (enabled) control.removeAttribute('disabled');
  else control.attribute('disabled', '');
}

function inside(r) {
  return mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h;
}

// hovering over a time plot moves the time cursor; over a frequency plot, the frequency cursor
function updateCursors() {
  if (inside(plotRects.h) || inside(plotRects.s)) {
    const r = plotRects.h;
    cursorT = T_START + (mouseX - r.x) / r.w * (T_END - T_START);
  } else if (inside(plotRects.mag) || inside(plotRects.phase)) {
    const r = plotRects.mag;
    cursorF = F_START * Math.pow(F_END / F_START, (mouseX - r.x) / r.w);
  }
}

// "nice" axis range and tick step covering [lo, hi]
function niceRange(lo, hi) {
  if (hi - lo < 1e-9) { lo -= 0.5; hi += 0.5; }
  const raw = (hi - lo) / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  let step = mag;
  for (const m of [1, 2, 5, 10]) { if (raw <= m * mag * 1.0001) { step = m * mag; break; } }
  return { lo: Math.floor(lo / step + 1e-9) * step, hi: Math.ceil(hi / step - 1e-9) * step, step: step };
}

function tickLabel(v, step) {
  if (Math.abs(v) < step * 1e-6) return '0';
  if (step >= 1) return v.toFixed(0);
  if (step >= 0.1) return v.toFixed(1);
  return v.toFixed(2);
}

function drawCaption(p, name, readout) {
  noStroke();
  textSize(canvasWidth < 600 ? 11 : 13);
  fill('black');
  textAlign(LEFT, BOTTOM);
  textStyle(BOLD);
  text(name, p.x, p.y - 4);
  textStyle(NORMAL);
  fill('firebrick');
  textAlign(RIGHT, BOTTOM);
  text(readout, p.x + p.w, p.y - 4);
}

function drawArrow(x, y0, y1, col) {
  stroke(col);
  strokeWeight(2.5);
  line(x, y0, x, y1);
  const d = y1 < y0 ? 1 : -1;      // arrow head direction
  line(x, y1, x - 5, y1 + 8 * d);
  line(x, y1, x + 5, y1 + 8 * d);
  strokeWeight(1);
}

function drawTimePlot(p, sys, which, edges, showTimeAxis) {
  const isStepPlot = which === 's';
  const samples = Math.max(200, Math.floor(p.w * 2));
  const valueAt = t => isStepPlot ? outputValue(sys, edges, t) : sys.h(t);

  // range from the curve (and the input, when it is drawn)
  let lo = 0, hi = 0;
  for (let i = 0; i <= samples; i++) {
    const t = T_START + (T_END - T_START) * i / samples;
    const v = valueAt(t);
    lo = Math.min(lo, v); hi = Math.max(hi, v);
    if (isStepPlot) { const xin = inputValue(edges, t); lo = Math.min(lo, xin); hi = Math.max(hi, xin); }
  }
  // leave room above and below zero for the arrows that stand for impulses
  const hasArrows = isStepPlot ? sys.sImpulse !== 0 : (sys.hImpulse !== 0 || sys.hDoublet !== 0);
  if (hasArrows && sys.hImpulse === 0) { lo = Math.min(lo, -1); hi = Math.max(hi, 1); }
  if (!isStepPlot && sys.hImpulse !== 0) hi = Math.max(hi, -lo * 0.4, 1);
  if (hi - lo < 1e-9) { lo = -1; hi = 1; }
  const range = niceRange(lo, hi);
  const X = t => p.x + (t - T_START) / (T_END - T_START) * p.w;
  const Y = v => p.y + p.h - (v - range.lo) / (range.hi - range.lo) * p.h;

  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(12);
  for (let v = range.lo; v <= range.hi + range.step * 1e-6; v += range.step) {
    stroke(Math.abs(v) < range.step * 1e-6 ? 'gray' : 'gainsboro');
    line(p.x, Y(v), p.x + p.w, Y(v));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(tickLabel(v, range.step), p.x - 5, Y(v));
  }
  for (let t = 0; t <= T_END + 1e-9; t += 0.5) {
    stroke(t === 0 ? 'gray' : 'gainsboro');
    line(X(t), p.y, X(t), p.y + p.h);
    noStroke();
    fill('black');
    textAlign(CENTER, TOP);
    text(t.toFixed(1), X(t), p.y + p.h + 4);
  }
  if (showTimeAxis) {
    noStroke();
    fill('black');
    textSize(13);
    textAlign(CENTER, TOP);
    text('Time t (s)', p.x + p.w / 2, p.y + p.h + 19);
  }

  // input signal (gray) on the response plot
  if (isStepPlot) {
    stroke('darkgray');
    strokeWeight(1.5);
    noFill();
    beginShape();
    let prev = inputValue(edges, T_START);
    vertex(X(T_START), Y(prev));
    for (let i = 1; i <= samples; i++) {
      const t = T_START + (T_END - T_START) * i / samples;
      const v = inputValue(edges, t);
      if (v !== prev) vertex(X(t), Y(prev));   // vertical edge
      vertex(X(t), Y(v));
      prev = v;
    }
    endShape();
  }

  // response curve
  stroke(isStepPlot ? 'darkgreen' : 'blue');
  strokeWeight(2.5);
  noFill();
  beginShape();
  for (let i = 0; i <= samples; i++) {
    const t = T_START + (T_END - T_START) * i / samples;
    vertex(X(t), Y(valueAt(t)));
  }
  endShape();
  strokeWeight(1);

  // impulses and doublets, drawn as arrows
  const zeroY = Y(0);
  const arrowLen = Math.min(p.h * 0.36, zeroY - p.y - 5);   // keep arrow tips inside the plot
  noStroke();
  textSize(12);
  textAlign(LEFT, TOP);
  if (!isStepPlot && sys.hImpulse !== 0) {
    drawArrow(X(0), zeroY, zeroY - arrowLen, 'blue');
    noStroke(); fill('blue');
    text('δ(t)', X(0) + 8, zeroY - arrowLen);
  }
  if (!isStepPlot && sys.hDoublet !== 0) {
    drawArrow(X(0) - 4, zeroY, zeroY - arrowLen, 'blue');
    drawArrow(X(0) + 4, zeroY, zeroY + arrowLen, 'blue');
    noStroke(); fill('blue');
    text('doublet ' + sys.hDoublet.toFixed(3) + '·δ′(t)', X(0) + 12, zeroY - arrowLen - 2);
  }
  if (isStepPlot && sys.sImpulse !== 0) {
    for (const e of edges) {
      const up = e.a > 0;
      drawArrow(X(e.t), zeroY, zeroY + (up ? -arrowLen : arrowLen), 'darkgreen');
    }
    noStroke(); fill('darkgreen');
    text('impulses, area ' + sys.sImpulse.toFixed(3) + ' per unit jump', p.x + 6, p.y + 4);
  }

  // cursor
  const tc = constrain(cursorT, T_START, T_END);
  stroke('firebrick');
  drawingContext.setLineDash([4, 4]);
  line(X(tc), p.y, X(tc), p.y + p.h);
  drawingContext.setLineDash([]);
  const vc = valueAt(tc);
  fill('firebrick');
  noStroke();
  circle(X(tc), Y(vc), 8);

  const narrow = canvasWidth < 600;
  let name;
  if (!isStepPlot) name = narrow ? 'h(t)' : 'Impulse response h(t)';
  else if (edges.length === 1) name = narrow ? 's(t)' : 'Step response s(t)';
  else name = narrow ? 'y(t)' : 'Output y(t) = x(t) * h(t)';
  const symbol = !isStepPlot ? 'h' : (edges.length === 1 ? 's' : 'y');
  drawCaption(p, name, symbol + '(' + tc.toFixed(2) + ' s) = ' + vc.toFixed(3));
}

function freqX(p, f) { return p.x + Math.log(f / F_START) / Math.log(F_END / F_START) * p.w; }

function drawFrequencyGrid(p, showAxisLabel) {
  textSize(12);
  for (let decade = 0.1; decade <= F_END * 1.0001; decade *= 10) {
    for (let m = 1; m < 10; m++) {
      const f = decade * m;
      if (f > F_END * 1.0001) break;
      stroke(m === 1 ? 'silver' : 'whitesmoke');
      line(freqX(p, f), p.y, freqX(p, f), p.y + p.h);
    }
    noStroke();
    fill('black');
    textAlign(CENTER, TOP);
    text(decade < 1 ? decade.toFixed(1) : decade.toFixed(0), freqX(p, decade), p.y + p.h + 4);
  }
  if (showAxisLabel) {
    noStroke();
    fill('black');
    textSize(13);
    textAlign(CENTER, TOP);
    text('Frequency f (Hz), log scale', p.x + p.w / 2, p.y + p.h + 19);
  }
}

function drawCutoffMarker(p, sys) {
  stroke('darkorange');
  drawingContext.setLineDash([2, 3]);
  line(freqX(p, sys.fc), p.y, freqX(p, sys.fc), p.y + p.h);
  drawingContext.setLineDash([]);
  noStroke();
  fill('chocolate');
  textSize(12);
  textAlign(LEFT, BOTTOM);
  const tag = sys.kind === 'resonant' ? 'fₙ' : (sys.kind === 'lowpass' || sys.kind === 'highpass' ? 'fc' : 'f₀');
  text(tag, freqX(p, sys.fc) + 3, p.y + p.h - 2);
}

function drawMagnitudePlot(p, sys, fCursor) {
  const Y = db => p.y + p.h - (db - DB_MIN) / (DB_MAX - DB_MIN) * p.h;
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  drawFrequencyGrid(p, false);
  textSize(12);
  for (let db = DB_MIN; db <= DB_MAX; db += 20) {
    stroke(db === 0 ? 'gray' : 'gainsboro');
    line(p.x, Y(db), p.x + p.w, Y(db));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(db, p.x - 5, Y(db));
  }
  drawCutoffMarker(p, sys);

  // the curve is clipped to the plot rectangle where it leaves the dB range
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(p.x, p.y, p.w, p.h);
  drawingContext.clip();
  stroke('purple');
  strokeWeight(2.5);
  noFill();
  beginShape();
  const samples = Math.max(200, Math.floor(p.w * 2));
  for (let i = 0; i <= samples; i++) {
    const f = F_START * Math.pow(F_END / F_START, i / samples);
    vertex(freqX(p, f), Y(Math.max(20 * Math.log10(sys.H(f).mag), DB_MIN - 40)));
  }
  endShape();
  strokeWeight(1);
  drawingContext.restore();

  const Hc = sys.H(fCursor);
  const dbc = 20 * Math.log10(Hc.mag);
  stroke('firebrick');
  drawingContext.setLineDash([4, 4]);
  line(freqX(p, fCursor), p.y, freqX(p, fCursor), p.y + p.h);
  drawingContext.setLineDash([]);
  noStroke();
  fill('firebrick');
  if (dbc >= DB_MIN && dbc <= DB_MAX) circle(freqX(p, fCursor), Y(dbc), 8);
  drawCaption(p, canvasWidth < 600 ? 'Gain (dB)' : 'Magnitude of H(f) (dB)',
    fCursor.toFixed(2) + ' Hz: ' + (canvasWidth < 600 ? '' : Hc.mag.toPrecision(3) + ' = ') + dbc.toFixed(1) + ' dB');
}

function drawPhasePlot(p, sys, fCursor) {
  // phase range in multiples of 90 degrees
  let lo = Infinity, hi = -Infinity;
  const samples = Math.max(200, Math.floor(p.w * 2));
  const phases = [];
  for (let i = 0; i <= samples; i++) {
    const f = F_START * Math.pow(F_END / F_START, i / samples);
    const deg = sys.H(f).phase * 180 / Math.PI;
    phases.push(deg);
    lo = Math.min(lo, deg); hi = Math.max(hi, deg);
  }
  let axisLo = Math.floor((lo - 1e-6) / 90) * 90;
  let axisHi = Math.ceil((hi + 1e-6) / 90) * 90;
  const step = (axisHi - axisLo) <= 90 ? 45 : 90;
  const Y = deg => p.y + p.h - (deg - axisLo) / (axisHi - axisLo) * p.h;

  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  drawFrequencyGrid(p, true);
  textSize(12);
  for (let deg = axisLo; deg <= axisHi; deg += step) {
    stroke(deg === 0 ? 'gray' : 'gainsboro');
    line(p.x, Y(deg), p.x + p.w, Y(deg));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(deg + '°', p.x - 5, Y(deg));
  }
  drawCutoffMarker(p, sys);

  stroke('teal');
  strokeWeight(2.5);
  noFill();
  beginShape();
  for (let i = 0; i <= samples; i++) {
    const f = F_START * Math.pow(F_END / F_START, i / samples);
    vertex(freqX(p, f), Y(phases[i]));
  }
  endShape();
  strokeWeight(1);

  const degC = sys.H(fCursor).phase * 180 / Math.PI;
  stroke('firebrick');
  drawingContext.setLineDash([4, 4]);
  line(freqX(p, fCursor), p.y, freqX(p, fCursor), p.y + p.h);
  drawingContext.setLineDash([]);
  noStroke();
  fill('firebrick');
  circle(freqX(p, fCursor), Y(degC), 8);
  drawCaption(p, canvasWidth < 600 ? 'Phase' : 'Phase of H(f) (degrees)', fCursor.toFixed(2) + ' Hz: ' + degC.toFixed(1) + '°');
}

function drawControlLabels(sys) {
  const narrow = canvasWidth < 600;
  const half = canvasWidth / 2;
  const isFilter = sys.kind === 'lowpass' || sys.kind === 'highpass';
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(narrow ? 13 : defaultTextSize);
  fill('black');
  text('System:', 10, drawHeight + 17);
  text('Input:', half + 10, drawHeight + 17);

  let fLabel;
  if (isFilter) fLabel = narrow ? 'fc: ' : 'Cutoff fc: ';
  else if (sys.kind === 'resonant') fLabel = narrow ? 'fₙ: ' : 'Natural fₙ: ';
  else fLabel = narrow ? 'f₀: ' : 'Unity gain f₀: ';
  text(fLabel + sys.fc.toFixed(1) + ' Hz', 10, drawHeight + 52);

  fill(isFilter ? 'black' : 'gray');
  text(isFilter ? (narrow ? 'N: ' : 'Filter order N: ') + sys.N : (narrow ? 'N: not used' : 'Order: not used'),
    half + 10, drawHeight + 52);

  const usesZeta = sys.kind === 'resonant';
  fill(usesZeta ? 'black' : 'gray');
  text(usesZeta ? (narrow ? 'ζ: ' : 'Damping ratio ζ: ') + sys.zeta.toFixed(2)
    : (narrow ? 'ζ: not used' : 'Damping: not used'), 10, drawHeight + 87);
}

// ---------------------------------------------------------------------------
// Responsive layout
// ---------------------------------------------------------------------------

function positionControls() {
  const narrow = canvasWidth < 600;
  const half = canvasWidth / 2;
  const labelW = narrow ? 95 : sliderLeftMargin + 15;
  const sliderW = Math.max(40, half - labelW - 12);
  systemSelect.position(narrow ? 65 : 75, drawHeight + 6);
  systemSelect.style('max-width', Math.max(80, half - 85) + 'px');
  inputSelect.position(half + (narrow ? 52 : 60), drawHeight + 6);
  inputSelect.style('max-width', Math.max(80, half - 70) + 'px');
  cutoffSlider.position(labelW, drawHeight + 42);
  orderSlider.position(half + labelW, drawHeight + 42);
  dampingSlider.position(labelW, drawHeight + 77);
  [cutoffSlider, orderSlider, dampingSlider].forEach(s => s.size(sliderW));
  exportButton.position(half + 10, drawHeight + 78);
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
