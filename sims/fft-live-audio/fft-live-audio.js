/**
 * Enhanced FFT from Microphone with Controls
 * Visualize the frequency spectrum of live audio input with adjustable parameters
 * Features smoothness control and FFT size adjustment
 */

// Canvas dimensions and layout
let canvasWidth = 800;
let drawHeight = 400;
let controlHeight = 80;
let canvasHeight = drawHeight + controlHeight;
let margin = 40;
let sliderLeftMargin = 130;
let defaultTextSize = 16;

// Global variables for responsive design
let containerWidth;
let containerHeight = canvasHeight;

// Audio objects
let mic, fft;

// Control elements
let smoothnessSlider, fftSizeSlider;
let startButton, resetButton;

// Simulation state
let isRunning = false;
let currentSmoothness = 0.5;
let currentFftSize = 2048;

// FFT size options (powers of 2 from 128 to 16384)
let fftSizeOptions = [128, 256, 512, 1024, 2048, 4096, 8192, 16384];
let fftSizeIndex = 3; // Start with 1024

function setup() {
  // Responsive canvas setup
  updateCanvasSize();
  const canvas = createCanvas(containerWidth, containerHeight);
  canvas.parent(document.querySelector('main'));
  
  textSize(defaultTextSize);
  noFill();
  
  // Initialize audio input
  mic = new p5.AudioIn();
  
  // Create FFT with initial settings
  fft = new p5.FFT(currentSmoothness, currentFftSize);
  fft.setInput(mic);
  
  // Create control elements
  createControls();
  
  describe('Interactive FFT visualization showing frequency spectrum from live microphone input with adjustable smoothness and FFT size', LABEL);
}

function draw() {
  // Set up drawing regions
  drawRegions();
  
  // Draw title
  drawTitle();
  
  // Update FFT parameters from sliders
  updateFFTParameters();
  
  // Draw frequency spectrum if running
  if (isRunning) {
    drawSpectrum();
  } else {
    drawInactiveState();
  }
  
  // Draw labels and controls
  drawAxisLabels();
  drawControlLabels();
  drawInstructions();
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
}

function drawTitle() {
  fill('black');
  noStroke();
  textSize(24);
  textAlign(CENTER, TOP);
  text('Live Audio FFT Analysis', canvasWidth / 2, 10);
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
}

function updateFFTParameters() {
  // Update smoothness
  let newSmoothness = smoothnessSlider.value();
  if (newSmoothness !== currentSmoothness) {
    currentSmoothness = newSmoothness;
    // Create new FFT with updated smoothness
    fft = new p5.FFT(currentSmoothness, currentFftSize);
    if (isRunning) {
      fft.setInput(mic);
    }
  }
  
  // Update FFT size
  let newFftSizeIndex = floor(fftSizeSlider.value());
  if (newFftSizeIndex !== fftSizeIndex) {
    fftSizeIndex = newFftSizeIndex;
    currentFftSize = fftSizeOptions[fftSizeIndex];
    // Create new FFT with updated size
    fft = new p5.FFT(currentSmoothness, currentFftSize);
    if (isRunning) {
      fft.setInput(mic);
    }
  }
}

function drawSpectrum() {
  let spectrum = fft.analyze();
  
  // Draw frequency spectrum as bars
  stroke('purple');
  strokeWeight(1);
  fill('purple');
  
  // Calculate bar properties
  let plotWidth = canvasWidth - 2 * margin;
  let plotHeight = drawHeight - 2 * margin - 60; // Leave space for title and labels
  let barWidth = plotWidth / spectrum.length;
  
  // Draw spectrum bars
  for (let i = 0; i < spectrum.length; i++) {
    let x = margin + i * barWidth;
    let barHeight = map(spectrum[i], 0, 255, 0, plotHeight);
    
    // Color bars based on intensity
    let intensity = map(spectrum[i], 0, 255, 0, 1);
    fill(255 - intensity * 100, intensity * 255, 255 - intensity * 200, 200);
    
    rect(x, drawHeight - margin - 20 - barHeight, barWidth * 0.8, barHeight);
  }
  
  // Draw baseline
  stroke('gray');
  strokeWeight(1);
  line(margin, drawHeight - margin - 20, canvasWidth - margin, drawHeight - margin - 20);
}

function drawInactiveState() {
  // Show message when not running
  fill('gray');
  noStroke();
  textSize(18);
  textAlign(CENTER, CENTER);
  text('Click "Start" to begin audio analysis', canvasWidth / 2, drawHeight / 2);
  text('(Microphone permission required)', canvasWidth / 2, drawHeight / 2 + 25);
  
  // Draw baseline
  stroke('gray');
  strokeWeight(1);
  line(margin, drawHeight - margin - 20, canvasWidth - margin, drawHeight - margin - 20);
}

function drawAxisLabels() {
  fill('black');
  noStroke();
  textSize(14);
  
  // Frequency domain axis labels  
  textAlign(CENTER, BOTTOM);
  text('Frequency (Hz) →', canvasWidth - 100, drawHeight - 40);
  
  push();
  translate(20, drawHeight/2);
  rotate(-PI/2);
  textAlign(CENTER, BOTTOM);
  text('Magnitude', 0, 0);
  pop();
  
  // Frequency scale markers (approximate)
  textSize(12);
  textAlign(CENTER, TOP);
  let nyquist = 22050; // Approximate Nyquist frequency
  for (let i = 0; i <= 4; i++) {
    let freq = (i / 4) * nyquist;
    let x = map(i, 0, 4, margin, canvasWidth - margin);
    if (freq >= 1000) {
      text((freq/1000).toFixed(0) + 'k', x, drawHeight - 35);
    } else {
      text(freq.toFixed(0), x, drawHeight - 35);
    }
  }
  
  // Reset text alignment
  textAlign(LEFT, CENTER);
}

function drawControlLabels() {
  fill('black');
  noStroke();
  textSize(14);
  textAlign(LEFT, CENTER);
  
  // Smoothness control label
  text('Smoothness: ' + currentSmoothness.toFixed(2), 10, drawHeight + 25);
  
  // FFT Size control label  
  text('FFT Size: ' + currentFftSize, 10, drawHeight + 55);
  
  // Status indicator
  textAlign(RIGHT, CENTER);
  if (isRunning) {
    fill('green');
    text('● RECORDING', canvasWidth - 20, drawHeight + 25);
  } else {
    fill('red');
    text('● STOPPED', canvasWidth - 20, drawHeight + 25);
  }
}

function drawInstructions() {
  fill('gray');
  noStroke();
  textSize(12);
  textAlign(RIGHT, CENTER);
  text('Adjust controls to change analysis parameters', canvasWidth - 20, drawHeight + 55);
}

function createControls() {
  let buttonY = drawHeight + 35;
  
  // Smoothness slider (0.0 - 0.95)
  smoothnessSlider = createSlider(0, 0.95, currentSmoothness, 0.05);
  smoothnessSlider.position(sliderLeftMargin, drawHeight + 15);
  smoothnessSlider.size(200);
  
  // FFT Size slider (0-7 index for fftSizeOptions array)
  fftSizeSlider = createSlider(0, fftSizeOptions.length - 1, fftSizeIndex, 1);
  fftSizeSlider.position(sliderLeftMargin, drawHeight + 45);
  fftSizeSlider.size(200);
  
  // Start/Stop button
  startButton = createButton('Start');
  startButton.position(sliderLeftMargin + 220, buttonY);
  startButton.mousePressed(toggleRecording);
  
  // Reset button
  resetButton = createButton('Reset');
  resetButton.position(sliderLeftMargin + 280, buttonY);
  resetButton.mousePressed(resetAnalysis);
}

function toggleRecording() {
  if (!isRunning) {
    // Start recording
    userStartAudio().then(() => {
      mic.start();
      fft.setInput(mic);
      isRunning = true;
      startButton.html('Stop');
    }).catch(err => {
      console.log('Error starting audio:', err);
      alert('Microphone access denied or unavailable');
    });
  } else {
    // Stop recording
    mic.stop();
    isRunning = false;
    startButton.html('Start');
  }
}

function resetAnalysis() {
  // Reset to default values
  currentSmoothness = 0.8;
  fftSizeIndex = 3;
  currentFftSize = fftSizeOptions[fftSizeIndex];
  
  // Update sliders
  smoothnessSlider.value(currentSmoothness);
  fftSizeSlider.value(fftSizeIndex);
  
  // Recreate FFT with default settings
  fft = new p5.FFT(currentSmoothness, currentFftSize);
  if (isRunning) {
    fft.setInput(mic);
  }
  
  // Force redraw if not running
  if (!isRunning) {
    redraw();
  }
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(containerWidth, containerHeight);
  
  // Update slider widths for responsive design
  let sliderWidth = Math.min(200, containerWidth - 200);
  smoothnessSlider.size(sliderWidth);
  fftSizeSlider.size(sliderWidth);
  
  redraw();
}

function updateCanvasSize() {
  const container = document.querySelector('main').getBoundingClientRect();
  containerWidth = Math.floor(container.width);
  canvasWidth = containerWidth;
}