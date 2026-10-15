// Möbius Transform MicroSim
// CANVAS_HEIGHT: 630
// Shows the conformal map w = f(z) = (Az + B)/(Cz + D). A grid of points in the input z-plane
// (left) and their images in the output w-plane (right) are drawn at the same scale.
// Drag the colored dots in the Coefficients box to change A, B, C and D, draw with the mouse
// in the input plane to see the image of the drawing, and hover to read z and w = f(z).
// Ported from the original p5.js 1.9.0 sketch to p5.js 2.3.2.

// Canvas dimensions
let canvasWidth = 700;               // overwritten from the container in updateCanvasSize()
let drawHeight = 545;
let controlHeight = 85;
let canvasHeight = drawHeight + controlHeight;
let margin = 10;
let sliderLeftMargin = 130;
let defaultTextSize = 16;

// Controls
let scaleSlider, densitySlider, presetSelect, clearButton;

// Möbius coefficients A, B, C, D as complex numbers {re, im}
const COEF_NAMES = ['A', 'B', 'C', 'D'];
const COEF_COLORS = ['red', 'green', 'blue', 'black'];
const DRAW_COLOR = 'purple';         // the user's drawing and its image
let coefs = [];

// Coefficient presets [A, B, C, D], each as [re, im]
const PRESETS = [
  { value: 'example',   label: 'Default example',               c: [[0.5, 0.5], [0.3, 0.2], [-0.1, 0.6], [0.2, -0.5]] },
  { value: 'identity',  label: 'Identity: w = z',               c: [[1, 0], [0, 0], [0, 0], [1, 0]] },
  { value: 'rotate',    label: 'Rotate/scale: w = (0.5+0.5i)z', c: [[0.5, 0.5], [0, 0], [0, 0], [1, 0]] },
  { value: 'inversion', label: 'Inversion: w = 1/z',            c: [[0, 0], [1, 0], [1, 0], [0, 0]] },
  { value: 'bilinear',  label: 'Bilinear: w = (1+z)/(1−z)',     c: [[1, 0], [1, 0], [-1, 0], [1, 0]] },
  { value: 'cayley',    label: 'Cayley: w = (z−i)/(z+i)',       c: [[1, 0], [0, -1], [1, 0], [0, 1]] }
];

// The user's drawing in the input plane: an array of strokes, each an array of {re, im}
let strokes = [];
let currentStroke = null;
let pressInDrawRegion = false;
let draggingCoef = -1;

// Layout (recomputed by computeLayout() when the width changes)
const FRAME_TOP = 58;      // top of the two big frames
const TICK_W = 30;         // room for the tick labels left of a frame
const FRAME_GAP = 22;      // gap between the input frame and the output frame's tick labels
const COEF_DY = 34;        // from the top of the second row to the top of the Coefficients box
let inF, outF, coefF;      // frames {x, y, s, cx, cy, range}
let row2Top = 0;
let compact = false;
let infoX1 = 0, infoX2 = 0;
let layoutWidth = -1;

function setup() {
  updateCanvasSize();                // MUST be first
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);
  applyPreset('example');

  scaleSlider = createSlider(1, 20, 3, 1);
  densitySlider = createSlider(10, 50, 20, 10);

  presetSelect = createSelect();
  for (const p of PRESETS) presetSelect.option(p.label, p.value);
  presetSelect.option('Custom (dragged)', 'custom');
  presetSelect.selected('example');
  presetSelect.style('font-size', '14px');
  presetSelect.changed(() => {
    if (presetSelect.value() !== 'custom') applyPreset(presetSelect.value());
  });

  clearButton = createButton('Clear drawing');
  clearButton.style('font-size', '14px');
  clearButton.mousePressed(() => { strokes = []; currentStroke = null; });

  const main = document.querySelector('main');
  for (const el of [scaleSlider, densitySlider, presetSelect, clearButton]) el.parent(main);
  layoutWidth = -1;
  updateCanvasSize();

  describe('Möbius transform explorer. A grid of white points in the input z-plane on the left and their images under w = (Az + B)/(Cz + D) in the output w-plane on the right. Drag the colored dots in the Coefficients box to change A, B, C and D, choose a preset such as the bilinear transform, draw in the input plane to see the image of the drawing, and use the sliders to change the scale and the grid density.');
}

function draw() {
  updateCanvasSize();
  const R = scaleSlider.value();
  const d = densitySlider.value();
  inF.range = R;
  outF.range = R;

  // Drawing region and control region
  background('white');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  // Title and frame captions
  noStroke();
  fill('black');
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  textSize(22);
  text('Möbius Transform', canvasWidth / 2, 18);
  textAlign(LEFT, CENTER);
  textSize(compact ? 14 : 15);
  text(compact ? 'Input z (draw)' : 'Input z-plane (draw here)', inF.x, 44);
  text(compact ? 'Output w = f(z)' : 'Output w-plane: w = f(z)', outF.x, 44);
  text(compact ? 'Coefficients (drag)' : 'Coefficients (drag the dots)', coefF.x - TICK_W + 4, row2Top + 8);
  textStyle(NORMAL);

  // Pointer position in the input plane (for the hover read-out)
  const hoverZ = (draggingCoef < 0 && insideFrame(inF, mouseX, mouseY, 0)) ? pixToZ(inF, mouseX, mouseY) : null;

  // Frames with their grids
  drawFrameGrid(inF);
  drawFrameGrid(outF);
  drawFrameGrid(coefF);

  // Unit circle, domain grid points, drawing, markers
  drawUnitCircle(inF);
  drawUnitCircle(outF);
  drawDomainPoints(d);
  drawStrokes();
  drawPoleMarkers();
  drawHover(hoverZ);

  // Borders, axis names, tick labels
  drawFrameBorder(inF, 'z');
  drawFrameBorder(outF, 'w');
  drawFrameBorder(coefF, '');
  drawCoefVectors();

  drawInfo(hoverZ);
  drawControlLabels(R, d);
}

// ---------------------------------------------------------------- layout

function computeLayout() {
  compact = canvasWidth < 560;
  let s = floor((canvasWidth - 2 * margin - 2 * TICK_W - FRAME_GAP) / 2);
  s = constrain(s, 90, compact ? 213 : 280);
  const blockW = 2 * TICK_W + 2 * s + FRAME_GAP;
  const x0 = max(margin, floor((canvasWidth - blockW) / 2));
  const R = (typeof scaleSlider !== 'undefined') ? scaleSlider.value() : 3;
  inF = makeFrame(x0 + TICK_W, FRAME_TOP, s, R);
  outF = makeFrame(x0 + 2 * TICK_W + s + FRAME_GAP, FRAME_TOP, s, R);
  row2Top = FRAME_TOP + s + 24;
  // narrow canvases list the derived values below the Coefficients box (5 lines)
  const cs = compact ? constrain(drawHeight - (row2Top + COEF_DY) - 28 - 4 * 19 - 10, 100, 130)
                     : constrain(floor(canvasWidth * 0.19), 110, 130);
  coefF = makeFrame(x0 + TICK_W, row2Top + COEF_DY, cs, 1);
  infoX1 = coefF.x + cs + (compact ? 30 : 40);
  infoX2 = infoX1 + 175;
}

function makeFrame(x, y, s, range) {
  return { x: x, y: y, s: s, cx: x + s / 2, cy: y + s / 2, range: range };
}

function positionControls() {
  if (typeof scaleSlider === 'undefined') return;
  const narrow = canvasWidth < 560;
  const selW = narrow ? 165 : 200;
  const rightX = canvasWidth - margin - selW;
  sliderLeftMargin = narrow ? 112 : 130;
  const labelRoom = narrow ? 0 : 62;          // room for the "Preset:" label
  const sliderW = max(40, rightX - labelRoom - 12 - sliderLeftMargin);
  scaleSlider.position(sliderLeftMargin, drawHeight + 12);
  scaleSlider.size(sliderW);
  densitySlider.position(sliderLeftMargin, drawHeight + 50);
  densitySlider.size(sliderW);
  presetSelect.position(rightX, drawHeight + 10);
  presetSelect.size(selW);
  clearButton.position(rightX, drawHeight + 46);
}

function drawControlLabels(R, d) {
  noStroke();
  fill('black');
  textStyle(NORMAL);
  textAlign(LEFT, CENTER);
  textSize(canvasWidth < 560 ? 14 : defaultTextSize);
  text('Scale: ±' + R, 10, drawHeight + 22);
  text('Density: ' + d + '×' + d, 10, drawHeight + 60);
  if (canvasWidth >= 560) {
    text('Preset:', canvasWidth - margin - 200 - 62, drawHeight + 22);
  }
}

// ---------------------------------------------------------------- frames

function drawFrameGrid(f) {
  // Light gray frame with axes and quarter grid lines (the original sketch's style)
  noStroke();
  fill(200);
  rect(f.x, f.y, f.s, f.s);
  stroke(0);
  strokeWeight(1);
  line(f.x, f.y + f.s / 4, f.x + f.s, f.y + f.s / 4);
  line(f.x, f.y + 3 * f.s / 4, f.x + f.s, f.y + 3 * f.s / 4);
  line(f.x + f.s / 4, f.y, f.x + f.s / 4, f.y + f.s);
  line(f.x + 3 * f.s / 4, f.y, f.x + 3 * f.s / 4, f.y + f.s);
  strokeWeight(2);
  line(f.x, f.cy, f.x + f.s, f.cy);
  line(f.cx, f.y, f.cx, f.y + f.s);
}

function drawFrameBorder(f, v) {
  noFill();
  stroke(0);
  strokeWeight(4);
  rect(f.x, f.y, f.s, f.s);

  // Axis names: inside the big frames, outside the small Coefficients box
  noStroke();
  fill(0);
  textStyle(BOLD);
  textSize(13);
  if (v) {
    textAlign(LEFT, TOP);
    text('Im ' + v, f.cx + 5, f.y + 6);
    textAlign(RIGHT, BOTTOM);
    text('Re ' + v, f.x + f.s - 6, f.cy - 3);
  } else {
    textAlign(LEFT, BOTTOM);
    text('Im', f.cx + 7, f.y - 3);
    text('Re', f.x + f.s + 7, f.cy - 3);
  }
  textStyle(NORMAL);

  // Tick labels at the edges, the quarter grid lines and the axes
  fill(60);
  textSize(12);
  const vals = [-f.range, -f.range / 2, 0, f.range / 2, f.range];
  for (let k = 0; k < 5; k++) {
    textAlign(CENTER, TOP);
    text(fmtTick(vals[k]), f.x + k * f.s / 4, f.y + f.s + 5);
    textAlign(RIGHT, CENTER);
    text(fmtTick(-vals[k]), f.x - 5, f.y + k * f.s / 4);
  }
}

function fmtTick(v) {
  if (Math.abs(v) < 1e-9) return '0';
  const s = Number.isInteger(v) ? String(Math.abs(v)) : Math.abs(v).toFixed(1);
  return (v < 0 ? '−' : '') + s;
}

// Run fn() with drawing clipped to the inside of frame f
function withFrameClip(f, fn) {
  push();
  drawingContext.beginPath();
  drawingContext.rect(f.x, f.y, f.s, f.s);
  drawingContext.clip();
  fn();
  pop();
}

function drawUnitCircle(f) {
  withFrameClip(f, () => {
    noFill();
    stroke(70);
    strokeWeight(1.5);
    drawingContext.setLineDash([5, 4]);
    const r = (f.s / 2) / f.range;
    circle(f.cx, f.cy, 2 * r);
    drawingContext.setLineDash([]);
  });
}

// ---------------------------------------------------------------- mapping

function drawDomainPoints(d) {
  const R = inF.range;
  const step = 2 * R / d;
  const dotR = 1.3;
  const ctx = drawingContext;

  // Domain: d x d points at the centers of a square grid covering the input view
  withFrameClip(inF, () => {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        const p = toPix(inF, { re: -R + (i + 0.5) * step, im: -R + (j + 0.5) * step });
        ctx.moveTo(p.x + dotR, p.y);
        ctx.arc(p.x, p.y, dotR, 0, TWO_PI);
      }
    }
    ctx.fill();
  });

  // Images of the same points in the output plane
  withFrameClip(outF, () => {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        const w = mobius({ re: -R + (i + 0.5) * step, im: -R + (j + 0.5) * step });
        if (!isFiniteC(w)) continue;
        const p = toPix(outF, w);
        if (!nearFrame(outF, p, 0.05)) continue;
        ctx.moveTo(p.x + dotR, p.y);
        ctx.arc(p.x, p.y, dotR, 0, TWO_PI);
      }
    }
    ctx.fill();
  });
}

function drawStrokes() {
  // The drawing in the input plane
  withFrameClip(inF, () => {
    stroke(DRAW_COLOR);
    noFill();
    for (const s of strokes) {
      if (s.length === 1) {
        const p = toPix(inF, s[0]);
        strokeWeight(6);
        point(p.x, p.y);
      }
      strokeWeight(2.5);
      for (let k = 1; k < s.length; k++) {
        const p = toPix(inF, s[k - 1]);
        const q = toPix(inF, s[k]);
        line(p.x, p.y, q.x, q.y);
      }
    }
  });

  // Its image: each segment is subdivided so the image follows the true (curved) path
  withFrameClip(outF, () => {
    stroke(DRAW_COLOR);
    noFill();
    const pxPerUnit = (inF.s / 2) / inF.range;
    for (const s of strokes) {
      // dense copy of the stroke: about one sample every 2 px of the input plane
      const pts = [s[0]];
      for (let k = 1; k < s.length; k++) {
        const a = s[k - 1], b = s[k];
        const n = max(1, ceil(Math.hypot(b.re - a.re, b.im - a.im) * pxPerUnit / 2));
        for (let m = 1; m <= n; m++) {
          pts.push({ re: a.re + (m / n) * (b.re - a.re), im: a.im + (m / n) * (b.im - a.im) });
        }
      }
      strokeWeight(pts.length === 1 ? 6 : 2.5);
      let prev = null;
      for (const z of pts) {
        const w = mobius(z);
        const q = (isFiniteC(w) && nearFrame(outF, toPix(outF, w), 3)) ? toPix(outF, w) : null;
        if (q && pts.length === 1) point(q.x, q.y);
        // skip the jump where the curve passes the pole and comes back from infinity
        if (prev && q && Math.hypot(q.x - prev.x, q.y - prev.y) < outF.s / 2) {
          line(prev.x, prev.y, q.x, q.y);
        }
        prev = q;
      }
    }
  });
}

function drawPoleMarkers() {
  const C = coefs[2];
  if (cAbs(C) < 1e-9) return;           // C = 0: no finite pole, f(infinity) = infinity
  const pole = cDiv(cNeg(coefs[3]), C);  // z = -D/C, where Cz + D = 0
  const inf = cDiv(coefs[0], C);         // f(infinity) = A/C

  withFrameClip(inF, () => {
    const p = toPix(inF, pole);
    stroke('red');
    strokeWeight(3);
    line(p.x - 6, p.y - 6, p.x + 6, p.y + 6);
    line(p.x - 6, p.y + 6, p.x + 6, p.y - 6);
  });
  withFrameClip(outF, () => {
    const q = toPix(outF, inf);
    noFill();
    stroke(0);
    strokeWeight(2);
    circle(q.x, q.y, 14);
  });
}

function drawHover(z) {
  if (!z) return;
  stroke(0);
  strokeWeight(1.5);
  fill('gold');
  const p = toPix(inF, z);
  circle(p.x, p.y, 11);
  const w = mobius(z);
  if (isFiniteC(w)) {
    const q = toPix(outF, w);
    if (nearFrame(outF, q, 0)) circle(q.x, q.y, 11);
  }
}

// ---------------------------------------------------------------- coefficients

function drawCoefVectors() {
  const f = coefF;
  const pix = coefs.map(c => toPix(f, c));
  // draw D first and A last, so a coinciding handle shows the one that a click grabs
  for (let k = 3; k >= 0; k--) {
    const col = COEF_COLORS[k];
    stroke(col);
    fill(col);
    strokeWeight(2);
    line(f.cx, f.cy, pix[k].x, pix[k].y);
    circle(pix[k].x, pix[k].y, 10);
  }

  // One label per group of coinciding handles (e.g. "A B D"), kept inside the box
  const groups = [];
  for (let k = 0; k < 4; k++) {
    const g = groups.find(gr => dist(pix[gr[0]].x, pix[gr[0]].y, pix[k].x, pix[k].y) < 6);
    if (g) g.push(k); else groups.push([k]);
  }
  const fw = (typeof fontWidth === 'function') ? fontWidth : textWidth;
  noStroke();
  textStyle(BOLD);
  textSize(13);
  textAlign(LEFT, CENTER);
  const placed = [];                    // label boxes already drawn {x, y, w, h}
  for (const g of groups) {
    const p = pix[g[0]];
    const parts = [];
    g.forEach((k, i) => { if (i > 0) parts.push([' ', 'black']); parts.push([COEF_NAMES[k], COEF_COLORS[k]]); });
    const tw = parts.reduce((acc, q) => acc + fw(q[0]), 0);
    let ang = atan2(p.y - f.cy, p.x - f.cx);
    if (Math.hypot(p.x - f.cx, p.y - f.cy) < 1) ang = -QUARTER_PI;
    // candidates: away from the origin, to either side of the vector, then toward the origin
    const r = 14 + tw / 3;
    const cands = [ang, ang + HALF_PI, ang - HALF_PI, ang + PI].map(a => ({
      x: constrain(p.x + r * cos(a), f.x + 3 + tw / 2, f.x + f.s - 3 - tw / 2),
      y: constrain(p.y + r * sin(a), f.y + 9, f.y + f.s - 9)
    }));
    // free = clear of the labels already drawn and of every handle
    const free = (c) => placed.every(b => Math.abs(c.x - b.x) > (tw + b.w) / 2 + 2 || Math.abs(c.y - b.y) > 15) &&
                        pix.every(h => Math.abs(c.x - h.x) > tw / 2 + 4 || Math.abs(c.y - h.y) > 12);
    const best = cands.find(free) || cands[0];
    const lx = best.x, ly = best.y;
    placed.push({ x: lx, y: ly, w: tw });
    fill(255, 255, 255, 210);
    rect(lx - tw / 2 - 2, ly - 8, tw + 4, 16, 3);
    let xx = lx - tw / 2;
    for (const q of parts) { fill(q[1]); text(q[0], xx, ly); xx += fw(q[0]); }
  }
  textStyle(NORMAL);
}

function applyPreset(value) {
  const p = PRESETS.find(q => q.value === value) || PRESETS[0];
  coefs = p.c.map(c => ({ re: c[0], im: c[1] }));
}

// ---------------------------------------------------------------- read-outs

function drawInfo(hoverZ) {
  const A = coefs[0], B = coefs[1], C = coefs[2], D = coefs[3];
  const ts = compact ? 14 : 15;
  const lh = compact ? 18 : 22;

  // Formula and coefficient values beside the Coefficients box
  drawFormula(infoX1, coefF.y + 14, ts);
  noStroke();
  textStyle(NORMAL);
  textSize(ts);
  textAlign(LEFT, CENTER);
  const y0 = coefF.y + (compact ? 46 : 52);
  for (let k = 0; k < 4; k++) {
    fill(COEF_COLORS[k]);
    text(COEF_NAMES[k] + ' = ' + fmtC(coefs[k]), infoX1, y0 + k * lh);
  }

  // Derived quantities: in a second column, or below the box when the canvas is narrow
  const x2 = compact ? coefF.x - TICK_W + 4 : infoX2;
  let y = compact ? coefF.y + coefF.s + 28 : coefF.y + 6;
  const dy = compact ? 19 : 22;
  const det = cSub(cMul(A, D), cMul(B, C));
  textSize(ts);
  if (cAbs(det) < 1e-3) {
    fill('red');
    textStyle(BOLD);
    text('AD − BC = 0: f(z) is constant!', x2, y);
    textStyle(NORMAL);
  } else {
    fill('black');
    text('AD − BC = ' + fmtC(det), x2, y);
  }
  y += dy;
  if (cAbs(C) < 1e-9) {
    fill('red');
    text('× no finite pole (C = 0)', x2, y);
    y += dy;
    fill('black');
    text('○ f(∞) = ∞ (C = 0)', x2, y);
  } else {
    fill('red');
    text('× pole: z = −D/C = ' + fmtC(cDiv(cNeg(D), C)), x2, y);
    y += dy;
    fill('black');
    text('○ f(∞) = A/C = ' + fmtC(cDiv(A, C)), x2, y);
  }
  y += dy + (compact ? 0 : 8);

  if (hoverZ) {
    fill('darkgoldenrod');
    textStyle(BOLD);
    text('● pointer z = ' + fmtC(hoverZ), x2, y);
    y += dy;
    const w = mobius(hoverZ);
    text('   w = f(z) = ' + fmtC(w), x2, y);
    textStyle(NORMAL);
  } else {
    fill(110);
    text('Hover over the input plane', x2, y);
    y += dy;
    text('to read z and w = f(z).', x2, y);
  }
}

// "w = f(z) =" followed by the fraction (Az + B)/(Cz + D) with colored coefficients
function drawFormula(x, yc, ts) {
  const fw = (typeof fontWidth === 'function') ? fontWidth : textWidth;
  noStroke();
  textSize(ts);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  fill('black');
  const lead = 'w = ';
  text(lead, x, yc);
  const fx = x + fw(lead);
  const num = [['A', COEF_COLORS[0]], ['z + ', 'black'], ['B', COEF_COLORS[1]]];
  const den = [['C', COEF_COLORS[2]], ['z + ', 'black'], ['D', COEF_COLORS[3]]];
  const width = (parts) => parts.reduce((acc, p) => acc + fw(p[0]), 0);
  const wn = width(num), wd = width(den);
  const wf = max(wn, wd) + 8;
  const drawParts = (parts, x1, y1) => {
    let xx = x1;
    for (const p of parts) { fill(p[1]); text(p[0], xx, y1); xx += fw(p[0]); }
  };
  drawParts(num, fx + (wf - wn) / 2, yc - ts * 0.72);
  drawParts(den, fx + (wf - wd) / 2, yc + ts * 0.78);
  stroke('black');
  strokeWeight(1.5);
  line(fx, yc + 1, fx + wf, yc + 1);
  noStroke();
  textStyle(NORMAL);
}

function fmtNum(v) {
  const a = Math.abs(v);
  const s = a < 0.005 ? '0.00' : a.toFixed(2);
  return (v < 0 && s !== '0.00' ? '−' : '') + s;
}

function fmtC(z) {
  if (!isFiniteC(z)) return '∞';
  if (Math.max(Math.abs(z.re), Math.abs(z.im)) >= 1000) return '|w| > 1000 (near the pole)';
  const imAbs = Math.abs(z.im) < 0.005 ? '0.00' : Math.abs(z.im).toFixed(2);
  const sign = (z.im < 0 && imAbs !== '0.00') ? ' − ' : ' + ';
  return fmtNum(z.re) + sign + imAbs + 'i';
}

// ---------------------------------------------------------------- complex arithmetic

function mobius(z) {
  const num = cAdd(cMul(coefs[0], z), coefs[1]);
  const den = cAdd(cMul(coefs[2], z), coefs[3]);
  return cDiv(num, den);
}

function cAdd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
function cSub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
function cNeg(a) { return { re: -a.re, im: -a.im }; }
function cMul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
function cAbs(a) { return Math.hypot(a.re, a.im); }
function cDiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  if (d === 0) return { re: NaN, im: NaN };
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
function isFiniteC(z) { return Number.isFinite(z.re) && Number.isFinite(z.im); }

// ---------------------------------------------------------------- coordinates

// Complex number -> pixel in frame f (imaginary part up)
function toPix(f, z) {
  const k = (f.s / 2) / f.range;
  return { x: f.cx + z.re * k, y: f.cy - z.im * k };
}

// Pixel -> complex number in frame f
function pixToZ(f, px, py) {
  const k = f.range / (f.s / 2);
  return { re: (px - f.cx) * k, im: -(py - f.cy) * k };
}

function insideFrame(f, px, py, pad) {
  return px >= f.x - pad && px <= f.x + f.s + pad && py >= f.y - pad && py <= f.y + f.s + pad;
}

// Is pixel p inside frame f, enlarged by `slack` frame sizes on every side?
function nearFrame(f, p, slack) {
  return Math.abs(p.x - f.cx) <= f.s * (0.5 + slack) && Math.abs(p.y - f.cy) <= f.s * (0.5 + slack);
}

// ---------------------------------------------------------------- mouse

function mousePressed() {
  pressInDrawRegion = mouseY >= 0 && mouseY < drawHeight && mouseX >= 0 && mouseX <= canvasWidth;
  if (!pressInDrawRegion) return;

  // Grab the nearest coefficient handle within 20 px (ties go to the earlier letter, drawn on top)
  if (insideFrame(coefF, mouseX, mouseY, 14)) {
    let best = -1, bestD = 20.001;
    for (let k = 0; k < 4; k++) {
      const p = toPix(coefF, coefs[k]);
      const dd = dist(mouseX, mouseY, p.x, p.y);
      if (dd < bestD) { bestD = dd; best = k; }
    }
    if (best >= 0) { draggingCoef = best; return; }
  }

  // Start a new stroke in the input plane
  if (insideFrame(inF, mouseX, mouseY, 0)) {
    currentStroke = [pixToZ(inF, mouseX, mouseY)];
    strokes.push(currentStroke);
  }
}

function mouseDragged() {
  if (draggingCoef >= 0) {
    const z = pixToZ(coefF, mouseX, mouseY);
    coefs[draggingCoef] = {
      re: Math.round(constrain(z.re, -1, 1) * 100) / 100,
      im: Math.round(constrain(z.im, -1, 1) * 100) / 100
    };
    if (presetSelect.value() !== 'custom') presetSelect.selected('custom');
    return;
  }
  if (!pressInDrawRegion) return;
  if (insideFrame(inF, mouseX, mouseY, 0)) {
    const z = pixToZ(inF, mouseX, mouseY);
    if (!currentStroke) { currentStroke = []; strokes.push(currentStroke); }
    const last = currentStroke[currentStroke.length - 1];
    if (!last || last.re !== z.re || last.im !== z.im) currentStroke.push(z);
  } else {
    currentStroke = null;    // leaving the input plane ends the stroke
  }
}

function mouseReleased() {
  draggingCoef = -1;
  currentStroke = null;
  pressInDrawRegion = false;
}

// ---------------------------------------------------------------- responsive sizing

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  if (canvasWidth !== layoutWidth) {
    computeLayout();
    positionControls();
    if (typeof scaleSlider !== 'undefined') layoutWidth = canvasWidth;
  }
}
