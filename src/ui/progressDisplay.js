// src/ui/progressDisplay.js — Trial counter, timer, goal time

import { COLORS } from '../config/constants.js';

/**
 * Creates a progress display manager for HUD elements.
 * @returns {object}
 */
export function createProgressDisplay() {
  let timerEl = null;
  let roundEl = null;
  let goalTimeEl = null;

  function _ensureElements() {
    if (!timerEl) timerEl = document.getElementById('timer');
    if (!roundEl) roundEl = document.getElementById('round');
    if (!goalTimeEl) goalTimeEl = document.getElementById('goalTime');
  }

  /**
   * Update the round/movements remaining display.
   * @param {number} current — current movement number
   * @param {number} total — total movements in block
   */
  function updateRound(current, total) {
    _ensureElements();
    if (roundEl) {
      const movementsRemaining = Math.max(0, total - current);
      roundEl.textContent = `Movements Remaining: ${movementsRemaining}`;
    }
  }

  /**
   * Update the timer display with color coding.
   * @param {number} elapsedMs — elapsed time in milliseconds
   * @param {number} minTime — minimum goal time in ms
   * @param {number} maxTime — maximum goal time in ms
   */
  function updateTimer(elapsedMs, minTime, maxTime) {
    _ensureElements();
    if (!timerEl) return;

    const rounded = Math.round(elapsedMs);
    timerEl.textContent = `Your Movement Time: ${rounded} ms`;

    if (rounded >= minTime && rounded <= maxTime) {
      timerEl.style.color = COLORS.timerGood;
    } else {
      timerEl.style.color = COLORS.timerBad;
    }
  }

  /**
   * Update the goal time display.
   * @param {number} min — minimum goal time in ms
   * @param {number} max — maximum goal time in ms
   */
  function updateGoalTime(min, max) {
    _ensureElements();
    if (goalTimeEl) {
      goalTimeEl.textContent = `Your Goal Time: ${min} - ${max} ms`;
    }
  }

  /**
   * Show the HUD elements.
   */
  function show() {
    _ensureElements();
    if (timerEl) timerEl.style.display = '';
    if (roundEl) roundEl.style.display = '';
    if (goalTimeEl) goalTimeEl.style.display = '';
  }

  /**
   * Hide the HUD elements.
   */
  function hide() {
    _ensureElements();
    if (timerEl) timerEl.style.display = 'none';
    if (roundEl) roundEl.style.display = 'none';
    if (goalTimeEl) goalTimeEl.style.display = 'none';
  }

  return {
    updateRound,
    updateTimer,
    updateGoalTime,
    show,
    hide,
  };
}
