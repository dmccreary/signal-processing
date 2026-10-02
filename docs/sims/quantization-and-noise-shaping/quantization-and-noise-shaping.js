// Quantization and Noise Shaping MicroSim
// CANVAS_HEIGHT: 630
// A full-scale waveform is quantized with b bits (step size delta = V / 2^b,
// V = 2).  The error e[n] = xq[n] - x[n] and its spectrum are computed from the
// actual samples with a radix-2 FFT.  Oversampling spreads the error power over
// a wider band, and first- or second-order noise shaping (error feedback) moves
// it out of the signal band, so a low-pass filter removes most of it.

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 670;
let drawHeight = 515;
let controlHeight = 115;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 245;
let defaultTextSize = 16;

// ---- signal model ----
const V_RANGE = 2;        // full-scale range, -1 to +1
const F_BAND = 20000;     // Hz, upper edge of the signal band
const N_BASE = 512;       // samples in the analysis record at 1x (fs = 2 * F_BAND)
const CYCLES = 7;         // whole cycles of the fundamental in the record
const MAX_OSR = 16;
const T_SHOW = 0.004;     // seconds of signal displayed
const F0 = CYCLES * 2 * F_BAND / N_BASE;   // fundamental frequency, 546.875 Hz

// ---- controls ----
let signalSelect, osrSelect, bitSlider, shapeSelect, filterCheckbox;

let model = null;
let modelKey = '';
const peakGain = {};      // per-waveform gain that makes the peak exactly 1

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  signalSelect = createSelect();
  signalSelect.option('Sinusoid', 'sine');
  signalSelect.option('Triangle', 'triangle');
  signalSelect.option('Complex waveform', 'complex');
  signalSelect.selected('sine');

  osrSelect = createSelect();
  for (const r of [1, 2, 4, 8, 16]) osrSelect.option(r + '×', String(r));
  osrSelect.selected('1');

  bitSlider = createSlider(1, 16, 4, 1);

  shapeSelect = createSelect();
  shapeSelect.option('Off', '0');
  shapeSelect.option('1st order', '1');
  shapeSelect.option('2nd order', '2');
  shapeSelect.selected('0');

  filterCheckbox = createCheckbox(' Show low-pass filtered output', false);

  const mainElement = document.querySelector('main');
  [signalSelect, osrSelect, bitSlider, shapeSelect, filterCheckbox].forEach(c => c.parent(mainElement));
  positionControls();

  describe('Four plots: a full-scale waveform, its quantized version with the quantization levels drawn, ' +
    'the quantization error, and the spectrum of the error with the signal band shaded. ' +
    'A banner gives the step size and the measured and predicted signal-to-quantization-noise ratio.', LABEL);
}

// ---------------------------------------------------------------------------
// FFT (radix-2, decimation in time, in place)
// ---------------------------------------------------------------------------

const twiddleCache = {};

function twiddles(n) {
  if (!twiddleCache[n]) {
    const c = new Float64Array(n / 2), s = new Float64Array(n / 2);
    for (let k = 0; k < n / 2; k++) {
      c[k] = Math.cos(2 * Math.PI * k / n);
      s[k] = Math.sin(2 * Math.PI * k / n);
    }
    twiddleCache[n] = { c: c, s: s };
  }
  return twiddleCache[n];
}

// Forward transform: X[k] = sum x[n] e^{-j 2 pi k n / N}.  The inverse divides by N.
function fft(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {          // bit-reversal permutation
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  const tw = twiddles(n);
  for (let len = 2; len <= n; len <<= 1) {      // butterflies
    const half = len >> 1, step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k++) {
        const wr = tw.c[k * step], wi = inverse ? tw.s[k * step] : -tw.s[k * step];
        const a = i + k, b = a + half;
        const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

// ---------------------------------------------------------------------------
// Signal and quantizer model
// ---------------------------------------------------------------------------

// One period of each waveform as a function of phase in cycles, before scaling.
// All harmonics lie below F_BAND, so the input is band-limited.
function rawWave(kind, cycles) {
  const th = 2 * Math.PI * cycles;
  if (kind === 'sine') return Math.sin(th);
  if (kind === 'triangle') {
    let s = 0;
    for (let k = 1; k * CYCLES < N_BASE / 2; k += 2) {
      s += ((k - 1) / 2 % 2 === 0 ? 1 : -1) * Math.sin(k * th) / (k * k);
    }
    return 8 / (Math.PI * Math.PI) * s;
  }
  return Math.sin(th) + 0.5 * Math.sin(2 * th + 0.7) + 0.3 * Math.sin(5 * th + 1.9);
}

function wave(kind, cycles) {
  if (!peakGain[kind]) {
    // peak over the finest sampling grid used, so no sample ever exceeds full scale
    let peak = 0;
    const n = N_BASE * MAX_OSR;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(rawWave(kind, CYCLES * i / n)));
    peakGain[kind] = 1 / peak;
  }
  return peakGain[kind] * rawWave(kind, cycles);
}

// Mid-rise uniform quantizer with step delta: levels at (k + 1/2) delta.
// With clip = true the output is limited to the 2^b levels inside the full-scale range.
function quantize(v, delta, clip) {
  let q = (Math.floor(v / delta) + 0.5) * delta;
  if (clip) {
    const top = V_RANGE / 2 - delta / 2;
    q = Math.max(-top, Math.min(top, q));
  }
  return q;
}

// Noise transfer function magnitude squared at frequency f for a modulator of the given order.
function ntfPower(order, f, fs) {
  if (order === 0) return 1;
  const s = 4 * Math.pow(Math.sin(Math.PI * f / fs), 2);       // |1 - e^{-j 2 pi f / fs}|^2
  return order === 1 ? s : s * s;
}

// White-noise model: noise power left in the band 0..fs/(2 osr) for step delta.
function modelInBandNoise(delta, osr, order) {
  const base = delta * delta / 12;
  const th = Math.PI / osr;
  if (order === 0) return base / osr;
  if (order === 1) return base * (2 / Math.PI) * (th - Math.sin(th));
  return base * (1 / Math.PI) * (6 * th - 8 * Math.sin(th) + Math.sin(2 * th));
}

function modelTotalNoise(delta, order) {
  return delta * delta / 12 * [1, 2, 6][order];
}

function buildModel(kind, bits, osr, order) {
  const n = N_BASE * osr;
  const fs = 2 * F_BAND * osr;
  const delta = V_RANGE / Math.pow(2, bits);
  const x = new Float64Array(n), y = new Float64Array(n), err = new Float64Array(n);

  let e1 = 0, e2 = 0, signalPower = 0, peakOut = 0;
  // The error-feedback loop is run twice round the (periodic) record so that the
  // second pass, which is the one kept, starts from settled error values.
  for (let pass = 0; pass < (order === 0 ? 1 : 2); pass++) {
    signalPower = 0; peakOut = 0;
    for (let i = 0; i < n; i++) {
      x[i] = wave(kind, CYCLES * i / n);
      let v = x[i];
      if (order === 1) v = x[i] - e1;
      if (order === 2) v = x[i] - 2 * e1 + e2;
      // With feedback the quantizer input can exceed full scale by up to delta/2 (1st order)
      // or 3 delta/2 (2nd order), so the shaped quantizer is given extra headroom levels.
      y[i] = quantize(v, delta, order === 0);
      e2 = e1;
      e1 = y[i] - v;
      err[i] = y[i] - x[i];
      signalPower += x[i] * x[i] / n;
      peakOut = Math.max(peakOut, Math.abs(y[i]));
    }
  }

  // spectrum of the error: one-sided power per bin, so that the bins sum to mean(err^2)
  const re = Float64Array.from(err), im = new Float64Array(n);
  fft(re, im, false);
  const half = n / 2, bandBin = half / osr;
  const power = new Float64Array(half + 1);
  let total = 0, inBand = 0;
  for (let k = 0; k <= half; k++) {
    const p = (re[k] * re[k] + im[k] * im[k]) / (n * n) * (k === 0 || k === half ? 1 : 2);
    power[k] = p;
    total += p;
    if (k <= bandBin) inBand += p;
  }

  // ideal low-pass filter: keep the bins of xq[n] up to F_BAND, discard the rest
  const yr = Float64Array.from(y), yi = new Float64Array(n);
  fft(yr, yi, false);
  for (let k = bandBin + 1; k < n - bandBin; k++) { yr[k] = 0; yi[k] = 0; }
  fft(yr, yi, true);

  const modelIn = modelInBandNoise(delta, osr, order);
  return {
    kind: kind, bits: bits, osr: osr, order: order, n: n, fs: fs, delta: delta,
    x: x, y: y, err: err, filtered: yr, power: power,
    levelsUsed: Math.round(2 * peakOut / delta) + 1,
    signalPower: signalPower, totalNoise: total, inBandNoise: inBand,
    sqnrMeasured: 10 * Math.log10(signalPower / inBand),
    sqnrModel: 10 * Math.log10(signalPower / modelIn),
    modelTotal: modelTotalNoise(delta, order), modelInBand: modelIn
  };
}

function currentModel() {
  const kind = signalSelect.value(), bits = bitSlider.value();
  const osr = parseInt(osrSelect.value()), order = parseInt(shapeSelect.value());
  const key = [kind, bits, osr, order].join('|');
  if (key !== modelKey) {
    model = buildModel(kind, bits, osr, order);
    modelKey = key;
  }
  return model;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function draw() {
  updateCanvasSize();

  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  const m = currentModel();
  const showFiltered = filterCheckbox.checked();

  const left = 52, right = 16;
  const pw = canvasWidth - left - right;
  const p1 = { x: left, y: 80, w: pw, h: 58 };
  const p2 = { x: left, y: 160, w: pw, h: 80 };
  const p3 = { x: left, y: 262, w: pw, h: 58 };
  const p4 = { x: left, y: 372, w: pw, h: 105 };

  drawBanner(m);
  drawOriginal(p1, m);
  drawQuantized(p2, m, showFiltered);
  drawError(p3, m, showFiltered);
  drawSpectrum(p4, m);

  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(22);
  text('Quantization and Noise Shaping', canvasWidth / 2, 8);

  drawControlLabels(m);
}

function fmtStep(d) {
  if (d >= 0.001) return String(parseFloat(d.toPrecision(3)));
  const e = Math.floor(Math.log10(d));
  return (d / Math.pow(10, e)).toFixed(2) + '×10^' + e;
}

function fmtCount(v) {
  return v.toLocaleString('en-US');
}

function drawBanner(m) {
  const narrow = canvasWidth < 600;
  const levels = Math.pow(2, m.bits);
  let msg = 'Δ = V/2^b = 2/' + fmtCount(levels) + ' = ' + fmtStep(m.delta) + '      In-band SQNR: ' +
    m.sqnrMeasured.toFixed(1) + ' dB measured,  ' + m.sqnrModel.toFixed(1) + ' dB white-noise model';
  if (narrow) msg = 'Δ = ' + fmtStep(m.delta) + '   SQNR ' + m.sqnrMeasured.toFixed(1) + ' dB (model ' + m.sqnrModel.toFixed(1) + ')';
  stroke('steelblue');
  strokeWeight(1.5);
  fill('lightyellow');
  rect(10, 34, canvasWidth - 20, 24, 8);
  strokeWeight(1);
  noStroke();
  fill('midnightblue');
  textSize(narrow ? 12 : 14);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(msg, canvasWidth / 2, 46);
  textStyle(NORMAL);
}

function caption(p, str, col, rightText) {
  noStroke();
  textSize(canvasWidth < 600 ? 11 : 13);
  fill(col);
  textStyle(BOLD);
  textAlign(LEFT, BOTTOM);
  text(str, p.x, p.y - 4);
  textStyle(NORMAL);
  if (rightText) {
    fill('black');
    textSize(12);
    textAlign(RIGHT, BOTTOM);
    text(rightText, p.x + p.w, p.y - 4);
  }
}

// Frame of a time plot.  yMax is the value at the top edge; ticks is a list of [value, label].
function timeFrame(p, yMax, ticks, showTimeTicks) {
  const X = t => p.x + t / T_SHOW * p.w;
  const Y = v => p.y + p.h / 2 - (v / yMax) * (p.h / 2);
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(12);
  for (const tk of ticks) {
    stroke(tk[0] === 0 ? 'gray' : 'gainsboro');
    line(p.x, Y(tk[0]), p.x + p.w, Y(tk[0]));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(tk[1], p.x - 5, Y(tk[0]));
  }
  for (let ms = 0; ms <= 4.0001; ms += 0.5) {
    stroke('gainsboro');
    line(X(ms / 1000), p.y, X(ms / 1000), p.y + p.h);
    if (showTimeTicks && Math.abs(ms - Math.round(ms)) < 1e-9) {
      noStroke();
      fill('black');
      textAlign(CENTER, TOP);
      text(ms, X(ms / 1000), p.y + p.h + 4);
    }
  }
  return { X: X, Y: Y };
}

function shownSamples(m) { return Math.round(T_SHOW * m.fs); }

// Zero-order-hold (staircase) drawing of a sampled sequence.
function drawStairs(p, s, m, data, scale, col, weight) {
  stroke(col);
  strokeWeight(weight);
  noFill();
  beginShape();
  const count = shownSamples(m);
  for (let i = 0; i < count; i++) {
    const v = constrain(s.Y(data[i] * scale), p.y, p.y + p.h);
    vertex(s.X(i / m.fs), v);
    vertex(s.X((i + 1) / m.fs), v);
  }
  endShape();
  strokeWeight(1);
}

// Straight-line drawing through the sample values (used for smooth, band-limited sequences).
function drawSamplesLine(p, s, m, data, scale, col, weight) {
  stroke(col);
  strokeWeight(weight);
  noFill();
  beginShape();
  const count = shownSamples(m);
  for (let i = 0; i <= count; i++) {
    vertex(s.X(i / m.fs), constrain(s.Y(data[i] * scale), p.y, p.y + p.h));
  }
  endShape();
  strokeWeight(1);
}

function drawOriginal(p, m) {
  const s = timeFrame(p, 1.25, [[-1, '−1'], [0, '0'], [1, '+1']], false);
  stroke('blue');
  strokeWeight(2);
  noFill();
  beginShape();
  const steps = Math.max(400, Math.floor(p.w * 2));
  for (let i = 0; i <= steps; i++) {
    const t = T_SHOW * i / steps;
    vertex(s.X(t), s.Y(wave(m.kind, F0 * t)));
  }
  endShape();
  strokeWeight(1);
  const names = { sine: 'sinusoid', triangle: 'triangle wave', complex: 'three-harmonic waveform' };
  caption(p, 'Original signal x(t): full-scale ' + names[m.kind] + (canvasWidth < 600 ? '' : ', ' + F0.toFixed(0) + ' Hz'),
    'blue', canvasWidth < 600 ? '' : 'full-scale range V = 2');
}

function drawQuantized(p, m, showFiltered) {
  const peak = (m.levelsUsed - 1) * m.delta / 2;                 // largest output level in use
  const yMax = Math.max(1.25, peak * 1.15);
  const s = timeFrame(p, yMax, [[-1, '−1'], [0, '0'], [1, '+1']], false);

  // quantization levels (drawn while they are far enough apart to be seen)
  const levels = Math.pow(2, m.bits);
  if (levels <= 32) {
    stroke('burlywood');
    const kMax = Math.floor(yMax / m.delta);
    for (let k = -kMax - 1; k <= kMax; k++) {
      const lv = (k + 0.5) * m.delta;
      if (Math.abs(lv) > yMax) continue;
      const inside = Math.abs(lv) < V_RANGE / 2;
      drawingContext.setLineDash(inside ? [] : [3, 3]);          // dashed: headroom levels
      if (inside || m.order > 0) line(p.x, s.Y(lv), p.x + p.w, s.Y(lv));
    }
    drawingContext.setLineDash([]);
  }

  drawSamplesLine(p, s, m, m.x, 1, 'lightsteelblue', 1);
  drawStairs(p, s, m, m.y, 1, 'chocolate', levels <= 32 ? 2 : 1.5);
  if (showFiltered) drawSamplesLine(p, s, m, m.filtered, 1, 'green', 2);

  const narrow = canvasWidth < 600;
  let str = (narrow ? 'Quantized xq[n]: ' : 'Quantized signal xq[n]: ') + fmtCount(levels) + ' levels';
  if (m.order > 0 && m.levelsUsed > levels) {
    str += narrow ? ' +' + (m.levelsUsed - levels) + ' headroom' : ' + headroom (' + fmtCount(m.levelsUsed) + ' used)';
  }
  if (showFiltered && !narrow) str += ',  green: after low-pass filter';
  caption(p, str, 'chocolate', 'fs = ' + (m.fs / 1000) + ' kHz');
}

function drawError(p, m, showFiltered) {
  // error in units of the step size; the range grows with the order of the noise shaper
  const span = [0.5, 1, 2][m.order];
  const lbl = ['Δ/2', 'Δ', '2Δ'][m.order];
  const s = timeFrame(p, span * 1.25, [[-span, '−' + lbl], [0, '0'], [span, '+' + lbl]], true);
  drawStairs(p, s, m, m.err, 1 / m.delta, 'firebrick', 1.5);
  if (showFiltered) {
    const d = new Float64Array(m.n);
    for (let i = 0; i < m.n; i++) d[i] = m.filtered[i] - m.x[i];
    drawSamplesLine(p, s, m, d, 1 / m.delta, 'green', 2);
  }
  const narrow = canvasWidth < 600;
  let str = 'Quantization error e[n] = xq[n] − x[n]';
  if (showFiltered && !narrow) str += ',  green: error left after the filter';
  caption(p, str, 'firebrick', 't (ms)');
}

function drawSpectrum(p, m) {
  const fMax = m.fs / 2;
  const half = m.n / 2;
  const ref = 0.5;                                  // power of a full-scale sine = 0 dBFS
  const toDb = pw => 10 * Math.log10(Math.max(pw, 1e-30) / ref);
  const perBinModel = f => m.delta * m.delta / 12 * ntfPower(m.order, f, m.fs) * 2 / m.n;

  // vertical range: top just above the highest model level, 100 dB span
  const top = 20 * Math.ceil((toDb(perBinModel(fMax)) + 12) / 20);
  const bottom = top - 100;
  const X = f => p.x + f / fMax * p.w;
  const Y = db => p.y + (top - constrain(db, bottom, top)) / (top - bottom) * p.h;

  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);

  // signal band 0 ... F_BAND
  noStroke();
  fill('rgba(60, 179, 113, 0.18)');
  rect(p.x + 1, p.y + 1, X(F_BAND) - p.x - 1, p.h - 2);

  textSize(12);
  for (let db = top; db >= bottom; db -= 20) {
    stroke('gainsboro');
    line(p.x, Y(db), p.x + p.w, Y(db));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(db, p.x - 5, Y(db));
  }
  const fStep = fMax / 4;
  for (let f = 0; f <= fMax + 1; f += fStep) {
    stroke('gainsboro');
    line(X(f), p.y, X(f), p.y + p.h);
    noStroke();
    fill('black');
    textAlign(CENTER, TOP);
    text(f / 1000, X(f), p.y + p.h + 4);
  }
  noStroke();
  fill('black');
  textSize(13);
  textAlign(CENTER, TOP);
  text(canvasWidth < 600 ? 'f (kHz)' : 'Frequency (kHz)', p.x + p.w / 2, p.y + p.h + 19);

  // measured error spectrum: one point per bin, or the mean power of the bins in each pixel column
  stroke('firebrick');
  strokeWeight(1);
  noFill();
  beginShape();
  if (half <= p.w) {
    for (let k = 0; k <= half; k++) vertex(X(k * m.fs / m.n), Y(toDb(m.power[k])));
  } else {
    const cols = Math.floor(p.w);
    for (let c = 0; c < cols; c++) {
      const k0 = Math.floor(c / cols * half), k1 = Math.max(k0 + 1, Math.floor((c + 1) / cols * half));
      let sum = 0;
      for (let k = k0; k < k1; k++) sum += m.power[k];
      vertex(p.x + (c + 0.5) / cols * p.w, Y(toDb(sum / (k1 - k0))));
    }
  }
  endShape();

  // white-noise model: (delta^2 / 12) |NTF(f)|^2 shared equally among the bins
  stroke('black');
  strokeWeight(1.5);
  drawingContext.setLineDash([5, 4]);
  beginShape();
  for (let i = 0; i <= 300; i++) {
    const f = fMax * i / 300;
    vertex(X(f), Y(toDb(perBinModel(f))));
  }
  endShape();
  drawingContext.setLineDash([]);
  strokeWeight(1);

  // edge of the signal band
  stroke('darkgreen');
  drawingContext.setLineDash([4, 3]);
  line(X(F_BAND), p.y, X(F_BAND), p.y + p.h);
  drawingContext.setLineDash([]);

  // noise totals, on the same line as the axis title
  const narrow = canvasWidth < 600;
  noStroke();
  textSize(narrow ? 11 : 13);
  textStyle(BOLD);
  fill('darkgreen');
  textAlign(LEFT, TOP);
  text((narrow ? 'in band ' : 'Noise in signal band: ') + toDb(m.inBandNoise).toFixed(1) + ' dBFS', p.x, p.y + p.h + 19);
  fill('firebrick');
  textAlign(RIGHT, TOP);
  text((narrow ? 'total ' : 'Total noise: ') + toDb(m.totalNoise).toFixed(1) + ' dBFS', p.x + p.w, p.y + p.h + 19);
  textStyle(NORMAL);

  const order = ['no noise shaping', '1st-order noise shaping', '2nd-order noise shaping'][m.order];
  caption(p, narrow ? 'Error spectrum (dBFS per bin)' : 'Spectrum of the error (dBFS per 78 Hz bin), ' + order,
    'black', narrow ? '' : 'dashed: white-noise model');
}

function drawControlLabels(m) {
  const narrow = canvasWidth < 600;
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  textSize(narrow ? 13 : defaultTextSize);
  text('Signal:', 10, drawHeight + 18);
  text(narrow ? 'OSR:' : 'Oversampling:', narrow ? 205 : 300, drawHeight + 18);
  const levels = fmtCount(Math.pow(2, m.bits));
  text(narrow ? 'b: ' + m.bits + ' bits' : 'Bit depth b: ' + m.bits + ' (' + levels + ' levels)', 10, drawHeight + 53);
  text(narrow ? 'Shaping:' : 'Noise shaping:', 10, drawHeight + 88);
}

// ---------------------------------------------------------------------------
// Responsive layout
// ---------------------------------------------------------------------------

function positionControls() {
  const narrow = canvasWidth < 600;
  signalSelect.position(narrow ? 60 : 70, drawHeight + 7);
  signalSelect.style('max-width', (narrow ? 135 : 200) + 'px');
  osrSelect.position(narrow ? 245 : 410, drawHeight + 7);
  const labelW = narrow ? 85 : sliderLeftMargin;
  bitSlider.position(labelW, drawHeight + 42);
  bitSlider.size(canvasWidth - labelW - margin);
  shapeSelect.position(narrow ? 72 : 125, drawHeight + 77);
  filterCheckbox.position(narrow ? 170 : 240, drawHeight + 79);
  filterCheckbox.style('font-size', narrow ? '12px' : '16px');
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) {
    const w = Math.floor(container.getBoundingClientRect().width);
    if (w > 0) canvasWidth = w;
  }
}
