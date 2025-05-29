// Tone Generator with p5.js
// This code creates a simple tone generator that allows users to change the frequency of a sound
// by dragging the mouse horizontally across the canvas.
let osc, fft;

function setup(){
  let cnv = createCanvas(512,100);
  cnv.mousePressed(startSound);
  osc = new p5.Oscillator();
  osc.amp(0);
  fft = new p5.FFT();
}

function draw(){
  background('aliceblue');

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
    let h = -height + map(spectrum[i], 0, 255, height, 0);
    rect(x, height, width*4 / spectrum.length, h );
  }

  stroke(255);
  if (!osc.started) {
    text('tap here and drag to change frequency', 10, 20, width - 20);
  } else {
    text(round(frequency)+'Hz', 10, 20);
  }
}

function startSound() {
  osc.start();
  osc.amp(0.5, 0.2);
}

function mouseReleased() {
  osc.amp(0, 0.2);
}