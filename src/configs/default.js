// src/configs/default.js — Minimal 3-trial config for development/testing

export default {
  experiment: {
    name: 'Default Test',
    version: '0.1.0',
  },
  pointer: { scaleFactor: 2.4, usePointerLock: true, useUnadjustedMovement: true },
  speedTiers: {
    medium: { min: 640, max: 960 },
  },
  countdown: {
    holdDuration: 1000,
    toneInterval: null,
    tones: [
      { color: 'countdown.ready', sound: 'ready' },
      { color: 'countdown.set',   sound: 'ready' },
      { color: 'countdown.go',    sound: 'go'    },
    ],
  },
  tracing: {
    maxDurationMultiplier: 3,
  },
  feedback: {
    tooFastMessage: 'Move slower!',
    tooSlowMessage: 'Move faster!',
    straightLineMessage: 'Straight line detected!',
    straightLineThreshold: 25,
    tooFastPenalty: 3000,
    tooSlowPenalty: 3000,
    straightLinePenalty: 5000,
    accuracyTrailDuration: 1000,
  },
  blocks: [
    {
      id: 'test_block',
      label: 'Test Block',
      speedTier: 'medium',
      trials: [{ path: 'arc_default', count: 3 }],
      shuffle: false,
      showFeedback: true,
      breakAfter: false,
    },
  ],
  trialFlow: {
    initial: 'IDLE',
    states: {
      IDLE:            { on: { BEGIN: 'HOLD' } },
      HOLD:            { on: { HOLD_COMPLETE: 'COUNTDOWN', HOLD_BROKEN: 'HOLD' } },
      COUNTDOWN:       { on: { COUNTDOWN_DONE: 'TRACING', HOLD_BROKEN: 'HOLD' } },
      TRACING:         { on: { TARGET_HIT: 'FEEDBACK', TIMEOUT: 'FEEDBACK' } },
      FEEDBACK:        { on: { FEEDBACK_DONE: 'STAGE_CHECK' } },
      STAGE_CHECK:     { on: { NEXT_STAGE: 'RETURN_TO_START', TRIAL_COMPLETE: 'TRIAL_END' } },
      RETURN_TO_START: { on: { RETURNED: 'HOLD' } },
      TRIAL_END:       { on: { NEXT_TRIAL: 'IDLE', BREAK: 'BREAK_SCREEN', EXPERIMENT_DONE: 'DONE' } },
      BREAK_SCREEN:    { on: { BREAK_OVER: 'IDLE' } },
      DONE:            { },
    },
  },
  prolific: { completionCode: 'TEST', collectFeedback: true },
  firebase: {
    apiKey: '', authDomain: '', projectId: '',
    storageBucket: '', messagingSenderId: '', appId: '', databaseURL: '',
  },
};
