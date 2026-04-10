// src/rendering/canvasManager.js — DPI scaling, multi-layer canvas init

import { clamp } from '../utils/math.js';
import { DEFAULTS } from '../config/constants.js';

const LAYER_IDS = {
  main: 'mainCanvas',
  path: 'pathCanvas',
  mouse: 'mouseCanvas',
};

/**
 * Creates a canvas manager that handles DPI scaling and multi-layer canvas setup.
 * @param {string} containerId — ID of the container element holding canvases
 * @returns {object}
 */
export function createCanvasManager(containerId) {
  let container = null;
  const contexts = {};
  let width = 0;
  let height = 0;
  let dpr = 1;

  function initialize() {
    container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element "#${containerId}" not found.`);
    }

    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;

    for (const [layer, id] of Object.entries(LAYER_IDS)) {
      const canvas = document.getElementById(id);
      if (!canvas) {
        throw new Error(`Canvas element "#${id}" not found.`);
      }
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      contexts[layer] = ctx;
    }
  }

  function getContext(layer) {
    return contexts[layer] || null;
  }

  function getDimensions() {
    return {
      width,
      height,
      centerX: width / 2,
      centerY: height / 2,
    };
  }

  function clear(layer) {
    if (layer) {
      const ctx = contexts[layer];
      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
      }
    } else {
      for (const ctx of Object.values(contexts)) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
      }
    }
  }

  function handleResize() {
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;

    for (const [, ctx] of Object.entries(contexts)) {
      const canvas = ctx.canvas;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
  }

  return {
    initialize,
    getContext,
    getDimensions,
    clear,
    handleResize,
  };
}

/**
 * Creates a cursor manager using the Pointer Lock API for raw mouse input.
 * Tracks a virtual cursor position within canvas bounds.
 * @param {object} options
 * @param {number} [options.scaleFactor] — mouse movement multiplier
 * @param {number} [options.cursorRadius] — cursor circle radius
 * @returns {object}
 */
export function createCursorManager(options = {}) {
  const scaleFactor = options.scaleFactor ?? DEFAULTS.scaleFactor;
  const cursorRadius = options.cursorRadius ?? DEFAULTS.cursorRadius;

  let x = 0;
  let y = 0;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let locked = false;
  let paused = false;
  let _resumeResolve = null;
  let targetCanvas = null;
  const listeners = [];

  /** @type {((e: MouseEvent) => void) | null} */
  let mouseMoveHandler = null;
  /** @type {(() => void) | null} */
  let lockChangeHandler = null;
  let onLockLost = null;

  function _onMouseMove(e) {
    x += e.movementX * scaleFactor;
    y += e.movementY * scaleFactor;
    x = clamp(x, 0, canvasWidth);
    y = clamp(y, 0, canvasHeight);

    for (const cb of listeners) {
      cb({ x, y, movementX: e.movementX, movementY: e.movementY });
    }
  }

  function _onLockChange() {
    if (document.pointerLockElement === targetCanvas) {
      locked = true;
      mouseMoveHandler = _onMouseMove;
      document.addEventListener('mousemove', mouseMoveHandler);
    } else {
      locked = false;
      paused = true;
      if (mouseMoveHandler) {
        document.removeEventListener('mousemove', mouseMoveHandler);
        mouseMoveHandler = null;
      }
      if (onLockLost) {
        onLockLost();
      }
    }
  }

  /**
   * Request pointer lock on a canvas element.
   * @param {HTMLCanvasElement} canvas
   * @param {object} [lockOptions]
   * @param {boolean} [lockOptions.unadjustedMovement=true]
   * @returns {Promise<void>}
   */
  function requestPointerLock(canvas, lockOptions = { unadjustedMovement: true }) {
    targetCanvas = canvas;
    canvasWidth = canvas.offsetWidth || canvas.width;
    canvasHeight = canvas.offsetHeight || canvas.height;

    if (!('requestPointerLock' in canvas)) {
      console.warn('Pointer Lock API not available. Using degraded cursor handling.');
      return Promise.resolve();
    }

    // Remove any previously registered handler to avoid duplicate listeners.
    if (lockChangeHandler) {
      document.removeEventListener('pointerlockchange', lockChangeHandler);
      lockChangeHandler = null;
    }

    return new Promise((resolve, reject) => {
      lockChangeHandler = () => {
        _onLockChange();
        if (document.pointerLockElement === canvas) {
          resolve();
        }
      };

      const errorHandler = () => {
        reject(new Error('Pointer lock request failed.'));
      };

      document.addEventListener('pointerlockchange', lockChangeHandler);
      document.addEventListener('pointerlockerror', errorHandler, { once: true });

      try {
        const result = canvas.requestPointerLock(lockOptions);
        // Some browsers return a promise
        if (result && typeof result.catch === 'function') {
          result.catch((err) => {
            // Fallback without unadjustedMovement
            console.warn('unadjustedMovement not supported, retrying without it.');
            canvas.requestPointerLock();
          });
        }
      } catch {
        canvas.requestPointerLock();
      }
    });
  }

  function releasePointerLock() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    if (lockChangeHandler) {
      document.removeEventListener('pointerlockchange', lockChangeHandler);
      lockChangeHandler = null;
    }
    if (mouseMoveHandler) {
      document.removeEventListener('mousemove', mouseMoveHandler);
      mouseMoveHandler = null;
    }
    locked = false;
  }

  function getCursorPosition() {
    return { x, y };
  }

  function resetCursorPosition(newX, newY) {
    x = canvasWidth > 0 ? clamp(newX, 0, canvasWidth) : newX;
    y = canvasHeight > 0 ? clamp(newY, 0, canvasHeight) : newY;
  }

  function setCanvasBounds(w, h) {
    canvasWidth = w;
    canvasHeight = h;
  }

  /**
   * Draw the custom cursor on the mouse layer context.
   * Synchronous — intended to be called once per render frame by the game loop.
   * @param {CanvasRenderingContext2D} mouseCtx
   */
  function drawCursor(mouseCtx) {
    const canvas = mouseCtx.canvas;

    mouseCtx.save();
    mouseCtx.setTransform(1, 0, 0, 1, 0, 0);
    mouseCtx.clearRect(0, 0, canvas.width, canvas.height);
    mouseCtx.restore();

    mouseCtx.fillStyle = 'white';
    mouseCtx.strokeStyle = 'black';
    mouseCtx.lineWidth = 2;
    mouseCtx.beginPath();
    mouseCtx.arc(x, y, cursorRadius, 0, 2 * Math.PI, true);
    mouseCtx.fill();
    mouseCtx.stroke();
  }

  /**
   * Register a callback for cursor position updates.
   * @param {function} callback — receives {x, y, movementX, movementY}
   * @returns {function} unsubscribe function
   */
  function onCursorMove(callback) {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }

  /**
   * Set a callback invoked when pointer lock is lost.
   * @param {function} callback
   */
  function setOnLockLost(callback) {
    onLockLost = callback;
  }

  function isLocked() {
    return locked;
  }

  function isPaused() { return paused; }

  function waitForResume() {
    if (!paused) return Promise.resolve();
    return new Promise(resolve => { _resumeResolve = resolve; });
  }
  
  function resume() {
    paused = false;
    if (_resumeResolve) {
      _resumeResolve();
      _resumeResolve = null;
    }
  }

  return {
    requestPointerLock,
    releasePointerLock,
    getCursorPosition,
    resetCursorPosition,
    setCanvasBounds,
    drawCursor,
    onCursorMove,
    setOnLockLost,
    isLocked,
    resume,
    isPaused,
    waitForResume,
  };
}
