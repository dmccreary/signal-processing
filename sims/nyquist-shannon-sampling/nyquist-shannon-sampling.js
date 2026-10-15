// Nyquist-Shannon Sampling Rate MicroSim
// CANVAS_HEIGHT: 500
// A 5 Hz sine wave is sampled at the rate fs set by the slider. The upper plot shows the
// original signal with its samples (red dots). The lower plot rebuilds a continuous signal
// from those samples in two ways: ideal (sinc) interpolation, which is the reconstruction the
// sampling theorem promises, and straight lines joining the dots. A status line reports
// whether fs is above the Nyquist rate 2f and, if it is not, the alias frequency.

// Canvas dimensions
let canvasWidth = 450;               // overwritten from the container in updateCanvasSize()
let drawHeight = 450;
let controlHeight = 50;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let sliderLeftMargin = 215;
let defaultTextSize = 16;

// The signal: x(t) = sin(2 pi f t), shown over a 1 second window
const SIGNAL_FREQ = 5;               // Hz
const WINDOW = 1;                    // s
const Y_RANGE = 1.3;                 // the plots show amplitudes from -Y_RANGE to +Y_RANGE
const EXTRA_SAMPLES = 2000;          // samples used beyond each edge of the window by the sinc sum

// Colors (the original sketch: black signal, red samples, blue reconstruction)
const SAMPLE_RED = 'rgb(230, 0, 0)';
const RECON_BLUE = 'blue';
const LINEAR_GRAY = 'rgb(150, 150, 150)';
const OK_GREEN = 'rgb(20, 120, 50)';
const EXACT_GOLD = 'rgb(140, 95, 0)';
const ALIAS_RED = 'rgb(190, 0, 0)';

// UI control
let samplingRateSlider;
let samplingRate = 22;               // initial sampling rate in Hz (4.4 samples per period)

// Plot geometry, recomputed every frame from canvasWidth
let plotLeft, plotRight;

// Reconstructed values, recomputed only when fs or the plot width changes
let reconKey = '';
let sincValues = [];
let linearValues = [];

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textFont('Arial');
  textSize(defaultTextSize);

  // slider to select the sampling rate fs in Hz (samples per second)
  samplingRateSlider = createSlider(1, 50, samplingRate, 0.1);
  samplingRateSlider.position(sliderLeftMargin, drawHeight + 15);
  samplingRateSlider.attribute('aria-label', 'Sampling rate in hertz');
  sizeSlider();

  describe('A 5 hertz sine wave is sampled at the rate set by the slider, from 1 to 50 samples per second. ' +
           'The upper plot shows the original wave and its samples as red dots. The lower plot shows the ideal ' +
           'sinc reconstruction in blue and a straight-line connect-the-dots reconstruction in gray. ' +
           'A status line says whether the sampling rate is above the Nyquist rate of 10 hertz and gives the alias frequency when it is not.');
}

function draw() {
  updateCanvasSize();
  if (width !== canvasWidth) resizeCanvas(canvasWidth, canvasHeight);

  samplingRate = samplingRateSlider.value();
  const fs = samplingRate;
  const status = nyquistStatus(fs);

  // Backgrounds: drawing region and control region
  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  // Title
  let y = 8;
  fill('black');
  noStroke();
  textStyle(NORMAL);
  textSize(24);
  textAlign(CENTER, TOP);
  text(fitText(['Nyquist-Shannon Sampling Rate', 'Nyquist-Shannon Sampling'], canvasWidth - 16), canvasWidth / 2, y);
  y += 34;

  // Read-out of the quantities used in the lesson
  textSize(defaultTextSize);
  textAlign(LEFT, TOP);
  const segments = [
    'Signal f = ' + SIGNAL_FREQ + ' Hz',
    'Nyquist rate 2f = ' + (2 * SIGNAL_FREQ) + ' Hz',
    'Nyquist frequency fs/2 = ' + (fs / 2).toFixed(2) + ' Hz',
    'fs/f = ' + (fs / SIGNAL_FREQ).toFixed(2) + ' samples per period'
  ];
  fill('black');
  for (const segs of packSegments(segments, canvasWidth - 20, 28)) {
    drawSegments(segs, 10, y, 28);
    y += 21;
  }

  // Nyquist indicator
  textStyle(BOLD);
  fill(status.color);
  for (const ln of wrapWords(status.message, canvasWidth - 20)) {
    text(ln, 10, y);
    y += 21;
  }
  textStyle(NORMAL);
  y += 4;

  // Vertical layout of the two plots
  plotLeft = 36;
  plotRight = canvasWidth - 16;
  updateReconstruction(fs);

  const legendItems = legendFor(canvasWidth);
  const label2 = 'Reconstructed from the samples';
  const legendW = legendWidth(legendItems);
  const legendOnLabelRow = advance(label2) + 24 + legendW <= plotRight - 10;
  const label1H = 22;
  const label2H = legendOnLabelRow ? 22 : 44;
  const gap = 12;
  const axisRows = 40;               // tick labels and the axis title under the lower plot
  const plotH = Math.max(50, (drawHeight - y - label1H - label2H - gap - axisRows - 4) / 2);

  const p1Top = y + label1H;
  const p1Bottom = p1Top + plotH;
  const p2Top = p1Bottom + gap + label2H;
  const p2Bottom = p2Top + plotH;

  // Upper plot: the original signal with its samples
  fill('black');
  noStroke();
  textSize(defaultTextSize);
  textAlign(LEFT, BOTTOM);
  text(fitText(['Original signal x(t) = sin(2π·5t) with its samples',
                'Original signal (5 Hz) with its samples',
                'Original signal and samples'], plotRight - 10), 10, p1Top - 4);
  drawPlotFrame(p1Top, p1Bottom);
  drawOriginal(p1Top, p1Bottom);
  drawSamples(fs, p1Top, p1Bottom);

  // Lower plot: the reconstructions
  fill('black');
  noStroke();
  textAlign(LEFT, BOTTOM);
  text(label2, 10, p2Top - 4 - (legendOnLabelRow ? 0 : 22));
  if (legendOnLabelRow) drawLegend(legendItems, plotRight - legendW, p2Top - 13);
  else drawLegend(legendItems, 10, p2Top - 13);
  drawPlotFrame(p2Top, p2Bottom);
  drawCurve(linearValues, p2Top, p2Bottom, LINEAR_GRAY, 1.5);
  drawCurve(sincValues, p2Top, p2Bottom, RECON_BLUE, 2.5);
  drawSamples(fs, p2Top, p2Bottom);
  drawTimeAxis(p2Bottom);

  // Control label
  fill('black');
  noStroke();
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  text('Sampling rate fs: ' + fs.toFixed(1) + ' Hz', 10, drawHeight + 25);
}

// ---------------------------------------------------------------- the model

// x(t) = sin(2 pi f t)
function signalAt(t) {
  return Math.sin(2 * Math.PI * SIGNAL_FREQ * t);
}

// Fold f into [-fs/2, fs/2]: the samples of sin(2 pi f t) equal those of sin(2 pi fr t)
function nyquistStatus(fs) {
  const fr = SIGNAL_FREQ - fs * Math.round(SIGNAL_FREQ / fs);
  const fa = Math.abs(fr);
  const allZero = fa < 1e-9 || Math.abs(fa - fs / 2) < 1e-9;  // every sample lands on a zero crossing
  const nyquistRate = 2 * SIGNAL_FREQ;
  if (fs > nyquistRate + 1e-9) {
    return { color: OK_GREEN, message: 'fs > 2f: no aliasing. The samples determine the 5\u00A0Hz wave exactly.' };
  }
  if (Math.abs(fs - nyquistRate) <= 1e-9) {
    return { color: EXACT_GOLD, message: 'fs = 2f exactly: every sample falls on a zero crossing, so the wave is lost.' };
  }
  if (allZero) {
    return { color: ALIAS_RED, message: 'fs < 2f: ALIASING. Every sample is 0, so the reconstruction is a flat line.' };
  }
  return { color: ALIAS_RED, message: 'fs < 2f: ALIASING. The samples also fit a ' + fa.toFixed(1) + '\u00A0Hz wave.' };
}

// Rebuild the continuous signal from the samples x[n] = x(n / fs), once per pixel column.
// Ideal (Whittaker-Shannon) interpolation: x_r(t) = sum_n x[n] sinc(fs t - n), using the samples in
// the window plus EXTRA_SAMPLES more on each side to stand in for the infinite sample train.
// Since sin(pi (u - n)) = (-1)^n sin(pi u), each column needs one sine and one division per sample.
function updateReconstruction(fs) {
  const cols = Math.max(2, Math.round(plotRight - plotLeft) + 1);
  const key = fs.toFixed(4) + '|' + cols;
  if (key === reconKey) return;
  reconKey = key;

  const n0 = -EXTRA_SAMPLES;
  const n1 = Math.floor(fs * WINDOW) + EXTRA_SAMPLES;
  const weighted = new Float64Array(n1 - n0 + 1);   // (-1)^n x[n]
  for (let n = n0; n <= n1; n++) {
    weighted[n - n0] = ((n & 1) ? -1 : 1) * signalAt(n / fs);
  }

  sincValues = new Array(cols);
  linearValues = new Array(cols);
  for (let c = 0; c < cols; c++) {
    const t = WINDOW * c / (cols - 1);
    const u = fs * t;                    // time measured in sample periods
    const nearest = Math.round(u);
    let value;
    if (Math.abs(u - nearest) < 1e-9) {
      value = signalAt(nearest / fs);    // exactly on a sample
    } else {
      let acc = 0;
      for (let n = n0; n <= n1; n++) acc += weighted[n - n0] / (u - n);
      value = Math.sin(Math.PI * u) * acc / Math.PI;
    }
    sincValues[c] = value;

    // straight lines between neighbouring samples (connect the dots)
    const k = Math.floor(u);
    const frac = u - k;
    linearValues[c] = (1 - frac) * signalAt(k / fs) + frac * signalAt((k + 1) / fs);
  }
}

// ---------------------------------------------------------------- drawing

function tToX(t) {
  return plotLeft + (t / WINDOW) * (plotRight - plotLeft);
}

function yToPx(v, top, bottom) {
  return (top + bottom) / 2 - v * (bottom - top) / 2 / Y_RANGE;
}

function drawPlotFrame(top, bottom) {
  // light grid: every 0.1 s and at -1, 0, +1
  stroke(215);
  strokeWeight(1);
  for (let i = 0; i <= 10; i++) {
    const x = tToX(i * WINDOW / 10);
    line(x, top, x, bottom);
  }
  for (const v of [-1, 1]) line(plotLeft, yToPx(v, top, bottom), plotRight, yToPx(v, top, bottom));

  // dashed zero line
  stroke('gray');
  drawingContext.setLineDash([5, 5]);
  line(plotLeft, yToPx(0, top, bottom), plotRight, yToPx(0, top, bottom));
  drawingContext.setLineDash([]);

  noFill();
  stroke('silver');
  rect(plotLeft, top, plotRight - plotLeft, bottom - top);

  // amplitude tick labels
  noStroke();
  fill(60);
  textSize(14);
  textAlign(RIGHT, CENTER);
  text('+1', plotLeft - 5, yToPx(1, top, bottom));
  text('0', plotLeft - 5, yToPx(0, top, bottom));
  text('−1', plotLeft - 5, yToPx(-1, top, bottom));
  textSize(defaultTextSize);
}

function drawOriginal(top, bottom) {
  noFill();
  stroke('black');
  strokeWeight(2);
  beginShape();
  for (let px = plotLeft; px <= plotRight; px++) {
    const t = WINDOW * (px - plotLeft) / (plotRight - plotLeft);
    vertex(px, yToPx(signalAt(t), top, bottom));
  }
  endShape();
}

function drawCurve(values, top, bottom, col, weight) {
  const cols = values.length;
  noFill();
  stroke(col);
  strokeWeight(weight);
  beginShape();
  for (let c = 0; c < cols; c++) {
    vertex(plotLeft + (plotRight - plotLeft) * c / (cols - 1), yToPx(values[c], top, bottom));
  }
  endShape();
}

// red dots at t = n / fs for every sample inside the window
function drawSamples(fs, top, bottom) {
  noStroke();
  fill(SAMPLE_RED);
  const last = Math.floor(fs * WINDOW + 1e-9);
  for (let n = 0; n <= last; n++) {
    const t = n / fs;
    circle(tToX(t), yToPx(signalAt(t), top, bottom), 8);
  }
}

function drawTimeAxis(bottom) {
  noStroke();
  fill(60);
  textSize(14);
  textAlign(CENTER, TOP);
  const step = (plotRight - plotLeft) / 10 >= 34 ? 1 : 2;   // label every 0.1 s, or every 0.2 s when narrow
  for (let i = 0; i <= 10; i += step) {
    text((i * WINDOW / 10).toFixed(1), tToX(i * WINDOW / 10), bottom + 4);
  }
  fill('black');
  textSize(defaultTextSize);
  text('time t (s)', (plotLeft + plotRight) / 2, bottom + 21);
}

// Legend for the lower plot; shorter wording on narrow canvases
function legendFor(w) {
  if (w >= 560) {
    return [
      { kind: 'line', color: RECON_BLUE, weight: 2.5, label: 'ideal (sinc) reconstruction' },
      { kind: 'line', color: LINEAR_GRAY, weight: 1.5, label: 'straight lines' },
      { kind: 'dot', color: SAMPLE_RED, label: 'samples' }
    ];
  }
  return [
    { kind: 'line', color: RECON_BLUE, weight: 2.5, label: 'sinc (ideal)' },
    { kind: 'line', color: LINEAR_GRAY, weight: 1.5, label: 'straight lines' },
    { kind: 'dot', color: SAMPLE_RED, label: 'samples' }
  ];
}

const SWATCH = 22, SWATCH_GAP = 6, ITEM_GAP = 16;

function legendWidth(items) {
  textSize(defaultTextSize);
  let w = 0;
  for (const it of items) w += SWATCH + SWATCH_GAP + advance(it.label) + ITEM_GAP;
  return w - ITEM_GAP;
}

function drawLegend(items, x, yMid) {
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  for (const it of items) {
    if (it.kind === 'line') {
      stroke(it.color);
      strokeWeight(it.weight);
      line(x, yMid, x + SWATCH, yMid);
    } else {
      noStroke();
      fill(it.color);
      circle(x + SWATCH / 2, yMid, 8);
    }
    noStroke();
    fill('black');
    text(it.label, x + SWATCH + SWATCH_GAP, yMid);
    x += SWATCH + SWATCH_GAP + advance(it.label) + ITEM_GAP;
  }
}

// ---------------------------------------------------------------- text helpers

// advance width: in p5 2.x textWidth() measures tight bounds and ignores spaces,
// so text placed side by side is measured with fontWidth() when it exists
function advance(s) {
  return typeof fontWidth === 'function' ? fontWidth(s) : textWidth(s);
}

// first candidate string that fits in maxW at the current text size
function fitText(candidates, maxW) {
  for (const c of candidates) if (advance(c) <= maxW) return c;
  return candidates[candidates.length - 1];
}

// pack read-out segments into as few lines as fit in maxW; returns one array of segments per line
function packSegments(segments, maxW, gap) {
  const lines = [];
  let cur = [];
  let curW = 0;
  for (const s of segments) {
    const w = advance(s);
    if (cur.length && curW + gap + w > maxW) {
      lines.push(cur);
      cur = [];
      curW = 0;
    }
    curW += (cur.length ? gap : 0) + w;
    cur.push(s);
  }
  if (cur.length) lines.push(cur);
  return lines;
}

// draw one packed line of segments starting at x
function drawSegments(segs, x, y, gap) {
  for (const s of segs) {
    text(s, x, y);
    x += advance(s) + gap;
  }
}

// word-wrap a sentence to maxW at the current text size and style
function wrapWords(str, maxW) {
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (cur && advance(trial) > maxW) {
      lines.push(cur);
      cur = w;
    } else {
      cur = trial;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- layout

function sizeSlider() {
  if (samplingRateSlider) samplingRateSlider.size(Math.max(80, canvasWidth - sliderLeftMargin - margin));
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = Math.floor(container.getBoundingClientRect().width);
  sizeSlider();
}
