// Book Build Workflow MicroSim
// CANVAS_HEIGHT: 650
// Interactive infographic of the workflow used to generate an intelligent textbook.
// Row 1 is the primary path from the Course Description to the Learning Graph,
// row 2 holds book-level outputs, row 3 holds chapter-level content.
// Hover (or tap) a box to read what it does and to highlight everything downstream of it;
// click it (tap it a second time) to open its documentation page in a new tab.
// This sim is display-only: it has no p5 controls.

let canvasWidth = 800;            // overwritten from the <main> container in updateCanvasSize()
let drawHeight = 650;             // the whole canvas is the drawing region
let controlHeight = 0;            // no p5 controls in this sim
let canvasHeight = drawHeight + controlHeight;
let defaultTextSize = 16;

// Vertical layout (fixed pixels; only the horizontal layout depends on the width)
const wfTitleY = 14;
const wfTaxonomyY = 60;           // the Concept Taxonomy side box
const wfPathY = 140;              // row 1
const wfBookY = 280;              // row 2
const wfChapterY = 414;           // row 3
const wfPanelY = 490;             // description panel
const wfPanelH = 150;

// Computed in updateLayout()
let wfLayoutWidth = -1;
let wfSideMargin = 10;
let wfGap = 20;
let wfColW = 100;
let wfPathH = 50;
let wfOutH = 66;
let wfLabelSize = 14;
let wfArrow = 8;
let wfHover = -1;                 // index of the hovered / selected node, -1 for none
let wfPointerAway = false;        // true while a mouse has left the canvas
let wfShownCursor = '';

// In the label strings '\n' is a forced line break and '~' marks where a long word may be
// hyphenated when the boxes become too narrow (it is removed when the word fits).
const wfNodes = [
  { id: 'course', level: 'path', col: 0, y: wfPathY, label: 'Course\nDescrip~tion', color: 'red', tcolor: 'white',
    description: 'We begin the textbook generation process starting with a detailed course description that outlines the target audience, prerequisites, learning objectives, and scope of content. This document forms the foundation for all subsequent development stages.',
    url: 'https://dmccreary.github.io/intelligent-textbooks/workflow/course-description/' },
  { id: 'bloom', level: 'path', col: 1, y: wfPathY, label: '2001 Bloom\nTax~onomy', color: 'orange', tcolor: 'black',
    description: "Apply the 2001 Bloom's Taxonomy to categorize learning objectives across six cognitive levels: Remember, Understand, Apply, Analyze, Evaluate, and Create. This scaffolds progressive skill development.",
    url: 'https://dmccreary.github.io/intelligent-textbooks/workflow/bloom-taxonomy/' },
  { id: 'enum', level: 'path', col: 2, y: wfPathY, label: 'Concept\nEnumer~ation', color: 'yellow', tcolor: 'black',
    description: 'Create a precise inventory of all key concepts students must master. This comprehensive list ensures no important topic is overlooked.',
    url: 'https://dmccreary.github.io/intelligent-textbooks/workflow/concept-enumeration/' },
  { id: 'deps', level: 'path', col: 3, y: wfPathY, label: 'Concept\nDepend~encies', color: 'green', tcolor: 'white',
    description: 'Define learning-order relationships between concepts. These dependencies establish a structured sequence where foundational concepts precede advanced topics.',
    url: 'https://dmccreary.github.io/intelligent-textbooks/workflow/concept-dependency/' },
  { id: 'graph', level: 'path', col: 4, y: wfPathY, label: 'Learning\nGraph', color: 'purple', tcolor: 'white',
    description: 'Combine dependencies and taxonomy into a comprehensive Learning Graph that visualizes interconnections between concepts. This enables AI-driven adaptive learning paths.',
    url: 'https://dmccreary.github.io/intelligent-textbooks/workflow/learning-graph/' },
  { id: 'tax', level: 'path', col: 3, y: wfTaxonomyY, label: 'Concept\nTax~onomy', color: 'steelblue', tcolor: 'black',
    description: 'Generate a taxonomy that classifies concepts into categories, enabling color-coding in the Learning Graph to reveal structural patterns.',
    url: 'https://dmccreary.github.io/intelligent-textbooks/workflow/concept-taxonomy/' },

  // Row 2: book-level outputs generated from the Learning Graph
  { id: 'chapters', level: 'book', col: 0, y: wfBookY, label: 'Chap~ters &\nSections', color: 'lightblue', tcolor: 'black',
    description: 'Structure content into logical chapters and sections based on concept dependencies, creating an organized progression with clear milestones.',
    url: 'https://dmccreary.github.io/intelligent-textbooks/workflow/chapters-and-sections/' },
  { id: 'glossary', level: 'book', col: 1, y: wfBookY, label: 'Glossary of\nTerms', color: 'lightblue', tcolor: 'black',
    description: 'Generate precise ISO-11179 definitions for each concept to ensure consistent understanding across the curriculum.',
    url: 'https://dmccreary.github.io/intelligent-textbooks/workflow/glossary/' },
  { id: 'cloud', level: 'book', col: 2, y: wfBookY, label: 'Word Cloud', color: 'lightblue', tcolor: 'black',
    description: 'Visualize key concepts sized by importance or frequency, providing a quick overview of course themes.',
    url: 'https://dmccreary.github.io/intelligent-textbooks/sims/word-cloud/' },
  { id: 'faq', level: 'book', col: 3, y: wfBookY, label: 'FAQ', color: 'lightblue', tcolor: 'black',
    description: 'Provide anticipatory answers to common student questions, clarifying misconceptions and offering additional context.',
    url: 'https://dmccreary.github.io/intelligent-textbooks/workflow/faq/' },
  { id: 'summaries', level: 'book', col: 4, y: wfBookY, label: 'Sum~maries', color: 'lightblue', tcolor: 'black',
    description: 'Concise distillations of each major topic highlighting key takeaways to support review and reinforce learning objectives.',
    url: '' },

  // Row 3: chapter-level content generated from the chapters
  { id: 'figures', level: 'chapter', col: 0, y: wfChapterY, label: 'Figures,\nDia~grams,\nCharts', color: 'lightgreen', tcolor: 'black',
    description: 'Visual aids that illustrate complex concepts and data relationships, enhancing comprehension through multiple modalities.',
    url: 'https://dmccreary.github.io/intelligent-textbooks/workflow/figures-diagrams-charts/' },
  { id: 'infographics', level: 'chapter', col: 1, y: wfChapterY, label: 'Inter~active\nInfo~graphics', color: 'lightgreen', tcolor: 'black',
    description: 'Dynamic visuals that respond to user interaction, allowing exploration of data and concepts for hands-on learning.',
    url: 'https://dmccreary.github.io/intelligent-textbooks/workflow/interactive-infographics/' },
  { id: 'microsims', level: 'chapter', col: 2, y: wfChapterY, label: 'Micro~Sims', color: 'lightgreen', tcolor: 'black',
    description: 'Small-scale simulations where students experiment with variables and observe outcomes, providing experiential learning.',
    url: 'https://dmccreary.github.io/intelligent-textbooks/workflow/microsim/' },
  { id: 'novels', level: 'chapter', col: 3, y: wfChapterY, label: 'Graphic Novel\nStories', color: 'lightgreen', tcolor: 'black',
    description: 'Narrative-based visual content that teaches concepts through storytelling, appealing to diverse learning styles.',
    url: 'https://dmccreary.github.io/intelligent-textbooks/workflow/graphic-novel/' },
  { id: 'assess', level: 'chapter', col: 4, y: wfChapterY, label: 'Assess~ments', color: 'lightgreen', tcolor: 'black',
    description: "Quizzes, projects, and performance tasks that measure student understanding and progress across Bloom's levels.",
    url: 'https://dmccreary.github.io/intelligent-textbooks/skills/quiz-generator/' }
];

// Arrows: [from, to] node ids ("from" is an input to "to").
const wfEdges = [
  ['course', 'bloom'], ['bloom', 'enum'], ['enum', 'deps'], ['deps', 'graph'],
  ['enum', 'tax'], ['tax', 'graph'],
  ['graph', 'chapters'], ['graph', 'glossary'], ['graph', 'cloud'], ['graph', 'faq'], ['graph', 'summaries'],
  ['chapters', 'figures'], ['chapters', 'infographics'], ['chapters', 'microsims'], ['chapters', 'novels'], ['chapters', 'assess']
];

const wfLevelName = { path: 'Learning-graph stage', book: 'Book-level output', chapter: 'Chapter-level content' };

let wfById = {};                  // id -> node
let wfDown = {};                  // id -> Set of every node id downstream of it

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  for (const n of wfNodes) wfById[n.id] = n;
  for (const n of wfNodes) wfDown[n.id] = wfCollectDownstream(n.id);

  // a mouse that leaves the canvas clears the hover; touch input keeps its selection
  canvas.elt.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') wfPointerAway = true; });
  canvas.elt.addEventListener('pointerenter', () => { wfPointerAway = false; });

  updateLayout();

  describe('Workflow diagram for generating an intelligent textbook. A Course Description leads through the 2001 Bloom ' +
           'Taxonomy, Concept Enumeration and Concept Dependencies to the Learning Graph; Concept Taxonomy is a side branch ' +
           'into the Learning Graph. The Learning Graph feeds five book-level outputs: Chapters and Sections, Glossary, ' +
           'Word Cloud, FAQ and Summaries. Chapters and Sections feeds five chapter-level items: Figures, Interactive ' +
           'Infographics, MicroSims, Graphic Novel Stories and Assessments. Hover a box to read its description and to ' +
           'highlight everything downstream of it; click it to open its documentation page.');
}

function wfCollectDownstream(id) {
  const seen = new Set();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop();
    for (const e of wfEdges) {
      if (e[0] === cur && !seen.has(e[1])) { seen.add(e[1]); stack.push(e[1]); }
    }
  }
  return seen;
}

// ---------------------------------------------------------------------
// Layout: five equal columns shared by all three rows
// ---------------------------------------------------------------------
function updateLayout() {
  wfLayoutWidth = canvasWidth;
  const W = canvasWidth;
  wfSideMargin = max(6, round(W * 0.025));
  wfGap = constrain(round(W * 0.03), 8, 28);
  wfColW = (W - 2 * wfSideMargin - 4 * wfGap) / 5;
  wfPathH = wfColW < 100 ? 64 : 50;       // narrow boxes need room for 4 short lines
  wfOutH = 66;
  wfArrow = constrain(W * 0.009, 5, 8);

  for (const n of wfNodes) {
    n.x = wfSideMargin + n.col * (wfColW + wfGap);
    n.w = wfColW;
    n.h = n.level === 'path' ? wfPathH : wfOutH;
  }
  wfFitLabels();
}

// Break one paragraph into lines no wider than maxW at the current text size.
function wfWrap(par, maxW, allowHyphen) {
  const lines = [];
  let cur = '';
  for (const word of par.split(' ')) {
    const plain = word.replace(/~/g, '');
    const trial = cur ? cur + ' ' + plain : plain;
    if (fontWidth(trial) <= maxW) { cur = trial; continue; }
    if (cur) { lines.push(cur); cur = ''; }
    let rest = word;
    while (allowHyphen && rest.includes('~') && fontWidth(rest.replace(/~/g, '')) > maxW) {
      const parts = rest.split('~');
      let best = -1;
      for (let k = 1; k < parts.length; k++) {
        if (fontWidth(parts.slice(0, k).join('') + '-') <= maxW) best = k;
      }
      if (best === -1) break;
      lines.push(parts.slice(0, best).join('') + '-');
      rest = parts.slice(best).join('~');
    }
    cur = rest.replace(/~/g, '');
  }
  if (cur) lines.push(cur);
  return lines;
}

function wfWrapParagraphs(str, maxW, allowHyphen) {
  let out = [];
  for (const par of str.split('\n')) out = out.concat(wfWrap(par, maxW, allowHyphen));
  return out;
}

// One font size for every box label: the largest that fits without hyphenation (16 down to 12),
// else the largest that fits with hyphenation (12 down to 9).
function wfFitLabels() {
  const innerW = wfColW - 8;
  const tryFit = (size, hyphen) => {
    textSize(size);
    textStyle(NORMAL);
    for (const n of wfNodes) {
      n.lines = wfWrapParagraphs(n.label, innerW, hyphen);
      const widest = max(n.lines.map(l => fontWidth(l)));
      if (widest > innerW + 0.5 || n.lines.length * size * 1.2 > n.h - 4) return false;
    }
    return true;
  };
  for (let s = 16; s >= 12; s--) if (tryFit(s, false)) { wfLabelSize = s; return; }
  for (let s = 12; s >= 9; s--) if (tryFit(s, true)) { wfLabelSize = s; return; }
  wfLabelSize = 9;
  tryFit(9, true);
}

// ---------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------
function draw() {
  updateCanvasSize();
  if (canvasWidth !== wfLayoutWidth) {
    resizeCanvas(canvasWidth, canvasHeight);
    updateLayout();
  }

  wfHover = wfPointerAway ? -1 : wfHitTest(mouseX, mouseY);
  const hoverNode = wfHover >= 0 ? wfNodes[wfHover] : null;
  const down = hoverNode ? wfDown[hoverNode.id] : null;

  // cursor feedback: pointer only over a box that has a page behind it
  const wanted = hoverNode && hoverNode.url ? 'pointer' : 'default';
  if (wanted !== wfShownCursor) { cursor(wanted); wfShownCursor = wanted; }

  background('aliceblue');
  noFill();
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth - 1, drawHeight - 1);

  wfDrawTitle();
  wfDrawLegend();
  for (const e of wfEdges) wfDrawEdge(e, hoverNode, down);
  for (let i = 0; i < wfNodes.length; i++) wfDrawNode(wfNodes[i], i === wfHover, down && down.has(wfNodes[i].id));
  wfDrawPanel(hoverNode, down);
}

function wfDrawTitle() {
  const str = 'Intelligent Textbook Generation Workflow';
  let size = 28;
  textStyle(NORMAL);
  textSize(size);
  while (size > 13 && fontWidth(str) > canvasWidth - 16) { size--; textSize(size); }
  noStroke();
  fill(0);
  textAlign(CENTER, TOP);
  text(str, canvasWidth / 2, wfTitleY);
}

function wfDrawLegend() {
  const size = constrain(wfLabelSize, 11, 14);
  textSize(size);
  textStyle(NORMAL);
  textAlign(LEFT, CENTER);
  const x0 = wfSideMargin + 2;
  const rowH = 22;
  const y0 = wfTaxonomyY + 8;

  // stage colours of row 1
  const stageColors = ['red', 'orange', 'yellow', 'green', 'steelblue', 'purple'];
  const sw = 7;
  stroke(0);
  strokeWeight(0.5);
  for (let i = 0; i < stageColors.length; i++) {
    fill(stageColors[i]);
    rect(x0 + i * sw, y0 - 7, sw, 14);
  }
  noStroke();
  fill(0);
  text('Learning-graph stages', x0 + stageColors.length * sw + 8, y0);

  stroke(0);
  strokeWeight(0.5);
  fill('lightblue');
  rect(x0, y0 + rowH - 7, 14, 14);
  noStroke();
  fill(0);
  text('Book-level outputs', x0 + 22, y0 + rowH);

  stroke(0);
  strokeWeight(0.5);
  fill('lightgreen');
  rect(x0, y0 + 2 * rowH - 7, 14, 14);
  noStroke();
  fill(0);
  text('Chapter-level content', x0 + 22, y0 + 2 * rowH);
}

function wfEdgePoints(a, b) {
  if (a.y === b.y) return [a.x + a.w, a.y + a.h / 2, b.x, b.y + b.h / 2];          // same row: right edge to left edge
  if (b.y >= a.y + a.h) return [a.x + a.w / 2, a.y + a.h, b.x + b.w / 2, b.y];     // down: bottom centre to top centre
  if (b.id === 'tax') return [a.x + a.w / 2, a.y, b.x, b.y + b.h / 4];             // up to the side branch
  return [a.x + a.w, a.y + a.h / 4, b.x + b.w / 2, b.y];                           // side branch to the Learning Graph
}

function wfDrawEdge(e, hoverNode, down) {
  const a = wfById[e[0]];
  const b = wfById[e[1]];
  const p = wfEdgePoints(a, b);
  let col = color(0);
  let wt = 2;
  if (hoverNode) {
    const onPath = e[0] === hoverNode.id || down.has(e[0]);
    col = onPath ? color('blue') : color(185);
    wt = onPath ? 3.5 : 1.5;
  }
  stroke(col);
  strokeWeight(wt);
  line(p[0], p[1], p[2], p[3]);
  const ang = atan2(p[3] - p[1], p[2] - p[0]);
  push();
  translate(p[2], p[3]);
  rotate(ang);
  fill(col);
  noStroke();
  triangle(-wfArrow * 2, -wfArrow, -wfArrow * 2, wfArrow, 0, 0);
  pop();
}

function wfDrawNode(n, isHover, isDownstream) {
  if (isHover) { stroke('blue'); strokeWeight(5); }
  else if (isDownstream) { stroke('blue'); strokeWeight(3); }
  else { stroke(0); strokeWeight(1); }
  fill(n.color);
  rect(n.x, n.y, n.w, n.h);

  noStroke();
  fill(n.tcolor);
  textStyle(NORMAL);
  textSize(wfLabelSize);
  textAlign(CENTER, CENTER);
  const lead = wfLabelSize * 1.2;
  const top = n.y + n.h / 2 - (n.lines.length - 1) * lead / 2;
  for (let i = 0; i < n.lines.length; i++) text(n.lines[i], n.x + n.w / 2, top + i * lead);
}

function wfDrawPanel(hoverNode, down) {
  const px = 8;
  const pw = canvasWidth - 16;
  fill(240);
  stroke(200);
  strokeWeight(1);
  rect(px, wfPanelY, pw, wfPanelH, 4);

  noStroke();
  fill(0);
  const innerW = pw - 20;
  const x = px + 10;

  if (!hoverNode) {
    const msg = 'Hover over (or tap) a component to see what it does and what it feeds.\n' +
                'Everything downstream of it is highlighted in blue.\n' +
                'Click it (or tap it a second time) to open its documentation in a new tab.';
    wfDrawFitted(msg, x, wfPanelY + 8, innerW, wfPanelH - 16, true);
    return;
  }

  // heading: component name on the left, its level on the right
  const name = hoverNode.label.replace(/\n/g, ' ').replace(/~/g, '');
  let hs = constrain(wfLabelSize + 2, 12, 18);
  textStyle(BOLD);
  textSize(hs);
  const tag = wfLevelName[hoverNode.level];
  while (hs > 11 && fontWidth(name) + fontWidth(tag) + 16 > innerW) { hs--; textSize(hs); }
  const showTag = fontWidth(name) + fontWidth(tag) + 16 <= innerW;
  textAlign(LEFT, TOP);
  text(name, x, wfPanelY + 8);
  if (showTag) {
    textStyle(NORMAL);
    fill(70);
    textAlign(RIGHT, TOP);
    text(tag, x + innerW, wfPanelY + 8);
  }

  // footer: what the component feeds and whether a page is linked (two lines when it does not fit on one)
  const n = down.size;
  const feeds = n === 0 ? 'Feeds no other component.' : 'Feeds ' + n + ' downstream component' + (n === 1 ? '' : 's') + '.';
  const link = hoverNode.url ? 'Click to open its page in a new tab.' : 'No documentation page is linked.';
  textStyle(NORMAL);
  let fs = 14;
  let foot = [feeds + '  ' + link];
  for (; fs >= 12; fs--) {
    textSize(fs);
    if (fontWidth(foot[0]) <= innerW) break;
  }
  if (fontWidth(foot[0]) > innerW) { fs = 13; foot = [feeds, link]; }
  const footLead = fs * 1.25;
  textSize(fs);
  fill(60);
  textAlign(LEFT, BOTTOM);
  for (let i = 0; i < foot.length; i++) {
    text(foot[i], x, wfPanelY + wfPanelH - 8 - (foot.length - 1 - i) * footLead);
  }

  // description in whatever room is left between the heading and the footer
  const descY = wfPanelY + 8 + hs * 1.35 + 4;
  const descH = wfPanelY + wfPanelH - 8 - foot.length * footLead - 6 - descY;
  fill(0);
  wfDrawFitted(hoverNode.description, x, descY, innerW, descH, false);
}

// Wrap text for a box: the largest font size (16 down to 10) whose lines fit the box height.
function wfFitText(str, w, h) {
  textStyle(NORMAL);
  for (let size = 16; size >= 10; size--) {
    textSize(size);
    const lines = wfWrapParagraphs(str, w, false);
    if (lines.length * size * 1.25 <= h || size === 10) return { size: size, lines: lines };
  }
}

// Draw wrapped text in a box (left aligned at the top, or centred in the box).
function wfDrawFitted(str, x, y, w, h, centered) {
  const f = wfFitText(str, w, h);
  const lead = f.size * 1.25;
  textSize(f.size);
  fill(0);
  if (centered) {
    textAlign(CENTER, CENTER);
    const top = y + h / 2 - (f.lines.length - 1) * lead / 2;
    for (let i = 0; i < f.lines.length; i++) text(f.lines[i], x + w / 2, top + i * lead);
  } else {
    textAlign(LEFT, TOP);
    for (let i = 0; i < f.lines.length; i++) text(f.lines[i], x, y + i * lead);
  }
}

// ---------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------
function wfHitTest(px, py) {
  for (let i = 0; i < wfNodes.length; i++) {
    const n = wfNodes[i];
    if (px >= n.x && px <= n.x + n.w && py >= n.y && py <= n.y + n.h) return i;
  }
  return -1;
}

// A click opens the page of the box that is already hovered/selected. On a touch screen the
// first tap only selects a box (and shows its description); a second tap opens the page.
function mousePressed() {
  const i = wfPointerAway ? -1 : wfHitTest(mouseX, mouseY);
  if (i !== -1 && i === wfHover && wfNodes[i].url) {
    window.open(wfNodes[i].url, '_blank', 'noopener');
  }
}

// ---------------------------------------------------------------------
// Responsive handling
// ---------------------------------------------------------------------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateLayout();
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
}
