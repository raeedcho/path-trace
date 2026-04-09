// src/engine/stateMachine.js — Config-driven finite state machine

export function createStateMachine(config) {
  let currentState = config.initial;
  const listeners = [];

  return {
    get state() { return currentState; },

    send(event, payload) {
      const stateConfig = config.states[currentState];
      if (!stateConfig) return currentState;
      const transition = stateConfig.on?.[event];
      if (!transition) return currentState;

      const target = typeof transition === 'string' ? transition : transition.target;
      const guard = typeof transition === 'object' ? transition.guard : null;
      if (guard && !guard(payload)) return currentState;

      if (!config.states[target]) {
        throw new Error(`State machine: transition target "${target}" does not exist in config.states`);
      }

      const prev = currentState;
      stateConfig.onExit?.(payload);
      currentState = target;
      config.states[currentState].onEnter?.(payload);
      listeners.forEach(fn => fn(currentState, prev, event, payload));
      return currentState;
    },

    onTransition(fn) {
      listeners.push(fn);
      return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
    },

    matches(state) { return currentState === state; },
    reset() { currentState = config.initial; },
  };
}
