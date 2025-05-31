// Waveform Type FFT Analysis MicroSim
// Demonstrates how different waveform shapes appear in frequency domain

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

// Control elements
let waveformRadio;
let frequencySlider;

// Simulation state
let currentWaveform = 'sine';
let currentFreq = 50;
let fftSize = 8192;
let sampleRate = 44100;

// Pre-calculated waveform and spectrum data
let waveformData = [];
let spectrumData = [];

function setup() {
  // Responsive canvas setup
  updateCanvasSize();
  const canvas = createCanvas(containerWidth, containerHeight);
  canvas.parent(document.querySelector('main'));
  
  textSize(defaultTextSize);
  
  // Create control elements
  createControls();
  
  // Generate initial waveform and spectrum
  generateWaveformAndSpectrum();
  
  describe('Interactive waveform FFT analysis showing different wave types and their frequency spectra', LABEL);
}

function draw() {
  // Set up drawing regions
  drawRegions();
  
  // Draw title
  drawTitle();
  
  // Check if parameters changed
  let freqChanged = frequencySlider.value() !== currentFreq;
  let waveformChanged = waveformRadio.value() !== currentWaveform;
  
  if (freqChanged || waveformChanged) {
    currentFreq = frequencySlider.value();
    currentWaveform = waveformRadio.value();
    generateWaveformAndSpectrum();
  }
  
  // Draw time-domain waveform (top half)
  drawTimeWaveform();
  
  // Draw frequency spectrum (bottom half)
  drawFrequencySpectrum();
  
  // Draw axis labels and control labels
  drawAxisLabels();
  drawControlLabels();
}

function generateWaveformAndSpectrum() {
  // Generate waveform display with smooth period variation
  let samplesPerDisplay = 1000; // Fixed number of samples for smooth display
  let displayTimeSpan = 0.05; // Show 50ms time window (0.05 seconds)
  waveformData = [];
  
  for (let i = 0; i < samplesPerDisplay; i++) {
    let t = (i / samplesPerDisplay) * displayTimeSpan; // Time in seconds
    let phase = 2 * PI * currentFreq * t; // Phase based on actual frequency
    let sample = 0;
    
    if (currentFreq === 0) {
      // For 0 Hz, show a flat line
      sample = 0;
    } else {
      switch(currentWaveform) {
        case 'sine':
          sample = sin(phase);
          break;
        case 'square':
          sample = phase % (2 * PI) < PI ? 1 : -1;
          break;
        case 'sawtooth':
          let cyclePhase = phase % (2 * PI);
          sample = (cyclePhase / PI) - 1; // -1 to 1 sawtooth
          break;
      }
    }
    
    waveformData.push(sample);
  }
  
  // Generate spectrum data based on the frequency
  generateSpectrum();
}

function generateSpectrum() {
  // Initialize spectrum array
  spectrumData = new Array(fftSize / 2).fill(0);
  
  if (currentFreq === 0) {
    return; // No spectrum for 0 Hz
  }
  
  if (currentWaveform === 'sine') {
    // Sine wave: single peak at fundamental frequency
    let binIndex = Math.floor(currentFreq * fftSize / sampleRate);
    if (binIndex < spectrumData.length) {
      spectrumData[binIndex] = 255;
    }
  } else if (currentWaveform === 'square') {
    // Square wave: odd harmonics with 1/n amplitude
    for (let harmonic = 1; harmonic <= 21; harmonic += 2) {
      let freq = currentFreq * harmonic;
      if (freq > sampleRate / 2) break; // Above Nyquist frequency
      
      let binIndex = Math.floor(freq * fftSize / sampleRate);
      if (binIndex < spectrumData.length) {
        let amplitude = 255 / harmonic;
        spectrumData[binIndex] = amplitude;
      }
    }
  } else if (currentWaveform === 'sawtooth') {
    // Sawtooth wave: all harmonics with 1/n amplitude
    for (let harmonic = 1; harmonic <= 20; harmonic++) {
      let freq = currentFreq * harmonic;
      if (freq > sampleRate / 2) break; // Above Nyquist frequency
      
      let binIndex = Math.floor(freq * fftSize / sampleRate);
      if (binIndex < spectrumData.length) {
        let amplitude = 255 / harmonic;
        spectrumData[binIndex] = amplitude;
      }
    }
  }
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
  text('Waveform Type FFT Analysis', canvasWidth / 2, 10);
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
}

function drawTimeWaveform() {
  // Time-domain waveform (top half)
  let topHeight = drawHeight / 2 - 10;
  let yCenter = topHeight / 2;
  
  stroke('green');
  strokeWeight(2);
  noFill();
  
  if (waveformData.length > 0) {
    beginShape();
    for (let i = 0; i < waveformData.length; i++) {
      let x = map(i, 0, waveformData.length - 1, margin, canvasWidth - margin);
      let y = map(waveformData[i], -1, 1, topHeight - 20, 20);
      vertex(x, y);
    }
    endShape();
  }
  
  // Draw center line for time domain
  stroke('gray');
  strokeWeight(1);
  line(margin, yCenter, canvasWidth - margin, yCenter);
}

function drawFrequencySpectrum() {
  // Frequency spectrum (bottom half)
  let bottomY = drawHeight / 2 + 10;
  let spectrumHeight = drawHeight / 2 - 30;
  
  stroke('purple');
  strokeWeight(1);
  fill('purple');
  
  // Only show frequency range up to 500 Hz
  let maxFreqBin = Math.floor(500 * fftSize / sampleRate);
  maxFreqBin = Math.min(maxFreqBin, spectrumData.length);
  
  for (let i = 1; i < maxFreqBin; i++) {
    let x = map(i, 0, maxFreqBin, margin, canvasWidth - margin);
    let barWidth = (canvasWidth - 2 * margin) / maxFreqBin;
    
    // Map spectrum value to bar height
    let barHeight = map(spectrumData[i], 0, 255, 0, spectrumHeight);
    
    if (barHeight > 1) { // Only draw visible bars
      rect(x, drawHeight - 20 - barHeight, barWidth * 0.8, barHeight);
    }
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
  text('Frequency (Hz) →', canvasWidth - 80, drawHeight - 50);
  push();
  translate(20, 3*drawHeight/4);
  rotate(-PI/2);
  textAlign(CENTER, BOTTOM);
  text('Magnitude', 0, 0);
  pop();
  
  // Frequency scale markers
  textSize(12);
  textAlign(CENTER, TOP);
  for (let freq = 0; freq <= 500; freq += 100) {
    let x = map(freq, 0, 500, margin, canvasWidth - margin);
    text(freq, x, drawHeight - 15);
  }
}

function drawControlLabels() {
  fill('black');
  noStroke();
  textSize(14);
  textAlign(LEFT, CENTER);
  
  // Control labels
  text('Waveform:', 20, drawHeight + 17);
  text('Frequency: ' + currentFreq.toFixed(0) + ' Hz', 20, drawHeight + 55);
  
  // Harmonic content info
  textAlign(RIGHT, CENTER);
  let harmonicInfo = '';
  switch(currentWaveform) {
    case 'sine':
      harmonicInfo = 'Pure tone (fundamental only)';
      break;
    case 'square':
      harmonicInfo = 'Odd harmonics (1st, 3rd, 5th...)';
      break;
    case 'sawtooth':
      harmonicInfo = 'All harmonics (1st, 2nd, 3rd...)';
      break;
  }
  text(harmonicInfo, canvasWidth - 20, drawHeight + 35);
}

function createControls() {
  let sliderLeftMargin = 150;
  
  // Waveform type radio buttons
  waveformRadio = createRadio();
  waveformRadio.option('sine', 'Sine');
  waveformRadio.option('square', 'Square');
  waveformRadio.option('sawtooth', 'Sawtooth');
  waveformRadio.selected('sine');
  waveformRadio.position(100, drawHeight + 15);
  
  // Frequency slider (0-500 Hz)
  frequencySlider = createSlider(0, 500, currentFreq, 1);
  frequencySlider.position(sliderLeftMargin, drawHeight + 45);
  frequencySlider.size(200);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(containerWidth, containerHeight);
  
  // Update slider width for responsive design
  let sliderWidth = Math.min(200, containerWidth - 200);
  frequencySlider.size(sliderWidth);
  
  redraw();
}

function updateCanvasSize() {
  const container = document.querySelector('main').getBoundingClientRect();
  containerWidth = Math.floor(container.width);
  canvasWidth = containerWidth;
}