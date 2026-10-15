// Huffman Coding MicroSim
// CANVAS_HEIGHT: 750
// Builds a Huffman code one merge at a time: the two least-probable nodes are combined until a
// single tree remains, and every merge puts one more bit (0 = left, 1 = right) in front of the
// codeword of each symbol below it. Read-outs compare the average code length L with the
// entropy H, the fixed-length code and the bound H <= L < H + 1, and the message in the text
// box is encoded into a bit stream and decoded again by walking down the tree.

// Canvas dimensions
let canvasWidth = 900;               // overwritten from the container in updateCanvasSize()
let drawHeight = 640;
let controlHeight = 110;
let canvasHeight = drawHeight + controlHeight;
let margin = 10;
let defaultTextSize = 16;

// Controls
let sourceSelect, textInput;
let nextButton, buildButton, undoButton, resetButton;

const MAX_CHARS = 30;

// Probability sources. Weights are integers so that equal weights compare exactly.
// English: approximate letter counts per 1000 letters of English text.
const SOURCES = [
  { key: 'skewed',  label: 'Skewed: 5 symbols', symbols: 'ABCDE', weights: [40, 20, 20, 10, 10],
    unit: 'p', dec: 1, sample: 'ACABADABCE', note: 'p = 0.4, 0.2, 0.2, 0.1, 0.1 (preset)' },
  { key: 'dyadic',  label: 'Powers of 1/2: 5 symbols', symbols: 'ABCDE', weights: [8, 4, 2, 1, 1],
    unit: 'frac', sample: 'ABACABADABACABAE', note: 'p = 1/2, 1/4, 1/8, 1/16, 1/16 (preset)' },
  { key: 'uniform', label: 'Uniform: 8 symbols', symbols: 'ABCDEFGH', weights: [1, 1, 1, 1, 1, 1, 1, 1],
    unit: 'frac', sample: 'ABCDEFGH', note: 'p = 1/8 for each of A–H (preset)' },
  { key: 'binary',  label: 'Two symbols: 0.9 and 0.1', symbols: 'AB', weights: [9, 1],
    unit: 'p', dec: 1, sample: 'AAAABAAAAA', note: 'p = 0.9, 0.1 (preset)' },
  { key: 'english', label: 'English letters A–Z', symbols: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    weights: [82, 15, 28, 42, 127, 22, 20, 61, 70, 1, 8, 40, 24, 67, 75, 19, 1, 60, 63, 91, 28, 10, 24, 1, 20, 1],
    unit: 'count', sample: 'SHANNON', note: 'n = typical count per 1000 letters (preset)' },
  { key: 'text',    label: 'Count the characters of my message', unit: 'count',
    note: 'p = count / N, counted from the message' }
];

// Colors
const COL_TREE = [25, 90, 200];      // tree edges and merged nodes: blue
const COL_CODE = [128, 0, 0];        // codewords and L: maroon
const COL_H = [30, 130, 70];         // entropy and ideal length: green
const COL_FIXED = [115, 115, 115];   // fixed-length code: gray
const COL_GOLD = [218, 165, 0];      // next merge / newest merge: gold
const COL_GOLD_TEXT = [150, 105, 0];
const COL_ERR = [205, 35, 35];       // skipped characters, warnings: red
const COL_ALT = [[128, 0, 0], [25, 90, 200]];   // alternate codewords in the bit stream
const MONO = 'Courier New, Courier, monospace';
const SANS = 'Arial, Helvetica, sans-serif';

// State
let srcKey = 'skewed';
let userText = 'MISSISSIPPI';      // last message typed in "count my message" mode
let model = null;                  // the finished Huffman tree for the current source
let step = 0;                      // number of merges shown (0 .. K - 1)
let hoverLeaf = null;
let lay = {};
let ctl = { noteX0: 380, noteX1: 400, noteX2: 340 };
let layoutWidth = -1;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);
  textFont(SANS);
  frameRate(30);

  sourceSelect = createSelect();
  for (const s of SOURCES) sourceSelect.option(s.label, s.key);
  sourceSelect.selected('skewed');
  sourceSelect.style('font-size', '15px');
  sourceSelect.changed(onSourceChanged);

  textInput = createInput(SOURCES[0].sample, 'text');
  textInput.attribute('maxlength', String(MAX_CHARS));
  textInput.style('font-size', '15px');
  textInput.input(onTextInput);

  nextButton = createButton('Next merge');
  buildButton = createButton('Build tree');
  undoButton = createButton('Undo');
  resetButton = createButton('Reset');
  for (const b of [nextButton, buildButton, undoButton, resetButton]) b.style('font-size', '15px');
  nextButton.mouseClicked(() => { if (model) step = Math.min(step + 1, model.merges.length); });
  buildButton.mouseClicked(() => { if (model) step = model.merges.length; });
  undoButton.mouseClicked(() => { step = Math.max(step - 1, 0); });
  resetButton.mouseClicked(() => { step = 0; });

  rebuild(true);
  layoutControls();
  describe('A Huffman tree is built one merge at a time. Symbols sit in a row of circles with a table below ' +
    'listing each probability, the ideal length minus log2 p, the codeword and its length. Each press of Next merge ' +
    'joins the two least-probable nodes (ringed in gold) and adds one bit to the codeword of every symbol below them. ' +
    'A side panel compares the entropy H, the average code length L, the efficiency H/L and a fixed-length code, and ' +
    'the bottom panel encodes the message in the text box into a bit stream and decodes it again.');
}

function draw() {
  updateCanvasSize();
  computeLayout();

  // Drawing region and control region
  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  drawHeader();
  drawTreePanel();
  drawStatsPanel();
  drawEncodePanel();
  drawControlLabels();
}

// ---------------------------------------------------------------- model

function currentSource() { return SOURCES.find(s => s.key === srcKey) || SOURCES[0]; }
function isComplete() { return !!model && step >= model.merges.length; }

function onSourceChanged() {
  const wasComplete = isComplete();
  if (srcKey === 'text') userText = textInput.value();
  srcKey = sourceSelect.value();
  const src = currentSource();
  textInput.value(src.key === 'text' ? userText : src.sample);
  rebuild(wasComplete);
}

function onTextInput() {
  if (srcKey !== 'text') return;       // presets: the message is only re-encoded (read every frame)
  const keep = isComplete() || !model;
  userText = textInput.value();
  rebuild(keep);
}

function rebuild(complete) {
  const src = currentSource();
  if (src.key === 'text') {
    const chars = Array.from(textInput.value());
    if (chars.length === 0) { model = null; step = 0; return; }
    const counts = new Map();
    for (const c of chars) counts.set(c, (counts.get(c) || 0) + 1);
    const syms = [...counts.keys()];
    model = buildModel(syms, syms.map(s => counts.get(s)), 'count', 0);
  } else {
    model = buildModel(Array.from(src.symbols), src.weights, src.unit, src.dec || 0);
  }
  step = complete ? model.merges.length : 0;
}

function cmpSym(a, b) { return a < b ? -1 : (a > b ? 1 : 0); }

// Huffman's algorithm with a deterministic tie rule: the smallest weight is taken first; among
// equal weights single symbols come before merged nodes, symbols in alphabetical (code point)
// order and merged nodes in the order they were made. The first node taken becomes the left
// child (bit 0), the second the right child (bit 1).
function buildModel(symbols, weights, unit, dec) {
  const K = symbols.length;
  const W = weights.reduce((a, b) => a + b, 0);
  const order = symbols.map((s, i) => i).sort((a, b) => cmpSym(symbols[a], symbols[b]));
  const leaves = order.map((i, rank) => ({ sym: symbols[i], w: weights[i], key: rank, leaf: true, step: 0, h: 0, parent: null }));
  const merges = [];
  let queue = leaves.slice();
  let key = K;
  while (queue.length > 1) {
    queue.sort((a, b) => (a.w - b.w) || (a.key - b.key));
    const a = queue[0], b = queue[1];
    const tie = queue.length > 2 && queue[2].w === b.w;
    queue = queue.slice(2);
    const n = { w: a.w + b.w, key: key++, leaf: false, step: merges.length + 1, left: a, right: b,
                h: Math.max(a.h, b.h) + 1, parent: null, tie: tie };
    a.parent = n; a.bit = '0';
    b.parent = n; b.bit = '1';
    merges.push(n);
    queue.push(n);
  }
  const root = queue[0];

  // codewords, and the merge steps at which each ancestor of a leaf appears (bottom-up)
  let maxLen = 1;
  for (const lf of leaves) {
    let code = '';
    const steps = [];
    for (let n = lf; n.parent; n = n.parent) { code = n.bit + code; steps.push(n.parent.step); }
    lf.code = K === 1 ? '0' : code;
    lf.ancSteps = steps;
    maxLen = Math.max(maxLen, lf.code.length);
  }

  // in-order leaf order: every subtree occupies neighbouring columns, so no edges cross
  const inorder = [];
  (function walk(n) { if (n.leaf) inorder.push(n); else { walk(n.left); walk(n.right); } })(root);
  inorder.forEach((lf, i) => { lf.col = i; });
  for (const m of merges) {
    m.leafSet = [];
    (function walk(n) { if (n.leaf) m.leafSet.push(n); else { walk(n.left); walk(n.right); } })(m);
  }

  let H = 0, Lw = 0;                   // Lw = sum of w_i * l_i, an exact integer
  for (const lf of leaves) {
    const p = lf.w / W;
    lf.p = p;
    lf.ideal = -Math.log2(p);
    H -= p * Math.log2(p);
    Lw += lf.w * lf.code.length;
  }
  const L = Lw / W;
  let F = 0;
  while ((1 << F) < K) F++;
  F = Math.max(1, F);
  const bySym = new Map(leaves.map(lf => [lf.sym, lf]));
  return { K, W, unit, dec, leaves, inorder, merges, root, H: Math.abs(H), L, Lw, F, maxH: root.h, maxLen, bySym };
}

// codeword bits known after `s` merges: the last m bits, one per ancestor made so far
function partialCode(lf, s) {
  if (model.K === 1) return '0';
  let m = 0;
  for (const st of lf.ancSteps) if (st <= s) m++;
  return lf.code.slice(lf.code.length - m);
}

// average length after s merges = sum of the weights of the nodes merged so far
function lSoFar(s) {
  if (model.K === 1) return 1;
  let sum = 0;
  for (let i = 0; i < s; i++) sum += model.merges[i].w;
  return sum / model.W;
}

function gcd(a, b) { while (b) { [a, b] = [b, a % b]; } return a; }

function wStr(w) {
  if (model.unit === 'count') return String(w);
  if (model.unit === 'frac') {
    if (w === model.W) return '1';
    const g = gcd(w, model.W);
    return (w / g) + '/' + (model.W / g);
  }
  return (w / model.W).toFixed(model.dec);
}

function symDisp(s) { return s === ' ' ? '␣' : s; }

function nodeName(n) {
  if (n.leaf) return symDisp(n.sym);
  const s = n.leafSet.map(lf => symDisp(lf.sym)).join('');
  return s.length <= 6 ? s : s.slice(0, 5) + '…';
}

// message characters: in preset modes only the preset alphabet is encoded (letters as capitals)
function messageItems() {
  const chars = Array.from(textInput.value());
  const items = [];
  for (const c of chars) {
    const sym = srcKey === 'text' ? c : c.toUpperCase();
    items.push({ ch: c, lf: model ? (model.bySym.get(sym) || null) : null });
  }
  return items;
}

// walk down the tree: 0 = left, 1 = right; emit a symbol at every leaf and restart at the root
function decodeBits(bits) {
  let out = '';
  if (model.K === 1) {
    for (let i = 0; i < bits.length; i++) out += model.root.sym;
    return out;
  }
  let n = model.root;
  for (const b of bits) {
    n = b === '0' ? n.left : n.right;
    if (n.leaf) { out += n.sym; n = model.root; }
  }
  return out;
}

// ---------------------------------------------------------------- layout

function computeLayout() {
  const w = canvasWidth;
  lay.wide = w >= 680;
  if (lay.wide) {
    const split = Math.round(w * 0.64);
    lay.tree = { x0: 8, x1: split, y0: 74, y1: 486 };
    lay.stats = { x0: split + 10, x1: w - 8, y0: 74, y1: 486 };
    lay.enc = { x0: 8, x1: w - 8, y0: 496, y1: drawHeight - 8 };
  } else {
    lay.tree = { x0: 4, x1: w - 4, y0: 74, y1: 384 };
    lay.stats = { x0: 4, x1: w - 4, y0: 390, y1: 462 };
    lay.enc = { x0: 4, x1: w - 4, y0: 468, y1: drawHeight - 6 };
  }
}

function panel(P) {
  fill(255);
  stroke(200);
  strokeWeight(1);
  rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0, 6);
}

// ---------------------------------------------------------------- header

function drawHeader() {
  noStroke();
  fill('black');
  textStyle(BOLD);
  fitText(['Huffman Coding: Build the Tree, Compare L with H', 'Huffman Coding'],
          canvasWidth / 2, 16, canvasWidth - 20, 20, CENTER);
  textStyle(NORMAL);

  const x = margin, maxW = canvasWidth - 2 * margin;
  if (!model) {
    fill(COL_ERR);
    fitText(['Type a message (up to ' + MAX_CHARS + ' characters) to count its characters.', 'Type a message below.'],
            x, 41, maxW, 15, LEFT);
    return;
  }
  const K = model.K, nm = model.merges.length;
  if (K === 1) {
    fill(40);
    fitText(['Only one distinct symbol: no merges are needed. It gets the 1-bit code 0, and H = 0.',
             'One symbol: code 0, H = 0.'], x, 41, maxW, 15, LEFT);
    return;
  }
  let l1, l2 = null;
  fill(40);
  if (step === 0) {
    l1 = ['K = ' + K + ' symbols, so the tree needs K − 1 = ' + nm + ' merges. Each merge joins the two least-probable nodes.',
          'K = ' + K + ' symbols: the tree needs ' + nm + ' merges.',
          K + ' symbols, ' + nm + ' merges'];
  } else if (step < nm) {
    const m = model.merges[step - 1];
    const what = nodeName(m.left) + ' (' + wStr(m.left.w) + ') + ' + nodeName(m.right) + ' (' + wStr(m.right.w) + ') → ' + wStr(m.w);
    l1 = ['Merge ' + step + ' of ' + nm + ': ' + what + '. Every symbol below it gains one bit (0 left, 1 right).',
          'Merge ' + step + ' of ' + nm + ': ' + what + '; one more bit below it.',
          'Merge ' + step + '/' + nm + ': ' + what];
  } else {
    const ms = nm === 1 ? ' merge' : ' merges';
    l1 = ['Tree complete after ' + nm + ms + '. Read each codeword from the root down: 0 = left branch, 1 = right branch.',
          'Tree complete: read codes from the root, 0 = left, 1 = right.',
          'Complete: 0 = left, 1 = right'];
    l2 = ['No codeword is the beginning of another (prefix-free), so the bit stream below needs no separators.',
          'Prefix-free: the bit stream needs no separators.',
          'Prefix-free code'];
  }
  fitText(l1, x, 41, maxW, 15, LEFT);
  if (step < nm) {
    const m = model.merges[step];
    const nx = nodeName(m.left) + ' (' + wStr(m.left.w) + ') + ' + nodeName(m.right) + ' (' + wStr(m.right.w) + ')';
    l2 = m.tie
      ? ['Next merge (gold rings): ' + nx + '. Tie rule: single symbols first, then A–Z, then the oldest merged node.',
         'Next merge (gold rings): ' + nx + '. Tie rule: symbols first, then A–Z, then oldest node.',
         'Next (gold): ' + nx + ' by the tie rule',
         'Next: ' + nx]
      : ['Next merge (gold rings): ' + nx + ', the two smallest weights.',
         'Next merge (gold rings): ' + nx,
         'Next: ' + nx];
    fill(COL_GOLD_TEXT);
    textStyle(BOLD);
  } else {
    fill(40);
  }
  fitText(l2, x, 61, maxW, 15, LEFT);
  textStyle(NORMAL);
}

// ---------------------------------------------------------------- tree panel

function drawTreePanel() {
  const T = lay.tree;
  panel(T);
  hoverLeaf = null;
  if (!model) {
    noStroke();
    fill(90);
    textAlign(CENTER, CENTER);
    textSize(15);
    text('No symbols yet', (T.x0 + T.x1) / 2, (T.y0 + T.y1) / 2);
    return;
  }
  const K = model.K, nm = model.merges.length;
  const done = isComplete();
  const labelW = lay.wide ? 56 : 50;
  const gx0 = T.x0 + labelW, gx1 = T.x1 - 4;
  const cw = (gx1 - gx0) / K;
  const colX = i => gx0 + (i + 0.5) * cw;
  const fs = cw >= 34 ? 14 : (cw >= 22 ? 13 : 12);

  // panel title
  noStroke();
  fill(40);
  textStyle(BOLD);
  const title = done ? 'Huffman tree and code table' : 'Huffman tree: ' + step + ' of ' + nm + ' merges done';
  fitText([title + (model.unit === 'count' ? '   (n = count)' : ''), title], T.x0 + 8, T.y0 + 13, T.x1 - T.x0 - 16, 14, LEFT);
  textStyle(NORMAL);

  // table rows, laid out from the FINAL codes so nothing moves while the tree is built
  const rows = buildRows(fs, cw);
  let treeTop = T.y0 + 46;
  let r = constrain(cw * 0.42, 4, 15);
  let tableH = rows.reduce((s, row) => s + row.h + 2, 0);
  let leafY = T.y1 - 6 - tableH - r - 8;
  let dy = model.maxH > 0 ? (leafY - treeTop) / model.maxH : 0;
  if (dy < 17 && rows.length === 4 && model.maxH > 0) {             // too little room: drop the -log2 p row
    rows.splice(1, 1);
    tableH = rows.reduce((s, row) => s + row.h + 2, 0);
    leafY = T.y1 - 6 - tableH - r - 8;
    dy = model.maxH > 0 ? (leafY - treeTop) / model.maxH : 0;
  }
  dy = Math.min(dy, 110);
  const tableTop = T.y1 - 6 - tableH;

  // node positions
  for (const lf of model.leaves) { lf.px = colX(lf.col); lf.py = leafY; }
  for (const m of model.merges) {               // children are always made before parents
    m.px = (m.left.px + m.right.px) / 2;
    m.py = leafY - m.h * dy;
  }

  // hover: a leaf, or its column in the table
  if (mouseY >= leafY - r - 4 && mouseY <= T.y1 && mouseX >= gx0 && mouseX < gx1) {
    const c = Math.floor((mouseX - gx0) / cw);
    if (c >= 0 && c < K) hoverLeaf = model.inorder[c];
  }
  const pathSet = new Set();
  if (hoverLeaf) {
    for (let n = hoverLeaf; n.parent && n.parent.step <= step; n = n.parent) pathSet.add(n);
  }

  const newest = (step >= 1 && !done) ? model.merges[step - 1] : null;   // gold = the merge just made
  const next = step < nm ? model.merges[step] : null;
  const showBits = cw >= 18 && dy >= 26;

  // edges
  for (const m of model.merges) {
    if (m.step > step) continue;
    for (const ch of [m.left, m.right]) {
      let col = COL_TREE, wgt = 2;
      if (pathSet.has(ch)) { col = COL_CODE; wgt = 4; }
      else if (m === newest) { col = COL_GOLD; wgt = 3.5; }
      stroke(col[0], col[1], col[2]);
      strokeWeight(wgt);
      line(m.px, m.py, ch.px, ch.py);
    }
  }
  // bit labels on the edges, near the parent (white discs first, so no label hides another)
  if (showBits) {
    const labels = [];
    for (const m of model.merges) {
      if (m.step > step) continue;
      for (const ch of [m.left, m.right]) {
        const len = Math.max(Math.hypot(ch.px - m.px, ch.py - m.py), 1);
        const d = Math.min(len * 0.5, Math.max(14, len * 0.3));    // distance from the parent
        labels.push({ x: m.px + (ch.px - m.px) * d / len, y: m.py + (ch.py - m.py) * d / len,
                      bit: ch.bit, c: pathSet.has(ch) ? COL_CODE : (m === newest ? COL_GOLD_TEXT : COL_TREE) });
      }
    }
    noStroke();
    fill(255);
    for (const lb of labels) circle(lb.x, lb.y, 12);
    textSize(12);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    for (const lb of labels) { fill(lb.c[0], lb.c[1], lb.c[2]); text(lb.bit, lb.x, lb.y + 0.5); }
    textStyle(NORMAL);
  }

  // merged nodes with their weights
  const ri = constrain(cw * 0.2, 3.5, 7);
  const showW = cw >= 26;
  for (const m of model.merges) {
    if (m.step > step) continue;
    const isNew = m === newest;
    const onPath = hoverLeaf && m.step <= step && hoverLeaf.ancSteps.includes(m.step) && isAncestor(m, hoverLeaf);
    noStroke();
    const c = onPath ? COL_CODE : (isNew ? COL_GOLD : COL_TREE);
    fill(c[0], c[1], c[2]);
    circle(m.px, m.py, 2 * ri + (isNew ? 3 : 0));
    if (next && (m === next.left || m === next.right)) goldRing(m.px, m.py, ri + 6);
    if (showW || isNew || m === model.root) {
      const s = wStr(m.w);
      textSize(13);
      textStyle(isNew ? BOLD : NORMAL);
      const tc = isNew ? COL_GOLD_TEXT : [70, 70, 70];
      fill(tc[0], tc[1], tc[2]);
      // put the label on the side away from the edge that comes in from the parent
      const ringed = next && (m === next.left || m === next.right);
      if (!m.parent || m.parent.step > step) { textAlign(CENTER, BOTTOM); text(s, m.px, m.py - ri - (ringed ? 10 : 3)); }
      else if (m.bit === '0') { textAlign(RIGHT, BOTTOM); text(s, m.px - ri - 2, m.py - 2); }
      else { textAlign(LEFT, BOTTOM); text(s, m.px + ri + 2, m.py - 2); }
      textStyle(NORMAL);
    }
  }

  // leaves
  const symSize = constrain(r * 1.15, 9, 16);
  for (const lf of model.leaves) {
    const onPath = lf === hoverLeaf;
    stroke(onPath ? COL_CODE[0] : COL_TREE[0], onPath ? COL_CODE[1] : COL_TREE[1], onPath ? COL_CODE[2] : COL_TREE[2]);
    strokeWeight(onPath ? 3 : 2);
    fill(onPath ? color(255, 236, 236) : 255);
    circle(lf.px, lf.py, 2 * r);
    if (next && (lf === next.left || lf === next.right)) goldRing(lf.px, lf.py, r + 5);
    noStroke();
    fill(0);
    textSize(symSize);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(symDisp(lf.sym), lf.px, lf.py + 1);
    textStyle(NORMAL);
  }

  // table
  stroke(225);
  strokeWeight(1);
  line(T.x0 + 6, tableTop - 3, T.x1 - 6, tableTop - 3);
  let y = tableTop;
  for (const row of rows) {
    drawRow(row, y, colX, cw, newest);
    y += row.h + 2;
  }
}

function isAncestor(m, lf) {
  for (let n = lf.parent; n; n = n.parent) if (n === m) return true;
  return false;
}

function goldRing(x, y, rr) {
  noFill();
  stroke(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  strokeWeight(3);
  circle(x, y, 2 * rr);
}

// rows: weight, ideal length -log2 p, codeword, length. mode h = horizontal, r = rotated (reads downward)
function buildRows(fs, cw) {
  const lv = model.inorder;
  const rows = [
    { key: 'w', label: model.unit === 'count' ? 'n' : 'p', col: [50, 50, 50], vals: lv.map(lf => wStr(lf.w)), mono: false },
    { key: 'ideal', label: '−log₂p', col: COL_H, vals: lv.map(lf => lf.ideal.toFixed(2)), mono: false },
    { key: 'code', label: 'code', col: COL_CODE, vals: lv.map(lf => lf.code), mono: true },
    { key: 'len', label: 'ℓ', col: COL_CODE, vals: lv.map(lf => String(lf.code.length)), mono: false }
  ];
  for (const row of rows) {
    textFont(row.mono ? MONO : SANS);
    textSize(fs);
    if (row.mono) textStyle(BOLD);
    let mw = 0;
    for (const v of row.vals) mw = Math.max(mw, advW(v));
    textStyle(NORMAL);
    row.fs = fs;
    if (mw <= cw - 3) { row.mode = 'h'; row.h = fs + 6; }
    else { row.mode = 'r'; row.h = Math.ceil(mw) + 8; }
  }
  textFont(SANS);
  return rows;
}

function drawRow(row, y, colX, cw, newest) {
  // row label
  noStroke();
  fill(row.col[0], row.col[1], row.col[2]);
  textFont(SANS);
  textSize(lay.wide ? 13 : 12);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text(row.label, lay.tree.x0 + 6, row.mode === 'h' ? y + row.h / 2 : y + 10);
  textStyle(NORMAL);

  textSize(row.fs);
  for (const lf of model.inorder) {
    let s = row.key === 'w' ? wStr(lf.w) : (row.key === 'ideal' ? lf.ideal.toFixed(2) : '');
    if (row.key === 'code') s = partialCode(lf, step);
    if (row.key === 'len') s = String(partialCode(lf, step).length);
    const x = colX(lf.col);
    const isNewBit = row.key === 'code' && newest && step < model.merges.length + 1 && lf.ancSteps.includes(newest.step) && s.length > 0;
    if (row.key === 'code') {
      textFont(MONO);
      textStyle(BOLD);
      const chW = advW('0');
      for (let j = 0; j < s.length; j++) {
        let cx, cy;
        if (row.mode === 'h') { cx = x - s.length * chW / 2 + (j + 0.5) * chW; cy = y + row.h / 2; }
        else { cx = x; cy = y + 4 + (j + 0.5) * chW; }
        if (j === 0 && isNewBit) {
          noStroke();
          fill(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2], 150);
          rectMode(CENTER);
          rect(cx, cy, chW + 2, row.mode === 'h' ? row.fs + 3 : chW + 2, 2);
          rectMode(CORNER);
        }
        fill(row.col[0], row.col[1], row.col[2]);
        textAlign(CENTER, CENTER);
        if (row.mode === 'h') text(s[j], cx, cy);
        else { push(); translate(cx, cy); rotate(HALF_PI); text(s[j], 0, 0); pop(); }
      }
      textStyle(NORMAL);
      textFont(SANS);
    } else {
      fill(row.col[0], row.col[1], row.col[2]);
      if (row.mode === 'h') { textAlign(CENTER, CENTER); text(s, x, y + row.h / 2); }
      else { push(); translate(x, y + 4); rotate(HALF_PI); textAlign(LEFT, CENTER); text(s, 0, 0); pop(); }
    }
  }
}

// ---------------------------------------------------------------- stats panel

function drawStatsPanel() {
  const S = lay.stats;
  panel(S);
  if (!model) return;
  const done = isComplete();
  const K = model.K, H = model.H, F = model.F;
  const L = done ? model.L : lSoFar(step);
  const x = S.x0 + 12, maxW = S.x1 - S.x0 - 24;
  const nm = model.merges.length;
  noStroke();

  const hS = H.toFixed(3), lS = L.toFixed(3);
  const effS = (100 * H / L).toFixed(1) + ' %';
  const ratioS = (F * model.W / model.Lw).toFixed(2);     // F / L from exact integers
  const boundOK = H <= L + 1e-12 && L < H + 1 - 1e-12;

  if (!lay.wide) {
    // compact: three lines
    let y = S.y0 + 14;
    fill(COL_H);
    textStyle(BOLD);
    const lPart = done ? 'L = ' + lS : 'L so far = ' + lS;
    const effPart = done ? ',  H/L = ' + effS : '';
    fitText(['H = ' + hS + ' bits/symbol,  ' + lPart + effPart, 'H = ' + hS + ', ' + lPart + effPart, 'H = ' + hS + ', ' + lPart],
            x, y, maxW, 14, LEFT);
    y += 22;
    textStyle(NORMAL);
    fill(COL_FIXED);
    fitText(['Fixed length: ⌈log₂ ' + K + '⌉ = ' + F + ' bit' + (F > 1 ? 's' : '') + '/symbol' + (done ? ',  ratio ' + F + '/L = ' + ratioS : ''),
             'Fixed ' + F + (F > 1 ? ' bits' : ' bit') + (done ? ', ratio ' + ratioS : '')], x, y, maxW, 14, LEFT);
    y += 22;
    drawBoundLine(x, y, maxW, 14, done, boundOK, hS, lS, H);
    return;
  }

  let y = S.y0 + 16;
  fill(40);
  textStyle(BOLD);
  fitText(['Average length vs entropy', 'L vs H'], x, y, maxW, 15, LEFT);
  textStyle(NORMAL);
  y += 26;
  fill(COL_H);
  fitText(['Entropy  H = −Σ p_i log₂ p_i', 'H = −Σ p_i log₂ p_i', 'Entropy H'], x, y, maxW, 15, LEFT);
  y += 20;
  textStyle(BOLD);
  fitText(['= ' + hS + ' bits/symbol', '= ' + hS], x + 14, y, maxW - 14, 15, LEFT);
  textStyle(NORMAL);
  y += 26;
  fill(COL_CODE);
  fitText(['Average length  L = Σ p_i ℓ_i', 'L = Σ p_i ℓ_i', 'Length L'], x, y, maxW, 15, LEFT);
  y += 20;
  textStyle(BOLD);
  if (done) fitText(['= ' + lS + ' bits/symbol', '= ' + lS], x + 14, y, maxW - 14, 15, LEFT);
  else fitText(['= ' + lS + ' so far (' + step + ' of ' + nm + ' merges)', '= ' + lS + ' so far'], x + 14, y, maxW - 14, 15, LEFT);
  textStyle(NORMAL);
  y += 20;
  if (!done) {
    fill(90);
    fitText(['(each merge adds its probability to L)', '(+ merged p per merge)'], x + 14, y, maxW - 14, 13, LEFT);
  }
  y += 24;
  fill(40);
  if (done) fitText(['Efficiency  H / L = ' + effS, 'H / L = ' + effS], x, y, maxW, 15, LEFT);
  else fitText(['Efficiency H / L: finish the tree', 'H / L: finish the tree'], x, y, maxW, 15, LEFT);
  y += 26;
  fill(COL_FIXED);
  fitText(['Fixed-length code: ⌈log₂ ' + K + '⌉ = ' + F + ' bit' + (F > 1 ? 's' : '') + '/symbol',
           'Fixed length ⌈log₂ ' + K + '⌉ = ' + F + (F > 1 ? ' bits' : ' bit'), 'Fixed: ' + F + (F > 1 ? ' bits' : ' bit')], x, y, maxW, 15, LEFT);
  y += 22;
  if (done) fitText(['Compression ratio  ' + F + ' / L = ' + ratioS, 'Ratio ' + F + ' / L = ' + ratioS], x, y, maxW, 15, LEFT);
  y += 26;
  drawBoundLine(x, y, maxW, 15, done, boundOK, hS, lS, H);

  drawBars(S, H, L, F, done, y + 30);
}

function drawBoundLine(x, y, maxW, sz, done, boundOK, hS, lS, H) {
  if (model.K === 1) {
    fill(COL_ERR);
    fitText(['One symbol: H = 0 but a code needs at least 1 bit, so H ≤ L < H + 1 needs K ≥ 2',
             'K = 1: the bound needs K ≥ 2'], x, y, maxW, sz, LEFT);
    return;
  }
  if (!done) {
    fill(90);
    fitText(['Huffman guarantees H ≤ L < H + 1 = ' + (H + 1).toFixed(3), 'Goal: H ≤ L < H + 1'], x, y, maxW, sz, LEFT);
    return;
  }
  const c = boundOK ? COL_H : COL_ERR;
  fill(c[0], c[1], c[2]);
  textStyle(BOLD);
  fitText(['H ≤ L < H + 1:  ' + hS + ' ≤ ' + lS + ' < ' + (H + 1).toFixed(3) + (boundOK ? '  ✓' : '  ✗'),
           hS + ' ≤ ' + lS + ' < ' + (H + 1).toFixed(3) + (boundOK ? ' ✓' : ' ✗')], x, y, maxW, sz, LEFT);
  textStyle(NORMAL);
}

// horizontal bars on one bits-per-symbol axis, with the band H <= L < H + 1 behind the L bar
function drawBars(S, H, L, F, done, top) {
  if (top + 138 > S.y1) return;
  const x0 = S.x0 + 58, x1 = S.x1 - 46;
  const maxV = Math.max(F, Math.ceil(H + 1), Math.ceil(L));
  const vx = v => x0 + (x1 - x0) * v / maxV;
  noStroke();
  fill(40);
  textStyle(BOLD);
  textSize(14);
  textAlign(LEFT, CENTER);
  text('bits per symbol', S.x0 + 12, top);
  textStyle(NORMAL);
  const bars = [
    { lab: 'H', v: H, col: COL_H },
    { lab: done ? 'L' : 'L so far', v: L, col: COL_CODE },
    { lab: 'fixed', v: F, col: COL_FIXED }
  ];
  const rowH = 24, by0 = top + 20;
  // band where L must fall
  if (model.K > 1) {
    noStroke();
    fill(COL_H[0], COL_H[1], COL_H[2], 40);
    rect(vx(H), by0 + rowH - 2, vx(Math.min(H + 1, maxV)) - vx(H), rowH, 2);
  }
  bars.forEach((b, i) => {
    const y = by0 + i * rowH;
    noStroke();
    fill(b.col[0], b.col[1], b.col[2]);
    textSize(13);
    textAlign(RIGHT, CENTER);
    text(b.lab, x0 - 6, y + rowH / 2 - 1);
    fill(b.col[0], b.col[1], b.col[2], (i === 1 && !done) ? 110 : 230);
    rect(x0, y + 4, Math.max(1, vx(b.v) - x0), rowH - 10, 2);
    fill(b.col[0], b.col[1], b.col[2]);
    textAlign(LEFT, CENTER);
    text(b.v.toFixed(2), vx(b.v) + 4, y + rowH / 2 - 1);
  });
  // axis
  const ay = by0 + 3 * rowH + 2;
  stroke(150);
  strokeWeight(1);
  line(x0, ay, x1, ay);
  noStroke();
  fill(80);
  textSize(12);
  textAlign(CENTER, TOP);
  for (let v = 0; v <= maxV; v++) {
    stroke(150);
    line(vx(v), ay, vx(v), ay + 4);
    noStroke();
    text(v, vx(v), ay + 6);
  }
  if (model.K > 1) {
    fill(COL_H[0], COL_H[1], COL_H[2]);
    textSize(12);
    textAlign(LEFT, TOP);
    const lab = 'shaded: H ≤ L < H + 1';
    if (advW(lab) < x1 - x0) text(lab, x0, ay + 22);
  }
}

// ---------------------------------------------------------------- encode / decode panel

function drawEncodePanel() {
  const E = lay.enc;
  panel(E);
  const x = E.x0 + 12, maxW = E.x1 - E.x0 - 24;
  noStroke();
  if (!model) return;
  const items = messageItems();
  const used = items.filter(it => it.lf);
  const skipped = items.length - used.length;
  const done = isComplete();
  const N = used.length;

  let y = E.y0 + 14;
  fill(40);
  textStyle(BOLD);
  const hd = srcKey === 'text' ? 'Encode and decode the message' : 'Encode and decode a message with this code';
  fitText([hd + '   (N = ' + N + ' symbol' + (N === 1 ? '' : 's') + ')', hd, 'Encode / decode'], x, y, maxW, 15, LEFT);
  textStyle(NORMAL);
  y += lay.wide ? 22 : 20;

  // message, each symbol coloured like its codeword in the bit stream
  const sz = lay.wide ? 15 : 14;
  textSize(sz);
  fill(40);
  textAlign(LEFT, CENTER);
  text('Message:', x, y);
  let cx = x + advW('Message: ') + 4;
  textFont(MONO);
  textStyle(BOLD);
  const chW = advW('M');
  let k = 0;
  for (const it of items) {
    if (cx > E.x1 - 12 - chW) break;
    const isHover = hoverLeaf && it.lf === hoverLeaf;
    if (isHover && done) {
      fill(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2], 130);
      rect(cx, y - sz / 2 - 1, chW, sz + 3, 2);
    }
    const c = it.lf ? COL_ALT[k % 2] : COL_ERR;
    fill(c[0], c[1], c[2]);
    textAlign(LEFT, CENTER);
    text(symDisp(it.ch), cx, y);
    cx += chW;
    if (it.lf) k++;
  }
  textStyle(NORMAL);
  textFont(SANS);
  if (skipped > 0) {
    fill(COL_ERR);
    textSize(13);
    const note = '  (' + skipped + ' not in this alphabet, skipped)';
    if (cx + advW(note) < E.x1 - 10) { textAlign(LEFT, CENTER); text(note, cx, y); }
  }
  y += lay.wide ? 24 : 21;

  if (!done) {
    const left = model.merges.length - step;
    fill(90);
    textStyle(ITALIC);
    fitText(['Finish the tree to encode the message: ' + left + ' merge' + (left === 1 ? '' : 's') + ' to go (Next merge or Build tree).',
             'Finish the tree first (' + left + ' merges to go).', 'Finish the tree first.'], x, y, maxW, 14, LEFT);
    textStyle(NORMAL);
    return;
  }
  if (N === 0) {
    fill(COL_ERR);
    fitText(['None of these characters belongs to the alphabet of this preset.', 'No encodable characters.'], x, y, maxW, 14, LEFT);
    return;
  }

  // bit stream, wrapped at codeword boundaries
  const bitSz = lay.wide ? 15 : 13;
  textFont(MONO);
  textStyle(BOLD);
  textSize(bitSz);
  const bw = advW('0');
  fill(40);
  textFont(SANS);
  textStyle(NORMAL);
  textSize(sz);
  textAlign(LEFT, CENTER);
  text('Bits:', x, y);
  const bx0 = lay.wide ? x + Math.max(advW('Message: ') + 4, 50) : x + 40;
  textFont(MONO);
  textStyle(BOLD);
  textSize(bitSz);
  const lineH = bitSz + 5;
  const maxLines = Math.max(1, Math.floor((E.y1 - 38 - 14 - y) / lineH) + 1);
  let bxp = bx0, line = 0, truncated = false;
  let allBits = '';
  used.forEach((it, i) => {
    const code = it.lf.code;
    allBits += code;
    if (truncated) return;
    if (bxp + code.length * bw > E.x1 - 12 && bxp > bx0) {
      line++;
      bxp = bx0;
      if (line >= maxLines) { truncated = true; return; }
    }
    const ly = y + line * lineH;
    if (hoverLeaf && it.lf === hoverLeaf) {
      noStroke();
      fill(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2], 130);
      rect(bxp, ly - bitSz / 2 - 1, code.length * bw, bitSz + 3, 2);
    }
    const c = COL_ALT[i % 2];
    fill(c[0], c[1], c[2]);
    textAlign(LEFT, CENTER);
    for (let j = 0; j < code.length; j++) {
      if (bxp + bw > E.x1 - 10) { line++; bxp = bx0; if (line >= maxLines) { truncated = true; return; } }
      text(code[j], bxp, y + line * lineH);
      bxp += bw;
    }
  });
  textStyle(NORMAL);
  textFont(SANS);
  if (truncated) { fill(90); textSize(14); textAlign(RIGHT, CENTER); text('…', E.x1 - 6, y + (maxLines - 1) * lineH); }
  y = E.y1 - 38;

  // bit counts and compression ratio
  const hb = allBits.length, F = model.F, fb = N * F;
  const ratio = (fb / hb).toFixed(2), per = (hb / N).toFixed(3);
  fill(COL_CODE);
  textStyle(BOLD);
  fitText([
    'Huffman: ' + hb + ' bits (' + per + ' bits/symbol)   Fixed-length: ' + N + ' × ' + F + ' = ' + fb + ' bits   Ratio ' + fb + ' / ' + hb + ' = ' + ratio,
    'Huffman ' + hb + ' bits (' + per + '/symbol), fixed ' + N + ' × ' + F + ' = ' + fb + ', ratio ' + ratio,
    'Huffman ' + hb + ' bits, fixed ' + fb + ', ratio ' + ratio,
    hb + ' vs ' + fb + ' bits, ratio ' + ratio
  ], x, y, maxW, 14, LEFT);
  textStyle(NORMAL);
  y += 21;

  // decode the bit stream by walking down the tree
  const dec = decodeBits(allBits);
  const want = used.map(it => it.lf.sym).join('');
  const ok = dec === want;
  textSize(14);
  fill(40);
  textAlign(LEFT, CENTER);
  const decChars = Array.from(dec);
  textFont(MONO);
  textStyle(BOLD);
  const dW = advW('M');
  textStyle(NORMAL);
  textFont(SANS);
  const tail = ok ? '  ✓ same symbols' : '  ✗ mismatch';
  textStyle(BOLD);
  const tailW = advW(tail);
  textStyle(NORMAL);
  let pre = 'Decoded (walk down from the root, restart at each leaf): ';
  if (advW(pre) + decChars.length * dW + tailW > maxW) pre = 'Decoded: ';
  text(pre, x, y);
  let dx = x + advW(pre);
  textFont(MONO);
  textStyle(BOLD);
  for (let i = 0; i < decChars.length; i++) {
    if (dx + dW > E.x1 - 12 - tailW) { fill(90); text('…', dx, y); dx += dW; break; }
    fill(30);
    text(symDisp(decChars[i]), dx, y);
    dx += dW;
  }
  textStyle(NORMAL);
  textFont(SANS);
  const c = ok ? COL_H : COL_ERR;
  fill(c[0], c[1], c[2]);
  textStyle(BOLD);
  text(tail, dx, y);
  textStyle(NORMAL);
}

// ---------------------------------------------------------------- controls

function rowY(i) { return drawHeight + 20 + 34 * i; }

function drawControlLabels() {
  noStroke();
  fill('black');
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  text('Source:', 10, rowY(0));
  text('Message:', 10, rowY(1));
  textSize(14);
  fill(80);
  const src = currentSource();
  fitText([src.note, ''], ctl.noteX0, rowY(0), canvasWidth - ctl.noteX0 - 10, 14, LEFT);
  const n = Array.from(textInput.value()).length;
  const lenNote = n + ' / ' + MAX_CHARS + ' characters';
  if (canvasWidth - ctl.noteX1 - 10 >= advW(lenNote)) text(lenNote, ctl.noteX1, rowY(1));
  if (model) {
    const nm = model.merges.length;
    const st = 'merges: ' + Math.min(step, nm) + ' of ' + nm;
    if (canvasWidth - ctl.noteX2 - 10 >= advW(st)) { fill(isComplete() ? COL_H : COL_GOLD_TEXT); textStyle(BOLD); text(st, ctl.noteX2, rowY(2)); textStyle(NORMAL); }
  }
}

function layoutControls() {
  if (typeof resetButton === 'undefined' || canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  const selX = 80;
  const selW = Math.min(280, canvasWidth - selX - 10);
  sourceSelect.position(selX, rowY(0) - 12);
  sourceSelect.style('width', selW + 'px');
  const inX = 88;
  const inW = Math.min(290, canvasWidth - inX - 18);
  textInput.position(inX, rowY(1) - 12);
  textInput.size(inW);
  let bx = 10;
  for (const b of [nextButton, buildButton, undoButton, resetButton]) {
    b.position(bx, rowY(2) - 12);
    bx += b.elt.offsetWidth + 8;
  }
  ctl.noteX0 = selX + sourceSelect.elt.offsetWidth + 14;
  ctl.noteX1 = inX + textInput.elt.offsetWidth + 14;
  ctl.noteX2 = bx + 8;
}

// ---------------------------------------------------------------- text helpers

// Rich text: "p_i" draws the character after '_' as a subscript (used only for fixed strings)
function parseRich(s) {
  const out = [];
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '_' && i + 1 < s.length) {
      if (buf) { out.push({ t: buf, sub: false }); buf = ''; }
      out.push({ t: s[i + 1], sub: true });
      i++;
    } else {
      buf += s[i];
    }
  }
  if (buf) out.push({ t: buf, sub: false });
  return out;
}

// advance width: in p5 2.x textWidth() measures tight bounds and ignores spaces,
// so runs of text placed side by side must use fontWidth()
function advW(s) {
  return typeof fontWidth === 'function' ? fontWidth(String(s)) : textWidth(String(s));
}

function richWidth(s, sz) {
  let w = 0;
  for (const p of parseRich(s)) {
    textSize(p.sub ? sz * 0.72 : sz);
    w += advW(p.t);
  }
  textSize(sz);
  return w;
}

// y is the vertical centre of the line
function richText(s, x, y, sz, align) {
  const w = richWidth(s, sz);
  let cx = align === CENTER ? x - w / 2 : (align === RIGHT ? x - w : x);
  textAlign(LEFT, CENTER);
  for (const p of parseRich(s)) {
    textSize(p.sub ? sz * 0.72 : sz);
    text(p.t, cx, p.sub ? y + sz * 0.3 : y);
    cx += advW(p.t);
  }
  textSize(sz);
  return w;
}

// draw the first candidate that fits in maxW (the last one otherwise); returns the string drawn
function fitText(cands, x, y, maxW, sz, align) {
  for (const c of cands) {
    if (richWidth(c, sz) <= maxW) { richText(c, x, y, sz, align); return c; }
  }
  const last = cands[cands.length - 1];
  richText(last, x, y, sz, align);
  return last;
}

// ---------------------------------------------------------------- responsive layout

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  layoutControls();
}
