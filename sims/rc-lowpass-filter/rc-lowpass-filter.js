// RC Low-Pass Filter Bode Plot MicroSim
// CANVAS_HEIGHT: 602
// Bode plot of the first-order RC low-pass filter H(f) = 1 / (1 + j f / fc),
// fc = 1 / (2 pi R C): gain in dB (top) and phase in degrees (bottom) against
// a logarithmic frequency axis from 1 Hz to 100 kHz.  The R and C sliders step
// through the standard E12 component values (12 values per decade, log spaced).

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 670;
let drawHeight = 492;
let controlHeight = 110;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 195;
let defaultTextSize = 16;

// ---- axes ----
const F_START = 1;        // Hz
const F_END = 1e5;        // Hz
const DB_MIN = -80;       // gain axis (dB)
const DB_MAX = 10;
const PH_MIN = -100;      // phase axis (degrees)
const PH_MAX = 10;

// E12 preferred values: 12 per decade, spaced about 21% apart (10^(1/12) = 1.21)
const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];

// ---- palette (kept from the original Plotly version: gain red, phase blue) ----
const GAIN_COLOR = 'red';
const GAIN_TEXT = 'firebrick';
const PHASE_COLOR = 'blue';
const CORNER_COLOR = 'darkorange';
const CORNER_TEXT = 'chocolate';
const ASYM_COLOR = 'dimgray';

// ---- controls ----
let rSlider, cSlider, asymptoteCheckbox;

// ---- frequency cursor (moved by hovering over a plot) ----
// { rel: k } puts the cursor at k * fc (it follows fc); { abs: f } fixes it at f Hz.
let cursor = { rel: 1 };
const SNAP = [
  { k: 0.1, name: 'fc/10' },
  { k: 1, name: 'fc' },
  { k: 10, name: '10·fc' },
  { k: 100, name: '100·fc' }
];
const SNAP_PX = 5;
let plots = null;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  rSlider = createSlider(0, 48, 24, 1);     // E12 index: 10 ohm ... 100 kohm, default 1 kohm
  rSlider.attribute('aria-label', 'Resistance R');
  cSlider = createSlider(0, 60, 36, 1);     // E12 index: 1 nF ... 100 uF, default 1 uF
  cSlider.attribute('aria-label', 'Capacitance C');
  asymptoteCheckbox = createCheckbox(' Show straight-line asymptotes', true);

  const mainElement = document.querySelector('main');
  [rSlider, cSlider, asymptoteCheckbox].forEach(c => c.parent(mainElement));
  positionControls();

  describe('Bode plot of an RC low-pass filter. Two sliders set the resistance R and the capacitance C. ' +
    'The top plot shows the gain in decibels and the bottom plot the phase in degrees against a logarithmic ' +
    'frequency axis from 1 Hz to 100 kHz. An orange line marks the corner frequency fc = 1/(2 pi R C), where ' +
    'the gain is -3 dB and the phase is -45 degrees, and a triangle shows the -20 dB per decade roll-off.');
}

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

function resistanceFromIndex(i) { return E12[i % 12] * Math.pow(10, Math.floor(i / 12)); }        // ohms
function capacitanceFromIndex(j) { return E12[j % 12] * Math.pow(10, Math.floor(j / 12) - 10); } // farads

// |H(f)| in dB and the phase of H(f) in degrees for H(f) = 1 / (1 + j f/fc)
function gainDb(f, fc) { return -10 * Math.log10(1 + (f / fc) * (f / fc)); }
function phaseDeg(f, fc) { return -Math.atan(f / fc) * 180 / Math.PI; }

// straight-line (asymptotic) Bode approximations
function gainAsymptote(f, fc) { return f <= fc ? 0 : -20 * Math.log10(f / fc); }
function phaseAsymptote(f, fc) {
  if (f <= fc / 10) return 0;
  if (f >= fc * 10) return -90;
  return -45 * (1 + Math.log10(f / fc));
}

// ---------------------------------------------------------------------------
// Number formatting
// ---------------------------------------------------------------------------

const PREFIX = { '-12': 'p', '-9': 'n', '-6': 'µ', '-3': 'm', '0': '', '3': 'k', '6': 'M' };

// Engineering notation with `digits` significant figures, e.g. 4700 -> "4.70 kΩ".
// trim removes trailing zeros ("4.7 kΩ"); minExp = 0 avoids "mHz", which reads like "MHz".
function formatSI(v, unit, digits, trim, minExp) {
  if (minExp === undefined) minExp = -12;
  const rounded = Number(v.toPrecision(digits));
  let e = Math.floor(Math.log10(Math.abs(rounded)) / 3) * 3;
  e = Math.max(minExp, Math.min(6, e));
  const mant = rounded / Math.pow(10, e);
  const decimals = Math.max(0, digits - 1 - Math.floor(Math.log10(Math.abs(mant)) + 1e-9));
  let s = mant.toFixed(decimals);
  if (trim) s = String(parseFloat(s));
  return s + ' ' + PREFIX[String(e)] + unit;
}

function formatHz(f) { return formatSI(f, 'Hz', 3, false, 0); }

// signed number with a true minus sign
function signed(v, decimals) {
  const s = Math.abs(v).toFixed(decimals);
  return (v < 0 && Number(s) !== 0 ? '−' : '') + s;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function isNarrow() { return canvasWidth < 600; }
function tickSize() { return isNarrow() ? 12 : 13; }
function captionSize() { return isNarrow() ? 13 : 15; }

// first candidate that fits in maxW pixels (fontWidth counts spaces; textWidth does not)
function fitText(candidates, maxW) {
  for (const c of candidates) if (fontWidth(c) <= maxW) return c;
  return candidates[candidates.length - 1];
}

function draw() {
  updateCanvasSize();

  const R = resistanceFromIndex(rSlider.value());
  const C = capacitanceFromIndex(cSlider.value());
  const tau = R * C;
  const fc = 1 / (2 * Math.PI * tau);
  const showAsym = asymptoteCheckbox.checked();

  // drawing region and control region
  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  const leftPad = isNarrow() ? 44 : 56;
  const rightPad = isNarrow() ? 18 : 22;
  const w = canvasWidth - leftPad - rightPad;
  plots = {
    gain: { x: leftPad, y: 124, w: w, h: 162 },
    phase: { x: leftPad, y: 330, w: w, h: 120 }
  };
  updateCursor(fc);
  const cur = cursorInfo(fc);

  drawHeader(R, C, tau, fc, showAsym);
  drawGainPlot(plots.gain, fc, cur, showAsym);
  drawPhasePlot(plots.phase, fc, cur, showAsym);
  drawControlLabels(R, C);
}

function drawHeader(R, C, tau, fc, showAsym) {
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(isNarrow() ? 18 : 22);
  text('RC Low-Pass Filter Bode Plot', canvasWidth / 2, 8);

  const showSchematic = canvasWidth >= 640;
  const room = (showSchematic ? canvasWidth - 290 : canvasWidth) - 24;
  textSize(isNarrow() ? 14 : 16);
  textAlign(LEFT, CENTER);
  text(fitText(['Time constant τ = RC = ' + formatSI(tau, 's', 3, false),
    'τ = RC = ' + formatSI(tau, 's', 3, false)], room), 12, 44);
  text(fitText(['Corner frequency fc = 1/(2πRC) = ' + formatHz(fc),
    'fc = 1/(2πRC) = ' + formatHz(fc), 'fc = ' + formatHz(fc)], room), 12, 66);

  drawLegend(12, 89, showAsym);
  if (showSchematic) drawSchematic(canvasWidth - 275, 48, 90, R, C);
}

function drawLegend(x, y, showAsym) {
  const items = [
    { label: 'gain', color: GAIN_COLOR, dash: [], weight: 2.5 },
    { label: 'phase', color: PHASE_COLOR, dash: [], weight: 2.5 },
    { label: 'corner fc', color: CORNER_COLOR, dash: [3, 3], weight: 2 }
  ];
  if (showAsym) items.push({ label: 'asymptotes', color: ASYM_COLOR, dash: [6, 4], weight: 1.5 });
  textSize(isNarrow() ? 13 : 14);
  textAlign(LEFT, CENTER);
  for (const it of items) {
    stroke(it.color);
    strokeWeight(it.weight);
    drawingContext.setLineDash(it.dash);
    line(x, y, x + 22, y);
    drawingContext.setLineDash([]);
    noStroke();
    fill('black');
    text(it.label, x + 27, y);
    x += 27 + fontWidth(it.label) + 16;
  }
  strokeWeight(1);
}

// Vin -- R -- node -- Vout, with C from the node to the ground rail
function drawSchematic(x0, yTop, yGnd, R, C) {
  const tIn = x0 + 34, rStart = tIn + 20, rEnd = rStart + 60, nX = rEnd + 25, tOut = nX + 85;
  const yMid = (yTop + yGnd) / 2;
  stroke('black');
  strokeWeight(1.5);
  noFill();
  line(tIn, yTop, rStart, yTop);
  // resistor zigzag
  beginShape();
  vertex(rStart, yTop);
  for (let k = 0; k < 6; k++) vertex(rStart + 5 + k * 10, yTop + (k % 2 === 0 ? -6 : 6));
  vertex(rEnd, yTop);
  endShape();
  line(rEnd, yTop, tOut, yTop);
  // capacitor
  line(nX, yTop, nX, yMid - 4);
  line(nX, yMid + 4, nX, yGnd);
  strokeWeight(2.5);
  line(nX - 12, yMid - 4, nX + 12, yMid - 4);
  line(nX - 12, yMid + 4, nX + 12, yMid + 4);
  strokeWeight(1.5);
  // ground rail
  line(tIn, yGnd, tOut, yGnd);
  // junction dots and terminals
  fill('black');
  noStroke();
  circle(nX, yTop, 5);
  circle(nX, yGnd, 5);
  fill('white');
  stroke('black');
  for (const [tx, ty] of [[tIn, yTop], [tIn, yGnd], [tOut, yTop], [tOut, yGnd]]) circle(tx, ty, 7);
  strokeWeight(1);

  noStroke();
  fill('black');
  textSize(13);
  textAlign(CENTER, BOTTOM);
  text('R = ' + formatSI(R, 'Ω', 2, true), (rStart + rEnd) / 2, yTop - 8);
  textAlign(LEFT, CENTER);
  text('C = ' + formatSI(C, 'F', 2, true), nX + 16, yMid);
  text('Vout', tOut + 6, yMid);
  textAlign(RIGHT, CENTER);
  text('Vin', tIn - 6, yMid);
}

function freqX(p, f) { return p.x + Math.log(f / F_START) / Math.log(F_END / F_START) * p.w; }
function xFreq(p, x) { return F_START * Math.pow(F_END / F_START, (x - p.x) / p.w); }

function inside(p) {
  return mouseX >= p.x && mouseX <= p.x + p.w && mouseY >= p.y && mouseY <= p.y + p.h;
}

// Hovering over either plot moves the frequency cursor.  Within SNAP_PX pixels of
// fc/10, fc, 10 fc or 100 fc it snaps there and then follows fc as R or C change.
function updateCursor(fc) {
  if (!inside(plots.gain) && !inside(plots.phase)) return;
  const p = plots.gain;
  for (const s of SNAP) {
    const f = s.k * fc;
    if (f >= F_START && f <= F_END && Math.abs(freqX(p, f) - mouseX) <= SNAP_PX) {
      cursor = { rel: s.k };
      return;
    }
  }
  cursor = { abs: xFreq(p, mouseX) };
}

function cursorInfo(fc) {
  let f, name = null;
  if (cursor.rel !== undefined) {
    f = cursor.rel * fc;
    if (f >= F_START && f <= F_END) name = SNAP.find(s => s.k === cursor.rel).name;
  } else {
    f = cursor.abs;
  }
  f = constrain(f, F_START, F_END);
  return { f: f, name: name };
}

function drawPanel(p) {
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
}

const DECADE_LABELS = ['1', '10', '100', '1k', '10k', '100k'];

function drawFrequencyGrid(p, showAxisLabel) {
  for (let d = 0; d <= 5; d++) {
    const decade = Math.pow(10, d);
    for (let m = 1; m < 10; m++) {
      const f = decade * m;
      if (f > F_END * 1.0001) break;
      stroke(m === 1 ? '#b8b8b8' : '#e4e4e4');
      line(freqX(p, f), p.y, freqX(p, f), p.y + p.h);
    }
    noStroke();
    fill('black');
    textSize(tickSize());
    textAlign(CENTER, TOP);
    text(DECADE_LABELS[d], freqX(p, decade), p.y + p.h + 4);
  }
  if (showAxisLabel) {
    noStroke();
    fill('black');
    textSize(isNarrow() ? 13 : 14);
    textAlign(CENTER, TOP);
    text(fitText(['Frequency f (Hz), logarithmic scale', 'Frequency f (Hz), log scale', 'f (Hz), log scale'],
      p.w), p.x + p.w / 2, p.y + p.h + 20);
  }
}

// clip drawing to the plot rectangle (curves leave the axis range)
function clipToPlot(p) {
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(p.x, p.y, p.w, p.h);
  drawingContext.clip();
}
function unclipPlot() { drawingContext.restore(); }

function drawCurve(p, fn, Y, col, weight, dash) {
  stroke(col);
  strokeWeight(weight);
  drawingContext.setLineDash(dash);
  noFill();
  beginShape();
  const samples = Math.max(300, Math.floor(p.w * 2));
  for (let i = 0; i <= samples; i++) {
    const f = F_START * Math.pow(F_END / F_START, i / samples);
    vertex(freqX(p, f), Y(fn(f)));
  }
  endShape();
  drawingContext.setLineDash([]);
  strokeWeight(1);
}

// straight-line asymptotes are exact polylines between their break points
function drawAsymptote(p, fn, breaks, Y) {
  const fs = [F_START, F_END].concat(breaks.filter(f => f > F_START && f < F_END)).sort((a, b) => a - b);
  stroke(ASYM_COLOR);
  strokeWeight(1.5);
  drawingContext.setLineDash([6, 4]);
  noFill();
  beginShape();
  for (const f of fs) vertex(freqX(p, f), Y(fn(f)));
  endShape();
  drawingContext.setLineDash([]);
  strokeWeight(1);
}

function drawCornerLine(p, fc) {
  if (fc < F_START || fc > F_END) return;
  stroke(CORNER_COLOR);
  strokeWeight(2);
  drawingContext.setLineDash([3, 3]);
  line(freqX(p, fc), p.y, freqX(p, fc), p.y + p.h);
  drawingContext.setLineDash([]);
  strokeWeight(1);
}

function drawCursorLine(p, f, y, col) {
  stroke('dimgray');
  drawingContext.setLineDash([4, 4]);
  line(freqX(p, f), p.y, freqX(p, f), p.y + p.h);
  drawingContext.setLineDash([]);
  if (y >= p.y && y <= p.y + p.h) {
    stroke('white');
    strokeWeight(1.5);
    fill(col);
    circle(freqX(p, f), y, 9);
    strokeWeight(1);
  }
}

// Caption above a plot: a bold name on the left and the cursor read-out on the right.
// Candidates go from longest to shortest; the longest read-out that fits is preferred.
function drawCaption(p, names, readouts, col) {
  noStroke();
  textSize(captionSize());
  textStyle(BOLD);
  const nameW = names.map(n => fontWidth(n));
  textStyle(NORMAL);
  let name = names[names.length - 1], readout = readouts[readouts.length - 1], found = false;
  for (let r = 0; r < readouts.length && !found; r++) {
    for (let n = 0; n < names.length && !found; n++) {
      if (nameW[n] + 12 + fontWidth(readouts[r]) <= p.w) { name = names[n]; readout = readouts[r]; found = true; }
    }
  }
  fill('black');
  textAlign(LEFT, BOTTOM);
  textStyle(BOLD);
  text(name, p.x, p.y - 4);
  textStyle(NORMAL);
  fill(col);
  textAlign(RIGHT, BOTTOM);
  text(readout, p.x + p.w, p.y - 4);
}

function cursorTags(cur) {
  const hz = formatHz(cur.f);
  return cur.name ? ['f = ' + cur.name + ' = ' + hz, hz] : ['f = ' + hz, hz];
}

function drawGainPlot(p, fc, cur, showAsym) {
  const Y = db => p.y + p.h - (db - DB_MIN) / (DB_MAX - DB_MIN) * p.h;
  drawPanel(p);
  drawFrequencyGrid(p, false);
  textSize(tickSize());
  for (let db = DB_MIN; db <= 0; db += 20) {
    stroke(db === 0 ? 'gray' : '#e4e4e4');
    line(p.x, Y(db), p.x + p.w, Y(db));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(signed(db, 0), p.x - 5, Y(db));
  }
  drawCornerLine(p, fc);

  clipToPlot(p);
  if (showAsym) drawAsymptote(p, f => gainAsymptote(f, fc), [fc], Y);
  drawCurve(p, f => gainDb(f, fc), Y, GAIN_COLOR, 2.5, []);
  unclipPlot();

  drawSlopeTriangle(p, fc, Y);
  drawCornerTags(p, fc, Y);

  // -3 dB point at the corner
  if (fc >= F_START && fc <= F_END) {
    const x = freqX(p, fc), y = Y(gainDb(fc, fc));
    noStroke();
    fill(CORNER_COLOR);
    circle(x, y, 7);
    fill(CORNER_TEXT);
    textSize(tickSize());
    textAlign(RIGHT, TOP);
    text('−3 dB', x - 7, y + 5);
  }

  const db = gainDb(cur.f, fc);
  const mag = Math.pow(10, db / 20);
  drawCursorLine(p, cur.f, Y(db), GAIN_COLOR);
  const tags = cursorTags(cur);
  const magStr = mag >= 0.001 ? mag.toPrecision(3) : mag.toExponential(2);
  drawCaption(p, ['Gain |H(f)| (dB)', 'Gain (dB)'],
    [tags[0] + ':  |H| = ' + magStr + ' = ' + signed(db, 2) + ' dB',
      tags[1] + ':  |H| = ' + magStr + ' = ' + signed(db, 2) + ' dB',
      tags[1] + ':  ' + signed(db, 2) + ' dB', signed(db, 2) + ' dB'], GAIN_TEXT);
}

// fc label at the top of the gain plot, or an arrow when fc is off the frequency axis
function drawCornerTags(p, fc, Y) {
  noStroke();
  fill(CORNER_TEXT);
  textSize(tickSize());
  textStyle(BOLD);
  const tag = 'fc = ' + formatHz(fc);
  if (fc > F_END) {
    textAlign(RIGHT, TOP);
    text(tag + ' (off scale) →', p.x + p.w - 4, p.y + 4);
  } else if (fc < F_START) {
    textAlign(LEFT, TOP);
    text('← ' + tag + ' (off scale)', p.x + 4, p.y + p.h - 20);
  } else {
    const x = freqX(p, fc);
    if (x + 5 + fontWidth(tag) <= p.x + p.w - 2) {
      textAlign(LEFT, TOP);
      text(tag, x + 5, p.y + 3);
    } else {
      textAlign(RIGHT, TOP);
      text(tag, x - 5, p.y + 3);
    }
  }
  textStyle(NORMAL);
}

// Triangle over the decade from fa = max(10 fc, 1 Hz) to fb = 10 fa: the gain falls by
// (very nearly) 20 dB over one decade once f is well above fc.
function drawSlopeTriangle(p, fc, Y) {
  const fa = Math.max(10 * fc, F_START), fb = 10 * fa;
  textSize(tickSize());
  noStroke();
  if (fb > F_END * 1.0001) {
    const note = fitText(['The −20 dB/decade region (10·fc to 100·fc) is above 100 kHz: raise R or C.',
      '−20 dB/decade region is above 100 kHz', 'Roll-off is off scale'], p.w - 16);
    fill(255, 255, 255, 220);
    rect(p.x + 3, p.y + p.h - 22, fontWidth(note) + 8, 18);
    fill('black');
    textAlign(LEFT, BOTTOM);
    text(note, p.x + 7, p.y + p.h - 6);
    return;
  }
  const ga = gainDb(fa, fc), gb = gainDb(fb, fc);
  const xa = freqX(p, fa), xb = freqX(p, fb), ya = Y(ga), yb = Y(gb);
  stroke('black');
  strokeWeight(1.2);
  line(xa, ya, xb, ya);
  line(xb, ya, xb, yb);
  strokeWeight(1);
  noStroke();
  fill('black');
  textAlign(CENTER, BOTTOM);
  text('1 decade', (xa + xb) / 2, ya - 3);

  // measured drop: right of the vertical leg, else inside the triangle if the curve leaves room
  const drop = signed(gb - ga, 1) + ' dB';
  const dropW = fontWidth(drop);
  if (xb + 6 + dropW <= p.x + p.w - 2) {
    textAlign(LEFT, CENTER);
    text(drop, xb + 6, (ya + yb) / 2);
  } else {
    const yBottom = ya + 4 + tickSize() + 2;
    const dbBottom = DB_MIN + (p.y + p.h - yBottom) / p.h * (DB_MAX - DB_MIN);
    const fCurve = fc * Math.sqrt(Math.pow(10, -dbBottom / 10) - 1);   // curve frequency at that level
    if (freqX(p, fCurve) + 4 <= xb - 6 - dropW) {
      textAlign(RIGHT, TOP);
      text(drop, xb - 6, ya + 4);
    }
  }

  // slope label under the curve, left of the middle of the decade (or right of the triangle)
  const fm = Math.sqrt(fa * fb);
  const slope = 'slope −20 dB/decade';
  textStyle(BOLD);
  const slopeW = fontWidth(slope);
  const th = tickSize();
  let sx, sy;                                   // top-left corner of the label
  if (freqX(p, fm) - 6 - slopeW >= p.x + 4) {
    sx = freqX(p, fm) - 6 - slopeW;
    sy = Y(gainDb(fm, fc)) + 8;
  } else {
    sx = xb + 6;
    sy = ya - 4 - th;
  }
  fill(255, 255, 255, 210);                     // keeps the label readable over grid and fc lines
  rect(sx - 3, sy - 2, slopeW + 6, th + 5);
  fill('black');
  textAlign(LEFT, TOP);
  text(slope, sx, sy);
  textStyle(NORMAL);
}

function drawPhasePlot(p, fc, cur, showAsym) {
  const Y = deg => p.y + p.h - (deg - PH_MIN) / (PH_MAX - PH_MIN) * p.h;
  drawPanel(p);
  drawFrequencyGrid(p, true);
  const labelStep = p.h * 15 / (PH_MAX - PH_MIN) >= 16 ? 15 : 45;
  textSize(tickSize());
  for (let deg = 0; deg >= -90; deg -= 15) {
    stroke(deg === 0 ? 'gray' : (deg % 45 === 0 ? '#c8c8c8' : '#ececec'));
    line(p.x, Y(deg), p.x + p.w, Y(deg));
    if (deg % labelStep === 0) {
      noStroke();
      fill('black');
      textAlign(RIGHT, CENTER);
      text(signed(deg, 0) + '°', p.x - 5, Y(deg));
    }
  }
  drawCornerLine(p, fc);

  clipToPlot(p);
  if (showAsym) drawAsymptote(p, f => phaseAsymptote(f, fc), [fc / 10, fc * 10], Y);
  drawCurve(p, f => phaseDeg(f, fc), Y, PHASE_COLOR, 2.5, []);
  unclipPlot();

  if (fc >= F_START && fc <= F_END) {
    const x = freqX(p, fc), y = Y(-45);
    noStroke();
    fill(CORNER_COLOR);
    circle(x, y, 7);
    fill(CORNER_TEXT);
    textSize(tickSize());
    textAlign(RIGHT, TOP);
    text('−45°', x - 7, y + 5);
  }

  const deg = phaseDeg(cur.f, fc);
  drawCursorLine(p, cur.f, Y(deg), PHASE_COLOR);
  const tags = cursorTags(cur);
  drawCaption(p, ['Phase ∠H(f) (degrees)', 'Phase (°)'],
    [tags[0] + ':  ' + signed(deg, 1) + '°', tags[1] + ':  ' + signed(deg, 1) + '°', signed(deg, 1) + '°'],
    PHASE_COLOR);
}

function drawControlLabels(R, C) {
  const narrow = isNarrow();
  noStroke();
  fill('black');
  textSize(narrow ? 14 : defaultTextSize);
  textAlign(LEFT, CENTER);
  text('Resistance R: ' + formatSI(R, 'Ω', 2, true), 10, drawHeight + 21);
  text('Capacitance C: ' + formatSI(C, 'F', 2, true), 10, drawHeight + 56);

  if (!narrow) {
    const x0 = 290;
    textSize(14);
    fill('dimgray');
    text(fitText(['Hover over a plot to move the cursor; it snaps to fc/10, fc, 10·fc and 100·fc.',
      'Hover over a plot to move the cursor (snaps to fc, 10·fc …).', 'Hover over a plot to read values.'],
      canvasWidth - x0 - margin), x0, drawHeight + 89);
  }
}

function positionControls() {
  const narrow = isNarrow();
  sliderLeftMargin = narrow ? 165 : 195;
  rSlider.position(sliderLeftMargin, drawHeight + 12);
  rSlider.size(canvasWidth - sliderLeftMargin - margin);
  cSlider.position(sliderLeftMargin, drawHeight + 47);
  cSlider.size(canvasWidth - sliderLeftMargin - margin);
  asymptoteCheckbox.position(6, drawHeight + 78);
  asymptoteCheckbox.style('font-size', narrow ? '14px' : '16px');
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

let controlsLaidOutAt = -1;   // canvas width the controls were last positioned for

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  if (typeof rSlider !== 'undefined' && rSlider && controlsLaidOutAt !== canvasWidth) {
    positionControls();
    controlsLaidOutAt = canvasWidth;
  }
}
