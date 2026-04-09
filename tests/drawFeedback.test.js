import { describe, it, expect } from 'vitest';
import { getAccuracyColor, drawAccuracyTrail, drawPaceDot, drawTargetHit } from '../src/rendering/drawFeedback.js';

describe('getAccuracyColor', () => {
  it('returns green (#58e32c) at value 100', () => {
    expect(getAccuracyColor(100)).toBe('#58e32c');
  });

  it('returns red (#ff4545) at value 0', () => {
    expect(getAccuracyColor(0)).toBe('#ff4545');
  });

  it('returns yellow (#ffe233) at value 50', () => {
    expect(getAccuracyColor(50)).toBe('#ffe233');
  });

  it('returns the second stop (#b8dd28) at value 75', () => {
    expect(getAccuracyColor(75)).toBe('#b8dd28');
  });

  it('returns the fourth stop (#ffa535) at value 25', () => {
    expect(getAccuracyColor(25)).toBe('#ffa535');
  });

  it('clamps values below 0 to red', () => {
    expect(getAccuracyColor(-10)).toBe('#ff4545');
  });

  it('clamps values above 100 to green', () => {
    expect(getAccuracyColor(150)).toBe('#58e32c');
  });

  it('interpolates between stops for value 87.5 (between green and yellow-green)', () => {
    const color = getAccuracyColor(87.5);
    // Should be midpoint between #58e32c and #b8dd28
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(color).toBe('#88e02a');
  });

  it('interpolates between stops for value 12.5 (between orange and red)', () => {
    const color = getAccuracyColor(12.5);
    // Should be midpoint between #ffa535 and #ff4545
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(color).toBe('#ff753d');
  });
});

describe('drawAccuracyTrail', () => {
  function createMockCtx() {
    return {
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
    };
  }

  function createMockPath(distance) {
    return {
      getDistanceFromPath: () => distance,
    };
  }

  it('draws a dot for each point', () => {
    const ctx = createMockCtx();
    let arcCalls = 0;
    ctx.arc = () => { arcCalls++; };
    const path = createMockPath(0);
    const points = [{ x: 10, y: 10 }, { x: 20, y: 20 }, { x: 30, y: 30 }];

    drawAccuracyTrail(ctx, points, path);
    expect(arcCalls).toBe(3);
  });

  it('uses green for points on the path (distance 0)', () => {
    const ctx = createMockCtx();
    const fills = [];
    ctx.arc = () => {};
    const origFill = ctx.fill;
    Object.defineProperty(ctx, 'fillStyle', {
      set(v) { fills.push(v); },
      get() { return fills[fills.length - 1] || ''; },
    });
    const path = createMockPath(0);

    drawAccuracyTrail(ctx, [{ x: 10, y: 10 }], path);
    expect(fills[0]).toBe('#58e32c');
  });

  it('uses red for points far from the path (distance ≥ 100)', () => {
    const ctx = createMockCtx();
    const fills = [];
    Object.defineProperty(ctx, 'fillStyle', {
      set(v) { fills.push(v); },
      get() { return fills[fills.length - 1] || ''; },
    });
    const path = createMockPath(100);

    drawAccuracyTrail(ctx, [{ x: 10, y: 10 }], path);
    expect(fills[0]).toBe('#ff4545');
  });

  it('accepts a custom color scale function', () => {
    const ctx = createMockCtx();
    const customColor = () => '#abcdef';
    const path = createMockPath(50);

    const fills = [];
    Object.defineProperty(ctx, 'fillStyle', {
      set(v) { fills.push(v); },
      get() { return fills[fills.length - 1] || ''; },
    });

    drawAccuracyTrail(ctx, [{ x: 10, y: 10 }], path, customColor);
    expect(fills[0]).toBe('#abcdef');
  });
});

describe('drawPaceDot', () => {
  function createMockCtx() {
    return {
      canvas: { width: 800, height: 600 },
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      lineTo: () => {},
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      setTransform: () => {},
    };
  }

  it('clears the canvas and draws a dot', () => {
    const ctx = createMockCtx();
    let cleared = false;
    let dotDrawn = false;
    ctx.clearRect = () => { cleared = true; };
    ctx.arc = () => { dotDrawn = true; };

    drawPaceDot(ctx, { x: 100, y: 200 });
    expect(cleared).toBe(true);
    expect(dotDrawn).toBe(true);
  });

  it('draws trail line when trail is provided', () => {
    const ctx = createMockCtx();
    let lineToCount = 0;
    ctx.lineTo = () => { lineToCount++; };
    ctx.moveTo = () => {};

    drawPaceDot(ctx, { x: 100, y: 200 }, [
      { x: 50, y: 100 },
      { x: 75, y: 150 },
      { x: 100, y: 200 },
    ]);
    expect(lineToCount).toBe(2);
  });
});

describe('drawTargetHit', () => {
  it('draws a green stroke rectangle at target position', () => {
    let strokeColor = '';
    let rectDrawn = false;
    const ctx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      strokeStyle: '',
      lineWidth: 0,
      strokeRect: () => { rectDrawn = true; },
    };
    Object.defineProperty(ctx, 'strokeStyle', {
      set(v) { strokeColor = v; },
      get() { return strokeColor; },
    });

    drawTargetHit(ctx, { x: 100, y: 200, width: 22, height: 200, angle: Math.PI });
    expect(strokeColor).toBe('#00ff00');
    expect(rectDrawn).toBe(true);
  });
});
