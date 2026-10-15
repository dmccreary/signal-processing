// Bilinear Transform and Frequency Warping MicroSim
// CANVAS_HEIGHT: 740
// Turns an analog Butterworth low-pass filter into a digital one in two ways and compares them.
// Bilinear transform: s = (2/T)(z - 1)/(z + 1) maps the whole jΩ axis once onto the unit circle,
// with the warping ω = 2 arctan(ΩT/2) (no aliasing; the cutoff can be prewarped).
// Impulse invariance: h[n] = T·h_a(nT), poles z_k = e^(s_k T); ω = ΩT is linear, but the digital
// response is the aliased sum of the analog response. Panels: the warping curve with a draggable
// analog-frequency marker, the s-plane with a draggable test pole, its images in the z-plane, and
// the magnitude responses of the analog target and both digital designs.
// Units: frequencies in kHz and times in ms, so Ω = 2πf is in rad/ms and ΩT is dimensionless.

// Canvas dimensions
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let drawHeight = 604;
let controlHeight = 136;
let canvasHeight = drawHeight + controlHeight;
let margin = 16;
let defaultTextSize = 16;

// Controls
let fsSlider, fcSlider, orderSlider;
let prewarpCheckbox, polesCheckbox;

// Fixed ranges
const F_MAX = 8;                     // analog-frequency axis of the warping plot: 0 .. 8 kHz
const S_SIG = [-12, 4];              // s-plane: σ/2π from -12 to 4 kHz
const S_OM = [-8, 8];                //          Ω/2π from -8 to 8 kHz
const Z_R = 1.3;                     // z-plane: -1.3 .. 1.3 on both axes
const N_FREQ = 360;                  // points on each magnitude curve
const FC_FRAC = 0.45;                // the cutoff slider stops at 0.45 fs
const G3 = Math.SQRT1_2;             // -3.01 dB

// Colors
const COL_AN = [105, 105, 105];      // analog target: gray
const COL_BL = [25, 90, 200];        // bilinear transform: blue
const COL_II = [130, 50, 175];       // impulse invariance: purple
const COL_ERR = [205, 35, 35];       // aliasing and warnings: red
const COL_GOLD = [235, 175, 0];      // draggable marker and test pole
const COL_GOLD_TEXT = [150, 105, 0];
const COL_STABLE = [46, 139, 87];    // jΩ axis and unit circle: seagreen
const COL_TEXT = [40, 40, 40];

// Interactive state
let markerF = 3;                     // analog-frequency marker Ω/2π (kHz)
let testPole = { sig: -2, om: 3 };   // test pole p/2π = σ/2π + jΩ/2π (kHz)
let dragTarget = null;               // 'marker' | 'pole' | null

// Computed state (rebuilt only when a control changes) and layout
let st = { key: '' };
let Lay = {};
let layoutWidth = -1;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  fsSlider = createSlider(2, 16, 8, 0.5);
  fcSlider = createSlider(0.1, 3.6, 2, 0.05);
  orderSlider = createSlider(1, 4, 2, 1);
  prewarpCheckbox = createCheckbox('Prewarp the cutoff', false);
  polesCheckbox = createCheckbox('Show filter poles', true);
  for (const c of [prewarpCheckbox, polesCheckbox]) c.style('font-size', '16px');

  layoutWidth = -1;
  layoutControls();
  describe('Four linked views of the bilinear transform and impulse invariance. A warping plot shows digital frequency ' +
    'omega against analog frequency: the bilinear curve omega = 2 arctan(Omega T / 2) and the straight line omega = Omega T ' +
    'of impulse invariance, which folds back above half the sampling rate. A gold marker on that plot can be dragged. ' +
    'An s-plane and a z-plane show a draggable test pole and its images under both mappings, and the poles of the filter. ' +
    'The bottom plot overlays the magnitude responses in dB of an analog Butterworth low-pass filter and its two digital ' +
    'versions, with a table of their gains. Sliders set the sampling rate, the cutoff and the filter order; ' +
    'checkboxes turn prewarping on and show the filter poles.');
}

function draw() {
  updateCanvasSize();
  readState();
  computeAll();

  // Drawing region and control region
  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  const m = mapMarker(markerF);
  const p = mapTestPole();
  drawHeader();
  drawWarp(m);
  drawSPlane();
  drawZPlane(m, p);
  drawWarpReadout(m);
  drawPoleReadout(p);
  drawMagnitude();
  drawTable();
  drawControlLabels();
  updateCursor();
}

// ---------------------------------------------------------------- complex arithmetic

function C(re, im) { return { re: re, im: im || 0 }; }
function cadd(a, b) { return C(a.re + b.re, a.im + b.im); }
function csub(a, b) { return C(a.re - b.re, a.im - b.im); }
function cmul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
function cscale(a, k) { return C(a.re * k, a.im * k); }
function cdiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
}
function cexp(a) { const r = Math.exp(a.re); return C(r * Math.cos(a.im), r * Math.sin(a.im)); }
function cabs(a) { return Math.hypot(a.re, a.im); }

// ---------------------------------------------------------------- filter math

// Butterworth poles of order N with cutoff wc (rad/ms): wc·e^{jπ(2k + N - 1)/(2N)}, k = 1..N
function butterPoles(N, wc) {
  const p = [];
  for (let k = 1; k <= N; k++) {
    const th = Math.PI * (2 * k + N - 1) / (2 * N);
    p.push(C(wc * Math.cos(th), wc * Math.sin(th)));
  }
  return p;
}

// Residues of H_a(s) = gain / Π(s - p_k) at each pole
function residues(poles, gain) {
  return poles.map((pk, k) => {
    let d = C(1, 0);
    poles.forEach((pj, j) => { if (j !== k) d = cmul(d, csub(pk, pj)); });
    return cdiv(C(gain, 0), d);
  });
}

// Bilinear image of an s-plane point: z = (1 + sT/2)/(1 - sT/2)
function bilinearMap(s, T) {
  const h = cscale(s, T / 2);
  return cdiv(C(1 + h.re, h.im), C(1 - h.re, -h.im));
}

// |H_a(j2πf)| of the analog Butterworth target
function analogMag(f, fc, N) { return 1 / Math.sqrt(1 + Math.pow(f / fc, 2 * N)); }

// |H(e^{jω})| of the bilinear design: H(e^{jω}) = H_a(j(2/T)tan(ω/2)) for a prototype with cutoff wcD
function bilinearMag(f, fs, wcD, N) {
  const w = 2 * Math.PI * f / fs;
  if (w >= Math.PI - 1e-12) return 0;
  const x = 2 * fs * Math.tan(w / 2) / wcD;
  return 1 / Math.sqrt(1 + Math.pow(x, 2 * N));
}

// Impulse-invariant design H(z) = Σ T r_k / (1 - e^{p_k T} z^{-1}), evaluated at z = e^{jω}
function iiResponse(w, T, res, zI) {
  const e = C(Math.cos(w), -Math.sin(w));
  let s = C(0, 0);
  for (let k = 0; k < res.length; k++) {
    s = cadd(s, cdiv(cscale(res[k], T), csub(C(1, 0), cmul(zI[k], e))));
  }
  return s;
}

// First frequency where the impulse-invariant |H| falls to 1/√2 (-3.01 dB)
function iiCutoff(fs, T, res, zI) {
  const mag = f => cabs(iiResponse(2 * Math.PI * f / fs, T, res, zI));
  if (mag(0) <= G3) return { kind: 'dc' };
  const n = 2000;
  let prev = 0;
  for (let i = 1; i <= n; i++) {
    const f = (fs / 2) * i / n;
    if (mag(f) <= G3) {
      let lo = prev, hi = f;
      for (let j = 0; j < 40; j++) {
        const mid = (lo + hi) / 2;
        if (mag(mid) <= G3) hi = mid; else lo = mid;
      }
      return { kind: 'f', f: (lo + hi) / 2 };
    }
    prev = f;
  }
  return { kind: 'none' };
}

function dB(m) { return m <= 0 ? -Infinity : 20 * Math.log10(m); }

// ---------------------------------------------------------------- state

function readState() {
  const fs = Number(fsSlider.value());
  const fcMax = Math.round(Math.floor(FC_FRAC * fs / 0.05 + 1e-9) * 5) / 100;
  if (Math.abs(Number(fcSlider.elt.max) - fcMax) > 1e-9) {
    fcSlider.elt.max = fcMax;                    // the cutoff must stay below the Nyquist frequency
    if (Number(fcSlider.value()) > fcMax) fcSlider.value(fcMax);
  }
  st.fs = fs;
  st.fcMax = fcMax;
  st.fc = Math.min(fcMax, Math.round(Number(fcSlider.value()) * 100) / 100);
  st.N = Number(orderSlider.value());
  st.prewarp = prewarpCheckbox.checked();
  st.showPoles = polesCheckbox.checked();
}

function computeAll() {
  const key = [st.fs, st.fc, st.N, st.prewarp].join('|');
  if (key === st.key) return;
  st.key = key;
  const fs = st.fs, fc = st.fc, N = st.N, T = 1 / fs;
  const wcA = 2 * Math.PI * fc;                                         // analog target cutoff (rad/ms)
  const wcD = st.prewarp ? 2 * fs * Math.tan(Math.PI * fc / fs) : wcA;  // cutoff of the bilinear prototype

  const pa = butterPoles(N, wcA);
  const res = residues(pa, Math.pow(wcA, N));
  const zI = pa.map(p => cexp(cscale(p, T)));          // impulse invariance: z = e^{pT}
  const pb = butterPoles(N, wcD);
  const zB = pb.map(p => bilinearMap(p, T));           // bilinear: z = (1 + pT/2)/(1 - pT/2)

  const an = [], bl = [], ii = [];
  for (let i = 0; i <= N_FREQ; i++) {
    const f = (fs / 2) * i / N_FREQ;
    an.push(dB(analogMag(f, fc, N)));
    bl.push(dB(bilinearMag(f, fs, wcD, N)));
    ii.push(dB(cabs(iiResponse(2 * Math.PI * f / fs, T, res, zI))));
  }

  Object.assign(st, {
    T: T, wcA: wcA, wcD: wcD, fcD: wcD / (2 * Math.PI),
    warpedCut: (fs / Math.PI) * Math.atan(Math.PI * fc / fs),        // where an unwarped cutoff lands
    prewarpCut: (fs / Math.PI) * Math.tan(Math.PI * fc / fs),        // f_c' = (fs/π) tan(π fc / fs)
    pa: pa, pb: pb, zI: zI, zB: zB, res: res,
    an: an, bl: bl, ii: ii,
    f3: { an: fc, bl: (fs / Math.PI) * Math.atan(wcD / (2 * fs)), ii: iiCutoff(fs, T, res, zI) },
    dc: { an: 0, bl: 0, ii: dB(cabs(iiResponse(0, T, res, zI))) },
    nyq: { an: dB(analogMag(fs / 2, fc, N)), bl: -Infinity, ii: dB(cabs(iiResponse(Math.PI, T, res, zI))) }
  });
  // aliasing error of impulse invariance in dB: the largest (signed) gap in the passband f <= fc, and the gap at fs/2
  st.pbDev = 0;
  for (let i = 0; i <= N_FREQ; i++) {
    if ((fs / 2) * i / N_FREQ > fc + 1e-9) break;
    const d = ii[i] - an[i];
    if (Math.abs(d) > Math.abs(st.pbDev)) st.pbDev = d;
  }
  st.nyDev = st.nyq.ii - st.nyq.an;
  // dB range: +5 or +10 at the top; the bottom follows the analog and impulse-invariant values at fs/2
  st.dbTop = Math.max(...ii) > 0.5 ? 10 : 5;
  st.dbBot = constrain(Math.floor((Math.min(st.nyq.an, st.nyq.ii) - 8) / 10) * 10, -80, -30);
}

// The analog frequency marker under both mappings
function mapMarker(fa) {
  const fs = st.fs;
  const wB = 2 * Math.atan(Math.PI * fa / fs);          // bilinear: ω = 2 arctan(ΩT/2)
  const wI = 2 * Math.PI * fa / fs;                     // impulse invariance: ω = ΩT
  const wIf = Math.acos(Math.cos(wI));                  // the frequency it appears at, folded into 0..π
  return { fa: fa, wB: wB, fB: wB * fs / (2 * Math.PI), wI: wI, wIf: wIf,
           fI: wIf * fs / (2 * Math.PI), aliased: fa > fs / 2 + 1e-9 };
}

// The test pole p and its images
function mapTestPole() {
  const p = C(2 * Math.PI * testPole.sig, 2 * Math.PI * testPole.om);   // rad/ms
  return { zB: bilinearMap(p, st.T), zI: cexp(cscale(p, st.T)) };
}

// ---------------------------------------------------------------- layout

function computeLayout() {
  const W = canvasWidth;
  if (W >= 760) {
    const RH = 200;                                         // height of the first row of panels
    const S = Math.round(constrain(W / 4 - 45, 160, 200));  // side of the two square planes
    const top = 96;
    const zx = W - 14 - S, sx = zx - 36 - S;
    const tableW = 340;
    Lay = {
      wide: true, titleSize: 20, infoSize: 15, tickSize: 14, capSize: 14, readSize: 15,
      titleY: 16, lineAY: 40, lineBY: 61, capY: 84, warpCapY: 84,
      warp: { x: 58, y: top, w: sx - 58 - 76, h: RH },
      warpTickY: top + RH + 11, warpTitleY: top + RH + 29,
      sp: { x: sx, y: top + (RH - S) / 2, w: S, h: S },
      zp: { x: zx, y: top + (RH - S) / 2, w: S, h: S },
      warpRead: [350, 369], poleRead: [top + RH + 16, top + RH + 35],
      magCapY: 397,
      mag: { x: 58, y: 410, w: W - 14 - tableW - 34 - 58, h: 150 },
      magTickY: 571, magTitleY: 589,
      table: { x: W - 14 - tableW, y: 410, w: tableW }
    };
  } else {
    const S = Math.min(165, Math.floor((W - 50) / 2));
    const x0 = Math.round((W - (2 * S + 22)) / 2);
    const b1 = 78 + S;
    Lay = {
      wide: false, titleSize: 17, infoSize: 13, tickSize: 12, capSize: 13, readSize: 13,
      titleY: 13, lineAY: 33, lineBY: 50, capY: 68,
      sp: { x: x0, y: 78, w: S, h: S },
      zp: { x: x0 + S + 22, y: 78, w: S, h: S },
      poleRead: [b1 + 12, b1 + 28], warpCapY: b1 + 46,
      warp: { x: 50, y: b1 + 58, w: W - 50 - 46, h: 98 },
      warpTickY: b1 + 58 + 98 + 9, warpTitleY: null,
      warpRead: [b1 + 58 + 98 + 27, b1 + 58 + 98 + 43],
      magCapY: b1 + 58 + 98 + 67,
      mag: { x: 50, y: b1 + 58 + 98 + 79, w: W - 50 - 14, h: 90 },
      magTickY: b1 + 58 + 98 + 79 + 90 + 9, magTitleY: null,
      table: null
    };
  }
}

// ---------------------------------------------------------------- header

function drawHeader() {
  const W = canvasWidth, sz = Lay.infoSize;
  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(['Bilinear Transform and Frequency Warping', 'Bilinear Transform'],
          W / 2, Lay.titleY, W - 20, Lay.titleSize, CENTER);
  textStyle(NORMAL);

  const T = fmt(1000 / st.fs, 1) + ' µs';
  const bl = (t) => ({ t: t, col: COL_BL, bold: true });
  const bn = (t) => ({ t: t, col: COL_BL });
  const ib = (t) => ({ t: t, col: COL_II, bold: true });
  const iN = (t) => ({ t: t, col: COL_II });
  const tx = (t) => ({ t: t, col: COL_TEXT });
  fitSegs([
    [bl('Bilinear: '), bn('s = (2/T)(z − 1)/(z + 1),  ω = 2·arctan(ΩT/2)'), ib('     Impulse invariance: '),
     iN('z = e^{sT},  ω = ΩT'), tx('     T = 1/f_s = ' + T)],
    [bl('Bilinear: '), bn('s = (2/T)(z − 1)/(z + 1)'), ib('    Impulse inv.: '), iN('z = e^{sT}'), tx('    T = ' + T)],
    [bl('Bilinear '), bn('s = (2/T)(z−1)/(z+1)'), ib('  Imp. inv. '), iN('z = e^{sT}')],
    [bl('Bilinear '), bn('s = (2/T)(z−1)/(z+1)')]
  ], W / 2, Lay.lineAY, W - 2 * margin, sz, CENTER);

  const fc = fmt(st.fc, 2), wc = fmt(st.warpedCut, 2), pc = fmt(st.prewarpCut, 2);
  if (st.prewarp) {
    fitSegs([
      [bl('Prewarp on: '), bn('the analog prototype uses f_c′ = (f_s/π)·tan(πf_c/f_s) = ' + pc + ' kHz, which the transform warps back to f_c = ' + fc + ' kHz')],
      [bl('Prewarp on: '), bn('prototype cutoff f_c′ = ' + pc + ' kHz warps back to f_c = ' + fc + ' kHz')],
      [bl('Prewarp: '), bn('f_c′ = ' + pc + ' kHz → f_c = ' + fc + ' kHz')]
    ], W / 2, Lay.lineBY, W - 2 * margin, sz, CENTER);
  } else {
    fitSegs([
      [bl('Prewarp off: '), bn('the prototype uses f_c = ' + fc + ' kHz itself, so the digital cutoff lands at (f_s/π)·arctan(πf_c/f_s) = ' + wc + ' kHz')],
      [bl('Prewarp off: '), bn('bilinear cutoff warps from f_c = ' + fc + ' kHz down to ' + wc + ' kHz')],
      [bl('No prewarp: '), bn('cutoff ' + fc + ' kHz → ' + wc + ' kHz')]
    ], W / 2, Lay.lineBY, W - 2 * margin, sz, CENTER);
  }
}

// ---------------------------------------------------------------- warping plot

function wX(f) { const P = Lay.warp; return P.x + f / F_MAX * P.w; }
function wY(w) { const P = Lay.warp; return P.y + P.h - w / Math.PI * P.h; }

function drawWarp(m) {
  const P = Lay.warp, fs = st.fs, nyq = fs / 2;
  const ts = Lay.tickSize;

  // legend (caption)
  fitLegend([
    [{ kind: 'line', col: COL_BL, label: 'bilinear ω = 2·arctan(ΩT/2)' },
     { kind: 'line', col: COL_II, label: 'imp. inv. ω = ΩT (folds above f_s/2)' }],
    [{ kind: 'line', col: COL_BL, label: 'bilinear ω = 2·arctan(ΩT/2)' }, { kind: 'line', col: COL_II, label: 'ω = ΩT' }],
    [{ kind: 'line', col: COL_BL, label: 'bilinear' }, { kind: 'line', col: COL_II, label: 'imp. inv.' }]
  ], P.x, Lay.warpCapY, (Lay.wide ? Lay.sp.x - 30 : canvasWidth - 14) - P.x, Lay.capSize, LEFT);

  // frame and grid
  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(P.x, P.y, P.w, P.h);
  if (nyq < F_MAX) {                                    // impulse invariance aliases beyond fs/2
    noStroke();
    fill(COL_ERR[0], COL_ERR[1], COL_ERR[2], 18);
    rect(wX(nyq), P.y + 1, P.x + P.w - wX(nyq) - 1, P.h - 2);
  }
  const fStep = Lay.wide && P.w / F_MAX >= 34 ? 1 : 2;
  stroke(232);
  for (let f = fStep; f < F_MAX; f += fStep) line(wX(f), P.y, wX(f), P.y + P.h);
  for (let q = 1; q < 4; q++) line(P.x, wY(q * Math.PI / 4), P.x + P.w, wY(q * Math.PI / 4));

  // left axis: ω in rad/sample
  noStroke();
  fill(70);
  textSize(ts);
  textAlign(RIGHT, CENTER);
  const piLab = ['0', 'π/4', 'π/2', '3π/4', 'π'];
  for (let q = 0; q <= 4; q++) text(piLab[q], P.x - 5, wY(q * Math.PI / 4));
  if (Lay.wide) {
    push();
    translate(14, P.y + P.h / 2);
    rotate(-HALF_PI);
    textAlign(CENTER, CENTER);
    textSize(14);
    text('digital ω (rad/sample)', 0, 0);
    pop();
  }

  // right axis: the same digital frequency in kHz (0 .. fs/2)
  const kStep = niceStep(nyq, P.h, Lay.wide ? 24 : 20, true);
  textAlign(LEFT, CENTER);
  textSize(ts);
  fill(70);
  for (let f = kStep; f <= nyq + 1e-9; f += kStep) {          // 0 is already on the left axis
    const y = P.y + P.h - f / nyq * P.h;
    stroke(150);
    line(P.x + P.w, y, P.x + P.w + 4, y);
    noStroke();
    text(fmtTick(f), P.x + P.w + 7, y);
  }
  push();
  translate(P.x + P.w + (Lay.wide ? 50 : 36), P.y + P.h / 2);
  rotate(HALF_PI);
  fill(70);
  richText(Lay.wide ? 'digital f_d (kHz)' : 'f_d (kHz)', 0, 0, ts, CENTER);
  pop();

  // bottom axis: analog frequency in kHz
  textAlign(CENTER, CENTER);
  fill(70);
  for (let f = 0; f <= F_MAX; f += fStep) {
    if (!Lay.warpTitleY && f === F_MAX) { textAlign(LEFT, CENTER); text(fmtTick(f) + ' kHz', wX(f) - 4, Lay.warpTickY); }
    else text(fmtTick(f), wX(f), Lay.warpTickY);
  }
  if (Lay.warpTitleY) richText('analog frequency Ω/2π (kHz)', P.x + P.w / 2, Lay.warpTitleY, ts, CENTER);

  // Nyquist line
  if (nyq <= F_MAX) {
    stroke(COL_II[0], COL_II[1], COL_II[2], 150);
    strokeWeight(1.5);
    drawingContext.setLineDash([5, 4]);
    line(wX(nyq), P.y, wX(nyq), P.y + P.h);
    drawingContext.setLineDash([]);
  }

  startClip(P);
  // impulse invariance: ω = ΩT, folded back into 0..π above fs/2 (aliasing)
  noFill();
  stroke(COL_II[0], COL_II[1], COL_II[2]);
  strokeWeight(2.5);
  beginShape();
  vertex(wX(0), wY(0));
  vertex(wX(Math.min(nyq, F_MAX)), wY(Math.min(nyq, F_MAX) / nyq * Math.PI));
  endShape();
  if (nyq < F_MAX) {
    strokeWeight(2);
    drawingContext.setLineDash([7, 5]);
    const fold = f => Math.acos(Math.cos(2 * Math.PI * f / fs));   // piecewise linear, corners at k·fs/2
    beginShape();
    for (let f = nyq; f < F_MAX - 1e-9; f += nyq) vertex(wX(f), wY(fold(f)));
    vertex(wX(F_MAX), wY(fold(F_MAX)));
    endShape();
    drawingContext.setLineDash([]);
  }

  // bilinear: ω = 2 arctan(ΩT/2)
  stroke(COL_BL[0], COL_BL[1], COL_BL[2]);
  strokeWeight(2.5);
  beginShape();
  for (let i = 0; i <= 200; i++) {
    const f = F_MAX * i / 200;
    vertex(wX(f), wY(2 * Math.atan(Math.PI * f / fs)));
  }
  endShape();

  // cutoff construction (blue dotted): prototype cutoff on the Ω axis -> bilinear curve -> ω axis
  drawCutoffPath();
  stopClip();

  // f_s/2 label
  if (nyq <= F_MAX) {
    noStroke();
    fill(COL_II[0], COL_II[1], COL_II[2]);
    const box = nyqLabelBox();
    textStyle(BOLD);
    richText('f_s/2', box[0], P.y + P.h - 12, ts, LEFT);
    textStyle(NORMAL);
  }

  drawMarker(m);
}

function drawCutoffPath() {
  const P = Lay.warp, fs = st.fs;
  const wc = 2 * Math.PI * st.fc / fs;                  // the digital cutoff we want
  stroke(COL_BL[0], COL_BL[1], COL_BL[2], 200);
  strokeWeight(1.5);
  drawingContext.setLineDash([2, 4]);
  const ts = Lay.tickSize;
  if (st.prewarp) {
    // want ω_c: go across to the bilinear curve, then down to the prewarped analog cutoff
    const fx = st.prewarpCut;
    line(P.x, wY(wc), wX(Math.min(fx, F_MAX)), wY(wc));
    if (fx <= F_MAX) line(wX(fx), wY(wc), wX(fx), P.y + P.h);
    drawingContext.setLineDash([]);
    noStroke();
    fill(COL_BL[0], COL_BL[1], COL_BL[2]);
    if (fx <= F_MAX) {
      circle(wX(fx), wY(wc), 7);
      placeBottomLabel('f_c′', wX(fx));
    } else {
      fitText(['f_c′ = ' + fmt(fx, 1) + ' →'], P.x + P.w - 4, wY(wc) - 9, P.w, ts, RIGHT);
    }
  } else {
    // the analog cutoff itself: up to the bilinear curve, then across to the (lower) digital cutoff
    const fx = st.fc;
    const wb = 2 * Math.atan(Math.PI * fx / fs);
    line(wX(fx), P.y + P.h, wX(fx), wY(wb));
    line(wX(fx), wY(wb), P.x, wY(wb));
    drawingContext.setLineDash([]);
    noStroke();
    fill(COL_BL[0], COL_BL[1], COL_BL[2]);
    circle(wX(fx), wY(wb), 7);
    placeBottomLabel('f_c', wX(fx));
  }
}

// where the f_s/2 label sits on the warping plot ([left, right] in px), or null
function nyqLabelBox() {
  const P = Lay.warp, nyq = st.fs / 2;
  if (nyq > F_MAX) return null;
  textStyle(BOLD);
  const w = richWidth('f_s/2', Lay.tickSize);
  textStyle(NORMAL);
  const lx = wX(nyq);
  const x0 = lx + w + 4 <= P.x + P.w ? lx + 3 : lx - w - 3;
  return [x0, x0 + w];
}

// a label at the bottom of the warping plot, beside the line at x, clear of the f_s/2 label and the marker grip
function placeBottomLabel(s, x) {
  const P = Lay.warp, ts = Lay.tickSize;
  const w = richWidth(s, ts);
  const busy = [];
  const nb = nyqLabelBox();
  if (nb) busy.push(nb);
  const xm = wX(markerF);
  busy.push([xm - 9, xm + 9]);
  const free = (a, b) => a >= P.x + 2 && b <= P.x + P.w - 2 && busy.every(q => b < q[0] - 2 || a > q[1] + 2);
  const y = P.y + P.h - 12;
  if (free(x + 4, x + 4 + w)) return richText(s, x + 4, y, ts, LEFT);
  if (free(x - 4 - w, x - 4)) return richText(s, x - 4 - w, y, ts, LEFT);
  return richText(s, x + 4, y - 17, ts, LEFT);
}

function drawMarker(m) {
  const P = Lay.warp;
  const x = wX(m.fa);
  // vertical gold line and a handle under the axis
  stroke(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  strokeWeight(2);
  line(x, P.y, x, P.y + P.h);
  stroke(120, 90, 0);
  strokeWeight(1);
  fill(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  triangle(x, P.y + P.h - 13, x - 7, P.y + P.h, x + 7, P.y + P.h);       // grip
  // projections to the ω axis
  stroke(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2], 200);
  strokeWeight(1.2);
  drawingContext.setLineDash([4, 3]);
  line(P.x, wY(m.wB), x, wY(m.wB));
  line(P.x, wY(m.wIf), x, wY(m.wIf));
  drawingContext.setLineDash([]);
  ringDot(x, wY(m.wB), COL_BL, 10);
  ringDot(x, wY(m.wIf), COL_II, 10);
}

function ringDot(x, y, col, d) {
  stroke(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  strokeWeight(2.5);
  fill(col[0], col[1], col[2]);
  circle(x, y, d);
}

function drawWarpReadout(m) {
  const P = Lay.warp, sz = Lay.readSize;
  const x = Lay.wide ? 14 : P.x - 36;
  const maxW = (Lay.wide ? Lay.sp.x - 20 : canvasWidth - 10) - x;
  const g = (t) => ({ t: t, col: COL_GOLD_TEXT, bold: true });
  const gn = (t) => ({ t: t, col: COL_GOLD_TEXT });
  fitSegs([
    [g('Marker Ω/2π = ' + fmt(m.fa, 2) + ' kHz'), gn('  (drag it along the axis)')],
    [g('Marker Ω/2π = ' + fmt(m.fa, 2) + ' kHz')],
    [g('Ω/2π = ' + fmt(m.fa, 2) + ' kHz')]
  ], x, Lay.warpRead[0], maxW, sz, LEFT);

  const b = (t) => ({ t: t, col: COL_BL });
  const i = (t) => ({ t: t, col: m.aliased ? COL_ERR : COL_II });
  const fb = fmt(m.fB, 2) + ' kHz', fi = fmt(m.fI, 2) + ' kHz';
  const wb = fmtPi(m.wB, 3), wi = fmtPi(m.wIf, 3), wb2 = fmtPi(m.wB, 2), wi2 = fmtPi(m.wIf, 2);
  const iiLong = m.aliased ? 'imp. inv.: ω = ' + wi + ', aliased to ' + fi : 'imp. inv.: ω = ' + wi + ', f = ' + fi;
  const iiMid = m.aliased ? 'imp. inv. ' + wi2 + ', alias ' + fi : 'imp. inv. ω = ' + wi2 + ' (' + fi + ')';
  const iiShort = m.aliased ? 'imp. inv. alias ' + fi : 'imp. inv. ' + wi2 + ' (' + fi + ')';
  fitSegs([
    [b('bilinear: ω = ' + wb + ', f = ' + fb), i('     ' + iiLong)],
    [b('bilinear ω = ' + wb2 + ' (' + fb + ')'), i('   ' + iiMid)],
    [b('bilinear ' + wb2 + ' (' + fb + ')'), i('  ' + iiShort)],
    [b('B ' + fb), i('  II ' + fi + (m.aliased ? ' (alias)' : ''))]
  ], x, Lay.warpRead[1], maxW, sz, LEFT);
}

// ---------------------------------------------------------------- s-plane

function sX(sig) { const P = Lay.sp; return P.x + (sig - S_SIG[0]) / (S_SIG[1] - S_SIG[0]) * P.w; }
function sY(om) { const P = Lay.sp; return P.y + (S_OM[1] - om) / (S_OM[1] - S_OM[0]) * P.h; }

function drawSPlane() {
  const P = Lay.sp, fs = st.fs;
  const small = Lay.wide ? 12 : 11;
  noStroke();
  fill(COL_TEXT);
  fitText(['s-plane (s/2π in kHz)', 's-plane'], P.x, Lay.capY, P.w + 30, Lay.capSize, LEFT);

  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(P.x, P.y, P.w, P.h);
  // left half-plane: stable analog poles
  noStroke();
  fill(60, 179, 113, 36);
  rect(P.x + 1, P.y + 1, sX(0) - P.x - 1, P.h - 2);
  stroke(234);
  for (let v = -8; v <= 4; v += 4) if (v !== 0) line(sX(v), P.y, sX(v), P.y + P.h);
  for (let v = -4; v <= 4; v += 8) line(P.x, sY(v), P.x + P.w, sY(v));

  startClip(P);
  // impulse-invariance strip edges Ω = ±π/T, ±3π/T, ...
  for (let k = 0; (2 * k + 1) * fs / 2 <= S_OM[1] + 1e-9; k++) {
    const om = (2 * k + 1) * fs / 2;
    stroke(COL_II[0], COL_II[1], COL_II[2], k === 0 ? 170 : 80);
    strokeWeight(k === 0 ? 1.5 : 1);
    drawingContext.setLineDash([5, 4]);
    line(P.x, sY(om), P.x + P.w, sY(om));
    line(P.x, sY(-om), P.x + P.w, sY(-om));
  }
  drawingContext.setLineDash([]);
  // axes: the jΩ axis maps onto the unit circle
  stroke(140);
  strokeWeight(1);
  line(P.x, sY(0), P.x + P.w, sY(0));
  stroke(COL_STABLE[0], COL_STABLE[1], COL_STABLE[2]);
  strokeWeight(2);
  line(sX(0), P.y, sX(0), P.y + P.h);

  // filter poles: analog target (gray) and, with prewarping, the bilinear prototype (blue)
  if (st.showPoles) {
    noFill();
    strokeWeight(1);
    drawingContext.setLineDash([2, 3]);
    stroke(COL_AN[0], COL_AN[1], COL_AN[2], 160);
    arc(sX(0), sY(0), 2 * st.fc * pxPerK(), 2 * st.fc * pxPerK(), HALF_PI, PI + HALF_PI);
    if (st.prewarp) {
      stroke(COL_BL[0], COL_BL[1], COL_BL[2], 160);
      arc(sX(0), sY(0), 2 * st.fcD * pxPerK(), 2 * st.fcD * pxPerK(), HALF_PI, PI + HALF_PI);
    }
    drawingContext.setLineDash([]);
    if (st.prewarp) for (const p of st.pb) poleX(sX(p.re / (2 * Math.PI)), sY(p.im / (2 * Math.PI)), COL_BL, 5);
    for (const p of st.pa) poleX(sX(p.re / (2 * Math.PI)), sY(p.im / (2 * Math.PI)), COL_AN, 5);
  }

  // the jΩ marker and the test pole
  diamond(sX(0), sY(markerF), 7, COL_GOLD, [120, 90, 0]);
  const px = sX(testPole.sig), py = sY(testPole.om);
  stroke(dragTarget === 'pole' ? 0 : 90);
  strokeWeight(dragTarget === 'pole' ? 2.5 : 1.5);
  fill(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  circle(px, py, 13);
  stopClip();

  // labels
  noStroke();
  fill(COL_GOLD_TEXT);
  textStyle(BOLD);
  textSize(Lay.capSize);
  textAlign(px > P.x + P.w - 22 ? RIGHT : LEFT, BOTTOM);
  text('p', px + (px > P.x + P.w - 22 ? -8 : 8), py - 4);
  textStyle(NORMAL);
  fill(110);
  textSize(small);
  textAlign(LEFT, TOP);
  text('jΩ', sX(0) + 4, P.y + 2);
  textAlign(RIGHT, BOTTOM);
  text('σ', P.x + P.w - 3, sY(0) - 1);
  textAlign(RIGHT, CENTER);
  text('4', P.x + P.w - 3, sY(4));
  text('−4', P.x + P.w - 3, sY(-4));
  textAlign(CENTER, TOP);
  text('−8', sX(-8), sY(0) + 3);
  text('−4', sX(-4), sY(0) + 3);
  // strip label
  if (fs / 2 <= S_OM[1] - 0.6) {
    fill(COL_II[0], COL_II[1], COL_II[2]);
    textAlign(LEFT, BOTTOM);
    richText('f_s/2', P.x + 3, sY(fs / 2) - 7, small, LEFT);
  }
}

function pxPerK() { return Lay.sp.w / (S_SIG[1] - S_SIG[0]); }

// ---------------------------------------------------------------- z-plane

function zXY(z) {
  const P = Lay.zp, sc = (P.w / 2) / Z_R;
  let re = z.re, im = z.im, clipped = false;
  const lim = Z_R * 0.97;
  const big = Math.max(Math.abs(re), Math.abs(im));
  if (big > lim) { re *= lim / big; im *= lim / big; clipped = true; }
  return { x: P.x + P.w / 2 + re * sc, y: P.y + P.h / 2 - im * sc, clipped: clipped };
}

function drawZPlane(m, tp) {
  const P = Lay.zp, sc = (P.w / 2) / Z_R;
  const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
  const small = Lay.wide ? 12 : 11;
  noStroke();
  fill(COL_TEXT);
  fitText(['z-plane (unit circle = jΩ axis)', 'z-plane'], P.x, Lay.capY, P.w + 12, Lay.capSize, LEFT);

  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(P.x, P.y, P.w, P.h);
  noStroke();
  fill(60, 179, 113, 36);
  circle(cx, cy, 2 * sc);
  stroke(140);
  line(P.x, cy, P.x + P.w, cy);
  line(cx, P.y, cx, P.y + P.h);
  // e^{±jπ}: where impulse invariance sends the strip edges Ω = ±π/T
  stroke(COL_II[0], COL_II[1], COL_II[2], 150);
  strokeWeight(1.5);
  drawingContext.setLineDash([5, 4]);
  line(P.x, cy, cx, cy);
  drawingContext.setLineDash([]);
  noFill();
  stroke(COL_STABLE[0], COL_STABLE[1], COL_STABLE[2]);
  strokeWeight(2);
  circle(cx, cy, 2 * sc);

  noStroke();
  fill(110);
  textSize(small);
  textAlign(LEFT, TOP);
  text('1', cx + sc + 3, cy + 2);
  textAlign(RIGHT, TOP);
  text('−1', cx - sc - 3, cy + 2);
  textAlign(LEFT, TOP);
  text('Im', cx + 4, P.y + 2);
  textAlign(RIGHT, BOTTOM);
  text('Re', P.x + P.w - 3, cy - 1);

  startClip(P);
  if (st.showPoles) {
    // bilinear: N zeros at z = -1 (from s = ∞), poles from the prototype
    stroke(COL_BL[0], COL_BL[1], COL_BL[2]);
    strokeWeight(2);
    fill(255);
    circle(cx - sc, cy, 11);
    for (const z of st.zB) { const q = zXY(z); poleX(q.x, q.y, COL_BL, 5); }
    for (const z of st.zI) { const q = zXY(z); poleX(q.x, q.y, COL_II, 5); }
  }
  // images of the jΩ marker on the unit circle
  diamond(cx + sc * Math.cos(m.wB), cy - sc * Math.sin(m.wB), 7, COL_BL, COL_GOLD);
  diamond(cx + sc * Math.cos(m.wI), cy - sc * Math.sin(m.wI), 7, COL_II, COL_GOLD);
  // images of the test pole
  for (const [z, col] of [[tp.zI, COL_II], [tp.zB, COL_BL]]) {
    const q = zXY(z);
    if (q.clipped) {
      stroke(col[0], col[1], col[2]);
      strokeWeight(2.5);
      noFill();
      circle(q.x, q.y, 12);
    } else {
      ringDot(q.x, q.y, col, 12);
    }
  }
  stopClip();
  if (st.showPoles && st.N > 1) {
    noStroke();
    fill(COL_BL[0], COL_BL[1], COL_BL[2]);
    textSize(small);
    textAlign(LEFT, BOTTOM);
    text('×' + st.N, cx - sc + 6, cy - 4);
  }
}

function drawPoleReadout(tp) {
  const sz = Lay.readSize;
  const x = Lay.sp.x;
  const maxW = canvasWidth - 10 - x;
  const sig = fmt(testPole.sig, 2), om = (testPole.om < 0 ? '− j' : '+ j') + fmt(Math.abs(testPole.om), 2);
  const g = (t) => ({ t: t, col: COL_GOLD_TEXT, bold: true });
  const gn = (t) => ({ t: t, col: COL_GOLD_TEXT });
  const stable = testPole.sig < 0 ? 'stable' : (testPole.sig === 0 ? 'on the jΩ axis' : 'unstable');
  fitSegs([
    [g('Test pole p/2π = ' + sig + ' ' + om + ' kHz'), gn('  (' + stable + '; drag it)')],
    [g('Test pole p/2π = ' + sig + ' ' + om + ' kHz')],
    [g('p/2π = ' + sig + ' ' + om + ' kHz')]
  ], x, Lay.poleRead[0], maxW, sz, LEFT);
  const zb = polarStr(tp.zB), zi = polarStr(tp.zI);
  fitSegs([
    [{ t: 'bilinear z = ' + zb, col: COL_BL }, { t: '    imp. inv. z = ' + zi, col: COL_II }],
    [{ t: 'bilinear ' + zb, col: COL_BL }, { t: '   imp. inv. ' + zi, col: COL_II }],
    [{ t: 'B ' + zb, col: COL_BL }, { t: '  II ' + zi, col: COL_II }]
  ], x, Lay.poleRead[1], maxW, sz, LEFT);
}

function polarStr(z) {
  const r = cabs(z);
  const a = Math.atan2(z.im, z.re) * 180 / Math.PI;
  const rs = r >= 100 ? r.toExponential(1).replace('+', '') : r.toFixed(3);
  return rs + '∠' + fmt(a, 1) + '°';
}

// ---------------------------------------------------------------- magnitude responses

function mX(f) { const P = Lay.mag; return P.x + f / (st.fs / 2) * P.w; }
function mY(d) { const P = Lay.mag; return P.y + (st.dbTop - constrain(d, st.dbBot - 5, st.dbTop + 5)) / (st.dbTop - st.dbBot) * P.h; }

function drawMagnitude() {
  const P = Lay.mag, fs = st.fs, nyq = fs / 2, ts = Lay.tickSize;
  fitLegend([
    [{ kind: 'dash', col: COL_AN, label: 'analog Butterworth target' }, { kind: 'line', col: COL_BL, label: 'bilinear' },
     { kind: 'line', col: COL_II, label: 'impulse invariance' }, { kind: 'shade', col: COL_ERR, label: 'aliasing' }],
    [{ kind: 'dash', col: COL_AN, label: 'analog' }, { kind: 'line', col: COL_BL, label: 'bilinear' },
     { kind: 'line', col: COL_II, label: 'imp. inv.' }, { kind: 'shade', col: COL_ERR, label: 'aliasing' }],
    [{ kind: 'dash', col: COL_AN, label: 'analog' }, { kind: 'line', col: COL_BL, label: 'bilin.' },
     { kind: 'line', col: COL_II, label: 'imp. inv.' }]
  ], P.x, Lay.magCapY, P.w, Lay.capSize, LEFT);

  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(P.x, P.y, P.w, P.h);
  // grid every 10 dB, labels every 10 or 20 dB
  const lab = P.h / ((st.dbTop - st.dbBot) / 10) >= 18 ? 10 : 20;
  textSize(ts);
  for (let d = st.dbBot; d <= st.dbTop; d += 10) {
    stroke(d === 0 ? 150 : 232);
    line(P.x, mY(d), P.x + P.w, mY(d));
    if (d % lab === 0) {
      noStroke();
      fill(70);
      textAlign(RIGHT, CENTER);
      text(fmtTick(d), P.x - 5, mY(d));
    }
  }
  // -3 dB guide
  stroke(170);
  drawingContext.setLineDash([2, 3]);
  line(P.x, mY(-3.0103), P.x + P.w, mY(-3.0103));
  drawingContext.setLineDash([]);
  if (Lay.wide) {
    push();
    noStroke();
    fill(70);
    translate(14, P.y + P.h / 2);
    rotate(-HALF_PI);
    textAlign(CENTER, CENTER);
    textSize(14);
    text('|H| (dB)', 0, 0);
    pop();
  }
  // frequency ticks
  const step = niceStep(nyq, P.w, Lay.wide ? 54 : 0);
  noStroke();
  fill(70);
  textAlign(CENTER, CENTER);
  textSize(ts);
  for (let f = 0; f <= nyq + 1e-9; f += step) {
    stroke(232);
    if (f > 0 && f < nyq - 1e-9) line(mX(f), P.y, mX(f), P.y + P.h);
    noStroke();
    const s = fmtTick(f);
    if (mX(f) + advW(s) / 2 < P.x + P.w - advW('f_s/2') - 10 || f === 0) text(s, mX(f), Lay.magTickY);
  }
  fill(COL_II[0], COL_II[1], COL_II[2]);
  textStyle(BOLD);
  richText('f_s/2', P.x + P.w, Lay.magTickY, ts, RIGHT);
  textStyle(NORMAL);
  fill(70);
  if (Lay.magTitleY) richText('digital frequency f (kHz);  ω = 2πf/f_s', P.x + P.w / 2, Lay.magTitleY, ts, CENTER);

  startClip(P);
  // aliasing: the gap between the impulse-invariant response and the analog one (both signs)
  noStroke();
  fill(COL_ERR[0], COL_ERR[1], COL_ERR[2], 45);
  for (let i = 0; i < N_FREQ; i++) {
    const f0 = nyq * i / N_FREQ, f1 = nyq * (i + 1) / N_FREQ;
    quad(mX(f0), mY(st.ii[i]), mX(f1), mY(st.ii[i + 1]), mX(f1), mY(st.an[i + 1]), mX(f0), mY(st.an[i]));
  }
  // desired cutoff
  stroke(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  strokeWeight(1.5);
  drawingContext.setLineDash([6, 4]);
  line(mX(st.fc), P.y, mX(st.fc), P.y + P.h);
  drawingContext.setLineDash([]);
  traceDb(st.an, COL_AN, 2, true);
  traceDb(st.ii, COL_II, 2.5, false);
  traceDb(st.bl, COL_BL, 2.5, false);
  // -3 dB points
  const d3 = -3.0103;
  dot3(mX(st.f3.an), mY(d3), COL_AN);
  if (st.f3.ii.kind === 'f') dot3(mX(st.f3.ii.f), mY(d3), COL_II);
  dot3(mX(st.f3.bl), mY(d3), COL_BL);
  stopClip();

  noStroke();
  fill(COL_GOLD_TEXT);
  textStyle(BOLD);
  const lw = richWidth('f_c', ts);
  richText('f_c', mX(st.fc) + (mX(st.fc) + lw + 6 < P.x + P.w ? 4 : -lw - 4), P.y + 10, ts, LEFT);
  textStyle(NORMAL);

  if (!dragTarget && inRect(mouseX, mouseY, P, 0)) drawGainProbe(P);
}

// hover read-out: the three gains at the frequency under the mouse (snapped to 0.05 kHz)
function drawGainProbe(P) {
  const nyq = st.fs / 2;
  const f = constrain(Math.round((mouseX - P.x) / P.w * nyq * 20) / 20, 0, nyq);
  const g = {
    an: dB(analogMag(f, st.fc, st.N)),
    bl: dB(bilinearMag(f, st.fs, st.wcD, st.N)),
    ii: dB(cabs(iiResponse(2 * Math.PI * f / st.fs, st.T, st.res, st.zI)))
  };
  st.probe = { f: f, an: g.an, bl: g.bl, ii: g.ii };
  const x = mX(f);
  stroke(60);
  strokeWeight(1);
  line(x, P.y, x, P.y + P.h);
  const sz = Lay.wide ? 14 : 12, lh = sz + 4;
  const lines = [
    { t: 'f = ' + fmt(f, 2) + ' kHz', col: COL_TEXT },
    { t: 'analog ' + fmtDb(g.an), col: COL_AN },
    { t: 'bilinear ' + fmtDb(g.bl), col: COL_BL },
    { t: 'imp. inv. ' + fmtDb(g.ii), col: COL_II }
  ];
  textStyle(BOLD);
  let w = 0;
  for (const l of lines) w = Math.max(w, richWidth(l.t, sz));
  textStyle(NORMAL);
  const bw = w + 12, bh = lines.length * lh + 6;
  const bx = x + 8 + bw <= P.x + P.w ? x + 8 : x - 8 - bw;
  const by = P.y + P.h - bh - 4;
  fill(255, 255, 255, 235);
  stroke(180);
  rect(bx, by, bw, bh, 4);
  noStroke();
  textStyle(BOLD);
  lines.forEach((l, i) => {
    fill(l.col[0], l.col[1], l.col[2]);
    richText(l.t, bx + 6, by + 3 + lh / 2 + i * lh, sz, LEFT);
  });
  textStyle(NORMAL);
}

function traceDb(arr, col, w, dashed) {
  const nyq = st.fs / 2;
  noFill();
  stroke(col[0], col[1], col[2]);
  strokeWeight(w);
  if (dashed) drawingContext.setLineDash([7, 5]);
  beginShape();
  for (let i = 0; i <= N_FREQ; i++) vertex(mX(nyq * i / N_FREQ), mY(Math.max(arr[i], st.dbBot - 5)));
  endShape();
  drawingContext.setLineDash([]);
}

function dot3(x, y, col) {
  stroke(255);
  strokeWeight(1.5);
  fill(col[0], col[1], col[2]);
  circle(x, y, 9);
}

// read-out table beside the magnitude plot (wide screens)
function drawTable() {
  const T = Lay.table;
  if (!T) return;
  const sz = 14;
  const cols = [T.x, T.x + 186, T.x + 264];             // right edges of the DC and -3 dB columns
  let y = T.y + 6;
  noStroke();
  fill(COL_TEXT);
  textStyle(BOLD);
  richText('Gain read-outs', cols[0], y, sz, LEFT);
  y += 21;
  fill(90);
  richText('DC', cols[1], y, sz, RIGHT);
  richText('−3 dB at', cols[2], y, sz, RIGHT);
  richText('at f_s/2', T.x + T.w, y, sz, RIGHT);
  textStyle(NORMAL);
  stroke(210);
  strokeWeight(1);
  line(T.x, y + 10, T.x + T.w, y + 10);
  const f3ii = st.f3.ii.kind === 'f' ? fmt(st.f3.ii.f, 2) + ' kHz' : 'none';
  const rows = [
    { name: 'analog target', col: COL_AN, dash: true, dc: st.dc.an, f3: fmt(st.f3.an, 2) + ' kHz', nyq: st.nyq.an },
    { name: 'bilinear', col: COL_BL, dc: st.dc.bl, f3: fmt(st.f3.bl, 2) + ' kHz', nyq: st.nyq.bl },
    { name: 'imp. invariance', col: COL_II, dc: st.dc.ii, f3: f3ii, nyq: st.nyq.ii }
  ];
  for (const r of rows) {
    y += 21;
    stroke(r.col[0], r.col[1], r.col[2]);
    strokeWeight(2.5);
    if (r.dash) { line(T.x, y, T.x + 5, y); line(T.x + 9, y, T.x + 15, y); } else line(T.x, y, T.x + 15, y);
    noStroke();
    fill(r.col[0], r.col[1], r.col[2]);
    textStyle(BOLD);
    richText(r.name, T.x + 21, y, sz, LEFT);
    textStyle(NORMAL);
    fill(COL_TEXT);
    richText(fmtDb(r.dc), cols[1], y, sz, RIGHT);
    richText(r.f3, cols[2], y, sz, RIGHT);
    richText(fmtDb(r.nyq), T.x + T.w, y, sz, RIGHT);
  }

  // two plain-language conclusions
  y += 27;
  const shift = st.fc - st.f3.bl;
  let warpMsg;
  const nb = s => s.replace(/ /g, '\u00a0');           // keep a phrase on one line when wrapping
  if (st.prewarp) warpMsg = 'Bilinear: prewarped, so the −3 dB point is exactly ' + nb('f_c = ' + fmt(st.fc, 2) + ' kHz') + '.';
  else if (shift < 0.005) warpMsg = 'Bilinear: warping moves the −3 dB point by less than 0.01 kHz ' + nb('(f_c ≪ f_s).');
  else warpMsg = 'Bilinear: warping moves the −3 dB point ' + nb(fmt(shift, 2) + ' kHz') + ' below f_c. Try “Prewarp”.';
  const sgn = v => (v >= 0.05 ? '+' : '') + fmt(v, 1);
  const aliasMsg = 'Imp. inv. aliasing error: ' + nb(sgn(st.pbDev) + ' dB') + ' in the passband (worst case), ' +
                   nb(sgn(st.nyDev) + ' dB at f_s/2') + '.';
  const big = Math.max(Math.abs(st.pbDev), Math.abs(st.nyDev)) >= 0.5;
  y = wrapDraw(warpMsg, T.x, y, T.w, sz, COL_BL);
  wrapDraw(aliasMsg, T.x, y + 4, T.w, sz, big ? COL_ERR : COL_II);
}

// word-wrapped rich text; returns the y of the next line
function wrapDraw(s, x, y, maxW, sz, col) {
  const words = s.split(' ');
  let lineStr = '';
  noStroke();
  fill(col[0], col[1], col[2]);
  for (const w of words) {
    const trial = lineStr ? lineStr + ' ' + w : w;
    if (richWidth(trial, sz) > maxW && lineStr) {
      richText(lineStr, x, y, sz, LEFT);
      y += sz + 4;
      lineStr = w;
    } else {
      lineStr = trial;
    }
  }
  if (lineStr) { richText(lineStr, x, y, sz, LEFT); y += sz + 4; }
  return y;
}

// ---------------------------------------------------------------- controls

function rowY(i) { return drawHeight + 18 + 32 * i; }

function drawControlLabels() {
  noStroke();
  fill('black');
  const sz = Lay.wide ? defaultTextSize : 15;
  const fs = fmt(st.fs, 1), fc = fmt(st.fc, 2);
  if (Lay.wide) {
    richText('Sampling rate f_s = ' + fs + ' kHz', 10, rowY(0), sz, LEFT);
    richText('Cutoff f_c = ' + fc + ' kHz', 10, rowY(1), sz, LEFT);
    richText('Butterworth order N = ' + st.N, 10, rowY(2), sz, LEFT);
  } else {
    richText('f_s = ' + fs + ' kHz', 10, rowY(0), sz, LEFT);
    richText('f_c = ' + fc + ' kHz', 10, rowY(1), sz, LEFT);
    richText('Order N = ' + st.N, 10, rowY(2), sz, LEFT);
  }
}

function layoutControls() {
  if (typeof polesCheckbox === 'undefined' || canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  const wide = canvasWidth >= 760;
  const left = wide ? 250 : 122;
  const w = Math.max(60, canvasWidth - left - margin);
  fsSlider.position(left, rowY(0) - 10);
  fcSlider.position(left, rowY(1) - 10);
  orderSlider.position(left, rowY(2) - 10);
  for (const s of [fsSlider, fcSlider, orderSlider]) s.size(w);
  prewarpCheckbox.position(10, rowY(3) - 11);
  polesCheckbox.position(wide ? 250 : 190, rowY(3) - 11);
}

// ---------------------------------------------------------------- mouse: drag the marker and the test pole

function inRect(x, y, P, pad) { return x >= P.x - pad && x <= P.x + P.w + pad && y >= P.y - pad && y <= P.y + P.h + pad; }

function mousePressed() {
  if (!Lay.warp) return;
  if (inRect(mouseX, mouseY, Lay.warp, 0) || (Math.abs(mouseX - wX(markerF)) < 10 &&
      mouseY > Lay.warp.y + Lay.warp.h && mouseY < Lay.warp.y + Lay.warp.h + 14)) {
    dragTarget = 'marker';
    moveMarker();
  } else if (inRect(mouseX, mouseY, Lay.sp, 0)) {
    dragTarget = 'pole';
    movePole();
  }
}

function mouseDragged() {
  if (dragTarget === 'marker') { moveMarker(); return false; }
  if (dragTarget === 'pole') { movePole(); return false; }
}

function mouseReleased() { dragTarget = null; }

function moveMarker() {
  const P = Lay.warp;
  const f = constrain((mouseX - P.x) / P.w * F_MAX, 0, F_MAX);
  markerF = Math.round(f * 20) / 20;
}

function movePole() {
  const P = Lay.sp;
  let sig = S_SIG[0] + (mouseX - P.x) / P.w * (S_SIG[1] - S_SIG[0]);
  let om = S_OM[1] - (mouseY - P.y) / P.h * (S_OM[1] - S_OM[0]);
  sig = constrain(Math.round(sig * 20) / 20, S_SIG[0], S_SIG[1]);
  om = constrain(Math.round(om * 20) / 20, S_OM[0], S_OM[1]);
  if (Math.abs(sig) < 0.12) sig = 0;                    // snap onto the jΩ axis
  if (Math.abs(om) < 0.12) om = 0;                      // snap onto the real axis
  testPole = { sig: sig, om: om };
}

function updateCursor() {
  if (dragTarget) cursor('grabbing');
  else if (Lay.warp && (inRect(mouseX, mouseY, Lay.warp, 0) || inRect(mouseX, mouseY, Lay.sp, 0))) cursor('grab');
  else cursor(ARROW);
}

// ---------------------------------------------------------------- drawing helpers

function startClip(P) {
  push();
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(P.x, P.y, P.w, P.h);
  drawingContext.clip();
}
function stopClip() {
  drawingContext.restore();
  pop();
}

function poleX(x, y, col, s) {
  stroke(col[0], col[1], col[2]);
  strokeWeight(2.2);
  line(x - s, y - s, x + s, y + s);
  line(x - s, y + s, x + s, y - s);
}

function diamond(x, y, r, col, edge) {
  stroke(edge[0], edge[1], edge[2]);
  strokeWeight(1.8);
  fill(col[0], col[1], col[2]);
  quad(x, y - r, x + r, y, x, y + r, x - r, y);
}

// smallest of 0.1, 0.2, 0.25, 0.5, 1, 2, 4 kHz whose spacing is at least minPx and leaves room for its labels
function niceStep(range, px, minPx, vertical) {
  for (const s of [0.1, 0.2, 0.25, 0.5, 1, 2, 4]) {
    const need = vertical ? minPx : Math.max(minPx, String(s).length * 7 + 18);
    if (s / range * px >= need) return s;
  }
  return 4;
}

// ---------------------------------------------------------------- legend and text helpers

// legend items: { kind: 'line' | 'dash' | 'shade', col, label }
function legendWidth(items, sz) {
  let w = 0;
  textStyle(BOLD);
  items.forEach((it, i) => { w += 24 + richWidth(it.label, sz) + (i < items.length - 1 ? 16 : 0); });
  textStyle(NORMAL);
  return w;
}

function drawLegend(items, x, y, sz) {
  let cx = x;
  for (const it of items) {
    const c = it.col;
    if (it.kind === 'shade') {
      noStroke();
      fill(c[0], c[1], c[2], 70);
      rect(cx, y - 6, 18, 12);
    } else {
      stroke(c[0], c[1], c[2]);
      strokeWeight(2.5);
      if (it.kind === 'dash') { line(cx, y, cx + 7, y); line(cx + 11, y, cx + 18, y); } else line(cx, y, cx + 18, y);
    }
    cx += 24;
    noStroke();
    fill(c[0], c[1], c[2]);
    textStyle(BOLD);
    cx += richText(it.label, cx, y, sz, LEFT) + 16;
    textStyle(NORMAL);
  }
}

function fitLegend(cands, x, y, maxW, sz) {
  for (const c of cands) {
    if (legendWidth(c, sz) <= maxW) { drawLegend(c, x, y, sz); return c; }
  }
  const last = cands[cands.length - 1];
  drawLegend(last, x, y, sz);
  return last;
}

// Rich text: "f_s" or "f_{ab}" draws a subscript, "e^{sT}" a superscript
function parseRich(s) {
  const out = [];
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ((ch === '_' || ch === '^') && i + 1 < s.length) {
      if (buf) { out.push({ t: buf, mode: 'n' }); buf = ''; }
      let t;
      if (s[i + 1] === '{') {
        const j = s.indexOf('}', i + 2);
        t = s.slice(i + 2, j < 0 ? s.length : j);
        i = j < 0 ? s.length : j;
      } else {
        t = s[i + 1];
        i++;
      }
      out.push({ t: t, mode: ch === '_' ? 'sub' : 'sup' });
    } else {
      buf += ch;
    }
  }
  if (buf) out.push({ t: buf, mode: 'n' });
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
    textSize(p.mode === 'n' ? sz : sz * 0.72);
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
    textSize(p.mode === 'n' ? sz : sz * 0.72);
    const dy = p.mode === 'sub' ? sz * 0.3 : (p.mode === 'sup' ? -sz * 0.35 : 0);
    text(p.t, cx, y + dy);
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

// colored segments: [{ t, col, bold }]
function segsWidth(segs, sz) {
  let w = 0;
  for (const g of segs) {
    textStyle(g.bold ? BOLD : NORMAL);
    w += richWidth(g.t, sz);
  }
  textStyle(NORMAL);
  return w;
}

function drawSegs(segs, x, y, sz, align) {
  const w = segsWidth(segs, sz);
  let cx = align === CENTER ? x - w / 2 : (align === RIGHT ? x - w : x);
  noStroke();
  for (const g of segs) {
    textStyle(g.bold ? BOLD : NORMAL);
    fill(g.col[0], g.col[1], g.col[2]);
    cx += richText(g.t, cx, y, sz, LEFT);
  }
  textStyle(NORMAL);
  return w;
}

function fitSegs(cands, x, y, maxW, sz, align) {
  for (const c of cands) {
    if (segsWidth(c, sz) <= maxW) return drawSegs(c, x, y, sz, align);
  }
  return drawSegs(cands[cands.length - 1], x, y, sz, align);
}

// number with a true minus sign and no "-0.00"
function fmt(v, d) {
  const r = Number(v.toFixed(d));
  return (r < 0 ? '−' : '') + Math.abs(r).toFixed(d);
}
function fmtTick(v) {
  const r = Math.round(v * 100) / 100;
  return (r < 0 ? '−' : '') + String(Math.abs(r));
}
function fmtDb(v) { return (v === -Infinity || v < -300) ? '−∞' : fmt(v, 1) + ' dB'; }
function fmtPi(w, d) { return (w / Math.PI).toFixed(d) + 'π'; }

// ---------------------------------------------------------------- responsive layout

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  computeLayout();
  layoutControls();
}
