import { describe, it, expect } from 'vitest';
import { registerPath, createPath, getRegisteredPaths } from '../src/paths/pathRegistry.js';
import { ArcPath } from '../src/paths/ArcPath.js';
import { VShapePath } from '../src/paths/VShapePath.js';
import { LinePath } from '../src/paths/LinePath.js';
import { distance } from '../src/utils/math.js';

// --- Registry tests ---

describe('pathRegistry', () => {
  it('getRegisteredPaths includes arc, vshape, line', () => {
    const paths = getRegisteredPaths();
    expect(paths).toContain('arc');
    expect(paths).toContain('vshape');
    expect(paths).toContain('line');
  });

  it('createPath("arc", config) returns an ArcPath instance', () => {
    const path = createPath('arc', { centerX: 200, centerY: 200, radius: 100 });
    expect(path).toBeInstanceOf(ArcPath);
  });

  it('createPath("vshape", config) returns a VShapePath instance', () => {
    const path = createPath('vshape', { centerX: 200, centerY: 200, halfWidth: 100, peakHeight: 100 });
    expect(path).toBeInstanceOf(VShapePath);
  });

  it('createPath("line", config) returns a LinePath instance', () => {
    const path = createPath('line', { startX: 0, startY: 0, endX: 100, endY: 0 });
    expect(path).toBeInstanceOf(LinePath);
  });

  it('createPath("nonexistent") throws an error with available path names', () => {
    expect(() => createPath('nonexistent', {})).toThrow('Unknown path type: "nonexistent"');
    expect(() => createPath('nonexistent', {})).toThrow(/Available:/);
  });

  it('registerPath throws on duplicate registration', () => {
    expect(() => registerPath('arc', ArcPath)).toThrow('Path type "arc" is already registered.');
  });
});

// --- ArcPath tests ---

describe('ArcPath', () => {
  const arc = new ArcPath({
    centerX: 200,
    centerY: 200,
    radius: 100,
    startAngle: Math.PI,
    endAngle: 2 * Math.PI,
  });

  it('getPointAtProgress(0) returns the start point (left endpoint)', () => {
    const pt = arc.getPointAtProgress(0);
    expect(pt.x).toBeCloseTo(200 + 100 * Math.cos(Math.PI), 5);
    expect(pt.y).toBeCloseTo(200 + 100 * Math.sin(Math.PI), 5);
  });

  it('getPointAtProgress(1) returns the end point (right endpoint)', () => {
    const pt = arc.getPointAtProgress(1);
    expect(pt.x).toBeCloseTo(200 + 100 * Math.cos(2 * Math.PI), 5);
    expect(pt.y).toBeCloseTo(200 + 100 * Math.sin(2 * Math.PI), 5);
  });

  it('getPointAtProgress(0.5) returns the top of the arc', () => {
    const pt = arc.getPointAtProgress(0.5);
    // At 1.5π (270°), cos = 0, sin = -1 → (200, 100)
    expect(pt.x).toBeCloseTo(200, 5);
    expect(pt.y).toBeCloseTo(100, 5);
  });

  it('getDistanceFromPath returns ~0 for a point sampled via getPointAtProgress', () => {
    const pt = arc.getPointAtProgress(0.25);
    expect(arc.getDistanceFromPath(pt)).toBeCloseTo(0, 3);
  });

  it('getDistanceFromPath returns ~0 for a point at progress 0.75', () => {
    const pt = arc.getPointAtProgress(0.75);
    expect(arc.getDistanceFromPath(pt)).toBeCloseTo(0, 3);
  });

  it('getDistanceFromPath(center) returns approximately radius', () => {
    expect(arc.getDistanceFromPath({ x: 200, y: 200 })).toBeCloseTo(100, 3);
  });

  it('getDistanceFromPath for a point outside arc range returns distance to nearest endpoint', () => {
    // Point below center, angle ~π/2 which is outside [π, 2π] range
    const pt = { x: 200, y: 350 };
    const startPt = arc.getPointAtProgress(0);
    const endPt = arc.getPointAtProgress(1);
    const expected = Math.min(
      distance(pt.x, pt.y, startPt.x, startPt.y),
      distance(pt.x, pt.y, endPt.x, endPt.y),
    );
    expect(arc.getDistanceFromPath(pt)).toBeCloseTo(expected, 3);
  });

  it('getTotalLength returns π × radius for a semicircle', () => {
    expect(arc.getTotalLength()).toBeCloseTo(Math.PI * 100, 5);
  });

  it('getProgressAtPoint(getPointAtProgress(0.25)) returns approximately 0.25', () => {
    const pt = arc.getPointAtProgress(0.25);
    expect(arc.getProgressAtPoint(pt)).toBeCloseTo(0.25, 3);
  });

  it('getProgressAtPoint(getPointAtProgress(0.75)) returns approximately 0.75', () => {
    const pt = arc.getPointAtProgress(0.75);
    expect(arc.getProgressAtPoint(pt)).toBeCloseTo(0.75, 3);
  });

  it('getTargetPosition returns endpoint position', () => {
    const target = arc.getTargetPosition();
    const endPt = arc.getPointAtProgress(1);
    expect(target.x).toBeCloseTo(endPt.x, 5);
    expect(target.y).toBeCloseTo(endPt.y, 5);
  });

  it('getTargetPosition returns endAngle as the rotation angle', () => {
    const target = arc.getTargetPosition();
    expect(target.angle).toBeCloseTo(2 * Math.PI, 5);
  });

  it('getTargetPosition returns stored target dimensions', () => {
    const arcWithDims = new ArcPath({
      centerX: 200, centerY: 200, radius: 100,
      targetWidth: 22, targetHeight: 200,
    });
    const target = arcWithDims.getTargetPosition();
    expect(target.width).toBe(22);
    expect(target.height).toBe(200);
  });

  it('implements all six interface methods', () => {
    expect(typeof arc.draw).toBe('function');
    expect(typeof arc.getPointAtProgress).toBe('function');
    expect(typeof arc.getDistanceFromPath).toBe('function');
    expect(typeof arc.getProgressAtPoint).toBe('function');
    expect(typeof arc.getTargetPosition).toBe('function');
    expect(typeof arc.getTotalLength).toBe('function');
  });
});

// --- VShapePath tests ---

describe('VShapePath', () => {
  const vshape = new VShapePath({
    centerX: 200,
    centerY: 200,
    halfWidth: 100,
    peakHeight: 100,
    angle: 0,
  });

  it('getPointAtProgress(0) returns the start point', () => {
    const pt = vshape.getPointAtProgress(0);
    expect(pt.x).toBeCloseTo(vshape.start.x, 5);
    expect(pt.y).toBeCloseTo(vshape.start.y, 5);
  });

  it('getPointAtProgress(1) returns the end point', () => {
    const pt = vshape.getPointAtProgress(1);
    expect(pt.x).toBeCloseTo(vshape.end.x, 5);
    expect(pt.y).toBeCloseTo(vshape.end.y, 5);
  });

  it('getPointAtProgress(splitProgress) returns the peak vertex', () => {
    const pt = vshape.getPointAtProgress(vshape.splitProgress);
    expect(pt.x).toBeCloseTo(vshape.peak.x, 3);
    expect(pt.y).toBeCloseTo(vshape.peak.y, 3);
  });

  it('getDistanceFromPath(peak) returns approximately 0', () => {
    expect(vshape.getDistanceFromPath(vshape.peak)).toBeCloseTo(0, 3);
  });

  it('getDistanceFromPath(point far away) returns a large value', () => {
    const d = vshape.getDistanceFromPath({ x: 1000, y: 1000 });
    expect(d).toBeGreaterThan(100);
  });

  it('getTotalLength equals sum of both segment lengths', () => {
    const seg1 = distance(vshape.start.x, vshape.start.y, vshape.peak.x, vshape.peak.y);
    const seg2 = distance(vshape.peak.x, vshape.peak.y, vshape.end.x, vshape.end.y);
    expect(vshape.getTotalLength()).toBeCloseTo(seg1 + seg2, 5);
  });

  it('getProgressAtPoint returns ~splitProgress for the peak', () => {
    const progress = vshape.getProgressAtPoint(vshape.peak);
    expect(progress).toBeCloseTo(vshape.splitProgress, 3);
  });

  it('getTargetPosition returns endpoint position', () => {
    const target = vshape.getTargetPosition();
    expect(target.x).toBeCloseTo(vshape.end.x, 5);
    expect(target.y).toBeCloseTo(vshape.end.y, 5);
  });

  it('getTargetPosition returns stored target dimensions', () => {
    const vWithDims = new VShapePath({
      centerX: 200, centerY: 200, halfWidth: 100, peakHeight: 100,
      targetWidth: 22, targetHeight: 200,
    });
    const target = vWithDims.getTargetPosition();
    expect(target.width).toBe(22);
    expect(target.height).toBe(200);
  });

  it('implements all six interface methods', () => {
    expect(typeof vshape.draw).toBe('function');
    expect(typeof vshape.getPointAtProgress).toBe('function');
    expect(typeof vshape.getDistanceFromPath).toBe('function');
    expect(typeof vshape.getProgressAtPoint).toBe('function');
    expect(typeof vshape.getTargetPosition).toBe('function');
    expect(typeof vshape.getTotalLength).toBe('function');
  });

  it('works with rotation applied', () => {
    const rotated = new VShapePath({
      centerX: 200,
      centerY: 200,
      halfWidth: 100,
      peakHeight: 100,
      angle: Math.PI / 2,
    });
    const pt = rotated.getPointAtProgress(rotated.splitProgress);
    expect(pt.x).toBeCloseTo(rotated.peak.x, 3);
    expect(pt.y).toBeCloseTo(rotated.peak.y, 3);
  });
});

// --- LinePath tests ---

describe('LinePath', () => {
  const line = new LinePath({
    startX: 100,
    startY: 200,
    endX: 300,
    endY: 200,
  });

  it('getPointAtProgress(0) returns start', () => {
    const pt = line.getPointAtProgress(0);
    expect(pt.x).toBeCloseTo(100, 5);
    expect(pt.y).toBeCloseTo(200, 5);
  });

  it('getPointAtProgress(1) returns end', () => {
    const pt = line.getPointAtProgress(1);
    expect(pt.x).toBeCloseTo(300, 5);
    expect(pt.y).toBeCloseTo(200, 5);
  });

  it('getPointAtProgress(0.5) returns midpoint', () => {
    const pt = line.getPointAtProgress(0.5);
    expect(pt.x).toBeCloseTo(200, 5);
    expect(pt.y).toBeCloseTo(200, 5);
  });

  it('getDistanceFromPath(midpoint offset by 10) returns approximately 10', () => {
    expect(line.getDistanceFromPath({ x: 200, y: 210 })).toBeCloseTo(10, 5);
  });

  it('getTotalLength matches distance(start, end)', () => {
    expect(line.getTotalLength()).toBeCloseTo(distance(100, 200, 300, 200), 5);
  });

  it('getProgressAtPoint returns ~0.5 for midpoint', () => {
    expect(line.getProgressAtPoint({ x: 200, y: 200 })).toBeCloseTo(0.5, 5);
  });

  it('getTargetPosition returns endpoint position', () => {
    const target = line.getTargetPosition();
    expect(target.x).toBeCloseTo(300, 5);
    expect(target.y).toBeCloseTo(200, 5);
  });

  it('getTargetPosition returns stored target dimensions', () => {
    const lineWithDims = new LinePath({
      startX: 0, startY: 0, endX: 100, endY: 0,
      targetWidth: 22, targetHeight: 200,
    });
    const target = lineWithDims.getTargetPosition();
    expect(target.width).toBe(22);
    expect(target.height).toBe(200);
  });

  it('implements all six interface methods', () => {
    expect(typeof line.draw).toBe('function');
    expect(typeof line.getPointAtProgress).toBe('function');
    expect(typeof line.getDistanceFromPath).toBe('function');
    expect(typeof line.getProgressAtPoint).toBe('function');
    expect(typeof line.getTargetPosition).toBe('function');
    expect(typeof line.getTotalLength).toBe('function');
  });
});
