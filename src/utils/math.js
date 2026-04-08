/**
 * Euclidean distance between two points.
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Clamp a number to a range.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between a and b.
 * @param {number} a
 * @param {number} b
 * @param {number} t — interpolation factor in [0, 1]
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Shortest distance from a point (px, py) to a line segment (x1,y1)→(x2,y2).
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} px
 * @param {number} py
 * @returns {number}
 */
export function lineToPoint(x1, y1, x2, y2, px, py) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Parameter t that minimizes the distance
  let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);

  // Clamp t to [0, 1] to keep projection within the segment
  t = Math.max(0, Math.min(1, t));

  // Closest point on the segment
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  // Distance from point to closest point
  const distX = px - closestX;
  const distY = py - closestY;

  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * Normalize an angle in radians to [0, 2π).
 * @param {number} angle — angle in radians
 * @returns {number}
 */
export function normalizeAngle(angle) {
  const twoPi = 2 * Math.PI;
  return ((angle % twoPi) + twoPi) % twoPi;
}
