/**
 * Returns a Promise that resolves after ms milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a high-resolution timer using performance.now().
 * @returns {{ start: () => void, elapsed: () => number, reset: () => void }}
 */
export function createTimer() {
  let startTime = 0;

  return {
    start() {
      startTime = performance.now();
    },
    elapsed() {
      return performance.now() - startTime;
    },
    reset() {
      startTime = performance.now();
    },
  };
}
