// Euler's Formula Explorer MicroSim
// CANVAS_HEIGHT: 600
// Demonstrates e^(iθ) = cos(θ) + i·sin(θ): a point rotating on the unit circle,
// synchronized with the cosine (real part) and sine (imaginary part) traces.

// Canvas dimensions
let canvasWidth = 700;
let drawHeight = 510;
let controlHeight = 90;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let sliderLeftMargin = 196;   // space for the buttons and the slider labels
let defaultTextSize = 16;

// Palette (unchanged from the original sketch)
const COS_COL = [0, 100, 200];     // real axis / cosine
const SIN_COL = [200, 50, 50];     // imaginary axis / sine
const VEC_COL = [0, 160, 80];      // rotating vector e^(iθ)
const VEC_TEXT = [0, 130, 65];     // darker green for text on a light background

// Animation state
let theta = 0;                     // current angle in radians, always in [0, 2π]
let isRunning = false;
let lastSliderValue = 0;           // used to notice when the user moves the angle slider
const RATE = 1.2;                  // rad/s at speed 1x (0.02 rad per frame at 60 fps in the original)

// UI elements
let playButton, resetButton;
let angleSlider, speedSlider;

// Layout (recalculated whenever the width changes)
let leftWidth;
let circleRadius, circleCenterX, circleCenterY;
let plotX, plotWidth, plotHeight, cosPlotY, sinPlotY;
let readoutHeight = 92;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  playButton = createButton('Play');
  playButton.mousePressed(togglePlay);
  playButton.size(66, 28);

  resetButton = createButton('Reset');
  resetButton.mousePressed(resetSimulation);
  resetButton.size(66, 28);

  // Angle slider in units of π (0 to 2, i.e. 0 to 2π rad) so that π/2, π and 3π/2 are hit exactly
  angleSlider = createSlider(0, 2, 0, 0.01);
  lastSliderValue = parseFloat(angleSlider.value());

  // Speed slider (0.1x to 5x)
  speedSlider = createSlider(0.1, 5, 1, 0.1);

  positionControls();

  describe('Euler\'s formula: a green vector rotates around the unit circle in the complex plane while its real part traces a cosine wave and its imaginary part traces a sine wave. Play, Reset, an angle slider and a speed slider control the rotation.');
}

function calculateLayout() {
  leftWidth = canvasWidth * (canvasWidth < 500 ? 0.47 : 0.44);

  // Unit circle: axes extend 24 px beyond the circle and the "Real" label sits at the right tip
  circleRadius = constrain(min(leftWidth / 2 - 30, 144), 30, 144);
  circleCenterX = leftWidth / 2;
  circleCenterY = 44 + (drawHeight - 44 - readoutHeight - 16) / 2;

  // Two stacked plots on the right: title row (22) + plot + tick-label row (18)
  plotX = leftWidth + 38;
  plotWidth = canvasWidth - plotX - 14;
  const block = (drawHeight - 44 - 6 - 6) / 2;        // height of one title+plot+ticks block
  plotHeight = block - 22 - 18;
  cosPlotY = 44 + 22;
  sinPlotY = 44 + block + 6 + 22;
}

function positionControls() {
  const row1 = drawHeight + 13;
  const row2 = drawHeight + 49;

  playButton.position(10, row1);
  resetButton.position(10, row2);

  angleSlider.position(sliderLeftMargin, row1 + 5);
  angleSlider.size(canvasWidth - sliderLeftMargin - margin);

  speedSlider.position(sliderLeftMargin, row2 + 5);
  speedSlider.size(canvasWidth - sliderLeftMargin - margin);
}

function draw() {
  updateCanvasSize();

  // Moving the angle slider takes manual control and pauses the animation
  const sv = parseFloat(angleSlider.value());
  if (sv !== lastSliderValue) {
    lastSliderValue = sv;
    theta = sv * PI;
    if (isRunning) {
      isRunning = false;
      playButton.html('Play');
    }
  }

  // Advance the angle (frame-rate independent)
  if (isRunning) {
    const dt = min(deltaTime, 50) / 1000;
    theta = (theta + RATE * parseFloat(speedSlider.value()) * dt) % TWO_PI;
    angleSlider.value(theta / PI);
    lastSliderValue = parseFloat(angleSlider.value());
  }

  // Drawing region
  noStroke();
  fill('aliceblue');
  rect(0, 0, canvasWidth, drawHeight);

  // Control region
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  drawTitle();
  drawUnitCircle();
  drawPlots();
  drawReadout();
  drawControlLabels();
}

// ---------------------------------------------------------------- helpers

// p5 2.x textWidth() ignores spaces; fontWidth() keeps them
function tw(s) {
  return (typeof fontWidth === 'function') ? fontWidth(s) : textWidth(s);
}

// toFixed without the "-0.00" artefact
function fmt(v, d) {
  const s = v.toFixed(d);
  return (parseFloat(s) === 0) ? (0).toFixed(d) : s;
}

// text on a translucent white pill so it stays readable over lines
function pillText(str, x, y, hAlign, vAlign, col) {
  textAlign(hAlign, vAlign);
  const w = tw(str);
  const h = textSize() + 4;
  let left = x;
  if (hAlign === CENTER) left = x - w / 2;
  else if (hAlign === RIGHT) left = x - w;
  let top = y;
  if (vAlign === CENTER) top = y - h / 2;
  else if (vAlign === BOTTOM) top = y - h;
  noStroke();
  fill(255, 255, 255, 215);
  rect(left - 2, top, w + 4, h, 3);
  fill(...col);
  text(str, x, y);
}

// ---------------------------------------------------------------- title

function drawTitle() {
  const a = "Euler's Formula: e";
  const b = 'iθ';
  const c = ' = cos(θ) + i·sin(θ)';
  const maxW = canvasWidth - 16;
  let size = 20;
  let total = 0;
  while (size >= 12) {
    textSize(size); total = tw(a);
    textSize(size * 0.7); total += tw(b) + 2;
    textSize(size); total += tw(c);
    if (total <= maxW) break;
    size -= 1;
  }

  noStroke();
  fill(0);
  textAlign(LEFT, TOP);
  const titleY = 9;
  let x = (canvasWidth - total) / 2;

  textSize(size);
  text(a, x, titleY);
  x += tw(a);

  // superscript "iθ"
  textSize(size * 0.7);
  text(b, x, titleY - 2);
  x += tw(b) + 2;

  textSize(size);
  text(c, x, titleY);
}

// ---------------------------------------------------------------- unit circle

function drawUnitCircle() {
  const R = circleRadius;
  const cosT = cos(theta);
  const sinT = sin(theta);
  const px = cosT * R;
  const py = -sinT * R;      // screen y is inverted

  push();
  translate(circleCenterX, circleCenterY);

  // grid at -1, -0.5, 0, 0.5, 1
  stroke(220);
  strokeWeight(1);
  for (let i = -2; i <= 2; i++) {
    line(i * R / 2, -R - 20, i * R / 2, R + 20);
    line(-R - 20, i * R / 2, R + 20, i * R / 2);
  }

  // axes: real (blue) and imaginary (red)
  strokeWeight(2);
  stroke(...COS_COL);
  line(-R - 24, 0, R + 24, 0);
  stroke(...SIN_COL);
  line(0, -R - 24, 0, R + 24);

  // axis names
  noStroke();
  textSize(14);
  fill(...COS_COL);
  textAlign(RIGHT, BOTTOM);
  text('Real', R + 28, -12);
  fill(...SIN_COL);
  textAlign(LEFT, CENTER);
  text('Imag', 7, -R - 24);

  // unit circle
  stroke(100);
  strokeWeight(2);
  noFill();
  ellipse(0, 0, R * 2, R * 2);

  // dashed projection lines
  stroke(120);
  strokeWeight(1);
  drawingContext.setLineDash([5, 5]);
  line(px, py, px, 0);       // down/up to the real axis
  line(px, py, 0, py);       // across to the imaginary axis
  drawingContext.setLineDash([]);

  // angle arc and θ label
  const arcRadius = R * 0.25;
  if (theta > 0.02) {
    stroke(100, 180, 100);
    strokeWeight(2);
    noFill();
    arc(0, 0, arcRadius * 2, arcRadius * 2, -theta, 0);
  }

  // rotating vector with arrowhead
  stroke(...VEC_COL);
  strokeWeight(3);
  line(0, 0, px, py);
  const ang = atan2(py, px);
  const L = 11;
  line(px, py, px - L * cos(ang - 0.4), py - L * sin(ang - 0.4));
  line(px, py, px - L * cos(ang + 0.4), py - L * sin(ang + 0.4));

  // θ label inside the arc (only once the arc is big enough to read)
  if (theta > 0.35 && theta < TWO_PI - 0.35) {
    const labelR = arcRadius + 14;
    textSize(16);
    pillText('θ', labelR * cos(-theta / 2), labelR * sin(-theta / 2), CENTER, CENTER, VEC_TEXT);
  }

  // moving points: vector tip (green), real projection (blue), imaginary projection (red)
  noStroke();
  fill(...VEC_COL);
  ellipse(px, py, 14, 14);
  fill(...COS_COL);
  ellipse(px, 0, 10, 10);
  fill(...SIN_COL);
  ellipse(0, py, 10, 10);

  // projection labels: cos(θ) always below the real axis (the θ label never goes there),
  // on the inner side of the dot; sin(θ) on the side away from the horizontal dashed line
  textSize(R < 80 ? 12 : 13);
  if (px >= 0) pillText('cos(θ)', px - 7, 8, RIGHT, TOP, COS_COL);
  else         pillText('cos(θ)', px + 7, 8, LEFT, TOP, COS_COL);

  let sy = py;                                // vertical position of the sin label
  if (abs(sy) < 18) sy = (sy <= 0) ? -18 : 18;
  if (px > 0) pillText('sin(θ)', -9, sy, RIGHT, CENTER, SIN_COL);
  else        pillText('sin(θ)', 9, sy, LEFT, CENTER, SIN_COL);

  pop();
}

// ---------------------------------------------------------------- plots

function drawPlots() {
  drawSinglePlot(plotX, cosPlotY, plotWidth, plotHeight, 'cos(θ)', 'real part', COS_COL, cos);
  drawSinglePlot(plotX, sinPlotY, plotWidth, plotHeight, 'sin(θ)', 'imaginary part', SIN_COL, sin);
}

function drawSinglePlot(x, y, w, h, name, partName, col, fn) {
  const yOf = (v) => y + h / 2 - v * (h / 2 - 10);
  const xOf = (t) => x + (t / TWO_PI) * w;

  // title (long form only if it fits)
  noStroke();
  fill(...col);
  textSize(15);
  textAlign(LEFT, BOTTOM);
  let title = name + '  (' + partName + ')';
  if (tw(title) > canvasWidth - x - 6) title = name;
  text(title, x, y - 4);

  // plot background
  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(x, y, w, h, 5);

  // grid: quarter turns on θ, ±1 on the value axis
  stroke(230);
  for (let i = 1; i < 4; i++) line(x + (i / 4) * w, y, x + (i / 4) * w, y + h);
  line(x, yOf(1), x + w, yOf(1));
  line(x, yOf(-1), x + w, yOf(-1));
  stroke(170);
  line(x, yOf(0), x + w, yOf(0));

  // y tick labels
  noStroke();
  fill(80);
  textSize(12);
  textAlign(RIGHT, CENTER);
  text('1', x - 6, yOf(1));
  text('0', x - 6, yOf(0));
  text('-1', x - 6, yOf(-1));

  // x tick labels (θ in radians)
  textAlign(CENTER, TOP);
  const ticks = ['0', 'π/2', 'π', '3π/2', '2π'];
  for (let i = 0; i < ticks.length; i++) {
    text(ticks[i], x + (i / 4) * w, y + h + 4);
  }

  // faint reference curve: one full period
  noFill();
  stroke(col[0], col[1], col[2], 60);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * TWO_PI;
    vertex(xOf(t), yOf(fn(t)));
  }
  endShape();

  // trace swept out so far (θ = 0 up to the current angle)
  stroke(...col);
  strokeWeight(3);
  beginShape();
  const steps = max(2, ceil(theta / 0.05));
  for (let i = 0; i <= steps; i++) {
    const t = theta * (i / steps);
    vertex(xOf(t), yOf(fn(t)));
  }
  endShape();

  // current point and its level line back to the value axis
  const val = fn(theta);
  const cx = xOf(theta);
  const cy = yOf(val);

  stroke(col[0], col[1], col[2], 130);
  strokeWeight(1);
  drawingContext.setLineDash([3, 3]);
  line(x, cy, cx, cy);
  drawingContext.setLineDash([]);

  noStroke();
  fill(...col);
  ellipse(cx, cy, 12, 12);

  // numeric value next to the point (flip to the left near the right edge)
  textSize(13);
  const s = fmt(val, 3);
  if (cx + 12 + tw(s) > x + w + 8) pillText(s, cx - 10, cy, RIGHT, CENTER, col);
  else pillText(s, cx + 10, cy, LEFT, CENTER, col);
}

// ---------------------------------------------------------------- read-out

function drawReadout() {
  const c = cos(theta);
  const s = sin(theta);
  const lines = [
    { t: 'θ = ' + fmt(theta, 2) + ' rad (' + fmt(degrees(theta), 1) + '°)', col: VEC_TEXT },
    { t: 'cos(θ) = ' + fmt(c, 4), col: COS_COL },
    { t: 'sin(θ) = ' + fmt(s, 4), col: SIN_COL },
    { t: 'e^(iθ) = ' + fmt(c, 2) + (parseFloat(fmt(s, 2)) < 0 ? ' - ' : ' + ') + fmt(abs(s), 2) + 'i', col: VEC_TEXT }
  ];

  // largest font (<= 14 px) for which every line fits in the left column
  let size = 14;
  let widest = 0;
  while (size >= 11) {
    textSize(size);
    widest = 0;
    for (const l of lines) widest = max(widest, tw(l.t));
    if (widest + 20 <= leftWidth - 8) break;
    size -= 1;
  }

  const lineH = size + 6;
  const boxW = widest + 20;
  const boxH = lineH * lines.length + 12;
  const boxX = leftWidth / 2 - boxW / 2;
  const boxY = drawHeight - boxH - 8;

  fill(255, 255, 255, 240);
  stroke(200);
  strokeWeight(1);
  rect(boxX, boxY, boxW, boxH, 8);

  noStroke();
  textAlign(LEFT, TOP);
  for (let i = 0; i < lines.length; i++) {
    fill(...lines[i].col);
    text(lines[i].t, boxX + 10, boxY + 7 + i * lineH);
  }
}

// ---------------------------------------------------------------- controls

function drawControlLabels() {
  fill(0);
  noStroke();
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);

  const labelX = 84;
  text('Angle: ' + (theta / PI).toFixed(2) + 'π', labelX, drawHeight + 27);
  text('Speed: ' + parseFloat(speedSlider.value()).toFixed(1) + 'x', labelX, drawHeight + 63);
}

function togglePlay() {
  isRunning = !isRunning;
  playButton.html(isRunning ? 'Pause' : 'Play');
}

function resetSimulation() {
  theta = 0;
  angleSlider.value(0);
  lastSliderValue = parseFloat(angleSlider.value());
  isRunning = false;
  playButton.html('Play');
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) {
    canvasWidth = container.offsetWidth;
    calculateLayout();

    if (typeof angleSlider !== 'undefined') {
      angleSlider.size(canvasWidth - sliderLeftMargin - margin);
    }
    if (typeof speedSlider !== 'undefined') {
      speedSlider.size(canvasWidth - sliderLeftMargin - margin);
    }
  }
}
