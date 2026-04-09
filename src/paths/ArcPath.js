// src/paths/ArcPath.js — Semicircular arc path implementation

import { distance, clamp, normalizeAngle } from '../utils/math.js';
import { registerPath } from './pathRegistry.js';

export class ArcPath {
  /**
   * @param {object} config
   * @param {number} config.centerX
   * @param {number} config.centerY
   * @param {number} config.radius
   * @param {number} [config.startAngle=Math.PI] — start angle in radians
   * @param {number} [config.endAngle=2*Math.PI] — end angle in radians
   * @param {number} [config.targetWidth=0] — target zone width for hit detection
   * @param {number} [config.targetHeight=0] — target zone height for hit detection
   */
  constructor({ centerX, centerY, radius, startAngle = Math.PI, endAngle = 2 * Math.PI, targetWidth = 0, targetHeight = 0 }) {
    this.cx = centerX;
    this.cy = centerY;
    this.radius = radius;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.targetWidth = targetWidth;
    this.targetHeight = targetHeight;
  }

  /**
   * Position on the ideal arc at normalized progress t.
   * @param {number} t — progress in [0, 1]
   * @returns {{x: number, y: number}}
   */
  getPointAtProgress(t) {
    const angle = this.startAngle + t * (this.endAngle - this.startAngle);
    return {
      x: this.cx + this.radius * Math.cos(angle),
      y: this.cy + this.radius * Math.sin(angle),
    };
  }

  /**
   * Perpendicular distance from a point to the nearest point on the arc.
   * @param {{x: number, y: number}} point
   * @returns {number}
   */
  getDistanceFromPath({ x, y }) {
    const dx = x - this.cx;
    const dy = y - this.cy;
    const distToCenter = Math.sqrt(dx * dx + dy * dy);
    const angle = normalizeAngle(Math.atan2(dy, dx));

    const normStart = normalizeAngle(this.startAngle);
    const normEnd = normalizeAngle(this.endAngle);

    if (this._isAngleInArcRange(angle, normStart, normEnd)) {
      return Math.abs(distToCenter - this.radius);
    }

    // Outside arc range — return distance to nearest endpoint
    const startPt = this.getPointAtProgress(0);
    const endPt = this.getPointAtProgress(1);
    return Math.min(
      distance(x, y, startPt.x, startPt.y),
      distance(x, y, endPt.x, endPt.y),
    );
  }

  /**
   * Check if an angle lies within the arc range (all normalized to [0, 2π)).
   * @param {number} angle
   * @param {number} normStart
   * @param {number} normEnd
   * @returns {boolean}
   */
  _isAngleInArcRange(angle, normStart, normEnd) {
    if (normStart <= normEnd) {
      return angle >= normStart && angle <= normEnd;
    }
    // Wraps around 0
    return angle >= normStart || angle <= normEnd;
  }

  /**
   * Project a point onto the arc, return its progress parameter.
   * @param {{x: number, y: number}} point
   * @returns {number} progress in [0, 1]
   */
  getProgressAtPoint({ x, y }) {
    const dx = x - this.cx;
    const dy = y - this.cy;
    let angle = Math.atan2(dy, dx);

    // Adjust angle to be in the arc's range
    const sweep = this.endAngle - this.startAngle;
    // Normalize angle relative to startAngle
    let relAngle = angle - this.startAngle;
    // Normalize to [0, 2π) if sweep is positive, or (-2π, 0] if negative
    if (sweep >= 0) {
      relAngle = ((relAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    } else {
      relAngle = ((relAngle % (2 * Math.PI)) - 2 * Math.PI) % (2 * Math.PI);
    }

    const t = relAngle / sweep;
    return clamp(t, 0, 1);
  }

  /**
   * Endpoint target zone geometry at the arc's end.
   * @returns {{x: number, y: number, width: number, height: number, angle: number}}
   */
  getTargetPosition() {
    const endPt = this.getPointAtProgress(1);
    return {
      x: endPt.x,
      y: endPt.y,
      width: this.targetWidth,
      height: this.targetHeight,
      angle: this.endAngle,
    };
  }

  /**
   * Total arc length.
   * @returns {number}
   */
  getTotalLength() {
    return this.radius * Math.abs(this.endAngle - this.startAngle);
  }

  /**
   * Draw the arc path on a canvas context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} style
   */
  draw(ctx, style) {
    const colors = style.colors || {};
    const startRadius = style.startCircleRadius || 14;
    const targetRings = colors.targetRings || [];

    ctx.save();

    // Draw dashed arc
    ctx.setLineDash([3, 6]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = colors.path || '#000';
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.radius, this.startAngle, this.endAngle);
    ctx.stroke();
    ctx.setLineDash([]);

    // Start circle at progress=0
    const startPt = this.getPointAtProgress(0);
    ctx.fillStyle = colors.startCircle || '#7393b3';
    ctx.beginPath();
    ctx.arc(startPt.x, startPt.y, startRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Target rings at progress=1
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

registerPath('arc', ArcPath);
