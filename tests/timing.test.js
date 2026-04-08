import { describe, it, expect } from 'vitest';
import { wait, createTimer } from '../src/utils/timing.js';

describe('wait', () => {
  it('resolves after approximately 50ms', async () => {
    const start = performance.now();
    await wait(50);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(20);
    expect(elapsed).toBeLessThan(80);
  });
});

describe('createTimer', () => {
  it('elapsed() returns approximately 50ms after start() and wait(50)', async () => {
    const timer = createTimer();
    timer.start();
    await wait(50);
    const elapsed = timer.elapsed();
    expect(elapsed).toBeGreaterThanOrEqual(20);
    expect(elapsed).toBeLessThan(80);
  });

  it('reset() resets elapsed to approximately 0', async () => {
    const timer = createTimer();
    timer.start();
    await wait(50);
    timer.reset();
    const elapsed = timer.elapsed();
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(elapsed).toBeLessThan(30);
  });
});
