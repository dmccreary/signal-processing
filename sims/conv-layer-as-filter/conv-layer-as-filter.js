// A Convolutional Layer Is a Learned FIR Filter MicroSim
// CANVAS_HEIGHT: 700
// Trains a tiny 1-D convolutional network in the browser with hand-written gradient descent:
// F kernels of K taps -> ReLU -> global max-pool -> logistic output. The task is to tell noisy
// 64-sample segments of a low tone (0.08 cycles/sample) from a high tone (0.30 cycles/sample).
// The plots show each learned kernel as stems, its frequency response |H(f)|, the loss and
// accuracy curves, and four test segments with the network's predictions.
// p5.js 2.3.2, no audio, no machine-learning library. All random numbers are seeded.

// ---------- Canvas and layout ----------
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let drawHeight = 580;
let controlHeight = 120;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let defaultTextSize = 16;
let wideLayout = true;
let layoutWidth = -1;
let boxes = {};                      // plot rectangles, recomputed when the width changes

// ---------- Task, model and training constants ----------
const SEG_LEN = 64;                  // samples per segment
const F_LOW = 0.08;                  // class 0 tone, cycles/sample
const F_HIGH = 0.30;                 // class 1 tone, cycles/sample
const N_TRAIN = 256;                 // training segments (128 per class)
const N_TEST = 256;                  // held-out test segments (128 per class)
const BATCH = 16;                    // segments per gradient step (8 per class)
const MAX_STEPS = 400;               // a run stops here (25 passes over the training set)
const STEPS_PER_SECOND = 60;         // animation speed: a full run takes about 7 s
const LEARNING_RATES = [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3];
const INIT_STD = 0.5;                // kernel taps start as N(0, INIT_STD^2 / K)
const V_INIT = 0.5;                  // output weights start at +0.5, -0.5, +0.5
const EXAMPLES = [0, 1, 2, 3];       // test segments shown with predictions (low, high, low, high)
const DEFAULTS = { noise: 1.0, lrIndex: 4, K: 12, F: 2 };

// Colours: signal blue, kernels maroon / green / purple, loss red, class tones gold
const FILTER_COLORS = ['#8b1c3c', '#2a8a3a', '#6a3d9a'];
const SIGNAL_COLOR = '#1f5fbf';
const LOSS_COLOR = '#c00000';
const ACC_COLOR = '#1f5fbf';
const TONE_COLOR = '#b8860b';        // darkgoldenrod
const WARN_COLOR = '#c00000';

// ---------- Seeded random numbers ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller: each pair of uniforms gives two standard normal numbers
function gaussFactory(rng) {
  let spare = null;
  return function () {
    if (spare !== null) { const s = spare; spare = null; return s; }
    const u1 = Math.max(rng(), 1e-12);
    const u2 = rng();
    const r = Math.sqrt(-2 * Math.log(u1));
    spare = r * Math.sin(2 * Math.PI * u2);
    return r * Math.cos(2 * Math.PI * u2);
  };
}

// ---------- Synthetic data set ----------
// Segment i has label y = i mod 2 (0 = low tone, 1 = high tone), a random phase and unit-variance
// white noise. The noise slider only rescales the stored noise, so every noise level uses the same
// random draws.
function makeSegments(seed, count) {
  const rng = mulberry32(seed);
  const gauss = gaussFactory(rng);
  const set = [];
  for (let i = 0; i < count; i++) {
    const y = i % 2;
    const f = y === 1 ? F_HIGH : F_LOW;
    const phase = 2 * Math.PI * rng();
    const tone = new Float64Array(SEG_LEN);
    const noise = new Float64Array(SEG_LEN);
    for (let n = 0; n < SEG_LEN; n++) {
      tone[n] = Math.sin(2 * Math.PI * f * n + phase);
      noise[n] = gauss();
    }
    set.push({ y, tone, noise, x: new Float64Array(SEG_LEN) });
  }
  return set;
}

function makeDataSets(dataSeed) {
  return {
    seed: dataSeed,
    train: makeSegments(7919 * dataSeed + 11, N_TRAIN),
    test: makeSegments(7919 * dataSeed + 104729, N_TEST),
    noise: null
  };
}

function applyNoise(sets, sigma) {
  for (const set of [sets.train, sets.test]) {
    for (const e of set) {
      for (let n = 0; n < SEG_LEN; n++) e.x[n] = e.tone[n] + sigma * e.noise[n];
    }
  }
  sets.noise = sigma;
}

// ---------- The network ----------
// z_f[n] = sum_k w_f[k] x[n + k] + b_f,  a_f = max_n ReLU(z_f[n]),  p(high) = sigmoid(sum_f v_f a_f + c)
function createNetwork(K, F) {
  const model = { K, F, w: [], b: new Float64Array(F), v: new Float64Array(F), c: 0 };
  for (let f = 0; f < F; f++) {
    // each filter has its own seed, so filter 1 starts the same whatever F is
    const gauss = gaussFactory(mulberry32(5000 + 7919 * f + 31 * K));
    const w = new Float64Array(K);
    for (let k = 0; k < K; k++) w[k] = INIT_STD / Math.sqrt(K) * gauss();
    model.w.push(w);
    model.v[f] = (f % 2 === 0 ? 1 : -1) * V_INIT;
  }
  return model;
}

function newForwardResult(F) {
  return { act: new Float64Array(F), pos: new Int32Array(F), logit: 0, p: 0.5 };
}

function forwardSegment(model, x, out) {
  const K = model.K;
  const L = SEG_LEN - K + 1;                 // "valid" positions n = 0 .. 64 - K
  let s = model.c;
  for (let f = 0; f < model.F; f++) {
    const w = model.w[f];
    const b = model.b[f];
    let best = -Infinity, bestPos = 0;
    for (let n = 0; n < L; n++) {
      let z = b;
      for (let k = 0; k < K; k++) z += w[k] * x[n + k];
      if (z > best) { best = z; bestPos = n; }
    }
    const a = best > 0 ? best : 0;           // ReLU then global max-pool = ReLU of the maximum
    out.act[f] = a;
    out.pos[f] = bestPos;
    s += model.v[f] * a;
  }
  out.logit = s;
  out.p = 1 / (1 + Math.exp(-s));
  return out;
}

// binary cross-entropy of the logit s for label y, computed without overflow
function crossEntropy(s, y) {
  return Math.max(s, 0) - y * s + Math.log1p(Math.exp(-Math.abs(s)));
}

// One step of plain (mini-batch) gradient descent; batch b uses training segments 16b .. 16b + 15
function trainStep(model, train, step, lr) {
  const K = model.K, F = model.F;
  const gw = model.w.map(() => new Float64Array(K));
  const gb = new Float64Array(F), gv = new Float64Array(F);
  let gc = 0, loss = 0;
  const out = newForwardResult(F);
  for (let i = 0; i < BATCH; i++) {
    const e = train[(step * BATCH + i) % train.length];
    forwardSegment(model, e.x, out);
    loss += crossEntropy(out.logit, e.y);
    const d = out.p - e.y;                   // dLoss/dlogit
    gc += d;
    for (let f = 0; f < F; f++) {
      gv[f] += d * out.act[f];
      if (out.act[f] > 0) {                  // gradient flows only through the winning position
        const da = d * model.v[f];
        const n0 = out.pos[f];
        gb[f] += da;
        for (let k = 0; k < K; k++) gw[f][k] += da * e.x[n0 + k];
      }
    }
  }
  const scale = lr / BATCH;
  for (let f = 0; f < F; f++) {
    for (let k = 0; k < K; k++) model.w[f][k] -= scale * gw[f][k];
    model.b[f] -= scale * gb[f];
    model.v[f] -= scale * gv[f];
  }
  model.c -= scale * gc;
  return loss / BATCH;
}

function evaluateSet(model, set) {
  const out = newForwardResult(model.F);
  let loss = 0, right = 0;
  for (const e of set) {
    forwardSegment(model, e.x, out);
    loss += crossEntropy(out.logit, e.y);
    if ((out.p >= 0.5 ? 1 : 0) === e.y) right++;
  }
  return { loss: loss / set.length, acc: right / set.length };
}

function modelIsFinite(model) {
  const ok = v => Number.isFinite(v) && Math.abs(v) < 1e6;
  if (!ok(model.c)) return false;
  for (let f = 0; f < model.F; f++) {
    if (!ok(model.b[f]) || !ok(model.v[f])) return false;
    for (let k = 0; k < model.K; k++) if (!ok(model.w[f][k])) return false;
  }
  return true;
}

// ---------- Frequency response of a kernel: |H(f)| = |sum_k w[k] e^{-j 2 pi f k}| ----------
function kernelGain(w, f) {
  let re = 0, im = 0;
  for (let k = 0; k < w.length; k++) {
    re += w[k] * Math.cos(2 * Math.PI * f * k);
    im -= w[k] * Math.sin(2 * Math.PI * f * k);
  }
  return Math.sqrt(re * re + im * im);
}

// frequency of the largest |H(f)| on a 0.001 cycles/sample grid from 0 to 0.5
function peakFrequency(w) {
  let bestF = 0, best = -1;
  for (let i = 0; i <= 500; i++) {
    const g = kernelGain(w, i / 1000);
    if (g > best) { best = g; bestF = i / 1000; }
  }
  return bestF;
}

function toneRatioDb(w) {
  return 20 * Math.log10(Math.max(kernelGain(w, F_HIGH), 1e-12) / Math.max(kernelGain(w, F_LOW), 1e-12));
}

// ---------- A training run: model + history, advanced a few steps per frame ----------
function createRun(p, sets) {
  const run = {
    p, sets, model: createNetwork(p.K, p.F), step: 0, done: false, diverged: false,
    lr: LEARNING_RATES[p.lrIndex],
    trainLoss: new Float64Array(MAX_STEPS + 1), testLoss: new Float64Array(MAX_STEPS + 1),
    trainAcc: new Float64Array(MAX_STEPS + 1), testAcc: new Float64Array(MAX_STEPS + 1)
  };
  recordHistory(run);
  return run;
}

function recordHistory(run) {
  const tr = evaluateSet(run.model, run.sets.train);
  const te = evaluateSet(run.model, run.sets.test);
  run.trainLoss[run.step] = tr.loss;
  run.trainAcc[run.step] = tr.acc;
  run.testLoss[run.step] = te.loss;
  run.testAcc[run.step] = te.acc;
}

function advanceRun(run, count) {
  for (let i = 0; i < count && !run.done && !run.diverged; i++) {
    trainStep(run.model, run.sets.train, run.step, run.lr);
    run.step++;
    if (!modelIsFinite(run.model)) {
      run.diverged = true;
      run.trainLoss[run.step] = NaN; run.testLoss[run.step] = NaN;
      run.trainAcc[run.step] = NaN; run.testAcc[run.step] = NaN;
      break;
    }
    recordHistory(run);
    if (run.step >= MAX_STEPS) run.done = true;
  }
}

// first step at which the test accuracy reaches the target (null if never)
function firstStepAtAccuracy(run, target) {
  for (let s = 0; s <= run.step; s++) if (run.testAcc[s] >= target) return s;
  return null;
}

// ---------- p5 state ----------
let sets = null;
let run = null;
let dataSeed = 1;
let currentKey = '';
let running = false;                // MicroSims open paused; the learner presses Run
let shownRunLabel = '';
let noiseSlider, lrSlider, kernelSlider, filterSlider;
let runButton, stepButton, resetButton, dataButton;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);
  createControls();
  layoutControls(true);
  readControls();
  describe('A tiny one-dimensional convolutional network learns to tell a low tone at 0.08 cycles per sample from a high tone at 0.30 cycles per sample in noise. Stem plots show each learned kernel, a second plot shows each kernel frequency response with gold markers at the two tone frequencies, two plots show the loss and accuracy during training, and four test segments are drawn with the predicted class. Buttons run, step, reset and draw new data; sliders set the noise level, learning rate, kernel size and number of filters.');
}

function draw() {
  updateCanvasSize();
  readControls();
  if (running && !run.done && !run.diverged) {
    const count = Math.max(1, Math.min(4, Math.round(STEPS_PER_SECOND * Math.min(deltaTime, 100) / 1000)));
    advanceRun(run, count);
    if (run.done || run.diverged) running = false;
  }
  const label = running ? 'Pause' : 'Run';
  if (label !== shownRunLabel) { runButton.html(label); shownRunLabel = label; }

  drawRegions();
  drawTitle();
  drawKernels(boxes.kern);
  drawResponse(boxes.freq);
  drawFilterTable(boxes.table);
  drawLoss(boxes.loss);
  drawAccuracy(boxes.acc);
  drawExamples(boxes.ex);
  drawControlLabels();
}

// ---------- Controls ----------
function createControls() {
  runButton = createButton('Run');
  runButton.mousePressed(toggleRun);
  stepButton = createButton('Step');
  stepButton.mousePressed(stepOnce);
  resetButton = createButton('Reset');
  resetButton.mousePressed(resetWeights);
  dataButton = createButton('New data');
  dataButton.mousePressed(newData);

  noiseSlider = createSlider(0, 2, DEFAULTS.noise, 0.05);
  lrSlider = createSlider(0, LEARNING_RATES.length - 1, DEFAULTS.lrIndex, 1);
  kernelSlider = createSlider(5, 16, DEFAULTS.K, 1);
  filterSlider = createSlider(1, 3, DEFAULTS.F, 1);
}

function rowY(i) { return drawHeight + 10 + i * 36; }

function layoutControls(force) {
  if (typeof noiseSlider === 'undefined') return;
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  wideLayout = canvasWidth >= 640;
  computeBoxes();
  const fs = wideLayout ? '14px' : '13px';
  [runButton, stepButton, resetButton, dataButton].forEach(el => el.style('font-size', fs));
  if (wideLayout) {
    runButton.position(10, rowY(0)); runButton.style('width', '70px');
    stepButton.position(88, rowY(0)); stepButton.style('width', '60px');
    resetButton.position(156, rowY(0)); resetButton.style('width', '64px');
    dataButton.position(228, rowY(0)); dataButton.style('width', '90px');
  } else {
    runButton.position(6, rowY(0)); runButton.style('width', '58px');
    stepButton.position(70, rowY(0)); stepButton.style('width', '52px');
    resetButton.position(128, rowY(0)); resetButton.style('width', '56px');
    dataButton.position(190, rowY(0)); dataButton.style('width', '80px');
  }
  // sliders: two rows, two columns
  const pad = wideLayout ? 10 : 6;
  const labelW = wideLayout ? 160 : 58;
  const colW = (canvasWidth - 2 * pad) / 2;
  const grid = [[noiseSlider, lrSlider], [kernelSlider, filterSlider]];
  grid.forEach((row, i) => row.forEach((s, c) => {
    s.position(pad + c * colW + labelW, rowY(i + 1) + 2);
    s.size(Math.max(50, colW - labelW - (wideLayout ? 18 : 8)));
  }));
}

function currentParams() {
  return {
    noise: Number(noiseSlider.value()),
    lrIndex: Number(lrSlider.value()),
    K: Number(kernelSlider.value()),
    F: Number(filterSlider.value())
  };
}

// Any change of a slider (or new data) restarts training from the same initial weights
function readControls() {
  const p = currentParams();
  const key = JSON.stringify(p) + '|' + dataSeed;
  if (key === currentKey) return;
  currentKey = key;
  if (!sets || sets.seed !== dataSeed) sets = makeDataSets(dataSeed);
  if (sets.noise !== p.noise) applyNoise(sets, p.noise);
  const firstRun = (run === null);
  run = createRun(p, sets);
  running = !firstRun;               // the first load stays paused; a later slider change restarts and runs
}

function toggleRun() {
  if (run.done || run.diverged) { run = createRun(run.p, sets); running = true; return; }
  running = !running;
}

function stepOnce() {
  running = false;
  advanceRun(run, 1);
}

function resetWeights() {
  run = createRun(run.p, sets);
  running = false;
}

function newData() {
  dataSeed++;
}

function drawControlLabels() {
  const p = run.p;
  const pad = wideLayout ? 10 : 6;
  const colW = (canvasWidth - 2 * pad) / 2;
  noStroke();
  textStyle(NORMAL);
  textAlign(LEFT, CENTER);
  textSize(wideLayout ? 16 : 14);
  fill('black');
  const lr = LEARNING_RATES[p.lrIndex];
  const labels = wideLayout
    ? [['Noise σ: ' + p.noise.toFixed(2), 'Learning rate η: ' + lr],
       ['Kernel size K: ' + p.K, 'Filters F: ' + p.F]]
    : [['σ ' + p.noise.toFixed(2), 'η ' + lr], ['K ' + p.K, 'F ' + p.F]];
  for (let i = 0; i < 2; i++) {
    for (let c = 0; c < 2; c++) {
      fill(i === 0 && c === 1 && run.diverged ? WARN_COLOR : 'black');
      text(labels[i][c], pad + c * colW, rowY(i + 1) + 11);
    }
  }
  if (wideLayout) {
    fill(60);
    textSize(15);
    text(statusText(true), 334, rowY(0) + 11);
  } else {
    fill(60);
    textSize(13);
    text('data ' + dataSeed, 280, rowY(0) + 11);
  }
}

function statusText(longForm) {
  const st = run.diverged ? 'diverged' : (run.done ? 'done' : (running ? 'training' : 'paused'));
  if (longForm) return 'step ' + run.step + ' of ' + MAX_STEPS + ' (' + st + ')   data set ' + dataSeed;
  return 'step ' + run.step + '/' + MAX_STEPS;
}

// ---------- Layout of the drawing region ----------
function computeBoxes() {
  const W = canvasWidth;
  if (W >= 640) {
    const split = Math.round(W * 0.42);
    boxes = {
      kern: { x0: 52, x1: split, y0: 80, y1: 208 },
      freq: { x0: split + 64, x1: W - margin, y0: 80, y1: 208 },
      table: { x0: margin, x1: W - margin, y0: 256 },
      loss: { x0: 52, x1: Math.round(W / 2) - 24, y0: 356, y1: 428 },
      acc: { x0: Math.round(W / 2) + 52, x1: W - margin, y0: 356, y1: 428 },
      ex: { x0: margin, x1: W - margin, y0: 512, y1: 552 }
    };
  } else {
    boxes = {
      kern: { x0: 40, x1: W - 10, y0: 62, y1: 142 },
      freq: { x0: 40, x1: W - 10, y0: 184, y1: 268 },
      table: { x0: 8, x1: W - 8, y0: 324 },
      loss: { x0: 40, x1: Math.round(W / 2) - 8, y0: 392, y1: 446 },
      acc: { x0: Math.round(W / 2) + 36, x1: W - 10, y0: 392, y1: 446 },
      ex: { x0: 8, x1: W - 8, y0: 506, y1: 546 }
    };
  }
}

function drawRegions() {
  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
}

function drawTitle() {
  noStroke();
  fill('black');
  textStyle(NORMAL);
  if (wideLayout) {
    textSize(20);
    textAlign(CENTER, TOP);
    text('A Convolutional Layer Is a Learned FIR Filter', canvasWidth / 2, 8);
    textSize(14);
    fill(60);
    fitText(['Is a noisy 64-sample segment a low tone (f = 0.08 cycles/sample) or a high tone (f = 0.30)?   x[n] → F kernels of K taps → ReLU → global max-pool → logistic → p(high)',
             'Low tone (0.08 cycles/sample) or high tone (0.30)?   x[n] → conv → ReLU → max-pool → logistic',
             'Low tone (0.08) or high tone (0.30 cycles/sample)?'], canvasWidth / 2, 40, canvasWidth - 20, CENTER);
  } else {
    textSize(17);
    textAlign(LEFT, TOP);
    text('Conv Layer = Learned FIR Filter', 8, 6);
    textSize(12);
    fill(60);
    text('low tone 0.08 vs high tone 0.30 cycles/sample', 8, 28);
    textAlign(RIGHT, TOP);
    text(statusText(false), canvasWidth - 8, 28);
  }
}

// ---------- Plot helpers ----------
function mapX(box, v, lo, hi) { return box.x0 + (v - lo) / (hi - lo) * (box.x1 - box.x0); }
function mapY(box, v, lo, hi) { return box.y1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo) * (box.y1 - box.y0); }

// smallest "nice" number >= v (1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8 times a power of ten)
function niceCeil(v) {
  if (!(v > 0) || !Number.isFinite(v)) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * e >= v * (1 - 1e-9)) return m * e;
  return 10 * e;
}

function fmtTick(v) {
  if (v === 0) return '0';
  const a = Math.abs(v);
  const s = a >= 10 ? a.toFixed(0) : a >= 1 ? String(Number(a.toFixed(1))) : String(Number(a.toPrecision(2)));
  return (v < 0 ? '−' : '') + s;
}

function fmtSigned(v, d) {
  if (!Number.isFinite(v)) return '—';
  const r = Number(v.toFixed(d));
  return (r < 0 ? '−' : '+') + Math.abs(r).toFixed(d);
}

function fmtPct(v) { return Number.isFinite(v) ? (100 * v).toFixed(1) + '%' : '—'; }
function fmtNum(v, d) { return Number.isFinite(v) ? v.toFixed(d) : '—'; }

// advance width: in p5 2.x textWidth() ignores spaces, so use fontWidth() when it exists
function advW(s) { return typeof fontWidth === 'function' ? fontWidth(s) : textWidth(s); }

// draw the first candidate that fits in maxW (the last one otherwise); text size must already be set
function fitText(cands, x, y, maxW, align) {
  let pick = cands[cands.length - 1];
  for (const c of cands) { if (advW(c) <= maxW) { pick = c; break; } }
  textAlign(align, TOP);
  text(pick, x, y);
}

// bold panel title; txt may be a list of candidates, longest first (the first that fits maxW is drawn)
function panelLabel(txt, x, y, maxW) {
  noStroke();
  fill('black');
  textStyle(BOLD);
  textSize(wideLayout ? 15 : 13);
  textAlign(LEFT, CENTER);
  const cands = Array.isArray(txt) ? txt : [txt];
  let pick = cands[cands.length - 1];
  for (const c of cands) { if (!maxW || advW(c) <= maxW) { pick = c; break; } }
  text(pick, x, y);
  textStyle(NORMAL);
}

function rotatedLabel(txt, x, yc) {
  push();
  translate(x, yc);
  rotate(-HALF_PI);
  noStroke();
  fill('black');
  textSize(wideLayout ? 13 : 11);
  textAlign(CENTER, CENTER);
  text(txt, 0, 0);
  pop();
}

// White plot area, grid lines and tick labels
function drawFrame(box, xs, xlo, xhi, ys, ylo, yhi, xfmt, yfmt) {
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
  stroke(228);
  for (const v of ys) { const y = mapY(box, v, ylo, yhi); line(box.x0, y, box.x1, y); }
  for (const v of xs) { const x = mapX(box, v, xlo, xhi); line(x, box.y0, x, box.y1); }
  noStroke();
  fill(70);
  textSize(wideLayout ? 12 : 11);
  textAlign(RIGHT, CENTER);
  for (const v of ys) text(yfmt(v), box.x0 - 5, mapY(box, v, ylo, yhi));
  if (xfmt) {
    textAlign(CENTER, TOP);
    for (const v of xs) text(xfmt(v), mapX(box, v, xlo, xhi), box.y1 + 3);
  }
}

function setDash(on) { drawingContext.setLineDash(on ? [6, 4] : []); }

// Shown instead of a plot once the weights have overflowed
function drawDivergedPanel(box) {
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
  noStroke();
  fill(WARN_COLOR);
  textStyle(BOLD);
  textSize(wideLayout ? 14 : 12);
  textAlign(CENTER, CENTER);
  text('Weights blew up at step ' + run.step + '.\nLower the learning rate η to restart.', (box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2);
  textStyle(NORMAL);
}

// ---------- Learned kernels as stem plots ----------
function drawKernels(box) {
  const m = run.model, F = m.F, K = m.K;
  const kx = box.x0 - (wideLayout ? 40 : 32);
  panelLabel(wideLayout ? ['Learned kernels: taps w[k] of each filter', 'Learned kernels w[k]'] : 'Learned kernels w[k]',
             kx, box.y0 - 14, wideLayout ? boxes.freq.x0 - 48 - kx : 0);
  if (run.diverged) { drawDivergedPanel(box); return; }
  let amax = 0;
  for (const w of m.w) for (const v of w) if (Number.isFinite(v)) amax = Math.max(amax, Math.abs(v));
  const wmax = niceCeil(amax * 1.05);
  const gap = wideLayout ? 6 : 4;
  const h = (box.y1 - box.y0 - gap * (F - 1)) / F;
  const slot = (box.x1 - box.x0) / K;
  for (let f = 0; f < F; f++) {
    const sub = { x0: box.x0, x1: box.x1, y0: box.y0 + f * (h + gap), y1: box.y0 + f * (h + gap) + h };
    drawFrame(sub, [], 0, 1, [0], -wmax, wmax, null, v => (h >= 40 ? fmtTick(v) : ''));
    if (h >= 40) {
      // +wmax and -wmax labels kept inside this plot's height so stacked plots do not collide
      noStroke();
      fill(70);
      textSize(wideLayout ? 12 : 11);
      textAlign(RIGHT, TOP);
      text(fmtTick(wmax), sub.x0 - 5, sub.y0);
      textAlign(RIGHT, BOTTOM);
      text(fmtTick(-wmax), sub.x0 - 5, sub.y1);
    }
    const y0 = mapY(sub, 0, -wmax, wmax);
    stroke(150);
    strokeWeight(1);
    line(sub.x0, y0, sub.x1, y0);
    const col = FILTER_COLORS[f];
    for (let k = 0; k < K; k++) {
      const v = m.w[f][k];
      if (!Number.isFinite(v)) continue;
      const x = sub.x0 + (k + 0.5) * slot;
      const y = mapY(sub, v, -wmax, wmax);
      stroke(col);
      strokeWeight(2);
      line(x, y0, x, y);
      noStroke();
      fill(col);
      circle(x, y, wideLayout ? 7 : 5);
    }
    // filter name at the left edge, outside the stems
    noStroke();
    fill(col);
    textStyle(BOLD);
    textSize(wideLayout ? 12 : 11);
    textAlign(RIGHT, CENTER);
    if (h < 40) text('w' + (f + 1), sub.x0 - 5, (sub.y0 + sub.y1) / 2);
    textStyle(NORMAL);
    if (h >= 40) {
      push();
      translate(sub.x0 - 34, (sub.y0 + sub.y1) / 2);
      rotate(-HALF_PI);
      textStyle(BOLD);
      textAlign(CENTER, CENTER);
      text('w' + (f + 1), 0, 0);
      pop();
    }
  }
  // tap indices under the last plot
  noStroke();
  fill(70);
  textSize(wideLayout ? 12 : 11);
  textAlign(CENTER, TOP);
  const every = slot < 16 ? 2 : 1;
  for (let k = 0; k < K; k += every) text(k, box.x0 + (k + 0.5) * slot, box.y1 + 3);
  fill('black');
  textSize(wideLayout ? 13 : 11);
  if (wideLayout) text('tap k', (box.x0 + box.x1) / 2, box.y1 + 18);
}

// ---------- Frequency response of every kernel ----------
function drawResponse(box) {
  const m = run.model;
  const NPTS = 200;
  panelLabel(wideLayout ? 'Frequency response |H(f)| of each kernel' : 'Kernel frequency response |H(f)|',
             box.x0 - (wideLayout ? 40 : 32), box.y0 - 14);
  if (run.diverged) { drawDivergedPanel(box); return; }
  const curves = m.w.map(w => {
    const g = new Float64Array(NPTS + 1);
    for (let i = 0; i <= NPTS; i++) g[i] = kernelGain(w, 0.5 * i / NPTS);
    return g;
  });
  let gmax = 0;
  for (const g of curves) for (const v of g) if (Number.isFinite(v)) gmax = Math.max(gmax, v);
  const ymax = niceCeil(gmax * 1.18);                // head-room for the tone labels
  drawFrame(box, [0, 0.1, 0.2, 0.3, 0.4, 0.5], 0, 0.5, [0, ymax / 2, ymax], 0, ymax, v => String(v), fmtTick);
  rotatedLabel('|H(f)|', box.x0 - (wideLayout ? 40 : 32), (box.y0 + box.y1) / 2);
  noStroke();
  fill('black');
  textSize(wideLayout ? 13 : 11);
  textAlign(wideLayout ? CENTER : RIGHT, TOP);
  if (wideLayout) text('frequency f (cycles/sample)', (box.x0 + box.x1) / 2, box.y1 + 18);
  else text('f (cycles/sample)', box.x1, box.y1 + 15);

  // the two class frequencies
  for (const [f, name] of [[F_LOW, 'low tone'], [F_HIGH, 'high tone']]) {
    const x = mapX(box, f, 0, 0.5);
    stroke(TONE_COLOR);
    strokeWeight(1.5);
    setDash(true);
    line(x, box.y0, x, box.y1);
    setDash(false);
    noStroke();
    fill(TONE_COLOR);
    textStyle(BOLD);
    textSize(wideLayout ? 12 : 11);
    textAlign(LEFT, TOP);
    text(wideLayout ? name + ' ' + f.toFixed(2) : f.toFixed(2), x + 4, box.y0 + 3);
    textStyle(NORMAL);
  }

  noFill();
  strokeWeight(wideLayout ? 2.5 : 2);
  curves.forEach((g, f) => {
    stroke(FILTER_COLORS[f]);
    beginShape();
    for (let i = 0; i <= NPTS; i++) {
      if (!Number.isFinite(g[i])) continue;
      vertex(mapX(box, 0.5 * i / NPTS, 0, 0.5), mapY(box, g[i], 0, ymax));
    }
    endShape();
  });
  // mark each kernel's peak
  m.w.forEach((w, f) => {
    if (!w.every(Number.isFinite)) return;
    const fp = peakFrequency(w);
    const x = mapX(box, fp, 0, 0.5), y = mapY(box, kernelGain(w, fp), 0, ymax);
    noStroke();
    fill(FILTER_COLORS[f]);
    circle(x, y, 8);
  });
}

// ---------- One read-out row per kernel ----------
function drawFilterTable(area) {
  const m = run.model;
  const bad = run.diverged;                 // after divergence the weights are meaningless
  noStroke();
  textStyle(NORMAL);
  textAlign(LEFT, CENTER);
  if (wideLayout) {
    // column positions: fixed minimum widths, extra width shared out on wide screens
    const extra = Math.max(0, canvasWidth - 640);
    const c1 = area.x0 + 56 + 0.10 * extra;
    const c2 = c1 + 180 + 0.25 * extra;
    const c3 = c2 + 150 + 0.25 * extra;
    textSize(13);
    fill(80);
    text('Kernel', area.x0, area.y0);
    text('Peak of |H(f)|', c1, area.y0);
    text('|H(0.30)| / |H(0.08)|', c2, area.y0);
    text('Output weight v', c3, area.y0);
    stroke(200);
    strokeWeight(1);
    line(area.x0, area.y0 + 9, area.x1, area.y0 + 9);
    noStroke();
    for (let f = 0; f < m.F; f++) {
      const y = area.y0 + 23 + 17 * f;
      const w = m.w[f], v = m.v[f];
      fill(FILTER_COLORS[f]);
      textStyle(BOLD);
      textSize(15);
      text('w' + (f + 1), area.x0, y);
      textStyle(NORMAL);
      fill(bad ? WARN_COLOR : 'black');
      textSize(14);
      if (bad) { text('weights blew up (η too large); lowering η restarts training', c1, y); continue; }
      text('f = ' + peakFrequency(w).toFixed(3) + ' cycles/sample', c1, y);
      text(fmtSigned(toneRatioDb(w), 1) + ' dB', c2, y);
      text(fmtSigned(v, 2) + (v >= 0 ? '  → evidence for high tone' : '  → evidence for low tone'), c3, y);
    }
  } else {
    textSize(12);
    fill(80);
    text('peak f', area.x0 + 26, area.y0 - 16);
    text('|H(.30)|/|H(.08)|', area.x0 + 86, area.y0 - 16);
    text('weight v', area.x0 + 196, area.y0 - 16);
    for (let f = 0; f < m.F; f++) {
      const y = area.y0 + 16 * f;
      const w = m.w[f], v = m.v[f];
      fill(FILTER_COLORS[f]);
      textStyle(BOLD);
      text('w' + (f + 1), area.x0, y);
      textStyle(NORMAL);
      fill(bad ? WARN_COLOR : 'black');
      if (bad) { text('weights blew up: lower η', area.x0 + 26, y); continue; }
      text(peakFrequency(w).toFixed(3), area.x0 + 26, y);
      text(fmtSigned(toneRatioDb(w), 1) + ' dB', area.x0 + 86, y);
      text(fmtSigned(v, 2) + (v >= 0 ? ' → high' : ' → low'), area.x0 + 196, y);
    }
  }
}

// ---------- Loss and accuracy curves ----------
function stepTicks() { return [0, 100, 200, 300, 400]; }
function stepFmt(v) { return (!wideLayout && v % 200 !== 0) ? '' : String(v); }

function drawCurve(box, arr, lo, hi, color, dashed) {
  noFill();
  stroke(color);
  strokeWeight(wideLayout ? 2 : 1.5);
  setDash(dashed);
  beginShape();
  for (let s = 0; s <= run.step; s++) {
    if (!Number.isFinite(arr[s])) break;
    vertex(mapX(box, s, 0, MAX_STEPS), mapY(box, arr[s], lo, hi));
  }
  endShape();
  setDash(false);
}

// Bold panel title with an inline key: "<prefix> [solid] <trainLabel> [dashed] <testLabel>".
// Each entry of prefixes is tried in turn until the whole title fits in maxW.
function titleWithKey(prefixes, trainLabel, testLabel, color, x, y, maxW) {
  noStroke();
  textStyle(BOLD);
  textSize(wideLayout ? 15 : 13);
  textAlign(LEFT, CENTER);
  const seg = wideLayout ? 18 : 14;
  const rest = 2 * seg + 18 + advW(trainLabel) + advW(testLabel);
  let pick = prefixes[prefixes.length - 1];
  for (const pr of prefixes) { if (advW(pr) + 4 + rest <= maxW) { pick = pr; break; } }
  let cx = x;
  fill('black');
  text(pick, cx, y);
  cx += advW(pick) + 5;
  stroke(color);
  strokeWeight(2.5);
  line(cx, y, cx + seg, y);
  cx += seg + 4;
  noStroke();
  fill('black');
  text(trainLabel, cx, y);
  cx += advW(trainLabel) + 10;
  stroke(color);
  strokeWeight(2.5);
  drawingContext.setLineDash([5, 3]);
  line(cx, y, cx + seg, y);
  setDash(false);
  cx += seg + 4;
  noStroke();
  fill('black');
  text(testLabel, cx, y);
  textStyle(NORMAL);
}

function drawLoss(box) {
  const s = run.step;
  const lx = box.x0 - (wideLayout ? 40 : 32);
  if (wideLayout) {
    titleWithKey(['Loss (cross-entropy):', 'Loss:'], 'train ' + fmtNum(run.trainLoss[s], 3), 'test ' + fmtNum(run.testLoss[s], 3),
                 LOSS_COLOR, lx, box.y0 - 14, boxes.acc.x0 - 54 - lx);
  } else {
    titleWithKey(['Loss'], fmtNum(run.trainLoss[s], 2), fmtNum(run.testLoss[s], 2), LOSS_COLOR, lx, box.y0 - 14, 999);
  }
  let lmax = 0.7;
  for (let i = 0; i <= s; i++) {
    for (const v of [run.trainLoss[i], run.testLoss[i]]) if (Number.isFinite(v)) lmax = Math.max(lmax, v);
  }
  lmax = niceCeil(Math.min(lmax, 50));
  drawFrame(box, stepTicks(), 0, MAX_STEPS, [0, lmax / 2, lmax], 0, lmax, stepFmt, fmtTick);
  drawCurve(box, run.trainLoss, 0, lmax, LOSS_COLOR, false);
  drawCurve(box, run.testLoss, 0, lmax, LOSS_COLOR, true);
  noStroke();
  fill('black');
  textSize(wideLayout ? 13 : 11);
  if (wideLayout) { textAlign(CENTER, TOP); text('training step (one step = one batch of 16 segments)', (box.x0 + box.x1) / 2, box.y1 + 18); }
  if (run.diverged) {
    fill(WARN_COLOR);
    textStyle(BOLD);
    textSize(wideLayout ? 14 : 12);
    textAlign(CENTER, CENTER);
    text('Diverged at step ' + run.step + ': η too large', (box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2);
    textStyle(NORMAL);
  }
}

function drawAccuracy(box) {
  const s = run.step;
  const ax = box.x0 - (wideLayout ? 46 : 34);
  if (wideLayout) {
    titleWithKey(['Accuracy:'], 'train ' + fmtPct(run.trainAcc[s]), 'test ' + fmtPct(run.testAcc[s]), ACC_COLOR, ax, box.y0 - 14, 999);
  } else {
    titleWithKey(['Acc.'], fmtPct(run.trainAcc[s]), fmtPct(run.testAcc[s]), ACC_COLOR, ax, box.y0 - 14, 999);
  }
  drawFrame(box, stepTicks(), 0, MAX_STEPS, [0, 0.5, 1], 0, 1, stepFmt, v => Math.round(100 * v) + '%');
  noStroke();
  fill(120);
  textSize(11);
  textAlign(RIGHT, TOP);
  text('chance', box.x1 - 4, mapY(box, 0.5, 0, 1) + 2);
  drawCurve(box, run.trainAcc, 0, 1, ACC_COLOR, false);
  drawCurve(box, run.testAcc, 0, 1, ACC_COLOR, true);
  noStroke();
  fill('black');
  textSize(wideLayout ? 13 : 11);
  if (wideLayout) { textAlign(CENTER, TOP); text('training step', (box.x0 + box.x1) / 2, box.y1 + 18); }
}

// ---------- Four test segments with predictions ----------
function drawExamples(area) {
  const m = run.model;
  const sigma = run.p.noise;
  const n = EXAMPLES.length;
  const gap = wideLayout ? 16 : 8;
  const w = (area.x1 - area.x0 - gap * (n - 1)) / n;
  panelLabel(wideLayout ? 'Test segments x[n] and predictions' : 'Test segments', area.x0, area.y0 - 36);
  noStroke();
  fill(60);
  textSize(wideLayout ? 13 : 11);
  textAlign(LEFT, CENTER);
  if (wideLayout) {
    textStyle(BOLD);
    textSize(15);
    const lw = advW('Test segments x[n] and predictions');
    textStyle(NORMAL);
    textSize(13);
    fitText(['   gold: the clean tone under the noise;  bars: the K samples where each kernel responded most',
             '   bars: the K samples where each kernel responded most',
             '   bars: max-pool winners', ''], area.x0 + lw, area.y0 - 43, area.x1 - area.x0 - lw, LEFT);
  }
  const ymax = Math.max(1.5, 1 + 2.5 * sigma);
  const out = newForwardResult(m.F);
  for (let i = 0; i < n; i++) {
    const e = run.sets.test[EXAMPLES[i]];
    const box = { x0: area.x0 + i * (w + gap), x1: area.x0 + i * (w + gap) + w, y0: area.y0, y1: area.y1 };
    forwardSegment(m, e.x, out);
    // frame and zero line
    fill('white');
    stroke('silver');
    strokeWeight(1);
    rect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
    const yz = mapY(box, 0, -ymax, ymax);
    stroke(220);
    line(box.x0, yz, box.x1, yz);
    // the clean tone hidden in the noise (faint), then the noisy input the network sees
    noFill();
    stroke(184, 134, 11, 150);
    strokeWeight(1.5);
    beginShape();
    for (let k = 0; k < SEG_LEN; k++) vertex(mapX(box, k, 0, SEG_LEN - 1), mapY(box, e.tone[k], -ymax, ymax));
    endShape();
    stroke(SIGNAL_COLOR);
    strokeWeight(1.3);
    beginShape();
    for (let k = 0; k < SEG_LEN; k++) vertex(mapX(box, k, 0, SEG_LEN - 1), mapY(box, e.x[k], -ymax, ymax));
    endShape();
    // where each kernel won the max-pool
    if (!run.diverged && Number.isFinite(out.logit)) {
      strokeWeight(3);
      for (let f = 0; f < m.F; f++) {
        if (!(out.act[f] > 0)) continue;
        stroke(FILTER_COLORS[f]);
        const yb = box.y1 - 3 - 4 * f;
        line(mapX(box, out.pos[f], 0, SEG_LEN - 1), yb, mapX(box, out.pos[f] + m.K - 1, 0, SEG_LEN - 1), yb);
      }
    }
    // true class above, prediction below
    noStroke();
    textSize(wideLayout ? 13 : 11);
    textAlign(LEFT, BOTTOM);
    fill(TONE_COLOR);
    textStyle(BOLD);
    text(e.y === 1 ? (wideLayout ? 'true: high tone' : 'high') : (wideLayout ? 'true: low tone' : 'low'), box.x0 + 2, box.y0 - 2);
    textStyle(NORMAL);
    const ok = !run.diverged && Number.isFinite(out.p);
    const pred = out.p >= 0.5 ? 1 : 0;
    const right = ok && pred === e.y;
    fill(right ? 'black' : WARN_COLOR);
    textAlign(LEFT, TOP);
    const verdict = right ? '✓' : '✗';
    let msg = wideLayout ? 'p(high) = —' : '—';
    if (ok) msg = wideLayout ? 'p(high) = ' + out.p.toFixed(2) + ' → ' + (pred ? 'high' : 'low') + ' ' + verdict
                             : out.p.toFixed(2) + ' ' + verdict;
    text(msg, box.x0 + 2, box.y1 + 3);
  }
}

// ---------- Resizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  layoutControls(false);
}
