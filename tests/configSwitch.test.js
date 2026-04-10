import { describe, it, expect } from 'vitest';
import config from '@experiment-config';
import { validateConfig } from '../src/utils/validation.js';

describe('config switch', () => {
  it('alias resolves to an object with required keys', () => {
    expect(config).toHaveProperty('experiment');
    expect(config).toHaveProperty('speedTiers');
    expect(config).toHaveProperty('blocks');
    expect(config).toHaveProperty('trialFlow');
    expect(config).toHaveProperty('feedback');
    expect(config).toHaveProperty('countdown');
  });

  it('default config passes validation', () => {
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it('build metadata globals are defined', () => {
    expect(typeof __GIT_TAG__).toBe('string');
    expect(typeof __BUILD_TIME__).toBe('string');
    expect(typeof __EXPERIMENT_MODE__).toBe('string');
  });
});
