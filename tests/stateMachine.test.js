import { describe, it, expect, vi } from 'vitest';
import { createStateMachine } from '../src/engine/stateMachine.js';

const trialFlowConfig = {
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
};

describe('createStateMachine', () => {
  it('initial state is config.initial', () => {
    const sm = createStateMachine(trialFlowConfig);
    expect(sm.state).toBe('IDLE');
  });

  it('valid transitions work: IDLE → BEGIN → HOLD', () => {
    const sm = createStateMachine(trialFlowConfig);
    sm.send('BEGIN');
    expect(sm.state).toBe('HOLD');
  });

  it('invalid events are ignored: sending TARGET_HIT from IDLE stays in IDLE', () => {
    const sm = createStateMachine(trialFlowConfig);
    sm.send('TARGET_HIT');
    expect(sm.state).toBe('IDLE');
  });

  it('onTransition callback fires with (current, previous, event, payload)', () => {
    const sm = createStateMachine(trialFlowConfig);
    const cb = vi.fn();
    sm.onTransition(cb);

    const payload = { trial: 1 };
    sm.send('BEGIN', payload);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('HOLD', 'IDLE', 'BEGIN', payload);
  });

  it('guard functions block transitions when they return false', () => {
    const config = {
      initial: 'A',
      states: {
        A: { on: { GO: { target: 'B', guard: () => false } } },
        B: { },
      },
    };
    const sm = createStateMachine(config);
    sm.send('GO');
    expect(sm.state).toBe('A');
  });

  it('guard functions allow transitions when they return true', () => {
    const config = {
      initial: 'A',
      states: {
        A: { on: { GO: { target: 'B', guard: () => true } } },
        B: { },
      },
    };
    const sm = createStateMachine(config);
    sm.send('GO');
    expect(sm.state).toBe('B');
  });

  it('reset() returns to initial state', () => {
    const sm = createStateMachine(trialFlowConfig);
    sm.send('BEGIN');
    expect(sm.state).toBe('HOLD');
    sm.reset();
    expect(sm.state).toBe('IDLE');
  });

  it('matches("IDLE") returns true when in IDLE state', () => {
    const sm = createStateMachine(trialFlowConfig);
    expect(sm.matches('IDLE')).toBe(true);
    expect(sm.matches('HOLD')).toBe(false);
  });

  it('onExit hook fires when leaving a state', () => {
    const onExit = vi.fn();
    const config = {
      initial: 'A',
      states: {
        A: { on: { GO: 'B' }, onExit },
        B: { },
      },
    };
    const sm = createStateMachine(config);
    const payload = { data: 42 };
    sm.send('GO', payload);
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledWith(payload);
  });

  it('onEnter hook fires when entering a state', () => {
    const onEnter = vi.fn();
    const config = {
      initial: 'A',
      states: {
        A: { on: { GO: 'B' } },
        B: { onEnter },
      },
    };
    const sm = createStateMachine(config);
    const payload = { data: 99 };
    sm.send('GO', payload);
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onEnter).toHaveBeenCalledWith(payload);
  });

  it('supports full trial flow: IDLE → HOLD → COUNTDOWN → TRACING → FEEDBACK → STAGE_CHECK → TRIAL_END → IDLE', () => {
    const sm = createStateMachine(trialFlowConfig);
    sm.send('BEGIN');
    sm.send('HOLD_COMPLETE');
    sm.send('COUNTDOWN_DONE');
    sm.send('TARGET_HIT');
    sm.send('FEEDBACK_DONE');
    sm.send('TRIAL_COMPLETE');
    sm.send('NEXT_TRIAL');
    expect(sm.state).toBe('IDLE');
  });

  it('supports multi-stage RETURN_TO_START flow', () => {
    const sm = createStateMachine(trialFlowConfig);
    sm.send('BEGIN');
    sm.send('HOLD_COMPLETE');
    sm.send('COUNTDOWN_DONE');
    sm.send('TARGET_HIT');
    sm.send('FEEDBACK_DONE');
    sm.send('NEXT_STAGE');
    expect(sm.state).toBe('RETURN_TO_START');
    sm.send('RETURNED');
    expect(sm.state).toBe('HOLD');
  });

  it('unsubscribe function from onTransition stops callback', () => {
    const sm = createStateMachine(trialFlowConfig);
    const cb = vi.fn();
    const unsub = sm.onTransition(cb);

    sm.send('BEGIN');
    expect(cb).toHaveBeenCalledTimes(1);

    unsub();
    sm.send('HOLD_COMPLETE');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('send returns the new state after transition', () => {
    const sm = createStateMachine(trialFlowConfig);
    const result = sm.send('BEGIN');
    expect(result).toBe('HOLD');
  });

  it('send returns current state when event is invalid', () => {
    const sm = createStateMachine(trialFlowConfig);
    const result = sm.send('NONEXISTENT_EVENT');
    expect(result).toBe('IDLE');
  });
});
