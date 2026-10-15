// Convolution as Function Overlap MicroSim
// CANVAS_HEIGHT: 265
// A blue square f(x) slides across a stationary red triangle g(x).
// The height of the purple triangle is the area of overlap, the value of (f * g)(x).

let canvasWidth = 450;               // overwritten from the container in updateCanvasSize()
let drawHeight = 210;
let controlHeight = 55;
let canvasHeight = drawHeight + controlHeight;
let margin = 25;
let defaultTextSize = 16;

let overlapSlider;                   // 0..270; 60 slider units move the square by its own width

const SHAPE_HEIGHT = 100;            // pixel height of the square and of the triangle's peak
const SHAPE_FRACTION = 0.3;          // shape width as a fraction of one third of the plot
const UNITS_PER_WIDTH = 60;          // slider units that move the square by exactly its own width
const MAX_AREA = 0.5;                // overlap when the 1 x 1 square covers the whole triangle
const BASE_Y = 175;                  // y of the baseline the shapes stand on

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  // Overlap control slider: the x position of the square f(x)
  overlapSlider = createSlider(0, 270, 0, 1);
  overlapSlider.position(margin, drawHeight + 12);
  overlapSlider.size(canvasWidth - 2 * margin);

  describe('A blue square slides across a red triangle. The height of a purple triangle shows the area where the two shapes overlap, which is the convolution at the current position.');
}

// Height of the triangle g at position t across its base (0 = left corner, 1 = right corner).
function triangleHeight(t) {
  if (t < 0 || t > 1) return 0;
  return 1 - abs(2 * t - 1);
}

// Area of overlap in square units (square 1 wide and 1 tall, triangle 1 wide with a peak of 1).
// offset = left edge of the square minus left edge of the triangle, in square widths.
// The square is cut into thin slices and the overlapping height of each slice is added up.
function calculateOverlapArea(offset) {
  const slices = 200;
  const dx = 1 / slices;
  const squareHeight = 1;
  let totalArea = 0;
  for (let k = 0; k < slices; k++) {
    const t = offset + (k + 0.5) * dx;          // middle of this slice, relative to the triangle
    totalArea += min(triangleHeight(t), squareHeight) * dx;
  }
  return totalArea;
}

function formatSigned(v) {
  const s = Math.abs(v).toFixed(2);
  return (v < -0.005 ? '−' : '') + s;
}

function draw() {
  updateCanvasSize();

  // Drawing region and control region
  noStroke();
  fill('aliceblue');
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  // Geometry: the plot is split into three equal panels, f(x) | g(x) | (f * g)(x)
  const thirdWidth = (canvasWidth - 2 * margin) / 3;
  const shapeWidth = SHAPE_FRACTION * thirdWidth;
  const initialSquareX = margin + thirdWidth / 2 - shapeWidth / 2;
  const triangleX = margin + 1.5 * thirdWidth - shapeWidth / 2;
  const overlapX = margin + 2.5 * thirdWidth - shapeWidth / 2;
  const dividerX = margin + 2 * thirdWidth;

  // Slider -> position of the square, then the overlap area at that position
  const u = overlapSlider.value();
  const squareX = initialSquareX + u * shapeWidth / UNITS_PER_WIDTH;
  const offset = (squareX - triangleX) / shapeWidth;     // also the offset x of the two centers
  const area = calculateOverlapArea(offset);
  const heightScale = constrain(area / MAX_AREA, 0, 1);

  // Baseline and the divider in front of the result panel
  stroke(150);
  strokeWeight(1);
  line(margin, BASE_Y, canvasWidth - margin, BASE_Y);
  stroke(200);
  line(dividerX, margin * 3, dividerX, BASE_Y);

  // Function f (square, blue)
  noStroke();
  fill(0, 0, 255, 128);
  rect(squareX, BASE_Y - SHAPE_HEIGHT, shapeWidth, SHAPE_HEIGHT);

  // Function g (triangle, red)
  fill(255, 0, 0, 128);
  triangle(
    triangleX, BASE_Y,
    triangleX + shapeWidth, BASE_Y,
    triangleX + shapeWidth / 2, BASE_Y - SHAPE_HEIGHT
  );

  // Largest possible result, as a dashed outline
  noFill();
  stroke(150, 100, 150);
  strokeWeight(1);
  drawingContext.setLineDash([4, 4]);
  triangle(
    overlapX, BASE_Y,
    overlapX + shapeWidth, BASE_Y,
    overlapX + shapeWidth / 2, BASE_Y - SHAPE_HEIGHT
  );
  drawingContext.setLineDash([]);

  // Convolution result: a triangle whose height is the area of overlap
  noStroke();
  fill(128, 0, 128, 204);
  triangle(
    overlapX, BASE_Y,
    overlapX + shapeWidth, BASE_Y,
    overlapX + shapeWidth / 2, BASE_Y - SHAPE_HEIGHT * heightScale
  );

  // Title and panel labels
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(canvasWidth < 420 ? 20 : 24);
  text('Function Overlap', canvasWidth / 2, margin / 2);

  textSize(defaultTextSize);
  fill(0, 0, 200);
  text('f(x)', margin + thirdWidth / 2, margin * 2);
  fill(200, 0, 0);
  text('g(x)', margin + 1.5 * thirdWidth, margin * 2);
  fill(128, 0, 128);
  text('(f * g)(x)', margin + 2.5 * thirdWidth, margin * 2);

  // Read-outs: the overlap area under the result, and the largest possible area beside its apex
  text('area = ' + area.toFixed(2), margin + 2.5 * thirdWidth, BASE_Y + 8);
  textSize(14);
  fill(110, 70, 110);
  textAlign(LEFT, CENTER);
  text('max ' + MAX_AREA.toFixed(2), overlapX + shapeWidth / 2 + 12, BASE_Y - SHAPE_HEIGHT + 2);

  // Slider label with its value and the offset x in square widths
  fill('black');
  textSize(defaultTextSize);
  textAlign(CENTER, TOP);
  let label = 'x position of f(x): ' + u + '   (x = ' + formatSigned(offset) + ' widths)';
  if (drawingContext.measureText(label).width > canvasWidth - 2 * margin + 20) {
    label = 'x position of f(x): ' + u;
  }
  text(label, canvasWidth / 2, drawHeight + 32);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) {
    canvasWidth = container.offsetWidth;
    if (typeof overlapSlider !== 'undefined') {
      overlapSlider.size(canvasWidth - 2 * margin);
    }
  }
}
