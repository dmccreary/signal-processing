// Basic FFT Visualization MicroSim
// Demonstrates fundamental FFT concepts by showing time-domain signal and frequency spectrum

// Canvas dimensions and layout
let canvasWidth = 800;
let drawHeight = 400;
let controlHeight = 80;
let canvasHeight = drawHeight + controlHeight;
let margin = 40;
let defaultTextSize = 16;

// Global variables for responsive design
let containerWidth;
let containerHeight = canvasHeight;

// Audio and FFT objects
let oscillator;
let fft;

// Control elements
let frequencySlider, amplitudeSlider;
let startButton, resetButton;

// Simulation state
let isRunning = false;
let currentFreq = 440; // A4 note
let currentAmp = 0.5;

function setup() {
  // Responsive canvas setup
  updateCanvasSize();
  const canvas = createCanvas(containerWidth, containerHeight);
  canvas.parent(document.querySelector('main'));
  
  textSize(defaultTextSize);
  
  // Initialize audio context (required for web audio)
  userStartAudio();
  
  // Create oscillator and FFT
  oscillator = new p5.Oscillator('sine');
  oscillator.freq(currentFreq);
  oscillator.amp(0); // Start silent
  oscillator.start();
  
  // Create FFT with moderate smoothing and good resolution
  fft = new p5.FFT(0.8, 1024);
  
  // Create control elements
  createControls();
  
  describe('Interactive FFT visualization showing how sine waves appear in both time and frequency domains', LABEL);
}

function draw() {
  // Set up drawing regions
  drawRegions();
  
  // Draw title
  drawTitle();
  
  // Update oscillator parameters from sliders
  updateOscillator();
  
  // Get FFT data
  let spectrum = fft.analyze();
  let myWaveform = fft.waveform();
  
  // Draw time-domain waveform (top half)
  drawTimeSignal(myWaveform);
  
  // Draw frequency spectrum (bottom half)
  drawSpectrum(spectrum);
  
  // Draw axis labels and control labels
  drawAxisLabels();
  drawControlLabels();
}

function drawRegions() {
  // Drawing area background (light blue)
  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);
  
  // Controls area background (white)
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(0, drawHeight, canvasWidth, controlHeight);
  
  // Separator line between time and frequency domains
  stroke('black');
  strokeWeight(1);
  let midLine = drawHeight / 2;
  line(margin, midLine, canvasWidth - margin, midLine);
}

function drawTitle() {
  fill('black');
  noStroke();
  textSize(24);
  textAlign(CENTER, TOP);
  text('Basic FFT Visualization', canvasWidth / 2, 10);
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
}

function updateOscillator() {
  if (isRunning) {
    currentFreq = frequencySlider.value();
    currentAmp = amplitudeSlider.value();
    oscillator.freq(currentFreq);
    oscillator.amp(currentAmp);
  } else {
    oscillator.amp(0); // Silence when paused
  }
}

function drawTimeSignal(waveformData) {
  // Time-domain waveform (top half)
  let topHeight = drawHeight / 2 - 10;
  let yCenter = topHeight / 2;
  
  stroke('green');
  strokeWeight(2);
  noFill();
  
  beginShape();
  for (let i = 0; i < waveformData.length; i++) {
    let x = map(i, 0, waveformData.length - 1, margin, canvasWidth - margin);
    let y = map(waveformData[i], -1, 1, topHeight - 20, 20);
    vertex(x, y);
  }
  endShape();
  
  // Draw center line for time domain
  stroke('gray');
  strokeWeight(1);
  line(margin, yCenter, canvasWidth - margin, yCenter);
}

function drawSpectrum(spectrum) {
  // Frequency spectrum (bottom half)
  let bottomY = drawHeight / 2 + 10;
  let spectrumHeight = drawHeight / 2 - 30;
  
  stroke('purple');
  strokeWeight(1);
  fill('purple');
  
  // Only show meaningful frequency range (0-2000 Hz)
  let maxFreqBin = Math.floor(2000 * spectrum.length / (22050)); // Nyquist is ~22kHz
  
  for (let i = 1; i < maxFreqBin; i++) {
    let x = map(i, 0, maxFreqBin, margin, canvasWidth - margin);
    let barWidth = (canvasWidth - 2 * margin) / maxFreqBin;
    
    // Map spectrum value to bar height
    let barHeight = map(spectrum[i], 0, 255, 0, spectrumHeight);
    
    rect(x, drawHeight - 20 - barHeight, barWidth * 0.8, barHeight);
  }
  
  // Draw baseline for frequency domain
  stroke('gray');
  strokeWeight(1);
  line(margin, drawHeight - 20, canvasWidth - margin, drawHeight - 20);
}

function drawAxisLabels() {
  fill('black');
  noStroke();
  textSize(14);
  
  // Time domain labels
  textAlign(LEFT, TOP);
  text('Time Domain', margin, 35);
  
  // Time domain axis labels
  textAlign(CENTER, BOTTOM);
  text('Time →', canvasWidth - 60, drawHeight/4+20);
  push();
  translate(20, drawHeight/4);
  rotate(-PI/2);
  textAlign(CENTER, BOTTOM);
  text('Amplitude', 0, 0);
  pop();
  
  // Frequency domain labels
  textAlign(LEFT, TOP);
  text('Frequency Domain', margin, drawHeight / 2 + 25);
  
  // Frequency domain axis labels  
  textAlign(CENTER, BOTTOM);
  text('Frequency (Hz) →', canvasWidth - 100, drawHeight/2 + 40);
  push();
  translate(20, 3*drawHeight/4);
  rotate(-PI/2);
  textAlign(CENTER, BOTTOM);
  text('Magnitude', 0, 0);
  pop();
  
  // Frequency scale markers
  textSize(12);
  textAlign(CENTER, TOP);
  for (let freq = 0; freq <= 2000; freq += 500) {
    let x = map(freq, 0, 2000, margin, canvasWidth - margin);
    text(freq, x, drawHeight - 15);
  }
}

function drawControlLabels() {
  fill('black');
  noStroke();
  textSize(14);
  textAlign(LEFT, CENTER);
  
  // Frequency control label
  text('Frequency: ' + currentFreq.toFixed(0) + ' Hz', 20, drawHeight + 25);
  
  // Amplitude control label  
  text('Amplitude: ' + currentAmp.toFixed(2), 20, drawHeight + 55);
  
  // Status indicator
  textAlign(RIGHT, CENTER);
  if (isRunning) {
    fill('green');
    text('● RUNNING', canvasWidth - 20, drawHeight + 25);
  } else {
    fill('red');
    text('● PAUSED', canvasWidth - 20, drawHeight + 25);
  }
}

function createControls() {
  let sliderLeftMargin = 150;
  let buttonY = drawHeight + 35;
  
  // Frequency slider (20-2000 Hz)
  frequencySlider = createSlider(20, 2000, currentFreq, 1);
  frequencySlider.position(sliderLeftMargin, drawHeight + 15);
  frequencySlider.size(200);
  
  // Amplitude slider (0-1)
  amplitudeSlider = createSlider(0, 1, currentAmp, 0.01);
  amplitudeSlider.position(sliderLeftMargin, drawHeight + 45);
  amplitudeSlider.size(200);
  
  // Start/Pause button
  startButton = createButton('Start');
  startButton.position(sliderLeftMargin + 220, buttonY);
  startButton.mousePressed(toggleSimulation);
  
  // Reset button
  resetButton = createButton('Reset');
  resetButton.position(sliderLeftMargin + 280, buttonY);
  resetButton.mousePressed(resetSimulation);
}

function toggleSimulation() {
  isRunning = !isRunning;
  startButton.html(isRunning ? 'Pause' : 'Start');
  
  if (isRunning) {
    // Ensure audio context is running
    userStartAudio();
  }
}

function resetSimulation() {
  // Reset to default values
  currentFreq = 440;
  currentAmp = 0.5;
  
  // Update sliders
  frequencySlider.value(currentFreq);
  amplitudeSlider.value(currentAmp);
  
  // Update oscillator
  oscillator.freq(currentFreq);
  
  // If not running, force a redraw to show reset state
  if (!isRunning) {
    redraw();
  }
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(containerWidth, containerHeight);
  
  // Update slider widths for responsive design
  let sliderWidth = Math.min(200, containerWidth - 200);
  frequencySlider.size(sliderWidth);
  amplitudeSlider.size(sliderWidth);
  
  redraw();
}

function updateCanvasSize() {
  const container = document.querySelector('main').getBoundingClientRect();
  containerWidth = Math.floor(container.width);
  canvasWidth = containerWidth;
}