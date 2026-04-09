// src/data/createDataManager.js — Factory: reads env, returns backend
//
// DataManager interface:
//   async initialize(config)            — Set up the backend (connect to Firebase, create session ID, etc.)
//   async saveParticipantInfo(info)      — Store demographics, handedness, device, consent
//   async saveTrial(trialData)           — Store one trial's results (called after each trial)
//   async saveBlockSummary(blockData)    — Store block-level aggregates (called after each block)
//   async saveExperimentComplete(data)   — Store completion status, final summary, feedback
//   async finalize()                     — Flush remaining data, trigger download, close connections
//   getSessionId()                       — Return the current session/participant ID

import { LocalDataManager } from './LocalDataManager.js';

export async function createDataManager(config) {
  const backend = import.meta.env.VITE_DATA_BACKEND;

  if (backend === 'firebase') {
    const { FirebaseDataManager } = await import('./FirebaseDataManager.js');
    const manager = new FirebaseDataManager();
    await manager.initialize(config);
    return manager;
  }

  if (!backend || backend === 'local') {
    const manager = new LocalDataManager();
    await manager.initialize(config);
    return manager;
  }

  throw new Error(
    `Invalid VITE_DATA_BACKEND value: "${String(backend)}". Expected "local" or "firebase".`
  );
}
