// Reverb MicroSim: dry/wet mix and decay time of a convolution reverb
// CANVAS_HEIGHT: 420
// p5.js 2.3.2 + p5.sound 0.4.1.  Based on the p5.Reverb reference example
// (https://p5js.org/reference/p5.sound/p5.Reverb/).
//
// p5.sound 0.4.1 notes (differs from the old 1.x addon):
//   * there is no reverb.process() or reverb.drywet().  Route a source with
//     source.connect(reverb), set the mix with reverb.wet(0..1) and the decay
//     time with reverb.set(seconds).
//   * every source also plays straight to the speakers.  We call
//     soundFile.disconnect() first so the clip is heard ONLY through the
//     reverb, whose wet() control is then a true dry/wet crossfade.
//   * a looping file is started with loop() followed by play().
//   * NEVER call stop() on a sound that has been paused: it then plays
//     silently forever.  pause() is no better here: it leaves a constant (DC)
//     sample value on the output, which the level meters and the reverb see.
//     So the clip is started once and the Stop button fades it to silence
//     with amp(0); Play jumps back to 0:00 and fades it in again.
//
// How the reverb is built (Tone.js Reverb inside p5.sound 0.4.1): the impulse
// response is stereo white noise times an exponential envelope with time
// constant tau = ln(decay + 1) / ln(200) seconds, cut to zero at `decay`
// seconds.  Its level therefore falls 60 dB in RT60 = tau * ln(1000) seconds.

const CLIP_FILE = 'Damscray_DancingTiger.mp3';
const CLIP_AMP = 0.5;                 // modest playback level
const HISTORY_SECONDS = 8;            // width of the level-history plot
const DB_MIN = -80;                   // bottom of the level axis (dBFS)
const DB_MAX = 0;                     // top of the level axis (dBFS)

// ---- layout ----------------------------------------------------------------
let canvasWidth = 400;                // overwritten from the container in updateCanvasSize()
let drawHeight = 310;
let controlHeight = 110;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 165;
let defaultTextSize = 16;

// ---- colors ----------------------------------------------------------------
const DRY_COLOR = [30, 90, 200];      // blue: the dry source signal
const OUT_COLOR = [128, 0, 32];       // maroon: what you hear (after the reverb)
const STOP_COLOR = [184, 134, 11];    // gold: the moment the source stopped

// ---- audio state -------------------------------------------------------------
let soundFile = null;
let reverb = null;
let dryMeter = null;                  // level of the clip before the reverb
let outMeter = null;                  // level of the reverb output (what you hear)
let isPlaying = false;                // true while the clip is audible
let clipStarted = false;              // the looping player is started once, then muted/unmuted
let appliedDecay = 3;                 // decay time (s) the reverb was last built with
let statusText = 'Loading the music clip ...';
let stopTime = null;                  // seconds (millis()/1000) when Stop was pressed
let stopMarkT = null;                 // when the dry level actually fell silent (audio is scheduled ~0.1 s ahead)
let history = [];                     // {t, dry, out} level samples in dBFS
let shown = { t: -1, dry: -100, out: -100 };   // numeric read-outs, refreshed 4 times a second

// ---- controls (p5 built-ins) -----------------------------------------------
let playButton, decaySlider, wetSlider;

async function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  playButton = createButton('Play');
  playButton.mouseClicked(togglePlay);        // 'click' also fires for Enter/Space

  decaySlider = createSlider(1, 10, appliedDecay, 0.1);
  decaySlider.changed(applyDecay);            // rebuilding the impulse response is costly: apply on release

  wetSlider = createSlider(0, 100, 50, 1);
  wetSlider.input(applyWet);
  wetSlider.changed(applyWet);

  layoutControls();
  describe('A reverb demo. Play loops a short music clip through a reverb and Stop silences the clip. The Decay time slider sets how long the reverb rings and the Wet mix slider sets the dry/wet balance. A scrolling plot shows the level of the dry clip in blue and of the output you hear in maroon; after Stop the maroon reverb tail keeps sounding and fades away.');

  try {
    soundFile = await loadSound(CLIP_FILE);
    reverb = new p5.Reverb(appliedDecay);
    soundFile.disconnect();                   // hear the clip only through the reverb
    soundFile.connect(reverb);
    dryMeter = new p5.Amplitude();
    soundFile.connect(dryMeter);
    outMeter = new p5.Amplitude();
    reverb.connect(outMeter);
    soundFile.amp(CLIP_AMP);
    applyWet();
    statusText = 'Press Play to start';
  } catch (e) {
    statusText = 'Could not load ' + CLIP_FILE;
  }
}

function draw() {
  updateCanvasSize();
  background('aliceblue');

  // control region background
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  recordLevels();

  const wide = canvasWidth >= 620;
  const panelW = wide ? 215 : 0;

  // title
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(wide ? 22 : 18);
  text('Reverb: Dry/Wet Mix and Decay Time', canvasWidth / 2, 20);
  textSize(defaultTextSize);

  const plot = {
    left: 50,
    right: canvasWidth - margin - (wide ? panelW + 10 : 0),
    top: wide ? 64 : 100,
    bottom: drawHeight - 42
  };
  drawLevelPlot(plot);
  drawLegend(plot.left, plot.top - 15, wide);
  if (wide) drawReadoutPanel(canvasWidth - margin - panelW, 44, panelW, plot.bottom - 44);
  else drawCompactReadouts(margin, 44);

  // control labels (the controls themselves are DOM elements)
  fill(0);
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(defaultTextSize);
  text(statusText, margin + 102, drawHeight + 22);
  text('Decay time: ' + decaySlider.value().toFixed(1) + ' s', margin, drawHeight + 57);
  text('Wet mix: ' + wetSlider.value() + '%', margin, drawHeight + 92);
}

// ---- plots -------------------------------------------------------------------

function drawLevelPlot(p) {
  const now = millis() / 1000;
  const tToX = (t) => map(t - now, -HISTORY_SECONDS, 0, p.left, p.right);
  const dbToY = (db) => map(constrain(db, DB_MIN, DB_MAX), DB_MIN, DB_MAX, p.bottom, p.top);

  // plot background and grid
  stroke(200);
  strokeWeight(1);
  fill('white');
  rect(p.left, p.top, p.right - p.left, p.bottom - p.top);
  textSize(13);
  for (let db = DB_MIN; db <= DB_MAX; db += 20) {
    const y = dbToY(db);
    stroke(225);
    line(p.left, y, p.right, y);
    noStroke();
    fill(60);
    textAlign(RIGHT, CENTER);
    text(String(db), p.left - 5, y);
  }
  for (let s = 0; s <= HISTORY_SECONDS; s += 1) {
    const x = map(-s, -HISTORY_SECONDS, 0, p.left, p.right);
    stroke(235);
    line(x, p.top, x, p.bottom);
    noStroke();
    fill(60);
    textAlign(CENTER, TOP);
    text(s === 0 ? 'now' : '-' + s, x, p.bottom + 4);
  }
  textAlign(CENTER, TOP);
  text('time (seconds ago)', (p.left + p.right) / 2, p.bottom + 21);
  push();
  translate(14, (p.top + p.bottom) / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text('level (dBFS)', 0, 0);
  pop();

  // moment the dry clip actually fell silent after Stop
  if (stopMarkT !== null && now - stopMarkT <= HISTORY_SECONDS) {
    const x = tToX(stopMarkT);
    stroke(...STOP_COLOR);
    strokeWeight(2);
    drawingContext.setLineDash([5, 4]);
    line(x, p.top, x, p.bottom);
    drawingContext.setLineDash([]);
    noStroke();
    fill(...STOP_COLOR);
    textSize(13);
    textAlign(x > p.right - 100 ? RIGHT : LEFT, TOP);
    text('source stopped', x > p.right - 100 ? x - 4 : x + 4, p.top + 4);
  }

  // level traces
  noFill();
  strokeWeight(2);
  for (const key of ['dry', 'out']) {
    stroke(...(key === 'dry' ? DRY_COLOR : OUT_COLOR));
    beginShape();
    for (const h of history) {
      if (now - h.t > HISTORY_SECONDS) continue;
      vertex(tToX(h.t), dbToY(h[key]));
    }
    endShape();
  }

  strokeWeight(1);
  textSize(defaultTextSize);
}

// one-row legend above the plot
function drawLegend(x, y, wide) {
  const items = [
    [DRY_COLOR, wide ? 'Dry clip (reverb input)' : 'Dry clip (input)'],
    [OUT_COLOR, wide ? 'Output you hear (after reverb)' : 'Output you hear']
  ];
  const step = wide ? 200 : 140;
  textSize(14);
  textAlign(LEFT, CENTER);
  items.forEach(([col, label], i) => {
    const lx = x + i * step;
    strokeWeight(3);
    stroke(...col);
    line(lx, y, lx + 22, y);
    noStroke();
    fill(0);
    text(label, lx + 28, y);
  });
  strokeWeight(1);
  textSize(defaultTextSize);
}

function drawReadoutPanel(x, y, w, h) {
  const mix = mixGains();
  stroke(200);
  strokeWeight(1);
  fill('white');
  rect(x, y, w, h);
  noStroke();
  fill(0);
  textAlign(LEFT, CENTER);
  textSize(15);
  text('Equal-power mix', x + 10, y + 16);

  // dry and wet gain bars
  const barX = x + 50;
  const barW = w - 100;
  drawGainBar('Dry', mix.dry, DRY_COLOR, x + 10, barX, y + 42, barW);
  drawGainBar('Wet', mix.wet, OUT_COLOR, x + 10, barX, y + 68, barW);

  textSize(15);
  fill(0);
  const rows = [
    ['Decay time', appliedDecay.toFixed(1) + ' s'],
    ['RT60 (est.)', rt60Seconds(appliedDecay).toFixed(2) + ' s'],
    ['Dry clip', formatDb(shown.dry)],
    ['Output', formatDb(shown.out)]
  ];
  rows.forEach((r, i) => {
    const ry = y + 104 + i * 26;
    textAlign(LEFT, CENTER);
    text(r[0], x + 10, ry);
    textAlign(RIGHT, CENTER);
    text(r[1], x + w - 10, ry);
  });
  textSize(defaultTextSize);
}

function drawGainBar(label, g, col, labelX, barX, y, barW) {
  noStroke();
  fill(0);
  textAlign(LEFT, CENTER);
  text(label, labelX, y);
  fill(230);
  rect(barX, y - 7, barW, 14);
  fill(...col);
  rect(barX, y - 7, barW * g, 14);
  fill(0);
  text(g.toFixed(2), barX + barW + 6, y);
}

function drawCompactReadouts(x, y) {
  const mix = mixGains();
  noStroke();
  fill(0);
  textSize(14);
  textAlign(LEFT, CENTER);
  text('Dry gain ' + mix.dry.toFixed(2) + '   Wet gain ' + mix.wet.toFixed(2) +
       '   RT60 ' + rt60Seconds(appliedDecay).toFixed(2) + ' s', x, y);
  text('Dry clip ' + formatDb(shown.dry) + '   Output ' + formatDb(shown.out), x, y + 20);
  textSize(defaultTextSize);
}

// ---- audio -------------------------------------------------------------------

async function togglePlay() {
  await userStartAudio();                     // the audio context starts suspended
  if (!soundFile) return;
  if (isPlaying) {
    // Stop the SOURCE by fading the clip to silence.  The player keeps running
    // muted (no pause(), no stop(): see header), so the reverb input becomes
    // zero and only the reverb tail is left.
    soundFile.amp(0, 0.03);
    isPlaying = false;
    stopTime = millis() / 1000;
    playButton.html('Play');
    statusText = 'Stopped: hear the tail fade';
  } else {
    if (!clipStarted) {
      soundFile.loop();                       // loop() then play(): loop() alone is silent
      soundFile.play();
      clipStarted = true;
    } else {
      soundFile.jump(0);                      // restart the muted clip from its beginning
    }
    soundFile.amp(CLIP_AMP, 0.03);
    isPlaying = true;
    stopTime = null;
    stopMarkT = null;
    playButton.html('Stop');
    statusText = 'Playing (the clip loops)';
  }
}

function applyWet() {
  if (reverb) reverb.wet(wetSlider.value() / 100);
}

function applyDecay() {
  const d = decaySlider.value();
  if (!reverb || d === appliedDecay) return;
  reverb.set(d);                              // regenerates the impulse response
  appliedDecay = d;
}

// gains of the equal-power crossfade inside the reverb (Tone.js CrossFade)
function mixGains() {
  const w = wetSlider.value() / 100;
  return { dry: Math.cos(w * HALF_PI), wet: Math.sin(w * HALF_PI) };
}

// time for the impulse response to fall 60 dB (see header).  The closed form
// ignores the final 10 % of the envelope, where it is ramped to zero; for
// decay times of 1 s and more it is within 3 % of the measured value.
function rt60Seconds(decay) {
  return Math.log(1000) * Math.log(decay + 1) / Math.log(200);
}

function recordLevels() {
  const t = millis() / 1000;
  const toDb = (v) => 20 * Math.log10(Math.max(v, 1e-5));
  history.push({
    t: t,
    dry: dryMeter ? toDb(dryMeter.getLevel()) : -100,
    out: outMeter ? toDb(outMeter.getLevel()) : -100
  });
  while (history.length && t - history[0].t > HISTORY_SECONDS + 0.5) history.shift();
  const last = history[history.length - 1];
  if (stopTime !== null && stopMarkT === null && last.dry < -90) stopMarkT = t;
  if (t - shown.t >= 0.25) shown = { t: t, dry: latest('dry'), out: latest('out') };
}

function latest(key) {
  return history.length ? history[history.length - 1][key] : -100;
}

function formatDb(db) {
  return db <= DB_MIN ? 'below ' + DB_MIN + ' dB' : db.toFixed(0) + ' dB';
}

// ---- layout helpers ----------------------------------------------------------

function layoutControls() {
  playButton.position(margin, drawHeight + 10);
  playButton.size(90);
  decaySlider.position(sliderLeftMargin, drawHeight + 48);
  decaySlider.size(canvasWidth - sliderLeftMargin - margin);
  wetSlider.position(sliderLeftMargin, drawHeight + 83);
  wetSlider.size(canvasWidth - sliderLeftMargin - margin);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = Math.floor(container.getBoundingClientRect().width);
  if (typeof playButton !== 'undefined') layoutControls();
}
