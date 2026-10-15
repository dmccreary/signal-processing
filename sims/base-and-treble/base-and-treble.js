// Bass and Treble Frequency Response MicroSim
// CANVAS_HEIGHT: 440
// Plots the gain (dB) of a two-knob tone control against frequency (log scale):
// a low shelf (bass, corner 500 Hz) plus a high shelf (treble, corner 2 kHz).
// This is a magnitude-only model; no audio is played.

// Canvas dimensions
let canvasWidth = 450;          // overwritten from the container in updateCanvasSize()
let drawHeight = 360;
let controlHeight = 80;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let sliderLeftMargin = 190;     // room for "Bass: 100 (+12.0 dB)"
let defaultTextSize = 16;
let axisMargin = 60;            // room for the axis labels

// Tone-control model (same parameters as the original sketch)
const FREQ_MIN = 20;            // Hz
const FREQ_MAX = 20000;         // Hz
const BASS_CORNER = 500;        // Hz, half-gain point of the low shelf
const TREBLE_CORNER = 2000;     // Hz, half-gain point of the high shelf
const SHELF_ORDER = 4;          // steepness of the shelf transition
const MAX_SHELF_DB = 12;        // slider at 0 or 100 requests -12 dB or +12 dB
const GAIN_MIN_DB = -15;        // bottom of the plot
const GAIN_MAX_DB = 15;         // top of the plot
const NUM_POINTS = 500;
const FREQ_TICKS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

// Colors
const GOLD = '#B8860B';
const GOLD_TEXT = '#7A5800';
const GUIDE_GRAY = '#555555';

// UI controls
let bassSlider, trebleSlider;

// Plot geometry, recomputed every frame from canvasWidth
let plotLeft, plotRight, plotTop, plotBottom;

// Frequency probed by the mouse (stays where it was last placed)
let probeFreq = 1000;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textFont('Arial');
  textSize(defaultTextSize);

  // Bass slider: 0 = full cut, 50 = flat, 100 = full boost
  bassSlider = createSlider(0, 100, 50, 1);
  bassSlider.position(sliderLeftMargin, drawHeight + 12);
  bassSlider.attribute('aria-label', 'Bass control, 0 to 100, 50 is flat');

  // Treble slider: 0 = full cut, 50 = flat, 100 = full boost
  trebleSlider = createSlider(0, 100, 50, 1);
  trebleSlider.position(sliderLeftMargin, drawHeight + 47);
  trebleSlider.attribute('aria-label', 'Treble control, 0 to 100, 50 is flat');

  sizeSliders();
  describe('Frequency response of a bass and treble tone control. A blue curve plots gain in decibels, ' +
           'from -15 to +15, against frequency from 20 Hz to 20 kHz on a logarithmic axis. ' +
           'The bass slider boosts or cuts frequencies below a 500 Hz corner and the treble slider boosts or cuts ' +
           'frequencies above a 2 kHz corner. Moving the mouse over the plot reads the gain at any frequency.');
}

function draw() {
  updateCanvasSize();
  if (width !== canvasWidth) resizeCanvas(canvasWidth, canvasHeight);

  const bassVal = bassSlider.value();
  const trebleVal = trebleSlider.value();
  const bassAmount = (bassVal - 50) / 50;        // -1 .. +1
  const trebleAmount = (trebleVal - 50) / 50;    // -1 .. +1

  // Backgrounds
  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  // Plot geometry
  plotLeft = axisMargin;
  plotRight = canvasWidth - margin;
  plotTop = 70;                                  // room for the title and the probe read-out
  plotBottom = drawHeight - axisMargin;

  updateProbe();

  drawAxes();
  drawCornerGuides();
  drawCurve(bassAmount, trebleAmount);
  drawProbe(bassAmount, trebleAmount);
  drawTitleAndReadout(bassAmount, trebleAmount);
  drawSliderLabels(bassVal, trebleVal, bassAmount, trebleAmount);
}

// ---------------------------------------------------------------- model

// Gain in dB at frequency f. Each shelf is MAX_SHELF_DB * slider amount * 1/(1 + (f/fc)^4) (low)
// or 1/(1 + (fc/f)^4) (high), so a shelf is at half its full gain at its corner frequency.
function gainDb(f, bassAmount, trebleAmount) {
  const lowShelf = 1 / (1 + Math.pow(f / BASS_CORNER, SHELF_ORDER));
  const highShelf = 1 / (1 + Math.pow(TREBLE_CORNER / f, SHELF_ORDER));
  return bassAmount * MAX_SHELF_DB * lowShelf + trebleAmount * MAX_SHELF_DB * highShelf;
}

// ---------------------------------------------------------------- coordinates

function xOfFreq(f) {
  return map(Math.log10(f), Math.log10(FREQ_MIN), Math.log10(FREQ_MAX), plotLeft, plotRight);
}

function freqOfX(x) {
  return Math.pow(10, map(x, plotLeft, plotRight, Math.log10(FREQ_MIN), Math.log10(FREQ_MAX)));
}

function yOfGain(g) {
  return map(g, GAIN_MIN_DB, GAIN_MAX_DB, plotBottom, plotTop);
}

function updateProbe() {
  if (mouseX >= plotLeft && mouseX <= plotRight && mouseY >= plotTop && mouseY <= plotBottom) {
    probeFreq = constrain(freqOfX(mouseX), FREQ_MIN, FREQ_MAX);
  }
}

// ---------------------------------------------------------------- formatting

function fmtFreq(f) {
  if (f >= 1000) return (f / 1000).toFixed(2) + ' kHz';
  return (f >= 100 ? f.toFixed(0) : f.toFixed(1)) + ' Hz';
}

function fmtDb(g) {
  const r = Math.round(g * 10) / 10;
  return (r > 0 ? '+' : '') + r.toFixed(1) + ' dB';
}

function fmtTickDb(g) {
  return (g > 0 ? '+' : '') + g;
}

// ---------------------------------------------------------------- drawing

function drawAxes() {
  // Light grid: one line per dB tick and per frequency tick
  stroke('#d3dce6');
  strokeWeight(1);
  for (let g = GAIN_MIN_DB; g <= GAIN_MAX_DB; g += 5) {
    line(plotLeft, yOfGain(g), plotRight, yOfGain(g));
  }
  for (const f of FREQ_TICKS) {
    line(xOfFreq(f), plotTop, xOfFreq(f), plotBottom);
  }

  // 0 dB reference (unity gain)
  stroke('gray');
  strokeWeight(2);
  line(plotLeft, yOfGain(0), plotRight, yOfGain(0));

  // Axis lines
  stroke('black');
  strokeWeight(1);
  line(plotLeft, plotTop, plotLeft, plotBottom);
  line(plotLeft, plotBottom, plotRight, plotBottom);

  // Gain tick marks and labels
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (let g = GAIN_MIN_DB; g <= GAIN_MAX_DB; g += 5) {
    const y = yOfGain(g);
    stroke('black');
    line(plotLeft - 5, y, plotLeft, y);
    noStroke();
    fill('black');
    text(fmtTickDb(g), plotLeft - 8, y);
  }

  // Frequency tick marks and labels
  textAlign(CENTER, TOP);
  for (const f of FREQ_TICKS) {
    const x = xOfFreq(f);
    stroke('black');
    line(x, plotBottom, x, plotBottom + 5);
    noStroke();
    fill('black');
    text(f >= 1000 ? (f / 1000) + 'k' : f, x, plotBottom + 8);
  }

  // Axis titles
  noStroke();
  fill('black');
  textSize(14);
  textAlign(CENTER, TOP);
  text('Frequency (Hz) - Logarithmic Scale', (plotLeft + plotRight) / 2, plotBottom + 32);

  push();
  translate(16, (plotTop + plotBottom) / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text('Gain (dB)', 0, 0);
  pop();
}

// Dotted lines at the two shelf corners (the half-gain frequencies)
function drawCornerGuides() {
  const xb = xOfFreq(BASS_CORNER);
  const xt = xOfFreq(TREBLE_CORNER);
  stroke(GUIDE_GRAY);
  strokeWeight(1);
  drawingContext.setLineDash([2, 4]);
  line(xb, plotTop, xb, plotBottom);
  line(xt, plotTop, xt, plotBottom);
  drawingContext.setLineDash([]);

  noStroke();
  fill(GUIDE_GRAY);
  textSize(14);
  textAlign(RIGHT, BOTTOM);
  text('bass corner', xb - 5, plotBottom - 5);
  textAlign(LEFT, BOTTOM);
  text('treble corner', xt + 5, plotBottom - 5);
}

function drawCurve(bassAmount, trebleAmount) {
  noFill();
  stroke('blue');
  strokeWeight(3);
  beginShape();
  for (let i = 0; i < NUM_POINTS; i++) {
    const f = FREQ_MIN * Math.pow(FREQ_MAX / FREQ_MIN, i / (NUM_POINTS - 1));
    vertex(xOfFreq(f), yOfGain(gainDb(f, bassAmount, trebleAmount)));
  }
  endShape();
}

// Gold marker at the probed frequency
function drawProbe(bassAmount, trebleAmount) {
  const x = xOfFreq(probeFreq);
  const g = gainDb(probeFreq, bassAmount, trebleAmount);
  const y = yOfGain(g);

  stroke(GOLD);
  strokeWeight(2);
  drawingContext.setLineDash([6, 4]);
  line(x, plotTop, x, plotBottom);
  drawingContext.setLineDash([]);

  fill(GOLD);
  stroke('black');
  strokeWeight(1);
  circle(x, y, 12);
}

function drawTitleAndReadout(bassAmount, trebleAmount) {
  noStroke();
  fill('black');
  textSize(constrain(canvasWidth * 0.05, 18, 28));
  textAlign(CENTER, TOP);
  text('Frequency Response', canvasWidth / 2, 5);

  const g = gainDb(probeFreq, bassAmount, trebleAmount);
  fill(GOLD_TEXT);
  textSize(defaultTextSize);
  textAlign(CENTER, CENTER);
  text('f = ' + fmtFreq(probeFreq) + '     gain = ' + fmtDb(g), (plotLeft + plotRight) / 2, 52);
}

function drawSliderLabels(bassVal, trebleVal, bassAmount, trebleAmount) {
  noStroke();
  fill('black');
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  text('Bass: ' + bassVal + ' (' + fmtDb(bassAmount * MAX_SHELF_DB) + ')', 10, drawHeight + 27);
  text('Treble: ' + trebleVal + ' (' + fmtDb(trebleAmount * MAX_SHELF_DB) + ')', 10, drawHeight + 62);
}

// ---------------------------------------------------------------- layout

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function sizeSliders() {
  const w = Math.max(80, canvasWidth - sliderLeftMargin - margin);
  if (bassSlider) bassSlider.size(w);
  if (trebleSlider) trebleSlider.size(w);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = Math.floor(container.getBoundingClientRect().width);
  sizeSliders();
}
