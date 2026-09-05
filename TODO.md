# TODO

<!-- p5js-v2-audit-2026-09-05 -->
## p5.js 2.x Upgrade: MicroSim Fixes Needed (2026-09-05)

A static scan of this repo's `docs/sims/` MicroSims found **3 sim(s)** using p5.js v1-only APIs that will break if upgraded to p5.js 2.x (the microsim-generator skill's templates now default to p5@2.3.2). Fix these before bumping this repo's MicroSims past p5@1.x.

- [ ] **fft-sound-file** (`docs/sims/fft-sound-file/`)
    - `fft-sound-file.js` uses `preload()`, which p5.js v2 removed entirely — move the loading calls into `async function setup()` and `await` each `load*()` call before `createCanvas()`.
    - `fft-sound-file.js` calls `loadSound(...)`, which must be awaited in v2 — call inside `async function setup()` as `sound = await loadSound(...)`.
- [ ] **frequency-detection** (`docs/sims/frequency-detection/`)
    - `frequency-detection.js` uses `preload()`, which p5.js v2 removed entirely — move the loading calls into `async function setup()` and `await` each `load*()` call before `createCanvas()`.
- [ ] **reverb** (`docs/sims/reverb/`)
    - `reverb.js` uses `preload()`, which p5.js v2 removed entirely — move the loading calls into `async function setup()` and `await` each `load*()` call before `createCanvas()`.
    - `reverb.js` calls `loadSound(...)`, which must be awaited in v2 — call inside `async function setup()` as `sound = await loadSound(...)`.

Reference: [p5.js Teachers' Guide to v2 transition](https://p5js.org/tutorials/v2_transition/)
