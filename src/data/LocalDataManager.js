// src/data/LocalDataManager.js — Accumulates trials, downloads JSON

export class LocalDataManager {
  constructor() {
    this.data = null;
  }

  async initialize(config) {
    const randomBytes = new Uint8Array(4);
    crypto.getRandomValues(randomBytes);
    const randomSuffix = Array.from(randomBytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 8);
    const sessionId = `local_${Date.now()}_${randomSuffix}`;
    this.data = {
      sessionId,
      participantInfo: null,
      trials: [],
      blockSummaries: [],
      completionData: null,
      startTime: Date.now(),
    };
  }

  async saveParticipantInfo(info) {
    this.data.participantInfo = info;
    this._backupToLocalStorage();
  }

  async saveTrial(trialData) {
    this.data.trials.push(trialData);
    this._backupToLocalStorage();
    console.log(`[LocalData] Trial ${trialData.globalIndex} saved (${this.data.trials.length} total)`);
  }

  async saveBlockSummary(blockData) {
    this.data.blockSummaries.push(blockData);
  }

  async saveExperimentComplete(data) {
    this.data.completionData = data;
  }

  async finalize() {
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pathtrace_${this.data.sessionId}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    try {
      localStorage.removeItem(`pathtrace_backup_${this.data.sessionId}`);
    } catch (e) {
      // localStorage may not be available in all environments
    }
  }

  getSessionId() {
    return this.data.sessionId;
  }

  _backupToLocalStorage() {
    try {
      const backup = {
        sessionId: this.data.sessionId,
        participantInfo: this.data.participantInfo,
        trials: this.data.trials.map(({ points, ...summary }) => summary),
        blockSummaries: this.data.blockSummaries,
        startTime: this.data.startTime,
      };
      localStorage.setItem(
        `pathtrace_backup_${this.data.sessionId}`,
        JSON.stringify(backup)
      );
    } catch (e) {
      // localStorage may not be available or quota exceeded
    }
  }
}
