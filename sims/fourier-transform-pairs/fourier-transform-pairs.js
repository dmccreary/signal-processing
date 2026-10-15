// Fourier Transform Pairs MicroSim
// CANVAS_HEIGHT: 670
// Five classic continuous-time Fourier transform pairs. The analytic transform X(f) (maroon) is
// drawn over a numerical estimate (green dots) from a 16384-point FFT of the sampled x(t), so the
// two can be compared. The time-scale slider applies x(t/T) <-> T X(fT) (compress in time, expand
// in frequency) and the shift slider applies x(t - t0) <-> e^(-j 2 pi f t0) X(f), a phase ramp.

// Canvas dimensions
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let drawHeight = 558;
let controlHeight = 112;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let sliderLeftMargin = 185;
let defaultTextSize = 16;

// Controls
let pairSelect, phaseCheckbox, scaleSlider, shiftSlider;

// Both axes run from -AX to AX (seconds and hertz), so equal widths look equal in the two domains
const AX = 4.25;
const N_FFT = 16384;
const DT_APERIODIC = 1 / 128;        // 128 s window, FFT bins 1/128 Hz apart
const SAMPLES_PER_PERIOD = 256;      // periodic pairs: exactly 64 periods in the window
const PHASE_FLOOR = 0.02;            // phase is drawn only where |X| > 2% of the peak

// Colors: time signal blue, analytic spectrum maroon, FFT estimate green, widths gold
const COL_X = [25, 90, 200];
const COL_AN = [128, 0, 0];
const COL_FFT = [30, 150, 60];
const COL_HI = [184, 134, 11];
const COL_HI_TEXT = [140, 95, 0];

const PAIRS = {
  rect:  { label: 'Rectangle ↔ sinc',              impulses: false,
           tY: [-0.2, 1.25], tTicks: [0, 0.5, 1], fMax: 2.2, fTicks: [0, 0.5, 1, 1.5, 2] },
  gauss: { label: 'Gaussian ↔ Gaussian',           impulses: false,
           tY: [-0.2, 1.25], tTicks: [0, 0.5, 1], fMax: 2.2, fTicks: [0, 0.5, 1, 1.5, 2] },
  exp:   { label: 'Exponential ↔ Lorentzian',      impulses: false,
           tY: [-0.2, 1.25], tTicks: [0, 0.5, 1], fMax: 2.2, fTicks: [0, 0.5, 1, 1.5, 2] },
  cos:   { label: 'Cosine ↔ two impulses',         impulses: true,
           tY: [-1.25, 1.25], tTicks: [-1, 0, 1], fMax: 0.625, fTicks: [0, 0.25, 0.5] },
  train: { label: 'Impulse train ↔ impulse train', impulses: true,
           tY: [-0.2, 1.25], tTicks: [0, 0.5, 1], fMax: 4.5, fTicks: [0, 1, 2, 3, 4] }
};

// Vertical layout of the drawing region
// (each panel has a legend row 10 px above its frame)
const TITLE_Y = 16, FORMULA_Y = 40;
const P1_TOP = 72, P1_H = 110;
const P2_TOP = 224, P2_H_SHORT = 110, P2_H_TALL = 236;
const P3_TOP = 374, P3_H = 86;
const READ_Y = [496, 518, 540];
let plotL = 48, plotR = 886;

// State (read from the controls every frame)
let pair = 'rect', T = 1, t0 = 0, showPhase = true;
let t0eff = 0;                       // the impulse train's shift, rounded to its sample grid
let stateKey = '';
let num = null;                      // numerical (FFT) results

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  pairSelect = createSelect();
  for (const key of Object.keys(PAIRS)) pairSelect.option(PAIRS[key].label, key);
  pairSelect.selected('rect');
  pairSelect.style('font-size', '15px');

  phaseCheckbox = createCheckbox('Show phase', true);
  phaseCheckbox.style('font-size', '16px');

  scaleSlider = createSlider(0.25, 2, 1, 0.05);
  shiftSlider = createSlider(-2, 2, 0, 0.05);

  layoutControls();
  describe('Three stacked plots for a chosen Fourier transform pair: the time signal x(t) in blue, the magnitude |X(f)| and the phase of X(f). Analytic curves are maroon and green dots are the FFT of the sampled signal. Gold bars mark the width in time and in frequency. A drop-down picks the pair, a slider sets the time scale T, a slider sets the time shift t0, and a checkbox shows or hides the phase plot.');
}

function rowY(i) {
  return drawHeight + 20 + 34 * i;
}

function draw() {
  updateCanvasSize();
  readState();

  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  drawTitleAndFormula();

  const P = PAIRS[pair];
  const p1 = { top: P1_TOP, h: P1_H, lo: P.tY[0], hi: P.tY[1], ticks: P.tTicks, unit: '' };
  const p2 = { top: P2_TOP, h: showPhase ? P2_H_SHORT : P2_H_TALL, lo: -0.2 * P.fMax, hi: P.fMax,
               ticks: P.fTicks, unit: '' };
  const p3 = { top: P3_TOP, h: P3_H, lo: -205, hi: 205, ticks: [-180, -90, 0, 90, 180], unit: '°' };

  drawPanelFrame(p1, 't (s)');
  drawTimeSignal(p1);
  drawTimeWidthBar(p1);
  drawTimeLegend(p1);

  drawPanelFrame(p2, 'f (Hz)');
  drawMagnitude(p2);
  drawFreqWidthBar(p2);
  drawMagnitudeLegend(p2);

  if (showPhase) {
    drawPanelFrame(p3, 'f (Hz)');
    drawPhase(p3);
    drawPhaseLegend(p3);
  }

  drawReadouts();
  drawControlLabels();
}

// ---------------------------------------------------------------- state

function readState() {
  const v = pairSelect.value();
  pair = PAIRS[v] ? v : 'rect';
  T = Math.round(Number(scaleSlider.value()) * 100) / 100;
  t0 = Math.round(Number(shiftSlider.value()) * 100) / 100;
  showPhase = phaseCheckbox.checked();
  const key = pair + '|' + T + '|' + t0;
  if (key !== stateKey) {
    stateKey = key;
    computeNumeric();
  }
}

// ---------------------------------------------------------------- numerics

// In-place radix-2 FFT (decimation in time), X[k] = sum x[n] e^(-j 2 pi k n / N)
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
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const nc = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nc;
      }
    }
  }
}

// Sample x(t) on n*dt for n = -N/2 .. N/2-1 (stored circularly), FFT it, and scale by dt so that
// the bins estimate X(f_k), f_k = k/(N dt). Where x(t) jumps (rectangle, exponential) each sample
// is the exact average of x over its dt-wide cell; an impulse becomes 1/dt in one cell (area 1).
function computeNumeric() {
  const N = N_FFT;
  const periodic = PAIRS[pair].impulses;
  const dt = periodic ? T / SAMPLES_PER_PERIOD : DT_APERIODIC;
  const df = 1 / (N * dt);
  const re = new Float64Array(N), im = new Float64Array(N);
  let shiftSamples = 0;
  t0eff = t0;
  if (pair === 'train') {
    shiftSamples = Math.round(t0 / dt);
    t0eff = shiftSamples * dt;
  }
  let s0 = 0, s1 = 0, s2 = 0;
  for (let n = -N / 2; n < N / 2; n++) {
    const t = n * dt, a = t - dt / 2, b = t + dt / 2;
    let v = 0;
    if (pair === 'rect') {
      const lo = Math.max(a, t0 - T / 2), hi = Math.min(b, t0 + T / 2);
      v = Math.max(0, hi - lo) / dt;
    } else if (pair === 'gauss') {
      v = Math.exp(-Math.PI * (t - t0) * (t - t0) / (T * T));
    } else if (pair === 'exp') {
      if (b > t0) {
        const lo = Math.max(a, t0);
        v = T * (Math.exp(-(lo - t0) / T) - Math.exp(-(b - t0) / T)) / dt;
      }
    } else if (pair === 'cos') {
      v = Math.cos(2 * Math.PI * (t - t0) / T);
    } else {
      const r = ((n - shiftSamples) % SAMPLES_PER_PERIOD + SAMPLES_PER_PERIOD) % SAMPLES_PER_PERIOD;
      v = r === 0 ? 1 / dt : 0;
    }
    re[(n + N) % N] = v;
    const p = v * v;
    s0 += p; s1 += p * t; s2 += p * t * t;
  }

  fftInPlace(re, im);
  // continuous spectra: X(f_k) ~ dt * DFT;  impulse spectra: area of each bin = X(f_k) * df
  const sc = periodic ? dt * df : dt;
  for (let i = 0; i < N; i++) { re[i] *= sc; im[i] *= sc; }

  const binsPerHarm = periodic ? N / SAMPLES_PER_PERIOD : 0;    // 64 bins between harmonics
  const kMax = Math.floor(AX / df);
  const mag = k => Math.hypot(re[(k + N) % N], im[(k + N) % N]);

  // largest complex difference between FFT and analytic values on the plotted range
  let maxErr = 0;
  for (let k = -kMax; k <= kMax; k++) {
    const i = (k + N) % N;
    const an = periodic ? analyticArea(k, binsPerHarm) : analyticX(k * df);
    maxErr = Math.max(maxErr, Math.hypot(re[i] - an[0], im[i] - an[1]));
  }
  const peak = pair === 'cos' ? 0.5 : (pair === 'train' ? 1 / T : T);

  // measured widths
  let nullF = NaN, halfF = NaN, sigT = NaN, sigF = NaN, area = NaN;
  if (pair === 'rect') {
    // first local minimum of |X|, refined by fitting a V (|sinc| crosses zero linearly)
    for (let k = 1; k < N / 2 - 1; k++) {
      const a = mag(k - 1), b = mag(k), c = mag(k + 1);
      if (b < a && b <= c) {
        nullF = (a >= c ? k + b / (a - b) : k - b / (c - b)) * df;
        break;
      }
    }
  } else if (pair === 'exp') {
    // first frequency where |X| drops to |X(0)|/sqrt(2) (half power), linear interpolation
    const m0 = mag(0) / Math.SQRT2;
    for (let k = 1; k < N / 2; k++) {
      const m2 = mag(k);
      if (m2 < m0) {
        const m1 = mag(k - 1);
        halfF = (k - 1 + (m1 - m0) / (m1 - m2)) * df;
        break;
      }
    }
  } else if (pair === 'gauss') {
    // rms widths of |x(t)|^2 and |X(f)|^2
    const mt = s1 / s0;
    sigT = Math.sqrt(Math.max(0, s2 / s0 - mt * mt));
    let f0 = 0, f1 = 0, f2 = 0;
    for (let k = -N / 2; k < N / 2; k++) {
      const p = mag(k) ** 2, f = k * df;
      f0 += p; f1 += p * f; f2 += p * f * f;
    }
    const mf = f1 / f0;
    sigF = Math.sqrt(Math.max(0, f2 / f0 - mf * mf));
  } else if (pair === 'cos') {
    area = mag(binsPerHarm);              // area of the impulse at f = +1/T
  } else {
    area = mag(0);                        // area of the impulse at f = 0
  }

  num = { re, im, N, dt, df, periodic, binsPerHarm, kMax,
          errPct: 100 * maxErr / peak, peak, nullF, halfF, sigT, sigF, area };
}

function sinc(u) {
  return Math.abs(u) < 1e-12 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u);
}

// Analytic X(f) = X_1(fT) T e^(-j 2 pi f t0) for the continuous pairs, as [re, im]
function analyticX(f) {
  let r, i;
  if (pair === 'rect') {
    r = T * sinc(f * T); i = 0;
  } else if (pair === 'gauss') {
    r = T * Math.exp(-Math.PI * f * f * T * T); i = 0;
  } else {
    const w = 2 * Math.PI * f * T, d = 1 + w * w;     // 1/(a + j 2 pi f) with a = 1/T
    r = T / d; i = -T * w / d;
  }
  const c = Math.cos(2 * Math.PI * f * t0), s = -Math.sin(2 * Math.PI * f * t0);
  return [r * c - i * s, r * s + i * c];
}

// Impulses of the periodic pairs that fall on the plot: [{f, re, im}]
function analyticImpulses() {
  const list = [];
  const add = (f, w, sh) => {
    if (Math.abs(f) <= AX + 1e-9) {
      list.push({ f, re: w * Math.cos(2 * Math.PI * f * sh), im: -w * Math.sin(2 * Math.PI * f * sh) });
    }
  };
  if (pair === 'cos') {
    add(-1 / T, 0.5, t0);
    add(1 / T, 0.5, t0);
  } else {
    const jMax = Math.floor(AX * T + 1e-9);
    for (let j = -jMax; j <= jMax; j++) add(j / T, 1 / T, t0eff);
  }
  return list;
}

// Analytic area in FFT bin k for the periodic pairs (harmonic j sits in bin j * binsPerHarm)
function analyticArea(k, binsPerHarm) {
  if (k % binsPerHarm !== 0) return [0, 0];
  const j = k / binsPerHarm, f = j / T;
  let w, sh;
  if (pair === 'cos') {
    if (Math.abs(j) !== 1) return [0, 0];
    w = 0.5; sh = t0;
  } else {
    w = 1 / T; sh = t0eff;
  }
  return [w * Math.cos(2 * Math.PI * f * sh), -w * Math.sin(2 * Math.PI * f * sh)];
}

function binValue(k) {
  const i = (k + num.N) % num.N;
  return [num.re[i], num.im[i]];
}

// phase in degrees, wrapped to (-180, 180]; values within 0.1 degree of -180 are shown as 180
function phaseDeg(r, i) {
  let d = Math.atan2(i, r) * 180 / Math.PI;
  if (d <= -179.9) d = 180;
  return d;
}

function wrapDeg(d) {
  let w = ((d + 180) % 360 + 360) % 360 - 180;
  if (w <= -179.95) w = 180;
  return w;
}

// FFT bin stride so that green dots are at least ~11 px apart and the analytic curve shows between them (power of two for impulse pairs,
// so the impulse bins are always among the dots)
function dotStride() {
  const pxPerBin = num.df * (plotR - plotL) / (2 * AX);
  let s = Math.max(1, Math.ceil(11 / pxPerBin));
  if (num.periodic) {
    let p = 1;
    while (p < s && p < num.binsPerHarm) p *= 2;
    s = p;
  }
  return s;
}

// ---------------------------------------------------------------- coordinates

function xOf(v) { return plotL + (v + AX) / (2 * AX) * (plotR - plotL); }
function vOf(x) { return -AX + (x - plotL) / (plotR - plotL) * 2 * AX; }
function yOf(v, p) { return p.top + p.h - (v - p.lo) / (p.hi - p.lo) * p.h; }

function startPanelClip(p) {
  push();
  drawingContext.beginPath();
  drawingContext.rect(plotL, p.top, plotR - plotL, p.h);
  drawingContext.clip();
}
function stopPanelClip() { pop(); }

// ---------------------------------------------------------------- drawing

function drawTitleAndFormula() {
  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(['Fourier Transform Pairs'], canvasWidth / 2, TITLE_Y, canvasWidth - 20, 20, CENTER);
  textStyle(NORMAL);

  const F = {
    rect: ['x(t) = rect((t − t_0)/T)    ↔    X(f) = T sinc(fT) e^{−j2πft_0}',
           'rect((t − t_0)/T)  ↔  T sinc(fT) e^{−j2πft_0}'],
    gauss: ['x(t) = e^{−π(t − t_0)²/T²}    ↔    X(f) = T e^{−πf²T²} e^{−j2πft_0}',
            'e^{−π(t − t_0)²/T²}  ↔  T e^{−πf²T²} e^{−j2πft_0}'],
    exp: ['x(t) = e^{−a(t − t_0)} u(t − t_0),  a = 1/T    ↔    X(f) = e^{−j2πft_0} / (a + j2πf)',
          'e^{−a(t − t_0)}u(t − t_0)  ↔  e^{−j2πft_0}/(a + j2πf)'],
    cos: ['x(t) = cos(2π(t − t_0)/T)    ↔    X(f) = ½[δ(f − 1/T) + δ(f + 1/T)] e^{−j2πft_0}',
          'cos(2π(t − t_0)/T)  ↔  ½[δ(f − 1/T) + δ(f + 1/T)]e^{−j2πft_0}'],
    train: ['x(t) = Σ_n δ(t − nT − t_0)    ↔    X(f) = (1/T) Σ_k δ(f − k/T) e^{−j2πft_0}',
            'Σ_n δ(t − nT − t_0)  ↔  (1/T) Σ_k δ(f − k/T) e^{−j2πft_0}']
  }[pair];
  fill(40);
  const sz = canvasWidth < 520 ? 14 : 16;
  fitText(F, canvasWidth / 2, FORMULA_Y, canvasWidth - 16, sz, CENTER);
}

function drawPanelFrame(p, axisTitle) {
  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(plotL, p.top, plotR - plotL, p.h);

  const step = (xOf(1) - xOf(0)) >= 30 ? 1 : 2;
  stroke(236);
  for (let v = -4; v <= 4; v++) line(xOf(v), p.top, xOf(v), p.top + p.h);
  for (const v of p.ticks) if (v !== 0) line(plotL, yOf(v, p), plotR, yOf(v, p));
  stroke(170);
  line(xOf(0), p.top, xOf(0), p.top + p.h);
  stroke(90);
  line(plotL, yOf(0, p), plotR, yOf(0, p));

  noStroke();
  fill(80);
  textSize(13);
  textAlign(RIGHT, CENTER);
  for (const v of p.ticks) text(fmtTick(v) + p.unit, plotL - 5, yOf(v, p));

  textSize(14);
  const titleW = advW(axisTitle);
  textAlign(RIGHT, TOP);
  text(axisTitle, plotR, p.top + p.h + 3);
  textAlign(CENTER, TOP);
  for (let v = -4; v <= 4; v += step) {
    const x = xOf(v);
    if (x + advW(fmtTick(v)) / 2 > plotR - titleW - 8) continue;
    text(fmtTick(v), x, p.top + p.h + 3);
  }
}

function drawTimeSignal(p) {
  startPanelClip(p);
  noFill();
  stroke(COL_X[0], COL_X[1], COL_X[2]);
  strokeWeight(2.5);
  if (pair === 'rect') {
    const a = t0 - T / 2, b = t0 + T / 2;
    beginShape();
    vertex(xOf(-AX), yOf(0, p)); vertex(xOf(a), yOf(0, p)); vertex(xOf(a), yOf(1, p));
    vertex(xOf(b), yOf(1, p)); vertex(xOf(b), yOf(0, p)); vertex(xOf(AX), yOf(0, p));
    endShape();
  } else if (pair === 'exp') {
    beginShape();
    vertex(xOf(-AX), yOf(0, p));
    vertex(xOf(t0), yOf(0, p));
    for (let x = Math.ceil(xOf(t0)); x <= plotR; x++) {
      const t = Math.max(t0, vOf(x));
      vertex(x, yOf(Math.exp(-(t - t0) / T), p));
    }
    endShape();
  } else if (pair === 'gauss' || pair === 'cos') {
    beginShape();
    for (let x = plotL; x <= plotR; x++) {
      const t = vOf(x);
      const v = pair === 'gauss' ? Math.exp(-Math.PI * (t - t0) * (t - t0) / (T * T))
                                 : Math.cos(2 * Math.PI * (t - t0) / T);
      vertex(x, yOf(v, p));
    }
    endShape();
  } else {
    const mLo = Math.ceil((-AX - t0eff) / T - 1e-9), mHi = Math.floor((AX - t0eff) / T + 1e-9);
    for (let m = mLo; m <= mHi; m++) {
      drawArrowUp(xOf(t0eff + m * T), yOf(0, p), yOf(1, p), COL_X, 2.5);
    }
  }
  stopPanelClip();

  if (pair === 'train') {
    // label the area of the arrow nearest t = 0
    const m = Math.round(-t0eff / T);
    const x = xOf(t0eff + m * T);
    if (x > plotL && x < plotR - 30 && xOf(T) - xOf(0) >= 32) {
      noStroke();
      fill(COL_X[0], COL_X[1], COL_X[2]);
      textSize(13);
      textAlign(LEFT, CENTER);
      text('(1)', x + 7, yOf(1, p) + 7);
    }
  }
}

function drawMagnitude(p) {
  const s = dotStride();
  if (!num.periodic) {
    // analytic |X(f)|
    startPanelClip(p);
    noFill();
    stroke(COL_AN[0], COL_AN[1], COL_AN[2]);
    strokeWeight(2.5);
    beginShape();
    for (let x = plotL; x <= plotR; x++) {
      const X = analyticX(vOf(x));
      vertex(x, yOf(Math.hypot(X[0], X[1]), p));
    }
    endShape();
    stopPanelClip();
    // FFT estimate
    const kLo = -Math.floor(num.kMax / s) * s;
    for (let k = kLo; k <= num.kMax; k += s) {
      const B = binValue(k);
      fftDot(xOf(k * num.df), yOf(Math.hypot(B[0], B[1]), p));
    }
  } else {
    const imps = analyticImpulses();
    const spacingPx = (xOf(1 / T) - xOf(0));
    for (const im of imps) {
      const w = Math.hypot(im.re, im.im);
      const x = xOf(im.f);
      drawArrowUp(x, yOf(0, p), yOf(w, p), COL_AN, 2.5);
      const labelIt = pair === 'cos' || Math.abs(im.f) < 1e-9 || spacingPx >= 70;
      if (labelIt && x < plotR - 40) {
        noStroke();
        fill(COL_AN[0], COL_AN[1], COL_AN[2]);
        textSize(13);
        textAlign(LEFT, CENTER);
        text('(' + fmt(w) + ')', x + 8, yOf(w, p) + 8);
      }
    }
    const kLo = -Math.floor(num.kMax / s) * s;
    for (let k = kLo; k <= num.kMax; k += s) {
      const B = binValue(k);
      fftDot(xOf(k * num.df), yOf(Math.hypot(B[0], B[1]), p));
    }
  }
}

function drawPhase(p) {
  if (!num.periodic) {
    const floorV = PHASE_FLOOR * T;
    startPanelClip(p);
    noFill();
    stroke(COL_AN[0], COL_AN[1], COL_AN[2]);
    strokeWeight(2.2);
    let open = false, prev = 0;
    for (let x = plotL; x <= plotR; x++) {
      const X = analyticX(vOf(x));
      if (Math.hypot(X[0], X[1]) < floorV) {
        if (open) { endShape(); open = false; }
        continue;
      }
      const d = phaseDeg(X[0], X[1]);
      if (open && Math.abs(d - prev) > 180) { endShape(); open = false; }
      if (!open) { beginShape(); open = true; }
      vertex(x, yOf(d, p));
      prev = d;
    }
    if (open) endShape();
    stopPanelClip();

    const s = dotStride();
    const kLo = -Math.floor(num.kMax / s) * s;
    for (let k = kLo; k <= num.kMax; k += s) {
      const f = k * num.df;
      const X = analyticX(f);
      if (Math.hypot(X[0], X[1]) < floorV) continue;
      const B = binValue(k);
      fftDot(xOf(f), yOf(phaseDeg(B[0], B[1]), p));
    }
  } else {
    for (const im of analyticImpulses()) {
      const x = xOf(im.f);
      const d = phaseDeg(im.re, im.im);
      stroke(COL_AN[0], COL_AN[1], COL_AN[2]);
      strokeWeight(2);
      line(x, yOf(0, p), x, yOf(d, p));
      noFill();
      circle(x, yOf(d, p), 11);
      const k = Math.round(im.f / num.df);
      const B = binValue(k);
      fftDot(x, yOf(phaseDeg(B[0], B[1]), p));
    }
  }
}

function fftDot(x, y) {
  stroke(255);
  strokeWeight(1);
  fill(COL_FFT[0], COL_FFT[1], COL_FFT[2]);
  circle(x, y, 6);
}

function drawArrowUp(x, yBase, yTip, col, w) {
  stroke(col[0], col[1], col[2]);
  strokeWeight(w);
  if (yBase - yTip > 10) line(x, yBase, x, yTip + 8);
  noStroke();
  fill(col[0], col[1], col[2]);
  triangle(x, yTip, x - 5, yTip + 10, x + 5, yTip + 10);
}

// gold double-ended bar from v1 to v2 at height yv, with a short label
function drawWidthBar(p, v1, v2, yv, label, side) {
  const x1 = constrain(xOf(Math.min(v1, v2)), plotL, plotR);
  const x2 = constrain(xOf(Math.max(v1, v2)), plotL, plotR);
  if (x2 - x1 < 1) return;
  const y = yOf(yv, p);
  stroke(COL_HI[0], COL_HI[1], COL_HI[2]);
  strokeWeight(2.5);
  line(x1, y, x2, y);
  strokeWeight(2);
  line(x1, y - 5, x1, y + 5);
  line(x2, y - 5, x2, y + 5);
  noStroke();
  fill(COL_HI_TEXT[0], COL_HI_TEXT[1], COL_HI_TEXT[2]);
  textStyle(BOLD);
  const w = richWidth(label, 14);
  if (!side && x2 - x1 >= w + 6) {
    richText(label, (x1 + x2) / 2, y - 10, 14, CENTER);
  } else if (x2 + 6 + w < plotR) {
    richText(label, x2 + 6, y, 14, LEFT);
  } else {
    richText(label, x1 - 6, y, 14, RIGHT);
  }
  textStyle(NORMAL);
}

function drawTimeWidthBar(p) {
  if (pair === 'rect') drawWidthBar(p, t0 - T / 2, t0 + T / 2, 0.5, 'T');
  else if (pair === 'gauss') {
    const st = T / (2 * Math.sqrt(Math.PI));
    drawWidthBar(p, t0 - st, t0 + st, -0.1, '2σ_t', true);
  } else if (pair === 'exp') drawWidthBar(p, t0, t0 + T, Math.exp(-1), '1/a');
  else if (pair === 'cos') drawWidthBar(p, t0, t0 + T, 0, 'T');
  else drawWidthBar(p, t0eff, t0eff + T, 0.5, 'T');
}

// frequency widths sit in the strip below the zero line, where they never cover the spectrum
function drawFreqWidthBar(p) {
  const y = -0.1 * PAIRS[pair].fMax;
  if (pair === 'rect') drawWidthBar(p, 0, 1 / T, y, '1/T', true);
  else if (pair === 'gauss') {
    const sf = 1 / (2 * Math.sqrt(Math.PI) * T);
    drawWidthBar(p, -sf, sf, y, '2σ_f', true);
  } else if (pair === 'exp') drawWidthBar(p, 0, 1 / (2 * Math.PI * T), y, 'a/2π', true);
  else drawWidthBar(p, 0, 1 / T, y, '1/T', true);
}

function drawTimeLegend(p) {
  const widthName = { rect: 'width T', gauss: '2σ_t (rms width)', exp: 'time constant 1/a = T',
                      cos: 'period T', train: 'spacing T' }[pair];
  const first = pair === 'train'
    ? { kind: 'arrow', col: COL_X, label: 'x(t): arrows of area 1', short: 'x(t)' }
    : { kind: 'line', col: COL_X, label: 'x(t)', short: 'x(t)' };
  const shortName = { rect: 'T', gauss: '2σ_t', exp: '1/a', cos: 'T', train: 'T' }[pair];
  legendRow(p.top, [first, { kind: 'bar', col: COL_HI, label: widthName, short: shortName }]);
}

function drawMagnitudeLegend(p) {
  const widthName = { rect: 'first zero 1/T', gauss: '2σ_f (rms width)', exp: 'half power a/2π',
                      cos: '1/T', train: 'spacing 1/T' }[pair];
  const items = num.periodic
    ? [{ kind: 'arrow', col: COL_AN, label: 'impulse areas (analytic)', short: 'areas' },
       { kind: 'dot', col: COL_FFT, label: 'FFT bin × Δf', short: 'FFT' }]
    : [{ kind: 'line', col: COL_AN, label: '|X(f)| analytic', short: '|X(f)|' },
       { kind: 'dot', col: COL_FFT, label: 'FFT of sampled x(t)', short: 'FFT' }];
  const shortName = { rect: '1/T', gauss: '2σ_f', exp: 'a/2π', cos: '1/T', train: '1/T' }[pair];
  items.push({ kind: 'bar', col: COL_HI, label: widthName, short: shortName });
  legendRow(p.top, items);
}

function drawPhaseLegend(p) {
  const items = [{ kind: 'line', col: COL_AN, label: '∠X(f) analytic', short: '∠X(f)' },
                 { kind: 'dot', col: COL_FFT, label: 'FFT', short: 'FFT' }];
  const w = legendRow(p.top, items);
  if (!num.periodic) {
    noStroke();
    fill(90);
    textSize(13);
    const note = 'drawn where |X| > 2% of X(0)';
    if (plotL + w + 4 + advW(note) < plotR) {
      textAlign(LEFT, CENTER);
      text(note, plotL + w + 4, p.top - 10);
    }
  }
}

// legend inside the top-left corner of a panel; returns its width
function legendRow(top, items) {
  textSize(14);
  const widthOf = list => list.reduce((w, it) => w + 26 + richWidth(it.label, 14) + 14, 0);
  const avail = canvasWidth - 10 - plotL;
  if (widthOf(items) > avail) items = items.map(it => ({ ...it, label: it.short }));
  while (items.length > 1 && widthOf(items) > avail) items = items.slice(0, -1);
  const w = widthOf(items);
  let x = plotL;
  const y = top - 10;
  for (const it of items) {
    const c = it.col;
    stroke(c[0], c[1], c[2]);
    strokeWeight(2.5);
    noFill();
    if (it.kind === 'line') line(x, y, x + 20, y);
    else if (it.kind === 'bar') { line(x, y, x + 20, y); strokeWeight(2); line(x, y - 4, x, y + 4); line(x + 20, y - 4, x + 20, y + 4); }
    else if (it.kind === 'arrow') {
      line(x + 10, y + 7, x + 10, y - 2);
      noStroke(); fill(c[0], c[1], c[2]); triangle(x + 10, y - 8, x + 6, y - 1, x + 14, y - 1);
    } else if (it.kind === 'dot') {
      stroke(255); strokeWeight(1); fill(c[0], c[1], c[2]); circle(x + 10, y, 7);
    }
    noStroke();
    const tc = it.kind === 'bar' ? COL_HI_TEXT : c;
    fill(tc[0], tc[1], tc[2]);
    richText(it.label, x + 26, y, 14, LEFT);
    x += 26 + richWidth(it.label, 14) + 14;
  }
  return w;
}

function drawReadouts() {
  noStroke();
  const W = canvasWidth - 2 * margin;
  const Ts = fmt(T), iT = fmt(1 / T);
  let l1;
  if (pair === 'rect') {
    l1 = ['Width T = ' + Ts + ' s;  first zero of sinc at 1/T = ' + iT + ' Hz (FFT: ' + fmt(num.nullF, 3) + ' Hz);  X(0) = T = ' + Ts,
          'T = ' + Ts + ' s; first zero 1/T = ' + iT + ' Hz (FFT ' + fmt(num.nullF, 3) + ')',
          'first zero at ' + fmt(num.nullF, 3) + ' Hz'];
  } else if (pair === 'gauss') {
    const pr = fmt(num.sigT * num.sigF, 4);
    l1 = ['rms widths σ_t = ' + sig3(num.sigT) + ' s and σ_f = ' + sig3(num.sigF) + ' Hz (measured);  σ_tσ_f = ' + pr + ' = 1/(4π), the smallest possible',
          'σ_t = ' + sig3(num.sigT) + ' s, σ_f = ' + sig3(num.sigF) + ' Hz;  σ_tσ_f = ' + pr + ' = 1/(4π)',
          'σ_tσ_f = ' + pr + ' = 1/(4π)'];
  } else if (pair === 'exp') {
    const hp = sig3(1 / (2 * Math.PI * T)), hm = sig3(num.halfF);
    l1 = ['a = 1/T = ' + iT + ' s⁻¹;  |X| = X(0)/√2 at f = a/(2π) = ' + hp + ' Hz (FFT: ' + hm + ' Hz);  X(0) = 1/a = ' + Ts,
          'a = ' + iT + ' s⁻¹; half power at a/(2π) = ' + hp + ' Hz (FFT ' + hm + ')',
          'half power at ' + hm + ' Hz'];
  } else if (pair === 'cos') {
    l1 = ['Period T = ' + Ts + ' s  ↔  impulses at ±1/T = ±' + iT + ' Hz, each of area ½ (FFT: ' + fmt(num.area, 3) + ')',
          'T = ' + Ts + ' s ↔ impulses at ±' + iT + ' Hz, area ½ (FFT ' + fmt(num.area, 3) + ')',
          'impulses at ±' + iT + ' Hz'];
  } else {
    l1 = ['Spacing T = ' + Ts + ' s  ↔  impulses every 1/T = ' + iT + ' Hz, each of area 1/T = ' + iT + ' (FFT: ' + fmt(num.area, 3) + ')',
          'T = ' + Ts + ' s ↔ every ' + iT + ' Hz, area ' + iT + ' (FFT ' + fmt(num.area, 3) + ')',
          'spacing ' + iT + ' Hz, area ' + iT];
  }
  fill(COL_HI_TEXT[0], COL_HI_TEXT[1], COL_HI_TEXT[2]);
  fitText(l1, margin, READ_Y[0], W, 15, LEFT);

  // shift and phase
  const sh = pair === 'train' ? t0eff : t0;
  let l2;
  if (Math.abs(sh) < 1e-9) {
    l2 = {
      rect: ['t_0 = 0: no phase ramp. x(t) is real and even, so X(f) is real: ∠X = 0° where sinc > 0 and 180° where sinc < 0',
             't_0 = 0: X(f) is real, ∠X = 0° or 180°'],
      gauss: ['t_0 = 0: no phase ramp. x(t) is real and even and X(f) > 0, so ∠X = 0° everywhere',
              't_0 = 0: X(f) > 0, so ∠X = 0°'],
      exp: ['t_0 = 0: no phase ramp, but e^{−at}u(t) is not even, so ∠X = −arctan(2πf/a)',
            't_0 = 0: ∠X = −arctan(2πf/a)'],
      cos: ['t_0 = 0: no phase ramp; both impulses have phase 0°', 't_0 = 0: phases 0°'],
      train: ['t_0 = 0: no phase ramp; every impulse has phase 0°', 't_0 = 0: phases 0°']
    }[pair];
  } else if (num.periodic) {
    const ratio = sh / T;
    const ph1 = wrapDeg(-360 * ratio);
    if (Math.abs(ratio - Math.round(ratio)) < 1e-6) {
      l2 = ['Shift t_0 = ' + fmt(t0) + ' s = ' + Math.round(ratio) + ' × T: every phase is a multiple of 360°, so x(t) and X(f) are unchanged',
            't_0 = ' + Math.round(ratio) + ' × T: nothing changes'];
    } else {
      l2 = ['Shift t_0 = ' + fmt(t0) + ' s: areas unchanged; the phase is −360°·f·t_0, so ∠X(1/T) = ' + fmt(ph1, 0) + '°',
            't_0 = ' + fmt(t0) + ' s: ∠X(1/T) = ' + fmt(ph1, 0) + '°, areas unchanged'];
    }
  } else {
    const slope = fmt(-360 * t0, 0);
    l2 = ['Shift t_0 = ' + fmt(t0) + ' s: |X(f)| is unchanged; the phase gains −360°·f·t_0, a ramp of ' + slope + '° per Hz',
          't_0 = ' + fmt(t0) + ' s: phase ramp ' + slope + '°/Hz, |X| unchanged',
          'ramp ' + slope + '°/Hz'];
  }
  fill(COL_AN[0], COL_AN[1], COL_AN[2]);
  fitText(l2, margin, READ_Y[1], W, 15, LEFT);

  // FFT check
  const e = num.errPct < 0.005 ? 'below 0.01%' : fmt(num.errPct, 2) + '%';
  let l3;
  if (num.periodic) {
    l3 = ['FFT check: N = ' + num.N + ', Δt = T/' + SAMPLES_PER_PERIOD + ' = ' + fmt(num.dt * 1000, 1) + ' ms, 64 whole periods;  bin × Δf gives the areas, largest error ' + e,
          'FFT: N = ' + num.N + ', 64 periods; largest area error ' + e,
          'FFT area error ' + e];
  } else {
    l3 = ['FFT check: N = ' + num.N + ' samples, Δt = ' + fmt(num.dt * 1000, 1) + ' ms, ' + fmt(num.N * num.dt, 0) + ' s window;  largest |X_{FFT} − X| on the plot is ' + e + ' of X(0)',
          'FFT: N = ' + num.N + ', Δt = ' + fmt(num.dt * 1000, 1) + ' ms; largest error ' + e + ' of X(0)',
          'FFT error ' + e];
  }
  fill(COL_FFT[0] - 10, COL_FFT[1] - 30, COL_FFT[2] - 10);
  fitText(l3, margin, READ_Y[2], W, 15, LEFT);
}

function drawControlLabels() {
  noStroke();
  fill('black');
  richText('Time scale T = ' + fmt(T) + ' s', 10, rowY(1), defaultTextSize, LEFT);
  richText('Shift t_0 = ' + fmt(t0) + ' s', 10, rowY(2), defaultTextSize, LEFT);
}

// ---------------------------------------------------------------- text helpers

// Rich text: "t_0" or "X_{FFT}" draw subscripts, "e^{−j2πft_0}" draws a superscript
function parseRich(s) {
  const out = [];
  let buf = '';
  let i = 0;
  const flush = () => { if (buf) { out.push({ t: buf, m: 'n' }); buf = ''; } };
  while (i < s.length) {
    const c = s[i];
    if ((c === '_' || c === '^') && i + 1 < s.length) {
      flush();
      const mode = c === '_' ? 'sub' : 'sup';
      if (s[i + 1] === '{') {
        let j = s.indexOf('}', i + 2);
        if (j < 0) j = s.length;
        const inner = s.slice(i + 2, j);
        if (mode === 'sup') {
          for (const r of parseRich(inner)) out.push({ t: r.t, m: r.m === 'sub' ? 'supsub' : 'sup' });
        } else {
          out.push({ t: inner, m: 'sub' });
        }
        i = j + 1;
      } else {
        out.push({ t: s[i + 1], m: mode });
        i += 2;
      }
    } else {
      buf += c;
      i++;
    }
  }
  flush();
  return out;
}

const RICH = { n: [1, 0], sub: [0.72, 0.3], sup: [0.72, -0.4], supsub: [0.58, -0.2] };

// advance width: in p5 2.x textWidth() measures tight bounds and ignores spaces,
// so runs of text placed side by side must use fontWidth()
function advW(s) {
  return typeof fontWidth === 'function' ? fontWidth(s) : textWidth(s);
}

function richWidth(s, sz) {
  let w = 0;
  for (const p of parseRich(s)) {
    textSize(sz * RICH[p.m][0]);
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
    const r = RICH[p.m];
    textSize(sz * r[0]);
    text(p.t, cx, y + sz * r[1]);
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

// number with a true minus sign and no "-0.00"
function fmt(v, d = 2) {
  const r = Number(v.toFixed(d));
  return (r < 0 ? '−' : '') + Math.abs(r).toFixed(d);
}
// three significant figures
function sig3(v) {
  if (!isFinite(v) || v === 0) return fmt(v, 3);
  const d = Math.max(0, 2 - Math.floor(Math.log10(Math.abs(v))));
  return fmt(v, d);
}
function fmtTick(v) {
  return (v < 0 ? '−' : '') + String(Math.abs(v));
}

// ---------------------------------------------------------------- responsive layout

let layoutWidth = -1;
function layoutControls() {
  if (typeof pairSelect === 'undefined' || canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  pairSelect.position(10, rowY(0) - 12);
  phaseCheckbox.position(10 + pairSelect.elt.offsetWidth + 16, rowY(0) - 11);
  scaleSlider.position(sliderLeftMargin, rowY(1) - 10);
  shiftSlider.position(sliderLeftMargin, rowY(2) - 10);
  const w = canvasWidth - sliderLeftMargin - margin;
  scaleSlider.size(w);
  shiftSlider.size(w);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  plotL = 48;
  plotR = canvasWidth - 14;
  layoutControls();
}
