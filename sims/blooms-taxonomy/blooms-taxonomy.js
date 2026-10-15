// Bloom's Taxonomy MicroSim
// CANVAS_HEIGHT: 640
// A stepped pyramid of the six cognitive levels of the revised (2001) Bloom's taxonomy,
// Remember at the base to Create at the apex. Hover over or tap a level to read its description.
// Display-only: the whole canvas is drawing area and the sim has no controls.

// Canvas dimensions
let canvasWidth = 400;               // overwritten from the container in updateCanvasSize()
let drawHeight = 640;
let controlHeight = 0;
let canvasHeight = drawHeight + controlHeight;
let defaultTextSize = 16;

// Fixed vertical layout (same proportions as the original 600 px sketch;
// the extra 40 px at the bottom gives the 7-line description room at a 320 px width)
const TITLE_Y = 30;
const PYRAMID_TOP = 70;
const PYRAMID_HEIGHT = 390;
const KEY_HEIGHT = 40;               // color key sits between the pyramid and the description

// State
let currentHover = -1;               // index into levels[] under the pointer, or -1
let levels = [];

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textFont('Arial');
  textSize(defaultTextSize);

  // Clear the description when the pointer leaves the canvas.
  canvas.elt.addEventListener('mouseleave', () => { currentHover = -1; });

  // Levels listed from the base of the pyramid (index 0) to the apex.
  // tcolor is the label color and is chosen to contrast with the block color.
  levels = [
    {
      level: "Remember",
      color: "#4B0082", // Indigo
      tcolor: "white",
      description: "Remember: Retrieving relevant knowledge from long-term memory, including recognizing and recalling basic concepts, facts, and terminology. In an intelligent textbook, this might involve basic definitions and concept explanations."
    },
    {
      level: "Understand",
      color: "#0000FF", // Blue
      tcolor: "white",
      description: "Understand: Constructing meaning from instructional messages, including interpreting, exemplifying, classifying, summarizing, inferring, comparing, and explaining. This is where MicroSims can first become valuable for demonstrating concepts interactively."
    },
    {
      level: "Apply",
      color: "green",
      tcolor: "white",
      description: "Apply: Carrying out or using procedures in given situations, including executing and implementing learned material in new contexts. Interactive MicroSims can support this level by letting students try a procedure on new inputs."
    },
    {
      level: "Analyze",
      color: "gold",
      tcolor: "black",
      description: "Analyze: Breaking material into constituent parts and determining how parts relate to one another and to an overall structure or purpose. This includes differentiating, organizing, and attributing knowledge."
    },
    {
      level: "Evaluate",
      color: "orange",
      tcolor: "black",
      description: "Evaluate: Making judgments based on criteria and standards, including checking and critiquing. A learning graph can help students see how concepts interconnect at this level."
    },
    {
      level: "Create",
      color: "red",
      tcolor: "black",
      description: "Create: Putting elements together to form a coherent or functional whole; reorganizing elements into new patterns or structures. This highest level is where students might modify or create their own MicroSims."
    }
  ];

  describe("A stepped pyramid of Bloom's taxonomy with six levels, from Remember at the base through Understand, Apply, Analyze and Evaluate to Create at the apex. " +
           "Hover over or tap a level to read its description below the pyramid.");
}

function draw() {
  updateCanvasSize();
  if (width !== canvasWidth) resizeCanvas(canvasWidth, canvasHeight);
  background('aliceblue');

  // Responsive geometry
  const baseWidth = min(canvasWidth * 0.8, 500);          // 80% of the width, at most 500 px
  const startX = (canvasWidth - baseWidth) / 2;
  const pyramidBottom = PYRAMID_TOP + PYRAMID_HEIGHT;
  const sectHeight = PYRAMID_HEIGHT / levels.length;
  const descriptionY = pyramidBottom + KEY_HEIGHT;
  const bodySize = constrain(canvasWidth * 0.03, 14, 16);

  // Blocks: fill first, then labels
  const levelTextSize = constrain(canvasWidth * 0.04, 14, 20);   // capped so "Create" fits its narrow block
  noStroke();
  for (let i = 0; i < levels.length; i++) {
    const currentY = pyramidBottom - i * sectHeight;      // bottom edge of block i
    const currentWidth = baseWidth * (1 - i / levels.length);
    const currentX = startX + (baseWidth - currentWidth) / 2;

    // Store the block rectangle for hover detection
    levels[i].coords = { x: currentX, y: currentY - sectHeight, w: currentWidth, h: sectHeight };

    fill(levels[i].color);
    rect(currentX, currentY - sectHeight, currentWidth, sectHeight);

    // Level label; very narrow screens use 3-letter abbreviations (except the wide base)
    let displayText = levels[i].level;
    if (canvasWidth < 350 && i > 0) displayText = displayText.substring(0, 3);
    fill(levels[i].tcolor);
    textSize(levelTextSize);
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text(displayText, currentX + currentWidth / 2, currentY - sectHeight / 2);
  }

  // Outline of the hovered block is drawn last so no neighbor covers it
  if (currentHover !== -1) {
    const c = levels[currentHover].coords;
    noFill();
    stroke('black');
    strokeWeight(3);
    rect(c.x, c.y, c.w, c.h);
    noStroke();
  }

  // Title
  fill('black');
  textSize(constrain(canvasWidth * 0.04, 16, 24));
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  text("Bloom's Taxonomy: RUAAEC", canvasWidth / 2, TITLE_Y);

  // Color key for the hovered level (swatch + name), under the pyramid at the left
  const keyBoxX = 10;
  const keyBoxY = descriptionY - KEY_HEIGHT;
  if (currentHover !== -1) {
    const keySquareSize = 30;
    const keyPadding = 10;
    fill(levels[currentHover].color);
    rect(keyBoxX + keyPadding, keyBoxY + (KEY_HEIGHT - keySquareSize) / 2, keySquareSize, keySquareSize);

    fill('black');
    textSize(bodySize);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text(levels[currentHover].level, keyBoxX + keyPadding + keySquareSize + 10, keyBoxY + KEY_HEIGHT / 2);
  }

  // Description of the hovered level, or the instruction
  textSize(bodySize);
  textStyle(NORMAL);
  if (currentHover !== -1) {
    fill('black');
    textAlign(LEFT, TOP);
    text(levels[currentHover].description, 20, descriptionY, canvasWidth - 40);
  } else {
    fill('#555555');
    textAlign(CENTER, TOP);
    text("Hover over or tap a level to see its description", canvasWidth / 2, descriptionY);
  }
}

// Find the block under the pointer (the blocks never overlap, so at most one matches).
function updateHover() {
  currentHover = -1;
  for (let i = 0; i < levels.length; i++) {
    const c = levels[i].coords;
    if (c && mouseX >= c.x && mouseX <= c.x + c.w && mouseY >= c.y && mouseY <= c.y + c.h) {
      currentHover = i;
      break;
    }
  }
}

function mouseMoved() { updateHover(); }
function mouseDragged() { updateHover(); }
function mousePressed() { updateHover(); }   // a tap on a touch screen

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = Math.floor(container.getBoundingClientRect().width);   // avoid fractional pixels
}
