// src/rendering/drawFeedback.js — Accuracy visualization, color-coded trail

import { COLORS } from '../config/constants.js';

/**
 * 5-stop color scale for accuracy visualization.
 * Maps a value 0–100 to a color from green (100) to red (0).
 * Stops: ['#58e32c', '#b8dd28', '#ffe233', '#ffa535', '#ff4545']
 */
const COLOR_STOPS = COLORS.accuracyScale;

/**
 * Parse a hex color string to {r, g, b}.
 * @param {string} hex — e.g. '#ff4545'
 * @returns {{r: number, g: number, b: number}}
 */
function parseHex(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/**
 * Convert {r, g, b} to hex string.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
function toHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    clamp(r).toString(16).padStart(2, '0') +
    clamp(g).toString(16).padStart(2, '0') +
    clamp(b).toString(16).padStart(2, '0')
  );
}

/**
 * Get a color from the 5-stop accuracy scale.
 * @param {number} value — 0 (worst/red) to 100 (best/green)
 * @returns {string} hex color
 */
export function getAccuracyColor(value) {
  // Clamp to [0, 100]
  const v = Math.max(0, Math.min(100, value));

  // Map value to a position in the stops array.
  // domain is [100, 0] → index [0, stops.length - 1]
  // So value 100 → index 0 (green), value 0 → index 4 (red)
  const numStops = COLOR_STOPS.length;
  const t = ((100 - v) / 100) * (numStops - 1);
  const idx = Math.floor(t);
  const frac = t - idx;

  if (idx >= numStops - 1) return COLOR_STOPS[numStops - 1];

  const c1 = parseHex(COLOR_STOPS[idx]);
  const c2 = parseHex(COLOR_STOPS[idx + 1]);

  return toHex(
    c1.r + frac * (c2.r - c1.r),
    c1.g + frac * (c2.g - c1.g),
    c1.b + frac * (c2.b - c1.b),
  );
}

/**
 * Draw color-coded accuracy trail on the path canvas.
 * Each point is colored based on its distance from the ideal path.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x: number, y: number}>} points — cursor positions
 * @param {object} path — path instance with getDistanceFromPath()
 * @param {function} [colorScale] — optional custom color function (value 0-100) → hex
 */
export function drawAccuracyTrail(ctx, points, path, colorScale) {
  const getColor = colorScale || getAccuracyColor;

  for (const point of points) {
    const dist = path.getDistanceFromPath(point);
    // Map distance to accuracy: 0 distance = 100 accuracy, ≥100 distance = 0 accuracy
    const accuracy = Math.max(0, 100 - dist);

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.fillStyle = getColor(accuracy);
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * Draw the pace dot (green circle) on the path canvas.
 * Clears the path canvas first, then draws the dot and optional trail.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x: number, y: number}} position — current pace dot position
 * @param {Array<{x: number, y: number}>} [trail] — optional trail of previous positions
 */
export function drawPaceDot(ctx, position, trail) {
  const canvas = ctx.canvas;

  // Clear the path canvas
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Draw trail if provided
  if (trail && trail.length > 1) {
    ctx.strokeStyle = 'rgba(0, 200, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i++) {
      ctx.lineTo(trail[i].x, trail[i].y);
    }
    ctx.stroke();
  }

  // Draw pace dot
  ctx.fillStyle = '#00cc00';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(position.x, position.y, 6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
}

/**
 * Draw a green outline around the target rectangle when hit.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x: number, y: number, width: number, height: number, angle: number}} target
 */
export function drawTargetHit(ctx, target) {
  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.rotate(target.angle || 0);
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 3;
  ctx.strokeRect(-target.width / 2, -target.height / 2, target.width, target.height);
  ctx.restore();
}
