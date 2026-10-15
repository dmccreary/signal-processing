// Phasor Addition MicroSim
// CANVAS_HEIGHT: 610
// Adds up to three sinusoids A_k cos(w t + phi_k) of the same frequency by adding their
// phasors A_k e^{j phi_k} head to tail. Left: the rotating phasor diagram, drawn with the colour
// convention of the Euler's Formula Explorer (blue real axis, red imaginary axis, green vector).
// Right: the individual waveforms (thin) and their sum (thick) with a cursor at the current time.
// "Phasor 2 at f2" lets phasor 2 turn at a second frequency, so the resultant's length - the
// envelope of the sum - changes with time and the sum beats at |f2 - f1|.

// Canvas dimensions
let canvasWidth = 730;               // overwritten from the container in updateCanvasSize()
let drawHeight = 440;
let controlHeight = 170;
let canvasHeight = drawHeight + controlHeight;
let margin = 14;
let defaultTextSize = 16;

// Model constants
const T_WINDOW = 8;                                  // seconds of signal shown in the waveform plot
const NICE_RANGES = [1, 1.5, 2, 2.5, 3, 4, 5, 6];    // axis half-ranges (amplitude units)
const DEFAULTS = [
  { on: true,  A: 1.0, phi: 0 },
  { on: true,  A: 1.0, phi: 90 },
  { on: false, A: 0.5, phi: -90 }
];
const DEFAULT_F1 = 0.5;                              // Hz
const DEFAULT_F2 = 0.75;                             // Hz

// Colours: real = blue, imaginary = red, resultant and sum = green (Euler's Formula Explorer)
const COL_REAL = [0, 100, 200];
const COL_IMAG = [200, 50, 50];
const COL_RES = [0, 150, 75];
const COL_CURSOR = [184, 134, 11];
const PH_COL = [[205, 105, 0], [125, 60, 180], [125, 80, 35]];   // phasor 1 orange, 2 purple, 3 brown

// Controls
let enableBoxes = [], ampSliders = [], phaseSliders = [];
let pauseButton, resetButton, speedSlider, beatCheckbox, f2Slider;

// State
let t = 0;                     // simulated time in seconds
let isRunning = false;                // MicroSims open paused; the learner presses Play
let ph = DEFAULTS.map(d => ({ on: d.on, A: d.A, phi: d.phi }));
let f1 = DEFAULT_F1, f2 = DEFAULT_F2, beatMode = false;
let L = {};                    // layout, recomputed when the width changes
let layoutWidth = -1;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);
  createControls();
  layoutWidth = -1;
  updateCanvasSize();
  describe('Phasor addition. Left: up to three rotating phasors, drawn head to tail in orange, purple and brown, and their green resultant on a complex plane with a blue real axis and a red imaginary axis. Right: each phasor\'s cosine waveform as a thin line and their sum as a thick green line over an 8 second window, with a gold cursor at the current time. Sliders set each amplitude and phase, the rotation frequency f1 and a second frequency f2 for phasor 2; read-outs give the resultant amplitude and phase, or the beat frequency.');
}

// ------------------------------------------------------------------ controls

function createControls() {
  for (let k = 0; k < 3; k++) {
    enableBoxes[k] = createCheckbox('Phasor ' + (k + 1), DEFAULTS[k].on);
    enableBoxes[k].style('color', rgbStr(PH_COL[k]));
    enableBoxes[k].style('font-weight', 'bold');
    ampSliders[k] = createSlider(0, 2, DEFAULTS[k].A, 0.05);
    phaseSliders[k] = createSlider(-180, 180, DEFAULTS[k].phi, 5);
  }
  pauseButton = createButton('Play');
  pauseButton.mousePressed(togglePause);
  resetButton = createButton('Reset');
  resetButton.mousePressed(resetTime);
  speedSlider = createSlider(0.1, 2, DEFAULT_F1, 0.05);
  beatCheckbox = createCheckbox('Phasor 2 at f<sub>2</sub>', false);
  f2Slider = createSlider(0.1, 2, DEFAULT_F2, 0.05);
}

// vertical centre of control row i
function rowY(i) {
  return drawHeight + 19 + 33 * i;
}

function setCheckboxLabel(cb, html) {
  const span = cb.elt.querySelector('span');
  if (span && span.innerHTML !== html) span.innerHTML = html;
}

// Five rows: three phasor rows [checkbox][A label][slider][phi label][slider],
// [Pause][Reset][f1 label][slider] and [f2 checkbox][f2 label][slider]
function layoutControls() {
  const narrow = L.narrow;
  const sz = narrow ? 14 : 16;
  L.ctlSize = sz;
  const x0 = narrow ? 6 : 10;
  const gap = narrow ? 6 : 12;
  const right = canvasWidth - (narrow ? 8 : margin);

  // position the checkboxes first: until then their <div> is a full-width block
  for (let k = 0; k < 3; k++) {
    setCheckboxLabel(enableBoxes[k], narrow ? String(k + 1) : 'Phasor ' + (k + 1));
    enableBoxes[k].style('font-size', sz + 'px');
    enableBoxes[k].position(x0, rowY(k) - 12);
  }
  setCheckboxLabel(beatCheckbox, narrow ? '2 at f<sub>2</sub>' : 'Phasor 2 at f<sub>2</sub>');
  beatCheckbox.style('font-size', sz + 'px');
  beatCheckbox.position(x0, rowY(4) - 12);

  let cbW = 0;
  for (const cb of enableBoxes) cbW = Math.max(cbW, cb.elt.offsetWidth);
  const aW = richWidth(narrow ? 'A=2.00' : 'A_1 = 2.00', sz) + 6;
  const pW = richWidth(narrow ? 'φ=−180°' : 'φ_1 = −180°', sz) + 6;
  L.colA = x0 + cbW + gap;
  L.sliderA = L.colA + aW;
  const sW = Math.max(50, Math.floor((right - L.sliderA - gap - pW) / 2));
  L.colP = L.sliderA + sW + gap;
  L.sliderP = L.colP + pW;
  const sWP = Math.max(50, right - L.sliderP);
  for (let k = 0; k < 3; k++) {
    ampSliders[k].position(L.sliderA, rowY(k) - 8);
    ampSliders[k].size(sW);
    phaseSliders[k].position(L.sliderP, rowY(k) - 8);
    phaseSliders[k].size(sWP);
  }

  const bW = narrow ? 54 : 64;
  for (const b of [pauseButton, resetButton]) {
    b.style('font-size', (narrow ? 14 : 15) + 'px');
    b.style('width', bW + 'px');
  }
  pauseButton.position(x0, rowY(3) - 12);
  resetButton.position(x0 + bW + 6, rowY(3) - 12);
  L.colF1 = x0 + 2 * bW + 6 + gap;
  const fW = richWidth(narrow ? 'f_1 = 2.00 Hz' : 'Speed f_1 = 2.00 Hz', sz) + 8;
  speedSlider.position(L.colF1 + fW, rowY(3) - 8);
  speedSlider.size(Math.max(50, right - L.colF1 - fW));

  L.colF2 = x0 + beatCheckbox.elt.offsetWidth + gap;
  const f2W = richWidth('f_2 = 2.00 Hz', sz) + 8;
  f2Slider.position(L.colF2 + f2W, rowY(4) - 8);
  f2Slider.size(Math.max(50, right - L.colF2 - f2W));
}

function togglePause() {
  isRunning = !isRunning;
  pauseButton.html(isRunning ? 'Pause' : 'Play');
}

// back to t = 0 and paused, so every phasor sits at its phase angle phi_k
function resetTime() {
  t = 0;
  isRunning = false;
  pauseButton.html('Play');
}

// ------------------------------------------------------------------ model

function readState() {
  for (let k = 0; k < 3; k++) {
    ph[k].on = enableBoxes[k].checked();
    ph[k].A = Number(ampSliders[k].value());
    ph[k].phi = Number(phaseSliders[k].value());
  }
  f1 = Number(speedSlider.value());
  f2 = Number(f2Slider.value());
  beatMode = beatCheckbox.checked();
  if (f2Slider.elt.disabled === beatMode) f2Slider.elt.disabled = !beatMode;
}

function freqOf(k) {
  return (beatMode && k === 1) ? f2 : f1;
}

// true when phasor 2 really turns at a different rate from the others
function beatActive() {
  return beatMode && ph[1].on && ph[1].A > 0 && Math.abs(f2 - f1) > 1e-9;
}

function rad(deg) { return deg * Math.PI / 180; }

// phasor k at time tau (rotating), as [re, im]
function phasorAt(k, tau) {
  const th = 2 * Math.PI * freqOf(k) * tau + rad(ph[k].phi);
  return [ph[k].A * Math.cos(th), ph[k].A * Math.sin(th)];
}

// R(tau) = sum of A_k e^{j(phi_k + 2 pi (f_k - f1) tau)}: the resultant in the frame turning at f1.
// With one frequency it is the constant complex amplitude sum A_k e^{j phi_k}.
function resultant(tau) {
  let re = 0, im = 0;
  for (let k = 0; k < 3; k++) {
    if (!ph[k].on) continue;
    const th = 2 * Math.PI * (freqOf(k) - f1) * tau + rad(ph[k].phi);
    re += ph[k].A * Math.cos(th);
    im += ph[k].A * Math.sin(th);
  }
  return [re, im];
}

// individual waveform A_k cos(2 pi f_k tau + phi_k)
function wave(k, tau) {
  return ph[k].A * Math.cos(2 * Math.PI * freqOf(k) * tau + rad(ph[k].phi));
}

function sumWave(tau) {
  let y = 0;
  for (let k = 0; k < 3; k++) if (ph[k].on) y += wave(k, tau);
  return y;
}

// sum of the phasors that turn at f1 (all except phasor 2 in beat mode)
function fixedPart() {
  let re = 0, im = 0;
  for (let k = 0; k < 3; k++) {
    if (!ph[k].on || (beatMode && k === 1)) continue;
    re += ph[k].A * Math.cos(rad(ph[k].phi));
    im += ph[k].A * Math.sin(rad(ph[k].phi));
  }
  return [re, im];
}

// |R(t)| swings between ||S| - A2| and |S| + A2 while phasor 2 turns relative to the rest (S)
function beatRange() {
  const S = Math.hypot(...fixedPart());
  return [Math.abs(S - ph[1].A), S + ph[1].A];
}

function totalAmplitude() {
  let s = 0;
  for (let k = 0; k < 3; k++) if (ph[k].on) s += ph[k].A;
  return s;
}

function niceRange() {
  const s = totalAmplitude();
  for (const r of NICE_RANGES) if (s <= r + 1e-9) return r;
  return NICE_RANGES[NICE_RANGES.length - 1];
}

function gridStep(range) { return range <= 3 ? 0.5 : 1; }
function labelStep(range) { return range <= 1.5 ? 0.5 : (range <= 3 ? 1 : 2); }

// ------------------------------------------------------------------ draw

function draw() {
  updateCanvasSize();
  readState();
  if (isRunning) t += Math.min(deltaTime, 100) / 1000;

  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  const range = niceRange();
  drawTitle();
  drawPhasorDiagram(range);
  drawWaveforms(range);
  drawReadouts();
  drawControlLabels();
}

function drawTitle() {
  noStroke();
  fill('black');
  textStyle(BOLD);
  richText('Phasor Addition', canvasWidth / 2, L.titleY, L.titleSize, CENTER);
  textStyle(NORMAL);
  if (L.narrow) return;
  fill(60);
  const maxW = canvasWidth - 2 * margin;
  if (beatActive()) {
    fitText([
      'y(t) = Re{R(t) e^{jω_1t}},   R(t) = A_1e^{jφ_1} + A_2e^{j(φ_2 + (ω_2 − ω_1)t)} + A_3e^{jφ_3}',
      'R(t) = A_1e^{jφ_1} + A_2e^{j(φ_2 + (ω_2 − ω_1)t)} + A_3e^{jφ_3}',
      'y(t) = Re{R(t) e^{jω_1t}}'
    ], canvasWidth / 2, L.formulaY, maxW, 15, CENTER);
  } else {
    fitText([
      'Σ A_k cos(ω_1t + φ_k) = Re{(Σ A_k e^{jφ_k}) e^{jω_1t}} = |R| cos(ω_1t + ∠R)',
      'Σ A_k cos(ω_1t + φ_k) = Re{(Σ A_k e^{jφ_k}) e^{jω_1t}}',
      'Σ A_k cos(ωt + φ_k) = Re{R e^{jωt}}'
    ], canvasWidth / 2, L.formulaY, maxW, 15, CENTER);
  }
}

function drawPhasorDiagram(range) {
  const cx = L.cx, cy = L.cy, s = L.rpx / range;
  const X = re => cx + s * re;
  const Y = im => cy - s * im;

  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(L.dx, L.dy, L.D, L.D, 8);

  // grid
  push();
  drawingContext.beginPath();
  drawingContext.rect(L.dx + 1, L.dy + 1, L.D - 2, L.D - 2);
  drawingContext.clip();
  stroke(234);
  const g = gridStep(range);
  const nMax = Math.floor((L.D / 2) / (s * g));
  for (let i = -nMax; i <= nMax; i++) {
    if (i === 0) continue;
    line(cx + i * g * s, L.dy, cx + i * g * s, L.dy + L.D);
    line(L.dx, cy + i * g * s, L.dx + L.D, cy + i * g * s);
  }
  pop();

  // axes: real (blue) and imaginary (red), as in the Euler's Formula Explorer
  strokeWeight(2);
  stroke(COL_REAL);
  line(L.dx + 6, cy, L.dx + L.D - 6, cy);
  line(L.dx + L.D - 14, cy - 5, L.dx + L.D - 6, cy);
  line(L.dx + L.D - 14, cy + 5, L.dx + L.D - 6, cy);
  stroke(COL_IMAG);
  line(cx, L.dy + L.D - 6, cx, L.dy + 6);
  line(cx - 5, L.dy + 14, cx, L.dy + 6);
  line(cx + 5, L.dy + 14, cx, L.dy + 6);

  noStroke();
  textSize(14);
  fill(COL_REAL);
  textAlign(RIGHT, BOTTOM);
  text(L.narrow ? 'Real' : 'Real Axis', L.dx + L.D - 8, cy - 5);
  fill(COL_IMAG);
  textAlign(LEFT, TOP);
  text(L.narrow ? 'Imag' : 'Imaginary Axis', cx + 7, L.dy + 5);

  // tick labels
  const ls = labelStep(range);
  for (let v = ls; v <= range + 1e-9; v += ls) {
    for (const sg of [1, -1]) {
      const val = sg * v;
      stroke(120);
      strokeWeight(1);
      line(X(val), cy - 4, X(val), cy + 4);
      line(cx - 4, Y(val), cx + 4, Y(val));
      noStroke();
      fill(90);
      textSize(L.narrow ? 12 : 14);
      textAlign(CENTER, TOP);
      text(fmtNum(val), X(val), cy + 5);
      textAlign(RIGHT, CENTER);
      text((val < 0 ? '−j' : 'j') + fmtNum(Math.abs(val)), cx - 6, Y(val));
    }
  }

  // circles traced by the tip of the resultant
  noFill();
  strokeWeight(1.5);
  stroke(COL_RES[0], COL_RES[1], COL_RES[2], 150);
  drawingContext.setLineDash([5, 5]);
  if (beatActive()) {
    const [rMin, rMax] = beatRange();
    if (rMax * s > 2) circle(cx, cy, 2 * rMax * s);
    if (rMin * s > 2) circle(cx, cy, 2 * rMin * s);
  } else {
    const r = Math.hypot(...resultant(t));
    if (r * s > 2) circle(cx, cy, 2 * r * s);
  }
  drawingContext.setLineDash([]);

  // head-to-tail chain
  const pts = [[0, 0]];
  const used = [];
  for (let k = 0; k < 3; k++) {
    if (!ph[k].on || ph[k].A <= 0) continue;
    const [dre, dim] = phasorAt(k, t);
    const last = pts[pts.length - 1];
    pts.push([last[0] + dre, last[1] + dim]);
    used.push(k);
  }
  const tip = pts[pts.length - 1];
  let gx = 0, gy = 0;
  for (const p of pts) { gx += X(p[0]); gy += Y(p[1]); }
  gx /= pts.length;
  gy /= pts.length;

  // projection of the resultant tip onto the real axis: the value of the sum y(t)
  if (used.length > 0) {
    stroke(110);
    strokeWeight(1);
    drawingContext.setLineDash([4, 4]);
    line(X(tip[0]), Y(tip[1]), X(tip[0]), cy);
    drawingContext.setLineDash([]);
  }

  // resultant (under the chain, wider, so a collinear chain still shows it)
  const rLen = Math.hypot(tip[0], tip[1]) * s;
  if (rLen > 3) {
    drawArrow(cx, cy, X(tip[0]), Y(tip[1]), COL_RES, 6, 18);
    segmentLabel(cx, cy, X(tip[0]), Y(tip[1]), gx, gy, 'R', COL_RES, 16, 15);
  }

  // phasors
  for (let i = 0; i < used.length; i++) {
    const k = used[i];
    const a = pts[i], b = pts[i + 1];
    drawArrow(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), PH_COL[k], 3, 13);
    segmentLabel(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), gx, gy, String(k + 1), PH_COL[k], 14, 12);
  }

  // blue dot on the real axis = Re{R e^{j w1 t}} = y(t)
  if (used.length > 0) {
    const px = X(tip[0]);
    stroke(255);
    strokeWeight(2);
    fill(COL_REAL);
    circle(px, cy, 11);
    noStroke();
    textSize(14);
    textStyle(BOLD);
    const lbl = 'y(t)';
    const w = advW(lbl) + 6;
    const ly = tip[1] >= 0 ? cy + 32 : cy - 22;
    const lx = constrain(px, L.dx + w / 2 + 2, L.dx + L.D - w / 2 - 2);
    fill(255, 255, 255, 225);
    rect(lx - w / 2, ly - 9, w, 18, 4);
    fill(COL_REAL);
    textAlign(CENTER, CENTER);
    text(lbl, lx, ly);
    textStyle(NORMAL);
  }
}

// label a segment at its midpoint, on the side away from (gx, gy)
function segmentLabel(x1, y1, x2, y2, gx, gy, label, col, sz, off) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 22) return;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  let nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
  if ((mx - gx) * nx + (my - gy) * ny < 0) { nx = -nx; ny = -ny; }
  noStroke();
  fill(col);
  textSize(sz);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(label, mx + nx * off, my + ny * off);
  textStyle(NORMAL);
}

function drawArrow(x1, y1, x2, y2, col, w, head) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  if (len < 0.5) return;
  const ux = dx / len, uy = dy / len;
  const h = Math.min(head, len * 0.6);
  stroke(col);
  strokeWeight(w);
  line(x1, y1, x2 - ux * h * 0.7, y2 - uy * h * 0.7);
  noStroke();
  fill(col);
  const bx = x2 - ux * h, by = y2 - uy * h;
  const hw = h * 0.42 + w * 0.3;
  triangle(x2, y2, bx + uy * hw, by - ux * hw, bx - uy * hw, by + ux * hw);
}

function drawWaveforms(range) {
  const P = L.plot;
  const t0 = Math.floor(t / T_WINDOW) * T_WINDOW;
  const xOf = tau => P.l + (tau - t0) / T_WINDOW * (P.r - P.l);
  const tOf = x => t0 + (x - P.l) / (P.r - P.l) * T_WINDOW;
  const yMid = (P.top + P.bottom) / 2, half = (P.bottom - P.top) / 2 - 3;
  const yOf = v => yMid - v / range * half;

  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(P.l, P.top, P.r - P.l, P.bottom - P.top);

  // grid
  stroke(234);
  const g = gridStep(range);
  for (let v = g; v < range + 1e-9; v += g) {
    line(P.l, yOf(v), P.r, yOf(v));
    line(P.l, yOf(-v), P.r, yOf(-v));
  }
  for (let sec = 1; sec < T_WINDOW; sec++) line(xOf(t0 + sec), P.top, xOf(t0 + sec), P.bottom);
  stroke(150);
  line(P.l, yMid, P.r, yMid);

  // amplitude tick labels
  noStroke();
  fill(80);
  textSize(14);
  textAlign(RIGHT, CENTER);
  const ls = labelStep(range);
  for (let v = 0; v <= range + 1e-9; v += ls) {
    text(fmtNum(v), P.l - 5, yOf(v));
    if (v > 0) text(fmtNum(-v), P.l - 5, yOf(-v));
  }

  // time tick labels (s)
  const axisTitle = 't (s)';
  const titleW = advW(axisTitle);
  textAlign(RIGHT, TOP);
  text(axisTitle, P.r, P.bottom + 4);
  const stepS = (P.r - P.l) / T_WINDOW >= 34 ? 1 : 2;
  textAlign(CENTER, TOP);
  for (let sec = 0; sec <= T_WINDOW; sec += stepS) {
    const x = xOf(t0 + sec);
    const lbl = String(t0 + sec);
    if (x + advW(lbl) / 2 > P.r - titleW - 8) continue;
    text(lbl, x, P.bottom + 4);
  }

  // curves
  push();
  drawingContext.beginPath();
  drawingContext.rect(P.l, P.top, P.r - P.l, P.bottom - P.top);
  drawingContext.clip();
  noFill();
  for (let k = 0; k < 3; k++) {
    if (!ph[k].on) continue;
    stroke(PH_COL[k]);
    strokeWeight(1.6);
    plotCurve(tau => wave(k, tau), P, tOf, yOf);
  }
  const anyOn = ph.some(p => p.on);
  if (anyOn) {
    // envelope = length of the resultant, |R(t)|
    stroke(COL_RES[0], COL_RES[1], COL_RES[2], 170);
    strokeWeight(1.5);
    drawingContext.setLineDash([6, 5]);
    plotCurve(tau => Math.hypot(...resultant(tau)), P, tOf, yOf);
    plotCurve(tau => -Math.hypot(...resultant(tau)), P, tOf, yOf);
    drawingContext.setLineDash([]);
  }
  stroke(COL_RES);
  strokeWeight(3.5);
  plotCurve(sumWave, P, tOf, yOf);
  pop();

  // cursor at the current time
  const xc = xOf(t);
  stroke(COL_CURSOR);
  strokeWeight(2);
  line(xc, P.top, xc, P.bottom);
  for (let k = 0; k < 3; k++) {
    if (!ph[k].on) continue;
    noStroke();
    fill(PH_COL[k]);
    circle(xc, yOf(wave(k, t)), 7);
  }
  stroke(255);
  strokeWeight(2);
  fill(COL_RES);
  circle(xc, yOf(sumWave(t)), 12);

  drawLegend(P);
}

function plotCurve(fn, P, tOf, yOf) {
  beginShape();
  for (let x = P.l; x <= P.r; x += 1) vertex(x, yOf(fn(tOf(x))));
  endShape();
}

function drawLegend(P) {
  const items = [];
  for (let k = 0; k < 3; k++) {
    if (ph[k].on) items.push({ kind: 'thin', col: PH_COL[k], label: 'y_' + (k + 1) });
  }
  items.push({ kind: 'thick', col: COL_RES, label: 'sum y(t)', short: 'sum' });
  items.push({ kind: 'dash', col: COL_RES, label: beatActive() ? '±|R(t)| envelope' : '±|R|', short: beatActive() ? '±|R(t)|' : '±|R|' });
  items.push({ kind: 'cursor', col: COL_CURSOR, label: 'now', short: 'now' });
  const sz = 14;
  const widthOf = list => list.reduce((w, it) => w + 26 + richWidth(it.label, sz) + 12, 0);
  const avail = P.r - L.legendX;
  let list = items;
  if (widthOf(list) > avail) list = items.map(it => ({ ...it, label: it.short || it.label }));
  if (widthOf(list) > avail) list = list.filter(it => it.kind !== 'cursor');
  let x = L.legendX;
  const y = L.legendY;
  for (const it of list) {
    const c = it.col;
    stroke(c);
    if (it.kind === 'thin') { strokeWeight(1.6); line(x, y, x + 20, y); }
    else if (it.kind === 'thick') { strokeWeight(3.5); line(x, y, x + 20, y); }
    else if (it.kind === 'dash') { strokeWeight(1.5); line(x, y, x + 7, y); line(x + 12, y, x + 20, y); }
    else { strokeWeight(2); line(x + 10, y - 7, x + 10, y + 7); }
    noStroke();
    fill(c);
    richText(it.label, x + 25, y, sz, LEFT);
    x += 26 + richWidth(it.label, sz) + 12;
  }
}

function drawReadouts() {
  const Pn = L.panel;
  fill(255, 255, 255, 235);
  stroke(200);
  strokeWeight(1);
  rect(Pn.x, Pn.y, Pn.w, Pn.h, 10);

  const narrow = L.narrow;
  const maxW = Pn.w - 20;
  const yNow = sumWave(t);
  const lines = [];
  const tLine = 't = ' + t.toFixed(2) + ' s';
  const yLine = 'y(t) = ' + fmt(yNow);

  if (beatActive()) {
    const [rMin, rMax] = beatRange();
    const df = Math.abs(f2 - f1);
    const rNow = Math.hypot(...resultant(t));
    lines.push({ c: ['Phasor 2 turns at f_2, the others at f_1', 'Phasor 2 turns at f_2', 'f_2 ≠ f_1'], col: [90, 90, 90], sz: 14 });
    lines.push({ c: ['|R(t)| = ' + fmt(rNow) + '  (dashed envelope)', '|R(t)| = ' + fmt(rNow)], col: COL_RES, sz: 18, bold: true });
    lines.push({ c: ['|R(t)| swings from ' + fmt(rMin) + ' to ' + fmt(rMax), '|R| ' + fmt(rMin) + ' to ' + fmt(rMax)], col: COL_RES, sz: 16 });
    lines.push({ c: ['Beat frequency |f_2 − f_1| = ' + fmt(df) + ' Hz', 'Beats at ' + fmt(df) + ' Hz', 'beat ' + fmt(df) + ' Hz'], col: [0, 0, 0], sz: 16 });
    lines.push({ c: ['Beat period 1/|f_2 − f_1| = ' + fmt(1 / df) + ' s', 'Period ' + fmt(1 / df) + ' s'], col: [0, 0, 0], sz: 16 });
    if (narrow) {
      lines.push({ c: [tLine], col: [0, 0, 0], sz: 16 });
      lines.push({ c: [yLine], col: [0, 0, 0], sz: 16 });
    } else {
      lines.push({ c: [tLine + ':   ' + yLine], col: [0, 0, 0], sz: 16 });
    }
  } else {
    const [re, im] = resultant(t);
    const mag = Math.hypot(re, im);
    const zero = mag < 0.005;
    const ang = fmtAng(Math.atan2(im, re) * 180 / Math.PI);
    let head = ['Resultant phasor R = Σ A_k e^{jφ_k}', 'R = Σ A_k e^{jφ_k}'];
    if (beatMode && !(ph[1].on && ph[1].A > 0)) head = ['Phasor 2 is off, so nothing beats', 'Phasor 2 is off'];
    else if (beatMode) head = ['f_2 = f_1: one frequency, no beats', 'f_2 = f_1: no beats'];
    lines.push({ c: head, col: [90, 90, 90], sz: 14 });
    lines.push({ c: zero ? ['R = 0: the phasors cancel', 'R = 0 (cancel)'] : ['R = ' + fmt(mag) + '∠' + ang + '°'], col: COL_RES, sz: 18, bold: true });
    lines.push({ segs: [
      { s: '= ', col: [0, 0, 0] },
      { s: fmt(re), col: COL_REAL },
      { s: (Number(im.toFixed(2)) < 0 ? ' − j' : ' + j') + fmt(Math.abs(im)), col: COL_IMAG }
    ], sz: 16 });
    const angS = Number(ang) < 0 ? ' − ' + ang.replace('−', '') : ' + ' + ang;
    lines.push({ c: zero ? ['y(t) = 0 for every t', 'y(t) = 0'] : [
      'y(t) = ' + fmt(mag) + ' cos(ω_1t' + angS + '°)',
      'y = ' + fmt(mag) + ' cos(ω_1t' + angS + '°)',
      'y = ' + fmt(mag) + 'cos(ωt' + angS.replace(/ /g, '') + '°)'
    ], col: COL_RES, sz: 16 });
    if (narrow) {
      lines.push({ c: [tLine], col: [0, 0, 0], sz: 16 });
      lines.push({ c: [yLine], col: [0, 0, 0], sz: 16 });
    } else {
      lines.push({ c: [tLine + ':   y(t) = Re{R e^{jω_1t}} = ' + fmt(yNow), tLine + ':   ' + yLine], col: [0, 0, 0], sz: 16 });
    }
    lines.push({ c: [
      'ω_1 = 2π × ' + fmt(f1) + ' Hz = ' + fmt(2 * Math.PI * f1) + ' rad/s (rotation rate)',
      'ω_1 = 2π × ' + fmt(f1) + ' Hz = ' + fmt(2 * Math.PI * f1) + ' rad/s',
      'ω_1 = ' + fmt(2 * Math.PI * f1) + ' rad/s'
    ], col: [90, 90, 90], sz: 14 });
  }

  const lh = narrow ? 19 : 21;
  let y = Pn.y + (narrow ? 13 : 14);
  noStroke();
  for (const ln of lines) {
    const sz = narrow ? Math.max(14, ln.sz - 2) : ln.sz;
    if (ln.bold) textStyle(BOLD);
    if (ln.segs) {
      let x = Pn.x + 10;
      for (const sg of ln.segs) {
        fill(sg.col);
        x += richText(sg.s, x, y, sz, LEFT);
      }
    } else {
      fill(ln.col);
      fitText(ln.c, Pn.x + 10, y, maxW, sz, LEFT);
    }
    textStyle(NORMAL);
    y += lh;
  }
}

function drawControlLabels() {
  const sz = L.ctlSize, narrow = L.narrow;
  noStroke();
  for (let k = 0; k < 3; k++) {
    fill(ph[k].on ? 0 : 150);
    const n = String(k + 1);
    richText((narrow ? 'A=' : 'A_' + n + ' = ') + ph[k].A.toFixed(2), L.colA, rowY(k), sz, LEFT);
    richText((narrow ? 'φ=' : 'φ_' + n + ' = ') + fmtInt(ph[k].phi) + '°', L.colP, rowY(k), sz, LEFT);
  }
  fill(0);
  richText((narrow ? '' : 'Speed ') + 'f_1 = ' + f1.toFixed(2) + ' Hz', L.colF1, rowY(3), sz, LEFT);
  fill(beatMode ? 0 : 150);
  richText('f_2 = ' + f2.toFixed(2) + ' Hz', L.colF2, rowY(4), sz, LEFT);
}

// ------------------------------------------------------------------ text helpers

// Rich text: "A_1" draws the character after '_' as a subscript and "e^{jφ}" draws the
// braced group as a superscript (a '_' inside the group is a subscript of the superscript)
function parseRich(s) {
  const out = [];
  let buf = '', sup = false;
  const flush = m => { if (buf) { out.push({ t: buf, m }); buf = ''; } };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '^' && s[i + 1] === '{' && !sup) { flush('n'); sup = true; i++; continue; }
    if (c === '}' && sup) { flush('sup'); sup = false; continue; }
    if (c === '_' && i + 1 < s.length) {
      flush(sup ? 'sup' : 'n');
      out.push({ t: s[i + 1], m: sup ? 'supsub' : 'sub' });
      i++;
      continue;
    }
    buf += c;
  }
  flush(sup ? 'sup' : 'n');
  return out;
}

const RICH = { n: [1, 0], sub: [0.72, 0.3], sup: [0.72, -0.38], supsub: [0.55, -0.2] };

// advance width: in p5 2.x textWidth() measures tight bounds and ignores spaces,
// so runs of text placed side by side must use fontWidth()
function advW(s) {
  return typeof fontWidth === 'function' ? fontWidth(s) : textWidth(s);
}

function richWidth(s, sz) {
  let w = 0;
  for (const p of parseRich(s)) {
    textSize(sz * RICH[p.m][0]);
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
    textSize(sz * RICH[p.m][0]);
    text(p.t, cx, y + sz * RICH[p.m][1]);
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
function fmtNum(v) { return (v < 0 ? '−' : '') + String(Math.abs(v)); }

// angle in (-180, 180] with one decimal
function fmtAng(deg) {
  let r = Math.round(deg * 10) / 10;
  if (r <= -180) r += 360;
  if (Object.is(r, -0)) r = 0;
  return fmt(r, 1);
}

function rgbStr(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }

// ------------------------------------------------------------------ responsive layout

function computeLayout() {
  const W = canvasWidth;
  L.narrow = W < 640;
  if (!L.narrow) {
    L.titleY = 20;
    L.titleSize = 22;
    L.formulaY = 46;
    L.dx = 12;
    L.dy = 62;
    L.D = Math.min(Math.floor(W * 0.48) - 14, drawHeight - 72);
    const xR = L.dx + L.D + 24;
    L.plot = { l: xR + 36, r: W - margin, top: 92, bottom: 268 };
    L.legendY = 76;
    L.legendX = xR;
    L.panel = { x: xR, y: 298, w: W - margin - xR, h: drawHeight - 8 - 298 };
  } else {
    L.titleY = 14;
    L.titleSize = 18;
    L.dx = 6;
    L.dy = 28;
    L.D = Math.min(W - 170, 230);
    L.plot = { l: 40, r: W - 8, top: L.dy + L.D + 28, bottom: drawHeight - 28 };
    L.legendY = L.dy + L.D + 13;
    L.legendX = 10;
    const px = L.dx + L.D + 8;
    L.panel = { x: px, y: L.dy, w: W - 6 - px, h: L.D };
  }
  L.cx = L.dx + L.D / 2;
  L.cy = L.dy + L.D / 2;
  L.rpx = L.D / 2 - (L.narrow ? 16 : 22);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  if (canvasWidth === layoutWidth) return;
  computeLayout();
  if (typeof f2Slider !== 'undefined') {
    layoutWidth = canvasWidth;
    layoutControls();
  }
}
