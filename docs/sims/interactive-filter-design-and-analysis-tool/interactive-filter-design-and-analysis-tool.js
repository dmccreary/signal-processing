// Interactive Filter Design and Analysis Tool MicroSim
// CANVAS_HEIGHT: 780
// Compares the standard filter families (low-pass, high-pass, band-pass, band-stop, notch,
// comb, all-pass), designed either as IIR filters (cascaded biquads from the bilinear
// transform, i.e. the RBJ cookbook sections, with Butterworth Q values for higher orders) or
// as FIR filters (Hamming-windowed sinc). It shows the magnitude response with the ideal
// brick-wall response, the phase, group delay, impulse and step responses, the pole-zero
// plot with a stability indicator, the effect of rounding the coefficients to B bits, and
// what the filter does to a test signal made of 200, 1000 and 3000 Hz sinusoids (fs = 8000 Hz).

// Canvas dimensions. The total height is fixed (it is the iframe height); the split between
// the drawing region and the control region changes when narrow screens need an extra row.
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let canvasHeight = 780;
let controlHeight = 152;
let drawHeight = canvasHeight - controlHeight;
let margin = 16;
let defaultTextSize = 16;

// Signal-processing constants
const FS = 8000;                     // sample rate (Hz)
const NYQ = FS / 2;                  // Nyquist frequency (Hz)
const TONES = [200, 1000, 3000];     // test-signal sinusoids, amplitude 1 each
const F_MIN = 20, F_MAX = 3500;      // cutoff / centre frequency range (log-mapped slider)
const F_AXIS_LO = 20;                // left edge of the logarithmic frequency axis (Hz)
const DB_TOP = 10, DB_FLOOR = -80;   // magnitude plot range (dB)
const STOP_DB = -40;                 // stopband threshold used in the read-out (dB)
const HALF_POWER = Math.SQRT1_2;     // -3.01 dB = 1/sqrt(2) of the peak gain
const WARMUP = 16000;                // samples (2 s) run before the steady-state window
const DFT_LEN = 800;                 // 0.1 s window: exactly 20, 100 and 300 cycles of the tones
const SHOW_LEN = 80;                 // 10 ms of waveform on screen
const RESP_LEN = 128;                // impulse / step response length (16 ms)
const BITS_OFF = 25;                 // bits-slider value that means "no rounding" (64-bit floats)

// Colors
const C_MAG = [128, 0, 0];           // magnitude response: maroon
const C_IDEAL = [110, 110, 110];     // ideal brick wall: dashed gray
const C_TONE = [184, 134, 11];       // test tones and the -3 dB line: dark gold
const C_PHASE = [0, 120, 60];        // phase and group delay: green
const C_IN = [160, 160, 160];        // input waveform / input bars: gray
const C_OUT = [25, 90, 200];         // output waveform, impulse and step responses: blue
const C_ZERO = [25, 90, 200];        // zeros: blue circles
const C_POLE = [128, 0, 0];          // poles: maroon crosses
const C_BAD = [205, 30, 30];         // unstable: red
const C_OK = [0, 130, 60];           // stable: green

const TYPE_OPTIONS = [['Low-pass', 'lp'], ['High-pass', 'hp'], ['Band-pass', 'bp'], ['Band-stop', 'bs'],
                      ['Notch', 'notch'], ['Comb', 'comb'], ['All-pass', 'ap']];
const IMPL_OPTIONS = [['IIR: biquad cascade', 'iir'], ['IIR: direct form', 'df'], ['FIR: no feedback', 'fir']];
const VIEW_OPTIONS = [['Show: phase', 'phase'], ['Show: group delay', 'gd'],
                      ['Show: impulse response', 'imp'], ['Show: step response', 'step']];

// Controls
let typeSelect, implSelect, viewSelect, dbCheckbox;
let freqSlider, orderSlider, qSlider, delaySlider, gainSlider, bitsSlider;
let sliderLabels = [];               // label positions, filled by layoutControls()
let layoutWidth = -1;
let narrow = false;

// State
let L = null;                        // drawing layout for the current width
let P = null;                        // current parameters
let R = null;                        // results of the last design + analysis
let lastKey = '';
let lastFrameKey = '';

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  createControls();
  layoutControls(true);

  describe('Filter design tool with fs = 8000 Hz. Choose a filter type (low-pass, high-pass, band-pass, band-stop, notch, comb or all-pass) and an IIR or FIR design, then set the frequency, order, Q, comb delay and gain, and coefficient bits. Plots show the magnitude response with the ideal brick-wall response, the phase, group delay, impulse or step response, the pole-zero plot with a stability indicator, and the input and output of a test signal made of 200, 1000 and 3000 Hz tones with a before and after bar chart.');
}

function createControls() {
  typeSelect = createSelect();
  for (const [label, value] of TYPE_OPTIONS) typeSelect.option(label, value);
  typeSelect.elt.value = 'lp';

  implSelect = createSelect();
  for (const [label, value] of IMPL_OPTIONS) implSelect.option(label, value);
  implSelect.elt.value = 'iir';

  viewSelect = createSelect();
  for (const [label, value] of VIEW_OPTIONS) viewSelect.option(label, value);
  viewSelect.elt.value = 'phase';

  dbCheckbox = createCheckbox('dB scale', true);

  freqSlider = createSlider(0, 1000, freqToSlider(500), 1);    // log-mapped 20 .. 3500 Hz
  orderSlider = createSlider(1, 8, 4, 1);
  qSlider = createSlider(0.5, 20, 2, 0.1);
  delaySlider = createSlider(2, 64, 8, 1);
  gainSlider = createSlider(0, 0.95, 0.9, 0.05);
  bitsSlider = createSlider(4, BITS_OFF, BITS_OFF, 1);         // rightmost position = no rounding
}

// Wide screens: one row of menus and three rows of sliders in two columns.
// Narrow screens (< 640 px): two rows of menus, then the same two slider columns.
function layoutControls(force) {
  if (typeof bitsSlider === 'undefined') return;
  if (!force && layoutWidth === canvasWidth) return;
  layoutWidth = canvasWidth;
  narrow = canvasWidth < 640;
  controlHeight = narrow ? 186 : 152;
  drawHeight = canvasHeight - controlHeight;
  L = null;

  const y0 = drawHeight + 10;
  const menuFont = narrow ? '14px' : '15px';
  for (const s of [typeSelect, implSelect, viewSelect]) s.style('font-size', menuFont);
  dbCheckbox.style('font-size', narrow ? '14px' : '16px');

  if (!narrow) {
    let x = margin;
    typeSelect.position(x, y0); typeSelect.style('width', '120px'); x += 130;
    implSelect.position(x, y0); implSelect.style('width', '175px'); x += 185;
    viewSelect.position(x, y0); viewSelect.style('width', '190px'); x += 202;
    dbCheckbox.position(x, y0 + 1);
  } else {
    const w = Math.floor((canvasWidth - 24) / 2);
    typeSelect.position(8, y0); typeSelect.style('width', w + 'px');
    implSelect.position(16 + w, y0); implSelect.style('width', w + 'px');
    viewSelect.position(8, y0 + 34); viewSelect.style('width', w + 'px');
    dbCheckbox.position(16 + w, y0 + 35);
  }

  const side = narrow ? 8 : margin;
  const firstRow = narrow ? 2 : 1;
  const colW = (canvasWidth - 2 * side) / 2;
  const labelW = narrow ? 84 : 168;
  const cols = [[freqSlider, orderSlider, qSlider], [delaySlider, gainSlider, bitsSlider]];
  sliderLabels = [];
  for (let c = 0; c < 2; c++) {
    for (let r = 0; r < 3; r++) {
      const x = side + c * colW;
      const y = y0 + (firstRow + r) * 34;
      cols[c][r].position(x + labelW, y + 4);
      cols[c][r].size(Math.max(40, colW - labelW - (narrow ? 6 : 16)));
      sliderLabels.push({ slider: cols[c][r], x: x, y: y + 13 });
    }
  }
}

// ---------------------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------------------
function draw() {
  updateCanvasSize();
  if (!L || L.w !== canvasWidth) L = computeLayout();

  P = readParams();
  updateEnabledControls(P);
  const key = JSON.stringify(P);
  if (key !== lastKey) {
    R = computeAll(P);
    lastKey = key;
  }
  // Redraw only when something on screen can have changed (keeps an idle page cheap)
  const frameKey = key + viewSelect.value() + dbCheckbox.checked() + canvasWidth + narrow;
  if (frameKey === lastFrameKey) return;
  lastFrameKey = frameKey;

  drawRegions();
  drawTitle();
  drawMagnitude();
  drawSecondary();
  drawPoleZero();
  drawInfo();
  drawWaveforms();
  drawBars();
  drawControlLabels();
}

function sliderToFreq(v) {
  const f = F_MIN * Math.pow(F_MAX / F_MIN, v / 1000);
  const step = f < 100 ? 1 : (f < 1000 ? 5 : 10);              // round to "nice" frequencies
  return Math.min(F_MAX, Math.max(F_MIN, Math.round(f / step) * step));
}

function freqToSlider(f) {
  return Math.round(1000 * Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN));
}

function readParams() {
  const type = typeSelect.value();
  let impl = implSelect.value();
  if (type === 'ap' && impl === 'fir') {                         // an all-pass needs feedback
    implSelect.elt.value = 'iir';
    impl = 'iir';
  }
  implSelect.elt.options[2].disabled = (type === 'ap');
  return {
    type: type,
    impl: impl,
    f0: sliderToFreq(Number(freqSlider.value())),
    N: Number(orderSlider.value()),
    Q: Math.round(Number(qSlider.value()) * 10) / 10,
    D: Number(delaySlider.value()),
    g: Math.round(Number(gainSlider.value()) * 100) / 100,
    bits: Number(bitsSlider.value())
  };
}

// Which sliders matter for the current filter type
function controlUse(p) {
  const fir = p.impl === 'fir';
  return {
    freq: p.type !== 'comb',
    order: ['lp', 'hp', 'bp', 'bs', 'ap'].includes(p.type),
    q: ['bp', 'bs', 'ap'].includes(p.type) || (p.type === 'notch' && !fir),
    comb: p.type === 'comb'
  };
}

function updateEnabledControls(p) {
  const u = controlUse(p);
  freqSlider.elt.disabled = !u.freq;
  orderSlider.elt.disabled = !u.order;
  qSlider.elt.disabled = !u.q;
  delaySlider.elt.disabled = !u.comb;
  gainSlider.elt.disabled = !u.comb;
}

// ---------------------------------------------------------------------------------------
// Filter design. Every filter is a list of sections {b, a}: H(z) = prod B(z)/A(z) with
// B(z) = sum b[k] z^-k and A(z) = sum a[k] z^-k, a[0] = 1.
// ---------------------------------------------------------------------------------------
function designFilter(p) {
  const d = { sections: [], ideal: null, edges: null, fir: false, M: 0 };
  if (p.type === 'comb') {
    if (p.impl === 'fir') {                                      // y[n] = x[n] + g x[n-D]
      const b = new Array(p.D + 1).fill(0);
      b[0] = 1; b[p.D] = p.g;
      d.sections.push({ b: b, a: [1], comb: 'fir', D: p.D });
      d.fir = true;
    } else {                                                     // y[n] = (1-g) x[n] + g y[n-D]
      const a = new Array(p.D + 1).fill(0);
      a[0] = 1; a[p.D] = -p.g;
      d.sections.push({ b: [1 - p.g], a: a, comb: 'iir', D: p.D });
    }
    return d;
  }
  if (p.impl === 'fir' && p.type !== 'ap') return designFIR(p, d);

  // IIR: analog prototype sections, prewarped so that s = j tan(w/2) maps to w (K = 1)
  const t = Math.tan(Math.PI * p.f0 / FS);
  const secs = d.sections;
  if (p.type === 'lp' || p.type === 'hp') {
    const proto = butterProto(p.N);
    for (const pk of proto.pairs) {
      const den = [1, -2 * pk.re * t, t * t];                    // Q = -1 / (2 Re p)
      secs.push(bilinear2(p.type === 'lp' ? [0, 0, t * t] : [1, 0, 0], den));
    }
    if (proto.hasReal) secs.push(bilinear1(p.type === 'lp' ? [0, t] : [1, 0], [1, t]));
    d.ideal = { kind: p.type, f1: p.f0 };
  } else if (p.type === 'bp' || p.type === 'bs' || p.type === 'notch') {
    const order = p.type === 'notch' ? 1 : p.N;                  // a notch is one biquad
    const proto = butterProto(order);
    const B = t / p.Q, W2 = t * t;
    const num = p.type === 'bp' ? [0, B, 0] : [1, 0, W2];
    for (const pk of proto.pairs) {
      // Band-pass: s^2 - p B s + W0^2 = 0.  Band-stop: s^2 - (B/p) s + W0^2 = 0.
      let cr, ci;
      if (p.type === 'bp') { cr = pk.re * B; ci = pk.im * B; }
      else { const m = pk.re * pk.re + pk.im * pk.im; cr = B * pk.re / m; ci = -B * pk.im / m; }
      const sq = csqrt(cr * cr - ci * ci - 4 * W2, 2 * cr * ci);
      for (const sg of [1, -1]) {
        const rr = (cr + sg * sq[0]) / 2, ri = (ci + sg * sq[1]) / 2;
        secs.push(bilinear2(num, [1, -2 * rr, rr * rr + ri * ri]));
      }
    }
    if (proto.hasReal) secs.push(bilinear2(num, [1, B, W2]));   // the RBJ BPF / notch section
    const W1a = (Math.sqrt(B * B + 4 * W2) - B) / 2, W2a = (Math.sqrt(B * B + 4 * W2) + B) / 2;
    d.edges = [FS / Math.PI * Math.atan(W1a), FS / Math.PI * Math.atan(W2a)];
    d.ideal = { kind: p.type, f1: d.edges[0], f2: d.edges[1], f0: p.f0 };
  } else if (p.type === 'ap') {
    const B = t / p.Q, W2 = t * t;
    for (let k = 0; k < Math.floor(p.N / 2); k++) secs.push(bilinear2([1, -B, W2], [1, B, W2]));
    if (p.N % 2 === 1) secs.push(bilinear1([-1, t], [1, t]));    // first-order all-pass
    d.ideal = { kind: 'ap' };
  }
  if (p.impl === 'df') d.sections = toDirectForm(d.sections);    // same filter, one polynomial pair
  return d;
}

// Butterworth prototype poles exp(j pi (2k + N - 1) / 2N): the upper-half-plane member of
// each conjugate pair, plus the real pole -1 when N is odd.
function butterProto(N) {
  const pairs = [];
  for (let k = 1; k <= Math.floor(N / 2); k++) {
    const th = Math.PI * (2 * k + N - 1) / (2 * N);
    pairs.push({ re: Math.cos(th), im: Math.sin(th) });
  }
  return { pairs: pairs, hasReal: N % 2 === 1 };
}

// Bilinear transform s = (1 - z^-1)/(1 + z^-1) of (n2 s^2 + n1 s + n0)/(d2 s^2 + d1 s + d0)
function bilinear2(n, dn) {
  const b = [n[0] + n[1] + n[2], 2 * (n[2] - n[0]), n[0] - n[1] + n[2]];
  const a = [dn[0] + dn[1] + dn[2], 2 * (dn[2] - dn[0]), dn[0] - dn[1] + dn[2]];
  return normalizeSection(b, a);
}

// Bilinear transform of (n1 s + n0)/(d1 s + d0)
function bilinear1(n, dn) {
  const b = [n[0] + n[1], n[1] - n[0]];
  const a = [dn[0] + dn[1], dn[1] - dn[0]];
  return normalizeSection(b, a);
}

function normalizeSection(b, a) {
  const a0 = a[0];
  return { b: b.map(v => v / a0), a: a.map(v => v / a0) };
}

function csqrt(re, im) {
  const m = Math.hypot(re, im);
  const sr = Math.sqrt(Math.max(0, (m + re) / 2));
  const si = Math.sqrt(Math.max(0, (m - re) / 2));
  return [sr, im < 0 ? -si : si];
}

// FIR designs: Hamming-windowed sinc of order M = 8N (M + 1 taps), a 3-tap notch,
// or the feed-forward comb (handled in designFilter)
function designFIR(p, d) {
  d.fir = true;
  if (p.type === 'notch') {                                      // zeros at e^{+-j w0}, no poles
    const c = Math.cos(2 * Math.PI * p.f0 / FS), k = 2 + 2 * Math.abs(c);
    d.sections.push({ b: [1 / k, -2 * c / k, 1 / k], a: [1] });
    d.ideal = { kind: 'notch', f1: p.f0, f2: p.f0, f0: p.f0 };
    d.M = 2;
    return d;
  }
  const M = 8 * p.N;
  d.M = M;
  const lowpass = fc => {
    const h = [];
    for (let n = 0; n <= M; n++) h.push(hammingW(n, M) * idealLP(n - M / 2, fc));
    return h;
  };
  let h;
  if (p.type === 'lp' || p.type === 'hp') {
    h = lowpass(p.f0);
    const s = h.reduce((acc, v) => acc + v, 0);
    h = h.map(v => v / s);                                       // DC gain exactly 1
    if (p.type === 'hp') { h = h.map(v => -v); h[M / 2] += 1; }  // spectral inversion
    d.ideal = { kind: p.type, f1: p.f0 };
  } else {
    const c = Math.sqrt(1 + 1 / (4 * p.Q * p.Q));
    const f1 = p.f0 * (c - 1 / (2 * p.Q));
    const f2 = Math.min(NYQ - 1, p.f0 * (c + 1 / (2 * p.Q)));   // sqrt(f1 f2) = f0, f2 - f1 = f0/Q
    const h2 = lowpass(f2), h1 = lowpass(f1);
    h = h2.map((v, i) => v - h1[i]);
    const g0 = Math.hypot(...evalPoly(h, 2 * Math.PI * p.f0 / FS));
    h = h.map(v => v / g0);                                      // gain 1 at the centre
    if (p.type === 'bs') { h = h.map(v => -v); h[M / 2] += 1; }
    d.edges = [f1, f2];
    d.ideal = { kind: p.type, f1: f1, f2: f2, f0: p.f0 };
  }
  d.sections.push({ b: h, a: [1] });
  return d;
}

function hammingW(n, M) { return 0.54 - 0.46 * Math.cos(2 * Math.PI * n / M); }

function idealLP(m, fc) {
  const wc = 2 * fc / FS;
  return m === 0 ? wc : Math.sin(Math.PI * wc * m) / (Math.PI * m);
}

// Coefficient rounding to B-bit fixed point. Each coefficient vector (the numerator b and the
// feedback coefficients a1..aN of every section; a0 = 1 is implied) gets a power-of-two scale
// 2^e >= its largest |coefficient| (for a biquad denominator that is 2, because |a1| < 2), and
// each coefficient is rounded to a multiple of 2^e / 2^(B-1): B bits including the sign.
function quantizeVector(v, bits) {
  const big = v.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  if (big === 0) return v.slice();
  const step = Math.pow(2, Math.ceil(Math.log2(big))) * Math.pow(2, -(bits - 1));
  return v.map(x => Math.round(x / step) * step);
}

function quantizeSections(secs, bits) {
  if (bits >= BITS_OFF) return secs;
  return secs.map(s => Object.assign({}, s, {
    b: quantizeVector(s.b, bits),
    a: [1].concat(quantizeVector(s.a.slice(1), bits))
  }));
}

function polyMul(x, y) {
  const out = new Array(x.length + y.length - 1).fill(0);
  for (let i = 0; i < x.length; i++) for (let j = 0; j < y.length; j++) out[i + j] += x[i] * y[j];
  return out;
}

// Direct form: multiply the sections out into one numerator and one denominator polynomial
function toDirectForm(secs) {
  if (secs.length < 2) return secs;
  let b = [1], a = [1];
  for (const s of secs) { b = polyMul(b, s.b); a = polyMul(a, s.a); }
  return [{ b: b, a: a }];
}

// ---------------------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------------------
let hornerRe = 0, hornerIm = 0, hornerDRe = 0, hornerDIm = 0;

// Evaluates P(u) = sum c[k] u^k and u P'(u) = sum k c[k] u^k at u = e^{-jw} = (ur, ui)
function hornerBoth(c, ur, ui) {
  let pr = c[c.length - 1], pi = 0, dr = 0, di = 0;
  for (let k = c.length - 2; k >= 0; k--) {
    const ndr = dr * ur - di * ui + pr, ndi = dr * ui + di * ur + pi;   // dp = dp*u + p
    dr = ndr; di = ndi;
    const npr = pr * ur - pi * ui + c[k], npi = pr * ui + pi * ur;        // p = p*u + c[k]
    pr = npr; pi = npi;
  }
  hornerRe = pr; hornerIm = pi;
  hornerDRe = dr * ur - di * ui; hornerDIm = dr * ui + di * ur;           // u * P'(u)
}

function evalPoly(c, w) {
  hornerBoth(c, Math.cos(w), -Math.sin(w));
  return [hornerRe, hornerIm];
}

// Complex response of the whole cascade at frequency f (Hz)
function evalResponse(secs, f) {
  const w = 2 * Math.PI * f / FS;
  let hr = 1, hi = 0;
  for (const s of secs) {
    const [br, bi] = evalPoly(s.b, w);
    const [ar, ai] = evalPoly(s.a, w);
    const den = ar * ar + ai * ai;
    const qr = (br * ar + bi * ai) / den, qi = (bi * ar - br * ai) / den;
    const nr = hr * qr - hi * qi, ni = hr * qi + hi * qr;
    hr = nr; hi = ni;
  }
  return [hr, hi];
}

// Frequency grid: 4096 log-spaced + 4096 linear points + the special frequencies
function buildGrid(extra) {
  const lo = 0.25, hi = NYQ - 0.5, n = 4096;
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(lo * Math.pow(hi / lo, i / (n - 1)));
  for (let i = 1; i <= n; i++) pts.push(hi * i / n);
  for (const f of extra) if (f > lo && f < hi) pts.push(f);
  pts.sort((x, y) => x - y);
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) if (pts[i] - out[out.length - 1] > 1e-7) out.push(pts[i]);
  return Float64Array.from(out);
}

// Magnitude, unwrapped phase (rad) and group delay (samples) on the grid
function analyze(secs, F) {
  const n = F.length;
  const mag = new Float64Array(n).fill(1);
  const phase = new Float64Array(n);
  const gd = new Float64Array(n);
  const bad = new Uint8Array(n);                                 // response is ~0: phase undefined
  for (const s of secs) {
    const bNorm = Math.max(1e-300, s.b.reduce((acc, v) => acc + Math.abs(v), 0));
    let prev = NaN;
    for (let i = 0; i < n; i++) {
      const w = 2 * Math.PI * F[i] / FS;
      const ur = Math.cos(w), ui = -Math.sin(w);
      hornerBoth(s.b, ur, ui);
      const Br = hornerRe, Bi = hornerIm, Dr = hornerDRe, Di = hornerDIm;
      hornerBoth(s.a, ur, ui);
      const Ar = hornerRe, Ai = hornerIm, Er = hornerDRe, Ei = hornerDIm;
      const B2 = Br * Br + Bi * Bi, A2 = Ar * Ar + Ai * Ai;
      mag[i] *= Math.sqrt(B2 / A2);
      if (Math.sqrt(B2) < 1e-9 * bNorm) { bad[i] = 1; continue; }
      gd[i] += (Dr * Br + Di * Bi) / B2 - (Er * Ar + Ei * Ai) / A2;
      const raw = Math.atan2(Bi, Br) - Math.atan2(Ai, Ar);
      const val = isNaN(prev) ? raw : raw + 2 * Math.PI * Math.round((prev - raw) / (2 * Math.PI));
      phase[i] += val;
      prev = val;
    }
  }
  for (let i = 0; i < n; i++) if (bad[i]) { phase[i] = NaN; gd[i] = NaN; }
  return { mag: mag, phase: phase, gd: gd };
}

// Intervals of the grid where test(dB) holds, with interpolated edges at level thr
function findBands(F, dB, thr, above) {
  const inside = v => (above ? v >= thr : v <= thr);
  const cross = i => {
    const d0 = dB[i - 1], d1 = dB[i];
    if (!isFinite(d0) || !isFinite(d1) || d1 === d0) return F[i];
    return F[i - 1] + (thr - d0) * (F[i] - F[i - 1]) / (d1 - d0);
  };
  const out = [];
  let start = null;
  for (let i = 0; i < F.length; i++) {
    const ins = inside(dB[i]);
    if (ins && start === null) start = i === 0 ? 0 : cross(i);
    if (!ins && start !== null) { out.push([start, cross(i)]); start = null; }
  }
  if (start !== null) out.push([start, NYQ]);
  return out;
}

// Roots of c[0] z^n + c[1] z^(n-1) + ... + c[n] as [re, im] pairs
function polyRoots(c0) {
  const big = c0.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  if (big === 0) return null;                                    // the polynomial is identically 0
  const c = c0.slice();
  const eps = big * 1e-13;
  while (c.length > 1 && Math.abs(c[0]) <= eps) c.shift();       // leading zeros: roots at infinity
  const roots = [];
  while (c.length > 1 && Math.abs(c[c.length - 1]) <= eps) { c.pop(); roots.push([0, 0]); }
  const n = c.length - 1;
  if (n === 1) roots.push([-c[1] / c[0], 0]);
  else if (n === 2) {
    const A = c[0], B = c[1], C = c[2], disc = B * B - 4 * A * C;
    if (disc >= 0) {
      const q = -(B + (B >= 0 ? 1 : -1) * Math.sqrt(disc)) / 2;
      roots.push([q / A, 0]);
      roots.push(q !== 0 ? [C / q, 0] : [0, 0]);
    } else {
      roots.push([-B / (2 * A), Math.sqrt(-disc) / (2 * A)]);
      roots.push([-B / (2 * A), -Math.sqrt(-disc) / (2 * A)]);
    }
  } else if (n > 2) {
    for (const z of aberthRoots(c)) roots.push(z);
  }
  return roots;
}

// Aberth-Ehrlich simultaneous root iteration (used for FIR polynomials up to degree 64)
function aberthRoots(c) {
  const n = c.length - 1;
  const a = c.map(v => v / c[0]);
  let r0 = Math.pow(Math.abs(a[n]), 1 / n);
  if (!(r0 > 1e-3 && r0 < 1e3)) r0 = 1;
  const zr = [], zi = [];
  for (let k = 0; k < n; k++) {
    const th = 2 * Math.PI * k / n + 0.4;
    zr.push(r0 * Math.cos(th)); zi.push(r0 * Math.sin(th));
  }
  for (let iter = 0; iter < 300; iter++) {
    let maxStep = 0;
    for (let i = 0; i < n; i++) {
      // p(z) and p'(z) by Horner
      let pr = 1, pi = 0, dr = 0, di = 0;
      const xr = zr[i], xi = zi[i];
      for (let k = 1; k <= n; k++) {
        const ndr = dr * xr - di * xi + pr, ndi = dr * xi + di * xr + pi;
        dr = ndr; di = ndi;
        const npr = pr * xr - pi * xi + a[k], npi = pr * xi + pi * xr;
        pr = npr; pi = npi;
      }
      const dd = dr * dr + di * di;
      if (dd === 0) { zr[i] += 1e-6; continue; }
      const rr = (pr * dr + pi * di) / dd, ri = (pi * dr - pr * di) / dd;   // ratio = p / p'
      let sr = 0, si = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const ur = xr - zr[j], ui = xi - zi[j], uu = ur * ur + ui * ui;
        if (uu === 0) continue;
        sr += ur / uu; si -= ui / uu;                            // 1 / (z_i - z_j)
      }
      const denr = 1 - (rr * sr - ri * si), deni = -(rr * si + ri * sr);
      const den2 = denr * denr + deni * deni;
      if (den2 === 0) continue;
      const wr = (rr * denr + ri * deni) / den2, wi = (ri * denr - rr * deni) / den2;
      zr[i] = xr - wr; zi[i] = xi - wi;
      maxStep = Math.max(maxStep, Math.hypot(wr, wi) / (1 + Math.hypot(zr[i], zi[i])));
    }
    if (maxStep < 1e-13) break;
  }
  return zr.map((v, i) => [v, zi[i]]);
}

// Zeros and poles of one section (in z, including those at the origin)
function sectionRoots(s) {
  if (s.comb) {                                                  // analytic: z^D = -g or z^D = g
    const D = s.D, zeros = [], poles = [];
    const g = s.comb === 'fir' ? s.b[D] / s.b[0] : -s.a[D];
    if (s.comb === 'iir' && s.b[0] === 0) return { zeros: [], poles: [], silent: true };
    if (g !== 0) {
      const r = Math.pow(Math.abs(g), 1 / D);
      // FIR: z^D = -g (odd multiples of pi/D when g > 0); IIR: z^D = g (multiples of 2 pi/D)
      const odd = (s.comb === 'fir') === (g > 0);
      const roots = [];
      for (let k = 0; k < D; k++) {
        const th = (odd ? (2 * k + 1) : 2 * k) * Math.PI / D;
        roots.push([r * Math.cos(th), r * Math.sin(th)]);
      }
      const origin = [];
      for (let k = 0; k < D; k++) origin.push([0, 0]);
      if (s.comb === 'fir') { zeros.push(...roots); poles.push(...origin); }
      else { poles.push(...roots); zeros.push(...origin); }
    }
    return { zeros: zeros, poles: poles, silent: false };
  }
  const Lz = Math.max(s.b.length, s.a.length) - 1;
  const zr = polyRoots(s.b);
  const pr = polyRoots(s.a) || [];
  for (let k = s.a.length - 1; k < Lz; k++) pr.push([0, 0]);
  if (zr === null) return { zeros: [], poles: pr, silent: true };      // B(z) = 0: no output at all
  for (let k = s.b.length - 1; k < Lz; k++) zr.push([0, 0]);
  return { zeros: zr, poles: pr, silent: false };
}

// Direct-form difference equation, skipping zero coefficients
function filterSection(s, x) {
  const n = x.length;
  const y = new Float64Array(n);
  const bi = [], ai = [];
  s.b.forEach((v, k) => { if (v !== 0) bi.push(k); });
  s.a.forEach((v, k) => { if (k > 0 && v !== 0) ai.push(k); });
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (const k of bi) if (i >= k) acc += s.b[k] * x[i - k];
    for (const k of ai) if (i >= k) acc -= s.a[k] * y[i - k];
    y[i] = acc;
  }
  return y;
}

function filterCascade(secs, x) {
  let y = x;
  for (const s of secs) y = filterSection(s, y);
  return y;
}

// Amplitude of the sinusoid at f in y[start .. start+len) (whole number of cycles: no leakage)
function toneAmplitude(y, start, len, f) {
  let re = 0, im = 0;
  for (let n = 0; n < len; n++) {
    const ph = 2 * Math.PI * f * (start + n) / FS;
    re += y[start + n] * Math.cos(ph);
    im -= y[start + n] * Math.sin(ph);
  }
  return 2 * Math.hypot(re, im) / len;
}

function computeAll(p) {
  const design = designFilter(p);
  const secs = quantizeSections(design.sections, p.bits);
  const extra = TONES.concat([p.f0]).concat(design.edges || []);
  const F = buildGrid(extra);
  const A = analyze(secs, F);
  const dB = A.mag.map(v => 20 * Math.log10(Math.max(v, 1e-15)));

  // Poles and zeros
  let zeros = [], poles = [], silent = false;
  for (const s of secs) {
    const r = sectionRoots(s);
    zeros = zeros.concat(r.zeros);
    poles = poles.concat(r.poles);
    if (r.silent) silent = true;
  }
  const maxPole = poles.reduce((m, z) => Math.max(m, Math.hypot(z[0], z[1])), 0);
  const isFIR = secs.every(s => s.a.length === 1 || s.a.slice(1).every(v => v === 0));
  let aStep = 0;                                                 // rounding step of the feedback coefficients
  for (const s of design.sections) {
    const big = s.a.slice(1).reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    if (big > 0) aStep = Math.max(aStep, Math.pow(2, Math.ceil(Math.log2(big))) * Math.pow(2, -(p.bits - 1)));
  }
  const unstable = !isFIR && maxPole >= 1 - 1e-9;

  // Pass and stop bands relative to the peak gain
  let peak = 0;
  for (let i = 0; i < F.length; i++) peak = Math.max(peak, A.mag[i]);
  const peakDb = 20 * Math.log10(Math.max(peak, 1e-15));
  const pass = silent ? [] : findBands(F, dB, peakDb + 20 * Math.log10(HALF_POWER), true);
  const stop = silent ? [] : findBands(F, dB, peakDb + STOP_DB, false);
  const edges3 = [];
  for (const [fa, fb] of pass) {
    if (fa > 0.5) edges3.push(fa);
    if (fb < NYQ - 0.5) edges3.push(fb);
  }

  // Test signal: three unit sinusoids, filtered sample by sample with the same coefficients
  const total = WARMUP + DFT_LEN;
  const x = new Float64Array(total);
  for (let n = 0; n < total; n++) {
    let v = 0;
    for (const f of TONES) v += Math.sin(2 * Math.PI * f * n / FS);
    x[n] = v;
  }
  const y = filterCascade(secs, x);
  let yMax = 0;
  for (let n = WARMUP; n < total; n++) yMax = Math.max(yMax, Math.abs(y[n]));
  const diverged = !isFinite(yMax) || yMax > 1e6;
  const start = diverged ? 0 : WARMUP;
  const toneIn = TONES.map(f => toneAmplitude(x, WARMUP, DFT_LEN, f));
  const toneOut = TONES.map(f => (diverged ? Infinity : toneAmplitude(y, WARMUP, DFT_LEN, f)));
  const toneH = TONES.map(f => Math.hypot(...evalResponse(secs, f)));

  // Impulse and step responses
  const delta = new Float64Array(RESP_LEN); delta[0] = 1;
  const ones = new Float64Array(RESP_LEN).fill(1);

  // Phase and group delay at f0 (for the all-pass read-out)
  let i0 = 0;
  for (let i = 0; i < F.length; i++) if (Math.abs(F[i] - p.f0) < Math.abs(F[i0] - p.f0)) i0 = i;

  // Display range of the pole-zero plot
  let maxRoot = 0;
  for (const z of zeros.concat(poles)) maxRoot = Math.max(maxRoot, Math.hypot(z[0], z[1]));
  const pzRange = Math.min(2, Math.max(1.25, maxRoot * 1.08));
  const outside = zeros.concat(poles).filter(z => Math.hypot(z[0], z[1]) > pzRange * 0.98).length;

  return {
    p: p, design: design, secs: secs, F: F, mag: A.mag, dB: dB, phase: A.phase, gd: A.gd,
    peak: peak, peakDb: peakDb, pass: pass, stop: stop, edges3: edges3,
    zeros: zeros, poles: poles, maxPole: maxPole, isFIR: isFIR, unstable: unstable, silent: silent, aStep: aStep,
    xs: Array.from(x.slice(start, start + SHOW_LEN)), ys: Array.from(y.slice(start, start + SHOW_LEN)),
    diverged: diverged, toneIn: toneIn, toneOut: toneOut, toneH: toneH,
    imp: Array.from(filterCascade(secs, delta)), step: Array.from(filterCascade(secs, ones)),
    phaseF0: A.phase[i0], gdF0: A.gd[i0],
    axisLog: p.type !== 'comb', pzRange: pzRange, outside: outside
  };
}

// ---------------------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------------------
function computeLayout() {
  const W = canvasWidth;
  if (!narrow) {
    // Two columns: plots on the left, pole-zero plot, read-outs and tone bars on the right.
    // Between 640 and 820 px a compact tier uses a smaller pole-zero plot and read-out font.
    const compact = W < 820;
    const rightW = Math.max(250, Math.round(W * 0.31));
    const split = W - rightW;
    const x0 = 72, x1 = split - 18;
    const S = compact ? 160 : Math.min(rightW - 42, 180);
    const cx = split + rightW / 2;
    return {
      w: W, narrow: false, titleSize: 22, titleY: 8, plotTitle: 16, tick: 14,
      infoSize: compact ? 14 : 15, lineH: compact ? 18 : 20,
      mag: { x0: x0, x1: x1, y0: 58, y1: 226, titleY: 44, axisTitle: true },
      sec: { x0: x0, x1: x1, y0: 296, y1: 398, titleY: 282, axisTitle: true },
      wave: { x0: x0, x1: x1, y0: 470, y1: 576, titleY: 456, axisTitle: true },
      pz: { cx: cx, cy: 58 + S / 2, S: S, titleY: 44 },
      info: { x0: split + 10, x1: W - 10, y0: 58 + S + 22, y1: 448 },
      bars: { x0: split + 40, x1: W - 14, y0: 470, y1: 576, titleY: 456 }
    };
  }
  const x0 = 46, x1 = W - 10;
  const S = Math.min(140, Math.floor(W * 0.4));
  const split = Math.round(W * 0.6);
  return {
    w: W, narrow: true, titleSize: 18, titleY: 3, plotTitle: 14, tick: 12, infoSize: 13, lineH: 17,
    mag: { x0: x0, x1: x1, y0: 48, y1: 146, titleY: 37, axisTitle: false },
    sec: { x0: x0, x1: x1, y0: 356, y1: 424, titleY: 344, axisTitle: false },
    wave: { x0: x0, x1: split - 8, y0: 468, y1: 548, titleY: 456, axisTitle: false },
    pz: { cx: 10 + S / 2, cy: 192 + S / 2, S: S, titleY: 180 },
    info: { x0: S + 24, x1: W - 6, y0: 186, y1: 336 },
    bars: { x0: split + 24, x1: W - 8, y0: 468, y1: 548, titleY: 456 }
  };
}

// ---------------------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------------------
function measure(s) {
  return (typeof fontWidth === 'function') ? fontWidth(s) : textWidth(s);
}

function setStroke(c, w) { stroke(c[0], c[1], c[2]); strokeWeight(w); }
function setFill(c) { fill(c[0], c[1], c[2]); }

function withClip(r, fn) {
  push();
  drawingContext.beginPath();
  drawingContext.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
  drawingContext.clip();
  fn();
  pop();
}

function dashed(on) { drawingContext.setLineDash(on ? on : []); }

function freqToX(f, r) {
  if (R.axisLog) return r.x0 + (r.x1 - r.x0) * Math.log(Math.max(f, 1) / F_AXIS_LO) / Math.log(NYQ / F_AXIS_LO);
  return r.x0 + (r.x1 - r.x0) * f / NYQ;
}

function plotFrame(r) {
  fill(255);
  stroke(192);
  strokeWeight(1);
  rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
}

function plotTitle(r, label) {
  noStroke();
  fill(0);
  textSize(L.plotTitle);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text(label, r.x0, r.titleY);
  textStyle(NORMAL);
}

function rotatedLabel(label, x, yc) {
  push();
  translate(x, yc);
  rotate(-HALF_PI);
  noStroke();
  fill(0);
  textSize(L.tick);
  textAlign(CENTER, CENTER);
  text(label, 0, 0);
  pop();
}

// Legend items: {label, short, color, kind: 'line' | 'dash' | 'box' | 'dot'}
function legendItemWidth(it, useShort) {
  return measure(useShort && it.short ? it.short : it.label) + 6 + ((it.kind === 'box' || it.kind === 'dot') ? 22 : 34);
}

// Right-aligned legend ending at xRight, centred on y
function legend(items, xRight, y, useShort) {
  textSize(L.tick);
  let x = xRight;
  for (let k = items.length - 1; k >= 0; k--) {
    const it = items[k];
    const label = useShort && it.short ? it.short : it.label;
    noStroke();
    fill(40);
    textAlign(RIGHT, CENTER);
    text(label, x, y);
    x -= measure(label) + 6;
    if (it.kind === 'box') {
      noStroke(); setFill(it.color); rect(x - 12, y - 6, 12, 12);
    } else if (it.kind === 'dot') {
      noStroke(); setFill(it.color); circle(x - 6, y, 8);
    } else {
      setStroke(it.color, it.kind === 'dash' ? 1.5 : 2.5);
      dashed(it.kind === 'dash' ? [5, 4] : null);
      line(x - 22, y, x, y);
      dashed(null);
    }
    x -= (it.kind === 'box' || it.kind === 'dot') ? 22 : 34;
  }
}

// Plot title plus legend on the title row. Falls back to the short title, then to short legend
// labels, and finally puts the legend inside the plot's top-right corner on a white box.
function titleAndLegend(r, longTitle, shortTitle, items) {
  textSize(L.plotTitle); textStyle(BOLD);
  const wLong = measure(longTitle), wShort = measure(shortTitle);
  textStyle(NORMAL);
  textSize(L.tick);
  const wItems = useShort => items.reduce((acc, it) => acc + legendItemWidth(it, useShort), 0);
  const room = r.x1 - r.x0 - 14;
  if (wLong + wItems(false) <= room) { plotTitle(r, longTitle); legend(items, r.x1, r.titleY, false); return; }
  plotTitle(r, shortTitle);
  if (wShort + wItems(false) <= room) { legend(items, r.x1, r.titleY, false); return; }
  if (wShort + wItems(true) <= room) { legend(items, r.x1, r.titleY, true); return; }
  const w = wItems(true) + 6, y = r.y0 + 12;
  noStroke(); fill(255, 255, 255, 230);
  rect(r.x1 - w - 4, r.y0 + 3, w + 2, 18, 4);
  legend(items, r.x1 - 6, y, true);
}

function freqTicks(r) {
  const ticks = R.axisLog
    ? [[20, '20'], [50, '50'], [100, '100'], [200, '200'], [500, '500'], [1000, '1k'], [2000, '2k'], [4000, '4k']]
    : [[0, '0'], [500, ''], [1000, '1k'], [1500, ''], [2000, '2k'], [2500, ''], [3000, '3k'], [3500, ''], [4000, '4k']];
  for (const [f, label] of ticks) {
    const x = freqToX(f, r);
    stroke(228); strokeWeight(1);
    line(x, r.y0, x, r.y1);
    if (label) {
      noStroke(); fill(60); textSize(L.tick); textAlign(CENTER, TOP);
      text(label, x, r.y1 + 4);
    }
  }
  if (r.axisTitle) {
    noStroke(); fill(0); textSize(L.tick); textAlign(CENTER, TOP);
    text(R.axisLog ? 'Frequency (Hz, log scale)' : 'Frequency (Hz, linear scale)', (r.x0 + r.x1) / 2, r.y1 + 21);
  }
}

function yTicks(r, lo, hi, step, yMap, fmt) {
  const first = Math.ceil(lo / step - 1e-9) * step;
  for (let v = first; v <= hi + 1e-9 * step; v += step) {
    const y = yMap(v);
    stroke(v === 0 ? 200 : 232); strokeWeight(1);
    line(r.x0, y, r.x1, y);
    noStroke(); fill(60); textSize(L.tick); textAlign(RIGHT, CENTER);
    text(fmt(v), r.x0 - 5, y);
  }
}

function niceStep(span, maxTicks, steps) {
  for (const s of steps) if (span / s <= maxTicks) return s;
  return steps[steps.length - 1] * Math.ceil(span / (maxTicks * steps[steps.length - 1]));
}

function fmtNum(v) {
  const a = Math.abs(v);
  if (a === 0) return '0';
  if (a >= 1e5) return v.toExponential(0);
  if (a >= 100 || Number.isInteger(v)) return String(Math.round(v));
  if (a >= 10) return v.toFixed(0);
  if (a >= 1) return v.toFixed(1).replace(/\.0$/, '');
  return v.toFixed(2).replace(/0$/, '');
}

// Draws values on the frequency grid as a per-pixel envelope so narrow notches and peaks show
function gridCurve(r, values, yMap, col, weight) {
  setStroke(col, weight);
  noFill();
  let open = false, cur = null, yFirst = 0, yLast = 0, yMin = 0, yMax = 0;
  const flush = () => {
    if (cur === null) return;
    if (!open) { beginShape(); open = true; }
    vertex(cur + 0.5, yFirst);
    if (yMax - yMin > 1.5) { vertex(cur + 0.5, yMin); vertex(cur + 0.5, yMax); }
    vertex(cur + 0.5, yLast);
  };
  const fLo = R.axisLog ? F_AXIS_LO : 0;
  for (let i = 0; i < R.F.length; i++) {
    const f = R.F[i];
    if (f < fLo) continue;
    const v = values[i];
    if (!isFinite(v)) {
      flush(); cur = null;
      if (open) { endShape(); open = false; }
      continue;
    }
    const c = Math.floor(freqToX(f, r));
    const y = yMap(v);
    if (c !== cur) {
      flush();
      cur = c; yFirst = y; yMin = y; yMax = y;
    }
    yLast = y;
    yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
  }
  flush();
  if (open) endShape();
}

function wrapLines(str, maxW) {
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (cur && measure(trial) > maxW) { lines.push(cur); cur = '  ' + w; }
    else cur = trial;
  }
  if (cur) lines.push(cur);
  return lines;
}

function fmtHz(f) { return Math.round(f) + ''; }

// Frequencies such as fs/D: whole numbers as integers, otherwise one decimal (62.5, 2666.7)
function fmtHzExact(f) { return Math.abs(f - Math.round(f)) < 1e-9 ? String(Math.round(f)) : f.toFixed(1); }

// Signed value with a typographic minus sign: +5.8, −26.0
function fmtDb(v, digits) {
  const s = Math.abs(v).toFixed(digits === undefined ? 1 : digits);
  if (Number(s) === 0) return s;
  return (v < 0 ? '−' : '+') + s;
}

function fmtBands(bands) {
  if (bands.length === 0) return 'none';
  if (bands.length > 3) return bands.length + ' separate bands';
  return bands.map(([a, b]) => fmtHz(a) + '–' + fmtHz(b)).join(', ') + ' Hz';
}

// ---------------------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------------------
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
  fill(0);
  textSize(L.titleSize);
  textAlign(CENTER, TOP);
  text(L.narrow ? 'Filter Design and Analysis Tool' : 'Interactive Filter Design and Analysis Tool', canvasWidth / 2, L.titleY);
}

function drawMagnitude() {
  const r = L.mag;
  const useDb = dbCheckbox.checked();
  const linTop = R.peak > 1.15 ? 2 : 1.2;
  const yMap = useDb
    ? v => map(Math.max(v, DB_FLOOR - 5), DB_FLOOR, DB_TOP, r.y1, r.y0)
    : v => map(Math.min(v, linTop + 0.2), 0, linTop, r.y1, r.y0);

  plotFrame(r);
  if (useDb) yTicks(r, DB_FLOOR, 0, 20, yMap, v => String(v));
  else yTicks(r, 0, linTop, 0.5, yMap, v => v.toFixed(1));
  freqTicks(r);
  rotatedLabel(useDb ? 'Gain (dB)' : 'Gain |H|', 12, (r.y0 + r.y1) / 2);

  // -3 dB reference (half power relative to the peak gain) for the frequency-selective types
  const showRef = !R.unstable && !R.silent && R.p.type !== 'comb' && R.p.type !== 'ap';
  const ref = useDb ? R.peakDb + 20 * Math.log10(HALF_POWER) : R.peak * HALF_POWER;
  withClip(r, () => {
    if (showRef) {
      setStroke(C_TONE, 1); dashed([2, 4]);
      line(r.x0, yMap(ref), r.x1, yMap(ref));
      dashed(null);
    }

    // Ideal brick-wall response (dashed gray)
    drawIdeal(r, useDb ? (g => (g > 0 ? 0 : DB_FLOOR - 5)) : (g => g), yMap);

    // Test-tone markers
    TONES.forEach((f, k) => {
      const x = freqToX(f, r);
      setStroke(C_TONE, 1); dashed([3, 3]);
      line(x, r.y0, x, r.y1);
      dashed(null);
      const g = R.toneH[k];
      const y = yMap(useDb ? 20 * Math.log10(Math.max(g, 1e-15)) : g);
      noStroke(); setFill(C_TONE);
      if (y <= r.y1) circle(x, y, 9);
    });

    // The filter's response
    gridCurve(r, useDb ? R.dB : R.mag, yMap, C_MAG, 2.5);

    if (showRef) {
      textSize(L.tick);
      const lw = measure('−3 dB');
      noStroke(); fill(255, 255, 255, 225);
      rect(r.x1 - lw - 8, yMap(ref) - L.tick - 2, lw + 6, L.tick + 1);
      setFill(C_TONE); textAlign(RIGHT, BOTTOM);
      text('−3 dB', r.x1 - 4, yMap(ref) - 1);
    }
  });

  const items = [{ label: 'filter', color: C_MAG, kind: 'line' }];
  if (R.design.ideal) items.push({ label: 'ideal', color: C_IDEAL, kind: 'dash' });
  items.push({ label: 'test tones', short: 'tones', color: C_TONE, kind: 'dot' });
  titleAndLegend(r, 'Magnitude response |H(f)|', 'Magnitude', items);
  if (R.unstable) banner(r, 'Unstable: not a steady-state response');
}

// Warning text in the top-left corner of a plot, on a white box so curves do not hide it
function banner(r, msg) {
  textSize(L.tick);
  const w = measure(msg);
  noStroke(); fill(255, 255, 255, 230);
  rect(r.x0 + 3, r.y0 + 3, w + 8, L.tick + 6, 4);
  setFill(C_BAD); textAlign(LEFT, TOP);
  text(msg, r.x0 + 7, r.y0 + 6);
}

function drawIdeal(r, gainToVal, yMap) {
  const id = R.design.ideal;
  if (!id) return;
  const fLo = R.axisLog ? F_AXIS_LO : 0;
  let pts = [];                                                  // [f, gain] breakpoints
  if (id.kind === 'lp') pts = [[fLo, 1], [id.f1, 1], [id.f1, 0], [NYQ, 0]];
  else if (id.kind === 'hp') pts = [[fLo, 0], [id.f1, 0], [id.f1, 1], [NYQ, 1]];
  else if (id.kind === 'bp') pts = [[fLo, 0], [id.f1, 0], [id.f1, 1], [id.f2, 1], [id.f2, 0], [NYQ, 0]];
  else if (id.kind === 'bs') pts = [[fLo, 1], [id.f1, 1], [id.f1, 0], [id.f2, 0], [id.f2, 1], [NYQ, 1]];
  else if (id.kind === 'notch') pts = [[fLo, 1], [id.f0, 1], [id.f0, 0], [id.f0, 1], [NYQ, 1]];
  else if (id.kind === 'ap') pts = [[fLo, 1], [NYQ, 1]];
  setStroke(C_IDEAL, 1.5);
  dashed([6, 5]);
  noFill();
  beginShape();
  for (const [f, g] of pts) vertex(freqToX(Math.max(f, fLo), r), yMap(gainToVal(g)));
  endShape();
  dashed(null);
}

function drawSecondary() {
  const r = L.sec;
  const view = viewSelect.value();
  plotFrame(r);
  if (view === 'phase' || view === 'gd') {
    const vals = view === 'phase' ? R.phase.map(v => v * 180 / Math.PI) : R.gd;
    let lo = Infinity, hi = -Infinity;
    const fLo = R.axisLog ? F_AXIS_LO : 0;
    for (let i = 0; i < R.F.length; i++) {
      if (R.F[i] < fLo || !isFinite(vals[i])) continue;
      lo = Math.min(lo, vals[i]); hi = Math.max(hi, vals[i]);
    }
    if (!isFinite(lo)) { lo = -1; hi = 1; }
    if (view === 'gd') { lo = Math.min(0, lo); hi = Math.max(hi, 1); }
    let step = view === 'phase'
      ? niceStep(hi - lo, 4, [15, 30, 45, 90, 180, 360, 720, 1440])
      : niceStep(hi - lo, 4, [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000]);
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
    if (hi - lo < step) { hi = lo + step; }
    const yMap = v => map(v, lo, hi, r.y1, r.y0);
    yTicks(r, lo, hi, step, yMap, v => fmtNum(v));
    freqTicks(r);
    withClip(r, () => gridCurve(r, vals, yMap, C_PHASE, 2));
    rotatedLabel(view === 'phase' ? 'Phase (°)' : 'Delay (samples)', 12, (r.y0 + r.y1) / 2);
    if (view === 'phase') titleAndLegend(r, 'Phase response (unwrapped, degrees)', 'Phase (degrees)', []);
    else titleAndLegend(r, 'Group delay (samples; 1 sample = 0.125 ms)', 'Group delay (samples)', []);
  } else {
    const data = view === 'imp' ? R.imp : R.step;
    let lo = 0, hi = 0;
    for (const v of data) { if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
    if (hi - lo < 1e-12) hi = lo + 1;
    const step = niceStep(hi - lo, 4, [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 1000, 1e4, 1e5, 1e6]);
    lo = Math.floor(lo / step - 1e-9) * step; hi = Math.ceil(hi / step - 1e-9) * step;
    const yMap = v => map(v, lo, hi, r.y1, r.y0);
    yTicks(r, lo, hi, step, yMap, v => fmtNum(Number(v.toPrecision(6))));
    const xOf = n => map(n, 0, RESP_LEN, r.x0 + 4, r.x1 - 4);
    for (let n = 0; n <= RESP_LEN; n += 16) {
      noStroke(); fill(60); textSize(L.tick); textAlign(CENTER, TOP);
      text(n, xOf(n), r.y1 + 4);
    }
    if (r.axisTitle) {
      noStroke(); fill(0); textAlign(CENTER, TOP);
      text('Sample n (16 samples = 2 ms)', (r.x0 + r.x1) / 2, r.y1 + 21);
    }
    withClip(r, () => {
      const y0 = yMap(0);
      setStroke(C_OUT, 1.2);
      for (let n = 0; n < data.length; n++) {
        if (!isFinite(data[n])) continue;
        line(xOf(n), y0, xOf(n), yMap(data[n]));
      }
      if ((r.x1 - r.x0) / RESP_LEN > 3.5) {
        noStroke(); setFill(C_OUT);
        for (let n = 0; n < data.length; n++) if (isFinite(data[n])) circle(xOf(n), yMap(data[n]), 4);
      }
    });
    rotatedLabel(view === 'imp' ? 'h[n]' : 's[n]', 12, (r.y0 + r.y1) / 2);
    titleAndLegend(r, view === 'imp' ? 'Impulse response h[n]' : 'Step response s[n]',
                   view === 'imp' ? 'Impulse response' : 'Step response', []);
  }
}

function clusterRoots(roots, tol) {
  const out = [];
  for (const [re, im] of roots) {
    let hit = null;
    for (const c of out) if (Math.hypot(c.re - re, c.im - im) < tol) { hit = c; break; }
    if (hit) hit.n++;
    else out.push({ re: re, im: im, n: 1 });
  }
  return out;
}

function drawPoleZero() {
  const g = L.pz, S = g.S;
  const box = { x0: g.cx - S / 2, y0: g.cy - S / 2, x1: g.cx + S / 2, y1: g.cy + S / 2 };
  fill(255); stroke(192); strokeWeight(1);
  rect(box.x0, box.y0, S, S);
  const sc = (S / 2 - 8) / R.pzRange;
  const px = re => g.cx + re * sc, py = im => g.cy - im * sc;

  stroke(220); strokeWeight(1);
  line(box.x0, g.cy, box.x1, g.cy);
  line(g.cx, box.y0, g.cx, box.y1);
  noFill();
  setStroke(R.unstable ? C_BAD : [120, 120, 120], 1.5);
  circle(g.cx, g.cy, 2 * sc);

  noStroke(); fill(90); textSize(Math.min(L.tick, 13));
  textAlign(LEFT, TOP); text('1', px(1) + 3, g.cy + 2);
  textAlign(LEFT, BOTTOM); text('j', g.cx + 4, py(1) - 1);

  const tol = 0.03 * R.pzRange;
  const zc = clusterRoots(R.zeros, tol), pc = clusterRoots(R.poles, tol);
  withClip(box, () => {
    const m = 5;
    for (const c of zc) {
      noFill(); setStroke(C_ZERO, 2);
      circle(px(c.re), py(c.im), 2 * m);
    }
    for (const c of pc) {
      const bad = !R.isFIR && Math.hypot(c.re, c.im) >= 1 - 1e-9;
      setStroke(bad ? C_BAD : C_POLE, bad ? 2.5 : 2);
      const x = px(c.re), y = py(c.im);
      line(x - m, y - m, x + m, y + m);
      line(x - m, y + m, x + m, y - m);
    }
    noStroke(); textSize(12); textAlign(LEFT, BOTTOM);
    for (const c of zc) if (c.n > 1) { setFill(C_ZERO); text(c.n, px(c.re) + 6, py(c.im) - 4); }
    for (const c of pc) if (c.n > 1) { setFill(C_POLE); text(c.n, px(c.re) + 6, py(c.im) + 16); }
  });
  if (R.outside > 0) {
    noStroke(); fill(90); textSize(12); textAlign(RIGHT, BOTTOM);
    text(R.outside + ' outside view', box.x1 - 3, box.y1 - 2);
  }
  noStroke(); fill(0); textSize(L.plotTitle); textStyle(BOLD); textAlign(CENTER, CENTER);
  text(L.narrow ? 'Poles × zeros o' : 'Pole-zero plot (z-plane)', g.cx, g.titleY);
  textStyle(NORMAL);
}

function infoLines() {
  const p = R.p, lines = [];
  // Stability
  if (R.silent) lines.push({ t: 'All numerator coefficients rounded to 0: no output', c: C_BAD, b: true });
  if (R.isFIR) lines.push({ t: 'STABLE: FIR, all poles at z = 0', c: C_OK, b: true });
  else if (R.maxPole > 1 + 1e-9) lines.push({ t: 'UNSTABLE: a pole is outside the unit circle', c: C_BAD, b: true });
  else if (R.maxPole >= 1 - 1e-9) lines.push({ t: 'UNSTABLE: a pole is on the unit circle', c: C_BAD, b: true });
  else if (R.maxPole >= 0.99) lines.push({ t: 'STABLE, but a pole is close to the unit circle', c: C_TONE, b: true });
  else lines.push({ t: 'STABLE: all poles inside the unit circle', c: C_OK, b: true });
  if (!R.isFIR) lines.push({ t: 'Largest pole radius: ' + R.maxPole.toFixed(4), c: [0, 0, 0] });

  // Structure
  const nb = Math.floor(p.N / 2), odd = p.N % 2 === 1;
  const biq = k => k + (k === 1 ? ' biquad' : ' biquads');
  let s = '';
  const order = (p.type === 'bp' || p.type === 'bs') ? 2 * p.N : (p.type === 'notch' ? 2 : p.N);
  if (p.type === 'comb') s = p.impl === 'fir' ? 'FIR comb: taps at n = 0 and n = ' + p.D : 'Feedback comb: ' + p.D + ' poles';
  else if (R.design.fir) s = (R.design.M + 1) + ' taps (FIR order ' + R.design.M + ')';
  else if (p.impl === 'df' && order > 2) s = 'Order ' + order + ', direct form: one polynomial';
  else if (p.type === 'lp' || p.type === 'hp' || p.type === 'ap')
    s = 'Order ' + p.N + ': ' + (nb ? biq(nb) : '') + (nb && odd ? ' + ' : '') + (odd ? '1 first-order' : '');
  else if (p.type === 'notch') s = 'Order 2: 1 biquad';
  else s = 'Order ' + order + ': ' + biq(p.N);
  lines.push({ t: s, c: [0, 0, 0] });

  // Pass / stop description
  if (R.unstable) {
    lines.push({ t: 'No steady-state response: the output never settles', c: C_BAD });
  } else if (p.type === 'comb') {
    // the read-out uses the (possibly rounded) gain g that the filter really has
    const g = p.impl === 'fir' ? R.secs[0].b[p.D] : -R.secs[0].a[p.D];
    const peakDb = p.impl === 'fir' ? 20 * Math.log10(1 + g) : 0;
    const dipDb = p.impl === 'fir' ? 20 * Math.log10(Math.max(1 - g, 1e-15)) : 20 * Math.log10(Math.max((1 - g) / (1 + g), 1e-15));
    lines.push({ t: 'Peaks every fs/D = ' + fmtHzExact(FS / p.D) + ' Hz (' + fmtDb(peakDb) + ' dB)', c: [0, 0, 0] });
    lines.push({ t: 'Dips at odd multiples of ' + fmtHzExact(FS / (2 * p.D)) + ' Hz (' + (g > 0 ? fmtDb(dipDb) + ' dB' : 'none') + ')', c: [0, 0, 0] });
  } else if (p.type === 'ap') {
    lines.push({ t: '|H| = 1 (0 dB) at every frequency', c: [0, 0, 0] });
    lines.push({ t: 'Phase at f0: ' + fmtDb(R.phaseF0 * 180 / Math.PI, 0) + '°', c: [0, 0, 0] });
    lines.push({ t: 'Group delay at f0: ' + R.gdF0.toFixed(1) + ' samples', c: [0, 0, 0] });
  } else if (!R.silent) {
    const e = R.edges3;
    let t3 = '−3 dB: none';
    if (e.length === 1) t3 = '−3 dB at ' + fmtHz(e[0]) + ' Hz';
    else if (e.length === 2) t3 = '−3 dB at ' + fmtHz(e[0]) + ' and ' + fmtHz(e[1]) + ' Hz';
    else if (e.length > 2) t3 = '−3 dB: ' + e.length + ' crossings';
    lines.push({ t: t3, c: [0, 0, 0] });
    lines.push({ t: 'Passband (≥ −3 dB): ' + fmtBands(R.pass), c: [0, 0, 0] });
    lines.push({ t: 'Stopband (≤ −40 dB): ' + fmtBands(R.stop), c: [0, 0, 0] });
  }
  if (p.bits < BITS_OFF) {
    const st = R.aStep >= 1 ? String(R.aStep) : '1/' + Math.round(1 / R.aStep);
    lines.push({ t: R.isFIR ? 'Coefficients rounded to ' + p.bits + ' bits'
                            : 'Rounded to ' + p.bits + ' bits, a_k step ' + st, c: [90, 90, 90] });
  }
  return lines;
}

function drawInfo() {
  const r = L.info;
  textSize(L.infoSize);
  textAlign(LEFT, TOP);
  noStroke();
  let y = r.y0;
  for (const ln of infoLines()) {
    textStyle(ln.b ? BOLD : NORMAL);
    for (const part of wrapLines(ln.t, r.x1 - r.x0)) {
      if (y + L.lineH > r.y1 + 4) break;
      setFill(ln.c);
      text(part, r.x0, y);
      y += L.lineH;
    }
  }
  textStyle(NORMAL);
}

function drawWaveforms() {
  const r = L.wave;
  plotFrame(r);
  let amax = 0;
  for (const v of R.xs.concat(R.ys)) if (isFinite(v)) amax = Math.max(amax, Math.abs(v));
  const A = R.diverged ? Math.max(3, Math.ceil(amax)) : Math.max(3, Math.ceil(amax));
  const step = niceStep(2 * A, 4, [1, 2, 5, 10, 20, 50, 100, 1000, 1e4, 1e5, 1e6]);
  const top = Math.ceil(A / step) * step;
  const yMap = v => map(v, -top, top, r.y1, r.y0);
  yTicks(r, -top, top, step, yMap, v => fmtNum(v));
  const xOf = n => map(n, 0, SHOW_LEN - 1, r.x0 + 2, r.x1 - 2);
  for (let ms = 0; ms <= 10; ms += 2) {
    const x = xOf(ms * FS / 1000);
    stroke(232); strokeWeight(1); line(x, r.y0, x, r.y1);
    noStroke(); fill(60); textSize(L.tick); textAlign(CENTER, TOP);
    text(ms, Math.min(x, r.x1 - 6), r.y1 + 4);
  }
  if (r.axisTitle) {
    noStroke(); fill(0); textAlign(CENTER, TOP);
    text(R.diverged ? 'Time from the start (ms)' : 'Time (ms), steady state after 2 s', (r.x0 + r.x1) / 2, r.y1 + 21);
  }
  withClip(r, () => {
    noFill();
    setStroke(C_IN, 1.5);
    beginShape();
    R.xs.forEach((v, n) => vertex(xOf(n), yMap(v)));
    endShape();
    setStroke(C_OUT, 2.5);
    beginShape();
    R.ys.forEach((v, n) => vertex(xOf(n), yMap(isFinite(v) ? Math.max(-2 * top, Math.min(2 * top, v)) : 0)));
    endShape();
  });
  rotatedLabel('Amplitude', 12, (r.y0 + r.y1) / 2);
  titleAndLegend(r, 'Test signal: 200 + 1000 + 3000 Hz', L.narrow ? 'Signals' : 'Test signal',
                 [{ label: 'input x[n]', short: 'in', color: C_IN, kind: 'line' },
                  { label: 'output y[n]', short: 'out', color: C_OUT, kind: 'line' }]);
  if (R.diverged) banner(r, 'Output grows without bound');
}

function drawBars() {
  const r = L.bars;
  plotFrame(r);
  const finiteOut = R.toneOut.filter(v => isFinite(v));
  const top = finiteOut.some(v => v > 1.15) ? 2 : 1.2;
  const yMap = v => map(Math.min(v, top), 0, top, r.y1, r.y0);
  yTicks(r, 0, top, top > 1.5 ? 1 : 0.5, yMap, v => v.toFixed(1));
  const gw = (r.x1 - r.x0) / 3;
  const bw = Math.min(26, gw * 0.3);
  TONES.forEach((f, k) => {
    const cx = r.x0 + gw * (k + 0.5);
    noStroke();
    setFill(C_IN);
    rect(cx - bw - 1, yMap(R.toneIn[k]), bw, r.y1 - yMap(R.toneIn[k]));
    const out = R.toneOut[k];
    setFill(isFinite(out) ? C_MAG : C_BAD);
    const yo = isFinite(out) ? yMap(out) : r.y0;
    rect(cx + 1, yo, bw, r.y1 - yo);
    fill(0); textSize(L.tick); textAlign(CENTER, TOP);
    text(f, cx, r.y1 + 4);
    textAlign(CENTER, BOTTOM);
    const lab = isFinite(out) ? out.toFixed(2) : '∞';
    text(lab, Math.min(cx + 1 + bw / 2, r.x1 - 14), Math.max(yo - 2, r.y0 + 16));
  });
  const barItems = [{ label: 'in', color: C_IN, kind: 'box' }, { label: 'out', color: C_MAG, kind: 'box' }];
  if (L.narrow) {
    plotTitle(r, 'Tones');
    legend(barItems, r.x1, r.y1 + 30, false);                    // below the tick labels
  } else {
    titleAndLegend(r, 'Tone amplitudes', 'Tones', barItems);
  }
  if (!L.narrow) {
    noStroke(); fill(0); textSize(L.tick); textAlign(CENTER, TOP);
    text('Frequency (Hz)', (r.x0 + r.x1) / 2, r.y1 + 21);
  }
}

function drawControlLabels() {
  const p = P, u = controlUse(p), n = L.narrow;
  const fir = p.impl === 'fir';
  const fName = (p.type === 'lp' || p.type === 'hp') ? (n ? 'fc ' : 'Cutoff fc: ') : (n ? 'f0 ' : 'Centre f0: ');
  const orderText = (fir && p.type !== 'ap')
    ? (n ? 'M: ' : 'FIR order M: ') + (8 * p.N)
    : (n ? 'N: ' : 'Order N: ') + p.N;
  const bitsText = p.bits >= BITS_OFF ? 'off' : p.bits;
  const texts = [
    fName + p.f0 + ' Hz',
    orderText,
    'Q: ' + p.Q.toFixed(1),
    (n ? 'D: ' : 'Comb delay D: ') + p.D,
    (n ? 'g: ' : 'Comb gain g: ') + p.g.toFixed(2),
    (n ? 'Bits: ' : 'Coeff. bits: ') + bitsText
  ];
  const enabled = [u.freq, u.order, u.q, u.comb, u.comb, true];
  textSize(n ? 13 : defaultTextSize);
  textAlign(LEFT, CENTER);
  noStroke();
  sliderLabels.forEach((s, i) => {
    fill(enabled[i] ? 0 : 165);
    text(texts[i], s.x, s.y);
  });
}

function windowResized() {
  lastFrameKey = '';                                             // resizing clears the canvas
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  layoutControls(false);
}
