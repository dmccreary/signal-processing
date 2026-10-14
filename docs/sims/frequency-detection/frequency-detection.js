// Frequency Detection MicroSim
// CANVAS_HEIGHT: 595
// A "winding machine": a sampled sine wave is wrapped around a circle that spins with an
// adjustable period. The center of mass of the wound curve moves away from the origin only
// when the circle period matches the signal period - the idea behind the Fourier transform.
// p5.js 2.3.2 (2D renderer). Ported from a p5.js 1.x WEBGL sketch; the math is unchanged.

// ---------- Canvas and layout ----------
let canvasWidth = 600;              // overwritten from the container in updateCanvasSize()
let drawHeight = 415;
let controlHeight = 180;
let canvasHeight = drawHeight + controlHeight;
let defaultTextSize = 16;

const TITLE_Y = 8;
const ROW1_Y = 44;                  // top of the center-of-mass panel and the frequency graph
const GRAPH_H = 150;                // height of both graphs
const CART_HEADER_Y = 222;          // "Cartesian Coordinates" header bar
const CART_Y = 247;                 // top of the Cartesian (time) graph
const ROW_SPACING = 35;             // vertical spacing of the control rows
const ZOOM_SECONDS = 2;             // both graphs span 0 to 2 s horizontally
const SQUEEZE = 0.95;               // fraction of the half-height used by a full-scale sample
const THUMB = 8;                    // half-width of the slider thumb, for aligning the period slider

// lx: left column x, P: polar/center-of-mass panel size, gx/gw: graph x and width
let lay = { compact: false, lx: 15, P: 150, gx: 207, gw: 373, labelSize: 16 };
let layoutWidth = -1;

// ---------- Parameters set by the controls ----------
let sampleRes = 300;                // Resolution: samples per second of simulated time
let timeScalar = 1;                 // Speed multiplier
let timeScalarAdmin = 1;            // extra speed-up applied while AutoPoll runs (20x overall)
let signalPeriod = 0.5;             // Ts, seconds
let circlePeriod = 0.3;             // Tc, seconds

// ---------- Simulation state ----------
let sigSamples = [];                // one period of the sampled sine wave
let sigColors = [];                 // shading of each sample (light at peaks, dark at troughs)
let simTime = 0;                    // simulated seconds since the last reset
let polarTick = 0;                  // index of the newest sample wound onto the circle
let comX = 0, comY = 0, comCount = 0;   // running sums for the center of mass
let freqData = {};                  // Tc (as "0.30") -> |center of mass| measured at that Tc
let isRunning = false;
let lastTime = 0;
let autopollFlag = false;
let dxyCalcs = [], dxy2Calcs = [], dxyCalcRev = 0;
let lastPolarPt = null, lastMassPt = null;

let polarG, massG;                  // off-screen layers that accumulate the wound curve
let bufferSize = 0;
let simFont = null;

// ---------- Controls ----------
let circleSlider, signalSlider, resolutionSlider, speedSlider;
let playButton, resetButton, pollButton, spinCheckbox;

async function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  try {
    simFont = await loadFont('frequency-detection.otf');   // Inconsolata (SIL Open Font License)
  } catch (e) {
    simFont = null;                                         // e.g. in the p5.js editor without the font file
  }
  textFont(simFont || 'monospace');
  textSize(defaultTextSize);

  createControls();
  positionControls();
  makeBuffers();
  resetSim(true, false, false);

  describe('Frequency detection by winding: a sine wave with an adjustable period is wrapped around a circle that spins with an adjustable period. ' +
    'The polar plot shows the wound curve, a panel shows its center of mass, and a graph plots the distance of the center of mass from the origin ' +
    'against the circle spin period. Press Play to wind the signal, or AutoPoll to sweep the circle period from 0.1 to 2 seconds.');
}

function createControls() {
  circleSlider = createSlider(0.1, 2, circlePeriod, 0.05);
  signalSlider = createSlider(0.1, 1, signalPeriod, 0.1);
  resolutionSlider = createSlider(10, 300, sampleRes, 10);
  speedSlider = createSlider(0.01, 2, timeScalar, 0.01);

  playButton = createButton('Play');
  playButton.mousePressed(togglePlay);
  resetButton = createButton('Reset');
  resetButton.mousePressed(() => resetSim(true, false, false));
  pollButton = createButton('AutoPoll');
  pollButton.mousePressed(toggleAutoPoll);

  spinCheckbox = createCheckbox('Show Spin', false);
  spinCheckbox.style('font-size', '16px');
}

function computeLayout() {
  const compact = canvasWidth < 520;
  const lx = compact ? 8 : 15;
  const P = compact ? 120 : 150;
  const gx = lx + P + (compact ? 36 : 42);
  const gw = Math.max(120, canvasWidth - gx - (compact ? 14 : 20));
  lay = { compact, lx, P, gx, gw, labelSize: compact ? 14 : 16 };
  layoutWidth = canvasWidth;
}

function positionControls() {
  const y0 = drawHeight + 10;
  // The circle-period slider is stretched so its thumb sits under the blue marker:
  // value 0.1 s at gx + 0.05 gw and value 2 s at gx + gw (the graphs span 0 to 2 s).
  circleSlider.position(lay.gx + 0.05 * lay.gw - THUMB, y0);
  circleSlider.size(0.95 * lay.gw + 2 * THUMB);
  for (const [s, row] of [[signalSlider, 1], [resolutionSlider, 2], [speedSlider, 3]]) {
    s.position(lay.gx, y0 + row * ROW_SPACING);
    s.size(lay.gw);
  }
  const by = y0 + 4 * ROW_SPACING - 2;
  let x = lay.lx;
  for (const [b, w] of [[playButton, 64], [resetButton, 64], [pollButton, 84]]) {
    b.position(x, by);
    b.style('width', w + 'px');
    x += w + 6;
  }
  spinCheckbox.position(x + 8, by + 2);
}

function makeBuffers() {
  if (polarG) polarG.remove();
  if (massG) massG.remove();
  polarG = createGraphics(lay.P, lay.P);
  massG = createGraphics(lay.P, GRAPH_H);
  bufferSize = lay.P;
}

// ---------- Simulation ----------

function generateSignal() {
  const n = Math.max(1, Math.round(signalPeriod * sampleRes));   // samples in one signal period
  sigSamples = [];
  sigColors = [];
  for (let i = 0; i < n; i++) {
    const ph = TWO_PI * i / n;
    sigSamples.push(Math.sin(ph));
    const r = Math.sin(ph) + 1;
    const g = Math.sin(ph - 0.1 * PI / 2) + 1;
    const b = Math.sin(ph - 0.1 * PI) + 1;
    sigColors.push(color(r * 126, g * 126, b * 126));
  }
}

function clearBuffers() {
  const P = lay.P;
  polarG.clear();
  polarG.stroke(0); polarG.strokeWeight(3); polarG.fill(200);
  polarG.circle(P / 2, P / 2, P - 3);
  polarG.stroke(127); polarG.strokeWeight(1); polarG.noFill();
  polarG.line(P / 2, 0, P / 2, P);
  polarG.line(0, P / 2, P, P / 2);
  for (const f of [0.25, 0.5, 0.75]) polarG.circle(P / 2, P / 2, P * f);

  massG.clear();
  massG.stroke(0); massG.strokeWeight(3); massG.fill(200);
  massG.rect(1.5, 1.5, P - 3, GRAPH_H - 3);
}

// clearFreqs: erase the frequency-strength graph; autoStart: keep running; keepPoll: keep AutoPoll going
function resetSim(clearFreqs, autoStart, keepPoll) {
  if (!keepPoll) {
    autopollFlag = false;
    timeScalarAdmin = 1;
  }
  simTime = 0;
  polarTick = 0;
  comX = 0; comY = 0; comCount = 0;
  dxyCalcs = []; dxy2Calcs = []; dxyCalcRev = 0;
  isRunning = !!autoStart;
  playButton.html(isRunning ? 'Pause' : 'Play');
  if (clearFreqs) freqData = {};
  lastTime = millis();

  generateSignal();
  clearBuffers();
  lastPolarPt = null;
  lastMassPt = null;
  addSample(0);
}

// Wind sample n onto the circle: radius = -x[n], angle = 2 pi n / (Tc * resolution)
function addSample(n) {
  const N = sigSamples.length;
  const idx = n % N;
  const r = -sigSamples[idx];
  const th = TWO_PI * n / (circlePeriod * sampleRes);
  const rx = r * Math.cos(th);
  const ry = r * Math.sin(th);
  const P = lay.P;
  const px = P / 2 + SQUEEZE * rx * P / 2;
  const py = P / 2 + SQUEEZE * ry * P / 2;
  const qx = P / 2 + 0.7 * rx * P / 2;
  const qy = GRAPH_H / 2 + 5 + 0.7 * ry * P / 2;
  if (lastPolarPt) {
    polarG.stroke(sigColors[idx]); polarG.strokeWeight(2);
    polarG.line(lastPolarPt[0], lastPolarPt[1], px, py);
    massG.stroke(0); massG.strokeWeight(2);
    massG.line(lastMassPt[0], lastMassPt[1], qx, qy);
  }
  lastPolarPt = [px, py];
  lastMassPt = [qx, qy];
  comX += rx;
  comY += ry;
  comCount += 1;
}

function periodKey(t) { return t.toFixed(2); }
function round2(v) { return Math.round(v * 100) / 100; }
function comMagnitude() { return comCount > 0 ? Math.hypot(comX, comY) / comCount : 0; }

function advanceSimulation() {
  if (!isRunning) return;
  const now = millis();
  const speed = timeScalar * timeScalarAdmin;
  // cap long gaps (hidden tab) but never below the time one sample needs at the slowest speed
  const elapsed = Math.min(now - lastTime, Math.max(250, 2000 / (sampleRes * speed)));
  let diffTime = speed * elapsed / 1000;
  if (simTime === 0) diffTime = 1.5 / sampleRes;
  if (diffTime > 1 / sampleRes) {
    simTime += diffTime;
    const newTick = Math.floor(simTime * sampleRes + 1e-6);
    for (let n = polarTick + 1; n <= newTick; n++) addSample(n);
    polarTick = newTick;
    freqData[periodKey(circlePeriod)] = comMagnitude();
    lastTime = now;
  }

  // AutoPoll: once per signal period, check whether the strength has settled; if so, step Tc by 0.05 s
  if (autopollFlag && Math.floor(simTime / signalPeriod) > dxyCalcRev) {
    let flag2 = 10;
    let flag1 = 20;
    dxyCalcRev += 1;
    dxyCalcs.push(freqData[periodKey(circlePeriod)]);
    if (dxyCalcRev > 1) {
      dxy2Calcs.push(Math.abs(dxyCalcs[dxyCalcRev - 1] - dxyCalcs[dxyCalcRev - 2]));
    }
    if (dxyCalcRev > 2) {
      flag2 = Math.abs(dxy2Calcs[dxyCalcRev - 2] - dxy2Calcs[dxyCalcRev - 3]);
      flag1 = dxy2Calcs[dxyCalcRev - 2];
    }
    if (flag1 < 0.01 && flag2 < 0.01) {
      if (circlePeriod >= 2) {
        autopollFlag = false;
        timeScalarAdmin = 1;
      } else {
        circlePeriod = round2(circlePeriod + 0.05);
        circleSlider.value(circlePeriod);
        resetSim(false, true, true);
      }
    }
  }
}

function pollControls() {
  const r = Number(resolutionSlider.value());
  if (r !== sampleRes) { sampleRes = r; resetSim(false, isRunning); }
  const s = Number(speedSlider.value());
  if (s !== timeScalar) timeScalar = s;
  const sp = round2(Number(signalSlider.value()));
  if (sp !== signalPeriod) { signalPeriod = sp; resetSim(true, isRunning); }
  const c = round2(Number(circleSlider.value()));
  if (c !== circlePeriod) { circlePeriod = c; resetSim(false, isRunning); }
}

function togglePlay() {
  isRunning = !isRunning;
  if (isRunning) lastTime = millis();
  playButton.html(isRunning ? 'Pause' : 'Play');
}

function toggleAutoPoll() {
  if (autopollFlag) {             // second press stops the sweep and clears the graph
    resetSim(true, false, false);
    return;
  }
  circlePeriod = 0.1;
  circleSlider.value(circlePeriod);
  resetSim(true, true, false);
  timeScalarAdmin = 20 / timeScalar;
  autopollFlag = true;
}

// ---------- Drawing ----------

function draw() {
  updateCanvasSize();
  pollControls();
  advanceSimulation();

  noStroke();
  fill(180);
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke(150); strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  drawTitle();
  drawFrequencyGraph();
  drawCartesianGraph();
  drawPolarPanel();
  drawMassPanel();
  drawPeriodMarkers();
  drawCartesianHeader();
  drawControlLabels();
}

function drawTitle() {
  noStroke(); fill(0);
  textAlign(CENTER, TOP);
  textSize(lay.compact ? 20 : 24);
  text('FREQUENCY DETECTION', canvasWidth / 2, TITLE_Y);
}

function drawFrame(x, y, w, h) {
  const cx = x + w / 2, cy = y + h / 2;
  stroke(0); strokeWeight(3); fill(200);
  rect(x, y, w, h);
  stroke(127); strokeWeight(1);
  line(x, cy, x + w, cy);
  line(x, cy - h / 4, x + w, cy - h / 4);
  line(x, cy + h / 4, x + w, cy + h / 4);
  line(cx, y, cx, y + h);
  line(cx - w / 4, y, cx - w / 4, y + h);
  line(cx + w / 4, y, cx + w / 4, y + h);
}

function peakText() {
  const keys = Object.keys(freqData);
  if (!keys.length) return 'press Play or AutoPoll';
  let best = keys[0];
  for (const k of keys) if (freqData[k] > freqData[best]) best = k;
  const tc = parseFloat(best);
  const head = lay.compact ? 'peak: ' : 'peak of ' + keys.length + ' measured: ';
  return head + tc.toFixed(2) + ' s = ' + (1 / tc).toFixed(2) + ' Hz';
}

function drawFrequencyGraph() {
  const x = lay.gx, y = ROW1_Y, w = lay.gw, h = GRAPH_H;
  const cx = x + w / 2, cy = y + h / 2;
  const base = cy + h / 4;
  drawFrame(x, y, w, h);
  stroke(0); strokeWeight(3); fill(200);
  rect(x, base, w, h / 4);                 // axis strip
  rect(x, y, w, h / 4);                    // header strip

  noStroke(); fill(0);
  textAlign(CENTER, CENTER);
  textSize(15);
  text('Frequency Strength', cx, y + 12);
  textSize(14);
  text(peakText(), cx, y + 27);

  for (const k of Object.keys(freqData)) {
    const px = x + parseFloat(k) * w / ZOOM_SECONDS;
    const py = base - Math.min(freqData[k], 1) * h / 2;
    stroke(0); strokeWeight(2);
    line(px, base, px, py);
    stroke(0); strokeWeight(1); fill(255, 255, 0);
    circle(px, py, 10);
  }

  // axis labels: strength (|center of mass|) on the left, circle period below
  noStroke(); fill(0);
  textSize(13);
  textAlign(RIGHT, CENTER);
  text('1', x - 5, y + h / 4);
  text('0.5', x - 5, cy);
  text('0', x - 5, base);
  textAlign(CENTER, TOP);
  for (let k = 0; k <= 4; k++) {
    const px = x + k * w / 4;
    if (k === 4) { textAlign(RIGHT, TOP); text('2.0 s', px, y + h + 4); }
    else text((k * 0.5).toFixed(1), px, y + h + 4);
  }
}

function drawCartesianGraph() {
  const x = lay.gx, y = CART_Y, w = lay.gw, h = GRAPH_H;
  const cy = y + h / 2;
  drawFrame(x, y, w, h);

  // The left edge is "now"; the wave scrolls left as time advances (2 s across the graph).
  const N = sigSamples.length;
  const pxPerSample = (w / ZOOM_SECONDS) / sampleRes;
  const kMax = Math.ceil(w / pxPerSample) + 1;
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(x, y, w, h);
  drawingContext.clip();
  strokeWeight(2);
  let prevX = x;
  let prevY = cy - SQUEEZE * h / 2 * sigSamples[polarTick % N];
  for (let k = 1; k <= kMax; k++) {
    const idx = (polarTick + k) % N;
    const px = x + k * pxPerSample;
    const py = cy - SQUEEZE * h / 2 * sigSamples[idx];
    stroke(sigColors[idx]);
    line(prevX, prevY, px, py);
    prevX = px; prevY = py;
  }
  drawingContext.restore();

  stroke(255, 0, 0); strokeWeight(1); fill(255, 0, 0);
  circle(x, cy - SQUEEZE * h / 2 * sigSamples[polarTick % N], 6);
}

function drawPolarPanel() {
  const P = lay.P;
  const cxp = lay.lx + P / 2, cyp = CART_Y + GRAPH_H / 2;
  const thetaNow = TWO_PI * polarTick / (circlePeriod * sampleRes);
  const spin = spinCheckbox.checked();
  push();
  translate(cxp, cyp);
  if (spin) rotate(-thetaNow + HALF_PI);
  image(polarG, -P / 2, -P / 2, P, P);
  pop();

  const s = sigSamples[polarTick % sigSamples.length] * SQUEEZE * P / 2;
  stroke(255, 0, 0); strokeWeight(1); fill(255, 0, 0);
  if (spin) circle(cxp, cyp - s, 6);
  else circle(cxp - s * Math.cos(thetaNow), cyp - s * Math.sin(thetaNow), 6);
}

function drawMassPanel() {
  const P = lay.P, x = lay.lx, y = ROW1_Y;
  image(massG, x, y, P, GRAPH_H);
  stroke(0); strokeWeight(1); fill(255, 255, 0);
  circle(x + 11, y + 14, 7);
  noStroke(); fill(0);
  textAlign(LEFT, CENTER);
  textSize(lay.compact ? 12 : 14);
  text('= Center of Mass', x + 18, y + 13);

  if (comCount > 0) {
    const ox = x + P / 2, oy = y + GRAPH_H / 2 + 5;
    const mx = ox + 0.7 * (P / 2) * comX / comCount;
    const my = oy + 0.7 * (P / 2) * comY / comCount;
    stroke(255, 0, 0); strokeWeight(2);
    line(ox, oy, mx, my);
    stroke(0); strokeWeight(1); fill(255, 255, 0);
    circle(mx, my, 10);
  }
  noStroke(); fill(0);
  textAlign(LEFT, BOTTOM);
  textSize(14);
  text('|COM| = ' + comMagnitude().toFixed(3), x + 7, y + GRAPH_H - 4);
}

function drawPeriodMarkers() {
  const pxs = lay.gw / ZOOM_SECONDS;
  const mx = lay.gx + circlePeriod * pxs;
  const graphBottom = CART_Y + GRAPH_H;
  const base = ROW1_Y + GRAPH_H * 3 / 4;

  stroke(0, 0, 255); strokeWeight(1);
  for (let x = mx; x < lay.gx + lay.gw; x += circlePeriod * pxs) line(x, CART_Y, x, graphBottom);
  line(mx, graphBottom, mx, drawHeight + 10);           // down to the circle-period slider
  line(mx, ROW1_Y + GRAPH_H, mx, CART_HEADER_Y);        // up to the frequency graph

  noStroke(); fill(0, 0, 255);
  triangle(mx - 5, graphBottom + 12, mx + 5, graphBottom + 12, mx, graphBottom + 2);
  triangle(mx - 5, base + 12, mx + 5, base + 12, mx, base + 2);

  fill(0, 0, 200);
  textSize(14);
  textAlign(CENTER, TOP);
  const lx = constrain(mx, lay.gx + 24, lay.gx + lay.gw - 24);
  text(circlePeriod.toFixed(2) + ' s', lx, base + 15);
}

function drawCartesianHeader() {
  stroke(0); strokeWeight(3); fill(180);
  rect(lay.gx, CART_HEADER_Y, lay.gw, 25);
  noStroke(); fill(0);
  textAlign(CENTER, CENTER);
  textSize(15);
  text('Cartesian Coordinates', lay.gx + lay.gw / 2, CART_HEADER_Y + 12);
  text('Polar', lay.lx + lay.P / 2, CART_HEADER_Y + 12);
}

function drawControlLabels() {
  const y0 = drawHeight + 10 + 9;
  noStroke(); fill(0);
  textAlign(LEFT, CENTER);
  textSize(lay.labelSize);
  text('Circle period: ' + circlePeriod.toFixed(2) + ' s', lay.lx, y0);
  text('Signal period: ' + signalPeriod.toFixed(2) + ' s', lay.lx, y0 + ROW_SPACING);
  text('Resolution: ' + sampleRes + (lay.compact ? '/s' : ' pts/s'), lay.lx, y0 + 2 * ROW_SPACING);
  text('Speed: ' + timeScalar.toFixed(2) + 'x', lay.lx, y0 + 3 * ROW_SPACING);

  if (canvasWidth >= 600) {
    let status = 'Paused';
    if (autopollFlag) status = 'AutoPoll: sweeping at 20x';
    else if (isRunning) status = 'Running';
    textAlign(RIGHT, CENTER);
    textSize(14);
    fill(autopollFlag ? color(0, 0, 200) : (isRunning ? color(0, 120, 0) : color(160, 0, 0)));
    text(status, canvasWidth - 20, y0 + 4 * ROW_SPACING);
  }
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  if (canvasWidth === layoutWidth) return;
  computeLayout();
  if (typeof circleSlider !== 'undefined') positionControls();
  if (bufferSize !== 0 && bufferSize !== lay.P) {
    makeBuffers();
    resetSim(false, isRunning, autopollFlag);
  }
}
