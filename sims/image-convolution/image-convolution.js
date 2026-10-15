// 2-D Convolution and Image Filtering MicroSim
// CANVAS_HEIGHT: 672
// A 3x3 or 5x5 kernel h slides over a synthetic 32 x 32 grayscale image x (values 0-255).
// For the current pixel (m, n) = (row, column) the sim shows the kernel rotated by 180 degrees,
// the neighbourhood of x under it, the products and their sum:
//     y[m, n] = sum_i sum_j h[i, j] x[m - i, n - j]          (i, j = -R .. R)
// Four panels: the full input with the crop outlined, a zoom on a 12 x 12 crop where the window
// is animated, the output of that crop filling in as the window moves, and the full output.
// Unchecking "Flip kernel" computes the cross-correlation sum_i sum_j h[i, j] x[m + i, n + j].

// Canvas dimensions
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let drawHeight = 522;
let controlHeight = 150;
let canvasHeight = drawHeight + controlHeight;
let margin = 12;
let defaultTextSize = 16;

// Controls
let kernelSelect, playButton, stepButton;
let padCheckbox, normCheckbox, flipCheckbox, noiseCheckbox;
let displaySelect;
let cellInputs = [];                 // the nine text-input cells of the 3x3 kernel grid

// Image and animation constants
const N = 32;                        // the image is N x N pixels
const CROP = 12;                     // the window is animated over a CROP x CROP crop
const STEP_MS = 160;                 // about 6 pixels per second while playing
const NOISE_SIGMA = 12;              // standard deviation of the optional noise (gray levels)
const NOISE_SEED = 2026;             // fixed seed: the noisy image is the same on every load

const ONES5 = [[1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1]];
const KERNELS = [
  { key: 'identity',  label: 'Identity',      w: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] },
  { key: 'box3',      label: 'Box blur 3×3',  w: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
  { key: 'box5',      label: 'Box blur 5×5',  w: ONES5 },
  { key: 'gauss',     label: 'Gaussian 3×3',  w: [[1, 2, 1], [2, 4, 2], [1, 2, 1]] },
  { key: 'sharpen',   label: 'Sharpen',       w: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]] },
  { key: 'sobelx',    label: 'Sobel x',       w: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]] },
  { key: 'sobely',    label: 'Sobel y',       w: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]] },
  { key: 'laplacian', label: 'Laplacian',     w: [[0, 1, 0], [1, -4, 1], [0, 1, 0]] },
  { key: 'emboss',    label: 'Emboss',        w: [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]] },
  { key: 'custom',    label: 'Custom 3×3 (type in grid)', w: null }
];

const NOTES = {
  identity: 'Identity: only the centre weight is 1, so y = x. This kernel is the 2-D unit impulse δ[m, n].',
  box3: 'Box blur: each pixel becomes the mean of its 3 × 3 neighbourhood. The weights sum to 9, so Normalise divides by 9.',
  box5: 'Box blur 5 × 5: the mean of 25 pixels. Stronger smoothing: a sharp edge is spread over 5 pixels instead of 3.',
  gauss: 'Gaussian: a centre-weighted average (1-2-1 along each axis, ÷ 16). It smooths noise with less blurring than the box.',
  sharpen: 'Sharpen: 5 × centre minus the 4 neighbours (x minus the Laplacian). Weights sum to 1: flat areas stay, edges overshoot.',
  sobelx: 'Sobel x: a difference across the columns, smoothed 1-2-1 down the rows. Weights sum to 0, so flat areas give 0; vertical edges respond.',
  sobely: 'Sobel y: a difference across the rows, smoothed 1-2-1 along the columns. It responds to horizontal edges such as the thin line.',
  laplacian: 'Laplacian: the 4 neighbours minus 4 × centre, a discrete second derivative. It is 0 on flat areas and on linear ramps.',
  emboss: 'Emboss: a diagonal difference plus the centre (weights sum to 1). Edges facing one diagonal brighten, the opposite ones darken.',
  custom: 'Custom: type weights (decimals, or fractions such as 1/9) into the grid. The sum of the weights is the gain on flat regions.'
};
const HINT = 'Click a pixel in any panel to move the window, step it with the arrow keys, or press Play to sweep the 12 × 12 crop.';

// Colors
const COL_IN = [25, 90, 200];        // input x: blue
const COL_OUT = [30, 130, 70];       // output y: green
const COL_HI = [240, 175, 0];        // window and current pixel: gold
const COL_PAD = [205, 35, 35];       // padding cells (outside the image): red
const TINT_POS = [212, 228, 255];
const TINT_NEG = [255, 218, 218];

// State
let cleanImg, noisyImg, sigmaIn;
let crop = { r0: 2, c0: 7 };         // top-left pixel of the 12 x 12 crop
let cur = { m: 7, n: 13 };           // current output pixel (row m, column n)
let playing = false;
let lastStep = 0;
let customW = [[0, 0, 0], [0, 1, 0], [0, 0, 0]];
let cellBad = new Array(9).fill(false);
let st = { key: '', K: 3, R: 1 };
let L = {};                          // drawing-region layout, rebuilt every frame
let ctl = { narrow: false, width: -1, gridX: 0, gridTop: 0, iw: 48, ih: 24, gapX: 6, gapY: 8 };

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);
  makeImages();

  kernelSelect = createSelect();
  for (const k of KERNELS) kernelSelect.option(k.label, k.key);
  kernelSelect.selected('sobelx');
  kernelSelect.changed(onKernelChange);
  kernelSelect.style('font-size', '15px');

  playButton = createButton('Play');
  playButton.mousePressed(togglePlay);
  stepButton = createButton('Step');
  stepButton.mousePressed(stepOnce);

  padCheckbox = createCheckbox('Edge padding', false);
  normCheckbox = createCheckbox('Normalise (÷ sum)', true);
  flipCheckbox = createCheckbox('Flip kernel (convolution)', true);
  noiseCheckbox = createCheckbox('Add noise', false);

  displaySelect = createSelect();
  displaySelect.option('auto', 'auto');
  displaySelect.option('clip to 0–255', 'clip');
  displaySelect.option('signed (0 = gray)', 'signed');
  displaySelect.option('|y| (magnitude)', 'abs');
  displaySelect.selected('auto');
  displaySelect.style('font-size', '15px');

  for (let k = 0; k < 9; k++) {
    const inp = createInput('0', 'text');
    inp.input(() => onCellInput());
    inp.attribute('aria-label', 'kernel weight h[' + (Math.floor(k / 3) - 1) + ', ' + (k % 3 - 1) + ']');
    inp.style('box-sizing', 'border-box');
    inp.style('text-align', 'center');
    inp.style('padding', '0px');
    cellInputs.push(inp);
  }
  onKernelChange();
  layoutControls();
  describe('Two-dimensional convolution of a small synthetic grayscale image. Left to right: the 32 by 32 input image, ' +
    'a zoom on a 12 by 12 crop with a gold kernel window, the output of that crop filling in as the window slides, ' +
    'and the full output image. Below, the kernel rotated by 180 degrees, the pixel values under the window, their ' +
    'products and the sum are shown for the current pixel. Controls choose the kernel, edit a 3 by 3 kernel, play or ' +
    'step the window, and switch zero or edge padding, normalisation, kernel flipping, noise and the output display.');
}

function draw() {
  updateCanvasSize();
  readState();
  computeAll();
  if (playing && millis() - lastStep >= STEP_MS) {
    advance();
    lastStep = millis();
  }
  computeLayout();

  // Drawing region and control region
  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  drawHeader();
  drawFullPanel(L.xFull, true);
  drawZoomInput(L.xZoom);
  drawZoomOutput(L.yZoom);
  drawFullPanel(L.yFull, false);
  drawGapArrow();
  drawPanelCaptions();
  drawStatus();
  drawArithmetic();
  drawNotes();
  drawControlLabels();
}

// ---------------------------------------------------------------- image and kernel math

function makeImages() {
  cleanImg = new Array(N * N);
  for (let m = 0; m < N; m++) {
    for (let n = 0; n < N; n++) {
      let v = 40;                                                   // background
      if (m >= 22) v = 8 * n;                                       // horizontal ramp, 0 .. 248
      if (m >= 3 && m <= 12 && n >= 3 && n <= 12) v = 200;          // bright square
      if ((m - 7.5) ** 2 + (n - 25.5) ** 2 <= 4.6 * 4.6) v = 140;   // disc
      if (m === 7 && n === 17) v = 255;                             // single bright pixel (impulse)
      if (m === 17 && n >= 2 && n <= 29) v = 200;                   // thin horizontal line
      cleanImg[m * N + n] = v;
    }
  }
  const rnd = seededRandom(NOISE_SEED);
  noisyImg = new Array(N * N);
  const d = [];
  for (let k = 0; k < N * N; k++) {
    const u1 = Math.max(rnd(), 1e-12), u2 = rnd();
    const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);  // Box-Muller
    noisyImg[k] = Math.min(255, Math.max(0, Math.round(cleanImg[k] + NOISE_SIGMA * g)));
    d.push(noisyImg[k] - cleanImg[k]);
  }
  sigmaIn = stdDev(d);
}

// Small seeded PRNG (mulberry32)
function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inImage(m, n) { return m >= 0 && m < N && n >= 0 && n < N; }

// pixel value with zero or edge (replicate) padding outside the image
function pix(img, m, n) {
  if (inImage(m, n)) return img[m * N + n];
  if (st.pad === 'zero') return 0;
  return img[constrain(m, 0, N - 1) * N + constrain(n, 0, N - 1)];
}

// y[m, n] = (1/D) sum_i sum_j w[i, j] x[m - i, n - j]   (or x[m + i, n + j] without the flip)
function filterAt(img, m, n) {
  const R = st.R;
  let s = 0;
  for (let i = -R; i <= R; i++) {
    for (let j = -R; j <= R; j++) {
      const wv = st.w[i + R][j + R];
      if (wv === 0) continue;
      s += wv * (st.flip ? pix(img, m - i, n - j) : pix(img, m + i, n + j));
    }
  }
  return s / st.D;
}

function filterImage(img) {
  const out = new Array(N * N);
  for (let m = 0; m < N; m++) for (let n = 0; n < N; n++) out[m * N + n] = filterAt(img, m, n);
  return out;
}

function currentKernel() {
  if (st.kKey === 'custom') return customW.map(r => r.slice());
  const k = KERNELS.find(q => q.key === st.kKey) || KERNELS[5];
  return k.w;
}

function readState() {
  st.kKey = kernelSelect.value();
  st.pad = padCheckbox.checked() ? 'edge' : 'zero';
  st.norm = normCheckbox.checked();
  st.flip = flipCheckbox.checked();
  st.noise = noiseCheckbox.checked();
  st.disp = displaySelect.value();
}

function computeAll() {
  const w = currentKernel();
  const key = [st.kKey, JSON.stringify(w), st.pad, st.norm, st.flip, st.noise, st.disp].join('|');
  if (key === st.key) return;
  st.key = key;
  const K = w.length, R = (K - 1) / 2;
  let sumW = 0;
  for (const r of w) for (const v of r) sumW += v;
  if (Math.abs(sumW) < 1e-12) sumW = 0;
  const D = (st.norm && sumW !== 0) ? sumW : 1;
  Object.assign(st, { w: w, K: K, R: R, sumW: sumW, D: D });
  if (cur.m < crop.r0 || cur.m >= crop.r0 + CROP || cur.n < crop.c0 || cur.n >= crop.c0 + CROP) jumpTo(cur.m, cur.n, false);

  st.x = st.noise ? noisyImg : cleanImg;
  st.y = filterImage(st.x);
  let M = 0, lo = Infinity, hi = -Infinity;
  for (const v of st.y) {
    M = Math.max(M, Math.abs(v));
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  st.M = M > 1e-9 ? M : 1;
  st.yMin = lo;
  st.yMax = hi;
  st.mode = st.disp === 'auto' ? (Math.abs(sumW / D) < 1e-9 ? 'signed' : 'clip') : st.disp;
  if (st.noise) {
    const yc = filterImage(cleanImg);
    st.sigmaOut = stdDev(st.y.map((v, k) => v - yc[k]));
  } else {
    st.sigmaOut = null;
  }
  st.symmetric = isRotSymmetric(w);
  st.imgX = makeImageCanvas(st.x, v => v);
  st.imgY = makeImageCanvas(st.y, grayOf);
}

function isRotSymmetric(w) {
  const K = w.length;
  for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) if (w[a][b] !== w[K - 1 - a][K - 1 - b]) return false;
  return true;
}

// output value -> displayed gray level 0..255
function grayOf(v) {
  let g;
  if (st.mode === 'signed') g = 128 + 127 * v / st.M;
  else if (st.mode === 'abs') g = 255 * Math.abs(v) / st.M;
  else g = v;
  return Math.min(255, Math.max(0, Math.round(g)));
}

// the products for the current pixel: cell (a, b) of the window lies over x[m + a, n + b]
function neighbourhood() {
  const R = st.R, K = st.K;
  const cells = [];
  let S = 0;
  for (let a = -R; a <= R; a++) {
    const row = [];
    for (let b = -R; b <= R; b++) {
      const mm = cur.m + a, nn = cur.n + b;
      const xv = pix(st.x, mm, nn);
      const wv = st.flip ? st.w[R - a][R - b] : st.w[R + a][R + b];
      const p = wv * xv;
      S += p;
      row.push({ xv: xv, wv: wv, p: p, pad: !inImage(mm, nn) });
    }
    cells.push(row);
  }
  return { cells: cells, S: S, y: S / st.D, K: K };
}

function stdDev(a) {
  let s = 0, s2 = 0;
  for (const v of a) { s += v; s2 += v * v; }
  const mu = s / a.length;
  return Math.sqrt(Math.max(0, s2 / a.length - mu * mu));
}

// 32 x 32 offscreen canvas holding gray levels, drawn scaled up without smoothing
function makeImageCanvas(vals, mapFn) {
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const ctx = c.getContext('2d');
  const id = ctx.createImageData(N, N);
  for (let k = 0; k < N * N; k++) {
    const g = mapFn(vals[k]);
    id.data[4 * k] = g;
    id.data[4 * k + 1] = g;
    id.data[4 * k + 2] = g;
    id.data[4 * k + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  return c;
}

// ---------------------------------------------------------------- animation and interaction

function curIndex() { return (cur.m - crop.r0) * CROP + (cur.n - crop.c0); }

function advance() {
  const k = (curIndex() + 1) % (CROP * CROP);
  cur = { m: crop.r0 + Math.floor(k / CROP), n: crop.c0 + (k % CROP) };
}

function setPlaying(p) {
  playing = p;
  playButton.html(p ? 'Pause' : 'Play');
  lastStep = millis();
}

function togglePlay() { setPlaying(!playing); }

function stepOnce() {
  setPlaying(false);
  advance();
}

// move the current pixel; the crop recentres (full-image clicks) or shifts just enough to contain it
function jumpTo(m, n, recentre) {
  m = constrain(m, 0, N - 1);
  n = constrain(n, 0, N - 1);
  const inCrop = m >= crop.r0 && m < crop.r0 + CROP && n >= crop.c0 && n < crop.c0 + CROP;
  if (!inCrop) {
    if (recentre) {
      crop.r0 = constrain(m - CROP / 2 + 1, 0, N - CROP);
      crop.c0 = constrain(n - CROP / 2 + 1, 0, N - CROP);
    } else {
      if (m < crop.r0) crop.r0 = m;
      if (m >= crop.r0 + CROP) crop.r0 = m - CROP + 1;
      if (n < crop.c0) crop.c0 = n;
      if (n >= crop.c0 + CROP) crop.c0 = n - CROP + 1;
    }
  }
  cur = { m: m, n: n };
}

function mousePressed() {
  if (!L.xFull) return;
  for (const p of [L.xFull, L.yFull]) {
    if (mouseX >= p.x && mouseX < p.x + p.s && mouseY >= p.y && mouseY < p.y + p.s) {
      const c = p.s / N;
      jumpTo(Math.floor((mouseY - p.y) / c), Math.floor((mouseX - p.x) / c), true);
      setPlaying(false);
      return;
    }
  }
  for (const p of [L.xZoom, L.yZoom]) {
    if (mouseX >= p.x && mouseX < p.x + p.s && mouseY >= p.y && mouseY < p.y + p.s) {
      const span = CROP + 2 * st.R, c = p.s / span;
      const m = crop.r0 - st.R + Math.floor((mouseY - p.y) / c);
      const n = crop.c0 - st.R + Math.floor((mouseX - p.x) / c);
      if (inImage(m, n)) {
        jumpTo(m, n, false);
        setPlaying(false);
      }
      return;
    }
  }
}

function keyPressed() {
  const ae = document.activeElement;
  if (ae && (ae.tagName === 'SELECT' || (ae.tagName === 'INPUT' && ae.type === 'text'))) return;
  const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[key];
  if (!d) return;
  setPlaying(false);
  jumpTo(cur.m + d[0], cur.n + d[1], false);
  return false;
}

// ---------------------------------------------------------------- kernel grid (text-input cells)

function onKernelChange() {
  const key = kernelSelect.value();
  if (key === 'custom') {
    if (!cellInputs[0].elt.disabled) customW = readInputs();
    setInputs(customW, true);
  } else {
    const k = KERNELS.find(q => q.key === key);
    if (k && k.w.length === 3) setInputs(k.w, true);
    else setInputs(null, false);
  }
}

function setInputs(w, enabled) {
  for (let k = 0; k < 9; k++) {
    const inp = cellInputs[k];
    inp.elt.disabled = !enabled;
    inp.value(w ? String(w[Math.floor(k / 3)][k % 3]) : '');
    cellBad[k] = false;
    styleCell(k);
  }
}

function onCellInput() {
  customW = readInputs();
  kernelSelect.selected('custom');
}

function readInputs() {
  const w = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let k = 0; k < 9; k++) {
    const v = parseWeight(cellInputs[k].value());
    cellBad[k] = !Number.isFinite(v);
    w[Math.floor(k / 3)][k % 3] = cellBad[k] ? 0 : v;
    styleCell(k);
  }
  return w;
}

// accepts integers, decimals and simple fractions such as 1/9 or -2/16
function parseWeight(s) {
  s = String(s).trim().replace(/−/g, '-');
  if (s === '') return NaN;
  const f = s.match(/^([+-]?\d*\.?\d+)\s*\/\s*(\d*\.?\d+)$/);
  if (f) {
    const den = Number(f[2]);
    return den !== 0 ? Number(f[1]) / den : NaN;
  }
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  return Number(s);
}

function styleCell(k) {
  const inp = cellInputs[k];
  if (inp.elt.disabled) {
    inp.style('border', '1px solid #ccc');
    inp.style('background', '#eeeeee');
  } else if (cellBad[k]) {
    inp.style('border', '2px solid rgb(205, 35, 35)');
    inp.style('background', '#ffecec');
  } else {
    inp.style('border', '1px solid #999');
    inp.style('background', '#ffffff');
  }
}

// ---------------------------------------------------------------- layout

function computeLayout() {
  const W = canvasWidth;
  const narrow = W < 620;
  const g1 = narrow ? 6 : 14, g2 = narrow ? 16 : 30;
  const S = Math.floor(Math.min(200, (W - 2 * margin - 2 * g1 - g2) / 4));
  const total = 4 * S + 2 * g1 + g2;
  const x0 = Math.round((W - total) / 2);
  const top = 70;
  L.narrow = narrow;
  L.S = S;
  L.top = top;
  L.xFull = { x: x0, y: top, s: S };
  L.xZoom = { x: x0 + S + g1, y: top, s: S };
  L.yZoom = { x: x0 + 2 * S + g1 + g2, y: top, s: S };
  L.yFull = { x: x0 + 3 * S + 2 * g1 + g2, y: top, s: S };
  L.capBelow = top + S + 12;
  L.statusY = top + S + (narrow ? 30 : 32);

  // arithmetic block: three K x K grids, with the sum beside them (wide) or below them (narrow)
  const K = st.K;
  const opW = narrow ? 18 : 28;
  const avail = W - 2 * margin;
  const sumW = 214;
  const minSide = K === 3 ? 40 : 32;
  const maxCw = K === 3 ? 56 : 42;
  let cw = (avail - 2 * opW - 18 - sumW) / (3 * K);
  const side = cw >= minSide;
  if (!side) cw = (avail - 2 * opW) / (3 * K);
  cw = Math.floor(Math.min(maxCw, cw));
  const ch = K === 3 ? (narrow ? 28 : 32) : (narrow ? 19 : 22);
  const gridW = K * cw;
  const blockW = 3 * gridW + 2 * opW + (side ? 18 + sumW : 0);
  const arTop = L.statusY + (narrow ? 34 : 18);
  L.ar = { x: Math.round((W - blockW) / 2), cw: cw, ch: ch, opW: opW, side: side, gridW: gridW, sumW: sumW, blockW: blockW,
           titleY: arTop + 8, headY: arTop + 32, gridTop: arTop + 44 };
  L.ar.gridBottom = L.ar.gridTop + K * ch;
  L.noteTop = L.ar.gridBottom + (side ? 20 : 64);
}

// ---------------------------------------------------------------- drawing: header and panels

function drawHeader() {
  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(['2-D Convolution and Image Filtering', '2-D Convolution'], canvasWidth / 2, 16, canvasWidth - 20, 20, CENTER);
  textStyle(NORMAL);
  fill(40);
  const cands = st.flip ?
    ['y[m, n] = Σ_i Σ_j h[i, j] · x[m − i, n − j]:  rotate h by 180°, centre it on pixel (m, n), multiply and add',
     'y[m, n] = Σ_i Σ_j h[i, j] · x[m − i, n − j]   (2-D convolution)',
     'y[m, n] = Σ_i Σ_j h[i, j] · x[m − i, n − j]',
     'y = Σ h[i, j] · x[m − i, n − j]'] :
    ['y[m, n] = Σ_i Σ_j h[i, j] · x[m + i, n + j]:  cross-correlation, no rotation (what CNN layers compute)',
     'y[m, n] = Σ_i Σ_j h[i, j] · x[m + i, n + j]   (cross-correlation)',
     'y[m, n] = Σ_i Σ_j h[i, j] · x[m + i, n + j]',
     'y = Σ h[i, j] · x[m + i, n + j]'];
  fitText(cands, canvasWidth / 2, 40, canvasWidth - 2 * margin, L.narrow ? 14 : 15, CENTER);
}

function drawImageCanvas(c, x, y, s) {
  drawingContext.save();
  drawingContext.imageSmoothingEnabled = false;
  drawingContext.drawImage(c, x, y, s, s);
  drawingContext.restore();
}

function hiBox(x, y, w, h) {
  noFill();
  stroke(0);
  strokeWeight(3.5);
  rect(x, y, w, h);
  stroke(COL_HI[0], COL_HI[1], COL_HI[2]);
  strokeWeight(2);
  rect(x, y, w, h);
}

function dashedRect(x, y, w, h, col, weight) {
  noFill();
  stroke(col[0], col[1], col[2]);
  strokeWeight(weight);
  drawingContext.setLineDash([5, 3]);
  rect(x, y, w, h);
  drawingContext.setLineDash([]);
}

function drawFullPanel(p, isInput) {
  noFill();
  stroke(150);
  strokeWeight(1);
  rect(p.x - 1, p.y - 1, p.s + 2, p.s + 2);
  drawImageCanvas(isInput ? st.imgX : st.imgY, p.x, p.y, p.s);
  const c = p.s / N;
  dashedRect(p.x + crop.c0 * c, p.y + crop.r0 * c, CROP * c, CROP * c, COL_HI, 1.6);
  const r = isInput ? st.R : 0;
  const x0 = p.x + (cur.n - r) * c, y0 = p.y + (cur.m - r) * c;
  const sz = (2 * r + 1) * c;
  // the window may hang over the image border: clip it to the panel
  push();
  drawingContext.beginPath();
  drawingContext.rect(p.x - 2, p.y - 2, p.s + 4, p.s + 4);
  drawingContext.clip();
  hiBox(x0, y0, sz, sz);
  pop();
}

function zoomGridLines(p, span, c) {
  if (c < 8) return;
  stroke(110, 110, 110, 70);
  strokeWeight(0.6);
  for (let k = 1; k < span; k++) {
    line(p.x + k * c, p.y, p.x + k * c, p.y + p.s);
    line(p.x, p.y + k * c, p.x + p.s, p.y + k * c);
  }
}

function drawZoomInput(p) {
  const R = st.R, span = CROP + 2 * R, c = p.s / span;
  const pads = [];
  noStroke();
  for (let a = 0; a < span; a++) {
    for (let b = 0; b < span; b++) {
      const m = crop.r0 - R + a, n = crop.c0 - R + b;
      fill(pix(st.x, m, n));
      rect(p.x + b * c, p.y + a * c, c + 0.6, c + 0.6);
      if (!inImage(m, n)) pads.push([p.x + b * c, p.y + a * c]);
    }
  }
  // fade the ring outside the crop (the window still reads it)
  fill(240, 248, 255, 150);
  rect(p.x, p.y, p.s, R * c);
  rect(p.x, p.y + p.s - R * c, p.s, R * c);
  rect(p.x, p.y + R * c, R * c, p.s - 2 * R * c);
  rect(p.x + p.s - R * c, p.y + R * c, R * c, p.s - 2 * R * c);
  zoomGridLines(p, span, c);
  for (const q of pads) dashedRect(q[0] + 1.5, q[1] + 1.5, c - 3, c - 3, COL_PAD, 1.2);
  noFill();
  stroke(150);
  strokeWeight(1);
  rect(p.x - 1, p.y - 1, p.s + 2, p.s + 2);
  dashedRect(p.x + R * c, p.y + R * c, CROP * c, CROP * c, COL_HI, 1.6);
  // the kernel window and its centre
  const a0 = cur.m - crop.r0 + R, b0 = cur.n - crop.c0 + R;
  hiBox(p.x + (b0 - R) * c, p.y + (a0 - R) * c, st.K * c, st.K * c);
  noFill();
  stroke(COL_HI[0], COL_HI[1], COL_HI[2]);
  strokeWeight(1.5);
  rect(p.x + b0 * c + 2, p.y + a0 * c + 2, c - 4, c - 4);
}

function drawZoomOutput(p) {
  const R = st.R, span = CROP + 2 * R, c = p.s / span;
  const k0 = curIndex();
  noStroke();
  fill(255);
  rect(p.x + R * c, p.y + R * c, CROP * c, CROP * c);
  for (let a = 0; a < CROP; a++) {
    for (let b = 0; b < CROP; b++) {
      const k = a * CROP + b;
      if (k > k0) continue;                                  // not computed yet
      const m = crop.r0 + a, n = crop.c0 + b;
      fill(grayOf(st.y[m * N + n]));
      rect(p.x + (b + R) * c, p.y + (a + R) * c, c + 0.6, c + 0.6);
    }
  }
  zoomGridLines({ x: p.x + R * c, y: p.y + R * c, s: CROP * c }, CROP, c);
  noFill();
  stroke(150);
  strokeWeight(1);
  rect(p.x - 1, p.y - 1, p.s + 2, p.s + 2);
  dashedRect(p.x + R * c, p.y + R * c, CROP * c, CROP * c, COL_HI, 1.6);
  const a0 = cur.m - crop.r0 + R, b0 = cur.n - crop.c0 + R;
  hiBox(p.x + b0 * c, p.y + a0 * c, c, c);
}

// arrow in the gap between the two zooms, at the height of the current row
function drawGapArrow() {
  const R = st.R, c = L.S / (CROP + 2 * R);
  const y = L.top + (cur.m - crop.r0 + R + 0.5) * c;
  const x0 = L.xZoom.x + L.S + 3, x1 = L.yZoom.x - 3;
  if (x1 - x0 < 8) return;
  stroke(COL_HI[0], COL_HI[1], COL_HI[2]);
  strokeWeight(2.5);
  line(x0, y, x1 - 6, y);
  noStroke();
  fill(COL_HI[0], COL_HI[1], COL_HI[2]);
  triangle(x1, y, x1 - 8, y - 5, x1 - 8, y + 5);
}

function drawPanelCaptions() {
  const sz = L.narrow ? 12 : 14;
  const w = L.S + (L.narrow ? 4 : 12);           // a caption may overhang its panel by less than half a gap
  const capY = L.top - 11;
  textStyle(BOLD);
  noStroke();
  // use the same wording level for all four captions: the longest one that fits every panel
  const caps = [['Input image x (32 × 32)', 'Input x', 'x'], ['Zoom on x, window h', 'x zoom', 'x'],
                ['Zoom on y, filling in', 'y zoom', 'y'], ['Output image y', 'Output y', 'y']];
  let lvl = 0;
  while (lvl < 2 && caps.some(c => richWidth(c[lvl], sz) > w)) lvl++;
  const px = [L.xFull.x, L.xZoom.x, L.yZoom.x, L.yFull.x];
  caps.forEach((c, i) => {
    fill(i < 2 ? COL_IN : COL_OUT);
    richText(c[lvl], px[i] + L.S / 2, capY, sz, CENTER);
  });
  textStyle(NORMAL);

  fill(70);
  const r1 = crop.r0, r2 = crop.r0 + CROP - 1, c1 = crop.c0, c2 = crop.c0 + CROP - 1;
  fitText(['click to move the crop', 'click to move', ''], L.xFull.x + L.S / 2, L.capBelow, w, sz, CENTER);
  fitText(['rows ' + r1 + '–' + r2 + ', cols ' + c1 + '–' + c2, 'r ' + r1 + '–' + r2 + ', c ' + c1 + '–' + c2, ''],
          L.xZoom.x + L.S / 2, L.capBelow, w, sz, CENTER);
  const yv = fmtV(st.y[cur.m * N + cur.n]);
  fill(COL_OUT);
  fitText(['y[' + cur.m + ', ' + cur.n + '] = ' + yv, 'y = ' + yv, yv], L.yZoom.x + L.S / 2, L.capBelow, w, sz, CENTER);
  fill(70);
  const rng = fmtV(st.yMin) + ' … ' + fmtV(st.yMax);
  fitText(['range ' + rng, rng, ''], L.yFull.x + L.S / 2, L.capBelow, w, sz, CENTER);
}

// display mapping, output range and (optionally) the noise level
function drawStatus() {
  const M = fmtV(st.M);
  let map;
  if (st.mode === 'signed') {
    map = ['Output shown as 128 + 127·y / ' + M + ' (gray = 0, white = +' + M + ', black = −' + M + ')',
           'Shown as 128 + 127·y / ' + M + ' (gray = 0)', 'Shown as 128 + 127·y/' + M];
  } else if (st.mode === 'abs') {
    map = ['Output shown as 255·|y| / ' + M + ' (black = 0, white = |y| of ' + M + ')',
           'Shown as 255·|y| / ' + M + ' (black = 0)', 'Shown as 255·|y|/' + M];
  } else {
    const out = st.yMin < -0.005 || st.yMax > 255.005;
    map = ['Output shown as y clipped to 0–255' + (out ? ': values below 0 are black, above 255 white' : ''),
           'Shown as y clipped to 0–255', 'Clipped to 0–255'];
  }
  const rng = ['y ranges from ' + fmtV(st.yMin) + ' to ' + fmtV(st.yMax), 'y: ' + fmtV(st.yMin) + ' … ' + fmtV(st.yMax)];
  const noise = st.noise ? ['noise σ: x ' + sigmaIn.toFixed(1) + ' → y ' + st.sigmaOut.toFixed(1),
                            'σ ' + sigmaIn.toFixed(1) + ' → ' + st.sigmaOut.toFixed(1)] : null;
  const sep = '   ·   ';
  const lines = [];
  for (let i = 0; i < 3; i++) {
    const a = map[Math.min(i, map.length - 1)], b = rng[Math.min(i, 1)];
    lines.push(noise ? a + sep + b + sep + noise[Math.min(i, 1)] : a + sep + b);
  }
  noStroke();
  fill(50);
  const maxW = canvasWidth - 2 * margin;
  const sz = L.narrow ? 13 : 14;
  for (const s of lines) {
    if (richWidth(s, sz) <= maxW) { richText(s, canvasWidth / 2, L.statusY, sz, CENTER); return; }
  }
  // narrow screens: two lines
  fitText(map, canvasWidth / 2, L.statusY, maxW, sz, CENTER);
  fitText([noise ? rng[1] + sep + noise[1] : rng[0], noise ? rng[1] + ' · ' + noise[1] : rng[1]],
          canvasWidth / 2, L.statusY + 18, maxW, sz, CENTER);
}

// ---------------------------------------------------------------- drawing: multiply-add

function tintOf(v) {
  if (v > 1e-12) return TINT_POS;
  if (v < -1e-12) return TINT_NEG;
  return [255, 255, 255];
}

function cellText(s, cx, cy, w, sz) {
  textSize(sz);
  while (sz > 8 && advW(s) > w - 3) { sz -= 1; textSize(sz); }
  textAlign(CENTER, CENTER);
  text(s, cx, cy);
}

function drawArithmetic() {
  const A = L.ar, K = st.K, R = st.R;
  const nb = neighbourhood();
  const yv = st.y[cur.m * N + cur.n];
  const pt = '(' + cur.m + ', ' + cur.n + ')';

  // title
  noStroke();
  fill('black');
  textStyle(BOLD);
  let tail;
  if (!st.flip) tail = 'cross-correlation: h is used as typed, not rotated';
  else if (st.symmetric) tail = 'this kernel is unchanged by a 180° rotation';
  else tail = 'rotating this kernel by 180° changes it';
  fitText(['Multiply-add at pixel (m, n) = ' + pt + ':  ' + tail, 'Multiply-add at pixel (m, n) = ' + pt,
           'Multiply-add at ' + pt, 'Pixel ' + pt], canvasWidth / 2, A.titleY, canvasWidth - 2 * margin, L.narrow ? 14 : 16, CENTER);

  // grid headers
  const gx = [A.x, A.x + A.gridW + A.opW, A.x + 2 * (A.gridW + A.opW)];
  const hw = A.gridW + A.opW - 4;
  const hs = L.narrow ? 12 : 14;
  const h1 = st.flip ? (st.symmetric ? ['h rotated 180° (= h)', 'h rotated 180°', 'h rot. 180°', 'h'] : ['h rotated 180°', 'h rot. 180°', 'h'])
                     : ['h, not rotated', 'h as typed', 'h'];
  fill(90, 60, 0);
  fitText(h1, gx[0] + A.gridW / 2, A.headY, hw, hs, CENTER);
  fill(COL_IN);
  fitText(['x around ' + pt, 'x near ' + pt, 'x'], gx[1] + A.gridW / 2, A.headY, hw, hs, CENTER);
  fill(60);
  fitText(['products h · x', 'products', 'h·x'], gx[2] + A.gridW / 2, A.headY, hw, hs, CENTER);
  textStyle(NORMAL);

  // the three grids
  const ts = constrain(Math.floor(Math.min(A.cw * 0.36, A.ch * 0.55)), 10, 15);
  for (let a = 0; a < K; a++) {
    for (let b = 0; b < K; b++) {
      const c = nb.cells[a][b];
      const y0 = A.gridTop + a * A.ch;
      const cx = b * A.cw;
      // kernel weight
      stroke(170);
      strokeWeight(1);
      fill(tintOf(c.wv));
      rect(gx[0] + cx, y0, A.cw, A.ch);
      noStroke();
      fill(c.wv < 0 ? [150, 20, 20] : (c.wv > 0 ? [20, 60, 150] : [120, 120, 120]));
      cellText(fmtV(c.wv), gx[0] + cx + A.cw / 2, y0 + A.ch / 2, A.cw, ts);
      // pixel value, drawn in its own gray level
      stroke(170);
      fill(c.xv);
      rect(gx[1] + cx, y0, A.cw, A.ch);
      noStroke();
      fill(c.xv < 120 ? 255 : 0);
      cellText(fmtV(c.xv), gx[1] + cx + A.cw / 2, y0 + A.ch / 2, A.cw, ts);
      if (c.pad) dashedRect(gx[1] + cx + 2, y0 + 2, A.cw - 4, A.ch - 4, COL_PAD, 1.5);
      // product
      stroke(170);
      fill(tintOf(c.p));
      rect(gx[2] + cx, y0, A.cw, A.ch);
      noStroke();
      fill(c.p < 0 ? [150, 20, 20] : (c.p > 0 ? [20, 60, 150] : [120, 120, 120]));
      cellText(fmtV(c.p), gx[2] + cx + A.cw / 2, y0 + A.ch / 2, A.cw, ts);
    }
  }
  // centre cells (the current pixel) and grid frames
  for (const g of gx) {
    noFill();
    stroke(90);
    strokeWeight(1.5);
    rect(g, A.gridTop, A.gridW, K * A.ch);
    stroke(COL_HI[0], COL_HI[1], COL_HI[2]);
    strokeWeight(2.5);
    rect(g + R * A.cw + 1.5, A.gridTop + R * A.ch + 1.5, A.cw - 3, A.ch - 3);
  }
  // operators
  const yc = A.gridTop + K * A.ch / 2;
  noStroke();
  fill(40);
  textStyle(BOLD);
  textSize(L.narrow ? 16 : 20);
  textAlign(CENTER, CENTER);
  text('×', gx[0] + A.gridW + A.opW / 2, yc);
  text('=', gx[1] + A.gridW + A.opW / 2, yc);
  textStyle(NORMAL);

  // the sum
  let dTxt;
  if (!st.norm) dTxt = '÷ D = 1  (Normalise off)';
  else if (st.sumW === 0) dTxt = '÷ D = 1  (weights sum to 0)';
  else dTxt = '÷ D = ' + fmtV(st.D) + '  (sum of weights)';
  const gTxt = 'shown as gray ' + grayOf(yv);
  const yTxt = 'y[' + cur.m + ', ' + cur.n + '] = ' + fmtV(yv);
  const sTxt = 'Σ products = ' + fmtV(nb.S);
  if (A.side) {
    const sx = gx[2] + A.gridW + 18;
    fill(30);
    richText(sTxt, sx, yc - 33, 16, LEFT);
    fill(70);
    richText(dTxt, sx, yc - 11, 14, LEFT);
    fill(COL_OUT);
    textStyle(BOLD);
    richText(yTxt, sx, yc + 12, 17, LEFT);
    textStyle(NORMAL);
    fill(70);
    richText(gTxt, sx, yc + 34, 14, LEFT);
  } else {
    const maxW = canvasWidth - 2 * margin;
    const sz = L.narrow ? 14 : 15;
    fill(30);
    fitText([sTxt + '     ' + dTxt, sTxt + '   ÷ D = ' + fmtV(st.D), sTxt],
            canvasWidth / 2, A.gridBottom + 20, maxW, sz, CENTER);
    fill(COL_OUT);
    textStyle(BOLD);
    fitText([yTxt + '   →   ' + gTxt, yTxt + ' → gray ' + grayOf(yv), yTxt],
            canvasWidth / 2, A.gridBottom + 42, maxW, sz + 1, CENTER);
    textStyle(NORMAL);
  }
}

function drawNotes() {
  let note = NOTES[st.kKey] || '';
  if (st.kKey === 'custom') note += ' Sum of weights = ' + fmtV(st.sumW) + '.';
  const sz = L.narrow ? 13 : 14;
  const maxW = canvasWidth - 2 * margin;
  const lh = sz + 4;
  let lines = wrapLines(note, maxW, sz);
  const room = Math.floor((drawHeight - 6 - L.noteTop) / lh) + 1;
  const hint = wrapLines(HINT, maxW, sz);
  noStroke();
  fill(50);
  let y = L.noteTop;
  for (const s of lines.slice(0, room)) { richText(s, margin, y, sz, LEFT); y += lh; }
  if (lines.length + hint.length <= room) {
    fill(110);
    for (const s of hint) { richText(s, margin, y, sz, LEFT); y += lh; }
  }
}

function wrapLines(s, maxW, sz) {
  const words = s.split(' ');
  const out = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (richWidth(t, sz) <= maxW || !line) line = t;
    else { out.push(line); line = w; }
  }
  if (line) out.push(line);
  return out;
}

// ---------------------------------------------------------------- controls

function rowY(i) { return ctl.narrow ? drawHeight + 16 + 28 * i : drawHeight + 20 + 34 * i; }

function drawControlLabels() {
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  if (!ctl.narrow) {
    textStyle(BOLD);
    textSize(defaultTextSize);
    text('Kernel:', 10, rowY(0));
    textStyle(NORMAL);
    text('Output display:', 10, rowY(3));
  } else {
    textSize(14);
    text('Show:', 10, rowY(4));
  }
  // kernel grid title and indices
  const gx = ctl.gridX, gw = 3 * ctl.iw + 2 * ctl.gapX;
  textStyle(BOLD);
  fill(90, 60, 0);
  const title = st.K === 5 ? (ctl.narrow ? 'h: 5×5 ones' : 'h is 5×5 (all 1)') : (ctl.narrow ? 'h[i, j]' : 'Kernel h[i, j]');
  fitText([title], gx + gw / 2, drawHeight + (ctl.narrow ? 11 : 13), gw + 40, ctl.narrow ? 13 : 15, CENTER);
  textStyle(NORMAL);
  fill(90);
  textSize(12);
  textAlign(CENTER, CENTER);
  const jl = ['j = −1', 'j = 0', 'j = 1'], js = ['−1', '0', '1'];
  for (let j = 0; j < 3; j++) {
    const s = ctl.iw >= 44 ? jl[j] : js[j];
    text(s, gx + j * (ctl.iw + ctl.gapX) + ctl.iw / 2, ctl.gridTop - 9);
  }
  textAlign(RIGHT, CENTER);
  for (let i = 0; i < 3; i++) {
    const s = ctl.narrow ? ['−1', '0', '1'][i] : ['i = −1', 'i = 0', 'i = 1'][i];
    text(s, gx - 5, ctl.gridTop + i * (ctl.ih + ctl.gapY) + ctl.ih / 2);
  }
}

function setCheckboxLabel(cb, s, px) {
  const span = cb.elt.querySelector('span');
  if (span) span.textContent = s;
  cb.style('font-size', px + 'px');
}

function layoutControls() {
  if (typeof displaySelect === 'undefined' || cellInputs.length < 9 || canvasWidth === ctl.width) return;
  ctl.width = canvasWidth;
  const W = canvasWidth;
  const narrow = W < 620;
  ctl.narrow = narrow;

  // the 3 x 3 kernel grid at the right
  ctl.iw = narrow ? 40 : 48;
  ctl.ih = narrow ? 22 : 24;
  ctl.gapX = narrow ? 4 : 6;
  ctl.gapY = narrow ? 5 : 8;
  const gw = 3 * ctl.iw + 2 * ctl.gapX;
  ctl.gridX = W - margin - gw;
  ctl.gridTop = drawHeight + (narrow ? 38 : 42);
  for (let k = 0; k < 9; k++) {
    const i = Math.floor(k / 3), j = k % 3;
    const inp = cellInputs[k];
    inp.position(ctl.gridX + j * (ctl.iw + ctl.gapX), ctl.gridTop + i * (ctl.ih + ctl.gapY));
    inp.style('width', ctl.iw + 'px');
    inp.style('height', ctl.ih + 'px');
    inp.style('font-size', (narrow ? 13 : 15) + 'px');
  }
  const leftR = ctl.gridX - (narrow ? 26 : 44) - 8;     // room for the row labels i = ...

  const cbPx = narrow ? 14 : 16;
  setCheckboxLabel(padCheckbox, narrow ? 'Edge pad' : 'Edge padding', cbPx);
  setCheckboxLabel(normCheckbox, narrow ? 'Normalise' : 'Normalise (÷ sum)', cbPx);
  setCheckboxLabel(flipCheckbox, narrow ? 'Flip (conv.)' : 'Flip kernel (convolution)', cbPx);
  setCheckboxLabel(noiseCheckbox, narrow ? 'Noise' : 'Add noise', cbPx);

  if (!narrow) {
    const selX = 76;
    const selW = Math.max(120, Math.min(210, leftR - selX - 140));
    kernelSelect.position(selX, rowY(0) - 12);
    kernelSelect.style('width', selW + 'px');
    playButton.position(selX + selW + 10, rowY(0) - 12);
    playButton.style('width', '64px');
    stepButton.position(selX + selW + 80, rowY(0) - 12);
    stepButton.style('width', '58px');
    padCheckbox.position(10, rowY(1) - 11);
    flipCheckbox.position(10, rowY(2) - 11);
    const colB = 10 + Math.max(padCheckbox.elt.offsetWidth, flipCheckbox.elt.offsetWidth) + 22;
    normCheckbox.position(colB, rowY(1) - 11);
    noiseCheckbox.position(colB, rowY(2) - 11);
    displaySelect.position(134, rowY(3) - 12);
    displaySelect.style('width', Math.max(120, Math.min(190, leftR - 134)) + 'px');
  } else {
    kernelSelect.position(10, rowY(0) - 12);
    kernelSelect.style('width', Math.max(100, leftR - 10) + 'px');
    playButton.position(10, rowY(1) - 12);
    playButton.style('width', '60px');
    stepButton.position(78, rowY(1) - 12);
    stepButton.style('width', '54px');
    padCheckbox.position(8, rowY(2) - 10);
    flipCheckbox.position(8, rowY(3) - 10);
    const colB = 8 + Math.max(padCheckbox.elt.offsetWidth, flipCheckbox.elt.offsetWidth) + 8;
    normCheckbox.position(colB, rowY(2) - 10);
    noiseCheckbox.position(colB, rowY(3) - 10);
    displaySelect.position(56, rowY(4) - 12);
    displaySelect.style('width', Math.max(90, leftR - 56) + 'px');
  }
}

// ---------------------------------------------------------------- text helpers

// Rich text: "Σ_i" draws the character after '_' as a subscript
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
  return typeof fontWidth === 'function' ? fontWidth(String(s)) : textWidth(String(s));
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
    if (richWidth(c, sz) <= maxW) { richText(c, x, y, sz, align); return c; }
  }
  const last = cands[cands.length - 1];
  if (last) richText(last, x, y, sz, align);
  return last;
}

// number with a true minus sign, at most two decimals, no trailing zeros
function fmtV(v) {
  const r = Math.round(v * 100) / 100;
  if (Math.abs(r) < 1e-12) return '0';
  return (r < 0 ? '−' : '') + String(Math.abs(r));
}

// ---------------------------------------------------------------- responsive layout

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  layoutControls();
}
