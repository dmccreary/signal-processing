/*
 contents based on IDEA9101 IDEA Laboratory 1
Base code taken from https://editor.p5js.org/HelenaCui/sketches/O1wf7kNhj
FFT (Fast Fourier Transform) is an analysis algorithm that isolates individual audio frequencies within a waveform.

fft.analyze( ) computes the frequency (pitch) using a for loop and returning an array of values between 0 and 255 across the spectrum. Length is equal to FFT bins (1024).

fft.waveform( ) returns an array of amplitude values between -1.0 and 1.0. This can be used to draw the waveform of a sound. Length is equal to FFT bins (1024).
*/


let fft;
let sound;
let isPlaying = false;
let playButton;


function preload() {
  sound = loadSound('maroon-5-sugar.mp3');
}


function setup() {
  createCanvas(windowWidth, 200);

  fft = new p5.FFT();
  // Set the output volume
  sound.amp(0.5);

  // Create Play/Pause button
  playButton = createButton('Play');
  playButton.position(10, 10);
  playButton.mousePressed(togglePlay);
}


function draw() {
  updateCanvasSize()
  background('aliceblue');

  // isolates values along the frequency (pitch) spectrum (red)
  let spectrum = fft.analyze(); 
  noStroke();
  fill(160, 0, 0);
  for(let i = 0; i < spectrum.length; i++) {
    let x = map(i, 0, spectrum.length, 0, width);
    let h = -height + map(spectrum[i], 0, 255, height, 0);
    rect(x, height, width / spectrum.length, h);
  }

  // returns an array of amplitude values (black)
  let waveform = fft.waveform();
  noFill();
  beginShape();
  stroke(20);
  for (let i = 0; i < waveform.length; i++){
    let x = map(i, 0, waveform.length, 0, width);
    let y = map(waveform[i], -1, 1, 0, height);
    vertex(x,y);
  }
  endShape();
}

function togglePlay() {
  if (isPlaying) {
    sound.pause();
    playButton.html('Play');
    isPlaying = false;
  } else {
    sound.loop();
    playButton.html('Pause');
    isPlaying = true;
  }
}

function windowResized() {
  // Update canvas size when the container resizes
  updateCanvasSize();
  resizeCanvas(containerWidth, containerHeight);
  redraw();
}

function updateCanvasSize() {
  // Get the exact dimensions of the container
  const container = document.querySelector('main').getBoundingClientRect();
  containerWidth = Math.floor(container.width);  // Avoid fractional pixels
  canvasWidth = containerWidth;
}