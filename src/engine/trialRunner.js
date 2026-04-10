// src/engine/trialRunner.js — Runs one trial lifecycle

import { createPath } from '../paths/pathRegistry.js';
import { pathDefinitions } from '../config/pathDefinitions.js';
import { COLORS, DEFAULTS } from '../config/constants.js';
import { createStateMachine } from './stateMachine.js';
import { createGameLoop } from '../rendering/gameLoop.js';
import { drawPaceDot, drawAccuracyTrail, drawTargetHit } from '../rendering/drawFeedback.js';
import { distance, clamp } from '../utils/math.js';
import { wait, createTimer } from '../utils/timing.js';

/**
 * Compute RMSE of points from a straight line between first and last point.
 * Replicates legacy lineStraightness check.
 * @param {Array<{x: number, y: number}>} points
 * @returns {number} RMSE
 */
function lineStraightness(points) {
  if (points.length < 2) return Infinity;
  const start = points[0];
  const end = points[points.length - 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return 0;

  let sumSqDist = 0;
  for (const p of points) {
    const t = ((p.x - start.x) * dx + (p.y - start.y) * dy) / lenSq;
    const closestX = start.x + t * dx;
    const closestY = start.y + t * dy;
    const dist = (p.x - closestX) ** 2 + (p.y - closestY) ** 2;
    sumSqDist += dist;
  }
  return Math.sqrt(sumSqDist / points.length);
}

/**
 * Check if a point is inside a rotated rectangle.
 * Replicates the legacy isMouseOnTarget point-in-polygon check.
 * @param {number} px
 * @param {number} py
 * @param {{x: number, y: number, width: number, height: number, angle: number}} target
 * @returns {boolean}
 */
function isPointInTarget(px, py, target) {
  const cos = Math.cos(target.angle);
  const sin = Math.sin(target.angle);
  const hw = target.width / 2;
  const hh = target.height / 2;

  // Transform point into target's local space
  const localX = (px - target.x) * cos + (py - target.y) * sin;
  const localY = -(px - target.x) * sin + (py - target.y) * cos;

  return Math.abs(localX) <= hw && Math.abs(localY) <= hh;
}

/**
 * Check if a line segment from prev to current crosses the target rectangle.
 * Replicates the legacy crossedAnyEdge check.
 * @param {number} prevX
 * @param {number} prevY
 * @param {number} currX
 * @param {number} currY
 * @param {{x: number, y: number, width: number, height: number, angle: number}} target
 * @returns {boolean}
 */
function lineIntersectsTarget(prevX, prevY, currX, currY, target) {
  const cos = Math.cos(target.angle);
  const sin = Math.sin(target.angle);
  const hw = target.width / 2;
  const hh = target.height / 2;

  const corners = [
    { x: target.x + (-hw) * cos - (-hh) * sin, y: target.y + (-hw) * sin + (-hh) * cos },
    { x: target.x + (hw) * cos - (-hh) * sin, y: target.y + (hw) * sin + (-hh) * cos },
    { x: target.x + (hw) * cos - (hh) * sin, y: target.y + (hw) * sin + (hh) * cos },
    { x: target.x + (-hw) * cos - (hh) * sin, y: target.y + (-hw) * sin + (hh) * cos },
  ];

  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    if (_segmentsIntersect(prevX, prevY, currX, currY, corners[i].x, corners[i].y, corners[j].x, corners[j].y)) {
      return true;
    }
  }
  return false;
}

function _segmentsIntersect(a, b, c, d, p, q, r, s) {
  const det = (c - a) * (s - q) - (r - p) * (d - b);
  if (det === 0) return false;
  const lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
  const gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
  return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
}

/**
 * Check if the cursor is on the target (either inside or crossed an edge).
 * @param {number} currX
 * @param {number} currY
 * @param {number} prevX
 * @param {number} prevY
 * @param {{x: number, y: number, width: number, height: number, angle: number}} target
 * @returns {boolean}
 */
function isMouseOnTarget(currX, currY, prevX, prevY, target) {
  return isPointInTarget(currX, currY, target) ||
    lineIntersectsTarget(prevX, prevY, currX, currY, target);
}

/**
 * Compute movement accuracy as an average percentage (0–100) based on distance from path.
 * @param {Array<{x: number, y: number}>} canvasPoints — points in canvas coords
 * @param {object} path — path instance with getDistanceFromPath()
 * @returns {number}
 */
function computeAccuracy(canvasPoints, path) {
  if (canvasPoints.length === 0) return 0;
  const maxDist = DEFAULTS.maxAccuracyDistance;
  let totalAcc = 0;
  for (const p of canvasPoints) {
    const dist = path.getDistanceFromPath(p);
    totalAcc += Math.max(0, (maxDist - dist) / maxDist * 100);
  }
  return parseFloat((totalAcc / canvasPoints.length).toFixed(2));
}

/**
 * Compute timing accuracy matching legacy formula:
 * timingAccuracy = 50 * (1 + (1 - (3 * |time - mean| / (max - min))))
 * @param {number} timeMs — elapsed time in ms
 * @param {number} minTime — min goal time in ms
 * @param {number} maxTime — max goal time in ms
 * @returns {number}
 */
function computeTimingAccuracy(timeMs, minTime, maxTime) {
  const mean = (minTime + maxTime) / 2;
  return 50 * (1 + (1 - (3 * Math.abs(timeMs - mean) / (maxTime - minTime))));
}

/**
 * Creates a trial runner that orchestrates one trial's lifecycle.
 * @param {object} deps
 * @returns {object}
 */
export function createTrialRunner({ canvasManager, audioManager, overlayManager, progressDisplay, cursorManager, dataManager, config }) {

  /**
   * Run a single trial stage (one path from hold → trace → feedback).
   * @param {object} path — path instance
   * @param {object} trialConfig — trial configuration
   * @param {{x: number, y: number}} startPos — path start position
   * @param {object} target — target position/geometry
   * @param {object} stateMachine
   * @returns {Promise<{points: Array, time: number, accuracy: number, timingAccuracy: number, completed: boolean}>}
   */
  async function runStage(path, trialConfig, startPos, target, stateMachine) {
    const { centerX, centerY } = canvasManager.getDimensions();
    const minTime = trialConfig.speedTier.min;
    const maxTime = trialConfig.speedTier.max;
    const meanTime = (minTime + maxTime) / 2;
    // toneInterval from config; null means auto-scale to meanTime (matches original countdown rhythm)
    const toneInterval = config.countdown.toneInterval ?? meanTime;
    const holdDuration = config.countdown.holdDuration;

    // --- HOLD + COUNTDOWN (looped until countdown completes without abort) ---
    const tones = config.countdown.tones;
    const mainCtx = canvasManager.getContext('main');
    const mouseCtx = canvasManager.getContext('mouse');

    // Lightweight cursor-rendering loop for hold/countdown phases.
    // The main game loop only runs during tracing, but pointer lock hides the
    // system cursor immediately, so participants would see nothing without this.
    const cursorLoop = createGameLoop(
      () => {}, // no update logic — cursor position is handled by onCursorMove
      () => { cursorManager.drawCursor(mouseCtx); },
    );
    cursorLoop.start();

    let countdownCompleted = false;
    while (!countdownCompleted) {
      // --- HOLD PHASE ---
      stateMachine.send('BEGIN');

      await new Promise((resolve) => {
        let holdTimer = null;

        const checkHold = () => {
          const pos = cursorManager.getCursorPosition();
          const dist = distance(pos.x, pos.y, startPos.x, startPos.y);
          if (dist <= DEFAULTS.startCircleRadius) {
            if (holdTimer === null) {
              holdTimer = setTimeout(() => {
                unsubscribe();
                resolve();
              }, holdDuration);
            }
          } else {
            if (holdTimer !== null) {
              clearTimeout(holdTimer);
              holdTimer = null;
            }
          }
        };

        const unsubscribe = cursorManager.onCursorMove(checkHold);
        // Also check immediately in case cursor is already in position
        checkHold();
      });

      stateMachine.send('HOLD_COMPLETE');

      // --- COUNTDOWN PHASE ---
      let aborted = false;

      for (let i = 0; i < tones.length; i++) {
        const tone = tones[i];
        // Resolve color from dot-path notation like 'countdown.ready'
        const colorParts = tone.color.split('.');
        let color = COLORS;
        for (const part of colorParts) {
          color = color?.[part];
        }

        // Draw colored start circle
        mainCtx.fillStyle = color || '#fff';
        mainCtx.beginPath();
        mainCtx.arc(startPos.x, startPos.y, DEFAULTS.startCircleRadius, 0, 2 * Math.PI);
        mainCtx.fill();
        mainCtx.strokeStyle = '#000';
        mainCtx.lineWidth = 1;
        mainCtx.stroke();

        audioManager.playDefaultTone(tone.sound);

        // Wait between tones (except after the final "go" tone)
        if (i < tones.length - 1) {
          await wait(toneInterval);

          const pos = cursorManager.getCursorPosition();
          const dist = distance(pos.x, pos.y, startPos.x, startPos.y);
          if (dist > DEFAULTS.startCircleRadius) {
            // Cursor left during countdown — abort and restart hold
            stateMachine.send('HOLD_BROKEN');
            // Redraw the start circle in its default color
            mainCtx.fillStyle = COLORS.startCircle;
            mainCtx.beginPath();
            mainCtx.arc(startPos.x, startPos.y, DEFAULTS.startCircleRadius, 0, 2 * Math.PI);
            mainCtx.fill();
            mainCtx.strokeStyle = '#000';
            mainCtx.lineWidth = 1;
            mainCtx.stroke();
            aborted = true;
            break;
          }
        }
      }

      if (!aborted) {
        countdownCompleted = true;
        stateMachine.send('COUNTDOWN_DONE');
      }
    }

    // --- TRACING PHASE ---
    const points = [];
    const canvasPoints = [];
    const timer = createTimer();
    timer.start();
    let soundPlayed = false;
    let prevCursorX = cursorManager.getCursorPosition().x;
    let prevCursorY = cursorManager.getCursorPosition().y;
    let hitTarget = false;
    let elapsedAtEnd = 0;

    const pathCtx = canvasManager.getContext('path');

    // Max tracing duration before a TIMEOUT is sent (prevents indefinite hang)
    const maxTracingTime = maxTime * (config.tracing?.maxDurationMultiplier ?? 3);

    // Hand off cursor rendering to the main game loop
    cursorLoop.stop();

    await new Promise((resolve) => {
      // Declared before createGameLoop so the closure can reference it via clearTimeout
      let tracingTimeoutId = null;

      const loop = createGameLoop(
        (deltaTime) => {
          const elapsed = timer.elapsed();
          const pos = cursorManager.getCursorPosition();

          // Record in original coordinate convention: x relative to center, y inverted
          points.push({
            x: pos.x - centerX,
            y: centerY - pos.y,
            t: elapsed,
          });

          canvasPoints.push({ x: pos.x, y: pos.y });

          const progress = elapsed / meanTime;

          // Update pace dot
          const pacePos = path.getPointAtProgress(clamp(progress, 0, 1));
          drawPaceDot(pathCtx, pacePos);

          // Update timer display
          progressDisplay.updateTimer(elapsed, minTime, maxTime);

          // Play mean time beep
          if (!soundPlayed && elapsed >= meanTime) {
            audioManager.playDefaultTone('mean');
            soundPlayed = true;
          }

          // Check target hit
          if (isMouseOnTarget(pos.x, pos.y, prevCursorX, prevCursorY, target)) {
            hitTarget = true;
            elapsedAtEnd = elapsed;
            // Ensure mean beep plays even on an early hit
            if (!soundPlayed) {
              audioManager.playDefaultTone('mean');
              soundPlayed = true;
            }
            clearTimeout(tracingTimeoutId);
            loop.stop();
            drawTargetHit(pathCtx, target);
            stateMachine.send('TARGET_HIT');
            resolve();
          }

          prevCursorX = pos.x;
          prevCursorY = pos.y;
        },
        () => {
          // Render: draw cursor on mouse layer
          cursorManager.drawCursor(mouseCtx);
        },
      );

      // Timeout guard: if participant never reaches the target, end tracing after maxTracingTime
      tracingTimeoutId = setTimeout(() => {
        elapsedAtEnd = timer.elapsed();
        if (!soundPlayed) {
          audioManager.playDefaultTone('mean');
          soundPlayed = true;
        }
        loop.stop();
        stateMachine.send('TIMEOUT');
        resolve();
      }, maxTracingTime);

      loop.start();
    });

    const finalElapsed = elapsedAtEnd || timer.elapsed();
    const finalElapsedSec = parseFloat((finalElapsed / 1000).toFixed(3));
    const wasOnTime = finalElapsed >= minTime && finalElapsed <= maxTime;

    // Compute accuracies
    const accuracy = computeAccuracy(canvasPoints, path);
    const timingAcc = computeTimingAccuracy(finalElapsed, minTime, maxTime);

    // --- FEEDBACK PHASE ---
    if (trialConfig.showFeedback) {
      const straightness = lineStraightness(points.map(p => ({ x: p.x, y: p.y })));
      const threshold = config.feedback.straightLineThreshold;

      if (straightness <= threshold) {
        await overlayManager.showTimed(
          'feedback-overlay',
          `<p>${config.feedback.straightLineMessage} ${config.feedback.straightLinePenalty / 1000}s timeout penalty</p>`,
          config.feedback.straightLinePenalty,
        );
      } else if (finalElapsed < minTime) {
        await overlayManager.showTimed(
          'feedback-overlay',
          `<p>${config.feedback.tooFastMessage} ${config.feedback.tooFastPenalty / 1000}s timeout penalty</p>`,
          config.feedback.tooFastPenalty,
        );
      } else if (finalElapsed > maxTime) {
        await overlayManager.showTimed(
          'feedback-overlay',
          `<p>${config.feedback.tooSlowMessage} ${config.feedback.tooSlowPenalty / 1000}s timeout penalty</p>`,
          config.feedback.tooSlowPenalty,
        );
      } else {
        // Good trial — optionally show accuracy trail briefly
        drawAccuracyTrail(pathCtx, canvasPoints, path);
        await wait(config.feedback.accuracyTrailDuration);
      }
    }

    stateMachine.send('FEEDBACK_DONE');

    return {
      points,
      time: finalElapsedSec,
      accuracy,
      timingAccuracy: timingAcc,
      completed: wasOnTime,
    };
  }

  /**
   * Run one complete trial (possibly multiple stages).
   * @param {object} trialConfig — trial configuration from sequence
   * @returns {Promise<object>} trial result
   */
  async function runTrial(trialConfig) {
    const { centerX, centerY } = canvasManager.getDimensions();
    const stateMachine = createStateMachine(config.trialFlow);

    const stages = trialConfig.stages
      ? trialConfig.stages
      : [{ path: trialConfig.path }];

    const allPoints = [];
    let totalTime = 0;
    let totalAccuracy = 0;
    let totalTimingAccuracy = 0;
    let allCompleted = true;

    for (let si = 0; si < stages.length; si++) {
      const stageDef = stages[si];
      const pathName = stageDef.path;
      const pathDef = pathDefinitions[pathName];

      if (!pathDef) {
        throw new Error(`Unknown path: "${pathName}"`);
      }

      const path = createPath(pathDef.type, {
        centerX,
        centerY,
        ...pathDef.params,
        targetWidth: DEFAULTS.targetWidth,
        targetHeight: DEFAULTS.targetHeight,
      });

      // Clear canvases and draw static scene
      canvasManager.clear();

      const mainCtx = canvasManager.getContext('main');
      mainCtx.fillStyle = COLORS.background;
      mainCtx.fillRect(0, 0, canvasManager.getDimensions().width, canvasManager.getDimensions().height);

      path.draw(mainCtx, {
        colors: {
          startCircle: COLORS.startCircle,
          targetRings: COLORS.targetRings,
          path: '#000',
        },
        startCircleRadius: DEFAULTS.startCircleRadius,
        targetWidth: DEFAULTS.targetWidth,
        targetHeight: DEFAULTS.targetHeight,
      });

      const startPos = path.getPointAtProgress(0);
      const target = path.getTargetPosition();

      // Reset cursor to start position
      cursorManager.resetCursorPosition(centerX, centerY);

      // Update HUD
      progressDisplay.updateGoalTime(trialConfig.speedTier.min, trialConfig.speedTier.max);

      if (stateMachine.matches('IDLE')) {
        // First stage — start normally
      } else {
        // Multi-stage: send NEXT_STAGE to go to RETURN_TO_START, then RETURNED to go back to HOLD
        stateMachine.send('NEXT_STAGE');
        stateMachine.send('RETURNED');
      }

      const result = await runStage(path, trialConfig, startPos, target, stateMachine);

      allPoints.push(...result.points);
      totalTime += result.time;
      totalAccuracy += result.accuracy;
      totalTimingAccuracy += result.timingAccuracy;
      if (!result.completed) allCompleted = false;

      // Stage check
      if (si < stages.length - 1) {
        // More stages to come — handled at loop top
      } else {
        stateMachine.send('TRIAL_COMPLETE');
      }
    }

    const avgAccuracy = stages.length > 0 ? totalAccuracy / stages.length : 0;
    const avgTimingAccuracy = stages.length > 0 ? totalTimingAccuracy / stages.length : 0;

    const trialResult = {
      globalIndex: trialConfig.globalIndex,
      blockId: trialConfig.blockId,
      path: trialConfig.path || trialConfig.stages?.map(s => s.path).join('+'),
      speedTier: trialConfig.speedTier,
      points: allPoints,
      time: totalTime,
      movementAccuracy: avgAccuracy,
      timingAccuracy: avgTimingAccuracy,
      completed: allCompleted,
    };

    await dataManager.saveTrial(trialResult);

    return trialResult;
  }

  return { runTrial };
}
