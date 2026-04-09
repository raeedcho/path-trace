// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createExperimentRunner } from '../src/engine/experimentRunner.js';

function createMockDeps(overrides = {}) {
  return {
    trialRunner: {
      runTrial: vi.fn(() => Promise.resolve({
        points: [{ x: 0, y: 0, t: 0 }],
        time: 0.5,
        accuracy: 85,
        movementAccuracy: 85,
        timingAccuracy: 75,
        completed: true,
      })),
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
    dataManager: {
      saveTrial: vi.fn(() => Promise.resolve()),
      saveBlockSummary: vi.fn(() => Promise.resolve()),
      saveExperimentComplete: vi.fn(() => Promise.resolve()),
    },
    config: {},
    ...overrides,
  };
}

describe('createExperimentRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an object with run method', () => {
    const deps = createMockDeps();
    const runner = createExperimentRunner(deps);
    expect(runner).toHaveProperty('run');
    expect(typeof runner.run).toBe('function');
  });

  it('runs each trial in sequence', async () => {
    const deps = createMockDeps();
    const runner = createExperimentRunner(deps);

    const sequence = [
      { globalIndex: 0, blockId: 'b1', blockLabel: 'Block 1', speedTier: { min: 800, max: 1200 }, isLastInBlock: false, breakAfter: false },
      { globalIndex: 1, blockId: 'b1', blockLabel: 'Block 1', speedTier: { min: 800, max: 1200 }, isLastInBlock: true, breakAfter: false },
    ];

    await runner.run(sequence);

    expect(deps.trialRunner.runTrial).toHaveBeenCalledTimes(2);
    expect(deps.trialRunner.runTrial).toHaveBeenCalledWith(sequence[0]);
    expect(deps.trialRunner.runTrial).toHaveBeenCalledWith(sequence[1]);
  });

  it('updates progress display for each trial', async () => {
    const deps = createMockDeps();
    const runner = createExperimentRunner(deps);

    const sequence = [
      { globalIndex: 0, blockId: 'b1', blockLabel: 'Block 1', speedTier: { min: 800, max: 1200 }, isLastInBlock: false, breakAfter: false },
      { globalIndex: 1, blockId: 'b1', blockLabel: 'Block 1', speedTier: { min: 800, max: 1200 }, isLastInBlock: true, breakAfter: false },
    ];

    await runner.run(sequence);

    expect(deps.progressDisplay.updateRound).toHaveBeenCalledWith(1, 2);
    expect(deps.progressDisplay.updateRound).toHaveBeenCalledWith(2, 2);
  });

  it('saves block summary at end of block', async () => {
    const deps = createMockDeps();
    const runner = createExperimentRunner(deps);

    const sequence = [
      { globalIndex: 0, blockId: 'b1', blockLabel: 'Block 1', speedTier: { min: 800, max: 1200 }, isLastInBlock: true, breakAfter: false },
    ];

    await runner.run(sequence);

    expect(deps.dataManager.saveBlockSummary).toHaveBeenCalledTimes(1);
    expect(deps.dataManager.saveBlockSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        blockId: 'b1',
        blockLabel: 'Block 1',
      }),
    );
  });

  it('shows break countdown when trial.breakAfter is true', async () => {
    const deps = createMockDeps();
    const runner = createExperimentRunner(deps);

    const sequence = [
      { globalIndex: 0, blockId: 'b1', blockLabel: 'Block 1', speedTier: { min: 800, max: 1200 }, isLastInBlock: true, breakAfter: true, breakDuration: 10000 },
      { globalIndex: 1, blockId: 'b2', blockLabel: 'Block 2', speedTier: { min: 640, max: 960 }, isLastInBlock: true, breakAfter: false },
    ];

    await runner.run(sequence);

    expect(deps.overlayManager.showCountdown).toHaveBeenCalledWith('break-overlay', 10);
  });

  it('does not show break if breakAfter trial is last in experiment', async () => {
    const deps = createMockDeps();
    const runner = createExperimentRunner(deps);

    const sequence = [
      { globalIndex: 0, blockId: 'b1', blockLabel: 'Block 1', speedTier: { min: 800, max: 1200 }, isLastInBlock: true, breakAfter: true, breakDuration: 10000 },
    ];

    await runner.run(sequence);

    // No break shown because there's no next trial
    expect(deps.overlayManager.showCountdown).not.toHaveBeenCalled();
  });

  it('does not show break if breakDuration is null or missing', async () => {
    const deps = createMockDeps();
    const runner = createExperimentRunner(deps);

    const sequence = [
      { globalIndex: 0, blockId: 'b1', blockLabel: 'Block 1', speedTier: { min: 800, max: 1200 }, isLastInBlock: true, breakAfter: true, breakDuration: null },
      { globalIndex: 1, blockId: 'b2', blockLabel: 'Block 2', speedTier: { min: 640, max: 960 }, isLastInBlock: true, breakAfter: false },
    ];

    await runner.run(sequence);

    // No break shown because breakDuration is null
    expect(deps.overlayManager.showCountdown).not.toHaveBeenCalled();
  });
  it('calls saveExperimentComplete at the end', async () => {
    const deps = createMockDeps();
    const runner = createExperimentRunner(deps);

    const sequence = [
      { globalIndex: 0, blockId: 'b1', blockLabel: 'Block 1', speedTier: { min: 800, max: 1200 }, isLastInBlock: true, breakAfter: false },
    ];

    await runner.run(sequence);

    expect(deps.dataManager.saveExperimentComplete).toHaveBeenCalledTimes(1);
  });

  it('shows progress display at start and hides at end', async () => {
    const deps = createMockDeps();
    const runner = createExperimentRunner(deps);

    const sequence = [
      { globalIndex: 0, blockId: 'b1', blockLabel: 'Block 1', speedTier: { min: 800, max: 1200 }, isLastInBlock: true, breakAfter: false },
    ];

    await runner.run(sequence);

    expect(deps.progressDisplay.show).toHaveBeenCalled();
    expect(deps.progressDisplay.hide).toHaveBeenCalled();
  });

  it('handles empty trial sequence', async () => {
    const deps = createMockDeps();
    const runner = createExperimentRunner(deps);

    await runner.run([]);

    expect(deps.trialRunner.runTrial).not.toHaveBeenCalled();
    expect(deps.dataManager.saveExperimentComplete).toHaveBeenCalledTimes(1);
  });

  it('tracks block accuracy across trials', async () => {
    let callCount = 0;
    const deps = createMockDeps({
      trialRunner: {
        runTrial: vi.fn(() => {
          callCount++;
          return Promise.resolve({
            points: [],
            time: 0.5,
            accuracy: callCount * 20,
            movementAccuracy: callCount * 20,
            timingAccuracy: 75,
            completed: true,
          });
        }),
      },
    });

    const runner = createExperimentRunner(deps);

    const sequence = [
      { globalIndex: 0, blockId: 'b1', blockLabel: 'Block 1', speedTier: { min: 800, max: 1200 }, isLastInBlock: false, breakAfter: false },
      { globalIndex: 1, blockId: 'b1', blockLabel: 'Block 1', speedTier: { min: 800, max: 1200 }, isLastInBlock: true, breakAfter: false },
    ];

    await runner.run(sequence);

    // Block summary should have average accuracy = (20 + 40) / 2 = 30
    expect(deps.dataManager.saveBlockSummary).toHaveBeenCalledWith(
      expect.objectContaining({ averageAccuracy: 30 }),
    );
  });
});
