import { describe, it, expect } from 'vitest';
import { distance, clamp, lerp, lineToPoint, normalizeAngle } from '../src/utils/math.js';

describe('distance', () => {
  it('returns 5 for a 3-4-5 triangle', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });

  it('returns 0 for identical points', () => {
    expect(distance(0, 0, 0, 0)).toBe(0);
  });
});

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min when below range', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('clamps to max when above range', () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('lerp', () => {
  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it('returns a at t=0', () => {
    expect(lerp(0, 10, 0)).toBe(0);
  });

  it('returns b at t=1', () => {
    expect(lerp(0, 10, 1)).toBe(10);
  });
});

describe('lineToPoint', () => {
  it('returns 5 for a point 5 units above midpoint of horizontal segment', () => {
    expect(lineToPoint(0, 0, 10, 0, 5, 5)).toBe(5);
  });

  it('returns 5 for a point beyond segment start, snaps to endpoint', () => {
    expect(lineToPoint(0, 0, 10, 0, -5, 0)).toBe(5);
  });

  it('returns distance to the point when segment has zero length', () => {
    expect(lineToPoint(5, 5, 5, 5, 8, 9)).toBe(5); // distance from (5,5) to (8,9)
  });
});

describe('normalizeAngle', () => {
  it('normalizes -π to approximately π', () => {
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI);
  });
});
