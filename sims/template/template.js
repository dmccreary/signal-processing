// TITLE MicroSim
// CANVAS_HEIGHT: 520
//
// TEMPLATE for p5.js 2.3.2 MicroSims in this book. To start a new MicroSim:
//   1. Copy docs/sims/template/ to docs/sims/SIM_NAME/ and rename template.js to SIM_NAME.js.
//   2. In main.html update the <title> and the <script src="SIM_NAME.js"> line.
//   3. Replace TITLE and SIM_NAME in index.md and metadata.json, then rewrite their content.
//   4. Keep the layout skeleton: updateCanvasSize() first in setup(), CANVAS_HEIGHT on line 2
//      (= drawHeight + controlHeight), windowResized(), canvas.parent(document.querySelector('main')).
//   5. Replace the demo below with your own drawing code and controls.
//
// Demo: plots x(t) = A sin(2*pi*t/T + phi) over a 20 ms window next to the phi = 0
// reference. The OPTIONAL AUDIO block at the end plays the same sinusoid as a tone at
// f = 1/T; delete it (and the p5.sound <script> in main.html) if your MicroSim is silent.

// Canvas layout
let canvasWidth = 670;               // overwritten from the container in updateCanvasSize()
let drawHeight = 370;                // drawing region
let controlHeight = 150;             // control region: 4 rows of 35 px + padding
let canvasHeight = drawHeight + controlHeight;
let margin = 25;
let sliderLeftMargin = 170;          // room for the label + value drawn left of each slider
let defaultTextSize = 16;

// Controls: keep every control in a module-level variable
let ampSlider, periodSlider, phaseSlider;
let playButton;                      // OPTIONAL AUDIO

// Plot geometry (vertical positions are fixed; horizontal ones follow canvasWidth)
const T_WINDOW_MS = 20;              // time axis: 0 .. 20 ms
const Y_MAX = 2.4;                   // amplitude axis: -2.4 .. 2.4
const TITLE_Y = 22, INFO_Y = 48;
const PLOT_TOP = 66, PLOT_BOTTOM = 296;
const AXIS_LABEL_Y = 326, LEGEND_Y = 352;
let plotLeft = 55, plotRight = 645;

function setup() {
  updateCanvasSize();                // MUST be the first statement
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textFont('Arial');
  textSize(defaultTextSize);

  ampSlider = createSlider(0, 2, 1, 0.01);
  ampSlider.position(sliderLeftMargin, rowY(0) - 10);

  periodSlider = createSlider(1, 10, 5, 0.1);          // period T in ms
  periodSlider.position(sliderLeftMargin, rowY(1) - 10);

  phaseSlider = createSlider(-180, 180, 0, 1);         // phase in degrees
  phaseSlider.position(sliderLeftMargin, rowY(2) - 10);

  // OPTIONAL AUDIO: delete these three lines and the last control row for a silent sim
  playButton = createButton('Play Tone');
  playButton.position(10, rowY(3) - 12);
  playButton.mousePressed(toggleTone);

  updateCanvasSize();                // size the sliders now that they exist
  describe('A plot of the sinusoid x(t) = A sin(2 pi t / T + phi) in blue over a 20 millisecond window, with the zero-phase reference as a dashed gray line and a gold dot at x(0). Sliders set the amplitude A, the period T in milliseconds and the phase phi in degrees; a button plays the sinusoid as a tone at f = 1/T.');
}

// vertical centre of control row i
function rowY(i) {
  return drawHeight + 22 + 35 * i;
}

function draw() {
  updateCanvasSize();

  // read every control once per frame
  const A = ampSlider.value();
  const T = periodSlider.value();    // ms
  const phiDeg = phaseSlider.value();
  const phi = radians(phiDeg);

  // drawing region and control region
  background('aliceblue');
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  drawTitleAndReadout(A, T, phi);
  drawPlotFrame();
  drawSignal(t => A * sin(TWO_PI * t / T), 'gray', 2, [6, 6]);      // reference, phi = 0
  drawSignal(t => A * sin(TWO_PI * t / T + phi), 'blue', 3, []);    // x(t)
  drawStartMarker(A * sin(phi), cos(phi));
  drawLegend();
  drawControlLabels(A, T, phiDeg);

  updateTone(A, T);                  // OPTIONAL AUDIO
  drawToneStatus(T);                 // OPTIONAL AUDIO
}

// ---------------------------------------------------------------- drawing helpers

// value with two decimals and no "-0.00"
function fmt2(v) {
  return (abs(v) < 0.005 ? 0 : v).toFixed(2);
}

function tToX(t) {
  return map(t, 0, T_WINDOW_MS, plotLeft, plotRight);
}

function vToY(v) {
  return map(v, -Y_MAX, Y_MAX, PLOT_BOTTOM, PLOT_TOP);
}

function drawTitleAndReadout(A, T, phi) {
  const narrow = canvasWidth < 560;
  noStroke();
  fill('black');
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(narrow ? 17 : 20);
  text('Sine Wave: x(t) = A sin(2πt/T + φ)', canvasWidth / 2, TITLE_Y);   // TITLE: your title
  textStyle(NORMAL);
  textSize(defaultTextSize);
  const f = (1000 / T).toFixed(1);
  const x0 = fmt2(A * sin(phi));
  if (narrow) {
    text(`f = ${f} Hz     x(0) = ${x0}`, canvasWidth / 2, INFO_Y);
  } else {
    text(`f = 1/T = ${f} Hz      φ = ${fmt2(phi)} rad      x(0) = A sin φ = ${x0}`, canvasWidth / 2, INFO_Y);
  }
}

function drawPlotFrame() {
  noStroke();
  fill('white');
  rect(plotLeft, PLOT_TOP, plotRight - plotLeft, PLOT_BOTTOM - PLOT_TOP);

  // vertical grid and time ticks every 2 ms (every 4 ms when the plot is narrow)
  const step = (plotRight - plotLeft) / T_WINDOW_MS * 2 >= 36 ? 2 : 4;
  textSize(14);
  textAlign(CENTER, TOP);
  for (let t = 0; t <= T_WINDOW_MS; t += step) {
    const x = tToX(t);
    stroke('gainsboro');
    strokeWeight(1);
    line(x, PLOT_TOP, x, PLOT_BOTTOM);
    noStroke();
    fill('black');
    text(t, x, PLOT_BOTTOM + 6);
  }

  // horizontal grid and amplitude ticks
  textAlign(RIGHT, CENTER);
  for (let v = -2; v <= 2; v++) {
    const y = vToY(v);
    stroke(v === 0 ? 'gray' : 'gainsboro');
    strokeWeight(1);
    line(plotLeft, y, plotRight, y);
    noStroke();
    fill('black');
    text(v < 0 ? '−' + abs(v) : v, plotLeft - 10, y);
  }

  noFill();
  stroke('silver');
  rect(plotLeft, PLOT_TOP, plotRight - plotLeft, PLOT_BOTTOM - PLOT_TOP);

  // axis labels with units
  noStroke();
  fill('black');
  textSize(defaultTextSize);
  textAlign(CENTER, CENTER);
  text('time t (ms)', (plotLeft + plotRight) / 2, AXIS_LABEL_Y);
  push();
  translate(16, (PLOT_TOP + PLOT_BOTTOM) / 2);
  rotate(-HALF_PI);
  text('x(t)', 0, 0);
  pop();
}

// plot fn(t) (t in ms) with one vertex per pixel column
function drawSignal(fn, col, weight, dash) {
  stroke(col);
  strokeWeight(weight);
  noFill();
  drawingContext.setLineDash(dash);
  beginShape();
  for (let x = plotLeft; x <= plotRight; x++) {
    const t = map(x, plotLeft, plotRight, 0, T_WINDOW_MS);
    vertex(x, vToY(fn(t)));
  }
  endShape();
  drawingContext.setLineDash([]);
}

// gold highlight: the value x(0) = A sin(phi) set by the phase.
// The label goes on the side the curve leaves empty (slope at t = 0 is proportional to cos(phi)).
function drawStartMarker(x0, slope) {
  const x = tToX(0), y = vToY(x0);
  stroke('black');
  strokeWeight(1);
  fill('gold');
  circle(x, y, 12);
  let below = slope > 0;                     // rising curve: the space below-right is empty
  if (abs(slope) < 0.4) below = x0 < 0;      // near a peak or trough
  noStroke();
  fill('black');
  textSize(14);
  textAlign(LEFT, CENTER);
  text('x(0)', x + 9, y + (below ? 14 : -14));
}

// legend below the plot so it never hides the curves
function drawLegend() {
  const cx = (plotLeft + plotRight) / 2;
  const x1 = cx - 150, x2 = cx + 5;
  strokeWeight(3);
  stroke('blue');
  line(x1, LEGEND_Y, x1 + 30, LEGEND_Y);
  strokeWeight(2);
  stroke('gray');
  drawingContext.setLineDash([6, 6]);
  line(x2, LEGEND_Y, x2 + 30, LEGEND_Y);
  drawingContext.setLineDash([]);
  noStroke();
  fill('black');
  textSize(14);
  textAlign(LEFT, CENTER);
  text('x(t)', x1 + 38, LEGEND_Y);
  text('reference, φ = 0', x2 + 38, LEGEND_Y);
}

// label and current value to the left of each slider
function drawControlLabels(A, T, phiDeg) {
  noStroke();
  fill('black');
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  text('Amplitude A: ' + A.toFixed(2), 10, rowY(0));
  text('Period T: ' + T.toFixed(1) + ' ms', 10, rowY(1));
  text('Phase φ: ' + phiDeg + '°', 10, rowY(2));
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = container.offsetWidth;
  plotRight = canvasWidth - margin;
  const w = canvasWidth - sliderLeftMargin - margin;
  if (typeof ampSlider !== 'undefined') ampSlider.size(w);
  if (typeof periodSlider !== 'undefined') periodSlider.size(w);
  if (typeof phaseSlider !== 'undefined') phaseSlider.size(w);
}

// ============================================================================
// OPTIONAL AUDIO BLOCK (p5.sound 0.4.1)
// Keep it only if your MicroSim makes or analyses sound. To remove it, delete this
// block, the playButton lines in setup(), the two OPTIONAL AUDIO calls in draw() and
// the p5.sound <script> in main.html, then reduce controlHeight (and CANVAS_HEIGHT on
// line 2) by 35.
// p5.sound 0.4.1 is a Tone.js rewrite; its API differs from p5.sound 1.x:
//   - the audio context starts suspended: call userStartAudio() inside a click handler
//   - nothing plays until the user clicks; offer a visible Stop; keep amp() <= 0.3
//   - every source plays through the speakers by default; to analyse a source
//     WITHOUT playing it (always for the microphone) call source.disconnect() and
//     then source.connect(fft)
//   - new p5.FFT(size) takes ONE argument; analyze() returns linear magnitudes
//   - SoundFile: restart with pause() + jump(0); never stop() a paused sound
// ============================================================================
let osc = null;                      // created on the first click
let toneOn = false;
const TONE_GAIN = 0.15;              // A = 2 gives amp 0.3
let toneHz = 0, toneAmp = 0;         // last values sent to the oscillator

function toggleTone() {
  userStartAudio();                  // must run inside the click handler
  if (!osc) osc = new p5.Oscillator('sine');
  toneOn = !toneOn;
  if (toneOn) {
    toneHz = 1000 / periodSlider.value();
    toneAmp = TONE_GAIN * ampSlider.value();
    osc.freq(toneHz);
    osc.amp(toneAmp);
    osc.start();
    playButton.html('Stop Tone');
  } else {
    osc.stop();
    playButton.html('Play Tone');
  }
}

// follow the sliders while the tone plays (phase is not sent: it is inaudible)
function updateTone(A, T) {
  if (!toneOn) return;
  const hz = 1000 / T, amp = TONE_GAIN * A;
  if (hz !== toneHz) { osc.freq(hz, 0.05); toneHz = hz; }
  if (amp !== toneAmp) { osc.amp(amp, 0.05); toneAmp = amp; }
}

function drawToneStatus(T) {
  noStroke();
  fill('black');
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  const x = 10 + playButton.elt.offsetWidth + 12;
  text(toneOn ? `playing a ${(1000 / T).toFixed(1)} Hz tone` : 'tone off', x, rowY(3));
}
// ======================== end of OPTIONAL AUDIO BLOCK ========================
