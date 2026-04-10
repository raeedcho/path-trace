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
    // In test mode, experiment mode should resolve to 'default'
    expect(__EXPERIMENT_MODE__).toBe('default');
    // BUILD_TIME should be a valid ISO 8601 timestamp
    expect(new Date(__BUILD_TIME__).toISOString()).toBe(__BUILD_TIME__);
  });
});
