// Sampling Theorem Explorer MicroSim
// CANVAS_HEIGHT: 625
// A sine wave x(t) = sin(2 pi f t) is sampled at rate fs and rebuilt from its
// samples.  When fs > 2 f the ideal (sinc) reconstruction returns the original
// tone; otherwise the tone folds to the alias frequency |f - k fs| inside
// [0, fs/2].  The spectrum panel shows the copies at k fs +/- f that cause it.

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 670;
let drawHeight = 510;
let controlHeight = 115;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 245;
let defaultTextSize = 16;

// ---- axes ----
const T_WINDOW = 0.2;     // seconds of signal shown (0 to 200 ms)
const F_AXIS = 200;       // Hz, upper limit of the spectrum axis

// ---- controls ----
let freqSlider, rateSlider, reconSelect, sincCheckbox;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  freqSlider = createSlider(1, 100, 20, 1);
  rateSlider = createSlider(1, 200, 50, 1);

  reconSelect = createSelect();
  reconSelect.option('Ideal (sinc interpolation)', 'ideal');
  reconSelect.option('Practical: zero-order hold', 'zoh');
  reconSelect.option('Practical: linear interpolation', 'linear');
  reconSelect.selected('ideal');

  sincCheckbox = createCheckbox(' Show sinc pulses', false);

  const mainElement = document.querySelector('main');
  [freqSlider, rateSlider, reconSelect, sincCheckbox].forEach(c => c.parent(mainElement));
  positionControls();

  describe('Four plots: a continuous sine wave, its samples, the signal reconstructed from the samples, ' +
    'and the frequency spectrum with the Nyquist frequency marked. A banner states whether the sampling ' +
    'rate is high enough or the tone is aliased to a lower frequency.', LABEL);
}

// ---------------------------------------------------------------------------
// Sampling model
// ---------------------------------------------------------------------------

function sinc(v) {
  if (Math.abs(v) < 1e-12) return 1;
  return Math.sin(Math.PI * v) / (Math.PI * v);
}

// Everything that follows from the two slider values.
//   baseband  signed frequency of the tone after folding: f - k fs, with k = round(f / fs)
//   alias     |baseband|, the frequency actually seen in [0, fs/2]
//   status    'ok' (fs > 2f), 'critical' (fs = 2f) or 'aliased' (fs < 2f)
function analyze(f, fs) {
  const k = Math.round(f / fs);
  const baseband = f - k * fs;
  const alias = Math.abs(baseband);
  // sin(2 pi f n / fs) is zero at every sample when 2f/fs is a whole number
  const allZero = Math.abs(2 * f / fs - Math.round(2 * f / fs)) < 1e-9;
  let status = 'ok';
  if (Math.abs(fs - 2 * f) < 1e-9) status = 'critical';
  else if (fs < 2 * f) status = 'aliased';
  return { f: f, fs: fs, k: k, baseband: baseband, alias: alias, allZero: allZero, status: status };
}

function original(a, t) { return Math.sin(2 * Math.PI * a.f * t); }

function sampleValue(a, n) {
  if (a.allZero) return 0;
  return Math.sin(2 * Math.PI * a.f * n / a.fs);
}

// Ideal reconstruction: the sum over all n of x[n] sinc(fs t - n).  For a
// sampled sinusoid that infinite sum is the sinusoid at the folded frequency.
function idealReconstruction(a, t) {
  if (a.allZero) return 0;
  return Math.sin(2 * Math.PI * a.baseband * t);
}

function practicalReconstruction(a, t, kind) {
  const pos = t * a.fs;
  const n = Math.floor(pos + 1e-9);
  if (kind === 'zoh') return sampleValue(a, n);                 // hold the last sample
  const frac = pos - n;                                         // straight line to the next sample
  return sampleValue(a, n) * (1 - frac) + sampleValue(a, n + 1) * frac;
}

// Magnitude response of the reconstruction filter, normalized to 1 at f = 0.
function reconstructionGain(kind, f, fs) {
  if (kind === 'ideal') return f < fs / 2 ? 1 : 0;
  if (kind === 'zoh') return Math.abs(sinc(f / fs));
  return sinc(f / fs) * sinc(f / fs);
}

// Spectral lines of the sampled signal: copies of the tone at |f + k fs|.
function spectralLines(a) {
  const lines = [];
  if (a.allZero) return lines;
  for (let k = -Math.ceil((F_AXIS + a.f) / a.fs); k <= Math.ceil((F_AXIS + a.f) / a.fs); k++) {
    const freq = Math.abs(a.f + k * a.fs);
    if (freq <= F_AXIS + 1e-9 && !lines.some(v => Math.abs(v - freq) < 1e-9)) lines.push(freq);
  }
  return lines.sort((p, q) => p - q);
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

  const a = analyze(freqSlider.value(), rateSlider.value());
  const kind = reconSelect.value();
  const statusColor = a.status === 'ok' ? 'darkgreen' : 'firebrick';
  if (kind === 'ideal') sincCheckbox.removeAttribute('disabled');
  else sincCheckbox.attribute('disabled', '');

  const left = 46, right = 16;
  const pw = canvasWidth - left - right;
  const p1 = { x: left, y: 78, w: pw, h: 66 };
  const p2 = { x: left, y: 166, w: pw, h: 66 };
  const p3 = { x: left, y: 254, w: pw, h: 66 };
  const p4 = { x: left, y: 360, w: pw, h: 110 };

  drawBanner(a, statusColor);
  drawContinuous(p1, a);
  drawSamples(p2, a);
  drawReconstruction(p3, a, kind, statusColor);
  drawSpectrum(p4, a, kind, statusColor);

  // title
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(22);
  text('Sampling Theorem Explorer', canvasWidth / 2, 8);

  drawControlLabels(a);
}

function drawBanner(a, statusColor) {
  const narrow = canvasWidth < 600;
  let msg;
  if (a.status === 'ok') {
    msg = 'fs = ' + a.fs + ' Hz > 2·fmax = ' + (2 * a.f) + ' Hz: no aliasing. The ' + a.f + ' Hz tone can be recovered exactly.';
  } else if (a.status === 'critical') {
    msg = 'fs = 2·fmax = ' + a.fs + ' Hz exactly: not enough. Every sample of this sine lands on a zero crossing.';
  } else if (a.allZero) {
    msg = 'fs = ' + a.fs + ' Hz < 2·fmax = ' + (2 * a.f) + ' Hz: ALIASING. Every sample is zero, so the tone vanishes.';
  } else {
    msg = 'fs = ' + a.fs + ' Hz < 2·fmax = ' + (2 * a.f) + ' Hz: ALIASING. The ' + a.f + ' Hz tone appears as ' +
      formatHz(a.alias) + ' Hz.';
  }
  if (narrow) {
    // shorter wording so the banner stays readable on a phone
    if (a.status === 'ok') msg = 'fs = ' + a.fs + ' > 2·fmax = ' + (2 * a.f) + ' Hz: no aliasing';
    else if (a.status === 'critical') msg = 'fs = 2·fmax = ' + a.fs + ' Hz: not enough';
    else if (a.allZero) msg = 'fs = ' + a.fs + ' < 2·fmax = ' + (2 * a.f) + ' Hz: ALIASING, samples all zero';
    else msg = 'fs = ' + a.fs + ' < 2·fmax = ' + (2 * a.f) + ' Hz: ALIASING to ' + formatHz(a.alias) + ' Hz';
  }
  stroke(statusColor);
  strokeWeight(1.5);
  fill(a.status === 'ok' ? 'honeydew' : 'mistyrose');
  rect(10, 34, canvasWidth - 20, 24, 8);
  strokeWeight(1);
  noStroke();
  fill(statusColor);
  textSize(narrow ? 12 : 14);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(msg, canvasWidth / 2, 46);
  textStyle(NORMAL);
}

function formatHz(v) {
  return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1);
}

function timeFrame(p, showTicks) {
  const X = t => p.x + t / T_WINDOW * p.w;
  const Y = v => p.y + p.h / 2 - (v / 1.25) * (p.h / 2);
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(12);
  for (const v of [-1, 0, 1]) {
    stroke(v === 0 ? 'gray' : 'gainsboro');
    line(p.x, Y(v), p.x + p.w, Y(v));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(v, p.x - 5, Y(v));
  }
  for (let ms = 0; ms <= 200; ms += 25) {
    stroke('gainsboro');
    line(X(ms / 1000), p.y, X(ms / 1000), p.y + p.h);
    if (showTicks && ms % 50 === 0) {
      noStroke();
      fill('black');
      textAlign(CENTER, TOP);
      text(ms, X(ms / 1000), p.y + p.h + 4);
    }
  }
  return { X: X, Y: Y };
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

function drawCurve(p, s, fn, col, weight, dashed) {
  stroke(col);
  strokeWeight(weight);
  noFill();
  if (dashed) drawingContext.setLineDash([5, 4]);
  beginShape();
  const n = Math.max(400, Math.floor(p.w * 2));
  for (let i = 0; i <= n; i++) {
    const t = T_WINDOW * i / n;
    vertex(s.X(t), s.Y(fn(t)));
  }
  endShape();
  drawingContext.setLineDash([]);
  strokeWeight(1);
}

function sampleCount(a) { return Math.floor(T_WINDOW * a.fs + 1e-9); }

function drawContinuous(p, a) {
  const s = timeFrame(p, false);
  // faint ticks at the sampling instants
  stroke('lightsalmon');
  for (let n = 0; n <= sampleCount(a); n++) line(s.X(n / a.fs), p.y + p.h - 8, s.X(n / a.fs), p.y + p.h);
  drawCurve(p, s, t => original(a, t), 'blue', 2, false);
  caption(p, 'Continuous signal x(t) = sin(2π·fmax·t),  fmax = ' + a.f + ' Hz', 'blue', 't (ms)');
}

function drawSamples(p, a) {
  const s = timeFrame(p, false);
  drawCurve(p, s, t => original(a, t), 'lightsteelblue', 1, false);
  for (let n = 0; n <= sampleCount(a); n++) {
    const x = s.X(n / a.fs), y = s.Y(sampleValue(a, n));
    stroke('chocolate');
    strokeWeight(1.5);
    line(x, s.Y(0), x, y);
    noStroke();
    fill('chocolate');
    circle(x, y, 6);
  }
  strokeWeight(1);
  caption(p, 'Samples x[n] = x(n·Ts),  Ts = 1/fs = ' + (1000 / a.fs).toFixed(1) + ' ms', 'chocolate', 't (ms)');
}

function drawReconstruction(p, a, kind, statusColor) {
  const s = timeFrame(p, true);
  drawCurve(p, s, t => original(a, t), 'lightsteelblue', 1, true);

  // the individual sinc pulses whose sum is the ideal reconstruction
  if (kind === 'ideal' && sincCheckbox.checked() && !a.allZero) {
    const count = sampleCount(a);
    const extra = Math.min(6, Math.ceil(a.fs * 0.03));
    for (let n = -extra; n <= count + extra; n++) {
      const xn = sampleValue(a, n);
      if (Math.abs(xn) < 1e-9) continue;
      drawCurve(p, s, t => xn * sinc(a.fs * t - n), 'darkgray', 1, false);
    }
  }

  const fn = kind === 'ideal' ? (t => idealReconstruction(a, t)) : (t => practicalReconstruction(a, t, kind));
  drawCurve(p, s, fn, statusColor, 2.5, false);
  noStroke();
  fill('chocolate');
  for (let n = 0; n <= sampleCount(a); n++) circle(s.X(n / a.fs), s.Y(sampleValue(a, n)), 5);

  let name = 'Reconstructed signal';
  if (kind === 'ideal') {
    name += a.allZero ? ': zero' : ': a ' + formatHz(a.alias) + ' Hz sine' + (a.status === 'aliased' ? ' (alias)' : '');
  } else {
    name += kind === 'zoh' ? ' (zero-order hold)' : ' (linear interpolation)';
  }
  caption(p, name, statusColor, canvasWidth < 600 ? 't (ms)' : 'dashed: original x(t)     t (ms)');
}

function drawSpectrum(p, a, kind, statusColor) {
  const X = f => p.x + f / F_AXIS * p.w;
  const Y = v => p.y + p.h - v / 1.3 * p.h;
  const nyquist = a.fs / 2;

  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);

  // usable band 0 ... fs/2
  noStroke();
  fill(a.status === 'ok' ? 'rgba(60, 179, 113, 0.18)' : 'rgba(205, 92, 92, 0.18)');
  rect(p.x + 1, p.y + 1, Math.min(X(nyquist), p.x + p.w) - p.x - 1, p.h - 2);

  textSize(12);
  for (const v of [0, 0.5, 1]) {
    stroke(v === 0 ? 'gray' : 'gainsboro');
    line(p.x, Y(v), p.x + p.w, Y(v));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(v, p.x - 5, Y(v));
  }
  for (let f = 0; f <= F_AXIS; f += 25) {
    stroke('gainsboro');
    line(X(f), p.y, X(f), p.y + p.h);
    noStroke();
    fill('black');
    textAlign(CENTER, TOP);
    text(f, X(f), p.y + p.h + 4);
  }
  noStroke();
  fill('black');
  textSize(13);
  textAlign(CENTER, TOP);
  text('Frequency (Hz)', p.x + p.w / 2, p.y + p.h + 19);

  // reconstruction filter response
  stroke('gray');
  strokeWeight(1.5);
  noFill();
  drawingContext.setLineDash([5, 4]);
  beginShape();
  if (kind === 'ideal') {
    const edge = Math.min(nyquist, F_AXIS);
    vertex(X(0), Y(1)); vertex(X(edge), Y(1));
    if (nyquist <= F_AXIS) { vertex(X(edge), Y(0)); vertex(X(F_AXIS), Y(0)); }
  } else {
    for (let i = 0; i <= 400; i++) {
      const f = F_AXIS * i / 400;
      vertex(X(f), Y(reconstructionGain(kind, f, a.fs)));
    }
  }
  endShape();
  drawingContext.setLineDash([]);
  strokeWeight(1);

  // copies of the tone in the sampled signal (grey), and what the filter lets through (colored)
  const lines = spectralLines(a);
  for (const f of lines) {
    stroke('darkgray');
    strokeWeight(2);
    line(X(f), Y(0), X(f), Y(1));
    const g = reconstructionGain(kind, f, a.fs);
    if (g > 0.004) {
      const inBand = f < nyquist;
      stroke(inBand ? statusColor : 'darkorange');
      strokeWeight(3);
      line(X(f), Y(0), X(f), Y(g));
      noStroke();
      fill(inBand ? statusColor : 'darkorange');
      circle(X(f), Y(g), 7);
    }
  }
  strokeWeight(1);

  // original tone
  noFill();
  stroke('blue');
  strokeWeight(2);
  circle(X(a.f), Y(1), 12);
  strokeWeight(1);

  // markers for the Nyquist frequency and the sampling rate
  textSize(12);
  if (nyquist <= F_AXIS) {
    stroke('black');
    drawingContext.setLineDash([4, 3]);
    line(X(nyquist), p.y, X(nyquist), p.y + p.h);
    drawingContext.setLineDash([]);
  }
  if (a.fs <= F_AXIS) {
    stroke('purple');
    drawingContext.setLineDash([2, 3]);
    line(X(a.fs), p.y, X(a.fs), p.y + p.h);
    drawingContext.setLineDash([]);
  }
  // marker labels, kept inside the plot and on separate rows so they cannot collide
  const tag = (str, f, row, col) => {
    noStroke();
    const w = textWidth(str) + 6;
    const tx = constrain(X(f) + 3, p.x + 2, p.x + p.w - w - 2);
    fill(255, 255, 255, 215);
    rect(tx, p.y + 3 + row * 15, w, 14, 3);
    fill(col);
    textAlign(LEFT, TOP);
    text(str, tx + 3, p.y + 4 + row * 15);
  };
  tag('fmax = ' + a.f + ' Hz', a.f, 0, 'blue');
  if (nyquist <= F_AXIS) tag('fNyq = fs/2 = ' + formatHz(nyquist) + ' Hz', nyquist, 1, 'black');
  if (a.fs <= F_AXIS) tag('fs = ' + a.fs + ' Hz', a.fs, 2, 'purple');
  if (a.status === 'aliased' && !a.allZero) tag('alias ' + formatHz(a.alias) + ' Hz', a.alias, 3, 'firebrick');

  const narrow = canvasWidth < 600;
  caption(p, narrow ? 'Spectrum' : 'Spectrum: copies of the tone at k·fs ± fmax (grey), reconstruction output (colored)',
    'black', narrow ? 'dashed: filter gain' : 'dashed: filter gain');
}

function drawControlLabels(a) {
  const narrow = canvasWidth < 600;
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  textSize(narrow ? 13 : defaultTextSize);
  text((narrow ? 'fmax: ' : 'Signal frequency fmax: ') + a.f + ' Hz', 10, drawHeight + 17);
  text((narrow ? 'fs: ' : 'Sampling rate fs: ') + a.fs + ' Hz', 10, drawHeight + 52);
  text(narrow ? 'Rebuild:' : 'Reconstruction:', 10, drawHeight + 87);
}

// ---------------------------------------------------------------------------
// Responsive layout
// ---------------------------------------------------------------------------

function positionControls() {
  const narrow = canvasWidth < 600;
  const labelW = narrow ? 105 : sliderLeftMargin;
  freqSlider.position(labelW, drawHeight + 7);
  freqSlider.size(canvasWidth - labelW - margin);
  rateSlider.position(labelW, drawHeight + 42);
  rateSlider.size(canvasWidth - labelW - margin);
  const selectLeft = narrow ? 75 : 135;
  reconSelect.position(selectLeft, drawHeight + 76);
  reconSelect.style('max-width', (narrow ? 150 : 260) + 'px');
  sincCheckbox.position(narrow ? selectLeft + 158 : selectLeft + 270, drawHeight + 78);
  sincCheckbox.style('font-size', narrow ? '12px' : '16px');
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
