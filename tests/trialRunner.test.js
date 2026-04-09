// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTrialRunner } from '../src/engine/trialRunner.js';

// --- Mock path registry and path definitions ---
vi.mock('../src/paths/pathRegistry.js', () => {
  const mockPath = {
    draw: vi.fn(),
    getPointAtProgress: vi.fn((t) => ({ x: 100 + t * 200, y: 300 })),
    getDistanceFromPath: vi.fn(() => 10),
    getProgressAtPoint: vi.fn(() => 0.5),
    getTargetPosition: vi.fn(() => ({ x: 300, y: 300, width: 22, height: 200, angle: 0 })),
    getTotalLength: vi.fn(() => 500),
  };
  return {
    createPath: vi.fn(() => mockPath),
    registerPath: vi.fn(),
    getRegisteredPaths: vi.fn(() => ['arc', 'vshape', 'line']),
  };
});

vi.mock('../src/config/pathDefinitions.js', () => ({
  pathDefinitions: {
    arc_default: { type: 'arc', params: { radius: 166, startAngle: Math.PI, endAngle: 2 * Math.PI } },
  },
}));

// Mock gameLoop to immediately call update + render once, then stop
vi.mock('../src/rendering/gameLoop.js', () => ({
  createGameLoop: vi.fn((updateFn, renderFn) => {
    let running = false;
    return {
      start() {
        running = true;
        // Simulate one frame
        updateFn(16);
        renderFn();
      },
      stop() { running = false; },
      isRunning() { return running; },
    };
  }),
}));

// Mock drawFeedback functions
vi.mock('../src/rendering/drawFeedback.js', () => ({
  drawPaceDot: vi.fn(),
  drawAccuracyTrail: vi.fn(),
  drawTargetHit: vi.fn(),
  getAccuracyColor: vi.fn(() => '#00ff00'),
}));

// Mock timing — wait resolves immediately
vi.mock('../src/utils/timing.js', () => ({
  wait: vi.fn(() => Promise.resolve()),
  createTimer: vi.fn(() => {
    let elapsed = 0;
    return {
      start() { elapsed = 0; },
      elapsed() { elapsed += 500; return elapsed; },
      reset() { elapsed = 0; },
    };
  }),
}));

function createMockDeps() {
  const mockCtx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    canvas: { width: 800, height: 600 },
  };

  // Phase-aware cursor: starts near path start, moves to target during tracing
  let getCursorCallCount = 0;
  const startPos = { x: 100, y: 300 };
  const targetPos = { x: 300, y: 300 };

  return {
    canvasManager: {
      getContext: vi.fn(() => mockCtx),
      getDimensions: vi.fn(() => ({ width: 800, height: 600, centerX: 400, centerY: 300 })),
      clear: vi.fn(),
    },
    audioManager: {
      initialize: vi.fn(),
      playDefaultTone: vi.fn(),
      playTone: vi.fn(),
    },
    overlayManager: {
      show: vi.fn(),
      hide: vi.fn(),
      showTimed: vi.fn(() => Promise.resolve()),
      waitForKeypress: vi.fn(() => Promise.resolve()),
      showCountdown: vi.fn(() => Promise.resolve()),
    },
    progressDisplay: {
      updateRound: vi.fn(),
      updateTimer: vi.fn(),
      updateGoalTime: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
    },
    cursorManager: {
      // During hold and countdown, cursor is at start; during tracing it moves to target
      getCursorPosition: vi.fn(() => {
        getCursorCallCount++;
        // First ~5 calls during hold/countdown, then switch to target position
        if (getCursorCallCount <= 5) return { ...startPos };
        return { ...targetPos };
      }),
      resetCursorPosition: vi.fn(),
      onCursorMove: vi.fn((cb) => {
        // Immediately signal cursor is at start position (triggers hold)
        cb({ ...startPos });
        return vi.fn(); // unsubscribe
      }),
      drawCursor: vi.fn(),
    },
    dataManager: {
      saveTrial: vi.fn(() => Promise.resolve()),
      saveBlockSummary: vi.fn(() => Promise.resolve()),
      saveExperimentComplete: vi.fn(() => Promise.resolve()),
      saveParticipantInfo: vi.fn(() => Promise.resolve()),
    },
    config: {
      countdown: {
        holdDuration: 50,
        toneInterval: 10,
        tones: [
          { color: 'countdown.ready', sound: 'ready' },
          { color: 'countdown.set', sound: 'ready' },
          { color: 'countdown.go', sound: 'go' },
        ],
      },
      feedback: {
        tooFastMessage: 'Move slower!',
        tooSlowMessage: 'Move faster!',
        straightLineMessage: 'Straight line detected!',
        straightLineThreshold: 25,
        tooFastPenalty: 3000,
        tooSlowPenalty: 3000,
        straightLinePenalty: 5000,
        accuracyTrailDuration: 1000,
      },
      trialFlow: {
        initial: 'IDLE',
        states: {
          IDLE:            { on: { BEGIN: 'HOLD' } },
          HOLD:            { on: { HOLD_COMPLETE: 'COUNTDOWN', HOLD_BROKEN: 'HOLD' } },
          COUNTDOWN:       { on: { COUNTDOWN_DONE: 'TRACING', HOLD_BROKEN: 'HOLD' } },
          TRACING:         { on: { TARGET_HIT: 'FEEDBACK', TIMEOUT: 'FEEDBACK' } },
          FEEDBACK:        { on: { FEEDBACK_DONE: 'STAGE_CHECK' } },
          STAGE_CHECK:     { on: { NEXT_STAGE: 'RETURN_TO_START', TRIAL_COMPLETE: 'TRIAL_END' } },
          RETURN_TO_START: { on: { RETURNED: 'HOLD' } },
          TRIAL_END:       { on: { NEXT_TRIAL: 'IDLE', BREAK: 'BREAK_SCREEN', EXPERIMENT_DONE: 'DONE' } },
          BREAK_SCREEN:    { on: { BREAK_OVER: 'IDLE' } },
          DONE:            { },
        },
      },
      pointer: { scaleFactor: 2.4 },
    },
  };
}

const trialConfig = {
  globalIndex: 0,
  blockId: 'warmup_slow',
  blockLabel: 'Warmup 1',
  path: 'arc_default',
  speedTier: { min: 800, max: 1200 },
  showFeedback: false,
  isLastInBlock: false,
  breakAfter: false,
};

describe('createTrialRunner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an object with runTrial method', () => {
    const deps = createMockDeps();
    const runner = createTrialRunner(deps);
    expect(runner).toHaveProperty('runTrial');
    expect(typeof runner.runTrial).toBe('function');
  });

  it('runTrial calls dataManager.saveTrial with trial result', async () => {
    const deps = createMockDeps();
    const runner = createTrialRunner(deps);

    const promise = runner.runTrial(trialConfig);
    // Advance past hold duration and any countdown waits
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(deps.dataManager.saveTrial).toHaveBeenCalledTimes(1);
    const savedTrial = deps.dataManager.saveTrial.mock.calls[0][0];
    expect(savedTrial.globalIndex).toBe(0);
    expect(savedTrial.blockId).toBe('warmup_slow');
    expect(savedTrial.path).toBe('arc_default');
    expect(savedTrial).toHaveProperty('points');
    expect(savedTrial).toHaveProperty('time');
    expect(savedTrial).toHaveProperty('movementAccuracy');
    expect(savedTrial).toHaveProperty('timingAccuracy');
    expect(savedTrial).toHaveProperty('completed');
  });

  it('runTrial returns the expected result shape', async () => {
    const deps = createMockDeps();
    const runner = createTrialRunner(deps);

    const promise = runner.runTrial({ ...trialConfig, speedTier: { min: 400, max: 600 } });
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(result).toHaveProperty('points');
    expect(result).toHaveProperty('time');
    expect(result).toHaveProperty('movementAccuracy');
    expect(result).toHaveProperty('timingAccuracy');
    expect(result).toHaveProperty('completed');
    expect(typeof result.time).toBe('number');
    expect(typeof result.movementAccuracy).toBe('number');
  });

  it('plays countdown tones', async () => {
    const deps = createMockDeps();
    const runner = createTrialRunner(deps);

    const promise = runner.runTrial(trialConfig);
    await vi.advanceTimersByTimeAsync(500);
    await promise;

    expect(deps.audioManager.playDefaultTone).toHaveBeenCalled();
    const toneCalls = deps.audioManager.playDefaultTone.mock.calls.map(c => c[0]);
    expect(toneCalls).toContain('ready');
    expect(toneCalls).toContain('go');
  });

  it('clears canvases at start of each trial', async () => {
    const deps = createMockDeps();
    const runner = createTrialRunner(deps);

    const promise = runner.runTrial(trialConfig);
    await vi.advanceTimersByTimeAsync(500);
    await promise;

    expect(deps.canvasManager.clear).toHaveBeenCalled();
  });

  it('resets cursor position to path start', async () => {
    const deps = createMockDeps();
    const runner = createTrialRunner(deps);

    const promise = runner.runTrial(trialConfig);
    await vi.advanceTimersByTimeAsync(500);
    await promise;

    expect(deps.cursorManager.resetCursorPosition).toHaveBeenCalled();
  });

  it('updates goal time display', async () => {
    const deps = createMockDeps();
    const runner = createTrialRunner(deps);

    const promise = runner.runTrial({ ...trialConfig, speedTier: { min: 640, max: 960 } });
    await vi.advanceTimersByTimeAsync(500);
    await promise;

    expect(deps.progressDisplay.updateGoalTime).toHaveBeenCalledWith(640, 960);
  });
});
