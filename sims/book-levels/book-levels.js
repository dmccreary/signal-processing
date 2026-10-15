// Five Levels of Intelligent Textbooks MicroSim
// CANVAS_HEIGHT: 500
// A stair-step diagram of the five levels of intelligent textbooks, from static (Level 1) to
// autonomous AI (Level 5). Hover over, tap or press 1-5 to read a level's description.
// A dashed red rectangle marks Levels 3-5 as "Highly Regulated Textbooks".

// Canvas dimensions (the whole canvas is the drawing region; this sim has no control region)
let canvasWidth = 500;          // overwritten from the container in updateCanvasSize()
let drawHeight = 500;
let controlHeight = 0;
let canvasHeight = drawHeight + controlHeight;
let defaultTextSize = 16;

// Stair-step geometry, recomputed in updateLayout()
let layers = [];                // index 0 = Level 1 (bottom step) ... index 4 = Level 5 (top step)
let descriptions = [];
let currentHover = -1;          // index of the selected level, or -1 for none
let m;                          // margin around the steps
let mt;                         // margin from the top
let sw;                         // horizontal offset between successive steps
let sh;                         // step height

// Palette of the original sketch: fill colour of each level (text is black on every level for contrast)
const LEVEL_COLORS = ['red', '#4682B4', '#20B2AA', '#9370DB', 'gold'];
const REGULATED_TEXT = '#C00000';   // dark red for the "Highly Regulated" label (red is 3.7:1 on aliceblue; this is 6.0:1)

const BASE_DESCRIPTION =
  'Stair-step diagram of the five levels of intelligent textbooks: Level 1 static textbooks, ' +
  'Level 2 interactive content, Level 3 adaptive textbooks, Level 4 chatbot integration and ' +
  'Level 5 autonomous AI. Levels 3 to 5 are enclosed in a dashed rectangle labelled Highly Regulated Textbooks. ' +
  'Hover over a level, tap it, or press the keys 1 to 5 to read its description.';

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  canvas.elt.setAttribute('tabindex', '0');          // lets keyboard users focus the diagram, then use keys 1-5
  textFont('Arial');
  textSize(defaultTextSize);

  // Level descriptions shown when a step is hovered, tapped or selected with the keyboard
  descriptions = [
    "Level 1: Static Textbooks are traditional printed or digital formats with no interactive elements. They are composed purely of text and static images, with fixed content that doesn't adapt to the learner. Over 90% of textbooks used by college students today remain at Level 1. They're suitable for simple content delivery where interaction isn't necessary.",
    "Level 2: Interactive Content Textbooks incorporate digital elements that engage readers beyond passive consumption. Features include keyword search, hyperlinks, embedded videos, simple quizzes, AI-generated MicroSims, detailed glossary, social sharing compatibility, and usage analytics. These textbooks are cost-effective enhancements that improve engagement with multimedia elements.",
    "Level 3: Adaptive Textbooks dynamically adjust content based on user input, performance, and behavior. They use personalized learning pathways through deterministic rules, concept graph traversal algorithms, content selection based on assessment performance, and continuous recording of concept mastery. Implementation requires data management systems, graph algorithms, and raises privacy considerations.",
    "Level 4: Textbooks with Chatbots integrate intelligent conversational interfaces providing real-time assistance. They use Large Language Models (LLMs) as tutoring assistants, employ GraphRAG architecture combining multiple AI technologies, and provide real-time feedback on student questions. These systems can balance between powerful LLMs and cost-effective smaller models for privacy and efficiency.",
    "Level 5: Autonomous AI Textbooks represent the future of educational content where AI-driven systems fully understand individual learner needs and autonomously generate personalized learning experiences. They feature deep understanding of student knowledge, real-time generation of customized lessons, complete adaptability to learning styles, and human-like tutoring capabilities. This level remains aspirational, requiring advanced hardware and more reliable LLMs."
  ];

  updateLayout();
  describe(BASE_DESCRIPTION);
}

// Responsive dimensions based on the container width
function updateLayout() {
  m = max(10, canvasWidth * 0.03);   // margins around the steps
  mt = 60;                           // margin from the top is fixed

  if (canvasWidth < 400) {           // small screens
    sw = 30; sh = 50;
  } else if (canvasWidth < 600) {    // medium screens
    sw = 40; sh = 55;
  } else {                           // large screens
    sw = 60; sh = 60;
  }

  // Layers from Level 1 (bottom) to Level 5 (top); each step starts one step further right
  layers = [
    {x: m,        y: sh * 4 + mt, w: canvasWidth - sw,     h: sh, level: "Level 1 - Static Textbooks"},
    {x: sw + m,   y: sh * 3 + mt, w: canvasWidth - sw * 2, h: sh, level: "Level 2 - Interactive Content"},
    {x: sw * 2 + m, y: sh * 2 + mt, w: canvasWidth - sw * 3, h: sh, level: "Level 3 - Adaptive Textbooks"},
    {x: sw * 3 + m, y: sh * 1 + mt, w: canvasWidth - sw * 4, h: sh, level: "L4 - Chatbot Integration"},
    {x: sw * 4 + m, y: mt,          w: canvasWidth - sw * 5, h: sh, level: "L5 - Autonomous AI"}
  ];

  // Shorten the labels on narrow screens
  if (canvasWidth < 500) {
    layers[0].level = "L1 - Static";
    layers[1].level = "L2 - Interactive";
    layers[2].level = "L3 - Adaptive";
    layers[3].level = "L4 - Chatbots";
    layers[4].level = "L5 - AI";
  }
}

// Word-wrap a string to maxWidth pixels at the current text size (fontWidth keeps the spaces)
function wrapLines(str, maxWidth) {
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? line + ' ' + w : w;
    if (line && fontWidth(candidate) > maxWidth) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Draw a block of text in the area below the steps, shrinking the font until it fits
function drawTextBlock(str, x, y, w, h, maxSize, minSize, align) {
  let size = maxSize;
  let lines;
  while (true) {
    textSize(size);
    lines = wrapLines(str, w);
    if (lines.length * size * 1.25 <= h || size <= minSize) break;
    size -= 0.5;
  }
  textAlign(align, TOP);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], align === CENTER ? x + w / 2 : x, y + i * size * 1.25);
  }
}

function drawLayer(i, hovered) {
  const l = layers[i];
  fill(LEVEL_COLORS[i]);
  if (hovered) {
    stroke('blue');
    strokeWeight(4);
  } else {
    noStroke();
  }
  rect(l.x, l.y, l.w, l.h - 2);

  // Step label: black on every level (at least 5:1 contrast on all five fills)
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  text(l.level, l.x + l.w / 2, l.y + l.h / 2);
}

function draw() {
  updateCanvasSize();
  if (width !== canvasWidth) {
    resizeCanvas(canvasWidth, canvasHeight);
    updateLayout();
  }
  background('aliceblue');

  // Title (shrinks to fit very narrow containers)
  let titleSize = constrain(canvasWidth * 0.035, 16, 22);
  textSize(titleSize);
  while (fontWidth("The Five Levels of Intelligent Textbooks") > canvasWidth - 20 && titleSize > 12) {
    titleSize -= 1;
    textSize(titleSize);
  }
  textAlign(CENTER, TOP);
  fill(0);
  noStroke();
  text("The Five Levels of Intelligent Textbooks", width / 2, 6);

  // Step labels: at least 14 px, up to 24 px
  textSize(constrain(canvasWidth * 0.03, 14, 24));

  // Draw the steps; the selected one is drawn last so its blue border is not overlapped
  for (let i = 0; i < layers.length; i++) {
    if (i !== currentHover) drawLayer(i, false);
  }
  if (currentHover !== -1) drawLayer(currentHover, true);

  // Dashed red rectangle around Levels 3, 4 and 5
  const left = layers[2].x;
  const topR = layers[4].y;
  const right = layers[2].x + layers[2].w;
  const bottom = layers[2].y + layers[2].h - 2;
  const rectW = right - left;
  const rectH = bottom - topR;

  push();
  noFill();
  stroke('red');
  strokeWeight(2);
  drawingContext.setLineDash([8, 5]);
  rect(left - 4, topR - 4, rectW + 8, rectH + 8);
  drawingContext.setLineDash([]);
  pop();

  // Label for the dashed rectangle
  textSize(constrain(canvasWidth * 0.025, 14, 18));
  fill(REGULATED_TEXT);
  noStroke();
  textAlign(CENTER, BOTTOM);
  text("Highly Regulated Textbooks", left + rectW / 2, topR - 7);

  // Description area below the steps
  const descriptionY = sh * 5 + mt + 10;
  const descX = 20;
  const descW = canvasWidth - 40;
  const descH = canvasHeight - descriptionY - 8;
  fill(0);
  noStroke();
  if (currentHover !== -1) {
    drawTextBlock(descriptions[currentHover], descX, descriptionY, descW, descH, 16, 12, LEFT);
  } else {
    drawTextBlock("Hover over a level to see details. On a touch screen, tap a level. Keys 1 to 5 also select a level.",
                  descX, descriptionY + 20, descW, descH - 20, 16, 14, CENTER);
  }
}

// Index of the level under the pointer, or -1
function levelAt(px, py) {
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    if (px >= l.x && px <= l.x + l.w && py >= l.y && py <= l.y + l.h) return i;
  }
  return -1;
}

// Select a level (or -1 to clear) and keep the accessible description in step
function selectLevel(i) {
  if (i === currentHover) return;
  currentHover = i;
  describe(i === -1 ? BASE_DESCRIPTION : BASE_DESCRIPTION + ' Selected: ' + descriptions[i]);
}

function mouseMoved() {
  selectLevel(levelAt(mouseX, mouseY));
}

// A tap on a touch screen: select the tapped level (a tap outside the steps keeps the current one)
function mousePressed() {
  const i = levelAt(mouseX, mouseY);
  if (i !== -1) selectLevel(i);
}

// Keyboard: 1-5 select a level, Up/Down arrows step through the levels, Escape clears
function keyPressed() {
  if (key.length === 1 && key >= '1' && key <= '5') {
    selectLevel(Number(key) - 1);
    return false;
  }
  if (key === 'ArrowUp') {
    selectLevel(currentHover < 0 ? 0 : min(4, currentHover + 1));
    return false;
  }
  if (key === 'ArrowDown') {
    selectLevel(currentHover < 0 ? 0 : max(0, currentHover - 1));
    return false;
  }
  if (key === 'Escape') {
    selectLevel(-1);
    return false;
  }
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateLayout();
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = Math.floor(container.getBoundingClientRect().width);
}
