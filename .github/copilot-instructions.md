# path-trace

Modular, config-driven browser engine for timed path-tracing motor experiments.
Participants trace paths (arcs, V-shapes, lines) with their cursor under time pressure.
Deployed to Prolific/MTurk via Firebase Hosting; tested locally with JSON data download.

## Legacy Reference
The `legacy/` directory contains the original monolithic codebase being replaced.
Reference it for coordinate conventions, data format, and game logic, but do NOT
import from it or modify it. All new code goes in `src/`.

## Tech Stack

- **Language**: Vanilla JavaScript (ES2022+, ES modules, no TypeScript)
- **Build**: Vite 6.x (dev server + production bundler)
- **Testing**: Vitest (Jest-compatible API, jsdom environment)
- **Data (production)**: Firebase Realtime Database v10.x (modular SDK)
- **Data (local)**: In-memory accumulation → JSON file download via Blob API
- **Rendering**: HTML5 Canvas 2D (multi-layer, DPI-aware)
- **Audio**: Web Audio API with preloaded audio buffers (NOT oscillator synthesis)
- **Deployment**: Firebase Hosting (multi-site, one URL per experiment)

## Directory Structure

```
src/
├── main.js                  # Bootstrap: wire modules, start experiment
├── style.css                # Canvas layout, overlay styling
├── configs/                 # ★ Experiment configurations (one file per experiment)
│   ├── default.js           # Minimal 3-trial config for development/testing
│   └── arc-tracing-study.js # Full arc tracing study protocol
├── config/                  # Shared infrastructure (NOT experiment-specific)
│   ├── pathDefinitions.js   # Maps path names to constructor params
│   ├── trialSequence.js     # Generates ordered trial list from config
│   ├── constants.js         # Canvas size, colors, thresholds
│   └── validation.js        # Config schema validation
├── paths/                   # Pluggable path geometry implementations
│   ├── pathRegistry.js      # name → class mapping (Strategy pattern)
│   ├── ArcPath.js
│   ├── VShapePath.js
│   └── LinePath.js
├── engine/                  # Core experiment logic
│   ├── stateMachine.js      # Config-driven FSM
│   ├── trialRunner.js       # Runs one trial lifecycle
│   └── experimentRunner.js  # Loops trials, manages blocks/breaks
├── rendering/               # Canvas drawing
│   ├── canvasManager.js     # DPI scaling, multi-layer canvas init, cursor manager
│   ├── gameLoop.js          # requestAnimationFrame loop
│   └── drawFeedback.js      # Accuracy visualization, color-coded trail
├── data/                    # Storage backends
│   ├── LocalDataManager.js  # Accumulates trials, downloads JSON
│   ├── FirebaseDataManager.js
│   └── createDataManager.js # Factory: reads env, returns backend
├── audio/
│   └── audioManager.js      # Preload and play audio buffers
├── ui/
│   ├── overlayManager.js    # Instruction/break screens
│   └── progressDisplay.js   # Trial counter, timer, goal time
└── utils/
    ├── math.js              # distance(), clamp(), lerp(), lineToPoint()
    ├── timing.js            # wait(), high-res timer helpers
    └── validation.js        # Config schema checks

public/
└── sounds/                  # Static audio assets (mp3)
    ├── ready_sound.mp3      # Countdown tone (ready, set)
    ├── go_sound.mp3         # Countdown tone (go)
    └── lowbeep.mp3          # Mean-time beep during tracing

tests/
├── setup.js                 # localStorage polyfill for Node 22+ compatibility
└── *.test.js                # Test files per module
```

## Multi-Experiment Config System

Experiment configs live in `src/configs/` (plural). Shared infrastructure lives in `src/config/` (singular). These are different directories.

Vite's `--mode` flag selects which config to bundle. `vite.config.js` maps `@experiment-config` to `src/configs/<mode>.js` via `resolve.alias`. All engine code imports from `@experiment-config`, never from a specific config file.

Build metadata (`__GIT_TAG__`, `__BUILD_TIME__`, `__EXPERIMENT_MODE__`) is injected at build time via Vite `define` and attached to every data record.

## Coding Standards

- Use ES module `import`/`export` everywhere. No CommonJS `require()`.
- Use direct relative imports with extensions: `import { distance } from '../utils/math.js'`
- Engine code imports config via `import config from '@experiment-config'`, never from a specific file in `src/configs/`.
- Do NOT use barrel exports (index.js re-export files).
- Use `const` by default. Use `let` only when reassignment is needed. Never use `var`.
- All path classes implement exactly six methods: `draw()`, `getPointAtProgress()`, `getDistanceFromPath()`, `getProgressAtPoint()`, `getTargetPosition()`, `getTotalLength()`.
- State machine transitions are declarative config objects, not if/else chains.
- All experiment parameters (timing, geometry, trial counts) come from config files in `src/configs/`, never hardcoded in engine code.
- Environment switching uses Vite `.env` files: `import.meta.env.VITE_DATA_BACKEND`.
- Functions over classes where possible. Classes only for stateful objects (paths, data managers, state machine).
- No frameworks (React, Vue, etc.). Plain DOM manipulation for overlays.

## Build Commands

- `npm run dev` — Start Vite dev server with `default` config
- `npm run dev:arc-tracing` — Start Vite dev server with arc tracing study config
- `npm run build` — Production build of `default` config to `dist/default/`
- `npm run build:arc-tracing` — Production build of arc tracing study to `dist/arc-tracing-study/`
- `npm run build:all` — Build all experiment configs
- `npm run preview` — Preview production build locally
- `npm test` — Run Vitest in watch mode
- `npm run test:run` — Run Vitest once (CI mode)

## Critical Rules

- NEVER put experiment parameters (timing, path dimensions, trial counts) in engine code. They belong in `src/configs/`.
- NEVER import Firebase SDK outside of `FirebaseDataManager.js`. The rest of the codebase must be Firebase-agnostic.
- NEVER use `document.getElementById` in engine or path code. DOM access is restricted to `rendering/`, `ui/`, and `main.js`.
- NEVER use `localStorage` for experiment data in production mode. Use it only as a crash-recovery backup in local mode.
- NEVER modify test assertions to make tests pass. Fix the implementation instead.
- NEVER generate tones via Web Audio oscillators for countdown/feedback sounds. Use preloaded audio buffers via `audioManager.preloadSound`/`playSound`. Oscillator synthesis has inconsistent latency across browsers (especially Safari).
- NEVER call `AudioContext.resume()` outside a user gesture handler (click/keypress). There must be no `await` between the user gesture event and the `resume()` call, or the browser will reject it.
- ALL canvas drawing must account for `devicePixelRatio` via canvasManager.
- ALL path geometry must work in normalized coordinates, scaled to canvas at render time.
- The cursor manager has `pause()`/`resume()`/`isPaused()`/`waitForResume()` methods. Engine code MUST check `isPaused()` in synchronous loops (game loop update, hold checks) and `await waitForResume()` after async waits (countdown tone intervals). This freezes trials when pointer lock is lost.
- The custom cursor MUST be drawn during ALL trial phases (hold, countdown, tracing), not just during the game loop. Use a `requestAnimationFrame` loop before the game loop starts, and cancel it when the game loop takes over.
- Sound files live in `public/sounds/` and are preloaded in `main.js` via `audioManager.preloadSound()`. If adding new sounds, add both the file and a preload call.
- Keep audio short and preloaded. Never block the game loop waiting for audio.
- Do NOT import from `src/configs/` directly in engine files. Use the `@experiment-config` alias.
- Do NOT move `pathDefinitions.js` or `constants.js` into `src/configs/`. They are shared infrastructure in `src/config/` (singular).