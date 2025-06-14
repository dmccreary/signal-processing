// Base and Treble MicroSim with responsive design
// Canvas dimensions
let canvasWidth = 450;
let drawHeight = 350;
let controlHeight = 50;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let sliderLeftMargin = 50; // just wide enough for the value
let defaultTextSize = 16;

// Global variables for width and height
let containerWidth; // calculated by container upon resize
let containerHeight = canvasHeight; // fixed height on page

let bassSlider, trebleSlider;

function setup() {
  // Create a canvas to match the parent container's size
  updateCanvasSize();
  const canvas = createCanvas(containerWidth, containerHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  // Define slider width (half the canvas width minus margins)
  let sliderWidth = (containerWidth - (8 * margin)) / 2;;

  // Create bass slider on the left
  bassSlider = createSlider(0, 100, 50, 1);
  bassSlider.position(sliderLeftMargin, drawHeight + 20);
  bassSlider.size(sliderWidth);

  // Create treble slider on the right
  trebleSlider = createSlider(0, 100, 50, 1);
  trebleSlider.position(sliderLeftMargin + sliderWidth + 4*margin, drawHeight + 20);
  trebleSlider.size(sliderWidth);
  
  describe('A frequency response visualizer showing how bass and treble controls affect audio output.', LABEL);
}

function draw() {
  // Draw area
  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, containerWidth, drawHeight);
  
  // Controls area
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(0, drawHeight, containerWidth, controlHeight);

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
  stroke('blue');
  strokeWeight(3);
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

    // Map frequency to x position (adjusted for container width)
    let x = map(
      Math.log10(freq),
      Math.log10(freqMin),
      Math.log10(freqMax),
      margin,
      containerWidth - margin
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
  strokeWeight(1);
  line(margin, yZero, containerWidth - margin, yZero);

  // Draw labels
  noStroke();
  fill('black');
  
  // Title - responsive text size
  let titleSize = constrain(containerWidth * 0.05, 18, 28);
  textSize(titleSize);
  textAlign(CENTER, TOP);
  text("Frequency Response", containerWidth / 2, margin / 2);

  // Draw labels for sliders
  fill('black');
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  text("Bass", containerWidth * .3, drawHeight + 35);
  
  // Calculate position for "Treble:" label
  let trebleLabel = sliderLeftMargin + ((containerWidth - 3 * margin) / 2) + margin - 60;
  text("Treble", containerWidth * .7, drawHeight + 35);
  
  // Add value labels
  textAlign(RIGHT, CENTER);
  text(bassVal, sliderLeftMargin - 20, drawHeight + 20);
  text(trebleVal, trebleSlider.x - 15, drawHeight + 20);
  
  // Add frequency labels at bottom of graph (optional)
  textAlign(CENTER, TOP);
  textSize(constrain(containerWidth * 0.025, 10, 14));
  text("20 Hz", margin, drawHeight - margin + 5);
  text("1 kHz", containerWidth/2, drawHeight - margin + 5);
  text("20 kHz", containerWidth - margin, drawHeight - margin + 5);
}

function windowResized() {
  // Update canvas size when the container resizes
  updateCanvasSize();
  resizeCanvas(containerWidth, containerHeight);
  
  // Recalculate slider sizes based on new width
  let sliderWidth = (containerWidth - 6 * margin) / 2;
  bassSlider.size(sliderWidth);
  trebleSlider.position(sliderLeftMargin + sliderWidth + 4*margin, drawHeight + 20);
  trebleSlider.size(sliderWidth);
  
  redraw();
}

function updateCanvasSize() {
  // Get the exact dimensions of the container
  const container = document.querySelector('main').getBoundingClientRect();
  containerWidth = Math.floor(container.width);  // Avoid fractional pixels
  canvasWidth = containerWidth;
}