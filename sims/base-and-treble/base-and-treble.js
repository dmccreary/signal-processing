// Enhanced Bass and Treble MicroSim with proper axis labeling
// Canvas dimensions
let canvasWidth = 450;
let drawHeight = 350;
let controlHeight = 50;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let sliderLeftMargin = 50; // just wide enough for the value
let defaultTextSize = 16;
let axisMargin = 60; // Extra margin for axis labels

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
  bassSlider.position(sliderLeftMargin, drawHeight + 13);
  bassSlider.size(sliderWidth);

  // Create treble slider on the right
  trebleSlider = createSlider(0, 100, 50, 1);
  trebleSlider.position(sliderLeftMargin + sliderWidth + 4*margin, drawHeight + 13);
  trebleSlider.size(sliderWidth);
  
  describe('A frequency response visualizer showing how bass and treble controls affect audio output with logarithmic frequency axis.', LABEL);
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

  // Calculate plot area with axis margins
  let plotLeft = axisMargin;
  let plotRight = containerWidth - margin;
  let plotTop = margin + 40; // Extra space for title
  let plotBottom = drawHeight - axisMargin;

  // Draw axes first
  drawAxes(plotLeft, plotRight, plotTop, plotBottom, freqMin, freqMax, gainMin, gainMax);

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

    // Map frequency to x position (logarithmic scale)
    let x = map(
      Math.log10(freq),
      Math.log10(freqMin),
      Math.log10(freqMax),
      plotLeft,
      plotRight
    );

    // Map gain to y position
    let y = map(totalGain_dB, gainMin, gainMax, plotBottom, plotTop);

    // Plot the point
    vertex(x, y);
  }

  endShape();

  // Draw labels
  noStroke();
  fill('black');
  
  // Title - responsive text size
  let titleSize = constrain(containerWidth * 0.05, 18, 28);
  textSize(titleSize);
  textAlign(CENTER, TOP);
  text("Frequency Response", containerWidth / 2, 5);

  // Draw labels for sliders
  fill('black');
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  text("Bass", containerWidth * .25, drawHeight + 40);
  
  // Calculate position for "Treble:" label
  text("Treble", containerWidth * .75, drawHeight + 40);
  
  // Add value labels
  textAlign(RIGHT, CENTER);
  text(bassVal, sliderLeftMargin - 20, drawHeight + 20);
  text(trebleVal, trebleSlider.x - 15, drawHeight + 20);
}

function drawAxes(plotLeft, plotRight, plotTop, plotBottom, freqMin, freqMax, gainMin, gainMax) {
  stroke('black');
  strokeWeight(1);
  
  // Draw main axes
  line(plotLeft, plotTop, plotLeft, plotBottom); // Y-axis
  line(plotLeft, plotBottom, plotRight, plotBottom); // X-axis
  
  // Draw Y-axis (gain) tick marks and labels
  textAlign(RIGHT, CENTER);
  textSize(12);
  
  for (let gain = gainMin; gain <= gainMax; gain += 5) {
    let y = map(gain, gainMin, gainMax, plotBottom, plotTop);
    
    // Tick mark
    line(plotLeft - 5, y, plotLeft, y);
    
    // Label
    fill('black');
    noStroke();
    text(gain + " dB", plotLeft - 8, y);
    stroke('black');
    
    // Grid line for 0 dB
    if (gain === 0) {
      stroke('gray');
      strokeWeight(2);
      line(plotLeft, y, plotRight, y);
      strokeWeight(1);
      stroke('black');
    }
  }
  
  // Y-axis label (rotated)
  push();
  translate(15, (plotTop + plotBottom) / 2);
  rotate(-PI/2);
  textAlign(CENTER, CENTER);
  textSize(14);
  fill('black');
  noStroke();
  text("Gain (dB)", 0, 0);
  pop();
  
  // Draw X-axis (frequency) tick marks and labels - logarithmic scale
  textAlign(CENTER, TOP);
  textSize(12);
  
  // Major frequency points for logarithmic scale
  let freqPoints = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  
  for (let freq of freqPoints) {
    if (freq >= freqMin && freq <= freqMax) {
      let x = map(Math.log10(freq), Math.log10(freqMin), Math.log10(freqMax), plotLeft, plotRight);
      
      // Tick mark
      stroke('black');
      line(x, plotBottom, x, plotBottom + 5);
      
      // Label
      fill('black');
      noStroke();
      if (freq >= 1000) {
        text((freq/1000) + "k", x, plotBottom + 8);
      } else {
        text(freq, x, plotBottom + 8);
      }
    }
  }
  
  // X-axis label
  textAlign(CENTER, TOP);
  textSize(14);
  fill('black');
  noStroke();
  text("Frequency (Hz) - Logarithmic Scale", (plotLeft + plotRight) / 2, plotBottom + 35);
}

function windowResized() {
  // Update canvas size when the container resizes
  updateCanvasSize();
  resizeCanvas(containerWidth, containerHeight);
  
  // Recalculate slider sizes based on new width
  let sliderWidth = (containerWidth - 6 * margin) / 2;
  
  bassSlider.position(sliderLeftMargin, drawHeight + 13);
  bassSlider.size(sliderWidth);
  
  trebleSlider.position(sliderLeftMargin + sliderWidth + 4*margin, drawHeight + 13);
  trebleSlider.size(sliderWidth - margin*2);
  
  redraw();
}

function updateCanvasSize() {
  // Get the exact dimensions of the container
  const container = document.querySelector('main').getBoundingClientRect();
  containerWidth = Math.floor(container.width);  // Avoid fractional pixels
  canvasWidth = containerWidth;
}