// FFT with Multiple Frequency Components MicroSim
// Demonstrates how multiple sine waves combine in time domain and appear as distinct peaks in frequency domain

// Canvas dimensions and layout
let canvasWidth = 800;
let drawHeight = 400;
let controlHeight = 120;
let canvasHeight = drawHeight + controlHeight;
let margin = 30;
let defaultTextSize = 16;

// Global variables for responsive design
let containerWidth;
let containerHeight = canvasHeight;

// Audio and FFT objects
let oscillator1, oscillator2, oscillator3;
let fft;

// Control elements
let freq1Slider, amp1Slider;
let freq2Slider, amp2Slider;
let freq3Slider, amp3Slider;
let masterVolumeSlider;
let muteButton;

// Simulation state
let isMuted = false;
let currentFreq1 = 400;
let currentAmp1 = 0.3;
let currentFreq2 = 800;
let currentAmp2 = 0.3;
let currentFreq3 = 1200;
let currentAmp3 = 0.3;
let masterVolume = 0.25;

// Peak detection for labeling
let peakFrequencies = [];

function setup() {
  // Responsive canvas setup
  updateCanvasSize();
  const canvas = createCanvas(containerWidth, containerHeight);
  canvas.parent(document.querySelector('main'));
  
  textSize(defaultTextSize);
  
  // Initialize audio context (required for web audio)
  userStartAudio();
  
  // Create three oscillators for multiple frequency components
  oscillator1 = new p5.Oscillator('sine');
  oscillator1.freq(currentFreq1);
  oscillator1.amp(0);
  oscillator1.start();
  
  oscillator2 = new p5.Oscillator('sine');
  oscillator2.freq(currentFreq2);
  oscillator2.amp(0);
  oscillator2.start();
  
  oscillator3 = new p5.Oscillator('sine');
  oscillator3.freq(currentFreq3);
  oscillator3.amp(0);
  oscillator3.start();
  
  // Create FFT with 0 smoothing and good resolution
  fft = new p5.FFT(0, 1024);
  
  // Create control elements
  createControls();
  
  describe('Interactive FFT visualization showing how multiple sine waves combine in time domain and appear as distinct peaks in frequency domain', LABEL);
}

function draw() {
  // Set up drawing regions
  drawRegions();
  
  // Draw title
  drawTitle();
  
  // Update oscillator parameters from sliders
  updateOscillators();
  
  // Get FFT data
  let spectrum = fft.analyze();
  let waveform = fft.waveform();
  
  // Find peaks in spectrum for labeling
  findPeaks(spectrum);
  
  // Draw time-domain waveform (top half)
  drawTimeSignal(waveform);
  
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
  text('FFT with Multiple Frequency Components', canvasWidth / 2, 10);
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
}

function updateOscillators() {
  // Get current slider values
  currentFreq1 = freq1Slider.value();
  currentAmp1 = amp1Slider.value();
  currentFreq2 = freq2Slider.value();
  currentAmp2 = amp2Slider.value();
  currentFreq3 = freq3Slider.value();
  currentAmp3 = amp3Slider.value();
  masterVolume = masterVolumeSlider.value();
  
  // Update oscillator frequencies
  oscillator1.freq(currentFreq1);
  oscillator2.freq(currentFreq2);
  oscillator3.freq(currentFreq3);
  
  // Update amplitudes (consider mute state and master volume)
  let effectiveVolume = isMuted ? 0 : masterVolume;
  oscillator1.amp(currentAmp1 * effectiveVolume);
  oscillator2.amp(currentAmp2 * effectiveVolume);
  oscillator3.amp(currentAmp3 * effectiveVolume);
}

function drawTimeSignal(waveformData) {
  // Time-domain waveform (top half)
  let topHeight = drawHeight / 2 - 10;
  let yCenter = topHeight / 2;
  
  stroke('blue');
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
  
  // Draw component frequency indicators
  fill('black');
  noStroke();
  textSize(12);
  textAlign(LEFT, TOP);
  text('Combined Signal: ' + currentFreq1 + 'Hz + ' + currentFreq2 + 'Hz + ' + currentFreq3 + 'Hz', margin + 5, 35);
}

function drawSpectrum(spectrum) {
  // Frequency spectrum (bottom half)
  let bottomY = drawHeight / 2 + 10;
  let spectrumHeight = drawHeight / 2 - 30;
  
  stroke('red');
  strokeWeight(1);
  fill('red');
  
  // Show frequency range up to 1500 Hz for better visibility
  let maxFreqBin = Math.floor(1500 * spectrum.length / (22050)); // Nyquist is ~22kHz
  
  for (let i = 1; i < maxFreqBin; i++) {
    let x = map(i, 0, maxFreqBin, margin, canvasWidth - margin);
    let barWidth = (canvasWidth - 2 * margin) / maxFreqBin;
    
    // Map spectrum value to bar height with better scaling
    let barHeight = map(spectrum[i], 0, 255, 0, spectrumHeight * 0.8);
    
    rect(x, drawHeight - 20 - barHeight, barWidth * 0.8, barHeight);
  }
  
  // Draw baseline for frequency domain
  stroke('gray');
  strokeWeight(1);
  line(margin, drawHeight - 20, canvasWidth - margin, drawHeight - 20);
  
  // Draw peak frequency labels
  drawPeakLabels(spectrum, maxFreqBin, spectrumHeight);
}

function findPeaks(spectrum) {
  peakFrequencies = [];
  let threshold = 50; // Minimum height for peak detection
  let maxFreqBin = Math.floor(1500 * spectrum.length / (22050));
  
  // Simple peak detection - find local maxima above threshold
  for (let i = 2; i < maxFreqBin - 2; i++) {
    if (spectrum[i] > threshold && 
        spectrum[i] > spectrum[i-1] && 
        spectrum[i] > spectrum[i+1] && 
        spectrum[i] > spectrum[i-2] && 
        spectrum[i] > spectrum[i+2]) {
      
      let frequency = Math.round(i * 22050 / spectrum.length);
      peakFrequencies.push({
        freq: frequency,
        magnitude: spectrum[i],
        bin: i
      });
    }
  }
  
  // Sort by magnitude and keep top 5 peaks
  peakFrequencies.sort((a, b) => b.magnitude - a.magnitude);
  peakFrequencies = peakFrequencies.slice(0, 5);
}

function drawPeakLabels(spectrum, maxFreqBin, spectrumHeight) {
  fill('darkred');
  noStroke();
  textSize(11);
  textAlign(CENTER, BOTTOM);
  
  for (let peak of peakFrequencies) {
    if (peak.bin < maxFreqBin) {
      let x = map(peak.bin, 0, maxFreqBin, margin, canvasWidth - margin);
      let barHeight = map(peak.magnitude, 0, 255, 0, spectrumHeight * 0.8);
      let labelY = drawHeight - 20 - barHeight - 5;
      
      // Draw peak marker line
      stroke('darkred');
      strokeWeight(1);
      line(x, drawHeight - 20, x, labelY + 3);
      
      // Draw frequency label
      noStroke();
      text(peak.freq + 'Hz', x, labelY);
    }
  }
}

function drawAxisLabels() {
  fill('black');
  noStroke();
  textSize(14);
  
  // Time domain labels
  textAlign(LEFT, TOP);
  text('Time Domain (Combined Signal)', margin, 55);
  
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
  text('Frequency Domain (FFT Spectrum)', margin, drawHeight / 2 + 25);
  
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
  textSize(10);
  textAlign(CENTER, TOP);
  for (let freq = 0; freq <= 1500; freq += 250) {
    let x = map(freq, 0, 1500, margin, canvasWidth - margin);
    text(freq, x, drawHeight - 15);
  }
}

function drawControlLabels() {
  fill('black');
  noStroke();
  textSize(12);
  textAlign(LEFT, CENTER);
  let sliderWidth = canvasWidth*.23;
  let col1X = margin;
  let col2X = margin*2 + sliderWidth;
  let col3X = margin*3 + sliderWidth*2;
  let sliderYoffsetRow1 = 20;
  let sliderYoffsetRow2 = 55;
  let sliderYoffsetRow3 = 90;
  
  // Component 1 labels
  text('Freq 1: ' + currentFreq1.toFixed(0) + ' Hz', col1X, drawHeight + sliderYoffsetRow1);
  text('Amp 1: ' + currentAmp1.toFixed(2), col1X, drawHeight + sliderYoffsetRow2);
  
  // Component 2 labels
  text('Freq 2: ' + currentFreq2.toFixed(0) + ' Hz', col2X, drawHeight + sliderYoffsetRow1);
  text('Amp 2: ' + currentAmp2.toFixed(2), col2X, drawHeight + sliderYoffsetRow2);
  
  // Component 3 labels
  text('Freq 3: ' + currentFreq3.toFixed(0) + ' Hz', col3X, drawHeight + sliderYoffsetRow1);
  text('Amp 3: ' + currentAmp3.toFixed(2), col3X, drawHeight + sliderYoffsetRow2);
  
  // Master controls
  text('Master: ' + masterVolume.toFixed(2), col1X, drawHeight + sliderYoffsetRow3);
  
  // Status indicator
  textAlign(RIGHT, CENTER);
  if (isMuted) {
    fill('red');
    text('🔇 MUTED', canvasWidth - 20, drawHeight + 25);
  } else {
    fill('green');
    text('🔊 PLAYING', canvasWidth - 20, drawHeight + 25);
  }
}

function createControls() {
  let sliderLeftMargin = 90;
  let sliderWidth = canvasWidth*.23;
  let col1X = margin;
  let col2X = margin*2 + sliderWidth;
  let col3X = margin*3 + sliderWidth*2;
  let sliderYoffsetRow1 = 25;
  let sliderYoffsetRow2 = 60;
  let sliderYoffsetRow3 = 90;
  
  // Component 1 controls
  freq1Slider = createSlider(50, 1000, currentFreq1, 1);
  freq1Slider.position(col1X, drawHeight + sliderYoffsetRow1);
  freq1Slider.size(sliderWidth);
  
  amp1Slider = createSlider(0, 1, currentAmp1, 0.01);
  amp1Slider.position(col1X, drawHeight + sliderYoffsetRow2);
  amp1Slider.size(sliderWidth);
  
  // Component 2 controls
  freq2Slider = createSlider(50, 1000, currentFreq2, 1);
  freq2Slider.position(col2X, drawHeight + sliderYoffsetRow1);
  freq2Slider.size(sliderWidth);
  
  amp2Slider = createSlider(0, 1, currentAmp2, 0.01);
  amp2Slider.position(col2X, drawHeight + sliderYoffsetRow2);
  amp2Slider.size(sliderWidth);
  
  // Component 3 controls
  freq3Slider = createSlider(50, 1500, currentFreq3, 1);
  freq3Slider.position(col3X, drawHeight + sliderYoffsetRow1);
  freq3Slider.size(sliderWidth);
  
  amp3Slider = createSlider(0, 1, currentAmp3, 0.01);
  amp3Slider.position(col3X, drawHeight + sliderYoffsetRow2);
  amp3Slider.size(sliderWidth);
  
  // Master volume control
  masterVolumeSlider = createSlider(0, .35, masterVolume, 0.01);
  masterVolumeSlider.position(margin, drawHeight + sliderYoffsetRow3+7);
  masterVolumeSlider.size(sliderWidth);
  
  // Mute button
  muteButton = createButton('Mute');
  muteButton.position(sliderLeftMargin + 140, drawHeight + sliderYoffsetRow3);
  muteButton.mousePressed(toggleMute);
}

function toggleMute() {
  isMuted = !isMuted;
  muteButton.html(isMuted ? 'Unmute' : 'Mute');
  
  if (!isMuted) {
    // Ensure audio context is running when unmuting
    userStartAudio();
  }
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(containerWidth, containerHeight);
  
  // Update slider positions for responsive design if needed
  // For this complex layout, we'll keep fixed positions for clarity
  
  redraw();
}

function updateCanvasSize() {
  const container = document.querySelector('main').getBoundingClientRect();
  containerWidth = Math.floor(container.width);
  canvasWidth = containerWidth;
}