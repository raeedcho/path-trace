# Creating new tracing tasks

This guide walks through everything a researcher needs to modify the experiment without touching engine code. The three things you'll typically change are the experiment config (timing, blocks, trial counts), path definitions (which shapes participants trace), and occasionally a new path type (a new geometry).

## Changing timing and trial structure

Everything about what trials are run, in what order, at what speed, and with what feedback is defined in one file: `src/config/experimentConfig.js`. Here's a walkthrough of each section.

### Speed tiers

```js
speedTiers: {
  slow:     { min: 800,  max: 1200 },  // Goal: complete movement in 800-1200ms
  medium:   { min: 640,  max: 960  },
  fast:     { min: 400,  max: 600  },
  veryFast: { min: 240,  max: 400  },
},
```

Each tier defines a time window in milliseconds. The participant sees these as "Your Goal Time: 800 - 1200 ms" in the HUD. The pace dot moves at the mean of min and max. Countdown tone spacing also scales with the mean time. You can add as many tiers as you want — just give each a unique key and reference it in your blocks.

### Blocks

Blocks are groups of trials that share the same speed tier and feedback settings. They run in the order listed.

```js
blocks: [
  {
    id: 'warmup_slow',              // Unique identifier (used in data output)
    label: 'Warmup Round 1: Slow',  // Shown to participants between blocks
    speedTier: 'slow',              // Must match a key in speedTiers
    trials: [
      { path: 'arc_default', count: 8 },  // 8 trials of this path type
    ],
    shuffle: false,      // false = trials run in listed order; true = randomized
    showFeedback: true,  // Show "too fast"/"too slow" penalties
    breakAfter: false,   // No enforced break after this block
  },
  {
    id: 'test_block_1',
    label: 'Testing Round 1',
    speedTier: 'medium',
    trials: [
      { path: 'arc_default', count: 10 },
      { path: 'vshape_default', count: 6 },  // Multiple path types in one block
    ],
    shuffle: true,           // Randomize trial order within the block
    showFeedback: true,
    breakAfter: true,        // Enforced break after this block
    breakDuration: 30000,    // Break lasts 30 seconds (shown as countdown)
  },
],
```

### Mixing path types within a block

When a block has multiple entries in `trials`, the engine expands them into individual trial objects first, then shuffles (if `shuffle: true`). So `[{path: 'arc_default', count: 10}, {path: 'vshape_default', count: 6}]` produces 16 trials that get shuffled together.

### Multi-stage trials

A single trial can require the participant to trace multiple paths in sequence. Between stages, the participant returns to the start circle:

```js
trials: [
  {
    stages: [
      { path: 'arc_default' },
      { path: 'line_horizontal' },
    ],
    count: 10,  // 10 trials, each consisting of arc then line
  },
],
```

The state machine transitions through `RETURN_TO_START` between stages. Each stage is timed independently, and accuracy is averaged across stages for the trial result.

### Feedback settings

```js
feedback: {
  tooFastMessage: 'Move slower!',
  tooSlowMessage: 'Move faster!',
  straightLineMessage: 'Straight line detected, please follow the curved path!',
  straightLineThreshold: 25,      // RMSE threshold for straight-line detection (pixels)
  tooFastPenalty: 3000,            // Penalty timeout in ms
  tooSlowPenalty: 3000,
  straightLinePenalty: 5000,
  accuracyTrailDuration: 1000,    // How long to show the color-coded trail on good trials
},
```

When `showFeedback` is true for a block, the engine checks (in this priority order): straight line detected → too fast → too slow → show accuracy trail. The penalty timeouts delay the next trial, giving the participant time to read the feedback.

### Countdown settings

```js
countdown: {
  holdDuration: 1000,    // Cursor must stay in start circle this long (ms)
  toneInterval: null,    // null = auto-calculated from trial's mean time
  tones: [
    { color: 'countdown.ready', sound: 'ready' },   // Tone 1: circle turns red
    { color: 'countdown.set',   sound: 'ready' },   // Tone 2: circle turns yellow
    { color: 'countdown.go',    sound: 'go'    },   // Tone 3: circle turns green → GO
  ],
},
```

Setting `toneInterval: null` makes the countdown spacing match the trial's mean time — fast trials get a fast countdown, slow trials get a slow countdown. Set it to a fixed number (e.g., `500`) for uniform countdowns regardless of speed tier.

## Adding new path shapes

### Option A: Change parameters of existing paths

The simplest change — no new code needed. Edit `src/config/pathDefinitions.js`:

```js
export const pathDefinitions = {
  // A tighter arc (smaller radius)
  arc_tight: {
    type: 'arc',
    params: { radius: 100, startAngle: Math.PI, endAngle: 2 * Math.PI },
  },
  // A quarter-circle (90° arc instead of 180°)
  arc_quarter: {
    type: 'arc',
    params: { radius: 166, startAngle: Math.PI, endAngle: 1.5 * Math.PI },
  },
  // A rotated V-shape (peak points right instead of up)
  vshape_rotated: {
    type: 'vshape',
    params: { halfWidth: 166, peakHeight: 166, angle: Math.PI / 2 },
  },
  // A diagonal line
  line_diagonal: {
    type: 'line',
    params: { offsetX: -120, offsetY: 120, endOffsetX: 120, endOffsetY: -120 },
  },
};
```

Then reference the new names in your block definitions:

```js
trials: [{ path: 'arc_quarter', count: 10 }],
```

### Understanding path parameters

**ArcPath** — traces a circular arc between two angles.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `radius` | number | — | Arc radius in pixels |
| `startAngle` | number | `Math.PI` | Start angle in radians (π = left side) |
| `endAngle` | number | `2 * Math.PI` | End angle in radians (2π = right side) |

The default (π to 2π) traces the upper semicircle from left to right. Setting `endAngle: 1.5 * Math.PI` gives a quarter-circle from left to top. Angles follow standard math conventions: 0 = right, π/2 = down (canvas y-axis is inverted), π = left, 3π/2 = up.

**VShapePath** — two line segments meeting at a peak vertex.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `halfWidth` | number | — | Horizontal distance from center to each endpoint |
| `peakHeight` | number | — | Vertical distance from center to the peak |
| `angle` | number | `0` | Rotation angle in radians (0 = peak points up) |

The V-shape is defined relative to center: the start is at `(-halfWidth, 0)`, the peak at `(0, -peakHeight)`, and the end at `(+halfWidth, 0)`, all rotated by `angle`. Setting `angle: Math.PI` flips the V upside down.

**LinePath** — a straight line defined by offsets from center.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `offsetX` | number | — | Start point X offset from canvas center |
| `offsetY` | number | — | Start point Y offset from canvas center |
| `endOffsetX` | number | — | End point X offset from canvas center |
| `endOffsetY` | number | — | End point Y offset from canvas center |

All paths also receive `centerX`, `centerY`, `targetWidth`, and `targetHeight` at runtime from the engine — you don't set these in `pathDefinitions.js`.

### Option B: Create an entirely new path type

For a geometry that isn't a combination of arcs, V-shapes, or lines, you need to create a new path class. This requires writing one JavaScript file.

#### Step 1: Create the path file

Create `src/paths/SinePath.js` (or whatever your shape is). Every path must implement six methods:

```js
import { registerPath } from './pathRegistry.js';

export class SinePath {
  constructor({ centerX, centerY, amplitude, wavelength, cycles, targetWidth = 0, targetHeight = 0 }) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.amplitude = amplitude;
    this.wavelength = wavelength;
    this.cycles = cycles;
    this.targetWidth = targetWidth;
    this.targetHeight = targetHeight;
    this.totalWidth = wavelength * cycles;
  }

  // Required method 1: Where is the ideal position at progress t (0 to 1)?
  getPointAtProgress(t) {
    const x = this.centerX - this.totalWidth / 2 + t * this.totalWidth;
    const y = this.centerY - this.amplitude * Math.sin(2 * Math.PI * this.cycles * t);
    return { x, y };
  }

  // Required method 2: How far is a point from the nearest point on the path?
  getDistanceFromPath({ x, y }) {
    // For complex curves, sample the path and find the minimum distance.
    let minDist = Infinity;
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      const p = this.getPointAtProgress(t);
      const d = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  // Required method 3: Project a point onto the path — what progress is closest?
  getProgressAtPoint({ x, y }) {
    let minDist = Infinity;
    let bestT = 0;
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      const p = this.getPointAtProgress(t);
      const d = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
      if (d < minDist) { minDist = d; bestT = t; }
    }
    return bestT;
  }

  // Required method 4: Where is the target at the end of the path?
  getTargetPosition() {
    const end = this.getPointAtProgress(1);
    // Tangent at the endpoint determines the target's rotation
    const near = this.getPointAtProgress(0.99);
    const angle = Math.atan2(end.y - near.y, end.x - near.x);
    return { x: end.x, y: end.y, width: this.targetWidth, height: this.targetHeight, angle };
  }

  // Required method 5: How long is the path in pixels?
  getTotalLength() {
    let length = 0;
    let prev = this.getPointAtProgress(0);
    for (let i = 1; i <= 200; i++) {
      const t = i / 200;
      const curr = this.getPointAtProgress(t);
      length += Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
      prev = curr;
    }
    return length;
  }

  // Required method 6: Draw the path guide, start circle, and target on a canvas context.
  draw(ctx, style) {
    const colors = style.colors || {};
    const startRadius = style.startCircleRadius || 14;
    const targetRings = colors.targetRings || [];

    // Draw dashed path
    ctx.save();
    ctx.setLineDash([3, 6]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = colors.path || '#000';
    ctx.beginPath();
    const start = this.getPointAtProgress(0);
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i <= 100; i++) {
      const p = this.getPointAtProgress(i / 100);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw start circle
    ctx.fillStyle = colors.startCircle || '#7393b3';
    ctx.beginPath();
    ctx.arc(start.x, start.y, startRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw target rings at endpoint
    const target = this.getTargetPosition();
    const ringWidth = style.targetWidth || this.targetWidth || 22;
    const ringHeight = style.targetHeight || this.targetHeight || 200;
    const numRings = targetRings.length;
    if (numRings > 0) {
      ctx.save();
      ctx.translate(target.x, target.y);
      ctx.rotate(target.angle);
      const sliceHeight = ringHeight / numRings;
      for (let i = 0; i < numRings; i++) {
        ctx.fillStyle = targetRings[i];
        ctx.fillRect(-ringWidth / 2, -ringHeight / 2 + sliceHeight * i, ringWidth, sliceHeight);
      }
      ctx.restore();
    }

    ctx.restore();
  }
}

// This line makes the path available by name in the config
registerPath('sine', SinePath);
```

#### Step 2: Register the path

Add an import to `src/config/pathDefinitions.js`:

```js
import '../paths/SinePath.js';  // Add this line

export const pathDefinitions = {
  // ... existing paths ...
  sine_default: {
    type: 'sine',
    params: { amplitude: 80, wavelength: 200, cycles: 2 },
  },
};
```

#### Step 3: Write tests

Create `tests/sinePath.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { SinePath } from '../src/paths/SinePath.js';

describe('SinePath', () => {
  const path = new SinePath({
    centerX: 400, centerY: 300,
    amplitude: 80, wavelength: 200, cycles: 2,
  });

  it('getPointAtProgress(0) returns the start point', () => {
    const pt = path.getPointAtProgress(0);
    expect(pt.x).toBeCloseTo(400 - 200, 1); // centerX - totalWidth/2
    expect(pt.y).toBeCloseTo(300, 1);        // sin(0) = 0
  });

  it('getPointAtProgress(1) returns the end point', () => {
    const pt = path.getPointAtProgress(1);
    expect(pt.x).toBeCloseTo(400 + 200, 1); // centerX + totalWidth/2
  });

  it('getDistanceFromPath returns ~0 for points on the path', () => {
    const pt = path.getPointAtProgress(0.5);
    expect(path.getDistanceFromPath(pt)).toBeLessThan(2); // sampling tolerance
  });

  it('getTotalLength is positive', () => {
    expect(path.getTotalLength()).toBeGreaterThan(0);
  });
});
```

#### Step 4: Use it in the config

```js
trials: [{ path: 'sine_default', count: 10 }],
```

That's it — no engine code changes needed.

## Tips for the `getDistanceFromPath` and `getProgressAtPoint` methods

For simple shapes (arcs, lines), there are closed-form solutions for these calculations. For complex curves (sine waves, spirals, Bézier curves), the sampling approach shown above works well. Use 200 samples for a good balance between accuracy and performance. The engine calls these methods once per recorded point when computing accuracy, not in the hot rendering loop, so moderate computation is fine.

If your path has a natural parameterization (like arc angle or line projection), prefer the analytical solution — it's exact and faster. Look at `ArcPath.js` and `LinePath.js` for examples.

## Testing your changes

After modifying the config or adding a path:

1. Run `npm test` to verify path math and config validation pass.
2. Run `npm run dev` and trace a few trials manually to check the visual feel.
3. Check the downloaded JSON to verify the data structure looks correct.
4. For production deployment, run `npm run build` and test the production bundle with `npm run preview`.

## Common mistakes

**Config validation errors at startup.** If you see "Invalid experiment config" in the console, the error messages will tell you exactly what's wrong — usually a misspelled path name or speed tier key.

**Path doesn't appear.** Make sure the path file has `registerPath('name', ClassName)` at the bottom and is imported in `pathDefinitions.js`.

**Target is at the wrong angle.** The `angle` returned by `getTargetPosition()` determines the target rectangle's rotation. For paths that end moving rightward, `angle ≈ 0` gives a vertical target bar. For paths ending downward, `angle ≈ π/2`. Calculate the tangent direction at the endpoint.

**Accuracy is always 0 or 100.** Check that `getDistanceFromPath` returns values in a reasonable pixel range (0 for on-path, 50-100+ for far away). The engine maps distance 0 → 100% accuracy, distance ≥ `maxAccuracyDistance` (default 100px) → 0% accuracy.
