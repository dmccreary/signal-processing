// Tone Generator MicroSim
// CANVAS_HEIGHT: 400
// A sine-wave tone generator with a live FFT spectrum. Start or stop the tone, set its frequency
// (20 Hz to 10 kHz) and amplitude with the sliders or by dragging across the plot, and watch the
// single spectral peak follow the tone. p5.js 2.3.2 + p5.sound 0.4.1.

// Canvas dimensions and layout
let canvasWidth = 700;            // overwritten from the container in updateCanvasSize()
let drawHeight = 320;
let controlHeight = 80;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let defaultTextSize = 16;

// Plot geometry: y positions are fixed, x positions follow the canvas width
const plot = { top: 80, bottom: 264 };
let plotLeft = 60;
let plotRight = 680;

// Control layout (recomputed for narrow screens in layoutControls())
let ctl = { labelX: 20, labelSize: 16, sliderLeft: 185, right: 20 };
let buttonWidth = 72;
let layoutWidth = -1;

// Audio and FFT settings
const FFT_BINS = 4096;            // analyze() returns 4096 bins from 0 Hz to fs/2 (bin width fs/8192)
// Steady-state analyze() value of an amplitude-1.0 sine centred on a bin (Blackman-window coherent
// gain 0.42 x 1/2). Levels are shown in dB relative to this, so a sine of amplitude A reads 20 log10(A) dB.
const FULL_SCALE = 0.21;
const F_MIN = 20;                 // slider range in Hz
const F_MAX = 10000;              // also the right edge of the plot
const DB_MIN = -80;               // bottom of the level axis
const DB_MAX = 0;                 // top of the level axis (a full-scale sine)
const PEAK_FLOOR_DB = -70;        // below this no peak is reported
const BAR_STEP = 4;               // pixels per spectrum bar (3 px bar + 1 px gap)
const DEFAULT_FREQ = 440;         // A4
const DEFAULT_AMP = 0.2;          // modest default level
const MAX_AMP = 0.5;              // the original sketch played at a fixed 0.5

// Audio objects (built on the first Start click, because browsers block audio until a user gesture)
let osc, fft;
let audioReady = false;
let isPlaying = false;

// Control elements
let frequencySlider, amplitudeSlider;
let startButton;

// Simulation state
let currentFreq = DEFAULT_FREQ;
let currentAmp = DEFAULT_AMP;
let appliedFreq = null;
let appliedAmp = null;
let peakHz = 0;
let peakDb = -Infinity;
let binHz = 0;
let draggingPlot = false;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  createControls();
  layoutControls(true);

  describe('A sine-wave tone generator with its live FFT spectrum from 0 to 10 kHz. Press Start to hear the tone, then move the Frequency and Amplitude sliders, or drag across the plot, to move the single spectral peak and change its level in decibels.');
}

function draw() {
  updateCanvasSize();

  // Read the controls every frame so the labels update even while the tone is off
  currentFreq = Number(frequencySlider.value());
  currentAmp = Number(amplitudeSlider.value());
  applyOscillator();

  const spectrum = audioReady ? fft.analyze() : null;   // Float32Array(4096), linear magnitude

  drawRegions();
  drawTitle();
  drawSpectrum(spectrum);
  drawReadouts();
  drawControlLabels();

  cursor(isInPlot(mouseX, mouseY) ? 'ew-resize' : ARROW);
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
}

function drawTitle() {
  fill('black');
  noStroke();
  textSize(22);
  textAlign(CENTER, TOP);
  const title = canvasWidth >= 560 ? 'Tone Generator and Visualization with FFT' : 'Tone Generator with FFT';
  text(title, canvasWidth / 2, 8);
}

function drawRotatedLabel(label, yCenter) {
  push();
  translate(16, yCenter);
  rotate(-HALF_PI);
  fill('black');
  noStroke();
  textSize(14);
  textAlign(CENTER, CENTER);
  text(label, 0, 0);
  pop();
}

// Map a level in dB to a y position on the plot
function levelToY(db) {
  return plot.bottom - constrain(map(db, DB_MIN, DB_MAX, 0, 1), 0, 1) * (plot.bottom - plot.top);
}

function freqToX(hz) {
  return map(hz, 0, F_MAX, plotLeft, plotRight);
}

// Analyser magnitude -> dB relative to a full-scale (amplitude 1) sine
function magToDb(v) {
  return 20 * Math.log10(Math.max(v, 1e-9) / FULL_SCALE);
}

function drawSpectrum(spectrum) {
  const x0 = plotLeft;
  const x1 = plotRight;
  const base = plot.bottom;

  // Level grid lines every 20 dB, then the axes
  strokeWeight(1);
  stroke(215);
  for (let db = DB_MIN + 20; db <= DB_MAX; db += 20) line(x0, levelToY(db), x1, levelToY(db));
  stroke('gray');
  line(x0, base, x1, base);
  line(x0, plot.top, x0, base);

  // Level tick labels
  noStroke();
  fill(60);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (let db = DB_MIN; db <= DB_MAX; db += 20) text(db, x0 - 6, levelToY(db));

  // Frequency ticks: labelled every 1 kHz, minor ticks every 500 Hz
  textAlign(CENTER, CENTER);
  for (let f = 0; f <= F_MAX; f += 500) {
    const x = freqToX(f);
    const major = f % 1000 === 0;
    stroke('gray');
    line(x, base, x, base + (major ? 6 : 3));
    if (major) {
      noStroke();
      fill(60);
      text(f / 1000, x, base + 16);
    }
  }
  fill('black');
  noStroke();
  text('Frequency (kHz)', (x0 + x1) / 2, base + 38);
  drawRotatedLabel('Level (dB)', (plot.top + base) / 2);

  // Sample rate and bin width (only where there is room)
  if (audioReady) binHz = getAudioContext().sampleRate / 2 / FFT_BINS;
  if (audioReady && canvasWidth >= 760) {
    fill(90);
    textAlign(LEFT, CENTER);
    text('fs = ' + (getAudioContext().sampleRate / 1000).toFixed(1) + ' kHz, bin width ' + binHz.toFixed(2) + ' Hz', x0, base + 38);
  }

  // Spectrum bars: each bar shows the strongest FFT bin inside its frequency range
  peakDb = -Infinity;
  if (spectrum) {
    // Search one bin past 10 kHz so a 10 kHz tone between two bins still finds its stronger bin
    const lastBin = Math.min(spectrum.length - 1, Math.ceil(F_MAX / binHz));
    const nBars = Math.max(1, Math.floor((x1 - x0) / BAR_STEP));
    const hzPerBar = F_MAX / nBars;
    const barW = (x1 - x0) / nBars;
    noStroke();
    fill('blue');
    for (let j = 0; j < nBars; j++) {
      const b0 = Math.max(1, Math.ceil(j * hzPerBar / binHz));
      const b1 = Math.min(lastBin, Math.max(b0, Math.ceil((j + 1) * hzPerBar / binHz) - 1));
      let v = 0;
      for (let i = b0; i <= b1; i++) if (spectrum[i] > v) v = spectrum[i];
      const y = levelToY(magToDb(v));
      if (y < base) rect(x0 + j * barW, y, Math.max(1, barW - 1), base - y);
    }

    // Strongest bin (skip bin 0, the DC term)
    let peakBin = 1;
    for (let i = 2; i <= lastBin; i++) if (spectrum[i] > spectrum[peakBin]) peakBin = i;
    peakHz = peakBin * binHz;
    peakDb = magToDb(spectrum[peakBin]);
  }

  // Dashed marker at the frequency the slider is set to
  const fx = freqToX(currentFreq);
  stroke('dimgray');
  strokeWeight(1);
  drawingContext.setLineDash([4, 4]);
  line(fx, plot.top, fx, base);
  drawingContext.setLineDash([]);
  noStroke();
  fill('dimgray');
  textSize(14);
  textAlign(CENTER, BOTTOM);
  text(currentFreq + ' Hz', constrain(fx, x0 + 28, x1 - 28), plot.top - 3);

  // Peak marker
  if (peakDb > PEAK_FLOOR_DB) {
    const px = freqToX(peakHz);
    const py = levelToY(peakDb);
    fill('gold');
    stroke('darkgoldenrod');
    strokeWeight(1);
    triangle(px - 6, py - 13, px + 6, py - 13, px, py - 3);
  } else if (!isPlaying) {
    drawHint();
  }
}

function drawHint() {
  const compact = canvasWidth < 500;
  const w = Math.min(plotRight - plotLeft - 20, compact ? 290 : 380);
  const cx = (plotLeft + plotRight) / 2;
  const y = plot.top + 50;
  fill(255, 255, 255, 235);
  stroke(200);
  strokeWeight(1);
  rect(cx - w / 2, y, w, 58, 8);
  noStroke();
  fill(70);
  textSize(compact ? 14 : 16);
  textAlign(CENTER, CENTER);
  text('Press Start to hear the tone.', cx, y + 18);
  text('Drag across the plot or use the sliders.', cx, y + 40);
}

function drawReadouts() {
  const y = 46;
  textSize(16);
  noStroke();

  // FFT peak read-out (left), keyed to the gold peak marker on the plot
  const wide = canvasWidth >= 500;
  const x = wide ? 20 : 8;
  fill('gold');
  stroke('darkgoldenrod');
  strokeWeight(1);
  triangle(x, y - 5, x + 12, y - 5, x + 6, y + 5);
  noStroke();
  textAlign(LEFT, CENTER);
  fill('blue');
  let msg = wide ? 'FFT peak: ' : 'Peak: ';
  if (peakDb > PEAK_FLOOR_DB) {
    msg += peakHz.toFixed(1) + ' Hz, ' + peakDb.toFixed(1) + ' dB';
  } else {
    msg += wide ? 'none (tone is off)' : 'none';
  }
  text(msg, x + 18, y);

  // Status indicator (right)
  textAlign(RIGHT, CENTER);
  fill(isPlaying ? 'green' : 'red');
  text(isPlaying ? '● PLAYING' : '● STOPPED', plotRight, y);
}

function drawControlLabels() {
  fill('black');
  noStroke();
  textSize(ctl.labelSize);
  textAlign(LEFT, CENTER);
  text('Frequency: ' + currentFreq + ' Hz', ctl.labelX, drawHeight + 25);
  text('Amplitude: ' + currentAmp.toFixed(2), ctl.labelX, drawHeight + 58);
}

function createControls() {
  // Start/Stop button (first button, so it is the one a screenshot tool presses)
  startButton = createButton('Start');
  startButton.style('width', buttonWidth + 'px');
  startButton.mousePressed(toggleSound);

  // Frequency slider (20 Hz - 10 kHz, the original sketch's mouse range)
  frequencySlider = createSlider(F_MIN, F_MAX, DEFAULT_FREQ, 1);

  // Amplitude slider (0 - 0.5); the tone stays silent until Start is pressed
  amplitudeSlider = createSlider(0, MAX_AMP, DEFAULT_AMP, 0.01);
}

// Two rows: [label][slider][button] and [label][slider]. Narrow screens get smaller labels and padding.
function layoutControls(force) {
  if (typeof frequencySlider === 'undefined') return;
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  const compact = canvasWidth < 500;
  ctl = compact
    ? { labelX: 8, labelSize: 14, sliderLeft: 150, right: 8 }
    : { labelX: 20, labelSize: 16, sliderLeft: 185, right: 20 };
  const buttonX = canvasWidth - ctl.right - buttonWidth;
  const sliderWidth = Math.max(60, buttonX - 10 - ctl.sliderLeft);

  frequencySlider.position(ctl.sliderLeft, drawHeight + 15);
  frequencySlider.size(sliderWidth);
  amplitudeSlider.position(ctl.sliderLeft, drawHeight + 48);
  amplitudeSlider.size(sliderWidth);
  startButton.position(buttonX, drawHeight + 13);
}

// Dragging horizontally across the plot sets the frequency under the pointer
function isInPlot(x, y) {
  return x >= plotLeft && x <= plotRight && y >= plot.top && y <= plot.bottom + 24;
}

function setFrequencyFromPointer() {
  const hz = Math.round(constrain(map(mouseX, plotLeft, plotRight, 0, F_MAX), F_MIN, F_MAX));
  frequencySlider.value(hz);
}

function mousePressed() {
  draggingPlot = isInPlot(mouseX, mouseY);
  if (draggingPlot) setFrequencyFromPointer();
}

function mouseDragged() {
  if (draggingPlot) {
    setFrequencyFromPointer();
    return false;                       // keep touch drags from scrolling the page
  }
}

function mouseReleased() {
  draggingPlot = false;
}

// Build the audio graph: oscillator -> speakers, and oscillator -> FFT.
// Called from the Start click, because browsers only allow audio after a user gesture.
function startAudio() {
  userStartAudio();                     // p5.sound 0.4.1 returns undefined here (no promise)
  const ctx = getAudioContext();
  if (ctx.state !== 'running') {
    const p = ctx.resume();
    if (p && p.catch) p.catch(() => {});
  }

  osc = new p5.Oscillator('sine');
  osc.freq(currentFreq);
  osc.amp(0);

  fft = new p5.FFT(FFT_BINS);           // p5.sound 0.4.1: one argument (number of bins)
  fft.analyzer.smoothing = 0.8;
  fft.setInput(osc);                    // the oscillator stays connected to the speakers

  osc.start();                          // it keeps running; Stop only fades the amplitude to 0
  binHz = ctx.sampleRate / 2 / FFT_BINS;
  audioReady = true;
}

function applyOscillator() {
  if (!audioReady || !isPlaying) return;
  if (currentFreq !== appliedFreq) {
    osc.freq(currentFreq);
    appliedFreq = currentFreq;
  }
  if (currentAmp !== appliedAmp) {
    osc.amp(currentAmp, 0.05);
    appliedAmp = currentAmp;
  }
}

function toggleSound() {
  if (!audioReady) startAudio();
  isPlaying = !isPlaying;
  startButton.html(isPlaying ? 'Stop' : 'Start');

  if (isPlaying) {
    appliedFreq = null;
    appliedAmp = null;
    applyOscillator();
  } else {
    osc.amp(0, 0.1);                    // fade out instead of stop(), so Start works again
  }
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  const compact = canvasWidth < 500;
  plotLeft = compact ? 52 : 60;
  plotRight = canvasWidth - (compact ? 14 : margin);
  layoutControls(false);
}
