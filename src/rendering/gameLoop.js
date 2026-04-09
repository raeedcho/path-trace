// src/rendering/gameLoop.js — requestAnimationFrame loop

const MAX_DELTA = 100; // Cap deltaTime at 100ms to prevent spiral-of-death

/**
 * Creates a game loop that calls update and render on each animation frame.
 * @param {function} updateFn — called with deltaTime in milliseconds
 * @param {function} renderFn — called after updateFn each frame
 * @returns {object}
 */
export function createGameLoop(updateFn, renderFn) {
  let running = false;
  let frameId = null;
  let lastTime = 0;

  function loop(currentTime) {
    if (!running) return;

    let deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Cap deltaTime to prevent spiral-of-death after tab switches
    if (deltaTime > MAX_DELTA) {
      deltaTime = MAX_DELTA;
    }

    updateFn(deltaTime);
    renderFn();

    frameId = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    frameId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  function isRunning() {
    return running;
  }

  return { start, stop, isRunning };
}
