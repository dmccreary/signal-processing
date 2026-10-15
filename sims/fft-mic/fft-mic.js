// FFT Microphone Visualizer MicroSim
// CANVAS_HEIGHT: 450
// Live frequency spectrum of the microphone. p5.js 2.3.2 + p5.sound 0.4.1.
//
// p5.sound 0.4.1 notes (it differs from the old 1.x addon):
//   * new p5.FFT(size) takes ONE argument; smoothing is set with fft.analyzer.smoothing.
//   * analyze() returns LINEAR magnitudes. We convert them to dB and map -100..-30 dB
//     onto the bar height, which is exactly the byte scale (0-255) the 1.x analyze() used.
//   * EVERY p5.sound 0.4.1 object is connected to the speakers when it is created,
//     including p5.AudioIn. A live microphone played through the speakers howls
//     (acoustic feedback), so we call mic.disconnect() before mic.connect(fft).
//   * mic.start() has no callbacks; mic.node.state becomes 'started' once the
//     browser has opened the microphone (needs https or localhost).

// Canvas dimensions
let canvasWidth = 500;              // overwritten from the container in updateCanvasSize()
let drawHeight = 400;
let controlHeight = 50;
let canvasHeight = drawHeight + controlHeight;
let margin = 25;
let sliderLeftMargin = 235;
let defaultTextSize = 16;

// Plot geometry (x positions follow the canvas width)
let plotLeft = 62;
const plotTop = 76;
const plotBottom = drawHeight - 60;

// Audio settings
// must be a 2^N - try 128, 256, 512, 1024 etc.
const BIN_COUNT = 512;              // analyze() returns 512 bins from 0 Hz to the Nyquist frequency
const SMOOTHING = 0.8;              // same time smoothing as the 1.x version
const DB_MIN = -100;                // level drawn as an empty bar
const DB_MAX = -30;                 // level drawn as a full bar (a full-scale sine reads about -14 dB)
const NO_MIC_TIMEOUT_MS = 6000;     // show a help message if the microphone has not opened by then

// Audio variables
let mic;
let fft;
let spectrum = null;                // copy of the last analyzed spectrum (stays on screen when stopped)
let sampleRateHz = 48000;           // replaced by the real audio-context rate on Start
let started = false;                // Start has been pressed at least once
let isListening = false;            // the microphone should be running
let listenStartMs = 0;

// UI Controls
let startStopButton;
let maxFreqSlider;

// Visualization parameters
let maxDisplayFreq = 8000;          // slider value (Hz)
let shownHz = 8000;                 // slider value limited to the Nyquist frequency
let peakHz = 0;
let peakDb = DB_MIN;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);
  try { sampleRateHz = getAudioContext().sampleRate; } catch (e) { /* keep 48000 until Start */ }

  // Create start/stop button
  startStopButton = createButton('Start');
  startStopButton.style('width', '64px');
  startStopButton.mousePressed(toggleAudio);

  // Create max frequency slider (2 kHz to 24 kHz)
  maxFreqSlider = createSlider(2000, 24000, 8000, 500);

  layoutControls();
  describe('FFT Microphone Visualizer. Press Start and allow microphone access to see the live frequency spectrum of the sound around you as colored bars, from blue at low frequencies to red at high frequencies, with the strongest frequency shown in hertz. The slider sets the highest frequency displayed.');
}

function draw() {
  updateCanvasSize();

  // Draw area
  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);

  // Controls area
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(0, drawHeight, canvasWidth, controlHeight);

  // Update max frequency from slider (the display cannot go past the Nyquist frequency)
  maxDisplayFreq = maxFreqSlider.value();
  shownHz = Math.min(maxDisplayFreq, sampleRateHz / 2);

  // Title
  fill('black');
  noStroke();
  textSize(24);
  textAlign(CENTER, TOP);
  text('FFT Microphone Visualizer', canvasWidth / 2, 10);

  const micOpen = !!(mic && mic.node && mic.node.state === 'started');
  if (!isListening && micOpen) mic.stop();    // a late open after a quick Start/Stop

  if (isListening && micOpen) {
    // Get FFT analysis (copy it so the last spectrum can stay on screen after Stop)
    spectrum = Float32Array.from(fft.analyze());
  }

  drawAxes();
  if (spectrum) {
    drawSpectrum();
    findPeak();
  }
  drawStatus(micOpen);

  // Draw control labels
  drawControlLabels();
}

// Linear FFT magnitude -> 0..1 bar height on the -100..-30 dB scale
function levelOf(v) {
  const db = 20 * Math.log10(Math.max(v, 1e-7));
  return constrain(map(db, DB_MIN, DB_MAX, 0, 1), 0, 1);
}

function binHz() {
  return sampleRateHz / 2 / BIN_COUNT;
}

function freqToX(f) {
  return plotLeft + (f / shownHz) * (canvasWidth - margin - plotLeft);
}

function drawSpectrum() {
  const plotRight = canvasWidth - margin;
  const plotH = plotBottom - plotTop;
  const bw = binHz();

  // Number of bins whose center frequency is inside the displayed range
  const nShow = Math.min(spectrum.length, Math.floor(shownHz / bw) + 1);
  const barWidth = (bw / shownHz) * (plotRight - plotLeft);
  const gap = barWidth > 3 ? 1 : 0;

  // Draw spectrum bars, each centered on its bin frequency i * fs / (2 * 512)
  noStroke();
  colorMode(HSB);
  for (let i = 0; i < nShow; i++) {
    const barHeight = levelOf(spectrum[i]) * plotH;
    if (barHeight <= 0) continue;

    // Color based on frequency range within displayed range
    const hue = map(i, 0, nShow, 240, 0);   // Blue to red
    fill(hue, 80, 90);

    const xc = freqToX(i * bw);
    const x0 = Math.max(plotLeft, xc - barWidth / 2);
    const x1 = Math.min(plotRight, xc + barWidth / 2 - gap);
    rect(x0, plotBottom - barHeight, Math.max(x1 - x0, 0.75), barHeight);
  }

  // Reset to RGB color mode
  colorMode(RGB);
}

function drawAxes() {
  const plotRight = canvasWidth - margin;
  const plotH = plotBottom - plotTop;

  // Level grid lines and labels every 10 dB
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (let db = DB_MIN; db <= DB_MAX; db += 10) {
    const y = plotBottom - ((db - DB_MIN) / (DB_MAX - DB_MIN)) * plotH;
    stroke(db === DB_MIN ? 'black' : 215);
    strokeWeight(1);
    line(plotLeft, y, plotRight, y);
    noStroke();
    fill(60);
    text(db, plotLeft - 6, y);
  }
  stroke('black');
  line(plotLeft, plotTop, plotLeft, plotBottom);

  // Rotated level axis title
  push();
  translate(13, (plotTop + plotBottom) / 2);
  rotate(-HALF_PI);
  noStroke();
  fill('black');
  textAlign(CENTER, CENTER);
  text('Level (dB)', 0, 0);
  pop();

  drawFrequencyLabels();
}

function drawFrequencyLabels() {
  // Choose a round tick spacing that leaves about 60 px per label
  const plotW = canvasWidth - margin - plotLeft;
  const maxTicks = Math.max(3, Math.floor(plotW / 60));
  const steps = [250, 500, 1000, 2000, 5000, 10000];
  let step = steps[steps.length - 1];
  for (const s of steps) {
    if (shownHz / s <= maxTicks) { step = s; break; }
  }

  textSize(14);
  textAlign(CENTER, TOP);
  for (let f = 0; f <= shownHz + 1; f += step) {
    const x = freqToX(f);
    // Draw tick mark
    stroke('black');
    strokeWeight(1);
    line(x, plotBottom, x, plotBottom + 5);
    // Draw frequency label (kHz)
    noStroke();
    fill('black');
    text(String(+(f / 1000).toFixed(2)), x, plotBottom + 8);
  }

  // Frequency axis label
  textSize(16);
  textAlign(CENTER, TOP);
  text('Frequency (kHz)', (plotLeft + canvasWidth - margin) / 2, plotBottom + 30);

  // Sample rate, bin width and the Nyquist limit (only where there is room)
  if (canvasWidth >= 700) {
    fill(90);
    textSize(14);
    textAlign(LEFT, TOP);
    text('fs = ' + (sampleRateHz / 1000).toFixed(1) + ' kHz, bin width ' + binHz().toFixed(1) + ' Hz', plotLeft, plotBottom + 32);
    if (shownHz >= sampleRateHz / 2) {
      textAlign(RIGHT, TOP);
      text('right edge = Nyquist (fs/2)', canvasWidth - margin, plotBottom + 32);
    }
  }
}

// Strongest bin inside the displayed range. Bin 0 is the DC (0 Hz) term; a microphone's
// DC offset also leaks into the next few bins (the analyzer's window), so we skip the
// falling slope that starts at bin 0 before searching.
function findPeak() {
  const bw = binHz();
  const nShow = Math.min(spectrum.length, Math.floor(shownHz / bw) + 1);
  let first = 1;
  while (first < nShow - 1 && spectrum[first] < spectrum[first - 1] && spectrum[first + 1] < spectrum[first]) first++;
  let maxIndex = first;
  for (let i = first + 1; i < nShow; i++) {
    if (spectrum[i] > spectrum[maxIndex]) maxIndex = i;
  }
  peakHz = maxIndex * bw;
  peakDb = 20 * Math.log10(Math.max(spectrum[maxIndex], 1e-7));

  // Gold marker above the peak bar
  if (peakDb > DB_MIN + 10) {
    const x = freqToX(peakHz);
    const y = plotBottom - levelOf(spectrum[maxIndex]) * (plotBottom - plotTop);
    fill('gold');
    stroke('darkgoldenrod');
    strokeWeight(1);
    triangle(x - 6, y - 12, x + 6, y - 12, x, y - 2);
  }
}

function drawStatus(micOpen) {
  const wide = canvasWidth >= 520;
  const y = 52;
  textSize(16);
  noStroke();
  textAlign(LEFT, CENTER);

  if (!started) {
    // Not started yet
    fill('gray');
    textSize(18);
    textAlign(CENTER, CENTER);
    text('Click Start to begin microphone analysis', plotLeft, plotTop, canvasWidth - margin - plotLeft, plotBottom - plotTop);
    return;
  }

  if (isListening && !micOpen) {
    const waited = millis() - listenStartMs;
    fill(waited < NO_MIC_TIMEOUT_MS ? 'gray' : 'red');
    text(waited < NO_MIC_TIMEOUT_MS ? 'Opening microphone...' : 'No microphone', margin, y);
    textAlign(CENTER, CENTER);
    textSize(16);
    const msg = waited < NO_MIC_TIMEOUT_MS
      ? 'Allow microphone access if the browser asks.'
      : 'The microphone did not open. Allow microphone access for this page (it must be served over https or localhost) and press Stop, then Start.';
    if (!spectrum) text(msg, plotLeft + 10, plotTop, canvasWidth - margin - plotLeft - 20, plotBottom - plotTop);
    return;
  }

  if (isListening) {
    fill('green');
    text('● Listening', margin, y);
  } else {
    fill('red');
    text(wide ? '● Stopped (last spectrum frozen)' : '● Stopped', margin, y);
  }

  // Peak frequency read-out
  if (spectrum) {
    fill('black');
    textAlign(RIGHT, CENTER);
    let msg;
    if (peakDb > DB_MIN + 10) {
      const hz = peakHz >= 1000 ? (peakHz / 1000).toFixed(2) + ' kHz' : peakHz.toFixed(0) + ' Hz';
      msg = wide ? 'Peak: ' + hz + ' at ' + peakDb.toFixed(0) + ' dB' : 'Peak: ' + hz;
    } else {
      msg = 'Peak: none (too quiet)';
    }
    text(msg, canvasWidth - margin, y);
  }
}

function drawControlLabels() {
  fill('black');
  noStroke();
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  // Shows the displayed limit: above the Nyquist frequency the slider has no further effect
  const digits = maxDisplayFreq > shownHz ? 2 : 1;
  text('Max Freq: ' + (shownHz / 1000).toFixed(digits) + ' kHz', 84, drawHeight + 25);
}

async function toggleAudio() {
  if (isListening) {
    // Currently listening: stop and release the microphone, keep the last spectrum visible
    isListening = false;
    if (mic) mic.stop();
    startStopButton.html('Start');
    return;
  }

  // Start (or resume) listening. The audio context starts suspended until a click.
  isListening = true;
  started = true;
  listenStartMs = millis();
  startStopButton.html('Stop');
  await userStartAudio();
  if (!fft) {
    sampleRateHz = getAudioContext().sampleRate;
    fft = new p5.FFT(BIN_COUNT);
    fft.analyzer.smoothing = SMOOTHING;
  }
  if (!mic) {
    mic = new p5.AudioIn();
    mic.disconnect();               // never play the live microphone through the speakers
    mic.connect(fft);
  }
  if (isListening) mic.start();     // opens in about 1-2 s; draw() waits for mic.node.state
}

function layoutControls() {
  startStopButton.position(10, drawHeight + 13);
  maxFreqSlider.position(sliderLeftMargin, drawHeight + 16);
  maxFreqSlider.size(Math.max(60, canvasWidth - sliderLeftMargin - margin));
}

function windowResized() {
  // Update canvas size when the container resizes
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = Math.floor(container.getBoundingClientRect().width);
  if (typeof maxFreqSlider !== 'undefined') layoutControls();
}
