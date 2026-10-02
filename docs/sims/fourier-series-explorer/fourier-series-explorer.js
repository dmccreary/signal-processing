// Fourier Series Explorer MicroSim
// CANVAS_HEIGHT: 625
// A periodic waveform x(t) is rebuilt from its Fourier series
//   x(t) = a0 + sum over n of [ a_n cos(n w0 t) + b_n sin(n w0 t) ]
// using the first N harmonics.  The lower plots show the amplitude and phase of
// each harmonic (or the a_n and b_n coefficients).  Step N up one harmonic at a
// time to watch the partial sum converge and to see the Gibbs overshoot.

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 670;
let drawHeight = 510;
let controlHeight = 115;
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 245;
let defaultTextSize = 16;

// ---- model ----
const N_MAX = 50;          // highest harmonic available
const GRID = 4096;         // points per period used for the partial sum and its statistics
const DRAW_M = 512;        // samples per period of the hand-drawn waveform
const PULSE_DUTY = 0.25;   // duty cycle of the pulse train
const STEP_MS = 550;       // time between harmonics while playing

const WAVES = [
  { id: 'square', label: 'Square wave', jump: 2 },
  { id: 'triangle', label: 'Triangle wave', jump: 0 },
  { id: 'sawtooth', label: 'Sawtooth wave', jump: 2 },
  { id: 'pulse', label: 'Pulse train (25% duty)', jump: 1 },
  { id: 'custom', label: 'Custom (draw your own)', jump: 0 }
];

// ---- controls ----
let waveSelect, playButton, backButton, forwardButton, resetButton, nSlider, harmonicsCheckbox, abCheckbox;

// ---- state ----
let playing = false;
let lastStepTime = 0;
let muted = new Array(N_MAX + 1).fill(false);   // harmonics switched off by clicking their bars
let selected = 1;                               // harmonic whose numbers are shown
let customWave = new Float64Array(DRAW_M);      // one period of the hand-drawn waveform
let customVersion = 0;
let lastDraw = null;                            // previous mouse sample while drawing
let cache = { key: '' };
let panels = {};

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  waveSelect = createSelect();
  for (const w of WAVES) waveSelect.option(w.label, w.id);
  waveSelect.selected('square');
  waveSelect.changed(() => { stopPlaying(); muted.fill(false); });

  playButton = createButton('Play');
  playButton.mousePressed(togglePlay);
  backButton = createButton('< Step');
  backButton.mousePressed(() => { stopPlaying(); nSlider.value(nSlider.value() - 1); });
  forwardButton = createButton('Step >');
  forwardButton.mousePressed(() => { stopPlaying(); nSlider.value(nSlider.value() + 1); });
  resetButton = createButton('Reset');
  resetButton.mousePressed(resetAll);

  nSlider = createSlider(1, N_MAX, 5, 1);
  nSlider.input(stopPlaying);

  harmonicsCheckbox = createCheckbox(' Show individual harmonics', false);
  abCheckbox = createCheckbox(' Show aₙ and bₙ', false);

  const mainElement = document.querySelector('main');
  [waveSelect, playButton, backButton, forwardButton, resetButton, nSlider, harmonicsCheckbox, abCheckbox]
    .forEach(c => c.parent(mainElement));
  resetCustomWave();
  positionControls();

  describe('A periodic waveform and the sum of its first N Fourier harmonics drawn over two periods, ' +
    'with bar charts of the amplitude and phase of each harmonic. Buttons step the number of harmonics up and down.', LABEL);
}

// ---------------------------------------------------------------------------
// Waveforms and Fourier coefficients
// ---------------------------------------------------------------------------

// The default custom waveform is a half-wave rectified sine, which has both a
// DC term and a mixture of sine and cosine harmonics.
function resetCustomWave() {
  for (let m = 0; m < DRAW_M; m++) customWave[m] = Math.max(0, Math.sin(2 * Math.PI * m / DRAW_M));
  customVersion++;
}

// Value of the original waveform at phase p (in periods).
function waveValue(kind, p) {
  p = p - Math.floor(p);
  if (kind === 'square') return p < 0.5 ? 1 : -1;
  if (kind === 'triangle') return p < 0.25 ? 4 * p : (p < 0.75 ? 2 - 4 * p : 4 * p - 4);
  if (kind === 'sawtooth') return p < 0.5 ? 2 * p : 2 * p - 2;
  if (kind === 'pulse') return (p < PULSE_DUTY / 2 || p >= 1 - PULSE_DUTY / 2) ? 1 : 0;
  const pos = p * DRAW_M, m = Math.floor(pos), f = pos - m;       // custom: linear interpolation
  return customWave[m % DRAW_M] * (1 - f) + customWave[(m + 1) % DRAW_M] * f;
}

// Fourier coefficients a0, a[1..N_MAX], b[1..N_MAX].
// The four standard waveforms use the closed-form results of the coefficient integrals;
// the custom waveform is integrated numerically over its DRAW_M samples.
function coefficients(kind) {
  const a = new Float64Array(N_MAX + 1), b = new Float64Array(N_MAX + 1);
  let a0 = 0;
  for (let n = 1; n <= N_MAX; n++) {
    const odd = n % 2 === 1;
    if (kind === 'square') {
      b[n] = odd ? 4 / (Math.PI * n) : 0;
    } else if (kind === 'triangle') {
      b[n] = odd ? 8 / (Math.PI * Math.PI * n * n) * ((n - 1) / 2 % 2 === 0 ? 1 : -1) : 0;
    } else if (kind === 'sawtooth') {
      b[n] = 2 / (Math.PI * n) * (odd ? 1 : -1);
    } else if (kind === 'pulse') {
      a[n] = 2 / (Math.PI * n) * Math.sin(Math.PI * n * PULSE_DUTY);
    }
  }
  if (kind === 'pulse') a0 = PULSE_DUTY;
  if (kind === 'custom') {
    const num = numericCoefficients(m => customWave[m], DRAW_M);
    return num;
  }
  return { a0: a0, a: a, b: b };
}

// a0 = (1/T) integral of x,  a_n = (2/T) integral of x cos(n w0 t),  b_n = (2/T) integral of x sin(n w0 t),
// evaluated as sums over M equally spaced samples of one period.
function numericCoefficients(sample, M) {
  const a = new Float64Array(N_MAX + 1), b = new Float64Array(N_MAX + 1);
  let a0 = 0;
  for (let m = 0; m < M; m++) a0 += sample(m) / M;
  for (let n = 1; n <= N_MAX; n++) {
    let sa = 0, sb = 0;
    for (let m = 0; m < M; m++) {
      const v = sample(m), th = 2 * Math.PI * n * m / M;
      sa += v * Math.cos(th);
      sb += v * Math.sin(th);
    }
    a[n] = 2 * sa / M;
    b[n] = 2 * sb / M;
  }
  return { a0: a0, a: a, b: b };
}

// Everything derived from the current settings.  Recomputed only when a setting changes.
function currentModel() {
  const kind = waveSelect.value(), N = nSlider.value();
  const key = [kind, N, muted.map(v => v ? 1 : 0).join(''), customVersion].join('|');
  if (key === cache.key) return cache;

  const c = coefficients(kind);
  const amp = new Float64Array(N_MAX + 1), phase = new Float64Array(N_MAX + 1);
  amp[0] = Math.abs(c.a0);
  phase[0] = c.a0 < 0 ? 180 : 0;
  let maxAmp = amp[0], maxCoef = Math.abs(c.a0);
  for (let n = 1; n <= N_MAX; n++) {
    amp[n] = Math.hypot(c.a[n], c.b[n]);                       // = 2 |c_n|
    phase[n] = Math.atan2(-c.b[n], c.a[n]) * 180 / Math.PI;    // angle of c_n = (a_n - j b_n) / 2
    maxAmp = Math.max(maxAmp, amp[n]);
    maxCoef = Math.max(maxCoef, Math.abs(c.a[n]), Math.abs(c.b[n]));
  }

  // partial sum on a fine grid over one period
  const sum = new Float64Array(GRID), orig = new Float64Array(GRID);
  let sq = 0, iPeak = 0, iTrough = 0;
  for (let i = 0; i < GRID; i++) {
    const th = 2 * Math.PI * i / GRID;
    let s = muted[0] ? 0 : c.a0;
    for (let n = 1; n <= N; n++) {
      if (!muted[n]) s += c.a[n] * Math.cos(n * th) + c.b[n] * Math.sin(n * th);
    }
    sum[i] = s;
    orig[i] = waveValue(kind, i / GRID);
    if (s > sum[iPeak]) iPeak = i;
    if (s < sum[iTrough]) iTrough = i;
    sq += (s - orig[i]) * (s - orig[i]) / GRID;
  }
  const jump = WAVES.find(w => w.id === kind).jump;
  cache = {
    key: key, kind: kind, N: N, c: c, amp: amp, phase: phase, maxAmp: maxAmp, maxCoef: maxCoef,
    sum: sum, orig: orig, rmsError: Math.sqrt(sq),
    // how far the highest peak (or lowest trough) of the partial sum lies beyond the waveform
    // at that instant, as a fraction of the jump height: the Gibbs overshoot
    overshoot: jump > 0 ? Math.max(sum[iPeak] - orig[iPeak], orig[iTrough] - sum[iTrough]) / jump : null
  };
  return cache;
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function togglePlay() {
  if (playing) { stopPlaying(); return; }
  if (nSlider.value() >= N_MAX) nSlider.value(1);   // restart from the fundamental
  playing = true;
  lastStepTime = millis();
  playButton.html('Pause');
}

function stopPlaying() {
  playing = false;
  if (playButton) playButton.html('Play');
}

function resetAll() {
  stopPlaying();
  nSlider.value(5);
  muted.fill(false);
  selected = 1;
  resetCustomWave();
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function draw() {
  updateCanvasSize();

  if (playing && millis() - lastStepTime >= STEP_MS) {
    lastStepTime = millis();
    if (nSlider.value() >= N_MAX) stopPlaying();
    else nSlider.value(nSlider.value() + 1);
  }

  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  const m = currentModel();
  const left = 46, right = 16;
  const pw = canvasWidth - left - right;
  panels.time = { x: left, y: 80, w: pw, h: 150 };
  panels.top = { x: left, y: 292, w: pw, h: 84 };
  panels.bottom = { x: left, y: 402, w: pw, h: 66 };

  const hover = barUnderMouse();
  if (hover !== null) selected = hover;

  drawBanner(m);
  drawTimePlot(panels.time, m);
  drawSelectedReadout(m);
  if (abCheckbox.checked()) {
    drawCoefficientBars(panels.top, m, m.c.a, m.c.a0, 'aₙ (cosine coefficients);  bar 0 is a₀', 'teal');
    drawCoefficientBars(panels.bottom, m, m.c.b, 0, 'bₙ (sine coefficients)', 'darkorchid');
  } else {
    drawAmplitudeBars(panels.top, m);
    drawPhaseStems(panels.bottom, m);
  }
  drawHarmonicAxis(panels.bottom);

  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(22);
  text('Fourier Series Explorer', canvasWidth / 2, 8);

  drawControlLabels(m);
}

function drawBanner(m) {
  const narrow = canvasWidth < 600;
  let msg = 'Sum of harmonics 1 to ' + m.N + (narrow ? '' : ' (plus a₀)') + ':  rms error ' + m.rmsError.toFixed(3);
  if (m.overshoot !== null) msg += (narrow ? ',  overshoot ' : ',  peak overshoot ') + (100 * m.overshoot).toFixed(1) + '%' + (narrow ? '' : ' of the jump height');
  if (muted.slice(0, m.N + 1).some(v => v)) msg = (narrow ? '' : 'Some harmonics are switched off.  ') + 'rms error ' + m.rmsError.toFixed(3);
  stroke('steelblue');
  strokeWeight(1.5);
  fill('lightyellow');
  rect(10, 34, canvasWidth - 20, 24, 8);
  strokeWeight(1);
  noStroke();
  fill('midnightblue');
  textSize(narrow ? 12 : 14);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(msg, canvasWidth / 2, 46);
  textStyle(NORMAL);
}

function caption(p, str, col, rightText) {
  noStroke();
  textSize(canvasWidth < 600 ? 11 : 13);
  fill(col);
  textStyle(BOLD);
  textAlign(LEFT, BOTTOM);
  text(str, p.x, p.y - 4);
  textStyle(NORMAL);
  if (rightText) {
    fill('black');
    textSize(12);
    textAlign(RIGHT, BOTTOM);
    text(rightText, p.x + p.w, p.y - 4);
  }
}

function drawTimePlot(p, m) {
  const yMax = 1.5;
  const X = t => p.x + t / 2 * p.w;                    // two periods: t/T from 0 to 2
  const Y = v => p.y + p.h / 2 - constrain(v / yMax, -1, 1) * (p.h / 2);

  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(12);
  for (const v of [-1, 0, 1]) {
    stroke(v === 0 ? 'gray' : 'gainsboro');
    line(p.x, Y(v), p.x + p.w, Y(v));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(v, p.x - 5, Y(v));
  }
  for (let t = 0; t <= 2.001; t += 0.25) {
    stroke('gainsboro');
    line(X(t), p.y, X(t), p.y + p.h);
    if (Math.abs(t * 2 - Math.round(t * 2)) < 1e-9) {
      noStroke();
      fill('black');
      textAlign(CENTER, TOP);
      text(t, X(t), p.y + p.h + 4);
    }
  }

  // individual harmonics
  const pts = Math.max(300, Math.floor(p.w));
  if (harmonicsCheckbox.checked()) {
    colorMode(HSB, 360, 100, 100, 1);
    strokeWeight(1);
    noFill();
    for (let n = 1; n <= m.N; n++) {
      if (muted[n] || m.amp[n] < 0.004 || n === selected) continue;
      stroke((n * 47) % 360, 70, 75, 0.7);
      beginShape();
      const k = Math.max(pts, 8 * n);
      for (let i = 0; i <= k; i++) {
        const th = 4 * Math.PI * i / k;
        vertex(p.x + i / k * p.w, Y(m.c.a[n] * Math.cos(n * th) + m.c.b[n] * Math.sin(n * th)));
      }
      endShape();
    }
    colorMode(RGB, 255);
  }

  // original waveform
  stroke('lightslategray');
  strokeWeight(3);
  noFill();
  beginShape();
  for (let i = 0; i <= 2 * GRID; i += 4) vertex(X(i / GRID), Y(m.orig[i % GRID]));
  endShape();

  // the selected harmonic
  if (selected >= 1 && selected <= N_MAX && m.amp[selected] >= 1e-6) {
    const n = selected;
    stroke('darkorange');
    strokeWeight(2);
    beginShape();
    const k = Math.max(pts, 8 * n);
    for (let i = 0; i <= k; i++) {
      const th = 4 * Math.PI * i / k;
      vertex(p.x + i / k * p.w, Y(m.c.a[n] * Math.cos(n * th) + m.c.b[n] * Math.sin(n * th)));
    }
    endShape();
  }

  // partial sum
  stroke('crimson');
  strokeWeight(2);
  beginShape();
  for (let i = 0; i <= 2 * GRID; i++) vertex(X(i / GRID), Y(m.sum[i % GRID]));
  endShape();
  strokeWeight(1);

  const narrow = canvasWidth < 600;
  let str = narrow ? 'Waveform (grey) and partial sum (red)' : 'Waveform x(t) (grey) and the sum of its first ' + m.N + ' harmonics (red)';
  if (m.kind === 'custom') str = narrow ? 'Drag here to draw one period' : 'Drag in this plot to draw one period of your own waveform';
  caption(p, str, m.kind === 'custom' ? 'darkgreen' : 'crimson', 'time t / T');
}

function fmtCoef(v) {
  return (Math.abs(v) < 5e-5 ? 0 : v).toFixed(4).replace('-', '−');
}

function drawSelectedReadout(m) {
  const narrow = canvasWidth < 600;
  const n = selected;
  let str;
  if (n === 0) {
    str = 'n = 0 (DC):  a₀ = ' + fmtCoef(m.c.a0) + (narrow ? '' : ',  the average value of x(t)');
  } else {
    const a = m.c.a[n], b = m.c.b[n];
    str = 'n = ' + n + ':  aₙ = ' + fmtCoef(a) + '   bₙ = ' + fmtCoef(b);
    if (!narrow) {
      str += '   amplitude = ' + fmtCoef(m.amp[n]);
      str += m.amp[n] > 1e-6 ? '   phase = ' + m.phase[n].toFixed(1).replace('-', '−') + '°' : '   (harmonic absent)';
    }
  }
  if (muted[n]) str += narrow ? ' (off)' : '   [switched off]';
  noStroke();
  fill('darkorange');
  rect(panels.time.x, 255, 14, 3);
  fill('black');
  textSize(narrow ? 12 : 14);
  textAlign(LEFT, CENTER);
  text(str, panels.time.x + 20, 257);
}

function barGeometry(p) {
  const slot = p.w / (N_MAX + 1);
  return { slot: slot, barW: Math.max(2, slot * 0.7), cx: n => p.x + (n + 0.5) * slot };
}

// Which harmonic's bar is under the mouse (null if none).
function barUnderMouse() {
  for (const p of [panels.top, panels.bottom]) {
    if (!p) continue;
    if (mouseX >= p.x && mouseX < p.x + p.w && mouseY >= p.y && mouseY <= p.y + p.h) {
      return constrain(Math.floor((mouseX - p.x) / (p.w / (N_MAX + 1))), 0, N_MAX);
    }
  }
  return null;
}

function barFrame(p, yMin, yMax, ticks) {
  const Y = v => p.y + p.h - (v - yMin) / (yMax - yMin) * p.h;
  fill('white');
  stroke('silver');
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h);
  textSize(12);
  for (const tk of ticks) {
    stroke(tk[0] === 0 ? 'gray' : 'gainsboro');
    line(p.x, Y(tk[0]), p.x + p.w, Y(tk[0]));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(tk[1], p.x - 5, Y(tk[0]));
  }
  // highlight the column of the selected harmonic
  const g = barGeometry(p);
  noStroke();
  fill('rgba(255, 165, 0, 0.22)');
  rect(p.x + selected * g.slot, p.y + 1, g.slot, p.h - 2);
  return Y;
}

// Bar colour: included harmonics are solid, harmonics above N are pale, switched-off harmonics are hollow.
function styleBar(m, n, col) {
  if (n > m.N) { noStroke(); fill('gainsboro'); return; }
  if (muted[n]) { stroke(col); strokeWeight(1); noFill(); return; }
  noStroke(); fill(col);
}

function niceMax(v) {
  for (const c of [0.25, 0.5, 1, 1.5, 2]) if (v <= c * 0.98) return c;
  return 2.5;
}

function drawAmplitudeBars(p, m) {
  const yMax = niceMax(m.maxAmp);
  const Y = barFrame(p, 0, yMax, [[0, '0'], [yMax / 2, String(yMax / 2)], [yMax, String(yMax)]]);
  const g = barGeometry(p);
  for (let n = 0; n <= N_MAX; n++) {
    styleBar(m, n, 'royalblue');
    const h = Y(0) - Y(m.amp[n]);
    if (h > 0.3) rect(g.cx(n) - g.barW / 2, Y(m.amp[n]), g.barW, h);
  }
  strokeWeight(1);
  caption(p, canvasWidth < 600 ? 'Amplitude of each harmonic' : 'Magnitude spectrum: amplitude √(aₙ² + bₙ²) = 2|cₙ| of each harmonic',
    'royalblue', canvasWidth < 600 ? '' : 'click a bar to switch it off');
}

function drawPhaseStems(p, m) {
  const Y = barFrame(p, -200, 200, [[-180, '−180°'], [0, '0°'], [180, '180°']]);
  const g = barGeometry(p);
  for (let n = 0; n <= N_MAX; n++) {
    if (m.amp[n] < 1e-3 * Math.max(m.maxAmp, 1e-9)) continue;     // phase is undefined for an absent harmonic
    const col = n > m.N ? 'silver' : 'seagreen';
    stroke(col);
    strokeWeight(Math.min(2, g.barW));
    line(g.cx(n), Y(0), g.cx(n), Y(m.phase[n]));
    strokeWeight(1);
    if (muted[n] && n <= m.N) { fill('white'); } else { fill(col); }
    circle(g.cx(n), Y(m.phase[n]), Math.min(7, g.slot * 0.8));
  }
  caption(p, canvasWidth < 600 ? 'Phase of each harmonic' : 'Phase spectrum: angle of cₙ = (aₙ − j·bₙ)/2', 'seagreen', '');
}

function drawCoefficientBars(p, m, values, dc, label, col) {
  const yMax = niceMax(m.maxCoef);
  const Y = barFrame(p, -yMax, yMax, [[-yMax, '−' + yMax], [0, '0'], [yMax, String(yMax)]]);
  const g = barGeometry(p);
  for (let n = 0; n <= N_MAX; n++) {
    const v = n === 0 ? dc : values[n];
    styleBar(m, n, col);
    const y0 = Y(0), y1 = Y(v);
    if (Math.abs(y1 - y0) > 0.3) rect(g.cx(n) - g.barW / 2, Math.min(y0, y1), g.barW, Math.abs(y1 - y0));
  }
  strokeWeight(1);
  caption(p, label, col, p === panels.top && canvasWidth >= 600 ? 'click a bar to switch it off' : '');
}

function drawHarmonicAxis(p) {
  const g = barGeometry(p);
  noStroke();
  fill('black');
  textSize(12);
  textAlign(CENTER, TOP);
  const step = canvasWidth < 600 ? 10 : 5;
  for (let n = 0; n <= N_MAX; n += step) text(n, g.cx(n), p.y + p.h + 4);
  textSize(13);
  text('Harmonic number n  (frequency n·f₀, where f₀ = 1/T)', p.x + p.w / 2, p.y + p.h + 19);
}

function drawControlLabels(m) {
  const narrow = canvasWidth < 600;
  noStroke();
  fill('black');
  textAlign(LEFT, CENTER);
  textSize(narrow ? 13 : defaultTextSize);
  if (!narrow) text('Waveform:', 10, drawHeight + 18);
  text((narrow ? 'N: ' : 'Number of harmonics N: ') + m.N, 10, drawHeight + 53);
}

// ---------------------------------------------------------------------------
// Mouse: click a bar to switch a harmonic on or off, drag in the time plot to draw
// ---------------------------------------------------------------------------

function mousePressed() {
  const n = barUnderMouse();
  if (n !== null) {
    muted[n] = !muted[n];
    selected = n;
    return;
  }
  lastDraw = null;
  sketchWave();
}

function mouseDragged() {
  if (sketchWave()) return false;     // keep the page from scrolling while drawing
}

function mouseReleased() { lastDraw = null; }

function sketchWave() {
  const p = panels.time;
  if (!p || waveSelect.value() !== 'custom') return false;
  if (mouseX < p.x || mouseX > p.x + p.w || mouseY < p.y - 10 || mouseY > p.y + p.h + 10) { lastDraw = null; return false; }
  stopPlaying();
  const phase = ((mouseX - p.x) / p.w * 2) % 1;
  const idx = Math.min(DRAW_M - 1, Math.floor(phase * DRAW_M));
  const val = constrain((p.y + p.h / 2 - mouseY) / (p.h / 2) * 1.5, -1.2, 1.2);
  if (lastDraw && Math.abs(idx - lastDraw.idx) < DRAW_M / 2) {
    // fill in every sample between the previous mouse position and this one
    const lo = Math.min(idx, lastDraw.idx), hi = Math.max(idx, lastDraw.idx);
    for (let i = lo; i <= hi; i++) {
      const f = hi === lo ? 1 : (i - lastDraw.idx) / (idx - lastDraw.idx);
      customWave[i] = lastDraw.val + (val - lastDraw.val) * f;
    }
  } else {
    for (let i = Math.max(0, idx - 2); i <= Math.min(DRAW_M - 1, idx + 2); i++) customWave[i] = val;
  }
  lastDraw = { idx: idx, val: val };
  customVersion++;
  return true;
}

// ---------------------------------------------------------------------------
// Responsive layout
// ---------------------------------------------------------------------------

function positionControls() {
  const narrow = canvasWidth < 600;
  backButton.html(narrow ? '<' : '< Step');
  forwardButton.html(narrow ? '>' : 'Step >');
  const widths = narrow ? [52, 28, 28, 52] : [58, 62, 62, 56];
  let bx = canvasWidth - 10 - widths.reduce((a, b) => a + b + 6, 0);
  const selectLeft = narrow ? 8 : 92;
  waveSelect.position(selectLeft, drawHeight + 7);
  waveSelect.style('max-width', Math.max(70, bx - selectLeft - 10) + 'px');
  [playButton, backButton, forwardButton, resetButton].forEach((b, i) => {
    b.position(bx, drawHeight + 5);
    b.size(widths[i]);
    bx += widths[i] + 6;
  });
  const labelW = narrow ? 60 : sliderLeftMargin;
  nSlider.position(labelW, drawHeight + 42);
  nSlider.size(canvasWidth - labelW - margin);
  harmonicsCheckbox.position(8, drawHeight + 79);
  abCheckbox.position(narrow ? 205 : 270, drawHeight + 79);
  for (const c of [harmonicsCheckbox, abCheckbox]) c.style('font-size', narrow ? '12px' : '16px');
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) {
    const w = Math.floor(container.getBoundingClientRect().width);
    if (w > 0) canvasWidth = w;
  }
}
