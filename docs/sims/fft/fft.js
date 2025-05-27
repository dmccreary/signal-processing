// Display two waves (Sine and Cosine) and their mix and FFTs
let signalSine;
let signalCos;
let fft;
let freqSliderSine, freqSliderCos, ampSliderSine, ampSliderCos;
let pauseButton;
let isPaused = false;

// Canvas regions setup
let drawHeight = 400;
let controlHeight = 80;
let canvasHeight = drawHeight + controlHeight;
let aspectRatio = 1.91; // Open Graph standard
let canvasWidth = canvasHeight * aspectRatio;

function setup() {
  const canvas = createCanvas(canvasWidth, canvasHeight);
  var mainElement = document.querySelector('main');
  if (mainElement) {
    canvas.parent(mainElement);
  }
  
  noFill();
  textSize(12);
  
  // Position controls in the control area below the drawing
  let controlY = drawHeight + 20;
  let sliderSpacing = 180;
  
  // Define sliders for sine wave frequency and amplitude
  freqSliderSine = createSlider(20, 2000, 440, 1);
  freqSliderSine.position(20, controlY);
  ampSliderSine = createSlider(0, 1, 0.5, 0.01);
  ampSliderSine.position(20, controlY + 30);
  
  // Define sliders for cosine wave frequency and amplitude
  freqSliderCos = createSlider(20, 2000, 880, 1);
  freqSliderCos.position(20 + sliderSpacing, controlY);
  ampSliderCos = createSlider(0, 1, 0.3, 0.01);
  ampSliderCos.position(20 + sliderSpacing, controlY + 30);

  // Create pause button
  pauseButton = createButton('Pause');
  pauseButton.position(20 + sliderSpacing * 2, controlY);

  // Create mute button
  muteButton = createButton('Mute');
  muteButton.position(20 + sliderSpacing * 3, controlY);
  
  // Initialize sine and cosine oscillators
  signalSine = new p5.Oscillator('sine');
  signalSine.phase(0);
  signalSine.start();
  signalSine.amp(0);

  signalCos = new p5.Oscillator('cosine');
  signalCos.phase(0);
  signalCos.start();
  signalCos.amp(0);

  // Initialize FFT object
  fft = new p5.FFT();
  
  frameRate(20);
  pauseButton.mousePressed(togglePause);
}

function draw() {
  // Background of drawing region
  fill('aliceblue');
  rect(0, 0, canvasWidth, drawHeight);
  
  // Background of controls
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  if (!isPaused) {
    // Update frequencies and amplitudes from sliders
    signalSine.freq(freqSliderSine.value());
    signalSine.amp(ampSliderSine.value());
    signalCos.freq(freqSliderCos.value());
    signalCos.amp(ampSliderCos.value());

    // Display the waveform and spectrum
    displayWaveformAndSpectrum();
  } else {
    signalSine.freq(0);
    signalSine.amp(0);
    signalCos.freq(0);
    signalCos.amp(0);
  }

  // Drawing labels for controls and display sections
  drawControlLabels();
  drawDisplayLabels();
}

// Function to display waveform and spectrum with proper alignment
function displayWaveformAndSpectrum() {
  let waveform = fft.waveform();
  let spectrum = fft.analyze();
  
  // Define drawing areas
  let timeHeight = drawHeight / 2;
  let freqHeight = drawHeight / 2;
  let margin = 50;
  let plotWidth = canvasWidth - 2 * margin;
  
  // Draw time-domain waveform (top half)
  stroke('green');
  strokeWeight(2);
  beginShape();
  noFill();
  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length, margin, canvasWidth - margin);
    let y = map(waveform[i], -1, 1, timeHeight - 40, 40);
    vertex(x, y);
  }
  endShape();

  // Draw frequency spectrum (bottom half) - full width
  stroke('purple');
  strokeWeight(2);
  beginShape();
  noFill();
  for (let i = 0; i < spectrum.length; i++) {
    let x = map(i, 0, spectrum.length, margin, canvasWidth - margin);
    let y = map(spectrum[i], 0, 255, drawHeight - 10, timeHeight + 60);
    vertex(x, y);
  }
  endShape();
  
  // Draw center line to separate sections
  stroke(150);
  strokeWeight(1);
  line(0, timeHeight, canvasWidth, timeHeight);
  
  strokeWeight(1);
}

// Function to toggle pause and restart
function togglePause() {
  isPaused = !isPaused;
  pauseButton.html(isPaused ? 'Restart' : 'Pause');
}

// Function to draw labels for controls
function drawControlLabels() {
  fill(0);
  textSize(14);
  
  // Control labels
  text('Sine Freq: ' + freqSliderSine.value() + ' Hz', 25, drawHeight + 15);
  text('Sine Amp: ' + ampSliderSine.value().toFixed(2), 25, drawHeight + 45);
  text('Cosine Freq: ' + freqSliderCos.value() + ' Hz', 205, drawHeight + 15);
  text('Cosine Amp: ' + ampSliderCos.value().toFixed(2), 205, drawHeight + 45);
  
  noFill();
}

// Function to draw display section labels
function drawDisplayLabels() {
  fill(0);
  textSize(14);
  textStyle(BOLD);
  
  // Time domain label (top section)
  text('TIME DOMAIN: Combined Signal (Sine + Cosine)', 60, 25);
  textSize(10);
  textStyle(NORMAL);
  text('Amplitude vs. Time - Combined waveform of both oscillators', 60, 38);
  
  // Frequency domain label (bottom section)
  textSize(14);
  textStyle(BOLD);
  text('FREQUENCY DOMAIN: FFT Analysis', 60, drawHeight/2 + 25);
  textSize(14);
  textStyle(NORMAL);
  text('Magnitude vs. Frequency - Shows individual frequency components', 60, drawHeight/2 + 38);
  text('Look for peaks at ' + freqSliderSine.value() + ' Hz (sine) and ' + freqSliderCos.value() + ' Hz (cosine)', 60, drawHeight/2 + 50);
  
  // Add axis labels
  textSize(14);
  fill(100);
  
  // Time domain axis labels
  text('Time →', canvasWidth - 80, drawHeight/4);
  push();
  translate(20, drawHeight/4);
  rotate(-PI/2);
  text('Amplitude', 0, 0);
  pop();
  
  // Frequency domain axis labels  
  text('Frequency (Hz) →', canvasWidth - 120, drawHeight - 60);
  push();
  translate(20, 3*drawHeight/4);
  rotate(-PI/2);
  text('Magnitude', 0, 0);
  pop();
  
  noFill();
}