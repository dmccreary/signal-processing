let signalSine;
let signalCos;
let fft;
let freqSliderSine, freqSliderCos, ampSliderSine, ampSliderCos;
let pauseButton;
let isPaused = false; // Variable to toggle pause and restart

function setup() {
  createCanvas(800, 550); // Adjusted for additional UI elements
  noFill();
  textSize(12); // Set text size for labels
  
  // Define sliders for sine wave frequency and amplitude
  freqSliderSine = createSlider(20, 2000, 440, 1);
  freqSliderSine.position(20, height - 120);
  ampSliderSine = createSlider(0, 1, 0.5, 0.01);
  ampSliderSine.position(20, height - 90);
  
  // Define sliders for cosine wave frequency and amplitude
  freqSliderCos = createSlider(20, 2000, 440, 1);
  freqSliderCos.position(220, height - 120);
  ampSliderCos = createSlider(0, 1, 0.5, 0.01);
  ampSliderCos.position(220, height - 90);

  // Initialize sine and cosine oscillators with a constant phase
  signalSine = new p5.Oscillator('sine');
  signalSine.phase(0); // Set phase to 0 or any constant value
  signalSine.start();
  signalSine.amp(0); // Set amplitude to 0 to prevent sound output

  signalCos = new p5.Oscillator('cosine');
  signalCos.phase(0); // Set phase to 0 or any constant value
  signalCos.start();
  signalCos.amp(0); // Set amplitude to 0 to prevent sound output

  // Initialize FFT object
  fft = new p5.FFT();
  
  frameRate(10); // Optional: Adjust frame rate

  // Create pause button
  pauseButton = createButton('Pause');
  pauseButton.position(420, height - 120);
  pauseButton.mousePressed(togglePause);
}

function draw() {
  background(200);

  if (!isPaused) {
    // Update frequencies and amplitudes from sliders
    signalSine.freq(freqSliderSine.value());
    signalSine.amp(ampSliderSine.value()); // Use amplitude slider value
    signalCos.freq(freqSliderCos.value());
    signalCos.amp(ampSliderCos.value()); // Use amplitude slider value

    // Display the waveform and spectrum
    displayWaveformAndSpectrum();
  }
  else if(isPaused){
    signalSine.freq(0);
    signalSine.amp(0); // Use amplitude slider value
    signalCos.freq(0);
    signalCos.amp(0); // Use amplitude slider value
  }

  // Drawing labels for each slider
  drawLabels();
}

// Function to display waveform and spectrum
function displayWaveformAndSpectrum() {
  let waveform = fft.waveform();
  beginShape();
  stroke(20);
  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length, 0, width);
    let y = map(waveform[i], -1, 1, height/4, 3*height/4 - 150);
    vertex(x, y);
  }
  endShape();

  let spectrum = fft.analyze();
  beginShape();
  stroke(100, 0, 255);
  for (let i = 0; i < spectrum.length; i++) {
    let x = map(i, 0, spectrum.length, 0, width);
    let y = map(spectrum[i], 0, 255, height - 150, height/2 - 50);
    vertex(x, y);
  }
  endShape();
}

// Function to toggle pause and restart
function togglePause() {
  isPaused = !isPaused;
  pauseButton.html(isPaused ? 'Restart' : 'Pause');
}

// Function to draw labels for sliders
function drawLabels() {
  // fill(0);
  text('fm', freqSliderSine.x, freqSliderSine.y - 10);
  text('Am', ampSliderSine.x, ampSliderSine.y - 10);
  text('fc', freqSliderCos.x, freqSliderCos.y - 10);
  text('Ac', ampSliderCos.x, ampSliderCos.y - 10);
}
