// Waveform Type FFT Analysis MicroSim
// CANVAS_HEIGHT: 530
// Demonstrates how different waveform shapes (sine, square, triangle, sawtooth)
// appear in the frequency domain: which harmonics are present and how fast they decay.
// The spectrum is the exact Fourier-series line spectrum (what an ideal FFT shows),
// with every line scaled relative to the fundamental.

// Canvas dimensions and layout
let canvasWidth = 800;            // overwritten from the container in updateCanvasSize()
let drawHeight = 450;
let controlHeight = 80;
let canvasHeight = drawHeight + controlHeight;
let margin = 25;
let sliderLeftMargin = 150;
let defaultTextSize = 16;

// Plot geometry: y positions are fixed, x positions follow the canvas width
let plotLeft = 62;                // room for the rotated axis title and the tick labels
let plotRightPad = 22;
let timeTop = 68;                 // y of amplitude +1
let timeBottom = 178;             // y of amplitude -1
let separatorY = 230;
let specTop = 284;                // y of relative magnitude 1
let specBase = 398;               // y of relative magnitude 0

// Display ranges
let displayTimeSpan = 0.05;       // seconds shown in the time-domain plot (50 ms)
let maxDisplayFreq = 500;         // Hz shown in the spectrum
let samplesPerDisplay = 1000;     // points used to draw the waveform

// Control elements
let waveformRadio;
let frequencySlider;
let radioNaturalWidth = 330;      // measured after the radio is created
let lastLayoutWidth = -1;

// Simulation state
let currentWaveform = 'sine';
let currentFreq = 50;

// Pre-calculated waveform and spectrum data
let waveformData = [];
let harmonics = [];               // [{n, freq, mag}] for every harmonic up to maxDisplayFreq

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  textSize(defaultTextSize);

  createControls();
  positionControls();

  generateWaveformAndSpectrum();

  describe('Waveform type FFT analysis. The top plot shows 50 milliseconds of a sine, square, triangle or sawtooth wave; the bottom plot shows its harmonic spectrum from 0 to 500 Hz, with each line scaled relative to the fundamental. Choose the waveform with the radio buttons and set the fundamental frequency with the slider.');
}

function draw() {
  updateCanvasSize();

  // Recompute only when a control changes
  let f = Number(frequencySlider.value());
  let w = waveformRadio.value() || 'sine';
  if (f !== currentFreq || w !== currentWaveform) {
    currentFreq = f;
    currentWaveform = w;
    generateWaveformAndSpectrum();
  }

  drawRegions();
  drawTitle();
  drawTimeWaveform();
  drawFrequencySpectrum();
  drawControlLabels();
  drawHoverReadout();
}

// ---------------------------------------------------------------------------
// Signal model
// ---------------------------------------------------------------------------

function generateWaveformAndSpectrum() {
  waveformData = [];

  for (let i = 0; i < samplesPerDisplay; i++) {
    let t = (i / samplesPerDisplay) * displayTimeSpan;   // time in seconds
    let phase = 2 * PI * currentFreq * t;
    let sample = 0;

    if (currentFreq === 0) {
      sample = 0;                                        // 0 Hz: flat line
    } else {
      let cyclePhase = phase % (2 * PI);
      switch (currentWaveform) {
        case 'sine':
          sample = sin(phase);
          break;
        case 'square':
          sample = cyclePhase < PI ? 1 : -1;
          break;
        case 'sawtooth':
          sample = (cyclePhase / PI) - 1;                // ramps from -1 to 1
          break;
        case 'triangle':
          if (cyclePhase < PI) {
            sample = (cyclePhase / (PI / 2)) - 1;        // rising edge: -1 to 1
          } else {
            sample = 3 - (cyclePhase / (PI / 2));        // falling edge: 1 to -1
          }
          break;
      }
    }
    waveformData.push(sample);
  }

  generateSpectrum();
}

// Fourier-series magnitude of harmonic n, relative to the fundamental
function harmonicMagnitude(type, n) {
  switch (type) {
    case 'sine':     return n === 1 ? 1 : 0;
    case 'square':   return n % 2 === 1 ? 1 / n : 0;          // odd harmonics, 1/n
    case 'triangle': return n % 2 === 1 ? 1 / (n * n) : 0;    // odd harmonics, 1/n^2
    case 'sawtooth': return 1 / n;                            // all harmonics, 1/n
  }
  return 0;
}

// Text form of the same magnitude, e.g. "1/3" or "1/9"
function harmonicFraction(type, n) {
  if (n === 1) return '1';
  if (type === 'triangle') return '1/' + (n * n);
  return '1/' + n;
}

function generateSpectrum() {
  harmonics = [];
  if (currentFreq <= 0) return;                 // no oscillation, no harmonics
  for (let n = 1; n * currentFreq <= maxDisplayFreq; n++) {
    let mag = harmonicMagnitude(currentWaveform, n);
    if (mag > 0) harmonics.push({ n: n, freq: n * currentFreq, mag: mag });
  }
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function plotRight() {
  return canvasWidth - plotRightPad;
}

function freqToX(freq) {
  return map(freq, 0, maxDisplayFreq, plotLeft, plotRight());
}

function drawRegions() {
  // Drawing area background (light blue)
  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);

  // Controls area background (white)
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  // Separator between the time and frequency domains
  stroke('silver');
  line(10, separatorY, canvasWidth - 10, separatorY);
}

function drawTitle() {
  fill('black');
  noStroke();
  textSize(canvasWidth < 450 ? 20 : 24);
  textAlign(CENTER, TOP);
  text('Waveform Type FFT Analysis', canvasWidth / 2, 8);
  textSize(defaultTextSize);
}

function drawTimeWaveform() {
  let left = plotLeft;
  let right = plotRight();
  let mid = (timeTop + timeBottom) / 2;

  // Panel heading and period read-out
  noStroke();
  fill('black');
  textSize(16);
  textAlign(LEFT, BOTTOM);
  text('Time Domain', left, timeTop - 10);
  textAlign(RIGHT, BOTTOM);
  textSize(14);
  fill(60);
  let periodText = currentFreq > 0
    ? 'Period T = 1/f = ' + (1000 / currentFreq).toFixed(1) + ' ms'
    : 'f = 0 Hz: no oscillation';
  text(periodText, right, timeTop - 10);

  // Grid: amplitude +1 and -1, and every 10 ms
  stroke(215);
  strokeWeight(1);
  line(left, timeTop, right, timeTop);
  line(left, timeBottom, right, timeBottom);
  for (let ms = 0; ms <= 50; ms += 10) {
    let x = map(ms, 0, 50, left, right);
    line(x, timeTop, x, timeBottom);
  }

  // Zero line
  stroke('gray');
  line(left, mid, right, mid);

  // Waveform
  stroke('green');
  strokeWeight(2);
  noFill();
  beginShape();
  for (let i = 0; i < waveformData.length; i++) {
    let x = map(i, 0, waveformData.length - 1, left, right);
    let y = map(waveformData[i], -1, 1, timeBottom, timeTop);
    vertex(x, y);
  }
  endShape();

  // Amplitude tick labels
  noStroke();
  fill(60);
  textSize(14);
  textAlign(RIGHT, CENTER);
  text('+1', left - 6, timeTop);
  text('0', left - 6, mid);
  text('-1', left - 6, timeBottom);

  // Time tick labels and axis title
  textAlign(CENTER, TOP);
  for (let ms = 0; ms <= 50; ms += 10) {
    let x = map(ms, 0, 50, left, right);
    text(ms, x, timeBottom + 6);
  }
  fill('black');
  text('Time (ms)', (left + right) / 2, timeBottom + 26);

  // Rotated vertical-axis title
  push();
  translate(18, mid);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text('Amplitude', 0, 0);
  pop();
}

function drawFrequencySpectrum() {
  let left = plotLeft;
  let right = plotRight();
  let plotWidth = right - left;

  // Panel heading and harmonic-content summary
  noStroke();
  fill('black');
  textSize(16);
  textAlign(LEFT, BOTTOM);
  let heading = 'Frequency Domain';
  text(heading, left, specTop - 24);
  textSize(14);
  fill('purple');
  textAlign(RIGHT, BOTTOM);
  let info = harmonicInfo(false);
  textSize(16);
  let headingWidth = fontWidth(heading);
  textSize(14);
  if (left + headingWidth + 16 + fontWidth(info) > right) info = harmonicInfo(true);
  text(info, right, specTop - 24);

  // Grid lines every 0.25 of the fundamental's magnitude
  stroke(215);
  strokeWeight(1);
  for (let m = 0.25; m <= 1.001; m += 0.25) {
    let y = map(m, 0, 1, specBase, specTop);
    line(left, y, right, y);
  }
  for (let f = 0; f <= maxDisplayFreq; f += 50) {
    let x = freqToX(f);
    line(x, specTop, x, specBase);
  }

  // Spectral lines
  let spacingPx = currentFreq / maxDisplayFreq * plotWidth;
  let barWidth = constrain(min(plotWidth / 92 * 0.8, spacingPx * 0.6), 1, 8);
  let hovered = findHoveredHarmonic();
  noStroke();
  for (let h of harmonics) {
    let x = freqToX(h.freq);
    let y = map(h.mag, 0, 1, specBase, specTop);
    fill(hovered === h ? 'goldenrod' : 'purple');
    rect(x - barWidth / 2, y, barWidth, specBase - y);
    // A small dot on the baseline marks harmonics that are too small to see
    circle(x, specBase, min(5, max(2, barWidth)));
  }

  // Harmonic numbers above the lines when there is room
  textSize(14);
  if (harmonics.length > 0 && spacingPx >= fontWidth(String(harmonics[harmonics.length - 1].n)) + 8) {
    fill('purple');
    textAlign(CENTER, BOTTOM);
    for (let h of harmonics) {
      let x = freqToX(h.freq);
      let y = map(h.mag, 0, 1, specBase, specTop);
      text(h.n, x, y - 3);
    }
  }

  // 0 Hz: nothing to show
  if (currentFreq === 0) {
    let msg = '0 Hz: no oscillation, so no harmonics';
    let cx = (left + right) / 2;
    let cy = (specTop + specBase) / 2;
    let boxW = fontWidth(msg) + 16;
    fill(255, 255, 255, 230);
    rect(cx - boxW / 2, cy - 13, boxW, 26, 5);
    fill(80);
    textAlign(CENTER, CENTER);
    text(msg, cx, cy);
  }

  // Baseline
  stroke('gray');
  strokeWeight(1);
  line(left, specBase, right, specBase);

  // Magnitude tick labels
  noStroke();
  fill(60);
  textSize(14);
  textAlign(RIGHT, CENTER);
  text('1', left - 6, specTop);
  text('0.5', left - 6, (specTop + specBase) / 2);
  text('0', left - 6, specBase);

  // Frequency tick labels and axis title
  textAlign(CENTER, TOP);
  for (let f = 0; f <= maxDisplayFreq; f += 100) {
    text(f, freqToX(f), specBase + 6);
  }
  fill('black');
  text('Frequency (Hz)', (left + right) / 2, specBase + 26);

  // Rotated vertical-axis title
  push();
  translate(18, (specTop + specBase) / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text('Rel. magnitude', 0, 0);
  pop();
}

function harmonicInfo(short) {
  switch (currentWaveform) {
    case 'sine':     return short ? 'n = 1 only' : 'Pure tone: fundamental only';
    case 'square':   return short ? 'Odd n, 1/n' : 'Odd harmonics, 1/n decay';
    case 'triangle': return short ? 'Odd n, 1/n²' : 'Odd harmonics, 1/n² decay';
    case 'sawtooth': return short ? 'All n, 1/n' : 'All harmonics, 1/n decay';
  }
  return '';
}

// Returns the harmonic under the mouse (or finger) in the spectrum plot, or null
function findHoveredHarmonic() {
  if (harmonics.length === 0) return null;
  let left = plotLeft;
  let right = plotRight();
  if (mouseX < left - 8 || mouseX > right + 8 || mouseY < separatorY || mouseY > specBase + 10) return null;
  let spacingPx = currentFreq / maxDisplayFreq * (right - left);
  let tolerance = constrain(spacingPx / 2, 4, 12);
  let best = null;
  let bestDist = Infinity;
  for (let h of harmonics) {
    let d = abs(mouseX - freqToX(h.freq));
    if (d < bestDist) {
      bestDist = d;
      best = h;
    }
  }
  return bestDist <= tolerance ? best : null;
}

function drawHoverReadout() {
  let h = findHoveredHarmonic();
  if (!h) return;
  let fraction = harmonicFraction(currentWaveform, h.n) + ' = ' + h.mag.toFixed(3);
  let label = 'n = ' + h.n + ':  ' + h.freq + ' Hz,  magnitude ' + fraction;
  textSize(14);
  if (fontWidth(label) + 14 > canvasWidth * 0.55) {
    label = 'n=' + h.n + ': ' + h.freq + ' Hz, ' + fraction;   // compact form for narrow screens
  }
  let boxW = fontWidth(label) + 14;
  let boxH = 24;
  let x = freqToX(h.freq) + 10;
  if (x + boxW > canvasWidth - 4) x = freqToX(h.freq) - 10 - boxW;
  x = constrain(x, 4, canvasWidth - boxW - 4);
  let y = constrain(mouseY - 34, separatorY + 4, specBase - boxH - 4);
  fill(255, 255, 255, 240);
  stroke('goldenrod');
  strokeWeight(1);
  rect(x, y, boxW, boxH, 5);
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  text(label, x + 7, y + boxH / 2);
}

function drawControlLabels() {
  fill('black');
  noStroke();
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  if (isWideLayout()) text('Waveform:', 10, drawHeight + 22);
  text('Frequency: ' + currentFreq.toFixed(0) + ' Hz', 10, drawHeight + 58);
}

// ---------------------------------------------------------------------------
// Controls and layout
// ---------------------------------------------------------------------------

function createControls() {
  // Waveform type radio buttons
  waveformRadio = createRadio('waveform');
  waveformRadio.option('sine', 'Sine');
  waveformRadio.option('square', 'Square');
  waveformRadio.option('triangle', 'Triangle');
  waveformRadio.option('sawtooth', 'Sawtooth');
  waveformRadio.selected('sine');
  waveformRadio.style('font-size', '16px');
  waveformRadio.style('white-space', 'nowrap');
  waveformRadio.position(0, drawHeight + 10);
  radioNaturalWidth = waveformRadio.elt.offsetWidth || radioNaturalWidth;
  waveformRadio.style('white-space', 'normal');

  // Fundamental frequency slider (0-500 Hz)
  frequencySlider = createSlider(0, 500, currentFreq, 1);
}

// Wide layout puts a "Waveform:" label to the left of the radio buttons
function isWideLayout() {
  return 100 + radioNaturalWidth + 10 <= canvasWidth;
}

function positionControls() {
  if (typeof frequencySlider === 'undefined' || !frequencySlider) return;
  if (canvasWidth === lastLayoutWidth) return;
  lastLayoutWidth = canvasWidth;
  let radioX = isWideLayout() ? 100 : 6;
  waveformRadio.position(radioX, drawHeight + 10);
  frequencySlider.position(sliderLeftMargin, drawHeight + 48);
  frequencySlider.size(max(60, canvasWidth - sliderLeftMargin - margin));
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  positionControls();
}
