// Correlation and Matched Filtering MicroSim
// CANVAS_HEIGHT: 615
// Copies of a known template s[n] are buried in white Gaussian noise at
// unknown delays.  Cross-correlating the received signal with the template,
//     R_rs[m] = sum over k of r[k] s[k - m],
// produces a peak at each delay.  The same numbers come out of the matched
// filter h[n] = s[L-1-n], the time-reversed template, L-1 samples later.
// Runs on p5.js 2.3.2 (no p5.sound: the signals are computed, not played).

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 670;
let drawHeight = 500;
let controlHeight = 115;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 165;
let defaultTextSize = 16;

// ---- signal sizes ----
const N = 600;            // samples in the received signal
const EDGE = 10;          // no template starts closer than this to either end
// A detected peak counts as a hit when it lies within a quarter of the template
// length of a true delay; the remaining offset is reported as the timing error.

// ---- controls ----
let templateSelect, noiseButton, averageCheckbox, truthCheckbox;
let snrSlider, countSlider, thresholdSlider;

// ---- state ----
let seed = 7;             // changes when "New Noise" is pressed
let model = null;         // everything computed for the current settings
let modelKey = '';

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  templateSelect = createSelect();
  templateSelect.option('Rectangular pulse', 'pulse');
  templateSelect.option('Sine burst', 'sine');
  templateSelect.option('Chirp (rising frequency)', 'chirp');
  templateSelect.option('Barker-13 code', 'barker');
  templateSelect.selected('chirp');

  noiseButton = createButton('New Noise');
  noiseButton.mousePressed(() => { seed += 1; });

  averageCheckbox = createCheckbox(' Moving average', false);
  truthCheckbox = createCheckbox(' True delays', true);

  snrSlider = createSlider(-10, 20, 0, 1);
  countSlider = createSlider(1, 5, 3, 1);
  thresholdSlider = createSlider(0.2, 1, 0.5, 0.05);

  const mainElement = document.querySelector('main');
  [templateSelect, noiseButton, averageCheckbox, truthCheckbox, snrSlider, countSlider, thresholdSlider]
    .forEach(c => c.parent(mainElement));
  positionControls();

  describe('Three rows of plots: a noisy received signal containing hidden copies of a template, ' +
    'the template beside its time-reversed matched filter, and the cross-correlation output with a ' +
    'threshold line and detected peaks labelled with their lag and signal-to-noise ratio.');
}

// ---------------------------------------------------------------------------
// Signal model
// ---------------------------------------------------------------------------

// small deterministic random number generator so a seed always gives the same noise
function makeRandom(seedValue) {
  let a = seedValue >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianSequence(count, rand) {
  const out = new Float64Array(count);
  for (let i = 0; i < count; i += 2) {
    const u1 = Math.max(rand(), 1e-12), u2 = rand();
    const mag = Math.sqrt(-2 * Math.log(u1));
    out[i] = mag * Math.cos(2 * Math.PI * u2);
    if (i + 1 < count) out[i + 1] = mag * Math.sin(2 * Math.PI * u2);
  }
  return out;
}

// Templates all have a peak amplitude of 1.
function makeTemplate(kind) {
  if (kind === 'barker') {
    const code = [1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1];   // Barker code of length 13
    const s = [];
    for (const chip of code) for (let j = 0; j < 4; j++) s.push(chip);   // 4 samples per chip
    return s;
  }
  const L = 48;
  const s = new Array(L);
  for (let n = 0; n < L; n++) {
    if (kind === 'pulse') s[n] = 1;
    else if (kind === 'sine') s[n] = Math.sin(2 * Math.PI * n / 12);          // 4 cycles
    else {
      // linear chirp: frequency rises from 0.02 to 0.25 cycles per sample
      const f0 = 0.02, f1 = 0.25;
      s[n] = Math.cos(2 * Math.PI * (f0 * n + (f1 - f0) / (2 * L) * n * n));
    }
  }
  return s;
}

// Cross-correlation in the chapter's notation: R_rs[m] = sum_k r[k] s[k - m].
// Only lags where the template lies fully inside the record are computed.
function crossCorrelate(r, s) {
  const L = s.length;
  const out = new Float64Array(r.length - L + 1);
  for (let m = 0; m < out.length; m++) {
    let acc = 0;
    for (let j = 0; j < L; j++) acc += r[m + j] * s[j];
    out[m] = acc;
  }
  return out;
}

// Matched filter: the template reversed in time (a real template needs no conjugate).
function matchedFilter(s) {
  const L = s.length;
  const h = new Array(L);
  for (let n = 0; n < L; n++) h[n] = s[L - 1 - n];
  return h;
}

// Discrete convolution y[n] = sum_k x[k] h[n - k]; output length is x.length + h.length - 1.
function convolve(x, h) {
  const out = new Float64Array(x.length + h.length - 1);
  for (let k = 0; k < x.length; k++) {
    for (let j = 0; j < h.length; j++) out[k + j] += x[k] * h[j];
  }
  return out;
}

function buildModel(kind, snrDb, count, threshold, seedValue) {
  const s = makeTemplate(kind);
  const L = s.length;
  let energy = 0;
  for (const v of s) energy += v * v;
  const signalPower = energy / L;                       // average power over the template
  const sigma = Math.sqrt(signalPower / Math.pow(10, snrDb / 10));

  // true delays: sorted, at least 1.5 template lengths apart
  const rand = makeRandom(seedValue * 7919 + count);
  const gap = Math.ceil(1.5 * L);
  const free = (N - L - 2 * EDGE) - (count - 1) * gap;
  const offsets = [];
  for (let i = 0; i < count; i++) offsets.push(Math.floor(rand() * (free + 1)));
  offsets.sort((a, b) => a - b);
  const delays = offsets.map((u, i) => EDGE + u + i * gap);

  // received signal = templates at the delays + noise
  const clean = new Float64Array(N);
  for (const d of delays) for (let j = 0; j < L; j++) clean[d + j] += s[j];
  const unitNoise = gaussianSequence(N, makeRandom(seedValue));
  const r = new Float64Array(N);
  for (let n = 0; n < N; n++) r[n] = clean[n] + sigma * unitNoise[n];

  // normalized correlation: a clean, isolated template gives a peak of exactly 1
  const raw = crossCorrelate(r, s);
  const c = new Float64Array(raw.length);
  for (let m = 0; m < raw.length; m++) c[m] = raw[m] / energy;
  const outputNoise = sigma / Math.sqrt(energy);        // standard deviation of the noise in c[m]

  // moving average of the same length, scaled to the same output noise level
  const avg = new Float64Array(raw.length);
  let running = 0;
  for (let n = 0; n < L; n++) running += r[n];
  for (let m = 0; m < raw.length; m++) {
    avg[m] = running / Math.sqrt(L * energy);
    if (m + L < N) running += r[m + L] - r[m];
  }

  // peak detection: local maxima above the threshold, at most one per template length
  const tolerance = Math.floor(L / 4);
  const detections = [];
  for (let m = 0; m < c.length; m++) {
    if (c[m] < threshold) continue;
    let isPeak = true;
    for (let j = Math.max(0, m - L); j <= Math.min(c.length - 1, m + L); j++) {
      if (c[j] > c[m] || (c[j] === c[m] && j < m)) { isPeak = false; break; }
    }
    if (!isPeak) continue;
    let error = Infinity;
    for (const d of delays) if (Math.abs(m - d) < Math.abs(error)) error = m - d;
    detections.push({
      lag: m, value: c[m], snrDb: 20 * Math.log10(c[m] / outputNoise),
      hit: Math.abs(error) <= tolerance, error: error
    });
  }
  const found = delays.filter(d => detections.some(p => Math.abs(p.lag - d) <= tolerance)).length;
  let worstError = 0;
  for (const p of detections) if (p.hit) worstError = Math.max(worstError, Math.abs(p.error));

  return {
    kind: kind, s: s, h: matchedFilter(s), L: L, energy: energy, sigma: sigma, delays: delays,
    r: r, c: c, avg: avg, outputNoise: outputNoise, detections: detections, found: found,
    falseAlarms: detections.filter(p => !p.hit).length, worstError: worstError,
    gainDb: 10 * Math.log10(L), expectedPeakDb: snrDb + 10 * Math.log10(L)
  };
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function draw() {
  updateCanvasSize();
  if (canvasWidth !== width) {          // the container changed width without a window resize event
    resizeCanvas(canvasWidth, canvasHeight);
    positionControls();
  }

  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  const key = [templateSelect.value(), snrSlider.value(), countSlider.value(), thresholdSlider.value(), seed].join('|');
  if (key !== modelKey) {
    model = buildModel(templateSelect.value(), snrSlider.value(), countSlider.value(), thresholdSlider.value(), seed);
    modelKey = key;
  }
  const showTruth = truthCheckbox.checked();

  const left = 46, right = 16;
  const full = canvasWidth - left - right;
  const halfW = (full - 46) / 2;
  const pReceived = { x: left, y: 54, w: full, h: 100 };
  const pTemplate = { x: left, y: 194, w: halfW, h: 60 };
  const pFilter = { x: left + halfW + 46, y: 194, w: halfW, h: 60 };
  const pCorr = { x: left, y: 296, w: full, h: 120 };

  drawReceived(pReceived, showTruth);
  drawStemPlot(pTemplate, model.s, 'blue', ['Template s[n]']);
  drawStemPlot(pFilter, model.h, 'red', ['Matched filter h[n] = s[L − 1 − n]', 'h[n] = s[L−1−n]']);
  drawCorrelation(pCorr, showTruth);

  // title
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(canvasWidth < 600 ? 18 : 22);
  text('Correlation and Matched Filtering', canvasWidth / 2, 8);

  drawSummary(showTruth);
  drawControlLabels();
}

function symmetricLimit(data, minimum) {
  let m = minimum;
  for (const v of data) m = Math.max(m, Math.abs(v));
  const steps = [1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
  for (const s of steps) if (m <= s) return s;
  return Math.ceil(m / 5) * 5;
}

// Font sizes: larger when the canvas is wide, smaller (never below 11 px) on a phone.
function isNarrow() { return canvasWidth < 600; }
function tickSize() { return isNarrow() ? 11 : 13; }
function captionSize() { return isNarrow() ? 12 : 14; }

// Caption above a plot.  `names` lists alternatives from longest to shortest; the longest one
// that fits next to the optional legend entry and the axis name is used.
function caption(p, names, col, rightText, legendText, legendColor) {
  noStroke();
  textStyle(NORMAL);
  textSize(tickSize());
  const rightW = rightText ? fontWidth(rightText) : 0;
  textSize(captionSize());
  const legendW = legendText ? fontWidth(legendText) + 16 : 0;
  const room = p.w - rightW - legendW - 12;
  textStyle(BOLD);
  let name = names[names.length - 1];
  for (const candidate of names) {
    if (fontWidth(candidate) <= room) { name = candidate; break; }
  }
  fill(col);
  textAlign(LEFT, BOTTOM);
  text(name, p.x, p.y - 4);
  if (legendText) {
    const nameW = fontWidth(name);
    textStyle(NORMAL);
    fill(legendColor);
    text(legendText, p.x + nameW + 16, p.y - 4);
  }
  textStyle(NORMAL);
  if (rightText) {
    fill('black');
    textSize(tickSize());
    textAlign(RIGHT, BOTTOM);
    text(rightText, p.x + p.w, p.y - 4);
  }
}

function frame(p, xMax, xTick, yTicks, Y) {
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(tickSize());
  for (const v of yTicks) {
    stroke(v === 0 ? 'gray' : 'gainsboro');
    line(p.x, Y(v), p.x + p.w, Y(v));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(v, p.x - 5, Y(v));
  }
  for (let v = 0; v <= xMax; v += xTick) {
    const x = p.x + v / xMax * p.w;
    stroke('gainsboro');
    line(x, p.y, x, p.y + p.h);
    noStroke();
    fill('black');
    textAlign(CENTER, TOP);
    text(v, x, p.y + p.h + 4);
  }
}

function shadeTrueSignals(p) {
  noStroke();
  fill(60, 179, 113, 55);
  for (const d of model.delays) {
    rect(p.x + d / N * p.w, p.y + 1, model.L / N * p.w, p.h - 2);
  }
}

function drawReceived(p, showTruth) {
  const lim = symmetricLimit(model.r, 1.5);
  const Y = v => p.y + p.h / 2 - (v / (lim * 1.1)) * (p.h / 2);
  frame(p, N, 100, [-lim, 0, lim], Y);
  if (showTruth) shadeTrueSignals(p);
  stroke('steelblue');
  strokeWeight(1);
  noFill();
  beginShape();
  for (let n = 0; n < N; n++) vertex(p.x + n / N * p.w, Y(model.r[n]));
  endShape();
  caption(p, ['Received signal r[n] = templates + noise', 'Received signal r[n]'], 'steelblue', 'sample n');
  if (showTruth) {
    noStroke();
    fill('darkgreen');
    textSize(tickSize());
    textAlign(LEFT, TOP);
    for (const d of model.delays) text('n=' + d, p.x + d / N * p.w + 2, p.y + 2);
  }
}

function drawStemPlot(p, data, col, name) {   // name: caption alternatives
  const L = data.length;
  const Y = v => p.y + p.h / 2 - (v / 1.25) * (p.h / 2);
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(tickSize());
  for (const v of [-1, 0, 1]) {
    stroke(v === 0 ? 'gray' : 'gainsboro');
    line(p.x, Y(v), p.x + p.w, Y(v));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(v, p.x - 5, Y(v));
  }
  const X = n => p.x + (n + 0.5) / L * p.w;
  for (let n = 0; n < L; n++) {
    stroke(col);
    strokeWeight(1);
    line(X(n), Y(0), X(n), Y(data[n]));
    noStroke();
    fill(col);
    circle(X(n), Y(data[n]), 4);
  }
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  for (const n of [0, Math.floor(L / 2), L - 1]) text(n, X(n), p.y + p.h + 4);
  caption(p, name, col, 'n');
}

function drawCorrelation(p, showTruth) {
  const c = model.c;
  const showAvg = averageCheckbox.checked();
  const headRoom = 50;                       // px above the largest value, for the peak labels
  let lo = -0.5, hi = 1.5;
  for (const v of c) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  if (showAvg) for (const v of model.avg) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const dataMax = hi;
  lo = Math.floor(lo * 2) / 2;
  hi = lo + (hi - lo) * p.h / (p.h - headRoom);
  const Y = v => p.y + p.h - (v - lo) / (hi - lo) * p.h;
  const X = m => p.x + m / N * p.w;
  const ticks = [0, 1];
  if (lo <= -1) ticks.unshift(-1);
  if (dataMax >= 2.2) ticks.push(2);
  frame(p, N, 100, ticks, Y);

  // lags beyond N - L have no full template inside the record, so no correlation is computed there
  noStroke();
  fill(120, 120, 120, 30);
  const noOverlapW = p.x + p.w - X(c.length);
  rect(X(c.length), p.y + 1, noOverlapW, p.h - 2);
  if (noOverlapW >= 44) {
    fill(90);
    textSize(11);
    textAlign(CENTER, TOP);
    text('no full\noverlap', X(c.length) + noOverlapW / 2, p.y + 4);
  }

  if (showTruth) {
    stroke('mediumseagreen');
    drawingContext.setLineDash([3, 3]);
    for (const d of model.delays) line(X(d), p.y, X(d), p.y + p.h);
    drawingContext.setLineDash([]);
  }

  stroke('purple');
  strokeWeight(1.5);
  noFill();
  beginShape();
  for (let m = 0; m < c.length; m++) vertex(X(m), Y(c[m]));
  endShape();
  if (showAvg) {
    // dashed and drawn on top, so it still shows when it coincides with the matched filter
    stroke('darkorange');
    drawingContext.setLineDash([5, 4]);
    beginShape();
    for (let m = 0; m < model.avg.length; m++) vertex(X(m), Y(model.avg[m]));
    endShape();
    drawingContext.setLineDash([]);
  }
  strokeWeight(1);

  // threshold
  const th = thresholdSlider.value();
  stroke('firebrick');
  drawingContext.setLineDash([6, 4]);
  line(p.x, Y(th), p.x + p.w, Y(th));
  drawingContext.setLineDash([]);
  noStroke();
  fill('firebrick');
  textSize(tickSize());
  textAlign(RIGHT, BOTTOM);
  text('threshold', p.x + p.w - 3, Y(th) - 1);

  drawPeakLabels(p, X, Y, showTruth);

  caption(p, ['Normalized cross-correlation of r[n] with s[n] = matched filter output',
              'Cross-correlation of r[n] with s[n] (matched filter output)',
              'Correlation of r[n] with s[n]'],
          'purple', 'lag m',
          showAvg ? (isNarrow() ? 'moving avg (dashed)' : 'moving average (dashed)') : null, 'chocolate');
}

// Detected peaks: a marker plus the lag and the measured SNR.  Two-line labels normally; when
// neighbouring labels would collide (narrow canvas, many signals) the labels become one line
// and alternate between two heights.
function drawPeakLabels(p, X, Y, showTruth) {
  const dets = model.detections;
  if (dets.length === 0) return;
  const fs = isNarrow() ? 11 : 12;
  textSize(fs);
  textStyle(NORMAL);
  let twoLineW = 0;
  for (const d of dets) {
    twoLineW = Math.max(twoLineW, fontWidth('m=' + d.lag), fontWidth(d.snrDb.toFixed(1) + ' dB'));
  }
  twoLineW += 8;
  let crowded = false;
  for (let i = 1; i < dets.length; i++) {
    if (X(dets[i].lag) - X(dets[i - 1].lag) < twoLineW + 2) crowded = true;
  }
  const boxH = crowded ? fs + 5 : 2 * fs + 3;
  dets.forEach((d, i) => {
    const px = X(d.lag), py = Y(d.value);
    const col = !showTruth ? 'purple' : (d.hit ? 'darkgreen' : 'firebrick');
    noStroke();
    fill(col);
    triangle(px - 5, py - 12, px + 5, py - 12, px, py - 3);
    const line1 = crowded ? d.lag + ': ' + d.snrDb.toFixed(1) + ' dB' : 'm=' + d.lag;
    const boxW = crowded ? fontWidth(line1) + 6 : twoLineW;
    const lx = constrain(px, p.x + boxW / 2 + 1, p.x + p.w - boxW / 2 - 1);
    const lift = crowded && i % 2 === 1 ? boxH + 1 : 0;
    const boxBottom = py - 13 - lift;
    fill(255, 255, 255, 235);
    rect(lx - boxW / 2, boxBottom - boxH, boxW, boxH, 3);
    fill(col);
    textAlign(CENTER, BOTTOM);
    if (crowded) {
      text(line1, lx, boxBottom - 2);
    } else {
      text(line1, lx, boxBottom - fs - 2);
      text(d.snrDb.toFixed(1) + ' dB', lx, boxBottom - 2);
    }
  });
}

function drawSummary(showTruth) {
  const px = 10, py = 440, pw = canvasWidth - 20, ph = 54;
  fill(255, 255, 255, 230);
  stroke('silver');
  strokeWeight(1);
  rect(px, py, pw, ph, 10);
  const narrow = isNarrow();
  noStroke();
  textAlign(LEFT, TOP);
  textStyle(NORMAL);
  textSize(narrow ? 11 : 14);
  fill('black');
  const snr = snrSlider.value();
  text((narrow ? 'Peak SNR = input SNR + 10·log₁₀(L) = ' : 'Expected peak SNR = input SNR + 10·log₁₀(L) = ') +
    snr + ' + ' + model.gainDb.toFixed(1) + ' = ' + model.expectedPeakDb.toFixed(1) + ' dB   (L = ' + model.L + ')',
    px + 10, py + 8);
  let line2;
  if (showTruth) {
    line2 = 'Detected ' + model.found + ' of ' + model.delays.length + ' signals, ' +
      model.falseAlarms + (model.falseAlarms === 1 ? ' false alarm' : ' false alarms') +
      (model.found > 0 ? ', largest timing error ' + model.worstError + (model.worstError === 1 ? ' sample' : ' samples') : '');
    fill(model.found === model.delays.length && model.falseAlarms === 0 ? 'darkgreen' : 'firebrick');
  } else {
    line2 = model.detections.length + (model.detections.length === 1 ? ' peak' : ' peaks') +
      ' above the threshold at lags: ' + (model.detections.map(d => d.lag).join(', ') || 'none');
    fill('purple');
  }
  text(line2, px + 10, py + 30);
}

function drawControlLabels() {
  const narrow = canvasWidth < 600;
  const half = canvasWidth / 2;
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  textSize(narrow ? 13 : defaultTextSize);
  text('Template:', 10, drawHeight + 17);
  text((narrow ? 'SNR: ' : 'Input SNR: ') + snrSlider.value() + ' dB', 10, drawHeight + 52);
  text((narrow ? 'Signals: ' : 'Number of signals: ') + countSlider.value(), half + 10, drawHeight + 52);
  text((narrow ? 'Thresh: ' : 'Threshold: ') + thresholdSlider.value().toFixed(2), 10, drawHeight + 87);
}

// ---------------------------------------------------------------------------
// Responsive layout
// ---------------------------------------------------------------------------

function positionControls() {
  const narrow = isNarrow();
  const half = canvasWidth / 2;
  // shorter option names on a phone so the drop-down is not cut off
  const names = narrow ? ['Rectangular', 'Sine burst', 'Chirp', 'Barker-13']
                       : ['Rectangular pulse', 'Sine burst', 'Chirp (rising frequency)', 'Barker-13 code'];
  const options = templateSelect.elt.options;
  for (let i = 0; i < options.length && i < names.length; i++) options[i].text = names[i];
  templateSelect.position(narrow ? 80 : 90, drawHeight + 6);
  templateSelect.style('max-width', Math.max(80, half - (narrow ? 85 : 100)) + 'px');
  noiseButton.position(half + 10, drawHeight + 5);
  const labelW = narrow ? 100 : sliderLeftMargin;
  snrSlider.position(labelW, drawHeight + 42);
  snrSlider.size(Math.max(40, half - labelW - 12));
  const labelW2 = narrow ? 85 : sliderLeftMargin + 15;
  countSlider.position(half + labelW2, drawHeight + 42);
  countSlider.size(Math.max(40, half - labelW2 - 12));
  thresholdSlider.position(labelW, drawHeight + 77);
  thresholdSlider.size(Math.max(40, half - labelW - 12));
  if (narrow) {
    // stacked, so neither label wraps
    averageCheckbox.position(half + 8, drawHeight + 66);
    truthCheckbox.position(half + 8, drawHeight + 87);
  } else {
    averageCheckbox.position(half + 8, drawHeight + 78);
    truthCheckbox.position(half + 168, drawHeight + 78);
  }
  averageCheckbox.style('font-size', narrow ? '12px' : '15px');
  truthCheckbox.style('font-size', narrow ? '12px' : '15px');
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
