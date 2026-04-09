// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGameLoop } from '../src/rendering/gameLoop.js';

describe('createGameLoop', () => {
  let rafCallbacks;
  let cafSpy;
  let nowValue;

  beforeEach(() => {
    rafCallbacks = [];
    nowValue = 0;

    globalThis.requestAnimationFrame = vi.fn((cb) => {
      const id = rafCallbacks.length + 1;
      rafCallbacks.push(cb);
      return id;
    });

    globalThis.cancelAnimationFrame = vi.fn();
    cafSpy = globalThis.cancelAnimationFrame;

    vi.spyOn(performance, 'now').mockImplementation(() => nowValue);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
  });

  it('isRunning returns false initially', () => {
    const loop = createGameLoop(() => {}, () => {});
    expect(loop.isRunning()).toBe(false);
  });

  it('start begins the loop and isRunning returns true', () => {
    const loop = createGameLoop(() => {}, () => {});
    loop.start();
    expect(loop.isRunning()).toBe(true);
  });

  it('stop cancels the loop and isRunning returns false', () => {
    const loop = createGameLoop(() => {}, () => {});
    loop.start();
    loop.stop();
    expect(loop.isRunning()).toBe(false);
    expect(cafSpy).toHaveBeenCalled();
  });

  it('calls updateFn with deltaTime and then renderFn each frame', () => {
    const updateFn = vi.fn();
    const renderFn = vi.fn();

    nowValue = 0;
    const loop = createGameLoop(updateFn, renderFn);
    loop.start();

    // Simulate first frame at 16ms
    expect(rafCallbacks.length).toBe(1);
    rafCallbacks[0](16);

    expect(updateFn).toHaveBeenCalledWith(16);
    expect(renderFn).toHaveBeenCalledTimes(1);
  });

  it('caps deltaTime at 100ms', () => {
    const updateFn = vi.fn();
    const renderFn = vi.fn();

    nowValue = 0;
    const loop = createGameLoop(updateFn, renderFn);
    loop.start();

    // Simulate a frame after a long pause (500ms)
    rafCallbacks[0](500);

    expect(updateFn).toHaveBeenCalledWith(100);
  });

  it('start is idempotent when already running', () => {
    const loop = createGameLoop(() => {}, () => {});
    loop.start();
    loop.start();
    // Should only request one animation frame
    expect(rafCallbacks.length).toBe(1);
  });

  it('computes deltaTime between consecutive frames', () => {
    const deltas = [];
    const updateFn = vi.fn((dt) => deltas.push(dt));
    const renderFn = vi.fn();

    nowValue = 0;
    const loop = createGameLoop(updateFn, renderFn);
    loop.start();

    // First frame
    rafCallbacks[0](16);
    // Second frame
    rafCallbacks[1](33);

    expect(deltas).toEqual([16, 17]);
  });
});
