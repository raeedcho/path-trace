// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalDataManager } from '../src/data/LocalDataManager.js';

describe('LocalDataManager', () => {
  let manager;

  beforeEach(async () => {
    manager = new LocalDataManager();
    await manager.initialize({});
  });

  describe('initialize', () => {
    it('generates a session ID matching the expected pattern', () => {
      const sessionId = manager.getSessionId();
      expect(sessionId).toMatch(/^local_\d+_[a-z0-9]+$/);
    });

    it('creates an internal data structure with correct shape', () => {
      expect(manager.data).toEqual(expect.objectContaining({
        sessionId: expect.any(String),
        participantInfo: null,
        trials: [],
        blockSummaries: [],
        completionData: null,
        startTime: expect.any(Number),
      }));
    });
  });

  describe('saveTrial', () => {
    it('accumulates trials in order', async () => {
      await manager.saveTrial({ globalIndex: 0, accuracy: 0.9, time: 1000, completed: true });
      await manager.saveTrial({ globalIndex: 1, accuracy: 0.8, time: 1100, completed: true });
      await manager.saveTrial({ globalIndex: 2, accuracy: 0.7, time: 1200, completed: true });
      expect(manager.data.trials.length).toBe(3);
    });

    it('stores the complete trial data object without modification', async () => {
      const trialData = { globalIndex: 0, accuracy: 0.95, time: 1050, completed: true, extra: 'data' };
      await manager.saveTrial(trialData);
      expect(manager.data.trials[0]).toBe(trialData);
    });
  });

  describe('saveParticipantInfo', () => {
    it('stores the info object', async () => {
      const info = { age: 25, handedness: 'right', device: 'mouse' };
      await manager.saveParticipantInfo(info);
      expect(manager.data.participantInfo).toEqual(info);
    });
  });

  describe('saveBlockSummary', () => {
    it('accumulates block summaries', async () => {
      await manager.saveBlockSummary({ blockId: 'block_1', meanAccuracy: 0.9 });
      await manager.saveBlockSummary({ blockId: 'block_2', meanAccuracy: 0.85 });
      expect(manager.data.blockSummaries.length).toBe(2);
    });
  });

  describe('saveExperimentComplete', () => {
    it('stores completion data', async () => {
      const completionData = { totalTrials: 10, meanAccuracy: 0.88 };
      await manager.saveExperimentComplete(completionData);
      expect(manager.data.completionData).toEqual(completionData);
    });
  });

  describe('getSessionId', () => {
    it('returns the ID set during initialize', () => {
      const sessionId = manager.getSessionId();
      expect(sessionId).toBe(manager.data.sessionId);
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });
  });

  describe('finalize', () => {
    it('creates an anchor element with the correct download filename pattern', async () => {
      const mockAnchor = { href: '', download: '', click: vi.fn() };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await manager.finalize();

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.download).toMatch(/^pathtrace_local_\d+_[a-z0-9]+_\d{4}-\d{2}-\d{2}\.json$/);
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      vi.restoreAllMocks();
    });
  });
});
