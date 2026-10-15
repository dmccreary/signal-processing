// Filter Bank and Polyphase Explorer MicroSim
// CANVAS_HEIGHT: 662
// An M-channel cosine-modulated (pseudo-QMF) filter bank built from one Hamming-windowed-sinc
// prototype p[n]. Analysis filters h_k[n] = 2 p[n] cos(pi(2k+1)(n - (N-1)/2)/(2M) + phi_k) with
// phi_k = (-1)^k pi/4; each subband is decimated by M, upsampled, filtered by the matching
// synthesis filter (phase -phi_k, gain M) and the channels are summed. The sketch shows every
// channel's magnitude response, the subband energies of a test signal, the reconstruction error,
// and the polyphase split E_m[q] = p[qM + m] with the multiplication count for direct versus
// polyphase decimation. p5.js 2.3.2, no audio.

// Canvas dimensions
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let drawHeight = 550;
let controlHeight = 112;
let canvasHeight = drawHeight + controlHeight;
let margin = 12;
let defaultTextSize = 16;

// Signal model: a 2048-sample record at 8 kHz with 256 samples of padding on each side
const FS = 8000;
const NREC = 2048;
const PAD = 256;
const NTOT = NREC + 2 * PAD;
const TAPER = 64;                    // raised-cosine fade at both ends of the chirp
const NF = 2048;                     // FFT size for the frequency responses
const TW0 = 1000;                    // reconstruction window: record samples 1000 ...
const TWLEN = 64;                    // ... to 1063 (8 ms)
const DB_TOP = 10;
const DB_FLOOR = -80;
const BAR_FLOOR = -60;
const T_TOP = 1;
const T_FLOOR = -7;

// Multi-tone test signal (frequency in Hz, amplitude, phase in rad)
const TONES = [
  { f: 300, a: 1.0, p: 0.3 },
  { f: 1000, a: 0.7, p: 1.1 },
  { f: 2300, a: 0.5, p: 2.0 },
  { f: 3400, a: 0.3, p: 0.7 }
];

// Colours
const C_SIG = [25, 90, 200];         // input signal: blue
const C_REC = [205, 150, 0];         // reconstruction: gold
const C_ERR = [215, 30, 30];         // error: red
const C_SPEC = [128, 0, 0];          // overall response and key read-outs: maroon
const C_OK = [0, 120, 0];
const CH_COLORS = [                  // channel k (categorical, no red)
  [31, 119, 180], [255, 127, 14], [44, 160, 44], [148, 103, 189],
  [140, 86, 75], [227, 119, 194], [23, 190, 207], [188, 189, 34]
];
const VIRIDIS = [                    // phase m (ordered: dark purple -> green)
  [68, 1, 84], [71, 44, 122], [59, 81, 139], [44, 113, 142],
  [33, 144, 141], [39, 173, 129], [92, 200, 99], [170, 220, 50]
];

// Controls
let mSelect, signalSelect, nSlider, toneSlider, tuneCheckbox;
let layoutWidth = -1;
let compact = false;
let ctl = {};

// Model cache (recomputed only when a control changes)
let model = null;
let modelKey = '';
let G = null;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);
  frameRate(30);

  mSelect = createSelect();
  for (const m of ['2', '4', '8']) mSelect.option(m, m);
  mSelect.selected('4');
  mSelect.style('font-size', '15px');

  signalSelect = createSelect();
  signalSelect.option('multi-tone', 'multi');
  signalSelect.option('linear chirp', 'chirp');
  signalSelect.option('single tone', 'tone');
  signalSelect.selected('multi');
  signalSelect.style('font-size', '15px');

  nSlider = createSlider(16, 128, 64, 8);
  toneSlider = createSlider(0.05, 3.95, 1.0, 0.05);

  tuneCheckbox = createCheckbox(' Tuned cutoff', true);
  tuneCheckbox.style('font-size', '16px');

  layoutControls(true);

  describe('An M-channel cosine-modulated filter bank. The upper left plot shows the magnitude response of every channel in its own colour above a strip with the overall analysis-synthesis response; the upper right bars show how much of the test signal energy lands in each subband. The lower left panel splits the prototype filter into M polyphase components drawn in different colours, and the lower right panel compares the input with the reconstructed signal and shows the error. Read-outs give the reconstruction error in dB and the multiplications per output sample for direct and polyphase decimation. Controls choose M, the prototype length N, the test signal, the tone frequency and whether the prototype cutoff is tuned.');
}

function draw() {
  updateCanvasSize();
  const M = Number(mSelect.value());
  const N = Number(nSlider.value());
  const tuned = tuneCheckbox.checked();
  const kind = signalSelect.value();
  const ftone = Number(toneSlider.value()) * 1000;
  const key = [M, N, tuned, kind, kind === 'tone' ? ftone : 0].join('|');
  if (key !== modelKey) {
    model = computeModel(M, N, tuned, kind, ftone);
    modelKey = key;
  }
  syncToneSlider(kind);
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
  drawResponses();
  drawOverall();
  drawBars();
  drawPolyphase();
  if (G.recon) drawReconstruction();
  drawInfo();
  drawHover();
  drawControlLabels();
}

// ---------------------------------------------------------------- filter design

// Hamming-windowed sinc with cutoff wc (rad/sample), normalised to unit DC gain
function designProto(N, wc) {
  const c = (N - 1) / 2;
  const h = new Float64Array(N);
  let s = 0;
  for (let n = 0; n < N; n++) {
    const x = n - c;
    const v = Math.abs(x) < 1e-12 ? wc / Math.PI : Math.sin(wc * x) / (Math.PI * x);
    h[n] = v * (0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1)));
    s += h[n];
  }
  for (let n = 0; n < N; n++) h[n] /= s;
  return h;
}

function magAt(h, w) {
  let re = 0, im = 0;
  for (let n = 0; n < h.length; n++) { re += h[n] * Math.cos(w * n); im -= h[n] * Math.sin(w * n); }
  return Math.hypot(re, im);
}

// Untuned: cutoff pi/(2M), so |P| = -6 dB at the band edge. Tuned: bisection on the cutoff
// until |P(e^{j pi/(2M)})| = 1/sqrt(2) (-3 dB), which makes adjacent channels power complementary.
function makePrototype(N, M, tuned) {
  const w0 = Math.PI / (2 * M);
  if (!tuned) return { p: designProto(N, w0), wc: w0, fail: false };
  const target = Math.SQRT1_2;
  let lo = 0.25 * w0, hi = 2 * w0;
  if (!(magAt(designProto(N, lo), w0) < target && magAt(designProto(N, hi), w0) > target)) {
    return { p: designProto(N, w0), wc: w0, fail: true };
  }
  for (let i = 0; i < 50; i++) {
    const mid = 0.5 * (lo + hi);
    if (magAt(designProto(N, mid), w0) < target) lo = mid; else hi = mid;
  }
  const wc = 0.5 * (lo + hi);
  return { p: designProto(N, wc), wc, fail: false };
}

// Pseudo-QMF cosine modulation: analysis gain 2, synthesis gain 2M (undoes the 1/M of decimation)
function makeBank(p, M) {
  const N = p.length, c = (N - 1) / 2;
  const H = [], F = [];
  for (let k = 0; k < M; k++) {
    const th = (2 * k + 1) * Math.PI / (2 * M);
    const ph = (k % 2 === 0 ? 1 : -1) * Math.PI / 4;
    const h = new Float64Array(N), f = new Float64Array(N);
    for (let n = 0; n < N; n++) {
      h[n] = 2 * p[n] * Math.cos(th * (n - c) + ph);
      f[n] = 2 * M * p[n] * Math.cos(th * (n - c) - ph);
    }
    H.push(h);
    F.push(f);
  }
  return { H, F };
}

// ---------------------------------------------------------------- signals

function makeSignal(kind, ftone) {
  const x = new Float64Array(NTOT);
  const kc = 4000 / (NREC / FS);                       // chirp rate: 0 -> 4 kHz over the record
  for (let i = 0; i < NTOT; i++) {
    const n = i - PAD, t = n / FS;
    if (kind === 'multi') {
      let s = 0;
      for (const c of TONES) s += c.a * Math.cos(2 * Math.PI * c.f * t + c.p);
      x[i] = s;
    } else if (kind === 'tone') {
      x[i] = 0.8 * Math.cos(2 * Math.PI * ftone * t + 0.4);
    } else {
      if (n < 0 || n >= NREC) continue;
      let g = 1;
      if (n < TAPER) g = ramp(n);
      else if (n >= NREC - TAPER) g = ramp(NREC - 1 - n);
      x[i] = g * 0.8 * Math.cos(Math.PI * kc * t * t);
    }
  }
  return x;
}

function ramp(r) { return 0.5 - 0.5 * Math.cos(Math.PI * (r + 0.5) / TAPER); }

// ---------------------------------------------------------------- model

function computeModel(M, N, tuned, kind, ftone) {
  const proto = makePrototype(N, M, tuned);
  const { H, F } = makeBank(proto.p, M);
  const x = makeSignal(kind, ftone);
  const D = N - 1;

  // Analysis at the full rate (for the subband energies), then keep every M-th sample,
  // upsample, synthesis-filter and sum the channels.
  const a = [];
  const y = new Float64Array(NTOT);
  for (let k = 0; k < M; k++) {
    const h = H[k], f = F[k];
    const ak = new Float64Array(NTOT);
    for (let i = 0; i < NTOT; i++) {
      let s = 0;
      const jMax = Math.min(N - 1, i);
      for (let j = 0; j <= jMax; j++) s += h[j] * x[i - j];
      ak[i] = s;
    }
    a.push(ak);
    for (let i0 = 0; i0 < NTOT; i0 += M) {             // decimated subband sample v_k[i0 / M]
      const v = ak[i0];
      const jMax = Math.min(N - 1, NTOT - 1 - i0);
      for (let j = 0; j <= jMax; j++) y[i0 + j] += v * f[j];
    }
  }

  // Reconstruction error over the record (the bank delay N - 1 is removed)
  let ex = 0, ee = 0;
  for (let i = PAD; i < PAD + NREC; i++) {
    const e = y[i + D] - x[i];
    ee += e * e;
    ex += x[i] * x[i];
  }
  const errDb = 10 * Math.log10(Math.max(ee / ex, 1e-30));

  // Subband energies relative to the input energy
  const d2 = Math.floor((N - 1) / 2);
  const bands = [];
  let bandSum = 0;
  for (let k = 0; k < M; k++) {
    let s = 0;
    for (let i = PAD; i < PAD + NREC; i++) s += a[k][i + d2] * a[k][i + d2];
    bands.push(10 * Math.log10(Math.max(s / ex, 1e-30)));
    bandSum += s / ex;
  }

  // Frequency responses (FFT), overall distortion T and alias terms A_l
  const NB = NF / 2 + 1;
  const Hs = H.map(fftOf), Fs = F.map(fftOf);
  const respDb = Hs.map(sp => {
    const d = new Float64Array(NB);
    for (let b = 0; b < NB; b++) d[b] = toDb(Math.hypot(sp.re[b], sp.im[b]));
    return d;
  });
  const tDb = new Float64Array(NB);
  let tMin = Infinity, tMax = -Infinity;
  for (let b = 0; b < NB; b++) {
    let re = 0, im = 0;
    for (let k = 0; k < M; k++) {
      re += Fs[k].re[b] * Hs[k].re[b] - Fs[k].im[b] * Hs[k].im[b];
      im += Fs[k].re[b] * Hs[k].im[b] + Fs[k].im[b] * Hs[k].re[b];
    }
    tDb[b] = toDb(Math.hypot(re, im) / M);
    tMin = Math.min(tMin, tDb[b]);
    tMax = Math.max(tMax, tDb[b]);
  }
  let aliasMax = 0;
  for (let l = 1; l < M; l++) {
    const s = NF * l / M;
    for (let b = 0; b < NB; b++) {
      const bs = ((b - s) % NF + NF) % NF;
      let re = 0, im = 0;
      for (let k = 0; k < M; k++) {
        re += Fs[k].re[b] * Hs[k].re[bs] - Fs[k].im[b] * Hs[k].im[bs];
        im += Fs[k].re[b] * Hs[k].im[bs] + Fs[k].im[b] * Hs[k].re[bs];
      }
      aliasMax = Math.max(aliasMax, Math.hypot(re, im) / M);
    }
  }

  // Polyphase components E_m[q] = p[qM + m]
  const phases = [];
  for (let m = 0; m < M; m++) {
    const e = [];
    for (let q = 0; q * M + m < N; q++) e.push(proto.p[q * M + m]);
    phases.push(e);
  }
  let pMax = 0;
  for (let n = 0; n < N; n++) pMax = Math.max(pMax, Math.abs(proto.p[n]));

  // Reconstruction window
  const xs = [], ys = [];
  for (let i = 0; i < TWLEN; i++) {
    xs.push(x[PAD + TW0 + i]);
    ys.push(y[PAD + TW0 + i + D]);
  }

  return {
    M, N, tuned, kind, ftone, p: proto.p, wc: proto.wc, fail: proto.fail,
    pEdgeDb: toDb(magAt(proto.p, Math.PI / (2 * M))),
    errDb, bands, bandSum, respDb, tDb, tMin, tMax, aliasDb: toDb(aliasMax),
    phases, pMax, xs, ys, D,
    direct: N * M, poly: N, perInDirect: N, perInPoly: N / M
  };
}

function fftOf(h) {
  const re = new Float64Array(NF), im = new Float64Array(NF);
  for (let n = 0; n < h.length; n++) re[n] = h[n];
  fftInPlace(re, im);
  return { re, im };
}

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

function toDb(a) { return 20 * Math.log10(Math.max(a, 1e-15)); }

// ---------------------------------------------------------------- geometry

function computeGeometry() {
  const W = canvasWidth;
  if (W >= 640) {
    const xl0 = 52, split = Math.round(W * 0.6);
    const xr0 = split + 50, xr1 = W - margin;
    return {
      wide: true,
      resp: { x: xl0, y: 50, w: split - xl0, h: 126 },
      tstrip: { x: xl0, y: 201, w: split - xl0, h: 33 },
      bars: { x: xr0, y: 50, w: xr1 - xr0, h: 184 },
      poly: { x: xl0, y: 296, w: split - xl0, h: 54 },
      minis: { x: xl0, y: 388, w: split - xl0, h: 40 },
      recon: { x: xr0, y: 296, w: xr1 - xr0, h: 70 },
      estrip: { x: xr0, y: 388, w: xr1 - xr0, h: 40 },
      infoY: 462, lh: 22
    };
  }
  const x0 = 40, w = W - x0 - margin;
  return {
    wide: false,
    resp: { x: x0, y: 44, w, h: 92 },
    tstrip: { x: x0, y: 154, w, h: 24 },
    bars: { x: x0, y: 218, w, h: 76 },
    poly: { x: x0, y: 334, w, h: 36 },
    minis: { x: x0, y: 398, w, h: 28 },
    recon: null,
    infoY: 460, lh: 19
  };
}

// ---------------------------------------------------------------- drawing helpers

function tw(str) { return fontWidth(str); }   // advance width (p5 2.x textWidth trims spaces)

function phaseColor(m, M) {
  const t = M === 1 ? 0 : 0.8 * m / (M - 1);      // stop before the pale yellow end
  const pos = t * (VIRIDIS.length - 1);
  const i = Math.min(VIRIDIS.length - 2, Math.floor(pos));
  const f = pos - i;
  const c0 = VIRIDIS[i], c1 = VIRIDIS[i + 1];
  return [lerp(c0[0], c1[0], f), lerp(c0[1], c1[1], f), lerp(c0[2], c1[2], f)];
}

function fmtDb(v, dec) {
  const d = dec === undefined ? 1 : dec;
  if (v < -120) return '< −120';
  const s = Math.abs(v).toFixed(d);
  return (v < 0 && Number(s) !== 0 ? '−' : '') + s;
}

function fmtSigned(v) { return (v < -0.005 ? '−' : '+') + Math.abs(v).toFixed(2); }

function fmtKHz(hz) {
  const k = hz / 1000;
  if (Math.abs(k - Math.round(k)) < 1e-9) return k.toFixed(0);
  return (Math.round(k * 1000) / 1000).toString();
}

// Bold panel title above rectangle r: the first candidate that fits the panel width is used
function panelTitle(cands, r, col) {
  const list = Array.isArray(cands) ? cands : [cands];
  noStroke();
  fill(...(col || [0, 0, 0]));
  textStyle(BOLD);
  textSize(G.wide ? 14 : 13);
  textAlign(LEFT, BOTTOM);
  const s = list.find(c => tw(c) <= r.w) || list[list.length - 1];
  fitText(s, r.x, r.y - 4, r.w);
  textStyle(NORMAL);
}

function frame(r) {
  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(r.x, r.y, r.w, r.h);
}

function fToX(f, r) { return r.x + (f / (FS / 2)) * r.w; }

function drawTitle() {
  noStroke();
  fill('black');
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(G.wide ? 22 : 17);
  text('Filter Bank and Polyphase Explorer', canvasWidth / 2, G.wide ? 16 : 14);
  textStyle(NORMAL);
}

// ---------------------------------------------------------------- panel 1: channel responses

function dbToY(db, r, top, floor) {
  return r.y + r.h * (top - constrain(db, floor, top)) / (top - floor);
}

function drawResponses() {
  const m = model, r = G.resp, M = m.M;
  panelTitle(['Analysis filters |Hₖ(e^jω)| of all ' + M + ' channels (dB)', 'Channel responses |Hₖ(e^jω)| (dB)', 'Channel responses |Hₖ| (dB)'], r);
  frame(r);

  // dB grid
  stroke(230);
  for (const db of [0, -20, -40, -60]) {
    const yy = dbToY(db, r, DB_TOP, DB_FLOOR);
    line(r.x, yy, r.x + r.w, yy);
  }
  noStroke();
  fill(60);
  textSize(12);
  textAlign(RIGHT, CENTER);
  const labs = G.wide ? [0, -20, -40, -60, -80] : [0, -40, -80];
  for (const db of labs) text(db === 0 ? '0' : '−' + (-db), r.x - 4, dbToY(db, r, DB_TOP, DB_FLOOR));

  // channel boundaries k fs / (2M)
  stroke(205);
  strokeWeight(1);
  for (let k = 1; k < M; k++) {
    const xx = fToX(k * FS / (2 * M), r);
    line(xx, r.y, xx, r.y + r.h);
    line(xx, G.tstrip.y, xx, G.tstrip.y + G.tstrip.h);
  }

  // test-signal markers
  drawSignalMarkers(r);

  // channel curves
  const NB = NF / 2 + 1;
  noFill();
  strokeWeight(G.wide ? 1.6 : 1.3);
  for (let k = 0; k < M; k++) {
    stroke(...CH_COLORS[k]);
    beginShape();
    for (let b = 0; b < NB; b++) {
      vertex(r.x + r.w * b / (NB - 1), dbToY(m.respDb[k][b], r, DB_TOP, DB_FLOOR));
    }
    endShape();
  }

  // channel index labels at the channel centres
  noStroke();
  textAlign(CENTER, TOP);
  textStyle(BOLD);
  textSize(M === 8 && !G.wide ? 11 : 13);
  for (let k = 0; k < M; k++) {
    fill(...CH_COLORS[k]);
    text(String(k), fToX((2 * k + 1) * FS / (4 * M), r), r.y + 2);
  }
  textStyle(NORMAL);
}

function drawSignalMarkers(r) {
  const m = model;
  stroke(90);
  strokeWeight(1.2);
  drawingContext.setLineDash([4, 4]);
  if (m.kind === 'multi') {
    for (const c of TONES) line(fToX(c.f, r), r.y + 16, fToX(c.f, r), r.y + r.h);
  } else if (m.kind === 'tone') {
    line(fToX(m.ftone, r), r.y + 16, fToX(m.ftone, r), r.y + r.h);
  }
  drawingContext.setLineDash([]);
}

// ---------------------------------------------------------------- panel 1b: overall response

function drawOverall() {
  const m = model, r = G.tstrip;
  frame(r);
  stroke(225);
  strokeWeight(1);
  for (const db of [-3, -6]) {
    const yy = dbToY(db, r, T_TOP, T_FLOOR);
    line(r.x, yy, r.x + r.w, yy);
  }
  stroke(150);
  const y0 = dbToY(0, r, T_TOP, T_FLOOR);
  line(r.x, y0, r.x + r.w, y0);
  noStroke();
  fill(60);
  textSize(G.wide ? 12 : 11);
  textAlign(RIGHT, CENTER);
  text('0', r.x - 4, y0);
  text('−6', r.x - 4, dbToY(-6, r, T_TOP, T_FLOOR));
  if (G.wide) text('−3', r.x - 4, dbToY(-3, r, T_TOP, T_FLOOR));

  // overall analysis-synthesis response |T|
  const NB = NF / 2 + 1;
  noFill();
  stroke(...C_SPEC);
  strokeWeight(2);
  beginShape();
  for (let b = 0; b < NB; b++) vertex(r.x + r.w * b / (NB - 1), dbToY(m.tDb[b], r, T_TOP, T_FLOOR));
  endShape();

  // strip title (above the strip)
  const rng = fmtSigned(m.tMin) + ' to ' + fmtSigned(m.tMax) + ' dB';
  panelTitle(['Overall analysis–synthesis response |T(e^jω)|: ' + rng,
              'Overall response |T(e^jω)|: ' + rng, 'Overall |T|: ' + rng], r, C_SPEC);

  // frequency axis under the strip
  const yb = r.y + r.h;
  const step = r.w >= 480 ? 0.5 : 1;
  textSize(12);
  for (let f = 0; f <= 4 + 1e-9; f += step) {
    const xx = fToX(f * 1000, r);
    stroke(120);
    strokeWeight(1);
    line(xx, yb, xx, yb + 3);
    noStroke();
    fill(60);
    textAlign(f === 4 ? RIGHT : (f === 0 ? LEFT : CENTER), TOP);
    const lab2 = f === 4 ? '4 kHz' : (Number.isInteger(f) ? f.toFixed(0) : f.toFixed(1));
    text(lab2, f === 0 ? xx - 3 : (f === 4 ? xx + 3 : xx), yb + 4);
  }
}

// ---------------------------------------------------------------- panel 2: subband energy bars

function drawBars() {
  const m = model, r = G.bars, M = m.M;
  const tot = (100 * m.bandSum).toFixed(1) + ' %';
  panelTitle(['Subband energy (dB of input), sum ' + tot, 'Subband energy (dB), sum ' + tot, 'Energy (dB), sum ' + tot], r);
  frame(r);

  stroke(230);
  strokeWeight(1);
  for (const db of [-20, -40]) {
    const yy = dbToY(db, r, 0, BAR_FLOOR);
    line(r.x, yy, r.x + r.w, yy);
  }
  noStroke();
  fill(60);
  textSize(12);
  textAlign(RIGHT, CENTER);
  for (const db of (G.wide ? [0, -20, -40, -60] : [0, -30, -60])) {
    text(db === 0 ? '0' : '−' + (-db), r.x - 4, dbToY(db, r, 0, BAR_FLOOR));
  }

  const slot = r.w / M;
  const bw = slot * 0.62;
  const fs = slot >= 40 ? 12 : 11;
  for (let k = 0; k < M; k++) {
    const cx = r.x + slot * (k + 0.5);
    const v = m.bands[k];
    const yv = dbToY(v, r, 0, BAR_FLOOR);
    noStroke();
    fill(...CH_COLORS[k], 210);
    rect(cx - bw / 2, yv, bw, r.y + r.h - yv);
    // value label (inside the bar near the top when the bar is tall)
    textSize(fs);
    textAlign(CENTER, BOTTOM);
    // values below the axis floor are labelled only when there is room (empty bar = below -60 dB)
    const lab = v <= BAR_FLOOR ? (slot >= 40 ? '<−60' : '') : fmtDb(v, slot >= 40 ? 1 : 0);
    if (yv - r.y > 16) { fill(0); text(lab, cx, yv - 2); }
    else { fill(255); textAlign(CENTER, TOP); text(lab, cx, yv + 2); }
    // axis labels: channel index and band in kHz
    fill(...CH_COLORS[k]);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    textSize(12);
    text('k=' + k, cx, r.y + r.h + 3);
    textStyle(NORMAL);
    if (G.wide && slot >= 64) {
      fill(70);
      textSize(11);
      text(fmtKHz(k * FS / (2 * M)) + '–' + fmtKHz((k + 1) * FS / (2 * M)) + ' kHz', cx, r.y + r.h + 17);
    }
  }
}

// ---------------------------------------------------------------- panel 3: polyphase split

function drawPolyphase() {
  const m = model, r = G.poly, M = m.M, N = m.N;
  panelTitle(['Prototype p[n], N = ' + N + ', split into M = ' + M + ' phases: Eₘ[q] = p[qM + m]',
              'Prototype p[n] (N = ' + N + ') split into M = ' + M + ' phases',
              'p[n] (N = ' + N + ') split into ' + M + ' phases'], r);
  frame(r);
  const ymid = r.y + r.h * 0.72;
  const ys = r.h * 0.62 / m.pMax;
  stroke(160);
  strokeWeight(1);
  line(r.x, ymid, r.x + r.w, ymid);
  const sp = (r.w - 10) / Math.max(1, N - 1);
  const hd = Math.max(2.5, Math.min(5, sp * 0.8));
  for (let n = 0; n < N; n++) {
    const c = phaseColor(n % M, M);
    const xx = r.x + 5 + n * sp;
    const yy = ymid - m.p[n] * ys;
    stroke(...c);
    strokeWeight(1.4);
    line(xx, ymid, xx, yy);
    noStroke();
    fill(...c);
    circle(xx, yy, hd);
  }
  noStroke();
  fill(60);
  textSize(11);
  textAlign(LEFT, TOP);
  text('n = 0', r.x + 3, r.y + r.h + 1);
  textAlign(RIGHT, TOP);
  text('n = ' + (N - 1), r.x + r.w - 3, r.y + r.h + 1);
  textAlign(CENTER, TOP);
  if (G.wide) { fill(80); text('colour = phase m = n mod M', r.x + r.w / 2, r.y + r.h + 1); }

  // mini panels, one per phase
  const R = G.minis;
  const gap = M === 8 ? 6 : 10;
  const pw = (R.w - (M - 1) * gap) / M;
  const L = m.phases[0].length;
  for (let k = 0; k < M; k++) {
    const c = phaseColor(k, M);
    const px = R.x + k * (pw + gap);
    fill(255);
    stroke(...c);
    strokeWeight(1);
    rect(px, R.y, pw, R.h);
    const ym = R.y + R.h * 0.72;
    const yscale = R.h * 0.62 / m.pMax;
    stroke(190);
    line(px, ym, px + pw, ym);
    const s2 = (pw - 8) / Math.max(1, L - 1);
    const hd2 = Math.max(2, Math.min(4.5, s2 * 0.8));
    const e = m.phases[k];
    for (let q = 0; q < e.length; q++) {
      const xx = px + 4 + q * s2;
      const yy = ym - e[q] * yscale;
      stroke(...c);
      strokeWeight(1.3);
      line(xx, ym, xx, yy);
      noStroke();
      fill(...c);
      circle(xx, yy, hd2);
    }
    noStroke();
    fill(...c);
    textStyle(BOLD);
    textSize(G.wide ? 13 : 12);
    textAlign(LEFT, BOTTOM);
    text('E', px + 1, R.y - 3);
    const ew = tw('E');
    textSize(G.wide ? 10 : 9);
    text(String(k), px + 2 + ew, R.y);
    textStyle(NORMAL);
  }
  noStroke();
  fill(60);
  textSize(G.wide ? 12 : 11);
  textAlign(LEFT, TOP);
  const caps = ['Eₘ[q] = p[qM + m]: ' + M + ' branches × N/M = ' + L + ' taps, each running at fs/M = ' + fmtKHz(FS / M) + ' kHz',
                'Eₘ[q] = p[qM + m]: ' + M + ' branches × ' + L + ' taps at fs/M = ' + fmtKHz(FS / M) + ' kHz',
                M + ' branches × ' + L + ' taps at fs/M = ' + fmtKHz(FS / M) + ' kHz'];
  fitText(caps.find(c => tw(c) <= R.w) || caps[2], R.x, R.y + R.h + 3, R.w);
}

// ---------------------------------------------------------------- panel 4: reconstruction

function drawReconstruction() {
  const m = model, r = G.recon, R = G.estrip;
  panelTitle(['Reconstruction x̂ versus input x (8 ms)', 'Reconstruction (8 ms)'], r);
  frame(r);
  let amp = 1e-6;
  for (let i = 0; i < TWLEN; i++) amp = Math.max(amp, Math.abs(m.xs[i]), Math.abs(m.ys[i]));
  amp *= 1.1;
  const ymid = r.y + r.h / 2;
  const tx = i => r.x + 6 + (r.w - 12) * i / (TWLEN - 1);
  const ty = v => ymid - v / amp * (r.h / 2 - 3);
  stroke(170);
  strokeWeight(1);
  line(r.x, ymid, r.x + r.w, ymid);
  // input x[n]: blue line through blue dots
  noFill();
  stroke(...C_SIG);
  strokeWeight(1.5);
  beginShape();
  for (let i = 0; i < TWLEN; i++) vertex(tx(i), ty(m.xs[i]));
  endShape();
  noStroke();
  fill(...C_SIG);
  for (let i = 0; i < TWLEN; i++) circle(tx(i), ty(m.xs[i]), 3);
  // reconstruction: open gold circles
  noFill();
  stroke(...C_REC);
  strokeWeight(1.4);
  for (let i = 0; i < TWLEN; i++) circle(tx(i), ty(m.ys[i]), 6);

  // legend in the gap under the plot
  const ly = r.y + r.h + 11;
  let xx = r.x;
  stroke(...C_SIG); strokeWeight(1.5); line(xx, ly, xx + 14, ly);
  noStroke(); fill(...C_SIG); circle(xx + 7, ly, 3);
  fill(40); textSize(12); textAlign(LEFT, CENTER);
  const l1 = 'input x[n]', l2 = 'output x̂[n + ' + m.D + ']';
  text(l1, xx + 18, ly);
  xx += 18 + tw(l1) + 16;
  noFill(); stroke(...C_REC); strokeWeight(1.4); circle(xx + 5, ly, 6);
  noStroke(); fill(40);
  text(l2, xx + 13, ly);

  // error strip with its own scale
  frame(R);
  let emax = 0;
  const e = [];
  for (let i = 0; i < TWLEN; i++) { e.push(m.ys[i] - m.xs[i]); emax = Math.max(emax, Math.abs(e[i])); }
  let scale = Math.pow(10, Math.ceil(Math.log10(Math.max(emax, 1e-12))));
  if (emax < scale / 5) scale /= 5;
  else if (emax < scale / 2) scale /= 2;
  const em = R.y + R.h / 2;
  stroke(200);
  strokeWeight(1);
  line(R.x, em, R.x + R.w, em);
  stroke(...C_ERR);
  strokeWeight(1.3);
  for (let i = 0; i < TWLEN; i++) line(tx(i), em, tx(i), em - e[i] / scale * (R.h / 2 - 2));
  noStroke();
  fill(...C_ERR);
  textSize(12);
  textAlign(LEFT, TOP);
  const el = ['error x̂[n + ' + m.D + '] − x[n], full scale ±' + fmtSci(scale), 'error, full scale ±' + fmtSci(scale)];
  fitText(el.find(c => tw(c) <= R.w) || el[1], R.x, R.y + R.h + 3, R.w);
}

function fmtSci(v) {
  if (v >= 0.01) return String(Number(v.toPrecision(2)));
  const ex = Math.floor(Math.log10(v));
  const mant = v / Math.pow(10, ex);
  return (Math.abs(mant - 1) < 1e-9 ? '' : Number(mant.toPrecision(2)) + '×') + '10' + supNum(ex);
}

function supNum(n) {
  const sup = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return String(n).split('').map(ch => sup[ch] || ch).join('');
}

// ---------------------------------------------------------------- read-outs

function drawInfo() {
  const m = model, y0 = G.infoY, lh = G.lh, x = margin;
  const right = canvasWidth - margin;
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(G.wide ? 14 : 13);
  const wcPi = (m.wc / Math.PI).toFixed(3) + 'π';
  const edge = fmtKHz(FS / (4 * m.M)) + ' kHz';

  // line 1: prototype
  let s1;
  if (m.fail) {
    fill(...C_ERR);
    s1 = G.wide
      ? 'Cannot tune: N = ' + m.N + ' is too short for M = ' + m.M + ' (|P| = ' + fmtDb(m.pEdgeDb) + ' dB at π/2M even for a narrow cutoff); cutoff left at π/2M'
      : 'N too short to tune; cutoff π/2M, |P| = ' + fmtDb(m.pEdgeDb) + ' dB';
  } else {
    fill(0);
    s1 = G.wide
      ? 'Prototype: ' + m.N + '-tap Hamming-windowed sinc, cutoff ωc = ' + wcPi + (m.tuned ? ' (tuned)' : ' = π/2M (untuned)') + ', |P| = ' + fmtDb(m.pEdgeDb) + ' dB at π/2M (' + edge + ')'
      : 'ωc = ' + wcPi + (m.tuned ? ' (tuned)' : ' (untuned)') + ', |P| = ' + fmtDb(m.pEdgeDb) + ' dB at ' + edge;
  }
  fitText(s1, x, y0, right - x);

  // line 2: reconstruction error
  const good = m.errDb < -40;
  fill(...(m.errDb > -30 ? C_ERR : (good ? C_OK : [170, 100, 0])));
  textStyle(BOLD);
  const s2 = 'Reconstruction error: ' + fmtDb(m.errDb) + ' dB';
  text(s2, x, y0 + lh);
  textStyle(NORMAL);
  fill(0);
  if (G.wide) {
    text('|T| from ' + fmtSigned(m.tMin) + ' to ' + fmtSigned(m.tMax) + ' dB   •   worst alias term ' + fmtDb(m.aliasDb) + ' dB', x + tw(s2) + 24, y0 + lh);
  } else {
    text('|T| ' + fmtSigned(m.tMin) + ' to ' + fmtSigned(m.tMax) + ' dB, alias ' + fmtDb(m.aliasDb) + ' dB', x, y0 + 2 * lh);
  }

  // cost lines
  const row = G.wide ? 2 : 3;
  fill(0);
  if (G.wide) {
    const s3 = 'Decimating one channel by M = ' + m.M + ': direct (filter at fs, keep 1 of M) N·M = ' + m.direct + ' multiplies per output sample;';
    fitText(s3, x, y0 + row * lh, right - x);
    textStyle(BOLD);
    fill(...C_SPEC);
    const s4 = 'polyphase N = ' + m.poly + ' (' + m.M + '× fewer)';
    text(s4, x, y0 + (row + 1) * lh);
    const w4 = tw(s4);
    textStyle(NORMAL);
    fill(0);
    text('•  per input sample: direct N = ' + m.perInDirect + ', polyphase N/M = ' + fmtNum(m.perInPoly), x + w4 + 14, y0 + (row + 1) * lh);
  } else {
    text('Mults/output: direct N·M = ' + m.direct, x, y0 + row * lh);
    textStyle(BOLD);
    fill(...C_SPEC);
    text('polyphase N = ' + m.poly + ' (' + m.M + '× fewer)', x, y0 + (row + 1) * lh);
    textStyle(NORMAL);
  }
}

function fmtNum(v) { return Number.isInteger(v) ? String(v) : v.toFixed(1); }

// Draw text, shrinking the font a little if it would not fit
function fitText(str, x, y, maxW) {
  const s0 = textSize();
  let s = s0;
  while (s > 11 && tw(str) > maxW) { s -= 0.5; textSize(s); }
  text(str, x, y);
  textSize(s0);
}

// ---------------------------------------------------------------- hover read-out

function drawHover() {
  const r = G.resp;
  if (mouseX < r.x || mouseX > r.x + r.w || mouseY < r.y || mouseY > G.tstrip.y + G.tstrip.h) return;
  const m = model;
  const NB = NF / 2 + 1;
  const b = Math.round((mouseX - r.x) / r.w * (NB - 1));
  const f = b / (NB - 1) * FS / 2;
  let best = 0;
  for (let k = 1; k < m.M; k++) if (m.respDb[k][b] > m.respDb[best][b]) best = k;
  let second = best === 0 ? 1 : 0;
  for (let k = 0; k < m.M; k++) if (k !== best && m.respDb[k][b] > m.respDb[second][b]) second = k;
  stroke(0, 0, 0, 120);
  strokeWeight(1);
  line(mouseX, r.y, mouseX, G.tstrip.y + G.tstrip.h);
  const s = (f / 1000).toFixed(2) + ' kHz: k=' + best + ' ' + fmtDb(m.respDb[best][b]) + ' dB, k=' + second + ' ' +
    fmtDb(m.respDb[second][b]) + ' dB, |T| ' + fmtDb(m.tDb[b], 2) + ' dB';
  textSize(12);
  const w = tw(s) + 12;
  const bx = mouseX + w + 6 > r.x + r.w ? Math.max(r.x, mouseX - w - 4) : mouseX + 4;
  noStroke();
  fill(255, 255, 255, 235);
  rect(bx, r.y + r.h - 22, w, 18, 3);
  fill(0);
  textAlign(LEFT, CENTER);
  text(s, bx + 6, r.y + r.h - 13);
}

// ---------------------------------------------------------------- controls

function rowY(i) { return drawHeight + 20 + i * 34; }

function syncToneSlider(kind) {
  const off = kind !== 'tone';
  if (off && !toneSlider.elt.disabled) toneSlider.attribute('disabled', '');
  if (!off && toneSlider.elt.disabled) toneSlider.removeAttribute('disabled');
}

function drawControlLabels() {
  noStroke();
  fill(0);
  textAlign(LEFT, CENTER);
  textSize(ctl.labelSize);
  const N = nSlider.value();
  const f = Number(toneSlider.value()).toFixed(2);
  const toneOn = signalSelect.value() === 'tone';
  if (compact) {
    text('M:', ctl.leftX, rowY(0));
    text('N: ' + N, ctl.leftX, rowY(1));
    fill(toneOn ? 0 : 160);
    text('f: ' + f + ' kHz', ctl.leftX, rowY(2));
  } else {
    text('Channels M:', ctl.leftX, rowY(0));
    text('Test signal:', ctl.rightX, rowY(0));
    text('Prototype length N: ' + N, ctl.leftX, rowY(1));
    fill(toneOn ? 0 : 160);
    text('Tone: ' + f + ' kHz', ctl.rightX, rowY(1));
    fill(90);
    textSize(14);
    text('(|P| = −3 dB at the band edge)', ctl.leftX + 128, rowY(2));
    textStyle(BOLD);
    fill(...C_SPEC);
    textAlign(RIGHT, CENTER);
    textSize(ctl.labelSize);
    text('Channel width fs/2M = ' + fmtKHz(FS / (2 * Number(mSelect.value()))) + ' kHz', canvasWidth - margin, rowY(2));
    textStyle(NORMAL);
  }
}

function layoutControls(force) {
  if (typeof mSelect === 'undefined') return;
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  compact = canvasWidth < 640;
  const half = (canvasWidth - 2 * margin) / 2;
  if (compact) {
    ctl = { leftX: margin, rightX: margin + half + 6, labelSize: 15 };
    mSelect.position(ctl.leftX + 26, rowY(0) - 12);
    signalSelect.position(ctl.rightX, rowY(0) - 12);
    nSlider.position(ctl.leftX + 64, rowY(1) - 10);
    nSlider.size(Math.max(60, canvasWidth - margin - ctl.leftX - 64));
    toneSlider.position(ctl.leftX + 90, rowY(2) - 10);
    toneSlider.size(Math.max(50, half - 96));
    tuneCheckbox.position(ctl.rightX, rowY(2) - 11);
  } else {
    ctl = { leftX: margin + 4, rightX: margin + half + 10, labelSize: 16 };
    const lw = 190;
    mSelect.position(ctl.leftX + 102, rowY(0) - 12);
    signalSelect.position(ctl.rightX + 98, rowY(0) - 12);
    nSlider.position(ctl.leftX + lw, rowY(1) - 10);
    nSlider.size(Math.max(60, half - lw - 14));
    toneSlider.position(ctl.rightX + 150, rowY(1) - 10);
    toneSlider.size(Math.max(60, canvasWidth - margin - ctl.rightX - 150));
    tuneCheckbox.position(ctl.leftX, rowY(2) - 11);
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
