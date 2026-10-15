// AI Pace Accelerating - Innovation Timeline MicroSim
// CANVAS_HEIGHT: 535
// https://editor.p5js.org/dmccreary/sketches/bN-pfoUih
// Canvas dimensions
let canvasWidth = 800;
let drawHeight = 440;
let controlHeight = 95;
let canvasHeight = drawHeight + controlHeight;
let margin = 25;
let sliderLeft = 150;
let defaultTextSize = 16;

// Timeline data, one entry per milestone (keep sorted by year; the sketch sorts a copy anyway)
let events = [
  { year: 1956, name: "Dartmouth Conference", description: "The term 'Artificial Intelligence' was first coined at this conference, marking the formal founding of AI as a field of research." },
  { year: 1966, name: "ELIZA", description: "Joseph Weizenbaum's ELIZA, one of the first natural language processing programs, simulated conversation using simple pattern matching." },
  { year: 1980, name: "Expert Systems", description: "Expert systems became commercially viable, using rule-based approaches to solve complex problems in specific domains such as medical diagnosis." },
  { year: 1990, name: "Machine Learning Focus", description: "The field shifted from rule-based systems toward machine learning approaches as computational power increased." },
  { year: 1997, name: "Deep Blue", description: "IBM's Deep Blue defeated world chess champion Garry Kasparov, demonstrating that AI could outperform humans in specific complex tasks." },
  { year: 2001, name: "Semantic Web", description: "Tim Berners-Lee published 'The Semantic Web' in Scientific American, proposing a machine-readable web of data." },
  { year: 2006, name: "Deep Learning Revival", description: "Geoffrey Hinton published research on deep neural networks, reigniting interest in deep learning approaches." },
  { year: 2011, name: "Watson Wins Jeopardy!", description: "IBM's Watson defeated human champions on Jeopardy!, showcasing advanced natural language processing capabilities." },
  { year: 2012, name: "AlexNet", description: "AlexNet dramatically improved image recognition accuracy in the ImageNet competition, triggering the deep learning revolution." },
  { year: 2014, name: "GANs Introduced", description: "Ian Goodfellow introduced Generative Adversarial Networks (GANs), enabling AI to create realistic synthetic data." },
  { year: 2016, name: "AlphaGo", description: "DeepMind's AlphaGo defeated world champion Lee Sedol at Go, a game with far more complexity than chess." },
  { year: 2017, name: "Transformer Architecture", description: "Google introduced the Transformer architecture in 'Attention Is All You Need', revolutionizing NLP tasks." },
  { year: 2018, name: "BERT", description: "Google released BERT (Bidirectional Encoder Representations from Transformers), significantly advancing NLP capabilities." },
  { year: 2020, name: "GPT-3", description: "OpenAI released GPT-3, demonstrating remarkable language generation abilities with 175 billion parameters." },
  { year: 2021, name: "DALL-E", description: "OpenAI introduced DALL-E, generating images from text descriptions with unprecedented quality." },
  { year: 2022, name: "ChatGPT", description: "OpenAI released ChatGPT, bringing conversational AI to the mainstream and accelerating AI adoption globally." },
  { year: 2023, name: "Llama Open Source", description: "Meta open-sourced the Llama LLM, democratizing access to powerful language models and spurring innovation." },
  { year: 2024, name: "Claude 3", description: "Anthropic released Claude 3, with breakthrough performance on reasoning, instruction following, and knowledge tasks." },
  { year: 2024, name: "Cursor", description: "Cursor AI coding assistant integrated reasoning capabilities to generate and explain code with unprecedented accuracy." },
  { year: 2025, name: "DeepSeek R1", description: "DeepSeek released R1, a research-focused model that advanced AI capabilities in reasoning and scientific understanding." },
  { year: 2025, name: "AI Coding Survey", description: "Y-Combinator survey revealed that 25% of startups use AI to generate over 95% of their code, marking a productivity revolution." },
  { year: 2025, name: "Codium LightSpeed", description: "Codium LightSpeed introduced AI that writes entire applications from verbal descriptions with minimal human intervention." },
  { year: 2025, name: "Vibe Coding", description: "Vibe Coding emerged as a paradigm where developers describe desired functionality using natural language, emotions, and aesthetic preferences." }
];

// Era colors (the same palette the sketch has always used); an event gets the first era whose
// "before" year is greater than its year.
const ERAS = [
  { before: 2000, label: 'Before 2000', color: [70, 130, 180] },
  { before: 2015, label: '2000-2014', color: [60, 179, 113] },
  { before: 2023, label: '2015-2022', color: [255, 140, 0] },
  { before: 99999, label: '2023 and later', color: [220, 20, 60] }
];

const LABEL_GAP = 8;        // px along the 45-degree diagonal between a circle's center and the start of its label
const MAX_EXPONENT = 3.5;   // exponent p at the right end of the slider (p = 1 at the left end)

// UI controls and state
let timeScaleSlider;
let hoverEvent = null;      // { event, x, y } of the milestone under the pointer, or null
let layoutRows = [];        // last computed layout, one row per event (also handy for testing)
let timeline = { startX: 100, endX: 700, axisY: 395, minYear: 1956, maxYear: 2025 };

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  events = events.slice().sort((a, b) => a.year - b.year);   // stable: ties keep their listed order

  // 0 = linear time axis, 100 = recent years expanded the most
  timeScaleSlider = createSlider(0, 100, 0, 1);
  positionControls();

  describe('An AI innovation timeline of ' + events.length + ' milestones from ' + events[0].year + ' to ' +
           events[events.length - 1].year + ' with stems colored by era. A slider changes the time axis from linear ' +
           'to one that expands the recent years, showing that the milestones cluster near the present. ' +
           'Hover over a milestone to read its description.');
}

function draw() {
  updateCanvasSize();
  if (width !== canvasWidth) resizeCanvas(canvasWidth, canvasHeight);

  // Drawing area
  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);

  // Controls area
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(0, drawHeight, canvasWidth, controlHeight);

  // Title
  fill('black');
  noStroke();
  textSize(titleSize());
  textAlign(CENTER, TOP);
  text('Accelerating Pace of AI Innovation', canvasWidth / 2, 12);

  const p = exponent();
  drawLegend();
  drawTimeline(p);
  drawControlLabels(p);

  if (hoverEvent !== null) drawEventInfo(hoverEvent);
}

// ---------------------------------------------------------------- layout

function exponent() {
  return 1 + (MAX_EXPONENT - 1) * timeScaleSlider.value() / 100;
}

function titleSize() {
  return constrain(canvasWidth / 22, 18, 28);
}

function labelFontSize() {
  return canvasWidth < 520 ? 10 : 12;
}

function eraOf(year) {
  for (const era of ERAS) if (year < era.before) return era;
  return ERAS[ERAS.length - 1];
}

// Bounding box of the era legend (top-left corner of the drawing area)
function legendBox() {
  textSize(14);
  let w = 0;
  for (const era of ERAS) w = Math.max(w, textWidth(eraLabel(era)));
  return { x: 10, y: Math.ceil(titleSize()) + 20, w: 24 + w, h: ERAS.length * 18 + 4 };
}

function eraLabel(era) {
  const n = events.filter(e => eraOf(e.year) === era).length;
  return era.label + ' (' + n + (n === 1 ? ' event)' : ' events)');
}

// Positions every event. Horizontal position is ((year - minYear) / span) ^ p. The stem height
// grows with time (a visual device, not data) and is pushed up just enough that the 45-degree
// name labels of neighbouring events do not run into each other.
function computeLayout(p) {
  const fs = labelFontSize();
  textSize(fs);
  const n = events.length;
  const minYear = events[0].year;
  const maxYear = events[n - 1].year;
  const span = maxYear - minYear;
  const lens = events.map(e => textWidth(e.name));
  const maxLen = Math.max(...lens);

  const startX = Math.ceil(8 + 0.707 * (maxLen + LABEL_GAP));   // room for the longest label slanting up-left
  const endX = canvasWidth - 22;
  const axisY = drawHeight - 45;
  timeline = { startX, endX, axisY, minYear, maxYear };

  const lg = legendBox();
  const topLimit = titleSize() + 22;                 // labels stay below the title
  const legendBottom = lg.y + lg.h + 6;

  const rows = events.map((e, i) => {
    const frac = (e.year - minYear) / span;
    const x = startX + (endX - startX) * Math.pow(frac, p);
    const baseH = 24 + (150 - 24) * Math.pow(frac, 1.5);
    const labelLeft = x - 0.707 * (lens[i] + LABEL_GAP);
    const limit = (labelLeft < lg.x + lg.w + 6) ? legendBottom : topLimit;
    return { event: e, x, baseH, len: lens[i], limit, h: baseH, tipY: 0 };
  });

  // gap = perpendicular distance (px) kept between neighbouring slanted labels
  function stack(gap) {
    let fits = true;
    for (let i = 0; i < rows.length; i++) {
      let h = rows[i].baseH;
      if (i > 0) h = Math.max(h, rows[i - 1].h + Math.max(0, gap * Math.SQRT2 - (rows[i].x - rows[i - 1].x)));
      rows[i].h = h;
      const labelTop = axisY - h - 0.707 * (rows[i].len + LABEL_GAP) - fs / 2;
      if (labelTop < rows[i].limit) fits = false;
    }
    return fits;
  }
  const gapMax = fs + 3;
  const gapMin = 8;
  if (!stack(gapMax)) {
    let lo = gapMin, hi = gapMax;
    for (let k = 0; k < 10; k++) {
      const mid = (lo + hi) / 2;
      if (stack(mid)) lo = mid; else hi = mid;
    }
    stack(lo);
  }
  for (const r of rows) r.tipY = axisY - r.h;
  layoutRows = rows;
  return rows;
}

function pickHover(rows) {
  if (mouseX < 0 || mouseX > canvasWidth || mouseY < 0 || mouseY > drawHeight) return null;
  let best = null;
  let bestScore = Infinity;
  for (const r of rows) {
    const d = dist(mouseX, mouseY, r.x, r.tipY);
    let score = null;
    if (d < 11) score = d;                                                            // on the circle
    else if (Math.abs(mouseX - r.x) < 6 && mouseY > r.tipY && mouseY < timeline.axisY) // on the stem
      score = 100 + Math.abs(mouseX - r.x) + (mouseY - r.tipY) * 0.01;
    if (score !== null && score < bestScore) { bestScore = score; best = r; }
  }
  return best ? { event: best.event, x: best.x, y: best.tipY } : null;
}

// ---------------------------------------------------------------- drawing

function drawLegend() {
  const lg = legendBox();
  textSize(14);
  textAlign(LEFT, CENTER);
  for (let i = 0; i < ERAS.length; i++) {
    const cy = lg.y + 10 + i * 18;
    stroke(ERAS[i].color);
    strokeWeight(2);
    fill(255);
    ellipse(lg.x + 8, cy, 10, 10);
    noStroke();
    fill(0);
    text(eraLabel(ERAS[i]), lg.x + 22, cy);
  }
}

function drawTimeline(p) {
  const rows = computeLayout(p);
  const { startX, endX, axisY, minYear, maxYear } = timeline;
  const span = maxYear - minYear;
  const xOf = year => startX + (endX - startX) * Math.pow((year - minYear) / span, p);

  // time axis
  stroke('black');
  strokeWeight(2);
  line(startX, axisY, endX, axisY);

  // year ticks every 5 years; labels are skipped where they would collide
  textSize(12);
  textAlign(CENTER, TOP);
  const labelled = [];
  function tickLabel(year) {
    const x = xOf(year);
    if (labelled.some(lx => Math.abs(lx - x) < 34)) return;
    labelled.push(x);
    noStroke();
    fill('black');
    text(year, x, axisY + 10);
  }
  tickLabel(minYear);
  tickLabel(maxYear);
  for (let year = Math.ceil(minYear / 5) * 5; year <= maxYear; year += 5) {
    const x = xOf(year);
    stroke('black');
    strokeWeight(1);
    line(x, axisY, x, axisY + 5);
    tickLabel(year);
  }
  stroke('black');
  strokeWeight(1);
  line(startX, axisY, startX, axisY + 5);
  line(endX, axisY, endX, axisY + 5);

  // hover first, so the highlighted circle can be drawn larger
  hoverEvent = pickHover(rows);

  // events: stem, circle, then the slanted name label
  const fs = labelFontSize();
  for (const r of rows) {
    const c = eraOf(r.event.year).color;
    const hot = hoverEvent !== null && hoverEvent.event === r.event;

    stroke(c);
    strokeWeight(2);
    line(r.x, axisY, r.x, r.tipY);
    fill(hot ? color(c[0], c[1], c[2]) : 255);
    ellipse(r.x, r.tipY, hot ? 14 : 10, hot ? 14 : 10);

    push();
    translate(r.x - 0.707 * LABEL_GAP, r.tipY - 0.707 * LABEL_GAP);
    rotate(PI / 4);                  // text slants down to the right and ends at its circle
    fill('black');
    noStroke();
    textSize(fs);
    textAlign(RIGHT, CENTER);
    text(r.event.name, 0, 0);
    pop();
  }
}

function drawEventInfo(info) {
  const e = info.event;
  const boxW = Math.min(320, canvasWidth - 16);
  textSize(14);
  const lines = wrapText(e.description, boxW - 20);
  const lineH = 18;
  const boxH = 10 + 24 + lines.length * lineH + 8;

  let boxX = info.x + 20;
  if (boxX + boxW > canvasWidth - 8) boxX = info.x - boxW - 20;
  boxX = constrain(boxX, 8, canvasWidth - boxW - 8);
  let boxY = constrain(info.y - 20, 8, drawHeight - boxH - 8);

  fill(255, 255, 220);
  stroke(100);
  strokeWeight(1);
  rect(boxX, boxY, boxW, boxH, 5);

  fill(0);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(18);
  text(e.name + ' (' + e.year + ')', boxX + 10, boxY + 10);
  textSize(14);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], boxX + 10, boxY + 36 + i * lineH);
  }
}

// Greedy word wrap using the current text size.
function wrapText(str, maxW) {
  const lines = [];
  let line = '';
  for (const word of str.split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (!line || textWidth(test) <= maxW) line = test;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function drawControlLabels(p) {
  const span = timeline.maxYear - timeline.minYear;
  fill('black');
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(defaultTextSize);
  text('Time-axis scale:', margin, drawHeight + 22);
  textSize(14);
  text('Linear', sliderLeft, drawHeight + 50);
  textAlign(RIGHT, CENTER);
  text(canvasWidth < 480 ? 'Recent expanded' : 'Recent years expanded', canvasWidth - margin, drawHeight + 50);
  textAlign(LEFT, CENTER);
  text('Position = ((year − ' + timeline.minYear + ') / ' + span + ')^p,   p = ' + p.toFixed(2), margin, drawHeight + 76);
}

// ---------------------------------------------------------------- sizing

function positionControls() {
  if (!timeScaleSlider) return;
  timeScaleSlider.position(sliderLeft, drawHeight + 12);
  timeScaleSlider.size(canvasWidth - sliderLeft - margin);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = Math.floor(container.getBoundingClientRect().width);
  positionControls();
}
