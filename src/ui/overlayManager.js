// src/ui/overlayManager.js — Instruction/break screens

/**
 * Creates an overlay manager for showing/hiding UI overlays.
 * @returns {object}
 */
export function createOverlayManager() {
  /**
   * Show an overlay div by ID.
   * @param {string} overlayId — DOM element ID
   * @param {string} [content] — optional innerHTML to set
   */
  function show(overlayId, content) {
    const el = document.getElementById(overlayId);
    if (!el) {
      console.warn(`Overlay "#${overlayId}" not found.`);
      return;
    }
    if (content !== undefined) {
      el.innerHTML = content;
    }
    el.style.display = 'flex';
  }

  /**
   * Hide an overlay div by ID.
   * @param {string} overlayId — DOM element ID
   */
  function hide(overlayId) {
    const el = document.getElementById(overlayId);
    if (!el) {
      console.warn(`Overlay "#${overlayId}" not found.`);
      return;
    }
    el.style.display = 'none';
  }

  /**
   * Show an overlay for a specified duration, then hide it.
   * @param {string} overlayId
   * @param {string} [content]
   * @param {number} durationMs — milliseconds to display
   * @returns {Promise<void>}
   */
  function showTimed(overlayId, content, durationMs) {
    show(overlayId, content);
    return new Promise((resolve) => {
      setTimeout(() => {
        hide(overlayId);
        resolve();
      }, durationMs);
    });
  }

  /**
   * Show an overlay and wait for a specific keypress.
   * @param {string} overlayId
   * @param {string} key — key name to wait for (e.g. ' ' for space)
   * @returns {Promise<void>}
   */
  function waitForKeypress(overlayId, key) {
    const el = document.getElementById(overlayId);
    if (!el) {
      console.warn(`Overlay "#${overlayId}" not found.`);
      return Promise.resolve();
    }
    show(overlayId);
    return new Promise((resolve) => {
      function handler(e) {
        if (e.key === key) {
          document.removeEventListener('keydown', handler);
          hide(overlayId);
          resolve();
        }
      }
      document.addEventListener('keydown', handler);
    });
  }

  /**
   * Show a countdown timer that updates every second.
   * @param {string} overlayId
   * @param {number} seconds — countdown start
   * @returns {Promise<void>}
   */
  function showCountdown(overlayId, seconds) {
    const el = document.getElementById(overlayId);
    if (!el) {
      console.warn(`Overlay "#${overlayId}" not found.`);
      return Promise.resolve();
    }

    if (seconds <= 0) {
      return Promise.resolve();
    }

    let remaining = seconds;
    el.innerHTML = `<h1>${remaining}</h1>`;
    el.style.display = 'flex';

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(interval);
          el.style.display = 'none';
          resolve();
        } else {
          el.innerHTML = `<h1>${remaining}</h1>`;
        }
      }, 1000);
    });
  }

  return {
    show,
    hide,
    showTimed,
    waitForKeypress,
    showCountdown,
  };
}
