// Sine Wave MicroSim
// CANVAS_HEIGHT: 570
// Plots y(t) = A sin(2*pi*t/T + phi) with sliders for amplitude, period and phase.
// The time axis is in milliseconds, so the Period slider is the true period of the plotted wave.

// Canvas dimensions
let canvasWidth = 670;          // overwritten from the container in updateCanvasSize()
let drawHeight = 460;
let controlHeight = 110;
let canvasHeight = drawHeight + controlHeight;
let margin = 25;
let sliderLeftMargin = 150;
let defaultTextSize = 16;

// Plot window: time runs from -5 ms to +5 ms, y from -Y_RANGE to +Y_RANGE
const T_WINDOW_MIN = -5;
const T_WINDOW_MAX = 5;
const Y_RANGE = 2.4;

// Highlight colors used for the A, T and time-shift markers
const GOLD = '#B8860B';
const GOLD_TEXT = '#7A5800';

// UI controls
let amplitudeSlider, periodSlider, phaseSlider;

// Plot geometry, recomputed every frame from canvasWidth
let plotLeft, plotRight, plotTop, plotBottom, plotCY, pxPerMs, yScale;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textFont('Arial');
  textSize(defaultTextSize);

  // Amplitude A in arbitrary units (0 to 2)
  amplitudeSlider = createSlider(0, 2, 1, 0.05);
  amplitudeSlider.position(sliderLeftMargin, drawHeight + 12);
  amplitudeSlider.attribute('aria-label', 'Amplitude A');

  // Period T in milliseconds (0.5 to 5 ms, so frequency runs from 200 Hz to 2 kHz)
  periodSlider = createSlider(0.5, 5, 4, 0.1);
  periodSlider.position(sliderLeftMargin, drawHeight + 47);
  periodSlider.attribute('aria-label', 'Period T in milliseconds');

  // Phase phi in degrees (-180 to +180)
  phaseSlider = createSlider(-180, 180, 0, 5);
  phaseSlider.position(sliderLeftMargin, drawHeight + 82);
  phaseSlider.attribute('aria-label', 'Phase phi in degrees');

  sizeSliders();
  describe('Plot of y(t) = A sin(2 pi t / T + phi) over a 10 millisecond window. ' +
           'Three sliders set the amplitude A, the period T and the phase phi. ' +
           'The plot marks the amplitude, one period and the time shift, and a panel shows the frequency and angular frequency.');
}

function draw() {
  updateCanvasSize();
  if (width !== canvasWidth) resizeCanvas(canvasWidth, canvasHeight);

  // Slider values and derived quantities
  const A = amplitudeSlider.value();
  const T = periodSlider.value();            // ms
  const phiDeg = phaseSlider.value();
  const phi = radians(phiDeg);               // rad
  const f = 1000 / T;                        // Hz
  const omega = TWO_PI * f;                  // rad/s
  const dt = -phi * T / TWO_PI;              // ms; wave = A sin(2 pi (t - dt)/T)
  const y0 = A * sin(phi);

  // Backgrounds
  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  // Read-out text (decides how tall the read-out band is)
  textSize(defaultTextSize);
  const eq = 'y(t) = ' + A.toFixed(2) + ' sin(2π t / ' + T.toFixed(1) + ' ms ' +
             (phi < 0 ? '−' : '+') + ' ' + Math.abs(phi).toFixed(2) + ' rad)';
  const dir = Math.abs(dt) < 0.005 ? '' : (dt < 0 ? ' (left)' : ' (right)');
  const l2 = 'f = 1/T = ' + formatFreq(f) + '     ω = 2πf = ' + omega.toFixed(0) + ' rad/s';
  const l3 = 'time shift Δt = ' + fmt(dt, 2) + ' ms' + dir + '     y(0) = ' + fmt(y0, 2);
  let lines = [eq, l2 + '     ' + l3];
  if (textWidth(lines[1]) > canvasWidth - 20) lines = [eq, l2, l3];

  // Plot geometry
  const bandHeight = 8 + lines.length * 22;
  plotLeft = 40;
  plotRight = canvasWidth - 16;
  plotTop = bandHeight + 22;
  plotBottom = drawHeight - 46;
  plotCY = (plotTop + plotBottom) / 2;
  pxPerMs = (plotRight - plotLeft) / (T_WINDOW_MAX - T_WINDOW_MIN);
  yScale = (plotBottom - plotTop) / 2 / Y_RANGE;

  drawReadout(lines);
  drawGridAndAxes();
  drawMarkers(A, T, dt);
  drawWave(A, T, phi, y0);
  drawControlLabels(A, T, phiDeg);
}

// ---------------------------------------------------------------- drawing

function drawReadout(lines) {
  fill('black');
  noStroke();
  textSize(defaultTextSize);
  textAlign(LEFT, TOP);
  for (let i = 0; i < lines.length; i++) {
    // shrink slightly (never below 14 px) so that a line fits on very narrow canvases
    const w = textWidth(lines[i]);
    const avail = canvasWidth - 16;
    textSize(w > avail ? constrain(defaultTextSize * avail / w, 14, defaultTextSize) : defaultTextSize);
    text(lines[i], 8, 6 + i * 22);
  }
  textSize(defaultTextSize);
}

function tToX(t) {
  return plotLeft + (t - T_WINDOW_MIN) * pxPerMs;
}

function yToPx(y) {
  return plotCY - y * yScale;
}

function drawGridAndAxes() {
  // light grid: one line per millisecond and per unit of amplitude
  stroke(212);
  strokeWeight(1);
  for (let t = T_WINDOW_MIN; t <= T_WINDOW_MAX; t++) {
    line(tToX(t), plotTop, tToX(t), plotBottom);
  }
  for (let y = -2; y <= 2; y++) {
    line(plotLeft, yToPx(y), plotRight, yToPx(y));
  }

  // plot frame
  noFill();
  stroke('silver');
  rect(plotLeft, plotTop, plotRight - plotLeft, plotBottom - plotTop);

  // dashed axes through the origin (t = 0 and y = 0)
  stroke('gray');
  strokeWeight(1);
  drawingContext.setLineDash([5, 5]);
  line(plotLeft, yToPx(0), plotRight, yToPx(0));
  line(tToX(0), plotTop, tToX(0), plotBottom);
  drawingContext.setLineDash([]);

  // tick labels
  noStroke();
  fill(60);
  textSize(14);
  textAlign(CENTER, TOP);
  const step = pxPerMs >= 30 ? 1 : 2;
  for (let t = T_WINDOW_MIN; t <= T_WINDOW_MAX; t++) {
    if (t % step === 0 || step === 1) text(fmt(t, 0), tToX(t), plotBottom + 4);
  }
  textAlign(RIGHT, CENTER);
  for (let y = -2; y <= 2; y++) {
    text(fmt(y, 0), plotLeft - 5, yToPx(y));
  }

  // axis titles
  textSize(defaultTextSize);
  fill('black');
  textAlign(CENTER, TOP);
  text('t (ms)', (plotLeft + plotRight) / 2, plotBottom + 23);
  textAlign(LEFT, BOTTOM);
  text('y(t)', 6, plotTop - 4);
}

// Dashed lines at +/-A, a dimension line one period wide, and an arrow showing the time shift
function drawMarkers(A, T, dt) {
  textSize(defaultTextSize);

  // amplitude: dashed lines at +A and -A
  if (A > 0.001) {
    stroke(GOLD);
    strokeWeight(2);
    drawingContext.setLineDash([7, 5]);
    line(plotLeft, yToPx(A), plotRight, yToPx(A));
    line(plotLeft, yToPx(-A), plotRight, yToPx(-A));
    drawingContext.setLineDash([]);
    noStroke();
    fill(GOLD_TEXT);
    textAlign(RIGHT, BOTTOM);
    text('+A', plotRight - 4, yToPx(A) - 2);
    textAlign(RIGHT, TOP);
    text('−A', plotRight - 4, yToPx(-A) + 2);
  }

  // period: dimension line between two consecutive upward zero crossings
  let s = dt;                                  // one upward zero crossing, |dt| <= T/2
  if (s + T > T_WINDOW_MAX) s = dt - T;        // keep the whole period inside the window
  const e = s + T;
  const xs = tToX(s), xe = tToX(e);
  const yb = yToPx(-2.2);
  stroke(GOLD);
  strokeWeight(1);
  drawingContext.setLineDash([2, 3]);
  line(xs, yToPx(0), xs, yb);
  line(xe, yToPx(0), xe, yb);
  drawingContext.setLineDash([]);
  strokeWeight(2);
  line(xs, yb, xe, yb);
  if (xe - xs >= 40) {
    arrowHead(xs + 1, yb, -1);
    arrowHead(xe - 1, yb, 1);
  } else {
    line(xs, yb - 5, xs, yb + 5);
    line(xe, yb - 5, xe, yb + 5);
  }
  const label = 'T = ' + T.toFixed(1) + ' ms';
  const lw = textWidth(label);
  if (xe - xs >= lw + 24) {
    labelBox(label, (xs + xe) / 2, yb, CENTER, CENTER);
  } else if (xe + 8 + lw < plotRight) {
    labelBox(label, xe + 8, yb, LEFT, CENTER);
  } else {
    labelBox(label, xs - 8, yb, RIGHT, CENTER);
  }

  // phase: arrow along the time axis from t = 0 to the nearest upward zero crossing
  if (Math.abs(dt) > 0.005) {
    const x0 = tToX(0), x1 = tToX(dt), ya = yToPx(0);
    stroke(GOLD);
    strokeWeight(4);
    line(x0, ya, x1 - Math.sign(dt) * 2, ya);
    arrowHead(x1, ya, Math.sign(dt));
    // between the arrow and its label the wave lies above the axis when dt < 0, so label the other side;
    // a very short arrow is left unlabeled (the read-out panel gives the value)
    if (Math.abs(x1 - x0) >= 12) {
      if (dt < 0) labelBox('\u0394t', (x0 + x1) / 2, ya + 8, CENTER, TOP);
      else labelBox('\u0394t', (x0 + x1) / 2, ya - 8, CENTER, BOTTOM);
    }
  }
}

// Filled arrow head with its tip at (x, y), pointing right when dir = 1 and left when dir = -1
function arrowHead(x, y, dir) {
  noStroke();
  fill(GOLD);
  triangle(x, y, x - dir * 11, y - 5, x - dir * 11, y + 5);
  stroke(GOLD);
}

// Highlight-colored label on a small background box so grid lines do not run through it
function labelBox(str, x, y, hAlign, vAlign) {
  textAlign(hAlign, vAlign);
  const w = textWidth(str) + 8;
  const h = 20;
  const left = hAlign === CENTER ? x - w / 2 : (hAlign === LEFT ? x - 4 : x - w + 4);
  const top = vAlign === CENTER ? y - h / 2 : (vAlign === BOTTOM ? y - h + 2 : y - 2);
  push();
  noStroke();
  fill('aliceblue');
  rect(left, top, w, h, 3);
  fill(GOLD_TEXT);
  text(str, x, y);
  pop();
}

function drawWave(A, T, phi, y0) {
  noFill();
  stroke('blue');
  strokeWeight(pxPerMs * T < 24 ? 2 : 3);     // thinner line when cycles are only a few pixels wide
  beginShape();
  for (let px = plotLeft; px <= plotRight; px++) {
    const t = T_WINDOW_MIN + (px - plotLeft) / pxPerMs;
    vertex(px, yToPx(A * sin(TWO_PI * t / T + phi)));
  }
  endShape();

  // the value at t = 0 is set by the amplitude and the phase
  stroke('blue');
  strokeWeight(2);
  fill('white');
  circle(tToX(0), yToPx(y0), 10);
}

function drawControlLabels(A, T, phiDeg) {
  fill('black');
  noStroke();
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  text('Amplitude A: ' + A.toFixed(2), 10, drawHeight + 22);
  text('Period T: ' + T.toFixed(1) + ' ms', 10, drawHeight + 57);
  text('Phase φ: ' + fmt(phiDeg, 0) + '°', 10, drawHeight + 92);
}

// ---------------------------------------------------------------- helpers

// Number to fixed digits using a true minus sign and never "-0.00"
function fmt(v, digits) {
  const s = Math.abs(v) < 0.5 * Math.pow(10, -digits) ? (0).toFixed(digits) : v.toFixed(digits);
  return s.replace('-', '−');
}

function formatFreq(f) {
  return f >= 1000 ? (f / 1000).toFixed(2) + ' kHz' : f.toFixed(1) + ' Hz';
}

function sizeSliders() {
  const w = canvasWidth - sliderLeftMargin - margin;
  if (amplitudeSlider) amplitudeSlider.size(w);
  if (periodSlider) periodSlider.size(w);
  if (phaseSlider) phaseSlider.size(w);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = Math.floor(container.getBoundingClientRect().width);
  sizeSliders();
}
