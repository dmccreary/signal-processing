let acSlider, amSlider, fcSlider, fmSlider;
let gridSpacing = 20;

function setup() {
  createCanvas(800, 600);
  textSize(15);

  // Initialize Sliders
  acSlider = createSlider(0, 200, 100, 1).position(10, height - 90);
  amSlider = createSlider(0, 200, 50, 1).position(10, height - 60);
  fcSlider = createSlider(1, 30, 5, 0.1).position(10, height - 30);
  fmSlider = createSlider(1, 30, 2, 0.1).position(210, height - 30);

  // Labeling Sliders
  createDiv('Carrier Amplitude (Ac)').position(10, height - 110);
  createDiv('Message Amplitude (Am)').position(10, height - 80);
  createDiv('Carrier Frequency (fc)').position(10, height - 50);
  createDiv('Message Frequency (fm)').position(210, height - 50);
}

function draw() {
  background(240);
  drawGrid();
  drawSignals();
}

function drawGrid() {
  stroke(200);
  for (let i = 0; i < width; i += gridSpacing) {
    line(i, 0, i, height - 120); // Adjust grid height to fit sliders
  }
  for (let j = 0; j < height - 120; j += gridSpacing) {
    line(0, j, width, j);
  }
}

function drawSignals() {
  let Ac = acSlider.value();
  let Am = amSlider.value();
  let Fc = fcSlider.value();
  let Fm = fmSlider.value();

  // AM Signal
  beginShape();
  stroke(255, 0, 0); // Red for AM
  noFill();
  for (let t = 0; t < width; t++) {
    let x = t;
    let y = height / 2 - 120 + (Ac + Am * sin(TWO_PI * Fm * t / width)) * sin(TWO_PI * Fc * t / width);
    vertex(x, y);
  }
  endShape();

  // FM Signal
  beginShape();
  stroke(0, 0, 255); // Blue for FM
  noFill();
  for (let t = 0; t < width; t++) {
    let x = t;
    let y = 3 * height / 4 - 120 + Ac * sin(TWO_PI * Fc * t / width + Am * sin(TWO_PI * Fm * t / width) / Fc);
    vertex(x, y);
  }
  endShape();

  // Title and Annotations
  fill(0);
  noStroke();
  text('Amplitude Modulation (AM)', 10, 20);
  //text('Frequency Modulation (FM)', 10, 3 * height / 4 - 140);
  text('Frequency Modulation (FM)', 10, 450);
}

function draw() {
  background(220); // Light grey background
  drawGrid();
  drawSignals();
}
