// Multirate Sample Rate Converter MicroSim
// CANVAS_HEIGHT: 570
// Rational sample-rate conversion by L/M: upsample by L (insert L-1 zeros), low-pass FIR
// filter (cutoff pi/max(L,M) at the high rate, gain L), then downsample by M.
// Spectra and stem plots are shown at four points of the chain, with the sample rate at each
// node, the error against an ideal converter, and the multiplications per output sample.

// Canvas dimensions
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let drawHeight = 460;
let controlHeight = 110;
let canvasHeight = drawHeight + controlHeight;
let margin = 12;
let defaultTextSize = 16;

// Signal model: 64 ms analysis segment at 8 kHz with 10 ms of padding on each side
const FS_IN = 8000;                  // input sample rate (Hz)
const N_IN = 512;                    // input samples in the analysis segment
const PAD = 80;                      // padding (input samples) so the filter is in steady state
const NX = N_IN + 2 * PAD;
const T_SEG = N_IN / FS_IN;          // 0.064 s
const TW_START = 0.031;              // stem-plot window: 31 ms ...
const TW_LEN = 0.002;                // ... to 33 ms (16 input samples)
const DB_FLOOR = -80;                // bottom of every spectrum plot

// Input signals (all components lie below the input Nyquist frequency of 4 kHz)
const TONES = [
  { f: 500, a: 0.5, p: 0.3 },
  { f: 1200, a: 0.3, p: 1.1 },
  { f: 3100, a: 0.2, p: 2.0 }
];
const CHIRP = { fa: 100, fb: 3800, a: 0.8 };   // linear sweep across the padded record
let noiseComps = [];                 // 200 random-phase sinusoids with a falling spectrum

// Colors
const C_SIG = [25, 90, 200];         // samples / time domain: blue
const C_SPEC = [128, 0, 0];          // spectrum: maroon
const C_FILT = [205, 150, 0];        // filter response: gold
const C_ERR = [215, 30, 30];         // error, aliasing, output Nyquist: red
const C_IDEAL = [165, 165, 165];     // continuous reference curve: gray

// Controls
let lSlider, mSlider, tapsSlider, signalSelect, filterCheckbox;
let layoutWidth = -1;
let compact = false;
let ctl = {};

// Model cache: recomputed only when a control changes
let model = null;
let modelKey = '';
let G = null;                        // geometry for the current width

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);
  buildNoise();

  lSlider = createSlider(1, 8, 3, 1);
  mSlider = createSlider(1, 8, 2, 1);
  tapsSlider = createSlider(8, 128, 48, 1);

  signalSelect = createSelect();
  signalSelect.option('multi-tone', 'multi');
  signalSelect.option('linear chirp', 'chirp');
  signalSelect.option('colored noise', 'noise');
  signalSelect.selected('multi');
  signalSelect.style('font-size', '15px');

  filterCheckbox = createCheckbox(' Low-pass filter on', true);
  filterCheckbox.style('font-size', '16px');

  layoutControls(true);

  describe('A rational sample rate converter: upsample by L, low-pass filter, downsample by M. A pipeline diagram shows the sample rate at each node. Four columns show the magnitude spectrum in decibels and a short stem plot of the samples at the input, after zero insertion, after the filter, and at the output, each with its Nyquist frequency marked. Sliders set L, M and the filter length; a checkbox bypasses the filter; a menu chooses a multi-tone, chirp or noise input.');
}

function draw() {
  updateCanvasSize();
  const L = Number(lSlider.value());
  const M = Number(mSlider.value());
  const N = Number(tapsSlider.value());
  const filterOn = filterCheckbox.checked();
  const kind = signalSelect.value();
  const key = [L, M, N, filterOn, kind].join('|');
  if (key !== modelKey) {
    model = computeModel(L, M, N, filterOn, kind);
    modelKey = key;
  }
  G = computeGeometry();

  // Regions
  noStroke();
  fill('aliceblue');
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  drawTitle();
  drawPipeline();
  for (let i = 0; i < 4; i++) drawPanel(i);
  drawInfo();
  drawHover();
  drawControlLabels();
}

// ---------------------------------------------------------------- signals

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildNoise() {
  const rnd = mulberry32(20261014);
  noiseComps = [];
  let p = 0;
  for (let i = 0; i < 200; i++) {
    const f = 50 + rnd() * 3900;                     // 50 Hz .. 3950 Hz
    const a = Math.exp(-f / 1500);                   // about 23 dB lower at 4 kHz than at 0 Hz
    noiseComps.push({ f, a, p: rnd() * 2 * Math.PI });
    p += a * a / 2;
  }
  const g = 0.3 / Math.sqrt(p);                      // RMS 0.3
  for (const c of noiseComps) c.a *= g;
}

// Value of the chosen input at time t (s); components at or above fcut (Hz) are left out,
// which makes the same function the ideal band-limited output of a perfect converter.
function sigValue(kind, t, fcut) {
  if (kind === 'multi' || kind === 'noise') {
    const comps = kind === 'multi' ? TONES : noiseComps;
    let s = 0;
    for (const c of comps) if (c.f < fcut) s += c.a * Math.cos(2 * Math.PI * c.f * t + c.p);
    return s;
  }
  const tt = t + PAD / FS_IN;
  const k = (CHIRP.fb - CHIRP.fa) / (NX / FS_IN);
  const fi = CHIRP.fa + k * tt;
  let g = 1;
  if (fcut < FS_IN / 2) g = 0.5 * (1 - Math.tanh((fi - fcut) / 80));
  return CHIRP.a * g * Math.cos(2 * Math.PI * (CHIRP.fa * tt + 0.5 * k * tt * tt));
}

// Windowed-sinc low-pass (Hamming), cutoff pi/max(L,M) at the high rate, DC gain L
function designFilter(N, L, M) {
  const fc = 0.5 / Math.max(L, M);                   // cycles per sample
  const c = (N - 1) / 2;
  const h = new Float64Array(N);
  let sum = 0;
  for (let n = 0; n < N; n++) {
    const x = n - c;
    const s = Math.abs(x) < 1e-12 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x);
    const w = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1));
    h[n] = s * w;
    sum += h[n];
  }
  for (let n = 0; n < N; n++) h[n] *= L / sum;
  return h;
}

function computeModel(L, M, N, filterOn, kind) {
  const fsMid = FS_IN * L;
  const fsOut = FS_IN * L / M;
  const fcIdeal = Math.min(FS_IN, fsOut) / 2;

  // 1. input
  const x = new Float64Array(NX);
  for (let n = 0; n < NX; n++) x[n] = sigValue(kind, (n - PAD) / FS_IN, Infinity);

  // 2. zero insertion
  const NU = NX * L;
  const u = new Float64Array(NU);
  for (let n = 0; n < NX; n++) u[n * L] = x[n];

  // 3. filter (delay (N-1)/2 removed; an odd half sample is carried by the ideal reference)
  let v, h = null, halfShift = 0;
  const kS = PAD * L, kE = (PAD + N_IN) * L;
  const mS = Math.ceil(kS / M), mE = Math.ceil(kE / M);
  let polyMults = 0, polyCount = 0;
  if (filterOn) {
    h = designFilter(N, L, M);
    const D0 = Math.floor((N - 1) / 2);
    halfShift = (N - 1) / 2 - D0;
    v = new Float64Array(NU);
    for (let k = 0; k < NU; k++) {
      const kept = (k % M === 0) && k >= mS * M && k < mE * M;
      let s = 0, cnt = 0;
      for (let j = (k + D0) % L; j < N; j += L) {
        const idx = k + D0 - j;
        if (idx < 0) break;
        if (idx < NU) { s += h[j] * u[idx]; cnt++; }
      }
      v[k] = s;
      if (kept) { polyMults += cnt; polyCount++; }
    }
  } else {
    v = u;
  }

  // 4. downsampling
  const NY = Math.floor((NU - 1) / M) + 1;
  const y = new Float64Array(NY);
  for (let m = 0; m < NY; m++) y[m] = v[m * M];

  // Ideal converter output at the output instants, and the error
  const shift = halfShift / fsMid;
  const ny = mE - mS;
  const e = new Float64Array(ny);
  let pe = 0, px = 0;
  for (let i = 0; i < ny; i++) {
    const m = mS + i;
    const t = (m * M - PAD * L) / fsMid - shift;
    e[i] = y[m] - sigValue(kind, t, fcIdeal);
    pe += e[i] * e[i];
  }
  for (let n = PAD; n < PAD + N_IN; n++) px += x[n] * x[n];
  const errDb = 10 * Math.log10(Math.max(pe / ny, 1e-14) / (px / N_IN));

  // Spectra of the analysis segment at each stage
  const specs = [
    spectrum(x, PAD, PAD + N_IN, FS_IN),
    spectrum(u, kS, kE, fsMid),
    spectrum(v, kS, kE, fsMid),
    spectrum(y, mS, mE, fsOut)
  ];
  const errSpec = spectrum(e, 0, ny, fsOut);

  // Filter magnitude response |H|/L
  let hResp = null;
  if (h) {
    const NF = 4096;
    const re = new Float64Array(NF), im = new Float64Array(NF);
    for (let n = 0; n < N; n++) re[n] = h[n];
    fftInPlace(re, im);
    const amp = new Float64Array(NF / 2 + 1);
    for (let k = 0; k <= NF / 2; k++) amp[k] = Math.hypot(re[k], im[k]) / L;
    hResp = { amp, binHz: fsMid / NF };
  }

  // Stem windows (same 2 ms of time at every stage)
  const stems = [];
  const t2k = (t, rate, off) => Math.round(t * rate + off);
  {
    const a0 = t2k(TW_START, FS_IN, PAD), a1 = t2k(TW_START + TW_LEN, FS_IN, PAD);
    const s0 = [];
    for (let n = a0; n < a1; n++) s0.push({ t: (n - PAD) / FS_IN, v: x[n], z: false });
    stems.push(s0);
    const b0 = t2k(TW_START, fsMid, PAD * L), b1 = t2k(TW_START + TW_LEN, fsMid, PAD * L);
    const s1 = [], s2 = [];
    for (let k = b0; k < b1; k++) {
      const t = (k - PAD * L) / fsMid;
      s1.push({ t, v: u[k], z: k % L !== 0 });
      s2.push({ t, v: v[k], z: !filterOn && k % L !== 0 });
    }
    stems.push(s1, s2);
    const s3 = [];
    for (let m = Math.ceil(b0 / M); m * M < b1; m++) {
      s3.push({ t: (m * M - PAD * L) / fsMid, v: y[m], z: !filterOn && (m * M) % L !== 0 });
    }
    stems.push(s3);
  }

  // Continuous reference curves for the stem plots
  const curveIn = [], curveIdeal = [];
  for (let i = 0; i <= 160; i++) {
    const t = TW_START + TW_LEN * i / 160;
    curveIn.push(sigValue(kind, t, Infinity));
    curveIdeal.push(sigValue(kind, t, fcIdeal));
  }

  const peaks = kind === 'multi' ? findPeaks(specs[3]) : null;

  return {
    L, M, N, filterOn, kind, fsMid, fsOut, fcIdeal, specs, errSpec, hResp, stems,
    curveIn, curveIdeal, errDb, peaks,
    direct: filterOn ? N * M : 0,
    poly: filterOn && polyCount ? polyMults / polyCount : 0
  };
}

// ---------------------------------------------------------------- FFT and spectra

function fftInPlace(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = -2 * Math.PI / len;
    for (let k = 0; k < half; k++) {
      const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
      for (let i = k; i < n; i += len) {
        const j = i + half;
        const ar = re[j] * wr - im[j] * wi;
        const ai = re[j] * wi + im[j] * wr;
        re[j] = re[i] - ar; im[j] = im[i] - ai;
        re[i] += ar; im[i] += ai;
      }
    }
  }
}

// Blackman-Harris (4-term) windowed amplitude spectrum: a sine of amplitude A reads A
function spectrum(arr, s, e, fs) {
  const len = e - s;
  let nfft = 1024;
  while (nfft < 2 * len) nfft <<= 1;
  const re = new Float64Array(nfft), im = new Float64Array(nfft);
  let wsum = 0;
  for (let i = 0; i < len; i++) {
    const a = 2 * Math.PI * i / (len - 1);
    const w = 0.35875 - 0.48829 * Math.cos(a) + 0.14128 * Math.cos(2 * a) - 0.01168 * Math.cos(3 * a);
    re[i] = arr[s + i] * w;
    wsum += w;
  }
  fftInPlace(re, im);
  const amp = new Float64Array(nfft / 2 + 1);
  for (let k = 0; k <= nfft / 2; k++) amp[k] = 2 * Math.hypot(re[k], im[k]) / wsum;
  return { amp, binHz: fs / nfft, fMax: fs / 2 };
}

function toDb(a) { return 20 * Math.log10(Math.max(a, 1e-9)); }

// Spectral peaks above -40 dB (multi-tone input only), parabolic interpolation in dB
function findPeaks(sp) {
  const { amp, binHz } = sp;
  const w = Math.max(2, Math.ceil(40 / binHz));
  const out = [];
  for (let i = 1; i < amp.length - 1; i++) {
    if (amp[i] < 0.01) continue;
    let isMax = true;
    for (let j = Math.max(0, i - w); j <= Math.min(amp.length - 1, i + w); j++) {
      if (amp[j] > amp[i] || (amp[j] === amp[i] && j < i)) { isMax = false; break; }
    }
    if (!isMax) continue;
    const a = toDb(amp[i - 1]), b = toDb(amp[i]), c = toDb(amp[i + 1]);
    const den = a - 2 * b + c;
    const d = Math.abs(den) > 1e-12 ? 0.5 * (a - c) / den : 0;
    const f = (i + d) * binHz;
    const db = b - 0.25 * (a - c) * d;
    const alias = !TONES.some(t => Math.abs(t.f - f) < 25);
    out.push({ f, db, alias });
  }
  out.sort((p, q) => q.db - p.db);
  return out.slice(0, 9).sort((p, q) => p.f - q.f);
}

// ---------------------------------------------------------------- geometry

function computeGeometry() {
  const W = canvasWidth;
  const cols = W >= 640 ? 4 : 2;
  const gap = cols === 4 ? 14 : 12;
  const x0 = margin + 30, x1 = W - margin;
  const pw = (x1 - x0 - (cols - 1) * gap) / cols;
  const panels = [];
  for (let i = 0; i < 4; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    const px = x0 + c * (pw + gap);
    let top, specH, timeTop, timeH;
    if (cols === 4) {
      top = 110; specH = 118; timeTop = top + 12 + specH + 38; timeH = 62;
    } else {
      top = 96 + r * 146; specH = 62; timeTop = top + 12 + specH + 30; timeH = 32;
    }
    panels.push({
      titleY: top,
      spec: { x: px, y: top + 12, w: pw, h: specH },
      time: { x: px, y: timeTop, w: pw, h: timeH },
      firstCol: c === 0
    });
  }
  const infoTop = cols === 4 ? 372 : 392;
  const nodes = [];
  if (cols === 4) {
    for (let i = 0; i < 4; i++) nodes.push(panels[i].spec.x + pw / 2);
  } else {
    for (let i = 0; i < 4; i++) nodes.push(lerp(margin + 26, W - margin - 26, i / 3));
  }
  const spacing = nodes[1] - nodes[0];
  return { cols, panels, infoTop, nodes, pipeY: cols === 4 ? 62 : 58, small: cols === 2, captions: cols === 4 && spacing >= 150 };
}

// ---------------------------------------------------------------- drawing

function fmtKHz(hz) {
  const k = hz / 1000;
  if (Math.abs(k - Math.round(k)) < 1e-9) return k.toFixed(0);
  return (Math.round(k * 1000) / 1000).toString();
}

function drawTitle() {
  noStroke();
  fill('black');
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(G.cols === 4 ? 22 : 18);
  text('Multirate Sample Rate Converter', canvasWidth / 2, 16);
  textStyle(NORMAL);
}

function drawArrow(xa, xb, y) {
  stroke(80);
  strokeWeight(1.5);
  line(xa, y, xb, y);
  noStroke();
  fill(80);
  triangle(xb, y, xb - 7, y - 4, xb - 7, y + 4);
}

function drawPipeline() {
  const m = model, y = G.pipeY, nx = G.nodes;
  const names = ['x[n]', 'u[k]', 'v[k]', 'y[m]'];
  const rates = [FS_IN, m.fsMid, m.fsMid, m.fsOut];
  const spacing = nx[1] - nx[0];
  const bw = Math.min(78, spacing - 46), bh = 28;
  const blocks = [
    { label: '↑' + m.L, cap: m.L > 1 ? 'insert ' + (m.L - 1) + ' zero' + (m.L > 2 ? 's' : '') : 'no change', on: m.L > 1 },
    { label: 'LPF', cap: m.filterOn ? 'cutoff ' + fmtKHz(m.fcIdeal) + ' kHz, gain ' + m.L : 'bypassed', on: m.filterOn },
    { label: '↓' + m.M, cap: m.M > 1 ? 'keep 1 of ' + m.M : 'no change', on: m.M > 1 }
  ];
  // wires
  for (let i = 0; i < 3; i++) {
    const bx = (nx[i] + nx[i + 1]) / 2;
    drawArrow(nx[i] + 4, bx - bw / 2, y);
    drawArrow(bx + bw / 2, nx[i + 1] - 4, y);
  }
  // blocks
  for (let i = 0; i < 3; i++) {
    const b = blocks[i];
    const bx = (nx[i] + nx[i + 1]) / 2;
    stroke(b.on ? 60 : 170);
    strokeWeight(1.5);
    fill(b.on ? (i === 1 ? color(255, 244, 200) : 'white') : color(238));
    rect(bx - bw / 2, y - bh / 2, bw, bh, 5);
    noStroke();
    fill(b.on ? 0 : 140);
    textAlign(CENTER, CENTER);
    textSize(16);
    textStyle(BOLD);
    text(b.label, bx, y);
    textStyle(NORMAL);
    if (i === 1 && !m.filterOn) {
      stroke(C_ERR); strokeWeight(2);
      line(bx - bw / 2 + 4, y + bh / 2 - 4, bx + bw / 2 - 4, y - bh / 2 + 4);
    }
    if (G.captions) {
      noStroke();
      fill(i === 1 && !m.filterOn ? color(...C_ERR) : 70);
      textSize(spacing >= 190 ? 13 : 12);
      text(b.cap, bx, y + bh / 2 + 11);
    }
  }
  // nodes
  for (let i = 0; i < 4; i++) {
    noStroke();
    fill(...C_SIG);
    circle(nx[i], y, 9);
    fill(0);
    textAlign(CENTER, BOTTOM);
    textSize(14);
    text(names[i], nx[i], y - 9);
    textAlign(CENTER, TOP);
    textStyle(i === 3 ? BOLD : NORMAL);
    fill(i === 3 ? color(...C_SPEC) : 40);
    const lab = fmtKHz(rates[i]) + ' kHz';
    const hw = tw(lab) / 2 + 2;
    text(lab, constrain(nx[i], hw, canvasWidth - hw), y + 9);
    textStyle(NORMAL);
  }
}

function panelTitle(i) {
  const m = model;
  const t = G.small
    ? ['1 Input', '2 After ↑' + m.L, m.filterOn ? '3 After LPF' : '3 LPF off', '4 Output']
    : ['1  Input x[n]', '2  After ↑' + m.L + (m.L > 1 ? ' (zeros)' : ' (unchanged)'), m.filterOn ? '3  After low-pass' : '3  Filter bypassed', '4  Output after ↓' + m.M];
  return t[i];
}

function dbY(a, r) {
  const db = constrain(toDb(a), DB_FLOOR, 0);
  return r.y + r.h * (db / DB_FLOOR);
}

function fToX(f, fMax, r) { return r.x + (f / fMax) * r.w; }

// Largest value of amp[] across the bins covered by pixel column px
function colMax(sp, fMax, r, px) {
  const f0 = (px - 0.5) / r.w * fMax, f1 = (px + 0.5) / r.w * fMax;
  const b0 = Math.max(0, Math.floor(f0 / sp.binHz));
  const b1 = Math.min(sp.amp.length - 1, Math.ceil(f1 / sp.binHz));
  let mx = 0;
  for (let b = b0; b <= b1; b++) if (sp.amp[b] > mx) mx = sp.amp[b];
  return mx;
}

function drawPanel(i) {
  const m = model, P = G.panels[i], r = P.spec;
  const sp = m.specs[i];
  const fMax = sp.fMax;

  // title
  noStroke();
  fill(i === 2 && !m.filterOn ? color(...C_ERR) : 0);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(G.small ? 13 : 14);
  text(panelTitle(i), r.x, P.titleY);
  textStyle(NORMAL);

  // spectrum frame and dB grid
  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(r.x, r.y, r.w, r.h);
  stroke(228);
  for (const db of [-20, -40, -60]) {
    const yy = r.y + r.h * db / DB_FLOOR;
    line(r.x, yy, r.x + r.w, yy);
  }
  if (P.firstCol) {
    noStroke();
    fill(60);
    textSize(12);
    textAlign(RIGHT, CENTER);
    const labs = G.cols === 4 ? [0, -20, -40, -60, -80] : [0, -40, -80];
    for (const db of labs) text(db === 0 ? '0' : '−' + (-db), r.x - 4, r.y + r.h * db / DB_FLOOR);
    textAlign(RIGHT, CENTER);
    text('dB', r.x - 4, P.titleY);
  }

  // Nyquist markers inside the high-rate panels
  if (i === 1 || i === 2) {
    const fin = FS_IN / 2, fout = m.fsOut / 2;
    drawingContext.setLineDash([4, 4]);
    strokeWeight(1.5);
    if (fin < fMax - 1) { stroke(110); line(fToX(fin, fMax, r), r.y, fToX(fin, fMax, r), r.y + r.h); }
    if (fout < fMax - 1 && Math.abs(fout - fin) > 1) { stroke(...C_ERR); line(fToX(fout, fMax, r), r.y, fToX(fout, fMax, r), r.y + r.h); }
    drawingContext.setLineDash([]);
  }

  // spectrum (filled)
  stroke(...C_SPEC);
  strokeWeight(1.2);
  fill(C_SPEC[0], C_SPEC[1], C_SPEC[2], 60);
  beginShape();
  vertex(r.x, r.y + r.h);
  for (let px = 0; px <= r.w; px++) vertex(r.x + px, dbY(colMax(sp, fMax, r, px), r));
  vertex(r.x + r.w, r.y + r.h);
  endShape(CLOSE);

  // filter response |H|/L on panel 3
  if (i === 2 && m.hResp) {
    noFill();
    stroke(...C_FILT);
    strokeWeight(2);
    beginShape();
    for (let px = 0; px <= r.w; px++) {
      const f = px / r.w * fMax;
      const b = Math.min(m.hResp.amp.length - 1, Math.round(f / m.hResp.binHz));
      vertex(r.x + px, dbY(m.hResp.amp[b], r));
    }
    endShape();
  }

  // error spectrum on panel 4 (only where it rises above the floor)
  if (i === 3) {
    stroke(...C_ERR);
    strokeWeight(1.5);
    noFill();
    let prev = null;
    for (let px = 0; px <= r.w; px++) {
      const yv = dbY(colMax(m.errSpec, fMax, r, px), r);
      if (prev !== null && (yv < r.y + r.h - 1 || prev < r.y + r.h - 1)) line(r.x + px - 1, prev, r.x + px, yv);
      prev = yv;
    }
  }

  // in-plot legend
  noStroke();
  textSize(12);
  textAlign(RIGHT, TOP);
  if (i === 2 && m.hResp) { fill(150, 105, 0); text('|H|/L', r.x + r.w - 4, r.y + 3); }
  if (i === 3) { fill(...C_ERR); text('error', r.x + r.w - 4, r.y + 3); }
  if ((i === 1 || i === 2) && !G.small) {
    const fin = FS_IN / 2, fout = m.fsOut / 2;
    const xin = fToX(fin, fMax, r), xout = fToX(fout, fMax, r);
    const close = Math.abs(xin - xout) < 30;
    // when the two lines are close, the left one is labelled on its left side
    const labelAt = (label, xl, isLeft) => {
      textAlign(close && isLeft ? RIGHT : LEFT, TOP);
      text(label, xl + (close && isLeft ? -3 : 3), r.y + 3);
    };
    if (fin < fMax - 1) { fill(110); labelAt('in', xin, xin < xout); }
    if (fout < fMax - 1 && Math.abs(fout - fin) > 1) { fill(...C_ERR); labelAt('out', xout, xout < xin); }
  }

  drawFreqAxis(r, fMax);
  drawStems(i);
}

function niceStep(fMaxK, w) {
  const target = Math.max(2, Math.floor(w / 45));
  const steps = [0.25, 0.5, 1, 2, 4, 5, 8, 10];
  for (const s of steps) if (fMaxK / s <= target) return s;
  return 10;
}

function drawFreqAxis(r, fMax) {
  const fk = fMax / 1000;
  const step = niceStep(fk, r.w);
  const yb = r.y + r.h;
  textSize(12);
  noStroke();
  // Nyquist label at the right end (red)
  const nyq = fmtKHz(fMax) + ' kHz';
  const nyqW = tw(nyq) + 8;
  fill(...C_ERR);
  textAlign(RIGHT, TOP);
  text(nyq, r.x + r.w, yb + 4);
  stroke(...C_ERR); strokeWeight(2);
  line(r.x + r.w, yb, r.x + r.w, yb + 4);
  // nice ticks
  for (let f = 0; f < fk - 1e-9; f += step) {
    const xx = r.x + (f / fk) * r.w;
    stroke(120); strokeWeight(1);
    line(xx, yb, xx, yb + 3);
    if (xx + 10 < r.x + r.w - nyqW) {
      noStroke(); fill(60);
      textAlign(CENTER, TOP);
      text(fmtKHz(f * 1000), xx, yb + 4);
    }
  }
}

function drawStems(i) {
  const m = model, r = G.panels[i].time, st = m.stems[i];
  const ymid = r.y + r.h / 2, ys = r.h / 2 / 1.15;
  const tx = t => map(t, TW_START, TW_START + TW_LEN, r.x + 3, r.x + r.w - 3);

  // header: number of samples in the window
  noStroke();
  fill(60);
  textSize(12);
  textAlign(LEFT, BOTTOM);
  text(st.length + ' samples in 2 ms', r.x, r.y - 2);

  // frame and zero line
  fill(255);
  stroke(215);
  strokeWeight(1);
  rect(r.x, r.y, r.w, r.h);
  stroke(150);
  line(r.x, ymid, r.x + r.w, ymid);

  // continuous reference (input content for 1-2, ideal output for 3-4)
  const cv = i < 2 ? m.curveIn : m.curveIdeal;
  noFill();
  stroke(...C_IDEAL);
  strokeWeight(1.2);
  beginShape();
  for (let k = 0; k < cv.length; k++) {
    vertex(map(k, 0, cv.length - 1, r.x + 3, r.x + r.w - 3), ymid - constrain(cv[k], -1.15, 1.15) * ys);
  }
  endShape();

  // stems
  const spacing = (r.w - 6) / Math.max(1, st.length);
  const heads = spacing >= 3.5;
  const hd = Math.min(5, spacing * 0.9);
  for (const s of st) {
    const xx = tx(s.t);
    const yy = ymid - constrain(s.v, -1.15, 1.15) * ys;
    if (s.z && Math.abs(s.v) < 1e-12) {
      if (heads) { stroke(130); strokeWeight(1); fill(255); circle(xx, ymid, hd - 0.5); }
      continue;
    }
    stroke(...C_SIG);
    strokeWeight(heads ? 1.3 : 1);
    line(xx, ymid, xx, yy);
    if (heads) { noStroke(); fill(...C_SIG); circle(xx, yy, hd); }
  }

  // time ticks
  noStroke();
  fill(60);
  textSize(12);
  textAlign(CENTER, TOP);
  if (G.cols === 4) {
    text('31', r.x + 3, r.y + r.h + 3);
    text('32', r.x + r.w / 2, r.y + r.h + 3);
    textAlign(RIGHT, TOP);
    text('33 ms', r.x + r.w, r.y + r.h + 3);
  }
}

function tw(str) { return fontWidth(str); }   // advance width (p5 2.x textWidth trims)

function drawInfo() {
  const m = model;
  const wide = G.cols === 4;
  const y0 = G.infoTop;
  const x = margin;
  const right = canvasWidth - margin;
  const lh = wide ? 21 : 18;
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(wide ? 14 : 13);

  // line 1: output rate (+ filter summary when it fits)
  fill(0);
  const s1 = 'Output rate fs\u00B7L/M = 8 kHz \u00D7 ' + m.L + '/' + m.M + ' = ' + fmtKHz(m.fsOut) + ' kHz';
  text(s1, x, y0);
  if (wide) {
    const f1 = 'Filter: ' + (m.filterOn
      ? m.N + '-tap Hamming, cutoff ' + fmtKHz(m.fcIdeal) + ' kHz = \u03C0/' + Math.max(m.L, m.M) + ', gain ' + m.L
      : 'off (no anti-imaging or anti-aliasing)');
    const f1x = x + tw(s1) + 28;
    if (f1x + tw(f1) <= right) text(f1, f1x, y0);
  }

  // line 2: error against the ideal converter (+ cost when it fits)
  fill(m.errDb > -30 ? color(...C_ERR) : color(0, 110, 0));
  const errStr = m.errDb < -120 ? 'below \u2212120 dB' : (m.errDb < 0 ? '\u2212' : '') + Math.abs(m.errDb).toFixed(1) + ' dB';
  const s2 = 'Error vs ideal converter: ' + errStr;
  text(s2, x, y0 + lh);
  fill(0);
  const costs = m.filterOn
    ? ['Multiplies per output sample: direct N\u00B7M = ' + m.direct + ', polyphase \u2248 ' + m.poly.toFixed(1),
       'Mults/output: direct N\u00B7M = ' + m.direct + ', polyphase \u2248 ' + m.poly.toFixed(1)]
    : ['Multiplies per output sample: 0 (no filter)', 'Mults/output: 0 (no filter)'];
  let row = 2;
  if (wide) {
    const cx = x + Math.max(290, tw(s2) + 28);
    const c = costs.find(c => cx + tw(c) <= right);
    if (c) text(c, cx, y0 + lh);
    else { text(costs[1], x, y0 + 2 * lh); row = 3; }
  } else {
    text(costs[1], x, y0 + 2 * lh);
    row = 3;
  }

  // next line: peaks (multi-tone) or hint
  const y3 = y0 + row * lh;
  if (m.peaks) {
    let xx = x;
    fill(0);
    const head = wide ? 'Output peaks (kHz):' : 'Peaks (kHz):';
    text(head, xx, y3);
    xx += tw(head) + 8;
    const anyAlias = m.peaks.some(p => p.alias);
    const note = anyAlias ? (wide ? 'red = alias or image' : 'red = alias') : '';
    const room = right - xx - (note ? tw(note) + 10 : 0);
    const fmtPeak = (p, withDb) => (p.f / 1000).toFixed(2) + (withDb ? ' (' + (p.db < 0 ? '\u2212' : '') + Math.abs(p.db).toFixed(1) + ' dB)' : '');
    const total = wd => m.peaks.reduce((acc, p) => acc + tw(fmtPeak(p, wd)) + 12, 0);
    const withDb = total(true) <= room;
    for (const p of m.peaks) {
      const str = fmtPeak(p, withDb);
      if (xx + tw(str) > right) break;
      fill(p.alias ? color(...C_ERR) : color(...C_SPEC));
      text(str, xx, y3);
      xx += tw(str) + 12;
    }
    if (note && xx + tw(note) <= right) { fill(...C_ERR); text(note, xx, y3); }
  } else {
    fill(90);
    text(wide ? 'Hover over a spectrum to read frequency and level.' : 'Tap a spectrum to read frequency and level.', x, y3);
  }

  // legend (four-column layout only)
  if (wide && row === 2) {
    const y4 = y0 + 3 * lh;
    let xx = x;
    const item = (col, label, kind) => {
      if (kind === 'fill') { noStroke(); fill(col[0], col[1], col[2], 90); rect(xx, y4 - 5, 14, 10); stroke(...col); strokeWeight(1); line(xx, y4 - 5, xx + 14, y4 - 5); }
      else if (kind === 'dash') { stroke(...col); strokeWeight(1.5); drawingContext.setLineDash([4, 3]); line(xx, y4, xx + 16, y4); drawingContext.setLineDash([]); }
      else if (kind === 'stem') { stroke(...col); strokeWeight(1.3); line(xx + 7, y4 + 6, xx + 7, y4 - 4); noStroke(); fill(...col); circle(xx + 7, y4 - 4, 5); }
      else { stroke(...col); strokeWeight(2); line(xx, y4, xx + 16, y4); }
      noStroke(); fill(40); textSize(13); textAlign(LEFT, CENTER);
      text(label, xx + 20, y4);
      xx += 20 + tw(label) + 14;
    };
    item(C_SPEC, 'spectrum', 'fill');
    item(C_FILT, 'filter |H|/L', 'line');
    item(C_ERR, 'error', 'line');
    item([110, 110, 110], 'input fs/2', 'dash');
    item(C_ERR, 'output fs/2', 'dash');
    item(C_SIG, 'samples', 'stem');
    item(C_IDEAL, 'ideal signal', 'line');
  }
}

function drawHover() {
  for (let i = 0; i < 4; i++) {
    const r = G.panels[i].spec;
    if (mouseX < r.x || mouseX > r.x + r.w || mouseY < r.y || mouseY > r.y + r.h) continue;
    const sp = model.specs[i];
    const px = Math.round(mouseX - r.x);
    const f = px / r.w * sp.fMax;
    const db = toDb(colMax(sp, sp.fMax, r, px));
    stroke(0, 0, 0, 120);
    strokeWeight(1);
    line(mouseX, r.y, mouseX, r.y + r.h);
    const s = (f / 1000).toFixed(2) + ' kHz, ' + (db < DB_FLOOR ? '< −80' : (db < 0 ? '−' : '') + Math.abs(db).toFixed(1)) + ' dB';
    textSize(12);
    const w = tw(s) + 12;
    const bx = mouseX + w + 6 > r.x + r.w ? mouseX - w - 4 : mouseX + 4;
    noStroke();
    fill(255, 255, 255, 235);
    rect(bx, r.y + 16, w, 18, 3);
    fill(0);
    textAlign(LEFT, CENTER);
    text(s, bx + 6, r.y + 25);
  }
}

// ---------------------------------------------------------------- controls

function rowY(i) { return drawHeight + 20 + i * 34; }

function drawControlLabels() {
  noStroke();
  fill(0);
  textAlign(LEFT, CENTER);
  textSize(ctl.labelSize);
  const L = lSlider.value(), M = mSlider.value(), N = tapsSlider.value();
  text((compact ? 'L: ' : 'Upsample L: ') + L, ctl.leftX, rowY(0));
  text((compact ? 'M: ' : 'Downsample M: ') + M, ctl.rightX, rowY(0));
  text((compact ? 'Taps N: ' : 'Filter length N: ') + N, ctl.leftX, rowY(1));
  if (!compact) {
    text('Input signal:', ctl.rightX, rowY(1));
    textStyle(BOLD);
    fill(...C_SPEC);
    textAlign(RIGHT, CENTER);
    text('Output rate: ' + fmtKHz(model.fsOut) + ' kHz', canvasWidth - margin, rowY(2));
    textStyle(NORMAL);
  }
}

function layoutControls(force) {
  if (typeof lSlider === 'undefined') return;
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  compact = canvasWidth < 640;
  const half = (canvasWidth - 2 * margin) / 2;
  ctl = compact
    ? { leftX: margin, rightX: margin + half + 6, labelW: 50, labelSize: 15 }
    : { leftX: margin + 4, rightX: margin + half + 10, labelW: 160, labelSize: 16 };
  const sw = Math.max(60, half - ctl.labelW - 14);
  lSlider.position(ctl.leftX + ctl.labelW, rowY(0) - 10);
  lSlider.size(sw);
  mSlider.position(ctl.rightX + ctl.labelW + (compact ? 0 : 4), rowY(0) - 10);
  mSlider.size(Math.max(60, canvasWidth - margin - (ctl.rightX + ctl.labelW + (compact ? 0 : 4))));
  if (compact) {
    tapsSlider.position(ctl.leftX + 90, rowY(1) - 10);
    tapsSlider.size(canvasWidth - margin - ctl.leftX - 90);
    signalSelect.position(ctl.leftX, rowY(2) - 12);
    filterCheckbox.position(ctl.rightX - 6, rowY(2) - 11);
  } else {
    tapsSlider.position(ctl.leftX + ctl.labelW, rowY(1) - 10);
    tapsSlider.size(sw);
    signalSelect.position(ctl.rightX + 104, rowY(1) - 12);
    filterCheckbox.position(ctl.leftX, rowY(2) - 11);
  }
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
