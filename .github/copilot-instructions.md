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
- **Testing**: Vitest (Jest-compatible API)
- **Data (production)**: Firebase Realtime Database v10.x (modular SDK)
- **Data (local)**: In-memory accumulation → JSON file download via Blob API
- **Rendering**: HTML5 Canvas 2D (multi-layer, DPI-aware)
- **Audio**: Web Audio API for countdown tones; HTML5 Audio for feedback sounds
- **Deployment**: Firebase Hosting (static site)

## Directory Structure

```
src/
├── main.js                  # Bootstrap: wire modules, start experiment
├── style.css                # Canvas layout, overlay styling
├── config/                  # All researcher-editable parameters
│   ├── experimentConfig.js  # Master config: blocks, timing, speed tiers
│   ├── trialSequence.js     # Generates ordered trial list from config
│   ├── pathDefinitions.js   # Maps path names to constructor params
│   └── constants.js         # Canvas size, colors, thresholds
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
│   ├── canvasManager.js     # DPI scaling, multi-layer canvas init
│   ├── gameLoop.js          # requestAnimationFrame loop
│   └── drawFeedback.js      # Accuracy visualization, color-coded trail
├── data/                    # Storage backends
│   ├── LocalDataManager.js  # Accumulates trials, downloads JSON
│   ├── FirebaseDataManager.js
│   └── createDataManager.js # Factory: reads env, returns backend
├── audio/
│   └── audioManager.js      # Preload and play sounds
├── ui/
│   ├── overlayManager.js    # Instruction/break screens
│   └── progressDisplay.js   # Trial counter, timer, goal time
└── utils/
    ├── math.js              # distance(), clamp(), lerp(), lineToPoint()
    ├── timing.js            # wait(), high-res timer helpers
    └── validation.js        # Config schema checks
```

## Coding Standards

- Use ES module `import`/`export` everywhere. No CommonJS `require()`.
- Use direct relative imports with extensions: `import { distance } from '../utils/math.js'`
- Do NOT use barrel exports (index.js re-export files).
- Use `const` by default. Use `let` only when reassignment is needed. Never use `var`.
- All path classes implement exactly six methods: `draw()`, `getPointAtProgress()`, `getDistanceFromPath()`, `getProgressAtPoint()`, `getTargetPosition()`, `getTotalLength()`.
- State machine transitions are declarative config objects, not if/else chains.
- All experiment parameters (timing, geometry, trial counts) come from config files, never hardcoded in engine code.
- Environment switching uses Vite `.env` files: `import.meta.env.VITE_DATA_BACKEND`.
- Functions over classes where possible. Classes only for stateful objects (paths, data managers, state machine).
- No frameworks (React, Vue, etc.). Plain DOM manipulation for overlays.

## Build Commands

- `npm run dev` — Start Vite dev server on port 3000
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build locally
- `npm test` — Run Vitest in watch mode
- `npm run test:run` — Run Vitest once (CI mode)

## Critical Rules

- NEVER put experiment parameters (timing, path dimensions, trial counts) in engine code. They belong in `src/config/`.
- NEVER import Firebase SDK outside of `FirebaseDataManager.js`. The rest of the codebase must be Firebase-agnostic.
- NEVER use `document.getElementById` in engine or path code. DOM access is restricted to `rendering/`, `ui/`, and `main.js`.
- NEVER use `localStorage` for experiment data in production mode. Use it only as a crash-recovery backup in local mode.
- NEVER modify test assertions to make tests pass. Fix the implementation instead.
- ALL canvas drawing must account for `devicePixelRatio` via canvasManager.
- ALL path geometry must work in normalized coordinates, scaled to canvas at render time.
- Keep audio short and preloaded. Never block the game loop waiting for audio.
