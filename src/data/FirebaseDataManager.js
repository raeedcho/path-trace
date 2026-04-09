// src/data/FirebaseDataManager.js — Firebase Realtime Database backend

const REQUIRED_FIREBASE_CONFIG_FIELDS = ['apiKey', 'authDomain', 'databaseURL', 'projectId'];

export class FirebaseDataManager {
  constructor() {
    this.app = null;
    this.db = null;
    this.auth = null;
    this.sessionPath = null;
    this.participantId = null;
  }

  async initialize(config) {
    const missing = REQUIRED_FIREBASE_CONFIG_FIELDS.filter(key => !config.firebase?.[key]);
    if (missing.length > 0) {
      throw new Error(
        `FirebaseDataManager: missing required config fields: ${missing.join(', ')}. ` +
        'Set these values in experimentConfig.js before deploying.'
      );
    }

    const { initializeApp } = await import('firebase/app');
    const { getDatabase, ref, set, update } = await import('firebase/database');
    const { getAuth, signInAnonymously, signOut } = await import('firebase/auth');

    this.app = initializeApp(config.firebase);
    this.db = getDatabase(this.app);
    this.auth = getAuth(this.app);

    // Store Firebase module references for later use
    this._fbRef = ref;
    this._fbSet = set;
    this._fbUpdate = update;
    this._fbSignOut = signOut;

    const credential = await signInAnonymously(this.auth);
    this.participantId = credential.user.uid;
    this.sessionPath = `experiments/${config.experiment.name}/participants/${this.participantId}`;
  }

  async saveParticipantInfo(info) {
    const dbRef = this._fbRef(this.db, `${this.sessionPath}/participantInfo`);
    this._fbUpdate(dbRef, info).catch(err =>
      console.error('[FirebaseData] Failed to save participant info:', err)
    );
  }

  async saveTrial(trialData) {
    const dbRef = this._fbRef(this.db, `${this.sessionPath}/trials/trial_${trialData.globalIndex}`);
    this._fbSet(dbRef, { ...trialData, timestamp: Date.now() }).catch(err =>
      console.error(`[FirebaseData] Failed to save trial ${trialData.globalIndex}:`, err)
    );
  }

  async saveBlockSummary(blockData) {
    const dbRef = this._fbRef(this.db, `${this.sessionPath}/blocks/${blockData.blockId}`);
    this._fbSet(dbRef, blockData).catch(err =>
      console.error(`[FirebaseData] Failed to save block ${blockData.blockId}:`, err)
    );
  }

  async saveExperimentComplete(data) {
    const dbRef = this._fbRef(this.db, `${this.sessionPath}/completion`);
    this._fbSet(dbRef, data).catch(err =>
      console.error('[FirebaseData] Failed to save completion data:', err)
    );
  }

  async finalize() {
    const dbRef = this._fbRef(this.db, `${this.sessionPath}/status`);
    this._fbSet(dbRef, { completed: true, endTime: Date.now() }).catch(err =>
      console.error('[FirebaseData] Failed to write completion status:', err)
    );

    this._fbSignOut(this.auth).catch(err =>
      console.error('[FirebaseData] Failed to sign out:', err)
    );
  }

  getSessionId() {
    return this.participantId;
  }
}
