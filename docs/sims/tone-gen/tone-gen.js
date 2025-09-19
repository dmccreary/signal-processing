// Tone Generator with p5.js
// This code creates a simple tone generator that allows users to change the frequency of a sound
// by dragging the mouse horizontally across the canvas.

let canvasWidth = 500;
let drawHeight = 200;
let controlHeight = 50;
let canvasHeight = drawHeight + controlHeight;
let margin = 25;
let sliderLeftMargin = 80;
let defaultTextSize = 16;

// Global variables for responsive design
let containerWidth; // calculated by container upon resize
let containerHeight = canvasHeight; // fixed height on page
let osc, fft;

function setup(){
  // Create a canvas to match the parent container's size
  updateCanvasSize();
  const canvas = createCanvas(containerWidth, containerHeight);
  canvas.parent(document.querySelector('main'));
  canvas.mousePressed(startSound);
  osc = new p5.Oscillator();
  osc.amp(0);
  fft = new p5.FFT();
}

function draw(){
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
  
  // Title
  fill('gray');
  noStroke();
  textSize(16);
  textAlign(CENTER, TOP);
  text("Tone Generator and Visualization with FFT", canvasWidth/2, margin/2);

  let frequency = map(mouseX, 0, windowWidth, 20, 10000);
  frequency = constrain(frequency, 1, 10000);
  // set the oscillator to the frequency
  osc.freq(frequency);

  // run the FFT on the sound
  let spectrum = fft.analyze();
  noStroke();
  fill('blue');
  
  // draw rectangles corrisponding to 
  for (let i = 0; i< spectrum.length; i++){
    let x = map(i, 0, spectrum.length/4, 0, width);
    let h = -drawHeight + map(spectrum[i], 0, 255, drawHeight, 0);
    rect(x, drawHeight, width*4 / spectrum.length, h );
  }

  stroke(255);
  if (!osc.started) {
    text('tap here and drag to change frequency', 10, drawHeight/2, width - 20);
  } else {
    text(round(frequency)+'Hz', 50, drawHeight + 20);
  }
}

function startSound() {
  osc.start();
  osc.amp(0.5, 0.2);
}

function mouseReleased() {
  osc.amp(0, 0.2);
}

function windowResized() {
  // Update canvas size when the container resizes
  updateCanvasSize();
  resizeCanvas(containerWidth, containerHeight);
  
  // Resize the slider to match the new canvasWidth
  maxFreqSlider.size(containerWidth - 200);
  
  redraw();
}

function updateCanvasSize() {
  // Get the exact dimensions of the container
  const container = document.querySelector('main').getBoundingClientRect();
  containerWidth = Math.floor(container.width);  // Avoid fractional pixels
  canvasWidth = containerWidth;
}