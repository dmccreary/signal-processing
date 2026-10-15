// FFT Size MicroSim
// CANVAS_HEIGHT: 580
// A sine-wave generator analysed with a choice of FFT sizes. The time-domain plot shows one
// analysis window; the spectrum shows each frequency bin as a bar, so a larger FFT size gives
// narrower bins and a narrower peak. p5.js 2.3.2 + p5.sound 0.4.1.

// Canvas dimensions and layout
let canvasWidth = 800;            // overwritten from the container in updateCanvasSize()
let drawHeight = 470;
let controlHeight = 110;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let defaultTextSize = 16;

// Plot geometry: y positions are fixed, x positions follow the canvas width
let plotLeft = 62;
const timePlot = { top: 62, bottom: 172 };    // amplitude +1 (top) .. -1 (bottom)
const freqPlot = { top: 252, bottom: 392 };   // magnitude 1 (top) .. 0 (baseline)

// Control layout (recomputed for narrow screens in layoutControls())
let ctl = { labelX: 20, labelSize: 16, sliderLeft: 175, radioLeft: 175, radioFont: 16, right: 20 };
let buttonWidth = 72;
let layoutWidth = -1;

// FFT settings. In p5.sound 0.4.1, new p5.FFT(size) returns `size` bins from 0 Hz to fs/2,
// computed from the most recent N = 2 x size samples, so the bin width is fs / (2 x size).
const FFT_SIZES = [512, 1024, 2048, 4096, 8192];
const DEFAULT_FFT_SIZE = 2048;
const SMOOTHING = 0.8;
// Steady-state analyze() value of an amplitude-1.0 sine centred on a bin (Blackman window
// coherent gain 0.42 x 1/2). Values are linear, so bar height is proportional to amplitude.
const FULL_SCALE = 0.21;
const OUTPUT_LEVEL = 0.5;         // speaker level relative to the displayed signal (the FFT sees full amplitude)
const TRIGGER_MAX_N = 4096;       // windows up to this many samples get a 2N buffer for the zero-crossing trigger
const FREQ_MAX_DISPLAY = 2100;    // right edge of the spectrum plot in Hz (slider max is 2000 Hz)
const DEFAULT_FREQ = 440;         // A4
const DEFAULT_AMP = 0.5;

// Audio objects (built on the first Start click, because browsers block audio until a user gesture)
let oscillator, fft, outputGain;
let audioReady = false;

// Control elements
let frequencySlider, amplitudeSlider;
let startButton, resetButton;
let fftSizeRadio;

// Simulation state
let isRunning = false;
let currentFreq = DEFAULT_FREQ;
let currentAmp = DEFAULT_AMP;
let currentFFTSize = DEFAULT_FFT_SIZE;   // size selected with the radio buttons
let activeFFTSize = 0;                   // size of the p5.FFT object that exists now
let appliedFreq = null;
let appliedAmp = null;
let peakHz = 0;
let peakMag = 0;
let peakWidthHz = 0;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  createControls();
  layoutControls(true);

  describe('A sine-wave generator analysed by an FFT whose size you choose with radio buttons from 512 to 8192 bins. The top plot shows a stretch of the waveform one analysis window long; the bottom plot shows the magnitude spectrum from 0 to 2100 Hz as one bar per frequency bin. Larger FFT sizes give narrower bins, a narrower peak and a longer analysis window.');
}

function draw() {
  updateCanvasSize();

  // Read the controls every frame so the labels update even while paused
  currentFreq = Number(frequencySlider.value());
  currentAmp = Number(amplitudeSlider.value());
  checkFFTSizeChange();
  applyOscillator();

  let spectrum = null;
  let wave = null;
  if (audioReady) {
    spectrum = fft.analyze();      // Float32Array(currentFFTSize), linear magnitude
    wave = fft.waveform();         // Float32Array, values in [-1, 1]
  }

  drawRegions();
  drawTitle();
  drawTimeSignal(wave);
  drawSpectrum(spectrum);
  drawResolutionInfo(spectrum !== null);
  drawControlLabels();
}

// Analysis parameters for the selected size
function audioRate() { return getAudioContext().sampleRate; }
function windowSamples() { return 2 * currentFFTSize; }                // N
function binWidthHz() { return audioRate() / windowSamples(); }       // fs / N
function windowMs() { return 1000 * windowSamples() / audioRate(); }  // N / fs

function drawRegions() {
  // Drawing area background (light blue)
  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);

  // Controls area background (white)
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  // Separator line between the time and frequency domains
  stroke(150);
  line(margin, 218, canvasWidth - margin, 218);
}

function drawTitle() {
  fill('black');
  noStroke();
  textSize(canvasWidth >= 520 ? 24 : 19);
  textAlign(CENTER, TOP);
  text('FFT Size and Frequency Resolution', canvasWidth / 2, 8);
}

function drawPanelLabel(label, y) {
  fill('black');
  noStroke();
  textSize(16);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text(label, margin, y);
  textStyle(NORMAL);
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

// Smallest "nice" tick step that gives at most 8 intervals across the window
function timeTickStep(totalMs) {
  for (const s of [1, 2, 5, 10, 20, 50, 100, 200]) if (totalMs / s <= 8) return s;
  return 500;
}

function drawTimeSignal(wave) {
  const x0 = plotLeft;
  const x1 = canvasWidth - margin;
  const yMid = (timePlot.top + timePlot.bottom) / 2;
  const yScale = (timePlot.bottom - timePlot.top) / 2 - 4;
  const totalMs = windowMs();

  drawPanelLabel('Time Domain', 44);

  // Status indicator
  textAlign(RIGHT, CENTER);
  textSize(16);
  fill(isRunning ? 'green' : 'red');
  text(isRunning ? '● RUNNING' : '● PAUSED', canvasWidth - margin, 44);

  // Grid lines at +/-0.5 and +/-1 and the zero line
  strokeWeight(1);
  stroke(215);
  for (const a of [-1, -0.5, 0.5, 1]) line(x0, yMid - a * yScale, x1, yMid - a * yScale);
  stroke('gray');
  line(x0, yMid, x1, yMid);
  line(x0, timePlot.top, x0, timePlot.bottom);

  // Amplitude tick labels
  noStroke();
  fill(60);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (const a of [1, 0, -1]) text(a, x0 - 6, yMid - a * yScale);

  // Time tick labels (ms): the axis spans one window length, N samples
  textAlign(CENTER, CENTER);
  const step = timeTickStep(totalMs);
  for (let t = 0; t <= totalMs + 1e-9; t += step) {
    const x = map(t, 0, totalMs, x0, x1);
    stroke('gray');
    line(x, timePlot.bottom - 4, x, timePlot.bottom);
    noStroke();
    text(t, x, timePlot.bottom + 12);
  }
  fill('black');
  const axisLabel = canvasWidth >= 600
    ? 'Time (ms): one window length, N = ' + windowSamples() + ' samples = ' + totalMs.toFixed(1) + ' ms'
    : 'Time (ms), N = ' + windowSamples() + ' samples';
  text(axisLabel, (x0 + x1) / 2, timePlot.bottom + 30);
  drawRotatedLabel('Amplitude', yMid);

  if (!wave) {
    stroke('green');
    strokeWeight(2);
    line(x0, yMid, x1, yMid);
    noStroke();
    fill(90);
    textSize(16);
    textAlign(CENTER, CENTER);
    text('Press Start to generate the sine wave', (x0 + x1) / 2, yMid - 24);
    return;
  }

  // Show N samples (one window length). When the buffer is longer than the window, start
  // at a rising zero crossing, like an oscilloscope trigger, so short windows hold still.
  const n = Math.min(wave.length, windowSamples());
  let start = wave.length - n;
  for (let i = 1; i <= wave.length - n; i++) {
    if (wave[i - 1] < 0 && wave[i] >= 0) { start = i; break; }
  }

  stroke('green');
  noFill();
  const plotPx = Math.max(1, Math.floor(x1 - x0));
  if (n > 2 * plotPx) {
    // Many samples per pixel: draw the min..max range of each pixel column
    strokeWeight(1);
    for (let c = 0; c < plotPx; c++) {
      const a = start + Math.floor(c * n / plotPx);
      const b = start + Math.max(Math.floor((c + 1) * n / plotPx), Math.floor(c * n / plotPx) + 1);
      let lo = 1, hi = -1;
      for (let i = a; i < b; i++) { const v = wave[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      line(x0 + c + 0.5, yMid - constrain(hi, -1, 1) * yScale, x0 + c + 0.5, yMid - constrain(lo, -1, 1) * yScale + 0.5);
    }
  } else {
    strokeWeight(2);
    beginShape();
    for (let i = 0; i < n; i++) {
      vertex(map(i, 0, n, x0, x1), yMid - constrain(wave[start + i], -1, 1) * yScale);
    }
    endShape();
  }
}

// Width of the peak at half its height, in (fractional) bins, by linear interpolation
function halfHeightWidth(s, p) {
  const half = s[p] / 2;
  let i = p;
  while (i > 0 && s[i - 1] >= half) i--;
  const left = i > 0 ? (i - 1) + (half - s[i - 1]) / (s[i] - s[i - 1]) : 0;
  let j = p;
  while (j < s.length - 1 && s[j + 1] >= half) j++;
  const right = j < s.length - 1 ? j + (s[j] - half) / (s[j] - s[j + 1]) : s.length - 1;
  return { left, right };
}

function drawSpectrum(spectrum) {
  const x0 = plotLeft;
  const x1 = canvasWidth - margin;
  const base = freqPlot.bottom;
  const top = freqPlot.top + 14;          // headroom for the peak marker
  const hz2x = (f) => map(f, 0, FREQ_MAX_DISPLAY, x0, x1);

  drawPanelLabel('Frequency Domain', 236);

  // Grid lines at magnitude 0.5 and 1 and the baseline
  strokeWeight(1);
  stroke(215);
  for (const m of [0.5, 1]) line(x0, base - m * (base - top), x1, base - m * (base - top));
  stroke('gray');
  line(x0, base, x1, base);
  line(x0, freqPlot.top, x0, base);

  // Magnitude tick labels
  noStroke();
  fill(60);
  textSize(14);
  textAlign(RIGHT, CENTER);
  for (const m of [0, 0.5, 1]) text(m, x0 - 6, base - m * (base - top));

  // Frequency ticks: minor every 100 Hz, labelled every 500 Hz
  textAlign(CENTER, CENTER);
  for (let f = 0; f <= 2000; f += 100) {
    const x = hz2x(f);
    stroke('gray');
    line(x, base, x, base + (f % 500 === 0 ? 6 : 3));
    if (f % 500 === 0) {
      noStroke();
      text(f, x, base + 14);
    }
  }
  fill('black');
  noStroke();
  text('Frequency (Hz)', (x0 + x1) / 2, base + 32);
  drawRotatedLabel('Magnitude', (freqPlot.top + base) / 2);

  if (!spectrum) return;

  // One bar per frequency bin, centred on the bin frequency k * fs / N and 80% of a bin wide,
  // normalised so an amplitude-1.0 sine centred on a bin reaches about 1
  const binHz = audioRate() / (2 * spectrum.length);
  const lastBin = Math.min(spectrum.length - 1, Math.floor(FREQ_MAX_DISPLAY / binHz));
  const barPx = binHz * (x1 - x0) / FREQ_MAX_DISPLAY;
  let peakBin = 0;
  peakMag = 0;
  for (let i = 0; i <= lastBin; i++) {
    if (spectrum[i] > spectrum[peakBin]) peakBin = i;
  }
  peakMag = spectrum[peakBin] / FULL_SCALE;

  if (barPx >= 3) { noStroke(); fill('purple'); }
  else { stroke('purple'); strokeWeight(Math.max(1, 0.8 * barPx)); }
  for (let i = 0; i <= lastBin; i++) {
    const h = Math.min(1, spectrum[i] / FULL_SCALE) * (base - top);
    if (h < 0.5) continue;
    const xc = hz2x(i * binHz);
    if (barPx >= 3) {
      const xa = Math.max(x0, xc - 0.4 * barPx);
      const xb = Math.min(x1, xc + 0.4 * barPx);
      rect(xa, base - h, xb - xa, h);
    } else {
      line(xc, base, xc, base - h);
    }
  }
  peakHz = peakBin * binHz;

  // Peak marker, half-height width bracket and read-out
  if (peakMag > 0.02) {
    const px = hz2x(peakHz);
    const py = base - Math.min(1, peakMag) * (base - top);
    const hw = halfHeightWidth(spectrum, peakBin);
    peakWidthHz = (hw.right - hw.left) * binHz;
    const yHalf = base - Math.min(1, peakMag) * (base - top) / 2;
    const xl = hz2x(hw.left * binHz);
    const xr = hz2x(hw.right * binHz);
    stroke('darkgoldenrod');
    strokeWeight(2);
    line(xl, yHalf, xr, yHalf);
    line(xl, yHalf - 5, xl, yHalf + 5);
    line(xr, yHalf - 5, xr, yHalf + 5);

    fill('gold');
    stroke('darkgoldenrod');
    strokeWeight(1);
    triangle(px - 6, py - 12, px + 6, py - 12, px, py - 2);
    noStroke();
    fill('purple');
    textSize(16);
    textAlign(RIGHT, CENTER);
    const msg = canvasWidth >= 600
      ? 'Strongest bin: ' + peakHz.toFixed(1) + ' Hz, magnitude ' + peakMag.toFixed(2)
      : 'Peak: ' + peakHz.toFixed(1) + ' Hz';
    text(msg, canvasWidth - margin, 236);
  } else {
    peakWidthHz = 0;
  }
}

// Frequency resolution and measured peak width, below the spectrum
function drawResolutionInfo(hasSpectrum) {
  const sr = audioRate();
  const compact = canvasWidth < 600;
  noStroke();
  fill('black');
  textSize(compact ? 14 : 16);
  textAlign(LEFT, CENTER);
  const res = binWidthHz().toFixed(2);
  text((compact ? 'Freq Resolution: ' : 'Freq Resolution: fs / N = ') + sr + ' / ' + windowSamples() + ' = ' + res + ' Hz/bin',
    margin, 444);
  let widthMsg;
  if (!hasSpectrum) widthMsg = 'Peak width at half height: press Start';
  else if (peakMag > 0.02) widthMsg = 'Peak width at half height: ' + peakWidthHz.toFixed(1) + ' Hz (' + (peakWidthHz / binWidthHz()).toFixed(1) + ' bins)';
  else widthMsg = 'Peak width at half height: no peak (amplitude too low)';
  fill('darkgoldenrod');
  text(widthMsg, margin, 462);
}

function drawControlLabels() {
  fill('black');
  noStroke();
  textSize(ctl.labelSize);
  textAlign(LEFT, CENTER);
  text('Frequency: ' + currentFreq.toFixed(0) + ' Hz', ctl.labelX, drawHeight + 25);
  text('Amplitude: ' + currentAmp.toFixed(2), ctl.labelX, drawHeight + 58);
  text(canvasWidth < 500 ? 'FFT Size:' : 'FFT Size (bins):', ctl.labelX, drawHeight + 91);
}

function createControls() {
  // Frequency slider (20-2000 Hz)
  frequencySlider = createSlider(20, 2000, DEFAULT_FREQ, 1);

  // Amplitude slider (0-1)
  amplitudeSlider = createSlider(0, 1, DEFAULT_AMP, 0.01);

  // Start/Pause button
  startButton = createButton('Start');
  startButton.style('width', buttonWidth + 'px');
  startButton.mousePressed(toggleSimulation);

  // Reset button
  resetButton = createButton('Reset');
  resetButton.style('width', buttonWidth + 'px');
  resetButton.mousePressed(resetSimulation);

  // FFT size radio buttons (number of frequency bins from 0 Hz to fs/2)
  fftSizeRadio = createRadio();
  for (const n of FFT_SIZES) fftSizeRadio.option(String(n), n);
  fftSizeRadio.selected(String(DEFAULT_FFT_SIZE));
  fftSizeRadio.style('font-family', 'Arial, Helvetica, sans-serif');
}

// Three rows: [label][slider][button] twice, then [label][radio buttons].
// Narrow screens get smaller labels and padding.
function layoutControls(force) {
  if (typeof fftSizeRadio === 'undefined') return;
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  const compact = canvasWidth < 500;
  ctl = compact
    ? { labelX: 8, labelSize: 14, sliderLeft: 145, radioLeft: 76, radioFont: 14, right: 8 }
    : { labelX: 20, labelSize: 16, sliderLeft: 175, radioLeft: 175, radioFont: 16, right: 20 };
  const buttonX = canvasWidth - ctl.right - buttonWidth;
  const sliderWidth = max(60, buttonX - 10 - ctl.sliderLeft);

  frequencySlider.position(ctl.sliderLeft, drawHeight + 15);
  frequencySlider.size(sliderWidth);
  amplitudeSlider.position(ctl.sliderLeft, drawHeight + 48);
  amplitudeSlider.size(sliderWidth);
  startButton.position(buttonX, drawHeight + 13);
  resetButton.position(buttonX, drawHeight + 46);

  fftSizeRadio.position(ctl.radioLeft, drawHeight + 80);
  fftSizeRadio.style('font-size', ctl.radioFont + 'px');
  for (const lbl of fftSizeRadio.elt.querySelectorAll('label')) {
    lbl.style.marginRight = compact ? '4px' : '12px';
    lbl.style.whiteSpace = 'nowrap';
    lbl.querySelector('input').style.marginRight = compact ? '2px' : '5px';
  }
}

// Build the audio graph: oscillator -> gain -> speakers, and oscillator -> FFT.
// Called from the Start click, because browsers only allow audio after a user gesture.
function startAudio() {
  userStartAudio();                     // p5.sound 0.4.1 returns undefined here (no promise)
  const ctx = getAudioContext();
  if (ctx.state !== 'running') {
    try { ctx.resume(); } catch (e) { /* the oscillator still feeds the FFT */ }
  }

  oscillator = new p5.Oscillator('sine');
  oscillator.freq(currentFreq);
  oscillator.amp(0);

  outputGain = new p5.Gain();           // connected to the speakers by default
  oscillator.disconnect();
  oscillator.connect(outputGain);
  outputGain.getNode().gain.value = OUTPUT_LEVEL;

  buildFFT(currentFFTSize);
  oscillator.start();
  audioReady = true;
}

// p5.sound 0.4.1 fixes the FFT size in the constructor, so a new size needs a new p5.FFT.
function buildFFT(size) {
  if (fft) {
    // Detach the old analyser: reconnect the oscillator to the speakers only
    oscillator.disconnect();
    oscillator.connect(outputGain);
    try { fft.analyzer.dispose(); fft.samples.dispose(); } catch (e) { /* already released */ }
  }
  fft = new p5.FFT(size);               // p5.sound 0.4.1: one argument (size)
  fft.analyzer.smoothing = SMOOTHING;
  // Waveform buffer: 2N samples for short windows (room for the zero-crossing trigger), N for long
  // ones. The buffer lags real time by its own length, so long windows skip the extra N.
  const n = 2 * size;
  try { fft.samples.size = n <= TRIGGER_MAX_N ? 2 * n : n; } catch (e) { /* default 1024 samples */ }
  fft.setInput(oscillator);
  activeFFTSize = size;
}

function checkFFTSizeChange() {
  const selected = parseInt(fftSizeRadio.value());
  if (FFT_SIZES.includes(selected)) currentFFTSize = selected;
  if (audioReady && currentFFTSize !== activeFFTSize) buildFFT(currentFFTSize);
}

function applyOscillator() {
  if (!audioReady || !isRunning) return;
  if (currentFreq !== appliedFreq) {
    oscillator.freq(currentFreq);
    appliedFreq = currentFreq;
  }
  if (currentAmp !== appliedAmp) {
    oscillator.amp(currentAmp, 0.05);
    appliedAmp = currentAmp;
  }
}

function toggleSimulation() {
  if (!audioReady) startAudio();
  isRunning = !isRunning;
  startButton.html(isRunning ? 'Pause' : 'Start');

  if (isRunning) {
    appliedFreq = null;
    appliedAmp = null;
    applyOscillator();
  } else {
    oscillator.amp(0, 0.05);            // silence when paused
  }
}

function resetSimulation() {
  // Restore the default frequency and amplitude; draw() applies them if the tone is running
  frequencySlider.value(DEFAULT_FREQ);
  amplitudeSlider.value(DEFAULT_AMP);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  layoutControls(false);
}
