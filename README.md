# path-trace

A modular, config-driven browser engine for timed path-tracing motor experiments. Participants trace paths (arcs, V-shapes, straight lines) with their cursor under time pressure while the engine records trajectory data at high frequency.

Built for deployment on Prolific/MTurk via Firebase Hosting, with a local testing mode that downloads data as JSON.

## Quick start

```bash
# Install dependencies
npm install

# Start the dev server (local mode — data downloads as JSON)
npm run dev

# Run tests
npm test
```

Open `http://localhost:3000` in Chrome. The experiment flow is: demographics form → instructions → path tracing trials → completion screen with data download.

## Requirements

Node.js 20+ and npm. Chrome or Chromium-based browser recommended (Pointer Lock API with `unadjustedMovement` is Chromium-only).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 3000 (local data mode) |
| `npm run build` | Production build to `dist/` (Firebase data mode) |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once (used by CI) |

## Project structure

```
src/
├── main.js                    # Entry point: intake → instructions → experiment → completion
├── config/
│   ├── experimentConfig.js    # ★ Primary file researchers edit — blocks, timing, paths
│   ├── pathDefinitions.js     # Maps path names to constructor parameters
│   ├── trialSequence.js       # Generates flat trial list from config
│   ├── constants.js           # Colors, sizes, thresholds
│   └── validation.js          # Config validation at startup (moved to utils/)
├── paths/
│   ├── pathRegistry.js        # Strategy pattern: name → path class
│   ├── ArcPath.js             # Semicircular arc
│   ├── VShapePath.js          # Two-segment V-shape with rotation
│   └── LinePath.js            # Straight line
├── engine/
│   ├── stateMachine.js        # Config-driven finite state machine
│   ├── trialRunner.js         # One trial: hold → countdown → trace → feedback
│   └── experimentRunner.js    # Iterates trials, manages blocks and breaks
├── rendering/
│   ├── canvasManager.js       # DPI-aware multi-layer canvas + cursor manager
│   ├── gameLoop.js            # requestAnimationFrame loop with delta time
│   └── drawFeedback.js        # Accuracy trail, pace dot, target hit visualization
├── data/
│   ├── LocalDataManager.js    # Accumulates data in memory, downloads JSON
│   ├── FirebaseDataManager.js # Writes to Firebase Realtime Database
│   └── createDataManager.js   # Factory: picks backend based on env var
├── audio/
│   └── audioManager.js        # Web Audio API tones + preloaded sound playback
└── ui/
    ├── overlayManager.js      # Instruction/feedback/break screen overlays
    └── progressDisplay.js     # HUD: timer, round counter, goal time
```

## How it works

### Data flow

1. `experimentConfig.js` defines the experiment: speed tiers, blocks, trial counts, path types.
2. `trialSequence.js` flattens the config into an ordered array of trial objects.
3. `experimentRunner.js` iterates that array, calling `trialRunner.js` for each trial.
4. `trialRunner.js` manages one trial's lifecycle through the state machine: hold in start circle → countdown tones → trace the path → feedback.
5. During tracing, mouse position is recorded every frame as `{x, y, t}` (x/y relative to canvas center, y inverted to match standard Cartesian coordinates).
6. After each trial, data is saved via the data manager (JSON download in local mode, Firebase in production).

### State machine

Each trial follows this state flow:

```
IDLE → HOLD → COUNTDOWN → TRACING → FEEDBACK → STAGE_CHECK → TRIAL_END
                                                      ↓
                                                RETURN_TO_START → HOLD  (multi-stage trials)
```

The state machine is defined declaratively in `experimentConfig.js` under `trialFlow`. Adding new states or transitions means editing that config object.

### Multi-stage trials

A trial can have multiple stages — for example, trace an arc, return to center, then trace a line. Configure this in a block's trial definition:

```js
trials: [
  {
    stages: [
      { path: 'arc_default' },
      { path: 'line_horizontal' },
    ],
    count: 10,
  },
]
```

The engine runs each stage sequentially, transitioning through RETURN_TO_START between them.

## Local vs. production mode

The data backend is controlled by the `VITE_DATA_BACKEND` environment variable, set automatically by Vite's `.env` files:

| File | Value | Behavior |
|------|-------|----------|
| `.env.development` | `local` | Data accumulates in memory, downloads as JSON on completion |
| `.env.production` | `firebase` | Data writes to Firebase Realtime Database per trial |

In local mode, trial summaries (without raw point arrays) are also backed up to `localStorage` after each trial as crash recovery insurance.

## Deploying to production

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable Anonymous Authentication in the Firebase console.
3. Set up a Realtime Database and set rules to allow authenticated writes.
4. Fill in the `firebase` section of `src/config/experimentConfig.js` with your project's credentials.
5. Build and deploy:

```bash
npm run build
npx firebase-tools deploy --only hosting
```

6. On Prolific/MTurk, point participants to your Firebase Hosting URL. Parse `PROLIFIC_PID` from URL parameters in `main.js` if needed for participant identification.

## Data format

The downloaded JSON (local mode) or Firebase document (production) has this structure:

```json
{
  "sessionId": "local_1712345678901_a1b2c3d4",
  "participantInfo": {
    "age": 25,
    "gender": "female",
    "handedness": "right",
    "handednessMeasure": 100,
    "device": "mouse"
  },
  "trials": [
    {
      "globalIndex": 0,
      "blockId": "warmup_slow",
      "path": "arc_default",
      "speedTier": { "min": 800, "max": 1200 },
      "points": [
        { "x": -166, "y": 0, "t": 0 },
        { "x": -160, "y": 12, "t": 16 },
        ...
      ],
      "time": 0.952,
      "movementAccuracy": 87.34,
      "timingAccuracy": 82.5,
      "completed": true
    }
  ],
  "blockSummaries": [
    { "blockId": "warmup_slow", "averageAccuracy": 85, "trialsCompleted": 8 }
  ],
  "completionData": {
    "feedback": "The fast trials were challenging.",
    "completedAt": "2026-04-09T14:30:00.000Z"
  },
  "startTime": 1712345678901
}
```

The `points` array contains one entry per animation frame (~60Hz). Coordinates are relative to canvas center with y-axis inverted (positive y = up), matching standard Cartesian conventions used in motor control research.

## Testing

Tests use Vitest and cover all modules independently:

```bash
npm test              # Watch mode — re-runs on file changes
npm run test:run      # Single run (CI mode)
```

Tests are organized by module in the `tests/` directory. Path geometry tests verify math with exact values. Engine tests use mocks to exercise orchestration without needing a browser. UI tests use jsdom for DOM assertions.

## Legacy reference

The `legacy/` directory contains the original monolithic codebase this project was rewritten from. Reference it for coordinate conventions, data format, and game logic. Do not import from or modify it.
