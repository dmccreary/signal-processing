// Nyquist-Shannon Sampling Rate MicroSim
// region drawing parameters
// the width of the entire canvas
let canvasWidth = 450;
// The top drawing region above the interactive controls
let drawHeight = 350;
// control region height
let controlHeight = 50;
// The total height of both the drawing region height + the control region height
let canvasHeight = drawHeight + controlHeight;
// margin around the active plotting region
let margin = 30;
// larger text so students in the back of the room can read the labels
let defaultTextSize = 16;

let samplingRateSlider;
let samplingRate = 22; // Initial sampling rate
let signalFrequency = 5; // Frequency of the original signal
let time = [];
let signal = [];
let sampledSignal = [];

function setup() {
  createCanvas(canvasWidth, canvasHeight);
  const canvas = createCanvas(canvasWidth, canvasHeight);
  var mainElement = document.querySelector('main');
  canvas.parent(mainElement);
  textSize(defaultTextSize);

  // slider to allow the user to select the sampling rate
  samplingRateSlider = createSlider(1, 50, samplingRate, .1);
  samplingRateSlider.position(20, drawHeight + 30);
  samplingRateSlider.size(canvasWidth - margin);

  // Generate time values
  for (let t = 0; t <= width; t++) {
    time.push(t);
  }

  // Generate original signal values
  for (let i = 0; i < time.length; i++) {
    let t = time[i];
    signal[i] = sin(TWO_PI * signalFrequency * (t / width));
  }
}

function draw() {
  // Fill the drawing region background with 'aliceblue'
  fill('aliceblue');
  stroke('black');
  rect(0, 0, canvasWidth, drawHeight);

  // Fill the control region background with 'white'
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  samplingRate = samplingRateSlider.value();

  // Draw title
  textSize(24);
  fill('black');
  strokeWeight(0);
  textAlign(CENTER);
  text('Nyquist-Shannon Sampling Rate', canvasWidth / 2, 30);

  // Draw labels
  textSize(16);
  fill('black');
  strokeWeight(0);
  textAlign(CENTER);
  text('Original Signal with Sampling Points', canvasWidth / 2, 60);
  text('Reconstructed Signal from Samples', canvasWidth / 2, drawHeight / 2 + 45);
  textAlign(LEFT);
  text('Sampling Rate: ' + round(samplingRate/5,2) + ' samples per period', 20, drawHeight + 20);

  // Draw original signal
  stroke(0);
  noFill();
  strokeWeight(1.5);
  beginShape();
    for (let i = 0; i < signal.length; i++) {
      let y = map(signal[i], -1, 1, 100, 0);
      vertex(time[i], y + 80);
    }
  endShape();

  // Sample the signal
  sampledSignal = [];
  let sampleInterval = floor(width / samplingRate);
  for (let i = 0; i < time.length; i += sampleInterval) {
    let y = map(signal[i], -1, 1, 100, 0);
    sampledSignal.push({ x: time[i], y: y + 30 });
    // Draw sampling points
    fill(255, 0, 0);
    noStroke();
    circle(time[i], y + 80, 7);
  }

  // Reconstruct the signal from samples
  stroke('blue');
  strokeWeight(2);
  noFill();
  beginShape();
  for (let i = 0; i < sampledSignal.length; i++) {
    vertex(sampledSignal[i].x, sampledSignal[i].y + height / 2);
  }
  endShape();

  // Draw reconstructed signal
  stroke(0);
  noFill();
  beginShape();
  for (let i = 0; i < sampledSignal.length - 1; i++) {
    let x1 = sampledSignal[i].x;
    let y1 = sampledSignal[i].y + height / 2;
    let x2 = sampledSignal[i + 1].x;
    let y2 = sampledSignal[i + 1].y + height / 2;
    line(x1, y1, x2, y2);
  }
  endShape();
}
