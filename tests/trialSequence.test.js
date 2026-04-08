import { describe, it, expect } from 'vitest';
import { generateTrialSequence } from '../src/config/trialSequence.js';

function makeConfig(blockOverrides = []) {
  const base = {
    speedTiers: {
      slow:     { min: 800,  max: 1200 },
      medium:   { min: 640,  max: 960  },
      fast:     { min: 400,  max: 600  },
      veryFast: { min: 240,  max: 400  },
    },
    blocks: blockOverrides,
  };
  return base;
}

describe('generateTrialSequence', () => {
  it('a config with one block of 5 trials produces 5 trial objects', () => {
    const config = makeConfig([
      {
        id: 'block1',
        label: 'Block 1',
        speedTier: 'slow',
        trials: [{ path: 'arc_default', count: 5 }],
        shuffle: false,
        showFeedback: true,
        breakAfter: false,
      },
    ]);
    const trials = generateTrialSequence(config);
    expect(trials).toHaveLength(5);
  });

  it('globalIndex is sequential from 0 to N-1', () => {
    const config = makeConfig([
      {
        id: 'block1',
        label: 'Block 1',
        speedTier: 'slow',
        trials: [{ path: 'arc_default', count: 3 }],
        shuffle: false,
        showFeedback: true,
        breakAfter: false,
      },
      {
        id: 'block2',
        label: 'Block 2',
        speedTier: 'medium',
        trials: [{ path: 'arc_default', count: 2 }],
        shuffle: false,
        showFeedback: true,
        breakAfter: false,
      },
    ]);
    const trials = generateTrialSequence(config);
    expect(trials).toHaveLength(5);
    for (let i = 0; i < trials.length; i++) {
      expect(trials[i].globalIndex).toBe(i);
    }
  });

  it('speedTier is resolved from string to {min, max} object', () => {
    const config = makeConfig([
      {
        id: 'block1',
        label: 'Block 1',
        speedTier: 'fast',
        trials: [{ path: 'arc_default', count: 1 }],
        shuffle: false,
        showFeedback: true,
        breakAfter: false,
      },
    ]);
    const trials = generateTrialSequence(config);
    expect(trials[0].speedTier).toEqual({ min: 400, max: 600 });
  });

  it('last trial in a block with breakAfter: true has breakAfter and breakDuration', () => {
    const config = makeConfig([
      {
        id: 'block1',
        label: 'Block 1',
        speedTier: 'medium',
        trials: [{ path: 'arc_default', count: 3 }],
        shuffle: false,
        showFeedback: true,
        breakAfter: true,
        breakDuration: 10000,
      },
    ]);
    const trials = generateTrialSequence(config);
    expect(trials[2].breakAfter).toBe(true);
    expect(trials[2].breakDuration).toBe(10000);
    // Earlier trials should not have breakAfter
    expect(trials[0].breakAfter).toBe(false);
    expect(trials[1].breakAfter).toBe(false);
  });

  it('shuffled blocks produce trials in non-original order at least once in 10 runs', () => {
    const config = makeConfig([
      {
        id: 'block1',
        label: 'Block 1',
        speedTier: 'slow',
        trials: [
          { path: 'path_a', count: 5 },
          { path: 'path_b', count: 5 },
        ],
        shuffle: true,
        showFeedback: true,
        breakAfter: false,
      },
    ]);

    // The original order before shuffle would be 5x path_a then 5x path_b
    const originalOrder = Array(5).fill('path_a').concat(Array(5).fill('path_b'));
    let foundDifferent = false;

    for (let run = 0; run < 10; run++) {
      const trials = generateTrialSequence(config);
      const paths = trials.map(t => t.path);
      if (JSON.stringify(paths) !== JSON.stringify(originalOrder)) {
        foundDifferent = true;
        break;
      }
    }

    expect(foundDifferent).toBe(true);
  });

  it('multi-stage trial objects contain a stages array', () => {
    const config = makeConfig([
      {
        id: 'block1',
        label: 'Block 1',
        speedTier: 'medium',
        trials: [
          { stages: [{ path: 'arc_default' }, { path: 'line_horizontal' }], count: 2 },
        ],
        shuffle: false,
        showFeedback: true,
        breakAfter: false,
      },
    ]);
    const trials = generateTrialSequence(config);
    expect(trials).toHaveLength(2);
    expect(trials[0].stages).toEqual([{ path: 'arc_default' }, { path: 'line_horizontal' }]);
    expect(trials[0].path).toBeUndefined();
  });

  it('isLastInBlock is true only on the final trial of each block', () => {
    const config = makeConfig([
      {
        id: 'block1',
        label: 'Block 1',
        speedTier: 'slow',
        trials: [{ path: 'arc_default', count: 3 }],
        shuffle: false,
        showFeedback: true,
        breakAfter: false,
      },
      {
        id: 'block2',
        label: 'Block 2',
        speedTier: 'medium',
        trials: [{ path: 'arc_default', count: 2 }],
        shuffle: false,
        showFeedback: true,
        breakAfter: false,
      },
    ]);
    const trials = generateTrialSequence(config);

    // Block 1: trials 0, 1, 2 — only index 2 is last
    expect(trials[0].isLastInBlock).toBe(false);
    expect(trials[1].isLastInBlock).toBe(false);
    expect(trials[2].isLastInBlock).toBe(true);

    // Block 2: trials 3, 4 — only index 4 is last
    expect(trials[3].isLastInBlock).toBe(false);
    expect(trials[4].isLastInBlock).toBe(true);
  });

  it('trialIndex resets per block', () => {
    const config = makeConfig([
      {
        id: 'block1',
        label: 'Block 1',
        speedTier: 'slow',
        trials: [{ path: 'arc_default', count: 2 }],
        shuffle: false,
        showFeedback: true,
        breakAfter: false,
      },
      {
        id: 'block2',
        label: 'Block 2',
        speedTier: 'medium',
        trials: [{ path: 'arc_default', count: 3 }],
        shuffle: false,
        showFeedback: true,
        breakAfter: false,
      },
    ]);
    const trials = generateTrialSequence(config);

    // Block 1
    expect(trials[0].trialIndex).toBe(0);
    expect(trials[1].trialIndex).toBe(1);

    // Block 2: trialIndex resets
    expect(trials[2].trialIndex).toBe(0);
    expect(trials[3].trialIndex).toBe(1);
    expect(trials[4].trialIndex).toBe(2);
  });

  it('includes blockId and blockLabel on every trial', () => {
    const config = makeConfig([
      {
        id: 'warmup_slow',
        label: 'Warmup Round 1: Slow',
        speedTier: 'slow',
        trials: [{ path: 'arc_default', count: 2 }],
        shuffle: false,
        showFeedback: true,
        breakAfter: false,
      },
    ]);
    const trials = generateTrialSequence(config);
    for (const trial of trials) {
      expect(trial.blockId).toBe('warmup_slow');
      expect(trial.blockLabel).toBe('Warmup Round 1: Slow');
    }
  });
});
