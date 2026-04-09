// src/config/pathDefinitions.js — Maps path names to constructor params

import '../paths/ArcPath.js';
import '../paths/VShapePath.js';
import '../paths/LinePath.js';

// centerX/centerY (and startX/startY for lines) are injected at runtime
// by the engine based on canvas size, not stored in definitions.
export const pathDefinitions = {
  arc_default: {
    type: 'arc',
    params: { radius: 166, startAngle: Math.PI, endAngle: 2 * Math.PI },
  },
  vshape_default: {
    type: 'vshape',
    params: { halfWidth: 166, peakHeight: 166, angle: 0 },
  },
  line_horizontal: {
    type: 'line',
    params: { startX: -166, startY: 0, endX: 166, endY: 0 },
  },
};
