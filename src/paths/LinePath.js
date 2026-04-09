// src/paths/LinePath.js — Straight line path implementation

import { distance, lerp, lineToPoint } from '../utils/math.js';
import { registerPath } from './pathRegistry.js';

export class LinePath {
  /**
   * @param {object} config
   * @param {number} config.centerX — canvas X coordinate of the path center
   * @param {number} config.centerY — canvas Y coordinate of the path center
   * @param {number} config.offsetX — start point X offset from center
   * @param {number} config.offsetY — start point Y offset from center
   * @param {number} config.endOffsetX — end point X offset from center
   * @param {number} config.endOffsetY — end point Y offset from center
   * @param {number} [config.targetWidth=0] — target zone width for hit detection
   * @param {number} [config.targetHeight=0] — target zone height for hit detection
   */
  constructor({ centerX, centerY, offsetX, offsetY, endOffsetX, endOffsetY, targetWidth = 0, targetHeight = 0 }) {
    this.startX = centerX + offsetX;
    this.startY = centerY + offsetY;
    this.endX = centerX + endOffsetX;
    this.endY = centerY + endOffsetY;
    this.targetWidth = targetWidth;
    this.targetHeight = targetHeight;
  }

  /**
   * Position on the ideal path at normalized progress t.
   * @param {number} t — progress in [0, 1]
   * @returns {{x: number, y: number}}
   */
  getPointAtProgress(t) {
    return {
      x: lerp(this.startX, this.endX, t),
      y: lerp(this.startY, this.endY, t),
    };
  }

  /**
   * Perpendicular distance from a point to the path.
   * @param {{x: number, y: number}} point
   * @returns {number}
   */
  getDistanceFromPath({ x, y }) {
    return lineToPoint(this.startX, this.startY, this.endX, this.endY, x, y);
  }

  /**
   * Project a point onto the path, return its progress parameter.
   * @param {{x: number, y: number}} point
   * @returns {number} progress in [0, 1]
   */
  getProgressAtPoint({ x, y }) {
    const dx = this.endX - this.startX;
    const dy = this.endY - this.startY;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return 0;
    const t = ((x - this.startX) * dx + (y - this.startY) * dy) / lenSq;
    return Math.max(0, Math.min(1, t));
  }

  /**
   * Endpoint target zone geometry.
   * @returns {{x: number, y: number, width: number, height: number, angle: number}}
   */
  getTargetPosition() {
    const angle = Math.atan2(this.endY - this.startY, this.endX - this.startX);
    return { x: this.endX, y: this.endY, width: this.targetWidth, height: this.targetHeight, angle };
  }

  /**
   * Total path length.
   * @returns {number}
   */
  getTotalLength() {
    return distance(this.startX, this.startY, this.endX, this.endY);
  }

  /**
   * Draw the path on a canvas context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} style
   */
  draw(ctx, style) {
    const colors = style.colors || {};
    const startRadius = style.startCircleRadius || 14;
    const targetRings = colors.targetRings || [];

    // Draw dashed line
    ctx.save();
    ctx.setLineDash([3, 6]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = colors.path || '#000';
    ctx.beginPath();
    ctx.moveTo(this.startX, this.startY);
    ctx.lineTo(this.endX, this.endY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Start circle
    ctx.fillStyle = colors.startCircle || '#7393b3';
    ctx.beginPath();
    ctx.arc(this.startX, this.startY, startRadius, 0, 2 * Math.PI);
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

registerPath('line', LinePath);
