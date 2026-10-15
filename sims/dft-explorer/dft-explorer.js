// DFT Explorer: Probing a Signal with Rotating Phasors MicroSim
// CANVAS_HEIGHT: 742
// Builds X[k] = sum_n x[n] e^(-j 2 pi k n / N) one sample at a time. Each sample x[n] is multiplied
// by a phasor that turns k/N of a revolution per sample (clockwise), and the products are added head
// to tail on the complex plane. The final arrow is X[k]; its length is mirrored in the spectrum bar
// chart. The Inverse DFT mode rebuilds x[n] from the bins the student clicks and shows the error.

// Canvas dimensions
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let drawHeight = 570;
let controlHeight = 172;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let sliderLeftMargin = 120;
let defaultTextSize = 16;

// Controls
let kSlider, amp1Slider, amp2Slider, amp3Slider;
let comp1Select, comp2Select, comp3Select;
let nSelect, animateButton, stepButton, inverseCheckbox;

// Colors: signal blue, phasor parts purple/orange, products green, running sum and spectrum
// maroon, error red, highlight gold
const COL_SIG = [25, 90, 200];
const COL_RE = [130, 50, 175];
const COL_IM = [215, 110, 0];
const COL_STEP = [40, 140, 80];
const COL_SUM = [128, 0, 0];
const COL_ERR = [205, 35, 35];
const COL_HI = [218, 165, 32];
const COL_HI_TEXT = [150, 100, 0];

// Model state
let N = 16;
let k = 2;
const comps = [{ type: 'c', m: 2 }, { type: 'c', m: 5 }, { type: 's', m: 3 }];
const amps = [1, 0.5, 0];
let inverseMode = false;
let used = [];                       // used[b] = bin b is included in the inverse DFT

// Animation: animDone products are fully added; while animPhase runs 0 -> 1 the next one grows
let animDone = 16, animPhase = 0, playing = false;
const GROW_FRACTION = 0.6;           // part of each step spent growing the new product

// Derived quantities (recomputed every frame)
let xs = [], Xre = [], Xim = [];
let stepRe = [], stepIm = [], sumRe = [], sumIm = [];
let bound = 0, ampSum = 0, maxReach = 0;
let xrRe = [], xrIm = [], errs = [];
let maxErr = 0, maxImag = 0, energyAll = 0, energyUsed = 0, nUsed = 0;

// Layout (recomputed when the width changes)
let layout = {};
let layoutWidth = -1;
const TITLE_Y = 17, FORMULA_Y = 41;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  kSlider = createSlider(0, N - 1, k, 1);
  amp1Slider = createSlider(0, 2, amps[0], 0.05);
  amp2Slider = createSlider(0, 2, amps[1], 0.05);
  amp3Slider = createSlider(0, 2, amps[2], 0.05);

  comp1Select = createSelect();
  comp2Select = createSelect();
  comp3Select = createSelect();
  fillCompSelects();

  nSelect = createSelect();
  for (const v of ['8', '16', '32']) nSelect.option(v, v);
  nSelect.selected('16');
  nSelect.style('font-size', '15px');

  animateButton = createButton('Animate');
  animateButton.style('font-size', '15px');
  animateButton.style('width', '84px');
  animateButton.mousePressed(toggleAnimation);

  stepButton = createButton('Step');
  stepButton.style('font-size', '15px');
  stepButton.mousePressed(stepAnimation);

  inverseCheckbox = createCheckbox('Inverse DFT', false);
  inverseCheckbox.style('font-size', '16px');

  used = new Array(N).fill(true);
  animDone = N;

  layoutWidth = -1;                  // lay out the controls now that they exist
  updateCanvasSize();

  describe('DFT explorer. A stem plot shows an N-point signal x[n] built from up to three sinusoids. ' +
    'A unit circle shows the phasor e^(-j2 pi k n/N) for every n, a second plot shows its real and imaginary parts, ' +
    'and a complex plane adds the products x[n] times the phasor head to tail, so the running-sum arrow ends at X[k]. ' +
    'A bar chart shows |X[k]| for every bin with bin k highlighted. Controls: bin k slider, frequency and amplitude of each ' +
    'sinusoid, N, Animate and Step buttons, and an Inverse DFT checkbox that rebuilds x[n] from the bars you click.');
}

// vertical centre of control row i
function rowY(i) {
  return drawHeight + 20 + 32 * i;
}

function draw() {
  updateCanvasSize();
  readState();
  advanceAnimation();
  computeAll();

  // Drawing region and control region
  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  drawTitleAndFormula();
  drawSignalCard();
  if (layout.wide) drawPartsCard();
  drawCircleCard();
  drawChainCard();
  drawSpectrumCard();
  drawControlLabels();
}

// ---------------------------------------------------------------- state

function readState() {
  const nv = Number(nSelect.value());
  if ((nv === 8 || nv === 16 || nv === 32) && nv !== N) applyN(nv);

  const kv = Math.round(Number(kSlider.value()));
  if (Number.isFinite(kv)) k = constrain(kv, 0, N - 1);

  [comp1Select, comp2Select, comp3Select].forEach((s, i) => {
    const mt = /^([cs])(\d+)$/.exec(String(s.value()));
    if (mt) {
      comps[i].type = mt[1];
      comps[i].m = Number(mt[2]);
    }
  });
  [amp1Slider, amp2Slider, amp3Slider].forEach((s, i) => {
    const a = Number(s.value());
    if (Number.isFinite(a)) amps[i] = a;
  });

  const inv = inverseCheckbox.checked();
  if (inv && !inverseMode) used = new Array(N).fill(true);   // start from a perfect reconstruction
  inverseMode = inv;
}

// Change the transform length: re-range k, clamp the component frequencies, reset the animation
function applyN(nv) {
  N = nv;
  kSlider.elt.max = N - 1;
  k = Math.min(k, N - 1);
  kSlider.value(k);
  for (const c of comps) {
    if (c.type === 'c') c.m = Math.min(c.m, N / 2);
    else c.m = constrain(c.m, 1, N / 2 - 1);
  }
  fillCompSelects();
  used = new Array(N).fill(true);
  playing = false;
  animDone = N;
  animPhase = 0;
  animateButton.html('Animate');
}

// Each component select lists cos at bins 0..N/2 and sin at bins 1..N/2-1
function fillCompSelects() {
  [comp1Select, comp2Select, comp3Select].forEach((s, i) => {
    const el = s.elt;
    while (el.firstChild) el.removeChild(el.firstChild);
    const add = (label, value) => {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = label;
      el.appendChild(o);
    };
    for (let m = 0; m <= N / 2; m++) add('cos, m = ' + m, 'c' + m);
    for (let m = 1; m < N / 2; m++) add('sin, m = ' + m, 's' + m);
    el.value = comps[i].type + comps[i].m;
  });
}

// ---------------------------------------------------------------- animation

function stepMs() {
  return N <= 8 ? 700 : (N <= 16 ? 450 : 260);
}

function advanceAnimation() {
  if (!playing) return;
  animPhase += Math.min(deltaTime || 16, 100) / stepMs();
  while (playing && animPhase >= 1) {
    animPhase -= 1;
    animDone++;
    if (animDone >= N) {
      animDone = N;
      animPhase = 0;
      playing = false;
      animateButton.html('Animate');
    }
  }
}

function toggleAnimation() {
  if (playing) {
    playing = false;
    animateButton.html('Resume');
    return;
  }
  if (animDone >= N) {
    animDone = 0;
    animPhase = 0;
  }
  playing = true;
  animateButton.html('Pause');
}

function stepAnimation() {
  playing = false;
  animDone = animDone >= N ? 1 : animDone + 1;
  animPhase = 0;
  animateButton.html(animDone >= N ? 'Animate' : 'Resume');
}

function isComplete() {
  return animDone >= N;
}

// fraction (0..1) of product animDone that is already drawn
function growFrac() {
  if (animDone >= N || animPhase <= 0) return 0;
  return Math.min(1, animPhase / GROW_FRACTION);
}

// the sample n being added (or just added); -1 when the sum is complete
function highlightIndex() {
  if (animDone >= N && !playing) return -1;
  if (playing || animPhase > 0) return animDone;
  return animDone - 1;
}

function partialSum() {
  if (animDone >= N) return [sumRe[N], sumIm[N]];
  const g = growFrac();
  return [sumRe[animDone] + g * stepRe[animDone], sumIm[animDone] + g * stepIm[animDone]];
}

// ---------------------------------------------------------------- mathematics

// angle 2*pi*(a*b mod N)/N, reduced first so that whole turns are exact
function binAngle(a, b) {
  return 2 * Math.PI * (((a * b) % N + N) % N) / N;
}

function clean(v) {
  return Math.abs(v) < 1e-9 ? 0 : v;
}

function computeAll() {
  // x[n] = sum of the three components
  xs = new Array(N).fill(0);
  ampSum = 0;
  for (let i = 0; i < 3; i++) {
    if (amps[i] <= 0) continue;
    ampSum += amps[i];
    const f = comps[i].type === 'c' ? Math.cos : Math.sin;
    for (let n = 0; n < N; n++) xs[n] += amps[i] * f(binAngle(comps[i].m, n));
  }
  xs = xs.map(v => (Math.abs(v) < 1e-12 ? 0 : v));

  // DFT, directly from the definition
  Xre = new Array(N).fill(0);
  Xim = new Array(N).fill(0);
  for (let b = 0; b < N; b++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const th = binAngle(b, n);
      re += xs[n] * Math.cos(th);
      im -= xs[n] * Math.sin(th);
    }
    Xre[b] = clean(re);
    Xim[b] = clean(im);
  }

  // products x[n] e^(-j 2 pi k n / N) for the selected bin and their running sums
  bound = 0;
  stepRe = [];
  stepIm = [];
  sumRe = [0];
  sumIm = [0];
  for (let n = 0; n < N; n++) {
    const th = binAngle(k, n);
    stepRe.push(xs[n] * Math.cos(th));
    stepIm.push(-xs[n] * Math.sin(th));
    sumRe.push(sumRe[n] + stepRe[n]);
    sumIm.push(sumIm[n] + stepIm[n]);
    bound += Math.abs(xs[n]);
  }

  // plane scale: the farthest any running sum reaches, over every bin, so that switching k
  // compares arrows on the same scale
  maxReach = 0;
  for (let b = 0; b < N; b++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const th = binAngle(b, n);
      re += xs[n] * Math.cos(th);
      im -= xs[n] * Math.sin(th);
      maxReach = Math.max(maxReach, Math.hypot(re, im));
    }
  }

  // inverse DFT from the selected bins
  xrRe = new Array(N).fill(0);
  xrIm = new Array(N).fill(0);
  errs = new Array(N).fill(0);
  energyAll = 0;
  energyUsed = 0;
  nUsed = 0;
  for (let b = 0; b < N; b++) {
    const e = Xre[b] * Xre[b] + Xim[b] * Xim[b];
    energyAll += e;
    if (used[b]) {
      energyUsed += e;
      nUsed++;
    }
  }
  maxErr = 0;
  maxImag = 0;
  if (inverseMode) {
    for (let n = 0; n < N; n++) {
      let re = 0, im = 0;
      for (let b = 0; b < N; b++) {
        if (!used[b]) continue;
        const ph = binAngle(b, n);
        re += Xre[b] * Math.cos(ph) - Xim[b] * Math.sin(ph);
        im += Xre[b] * Math.sin(ph) + Xim[b] * Math.cos(ph);
      }
      xrRe[n] = clean(re / N);
      xrIm[n] = clean(im / N);
      errs[n] = clean(xs[n] - xrRe[n]);
      maxErr = Math.max(maxErr, Math.abs(errs[n]));
      maxImag = Math.max(maxImag, Math.abs(xrIm[n]));
    }
  }
}

// ---------------------------------------------------------------- drawing: header

function drawTitleAndFormula() {
  noStroke();
  fill(0);
  textStyle(BOLD);
  fitText(['DFT Explorer: Probing a Signal with Rotating Phasors', 'DFT Explorer: Rotating Phasors', 'DFT Explorer'],
          canvasWidth / 2, TITLE_Y, canvasWidth - 20, 22, CENTER);
  textStyle(NORMAL);

  fill(COL_SIG);
  const terms = [], short = [];
  for (let i = 0; i < 3; i++) {
    if (amps[i] <= 0) continue;
    const c = comps[i], a = amps[i].toFixed(2);
    const fn = c.type === 'c' ? 'cos' : 'sin';
    if (c.type === 'c' && c.m === 0) {
      terms.push(a);
      short.push(a);
    } else {
      const arg = (c.m === 1 ? '' : c.m) + 'n/' + N;
      terms.push(a + ' ' + fn + '(2π·' + arg + ')');
      short.push(a + fn + '(2π' + arg + ')');
    }
  }
  const sz = layout.wide ? 16 : 14;
  if (terms.length === 0) {
    fitText(['x[n] = 0 for every n: raise an amplitude slider', 'x[n] = 0'], canvasWidth / 2, FORMULA_Y,
            canvasWidth - 20, sz, CENTER);
  } else {
    fitText(['x[n] = ' + terms.join(' + ') + ',   n = 0 … ' + (N - 1),
             'x[n] = ' + terms.join(' + '),
             'x[n] = ' + short.join('+'),
             'x[n] = ' + short[0] + (short.length > 1 ? ' + …' : '')],
            canvasWidth / 2, FORMULA_Y, canvasWidth - 16, sz, CENTER);
  }
}

// ---------------------------------------------------------------- drawing: cards

function drawCard(r) {
  fill(255);
  stroke(205);
  strokeWeight(1);
  rect(r.x, r.y, r.w, r.h, 8);
}

function cardHeader(r, cands, col) {
  noStroke();
  fill(col || 30);
  textStyle(BOLD);
  const w = fitText(cands, r.x + 10, r.y + 15, r.w - 20, layout.hs, LEFT);
  textStyle(NORMAL);
  return w;
}

// x[n] (and the reconstruction x_r[n] in inverse mode)
function drawSignalCard() {
  const r = layout.S, p = layout.Sp;
  drawCard(r);
  const ymax = signalYMax();
  const hw = cardHeader(r, ['Signal x[n]']);

  if (inverseMode) {
    drawLegend([{ kind: 'dot', col: COL_SIG, label: 'x[n]' }, { kind: 'ring', col: COL_SUM, label: 'Re x_{r}[n]' }],
               r.x + 10 + hw + 16, r.x + r.w - 10, r.y + 15);
  } else {
    noStroke();
    fill(90);
    fitText([N + ' samples, n = 0 … ' + (N - 1), N + ' samples', ''], r.x + r.w - 10, r.y + 15, r.w - hw - 40, layout.ls, RIGHT);
  }

  drawStemFrame(p, ymax);
  drawHighlightBand(p);
  const dot = N >= 32 ? 5 : 8;
  for (let n = 0; n < N; n++) drawStem(p, n, xs[n], ymax, COL_SIG, 0, dot, false);

  if (inverseMode) {
    for (let n = 0; n < N; n++) {
      const x = stemX(p, n), y = stemY(p, xrRe[n], ymax);
      noFill();
      stroke(COL_SUM[0], COL_SUM[1], COL_SUM[2]);
      strokeWeight(2);
      circle(x, y, N >= 32 ? 8 : 12);
    }
  }
}

// phasor real and imaginary parts, or (inverse mode) the reconstruction error
function drawPartsCard() {
  const r = layout.P, p = layout.Pp;
  drawCard(r);
  if (inverseMode) {
    const ro = 'max |e[n]| = ' + maxErr.toFixed(3);
    const roW = richWidth(ro, layout.ls);
    noStroke();
    fill(COL_ERR);
    textStyle(BOLD);
    fitText(['Error e[n] = x[n] − Re x_{r}[n]', 'Error e[n]'], r.x + 10, r.y + 15, r.w - 36 - roW, layout.hs, LEFT);
    textStyle(NORMAL);
    richText(ro, r.x + r.w - 10, r.y + 15, layout.ls, RIGHT);
    const ymax = signalYMax();
    drawStemFrame(p, ymax);
    drawHighlightBand(p);
    for (let n = 0; n < N; n++) drawStem(p, n, errs[n], ymax, COL_ERR, 0, N >= 32 ? 5 : 7, false);
    return;
  }
  const hw = cardHeader(r, ['Phasor parts', 'Parts']);
  const items = [{ kind: 'dot', col: COL_RE, label: 'cos(2πkn/N)' }, { kind: 'square', col: COL_IM, label: '−sin(2πkn/N)' }];
  const avail = r.w - 20 - hw - 14;
  if (legendWidth(items) > avail) {
    items[0].label = 'Real';
    items[1].label = 'Imag';
  }
  drawLegend(items, r.x + 10 + hw + 14, r.x + r.w - 10, r.y + 15);

  drawStemFrame(p, 1);
  drawHighlightBand(p);
  const cell = (p.x1 - p.x0) / N;
  const dot = N >= 32 ? 4 : 7;
  for (let n = 0; n < N; n++) {
    const th = binAngle(k, n);
    drawStem(p, n, clean(Math.cos(th)), 1, COL_RE, -0.2 * cell, dot, false);
    drawStem(p, n, clean(-Math.sin(th)), 1, COL_IM, 0.2 * cell, dot, true);
  }
}

// the phasor e^(-j 2 pi k n / N) on the unit circle, one point per sample
function drawCircleCard() {
  const r = layout.C;
  drawCard(r);
  cardHeader(r, ['Phasor e^{−j2πkn/N},  k = ' + k, 'Phasor e^{−j2πkn/N}', 'Phasor']);

  // angle advanced per sample
  const stepDeg = 360 * k / N;
  noStroke();
  fill(70);
  let cands;
  if (k === 0) {
    cands = ['k = 0: no rotation, every point is 1', 'no rotation (k = 0)', 'k = 0'];
  } else if (2 * k <= N) {
    cands = ['turns −' + fmtDeg(stepDeg) + ' per sample (clockwise)', '−' + fmtDeg(stepDeg) + ' per sample', '−' + fmtDeg(stepDeg) + '/n'];
  } else {
    cands = ['−' + fmtDeg(stepDeg) + ' per sample = +' + fmtDeg(360 - stepDeg) + ' (counter-clockwise)',
             '−' + fmtDeg(stepDeg) + ' = +' + fmtDeg(360 - stepDeg) + ' per sample', '+' + fmtDeg(360 - stepDeg) + '/n'];
  }
  fitText(cands, r.x + 10, r.y + 33, r.w - 20, layout.ls, LEFT);

  const cx = layout.circX, cy = layout.circY, R = layout.circR;
  // axes and the unit circle
  stroke(215);
  strokeWeight(1);
  line(cx - R - 8, cy, cx + R + 8, cy);
  line(cx, cy - R - 8, cx, cy + R + 8);
  noFill();
  stroke(175);
  strokeWeight(1.5);
  circle(cx, cy, 2 * R);

  const pos = n => {
    const a = binAngle(k, n);
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)];   // screen y grows downward: clockwise
  };

  // faint chords from sample n to sample n + 1
  stroke(COL_RE[0], COL_RE[1], COL_RE[2], 60);
  strokeWeight(1);
  for (let n = 0; n < N - 1; n++) {
    const [x1, y1] = pos(n), [x2, y2] = pos(n + 1);
    line(x1, y1, x2, y2);
  }

  // group the samples that land on the same point
  const groups = new Map();
  for (let n = 0; n < N; n++) {
    const q = ((k * n) % N + N) % N;
    if (!groups.has(q)) groups.set(q, []);
    groups.get(q).push(n);
  }
  const h = highlightIndex();
  const sparse = groups.size > 16;          // N = 32 with 32 distinct points: label every 4th
  textSize(layout.ls);
  for (const [q, list] of groups) {
    const a = 2 * Math.PI * q / N;
    const px = cx + R * Math.cos(a), py = cy + R * Math.sin(a);
    noStroke();
    fill(COL_RE[0], COL_RE[1], COL_RE[2]);
    circle(px, py, N >= 32 ? 6 : 8);

    const isHi = h >= 0 && list.includes(h);
    if (sparse && !isHi && list[0] % 4 !== 0) continue;
    let label = list.length <= 4 ? list.join(',') : list.slice(0, 2).join(',') + ',…';
    if (sparse && isHi) label = String(h);
    const c = Math.cos(a), s = Math.sin(a);
    const hAlign = c > 0.35 ? LEFT : (c < -0.35 ? RIGHT : CENTER);
    const vAlign = s > 0.35 ? TOP : (s < -0.35 ? BOTTOM : CENTER);
    const d = hAlign === CENTER ? 6 : 8;
    textAlign(hAlign, vAlign);
    if (isHi) {
      fill(COL_HI_TEXT[0], COL_HI_TEXT[1], COL_HI_TEXT[2]);
      textStyle(BOLD);
    } else {
      fill(60);
    }
    text(label, px + (R === 0 ? 0 : d * c), py + d * s);
    textStyle(NORMAL);
  }

  // highlighted sample: gold radius and point
  if (h >= 0 && h < N) {
    const [hx, hy] = pos(h);
    stroke(COL_HI[0], COL_HI[1], COL_HI[2]);
    strokeWeight(3);
    line(cx, cy, hx, hy);
    noStroke();
    fill(COL_HI[0], COL_HI[1], COL_HI[2]);
    circle(hx, hy, 14);
  }
  noStroke();
  fill(120);
  circle(cx, cy, 4);
}

// head-to-tail products and the running-sum arrow ending at X[k]
function drawChainCard() {
  const r = layout.H;
  drawCard(r);
  cardHeader(r, ['Running sum Σ x[n]·e^{−j2πkn/N}', 'Running sum → X[k]', 'Running sum']);

  const done = isComplete();
  const [sr, si] = partialSum();
  const mag = Math.hypot(sr, si);
  const h = highlightIndex();

  // verdict / progress line
  noStroke();
  textSize(layout.ls);
  if (bound === 0) {
    fill(90);
    fitText(['x[n] is zero, so every X[k] is 0', 'x[n] = 0'], r.x + 10, r.y + 33, r.w - 20, layout.ls, LEFT);
  } else if (!done) {
    fill(COL_HI_TEXT[0], COL_HI_TEXT[1], COL_HI_TEXT[2]);
    if (h >= 0) {
      const deg = (360 * ((k * h) % N)) / N;
      const val = fmt(xs[h], 2);
      const verb = playing ? 'adding' : 'added';
      fitText([verb + ' n = ' + h + ':  x[' + h + '] = ' + val + ' times e^{−j' + fmtDeg(deg) + '}',
               'n = ' + h + ':  ' + val + '·e^{−j' + fmtDeg(deg) + '}', verb + ' n = ' + h],
              r.x + 10, r.y + 33, r.w - 20, layout.ls, LEFT);
    } else {
      fitText(['press Step or Animate to add n = 0', 'next: n = 0'], r.x + 10, r.y + 33, r.w - 20, layout.ls, LEFT);
    }
  } else if (mag < 1e-6 * Math.max(1, bound)) {
    fill(80);
    fitText(['the products cancel:  X[' + k + '] = 0', 'products cancel', 'cancel'],
            r.x + 10, r.y + 33, r.w - 20, layout.ls, LEFT);
  } else {
    fill(COL_SUM[0], COL_SUM[1], COL_SUM[2]);
    fitText(['the products add up:  |X[' + k + ']| = ' + fmt(mag, 2), 'products add up', 'add up'],
            r.x + 10, r.y + 33, r.w - 20, layout.ls, LEFT);
  }

  const cx = layout.chainX, cy = layout.chainY, R = layout.chainR;
  const s = maxReach > 1e-9 ? R / maxReach : 0;
  const X = re => cx + re * s, Y = im => cy - im * s;

  // grid at nice values, axes and tick labels
  if (s > 0) {
    const sc = niceScale(maxReach);
    const nTick = Math.floor(R / (sc.step * s) + 1e-6);
    const every = sc.step * s >= 34 ? 1 : 2;
    stroke(238);
    strokeWeight(1);
    for (let i = -nTick; i <= nTick; i++) {
      if (i === 0) continue;
      const d = i * sc.step * s;
      line(cx + d, cy - R, cx + d, cy + R);
      line(cx - R, cy + d, cx + R, cy + d);
    }
    noStroke();
    fill(120);
    textSize(12);
    for (let i = -nTick; i <= nTick; i++) {
      if (i === 0 || i % every !== 0) continue;
      const d = i * sc.step * s;
      textAlign(CENTER, TOP);
      text(fmtTick(i * sc.step), cx + d, cy + 3);
      textAlign(RIGHT, CENTER);
      text(fmtTick(i * sc.step), cx - 3, cy - d);
    }
  }
  stroke(185);
  strokeWeight(1);
  line(cx - R - 6, cy, cx + R + 6, cy);
  line(cx, cy - R - 6, cx, cy + R + 6);
  // axis names in the plane's corners, which no running sum can reach (|S| <= R)
  noStroke();
  fill(100);
  textSize(13);
  textAlign(RIGHT, BOTTOM);
  text('Real →', cx + R + 4, cy + R + 4);
  textAlign(LEFT, TOP);
  text('↑ Imag', cx - R - 4, cy - R - 4);

  if (bound > 0) {
    // running-sum arrow from the origin (drawn first so the products stay visible on top)
    drawArrow(cx, cy, X(sr), Y(si), [COL_SUM[0], COL_SUM[1], COL_SUM[2], 210], 4);

    // completed products, head to tail
    const nFull = done ? N : animDone;
    stroke(COL_STEP[0], COL_STEP[1], COL_STEP[2]);
    strokeWeight(N >= 32 ? 1.5 : 2);
    for (let n = 0; n < nFull; n++) {
      if (n === h) continue;
      line(X(sumRe[n]), Y(sumIm[n]), X(sumRe[n + 1]), Y(sumIm[n + 1]));
    }
    noStroke();
    fill(COL_STEP[0], COL_STEP[1], COL_STEP[2]);
    for (let n = 1; n <= nFull; n++) circle(X(sumRe[n]), Y(sumIm[n]), N >= 32 ? 3.5 : 5);

    // the product being added (gold)
    if (h >= 0 && h < N) {
      const g = (h === animDone) ? growFrac() : 1;
      stroke(COL_HI[0], COL_HI[1], COL_HI[2]);
      strokeWeight(3.5);
      line(X(sumRe[h]), Y(sumIm[h]), X(sumRe[h] + g * stepRe[h]), Y(sumIm[h] + g * stepIm[h]));
    }

    // label beside the arrow tip, on the upper side of the arrow and pulled back toward the origin
    if (mag * s > 6) {
      const ang = Math.atan2(Y(si) - cy, X(sr) - cx);
      let px = Math.sin(ang), py = -Math.cos(ang);
      if (py > 0 || (Math.abs(py) < 0.2 && px < 0)) {
        px = -px;
        py = -py;
      }
      noStroke();
      fill(COL_SUM[0], COL_SUM[1], COL_SUM[2]);
      textStyle(BOLD);
      richText(done ? 'X[' + k + ']' : 'S', X(sr) - 16 * Math.cos(ang) + 15 * px, Y(si) - 16 * Math.sin(ang) + 15 * py, 15, CENTER);
      textStyle(NORMAL);
    }
  }
  noStroke();
  fill(80);
  circle(cx, cy, 4);

  // read-outs
  const yA = r.y + r.h - (layout.wide ? 30 : 12);
  const yB = r.y + r.h - 12;
  noStroke();
  if (done) {
    fill(COL_SUM[0], COL_SUM[1], COL_SUM[2]);
    textStyle(BOLD);
    fitText(['X[' + k + '] = ' + fmtC(sr, si), fmtC(sr, si)], r.x + 10, yA, r.w - 20, layout.wide ? 16 : 14, LEFT);
    textStyle(NORMAL);
    if (layout.wide) {
      fill(60);
      const ph = mag < 1e-9 ? 'undefined' : fmtDeg(phaseDeg(sr, si));
      fitText(['|X[' + k + ']| = ' + fmt(mag, 2) + ',   phase ∠X[' + k + '] = ' + ph,
               '|X[' + k + ']| = ' + fmt(mag, 2) + ',  ∠ ' + ph],
              r.x + 10, yB, r.w - 20, layout.ls, LEFT);
    }
  } else {
    fill(COL_SUM[0], COL_SUM[1], COL_SUM[2]);
    textStyle(BOLD);
    const nLast = animDone + (growFrac() > 0 ? 1 : 0) - 1;
    const range = nLast < 0 ? 'none yet' : (nLast === 0 ? 'n = 0' : 'n = 0…' + nLast);
    fitText(['Partial sum S (' + range + ') = ' + fmtC(sr, si), 'S = ' + fmtC(sr, si)],
            r.x + 10, yA, r.w - 20, layout.wide ? 16 : 14, LEFT);
    textStyle(NORMAL);
    if (layout.wide) {
      fill(60);
      fitText(['|S| = ' + fmt(mag, 2) + '   (final |X[' + k + ']| = ' + fmt(Math.hypot(sumRe[N], sumIm[N]), 2) + ')',
               '|S| = ' + fmt(mag, 2)], r.x + 10, yB, r.w - 20, layout.ls, LEFT);
    }
  }
}

// magnitude spectrum |X[k]|, bin k highlighted; clickable bars in inverse mode
function drawSpectrumCard() {
  const r = layout.F, p = layout.Fp;
  drawCard(r);
  const hw = cardHeader(r, ['Magnitude spectrum |X[k]|', 'Spectrum |X[k]|']);

  // header read-out
  noStroke();
  const avail = r.w - 20 - hw - 16;
  if (inverseMode) {
    fill(COL_SUM[0], COL_SUM[1], COL_SUM[2]);
    const pct = energyAll > 0 ? (100 * energyUsed / energyAll).toFixed(1) + '%' : '—';
    const cands = ['x_{r}[n] uses ' + nUsed + ' of ' + N + ' bins,  energy kept ' + pct,
                   nUsed + '/' + N + ' bins, energy ' + pct];
    if (!layout.wide) cands.splice(1, 0, nUsed + '/' + N + ' bins, ' + pct + ', max|e| ' + maxErr.toFixed(2));
    fitText(cands, r.x + r.w - 10, r.y + 15, avail, layout.ls, RIGHT);
  } else {
    fill(COL_HI_TEXT[0], COL_HI_TEXT[1], COL_HI_TEXT[2]);
    const m = Math.hypot(sumRe[N], sumIm[N]);
    fitText(['bin k = ' + k + ':  |X[' + k + ']| = ' + fmt(m, 2), '|X[' + k + ']| = ' + fmt(m, 2), ''],
            r.x + r.w - 10, r.y + 15, avail, layout.ls, RIGHT);
  }

  // y axis
  let maxMag = 0;
  for (let b = 0; b < N; b++) maxMag = Math.max(maxMag, Math.hypot(Xre[b], Xim[b]));
  const sc = niceScale(maxMag);
  const yOf = v => p.bot - (v / sc.top) * (p.bot - p.top);
  stroke(232);
  strokeWeight(1);
  for (let v = sc.step; v <= sc.top + 1e-9; v += sc.step) line(p.x0, yOf(v), p.x1, yOf(v));
  stroke(120);
  line(p.x0, p.bot, p.x1, p.bot);
  line(p.x0, p.top, p.x0, p.bot);
  noStroke();
  fill(80);
  textSize(13);
  textAlign(RIGHT, CENTER);
  for (let v = 0; v <= sc.top + 1e-9; v += sc.step) text(fmtTick(v), p.x0 - 5, yOf(v));

  const cell = (p.x1 - p.x0) / N;
  const bx = b => p.x0 + (b + 0.5) * cell;

  // highlighted bin k
  noStroke();
  fill(COL_HI[0], COL_HI[1], COL_HI[2], 70);
  rect(bx(k) - cell / 2, p.top - 6, cell, p.bot - p.top + 6);

  // N/2 divider: bins above it are the negative frequencies
  stroke(160);
  strokeWeight(1);
  drawingContext.setLineDash([3, 4]);
  line(p.x0 + (N / 2 + 1) * cell, p.top - 6, p.x0 + (N / 2 + 1) * cell, p.bot);
  drawingContext.setLineDash([]);

  // bars
  const bw = Math.max(2, cell * 0.62);
  const [sr, si] = partialSum();
  for (let b = 0; b < N; b++) {
    const final = Math.hypot(Xre[b], Xim[b]);
    const animating = (b === k && !isComplete());
    const shown = animating ? Math.hypot(sr, si) : final;
    const isUsed = !inverseMode || used[b];
    const top = yOf(Math.min(shown, sc.top));
    if (isUsed) {
      fill(COL_SUM[0], COL_SUM[1], COL_SUM[2]);
      noStroke();
    } else {
      fill(255);
      stroke(COL_SUM[0], COL_SUM[1], COL_SUM[2], 150);
      strokeWeight(1.5);
    }
    if (shown > 1e-9) rect(bx(b) - bw / 2, top, bw, p.bot - top);
    if (inverseMode && !isUsed && shown <= 1e-9) {
      stroke(COL_SUM[0], COL_SUM[1], COL_SUM[2], 150);
      strokeWeight(1.5);
      line(bx(b) - bw / 2, p.bot - 1, bx(b) + bw / 2, p.bot - 1);
    }
    if (animating && final > 1e-9) {            // where the bar will end
      noFill();
      stroke(COL_SUM[0], COL_SUM[1], COL_SUM[2]);
      strokeWeight(1);
      drawingContext.setLineDash([3, 3]);
      rect(bx(b) - bw / 2, yOf(Math.min(final, sc.top)), bw, p.bot - yOf(Math.min(final, sc.top)));
      drawingContext.setLineDash([]);
    }
    if (b === k) {                              // gold outline on the selected bin
      noFill();
      stroke(COL_HI[0], COL_HI[1], COL_HI[2]);
      strokeWeight(2.5);
      rect(bx(b) - bw / 2 - 2, Math.min(top, p.bot - 3) - 2, bw + 4, p.bot - Math.min(top, p.bot - 3) + 2);
    }
    // value labels
    if (shown > 1e-9 && (cell >= 30 || b === k)) {
      noStroke();
      fill(b === k ? COL_HI_TEXT : [70, 70, 70]);
      textSize(13);
      textAlign(CENTER, BOTTOM);
      text(fmtVal(shown), bx(b), top - (b === k ? 6 : 3));
    }
  }

  // bin labels
  noStroke();
  fill(70);
  textSize(13);
  const every = cell >= 22 ? 1 : (cell >= 11 ? 2 : 4);
  for (let b = 0; b < N; b++) {
    if (b % every !== 0 && b !== k) continue;
    if (b !== k && Math.abs(b - k) < every && every > 1) continue;
    textAlign(CENTER, TOP);
    if (b === k) {
      fill(COL_HI_TEXT[0], COL_HI_TEXT[1], COL_HI_TEXT[2]);
      textStyle(BOLD);
    } else {
      fill(70);
    }
    text(b, bx(b), p.bot + 4);
    textStyle(NORMAL);
  }
  fill(70);
  textAlign(RIGHT, TOP);
  text('bin k', p.x0 - 5, p.bot + 4);

  // hint or warning line
  const hy = r.y + r.h - 12;
  if (inverseMode && maxImag > 1e-6) {
    fill(COL_ERR);
    fitText(['x_{r}[n] is complex (max |Im| = ' + maxImag.toFixed(3) + '): also select the mirror bin N − k of each bin you keep',
             'x_{r}[n] is complex (max |Im| = ' + maxImag.toFixed(2) + '): keep bin N − k too',
             'complex x_{r}: keep bin N − k too'], r.x + 10, hy, r.w - 20, layout.ls, LEFT);
  } else if (inverseMode) {
    fill(90);
    fitText(['Click bars to remove or restore bins. Filled bars are used in x_{r}[n] = (1/N) Σ X[k]e^{+j2πkn/N}.',
             'Click bars to remove or restore bins (filled = used).', 'Click bars to toggle bins.'],
            r.x + 10, hy, r.w - 20, layout.ls, LEFT);
  } else {
    fill(90);
    fitText(['Click a bar to choose bin k. Bins right of the dashed line (k > N/2) are negative frequencies.',
             'Click a bar to choose k. Right of the dashed line: negative frequencies.',
             'Click a bar to choose k.'], r.x + 10, hy, r.w - 20, layout.ls, LEFT);
  }
}

function drawControlLabels() {
  noStroke();
  fill('black');
  textStyle(NORMAL);
  richText('Bin k = ' + k, 10, rowY(0), defaultTextSize, LEFT);
  for (let i = 0; i < 3; i++) {
    fill(COL_SIG);
    textStyle(BOLD);
    richText('x_{' + (i + 1) + '}', 10, rowY(i + 1), defaultTextSize, LEFT);
    textStyle(NORMAL);
    fill(amps[i] > 0 ? 0 : 120);
    richText('A_{' + (i + 1) + '} = ' + amps[i].toFixed(2), layout.ampLabelX, rowY(i + 1), layout.wide ? 16 : 15, LEFT);
  }
  fill('black');
  richText('N =', 10, rowY(4), defaultTextSize, LEFT);
}

// ---------------------------------------------------------------- plot helpers

function signalYMax() {
  return Math.max(1, Math.ceil(ampSum * 2 - 1e-9) / 2);
}

function stemX(p, n) {
  return p.x0 + (n + 0.5) * (p.x1 - p.x0) / N;
}

function stemY(p, v, ymax) {
  const mid = (p.top + p.bot) / 2;
  return mid - constrain(v / ymax, -1.08, 1.08) * (p.bot - p.top) / 2;
}

function drawStemFrame(p, ymax) {
  const mid = (p.top + p.bot) / 2;
  stroke(230);
  strokeWeight(1);
  line(p.x0, p.top, p.x1, p.top);
  line(p.x0, p.bot, p.x1, p.bot);
  stroke(120);
  line(p.x0, mid, p.x1, mid);
  line(p.x0, p.top, p.x0, p.bot);
  noStroke();
  fill(80);
  textSize(13);
  textAlign(RIGHT, CENTER);
  text(fmtTick(ymax), p.x0 - 5, p.top);
  text('0', p.x0 - 5, mid);
  text(fmtTick(-ymax), p.x0 - 5, p.bot);

  const cell = (p.x1 - p.x0) / N;
  const every = cell >= 22 ? 1 : (cell >= 11 ? 2 : 4);
  textAlign(CENTER, TOP);
  for (let n = 0; n < N; n += every) {
    const x = stemX(p, n);
    if (x + 8 > p.x1 - 8) continue;
    text(n, x, p.bot + 5);
  }
  textAlign(RIGHT, TOP);
  text('n', p.x1, p.bot + 5);
}

function drawHighlightBand(p) {
  const h = highlightIndex();
  if (h < 0 || h >= N) return;
  const cell = (p.x1 - p.x0) / N;
  noStroke();
  fill(COL_HI[0], COL_HI[1], COL_HI[2], 80);
  rect(stemX(p, h) - cell / 2, p.top, cell, p.bot - p.top);
}

function drawStem(p, n, v, ymax, col, dx, dot, square) {
  const x = stemX(p, n) + dx, y0 = (p.top + p.bot) / 2, y = stemY(p, v, ymax);
  stroke(col[0], col[1], col[2]);
  strokeWeight(N >= 32 ? 1.5 : 2);
  if (v !== 0) line(x, y0, x, y);
  noStroke();
  fill(col[0], col[1], col[2]);
  if (square) {
    rectMode(CENTER);
    rect(x, y, dot, dot);
    rectMode(CORNER);
  } else {
    circle(x, y, dot);
  }
}

function drawArrow(x0, y0, x1, y1, col, w) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 1) return;
  const a = Math.atan2(y1 - y0, x1 - x0);
  const head = Math.min(14, len * 0.5);
  const alpha = col.length > 3 ? col[3] : 255;
  stroke(col[0], col[1], col[2], alpha);
  strokeWeight(w);
  line(x0, y0, x1 - 0.6 * head * Math.cos(a), y1 - 0.6 * head * Math.sin(a));
  noStroke();
  fill(col[0], col[1], col[2], alpha);
  triangle(x1, y1,
           x1 - head * Math.cos(a - 0.4), y1 - head * Math.sin(a - 0.4),
           x1 - head * Math.cos(a + 0.4), y1 - head * Math.sin(a + 0.4));
}

function legendWidth(items) {
  textSize(layout.ls);
  return items.reduce((w, it) => w + 16 + richWidth(it.label, layout.ls) + 14, -14);
}

// legend drawn right-aligned at xRight, but never left of xLeft
function drawLegend(items, xLeft, xRight, y) {
  const w = legendWidth(items);
  if (w > xRight - xLeft) return;
  let x = xRight - w;
  for (const it of items) {
    const c = it.col;
    if (it.kind === 'dot') {
      noStroke();
      fill(c[0], c[1], c[2]);
      circle(x + 5, y, 9);
    } else if (it.kind === 'square') {
      noStroke();
      fill(c[0], c[1], c[2]);
      rectMode(CENTER);
      rect(x + 5, y, 8, 8);
      rectMode(CORNER);
    } else {
      noFill();
      stroke(c[0], c[1], c[2]);
      strokeWeight(2);
      circle(x + 5, y, 10);
    }
    noStroke();
    fill(c[0], c[1], c[2]);
    const tw = richText(it.label, x + 16, y, layout.ls, LEFT);
    x += 16 + tw + 14;
  }
}

function niceScale(maxV) {
  if (!(maxV > 1e-9)) return { top: 1, step: 0.25 };
  const raw = maxV / 4;
  const p10 = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p10;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p10;
  return { top: Math.ceil(maxV / step - 1e-9) * step, step };
}

// ---------------------------------------------------------------- mouse

function mousePressed() {
  const p = layout.Fp;
  if (!p || mouseY > drawHeight || mouseX < p.x0 || mouseX > p.x1) return;
  if (mouseY < p.top - 24 || mouseY > p.bot + 20) return;
  const b = Math.floor((mouseX - p.x0) / ((p.x1 - p.x0) / N));
  if (b < 0 || b >= N) return;
  if (inverseMode) {
    used[b] = !used[b];
  } else {
    kSlider.value(b);
    k = b;
  }
}

// ---------------------------------------------------------------- text helpers

// Rich text: "^{...}" is drawn as a superscript and "_{...}" as a subscript
function parseRich(s) {
  const out = [];
  let buf = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if ((ch === '^' || ch === '_') && s[i + 1] === '{') {
      const end = s.indexOf('}', i + 2);
      if (end > 0) {
        if (buf) {
          out.push({ t: buf, mode: 0 });
          buf = '';
        }
        out.push({ t: s.slice(i + 2, end), mode: ch === '^' ? 1 : -1 });
        i = end + 1;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  if (buf) out.push({ t: buf, mode: 0 });
  return out;
}

// advance width: in p5 2.x textWidth() measures tight bounds and ignores spaces,
// so runs of text placed side by side must use fontWidth()
function advW(s) {
  return typeof fontWidth === 'function' ? fontWidth(s) : textWidth(s);
}

function richWidth(s, sz) {
  let w = 0;
  for (const part of parseRich(s)) {
    textSize(part.mode === 0 ? sz : sz * 0.72);
    w += advW(part.t);
  }
  textSize(sz);
  return w;
}

// y is the vertical centre of the line
function richText(s, x, y, sz, align) {
  const w = richWidth(s, sz);
  let cx = align === CENTER ? x - w / 2 : (align === RIGHT ? x - w : x);
  textAlign(LEFT, CENTER);
  for (const part of parseRich(s)) {
    textSize(part.mode === 0 ? sz : sz * 0.72);
    const dy = part.mode === 1 ? -sz * 0.36 : (part.mode === -1 ? sz * 0.3 : 0);
    text(part.t, cx, y + dy);
    cx += advW(part.t);
  }
  textSize(sz);
  return w;
}

// draw the first candidate that fits in maxW (the last one otherwise); returns its width
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

function fmtVal(v) {
  return Math.abs(v) >= 10 ? fmt(v, 1) : fmt(v, 2);
}

function fmtTick(v) {
  const r = Math.round(v * 100) / 100;
  return (r < 0 ? '−' : '') + String(Math.abs(r));
}

function fmtC(re, im) {
  const i = Number(im.toFixed(2));
  return fmt(re, 2) + (i < 0 ? ' − j' : ' + j') + Math.abs(i).toFixed(2);
}

function fmtDeg(d) {
  return fmt(d, 1) + '°';
}

function phaseDeg(re, im) {
  let d = Math.atan2(clean(im), clean(re)) * 180 / Math.PI;
  if (d <= -179.95) d = 180;
  return d;
}

// ---------------------------------------------------------------- responsive layout

function computeLayout() {
  const W = canvasWidth;
  const wide = W >= 600;
  layout.wide = wide;
  layout.hs = wide ? 15 : 14;        // card header text size
  layout.ls = wide ? 14 : 13;        // read-out and legend text size
  if (wide) {
    const cA = Math.round(W * 0.34), cB = Math.round(W * 0.31);
    layout.S = { x: 8, y: 54, w: cA - 12, h: 142 };
    layout.P = { x: 8, y: 202, w: cA - 12, h: 144 };
    layout.C = { x: cA + 2, y: 54, w: cB - 6, h: 292 };
    layout.H = { x: cA + cB + 2, y: 54, w: W - 10 - (cA + cB), h: 292 };
    layout.F = { x: 8, y: 352, w: W - 16, h: 210 };
  } else {
    const cw = Math.floor((W - 18) * 0.53);
    layout.S = { x: 6, y: 52, w: W - 12, h: 118 };
    layout.P = null;
    layout.C = { x: 6, y: 176, w: cw, h: 222 };
    layout.H = { x: 12 + cw, y: 176, w: W - 18 - cw, h: 222 };
    layout.F = { x: 6, y: 404, w: W - 12, h: 158 };
  }
  const plotRect = r => ({ x0: r.x + 44, x1: r.x + r.w - 12, top: r.y + 34, bot: r.y + r.h - 26 });
  layout.Sp = plotRect(layout.S);
  layout.Pp = layout.P ? plotRect(layout.P) : null;

  // unit circle: leave room for the n labels around it
  const C = layout.C, padX = wide ? 36 : 34, padY = 20;
  const cTop = C.y + 44, cBot = C.y + C.h - 6;
  layout.circR = Math.max(30, Math.min((C.w - 2 * padX) / 2, (cBot - cTop - 2 * padY) / 2));
  layout.circX = C.x + C.w / 2;
  layout.circY = (cTop + cBot) / 2;

  // running-sum plane: header above, read-out lines below
  const H = layout.H, nLines = wide ? 2 : 1;
  const hTop = H.y + 44, hBot = H.y + H.h - 6 - 19 * nLines;
  layout.chainR = Math.max(30, Math.min((H.w - 30) / 2, (hBot - hTop - 18) / 2));
  layout.chainX = H.x + H.w / 2;
  layout.chainY = (hTop + hBot) / 2;

  // spectrum plot
  const F = layout.F;
  layout.Fp = { x0: F.x + 50, x1: F.x + F.w - 12, top: F.y + (wide ? 48 : 40), bot: F.y + F.h - 44 };
}

function layoutControls() {
  if (typeof inverseCheckbox === 'undefined') return;
  const W = canvasWidth;
  const narrow = W < 600;

  kSlider.position(sliderLeftMargin, rowY(0) - 10);
  kSlider.size(Math.max(60, W - sliderLeftMargin - margin));

  const selX = 36, selW = narrow ? 102 : 118;
  layout.ampLabelX = selX + selW + 10;
  const ampLeft = layout.ampLabelX + (narrow ? 76 : 86);
  [comp1Select, comp2Select, comp3Select].forEach((s, i) => {
    s.style('width', selW + 'px');
    s.style('font-size', narrow ? '14px' : '15px');
    s.position(selX, rowY(i + 1) - 11);
  });
  [amp1Slider, amp2Slider, amp3Slider].forEach((s, i) => {
    s.position(ampLeft, rowY(i + 1) - 10);
    s.size(Math.max(60, W - ampLeft - margin));
  });

  let x = 46;
  nSelect.position(x, rowY(4) - 11);
  x += nSelect.elt.offsetWidth + (narrow ? 10 : 16);
  animateButton.position(x, rowY(4) - 12);
  x += animateButton.elt.offsetWidth + 8;
  stepButton.position(x, rowY(4) - 12);
  x += stepButton.elt.offsetWidth + (narrow ? 10 : 18);
  inverseCheckbox.position(x, rowY(4) - 11);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  if (canvasWidth !== layoutWidth) {
    layoutWidth = canvasWidth;
    computeLayout();
    layoutControls();
  }
}
