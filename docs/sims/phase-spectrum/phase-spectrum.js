// Phase Spectrum: What the Magnitude Hides MicroSim
// CANVAS_HEIGHT: 636
// View A: three harmonics (1, 2, 3 Hz) with fixed amplitudes and adjustable phases: the magnitude
//         spectrum never changes, but the waveform does.
// View B: a time shift tau turns the phase spectrum into a line of slope -2*pi*tau
//         (100-point DFT, wrapped or unwrapped).
// View C: the swap experiment with a 256-point DFT: |A| with angle(B) and |B| with angle(A).

// Canvas dimensions
let canvasWidth = 760;               // overwritten from the container in updateCanvasSize()
let drawHeight = 470;
let controlHeight = 166;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let sliderLeftMargin = 170;
let defaultTextSize = 16;

// Controls
let viewRadio;
let phi1Slider, phi2Slider, phi3Slider;
let zeroButton, sawButton, delayButton, randomButton;
let tauSlider, cursorSlider, shiftSelect, unwrapCheckbox, ghostCheckbox;
let sigASelect, sigBSelect, modeSelect, overlayCheckbox;

let view = 'A';
let plotL = 50, plotR = 744;

// Colours
const COL_SIG = [25, 90, 200];       // time-domain signals: blue
const COL_REF = [140, 140, 140];     // reference / ghost: gray
const COL_MAG = [128, 0, 0];         // magnitude: maroon
const COL_PH = [0, 120, 60];         // phase: green
const COL_HI = [184, 134, 11];       // highlight / theory line: dark goldenrod
const COL_MASK = [165, 165, 165];    // undefined phase: light gray

// ---------------------------------------------------------------- View A model
const HARM_AMPS = [1, 1 / 2, 1 / 3]; // amplitudes of the 1, 2 and 3 Hz harmonics (fixed)
const F0 = 1;                        // fundamental frequency (Hz)
const A_T_MAX = 2;                   // time window: two periods
const A_RMS = Math.sqrt(HARM_AMPS.reduce((s, a) => s + a * a / 2, 0));   // 0.825 for every phase
const A_PEAK_MAX = HARM_AMPS.reduce((s, a) => s + a, 0);                 // 1.833 (all peaks aligned)
let aCache = { key: '' };

// ---------------------------------------------------------------- View B model
const NB = 100, FSB = 100, KB = 50;  // 100 samples over 1 s: bins every 1 Hz, 0..50 Hz shown
const GAUSS_SIGMA = 0.015;           // Gaussian pulse width (s)
const RECT_HALF = 5;                 // rectangular pulse: 11 samples, n = -5..5
const MASK_REL = 1e-3;               // phase is undefined where |X| < 0.1% of max |X|
const SHIFT_SIGNALS = {
  gauss: { label: 'Gaussian pulse', phase0: 0 },
  rect:  { label: 'rectangular pulse', phase0: 0 },
  saw:   { label: 'sawtooth', phase0: Math.PI / 2 }
};
let bCache = { key: '' };

// ---------------------------------------------------------------- View C model
const NC = 256, FSC = 256;           // 256-point DFT over 1 s
const SWAP_SIGNALS = {
  rect:  { label: 'rectangular pulse', f: t => (t >= 0.10 && t < 0.25) ? 1 : 0 },
  chirp: { label: 'damped chirp', f: t => {
    if (t < -0.4) return 0;
    const u = t + 0.4;
    return Math.exp(-u / 0.3) * Math.sin(2 * Math.PI * (4 * u + 18 * u * u));
  } },
  saw:   { label: 'sawtooth burst', f: t => (t >= -0.3 && t < 0.1) ? 2 * (((t + 0.3) / 0.2) % 1) - 1 : 0 }
};
const MODES = {
  swap:  'Swap the phases',
  zero:  'Zero phase (|X| only)',
  phase: 'Phase only (|X| = 1)'
};
let cCache = { key: '' };

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  viewRadio = createRadio();
  viewRadio.option('A', 'A: Harmonics');
  viewRadio.option('B', 'B: Time shift');
  viewRadio.option('C', 'C: Swap');
  viewRadio.selected('A');
  viewRadio.style('font-family', 'Arial, Helvetica, sans-serif');
  viewRadio.style('white-space', 'nowrap');
  viewRadio.changed(readView);

  // View A
  phi1Slider = createSlider(-180, 180, -90, 5);
  phi2Slider = createSlider(-180, 180, -90, 5);
  phi3Slider = createSlider(-180, 180, -90, 5);
  zeroButton = createButton('All 0°');
  zeroButton.mousePressed(() => setPhases(0, 0, 0));
  sawButton = createButton('Sawtooth');
  sawButton.mousePressed(() => setPhases(-90, -90, -90));
  delayButton = createButton('Delay');
  delayButton.mousePressed(() => setPhases(-60, -120, -180));
  randomButton = createButton('Random');
  randomButton.mousePressed(() => setPhases(randPhase(), randPhase(), randPhase()));

  // View B
  tauSlider = createSlider(-0.25, 0.25, 0.05, 0.01);
  cursorSlider = createSlider(1, KB, 5, 1);
  shiftSelect = createSelect();
  for (const k of Object.keys(SHIFT_SIGNALS)) shiftSelect.option(SHIFT_SIGNALS[k].label, k);
  shiftSelect.selected('gauss');
  shiftSelect.style('font-size', '15px');
  unwrapCheckbox = createCheckbox('Unwrap phase', false);
  unwrapCheckbox.style('font-size', '16px');
  ghostCheckbox = createCheckbox('Show τ = 0 signal', true);
  ghostCheckbox.style('font-size', '16px');

  // View C
  sigASelect = createSelect();
  sigBSelect = createSelect();
  for (const k of Object.keys(SWAP_SIGNALS)) {
    sigASelect.option(SWAP_SIGNALS[k].label, k);
    sigBSelect.option(SWAP_SIGNALS[k].label, k);
  }
  sigASelect.selected('rect');
  sigBSelect.selected('chirp');
  modeSelect = createSelect();
  for (const k of Object.keys(MODES)) modeSelect.option(MODES[k], k);
  modeSelect.selected('swap');
  for (const s of [sigASelect, sigBSelect, modeSelect]) s.style('font-size', '15px');
  overlayCheckbox = createCheckbox('Overlay the source signal (dashed, scaled)', true);
  overlayCheckbox.style('font-size', '16px');

  layoutControls();
  describe('Phase spectrum explorer with three views chosen by radio buttons. View A: three harmonics with fixed amplitudes and phase sliders; the waveform changes shape while the magnitude bars stay fixed. View B: a pulse or sawtooth is delayed by tau and its phase spectrum becomes a straight line of slope -2 pi tau, shown wrapped or unwrapped. View C: two signals A and B are rebuilt from the magnitude of one and the phase of the other, and each rebuilt signal resembles the signal that supplied its phase.');
}

function draw() {
  updateCanvasSize();
  readView();

  // Drawing region and control region
  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(['Phase Spectrum: What the Magnitude Hides', 'Phase Spectrum'], canvasWidth / 2, 16, canvasWidth - 20, 20, CENTER);
  textStyle(NORMAL);

  if (view === 'A') drawViewA();
  else if (view === 'B') drawViewB();
  else drawViewC();

  drawControlLabels();
}

function readView() {
  const v = viewRadio.value();
  if ((v === 'A' || v === 'B' || v === 'C') && v !== view) {
    view = v;
    layoutControls();
  }
}

// ---------------------------------------------------------------- shared math

const twiddles = {};
function getTwiddle(n) {
  if (!twiddles[n]) {
    const c = new Float64Array(n), s = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      c[i] = Math.cos(2 * Math.PI * i / n);
      s[i] = Math.sin(2 * Math.PI * i / n);
    }
    twiddles[n] = { c, s };
  }
  return twiddles[n];
}

// DFT X[k] = sum_m x[m] e^{-j 2 pi k m / n} for k < kCount; inverse adds +j and divides by n
function dft(re, im, inverse, kCount) {
  const n = re.length;
  const { c, s } = getTwiddle(n);
  const K = kCount || n;
  const R = new Float64Array(K), I = new Float64Array(K);
  const sg = inverse ? 1 : -1;
  for (let k = 0; k < K; k++) {
    let a = 0, b = 0;
    for (let m = 0; m < n; m++) {
      const idx = (k * m) % n;
      const cr = c[idx], ci = sg * s[idx];
      a += re[m] * cr - im[m] * ci;
      b += re[m] * ci + im[m] * cr;
    }
    R[k] = inverse ? a / n : a;
    I[k] = inverse ? b / n : b;
  }
  return { re: R, im: I };
}

// time of DFT index m for an n-point window centred on t = 0 (indices >= n/2 are negative times)
function tOfIndex(m, n, fs) { return (m < n / 2 ? m : m - n) / fs; }
// DFT index of display position d (d = 0 is the left edge, t = -0.5 s)
function idxOfDisplay(d, n) { return (d + n / 2) % n; }

function wrapPi(p) {
  let v = (p + Math.PI) % (2 * Math.PI);
  if (v < 0) v += 2 * Math.PI;
  return v - Math.PI;
}
function wrapDeg(d) {
  let v = (d + 180) % 360;
  if (v < 0) v += 360;
  return v - 180;
}

function pearson(a, b) {
  const n = a.length;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma, y = b[i] - mb;
    sab += x * y; saa += x * x; sbb += y * y;
  }
  return (saa > 0 && sbb > 0) ? sab / Math.sqrt(saa * sbb) : 0;
}

// ---------------------------------------------------------------- View A

function setPhases(a, b, c) {
  phi1Slider.value(a);
  phi2Slider.value(b);
  phi3Slider.value(c);
}

function randPhase() { return 5 * Math.round(random(-36, 36)); }

function phasesA() {
  return [Number(phi1Slider.value()), Number(phi2Slider.value()), Number(phi3Slider.value())];
}

function harmonicSum(t, phDeg) {
  let s = 0;
  for (let k = 0; k < 3; k++) s += HARM_AMPS[k] * Math.cos(2 * Math.PI * (k + 1) * F0 * t + phDeg[k] * Math.PI / 180);
  return s;
}

// peak |x(t)| over one period, and the delay if the phases are linear in frequency (phi_k = k phi_1)
function computeA() {
  const ph = phasesA();
  const key = ph.join('|');
  if (aCache.key === key) return aCache;
  let peak = 0, tPeak = 0;
  const M = 3600;
  for (let i = 0; i < M; i++) {
    const t = i / (M * F0);
    const v = Math.abs(harmonicSum(t, ph));
    if (v > peak + 1e-12) { peak = v; tPeak = t; }
  }
  let delay = null;
  if (Math.abs(wrapDeg(ph[1] - 2 * ph[0])) < 0.5 && Math.abs(wrapDeg(ph[2] - 3 * ph[0])) < 0.5) {
    delay = -ph[0] / (360 * F0);
  }
  aCache = { key, ph, peak, tPeak, delay };
  return aCache;
}

function drawViewA() {
  const S = computeA();
  const ph = S.ph;

  noStroke();
  fill(60);
  fitText(['x(t) = Σ A_k cos(2π k f_0 t + φ_k) with fixed A_k = 1, 1/2, 1/3 and f_0 = 1 Hz',
           'x(t) = Σ A_k cos(2πk t + φ_k), A_k = 1, 1/2, 1/3',
           'x(t) = Σ A_k cos(2πk t + φ_k)'], margin, 40, canvasWidth - 2 * margin, 15, LEFT);

  // ---- time plot
  const T = 74, B = 204, yMax = 2.2;
  const L = plotL, R = plotR;
  const tx = t => map(t, 0, A_T_MAX, L, R);
  const ty = v => map(v, -yMax, yMax, B, T);
  plotFrame(L, T, R, B);
  stroke(236);
  for (let t = 0.5; t < A_T_MAX; t += 0.5) line(tx(t), T, tx(t), B);
  for (const v of [-2, -1, 1, 2]) line(L, ty(v), R, ty(v));
  stroke(110);
  line(L, ty(0), R, ty(0));
  yTickLabels(L, [-2, -1, 0, 1, 2], ty, v => fmtInt(v));
  xTickLabels(L, R, B, 0, A_T_MAX, [0, 0.5, 1, 1.5, 2], v => String(v), 't (s)');

  // reference: the same magnitudes with every phase 0
  noFill();
  stroke(COL_REF[0], COL_REF[1], COL_REF[2]);
  strokeWeight(1.5);
  drawingContext.setLineDash([6, 5]);
  beginShape();
  for (let x = L; x <= R; x += 2) vertex(x, ty(harmonicSum(map(x, L, R, 0, A_T_MAX), [0, 0, 0])));
  endShape();
  drawingContext.setLineDash([]);

  // x(t)
  stroke(COL_SIG[0], COL_SIG[1], COL_SIG[2]);
  strokeWeight(2.5);
  beginShape();
  for (let x = L; x <= R; x += 1) vertex(x, ty(harmonicSum(map(x, L, R, 0, A_T_MAX), ph)));
  endShape();

  // peak marker
  const tp = S.tPeak;
  const vp = harmonicSum(tp, ph);
  noStroke();
  fill(COL_HI[0], COL_HI[1], COL_HI[2]);
  circle(tx(tp), ty(vp), 9);

  // read-out (right) and legend (left) row
  fill(30);
  noStroke();
  const readW = fitText(['peak |x| = ' + S.peak.toFixed(2) + '    RMS = ' + A_RMS.toFixed(3),
                         'peak ' + S.peak.toFixed(2) + ', RMS ' + A_RMS.toFixed(3)], R, 62, (R - L) * 0.5, 15, RIGHT);
  legend(L, 62, [
    { kind: 'line', col: COL_SIG, label: 'x(t)' },
    { kind: 'dash', col: COL_REF, label: 'all φ = 0', short: 'φ = 0' },
    { kind: 'dot', col: COL_HI, label: 'peak' }
  ], false, null, R - readW - 14);

  // ---- magnitude and phase bars
  const gap = 58;
  const colW = (R - L - gap) / 2;
  const mL = L, mR = L + colW, pL = mR + gap, pR = R;
  const bT = 250, bB = 398;
  drawMagnitudeBars(mL, bT, mR, bB);
  drawPhaseBars(pL, bT, pR, bB, ph);

  // ---- note (wraps onto a second line on narrow screens)
  noStroke();
  fill(50);
  let note;
  if (S.delay !== null && Math.abs(S.delay) < 1e-9) {
    note = 'All phases 0°: the three cosines peak together at t = 0, giving the largest possible peak, ' + A_PEAK_MAX.toFixed(2) + '.';
  } else if (S.delay !== null) {
    note = 'φ_k = k·φ_1 is a linear phase: the same shape, delayed by τ = −φ_1/(360°·f_0) = ' + fmt(S.delay, 3) + ' s.';
  } else {
    note = 'Same magnitudes and the same RMS (' + A_RMS.toFixed(3) + '), but the phases change the shape: peak ' +
           S.peak.toFixed(2) + ', not ' + A_PEAK_MAX.toFixed(2) + '.';
  }
  wrapRich(note, margin, 444, canvasWidth - 2 * margin, 15, 18, 2);
}

// word-wrap rich text into at most maxLines lines; y is the vertical centre of the whole block
function wrapRich(s, x, y, maxW, sz, lineH, maxLines) {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const tryLine = cur ? cur + ' ' + w : w;
    if (cur && richWidth(tryLine, sz) > maxW) { lines.push(cur); cur = w; }
    else cur = tryLine;
  }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, maxLines);
  const y0 = y - (shown.length - 1) * lineH / 2;
  shown.forEach((ln, i) => richText(ln, x, y0 + i * lineH, sz, LEFT));
}

function drawMagnitudeBars(L, T, R, B) {
  noStroke();
  fill(COL_MAG[0], COL_MAG[1], COL_MAG[2]);
  textStyle(BOLD);
  fitText(['Magnitude A_k (never changes)', 'Magnitude A_k', '|X|'], L, T - 12, R - L + 40, 15, LEFT);
  textStyle(NORMAL);
  plotFrame(L, T, R, B);
  const vy = v => map(v, 0, 1.2, B, T);
  stroke(236);
  for (const v of [0.5, 1]) line(L, vy(v), R, vy(v));
  yTickLabels(L, [0, 0.5, 1], vy, v => String(v));
  const fx = f => map(f, 0.4, 3.6, L, R);
  const bw = Math.min(34, (R - L) * 0.16);
  for (let k = 0; k < 3; k++) {
    const x = fx(k + 1);
    noStroke();
    fill(COL_MAG[0], COL_MAG[1], COL_MAG[2]);
    rect(x - bw / 2, vy(HARM_AMPS[k]), bw, B - vy(HARM_AMPS[k]));
    fill(30);
    textSize(14);
    textAlign(CENTER, BOTTOM);
    text(HARM_AMPS[k].toFixed(2), x, vy(HARM_AMPS[k]) - 3);
  }
  barFreqLabels(L, R, B, fx);
}

function drawPhaseBars(L, T, R, B, ph) {
  noStroke();
  fill(COL_PH[0], COL_PH[1], COL_PH[2]);
  textStyle(BOLD);
  fitText(['Phase φ_k (degrees)', 'Phase φ_k', '∠X'], L, T - 12, R - L, 15, LEFT);
  textStyle(NORMAL);
  plotFrame(L, T, R, B);
  const vy = v => map(v, -200, 200, B, T);
  stroke(236);
  for (const v of [-180, -90, 90, 180]) line(L, vy(v), R, vy(v));
  stroke(110);
  line(L, vy(0), R, vy(0));
  yTickLabels(L, [-180, -90, 0, 90, 180], vy, v => fmtInt(v) + '°');
  const fx = f => map(f, 0.4, 3.6, L, R);
  const bw = Math.min(34, (R - L) * 0.16);
  for (let k = 0; k < 3; k++) {
    const x = fx(k + 1), y0 = vy(0), y1 = vy(ph[k]);
    noStroke();
    fill(COL_PH[0], COL_PH[1], COL_PH[2]);
    if (Math.abs(ph[k]) < 1e-9) rect(x - bw / 2, y0 - 1.5, bw, 3);
    else rect(x - bw / 2, Math.min(y0, y1), bw, Math.abs(y1 - y0));
    // value label on the other side of the zero line, so it never leaves the plot
    fill(30);
    textSize(14);
    if (ph[k] < 0) { textAlign(CENTER, BOTTOM); text(fmtInt(ph[k]) + '°', x, y0 - 3); }
    else { textAlign(CENTER, TOP); text(fmtInt(ph[k]) + '°', x, y0 + 4); }
  }
  barFreqLabels(L, R, B, fx);
}

function barFreqLabels(L, R, B, fx) {
  noStroke();
  fill(70);
  textSize(14);
  textAlign(CENTER, TOP);
  for (let k = 1; k <= 3; k++) text(k * F0 + ' Hz', fx(k), B + 3);
}

// ---------------------------------------------------------------- View B

function shiftBaseSample(kind, m) {
  const n = m < NB / 2 ? m : m - NB;         // signed sample index, t = n / FSB
  const t = n / FSB;
  if (kind === 'gauss') return Math.exp(-t * t / (2 * GAUSS_SIGMA * GAUSS_SIGMA));
  if (kind === 'rect') return Math.abs(n) <= RECT_HALF ? 1 : 0;
  // sawtooth: one period per window, ramps up, jumps from +1 to -1 at t = 0 (x = 0 at the jump)
  if (n === 0) return 0;
  return n > 0 ? 2 * n / NB - 1 : 2 * n / NB + 1;
}

function readB() {
  const kind = SHIFT_SIGNALS[shiftSelect.value()] ? shiftSelect.value() : 'gauss';
  const shift = Math.round(Number(tauSlider.value()) * FSB);    // whole samples
  return { kind, shift, tau: shift / FSB, unwrap: unwrapCheckbox.checked(), ghost: ghostCheckbox.checked(),
           fc: Math.round(Number(cursorSlider.value())) };
}

function computeB(kind, shift) {
  const key = kind + '|' + shift;
  if (bCache.key === key) return bCache;
  const x0 = new Float64Array(NB), x = new Float64Array(NB);
  for (let m = 0; m < NB; m++) x0[m] = shiftBaseSample(kind, m);
  for (let m = 0; m < NB; m++) x[m] = x0[((m - shift) % NB + NB) % NB];   // circular delay by shift samples
  const X = dft(x, new Float64Array(NB), false, KB + 1);
  const mag = [], wrapped = [], masked = [];
  let maxMag = 0;
  for (let k = 0; k <= KB; k++) { mag[k] = Math.hypot(X.re[k], X.im[k]); maxMag = Math.max(maxMag, mag[k]); }
  for (let k = 0; k <= KB; k++) {
    masked[k] = mag[k] < MASK_REL * maxMag;
    wrapped[k] = Math.atan2(X.im[k], X.re[k]);
  }
  // unwrap across the defined bins: add multiples of 2 pi so neighbours differ by at most pi
  const unwrapped = [];
  let prev = null, first = -1;
  for (let k = 0; k <= KB; k++) {
    if (masked[k]) { unwrapped[k] = NaN; continue; }
    let v = wrapped[k];
    if (prev === null) first = k;
    else {
      while (v - prev > Math.PI) v -= 2 * Math.PI;
      while (v - prev < -Math.PI) v += 2 * Math.PI;
    }
    unwrapped[k] = v;
    prev = v;
  }
  // the theory line phi(0) - 2 pi f tau, on the same 2 pi branch as the unwrapped data
  const tau = shift / FSB;
  const c0 = SHIFT_SIGNALS[kind].phase0;
  let c = c0;
  if (first >= 0) c = c0 + 2 * Math.PI * Math.round((unwrapped[first] - (c0 - 2 * Math.PI * first * tau)) / (2 * Math.PI));
  bCache = { key, x0, x, mag, maxMag, wrapped, unwrapped, masked, c, tau };
  return bCache;
}

function drawViewB() {
  const st = readB();
  const S = computeB(st.kind, st.shift);
  const tau = st.tau;

  // formula / slope line
  noStroke();
  fill(60);
  const slope = -2 * Math.PI * tau;
  if (Math.abs(tau) < 1e-9) {
    fitText(['x(t − τ) ↔ X(f)·e^(−j2πfτ). With τ = 0 there is no linear phase term (slope 0).',
             'τ = 0: no linear phase term (slope 0)'], margin, 40, canvasWidth - 2 * margin, 15, LEFT);
  } else {
    const per = (1 / Math.abs(tau)).toFixed(1);
    fitText(['x(t − τ) ↔ X(f)·e^(−j2πfτ): slope −2πτ = ' + fmt(slope, 3) + ' rad/Hz (' + fmt(-360 * tau, 1) + '°/Hz), wraps every ' + per + ' Hz',
             'slope −2πτ = ' + fmt(slope, 3) + ' rad/Hz, wraps every ' + per + ' Hz',
             'slope ' + fmt(slope, 3) + ' rad/Hz'], margin, 40, canvasWidth - 2 * margin, 15, LEFT);
  }

  const L = plotL, R = plotR;

  // ---- time plot
  const T = 70, B = 150, yMax = 1.3;
  const tx = t => map(t, -0.5, 0.5, L, R);
  const ty = v => map(v, -yMax, yMax, B, T);
  plotFrame(L, T, R, B);
  stroke(236);
  for (const t of [-0.25, 0.25]) line(tx(t), T, tx(t), B);
  for (const v of [-1, 1]) line(L, ty(v), R, ty(v));
  stroke(170);
  line(tx(0), T, tx(0), B);
  stroke(110);
  line(L, ty(0), R, ty(0));
  yTickLabels(L, [-1, 0, 1], ty, v => fmtInt(v));
  xTickLabels(L, R, B, -0.5, 0.5, [-0.5, -0.25, 0, 0.25, 0.5], v => fmt(v, v === 0 ? 0 : 2), 't (s)');

  if (st.ghost) {
    noFill();
    stroke(COL_REF[0], COL_REF[1], COL_REF[2]);
    strokeWeight(1.5);
    drawingContext.setLineDash([6, 5]);
    beginShape();
    for (let d = 0; d < NB; d++) vertex(tx((d - NB / 2) / FSB), ty(S.x0[idxOfDisplay(d, NB)]));
    endShape();
    drawingContext.setLineDash([]);
  }
  noFill();
  stroke(COL_SIG[0], COL_SIG[1], COL_SIG[2]);
  strokeWeight(2);
  beginShape();
  for (let d = 0; d < NB; d++) vertex(tx((d - NB / 2) / FSB), ty(S.x[idxOfDisplay(d, NB)]));
  endShape();
  noStroke();
  fill(COL_SIG[0], COL_SIG[1], COL_SIG[2]);
  for (let d = 0; d < NB; d++) circle(tx((d - NB / 2) / FSB), ty(S.x[idxOfDisplay(d, NB)]), 4);

  // delay arrow from t = 0 to t = tau
  if (Math.abs(tau) > 1e-9) {
    const y = ty(1.16), x0 = tx(0), x1 = tx(tau), dir = tau > 0 ? 1 : -1;
    stroke(COL_HI[0], COL_HI[1], COL_HI[2]);
    strokeWeight(2);
    line(x0, y, x1 - 6 * dir, y);
    noStroke();
    fill(COL_HI[0], COL_HI[1], COL_HI[2]);
    triangle(x1, y, x1 - 8 * dir, y - 5, x1 - 8 * dir, y + 5);
    textSize(14);
    textAlign(dir > 0 ? LEFT : RIGHT, CENTER);
    text('τ', x1 + 5 * dir, y);
  }

  noStroke();
  fill(30);
  const rw = fitText([SHIFT_SIGNALS[st.kind].label + ', τ = ' + fmt(tau, 2) + ' s', ''], R, 60, (R - L) * 0.4, 15, RIGHT);
  legend(L, 60, [
    { kind: 'line', col: COL_SIG, label: 'x(t − τ), 100 samples', short: 'x(t − τ)' },
    ...(st.ghost ? [{ kind: 'dash', col: COL_REF, label: 'x(t), τ = 0', short: 'τ = 0' }] : [])
  ], false, null, R - rw - 14);

  // ---- magnitude plot
  const fx = f => map(f, -0.5, KB + 0.5, L, R);
  const mT = 196, mB = 256;
  const my = v => map(v, 0, 1.1, mB, mT);
  noStroke();
  fill(COL_MAG[0], COL_MAG[1], COL_MAG[2]);
  textStyle(BOLD);
  const mTitleW = fitText(['|X(f)|, normalised: unchanged by τ', '|X(f)| unchanged by τ', '|X(f)|'], L, 184, (R - L) * 0.55, 15, LEFT);
  textStyle(NORMAL);
  const fc = st.fc;
  const vals = st.unwrap ? S.unwrapped : S.wrapped;
  fill(30);
  const magC = S.mag[fc] / S.maxMag;
  const phC = S.masked[fc] ? null : vals[fc];
  const magS = '|X| = ' + magC.toFixed(3);
  const phS = phC === null ? '∠X undefined' : '∠X = ' + fmt(phC, 3) + ' rad = ' + fmt(phC * 180 / Math.PI, 1) + '°';
  const phD = phC === null ? '∠X undefined' : '∠X = ' + fmt(phC * 180 / Math.PI, 1) + '°';
  fitText(['at f = ' + fc + ' Hz:  ' + magS + ',  ' + phS,
           fc + ' Hz: ' + magS + ', ' + phD,
           fc + ' Hz: ' + phD,
           phD], R, 184, R - L - mTitleW - 12, 15, RIGHT);
  plotFrame(L, mT, R, mB);
  stroke(236);
  for (const f of [10, 20, 30, 40]) line(fx(f), mT, fx(f), mB);
  yTickLabels(L, [0, 1], my, v => String(v));
  cursorLine(fx(fc), mT, mB);
  strokeWeight(2);
  for (let k = 0; k <= KB; k++) {
    const v = S.mag[k] / S.maxMag;
    const c = S.masked[k] ? COL_MASK : COL_MAG;
    stroke(c[0], c[1], c[2]);
    line(fx(k), mB, fx(k), my(v));
  }
  xTickLabels(L, R, mB, -0.5, KB + 0.5, [0, 10, 20, 30, 40, 50], v => String(v), 'f (Hz)');

  // ---- phase plot
  const pT = 302, pB = 436;
  let lo, hi;
  const lineAt = f => S.c - 2 * Math.PI * f * tau;
  if (st.unwrap) {
    lo = Math.min(lineAt(0), lineAt(KB));
    hi = Math.max(lineAt(0), lineAt(KB));
    for (let k = 0; k <= KB; k++) if (!S.masked[k]) { lo = Math.min(lo, vals[k]); hi = Math.max(hi, vals[k]); }
    const mid = (lo + hi) / 2;
    const half = Math.max(Math.PI, (hi - lo) / 2) * 1.12;
    lo = mid - half; hi = mid + half;
  } else {
    lo = -Math.PI * 1.12; hi = Math.PI * 1.12;
  }
  const py = v => map(v, lo, hi, pB, pT);
  // title (left) and legend (right) share the row; the legend gets the room it needs first
  const items = [
    { kind: 'dot', col: COL_PH, label: '∠X[k]' },
    { kind: 'dash', col: COL_HI, label: 'line of slope −2πτ', short: '−2πτ' },
    { kind: 'cross', col: COL_MASK, label: 'undefined (|X| ≈ 0)', short: '|X| ≈ 0' }
  ];
  const titleC = [st.unwrap ? '∠X(f) unwrapped (rad)' : '∠X(f) wrapped to (−π, π] (rad)', '∠X(f) (rad)', '∠X (rad)'];
  textStyle(BOLD);
  const minTitleW = richWidth(titleC[2], 15);
  textStyle(NORMAL);
  const lg = legendFit(items, R - L - minTitleW - 16);
  noStroke();
  fill(COL_PH[0], COL_PH[1], COL_PH[2]);
  textStyle(BOLD);
  fitText(titleC, L, 290, R - L - lg.w - 16, 15, LEFT);
  textStyle(NORMAL);
  legend(R - lg.w, 290, lg.items, false, null, R + 1);
  plotFrame(L, pT, R, pB);
  const ticks = piTicks(lo, hi, st.unwrap);
  stroke(236);
  for (const f of [10, 20, 30, 40]) line(fx(f), pT, fx(f), pB);
  for (const m of ticks) if (m !== 0) line(L, py(m * Math.PI), R, py(m * Math.PI));
  stroke(110);
  if (lo < 0 && hi > 0) line(L, py(0), R, py(0));
  yTickLabels(L, ticks.map(m => m * Math.PI), py, v => piLabel(Math.round(v / Math.PI * 2) / 2));
  cursorLine(fx(fc), pT, pB);

  // theory line phi(0) - 2 pi f tau
  push();
  drawingContext.beginPath();
  drawingContext.rect(L, pT, R - L, pB - pT);
  drawingContext.clip();
  noFill();
  stroke(COL_HI[0], COL_HI[1], COL_HI[2]);
  strokeWeight(2);
  drawingContext.setLineDash([7, 5]);
  if (st.unwrap) {
    line(fx(0), py(lineAt(0)), fx(KB), py(lineAt(KB)));
  } else {
    let prevV = null;
    beginShape();
    for (let f = 0; f <= KB + 1e-9; f += 0.05) {
      const v = wrapPi(lineAt(f));
      if (prevV !== null && Math.abs(v - prevV) > Math.PI) { endShape(); beginShape(); }
      vertex(fx(f), py(v));
      prevV = v;
    }
    endShape();
  }
  drawingContext.setLineDash([]);
  pop();

  // phase samples
  for (let k = 0; k <= KB; k++) {
    if (S.masked[k]) {
      stroke(COL_MASK[0], COL_MASK[1], COL_MASK[2]);
      strokeWeight(2);
      const x = fx(k), y = pB - 7;
      line(x - 4, y - 4, x + 4, y + 4);
      line(x - 4, y + 4, x + 4, y - 4);
      continue;
    }
    noStroke();
    fill(COL_PH[0], COL_PH[1], COL_PH[2]);
    circle(fx(k), py(vals[k]), 7);
  }
  if (!S.masked[fc]) {
    noFill();
    stroke(COL_HI[0], COL_HI[1], COL_HI[2]);
    strokeWeight(2);
    circle(fx(fc), py(vals[fc]), 14);
  }
  xTickLabels(L, R, pB, -0.5, KB + 0.5, [0, 10, 20, 30, 40, 50], v => String(v), 'f (Hz)');
}

function cursorLine(x, T, B) {
  stroke(COL_HI[0], COL_HI[1], COL_HI[2], 150);
  strokeWeight(1.5);
  line(x, T, x, B);
}

// tick positions (in multiples of pi) for the phase axis
function piTicks(lo, hi, unwrapped) {
  if (!unwrapped) return [-1, -0.5, 0, 0.5, 1];
  const a = lo / Math.PI, b = hi / Math.PI;
  let step = 1;
  for (const s of [1, 2, 4, 5, 10, 20, 25, 50]) { step = s; if ((b - a) / s <= 6) break; }
  const out = [];
  for (let m = Math.ceil(a / step) * step; m <= b + 1e-9; m += step) out.push(m);
  return out;
}

function piLabel(m) {
  if (Math.abs(m) < 1e-9) return '0';
  const sign = m < 0 ? '−' : '';
  const a = Math.abs(m);
  if (Math.abs(a - 0.5) < 1e-9) return sign + 'π/2';
  if (Math.abs(a - 1) < 1e-9) return sign + 'π';
  return sign + a + 'π';
}

// ---------------------------------------------------------------- View C

function readC() {
  const a = SWAP_SIGNALS[sigASelect.value()] ? sigASelect.value() : 'rect';
  const b = SWAP_SIGNALS[sigBSelect.value()] ? sigBSelect.value() : 'chirp';
  const mode = MODES[modeSelect.value()] ? modeSelect.value() : 'swap';
  return { a, b, mode, overlay: overlayCheckbox.checked() };
}

function sampleSwapSignal(key) {
  const x = new Float64Array(NC);
  for (let m = 0; m < NC; m++) x[m] = SWAP_SIGNALS[key].f(tOfIndex(m, NC, FSC));
  return x;
}

function spectrumC(x) {
  const X = dft(x, new Float64Array(NC), false);
  const mag = new Float64Array(NC), ph = new Float64Array(NC);
  let mx = 0;
  for (let k = 0; k < NC; k++) { mag[k] = Math.hypot(X.re[k], X.im[k]); mx = Math.max(mx, mag[k]); }
  for (let k = 0; k < NC; k++) ph[k] = mag[k] < MASK_REL * mx ? 0 : Math.atan2(X.im[k], X.re[k]);
  return { mag, ph };
}

function rebuild(mag, ph) {
  const re = new Float64Array(NC), im = new Float64Array(NC);
  for (let k = 0; k < NC; k++) {
    const m = mag === 1 ? 1 : mag[k];
    const p = ph === 0 ? 0 : ph[k];
    re[k] = m * Math.cos(p);
    im[k] = m * Math.sin(p);
  }
  return dft(re, im, true).re;
}

function peakTime(x) {
  let best = 0;
  for (let m = 0; m < NC; m++) if (Math.abs(x[m]) > Math.abs(x[best]) + 1e-12) best = m;
  return tOfIndex(best, NC, FSC);
}

function computeC(a, b, mode) {
  const key = a + '|' + b + '|' + mode;
  if (cCache.key === key) return cCache;
  const xa = sampleSwapSignal(a), xb = sampleSwapSignal(b);
  const SA = spectrumC(xa), SB = spectrumC(xb);
  let r3, r4, lab3, lab4, src3, src4;
  const nA = SWAP_SIGNALS[a].label, nB = SWAP_SIGNALS[b].label;
  if (mode === 'zero') {
    r3 = rebuild(SA.mag, 0); r4 = rebuild(SB.mag, 0);
    lab3 = ['|A| with zero phase', '|A|, zero phase']; lab4 = ['|B| with zero phase', '|B|, zero phase'];
    src3 = 'A'; src4 = 'B';
  } else if (mode === 'phase') {
    r3 = rebuild(1, SA.ph); r4 = rebuild(1, SB.ph);
    lab3 = ['∠A with flat magnitude |X| = 1', '∠A with |X| = 1', '∠A only']; lab4 = ['∠B with flat magnitude |X| = 1', '∠B with |X| = 1', '∠B only'];
    src3 = 'A'; src4 = 'B';
  } else {
    r3 = rebuild(SA.mag, SB.ph); r4 = rebuild(SB.mag, SA.ph);
    lab3 = ['|A| with ∠B  (magnitude of A, phase of B)', '|A| with ∠B']; lab4 = ['|B| with ∠A  (magnitude of B, phase of A)', '|B| with ∠A'];
    src3 = 'B'; src4 = 'A';
  }
  cCache = {
    key, xa, xb, r3, r4, lab3, lab4, src3, src4, nA, nB,
    c3: [pearson(r3, xa), pearson(r3, xb)], c4: [pearson(r4, xa), pearson(r4, xb)],
    t3: peakTime(r3), t4: peakTime(r4)
  };
  return cCache;
}

function drawViewC() {
  const st = readC();
  const S = computeC(st.a, st.b, st.mode);

  noStroke();
  fill(60);
  let sub;
  if (st.mode === 'zero') sub = ['Zero phase: keep each |X[k]|, set every phase to 0 (256-point DFT). The result is symmetric about t = 0.',
                                 'Zero phase: keep |X|, set every phase to 0', 'Keep |X|, phase = 0'];
  else if (st.mode === 'phase') sub = ['Phase only: keep each ∠X[k], set every |X[k]| to 1 (256-point DFT). The timing survives.',
                                       'Phase only: keep ∠X, set every |X| to 1', 'Keep ∠X, |X| = 1'];
  else sub = ['Swap: magnitude from one signal, phase from the other (256-point DFT). Which does each result resemble?',
              'Swap: magnitude of one, phase of the other', 'Swap |X| and ∠X'];
  fitText(sub, margin, 40, canvasWidth - 2 * margin, 15, LEFT);

  const rows = [
    { x: S.xa, label: ['A: ' + S.nA, 'A'], src: null },
    { x: S.xb, label: ['B: ' + S.nB, 'B'], src: null },
    { x: S.r3, label: S.lab3, src: S.src3, corr: S.c3, tPk: S.t3 },
    { x: S.r4, label: S.lab4, src: S.src4, corr: S.c4, tPk: S.t4 }
  ];
  const L = plotL, R = plotR;
  const tx = t => map(t, -0.5, 0.5, L, R);
  rows.forEach((row, i) => {
    const labY = 60 + 98 * i, T = 69 + 98 * i, B = T + 68;
    let peak = 0;
    for (let m = 0; m < NC; m++) peak = Math.max(peak, Math.abs(row.x[m]));
    peak = Math.max(peak, 1e-9);
    const yMax = peak * 1.15;
    const ty = v => map(v, -yMax, yMax, B, T);
    plotFrame(L, T, R, B);
    stroke(236);
    for (const t of [-0.25, 0.25]) line(tx(t), T, tx(t), B);
    line(L, ty(peak), R, ty(peak));
    line(L, ty(-peak), R, ty(-peak));
    stroke(170);
    line(tx(0), T, tx(0), B);
    stroke(110);
    line(L, ty(0), R, ty(0));
    yTickLabels(L, [-peak, 0, peak], ty, v => Math.abs(v) < 1e-12 ? '0' : fmt(v, 2));

    // overlay of the source signal, scaled to the same peak
    if (row.src && st.overlay) {
      const srcX = row.src === 'A' ? S.xa : S.xb;
      let sp = 0;
      for (let m = 0; m < NC; m++) sp = Math.max(sp, Math.abs(srcX[m]));
      const g = sp > 0 ? peak / sp : 0;
      noFill();
      stroke(COL_HI[0], COL_HI[1], COL_HI[2]);
      strokeWeight(1.8);
      drawingContext.setLineDash([6, 4]);
      beginShape();
      for (let d = 0; d < NC; d++) vertex(tx((d - NC / 2) / FSC), ty(g * srcX[idxOfDisplay(d, NC)]));
      endShape();
      drawingContext.setLineDash([]);
    }
    noFill();
    stroke(COL_SIG[0], COL_SIG[1], COL_SIG[2]);
    strokeWeight(2);
    beginShape();
    for (let d = 0; d < NC; d++) vertex(tx((d - NC / 2) / FSC), ty(row.x[idxOfDisplay(d, NC)]));
    endShape();

    // label row
    noStroke();
    fill(i < 2 ? COL_SIG : [30, 30, 30]);
    textStyle(BOLD);
    const labs = row.src && st.overlay
      ? [row.label[0] + '   (dashed: ' + row.src + ')', ...row.label]
      : row.label;
    const lw = fitText(labs, L, labY, (R - L) * 0.62, 15, LEFT);
    textStyle(NORMAL);
    if (row.corr) {
      const [ra, rb] = row.corr;
      const s = 'r_A = ' + fmt(ra, 2) + '   r_B = ' + fmt(rb, 2);
      const cands = st.mode === 'zero'
        ? ['peak at t = ' + fmt(row.tPk, 3) + ' s   ' + s, s, 'r_A ' + fmt(ra, 2) + ' r_B ' + fmt(rb, 2)]
        : ['similarity:  ' + s, s, 'r_A ' + fmt(ra, 2) + ' r_B ' + fmt(rb, 2)];
      fill(30);
      fitText(cands, R, labY, R - L - lw - 12, 15, RIGHT);
    }
    if (i === 3) xTickLabels(L, R, B, -0.5, 0.5, [-0.5, -0.25, 0, 0.25, 0.5], v => fmt(v, v === 0 ? 0 : 2), 't (s)');
  });
}

// ---------------------------------------------------------------- plot helpers

function plotFrame(L, T, R, B) {
  fill(255);
  stroke(205);
  strokeWeight(1);
  rect(L, T, R - L, B - T);
}

function yTickLabels(L, vals, toY, fmtFn) {
  noStroke();
  fill(80);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (const v of vals) text(fmtFn(v), L - 6, toY(v));
}

function xTickLabels(L, R, B, vmin, vmax, vals, fmtFn, axisTitle) {
  noStroke();
  fill(80);
  textSize(14);
  const titleW = advW(axisTitle);
  textAlign(RIGHT, TOP);
  text(axisTitle, R, B + 3);
  textAlign(CENTER, TOP);
  for (const v of vals) {
    const x = map(v, vmin, vmax, L, R);
    const s = fmtFn(v);
    if (x + advW(s) / 2 > R - titleW - 8) continue;
    text(s, x, B + 3);
  }
}

// legend items drawn left to right from x (or right-aligned at rightEdge); y is the row centre.
// Labels shorten to their first word when the row is too narrow. Returns the width used.
// Labels switch to their short form, then trailing items are dropped, until the legend fits.
function legendFit(items, maxW) {
  textSize(14);
  const widthOf = list => list.reduce((w, it) => w + 24 + advW(it.label) + 12, 4) - 12;
  if (widthOf(items) <= maxW) return { items, w: widthOf(items) };
  let list = items.map(it => ({ ...it, label: it.short || it.label.split(/[ ,]/)[0] }));
  while (list.length > 1 && widthOf(list) > maxW) list = list.slice(0, -1);
  return { items: list, w: widthOf(list) };
}

function legend(x, y, items, withBox, rightEdge, maxRight) {
  textSize(14);
  const limit = maxRight || rightEdge || plotR - 4;
  const fitted = legendFit(items, limit - x);
  items = fitted.items;
  const w = fitted.w;
  if (rightEdge) x = Math.max(x, rightEdge - w);
  if (withBox) {
    noStroke();
    fill(255, 255, 255, 220);
    rect(x - 2, y - 10, w, 20);
  }
  let cx = x + 2;
  for (const it of items) {
    const c = it.col;
    stroke(c[0], c[1], c[2]);
    strokeWeight(2.5);
    noFill();
    if (it.kind === 'line') line(cx, y, cx + 18, y);
    else if (it.kind === 'dash') { line(cx, y, cx + 6, y); line(cx + 11, y, cx + 18, y); }
    else if (it.kind === 'cross') { strokeWeight(2); line(cx + 5, y - 4, cx + 13, y + 4); line(cx + 5, y + 4, cx + 13, y - 4); }
    else if (it.kind === 'dot') { noStroke(); fill(c[0], c[1], c[2]); circle(cx + 9, y, 8); }
    noStroke();
    fill(c[0], c[1], c[2]);
    textAlign(LEFT, CENTER);
    text(it.label, cx + 24, y);
    cx += 24 + advW(it.label) + 12;
  }
  return w;
}

// ---------------------------------------------------------------- controls

function rowY(i) { return drawHeight + 18 + 32 * i; }

function drawControlLabels() {
  noStroke();
  fill('black');
  if (canvasWidth >= 480) richText('View:', 10, rowY(0), defaultTextSize, LEFT);
  if (view === 'A') {
    const ph = phasesA();
    for (let k = 0; k < 3; k++) richText('φ_' + (k + 1) + ' (' + (k + 1) + ' Hz) = ' + fmtInt(ph[k]) + '°', 10, rowY(k + 1), defaultTextSize, LEFT);
    if (canvasWidth >= 480) richText('Presets:', 10, rowY(4), defaultTextSize, LEFT);
  } else if (view === 'B') {
    const st = readB();
    richText('Delay τ = ' + fmt(st.tau, 2) + ' s', 10, rowY(1), defaultTextSize, LEFT);
    richText('Cursor f = ' + st.fc + ' Hz', 10, rowY(2), defaultTextSize, LEFT);
    richText('Signal:', 10, rowY(3), defaultTextSize, LEFT);
  } else {
    richText('Signal A:', 10, rowY(1), defaultTextSize, LEFT);
    richText('Signal B:', 10, rowY(2), defaultTextSize, LEFT);
    richText('Rebuild with:', 10, rowY(3), defaultTextSize, LEFT);
  }
}

function setVisible(list, on) { for (const el of list) { if (on) el.show(); else el.hide(); } }

function layoutControls() {
  if (typeof overlayCheckbox === 'undefined') return;
  const groupA = [phi1Slider, phi2Slider, phi3Slider, zeroButton, sawButton, delayButton, randomButton];
  const groupB = [tauSlider, cursorSlider, shiftSelect, unwrapCheckbox, ghostCheckbox];
  const groupC = [sigASelect, sigBSelect, modeSelect, overlayCheckbox];
  setVisible(groupA, view === 'A');
  setVisible(groupB, view === 'B');
  setVisible(groupC, view === 'C');

  const w = Math.max(60, canvasWidth - sliderLeftMargin - margin);
  // narrow screens: no "View:" label, a slightly smaller radio font, tighter spacing
  const compact = canvasWidth < 480;
  viewRadio.style('font-size', compact ? '15px' : '16px');
  for (const lab of viewRadio.elt.querySelectorAll('label')) lab.style.marginRight = compact ? '4px' : '10px';
  viewRadio.position(compact ? 6 : 62, rowY(0) - 11);

  [phi1Slider, phi2Slider, phi3Slider].forEach((s, i) => { s.position(sliderLeftMargin, rowY(i + 1) - 10); s.size(w); });
  let bx = canvasWidth >= 480 ? 90 : 10;
  for (const b of [zeroButton, sawButton, delayButton, randomButton]) {
    b.position(bx, rowY(4) - 12);
    bx += b.elt.offsetWidth + 8;
  }

  tauSlider.position(sliderLeftMargin, rowY(1) - 10);
  tauSlider.size(w);
  cursorSlider.position(sliderLeftMargin, rowY(2) - 10);
  cursorSlider.size(w);
  shiftSelect.position(sliderLeftMargin, rowY(3) - 12);
  unwrapCheckbox.position(10, rowY(4) - 11);
  ghostCheckbox.position(10 + unwrapCheckbox.elt.offsetWidth + 24, rowY(4) - 11);

  sigASelect.position(sliderLeftMargin, rowY(1) - 12);
  sigBSelect.position(sliderLeftMargin, rowY(2) - 12);
  modeSelect.position(sliderLeftMargin, rowY(3) - 12);
  overlayCheckbox.position(10, rowY(4) - 11);
}

// ---------------------------------------------------------------- text helpers

// Rich text: "φ_1" draws the character after '_' as a subscript
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
    textSize(p.sub ? sz * 0.72 : sz);
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
    if (richWidth(c, sz) <= maxW) return richText(c, x, y, sz, align);
  }
  return richText(cands[cands.length - 1], x, y, sz, align);
}

// number with a true minus sign and no "-0.00"
function fmt(v, d = 2) {
  const r = Number(v.toFixed(d));
  return (r < 0 ? '−' : '') + Math.abs(r).toFixed(d);
}
function fmtInt(v) { return (v < 0 ? '−' : '') + Math.abs(v); }

// ---------------------------------------------------------------- responsive layout

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

let layoutWidth = -1;
function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  plotL = 50;
  plotR = canvasWidth - 16;
  if (canvasWidth !== layoutWidth) {
    layoutWidth = canvasWidth;
    layoutControls();
  }
}
