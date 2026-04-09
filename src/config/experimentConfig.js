// src/config/experimentConfig.js — Master config: blocks, timing, speed tiers

export default {
  experiment: {
    name: 'Arc Tracing Study',
    version: '1.0.0',
  },

  pointer: {
    scaleFactor: 2.4,
    usePointerLock: true,
    useUnadjustedMovement: true,
  },

  speedTiers: {
    slow:     { min: 800,  max: 1200 },
    medium:   { min: 640,  max: 960  },
    fast:     { min: 400,  max: 600  },
    veryFast: { min: 240,  max: 400  },
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

  feedback: {
    tooFastMessage: 'Move slower!',
    tooSlowMessage: 'Move faster!',
    straightLineMessage: 'Straight line detected, please follow the curved path!',
    straightLineThreshold: 25,
    tooFastPenalty: 3000,
    tooSlowPenalty: 3000,
    straightLinePenalty: 5000,
  },

  blocks: [
    {
      id: 'warmup_slow',
      label: 'Warmup Round 1: Slow',
      speedTier: 'slow',
      trials: [{ path: 'arc_default', count: 8 }],
      shuffle: false,
      showFeedback: true,
      breakAfter: false,
    },
    {
      id: 'warmup_medium',
      label: 'Warmup Round 2: Medium',
      speedTier: 'medium',
      trials: [{ path: 'arc_default', count: 8 }],
      shuffle: false,
      showFeedback: true,
      breakAfter: false,
    },
    {
      id: 'warmup_fast',
      label: 'Warmup Round 3: Fast',
      speedTier: 'fast',
      trials: [{ path: 'arc_default', count: 8 }],
      shuffle: false,
      showFeedback: true,
      breakAfter: false,
    },
    {
      id: 'warmup_veryfast',
      label: 'Warmup Round 4: Very Fast',
      speedTier: 'veryFast',
      trials: [{ path: 'arc_default', count: 8 }],
      shuffle: false,
      showFeedback: true,
      breakAfter: false,
    },
    // TODO: expand to full 20-round test protocol matching legacy/website/public/js/game.js
    // Original uses two shuffled speed-tier arrays (testTimes_1, testTimes_2) concatenated 4×:
    //   testTimes_1: [veryFast×2, fast, medium, slow]
    //   testTimes_2: [veryFast, fast×2, medium, slow]
    // Resulting in 20 blocks × 16 trials = 320 test movements.
    {
      id: 'test_block_1',
      label: 'Testing Round 1',
      speedTier: 'medium',
      trials: [{ path: 'arc_default', count: 16 }],
      shuffle: true,
      showFeedback: true,
      breakAfter: true,
      breakDuration: 10000,
    },
  ],

  trialFlow: {
    initial: 'IDLE',
    states: {
      IDLE:            { on: { BEGIN: 'HOLD' } },
      HOLD:            { on: { HOLD_COMPLETE: 'COUNTDOWN', HOLD_BROKEN: 'HOLD' } },
      COUNTDOWN:       { on: { COUNTDOWN_DONE: 'TRACING' } },
      TRACING:         { on: { TARGET_HIT: 'FEEDBACK', TIMEOUT: 'FEEDBACK' } },
      FEEDBACK:        { on: { FEEDBACK_DONE: 'STAGE_CHECK' } },
      STAGE_CHECK:     { on: { NEXT_STAGE: 'RETURN_TO_START', TRIAL_COMPLETE: 'TRIAL_END' } },
      RETURN_TO_START: { on: { RETURNED: 'HOLD' } },
      TRIAL_END:       { on: { NEXT_TRIAL: 'IDLE', BREAK: 'BREAK_SCREEN', EXPERIMENT_DONE: 'DONE' } },
      BREAK_SCREEN:    { on: { BREAK_OVER: 'IDLE' } },
      DONE:            { },
    },
  },

  prolific: {
    completionCode: 'C9AOT8TW',
    collectFeedback: true,
  },
};
