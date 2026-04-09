import { describe, it, expect } from 'vitest';
import { validateConfig } from '../src/utils/validation.js';

const knownPaths = {
  arc_default: {},
  line_horizontal: {},
  vshape_default: {},
};

function makeValidConfig() {
  return {
    speedTiers: {
      slow:   { min: 800, max: 1200 },
      medium: { min: 640, max: 960  },
    },
    countdown: {
      holdDuration: 1000,
    },
    feedback: {
      tooFastPenalty: 3000,
      tooSlowPenalty: 3000,
      straightLinePenalty: 5000,
      straightLineThreshold: 25,
    },
    blocks: [
      {
        id: 'block1',
        label: 'Block 1',
        speedTier: 'slow',
        trials: [{ path: 'arc_default', count: 5 }],
        shuffle: false,
        showFeedback: true,
        breakAfter: false,
      },
    ],
  };
}

describe('validateConfig', () => {
  it('valid config returns { valid: true }', () => {
    const result = validateConfig(makeValidConfig(), knownPaths);
    expect(result).toEqual({ valid: true });
  });

  it('config with unknown speedTier returns { valid: false, errors: [...] }', () => {
    const config = makeValidConfig();
    config.blocks[0].speedTier = 'superfast';
    const result = validateConfig(config, knownPaths);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('superfast'))).toBe(true);
  });

  it('config with unknown path name returns { valid: false, errors: [...] }', () => {
    const config = makeValidConfig();
    config.blocks[0].trials = [{ path: 'nonexistent_path', count: 5 }];
    const result = validateConfig(config, knownPaths);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('nonexistent_path'))).toBe(true);
  });

  it('config with empty blocks array returns { valid: false, errors: [...] }', () => {
    const config = makeValidConfig();
    config.blocks = [];
    const result = validateConfig(config, knownPaths);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('blocks'))).toBe(true);
  });

  it('config with negative timing values returns { valid: false, errors: [...] }', () => {
    const config = makeValidConfig();
    config.countdown.holdDuration = -500;
    const result = validateConfig(config, knownPaths);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('holdDuration'))).toBe(true);
  });

  it('config with unknown stage path returns { valid: false, errors: [...] }', () => {
    const config = makeValidConfig();
    config.blocks[0].trials = [
      { stages: [{ path: 'arc_default' }, { path: 'unknown_stage_path' }], count: 2 },
    ];
    const result = validateConfig(config, knownPaths);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('unknown_stage_path'))).toBe(true);
  });

  it('config with negative feedback penalty returns { valid: false, errors: [...] }', () => {
    const config = makeValidConfig();
    config.feedback.tooFastPenalty = -1000;
    const result = validateConfig(config, knownPaths);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('tooFastPenalty'))).toBe(true);
  });

  it('config with negative speed tier min returns { valid: false, errors: [...] }', () => {
    const config = makeValidConfig();
    config.speedTiers.slow.min = -100;
    const result = validateConfig(config, knownPaths);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('slow') && e.includes('min'))).toBe(true);
  });

  it('config with missing speed tier min returns { valid: false, errors: [...] }', () => {
    const config = makeValidConfig();
    delete config.speedTiers.slow.min;
    const result = validateConfig(config, knownPaths);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('slow') && e.includes('min'))).toBe(true);
  });

  it('config with min >= max in speed tier returns { valid: false, errors: [...] }', () => {
    const config = makeValidConfig();
    config.speedTiers.slow.min = 1200;
    config.speedTiers.slow.max = 800;
    const result = validateConfig(config, knownPaths);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('slow') && e.includes('min') && e.includes('max'))).toBe(true);
  });

  it('config with missing block.trials returns { valid: false, errors: [...] }', () => {
    const config = makeValidConfig();
    delete config.blocks[0].trials;
    const result = validateConfig(config, knownPaths);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('trials') && e.includes('non-empty array'))).toBe(true);
  });

  it('config with non-array stages returns { valid: false, errors: [...] }', () => {
    const config = makeValidConfig();
    config.blocks[0].trials = [{ stages: 'not_an_array', count: 2 }];
    const result = validateConfig(config, knownPaths);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('stages must be an array'))).toBe(true);
  });

  it('config with non-integer trial count returns { valid: false, errors: [...] }', () => {
    const config = makeValidConfig();
    config.blocks[0].trials = [{ path: 'arc_default', count: 2.5 }];
    const result = validateConfig(config, knownPaths);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('count') && e.includes('positive integer'))).toBe(true);
  });

  it('config with non-string path returns { valid: false, errors: [...] }', () => {
    const config = makeValidConfig();
    config.blocks[0].trials = [{ path: 123, count: 2 }];
    const result = validateConfig(config, knownPaths);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('path must be a string'))).toBe(true);
  });

  it('config with non-string stage.path returns { valid: false, errors: [...] }', () => {
    const config = makeValidConfig();
    config.blocks[0].trials = [{ stages: [{ path: 123 }], count: 2 }];
    const result = validateConfig(config, knownPaths);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('stage.path must be a string'))).toBe(true);
  });
});
