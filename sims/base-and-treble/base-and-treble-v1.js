// region drawing parameters
// the width of the entire canvas
let canvasWidth = 400;
// The top drawing region above the interactive controls
let drawHeight = 400;
// control region height
let controlHeight = 80;
// The total height of both the drawing region height + the control region height
let canvasHeight = drawHeight + controlHeight;
// margin around the active plotting region
let margin = 25;
// larger text so students in the back of the room can read the labels
let defaultTextSize = 16;

let bassSlider, trebleSlider;

function setup() {
  const canvas = createCanvas(canvasWidth, canvasHeight);
  var mainElement = document.querySelector('main');
  canvas.parent(mainElement);
  textSize(defaultTextSize);

  // Define slider left margin
  let sliderLeftMargin = margin;

  // Create bass slider
  bassSlider = createSlider(0, 100, 50, 1);
  bassSlider.position(sliderLeftMargin, drawHeight + 12);
  bassSlider.style('width', canvasWidth - sliderLeftMargin - 20 + 'px');

  // Create treble slider
  trebleSlider = createSlider(0, 100, 50, 1);
  trebleSlider.position(sliderLeftMargin, drawHeight + 12 + 30);
  trebleSlider.style('width', canvasWidth - sliderLeftMargin - 20 + 'px');
}

function draw() {
  // Set background color
  background('white');

  // Fill the drawing region with 'aliceblue'
  fill('aliceblue');
  noStroke();
  rect(0, 0, canvasWidth, drawHeight);

  // Fill the control region with 'white'
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  // Get the updated slider values
  let bassVal = bassSlider.value();
  let trebleVal = trebleSlider.value();

  // Normalize the slider values to range -1 to 1
  let bassAmount = (bassVal - 50) / 50;
  let trebleAmount = (trebleVal - 50) / 50;

  // Define frequency range and number of points
  let numPoints = 500;
  let freqMin = 20;
  let freqMax = 20000;

  // Define EQ parameters
  let f_bass_cutoff = 500;
  let f_treble_cutoff = 2000;
  let n = 4;
  let maxGain = 12; // dB
  let gainMin = -15; // dB
  let gainMax = 15; // dB

  // Begin shape for plotting the frequency response curve
  noFill();
  stroke(0);
  beginShape();

  for (let i = 0; i < numPoints; i++) {
    let fraction = i / (numPoints - 1);
    let freq = freqMin * Math.pow(freqMax / freqMin, fraction);

    // Compute lowShelf and highShelf
    let lowShelf = 1 / (1 + Math.pow(freq / f_bass_cutoff, n));
    let highShelf = 1 / (1 + Math.pow(f_treble_cutoff / freq, n));

    // Compute gains
    let bassGain_dB = bassAmount * maxGain * lowShelf;
    let trebleGain_dB = trebleAmount * maxGain * highShelf;

    let totalGain_dB = bassGain_dB + trebleGain_dB;

    // Map frequency to x position
    let x = map(
      Math.log10(freq),
      Math.log10(freqMin),
      Math.log10(freqMax),
      margin,
      canvasWidth - margin
    );

    // Map gain to y position
    let y = map(totalGain_dB, gainMin, gainMax, drawHeight - margin, margin);

    // Plot the point
    vertex(x, y);
  }

  endShape();

  // Draw axes
  stroke(150);
  // x-axis at y = gain 0 dB
  let yZero = map(0, gainMin, gainMax, drawHeight - margin, margin);
  line(margin, yZero, canvasWidth - margin, yZero);

  // Draw labels for frequencies
  fill(0);
  textAlign(CENTER, TOP);
  text("Frequency Response", canvasWidth / 2, margin / 2);

  // Draw labels for sliders
  textAlign(LEFT, CENTER);
  fill(0);
  text("Bass", bassSlider.x + 5, bassSlider.y - 10);
  text("Treble", trebleSlider.x + 5, trebleSlider.y - 10);
}
