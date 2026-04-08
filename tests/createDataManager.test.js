import { describe, it, expect, vi } from 'vitest';
import { LocalDataManager } from '../src/data/LocalDataManager.js';

// Firebase backend tested via integration test during deployment, not unit test.

describe('createDataManager', () => {
  it('returns a LocalDataManager instance when VITE_DATA_BACKEND is local', async () => {
    vi.stubEnv('VITE_DATA_BACKEND', 'local');

    // Re-import to pick up the stubbed env
    const { createDataManager } = await import('../src/data/createDataManager.js');
    const manager = await createDataManager({});

    expect(manager).toBeInstanceOf(LocalDataManager);

    vi.unstubAllEnvs();
  });

  it('returned manager has all interface methods', async () => {
    vi.stubEnv('VITE_DATA_BACKEND', 'local');

    const { createDataManager } = await import('../src/data/createDataManager.js');
    const manager = await createDataManager({});

    expect(typeof manager.initialize).toBe('function');
    expect(typeof manager.saveParticipantInfo).toBe('function');
    expect(typeof manager.saveTrial).toBe('function');
    expect(typeof manager.saveBlockSummary).toBe('function');
    expect(typeof manager.saveExperimentComplete).toBe('function');
    expect(typeof manager.finalize).toBe('function');
    expect(typeof manager.getSessionId).toBe('function');

    vi.unstubAllEnvs();
  });
});
