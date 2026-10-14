// Interactive Pole-Zero Analysis Tool MicroSim
// CANVAS_HEIGHT: 545
// Poles and zeros of a discrete-time system are placed on the z-plane.  The
// magnitude and phase of H(e^{jw}) are computed from the distances and angles of
// the vectors from every pole and zero to the point e^{jw} on the unit circle,
// and the impulse and step responses from the matching difference equation.
// A causal system is stable when every pole lies inside the unit circle.

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 670;
let drawHeight = 430;
let controlHeight = 115;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 200;
let defaultTextSize = 16;

// ---- model ----
const PLANE_RANGE = 1.6;      // the z-plane is drawn from -1.6 to +1.6 on both axes
const R_MAX = 1.5;
const N_FREQ = 256;           // points of the frequency response, 0 ... pi
const N_TIME = 50;            // samples of the impulse and step responses
const MAX_ITEMS = 6;
const ON_CIRCLE = 5e-4;       // |r - 1| below this counts as "on the unit circle"

// Each item is one real root (angle 0 or 180 degrees) or a conjugate pair (any other angle).
const PRESETS = [
  { id: 'resonator', label: 'Resonator (pole pair)', items: [['pole', 0.9, 45]] },
  { id: 'notch', label: 'Notch filter', items: [['zero', 1, 60], ['pole', 0.9, 60]] },
  { id: 'lowpass', label: 'Low-pass (one real pole)', items: [['pole', 0.8, 0], ['zero', 1, 180]] },
  { id: 'highpass', label: 'High-pass (one real pole)', items: [['pole', 0.8, 180], ['zero', 1, 0]] },
  { id: 'fir', label: 'Moving average of 4 (FIR)', items: [['zero', 1, 90], ['zero', 1, 180]] },
  { id: 'allpass', label: 'All-pass (zeros at 1/r)', items: [['pole', 0.8, 60], ['zero', 1.25, 60]] },
  { id: 'oscillator', label: 'Oscillator (poles on the circle)', items: [['pole', 1, 45]] },
  { id: 'unstable', label: 'Unstable (poles outside)', items: [['pole', 1.05, 45]] }
];

// ---- controls ----
let presetSelect, addPoleButton, addZeroButton, removeButton, radiusSlider, angleSlider;

// ---- state ----
let items = [];
let selected = 0;             // index into items, or -1
let dragging = false;
let cursorOmega = 0.6 * Math.PI;
let panels = {};

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  presetSelect = createSelect();
  for (const p of PRESETS) presetSelect.option(p.label, p.id);
  presetSelect.selected('resonator');
  presetSelect.changed(loadPreset);

  addPoleButton = createButton('Add pole');
  addPoleButton.mousePressed(() => addItem('pole'));
  addZeroButton = createButton('Add zero');
  addZeroButton.mousePressed(() => addItem('zero'));
  removeButton = createButton('Remove');
  removeButton.mousePressed(removeSelected);

  radiusSlider = createSlider(0, R_MAX, 0.9, 0.01);
  radiusSlider.input(slidersMoved);
  angleSlider = createSlider(0, 180, 45, 1);
  angleSlider.input(slidersMoved);

  const mainElement = document.querySelector('main');
  [presetSelect, addPoleButton, addZeroButton, removeButton, radiusSlider, angleSlider].forEach(c => c.parent(mainElement));
  positionControls();
  loadPreset();

  describe('A z-plane with the unit circle, poles drawn as crosses and zeros as circles that can be dragged. ' +
    'Four plots show the magnitude response, phase response, impulse response and step response of the system, ' +
    'and a banner says whether the system is stable.', LABEL);
}

// ---------------------------------------------------------------------------
// System model
// ---------------------------------------------------------------------------

function isReal(it) { return it.theta === 0 || it.theta === 180; }

// All roots of one kind as complex numbers [re, im], conjugates included.
function roots(type) {
  const out = [];
  for (const it of items) {
    if (it.type !== type) continue;
    const a = it.theta * Math.PI / 180;
    if (isReal(it)) out.push([it.theta === 0 ? it.r : -it.r, 0]);
    else { out.push([it.r * Math.cos(a), it.r * Math.sin(a)]); out.push([it.r * Math.cos(a), -it.r * Math.sin(a)]); }
  }
  return out;
}

// Coefficients of the product of (1 - q z^-1) over the roots q, in powers of z^-1.
// Conjugate pairs are multiplied together first, so every coefficient is real.
function polynomial(type) {
  let c = [1];
  for (const it of items) {
    if (it.type !== type) continue;
    const a = it.theta * Math.PI / 180;
    const factor = isReal(it) ? [1, it.theta === 0 ? -it.r : it.r] : [1, -2 * it.r * Math.cos(a), it.r * it.r];
    const next = new Array(c.length + factor.length - 1).fill(0);
    for (let i = 0; i < c.length; i++) for (let j = 0; j < factor.length; j++) next[i + j] += c[i] * factor[j];
    c = next;
  }
  return c;
}

// H(e^{jw}) = product over zeros of (1 - z_i e^{-jw}) / product over poles of (1 - p_i e^{-jw}),  gain G = 1.
// |1 - q e^{-jw}| is the distance from the root q to the point e^{jw} on the unit circle.
function responseAt(w, zs, ps) {
  let mag = 1, phase = 0;
  const cw = Math.cos(w), sw = Math.sin(w);
  for (const q of zs) {
    const re = 1 - (q[0] * cw + q[1] * sw), im = q[0] * sw - q[1] * cw;      // 1 - q e^{-jw}
    mag *= Math.hypot(re, im);
    phase += Math.atan2(im, re);
  }
  for (const q of ps) {
    const re = 1 - (q[0] * cw + q[1] * sw), im = q[0] * sw - q[1] * cw;
    mag /= Math.max(Math.hypot(re, im), 1e-12);
    phase -= Math.atan2(im, re);
  }
  return { mag: mag, phase: phase };
}

function wrapDegrees(rad) {
  let d = rad * 180 / Math.PI;
  d = ((d + 180) % 360 + 360) % 360 - 180;
  return d;
}

// Impulse response of  A(z^-1) y = B(z^-1) x  by running the difference equation
//   y[n] = sum_k b[k] x[n-k] - sum_{k>=1} a[k] y[n-k]
function impulseResponse(b, a, count) {
  const h = new Array(count).fill(0);
  for (let n = 0; n < count; n++) {
    let v = n < b.length ? b[n] : 0;
    for (let k = 1; k < a.length && k <= n; k++) v -= a[k] * h[n - k];
    h[n] = v;
  }
  return h;
}

function stability(ps) {
  if (ps.length === 0) return { state: 'stable', maxR: 0, fir: true };
  let maxR = 0;
  for (const q of ps) maxR = Math.max(maxR, Math.hypot(q[0], q[1]));
  if (maxR > 1 + ON_CIRCLE) return { state: 'unstable', maxR: maxR };
  if (maxR < 1 - ON_CIRCLE) return { state: 'stable', maxR: maxR };
  // poles on the unit circle: a repeated one makes the response grow without bound
  const onCircle = ps.filter(q => Math.abs(Math.hypot(q[0], q[1]) - 1) <= ON_CIRCLE);
  for (let i = 0; i < onCircle.length; i++) {
    for (let j = i + 1; j < onCircle.length; j++) {
      if (Math.hypot(onCircle[i][0] - onCircle[j][0], onCircle[i][1] - onCircle[j][1]) < 1e-6) {
        return { state: 'unstable', maxR: maxR, repeated: true };
      }
    }
  }
  return { state: 'marginal', maxR: maxR };
}

function analyzeSystem() {
  const zs = roots('zero'), ps = roots('pole');
  const b = polynomial('zero'), a = polynomial('pole');
  const mag = new Float64Array(N_FREQ + 1), phase = new Float64Array(N_FREQ + 1);
  for (let i = 0; i <= N_FREQ; i++) {
    const r = responseAt(Math.PI * i / N_FREQ, zs, ps);
    mag[i] = r.mag;
    phase[i] = wrapDegrees(r.phase);
  }
  const h = impulseResponse(b, a, N_TIME);
  const step = [];
  let acc = 0;
  for (let n = 0; n < N_TIME; n++) { acc += h[n]; step.push(acc); }
  return { zs: zs, ps: ps, b: b, a: a, mag: mag, phase: phase, h: h, step: step, stab: stability(ps) };
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

function loadPreset() {
  const p = PRESETS.find(q => q.id === presetSelect.value());
  items = p.items.map(it => ({ type: it[0], r: it[1], theta: it[2] }));
  selectItem(0);
}

function selectItem(i) {
  selected = i;
  if (i >= 0 && i < items.length) {
    radiusSlider.value(items[i].r);
    angleSlider.value(items[i].theta);
  }
}

function slidersMoved() {
  if (selected < 0 || selected >= items.length) return;
  items[selected].r = radiusSlider.value();
  items[selected].theta = angleSlider.value();
}

function addItem(type) {
  if (items.length >= MAX_ITEMS) return;
  const count = items.filter(it => it.type === type).length;
  items.push({ type: type, r: type === 'pole' ? 0.7 : 1, theta: (90 + 40 * count) % 180 });
  selectItem(items.length - 1);
}

function removeSelected() {
  if (selected < 0 || selected >= items.length) return;
  items.splice(selected, 1);
  selectItem(items.length > 0 ? Math.min(selected, items.length - 1) : -1);
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

  const narrow = canvasWidth < 600;
  const size = narrow ? Math.max(130, Math.floor(canvasWidth * 0.40)) : 250;
  panels.plane = { x: 12, y: 80, w: size, h: size };
  const px = 12 + size + (narrow ? 38 : 50);
  const pw = canvasWidth - px - 14;
  panels.mag = { x: px, y: 80, w: pw, h: 60 };
  panels.phase = { x: px, y: 162, w: pw, h: 60 };
  panels.impulse = { x: px, y: 262, w: pw, h: 60 };
  panels.step = { x: px, y: 344, w: pw, h: 60 };

  // the frequency cursor follows the mouse over either frequency plot
  for (const p of [panels.mag, panels.phase]) {
    if (mouseX >= p.x && mouseX <= p.x + p.w && mouseY >= p.y && mouseY <= p.y + p.h) {
      cursorOmega = (mouseX - p.x) / p.w * Math.PI;
    }
  }

  const sys = analyzeSystem();
  const hasSelection = selected >= 0 && selected < items.length;
  for (const c of [radiusSlider, angleSlider, removeButton]) {
    if (hasSelection) c.removeAttribute('disabled'); else c.attribute('disabled', '');
  }
  for (const c of [addPoleButton, addZeroButton]) {
    if (items.length < MAX_ITEMS) c.removeAttribute('disabled'); else c.attribute('disabled', '');
  }

  drawBanner(sys);
  drawPlane(panels.plane, sys);
  drawPlaneReadout(panels.plane, sys);
  drawMagnitude(panels.mag, sys);
  drawPhase(panels.phase, sys);
  drawSequence(panels.impulse, sys.h, 'Impulse response h[n]', 'teal', false);
  drawSequence(panels.step, sys.step, 'Step response s[n]', 'purple', true);

  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(narrow ? 19 : 22);
  text('Interactive Pole-Zero Analysis Tool', canvasWidth / 2, narrow ? 10 : 8);

  drawControlLabels(hasSelection);
}

function drawBanner(sys) {
  const narrow = canvasWidth < 600;
  const st = sys.stab;
  let msg, col, bg;
  if (st.state === 'stable') {
    col = 'darkgreen'; bg = 'honeydew';
    if (st.fir) msg = narrow ? 'STABLE: no poles away from z = 0 (FIR)' : 'STABLE: an FIR system, whose only poles are at z = 0';
    else msg = narrow ? 'STABLE: all poles inside the circle' : 'STABLE: every pole is inside the unit circle (largest |p| = ' + st.maxR.toFixed(2) + ')';
  } else if (st.state === 'marginal') {
    col = 'saddlebrown'; bg = 'lemonchiffon';
    msg = narrow ? 'MARGINALLY STABLE: pole on the circle' : 'MARGINALLY STABLE: a pole lies on the unit circle, so h[n] neither decays nor grows';
  } else {
    col = 'firebrick'; bg = 'mistyrose';
    if (st.repeated) msg = narrow ? 'UNSTABLE: repeated pole on the circle' : 'UNSTABLE: a repeated pole on the unit circle makes h[n] grow';
    else msg = narrow ? 'UNSTABLE: pole outside the circle' : 'UNSTABLE: a pole lies outside the unit circle (|p| = ' + st.maxR.toFixed(2) + '), so h[n] grows';
  }
  stroke(col);
  strokeWeight(1.5);
  fill(bg);
  rect(10, 34, canvasWidth - 20, 24, 8);
  strokeWeight(1);
  noStroke();
  fill(col);
  textSize(narrow ? 12 : 14);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(msg, canvasWidth / 2, 46);
  textStyle(NORMAL);
}

function caption(p, str, col, rightText) {
  noStroke();
  textSize(canvasWidth < 600 ? 11 : 13);
  fill(col);
  textStyle(BOLD);
  textAlign(LEFT, BOTTOM);
  text(str, p.x, p.y - 4);
  textStyle(NORMAL);
  if (rightText) {
    fill('black');
    textSize(canvasWidth < 600 ? 10 : 12);
    textAlign(RIGHT, BOTTOM);
    text(rightText, p.x + p.w, p.y - 4);
  }
}

function planeScale(p) { return (p.w / 2) / PLANE_RANGE; }

function drawCross(x, y, s) { line(x - s, y - s, x + s, y + s); line(x - s, y + s, x + s, y - s); }

function drawPlane(p, sys) {
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2, sc = planeScale(p);
  const X = re => cx + re * sc, Y = im => cy - im * sc;

  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);

  // unit circle: poles inside it give a stable causal system
  fill('rgba(60, 179, 113, 0.14)');
  stroke('seagreen');
  strokeWeight(1.5);
  circle(cx, cy, 2 * sc);
  strokeWeight(1);
  stroke('gray');
  line(p.x, cy, p.x + p.w, cy);
  line(cx, p.y, cx, p.y + p.h);
  noStroke();
  fill('dimgray');
  textSize(11);
  textAlign(RIGHT, BOTTOM);
  text('Re', p.x + p.w - 3, cy - 2);
  textAlign(LEFT, TOP);
  text('Im', cx + 3, p.y + 2);
  textAlign(LEFT, TOP);
  text('1', X(1) + 3, cy + 2);
  textAlign(RIGHT, TOP);
  text('−1', X(-1) - 3, cy + 2);

  // vectors from every root to the point e^{jw} at the frequency cursor
  const ex = X(Math.cos(cursorOmega)), ey = Y(Math.sin(cursorOmega));
  stroke('rgba(30, 80, 200, 0.45)');
  for (const q of sys.zs) line(X(q[0]), Y(q[1]), ex, ey);
  stroke('rgba(200, 30, 30, 0.45)');
  for (const q of sys.ps) line(X(q[0]), Y(q[1]), ex, ey);
  noStroke();
  fill('darkorange');
  circle(ex, ey, 9);
  fill('chocolate');
  textSize(11);
  textAlign(LEFT, BOTTOM);
  text('e^jω', Math.min(ex + 6, p.x + p.w - 26), ey - 4);

  // poles or zeros at z = 0 that a causal system needs when the two counts differ
  const extra = sys.ps.length - sys.zs.length;
  if (extra !== 0) {
    stroke('darkgray');
    strokeWeight(2);
    noFill();
    if (extra > 0) circle(cx, cy, 10); else drawCross(cx, cy, 5);
    strokeWeight(1);
    noStroke();
    fill('dimgray');
    textAlign(LEFT, TOP);
    textSize(11);
    text('×' + Math.abs(extra) + (extra > 0 ? ' zero' : ' pole') + (Math.abs(extra) > 1 ? 's' : ''), cx + 8, cy + 14);
  }

  // the roots themselves
  items.forEach((it, i) => {
    const a = it.theta * Math.PI / 180;
    const pts = isReal(it) ? [[it.theta === 0 ? it.r : -it.r, 0]] : [[it.r * Math.cos(a), it.r * Math.sin(a)], [it.r * Math.cos(a), -it.r * Math.sin(a)]];
    for (const q of pts) {
      const x = X(q[0]), y = Y(q[1]);
      if (i === selected) {
        noFill();
        stroke('orange');
        strokeWeight(3);
        circle(x, y, 22);
      }
      strokeWeight(2.5);
      if (it.type === 'pole') { stroke('crimson'); drawCross(x, y, 6); }
      else { stroke('royalblue'); fill('white'); circle(x, y, 12); }
    }
  });
  strokeWeight(1);
  caption(p, canvasWidth < 600 ? 'z-plane' : 'z-plane:  × pole   ○ zero   (drag to move)', 'black', '');
}

function fmtSigned(v, digits) {
  const s = Math.abs(v).toFixed(digits);
  return (v < 0 && parseFloat(s) !== 0 ? '−' : '') + s;
}

function drawPlaneReadout(p, sys) {
  const narrow = canvasWidth < 600;
  const x = p.x, top = p.y + p.h + 10;
  const lines = [];
  if (selected >= 0 && selected < items.length) {
    const it = items[selected];
    const a = it.theta * Math.PI / 180;
    const kind = (it.type === 'pole' ? 'pole' : 'zero') + (isReal(it) ? '' : ' pair');
    lines.push(['Selected: ' + kind, it.type === 'pole' ? 'crimson' : 'royalblue', true]);
    if (isReal(it)) lines.push(['z = ' + fmtSigned(it.theta === 0 ? it.r : -it.r, 2) + '  (real)', 'black', false]);
    else lines.push(['z = ' + fmtSigned(it.r * Math.cos(a), 3) + ' ± j' + (it.r * Math.sin(a)).toFixed(3), 'black', false]);
  } else {
    lines.push(['Nothing selected', 'dimgray', true]);
    lines.push(['Click a pole or zero', 'dimgray', false]);
  }
  const r = responseAt(cursorOmega, sys.zs, sys.ps);
  const db = 20 * Math.log10(Math.max(r.mag, 1e-12));
  lines.push(['At ω = ' + (cursorOmega / Math.PI).toFixed(2) + 'π rad/sample:', 'chocolate', true]);
  lines.push(['|H| = ' + (r.mag >= 1000 ? r.mag.toExponential(1) : r.mag.toFixed(3)) + (narrow ? '' : '  (' + fmtSigned(db, 1) + ' dB)'), 'black', false]);
  lines.push(['∠H = ' + fmtSigned(wrapDegrees(r.phase), 0) + '°', 'black', false]);
  noStroke();
  textAlign(LEFT, TOP);
  const lh = narrow ? 15 : 17;
  lines.forEach((ln, i) => {
    fill(ln[1]);
    textSize(narrow ? 11 : 13);
    textStyle(ln[2] ? BOLD : NORMAL);
    text(ln[0], x, top + i * lh);
  });
  textStyle(NORMAL);
}

function frequencyFrame(p, yMin, yMax, ticks, showOmegaTicks) {
  const X = w => p.x + w / Math.PI * p.w;
  const Y = v => p.y + p.h - (constrain(v, yMin, yMax) - yMin) / (yMax - yMin) * p.h;
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(canvasWidth < 600 ? 10 : 12);
  for (const tk of ticks) {
    stroke('gainsboro');
    line(p.x, Y(tk[0]), p.x + p.w, Y(tk[0]));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(tk[1], p.x - 4, Y(tk[0]));
  }
  const labels = ['0', 'π/4', 'π/2', '3π/4', 'π'];
  for (let j = 0; j <= 4; j++) {
    stroke('gainsboro');
    line(p.x + j / 4 * p.w, p.y, p.x + j / 4 * p.w, p.y + p.h);
    if (showOmegaTicks) {
      noStroke();
      fill('black');
      textAlign(j === 0 ? LEFT : (j === 4 ? RIGHT : CENTER), TOP);
      text(labels[j], p.x + j / 4 * p.w, p.y + p.h + 4);
    }
  }
  // frequency cursor
  stroke('darkorange');
  drawingContext.setLineDash([3, 3]);
  line(X(cursorOmega), p.y, X(cursorOmega), p.y + p.h);
  drawingContext.setLineDash([]);
  return { X: X, Y: Y };
}

function drawMagnitude(p, sys) {
  // dB scale: the top is the next 10 dB above the peak, and 60 dB are shown
  let peak = -Infinity;
  for (let i = 0; i <= N_FREQ; i++) peak = Math.max(peak, 20 * Math.log10(Math.max(sys.mag[i], 1e-12)));
  const top = constrain(10 * Math.ceil((peak + 0.5) / 10), -40, 80);
  const s = frequencyFrame(p, top - 60, top, [[top - 60, fmtSigned(top - 60, 0)], [top - 30, fmtSigned(top - 30, 0)], [top, fmtSigned(top, 0)]], false);
  const valid = sys.stab.state === 'stable';
  stroke(valid ? 'crimson' : 'gray');
  strokeWeight(2);
  noFill();
  if (!valid) drawingContext.setLineDash([5, 4]);
  beginShape();
  for (let i = 0; i <= N_FREQ; i++) vertex(s.X(Math.PI * i / N_FREQ), s.Y(20 * Math.log10(Math.max(sys.mag[i], 1e-12))));
  endShape();
  drawingContext.setLineDash([]);
  strokeWeight(1);
  const narrow = canvasWidth < 600;
  let title = narrow ? 'Magnitude |H| (dB)' : 'Magnitude |H(e^jω)| in dB, gain G = 1';
  if (!valid) title = narrow ? '|H| (dB): not stable' : 'Magnitude (dB): formula only, the system is not stable';
  caption(p, title, valid ? 'crimson' : 'dimgray', '');
}

function drawPhase(p, sys) {
  const s = frequencyFrame(p, -200, 200, [[-180, '−180°'], [0, '0°'], [180, '180°']], true);
  const valid = sys.stab.state === 'stable';
  stroke(valid ? 'seagreen' : 'gray');
  strokeWeight(2);
  noFill();
  if (!valid) drawingContext.setLineDash([5, 4]);
  // break the curve where the phase wraps from -180 to +180 degrees
  beginShape();
  for (let i = 0; i <= N_FREQ; i++) {
    if (i > 0 && Math.abs(sys.phase[i] - sys.phase[i - 1]) > 180) { endShape(); beginShape(); }
    vertex(s.X(Math.PI * i / N_FREQ), s.Y(sys.phase[i]));
  }
  endShape();
  drawingContext.setLineDash([]);
  strokeWeight(1);
  caption(p, canvasWidth < 600 ? 'Phase ∠H' : 'Phase ∠H(e^jω)', valid ? 'seagreen' : 'dimgray', canvasWidth < 600 ? 'ω (rad/sample)' : 'frequency ω (rad/sample)');
}

// Round a positive number up to 1, 2 or 5 times a power of ten.
function niceCeil(v) {
  if (!(v > 0)) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 5, 10]) if (v <= m * e * 1.0000001) return m * e;
  return 10 * e;
}

function fmtTick(v) {
  if (v === 0) return '0';
  const a = Math.abs(v);
  const s = a >= 10000 || a < 0.01 ? a.toExponential(0).replace('+', '') : String(parseFloat(a.toPrecision(2)));
  return (v < 0 ? '−' : '') + s;
}

function drawSequence(p, data, title, col, showTicks) {
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const yMax = niceCeil(Math.max(peak, 1e-6));
  const X = n => p.x + (n + 0.5) / N_TIME * p.w;
  const Y = v => p.y + p.h / 2 - constrain(v / yMax, -1.08, 1.08) / 1.08 * (p.h / 2);
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(canvasWidth < 600 ? 10 : 12);
  for (const v of [-yMax, 0, yMax]) {
    stroke(v === 0 ? 'gray' : 'gainsboro');
    line(p.x, Y(v), p.x + p.w, Y(v));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(fmtTick(v), p.x - 4, Y(v));
  }
  for (let n = 0; n < N_TIME; n += 10) {
    stroke('gainsboro');
    line(X(n), p.y, X(n), p.y + p.h);
    if (showTicks) {
      noStroke();
      fill('black');
      textAlign(CENTER, TOP);
      text(n, X(n), p.y + p.h + 4);
    }
  }
  const dot = Math.min(5, p.w / N_TIME * 0.7);
  for (let n = 0; n < N_TIME; n++) {
    stroke(col);
    strokeWeight(1.5);
    line(X(n), Y(0), X(n), Y(data[n]));
    noStroke();
    fill(col);
    circle(X(n), Y(data[n]), dot);
  }
  strokeWeight(1);
  caption(p, title, col, canvasWidth < 600 ? 'n' : 'n (samples)');
}

function drawControlLabels(hasSelection) {
  const narrow = canvasWidth < 600;
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  textSize(narrow ? 13 : defaultTextSize);
  if (!narrow) text('System:', 10, drawHeight + 18);
  fill(hasSelection ? 'black' : 'gray');
  const r = radiusSlider.value(), th = angleSlider.value();
  text((narrow ? '|z|: ' : 'Radius |z|: ') + r.toFixed(2), 10, drawHeight + 53);
  const pm = th === 0 || th === 180 ? '' : '±';
  text((narrow ? '∠z: ' : 'Angle ∠z: ') + pm + th + '°' + (narrow ? '' : ' (' + (th / 180).toFixed(2) + 'π)'), 10, drawHeight + 88);
}

// ---------------------------------------------------------------------------
// Mouse: select and drag poles and zeros on the z-plane
// ---------------------------------------------------------------------------

function itemUnderMouse() {
  const p = panels.plane;
  if (!p) return -1;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2, sc = planeScale(p);
  let best = -1, bestD = 14;
  items.forEach((it, i) => {
    const a = it.theta * Math.PI / 180;
    const re = isReal(it) ? (it.theta === 0 ? it.r : -it.r) : it.r * Math.cos(a);
    const im = isReal(it) ? 0 : it.r * Math.sin(a);
    for (const sgn of [1, -1]) {
      const d = dist(mouseX, mouseY, cx + re * sc, cy - sgn * im * sc);
      if (d < bestD) { bestD = d; best = i; }
    }
  });
  return best;
}

function mousePressed() {
  const i = itemUnderMouse();
  if (i >= 0) {
    selectItem(i);
    dragging = true;
  }
}

function mouseDragged() {
  if (!dragging || selected < 0) return;
  const p = panels.plane;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2, sc = planeScale(p);
  const re = (mouseX - cx) / sc, im = (cy - mouseY) / sc;
  let r = Math.min(R_MAX, Math.hypot(re, im));
  let th = Math.abs(Math.atan2(im, re)) * 180 / Math.PI;       // a pair is defined by its upper-half root
  if (Math.abs(r - 1) < 0.02) r = 1;                           // snap to the unit circle
  if (th < 4) th = 0;                                          // snap to the real axis
  if (th > 176) th = 180;
  items[selected].r = Math.round(r * 100) / 100;
  items[selected].theta = Math.round(th);
  radiusSlider.value(items[selected].r);
  angleSlider.value(items[selected].theta);
  return false;                                                // keep the page from scrolling while dragging
}

function mouseReleased() { dragging = false; }

// ---------------------------------------------------------------------------
// Responsive layout
// ---------------------------------------------------------------------------

function positionControls() {
  const narrow = canvasWidth < 600;
  addPoleButton.html(narrow ? '+ Pole' : 'Add pole');
  addZeroButton.html(narrow ? '+ Zero' : 'Add zero');
  removeButton.html(narrow ? 'Del' : 'Remove');
  const widths = narrow ? [58, 58, 40] : [84, 84, 76];
  let bx = canvasWidth - 10 - widths.reduce((a, b) => a + b + 6, 0) + 6;
  const selectLeft = narrow ? 8 : 76;
  presetSelect.position(selectLeft, drawHeight + 7);
  presetSelect.style('width', Math.max(80, bx - selectLeft - 10) + 'px');
  [addPoleButton, addZeroButton, removeButton].forEach((b, i) => {
    b.position(bx, drawHeight + 5);
    b.size(widths[i]);
    bx += widths[i] + 6;
  });
  const labelW = narrow ? 105 : sliderLeftMargin;
  radiusSlider.position(labelW, drawHeight + 42);
  radiusSlider.size(canvasWidth - labelW - margin);
  angleSlider.position(labelW, drawHeight + 77);
  angleSlider.size(canvasWidth - labelW - margin);
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
