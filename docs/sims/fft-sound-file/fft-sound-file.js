// FFT of Sound File: a small music player with a track list and a live spectrum
// CANVAS_HEIGHT: 320
// p5.js 2.3.2 + p5.sound 0.4.1.  Original idea: IDEA9101 IDEA Laboratory 1 /
// https://editor.p5js.org/HelenaCui/sketches/O1wf7kNhj
//
// p5.sound 0.4.1 notes (differs from the old 1.x addon):
//   * new p5.FFT(size) takes ONE argument; analyze() returns LINEAR magnitudes
//     (a full-scale sine reads about 0.2 when called every frame), so we
//     convert to dB for display.
//   * a looping file is started with loop() followed by play().
//   * NEVER call stop() on a sound that has been paused: it then plays
//     silently forever.  This player only uses pause(), jump(0) and play().
//   * there is no masterVolume(); each source is scaled with amp().

// ---- track list: add a row here to add a track to the drop-down ----------
const TRACKS = [
  { label: 'Classical Pop (Instrumental) - Pro Sensory, CC0', file: 'classical-pop-instrumental.mp3' },
  { label: 'Dancing Tiger - Damscray (p5.js example, licence not yet verified)', file: 'Damscray_DancingTiger.mp3' },
  { label: 'Sugar - Maroon 5 (copyrighted placeholder, to be removed)', file: 'maroon-5-sugar.mp3' }
];
const FFT_SIZE = 1024;                 // bins from 0 Hz to the Nyquist frequency
const DB_FLOOR = -90;                  // dB mapped to an empty bar
const DB_CEIL = -15;                   // dB mapped to a full-height bar (a full-scale sine reads about -14 dB)

// ---- layout ----------------------------------------------------------------
let canvasWidth = 400;
let drawHeight = 220;
let controlHeight = 100;
let canvasHeight = drawHeight + controlHeight;
let margin = 10;
let defaultTextSize = 16;
let lastLaidOutWidth = -1;

// ---- state -----------------------------------------------------------------
let fft;
let sampleRateHz = 48000;
const soundCache = {};                 // file name -> loaded p5.SoundFile
let current = null;                    // the p5.SoundFile that is selected
let isPlaying = false;
let statusText = 'Choose a track and press Play';
let loadToken = 0;                     // lets a newer selection cancel an older load
let restartOnPlay = true;              // start a newly selected track from 0:00
let maxHz = 10000;                     // display range; 0 means full (Nyquist)

// ---- controls (p5 built-ins) -----------------------------------------------
let trackSelect, playButton, volumeSlider, rangeSelect, fileInput;

async function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  fft = new p5.FFT(FFT_SIZE);          // default analyser smoothing is 0.8
  try { sampleRateHz = getAudioContext().sampleRate; } catch (e) { /* keep 48000 */ }

  trackSelect = createSelect();
  TRACKS.forEach((t, i) => trackSelect.option(t.label, String(i)));
  trackSelect.selected('0');
  trackSelect.changed(onTrackChanged);

  playButton = createButton('Play');
  playButton.mousePressed(togglePlay);

  volumeSlider = createSlider(0, 1, 0.5, 0.01);
  volumeSlider.input(applyVolume);

  rangeSelect = createSelect();
  rangeSelect.option('0 - 5 kHz', '5000');
  rangeSelect.option('0 - 10 kHz', '10000');
  rangeSelect.option('Full range', '0');
  rangeSelect.selected('10000');
  rangeSelect.changed(() => { maxHz = Number(rangeSelect.value()); });

  fileInput = createFileInput(onFileChosen);

  layoutControls();
  describe('A music player. A drop-down chooses a track; Play starts it. Red bars show the frequency spectrum computed by an FFT and a black line shows the waveform.');
}

function draw() {
  updateCanvasSize();
  background('aliceblue');

  // control region background
  noStroke();
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  const plotTop = 26;
  const plotBottom = drawHeight - 30;
  const plotH = plotBottom - plotTop;
  const nyquist = sampleRateHz / 2;
  const shownHz = maxHz > 0 ? Math.min(maxHz, nyquist) : nyquist;

  // status line
  fill(60);
  noStroke();
  textAlign(LEFT, CENTER);
  text(statusText, margin, 13);

  // spectrum (red bars). analyze() is linear magnitude -> dB -> 0..1
  const spectrum = fft.analyze();
  const nShow = Math.max(1, Math.floor(spectrum.length * shownHz / nyquist));
  const barW = (canvasWidth - 2 * margin) / nShow;
  fill(160, 0, 0);
  for (let i = 0; i < nShow; i++) {
    const db = 20 * Math.log10(Math.max(spectrum[i], 1e-6));
    const level = constrain(map(db, DB_FLOOR, DB_CEIL, 0, 1), 0, 1);
    const h = level * plotH;
    rect(margin + i * barW, plotBottom - h, Math.max(barW - 0.5, 1), h);
  }

  // waveform (black line) across the same plot
  const wave = fft.waveform();
  noFill();
  stroke(20);
  strokeWeight(1);
  beginShape();
  for (let i = 0; i < wave.length; i++) {
    const x = map(i, 0, wave.length - 1, margin, canvasWidth - margin);
    const y = map(wave[i], -1, 1, plotBottom, plotTop);
    vertex(x, y);
  }
  endShape();

  // frequency axis with ticks
  stroke(120);
  line(margin, plotBottom, canvasWidth - margin, plotBottom);
  const step = shownHz <= 5000 ? 1000 : (shownHz <= 10000 ? 2000 : 5000);
  noStroke();
  fill(60);
  textAlign(CENTER, TOP);
  textSize(13);
  for (let f = 0; f <= shownHz; f += step) {
    const x = margin + (f / shownHz) * (canvasWidth - 2 * margin);
    stroke(120);
    line(x, plotBottom, x, plotBottom + 5);
    noStroke();
    text((f / 1000) + ' kHz', constrain(x, margin + 22, canvasWidth - margin - 22), plotBottom + 7);
  }
  textSize(defaultTextSize);

  // control labels (the controls themselves are DOM elements)
  fill(0);
  noStroke();
  textAlign(LEFT, CENTER);
  text('Track', margin, drawHeight + 22);
  text('Volume', margin, drawHeight + 57);
  text('Range', rangeLabelX(), drawHeight + 57);
  text('Your file', margin, drawHeight + 87);
}

// ---- audio ------------------------------------------------------------------

async function loadTrack(index) {
  const token = ++loadToken;
  const t = TRACKS[index];
  statusText = 'Loading ' + t.file + ' ...';
  try {
    if (!soundCache[t.file]) soundCache[t.file] = await loadSound(t.file);
  } catch (e) {
    if (token === loadToken) statusText = 'Could not load ' + t.file;
    return null;
  }
  if (token !== loadToken) return null;        // a newer selection superseded this one
  return soundCache[t.file];
}

async function onTrackChanged() {
  const wasPlaying = isPlaying;
  pauseCurrent();
  const s = await loadTrack(Number(trackSelect.value()));
  if (!s) return;
  current = s;
  fft.setInput(current);
  restartOnPlay = true;
  statusText = 'Ready: ' + TRACKS[Number(trackSelect.value())].label;
  if (wasPlaying) startCurrent();
}

async function togglePlay() {
  await userStartAudio();                       // the audio context starts suspended
  if (isPlaying) {
    pauseCurrent();
    statusText = 'Paused';
    return;
  }
  if (!current) {
    const s = await loadTrack(Number(trackSelect.value()));
    if (!s) return;
    current = s;
    fft.setInput(current);
    restartOnPlay = true;
  }
  startCurrent();
}

function startCurrent() {
  current.amp(volumeSlider.value());
  if (restartOnPlay) {                          // a track chosen from the list starts at 0:00
    current.jump(0);
    restartOnPlay = false;
  }
  current.loop();                               // loop() alone is silent in p5.sound 0.4.1
  current.play();
  isPlaying = true;
  playButton.html('Pause');
  statusText = 'Playing';
}

function pauseCurrent() {
  // pause(), never stop(): a paused-then-stopped sound stays silent (see header).
  if (current && isPlaying) current.pause();
  isPlaying = false;
  playButton.html('Play');
}

function applyVolume() {
  if (current) current.amp(volumeSlider.value());
}

async function onFileChosen(file) {
  if (!file || file.type !== 'audio') {
    statusText = 'That file is not an audio file';
    return;
  }
  const wasPlaying = isPlaying;
  pauseCurrent();
  const token = ++loadToken;
  statusText = 'Decoding ' + file.name + ' ...';
  try {
    const s = await loadSound(file.data);       // file.data is a data URL
    if (token !== loadToken) return;
    current = s;
    fft.setInput(current);
    restartOnPlay = true;
    statusText = 'Ready: your file ' + file.name;
    if (wasPlaying) startCurrent();
  } catch (e) {
    statusText = 'Could not decode ' + file.name;
  }
}

// ---- layout helpers ---------------------------------------------------------

function rangeLabelX() {
  return 90 + volumeSliderWidth() + 20;
}

function volumeSliderWidth() {
  return Math.max(90, Math.min(200, canvasWidth - 90 - 20 - 60 - 120 - margin));
}

function layoutControls() {
  const y = drawHeight;
  trackSelect.position(70, y + 10);
  trackSelect.size(Math.max(120, canvasWidth - 70 - 90 - 2 * margin));
  playButton.position(canvasWidth - 80 - margin, y + 10);
  playButton.size(80);
  volumeSlider.position(90, y + 45);
  volumeSlider.size(volumeSliderWidth());
  rangeSelect.position(rangeLabelX() + 60, y + 45);
  fileInput.position(90, y + 75);
  lastLaidOutWidth = canvasWidth;
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = Math.floor(container.getBoundingClientRect().width);
  if (typeof trackSelect !== 'undefined' && canvasWidth !== lastLaidOutWidth) layoutControls();
}
