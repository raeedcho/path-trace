// src/paths/VShapePath.js — V-shape path implementation

import { distance, lerp, lineToPoint } from '../utils/math.js';
import { registerPath } from './pathRegistry.js';

export class VShapePath {
  /**
   * @param {object} config
   * @param {number} config.centerX
   * @param {number} config.centerY
   * @param {number} config.halfWidth
   * @param {number} config.peakHeight
   * @param {number} [config.angle=0] — rotation angle in radians
   * @param {number} [config.targetWidth=0] — target zone width for hit detection
   * @param {number} [config.targetHeight=0] — target zone height for hit detection
   */
  constructor({ centerX, centerY, halfWidth, peakHeight, angle = 0, targetWidth = 0, targetHeight = 0 }) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.halfWidth = halfWidth;
    this.peakHeight = peakHeight;
    this.angle = angle;
    this.targetWidth = targetWidth;
    this.targetHeight = targetHeight;

    // Compute three unrotated points relative to center:
    // start (left-center), peak (top-center), end (right-center)
    // Convention: in local canvas coordinates, negative Y is above the center
    const rawStart = { x: -halfWidth, y: 0 };
    const rawPeak = { x: 0, y: -peakHeight };
    const rawEnd = { x: halfWidth, y: 0 };

    // Apply rotation and translate to center
    this.start = this._rotateAndTranslate(rawStart);
    this.peak = this._rotateAndTranslate(rawPeak);
    this.end = this._rotateAndTranslate(rawEnd);

    // Segment lengths
    this.seg1Length = distance(this.start.x, this.start.y, this.peak.x, this.peak.y);
    this.seg2Length = distance(this.peak.x, this.peak.y, this.end.x, this.end.y);
    this.totalLength = this.seg1Length + this.seg2Length;
    this.splitProgress = this.totalLength > 0 ? this.seg1Length / this.totalLength : 0.5;
  }

  /**
   * Rotate a point around origin and translate to center.
   * @param {{x: number, y: number}} point
   * @returns {{x: number, y: number}}
   */
  _rotateAndTranslate({ x, y }) {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    return {
      x: this.centerX + x * cos - y * sin,
      y: this.centerY + x * sin + y * cos,
    };
  }

  /**
   * Position on the V-shape at normalized progress t.
   * @param {number} t — progress in [0, 1]
   * @returns {{x: number, y: number}}
   */
  getPointAtProgress(t) {
    if (t <= this.splitProgress) {
      const segT = this.splitProgress > 0 ? t / this.splitProgress : 0;
      return {
        x: lerp(this.start.x, this.peak.x, segT),
        y: lerp(this.start.y, this.peak.y, segT),
      };
    }
    const segT = (1 - this.splitProgress) > 0
      ? (t - this.splitProgress) / (1 - this.splitProgress)
      : 1;
    return {
      x: lerp(this.peak.x, this.end.x, segT),
      y: lerp(this.peak.y, this.end.y, segT),
    };
  }

  /**
   * Perpendicular distance from a point to the V-shape.
   * @param {{x: number, y: number}} point
   * @returns {number}
   */
  getDistanceFromPath({ x, y }) {
    const d1 = lineToPoint(this.start.x, this.start.y, this.peak.x, this.peak.y, x, y);
    const d2 = lineToPoint(this.peak.x, this.peak.y, this.end.x, this.end.y, x, y);
    return Math.min(d1, d2);
  }

  /**
   * Project a point onto the V-shape, return its progress parameter.
   * @param {{x: number, y: number}} point
   * @returns {number} progress in [0, 1]
   */
  getProgressAtPoint({ x, y }) {
    // Project onto each segment and find which is closer
    const t1 = this._projectOntoSegment(this.start, this.peak, x, y);
    const d1 = this._distToProjection(this.start, this.peak, t1, x, y);

    const t2 = this._projectOntoSegment(this.peak, this.end, x, y);
    const d2 = this._distToProjection(this.peak, this.end, t2, x, y);

    if (d1 <= d2) {
      return t1 * this.splitProgress;
    }
    return this.splitProgress + t2 * (1 - this.splitProgress);
  }

  /**
   * @param {{x: number, y: number}} a
   * @param {{x: number, y: number}} b
   * @param {number} px
   * @param {number} py
   * @returns {number} t in [0, 1]
   */
  _projectOntoSegment(a, b, px, py) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return 0;
    const t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
    return Math.max(0, Math.min(1, t));
  }

  /**
   * @param {{x: number, y: number}} a
   * @param {{x: number, y: number}} b
   * @param {number} t
   * @param {number} px
   * @param {number} py
   * @returns {number}
   */
  _distToProjection(a, b, t, px, py) {
    const projX = lerp(a.x, b.x, t);
    const projY = lerp(a.y, b.y, t);
    return distance(px, py, projX, projY);
  }

  /**
   * Endpoint target zone geometry.
   * @returns {{x: number, y: number, width: number, height: number, angle: number}}
   */
  getTargetPosition() {
    const angle = Math.atan2(
      this.end.y - this.peak.y,
      this.end.x - this.peak.x,
    );
    return { x: this.end.x, y: this.end.y, width: this.targetWidth, height: this.targetHeight, angle };
  }

  /**
   * Total V-shape path length.
   * @returns {number}
   */
  getTotalLength() {
    return this.totalLength;
  }

  /**
   * Draw the V-shape on a canvas context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} style
   */
  draw(ctx, style) {
    const colors = style.colors || {};
    const startRadius = style.startCircleRadius || 14;
    const targetRings = colors.targetRings || [];

    ctx.save();

    // Draw dashed V-shape (two segments)
    ctx.setLineDash([3, 6]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = colors.path || '#000';
    ctx.beginPath();
    ctx.moveTo(this.start.x, this.start.y);
    ctx.lineTo(this.peak.x, this.peak.y);
    ctx.lineTo(this.end.x, this.end.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Start circle
    ctx.fillStyle = colors.startCircle || '#7393b3';
    ctx.beginPath();
    ctx.arc(this.start.x, this.start.y, startRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Target rings at endpoint
    const target = this.getTargetPosition();
    const ringWidth = target.width || style.targetWidth || 22;
    const ringHeight = target.height || style.targetHeight || 200;
    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.rotate(target.angle);
    const numRings = targetRings.length;
    const sliceHeight = ringHeight / numRings;
    for (let i = 0; i < numRings; i++) {
      ctx.fillStyle = targetRings[i];
      ctx.fillRect(-ringWidth / 2, -ringHeight / 2 + sliceHeight * i, ringWidth, sliceHeight);
    }
    ctx.restore();

    ctx.restore();
  }
}

registerPath('vshape', VShapePath);
