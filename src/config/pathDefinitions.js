// src/config/pathDefinitions.js — Maps path names to constructor params

import '../paths/ArcPath.js';
import '../paths/VShapePath.js';
import '../paths/LinePath.js';

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
    params: { offsetX: -166, offsetY: 0, endOffsetX: 166, endOffsetY: 0 },
  },
};
