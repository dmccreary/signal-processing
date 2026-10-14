// FFT Butterfly MicroSim
// CANVAS_HEIGHT: 580
// Steps through the input reordering of a radix-2 decimation-in-time FFT. Each step splits every group
// of samples into its even-indexed half (top) and odd-indexed half (bottom) until the samples sit in
// bit-reversed order, the order in which they enter the butterfly stages. p5.js 2.3.2, no audio.

// ===== Global Layout & Variables =====
let canvasWidth = 400;              // overwritten from the container in updateCanvasSize()
let drawHeight = 540;
let controlHeight = 40;
let canvasHeight = drawHeight + controlHeight;

let margin = 20;
let sliderLeftMargin = 270;         // left edge of the FFT size radio buttons on wide screens
let defaultTextSize = 16;

let containerWidth = canvasWidth;
let containerHeight = canvasHeight;

// Node rows run from nodeTop to drawHeight - nodeBottomGap; the caption sits below them
const nodeTop = 80;
const nodeBottomGap = 80;

let startOrNextButton;
let resetButton;
let fftRadio;

let fftSize = 8;
let maxStages;                      // index of the last column = log2(fftSize) - 1
let stage = 0;                      // which column (0..maxStages) has been reached

// reorder[s][row] = the sample index that sits in that row at column s
// positions[s][sampleIndex] = the (x, y) where that sample is drawn at column s
let reorder = [];
let positions = [];

// UI state
let hasStarted = false;             // for changing the button label from "Start" to "Next Step"
let compactLayout = false;          // single control row squeezed for phone widths
let sizeLabelX = 200;
let startButtonWidth = 80;

// ===== Setup =====
function setup() {
  updateCanvasSize();
  const canvas = createCanvas(containerWidth, containerHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  // FFT size radio
  fftRadio = createRadio();
  fftRadio.option('4', 4);
  fftRadio.option('8', 8);
  fftRadio.option('16', 16);
  fftRadio.option('32', 32);
  fftRadio.selected('8');
  fftRadio.style('font-family', 'Arial, Helvetica, sans-serif');
  fftRadio.style('font-size', '16px');
  fftRadio.style('white-space', 'nowrap');
  fftRadio.changed(() => {
    fftSize = parseInt(fftRadio.value(), 10);
    resetSimulation();
  });

  // Buttons. The Start button is sized for its longer "Next Step" label so the layout never shifts.
  startOrNextButton = createButton('Next Step');
  startButtonWidth = startOrNextButton.elt.offsetWidth + 2;
  startOrNextButton.style('width', startButtonWidth + 'px');
  startOrNextButton.html('Start');
  startOrNextButton.mousePressed(handleNextStep);

  resetButton = createButton('Reset');
  resetButton.mousePressed(resetSimulation);

  layoutControls();
  buildStages();
  describe(
    'FFT butterfly reordering diagram. Columns of numbered circles show the input samples of a radix-2 FFT. ' +
    'Each press of Next Step splits every group into its even-indexed and odd-indexed samples and draws lines ' +
    'showing where each sample moves, ending in bit-reversed order. Radio buttons choose 4, 8, 16 or 32 points.'
  );
}

// ===== Draw Loop =====
function draw() {
  // Draw backgrounds
  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);

  fill('white');
  stroke('silver');
  rect(0, drawHeight, canvasWidth, controlHeight);

  // Title
  fill('black');
  noStroke();
  textSize(24);
  textAlign(CENTER, TOP);
  text(`FFT Butterfly: Step ${stage + 1} of ${maxStages + 1}`, canvasWidth / 2, margin - 10);

  // "FFT Size" label
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  text(compactLayout ? 'N:' : 'FFT Size:', sizeLabelX, drawHeight + 20);

  drawLabels();          // column headings
  drawConnections();     // lines from column to column
  drawGroupDividers();   // separators between the groups formed by each split
  drawNodes();           // circles for each sample index
  drawBinaryLabels();    // sample indices in binary beside the first and last columns
  drawCaption();         // what the newest column shows
}

// ===== Building the Reorder & Positions =====
function buildStages() {
  const N = fftSize;
  // log2(N) columns: the natural order plus log2(N) - 1 even/odd splits. The split that would turn the
  // final pairs into single samples does not change the order, so it needs no column of its own.
  maxStages = Math.log2(N) - 1;

  reorder = [[...Array(N).keys()]];
  for (let s = 1; s <= maxStages; s++) {
    reorder[s] = splitEvenOdd(reorder[s - 1], N >> (s - 1));
  }
  layoutStages();

  stage = 0;
  hasStarted = false;
  if (startOrNextButton) {
    startOrNextButton.html('Start');
  }
}

// Compute the (x, y) of every node; called on reset and on resize (keeps the current step)
function layoutStages() {
  const N = fftSize;
  // Spread the columns evenly, leaving one column width of space at each side
  const stageWidth = (containerWidth - 2 * margin) / (maxStages + 2);
  const offsetY = (drawHeight - nodeTop - nodeBottomGap) / (N - 1);

  positions = [];
  for (let s = 0; s <= maxStages; s++) {
    const x = margin + stageWidth * (s + 1);
    positions[s] = [];
    for (let row = 0; row < N; row++) {
      positions[s][reorder[s][row]] = { x, y: nodeTop + row * offsetY };
    }
  }
}

// ===== One Decimation-in-Time Step =====
// Within every group of groupSize samples, move the samples at even positions to the top half
// and the samples at odd positions to the bottom half (keeping their relative order).
function splitEvenOdd(prevOrder, groupSize) {
  const out = [];
  for (let start = 0; start < prevOrder.length; start += groupSize) {
    const group = prevOrder.slice(start, start + groupSize);
    for (let i = 0; i < group.length; i += 2) out.push(group[i]);
    for (let i = 1; i < group.length; i += 2) out.push(group[i]);
  }
  return out;
}

// ===== Drawing the Lines (Data Crossings) =====
function drawConnections() {
  // Draw lines from column k-1 to column k, for k in [1..stage]
  stroke('navy');
  strokeWeight(1.5);

  for (let k = 1; k <= stage; k++) {
    // For each sample index j, draw a line from where it sits in column k-1 to where it sits in column k
    for (let j = 0; j < fftSize; j++) {
      const pA = positions[k - 1][j];
      const pB = positions[k][j];
      line(pA.x, pA.y, pB.x, pB.y);
    }
  }
}

// ===== Group Separators =====
// After split s the column holds 2^s groups of N / 2^s samples; draw a short bar between groups
// (skipped for N = 32, where the rows are too close together for the bars to stay readable)
function drawGroupDividers() {
  if (fftSize > 16) return;
  const nodeSize = calculateNodeSize();
  const offsetY = (drawHeight - nodeTop - nodeBottomGap) / (fftSize - 1);
  stroke('dimgray');
  strokeWeight(2);
  for (let s = 1; s <= stage; s++) {
    const groupSize = fftSize >> s;
    const x = positions[s][0].x;
    for (let row = groupSize; row < fftSize; row += groupSize) {
      const y = nodeTop + (row - 0.5) * offsetY;
      line(x - nodeSize / 2 - 8, y, x + nodeSize / 2 + 8, y);
    }
  }
}

// ===== Drawing the Data Nodes =====
function drawNodes() {
  // Calculate node size based on container width and FFT size
  const nodeSize = calculateNodeSize();

  // Draw nodes for all columns from 0..maxStages
  for (let s = 0; s <= maxStages; s++) {
    // If s > stage, draw them in a lighter color to indicate they are not "active" yet
    const active = (s <= stage);
    for (let j = 0; j < fftSize; j++) {
      const pt = positions[s][j];
      if (active) {
        // Column 0 => orange for the natural order, last column => green for bit-reversed order
        if (s === 0) {
          fill('orange');
        } else if (s === maxStages) {
          fill('lightgreen');
        } else {
          fill('lightblue');
        }
      } else {
        // Future columns not reached yet
        fill(220);
      }
      stroke('black');
      strokeWeight(1);

      // Draw the circle for this node
      circle(pt.x, pt.y, nodeSize);

      // Draw index values inside nodes (except for fftSize=32, where the circles are too small)
      if (fftSize < 32) {
        fill('black');
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(calculateTextSize());
        text(j, pt.x, pt.y);
      }
    }
  }
}

// Calculate appropriate node size based on container width and FFT size
function calculateNodeSize() {
  let baseSize;

  switch (true) {
    case (fftSize <= 4):
      baseSize = 36;
      break;
    case (fftSize <= 8):
      baseSize = 30;
      break;
    case (fftSize <= 16):
      baseSize = 18;
      break;
    default:
      baseSize = 12;
  }

  // Scale based on container width, but never let neighbouring circles overlap
  const scaleFactor = constrain(containerWidth / 800, 0.75, 1.25);
  const rowSpacing = (drawHeight - nodeTop - nodeBottomGap) / (fftSize - 1);
  return Math.min(baseSize * scaleFactor, rowSpacing * 0.85);
}

// Calculate appropriate text size based on container width and FFT size
function calculateTextSize() {
  let baseSize;

  switch (true) {
    case (fftSize <= 4):
      baseSize = 24;
      break;
    case (fftSize <= 8):
      baseSize = 20;
      break;
    case (fftSize <= 16):
      baseSize = 12;
      break;
    default:
      baseSize = 10;
  }

  // Scale based on container width
  const scaleFactor = constrain(containerWidth / 800, 0.75, 1.25);
  return baseSize * scaleFactor;
}

// ===== Column Headings =====
function drawLabels() {
  fill('black');
  noStroke();
  textSize(16);
  textAlign(CENTER, CENTER);
  const narrow = containerWidth < 520;

  // Heading above the first column (the samples in their natural order)
  const xLeft = positions[0][0].x;
  text(narrow ? 'Natural' : 'Natural order', xLeft, margin * 2 + 10);

  // Heading above the last column (the same samples in bit-reversed order)
  const xRight = positions[maxStages][0].x;
  text(narrow ? 'Bit-reversed' : 'Bit-reversed order', xRight, margin * 2 + 10);
}

// ===== Binary Index Labels =====
// Left of the first column: each row's sample index in binary. Right of the last column: the binary
// index of the sample that ends up in that row. Reading across a row shows the bits reversed.
function drawBinaryLabels() {
  const bits = Math.log2(fftSize);
  const nodeSize = calculateNodeSize();
  const offsetY = (drawHeight - nodeTop - nodeBottomGap) / (fftSize - 1);
  const xLeft = positions[0][0].x - nodeSize / 2 - 6;
  const xRight = positions[maxStages][0].x + nodeSize / 2 + 6;
  const finalReached = (stage === maxStages);

  push();
  textFont('monospace');
  textSize(Math.min(15, offsetY * 0.85));
  noStroke();
  for (let row = 0; row < fftSize; row++) {
    const y = nodeTop + row * offsetY;
    fill(60);
    textAlign(RIGHT, CENTER);
    text(toBinary(reorder[0][row], bits), xLeft, y);
    fill(finalReached ? 'darkgreen' : 150);
    textAlign(LEFT, CENTER);
    text(toBinary(reorder[maxStages][row], bits), xRight, y);
  }
  pop();
}

function toBinary(value, bits) {
  return value.toString(2).padStart(bits, '0');
}

// ===== Caption: what the newest column shows =====
function drawCaption() {
  const N = fftSize;
  const groups = 1 << stage;
  let caption;
  if (stage === 0) {
    caption = `Natural order: x[0] to x[${N - 1}] form one group of ${N} samples`;
  } else if (stage < maxStages) {
    caption = `Split ${stage}: evens on top, odds below in every group, giving ${groups} groups of ${N / groups}`;
  } else {
    caption = `Split ${stage}: ${groups} pairs in bit-reversed order, ready for the ${Math.log2(N)} butterfly stages`;
  }
  fill('black');
  noStroke();
  textSize(containerWidth < 520 ? 15 : 16);
  textAlign(CENTER, TOP);
  text(caption, margin, drawHeight - 48, containerWidth - 2 * margin);
}

// ===== Button Handlers =====
function handleNextStep() {
  if (!hasStarted) {
    hasStarted = true;
    startOrNextButton.html('Next Step');
  }
  if (stage < maxStages) {
    stage++;
  }
}

function resetSimulation() {
  buildStages();
  if (startOrNextButton) {
    startOrNextButton.html('Start');
  }
}

// ===== Control Layout =====
// One row: [Start/Next Step] [Reset]  FFT Size: (4) (8) (16) (32). Phone widths pack the row tighter.
function layoutControls() {
  compactLayout = containerWidth < 520;
  const y = drawHeight + 9;
  if (compactLayout) {
    const startX = 8;
    const resetX = startX + startButtonWidth + 6;
    sizeLabelX = resetX + resetButton.elt.offsetWidth + 10;
    startOrNextButton.position(startX, y);
    resetButton.position(resetX, y);
    fftRadio.position(sizeLabelX + 22, y);
  } else {
    sizeLabelX = 200;
    startOrNextButton.position(10, y);
    resetButton.position(100, y);
    fftRadio.position(sliderLeftMargin, y);
  }
}

// ===== Window Resize Helper =====
function windowResized() {
  updateCanvasSize();
  resizeCanvas(containerWidth, containerHeight);
  layoutControls();
  // Recompute the node positions for the new width without losing the current step
  layoutStages();
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) {
    containerWidth = Math.floor(container.getBoundingClientRect().width);  // avoid fractional pixels
    canvasWidth = containerWidth;
  }
}
