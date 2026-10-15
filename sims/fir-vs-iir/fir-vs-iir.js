// FIR vs IIR Filters MicroSim
// CANVAS_HEIGHT: 700
// Designs two low-pass filters for the same cutoff f_c and compares them side by side:
// an FIR windowed sinc (Hamming window, N taps, linear phase) and an IIR Butterworth
// (order N, bilinear transform with pre-warping). Panels: magnitude in dB, unwrapped phase,
// group delay, impulse response h[n] (first 64 samples), the IIR pole-zero plot and a table of
// costs. A stability experiment rounds the IIR coefficients to B bits, either in direct form or
// as cascaded second-order sections, and checks whether any pole leaves the unit circle
// (direct-form poles are found numerically with the Durand-Kerner iteration).

// Canvas dimensions (the height is fixed; the control area grows on narrow screens)
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let canvasHeight = 700;
let controlHeight = 112;             // 3 control rows when wide, 5 rows when narrow
let drawHeight = canvasHeight - controlHeight;
let margin = 10;
let defaultTextSize = 16;
const WIDE_MIN = 640;                // below this width: 2 equal columns and 5 control rows
const CTRL_WIDE = 112, CTRL_NARROW = 184;

// Controls
let cutoffSlider, tapsSlider, orderSlider, bitsSlider;
let formSelect, quantCheckbox;
let layoutWidth = -1;
let wideLayout = true;
let ctl = { labelW: 165, colW: 440 };

// Current parameter values (read from the controls every frame)
let fc = 0.1, nTaps = 31, iirOrder = 4, bits = 8, form = 'direct', quantOn = false;

// Frequency grid used for all frequency-domain plots: f = 0 ... 0.5 (fraction of fs)
const NF = 501;
const FGRID = Array.from({ length: NF }, (_, i) => 0.5 * i / (NF - 1));
const IMP_LEN = 64;                  // impulse-response samples shown
const DB_TOP = 10, DB_BOT = -108;    // magnitude axis range in dB

// Colors
const COL_FIR = [25, 90, 200];       // FIR: blue
const COL_IIR = [20, 135, 60];       // IIR: green
const COL_Q = [205, 30, 30];         // quantized IIR / instability: red
const COL_FC = [190, 140, 0];        // cutoff marker: gold

// Cached design and analysis results (recomputed only when a parameter changes)
let cacheKey = '';
let D = null;

// Mouse probe
let hover = false;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  canvas.mouseOver(() => { hover = true; });
  canvas.mouseOut(() => { hover = false; });
  textSize(defaultTextSize);

  cutoffSlider = createSlider(0.02, 0.45, 0.1, 0.005);
  tapsSlider = createSlider(5, 101, 31, 2);
  orderSlider = createSlider(1, 8, 4, 1);
  bitsSlider = createSlider(4, 16, 8, 1);

  formSelect = createSelect();
  formSelect.option('Direct form', 'direct');
  formSelect.option('Cascaded biquads', 'biquad');
  formSelect.selected('direct');

  quantCheckbox = createCheckbox('Quantize IIR to B bits', false);

  layoutControls(true);
  describe('Compares an FIR windowed-sinc low-pass filter (blue) with an IIR Butterworth low-pass filter (green) designed for the same cutoff. Panels show the magnitude response in dB, the phase, the group delay, the first 64 samples of each impulse response, the IIR pole-zero plot and a table of multiplies per sample, group delay at DC and attenuation. Sliders set the cutoff, the number of FIR taps and the IIR order; a checkbox, a bits slider and a structure menu round the IIR coefficients to B bits in direct form or cascaded biquads and report whether any pole leaves the unit circle.');
}

function draw() {
  updateCanvasSize();
  readControls();
  recompute();

  // Drawing region and control region
  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  const L = computeLayout();
  drawTitleAndLegend(L);
  drawMagnitudePanel(L.mag);
  drawPhasePanel(L.phase);
  drawGroupDelayPanel(L.gd);
  drawImpulsePanel(L.imp);
  drawPoleZeroPanel(L.pz);
  drawReadouts(L.ro);
  drawProbe(L);
  drawControlLabels();
}

// ================================================================ state

function readControls() {
  fc = Number(cutoffSlider.value());
  nTaps = Number(tapsSlider.value());
  if (nTaps % 2 === 0) nTaps += 1;                 // odd length: integer delay (N-1)/2
  iirOrder = Number(orderSlider.value());
  bits = Number(bitsSlider.value());
  form = formSelect.value() === 'biquad' ? 'biquad' : 'direct';
  quantOn = quantCheckbox.checked();
}

function recompute() {
  const key = [fc, nTaps, iirOrder, bits, form, quantOn].join('|');
  if (key === cacheKey && D) return;
  cacheKey = key;

  const h = designFIR(nTaps, fc);
  const firSec = [{ b: h, a: [1] }];
  const bw = designButterworth(iirOrder, fc);

  const firImp = new Float64Array(IMP_LEN);
  for (let n = 0; n < Math.min(nTaps, IMP_LEN); n++) firImp[n] = h[n];

  let q = null;
  if (quantOn) {
    q = quantizeDesign(bw, form, bits);
    q.resp = q.stable ? analyse(q.sections) : null;
    q.imp = impulseResponse(q.sections, IMP_LEN);
  }

  D = {
    h, bw, q, firImp,
    fir: analyse(firSec),
    iir: analyse(bw.sections),
    iirImp: impulseResponse(bw.sections, IMP_LEN),
    firAtFc: dBAt(firSec, fc), iirAtFc: dBAt(bw.sections, fc),
    firAt2fc: 2 * fc <= 0.5 ? dBAt(firSec, 2 * fc) : null,
    iirAt2fc: 2 * fc <= 0.5 ? dBAt(bw.sections, 2 * fc) : null,
    firGd0: (nTaps - 1) / 2,
    iirGd0: responseAt(bw.sections, 0).gd,
    iirMaxPole: maxAbs(bw.poles),
    firMult: nTaps,
    iirMult: multipliesIIR(iirOrder, form)
  };
}

// Multiplies per output sample of the IIR structure
function multipliesIIR(order, f) {
  if (f === 'direct') return 2 * order + 1;                 // b0..bN and a1..aN
  return 5 * Math.floor(order / 2) + 3 * (order % 2);       // 5 per biquad, 3 per 1st-order section
}

// ================================================================ filter design

// Windowed-sinc low-pass: h[n] = 2 fc sinc(2 fc (n - M)) w[n], Hamming window, M = (N-1)/2.
// The taps are scaled so that the DC gain is exactly 1 (0 dB).
function designFIR(N, fcut) {
  const M = (N - 1) / 2;
  const h = new Array(N);
  let sum = 0;
  for (let n = 0; n < N; n++) {
    const x = 2 * fcut * (n - M);
    const sinc = Math.abs(x) < 1e-12 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const w = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1));
    h[n] = 2 * fcut * sinc * w;
    sum += h[n];
  }
  for (let n = 0; n < N; n++) h[n] /= sum;
  return h;
}

// Butterworth low-pass of order N with its -3 dB point at fcut (fraction of fs).
// Analog poles on a circle of radius Wc = 2 tan(pi fcut) (pre-warped, T = 1), mapped by the
// bilinear transform z = (2 + s) / (2 - s). All N zeros land at z = -1.
// Returns second-order sections (plus one first-order section when N is odd), each with unity DC gain.
function designButterworth(N, fcut) {
  const Wc = 2 * Math.tan(Math.PI * fcut);
  const sections = [], poles = [], zeros = [];
  for (let k = 0; k < Math.floor(N / 2); k++) {
    const theta = Math.PI * (2 * k + N + 1) / (2 * N);
    const pr = Wc * Math.cos(theta), pim = Wc * Math.sin(theta);
    const z = cdiv(2 + pr, pim, 2 - pr, -pim);
    poles.push({ re: z[0], im: z[1] }, { re: z[0], im: -z[1] });
    const a1 = -2 * z[0], a2 = z[0] * z[0] + z[1] * z[1];
    const g = (1 + a1 + a2) / 4;
    sections.push({ b: [g, 2 * g, g], a: [1, a1, a2] });
  }
  if (N % 2 === 1) {
    const p = (2 - Wc) / (2 + Wc);
    poles.push({ re: p, im: 0 });
    const g = (1 - p) / 2;
    sections.push({ b: [g, g], a: [1, -p] });
  }
  for (let k = 0; k < N; k++) zeros.push({ re: -1, im: 0 });
  return { sections, poles, zeros, Wc };
}

// Multiply the sections out into one direct-form transfer function B(z)/A(z)
function sectionsToDirect(sections) {
  let b = [1], a = [1];
  for (const s of sections) { b = polyMul(b, s.b); a = polyMul(a, s.a); }
  return { b, a };
}

function polyMul(p, q) {
  const r = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) r[i + j] += p[i] * q[j];
  }
  return r;
}

// Round a list of coefficients to B-bit signed fixed point that shares one binary point:
// step q = 2^(e - (B-1)) with 2^e the smallest power of two above the largest |coefficient|.
function quantizeList(c, B) {
  let m = 0;
  for (const v of c) m = Math.max(m, Math.abs(v));
  if (m === 0) return c.slice();
  const e = Math.floor(Math.log2(m)) + 1;
  const q = Math.pow(2, e - (B - 1));
  const maxCode = Math.pow(2, B - 1) - 1;
  return c.map(v => Math.min(maxCode, Math.max(-maxCode - 1, Math.round(v / q))) * q);
}

// Quantize the Butterworth design in the chosen structure; a0 = 1 is kept exact.
// The b's and the a's of each section (or of the single direct-form polynomial) are rounded separately.
function quantizeDesign(bw, structure, B) {
  let sections;
  const poles = [], zeros = [];
  if (structure === 'biquad') {
    sections = bw.sections.map(s => ({ b: quantizeList(s.b, B), a: [1].concat(quantizeList(s.a.slice(1), B)) }));
    for (const s of sections) {
      poles.push(...polyRoots(s.a));
      zeros.push(...polyRoots(s.b));
    }
  } else {
    const d = sectionsToDirect(bw.sections);
    const b = quantizeList(d.b, B);
    const a = [1].concat(quantizeList(d.a.slice(1), B));
    sections = [{ b, a }];
    poles.push(...polyRoots(a));
    zeros.push(...polyRoots(b));
  }
  const mp = maxAbs(poles);
  return { sections, poles, zeros, maxPole: mp, stable: mp < 1 - 1e-12, structure, B };
}

// ================================================================ analysis

// C(w) = sum c_k e^{-jwk} and D(w) = sum k c_k e^{-jwk}; group delay of C is Re(D/C)
function polyEval(c, w) {
  let cr = 0, ci = 0, dr = 0, di = 0;
  for (let k = 0; k < c.length; k++) {
    const co = Math.cos(w * k), si = Math.sin(w * k);
    cr += c[k] * co; ci -= c[k] * si;
    dr += k * c[k] * co; di -= k * c[k] * si;
  }
  return [cr, ci, dr, di];
}

// Frequency response and group delay (samples) of a cascade of sections at frequency f
function responseAt(sections, f) {
  const w = 2 * Math.PI * f;
  let hr = 1, hi = 0, gd = 0, ok = true;
  for (const s of sections) {
    const B = polyEval(s.b, w), A = polyEval(s.a, w);
    const aa = A[0] * A[0] + A[1] * A[1];
    const bb = B[0] * B[0] + B[1] * B[1];
    let sb = 0;
    for (const v of s.b) sb += Math.abs(v);
    if (bb <= 1e-20 * sb * sb) ok = false;           // at (or extremely near) a zero on the unit circle
    const qr = (B[0] * A[0] + B[1] * A[1]) / aa, qi = (B[1] * A[0] - B[0] * A[1]) / aa;
    const nr = hr * qr - hi * qi;
    hi = hr * qi + hi * qr;
    hr = nr;
    gd += (B[2] * B[0] + B[3] * B[1]) / bb - (A[2] * A[0] + A[3] * A[1]) / aa;
  }
  return { re: hr, im: hi, gd, ok };
}

function dBAt(sections, f) {
  const r = responseAt(sections, f);
  return 20 * Math.log10(Math.max(Math.hypot(r.re, r.im), 1e-300));
}

// Magnitude (dB), unwrapped phase (rad) and group delay (samples) on the frequency grid
function analyse(sections) {
  const db = new Float64Array(NF), ph = new Float64Array(NF), gd = new Float64Array(NF);
  let prev = 0, acc = 0, started = false;
  for (let i = 0; i < NF; i++) {
    const r = responseAt(sections, FGRID[i]);
    const mag = Math.hypot(r.re, r.im);
    db[i] = 20 * Math.log10(Math.max(mag, 1e-12));
    if (r.ok && mag > 1e-280 && isFinite(r.gd)) {
      const p = Math.atan2(r.im, r.re);
      if (!started) { acc = p; started = true; }
      else {
        let d = p - prev;
        d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
        acc += d;
      }
      prev = p;
      ph[i] = acc;
      gd[i] = r.gd;
    } else {
      ph[i] = NaN;
      gd[i] = NaN;
    }
  }
  return { db, ph, gd };
}

// Impulse response of a cascade: y[n] = sum b_k x[n-k] - sum_{k>=1} a_k y[n-k]
function impulseResponse(sections, len) {
  let x = new Float64Array(len);
  x[0] = 1;
  for (const s of sections) {
    const y = new Float64Array(len);
    for (let n = 0; n < len; n++) {
      let acc = 0;
      for (let k = 0; k < s.b.length && k <= n; k++) acc += s.b[k] * x[n - k];
      for (let k = 1; k < s.a.length && k <= n; k++) acc -= s.a[k] * y[n - k];
      y[n] = acc / s.a[0];
    }
    x = y;
  }
  return x;
}

// Roots of c[0] z^n + c[1] z^(n-1) + ... + c[n]. Closed form for degree 1 and 2,
// Durand-Kerner (Weierstrass) iteration otherwise.
function polyRoots(c) {
  let s = 0;
  while (s < c.length && c[s] === 0) s++;          // leading zeros: roots at infinity (dropped)
  const p = c.slice(s);
  const n = p.length - 1;
  if (n < 1) return [];
  const a = p.map(v => v / p[0]);
  if (n === 1) return [{ re: -a[1], im: 0 }];
  if (n === 2) {
    const disc = a[1] * a[1] - 4 * a[2];
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      const r1 = (-a[1] - Math.sign(a[1] || 1) * sq) / 2;   // numerically stable pair
      const r2 = r1 !== 0 ? a[2] / r1 : 0;
      return [{ re: r1, im: 0 }, { re: r2, im: 0 }];
    }
    const im = Math.sqrt(-disc) / 2;
    return [{ re: -a[1] / 2, im }, { re: -a[1] / 2, im: -im }];
  }
  const zr = new Array(n), zi = new Array(n);
  let gr = 1, gi = 0;
  for (let k = 0; k < n; k++) {                    // initial guesses (0.4 + 0.9j)^(k+1)
    const t = gr * 0.4 - gi * 0.9;
    gi = gr * 0.9 + gi * 0.4;
    gr = t;
    zr[k] = gr; zi[k] = gi;
  }
  for (let it = 0; it < 2000; it++) {
    let maxStep = 0;
    for (let i = 0; i < n; i++) {
      let pr = 1, pim = 0;                         // Horner: monic polynomial at z_i
      for (let k = 1; k <= n; k++) {
        const t = pr * zr[i] - pim * zi[i] + a[k];
        pim = pr * zi[i] + pim * zr[i];
        pr = t;
      }
      let dr = 1, di = 0;                          // product of (z_i - z_j)
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const ur = zr[i] - zr[j], ui = zi[i] - zi[j];
        const t = dr * ur - di * ui;
        di = dr * ui + di * ur;
        dr = t;
      }
      const den = dr * dr + di * di;
      if (den < 1e-300) { zr[i] += 1e-6; zi[i] += 1e-6; maxStep = 1; continue; }
      const qr = (pr * dr + pim * di) / den, qi = (pim * dr - pr * di) / den;
      zr[i] -= qr; zi[i] -= qi;
      maxStep = Math.max(maxStep, Math.hypot(qr, qi));
    }
    if (maxStep < 1e-14) break;
  }
  const out = [];
  for (let k = 0; k < n; k++) out.push({ re: zr[k], im: Math.abs(zi[k]) < 1e-11 ? 0 : zi[k] });
  return out;
}

function cdiv(ar, ai, br, bi) {
  const d = br * br + bi * bi;
  return [(ar * br + ai * bi) / d, (ai * br - ar * bi) / d];
}

function maxAbs(roots) {
  let m = 0;
  for (const r of roots) m = Math.max(m, Math.hypot(r.re, r.im));
  return m;
}

// ================================================================ layout

function computeLayout() {
  const W = canvasWidth;
  if (wideLayout) {
    const top = 34, bottom = drawHeight - 6, gap = 10;
    const x0 = 8, totalW = W - 16;
    const leftW = Math.round(totalW * 0.6 - gap / 2);
    const rightX = x0 + leftW + gap, rightW = W - 8 - rightX;
    const avail = bottom - top - 2 * gap;
    const h1 = Math.round(avail * 0.40), h2 = Math.round(avail * 0.27), h3 = avail - h1 - h2;
    const y2 = top + h1 + gap, y3 = y2 + h2 + gap;
    return {
      wide: true, hh: 20, th: 18, fs: 14,
      mag: { x: x0, y: top, w: leftW, h: h1 },
      phase: { x: x0, y: y2, w: leftW, h: h2 },
      imp: { x: x0, y: y3, w: leftW, h: h3 },
      pz: { x: rightX, y: top, w: rightW, h: h1 },
      gd: { x: rightX, y: y2, w: rightW, h: h2 },
      ro: { x: rightX, y: y3, w: rightW, h: h3 }
    };
  }
  const top = 46, bottom = drawHeight - 4, gap = 6;
  const x0 = 4, colW = Math.floor((W - 8 - gap) / 2);
  const x1 = x0 + colW + gap;
  const rowH = Math.floor((bottom - top - 2 * gap) / 3);
  const ys = [top, top + rowH + gap, top + 2 * (rowH + gap)];
  return {
    wide: false, hh: 17, th: 16, fs: 13,
    mag: { x: x0, y: ys[0], w: colW, h: rowH },
    pz: { x: x1, y: ys[0], w: colW, h: rowH },
    phase: { x: x0, y: ys[1], w: colW, h: rowH },
    gd: { x: x1, y: ys[1], w: colW, h: rowH },
    imp: { x: x0, y: ys[2], w: colW, h: rowH },
    ro: { x: x1, y: ys[2], w: colW, h: rowH }
  };
}

// Plot rectangle inside a panel (header above, tick labels below, y tick labels on the left)
function plotArea(P, yLabW) {
  const L = currentLayout();
  return { l: P.x + yLabW, r: P.x + P.w - 6, t: P.y + L.hh, b: P.y + P.h - L.th };
}

let layoutCache = null;
function currentLayout() {
  if (!layoutCache || layoutCache.w !== canvasWidth) layoutCache = { w: canvasWidth, L: computeLayout() };
  return layoutCache.L;
}

// ================================================================ drawing: frame pieces

function drawTitleAndLegend(L) {
  noStroke();
  fill('black');
  textStyle(BOLD);
  const titleSize = L.wide ? 20 : 18;
  textSize(titleSize);
  textAlign(LEFT, CENTER);
  const title = 'FIR vs IIR Filters';
  text(title, margin, L.wide ? 17 : 14);
  const titleW = advW(title);
  textStyle(NORMAL);

  const qLabel = 'IIR quantized, B = ' + bits;
  const sets = [
    [['line', COL_FIR, 'FIR: windowed sinc (Hamming), N = ' + nTaps],
     ['line', COL_IIR, 'IIR: Butterworth, order ' + iirOrder],
     ...(quantOn ? [['dash', COL_Q, qLabel + ' (' + (form === 'direct' ? 'direct form' : 'biquads') + ')']] : []),
     ['dash', COL_FC, 'cutoff f_c']],
    [['line', COL_FIR, 'FIR, N = ' + nTaps],
     ['line', COL_IIR, 'IIR Butterworth, order ' + iirOrder],
     ...(quantOn ? [['dash', COL_Q, qLabel]] : []),
     ['dash', COL_FC, 'cutoff f_c']],
    [['line', COL_FIR, 'FIR N=' + nTaps],
     ['line', COL_IIR, 'IIR order ' + iirOrder],
     ...(quantOn ? [['dash', COL_Q, 'quantized']] : []),
     ['dash', COL_FC, 'f_c']]
  ];
  const sz = L.wide ? 14 : 13;
  const widthOf = items => items.reduce((w, it) => w + 26 + richWidth(it[2], sz) + 14, 0) - 14;
  const y = L.wide ? 17 : 34;
  const avail = L.wide ? canvasWidth - 2 * margin - titleW - 24 : canvasWidth - 2 * margin;
  const items = sets.find(s => widthOf(s) <= avail) || sets[2];
  let x = L.wide ? canvasWidth - margin - widthOf(items) : margin;
  if (!L.wide) x = Math.max(margin, (canvasWidth - widthOf(items)) / 2);
  for (const it of items) {
    legendSwatch(it[0], it[1], x, y);
    noStroke();
    fill(it[1][0] * 0.8, it[1][1] * 0.8, it[1][2] * 0.8);
    if (it[1] === COL_FC) fill(120, 90, 0);
    richText(it[2], x + 26, y, sz, LEFT);
    x += 26 + richWidth(it[2], sz) + 14;
  }
}

function legendSwatch(kind, col, x, y) {
  stroke(col[0], col[1], col[2]);
  strokeWeight(2.5);
  if (kind === 'dash') drawingContext.setLineDash([5, 4]);
  line(x, y, x + 20, y);
  drawingContext.setLineDash([]);
}

function panelHeader(P, cands) {
  const L = currentLayout();
  noStroke();
  fill(30);
  textStyle(BOLD);
  fitText(cands, P.x + 2, P.y + L.hh / 2 - 1, P.w - 4, L.wide ? 15 : 13, LEFT);
  textStyle(NORMAL);
}

function plotFrame(A) {
  fill(255);
  stroke(190);
  strokeWeight(1);
  rect(A.l, A.t, A.r - A.l, A.b - A.t);
}

function startClip(A) {
  push();
  drawingContext.beginPath();
  drawingContext.rect(A.l, A.t, A.r - A.l, A.b - A.t);
  drawingContext.clip();
}
function stopClip() { pop(); }

function fx(A, f) { return A.l + f / 0.5 * (A.r - A.l); }
function fOfX(A, x) { return (x - A.l) / (A.r - A.l) * 0.5; }

// Frequency axis: grid lines, tick labels and the axis title at the right of the tick row
function freqAxis(A) {
  const L = currentLayout();
  const step = (A.r - A.l) >= 260 ? 0.1 : 0.25;
  stroke(232);
  strokeWeight(1);
  for (let f = step; f < 0.5 - 1e-9; f += step) line(fx(A, f), A.t, fx(A, f), A.b);
  noStroke();
  fill(70);
  textSize(L.fs);
  const title = 'f / f_s';
  const tw = richWidth(title, L.fs);
  richText(title, A.r, A.b + L.th / 2 + 1, L.fs, RIGHT);
  textSize(L.fs);
  textAlign(CENTER, CENTER);
  for (let f = 0; f <= 0.5 + 1e-9; f += step) {
    const s = f === 0 ? '0' : (step === 0.25 ? f.toFixed(2) : f.toFixed(1));
    const x = fx(A, f);
    if (x + advW(s) / 2 > A.r - tw - 6) continue;
    text(s, x, A.b + L.th / 2 + 1);
  }
}

// Horizontal grid and y tick labels for values in ticks, mapped by ymap
function yAxis(A, ticks, ymap, label) {
  const L = currentLayout();
  stroke(232);
  strokeWeight(1);
  for (const v of ticks) {
    const y = ymap(v);
    if (y > A.t + 1 && y < A.b - 1) line(A.l, y, A.r, y);
  }
  noStroke();
  fill(70);
  textSize(L.fs);
  textAlign(RIGHT, CENTER);
  for (const v of ticks) {
    const y = ymap(v);
    if (y < A.t - 2 || y > A.b + 2) continue;
    text(label(v), A.l - 4, y);
  }
}

function cutoffLine(A) {
  const x = fx(A, fc);
  stroke(COL_FC[0], COL_FC[1], COL_FC[2]);
  strokeWeight(1.5);
  drawingContext.setLineDash([5, 4]);
  line(x, A.t, x, A.b);
  drawingContext.setLineDash([]);
}

// Polyline over the frequency grid; NaN values leave gaps
function gridCurve(A, vals, ymap, col, weight, dashed) {
  noFill();
  stroke(col[0], col[1], col[2]);
  strokeWeight(weight);
  if (dashed) drawingContext.setLineDash([7, 5]);
  let open = false;
  for (let i = 0; i < NF; i++) {
    const v = vals[i];
    if (!isFinite(v)) {
      if (open) { endShape(); open = false; }
      continue;
    }
    if (!open) { beginShape(); open = true; }
    vertex(fx(A, FGRID[i]), ymap(v));
  }
  if (open) endShape();
  drawingContext.setLineDash([]);
}

// "nice" tick values covering [lo, hi] with about n intervals
function niceTicks(lo, hi, n) {
  const span = Math.max(hi - lo, 1e-9);
  const raw = span / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  const out = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9 * step; v += step) out.push(Math.abs(v) < 1e-12 ? 0 : v);
  return { ticks: out, step };
}

// ================================================================ drawing: panels

function drawMagnitudePanel(P) {
  const L = currentLayout();
  const A = plotArea(P, L.wide ? 38 : 32);
  panelHeader(P, ['Magnitude response |H(f)| (dB)', 'Magnitude |H(f)| (dB)', '|H(f)| (dB)']);
  plotFrame(A);
  const ymap = v => A.t + (DB_TOP - constrain(v, DB_BOT - 5, DB_TOP + 5)) / (DB_TOP - DB_BOT) * (A.b - A.t);
  const ticks = (A.b - A.t) >= 140 ? [0, -20, -40, -60, -80, -100] : [0, -50, -100];
  yAxis(A, ticks, ymap, v => fmtInt(v));
  freqAxis(A);
  stroke(170);
  strokeWeight(1);
  line(A.l, ymap(0), A.r, ymap(0));

  startClip(A);
  cutoffLine(A);
  gridCurve(A, D.fir.db, ymap, COL_FIR, 2, false);
  gridCurve(A, D.iir.db, ymap, COL_IIR, 2, false);
  if (D.q && D.q.resp) gridCurve(A, D.q.resp.db, ymap, COL_Q, 2, true);
  stopClip();

  if (D.q && !D.q.stable) {
    noStroke();
    fill(COL_Q[0], COL_Q[1], COL_Q[2]);
    textStyle(BOLD);
    boxedText(['Quantized IIR is unstable: it has no frequency response',
               'Quantized IIR unstable: no response', 'unstable: no response'],
              A.r - 6, A.t + (L.wide ? 14 : 30), A.r - A.l - 12, L.wide ? 14 : 12, RIGHT, COL_Q);
    textStyle(NORMAL);
  }
}

function drawPhasePanel(P) {
  const L = currentLayout();
  const A = plotArea(P, L.wide ? 38 : 32);
  panelHeader(P, ['Phase (unwrapped, radians)', 'Phase (radians)', 'Phase (rad)']);
  plotFrame(A);
  let lo = 0, hi = 0;
  for (const arr of [D.fir.ph, D.iir.ph]) {
    for (const v of arr) if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  }
  lo /= Math.PI; hi /= Math.PI;                       // work in units of pi
  const nt = niceTicks(lo, hi, (A.b - A.t) >= 90 ? 4 : 3);
  const yLo = Math.min(lo, nt.ticks[0]), yHi = Math.max(hi, nt.ticks[nt.ticks.length - 1]);
  const ymap = v => A.b - 3 - (v / Math.PI - yLo) / Math.max(yHi - yLo, 1e-9) * (A.b - A.t - 6);
  yAxis(A, nt.ticks.map(v => v * Math.PI), ymap, v => piLabel(v / Math.PI));
  freqAxis(A);
  startClip(A);
  cutoffLine(A);
  gridCurve(A, D.fir.ph, ymap, COL_FIR, 2, false);
  gridCurve(A, D.iir.ph, ymap, COL_IIR, 2, false);
  stopClip();
}

function drawGroupDelayPanel(P) {
  const L = currentLayout();
  const A = plotArea(P, L.wide ? 38 : 32);
  panelHeader(P, ['Group delay (samples)', 'Group delay', 'Delay']);
  plotFrame(A);
  let hi = D.firGd0, lo = 0;
  for (const arr of [D.fir.gd, D.iir.gd]) {
    for (const v of arr) if (isFinite(v)) { hi = Math.max(hi, v); lo = Math.min(lo, v); }
  }
  const nt = niceTicks(lo, hi * 1.05, (A.b - A.t) >= 90 ? 4 : 3);
  const yLo = Math.min(lo, nt.ticks[0]), yHi = Math.max(hi * 1.05, nt.ticks[nt.ticks.length - 1]);
  const ymap = v => A.b - 2 - (v - yLo) / Math.max(yHi - yLo, 1e-9) * (A.b - A.t - 4);
  yAxis(A, nt.ticks, ymap, v => fmtNum(v));
  freqAxis(A);
  startClip(A);
  cutoffLine(A);
  gridCurve(A, D.fir.gd, ymap, COL_FIR, 2, false);
  gridCurve(A, D.iir.gd, ymap, COL_IIR, 2, false);
  stopClip();
}

function drawImpulsePanel(P) {
  const L = currentLayout();
  const A = plotArea(P, L.wide ? 46 : 38);
  panelHeader(P, ['Impulse response h[n] (first ' + IMP_LEN + ' samples)', 'Impulse response h[n]', 'h[n]']);
  plotFrame(A);

  let lo = 0, hi = 0;
  for (const arr of [D.firImp, D.iirImp]) for (const v of arr) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const pad = 0.08 * (hi - lo || 1);
  lo -= pad; hi += pad;
  const ymap = v => A.b - (v - lo) / (hi - lo) * (A.b - A.t);
  const nt = niceTicks(lo, hi, (A.b - A.t) >= 100 ? 4 : 3);
  yAxis(A, nt.ticks, ymap, v => fmtNum(v));

  // n axis
  const nx = n => A.l + (n + 0.5) / IMP_LEN * (A.r - A.l);
  noStroke();
  fill(70);
  textSize(L.fs);
  const title = 'n';
  textAlign(RIGHT, CENTER);
  text(title, A.r, A.b + L.th / 2 + 1);
  textAlign(CENTER, CENTER);
  const nStep = (A.r - A.l) >= 300 ? 8 : 16;
  for (let n = 0; n < IMP_LEN; n += nStep) {
    if (nx(n) > A.r - 18) continue;
    text(String(n), nx(n), A.b + L.th / 2 + 1);
  }
  stroke(150);
  strokeWeight(1);
  const y0 = ymap(0);
  line(A.l, y0, A.r, y0);

  startClip(A);
  // end of the FIR: h[n] = 0 for n >= N
  if (nTaps - 1 < IMP_LEN) {
    const xe = nx(nTaps - 1) + 0.5 * (A.r - A.l) / IMP_LEN;
    stroke(COL_FIR[0], COL_FIR[1], COL_FIR[2], 150);
    strokeWeight(1);
    drawingContext.setLineDash([3, 3]);
    line(xe, A.t, xe, A.b);
    drawingContext.setLineDash([]);
  }
  const dx = (A.r - A.l) / IMP_LEN;
  const r = Math.max(2.5, Math.min(4.5, dx * 0.45));
  stems(D.firImp, n => nx(n) - dx * 0.2, ymap, y0, COL_FIR, r, Math.min(nTaps, IMP_LEN));
  stems(D.iirImp, n => nx(n) + dx * 0.2, ymap, y0, COL_IIR, r, IMP_LEN);
  if (D.q) {
    noFill();
    stroke(COL_Q[0], COL_Q[1], COL_Q[2]);
    strokeWeight(1.5);
    drawingContext.setLineDash([4, 3]);
    beginShape();
    for (let n = 0; n < IMP_LEN; n++) vertex(nx(n) + dx * 0.2, constrain(ymap(D.q.imp[n]), A.t - 50, A.b + 50));
    endShape();
    drawingContext.setLineDash([]);
  }
  stopClip();
  if (D.q && D.q.imp.some(v => v < lo || v > hi)) {
    noStroke();
    fill(COL_Q[0], COL_Q[1], COL_Q[2]);
    textStyle(BOLD);
    boxedText(['quantized h[n] runs off the scale', 'quantized h[n] off scale', 'off scale'],
              A.r - 4, A.b - 11, (A.r - A.l) * 0.6, L.wide ? 13 : 12, RIGHT, COL_Q);
    textStyle(NORMAL);
  }

  // annotation: where the FIR ends
  const fsz = L.wide ? 13 : 12;
  const ty = A.t + 4 + fsz * 0.7;
  if (nTaps - 1 < IMP_LEN) {
    const xe = nx(nTaps - 1) + 0.5 * dx;
    const s = L.wide ? 'FIR ends at n = ' + (nTaps - 1) : 'FIR ends';
    if (xe + 8 + richWidth(s, fsz) < A.r - 4) boxedText([s], xe + 6, ty, 999, fsz, LEFT, COL_FIR);
    else boxedText([s], xe - 6, ty, 999, fsz, RIGHT, COL_FIR);
  } else {
    boxedText([L.wide ? 'FIR continues to n = ' + (nTaps - 1) : 'FIR to n = ' + (nTaps - 1)], A.r - 6, ty, 999, fsz, RIGHT, COL_FIR);
  }
}

function stems(vals, xOf, ymap, y0, col, r, count) {
  for (let n = 0; n < count; n++) {
    const x = xOf(n), y = ymap(vals[n]);
    stroke(col[0], col[1], col[2]);
    strokeWeight(1.3);
    line(x, y0, x, y);
    noStroke();
    fill(col[0], col[1], col[2]);
    circle(x, y, r);
  }
}

function drawPoleZeroPanel(P) {
  const L = currentLayout();
  panelHeader(P, ['IIR pole-zero plot (z-plane)', 'IIR poles and zeros', 'IIR z-plane']);
  const t = P.y + L.hh, b = P.y + P.h - 2;
  const side = Math.max(60, Math.min(b - t, P.w - 4));
  const keyW = 150;
  const hasKey = L.wide && P.w - side >= keyW + 8;
  const sx = hasKey ? P.x + 2 : P.x + (P.w - side) / 2;
  const cx = sx + side / 2, cy = t + side / 2;

  const shown = D.bw.poles.slice();
  if (D.q) shown.push(...D.q.poles, ...D.q.zeros);
  const R = Math.max(1.35, Math.min(4, 1.1 * maxAbs(shown)));
  const s = side / 2 / R;
  const zx = re => cx + re * s, zy = im => cy - im * s;

  fill(255);
  stroke(190);
  strokeWeight(1);
  rect(sx, t, side, side);

  push();
  drawingContext.beginPath();
  drawingContext.rect(sx, t, side, side);
  drawingContext.clip();
  stroke(225);
  line(sx, cy, sx + side, cy);
  line(cx, t, cx, t + side);
  stroke(80);
  strokeWeight(1.5);
  noFill();
  circle(cx, cy, 2 * s);

  // ideal Butterworth: N zeros at z = -1 and the poles
  stroke(COL_IIR[0], COL_IIR[1], COL_IIR[2]);
  strokeWeight(2);
  noFill();
  circle(zx(-1), zy(0), 11);
  for (const p of D.bw.poles) drawCross(zx(p.re), zy(p.im), 5, COL_IIR, 2);

  // quantized poles (red x) and zeros (small red o); a ring marks poles on or outside |z| = 1
  if (D.q) {
    stroke(COL_Q[0], COL_Q[1], COL_Q[2]);
    strokeWeight(1.5);
    noFill();
    for (const z of D.q.zeros) circle(zx(z.re), zy(z.im), 7);
    for (const p of D.q.poles) {
      drawCross(zx(p.re), zy(p.im), 5, COL_Q, 2);
      if (Math.hypot(p.re, p.im) >= 1 - 1e-12) {
        stroke(COL_Q[0], COL_Q[1], COL_Q[2]);
        strokeWeight(1.5);
        noFill();
        circle(zx(p.re), zy(p.im), 18);
      }
    }
  }
  pop();

  // axis labels and multiplicity of the zero at -1
  noStroke();
  fill(70);
  textSize(L.wide ? 13 : 12);
  textAlign(LEFT, TOP);
  if (zx(1) + 14 < sx + side) text('1', zx(1) + 3, cy + 2);
  textAlign(RIGHT, BOTTOM);
  text('Re', sx + side - 3, cy - 2);
  textAlign(LEFT, TOP);
  text('Im', cx + 3, t + 2);
  fill(COL_IIR[0], COL_IIR[1], COL_IIR[2]);
  textAlign(LEFT, TOP);
  text(iirOrder > 1 ? '×' + iirOrder : '', zx(-1) + 7, zy(0) + 5);
  if (R > 1.36) {
    fill(70);
    textAlign(LEFT, BOTTOM);
    text('axes ±' + R.toFixed(1), sx + 3, t + side - 2);
  }

  if (hasKey) drawPZKey(sx + side + 10, t + 4, P.x + P.w - (sx + side + 10));
}

function drawCross(x, y, r, col, w) {
  stroke(col[0], col[1], col[2]);
  strokeWeight(w);
  line(x - r, y - r, x + r, y + r);
  line(x - r, y + r, x + r, y - r);
}

function drawPZKey(x, y, w) {
  const rows = [
    ['x', COL_IIR, 'Butterworth poles'],
    ['o', COL_IIR, iirOrder + (iirOrder > 1 ? ' zeros' : ' zero') + ' at z = −1'],
    ['c', [80, 80, 80], 'unit circle |z| = 1']
  ];
  if (D.q) {
    rows.push(['x', COL_Q, 'quantized poles'], ['o', COL_Q, 'quantized zeros'], ['r', COL_Q, 'pole on/outside |z| = 1']);
  }
  textSize(13);
  let yy = y + 8;
  for (const rw of rows) {
    const cx = x + 8;
    if (rw[0] === 'x') drawCross(cx, yy, 4, rw[1], 2);
    else {
      stroke(rw[1][0], rw[1][1], rw[1][2]);
      strokeWeight(rw[0] === 'r' ? 1.5 : 2);
      noFill();
      if (rw[0] === 'c') line(cx - 7, yy, cx + 7, yy);
      else circle(cx, yy, rw[0] === 'r' ? 15 : 9);
    }
    noStroke();
    fill(50);
    fitText([rw[2]], cx + 14, yy, w - 24, 13, LEFT);
    yy += 21;
  }
  // stability rule
  noStroke();
  fill(70);
  yy += 4;
  fitText(['Stable ⇔ every pole', 'Stable ⇔ all poles'], x, yy, w - 4, 13, LEFT);
  fitText(['inside the unit circle', 'inside |z| = 1'], x, yy + 17, w - 4, 13, LEFT);
}

function drawReadouts(P) {
  const L = currentLayout();
  fill(255, 255, 255, 235);
  stroke(200);
  strokeWeight(1);
  rect(P.x, P.y, P.w, P.h, 8);

  const sz = L.wide ? 14 : 12;
  const lh = L.wide ? Math.min(19, (P.h - 12) / 8) : Math.min(16, (P.h - 8) / 8.2);
  const xl = P.x + (L.wide ? 10 : 6);
  const xIIR = P.x + P.w - (L.wide ? 10 : 6);
  const xFIR = P.x + P.w * (L.wide ? 0.66 : 0.62);
  const labelW = xFIR - xl - (L.wide ? 46 : 34);
  let y = P.y + (L.wide ? 13 : 10);

  noStroke();
  textStyle(BOLD);
  fill(COL_FIR[0], COL_FIR[1], COL_FIR[2]);
  richText('FIR', xFIR, y, sz, RIGHT);
  fill(COL_IIR[0], COL_IIR[1], COL_IIR[2]);
  const iirHead = form === 'direct' ? ['IIR (direct form)', 'IIR (direct)', 'IIR'] : ['IIR (biquads)', 'IIR'];
  fitText(iirHead, xIIR, y, xIIR - xFIR - 8, sz, RIGHT);
  textStyle(NORMAL);

  const rows = [
    [['Multiplies per output sample', 'Multiplies per sample', 'Mult./sample'], String(D.firMult), String(D.iirMult)],
    [['Group delay at DC (samples)', 'Group delay at DC', 'Delay at DC'], D.firGd0.toFixed(1), D.iirGd0.toFixed(2)],
    [['|H| at f_c (dB)', '|H(f_c)| dB'], fmtDb(D.firAtFc), fmtDb(D.iirAtFc)],
    [['|H| at 2f_c (dB)', '|H(2f_c)| dB'], D.firAt2fc === null ? 'n/a' : fmtDb(D.firAt2fc), D.iirAt2fc === null ? 'n/a' : fmtDb(D.iirAt2fc)],
    [['Largest pole radius', 'Max |pole|'], '0', D.iirMaxPole.toFixed(4)]
  ];
  for (const r of rows) {
    y += lh;
    fill(40);
    fitText(r[0], xl, y, labelW, sz, LEFT);
    fill(COL_FIR[0], COL_FIR[1], COL_FIR[2]);
    richText(r[1], xFIR, y, sz, RIGHT);
    fill(COL_IIR[0], COL_IIR[1], COL_IIR[2]);
    richText(r[2], xIIR, y, sz, RIGHT);
  }

  // stability experiment
  y += lh * 1.15;
  const wAll = P.w - 2 * (xl - P.x);
  if (!D.q) {
    fill(110);
    fitText(['Tick "Quantize IIR to B bits" to round the', 'Tick "Quantize IIR" to round the', 'Tick "Quantize" to test'],
            xl, y, wAll, sz, LEFT);
    fitText(['IIR coefficients and test its stability.', 'IIR coefficients.', 'coefficient rounding.'],
            xl, y + lh, wAll, sz, LEFT);
    return;
  }
  const fName = form === 'direct' ? 'direct form' : 'biquads';
  fill(COL_Q[0], COL_Q[1], COL_Q[2]);
  fitText(['Quantized IIR (' + fName + ', B = ' + bits + ' bits):', 'Quantized (' + fName + ', ' + bits + ' bits):',
           'Quantized, ' + bits + ' bits:'], xl, y, wAll, sz, LEFT);
  const mp = D.q.maxPole;
  const onCircle = Math.abs(mp - 1) < 1e-9;
  const verdict = D.q.stable ? 'stable' : (onCircle ? 'NOT STABLE (on |z| = 1)' : 'UNSTABLE');
  textStyle(BOLD);
  if (D.q.stable) fill(COL_IIR[0], COL_IIR[1], COL_IIR[2]); else fill(COL_Q[0], COL_Q[1], COL_Q[2]);
  fitText(['largest pole radius ' + mp.toFixed(4) + ' → ' + verdict,
           'max |pole| ' + mp.toFixed(4) + ' → ' + verdict,
           '|p| ' + mp.toFixed(3) + ' ' + (D.q.stable ? 'stable' : 'UNSTABLE')], xl, y + lh, wAll, sz, LEFT);
  textStyle(NORMAL);
}

// ================================================================ mouse probe

function drawProbe(L) {
  if (!hover || mouseX < 0 || mouseX > canvasWidth || mouseY < 0 || mouseY > drawHeight) return;
  const panels = [
    ['mag', L.mag, L.wide ? 38 : 32], ['phase', L.phase, L.wide ? 38 : 32], ['gd', L.gd, L.wide ? 38 : 32],
    ['imp', L.imp, L.wide ? 46 : 38]
  ];
  for (const [kind, P, yl] of panels) {
    const A = plotArea(P, yl);
    if (mouseX < A.l || mouseX > A.r || mouseY < A.t || mouseY > A.b) continue;
    if (kind === 'imp') { probeImpulse(A); return; }
    const f = constrain(fOfX(A, mouseX), 0, 0.5);
    const i = Math.round(f / 0.5 * (NF - 1));
    // vertical line on all three frequency plots
    for (const [k2, P2, yl2] of panels) {
      if (k2 === 'imp') continue;
      const A2 = plotArea(P2, yl2);
      stroke(110);
      strokeWeight(1);
      line(fx(A2, FGRID[i]), A2.t, fx(A2, FGRID[i]), A2.b);
    }
    const lines = ['f = ' + FGRID[i].toFixed(3) + ' f_s'];
    if (kind === 'mag') {
      lines.push(['FIR ' + fmtDb(D.fir.db[i]) + ' dB', COL_FIR], ['IIR ' + fmtDb(D.iir.db[i]) + ' dB', COL_IIR]);
      if (D.q && D.q.resp) lines.push(['quant. ' + fmtDb(D.q.resp.db[i]) + ' dB', COL_Q]);
    } else if (kind === 'phase') {
      lines.push(['FIR ' + fmtPhase(D.fir.ph[i]), COL_FIR], ['IIR ' + fmtPhase(D.iir.ph[i]), COL_IIR]);
    } else {
      lines.push(['FIR ' + fmtGd(D.fir.gd[i]), COL_FIR], ['IIR ' + fmtGd(D.iir.gd[i]), COL_IIR]);
    }
    tooltip(A, lines);
    return;
  }
}

function probeImpulse(A) {
  const n = constrain(Math.floor((mouseX - A.l) / (A.r - A.l) * IMP_LEN), 0, IMP_LEN - 1);
  const x = A.l + (n + 0.5) / IMP_LEN * (A.r - A.l);
  stroke(110);
  strokeWeight(1);
  line(x, A.t, x, A.b);
  const lines = ['n = ' + n, ['FIR ' + fmtSample(D.firImp[n]), COL_FIR], ['IIR ' + fmtSample(D.iirImp[n]), COL_IIR]];
  if (D.q) lines.push(['quant. ' + fmtSample(D.q.imp[n]), COL_Q]);
  tooltip(A, lines);
}

function tooltip(A, lines) {
  const L = currentLayout();
  const sz = L.wide ? 13 : 12;
  textSize(sz);
  let w = 0;
  for (const ln of lines) w = Math.max(w, richWidth(Array.isArray(ln) ? ln[0] : ln, sz));
  w += 14;
  const lh = sz + 4;
  const h = lines.length * lh + 6;
  let x = mouseX + 12;
  if (x + w > A.r - 2) x = mouseX - 12 - w;
  x = constrain(x, A.l + 2, A.r - w - 2);
  const y = constrain(mouseY - h / 2, A.t + 2, A.b - h - 2);
  fill(255, 255, 255, 240);
  stroke(150);
  strokeWeight(1);
  rect(x, y, w, h, 5);
  noStroke();
  let yy = y + 3 + lh / 2;
  for (const ln of lines) {
    const s = Array.isArray(ln) ? ln[0] : ln;
    const c = Array.isArray(ln) ? ln[1] : [40, 40, 40];
    fill(c[0], c[1], c[2]);
    richText(s, x + 7, yy, sz, LEFT);
    yy += lh;
  }
}

// ================================================================ controls

function drawControlLabels() {
  noStroke();
  const sz = wideLayout ? defaultTextSize : 14;
  const rows = controlRows();
  fill('black');
  richText('Cutoff f_c = ' + fc.toFixed(3) + ' f_s', rows.cut.x, rows.cut.y, sz, LEFT);
  richText('FIR taps N = ' + nTaps, rows.taps.x, rows.taps.y, sz, LEFT);
  richText('IIR order = ' + iirOrder, rows.order.x, rows.order.y, sz, LEFT);
  if (wideLayout) richText('IIR structure:', rows.form.x, rows.form.y, sz, LEFT);
  fill(quantOn ? 0 : 140);
  fitText(['Coefficient bits B = ' + bits, 'Bits B = ' + bits], rows.bits.x, rows.bits.y, ctl.labelW - 6, sz, LEFT);
}

// Label anchor (x, vertical centre) of each control row
function controlRows() {
  const rowY = i => drawHeight + 20 + 34 * i;
  if (wideLayout) {
    const c1 = margin + ctl.colW;
    return {
      cut: { x: margin, y: rowY(0) }, taps: { x: c1, y: rowY(0) },
      order: { x: margin, y: rowY(1) }, form: { x: c1, y: rowY(1) },
      quant: { x: margin, y: rowY(2) }, bits: { x: c1, y: rowY(2) }
    };
  }
  return {
    cut: { x: 8, y: rowY(0) }, taps: { x: 8, y: rowY(1) }, order: { x: 8, y: rowY(2) },
    form: { x: 8, y: rowY(3) }, quant: { x: 8, y: rowY(3) }, bits: { x: 8, y: rowY(4) }
  };
}

function layoutControls(force) {
  if (typeof cutoffSlider === 'undefined') return;
  if (!force && layoutWidth === canvasWidth) return;
  layoutWidth = canvasWidth;
  const rows = controlRows();
  if (wideLayout) {
    ctl.colW = Math.floor((canvasWidth - 2 * margin) / 2);
    ctl.labelW = 175;
    const rows2 = controlRows();
    const sw = Math.max(60, ctl.colW - ctl.labelW - 14);
    placeSlider(cutoffSlider, rows2.cut, sw);
    placeSlider(tapsSlider, rows2.taps, sw);
    placeSlider(orderSlider, rows2.order, sw);
    placeSlider(bitsSlider, rows2.bits, sw);
    formSelect.style('font-size', '15px');
    formSelect.position(rows2.form.x + ctl.labelW, rows2.form.y - 12);
    quantCheckbox.style('font-size', '16px');
    quantCheckbox.position(rows2.quant.x, rows2.quant.y - 11);
  } else {
    ctl.labelW = 150;
    ctl.colW = canvasWidth;
    const sw = Math.max(60, canvasWidth - 8 - ctl.labelW - 10);
    placeSlider(cutoffSlider, rows.cut, sw);
    placeSlider(tapsSlider, rows.taps, sw);
    placeSlider(orderSlider, rows.order, sw);
    placeSlider(bitsSlider, rows.bits, sw);
    formSelect.style('font-size', '14px');
    formSelect.position(rows.form.x, rows.form.y - 12);
    quantCheckbox.style('font-size', '14px');
    quantCheckbox.position(rows.form.x + formSelect.elt.offsetWidth + 14, rows.quant.y - 10);
  }
}

function placeSlider(s, row, w) {
  s.position(row.x + ctl.labelW, row.y - 10);
  s.size(w);
}

// ================================================================ text helpers

// Rich text: "f_c" draws the character after '_' as a subscript
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
    textSize(p.sub ? sz * 0.75 : sz);
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
    textSize(p.sub ? sz * 0.75 : sz);
    text(p.t, cx, p.sub ? y + sz * 0.28 : y);
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

// fitText on a white backing box (keeps warnings legible over the curves)
function boxedText(cands, x, y, maxW, sz, align, col) {
  let s = cands[cands.length - 1];
  for (const c of cands) if (richWidth(c, sz) <= maxW) { s = c; break; }
  const w = richWidth(s, sz);
  const x0 = align === RIGHT ? x - w : (align === CENTER ? x - w / 2 : x);
  noStroke();
  fill(255, 255, 255, 225);
  rect(x0 - 4, y - sz * 0.7, w + 8, sz * 1.4, 3);
  fill(col[0], col[1], col[2]);
  richText(s, x, y, sz, align);
}

// numbers with a true minus sign and no "-0"
function fmtNum(v, d) {
  if (!isFinite(v)) return '—';
  if (d === undefined) {
    const a = Math.abs(v);
    d = a === 0 ? 0 : a >= 10 ? 0 : a >= 1 ? 1 : a >= 0.1 ? 2 : 3;
    if (Number.isInteger(Math.round(v * 1e9) / 1e9)) d = 0;
  }
  const r = Number(v.toFixed(d));
  return (r < 0 ? '−' : '') + Math.abs(r).toFixed(d);
}
// impulse-response sample: 4 decimals, or scientific notation for tiny or huge values
function fmtSample(v) {
  if (!isFinite(v)) return '—';
  const a = Math.abs(v);
  if (v === 0) return '0';
  if (a >= 1e-3 && a < 1e4) return fmtNum(v, 4);
  const e = Math.floor(Math.log10(a));
  const m = v / Math.pow(10, e);
  return fmtNum(m, 1) + '×10^' + fmtInt(e);
}
function fmtInt(v) { return (v < 0 ? '−' : '') + Math.abs(v); }
function fmtDb(v) {
  if (v === null || !isFinite(v)) return 'n/a';
  if (v < -200) return '< −200';
  return fmtNum(v, 1);
}
function fmtPhase(v) { return isFinite(v) ? fmtNum(v / Math.PI, 2) + 'π rad' : '—'; }
function fmtGd(v) { return isFinite(v) ? fmtNum(v, 2) + ' samples' : '—'; }
function piLabel(k) {
  if (Math.abs(k) < 1e-9) return '0';
  const s = k < 0 ? '−' : '';
  const a = Math.abs(k);
  if (Math.abs(a - 1) < 1e-9) return s + 'π';
  const t = Number.isInteger(Math.round(a * 1e6) / 1e6) ? String(Math.round(a)) : String(Number(a.toFixed(2)));
  return s + t + 'π';
}

// ================================================================ responsive layout

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  wideLayout = canvasWidth >= WIDE_MIN;
  controlHeight = wideLayout ? CTRL_WIDE : CTRL_NARROW;
  drawHeight = canvasHeight - controlHeight;
  layoutCache = null;
  layoutControls(false);
}
