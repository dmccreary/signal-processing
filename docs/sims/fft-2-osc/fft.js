// Display the sum of two oscilators, one sine and cosine
// Use sliders to change the frequency and amplititude of each wave
// Display the sum of the waves on top half of the canvas
// Display the FFT frequency response on the lower half of the canvas
// See https://p5js.org/reference/p5.sound/p5.FFT/ for details on the p5 FFT
// Place controls under the canvas
let signalSine;
let signalCos;
let fft;
let freqSliderSine, freqSliderCos, ampSliderSine, ampSliderCos;
let pauseButton; // pause the display
let muteButton; // Turn off the sound
let isPaused = false;
let isMuted = false;

// Canvas regions setup
// This is the region we do the drawing
let drawHeight = 400;

// This is the region we place the slider and button controls 
let controlHeight = 80;

let canvasHeight = drawHeight + controlHeight;
let aspectRatio = 1.91; // Open Graph standard for social previews
let canvasWidth = canvasHeight * aspectRatio;

// for a responsive design we need global variables
let containerWidth; // calculated by container upon resize
let containerHeight = canvasHeight; // fixed height on page
// distance from edge of canvas to a drawing component
let margin = 20;

// oscillator parameters
let maxFrequency = 100; // maximum frequency in Hz

function setup() {
  // Create a canvas to match the parent container's size
  updateCanvasSize();
  const canvas = createCanvas(containerWidth, containerHeight);
  canvas.parent(document.querySelector('main'));
  
  noFill();
  textSize(12);
  
  // Position controls in the control area below the drawing
  let controlY = drawHeight + 20;
  let sliderSpacing = 180;
  
  // Define sliders for sine wave frequency and amplitude
  // Oscillator 1
  freqSliderSine = createSlider(20, 2000, 440, 1);
  freqSliderSine.position(20, controlY);
  ampSliderSine = createSlider(0, 1, 0.5, 0.01);
  ampSliderSine.position(20, controlY + 30);
  
  // Oscillator 2
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
  muteButton.mousePressed(toggleMute);

  
  // Initialize oscillators
  signalSine = new p5.Oscillator('sine');
  signalSine.phase(0);
  signalSine.start();
  signalSine.amp(0);

  signalCos = new p5.Oscillator('cosine');
  signalCos.phase(0);
  signalCos.start();
  signalCos.amp(0);

  // Initialize the very cool p5.js FFT object
  fft = new p5.FFT();
  
  frameRate(20);
  pauseButton.mousePressed(togglePause);
}

function draw() {
  // create a light gray boarder around drawing region and control regions
  stroke('silver');
  // Background of drawing region in light blue
  fill('aliceblue');
  rect(0, 0, canvasWidth, drawHeight);
  
  // Background of controls in white
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  
  // Draw Title and place it in the top center of the drawing region
  textSize(22);
  noStroke();
  fill('black');
  textAlign(CENTER,CENTER);
  text('Sum of Two Oscillator Waves', canvasWidth/2, margin)
  textAlign(LEFT,CENTER);
  
  if (!isPaused) {
  // Update frequencies and amplitudes from sliders
  signalSine.freq(freqSliderSine.value());
  signalSine.amp(ampSliderSine.value());
  signalCos.freq(freqSliderCos.value());
  signalCos.amp(ampSliderCos.value());
  } else {
    // Paused: set both frequency and amplitude to 0
    signalSine.freq(0);
    signalSine.amp(0);
    signalCos.freq(0);  
    signalCos.amp(0);
  }
  
  // Display the waveform and spectrum
  displayWaveformAndSpectrum();
  // Drawing labels for controls and display sections
  drawControlLabels();
  drawDisplayLabels();
}

// Function to display waveform and spectrum with proper alignment
function displayWaveformAndSpectrum() {
  let waveform = fft.waveform();
  // this is where we get the frequency spectrum from the waves
  let spectrum = fft.analyze();
  
  // Define drawing areas
  let margin = 50;
  let timeHeight = drawHeight / 2 + 30;
  let freqHeight = drawHeight / 2 + 40;

  let plotWidth = canvasWidth - 2 * margin;
  
  // Draw time-domain waveform (top half)
  stroke('green');
  strokeWeight(2);
  beginShape();
  noFill();
  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length, margin, canvasWidth - margin);
    let y = map(waveform[i], -1, 1, timeHeight - 10, 40);
    vertex(x, y);
  }
  endShape();
  
  // Draw center line to separate sections
  stroke('black');
  strokeWeight(1);
  let separatorLineHeight = canvasHeight/2-margin+20
  line(0, separatorLineHeight, canvasWidth, separatorLineHeight);


  // Draw frequency spectrum (bottom half) - full width
  stroke('purple');
  strokeWeight(2);
  beginShape();
  noFill();
  // replace spectrum.length (10k?) with maxFrequency (2K)
  for (let i = 0; i < maxFrequency; i++) {
    let x = map(i, 0, maxFrequency, margin, canvasWidth - margin);
    let y = map(spectrum[i], 0, 255, drawHeight - 10, freqHeight);
    vertex(x, y);
  }
  endShape();
  
  
  strokeWeight(1);
}

// Function to toggle pause and restart
function togglePause() {
  isPaused = !isPaused;
  pauseButton.html(isPaused ? 'Restart' : 'Pause');
}

function toggleMute() {
  isMuted = !isMuted;
  if (isMuted) {
    outputVolume(0); // Mute all audio
  } else {
    outputVolume(1); // Restore full volume
  }
  muteButton.html(isMuted ? 'Unmute' : 'Mute');
}

// Function to draw labels for controls
function drawControlLabels() {
  fill(0);
  noStroke();
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
  noStroke();
  fill('green');
  textSize(14);
  textStyle(BOLD);
  
  // Time domain label (top section)
  let yOffset = 45;
  text('TIME DOMAIN: Combined Signal (Sine + Cosine)', 60, yOffset);
  
  // Frequency domain label (bottom section)
  textSize(14);
  fill('purple');
  textStyle(BOLD);
  text('FREQUENCY DOMAIN: FFT Analysis', 60, drawHeight/2 + 25);
  
  // Add axis labels
  textSize(14);
  fill(100);
  
  // Time domain axis labels
  text('Time →', canvasWidth - 80, drawHeight/4);
  push();
  translate(20, drawHeight/4);
  rotate(-PI/2);
  text('Amplitude', -40, 0);
  pop();
  
  // Frequency domain axis labels  
  text('Frequency (Hz) →', canvasWidth - 120, drawHeight - 60);
  push();
  translate(20, 3*drawHeight/4);
  rotate(-PI/2);
  text('Magnitude', -40, 0);
  pop();
  
  noFill();
}

function windowResized() {
  // Update canvas size when the container resizes
  updateCanvasSize();
  resizeCanvas(containerWidth, containerHeight);
  redraw();
  // speedSlider.size(canvasWidth - sliderLeftMargin - 15);
  // radiusSlider.size(canvasWidth - sliderLeftMargin - 15);
}

function updateCanvasSize() {
    // Get the exact dimensions of the container
    const container = document.querySelector('main').getBoundingClientRect();
    containerWidth = Math.floor(container.width);  // Avoid fractional pixels
    canvasWidth = containerWidth;
}