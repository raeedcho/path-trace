// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCanvasManager, createCursorManager } from '../src/rendering/canvasManager.js';

function mockCanvasContext() {
  return {
    scale: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    canvas: null,
  };
}

describe('createCanvasManager', () => {
  beforeEach(() => {
    const ctxMap = new Map();

    document.body.innerHTML = `
      <div id="canvas-wrapper">
        <canvas id="mainCanvas"></canvas>
        <canvas id="pathCanvas"></canvas>
        <canvas id="mouseCanvas"></canvas>
      </div>
    `;

    // Mock getContext for each canvas
    for (const id of ['mainCanvas', 'pathCanvas', 'mouseCanvas']) {
      const canvas = document.getElementById(id);
      const ctx = mockCanvasContext();
      ctx.canvas = canvas;
      ctxMap.set(id, ctx);
      canvas.getContext = vi.fn(() => ctx);
    }

    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true, configurable: true });
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, writable: true, configurable: true });
  });

  it('initializes without error when container exists', () => {
    const cm = createCanvasManager('canvas-wrapper');
    expect(() => cm.initialize()).not.toThrow();
  });

  it('throws when container is not found', () => {
    const cm = createCanvasManager('nonexistent');
    expect(() => cm.initialize()).toThrow('Container element "#nonexistent" not found.');
  });

  it('throws when a canvas is missing', () => {
    document.getElementById('mainCanvas').remove();
    const cm = createCanvasManager('canvas-wrapper');
    expect(() => cm.initialize()).toThrow('Canvas element "#mainCanvas" not found.');
  });

  it('sets canvas dimensions scaled by devicePixelRatio', () => {
    const cm = createCanvasManager('canvas-wrapper');
    cm.initialize();

    const mainCanvas = document.getElementById('mainCanvas');
    expect(mainCanvas.width).toBe(1600);  // 800 * 2
    expect(mainCanvas.height).toBe(1200); // 600 * 2
  });

  it('getContext returns 2D contexts for each layer', () => {
    const cm = createCanvasManager('canvas-wrapper');
    cm.initialize();

    expect(cm.getContext('main')).toBeTruthy();
    expect(cm.getContext('path')).toBeTruthy();
    expect(cm.getContext('mouse')).toBeTruthy();
    expect(cm.getContext('nonexistent')).toBeNull();
  });

  it('getDimensions returns CSS pixel dimensions', () => {
    const cm = createCanvasManager('canvas-wrapper');
    cm.initialize();

    const dims = cm.getDimensions();
    expect(dims.width).toBe(800);
    expect(dims.height).toBe(600);
    expect(dims.centerX).toBe(400);
    expect(dims.centerY).toBe(300);
  });

  it('clear clears a specific layer', () => {
    const cm = createCanvasManager('canvas-wrapper');
    cm.initialize();

    const ctx = cm.getContext('main');
    cm.clear('main');
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  it('clear without argument clears all layers', () => {
    const cm = createCanvasManager('canvas-wrapper');
    cm.initialize();

    cm.clear();
    expect(cm.getContext('main').clearRect).toHaveBeenCalled();
    expect(cm.getContext('path').clearRect).toHaveBeenCalled();
    expect(cm.getContext('mouse').clearRect).toHaveBeenCalled();
  });

  it('handleResize updates canvas dimensions', () => {
    const cm = createCanvasManager('canvas-wrapper');
    cm.initialize();

    window.innerWidth = 1024;
    window.innerHeight = 768;
    cm.handleResize();

    const dims = cm.getDimensions();
    expect(dims.width).toBe(1024);
    expect(dims.height).toBe(768);

    const mainCanvas = document.getElementById('mainCanvas');
    expect(mainCanvas.width).toBe(2048); // 1024 * 2
    expect(mainCanvas.height).toBe(1536); // 768 * 2
  });
});

describe('createCursorManager', () => {
  it('returns an object with expected methods', () => {
    const cm = createCursorManager();
    expect(typeof cm.requestPointerLock).toBe('function');
    expect(typeof cm.releasePointerLock).toBe('function');
    expect(typeof cm.getCursorPosition).toBe('function');
    expect(typeof cm.resetCursorPosition).toBe('function');
    expect(typeof cm.drawCursor).toBe('function');
    expect(typeof cm.onCursorMove).toBe('function');
    expect(typeof cm.isLocked).toBe('function');
  });

  it('getCursorPosition returns {x, y} starting at 0, 0', () => {
    const cm = createCursorManager();
    const pos = cm.getCursorPosition();
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);
  });

  it('resetCursorPosition updates the position', () => {
    const cm = createCursorManager();
    cm.resetCursorPosition(100, 200);
    const pos = cm.getCursorPosition();
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(200);
  });

  it('isLocked returns false by default', () => {
    const cm = createCursorManager();
    expect(cm.isLocked()).toBe(false);
  });

  it('requestPointerLock resolves immediately when API not available', async () => {
    const cm = createCursorManager();
    const canvas = document.createElement('canvas');
    // jsdom doesn't have requestPointerLock
    delete canvas.requestPointerLock;
    await expect(cm.requestPointerLock(canvas)).resolves.toBeUndefined();
  });

  it('onCursorMove returns an unsubscribe function', () => {
    const cm = createCursorManager();
    const unsub = cm.onCursorMove(() => {});
    expect(typeof unsub).toBe('function');
  });

  it('uses custom scaleFactor and cursorRadius', () => {
    const cm = createCursorManager({ scaleFactor: 1.0, cursorRadius: 10 });
    expect(cm.getCursorPosition()).toEqual({ x: 0, y: 0 });
  });
});
