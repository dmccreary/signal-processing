// Analog Modulation MicroSim
// CANVAS_HEIGHT: 650
// A sinusoidal message m(t) = Am sin(2 pi fm t) modulates a sinusoidal carrier of amplitude Ac and
// frequency fc.
//   AM: s(t) = [Ac + m(t)] sin(2 pi fc t)                 (same equation as the original sketch)
//   FM: s(t) = Ac sin(2 pi fc t - beta cos(2 pi fm t)),    beta = kf Am / fm,
//       so the instantaneous frequency is fi(t) = fc + kf m(t) and the peak deviation is kf Am.
// The time axis spans 1 s, so a frequency in Hz equals the number of cycles across the plot
// (the original sketch measured fc and fm in cycles per screen width).
// The amplitude spectrum is a 4096-point FFT of a 10 s record: the bins are 0.1 Hz apart and every
// slider frequency is a multiple of 0.1 Hz, so each spectral line falls exactly on one bin.

// ---------- Canvas and layout ----------
let canvasWidth = 670;              // overwritten from the container in updateCanvasSize()
let drawHeight = 470;
let controlHeight = 180;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 240;
let defaultTextSize = 16;

const ROW = 34;                     // spacing of the control rows
const TITLE_H = 24;                 // title row above each plot
const TICK_H = 20;                  // tick-label row below each plot
const PANEL_GAP = 6;

// ---------- Model constants ----------
const KF = 0.05;                    // FM frequency sensitivity: Hz of deviation per unit of message amplitude
const FFT_N = 4096;
const FFT_T = 10;                   // seconds of signal in the FFT record
const FFT_FS = FFT_N / FFT_T;       // 409.6 samples per second

// ---------- Colors (the original sketch drew AM in red and FM in blue on a light grey grid) ----------
const AM_COLOR = [205, 0, 0];
const FM_COLOR = [0, 0, 225];
const ENV_COLOR = 70;
const GOLD = '#B8860B';
const GOLD_TEXT = '#7A5800';
const WARN_COLOR = [190, 0, 0];

// ---------- Controls ----------
let modeRadio, acSlider, amSlider, fcSlider, fmSlider;
let compact = false;
let layoutWidth = -1;

// ---------- FFT tables and spectrum cache ----------
let fftCos, fftSin, fftRev;
let specCache = {};

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textFont('Arial');
  textSize(defaultTextSize);
  frameRate(30);

  // AM vs FM selector
  modeRadio = createRadio();
  modeRadio.option('AM', 'AM');
  modeRadio.option('FM', 'FM');
  modeRadio.option('both', 'AM + FM');
  modeRadio.selected('both');
  modeRadio.style('font-family', 'Arial, Helvetica, sans-serif');
  modeRadio.style('font-size', '16px');
  modeRadio.style('white-space', 'nowrap');
  for (const lab of modeRadio.elt.querySelectorAll('label')) lab.style.marginRight = '14px';

  // Same ranges, steps and defaults as the original sketch
  acSlider = createSlider(0, 200, 100, 1);
  acSlider.attribute('aria-label', 'Carrier amplitude Ac');
  amSlider = createSlider(0, 200, 50, 1);
  amSlider.attribute('aria-label', 'Message amplitude Am');
  fcSlider = createSlider(1, 30, 5, 0.1);
  fcSlider.attribute('aria-label', 'Carrier frequency fc in hertz');
  fmSlider = createSlider(1, 30, 2, 0.1);
  fmSlider.attribute('aria-label', 'Message frequency fm in hertz');

  initFFT();
  layoutControls(true);

  describe('Analog modulation of a sinusoidal carrier by a sinusoidal message over a 1 second window. ' +
    'Radio buttons choose AM, FM, or both. In AM the red signal has a dashed envelope Ac plus m(t); in FM the ' +
    'blue signal keeps a constant amplitude while its cycles bunch together where the dashed message is high. ' +
    'In AM or FM mode an amplitude spectrum shows the carrier line at fc and the sideband lines, with the ' +
    'bandwidth marked by a gold bar. Sliders set the carrier amplitude Ac, the message amplitude Am, the ' +
    'carrier frequency fc and the message frequency fm.');
}

function layoutControls(force) {
  if (typeof fmSlider === 'undefined') return;
  if (!force && layoutWidth === canvasWidth) return;
  layoutWidth = canvasWidth;
  compact = canvasWidth < 560;
  sliderLeftMargin = compact ? 165 : 240;
  modeRadio.position(compact ? 62 : 110, drawHeight + 9);
  [acSlider, amSlider, fcSlider, fmSlider].forEach((s, i) => {
    s.position(sliderLeftMargin, drawHeight + 10 + (i + 1) * ROW);
    s.size(Math.max(60, canvasWidth - sliderLeftMargin - margin));
  });
}

// ---------- Model ----------

function readParams() {
  let mode = modeRadio.value();
  if (mode !== 'AM' && mode !== 'FM') mode = 'both';
  const p = {
    mode,
    Ac: Number(acSlider.value()),
    Am: Number(amSlider.value()),
    fc: Math.round(Number(fcSlider.value()) * 10) / 10,
    fm: Math.round(Number(fmSlider.value()) * 10) / 10
  };
  p.mu = p.Ac > 0 ? p.Am / p.Ac : Infinity;          // AM modulation index
  p.df = KF * p.Am;                                   // FM peak frequency deviation (Hz)
  p.beta = p.df / p.fm;                               // FM modulation index
  p.bwAM = 2 * p.fm;                                  // AM bandwidth
  p.bwFM = 2 * (p.df + p.fm);                         // Carson's rule
  return p;
}

function msgValue(p, t) {
  return p.Am * Math.sin(2 * Math.PI * p.fm * t);
}

function amValue(p, t) {
  return (p.Ac + p.Am * Math.sin(2 * Math.PI * p.fm * t)) * Math.sin(2 * Math.PI * p.fc * t);
}

function fmValue(p, t) {
  return p.Ac * Math.sin(2 * Math.PI * p.fc * t - p.beta * Math.cos(2 * Math.PI * p.fm * t));
}

// ---------- Drawing ----------

function draw() {
  updateCanvasSize();
  if (width !== canvasWidth) resizeCanvas(canvasWidth, canvasHeight);
  const p = readParams();

  // drawing region (light grey, as in the original) and control region
  background(232);
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke(190);
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  const lines = headerLines(p);
  drawHeader(lines);

  // Two panels: (AM or FM signal) + its spectrum, or the AM signal + the FM signal
  const top = 8 + lines.length * 21;
  const plotX = compact ? 46 : 52;
  const plotW = canvasWidth - plotX - 14;
  const avail = drawHeight - top - 2 * (TITLE_H + TICK_H) - PANEL_GAP - 4;
  const h1 = p.mode === 'both' ? avail / 2 : avail * 0.55;
  const h2 = avail - h1;
  const P1 = { x: plotX, y: top + TITLE_H, w: plotW, h: h1 };
  const P2 = { x: plotX, y: P1.y + h1 + TICK_H + PANEL_GAP + TITLE_H, w: plotW, h: h2 };

  // a shared vertical scale so AM and FM can be compared directly
  const peak = p.mode === 'FM' ? p.Ac : p.Ac + p.Am;
  const yMax = Math.max(200, Math.ceil(1.2 * peak / 100) * 100);

  if (p.mode === 'both') {
    drawTimePanel(P1, p, 'AM', yMax);
    drawTimePanel(P2, p, 'FM', yMax);
  } else {
    drawTimePanel(P1, p, p.mode, yMax);
    drawSpectrumPanel(P2, p, p.mode);
  }

  drawControlLabels(p);
}

function headerLines(p) {
  let chunks;
  const muText = p.Ac > 0 ? fmt(p.mu, 2) : '∞ (Ac = 0)';
  if (p.mode === 'AM') {
    chunks = ['s(t) = [Ac + Am sin(2π fm t)] · sin(2π fc t)',
              'μ = Am/Ac = ' + muText,
              'B = 2fm = ' + p.bwAM.toFixed(1) + ' Hz'];
    if (p.Ac > 0) chunks.push('sideband power = ' + (100 * p.mu * p.mu / (2 + p.mu * p.mu)).toFixed(1) + '%');
  } else if (p.mode === 'FM') {
    chunks = ['s(t) = Ac sin(2π fc t − β cos(2π fm t))',
              'Δf = ' + KF + '·Am = ' + p.df.toFixed(2) + ' Hz',
              'β = Δf/fm = ' + fmt(p.beta, 2),
              'fi = ' + fmt(p.fc - p.df, 2) + ' to ' + fmt(p.fc + p.df, 2) + ' Hz',
              'Carson B = 2(Δf + fm) = ' + p.bwFM.toFixed(1) + ' Hz'];
  } else {
    chunks = ['Same message m(t) = Am sin(2π fm t) on both carriers',
              'AM: μ = ' + muText,
              'FM: Δf = ' + p.df.toFixed(2) + ' Hz, β = ' + fmt(p.beta, 2)];
  }
  textSize(defaultTextSize);
  const maxW = canvasWidth - 20;
  const out = [];
  let cur = '';
  for (const c of chunks) {
    const cand = cur ? cur + '     ' + c : c;
    if (!cur || strW(cand) <= maxW) cur = cand;
    else { out.push(cur); cur = c; }
  }
  if (cur) out.push(cur);
  return out;
}

function drawHeader(lines) {
  noStroke();
  fill(0);
  textAlign(LEFT, TOP);
  for (let i = 0; i < lines.length; i++) {
    const w = strW(lines[i]);
    const avail = canvasWidth - 20;
    textSize(w > avail ? Math.max(13, defaultTextSize * avail / w) : defaultTextSize);
    text(lines[i], 10, 6 + i * 21);
    textSize(defaultTextSize);
  }
}

// Title on the left of the row above a plot, legend items on the right; shorter wording if needed
function drawTitleRow(P, titles, legends, color) {
  textSize(15);
  const rowY = P.y - TITLE_H / 2;
  const room = canvasWidth - 10 - 14;
  // prefer a complete legend over a long title: legends are tried in order, titles inside
  let pick = null;
  for (const L of legends) {
    for (const t of titles) {
      if (strW(t) + legendWidth(L) + 16 <= room) { pick = [t, L]; break; }
    }
    if (pick) break;
  }
  if (!pick) pick = [titles[titles.length - 1], []];
  noStroke();
  fill(color);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  text(pick[0], 10, rowY);
  textStyle(NORMAL);
  drawLegend(pick[1], P.x + P.w, rowY);
}

function legendWidth(items) {
  let w = 0;
  for (const it of items) w += (it.swatch ? 26 : 0) + strW(it.label) + 14;
  return w;
}

// items: {label, color, dashed, swatch ('line' | 'bar' | null)}; drawn right-aligned ending at xRight
function drawLegend(items, xRight, y) {
  textSize(15);
  let x = xRight - legendWidth(items) + 14;
  for (const it of items) {
    if (it.swatch === 'line') {
      stroke(it.color);
      strokeWeight(2);
      if (it.dashed) drawingContext.setLineDash([5, 4]);
      line(x, y, x + 20, y);
      drawingContext.setLineDash([]);
      x += 26;
    } else if (it.swatch === 'bar') {
      noStroke();
      fill(it.color);
      rect(x, y - 4, 20, 8);
      x += 26;
    }
    noStroke();
    fill(it.textColor || 30);
    textAlign(LEFT, CENTER);
    text(it.label, x, y);
    x += strW(it.label) + 14;
  }
}

function drawTimePanel(P, p, kind, yMax) {
  const col = kind === 'AM' ? AM_COLOR : FM_COLOR;
  const titles = kind === 'AM'
    ? ['Amplitude Modulation (AM)', 'AM signal']
    : ['Frequency Modulation (FM)', 'FM signal'];
  const ovLong = kind === 'AM' ? 'envelope ±(Ac + m)' : 'message m(t)';
  const ovShort = kind === 'AM' ? 'envelope' : 'm(t)';
  drawTitleRow(P, titles, [
    [{ label: 's(t)', color: col, swatch: 'line' }, { label: ovLong, color: ENV_COLOR, dashed: true, swatch: 'line' }],
    [{ label: 's(t)', color: col, swatch: 'line' }, { label: ovShort, color: ENV_COLOR, dashed: true, swatch: 'line' }],
    [{ label: ovShort, color: ENV_COLOR, dashed: true, swatch: 'line' }]
  ], col);

  const yPx = v => P.y + P.h / 2 - v / yMax * (P.h / 2);
  const xPx = t => P.x + t * P.w;

  // frame and grid (0.1 s and quarter-scale lines)
  fill(250);
  stroke(200);
  strokeWeight(1);
  rect(P.x, P.y, P.w, P.h);
  stroke(222);
  for (let i = 1; i < 10; i++) line(xPx(i / 10), P.y, xPx(i / 10), P.y + P.h);
  for (const f of [-0.5, 0.5]) line(P.x, yPx(f * yMax), P.x + P.w, yPx(f * yMax));
  stroke(150);
  line(P.x, yPx(0), P.x + P.w, yPx(0));

  const n = Math.max(200, Math.round(P.w * 2));

  // dashed overlay: the AM envelope +/-(Ac + m(t)), or the FM message m(t)
  noFill();
  stroke(ENV_COLOR);
  strokeWeight(1.5);
  drawingContext.setLineDash([6, 5]);
  if (kind === 'AM') {
    for (const sgn of [1, -1]) {
      beginShape();
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        vertex(xPx(t), yPx(sgn * (p.Ac + msgValue(p, t))));
      }
      endShape();
    }
  } else {
    beginShape();
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      vertex(xPx(t), yPx(msgValue(p, t)));
    }
    endShape();
  }
  drawingContext.setLineDash([]);

  // the modulated signal
  stroke(col);
  strokeWeight(P.w / Math.max(p.fc + p.df, 1) < 14 ? 1.5 : 2);
  beginShape();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    vertex(xPx(t), yPx(kind === 'AM' ? amValue(p, t) : fmValue(p, t)));
  }
  endShape();

  // over-modulation note (AM only)
  if (kind === 'AM' && p.Am > 0 && p.Am >= p.Ac) {
    const over = p.Am > p.Ac;
    const msg = over
      ? (compact ? 'μ > 1: over-modulated' : 'μ > 1: over-modulated, Ac + m(t) goes below zero')
      : 'μ = 1: the envelope just touches zero';
    textSize(14);
    const w = strW(msg) + 10;
    noStroke();
    fill(255, 255, 255, 225);
    rect(P.x + 4, P.y + P.h - 24, w, 20, 3);
    fill(over ? WARN_COLOR : GOLD_TEXT);
    textAlign(LEFT, CENTER);
    text(msg, P.x + 9, P.y + P.h - 14);
  }

  // tick labels
  noStroke();
  fill(50);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (const f of [-1, -0.5, 0, 0.5, 1]) {
    const yy = constrain(yPx(f * yMax), P.y + 7, P.y + P.h - 7);
    text(fmt(f * yMax, 0), P.x - 5, yy);
  }
  const step = P.w / 10 >= 48 ? 0.1 : 0.2;
  textAlign(CENTER, TOP);
  for (let t = 0; t <= 1.0001; t += step) {
    const last = t > 0.999;
    if (last) { textAlign(RIGHT, TOP); text('1.0 s', P.x + P.w, P.y + P.h + 3); }
    else text(t === 0 ? '0' : t.toFixed(1), xPx(t), P.y + P.h + 3);
  }
}

function drawSpectrumPanel(P, p, kind) {
  const col = kind === 'AM' ? AM_COLOR : FM_COLOR;
  const S = getSpectrum(p, kind);
  const bw = kind === 'AM' ? p.bwAM : p.bwFM;
  const fLo = kind === 'AM' ? p.fc - p.fm : p.fc - p.df - p.fm;
  const fHi = kind === 'AM' ? p.fc + p.fm : p.fc + p.df + p.fm;

  // frequency axis: smallest round value above the highest visible line
  let fTop = fHi;
  for (const b of S.bins) fTop = Math.max(fTop, b.f);
  const fMax = [10, 20, 30, 40, 50, 60, 80, 100, 120].find(c => c >= fTop + 1) || 120;
  // amplitude axis: set by Ac (or by Am/2 when the carrier is weak) so it only moves with Ac
  const ref = Math.max(p.Ac, p.Am / 2, 1);
  const sMax = Math.max(50, Math.ceil(1.5 * ref / 50) * 50);
  const xPx = f => P.x + f / fMax * P.w;
  const yPx = a => P.y + P.h - a / sMax * P.h;

  const bwLong = (kind === 'AM' ? 'B = 2fm = ' : 'Carson B = ') + bw.toFixed(1) + ' Hz';
  const bwShort = 'B = ' + bw.toFixed(1) + ' Hz';
  const titles = kind === 'AM'
    ? ['Amplitude spectrum of the AM signal', 'AM spectrum']
    : ['Amplitude spectrum of the FM signal', 'FM spectrum'];
  drawTitleRow(P, titles, [
    [{ label: 'lines', color: col, swatch: 'line' }, { label: bwLong, color: 'rgba(184,134,11,0.55)', swatch: 'bar', textColor: GOLD_TEXT }],
    [{ label: bwShort, color: 'rgba(184,134,11,0.55)', swatch: 'bar', textColor: GOLD_TEXT }]
  ], col);

  // frame and grid
  fill(250);
  stroke(200);
  strokeWeight(1);
  rect(P.x, P.y, P.w, P.h);
  const pxPerHz = P.w / fMax;
  const step = [1, 2, 5, 10, 20].find(s => s * pxPerHz >= 38) || 20;
  stroke(222);
  for (let f = step; f < fMax; f += step) line(xPx(f), P.y, xPx(f), P.y + P.h);
  for (let a = 50; a < sMax; a += 50) line(P.x, yPx(a), P.x + P.w, yPx(a));

  // bandwidth bar along the frequency axis
  const x1 = xPx(constrain(fLo, 0, fMax));
  const x2 = xPx(constrain(fHi, 0, fMax));
  noStroke();
  fill(184, 134, 11, 140);
  rect(x1, P.y + P.h - 7, Math.max(2, x2 - x1), 7);

  // spectral lines
  const sw = pxPerHz * p.fm < 8 ? 2 : 3;
  for (const b of S.bins) {
    const x = xPx(b.f);
    stroke(col);
    strokeWeight(sw);
    line(x, yPx(0), x, yPx(b.a));
    noStroke();
    fill(col);
    circle(x, yPx(b.a), sw + 4);
  }

  // line labels: every line for AM when there is room, the carrier line for FM
  textSize(14);
  const room = pxPerHz * p.fm;
  if (kind === 'AM') {
    const named = [
      { f: Math.abs(p.fc - p.fm), name: p.fc >= p.fm ? 'fc − fm' : 'fm − fc' },
      { f: p.fc, name: 'fc' },
      { f: p.fc + p.fm, name: 'fc + fm' }
    ];
    for (const L of named) {
      if (L.name !== 'fc' && room < 58) continue;
      const a = S.amp(L.f);
      if (a < 1e-6) continue;
      labelStem(xPx(L.f), yPx(a), L.name, a.toFixed(1), col, P);
    }
  } else {
    const a = S.amp(p.fc);
    labelStem(xPx(p.fc), yPx(a), 'fc', a.toFixed(1), col, P);
  }

  // tick labels
  noStroke();
  fill(50);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (let a = 0; a <= sMax; a += 50) {
    if (sMax > 150 && a % 100 !== 0 && a !== sMax) continue;
    text(String(a), P.x - 5, constrain(yPx(a), P.y + 7, P.y + P.h - 7));
  }
  textAlign(CENTER, TOP);
  const lastLabel = fMax + ' Hz';
  const lastLeft = P.x + P.w - strW(lastLabel) - 8;      // keep clear of the right-aligned last label
  for (let f = 0; f < fMax; f += step) {
    if (xPx(f) + strW(String(f)) / 2 < lastLeft) text(String(f), xPx(f), P.y + P.h + 3);
  }
  textAlign(RIGHT, TOP);
  text(lastLabel, P.x + P.w, P.y + P.h + 3);
}

// Two-line label (name above value) over a spectral line, on a light box so lines stay visible
function labelStem(x, yTop, name, value, col, P) {
  textSize(14);
  const w = Math.max(strW(name), strW(value)) + 8;
  const h = 34;
  let top = yTop - h - 4;
  if (top < P.y + 2) top = P.y + 2;
  const left = constrain(x - w / 2, P.x + 2, P.x + P.w - w - 2);
  noStroke();
  fill(250, 250, 250, 215);
  rect(left, top, w, h, 3);
  fill(col);
  textAlign(CENTER, TOP);
  text(name, left + w / 2, top + 2);
  fill(30);
  text(value, left + w / 2, top + 18);
}

function drawControlLabels(p) {
  noStroke();
  fill(0);
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  const y0 = drawHeight + 20;
  text(compact ? 'Mode:' : 'Modulation:', 10, y0);
  const L = compact
    ? ['Carrier Ac: ', 'Message Am: ', 'Carrier fc: ', 'Message fm: ']
    : ['Carrier amplitude Ac: ', 'Message amplitude Am: ', 'Carrier frequency fc: ', 'Message frequency fm: '];
  text(L[0] + p.Ac, 10, y0 + ROW);
  text(L[1] + p.Am, 10, y0 + 2 * ROW);
  text(L[2] + p.fc.toFixed(1) + ' Hz', 10, y0 + 3 * ROW);
  text(L[3] + p.fm.toFixed(1) + ' Hz', 10, y0 + 4 * ROW);
}

// ---------- Spectrum (radix-2 FFT of a 10 s record) ----------

function initFFT() {
  const N = FFT_N;
  fftCos = new Float64Array(N / 2);
  fftSin = new Float64Array(N / 2);
  for (let i = 0; i < N / 2; i++) {
    fftCos[i] = Math.cos(2 * Math.PI * i / N);
    fftSin[i] = -Math.sin(2 * Math.PI * i / N);
  }
  fftRev = new Uint32Array(N);
  const bits = Math.round(Math.log2(N));
  for (let i = 0; i < N; i++) {
    let r = 0, x = i;
    for (let b = 0; b < bits; b++) { r = (r << 1) | (x & 1); x >>= 1; }
    fftRev[i] = r;
  }
}

function fftInPlace(re, im) {
  const N = re.length;
  for (let i = 0; i < N; i++) {
    const j = fftRev[i];
    if (j > i) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let size = 2; size <= N; size <<= 1) {
    const half = size >> 1;
    const tStep = N / size;
    for (let start = 0; start < N; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = fftCos[k * tStep], wi = fftSin[k * tStep];
        const a = start + k, b = a + half;
        const tr = re[b] * wr - im[b] * wi;
        const ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
}

// One-sided amplitude spectrum: a sinusoid of amplitude A at f > 0 gives a line of height A
function getSpectrum(p, kind) {
  const key = [p.Ac, p.Am, p.fc, p.fm].join('|');
  const c = specCache[kind];
  if (c && c.key === key) return c;
  const re = new Float64Array(FFT_N), im = new Float64Array(FFT_N);
  for (let n = 0; n < FFT_N; n++) {
    const t = n / FFT_FS;
    re[n] = kind === 'AM' ? amValue(p, t) : fmValue(p, t);
  }
  fftInPlace(re, im);
  const amps = new Float64Array(FFT_N / 2);
  let maxA = 0;
  for (let k = 0; k < FFT_N / 2; k++) {
    amps[k] = Math.hypot(re[k], im[k]) / FFT_N * (k === 0 ? 1 : 2);
    maxA = Math.max(maxA, amps[k]);
  }
  const bins = [];
  const thr = Math.max(1e-6, 0.01 * maxA);        // hide lines below 1% of the largest one
  for (let k = 0; k < FFT_N / 2; k++) if (amps[k] >= thr) bins.push({ f: k / FFT_T, a: amps[k] });
  const res = {
    key, bins, maxA,
    amp: f => {
      const k = Math.round(f * FFT_T);
      return k >= 0 && k < amps.length ? amps[k] : 0;
    }
  };
  specCache[kind] = res;
  return res;
}

// ---------- Helpers ----------

// p5 2.x textWidth() drops spaces, so measure runs of text with fontWidth()
function strW(s) {
  return typeof fontWidth === 'function' ? fontWidth(String(s)) : textWidth(String(s));
}

// Fixed digits with a true minus sign and never "-0.00"
function fmt(v, digits) {
  const s = Math.abs(v) < 0.5 * Math.pow(10, -digits) ? (0).toFixed(digits) : v.toFixed(digits);
  return s.replace('-', '−');
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = Math.floor(container.getBoundingClientRect().width);
  layoutControls(false);
}
