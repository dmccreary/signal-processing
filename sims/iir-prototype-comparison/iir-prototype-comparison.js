// IIR Prototype Comparison MicroSim
// CANVAS_HEIGHT: 760
// Compares the classic analog low-pass prototypes - Butterworth, Chebyshev I, Chebyshev II,
// elliptic (Cauer) and Bessel (Thomson) - at the same order N: magnitude (dB, log frequency),
// phase, group delay, step response and the s-plane poles and zeros. Every response is evaluated
// from the pole/zero lists: H(s) = K prod(s - z_i) / prod(s - p_k).

// Canvas dimensions (drawHeight depends on the control layout, canvasHeight is fixed)
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let canvasHeight = 760;
let controlHeight = 112;
let drawHeight = canvasHeight - controlHeight;
let margin = 20;
let sliderLeftMargin = 170;
let defaultTextSize = 16;
let wide = true;                     // two-column controls and one-row plot layout
let layoutWidth = -1;

// Families: id, display name, color
const FAMILIES = [
  { id: 'butter', name: 'Butterworth',  col: [0, 114, 178],  on: true },
  { id: 'cheby1', name: 'Chebyshev I',  col: [213, 94, 0],   on: true },
  { id: 'cheby2', name: 'Chebyshev II', col: [170, 68, 153], on: false },
  { id: 'ellip',  name: 'Elliptic',     col: [0, 140, 100],  on: true },
  { id: 'bessel', name: 'Bessel',       col: [130, 82, 30],  on: true }
];
const COL_SPEC = [120, 120, 120];    // specification lines
const HIGHLIGHT = [255, 228, 130];   // gold: best value in a table column

// Controls
let familyBoxes = [];
let orderSlider, rippleSlider, stopSlider;
let zoomCheckbox, normSelect;

// Design state
let N = 4, Rp = 1, As = 40, normMode = 'db3';
let designKey = '';
let results = {};                    // family id -> { d, edges, metrics, curves }
let stepCache = { key: '', data: {} };

// Panel rectangles (set in computeLayout)
let P = {};

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  for (const f of FAMILIES) {
    const cb = createCheckbox(f.name, f.on);
    cb.style('color', 'rgb(' + f.col.join(',') + ')');
    cb.style('font-weight', 'bold');
    cb.style('white-space', 'nowrap');
    familyBoxes.push(cb);
  }
  orderSlider = createSlider(1, 10, 4, 1);
  rippleSlider = createSlider(0.1, 3, 1, 0.1);
  stopSlider = createSlider(20, 80, 40, 1);
  zoomCheckbox = createCheckbox('Zoom passband', false);
  zoomCheckbox.style('white-space', 'nowrap');
  normSelect = createSelect();
  normSelect.option('−3 dB point at ω = 1 rad/s', 'db3');
  normSelect.option('Passband edge at ω = 1 rad/s', 'edge');
  normSelect.selected('db3');

  layoutWidth = -1;
  updateCanvasSize();
  describe('Five classic analog low-pass filter prototypes compared at the same order: a magnitude plot in dB on a log frequency axis, phase, group delay, step response, an s-plane pole-zero plot, and a table of passband edge, stopband edge, transition width, overshoot and settling time for each family. Checkboxes show or hide Butterworth, Chebyshev I, Chebyshev II, elliptic and Bessel designs; sliders set the order, the passband ripple and the stopband attenuation.');
}

function draw() {
  updateCanvasSize();
  readControls();

  // drawing region and control region
  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  const vis = FAMILIES.filter((f, i) => familyBoxes[i].checked());

  drawTitle();
  drawMagnitude(vis);
  drawPhase(vis);
  drawGroupDelay(vis);
  drawStep(vis);
  drawPoleZero(vis);
  drawTable(vis);
  drawControlLabels();
}

// ---------------------------------------------------------------- state and design

function readControls() {
  N = Math.round(Number(orderSlider.value()));
  Rp = Math.round(Number(rippleSlider.value()) * 10) / 10;
  As = Math.round(Number(stopSlider.value()));
  normMode = normSelect.value() === 'edge' ? 'edge' : 'db3';
  const key = N + '|' + Rp + '|' + As + '|' + normMode;
  if (key !== designKey) {
    designKey = key;
    recomputeDesigns();
  }
}

function recomputeDesigns() {
  results = {};
  for (const f of FAMILIES) {
    const d = designFamily(f.id, N, Rp, As, normMode);
    const edges = bandEdges(d, Rp, As);
    const metrics = stepMetrics(d);
    results[f.id] = { d: d, edges: edges, metrics: metrics, curves: sampleCurves(d) };
  }
  stepCache = { key: '', data: {} };
}

// Frequency-domain curves sampled once per design (plots only rescale them)
function sampleCurves(d) {
  const zeroW = d.z.map(z => Math.abs(z.im)).filter(w => w > 0);
  const logGrid = (a, b, n) => {
    const g = [];
    for (let i = 0; i <= n; i++) g.push(a * Math.pow(b / a, i / n));
    for (const w of zeroW) if (w > a && w < b) g.push(w);     // exact notch frequencies
    return g.sort((x, y) => x - y);
  };
  const mag = logGrid(0.1, 10, 600).map(w => [w, gainDb(d, w)]);
  const magZ = logGrid(0.1, 2, 500).map(w => [w, gainDb(d, w)]);
  const lin = [];
  for (let i = 0; i <= 600; i++) lin.push(3 * i / 600);
  for (const w of zeroW) if (w < 3) lin.push(w - 1e-9, w + 1e-9);
  lin.sort((x, y) => x - y);
  const ph = lin.map(w => [w, phaseRad(d, w) * 180 / Math.PI]);
  const gd = lin.map(w => [w, groupDelay(d, w)]);
  return { mag: mag, magZ: magZ, ph: ph, gd: gd, tau0: groupDelay(d, 0) };
}

// ---------------------------------------------------------------- layout

function computeLayout() {
  const W = canvasWidth;
  if (wide) {
    const pzW = Math.min(230, Math.max(170, W * 0.22));
    P.title = { y: 8, size: 22 };
    P.mag = { x0: 62, x1: W - 15 - pzW - 44, y0: 62, y1: 290 };
    P.pz = { x0: W - 15 - pzW, x1: W - 15, y0: 62, y1: 290 };
    const gap = 54, left = 62, w = (W - left - 15 - 2 * gap) / 3;
    P.ph = { x0: left, x1: left + w, y0: 346, y1: 494 };
    P.gd = { x0: left + w + gap, x1: left + 2 * w + gap, y0: 346, y1: 494 };
    P.st = { x0: left + 2 * (w + gap), x1: W - 15, y0: 346, y1: 494 };
    P.table = { y: 533, dy: 19, size: 15 };
    P.tick = 14;
  } else {
    const left = 46, gap = 44, w = (W - left - 10 - gap) / 2;
    P.title = { y: 6, size: 18 };
    P.mag = { x0: left, x1: W - 10, y0: 50, y1: 176 };
    P.ph = { x0: left, x1: left + w, y0: 220, y1: 302 };
    P.gd = { x0: left + w + gap, x1: W - 10, y0: 220, y1: 302 };
    P.st = { x0: left, x1: left + w, y0: 344, y1: 426 };
    P.pz = { x0: left + w + gap, x1: W - 10, y0: 344, y1: 426 };
    P.table = { y: 462, dy: 16, size: 13 };
    P.tick = 12;
  }
}

function layoutControls() {
  const W = canvasWidth;
  const cbFont = '15px';
  for (const cb of familyBoxes) cb.style('font-size', cbFont);
  zoomCheckbox.style('font-size', cbFont);
  normSelect.style('font-size', wide ? '15px' : '14px');
  const rowY = i => drawHeight + (wide ? 18 + 34 * i : 17 + 32 * i);
  const place = (el, x, i) => el.position(x, rowY(i) - 11);

  if (wide) {
    let x = 10;
    familyBoxes.forEach(cb => { place(cb, x, 0); x += cb.elt.offsetWidth + 14; });
    place(zoomCheckbox, x + 22, 0);
    const colB = Math.round(W / 2);
    orderSlider.position(10 + sliderLeftMargin, rowY(1) - 10);
    orderSlider.size(colB - 10 - sliderLeftMargin - 25);
    rippleSlider.position(colB + sliderLeftMargin, rowY(1) - 10);
    rippleSlider.size(W - colB - sliderLeftMargin - 15);
    stopSlider.position(10 + sliderLeftMargin, rowY(2) - 10);
    stopSlider.size(colB - 10 - sliderLeftMargin - 25);
    normSelect.position(colB + 74, rowY(2) - 12);
  } else {
    let x = 8;
    familyBoxes.slice(0, 3).forEach(cb => { place(cb, x, 0); x += cb.elt.offsetWidth + 10; });
    x = 8;
    familyBoxes.slice(3).forEach(cb => { place(cb, x, 1); x += cb.elt.offsetWidth + 10; });
    place(zoomCheckbox, x + 8, 1);
    const sw = W - sliderLeftMargin - 15;
    orderSlider.position(sliderLeftMargin, rowY(2) - 10);
    orderSlider.size(sw);
    rippleSlider.position(sliderLeftMargin, rowY(3) - 10);
    rippleSlider.size(sw);
    stopSlider.position(sliderLeftMargin, rowY(4) - 10);
    stopSlider.size(sw);
    normSelect.position(74, rowY(5) - 12);
  }
  P.rowY = rowY;
}

function drawControlLabels() {
  noStroke();
  fill('black');
  const sz = wide ? defaultTextSize : 15;
  const rowY = P.rowY;
  if (wide) {
    const colB = Math.round(canvasWidth / 2);
    richText('Order N = ' + N, 10, rowY(1), sz, LEFT);
    richText('Ripple R_p = ' + Rp.toFixed(1) + ' dB', colB, rowY(1), sz, LEFT);
    richText('Stopband A_s = ' + As + ' dB', 10, rowY(2), sz, LEFT);
    richText('Scaling:', colB, rowY(2), sz, LEFT);
  } else {
    richText('Order N = ' + N, 8, rowY(2), sz, LEFT);
    richText('Ripple R_p = ' + Rp.toFixed(1) + ' dB', 8, rowY(3), sz, LEFT);
    richText('Stopband A_s = ' + As + ' dB', 8, rowY(4), sz, LEFT);
    richText('Scaling:', 8, rowY(5), sz, LEFT);
  }
}

// ---------------------------------------------------------------- plot helpers

function panelFrame(R, titleCands) {
  fill('white');
  stroke(200);
  strokeWeight(1);
  rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(titleCands, R.x0, R.y0 - 11, R.x1 - R.x0 + 30, wide ? 15 : 13, LEFT);
  textStyle(NORMAL);
}

function clipTo(R) {
  push();
  drawingContext.beginPath();
  drawingContext.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
  drawingContext.clip();
}
function unclip() { pop(); }

// axis mapping helpers
function mapLog(w, R, lo, hi) { return R.x0 + Math.log(w / lo) / Math.log(hi / lo) * (R.x1 - R.x0); }
function mapLin(v, a, b, p0, p1) { return p0 + (v - a) / (b - a) * (p1 - p0); }

// a "nice" tick step giving at most maxTicks intervals over span
function niceStep(span, maxTicks) {
  const raw = span / maxTicks;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}

function hGrid(R, lo, hi, step, fmtFn) {
  textSize(P.tick);
  textAlign(RIGHT, CENTER);
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) {
    const y = mapLin(v, lo, hi, R.y1, R.y0);
    stroke(Math.abs(v) < 1e-9 ? 150 : 228);
    strokeWeight(1);
    line(R.x0, y, R.x1, y);
    noStroke();
    fill(70);
    text(fmtFn(v), R.x0 - 5, y);
  }
}

function vGridLin(R, lo, hi, step, fmtFn) {
  textSize(P.tick);
  textAlign(CENTER, TOP);
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) {
    const x = mapLin(v, lo, hi, R.x0, R.x1);
    stroke(Math.abs(v) < 1e-9 ? 150 : 228);
    strokeWeight(1);
    line(x, R.y0, x, R.y1);
    noStroke();
    fill(70);
    text(fmtFn(v), x, R.y1 + 4);
  }
}

function polyline(pts, col, weight, breakFn) {
  noFill();
  stroke(col[0], col[1], col[2]);
  strokeWeight(weight);
  beginShape();
  for (let i = 0; i < pts.length; i++) {
    if (i > 0 && breakFn && breakFn(i)) { endShape(); beginShape(); }
    vertex(pts[i][0], pts[i][1]);
  }
  endShape();
}

function dashedH(R, y, col) {
  stroke(col[0], col[1], col[2]);
  strokeWeight(1.5);
  drawingContext.setLineDash([6, 5]);
  line(R.x0, y, R.x1, y);
  drawingContext.setLineDash([]);
}

function edgeDot(x, y, col) {
  stroke(255);
  strokeWeight(1.5);
  fill(col[0], col[1], col[2]);
  circle(x, y, 9);
}

// ---------------------------------------------------------------- title

function drawTitle() {
  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(['IIR Prototype Comparison: Butterworth, Chebyshev, Elliptic and Bessel', 'IIR Prototype Comparison'],
          canvasWidth / 2, P.title.y + P.title.size / 2 + 2, canvasWidth - 20, P.title.size, CENTER);
  textStyle(NORMAL);
}

// ---------------------------------------------------------------- magnitude

function drawMagnitude(vis) {
  const R = P.mag;
  const zoom = zoomCheckbox.checked();
  const wLo = 0.1, wHi = zoom ? 2 : 10;
  let yLo, yHi;
  if (zoom) { yLo = -(2 * Rp + 0.5); yHi = 0.25 * Rp + 0.1; }
  else { yLo = -100; yHi = 5; }
  const normNote = normMode === 'db3' ? 'every curve is −3.01 dB at ω = 1 rad/s' : 'every curve has R_p dB loss at ω = 1 rad/s';
  panelFrame(R, zoom
    ? ['Passband zoom: magnitude (dB) vs ω (rad/s, log axis); ' + normNote, 'Passband zoom: magnitude (dB) vs ω (rad/s)', 'Passband zoom (dB)']
    : ['Magnitude (dB) vs ω (rad/s, log axis); ' + normNote, 'Magnitude (dB) vs ω (rad/s, log axis)', 'Magnitude (dB)']);

  // horizontal grid
  const step = zoom ? niceStep(yHi - yLo, wide ? 7 : 4) : (wide ? 20 : 25);
  hGrid(R, yLo, yHi, step, v => fmtNum(v, step < 1 ? (step < 0.1 ? 2 : 1) : 0));

  // vertical log grid
  textSize(P.tick);
  textAlign(CENTER, TOP);
  const decades = [0.1, 1, 10];
  for (const dec of decades) {
    for (let m = 1; m < 10; m++) {
      const w = dec * m;
      if (w < wLo - 1e-9 || w > wHi + 1e-9) continue;
      const x = mapLog(w, R, wLo, wHi);
      stroke(m === 1 ? 200 : 236);
      strokeWeight(1);
      line(x, R.y0, x, R.y1);
      const labelled = m === 1 || m === 2 || m === 5 || (zoom && wide && m === 3);
      if (labelled && (wide || m !== 2 || zoom)) {
        noStroke();
        fill(70);
        text(fmtTick(w), x, R.y1 + 4);
      }
    }
  }

  // specification lines
  const yOf = v => mapLin(v, yLo, yHi, R.y1, R.y0);
  noStroke();
  textSize(P.tick);
  if (zoom) {
    dashedH(R, yOf(-Rp), COL_SPEC);
    noStroke(); fill(90); textAlign(RIGHT, BOTTOM);
    const lab = '−R_p = −' + Rp.toFixed(1) + ' dB', lw = richWidth(lab, P.tick);
    fill(255, 255, 255, 200);
    rect(R.x1 - 9 - lw, yOf(-Rp) - 18, lw + 6, 16, 3);
    fill(90);
    richText(lab, R.x1 - 6, yOf(-Rp) - 10, P.tick, RIGHT);
    if (-3.0103 > yLo) {
      dashedH(R, yOf(-3.0103), [180, 180, 180]);
      noStroke(); fill(110);
      richText('−3.01 dB', R.x1 - 6, yOf(-3.0103) + 9, P.tick, RIGHT);
    }
  } else {
    dashedH(R, yOf(-As), COL_SPEC);
    noStroke(); fill(90);
    const lab = '−A_s = −' + As + ' dB', lw = richWidth(lab, P.tick);
    fill(255, 255, 255, 200);
    rect(R.x1 - 9 - lw, yOf(-As) - 18, lw + 6, 16, 3);
    fill(90);
    richText(lab, R.x1 - 6, yOf(-As) - 10, P.tick, RIGHT);
  }

  // curves
  clipTo(R);
  for (const f of vis) {
    const pts = results[f.id].curves[zoom ? 'magZ' : 'mag'].map(([w, g]) =>
      [mapLog(w, R, wLo, wHi), yOf(Math.max(g, yLo - 50))]);
    polyline(pts, f.col, 2.2);
  }
  // band-edge dots: w_s on the -A_s line (normal view), w_p on the -R_p line (zoom view)
  for (const f of vis) {
    const e = results[f.id].edges;
    const w = zoom ? e.wp : e.ws, y = zoom ? yOf(-Rp) : yOf(-As);
    if (w && w >= wLo && w <= wHi) edgeDot(mapLog(w, R, wLo, wHi), y, f.col);
  }
  unclip();
  drawLegend(R, vis);
}

function drawLegend(R, vis) {
  if (!vis.length) return;
  // wide: one column; narrow: two columns so the legend stays in the empty lower-left corner
  const sz = wide ? 14 : 11, dy = wide ? 18 : 13, cols = wide ? 1 : 2, sw = wide ? 20 : 12;
  textSize(sz);
  let w = 0;
  for (const f of vis) w = Math.max(w, advW(f.name));
  const cw = w + sw + 16, rows = Math.ceil(vis.length / cols);
  const bw = cw * Math.min(cols, vis.length) + 4, bh = rows * dy + 6;
  const x = R.x0 + 6, y = R.y1 - bh - 6;
  fill(255, 255, 255, 225);
  stroke(200);
  strokeWeight(1);
  rect(x, y, bw, bh, 6);
  vis.forEach((f, i) => {
    const xx = x + 6 + cw * Math.floor(i / rows), yy = y + 3 + dy * (i % rows + 0.5);
    stroke(f.col[0], f.col[1], f.col[2]);
    strokeWeight(2.5);
    line(xx, yy, xx + sw, yy);
    noStroke();
    fill(f.col[0], f.col[1], f.col[2]);
    textAlign(LEFT, CENTER);
    text(f.name, xx + sw + 5, yy);
  });
}

// ---------------------------------------------------------------- phase

function drawPhase(vis) {
  const R = P.ph;
  panelFrame(R, ['Phase (degrees) vs ω (rad/s)', 'Phase (°) vs ω', 'Phase (°)']);
  let lo = 0, hi = 0;
  for (const f of vis) for (const [, v] of results[f.id].curves.ph) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  lo = Math.floor(lo / 90 - 1e-9) * 90;
  hi = Math.ceil(hi / 90 + 1e-9) * 90;
  if (hi - lo < 180) lo = hi - 180;
  const span = hi - lo;
  const maxT = wide ? 5 : 4;
  let step = 90;
  while (span / step > maxT) step *= 2;
  hGrid(R, lo, hi, step, v => fmtNum(v, 0));
  vGridLin(R, 0, 3, wide && (R.x1 - R.x0) > 260 ? 0.5 : 1, v => fmtTick(v));
  clipTo(R);
  for (const f of vis) {
    const c = results[f.id].curves.ph;
    const pts = c.map(([w, v]) => [mapLin(w, 0, 3, R.x0, R.x1), mapLin(v, lo, hi, R.y1, R.y0)]);
    polyline(pts, f.col, 2, i => Math.abs(c[i][1] - c[i - 1][1]) > 90);   // break at the +180° jumps (zeros)
  }
  unclip();
}

// ---------------------------------------------------------------- group delay

function drawGroupDelay(vis) {
  const R = P.gd;
  let tMax = 0, t0Max = 0;
  for (const f of vis) {
    const c = results[f.id].curves;
    t0Max = Math.max(t0Max, c.tau0);
    for (const [, v] of c.gd) tMax = Math.max(tMax, v);
  }
  let hi = Math.max(1, Math.min(tMax, 5 * t0Max) * 1.05);
  const step = niceStep(hi, wide ? 5 : 4);
  hi = Math.ceil(hi / step - 1e-9) * step;
  const clipped = tMax > hi + 1e-9;
  panelFrame(R, clipped
    ? ['Group delay τ (s) vs ω (rad/s); peaks clipped', 'Group delay τ (s), clipped', 'τ (s), clipped']
    : ['Group delay τ (s) vs ω (rad/s)', 'Group delay τ (s)', 'τ (s)']);
  hGrid(R, 0, hi, step, v => fmtNum(v, step < 1 ? 1 : 0));
  vGridLin(R, 0, 3, wide && (R.x1 - R.x0) > 260 ? 0.5 : 1, v => fmtTick(v));
  clipTo(R);
  for (const f of vis) {
    const pts = results[f.id].curves.gd.map(([w, v]) =>
      [mapLin(w, 0, 3, R.x0, R.x1), mapLin(Math.min(v, hi * 2), 0, hi, R.y1, R.y0)]);
    polyline(pts, f.col, 2);
  }
  unclip();
}

// ---------------------------------------------------------------- step response

function stepWindow(vis) {
  let ts = 0;
  for (const f of vis) ts = Math.max(ts, results[f.id].metrics.settling);
  const need = Math.max(10, 1.15 * ts);
  for (const T of [10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120, 150]) if (T >= need) return T;
  return 150;
}

function drawStep(vis) {
  const R = P.st;
  const T = stepWindow(vis);
  panelFrame(R, ['Step response vs t (s); ticks mark 2% settling', 'Step response vs t (s)', 'Step response']);
  const yLo = -0.05, yHi = 1.3;
  hGrid(R, 0, 1.25, wide ? 0.25 : 0.5, v => fmtNum(v, 2).replace(/0$/, '').replace(/\.0$/, ''));
  const tStep = niceStep(T, (R.x1 - R.x0) > 260 ? 6 : 3);
  vGridLin(R, 0, T, tStep, v => fmtNum(v, 0));
  // final value 1 reference
  const yOf = v => mapLin(v, yLo, yHi, R.y1, R.y0);
  // sampled step responses (cached per design and time window)
  const key = designKey + '|' + T;
  if (stepCache.key !== key) {
    stepCache = { key: key, data: {} };
    for (const f of FAMILIES) {
      const m = results[f.id].metrics.model, pts = [];
      for (let i = 0; i <= 500; i++) { const t = T * i / 500; pts.push([t, stepAt(m, t)]); }
      stepCache.data[f.id] = pts;
    }
  }
  clipTo(R);
  for (const f of vis) {
    const pts = stepCache.data[f.id].map(([t, y]) => [mapLin(t, 0, T, R.x0, R.x1), yOf(y)]);
    polyline(pts, f.col, 2);
  }
  // settling-time ticks along the bottom edge
  for (const f of vis) {
    const ts = results[f.id].metrics.settling;
    if (ts > T) continue;
    const x = mapLin(ts, 0, T, R.x0, R.x1);
    noStroke();
    fill(f.col[0], f.col[1], f.col[2]);
    triangle(x, R.y1 - 10, x - 5, R.y1 - 1, x + 5, R.y1 - 1);
  }
  unclip();
}

// ---------------------------------------------------------------- pole-zero plot

function drawPoleZero(vis) {
  const R = P.pz;
  panelFrame(R, ['Poles × and zeros ○ (s-plane)', 'Poles × zeros ○', 'Poles/zeros']);
  let maxRe = 1, maxIm = 1, firstZero = 0;
  for (const f of vis) {
    const d = results[f.id].d;
    for (const p of d.p) { maxRe = Math.max(maxRe, -p.re); maxIm = Math.max(maxIm, Math.abs(p.im)); }
    const zs = d.z.map(z => Math.abs(z.im));
    if (zs.length) firstZero = Math.max(firstZero, Math.min(...zs));
  }
  const Ev = Math.max(1.2, 1.12 * maxIm, firstZero > 0 ? Math.min(1.12 * firstZero, 3.2) : 0);
  const H = R.y1 - R.y0, Wd = R.x1 - R.x0;
  const needW = 1.15 * maxRe + 0.45;
  const s = Math.min(H / (2 * Ev), Wd / needW);            // pixels per unit, equal aspect
  const ox = R.x0 + (Wd - needW * s) / 2 + 1.15 * maxRe * s;
  const oy = (R.y0 + R.y1) / 2;
  const imVis = H / (2 * s);

  clipTo(R);
  // grid at integer units
  stroke(232);
  strokeWeight(1);
  for (let k = -10; k <= 10; k++) {
    if (k === 0) continue;
    const x = ox + k * s, y = oy - k * s;
    if (x > R.x0 && x < R.x1) line(x, R.y0, x, R.y1);
    if (y > R.y0 && y < R.y1) line(R.x0, y, R.x1, y);
  }
  stroke(150);
  line(R.x0, oy, R.x1, oy);
  line(ox, R.y0, ox, R.y1);
  // unit circle
  noFill();
  stroke(185);
  drawingContext.setLineDash([4, 4]);
  circle(ox, oy, 2 * s);
  drawingContext.setLineDash([]);

  // zeros (open circles) and poles (crosses)
  for (const f of vis) {
    const d = results[f.id].d;
    stroke(f.col[0], f.col[1], f.col[2]);
    strokeWeight(2);
    noFill();
    for (const z of d.z) {
      if (Math.abs(z.im) < imVis) circle(ox + z.re * s, oy - z.im * s, 9);
    }
    const r = 4.5;
    for (const p of d.p) {
      const x = ox + p.re * s, y = oy - p.im * s;
      line(x - r, y - r, x + r, y + r);
      line(x - r, y + r, x + r, y - r);
    }
  }
  unclip();

  // axis labels and ticks
  noStroke();
  fill(70);
  textSize(P.tick);
  textAlign(RIGHT, CENTER);
  for (let k = -3; k <= 3; k++) {
    const y = oy - k * s;
    if (y > R.y0 + 6 && y < R.y1 - 6 && s * 1 > 14) text(k === 0 ? '0' : fmtNum(k, 0) + 'j', R.x0 - 4, y);
  }
  textAlign(CENTER, TOP);
  for (let k = -3; k <= 0 && s >= 18; k++) {
    const x = ox + k * s;
    if (x > R.x0 + 4 && x < R.x1 - 4) text(fmtNum(k, 0), x, R.y1 + 4);
  }
  textAlign(RIGHT, BOTTOM);
  text('σ', R.x1 - 4, oy - 2);
  textAlign(RIGHT, TOP);
  text('jω', ox - 8, R.y0 + 3);

  // zeros beyond the visible range: listed under the plot in the family color
  const segs = [];
  for (const f of vis) {
    const far = results[f.id].d.z.filter(z => z.im > imVis).map(z => z.im).sort((a, b) => a - b);
    if (far.length) segs.push({ col: f.col, full: '○ ±j' + far.map(v => v.toFixed(2)).join(', ±j'), n: 2 * far.length });
  }
  if (segs.length) {
    const sz = wide ? 13 : 11, gapW = 12;
    const avail = R.x1 - R.x0 + 34;
    const head = 'Zeros off scale: ';
    const listW = segs.reduce((w, sg) => w + richWidth(sg.full, sz) + gapW, 0);
    const mode = richWidth(head, sz) + listW <= avail ? 0 : (richWidth('Off scale: ', sz) + listW <= avail ? 1 : 2);
    let x = R.x0 - 34;
    const y = R.y1 + (wide ? 25 : 22);
    fill(70);
    x += richText(mode === 0 ? head : (mode === 1 ? 'Off scale: ' : 'Zeros off scale: '), x, y, sz, LEFT);
    for (const sg of segs) {
      fill(sg.col[0], sg.col[1], sg.col[2]);
      x += richText(mode < 2 ? sg.full : sg.n + ' ○', x, y, sz, LEFT) + gapW;
    }
  }
}

// ---------------------------------------------------------------- read-out table

function drawTable(vis) {
  const T = P.table, sz = T.size;
  const W = canvasWidth;
  let heads, widths, getters;
  const best = col => {
    const vals = vis.map(f => col(results[f.id]));
    const m = Math.min(...vals);
    return v => vis.length > 1 && v <= m * 1.005 + 1e-9;
  };
  const dw = r => r.edges.ws - r.edges.wp;
  const os = r => r.metrics.overshoot;
  const st = r => r.metrics.settling;
  if (wide) {
    heads = ['Family', 'ω_p (rad/s)', 'ω_s (rad/s)', 'Δω = ω_s − ω_p', 'ω_s / ω_p', 'Overshoot', 'Settling (2%)'];
    widths = [112, 92, 92, 128, 84, 96, 112];
    getters = [null, r => fmtW(r.edges.wp), r => fmtW(r.edges.ws), r => fmtW(dw(r)), r => fmtW(r.edges.ws / r.edges.wp),
               r => os(r).toFixed(1) + ' %', r => st(r).toFixed(2) + ' s'];
  } else {
    heads = ['Family', 'Δω (rad/s)', 'Overshoot', 'Settling'];
    widths = [96, 84, 76, 76];
    getters = [null, r => fmtW(dw(r)), r => os(r).toFixed(1) + ' %', r => st(r).toFixed(2) + ' s'];
  }
  const bestFns = wide ? [null, null, null, best(dw), null, best(os), best(st)] : [null, best(dw), best(os), best(st)];
  const total = widths.reduce((a, b) => a + b, 0);
  const k = Math.min(1.5, Math.max(1, (W - 2 * 12) / total));
  const xs = [];
  let x = wide ? 18 : 8;
  for (const w of widths) { xs.push(x); x += w * k; }

  noStroke();
  fill(50);
  textStyle(BOLD);
  heads.forEach((h, i) => richText(h, xs[i], T.y, sz, LEFT));
  textStyle(NORMAL);
  stroke(190);
  strokeWeight(1);
  line(xs[0], T.y + T.dy * 0.55, Math.min(W - 10, x), T.y + T.dy * 0.55);

  if (!vis.length) {
    noStroke();
    fill(90);
    richText('Check at least one family below.', xs[0], T.y + T.dy * 1.2, sz, LEFT);
    return;
  }
  vis.forEach((f, row) => {
    const r = results[f.id];
    const y = T.y + T.dy * (row + 1.2);
    getters.forEach((g, i) => {
      noStroke();
      if (i === 0) {
        fill(f.col[0], f.col[1], f.col[2]);
        textStyle(BOLD);
        richText(f.name, xs[0], y, sz, LEFT);
        textStyle(NORMAL);
        return;
      }
      const sTxt = g(r);
      if (bestFns[i]) {
        const val = i === (wide ? 3 : 1) ? dw(r) : (i === (wide ? 5 : 2) ? os(r) : st(r));
        if (bestFns[i](val)) {
          fill(HIGHLIGHT[0], HIGHLIGHT[1], HIGHLIGHT[2]);
          rect(xs[i] - 4, y - T.dy / 2 + 1, richWidth(sTxt, sz) + 8, T.dy - 2, 4);
        }
      }
      fill(30);
      richText(sTxt, xs[i], y, sz, LEFT);
    });
  });
}

// ---------------------------------------------------------------- number formats

function fmtNum(v, d) {
  const r = Number(v.toFixed(d));
  return (r < 0 ? '−' : '') + Math.abs(r).toFixed(d);
}
// band-edge frequencies: about four significant figures
function fmtW(v) {
  if (v === null || !isFinite(v)) return '—';
  if (v < 10) return v.toFixed(3);
  if (v < 100) return v.toFixed(2);
  if (v < 1000) return v.toFixed(1);
  return v.toFixed(0);
}
function fmtTick(v) {
  if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
  return String(Number(v.toFixed(2)));
}

// ---------------------------------------------------------------- text helpers

// Rich text: "w_p" draws the character after '_' as a subscript
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

// ---------------------------------------------------------------- responsive layout

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  wide = canvasWidth >= 720;
  controlHeight = wide ? 112 : 200;
  drawHeight = canvasHeight - controlHeight;
  computeLayout();
  if (typeof orderSlider !== 'undefined' && canvasWidth !== layoutWidth) {
    layoutWidth = canvasWidth;
    layoutControls();
  }
}

// ================================================================= filter mathematics
// Pure functions below: complex arithmetic, Jacobi elliptic functions (Landen transformations),
// the five classic prototypes, frequency scaling, band edges and the step response.

// ---------------------------------------------------------------- complex arithmetic
function C(re, im) { return { re: re, im: im || 0 }; }
function cAdd(a, b) { return C(a.re + b.re, a.im + b.im); }
function cSub(a, b) { return C(a.re - b.re, a.im - b.im); }
function cMul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
function cDiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
}
function cScale(a, s) { return C(a.re * s, a.im * s); }
function cAbs2(a) { return a.re * a.re + a.im * a.im; }

// ---------------------------------------------------------------- Jacobi elliptic functions
// Descending Landen sequence of moduli k_1, k_2, ... (k_n -> 0). The complementary modulus kp
// is carried separately so that moduli very close to 1 keep full precision.
function landenSeq(k, kp) {
  const v = [];
  for (let n = 0; n < 12 && k > 1e-16; n++) {
    const kNext = Math.pow(k / (1 + kp), 2);
    kp = 2 * Math.sqrt(kp) / (1 + kp);
    k = kNext;
    v.push(k);
  }
  return v;
}

// cd(u K, k) and sn(u K, k) for complex u (u in units of the quarter period K)
function cdeC(u, v) {
  const a = u.re * Math.PI / 2, b = u.im * Math.PI / 2;
  let w = C(Math.cos(a) * Math.cosh(b), -Math.sin(a) * Math.sinh(b));     // cos(a + jb)
  for (let n = v.length - 1; n >= 0; n--) {
    w = cDiv(cScale(w, 1 + v[n]), cAdd(C(1, 0), cScale(cMul(w, w), v[n])));
  }
  return w;
}
function sneReal(u, v) {
  let w = Math.sin(u * Math.PI / 2);
  for (let n = v.length - 1; n >= 0; n--) w = (1 + v[n]) * w / (1 + v[n] * w * w);
  return w;
}

// ---------------------------------------------------------------- classic analog prototypes
// Each returns { z: [complex], p: [complex], g0: DC gain }

function butterworthProto(N) {           // -3 dB at 1 rad/s
  const p = [];
  for (let k = 0; k < N; k++) {
    const th = Math.PI * (2 * k + N + 1) / (2 * N);
    p.push(C(Math.cos(th), Math.sin(th)));
  }
  return { z: [], p: p, g0: 1 };
}

function cheby1Proto(N, Rp) {            // equiripple passband, ripple edge (-Rp dB) at 1 rad/s
  const ep = Math.sqrt(Math.pow(10, Rp / 10) - 1);
  const mu = Math.asinh(1 / ep) / N;
  const p = [];
  for (let k = 1; k <= N; k++) {
    const th = Math.PI * (2 * k - 1) / (2 * N);
    p.push(C(-Math.sinh(mu) * Math.sin(th), Math.cosh(mu) * Math.cos(th)));
  }
  return { z: [], p: p, g0: N % 2 ? 1 : 1 / Math.sqrt(1 + ep * ep) };
}

function cheby2Proto(N, As) {            // equiripple stopband, stopband edge (-As dB) at 1 rad/s
  const es = Math.sqrt(Math.pow(10, As / 10) - 1);
  const mu = Math.asinh(es) / N;
  const p = [], z = [];
  for (let k = 1; k <= N; k++) {
    const th = Math.PI * (2 * k - 1) / (2 * N);
    const q = C(-Math.sinh(mu) * Math.sin(th), Math.cosh(mu) * Math.cos(th));
    p.push(cDiv(C(1, 0), q));
    if (Math.abs(Math.cos(th)) > 1e-12) z.push(C(0, 1 / Math.cos(th)));
  }
  return { z: z, p: p, g0: 1 };
}

// Elliptic (Cauer) prototype with the passband edge at 1 rad/s, after Orfanidis,
// "Lecture Notes on Elliptic Filter Design" (Landen transformations).
function ellipticProto(N, Rp, As) {
  const ep = Math.sqrt(Math.pow(10, Rp / 10) - 1);
  const es = Math.sqrt(Math.pow(10, As / 10) - 1);
  if (N === 1) return { z: [], p: [C(-1 / ep, 0)], g0: 1, k: ep / es };
  const k1 = ep / es, k1p = Math.sqrt(1 - k1 * k1);
  const L = Math.floor(N / 2), odd = N % 2 === 1;
  // degree equation: k' = k1'^N * prod sn^4(u_i K1', k1')
  const v1p = landenSeq(k1p, k1);
  let kp = Math.pow(k1p, N);
  for (let i = 1; i <= L; i++) kp *= Math.pow(sneReal((2 * i - 1) / N, v1p), 4);
  const k = Math.sqrt(1 - kp * kp);
  const v = landenSeq(k, kp);
  // v0 = asne(j/ep, k1) / (jN): inverse sn on the imaginary axis via the Landen sequence of k1
  const v1 = landenSeq(k1, k1p);
  let w = 1 / ep, kn = k1;
  for (let n = 0; n < v1.length; n++) {
    w = w / (1 + Math.sqrt(1 + w * w * kn * kn)) * 2 / (1 + v1[n]);
    kn = v1[n];
  }
  const v0 = (2 / Math.PI) * Math.asinh(w) / N;
  const z = [], p = [];
  for (let i = 1; i <= L; i++) {
    const ui = (2 * i - 1) / N;
    const zeta = cdeC(C(ui, 0), v).re;
    z.push(C(0, 1 / (k * zeta)), C(0, -1 / (k * zeta)));
    const cd = cdeC(C(ui, -v0), v);           // pole = j cd((u_i - j v0) K, k)
    const pi = C(-cd.im, cd.re);
    p.push(pi, C(pi.re, -pi.im));
  }
  if (odd) {
    // real pole j sn(j v0 K, k)
    let c = Math.sinh(v0 * Math.PI / 2);
    for (let n = v.length - 1; n >= 0; n--) c = (1 + v[n]) * c / (1 - v[n] * c * c);
    p.push(C(-c, 0));
  }
  return { z: z, p: p, g0: odd ? 1 : 1 / Math.sqrt(1 + ep * ep), k: k };
}

// Bessel (Thomson) prototype: reverse Bessel polynomial, unit group delay at DC
function besselProto(N) {
  const fact = n => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };
  const a = [];                                   // a[k] multiplies s^k; a[N] = 1
  for (let k = 0; k <= N; k++) a.push(fact(2 * N - k) / (Math.pow(2, N - k) * fact(k) * fact(N - k)));
  const roots = polyRoots(a);
  return { z: [], p: roots, g0: 1 };
}

// Durand-Kerner root finder for a monic real polynomial (coefficients in ascending order)
function polyRoots(a) {
  const N = a.length - 1;
  const R = Math.pow(Math.abs(a[0]), 1 / N);
  let r = [];
  for (let k = 0; k < N; k++) {
    const th = 2 * Math.PI * k / N + 0.4;
    r.push(C(R * Math.cos(th), R * Math.sin(th)));
  }
  const evalP = x => {
    let s = C(a[N], 0);
    for (let k = N - 1; k >= 0; k--) s = cAdd(cMul(s, x), C(a[k], 0));
    return s;
  };
  for (let it = 0; it < 2000; it++) {
    let delta = 0;
    const nr = [];
    for (let i = 0; i < N; i++) {
      let den = C(1, 0);
      for (let j = 0; j < N; j++) if (j !== i) den = cMul(den, cSub(r[i], r[j]));
      const step = cDiv(evalP(r[i]), den);
      nr.push(cSub(r[i], step));
      delta = Math.max(delta, Math.sqrt(cAbs2(step)) / (1 + Math.sqrt(cAbs2(r[i]))));
    }
    r = nr;
    if (delta < 1e-15) break;
  }
  // clean up tiny imaginary parts of real roots and force exact conjugate pairs
  return r.map(x => Math.abs(x.im) < 1e-9 * (1 + Math.abs(x.re)) ? C(x.re, 0) : x);
}

// ---------------------------------------------------------------- evaluation
// attenuation in dB at frequency w (rad/s) for a design {z, p, K}
function gainDb(d, w) {
  let s = 20 * Math.log10(d.K);
  for (const z of d.z) s += 10 * Math.log10(z.re * z.re + (w - z.im) * (w - z.im) + 1e-300);
  for (const p of d.p) s -= 10 * Math.log10(p.re * p.re + (w - p.im) * (w - p.im));
  return s;
}
function attenDb(d, w) { return -gainDb(d, w); }

// phase in radians, continuous except for the +pi jumps at zeros on the j-omega axis
function phaseRad(d, w) {
  let s = 0;
  for (const z of d.z) s += Math.atan2(w - z.im, -z.re);
  for (const p of d.p) s -= Math.atan2(w - p.im, -p.re);
  return s;
}

// group delay -d(phase)/dw in seconds (zeros on the axis contribute only at their jump)
function groupDelay(d, w) {
  let s = 0;
  for (const p of d.p) { const sg = -p.re, dw = w - p.im; s += sg / (sg * sg + dw * dw); }
  for (const z of d.z) {
    if (Math.abs(z.re) > 1e-12) { const sg = -z.re, dw = w - z.im; s -= sg / (sg * sg + dw * dw); }
  }
  return s;
}

// frequency where the attenuation crosses A dB, bisection in log w on [lo, hi]
function crossFreq(d, A, lo, hi) {
  let a = Math.log(lo), b = Math.log(hi);
  for (let i = 0; i < 200; i++) {
    const m = 0.5 * (a + b);
    if (attenDb(d, Math.exp(m)) < A) a = m; else b = m;
    if (b - a < 1e-15) break;
  }
  return Math.exp(0.5 * (a + b));
}

// scale a prototype in frequency so that H_new(s) = H_old(s * w0), then fix the gain
function scaleDesign(proto, w0) {
  const z = proto.z.map(x => cScale(x, 1 / w0));
  const p = proto.p.map(x => cScale(x, 1 / w0));
  return finishDesign(z, p, proto.g0);
}
function finishDesign(z, p, g0) {
  // K such that H(0) = K prod(-z) / prod(-p) = g0
  let num = C(1, 0), den = C(1, 0);
  for (const x of z) num = cMul(num, cScale(x, -1));
  for (const x of p) den = cMul(den, cScale(x, -1));
  const K = g0 * den.re / num.re;
  return { z: z, p: p, K: K, g0: g0 };
}

// Build one family at order N. norm = 'db3' (|H| = -3.01 dB at 1 rad/s) or 'edge' (attenuation = Rp at 1 rad/s)
function designFamily(fam, N, Rp, As, norm) {
  let proto, lo, hi;
  const A = norm === 'db3' ? 10 * Math.log10(2) : Rp;
  if (fam === 'butter') { proto = butterworthProto(N); lo = 1e-6; hi = 1e6; }
  else if (fam === 'cheby1') { proto = cheby1Proto(N, Rp); lo = 1; hi = 1e6; }
  else if (fam === 'cheby2') { proto = cheby2Proto(N, As); lo = 1e-9; hi = 1; }
  else if (fam === 'ellip') { proto = ellipticProto(N, Rp, As); lo = 1; hi = 1 / proto.k; }
  else { proto = besselProto(N); lo = 1e-6; hi = 1e6; }
  const base = finishDesign(proto.z, proto.p, proto.g0);
  let w0;
  if (fam === 'butter' && norm === 'db3') w0 = 1;
  else if ((fam === 'cheby1' || fam === 'ellip') && norm === 'edge') w0 = 1;
  else w0 = crossFreq(base, A, lo, hi);
  const d = scaleDesign(proto, w0);
  d.fam = fam;
  return d;
}

// ---------------------------------------------------------------- band edges
// wp: first frequency where the attenuation exceeds Rp; ws: last frequency where it is below As
function bandEdges(d, Rp, As) {
  const n = 3000, lo = Math.log(1e-4), hi = Math.log(1e7);
  const tol = 1e-4;
  let wp = null, ws = null, lastPass = 0, lastBelow = -1;
  const grid = [];
  for (let i = 0; i <= n; i++) grid.push(Math.exp(lo + (hi - lo) * i / n));
  for (let i = 0; i <= n; i++) {
    const a = attenDb(d, grid[i]);
    if (wp === null) {
      if (a <= Rp) lastPass = i;
      else if (a > Rp + tol) wp = crossFreq(d, Rp, grid[lastPass], grid[i]);
    }
    if (a < As - tol) lastBelow = i;
  }
  if (lastBelow >= 0 && lastBelow < n) {
    let j = lastBelow + 1;
    while (j < n && attenDb(d, grid[j]) < As) j++;
    ws = crossFreq(d, As, grid[lastBelow], grid[j]);
  }
  return { wp: wp, ws: ws };
}

// ---------------------------------------------------------------- step response
function stepModel(d) {
  // y(t) = H(0) + Re sum_k c_k exp(p_k t),  c_k = Res_{p_k} H / p_k
  const c = d.p.map((pk, k) => {
    let num = C(d.K, 0), den = C(1, 0);
    for (const z of d.z) num = cMul(num, cSub(pk, z));
    d.p.forEach((pj, j) => { if (j !== k) den = cMul(den, cSub(pk, pj)); });
    return cDiv(cDiv(num, den), pk);
  });
  return { c: c, p: d.p, y0: d.g0 };
}
function stepAt(m, t) {
  let s = m.y0;
  m.p.forEach((pk, k) => {
    const e = Math.exp(pk.re * t);
    s += e * (m.c[k].re * Math.cos(pk.im * t) - m.c[k].im * Math.sin(pk.im * t));
  });
  return s;
}
// overshoot (% of final value) and 2 % settling time
function stepMetrics(d) {
  const m = stepModel(d);
  const yf = m.y0, band = 0.02 * Math.abs(yf);
  // end time: tail bound sum |c_k| e^{sigma_k t} below band / 20
  let tEnd = 1;
  const tail = t => m.p.reduce((s, pk, k) => s + Math.sqrt(cAbs2(m.c[k])) * Math.exp(pk.re * t), 0);
  while (tail(tEnd) > band / 20 && tEnd < 1e5) tEnd *= 1.5;
  const n = 6000, dt = tEnd / n;
  let ymax = -Infinity, lastOut = -1;
  // recurrence e^{p (t+dt)} = e^{p t} e^{p dt}
  const steps = m.p.map(pk => { const e = Math.exp(pk.re * dt); return C(e * Math.cos(pk.im * dt), e * Math.sin(pk.im * dt)); });
  let cur = m.c.map(x => C(x.re, x.im));
  let tPeak = 0;
  for (let i = 0; i <= n; i++) {
    let y = yf;
    for (const x of cur) y += x.re;
    if (y > ymax) { ymax = y; tPeak = i * dt; }
    if (Math.abs(y - yf) > band) lastOut = i;
    cur = cur.map((x, k) => cMul(x, steps[k]));
  }
  let ts = 0;
  if (lastOut >= 0) {
    let a = lastOut * dt, b = (lastOut + 1) * dt;
    for (let it = 0; it < 60; it++) {
      const mid = 0.5 * (a + b);
      if (Math.abs(stepAt(m, mid) - yf) > band) a = mid; else b = mid;
    }
    ts = 0.5 * (a + b);
  }
  // refine the peak between the neighbouring samples (ternary search)
  let a = Math.max(0, tPeak - dt), b = tPeak + dt;
  for (let it = 0; it < 60; it++) {
    const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3;
    if (stepAt(m, m1) < stepAt(m, m2)) a = m1; else b = m2;
  }
  tPeak = 0.5 * (a + b);
  ymax = Math.max(ymax, stepAt(m, tPeak));
  const os = Math.max(0, (ymax - yf) / yf * 100);
  return { overshoot: os, settling: ts, tPeak: tPeak, model: m };
}
