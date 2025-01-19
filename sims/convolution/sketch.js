// Function Overlap Simulation
let canvasWidth = 450;
let drawHeight = 200;
let controlHeight = 50;
let canvasHeight = drawHeight + controlHeight;
let margin = 25;
let defaultTextSize = 16;

let overlapSlider;
let shapeWidth = 40;
let shapeHeight = 100;

function setup() {
  const canvas = createCanvas(canvasWidth, canvasHeight);
  var mainElement = document.querySelector('main');
  canvas.parent(mainElement);
  textSize(defaultTextSize);

  // Create overlap control slider
  let sliderLeftMargin = margin;
  let sliderWidth = canvasWidth - 2 * margin;
  overlapSlider = createSlider(0, 270, 0, 1);
  overlapSlider.position(sliderLeftMargin, drawHeight + 12);
  overlapSlider.style('width', sliderWidth + 'px');
}

function calculateOverlapArea(squareX, triangleX) {
  // Calculate total overlap area at each x position
  let resolution = 100;
  let dx = shapeWidth / resolution;
  let totalArea = 0;
  
  // For each slice of the overlap region
  for (let x = squareX; x <= squareX + shapeWidth; x += dx) {
    if (x >= triangleX && x <= triangleX + shapeWidth) {
      // Calculate triangle height at this x
      let relativeX = (x - triangleX) / shapeWidth;
      let triangleHeight;
      if (relativeX <= 0.5) {
        triangleHeight = shapeHeight * (relativeX * 2);
      } else {
        triangleHeight = shapeHeight * ((1 - relativeX) * 2);
      }
      
      // Square height is constant
      let squareHeight = shapeHeight;
      
      // Add area of this slice (minimum height * dx)
      totalArea += min(triangleHeight, squareHeight) * dx;
    }
  }
  
  return totalArea;
}

function draw() {
  background('white');

  // Fill the drawing region
  fill('aliceblue');
  noStroke();
  rect(0, 0, canvasWidth, drawHeight);

  // Fill the control region
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  // Calculate positions
  let thirdWidth = (canvasWidth - 2 * margin) / 3;
  let baseY = drawHeight - margin;
  
  // Draw dividing lines
  stroke(200);
  // line(margin + thirdWidth, margin, margin + thirdWidth, drawHeight - margin);
  line(margin + 2 * thirdWidth, margin * 3, margin +  2 * thirdWidth, drawHeight - margin);

  // Get overlap amount from slider
  let overlap = overlapSlider.value();
  let shift = map(overlap, 0, 240, 0, shapeWidth * 4);

  // Fixed positions for the shapes
  let initialSquareX = margin + thirdWidth/2 - shapeWidth/2;
  let triangleX = margin + 1.5 * thirdWidth - shapeWidth/2;
  let squareX = initialSquareX + shift;

  // Draw function f (square)
  fill('rgba(0, 0, 255, 0.5)');
  noStroke();
  rect(squareX, baseY - shapeHeight, shapeWidth, shapeHeight);

  // Draw function g (triangle)
  fill('rgba(255, 0, 0, 0.5)');
  triangle(
    triangleX, baseY,
    triangleX + shapeWidth, baseY,
    triangleX + shapeWidth/2, baseY - shapeHeight
  );

  // Calculate and draw overlap result in third section
  let overlapX = margin + 2.5 * thirdWidth - shapeWidth/2;
  let overlapArea = calculateOverlapArea(squareX, triangleX);
  
  // Draw overlap result as a triangle scaled by the overlap area
  fill('rgba(128, 0, 128, 0.8)');
  let maxArea = shapeWidth * shapeHeight / 2; // Max possible overlap area
  let heightScale = overlapArea / maxArea;
  
  triangle(
    overlapX, baseY,
    overlapX + shapeWidth, baseY,
    overlapX + shapeWidth/2, baseY - (shapeHeight * heightScale)
  );

  // Draw labels
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(24);
  text("Function Overlap", canvasWidth/2, margin/2);
  
  textSize(16);
  text("f(x)", margin + thirdWidth/2, margin*2);
  text("g(x)", margin + 1.5 * thirdWidth, margin*2);
  text("(f * g)(x)", margin + 2.5 * thirdWidth, margin*2);
  
  // Slider label
  text("x position of f(x)", overlapSlider.x + overlapSlider.width/2, overlapSlider.y + 20);
}