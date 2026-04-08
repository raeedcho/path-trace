// src/config/pathDefinitions.js — Maps path names to constructor params

const pathDefinitions = {
  arc_default: {
    type: 'arc',
    params: { radius: 200, startAngle: Math.PI, endAngle: 0 },
  },
  line_horizontal: {
    type: 'line',
    params: { length: 400, angle: 0 },
  },
  vshape_default: {
    type: 'vshape',
    params: { armLength: 200, angle: Math.PI / 3 },
  },
};

export default pathDefinitions;

export function getPathNames() {
  return Object.keys(pathDefinitions);
}
