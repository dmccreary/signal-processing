// Interactive Spectrogram Parameter Explorer MicroSim
// CANVAS_HEIGHT: 740
// Two spectrograms of the SAME signal, A above B, each with its own short-time Fourier
// transform settings:
//   X[m, k] = sum_{n=0}^{N-1} x[n + mH] w[n] e^{-j 2 pi k n / (P N)},   H = N (1 - overlap)
// Window length N, overlap, window type, zero-padding factor P, dB floor and color map are
// set separately for each panel. Guided challenges load an illustrative pair of settings with
// a prediction prompt and a Reveal button. Pointing at a spectrogram moves a linked cursor
// through both panels, and the slice plot compares the two frames under it.
// Signals: synthetic (fs = 8000 Hz, 2 s, analysed with the radix-2 FFT below) or the live
// microphone (p5.js 2.3.2 + p5.sound 0.4.1).
//
// p5.sound 0.4.1 notes (verified headlessly):
//   * Every p5.sound source, including p5.AudioIn, is connected to the speakers when it is
//     created. A live microphone played out loud howls with feedback, so the sketch calls
//     mic.disconnect() and then mic.connect(fft): the microphone is analysed, never played.
//   * p5.FFT is used only for waveform(), the latest 16384 raw samples (fft.samples.size).
//     Successive waveform() calls overlap; the sketch finds the overlap, appends only the new
//     samples, low-pass filters and decimates them to about 8 kHz and runs its own STFT.
//   * AudioIn.start() reports nothing; mic.node.state becomes 'started' once the browser has
//     opened the microphone (the page must be served over https or from localhost).

// ---- canvas layout (standard MicroSim regions) ----
let canvasWidth = 900;                 // overwritten from the container in updateCanvasSize()
let canvasHeight = 740;                // fixed; drawHeight and controlHeight depend on the width
let controlHeight = 176;               // 176 in the wide (two-column) layout, 204 in the narrow one
let drawHeight = canvasHeight - controlHeight;
let margin = 12;
let defaultTextSize = 16;

// ---- model constants ----
const FS_SYN = 8000;                   // Hz, sampling rate of the synthetic signals
const SPAN_S = 2.0;                    // s of signal shown in each spectrogram
const N_LIST = [64, 128, 256, 512, 1024, 2048];
const OVERLAPS = [0, 25, 50, 75, 87.5, 93.75];   // hop H = N, 3N/4, N/2, N/4, N/8, N/16
const PADS = [1, 2, 4, 8];
const WINDOW_NAMES = { hann: 'Hann', hamming: 'Hamming', blackman: 'Blackman', rect: 'Rectangular' };
const CMAP_KEYS = ['viridis', 'inferno', 'gray', 'jet'];
const COL_A = [25, 90, 200];           // panel A: blue
const COL_B = [160, 30, 70];           // panel B: maroon
const NO_FRAME = [212, 212, 212];      // times not covered by a complete window
const SLICE_SPAN = 1000;               // Hz shown in the slice plot
const MIC_TARGET_FS = 8000;            // the microphone is decimated to about this rate
const MIC_WAVE = 16384;                // raw samples returned by fft.waveform() (covers ~0.34 s pauses)
const MIC_RING = 32768;                // decimated microphone samples kept (power of two)
const RAW_RING = 8192;                 // raw microphone samples kept for the decimation filter
const MIC_TIMEOUT_MS = 8000;

const SOURCES = [
  { id: 'chirp', label: 'Signal: chirp' },
  { id: 'two', label: 'Signal: two close tones' },
  { id: 'weak', label: 'Signal: strong + weak tone' },
  { id: 'bursts', label: 'Signal: tone bursts' },
  { id: 'vibrato', label: 'Signal: vibrato whistle' },
  { id: 'mic', label: 'Signal: microphone (live)' }
];

function P(n, ov, win, pad, floor, cmap) { return { n, ov, win, pad, floor, cmap }; }

const CHALLENGES = [
  { id: 'none', label: 'Challenge: none (free exploration)' },
  { id: 'chirp', label: '1. Short vs long window on a chirp', src: 'chirp',
    A: P(256, 75, 'hann', 1, -80, 'viridis'), B: P(2048, 75, 'hann', 1, -80, 'viridis'), cursor: { t: 1.0, f: 2000 },
    prompt: 'The chirp rises from 200 to 3800 Hz in 2 s. A uses N = 256 (32 ms); B uses a window 8 times longer (N = 2048, 256 ms), so its bins are 8 times finer. Which panel draws the chirp as the thinner line?',
    answer: 'A. At t = 1 s A\'s line is about 60 Hz wide (6 dB down) and B\'s about 230 Hz: the chirp sweeps 461 Hz during one 256 ms window, so B smears it and its peak is about 15 dB dimmer. Too short loses as well: at N = 64 (pad \u00d78) the peak is about 220 Hz wide.' },
  { id: 'tones', label: '2. Two close tones: who separates them?', src: 'two',
    A: P(128, 75, 'hann', 1, -80, 'viridis'), B: P(512, 75, 'hann', 1, -80, 'viridis'), cursor: { t: 1.0, f: 1030 }, zoom: 8, zc: 1030,
    prompt: 'Two equal tones at 1000 and 1060 Hz are 60 Hz apart. A has fs/N = 62.5 Hz (N = 128), B has fs/N = 15.63 Hz (N = 512). Which panel shows two separate lines?',
    answer: 'B. With a Hann window two tones need to be about two bins apart: 60 Hz is 3.8 of B\'s bins but under one of A\'s. A shows a single band that pulses 60 times a second (the beat); B shows two lines with a dip of about 29 dB between them in the slice.' },
  { id: 'zeropad', label: '3. Zero padding vs a longer window', src: 'two',
    A: P(128, 75, 'hann', 8, -80, 'viridis'), B: P(1024, 75, 'hann', 1, -80, 'viridis'), cursor: { t: 1.0, f: 1030 }, zoom: 8, zc: 1030,
    prompt: 'Same two tones. A pads its 128-sample window with zeros to a 1024-point FFT; B uses a real 1024-sample window. Both FFTs have 1024 points. Does A now separate the tones?',
    answer: 'No. Zero padding only interpolates the spectrum of the same 16 ms window: A\'s slice is smooth, with dots every 62.5 Hz, but at t = 1 s it is still one peak about 130 Hz wide. Only B\'s longer 128 ms window separates the tones, with a dip of about 56 dB between them.' },
  { id: 'overlap', label: '4. Overlap 0% vs 75% on bursts', src: 'bursts',
    A: P(256, 0, 'hann', 1, -80, 'viridis'), B: P(256, 75, 'hann', 1, -80, 'viridis'), cursor: { t: 0.256, f: 1500 },
    prompt: '13 short bursts of a 1500 Hz tone, one every 150 ms. Both panels use a 256-sample Hann window; A\'s frames do not overlap, B\'s overlap by 75%. Will every burst look equally bright in both?',
    answer: 'Only in B. A Hann window is almost zero at its ends, so with 0% overlap a burst that falls between two frames is nearly lost: A\'s bursts range from −10 to −36 dB. B has 4 times as many frames, so every burst is caught near a window center (−10 to −11 dB).' },
  { id: 'leak', label: '5. Rectangular vs Hann: a weak tone', src: 'weak',
    A: P(256, 75, 'rect', 1, -100, 'viridis'), B: P(256, 75, 'hann', 1, -100, 'viridis'), cursor: { t: 1.0, f: 1450 }, zoom: 4, zc: 1250,
    prompt: 'A strong tone at 1050 Hz and a tone 50 dB weaker at 1450 Hz. A uses a rectangular window, B a Hann window, both N = 256. In which panel can you see the weak tone?',
    answer: 'B. The rectangular window\'s sidelobes spread the strong tone over the whole band; at 1450 Hz they are still near −37 dB, far above the weak tone (about −57 dB). Hann sidelobes fall below −80 dB there, so the weak tone stands out. Try Hamming and Blackman too.' },
  { id: 'floor', label: '6. dB floor: what is hidden?', src: 'weak',
    A: P(256, 75, 'hann', 1, -40, 'viridis'), B: P(256, 75, 'hann', 1, -100, 'viridis'), cursor: { t: 1.0, f: 1450 }, zoom: 4, zc: 1250,
    prompt: 'Both panels compute exactly the same Hann STFT; only the dB floor of the color scale differs (A: −40 dB, B: −100 dB). What can B show that A cannot?',
    answer: 'The weak 1450 Hz tone (about −57 dB) and the skirts of the strong tone lie below A\'s −40 dB floor, so A paints them the floor color. The floor changes only the display: the cursor read-out gives the same dB value in both panels.' },
  { id: 'vibrato', label: '7. Vibrato: following a wiggle', src: 'vibrato',
    A: P(128, 75, 'hann', 1, -80, 'viridis'), B: P(2048, 75, 'hann', 1, -80, 'viridis'), cursor: { t: 1.0, f: 2000 }, zoom: 4, zc: 2000,
    prompt: 'A whistle at 2000 Hz with vibrato: its pitch swings 150 Hz up and down 6 times per second. A uses N = 128 (16 ms), B uses N = 2048 (256 ms). Which panel shows the wiggle?',
    answer: 'A. Its 16 ms window is short compared with the 167 ms vibrato period, so each frame sees an almost steady pitch. B\'s 256 ms window spans 1.5 vibrato periods and smears the swing into a band from about 1850 to 2150 Hz.' },
  { id: 'cmap', label: '8. Color map: jet vs viridis', src: 'chirp',
    A: P(256, 75, 'hann', 1, -100, 'jet'), B: P(256, 75, 'hann', 1, -100, 'viridis'), cursor: { t: 1.0, f: 2000 },
    prompt: 'Identical analysis in both panels (Hann, N = 256); only the color map differs: A uses the rainbow map jet, B uses viridis. Which panel shows bands that are not in the data?',
    answer: 'A. The level falls smoothly away from the chirp, but jet\'s brightness rises and falls (dark blue, bright cyan and yellow, dark red), so it draws false edges. Viridis gets steadily lighter as the level rises, so equal dB steps look like equal steps.' },
  { id: 'voice', label: '9. Your voice: wideband vs narrowband', src: 'mic',
    A: P(64, 87.5, 'hann', 1, -100, 'viridis'), B: P(512, 87.5, 'hann', 1, -100, 'viridis'), cursor: { t: 1.5, f: 500 },
    prompt: 'Press Start mic, then sing a long "aaah" while sliding your pitch up and down. A uses {A.dt} windows, B uses {B.dt} windows. Which panel shows the separate harmonics of your voice?',
    answer: 'B. Its bins are {B.df} apart, fine enough to resolve harmonics spaced by your pitch (roughly 100 to 250 Hz): they appear as parallel lines that rise and fall together. A\'s {A.df} bins blur them into broad bands but show quick changes, such as consonants, sharply.' }
];

const DEFAULT_A = P(128, 75, 'hann', 1, -80, 'viridis');
const DEFAULT_B = P(1024, 75, 'hann', 1, -80, 'viridis');

// ---- controls ----
let sourceSelect, challengeSelect, revealButton, micButton, zoomSelect, editRadio;
let lenSliderA, overlapSliderA, floorSliderA, windowSelectA, padSelectA, cmapSelectA;
let lenSliderB, overlapSliderB, floorSliderB, windowSelectB, padSelectB, cmapSelectB;

// ---- state ----
let panels = [];
let source = 'chirp';
let currentChallenge = null;
let revealed = false;
let sliceHasDots = false;              // the slice shows bin dots (set in drawSlice)
let zoom = 1;                          // frequency zoom of both spectrograms
let zoomCenter = 2000;                 // Hz; set by clicking a spectrogram or by a challenge
let cursor = { t: 1.0, f: 2000 };      // t in display seconds (0..SPAN_S), f in Hz
let L = {};                            // drawing-region layout, see computeLayout()
let layoutWidth = -1;
const signalCache = {};
const LUTS = {};

// microphone
let micIn = null, micTap = null;
let retiredMics = [];
let micState = 'idle';                 // idle | opening | live | stopped | error
let micMessage = '';
let micSince = 0;
let micSr = 48000, micD = 6, fsMic = 8000;
let firTaps = null;
let micPrev = null, micPrevTime = 0;
let rawBuf = new Float32Array(RAW_RING), rawCount = 0, decNext = 0;
let micBuf = new Float32Array(MIC_RING), micCount = 0;
let micGaps = 0, micStitched = 0;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);
  buildLuts();

  // Shared controls (Reveal is the first button on the page)
  sourceSelect = createSelect();
  for (const s of SOURCES) sourceSelect.option(s.label, s.id);
  sourceSelect.selected('chirp');
  sourceSelect.changed(() => setSource(sourceSelect.value(), true));

  challengeSelect = createSelect();
  for (const c of CHALLENGES) challengeSelect.option(c.label, c.id);
  challengeSelect.changed(() => applyChallenge(challengeSelect.value()));

  revealButton = createButton('Reveal');
  revealButton.mousePressed(toggleReveal);

  micButton = createButton('Start mic');
  micButton.mousePressed(toggleMic);

  zoomSelect = createSelect();
  for (const z of [1, 2, 4, 8]) zoomSelect.option('zoom \u00d7' + z, String(z));
  zoomSelect.style('font-size', '14px');

  editRadio = createRadio();
  editRadio.option('A', 'A');
  editRadio.option('B', 'B');
  editRadio.selected('A');
  editRadio.style('font-size', '14px');
  editRadio.changed(() => layoutControls(true));

  // Panel controls: one complete parameter set per panel
  const a = createPanelControls(DEFAULT_A);
  lenSliderA = a.len; overlapSliderA = a.ov; floorSliderA = a.floor;
  windowSelectA = a.win; padSelectA = a.pad; cmapSelectA = a.cmap;
  const b = createPanelControls(DEFAULT_B);
  lenSliderB = b.len; overlapSliderB = b.ov; floorSliderB = b.floor;
  windowSelectB = b.win; padSelectB = b.pad; cmapSelectB = b.cmap;
  panels = [makePanel('A', COL_A, a), makePanel('B', COL_B, b)];

  for (const el of [sourceSelect, challengeSelect]) el.style('font-size', '14px');
  layoutControls(true);
  challengeSelect.selected('chirp');
  applyChallenge('chirp');

  describe('Two spectrograms of the same signal, A above B, each computed with its own window length, overlap, window type, zero padding, dB floor and color map. A drop-down chooses a synthetic signal or the live microphone, guided challenges load contrasting settings with a prediction and a Reveal button, and pointing at a spectrogram shows the time, frequency and level in both panels and compares the two frame spectra in a slice plot.');
}

function createPanelControls(d) {
  const c = {};
  c.win = createSelect();
  for (const k of Object.keys(WINDOW_NAMES)) c.win.option(WINDOW_NAMES[k], k);
  c.pad = createSelect();
  for (const p of PADS) c.pad.option('pad ×' + p, String(p));
  c.cmap = createSelect();
  for (const k of CMAP_KEYS) c.cmap.option(k, k);
  c.len = createSlider(0, N_LIST.length - 1, 0, 1);
  c.ov = createSlider(0, OVERLAPS.length - 1, 0, 1);
  c.floor = createSlider(-120, -20, -80, 10);
  for (const s of [c.win, c.pad, c.cmap]) s.style('font-size', '14px');
  setControls(c, d);
  return c;
}

function setControls(c, d) {
  c.len.value(N_LIST.indexOf(d.n));
  c.ov.value(OVERLAPS.indexOf(d.ov));
  c.floor.value(d.floor);
  c.win.selected(d.win);
  c.pad.selected(String(d.pad));
  c.cmap.selected(d.cmap);
}

function makePanel(name, col, c) {
  return {
    name, col, c,
    N: 0, H: 0, ovPct: 0, win: 'hann', pad: 1, floor: -80, cmap: 'viridis',
    nfft: 0, w: null, gain: 1, key: '', srcKey: '',
    frames: new Map(), nextM: 0, version: 0, dirty: true,
    rowCache: new Map(), rowCacheKey: '', rowCacheFrames: null,
    off: document.createElement('canvas'), imgKey: '', imgData: null
  };
}

// ---------------------------------------------------------------- main loop

function draw() {
  updateCanvasSize();
  for (const p of panels) readPanel(p);
  zoom = [1, 2, 4, 8].includes(Number(zoomSelect.value())) ? Number(zoomSelect.value()) : 1;
  pollMic();
  for (const p of panels) updateAnalysis(p);
  followPointer();

  // drawing region and control region
  noStroke();
  fill('aliceblue');
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);
  stroke('silver');
  strokeWeight(1);
  line(0, drawHeight, canvasWidth, drawHeight);

  drawHeader();
  drawPrompt();
  panels.forEach((p, i) => drawPanel(p, i));
  drawTimeAxis();
  drawCursorLine();
  drawSlice();
  drawControlLabels();
}

// ---------------------------------------------------------------- signals

function getSignal(id) {
  if (signalCache[id]) return signalCache[id];
  const n = Math.round(SPAN_S * FS_SYN);
  const x = new Float32Array(n);
  const TWO_PI = 2 * Math.PI;
  for (let i = 0; i < n; i++) {
    const t = i / FS_SYN;
    let v = 0;
    if (id === 'chirp') {
      v = 0.5 * Math.sin(TWO_PI * (200 * t + 900 * t * t));         // f(t) = 200 + 1800 t
    } else if (id === 'two') {
      v = 0.5 * Math.sin(TWO_PI * 1000 * t) + 0.5 * Math.sin(TWO_PI * 1060 * t);
    } else if (id === 'weak') {
      v = 0.5 * Math.sin(TWO_PI * 1050 * t) + 0.5 * Math.pow(10, -50 / 20) * Math.sin(TWO_PI * 1450 * t);
    } else if (id === 'vibrato') {
      v = 0.5 * Math.sin(TWO_PI * 2000 * t + 25 * (1 - Math.cos(TWO_PI * 6 * t)));   // f(t) = 2000 + 150 sin(2 pi 6 t)
    }
    x[i] = v;
  }
  if (id === 'bursts') {
    // 12 ms bursts of a 1500 Hz tone, one every 150 ms from 0.10 s, with 1 ms raised-cosine edges
    for (let k = 0; ; k++) {
      const s = 0.1 + 0.15 * k, dur = 0.012, edge = 0.001;
      if (s + dur > SPAN_S) break;
      const i0 = Math.ceil(s * FS_SYN), i1 = Math.floor((s + dur) * FS_SYN);
      for (let i = i0; i <= i1 && i < n; i++) {
        const tt = i / FS_SYN - s;
        if (tt < 0 || tt >= dur) continue;
        const r = Math.min(1, Math.min(tt, dur - tt) / edge);
        x[i] += 0.5 * (0.5 - 0.5 * Math.cos(Math.PI * r)) * Math.sin(TWO_PI * 1500 * tt);
      }
    }
  }
  return (signalCache[id] = x);
}

// ---------------------------------------------------------------- STFT engine

const fftPlans = {};
function fftPlan(n) {
  if (fftPlans[n]) return fftPlans[n];
  const bits = Math.round(Math.log2(n));
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0, v = i;
    for (let b = 0; b < bits; b++) { r = (r << 1) | (v & 1); v >>= 1; }
    rev[i] = r;
  }
  const cs = new Float64Array(n / 2), sn = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cs[i] = Math.cos(2 * Math.PI * i / n);
    sn[i] = -Math.sin(2 * Math.PI * i / n);           // e^{-j 2 pi i / n}
  }
  return (fftPlans[n] = { n, rev, cs, sn, re: new Float64Array(n), im: new Float64Array(n) });
}

// iterative radix-2 FFT, in place
function fftInPlace(re, im, plan) {
  const n = plan.n, rev = plan.rev, cs = plan.cs, sn = plan.sn;
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1, step = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = cs[k * step], wi = sn[k * step];
        const a = start + k, b = a + half;
        const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
      }
    }
  }
}

// periodic (DFT-even) windows
function makeWindow(kind, N) {
  const w = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const c = 2 * Math.PI * n / N;
    if (kind === 'hann') w[n] = 0.5 - 0.5 * Math.cos(c);
    else if (kind === 'hamming') w[n] = 0.54 - 0.46 * Math.cos(c);
    else if (kind === 'blackman') w[n] = 0.42 - 0.5 * Math.cos(c) + 0.08 * Math.cos(2 * c);
    else w[n] = 1;
  }
  return w;
}

// One frame: window N samples starting at s0, zero-pad to P*N, FFT, convert to dB.
// 0 dB = a sinusoid of amplitude 1 centered on a bin (the window's coherent gain is removed).
function computeFrame(p, arr, mask, s0) {
  const N = p.N, plan = fftPlan(p.nfft), re = plan.re, im = plan.im, w = p.w;
  if (mask >= 0) {
    for (let n = 0; n < N; n++) re[n] = arr[(s0 + n) & mask] * w[n];
  } else {
    for (let n = 0; n < N; n++) re[n] = arr[s0 + n] * w[n];
  }
  re.fill(0, N);
  im.fill(0);
  fftInPlace(re, im, plan);
  const nb = p.nfft / 2 + 1, out = new Float32Array(nb), g2 = p.gain * p.gain;
  for (let k = 0; k < nb; k++) {
    const pw = (re[k] * re[k] + im[k] * im[k]) / g2;
    out[k] = pw > 1e-24 ? 10 * Math.log10(pw) : -240;
  }
  return out;
}

function readPanel(p) {
  const c = p.c;
  const N = N_LIST[constrain(Math.round(Number(c.len.value())), 0, N_LIST.length - 1)];
  const ovPct = OVERLAPS[constrain(Math.round(Number(c.ov.value())), 0, OVERLAPS.length - 1)];
  const H = Math.round(N * (1 - ovPct / 100));
  const win = WINDOW_NAMES[c.win.value()] ? c.win.value() : 'hann';
  const pad = PADS.includes(Number(c.pad.value())) ? Number(c.pad.value()) : 1;
  const key = N + '|' + H + '|' + win + '|' + pad;
  if (key !== p.key) {
    p.key = key;
    p.N = N; p.H = H; p.ovPct = ovPct; p.win = win; p.pad = pad;
    p.w = makeWindow(win, N);
    let s = 0;
    for (let n = 0; n < N; n++) s += p.w[n];
    p.gain = s / 2;
    p.nfft = N * pad;
    p.dirty = true;
  }
  p.floor = Number(c.floor.value());
  p.cmap = CMAP_KEYS.includes(c.cmap.value()) ? c.cmap.value() : 'viridis';
}

function updateAnalysis(p) {
  if (source !== 'mic') {
    if (p.dirty || p.srcKey !== source) {
      const x = getSignal(source);
      p.frames = new Map();
      const M = Math.floor((x.length - p.N) / p.H) + 1;
      for (let m = 0; m < M; m++) p.frames.set(m, computeFrame(p, x, -1, m * p.H));
      p.dirty = false;
      p.srcKey = source;
      p.version++;
    }
  } else {
    if (p.srcKey !== 'mic') { p.srcKey = 'mic'; p.dirty = true; }
    updateMicFrames(p);
  }
}

// Microphone frames are computed incrementally as samples arrive (frame m starts at m*H).
function updateMicFrames(p) {
  const span = Math.round(SPAN_S * fsMic);
  const oldest = Math.max(0, micCount - MIC_RING);
  const dispStart = micCount - span;
  if (p.dirty) {
    p.frames = new Map();
    p.nextM = Math.max(0, Math.ceil(Math.max(dispStart - p.N, oldest) / p.H));
    p.dirty = false;
    p.version++;
  }
  let added = 0;
  while (p.nextM * p.H + p.N <= micCount) {
    const s0 = p.nextM * p.H;
    if (s0 >= oldest) { p.frames.set(p.nextM, computeFrame(p, micBuf, MIC_RING - 1, s0)); added++; }
    p.nextM++;
  }
  // drop frames that have scrolled out of the display (keys are in increasing order)
  const mMin = Math.floor((dispStart - p.N) / p.H) - 1;
  for (const m of p.frames.keys()) {
    if (m >= mMin) break;
    p.frames.delete(m);
    p.rowCache.delete(m);
  }
  if (added) p.version++;
}

// ---------------------------------------------------------------- display geometry

// visible frequency band of both spectrograms: fs/2 divided by the zoom, centered on zoomCenter
function fView() {
  const fMax = fsNow() / 2, band = fMax / zoom;
  const lo = constrain(zoomCenter - band / 2, 0, fMax - band);
  return [lo, lo + band];
}

function fsNow() { return source === 'mic' ? fsMic : FS_SYN; }
function spanSamples() { return Math.round(SPAN_S * fsNow()); }
function dispStartSample() { return source === 'mic' ? micCount - spanSamples() : 0; }

// frame whose center is nearest to display time t (seconds), or null
function frameAt(p, t) {
  if (!p.N) return null;
  const s = dispStartSample() + t * fsNow();
  const m = Math.round((s - p.N / 2) / p.H);
  const fr = p.frames.get(m);
  return fr ? { m, fr, center: (m * p.H + p.N / 2 - dispStartSample()) / fsNow() } : null;
}

function levelAt(p, t, f) {
  const a = frameAt(p, t);
  if (!a) return null;
  const k = Math.round(f / (fsNow() / p.nfft));
  return a.fr[constrain(k, 0, a.fr.length - 1)];
}

function panelFrameCount(p) {
  if (source !== 'mic') return p.frames.size;
  let n = 0;
  const s0 = dispStartSample();
  for (const m of p.frames.keys()) if (m * p.H >= s0) n++;
  return n;
}

// ---------------------------------------------------------------- color maps

function hexToRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

function buildLuts() {
  const anchors = {
    viridis: ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'],
    inferno: ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4'],
    gray: ['#000000', '#ffffff'],
    jet: null
  };
  for (const key of CMAP_KEYS) {
    const lut = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const v = i / 255;
      let rgb;
      if (key === 'jet') {
        // classic piecewise-linear rainbow: dark blue, blue, cyan, yellow, red, dark red
        const r = constrain(Math.min(4 * v - 1.5, -4 * v + 4.5), 0, 1);
        const g = constrain(Math.min(4 * v - 0.5, -4 * v + 3.5), 0, 1);
        const b = constrain(Math.min(4 * v + 0.5, -4 * v + 2.5), 0, 1);
        rgb = [255 * r, 255 * g, 255 * b];
      } else {
        const a = anchors[key], pos = v * (a.length - 1), j = Math.min(a.length - 2, Math.floor(pos)), u = pos - j;
        const c0 = hexToRgb(a[j]), c1 = hexToRgb(a[j + 1]);
        rgb = [0, 1, 2].map(q => c0[q] + (c1[q] - c0[q]) * u);
      }
      lut[3 * i] = rgb[0]; lut[3 * i + 1] = rgb[1]; lut[3 * i + 2] = rgb[2];
    }
    LUTS[key] = lut;
  }
}

// ---------------------------------------------------------------- rendering

// Each pixel shows the strongest STFT cell it covers (frames whose center falls in the pixel
// column, bins whose center falls in the pixel row), so narrow lines and short bursts cannot
// fall between pixels. When a cell is larger than a pixel, the nearest cell is shown.
function renderPanel(p, wPx, hPx) {
  const dispStart = dispStartSample();
  const [vLo, vHi] = fView();
  const key = [p.version, p.floor, p.cmap, wPx, hPx, dispStart, source, vLo, vHi].join('|');
  if (key === p.imgKey) return;
  p.imgKey = key;
  if (p.off.width !== wPx || p.off.height !== hPx) {
    p.off.width = wPx; p.off.height = hPx;
    p.imgData = null;
  }
  const ctx = p.off.getContext('2d');
  if (!p.imgData) p.imgData = ctx.createImageData(wPx, hPx);
  const data = p.imgData.data;
  const span = spanSamples(), binHz = fsNow() / p.nfft, nb = p.nfft / 2 + 1;
  // each frame is reduced to one value per pixel row once, and cached until the view changes
  const viewKey = [vLo, vHi, hPx, p.nfft].join('|');
  if (viewKey !== p.rowCacheKey || p.frames !== p.rowCacheFrames) {
    p.rowCache = new Map();
    p.rowCacheKey = viewKey;
    p.rowCacheFrames = p.frames;
  }
  const kLo = new Int32Array(hPx), kHi = new Int32Array(hPx);
  for (let y = 0; y < hPx; y++) {
    const fBot = vLo + (hPx - y - 1) / hPx * (vHi - vLo), fTop = vLo + (hPx - y) / hPx * (vHi - vLo);
    let a = Math.ceil(fBot / binHz - 1e-9), b = Math.ceil(fTop / binHz - 1e-9) - 1;
    if (b < a) a = b = Math.round((fBot + fTop) / 2 / binHz);
    kLo[y] = Math.max(0, Math.min(nb - 1, a));
    kHi[y] = Math.max(0, Math.min(nb - 1, b));
  }
  const lut = LUTS[p.cmap], floor = p.floor, scale = 255 / -floor;
  const col = new Float32Array(hPx);
  const N2 = p.N / 2, H = p.H;
  for (let x = 0; x < wPx; x++) {
    const sA = dispStart + x / wPx * span, sB = dispStart + (x + 1) / wPx * span;
    let mA = Math.ceil((sA - N2) / H - 1e-9), mB = Math.ceil((sB - N2) / H - 1e-9) - 1;
    if (mB < mA) mA = mB = Math.round(((sA + sB) / 2 - N2) / H);
    let any = false;
    col.fill(-1e9);
    for (let m = mA; m <= mB; m++) {
      let rows = p.rowCache.get(m);
      if (!rows) {
        const fr = p.frames.get(m);
        if (!fr) continue;
        rows = new Float32Array(hPx);
        for (let y = 0; y < hPx; y++) {
          let v = fr[kLo[y]];
          for (let k = kLo[y] + 1; k <= kHi[y]; k++) if (fr[k] > v) v = fr[k];
          rows[y] = v;
        }
        p.rowCache.set(m, rows);
      }
      any = true;
      for (let y = 0; y < hPx; y++) if (rows[y] > col[y]) col[y] = rows[y];
    }
    for (let y = 0; y < hPx; y++) {
      const o = (y * wPx + x) * 4;
      if (!any) {
        data[o] = NO_FRAME[0]; data[o + 1] = NO_FRAME[1]; data[o + 2] = NO_FRAME[2];
      } else {
        const lv = Math.max(0, Math.min(255, Math.round((col[y] - floor) * scale)));
        data[o] = lut[3 * lv]; data[o + 1] = lut[3 * lv + 1]; data[o + 2] = lut[3 * lv + 2];
      }
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(p.imgData, 0, 0);
}

function computeLayout() {
  L.wide = canvasWidth >= 700;
  controlHeight = L.wide ? 176 : 204;
  drawHeight = canvasHeight - controlHeight;
  L.plotL = L.wide ? 56 : 44;
  L.plotR = canvasWidth - margin;
  L.titleY = 16;
  L.promptLines = L.wide ? 3 : 5;
  L.lineH = L.wide ? 17 : 15;
  L.promptTop = 31;
  L.promptH = L.promptLines * L.lineH + 8;
  L.sliceH = L.wide ? 90 : 76;
  const fixed = L.promptTop + L.promptH + 6 + 2 * 17 + 6 + 18 + 22 + L.sliceH + 16 + 4;
  L.panelH = Math.floor((drawHeight - fixed) / 2);
  let y = L.promptTop + L.promptH + 6;
  L.capY = [];
  L.imgY = [];
  for (let i = 0; i < 2; i++) {
    L.capY.push(y + 8);
    y += 17;
    L.imgY.push(y);
    y += L.panelH;
    if (i === 0) y += 6;
  }
  L.timeY = y + 5;
  y += 18;
  L.cursorY = y + 11;
  y += 22;
  L.sliceTop = y;
  y += L.sliceH;
  L.sliceLabelY = y + 3;
}

function drawHeader() {
  noStroke();
  // status (right)
  textSize(L.wide ? 14 : 13);
  let status, col = [70, 70, 70];
  if (source !== 'mic') {
    status = L.wide ? 'fs = ' + FS_SYN + ' Hz, ' + SPAN_S.toFixed(1) + ' s of signal' : 'fs = 8 kHz';
  } else if (micState === 'live') {
    status = '● Live, fs = ' + fmtNum(fsMic, 4) + ' Hz'; col = [0, 128, 0];
  } else if (micState === 'opening') {
    status = 'Opening microphone...'; col = [200, 110, 0];
  } else if (micState === 'stopped') {
    status = L.wide ? '● Stopped (frozen), fs = ' + fmtNum(fsMic, 4) + ' Hz' : '● Stopped'; col = [190, 30, 30];
  } else if (micState === 'error') {
    status = L.wide ? 'Microphone unavailable' : 'No microphone'; col = [190, 30, 30];
  } else {
    status = L.wide ? 'Microphone: press Start mic' : 'Press Start mic';
  }
  fill(...col);
  textAlign(RIGHT, CENTER);
  text(status, canvasWidth - margin, L.titleY);
  const sw = advW(status);
  fill('black');
  textStyle(BOLD);
  fitText(['Interactive Spectrogram Parameter Explorer', 'Spectrogram Parameter Explorer', 'Spectrogram Explorer'],
          margin, L.titleY, canvasWidth - 2 * margin - sw - 12, L.wide ? 20 : 17, LEFT);
  textStyle(NORMAL);
}

function fillTemplate(s) {
  const fs = fsNow();
  const vals = {};
  panels.forEach(p => {
    vals[p.name + '.dt'] = fmtNum(p.N / fs * 1000, 3) + ' ms';
    vals[p.name + '.df'] = fmtNum(fs / p.N, 3) + ' Hz';
  });
  return s.replace(/\{([AB]\.(dt|df))\}/g, (m0, k) => vals[k] || m0);
}

function drawPrompt() {
  const x = margin, w = canvasWidth - 2 * margin, y = L.promptTop, h = L.promptH;
  let label, body, bg, labCol;
  if (!currentChallenge) {
    label = 'Explore: ';
    body = source === 'mic'
      ? 'press Start mic and whistle, hum or speak. Give panels A and B different settings and point at a spectrogram to compare the time, frequency and level they report.'
      : 'choose a signal and give panels A and B different settings. Point at a spectrogram to read the time, frequency and level in both panels; the slice compares the two frames under the cursor.';
    bg = [255, 255, 255]; labCol = [60, 60, 60];
  } else if (!revealed) {
    label = 'Predict: ';
    body = fillTemplate(currentChallenge.prompt) + ' Then press Reveal.';
    bg = [255, 248, 225]; labCol = [150, 100, 0];
  } else {
    label = 'Answer: ';
    body = fillTemplate(currentChallenge.answer);
    bg = [232, 245, 233]; labCol = [30, 110, 40];
  }
  fill(...bg);
  stroke(200);
  strokeWeight(1);
  rect(x, y, w, h, 6);
  noStroke();
  // wrap with a bold label at the start of the first line, shrinking the font if needed
  let sz = L.wide ? 15 : 14, lines, labW;
  for (; sz >= 11; sz--) {
    textSize(sz);
    textStyle(BOLD);
    labW = advW(label);
    textStyle(NORMAL);
    lines = wrapText(body, w - 16, labW);
    if (lines.length <= L.promptLines) break;
  }
  const lh = Math.min(L.lineH, sz + 3);
  const y0 = y + 4 + lh / 2 + (L.promptLines * L.lineH - lines.length * lh) / 2;
  textAlign(LEFT, CENTER);
  textSize(sz);
  textStyle(BOLD);
  fill(...labCol);
  text(label.trim(), x + 8, y0);
  textStyle(NORMAL);
  fill(30);
  lines.slice(0, L.promptLines).forEach((ln, i) => text(ln, x + 8 + (i === 0 ? labW : 0), y0 + i * lh));
}

function wrapText(str, maxW, firstIndent) {
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const wd of words) {
    const test = cur ? cur + ' ' + wd : wd;
    const avail = maxW - (lines.length === 0 ? firstIndent : 0);
    if (advW(test) <= avail || !cur) cur = test;
    else { lines.push(cur); cur = wd; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawPanel(p, i) {
  const x0 = L.plotL, x1 = L.plotR, y0 = L.imgY[i], h = L.panelH, w = x1 - x0;
  const fs = fsNow();

  // caption: badge + settings + resolution read-outs
  const cy = L.capY[i];
  drawBadge(p, margin + 9, cy);
  const fpsTxt = fmtNum(fs / p.H, 3);
  const nFr = panelFrameCount(p);
  const dt = fmtNum(p.N / fs * 1000, 4) + ' ms', df = fmtNum(fs / p.N, 4) + ' Hz';
  const tag = WINDOW_NAMES[p.win] + ', N = ' + p.N + ', ' + p.ovPct + '% overlap, pad ×' + p.pad;
  const padNote = p.pad > 1 ? ' (FFT bins ' + fmtNum(fs / p.nfft, 4) + ' Hz)' : '';
  noStroke();
  fill(...p.col);
  fitText([
    tag + '    N/fs = ' + dt + '    fs/N = ' + df + padNote + '    ' + fpsTxt + ' frames/s    ' + nFr + ' frames',
    tag + '   N/fs = ' + dt + '   fs/N = ' + df + padNote + '   ' + fpsTxt + ' frames/s   ' + nFr + ' frames',
    tag + '   N/fs ' + dt + '   fs/N ' + df + '   ' + fpsTxt + ' fr/s   ' + nFr + ' fr',
    'N/fs = ' + dt + '   fs/N = ' + df + padNote + '   ' + fpsTxt + ' frames/s   ' + nFr + ' frames',
    'N/fs ' + dt + ' · fs/N ' + df + ' · ' + fpsTxt + ' fr/s · ' + nFr + ' fr',
    dt + ' · ' + df + ' · ' + fpsTxt + ' fr/s'
  ], margin + 24, cy, canvasWidth - 2 * margin - 24, L.wide ? 14 : 13, LEFT);

  // spectrogram image
  renderPanel(p, Math.max(1, Math.round(w)), Math.max(1, h));
  drawingContext.imageSmoothingEnabled = false;
  drawingContext.drawImage(p.off, x0, y0, w, h);
  drawingContext.imageSmoothingEnabled = true;
  noFill();
  stroke(120);
  strokeWeight(1);
  rect(x0, y0, w, h);

  // frequency axis (kHz) over the visible band
  const [vLo, vHi] = fView();
  const fy = f => y0 + h - (f - vLo) / (vHi - vLo) * h;
  textSize(12);
  noStroke();
  fill(60);
  textAlign(RIGHT, CENTER);
  let fStep = 2000;
  for (const st of [25, 50, 100, 200, 250, 500, 1000, 2000]) { if (st / (vHi - vLo) * h >= 24) { fStep = st; break; } }
  for (let f = Math.ceil(vLo / fStep - 1e-9) * fStep; f <= vHi + 1e-6; f += fStep) {
    const y = fy(f);
    stroke(90);
    line(x0 - 4, y, x0, y);
    noStroke();
    text(fmtNum(f / 1000, 4), x0 - 6, constrain(y, y0 + 6, y0 + h - 5));
  }
  push();
  translate(L.wide ? 14 : 10, y0 + h / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  textSize(12);
  fill(60);
  text('f (kHz)', 0, 0);
  pop();

  // frame rug: one tick per frame center when the frames are at least 3 px apart
  const pxPerFrame = p.H / spanSamples() * w;
  if (pxPerFrame >= 3) {
    stroke(...p.col);
    strokeWeight(1);
    const s0 = dispStartSample();
    for (const m of p.frames.keys()) {
      const x = x0 + ((m * p.H + p.N / 2 - s0) / spanSamples()) * w;
      if (x >= x0 && x <= x1) line(x, y0 + h + 1, x, y0 + h + 4);
    }
  }

  // messages when there is nothing to show
  if (source === 'mic' && micCount === 0) {
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(L.wide ? 15 : 13);
    let msg;
    if (micState === 'opening') { fill(90); msg = 'Opening the microphone... allow access if the browser asks.'; }
    else if (micState === 'error') { fill(190, 30, 30); msg = micMessage; }
    else { fill(70); msg = 'Press Start mic and allow microphone access.'; }
    const lines = wrapText(msg, w - 20, 0);
    lines.forEach((ln, j) => text(ln, (x0 + x1) / 2, y0 + h / 2 + (j - (lines.length - 1) / 2) * 18));
  }

  // linked cursor and the analysis window of the frame under it
  // (the frequency is marked by edge ticks and a ring, so a line cannot hide a weak tone)
  const cx = x0 + cursor.t / SPAN_S * w;
  const inBand = cursor.f >= vLo && cursor.f <= vHi;
  const cyF = fy(constrain(cursor.f, vLo, vHi));
  drawingContext.setLineDash([4, 3]);
  for (const [col, wt] of [[[0, 0, 0, 150], 3], [[255, 255, 255], 1]]) {
    stroke(...col);
    strokeWeight(wt);
    if (inBand) {
      line(cx, y0, cx, cyF - 9);
      line(cx, cyF + 9, cx, y0 + h);
    } else {
      line(cx, y0, cx, y0 + h);
    }
  }
  drawingContext.setLineDash([]);
  if (inBand) {
    for (const [col, wt] of [[[0, 0, 0, 160], 3.5], [[255, 255, 255], 1.5]]) {
      stroke(...col);
      strokeWeight(wt);
      noFill();
      line(x0, cyF, x0 + 10, cyF);
      line(x1 - 10, cyF, x1, cyF);
      circle(cx, cyF, 13);
    }
  }
  const a = frameAt(p, cursor.t);
  if (a) {
    const xa = x0 + (a.center - p.N / 2 / fs) / SPAN_S * w;
    const xb = x0 + (a.center + p.N / 2 / fs) / SPAN_S * w;
    const hh = Math.min(18, h * 0.18);
    noFill();
    for (const [col, wt] of [[[0, 0, 0, 160], 3.5], [[255, 255, 255], 1.5]]) {
      stroke(...col);
      strokeWeight(wt);
      beginShape();
      const steps = Math.max(8, Math.min(120, Math.round(xb - xa)));
      for (let j = 0; j <= steps; j++) {
        const n = Math.min(p.N - 1, Math.round(j / steps * (p.N - 1)));
        const xx = constrain(xa + (xb - xa) * j / steps, x0, x1);
        vertex(xx, y0 + 2 + hh * (1 - p.w[n]));
      }
      endShape();
    }
  }
}

function drawBadge(p, x, y) {
  noStroke();
  fill(...p.col);
  circle(x, y, 18);
  fill(255);
  textStyle(BOLD);
  textSize(12);
  textAlign(CENTER, CENTER);
  text(p.name, x, y + 0.5);
  textStyle(NORMAL);
}

function drawTimeAxis() {
  const x0 = L.plotL, x1 = L.plotR, w = x1 - x0;
  const mic = source === 'mic';
  const title = mic ? 't (s), 0 = now' : 't (s)';
  textSize(12);
  noStroke();
  fill(60);
  textAlign(RIGHT, TOP);
  text(title, x1, L.timeY);
  const titleW = advW(title);
  let step = 1;
  for (const s of [0.1, 0.25, 0.5, 1]) { if (s / SPAN_S * w >= 48) { step = s; break; } }
  textAlign(CENTER, TOP);
  for (let t = 0; t <= SPAN_S + 1e-9; t += step) {
    const x = x0 + t / SPAN_S * w;
    stroke(90);
    line(x, L.imgY[1] + L.panelH, x, L.imgY[1] + L.panelH + 4);
    line(x, L.imgY[0] + L.panelH, x, L.imgY[0] + L.panelH + 3);
    noStroke();
    const lab = mic ? fmtSigned(t - SPAN_S, step < 0.5 ? 2 : 1) : fmtNum(t, 3);
    if (x + advW(lab) / 2 > x1 - titleW - 6) continue;
    text(lab, x, L.timeY);
  }
}

function drawCursorLine() {
  const y = L.cursorY;
  const fs = fsNow();
  const mic = source === 'mic';
  const tShow = mic ? fmtSigned(cursor.t - SPAN_S, 3) : cursor.t.toFixed(3);
  const vA = levelAt(panels[0], cursor.t, cursor.f), vB = levelAt(panels[1], cursor.t, cursor.f);
  const dbs = v => (v === null ? 'no frame' : (v <= -200 ? '< \u2212200 dB' : fmtSigned(v, 1) + ' dB'));
  const sz = L.wide ? 14 : 13;
  const head = (L.wide ? 'Cursor  t = ' : 't = ') + tShow + ' s,  f = ' + Math.round(cursor.f) + ' Hz';
  const pieces = [
    { s: head + '     ', c: [30, 30, 30] },
    { s: 'A: ' + dbs(vA) + '     ', c: COL_A },
    { s: 'B: ' + dbs(vB), c: COL_B }
  ];
  textSize(sz);
  noStroke();
  textAlign(LEFT, CENTER);
  let x = margin;
  const total = pieces.reduce((s, q) => s + advW(q.s), 0);
  if (total > canvasWidth - 2 * margin) { pieces[0].s = tShow + ' s, ' + Math.round(cursor.f) + ' Hz  '; pieces[1].s = 'A ' + dbs(vA) + '  '; pieces[2].s = 'B ' + dbs(vB); }
  for (const q of pieces) { fill(...q.c); text(q.s, x, y); x += advW(q.s); }
  // what the slice below shows (the A and B colors above double as its legend)
  const r = sliceRange();
  fill(100);
  textAlign(RIGHT, CENTER);
  textSize(L.wide ? 13 : 12);
  const notes = [
    'Slice: frame spectra at the cursor' + (sliceHasDots ? ' (dots = bins fs/N apart)' : ', ' + Math.round(r[0]) + ' to ' + Math.round(r[1]) + ' Hz'),
    'Slice: frames at the cursor' + (sliceHasDots ? ', dots = bins fs/N apart' : ''),
    'frames at the cursor'
  ];
  for (const nt of notes) {
    if (x + advW(nt) + 16 < canvasWidth - margin) { text(nt, canvasWidth - margin, y); break; }
  }
}

function sliceRange() {
  const fMax = fsNow() / 2;
  const span = Math.min(SLICE_SPAN, fMax);
  const lo = constrain(cursor.f - span / 2, 0, fMax - span);
  return [lo, lo + span];
}

function drawSlice() {
  const x0 = L.plotL, x1 = L.plotR, y0 = L.sliceTop, h = L.sliceH, w = x1 - x0;
  const [fLo, fHi] = sliceRange();
  const yMin = Math.floor(Math.min(panels[0].floor, panels[1].floor) / 20) * 20;
  const fx = f => x0 + (f - fLo) / (fHi - fLo) * w;
  const dy = v => y0 + h - (constrain(v, yMin, 0) - yMin) / -yMin * h;

  fill(255);
  stroke(170);
  strokeWeight(1);
  rect(x0, y0, w, h);
  // dB grid and labels
  textSize(12);
  for (let v = 0; v >= yMin; v -= 20) {
    const y = dy(v);
    stroke(v === 0 ? 200 : 230);
    line(x0, y, x1, y);
  }
  noStroke();
  fill(60);
  textAlign(RIGHT, CENTER);
  text('0', x0 - 5, dy(0) + 4);
  text(String(yMin), x0 - 5, dy(yMin) - 4);
  push();
  translate(L.wide ? 14 : 10, y0 + h / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text('dB', 0, 0);
  pop();
  // frequency ticks
  let step = 500;
  for (const s of [50, 100, 200, 250, 500]) { if (s / (fHi - fLo) * w >= 46) { step = s; break; } }
  textAlign(CENTER, TOP);
  for (let f = Math.ceil(fLo / step) * step; f <= fHi + 1e-6; f += step) {
    const x = fx(f);
    stroke(235);
    line(x, y0, x, y0 + h);
    stroke(90);
    line(x, y0 + h, x, y0 + h + 4);
    noStroke();
    fill(60);
    if (x + 30 < x1 - 40 || f === Math.ceil(fLo / step) * step) text(String(Math.round(f)), x, L.sliceLabelY + 2);
  }
  textAlign(RIGHT, TOP);
  fill(60);
  text('f (Hz)', x1, L.sliceLabelY + 2);
  // cursor frequency
  stroke(218, 165, 32);
  strokeWeight(1.5);
  line(fx(constrain(cursor.f, fLo, fHi)), y0, fx(constrain(cursor.f, fLo, fHi)), y0 + h);

  // the two frame spectra; dots mark the bins fs/N apart (the true resolution grid)
  push();                                  // p5 push/pop keeps its cached fill and stroke in step with the canvas
  drawingContext.beginPath();
  drawingContext.rect(x0, y0, w, h);
  drawingContext.clip();
  let anyDots = false;
  for (const p of panels) {
    const a = frameAt(p, cursor.t);
    if (!a) continue;
    const binHz = fsNow() / p.nfft;
    const k0 = Math.max(0, Math.floor(fLo / binHz)), k1 = Math.min(a.fr.length - 1, Math.ceil(fHi / binHz));
    noFill();
    stroke(...p.col);
    strokeWeight(2);
    beginShape();
    for (let k = k0; k <= k1; k++) vertex(fx(k * binHz), dy(a.fr[k]));
    endShape();
    const dotPx = (fsNow() / p.N) / (fHi - fLo) * w;
    if (dotPx >= 5) {
      anyDots = true;
      noStroke();
      fill(...p.col);
      for (let k = k0; k <= k1; k++) if (k % p.pad === 0) circle(fx(k * binHz), dy(a.fr[k]), 5);
    }
  }
  pop();
  sliceHasDots = anyDots;
}

function drawControlLabels() {
  noStroke();
  const sz = L.wide ? 15 : 14;
  for (const p of panels) {
    if (!p.ctrlVisible) continue;
    drawBadge(p, p.colX + 10, p.badgeY);
    fill(20);
    const fs = fsNow();
    const maxW = p.labelW - 8;
    fitText(['Window N = ' + p.N + ' (' + fmtNum(p.N / fs * 1000, 4) + ' ms)', 'Window N = ' + p.N, 'N = ' + p.N],
            p.colX, p.rowY[0], maxW, sz, LEFT);
    fitText(['Overlap ' + p.ovPct + '% (hop H = ' + p.H + ')', 'Overlap ' + p.ovPct + '% (H = ' + p.H + ')', 'Overlap ' + p.ovPct + '%', p.ovPct + '%'],
            p.colX, p.rowY[1], maxW, sz, LEFT);
    const fl = fmtSigned(p.floor, 0);
    fitText(['dB floor ' + fl + ' dB', 'Floor ' + fl + ' dB', fl + ' dB'], p.colX, p.rowY[2], maxW, sz, LEFT);
  }
  if (L.wide) {
    stroke(225);
    line(canvasWidth / 2, drawHeight + 42, canvasWidth / 2, canvasHeight - 8);
  } else {
    noStroke();
    fill(20);
    textSize(14);
    textAlign(RIGHT, CENTER);
    text('Edit:', L.editLabelX, drawHeight + 53);
  }
}

// ---------------------------------------------------------------- interaction

function followPointer() {
  if (mouseX < L.plotL || mouseX > L.plotR) return;
  for (let i = 0; i < 2; i++) {
    if (mouseY >= L.imgY[i] && mouseY <= L.imgY[i] + L.panelH) {
      cursor.t = constrain((mouseX - L.plotL) / (L.plotR - L.plotL) * SPAN_S, 0, SPAN_S);
      const [vLo, vHi] = fView();
      cursor.f = constrain(vLo + (L.imgY[i] + L.panelH - mouseY) / L.panelH * (vHi - vLo), 0, fsNow() / 2);
    }
  }
}

// a click (or tap) in a spectrogram centers the frequency zoom there
function mousePressed() {
  followPointer();
  if (mouseX < L.plotL || mouseX > L.plotR) return;
  for (let i = 0; i < 2; i++) {
    if (mouseY >= L.imgY[i] && mouseY <= L.imgY[i] + L.panelH) zoomCenter = cursor.f;
  }
}

function setSource(id, fromUser) {
  if (!SOURCES.find(s => s.id === id)) id = 'chirp';
  if (id !== 'mic' && (micState === 'live' || micState === 'opening')) stopMic();
  source = id;
  if (fromUser && currentChallenge && currentChallenge.src !== id) {
    challengeSelect.selected('none');
    applyChallenge('none');
  }
  for (const p of panels) p.dirty = true;
}

function applyChallenge(id) {
  const ch = CHALLENGES.find(c => c.id === id) || CHALLENGES[0];
  revealed = false;
  revealButton.html('Reveal');
  if (ch.id === 'none') {
    currentChallenge = null;
    revealButton.attribute('disabled', '');
    return;
  }
  currentChallenge = ch;
  revealButton.removeAttribute('disabled');
  if (ch.src !== source) {
    sourceSelect.selected(ch.src);
    setSource(ch.src, false);
  }
  setControls(panels[0].c, ch.A);
  setControls(panels[1].c, ch.B);
  cursor = { t: ch.cursor.t, f: ch.cursor.f };
  zoomSelect.selected(String(ch.zoom || 1));
  zoomCenter = ch.zc || 2000;
}

function toggleReveal() {
  if (!currentChallenge) return;
  revealed = !revealed;
  revealButton.html(revealed ? 'Hide' : 'Reveal');
}

// ---------------------------------------------------------------- microphone

function toggleMic() {
  if (micState === 'live' || micState === 'opening') { stopMic(); return; }
  if (source !== 'mic') {
    if (currentChallenge && currentChallenge.src !== 'mic') { challengeSelect.selected('none'); applyChallenge('none'); }
    sourceSelect.selected('mic');
    setSource('mic', false);
  }
  startMic();
}

// Called from the button click (a user gesture), so the audio context may start.
function startMic() {
  try {
    if (typeof p5 === 'undefined' || typeof p5.AudioIn !== 'function' || typeof p5.FFT !== 'function') {
      throw new Error('the p5.sound library did not load.');
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('this page has no microphone access here (it must be served over https or from localhost).');
    }
    userStartAudio();                       // the audio context starts suspended
    const ctx = getAudioContext();
    if (ctx.state !== 'running') { try { ctx.resume(); } catch (e) { /* AudioIn.start() asks too */ } }
    micSr = ctx.sampleRate;
    micD = Math.max(1, Math.round(micSr / MIC_TARGET_FS));
    fsMic = micSr / micD;
    firTaps = makeDecimationFilter(micD, micSr, 0.4125 * fsMic);
    if (!micTap) {
      micTap = new p5.FFT(1024);            // only its waveform() is used
      micTap.samples.size = MIC_WAVE;       // waveform() returns the latest MIC_WAVE raw samples
    }
    if (micIn) retireMic();                 // never call start() twice on one AudioIn
    micIn = new p5.AudioIn();
    micIn.disconnect();                     // never play the live microphone through the speakers
    micIn.connect(micTap);                  // ...but do analyse it
    micIn.start();                          // opens asynchronously; pollMic() sees when it is live
    resetMicBuffers();
    for (const p of panels) p.dirty = true;
    micState = 'opening';
    micSince = millis();
    micMessage = '';
    micButton.html('Stop mic');
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' }).then(st => {
        if (st.state === 'denied' && micState === 'opening') micFailed('access to the microphone is blocked for this page.');
      }).catch(() => {});
    }
  } catch (e) {
    micFailed(e && e.message ? e.message : String(e));
  }
}

function micFailed(reason) {
  if (micIn) retireMic();
  micState = 'error';
  micMessage = 'Microphone unavailable: ' + reason;
  micButton.html('Start mic');
}

function stopMic() {
  if (micIn) {
    let open = false;
    try { open = micIn.node.state === 'started'; } catch (e) { open = false; }
    if (open) { micIn.stop(); micIn.disconnect(); micIn = null; }
    else retireMic();                       // permission may still arrive for this request
  }
  micState = micCount > 0 ? 'stopped' : 'idle';
  micButton.html('Start mic');
}

// An AudioIn whose request is still pending: if it opens later it is closed at once.
function retireMic() {
  try { micIn.disconnect(); } catch (e) { /* already disconnected */ }
  retiredMics.push(micIn);
  micIn = null;
}

function resetMicBuffers() {
  micPrev = null;
  rawCount = 0; decNext = 0;
  micCount = 0; micGaps = 0; micStitched = 0;
  rawBuf.fill(0);
  micBuf.fill(0);
}

// Windowed-sinc (Blackman) low-pass for decimation by D
function makeDecimationFilter(D, sr, fc) {
  const n = 32 * D + 1, mid = (n - 1) / 2, h = new Float64Array(n);
  let s = 0;
  for (let j = 0; j < n; j++) {
    const x = j - mid;
    const sinc = x === 0 ? 2 * fc / sr : Math.sin(2 * Math.PI * fc / sr * x) / (Math.PI * x);
    const bw = 0.42 - 0.5 * Math.cos(2 * Math.PI * j / (n - 1)) + 0.08 * Math.cos(4 * Math.PI * j / (n - 1));
    h[j] = sinc * bw;
    s += h[j];
  }
  for (let j = 0; j < n; j++) h[j] /= s;
  return h;
}

// Once per frame: follow the microphone stream and pull its new samples.
function pollMic() {
  retiredMics = retiredMics.filter(m => {
    let open = false;
    try { open = m.node.state === 'started'; } catch (e) { return false; }
    if (open) { m.stop(); return false; }
    return true;
  });
  if (!micIn) return;
  let open = false;
  try { open = micIn.node.state === 'started'; } catch (e) { open = false; }
  if (micState === 'opening') {
    if (open) { micState = 'live'; micPrev = null; }
    else if (millis() - micSince > MIC_TIMEOUT_MS) {
      micFailed('the microphone did not open. Allow microphone access for this page, then press Start mic again.');
      return;
    }
  }
  if (micState === 'live' && open) pullMicSamples();
}

// fft.waveform() returns the latest MIC_WAVE samples. Find how far the new block is shifted
// against the previous one (exact sample match) and append only the samples that are new.
function pullMicSamples() {
  const w = micTap.waveform();
  const W = w.length;
  const now = getAudioContext().currentTime;
  if (!micPrev || micPrev.length !== W) {
    micPrev = Float32Array.from(w);
    micPrevTime = now;
    appendRaw(micPrev, 0, W);
    return;
  }
  const est = (now - micPrevTime) * micSr;
  let d = findShift(micPrev, w, est);
  if (d < 0) {                              // no overlap found (a long pause): keep the time axis right
    micGaps++;
    const gap = Math.max(0, Math.round(est));
    if (gap > W) appendZeros(Math.min(gap - W, MIC_RING));
    d = Math.min(W, Math.max(gap, 0));
  } else if (d > 0) {
    micStitched++;
  }
  if (d > 0) appendRaw(w, W - d, W);
  micPrev.set(w);
  micPrevTime = now;
}

function findShift(prev, cur, est) {
  const W = cur.length;
  const matches = d => {
    if (d < 0 || d > W - 32) return false;
    const n = W - d;
    for (const q of [0, 0.13, 0.29, 0.5, 0.71, 0.87, 1]) {
      const i = Math.floor(q * (n - 1));
      if (cur[i] !== prev[i + d]) return false;
    }
    for (let i = 0; i < n; i += 5) if (cur[i] !== prev[i + d]) return false;
    return true;
  };
  // the analyser advances in render quanta of 128 samples: try those first, nearest the estimate
  const q0 = Math.round(est / 128);
  for (let r = 0; r <= W / 128; r++) {
    for (const s of (r === 0 ? [0] : [r, -r])) {
      const d = (q0 + s) * 128;
      if (matches(d)) return d;
    }
  }
  const e = Math.round(est);
  for (let r = 0; r <= 1024; r++) {
    if (matches(e + r)) return e + r;
    if (r > 0 && matches(e - r)) return e - r;
  }
  return -1;
}

function appendZeros(n) {
  for (let i = 0; i < n; i++) { rawBuf[rawCount & (RAW_RING - 1)] = 0; rawCount++; decimate(); }
}

function appendRaw(arr, from, to) {
  for (let i = from; i < to; i++) {
    rawBuf[rawCount & (RAW_RING - 1)] = arr[i];
    rawCount++;
    decimate();
  }
}

// low-pass filter and keep every D-th sample
function decimate() {
  const h = firTaps, nT = h.length;
  while (decNext < rawCount) {
    let acc = 0;
    for (let j = 0; j < nT; j++) {
      const idx = decNext - j;
      if (idx < 0) break;
      acc += h[j] * rawBuf[idx & (RAW_RING - 1)];
    }
    micBuf[micCount & (MIC_RING - 1)] = acc;
    micCount++;
    decNext += micD;
  }
}

// ---------------------------------------------------------------- layout of the controls

function place(el, x, y, w) {
  el.position(Math.round(x), Math.round(y));
  if (w) el.style('width', Math.round(w) + 'px');
}

function layoutControls(force) {
  if (typeof lenSliderB === 'undefined' || !panels.length) return;
  if (!force && canvasWidth === layoutWidth) return;
  layoutWidth = canvasWidth;
  const W = canvasWidth, y0 = drawHeight;
  if (L.wide) {
    let x = 10;
    const ry = y0 + 9;
    const rest = W - 20 - 40 - 70 - 88 - 84;              // room left for the two selects
    const sw = Math.min(230, Math.floor(rest * 0.42)), cw = Math.min(320, rest - sw);
    place(sourceSelect, x, ry, sw); x += sw + 10;
    place(challengeSelect, x, ry, cw); x += cw + 10;
    place(revealButton, x, ry, 70); x += 80;
    place(micButton, x, ry, 88); x += 98;
    place(zoomSelect, x, ry, 84);
    editRadio.hide();
    panels.forEach((p, i) => {
      p.colX = i === 0 ? 10 : Math.round(W / 2) + 10;
      p.colW = Math.round(W / 2) - 20;
      showPanelControls(p, true);
      positionPanelControls(p, y0 + 44);
    });
  } else {
    const half = Math.floor((W - 30) / 2);
    place(sourceSelect, 10, y0 + 8, half);
    place(challengeSelect, 20 + half, y0 + 8, half);
    place(revealButton, 10, y0 + 40, 64);
    place(micButton, 80, y0 + 40, 84);
    place(zoomSelect, 170, y0 + 41, 78);
    editRadio.show();
    editRadio.position(Math.min(W - 82, 294), y0 + 44);
    L.editLabelX = Math.min(W - 82, 294) - 4;
    const ed = editRadio.value() === 'B' ? panels[1] : panels[0];
    panels.forEach(p => {
      p.colX = 10;
      p.colW = W - 20;
      showPanelControls(p, p === ed);
      if (p === ed) positionPanelControls(p, y0 + 74);
    });
  }
}

function showPanelControls(p, on) {
  p.ctrlVisible = on;
  for (const k of ['win', 'pad', 'cmap', 'len', 'ov', 'floor']) { if (on) p.c[k].show(); else p.c[k].hide(); }
}

function positionPanelControls(p, yTop) {
  const x0 = p.colX + 26, avail = p.colW - 26, gap = 6, sw = Math.floor((avail - 2 * gap) / 3);
  place(p.c.win, x0, yTop, sw);
  place(p.c.pad, x0 + sw + gap, yTop, sw);
  place(p.c.cmap, x0 + 2 * (sw + gap), yTop, sw);
  p.badgeY = yTop + 11;
  p.labelW = L.wide ? Math.min(205, Math.round(p.colW * 0.5)) : Math.min(170, Math.round(p.colW * 0.47));
  const sx = p.colX + p.labelW, sWid = Math.max(60, p.colW - p.labelW);
  [p.c.len, p.c.ov, p.c.floor].forEach((s, i) => {
    s.position(sx, yTop + 34 + 32 * i);
    s.size(sWid);
  });
  p.rowY = [0, 1, 2].map(i => yTop + 34 + 32 * i + 9);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) canvasWidth = Math.floor(container.getBoundingClientRect().width) || canvasWidth;
  computeLayout();
  layoutControls(false);
}

// ---------------------------------------------------------------- text helpers

// advance width: in p5 2.x textWidth() ignores spaces, so pieces placed side by side use fontWidth()
function advW(s) {
  return typeof fontWidth === 'function' ? fontWidth(s) : textWidth(s);
}

// draw the first candidate that fits in maxW (the last one otherwise)
function fitText(cands, x, y, maxW, sz, align) {
  textSize(sz);
  textAlign(align, CENTER);
  for (const c of cands) {
    if (advW(c) <= maxW) { text(c, x, y); return; }
  }
  text(cands[cands.length - 1], x, y);
}

// up to `sig` significant digits, trailing zeros removed (8, 31.25, 3.906)
function fmtNum(v, sig) {
  return String(Number(v.toPrecision(sig)));
}

function fmtSigned(v, d) {
  const r = Number(v.toFixed(d));
  return (r < 0 ? '−' : '') + Math.abs(r).toFixed(d);
}
