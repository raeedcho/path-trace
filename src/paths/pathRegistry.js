// src/paths/pathRegistry.js — name → class mapping (Strategy pattern)

const registry = Object.create(null);

/**
 * Register a path class under a given name.
 * Throws if a class is already registered under that name.
 * @param {string} name
 * @param {Function} PathClass
 */
export function registerPath(name, PathClass) {
  if (registry[name]) {
    throw new Error(`Path type "${name}" is already registered.`);
  }
  registry[name] = PathClass;
}

/**
 * Create a path instance by name.
 * @param {string} name
 * @param {object} config
 * @returns {object} path instance
 */
export function createPath(name, config) {
  const PathClass = registry[name];
  if (!PathClass) {
    throw new Error(
      `Unknown path type: "${name}". Available: ${Object.keys(registry).join(', ')}`
    );
  }
  return new PathClass(config);
}

/**
 * Get names of all registered path types.
 * @returns {string[]}
 */
export function getRegisteredPaths() {
  return Object.keys(registry);
}
