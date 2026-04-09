export const COLORS = {
  background: 'rgb(211, 211, 211)',
  startCircle: 'rgb(115, 147, 179)',
  countdown: { ready: 'rgb(255, 0, 0)', set: 'rgb(255, 255, 102)', go: 'rgb(0, 255, 0)' },
  timerGood: '#66FF99',
  timerBad: '#ff4545',
  targetRings: ['#ff4545', '#ffa535', '#ffe233', '#b8dd28', '#58e32c', '#b8dd28', '#ffe233', '#ffa535', '#ff4545'],
  accuracyScale: ['#58e32c', '#b8dd28', '#ffe233', '#ffa535', '#ff4545'],
};

export const DEFAULTS = {
  startCircleRadius: 14,
  targetWidth: 22,
  targetHeight: 200,
  cursorRadius: 5,
  holdDuration: 1000,
  scaleFactor: 2.4,
  maxAccuracyDistance: 100,
};
