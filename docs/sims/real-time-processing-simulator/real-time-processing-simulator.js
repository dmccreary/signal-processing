// Real-Time Processing Simulator MicroSim
// CANVAS_HEIGHT: 660
// Block-based (double-buffered) real-time FIR filtering. While the input buffer fills with
// block k+1, the processor filters block k and the output buffer plays block k-1. Each block
// must be finished within the block period T = B/fs or the output buffer underruns.
// Processor clock rates, MACs per cycle and per-block overheads are typical, illustrative values.

// ---------------------------------------------------------------- canvas and layout
let canvasWidth = 760;               // overwritten from the container in updateCanvasSize()
let canvasHeight = 660;              // fixed; drawHeight + controlHeight
let controlHeight = 175;             // 5 control rows (6 on narrow screens)
let drawHeight = canvasHeight - controlHeight;
let margin = 16;
let sliderLeftMargin = 225;
let defaultTextSize = 16;
let narrow = false;                  // narrow-screen layout (phones)
let plotL = 52;                      // left edge of the time line and the load chart
let LY = {};                         // vertical layout of the drawing region
const ROW_DY = 33;                   // spacing of the control rows

// ---------------------------------------------------------------- controls
let rateSelect, procSelect, wordSelect, speedSelect;
let blockSlider, tapsSlider, bgSlider;
let pauseButton, resetButton;
let ctlLabels = [];                  // labels drawn next to the selects
let ctlRows = 5;
let layoutWidth = -1;

// ---------------------------------------------------------------- model (typical, illustrative)
// clock in Hz, sustained MACs per clock cycle for each word length, per-block overhead in cycles
// (interrupt entry/exit, DMA re-arm, buffer swap); shared = background tasks use the same core
const PROCESSORS = {
  mcu:  { label: 'MCU 64 MHz',            short: 'MCU',       clock: 64e6,  mpc: { fx16: 0.25, fx24: 0.125, fl32: 0.02 }, ovh: 1000, shared: true },
  m4:   { label: 'Cortex-M4 168 MHz',     short: 'Cortex-M4', clock: 168e6, mpc: { fx16: 1,    fx24: 0.5,   fl32: 0.5 },  ovh: 800,  shared: true },
  dsp:  { label: 'DSP 600 MHz',           short: 'DSP',       clock: 600e6, mpc: { fx16: 4,    fx24: 2,     fl32: 2 },    ovh: 1200, shared: true },
  fpga: { label: 'FPGA 200 MHz parallel', short: 'FPGA',      clock: 200e6, mpc: { fx16: 16,   fx24: 16,    fl32: 4 },    ovh: 0,    shared: false }
};
const WORDS = {
  fx16: { label: '16-bit fixed', bits: 16, fixed: true },
  fx24: { label: '24-bit fixed', bits: 24, fixed: true },
  fl32: { label: '32-bit float', bits: 24, fixed: false }     // 24-bit significand
};
const RATES = [8000, 16000, 22050, 44100, 48000, 96000];
const SPEEDS = [1, 3, 20];
const BURST = 50e-6;                 // each background burst occupies the processor for 50 us
const MAX_GROUPS = 200;              // bursts drawn per block (very many bursts are grouped)
const N_HIST = 60;                   // blocks in the load chart
const SEED = 20261014;
const DEFAULTS = { fs: 48000, blockExp: 5, taps: 128, proc: 'mcu', word: 'fx16', bg: 30, speed: 3 };

// Colors
const COL_IN = [30, 100, 200];       // input samples: blue
const COL_FILT = [30, 100, 200];     // filter work: blue
const COL_OVH = [140, 140, 140];     // per-block overhead: gray
const COL_BG = [230, 125, 20];       // background bursts: orange
const COL_OUT = [20, 140, 90];       // processed output samples: green
const COL_MISS = [205, 35, 35];      // missed deadline / underrun: red
const COL_GOLD = [190, 140, 0];      // 80 % margin line: gold

// ---------------------------------------------------------------- state
let fs = DEFAULTS.fs, B = 32, L = DEFAULTS.taps, procKey = DEFAULTS.proc, wordKey = DEFAULTS.word;
let bgPct = DEFAULTS.bg, speed = DEFAULTS.speed;
let model = null;
let paramKey = '';
let isRunning = true;
let pointerInside = false;           // animate only while the pointer is over the page
let phase = 0;                       // position inside the current block period (0..1)
let nextId = 1;
let procBlock = null, outBlock = null, inId = 0;
let history = [];                    // finished blocks, oldest first
let changeMarks = [];                // ids of the first block processed after a settings change
let runBlocks = 0, runMisses = 0;    // finished blocks and underruns since the last change
let rng;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  rateSelect = createSelect();
  for (const r of RATES) rateSelect.option(fmtRate(r), String(r));
  procSelect = createSelect();
  for (const k of Object.keys(PROCESSORS)) procSelect.option(PROCESSORS[k].label, k);
  wordSelect = createSelect();
  for (const k of Object.keys(WORDS)) wordSelect.option(WORDS[k].label, k);
  speedSelect = createSelect();
  for (const s of SPEEDS) speedSelect.option(s + (s === 1 ? ' block/s' : ' blocks/s'), String(s));
  for (const s of [rateSelect, procSelect, wordSelect, speedSelect]) s.style('font-size', '15px');

  blockSlider = createSlider(4, 12, DEFAULTS.blockExp, 1);     // B = 2^value = 16 ... 4096
  tapsSlider = createSlider(8, 512, DEFAULTS.taps, 8);
  bgSlider = createSlider(0, 50, DEFAULTS.bg, 1);

  pauseButton = createButton('Pause');
  pauseButton.mousePressed(togglePause);
  resetButton = createButton('Reset');
  resetButton.mousePressed(resetAll);
  for (const b of [pauseButton, resetButton]) { b.style('font-size', '15px'); b.style('width', '68px'); }

  setDefaults();
  layoutControls(true);

  // animate only while the pointer is over the simulation (saves CPU when embedded in a page)
  document.addEventListener('pointermove', () => { pointerInside = true; });
  document.addEventListener('pointerdown', () => { pointerInside = true; });
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) pointerInside = false; });

  restart();
  describe('Real-time block processing simulator. A pipeline shows the input buffer filling, the processor filtering the previous block and the output buffer playing the block before that. A time line shows whether the filter, the per-block overhead and random background bursts finish before the deadline T = B/fs, and a bar chart shows the processor load of the last 60 blocks with missed deadlines in red. Selects set the sample rate, processor, word length and animation speed; sliders set the block size, filter taps and background load.');
}

function draw() {
  updateCanvasSize();
  readParams();

  if (isRunning && pointerInside) {
    phase += Math.min(deltaTime, 100) / 1000 * speed;
    let guard = 0;
    while (phase >= 1 && guard++ < 50) { phase -= 1; advanceBlock(); }
  }

  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  regionLayout();
  drawTitle();
  drawPipeline();
  drawTimeline();
  drawHistory();
  drawMeter();
  drawReadouts();
  drawFootnote();
  drawControlLabels();
}

// ---------------------------------------------------------------- model

function readParams() {
  fs = Number(rateSelect.value()) || DEFAULTS.fs;
  B = Math.pow(2, Math.round(Number(blockSlider.value())));
  L = Math.round(Number(tapsSlider.value()));
  procKey = PROCESSORS[procSelect.value()] ? procSelect.value() : DEFAULTS.proc;
  wordKey = WORDS[wordSelect.value()] ? wordSelect.value() : DEFAULTS.word;
  bgPct = Math.round(Number(bgSlider.value()));
  speed = Number(speedSelect.value()) || DEFAULTS.speed;
  const key = [fs, B, L, procKey, wordKey, bgPct].join('|');
  if (key !== paramKey) {
    paramKey = key;
    model = computeModel();
    if (procBlock) {
      evalBlock(procBlock);          // the block in the processor follows the new settings at once
      runBlocks = 0;
      runMisses = 0;
      if (changeMarks[changeMarks.length - 1] !== procBlock.id) changeMarks.push(procBlock.id);
    }
  }
}

function computeModel() {
  const p = PROCESSORS[procKey];
  const mpc = p.mpc[wordKey];
  const T = B / fs;                              // block period = deadline
  const macRate = fs * L;                        // FIR: L multiply-accumulates per output sample
  const capacity = p.clock * mpc;                // MACs per second the processor can sustain
  const Tfilt = B * L / capacity;                // filter time per block
  const Tovh = p.ovh / p.clock;                  // fixed overhead per block
  const W = Tfilt + Tovh;
  const bg = p.shared ? bgPct / 100 : 0;         // the FPGA's logic is not shared
  const mu = bg * T / BURST;                     // mean number of 50 us bursts per block
  const slack = T - W;
  const kMax = slack >= 0 ? Math.floor(slack / BURST + 1e-9) : -1;   // bursts that still fit
  let pMiss;
  if (kMax < 0) pMiss = 1;
  else if (mu <= 0) pMiss = 0;
  else pMiss = poissonTail(kMax, mu);
  return {
    p, mpc, T, macRate, capacity, Tfilt, Tovh, W, bg, mu, kMax, pMiss,
    filtPct: 100 * Tfilt / T, ovhPct: 100 * Tovh / T, avgPct: 100 * (W / T + bg),
    word: WORDS[wordKey]
  };
}

// P(N > k) for N ~ Poisson(mu), summed in the log domain so large means do not underflow
function poissonTail(k, mu) {
  const lmu = Math.log(mu);
  let lp = -mu, s = 0;
  if (k < mu) {
    s = Math.exp(lp);
    for (let n = 1; n <= k; n++) { lp += lmu - Math.log(n); s += Math.exp(lp); }
    return Math.max(0, 1 - s);
  }
  for (let n = 1; n <= k; n++) lp += lmu - Math.log(n);
  const nEnd = k + 60 + Math.ceil(12 * Math.sqrt(mu));
  for (let n = k + 1; n <= nEnd; n++) { lp += lmu - Math.log(n); s += Math.exp(lp); }
  return Math.min(1, s);
}

// inverse-CDF sample of Poisson(mu) from one uniform number u, so a block keeps its
// random draw when the settings change and only its burst count follows the new mean
function poissonInv(u, mu) {
  const lmu = Math.log(mu);
  const nMax = Math.ceil(mu + 14 * Math.sqrt(mu) + 30);
  let lp = -mu, c = Math.exp(lp), n = 0;
  while (c < u && n < nMax) { n++; lp += lmu - Math.log(n); c += Math.exp(lp); }
  return n;
}

function makeRng(seed) {             // mulberry32: small seeded PRNG
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function newBlock() {
  const r = new Float64Array(MAX_GROUPS);
  for (let i = 0; i < MAX_GROUPS; i++) r[i] = rng();
  const b = { id: nextId++, u: rng(), r };
  evalBlock(b);
  return b;
}

// busy time = filter + overhead + the background bursts that arrive in this block period;
// the output block is late (underrun) when the busy time exceeds the block period
function evalBlock(b) {
  const m = model;
  b.T = m.T;
  b.W = m.W;
  b.Tovh = m.Tovh;
  b.N = m.mu > 0 ? poissonInv(b.u, m.mu) : 0;
  b.bgTime = b.N * BURST;
  b.busy = m.W + b.bgTime;
  b.missed = m.kMax < 0 || b.N > m.kMax;
  const k = Math.min(b.N, MAX_GROUPS);
  b.groups = Array.from(b.r.subarray(0, k)).map(v => v * m.W).sort((x, y) => x - y);
  b.groupDur = k > 0 ? b.bgTime / k : 0;
}

function advanceBlock() {
  history.push(procBlock);
  if (history.length > N_HIST) history.shift();
  runBlocks++;
  if (procBlock.missed) runMisses++;
  outBlock = procBlock;
  procBlock = newBlock();
  inId = procBlock.id + 1;
  while (changeMarks.length && changeMarks[0] <= history[0].id) changeMarks.shift();
}

// start from a full chart: simulate N_HIST blocks with the current settings
function restart() {
  rng = makeRng(SEED);
  nextId = 1;
  phase = 0;
  history = [];
  changeMarks = [];
  readParams();
  model = computeModel();
  runBlocks = 0;
  runMisses = 0;
  for (let i = 0; i < N_HIST; i++) {
    const b = newBlock();
    history.push(b);
    runBlocks++;
    if (b.missed) runMisses++;
  }
  outBlock = history[history.length - 1];
  procBlock = newBlock();
  inId = procBlock.id + 1;
}

function setDefaults() {
  rateSelect.selected(String(DEFAULTS.fs));
  procSelect.selected(DEFAULTS.proc);
  wordSelect.selected(DEFAULTS.word);
  speedSelect.selected(String(DEFAULTS.speed));
  blockSlider.value(DEFAULTS.blockExp);
  tapsSlider.value(DEFAULTS.taps);
  bgSlider.value(DEFAULTS.bg);
}

function togglePause() {
  isRunning = !isRunning;
  pauseButton.html(isRunning ? 'Pause' : 'Run');
}

function resetAll() {
  setDefaults();
  isRunning = true;
  pauseButton.html('Pause');
  restart();
}

// ---------------------------------------------------------------- layout

function regionLayout() {
  const y = {};
  y.title = 18;
  y.pipeTop = 36;
  y.pipeH = narrow ? 82 : 92;
  y.tlHead = y.pipeTop + y.pipeH + 17;
  y.tlBar = y.tlHead + 12;
  y.tlBarH = 22;
  y.tlTicks = y.tlBar + y.tlBarH + 10;
  y.histHead = y.tlTicks + 24;
  y.histTop = y.histHead + 16;
  y.foot = drawHeight - 13;
  y.readRows = narrow ? 5 : 5;
  y.readDY = narrow ? 17 : 18;
  y.readTop = y.foot - 22 - (y.readRows - 1) * y.readDY;
  y.histBot = y.readTop - 34;
  LY = y;
}

// ---------------------------------------------------------------- drawing

function drawTitle() {
  noStroke();
  fill('black');
  textStyle(BOLD);
  textSize(narrow ? 18 : 22);
  textAlign(narrow ? LEFT : CENTER, CENTER);
  text(narrow ? 'Real-Time Processing' : 'Real-Time Processing Simulator', narrow ? margin : canvasWidth / 2, LY.title);
  textStyle(NORMAL);

  textSize(14);
  textAlign(RIGHT, CENTER);
  let msg, col;
  if (!isRunning) { msg = '● PAUSED'; col = COL_MISS; }
  else if (pointerInside) { msg = '● RUNNING'; col = COL_OUT; }
  else { msg = narrow ? '● IDLE' : '● IDLE (move the mouse here)'; col = [110, 110, 110]; }
  if (!narrow && canvasWidth < 760 && !pointerInside && isRunning) msg = '● IDLE';
  fill(col);
  text(msg, canvasWidth - margin, LY.title);
}

function drawPipeline() {
  const top = LY.pipeTop, h = LY.pipeH;
  const side = narrow ? 0 : 38;
  const gap = narrow ? 12 : 28;
  const x0 = margin + side, x1 = canvasWidth - margin - side;
  const bw = (x1 - x0 - 2 * gap) / 3;
  const bx = [x0, x0 + bw + gap, x0 + 2 * (bw + gap)];
  const midY = top + h / 2;
  const t = phase * procBlock.T;               // time inside the current block period

  if (!narrow) {
    noStroke();
    fill(70);
    textSize(14);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('ADC', margin + side / 2 - 3, midY - 12);
    text('DAC', canvasWidth - margin - side / 2 + 3, midY - 12);
    textStyle(NORMAL);
    drawArrow(margin, midY + 4, x0 - 3, midY + 4, [70, 70, 70]);
    drawArrow(x1 + 3, midY + 4, canvasWidth - margin, midY + 4, [70, 70, 70]);
  }
  drawArrow(bx[0] + bw + 2, midY, bx[1] - 3, midY, [70, 70, 70]);
  drawArrow(bx[1] + bw + 2, midY, bx[2] - 3, midY, [70, 70, 70]);

  const tY = top + (narrow ? 14 : 16), sY = top + (narrow ? 31 : 34);
  const cTop = top + (narrow ? 41 : 45), cH = narrow ? 14 : 16, lY = top + (narrow ? 68 : 76);
  const pad = 8, cells = 16;

  // ---- input buffer: block k+1 filling
  boxFrame(bx[0], top, bw, h, COL_IN);
  boxText(narrow ? 'Input' : 'Input buffer', bx[0] + bw / 2, tY, bw - 8, true);
  boxText(narrow ? '#' + inId + ' filling' : 'block #' + inId + ' filling', bx[0] + bw / 2, sY, bw - 8, false);
  const filled = phase * cells;
  drawCells(bx[0] + pad, cTop, bw - 2 * pad, cH, cells, i => (i < filled ? COL_IN : null), null);
  const nIn = Math.min(B, Math.floor(phase * B));
  fill(60);
  fitText([nIn + ' of ' + B + ' samples', nIn + ' / ' + B], bx[0] + bw / 2, lY, bw - 8, CENTER);

  // ---- processor: block k
  const late = procBlock.busy > procBlock.T;
  boxFrame(bx[1], top, bw, h, late ? COL_MISS : [80, 80, 80]);
  boxText('Processor', bx[1] + bw / 2, tY, bw - 8, true);
  boxText(narrow ? 'block #' + procBlock.id : 'filtering block #' + procBlock.id, bx[1] + bw / 2, sY, bw - 8, false);
  const bxL = bx[1] + pad, bxW = bw - 2 * pad;
  noStroke();
  fill(255);
  stroke(190);
  strokeWeight(1);
  rect(bxL, cTop, bxW, cH);
  const done = Math.min(1, t / procBlock.busy);
  noStroke();
  fill(COL_FILT);
  rect(bxL, cTop, bxW * done, cH);
  if (late) {                                   // part of the work that cannot finish in time
    const okFrac = procBlock.T / procBlock.busy;
    fill(COL_MISS[0], COL_MISS[1], COL_MISS[2], 60);
    rect(bxL + bxW * okFrac, cTop, bxW * (1 - okFrac), cH);
    stroke(COL_MISS);
    strokeWeight(2);
    line(bxL + bxW * okFrac, cTop - 3, bxL + bxW * okFrac, cTop + cH + 3);
  }
  noStroke();
  if (late) {
    fill(COL_MISS);
    fitText(['too slow: needs ' + fmtMs(procBlock.busy), 'needs ' + fmtMs(procBlock.busy), 'too slow'], bx[1] + bw / 2, lY, bw - 8, CENTER);
  } else if (t < procBlock.busy) {
    fill(60);
    fitText(['working: ' + Math.floor(100 * done) + ' % done', Math.floor(100 * done) + ' % done'], bx[1] + bw / 2, lY, bw - 8, CENTER);
  } else {
    fill(COL_OUT);
    fitText(['done at ' + fmtMs(procBlock.busy), 'done'], bx[1] + bw / 2, lY, bw - 8, CENTER);
  }

  // ---- output buffer: block k-1 playing
  const under = outBlock && outBlock.missed;
  boxFrame(bx[2], top, bw, h, under ? COL_MISS : COL_OUT);
  boxText(narrow ? 'Output' : 'Output buffer', bx[2] + bw / 2, tY, bw - 8, true);
  boxText(narrow ? '#' + outBlock.id + ' playing' : 'block #' + outBlock.id + ' playing', bx[2] + bw / 2, sY, bw - 8, false);
  const played = phase * cells;
  if (under) {
    drawCells(bx[2] + pad, cTop, bw - 2 * pad, cH, cells, () => null, COL_MISS);
    fill(COL_MISS);
    textStyle(BOLD);
    fitText(['UNDERRUN: glitch', 'UNDERRUN'], bx[2] + bw / 2, lY, bw - 8, CENTER);
    textStyle(NORMAL);
  } else {
    drawCells(bx[2] + pad, cTop, bw - 2 * pad, cH, cells, i => (i >= played ? COL_OUT : null), null);
    const left = B - Math.min(B, Math.floor(phase * B));
    fill(60);
    fitText([left + ' of ' + B + ' left', left + ' / ' + B], bx[2] + bw / 2, lY, bw - 8, CENTER);
  }
}

function boxFrame(x, y, w, h, col) {
  fill(255);
  stroke(col[0], col[1], col[2]);
  strokeWeight(2);
  rect(x, y, w, h, 8);
}

function boxText(s, x, y, maxW, bold) {
  noStroke();
  fill(bold ? 20 : 60);
  textSize(bold ? 15 : 14);
  textStyle(bold ? BOLD : NORMAL);
  fitText([s], x, y, maxW, CENTER);
  textStyle(NORMAL);
}

// a row of n sample cells; colorOf(i) returns a fill color or null (empty)
function drawCells(x, y, w, h, n, colorOf, crossCol) {
  const cw = w / n;
  for (let i = 0; i < n; i++) {
    const c = colorOf(i);
    stroke(200);
    strokeWeight(1);
    if (c) fill(c[0], c[1], c[2]); else fill(246);
    rect(x + i * cw, y, cw, h);
  }
  if (crossCol) {
    stroke(crossCol);
    strokeWeight(2);
    line(x, y, x + w, y + h);
    line(x, y + h, x + w, y);
    noFill();
    rect(x, y, w, h);
  }
}

function drawArrow(xa, y, xb, yb, col) {
  stroke(col[0], col[1], col[2]);
  strokeWeight(2);
  line(xa, y, xb - 6, yb);
  noStroke();
  fill(col[0], col[1], col[2]);
  triangle(xb, yb, xb - 8, yb - 5, xb - 8, yb + 5);
}

function drawTimeline() {
  const blk = procBlock;
  const T = blk.T;
  const x0 = plotL, x1 = canvasWidth - margin;
  const span = 1.25 * T;
  const sx = tt => x0 + Math.min(tt, span) / span * (x1 - x0);
  const yb = LY.tlBar, hb = LY.tlBarH;

  // header: status on the right, title on the left in the remaining room
  textSize(15);
  noStroke();
  let status, scol;
  if (blk.missed) {
    status = ['MISSED: busy ' + fmtMs(blk.busy) + ' > T', 'MISSED ' + fmtMs(blk.busy), 'MISSED'];
    scol = COL_MISS;
  } else {
    status = ['finished at ' + fmtMs(blk.busy) + ' = ' + Math.round(100 * blk.busy / T) + ' % of T',
              'done at ' + fmtMs(blk.busy), 'on time'];
    scol = COL_OUT;
  }
  textStyle(BOLD);
  fill(scol);
  let sw = 0;
  for (const s of status) { sw = advW(s); if (sw <= (x1 - margin) * 0.45) { status = [s]; break; } }
  textAlign(RIGHT, CENTER);
  text(status[status.length - 1], x1, LY.tlHead);
  sw = advW(status[status.length - 1]);
  textStyle(NORMAL);
  fill(20);
  fitText(['Processor time line for block #' + blk.id + ' (deadline = block period T)',
           'Time line for block #' + blk.id + ' (deadline T)', 'Block #' + blk.id + ' time line', 'Block #' + blk.id],
          margin, LY.tlHead, x1 - margin - sw - 14, LEFT);

  // bar: on-time region and late region
  stroke(170);
  strokeWeight(1);
  fill(255);
  rect(x0, yb, sx(T) - x0, hb);
  fill(252, 228, 228);
  rect(sx(T), yb, x1 - sx(T), hb);
  noStroke();
  fill(COL_MISS[0], COL_MISS[1], COL_MISS[2], 170);
  textSize(14);
  textAlign(CENTER, CENTER);
  if (x1 - sx(T) > 46) text('late', (sx(T) + x1) / 2, yb + hb / 2);

  // busy segments: overhead and filter work, pre-empted by background bursts
  let tt = 0, work = 0;
  const workSeg = (w0, w1) => {          // work interval [w0, w1) starting at time tt
    if (w1 <= w0) return;
    const ovhEnd = blk.Tovh;
    if (w0 < ovhEnd) {
      const e = Math.min(w1, ovhEnd);
      segRect(tt, tt + (e - w0), COL_OVH, sx, yb, hb);
      tt += e - w0;
      w0 = e;
    }
    if (w1 > w0) {
      segRect(tt, tt + (w1 - w0), COL_FILT, sx, yb, hb);
      tt += w1 - w0;
    }
  };
  for (const g of blk.groups) {
    workSeg(work, g);
    work = Math.max(work, g);
    segRect(tt, tt + blk.groupDur, COL_BG, sx, yb, hb);
    tt += blk.groupDur;
  }
  workSeg(work, blk.W);

  // deadline and overflow marker
  stroke(COL_MISS);
  strokeWeight(3);
  line(sx(T), yb - 5, sx(T), yb + hb + 5);
  if (blk.busy > span) {
    noStroke();
    fill(COL_MISS);
    triangle(x1, yb + hb / 2, x1 - 9, yb + 2, x1 - 9, yb + hb - 2);
  }

  // play head
  const tp = phase * T;
  stroke(0);
  strokeWeight(2);
  line(sx(tp), yb - 4, sx(tp), yb + hb + 4);

  // ticks
  noStroke();
  fill(60);
  textSize(14);
  textAlign(LEFT, CENTER);
  text('0', x0, LY.tlTicks);
  textAlign(CENTER, CENTER);
  if (sx(T) - x0 > 190) text(fmtMs(T / 2), (x0 + sx(T)) / 2, LY.tlTicks);
  fill(COL_MISS);
  textAlign(CENTER, CENTER);
  const tLab = narrow ? 'T = ' + fmtMs(T) : 'T = ' + fmtMs(T) + ' deadline';
  const tw = advW(tLab);
  text(tLab, Math.min(sx(T), x1 - tw / 2), LY.tlTicks);
  fill(60);
  textAlign(LEFT, CENTER);
  textSize(14);
  if (!narrow) text('time', margin, yb + hb / 2);
}

function segRect(ta, tb, col, sx, yb, hb) {
  const xa = sx(ta), xbb = sx(tb);
  if (xbb <= xa) return;
  noStroke();
  fill(col[0], col[1], col[2]);
  rect(xa, yb + 2, Math.max(0.8, xbb - xa), hb - 4);
}

function meterWidth() { return narrow ? 46 : 64; }

function drawHistory() {
  const x0 = plotL, x1 = canvasWidth - margin - meterWidth() - 16;
  const y0 = LY.histTop, y1 = LY.histBot;
  const vy = pct => y1 - Math.min(pct, 150) / 150 * (y1 - y0);

  // header and legend
  noStroke();
  textSize(15);
  const items = [
    { col: COL_OVH, label: 'overhead', short: 'ovh' },
    { col: COL_FILT, label: 'filter', short: 'filter' },
    { col: COL_BG, label: 'background', short: 'bkgd' },
    { col: COL_MISS, label: 'missed', short: 'missed', outline: true }
  ];
  textSize(14);
  const legW = (useShort) => items.reduce((w, it) => w + 18 + advW(useShort ? it.short : it.label) + 12, 0);
  const useShort = legW(false) > (x1 - margin) * 0.62;
  const lw = legW(useShort);
  let lx = x1 - lw + 12;
  const ly = LY.histHead;
  for (const it of items) {
    if (it.outline) { noFill(); stroke(it.col); strokeWeight(2); rect(lx, ly - 6, 12, 12); }
    else { noStroke(); fill(it.col); rect(lx, ly - 6, 12, 12); }
    noStroke();
    fill(it.outline ? it.col : 50);
    textAlign(LEFT, CENTER);
    const s = useShort ? it.short : it.label;
    text(s, lx + 17, ly);
    lx += 18 + advW(s) + 12;
  }
  fill(20);
  textSize(15);
  fitText(['Processor load per block (last ' + N_HIST + ' blocks)', 'Load per block', 'Load'],
          margin, ly, x1 - lw - margin - 6, LEFT);

  // frame and grid
  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(x0, y0, x1 - x0, y1 - y0);
  noStroke();
  fill(70);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (const v of [0, 50, 100, 150]) {
    stroke(232);
    if (v > 0 && v < 150) line(x0, vy(v), x1, vy(v));
    noStroke();
    text(v + (v === 150 ? '' : ''), x0 - 5, vy(v));
  }
  push();
  translate(13, (y0 + y1) / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  fill(50);
  text('load %', 0, 0);
  pop();

  // bars, newest on the right
  const bw = (x1 - x0) / N_HIST;
  const n = history.length;
  for (let i = 0; i < n; i++) {
    const b = history[i];
    const xa = x1 - (n - i) * bw;
    const ovh = 100 * b.Tovh / b.T, filt = 100 * (b.W - b.Tovh) / b.T, bg = 100 * b.bgTime / b.T;
    const g = Math.max(1, bw * 0.18);
    let base = 0;
    noStroke();
    for (const [v, c] of [[ovh, COL_OVH], [filt, COL_FILT], [bg, COL_BG]]) {
      if (v <= 0) continue;
      const top = Math.min(150, base + v);
      if (top > base) {
        fill(c[0], c[1], c[2]);
        rect(xa + g / 2, vy(top), bw - g, vy(base) - vy(top));
      }
      base = top;
    }
    if (b.missed) {
      noFill();
      stroke(COL_MISS);
      strokeWeight(2);
      rect(xa + g / 2, vy(Math.min(150, b.busy / b.T * 100)), bw - g, vy(0) - vy(Math.min(150, b.busy / b.T * 100)));
      if (b.busy / b.T > 1.5) {
        noStroke();
        fill(COL_MISS);
        triangle(xa + bw / 2, y0 - 1, xa + bw / 2 - 4, y0 + 6, xa + bw / 2 + 4, y0 + 6);
      }
    }
    if (changeMarks.includes(b.id)) {
      stroke(90);
      strokeWeight(1);
      drawingContext.setLineDash([3, 3]);
      line(xa, y0, xa, y1);
      drawingContext.setLineDash([]);
    }
  }

  // deadline (100 %) and 20 % margin (80 %) lines
  strokeWeight(2);
  stroke(COL_MISS);
  drawingContext.setLineDash([7, 5]);
  line(x0, vy(100), x1, vy(100));
  stroke(COL_GOLD);
  strokeWeight(1.5);
  drawingContext.setLineDash([3, 4]);
  line(x0, vy(80), x1, vy(80));
  drawingContext.setLineDash([]);
  noStroke();
  textSize(14);
  textAlign(LEFT, BOTTOM);
  fill(COL_MISS);
  text('deadline', x0 + 4, vy(100) - 1);
  fill(COL_GOLD);
  textAlign(LEFT, TOP);
  if (!narrow) text('80 % (20 % margin)', x0 + 4, vy(80) + 1);

  // x axis note
  fill(70);
  textAlign(LEFT, CENTER);
  text('older', x0, y1 + 11);
  textAlign(RIGHT, CENTER);
  text('newest', x1, y1 + 11);
  textAlign(CENTER, CENTER);
  if (!narrow) text('blocks (dashed line = settings changed)', (x0 + x1) / 2, y1 + 11);
}

function drawMeter() {
  const w = meterWidth();
  const x = canvasWidth - margin - w;
  const y0 = LY.histTop, y1 = LY.histBot;
  const vy = pct => y1 - Math.min(pct, 150) / 150 * (y1 - y0);
  const avg = model.avgPct;

  noStroke();
  fill(20);
  textSize(14);
  textAlign(CENTER, CENTER);
  text(narrow ? 'avg' : 'average', x + w / 2, LY.histHead);
  // zones: below 80 % green, 80-100 % gold, above 100 % red
  fill(222, 242, 228);
  rect(x, vy(80), w, vy(0) - vy(80));
  fill(250, 238, 200);
  rect(x, vy(100), w, vy(80) - vy(100));
  fill(250, 222, 222);
  rect(x, y0, w, vy(100) - y0);
  const col = avg > 100 ? COL_MISS : (avg > 80 ? COL_GOLD : COL_OUT);
  fill(col[0], col[1], col[2]);
  const bwm = w * 0.46;
  rect(x + (w - bwm) / 2, vy(avg), bwm, vy(0) - vy(avg));
  noFill();
  stroke(170);
  strokeWeight(1);
  rect(x, y0, w, y1 - y0);
  stroke(COL_MISS);
  strokeWeight(2);
  line(x, vy(100), x + w, vy(100));
  noStroke();
  fill(col[0] * 0.8, col[1] * 0.8, col[2] * 0.8);
  textStyle(BOLD);
  textSize(14);
  const label = avg >= 1000 ? Math.round(avg) + '%' : avg.toFixed(avg >= 100 ? 0 : 1) + '%';
  textAlign(CENTER, CENTER);
  text(label, x + w / 2, y1 + 11);
  textStyle(NORMAL);
  if (avg > 150) {
    fill(COL_MISS);
    triangle(x + w / 2, y0 - 1, x + w / 2 - 5, y0 + 8, x + w / 2 + 5, y0 + 8);
  }
}

function drawReadouts() {
  const m = model;
  const p = m.p, w = m.word;
  const noiseLong = w.fixed ? '−6.02 × ' + w.bits + ' = ' + fmtDb(-6.02 * w.bits) + ' dBFS'
                            : '≈ −144 dB below the signal';
  const missStr = fmtMiss(m.pMiss);
  const runPct = runBlocks > 0 ? ' (' + (100 * runMisses / runBlocks).toFixed(1) + ' %)' : '';
  const bgLine = p.shared ? ['Background ' + bgPct + ' % (50 µs bursts)', 'Background ' + bgPct + ' %']
                          : ['Background: none on FPGA logic', 'Background: n/a (FPGA)'];
  const overload = m.W > m.T;
  const loadLine = overload
    ? ['Average load ' + fmtPct(m.avgPct) + ': OVERLOAD', 'Load ' + fmtPct(m.avgPct) + ' OVERLOAD']
    : ['Average load ' + fmtPct(m.avgPct) + ' (margin ' + fmtPct(100 - m.avgPct) + ')', 'Average load ' + fmtPct(m.avgPct)];
  const yTop = LY.readTop, dy = LY.readDY;

  if (!narrow) {
    const groups = [
      { title: 'Timing and precision', col: COL_IN, lines: [
        ['Block period T = B/fs = ' + fmtMs(m.T), 'T = B/fs = ' + fmtMs(m.T)],
        ['Latency 2B/fs = ' + fmtMs(2 * m.T), 'Latency ' + fmtMs(2 * m.T)],
        [w.label + ' noise floor', w.label],
        [noiseLong, w.fixed ? fmtDb(-6.02 * w.bits) + ' dBFS' : '≈ −144 dB re signal']
      ] },
      { title: 'Computation (illustrative)', col: [90, 90, 90], lines: [
        ['Needed fs·L = ' + fmtMac(m.macRate), 'fs·L = ' + fmtMac(m.macRate)],
        ['Capacity ' + fmtMac(m.capacity), 'Cap. ' + fmtMac(m.capacity)],
        ['= ' + fmtClock(p.clock) + ' × ' + fmtNum(m.mpc) + ' MAC/cycle', '= ' + fmtClock(p.clock) + ' × ' + fmtNum(m.mpc)],
        ['Filter ' + fmtPct(m.filtPct) + ' + overhead ' + fmtPct(m.ovhPct), 'Filter ' + fmtPct(m.filtPct) + ' + ovh ' + fmtPct(m.ovhPct)]
      ] },
      { title: 'Deadline', col: COL_MISS, lines: [
        bgLine,
        loadLine,
        ['Expected misses ' + missStr + ' of blocks', 'Expected misses ' + missStr],
        ['Underruns ' + runMisses + ' of ' + runBlocks + ' blocks' + runPct, 'Underruns ' + runMisses + ' / ' + runBlocks]
      ] }
    ];
    const colW = (canvasWidth - 2 * margin) / 3;
    groups.forEach((g, gi) => {
      const x = margin + gi * colW;
      noStroke();
      fill(g.col);
      textStyle(BOLD);
      textSize(15);
      fitText([g.title], x, yTop, colW - 10, LEFT);
      textStyle(NORMAL);
      g.lines.forEach((cands, li) => {
        let c = [30, 30, 30];
        if (gi === 2 && li === 1) c = overload ? COL_MISS : (m.avgPct > 80 ? [150, 105, 0] : [30, 30, 30]);
        if (gi === 2 && li === 2 && m.pMiss > 0.0001) c = COL_MISS;
        if (gi === 2 && li === 3 && runMisses > 0) c = COL_MISS;
        fill(c);
        textSize(15);
        fitText(cands, x, yTop + (li + 1) * dy, colW - 10, LEFT);
      });
    });
  } else {
    const col1 = [
      ['T = B/fs = ' + fmtMs(m.T)],
      ['Latency 2B/fs = ' + fmtMs(2 * m.T), 'Latency ' + fmtMs(2 * m.T)],
      ['fs·L = ' + fmtMac(m.macRate)],
      ['Capacity ' + fmtMac(m.capacity), 'Cap. ' + fmtMac(m.capacity)],
      [w.fixed ? 'Noise ' + fmtDb(-6.02 * w.bits) + ' dBFS' : 'Noise −144 dB re sig.']
    ];
    const col2 = [
      ['Filter ' + fmtPct(m.filtPct) + ', ovh ' + fmtPct(m.ovhPct), 'Filter ' + fmtPct(m.filtPct)],
      [p.shared ? 'Background ' + bgPct + ' %' : 'Bkgd: n/a (FPGA)'],
      [overload ? 'OVERLOAD ' + fmtPct(m.avgPct) : 'Average ' + fmtPct(m.avgPct)],
      ['Exp. misses ' + missStr],
      ['Underruns ' + runMisses + '/' + runBlocks]
    ];
    const colW = (canvasWidth - 2 * margin) / 2;
    [col1, col2].forEach((col, ci) => {
      col.forEach((cands, li) => {
        let c = [30, 30, 30];
        if (ci === 1 && li === 2 && overload) c = COL_MISS;
        if (ci === 1 && li === 3 && m.pMiss > 0.0001) c = COL_MISS;
        if (ci === 1 && li === 4 && runMisses > 0) c = COL_MISS;
        noStroke();
        fill(c);
        textSize(14);
        fitText(cands, margin + ci * colW, yTop + li * dy, colW - 6, LEFT);
      });
    });
  }
}

function drawFootnote() {
  noStroke();
  fill(95);
  textSize(14);
  fitText(['Processor clock rates, MACs per cycle and per-block overheads are typical, illustrative values.',
           'Processor figures are typical, illustrative values.', 'Processor figures are illustrative.'],
          margin, LY.foot, canvasWidth - 2 * margin, LEFT);
}

function drawControlLabels() {
  noStroke();
  fill('black');
  textSize(narrow ? 14 : 16);
  textAlign(LEFT, CENTER);
  for (const lb of ctlLabels) text(lb.text, lb.x, lb.y);
  const r = narrow ? 2 : 1;
  const fpga = !PROCESSORS[procKey].shared;
  if (narrow) {
    text('Block B = ' + B, 10, rowY(r));
    text('Taps L = ' + L, 10, rowY(r + 1));
    text('Bkgd ' + bgPct + ' %' + (fpga ? ' (n/a)' : ''), 10, rowY(r + 2));
  } else {
    text('Block size B = ' + B + ' samples', 10, rowY(r));
    text('Filter taps L = ' + L, 10, rowY(r + 1));
    text('Background load = ' + bgPct + ' %', 10, rowY(r + 2));
    if (fpga) {
      fill(110);
      textSize(14);
      text('(no effect on FPGA)', 10, rowY(r + 2) + 14);
    }
  }
  // hint at the right of the last row (wide screens only)
  if (!narrow) {
    const last = rowY(ctlRows - 1);
    const xs = resetButton.elt.offsetLeft + resetButton.elt.offsetWidth + 16;
    fill(110);
    textSize(14);
    fitText(['Counters restart whenever a setting changes.', 'Counters restart on change.'],
            xs, last, canvasWidth - margin - xs, LEFT);
  }
}

// ---------------------------------------------------------------- text and number helpers

// advance width: p5 2.x textWidth() measures tight bounds and ignores spaces
function advW(s) {
  return typeof fontWidth === 'function' ? fontWidth(s) : textWidth(s);
}

// draw the first candidate that fits in maxW (the last one otherwise); y is the line centre
function fitText(cands, x, y, maxW, align) {
  let pick = cands[cands.length - 1];
  for (const c of cands) { if (advW(c) <= maxW) { pick = c; break; } }
  textAlign(align, CENTER);
  text(pick, x, y);
  return advW(pick);
}

function fmtRate(r) { return (r % 1000 === 0 ? (r / 1000) : (r / 1000).toFixed(r % 100 === 0 ? 1 : 2)) + ' kHz'; }

function fmtMs(sec) {
  const ms = sec * 1000;
  if (ms < 1) return ms.toFixed(3) + ' ms';
  if (ms < 10) return ms.toFixed(2) + ' ms';
  if (ms < 100) return ms.toFixed(1) + ' ms';
  return ms.toFixed(0) + ' ms';
}

function fmtMac(r) {
  if (r >= 1e9) return (r / 1e9).toFixed(2) + ' GMAC/s';
  const v = r / 1e6;
  return (v < 10 ? v.toFixed(2) : (v < 100 ? v.toFixed(1) : v.toFixed(0))) + ' MMAC/s';
}

function fmtClock(hz) { return (hz / 1e6).toFixed(0) + ' MHz'; }
function fmtNum(v) { return String(Number(v.toPrecision(3))); }
function fmtDb(v) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(1); }

function fmtPct(v) {
  if (v >= 1000) return Math.round(v) + ' %';
  return v.toFixed(1) + ' %';
}

function fmtMiss(p) {
  const v = 100 * p;
  if (v <= 0) return '0 %';
  if (v >= 99.95) return '100 %';
  if (v < 0.01) return '< 0.01 %';
  if (v < 1) return v.toFixed(2) + ' %';
  return v.toFixed(1) + ' %';
}

// ---------------------------------------------------------------- controls layout

function rowY(i) { return drawHeight + 20 + ROW_DY * i; }

// place a row of [label, element] pairs from x = 10; returns the right edge
function placeRow(items, y, size, dry) {
  textSize(size);
  let x = 10;
  const labels = [];
  for (const [label, el] of items) {
    if (label) {
      labels.push({ text: label, x: x, y: y });
      x += advW(label) + 6;
    }
    if (!dry) el.position(x, y - 12);
    x += el.elt.offsetWidth + 14;
  }
  return { right: x - 14, labels };
}

function layoutControls(force) {
  if (typeof resetButton === 'undefined') return;
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;

  const wideSets = [
    [['Sample rate', rateSelect], ['Processor', procSelect], ['Word length', wordSelect]],
    [['Rate', rateSelect], ['Processor', procSelect], ['Word', wordSelect]]
  ];
  let chosen = null;
  for (const set of wideSets) {
    if (placeRow(set, 0, 16, true).right <= canvasWidth - margin) { chosen = set; break; }
  }
  narrow = chosen === null;
  ctlRows = narrow ? 6 : 5;
  controlHeight = ctlRows * ROW_DY + 10;
  drawHeight = canvasHeight - controlHeight;
  ctlLabels = [];

  const size = narrow ? 14 : 16;
  let sliderRow0;
  if (!narrow) {
    ctlLabels.push(...placeRow(chosen, rowY(0), size, false).labels);
    sliderRow0 = 1;
  } else {
    ctlLabels.push(...placeRow([['Rate', rateSelect], ['Word', wordSelect]], rowY(0), size, false).labels);
    ctlLabels.push(...placeRow([['Processor', procSelect]], rowY(1), size, false).labels);
    sliderRow0 = 2;
  }
  const last = placeRow([['Speed', speedSelect], [null, pauseButton], [null, resetButton]], rowY(ctlRows - 1), size, false);
  ctlLabels.push(...last.labels);

  // slider labels: measure the longest text each one can show
  textSize(size);
  const longest = narrow ? ['Block B = 4096', 'Taps L = 512', 'Bkgd 50 % (n/a)']
                         : ['Block size B = 4096 samples', 'Filter taps L = 512', 'Background load = 50 %'];
  sliderLeftMargin = 10 + Math.max(...longest.map(advW)) + 12;
  const sw = Math.max(60, canvasWidth - sliderLeftMargin - margin);
  [blockSlider, tapsSlider, bgSlider].forEach((s, i) => {
    s.position(sliderLeftMargin, rowY(sliderRow0 + i) - 10);
    s.size(sw);
  });
  plotL = narrow ? 36 : 52;
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  layoutControls(false);
}
